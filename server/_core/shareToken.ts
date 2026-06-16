import { createHmac, timingSafeEqual } from "crypto";
import { ENV } from "./env";

/**
 * Stateless project share-link tokens.
 *
 * Owners get a tokenized URL like /share/<projectId>/<token>. Reviewers
 * (producers, friends, collaborators) open it without an account and see
 * a read-only preview of the project. No DB column needed — the token is
 * an HMAC of the project id with the server's session secret, so it can
 * be verified without storage and revoked simply by rotating the secret.
 */

const _secret = (ENV as any).cookieSecret || process.env.JWT_SECRET || process.env.SESSION_SECRET;
if (!_secret && process.env.NODE_ENV === "production") {
  throw new Error("SESSION_SECRET (or JWT_SECRET) must be set in production");
}
const SECRET = _secret || "dev-secret-change-me";

export function makeShareToken(projectId: number): string {
  return createHmac("sha256", SECRET)
    .update(`project:${projectId}:share`)
    .digest("hex")
    .slice(0, 32);
}

export function verifyShareToken(projectId: number, token: string): boolean {
  if (typeof token !== "string" || token.length !== 32) return false;
  const expected = makeShareToken(projectId);
  try {
    return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(token, "hex"));
  } catch {
    return false;
  }
}
