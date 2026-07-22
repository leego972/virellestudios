import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  getSceneById: vi.fn(),
  getProjectCharacters: vi.fn(),
  getWardrobeLeasesByUser: vi.fn(),
}));
const getDbMock = vi.hoisted(() => vi.fn());
vi.mock("./db", () => ({ ...dbMocks, getDb: getDbMock }));

import { loadSceneGenerationContext } from "./_core/sceneGenerationContext";

function mockDatabase(rows: any[]) {
  let call = 0;
  getDbMock.mockResolvedValue({
    select: vi.fn(() => {
      call++;
      if (call === 1) return { from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([{ userId: 7 }]) })) })) };
      return { from: vi.fn(() => ({ innerJoin: vi.fn(() => ({ where: vi.fn().mockResolvedValue(rows) })) })) };
    }),
  });
}

describe("mandatory character costume continuity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.getWardrobeLeasesByUser.mockResolvedValue([]);
  });

  it("blocks generation when an on-screen character has no assigned costume", async () => {
    dbMocks.getSceneById.mockResolvedValue({ id: 1, projectId: 99, orderIndex: 0, title: "Arrival", description: "Mara arrives.", characterIds: [11], wardrobe: [], duration: 8, aspectRatio: "16:9", frameRate: "24" });
    dbMocks.getProjectCharacters.mockResolvedValue([{ id: 11, userId: 7, projectId: 99, name: "Mara", photoUrl: "https://assets.test/mara.jpg", attributes: {} }]);
    mockDatabase([]);
    await expect(loadSceneGenerationContext(1, 99)).rejects.toThrow(/Wardrobe assignment required/);
  });

  it("suppresses the actor face reference for a full-face costume even when a stale assignment requests the face", async () => {
    dbMocks.getSceneById.mockResolvedValue({ id: 2, projectId: 99, orderIndex: 2, title: "Rooftop", description: "The masked vigilante watches the street.", characterIds: [11], wardrobe: [], duration: 8, aspectRatio: "16:9", frameRate: "24" });
    dbMocks.getProjectCharacters.mockResolvedValue([{ id: 11, userId: 7, projectId: 99, name: "Mara", photoUrl: "https://assets.test/mara-face.jpg", attributes: { ageRange: "30s", build: "athletic" } }]);
    mockDatabase([{
      assignment: { id: 9, userId: 7, projectId: 99, wardrobeItemId: 50, characterId: 11, sceneId: null, fromSceneOrder: 2, toSceneOrder: null, identityMode: "use_character_face", placementNotes: null, locked: true },
      item: { id: 50, collectionId: null, userId: 7, name: "Obsidian Vigilante Suit", category: "costume", primaryImageUrl: "https://assets.test/full-mask.jpg", imageUrls: ["https://assets.test/full-mask.jpg"], referencePrompt: "complete black armored suit with sealed cowl and opaque eye lenses", faceCoverage: "full", status: "active", characterWardrobeAllowed: true },
    }]);
    const context = await loadSceneGenerationContext(2, 99);
    expect(context.wardrobeBindings[0].suppressCharacterFaceReference).toBe(true);
    expect(context.wardrobeBindings[0].characterReferenceImageUrl).toBeUndefined();
    expect(context.referenceImages).not.toContain("https://assets.test/mara-face.jpg");
    expect(context.referenceImages).toContain("https://assets.test/full-mask.jpg");
    expect(context.canonicalPrompt).toContain("original actor face and face portrait are intentionally suppressed");
    expect(context.canonicalPrompt).toContain("zero exposed facial skin");
    expect(context.canonicalPrompt).toContain("Gloves cover hands and fingers");
  });
});
