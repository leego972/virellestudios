from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def replace_once(path: str, old: str, new: str) -> None:
    target = ROOT / path
    text = target.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{path}: expected one match, found {count}")
    target.write_text(text.replace(old, new, 1), encoding="utf-8")


replace_once(
    "server/_core/sceneGenerationContext.ts",
    '''    if (!selectedItem) {
      missingCharacterWardrobe.push(`${character.name} (scene ${sceneOrder + 1})`);
    }''',
    '''    const hasStructuredWardrobeHistory = (rows as any[]).some((row) =>
      row.assignment?.characterId === character.id
      && row.assignment?.sceneId == null
      && (row.assignment?.fromSceneOrder ?? 0) <= sceneOrder,
    );
    const validInlineReplacement = inlineOutfitChange && hasStructuredWardrobeHistory;
    if (!selectedItem && !validInlineReplacement) {
      missingCharacterWardrobe.push(`${character.name} (scene ${sceneOrder + 1})`);
    }''',
)

replace_once(
    "server/characterCostumeContinuity.test.ts",
    '''  it("blocks generation when an on-screen character has no assigned costume", async () => {
    dbMocks.getSceneById.mockResolvedValue({ id: 1, projectId: 99, orderIndex: 0, title: "Arrival", description: "Mara arrives.", characterIds: [11], wardrobe: [], duration: 8, aspectRatio: "16:9", frameRate: "24" });''',
    '''  it("blocks generation when an on-screen character has no structured costume, even if the scene contains only an inline clothing note", async () => {
    dbMocks.getSceneById.mockResolvedValue({ id: 1, projectId: 99, orderIndex: 0, title: "Arrival", description: "Mara arrives.", characterIds: [11], wardrobe: [{ characterId: 11, wardrobeDescription: "temporary grey coat" }], duration: 8, aspectRatio: "16:9", frameRate: "24" });''',
)

print("Inline costume override compatibility applied.")
