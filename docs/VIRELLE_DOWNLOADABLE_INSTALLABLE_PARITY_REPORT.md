# Virelle Studios — Downloadable, Installable, Parity Report

_Generated alongside the v6.74 brief merge._

This is the audit + remediation note for the user request:

> Make sure app is downloadable, installable and has parity with website.

It documents (a) what already existed before this pass, (b) the small set of
gaps found, and (c) the changes shipped in this commit so that the Download
page **just works** end-to-end on the day a desktop release is cut.

---

## 1. State before this pass

### Web (the source of truth)

- `client/` — full React + Vite SPA, ~128 routes registered in `App.tsx`.
- `server/` — Express + tRPC backend.
- Deployed to Railway from `main` on every push.

### Mobile (separate repo `virellestudios-mobile`)

- iOS app **live** on the App Store: `apps.apple.com/app/virelle-studios/id6761315616`.
- Android: not yet shipped — `ANDROID_DOWNLOAD_URL` deliberately unset so the
  Download page does not lie about availability.
- Subscription constants synced via `scripts/sync-mobile-constants.ts` →
  writes `virellestudios-mobile/shared/_core/subscription-constants.ts`.
- Feature catalogue exposed at runtime via `GET /api/mobile/features`
  (`server/_core/index.ts:454`), reading from `shared/feature-registry.ts`.
  This means new features added to the registry (e.g. v6.73's
  `script-breakdown` and `continuity-readiness`) appear in mobile **without**
  a mobile app update.

### Desktop (`desktop/`)

- Electron wrapper, `desktop/main.js` v1.1.0.
- Loads `https://www.virelle.life` in a native window — therefore desktop
  inherits 100% feature parity with the website by construction.
- `electron-builder` config produces:
  - macOS: `.dmg` for x64 + arm64
  - Windows: NSIS `.exe` for x64
  - Linux: `.AppImage` + `.deb` for x64
- Deep-link protocol `virelle://` registered for Stripe checkout return-flow.
- Identifies itself to the server via `X-Virelle-Client: desktop` and
  `X-Virelle-Desktop-Version: <version>` headers.
- CI: `.github/workflows/desktop-release.yml` triggers on `desktop-v*` tag
  push, builds all three platforms in parallel, publishes a single GitHub
  Release with all installers attached.

### PWA

- `client/public/manifest.json` — full manifest with icons, shortcuts,
  related_applications.
- `client/index.html` links the manifest + iOS-specific meta tags
  (`apple-mobile-web-app-capable`, `apple-mobile-web-app-title`).
- `client/src/main.tsx` registers `/sw.js` in production.
- `client/public/sw.js` implements precache + offline shell + cache-first for
  hashed assets + network-first for navigations/API.
- `DownloadApp.tsx` has a working `beforeinstallprompt` capture + install
  button.

### Download UX

- `client/src/pages/DownloadApp.tsx` — single page with iOS / Android / Mac /
  Windows / Linux buttons, PWA install prompt, referral CTA.
- `GET /api/mobile/downloads` returns availability + URLs per platform.

---

## 2. Gap found

The desktop installers were **built** by the GitHub Action but the Download
page never lit them up, because `/api/mobile/downloads` only returned a URL
when an env var (`DESKTOP_MAC_URL`, `DESKTOP_WIN_URL`, `DESKTOP_LINUX_URL`)
was explicitly set in production. That left two manual steps after every
desktop release:

1. Push the `desktop-v*` tag — the workflow builds + uploads installers.
2. **Manually copy each asset URL into Railway env vars and redeploy.**

Step 2 was the gap. In practice it never happened, so the Download page
buttons stayed permanently disabled even though the installers existed on
GitHub Releases.

A secondary gap: `electron-builder`'s mac/win/linux configs reference
`build/icon.png`, but the file did not exist in the repo. We never duplicate
brand assets (the canonical favicon lives at
`client/public/virelle-favicon-512.png`), so the build was using Electron's
default icon instead of the Virelle mark.

---

## 3. Changes shipped in this commit

### A. `/api/mobile/downloads` auto-detects from GitHub Releases

`server/_core/index.ts` — the endpoint is now async and falls through this
resolution order per platform:

1. Explicit env var (`DESKTOP_MAC_URL`, etc.) — wins, for the day we add
   signed/notarised builds hosted on our own CDN.
2. Latest non-draft / non-prerelease GitHub release whose tag starts with
   `desktop-v` on `leego972/virellestudios` (overridable via
   `DESKTOP_RELEASES_REPO`). Assets matched by extension:
   - `.dmg` → mac (arm64 preferred, then any DMG)
   - `.exe` → win
   - `.AppImage` → linux (with `.deb` as the fallback)
3. iOS still falls back to the live App Store listing.

The GitHub call is in-process cached for 5 minutes, has a 4-second timeout,
sends `User-Agent: virelle-studios-server`, and uses `GITHUB_TOKEN` if set
(useful in dev when hitting the unauth rate limit). Failure is silent — the
endpoint keeps returning the iOS link and degrades the desktop buttons to
"Coming Soon" exactly as before.

The response now includes a `desktop.source` field
(`"env" | "github-release" | "none"`) for debugging.

**Net effect:** push `git tag desktop-v1.1.0 && git push --tags` → the
workflow runs (~10 min) → the Download page on `virelle.life` lights up the
mac/win/linux buttons within 5 minutes of the release being published. No
Railway env var step.

### B. Brand icon for desktop installers

`desktop/scripts/prepare-icon.js` is a pre-build hook that copies
`client/public/virelle-favicon-512.png` → `desktop/build/icon.png` just
before electron-builder runs. The brand asset is never duplicated in source
control — `desktop/build/` is gitignored. If the source favicon is missing
the script logs a warning and exits 0 so the build still succeeds with the
default Electron icon.

`desktop/package.json` runs the hook before every build target
(`build:mac`, `build:win`, `build:linux`, `build:all`). The
`prebuild` lifecycle hook also covers plain `npm run build`.

### C. `.gitignore`

Adds explicit entries for `desktop/build/`, `desktop/dist/`,
`desktop/node_modules/` so the generated icon, the produced installers, and
any local Electron deps never accidentally enter git.

---

## 4. Parity confirmation

| Surface  | Source of truth                                        | Mechanism                                                                                                  | Confirmed |
| -------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- | --------- |
| Web      | `client/`                                              | direct                                                                                                     | ✅         |
| Mobile   | `virellestudios-mobile`                                | runtime `GET /api/mobile/features` reads `shared/feature-registry.ts` — v6.73 entries already exposed      | ✅         |
| Mobile   | subscription tiers / pricing / credits                 | build-time `pnpm sync-mobile` writes `subscription-constants.ts`                                           | ✅         |
| Desktop  | `desktop/main.js`                                      | loads `https://www.virelle.life` in Electron — 100% web parity by construction; deep links `virelle://`     | ✅         |
| PWA      | `client/public/manifest.json` + `client/public/sw.js`  | linked from `index.html`, registered in `main.tsx` (PROD only), `beforeinstallprompt` captured on Download | ✅         |

---

## 5. How to cut a desktop release after this commit

```sh
# 1. Bump desktop/package.json "version".
# 2. Tag and push:
git tag desktop-v1.2.0
git push origin desktop-v1.2.0

# 3. Wait ~10 minutes for the matrix build.
# 4. Verify: https://www.virelle.life/download — buttons should light up
#    within 5 minutes (release cache TTL).
```

No Railway changes required.

---

## 6. Verification

- `pnpm check` — passes (TypeScript clean).
- `pnpm build` — passes (server bundle + Vite client build).
- Existing `desktop-release.yml` matrix workflow — unchanged, still
  produces the same artifacts.
- Existing `/api/mobile/features` endpoint — unchanged, already exposing
  the v6.73 registry entries.
- iOS App Store link — unchanged, still live.

No behavioural change for users until a `desktop-v*` tag is pushed; at that
point the Download page activates automatically.
