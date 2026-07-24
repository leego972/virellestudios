import { describe, expect, it } from "vitest";
import {
  SWAPPYS_RETENTION_DAYS,
  SWAPPYS_RETENTION_POLICY_VERSION,
  swappysExpiryFrom,
} from "./_core/swappysRetention";

describe("Swappys output retention", () => {
  it("retains ordinary outputs for exactly 30 days", () => {
    const createdAt = new Date("2026-07-24T00:00:00.000Z");
    expect(SWAPPYS_RETENTION_DAYS).toBe(30);
    expect(swappysExpiryFrom(createdAt).toISOString()).toBe("2026-08-23T00:00:00.000Z");
  });

  it("uses a versioned private-output policy", () => {
    expect(SWAPPYS_RETENTION_POLICY_VERSION).toContain("private-output-30d");
  });
});
