/**
 * Input sanitisation utilities for text-only fields.
 *
 * Rich HTML must be handled by a dedicated allow-list HTML sanitiser at the
 * rendering boundary. These helpers deliberately return plain text.
 */

const DANGEROUS_OBJECT_KEYS = new Set(["__proto__", "prototype", "constructor"]);

function normaliseInput(input: string): string {
  return String(input ?? "")
    .normalize("NFKC")
    .replace(/\u0000/g, "")
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
}

/** Convert arbitrary HTML-like input to plain text. */
export function stripHtml(input: string): string {
  return normaliseInput(input)
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(
      /<\s*(script|style|iframe|object|embed|svg|math)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi,
      " ",
    )
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&(?:amp|lt|gt|quot|#39);/gi, entity => ({
      "&amp;": "&",
      "&lt;": "<",
      "&gt;": ">",
      "&quot;": '"',
      "&#39;": "'",
    })[entity.toLowerCase()] ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Sanitize a string for safe storage in text-only application fields. */
export function sanitizeText(input: string): string {
  return stripHtml(input);
}

/** Sanitize object string values recursively without prototype pollution. */
export function sanitizeObject<T>(obj: T): T {
  if (typeof obj === "string") return sanitizeText(obj) as T;
  if (Array.isArray(obj)) return obj.map(sanitizeObject) as T;
  if (obj instanceof Date || obj === null || typeof obj !== "object") return obj;

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (DANGEROUS_OBJECT_KEYS.has(key)) continue;
    result[key] = sanitizeObject(value);
  }
  return result as T;
}
