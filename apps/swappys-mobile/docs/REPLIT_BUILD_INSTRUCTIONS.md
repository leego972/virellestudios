# Replit Build Instructions — Swappys Mobile

Work directory:

```bash
cd apps/swappys-mobile
```

Run:

```bash
npm install
npm run typecheck
npx expo config --type public
npx expo-doctor
npm start
```

## Check app behavior

1. App opens without crash.
2. Virelle connection button works.
3. Login button opens Virelle login.
4. Join Creator opens Virelle registration.
5. Broadcast / Render opens the Virelle premium page.
6. `/api/health` works.
7. `/api/mobile/features` works.
8. App only shows full connection when BYOK premium-video flags are present.

## Required Virelle flags

```text
creatorUpgrade = true
swappysStudio = true
watermarkControls = true
byokVideoRequired = true
```

## Upgrade path

Swappys Mobile remains the entry app.
Virelle Creator is the premium Broadcast / Studio Render upgrade.
Premium video work must stay BYOK-only.

## Important

No platform-funded provider usage in premium Virelle video.
No raw stream key storage.
No claim of full broadcast until RTMP/WebRTC/OBS is actually implemented and tested.
