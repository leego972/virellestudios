/**
 * Content Creator Engine v3.0 — VirÉlle Studios
 *
 * Fully autonomous AI-powered content generation and distribution system.
 * Operates without manual intervention: generates, scores, auto-approves,
 * schedules at optimal times, and publishes across 15 platforms.
 *
 * Architecture:
 *  ┌─────────────────────────────────────────────────────────────┐
 *  │  SEO Engine → keyword briefs & content gaps                 │
 *  │  Advertising Orchestrator → campaign context & strategy     │
 *  │  TikTok Content Service → organic posting pipeline          │
 *  │  Marketing Engine → brand voice & performance data          │
 *  └─────────────────────────────────────────────────────────────┘
 *
 * Autonomous Loop:
 *  1. Pull live SEO briefs + keyword gaps
 *  2. Generate platform-optimised cinematic content for all 15 channels
 *  3. Score each piece (quality + SEO + virality + brand alignment)
 *  4. Auto-approve pieces scoring ≥ 75 — no human needed
 *  5. Schedule at optimal posting times per platform
 *  6. Publish via TikTok API or mark ready for other platforms
 *  7. Track performance and feed back into next cycle
 */
import { getDb } from "./db";
import { invokeLLM } from "./_core/llm";
import { generateImage } from "./_core/imageGeneration";
import { generateVideoWithFallback } from "./_core/videoGeneration";
import { storagePut } from "./storage";
import { logger } from "./_core/logger";
import { getErrorMessage } from "./_core/errors";
import {
  contentCreatorPieces,
  contentCreatorCampaigns,
  contentCreatorSchedules,
  contentCreatorAnalytics,
  marketingContent,
  marketingActivityLog,
  blogArticles,
} from "../drizzle/schema";
import { eq, desc, and, gte, lte, sql, count, lt } from "drizzle-orm";
import { generateContentBriefs, analyzeKeywords } from "./seo-engine";
import { runTikTokContentPipeline, isTikTokContentConfigured } from "./tiktok-content-service";
import { getStrategyOverview } from "./advertising-orchestrator";

const log = logger;

// ─── Brand Configuration ───────────────────────────────────────────────────
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
    prefix: "Cinematic film production concept art, dramatic golden-hour lighting, professional film set atmosphere, anamorphic lens flares, deep cinematic colour grading, film grain texture, Hollywood production quality,",
    suffix: "ultra-realistic cinematic photography, 4K film still, professional colour grading, shallow depth of field, dramatic lighting, premium film production aesthetic",
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

// ─── Autonomous Configuration ──────────────────────────────────────────────
export const AUTONOMOUS_CONFIG = {
  autoApproveThreshold: 75,        // pieces scoring ≥ 75 are auto-approved
  autoScheduleAfterApproval: true, // auto-schedule approved pieces immediately
  batchSize: 5,                    // pieces per autonomous cycle
  cycleIntervalHours: 6,           // run every 6 hours
  maxDailyPieces: 20,              // cap to avoid spam
  platforms: ["tiktok", "instagram", "x_twitter", "linkedin", "reddit", "blog", "email", "youtube_shorts"],
};

// ─── Optimal Posting Times (UTC) ──────────────────────────────────────────
const OPTIMAL_POSTING_HOURS: Record<string, number[]> = {
  tiktok: [19, 20, 21],           // 7-9pm peak
  instagram: [11, 19, 20],        // 11am, 7-8pm
  x_twitter: [9, 12, 17, 20],     // 9am, noon, 5pm, 8pm
  linkedin: [8, 12, 17],          // 8am, noon, 5pm
  reddit: [10, 14, 20],           // 10am, 2pm, 8pm
  facebook: [13, 15, 20],         // 1pm, 3pm, 8pm
  youtube_shorts: [15, 18, 20],   // 3pm, 6pm, 8pm
  blog: [9, 10],                  // 9-10am
  email: [9, 10, 14],             // 9-10am, 2pm
  pinterest: [20, 21, 22],        // 8-10pm
  discord: [18, 19, 20],          // 6-8pm
  telegram: [9, 18],              // 9am, 6pm
  medium: [9, 10],                // 9-10am
  hackernews: [9, 10, 14],        // 9-10am, 2pm
  whatsapp: [9, 18],              // 9am, 6pm
};

// ─── Platform Configuration ────────────────────────────────────────────────
export const PLATFORM_CONFIG: Record<string, {
  label: string;
  maxChars: number;
  hashtagCount: number;
  contentTypes: string[];
  tone: string;
  format: string;
  guidelines: string;
}> = {
  tiktok: {
    label: "TikTok",
    maxChars: 2200,
    hashtagCount: 10,
    contentTypes: ["video_reel", "story"],
    tone: "Energetic, fast-paced, hook-first. Speak directly to filmmakers and creators. Use trending audio cues.",
    format: "Hook (3 sec) → Problem/Insight → VirÉlle solution → CTA. Include video script with shot directions.",
    guidelines: "Start with a bold visual hook. Use trending sounds. Show before/after of AI-generated film scenes. End with clear CTA to virelle.life.",
  },
  instagram: {
    label: "Instagram",
    maxChars: 2200,
    hashtagCount: 15,
    contentTypes: ["image_post", "video_reel", "story", "carousel"],
    tone: "Visually-led, aspirational, cinematic. Show the beauty of AI filmmaking.",
    format: "Stunning visual → Caption with story → Hashtags. Carousels for tutorials.",
    guidelines: "Lead with cinematic AI-generated imagery. Use Reels for behind-the-scenes of AI film creation. Carousels for step-by-step guides.",
  },
  x_twitter: {
    label: "X / Twitter",
    maxChars: 280,
    hashtagCount: 3,
    contentTypes: ["text_post", "image_post"],
    tone: "Sharp, insightful, thought-provoking. Industry commentary and hot takes on AI filmmaking.",
    format: "Bold statement or insight → Context → CTA or question. Thread-friendly.",
    guidelines: "Share AI filmmaking insights, industry news reactions, and product updates. Engage with film and tech communities.",
  },
  linkedin: {
    label: "LinkedIn",
    maxChars: 3000,
    hashtagCount: 5,
    contentTypes: ["text_post", "image_post", "video_reel"],
    tone: "Professional, thought-leadership, industry-focused. Target production companies and marketing agencies.",
    format: "Industry insight or case study → VirÉlle application → Professional CTA.",
    guidelines: "Focus on ROI of AI filmmaking for businesses. Share case studies of brands using VirÉlle for ad content. Target CMOs and production heads.",
  },
  facebook: {
    label: "Facebook",
    maxChars: 63206,
    hashtagCount: 5,
    contentTypes: ["text_post", "image_post", "video_reel"],
    tone: "Community-focused, educational, warm. Build the VirÉlle filmmaker community.",
    format: "Story or tutorial → Community question → Engagement CTA.",
    guidelines: "Share tutorials, filmmaker success stories, and community highlights. Use Facebook Groups for filmmaker communities.",
  },
  reddit: {
    label: "Reddit",
    maxChars: 40000,
    hashtagCount: 0,
    contentTypes: ["text_post", "image_post"],
    tone: "Authentic, value-first, no hard sell. Contribute genuinely to filmmaking communities.",
    format: "Valuable insight or showcase → Genuine discussion → Soft mention of VirÉlle if relevant.",
    guidelines: "Post in r/filmmaking, r/videography, r/indiefilm, r/cinematography. Share genuine AI filmmaking experiments. Never spam.",
  },
  blog: {
    label: "Blog",
    maxChars: 10000,
    hashtagCount: 0,
    contentTypes: ["blog_post"],
    tone: "Educational, authoritative, SEO-optimised. Establish VirÉlle as the AI filmmaking authority.",
    format: "H1 title → Introduction → H2 sections → Conclusion with CTA. 1500-3000 words for SEO.",
    guidelines: "Target high-value filmmaking keywords. Include practical tutorials. Link to virelle.life features. Include AI-generated example images.",
  },
  email: {
    label: "Email",
    maxChars: 5000,
    hashtagCount: 0,
    contentTypes: ["email_campaign"],
    tone: "Personal, value-driven, exclusive. Make subscribers feel like VIP insiders.",
    format: "Subject line → Personal greeting → Value content → Feature highlight → CTA button.",
    guidelines: "Segment by user type (indie filmmaker, agency, student). Share exclusive tips, new features, and filmmaker success stories.",
  },
  youtube_shorts: {
    label: "YouTube Shorts",
    maxChars: 5000,
    hashtagCount: 8,
    contentTypes: ["video_reel"],
    tone: "Tutorial-focused, educational, high-energy. Show what's possible with AI filmmaking.",
    format: "Hook → Tutorial steps → Result reveal → Subscribe CTA.",
    guidelines: "Quick AI filmmaking tutorials. Before/after comparisons. Feature walkthroughs. Always end with subscribe + virelle.life.",
  },
  pinterest: {
    label: "Pinterest",
    maxChars: 500,
    hashtagCount: 5,
    contentTypes: ["image_post"],
    tone: "Inspirational, visual, aspirational. Curate cinematic AI art and filmmaking inspiration.",
    format: "Stunning visual → Descriptive caption → Link to virelle.life.",
    guidelines: "Create boards for AI cinematography, film colour palettes, scene composition. Drive traffic to virelle.life tutorials.",
  },
  discord: {
    label: "Discord",
    maxChars: 2000,
    hashtagCount: 0,
    contentTypes: ["text_post"],
    tone: "Community-first, helpful, collaborative. Be the most helpful person in every filmmaking server.",
    format: "Helpful insight or resource → Community discussion → Soft VirÉlle mention.",
    guidelines: "Join filmmaking, indie film, and AI art Discord servers. Share VirÉlle experiments. Offer help with AI filmmaking questions.",
  },
  telegram: {
    label: "Telegram",
    maxChars: 4096,
    hashtagCount: 3,
    contentTypes: ["text_post", "image_post"],
    tone: "Broadcast channel style. Product updates, film tips, new features. Concise and actionable.",
    format: "Update headline → Key details → CTA link.",
    guidelines: "VirÉlle Telegram channel for updates, tips, and exclusive content. Direct link to new features and tutorials.",
  },
  medium: {
    label: "Medium",
    maxChars: 10000,
    hashtagCount: 5,
    contentTypes: ["blog_post"],
    tone: "Thoughtful, narrative-driven, industry-focused. Long-form filmmaking and AI essays.",
    format: "Compelling headline → Story-driven intro → Deep-dive content → VirÉlle mention → CTA.",
    guidelines: "Publish in Film, Filmmaking, AI, and Technology publications. Cross-post blog content. Build VirÉlle's thought-leadership.",
  },
  hackernews: {
    label: "Hacker News",
    maxChars: 10000,
    hashtagCount: 0,
    contentTypes: ["text_post"],
    tone: "Technical, analytical, no marketing speak. Focus on the engineering and AI behind VirÉlle.",
    format: "Technical insight → Engineering challenge → Solution → Discussion invitation.",
    guidelines: "Show HN posts for new features. Technical deep-dives on AI film generation. Engage genuinely with the tech community.",
  },
  whatsapp: {
    label: "WhatsApp",
    maxChars: 1000,
    hashtagCount: 0,
    contentTypes: ["text_post"],
    tone: "Personal, direct, conversational. Like a message from a filmmaker friend.",
    format: "Brief update or tip → Direct CTA.",
    guidelines: "WhatsApp broadcast for VIP subscribers. Short, high-value tips and exclusive early access announcements.",
  },
};

// ─── Viral Hook Library ────────────────────────────────────────────────────
const VIRAL_HOOKS = {
  curiosity: [
    "Most filmmakers don't know this AI trick...",
    "The secret Hollywood studios don't want you to know",
    "Why 90% of indie films fail (and how AI fixes it)",
    "I made a cinematic short film in 4 hours. Here's how.",
    "This AI just replaced a $50,000 film crew",
  ],
  transformation: [
    "From zero budget to Hollywood quality in 24 hours",
    "How I went from film student to AI director",
    "Before AI: 6 months. After AI: 6 hours.",
    "This changed everything about how I make films",
    "The film industry will never be the same after this",
  ],
  authority: [
    "After generating 1,000+ AI film scenes, here's what I learned",
    "The most advanced AI film platform just got better",
    "Why professional filmmakers are switching to AI",
    "The future of filmmaking is here — and it's stunning",
    "How AI is democratising Hollywood-quality production",
  ],
  urgency: [
    "The AI filmmaking revolution is happening right now",
    "Don't get left behind — filmmaking just changed forever",
    "Every filmmaker needs to see this before 2027",
    "The window to get ahead in AI filmmaking is closing",
    "Early adopters are already making studio-quality films",
  ],
};

// ─── Quality Scoring ───────────────────────────────────────────────────────
export interface ContentQualityResult {
  overall: number;
  breakdown: {
    hookStrength: number;
    ctaClarity: number;
    brandAlignment: number;
    readability: number;
    hashtagQuality: number;
    viralPotential: number;
    platformFit: number;
    emotionalResonance: number;
  };
  flags: string[];
  suggestions: string[];
}

export function scoreContentQuality(params: {
  platform: string;
  body: string;
  headline: string;
  hook: string;
  callToAction: string;
  hashtags: string[];
  videoScript?: string;
}): ContentQualityResult {
  const config = PLATFORM_CONFIG[params.platform];
  const flags: string[] = [];
  const suggestions: string[] = [];

  // Hook strength (0-100)
  const hookWords = ["secret", "don't know", "changed", "never", "future", "revolutionary", "impossible", "stunning", "cinematic", "Hollywood", "AI", "transform", "before", "after", "how", "why", "this"];
  const hookLower = (params.hook || "").toLowerCase();
  const hookMatches = hookWords.filter(w => hookLower.includes(w)).length;
  const hookStrength = Math.min(100, 40 + hookMatches * 12);
  if (hookStrength < 60) {
    flags.push("Weak hook");
    suggestions.push("Start with a stronger curiosity or transformation hook");
  }

  // CTA clarity (0-100)
  const ctaWords = ["visit", "try", "start", "create", "make", "sign up", "join", "get", "download", "watch", "learn", "discover", "virelle.life", "link in bio", "click"];
  const ctaLower = (params.callToAction || "").toLowerCase();
  const ctaMatches = ctaWords.filter(w => ctaLower.includes(w)).length;
  const ctaClarity = Math.min(100, 30 + ctaMatches * 20);
  if (ctaClarity < 50) {
    flags.push("Weak CTA");
    suggestions.push("Include a clear action verb and link to virelle.life");
  }

  // Brand alignment (0-100)
  const brandWords = ["virelle", "ai film", "cinematic", "ai director", "film", "scene", "production", "filmmaker", "runway", "elevenlabs", "script", "storyboard"];
  const bodyLower = (params.body || "").toLowerCase();
  const brandMatches = brandWords.filter(w => bodyLower.includes(w)).length;
  const brandAlignment = Math.min(100, 30 + brandMatches * 10);
  if (brandAlignment < 50) {
    flags.push("Low brand alignment");
    suggestions.push("Include more references to AI filmmaking and VirÉlle's key features");
  }

  // Readability (0-100)
  const sentences = params.body.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const avgSentenceLength = sentences.length > 0
    ? params.body.split(" ").length / sentences.length
    : 20;
  const readability = avgSentenceLength <= 15 ? 90 : avgSentenceLength <= 20 ? 75 : avgSentenceLength <= 25 ? 60 : 40;
  if (readability < 60) {
    flags.push("Long sentences");
    suggestions.push("Break long sentences into shorter, punchier ones");
  }

  // Hashtag quality (0-100)
  const hashtagCount = params.hashtags?.length || 0;
  const targetCount = config?.hashtagCount || 5;
  const hashtagQuality = hashtagCount === 0 && targetCount === 0 ? 100
    : Math.max(0, 100 - Math.abs(hashtagCount - targetCount) * 10);
  if (hashtagCount > 0 && hashtagCount < targetCount - 2) {
    suggestions.push(`Add ${targetCount - hashtagCount} more relevant hashtags`);
  }

  // Viral potential (0-100)
  const viralWords = ["secret", "shocking", "never seen", "first ever", "game-changing", "revolutionary", "mind-blowing", "incredible", "stunning", "impossible", "future", "transform", "Hollywood", "cinematic"];
  const viralMatches = viralWords.filter(w => bodyLower.includes(w)).length;
  const viralPotential = Math.min(100, 30 + viralMatches * 15);

  // Platform fit (0-100)
  const bodyLength = params.body.length;
  const maxChars = config?.maxChars || 2000;
  const platformFit = bodyLength <= maxChars
    ? Math.min(100, 60 + (bodyLength / maxChars) * 40)
    : Math.max(0, 100 - ((bodyLength - maxChars) / maxChars) * 50);
  if (bodyLength > maxChars) {
    flags.push("Content exceeds platform limit");
    suggestions.push(`Trim content to under ${maxChars} characters`);
  }

  // Emotional resonance (0-100)
  const emotionWords = ["dream", "imagine", "feel", "love", "passion", "inspire", "create", "vision", "story", "journey", "transform", "believe", "possible", "freedom", "art"];
  const emotionMatches = emotionWords.filter(w => bodyLower.includes(w)).length;
  const emotionalResonance = Math.min(100, 30 + emotionMatches * 14);

  const breakdown = {
    hookStrength,
    ctaClarity,
    brandAlignment,
    readability,
    hashtagQuality,
    viralPotential,
    platformFit,
    emotionalResonance,
  };

  const weights = {
    hookStrength: 0.20,
    ctaClarity: 0.15,
    brandAlignment: 0.15,
    readability: 0.10,
    hashtagQuality: 0.10,
    viralPotential: 0.15,
    platformFit: 0.10,
    emotionalResonance: 0.05,
  };

  const overall = Math.round(
    Object.entries(breakdown).reduce((sum, [key, val]) => sum + val * (weights as any)[key], 0)
  );

  return { overall, breakdown, flags, suggestions };
}

// ─── SEO Scoring ──────────────────────────────────────────────────────────
export function scoreSeoContent(params: {
  platform: string;
  body: string;
  headline: string;
  seoKeywords?: string[];
}): number {
  if (!params.seoKeywords || params.seoKeywords.length === 0) return 50;
  const config = PLATFORM_CONFIG[params.platform];
  const bodyLower = (params.body + " " + params.headline).toLowerCase();
  const keywordMatches = params.seoKeywords.filter(kw => bodyLower.includes(kw.toLowerCase())).length;
  const keywordDensity = keywordMatches / params.seoKeywords.length;
  const lengthBonus = params.body.length > 500 ? 10 : 0;
  const headlineBonus = params.seoKeywords.some(kw => params.headline.toLowerCase().includes(kw.toLowerCase())) ? 15 : 0;
  return Math.min(100, Math.round(keywordDensity * 75 + lengthBonus + headlineBonus));
}

// ─── Content Generation ────────────────────────────────────────────────────
export interface GenerateContentParams {
  platform: string;
  contentType: string;
  topic?: string;
  seoKeywords?: string[];
  includeImage?: boolean;
  includeVideo?: boolean;
  campaignId?: number;
  campaignObjective?: string;
  brandVoice?: string;
  useViralHook?: boolean;
  abVariant?: "A" | "B";
}

export interface GeneratedContent {
  platform: string;
  contentType: string;
  title: string;
  headline: string;
  body: string;
  callToAction: string;
  hashtags: string[];
  hook: string;
  videoScript?: string;
  visualDirections?: string;
  imagePrompt?: string;
  mediaUrl?: string;
  seoScore: number;
  qualityScore: number;
  qualityBreakdown?: ContentQualityResult;
  seoKeywords?: string[];
  generationMs: number;
}

export async function generateCreatorContent(params: GenerateContentParams): Promise<GeneratedContent> {
  const startTime = Date.now();
  const config = PLATFORM_CONFIG[params.platform] || PLATFORM_CONFIG.x_twitter;

  // Select viral hook if requested
  const hookCategories = Object.keys(VIRAL_HOOKS) as Array<keyof typeof VIRAL_HOOKS>;
  const hookCategory = hookCategories[Math.floor(Math.random() * hookCategories.length)];
  const viralHookExample = params.useViralHook
    ? VIRAL_HOOKS[hookCategory][Math.floor(Math.random() * VIRAL_HOOKS[hookCategory].length)]
    : null;

  const systemPrompt = `You are the head of content for ${BRAND.name} — ${BRAND.tagline}.

BRAND VOICE: ${params.brandVoice || BRAND.tone}

KEY FEATURES TO HIGHLIGHT:
${BRAND.keyFeatures.map(f => `• ${f}`).join("\n")}

TARGET AUDIENCES:
${BRAND.targetAudiences.map(a => `• ${a}`).join("\n")}

WEBSITE: ${BRAND.website}
COMPETITORS: ${BRAND.competitors.join(", ")}

PLATFORM: ${config.label}
TONE: ${config.tone}
FORMAT: ${config.format}
GUIDELINES: ${config.guidelines}
MAX CHARACTERS: ${config.maxChars}
HASHTAG COUNT: ${config.hashtagCount}
${viralHookExample ? `\nVIRAL HOOK EXAMPLE (adapt this style): "${viralHookExample}"` : ""}
${params.abVariant === "B" ? "\nA/B VARIANT B: Use a completely different angle, tone, and hook from the default approach." : ""}

Generate content that:
1. Immediately grabs attention with a powerful hook
2. Showcases VirÉlle Studios' cinematic AI filmmaking capabilities
3. Speaks directly to the target audience's filmmaking aspirations
4. Includes a clear, compelling call-to-action
5. Is optimised for ${config.label}'s algorithm and audience
6. Differentiates VirÉlle from competitors like ${BRAND.competitors.slice(0, 2).join(" and ")}`;

  const userPrompt = `Create ${config.label} content for VirÉlle Studios.
${params.topic ? `TOPIC: ${params.topic}` : "Choose the most compelling current topic for AI filmmaking."}
${params.seoKeywords?.length ? `SEO KEYWORDS TO INCLUDE: ${params.seoKeywords.join(", ")}` : ""}
${params.campaignObjective ? `CAMPAIGN OBJECTIVE: ${params.campaignObjective}` : ""}

Return a JSON object with these exact fields:
- title: string (SEO-optimised title, 50-60 chars)
- headline: string (attention-grabbing headline)
- body: string (main content, max ${config.maxChars} chars)
- callToAction: string (clear CTA with virelle.life)
- hashtags: string[] (${config.hashtagCount} relevant hashtags, no # symbol)
- hook: string (opening hook, max 150 chars)
- videoScript: string (detailed shot-by-shot script if video content, else "")
- visualDirections: string (visual/art direction notes for image generation)
- imagePrompt: string (detailed DALL-E prompt for accompanying image)`;

  const schema = {
    type: "object",
    properties: {
      title: { type: "string" },
      headline: { type: "string" },
      body: { type: "string" },
      callToAction: { type: "string" },
      hashtags: { type: "array", items: { type: "string" } },
      hook: { type: "string" },
      videoScript: { type: "string" },
      visualDirections: { type: "string" },
      imagePrompt: { type: "string" },
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

  // Generate image if requested
  let mediaUrl: string | undefined;
  if (params.includeImage && parsed.imagePrompt) {
    try {
      const styledPrompt = `${BRAND.artStyle.prefix} ${parsed.imagePrompt}. ${BRAND.artStyle.suffix}. No text in image.`;
      const imgResult = await generateImage({
        prompt: styledPrompt,
      });
      if (imgResult?.url) {
        // Upload to S3 for permanent storage
        try {
          const imgRes = await fetch(imgResult.url);
          const buf = Buffer.from(await imgRes.arrayBuffer());
          const key = `content-creator/${params.platform}/${Date.now()}.png`;
          const { url: s3Url } = await storagePut(key, buf, "image/png");
          mediaUrl = s3Url;
        } catch {
          mediaUrl = imgResult.url;
        }
      }
    } catch (err) {
      log.warn("[ContentCreator] Image generation failed:", { error: getErrorMessage(err) });
      mediaUrl = BRAND.defaultImage;
    }
  }

  // Generate video if requested
  if (params.includeVideo && parsed.videoScript) {
    try {
      const videoResult = await generateVideoWithFallback({
        prompt: `${BRAND.artStyle.prefix} ${parsed.visualDirections || parsed.imagePrompt}. Cinematic film production quality. ${BRAND.artStyle.suffix}.`,
        duration: 6,
        aspectRatio: (params.platform === "tiktok" || params.platform === "youtube_shorts" ? "portrait" : "landscape") as "portrait" | "landscape",
      });
      if (videoResult?.videoUrl) {
        mediaUrl = videoResult.videoUrl;
      }
    } catch (err) {
      log.warn("[ContentCreator] Video generation failed:", { error: getErrorMessage(err) });
    }
  }

  if (!mediaUrl) {
    mediaUrl = BRAND.defaultImage;
  }

  const hashtags = Array.isArray(parsed.hashtags) ? parsed.hashtags.slice(0, config.hashtagCount) : [];

  // Score the content
  const qualityResult = scoreContentQuality({
    platform: params.platform,
    body,
    headline: parsed.headline || "",
    hook: parsed.hook || "",
    callToAction: parsed.callToAction || "",
    hashtags,
    videoScript: parsed.videoScript,
  });

  const seoScore = scoreSeoContent({
    platform: params.platform,
    body,
    headline: parsed.headline || "",
    seoKeywords: params.seoKeywords,
  });

  return {
    platform: params.platform,
    contentType: params.contentType,
    title: parsed.title || "",
    headline: parsed.headline || "",
    body,
    callToAction: parsed.callToAction || "",
    hashtags,
    hook: parsed.hook || "",
    videoScript: parsed.videoScript || undefined,
    visualDirections: parsed.visualDirections || undefined,
    imagePrompt: parsed.imagePrompt || undefined,
    mediaUrl,
    seoScore,
    qualityScore: qualityResult.overall,
    qualityBreakdown: qualityResult,
    seoKeywords: params.seoKeywords,
    generationMs: Date.now() - startTime,
  };
}

// ─── SEO-Driven Brief Generation ──────────────────────────────────────────
export interface ContentCreatorBrief {
  topic: string;
  targetKeyword: string;
  secondaryKeywords: string[];
  contentAngle: string;
  targetPlatforms: string[];
}

export async function getSeoDrivenBriefs(count = 5): Promise<ContentCreatorBrief[]> {
  try {
    const briefs = await generateContentBriefs(count);
    return briefs.map((b: any) => ({
      topic: b.topic || b.title || "AI Filmmaking",
      targetKeyword: b.targetKeyword || b.primaryKeyword || "AI film production",
      secondaryKeywords: b.secondaryKeywords || b.relatedKeywords || [],
      contentAngle: b.contentAngle || b.angle || "Educational",
      targetPlatforms: AUTONOMOUS_CONFIG.platforms,
    }));
  } catch {
    // Fallback briefs if SEO engine unavailable
    return [
      {
        topic: "How AI is Revolutionising Independent Filmmaking in 2026",
        targetKeyword: "AI film production",
        secondaryKeywords: ["AI movie maker", "AI scene generation", "indie film AI", "text to video"],
        contentAngle: "Educational transformation story",
        targetPlatforms: AUTONOMOUS_CONFIG.platforms,
      },
      {
        topic: "VirÉlle Studios vs Runway ML: The Ultimate AI Filmmaking Comparison",
        targetKeyword: "AI filmmaking platform",
        secondaryKeywords: ["Runway ML alternative", "best AI film generator", "AI video production"],
        contentAngle: "Comparison and authority",
        targetPlatforms: AUTONOMOUS_CONFIG.platforms,
      },
      {
        topic: "Make a Cinematic Short Film with AI in Under 24 Hours",
        targetKeyword: "AI short film maker",
        secondaryKeywords: ["AI film generator", "automated filmmaking", "AI director"],
        contentAngle: "How-to tutorial",
        targetPlatforms: AUTONOMOUS_CONFIG.platforms,
      },
    ].slice(0, count);
  }
}

// ─── Optimal Posting Time Calculator ──────────────────────────────────────
export function getOptimalPostingTime(platform: string, offsetDays = 0): Date {
  const hours = OPTIMAL_POSTING_HOURS[platform] || [12];
  const now = new Date();
  const targetDate = new Date(now);
  targetDate.setDate(targetDate.getDate() + offsetDays);

  // Find the next optimal hour
  const currentHour = now.getHours();
  const nextHour = hours.find(h => h > currentHour) || hours[0];

  if (nextHour <= currentHour && offsetDays === 0) {
    targetDate.setDate(targetDate.getDate() + 1);
  }

  targetDate.setHours(nextHour, 0, 0, 0);
  return targetDate;
}

// ─── Auto-Approve High Quality Content ────────────────────────────────────
export async function autoApproveHighQualityContent(threshold = AUTONOMOUS_CONFIG.autoApproveThreshold): Promise<{
  approved: number;
  scheduled: number;
  skipped: number;
}> {
  const db = await getDb();
  if (!db) return { approved: 0, scheduled: 0, skipped: 0 };

  let approved = 0;
  let scheduled = 0;
  let skipped = 0;

  try {
    // Get all draft pieces
    const drafts = await db
      .select()
      .from(contentCreatorPieces)
      .where(eq(contentCreatorPieces.status, "draft"))
      .limit(50);

    for (const piece of drafts) {
      const qualityScore = piece.qualityScore || 0;
      if (qualityScore >= threshold) {
        const scheduledAt = getOptimalPostingTime(piece.platform || "instagram");
        await db
          .update(contentCreatorPieces)
          .set({ status: "scheduled", scheduledAt })
          .where(eq(contentCreatorPieces.id, piece.id));

        // Create schedule entry
        await db.insert(contentCreatorSchedules).values({
          pieceId: piece.id,
          campaignId: piece.campaignId || undefined,
          platform: piece.platform as any,
          scheduledAt,
          status: "pending",
        });

        approved++;
        scheduled++;
        log.info(`[ContentCreator] Auto-approved piece ${piece.id} (score: ${qualityScore}) — scheduled ${scheduledAt.toISOString()}`);
      } else {
        skipped++;
      }
    }
  } catch (err) {
    log.error("[ContentCreator] Auto-approve error:", { error: getErrorMessage(err) });
  }

  return { approved, scheduled, skipped };
}

// ─── Autonomous Content Cycle ──────────────────────────────────────────────
export interface AutonomousCycleResult {
  success: boolean;
  generated: number;
  autoApproved: number;
  scheduled: number;
  published: number;
  failed: number;
  platforms: string[];
  durationMs: number;
}

export async function runAutonomousContentCycle(options?: {
  maxPiecesPerPlatform?: number;
  autoApproveThreshold?: number;
  autoSchedule?: boolean;
  autoPublishTikTok?: boolean;
}): Promise<AutonomousCycleResult> {
  const startTime = Date.now();
  const {
    maxPiecesPerPlatform = 2,
    autoApproveThreshold = AUTONOMOUS_CONFIG.autoApproveThreshold,
    autoSchedule = true,
    autoPublishTikTok = true,
  } = options || {};

  const platforms = AUTONOMOUS_CONFIG.platforms;
  const maxPieces = Math.min(maxPiecesPerPlatform, 3); // safety cap
  let generated = 0;
  let failed = 0;

  const db = await getDb();
  if (!db) {
    return { success: false, generated: 0, autoApproved: 0, scheduled: 0, published: 0, failed: 1, platforms, durationMs: Date.now() - startTime };
  }

  log.info("[ContentCreator] Starting autonomous content cycle", { platforms, maxPieces, autoApproveThreshold });

  // 1. Pull SEO briefs for topic intelligence
  const briefs = await getSeoDrivenBriefs(3);
  const topic = briefs[0]?.topic;
  const seoKeywords = briefs[0] ? [briefs[0].targetKeyword, ...briefs[0].secondaryKeywords.slice(0, 3)] : undefined;

  // 2. Get or create an autonomous campaign
  let campaign = (await db.select().from(contentCreatorCampaigns)
    .where(and(
      eq(contentCreatorCampaigns.status, "active"),
      eq(contentCreatorCampaigns.name, "Autonomous Content Campaign"),
    ))
    .limit(1))[0];

  if (!campaign) {
    const [ins] = await db.insert(contentCreatorCampaigns).values({
      name: "Autonomous Content Campaign",
      description: "Automatically generated cinematic content across all platforms",
      objective: "brand_awareness",
      status: "active",
      platforms: platforms as any,
      seoEnabled: true,
      tiktokEnabled: isTikTokContentConfigured(),
      advertisingEnabled: true,
    } as any);
    const rows = await db.select().from(contentCreatorCampaigns)
      .where(eq(contentCreatorCampaigns.id, (ins as any).insertId)).limit(1);
    campaign = rows[0];
  }

  if (!campaign) {
    log.error("[ContentCreator] Failed to get/create autonomous campaign");
    return { success: false, generated: 0, autoApproved: 0, scheduled: 0, published: 0, failed: 1, platforms, durationMs: Date.now() - startTime };
  }

  // 3. Generate content for each platform
  const platformsToGenerate = platforms.slice(0, maxPieces);
  for (const platform of platformsToGenerate) {
    const config = PLATFORM_CONFIG[platform];
    if (!config) continue;

    try {
      const content = await generateCreatorContent({
        platform,
        contentType: config.contentTypes[0],
        topic,
        seoKeywords,
        includeImage: ["tiktok", "instagram", "pinterest"].includes(platform),
        campaignId: campaign.id,
        campaignObjective: "brand_awareness",
        useViralHook: true,
      });

      const [ins] = await db.insert(contentCreatorPieces).values({
        campaignId: campaign.id,
        platform: platform as any,
        contentType: config.contentTypes[0] as any,
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
        aiPrompt: topic || "Autonomous generation",
        aiModel: "gpt-4.1-mini",
        generationMs: content.generationMs,
      } as any);

      generated++;

      // 4. Auto-approve if quality threshold met
      if (autoSchedule && content.qualityScore >= autoApproveThreshold) {
        const scheduledAt = getOptimalPostingTime(platform);
        const pieceId = (ins as any).insertId;

        await db.update(contentCreatorPieces).set({
          status: "scheduled",
          scheduledAt,
        }).where(eq(contentCreatorPieces.id, pieceId));

        await db.insert(contentCreatorSchedules).values({
          pieceId,
          campaignId: campaign.id,
          platform: platform as any,
          scheduledAt,
          status: "pending",
        });

        log.info(`[ContentCreator] Auto-approved ${platform} piece (score: ${content.qualityScore}) — scheduled ${scheduledAt.toISOString()}`);
      }

      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 300));
    } catch (err) {
      log.error(`[ContentCreator] Failed to generate for ${platform}:`, { error: getErrorMessage(err) });
      failed++;
    }
  }

  // 5. Process any due schedules
  const publishResult = await processDueSchedules();

  // 6. Run auto-approve pass on any remaining drafts
  const approveResult = await autoApproveHighQualityContent(autoApproveThreshold);

  // 7. Update campaign stats
  await db.update(contentCreatorCampaigns)
    .set({ totalPieces: sql`totalPieces + ${generated}` })
    .where(eq(contentCreatorCampaigns.id, campaign.id));

  // 8. Log to marketing activity
  await db.insert(marketingActivityLog).values({
    action: "autonomous_content_cycle",
    description: `Generated ${generated} pieces across ${platformsToGenerate.length} platforms. Auto-approved: ${approveResult.approved}. Published: ${publishResult.published}.`,
    metadata: {
      generated,
      autoApproved: approveResult.approved,
      scheduled: approveResult.scheduled,
      published: publishResult.published,
      platforms: platformsToGenerate,
    },
  } as any);

  const result: AutonomousCycleResult = {
    success: true,
    generated,
    autoApproved: approveResult.approved,
    scheduled: approveResult.scheduled,
    published: publishResult.published,
    failed,
    platforms: platformsToGenerate,
    durationMs: Date.now() - startTime,
  };

  log.info("[ContentCreator] Autonomous cycle complete:", result as unknown as Record<string, unknown>);
  return result;
}

// ─── Bulk Campaign Generation ──────────────────────────────────────────────
export interface BulkGenerateParams {
  campaignId: number;
  platforms: string[];
  topic?: string;
  seoKeywords?: string[];
  includeImages?: boolean;
  autoApprove?: boolean;
}

export interface BulkGenerateResult {
  total: number;
  succeeded: number;
  failed: number;
  autoApproved: number;
  pieces: Array<{ platform: string; qualityScore: number; seoScore: number; status: string }>;
}

export async function bulkGenerateForCampaign(params: BulkGenerateParams): Promise<BulkGenerateResult> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const results: BulkGenerateResult = {
    total: params.platforms.length,
    succeeded: 0,
    failed: 0,
    autoApproved: 0,
    pieces: [],
  };

  for (const platform of params.platforms) {
    const config = PLATFORM_CONFIG[platform];
    if (!config) { results.failed++; continue; }

    try {
      const content = await generateCreatorContent({
        platform,
        contentType: config.contentTypes[0],
        topic: params.topic,
        seoKeywords: params.seoKeywords,
        includeImage: params.includeImages && ["tiktok", "instagram", "pinterest"].includes(platform),
        campaignId: params.campaignId,
        useViralHook: true,
      });

      const status = params.autoApprove && content.qualityScore >= AUTONOMOUS_CONFIG.autoApproveThreshold
        ? "scheduled"
        : "draft";

      const scheduledAt = status === "scheduled" ? getOptimalPostingTime(platform) : undefined;

      const [ins] = await db.insert(contentCreatorPieces).values({
        campaignId: params.campaignId,
        platform: platform as any,
        contentType: config.contentTypes[0] as any,
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
        status: status as any,
        scheduledAt,
        aiPrompt: params.topic || "Bulk generation",
        aiModel: "gpt-4.1-mini",
        generationMs: content.generationMs,
      } as any);

      if (status === "scheduled" && scheduledAt) {
        await db.insert(contentCreatorSchedules).values({
          pieceId: (ins as any).insertId,
          campaignId: params.campaignId,
          platform: platform as any,
          scheduledAt,
          status: "pending",
        });
        results.autoApproved++;
      }

      results.succeeded++;
      results.pieces.push({ platform, qualityScore: content.qualityScore, seoScore: content.seoScore, status });
      await new Promise(r => setTimeout(r, 200));
    } catch (err) {
      log.error(`[ContentCreator] Bulk generate failed for ${platform}:`, { error: getErrorMessage(err) });
      results.failed++;
    }
  }

  return results;
}

// ─── TikTok Publishing ─────────────────────────────────────────────────────
export interface TikTokPublishParams {
  pieceId: number;
}

export interface TikTokPublishResult {
  success: boolean;
  publishId?: string;
  error?: string;
  action: "posted" | "queued" | "failed";
}

export async function publishPieceToTikTok(params: TikTokPublishParams): Promise<TikTokPublishResult> {
  const db = await getDb();
  if (!db) return { success: false, error: "Database not available", action: "failed" };

  const rows = await db.select().from(contentCreatorPieces).where(eq(contentCreatorPieces.id, params.pieceId)).limit(1);
  const piece = rows[0];
  if (!piece) return { success: false, error: "Content piece not found", action: "failed" };

  try {
    // Build carousel images from visual directions
    const carouselImages: string[] = [];
    if (piece.visualDirections) {
      const directions = typeof piece.visualDirections === "string"
        ? piece.visualDirections.split("\n").filter(Boolean).slice(0, 3)
        : [];

      for (const direction of directions) {
        try {
          const styledPrompt = `${BRAND.artStyle.prefix} ${direction}. ${BRAND.artStyle.suffix}. No text in image.`;
          const imgResult = await generateImage({
            prompt: styledPrompt,
          });
          if (imgResult?.url) {
            try {
              const imgRes = await fetch(imgResult.url);
              const buf = Buffer.from(await imgRes.arrayBuffer());
              const key = `tiktok-carousel/${Date.now()}-${carouselImages.length}.png`;
              const { url: s3Url } = await storagePut(key, buf, "image/png");
              carouselImages.push(s3Url);
            } catch {
              carouselImages.push(imgResult.url);
            }
          }
        } catch {
          // Skip failed images
        }
      }
    }

    // Run TikTok pipeline
    const postResult = await runTikTokContentPipeline();

    if (postResult.success || postResult.publishId) {
      await db.update(contentCreatorPieces).set({
        status: "published",
        publishedAt: new Date(),
        platformPostId: postResult.publishId,
      } as any).where(eq(contentCreatorPieces.id, params.pieceId));

      await db.insert(marketingActivityLog).values({
        action: "content_creator_tiktok_post",
        description: `TikTok post published via Content Creator: "${piece.title || piece.headline || "Untitled"}"`,
        metadata: { pieceId: params.pieceId, publishId: postResult.publishId, title: piece.title },
      } as any);
    }

    return {
      success: postResult.success,
      publishId: postResult.publishId,
      action: postResult.success ? "posted" : "failed",
    };
  } catch (err) {
    log.error("[ContentCreator] TikTok publish error:", { error: getErrorMessage(err) });
    return { success: false, error: getErrorMessage(err), action: "failed" };
  }
}

// ─── Process Due Schedules ─────────────────────────────────────────────────
export async function processDueSchedules(): Promise<{
  processed: number;
  published: number;
  failed: number;
}> {
  const db = await getDb();
  if (!db) return { processed: 0, published: 0, failed: 0 };

  let processed = 0;
  let published = 0;
  let failed = 0;

  try {
    const now = new Date();
    const dueSchedules = await db
      .select()
      .from(contentCreatorSchedules)
      .where(
        and(
          eq(contentCreatorSchedules.status, "pending"),
          lte(contentCreatorSchedules.scheduledAt, now),
        )
      )
      .limit(20);

    for (const schedule of dueSchedules) {
      processed++;
      try {
        // Mark schedule as processing
        await db.update(contentCreatorSchedules)
          .set({ status: "processing" as any })
          .where(eq(contentCreatorSchedules.id, schedule.id));

        // Mark piece as published
        await db.update(contentCreatorPieces)
          .set({ status: "published", publishedAt: now } as any)
          .where(eq(contentCreatorPieces.id, schedule.pieceId));

        // If TikTok, attempt actual post
        if (schedule.platform === "tiktok" && isTikTokContentConfigured()) {
          await publishPieceToTikTok({ pieceId: schedule.pieceId });
        }

        // Mark schedule as completed
        await db.update(contentCreatorSchedules)
          .set({ status: "completed" as any, executedAt: now } as any)
          .where(eq(contentCreatorSchedules.id, schedule.id));

        published++;
      } catch (err) {
        await db.update(contentCreatorSchedules)
          .set({ status: "failed" as any, error: getErrorMessage(err) } as any)
          .where(eq(contentCreatorSchedules.id, schedule.id));
        failed++;
      }
    }
  } catch (err) {
    log.error("[ContentCreator] processDueSchedules error:", { error: getErrorMessage(err) });
  }

  return { processed, published, failed };
}

// ─── Campaign Analytics ────────────────────────────────────────────────────
export async function getCampaignAnalytics(campaignId: number) {
  const db = await getDb();
  if (!db) return null;

  const [pieces, schedules, analytics] = await Promise.all([
    db.select().from(contentCreatorPieces).where(eq(contentCreatorPieces.campaignId, campaignId)),
    db.select().from(contentCreatorSchedules).where(eq(contentCreatorSchedules.campaignId, campaignId)),
    db.select().from(contentCreatorAnalytics).where(eq(contentCreatorAnalytics.campaignId, campaignId)),
  ]);

  const byPlatform = pieces.reduce((acc, p) => {
    const platform = p.platform || "unknown";
    if (!acc[platform]) acc[platform] = { total: 0, published: 0, avgQuality: 0, avgSeo: 0 };
    acc[platform].total++;
    if (p.status === "published") acc[platform].published++;
    acc[platform].avgQuality += p.qualityScore || 0;
    acc[platform].avgSeo += p.seoScore || 0;
    return acc;
  }, {} as Record<string, { total: number; published: number; avgQuality: number; avgSeo: number }>);

  // Average the scores
  for (const platform of Object.keys(byPlatform)) {
    const d = byPlatform[platform];
    if (d.total > 0) {
      d.avgQuality = Math.round(d.avgQuality / d.total);
      d.avgSeo = Math.round(d.avgSeo / d.total);
    }
  }

  const totalImpressions = analytics.reduce((sum, a) => sum + (a.impressions || 0), 0);
  const totalClicks = analytics.reduce((sum, a) => sum + (a.clicks || 0), 0);
  const totalEngagements = analytics.reduce((sum, a) => sum + (a.engagements || 0), 0);

  return {
    campaignId,
    totalPieces: pieces.length,
    publishedPieces: pieces.filter(p => p.status === "published").length,
    scheduledPieces: pieces.filter(p => p.status === "scheduled").length,
    draftPieces: pieces.filter(p => p.status === "draft").length,
    avgQualityScore: pieces.length > 0 ? Math.round(pieces.reduce((s, p) => s + (p.qualityScore || 0), 0) / pieces.length) : 0,
    avgSeoScore: pieces.length > 0 ? Math.round(pieces.reduce((s, p) => s + (p.seoScore || 0), 0) / pieces.length) : 0,
    byPlatform,
    schedules: schedules.length,
    analytics: {
      impressions: totalImpressions,
      clicks: totalClicks,
      engagements: totalEngagements,
      ctr: totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) + "%" : "0%",
    },
  };
}

// ─── Content Creator Dashboard ─────────────────────────────────────────────
export async function getContentCreatorDashboard() {
  const db = await getDb();
  if (!db) return null;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalPieces,
    recentPieces,
    campaigns,
    dueSchedules,
    recentAnalytics,
  ] = await Promise.all([
    db.select({ count: count() }).from(contentCreatorPieces),
    db.select().from(contentCreatorPieces)
      .where(gte(contentCreatorPieces.createdAt, thirtyDaysAgo))
      .orderBy(desc(contentCreatorPieces.createdAt))
      .limit(10),
    db.select().from(contentCreatorCampaigns)
      .where(eq(contentCreatorCampaigns.status, "active"))
      .limit(5),
    db.select({ count: count() }).from(contentCreatorSchedules)
      .where(and(
        eq(contentCreatorSchedules.status, "pending"),
        gte(contentCreatorSchedules.scheduledAt, new Date()),
      )),
    db.select().from(contentCreatorAnalytics)
      .where(gte(contentCreatorAnalytics.createdAt, thirtyDaysAgo))
      .orderBy(desc(contentCreatorAnalytics.createdAt))
      .limit(50),
  ]);

  const statusCounts = await db
    .select({ status: contentCreatorPieces.status, count: count() })
    .from(contentCreatorPieces)
    .groupBy(contentCreatorPieces.status);

  const platformCounts = await db
    .select({ platform: contentCreatorPieces.platform, count: count() })
    .from(contentCreatorPieces)
    .groupBy(contentCreatorPieces.platform);

  const totalImpressions = recentAnalytics.reduce((s, a) => s + (a.impressions || 0), 0);
  const totalClicks = recentAnalytics.reduce((s, a) => s + (a.clicks || 0), 0);
  const totalEngagements = recentAnalytics.reduce((s, a) => s + (a.engagements || 0), 0);

  return {
    overview: {
      totalPieces: Number(totalPieces[0]?.count ?? 0),
      activeCampaigns: campaigns.length,
      scheduledPosts: Number(dueSchedules[0]?.count ?? 0),
      statusBreakdown: Object.fromEntries(statusCounts.map(s => [s.status, Number(s.count)])),
      platformBreakdown: Object.fromEntries(platformCounts.map(p => [p.platform, Number(p.count)])),
    },
    recentPieces,
    activeCampaigns: campaigns,
    analytics: {
      impressions: totalImpressions,
      clicks: totalClicks,
      engagements: totalEngagements,
      ctr: totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) + "%" : "0%",
      engagementRate: totalImpressions > 0 ? ((totalEngagements / totalImpressions) * 100).toFixed(2) + "%" : "0%",
    },
    autonomousConfig: AUTONOMOUS_CONFIG,
  };
}

// ─── Schedule Content Piece ────────────────────────────────────────────────
export async function scheduleContentPiece(params: {
  pieceId: number;
  scheduledAt: Date;
  campaignId?: number;
}): Promise<{ success: boolean; scheduleId?: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const rows = await db.select().from(contentCreatorPieces).where(eq(contentCreatorPieces.id, params.pieceId)).limit(1);
  const piece = rows[0];
  if (!piece) throw new Error("Content piece not found");

  await db.update(contentCreatorPieces).set({
    status: "scheduled",
    scheduledAt: params.scheduledAt,
  } as any).where(eq(contentCreatorPieces.id, params.pieceId));

  const [ins] = await db.insert(contentCreatorSchedules).values({
    pieceId: params.pieceId,
    campaignId: params.campaignId || piece.campaignId || undefined,
    platform: piece.platform as any,
    scheduledAt: params.scheduledAt,
    status: "pending",
  });

  return { success: true, scheduleId: (ins as any).insertId };
}

// ─── Generate Campaign Strategy ────────────────────────────────────────────
export async function generateCampaignStrategy(params: {
  name: string;
  objective: string;
  targetAudience?: string;
  budget?: number;
  durationDays?: number;
}): Promise<string> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a senior content strategist for ${BRAND.name}. Generate a concise, actionable content campaign strategy for an AI film production platform. Return plain text, max 400 words.`,
      },
      {
        role: "user",
        content: `Create a content campaign strategy for:
Campaign: ${params.name}
Objective: ${params.objective}
Target Audience: ${params.targetAudience || "Indie filmmakers and content creators"}
Budget: ${params.budget ? `$${params.budget} AUD` : "Organic/free channels only"}
Duration: ${params.durationDays || 30} days
Brand: ${BRAND.name} — ${BRAND.tagline}
Website: ${BRAND.website}

Include: platform priorities, content themes, posting frequency, KPIs, and key messages.`,
      },
    ],
  });

  const rawContent = response.choices?.[0]?.message?.content;
  return (typeof rawContent === "string" ? rawContent : rawContent?.[0] && typeof rawContent[0] === "object" && "text" in rawContent[0] ? (rawContent[0] as any).text : null) || "Strategy generation failed. Please try again.";
}

// ─── Get Content Creator Stats ─────────────────────────────────────────────
export async function getContentCreatorStats() {
  const db = await getDb();
  if (!db) return null;

  const [totalPieces, publishedPieces, scheduledPieces, draftPieces, campaigns] = await Promise.all([
    db.select({ count: count() }).from(contentCreatorPieces),
    db.select({ count: count() }).from(contentCreatorPieces).where(eq(contentCreatorPieces.status, "published")),
    db.select({ count: count() }).from(contentCreatorPieces).where(eq(contentCreatorPieces.status, "scheduled")),
    db.select({ count: count() }).from(contentCreatorPieces).where(eq(contentCreatorPieces.status, "draft")),
    db.select({ count: count() }).from(contentCreatorCampaigns).where(eq(contentCreatorCampaigns.status, "active")),
  ]);

  return {
    totalPieces: Number(totalPieces[0]?.count ?? 0),
    publishedPieces: Number(publishedPieces[0]?.count ?? 0),
    scheduledPieces: Number(scheduledPieces[0]?.count ?? 0),
    draftPieces: Number(draftPieces[0]?.count ?? 0),
    activeCampaigns: Number(campaigns[0]?.count ?? 0),
    autonomousConfig: AUTONOMOUS_CONFIG,
    brand: BRAND.name,
    website: BRAND.website,
  };
}

// ─── Legacy compatibility exports ─────────────────────────────────────────
export type AdPlatform = "instagram" | "tiktok" | "facebook" | "x_twitter" | "linkedin" | "youtube_shorts" | "pinterest";
export type ContentFormat = "image_post" | "video_reel" | "story" | "carousel" | "banner_ad";

export interface ContentCreatorResult {
  platform: AdPlatform;
  format: ContentFormat;
  imageUrl?: string;
  videoUrl?: string;
  caption?: string;
  hashtags?: string[];
  title?: string;
  body?: string;
}

export async function runContentCreatorJob(
  platform: AdPlatform,
  format: ContentFormat,
  options: { theme?: string; generateVideo?: boolean; blogPostSlug?: string } = {}
): Promise<ContentCreatorResult> {
  const content = await generateCreatorContent({
    platform,
    contentType: format,
    topic: options.theme,
    includeImage: ["image_post", "carousel", "story"].includes(format),
    includeVideo: options.generateVideo || ["video_reel"].includes(format),
    useViralHook: true,
  });

  return {
    platform,
    format,
    imageUrl: content.mediaUrl,
    caption: content.body,
    hashtags: content.hashtags,
    title: content.title,
    body: content.body,
  };
}

// ─── Alias for backward compatibility ─────────────────────────────────────
export const generateSeoContentBriefs = getSeoDrivenBriefs;
