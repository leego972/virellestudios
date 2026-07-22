from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def replace_once(path: str, old: str, new: str) -> None:
    target = ROOT / path
    text = target.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{path}: expected exactly one match, found {count}: {old[:160]!r}")
    target.write_text(text.replace(old, new, 1), encoding="utf-8")


replace_once(
    "server/_core/sceneGenerationContext.ts",
    '''  const canonicalCharacters: CanonicalSceneCharacter[] = [];
  const characterDescriptions: string[] = [];

  for (const character of activeCharacters as any[]) {''',
    '''  const canonicalCharacters: CanonicalSceneCharacter[] = [];
  const characterDescriptions: string[] = [];
  const missingCharacterWardrobe: string[] = [];

  for (const character of activeCharacters as any[]) {''',
)

replace_once(
    "server/_core/sceneGenerationContext.ts",
    '''    const selectedRow = selected.row;
    const selectedItem = selectedRow?.item as WardrobeItemRecord | undefined;
    let wardrobeAnchor: string | undefined;''',
    '''    const selectedRow = selected.row;
    const selectedItem = selectedRow?.item as WardrobeItemRecord | undefined;
    const hasStructuredWardrobeHistory = (rows as any[]).some((row) =>
      row.assignment?.characterId === character.id
      && row.assignment?.sceneId == null
      && (row.assignment?.fromSceneOrder ?? 0) <= sceneOrder,
    );
    const validInlineReplacement = inlineOutfitChange && hasStructuredWardrobeHistory;
    if (!selectedItem && !validInlineReplacement) {
      missingCharacterWardrobe.push(`${character.name} (scene ${sceneOrder + 1})`);
    }
    let wardrobeAnchor: string | undefined;''',
)

replace_once(
    "server/_core/sceneGenerationContext.ts",
    '''    });
  }

  for (const row of applicableRows.filter((entry) => !entry.assignment?.characterId)) {''',
    '''    });
  }

  if (missingCharacterWardrobe.length) {
    throw new Error(`Wardrobe assignment required before generation. Assign a costume to every on-screen character in Project Wardrobe. Missing: ${missingCharacterWardrobe.join(", ")}.`);
  }

  for (const row of applicableRows.filter((entry) => !entry.assignment?.characterId)) {''',
)

replace_once(
    "server/characterCostumeContinuity.test.ts",
    '''  it("keeps generation available when no special costume is assigned", async () => {
    dbMocks.getSceneById.mockResolvedValue({ id: 1, projectId: 99, orderIndex: 0, title: "Arrival", description: "Mara arrives.", characterIds: [11], wardrobe: [], duration: 8, aspectRatio: "16:9", frameRate: "24" });
    dbMocks.getProjectCharacters.mockResolvedValue([{ id: 11, userId: 7, projectId: 99, name: "Mara", photoUrl: "https://assets.test/mara.jpg", wardrobe: { signature: "navy field jacket" }, attributes: {} }]);
    mockDatabase([]);
    const context = await loadSceneGenerationContext(1, 99);
    expect(context.wardrobeBindings[0].wardrobeItemId).toBeUndefined();
    expect(context.referenceImages).toContain("https://assets.test/mara.jpg");
    expect(context.canonicalPrompt).toContain("navy field jacket");
  });''',
    '''  it("blocks generation when an on-screen character has no structured costume, even if the scene contains only an inline clothing note", async () => {
    dbMocks.getSceneById.mockResolvedValue({ id: 1, projectId: 99, orderIndex: 0, title: "Arrival", description: "Mara arrives.", characterIds: [11], wardrobe: [{ characterId: 11, wardrobeDescription: "temporary grey coat" }], duration: 8, aspectRatio: "16:9", frameRate: "24" });
    dbMocks.getProjectCharacters.mockResolvedValue([{ id: 11, userId: 7, projectId: 99, name: "Mara", photoUrl: "https://assets.test/mara.jpg", attributes: {} }]);
    mockDatabase([]);
    await expect(loadSceneGenerationContext(1, 99)).rejects.toThrow(/Wardrobe assignment required/);
  });''',
)

print("Mandatory character wardrobe enforcement applied.")
