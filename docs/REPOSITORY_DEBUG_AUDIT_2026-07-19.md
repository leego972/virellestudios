# Virelle Studios — Repository Debug and Feature Connectivity Audit

Date: 2026-07-19  
Branch: `audit/repository-debug-2026-07-19`  
Scope: Virelle Studios web/server repository plus the Swappys daughter app

## Executive result

The Virelle root application is structurally healthy but not fully connected.

### Automated gates that passed

- Root TypeScript check
- Root unit and integration test suite
- Root production build
- High-severity dependency audit
- Secret-pattern scan

### Daughter-app gates that failed

- Swappys dependency installation
- Swappys TypeScript check, because dependencies could not install
- Swappys Expo configuration check, because the Expo dependency graph was incomplete

The repository must not be described as fully production-complete until the confirmed connectivity defects below are repaired and tested end to end.

---

## P0 — Production blockers

### 1. Swappys cannot install

**Files:**

- `apps/swappys-mobile/package.json`

`expo-media-library` is declared as `~16.0.6`, a version that does not exist for Expo SDK 52. Expo SDK 52 expects the 17.x package line. Because installation fails, Swappys has not been covered by TypeScript or Expo compatibility checks in the normal root build.

**Required correction:**

- Align all Swappys Expo modules with the exact SDK 52 compatibility matrix.
- Commit a daughter-app lockfile.
- Run `typecheck`, `expo-doctor`, iOS prebuild and Android prebuild in CI.

### 2. Anonymous Swappys requests can spend server AI credits

**Files:**

- `server/vfx-sfx-router.ts`
- `server/_core/imageGeneration.ts`

`swappysMobileSwap` is a `publicProcedure` that reaches `generateImage()`. The image engine uses environment API keys when no user key is supplied. The procedure has no per-IP quota, daily free allowance, user-credit deduction or BYOK enforcement.

**Required correction:**

- Apply per-IP minute and daily limits for anonymous users.
- Apply user-based heavy-AI limits for authenticated users.
- Define an explicit free allowance.
- Require credits or BYOK above the free allowance.
- Log provider, cost class and entitlement source for every request.

### 3. Swappys accepts unverified base64 image data

**Files:**

- `server/vfx-sfx-router.ts`

The server accepts large strings and removes a data-URI prefix. It does not verify decoded size, MIME type, magic bytes, image dimensions or whether decoding produced a valid supported image.

**Required correction:**

- Accept only JPEG, PNG and WebP.
- Decode and verify magic bytes.
- Validate dimensions and pixel count with `sharp` before generation.
- Reject malformed, oversized and decompression-bomb inputs.
- Use a server limit that agrees with the UI limit.

### 4. Swappys image moderation is not connected

**Files:**

- `server/vfx-sfx-router.ts`
- `server/_core/contentModerationEngine.ts`

The endpoint enforces a consent boolean but does not moderate either uploaded image before transformation. Text-only keyword moderation is not sufficient for face/body transformation uploads.

**Required correction:**

- Run multimodal moderation on both uploaded images before generation.
- Reject flagged sexual-minor, non-consensual sexual, graphic violence and other prohibited content.
- Record anonymous incidents by hashed IP/request ID without inventing a user account.

### 5. Swappys browser login is not bridged back to the native app

**Files:**

- `apps/swappys-mobile/App.tsx`
- `apps/swappys-mobile/src/SwappysWebApp.ts`
- `server/_core/context.ts`
- `server/_core/cookies.ts`
- `client/src/pages/Login.tsx`

Swappys opens Virelle login in the external browser, but there is no deep-link token exchange or secure native token store. The local WebView request uses `credentials: include`, which does not establish a reliable shared Virelle session after external login.

**Consequences:**

- A paid user can log in successfully and still remain anonymous inside Swappys.
- Watermark removal and paid entitlement checks may never activate.
- The upgrade/login workflow appears complete in the UI but is not complete technically.

**Required correction:**

- Add a short-lived one-time mobile authentication exchange.
- Return through the `swappys://` deep-link scheme.
- Store the resulting scoped token in SecureStore.
- Authenticate Swappys API calls with an Authorization header.
- Support logout and token revocation.

### 6. Valid client uploads can exceed the Express body limit

**Files:**

- `apps/swappys-mobile/src/SwappysWebApp.ts`
- `server/_core/index.ts`

The client accepts two images up to 10 MB each. Base64 expansion can push the request above the server's 25 MB JSON limit before route validation runs.

**Required correction:**

- Reduce and compress client images before upload.
- Set one documented decoded-byte limit used by both client and server.
- Prefer multipart or direct-storage uploads over embedding multiple images in JSON.

---

## P1 — Disconnected user-facing features

### 7. Six page components are imported but never mounted

**File:** `client/src/App.tsx`

Confirmed unreachable imports:

- `VFXStudio`
- `MusicStudio`
- `DubbingStudio`
- `AudioMixer`
- `AccessibilityStudio`
- `LocationStudio`

Three of these are already advertised in the dashboard navigation.

**Required correction:**

- Add deliberate routes for supported pages.
- Remove imports and navigation for pages that are prototypes rather than production features.
- Apply subscription/project gates consistently.

### 8. Dashboard links point to missing routes

**File:** `client/src/components/DashboardLayout.tsx`

Broken navigation:

- VFX & Sound → `/vfx-studio`
- Music Studio → `/music-studio`
- Dubbing Studio → `/dubbing-studio`

None of these paths is currently mounted in `App.tsx`.

### 9. Five additional navigation targets are invalid

| Source | Current target | Registered equivalent or required decision |
|---|---|---|
| `Characters.tsx` | `/projects/:id/dubbing` | Use the intended Dubbing route |
| `CuttingRoom.tsx` | `/movies/:id` | Add a movie-detail route or use the correct film/project route |
| `ProjectDetail.tsx` | `/projects/:id/approvals` | Existing route is `/projects/:id/approval-chain` |
| `ScriptBreakdownWizardPage.tsx` | `/projects/:id/characters` | Existing route is global `/characters`; decide whether project filtering is required |
| `VFXStudio.tsx` | `/settings/api-keys` | Existing BYOK route is `/settings/byok` |

### 10. Swappys has no direct Virelle daughter-app entry path

**Files:**

- `client/src/components/DashboardLayout.tsx`
- `client/src/App.tsx`

The menu item labelled `Swappys (Face Swap)` sends the user to `/projects`. It does not open Swappys, a Swappys landing/control page, or a specific VFX Suite workflow.

**Required correction:**

- Add a dedicated `/swappys` parent route.
- Explain native-app availability and web workflow clearly.
- Allow the user to select a project and scene before saving a result.
- Link directly to the relevant VFX Suite action when a project is selected.

### 11. Swappys Record is a floating control

**File:** `apps/swappys-mobile/src/SwappysWebApp.ts`

The Record button creates a local `recordingUrl`. The transformation request sends only the two uploaded still images. The recorded clip is never used by the provider or saved into Virelle.

**Required correction:**

- Connect recording to a real video transformation pipeline; or
- remove/disable the control until the supported video path exists.

A professional UI must not imply a capability that is ignored by the backend.

### 12. Swappys results cannot return to Virelle

**File:** `apps/swappys-mobile/App.tsx`

Results can be saved to the device photo library, but there is no project, scene or production-asset save path.

**Required correction:**

- Add project and scene selectors for authenticated users.
- Upload the result to permanent storage.
- Create a production asset and optionally attach it to a scene.
- Show success only after server persistence is confirmed.

### 13. Swappys is absent from the shared feature registry

**File:** `shared/feature-registry.ts`

The server feature endpoint reports `swappysStudio: true`, but the shared feature registry contains no Swappys entry. The registry and flags therefore disagree.

### 14. VFX library images are never generated or displayed

**File:** `client/src/pages/VFXStudio.tsx`

`PACK_IMAGE_PROMPTS` contains detailed prompts, but `packImageUrl()` always returns an empty string. Every pack falls back to a letter tile.

**Required correction:**

- Store generated pack image URLs in a catalogue or static asset manifest.
- Generate missing images through an administrator-controlled job.
- Provide loading, failure and regeneration states.
- Never generate the full catalogue on every page request.

### 15. Two visible buttons have no action

**Files:**

- `client/src/pages/Showcase.tsx` — `Ready for Generation`
- `client/src/pages/Subtitles.tsx` — `Export ASL/BSL Brief`

The Showcase control should be a status badge or should perform a real action. The subtitle export buttons require controlled text input and a real file export.

---

## P1 — Floating server modules

### 16. Affiliate router is an unmounted stub implementation

**File:** `server/affiliate-router.ts`

The router is not mounted and contains numerous local stub functions returning empty arrays, zero metrics, blank URLs and synthetic success responses. Mounting it would expose non-functional endpoints.

**Required correction:**

- Do not mount it in its current form.
- Either connect it to the real affiliate/referral engine and database, with tests, or remove/archive it.

### 17. Blog router is unmounted and internally inconsistent

**File:** `server/blog-router.ts`

The router is not mounted. It also appears to use the `blogArticles` table for category records and contains code paths that insert category-shaped objects into the article table.

**Required correction:**

- Reconcile it with the currently active blog/SEO implementation.
- Remove duplicate or superseded routes.
- Mount only one authoritative blog API.

---

## P2 — Repository and UX cleanup

### 18. Unrouted page files need explicit disposition

- `client/src/pages/admin/AdminUsers.tsx` — duplicate path candidate
- `client/src/pages/DesignersPage.tsx`
- `client/src/pages/Onboarding.tsx`
- `client/src/pages/Upgrade.tsx`

Each file must be classified as production, internal-only, superseded or removable. Keeping unused pages indefinitely causes route drift and duplicated maintenance.

### 19. Duplicate health endpoint

**File:** `server/_core/index.ts`

`/api/health` is registered twice. The first handler sends a response, making the later handler unreachable for the same route.

**Required correction:**

- Keep one authoritative health response.
- Include database state, uptime, commit/version and degraded status in that single handler.

### 20. Swappys download-page claims do not match the daughter app

**File:** `client/src/pages/DownloadApp.tsx`

The Swappys card describes script writing, storyboarding and AI video generation, while the daughter app currently implements still-image face/body transformation. It links to the Virelle Studios App Store listing rather than a clearly verified Swappys listing.

**Required correction:**

- Use accurate product copy.
- Label Virelle and Swappys downloads separately.
- Do not claim BYOK or unlimited exports until those paths exist in the daughter app.

---

## Required acceptance tests before completion

### Virelle web

1. Every sidebar and project-workflow link resolves to a real route.
2. Every routed page loads without console errors at desktop and 375/390 px widths.
3. Every visible primary button performs a real action or is rendered as a non-button status element.
4. Every export button creates and downloads a valid file.
5. Every catalogue image displays a permanent URL or an explicit recoverable error state.
6. Every client tRPC call resolves to a mounted procedure.
7. Superseded routers/pages are removed rather than left floating.

### Swappys daughter app

1. Clean dependency installation from an empty cache.
2. TypeScript and Expo Doctor pass.
3. iOS and Android prebuild pass.
4. Anonymous generation is strictly rate-limited and watermarked.
5. Authenticated entitlement reaches the app through a secure deep-link exchange.
6. Both images pass server MIME, magic-byte, dimension and moderation checks.
7. Oversized and malformed uploads fail before provider spending.
8. The Record control either drives a supported video pipeline or is absent.
9. Result saves locally and can be persisted to a selected Virelle project/scene.
10. Swappys appears consistently in the shared registry, Virelle navigation and download page.
11. Physical-device camera, upload, login, deep-link, generation and save tests pass on iOS and Android.

## Audit reliability note

The first connectivity pass incorrectly classified tRPC client helpers such as `trpc.useUtils`, `trpc.Provider` and `trpc.createClient` as server router roots. Those findings were excluded. No confirmed client call to an actual unmounted tRPC root remains in the verified findings above.
