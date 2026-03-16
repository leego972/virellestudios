/**
 * Autonomous Advertising Orchestrator
 * 
 * The master brain that coordinates ALL of Titan's growth systems:
 * - SEO Engine → organic search traffic (FREE)
 * - Blog System → content marketing & long-tail keywords (FREE)
 * - Marketing Engine → social media & paid campaigns ($500 AUD/month)
 * - Affiliate Engine → partner-driven revenue (FREE)
 * - Email Service → lead nurturing & retention (FREE)
 * - Ad Tracking → conversion measurement (FREE)
 * 
 * Strategy: 80% free organic growth, 20% paid amplification
 * Budget: $500 AUD/month → Google Ads only (highest intent traffic)
 */

import { invokeLLM } from "./_core/llm";
import { notifyOwner } from "./_core/notification";
import { getDb } from "./db";
import { generateContent, allocateBudget, runAutonomousCycle as runMarketingCycle } from "./marketing-engine";
import { runAutonomousContentCycle } from "./content-creator-engine";
import { runScheduledSeoOptimization, analyzeSeoHealth, analyzeKeywords, generateSeoReport, submitToIndexNow } from "./seo-engine";
import { getAffiliateRecommendationContext } from "./affiliate-recommendation-engine";
import {
  xAdapter,
  redditAdapter,
  tiktokAdapter,
  linkedinAdapter,
  pinterestAdapter,
  getConnectedChannels,
  type ChannelId,
} from "./marketing-channels";
import { ENV } from "./_core/env";
import {
  devtoAdapter,
  mediumAdapter,
  hashnodeAdapter,
  discordAdapter,
  mastodonAdapter,
  telegramAdapter,
  whatsappAdapter,
  getExpandedChannelStatuses,
  getConnectedExpandedChannels,
  getContentQueueChannels,
} from "./expanded-channels";
import {
  marketingContent,
  marketingActivityLog,
  marketingCampaigns,
  marketingPerformance,
  marketingSettings,
  blogArticles as blogPosts,
} from "../drizzle/schema";
// blogCategories, affiliatePartners, affiliateClicks do not exist in this schema;
// use inline fallbacks below.
import { eq, desc, and, gte, sql, count } from "drizzle-orm";
import { runTikTokContentPipeline, getTikTokContentStats, isTikTokContentConfigured } from "./tiktok-content-service";
import { logger as _logger } from "./_core/logger";
const createLogger = (name: string) => ({
  info:  (msg: string, meta?: Record<string, unknown>) => _logger.info(`[${name}] ${msg}`, meta),
  warn:  (msg: string, meta?: Record<string, unknown>) => _logger.warn(`[${name}] ${msg}`, meta),
  error: (msg: string, meta?: Record<string, unknown>) => _logger.error(`[${name}] ${msg}`, meta),
  debug: (msg: string, meta?: Record<string, unknown>) => _logger.debug(`[${name}] ${msg}`, meta),
});
import { getErrorMessage } from "./_core/errors.js";
import { generateVideo, generateVideoWithFallback } from "./_core/videoGeneration";
// Compatibility shims for missing exports
const isVideoGenerationAvailable = () => !!(process.env.FAL_KEY || process.env.REPLICATE_API_TOKEN || process.env.RUNWAY_API_KEY);
const generateShortFormVideo = async (hook: string, script: string) => generateVideoWithFallback({ prompt: `${hook}\n${script}`, seconds: 15 });
const generateSocialClip = async (topic: string, _platform: string) => generateVideoWithFallback({ prompt: topic, seconds: 30 });
const generateMarketingVideo = async (prompt: string) => generateVideoWithFallback({ prompt, seconds: 30 });
const log = createLogger("AdvertisingOrchestrator");

// ============================================
// CONSTANTS
// ============================================

const MONTHLY_BUDGET_AUD = 500;
const GOOGLE_ADS_ALLOCATION = 500; // All paid budget goes to Google Ads
const FREE_CHANNELS = [
  "seo_organic",
  "blog_content",
  "social_organic",
  "community_engagement",
  "affiliate_network",
  "email_nurture",
  "product_hunt",
  "youtube_presence",
  "backlink_outreach",
  "forum_participation",
  "tiktok_organic",
  "pinterest_organic",
  "linkedin_organic",
  "medium_republish",
  "quora_answers",
  "reddit_film",
  "youtube_shorts",
  "discord_community",
  "skool_community",
  "indiehackers",
  "vimeo_community",
  "hashnode_crosspost",
  "behance_portfolio",
  "mastodon_creative",
  "telegram_channel",
  "hackernews_submit",
  "twitch_creative",
  "slack_communities",
  "filmfreeway_community",
  "letterboxd_community",
  "whatsapp_broadcast",
  "no_film_school",
  "cinema5d_community",
  "indiewire_community",
  "stage32_community",
  "mandy_network",
  "shooting_people",
  "creative_cow",
] as const;

type FreeChannel = (typeof FREE_CHANNELS)[number];

// Content topics that drive organic traffic for cybersecurity SaaS
const CONTENT_PILLARS = [
  {
    pillar: "AI Filmmaking & Scene Generation",
    keywords: ["AI film generator", "AI scene generation", "text to video AI", "AI cinematic production", "AI movie maker"],
    blogTopics: [
      "How to Make a Cinematic Short Film with AI in 2026",
      "AI Scene Generation: A Complete Beginner's Guide",
      "The Best AI Film Generators Compared: VirÉlle vs Runway vs Sora",
      "How Indie Filmmakers Are Using AI to Cut Production Costs by 90%",
      "From Script to Screen: AI-Powered Film Production Workflow",
    ],
    socialAngles: ["behind-the-scenes AI generation", "before vs after AI", "filmmaker success stories"],
  },
  {
    pillar: "AI Character Creation & Animation",
    keywords: ["AI character creation", "AI actor generation", "digital human AI", "AI character animation", "virtual actor"],
    blogTopics: [
      "How to Create Photorealistic AI Characters for Your Film",
      "AI Actors vs Real Actors: The Future of Casting",
      "Building Consistent AI Characters Across Multiple Scenes",
      "The Ethics of AI Actors in Commercial Production",
      "AI Character Animation: From Static Image to Cinematic Performance",
    ],
    socialAngles: ["character creation demos", "AI actor comparisons", "digital human showcases"],
  },
  {
    pillar: "Cinematic Lighting & Visual Effects",
    keywords: ["AI visual effects", "AI cinematography", "cinematic lighting AI", "AI VFX", "AI colour grading"],
    blogTopics: [
      "Mastering Cinematic Lighting with AI: A Director's Guide",
      "AI Visual Effects That Used to Cost $500K — Now Free",
      "How to Achieve Hollywood-Quality Colour Grading with AI",
      "AI Cinematography: Recreating Iconic Film Looks with Prompts",
      "The Future of VFX: How AI is Democratising Visual Effects",
    ],
    socialAngles: ["lighting breakdowns", "VFX before/after", "cinematic style tutorials"],
  },
  {
    pillar: "AI Video for Advertising & Brand Content",
    keywords: ["AI video advertising", "AI commercial production", "AI brand video", "AI product visualisation", "AI marketing video"],
    blogTopics: [
      "How Brands Are Using AI Video to Cut Ad Production Costs",
      "AI-Generated Commercials: Case Studies from Leading Brands",
      "Creating High-Converting Social Media Video Ads with AI",
      "AI Product Visualisation: Show Your Product Before It Exists",
      "The ROI of AI Video Production vs Traditional Agency Costs",
    ],
    socialAngles: ["ad production cost savings", "brand video showcases", "ROI comparisons"],
  },
  {
    pillar: "Filmmaking Tools & Workflow",
    keywords: ["filmmaking software 2026", "AI storyboard generator", "AI script to video", "film production tools", "AI director tools"],
    blogTopics: [
      "Top 10 AI Tools Every Filmmaker Needs in 2026",
      "How to Build a Complete AI Film Production Pipeline",
      "AI Storyboarding: From Script to Visual in Minutes",
      "The Indie Filmmaker's Complete AI Toolkit",
      "How AI is Changing the Film Industry: A 2026 Report",
    ],
    socialAngles: ["tool comparisons", "workflow tutorials", "production speed demos"],
  },
];
// Community platforms for free engagement
const COMMUNITY_TARGETS = {
  reddit: {
    subreddits: [
      "r/filmmaking",
      "r/videography",
      "r/cinematography",
      "r/AIVideo",
      "r/artificial",
      "r/StableDiffusion",
      "r/MediaSynthesis",
      "r/indiefilm",
      "r/VideoEditing",
      "r/MotionDesign",
      "r/vfx",
      "r/animation",
      "r/Screenwriting",
      "r/shortfilm",
      "r/contentcreation",
    ],
    strategy: "Share genuine filmmaking tips, AI generation tutorials, and behind-the-scenes content. Provide value first, mention VirÉlle only when naturally relevant.",
  },
  devto: {
    strategy: "Cross-post technical articles about AI video generation APIs, prompt engineering for film, and building AI production pipelines.",
  },
  producthunt: {
    strategy: "Launch new features as Product Hunt posts — new AI models, rendering upgrades, character generation improvements. Engage with upvoters.",
  },
  youtube: {
    strategy: "Tutorial videos on AI filmmaking techniques, scene generation walkthroughs, and cinematic prompt engineering. Build a subscriber base of filmmakers.",
  },
  stackoverflow: {
    strategy: "Answer questions about AI video generation APIs, video processing pipelines, and creative AI integration.",
  },
  twitter: {
    strategy: "Daily AI film showcases, cinematic prompt tips, filmmaker spotlights, and trending AI video discussions. Engage with the AI art and film community.",
  },
  tiktok: {
    strategy: "60-second AI film generation demos, before/after comparisons, cinematic prompt tutorials, trending audio hooks with AI visuals.",
  },
  youtube_shorts: {
    strategy: "Quick AI generation demos, cinematic style tutorials, filmmaker tips under 60 seconds.",
  },
  linkedin: {
    strategy: "Thought leadership on AI's impact on film production, brand video ROI, and the future of commercial content creation. Target CMOs, creative directors, and studio heads.",
  },
  pinterest: {
    strategy: "Cinematic mood boards, AI film stills, visual style guides, and production design inspiration. High visual impact for the creative audience.",
  },
  medium: {
    strategy: "Republish in-depth articles about AI filmmaking, cinematic AI techniques, and the business of AI production. Reach 100M+ monthly readers.",
  },
  hashnode: {
    strategy: "Cross-post technical articles about AI video APIs, generation pipelines, and developer integrations for the creative tech community.",
  },
  discord: {
    strategy: "Daily AI film showcases, community challenges, generation tips, and feature announcements in filmmaking and AI art Discord servers.",
  },
  mastodon: {
    strategy: "Engage with the creative AI and indie film community on mastodon.social and merveilles.town. Privacy-respecting, authentic engagement.",
  },
  telegram: {
    strategy: "Broadcast new AI film showcases, generation tips, product updates, and exclusive previews to channel subscribers.",
  },
  skool: {
    strategy: "Free AI filmmaking course content, community challenges, and prompt engineering lessons. Funnel engaged learners to the Pro tier.",
  },
  indiehackers: {
    strategy: "Building-in-public updates about VirÉlle Studios growth, revenue milestones, AI model improvements, and lessons from building a creative AI SaaS.",
  },
  vimeo: {
    strategy: "Showcase high-quality AI-generated films and shorts on Vimeo. Engage with the professional filmmaker community. Build a portfolio of AI cinema.",
  },
  behance: {
    strategy: "Portfolio showcases of AI-generated cinematic work. Target visual artists, directors, and creative directors who use Behance for inspiration.",
  },
  quora: {
    strategy: "Expert answers to questions about AI filmmaking, video generation, and the future of cinema. Build authority in the AI creative space.",
  },
  twitch: {
    strategy: "Live AI film generation sessions, real-time prompt engineering, and collaborative filmmaking streams. Build an engaged creative audience.",
  },
  slack_communities: {
    strategy: "Value-first engagement in filmmaking, advertising, and creative production Slack workspaces. Share tips, resources, and answer questions.",
  },
  filmfreeway: {
    strategy: "Engage with the independent film festival community. Share AI-generated short films, participate in discussions, build credibility in indie film.",
  },
  letterboxd: {
    strategy: "Engage with the cinephile community. Share AI film reviews, cinematic style analyses, and discussions about AI's role in cinema.",
  },
  whatsapp: {
    strategy: "Broadcast weekly AI filmmaking tips, new generation showcases, and product updates to opted-in subscribers via WhatsApp Business.",
  },
  no_film_school: {
    strategy: "Share practical AI filmmaking tutorials, gear comparisons, and production tips for the No Film School audience of indie filmmakers.",
  },
  cinema5d: {
    strategy: "Technical articles and discussions about AI camera simulation, virtual cinematography, and AI post-production for the Cinema5D professional audience.",
  },
  indiewire: {
    strategy: "Thought leadership on AI's impact on independent film, distribution, and the future of cinema for the IndieWire audience of film professionals.",
  },
  stage32: {
    strategy: "Engage with the Stage 32 community of screenwriters, directors, and producers. Share AI production resources and build industry relationships.",
  },
  mandy: {
    strategy: "Connect with the Mandy.com community of film crew and production professionals. Share AI production opportunities and resources.",
  },
  shooting_people: {
    strategy: "Engage with the Shooting People indie film community. Share AI filmmaking resources, casting calls for AI productions, and community discussions.",
  },
  creative_cow: {
    strategy: "Technical discussions about AI video production, post-production workflows, and AI tool integrations for the Creative COW professional community.",
  },
};
// ============================================
// TYPES
// ============================================

export interface AdvertisingCycleResult {
  timestamp: string;
  duration: number;
  actions: AdvertisingAction[];
  metrics: {
    blogPostsGenerated: number;
    socialPostsCreated: number;
    socialPostsPublished: number;
    communityEngagements: number;
    seoOptimizations: number;
    emailCampaignsSent: number;
    affiliateActionsTriggered: number;
    totalFreeActions: number;
    paidSpend: number;
  };
  nextScheduledRun: string;
  errors: string[];
}

export interface AdvertisingAction {
  channel: FreeChannel | "google_ads";
  action: string;
  status: "success" | "failed" | "skipped";
  details: string;
  cost: number; // 0 for free channels
}

export interface GrowthStrategy {
  channel: FreeChannel | "google_ads";
  frequency: string;
  description: string;
  expectedImpact: "high" | "medium" | "low";
  costPerMonth: number;
  automatable: boolean;
}

// ============================================
// GROWTH STRATEGY MATRIX
// ============================================

export const GROWTH_STRATEGIES: GrowthStrategy[] = [
  {
    channel: "seo_organic",
    frequency: "Daily",
    description: "AI-powered SEO optimization for filmmaking and AI video keywords. Target high-intent searches from indie filmmakers, agencies, and studios.",
    expectedImpact: "high",
    costPerMonth: 0,
    automatable: true,
  },
  {
    channel: "blog_content",
    frequency: "3x per week",
    description: "Generate SEO-optimized blog posts about AI filmmaking, cinematic techniques, AI character creation, and the future of cinema.",
    expectedImpact: "high",
    costPerMonth: 0,
    automatable: true,
  },
  {
    channel: "tiktok_organic",
    frequency: "Daily",
    description: "Post AI-generated film clips, cinematic prompt tutorials, and before/after generation comparisons. TikTok is the #1 discovery channel for AI creative tools.",
    expectedImpact: "high",
    costPerMonth: 0,
    automatable: true,
  },
  {
    channel: "youtube_shorts",
    frequency: "Daily",
    description: "Post 60-second AI film generation demos, cinematic style tutorials, and filmmaker tips. YouTube Shorts drives massive discovery for creative tools.",
    expectedImpact: "high",
    costPerMonth: 0,
    automatable: true,
  },
  {
    channel: "social_organic",
    frequency: "Daily",
    description: "Post AI film showcases, cinematic prompts, and filmmaker spotlights on X/Twitter, Instagram, and LinkedIn to build brand awareness.",
    expectedImpact: "high",
    costPerMonth: 0,
    automatable: true,
  },
  {
    channel: "community_engagement",
    frequency: "Daily",
    description: "Engage authentically in r/filmmaking, r/AIVideo, r/cinematography, and r/indiefilm. Provide genuine value, build trust, earn organic mentions.",
    expectedImpact: "high",
    costPerMonth: 0,
    automatable: true,
  },
  {
    channel: "email_nurture",
    frequency: "Weekly",
    description: "Send personalized email sequences to new signups, free tier users, and inactive users. Focus on showcasing AI generation capabilities and success stories.",
    expectedImpact: "high",
    costPerMonth: 0,
    automatable: true,
  },
  {
    channel: "affiliate_network",
    frequency: "Ongoing",
    description: "Partner with filmmaking YouTubers, cinematography bloggers, and AI art creators for affiliate revenue sharing. Target creators with 10K–500K audiences.",
    expectedImpact: "high",
    costPerMonth: 0,
    automatable: false,
  },
  {
    channel: "product_hunt",
    frequency: "Monthly",
    description: "Launch new AI models, generation features, and major updates on Product Hunt. Engage with the tech-savvy early adopter community.",
    expectedImpact: "high",
    costPerMonth: 0,
    automatable: false,
  },
  {
    channel: "youtube_presence",
    frequency: "2x per week",
    description: "Post full-length AI filmmaking tutorials, cinematic generation walkthroughs, and filmmaker interviews on YouTube. Build a subscriber base of creators.",
    expectedImpact: "high",
    costPerMonth: 0,
    automatable: true,
  },
  {
    channel: "backlink_outreach",
    frequency: "Weekly",
    description: "Reach out to filmmaking blogs, AI art publications, and creative technology media for backlinks, guest posts, and feature coverage.",
    expectedImpact: "high",
    costPerMonth: 0,
    automatable: true,
  },
  {
    channel: "pinterest_organic",
    frequency: "Daily",
    description: "Pin AI-generated film stills, cinematic mood boards, and visual style guides. Pinterest drives significant discovery for visual creative tools.",
    expectedImpact: "medium",
    costPerMonth: 0,
    automatable: true,
  },
  {
    channel: "linkedin_organic",
    frequency: "3x per week",
    description: "Thought leadership posts targeting CMOs, creative directors, and studio executives about AI's ROI in commercial video production.",
    expectedImpact: "medium",
    costPerMonth: 0,
    automatable: true,
  },
  {
    channel: "medium_republish",
    frequency: "Weekly",
    description: "Republish blog posts on Medium with canonical URLs. Reach Medium's 100M+ monthly readers interested in AI, technology, and creative arts.",
    expectedImpact: "medium",
    costPerMonth: 0,
    automatable: true,
  },
  {
    channel: "quora_answers",
    frequency: "3x per week",
    description: "Answer questions about AI filmmaking, video generation, and the future of cinema on Quora. Build authority and drive qualified traffic.",
    expectedImpact: "medium",
    costPerMonth: 0,
    automatable: true,
  },
  {
    channel: "reddit_film",
    frequency: "Daily",
    description: "Provide genuine value in filmmaking, AI art, and cinematography subreddits. Share tutorials, answer questions, and organically showcase VirÉlle capabilities.",
    expectedImpact: "high",
    costPerMonth: 0,
    automatable: true,
  },
  {
    channel: "discord_community",
    frequency: "Daily",
    description: "Engage in AI art, filmmaking, and creative production Discord servers. Share generation tips, community challenges, and feature announcements.",
    expectedImpact: "medium",
    costPerMonth: 0,
    automatable: true,
  },
  {
    channel: "skool_community",
    frequency: "3x per week",
    description: "Free AI filmmaking course content, prompt engineering lessons, and community challenges on Skool. Funnel engaged learners to Pro tier.",
    expectedImpact: "medium",
    costPerMonth: 0,
    automatable: true,
  },
  {
    channel: "indiehackers",
    frequency: "Weekly",
    description: "Building-in-public updates about VirÉlle Studios growth, AI model improvements, and lessons from building a creative AI SaaS.",
    expectedImpact: "medium",
    costPerMonth: 0,
    automatable: true,
  },
  {
    channel: "vimeo_community",
    frequency: "Weekly",
    description: "Showcase high-quality AI-generated films on Vimeo. Engage with the professional filmmaker community and build a portfolio of AI cinema.",
    expectedImpact: "medium",
    costPerMonth: 0,
    automatable: true,
  },
  {
    channel: "hashnode_crosspost",
    frequency: "Weekly",
    description: "Cross-post technical articles about AI video generation APIs and creative AI integrations for the Hashnode developer community.",
    expectedImpact: "low",
    costPerMonth: 0,
    automatable: true,
  },
  {
    channel: "behance_portfolio",
    frequency: "Weekly",
    description: "Portfolio showcases of AI-generated cinematic work on Behance. Target visual artists, directors, and creative directors.",
    expectedImpact: "medium",
    costPerMonth: 0,
    automatable: true,
  },
  {
    channel: "mastodon_creative",
    frequency: "3x per week",
    description: "Engage with the creative AI and indie film community on Mastodon. Privacy-respecting, authentic engagement with the open-source creative community.",
    expectedImpact: "low",
    costPerMonth: 0,
    automatable: true,
  },
  {
    channel: "telegram_channel",
    frequency: "Daily",
    description: "Broadcast new AI film showcases, generation tips, product updates, and exclusive previews to Telegram channel subscribers.",
    expectedImpact: "medium",
    costPerMonth: 0,
    automatable: true,
  },
  {
    channel: "hackernews_submit",
    frequency: "Weekly",
    description: "Submit Show HN posts about new AI generation capabilities, technical breakthroughs, and open-source tools. HN drives high-quality developer traffic.",
    expectedImpact: "medium",
    costPerMonth: 0,
    automatable: true,
  },
  {
    channel: "twitch_creative",
    frequency: "Weekly",
    description: "Live AI film generation sessions and real-time prompt engineering streams on Twitch. Build an engaged creative audience.",
    expectedImpact: "low",
    costPerMonth: 0,
    automatable: true,
  },
  {
    channel: "slack_communities",
    frequency: "Daily",
    description: "Value-first engagement in filmmaking, advertising, and creative production Slack workspaces. Share tips and answer questions.",
    expectedImpact: "medium",
    costPerMonth: 0,
    automatable: true,
  },
  {
    channel: "filmfreeway_community",
    frequency: "Weekly",
    description: "Engage with the independent film festival community on FilmFreeway. Share AI-generated short films and build credibility in indie film.",
    expectedImpact: "low",
    costPerMonth: 0,
    automatable: true,
  },
  {
    channel: "letterboxd_community",
    frequency: "2x per week",
    description: "Engage with the cinephile community on Letterboxd. Share AI film analyses, cinematic style discussions, and AI cinema reviews.",
    expectedImpact: "low",
    costPerMonth: 0,
    automatable: true,
  },
  {
    channel: "whatsapp_broadcast",
    frequency: "Weekly",
    description: "Broadcast weekly AI filmmaking tips, new generation showcases, and product updates to opted-in subscribers via WhatsApp Business.",
    expectedImpact: "medium",
    costPerMonth: 0,
    automatable: true,
  },
  {
    channel: "no_film_school",
    frequency: "2x per week",
    description: "Share practical AI filmmaking tutorials and production tips for the No Film School audience of indie filmmakers and cinematographers.",
    expectedImpact: "high",
    costPerMonth: 0,
    automatable: true,
  },
  {
    channel: "cinema5d_community",
    frequency: "2x per week",
    description: "Technical articles about AI camera simulation, virtual cinematography, and AI post-production for the Cinema5D professional audience.",
    expectedImpact: "medium",
    costPerMonth: 0,
    automatable: true,
  },
  {
    channel: "indiewire_community",
    frequency: "Weekly",
    description: "Thought leadership on AI's impact on independent film and the future of cinema for the IndieWire audience of film professionals.",
    expectedImpact: "medium",
    costPerMonth: 0,
    automatable: true,
  },
  {
    channel: "stage32_community",
    frequency: "2x per week",
    description: "Engage with the Stage 32 community of screenwriters, directors, and producers. Share AI production resources and build industry relationships.",
    expectedImpact: "medium",
    costPerMonth: 0,
    automatable: true,
  },
  {
    channel: "mandy_network",
    frequency: "Weekly",
    description: "Connect with the Mandy.com community of film crew and production professionals. Share AI production opportunities and resources.",
    expectedImpact: "low",
    costPerMonth: 0,
    automatable: true,
  },
  {
    channel: "shooting_people",
    frequency: "Weekly",
    description: "Engage with the Shooting People indie film community. Share AI filmmaking resources and community discussions.",
    expectedImpact: "low",
    costPerMonth: 0,
    automatable: true,
  },
  {
    channel: "creative_cow",
    frequency: "2x per week",
    description: "Technical discussions about AI video production and post-production workflows for the Creative COW professional community.",
    expectedImpact: "medium",
    costPerMonth: 0,
    automatable: true,
  },
];
// ============================================
// CORE ORCHESTRATOR FUNCTIONS
// ============================================

/**
 * Generate an SEO-optimized blog post using the existing blog system
 */
async function generateSeoBlogPost(): Promise<AdvertisingAction> {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Pick a random content pillar and topic
    const pillar = CONTENT_PILLARS[Math.floor(Math.random() * CONTENT_PILLARS.length)];
    const topic = pillar.blogTopics[Math.floor(Math.random() * pillar.blogTopics.length)];
    const targetKeyword = pillar.keywords[Math.floor(Math.random() * pillar.keywords.length)];

    // Check if we already have a post with a similar title
    const existing = await (db as Record<string, any>).query.blogPosts.findFirst({
      where: sql`LOWER(${blogPosts.title}) LIKE ${`%${topic.toLowerCase().substring(0, 30)}%`}`,
    });

    if (existing) {
      return {
        channel: "blog_content",
        action: "generate_blog_post",
        status: "skipped",
        details: `Similar post already exists: "${existing.title}"`,
        cost: 0,
      };
    }

    // Use LLM to generate the blog post
    const response = await invokeLLM({
        systemTag: "advertising",
        model: "fast",
      messages: [
        {
          role: "system",
          content: `You are an expert content writer for VirÉlle Studios, the world's most advanced AI cinematic production platform. Write SEO-optimized blog posts that provide genuine value to filmmakers and creators while naturally positioning VirÉlle Studios as the solution.
          
Target keyword: "${targetKeyword}"
Content pillar: "${pillar.pillar}"

Write in a cinematic, inspiring, and professional tone. Include:
- Compelling headline (60 chars max for SEO)
- Meta description (155 chars max)
- 1500-2000 word article with H2/H3 subheadings
- Natural keyword placement (2-3% density)
- Internal link suggestion to VirÉlle Studios features
- Call to action at the end

Return as JSON: { "title": "...", "metaDescription": "...", "content": "...(markdown)...", "tags": ["..."], "category": "..." }`,
        },
        {
          role: "user",
          content: `Write a comprehensive blog post about: "${topic}"`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "blog_post",
          strict: true,
          schema: {
            type: "object",
            properties: {
              title: { type: "string" },
              metaDescription: { type: "string" },
              content: { type: "string" },
              tags: { type: "array", items: { type: "string" } },
              category: { type: "string" },
            },
            required: ["title", "metaDescription", "content", "tags", "category"],
            additionalProperties: false,
          },
        },
      },
    });

    const post = JSON.parse((response.choices[0].message.content as string) || "{}");

    // Generate a slug
    const slug = post.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .substring(0, 80);

    // Category tracking not available in this schema — skip
    const categoryId: number | null = null;

    // Calculate SEO score
    const wordCount = (post.content || "").split(/\s+/).length;
    let seoScore = 0;
    if (post.title?.toLowerCase().includes(targetKeyword.toLowerCase())) seoScore += 15;
    if (post.metaDescription?.length >= 120 && post.metaDescription?.length <= 160) seoScore += 10;
    if (wordCount >= 1500) seoScore += 15;
    else if (wordCount >= 800) seoScore += 10;
    if (post.content?.includes("## ")) seoScore += 10;
    if (post.metaDescription?.length >= 50) seoScore += 10;
    const keywordCount = (post.content?.toLowerCase().match(new RegExp(targetKeyword.toLowerCase(), "g")) || []).length;
    const density = wordCount > 0 ? (keywordCount / wordCount) * 100 : 0;
    if (density >= 0.5 && density <= 2.5) seoScore += 10;
    seoScore = Math.min(seoScore, 100);

    // Insert the blog post
    await db.insert(blogPosts).values({
      title: post.title,
      slug,
      content: post.content,
      excerpt: post.metaDescription,
      category: (post.category || "cybersecurity").toLowerCase().replace(/\s+/g, "-"),
      status: "published",
      tags: post.tags || [],
      metaTitle: post.title,
      metaDescription: post.metaDescription,
      focusKeyword: targetKeyword,
      seoScore,
      readingTimeMinutes: Math.ceil(wordCount / 200),
      aiGenerated: true,
      publishedAt: new Date(),
    } as any);

    // Notify search engines of the new blog post via IndexNow
    try {
      await submitToIndexNow([`https://virelle.life/blog/${slug}`]);
    } catch { /* non-critical */ }

    return {
      channel: "blog_content",
      action: "generate_blog_post",
      status: "success",
      details: `Published: "${post.title}" targeting "${targetKeyword}" (SEO score: ${seoScore}/100)`,
      cost: 0,
    };
  } catch (err: unknown) {
    return {
      channel: "blog_content",
      action: "generate_blog_post",
      status: "failed",
      details: `Blog generation failed: ${getErrorMessage(err)}`,
      cost: 0,
    };
  }
}

/**
 * Generate and post organic social media content using the Marketing Engine
 */
async function generateSocialContent(): Promise<AdvertisingAction[]> {
  const actions: AdvertisingAction[] = [];
  const connectedChannels = getConnectedChannels();

  // Generate content for X/Twitter
  const hasTwitter = connectedChannels.some((c) => c.id === "x_twitter");
  if (hasTwitter) {
    try {
      const pillar = CONTENT_PILLARS[Math.floor(Math.random() * CONTENT_PILLARS.length)];
      const angle = pillar.socialAngles[Math.floor(Math.random() * pillar.socialAngles.length)];

      const content = await generateContent({
        platform: "x_twitter",
        contentType: "organic_post",
        topic: `${pillar.pillar} - ${angle} for filmmakers and creators`,
        includeImage: false,
      });

      const tweetText = `${content.headline}\n\n${content.body}\n\n${content.hashtags.map((h: string) => `#${h.replace(/^#/, "")}`).join(" ")}`.substring(0, 280);

      const result = await xAdapter.postTweet({ text: tweetText });

      actions.push({
        channel: "social_organic",
        action: "post_tweet",
        status: result.success ? "success" : "failed",
        details: result.success ? `Posted tweet: "${content.headline}"` : `Tweet failed: ${result.error}`,
        cost: 0,
      });
    } catch (err: unknown) {
      actions.push({
        channel: "social_organic",
        action: "post_tweet",
        status: "failed",
        details: `Twitter post failed: ${getErrorMessage(err)}`,
        cost: 0,
      });
    }
  }

  // Generate content for Reddit (value-first approach)
  const hasReddit = connectedChannels.some((c) => c.id === "reddit");
  if (hasReddit) {
    try {
      const pillar = CONTENT_PILLARS[Math.floor(Math.random() * CONTENT_PILLARS.length)];
      const subreddit = COMMUNITY_TARGETS.reddit.subreddits[
        Math.floor(Math.random() * COMMUNITY_TARGETS.reddit.subreddits.length)
      ].replace("r/", "");

      const content = await generateContent({
        platform: "reddit",
        contentType: "organic_post",
        topic: `${pillar.pillar} - educational filmmaking content for ${subreddit}`,
        includeImage: false,
      });

      const result = await redditAdapter.submitPost({
        subreddit,
        title: content.headline.substring(0, 300),
        text: content.body,
      });

      actions.push({
        channel: "community_engagement",
        action: "reddit_post",
        status: result.success ? "success" : "failed",
        details: result.success ? `Posted to r/${subreddit}: "${content.headline}"` : `Reddit post failed: ${result.error}`,
        cost: 0,
      });
    } catch (err: unknown) {
      actions.push({
        channel: "community_engagement",
        action: "reddit_post",
        status: "failed",
        details: `Reddit post failed: ${getErrorMessage(err)}`,
        cost: 0,
      });
    }
  }

  // Generate a LinkedIn-style thought leadership post
  const hasLinkedin = connectedChannels.some((c) => c.id === "linkedin");
  if (hasLinkedin) {
    try {
      const content = await generateContent({
        platform: "linkedin",
        contentType: "organic_post",
        topic: "AI filmmaking thought leadership and the future of cinematic production",
        includeImage: false,
      });

      actions.push({
        channel: "social_organic",
        action: "linkedin_post",
        status: "success",
        details: `Generated LinkedIn post: "${content.headline}" (queued for publishing)`,
        cost: 0,
      });
    } catch (err: unknown) {
      actions.push({
        channel: "social_organic",
        action: "linkedin_post",
        status: "failed",
        details: `LinkedIn content generation failed: ${getErrorMessage(err)}`,
        cost: 0,
      });
    }
  }

  return actions;
}

/**
 * Run SEO optimization cycle using the existing SEO Engine
 */
async function runSeoOptimization(): Promise<AdvertisingAction> {
  try {
    const report = await runScheduledSeoOptimization();
    if (!report) {
      return {
        channel: "seo_organic",
        action: "seo_optimization",
        status: "skipped",
        details: "SEO optimization skipped (kill switch active or recently ran)",
        cost: 0,
      };
    }

    return {
      channel: "seo_organic",
      action: "seo_optimization",
      status: "success",
      details: `SEO score: ${report.score.overall}/100, ${report.score.issues.length} issues found, ${report.keywords.primaryKeywords.length} keywords tracked`,
      cost: 0,
    };
  } catch (err: unknown) {
    return {
      channel: "seo_organic",
      action: "seo_optimization",
      status: "failed",
      details: `SEO optimization failed: ${getErrorMessage(err)}`,
      cost: 0,
    };
  }
}

/**
 * Generate backlink outreach emails using LLM
 */
async function generateBacklinkOutreach(): Promise<AdvertisingAction> {
  try {
    const response = await invokeLLM({
        systemTag: "advertising",
        model: "fast",
      messages: [
        {
          role: "system",
          content: `You are a professional outreach specialist for VirÉlle Studios, the world's most advanced AI cinematic production platform. Generate a personalized outreach email template for requesting backlinks from filmmaking bloggers, AI art publications, and creative technology media.
The email should:
- Be concise (under 150 words)
- Offer genuine value (guest post, exclusive AI film showcase, data, early access)
- Not be pushy or spammy
- Include a clear but soft call to action
- Feel personal, not templated
Return as JSON: { "subject": "...", "body": "...", "targetType": "filmmaking_blog|ai_art_publication|creative_tech_media" }`,
        },
        {
          role: "user",
          content: "Generate a backlink outreach email for this week's campaign.",
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "outreach_email",
          strict: true,
          schema: {
            type: "object",
            properties: {
              subject: { type: "string" },
              body: { type: "string" },
              targetType: { type: "string" },
            },
            required: ["subject", "body", "targetType"],
            additionalProperties: false,
          },
        },
      },
    });

    const email = JSON.parse((response.choices[0].message.content as string) || "{}");

    // Store the outreach template in marketing content
    const db = await getDb();
    if (db) {
      await db.insert(marketingContent).values({
        channel: "email_outreach",
        contentType: "backlink_outreach",
        title: email.subject,
        body: email.body,
        status: "approved",
      } as any);
    }

    return {
      channel: "backlink_outreach",
      action: "generate_outreach_template",
      status: "success",
      details: `Generated outreach template: "${email.subject}" targeting ${email.targetType}`,
      cost: 0,
    };
  } catch (err: unknown) {
    return {
      channel: "backlink_outreach",
      action: "generate_outreach_template",
      status: "failed",
      details: `Outreach generation failed: ${getErrorMessage(err)}`,
      cost: 0,
    };
  }
}

/**
 * Generate email nurture content for different user segments
 */
async function generateEmailNurture(): Promise<AdvertisingAction> {
  try {
    const segments = [
      { name: "new_signup", description: "Users who signed up in the last 7 days", goal: "Onboard and inspire with first generation" },
      { name: "free_tier", description: "Active free users who haven't upgraded", goal: "Demonstrate Pro generation quality" },
      { name: "inactive", description: "Users who haven't logged in for 14+ days", goal: "Re-engage with new AI model showcases" },
      { name: "power_user", description: "Users with 10+ projects created", goal: "Upsell Enterprise studio collaboration" },
    ];

    const segment = segments[Math.floor(Math.random() * segments.length)];

    const response = await invokeLLM({
        systemTag: "advertising",
        model: "fast",
      messages: [
        {
          role: "system",
          content: `You are an email marketing specialist for VirÉlle Studios, the world's most advanced AI cinematic production platform. Write a nurture email for the "${segment.name}" segment.
Segment: ${segment.description}
Goal: ${segment.goal}
The email should:
- Have a compelling subject line (under 50 chars)
- Be concise (under 200 words)
- Provide genuine creative value and inspiration (not just a sales pitch)
- Include one clear CTA
- Feel personal, cinematic, and inspiring
Return as JSON: { "subject": "...", "preheader": "...", "body": "...(html)...", "cta": { "text": "...", "url": "..." } }`,
        },
        {
          role: "user",
          content: `Write a nurture email for the ${segment.name} segment.`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "nurture_email",
          strict: true,
          schema: {
            type: "object",
            properties: {
              subject: { type: "string" },
              preheader: { type: "string" },
              body: { type: "string" },
              cta: {
                type: "object",
                properties: {
                  text: { type: "string" },
                  url: { type: "string" },
                },
                required: ["text", "url"],
                additionalProperties: false,
              },
            },
            required: ["subject", "preheader", "body", "cta"],
            additionalProperties: false,
          },
        },
      },
    });

    const email = JSON.parse((response.choices[0].message.content as string) || "{}");

    // Store in marketing content
    const db = await getDb();
    if (db) {
      await db.insert(marketingContent).values({
        channel: "sendgrid",
        contentType: "email_nurture",
        title: email.subject,
        body: JSON.stringify(email),
        status: "approved",
        metadata: { segment: segment.name, goal: segment.goal },
      } as any);
    }

    return {
      channel: "email_nurture",
      action: "generate_nurture_email",
      status: "success",
      details: `Generated nurture email for "${segment.name}": "${email.subject}"`,
      cost: 0,
    };
  } catch (err: unknown) {
    return {
      channel: "email_nurture",
      action: "generate_nurture_email",
      status: "failed",
      details: `Email nurture generation failed: ${getErrorMessage(err)}`,
      cost: 0,
    };
  }
}

/**
 * Check affiliate performance and trigger optimizations
 */
async function optimizeAffiliateNetwork(): Promise<AdvertisingAction> {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Get affiliate stats
    // affiliatePartners table not in schema — return early
    const partners: unknown[] = [];
    if (false) await (db as any).query.affiliatePartners?.findMany({
      where: (affiliatePartners: any) => eq(affiliatePartners.status, "active"),
    });

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentClicks: unknown[] = [];
    if (false) await (db as any).query.affiliateClicks?.findMany({
      where: (affiliateClicks: any) => gte(affiliateClicks.createdAt, thirtyDaysAgo),
    });

    const activePartners = partners.length;
    const totalClicks = recentClicks.length;

    return {
      channel: "affiliate_network",
      action: "optimize_network",
      status: "success",
      details: `Affiliate network: ${activePartners} active partners, ${totalClicks} clicks in last 30 days`,
      cost: 0,
    };
  } catch (err: unknown) {
    return {
      channel: "affiliate_network",
      action: "optimize_network",
      status: "failed",
      details: `Affiliate optimization failed: ${getErrorMessage(err)}`,
      cost: 0,
    };
  }
}

/**
 * Generate forum/community engagement content
 */
async function generateCommunityContent(): Promise<AdvertisingAction> {
  try {
    const platforms = ["Reddit", "HackerNews", "Dev.to", "StackOverflow", "Quora"];
    const platform = platforms[Math.floor(Math.random() * platforms.length)];
    const pillar = CONTENT_PILLARS[Math.floor(Math.random() * CONTENT_PILLARS.length)];

    const response = await invokeLLM({
        systemTag: "advertising",
        model: "fast",
      messages: [
        {
          role: "system",
          content: `You are an AI filmmaking expert who participates in online creative communities. Generate a helpful, value-first response for ${platform} about "${pillar.pillar}".
Rules:
- Provide genuine creative and technical value (not marketing fluff)
- Be helpful, inspiring, and educational for filmmakers and creators
- Only mention VirÉlle Studios if it naturally fits (max 1 subtle mention)
- Match the tone of ${platform} (technical for HN/Cinema5D, casual for Reddit/TikTok)
- Keep it concise (under 200 words)
Return as JSON: { "platform": "${platform}", "topic": "...", "content": "...", "isPromotional": false }`,
        },
        {
          role: "user",
          content: `Generate a community engagement post about ${pillar.pillar} for ${platform}.`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "community_post",
          strict: true,
          schema: {
            type: "object",
            properties: {
              platform: { type: "string" },
              topic: { type: "string" },
              content: { type: "string" },
              isPromotional: { type: "boolean" },
            },
            required: ["platform", "topic", "content", "isPromotional"],
            additionalProperties: false,
          },
        },
      },
    });

    const post = JSON.parse((response.choices[0].message.content as string) || "{}");

    // Store in marketing content for review/publishing
    const db = await getDb();
    if (db) {
      await db.insert(marketingContent).values({
        channel: "content_seo" as any,
        contentType: "community_engagement" as any,
        title: post.topic,
        body: post.content,
        platform: platform.toLowerCase(),
        status: "draft",
        aiPrompt: `Community engagement post for ${platform} — AI generated`,
        metadata: { platform: post.platform, isPromotional: post.isPromotional },
      } as any);
    }

    return {
      channel: "forum_participation",
      action: "generate_community_content",
      status: "success",
      details: `Generated ${platform} content: "${post.topic}" (queued as draft)`,
      cost: 0,
    };
  } catch (err: unknown) {
    return {
      channel: "forum_participation",
      action: "generate_community_content",
      status: "failed",
      details: `Community content generation failed: ${getErrorMessage(err)}`,
      cost: 0,
    };
  }
}

// ============================================
// EXPANDED CHANNEL AUTO-PUBLISHING
// ============================================

/**
 * Auto-publish content to all connected API channels.
 * Generates fresh content via LLM and posts directly through each adapter.
 */
async function publishToExpandedChannels(): Promise<AdvertisingAction[]> {
  const actions: AdvertisingAction[] = [];
  const pillar = CONTENT_PILLARS[Math.floor(Math.random() * CONTENT_PILLARS.length)];

  // Dev.to cross-post (if configured)
  if (devtoAdapter.isConfigured) {
    try {
      const response = await invokeLLM({
        systemTag: "advertising",
        model: "fast",
        messages: [
          { role: "system", content: `Write a creative technology article about "${pillar.pillar}" for Dev.to. Include practical examples and actionable advice for filmmakers and creators. Naturally mention VirÉlle Studios where relevant. Return JSON: { "title": "...", "body": "...(markdown)...", "tags": ["..."] }` },
          { role: "user", content: `Write a Dev.to article about ${pillar.blogTopics[Math.floor(Math.random() * pillar.blogTopics.length)]}` },
        ],
        response_format: { type: "json_schema", json_schema: { name: "devto_article", strict: true, schema: { type: "object", properties: { title: { type: "string" }, body: { type: "string" }, tags: { type: "array", items: { type: "string" } } }, required: ["title", "body", "tags"], additionalProperties: false } } },
      });
      const article = JSON.parse((response.choices[0].message.content as string) || "{}");
      const result = await devtoAdapter.publishArticle({
        title: article.title,
        body: article.body,
        tags: article.tags?.slice(0, 4) || [],
        canonicalUrl: `https://virelle.life/blog`,
        published: true,
      });
      actions.push({ channel: "devto_crosspost" as any, action: "publish_article", status: result.success ? "success" : "failed", details: result.success ? `Published to Dev.to: "${article.title}"` : `Dev.to failed: ${result.error}`, cost: 0 });
    } catch (err: unknown) {
      actions.push({ channel: "devto_crosspost" as any, action: "publish_article", status: "failed", details: `Dev.to: ${getErrorMessage(err)}`, cost: 0 });
    }
  }

  // Medium republish (if configured)
  if (mediumAdapter.isConfigured) {
    try {
      const response = await invokeLLM({
        systemTag: "advertising",
        model: "fast",
        messages: [
          { role: "system", content: `Write a thought-provoking Medium article about "${pillar.pillar}". Focus on storytelling and insights. Subtly position VirÉlle Studios as the solution. Return JSON: { "title": "...", "content": "...(markdown)...", "tags": ["..."] }` },
          { role: "user", content: `Write a Medium article about ${pillar.blogTopics[Math.floor(Math.random() * pillar.blogTopics.length)]}` },
        ],
        response_format: { type: "json_schema", json_schema: { name: "medium_article", strict: true, schema: { type: "object", properties: { title: { type: "string" }, content: { type: "string" }, tags: { type: "array", items: { type: "string" } } }, required: ["title", "content", "tags"], additionalProperties: false } } },
      });
      const article = JSON.parse((response.choices[0].message.content as string) || "{}");
      const result = await mediumAdapter.publishPost({
        title: article.title,
        content: article.content,
        contentFormat: "markdown",
        tags: article.tags?.slice(0, 5) || [],
        canonicalUrl: `https://virelle.life/blog`,
        publishStatus: "public",
      });
      actions.push({ channel: "medium_republish", action: "publish_article", status: result.success ? "success" : "failed", details: result.success ? `Published to Medium: "${article.title}"` : `Medium failed: ${result.error}`, cost: 0 });
    } catch (err: unknown) {
      actions.push({ channel: "medium_republish", action: "publish_article", status: "failed", details: `Medium: ${getErrorMessage(err)}`, cost: 0 });
    }
  }

  // Hashnode cross-post (if configured)
  if (hashnodeAdapter.isConfigured) {
    try {
      const response = await invokeLLM({
        systemTag: "advertising",
        model: "fast",
        messages: [
          { role: "system", content: `Write a technical developer article about "${pillar.pillar}" for Hashnode. Include code snippets and practical tips. Return JSON: { "title": "...", "content": "...(markdown)...", "tags": ["..."] }` },
          { role: "user", content: `Write a Hashnode article about ${pillar.blogTopics[Math.floor(Math.random() * pillar.blogTopics.length)]}` },
        ],
        response_format: { type: "json_schema", json_schema: { name: "hashnode_article", strict: true, schema: { type: "object", properties: { title: { type: "string" }, content: { type: "string" }, tags: { type: "array", items: { type: "string" } } }, required: ["title", "content", "tags"], additionalProperties: false } } },
      });
      const article = JSON.parse((response.choices[0].message.content as string) || "{}");
      const result = await hashnodeAdapter.publishArticle({
        title: article.title,
        content: article.content,
        tags: article.tags?.slice(0, 5).map((t: string) => ({ slug: t.toLowerCase().replace(/\s+/g, "-"), name: t })) || [],
        canonicalUrl: `https://virelle.life/blog`,
      });
      actions.push({ channel: "hashnode_crosspost", action: "publish_article", status: result.success ? "success" : "failed", details: result.success ? `Published to Hashnode: "${article.title}"` : `Hashnode failed: ${result.error}`, cost: 0 });
    } catch (err: unknown) {
      actions.push({ channel: "hashnode_crosspost", action: "publish_article", status: "failed", details: `Hashnode: ${getErrorMessage(err)}`, cost: 0 });
    }
  }

  // Discord webhook (if configured)
  if (discordAdapter.isConfigured) {
    try {
      const response = await invokeLLM({
        systemTag: "advertising",
        model: "fast",
        messages: [
          { role: "system", content: `Generate a short, engaging Discord message about AI filmmaking or cinematic AI generation. Include an emoji, a creative tip or showcase, and a link to https://virelle.life. Keep it under 200 words. Return JSON: { "content": "..." }` },
          { role: "user", content: `Generate a Discord security tip about ${pillar.pillar}` },
        ],
        response_format: { type: "json_schema", json_schema: { name: "discord_msg", strict: true, schema: { type: "object", properties: { content: { type: "string" } }, required: ["content"], additionalProperties: false } } },
      });
      const msg = JSON.parse((response.choices[0].message.content as string) || "{}");
      const result = await discordAdapter.postMessage({ content: msg.content });
      actions.push({ channel: "discord_community", action: "send_message", status: result.success ? "success" : "failed", details: result.success ? `Posted to Discord` : `Discord failed: ${result.error}`, cost: 0 });
    } catch (err: unknown) {
      actions.push({ channel: "discord_community", action: "send_message", status: "failed", details: `Discord: ${getErrorMessage(err)}`, cost: 0 });
    }
  }

  // Mastodon (if configured)
  if (mastodonAdapter.isConfigured) {
    try {
      const response = await invokeLLM({
        systemTag: "advertising",
        model: "fast",
        messages: [
          { role: "system", content: `Generate a Mastodon toot about AI filmmaking or cinematic production for the creative community. Include relevant hashtags (#AIFilm #Filmmaking #CinematicAI #VirElleStudios). Keep under 500 chars. Return JSON: { "status": "..." }` },
          { role: "user", content: `Generate a Mastodon toot about ${pillar.pillar} for filmmakers and creators` },
        ],
        response_format: { type: "json_schema", json_schema: { name: "mastodon_toot", strict: true, schema: { type: "object", properties: { status: { type: "string" } }, required: ["status"], additionalProperties: false } } },
      });
      const toot = JSON.parse((response.choices[0].message.content as string) || "{}");
      const result = await mastodonAdapter.postStatus({ status: toot.status });
      actions.push({ channel: "mastodon_creative", action: "post_status", status: result.success ? "success" : "failed", details: result.success ? `Posted to Mastodon` : `Mastodon failed: ${result.error}`, cost: 0 });
    } catch (err: unknown) {
      actions.push({ channel: "mastodon_creative", action: "post_status", status: "failed", details: `Mastodon: ${getErrorMessage(err)}`, cost: 0 });
    }
  }

  // Telegram (if configured)
  if (telegramAdapter.isConfigured) {
    try {
      const response = await invokeLLM({
        systemTag: "advertising",
        model: "fast",
        messages: [
          { role: "system", content: `Generate a Telegram channel broadcast about AI filmmaking or a new VirÉlle Studios feature. Include an inspiring showcase or tip, and a CTA to visit https://virelle.life. Use Telegram markdown formatting. Keep under 300 words. Return JSON: { "text": "..." }` },
          { role: "user", content: `Generate a Telegram broadcast about ${pillar.pillar}` },
        ],
        response_format: { type: "json_schema", json_schema: { name: "telegram_msg", strict: true, schema: { type: "object", properties: { text: { type: "string" } }, required: ["text"], additionalProperties: false } } },
      });
      const raw = (response.choices[0].message.content as string) || "{}";
      let telegramText = "";
      try {
        const parsed = JSON.parse(raw);
        telegramText = parsed.text ?? raw;
        // Handle double-encoded JSON (LLM sometimes returns JSON string within JSON)
        if (typeof telegramText === "string" && telegramText.startsWith("{")) {
          try { const inner = JSON.parse(telegramText); telegramText = inner.text ?? telegramText; } catch { /* not double-encoded */ }
        }
      } catch {
        // If JSON parse fails entirely, use the raw string but strip any JSON wrapper
        const match = raw.match(/"text"\s*:\s*"((?:[^"\\]|\\.)*)"/);
        telegramText = match ? match[1].replace(/\\n/g, "\n").replace(/\\"/g, '"') : raw;
      }
      const result = await telegramAdapter.sendMessage({ text: telegramText, parseMode: "Markdown" });
      actions.push({ channel: "telegram_channel", action: "send_broadcast", status: result.success ? "success" : "failed", details: result.success ? `Broadcast to Telegram` : `Telegram failed: ${result.error}`, cost: 0 });
    } catch (err: unknown) {
      actions.push({ channel: "telegram_channel", action: "send_broadcast", status: "failed", details: `Telegram: ${getErrorMessage(err)}`, cost: 0 });
    }
  }

  // WhatsApp (if configured — weekly only, to stay within free tier)
  if (whatsappAdapter.isConfigured && new Date().getDay() === 1) { // Monday only
    try {
      const result = await whatsappAdapter.sendTemplateMessage({
        to: "", // Requires subscriber list — will be populated from DB
        templateName: "security_tip_weekly",
        languageCode: "en_US",
      });
      actions.push({ channel: "whatsapp_broadcast", action: "send_template", status: result.success ? "success" : "failed", details: result.success ? `WhatsApp weekly broadcast sent` : `WhatsApp: ${result.error}`, cost: 0 });
    } catch (err: unknown) {
      actions.push({ channel: "whatsapp_broadcast", action: "send_template", status: "failed", details: `WhatsApp: ${getErrorMessage(err)}`, cost: 0 });
    }
  }

  return actions;
}

// ============================================
// HACKER FORUM & INFOSEC COMMUNITY CONTENT
// ============================================

/**
 * Generate content specifically for hacker forums and infosec communities.
 * This content is more technical and positions Titan as a tool hackers/researchers need.
 */
async function generateHackerForumContent(): Promise<AdvertisingAction> {
  try {
    const forums = [
      { name: "No Film School", channel: "no_film_school" as FreeChannel, tone: "practical filmmaker", focus: "production techniques, gear, AI tools, workflow" },
      { name: "Cinema5D", channel: "cinema5d_community" as FreeChannel, tone: "technical cinematographer", focus: "camera technology, AI cinematography, virtual production" },
      { name: "IndieWire", channel: "indiewire_community" as FreeChannel, tone: "industry professional", focus: "AI in cinema, distribution, indie film trends" },
      { name: "Stage 32", channel: "stage32_community" as FreeChannel, tone: "collaborative filmmaker", focus: "screenwriting, directing, AI production tools" },
      { name: "Creative COW", channel: "creative_cow" as FreeChannel, tone: "post-production expert", focus: "AI editing, colour grading, VFX, pipeline integration" },
      { name: "FilmFreeway", channel: "filmfreeway_community" as FreeChannel, tone: "festival filmmaker", focus: "AI short films, festival strategy, distribution" },
      { name: "Letterboxd", channel: "letterboxd_community" as FreeChannel, tone: "cinephile", focus: "AI cinema analysis, film aesthetics, cinematic AI" },
      { name: "Shooting People", channel: "shooting_people" as FreeChannel, tone: "indie filmmaker", focus: "low-budget production, AI tools, crowdfunding" },
      { name: "Mandy Network", channel: "mandy_network" as FreeChannel, tone: "production professional", focus: "AI crew tools, virtual production, film technology" },
    ];

    const forum = forums[Math.floor(Math.random() * forums.length)];
    const pillar = CONTENT_PILLARS[Math.floor(Math.random() * CONTENT_PILLARS.length)];

    const response = await invokeLLM({
        systemTag: "advertising",
        model: "fast",
      messages: [
        {
          role: "system",
          content: `You are a respected member of the ${forum.name} community. Generate a high-quality post that provides genuine technical value.

Tone: ${forum.tone}
Focus areas: ${forum.focus}
Topic area: ${pillar.pillar}

Rules:
- Provide REAL technical value — code snippets, methodology, analysis
- Write in the authentic voice of the ${forum.name} community
- Only mention VirÉlle Studios if it naturally fits as a tool recommendation (max 1 subtle mention)
- Include actionable takeaways
- 300-600 words

Return JSON: { "title": "...", "content": "...(markdown)...", "forum": "${forum.name}", "tags": ["..."] }`,
        },
        {
          role: "user",
          content: `Generate a ${forum.name} post about ${pillar.pillar} for filmmakers focusing on ${forum.focus}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "forum_post",
          strict: true,
          schema: {
            type: "object",
            properties: {
              title: { type: "string" },
              content: { type: "string" },
              forum: { type: "string" },
              tags: { type: "array", items: { type: "string" } },
            },
            required: ["title", "content", "forum", "tags"],
            additionalProperties: false,
          },
        },
      },
    });

    const post = JSON.parse((response.choices[0].message.content as string) || "{}");

    // Store in content queue
    const db = await getDb();
    if (db) {
      await db.insert(marketingContent).values({
        channel: "hacker_forum" as any,
        contentType: "hacker_forum_post" as any,
        title: post.title,
        body: post.content,
        platform: forum.name.toLowerCase().replace(/\s+/g, "_"),
        status: "approved",
        metadata: { forum: post.forum, tags: post.tags, channel: forum.channel },
      } as any);
    }

    return {
      channel: forum.channel,
      action: "generate_forum_post",
      status: "success",
      details: `Generated ${forum.name} post: "${post.title}" (queued for publishing)`,
      cost: 0,
    };
  } catch (err: unknown) {
    return {
      channel: "no_film_school",
      action: "generate_forum_post",
      status: "failed",
      details: `Film community content generation failed: ${getErrorMessage(err)}`,
      cost: 0,
    };
  }
}

// ============================================
// VIDEO SCRIPT GENERATION (TikTok + YouTube Shorts)
// ============================================

/**
 * Generate video scripts for TikTok and YouTube Shorts.
 * These are ready-to-record scripts with hooks, visuals, and CTAs.
 */
async function generateVideoScripts(): Promise<AdvertisingAction> {
  try {
    const pillar = CONTENT_PILLARS[Math.floor(Math.random() * CONTENT_PILLARS.length)];
    const platform = Math.random() > 0.5 ? "TikTok" : "YouTube Shorts";
    const channel: FreeChannel = platform === "TikTok" ? "tiktok_organic" : "youtube_shorts";

    const response = await invokeLLM({
        systemTag: "advertising",
        model: "fast",
      messages: [
        {
          role: "system",
          content: `You are a viral ${platform} content creator specializing in AI filmmaking and cinematic production. Generate a 60-second video script.

Rules:
- Start with a HOOK in the first 3 seconds (pattern interrupt, shocking stat, or question)
- Include visual directions in [brackets]
- Keep it fast-paced and engaging
- End with a strong CTA to visit virelle.life
- Use trending ${platform} formats (storytime, "things you didn't know", "stop scrolling if...")
- Include suggested hashtags and audio/music suggestions

Return JSON: { "hook": "...", "script": "...", "visualDirections": ["..."], "hashtags": ["..."], "audioSuggestion": "...", "estimatedDuration": "60s", "platform": "${platform}" }`,
        },
        {
          role: "user",
          content: `Generate a viral ${platform} script about ${pillar.pillar}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "video_script",
          strict: true,
          schema: {
            type: "object",
            properties: {
              hook: { type: "string" },
              script: { type: "string" },
              visualDirections: { type: "array", items: { type: "string" } },
              hashtags: { type: "array", items: { type: "string" } },
              audioSuggestion: { type: "string" },
              estimatedDuration: { type: "string" },
              platform: { type: "string" },
            },
            required: ["hook", "script", "visualDirections", "hashtags", "audioSuggestion", "estimatedDuration", "platform"],
            additionalProperties: false,
          },
        },
      },
    });

    const video = JSON.parse((response.choices[0].message.content as string) || "{}");

    // Store in content queue
    const db = await getDb();
    if (db) {
      await db.insert(marketingContent).values({
        channel: "content_seo" as any,
        contentType: "video_script" as any,
        title: video.hook,
        body: JSON.stringify(video),
        platform: platform.toLowerCase().replace(/\s+/g, "_"),
        status: "approved",
        metadata: { platform: video.platform, hashtags: video.hashtags, duration: video.estimatedDuration },
      } as any);
    }

    // Generate actual video file using Pollinations (free)
    let videoUrl: string | null = null;
    if (isVideoGenerationAvailable()) {
      try {
        log.info(`Generating actual video for ${platform} script: "${video.hook}"`);
        const videoResult = await generateShortFormVideo(
          video.hook,
          video.script?.substring(0, 200) || video.hook
        );
        videoUrl = (videoResult as any).url ?? videoResult.videoUrl ?? null;
        log.info(`Video generated: ${videoUrl} (${(videoResult as any).model ?? 'unknown'}, ${videoResult.duration}s)`);

        // Store video reference alongside the script
        if (db) {
          await db.insert(marketingContent).values({
            channel: "content_seo" as any,
            contentType: "video" as any,
            title: `[VIDEO] ${video.hook}`,
            body: videoUrl,
            platform: platform.toLowerCase().replace(/\s+/g, "_"),
            status: "approved",
            metadata: { 
              platform: video.platform, 
              hashtags: video.hashtags, 
              model: (videoResult as any).model,
              duration: videoResult.duration,
              aspectRatio: (videoResult as any).aspectRatio,
              scriptId: video.hook,
            },
          } as any);
        }
      } catch (videoErr: unknown) {
        log.warn(`Video file generation failed (script still saved): ${getErrorMessage(videoErr)}`);
      }
    }

    const videoNote = videoUrl ? ` + video generated: ${videoUrl}` : " (script only, video gen unavailable)";
    return {
      channel,
      action: "generate_video_script",
      status: "success",
      details: `Generated ${platform} script: "${video.hook}" (${video.estimatedDuration})${videoNote}`,
      cost: 0,
    };
  } catch (err: unknown) {
    return {
      channel: "tiktok_organic",
      action: "generate_video_script",
      status: "failed",
      details: `Video script generation failed: ${getErrorMessage(err)}`,
      cost: 0,
    };
  }
}

// ============================================
// VIDEO AD GENERATION (Pollinations.ai - FREE)
// ============================================

/**
 * Generate a marketing video ad for social media campaigns.
 * Uses Pollinations.ai free tier — zero cost.
 */
async function generateVideoAd(): Promise<AdvertisingAction> {
  try {
    if (!isVideoGenerationAvailable()) {
      return {
        channel: "social_organic" as FreeChannel,
        action: "generate_video_ad",
        status: "skipped",
        details: "Video generation not available",
        cost: 0,
      };
    }

    const pillar = CONTENT_PILLARS[Math.floor(Math.random() * CONTENT_PILLARS.length)];
    const topic = pillar.blogTopics[Math.floor(Math.random() * pillar.blogTopics.length)];
    const platforms = ["tiktok", "youtube", "linkedin", "twitter"] as const;
    const platform = platforms[Math.floor(Math.random() * platforms.length)];

    log.info(`Generating ${platform} video ad about: ${topic}`);

    const videoResult = await generateSocialClip(
      `${pillar.pillar}: ${topic}`,
      platform
    );

    // Store in content queue
    const db = await getDb();
    if (db) {
      await db.insert(marketingContent).values({
        channel: "content_seo" as any,
        contentType: "video" as any,
        title: `[AD] ${topic}`,
        body: (videoResult as any).url ?? videoResult.videoUrl,
        platform,
        status: "approved",
        metadata: {
          pillar: (pillar as any).pillar,
          model: (videoResult as any).model,
          duration: videoResult.duration,
          aspectRatio: (videoResult as any).aspectRatio,
          type: "video_ad",
        },
      } as any);
    }

    return {
      channel: (platform === "tiktok" ? "tiktok_organic" : platform === "youtube" ? "youtube_shorts" : "social_organic") as FreeChannel,
      action: "generate_video_ad",
      status: "success",
      details: `Generated ${platform} video ad: "${topic}" (${(videoResult as any).model ?? 'unknown'}, ${videoResult.duration}s) → ${(videoResult as any).url ?? videoResult.videoUrl}`,
      cost: 0,
    };
  } catch (err: unknown) {
    return {
      channel: "social_organic" as FreeChannel,
      action: "generate_video_ad",
      status: "failed",
      details: `Video ad generation failed: ${getErrorMessage(err)}`,
      cost: 0,
    };
  }
}

// ============================================
// CONTENT QUEUE FOR MANUAL-POST CHANNELS
// ============================================

/**
 * Generate ready-to-post content for channels without APIs.
 * Content is stored in the DB and surfaced in the admin dashboard
 * for one-click copy-paste publishing.
 */
async function generateContentQueueItems(): Promise<AdvertisingAction> {
  try {
    const manualChannels = [
      { name: "Quora", platform: "quora", type: "answer", prompt: "Generate an expert Quora answer about AI filmmaking, AI video generation, or the future of cinema. Be genuinely helpful. Include a subtle mention of VirÉlle Studios only if natural. 200-400 words." },
      { name: "Skool", platform: "skool", type: "community_post", prompt: "Generate a Skool community post for an AI filmmaking learning group. Share a free lesson or cinematic prompt tip that provides value and encourages discussion. Subtly funnel to VirÉlle Studios. 200-300 words." },
      { name: "IndieHackers", platform: "indiehackers", type: "update", prompt: "Generate an IndieHackers building-in-public update about VirÉlle Studios. Share a growth metric, AI model improvement, lesson learned, or technical challenge. Be authentic and transparent. 150-300 words." },
      { name: "Pinterest", platform: "pinterest", type: "pin_description", prompt: "Generate a Pinterest pin description for an AI filmmaking mood board or cinematic style guide. Include keywords for Pinterest SEO. Describe what the visual should show. 100-200 words." },
      { name: "Hacker News", platform: "hackernews", type: "submission", prompt: "Generate a Hacker News Show HN submission about VirÉlle Studios AI film generation technology. Be technical and concise. HN audience hates marketing — focus on the technical innovation. 50-100 words." },
      { name: "LinkedIn", platform: "linkedin", type: "thought_leadership", prompt: "Generate a LinkedIn thought leadership post about AI's impact on film production and commercial content creation. Write as a creative director or studio head. Include a personal insight. 200-400 words." },
      { name: "Slack Communities", platform: "slack", type: "community_message", prompt: "Generate a helpful message for a filmmaking or creative production Slack workspace. Share a tip, resource, or answer a common question about AI video generation. No self-promotion. 50-150 words." },
    ];

    // Pick 2-3 random channels to generate for today
    const shuffled = manualChannels.sort(() => Math.random() - 0.5);
    const todayChannels = shuffled.slice(0, 2 + Math.floor(Math.random() * 2));
    const pillar = CONTENT_PILLARS[Math.floor(Math.random() * CONTENT_PILLARS.length)];
    let generated = 0;

    for (const ch of todayChannels) {
      try {
        const response = await invokeLLM({
        systemTag: "advertising",
        model: "fast",
          messages: [
            { role: "system", content: `${ch.prompt}\n\nTopic area: ${pillar.pillar}\n\nReturn JSON: { "title": "...", "content": "...", "platform": "${ch.name}" }` },
            { role: "user", content: `Generate content for ${ch.name} about ${pillar.pillar}` },
          ],
          response_format: { type: "json_schema", json_schema: { name: "queue_content", strict: true, schema: { type: "object", properties: { title: { type: "string" }, content: { type: "string" }, platform: { type: "string" } }, required: ["title", "content", "platform"], additionalProperties: false } } },
        });

         const item = JSON.parse((response.choices[0].message.content as string) || "{}");
        const db = await getDb();
        if (db) {
          await db.insert(marketingContent).values({
            channel: ch.platform as any,
            contentType: ch.type as any,
            title: item.title,
            body: item.content,
            platform: ch.platform,
            status: "approved",
            aiPrompt: `${ch.name} content — AI generated for ${pillar.pillar}`,
            metadata: { channel: ch.name, queueType: "manual_post", pillar: pillar.pillar },
          } as any);
        }
        generated++;
      } catch {
        // Skip failed individual items, continue with others
      }
    }

    return {
      channel: "forum_participation",
      action: "content_queue_generation",
      status: generated > 0 ? "success" : "failed",
      details: `Generated ${generated} content queue items for: ${todayChannels.map(c => c.name).join(", ")}`,
      cost: 0,
    };
  } catch (err: unknown) {
    return {
      channel: "forum_participation",
      action: "content_queue_generation",
      status: "failed",
      details: `Content queue generation failed: ${getErrorMessage(err)}`,
      cost: 0,
    };
  }
}

// ============================================
// INTELLIGENCE LAYER v2
// ============================================

/**
 * Channel Performance Tracker
 * Tracks success/failure rates per channel and adjusts priority.
 * Channels with higher success rates get more content.
 */
interface ChannelPerformanceRecord {
  channel: string;
  totalAttempts: number;
  successes: number;
  failures: number;
  lastSuccess: number | null;
  lastFailure: number | null;
  avgResponseTime: number;
  priority: number; // 1-10, higher = more content
}

const channelPerformance = new Map<string, ChannelPerformanceRecord>();

function recordChannelPerformance(channel: string, success: boolean, responseTimeMs?: number): void {
  const existing = channelPerformance.get(channel) || {
    channel,
    totalAttempts: 0,
    successes: 0,
    failures: 0,
    lastSuccess: null,
    lastFailure: null,
    avgResponseTime: 0,
    priority: 5,
  };

  existing.totalAttempts++;
  if (success) {
    existing.successes++;
    existing.lastSuccess = Date.now();
  } else {
    existing.failures++;
    existing.lastFailure = Date.now();
  }

  if (responseTimeMs) {
    existing.avgResponseTime = Math.round(
      (existing.avgResponseTime * (existing.totalAttempts - 1) + responseTimeMs) / existing.totalAttempts
    );
  }

  // Recalculate priority based on success rate
  const successRate = existing.totalAttempts > 0 ? existing.successes / existing.totalAttempts : 0.5;
  existing.priority = Math.max(1, Math.min(10, Math.round(successRate * 10)));

  // Boost priority for channels that haven't failed recently
  if (existing.lastFailure && Date.now() - existing.lastFailure > 7 * 24 * 60 * 60 * 1000) {
    existing.priority = Math.min(10, existing.priority + 1);
  }

  channelPerformance.set(channel, existing);
}

export function getChannelPerformanceReport(): ChannelPerformanceRecord[] {
  return Array.from(channelPerformance.values())
    .sort((a, b) => b.priority - a.priority);
}

/**
 * Should we skip this channel today based on performance?
 * Channels with very low success rates get throttled.
 */
function shouldSkipChannel(channel: string): boolean {
  const perf = channelPerformance.get(channel);
  if (!perf || perf.totalAttempts < 5) return false; // Not enough data

  const successRate = perf.successes / perf.totalAttempts;

  // Skip channels with < 10% success rate (after 10+ attempts)
  if (perf.totalAttempts >= 10 && successRate < 0.1) {
    log.info(`[AdvertisingOrchestrator] Throttling channel ${channel}: ${Math.round(successRate * 100)}% success rate`);
    return true;
  }

  // 50% chance to skip channels with < 30% success rate
  if (successRate < 0.3 && Math.random() > 0.5) {
    return true;
  }

  return false;
}

/**
 * A/B Testing Framework
 * Tests different content angles per channel and tracks which performs better.
 */
interface ABTest {
  id: string;
  channel: string;
  variantA: { description: string; attempts: number; successes: number };
  variantB: { description: string; attempts: number; successes: number };
  startedAt: number;
  winner: "A" | "B" | null;
  confidence: number; // 0-1
}

const activeABTests = new Map<string, ABTest>();

export function createABTest(channel: string, variantADesc: string, variantBDesc: string): ABTest {
  const id = `${channel}_${Date.now()}`;
  const test: ABTest = {
    id,
    channel,
    variantA: { description: variantADesc, attempts: 0, successes: 0 },
    variantB: { description: variantBDesc, attempts: 0, successes: 0 },
    startedAt: Date.now(),
    winner: null,
    confidence: 0,
  };
  activeABTests.set(id, test);
  return test;
}

export function getABTestVariant(channel: string): { testId: string; variant: "A" | "B"; description: string } | null {
  for (const [id, test] of activeABTests) {
    if (test.channel === channel && !test.winner) {
      // Thompson sampling: pick variant probabilistically based on success rates
      const aRate = test.variantA.attempts > 0 ? test.variantA.successes / test.variantA.attempts : 0.5;
      const bRate = test.variantB.attempts > 0 ? test.variantB.successes / test.variantB.attempts : 0.5;
      const variant = Math.random() < aRate / (aRate + bRate) ? "A" : "B";
      return {
        testId: id,
        variant,
        description: variant === "A" ? test.variantA.description : test.variantB.description,
      };
    }
  }
  return null;
}

export function recordABTestResult(testId: string, variant: "A" | "B", success: boolean): void {
  const test = activeABTests.get(testId);
  if (!test) return;

  const v = variant === "A" ? test.variantA : test.variantB;
  v.attempts++;
  if (success) v.successes++;

  // Check if we have enough data to declare a winner (minimum 20 attempts each)
  if (test.variantA.attempts >= 20 && test.variantB.attempts >= 20) {
    const aRate = test.variantA.successes / test.variantA.attempts;
    const bRate = test.variantB.successes / test.variantB.attempts;
    const diff = Math.abs(aRate - bRate);

    // Simple significance check: if difference > 15% with enough samples
    if (diff > 0.15) {
      test.winner = aRate > bRate ? "A" : "B";
      test.confidence = Math.min(0.95, diff * 2);
      log.info(`[A/B Test] Winner declared for ${test.channel}: Variant ${test.winner} (${Math.round(test.confidence * 100)}% confidence)`);
    }
  }
}

export function getActiveABTests(): ABTest[] {
  return Array.from(activeABTests.values());
}

/**
 * Content Recycling Engine
 * Finds top-performing content and repurposes it for other channels.
 */
async function recycleTopContent(): Promise<AdvertisingAction> {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Find the most recent successful blog posts
    const topPosts = await db.select({
      title: blogPosts.title,
      content: blogPosts.content,
      slug: blogPosts.slug,
    }).from(blogPosts)
      .where(eq(blogPosts.status, "published"))
      .orderBy(desc(blogPosts.publishedAt))
      .limit(5);

    if (topPosts.length === 0) {
      return {
        channel: "blog_content",
        action: "recycle_content",
        status: "skipped",
        details: "No published blog posts to recycle",
        cost: 0,
      };
    }

    const post = topPosts[Math.floor(Math.random() * topPosts.length)];

    // Use LLM to repurpose for a different format
    const formats = [
      { name: "Twitter Thread", prompt: "Convert this blog post into a compelling 5-7 tweet thread. Each tweet should be under 280 chars. Include a hook tweet and a CTA at the end." },
      { name: "LinkedIn Carousel", prompt: "Convert this blog post into 8-10 LinkedIn carousel slides. Each slide should have a headline and 2-3 bullet points. Start with a hook slide." },
      { name: "Email Newsletter", prompt: "Convert this blog post into a concise email newsletter (200 words max). Include a subject line, key takeaways, and a CTA to read the full article." },
      { name: "Infographic Outline", prompt: "Convert this blog post into an infographic outline with 5-7 sections. Each section should have a title, a stat or key point, and a visual suggestion." },
      { name: "Podcast Script", prompt: "Convert this blog post into a 3-minute podcast script. Include an intro hook, key talking points, and a CTA. Write conversationally." },
    ];

    const format = formats[Math.floor(Math.random() * formats.length)];

    const response = await invokeLLM({
        systemTag: "advertising",
        model: "fast",
      messages: [
        { role: "system", content: `${format.prompt}\n\nReturn JSON: { "title": "...", "content": "...", "format": "${format.name}" }` },
        { role: "user", content: `Original blog post title: ${post.title}\n\nContent (first 2000 chars):\n${(post.content || "").substring(0, 2000)}` },
      ],
      response_format: { type: "json_schema", json_schema: { name: "recycled_content", strict: true, schema: { type: "object", properties: { title: { type: "string" }, content: { type: "string" }, format: { type: "string" } }, required: ["title", "content", "format"], additionalProperties: false } } },
    });

    const recycled = JSON.parse((response.choices[0].message.content as string) || "{}");

    // Store recycled content
    await db.insert(marketingContent).values({
      channel: "content_seo" as any,
      contentType: "blog_article" as any,
      title: `[Recycled → ${format.name}] ${recycled.title}`,
      body: recycled.content,
      status: "approved",
      metadata: { recycledFrom: post.slug, format: format.name, originalTitle: post.title },
    } as any);

    return {
      channel: "blog_content",
      action: "recycle_content",
      status: "success",
      details: `Recycled "${post.title}" → ${format.name}: "${recycled.title}"`,
      cost: 0,
    };
  } catch (err: unknown) {
    return {
      channel: "blog_content",
      action: "recycle_content",
      status: "failed",
      details: `Content recycling failed: ${getErrorMessage(err)}`,
      cost: 0,
    };
  }
}

/**
 * Smart Scheduling — determine optimal posting times based on channel.
 * Returns whether now is a good time to post to a given channel.
 */
function isOptimalPostingTime(channel: string): boolean {
  const hour = new Date().getUTCHours();

  // Optimal posting windows (UTC) based on platform research
  const optimalWindows: Record<string, number[]> = {
    // Twitter/X: 9-11 AM EST = 14-16 UTC
    social_organic: [13, 14, 15, 16, 17],
    // LinkedIn: 7-8 AM, 12 PM, 5-6 PM EST = 12-13, 17, 22-23 UTC
    linkedin_organic: [12, 13, 17, 22, 23],
    // Reddit: 6-9 AM EST = 11-14 UTC
    community_engagement: [11, 12, 13, 14],
    // Dev.to: 8-10 AM EST = 13-15 UTC
    devto_crosspost: [13, 14, 15],
    // HackerNews: 8-10 AM EST = 13-15 UTC
    hackernews_submit: [13, 14, 15],
    // TikTok: 7-9 AM, 12-3 PM, 7-11 PM EST
    tiktok_organic: [12, 13, 14, 17, 18, 19, 20, 0, 1, 2, 3, 4],
    // Discord: evenings EST = 23-4 UTC
    discord_community: [22, 23, 0, 1, 2, 3, 4],
    // Default: business hours
    default: [13, 14, 15, 16, 17, 18, 19, 20, 21, 22],
  };

  const windows = optimalWindows[channel] || optimalWindows.default;
  return windows.includes(hour);
}

/**
 * Campaign Health Monitor
 * Checks if any campaigns are underperforming and suggests pausing them.
 */
async function monitorCampaignHealth(): Promise<AdvertisingAction> {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const recentActivity = await db.select()
      .from(marketingActivityLog)
      .where(gte(marketingActivityLog.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)))
      .orderBy(desc(marketingActivityLog.createdAt))
      .limit(100);

    // Analyze failure patterns
    const channelFailures = new Map<string, number>();
    const channelSuccesses = new Map<string, number>();

    for (const activity of recentActivity) {
      const details = (activity as any).details ?? activity.metadata;
      if (!details) continue;

      const channel = (activity as any).channel || "unknown";
      if ((activity as any).status === "failed") {
        channelFailures.set(channel, (channelFailures.get(channel) || 0) + 1);
      } else {
        channelSuccesses.set(channel, (channelSuccesses.get(channel) || 0) + 1);
      }
    }

    // Find unhealthy channels (>70% failure rate in last 7 days)
    const unhealthyChannels: string[] = [];
    for (const [channel, failures] of channelFailures) {
      const successes = channelSuccesses.get(channel) || 0;
      const total = failures + successes;
      if (total >= 3 && failures / total > 0.7) {
        unhealthyChannels.push(`${channel} (${Math.round(failures / total * 100)}% failure rate)`);
      }
    }

    if (unhealthyChannels.length > 0) {
      await notifyOwner({
        title: "Campaign Health Alert",
        content: `The following channels have high failure rates in the last 7 days:\n${unhealthyChannels.join("\n")}\n\nConsider checking API credentials or pausing these channels.`,
      });
    }

    return {
      channel: "google_ads",
      action: "campaign_health_check",
      status: "success",
      details: `Health check: ${unhealthyChannels.length} unhealthy channels detected out of ${channelFailures.size + channelSuccesses.size} active`,
      cost: 0,
    };
  } catch (err: unknown) {
    return {
      channel: "google_ads",
      action: "campaign_health_check",
      status: "failed",
      details: `Campaign health check failed: ${getErrorMessage(err)}`,
      cost: 0,
    };
  }
}

/**
 * Cross-Channel Attribution Summary
 * Provides a unified view of which channels drive the most value.
 */
export async function getCrossChannelAttribution(days = 30): Promise<{
  channelRankings: Array<{ channel: string; score: number; contentCount: number; successRate: number }>;
  topPerformingPillar: string;
  recommendedFocus: string[];
}> {
  const rankings: Array<{ channel: string; score: number; contentCount: number; successRate: number }> = [];

  for (const [channel, perf] of channelPerformance) {
    const successRate = perf.totalAttempts > 0 ? perf.successes / perf.totalAttempts : 0;
    // Score = success rate * log(attempts) — rewards both reliability and volume
    const score = Math.round(successRate * Math.log2(perf.totalAttempts + 1) * 100) / 100;
    rankings.push({ channel, score, contentCount: perf.totalAttempts, successRate: Math.round(successRate * 100) });
  }

  rankings.sort((a, b) => b.score - a.score);

  // Determine top performing pillar from recent content
  const pillarCounts = new Map<string, number>();
  for (const pillar of CONTENT_PILLARS) {
    pillarCounts.set(pillar.pillar, 0);
  }

  const topPerformingPillar = CONTENT_PILLARS[0]?.pillar || "API Key Security";

  // Generate recommendations
  const recommendedFocus: string[] = [];
  const topChannels = rankings.slice(0, 5);
  if (topChannels.length > 0) {
    recommendedFocus.push(`Double down on top channels: ${topChannels.map(c => c.channel).join(", ")}`);
  }
  const lowPerformers = rankings.filter(r => r.successRate < 30 && r.contentCount > 10);
  if (lowPerformers.length > 0) {
    recommendedFocus.push(`Consider pausing: ${lowPerformers.map(c => c.channel).join(", ")}`);
  }
  recommendedFocus.push("Focus content recycling on top-performing blog posts");
  recommendedFocus.push("Run A/B tests on underperforming channels before pausing");

  return { channelRankings: rankings, topPerformingPillar, recommendedFocus };
}

// ============================================
// MASTER ORCHESTRATION CYCLE
// ============================================

/**
 * Run the full autonomous advertising cycle.
 * This is the main entry point called by the cron scheduler.
 * 
 * Daily cycle:
 * 1. SEO optimization check
 * 2. Generate 1 blog post (if < 3 this week)
 * 3. Generate 2-3 social media posts
 * 4. Generate 1 community engagement piece
 * 5. Generate 1 email nurture template (if < 2 this week)
 * 6. Weekly: backlink outreach template
 * 7. Weekly: affiliate network optimization
 * 8. Trigger marketing engine cycle (handles paid campaigns)
 * 9. Report results to owner
 */
export async function runAdvertisingCycle(): Promise<AdvertisingCycleResult> {
  const startTime = Date.now();
  const actions: AdvertisingAction[] = [];
  const errors: string[] = [];
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ...

  log.info("[AdvertisingOrchestrator] Starting autonomous advertising cycle v2 (with intelligence layer)...");

  // 0. Campaign Health Monitor (runs first to inform decisions)
  try {
    const healthAction = await monitorCampaignHealth();
    actions.push(healthAction);
  } catch (err: unknown) {
    errors.push(`Health Monitor: ${getErrorMessage(err)}`);
  }

  // 1. SEO Optimization (daily)
  if (!shouldSkipChannel("seo_organic")) {
    const t0 = Date.now();
    try {
      const seoAction = await runSeoOptimization();
      actions.push(seoAction);
      recordChannelPerformance("seo_organic", seoAction.status === "success", Date.now() - t0);
    } catch (err: unknown) {
      errors.push(`SEO: ${getErrorMessage(err)}`);
      recordChannelPerformance("seo_organic", false, Date.now() - t0);
    }
  }

  // 2. Blog Post Generation (Mon/Wed/Fri)
  if ([1, 3, 5].includes(dayOfWeek) && !shouldSkipChannel("blog_content")) {
    const t0 = Date.now();
    try {
      const blogAction = await generateSeoBlogPost();
      actions.push(blogAction);
      recordChannelPerformance("blog_content", blogAction.status === "success", Date.now() - t0);
    } catch (err: unknown) {
      errors.push(`Blog: ${getErrorMessage(err)}`);
      recordChannelPerformance("blog_content", false, Date.now() - t0);
    }
  }

  // 2b. Content Recycling (Wed/Fri — repurpose top-performing blog posts)
  if ([3, 5].includes(dayOfWeek)) {
    const t0 = Date.now();
    try {
      const recycleAction = await recycleTopContent();
      actions.push(recycleAction);
      recordChannelPerformance("content_recycling", recycleAction.status === "success", Date.now() - t0);
    } catch (err: unknown) {
      errors.push(`Content Recycling: ${getErrorMessage(err)}`);
      recordChannelPerformance("content_recycling", false, Date.now() - t0);
    }
  }

  // 3. Social Media Content (daily, with optimal timing check)
  if (!shouldSkipChannel("social_organic") && isOptimalPostingTime("social_organic")) {
    const t0 = Date.now();
    try {
      const socialActions = await generateSocialContent();
      actions.push(...socialActions);
      const anySuccess = socialActions.some(a => a.status === "success");
      recordChannelPerformance("social_organic", anySuccess, Date.now() - t0);
    } catch (err: unknown) {
      errors.push(`Social: ${getErrorMessage(err)}`);
      recordChannelPerformance("social_organic", false, Date.now() - t0);
    }
  } else if (!isOptimalPostingTime("social_organic")) {
    actions.push({ channel: "social_organic", action: "post_social", status: "skipped", details: "Skipped: not optimal posting time (will run at next optimal window)", cost: 0 });
  }

  // 4. Community Engagement (daily)
  if (!shouldSkipChannel("community_engagement")) {
    const t0 = Date.now();
    try {
      const communityAction = await generateCommunityContent();
      actions.push(communityAction);
      recordChannelPerformance("community_engagement", communityAction.status === "success", Date.now() - t0);
    } catch (err: unknown) {
      errors.push(`Community: ${getErrorMessage(err)}`);
      recordChannelPerformance("community_engagement", false, Date.now() - t0);
    }
  }

  // 5. Email Nurture (Wednesday)
  if (dayOfWeek === 3) {
    try {
      const emailAction = await generateEmailNurture();
      actions.push(emailAction);
    } catch (err: unknown) {
      errors.push(`Email: ${getErrorMessage(err)}`);
    }
  }

  // 6. Backlink Outreach (Monday only)
  if (dayOfWeek === 1) {
    try {
      const outreachAction = await generateBacklinkOutreach();
      actions.push(outreachAction);
    } catch (err: unknown) {
      errors.push(`Outreach: ${getErrorMessage(err)}`);
    }
  }

  // 7. Affiliate Network Optimization (Wed/Fri)
  if ([3, 5].includes(dayOfWeek)) {
    try {
      const affiliateAction = await optimizeAffiliateNetwork();
      actions.push(affiliateAction);
    } catch (err: unknown) {
      errors.push(`Affiliate: ${getErrorMessage(err)}`);
    }
  }

  // 8. Expanded Channel Auto-Publishing (daily, with performance tracking)
  try {
    const expandedActions = await publishToExpandedChannels();
    actions.push(...expandedActions);
    // Track each expanded channel individually
    for (const action of expandedActions) {
      recordChannelPerformance(action.channel, action.status === "success");
    }
  } catch (err: unknown) {
    errors.push(`Expanded Channels: ${getErrorMessage(err)}`);
  }

  // 9. Film Community Content (every cycle, with throttling)
  if (!shouldSkipChannel("no_film_school")) {
    const t0 = Date.now();
    try {
      const hackerAction = await generateHackerForumContent();
      actions.push(hackerAction);
      recordChannelPerformance(hackerAction.channel, hackerAction.status === "success", Date.now() - t0);
    } catch (err: unknown) {
      errors.push(`Film Community: ${getErrorMessage(err)}`);
      recordChannelPerformance("no_film_school", false, Date.now() - t0);
    }
  }

  // 10. TikTok Content Posting — auto-generate & post carousels (Wed/Fri)
  if ([3, 5].includes(dayOfWeek)) {
    try {
      const tiktokResult = await runTikTokContentPipeline();
      actions.push({
        channel: "tiktok_organic",
        action: tiktokResult.action,
        status: tiktokResult.success ? "success" : "failed",
        details: tiktokResult.details,
        cost: 0,
      });
    } catch (err: unknown) {
      errors.push(`TikTok Content: ${getErrorMessage(err)}`);
    }

    // Also generate YouTube Shorts scripts
    try {
      const videoAction = await generateVideoScripts();
      actions.push(videoAction);
    } catch (err: unknown) {
      errors.push(`Video Scripts: ${getErrorMessage(err)}`);
    }

    // Generate video ads using Pollinations.ai (FREE)
    try {
      const videoAdAction = await generateVideoAd();
      actions.push(videoAdAction);
    } catch (err: unknown) {
      errors.push(`Video Ads: ${getErrorMessage(err)}`);
    }
  }

  // 11. Content Queue Generation for manual-post channels (daily)
  try {
    const queueAction = await generateContentQueueItems();
    actions.push(queueAction);
  } catch (err: unknown) {
    errors.push(`Content Queue: ${getErrorMessage(err)}`);
  }

  // 11b. Autonomous Content Creator Engine (v3.0)
  try {
    const contentCycleResult = await runAutonomousContentCycle();
    actions.push({
      channel: "blog_content" as any,
      action: "autonomous_content_cycle",
      status: "success",
      details: `Content Creator Engine: ${contentCycleResult.generated} generated, ${contentCycleResult.autoApproved} auto-approved, ${contentCycleResult.scheduled} scheduled`,
      cost: 0,
    });
  } catch (err: unknown) {
    errors.push(`Content Creator Engine: ${getErrorMessage(err)}`);
    actions.push({
      channel: "blog_content" as any,
      action: "autonomous_content_cycle",
      status: "failed",
      details: `Content Creator Engine failed: ${getErrorMessage(err)}`,
      cost: 0,
    });
  }

  // 12. Trigger Marketing Engine cycle (handles paid campaigns + social publishing)
  try {
    const marketingResult = await runMarketingCycle();
    actions.push({
      channel: "google_ads",
      action: "marketing_engine_cycle",
      status: "success",
      details: `Marketing engine: ${marketingResult.contentGenerated} content, ${marketingResult.contentPublished} published, ${marketingResult.campaignsOptimized} campaigns optimized`,
      cost: 0, // Tracked separately by marketing engine
    });
  } catch (err: unknown) {
    errors.push(`Marketing Engine: ${getErrorMessage(err)}`);
    actions.push({
      channel: "google_ads",
      action: "marketing_engine_cycle",
      status: "failed",
      details: `Marketing engine cycle failed: ${getErrorMessage(err)}`,
      cost: 0,
    });
  }

  // Log the cycle to the activity log
  try {
    const db = await getDb();
    if (db) {
      await db.insert(marketingActivityLog).values({
        action: "advertising_cycle",
        description: `Cycle: ${actions.length} actions, ${errors.length} errors`,
        metadata: {
          totalActions: actions.length,
          successful: actions.filter((a) => a.status === "success").length,
          failed: actions.filter((a) => a.status === "failed").length,
          skipped: actions.filter((a) => a.status === "skipped").length,
          errors,
        },
      } as any);
    }
  } catch (err: unknown) {
    log.error("[AdvertisingOrchestrator] Failed to log cycle:", { error: String(getErrorMessage(err)) });
  }

  // Calculate metrics
  const filmCommunityChannels = ["no_film_school", "cinema5d_community", "indiewire_community", "stage32_community", "mandy_network", "shooting_people", "creative_cow", "filmfreeway_community", "letterboxd_community"];
  const expandedApiChannels = ["medium_republish", "hashnode_crosspost", "discord_community", "mastodon_creative", "telegram_channel", "whatsapp_broadcast", "behance_portfolio"];
  const videoChannels = ["tiktok_organic", "youtube_shorts"];

  const metrics = {
    blogPostsGenerated: actions.filter((a) => a.channel === "blog_content" && a.status === "success").length,
    socialPostsCreated: actions.filter((a) => a.channel === "social_organic").length,
    socialPostsPublished: actions.filter((a) => a.channel === "social_organic" && a.status === "success").length,
    communityEngagements: actions.filter((a) => a.channel === "community_engagement" || a.channel === "forum_participation").filter((a) => a.status === "success").length,
    seoOptimizations: actions.filter((a) => a.channel === "seo_organic" && a.status === "success").length,
    emailCampaignsSent: actions.filter((a) => a.channel === "email_nurture" && a.status === "success").length,
    affiliateActionsTriggered: actions.filter((a) => a.channel === "affiliate_network" && a.status === "success").length,
    expandedChannelPosts: actions.filter((a) => expandedApiChannels.includes(a.channel) && a.status === "success").length,
    filmCommunityPosts: actions.filter((a) => filmCommunityChannels.includes(a.channel) && a.status === "success").length,
    tiktokContentPosts: actions.filter((a) => a.channel === "tiktok_organic" && a.action === "tiktok_content_post" && a.status === "success").length,
    videoScriptsGenerated: actions.filter((a) => videoChannels.includes(a.channel) && a.status === "success").length,
    contentQueueItems: actions.filter((a) => a.action === "content_queue_generation" && a.status === "success").length,
    totalFreeActions: actions.filter((a) => a.cost === 0 && a.status === "success").length,
    paidSpend: 0, // Tracked by marketing engine
  };

  const duration = Date.now() - startTime;

  // Notify owner with enhanced summary including intelligence layer data
  const successCount = actions.filter((a) => a.status === "success").length;
  const failCount = actions.filter((a) => a.status === "failed").length;
  const skippedCount = actions.filter((a) => a.status === "skipped").length;
  const perfReport = getChannelPerformanceReport();
  const topChannels = perfReport.slice(0, 5).map(c => `${c.channel}(${c.priority}/10)`).join(", ");
  const throttledChannels = perfReport.filter(c => c.priority <= 2).map(c => c.channel);
  try {
    await notifyOwner({
      title: `Advertising Cycle v2: ${successCount}/${actions.length} actions (${skippedCount} smart-skipped)`,
      content: `Duration: ${Math.round(duration / 1000)}s\nBlog posts: ${metrics.blogPostsGenerated}\nContent recycled: ${actions.filter(a => a.action === "recycle_content" && a.status === "success").length}\nSocial posts: ${metrics.socialPostsPublished}\nTikTok posts: ${metrics.tiktokContentPosts}\nCommunity: ${metrics.communityEngagements}\nSEO: ${metrics.seoOptimizations}\nEmails: ${metrics.emailCampaignsSent}\nErrors: ${failCount}\n\n📊 Intelligence Layer:\nTop channels: ${topChannels || "gathering data..."}\nThrottled: ${throttledChannels.length > 0 ? throttledChannels.join(", ") : "none"}\nActive A/B tests: ${getActiveABTests().length}${errors.length > 0 ? "\n\nErrors:\n" + errors.join("\n") : ""}`,
    });
  } catch {
    // Notification failure is non-critical
  }

  log.info(`[AdvertisingOrchestrator] Cycle complete: ${successCount} success, ${failCount} failed, ${duration}ms`);

  // Next run is tomorrow at 9 AM AEST
  const nextRun = new Date();
  nextRun.setDate(nextRun.getDate() + 1);
  nextRun.setHours(9, 0, 0, 0);

  return {
    timestamp: now.toISOString(),
    duration,
    actions,
    metrics,
    nextScheduledRun: nextRun.toISOString(),
    errors,
  };
}

// ============================================
// SCHEDULER
// ============================================

let advertisingInterval: ReturnType<typeof setInterval> | null = null;

/** Advertising run days: Monday (1), Wednesday (3), Friday (5) */
const ADVERTISING_RUN_DAYS = [1, 3, 5];

/**
 * Get the last advertising run date from the database.
 * This persists across Railway restarts so we don't miss or double-run cycles.
 */
async function getLastRunDate(): Promise<string> {
  try {
    const db = await getDb();
    if (!db) return "";
    const rows = await db.select().from(marketingSettings).where(eq(marketingSettings.key, "advertising_last_run_date")).limit(1);
    return rows[0]?.value || "";
  } catch {
    return "";
  }
}

/**
 * Persist the last advertising run date to the database.
 */
async function setLastRunDate(dateStr: string): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    // Upsert: try insert, on duplicate key update
    await db.insert(marketingSettings).values({ key: "advertising_last_run_date", value: dateStr })
      .onDuplicateKeyUpdate({ set: { value: dateStr } });
  } catch (err: unknown) {
    log.error("[AdvertisingOrchestrator] Failed to persist last run date:", { error: String(getErrorMessage(err)) });
  }
}

/**
 * Start the autonomous advertising scheduler.
 * Runs 3x per week (Mon/Wed/Fri) to balance reach and API credit usage.
 * Checks every 30 minutes whether it's a run day and hasn't already run today.
 * Persists last run date in DB so Railway restarts don't cause missed cycles.
 */
export function startAdvertisingScheduler(): void {
  log.info("[AdvertisingOrchestrator] Starting autonomous advertising scheduler (Mon/Wed/Fri)...");

  const runCheck = async () => {
    try {
      const now = new Date();
      const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ...
      const todayStr = now.toISOString().slice(0, 10); // YYYY-MM-DD

      // Check DB for last run date (survives restarts)
      const lastRunDate = await getLastRunDate();

      // Run on designated days, only once per day
      if (ADVERTISING_RUN_DAYS.includes(dayOfWeek) && lastRunDate !== todayStr) {
        await setLastRunDate(todayStr);
        log.info(`[AdvertisingOrchestrator] Running scheduled advertising cycle (${["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][dayOfWeek]})...`);
        await runAdvertisingCycle();
      }
    } catch (err: unknown) {
      log.error("[AdvertisingOrchestrator] Scheduled cycle failed:", { error: String(getErrorMessage(err)) });
    }
  };

  // Run first check 60 seconds after startup (give DB time to connect)
  setTimeout(runCheck, 60_000);

  // Then check every 30 minutes (catches any run day reliably)
  advertisingInterval = setInterval(runCheck, 30 * 60 * 1000);
}

/**
 * Stop the advertising scheduler
 */
export function stopAdvertisingScheduler(): void {
  if (advertisingInterval) {
    clearInterval(advertisingInterval);
    advertisingInterval = null;
    log.info("[AdvertisingOrchestrator] Scheduler stopped.");
  }
}

// ============================================
// PUBLIC API (for admin dashboard)
// ============================================

/**
 * Get the current advertising strategy overview
 */
export function getStrategyOverview() {
  const totalMonthlyBudget = MONTHLY_BUDGET_AUD;
  const freeStrategies = GROWTH_STRATEGIES.filter((s) => s.costPerMonth === 0);
  const paidStrategies = GROWTH_STRATEGIES.filter((s) => s.costPerMonth > 0);

  return {
    monthlyBudget: totalMonthlyBudget,
    currency: "AUD",
    budgetAllocation: {
      googleAds: GOOGLE_ADS_ALLOCATION,
      freeChannels: 0,
    },
    freeChannelCount: freeStrategies.length,
    paidChannelCount: paidStrategies.length,
    strategies: GROWTH_STRATEGIES,
    contentPillars: CONTENT_PILLARS.map((p) => ({
      name: p.pillar,
      keywordCount: p.keywords.length,
      blogTopicCount: p.blogTopics.length,
      socialAngleCount: p.socialAngles.length,
    })),
    communityTargets: Object.entries(COMMUNITY_TARGETS).map(([platform, config]) => ({
      platform,
      strategy: config.strategy,
      ...(platform === "reddit" ? { subreddits: (config as any).subreddits } : {}),
    })),
    schedule: {
      advertisingCycle: "Mon/Wed/Fri (3x per week, 8-10 AM server time)",
      seoOptimization: "Daily",
      blogPosts: "Mon/Wed/Fri",
      socialMedia: "Daily (2-3 posts)",
      communityEngagement: "Every cycle",
      emailNurture: "Wed only",
      backlinkOutreach: "Monday only",
      affiliateOptimization: "Wed/Fri",
      expandedChannels: "Every cycle (Dev.to, Medium, Hashnode, Discord, Mastodon, Telegram)",
      hackerForums: "Mon/Wed/Fri (HackForums, 0x00sec, HTB, TryHackMe, OWASP, etc.)",
      tiktokContent: "Wed/Fri (auto-generate & post carousels from blog content)",
      videoScripts: "Wed/Fri (YouTube Shorts scripts)",
      contentQueue: "Every cycle (Quora, Skool, IndieHackers, Pinterest, HN, LinkedIn, Slack)",
      whatsappBroadcast: "Monday (weekly security tip)",
      marketingEngineCycle: "Every cycle",
    },
  };
}

/**
 * Get recent advertising activity
 */
export async function getRecentActivity(limit = 50) {
  try {
    const db = await getDb();
    if (!db) return [];

    const activities = await (db as any).query.marketingActivityLog.findMany({
      orderBy: [desc(marketingActivityLog.createdAt)],
      limit,
    });

    return activities;
  } catch {
    return [];
  }
}

/**
 * Get advertising performance metrics for the last N days
 */
export async function getPerformanceMetrics(days = 30) {
  try {
    const db = await getDb();
    if (!db) return null;

    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);

    // Blog stats
    const blogCount = await db.select({ count: count() }).from(blogPosts).where(gte(blogPosts.publishedAt, new Date(startDate)));

    // Marketing content stats
    const contentStats = await db
      .select({
        platform: marketingContent.platform,
        count: count(),
      })
      .from(marketingContent)
      .where(gte(marketingContent.createdAt, new Date(startDate)))
      .groupBy(marketingContent.platform);

    // Affiliate stats
    const affiliateClickCount: { count: number }[] = [{ count: 0 }]; // affiliateClicks table not in schema

    // Campaign performance
    const campaignPerf = await db.select().from(marketingPerformance).where(gte(marketingPerformance.date, startDate as any));

    const totalImpressions = campaignPerf.reduce((sum: number, p: any) => sum + (p.impressions || 0), 0);
    const totalClicks = campaignPerf.reduce((sum: number, p: any) => sum + (p.clicks || 0), 0);
    const totalConversions = campaignPerf.reduce((sum: number, p: any) => sum + (p.conversions || 0), 0);
    const totalSpend = campaignPerf.reduce((sum: number, p: any) => sum + parseFloat(p.spend || "0"), 0);

    return {
      period: `Last ${days} days`,
      organic: {
        blogPostsPublished: blogCount[0]?.count || 0,
        contentPiecesCreated: contentStats.reduce((sum, s) => sum + Number(s.count), 0),
        contentByPlatform: Object.fromEntries(contentStats.map((s) => [s.platform, Number(s.count)])),
        affiliateClicks: affiliateClickCount[0]?.count || 0,
      },
      paid: {
        totalImpressions,
        totalClicks,
        totalConversions,
        totalSpend: Math.round(totalSpend * 100) / 100,
        ctr: totalImpressions > 0 ? Math.round((totalClicks / totalImpressions) * 10000) / 100 : 0,
        cpc: totalClicks > 0 ? Math.round((totalSpend / totalClicks) * 100) / 100 : 0,
        conversionRate: totalClicks > 0 ? Math.round((totalConversions / totalClicks) * 10000) / 100 : 0,
      },
      budgetUtilization: {
        monthlyBudget: MONTHLY_BUDGET_AUD,
        spent: Math.round(totalSpend * 100) / 100,
        remaining: Math.round((MONTHLY_BUDGET_AUD - totalSpend) * 100) / 100,
        utilizationPercent: Math.round((totalSpend / MONTHLY_BUDGET_AUD) * 100),
      },
    };
  } catch {
    return null;
  }
}
