import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  campaignReadiness,
  createCampaignPack,
  createRewardTemplates,
  crowdfundingEconomics,
  isCrowdfundingPlatform,
} from "../client/src/lib/crowdfundingTools";
import {
  JOURNEY_STAGES,
  computeProjectStage,
  normaliseLegacyJourneyStage,
} from "../client/src/lib/journeyStages";

describe("four-stage filmmaker journey", () => {
  it("exposes only the requested four stages in the requested order", () => {
    expect(JOURNEY_STAGES.map((stage) => stage.title)).toEqual([
      "Pre-Production",
      "Production",
      "Post-Production",
      "Funding",
    ]);
    expect(JOURNEY_STAGES.map((stage) => stage.number)).toEqual([1, 2, 3, 4]);
  });

  it("maps every former eight-stage marker into the new model", () => {
    expect([1, 2, 3, 4].map(normaliseLegacyJourneyStage)).toEqual([1, 1, 1, 1]);
    expect(normaliseLegacyJourneyStage(5)).toBe(4);
    expect(normaliseLegacyJourneyStage(6)).toBe(2);
    expect(normaliseLegacyJourneyStage(7)).toBe(3);
    expect(normaliseLegacyJourneyStage(8)).toBe(3);
  });

  it("does not falsely mark funding complete from lightweight project status", () => {
    expect(computeProjectStage({ status: "completed" })).toBe(3);
    expect(computeProjectStage({ status: "generating" })).toBe(2);
    expect(computeProjectStage({ status: "draft" })).toBe(1);
  });

  it("keeps crowdfunding inside the Funding sidebar group", () => {
    const source = readFileSync(
      resolve(process.cwd(), "client/src/components/DashboardLayout.tsx"),
      "utf8",
    );
    const fundingStart = source.indexOf('label: "Funding"');
    const crowdfunding = source.indexOf('label: "Crowdfunding"');
    const groupEnd = source.indexOf("],\n  },", fundingStart);

    expect(fundingStart).toBeGreaterThan(-1);
    expect(crowdfunding).toBeGreaterThan(fundingStart);
    expect(crowdfunding).toBeLessThan(groupEnd);
    expect(source).toContain('label: "Pre-Production"');
    expect(source).toContain('label: "Production"');
    expect(source).toContain('label: "Post-Production"');
  });
});

describe("free crowdfunding planning tools", () => {
  it("calculates platform fees and net proceeds without claiming processing costs", () => {
    expect(crowdfundingEconomics(100_000, 700)).toEqual({
      grossGoalCents: 100_000,
      platformFeeBps: 700,
      platformFeeCents: 7_000,
      netBeforePaymentProcessingCents: 93_000,
      grossRequiredForNetCents: 107_527,
    });
  });

  it("requires complete campaign information and payout setup for launch readiness", () => {
    const incomplete = campaignReadiness({ title: "Film", goalAmountCents: 10_000 }, []);
    expect(incomplete.launchReady).toBe(false);
    expect(incomplete.missing.map((item) => item.key)).toContain("payouts");
    expect(incomplete.missing.map((item) => item.key)).toContain("rewards");

    const rewards = createRewardTemplates(25_000);
    const complete = campaignReadiness(
      {
        title: "The Last Sundowner",
        tagline: "A community fights to preserve the story that defines its future.",
        description: "A".repeat(220),
        posterUrl: "https://example.com/poster.jpg",
        videoUrl: "https://example.com/video",
        goalAmountCents: 2_500_000,
        fundingModel: "all_or_nothing",
        stripeConnectOnboarded: true,
      },
      rewards,
    );
    expect(complete.score).toBe(100);
    expect(complete.launchReady).toBe(true);
  });

  it("builds a complete local campaign pack without an API call", () => {
    const pack = createCampaignPack(
      {
        format: "Feature",
        genre: "Drama",
        audience: "Australian independent-film audiences",
        tone: "Direct",
        premise: "A family confronts the cost of preserving a disappearing coastal town.",
        goal: "25000",
        currency: "AUD",
        duration: "30",
        useOfFunds: "principal photography and post-production",
        filmmakerStory: "The team has spent three years documenting the community.",
      },
      "The Last Sundowner",
    );

    expect(pack.pitch).toContain("The Last Sundowner");
    expect(pack.videoScript).toContain("Funding ask");
    expect(pack.rewards.length).toBeGreaterThanOrEqual(5);
  });

  it("only classifies explicit crowdfunding sources as platforms", () => {
    expect(isCrowdfundingPlatform({ sourceCategory: "crowdfunding" })).toBe(true);
    expect(isCrowdfundingPlatform({ type: "Film crowdfunding platform" })).toBe(true);
    expect(isCrowdfundingPlatform({ type: "Grant", supports: "Feature film development" })).toBe(false);
  });
});
