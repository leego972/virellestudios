import { describe, expect, it } from "vitest";
import { buildScenePrompt, buildVisualDNA } from "./_core/cinematicPromptEngine";

describe("cinematic prompt compatibility wrapper", () => {
  it("keeps exact director direction without bypassing inline wardrobe and camera rules", () => {
    const characters = [{
      id: 3,
      name: "Mara",
      description: "A detective with short black hair",
      clothing: "default grey suit",
      ageRange: "30s",
    }];
    const visualDNA = buildVisualDNA({ title: "Locker 47", genre: "Thriller" }, characters, "industry");
    const prompt = buildScenePrompt({
      title: "The locker",
      description: "Automatic description",
      aiPromptOverride: "Mara stays frame-left and opens locker 47 with her right hand.",
      cameraAngle: "waist-height profile",
      cameraMovement: "single lateral dolly",
      locationType: "empty railway station",
      wardrobe: [{
        characterId: 3,
        wardrobeDescription: "long black wool coat with brass buttons and red silk lining",
        accessories: "silver watch on left wrist",
      }],
    }, visualDNA, {
      characterNames: ["Mara"],
      characters,
    });

    expect(prompt).toContain("DIRECTOR OVERRIDE — LOCKED");
    expect(prompt).toContain("locker 47");
    expect(prompt).toContain("long black wool coat");
    expect(prompt).toContain("silver watch");
    expect(prompt).toContain("waist-height profile");
    expect(prompt).toContain("single lateral dolly");
    expect(prompt).toContain("empty railway station");
    expect(prompt).toContain("AVOID");
  });
});
