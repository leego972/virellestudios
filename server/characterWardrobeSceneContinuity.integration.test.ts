import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  getSceneById: vi.fn(),
  getProjectCharacters: vi.fn(),
  getWardrobeLeasesByUser: vi.fn(),
}));
const getDbMock = vi.hoisted(() => vi.fn());

vi.mock("./db", () => ({ ...dbMocks, getDb: getDbMock }));

import { loadSceneGenerationContext } from "./_core/sceneGenerationContext";

const character = {
  id: 11,
  userId: 7,
  projectId: 99,
  name: "Mara Vale",
  description: "A controlled intelligence officer with a guarded presence.",
  photoUrl: "https://assets.test/mara-generated-portrait.jpg",
  role: "Lead investigator",
  performanceStyle: "method-naturalistic",
  castingNotes: "Emotion remains restrained and visible primarily through the eyes.",
  signatureMannerisms: "Touches the edge of her watch before making a decision.",
  attributes: {
    generatedFromPhoto: true,
    referencePhotoUrl: "https://assets.test/mara-reference.jpg",
    faceDnaPrompt: "FACE: elongated oval | EYES: grey-green | HAIR: dark brown | style: chin-length blunt bob | DISTINGUISHING: small scar through left eyebrow",
    bodyDnaPrompt: "lean athletic build | upright military posture",
    estimatedAge: "mid-30s",
    gender: "woman",
    skinTone: "light olive",
    hairColor: "dark brown",
    hairStyle: "chin-length blunt bob",
    eyeColor: "grey-green",
    additionalNotes: "Preserve the left eyebrow scar and blunt bob exactly.",
  },
};

const fieldJacket = {
  id: 50,
  collectionId: null,
  userId: 7,
  name: "Navy Field Jacket",
  category: "costume",
  primaryImageUrl: "https://assets.test/navy-field-jacket.jpg",
  imageUrls: ["https://assets.test/navy-field-jacket.jpg"],
  referencePrompt: "fitted navy field jacket, brass zip, reinforced shoulders, dark utility trousers and black boots",
  faceCoverage: "none",
  colors: ["navy", "black"],
  materials: ["waxed cotton", "leather"],
  status: "active",
  characterWardrobeAllowed: true,
};

const formalCoat = {
  id: 51,
  collectionId: null,
  userId: 7,
  name: "Charcoal Formal Coat",
  category: "costume",
  primaryImageUrl: "https://assets.test/charcoal-formal-coat.jpg",
  imageUrls: ["https://assets.test/charcoal-formal-coat.jpg"],
  referencePrompt: "tailored charcoal wool coat, narrow lapels, black silk blouse, fitted trousers and polished boots",
  faceCoverage: "none",
  colors: ["charcoal", "black"],
  materials: ["wool", "silk", "leather"],
  status: "active",
  characterWardrobeAllowed: true,
};

const assignmentRows = [
  {
    assignment: {
      id: 90,
      userId: 7,
      projectId: 99,
      wardrobeItemId: 50,
      characterId: 11,
      sceneId: null,
      fromSceneOrder: 0,
      toSceneOrder: 2,
      identityMode: "use_character_face",
      placementNotes: "Jacket fully zipped during field operations.",
      locked: true,
    },
    item: fieldJacket,
  },
  {
    assignment: {
      id: 91,
      userId: 7,
      projectId: 99,
      wardrobeItemId: 51,
      characterId: 11,
      sceneId: null,
      fromSceneOrder: 3,
      toSceneOrder: 20,
      identityMode: "use_character_face",
      placementNotes: "Formal coat begins at the embassy scene.",
      locked: true,
    },
    item: formalCoat,
  },
];

function installDatabase(rows: any[]) {
  getDbMock.mockImplementation(async () => {
    let selectCall = 0;
    return {
      select: vi.fn(() => {
        selectCall += 1;
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
    };
  });
}

function scene(orderIndex: number, title: string) {
  return {
    id: orderIndex + 1,
    projectId: 99,
    orderIndex,
    title,
    description: `${character.name} performs the scene action.`,
    characterIds: [11],
    wardrobe: [],
    duration: 8,
    aspectRatio: "16:9",
    frameRate: "24",
  };
}

describe("integrated character identity and wardrobe continuity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.getWardrobeLeasesByUser.mockResolvedValue([]);
    dbMocks.getProjectCharacters.mockResolvedValue([character]);
    installDatabase(assignmentRows);
  });

  it("keeps the same photo-derived identity and assigned costume through consecutive scenes", async () => {
    const contexts = [];
    for (const [orderIndex, title] of [[0, "Arrival"], [1, "Interrogation"], [2, "Rooftop Pursuit"]] as const) {
      dbMocks.getSceneById.mockResolvedValueOnce(scene(orderIndex, title));
      contexts.push(await loadSceneGenerationContext(orderIndex + 1, 99));
    }

    for (const context of contexts) {
      expect(context.wardrobeBindings[0].characterReferenceImageUrl).toBe(character.photoUrl);
      expect(context.wardrobeBindings[0].wardrobeItemId).toBe(fieldJacket.id);
      expect(context.wardrobeBindings[0].wardrobeReferenceImageUrl).toBe(fieldJacket.primaryImageUrl);
      expect(context.referenceImages).toContain(character.photoUrl);
      expect(context.referenceImages).toContain(fieldJacket.primaryImageUrl);
      expect(context.canonicalPrompt).toContain("elongated oval");
      expect(context.canonicalPrompt).toContain("small scar through left eyebrow");
      expect(context.canonicalPrompt).toContain("chin-length blunt bob");
      expect(context.canonicalPrompt).toContain("Navy Field Jacket");
      expect(context.canonicalPrompt).toContain("preserve the same garment design");
    }
  });

  it("replaces the earlier costume at the intended scene without mixing garment references", async () => {
    dbMocks.getSceneById.mockResolvedValue(scene(3, "Embassy Reception"));
    const context = await loadSceneGenerationContext(4, 99);

    expect(context.wardrobeBindings[0].characterReferenceImageUrl).toBe(character.photoUrl);
    expect(context.wardrobeBindings[0].wardrobeItemId).toBe(formalCoat.id);
    expect(context.wardrobeBindings[0].wardrobeReferenceImageUrl).toBe(formalCoat.primaryImageUrl);
    expect(context.referenceImages).toContain(character.photoUrl);
    expect(context.referenceImages).toContain(formalCoat.primaryImageUrl);
    expect(context.referenceImages).not.toContain(fieldJacket.primaryImageUrl);
    expect(context.canonicalPrompt).toContain("Charcoal Formal Coat");
    expect(context.canonicalPrompt).not.toContain("Navy Field Jacket");
    expect(context.canonicalPrompt).toContain("Mara Vale");
    expect(context.canonicalPrompt).toContain("left eyebrow scar");
  });
});
