from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def replace_once(path: str, old: str, new: str) -> None:
    target = ROOT / path
    text = target.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{path}: expected exactly one match, found {count}: {old[:140]!r}")
    target.write_text(text.replace(old, new, 1), encoding="utf-8")


replace_once(
    "server/routers.ts",
    '''        const derivedIdentityMode = input.identityMode === "auto" && item.faceCoverage === "full"
          ? "conceal_character_face"
          : input.identityMode;''',
    '''        // Full face coverage is absolute. A stale client or manual API call
        // cannot force the uncovered actor portrait back through a sealed mask.
        const derivedIdentityMode = item.faceCoverage === "full"
          ? "conceal_character_face"
          : input.identityMode;''',
)

replace_once(
    "server/_core/sceneGenerationContext.ts",
    '''    if (!selectedItem && !inlineOutfitChange) {
      missingCharacterWardrobe.push(`${character.name} (scene ${sceneOrder + 1})`);
    }''',
    '''    if (!selectedItem) {
      missingCharacterWardrobe.push(`${character.name} (scene ${sceneOrder + 1})`);
    }''',
)
replace_once(
    "server/_core/sceneGenerationContext.ts",
    '''    const suppressCharacterFaceReference = identityMode === "conceal_character_face" || (identityMode === "auto" && faceCoverage === "full");''',
    '''    const suppressCharacterFaceReference = faceCoverage === "full" || identityMode === "conceal_character_face";''',
)

replace_once(
    "server/_core/wardrobeContinuity.ts",
    '''    item.referencePrompt && `visual reference: ${item.referencePrompt.trim()}`,
    item.faceCoverage === "full" &&''',
    '''    item.referencePrompt && `visual reference: ${item.referencePrompt.trim()}`,
    "COVERAGE HARD-LOCK: every garment physically replaces and occludes the body region it covers. Gloves cover hands and fingers; hats, hoods and helmets cover the hair they enclose; clothing and armour cover the torso and limbs beneath them; masks and cowls cover the face area shown in the reference. Never render covered skin, hair or anatomy through the costume.",
    item.faceCoverage === "full" &&''',
)

replace_once(
    "server/_core/videoQualityGate.ts",
    '''      "When the contract requires FULL FACE COVERAGE or concealed character identity, any visible original actor face, facial skin, hairline, eyes or mouth is an automatic identity and wardrobe failure.",''',
    '''      "Costume coverage is literal occlusion: gloves must cover assigned hands, hats/hoods/helmets must cover enclosed hair, garments/armour must cover the assigned body regions, and masks must cover the specified face area. Covered anatomy showing through is an automatic wardrobe failure.",
      "When the contract requires FULL FACE COVERAGE or concealed character identity, any visible original actor face, facial skin, hairline, eyes or mouth is an automatic identity and wardrobe failure.",''',
)

replace_once(
    "client/src/pages/DesignerWardrobePage.tsx",
    '''  const [attachFromSceneOrder, setAttachFromSceneOrder] = useState<string>("");
  const [attachToSceneOrder, setAttachToSceneOrder] = useState<string>("until_changed");
  const [attachIdentityMode,''',
    '''  const [attachFromSceneOrder, setAttachFromSceneOrder] = useState<string>("");
  const [attachIdentityMode,''',
)
replace_once(
    "client/src/pages/DesignerWardrobePage.tsx",
    '''    setAttachFromSceneOrder("");
    setAttachToSceneOrder("until_changed");
    setAttachIdentityMode''',
    '''    setAttachFromSceneOrder("");
    setAttachIdentityMode''',
)
replace_once(
    "client/src/pages/DesignerWardrobePage.tsx",
    '''        fromSceneOrder: Number(attachFromSceneOrder),
        toSceneOrder: attachToSceneOrder === "until_changed" ? undefined : Number(attachToSceneOrder),
        identityMode: attachIdentityMode,''',
    '''        fromSceneOrder: Number(attachFromSceneOrder),
        toSceneOrder: undefined,
        identityMode: attachIdentityMode,''',
)

replace_once(
    "client/src/pages/DesignerWardrobePage.tsx",
    '''            {attachKind === "character" ? (
              <>
                <div className="grid grid-cols-2 gap-3">''',
    '''            {attachKind === "character" ? (
              <>
                <div>
                  <Label className="text-zinc-400">Character *</Label>
                  <Select value={attachCharId} onValueChange={setAttachCharId}>
                    <SelectTrigger className="bg-zinc-950 border-amber-500/20 mt-1">
                      <SelectValue placeholder="Pick a character" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 text-zinc-100 border-amber-500/20">
                      {(projectCharsQ.data ?? []).map((character: any) => (
                        <SelectItem key={character.id} value={String(character.id)}>{character.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">''',
)

replace_once(
    "client/src/pages/DesignerWardrobePage.tsx",
    '''                  <div>
                    <Label className="text-zinc-400">Costume ends</Label>
                    <Select value={attachToSceneOrder} onValueChange={setAttachToSceneOrder}>
                      <SelectTrigger className="bg-zinc-950 border-amber-500/20 mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-zinc-900 text-zinc-100 border-amber-500/20 max-h-72">
                        <SelectItem value="until_changed">Until another costume is assigned</SelectItem>
                        {sortedProjectScenes.filter((scene: any) => attachFromSceneOrder === "" || (scene.orderIndex ?? 0) >= Number(attachFromSceneOrder)).map((scene: any) => <SelectItem key={scene.id} value={String(scene.orderIndex ?? 0)}>End after scene {(scene.orderIndex ?? 0) + 1}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>''',
    '''                  <div>
                    <Label className="text-zinc-400">Continuity rule</Label>
                    <div className="mt-1 min-h-10 rounded-md border border-emerald-500/20 bg-emerald-950/15 px-3 py-2 text-xs text-emerald-200">
                      Continues automatically through every following scene until another costume is assigned to this character.
                    </div>
                  </div>''',
)

replace_once(
    "client/src/pages/DesignerWardrobePage.tsx",
    '''                      <SelectItem value="auto">Automatic from costume face coverage</SelectItem>
                      <SelectItem value="use_character_face">Use original character face</SelectItem>
                      <SelectItem value="conceal_character_face">Full costume — suppress original face</SelectItem>''',
    '''                      <SelectItem value="auto">Automatic from costume coverage</SelectItem>
                      <SelectItem value="conceal_character_face">Conceal original face</SelectItem>''',
)
replace_once(
    "client/src/pages/DesignerWardrobePage.tsx",
    '''                  </Select>
                </div>
                <div>
                  <Label className="text-zinc-400">Type</Label>''',
    '''                  </Select>
                  {attachItem?.faceCoverage === "full" ? (
                    <div className="mt-1 text-xs text-violet-300">Full-face costume detected: the actor portrait is automatically excluded while this costume is active.</div>
                  ) : null}
                </div>
                <div>
                  <Label className="text-zinc-400">Type</Label>''',
)

replace_once(
    "server/characterCostumeContinuity.test.ts",
    '''  it("suppresses the actor face reference for a full-face costume", async () => {''',
    '''  it("suppresses the actor face reference for a full-face costume even when a stale assignment requests the face", async () => {''',
)
replace_once(
    "server/characterCostumeContinuity.test.ts",
    '''identityMode: "conceal_character_face", placementNotes: null, locked: true''',
    '''identityMode: "use_character_face", placementNotes: null, locked: true''',
)
replace_once(
    "server/characterCostumeContinuity.test.ts",
    '''    expect(context.canonicalPrompt).toContain("zero exposed facial skin");''',
    '''    expect(context.canonicalPrompt).toContain("zero exposed facial skin");
    expect(context.canonicalPrompt).toContain("Gloves cover hands and fingers");''',
)

print("Final costume occlusion corrections applied.")
