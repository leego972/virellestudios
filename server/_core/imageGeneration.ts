/**
 * Image generation helper with fallback chain:
 *   1. RunwayML (primary — user BYOK via RUNWAYML_API_SECRET)
 *   2. Google Veo 3 / Gemini Imagen (GOOGLE_API_KEY)
 *   3. Hugging Face Inference API (HUGGING_FACE_API_KEY)
 *   4. OpenAI DALL-E 3 (final fallback — OPENAI_API_KEY)
 *
 * Each provider is skipped automatically if its API key is not configured,
 * allowing users to bring their own keys (BYOK) and get the best available provider.
 *
 * Example usage:
 *   const { url: imageUrl } = await generateImage({
 *     prompt: "A cinematic wide shot of a detective in a rain-soaked city"
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
  provider?: string;
};

/* ─── 1. RunwayML (primary) ─── */
async function generateWithRunway(
  options: GenerateImageOptions
): Promise<GenerateImageResponse> {
  if (!ENV.runwayApiKey) {
    throw new Error("RunwayML API key not configured");
  }

  // Runway Gen-3 Alpha image generation endpoint
  const response = await fetch("https://api.dev.runwayml.com/v1/image_to_image", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ENV.runwayApiKey}`,
      "X-Runway-Version": "2024-11-06",
    },
    body: JSON.stringify({
      promptText: options.prompt.slice(0, 1000),
      model: "gen3a_turbo",
      ratio: "1280:768",
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `RunwayML image generation failed (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
    );
  }

  const result = (await response.json()) as {
    artifacts?: Array<{ url: string }>;
    output?: Array<string>;
  };

  // Handle both response formats
  const imageUrl =
    result.artifacts?.[0]?.url ||
    result.output?.[0];

  if (!imageUrl) {
    throw new Error("RunwayML returned no image data");
  }

  // Download and re-upload to our S3 storage
  const imgResponse = await fetch(imageUrl);
  if (!imgResponse.ok) {
    throw new Error("Failed to download RunwayML image");
  }
  const buffer = Buffer.from(await imgResponse.arrayBuffer());
  const { url } = await storagePut(
    `generated/${Date.now()}.png`,
    buffer,
    "image/png"
  );
  return { url, provider: "runway" };
}

/* ─── 2. Google Veo 3 / Gemini Imagen ─── */
async function generateWithGoogle(
  options: GenerateImageOptions
): Promise<GenerateImageResponse> {
  if (!ENV.googleApiKey) {
    throw new Error("Google API key not configured");
  }

  // Use Gemini Imagen 3 for high-quality image generation
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${ENV.googleApiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        instances: [
          {
            prompt: options.prompt.slice(0, 2000),
          },
        ],
        parameters: {
          sampleCount: 1,
          aspectRatio: "16:9",
          safetyFilterLevel: "block_some",
          personGeneration: "allow_adult",
        },
      }),
    }
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Google Imagen generation failed (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
    );
  }

  const result = (await response.json()) as {
    predictions?: Array<{ bytesBase64Encoded: string; mimeType: string }>;
  };

  if (!result.predictions?.[0]?.bytesBase64Encoded) {
    throw new Error("Google Imagen returned no image data");
  }

  const buffer = Buffer.from(result.predictions[0].bytesBase64Encoded, "base64");
  const mimeType = result.predictions[0].mimeType || "image/png";
  const ext = mimeType.split("/")[1] || "png";
  const { url } = await storagePut(
    `generated/${Date.now()}.${ext}`,
    buffer,
    mimeType
  );
  return { url, provider: "google-imagen" };
}

/* ─── 3. Hugging Face Inference API ─── */
async function generateWithHuggingFace(
  options: GenerateImageOptions
): Promise<GenerateImageResponse> {
  if (!ENV.huggingFaceApiKey) {
    throw new Error("Hugging Face API key not configured");
  }

  // Use FLUX.1-dev — best open-source cinematic image model
  const model = "black-forest-labs/FLUX.1-dev";
  const response = await fetch(
    `https://api-inference.huggingface.co/models/${model}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ENV.huggingFaceApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: options.prompt.slice(0, 2000),
        parameters: {
          width: 1280,
          height: 720,
          num_inference_steps: 28,
          guidance_scale: 3.5,
        },
      }),
    }
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Hugging Face generation failed (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
    );
  }

  // HF returns raw image bytes
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Detect content type from response headers
  const contentType = response.headers.get("content-type") || "image/jpeg";
  const ext = contentType.split("/")[1]?.split(";")[0] || "jpg";

  const { url } = await storagePut(
    `generated/${Date.now()}.${ext}`,
    buffer,
    contentType
  );
  return { url, provider: "huggingface" };
}

/* ─── 4. OpenAI DALL-E 3 (final fallback) ─── */
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
  return { url, provider: "dalle3" };
}

/* ─── Main entry point with fallback chain ─── */
export async function generateImage(
  options: GenerateImageOptions
): Promise<GenerateImageResponse> {
  const errors: string[] = [];

  // 1. Try RunwayML first (primary)
  if (ENV.runwayApiKey) {
    try {
      const result = await generateWithRunway(options);
      console.log("[ImageGen] Generated with RunwayML");
      return result;
    } catch (err: any) {
      console.warn(`[ImageGen] RunwayML failed: ${err.message}`);
      errors.push(`RunwayML: ${err.message}`);
    }
  }

  // 2. Try Google Veo 3 / Gemini Imagen
  if (ENV.googleApiKey) {
    try {
      console.log("[ImageGen] Falling back to Google Imagen (Veo 3)");
      const result = await generateWithGoogle(options);
      return result;
    } catch (err: any) {
      console.warn(`[ImageGen] Google Imagen failed: ${err.message}`);
      errors.push(`Google: ${err.message}`);
    }
  }

  // 3. Try Hugging Face (FLUX.1-dev)
  if (ENV.huggingFaceApiKey) {
    try {
      console.log("[ImageGen] Falling back to Hugging Face (FLUX.1-dev)");
      const result = await generateWithHuggingFace(options);
      return result;
    } catch (err: any) {
      console.warn(`[ImageGen] Hugging Face failed: ${err.message}`);
      errors.push(`HuggingFace: ${err.message}`);
    }
  }

  // 4. Final fallback: OpenAI DALL-E 3
  if (ENV.openaiApiKey) {
    try {
      console.log("[ImageGen] Falling back to OpenAI DALL-E 3");
      const result = await generateWithOpenAI(options);
      return result;
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
