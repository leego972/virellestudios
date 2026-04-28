/**
   * Growth Router — VirÉlle Studios Zero-Budget Growth Engine v1
   * $0 ad spend · All community content is draft-only (human approval required)
   * Spec: docs/VIRELLE_ZERO_BUDGET_GROWTH_ENGINE_V1.md
   */

  import { z } from "zod";
  import { router, adminProcedure, publicProcedure } from "./_core/trpc";
  import { getDb } from "./db";
  import {
    growthAudiences, growthCampaigns, growthAssets, growthEvents,
  } from "../drizzle/schema_additions";
  import { eq, desc, and, gte, sql, count, like, inArray, or } from "drizzle-orm";
  import { invokeLLM } from "./_core/llm";
  import { logger } from "./_core/logger";

  // ─── Constants ────────────────────────────────────────────────────────────────

  const SEGMENTS = ["artists", "filmmakers", "agencies", "small_business", "creators", "game_dev"] as const;
  type Segment = typeof SEGMENTS[number];

  const SEGMENT_LABELS: Record<Segment, string> = {
    artists: "Music Artists & Visual Artists",
    filmmakers: "Indie Filmmakers",
    agencies: "Creative Agencies",
    small_business: "Small Businesses",
    creators: "Creators & YouTubers",
    game_dev: "Game Developers",
  };

  const CHANNELS = [
    "tiktok", "youtube_shorts", "instagram", "x", "linkedin",
    "reddit", "product_hunt", "indie_hackers", "email", "discord",
  ] as const;

  const AUDIENCE_STATUSES = ["discovered", "reviewed", "queued", "engaged", "converted", "archived"] as const;

  // ─── UTM URL builder ─────────────────────────────────────────────────────────

  function buildUtmUrl(
    path: string,
    params: { source: string; medium: string; campaign: string; content?: string }
  ): string {
    const base = "https://virelle.life";
    const url = new URL(`${base}${path.startsWith("/") ? path : "/" + path}`);
    url.searchParams.set("utm_source", params.source);
    url.searchParams.set("utm_medium", params.medium);
    url.searchParams.set("utm_campaign", params.campaign);
    if (params.content) url.searchParams.set("utm_content", params.content);
    return url.toString();
  }

  // ─── Recommended action logic ────────────────────────────────────────────────

  function computeRecommendedAction(data: {
    draftAssets: number; approvedAssets: number; campaigns: number;
    emailCaptures: number; demoRequests: number; audiences: number;
  }): string {
    if (data.draftAssets > 10) return `Review and approve ${data.draftAssets} draft assets in the Assets tab — they're ready to post.`;
    if (data.draftAssets > 0)  return `${data.draftAssets} draft asset(s) waiting for approval — open Assets tab to review.`;
    if (data.approvedAssets > 0) return `${data.approvedAssets} asset(s) approved and ready to publish — copy and post manually, then mark as published.`;
    if (data.campaigns === 0)  return "Create your first campaign and generate a content pack to get started.";
    if (data.demoRequests > 0) return `${data.demoRequests} demo request(s) in the last 30 days — follow up at studiosvirelle@gmail.com.`;
    if (data.emailCaptures > 0) return `${data.emailCaptures} email capture(s) this month — send a welcome message via the mailing list.`;
    if (data.audiences < 10)   return "Import an audience CSV (filmmakers, studios, agencies) to build your outreach list.";
    return "Generate a new campaign pack or schedule outreach to engaged audiences.";
  }

  // ─── AI Campaign Pack generator ───────────────────────────────────────────────

  async function generateAiCampaignPack(campaign: {
    name: string; segment: Segment; objective: string;
    offer: string; cta: string; channels: string[];
  }): Promise<Array<{
    platform: string; assetType: string; title: string;
    headline: string; body: string; visualPrompt: string; utmUrl: string; qualityScore: number;
  }>> {
    const segLabel = SEGMENT_LABELS[campaign.segment] ?? campaign.segment;
    const slug = campaign.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").slice(0, 40);

    const systemPrompt = `You are a zero-budget organic growth specialist for Virelle Studios (https://virelle.life).
  Virelle is an AI-native film production platform. Primary value: reduce early-stage video production and concepting costs by 60-90%.
  Key claim: Virelle helps users avoid spending thousands before they know whether a video concept works.
  Rules: All community posts are DRAFT — human approval required. Never spam. Always be authentic. No auto-publishing.`;

    const userPrompt = `Generate a campaign content pack for Virelle Studios.

  Segment: ${segLabel}
  Campaign: "${campaign.name}"
  Objective: ${campaign.objective}
  Offer: ${campaign.offer || "Free beta access"}
  CTA: ${campaign.cta || "Join the beta at virelle.life"}
  Active channels: ${campaign.channels.join(", ")}

  Generate EXACTLY 30 content pieces total. The first 9 must be these specific types in this order:
  1. Short video script (TikTok/Reels, 30-60 seconds, scene-by-scene format)
  2. TikTok/Reels caption (max 150 chars + 5 hashtags)
  3. YouTube Shorts caption (max 300 chars, searchable keywords)
  4. LinkedIn post (300-500 words, professional ROI angle, first-person founder voice)
  5. X/Twitter thread (hook tweet + 4 continuation tweets, each max 280 chars)
  6. Reddit feedback draft — VALUE-FIRST, no overt promotion, asks for community input (DRAFT, human must review before posting)
  7. SEO blog outline (title + 6-8 H2 sections with 2-3 bullet points each, target keyword in title)
  8. Landing page hero copy (headline + sub-headline + 3 benefit bullets + CTA button text)
  9. Cinematic prompt pack (3 AI video/image generation prompts, 100-150 words each, cinematic style)

  Pieces 10-30: Split across remaining channels freely. Include captions, posts, story ideas, email subjects, newsletter sections, Discord value-posts, etc.

  Return as a JSON array. Each item:
  {
    "platform": string (tiktok|youtube_shorts|instagram|x|linkedin|reddit|email|product_hunt|indie_hackers|discord|blog|landing_page),
    "asset_type": string (video_script|caption|post|thread|blog_outline|hero_copy|video_prompt|newsletter|story|cta_variant),
    "title": string (max 80 chars, internal label),
    "headline": string (max 120 chars, public-facing hook),
    "body": string (full content),
    "visual_prompt": string (image/video generation prompt or ""),
    "quality_score": integer 1-100
  }

  IMPORTANT: Return ONLY the raw JSON array, no markdown, no explanation.`;

    try {
      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user",   content: userPrompt },
        ],
        model: "gpt-4o",
        temperature: 0.8,
        max_tokens: 14000,
      });

      const raw = typeof response === "string" ? response : (response as any).content ?? JSON.stringify(response);
      const cleaned = raw.replace(/```json\n?/g, "").replace(/```/g, "").trim();
      const pieces = JSON.parse(cleaned);

      return (Array.isArray(pieces) ? pieces : []).map((p: any, i: number) => ({
        platform:     String(p.platform || campaign.channels[i % campaign.channels.length] || "linkedin").toLowerCase(),
        assetType:    String(p.asset_type || "post"),
        title:        String(p.title || p.headline || `Asset ${i + 1}`).slice(0, 255),
        headline:     String(p.headline || "").slice(0, 512),
        body:         String(p.body || ""),
        visualPrompt: String(p.visual_prompt || ""),
        utmUrl: buildUtmUrl("/register", {
          source:   String(p.platform || campaign.channels[0]),
          medium:   "organic",
          campaign: slug,
          content:  String(i + 1),
        }),
        qualityScore: Math.min(100, Math.max(1, Number(p.quality_score) || 65)),
      }));
    } catch (err) {
      logger.error("[GrowthRouter] generateAiCampaignPack failed:", err);
      // Fallback: template-based content so feature works without LLM
      return campaign.channels.flatMap((platform, ci) =>
        Array.from({ length: 3 }, (_, pi) => ({
          platform,
          assetType: "post",
          title: `${segLabel} — ${campaign.name} #${ci * 3 + pi + 1}`,
          headline: `Virelle Studios: ${campaign.cta || "Join the beta"}`,
          body: `${campaign.objective}\n\nVirelle helps ${segLabel.toLowerCase()} reduce early-stage video production costs by 60-90%.\n\nOffer: ${campaign.offer || "Free beta access"}\nCTA: ${campaign.cta || "virelle.life"}`,
          visualPrompt: "",
          utmUrl: buildUtmUrl("/register", { source: platform, medium: "organic", campaign: slug }),
          qualityScore: 50,
        }))
      ).slice(0, 30);
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

  // ─── Platform formatter ───────────────────────────────────────────────────────

  function formatForPlatform(asset: any): Record<string, unknown> {
    const limits: Record<string, number> = {
      tiktok: 2200, youtube_shorts: 5000, instagram: 2200, x: 280,
      linkedin: 3000, reddit: 40000, email: 100000, discord: 2000,
      product_hunt: 10000, indie_hackers: 10000, blog: 100000, landing_page: 5000,
    };
    const instructions: Record<string, string> = {
      tiktok: "Paste as TikTok caption when uploading. Add trending hashtags.",
      youtube_shorts: "Use as YouTube Shorts description. Pin CTA link as comment.",
      instagram: "Paste as Instagram caption. Story: use headline as sticker text.",
      x: "Post as tweet or start thread. CTA link in last tweet.",
      linkedin: "Post as LinkedIn update or article intro. Professional tone.",
      reddit: "DRAFT ONLY — human review before posting. Value-first framing, no overt self-promotion.",
      email: "Use as newsletter or email template. Personalise [NAME] before sending.",
      discord: "DRAFT ONLY — human review before posting to any Discord server.",
      product_hunt: "Use as Product Hunt launch tagline + description draft.",
      indie_hackers: "Post as Indie Hackers milestone or build-in-public update.",
      blog: "Use as blog post outline. Expand each H2 before publishing.",
      landing_page: "Use as landing page hero section. A/B test headline variants.",
    };
    const limit = limits[asset.platform] ?? 5000;
    const body = [asset.headline, asset.body].filter(Boolean).join("\n\n");
    return {
      platform: asset.platform,
      title: asset.title,
      body: limit > 0 ? body.slice(0, limit) : body,
      charCount: Math.min(body.length, limit),
      utmUrl: asset.utmUrl ?? "",
      instructions: instructions[asset.platform] ?? "Copy and post manually.",
    };
  }

  // ─── Router ───────────────────────────────────────────────────────────────────

  export const growthRouter = router({

    // PUBLIC — UTM/event tracking
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

    // ADMIN — Dashboard
    getDashboard: adminProcedure.query(async () => {
      const db = await getDb();
      const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const [
        [campaignStats], [audienceStats], [assetStats], [draftCount], [approvedCount], [publishedCount],
        [eventStats], [signupEvents], [emailCaptures], [demoRequests], [signupClicks],
        assetsBySegment, eventsByType, topSegments, topSources, recentEvents,
      ] = await Promise.all([
        db.select({ total: count() }).from(growthCampaigns),
        db.select({ total: count() }).from(growthAudiences),
        db.select({ total: count() }).from(growthAssets),
        db.select({ total: count() }).from(growthAssets).where(eq(growthAssets.status, "draft")),
        db.select({ total: count() }).from(growthAssets).where(eq(growthAssets.status, "approved")),
        db.select({ total: count() }).from(growthAssets).where(eq(growthAssets.status, "published")),
        db.select({ total: count() }).from(growthEvents).where(gte(growthEvents.createdAt, since30d)),
        db.select({ total: count() }).from(growthEvents).where(and(eq(growthEvents.eventType, "signup"), gte(growthEvents.createdAt, since30d))),
        db.select({ total: count() }).from(growthEvents).where(and(eq(growthEvents.eventType, "email_capture"), gte(growthEvents.createdAt, since30d))),
        db.select({ total: count() }).from(growthEvents).where(and(eq(growthEvents.eventType, "demo_request"), gte(growthEvents.createdAt, since30d))),
        db.select({ total: count() }).from(growthEvents).where(and(eq(growthEvents.eventType, "signup_click"), gte(growthEvents.createdAt, since30d))),
        db.select({ segment: growthAssets.segment, total: count() }).from(growthAssets).groupBy(growthAssets.segment),
        db.select({ eventType: growthEvents.eventType, total: count() }).from(growthEvents).where(gte(growthEvents.createdAt, since30d)).groupBy(growthEvents.eventType),
        db.select({ segment: growthEvents.segment, total: count() }).from(growthEvents).where(gte(growthEvents.createdAt, since30d)).groupBy(growthEvents.segment).orderBy(desc(count())).limit(3),
        db.select({ source: growthEvents.source, total: count() }).from(growthEvents).where(gte(growthEvents.createdAt, since30d)).groupBy(growthEvents.source).orderBy(desc(count())).limit(3),
        db.select().from(growthEvents).orderBy(desc(growthEvents.createdAt)).limit(10),
      ]);

      const draft = Number(draftCount?.total ?? 0);
      const approved = Number(approvedCount?.total ?? 0);
      const campaigns = Number(campaignStats?.total ?? 0);
      const emailCap = Number(emailCaptures?.total ?? 0);
      const demoReq = Number(demoRequests?.total ?? 0);
      const audiences = Number(audienceStats?.total ?? 0);
      const bestSegment = topSegments[0]?.segment ?? null;
      const bestSource  = topSources[0]?.source ?? null;

      return {
        campaigns,
        audiences,
        assets:         Number(assetStats?.total ?? 0),
        draftAssets:    draft,
        approvedAssets: approved,
        publishedAssets: Number(publishedCount?.total ?? 0),
        events30d:      Number(eventStats?.total ?? 0),
        signups30d:     Number(signupEvents?.total ?? 0),
        emailCaptures30d: emailCap,
        demoRequests30d:  demoReq,
        signupClicks30d:  Number(signupClicks?.total ?? 0),
        bestSegment,
        bestSource,
        adSpend: 0,
        recommendedAction: computeRecommendedAction({ draftAssets: draft, approvedAssets: approved, campaigns, emailCaptures: emailCap, demoRequests: demoReq, audiences }),
        assetsBySegment,
        eventsByType,
        topSegments,
        topSources,
        recentEvents,
      };
    }),

    // ADMIN — Create campaign
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

    // ADMIN — List campaigns
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
        return db.select().from(growthCampaigns)
          .where(conditions.length ? and(...conditions) : undefined)
          .orderBy(desc(growthCampaigns.createdAt))
          .limit(input.limit).offset(input.offset);
      }),

    // ADMIN — Generate campaign pack (9 spec pieces + 21 additional = 30 total)
    generateCampaignPack: adminProcedure
      .input(z.object({
        campaignId: z.number().int().positive(),
        // Optional overrides — if provided, these replace the campaign's stored values
        goal:      z.string().max(500).optional(),
        offer:     z.string().max(500).optional(),
        cta:       z.string().max(255).optional(),
        platforms: z.array(z.enum(CHANNELS)).optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        const [campaign] = await db.select().from(growthCampaigns).where(eq(growthCampaigns.id, input.campaignId));
        if (!campaign) throw new Error("Campaign not found");

        const channels = input.platforms ?? (campaign.channels as string[]) ?? ["tiktok", "linkedin", "instagram"];
        const pieces = await generateAiCampaignPack({
          name:      campaign.name,
          segment:   campaign.segment as Segment,
          objective: input.goal ?? campaign.objective,
          offer:     input.offer ?? (campaign.offer as string) ?? "Free beta access",
          cta:       input.cta  ?? (campaign.cta  as string)  ?? "Join the beta at virelle.life",
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

        // Log campaign_pack_generated event
        await db.insert(growthEvents).values({
          eventType:  "campaign_pack_generated",
          segment:    campaign.segment,
          campaignId: input.campaignId,
          metadata:   { count: insertedIds.length, channels },
        });

        await db.update(growthCampaigns)
          .set({ status: "active", packIdeas: pieces.map(p => p.title || p.headline).slice(0, 20) })
          .where(eq(growthCampaigns.id, input.campaignId));

        return { generated: insertedIds.length, campaignId: input.campaignId };
      }),

    // ADMIN — Audiences
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
              score:            0, status: "discovered",
            });
            imported++;
          } catch { /* skip duplicates */ }
        }
        return { imported };
      }),

    listAudiences: adminProcedure
      .input(z.object({
        segment: z.string().optional(), status: z.string().optional(),
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
          conditions.push(or(like(growthAudiences.name, q), like(growthAudiences.organisation, q), like(growthAudiences.email, q), like(growthAudiences.website, q))!);
        }
        const rows = await db.select().from(growthAudiences)
          .where(conditions.length ? and(...conditions) : undefined)
          .orderBy(desc(growthAudiences.score), desc(growthAudiences.createdAt))
          .limit(input.limit).offset(input.offset);
        const [[total]] = [await db.select({ total: count() }).from(growthAudiences).where(conditions.length ? and(...conditions) : undefined)];
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

    // ADMIN — Assets
    listAssets: adminProcedure
      .input(z.object({
        status:     z.string().optional(), platform: z.string().optional(),
        segment:    z.string().optional(), campaignId: z.number().int().optional(),
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
          .limit(input.limit).offset(input.offset);
        const [[total]] = [await db.select({ total: count() }).from(growthAssets).where(conditions.length ? and(...conditions) : undefined)];
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
          .set({ status: input.decision, rejectionNote: input.decision === "rejected" ? (input.rejectionNote ?? null) : null })
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
        await db.update(growthAssets).set({ status: input.decision }).where(inArray(growthAssets.id, input.ids));
        return { updated: input.ids.length };
      }),

    markPublished: adminProcedure
      .input(z.object({
        id:           z.number().int().positive(),
        publishedUrl: z.string().max(2048).optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        // Get asset info for event logging
        const [asset] = await db.select().from(growthAssets).where(eq(growthAssets.id, input.id));
        await db.update(growthAssets)
          .set({ status: "published", publishedAt: new Date(), publishedUrl: input.publishedUrl ?? null })
          .where(eq(growthAssets.id, input.id));
        // Log asset_published event
        if (asset) {
          await db.insert(growthEvents).values({
            eventType:  "asset_published",
            segment:    asset.segment ?? null,
            campaignId: asset.campaignId ?? null,
            assetId:    input.id,
            source:     asset.platform ?? null,
            metadata:   { platform: asset.platform, publishedUrl: input.publishedUrl ?? null },
          });
        }
        return { ok: true };
      }),

    // ADMIN — Analytics
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

    // ADMIN — Weekly report with recommended actions
    getWeeklyReport: adminProcedure.query(async () => {
      const db = await getDb();
      const since7d  = new Date(Date.now() -  7 * 24 * 60 * 60 * 1000);
      const since14d = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

      const [[tw], [lw], [tws], [lws], [published], [drafted], [approved],
             [emailCap], [demoCap], topSources, topSegments, topPlatforms] = await Promise.all([
        db.select({ total: count() }).from(growthEvents).where(gte(growthEvents.createdAt, since7d)),
        db.select({ total: count() }).from(growthEvents).where(and(gte(growthEvents.createdAt, since14d), sql`created_at < ${since7d}`)),
        db.select({ total: count() }).from(growthEvents).where(and(eq(growthEvents.eventType, "signup"), gte(growthEvents.createdAt, since7d))),
        db.select({ total: count() }).from(growthEvents).where(and(eq(growthEvents.eventType, "signup"), gte(growthEvents.createdAt, since14d), sql`created_at < ${since7d}`)),
        db.select({ total: count() }).from(growthAssets).where(eq(growthAssets.status, "published")),
        db.select({ total: count() }).from(growthAssets).where(eq(growthAssets.status, "draft")),
        db.select({ total: count() }).from(growthAssets).where(eq(growthAssets.status, "approved")),
        db.select({ total: count() }).from(growthEvents).where(and(eq(growthEvents.eventType, "email_capture"), gte(growthEvents.createdAt, since7d))),
        db.select({ total: count() }).from(growthEvents).where(and(eq(growthEvents.eventType, "demo_request"), gte(growthEvents.createdAt, since7d))),
        db.select({ source: growthEvents.source, total: count() }).from(growthEvents).where(gte(growthEvents.createdAt, since7d)).groupBy(growthEvents.source).orderBy(desc(count())).limit(5),
        db.select({ segment: growthEvents.segment, total: count() }).from(growthEvents).where(gte(growthEvents.createdAt, since7d)).groupBy(growthEvents.segment).orderBy(desc(count())).limit(5),
        db.select({ platform: growthAssets.platform, total: count() }).from(growthAssets).where(eq(growthAssets.status, "published")).groupBy(growthAssets.platform).orderBy(desc(count())).limit(5),
      ]);

      const evT = Number(tw?.total ?? 0), evL = Number(lw?.total ?? 0);
      const sgT = Number(tws?.total ?? 0), sgL = Number(lws?.total ?? 0);
      const draftN = Number(drafted?.total ?? 0);
      const approvedN = Number(approved?.total ?? 0);
      const publishedN = Number(published?.total ?? 0);
      const emailN = Number(emailCap?.total ?? 0);
      const demoN  = Number(demoCap?.total ?? 0);

      // Build recommended actions
      const actions: string[] = [];
      if (draftN > 5)    actions.push(`Review and approve ${draftN} draft assets — open /admin/growth/assets`);
      if (approvedN > 0) actions.push(`${approvedN} approved asset(s) are ready to publish — copy and post manually, then mark as published`);
      if (demoN > 0)     actions.push(`${demoN} demo request(s) received — reply at studiosvirelle@gmail.com`);
      if (emailN > 0)    actions.push(`${emailN} email capture(s) this week — send a welcome email via the mailing list`);
      if (topSegments[0]?.segment) actions.push(`Top segment: ${topSegments[0].segment} (${topSegments[0].total} events) — focus next campaign pack here`);
      if (actions.length < 5) actions.push("Generate a new 30-piece campaign pack from /admin/growth/campaigns");
      if (actions.length < 5) actions.push("Import an audience CSV (filmmakers, studios, agencies) to grow your outreach list");
      if (actions.length < 5) actions.push("Check landing page views — share /artists, /filmmakers, /creators links on relevant communities");

      return {
        adSpend: 0,
        period: { from: since7d.toISOString().split("T")[0], to: new Date().toISOString().split("T")[0] },
        events:  { thisWeek: evT, lastWeek: evL, wow: evL > 0 ? Math.round(((evT - evL) / evL) * 100) : null },
        signups: { thisWeek: sgT, lastWeek: sgL, wow: sgL > 0 ? Math.round(((sgT - sgL) / sgL) * 100) : null },
        assets:  { published: publishedN, approved: approvedN, draft: draftN },
        emailCaptures: emailN,
        demoRequests:  demoN,
        topSources,
        topSegments,
        topPlatforms,
        recommendedActions: actions.slice(0, 5),
      };
    }),

    // ADMIN — Platform-specific export (json/csv/text)
    exportPlatformAssets: adminProcedure
      .input(z.object({
        platform:   z.string().max(64).optional(),
        status:     z.string().max(32).default("approved"),
        campaignId: z.number().int().optional(),
        format:     z.enum(["json", "csv", "text"]).default("json"),
        limit:      z.number().min(1).max(200).default(100),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        const conditions = [eq(growthAssets.status, input.status)];
        if (input.platform)   conditions.push(eq(growthAssets.platform, input.platform));
        if (input.campaignId) conditions.push(eq(growthAssets.campaignId, input.campaignId));
        const rows = await db.select().from(growthAssets)
          .where(and(...conditions)).orderBy(desc(growthAssets.qualityScore)).limit(input.limit);
        const formatted = rows.map(formatForPlatform);

        if (input.format === "text") {
          const text = formatted.map((f: any, i: number) =>
            `=== [${i + 1}] ${f.title} ===\nPlatform: ${f.platform?.toUpperCase()} | ${f.charCount} chars\nInstructions: ${f.instructions}\nCTA URL: ${f.utmUrl}\n\n${f.body}\n\n${"─".repeat(60)}\n`
          ).join("\n");
          return { format: "text", data: text, count: rows.length };
        }
        if (input.format === "csv") {
          const headers = ["id","platform","title","body","charCount","utmUrl","instructions"];
          const csv = [headers.join(","), ...formatted.map((f: any, i: number) =>
            headers.map(h => `"${String(h === "id" ? rows[i]?.id : (f as any)[h] ?? "").replace(/"/g, '""')}"`).join(",")
          )].join("\n");
          return { format: "csv", data: csv, count: rows.length };
        }
        return { format: "json", data: formatted.map((f, i) => ({ ...f, id: rows[i]?.id })), count: rows.length };
      }),
  });
  