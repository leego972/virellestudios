/**
 * Input sanitization utilities for XSS protection.
 * Strips HTML tags and dangerous content from user inputs.
 */

/** Strip HTML tags from a string */
export function stripHtml(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "");
}

/** Sanitize a string for safe storage — removes script tags but preserves basic text */
export function sanitizeText(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "");
}

/** Sanitize an object's string values recursively */
export function sanitizeObject<T>(obj: T): T {
  if (typeof obj === "string") return sanitizeText(obj) as T;
  if (Array.isArray(obj)) return obj.map(sanitizeObject) as T;
  if (obj && typeof obj === "object") {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = sanitizeObject(value);
    }
    return result as T;
  }
  return obj;
}
