import { describe, expect, it } from "vitest";
import {
  buildLamaloVariantTags,
  lamaloBaseDesignName,
  lamaloMasterReferenceKey,
  lamaloReferenceAngleTarget,
  lamaloVariantMetadata,
  wardrobeReferenceImages,
} from "./_core/lamaloMasterReferences";

describe("Lamalo master reference packs", () => {
  it("keeps the base design stable while colour variants remain separate SKUs", () => {
    expect(lamaloBaseDesignName("Lamalo Premium Tee — Black")).toBe("Lamalo Premium Tee");
    expect(lamaloMasterReferenceKey("Lamalo Premium Tee — White")).toBe("lamalo-master:lamalo-premium-tee");

    const black = buildLamaloVariantTags({
      baseDesignName: "Lamalo Premium Tee",
      selectedColour: "Black",
      category: "tops",
      subcategory: "t-shirts",
    });
    const white = buildLamaloVariantTags({
      baseDesignName: "Lamalo Premium Tee",
      selectedColour: "White",
      category: "tops",
      subcategory: "t-shirts",
    });

    expect(black).toContain("lamalo-colour-sku");
    expect(black).toContain("separate-purchase");
    expect(black).toContain("lamalo-master:lamalo-premium-tee");
    expect(black).toContain("selected-colour:black");
    expect(white).toContain("selected-colour:white");
    expect(black).not.toEqual(white);
  });

  it("requires more reference angles for structured garments", () => {
    expect(lamaloReferenceAngleTarget("tops", "t-shirts")).toBe(12);
    expect(lamaloReferenceAngleTarget("outerwear", "jackets")).toBe(24);
    expect(lamaloReferenceAngleTarget("footwear", "boots")).toBe(24);
    expect(lamaloReferenceAngleTarget("bags", "handbags")).toBe(24);
  });

  it("marks a pack ready only when its tag and minimum real references agree", () => {
    const item = {
      name: "Lamalo Boxer Brief — Navy",
      colors: ["Navy"],
      category: "lingerie",
      subcategory: "boxer-briefs",
      styleTags: [
        "lamalo-colour-sku",
        "lamalo-master:lamalo-boxer-brief",
        "selected-colour:navy",
        "reference-angle-target:12",
        "reference-pack:360-ready",
      ],
      primaryImageUrl: "https://assets.test/front.png",
      imageUrls: [
        "https://assets.test/front.png",
        "https://assets.test/front-three-quarter.png",
        "https://assets.test/back.png",
        "https://assets.test/left.png",
        "https://assets.test/right.png",
        "https://assets.test/back-three-quarter.png",
      ],
    };

    expect(lamaloVariantMetadata(item)).toMatchObject({
      baseDesignName: "Lamalo Boxer Brief",
      selectedColour: "Navy",
      masterReferenceKey: "lamalo-master:lamalo-boxer-brief",
      angleTarget: 12,
      referencePackReady: true,
    });
  });

  it("deduplicates references while retaining canonical order", () => {
    expect(wardrobeReferenceImages({
      primaryImageUrl: "https://assets.test/front.png",
      imageUrls: [
        "https://assets.test/front.png",
        "https://assets.test/back.png",
        "https://assets.test/side.png",
      ],
    })).toEqual([
      "https://assets.test/front.png",
      "https://assets.test/back.png",
      "https://assets.test/side.png",
    ]);
  });
});
