import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getStorageBucket, isS3StorageConfigured } from "./storage";

const ENV_KEYS = [
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "AWS_S3_BUCKET",
  "AWS_S3_MEDIA_BUCKET",
  "AWS_S3_ASSETS_BUCKET",
] as const;

let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = {};
  for (const key of ENV_KEYS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

describe("getStorageBucket", () => {
  it("uses the dedicated media bucket when set", () => {
    process.env.AWS_S3_MEDIA_BUCKET = "virellestudios-media";
    process.env.AWS_S3_ASSETS_BUCKET = "virelleassets";
    expect(getStorageBucket("media")).toBe("virellestudios-media");
  });

  it("uses the dedicated assets bucket when set", () => {
    process.env.AWS_S3_MEDIA_BUCKET = "virellestudios-media";
    process.env.AWS_S3_ASSETS_BUCKET = "virelleassets";
    expect(getStorageBucket("asset")).toBe("virelleassets");
  });

  it("prefers the dedicated bucket over the legacy AWS_S3_BUCKET for media", () => {
    process.env.AWS_S3_BUCKET = "legacy-bucket";
    process.env.AWS_S3_MEDIA_BUCKET = "virellestudios-media";
    expect(getStorageBucket("media")).toBe("virellestudios-media");
  });

  it("prefers the dedicated bucket over the legacy AWS_S3_BUCKET for assets", () => {
    process.env.AWS_S3_BUCKET = "legacy-bucket";
    process.env.AWS_S3_ASSETS_BUCKET = "virelleassets";
    expect(getStorageBucket("asset")).toBe("virelleassets");
  });

  it("falls back to the legacy AWS_S3_BUCKET for media when unset", () => {
    process.env.AWS_S3_BUCKET = "legacy-bucket";
    expect(getStorageBucket("media")).toBe("legacy-bucket");
  });

  it("falls back to the legacy AWS_S3_BUCKET for assets when unset", () => {
    process.env.AWS_S3_BUCKET = "legacy-bucket";
    expect(getStorageBucket("asset")).toBe("legacy-bucket");
  });

  it("throws a clear error naming the missing variable for media", () => {
    expect(() => getStorageBucket("media")).toThrow(/AWS_S3_MEDIA_BUCKET/);
  });

  it("throws a clear error naming the missing variable for assets", () => {
    expect(() => getStorageBucket("asset")).toThrow(/AWS_S3_ASSETS_BUCKET/);
  });
});

describe("isS3StorageConfigured", () => {
  it("is false without credentials", () => {
    process.env.AWS_S3_MEDIA_BUCKET = "virellestudios-media";
    expect(isS3StorageConfigured()).toBe(false);
  });

  it("is false with credentials but no bucket at all", () => {
    process.env.AWS_ACCESS_KEY_ID = "key";
    process.env.AWS_SECRET_ACCESS_KEY = "secret";
    expect(isS3StorageConfigured()).toBe(false);
  });

  it("is true with credentials and at least one bucket configured", () => {
    process.env.AWS_ACCESS_KEY_ID = "key";
    process.env.AWS_SECRET_ACCESS_KEY = "secret";
    process.env.AWS_S3_MEDIA_BUCKET = "virellestudios-media";
    expect(isS3StorageConfigured()).toBe(true);
  });

  it("is true when only the legacy AWS_S3_BUCKET is set", () => {
    process.env.AWS_ACCESS_KEY_ID = "key";
    process.env.AWS_SECRET_ACCESS_KEY = "secret";
    process.env.AWS_S3_BUCKET = "legacy-bucket";
    expect(isS3StorageConfigured()).toBe(true);
  });
});
