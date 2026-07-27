from pathlib import Path

root = Path(__file__).resolve().parents[1]
page_path = root / "client/src/pages/DesignerWardrobePage.tsx"
text = page_path.read_text(encoding="utf-8")

anchor = '''const VISIBILITY_OPTIONS = [
  { value: "public",       label: "Public — listed in browse" },
  { value: "unlisted",     label: "Unlisted — link only" },
  { value: "project_only", label: "This project only" },
  { value: "private",      label: "Private — only me" },
];
'''
insert = anchor + '''
const GARMENT_FIT_OPTIONS = [
  { value: "skin_tight", label: "Skin-tight" },
  { value: "tight", label: "Tight fitted" },
  { value: "tailored", label: "Tailored / fitted" },
  { value: "perfect", label: "Perfect fit" },
  { value: "relaxed", label: "Relaxed fit" },
  { value: "loose", label: "Loose" },
  { value: "oversized", label: "Oversized" },
];

const GARMENT_SIZE_OPTIONS = [
  { value: "two_small", label: "Two sizes too small" },
  { value: "one_small", label: "One size too small" },
  { value: "correct", label: "Correct size" },
  { value: "one_large", label: "One size too large" },
  { value: "two_large", label: "Two sizes too large" },
];

const GARMENT_COMFORT_OPTIONS = [
  { value: "comfortable", label: "Comfortable / natural" },
  { value: "restrictive", label: "Restrictive movement" },
  { value: "uncomfortable", label: "Visibly uncomfortable" },
  { value: "stretched", label: "Fabric stretched / under strain" },
  { value: "sagging", label: "Sagging / hanging loosely" },
  { value: "short", label: "Sleeves or legs visibly too short" },
  { value: "long", label: "Sleeves or legs visibly too long" },
];

const NON_WEARABLE_WARDROBE_TYPES = new Set<WardrobeType>([
  "bag", "textile", "shopfront_display", "set_dressing",
]);

function humaniseFitValue(value: string): string {
  return value.replace(/_/g, " ");
}

function compileCharacterFitDirective(input: {
  itemName: string;
  characterName: string;
  fit: string;
  relativeSize: string;
  comfort: string;
  custom: string;
  notes: string;
}): string {
  const fitParts = [
    `MANDATORY CHARACTER FIT — ${input.characterName} wears ${input.itemName}`,
    `fit: ${humaniseFitValue(input.fit)}`,
    `relative size: ${humaniseFitValue(input.relativeSize)}`,
    `physical appearance and comfort: ${humaniseFitValue(input.comfort)}`,
    input.custom.trim() ? `director-specific fit direction: ${input.custom.trim()}` : "",
  ].filter(Boolean);
  const general = input.notes.trim();
  return `${fitParts.join("; ")}. Render these fit, sizing, fabric-tension and comfort cues visibly on this character in every applicable scene.${general ? ` Additional placement direction: ${general}` : ""}`;
}
'''
if anchor not in text:
    raise SystemExit("visibility anchor not found")
text = text.replace(anchor, insert, 1)

state_anchor = '''  const [attachNotes, setAttachNotes] = useState<string>("");
  const [attachFromSceneOrder, setAttachFromSceneOrder] = useState<string>("");
  const [attachIdentityMode, setAttachIdentityMode] = useState<"auto" | "use_character_face" | "conceal_character_face">("auto");
'''
state_insert = '''  const [attachNotes, setAttachNotes] = useState<string>("");
  const [attachFit, setAttachFit] = useState<string>("perfect");
  const [attachRelativeSize, setAttachRelativeSize] = useState<string>("correct");
  const [attachComfort, setAttachComfort] = useState<string>("comfortable");
  const [attachFitCustom, setAttachFitCustom] = useState<string>("");
  const [attachFromSceneOrder, setAttachFromSceneOrder] = useState<string>("");
  const [attachIdentityMode, setAttachIdentityMode] = useState<"auto" | "use_character_face" | "conceal_character_face">("auto");
'''
if state_anchor not in text:
    raise SystemExit("state anchor not found")
text = text.replace(state_anchor, state_insert, 1)

reset_anchor = '''    setAttachNotes("");
    setAttachFromSceneOrder("");
    setAttachIdentityMode(item.faceCoverage === "full" ? "conceal_character_face" : "auto");
'''
reset_insert = '''    setAttachNotes("");
    setAttachFit("perfect");
    setAttachRelativeSize("correct");
    setAttachComfort("comfortable");
    setAttachFitCustom("");
    setAttachFromSceneOrder("");
    setAttachIdentityMode(item.faceCoverage === "full" ? "conceal_character_face" : "auto");
'''
if reset_anchor not in text:
    raise SystemExit("reset anchor not found")
text = text.replace(reset_anchor, reset_insert, 1)

submit_anchor = '''      attachToCharacter.mutate({
        projectId: projectId!,
        characterId: Number(attachCharId),
        wardrobeItemId: attachItem.id,
        assignmentType: attachAssignType as any,
        usageMode: attachUsage as any,
        placementNotes: attachNotes.trim() || undefined,
'''
submit_insert = '''      const selectedCharacter = (projectCharsQ.data ?? []).find((character: any) => character.id === Number(attachCharId));
      const wearable = !NON_WEARABLE_WARDROBE_TYPES.has(attachItem.wardrobeType as WardrobeType);
      const placementNotes = wearable
        ? compileCharacterFitDirective({
            itemName: attachItem.name,
            characterName: selectedCharacter?.name ?? `Character #${attachCharId}`,
            fit: attachFit,
            relativeSize: attachRelativeSize,
            comfort: attachComfort,
            custom: attachFitCustom,
            notes: attachNotes,
          })
        : attachNotes.trim() || undefined;
      attachToCharacter.mutate({
        projectId: projectId!,
        characterId: Number(attachCharId),
        wardrobeItemId: attachItem.id,
        assignmentType: attachAssignType as any,
        usageMode: attachUsage as any,
        placementNotes,
'''
if submit_anchor not in text:
    raise SystemExit("submit anchor not found")
text = text.replace(submit_anchor, submit_insert, 1)

ui_anchor = '''                <div>
                  <Label className="text-zinc-400">Type</Label>
                  <Select value={attachAssignType} onValueChange={setAttachAssignType}>
'''
ui_insert = '''                {!NON_WEARABLE_WARDROBE_TYPES.has(attachItem?.wardrobeType as WardrobeType) ? (
                  <div className="rounded-lg border border-amber-500/20 bg-amber-950/10 p-3 space-y-3">
                    <div>
                      <div className="text-sm font-medium text-amber-200">Character fit and sizing</div>
                      <div className="text-xs text-zinc-500 mt-1">These controls become mandatory visual instructions for this character and continue through following scenes until the outfit changes.</div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <Label className="text-zinc-400">Fit</Label>
                        <Select value={attachFit} onValueChange={setAttachFit}>
                          <SelectTrigger className="bg-zinc-950 border-amber-500/20 mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-zinc-900 text-zinc-100 border-amber-500/20">
                            {GARMENT_FIT_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-zinc-400">Size on character</Label>
                        <Select value={attachRelativeSize} onValueChange={setAttachRelativeSize}>
                          <SelectTrigger className="bg-zinc-950 border-amber-500/20 mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-zinc-900 text-zinc-100 border-amber-500/20">
                            {GARMENT_SIZE_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-zinc-400">Comfort / visible effect</Label>
                        <Select value={attachComfort} onValueChange={setAttachComfort}>
                          <SelectTrigger className="bg-zinc-950 border-amber-500/20 mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-zinc-900 text-zinc-100 border-amber-500/20">
                            {GARMENT_COMFORT_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label className="text-zinc-400">Precise fit direction</Label>
                      <Textarea
                        value={attachFitCustom}
                        onChange={(event) => setAttachFitCustom(event.target.value)}
                        placeholder="e.g. black suit pulled tight across the shoulders and waist; collar pinches; actor looks physically uncomfortable"
                        className="bg-zinc-950 border-amber-500/20 mt-1 min-h-[64px]"
                        maxLength={600}
                      />
                    </div>
                    <div className="rounded border border-emerald-500/20 bg-emerald-950/15 px-3 py-2 text-xs text-emerald-200">
                      Render preview: {attachItem?.name} on {(projectCharsQ.data ?? []).find((character: any) => character.id === Number(attachCharId))?.name ?? "the selected character"} — {humaniseFitValue(attachFit)}, {humaniseFitValue(attachRelativeSize)}, {humaniseFitValue(attachComfort)}.
                    </div>
                  </div>
                ) : (
                  <div className="rounded border border-zinc-700 bg-zinc-950/60 px-3 py-2 text-xs text-zinc-400">This item is treated as a carried or scene object, so clothing fit and size controls do not apply. Use placement notes for how the character carries or uses it.</div>
                )}
                <div>
                  <Label className="text-zinc-400">Type</Label>
                  <Select value={attachAssignType} onValueChange={setAttachAssignType}>
'''
if ui_anchor not in text:
    raise SystemExit("UI anchor not found")
text = text.replace(ui_anchor, ui_insert, 1)

notes_anchor = '''              <Label className="text-zinc-400">Placement notes</Label>
'''
notes_insert = '''              <Label className="text-zinc-400">{attachKind === "character" ? "Additional placement notes" : "Placement notes"}</Label>
'''
if notes_anchor not in text:
    raise SystemExit("notes label anchor not found")
text = text.replace(notes_anchor, notes_insert, 1)

page_path.write_text(text, encoding="utf-8")

# Extend the executable product-boundary test so this UI contract cannot regress.
test_path = root / "server/adult-studio-boundary.test.ts"
test = test_path.read_text(encoding="utf-8")
test_anchor = '''  it("installs the supplied Adult Studio logo as the portal button", () => {
'''
new_test = '''  it("persists character-specific wardrobe fit instructions into generation notes", () => {
    const wardrobe = source("client/src/pages/DesignerWardrobePage.tsx");
    expect(wardrobe).toContain("Character fit and sizing");
    expect(wardrobe).toContain("MANDATORY CHARACTER FIT");
    expect(wardrobe).toContain("two_small");
    expect(wardrobe).toContain("visibly uncomfortable");
    expect(wardrobe).toContain("placementNotes");
    const context = source("server/_core/sceneGenerationContext.ts");
    expect(context).toContain("buildWardrobePromptAnchor(selectedItem, selectedRow.assignment.placementNotes)");
  });

''' + test_anchor
if test_anchor not in test:
    raise SystemExit("test anchor not found")
test = test.replace(test_anchor, new_test, 1)
test_path.write_text(test, encoding="utf-8")
