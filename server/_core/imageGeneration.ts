/**
 * Image generation helper with fallback chain:
 *   1. Forge ImageService (primary)
 *   2. OpenAI DALL-E 3 (fallback)
 *
 * Example usage:
 *   const { url: imageUrl } = await generateImage({
 *     prompt: "A serene landscape with mountains"
 *   });
 *
 * For editing:
 *   const { url: imageUrl } = await generateImage({
 *     prompt: "Add a rainbow to this landscape",
 *     originalImages: [{
 *       url: "https://example.com/original.jpg",
 *       mimeType: "image/jpeg"
 *     }]
 *   });
 */
import { storagePut } from "server/storage";
import { ENV } from "./env";

export type GenerateImageOptions = {
  prompt: string;
  originalImages?: Array<{
    url?: string;
    b64Json?: string;
    mimeType?: string;
  }>;
};

export type GenerateImageResponse = {
  url?: string;
};

/* ─── Forge (primary) ─── */
async function generateWithForge(
  options: GenerateImageOptions
): Promise<GenerateImageResponse> {
  if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
    throw new Error("Forge API not configured");
  }

  const baseUrl = ENV.forgeApiUrl.endsWith("/")
    ? ENV.forgeApiUrl
    : `${ENV.forgeApiUrl}/`;
  const fullUrl = new URL(
    "images.v1.ImageService/GenerateImage",
    baseUrl
  ).toString();

  const response = await fetch(fullUrl, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "connect-protocol-version": "1",
      authorization: `Bearer ${ENV.forgeApiKey}`,
    },
    body: JSON.stringify({
      prompt: options.prompt,
      original_images: options.originalImages || [],
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Forge image generation failed (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
    );
  }

  const result = (await response.json()) as {
    image: { b64Json: string; mimeType: string };
  };
  const buffer = Buffer.from(result.image.b64Json, "base64");
  const { url } = await storagePut(
    `generated/${Date.now()}.png`,
    buffer,
    result.image.mimeType
  );
  return { url };
}

/* ─── OpenAI DALL-E 3 (fallback) ─── */
async function generateWithOpenAI(
  options: GenerateImageOptions
): Promise<GenerateImageResponse> {
  const apiKey = ENV.openaiApiKey;
  if (!apiKey) {
    throw new Error("OpenAI API key not configured for image generation");
  }

  // Truncate prompt to 4000 chars (DALL-E 3 limit)
  const truncatedPrompt = options.prompt.slice(0, 4000);

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "dall-e-3",
      prompt: truncatedPrompt,
      n: 1,
      size: "1792x1024",
      quality: "hd",
      response_format: "b64_json",
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `OpenAI image generation failed (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
    );
  }

  const result = (await response.json()) as {
    data: Array<{ b64_json: string }>;
  };

  if (!result.data?.[0]?.b64_json) {
    throw new Error("OpenAI returned no image data");
  }

  const buffer = Buffer.from(result.data[0].b64_json, "base64");
  const { url } = await storagePut(
    `generated/${Date.now()}.png`,
    buffer,
    "image/png"
  );
  return { url };
}

/* ─── Main entry point with fallback ─── */
export async function generateImage(
  options: GenerateImageOptions
): Promise<GenerateImageResponse> {
  const errors: string[] = [];

  // 1. Try Forge first
  if (ENV.forgeApiUrl && ENV.forgeApiKey) {
    try {
      return await generateWithForge(options);
    } catch (err: any) {
      console.warn(`[ImageGen] Forge failed: ${err.message}`);
      errors.push(`Forge: ${err.message}`);
    }
  }

  // 2. Fallback to OpenAI DALL-E 3
  if (ENV.openaiApiKey) {
    try {
      console.log("[ImageGen] Falling back to OpenAI DALL-E 3");
      return await generateWithOpenAI(options);
    } catch (err: any) {
      console.warn(`[ImageGen] OpenAI failed: ${err.message}`);
      errors.push(`OpenAI: ${err.message}`);
    }
  }

  // All providers failed
  throw new Error(
    `All image generation providers failed:\n${errors.join("\n")}`
  );
}
