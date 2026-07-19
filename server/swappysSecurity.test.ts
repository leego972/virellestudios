import { beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";

const rateLimitMocks = vi.hoisted(() => ({
  rateLimitHeavyAI: vi.fn(),
  rateLimitPublicByIP: vi.fn(),
}));

vi.mock("./_core/rateLimit", () => rateLimitMocks);
vi.mock("./_core/env", () => ({
  ENV: {
    openaiApiKey: "test-openai-key",
    isProduction: true,
  },
}));

import {
  enforceSwappysGenerationQuota,
  moderateSwappysImages,
  validateSwappysDataImage,
} from "./_core/swappysSecurity";

async function dataImage(format: "jpeg" | "png" | "webp" = "jpeg", width = 256, height = 256) {
  const buffer = await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 40, g: 80, b: 120 },
    },
  }).toFormat(format).toBuffer();
  return `data:image/${format};base64,${buffer.toString("base64")}`;
}

describe("Swappys security boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rateLimitMocks.rateLimitHeavyAI.mockResolvedValue(undefined);
    rateLimitMocks.rateLimitPublicByIP.mockResolvedValue(undefined);
    vi.stubGlobal("fetch", vi.fn());
  });

  it("accepts a valid supported image and records verified dimensions", async () => {
    const image = await validateSwappysDataImage(await dataImage("jpeg"), "Source image");

    expect(image.format).toBe("jpeg");
    expect(image.mimeType).toBe("image/jpeg");
    expect(image.width).toBe(256);
    expect(image.height).toBe(256);
    expect(image.bytes).toBeGreaterThan(1024);
    expect(image.fingerprint).toMatch(/^[a-f0-9]{20}$/);
  });

  it("rejects a declared type that does not match the file signature", async () => {
    const png = await dataImage("png");
    const spoofed = png.replace("data:image/png", "data:image/jpeg");

    await expect(validateSwappysDataImage(spoofed, "Target image"))
      .rejects.toThrow(/signature does not match/i);
  });

  it("rejects dimensions below the production minimum", async () => {
    await expect(validateSwappysDataImage(await dataImage("jpeg", 64, 64), "Source image"))
      .rejects.toThrow(/dimensions or decoded format/i);
  });

  it("applies anonymous minute and daily quotas", async () => {
    const req = {
      headers: { "x-forwarded-for": "203.0.113.10, 10.0.0.1" },
      ip: "10.0.0.1",
      socket: {},
    } as any;

    await expect(enforceSwappysGenerationQuota(req)).resolves.toEqual({ entitlement: "anonymous_preview" });
    expect(rateLimitMocks.rateLimitPublicByIP).toHaveBeenNthCalledWith(1, "203.0.113.10", "swappys-minute", 2, 60_000);
    expect(rateLimitMocks.rateLimitPublicByIP).toHaveBeenNthCalledWith(2, "203.0.113.10", "swappys-daily-preview", 5, 86_400_000);
  });

  it("applies authenticated heavy-AI and daily quotas", async () => {
    const req = { headers: {}, ip: "127.0.0.1", socket: {} } as any;

    await expect(enforceSwappysGenerationQuota(req, 77)).resolves.toEqual({ entitlement: "authenticated" });
    expect(rateLimitMocks.rateLimitHeavyAI).toHaveBeenCalledWith(77);
    expect(rateLimitMocks.rateLimitPublicByIP).toHaveBeenCalledWith("user-77", "swappys-daily", 20, 86_400_000);
  });

  it("allows clean images and rejects flagged images", async () => {
    const image = await validateSwappysDataImage(await dataImage("webp"), "Source image");
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ results: [{ flagged: false, categories: {} }] }), { status: 200 }));

    await expect(moderateSwappysImages([image])).resolves.toBeUndefined();

    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      results: [{ flagged: true, categories: { "sexual/minors": true } }],
    }), { status: 200 }));
    await expect(moderateSwappysImages([image])).rejects.toThrow(/cannot be processed/i);
  });
});
