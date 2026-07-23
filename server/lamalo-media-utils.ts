import crypto from "crypto";

export const LAMALO_MEDIA_PREFIX = "lamalo/catalogue/";
export const LAMALO_MEDIA_ROUTE = "/media/lamalo/";
export const LAMALO_MAX_IMAGE_BYTES = 12 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

const SAFE_FILENAME = /^[a-z0-9_][a-z0-9._-]{0,190}\.(?:png|jpe?g|webp)$/i;

export function isSafeLamaloMediaFilename(filename: string): boolean {
  return SAFE_FILENAME.test(filename) && !filename.includes("..") && !filename.includes("/") && !filename.includes("\\");
}

export function buildLamaloMediaFilename(itemName: string, mimeType: string): string {
  const extension = ALLOWED_IMAGE_TYPES[mimeType];
  if (!extension) throw new Error(`Unsupported Lamalo image type: ${mimeType}`);
  const slug = itemName
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 120) || "lamalo-item";
  const fingerprint = crypto.createHash("sha256").update(itemName).digest("hex").slice(0, 12);
  return `${slug}-${fingerprint}.${extension}`;
}

export function buildLamaloMediaUrl(filename: string): string {
  if (!isSafeLamaloMediaFilename(filename)) throw new Error("Unsafe Lamalo media filename");
  return `${LAMALO_MEDIA_ROUTE}${filename}`;
}

export function decodeLamaloImageDataUrl(
  dataUrl: string,
  maxBytes = LAMALO_MAX_IMAGE_BYTES,
): { mimeType: string; buffer: Buffer } {
  const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);
  if (!match) throw new Error("Image must be a PNG, JPEG or WebP data URL");
  const mimeType = match[1];
  if (!ALLOWED_IMAGE_TYPES[mimeType]) throw new Error("Unsupported Lamalo image type");
  const buffer = Buffer.from(match[2], "base64");
  if (!buffer.length) throw new Error("Image data is empty");
  if (buffer.length > maxBytes) throw new Error(`Image exceeds ${maxBytes} bytes`);
  return { mimeType, buffer };
}
