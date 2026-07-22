import { describe, expect, it } from "vitest";
import {
  buildPitchDeckSlides,
  createPitchDeckPdf,
  createPitchDeckPptx,
  type InvestorFields,
  type PitchDeckData,
} from "./pitchDeckFileExport";

const data: PitchDeckData = {
  title: "Test Feature",
  logline: "A filmmaker rebuilds a lost production before the final deadline.",
  synopsis: "A complete test synopsis used to verify deterministic pitch exports.",
  genre: "Drama",
  tone: "Cinematic",
  themes: ["continuity", "resilience"],
  characters: [
    { id: 1, name: "Alex", description: "The project director." },
    { id: 2, name: "Sam", description: "The production partner." },
  ],
  scenes: [
    { id: 1, sceneNumber: 1, title: "Opening", description: "The deadline is revealed." },
  ],
  budgetEstimate: { total: 750000, currency: "AUD" },
  productionPlan: "Pre-production, principal production, post-production and delivery.",
};

const investor: InvestorFields = {
  fundingAsk: "AUD 750,000",
  useOfFunds: "Production and post-production",
  targetAudience: "Adult drama audiences",
  marketPosition: "Premium independent feature",
  distributionStrategy: "Festival and distributor launch",
  contactLine: "Producer · producer@example.com",
};

describe("pitchDeckFileExport", () => {
  it("builds a complete investor slide sequence", () => {
    const slides = buildPitchDeckSlides(data, investor);
    expect(slides).toHaveLength(9);
    expect(slides[0].title).toBe("Test Feature");
    expect(slides.some(slide => slide.title === "Budget and funding ask")).toBe(true);
    expect(slides.at(-1)?.subtitle).toBe("AUD 750,000");
  });

  it("creates a structurally valid PDF download", async () => {
    const result = createPitchDeckPdf(data, investor);
    const bytes = new Uint8Array(await result.blob.arrayBuffer());
    const contents = new TextDecoder().decode(bytes);

    expect(result.filename).toBe("Test_Feature_pitch_deck.pdf");
    expect(result.blob.type).toBe("application/pdf");
    expect(contents.startsWith("%PDF-1.4")).toBe(true);
    expect(contents).toContain("/Type /Catalog");
    expect(contents).toContain("Test Feature");
    expect(contents.trimEnd().endsWith("%%EOF")).toBe(true);
  });

  it("creates an uncompressed Open XML PowerPoint package", async () => {
    const result = createPitchDeckPptx(data, investor);
    const bytes = new Uint8Array(await result.blob.arrayBuffer());
    const contents = new TextDecoder().decode(bytes);

    expect(result.filename).toBe("Test_Feature_pitch_deck.pptx");
    expect(result.blob.type).toBe(
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    );
    expect(Array.from(bytes.slice(0, 4))).toEqual([0x50, 0x4b, 0x03, 0x04]);
    expect(contents).toContain("[Content_Types].xml");
    expect(contents).toContain("ppt/presentation.xml");
    expect(contents).toContain("ppt/slides/slide9.xml");
    expect(contents).toContain("Test Feature");
  });
});
