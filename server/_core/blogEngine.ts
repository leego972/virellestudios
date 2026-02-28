import { invokeLLM } from "./llm";
import { ENV } from "./env";

// ============================================================
// AUTONOMOUS SEO BLOG ENGINE
// Generates and publishes articles about AI filmmaking on autopilot
// ============================================================

// Blog categories with SEO-optimized topic pools
const BLOG_CATEGORIES = {
  "ai-filmmaking": {
    label: "AI Filmmaking",
    topics: [
      "How AI is revolutionizing independent filmmaking in {year}",
      "The complete guide to AI-generated cinematography",
      "From script to screen: How AI automates the entire film pipeline",
      "AI vs traditional filmmaking: A cost and quality comparison",
      "How indie filmmakers are using AI to compete with Hollywood studios",
      "The future of AI-generated actors and digital humans in cinema",
      "Creating your first AI film: A step-by-step beginner's guide",
      "How AI color grading is matching the look of Oscar-winning films",
      "AI storyboarding: From concept to visual narrative in minutes",
      "The rise of one-person film studios powered by AI",
      "How AI is democratizing access to Hollywood-quality visual effects",
      "Building a film portfolio with AI: Tips for aspiring directors",
    ],
  },
  "cinematography": {
    label: "Cinematography & Visuals",
    topics: [
      "Understanding cinematic lighting: A guide for AI-assisted filmmakers",
      "The art of composition in AI-generated scenes",
      "How to achieve the Roger Deakins look with AI cinematography",
      "Film stock emulation: Recreating classic cinema aesthetics with AI",
      "Anamorphic vs spherical lenses: How AI simulates both",
      "Color theory for filmmakers: How AI applies it automatically",
      "Creating depth in AI-generated scenes: Foreground, midground, background",
      "The psychology of camera movement in AI filmmaking",
      "How to direct AI to create specific moods through lighting",
      "Mastering the golden hour look in AI-generated footage",
    ],
  },
  "industry-trends": {
    label: "Industry Trends",
    topics: [
      "How AI film studios are disrupting the {year} entertainment industry",
      "The economics of AI filmmaking: Why studios are paying attention",
      "AI in Hollywood: Which major studios are adopting AI tools",
      "The ethical debate around AI-generated content in cinema",
      "How streaming platforms are embracing AI-created content",
      "The future of film festivals in the age of AI cinema",
      "AI filmmaking tools comparison: What's available in {year}",
      "How AI is changing the role of the film director",
      "The impact of AI on film industry jobs: Threat or opportunity",
      "Predictions for AI cinema in the next 5 years",
    ],
  },
  "tutorials": {
    label: "Tutorials & How-To",
    topics: [
      "How to write prompts that produce cinematic AI imagery",
      "Creating consistent characters across AI-generated scenes",
      "How to plan a multi-scene AI film with narrative coherence",
      "Advanced prompt engineering for photorealistic AI film output",
      "How to use AI to generate a movie trailer from scratch",
      "Building a sci-fi world with AI: Visual worldbuilding techniques",
      "How to create horror film atmospherics with AI generation",
      "Directing AI: How to control camera angles and composition",
      "Creating emotional depth in AI-generated scenes",
      "How to produce a short film entirely with AI in under an hour",
    ],
  },
  "behind-the-scenes": {
    label: "Behind the Scenes",
    topics: [
      "How VirÉlle Studios' AI engine creates Hollywood-quality imagery",
      "The technology behind AI film generation: A deep dive",
      "How we trained our AI to understand cinematic language",
      "Building an AI film studio: The engineering challenges we solved",
      "How AI understands genre and applies the right visual style",
      "The science of photorealistic AI: How we eliminate the uncanny valley",
      "From pixels to emotion: How AI creates scenes that feel real",
      "How our prompt engine references real cinematographers' techniques",
    ],
  },
};

type BlogCategory = keyof typeof BLOG_CATEGORIES;

// Track which topics have been used to avoid repetition
const usedTopicHashes = new Set<string>();

function hashTopic(topic: string): string {
  let hash = 0;
  for (let i = 0; i < topic.length; i++) {
    const char = topic.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return String(hash);
}

function pickRandomTopic(): { category: BlogCategory; topic: string } {
  const categories = Object.keys(BLOG_CATEGORIES) as BlogCategory[];
  const year = new Date().getFullYear();

  // Try up to 50 times to find an unused topic
  for (let attempt = 0; attempt < 50; attempt++) {
    const category = categories[Math.floor(Math.random() * categories.length)];
    const topics = BLOG_CATEGORIES[category].topics;
    const topic = topics[Math.floor(Math.random() * topics.length)].replace("{year}", String(year));
    const hash = hashTopic(topic);

    if (!usedTopicHashes.has(hash)) {
      usedTopicHashes.add(hash);
      return { category, topic };
    }
  }

  // Fallback: clear used topics and pick fresh
  usedTopicHashes.clear();
  const category = categories[Math.floor(Math.random() * categories.length)];
  const topics = BLOG_CATEGORIES[category].topics;
  const topic = topics[Math.floor(Math.random() * topics.length)].replace("{year}", String(new Date().getFullYear()));
  usedTopicHashes.add(hashTopic(topic));
  return { category, topic };
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 200);
}

export interface GeneratedArticle {
  title: string;
  subtitle: string;
  slug: string;
  content: string;
  excerpt: string;
  category: string;
  tags: string[];
  metaTitle: string;
  metaDescription: string;
  generationPrompt: string;
}

/**
 * Generate a full SEO-optimized blog article using the LLM.
 * Produces 1500-2500 word articles with proper structure.
 */
export async function generateBlogArticle(): Promise<GeneratedArticle> {
  const { category, topic } = pickRandomTopic();
  const categoryLabel = BLOG_CATEGORIES[category].label;

  const systemPrompt = `You are an expert content writer for VirÉlle Studios, an AI-powered film production platform. 
You write authoritative, engaging, SEO-optimized blog articles about AI filmmaking, cinematography, and the film industry.

WRITING GUIDELINES:
- Write in a professional but accessible tone — authoritative yet approachable
- Target audience: aspiring filmmakers, indie creators, film students, tech enthusiasts
- Include practical insights, real techniques, and actionable advice
- Naturally mention VirÉlle Studios where relevant (not forced — organic mentions only)
- Use proper Markdown formatting: ## headings, **bold**, *italic*, bullet points, numbered lists
- Include 2-3 internal references like "tools like VirÉlle Studios" or "platforms such as VirÉlle Studios" naturally
- Article length: 1500-2500 words
- Structure: Introduction → 4-6 main sections with ## headings → Conclusion
- Each section should have 2-4 paragraphs
- Include relevant statistics or industry facts where appropriate
- End with a compelling conclusion that encourages the reader to try AI filmmaking

SEO REQUIREMENTS:
- Use the target keyword naturally 3-5 times throughout the article
- Include related long-tail keywords
- Write scannable content with clear headings
- First paragraph should hook the reader and include the main keyword`;

  const userPrompt = `Write a comprehensive blog article about: "${topic}"

Category: ${categoryLabel}

Return your response as JSON with this exact structure:
{
  "title": "SEO-optimized article title (50-70 characters ideal)",
  "subtitle": "Compelling subtitle that expands on the title",
  "content": "Full article in Markdown format",
  "excerpt": "2-3 sentence summary for meta description and article cards (150-160 characters)",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "metaTitle": "SEO title for search results (50-60 characters)",
  "metaDescription": "Meta description for search results (150-160 characters)"
}`;

  try {
    const result = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      responseFormat: { type: "json_object" },
      maxTokens: 8192,
    });

    const content = typeof result.choices[0]?.message?.content === "string"
      ? result.choices[0].message.content
      : Array.isArray(result.choices[0]?.message?.content)
        ? result.choices[0].message.content.map((p: any) => p.text || "").join("")
        : "";

    const parsed = JSON.parse(content);
    const slug = slugify(parsed.title || topic) + "-" + Date.now().toString(36);

    return {
      title: parsed.title || topic,
      subtitle: parsed.subtitle || "",
      slug,
      content: parsed.content || "",
      excerpt: parsed.excerpt || "",
      category,
      tags: Array.isArray(parsed.tags) ? parsed.tags : [category],
      metaTitle: parsed.metaTitle || parsed.title || topic,
      metaDescription: parsed.metaDescription || parsed.excerpt || "",
      generationPrompt: topic,
    };
  } catch (error: any) {
    console.error("[BlogEngine] Article generation failed:", error.message);
    throw error;
  }
}

/**
 * Start the autonomous blog scheduler.
 * Generates and publishes articles on a regular schedule.
 * - Publishes 1 article every 8 hours (3 per day)
 * - Staggers initial publish to avoid burst
 */
export function startBlogScheduler(
  publishFn: (article: GeneratedArticle) => Promise<void>
) {
  const INTERVAL_MS = 8 * 60 * 60 * 1000; // 8 hours
  const INITIAL_DELAY_MS = 60 * 1000; // 1 minute after server start

  console.log("[BlogEngine] Autonomous blog scheduler started. Publishing every 8 hours.");

  // First article shortly after server start
  setTimeout(async () => {
    try {
      console.log("[BlogEngine] Generating initial article...");
      const article = await generateBlogArticle();
      await publishFn(article);
      console.log(`[BlogEngine] Published: "${article.title}"`);
    } catch (err: any) {
      console.error("[BlogEngine] Failed to generate initial article:", err.message);
    }
  }, INITIAL_DELAY_MS);

  // Recurring generation
  setInterval(async () => {
    try {
      console.log("[BlogEngine] Generating scheduled article...");
      const article = await generateBlogArticle();
      await publishFn(article);
      console.log(`[BlogEngine] Published: "${article.title}"`);
    } catch (err: any) {
      console.error("[BlogEngine] Scheduled generation failed:", err.message);
    }
  }, INTERVAL_MS);
}
