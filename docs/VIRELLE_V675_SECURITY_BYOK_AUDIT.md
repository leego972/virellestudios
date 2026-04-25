# Virelle v6.75 — BYOK / Security Audit

Audit of Bring-Your-Own-Key handling, project ownership enforcement,
and admin-only routes.

## 1. Raw API keys are never returned to the client

| Procedure | Returns |
|---|---|
| `byok.getProviderStatus` (`server/routers.ts:12750`) | `{ providers: { [name]: "configured" \| "not_configured" }, preferredVideoProvider, preferredLlmProvider, byokFallbackMode }` — **no key strings** |
| `byok.testProviderKey` (`server/routers.ts:12769`) | `{ valid, details }` shape from `validateProviderKey` — **no key strings** |
| `byok.updateProviderPreferences` (`server/routers.ts:12784`) | `{ success, fallbackMode }` — **no key strings** |

Verification: `rg -n "return.*encryptedKey|return.*decryptedKey|return.*\\.apiKey" server/_core/byok*.ts server/routers.ts` returns no matches. The
masked-status helper `getMaskedProviderStatus(user)` is the only path
the BYOK control center reads from.

**Result: PASS.**

## 2. Decrypted keys are not logged

Pre-v6.75 the Pollinations BYOK engine was logging
`currentKey.slice(0, 8)` — the first 8 characters of the decrypted
key — in 6 places (`server/_core/byokVideoEngine.ts:577,581,600,605,650,652`).
That is enough to fingerprint a user's key and was the only key-logging
leak found in the codebase.

**Fix in v6.75:** all 6 log lines were rewritten to use
`***${currentKey.slice(-4)}` instead of `${currentKey.slice(0, 8)}...`.
The last-4 form is the same convention used by Stripe and Twilio for
operational logging — it is enough to disambiguate which of the user's
keys is being tried (when they have several) without leaking the
prefix that an attacker can use to identify or brute-force the key.

`server/_core/llm.ts:384,397` already log only `e.message?.slice(0, 80)`
(an error message, not the key itself), which is safe and was left
untouched.

Verification: `rg -n "currentKey\\.slice\\(0," server/_core/byokVideoEngine.ts`
now returns zero matches.

**Result: FIXED in this version.**

## 3. Provider validation status is non-sensitive

`byok.testProviderKey` calls `validateProviderKey(user, provider)`
which returns a small public-shape object (validity flag, optional
balance/quota, optional model list). It never returns the raw key
nor a hash of the key.

**Result: PASS.**

## 4. Fallback mode is persisted

`byok.updateProviderPreferences` writes `byokFallbackMode` to the
`users` row via `db.updateUser`. `byok.getProviderStatus` reads it back
on every call, so the BYOK Control Center surfaces the persisted choice
without flicker. Default when unset is `"byok_with_consent"`.

**Result: PASS.**

## 5. Fallback from BYOK to credits requires the saved policy

Searched the LLM and video providers for fallback decisions. Both
`server/_core/llm.ts` and the video engines consult
`user.byokFallbackMode` / `getEffectiveProvider(user, ...)` from
`server/_core/providerPolicy.ts` before falling back to platform
credits. The four allowed values are
`credits_only / byok_only / byok_with_consent / byok_with_auto_fallback`
matching the Zod schema on `byok.updateProviderPreferences`.

**Result: PASS.**

## 6. Project ownership enforced on project / scene / recap routes

`server/routers.ts` uses two ownership-check patterns:

* `db.getProjectById(projectId, ctx.user.id)` — returns `null` if the
  project does not belong to the user, paired with a `NOT_FOUND` throw.
  103 occurrences.
* `assertCanAccessProject(projectId, ctx.user.id)` — explicit guard
  helper. Used on every recap route (e.g. `recap.estimate` at
  `routers.ts:11979`).

Per-scene mutations look up the scene via `db.getSceneById(sceneId)`
then re-resolve the project with `getProjectById(projectId, ctx.user.id)`,
so a scene id from a different user cannot be mutated.

**Result: PASS.**

## 7. Admin-only procedures use admin middleware

`adminProcedure` is the standard guard. Searched for routes that
should be admin-only:

* User listing / mutation: `admin.*` namespace uses `adminProcedure`.
* Credit-grant / refund admin tools: `adminProcedure`.
* No "raw" `protectedProcedure` was found exposing admin actions.

**Result: PASS.**

## 8. Session secret + crypto

* `SESSION_SECRET` is read from `process.env`, never logged.
* BYOK key encryption uses the platform-managed encryption key, also
  read from env. No code path returns the encryption key or the
  encrypted blob to the client.

**Result: PASS.**

---

## Findings summary

| # | Finding | Severity | Status |
|---|---|---|---|
| 1 | Pollinations BYOK engine logging `currentKey.slice(0, 8)` (decrypted key prefix) in 6 places | Medium | **Fixed in v6.75** — replaced with `***${currentKey.slice(-4)}` |
| 2 | All BYOK control-center responses verified to never return raw keys | — | PASS |
| 3 | All paid surfaces verified to enforce project ownership | — | PASS |
| 4 | Fallback policy correctly persisted and consulted | — | PASS |

No further fixes were applied per the brief's "fix obvious leaks or
missing ownership checks only" scope.
