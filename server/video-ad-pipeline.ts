// Video Ad Pipeline — Virelle Studios
// Cascade: Pollinations (free, built-in keys) → Runway ML → fal.ai → Replicate
// TikTok: portrait 9:16 | YouTube: landscape 16:9
// Add Railway env vars to enable posting:
//   TikTok  : TIKTOK_CREATOR_TOKEN + TIKTOK_ACCESS_TOKEN
//   YouTube : YOUTUBE_CLIENT_ID + YOUTUBE_CLIENT_SECRET + YOUTUBE_REFRESH_TOKEN

import { generateVideo as byokGenerateVideo } from "./_core/byokVideoEngine";
import type { UserApiKeys } from "./_core/byokVideoEngine";
import { generateCarouselImages, postVideoByUrl, postPhotos, isTikTokContentConfigured } from "./tiktok-content-service";
import { uploadVideoToYouTube, isYouTubeConfigured } from "./youtube-service";
import { invokeLLM } from "./_core/llm";
import { getDb } from "./db";
import { marketingContent } from "../drizzle/schema";
import { logger } from "./_core/logger";
import { getErrorMessage } from "./_core/errors.js";

const log = logger;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface VideoAdScene {
  visualPrompt: string;
  voiceover: string;
  durationSeconds: number;
}

export interface VideoAdScript {
  headline: string;
  hook: string;
  scenes: VideoAdScene[];
  cta: string;
  hashtags: string[];
  platform: string;
}

export interface VideoAdResult {
  status: "posted" | "generated" | "failed" | "no_credentials";
  platform: string;
  videoUrl?: string;
  tiktokPublishId?: string;
  youtubeVideoId?: string;
  youtubeUrl?: string;
  script?: VideoAdScript;
  error?: string;
  details: string;
}

// ─── Ad Themes ───────────────────────────────────────────────────────────────

export const AD_THEMES = [
  { theme: "AI Filmmaking Revolution",       angle: "You no longer need a film crew to make a cinematic short film",     cta: "Make your film free at virelle.life" },
  { theme: "Script to Screen in Minutes",    angle: "Type your story and watch it become a film",                        cta: "Try it free at virelle.life" },
  { theme: "Indie Film Budget Breakthrough", angle: "Traditional indie film costs $50K+. With Virelle, start for free.", cta: "Start free at virelle.life" },
  { theme: "AI Character Generation",        angle: "Create cinematic characters with consistent faces across every scene", cta: "Generate your cast at virelle.life" },
  { theme: "Film Festival Ready",            angle: "AI films are winning festivals. Yours could be next.",               cta: "Start your project at virelle.life" },
  { theme: "Screenwriter's Dream",           angle: "Your screenplay deserves to be seen, not just read",                cta: "Visualise your script at virelle.life" },
];

// ─── Script Generation ───────────────────────────────────────────────────────

async function generateAdScript(
  platform: "tiktok" | "youtube",
  theme: (typeof AD_THEMES)[number]
): Promise<VideoAdScript> {
  const isTikTok = platform === "tiktok";
  const sceneCount = isTikTok ? 3 : 4;
  const duration  = isTikTok ? "15-30 seconds (3 scenes)" : "30-45 seconds (4 scenes)";
  const format    = isTikTok ? "portrait 9:16, mobile-first" : "landscape 16:9, cinematic";
  
  const sysMsg = [
    "You are a cinematic ad director for Virelle Studios, an AI filmmaking SaaS.",
    "Create a short " + platform + " video ad — premium and cinematic, never salesy.",
    "Format: " + format + ", " + duration + ", " + sceneCount + " scenes.",
    "Each scene: (1) detailed AI video prompt with camera movement + lighting, (2) brief voiceover.",
    "Visual prompts go directly into Runway/Pollinations AI — be specific and cinematic.",
    "Return valid JSON only.",
  ].join("\n");
  
  const userMsg = [
    "Create a " + platform + " video ad for Virelle Studios.",
    'Theme: "' + theme.theme + '"',
    'Angle: "' + theme.angle + '"',
    'CTA: "' + theme.cta + '"',
    "Generate " + sceneCount + " cinematic scenes.",
  ].join("\n");
  
  const response = await invokeLLM({
    systemTag: "advertising",
    model: "fast",
    messages: [
      { role: "system", content: sysMsg },
      { role: "user",   content: userMsg },
    ],
    response_format: {
        type: "json_schema",
        json_schema: {
          name: "video_ad_script",
          strict: true,
          schema: {
            type: "object",
            properties: {
              headline: { type: "string" },
              hook:     { type: "string" },
              scenes: { type: "array", items: { type: "object",
                properties: { visualPrompt: { type: "string" }, voiceover: { type: "string" }, durationSeconds: { type: "number" } },
                required: ["visualPrompt", "voiceover", "durationSeconds"], additionalProperties: false } },
              cta:      { type: "string" },
              hashtags: { type: "array", items: { type: "string" } },
              platform: { type: "string" },
            },
            required: ["headline", "hook", "scenes", "cta", "hashtags", "platform"],
            additionalProperties: false,
          },
        },
      },
  });
  
  const raw = String(response.choices[0].message.content ?? "{}");
  const parsed = JSON.parse(raw) as VideoAdScript;
  parsed.platform = platform;
  return parsed;
}

// ─── Video Generation ────────────────────────────────────────────────────────

async function generateAdVideo(
  prompt: string,
  aspectRatio: "9:16" | "16:9",
  durationSeconds: number
): Promise<string | null> {
  try {
    const keys: UserApiKeys = {
      runwayKey:    process.env.RUNWAY_API_KEY      ?? process.env.RUNWAYML_API_SECRET ?? null,
      falKey:       process.env.FAL_KEY             ?? null,
      replicateKey: process.env.REPLICATE_API_TOKEN ?? null,
      googleAiKey:  process.env.GOOGLE_AI_API_KEY   ?? null,
    };
    const result = await byokGenerateVideo(keys, { prompt, duration: Math.min(durationSeconds, 10), aspectRatio, resolution: "720p" });
    log.info("[VideoAdPipeline] Video generated");
    return result.videoUrl;
  } catch (err) {
    log.warn("[VideoAdPipeline] Video generation failed — using carousel fallback");
    return null;
  }
}

// ─── Main Pipeline ───────────────────────────────────────────────────────────

export async function generateAndPostVideoAd(
  targetPlatform: "tiktok" | "youtube" | "both" = "both"
): Promise<VideoAdResult[]> {
  const results: VideoAdResult[] = [];
  const theme = AD_THEMES[Math.floor(Math.random() * AD_THEMES.length)];
  log.info("[VideoAdPipeline] Starting video ad campaign");
  
  const platforms: Array<"tiktok" | "youtube"> =
    targetPlatform === "both" ? ["tiktok", "youtube"] : [targetPlatform];
  
  for (const platform of platforms) {
    try {
      const script      = await generateAdScript(platform, theme);
      const aspectRatio: "9:16" | "16:9" = platform === "tiktok" ? "9:16" : "16:9";
      const hookScene   = script.scenes[0];
      const hashtagStr  = script.hashtags.map(h => h.startsWith("#") ? h : "#" + h).join(" ");
      const caption     = (script.hook + "\n\n" + script.cta + "\n\n" + hashtagStr).slice(0, 2200);
      const cinPrompt   = hookScene.visualPrompt + ", professional colour grade, cinematic lens flare, Virelle Studios";
      log.info("[VideoAdPipeline] Generating " + platform + " video for: " + theme.theme);
      const videoUrl = await generateAdVideo(cinPrompt, aspectRatio, hookScene.durationSeconds || 8);

      if (platform === "tiktok") {
        if (!isTikTokContentConfigured()) {
          await saveAdToDb(platform, script, videoUrl, caption, "pending_credentials");
          results.push({ status: "no_credentials", platform: "tiktok", videoUrl: videoUrl ?? undefined, script,
            details: "Ad generated — add TIKTOK_CREATOR_TOKEN + TIKTOK_ACCESS_TOKEN to Railway to start posting" });
          continue;
        }
        if (videoUrl) {
          const postResult = await postVideoByUrl({ videoUrl, title: caption, privacyLevel: "PUBLIC_TO_EVERYONE",
            disableComment: false, disableDuet: false, disableStitch: false });
          await saveAdToDb(platform, script, videoUrl, caption, postResult.success ? "posted" : "failed");
          results.push({ status: postResult.success ? "posted" : "failed", platform: "tiktok", videoUrl,
            tiktokPublishId: postResult.publishId, script,
            details: postResult.success ? "TikTok video posted (publishId: " + postResult.publishId + ")" : "TikTok post failed: " + postResult.error });
        } else {
          log.info("[VideoAdPipeline] Generating TikTok photo carousel fallback...");
          const carouselUrls = await generateCarouselImages({ title: script.headline, description: caption,
            hashtags: script.hashtags, hook: script.hook, visualStyle: "cinematic dark premium",
            imagePrompt: hookScene.visualPrompt, contentType: "photo_carousel" });
          if (carouselUrls.length > 0) {
            const photoResult = await postPhotos({ photoUrls: carouselUrls, title: caption.slice(0, 2200), autoAddMusic: true });
            await saveAdToDb(platform, script, null, caption, photoResult.success ? "posted" : "failed");
            results.push({ status: photoResult.success ? "posted" : "failed", platform: "tiktok_carousel", script,
              details: photoResult.success ? "TikTok photo carousel posted (" + carouselUrls.length + " images)" : "TikTok carousel failed: " + photoResult.error });
          } else {
            await saveAdToDb(platform, script, null, caption, "failed");
            results.push({ status: "failed", platform: "tiktok", script, details: "TikTok: both video and carousel failed" });
          }
        }
      } else if (platform === "youtube") {
        if (!isYouTubeConfigured()) {
          await saveAdToDb(platform, script, videoUrl, caption, "pending_credentials");
          results.push({ status: "no_credentials", platform: "youtube", videoUrl: videoUrl ?? undefined, script,
            details: "Ad generated — add YOUTUBE_CLIENT_ID + YOUTUBE_CLIENT_SECRET + YOUTUBE_REFRESH_TOKEN to Railway" });
          continue;
        }
        if (!videoUrl) {
          await saveAdToDb(platform, script, null, caption, "failed");
          results.push({ status: "failed", platform: "youtube", script, details: "YouTube: no video generated to upload" });
          continue;
        }
        const ytDesc = script.scenes.map((s, i) => "[" + (i + 1) + "] " + s.voiceover).join("\n\n")
          + "\n\n" + script.cta + "\n\nvirelle.life\n\n" + hashtagStr;
        const ytResult = await uploadVideoToYouTube({ videoUrl, title: script.headline.slice(0, 100),
          description: ytDesc, tags: script.hashtags, privacyStatus: "public", categoryId: "24" });
        await saveAdToDb(platform, script, videoUrl, caption, "posted");
        results.push({ status: "posted", platform: "youtube", videoUrl,
          youtubeVideoId: ytResult.youtubeVideoId, youtubeUrl: ytResult.youtubeUrl, script,
          details: "YouTube Short published: " + ytResult.youtubeUrl });
      }
    } catch (err) {
      const msg = getErrorMessage(err);
      log.error("[VideoAdPipeline] Platform pipeline failed");
      results.push({ status: "failed", platform, details: "Pipeline error: " + msg, error: msg });
    }
  }
  
  log.info({ count: results.length }, "[VideoAdPipeline] Campaign complete");
  return results;
}

// ─── DB Helper ───────────────────────────────────────────────────────────────

async function saveAdToDb(platform: string, script: VideoAdScript,
  videoUrl: string | null, caption: string, status: string): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    await db.insert(marketingContent).values({
      channel:     platform === "tiktok" ? "tiktok_organic" : "youtube_shorts",
      contentType: "video",
      title:       script.headline,
      body:        caption,
      platform,
      status:      status as any,
      metadata: { hook: script.hook, cta: script.cta, hashtags: script.hashtags,
        videoUrl: videoUrl ?? null, sceneCount: script.scenes.length, type: "video_ad", pipelineVersion: "2.0" },
    } as any);
  } catch (err) {
    log.warn({ err: getErrorMessage(err) }, "[VideoAdPipeline] DB save failed (non-fatal)");
  }
}