import { describe, expect, it } from "vitest";
import {
  assertCanonicalSceneSpec,
  compileCanonicalSceneSpec,
  renderCanonicalScenePrompt,
} from "./_core/canonicalSceneSpec";

describe("canonical scene specification", () => {
  it("preserves explicit user camera, location, action and continuity inputs", () => {
    const spec = compileCanonicalSceneSpec({
      id: 7,
      orderIndex: 2,
      title: "The warning",
      visualDescription: "Mara confronts Elias in the rain.",
      actionDescription: "Mara places the red key on the table and never releases eye contact.",
      characterBlocking: "Mara frame-left facing right; Elias frame-right facing left; preserve the 180-degree line.",
      locationType: "hotel room",
      city: "Paris",
      country: "France",
      locationDetail: "Room 407, cracked green wallpaper",
      timeOfDay: "night",
      weather: "heavy rain outside",
      cameraAngle: "eye-level over-shoulder",
      cameraMovement: "slow push toward Mara",
      lensType: "anamorphic prime",
      focalLength: "50mm",
      depthOfField: "shallow",
      shotType: "two-shot",
      frameRate: "24fps",
      aspectRatio: "2.39:1",
      colorPalette: "green, amber and deep red",
      wardrobeOverrides: { Mara: "black wool coat", Elias: "white dinner jacket" },
      characterIds: [10, 11],
      dialogueLines: [{ characterName: "Mara", text: "You knew." }],
    }, [
      { id: 10, name: "Mara", visualAnchor: "same face and short black hair", wardrobe: "black wool coat" },
      { id: 11, name: "Elias", visualAnchor: "same scar over left eyebrow", wardrobe: "white dinner jacket" },
    ]);

    expect(spec.validationErrors).toEqual([]);
    expect(spec.locationDescription).toContain("Room 407");
    expect(spec.locationDescription).toContain("Paris");
    expect(spec.camera.aspectRatio).toBe("2.39:1");
    expect(spec.lockedRequirements.join(" ")).toContain("red key");
    expect(spec.lockedRequirements.join(" ")).toContain("180-degree line");
    expect(renderCanonicalScenePrompt(spec)).toContain("LOCKED REQUIREMENTS");
    expect(renderCanonicalScenePrompt(spec)).toContain("50mm");
  });

  it("rejects unknown character references and dialogue speakers", () => {
    const spec = compileCanonicalSceneSpec({
      id: 1,
      orderIndex: 0,
      description: "A conversation.",
      characterIds: [99],
      dialogueLines: [{ characterName: "Unknown Person", text: "Hello" }],
    }, [{ id: 1, name: "Known Person" }]);

    expect(spec.validationErrors.join(" ")).toContain("Unknown character IDs");
    expect(spec.validationErrors.join(" ")).toContain("Dialogue speakers");
    expect(() => assertCanonicalSceneSpec(spec)).toThrow(/pre-generation validation/);
  });

  it("uses the director override as the canonical narrative rather than first-shot-only text", () => {
    const spec = compileCanonicalSceneSpec({
      id: 2,
      orderIndex: 1,
      description: "Automatic description",
      aiPromptOverride: "Exact director instruction applied to the complete scene",
    }, []);

    expect(spec.baseNarrative).toBe("Exact director instruction applied to the complete scene");
    expect(renderCanonicalScenePrompt(spec)).toContain("Exact director instruction applied to the complete scene");
  });
});
