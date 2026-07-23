import type { Express, Request, Response } from "express";
import { sql } from "drizzle-orm";
import { getDb } from "./db";
import { requireAdminExpress } from "./_core/context";
import { logger } from "./_core/logger";
import {
  isS3StorageConfigured,
  storagePutS3Private,
  storageReadS3Private,
} from "./storage";
import {
  LAMALO_MAX_IMAGE_BYTES,
  LAMALO_MEDIA_PREFIX,
  buildLamaloMediaFilename,
  buildLamaloMediaUrl,
  decodeLamaloImageDataUrl,
  isSafeLamaloMediaFilename,
} from "./lamalo-media-utils";

const log = logger.child({ module: "lamalo-private-media" });
const registeredApps = new WeakSet<Express>();
const HEALTH_FILENAME = "__storage-health.png";
const HEALTH_KEY = `${LAMALO_MEDIA_PREFIX}${HEALTH_FILENAME}`;
const HEALTH_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WlDhAAAAABJRU5ErkJggg==",
  "base64",
);

type StorageHealth = {
  status: "pending" | "ok" | "not_configured" | "error";
  checkedAt: string | null;
  mediaUrl: string;
  error?: string;
};

let storageHealth: StorageHealth = {
  status: "pending",
  checkedAt: null,
  mediaUrl: buildLamaloMediaUrl(HEALTH_FILENAME),
};

function storageErrorStatus(error: any): number {
  const name = String(error?.name || error?.Code || "");
  const httpStatus = Number(error?.$metadata?.httpStatusCode || 0);
  if (httpStatus === 404 || name === "NoSuchKey" || name === "NotFound") return 404;
  return 500;
}

async function privateBodyToBuffer(body: unknown, maxBytes = LAMALO_MAX_IMAGE_BYTES): Promise<Buffer> {
  const candidate = body as any;
  if (!candidate) throw new Error("Storage object has no body");

  if (typeof candidate.transformToByteArray === "function") {
    const bytes = await candidate.transformToByteArray();
    const buffer = Buffer.from(bytes);
    if (buffer.length > maxBytes) throw new Error("Storage object exceeds safe buffer size");
    return buffer;
  }

  if (typeof candidate[Symbol.asyncIterator] === "function") {
    const chunks: Buffer[] = [];
    let total = 0;
    for await (const chunk of candidate) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      total += buffer.length;
      if (total > maxBytes) throw new Error("Storage object exceeds safe buffer size");
      chunks.push(buffer);
    }
    return Buffer.concat(chunks);
  }

  throw new Error("Unsupported S3/R2 response body");
}

async function runStorageSelfTest(): Promise<void> {
  const checkedAt = new Date().toISOString();
  if (!isS3StorageConfigured()) {
    storageHealth = {
      status: "not_configured",
      checkedAt,
      mediaUrl: buildLamaloMediaUrl(HEALTH_FILENAME),
      error: "AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY or AWS_S3_BUCKET is missing",
    };
    return;
  }

  try {
    await storagePutS3Private(HEALTH_KEY, HEALTH_PNG, "image/png", {
      cacheControl: "no-store",
    });
    const stored = await storageReadS3Private(HEALTH_KEY);
    const bytes = await privateBodyToBuffer(stored.body, 1024);
    if (!bytes.equals(HEALTH_PNG)) throw new Error("R2 write/read verification returned different bytes");
    storageHealth = {
      status: "ok",
      checkedAt,
      mediaUrl: buildLamaloMediaUrl(HEALTH_FILENAME),
    };
    log.info("Lamalo private R2 write/read self-test passed");
  } catch (error: any) {
    storageHealth = {
      status: "error",
      checkedAt,
      mediaUrl: buildLamaloMediaUrl(HEALTH_FILENAME),
      error: error?.message || String(error),
    };
    log.warn(`Lamalo private R2 self-test failed: ${storageHealth.error}`);
  }
}

async function findLamaloItemIds(itemName: string): Promise<number[]> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.execute(sql`
    SELECT wi.id
    FROM wardrobeItems wi
    INNER JOIN designerProfiles dp ON dp.id = wi.designerProfileId
    WHERE dp.brandName = 'Lamalo Fashion'
      AND wi.name = ${itemName}
  `) as any;
  const rows = Array.isArray(result) && Array.isArray(result[0]) ? result[0] : [];
  return rows
    .map((row: any) => Number(row.id))
    .filter((id: number) => Number.isInteger(id) && id > 0);
}

async function updateLamaloItemImages(itemIds: number[], mediaUrl: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  for (const itemId of itemIds) {
    await db.execute(sql`
      UPDATE wardrobeItems
      SET primaryImageUrl = ${mediaUrl},
          imageUrls = JSON_ARRAY(${mediaUrl})
      WHERE id = ${itemId}
    `);
  }
}

function setMediaHeaders(res: Response, object: Awaited<ReturnType<typeof storageReadS3Private>>): void {
  res.setHeader("Content-Type", object.contentType);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Content-Disposition", "inline");
  res.setHeader("Cache-Control", object.cacheControl || "public, max-age=31536000, immutable");
  if (object.contentLength !== undefined) res.setHeader("Content-Length", String(object.contentLength));
  if (object.etag) res.setHeader("ETag", object.etag);
  if (object.lastModified) res.setHeader("Last-Modified", object.lastModified.toUTCString());
}

export function registerLamaloMediaRoutes(app: Express): void {
  if (registeredApps.has(app)) return;
  registeredApps.add(app);

  app.get("/api/lamalo/storage-health", (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.status(storageHealth.status === "ok" ? 200 : 503).json({
      ...storageHealth,
      privateBucket: true,
      adobeRequiredForDelivery: false,
    });
  });

  app.get("/media/lamalo/:filename", async (req: Request, res: Response) => {
    const filename = String(req.params.filename || "");
    if (!isSafeLamaloMediaFilename(filename)) {
      res.status(400).json({ error: "Invalid Lamalo media filename" });
      return;
    }

    try {
      const object = await storageReadS3Private(`${LAMALO_MEDIA_PREFIX}${filename}`);
      const ifNoneMatch = String(req.headers["if-none-match"] || "");
      if (object.etag && ifNoneMatch.split(",").map(value => value.trim()).includes(object.etag)) {
        res.status(304).end();
        return;
      }
      setMediaHeaders(res, object);
      const body = object.body as any;
      if (body && typeof body.pipe === "function") {
        body.on("error", (error: Error) => {
          log.warn(`Lamalo media stream failed for ${filename}: ${error.message}`);
          if (!res.headersSent) res.status(502).end();
          else res.destroy(error);
        });
        req.on("close", () => {
          if (!res.writableEnded && typeof body.destroy === "function") body.destroy();
        });
        body.pipe(res);
        return;
      }
      const bytes = await privateBodyToBuffer(body);
      res.end(bytes);
    } catch (error: any) {
      const status = storageErrorStatus(error);
      if (status === 404) {
        res.status(404).json({ error: "Lamalo image not found" });
        return;
      }
      log.warn(`Lamalo media read failed for ${filename}: ${error?.message || String(error)}`);
      res.status(503).json({ error: "Lamalo media storage unavailable" });
    }
  });

  app.post(
    "/api/admin/lamalo-media/upload",
    requireAdminExpress,
    async (req: Request, res: Response) => {
      try {
        const itemName = typeof req.body?.itemName === "string" ? req.body.itemName.trim() : "";
        const imageDataUrl = typeof req.body?.imageDataUrl === "string" ? req.body.imageDataUrl : "";
        if (!itemName || itemName.length > 255 || !itemName.startsWith("Lamalo ")) {
          res.status(400).json({ error: "A valid Lamalo itemName is required" });
          return;
        }
        if (!imageDataUrl) {
          res.status(400).json({ error: "imageDataUrl is required" });
          return;
        }

        const itemIds = await findLamaloItemIds(itemName);
        if (!itemIds.length) {
          res.status(404).json({ error: `Lamalo item not found: ${itemName}` });
          return;
        }

        const { mimeType, buffer } = decodeLamaloImageDataUrl(imageDataUrl);
        const filename = buildLamaloMediaFilename(itemName, mimeType);
        const key = `${LAMALO_MEDIA_PREFIX}${filename}`;
        const mediaUrl = buildLamaloMediaUrl(filename);

        await storagePutS3Private(key, buffer, mimeType, {
          cacheControl: "public, max-age=31536000, immutable",
        });
        const verification = await storageReadS3Private(key);
        if (verification.contentLength !== undefined && verification.contentLength !== buffer.length) {
          throw new Error(`R2 verification size mismatch for ${itemName}`);
        }
        await updateLamaloItemImages(itemIds, mediaUrl);

        res.status(201).json({
          ok: true,
          itemName,
          itemIds,
          bytes: buffer.length,
          storageKey: key,
          mediaUrl,
          verified: true,
        });
      } catch (error: any) {
        log.warn(`Lamalo image upload failed: ${error?.message || String(error)}`);
        res.status(500).json({ error: "Lamalo image upload failed" });
      }
    },
  );

  void runStorageSelfTest();
}
