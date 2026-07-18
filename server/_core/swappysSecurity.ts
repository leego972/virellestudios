import { createHash } from "node:crypto";
import type { Request } from "express";
import sharp from "sharp";
import { TRPCError } from "@trpc/server";
import { ENV } from "./env";
import { logger } from "./logger";
import { rateLimitHeavyAI, rateLimitPublicByIP } from "./rateLimit";

const MAX_DECODED_BYTES = 6 * 1024 * 1024;
const MAX_PIXELS = 20_000_000;
const MIN_DIMENSION = 128;
const MAX_DIMENSION = 6000;
const DATA_URI_PATTERN = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=\r\n]+)$/i;

type SupportedImageFormat = "jpeg" | "png" | "webp";

export interface ValidatedSwappysImage {
  dataUri: string;
  b64Json: string;
  buffer: Buffer;
  format: SupportedImageFormat;
  mimeType: string;
  width: number;
  height: number;
  bytes: number;
  fingerprint: string;
}

function hasJpegSignature(buffer: Buffer): boolean {
  return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
}

function hasPngSignature(buffer: Buffer): boolean {
  return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
}

function hasWebpSignature(buffer: Buffer): boolean {
  return buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";
}

function signatureMatches(format: SupportedImageFormat, buffer: Buffer): boolean {
  if (format === "jpeg") return hasJpegSignature(buffer);
  if (format === "png") return hasPngSignature(buffer);
  return hasWebpSignature(buffer);
}

export async function validateSwappysDataImage(value: string, label: string): Promise<ValidatedSwappysImage> {
  const match = value.match(DATA_URI_PATTERN);
  if (!match) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `${label} must be a JPEG, PNG or WebP data image.`,
    });
  }

  const format = match[1].toLowerCase() as SupportedImageFormat;
  const normalizedBase64 = match[2].replace(/\s+/g, "");
  let buffer: Buffer;
  try {
    buffer = Buffer.from(normalizedBase64, "base64");
  } catch {
    throw new TRPCError({ code: "BAD_REQUEST", message: `${label} contains invalid base64 data.` });
  }

  if (buffer.length < 1024 || buffer.length > MAX_DECODED_BYTES) {
    throw new TRPCError({
      code: "PAYLOAD_TOO_LARGE",
      message: `${label} must be between 1 KB and 6 MB after decoding.`,
    });
  }
  if (!signatureMatches(format, buffer)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `${label} file signature does not match its declared image type.` });
  }

  let metadata: sharp.Metadata;
  try {
    metadata = await sharp(buffer, { failOn: "error", limitInputPixels: MAX_PIXELS }).metadata();
  } catch {
    throw new TRPCError({ code: "BAD_REQUEST", message: `${label} is not a valid supported image.` });
  }

  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  if (metadata.format !== format || width < MIN_DIMENSION || height < MIN_DIMENSION || width > MAX_DIMENSION || height > MAX_DIMENSION || width * height > MAX_PIXELS) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `${label} dimensions or decoded format are unsupported. Use a valid image between 128 px and 6000 px.`,
    });
  }

  return {
    dataUri: `data:image/${format};base64,${normalizedBase64}`,
    b64Json: normalizedBase64,
    buffer,
    format,
    mimeType: `image/${format}`,
    width,
    height,
    bytes: buffer.length,
    fingerprint: createHash("sha256").update(buffer).digest("hex").slice(0, 20),
  };
}

export function getRequestIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  const firstForwarded = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(",")[0];
  return String(firstForwarded || req.ip || req.socket.remoteAddress || "unknown").trim().slice(0, 128);
}

export async function enforceSwappysGenerationQuota(req: Request, userId?: number): Promise<{ entitlement: "subscription" | "anonymous_preview" }> {
  if (userId) {
    await rateLimitHeavyAI(userId);
    return { entitlement: "subscription" };
  }

  const ip = getRequestIp(req);
  await rateLimitPublicByIP(ip, "swappys-minute", 2, 60 * 1000);
  await rateLimitPublicByIP(ip, "swappys-daily-preview", 5, 24 * 60 * 60 * 1000);
  return { entitlement: "anonymous_preview" };
}

export async function moderateSwappysImages(images: ValidatedSwappysImage[]): Promise<void> {
  if (!ENV.openaiApiKey) {
    if (ENV.isProduction) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Image safety verification is temporarily unavailable.",
      });
    }
    logger.warn("[SwappysSecurity] OPENAI_API_KEY missing; image moderation skipped outside production.");
    return;
  }

  let response: Response;
  try {
    response = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ENV.openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "omni-moderation-latest",
        input: images.map((image) => ({
          type: "image_url",
          image_url: { url: image.dataUri },
        })),
      }),
      signal: AbortSignal.timeout(20_000),
    });
  } catch (error) {
    logger.errorWithStack("[SwappysSecurity] moderation request failed", error);
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Image safety verification failed. Please try again." });
  }

  if (!response.ok) {
    logger.error(`[SwappysSecurity] moderation API failed status=${response.status}`);
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Image safety verification failed. Please try again." });
  }

  const payload = await response.json() as { results?: Array<{ flagged?: boolean; categories?: Record<string, boolean> }> };
  const flagged = payload.results?.find((result) => result.flagged);
  if (flagged) {
    const categories = Object.entries(flagged.categories ?? {}).filter(([, active]) => active).map(([name]) => name).slice(0, 8);
    logger.warn(`[SwappysSecurity] upload rejected categories=${categories.join(",") || "flagged"}`);
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "One or more images cannot be processed under the media safety policy.",
    });
  }
}
