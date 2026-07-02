# Swappys Mobile Step 2 — Virelle Connection Patch

Date: 2026-07-02
Scope: Swappys Mobile / Virelle public mobile manifest connection.

## Built now

Virelle now exposes a public mobile feature manifest at:

```http
GET /api/mobile/features
OPTIONS /api/mobile/features
```

The route is implemented inside:

```text
server/_core/securityHeaders.ts
```

This file is already loaded by the existing Express bootstrap, so the feature endpoint is available without rewriting the large `server/_core/index.ts` startup file.

## Endpoint behavior

`GET /api/mobile/features` returns:

- product identity
- upgrade/login/pricing/legal links
- enabled Swappys/Virelle feature flags
- supported transform goals
- Swappys Mobile limitations
- Virelle Creator capabilities

Important flags returned by the endpoint:

```json
{
  "ok": true,
  "features": {
    "creatorUpgrade": true,
    "swappysStudio": true,
    "digitalDouble": true,
    "genderTransform": true,
    "ageTransform": true,
    "childhoodSelf": true,
    "multiImageReference": true,
    "sourceVideoUpload": true,
    "referenceVideoUpload": true,
    "studioRenderQueue": true,
    "credits": true,
    "watermarkControls": true,
    "auditProvenance": true,
    "mobileEntryWatermarkRequired": true
  }
}
```

## Mobile app checker behavior

The tested Step 2 mobile ZIP now treats Virelle as fully connected only when:

1. `GET /api/health` responds successfully.
2. `GET /api/mobile/features` responds successfully.
3. The feature manifest confirms:
   - `creatorUpgrade: true`
   - `swappysStudio: true`
   - `watermarkControls: true`

If health is online but `/api/mobile/features` is missing, the app will show a partial/fail message while still keeping upgrade/login links active.

## Mobile ZIP generated

Local artifact:

```text
SwappysMobile_step2_connected_tested.zip
```

Local checks passed:

```text
npm install --ignore-scripts
npm run typecheck
npx expo config --type public
zip integrity test
```

## Replit verification

After pulling the latest Virelle commits, test:

```bash
pnpm install
pnpm run typecheck
pnpm run build
curl https://virelle.life/api/health
curl https://virelle.life/api/mobile/features
```

Expected result: both endpoints should return HTTP 200 JSON. The mobile app should show Virelle as connected once deployed.
