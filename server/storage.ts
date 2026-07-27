/**
 * Storage helpers — AWS S3 / Cloudflare R2 / any S3-compatible backend.
 *
 * ─── Dual-bucket routing (Cloudflare R2) ──────────────────────────────────────
 * This module is the single place in the codebase that decides which bucket
 * an object belongs in. Callers pass a `StorageCategory` ("media" | "asset");
 * they never choose a bucket name themselves. This keeps upload, download,
 * signed-URL, copy, head and delete calls for the same object consistent by
 * construction — there is nowhere else in the app that can silently disagree
 * about which bucket a key lives in.
 *
 *   media  — user uploads, generated images/video/audio/documents, project
 *            files & attachments, renders, exports, previews, temp files —
 *            anything subject to the 30-day user-content retention policy.
 *   asset  — marketplace items & previews, templates, reusable production
 *            assets, stock assets, admin-uploaded assets, item thumbnails
 *            and source files, shared asset-library content — permanent,
 *            platform-owned content that is never subject to the 30-day
 *            retention job.
 *
 * Environment variables (set in Render → Environment):
 *   AWS_ACCESS_KEY_ID       — R2/S3 access key (existing Render credential)
 *   AWS_SECRET_ACCESS_KEY   — R2/S3 secret key (existing Render credential)
 *   AWS_REGION              — "auto" for Cloudflare R2
 *   AWS_S3_ENDPOINT         — Cloudflare R2 account endpoint, e.g.
 *                             "https://<account-id>.r2.cloudflarestorage.com"
 *   AWS_S3_PUBLIC_URL       — optional; CDN / public base URL applied to both
 *                             buckets (leave unset to build per-bucket URLs)
 *   AWS_S3_MEDIA_BUCKET     — bucket for the "media" category (preferred)
 *   AWS_S3_ASSETS_BUCKET    — bucket for the "asset" category (preferred)
 *   AWS_S3_BUCKET           — legacy single-bucket variable. Kept ONLY as a
 *                             temporary backward-compatible fallback for each
 *                             category when its dedicated variable is unset.
 *                             AWS_S3_MEDIA_BUCKET / AWS_S3_ASSETS_BUCKET
 *                             always take priority over this when set.
 *
 * Legacy Manus FORGE credentials (BUILT_IN_FORGE_API_URL + BUILT_IN_FORGE_API_KEY)
 * are also supported for backward-compat on the Manus platform. FORGE has no
 * concept of multiple buckets, so category is ignored on that path.
 *
 * When no credentials are configured, storagePut throws and callers fall back
 * to the raw provider URL.
 */

import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl as presignUrl } from "@aws-sdk/s3-request-presigner";

// ─── Storage categories ───────────────────────────────────────────────────────

/**
 * "media" — user-generated / project content subject to the 30-day retention
 *           policy (uploads, generated images/video/audio, renders, exports,
 *           project attachments, temp files, preview renders for projects).
 * "asset" — permanent, platform-owned content (marketplace items & previews,
 *           templates, reusable production/stock assets, admin-uploaded
 *           assets, item thumbnails & source files, shared asset-library
 *           content). Never subject to the 30-day retention job.
 */
export type StorageCategory = "media" | "asset";

const DEFAULT_STORAGE_CATEGORY: StorageCategory = "media";

/**
 * Resolve the bucket name for a storage category.
 *
 * Priority per category:
 *   1. The category's dedicated bucket variable (AWS_S3_MEDIA_BUCKET /
 *      AWS_S3_ASSETS_BUCKET)
 *   2. AWS_S3_BUCKET — legacy single-bucket fallback, kept temporarily so
 *      existing deployments that only set AWS_S3_BUCKET keep working.
 *
 * Throws a clear, category-naming error if neither is configured — callers
 * must never silently fall through to the wrong bucket.
 */
export function getStorageBucket(category: StorageCategory): string {
  const legacyBucket = process.env.AWS_S3_BUCKET?.trim() || "";

  if (category === "media") {
    const bucket = process.env.AWS_S3_MEDIA_BUCKET?.trim() || legacyBucket;
    if (!bucket) {
      throw new Error(
        "No media storage bucket configured. Set AWS_S3_MEDIA_BUCKET " +
        "(or the legacy AWS_S3_BUCKET) in Render → Environment."
      );
    }
    return bucket;
  }

  const bucket = process.env.AWS_S3_ASSETS_BUCKET?.trim() || legacyBucket;
  if (!bucket) {
    throw new Error(
      "No asset storage bucket configured. Set AWS_S3_ASSETS_BUCKET " +
      "(or the legacy AWS_S3_BUCKET) in Render → Environment."
    );
  }
  return bucket;
}

/** True when both R2/S3 credentials and at least one bucket are configured. */
export function isS3StorageConfigured(): boolean {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID ?? "";
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY ?? "";
  if (!accessKeyId || !secretAccessKey) return false;
  return Boolean(
    process.env.AWS_S3_MEDIA_BUCKET?.trim() ||
    process.env.AWS_S3_ASSETS_BUCKET?.trim() ||
    process.env.AWS_S3_BUCKET?.trim()
  );
}

// ─── Defensive object size cap ────────────────────────────────────────────────
// Hard upper bound on any single object pushed through the storage layer.
// Per-route Zod schemas already cap inbound request sizes (image 10MB, footage
// 150MB, etc) and the global express.json() limit is 25MB; this cap is a
// last-line defence against programming errors that would buffer something
// huge into memory and then push it to the bucket. Override via env if a
// future feature genuinely needs more (eg. multi-hour rendered films).
const MAX_OBJECT_BYTES = (() => {
  const raw = Number(process.env.MAX_STORAGE_OBJECT_BYTES ?? "");
  if (Number.isFinite(raw) && raw > 0) return raw;
  return 256 * 1024 * 1024; // 256 MB default
})();

function assertSize(byteLen: number, key: string) {
  if (byteLen > MAX_OBJECT_BYTES) {
    throw new Error(
      `storagePut: object exceeds MAX_STORAGE_OBJECT_BYTES (${byteLen} > ${MAX_OBJECT_BYTES}) for key=${key}`
    );
  }
}

export interface StoragePutOptions {
  /**
   * Which bucket this object belongs in. Defaults to "media". Marketplace /
   * template / admin-asset / reusable-production-asset uploads must pass
   * `{ category: "asset" }` explicitly.
   */
  category?: StorageCategory;
  /**
   * When true (default) the uploaded object is marked public-read so the
   * returned URL is directly fetchable. Set to false for user-private
   * content; the object will inherit the bucket's default ACL and the
   * caller is responsible for serving it through a signed/authorised
   * route. Note: the legacy Manus FORGE backend always returns a public
   * URL and does not honour this flag.
   */
  public?: boolean;
}

export interface StorageCategoryOptions {
  category?: StorageCategory;
}

// ─── Manus FORGE (legacy, Manus-platform only) ────────────────────────────────
function getForgeConfig(): { baseUrl: string; apiKey: string } | null {
  const baseUrl = process.env.BUILT_IN_FORGE_API_URL ?? "";
  const apiKey = process.env.BUILT_IN_FORGE_API_KEY ?? "";
  if (baseUrl && apiKey) return { baseUrl: baseUrl.replace(/\/+$/, ""), apiKey };
  return null;
}

async function forgePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType: string
): Promise<{ key: string; url: string }> {
  const cfg = getForgeConfig()!;
  const key = relKey.replace(/^\/+/, "");
  const uploadUrl = new URL("v1/storage/upload", cfg.baseUrl + "/");
  uploadUrl.searchParams.set("path", key);
  const blob =
    typeof data === "string"
      ? new Blob([data], { type: contentType })
      : new Blob([data as any], { type: contentType });
  const form = new FormData();
  form.append("file", blob, key.split("/").pop() ?? key);
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.apiKey}` },
    body: form,
  });
  if (!response.ok) {
    const msg = await response.text().catch(() => response.statusText);
    throw new Error(`Forge upload failed (${response.status}): ${msg}`);
  }
  const url = (await response.json()).url;
  return { key, url };
}

async function forgeDelete(relKey: string): Promise<void> {
  const cfg = getForgeConfig()!;
  const key = relKey.replace(/^\/+/, "");
  const url = new URL("v1/storage/delete", cfg.baseUrl + "/");
  url.searchParams.set("path", key);
  const response = await fetch(url, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${cfg.apiKey}` },
  });
  if (!response.ok && response.status !== 404) {
    throw new Error(`Forge delete failed (${response.status}).`);
  }
}

// ─── AWS S3 / Cloudflare R2 ───────────────────────────────────────────────────
let _s3Client: S3Client | null = null;

function getS3Client(): S3Client | null {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID ?? "";
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY ?? "";
  if (!accessKeyId || !secretAccessKey) return null;
  const region = process.env.AWS_REGION ?? "us-east-1";
  const endpoint = process.env.AWS_S3_ENDPOINT ?? "";
  if (!_s3Client) {
    _s3Client = new S3Client({
      region,
      credentials: { accessKeyId, secretAccessKey },
      ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
    });
  }
  return _s3Client;
}

/**
 * Resolve the client + bucket for a category. Returns null when R2/S3
 * credentials aren't configured at all (caller should fall back to FORGE or
 * throw). Throws — rather than silently falling back to the wrong bucket —
 * when credentials exist but the category's bucket is missing.
 */
function getS3Config(
  category: StorageCategory
): { client: S3Client; bucket: string; publicUrl: string } | null {
  const client = getS3Client();
  if (!client) return null;
  const bucket = getStorageBucket(category);
  const publicUrl = (process.env.AWS_S3_PUBLIC_URL ?? "").replace(/\/+$/, "");
  return { client, bucket, publicUrl };
}

function buildObjectUrl(cfg: { bucket: string; publicUrl: string }, key: string): string {
  if (cfg.publicUrl) return `${cfg.publicUrl}/${key}`;
  if (process.env.AWS_S3_ENDPOINT) {
    return `${process.env.AWS_S3_ENDPOINT.replace(/\/+$/, "")}/${cfg.bucket}/${key}`;
  }
  const region = process.env.AWS_REGION ?? "us-east-1";
  return `https://${cfg.bucket}.s3.${region}.amazonaws.com/${key}`;
}

async function s3Put(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType: string,
  isPublic: boolean,
  category: StorageCategory
): Promise<{ key: string; url: string }> {
  const cfg = getS3Config(category)!;
  const key = relKey.replace(/^\/+/, "");
  const body = typeof data === "string" ? Buffer.from(data) : Buffer.from(data as any);
  assertSize(body.byteLength, key);
  await cfg.client.send(
    new PutObjectCommand({
      Bucket: cfg.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      // Only mark public-read when the caller explicitly wants a directly
      // fetchable URL. Private uploads inherit the bucket's default ACL.
      ...(isPublic ? { ACL: "public-read" as const } : {}),
    })
  );
  return { key, url: buildObjectUrl(cfg, key) };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Upload a file to storage and return a URL.
 *
 * Defaults to the "media" category and a public-read object so the returned
 * URL is directly fetchable (preserves long-standing behaviour for
 * image/video/audio assets embedded in the UI). Pass `{ category: "asset" }`
 * for marketplace/template/admin-asset uploads, and `{ public: false }` for
 * user-private content.
 *
 * Always enforces a defensive object size cap (MAX_STORAGE_OBJECT_BYTES env,
 * default 256 MB) — per-route Zod schemas remain the primary size guard.
 *
 * Priority:
 *   1. Manus FORGE proxy (BUILT_IN_FORGE_API_URL + BUILT_IN_FORGE_API_KEY)
 *      — legacy backend; always returns a public URL, ignores opts.public
 *      and opts.category (FORGE has a single object namespace).
 *   2. AWS S3 / Cloudflare R2 (AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY +
 *      the resolved category bucket)
 *   3. Throws — caller should catch and fall back to raw provider URL
 */
export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
  opts: StoragePutOptions = {}
): Promise<{ key: string; url: string; category: StorageCategory }> {
  // Validate size up-front so misconfigured callers fail fast regardless of
  // which backend is selected. forgePut/s3Put repeat this check for safety.
  const byteLen =
    typeof data === "string" ? Buffer.byteLength(data) : (data as Uint8Array).byteLength;
  assertSize(byteLen, relKey);
  const isPublic = opts.public !== false; // default true
  const category = opts.category ?? DEFAULT_STORAGE_CATEGORY;
  if (getForgeConfig()) {
    const result = await forgePut(relKey, data, contentType);
    return { ...result, category };
  }
  if (getS3Client()) {
    const result = await s3Put(relKey, data, contentType, isPublic, category);
    return { ...result, category };
  }
  throw new Error(
    "No storage backend configured. " +
    "Set AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY + AWS_S3_MEDIA_BUCKET/AWS_S3_ASSETS_BUCKET in Render → Environment."
  );
}

export async function storageGet(
  relKey: string,
  opts: StorageCategoryOptions = {}
): Promise<{ key: string; url: string }> {
  const key = relKey.replace(/^\/+/, "");
  const category = opts.category ?? DEFAULT_STORAGE_CATEGORY;
  const cfg = getS3Config(category);
  if (cfg) return { key, url: buildObjectUrl(cfg, key) };
  const forge = getForgeConfig();
  if (forge) {
    const downloadApiUrl = new URL("v1/storage/downloadUrl", forge.baseUrl + "/");
    downloadApiUrl.searchParams.set("path", key);
    const response = await fetch(downloadApiUrl, {
      headers: { Authorization: `Bearer ${forge.apiKey}` },
    });
    const url = (await response.json()).url;
    return { key, url };
  }
  throw new Error("No storage backend configured.");
}

/** Generate a time-limited signed URL for a private object. R2/S3 only. */
export async function getStorageSignedUrl(
  relKey: string,
  opts: StorageCategoryOptions & { expiresIn?: number } = {}
): Promise<string> {
  const category = opts.category ?? DEFAULT_STORAGE_CATEGORY;
  const cfg = getS3Config(category);
  if (!cfg) throw new Error("No R2/S3 storage backend configured for signed URLs.");
  const key = relKey.replace(/^\/+/, "");
  return presignUrl(
    cfg.client,
    new GetObjectCommand({ Bucket: cfg.bucket, Key: key }),
    { expiresIn: Math.max(60, Math.min(opts.expiresIn ?? 900, 3600)) }
  );
}

/** Delete an object. Must be called with the same category it was uploaded under. */
export async function storageDelete(
  relKey: string,
  opts: StorageCategoryOptions = {}
): Promise<void> {
  const key = relKey.replace(/^\/+/, "");
  const category = opts.category ?? DEFAULT_STORAGE_CATEGORY;
  if (getForgeConfig()) return forgeDelete(key);
  const cfg = getS3Config(category);
  if (!cfg) throw new Error("No storage backend configured for delete.");
  await cfg.client.send(new DeleteObjectCommand({ Bucket: cfg.bucket, Key: key }));
}

/** Fetch object metadata (size, content-type, etc) without downloading the body. */
export async function storageHead(
  relKey: string,
  opts: StorageCategoryOptions = {}
): Promise<{ contentLength?: number; contentType?: string; lastModified?: Date }> {
  const key = relKey.replace(/^\/+/, "");
  const category = opts.category ?? DEFAULT_STORAGE_CATEGORY;
  const cfg = getS3Config(category);
  if (!cfg) throw new Error("No R2/S3 storage backend configured for head lookups.");
  const result = await cfg.client.send(new HeadObjectCommand({ Bucket: cfg.bucket, Key: key }));
  return {
    contentLength: result.ContentLength,
    contentType: result.ContentType,
    lastModified: result.LastModified,
  };
}

/**
 * Copy an object within the same category's bucket (e.g. promoting a
 * temporary render to a permanent key). Copying across categories — moving
 * an object from "media" to "asset" or vice versa — is intentionally not
 * supported here; do a get+put through storagePut with the target category
 * if that's ever genuinely needed, so the move is explicit at the call site.
 */
export async function storageCopy(
  sourceKey: string,
  destKey: string,
  opts: StorageCategoryOptions = {}
): Promise<void> {
  const category = opts.category ?? DEFAULT_STORAGE_CATEGORY;
  const cfg = getS3Config(category);
  if (!cfg) throw new Error("No R2/S3 storage backend configured for copy.");
  const src = sourceKey.replace(/^\/+/, "");
  const dest = destKey.replace(/^\/+/, "");
  const copySource = encodeURIComponent(`${cfg.bucket}/${src}`).replace(/%2F/g, "/");
  await cfg.client.send(
    new CopyObjectCommand({ Bucket: cfg.bucket, Key: dest, CopySource: copySource, MetadataDirective: "COPY" })
  );
}
