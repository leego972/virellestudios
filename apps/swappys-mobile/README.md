# Swappys Mobile by Virelle Studios

Repository location:

```text
apps/swappys-mobile
```

## Current status

This folder gives Replit direct access to the Swappys Expo app package, Virelle connection shell, app config, and SVG logo.

The current GitHub-safe app shell includes:

- Expo React Native app
- WebView shell
- Virelle connection checker
- Virelle login button
- Virelle Creator upgrade button
- Broadcast / Render link
- Swappys by Virelle Studios SVG logo
- BYOK premium-video product copy

## Commands

From this folder:

```bash
npm install
npm run typecheck
npx expo config --type public
npx expo-doctor
npm start
```

## Virelle connection requirements

The app checks:

```text
https://virelle.life/api/health
https://virelle.life/api/mobile/features
```

The app should only treat Virelle as fully connected if `/api/mobile/features` returns:

```text
creatorUpgrade = true
swappysStudio = true
watermarkControls = true
byokVideoRequired = true
```

## Product split

Swappys Mobile:

- entry mobile app
- marked mobile output
- Virelle upgrade funnel

Virelle Creator:

- premium Broadcast Mode
- premium Studio Render Mode
- BYOK provider keys required
- audit/provenance
- watermark controls
- project workflow

## Do not change

Do not remove standalone mobile marking.
Do not add platform-funded provider usage.
Do not claim RTMP/WebRTC/OBS is complete unless actually implemented and tested.
Do not claim Studio Render is complete unless outputVideoUrl exists.
