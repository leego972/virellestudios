import { describe, expect, it } from "vitest";
import {
  calculateBudgetChecks,
  calculateReadiness,
  classifyFundingSource,
  escapeHtml,
  hasFundingAccess,
  normaliseMojibake,
  scoreFundingSource,
} from "./_core/funding-utils";

const completeProfile = {
  applicantLegalName: "Example Pictures Pty Ltd",
  companyCountry: "Australia",
  contactName: "Producer Name",
  contactEmail: "producer@example.com",
  projectTitle: "Example Film",
  format: "Feature Film",
  stage: "Development",
  productionCountries: "Australia",
  genre: "Drama",
  logline: "A producer risks everything to complete a culturally significant independent film.",
  shortSynopsis: "A determined producer assembles a diverse team to complete an ambitious independent feature. The project explores community, identity and the cost of creative integrity. When financing collapses, the team must rebuild the production plan without compromising the story. Their final campaign brings the film and its intended audience together.",
  rightsPosition: "Original screenplay owned by the applicant.",
  teamSummary: "An experienced Australian producer, director and writer with independent film and festival experience.",
  totalBudget: "1000000",
  currency: "AUD",
  fundingRequested: "250000",
  securedFinance: "300000",
  pendingFinance: "200000",
  taxIncentives: "150000",
  producerContribution: "50000",
  gap: "50000",
  distributionStrategy: "Festival launch followed by Australian theatrical, broadcaster and streaming conversations.",
  whyTeam: "The team combines lived experience, production delivery and direct relationships with the intended audience.",
  attachmentChecklist: {
    script: true,
    synopsisTreatment: true,
    directorStatement: true,
    producerStatement: true,
    budgetTopSheet: true,
    detailedBudget: true,
    financePlan: true,
    productionSchedule: true,
    chainOfTitle: true,
    cvsBios: true,
  },
  budgetLines: {
    development: "100000",
    aboveTheLine: "200000",
    productionCrew: "400000",
    postProduction: "200000",
    contingency: "100000",
  },
};

describe("funding entitlement", () => {
  it("allows every current and legacy paid tier through one central rule", () => {
    for (const tier of ["indie", "amateur", "independent", "creator", "studio", "pro", "industry", "beta"]) {
      expect(hasFundingAccess({ subscriptionTier: tier, subscriptionStatus: "active" })).toBe(true);
    }
  });

  it("blocks anonymous, free, past-due and cancelled accounts but allows admins", () => {
    expect(hasFundingAccess(null)).toBe(false);
    expect(hasFundingAccess({ subscriptionTier: "free", subscriptionStatus: "active" })).toBe(false);
    expect(hasFundingAccess({ subscriptionTier: "indie", subscriptionStatus: "past_due" })).toBe(false);
    expect(hasFundingAccess({ subscriptionTier: "independent", subscriptionStatus: "canceled" })).toBe(false);
    expect(hasFundingAccess({ role: "admin", subscriptionTier: "free" })).toBe(true);
  });
});

describe("funding safety and data quality", () => {
  it("escapes user-controlled HTML", () => {
    expect(escapeHtml(`<img src=x onerror="alert(1)">`)).toBe("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
  });

  it("repairs common UTF-8 mojibake without changing clean text", () => {
    expect(normaliseMojibake("SÃ¸rfond")).toBe("Sørfond");
    expect(normaliseMojibake("Virelle Studios")).toBe("Virelle Studios");
  });

  it("separates opportunities from crowdfunding, incentives and references", () => {
    expect(classifyFundingSource({ organization: "Kickstarter", type: "Crowdfunding platform" })).toBe("crowdfunding");
    expect(classifyFundingSource({ organization: "Location Offset", fundingForm: "Tax rebate" })).toBe("incentive");
    expect(classifyFundingSource({ organization: "Screen Fund", fundingForm: "Grant" })).toBe("grant");
  });
});

describe("funding readiness and matching", () => {
  it("reconciles the finance plan and budget top sheet", () => {
    const result = calculateBudgetChecks(completeProfile);
    expect(result.total).toBe(1_000_000);
    expect(result.requestedPercent).toBe(25);
    expect(result.budgetLines).toBe(1_000_000);
    expect(result.calculatedGap).toBe(50_000);
    expect(result.warnings).toEqual([]);
  });

  it("produces a high readiness score for a complete pack", () => {
    const result = calculateReadiness(completeProfile);
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.missing).toEqual([]);
  });

  it("returns a transparent score breakdown and eligibility label", () => {
    const result = scoreFundingSource(
      {
        country: "Australia",
        organization: "Screen Australia Development Fund",
        type: "National public agency",
        supports: "Australian feature film development and drama projects",
        stage: "Development",
        fundingForm: "Grant",
        eligibility: "Australian incorporated producers only",
        lastVerifiedAt: new Date().toISOString(),
      },
      { title: "Example Film", genre: "Drama", description: completeProfile.shortSynopsis },
      completeProfile,
    );
    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(result.eligibility).toBe("eligible");
    expect(result.breakdown.country).toBe(25);
    expect(result.breakdown.stage).toBe(15);
    expect(result.reasons.length).toBeGreaterThan(0);
  });
});
