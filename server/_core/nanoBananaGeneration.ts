/**
 * Nano Banana 2 Image Generation (Google Gemini Native Image Generation)
 *
 * Uses Google's Gemini API with Nano Banana models for high-quality image generation
 * with accurate text rendering.
 *
 * Models:
 *   - gemini-3.1-flash-image-preview (Nano Banana 2 - fast, high-volume)
 *   - gemini-3-pro-image-preview (Nano Banana Pro - highest quality)
 *
 * Example usage:
 *   const { url } = await generateNanoBananaImage({
 *     prompt: "A gold shield crest with 'VIRELLE STUDIOS' text",
 *     model: "nano-banana-2",
 *   });
 */
import { storagePut } from "server/storage";
import { ENV } from "./env";

export type NanoBananaModel = "nano-banana-2" | "nano-banana-pro";

export type NanoBananaOptions = {
  prompt: string;
  model?: NanoBananaModel;
  referenceImageUrl?: string;
  aspectRatio?: "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
  userApiKey?: string;
};

export type NanoBananaResponse = {
  url?: string;
  text?: string;
};

const MODEL_MAP: Record<NanoBananaModel, string> = {
  "nano-banana-2": "gemini-3.1-flash-image-preview",
  "nano-banana-pro": "gemini-3-pro-image-preview",
};

export async function generateNanoBananaImage(
  options: NanoBananaOptions
): Promise<NanoBananaResponse> {
  const apiKey = options.userApiKey || ENV.googleApiKey;
  if (!apiKey) {
    throw new Error("Google API key is not configured. Add your Google Gemini API key in Settings → API Keys to use Nano Banana image generation.");
  }

  const model = MODEL_MAP[options.model || "nano-banana-2"];
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  // Build the request parts
  const parts: any[] = [{ text: options.prompt }];

  // If a reference image is provided, include it
  if (options.referenceImageUrl) {
    try {
      const imgResponse = await fetch(options.referenceImageUrl);
      if (imgResponse.ok) {
        const buffer = await imgResponse.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        const mimeType = imgResponse.headers.get("content-type") || "image/png";
        parts.unshift({
          inline_data: {
            mime_type: mimeType,
            data: base64,
          },
        });
      }
    } catch (e) {
      console.warn("[NanoBanana] Failed to fetch reference image:", e);
    }
  }

  const requestBody = {
    contents: [
      {
        parts,
      },
    ],
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
      ...(options.aspectRatio && {
        imageGenerationConfig: {
          aspectRatio: options.aspectRatio,
        },
      }),
    },
  };

  console.log(`[NanoBanana] Generating image with model: ${model}`);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Nano Banana generation failed (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
    );
  }

  const result = await response.json();
  let imageUrl: string | undefined;
  let text: string | undefined;

  // Parse the response - Gemini returns parts with either text or inline_data
  const candidates = result.candidates || [];
  for (const candidate of candidates) {
    const content = candidate.content || {};
    const responseParts = content.parts || [];
    for (const part of responseParts) {
      if (part.text) {
        text = part.text;
      }
      if (part.inlineData || part.inline_data) {
        const inlineData = part.inlineData || part.inline_data;
        const base64Data = inlineData.data;
        const mimeType = inlineData.mimeType || inlineData.mime_type || "image/png";
        const buffer = Buffer.from(base64Data, "base64");

        // Determine file extension
        const ext = mimeType.includes("jpeg") || mimeType.includes("jpg") ? "jpg" : "png";

        // Save to S3
        const stored = await storagePut(
          `nano-banana/${Date.now()}.${ext}`,
          buffer,
          mimeType
        );
        imageUrl = stored.url;
        console.log(`[NanoBanana] Image generated and saved: ${imageUrl}`);
      }
    }
  }

  if (!imageUrl) {
    throw new Error("Nano Banana did not return an image in the response");
  }

  return { url: imageUrl, text };
}

/**
 * Check if Nano Banana is available (Google API key configured)
 */
export function isNanoBananaAvailable(): boolean {
  return !!ENV.googleApiKey;
}
