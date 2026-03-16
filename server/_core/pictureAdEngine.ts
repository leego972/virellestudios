/**
 * Picture Ad Engine
 * Generates professional picture ads with text overlays for social media.
 * Uses sharp + SVG for high-quality image composition.
 * 
 * Supports:
 * - Square (1:1) — Instagram, Facebook, TikTok profile
 * - Portrait (4:5) — Instagram feed, Facebook
 * - Story (9:16) — Instagram/TikTok stories
 * - Landscape (16:9) — LinkedIn, Twitter/X
 * - Banner (1200x628) — LinkedIn, Facebook link preview
 */

import sharp from "sharp";
import { generateImage } from "./imageGeneration";
import { uploadBufferToS3 } from "./s3Upload";
import { logger } from "./logger";
import { invokeLLM } from "./llm";

export type AdFormat = "square" | "portrait" | "story" | "landscape" | "banner";
export type AdStyle = "minimal" | "bold" | "cinematic" | "gradient" | "dark" | "light";

export interface PictureAdOptions {
  /** Main headline text */
  headline: string;
  /** Sub-headline or body text (optional) */
  subtext?: string;
  /** Call-to-action text */
  cta?: string;
  /** Brand/company name */
  brand?: string;
  /** Background image URL (optional — will be AI-generated if not provided) */
  backgroundImageUrl?: string;
  /** Visual style */
  style?: AdStyle;
  /** Ad format / dimensions */
  format?: AdFormat;
  /** Brand color (hex) */
  brandColor?: string;
  /** Whether to include the Virelle Studios logo/watermark */
  includeWatermark?: boolean;
  /** Topic for AI background image generation */
  backgroundTopic?: string;
}

export interface PictureAdResult {
  success: boolean;
  imageUrl?: string;
  width?: number;
  height?: number;
  format?: AdFormat;
  error?: string;
}

const FORMAT_DIMENSIONS: Record<AdFormat, { width: number; height: number }> = {
  square: { width: 1080, height: 1080 },
  portrait: { width: 1080, height: 1350 },
  story: { width: 1080, height: 1920 },
  landscape: { width: 1280, height: 720 },
  banner: { width: 1200, height: 628 },
};

/**
 * Escape special XML/SVG characters in text
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Wrap text into multiple lines for SVG rendering
 */
function wrapText(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length <= maxCharsPerLine) {
      current = (current + " " + word).trim();
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * Build SVG overlay for the ad
 */
function buildAdSvg(
  width: number,
  height: number,
  options: PictureAdOptions,
  style: AdStyle
): string {
  const brandColor = options.brandColor || "#d4a843";
  const headlineLines = wrapText(options.headline, Math.floor(width / 28));
  const subtextLines = options.subtext ? wrapText(options.subtext, Math.floor(width / 22)) : [];
  const cta = options.cta || "";
  const brand = options.brand || "Virelle Studios";

  // Style-specific settings
  const overlayConfigs: Record<AdStyle, {
    overlayColor: string;
    overlayOpacity: number;
    headlineColor: string;
    subtextColor: string;
    ctaBg: string;
    ctaText: string;
    fontWeight: string;
    textAlign: string;
    position: "top" | "bottom" | "center";
  }> = {
    minimal: {
      overlayColor: "#000000", overlayOpacity: 0.45,
      headlineColor: "#ffffff", subtextColor: "#e5e5e5",
      ctaBg: brandColor, ctaText: "#000000",
      fontWeight: "600", textAlign: "middle", position: "bottom",
    },
    bold: {
      overlayColor: "#000000", overlayOpacity: 0.65,
      headlineColor: brandColor, subtextColor: "#ffffff",
      ctaBg: brandColor, ctaText: "#000000",
      fontWeight: "700", textAlign: "middle", position: "center",
    },
    cinematic: {
      overlayColor: "#0a0a0a", overlayOpacity: 0.55,
      headlineColor: "#f5f5f5", subtextColor: "#a3a3a3",
      ctaBg: brandColor, ctaText: "#0a0a0a",
      fontWeight: "600", textAlign: "middle", position: "bottom",
    },
    gradient: {
      overlayColor: "#000000", overlayOpacity: 0.0, // gradient handled separately
      headlineColor: "#ffffff", subtextColor: "#f0f0f0",
      ctaBg: brandColor, ctaText: "#000000",
      fontWeight: "700", textAlign: "middle", position: "bottom",
    },
    dark: {
      overlayColor: "#000000", overlayOpacity: 0.75,
      headlineColor: brandColor, subtextColor: "#d4d4d4",
      ctaBg: brandColor, ctaText: "#000000",
      fontWeight: "700", textAlign: "middle", position: "center",
    },
    light: {
      overlayColor: "#ffffff", overlayOpacity: 0.80,
      headlineColor: "#111111", subtextColor: "#444444",
      ctaBg: "#111111", ctaText: "#ffffff",
      fontWeight: "600", textAlign: "middle", position: "bottom",
    },
  };

  const cfg = overlayConfigs[style];
  const headlineFontSize = Math.min(Math.floor(width / 12), 90);
  const subtextFontSize = Math.min(Math.floor(width / 22), 42);
  const ctaFontSize = Math.min(Math.floor(width / 28), 36);
  const brandFontSize = Math.min(Math.floor(width / 36), 28);
  const lineHeight = headlineFontSize * 1.2;
  const subtextLineHeight = subtextFontSize * 1.3;

  // Calculate text block position
  const totalHeadlineHeight = headlineLines.length * lineHeight;
  const totalSubtextHeight = subtextLines.length * subtextLineHeight;
  const ctaHeight = cta ? ctaFontSize * 2.5 : 0;
  const totalTextHeight = totalHeadlineHeight + (subtextLines.length > 0 ? 20 + totalSubtextHeight : 0) + (cta ? 30 + ctaHeight : 0);

  let textStartY: number;
  if (cfg.position === "bottom") {
    textStartY = height - totalTextHeight - 80;
  } else if (cfg.position === "top") {
    textStartY = 80;
  } else {
    textStartY = (height - totalTextHeight) / 2;
  }

  const cx = width / 2;
  const padding = Math.floor(width * 0.08);

  // Build gradient definition for gradient style
  const gradientDef = style === "gradient" ? `
    <defs>
      <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="transparent" stop-opacity="0"/>
        <stop offset="50%" stop-color="#000000" stop-opacity="0.3"/>
        <stop offset="100%" stop-color="#000000" stop-opacity="0.85"/>
      </linearGradient>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#grad)"/>
  ` : `<rect width="${width}" height="${height}" fill="${cfg.overlayColor}" opacity="${cfg.overlayOpacity}"/>`;

  // Build headline lines
  const headlineSvg = headlineLines.map((line, i) => `
    <text
      x="${cx}"
      y="${textStartY + (i + 1) * lineHeight}"
      font-family="'Arial Black', 'Helvetica Neue', Arial, sans-serif"
      font-size="${headlineFontSize}"
      font-weight="${cfg.fontWeight}"
      fill="${cfg.headlineColor}"
      text-anchor="middle"
      dominant-baseline="auto"
    >${escapeXml(line)}</text>
  `).join("");

  // Build subtext lines
  let subtextY = textStartY + totalHeadlineHeight + 20;
  const subtextSvg = subtextLines.map((line, i) => `
    <text
      x="${cx}"
      y="${subtextY + (i + 1) * subtextLineHeight}"
      font-family="'Arial', 'Helvetica Neue', sans-serif"
      font-size="${subtextFontSize}"
      font-weight="400"
      fill="${cfg.subtextColor}"
      text-anchor="middle"
      dominant-baseline="auto"
      opacity="0.9"
    >${escapeXml(line)}</text>
  `).join("");

  // CTA button
  const ctaY = textStartY + totalHeadlineHeight + (subtextLines.length > 0 ? 20 + totalSubtextHeight : 0) + 30;
  const ctaWidth = Math.min(cta.length * (ctaFontSize * 0.65) + 60, width - padding * 2);
  const ctaHeight2 = ctaFontSize * 2.2;
  const ctaX = cx - ctaWidth / 2;
  const ctaSvg = cta ? `
    <rect x="${ctaX}" y="${ctaY}" width="${ctaWidth}" height="${ctaHeight2}" rx="${ctaHeight2 / 2}" fill="${cfg.ctaBg}"/>
    <text
      x="${cx}"
      y="${ctaY + ctaHeight2 / 2}"
      font-family="'Arial', 'Helvetica Neue', sans-serif"
      font-size="${ctaFontSize}"
      font-weight="700"
      fill="${cfg.ctaText}"
      text-anchor="middle"
      dominant-baseline="middle"
    >${escapeXml(cta)}</text>
  ` : "";

  // Brand name at top
  const brandSvg = `
    <text
      x="${padding}"
      y="${brandFontSize + 20}"
      font-family="'Arial', 'Helvetica Neue', sans-serif"
      font-size="${brandFontSize}"
      font-weight="700"
      fill="${brandColor}"
      text-anchor="start"
      dominant-baseline="auto"
      opacity="0.9"
    >${escapeXml(brand)}</text>
  `;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    ${gradientDef}
    ${brandSvg}
    ${headlineSvg}
    ${subtextSvg}
    ${ctaSvg}
  </svg>`;
}

/**
 * Generate a picture ad with text overlay.
 * 
 * Flow:
 * 1. Get or generate background image
 * 2. Resize to target format dimensions
 * 3. Composite SVG text overlay
 * 4. Upload to S3
 */
export async function generatePictureAd(options: PictureAdOptions): Promise<PictureAdResult> {
  const format = options.format || "square";
  const style = options.style || "cinematic";
  const { width, height } = FORMAT_DIMENSIONS[format];

  try {
    // Step 1: Get background image
    let backgroundBuffer: Buffer | null = null;

    if (options.backgroundImageUrl) {
      // Download provided background image
      try {
        const response = await fetch(options.backgroundImageUrl);
        if (response.ok) {
          backgroundBuffer = Buffer.from(await response.arrayBuffer());
        }
      } catch (err) {
        logger.warn("[PictureAd] Failed to download background image, will generate one", { error: String(err) });
      }
    }

    if (!backgroundBuffer) {
      // Generate background with AI
      const bgTopic = options.backgroundTopic || options.headline;
      const bgPrompt = `Cinematic professional advertisement background for: "${bgTopic}". 
        Dramatic lighting, premium quality, suitable for ${format} format social media ad. 
        No text in image. Dark cinematic atmosphere, film production aesthetic. 
        High contrast, visually striking composition.`;

      const imgResult = await generateImage({
        prompt: bgPrompt,
      });

      if (imgResult.url) {
        try {
          const response = await fetch(imgResult.url);
          if (response.ok) {
            backgroundBuffer = Buffer.from(await response.arrayBuffer());
          }
        } catch (err) {
          logger.warn("[PictureAd] Failed to download AI background image", { error: String(err) });
        }
      }
    }

    if (!backgroundBuffer) {
      // Fallback: create solid dark background
      backgroundBuffer = await sharp({
        create: {
          width,
          height,
          channels: 3,
          background: { r: 10, g: 10, b: 10 },
        },
      }).jpeg().toBuffer();
    }

    // Step 2: Resize background to target dimensions
    const resizedBackground = await sharp(backgroundBuffer)
      .resize(width, height, { fit: "cover", position: "center" })
      .jpeg({ quality: 95 })
      .toBuffer();

    // Step 3: Build SVG overlay
    const svgOverlay = buildAdSvg(width, height, options, style);
    const svgBuffer = Buffer.from(svgOverlay);

    // Step 4: Composite SVG over background
    const finalImage = await sharp(resizedBackground)
      .composite([
        {
          input: svgBuffer,
          top: 0,
          left: 0,
        },
      ])
      .jpeg({ quality: 92 })
      .toBuffer();

    // Step 5: Upload to S3
    const filename = `ad-${format}-${Date.now()}.jpg`;
    const imageUrl = await uploadBufferToS3(finalImage, filename, "image/jpeg");

    logger.info("[PictureAd] Generated picture ad", { format, style, width, height, url: imageUrl });

    return {
      success: true,
      imageUrl,
      width,
      height,
      format,
    };
  } catch (err: any) {
    logger.error("[PictureAd] Failed to generate picture ad", { error: err.message });
    return {
      success: false,
      error: err.message,
    };
  }
}

/**
 * Auto-generate ad copy and picture for a given topic using LLM + image generation.
 * Returns multiple format variants.
 */
export async function autoGeneratePictureAd(params: {
  topic: string;
  platform: string;
  brandName?: string;
  brandColor?: string;
  style?: AdStyle;
}): Promise<{
  headline: string;
  subtext: string;
  cta: string;
  imageUrl?: string;
  formats: Record<string, PictureAdResult>;
}> {
  // Step 1: Generate ad copy with LLM
  const copyPrompt = `Generate a high-converting social media ad for: "${params.topic}"
Platform: ${params.platform}
Brand: ${params.brandName || "Virelle Studios"}

Return JSON with:
{
  "headline": "Short punchy headline (max 8 words)",
  "subtext": "Supporting text (max 15 words)",
  "cta": "Call to action button text (max 4 words)",
  "backgroundTopic": "Description for background image generation"
}`;

  let headline = params.topic;
  let subtext = "";
  let cta = "Learn More";
  let backgroundTopic = params.topic;

  try {
    const llmResult = await invokeLLM({
      messages: [{ role: "user", content: copyPrompt }],
      responseFormat: { type: "json_object" },
      maxTokens: 300,
    });
    const content = llmResult.choices[0]?.message?.content;
    const text = typeof content === "string" ? content : "";
    const parsed = JSON.parse(text);
    headline = parsed.headline || headline;
    subtext = parsed.subtext || subtext;
    cta = parsed.cta || cta;
    backgroundTopic = parsed.backgroundTopic || backgroundTopic;
  } catch (err) {
    logger.warn("[PictureAd] LLM copy generation failed, using defaults", { error: String(err) });
  }

  // Step 2: Determine best format for platform
  const platformFormats: Record<string, AdFormat[]> = {
    tiktok: ["story", "square"],
    instagram: ["square", "portrait", "story"],
    linkedin: ["landscape", "banner"],
    facebook: ["square", "landscape"],
    twitter: ["landscape", "square"],
    x_twitter: ["landscape", "square"],
    pinterest: ["portrait", "square"],
    youtube_shorts: ["story"],
  };
  const formats = platformFormats[params.platform.toLowerCase()] || ["square"];
  const primaryFormat = formats[0];

  // Step 3: Generate primary format ad
  const primaryResult = await generatePictureAd({
    headline,
    subtext,
    cta,
    brand: params.brandName || "Virelle Studios",
    brandColor: params.brandColor || "#d4a843",
    style: params.style || "cinematic",
    format: primaryFormat,
    backgroundTopic,
  });

  const formatResults: Record<string, PictureAdResult> = {
    [primaryFormat]: primaryResult,
  };

  return {
    headline,
    subtext,
    cta,
    imageUrl: primaryResult.imageUrl,
    formats: formatResults,
  };
}
