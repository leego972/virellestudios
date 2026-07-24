import { describe, expect, it } from "vitest";
import {
  buildLamaloVariantTags,
  lamaloBaseDesignName,
  lamaloMasterReferenceKey,
  lamaloReferenceAngleTarget,
  lamaloVariantMetadata,
  wardrobeReferenceImages,
  wardrobeTurntableFrames,
} from "./_core/lamaloMasterReferences";

describe("Lamalo true 3D master reference packs", () => {
  it("keeps the base design stable while colour variants remain separate SKUs", () => {
    expect(lamaloBaseDesignName("Lamalo Premium Tee — Black")).toBe("Lamalo Premium Tee");
    expect(lamaloMasterReferenceKey("Lamalo Premium Tee — White")).toBe("lamalo-clothing:lamalo-premium-tee");

    const masterReferenceKey = lamaloMasterReferenceKey({
      baseDesignName: "Lamalo Premium Tee",
      genderFit: "male",
      category: "tops",
      subcategory: "t-shirts",
    });
    const black = buildLamaloVariantTags({
      baseDesignName: "Lamalo Premium Tee",
      selectedColour: "Black",
      masterReferenceKey,
      category: "tops",
      subcategory: "t-shirts",
    });
    const white = buildLamaloVariantTags({
      baseDesignName: "Lamalo Premium Tee",
      selectedColour: "White",
      masterReferenceKey,
      category: "tops",
      subcategory: "t-shirts",
    });

    expect(masterReferenceKey).toBe("lamalo-clothing:lamalo-premium-tee:male:tops:t-shirts");
    expect(black).toContain("lamalo-colour-sku");
    expect(black).toContain("separate-purchase");
    expect(black).toContain("shared-3d-master-geometry");
    expect(black).toContain(masterReferenceKey);
    expect(black).toContain("selected-colour:black");
    expect(black).toContain("turntable:pending");
    expect(white).toContain("selected-colour:white");
    expect(black).not.toEqual(white);
  });

  it("uses 24 continuity references for complex clothing and 12 for simple garments", () => {
    expect(lamaloReferenceAngleTarget("tops", "t-shirts")).toBe(12);
    expect(lamaloReferenceAngleTarget("lingerie", "boxer-briefs")).toBe(12);
    expect(lamaloReferenceAngleTarget("outerwear", "jackets")).toBe(24);
    expect(lamaloReferenceAngleTarget("dresses", "midi-dresses")).toBe(24);
    expect(lamaloReferenceAngleTarget("tops", "uniform-shirt")).toBe(24);
  });

  it("marks a colour SKU ready only with one GLB and exactly 36 HTTPS turntable frames", () => {
    const turntableFrameUrls = Array.from(
      { length: 36 },
      (_, index) => `https://assets.test/boxer-brief/navy/${String(index + 1).padStart(2, "0")}.webp`,
    );
    const item = {
      name: "Lamalo Boxer Brief — Navy",
      colors: ["Navy"],
      genderFit: "male",
      category: "lingerie",
      subcategory: "boxer-briefs",
      masterReferenceKey: "lamalo-clothing:lamalo-boxer-brief:male:lingerie:boxer-briefs",
      model3dUrl: "https://assets.test/boxer-brief/master.glb",
      turntableFrameUrls,
      turntableFrameCount: 36,
      turntableStatus: "ready",
      primaryImageUrl: "https://assets.test/boxer-brief/navy/front.png",
      imageUrls: Array.from(
        { length: 12 },
        (_, index) => `https://assets.test/boxer-brief/navy/reference-${index + 1}.png`,
      ),
    };

    expect(lamaloVariantMetadata(item)).toMatchObject({
      baseDesignName: "Lamalo Boxer Brief",
      selectedColour: "Navy",
      masterReferenceKey: "lamalo-clothing:lamalo-boxer-brief:male:lingerie:boxer-briefs",
      continuityAngleTarget: 12,
      turntableFrameCount: 36,
      model3dUrl: "https://assets.test/boxer-brief/master.glb",
      turntableReady: true,
    });
    expect(wardrobeTurntableFrames(item)).toEqual(turntableFrameUrls);

    expect(lamaloVariantMetadata({ ...item, turntableFrameUrls: turntableFrameUrls.slice(0, 35) }).turntableReady).toBe(false);
    expect(lamaloVariantMetadata({ ...item, model3dUrl: null }).turntableReady).toBe(false);
    expect(lamaloVariantMetadata({ ...item, turntableStatus: "processing" }).turntableReady).toBe(false);
  });

  it("deduplicates continuity references while retaining canonical order", () => {
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
