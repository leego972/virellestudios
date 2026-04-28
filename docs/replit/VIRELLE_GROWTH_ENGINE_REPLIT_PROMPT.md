# Replit Prompt: Finish Virelle Zero-Budget Growth Engine

You are working inside the existing Virelle Studios repository.

## Goal

Finish the zero-budget growth system for Virelle Studios using the existing architecture. Prefer reusing existing marketing files before creating new duplicate modules.

Relevant existing files found in the repo:

- `server/advertising-router.ts`
- `server/advertising-orchestrator.ts`
- `server/marketing-engine.ts`
- `server/marketing-router.ts`
- `server/tiktok-content-service.ts`
- `server/content-creator-engine.ts`
- `server/content-creator-router.ts`
- `server/seo-engine.ts`
- `server/blog-router.ts`
- `server/mailing-list-router.ts`
- `drizzle/schema.ts`
- `server/db.ts`

Reference blueprint:

- `docs/VIRELLE_ZERO_BUDGET_GROWTH_ENGINE_V1.md`

## Guardrails

1. Keep advertising spend at zero by default.
2. Use a review-and-approval workflow for posts and audience communication drafts.
3. Community content should be prepared as drafts unless an official account integration is explicitly configured.
4. Use public and permission-safe audience information only.
5. Use existing app stack: React, Vite, Express, tRPC, Drizzle, MySQL, Tailwind, Recharts.
6. Avoid adding paid SaaS dependencies.
7. Keep generated copy honest and avoid overclaiming cost savings.

## Step 1: Audit existing marketing system

Inspect these files first:

- `server/advertising-router.ts`
- `server/advertising-orchestrator.ts`
- `server/marketing-engine.ts`
- `server/marketing-router.ts`
- `drizzle/schema.ts`
- `client/src`

Create a short implementation note answering:

- Which tables already exist?
- Which router procedures already exist?
- Which dashboard pages already exist?
- Which missing pieces are required?

Do not duplicate features already implemented.

## Step 2: Add missing data model only if needed

If equivalent tables do not exist, add tables for:

- growth audiences
- growth campaigns
- growth assets
- growth events

Prefer names that fit the current schema conventions.

Fields are specified in `docs/VIRELLE_ZERO_BUDGET_GROWTH_ENGINE_V1.md`.

## Step 3: Add or complete admin UI

Create or complete admin-only pages:

- `/admin/growth`
- `/admin/growth/campaigns`
- `/admin/growth/audiences`
- `/admin/growth/assets`
- `/admin/growth/analytics`

The dashboard should show:

- active campaigns
- content drafts
- approved assets
- published assets
- traffic/signups by UTM source
- best-performing segment
- best-performing platform
- recommended next action

## Step 4: Add campaign-pack generator

Add a backend procedure that generates a complete campaign pack for one segment.

Input:

- segment
- campaign goal
- offer
- call to action
- platform list

Output:

- short video script
- TikTok/Reels caption
- YouTube Shorts caption
- LinkedIn post
- X post/thread
- Reddit feedback draft
- SEO blog outline
- landing page hero copy
- 3 cinematic visual prompts

Store each generated item as a draft asset for approval.

## Step 5: Add public landing pages

Create these pages if missing:

- `/artists`
- `/filmmakers`
- `/agencies`
- `/small-business-video`
- `/creators`
- `/game-trailers`

Each page must include:

- segment-specific headline
- short explanation of Virelle
- capability list
- cost-saving section
- CTA: `See a 60-second demo`
- email capture form
- hidden UTM fields

## Step 6: Add UTM/event tracking

Track:

- landing page view
- email capture
- demo request
- signup click
- first project creation where available
- conversion where available

Minimum event fields:

- event type
- source
- medium
- campaign
- segment
- created at
- metadata JSON

## Step 7: Add export workflow

For every generated asset, add:

- copy to clipboard
- mark approved
- mark rejected
- mark published
- published URL field

## Step 8: Add weekly report

Create a weekly report generator that summarises:

- assets created
- assets published
- signups by source
- best segment
- best platform
- top content angle
- recommended next 5 actions

## Suggested default campaign segments

- music_artists
- indie_filmmakers
- creative_agencies
- small_businesses
- youtube_creators
- game_developers
- film_students
- nonprofit_organisations

## Suggested first campaign

Segment: music_artists
Goal: beta signups
Offer: free early access to create cinematic music video concepts
CTA: See a 60-second demo
Platforms: TikTok, Instagram Reels, YouTube Shorts, LinkedIn, X, Reddit draft

## Acceptance tests

- `pnpm check` passes
- `pnpm build` passes
- admin growth dashboard loads
- campaign pack can be generated and saved as drafts
- landing pages load publicly
- email capture logs an event
- default budget is zero
