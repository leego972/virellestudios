# Virelle Studios Audit Notes

## Advertising Engine Issues
1. **URL is wrong**: `VIRELLE_INFO.url` = `https://virellestudios.com` but actual site is `https://virelle.life` — FIX
2. **In-memory campaign storage**: Campaigns stored in `Map()` — lost on every server restart. No DB table exists for campaigns.
3. **No actual posting**: Engine generates content but has no API integration to post. Content-generation only.
4. **No scheduling execution**: Campaign `schedule` field exists but no cron/timer executes scheduled posts.
5. **Sequential content generation**: `generateCampaignContent` generates one-by-one instead of parallel.
6. **Missing platforms**: No YouTube, TikTok, Instagram, Discord communities.
7. **Pricing in VIRELLE_INFO may drift**: Hardcoded instead of pulled from TIER_LIMITS.

## Server-Side Issues
8. **deleteProject incomplete cascade**: Only deletes scenes, characters, generationJobs. Missing: scripts, soundtracks, credits, locations, moodBoardItems, subtitles, dialogues, budgets, soundEffects, collaborators, movies, directorChats, visualEffects.
9. **deleteCharacter no userId check**: `deleteCharacter(id)` doesn't verify the user owns the character.
10. **Login brute-force pre-check logic**: `trackLoginAttempt(user.id, clientIP, false)` is called BEFORE checking password — this means every login attempt (even with correct password) is first tracked as failed. The `false` parameter should only be used after password check fails.

## Auth Flow — Confirmed Working
- Registration with fraud detection ✓
- Login with brute-force protection ✓ (but see #10 above)
- Password reset with email ✓
- Session cookie management ✓
- Admin role check ✓

## Subscription Flow — Confirmed Working
- 3-tier system (free/pro/industry) ✓
- Feature gating per tier ✓
- Stripe checkout/billing portal ✓
- Resource quota enforcement ✓

## Client-Side — To Check
- Routing in App.tsx
- All pages render correctly
- Error boundaries
- Mobile responsiveness
