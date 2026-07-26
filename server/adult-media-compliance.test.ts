import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { ADULT_AI_DISCLOSURE_TEXT, buildAdultProvenance } from "./_core/adultMediaCompliance";

const root = path.resolve(import.meta.dirname, "..");
const source = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

describe("Adult Studio rendered-media compliance", () => {
  it("uses a clear opening legal notice", () => {
    expect(ADULT_AI_DISCLOSURE_TEXT).toContain("facial replacement");
    expect(ADULT_AI_DISCLOSURE_TEXT).toContain("solely responsible");
    expect(ADULT_AI_DISCLOSURE_TEXT).toContain("legally valid consents");
    expect(ADULT_AI_DISCLOSURE_TEXT).toContain("automated safety screening");
  });

  it("holds risky adult renders for administrator review", () => {
    const worker = source("server/studio-render-worker.ts");
    expect(worker).toContain('status=${assessment.decision === "block" ? "failed" : "moderation_review"}');
    expect(worker).toContain("recordAdultModerationReview");
  });

  it("does not release adult output until disclosure and provenance are applied", () => {
    const worker = source("server/studio-render-worker.ts");
    expect(worker).toContain("applyAdultOpeningDisclosure");
    expect(worker).toContain("finalVideoUrl = compliant.url");
    expect(worker).toContain("metadata.provenance");
  });

  it("produces a non-public forensic marker", () => {
    const marker = buildAdultProvenance(42, 7, "younger_self");
    expect(marker.invisible).toBe(true);
    expect(marker.markerId).toHaveLength(32);
    expect(marker.signature.length).toBeGreaterThan(32);
  });
});
