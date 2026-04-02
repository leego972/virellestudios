/**
 * Image generation helper with fallback chain:
 *   1. OpenAI gpt-image-1 (primary — supports reference images via image editing)
 *   2. Google Gemini Imagen 3 (GOOGLE_API_KEY — supports reference images)
 *   3. Hugging Face Inference API (HUGGING_FACE_API_KEY — FLUX.1-dev, text-to-image fallback)
 *   4. OpenAI DALL-E 3 (final fallback — text-to-image only)
 *
 * When `originalImages` is provided (e.g. character-from-photo), the reference image
 * is passed to every provider that supports image-to-image or image editing so the
 * generated output is visually anchored to the reference face/subject.
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

// ─── Helper: resolve originalImages to base64 ───
async function resolveReferenceBase64(
  images: GenerateImageOptions["originalImages"]
): Promise<Array<{ b64: string; mimeType: string }>> {
  if (!images || images.length === 0) return [];
  const results: Array<{ b64: string; mimeType: string }> = [];
  for (const img of images) {
    if (img.b64Json) {
      results.push({ b64: img.b64Json, mimeType: img.mimeType || "image/jpeg" });
    } else if (img.url) {
      try {
        const resp = await fetch(img.url, { signal: AbortSignal.timeout(20000) });
        if (resp.ok) {
          const buf = Buffer.from(await resp.arrayBuffer());
          const ct = resp.headers.get("content-type") || img.mimeType || "image/jpeg";
          results.push({ b64: buf.toString("base64"), mimeType: ct.split(";")[0].trim() });
        }
      } catch { /* skip unresolvable refs */ }
    }
  }
  return results;
}

/* ─── 1. OpenAI gpt-image-1 (primary — supports reference images) ─── */
async function generateWithOpenAIImageEdit(
  options: GenerateImageOptions
): Promise<GenerateImageResponse> {
  const apiKey = ENV.openaiApiKey;
  if (!apiKey) throw new Error("OpenAI API key not configured");

  const refs = await resolveReferenceBase64(options.originalImages);

  if (refs.length > 0) {
    // Use the images/edits endpoint which accepts a reference image
    // gpt-image-1 supports multi-image editing — anchor to the reference face
    const formData = new FormData();
    formData.append("model", "gpt-image-1");
    formData.append("prompt", options.prompt.slice(0, 4000));
    formData.append("n", "1");
    formData.append("size", "1024x1024"); // Square maximises face detail for character portraits
    formData.append("quality", "high");   // Always request high quality
    // Attach the reference image(s)
    for (let i = 0; i < Math.min(refs.length, 4); i++) {
      const { b64, mimeType } = refs[i];
      const ext = mimeType.split("/")[1] || "jpg";
      const blob = new Blob([Buffer.from(b64, "base64")], { type: mimeType });
      formData.append("image[]", blob, `reference_${i}.${ext}`);
    }

    const response = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`OpenAI image edit failed (${response.status}): ${detail}`);
    }

    const result = (await response.json()) as {
      data: Array<{ b64_json?: string; url?: string }>;
    };

    const b64 = result.data?.[0]?.b64_json;
    const imgUrl = result.data?.[0]?.url;

    if (b64) {
      const buffer = Buffer.from(b64, "base64");
      const { url } = await storagePut(`generated/${Date.now()}.png`, buffer, "image/png");
      return { url, provider: "openai-gpt-image-1-edit" };
    }
    if (imgUrl) {
      const dlResp = await fetch(imgUrl);
      if (dlResp.ok) {
        const buffer = Buffer.from(await dlResp.arrayBuffer());
        const { url } = await storagePut(`generated/${Date.now()}.png`, buffer, "image/png");
        return { url, provider: "openai-gpt-image-1-edit" };
      }
    }
    throw new Error("OpenAI image edit returned no image data");
  }

  // No reference image — use standard generations endpoint with gpt-image-1
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt: options.prompt.slice(0, 4000),
      n: 1,
      size: "1024x1024", // Square maximises face detail for character portraits
      quality: "high",
      output_format: "png", // Lossless for maximum detail preservation
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`OpenAI gpt-image-1 failed (${response.status}): ${detail}`);
  }

  const result = (await response.json()) as {
    data: Array<{ b64_json?: string; url?: string }>;
  };

  const b64 = result.data?.[0]?.b64_json;
  const imgUrl = result.data?.[0]?.url;

  if (b64) {
    const buffer = Buffer.from(b64, "base64");
    const { url } = await storagePut(`generated/${Date.now()}.png`, buffer, "image/png");
    return { url, provider: "openai-gpt-image-1" };
  }
  if (imgUrl) {
    const dlResp = await fetch(imgUrl);
    if (dlResp.ok) {
      const buffer = Buffer.from(await dlResp.arrayBuffer());
      const { url } = await storagePut(`generated/${Date.now()}.png`, buffer, "image/png");
      return { url, provider: "openai-gpt-image-1" };
    }
  }
  throw new Error("OpenAI gpt-image-1 returned no image data");
}

/* ─── 2. Google Gemini Imagen 3 (supports reference images) ─── */
async function generateWithGoogle(
  options: GenerateImageOptions
): Promise<GenerateImageResponse> {
  if (!ENV.googleApiKey) {
    throw new Error("Google API key not configured");
  }

  const refs = await resolveReferenceBase64(options.originalImages);

  // Build the instance — include reference images when available
  const instance: any = {
    prompt: options.prompt.slice(0, 2000),
  };

  if (refs.length > 0) {
    // Imagen 3 supports referenceImages for subject-consistent generation
    instance.referenceImages = refs.slice(0, 4).map(r => ({
      referenceType: "REFERENCE_TYPE_SUBJECT",
      referenceImage: {
        bytesBase64Encoded: r.b64,
        mimeType: r.mimeType,
      },
    }));
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${ENV.googleApiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        instances: [instance],
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

/* ─── 3. Hugging Face Inference API (FLUX.1-dev — text-to-image fallback) ─── */
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
          num_inference_steps: 50,  // Maximum quality — 28 is too few for photorealism
          guidance_scale: 4.5,      // Higher adherence to cinematic prompt directives
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

/* ─── 4. OpenAI DALL-E 3 (final fallback — text-to-image only) ─── */
async function generateWithDallE3(
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

  // 1. OpenAI gpt-image-1 (primary — supports reference images for character-from-photo)
  if (ENV.openaiApiKey) {
    try {
      const result = await generateWithOpenAIImageEdit(options);
      console.log(`[ImageGen] Generated with ${result.provider}`);
      return result;
    } catch (err: any) {
      console.warn(`[ImageGen] OpenAI gpt-image-1 failed: ${err.message}`);
      errors.push(`OpenAI gpt-image-1: ${err.message}`);
    }
  }

  // 2. Google Gemini Imagen 3 (supports referenceImages for subject consistency)
  if (ENV.googleApiKey) {
    try {
      console.log("[ImageGen] Falling back to Google Imagen 3");
      const result = await generateWithGoogle(options);
      return result;
    } catch (err: any) {
      console.warn(`[ImageGen] Google Imagen failed: ${err.message}`);
      errors.push(`Google: ${err.message}`);
    }
  }

  // 3. Hugging Face (FLUX.1-dev — text-to-image, no reference image support)
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

  // 4. Final fallback: DALL-E 3 (text-to-image only)
  if (ENV.openaiApiKey) {
    try {
      console.log("[ImageGen] Falling back to OpenAI DALL-E 3");
      const result = await generateWithDallE3(options);
      return result;
    } catch (err: any) {
      console.warn(`[ImageGen] OpenAI DALL-E 3 failed: ${err.message}`);
      errors.push(`DALL-E 3: ${err.message}`);
    }
  }

  // All providers failed
  throw new Error(
    `All image generation providers failed:\n${errors.join("\n")}`
  );
}
