import { createHash } from "crypto";
import sharp from "sharp";
import { TRPCError } from "@trpc/server";

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_INPUT_BYTES = 8 * 1024 * 1024;
const MAX_PIXELS = 24_000_000;
const MIN_EDGE = 256;
const MAX_EDGE = 2048;

export type ValidatedSwappysImage = {
  dataUrl: string;
  base64: string;
  buffer: Buffer;
  mimeType: "image/jpeg";
  width: number;
  height: number;
  sha256: string;
};

function invalid(message: string): never {
  throw new TRPCError({ code: "BAD_REQUEST", message });
}

export async function validateSwappysImageDataUrl(
  value: string,
  label: "source" | "target",
): Promise<ValidatedSwappysImage> {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/i.exec(value.trim());
  if (!match || !ALLOWED_MIME_TYPES.has(match[1].toLowerCase())) {
    invalid(`${label === "source" ? "Source" : "Target"} image must be a JPEG, PNG, or WebP data URL.`);
  }

  let decoded: Buffer;
  try {
    decoded = Buffer.from(match[2], "base64");
  } catch {
    invalid(`${label === "source" ? "Source" : "Target"} image contains invalid base64 data.`);
  }

  if (!decoded.length || decoded.length > MAX_INPUT_BYTES) {
    invalid(`${label === "source" ? "Source" : "Target"} image must be smaller than 8 MB.`);
  }

  let metadata: sharp.Metadata;
  try {
    metadata = await sharp(decoded, { failOn: "error", limitInputPixels: MAX_PIXELS }).metadata();
  } catch {
    invalid(`${label === "source" ? "Source" : "Target"} image is corrupt or unsupported.`);
  }

  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  if (width < MIN_EDGE || height < MIN_EDGE) {
    invalid(`${label === "source" ? "Source" : "Target"} image must be at least ${MIN_EDGE}×${MIN_EDGE} pixels.`);
  }
  if (width * height > MAX_PIXELS) {
    invalid(`${label === "source" ? "Source" : "Target"} image resolution is too large.`);
  }

  const normalized = await sharp(decoded, { failOn: "error", limitInputPixels: MAX_PIXELS })
    .rotate()
    .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: 94, chromaSubsampling: "4:4:4", mozjpeg: true })
    .toBuffer({ resolveWithObject: true });

  const base64 = normalized.data.toString("base64");
  return {
    dataUrl: `data:image/jpeg;base64,${base64}`,
    base64,
    buffer: normalized.data,
    mimeType: "image/jpeg",
    width: normalized.info.width,
    height: normalized.info.height,
    sha256: createHash("sha256").update(normalized.data).digest("hex"),
  };
}

export function swappysRateLimitSubject(userId: number | null | undefined, ip: string | undefined): number {
  if (userId && Number.isInteger(userId) && userId > 0) return userId;
  const digest = createHash("sha256").update(ip || "unknown").digest();
  return digest.readUInt32BE(0) + 1_000_000_000;
}
