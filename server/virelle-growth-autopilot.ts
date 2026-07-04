import type { Express, Request, Response } from "express";
import { google } from "googleapis";
import { Readable } from "stream";
import { sql } from "drizzle-orm";
import { logger } from "./_core/logger";
import { ENV } from "./_core/env";
import { invokeLLM } from "./_core/llm";
import { safeJsonExtract } from "./_core/safeParse";
import { generateImage } from "./_core/imageGeneration";
import { generateVideo, type UserApiKeys } from "./_core/byokVideoEngine";
import { requireAdminExpress } from "./_core/context";
import * as db from "./db";

type GrowthBrand = "virelle" | "swappys" | "viba";
type RunReason = "scheduled" | "manual" | "startup";

type GrowthIdea = {
  brand: GrowthBrand;
  angle: string;
  hook: string;
  shortScript: string;
  visualPrompt: string;
  thumbnailPrompt: string;
  title: string;
  description: string;
  hashtags: string[];
  tags: string[];
  cta: string;
  funnelUrl: string;
  score: number;
};

type GrowthPlan = {
  theme: string;
  rationale: string;
  ideas: GrowthIdea[];
};

type PublishResult = {
  success: boolean;
  skipped?: boolean;
  videoId?: string;
  url?: string;
  title?: string;
  brand?: GrowthBrand;
  error?: string;
};

type GrowthAutopilotState = {
  enabled: boolean;
  isRunning: boolean;
  lastRunAt: string | null;
  lastStatus: "idle" | "running" | "success" | "skipped" | "failed";
  lastError: string | null;
  totalRuns: number;
  nextCheckAt: string | null;
  youtubeConfigured: boolean;
  youtubeAccount: string;
  excludedChannels: string[];
  latestPlan?: GrowthPlan;
  latestPublishResults?: PublishResult[];
};

const YOUTUBE_ACCOUNT = process.env.GROWTH_AUTOPILOT_YOUTUBE_ACCOUNT || "studiosvirelle@gmail.com";
const EXCLUDED_CHANNELS = ["snapchat", "tiktok"];
const DEFAULT_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;
const CHECK_EVERY_MS = 6 * 60 * 60 * 1000;
const FIRST_CHECK_DELAY_MS = Number(process.env.GROWTH_AUTOPILOT_FIRST_CHECK_DELAY_MS || 20 * 60 * 1000);
const MAX_WEEKLY_VIDEOS = Math.max(1, Math.min(3, Number(process.env.GROWTH_AUTOPILOT_WEEKLY_VIDEO_COUNT || 1)));

let scheduler: ReturnType<typeof setInterval> | null = null;
let firstCheck: ReturnType<typeof setTimeout> | null = null;

const state: GrowthAutopilotState = {
  enabled: process.env.VIRELLE_GROWTH_AUTOPILOT_ENABLED !== "false",
  isRunning: false,
  lastRunAt: null,
  lastStatus: "idle",
  lastError: null,
  totalRuns: 0,
  nextCheckAt: null,
  youtubeConfigured: hasYouTubeOAuth(),
  youtubeAccount: YOUTUBE_ACCOUNT,
  excludedChannels: EXCLUDED_CHANNELS,
};

const BRAND_MISSIONS: Record<GrowthBrand, { name: string; funnelUrl: string; positioning: string; forbidden: string }> = {
  virelle: {
    name: "Virelle Studios",
    funnelUrl: process.env.GROWTH_FUNNEL_VIRELLE_URL || "https://virelle.life",
    positioning:
      "AI film and video production platform for filmmakers, creators, studios, film students, pre-visualisation, trailers, pitch decks, cinematic scenes, and full production packaging.",
    forbidden:
      "Do not claim guaranteed Hollywood results, guaranteed investor funding, or guaranteed cost savings. Frame savings as practical reduction of pre-production friction.",
  },
  swappys: {
    name: "Swappys",
    funnelUrl: process.env.GROWTH_FUNNEL_SWAPPYS_URL || "https://virelle.life/swappys",
    positioning:
      "Consent-based AI appearance transformation for creators, streamers, filmmakers, character performance, safe webcam/video transformation, cosplay, virtual production, and creator identity tools.",
    forbidden:
      "Do not promote celebrity impersonation, deception, non-consensual identity use, watermark removal, or bypassing platform rules.",
  },
  viba: {
    name: "VIBA / SiteCheck",
    funnelUrl: process.env.GROWTH_FUNNEL_VIBA_URL || "https://virelle.life/sitecheck",
    positioning:
      "AI website UI/functionality checks, broken buttons, broken links, missing pages, forms not working, responsive layout issues, technical repair reports, and business automation.",
    forbidden:
      "Do not promise hacking, unauthorised security testing, or guaranteed revenue. Keep it to UI, functionality, quality, and owner-approved repair workflows.",
  },
};

function hasYouTubeOAuth(): boolean {
  return !!(ENV.youtubeClientId && ENV.youtubeClientSecret && ENV.youtubeRefreshToken);
}

function rowsFrom(result: any): any[] {
  if (Array.isArray(result?.rows)) return result.rows;
  if (Array.isArray(result?.[0])) return result[0];
  if (Array.isArray(result)) return result;
  return [];
}

async function ensureStateTable(): Promise<void> {
  try {
    const dbConn = await db.getDb();
    if (!dbConn) return;
    await dbConn.execute(sql`
      CREATE TABLE IF NOT EXISTS growth_autopilot_runs (
        id VARCHAR(64) PRIMARY KEY,
        lastRunAt DATETIME NULL,
        lastStatus VARCHAR(32) NULL,
        lastError TEXT NULL,
        totalRuns INT NOT NULL DEFAULT 0,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
  } catch (err: any) {
    logger.warn(`[GrowthAutopilot] State table unavailable; falling back to process memory: ${err?.message}`);
  }
}

async function loadPersistentState(): Promise<void> {
  try {
    const dbConn = await db.getDb();
    if (!dbConn) return;
    await ensureStateTable();
    const result = await dbConn.execute(sql`SELECT * FROM growth_autopilot_runs WHERE id = 'weekly-youtube' LIMIT 1`);
    const row = rowsFrom(result)[0];
    if (!row) return;
    state.lastRunAt = row.lastRunAt ? new Date(row.lastRunAt).toISOString() : null;
    state.lastStatus = (row.lastStatus || state.lastStatus) as GrowthAutopilotState["lastStatus"];
    state.lastError = row.lastError || null;
    state.totalRuns = Number(row.totalRuns || 0);
  } catch (err: any) {
    logger.warn(`[GrowthAutopilot] Failed to load state: ${err?.message}`);
  }
}

async function persistState(status: GrowthAutopilotState["lastStatus"], error?: string | null): Promise<void> {
  state.lastStatus = status;
  state.lastError = error || null;
  try {
    const dbConn = await db.getDb();
    if (!dbConn) return;
    await ensureStateTable();
    await dbConn.execute(sql`
      INSERT INTO growth_autopilot_runs (id, lastRunAt, lastStatus, lastError, totalRuns, updatedAt)
      VALUES ('weekly-youtube', NOW(), ${status}, ${error || null}, ${state.totalRuns}, NOW())
      ON DUPLICATE KEY UPDATE
        lastRunAt = NOW(),
        lastStatus = VALUES(lastStatus),
        lastError = VALUES(lastError),
        totalRuns = VALUES(totalRuns),
        updatedAt = NOW()
    `);
  } catch (err: any) {
    logger.warn(`[GrowthAutopilot] Failed to persist state: ${err?.message}`);
  }
}

function minIntervalMs(): number {
  const raw = Number(process.env.GROWTH_AUTOPILOT_MIN_INTERVAL_MS || DEFAULT_INTERVAL_MS);
  return Number.isFinite(raw) && raw > 60_000 ? raw : DEFAULT_INTERVAL_MS;
}

function shouldRunNow(force: boolean): boolean {
  if (force) return true;
  if (!state.lastRunAt) return true;
  const last = new Date(state.lastRunAt).getTime();
  if (!Number.isFinite(last)) return true;
  return Date.now() - last >= minIntervalMs();
}

function fallbackPlan(): GrowthPlan {
  const ideas: GrowthIdea[] = [
    {
      brand: "virelle",
      angle: "AI pre-visualisation for indie filmmakers",
      hook: "What if you could show the film before you fund the film?",
      shortScript:
        "Most indie films die before the camera rolls because nobody can see the vision clearly. Virelle helps turn a script into scenes, character looks, pitch visuals, and cinematic previews before production money is wasted. For filmmakers, that means clearer planning, stronger pitches, and faster creative decisions.",
      visualPrompt: "vertical cinematic montage: screenplay pages transforming into storyboards, characters, film lighting, camera movement, pitch deck visuals, premium dark-gold AI film studio aesthetic",
      thumbnailPrompt: "bold YouTube Shorts thumbnail, cinematic script-to-screen transformation, text space, dark gold Virelle studio look",
      title: "AI can turn a film idea into pitch visuals",
      description: "A practical look at how AI pre-visualisation can help filmmakers plan, pitch, and develop projects faster. Create cinematic AI production assets with Virelle Studios. https://virelle.life",
      hashtags: ["#AIFilm", "#Filmmaking", "#IndieFilm", "#Previs", "#Virelle"],
      tags: ["AI film", "AI filmmaking", "indie film", "previs", "film pitch deck", "Virelle Studios"],
      cta: "Create cinematic AI production assets with Virelle.",
      funnelUrl: BRAND_MISSIONS.virelle.funnelUrl,
      score: 91,
    },
    {
      brand: "swappys",
      angle: "consent-based creator transformation",
      hook: "Your next character might not need a costume department.",
      shortScript:
        "Creators need fresh looks, characters, and performance styles without buying every costume or hiring a full team. Swappys is built around consent-based AI appearance transformation for video creators, streamers, and filmmakers who want safer character experimentation.",
      visualPrompt: "vertical creator studio scene: performer safely transforming into original fictional character looks, clear consent-first creative tool aesthetic, modern AI webcam interface, no celebrity references",
      thumbnailPrompt: "bold creator transformation thumbnail, original fictional character silhouettes, consent-based AI transformation, no celebrity likeness",
      title: "AI character transformation for creators",
      description: "Swappys is for consent-based creator transformation: original characters, streaming looks, cosplay concepts, and virtual production workflows. https://virelle.life/swappys",
      hashtags: ["#AICreator", "#VirtualProduction", "#Swappys", "#AITransformation", "#CreatorTools"],
      tags: ["AI creator tools", "virtual production", "AI transformation", "webcam creator tool", "Swappys"],
      cta: "Try consent-based AI character transformation with Swappys.",
      funnelUrl: BRAND_MISSIONS.swappys.funnelUrl,
      score: 86,
    },
    {
      brand: "viba",
      angle: "website UI checks that find lost-sales problems",
      hook: "Your website can look finished and still leak customers.",
      shortScript:
        "A site can look clean but still have broken buttons, dead links, missing pages, forms that fail, or mobile layout problems. VIBA SiteCheck is built to inspect the parts visitors actually touch and turn the findings into a ranked report so owners know what is critical, what is important, and what can wait.",
      visualPrompt: "vertical website audit animation: landing page buttons, broken links, form errors, mobile layout issue, AI checklist ranking critical to optional, professional business tech aesthetic",
      thumbnailPrompt: "bold website audit thumbnail, broken button highlighted, critical warning tag, clean business AI style",
      title: "3 website mistakes that quietly kill sales",
      description: "Broken buttons, failed forms, and bad mobile layouts cost trust. VIBA SiteCheck helps find UI and functionality issues before customers leave. https://virelle.life/sitecheck",
      hashtags: ["#WebsiteAudit", "#AIForBusiness", "#UXDesign", "#VIBA", "#SiteCheck"],
      tags: ["website audit", "UI check", "broken buttons", "business automation", "VIBA", "SiteCheck"],
      cta: "Run a VIBA SiteCheck and find what is costing sales.",
      funnelUrl: BRAND_MISSIONS.viba.funnelUrl,
      score: 94,
    },
  ];
  return {
    theme: "Autonomous weekly growth content for Virelle, Swappys, and VIBA",
    rationale: "Fallback pack generated without LLM response. All ideas are original and route to approved funnels.",
    ideas,
  };
}

async function generateGrowthPlan(): Promise<GrowthPlan> {
  const prompt = `
Create this week's autonomous YouTube growth content package for Virelle's Director's Assistant.

MISSION:
- Generate original content only.
- Make the content relevant to all approved brands/funnels: Virelle, Swappys, and VIBA/SiteCheck.
- YouTube is the active publishing path.
- Snapchat and TikTok are excluded.
- The system should create useful, viral-style short-form videos without copying or reposting anyone else's content.

APPROVED BRANDS:
${Object.entries(BRAND_MISSIONS).map(([id, b]) => `- ${id}: ${b.name}. ${b.positioning} Funnel: ${b.funnelUrl}. Constraint: ${b.forbidden}`).join("\n")}

OUTPUT:
Return JSON only with:
{
  "theme": string,
  "rationale": string,
  "ideas": [
    {
      "brand": "virelle" | "swappys" | "viba",
      "angle": string,
      "hook": string,
      "shortScript": string,
      "visualPrompt": string,
      "thumbnailPrompt": string,
      "title": string,
      "description": string,
      "hashtags": string[],
      "tags": string[],
      "cta": string,
      "funnelUrl": string,
      "score": number
    }
  ]
}

RULES:
- Return exactly 3 ideas: one for each brand.
- Titles must be under 95 characters.
- Descriptions must include the matching funnel URL naturally.
- Hashtags must not include TikTok or Snapchat tags.
- No celebrity impersonation, reused footage, scraping, watermark removal, or fake engagement.
- Swappys must be framed as consent-based and original-character/creator transformation.
- VIBA must focus on UI/functionality/business automation, not unauthorised hacking.
`;

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "You are the Virelle Director's Assistant growth strategist. You create original, policy-safe YouTube content packs that convert into Virelle, Swappys, and VIBA funnels.",
        },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "growth_plan",
          strict: true,
          schema: {
            type: "object",
            properties: {
              theme: { type: "string" },
              rationale: { type: "string" },
              ideas: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    brand: { type: "string", enum: ["virelle", "swappys", "viba"] },
                    angle: { type: "string" },
                    hook: { type: "string" },
                    shortScript: { type: "string" },
                    visualPrompt: { type: "string" },
                    thumbnailPrompt: { type: "string" },
                    title: { type: "string" },
                    description: { type: "string" },
                    hashtags: { type: "array", items: { type: "string" } },
                    tags: { type: "array", items: { type: "string" } },
                    cta: { type: "string" },
                    funnelUrl: { type: "string" },
                    score: { type: "number" },
                  },
                  required: ["brand", "angle", "hook", "shortScript", "visualPrompt", "thumbnailPrompt", "title", "description", "hashtags", "tags", "cta", "funnelUrl", "score"],
                  additionalProperties: false,
                },
              },
            },
            required: ["theme", "rationale", "ideas"],
            additionalProperties: false,
          },
        },
      },
      maxTokens: 3500,
    });

    const content = response.choices?.[0]?.message?.content;
    const parsed = safeJsonExtract<GrowthPlan>(content, fallbackPlan());
    const fallback = fallbackPlan();
    const ideas = ["virelle", "swappys", "viba"].map((brand) => {
      const generated = parsed.ideas?.find((i) => i.brand === brand);
      const fallbackIdea = fallback.ideas.find((i) => i.brand === brand)!;
      return hardenIdea(generated || fallbackIdea);
    });
    return { theme: parsed.theme || fallback.theme, rationale: parsed.rationale || fallback.rationale, ideas };
  } catch (err: any) {
    logger.warn(`[GrowthAutopilot] LLM plan failed, using fallback plan: ${err?.message}`);
    return fallbackPlan();
  }
}

function hardenIdea(idea: GrowthIdea): GrowthIdea {
  const brand = (idea.brand in BRAND_MISSIONS ? idea.brand : "virelle") as GrowthBrand;
  const mission = BRAND_MISSIONS[brand];
  const hashtags = Array.from(new Set((idea.hashtags || []).filter(Boolean)))
    .filter((h) => !/tiktok|snapchat/i.test(h))
    .slice(0, 8);
  const tags = Array.from(new Set((idea.tags || []).filter(Boolean)))
    .filter((t) => !/tiktok|snapchat/i.test(t))
    .slice(0, 20);
  const description = `${String(idea.description || "").trim()}\n\n${idea.cta || "Learn more"}: ${idea.funnelUrl || mission.funnelUrl}`.slice(0, 4900);
  return {
    ...idea,
    brand,
    title: String(idea.title || mission.name).slice(0, 95),
    description,
    hashtags: hashtags.length ? hashtags : [`#${mission.name.replace(/[^A-Za-z0-9]/g, "")}`],
    tags: tags.length ? tags : [mission.name, "AI", "creator tools"],
    funnelUrl: idea.funnelUrl || mission.funnelUrl,
    score: Number.isFinite(Number(idea.score)) ? Number(idea.score) : 75,
  };
}

function buildVideoPrompt(idea: GrowthIdea): string {
  return [
    "Create an original vertical YouTube Shorts promotional video.",
    "No copyrighted footage. No logos from other companies. No celebrity likenesses. No watermarks.",
    `Brand: ${BRAND_MISSIONS[idea.brand].name}`,
    `Hook: ${idea.hook}`,
    `Script narration: ${idea.shortScript}`,
    `Visual direction: ${idea.visualPrompt}`,
    "Style: high-retention mobile-first edit, cinematic lighting, clean kinetic text overlays, premium AI startup aesthetic, 9:16, safe for YouTube monetization.",
  ].join("\n");
}

async function generateThumbnailUrl(idea: GrowthIdea): Promise<string | null> {
  try {
    const result = await generateImage({
      prompt: `${idea.thumbnailPrompt}. YouTube Shorts thumbnail, bold readable composition, no copyrighted logos, no celebrity faces, no misleading claims.`,
    });
    return result.url || null;
  } catch (err: any) {
    logger.warn(`[GrowthAutopilot] Thumbnail generation failed for ${idea.brand}: ${err?.message}`);
    return null;
  }
}

async function generateVideoUrl(idea: GrowthIdea): Promise<{ videoUrl: string; provider: string } | null> {
  const keys: UserApiKeys = {
    openaiKey: null,
    runwayKey: null,
    replicateKey: null,
    falKey: null,
    lumaKey: null,
    hfToken: null,
    byteplusKey: null,
    googleAiKey: null,
    preferredProvider: process.env.GROWTH_AUTOPILOT_VIDEO_PROVIDER || "pollinations",
  };
  try {
    const result = await generateVideo(keys, {
      prompt: buildVideoPrompt(idea),
      duration: 8,
      aspectRatio: "9:16",
      resolution: "720p",
      negativePrompt: "copyrighted logos, celebrity likeness, watermark, blurry text, distorted interface, unsafe or deceptive claims",
    });
    if (!result.videoUrl || result.videoUrl.includes("pending:")) {
      throw new Error(`Video provider returned pending result: ${result.videoUrl}`);
    }
    return { videoUrl: result.videoUrl, provider: result.provider };
  } catch (err: any) {
    logger.warn(`[GrowthAutopilot] Video generation failed for ${idea.brand}: ${err?.message}`);
    return null;
  }
}

async function fetchMediaAsStream(url: string): Promise<{ stream: Readable; contentType: string; size: number }> {
  if (url.startsWith("data:")) {
    const match = url.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) throw new Error("Unsupported data URL format");
    const buffer = Buffer.from(match[2], "base64");
    return { stream: Readable.from(buffer), contentType: match[1], size: buffer.length };
  }
  const response = await fetch(url, { signal: AbortSignal.timeout(180_000) });
  if (!response.ok) throw new Error(`Failed to fetch media ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length < 1000) throw new Error("Fetched media is too small to publish");
  const contentType = response.headers.get("content-type") || "video/mp4";
  return { stream: Readable.from(buffer), contentType, size: buffer.length };
}

function youtubeClient() {
  const oauth2 = new google.auth.OAuth2(ENV.youtubeClientId, ENV.youtubeClientSecret);
  oauth2.setCredentials({ refresh_token: ENV.youtubeRefreshToken });
  return google.youtube({ version: "v3", auth: oauth2 });
}

function youtubePrivacyStatus(): "public" | "private" | "unlisted" {
  const raw = String(process.env.GROWTH_AUTOPILOT_YOUTUBE_PRIVACY || "public").toLowerCase();
  return raw === "private" || raw === "unlisted" || raw === "public" ? raw : "public";
}

async function publishToYouTube(idea: GrowthIdea, videoUrl: string, thumbnailUrl: string | null): Promise<PublishResult> {
  if (!hasYouTubeOAuth()) {
    return { success: false, skipped: true, brand: idea.brand, title: idea.title, error: "YouTube OAuth is not configured" };
  }

  const media = await fetchMediaAsStream(videoUrl);
  if (!media.contentType.includes("video") && !media.contentType.includes("octet-stream")) {
    throw new Error(`Media is not a video: ${media.contentType}`);
  }

  const youtube = youtubeClient();
  const body = {
    snippet: {
      title: idea.title,
      description: `${idea.description}\n\n${idea.hashtags.join(" ")}`.slice(0, 5000),
      tags: idea.tags,
      categoryId: "22",
    },
    status: {
      privacyStatus: youtubePrivacyStatus(),
      selfDeclaredMadeForKids: false,
    },
  };

  const upload = await youtube.videos.insert({
    part: ["snippet", "status"],
    requestBody: body,
    media: {
      mimeType: media.contentType.includes("video") ? media.contentType : "video/mp4",
      body: media.stream,
    },
    notifySubscribers: false,
  } as any);

  const videoId = upload.data.id || undefined;
  if (!videoId) throw new Error("YouTube upload returned no video ID");

  if (thumbnailUrl) {
    try {
      const thumb = await fetchMediaAsStream(thumbnailUrl);
      await youtube.thumbnails.set({
        videoId,
        media: {
          mimeType: thumb.contentType || "image/png",
          body: thumb.stream,
        },
      } as any);
    } catch (err: any) {
      logger.warn(`[GrowthAutopilot] Thumbnail upload failed for ${videoId}: ${err?.message}`);
    }
  }

  return {
    success: true,
    videoId,
    url: `https://youtube.com/watch?v=${videoId}`,
    title: idea.title,
    brand: idea.brand,
  };
}

async function runOneIdea(idea: GrowthIdea): Promise<PublishResult> {
  const video = await generateVideoUrl(idea);
  if (!video) {
    return { success: false, skipped: true, brand: idea.brand, title: idea.title, error: "No video asset generated; YouTube submission skipped" };
  }
  const thumbnailUrl = await generateThumbnailUrl(idea);
  return publishToYouTube(idea, video.videoUrl, thumbnailUrl);
}

export export async function runWeeklyGrowthAutopilot(options?: { force?: boolean; reason?: RunReason }): Promise<{
  skipped: boolean;
  reason: string;
  plan?: GrowthPlan;
  publishResults?: PublishResult[];
}> {
  const force = !!options?.force;
  const reason = options?.reason || "scheduled";

  if (!state.enabled && !force) {
    return { skipped: true, reason: "disabled" };
  }

  if (state.isRunning) {
    return { skipped: true, reason: "already_running" };
  }

  await loadPersistentState();
  if (!shouldRunNow(force)) {
    state.lastStatus = "skipped";
    return { skipped: true, reason: "weekly_interval_not_elapsed" };
  }

  state.isRunning = true;
  state.lastStatus = "running";
  state.lastError = null;
  state.youtubeConfigured = hasYouTubeOAuth();

  try {
    logger.info(`[GrowthAutopilot] Starting ${reason} cycle for Virelle/Swappys/VIBA → YouTube`);
    const plan = await generateGrowthPlan();
    state.latestPlan = plan;

    const publishableIdeas = [...plan.ideas]
      .sort((a, b) => Number(b.score || 0) - Number(a.score || 0))
      .slice(0, MAX_WEEKLY_VIDEOS);

    const publishResults: PublishResult[] = [];
    for (const idea of publishableIdeas) {
      try {
        const result = await runOneIdea(idea);
        publishResults.push(result);
      } catch (err: any) {
        publishResults.push({ success: false, brand: idea.brand, title: idea.title, error: err?.message || String(err) });
      }
    }

    state.latestPublishResults = publishResults;
    state.totalRuns += 1;
    state.lastRunAt = new Date().toISOString();

    const failures = publishResults.filter((r) => !r.success && !r.skipped);
    const skipped = publishResults.filter((r) => r.skipped);
    if (failures.length) {
      const message = failures.map((f) => `${f.brand}: ${f.error}`).join(" | ").slice(0, 1000);
      await persistState("failed", message);
      logger.warn(`[GrowthAutopilot] Cycle completed with failures: ${message}`);
    } else if (skipped.length === publishResults.length) {
      const message = skipped.map((s) => `${s.brand}: ${s.error}`).join(" | ").slice(0, 1000);
      await persistState("skipped", message);
      logger.warn(`[GrowthAutopilot] Cycle generated content but did not publish: ${message}`);
    } else {
      await persistState("success", null);
      logger.info(`[GrowthAutopilot] Cycle complete: ${publishResults.filter((r) => r.success).length} YouTube upload(s)`);
    }

    return { skipped: false, reason: "cycle_completed", plan, publishResults };
  } catch (err: any) {
    const message = String(err?.message || err).slice(0, 1000);
    state.lastError = message;
    await persistState("failed", message);
    logger.error(`[GrowthAutopilot] Cycle failed: ${message}`);
    return { skipped: false, reason: "failed", publishResults: [{ success: false, error: message }] };
  } finally {
    state.isRunning = false;
  }
}

async function scheduledCheck(reason: RunReason): Promise<void> {
  state.nextCheckAt = new Date(Date.now() + CHECK_EVERY_MS).toISOString();
  try {
    await runWeeklyGrowthAutopilot({ reason });
  } catch (err: any) {
    logger.error(`[GrowthAutopilot] Scheduled check failed: ${err?.message}`);
  }
}

export function startVirelleGrowthAutopilot(): void {
  if (scheduler || firstCheck) {
    logger.info("[GrowthAutopilot] Scheduler already active");
    return;
  }

  if (!state.enabled) {
    logger.info("[GrowthAutopilot] Disabled by VIRELLE_GROWTH_AUTOPILOT_ENABLED=false");
    return;
  }

  void loadPersistentState();
  state.youtubeConfigured = hasYouTubeOAuth();
  state.nextCheckAt = new Date(Date.now() + FIRST_CHECK_DELAY_MS).toISOString();

  logger.info(
    `[GrowthAutopilot] Enabled — weekly YouTube autopilot for ${YOUTUBE_ACCOUNT}; first check in ${Math.round(FIRST_CHECK_DELAY_MS / 60000)} min; excludes ${EXCLUDED_CHANNELS.join(", ")}`,
  );

  firstCheck = setTimeout(() => {
    firstCheck = null;
    void scheduledCheck("startup");
  }, FIRST_CHECK_DELAY_MS);
  firstCheck.unref?.();

  scheduler = setInterval(() => {
    void scheduledCheck("scheduled");
  }, CHECK_EVERY_MS);
  scheduler.unref?.();
}

export function stopVirelleGrowthAutopilot(): void {
  if (firstCheck) {
    clearTimeout(firstCheck);
    firstCheck = null;
  }
  if (scheduler) {
    clearInterval(scheduler);
    scheduler = null;
  }
  state.enabled = false;
  state.isRunning = false;
  logger.info("[GrowthAutopilot] Scheduler stopped");
}

export function getVirelleGrowthAutopilotState(): GrowthAutopilotState {
  state.youtubeConfigured = hasYouTubeOAuth();
  return { ...state };
}

export function registerGrowthAutopilotRoutes(app: Express): void {
  app.get("/api/growth-autopilot/status", requireAdminExpress, async (_req: Request, res: Response) => {
    await loadPersistentState();
    res.json({ ok: true, state: getVirelleGrowthAutopilotState() });
  });

  app.post("/api/growth-autopilot/run-now", requireAdminExpress, async (_req: Request, res: Response) => {
    const result = await runWeeklyGrowthAutopilot({ force: true, reason: "manual" });
    res.json({ ok: true, result, state: getVirelleGrowthAutopilotState() });
  });

  app.post("/api/growth-autopilot/stop", requireAdminExpress, (_req: Request, res: Response) => {
    stopVirelleGrowthAutopilot();
    res.json({ ok: true, state: getVirelleGrowthAutopilotState() });
  });

  app.post("/api/growth-autopilot/start", requireAdminExpress, (_req: Request, res: Response) => {
    state.enabled = true;
    startVirelleGrowthAutopilot();
    res.json({ ok: true, state: getVirelleGrowthAutopilotState() });
  });
}
