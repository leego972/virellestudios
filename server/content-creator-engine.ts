/**
 * VirÉlle Studios — Content Creator Engine v2.0
 *
 * AI-powered content generation system that bridges:
 *  - SEO Engine  → keyword-driven content briefs
 *  - Advertising Orchestrator → multi-channel distribution strategy
 *  - TikTok Content Service → organic TikTok posting pipeline
 *  - Marketing Engine → brand voice & campaign context
 *
 * Capabilities:
 *  1. Generate platform-optimised content for 15 channels
 *  2. SEO-first content briefs pulled from live keyword analysis
 *  3. TikTok carousel + video script generation with direct posting
 *  4. Quality scoring (SEO + engagement + brand alignment)
 *  5. Content calendar scheduling
 *  6. Bulk generation across all platforms for a campaign
 *  7. Analytics aggregation and performance insights
 *  8. Cinematic image generation in VirÉlle art style
 */

import { getDb } from "./db";
import { invokeLLM } from "./_core/llm";
import { generateImage } from "./_core/imageGeneration";
import { generateVideoWithFallback } from "./_core/videoGeneration";
import { storagePut } from "./storage";
import { logger } from "./_core/logger";
import { getErrorMessage } from "./_core/errors";
import {
  contentCreatorCampaigns,
  contentCreatorPieces,
  contentCreatorSchedules,
  contentCreatorAnalytics,
  marketingContent,
  marketingActivityLog,
  blogArticles,
} from "../drizzle/schema";
import { eq, desc, and, gte, sql, count } from "drizzle-orm";
import {
  generateContentBriefs,
  analyzeKeywords,
} from "./seo-engine";
import {
  postPhotos,
  postVideoByUrl,
  isTikTokContentConfigured,
  type TikTokPostResult,
} from "./tiktok-content-service";
import { getStrategyOverview } from "./advertising-orchestrator";

const log = logger;

// ─── Brand Context ─────────────────────────────────────────────────────────
const BRAND = {
  name: "VirÉlle Studios",
  tagline: "The World's Most Advanced AI Film Production Platform",
  website: "https://virelle.life",
  tone: "Cinematic, visionary, inspiring. Think Christopher Nolan meets Silicon Valley. Confident but accessible — democratising Hollywood-quality filmmaking for everyone.",
  keyFeatures: [
    "AI-powered film director assistant",
    "Photorealistic character generation with consistent identity",
    "Cinematic scene generation via Runway Gen-4 Turbo",
    "Professional voice acting via ElevenLabs",
    "Automated scriptwriting and storyboarding",
    "AI color grading and visual effects",
    "Complete film pipeline from concept to final render",
    "Cross-platform (Web + Desktop)",
  ],
  targetAudiences: [
    "Indie filmmakers and content creators",
    "Film students and aspiring directors",
    "Marketing agencies needing video content",
    "YouTubers and social media creators",
    "Small production studios",
    "Brands wanting cinematic ad content",
  ],
  competitors: ["Runway ML", "Pika Labs", "Sora", "Adobe Premiere", "DaVinci Resolve"],
  artStyle: {
    prefix: "Dark futuristic cyberpunk digital art, chrome-armored AI knight warrior with glowing blue eyes, deep navy midnight blue background with electric blue circuit patterns and digital particles, metallic silver armor with blue LED accents, bold metallic 3D text,",
    suffix: "high quality digital illustration, cinematic lighting, tech aesthetic, dark background with blue glow effects, professional marketing campaign art, film grain, anamorphic lens flares",
  },
  campaignImages: [
    "https://files.manuscdn.com/user_upload_by_module/session_file/310519663339631904/gvTVttaFEQstvWuh.png",
    "https://files.manuscdn.com/user_upload_by_module/session_file/310519663339631904/KeTLfaSXYpSzZYrC.png",
    "https://files.manuscdn.com/user_upload_by_module/session_file/310519663339631904/myFnaqFpXtIwMYmX.png",
    "https://files.manuscdn.com/user_upload_by_module/session_file/310519663339631904/UmexBzectsHuvsNd.png",
    "https://files.manuscdn.com/user_upload_by_module/session_file/310519663339631904/RGWrfdQoAtcdKjif.png",
    "https://files.manuscdn.com/user_upload_by_module/session_file/310519663339631904/eLBbWQGICiDYYbYD.png",
    "https://files.manuscdn.com/user_upload_by_module/session_file/310519663339631904/ZuWltnnHDFRmxrlQ.png",
    "https://files.manuscdn.com/user_upload_by_module/session_file/310519663339631904/bhGHYADVuNfLtkhV.png",
    "https://files.manuscdn.com/user_upload_by_module/session_file/310519663339631904/wZJrLqfQjumeUtkd.png",
  ],
  get defaultImage() {
    return this.campaignImages[Math.floor(Math.random() * this.campaignImages.length)];
  },
};

// ─── Platform Configuration ────────────────────────────────────────────────
export const PLATFORM_CONFIG: Record<string, {
  label: string;
  maxChars: number;
  maxHashtags: number;
  contentTypes: string[];
  guidelines: string;
  seoWeight: number;
}> = {
  tiktok: {
    label: "TikTok",
    maxChars: 2200,
    maxHashtags: 10,
    contentTypes: ["video_script", "photo_carousel"],
    guidelines: "Hook in first 3 seconds. Vertical format. Educational or entertaining. 15-60 seconds optimal. Use trending audio hooks. End with strong CTA. Film/cinematic content performs extremely well.",
    seoWeight: 0.3,
  },
  instagram: {
    label: "Instagram",
    maxChars: 2200,
    maxHashtags: 30,
    contentTypes: ["photo_carousel", "reel", "story", "social_post"],
    guidelines: "Visual-first. Carousel posts get highest engagement. Stories for urgency. Reels for reach. Strong opening line before 'more' fold. Behind-the-scenes film content resonates.",
    seoWeight: 0.2,
  },
  x_twitter: {
    label: "X (Twitter)",
    maxChars: 280,
    maxHashtags: 3,
    contentTypes: ["social_post", "thread"],
    guidelines: "Punchy, direct, opinionated. Threads for depth. Engage with replies. Film tech and AI audience appreciates real insights and demos.",
    seoWeight: 0.4,
  },
  linkedin: {
    label: "LinkedIn",
    maxChars: 3000,
    maxHashtags: 5,
    contentTypes: ["social_post", "ad_copy"],
    guidelines: "Thought leadership tone. Personal insights perform well. B2B angle for production companies and marketing agencies. No fluff.",
    seoWeight: 0.6,
  },
  reddit: {
    label: "Reddit",
    maxChars: 40000,
    maxHashtags: 0,
    contentTypes: ["social_post"],
    guidelines: "Authentic, value-first. No hard selling. Community-appropriate tone. r/filmmaking, r/videoproduction, r/artificial, r/MachineLearning.",
    seoWeight: 0.5,
  },
  facebook: {
    label: "Facebook",
    maxChars: 63206,
    maxHashtags: 5,
    contentTypes: ["social_post", "ad_copy"],
    guidelines: "Conversational tone. Behind-the-scenes content works well. Video gets priority reach. Groups for filmmaking community building.",
    seoWeight: 0.2,
  },
  youtube_shorts: {
    label: "YouTube Shorts",
    maxChars: 5000,
    maxHashtags: 15,
    contentTypes: ["video_script", "reel"],
    guidelines: "Vertical 9:16 format. Under 60 seconds. Hook in first 2 seconds. Tutorial-style content performs best. Strong thumbnail concept. Film tips and AI demos.",
    seoWeight: 0.7,
  },
  blog: {
    label: "Blog",
    maxChars: 100000,
    maxHashtags: 0,
    contentTypes: ["blog_article"],
    guidelines: "800-2500 words. SEO-optimised with focus keyword. H2/H3 structure. Include workflow examples. Link to product features naturally. Film industry angle.",
    seoWeight: 1.0,
  },
  email: {
    label: "Email",
    maxChars: 10000,
    maxHashtags: 0,
    contentTypes: ["email_campaign"],
    guidelines: "Subject line under 50 chars. Preview text under 90 chars. Clear CTA button. Mobile-first. Personalisation tokens where possible.",
    seoWeight: 0.1,
  },
  pinterest: {
    label: "Pinterest",
    maxChars: 500,
    maxHashtags: 20,
    contentTypes: ["infographic", "social_post"],
    guidelines: "Vertical image 2:3 ratio. SEO-rich descriptions. Keywords in title. Actionable content. Link to landing page. Film aesthetics and mood boards.",
    seoWeight: 0.6,
  },
  discord: {
    label: "Discord",
    maxChars: 2000,
    maxHashtags: 0,
    contentTypes: ["social_post"],
    guidelines: "Community-first. Value before promotion. Share tools, tips, and insights. Engage in filmmaking and AI art servers.",
    seoWeight: 0.1,
  },
  telegram: {
    label: "Telegram",
    maxChars: 4096,
    maxHashtags: 5,
    contentTypes: ["social_post"],
    guidelines: "Broadcast channel style. Product updates, film tips, new features. Concise and actionable.",
    seoWeight: 0.1,
  },
  medium: {
    label: "Medium",
    maxChars: 100000,
    maxHashtags: 5,
    contentTypes: ["blog_article"],
    guidelines: "Republish blog posts with canonical URLs. 5-10 min read. Technical depth appreciated. Film + AI intersection content. 100M+ monthly readers.",
    seoWeight: 0.8,
  },
  hackernews: {
    label: "Hacker News",
    maxChars: 10000,
    maxHashtags: 0,
    contentTypes: ["social_post"],
    guidelines: "Technical, concise, no marketing speak. HN audience hates fluff. Show HN format for product launches. Focus on the AI/ML innovation angle.",
    seoWeight: 0.9,
  },
  whatsapp: {
    label: "WhatsApp",
    maxChars: 4096,
    maxHashtags: 0,
    contentTypes: ["social_post"],
    guidelines: "Broadcast to opted-in subscribers. Product updates, weekly film tips, new features. Conversational tone.",
    seoWeight: 0.1,
  },
};

// ─── Content Quality Scorer ────────────────────────────────────────────────
export function scoreContentQuality(params: {
  body: string;
  platform: string;
  seoKeywords?: string[];
  hashtags?: string[];
  callToAction?: string;
  hook?: string;
}): number {
  let score = 50;
  const config = PLATFORM_CONFIG[params.platform];
  if (!config) return score;

  const len = params.body.length;
  if (len > 50 && len <= config.maxChars) score += 10;
  if (len > config.maxChars * 0.5) score += 5;

  if (params.callToAction && params.callToAction.length > 5) score += 10;
  if (params.hook && params.hook.length > 10) score += 10;

  if (params.seoKeywords && params.seoKeywords.length > 0) {
    const bodyLower = params.body.toLowerCase();
    const matchCount = params.seoKeywords.filter(kw => bodyLower.includes(kw.toLowerCase())).length;
    score += Math.min(matchCount * 5, 15);
  }

  if (params.hashtags && params.hashtags.length > 0) {
    if (params.hashtags.length <= config.maxHashtags) score += 5;
    if (params.hashtags.length >= 3 && params.hashtags.length <= config.maxHashtags) score += 5;
  }

  if (params.body.toLowerCase().includes("virelle") || params.body.toLowerCase().includes("virÉlle")) {
    score += 5;
  }

  return Math.min(score, 100);
}

// ─── SEO Score for Content ─────────────────────────────────────────────────
export function scoreSeoContent(params: {
  body: string;
  title?: string;
  seoKeywords?: string[];
  platform: string;
}): number {
  const config = PLATFORM_CONFIG[params.platform];
  if (!config) return 0;

  let score = 0;
  const bodyLower = params.body.toLowerCase();
  const titleLower = (params.title || "").toLowerCase();

  score += config.seoWeight * 30;

  if (params.seoKeywords && params.title) {
    const titleMatches = params.seoKeywords.filter(kw => titleLower.includes(kw.toLowerCase())).length;
    score += Math.min(titleMatches * 10, 20);
  }

  if (params.seoKeywords) {
    const bodyMatches = params.seoKeywords.filter(kw => bodyLower.includes(kw.toLowerCase())).length;
    score += Math.min(bodyMatches * 5, 30);
  }

  if (["blog", "medium", "linkedin", "hackernews"].includes(params.platform)) {
    if (params.body.length > 500) score += 10;
    if (params.body.length > 1500) score += 10;
  }

  return Math.min(Math.round(score), 100);
}

// ─── Core Content Generation ───────────────────────────────────────────────
export interface GenerateContentParams {
  platform: string;
  contentType: string;
  topic?: string;
  campaignObjective?: string;
  seoKeywords?: string[];
  targetAudience?: string;
  brandVoice?: string;
  includeImage?: boolean;
  campaignId?: number;
}

export interface GeneratedContent {
  platform: string;
  contentType: string;
  title?: string;
  headline?: string;
  body: string;
  callToAction?: string;
  hashtags: string[];
  hook?: string;
  videoScript?: string;
  visualDirections?: string[];
  imagePrompt?: string;
  mediaUrl?: string;
  seoKeywords: string[];
  seoScore: number;
  qualityScore: number;
  generationMs: number;
}

export async function generateCreatorContent(
  params: GenerateContentParams
): Promise<GeneratedContent> {
  const startMs = Date.now();
  const config = PLATFORM_CONFIG[params.platform] || PLATFORM_CONFIG.x_twitter;
  const keywords = params.seoKeywords || [];

  const systemPrompt = `You are the head of content for ${BRAND.name} — ${BRAND.tagline}.

BRAND VOICE: ${params.brandVoice || BRAND.tone}

KEY FEATURES TO PROMOTE:
${BRAND.keyFeatures.map(f => `• ${f}`).join("\n")}

TARGET AUDIENCES:
${BRAND.targetAudiences.map(a => `• ${a}`).join("\n")}

WEBSITE: ${BRAND.website}
COMPETITORS: ${BRAND.competitors.join(", ")}

PLATFORM: ${config.label}
PLATFORM GUIDELINES: ${config.guidelines}
MAX CHARACTERS: ${config.maxChars}
MAX HASHTAGS: ${config.maxHashtags}

SEO KEYWORDS TO INCORPORATE: ${keywords.length > 0 ? keywords.join(", ") : "Use relevant AI filmmaking and cinematic production keywords naturally"}

QUALITY STANDARDS:
- Never be generic — every piece must feel authentic and cinematically credible
- Lead with value, not promotion
- Use real filmmaking terminology our audience understands
- Include specific, concrete benefits
- End with a clear, compelling call to action
- For video content: hook must grab attention in under 3 seconds
- Emphasise the democratisation of filmmaking — anyone can now make Hollywood-quality films

Return valid JSON only. No markdown, no explanation.`;

  const isVideo = ["video_script", "reel"].includes(params.contentType);
  const isCarousel = ["photo_carousel", "infographic"].includes(params.contentType);

  const userPrompt = `Create a ${params.contentType} for ${config.label}.
${params.topic ? `TOPIC/ANGLE: ${params.topic}` : "Choose the most compelling angle for our audience."}
${params.campaignObjective ? `CAMPAIGN OBJECTIVE: ${params.campaignObjective}` : ""}
${params.targetAudience ? `TARGET AUDIENCE: ${params.targetAudience}` : ""}

Generate the content now. Make it genuinely compelling — cinematic, not corporate fluff.`;

  const schema = {
    type: "object" as const,
    properties: {
      title: { type: "string" as const },
      headline: { type: "string" as const },
      body: { type: "string" as const },
      callToAction: { type: "string" as const },
      hashtags: { type: "array" as const, items: { type: "string" as const } },
      hook: { type: "string" as const },
      videoScript: { type: "string" as const },
      visualDirections: { type: "array" as const, items: { type: "string" as const } },
      imagePrompt: { type: "string" as const },
    },
    required: ["title", "headline", "body", "callToAction", "hashtags", "hook", "videoScript", "visualDirections", "imagePrompt"],
    additionalProperties: false,
  };

  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: { name: "content_piece", strict: true, schema },
    },
  });

  const raw = response.choices?.[0]?.message?.content;
  const parsed = JSON.parse(typeof raw === "string" ? raw : "{}");

  let body = (parsed.body || "") as string;
  if (body.length > config.maxChars) {
    body = body.slice(0, config.maxChars - 3) + "...";
  }

  let hashtags = (parsed.hashtags || []) as string[];
  if (hashtags.length > config.maxHashtags && config.maxHashtags > 0) {
    hashtags = hashtags.slice(0, config.maxHashtags);
  }

  let mediaUrl: string | undefined;
  if (params.includeImage && parsed.imagePrompt) {
    try {
      const styledPrompt = `${BRAND.artStyle.prefix} ${parsed.imagePrompt}. ${BRAND.artStyle.suffix}. No text in image.`;
      const imgResult = await generateImage({
        prompt: styledPrompt,
        originalImages: [{ url: BRAND.defaultImage, mimeType: "image/png" }],
      });
      if (imgResult?.url) {
        // Upload to permanent storage
        try {
          const resp = await fetch(imgResult.url);
          const buf = Buffer.from(await resp.arrayBuffer());
          const key = `content-creator/${params.platform}/${Date.now()}.png`;
          const { url: s3Url } = await storagePut(key, buf, "image/png");
          mediaUrl = s3Url;
        } catch {
          mediaUrl = imgResult.url;
        }
      }
    } catch (err) {
      log.warn("[ContentCreator] Image generation failed, using fallback:", { error: getErrorMessage(err) });
      mediaUrl = BRAND.defaultImage;
    }
  }

  const seoScore = scoreSeoContent({
    body,
    title: parsed.title,
    seoKeywords: keywords,
    platform: params.platform,
  });

  const qualityScore = scoreContentQuality({
    body,
    platform: params.platform,
    seoKeywords: keywords,
    hashtags,
    callToAction: parsed.callToAction,
    hook: parsed.hook,
  });

  return {
    platform: params.platform,
    contentType: params.contentType,
    title: parsed.title,
    headline: parsed.headline,
    body,
    callToAction: parsed.callToAction,
    hashtags,
    hook: parsed.hook,
    videoScript: parsed.videoScript || undefined,
    visualDirections: parsed.visualDirections?.length ? parsed.visualDirections : undefined,
    imagePrompt: parsed.imagePrompt,
    mediaUrl,
    seoKeywords: keywords,
    seoScore,
    qualityScore,
    generationMs: Date.now() - startMs,
  };
}

// ─── SEO-Driven Content Brief Generation ──────────────────────────────────
export interface ContentCreatorBrief {
  topic: string;
  targetKeyword: string;
  secondaryKeywords: string[];
  recommendedPlatforms: string[];
  contentTypes: string[];
  angle: string;
  estimatedImpact: "high" | "medium" | "low";
  seoOpportunity: string;
}

export async function generateSeoContentBriefs(count = 5): Promise<ContentCreatorBrief[]> {
  try {
    const [seoBriefs, keywordData] = await Promise.allSettled([
      generateContentBriefs(count),
      analyzeKeywords(),
    ]);

    const briefs = seoBriefs.status === "fulfilled" ? seoBriefs.value : [];
    const keywords = keywordData.status === "fulfilled" ? keywordData.value : null;

    const creatorBriefs: ContentCreatorBrief[] = briefs.map((brief: any) => ({
      topic: brief.title,
      targetKeyword: brief.targetKeyword,
      secondaryKeywords: brief.secondaryKeywords || [],
      recommendedPlatforms: ["blog", "linkedin", "x_twitter", "tiktok", "youtube_shorts"],
      contentTypes: ["blog_article", "social_post", "video_script"],
      angle: brief.outline?.[0] || "Educational deep-dive for filmmakers",
      estimatedImpact: "high" as const,
      seoOpportunity: `Target keyword: "${brief.targetKeyword}" — ${brief.intent} intent`,
    }));

    if (keywords && (keywords as any).contentGaps?.length > 0) {
      for (const gap of (keywords as any).contentGaps.slice(0, Math.max(0, count - creatorBriefs.length))) {
        creatorBriefs.push({
          topic: gap,
          targetKeyword: gap.toLowerCase(),
          secondaryKeywords: (keywords as any).competitorKeywords?.slice(0, 3) || [],
          recommendedPlatforms: ["blog", "linkedin", "hackernews", "reddit"],
          contentTypes: ["blog_article", "social_post"],
          angle: "Fill content gap vs competitors",
          estimatedImpact: "medium" as const,
          seoOpportunity: `Content gap identified — competitors rank for this topic`,
        });
      }
    }

    return creatorBriefs.slice(0, count);
  } catch (err) {
    log.error("[ContentCreator] Failed to generate SEO briefs:", { error: getErrorMessage(err) });
    return [];
  }
}

// ─── Bulk Campaign Generation ──────────────────────────────────────────────
export interface BulkGenerateParams {
  campaignId: number;
  platforms: string[];
  topic?: string;
  seoKeywords?: string[];
  includeImages?: boolean;
  campaignObjective?: string;
}

export interface BulkGenerateResult {
  success: boolean;
  generated: number;
  failed: number;
  pieces: Array<{ platform: string; contentType: string; id?: number; error?: string }>;
}

export async function bulkGenerateForCampaign(
  params: BulkGenerateParams
): Promise<BulkGenerateResult> {
  const db = await getDb();
  if (!db) return { success: false, generated: 0, failed: 0, pieces: [] };

  const results: BulkGenerateResult["pieces"] = [];
  let generated = 0;
  let failed = 0;

  for (const platform of params.platforms) {
    const config = PLATFORM_CONFIG[platform];
    if (!config) continue;

    const contentType = config.contentTypes[0];

    try {
      const content = await generateCreatorContent({
        platform,
        contentType,
        topic: params.topic,
        seoKeywords: params.seoKeywords,
        includeImage: params.includeImages,
        campaignId: params.campaignId,
        campaignObjective: params.campaignObjective,
      });

      const [inserted] = await db.insert(contentCreatorPieces).values({
        campaignId: params.campaignId,
        platform: platform as any,
        contentType: contentType as any,
        title: content.title,
        body: content.body,
        headline: content.headline,
        callToAction: content.callToAction,
        hashtags: content.hashtags,
        mediaUrl: content.mediaUrl,
        imagePrompt: content.imagePrompt,
        hook: content.hook,
        videoScript: content.videoScript,
        visualDirections: content.visualDirections,
        seoKeywords: content.seoKeywords,
        seoScore: content.seoScore,
        qualityScore: content.qualityScore,
        status: "draft",
        aiPrompt: params.topic || "Bulk generation",
        aiModel: "gpt-4.1-mini",
        generationMs: content.generationMs,
      } as any);

      results.push({ platform, contentType, id: (inserted as any).insertId });
      generated++;

      await new Promise(r => setTimeout(r, 500));
    } catch (err) {
      log.error(`[ContentCreator] Failed to generate for ${platform}:`, { error: getErrorMessage(err) });
      results.push({ platform, contentType, error: getErrorMessage(err) });
      failed++;
    }
  }

  await db.update(contentCreatorCampaigns)
    .set({ totalPieces: sql`totalPieces + ${generated}` })
    .where(eq(contentCreatorCampaigns.id, params.campaignId));

  return { success: generated > 0, generated, failed, pieces: results };
}

// ─── TikTok Integration ────────────────────────────────────────────────────
export interface TikTokPublishParams {
  pieceId: number;
  privacyLevel?: string;
}

export interface TikTokPublishResult {
  success: boolean;
  publishId?: string;
  error?: string;
  action: "posted" | "queued" | "failed";
}

export async function publishPieceToTikTok(
  params: TikTokPublishParams
): Promise<TikTokPublishResult> {
  const db = await getDb();
  if (!db) return { success: false, error: "Database unavailable", action: "failed" };

  const pieces = await db.select().from(contentCreatorPieces)
    .where(eq(contentCreatorPieces.id, params.pieceId))
    .limit(1);

  const piece = pieces[0];
  if (!piece) return { success: false, error: "Content piece not found", action: "failed" };

  let postResult: TikTokPostResult;

  if (piece.contentType === "photo_carousel") {
    const imageUrls: string[] = [];
    if (piece.mediaUrl) imageUrls.push(piece.mediaUrl);

    if (piece.visualDirections && (piece.visualDirections as string[]).length > 0 && imageUrls.length < 3) {
      const directions = piece.visualDirections as string[];
      for (const direction of directions.slice(0, 5 - imageUrls.length)) {
        try {
          const styledPrompt = `${BRAND.artStyle.prefix} ${direction}. ${BRAND.artStyle.suffix}. No text in image.`;
          const img = await generateImage({
            prompt: styledPrompt,
            originalImages: [{ url: BRAND.defaultImage, mimeType: "image/png" }],
          });
          if (img?.url) imageUrls.push(img.url);
        } catch (err) {
          log.warn("[ContentCreator] Carousel slide generation failed:", { error: getErrorMessage(err) });
        }
      }
    }

    if (imageUrls.length === 0) {
      return { success: false, error: "No images available for carousel", action: "failed" };
    }

    if (isTikTokContentConfigured()) {
      const hashtags = (piece.hashtags as string[] || []).map(h => h.startsWith("#") ? h : `#${h}`).join(" ");
      const caption = `${piece.title || piece.headline || ""}\n\n${piece.body.slice(0, 1500)}\n\n${hashtags}`;
      postResult = await postPhotos({
        photoUrls: imageUrls,
        title: caption.slice(0, 2200),
        description: piece.body.slice(0, 500),
        autoAddMusic: true,
        privacyLevel: params.privacyLevel || "PUBLIC_TO_EVERYONE",
      });
    } else {
      postResult = { success: false, error: "TikTok Content Posting API not configured" };
    }
  } else if (piece.contentType === "video_script" && piece.mediaUrl) {
    if (isTikTokContentConfigured()) {
      const hashtags = (piece.hashtags as string[] || []).map(h => h.startsWith("#") ? h : `#${h}`).join(" ");
      const caption = `${piece.title || ""}\n\n${hashtags}`;
      postResult = await postVideoByUrl({
        videoUrl: piece.mediaUrl,
        title: caption.slice(0, 2200),
        privacyLevel: params.privacyLevel || "PUBLIC_TO_EVERYONE",
      });
    } else {
      postResult = { success: false, error: "TikTok Content Posting API not configured" };
    }
  } else {
    return { success: false, error: "Content type not supported for TikTok posting or no media URL", action: "failed" };
  }

  const newStatus = postResult.success ? "published" : "approved";
  await db.update(contentCreatorPieces).set({
    status: newStatus as any,
    publishedAt: postResult.success ? new Date() : undefined,
    tiktokPublishId: postResult.publishId,
    externalPostId: postResult.publishId,
  }).where(eq(contentCreatorPieces.id, params.pieceId));

  if (postResult.success) {
    await db.insert(marketingContent).values({
      platform: "tiktok",
      type: "organic_post",
      headline: piece.title || piece.headline || "TikTok Post",
      body: piece.body,
      imageUrl: piece.mediaUrl,
      status: "published",
      publishedAt: new Date(),
      platformPostId: postResult.publishId,
    } as any);

    await db.insert(marketingActivityLog).values({
      action: "content_creator_tiktok_post",
      description: `TikTok post published via Content Creator: "${piece.title || piece.headline || "Untitled"}"`,
      metadata: { pieceId: params.pieceId, publishId: postResult.publishId, title: piece.title },
    } as any);
  }

  return {
    success: postResult.success,
    publishId: postResult.publishId,
    error: postResult.error,
    action: postResult.success ? "posted" : (postResult.error?.includes("not configured") ? "queued" : "failed"),
  };
}

// ─── Dashboard Overview ────────────────────────────────────────────────────
export async function getContentCreatorDashboard() {
  const db = await getDb();
  if (!db) {
    return {
      totalCampaigns: 0, activeCampaigns: 0, totalPieces: 0,
      publishedPieces: 0, draftPieces: 0, scheduledPieces: 0,
      totalImpressions: 0, totalClicks: 0, totalEngagements: 0,
      recentPieces: [], topPerformingPieces: [], platformBreakdown: {},
      campaigns: [], tiktokConfigured: isTikTokContentConfigured(), advertisingLinked: false,
    };
  }

  const [campaigns, allPieces] = await Promise.all([
    db.select().from(contentCreatorCampaigns).orderBy(desc(contentCreatorCampaigns.createdAt)).limit(50),
    db.select().from(contentCreatorPieces).orderBy(desc(contentCreatorPieces.createdAt)).limit(200),
  ]);

  const activeCampaigns = campaigns.filter(c => c.status === "active").length;
  const publishedPieces = allPieces.filter(p => p.status === "published").length;
  const draftPieces = allPieces.filter(p => p.status === "draft").length;
  const scheduledPieces = allPieces.filter(p => p.status === "scheduled").length;
  const totalImpressions = allPieces.reduce((s, p) => s + p.impressions, 0);
  const totalClicks = allPieces.reduce((s, p) => s + p.clicks, 0);
  const totalEngagements = allPieces.reduce((s, p) => s + p.engagements, 0);

  const platformBreakdown: Record<string, number> = {};
  for (const piece of allPieces) {
    platformBreakdown[piece.platform] = (platformBreakdown[piece.platform] || 0) + 1;
  }

  const topPerformingPieces = [...allPieces]
    .sort((a, b) => (b.impressions + b.engagements) - (a.impressions + a.engagements))
    .slice(0, 5);

  let advertisingLinked = false;
  try {
    const overview = getStrategyOverview();
    advertisingLinked = !!(overview && (overview as any).monthlyBudget > 0);
  } catch {}

  return {
    totalCampaigns: campaigns.length,
    activeCampaigns,
    totalPieces: allPieces.length,
    publishedPieces,
    draftPieces,
    scheduledPieces,
    totalImpressions,
    totalClicks,
    totalEngagements,
    recentPieces: allPieces.slice(0, 10),
    topPerformingPieces,
    platformBreakdown,
    campaigns: campaigns.slice(0, 10),
    tiktokConfigured: isTikTokContentConfigured(),
    advertisingLinked,
  };
}

// ─── Content Scheduling ────────────────────────────────────────────────────
export async function scheduleContentPiece(params: {
  pieceId: number;
  scheduledAt: Date;
  campaignId?: number;
}): Promise<{ success: boolean; scheduleId?: number; error?: string }> {
  const db = await getDb();
  if (!db) return { success: false, error: "Database unavailable" };

  const pieces = await db.select().from(contentCreatorPieces)
    .where(eq(contentCreatorPieces.id, params.pieceId)).limit(1);

  if (!pieces[0]) return { success: false, error: "Piece not found" };

  await db.update(contentCreatorPieces).set({
    status: "scheduled",
    scheduledAt: params.scheduledAt,
  }).where(eq(contentCreatorPieces.id, params.pieceId));

  const [result] = await db.insert(contentCreatorSchedules).values({
    pieceId: params.pieceId,
    campaignId: params.campaignId,
    platform: pieces[0].platform,
    scheduledAt: params.scheduledAt,
    status: "pending",
  } as any);

  return { success: true, scheduleId: (result as any).insertId };
}

// ─── Process Due Schedules ─────────────────────────────────────────────────
export async function processDueSchedules(): Promise<{
  processed: number;
  published: number;
  failed: number;
}> {
  const db = await getDb();
  if (!db) return { processed: 0, published: 0, failed: 0 };

  const now = new Date();
  const dueSchedules = await db.select().from(contentCreatorSchedules)
    .where(and(
      eq(contentCreatorSchedules.status, "pending"),
      sql`${contentCreatorSchedules.scheduledAt} <= ${now}`,
    ))
    .limit(10);

  let published = 0;
  let failed = 0;

  for (const schedule of dueSchedules) {
    await db.update(contentCreatorSchedules).set({ status: "processing" })
      .where(eq(contentCreatorSchedules.id, schedule.id));

    try {
      if (schedule.platform === "tiktok") {
        const result = await publishPieceToTikTok({ pieceId: schedule.pieceId });
        if (result.success) {
          await db.update(contentCreatorSchedules).set({ status: "published", publishedAt: new Date() })
            .where(eq(contentCreatorSchedules.id, schedule.id));
          published++;
        } else {
          throw new Error(result.error || "TikTok post failed");
        }
      } else {
        await db.update(contentCreatorSchedules).set({ status: "published", publishedAt: new Date() })
          .where(eq(contentCreatorSchedules.id, schedule.id));
        await db.update(contentCreatorPieces).set({ status: "published", publishedAt: new Date() })
          .where(eq(contentCreatorPieces.id, schedule.pieceId));
        published++;
      }
    } catch (err) {
      const retryCount = schedule.retryCount + 1;
      const shouldRetry = retryCount < schedule.maxRetries;
      await db.update(contentCreatorSchedules).set({
        status: shouldRetry ? "pending" : "failed",
        retryCount,
        failReason: getErrorMessage(err),
        scheduledAt: shouldRetry ? new Date(Date.now() + 15 * 60 * 1000) : schedule.scheduledAt,
      }).where(eq(contentCreatorSchedules.id, schedule.id));
      failed++;
    }
  }

  return { processed: dueSchedules.length, published, failed };
}

// ─── AI Strategy Generator ─────────────────────────────────────────────────
export async function generateCampaignStrategy(params: {
  name: string;
  objective: string;
  platforms: string[];
  targetAudience?: string;
}): Promise<string> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a senior content strategist for ${BRAND.name}. Generate a concise, actionable content campaign strategy for an AI film production platform. Return plain text, max 400 words.`,
      },
      {
        role: "user",
        content: `Campaign: "${params.name}"
Objective: ${params.objective}
Platforms: ${params.platforms.join(", ")}
Target Audience: ${params.targetAudience || "Indie filmmakers, content creators, and film students"}

Generate a focused content strategy including: key messaging pillars, content mix per platform, posting frequency, and success metrics.`,
      },
    ],
  });

  return response.choices?.[0]?.message?.content as string || "Strategy generation failed.";
}

// ─── Legacy: Backward-compatible single-job API ────────────────────────────
export type AdPlatform = "instagram" | "tiktok" | "facebook" | "x_twitter" | "linkedin" | "youtube_shorts" | "pinterest";
export type ContentFormat = "image_post" | "video_reel" | "story" | "carousel" | "banner_ad";

export interface ContentCreatorResult {
  success: boolean;
  contentId?: number;
  imageUrl?: string;
  videoUrl?: string;
  caption?: string;
  hashtags?: string[];
  platform: string;
  error?: string;
}

export async function runContentCreatorJob(
  platform: AdPlatform,
  options: { theme?: string; generateVideo?: boolean; blogPostSlug?: string } = {}
): Promise<ContentCreatorResult> {
  log.info(`[ContentCreator] Starting job for platform: ${platform}`);

  let theme = options.theme;
  if (!theme && options.blogPostSlug) {
    const db = await getDb();
    if (db) {
      const posts = await db
        .select({ title: blogArticles.title, excerpt: blogArticles.excerpt })
        .from(blogArticles)
        .where(eq(blogArticles.slug, options.blogPostSlug))
        .limit(1);
      if (posts[0]) theme = `${posts[0].title}: ${posts[0].excerpt || ""}`;
    }
  }

  const content = await generateCreatorContent({
    platform,
    contentType: PLATFORM_CONFIG[platform]?.contentTypes[0] || "social_post",
    topic: theme,
    includeImage: true,
  });

  const db = await getDb();
  let contentId: number | undefined;
  if (db) {
    const [result] = await db.insert(marketingContent).values({
      platform,
      type: "organic_post",
      headline: content.headline || content.title || "",
      body: content.body,
      imageUrl: content.mediaUrl,
      status: "approved",
    } as any);
    contentId = (result as any).insertId;

    await db.insert(marketingActivityLog).values({
      action: "content_created",
      description: `Content created for ${platform}: "${content.headline || content.title}"`,
      metadata: { contentId, platform, theme, hasImage: !!content.mediaUrl },
    } as any);
  }

  const caption = `${content.hook || ""}\n\n${content.body.slice(0, 1500)}\n\n${content.callToAction || ""}`;
  return { success: true, contentId, imageUrl: content.mediaUrl, caption, hashtags: content.hashtags, platform };
}

export async function runContentCreatorBatch(
  platforms: AdPlatform[] = ["instagram", "tiktok", "facebook", "x_twitter"],
  options: { generateVideo?: boolean; theme?: string } = {}
): Promise<ContentCreatorResult[]> {
  log.info(`[ContentCreator] Running batch for platforms: ${platforms.join(", ")}`);
  const results: ContentCreatorResult[] = [];
  for (const platform of platforms) {
    try {
      const result = await runContentCreatorJob(platform, options);
      results.push(result);
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (err) {
      log.error(`[ContentCreator] Batch job failed for ${platform}:`, { error: getErrorMessage(err) });
      results.push({ success: false, platform, error: getErrorMessage(err) });
    }
  }
  return results;
}

export async function getContentCreatorStats(): Promise<{
  totalCreated: number;
  byPlatform: Record<string, number>;
  recentContent: Array<{ id: number; platform: string; headline: string; status: string; hasVideo: boolean; createdAt: Date }>;
}> {
  const db = await getDb();
  if (!db) return { totalCreated: 0, byPlatform: {}, recentContent: [] };

  const allContent = await db.select().from(marketingContent).orderBy(desc(marketingContent.createdAt)).limit(100);
  const byPlatform: Record<string, number> = {};
  for (const c of allContent) {
    byPlatform[c.platform] = (byPlatform[c.platform] || 0) + 1;
  }

  return {
    totalCreated: allContent.length,
    byPlatform,
    recentContent: allContent.slice(0, 20).map(c => ({
      id: c.id as number,
      platform: c.platform,
      headline: c.headline || "Untitled",
      status: c.status,
      hasVideo: !!(c as any).videoUrl,
      createdAt: c.createdAt,
    })),
  };
}
