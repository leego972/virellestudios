import { describe, expect, it } from "vitest";
import {
  createBudgetCsv,
  createFundingDocx,
  createFundingPdf,
  estimateIncentive,
  localBudgetReview,
  wordCount,
} from "./fundingTools";

const profile = {
  projectTitle: "Example Film",
  currency: "AUD",
  totalBudget: "1000000",
  fundingRequested: "250000",
  securedFinance: "300000",
  pendingFinance: "200000",
  taxIncentives: "150000",
  producerContribution: "50000",
  gap: "50000",
  logline: "A filmmaker rebuilds a production after its financing collapses.",
  budgetLines: { development: "100000", productionCrew: "600000", postProduction: "200000", contingency: "100000" },
};

describe("funding browser utilities", () => {
  it("counts words and reviews finance arithmetic", () => {
    expect(wordCount("one two three")).toBe(3);
    const review = localBudgetReview(profile);
    expect(review.lineTotal).toBe(1_000_000);
    expect(review.calculatedGap).toBe(50_000);
    expect(review.warnings).toEqual([]);
  });

  it("uses qualifying expenditure rather than multiplying the full budget", () => {
    const estimate = estimateIncentive({
      totalBudget: 10_000_000,
      qualifyingLocalSpend: 4_000_000,
      qualifyingLabourSpend: 1_000_000,
      headlineRate: 20,
      labourRate: 30,
      minimumSpend: 1_000_000,
      projectCap: 2_000_000,
    });
    expect(estimate.estimated).toBe(900_000);
  });

  it("creates valid signature bytes for PDF and DOCX downloads", async () => {
    const source = { organization: "Example Fund", country: "Australia" };
    const pdf = new Uint8Array(await createFundingPdf(profile, source).arrayBuffer());
    const docx = new Uint8Array(await createFundingDocx(profile, source).arrayBuffer());
    expect(new TextDecoder().decode(pdf.slice(0, 8))).toContain("%PDF-1.4");
    expect(docx[0]).toBe(0x50);
    expect(docx[1]).toBe(0x4b);
  });

  it("exports the budget as CSV", async () => {
    const csv = await createBudgetCsv(profile).text();
    expect(csv).toContain("Category");
    expect(csv).toContain("Development");
    expect(csv).toContain("Calculated finance gap");
  });
});
