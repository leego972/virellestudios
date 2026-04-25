// v6.69 Phase 4 — Real BYOK provider validation.
//
// Rules (enforced by every helper below):
//   - Never log a decrypted key.
//   - Never include a decrypted key in the return value.
//   - Never call expensive generation endpoints — only a list/whoami/health route.
//   - Always wrap the network call in a hard timeout.
//
// Status values returned to callers:
//   valid           — provider returned 200 / OK
//   invalid         — provider returned an auth error (401/403)
//   rate_limited    — provider returned 429 / quota exceeded
//   unsupported     — we don't have a safe cheap-call ping for this provider yet
//   not_configured  — the user has no key on file for this provider
//   unknown_error   — anything else (timeout, 5xx, parse failure, decrypt failure)

import { decryptApiKey } from "./securityEngine";

export type ByokValidationStatus =
  | "valid"
  | "invalid"
  | "rate_limited"
  | "unsupported"
  | "not_configured"
  | "unknown_error";

export interface ValidationResult {
  provider: string;
  status: ByokValidationStatus;
  /** Optional human-readable hint. NEVER contains the key itself. */
  message?: string;
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 8000): Promise<Response> {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ac.signal });
  } finally {
    clearTimeout(t);
  }
}

function classifyHttp(res: Response): ByokValidationStatus {
  if (res.ok) return "valid";
  if (res.status === 401 || res.status === 403) return "invalid";
  if (res.status === 429) return "rate_limited";
  return "unknown_error";
}

async function validateOpenAI(key: string): Promise<ValidationResult> {
  try {
    const res = await fetchWithTimeout("https://api.openai.com/v1/models", {
      method: "GET",
      headers: { Authorization: `Bearer ${key}` },
    });
    return { provider: "openai", status: classifyHttp(res) };
  } catch {
    return { provider: "openai", status: "unknown_error" };
  }
}

async function validateAnthropic(key: string): Promise<ValidationResult> {
  try {
    // /v1/models requires the anthropic-version header. Cheapest possible call.
    const res = await fetchWithTimeout("https://api.anthropic.com/v1/models", {
      method: "GET",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
    });
    return { provider: "anthropic", status: classifyHttp(res) };
  } catch {
    return { provider: "anthropic", status: "unknown_error" };
  }
}

async function validateGoogleAI(key: string): Promise<ValidationResult> {
  try {
    // Cheapest known call: list models with the key in the query string.
    const res = await fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`,
      { method: "GET" },
    );
    return { provider: "google", status: classifyHttp(res) };
  } catch {
    return { provider: "google", status: "unknown_error" };
  }
}

async function validateElevenLabs(key: string): Promise<ValidationResult> {
  try {
    const res = await fetchWithTimeout("https://api.elevenlabs.io/v1/user", {
      method: "GET",
      headers: { "xi-api-key": key },
    });
    return { provider: "elevenlabs", status: classifyHttp(res) };
  } catch {
    return { provider: "elevenlabs", status: "unknown_error" };
  }
}

async function validateReplicate(key: string): Promise<ValidationResult> {
  try {
    const res = await fetchWithTimeout("https://api.replicate.com/v1/account", {
      method: "GET",
      headers: { Authorization: `Token ${key}` },
    });
    return { provider: "replicate", status: classifyHttp(res) };
  } catch {
    return { provider: "replicate", status: "unknown_error" };
  }
}

async function validateFal(key: string): Promise<ValidationResult> {
  try {
    // fal.ai has no documented free /me endpoint that works without an app
    // path — the safest cheap probe is hitting the queue root which 401s on
    // bad keys and 200s on good keys.
    const res = await fetchWithTimeout("https://queue.fal.run/", {
      method: "GET",
      headers: { Authorization: `Key ${key}` },
    });
    return { provider: "fal", status: classifyHttp(res) };
  } catch {
    return { provider: "fal", status: "unknown_error" };
  }
}

async function validateRunway(key: string): Promise<ValidationResult> {
  try {
    // Runway's documented Generative API root: GET /v1/organization returns
    // 200 with a valid key, 401 with an invalid one.
    const res = await fetchWithTimeout("https://api.dev.runwayml.com/v1/organization", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${key}`,
        "X-Runway-Version": "2024-11-06",
      },
    });
    return { provider: "runway", status: classifyHttp(res) };
  } catch {
    return { provider: "runway", status: "unknown_error" };
  }
}

async function validateLuma(key: string): Promise<ValidationResult> {
  try {
    // Luma Dream Machine list-generations endpoint is the cheapest probe.
    const res = await fetchWithTimeout(
      "https://api.lumalabs.ai/dream-machine/v1/generations?limit=1",
      { method: "GET", headers: { Authorization: `Bearer ${key}` } },
    );
    return { provider: "luma", status: classifyHttp(res) };
  } catch {
    return { provider: "luma", status: "unknown_error" };
  }
}

async function validateHuggingFace(key: string): Promise<ValidationResult> {
  try {
    const res = await fetchWithTimeout("https://huggingface.co/api/whoami-v2", {
      method: "GET",
      headers: { Authorization: `Bearer ${key}` },
    });
    return { provider: "huggingface", status: classifyHttp(res) };
  } catch {
    return { provider: "huggingface", status: "unknown_error" };
  }
}

async function validateVenice(key: string): Promise<ValidationResult> {
  try {
    // Venice uses the OpenAI-compatible /v1/models route.
    const res = await fetchWithTimeout("https://api.venice.ai/api/v1/models", {
      method: "GET",
      headers: { Authorization: `Bearer ${key}` },
    });
    return { provider: "venice", status: classifyHttp(res) };
  } catch {
    return { provider: "venice", status: "unknown_error" };
  }
}

/**
 * v6.69 — Resolve the encrypted key on the user row for the named provider,
 * decrypt it, ping the provider's cheapest endpoint, and return a status.
 * NEVER returns or logs the decrypted key.
 */
export async function validateProviderKey(
  user: any,
  provider: string,
): Promise<ValidationResult> {
  const p = String(provider || "").toLowerCase();
  // Map provider → encrypted column on the users row.
  const COLUMNS: Record<string, string> = {
    openai: "userOpenaiKey",
    anthropic: "userAnthropicKey",
    google: "userGoogleAiKey",
    googleai: "userGoogleAiKey",
    runway: "userRunwayKey",
    replicate: "userReplicateKey",
    fal: "userFalKey",
    elevenlabs: "userElevenLabsKey",
    luma: "userLumaKey",
    huggingface: "userHfToken",
    hf: "userHfToken",
    venice: "userVeniceKey",
    byteplus: "userByteplusKey",
    suno: "userSunoKey",
  };
  const column = COLUMNS[p];
  if (!column) {
    return { provider: p, status: "unsupported", message: "Provider is not recognized." };
  }
  const enc: string | null = (user as any)?.[column] ?? null;
  if (!enc) {
    return { provider: p, status: "not_configured" };
  }
  let key: string;
  try {
    key = decryptApiKey(enc);
    if (!key) throw new Error("empty");
  } catch {
    return { provider: p, status: "invalid", message: "Stored key could not be decrypted — re-save it." };
  }

  // Dispatch to the provider-specific ping. Providers without a cheap, safe
  // ping return "unsupported" rather than a fake "valid".
  switch (p) {
    case "openai":      return validateOpenAI(key);
    case "anthropic":   return validateAnthropic(key);
    case "google":
    case "googleai":    return validateGoogleAI(key);
    case "elevenlabs":  return validateElevenLabs(key);
    case "replicate":   return validateReplicate(key);
    case "fal":         return validateFal(key);
    case "runway":      return validateRunway(key);
    case "luma":        return validateLuma(key);
    case "huggingface":
    case "hf":          return validateHuggingFace(key);
    case "venice":      return validateVenice(key);
    case "byteplus":
    case "suno":
      return {
        provider: p,
        status: "unsupported",
        message: "No safe cheap-call validation endpoint is implemented for this provider yet — the key shape is configured but cannot be ping-tested.",
      };
    default:
      return { provider: p, status: "unsupported" };
  }
}
