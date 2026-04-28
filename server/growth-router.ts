/**
   * Growth Router — VirÉlle Studios Zero-Budget Growth Engine v1
   *
   * Semi-autonomous advertising system operating at $0 ad spend.
   * All community posts (Reddit / Discord / Facebook) are generated as
   * DRAFTS and require human approval before any publishing action.
   *
   * Procedures
   * ──────────
   * PUBLIC  : logGrowthEvent     — UTM / conversion tracking from landing pages
   * ADMIN   : getDashboard       — overview stats
   * ADMIN   : createCampaign     — create a new growth campaign
   * ADMIN   : listCampaigns      — list campaigns with filters
   * ADMIN   : generateCampaignPack — AI generates 30 draft content pieces
   * ADMIN   : importAudienceCsv  — parse CSV, bulk-insert audience records
   * ADMIN   : listAudiences      — list audience records
   * ADMIN   : scoreAudience      — update score for one audience record
   * ADMIN   : listAssets         — list content assets with status filter
   * ADMIN   : approveAsset       — approve or reject a draft asset
   * ADMIN   : markPublished      — mark an approved asset as published with URL
   * ADMIN   : getAnalytics       — breakdown of events / conversions
   * ADMIN   : getWeeklyReport    — generate a weekly performance summary
   * ADMIN   : exportAssets       — export approved assets as JSON/CSV
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

  // ─── Segment definitions ──────────────────────────────────────────────────────

  const SEGMENTS = ["artists", "filmmakers", "agencies", "small_business", "creators", "game_dev"] as const;
  type Segment = typeof SEGMENTS[number];

  const SEGMENT_LABELS: Record<Segment, string> = {
    artists:       "Visual Artists & Illustrators",
    filmmakers:    "Independent Filmmakers",
    agencies:      "Creative Agencies",
    small_business:"Small Business Video",
    creators:      "Content Creators & YouTubers",
    game_dev:      "Game Developers & Trailer Studios",
  };

  const CHANNELS = ["reddit", "discord", "facebook", "linkedin", "youtube_comments", "tiktok", "instagram", "email"] as const;

  // ─── UTM URL builder ──────────────────────────────────────────────────────────

  function buildUtmUrl(base: string, params: { source: string; medium: string; campaign: string; content?: string }): string {
    const url = new URL(base.startsWith("http") ? base : `https://virellestudios.com${base}`);
    url.searchParams.set("utm_source", params.source);
    url.searchParams.set("utm_medium", params.medium);
    url.searchParams.set("utm_campaign", params.campaign);
    if (params.content) url.searchParams.set("utm_content", params.content);
    return url.toString();
  }

  // ─── AI campaign pack generator ───────────────────────────────────────────────

  async function generateAiCampaignPack(campaign: {
    name: string;
    segment: Segment;
    objective: string;
    channels: string[];
  }): Promise<Array<{ platform: string; assetType: string; headline: string; body: string; imagePrompt: string; utmUrl: string; qualityScore: number }>> {
    const segLabel = SEGMENT_LABELS[campaign.segment] ?? campaign.segment;

    const systemPrompt = `You are a zero-budget organic growth specialist for VirÉlle Studios, an AI-powered movie production platform.
  Generate authentic, high-value community content that educates and helps — never spammy sales posts.
  VirÉlle Studios lets creators produce AI-generated films, ads, and trailers with cinema-grade visuals.
  Beta access is FREE. Always end posts with a soft CTA referencing the beta.`;

    const userPrompt = `Create a campaign content pack for the segment: "${segLabel}"
  Campaign name: ${campaign.name}
  Objective: ${campaign.objective}
  Channels to use: ${campaign.channels.join(", ")}

  Generate exactly 30 content pieces as a JSON array. Each item must have:
  {
    "platform": one of [${campaign.channels.map((c: string) => '"' + c + '"').join(", ")}],
    "asset_type": "post" | "comment" | "dm_template" | "story" | "reel" | "banner",
    "headline": string (max 120 chars),
    "body": string (full content, 100-800 chars depending on platform),
    "image_prompt": string (Stable Diffusion prompt for any visual, or "" if text-only),
    "utm_url": "/register?utm_source={platform}&utm_medium=organic&utm_campaign={campaign_slug}&utm_content={piece_number}",
    "quality_score": integer 1-100
  }

  Make content feel authentic to each platform. Reddit = detailed helpful post. Discord = conversational. LinkedIn = professional insight. TikTok = hook + script. Email = personalized outreach template.
  All posts are DRAFT status and will be reviewed by a human before publishing.
  Return only the raw JSON array, no markdown fences.`;

    try {
      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user",   content: userPrompt },
        ],
        model: "gpt-4o",
        temperature: 0.8,
        max_tokens: 8000,
      });

      const raw = typeof response === "string" ? response : (response as any).content ?? JSON.stringify(response);
      const cleaned = raw.replace(/```json\n?/g, "").replace(/```/g, "").trim();
      const pieces = JSON.parse(cleaned);
      const campaignSlug = campaign.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

      return pieces.map((p: any, i: number) => ({
        platform:     String(p.platform || campaign.channels[0]).toLowerCase(),
        assetType:    String(p.asset_type || "post"),
        headline:     String(p.headline || ""),
        body:         String(p.body || ""),
        imagePrompt:  String(p.image_prompt || ""),
        utmUrl:       buildUtmUrl("/register", {
          source:   String(p.platform || campaign.channels[0]),
          medium:   "organic",
          campaign: campaignSlug,
          content:  String(i + 1),
        }),
        qualityScore: Math.min(100, Math.max(1, Number(p.quality_score) || 60)),
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
    }).filter((r: Record<string, string>) => r.email || r.name);
  }

  // ─── Router ───────────────────────────────────────────────────────────────────

  export const growthRouter = router({

    // ══════════════════════════════════════════════════════════════════════════
    // PUBLIC — UTM / conversion tracking
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * Log a growth event from a landing page or any UTM link.
     * Public — no auth required. Rate-limited at the Express layer.
     */
    logGrowthEvent: publicProcedure
      .input(z.object({
        eventType:   z.string().max(64),
        segment:     z.string().max(64).optional(),
        utmSource:   z.string().max(128).optional(),
        utmMedium:   z.string().max(128).optional(),
        utmCampaign: z.string().max(128).optional(),
        utmContent:  z.string().max(128).optional(),
        utmTerm:     z.string().max(128).optional(),
        page:        z.string().max(255).optional(),
        referrer:    z.string().max(1024).optional(),
        assetId:     z.number().int().optional(),
        campaignId:  z.number().int().optional(),
        metadata:    z.record(z.unknown()).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        await db.insert(growthEvents).values({
          eventType:   input.eventType,
          segment:     input.segment ?? null,
          utmSource:   input.utmSource ?? null,
          utmMedium:   input.utmMedium ?? null,
          utmCampaign: input.utmCampaign ?? null,
          utmContent:  input.utmContent ?? null,
          utmTerm:     input.utmTerm ?? null,
          page:        input.page ?? null,
          referrer:    input.referrer?.slice(0, 1024) ?? null,
          userId:      ctx.user?.id ?? null,
          assetId:     input.assetId ?? null,
          campaignId:  input.campaignId ?? null,
          metadata:    input.metadata ?? null,
          ip:          null,
        });
        return { ok: true };
      }),

    // ══════════════════════════════════════════════════════════════════════════
    // ADMIN — Dashboard
    // ══════════════════════════════════════════════════════════════════════════

    getDashboard: adminProcedure.query(async () => {
      const db = await getDb();

      const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const [
        [campaignStats],
        [audienceStats],
        [assetStats],
        [pendingAssets],
        [eventStats],
        recentEvents,
      ] = await Promise.all([
        db.select({ total: count() }).from(growthCampaigns),
        db.select({ total: count() }).from(growthAudiences),
        db.select({ total: count() }).from(growthAssets),
        db.select({ total: count() }).from(growthAssets).where(eq(growthAssets.status, "pending")),
        db.select({ total: count() }).from(growthEvents).where(gte(growthEvents.createdAt, since30d)),
        db.select().from(growthEvents).orderBy(desc(growthEvents.createdAt)).limit(10),
      ]);

      // Signups from UTM events
      const [signupEvents] = await db
        .select({ total: count() })
        .from(growthEvents)
        .where(and(eq(growthEvents.eventType, "signup"), gte(growthEvents.createdAt, since30d)));

      // Assets by segment
      const assetsBySegment = await db
        .select({ segment: growthAssets.segment, total: count() })
        .from(growthAssets)
        .groupBy(growthAssets.segment);

      // Events by type
      const eventsByType = await db
        .select({ eventType: growthEvents.eventType, total: count() })
        .from(growthEvents)
        .where(gte(growthEvents.createdAt, since30d))
        .groupBy(growthEvents.eventType);

      return {
        campaigns:     Number(campaignStats?.total ?? 0),
        audiences:     Number(audienceStats?.total ?? 0),
        assets:        Number(assetStats?.total ?? 0),
        pendingAssets: Number(pendingAssets?.total ?? 0),
        events30d:     Number(eventStats?.total ?? 0),
        signups30d:    Number(signupEvents?.total ?? 0),
        adSpend:       0, // always zero
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
     * AI-powered — generates 30 draft content pieces for a campaign.
     * All pieces start as "pending" (require approval before publishing).
     * Ad spend stays $0.
     */
    generateCampaignPack: adminProcedure
      .input(z.object({
        campaignId: z.number().int().positive(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();

        const [campaign] = await db.select().from(growthCampaigns).where(eq(growthCampaigns.id, input.campaignId));
        if (!campaign) throw new Error("Campaign not found");

        const channels = (campaign.channels as string[]) ?? ["reddit", "discord"];
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
            headline:     piece.headline,
            body:         piece.body,
            imagePrompt:  piece.imagePrompt || null,
            utmUrl:       piece.utmUrl,
            status:       "pending",
            qualityScore: piece.qualityScore,
          });
          insertedIds.push((r as any).insertId);
        }

        // Update campaign to active
        await db.update(growthCampaigns)
          .set({ status: "active", packIdeas: pieces.map((p) => p.headline) })
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
        source:     z.string().max(64).default("csv"),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        const rows = parseCsv(input.csvContent);
        if (!rows.length) return { imported: 0 };

        let imported = 0;
        for (const row of rows) {
          try {
            await db.insert(growthAudiences).values({
              segment:     input.segment,
              name:        row.name || row.full_name || null,
              email:       row.email || null,
              company:     row.company || row.organization || null,
              source:      input.source,
              utmSource:   row.utm_source || null,
              utmMedium:   row.utm_medium || null,
              utmCampaign: row.utm_campaign || null,
              score:       0,
              status:      "new",
            });
            imported++;
          } catch {
            // skip duplicates / invalid rows
          }
        }
        return { imported };
      }),

    listAudiences: adminProcedure
      .input(z.object({
        segment: z.string().optional(),
        status:  z.string().optional(),
        search:  z.string().optional(),
        limit:   z.number().min(1).max(200).default(50),
        offset:  z.number().min(0).default(0),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        const conditions = [];
        if (input.segment) conditions.push(eq(growthAudiences.segment, input.segment));
        if (input.status)  conditions.push(eq(growthAudiences.status, input.status));
        if (input.search) {
          conditions.push(
            or(
              like(growthAudiences.name, `%${input.search}%`),
              like(growthAudiences.email, `%${input.search}%`),
              like(growthAudiences.company, `%${input.search}%`),
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

    scoreAudience: adminProcedure
      .input(z.object({
        id:    z.number().int().positive(),
        score: z.number().int().min(0).max(100),
        notes: z.string().max(1024).optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        await db.update(growthAudiences)
          .set({ score: input.score, notes: input.notes ?? null })
          .where(eq(growthAudiences.id, input.id));
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
        id:             z.number().int().positive(),
        decision:       z.enum(["approved", "rejected"]),
        rejectionNote:  z.string().max(1024).optional(),
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
          .set({
            status:       "published",
            publishedAt:  new Date(),
            publishedUrl: input.publishedUrl ?? null,
          })
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
          db.select({ eventType: growthEvents.eventType, total: count() })
            .from(growthEvents).where(gte(growthEvents.createdAt, since))
            .groupBy(growthEvents.eventType),

          db.select({ utmSource: growthEvents.utmSource, total: count() })
            .from(growthEvents).where(gte(growthEvents.createdAt, since))
            .groupBy(growthEvents.utmSource),

          db.select({ segment: growthEvents.segment, total: count() })
            .from(growthEvents).where(gte(growthEvents.createdAt, since))
            .groupBy(growthEvents.segment),

          db.select({
              day: sql<string>`DATE(created_at)`,
              total: count(),
            })
            .from(growthEvents).where(gte(growthEvents.createdAt, since))
            .groupBy(sql`DATE(created_at)`)
            .orderBy(sql`DATE(created_at)`),

          db.select({ status: growthAssets.status, total: count() })
            .from(growthAssets).groupBy(growthAssets.status),
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

      const [[thisWeekEvents], [lastWeekEvents], [thisWeekSignups], [lastWeekSignups],
             [published], [pending], [approved]] = await Promise.all([
        db.select({ total: count() }).from(growthEvents).where(gte(growthEvents.createdAt, since7d)),
        db.select({ total: count() }).from(growthEvents).where(and(gte(growthEvents.createdAt, since14d), sql`created_at < ${since7d}`)),
        db.select({ total: count() }).from(growthEvents).where(and(eq(growthEvents.eventType, "signup"), gte(growthEvents.createdAt, since7d))),
        db.select({ total: count() }).from(growthEvents).where(and(eq(growthEvents.eventType, "signup"), gte(growthEvents.createdAt, since14d), sql`created_at < ${since7d}`)),
        db.select({ total: count() }).from(growthAssets).where(eq(growthAssets.status, "published")),
        db.select({ total: count() }).from(growthAssets).where(eq(growthAssets.status, "pending")),
        db.select({ total: count() }).from(growthAssets).where(eq(growthAssets.status, "approved")),
      ]);

      const tw = Number(thisWeekEvents?.total ?? 0);
      const lw = Number(lastWeekEvents?.total ?? 0);
      const eventsWoW = lw > 0 ? Math.round(((tw - lw) / lw) * 100) : null;

      const tws = Number(thisWeekSignups?.total ?? 0);
      const lws = Number(lastWeekSignups?.total ?? 0);
      const signupsWoW = lws > 0 ? Math.round(((tws - lws) / lws) * 100) : null;

      const topSources = await db
        .select({ source: growthEvents.utmSource, total: count() })
        .from(growthEvents).where(gte(growthEvents.createdAt, since7d))
        .groupBy(growthEvents.utmSource)
        .orderBy(desc(count()))
        .limit(5);

      const topSegments = await db
        .select({ segment: growthEvents.segment, total: count() })
        .from(growthEvents).where(gte(growthEvents.createdAt, since7d))
        .groupBy(growthEvents.segment)
        .orderBy(desc(count()))
        .limit(5);

      return {
        adSpend: 0,
        period: {
          from: since7d.toISOString().split("T")[0],
          to:   new Date().toISOString().split("T")[0],
        },
        events: { thisWeek: tw, lastWeek: lw, wow: eventsWoW },
        signups: { thisWeek: tws, lastWeek: lws, wow: signupsWoW },
        assets:  { published: Number(published?.total ?? 0), approved: Number(approved?.total ?? 0), pending: Number(pending?.total ?? 0) },
        topSources,
        topSegments,
      };
    }),

    // ══════════════════════════════════════════════════════════════════════════
    // ADMIN — Export
    // ══════════════════════════════════════════════════════════════════════════

    exportAssets: adminProcedure
      .input(z.object({
        status:   z.string().optional(),
        platform: z.string().optional(),
        format:   z.enum(["json", "csv"]).default("json"),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        const conditions = [];
        if (input.status)   conditions.push(eq(growthAssets.status, input.status));
        if (input.platform) conditions.push(eq(growthAssets.platform, input.platform));

        const rows = await db.select().from(growthAssets)
          .where(conditions.length ? and(...conditions) : undefined)
          .orderBy(desc(growthAssets.qualityScore))
          .limit(500);

        if (input.format === "csv") {
          const headers = ["id", "platform", "assetType", "headline", "body", "utmUrl", "status", "qualityScore", "publishedUrl"];
          const csv = [
            headers.join(","),
            ...rows.map((r) => headers.map((h) => {
              const val = String((r as any)[h] ?? "").replace(/"/g, '""');
              return `"${val}"`;
            }).join(",")),
          ].join("\n");
          return { format: "csv", data: csv, count: rows.length };
        }

        return { format: "json", data: rows, count: rows.length };
      }),
  });
  