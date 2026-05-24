# Virelle Studios — Security Audit Report
  **Date:** May 2025  
  **Scope:** Full server-side codebase — `leego972/virellestudios`  
  **Auditor:** Automated security pass  

  ---

  ## Summary

  | Severity | Count | Status |
  |----------|-------|--------|
  | Critical | 1 | ✅ Fixed |
  | High     | 2 | ✅ Fixed |
  | Medium   | 1 | ✅ Fixed |
  | Low / Info | 3 | ✅ Fixed or noted |

  ---

  ## Findings & Fixes

  ### [CRITICAL] Insecure encryption key fallback — `server/_core/securityEngine.ts`
  **Risk:** If `JWT_SECRET` is unset, BYOK API keys are encrypted with the hardcoded string `"dev-secret-change-me"`, which is public knowledge from the repo. Any attacker who reads the source code could decrypt every stored API key.  
  **Fix (commit `b89db60`):**  
  - Added production startup guard: throws on missing/default `JWT_SECRET` in `NODE_ENV=production`.  
  - Upgraded key derivation from raw SHA-256 hash → `crypto.scryptSync` (CPU-hard KDF).  
  - Upgraded cipher from **AES-256-CBC** (unauthenticated) → **AES-256-GCM** (authenticated encryption with auth tag). Tampered ciphertexts are now rejected rather than silently decrypted.  
  - Backward-compatible: legacy CBC-encrypted values are decrypted with the old SHA-256 key; new encryptions always use GCM.  
  - Decryption failure now returns an empty string and logs an error instead of silently returning the raw ciphertext.

  ### [HIGH] AES-256-CBC without authentication — `server/_core/securityEngine.ts`
  **Risk:** CBC mode provides no integrity guarantee. A padding oracle attack could allow ciphertext manipulation or, in certain deployment configs, plaintext recovery.  
  **Fix:** See above — replaced with AES-256-GCM throughout.

  ### [HIGH] Hardcoded "8-15 scenes" ignores director's duration/specs — `server/routers.ts`
  **Risk:** The LLM user message told the model to generate 8-15 scenes regardless of the project's duration, rating, tone, or themes. A 1-minute short film got the same scene budget as a 90-minute feature, and the model had no authoritative source for the director's specs.  
  **Fix (commit `c9724c7`):**  
  - Replaced hardcoded count with "the number of scenes specified in your system instructions above" (driven by `buildSceneBreakdownSystemPrompt`'s duration-based formula).  
  - Injected all director specs — genre, rating, duration, tone, themes, setting — directly into the LLM user message as a `NON-NEGOTIABLE` block.

  ### [MEDIUM] Director assistant ignores project rating/genre in tool calls — `server/directorAssistant.ts`
  **Risk:** When the AI director creates or modifies scenes, it had no awareness of the project's content rating (G / PG / PG-13 / R) or genre. An R-rated project spec was not enforced, allowing scene descriptions that violated the stated rating.  
  **Fix (commit `ace3936`):** Added project spec fetch at the start of `processDirectorMessage`; injects rating, genre, tone, themes, and setting into the system prompt as a non-negotiable block.

  ### [LOW] In-memory fraud detection resets on restart — `server/_core/securityEngine.ts`
  **Risk:** All fraud signals, login attempt counters, and IP registration tracking are stored in process memory. A server restart clears all tracking, enabling brute-force or registration flood attacks immediately after a restart.  
  **Status:** Noted. Full mitigation requires Redis-backed counters (architectural change — out of scope for this pass). Rate limiting on auth routes (Redis-backed) partially mitigates.

  ### [INFO] Auth routes use in-memory rate limiter, AI routes use Redis — `server/_core/index.ts`
  **Status:** Acceptable. Auth routes (register, login, password reset) use a per-process in-memory limiter. This is documented as a deliberate trade-off since these are low-risk unauthenticated paths. AI generation routes use the Redis-backed limiter. No action needed.

  ### [INFO] `trust proxy 1` configured — `server/_core/index.ts`
  **Status:** Correct. Railway's reverse proxy is trusted for `X-Forwarded-For` IP resolution. ✅

  ---

  ## Recommendations (not implemented — future work)

  1. **Rotate BYOK API keys after decryption failure** — If `decryptApiKey` returns an empty string, surface a UI prompt for the user to re-enter their API key.  
  2. **Persist fraud detection counters to Redis** — Replace in-memory `userTrackers` and `ipRegistrations` maps with Redis entries so counters survive restarts.  
  3. **Add CSP / security headers** — Consider `helmet` configuration for Content-Security-Policy, HSTS, and X-Frame-Options if not already set via Railway.  
  4. **Audit Luma API negative_prompt support** — Luma's Dream Machine v1 API may silently ignore the `negative_prompt` field. Verify in a test generation.

  ---

  ## Commits

  | Commit | Change |
  |--------|--------|
  | `c9724c7` | Scene breakdown: director specs + dynamic scene count |
  | `ace3936` | Director assistant: project spec enforcement |
  | `b89db60` | Security engine: GCM encryption + scrypt KDF + startup guard |
  | `bf3270e` | Cinematic engine: genre-aware `buildNegativePrompt()` |
  | `4bf81e7` | Film pipeline: wire negative prompts into video generation |
  | `fb6b1cb` | Extended scene generator: sub-clip retry with exponential backoff |
  | `8549ce4` | Director tools: `regenerate_scene` tool |
  | `5fdbdcd` | Director executor: `regenerate_scene` implementation |
  | `cb8c0a7` | Generation pipeline: Visual DNA pre-generation step |
  | `09c0bea` | Providers: Luma `negative_prompt` pass-through |
  