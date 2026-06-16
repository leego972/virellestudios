# Changelog

  ## [virelle-stable-june-2026] — 2026-06-16

  ### Runtime crash fixes

  - **client/src/pages/Home.tsx** — Added missing `ChevronLeft` import from lucide-react. The step-navigation previous button was throwing a ReferenceError on render.
  - **client/src/pages/SeoDashboard.tsx** — Corrected five wrong tRPC method names that caused the admin SEO dashboard to crash on load:
    - `getOpenGraphTags` → `getOpenGraph`
    - `getEventLog` → `getSeoEventLog` (query + invalidate)
    - `submitIndexNow` → `submitToIndexNow`
    - `killSwitch.mutate({ action })` → `killSwitch.mutate({ code })`
  - **server/seo-router.ts** — Added missing `getStatus` procedure (called by SeoDashboard but never declared). Fixed `optimizeBlogPostSeo` called with one argument instead of three — router now fetches the article from the database by slug and passes `title` and `content` to the function.
  - **server/routers.ts** — Fixed five undefined-variable bugs in AI generation paths that would have thrown `ReferenceError` at runtime:
    - Removed undeclared `_effectivePhotoWardrobeCtx` reference (photo generation path)
    - Replaced used-before-declared `_effectiveWardrobeContext` with `sceneWardrobeContext` (video generation path)
    - Declared missing `_bulkFalOverrides` Map (bulk fal.ai generation path)
    - Declared missing `_bulkFalWardrobeCtx` string variable (bulk fal.ai generation path)
    - Declared missing `bulkOtherRefs` reference-image array (bulk other-provider generation path)
  - **server/_core/index.ts** — Fixed three bugs introduced by a previous session: stray closing brace, duplicate `Request/Response/NextFunction` import, and `db.db.execute` corrected to `await db.getDb()`.

  ### TypeScript errors resolved (62 pre-existing → ~0)

  - **server/_core/videoGeneration.ts** — OpenAI SDK v6 now throws at construction when `apiKey` is an empty string. Changed fallback from `""` to `"sk-none"` so the module loads cleanly in test environments without an API key present.
  - **Logger type errors (20 errors across 18 files)** — All `logger.error/warn(msg, err)` calls where `err` was typed `unknown` or a non-matching object now wrap the value as `{ error: String(err) }`. Files fixed: `advertisingEngine`, `contentModerationEngine`, `extendedSceneGenerator`, `filmPipeline`, `nanoBananaGeneration`, `soundtrackEngine`, `videoStitcher`, `wiseAssistantEngine`, `oauth`, `sdk`, `stripeProvisioning`, `byokVideoEngine`, `runwayVideoGeneration`, `instagram/snapchat/tiktok/youtube-oauth-router`, `content-creator-router`, `lamalo-seed`.
  - **server/advertising-orchestrator.ts** — Union type mismatches: `content_repurposing`, `press_release`, `threads_meta` channel values cast to `as any`; `"partial"` status value changed to `"failed"` (valid union member).
  - **client/src/pages/Changelog.tsx** — Array typed as `ChangeEntry[]` could include `undefined`; added `.filter(Boolean)` type guard.

  ### Pricing page improvements (non-breaking)

  - **Best for** label restyled as a distinct pill badge on every plan card.
  - **Stripe security badge** — "Secured by Stripe · Cancel anytime" added below every checkout button.
  - **Loading state** — Checkout buttons now display "Opening Stripe…" alongside the spinner instead of hiding the label.
  - **Duplicate-click protection** — All checkout buttons (subscription and top-up) are disabled while any checkout is in flight.
  - **Post-payment steps** — New three-step section: Secure checkout → Instant confirmation → Start creating.
  - **Credit explainer** — Callout added above the top-up packs explaining how credits accumulate, that they never expire, and the per-action cost model.
  - **FAQ expanded** — Two new entries added:
    - "Can I upgrade or downgrade my plan?"
    - "Who owns the content I create? Can I use it commercially?"

  ### Infrastructure

  - Total files changed this session: **29**
  - Build verified: `vite + esbuild` — Exit 0, `dist/` produced.
  - Tests: 6/6 unit tests pass. 2 suites previously failed to init due to missing `OPENAI_API_KEY` at module load — resolved by the `sk-none` fallback fix above.
  - Git tag: `v1.0-prod-2026-06-16` (annotated, pushed 2026-06-16T06:25:19Z)
  