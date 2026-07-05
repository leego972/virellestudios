/**
 * Advertising Router — VirÉlle Studios
 *
 * Full tRPC router connecting the autonomous advertising-orchestrator,
 * TikTok content pipeline, video generation, and channel management
 * to the admin frontend.
 *
 * All procedures are admin-only since this controls autonomous content
 * generation, budget, and external publishing.
 */

import { z } from "zod";
import { router, adminProcedure } from "./_core/trpc";
import { getAllChannelStatuses } from "./marketing-channels";
import { getExpandedChannelStatuses } from "./expanded-channels";
import {
  runAdvertisingCycle,
  getStrategyOverview,
  getRecentActivity,
  getPerformanceMetrics,
  GROWTH_STRATEGIES,
  startAdvertisingScheduler,
  stopAdvertisingScheduler,
  getChannelPerformanceReport,
  getCrossChannelAttribution,
  getActiveABTests,
  createABTest,
  recordABTestResult,
} from "./advertising-orchestrator";
import {
  runTikTokContentPipeline,
  getTikTokContentStats,
  isTikTokContentConfigured,
  queryCreatorInfo,
  getPostStatus,
} from "./tiktok-content-service";
import {
  generateVideo,
  generateVideoWithFallback,
} from "./_core/videoGeneration";
import { getDb } from "./db";
import {
  marketingContent,
  marketingActivityLog,
  marketingCampaigns,
  marketingPerformance,
  blogArticles,
} from "../drizzle/schema";
import { eq, desc, and, gte, sql, count } from "drizzle-orm";
import { getMaskedConfig, setChannelConfigs, getConfiguredStatus, getCred } from "./_core/channelConfigStore";

export const advertisingRouter = router({
  // ══════════════════════════════════════════════════════════════════════════
  // STRATEGY & OVERVIEW
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Get the full advertising strategy overview — budget, channels, schedule
   */
  getStrategy: adminProcedure.query(async () => {
    return getStrategyOverview();
  }),

  /**
   * Get performance metrics for the last N days
   */
  getPerformance: adminProcedure
    .input(z.object({ days: z.number().min(1).max(365).default(30) }))
    .query(async ({ input }) => {
      return getPerformanceMetrics(input.days);
    }),

  /**
   * Get recent advertising activity log
   */
  getActivity: adminProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(50) }))
    .query(async ({ input }) => {
      return getRecentActivity(input.limit);
    }),

  /**
   * Manually trigger one full advertising cycle
   */
  runCycle: adminProcedure.mutation(async () => {
    const result = await runAdvertisingCycle();
    return result;
  }),

  /**
   * Get all growth strategies with cost/impact breakdown
   */
  getStrategies: adminProcedure.query(async () => {
    return GROWTH_STRATEGIES;
  }),

  // ══════════════════════════════════════════════════════════════════════════
  // CONTENT QUEUE
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Get the content queue — all generated content pending review/publishing
   */
  getContentQueue: adminProcedure
    .input(
      z.object({
        status: z.enum(["draft", "approved", "published", "rejected", "all"]).default("all"),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { items: [], total: 0 };
      const where =
        input.status !== "all"
          ? eq(marketingContent.status, input.status as any)
          : undefined;
      const [items, totalRows] = await Promise.all([
        db
          .select()
          .from(marketingContent)
          .where(where)
          .orderBy(desc(marketingContent.createdAt))
          .limit(input.limit)
          .offset(input.offset),
        db
          .select({ count: count() })
          .from(marketingContent)
          .where(where),
      ]);
      return { items, total: Number(totalRows[0]?.count ?? 0) };
    }),

  /**
   * Update the status of a content piece (approve/reject/publish)
   */
  updateContentStatus: adminProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["draft", "approved", "published", "rejected"]),
        publishedUrl: z.string().url().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db
        .update(marketingContent)
        .set({
          status: input.status as any,
          ...(input.publishedUrl ? { publishedUrl: input.publishedUrl } : {}),
          ...(input.status === "published" ? { publishedAt: new Date() } : {}),
        })
        .where(eq(marketingContent.id, input.id));
      return { success: true };
    }),

  /**
   * Get a single content piece by ID
   */
  getContentById: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const rows = await db
        .select()
        .from(marketingContent)
        .where(eq(marketingContent.id, input.id))
        .limit(1);
      return rows[0] ?? null;
    }),

  /**
   * Get content that can be previewed (approved or published, with body)
   */
  getPreviewableContent: adminProcedure
    .input(z.object({ limit: z.number().min(1).max(20).default(10) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(marketingContent)
        .where(
          sql`${marketingContent.status} IN ('approved', 'published') AND ${marketingContent.body} IS NOT NULL`
        )
        .orderBy(desc(marketingContent.createdAt))
        .limit(input.limit);
    }),

  // ══════════════════════════════════════════════════════════════════════════
  // DASHBOARD
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Full dashboard data — strategy + performance + activity + content queue counts
   */
  getDashboard: adminProcedure.query(async () => {
    const db = await getDb();
    const [performance, recentActivity] = await Promise.all([
      getPerformanceMetrics(30),
      getRecentActivity(10),
    ]);

    let contentQueue = { draft: 0, approved: 0, published: 0, rejected: 0 };
    if (db) {
      const contentCounts = await db
        .select({ status: marketingContent.status, count: count() })
        .from(marketingContent)
        .groupBy(marketingContent.status);
      for (const c of contentCounts) {
        if (c.status && c.status in contentQueue) {
          (contentQueue as any)[c.status] = Number(c.count);
        }
      }
    }

    return {
      strategy: getStrategyOverview(),
      performance,
      recentActivity,
      contentQueue,
    };
  }),

  // ══════════════════════════════════════════════════════════════════════════
  // TIKTOK
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Get TikTok content posting stats and creator info
   */
  getTikTokStats: adminProcedure.query(async () => {
    const [stats, creatorInfo] = await Promise.all([
      getTikTokContentStats(),
      queryCreatorInfo(),
    ]);
    return { ...stats, creatorInfo, isConfigured: isTikTokContentConfigured() };
  }),

  /**
   * Manually trigger TikTok content generation and posting
   */
  triggerTikTokPost: adminProcedure.mutation(async () => {
    return runTikTokContentPipeline();
  }),

  /**
   * Check the status of a TikTok post by publish_id
   */
  checkTikTokPostStatus: adminProcedure
    .input(z.object({ publishId: z.string() }))
    .query(async ({ input }) => {
      return getPostStatus(input.publishId);
    }),

  // ══════════════════════════════════════════════════════════════════════════
  // VIDEO GENERATION
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Generate a cinematic video from a prompt
   */
  generateVideo: adminProcedure
    .input(
      z.object({
        prompt: z.string().min(5).max(1000),
        duration: z.number().min(1).max(8).default(4),
        aspectRatio: z.enum(["16:9", "9:16", "1:1"]).default("16:9"),
      })
    )
    .mutation(async ({ input }) => {
      return generateVideo({
        prompt: input.prompt,
        seconds: input.duration,
        aspectRatio: (input.aspectRatio === "1:1" ? "landscape" : input.aspectRatio === "9:16" ? "portrait" : "landscape") as "landscape" | "portrait",
      });
    }),

  /**
   * Generate a short-form vertical video (TikTok / YouTube Shorts)
   */
  generateShortVideo: adminProcedure
    .input(
      z.object({
        prompt: z.string().min(5).max(500),
      })
    )
    .mutation(async ({ input }) => {
      return generateVideoWithFallback({
        prompt: input.prompt,
        seconds: 6,
        aspectRatio: "portrait",
      });
    }),

  /**
   * Generate a cinematic ad/promo video
   */
  generateAdVideo: adminProcedure
    .input(
      z.object({
        topic: z.string().min(3).max(300),
        cta: z.string().min(3).max(200),
      })
    )
    .mutation(async ({ input }) => {
      return generateVideoWithFallback({
        prompt: `Cinematic promotional video for VirÉlle Studios. Topic: ${input.topic}. Call to action: ${input.cta}. Visually stunning, AI-generated cinematography, professional film quality.`,
        seconds: 8,
        aspectRatio: "landscape",
      });
    }),

  // ══════════════════════════════════════════════════════════════════════════
  // CHANNEL MANAGEMENT
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Get connection status of all advertising channels (core + expanded)
   */
  getChannelStatuses: adminProcedure.query(() => {
    const core = getAllChannelStatuses();
    const expanded = getExpandedChannelStatuses();
    const freeApiChannels = expanded.filter((c) => c.type === "api_automated");
    const contentQueueChannels = expanded.filter((c) => c.type === "content_queue");
    return {
      core,
      freeApiChannels,
      contentQueueChannels,
      summary: {
        coreConnected: core.filter((c) => c.connected).length,
        coreTotal: core.length,
        freeApiConnected: freeApiChannels.filter((c) => c.connected).length,
        freeApiTotal: freeApiChannels.length,
        contentQueueTotal: contentQueueChannels.length,
      },
    };
  }),

  /**
   * Get channel performance report — success rates, latency, throttle status
   */
  getChannelPerformance: adminProcedure.query(() => {
    return getChannelPerformanceReport();
  }),

  /**
   * Get budget breakdown and cost per channel
   */
  getBudgetBreakdown: adminProcedure.query(async () => {
    const overview = getStrategyOverview();
    const performance = await getPerformanceMetrics(30);
    return {
      monthlyBudget: overview.monthlyBudget,
      currency: overview.currency,
      allocation: overview.budgetAllocation,
      utilization: (performance as any)?.budgetUtilization ?? null,
      freeChannels: overview.freeChannelCount,
      paidChannels: overview.paidChannelCount,
      costBreakdown: GROWTH_STRATEGIES.map((s) => ({
        channel: s.channel,
        costPerMonth: s.costPerMonth,
        frequency: s.frequency,
        impact: s.expectedImpact,
        automatable: s.automatable,
      })),
    };
  }),

  // ══════════════════════════════════════════════════════════════════════════
  // CROSS-CHANNEL ATTRIBUTION
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Get cross-channel attribution data — which channels drive the most value
   */
  getCrossChannelAttribution: adminProcedure
    .input(z.object({ days: z.number().min(1).max(365).default(30) }))
    .query(async ({ input }) => {
      return getCrossChannelAttribution(input.days);
    }),

  // ══════════════════════════════════════════════════════════════════════════
  // A/B TESTING
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Get all active A/B tests
   */
  getABTests: adminProcedure.query(() => {
    return getActiveABTests();
  }),

  /**
   * Create a new A/B test for a channel
   */
  createABTest: adminProcedure
    .input(
      z.object({
        channel: z.string(),
        variantADesc: z.string().min(3).max(500),
        variantBDesc: z.string().min(3).max(500),
      })
    )
    .mutation(({ input }) => {
      return createABTest(input.channel, input.variantADesc, input.variantBDesc);
    }),

  /**
   * Record the result of an A/B test variant
   */
  recordABTestResult: adminProcedure
    .input(
      z.object({
        testId: z.string(),
        variant: z.enum(["A", "B"]),
        success: z.boolean(),
      })
    )
    .mutation(({ input }) => {
      recordABTestResult(input.testId, input.variant, input.success);
      return { success: true };
    }),

  // ══════════════════════════════════════════════════════════════════════════
  // SCHEDULER CONTROL
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Start the autonomous advertising scheduler
   */
  startScheduler: adminProcedure.mutation(() => {
    startAdvertisingScheduler();
    return { success: true, message: "VirÉlle Studios advertising scheduler started" };
  }),

  /**
   * Stop the autonomous advertising scheduler
   */
  stopScheduler: adminProcedure.mutation(() => {
    stopAdvertisingScheduler();
    return { success: true, message: "VirÉlle Studios advertising scheduler stopped" };
  }),

  // ══════════════════════════════════════════════════════════════════════════
  // BLOG POSTS
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Get recent blog posts generated by the advertising orchestrator
   */
  getBlogPosts: adminProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { items: [], total: 0 };
      const [items, totalRows] = await Promise.all([
        db
          .select()
          .from(blogArticles)
          .orderBy(desc(blogArticles.createdAt))
          .limit(input.limit)
          .offset(input.offset),
        db.select({ count: count() }).from(blogArticles),
      ]);
      return { items, total: Number(totalRows[0]?.count ?? 0) };
    }),

  /**
   * Get marketing campaign performance data
   */
  getCampaignPerformance: adminProcedure
    .input(z.object({ days: z.number().min(1).max(365).default(30) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(marketingPerformance)
        .orderBy(desc(marketingPerformance.createdAt))
        .limit(100);
    }),

  // ══════════════════════════════════════════════════════════════════════════
  // AUTONOMOUS CONTENT CONTROL
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Manually trigger the full autonomous content generation cycle
   * (generates cinematic content, scores it, auto-approves ≥ threshold,
   *  schedules at optimal times, and posts TikTok-ready pieces)
   */
  triggerContentCycle: adminProcedure
    .input(
      z.object({
        maxPiecesPerPlatform: z.number().min(1).max(10).default(2),
        autoApproveThreshold: z.number().min(0).max(100).default(75),
        autoSchedule: z.boolean().default(true),
        autoPublishTikTok: z.boolean().default(true),
      }).optional()
    )
    .mutation(async ({ input }) => {
      const { runAutonomousContentCycle } = await import("./content-creator-engine");
      return runAutonomousContentCycle(input ?? {
        maxPiecesPerPlatform: 2,
        autoApproveThreshold: 75,
        autoSchedule: true,
        autoPublishTikTok: true,
      });
    }),

  /**
   * Auto-approve all high-quality draft content pieces (score ≥ threshold)
   */
  autoApproveContent: adminProcedure
    .input(z.object({ threshold: z.number().min(0).max(100).default(75) }).optional())
    .mutation(async ({ input }) => {
      const { autoApproveHighQualityContent } = await import("./content-creator-engine");
      return autoApproveHighQualityContent(input?.threshold ?? 75);
    }),

    /**
     * Manually trigger the video ad pipeline (TikTok + YouTube).
     * Generates video clips via Pollinations/Runway and posts them — or queues if no credentials.
     */
    triggerVideoAdCampaign: adminProcedure
      .input(z.object({ platform: z.enum(["tiktok", "youtube", "both"]).default("both") }).optional())
      .mutation(async ({ input }) => {
        const { generateAndPostVideoAd } = await import("./video-ad-pipeline");
        return generateAndPostVideoAd(input?.platform ?? "both");
      }),
  

    // ══════════════════════════════════════════════════════════════════════════
    // ONE-CLICK CONTENT BLAST
    // Generates optimised content for all priority film channels in one shot
    // and saves each piece as a draft in the marketing content queue.
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * One-click blast: generate content for all priority channels at once.
     * Uses the LLM to produce platform-optimised copy for each channel,
     * saves everything as drafts, returns a per-channel result summary.
     */
    blast: adminProcedure
      .input(
        z.object({
          channelIds: z.array(z.string()).optional(),
        }).optional()
      )
      .mutation(async ({ input }) => {
        const { invokeLLM } = await import("./_core/llm");
        const { AD_PLATFORMS } = await import("./_core/advertisingEngine");
        const db = await getDb();

        // Priority channels for brand awareness blast
        const BLAST_CHANNELS: Array<{
          id: string;
          name: string;
          system: string;
          prompt: string;
        }> = [
          {
            id: "reddit_filmmakers",
            name: "Reddit r/Filmmakers",
            system: "You write authentic Reddit posts for the r/Filmmakers community (500K+ professional and aspiring filmmakers). No marketing speak. Value-first, community tone.",
            prompt: `Write a Reddit post for r/Filmmakers introducing Virelle Studios (virelle.life).

  Title: craft a specific, curiosity-driven title (not clickbait, not salesy)
  Body: 4-6 paragraphs. Open with the problem indie filmmakers face (cost of pre-production). Show how AI film generation changes that. Include a concrete workflow: script → character design → scene generation → export. End with a genuine question inviting feedback.

  Virelle Studios: world's most advanced AI film production platform. Write a plot, AI generates cinematic scenes, characters, soundtracks, complete films. Runway Gen-4 Turbo, ElevenLabs voice acting, photorealistic character consistency. Pricing: $29/mo Creator, $99/mo Pro, $499/mo Industry. Site: https://virelle.life`,
          },
          {
            id: "reddit_cinematography",
            name: "Reddit r/cinematography",
            system: "You write for the r/cinematography community — DoPs, cinematographers, camera operators. Technical, precise, using correct cinematography terminology.",
            prompt: `Write a Reddit post for r/cinematography about Virelle Studios as a pre-visualisation tool.

  Title: focus on the cinematographic use case (pre-vis, shot planning)
  Body: explain how filmmakers can plan exact camera angles, lighting setups, colour grades, and lens choices before a single day of principal photography. Use real cinematography terminology: motivated lighting, rack focus, Dutch angle, golden hour, colour temperature, bokeh, aspect ratio.

  Virelle Studios: AI film production platform at virelle.life. Runway Gen-4 Turbo scene generation. Character consistency across scenes. Full export pipeline.`,
          },
          {
            id: "reddit_screenwriting",
            name: "Reddit r/Screenwriting",
            system: "You write for the r/Screenwriting community — screenwriters who want to see their scripts come alive.",
            prompt: `Write a Reddit post for r/Screenwriting about Virelle Studios.

  Title: focused on the script-to-visual pipeline
  Body: explain how screenwriters can now see their stories visualised — character designs, scene storyboards, full sequences — without needing a director or production team. Show the workflow: write script → generate scenes → share with collaborators or investors.

  Virelle Studios: virelle.life. Includes full screenplay editor, storyboard generator, AI scene creation.`,
          },
          {
            id: "linkedin",
            name: "LinkedIn — Film Industry",
            system: "You write high-performing LinkedIn posts for film industry professionals. Authoritative, professional, industry-language fluent. Open with a scroll-stopping first line. Short paragraphs for LinkedIn's format.",
            prompt: `Write a LinkedIn post for film producers, directors, and studio executives about Virelle Studios.

  Hook: a bold statement about what's changing in film production (AI, democratisation, cost disruption)
  Body: 3-4 short paragraphs — the problem (expensive pre-production), the shift (AI tools), Virelle Studios as the solution. Include a specific example: producer visualised a full feature film pitch deck in 48 hours for zero pre-vis cost.
  CTA: link to virelle.life
  Hashtags: 5-7 film industry hashtags

  Tone: boardroom-credible but not corporate. You're a fellow industry professional sharing a genuine insight.`,
          },
          {
            id: "linkedin_producers",
            name: "LinkedIn — Independent Producers",
            system: "You write LinkedIn posts targeting independent film producers obsessed with budget efficiency and ROI. Data-driven, direct, no fluff.",
            prompt: `Write a LinkedIn post for independent film producers about the ROI of Virelle Studios.

  Focus on the budget angle:
  - Traditional storyboard artist: $15K-$40K
  - Concept artist: $10K-$25K  
  - Pre-vis studio: $50K-$200K
  - Virelle Studios: $499/month (Industry plan, unlimited everything)

  Show the maths. Show the investor pitch angle: show investors a visualised film before spending a dollar on production. Include virelle.life and film finance hashtags.`,
          },
          {
            id: "hackernews",
            name: "Hacker News Show HN",
            system: "You write Hacker News Show HN posts. Direct, technical, humble, no marketing speak. HN rewards honesty and engineering depth.",
            prompt: `Write a Show HN post for Virelle Studios.

  Title: "Show HN: Virelle Studios — [description under 80 chars, factual and specific]"
  Body: 4-5 paragraphs. What it is, how the AI pipeline works (Runway Gen-4, ElevenLabs, character consistency system, cinematic prompt engine), what makes it technically interesting, honest limitations, and a genuine question inviting feedback.

  Be developer-to-developer honest. Admit what's hard. Mention virelle.life.`,
          },
          {
            id: "twitter",
            name: "X / Twitter Thread",
            system: "You write viral Twitter/X threads about AI and film technology. Strong hook, numbered tweets, concrete examples.",
            prompt: `Write a 10-tweet thread about Virelle Studios.

  Tweet 1: hook — a bold, surprising statement about AI film production
  Tweets 2-9: build the story — the problem, the solution, how Virelle Studios works, a concrete example (write plot → AI generates complete film), key features, pricing
  Tweet 10: CTA with virelle.life, ask for RT if useful

  Rules: each tweet max 280 chars. Use "🎬" or "🎥" sparingly. Tweet 1 ends with "🧵".`,
          },
          {
            id: "producthunt",
            name: "Product Hunt",
            system: "You write punchy, benefit-led Product Hunt copy. Never say 'thrilled to announce'. Specific, outcome-focused.",
            prompt: `Write a complete Product Hunt submission for Virelle Studios.

  1. Tagline (max 60 chars — specific outcome, no buzzwords)
  2. Short description (max 260 chars)
  3. Maker first comment (200-300 words, personal story-driven — why we built it, who it's for)
  4. 5 bullet feature highlights

  Virelle Studios: virelle.life — AI film production platform. Write a plot, get a complete film with scenes, characters, voice acting, soundtrack. Runway Gen-4 Turbo + ElevenLabs + character consistency.`,
          },
          {
            id: "artstation",
            name: "ArtStation Portfolio Post",
            system: "You write ArtStation portfolio descriptions for VFX artists and visual storytellers. Technical, aesthetically intelligent, community-aware.",
            prompt: `Write an ArtStation project post showcasing AI-generated film stills from Virelle Studios.

  Project Title: something that conveys cinematic AI art (not a product pitch)
  Description: explain the creative process — how the cinematic prompt engine creates genre-specific visual DNA, how character consistency is maintained across scenes, what controls exist for lighting, colour grading, and cinematography. Include the technical pipeline. End with a link to virelle.life.

  Tone: artist-to-artist. This is a portfolio showcase, not an ad.`,
          },
          {
            id: "devto",
            name: "Dev.to Technical Article",
            system: "You write technical blog posts for developer audiences. Practical, detailed, with specific technical explanations.",
            prompt: `Write a Dev.to article about building Virelle Studios or using its AI film pipeline.

  Title: SEO-friendly, descriptive (e.g. "How AI is Transforming Film Pre-Production in 2025")
  Tags: ai, filmmaking, generativeai, webdev
  Structure:
  - Why film pre-production has always been expensive and slow
  - What AI changes (Runway Gen-4, ElevenLabs, character consistency)
  - A step-by-step workflow using Virelle Studios
  - Technical architecture notes (optional — AI pipeline, prompt engineering)
  - Conclusion + virelle.life link

  Length: 900-1200 words. Technical depth appreciated.`,
          },
          {
            id: "quora",
            name: "Quora Expert Answers",
            system: "You write expert Quora answers that provide genuine value while naturally mentioning relevant tools.",
            prompt: `Write 3 separate Quora answers for Virelle Studios. Format each clearly:

  QUESTION 1: "How can I make a professional film without a big budget?"
  QUESTION 2: "What is the best AI tool for indie filmmakers in 2025?"
  QUESTION 3: "Can AI replace traditional film pre-production?"

  Each answer: 400-600 words. Provide genuine expertise. Mention Virelle Studios naturally as a specific tool you recommend, with concrete reasons. End with virelle.life link. Use subheadings where appropriate.`,
          },
          {
            id: "indiehackers",
            name: "Indie Hackers",
            system: "You write transparent, metrics-driven builder posts for IndieHackers. Authentic, honest, builder-to-builder tone.",
            prompt: `Write an IndieHackers project post for Virelle Studios.

  Include: what it is (2 sentences), the problem it solves, who it's for, how it works, current status (launched, accepting users), tech stack (Runway Gen-4, ElevenLabs, fal.ai, React, Node.js), pricing ($29-$499/month), what you're looking for (feedback, beta users), link to virelle.life.

  Tone: honest, builder-to-builder, no hype. Share a real challenge you solved.`,
          },
          {
            id: "ein_presswire",
            name: "EIN Presswire Press Release",
            system: "You write formal press releases in AP style. Professional, factual, newsworthy angle.",
            prompt: `Write a press release for Virelle Studios' launch of its advanced AI film production platform.

  Structure:
  - FOR IMMEDIATE RELEASE
  - Headline (compelling, newsworthy — focus on democratising Hollywood-quality filmmaking)
  - Subheadline
  - Dateline + Lead paragraph (who, what, where, when, why)
  - Body (3-4 paragraphs: the problem, the solution, key features, market context)
  - Quote from founders
  - About Virelle Studios boilerplate (3-4 sentences)
  - Contact information: info@virelle.life | virelle.life

  Write in formal AP style. Focus on the industry disruption angle.`,
          },
        ];

        const targetChannels = input?.channelIds
          ? BLAST_CHANNELS.filter(c => input.channelIds!.includes(c.id))
          : BLAST_CHANNELS;

        const results: Array<{
          channelId: string;
          channelName: string;
          ok: boolean;
          savedId?: number;
          error?: string;
        }> = [];

        for (const channel of targetChannels) {
          try {
            const response = await invokeLLM({
              messages: [
                { role: "system", content: channel.system },
                { role: "user", content: channel.prompt },
              ],
            });

            const msg = response.choices?.[0]?.message;
            const content =
              typeof msg?.content === "string"
                ? msg.content
                : Array.isArray(msg?.content)
                ? (msg.content as any[]).map((c: any) => c.text || "").join("")
                : "";

            if (!content) {
              results.push({ channelId: channel.id, channelName: channel.name, ok: false, error: "Empty response from LLM" });
              continue;
            }

            let savedId: number | undefined;
            if (db) {
              const inserted = await db
                .insert(marketingContent)
                .values({
                  platform: channel.id,
                  contentType: "organic_post",
                  title: channel.name + " — AI Blast Draft",
                  body: content,
                  status: "draft",
                  metadata: JSON.stringify({ source: "one_click_blast", generatedAt: new Date().toISOString() }),
                } as any)
                .$returningId();
              savedId = inserted[0]?.id;
            }

            results.push({ channelId: channel.id, channelName: channel.name, ok: true, savedId });
          } catch (err: any) {
            results.push({ channelId: channel.id, channelName: channel.name, ok: false, error: String(err?.message ?? err) });
          }
        }

        const succeeded = results.filter(r => r.ok).length;
        const failed = results.filter(r => !r.ok).length;

        return {
          ok: true,
          succeeded,
          failed,
          total: results.length,
          results,
          message: `Generated ${succeeded}/${results.length} content pieces — saved as drafts in Content Queue`,
        };
      }),

    // ══════════════════════════════════════════════════════════════════════════
    // PUBLISH SETTINGS — runtime credential management
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * Get current channel credential config (values masked for security).
     * The "configured" map shows which channels can auto-post.
     */
    getChannelConfig: adminProcedure.query(() => {
      return getMaskedConfig();
    }),

    /**
     * Save credentials for social channels into the runtime store.
     * Takes effect immediately; survives until process restart.
     * For permanence, also set as env vars on the hosting provider.
     */
    setChannelConfig: adminProcedure
      .input(
        z.object({
          linkedin_access_token: z.string().optional(),
          linkedin_person_urn:   z.string().optional(),
          linkedin_org_urn:      z.string().optional(),
          reddit_client_id:      z.string().optional(),
          reddit_client_secret:  z.string().optional(),
          reddit_username:       z.string().optional(),
          reddit_password:       z.string().optional(),
          devto_api_key:         z.string().optional(),
          discord_webhook_url:   z.string().optional(),
          instagram_access_token: z.string().optional(),
          twilio_account_sid:    z.string().optional(),
          twilio_auth_token:     z.string().optional(),
          twilio_whatsapp_from:  z.string().optional(),
        })
      )
      .mutation(({ input }) => {
        setChannelConfigs(input as Record<string, string | undefined>);
        return { ok: true, configured: getConfiguredStatus() };
      }),

    /**
     * Auto-publish a content piece to its platform using the configured credentials.
     * For platforms without credentials, returns { posted: false, manual: true, manualUrl }.
     */
    publishContent: adminProcedure
      .input(z.object({ id: z.number(), platform: z.string() }))
      .mutation(async ({ input }) => {
        // Dispatch to the right posting function based on platform
        const platform = input.platform.toLowerCase();

        if (platform === "linkedin") {
          const { postToLinkedIn } = await import("./_core/socialPostingEngine");
          const result = await postToLinkedIn({ text: `Check out Virelle Studios — AI-powered film production. https://virellestudios.com` });
          return { posted: result.success, url: result.postUrl, error: result.error, platform };
        }

        if (platform.startsWith("reddit") || platform === "reddit_ml" || platform === "reddit_sideproject") {
          const subreddit = platform === "reddit_ml" ? "MachineLearning" : platform === "reddit_sideproject" ? "SideProject" : "artificial";
          const { postToReddit } = await import("./_core/socialPostingEngine");
          const result = await postToReddit({
            subreddit,
            title: "Virelle Studios — AI-powered Film Production Platform",
            text: "We built an AI-native film production studio. Check it out: https://virellestudios.com",
          });
          return { posted: result.success, url: result.postUrl, error: result.error, platform };
        }

        const MANUAL_URLS: Record<string, string> = {
          product_hunt: "https://www.producthunt.com/posts/new",
          hacker_news:  "https://news.ycombinator.com/submit",
          x_twitter:    "https://x.com",
          instagram:    "https://instagram.com",
          tiktok:       "https://tiktok.com",
          devto:        "https://dev.to/new",
          discord:      "https://discord.com",
        };
        return {
          posted: false,
          manual: true,
          platform,
          manualUrl: MANUAL_URLS[platform] ?? "https://virellestudios.com",
          instructions: `Open ${MANUAL_URLS[platform] ?? "the platform"} and paste your generated content.`,
        };
      }),

  
  });
