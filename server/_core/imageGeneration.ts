import { storagePut } from "../storage";
import { ENV } from "./env";
import { logger } from "./logger";

const PROVIDER_TIMEOUT_MS = 120_000;
const REFERENCE_FETCH_TIMEOUT_MS = 20_000;
const MAX_REFERENCE_BYTES = 25 * 1024 * 1024;

export type GenerateImageOptions = {
  prompt: string;
  originalImages?: Array<{
    url?: string;
    b64Json?: string;
    mimeType?: string;
  }>;
  userOpenAiKey?: string | null;
  /** Prevent text-only fallbacks that cannot preserve supplied likeness/media. */
  requireReferenceSupport?: boolean;
  size?: "1024x1024" | "1024x1536" | "1536x1024" | "auto";
  quality?: "low" | "medium" | "high";
};

export type GenerateImageResponse = {
  url?: string;
  provider?: string;
  referenceAware?: boolean;
};

async function uploadImage(
  buffer: Buffer,
  filename: string,
  contentType: string,
  rawProviderUrl?: string,
): Promise<string> {
  try {
    const { url } = await storagePut(filename, buffer, contentType);
    return url;
  } catch (storageError: any) {
    if (rawProviderUrl) {
      logger.warn(`[ImageGen] Storage unavailable (${storageError.message}), using provider URL`);
      return rawProviderUrl;
    }
    logger.warn(`[ImageGen] Storage unavailable (${storageError.message}), returning data URI`);
    return `data:${contentType};base64,${buffer.toString("base64")}`;
  }
}

function normalizedMimeType(value: string | undefined): string {
  const type = String(value || "image/jpeg").split(";")[0].trim().toLowerCase();
  return ["image/jpeg", "image/png", "image/webp"].includes(type) ? type : "image/jpeg";
}

async function resolveReferenceBase64(
  images: GenerateImageOptions["originalImages"],
): Promise<Array<{ b64: string; mimeType: string }>> {
  if (!images?.length) return [];
  const results: Array<{ b64: string; mimeType: string }> = [];

  for (const image of images.slice(0, 4)) {
    if (image.b64Json) {
      const buffer = Buffer.from(image.b64Json, "base64");
      if (!buffer.length || buffer.length > MAX_REFERENCE_BYTES) throw new Error("Reference image is empty or too large");
      results.push({ b64: buffer.toString("base64"), mimeType: normalizedMimeType(image.mimeType) });
      continue;
    }

    if (!image.url) continue;
    const parsed = new URL(image.url);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password) {
      throw new Error("Reference image URL must use HTTPS without credentials");
    }
    const response = await fetch(parsed, {
      headers: { Accept: "image/jpeg,image/png,image/webp" },
      redirect: "error",
      signal: AbortSignal.timeout(REFERENCE_FETCH_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`Reference image fetch failed (${response.status})`);
    const contentType = normalizedMimeType(response.headers.get("content-type") || image.mimeType);
    const contentLength = Number(response.headers.get("content-length") || "0");
    if (contentLength > MAX_REFERENCE_BYTES) throw new Error("Reference image is too large");
    const buffer = Buffer.from(await response.arrayBuffer());
    if (!buffer.length || buffer.length > MAX_REFERENCE_BYTES) throw new Error("Reference image is empty or too large");
    results.push({ b64: buffer.toString("base64"), mimeType: contentType });
  }

  return results;
}

async function generateWithOpenAI(options: GenerateImageOptions): Promise<GenerateImageResponse> {
  const apiKey = options.userOpenAiKey || ENV.openaiApiKey;
  if (!apiKey) throw new Error("OpenAI API key not configured");
  const refs = await resolveReferenceBase64(options.originalImages);
  const size = options.size || "1024x1024";
  const quality = options.quality || "high";

  if (refs.length) {
    const formData = new FormData();
    formData.append("model", "gpt-image-1");
    formData.append("prompt", options.prompt.slice(0, 4000));
    formData.append("n", "1");
    formData.append("size", size);
    formData.append("quality", quality);
    for (let index = 0; index < refs.length; index++) {
      const reference = refs[index];
      const extension = reference.mimeType === "image/png" ? "png" : reference.mimeType === "image/webp" ? "webp" : "jpg";
      formData.append(
        "image[]",
        new Blob([Buffer.from(reference.b64, "base64")], { type: reference.mimeType }),
        `reference_${index}.${extension}`,
      );
    }

    const response = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
      signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    });
    if (!response.ok) {
      const detail = (await response.text().catch(() => "")).slice(0, 1000);
      throw new Error(`OpenAI image edit failed (${response.status})${detail ? `: ${detail}` : ""}`);
    }
    const result = await response.json() as { data?: Array<{ b64_json?: string; url?: string }> };
    const item = result.data?.[0];
    if (item?.b64_json) {
      const buffer = Buffer.from(item.b64_json, "base64");
      return { url: await uploadImage(buffer, `generated/${Date.now()}.png`, "image/png"), provider: "openai-gpt-image-1-edit", referenceAware: true };
    }
    if (item?.url) {
      const download = await fetch(item.url, { signal: AbortSignal.timeout(REFERENCE_FETCH_TIMEOUT_MS) });
      if (download.ok) {
        const buffer = Buffer.from(await download.arrayBuffer());
        return { url: await uploadImage(buffer, `generated/${Date.now()}.png`, "image/png", item.url), provider: "openai-gpt-image-1-edit", referenceAware: true };
      }
      return { url: item.url, provider: "openai-gpt-image-1-edit", referenceAware: true };
    }
    throw new Error("OpenAI image edit returned no image");
  }

  if (options.requireReferenceSupport) throw new Error("Reference-aware generation requires at least one valid reference image");
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "gpt-image-1", prompt: options.prompt.slice(0, 4000), n: 1, size, quality, output_format: "png" }),
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`OpenAI image generation failed (${response.status})`);
  const result = await response.json() as { data?: Array<{ b64_json?: string; url?: string }> };
  const item = result.data?.[0];
  if (item?.b64_json) {
    const buffer = Buffer.from(item.b64_json, "base64");
    return { url: await uploadImage(buffer, `generated/${Date.now()}.png`, "image/png"), provider: "openai-gpt-image-1", referenceAware: false };
  }
  if (item?.url) return { url: item.url, provider: "openai-gpt-image-1", referenceAware: false };
  throw new Error("OpenAI returned no image");
}

async function generateWithGoogle(options: GenerateImageOptions): Promise<GenerateImageResponse> {
  if (!ENV.googleApiKey) throw new Error("Google API key not configured");
  const refs = await resolveReferenceBase64(options.originalImages);
  if (options.requireReferenceSupport && refs.length === 0) throw new Error("Google reference generation requires reference images");

  const instance: any = { prompt: options.prompt.slice(0, 2000) };
  if (refs.length) {
    instance.referenceImages = refs.map((reference) => ({
      referenceType: "REFERENCE_TYPE_SUBJECT",
      referenceImage: { bytesBase64Encoded: reference.b64, mimeType: reference.mimeType },
    }));
  }
  const aspectRatio = options.size === "1024x1536" ? "3:4" : options.size === "1536x1024" ? "4:3" : "1:1";
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${ENV.googleApiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        instances: [instance],
        parameters: { sampleCount: 1, aspectRatio, safetyFilterLevel: "block_some", personGeneration: "allow_adult" },
      }),
      signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    },
  );
  if (!response.ok) throw new Error(`Google Imagen generation failed (${response.status})`);
  const result = await response.json() as { predictions?: Array<{ bytesBase64Encoded?: string; mimeType?: string }> };
  const prediction = result.predictions?.[0];
  if (!prediction?.bytesBase64Encoded) throw new Error("Google Imagen returned no image");
  const mimeType = normalizedMimeType(prediction.mimeType);
  const extension = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
  const buffer = Buffer.from(prediction.bytesBase64Encoded, "base64");
  return { url: await uploadImage(buffer, `generated/${Date.now()}.${extension}`, mimeType), provider: "google-imagen", referenceAware: refs.length > 0 };
}

async function generateWithHuggingFace(options: GenerateImageOptions): Promise<GenerateImageResponse> {
  if (!ENV.huggingFaceApiKey) throw new Error("Hugging Face API key not configured");
  const response = await fetch("https://router.huggingface.co/models/black-forest-labs/FLUX.1-dev", {
    method: "POST",
    headers: { Authorization: `Bearer ${ENV.huggingFaceApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ inputs: options.prompt.slice(0, 2000), parameters: { width: 1280, height: 720, num_inference_steps: 50, guidance_scale: 4.5 } }),
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Hugging Face generation failed (${response.status})`);
  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = normalizedMimeType(response.headers.get("content-type") || "image/jpeg");
  return { url: await uploadImage(buffer, `generated/${Date.now()}.jpg`, contentType), provider: "huggingface", referenceAware: false };
}

async function generateWithDallE3(options: GenerateImageOptions): Promise<GenerateImageResponse> {
  const apiKey = options.userOpenAiKey || ENV.openaiApiKey;
  if (!apiKey) throw new Error("OpenAI API key not configured");
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "dall-e-3", prompt: options.prompt.slice(0, 4000), n: 1, size: "1792x1024", quality: "hd", response_format: "b64_json" }),
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`DALL-E 3 failed (${response.status})`);
  const result = await response.json() as { data?: Array<{ b64_json?: string }> };
  const base64 = result.data?.[0]?.b64_json;
  if (!base64) throw new Error("DALL-E 3 returned no image");
  return { url: await uploadImage(Buffer.from(base64, "base64"), `generated/${Date.now()}.png`, "image/png"), provider: "dalle3", referenceAware: false };
}

function requiresIdentityAwareProvider(options: GenerateImageOptions): boolean {
  if (options.requireReferenceSupport) return true;
  return Boolean(
    options.originalImages?.length &&
    /face\s*swap|digital\s*double|likeness|identity\s*continuity|stunt\s*face/i.test(options.prompt),
  );
}

export async function generateImage(options: GenerateImageOptions): Promise<GenerateImageResponse> {
  const errors: string[] = [];
  const identityRequired = requiresIdentityAwareProvider(options);
  const referenceOptions = identityRequired ? { ...options, requireReferenceSupport: true } : options;

  if (referenceOptions.userOpenAiKey || ENV.openaiApiKey) {
    try {
      const result = await generateWithOpenAI(referenceOptions);
      logger.info(`[ImageGen] Generated with ${result.provider}`);
      return result;
    } catch (error: any) {
      logger.warn(`[ImageGen] OpenAI failed: ${error.message}`);
      errors.push(`OpenAI: ${error.message}`);
    }
  }

  if (ENV.googleApiKey) {
    try {
      const result = await generateWithGoogle(referenceOptions);
      logger.info(`[ImageGen] Generated with ${result.provider}`);
      return result;
    } catch (error: any) {
      logger.warn(`[ImageGen] Google failed: ${error.message}`);
      errors.push(`Google: ${error.message}`);
    }
  }

  // Likeness transformations must fail honestly rather than returning a generic
  // text-generated person that ignores the supplied identity or target image.
  if (identityRequired) {
    throw new Error(`No identity-aware image provider completed the transformation: ${errors.join(" | ")}`);
  }

  if (ENV.huggingFaceApiKey) {
    try {
      return await generateWithHuggingFace(options);
    } catch (error: any) {
      errors.push(`HuggingFace: ${error.message}`);
    }
  }

  if (options.userOpenAiKey || ENV.openaiApiKey) {
    try {
      return await generateWithDallE3(options);
    } catch (error: any) {
      errors.push(`DALL-E 3: ${error.message}`);
    }
  }

  const encodedPrompt = encodeURIComponent((options.prompt || "cinematic scene").slice(0, 500));
  const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1280&height=720&model=flux&nologo=true&enhance=true&seed=${Date.now()}`;
  if (pollinationsUrl) return { url: pollinationsUrl, provider: "pollinations", referenceAware: false };

  throw new Error(`All image generation providers failed: ${errors.join(" | ")}`);
}
