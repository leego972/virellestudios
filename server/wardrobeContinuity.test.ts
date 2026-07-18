import { describe, expect, it } from "vitest";
import {
  buildWardrobePromptAnchor,
  findOverlappingWardrobeAssignments,
  hasWardrobeAccess,
  resolveWardrobeForScene,
  validateWardrobeAssignment,
} from "./_core/wardrobeContinuity";

const coat = {
  id: 10,
  userId: 900,
  collectionId: 4,
  name: "Black Wool Hero Coat",
  primaryImageUrl: "https://assets.example.test/coat.jpg",
  imageUrls: ["https://assets.example.test/coat.jpg"],
  referencePrompt: "Long tailored black wool coat with brass buttons and red silk lining",
  colors: ["black", "red lining"],
  materials: ["wool", "silk"],
  category: "outerwear",
  status: "active",
  visibility: "public",
  characterWardrobeAllowed: true,
};

describe("wardrobe continuity", () => {
  it("grants permanent inventory access through a collection purchase", () => {
    expect(hasWardrobeAccess(7, coat, [{
      id: 1,
      userId: 7,
      wardrobeItemId: null,
      collectionId: 4,
      status: "active",
    }])).toBe(true);
  });

  it("rejects assignment without ownership or a valid generated reference", () => {
    const invalidItem = { ...coat, primaryImageUrl: null, imageUrls: [], referencePrompt: null };
    const errors = validateWardrobeAssignment({
      userId: 7,
      projectId: 100,
      characterId: 50,
      wardrobeItemId: invalidItem.id,
      fromSceneOrder: 0,
      toSceneOrder: 4,
    }, invalidItem, []);

    expect(errors.join(" ")).toContain("no generated or uploaded reference image");
    expect(errors.join(" ")).toContain("no AI reference prompt");
    expect(errors.join(" ")).toContain("does not own");
  });

  it("resolves the exact garment only inside its assigned scene range", () => {
    const assignment = {
      id: 3,
      userId: 7,
      projectId: 100,
      characterId: 50,
      wardrobeItemId: coat.id,
      fromSceneOrder: 2,
      toSceneOrder: 5,
      placementNotes: "Buttoned until scene 5; red lining only visible when walking.",
      locked: true,
    };
    const items = new Map([[coat.id, coat]]);

    expect(resolveWardrobeForScene(1, 50, [assignment], items)).toBeNull();
    const resolved = resolveWardrobeForScene(3, 50, [assignment], items);
    expect(resolved?.item.id).toBe(coat.id);
    expect(resolved?.promptAnchor).toContain("Buttoned until scene 5");
    expect(resolved?.promptAnchor).toContain("preserve the same garment design");
    expect(resolveWardrobeForScene(6, 50, [assignment], items)).toBeNull();
  });

  it("detects contradictory overlapping outfits for the same character", () => {
    const overlaps = findOverlappingWardrobeAssignments([
      { userId: 7, projectId: 100, characterId: 50, wardrobeItemId: 10, fromSceneOrder: 1, toSceneOrder: 4, locked: true },
      { userId: 7, projectId: 100, characterId: 50, wardrobeItemId: 11, fromSceneOrder: 3, toSceneOrder: 6, locked: true },
    ]);
    expect(overlaps).toHaveLength(1);
    expect(overlaps[0].characterId).toBe(50);
  });

  it("builds an exact locked garment prompt including material and image", () => {
    const prompt = buildWardrobePromptAnchor(coat, "Sleeves rolled once.");
    expect(prompt).toContain("Black Wool Hero Coat");
    expect(prompt).toContain("exact colours: black, red lining");
    expect(prompt).toContain("exact materials: wool, silk");
    expect(prompt).toContain("https://assets.example.test/coat.jpg");
    expect(prompt).toContain("Sleeves rolled once");
  });
});
