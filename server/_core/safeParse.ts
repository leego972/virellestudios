/**
 * Safe JSON parsing helpers. Use these instead of bare `JSON.parse(content)`
 * on any LLM output — under load or rate-limit pressure, models occasionally
 * emit malformed JSON, and an unhandled SyntaxError takes down the request
 * with an opaque 500.
 *
 * Two flavours:
 *   - safeJsonParse(text, fallback) — returns the fallback on failure
 *   - safeJsonExtract(text, fallback) — also tries to recover JSON wrapped
 *     in markdown code fences (```json ... ```), which models love to add.
 */

import { logger } from "./logger";

export function safeJsonParse<T = any>(text: unknown, fallback: T): T {
  if (typeof text !== "string" || text.trim().length === 0) return fallback;
  try {
    return JSON.parse(text) as T;
  } catch (err: any) {
    logger.warn?.(`[safeJsonParse] Malformed JSON, using fallback. preview="${text.slice(0, 120)}…"`);
    return fallback;
  }
}

/**
 * Extract a JSON object from text that may contain markdown fences,
 * preamble like "Sure, here's the JSON:", or trailing commentary.
 * Used for LLM outputs where structured-output mode wasn't enforced.
 */
export function safeJsonExtract<T = any>(text: unknown, fallback: T): T {
  if (typeof text !== "string" || text.trim().length === 0) return fallback;

  // Direct parse first (happy path)
  try { return JSON.parse(text) as T; } catch {}

  // Strip ```json ... ``` or ``` ... ``` fences
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch) {
    try { return JSON.parse(fenceMatch[1]) as T; } catch {}
  }

  // Try to slice from first { to last }
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first !== -1 && last > first) {
    try { return JSON.parse(text.slice(first, last + 1)) as T; } catch {}
  }

  // Try array recovery
  const firstA = text.indexOf("[");
  const lastA = text.lastIndexOf("]");
  if (firstA !== -1 && lastA > firstA) {
    try { return JSON.parse(text.slice(firstA, lastA + 1)) as T; } catch {}
  }

  logger.warn?.(`[safeJsonExtract] Could not recover JSON. preview="${text.slice(0, 120)}…"`);
  return fallback;
}
