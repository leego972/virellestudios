/**
   * Growth Router — VirÉlle Studios Zero-Budget Growth Engine v1
   *
   * Semi-autonomous advertising system operating at $0 ad spend.
   * All community posts (Reddit / Discord / Facebook / forums) are generated as
   * DRAFTS and require human approval before any publishing action.
   *
   * Implements spec: docs/VIRELLE_ZERO_BUDGET_GROWTH_ENGINE_V1.md
   *
   * Procedures
   * ──────────
   * PUBLIC  : logGrowthEvent       — UTM / conversion tracking from landing pages
   * ADMIN   : getDashboard         — overview stats
   * ADMIN   : createCampaign       — create a growth campaign
   * ADMIN   : listCampaigns        — list campaigns
   * ADMIN   : generateCampaignPack — AI generates 9-piece content pack per spec
   * ADMIN   : importAudienceCsv    — parse CSV, bulk-insert audience records
   * ADMIN   : listAudiences        — list audience records with filtering
   * ADMIN   : updateAudienceStatus — update status/score on audience record
   * ADMIN   : listAssets           — list content assets with status filter
   * ADMIN   : approveAsset         — approve or reject a draft asset
   * ADMIN   : bulkApprove          — bulk approve / reject selected assets
   * ADMIN   : markPublished        — mark an approved asset as published
   * ADMIN   : getAnalytics         — breakdown of events / conversions
   * ADMIN   : getWeeklyReport      — generate weekly performance summary
   * ADMIN   : exportPlatformAssets — platform-specific formatted export (TikTok/YouTube/Instagram/LinkedIn/X/Reddit/email)
   */

  import { z } from "zod";
  import { router, adminProcedure, publicProcedure } from "./_core/trpc";
  import { getDb } from "./db";
  import {
    growthAudiences,
    growthCampaigns,
    growthAssets,
    growthEvents,
  } from "../drizzle/schema_additions";
  import { eq, desc, and, gte, sql, count, like, inArray, or } from "drizzle-orm";
  import { invokeLLM } from "./_core/llm";
  import { logger } from "./_core/logger";

  // ─── Constants ────────────────────────────────────────────────────────────────

  const SEGMENTS = ["artists", "filmmakers", "agencies", "small_business", "creators", "game_dev"] as const;
  type Segment = typeof SEGMENTS[number];

  const SEGMENT_LABELS: Record<Segment, string> = {
    artists:        "Music Artists & Visual Artists",
    filmmakers:     "Indie Filmmakers",
    agencies:       "Creative Agencies",
    small_business: "Small Businesses",
    creators:       "Creators & YouTubers",
    game_dev:       "Game Developers",
  };

  const CHANNELS = [
    "tiktok", "youtube_shorts", "instagram", "x", "linkedin",
    "reddit", "product_hunt", "indie_hackers", "email", "discord",
  ] as const;

  const AUDIENCE_STATUSES = ["discovered", "reviewed", "queued", "engaged", "converted", "archived"] as const;

  // ─── UTM URL builder ──────────────────────────────────────────────────────────

  function buildUtmUrl(path: string, params: { source: string; medium: string; campaign: string; content?: string }): string {
    const base = "https://virelle.life";
    const url = new URL(`${base}${path.startsWith("/") ? path : "/" + path}`);
    url.searchParams.set("utm_source", params.source);
    url.searchParams.set("utm_medium", params.medium);
    url.searchParams.set("utm_campaign", params.campaign);
    if (params.content) url.searchParams.set("utm_content", params.content);
    return url.toString();
  }

  // ─── Platform-specific content formatter ─────────────────────────────────────

  interface FormattedAsset {
    platform: string;
    title: string;
    body: string;
    charCount: number;
    utmUrl: string;
    copyInstructions: string;
    exportFormat: string;
  }

  function formatForPlatform(asset: any): FormattedAsset {
    const { platform, title, headline, body, utmUrl, assetType } = asset;
    const pl = (platform ?? "").toLowerCase();

    const formats: Record<string, { limit: number; instructions: string; fmt: string }> = {
      tiktok:          { limit: 2200, instructions: "Copy caption → paste into TikTok caption field when uploading video. Add relevant hashtags from the body.", fmt: "TikTok Caption" },
      youtube_shorts:  { limit: 5000, instructions: "Copy as YouTube Short description. Pin the CTA link as a comment.", fmt: "YouTube Short Description" },
      instagram:       { limit: 2200, instructions: "Copy caption → paste into Instagram caption. Story: use headline as sticker text.", fmt: "Instagram Caption" },
      x:               { limit: 280,  instructions: "Post as a single tweet or start a thread. UTM link goes in last tweet.", fmt: "X / Twitter Post" },
      linkedin:        { limit: 3000, instructions: "Post as LinkedIn article update. Professional tone, no hashtag spam.", fmt: "LinkedIn Post" },
      reddit:          { limit: 40000, instructions: "DRAFT ONLY — human must review before posting. Post in relevant subreddit with value-first framing. Do not self-promote in the title.", fmt: "Reddit Draft Post" },
      product_hunt:    { limit: 10000, instructions: "MANUAL — use as Product Hunt launch tagline + description draft. Human review required.", fmt: "Product Hunt Launch Copy" },
      indie_hackers:   { limit: 10000, instructions: "DRAFT — post as Indie Hackers milestone or build-in-public update. Add metrics if available.", fmt: "Indie Hackers Post Draft" },
      email:           { limit: 100000, instructions: "Use as newsletter or outreach email template. Personalise [NAME] and [ORGANISATION] before sending.", fmt: "Email / Newsletter Template" },
      discord:         { limit: 2000, instructions: "DRAFT ONLY — human must review before posting in any Discord server. Value-first, no spamming.", fmt: "Discord Message Draft" },
    };

    const cfg = formats[pl] ?? { limit: 5000, instructions: "Copy and post manually.", fmt: "Generic Copy" };
    const fullBody = [headline, body].filter(Boolean).join("\n\n");
    const truncated = cfg.limit > 0 ? fullBody.slice(0, cfg.limit) : fullBody;

    return {
      platform: pl,
      title: title ?? headline ?? "Untitled",
      body: truncated,
      charCount: truncated.length,
      utmUrl: utmUrl ?? "",
      copyInstructions: cfg.instructions,
      exportFormat: cfg.fmt,
    };
  }

  // ─── AI campaign pack generator ───────────────────────────────────────────────

  async function generateAiCampaignPack(campaign: {
    name: string;
    segment: Segment;
    objective: string;
    channels: string[];
  }): Promise<Array<{
    platform: string; assetType: string; title: string; headline: string;
    body: string; visualPrompt: string; utmUrl: string; qualityScore: number;
  }>> {
    const segLabel = SEGMENT_LABELS[campaign.segment] ?? campaign.segment;
    const slug = campaign.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

    const systemPrompt = `You are a zero-budget organic growth specialist for Virelle Studios, an AI-native film production platform at https://virelle.life.
  Virelle helps creators produce AI-generated films, ads, and trailers with cinema-grade visuals through a single browser workflow.
  Primary value claim: Virelle helps users reduce early-stage video production and concepting costs by 60-90%.
  Safety rules: all community posts are DRAFT only — human approval required before publishing. Never spam. Always disclose Virelle identity. Never auto-send cold outreach.`;

    const userPrompt = `Create a 9-piece campaign content pack for the segment: "${segLabel}"
  Campaign: ${campaign.name} | Objective: ${campaign.objective}
  Active channels: ${campaign.channels.join(", ")}

  Generate exactly 9 content pieces following this structure (spec-required):
  1. Short-form caption #1 (tiktok or instagram)
  2. Short-form caption #2 (youtube_shorts or instagram)
  3. Short-form caption #3 (x / twitter, max 280 chars)
  4. LinkedIn post (professional ROI angle, 300-500 words)
  5. X / Twitter thread starter (hook + 3 tweet continuation)
  6. Reddit feedback draft (value-first, no overt promotion, DRAFT status)
  7. Newsletter email template (personalise [NAME], [ORGANISATION])
  8. Landing-page CTA variant (headline + sub-headline + button copy)
  9. Video prompt idea (AI generation brief, 100-200 words)

  Then add 21 more pieces freely split across: ${campaign.channels.join(", ")}

  Total: 30 pieces. Return as JSON array. Each item:
  {
    "platform": string,
    "asset_type": "post" | "comment" | "thread" | "newsletter" | "cta_variant" | "video_prompt" | "story" | "reel",
    "title": string (max 80 chars, internal label),
    "headline": string (max 120 chars, public headline),
    "body": string (full content for the platform),
    "visual_prompt": string (image/video generation prompt, or "" if text-only),
    "quality_score": integer 1-100
  }

  Make content feel native to each platform. Content must be authentic, helpful, and clearly from Virelle.
  Community posts (reddit, discord) must be clearly marked as VALUE-FIRST with no overt promotion.
  Return only the raw JSON array, no markdown fences.`;

    try {
      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user",   content: userPrompt },
        ],
        model: "gpt-4o",
        temperature: 0.8,
        max_tokens: 12000,
      });

      const raw = typeof response === "string" ? response : (response as any).content ?? JSON.stringify(response);
      const cleaned = raw.replace(/```json\n?/g, "").replace(/```/g, "").trim();
      const pieces = JSON.parse(cleaned);

      return pieces.map((p: any, i: number) => ({
        platform:     String(p.platform || campaign.channels[i % campaign.channels.length]).toLowerCase(),
        assetType:    String(p.asset_type || "post"),
        title:        String(p.title || p.headline || `Asset ${i + 1}`),
        headline:     String(p.headline || ""),
        body:         String(p.body || ""),
        visualPrompt: String(p.visual_prompt || ""),
        utmUrl:       buildUtmUrl("/register", {
          source:   String(p.platform || campaign.channels[i % campaign.channels.length]),
          medium:   "organic",
          campaign: slug,
          content:  String(i + 1),
        }),
        qualityScore: Math.min(100, Math.max(1, Number(p.quality_score) || 65)),
      }));
    } catch (err) {
      logger.error("[GrowthRouter] generateAiCampaignPack failed:", err);
      throw err;
    }
  }

  // ─── CSV parser ───────────────────────────────────────────────────────────────

  function parseCsv(csv: string): Array<Record<string, string>> {
    const lines = csv.split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map((h: string) => h.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_"));
    return lines.slice(1).map((line: string) => {
      const values = line.split(",").map((v: string) => v.trim().replace(/^"|"$/g, ""));
      const row: Record<string, string> = {};
      headers.forEach((h: string, i: number) => { row[h] = values[i] ?? ""; });
      return row;
    }).filter((r: Record<string, string>) => r.email || r.name || r.organisation || r.website);
  }

  // ─── Router ───────────────────────────────────────────────────────────────────

  export const growthRouter = router({

    // ══════════════════════════════════════════════════════════════════════════
    // PUBLIC — UTM / conversion tracking (no auth required)
    // ══════════════════════════════════════════════════════════════════════════

    logGrowthEvent: publicProcedure
      .input(z.object({
        eventType:   z.string().max(64),
        segment:     z.string().max(64).optional(),
        source:      z.string().max(128).optional(),
        utmMedium:   z.string().max(128).optional(),
        utmCampaign: z.string().max(128).optional(),
        utmContent:  z.string().max(128).optional(),
        utmTerm:     z.string().max(128).optional(),
        page:        z.string().max(255).optional(),
        referrer:    z.string().max(1024).optional(),
        audienceId:  z.number().int().optional(),
        assetId:     z.number().int().optional(),
        campaignId:  z.number().int().optional(),
        metadata:    z.record(z.unknown()).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        await db.insert(growthEvents).values({
          eventType:   input.eventType,
          segment:     input.segment ?? null,
          source:      input.source ?? null,
          utmMedium:   input.utmMedium ?? null,
          utmCampaign: input.utmCampaign ?? null,
          utmContent:  input.utmContent ?? null,
          utmTerm:     input.utmTerm ?? null,
          page:        input.page ?? null,
          referrer:    input.referrer?.slice(0, 1024) ?? null,
          userId:      (ctx.user as any)?.id ?? null,
          audienceId:  input.audienceId ?? null,
          assetId:     input.assetId ?? null,
          campaignId:  input.campaignId ?? null,
          metadata:    input.metadata ?? null,
          ip:          null,
        });
        return { ok: true };
      }),

    // ══════════════════════════════════════════════════════════════════════════
    // ADMIN — Dashboard overview
    // ══════════════════════════════════════════════════════════════════════════

    getDashboard: adminProcedure.query(async () => {
      const db = await getDb();
      const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const [[campaignStats], [audienceStats], [assetStats], [draftAssets], [eventStats],
             [signupEvents], assetsBySegment, eventsByType, recentEvents] = await Promise.all([
        db.select({ total: count() }).from(growthCampaigns),
        db.select({ total: count() }).from(growthAudiences),
        db.select({ total: count() }).from(growthAssets),
        db.select({ total: count() }).from(growthAssets).where(eq(growthAssets.status, "draft")),
        db.select({ total: count() }).from(growthEvents).where(gte(growthEvents.createdAt, since30d)),
        db.select({ total: count() }).from(growthEvents).where(and(eq(growthEvents.eventType, "signup"), gte(growthEvents.createdAt, since30d))),
        db.select({ segment: growthAssets.segment, total: count() }).from(growthAssets).groupBy(growthAssets.segment),
        db.select({ eventType: growthEvents.eventType, total: count() }).from(growthEvents).where(gte(growthEvents.createdAt, since30d)).groupBy(growthEvents.eventType),
        db.select().from(growthEvents).orderBy(desc(growthEvents.createdAt)).limit(10),
      ]);

      return {
        campaigns:    Number(campaignStats?.total ?? 0),
        audiences:    Number(audienceStats?.total ?? 0),
        assets:       Number(assetStats?.total ?? 0),
        draftAssets:  Number(draftAssets?.total ?? 0),
        events30d:    Number(eventStats?.total ?? 0),
        signups30d:   Number(signupEvents?.total ?? 0),
        adSpend:      0,
        assetsBySegment,
        eventsByType,
        recentEvents,
      };
    }),

    // ══════════════════════════════════════════════════════════════════════════
    // ADMIN — Campaigns
    // ══════════════════════════════════════════════════════════════════════════

    createCampaign: adminProcedure
      .input(z.object({
        name:      z.string().min(2).max(255),
        segment:   z.enum(SEGMENTS),
        objective: z.string().min(2).max(255),
        offer:     z.string().max(500).optional(),
        cta:       z.string().max(255).optional(),
        channels:  z.array(z.enum(CHANNELS)).min(1),
        startDate: z.string().optional(),
        endDate:   z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        const [result] = await db.insert(growthCampaigns).values({
          name:      input.name,
          segment:   input.segment,
          objective: input.objective,
          offer:     input.offer ?? null,
          cta:       input.cta ?? null,
          channels:  input.channels,
          status:    "draft",
          adSpend:   0,
          startDate: input.startDate ? new Date(input.startDate) : null,
          endDate:   input.endDate   ? new Date(input.endDate)   : null,
          metrics:   { impressions: 0, clicks: 0, signups: 0, conversions: 0 },
        });
        return { id: (result as any).insertId };
      }),

    listCampaigns: adminProcedure
      .input(z.object({
        status:  z.string().optional(),
        segment: z.string().optional(),
        limit:   z.number().min(1).max(100).default(50),
        offset:  z.number().min(0).default(0),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        const conditions = [];
        if (input.status)  conditions.push(eq(growthCampaigns.status, input.status));
        if (input.segment) conditions.push(eq(growthCampaigns.segment, input.segment));

        const rows = await db.select().from(growthCampaigns)
          .where(conditions.length ? and(...conditions) : undefined)
          .orderBy(desc(growthCampaigns.createdAt))
          .limit(input.limit)
          .offset(input.offset);

        return rows;
      }),

    /**
     * Generate a 30-piece content pack (9 required by spec + 21 platform-specific).
     * All pieces land as status="draft" — human approval required before publish.
     * Ad spend = $0.
     */
    generateCampaignPack: adminProcedure
      .input(z.object({ campaignId: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        const db = await getDb();

        const [campaign] = await db.select().from(growthCampaigns).where(eq(growthCampaigns.id, input.campaignId));
        if (!campaign) throw new Error("Campaign not found");

        const channels = (campaign.channels as string[]) ?? ["linkedin", "tiktok", "instagram"];
        const pieces = await generateAiCampaignPack({
          name:      campaign.name,
          segment:   campaign.segment as Segment,
          objective: campaign.objective,
          channels,
        });

        const insertedIds: number[] = [];
        for (const piece of pieces) {
          const [r] = await db.insert(growthAssets).values({
            campaignId:   input.campaignId,
            segment:      campaign.segment,
            platform:     piece.platform,
            assetType:    piece.assetType,
            title:        piece.title,
            headline:     piece.headline,
            body:         piece.body,
            visualPrompt: piece.visualPrompt || null,
            utmUrl:       piece.utmUrl,
            status:       "draft",
            qualityScore: piece.qualityScore,
          });
          insertedIds.push((r as any).insertId);
        }

        await db.update(growthCampaigns)
          .set({ status: "active", packIdeas: pieces.map((p) => p.title || p.headline) })
          .where(eq(growthCampaigns.id, input.campaignId));

        logger.info(`[GrowthRouter] Generated ${insertedIds.length} draft assets for campaign ${input.campaignId}`);
        return { generated: insertedIds.length, campaignId: input.campaignId };
      }),

    // ══════════════════════════════════════════════════════════════════════════
    // ADMIN — Audiences
    // ══════════════════════════════════════════════════════════════════════════

    importAudienceCsv: adminProcedure
      .input(z.object({
        csvContent: z.string().min(1),
        segment:    z.enum(SEGMENTS),
        source:     z.string().max(128).default("csv"),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        const rows = parseCsv(input.csvContent);
        if (!rows.length) return { imported: 0 };

        let imported = 0;
        for (const row of rows) {
          try {
            await db.insert(growthAudiences).values({
              segment:          input.segment,
              name:             row.name || row.full_name || null,
              organisation:     row.organisation || row.organization || row.company || null,
              website:          row.website || row.url || null,
              publicProfileUrl: row.public_profile_url || row.profile_url || row.linkedin || null,
              country:          row.country || null,
              email:            row.email || null,
              source:           input.source,
              utmSource:        row.utm_source || null,
              utmMedium:        row.utm_medium || null,
              utmCampaign:      row.utm_campaign || null,
              score:            0,
              status:           "discovered",
            });
            imported++;
          } catch {
            // skip duplicates / invalid rows silently
          }
        }
        return { imported };
      }),

    listAudiences: adminProcedure
      .input(z.object({
        segment: z.string().optional(),
        status:  z.string().optional(),
        search:  z.string().max(255).optional(),
        limit:   z.number().min(1).max(200).default(50),
        offset:  z.number().min(0).default(0),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        const conditions = [];
        if (input.segment) conditions.push(eq(growthAudiences.segment, input.segment));
        if (input.status)  conditions.push(eq(growthAudiences.status, input.status));
        if (input.search) {
          const q = `%${input.search}%`;
          conditions.push(
            or(
              like(growthAudiences.name, q),
              like(growthAudiences.organisation, q),
              like(growthAudiences.email, q),
              like(growthAudiences.website, q),
            )!
          );
        }

        const rows = await db.select().from(growthAudiences)
          .where(conditions.length ? and(...conditions) : undefined)
          .orderBy(desc(growthAudiences.score), desc(growthAudiences.createdAt))
          .limit(input.limit)
          .offset(input.offset);

        const [[total]] = [await db.select({ total: count() }).from(growthAudiences)
          .where(conditions.length ? and(...conditions) : undefined)];

        return { rows, total: Number(total?.total ?? 0) };
      }),

    updateAudienceStatus: adminProcedure
      .input(z.object({
        id:     z.number().int().positive(),
        status: z.enum(AUDIENCE_STATUSES).optional(),
        score:  z.number().int().min(0).max(100).optional(),
        notes:  z.string().max(2048).optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        const update: Record<string, unknown> = {};
        if (input.status !== undefined) update.status = input.status;
        if (input.score  !== undefined) update.score  = input.score;
        if (input.notes  !== undefined) update.notes  = input.notes;
        await db.update(growthAudiences).set(update).where(eq(growthAudiences.id, input.id));
        return { ok: true };
      }),

    // ══════════════════════════════════════════════════════════════════════════
    // ADMIN — Assets (Approval Queue)
    // ══════════════════════════════════════════════════════════════════════════

    listAssets: adminProcedure
      .input(z.object({
        status:     z.string().optional(),
        platform:   z.string().optional(),
        segment:    z.string().optional(),
        campaignId: z.number().int().optional(),
        limit:      z.number().min(1).max(100).default(50),
        offset:     z.number().min(0).default(0),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        const conditions = [];
        if (input.status)     conditions.push(eq(growthAssets.status, input.status));
        if (input.platform)   conditions.push(eq(growthAssets.platform, input.platform));
        if (input.segment)    conditions.push(eq(growthAssets.segment, input.segment));
        if (input.campaignId) conditions.push(eq(growthAssets.campaignId, input.campaignId));

        const rows = await db.select().from(growthAssets)
          .where(conditions.length ? and(...conditions) : undefined)
          .orderBy(desc(growthAssets.qualityScore), desc(growthAssets.createdAt))
          .limit(input.limit)
          .offset(input.offset);

        const [[total]] = [await db.select({ total: count() }).from(growthAssets)
          .where(conditions.length ? and(...conditions) : undefined)];

        return { rows, total: Number(total?.total ?? 0) };
      }),

    approveAsset: adminProcedure
      .input(z.object({
        id:            z.number().int().positive(),
        decision:      z.enum(["approved", "rejected"]),
        rejectionNote: z.string().max(1024).optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        await db.update(growthAssets)
          .set({
            status:        input.decision,
            rejectionNote: input.decision === "rejected" ? (input.rejectionNote ?? null) : null,
          })
          .where(eq(growthAssets.id, input.id));
        return { ok: true };
      }),

    bulkApprove: adminProcedure
      .input(z.object({
        ids:      z.array(z.number().int().positive()).min(1).max(100),
        decision: z.enum(["approved", "rejected"]),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        await db.update(growthAssets)
          .set({ status: input.decision })
          .where(inArray(growthAssets.id, input.ids));
        return { updated: input.ids.length };
      }),

    markPublished: adminProcedure
      .input(z.object({
        id:           z.number().int().positive(),
        publishedUrl: z.string().url().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        await db.update(growthAssets)
          .set({ status: "published", publishedAt: new Date(), publishedUrl: input.publishedUrl ?? null })
          .where(eq(growthAssets.id, input.id));
        return { ok: true };
      }),

    // ══════════════════════════════════════════════════════════════════════════
    // ADMIN — Analytics
    // ══════════════════════════════════════════════════════════════════════════

    getAnalytics: adminProcedure
      .input(z.object({ days: z.number().min(1).max(365).default(30) }))
      .query(async ({ input }) => {
        const db = await getDb();
        const since = new Date(Date.now() - input.days * 24 * 60 * 60 * 1000);

        const [eventsByType, eventsBySource, eventsBySegment, eventsByDay, assetsByStatus] = await Promise.all([
          db.select({ eventType: growthEvents.eventType, total: count() }).from(growthEvents).where(gte(growthEvents.createdAt, since)).groupBy(growthEvents.eventType),
          db.select({ source: growthEvents.source, total: count() }).from(growthEvents).where(gte(growthEvents.createdAt, since)).groupBy(growthEvents.source),
          db.select({ segment: growthEvents.segment, total: count() }).from(growthEvents).where(gte(growthEvents.createdAt, since)).groupBy(growthEvents.segment),
          db.select({ day: sql<string>`DATE(created_at)`, total: count() }).from(growthEvents).where(gte(growthEvents.createdAt, since)).groupBy(sql`DATE(created_at)`).orderBy(sql`DATE(created_at)`),
          db.select({ status: growthAssets.status, total: count() }).from(growthAssets).groupBy(growthAssets.status),
        ]);

        return { eventsByType, eventsBySource, eventsBySegment, eventsByDay, assetsByStatus };
      }),

    // ══════════════════════════════════════════════════════════════════════════
    // ADMIN — Weekly Report
    // ══════════════════════════════════════════════════════════════════════════

    getWeeklyReport: adminProcedure.query(async () => {
      const db = await getDb();
      const since7d  = new Date(Date.now() -  7 * 24 * 60 * 60 * 1000);
      const since14d = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

      const [[tw], [lw], [tws], [lws], [published], [drafted], [approved]] = await Promise.all([
        db.select({ total: count() }).from(growthEvents).where(gte(growthEvents.createdAt, since7d)),
        db.select({ total: count() }).from(growthEvents).where(and(gte(growthEvents.createdAt, since14d), sql`created_at < ${since7d}`)),
        db.select({ total: count() }).from(growthEvents).where(and(eq(growthEvents.eventType, "signup"), gte(growthEvents.createdAt, since7d))),
        db.select({ total: count() }).from(growthEvents).where(and(eq(growthEvents.eventType, "signup"), gte(growthEvents.createdAt, since14d), sql`created_at < ${since7d}`)),
        db.select({ total: count() }).from(growthAssets).where(eq(growthAssets.status, "published")),
        db.select({ total: count() }).from(growthAssets).where(eq(growthAssets.status, "draft")),
        db.select({ total: count() }).from(growthAssets).where(eq(growthAssets.status, "approved")),
      ]);

      const evT = Number(tw?.total ?? 0), evL = Number(lw?.total ?? 0);
      const sgT = Number(tws?.total ?? 0), sgL = Number(lws?.total ?? 0);

      const topSources = await db.select({ source: growthEvents.source, total: count() }).from(growthEvents).where(gte(growthEvents.createdAt, since7d)).groupBy(growthEvents.source).orderBy(desc(count())).limit(5);
      const topSegments = await db.select({ segment: growthEvents.segment, total: count() }).from(growthEvents).where(gte(growthEvents.createdAt, since7d)).groupBy(growthEvents.segment).orderBy(desc(count())).limit(5);

      return {
        adSpend: 0,
        period: { from: since7d.toISOString().split("T")[0], to: new Date().toISOString().split("T")[0] },
        events:  { thisWeek: evT, lastWeek: evL, wow: evL > 0 ? Math.round(((evT - evL) / evL) * 100) : null },
        signups: { thisWeek: sgT, lastWeek: sgL, wow: sgL > 0 ? Math.round(((sgT - sgL) / sgL) * 100) : null },
        assets:  { published: Number(published?.total ?? 0), approved: Number(approved?.total ?? 0), draft: Number(drafted?.total ?? 0) },
        topSources,
        topSegments,
      };
    }),

    // ══════════════════════════════════════════════════════════════════════════
    // ADMIN — Platform-specific export
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * Export approved assets formatted for a specific platform.
     * Supported: tiktok | youtube_shorts | instagram | x | linkedin | reddit | email | product_hunt | indie_hackers | discord
     * Format includes platform character limits, posting instructions, and copy-ready text.
     */
    exportPlatformAssets: adminProcedure
      .input(z.object({
        platform:  z.string().max(64).optional(),
        status:    z.string().max(32).default("approved"),
        campaignId: z.number().int().optional(),
        format:    z.enum(["json", "csv", "text"]).default("json"),
        limit:     z.number().min(1).max(200).default(100),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        const conditions = [eq(growthAssets.status, input.status)];
        if (input.platform)   conditions.push(eq(growthAssets.platform, input.platform));
        if (input.campaignId) conditions.push(eq(growthAssets.campaignId, input.campaignId));

        const rows = await db.select().from(growthAssets)
          .where(and(...conditions))
          .orderBy(desc(growthAssets.qualityScore))
          .limit(input.limit);

        const formatted = rows.map((r) => formatForPlatform(r));

        if (input.format === "text") {
          const text = formatted.map((f, i) =>
            `=== Asset ${i + 1}: ${f.title} ===\n` +
            `Platform: ${f.platform.toUpperCase()} | Format: ${f.exportFormat} | ${f.charCount} chars\n` +
            `Instructions: ${f.copyInstructions}\n` +
            `CTA URL: ${f.utmUrl}\n\n` +
            f.body + `\n\n` +
            `────────────────────────────────────────────────────────────\n`
          ).join("\n");
          return { format: "text", data: text, count: rows.length };
        }

        if (input.format === "csv") {
          const headers = ["id", "platform", "exportFormat", "title", "body", "charCount", "utmUrl", "copyInstructions"];
          const csv = [
            headers.join(","),
            ...formatted.map((f, i) => headers.map((h) => {
              const val = String((h === "id" ? rows[i]?.id : (f as any)[h]) ?? "").replace(/"/g, '""');
              return `"${val}"`;
            }).join(",")),
          ].join("\n");
          return { format: "csv", data: csv, count: rows.length };
        }

        return { format: "json", data: formatted.map((f, i) => ({ ...f, id: rows[i]?.id })), count: rows.length };
      }),
  });
  