import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  getSceneById: vi.fn(),
  getProjectCharacters: vi.fn(),
  getWardrobeLeasesByUser: vi.fn(),
}));
const getDbMock = vi.hoisted(() => vi.fn());

vi.mock("./db", () => ({
  ...dbMocks,
  getDb: getDbMock,
}));

import { loadSceneGenerationContext } from "./_core/sceneGenerationContext";

function wardrobeItem(id: number, name: string) {
  return {
    id,
    collectionId: null,
    userId: 7,
    designerProfileId: 1,
    projectId: null,
    name,
    description: `${name} description`,
    category: "outerwear",
    subcategory: null,
    wardrobeType: "costume",
    genderFit: "unisex",
    sizeRange: null,
    era: "contemporary",
    colors: ["black"],
    materials: ["wool"],
    styleTags: ["tailored"],
    imageUrls: [`https://assets.example.test/${id}.jpg`],
    primaryImageUrl: `https://assets.example.test/${id}.jpg`,
    referencePrompt: `Exact ${name}, black wool, tailored cut`,
    brandPlacementAllowed: false,
    shopfrontPlacementAllowed: true,
    characterWardrobeAllowed: true,
    costumeUseAllowed: true,
    commercialUseAllowed: true,
    licenseType: "full_license",
    licenseNotes: null,
    visibility: "private",
    status: "active",
    retailPriceAud: 0,
    leasePriceAud: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
  };
}

function assignment(id: number, itemId: number, from: number, to: number) {
  return {
    id,
    userId: 7,
    projectId: 99,
    wardrobeItemId: itemId,
    assignmentType: "character_wardrobe",
    characterId: 11,
    sceneId: null,
    fromSceneOrder: from,
    toSceneOrder: to,
    usageMode: "must_match",
    placementNotes: null,
    promptWeight: 100,
    locked: true,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
  };
}

function mockDbRows(rows: any[]) {
  let selectCall = 0;
  getDbMock.mockResolvedValue({
    select: vi.fn(() => {
      selectCall++;
      if (selectCall === 1) {
        return {
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue([{ userId: 7 }]),
            })),
          })),
        };
      }
      return {
        from: vi.fn(() => ({
          innerJoin: vi.fn(() => ({
            where: vi.fn().mockResolvedValue(rows),
          })),
        })),
      };
    }),
  });
}

describe("scene wardrobe continuity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.getProjectCharacters.mockResolvedValue([{
      id: 11,
      userId: 7,
      projectId: 99,
      name: "Mara",
      description: "A precise intelligence officer",
      photoUrl: "https://assets.example.test/mara-generated-portrait.jpg",
      role: "Lead investigator",
      performanceStyle: "method-naturalistic",
      castingNotes: "Emotion stays in the eyes rather than broad gestures.",
      signatureMannerisms: "Touches the edge of her watch before deciding.",
      clothing: null,
      attributes: {
        generatedFromPhoto: true,
        referencePhotoUrl: "https://assets.example.test/mara-reference-photo.jpg",
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
    }]);
    dbMocks.getWardrobeLeasesByUser.mockResolvedValue([]);
  });

  it("carries photo-locked identity and the last assigned costume together across scenes", async () => {
    const coat = wardrobeItem(501, "Lamalo Obsidian Coat");
    mockDbRows([{ assignment: assignment(91, 501, 1, 2), item: coat }]);
    dbMocks.getSceneById.mockResolvedValue({
      id: 5,
      projectId: 99,
      orderIndex: 4,
      title: "Operations Room",
      description: "Mara studies the evidence.",
      characterIds: [11],
      wardrobe: [],
      duration: 8,
      aspectRatio: "16:9",
      frameRate: "24",
    });

    const context = await loadSceneGenerationContext(5, 99);

    expect(context.wardrobeBindings).toHaveLength(1);
    expect(context.wardrobeBindings[0]).toEqual(expect.objectContaining({
      characterId: 11,
      wardrobeItemId: 501,
      characterReferenceImageUrl: "https://assets.example.test/mara-generated-portrait.jpg",
      wardrobeReferenceImageUrl: "https://assets.example.test/501.jpg",
      carriedForward: true,
      explicitChange: false,
    }));

    expect(context.wardrobeContext).toContain("CONTINUITY CARRY-FORWARD");
    expect(context.canonicalPrompt).toContain("IDENTITY REFERENCE HARD-LOCK");
    expect(context.canonicalPrompt).toContain("small scar through left eyebrow");
    expect(context.canonicalPrompt).toContain("upright military posture");
    expect(context.canonicalPrompt).toContain("method-naturalistic");
    expect(context.canonicalPrompt).toContain("Touches the edge of her watch");
    expect(context.canonicalPrompt).toContain("Mara MUST WEAR ONLY");
    expect(context.canonicalPrompt).toContain("Exact Lamalo Obsidian Coat");

    expect(context.referenceImages).toContain("https://assets.example.test/mara-generated-portrait.jpg");
    expect(context.referenceImages).toContain("https://assets.example.test/501.jpg");
  });

  it("starts an explicit replacement costume on the new assignment's first scene", async () => {
    const oldCoat = wardrobeItem(501, "Lamalo Obsidian Coat");
    const newSuit = wardrobeItem(502, "Lamalo Ivory Command Suit");
    mockDbRows([
      { assignment: assignment(91, 501, 1, 2), item: oldCoat },
      { assignment: assignment(92, 502, 4, 8), item: newSuit },
    ]);
    dbMocks.getSceneById.mockResolvedValue({
      id: 6,
      projectId: 99,
      orderIndex: 4,
      title: "Press Conference",
      description: "Mara enters the press room.",
      characterIds: [11],
      wardrobe: [],
      duration: 8,
      aspectRatio: "16:9",
      frameRate: "24",
    });

    const context = await loadSceneGenerationContext(6, 99);

    expect(context.wardrobeBindings[0]).toEqual(expect.objectContaining({
      wardrobeItemId: 502,
      carriedForward: false,
      explicitChange: true,
    }));
    expect(context.wardrobeContext).toContain("Lamalo Ivory Command Suit");
    expect(context.wardrobeContext).not.toContain("CONTINUITY CARRY-FORWARD");
  });

  it("allows explicit inline wardrobe direction to replace a carried assignment", async () => {
    const coat = wardrobeItem(501, "Lamalo Obsidian Coat");
    mockDbRows([{ assignment: assignment(91, 501, 1, 2), item: coat }]);
    dbMocks.getSceneById.mockResolvedValue({
      id: 7,
      projectId: 99,
      orderIndex: 4,
      title: "Safe House",
      description: "Mara changes before leaving.",
      characterIds: [11],
      wardrobe: [{ characterId: 11, wardrobeDescription: "plain grey hospital scrubs" }],
      duration: 8,
      aspectRatio: "16:9",
      frameRate: "24",
    });

    const context = await loadSceneGenerationContext(7, 99);

    expect(context.wardrobeBindings[0]).toEqual(expect.objectContaining({
      wardrobeItemId: undefined,
      carriedForward: false,
      explicitChange: true,
    }));
    expect(context.wardrobeContext).toContain("plain grey hospital scrubs");
    expect(context.wardrobeContext).not.toContain("Lamalo Obsidian Coat");
  });
});
