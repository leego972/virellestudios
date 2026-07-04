# Virelle Growth Autopilot — YouTube Safe Patch

## Purpose

Adds an internal Virelle Growth Autopilot controlled by the Director's Assistant layer. It generates weekly content, SEO metadata, video assets, thumbnails, and YouTube submissions for the approved Virelle ecosystem brands:

- Virelle Studios
- Swappys
- VIBA / SiteCheck

The feature excludes Snapchat and TikTok at launch.

## Safety approach

This patch is intentionally isolated.

- No public user flow was changed.
- No production route was removed.
- No login/password automation was added.
- YouTube uses OAuth only.
- The existing `server/_core/index.ts` bootstrap was not modified.
- The worker is wired through the existing YouTube router that is already registered by Virelle.
- Admin-only status/control routes are added under `/api/growth-autopilot/*`.
- The scheduler is idempotent and will not start twice in the same process.
- Runtime DB state uses a best-effort `CREATE TABLE IF NOT EXISTS` and fails non-fatally if DB state cannot be persisted.

## Files added/changed

### Added

`server/virelle-growth-autopilot.ts`

Responsibilities:

- Weekly scheduling.
- Director's Assistant growth planning for Virelle, Swappys, and VIBA.
- SEO pack generation for YouTube titles, descriptions, tags, hashtags, CTA, and funnel links.
- Video generation through the existing BYOK/Pollinations-capable video engine.
- Thumbnail generation through the existing image generation helper.
- YouTube upload through Google OAuth and the existing `googleapis` dependency.
- Admin-only status, start, stop, and run-now routes.

### Changed

`server/youtube-oauth-router.ts`

Changes:

- Imports the Growth Autopilot module.
- Registers admin-only Growth Autopilot routes.
- Starts the Growth Autopilot scheduler after YouTube routes are registered.
- Keeps YouTube OAuth as the only auth mechanism.
- Fixes the OAuth state cookie maxAge to 10 minutes.

## Admin routes

- `GET /api/growth-autopilot/status`
- `POST /api/growth-autopilot/run-now`
- `POST /api/growth-autopilot/start`
- `POST /api/growth-autopilot/stop`

All routes require `requireAdminExpress`.

## Required Railway variables

Minimum for YouTube posting:

```env
YOUTUBE_CLIENT_ID=...
YOUTUBE_CLIENT_SECRET=...
YOUTUBE_REFRESH_TOKEN=...
```

Recommended:

```env
GROWTH_AUTOPILOT_YOUTUBE_ACCOUNT=studiosvirelle@gmail.com
VIRELLE_GROWTH_AUTOPILOT_ENABLED=true
GROWTH_AUTOPILOT_YOUTUBE_PRIVACY=public
GROWTH_AUTOPILOT_WEEKLY_VIDEO_COUNT=1
```

Optional funnel overrides:

```env
GROWTH_FUNNEL_VIRELLE_URL=https://virelle.life
GROWTH_FUNNEL_SWAPPYS_URL=https://virelle.life/swappys
GROWTH_FUNNEL_VIBA_URL=https://virelle.life/sitecheck
```

Optional video provider setting:

```env
GROWTH_AUTOPILOT_VIDEO_PROVIDER=pollinations
POLLINATIONS_API_KEY=...
```

## Behaviour

Default behaviour:

- Starts automatically unless `VIRELLE_GROWTH_AUTOPILOT_ENABLED=false`.
- First check runs after 20 minutes by default.
- Scheduler checks every 6 hours.
- It will only run a full generation cycle once per weekly interval unless triggered manually by admin.
- It creates one idea for each approved brand each cycle.
- It publishes the highest-scoring idea by default.
- It skips YouTube submission when OAuth or video generation is unavailable, without crashing the server.

## Rollback

To disable without code rollback:

```env
VIRELLE_GROWTH_AUTOPILOT_ENABLED=false
```

To rollback code:

- Revert `server/youtube-oauth-router.ts` to the previous version.
- Remove `server/virelle-growth-autopilot.ts`.

## Important limits

This system does not copy/repost other creators' videos. It creates original content from Virelle/Swappys/VIBA brand context and publishes through OAuth. This avoids reused-content and copyright risk.
