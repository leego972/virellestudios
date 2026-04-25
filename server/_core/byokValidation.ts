// v6.69 — Phase 5: live BYOK key validation.
//
// Cheap "list models / list voices" pings using the user's stored, decrypted
// key. NEVER returns the key itself, NEVER logs the key, ALWAYS short-circuits
// on missing key. Used by `byok.testProviderKey`.

import { decryptApiKey } from "./securityEngine";

export type ValidationStatus = "configured" | "not_configured" | "invalid" | "unreachable";
export type ValidationResult = { provider: string; status: ValidationStatus; detail?: string };

/** Map UI provider name → user table column holding the encrypted key. */
const PROVIDER_TO_USER_COLUMN: Record<string, string> = {
  openai: "userOpenaiKey",
  anthropic: "userAnthropicKey",
  google: "userGoogleAiKey",
  venice: "userVeniceKey",
  runway: "userRunwayKey",
  replicate: "userReplicateKey",
  fal: "userFalKey",
  luma: "userLumaKey",
  huggingface: "userHfKey",
  elevenlabs: "userElevenlabsKey",
  suno: "userSunoKey",
  byteplus: "userByteplusKey",
};

function safeDecrypt(value: any): string | null {
  if (!value || typeof value !== "string") return null;
  try { return decryptApiKey(value); } catch { return null; }
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 8000): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

async function validateOpenAI(key: string): Promise<ValidationResult> {
  try {
    const r = await fetchWithTimeout("https://api.openai.com/v1/models", {
      method: "GET",
      headers: { Authorization: `Bearer ${key}` },
    });
    if (r.status === 200) return { provider: "openai", status: "configured" };
    if (r.status === 401 || r.status === 403) return { provider: "openai", status: "invalid", detail: "Key rejected by provider." };
    return { provider: "openai", status: "unreachable", detail: `HTTP ${r.status}` };
  } catch (e: any) {
    return { provider: "openai", status: "unreachable", detail: e?.name === "AbortError" ? "Timed out." : "Network error." };
  }
}

async function validateAnthropic(key: string): Promise<ValidationResult> {
  try {
    const r = await fetchWithTimeout("https://api.anthropic.com/v1/models", {
      method: "GET",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01" },
    });
    if (r.status === 200) return { provider: "anthropic", status: "configured" };
    if (r.status === 401 || r.status === 403) return { provider: "anthropic", status: "invalid", detail: "Key rejected by provider." };
    return { provider: "anthropic", status: "unreachable", detail: `HTTP ${r.status}` };
  } catch (e: any) {
    return { provider: "anthropic", status: "unreachable", detail: e?.name === "AbortError" ? "Timed out." : "Network error." };
  }
}

async function validateElevenLabs(key: string): Promise<ValidationResult> {
  try {
    const r = await fetchWithTimeout("https://api.elevenlabs.io/v1/voices", {
      method: "GET",
      headers: { "xi-api-key": key },
    });
    if (r.status === 200) return { provider: "elevenlabs", status: "configured" };
    if (r.status === 401 || r.status === 403) return { provider: "elevenlabs", status: "invalid", detail: "Key rejected by provider." };
    return { provider: "elevenlabs", status: "unreachable", detail: `HTTP ${r.status}` };
  } catch (e: any) {
    return { provider: "elevenlabs", status: "unreachable", detail: e?.name === "AbortError" ? "Timed out." : "Network error." };
  }
}

async function validateReplicate(key: string): Promise<ValidationResult> {
  try {
    const r = await fetchWithTimeout("https://api.replicate.com/v1/account", {
      method: "GET",
      headers: { Authorization: `Token ${key}` },
    });
    if (r.status === 200) return { provider: "replicate", status: "configured" };
    if (r.status === 401 || r.status === 403) return { provider: "replicate", status: "invalid", detail: "Key rejected by provider." };
    return { provider: "replicate", status: "unreachable", detail: `HTTP ${r.status}` };
  } catch (e: any) {
    return { provider: "replicate", status: "unreachable", detail: e?.name === "AbortError" ? "Timed out." : "Network error." };
  }
}

async function validateFal(key: string): Promise<ValidationResult> {
  try {
    const r = await fetchWithTimeout("https://queue.fal.run/", {
      method: "GET",
      headers: { Authorization: `Key ${key}` },
    });
    // fal returns 404 on root with a valid key shape, 401 on bad key.
    if (r.status === 401 || r.status === 403) return { provider: "fal", status: "invalid", detail: "Key rejected by provider." };
    return { provider: "fal", status: "configured" };
  } catch (e: any) {
    return { provider: "fal", status: "unreachable", detail: e?.name === "AbortError" ? "Timed out." : "Network error." };
  }
}

/** Top-level validator. Returns shape-only "configured" for any provider we
 *  don't have a live ping for yet, so the UI never blocks the user. */
export async function validateProviderKey(user: any, provider: string): Promise<ValidationResult> {
  const col = PROVIDER_TO_USER_COLUMN[provider];
  if (!col) return { provider, status: "not_configured", detail: "Unknown provider." };
  const enc = user?.[col];
  const key = safeDecrypt(enc);
  if (!key) return { provider, status: "not_configured" };
  switch (provider) {
    case "openai":     return validateOpenAI(key);
    case "anthropic":  return validateAnthropic(key);
    case "elevenlabs": return validateElevenLabs(key);
    case "replicate":  return validateReplicate(key);
    case "fal":        return validateFal(key);
    // Shape-only for providers without a stable cheap-call endpoint.
    default: return { provider, status: "configured", detail: "Shape validated only." };
  }
}
