/**
 * S3 Upload helper for video files.
 * Uses the existing storagePut from server/storage.ts
 */
import { storagePut } from "server/storage";

export async function uploadBufferToS3(
  buffer: Buffer,
  filename: string,
  contentType: string = "video/mp4"
): Promise<string> {
  const key = `videos/${filename}`;
  const { url } = await storagePut(key, buffer, contentType);
  return url;
}
