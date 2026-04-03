/**
 * Storage helpers — AWS S3 / Cloudflare R2 / any S3-compatible backend.
 *
 * Set these in Railway → Variables:
 *   AWS_ACCESS_KEY_ID       — S3 or R2 access key
 *   AWS_SECRET_ACCESS_KEY   — S3 or R2 secret key
 *   AWS_S3_BUCKET           — bucket name
 *   AWS_REGION              — e.g. "us-east-1" (use "auto" for Cloudflare R2)
 *   AWS_S3_ENDPOINT         — optional; Cloudflare R2 endpoint URL
 *                             e.g. "https://<account-id>.r2.cloudflarestorage.com"
 *   AWS_S3_PUBLIC_URL       — optional; CDN / public base URL
 *                             e.g. "https://pub-xxx.r2.dev" or "https://cdn.virelle.life"
 *
 * Legacy Manus FORGE credentials (BUILT_IN_FORGE_API_URL + BUILT_IN_FORGE_API_KEY)
 * are also supported for backward-compat on the Manus platform.
 *
 * When no credentials are configured, storagePut throws and callers fall back
 * to the raw provider URL.
 */

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

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

// ─── AWS S3 / Cloudflare R2 ───────────────────────────────────────────────────
let _s3Client: S3Client | null = null;

function getS3Config(): { client: S3Client; bucket: string; publicUrl: string } | null {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID ?? "";
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY ?? "";
  const bucket = process.env.AWS_S3_BUCKET ?? "";
  if (!accessKeyId || !secretAccessKey || !bucket) return null;
  const region = process.env.AWS_REGION ?? "us-east-1";
  const endpoint = process.env.AWS_S3_ENDPOINT ?? "";
  const publicUrl = (process.env.AWS_S3_PUBLIC_URL ?? "").replace(/\/+$/, "");
  if (!_s3Client) {
    _s3Client = new S3Client({
      region,
      credentials: { accessKeyId, secretAccessKey },
      ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
    });
  }
  return { client: _s3Client, bucket, publicUrl };
}

async function s3Put(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType: string
): Promise<{ key: string; url: string }> {
  const cfg = getS3Config()!;
  const key = relKey.replace(/^\/+/, "");
  const body = typeof data === "string" ? Buffer.from(data) : Buffer.from(data as any);
  await cfg.client.send(
    new PutObjectCommand({
      Bucket: cfg.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      ACL: "public-read",
    })
  );
  let url: string;
  if (cfg.publicUrl) {
    url = `${cfg.publicUrl}/${key}`;
  } else if (process.env.AWS_S3_ENDPOINT) {
    url = `${process.env.AWS_S3_ENDPOINT.replace(/\/+$/, "")}/${cfg.bucket}/${key}`;
  } else {
    const region = process.env.AWS_REGION ?? "us-east-1";
    url = `https://${cfg.bucket}.s3.${region}.amazonaws.com/${key}`;
  }
  return { key, url };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Upload a file to storage and return a permanent public URL.
 *
 * Priority:
 *   1. Manus FORGE proxy (BUILT_IN_FORGE_API_URL + BUILT_IN_FORGE_API_KEY)
 *   2. AWS S3 / Cloudflare R2 (AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY + AWS_S3_BUCKET)
 *   3. Throws — caller should catch and fall back to raw provider URL
 */
export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  if (getForgeConfig()) return forgePut(relKey, data, contentType);
  if (getS3Config()) return s3Put(relKey, data, contentType);
  throw new Error(
    "No storage backend configured. " +
    "Set AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY + AWS_S3_BUCKET in Railway Variables."
  );
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = relKey.replace(/^\/+/, "");
  const cfg = getS3Config();
  if (cfg) {
    let url: string;
    if (cfg.publicUrl) {
      url = `${cfg.publicUrl}/${key}`;
    } else if (process.env.AWS_S3_ENDPOINT) {
      url = `${process.env.AWS_S3_ENDPOINT.replace(/\/+$/, "")}/${cfg.bucket}/${key}`;
    } else {
      const region = process.env.AWS_REGION ?? "us-east-1";
      url = `https://${cfg.bucket}.s3.${region}.amazonaws.com/${key}`;
    }
    return { key, url };
  }
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
