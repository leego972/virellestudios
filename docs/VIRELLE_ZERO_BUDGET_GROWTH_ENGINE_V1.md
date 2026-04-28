# Virelle Studios Zero-Budget Growth Engine v1

Status: implementation blueprint and Replit handoff
Owner: Leego, Technology Partner
Website: https://Virelle.life
Contact: studiosvirelle@gmail.com

## Mission

Build a semi-autonomous growth system for Virelle Studios using free and low-cost organic channels. The system should generate campaign material, prepare public posts, track performance, support opt-in email/newsletter activity, and recommend the next best actions.

This is intentionally not a spam system. Human approval is required for community posts and direct messages. The strongest free growth loop is public proof: Virelle should advertise itself by showing high-quality cinematic outputs.

## Core positioning

Virelle Studios is an AI-native film production platform for artists, creators, filmmakers, agencies, brands, game teams, and organisations that need cinematic video concepts without traditional production overhead.

Primary value claim:

> Virelle helps users move from idea to script, voice, visual scenes, soundtrack, and assembled video concept through one browser-based workflow.

Cost-saving claim:

> Virelle can reduce early-stage video production and concepting costs by 60-90% depending on the project, mainly by reducing separate costs for scripting, storyboarding, voice, visual concepting, rough edits, and campaign mockups.

Do not claim Virelle replaces every professional production crew. The stronger claim is:

> Virelle helps users avoid spending thousands before they know whether a video concept works.

## Target segments

1. Music artists
   - Need: music videos, promo visuals, song teasers, album visuals
   - Hook: Create cinematic music video concepts without a production crew.
   - CTA: Join the artist beta.

2. Indie filmmakers
   - Need: proof-of-concept trailers, pitch scenes, mood reels
   - Hook: Pitch your film visually before you shoot it.
   - CTA: Watch the 60-second workflow demo.

3. Agencies
   - Need: campaign prototypes, client pitch mockups, ad concepts
   - Hook: Prototype video campaign ideas before production spend.
   - CTA: Request a demo.

4. Small businesses
   - Need: affordable product/service ads
   - Hook: Create cinematic ad concepts without agency-level production cost.
   - CTA: Try Virelle.

5. Creators and YouTubers
   - Need: cinematic shorts, intros, channel trailers, story clips
   - Hook: Turn video ideas into cinematic content faster.
   - CTA: Join creator beta.

6. Game developers
   - Need: lore trailers, cutscene concepts, world-building promos
   - Hook: Create cinematic game trailers and lore scenes with AI.
   - CTA: Request early access.

## Free channel matrix

| Channel | Use | Automation level | Notes |
|---|---|---:|---|
| TikTok | AI film demos, before/after clips | Queue + manual/API publish | Best visual discovery channel |
| YouTube Shorts | 30-60s workflow demos | Queue + manual/API publish | Use trailers, tips, prompt-to-result clips |
| Instagram Reels | Artist and creator discovery | Queue + manual publish | Focus on visuals and music artists |
| X/Twitter | AI video, founder build-in-public | Queue + manual/API publish | Use threads + clips |
| LinkedIn | Agencies, brands, organisations | Queue + manual publish | ROI and production cost angle |
| Reddit | Feedback and niche communities | Draft only | Never auto-post; value-first |
| Product Hunt | Major launches | Manual launch | Use only for meaningful product updates |
| Indie Hackers | Build-in-public | Draft + manual publish | Founder journey and revenue learning |
| Medium/Hashnode/dev.to | SEO articles | Draft + manual publish | Use canonical links where possible |
| Pinterest | Cinematic stills and mood boards | Queue + manual/API publish | Strong for visual discovery |
| Vimeo/Behance | Portfolio showcase | Manual publish | High-quality cinematic examples |
| Discord/Facebook groups | Community participation | Draft only | No automated posting |

## Autonomous loop

1. Pick a target segment.
2. Generate a campaign angle.
3. Generate content package:
   - 3 short-form post captions
   - 1 LinkedIn post
   - 1 X thread
   - 1 Reddit feedback draft
   - 1 newsletter/update email for opted-in users
   - 1 landing-page CTA variant
   - 3 video prompt ideas
4. Create or import audience records from permission-safe sources.
5. Score audience fit.
6. Queue assets for approval.
7. Record channel, campaign, and UTM source.
8. Track signups, beta requests, project creation, and conversions.
9. Double down on the top-performing segment/channel.

## Database tables to add or verify

```sql
CREATE TABLE growth_audiences (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  segment VARCHAR(64) NOT NULL,
  name VARCHAR(255),
  organisation VARCHAR(255),
  website VARCHAR(500),
  public_profile_url VARCHAR(500),
  source VARCHAR(128),
  country VARCHAR(128),
  score INT DEFAULT 0,
  status ENUM('discovered','reviewed','queued','engaged','converted','archived') DEFAULT 'discovered',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE growth_campaigns (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  segment VARCHAR(64) NOT NULL,
  offer VARCHAR(500),
  cta VARCHAR(255),
  status ENUM('draft','active','paused','completed') DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE growth_assets (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  campaign_id BIGINT,
  platform VARCHAR(64),
  asset_type VARCHAR(64),
  title VARCHAR(255),
  body TEXT,
  visual_prompt TEXT,
  status ENUM('draft','approved','published','rejected') DEFAULT 'draft',
  published_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  published_at TIMESTAMP NULL
);

CREATE TABLE growth_events (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  event_type VARCHAR(64) NOT NULL,
  source VARCHAR(128),
  campaign_id BIGINT,
  audience_id BIGINT,
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Audience scoring

Score from 0-100:

- +30 has public creative/video work
- +20 posts regularly or recently active
- +20 clear need for cinematic visuals
- +10 public brand fit
- +10 matches active campaign segment
- +10 has audience or commercial potential

Priority:

| Score | Action |
|---:|---|
| 80-100 | Personal review first |
| 60-79 | Add to content-targeting queue |
| 40-59 | Retarget through public content only |
| 0-39 | Ignore |

## Required app routes

Admin-only:

- `/admin/growth`
- `/admin/growth/campaigns`
- `/admin/growth/audiences`
- `/admin/growth/assets`
- `/admin/growth/analytics`

Public landing pages:

- `/artists`
- `/filmmakers`
- `/agencies`
- `/small-business-video`
- `/creators`
- `/game-trailers`

Each landing page needs:

- segment-specific headline
- one demo embed
- 3 use cases
- cost-saving statement
- beta CTA
- email capture
- UTM-aware tracking

## First 30 campaign ideas

1. Music artist: turn a song idea into a cinematic music video concept.
2. Indie filmmaker: pitch your film with an AI proof-of-concept trailer.
3. Agency: prototype three campaign directions before client production spend.
4. Small business: generate a cinematic product ad concept.
5. Creator: turn a story idea into a cinematic short.
6. Game developer: create a lore trailer for your game world.
7. Artist cost comparison: music video shoot vs AI visual concept.
8. Brand cost comparison: agency ad concept vs Virelle prototype.
9. Behind the scenes: prompt to cinematic trailer.
10. Before and after: rough idea to finished concept.
11. Virelle for album launches.
12. Virelle for crowdfunding videos.
13. Virelle for real estate brand films.
14. Virelle for fashion campaign mockups.
15. Virelle for restaurants and hospitality ads.
16. Virelle for gyms and personal brands.
17. Virelle for theatre trailers.
18. Virelle for book trailers.
19. Virelle for charity campaign videos.
20. Virelle for corporate training concepts.
21. Virelle for startup launch videos.
22. Virelle for film students.
23. Virelle for pitch decks.
24. Virelle for YouTube intros.
25. Virelle for short-form storytelling.
26. Virelle for music visualisers.
27. Virelle for documentary concept trailers.
28. Virelle for festival submissions.
29. Virelle for creative directors.
30. Virelle for production companies testing concepts.

## Safety and compliance rules

- Do not auto-send cold outreach.
- Do not auto-post to Reddit, Facebook groups, Discord communities, or forums.
- Do not collect private data.
- Use public and permission-safe information only.
- Track opt-outs for any email/newsletter workflow.
- Use honest claims only.
- Keep cost-saving language framed as early-stage/prototype savings unless verified with customer data.
- Always disclose Virelle identity in public-facing content.

## Replit handoff checklist

1. Wire tables into existing Drizzle schema or reuse existing marketing tables if already present.
2. Add tRPC procedures:
   - createCampaign
   - generateCampaignPack
   - importAudienceCsv
   - scoreAudience
   - approveAsset
   - markPublished
   - logGrowthEvent
   - getGrowthDashboard
3. Build admin pages for campaign, audience, asset, and analytics review.
4. Build public segment landing pages.
5. Add UTM tracking and hidden signup fields.
6. Add referral code capture.
7. Add export buttons for TikTok, YouTube Shorts, Instagram Reels, LinkedIn, X, Reddit, and newsletter.
8. Keep all community participation human-approved.

## Immediate manual workflow while build is unfinished

Daily:

1. Generate 3 short demo clips.
2. Post one to TikTok, Shorts, and Reels.
3. Post one professional cost-saving angle to LinkedIn.
4. Add 20 permission-safe audience records to the growth sheet.
5. Record replies, signups, and demo requests.

Weekly:

1. Publish one SEO article.
2. Add one new landing page.
3. Launch one community feedback post.
4. Review highest-converting segment.
5. Create next week’s content pack from best-performing angle.
