import { describe, expect, it } from "vitest";
import { buildCharacterDNA, injectCharacterDNA } from "./_core/characterConsistency";

describe("character generation input pipeline", () => {
  it("uses photo analysis DNA, the generated portrait, and director requirements", () => {
    const dna = buildCharacterDNA({
      id: 71,
      name: "Mara Vale",
      description: "A controlled intelligence officer with a guarded presence.",
      photoUrl: "https://cdn.example.com/generated-mara.jpg",
      role: "Lead investigator",
      performanceStyle: "method-naturalistic",
      castingNotes: "Never smiles unless she is deliberately disarming someone.",
      signatureMannerisms: "Touches the edge of her watch before making a decision.",
      attributes: {
        generatedFromPhoto: true,
        referencePhotoUrl: "https://cdn.example.com/reference-mara.jpg",
        faceDnaPrompt: "FACE: elongated oval | EYES: grey-green | DISTINGUISHING: small scar through left eyebrow",
        bodyDnaPrompt: "lean athletic build | upright military posture",
        estimatedAge: "mid-30s",
        gender: "woman",
        skinTone: "light olive",
        hairColor: "dark brown",
        hairStyle: "chin-length blunt bob",
        eyeColor: "grey-green",
        additionalNotes: "Preserve the left eyebrow scar and blunt bob exactly.",
      },
    });

    expect(dna.referenceImageUrl).toBe("https://cdn.example.com/generated-mara.jpg");
    expect(dna.referenceImageLocked).toBe(true);
    expect(dna.promptAnchor).toContain("elongated oval");
    expect(dna.promptAnchor).toContain("small scar through left eyebrow");
    expect(dna.promptAnchor).toContain("lean athletic build");
    expect(dna.promptAnchor).toContain("Lead investigator");
    expect(dna.promptAnchor).toContain("method-naturalistic");
    expect(dna.promptAnchor).toContain("Never smiles");
    expect(dna.promptAnchor).toContain("Touches the edge of her watch");
    expect(dna.promptAnchor).toContain("Preserve the left eyebrow scar");
  });

  it("uses every structured AI feature instead of generic defaults", () => {
    const dna = buildCharacterDNA({
      id: 72,
      name: "Idris North",
      photoUrl: "https://cdn.example.com/idris.jpg",
      attributes: {
        aiGenerated: true,
        ageRange: "late 50s",
        gender: "man",
        ethnicity: "Sudanese-Australian",
        skinTone: "deep brown with cool undertone",
        build: "tall broad-shouldered",
        height: "very tall",
        hairColor: "salt-and-pepper",
        hairStyle: "close-cropped coils",
        eyeColor: "dark amber",
        facialFeatures: "long face, high cheekbones, strong square jaw",
        facialHair: "short boxed beard",
        distinguishingMarks: "thin diagonal scar on right cheek",
        clothingStyle: "charcoal wool overcoat",
        expression: "calm but intimidating",
        additionalNotes: "Keep the scar visible in every angle.",
      },
    });

    for (const expected of [
      "late 50s",
      "Sudanese-Australian",
      "deep brown with cool undertone",
      "tall broad-shouldered",
      "close-cropped coils",
      "dark amber",
      "strong square jaw",
      "short boxed beard",
      "thin diagonal scar",
      "charcoal wool overcoat",
      "calm but intimidating",
      "Keep the scar visible",
    ]) {
      expect(dna.promptAnchor).toContain(expected);
    }
    expect(dna.promptAnchor).not.toContain("medium skin");
    expect(dna.promptAnchor).not.toContain("brown eyes");
  });

  it("carries manual profile, personality, story, speech and wardrobe direction", () => {
    const dna = buildCharacterDNA({
      id: 73,
      name: "Jonas Reed",
      description: "Weathered dockworker, broken nose, heavy eyelids and powerful forearms.",
      role: "Reluctant mentor",
      nationality: "Australian",
      personality: { traits: ["loyal", "suspicious", "dryly funny"], temperament: "phlegmatic" },
      motivations: "Protect his estranged daughter without revealing he is helping her.",
      fears: "Becoming as violent as his father.",
      speechPattern: "Short sentences, working-class Melbourne slang, no speeches.",
      accent: "Broad Melbourne",
      signatureMannerisms: "Rolls his right shoulder when anxious.",
      wardrobe: { signature: "faded navy work shirt and oil-stained boots" },
      castingNotes: "Performance must remain restrained; emotion appears in the eyes, not gestures.",
    });

    expect(dna.promptAnchor).toContain("Weathered dockworker");
    expect(dna.promptAnchor).toContain("Reluctant mentor");
    expect(dna.promptAnchor).toContain("loyal");
    expect(dna.promptAnchor).toContain("Protect his estranged daughter");
    expect(dna.promptAnchor).toContain("Broad Melbourne");
    expect(dna.promptAnchor).toContain("Rolls his right shoulder");
    expect(dna.promptAnchor).toContain("faded navy work shirt");
    expect(dna.promptAnchor).toContain("Performance must remain restrained");
  });

  it("injects the complete character anchor before the scene prompt", () => {
    const dna = buildCharacterDNA({
      id: 74,
      name: "Ari",
      description: "A red-haired pilot with a facial burn scar.",
      photoUrl: "https://cdn.example.com/ari.jpg",
      attributes: { hairColor: "copper red", distinguishingMarks: "burn scar over left temple" },
    });
    const prompt = injectCharacterDNA("A storm shakes the cockpit.", [dna], [74]);
    expect(prompt.startsWith("[CHARACTER Ari:")).toBe(true);
    expect(prompt).toContain("burn scar over left temple");
    expect(prompt).toContain("A storm shakes the cockpit.");
  });
});
