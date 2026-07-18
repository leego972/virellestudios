import { describe, expect, it } from "vitest";
import { compileCanonicalSceneSpec, renderCanonicalScenePrompt } from "./_core/canonicalSceneSpec";
import { planSubShots } from "./_core/extendedSceneGenerator";

describe("extended scene planning", () => {
  it("applies an explicit director camera instruction to every planned sub-shot", () => {
    const spec = compileCanonicalSceneSpec({
      id: 11,
      orderIndex: 0,
      visualDescription: "A detective crosses the empty station and opens the red locker.",
      actionDescription: "The detective walks left to right, stops at locker 47, opens it and removes a red envelope.",
      cameraAngle: "waist-height profile",
      cameraMovement: "single uninterrupted lateral dolly",
      lensType: "anamorphic prime",
      focalLength: "40mm",
      depthOfField: "deep focus",
      aspectRatio: "2.39:1",
      frameRate: "24fps",
      duration: 32,
    }, [{ id: 1, name: "Detective", visualAnchor: "same face, same charcoal coat" }]);

    const shots = planSubShots(spec, renderCanonicalScenePrompt(spec), 32, "runway", "action");

    expect(shots.length).toBe(4);
    for (const shot of shots) {
      expect(shot.cameraAngle).toBe("waist-height profile");
      expect(shot.cameraMovement).toBe("single uninterrupted lateral dolly");
      expect(shot.prompt).toContain("LOCKED LENS TYPE: anamorphic prime");
      expect(shot.prompt).toContain("LOCKED FOCAL LENGTH: 40mm");
      expect(shot.prompt).toContain("LOCKED DEPTH OF FIELD: deep focus");
      expect(shot.prompt).toContain("red envelope");
    }
  });

  it("keeps the director override and continuity rules in every clip prompt", () => {
    const spec = compileCanonicalSceneSpec({
      id: 12,
      orderIndex: 1,
      description: "Automatic description that should not lead.",
      aiPromptOverride: "Mara remains frame-left and silently slides the silver key to Elias.",
      characterBlocking: "Mara frame-left; Elias frame-right; never cross the 180-degree line.",
      screenDirection: "Mara's movement remains left-to-right.",
      duration: 25,
    }, [
      { id: 1, name: "Mara", visualAnchor: "same face", wardrobeAnchor: "same black wool coat" },
      { id: 2, name: "Elias", visualAnchor: "same scar", wardrobeAnchor: "same white dinner jacket" },
    ]);

    const shots = planSubShots(spec, renderCanonicalScenePrompt(spec), 25, "fal", "dialogue");

    expect(shots.length).toBe(2);
    for (const shot of shots) {
      expect(shot.prompt).toContain("Mara remains frame-left");
      expect(shot.prompt).toContain("silver key");
      expect(shot.prompt).toContain("180-degree line");
      expect(shot.prompt).toContain("same black wool coat");
      expect(shot.prompt).toContain("same white dinner jacket");
      expect(shot.prompt).toContain("SCENE CONTRACT");
    }
  });
});
