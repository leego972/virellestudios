from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def replace_once(path: str, old: str, new: str) -> None:
    target = ROOT / path
    text = target.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{path}: expected one match, found {count}: {old[:160]!r}")
    target.write_text(text.replace(old, new, 1), encoding="utf-8")


# Do not require a special costume for every character. When a costume is
# assigned, it is still hard-locked and carried forward until replacement.
replace_once(
    "server/_core/sceneGenerationContext.ts",
    '''  const characterDescriptions: string[] = [];
  const missingCharacterWardrobe: string[] = [];
''',
    '''  const characterDescriptions: string[] = [];
''',
)
replace_once(
    "server/_core/sceneGenerationContext.ts",
    '''    if (!selectedItem) {
      missingCharacterWardrobe.push(`${character.name} (scene ${sceneOrder + 1})`);
    }
''',
    '''''',
)
replace_once(
    "server/_core/sceneGenerationContext.ts",
    '''  if (missingCharacterWardrobe.length) {
    throw new Error(`Wardrobe assignment required before generation. Assign a costume to every on-screen character in Project Wardrobe. Missing: ${missingCharacterWardrobe.join(", ")}.`);
  }

''',
    '''''',
)

# Present unassigned characters as valid default-wardrobe usage, not errors.
replace_once(
    "client/src/pages/DesignerWardrobePage.tsx",
    '''              <Card className={`mb-4 border ${continuityGaps.length ? "border-rose-500/40 bg-rose-950/15" : "border-emerald-500/30 bg-emerald-950/10"}`}>''',
    '''              <Card className={`mb-4 border ${continuityGaps.length ? "border-amber-500/30 bg-amber-950/10" : "border-emerald-500/30 bg-emerald-950/10"}`}>''',
)
replace_once(
    "client/src/pages/DesignerWardrobePage.tsx",
    '''                      <div className="font-medium">Character costume continuity</div>
                      <div className="text-xs text-zinc-400 mt-1">Every on-screen character must have one assigned wardrobe or costume. It continues automatically until a replacement begins.</div>''',
    '''                      <div className="font-medium">Assigned costume continuity</div>
                      <div className="text-xs text-zinc-400 mt-1">Assigned looks continue automatically until a replacement begins. Characters without a special assignment use their saved or neutral default wardrobe.</div>''',
)
replace_once(
    "client/src/pages/DesignerWardrobePage.tsx",
    '''                    <Badge className={continuityGaps.length ? "bg-rose-500/15 text-rose-300" : "bg-emerald-500/15 text-emerald-300"}>
                      {continuityGaps.length ? `${continuityGaps.length} missing` : "Ready"}''',
    '''                    <Badge className={continuityGaps.length ? "bg-amber-500/15 text-amber-300" : "bg-emerald-500/15 text-emerald-300"}>
                      {continuityGaps.length ? `${continuityGaps.length} using default` : "All assigned"}''',
)
replace_once(
    "client/src/pages/DesignerWardrobePage.tsx",
    '''return <div key={`${scene.id}-${characterId}`} className="rounded border border-rose-500/20 bg-black/20 px-3 py-2 text-xs">Scene {(scene.orderIndex ?? 0) + 1}: <span className="text-rose-300">{character?.name ?? `Character #${characterId}`} needs a costume</span></div>;''',
    '''return <div key={`${scene.id}-${characterId}`} className="rounded border border-amber-500/20 bg-black/20 px-3 py-2 text-xs">Scene {(scene.orderIndex ?? 0) + 1}: <span className="text-amber-300">{character?.name ?? `Character #${characterId}`} uses saved/default wardrobe</span></div>;''',
)

# Regression coverage for both valid default wardrobe and full-face suppression.
replace_once(
    "server/characterCostumeContinuity.test.ts",
    '''describe("mandatory character costume continuity", () => {''',
    '''describe("character costume continuity", () => {''',
)
replace_once(
    "server/characterCostumeContinuity.test.ts",
    '''  it("blocks generation when an on-screen character has no assigned costume", async () => {
    dbMocks.getSceneById.mockResolvedValue({ id: 1, projectId: 99, orderIndex: 0, title: "Arrival", description: "Mara arrives.", characterIds: [11], wardrobe: [], duration: 8, aspectRatio: "16:9", frameRate: "24" });
    dbMocks.getProjectCharacters.mockResolvedValue([{ id: 11, userId: 7, projectId: 99, name: "Mara", photoUrl: "https://assets.test/mara.jpg", attributes: {} }]);
    mockDatabase([]);
    await expect(loadSceneGenerationContext(1, 99)).rejects.toThrow(/Wardrobe assignment required/);
  });''',
    '''  it("keeps generation available when no special costume is assigned", async () => {
    dbMocks.getSceneById.mockResolvedValue({ id: 1, projectId: 99, orderIndex: 0, title: "Arrival", description: "Mara arrives.", characterIds: [11], wardrobe: [], duration: 8, aspectRatio: "16:9", frameRate: "24" });
    dbMocks.getProjectCharacters.mockResolvedValue([{ id: 11, userId: 7, projectId: 99, name: "Mara", photoUrl: "https://assets.test/mara.jpg", wardrobe: { signature: "navy field jacket" }, attributes: {} }]);
    mockDatabase([]);
    const context = await loadSceneGenerationContext(1, 99);
    expect(context.wardrobeBindings[0].wardrobeItemId).toBeUndefined();
    expect(context.referenceImages).toContain("https://assets.test/mara.jpg");
    expect(context.canonicalPrompt).toContain("navy field jacket");
  });''',
)

print("Assigned costume continuity focused without mandatory wardrobe blocking.")
