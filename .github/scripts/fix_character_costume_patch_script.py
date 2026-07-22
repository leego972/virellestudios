from pathlib import Path

root = Path(__file__).resolve().parents[2]
patch = root / ".github/scripts/apply_character_costume_continuity.py"
text = patch.read_text(encoding="utf-8")

old_assignment = """replace_once(
    \"client/src/pages/DesignerWardrobePage.tsx\",
    '        placementNotes: attachNotes.trim() || undefined,\\n        promptWeight: 60,\\n      });',
    '        placementNotes: attachNotes.trim() || undefined,\\n        promptWeight: 100,\\n        fromSceneOrder: Number(attachFromSceneOrder),\\n        toSceneOrder: attachToSceneOrder === \"until_changed\" ? undefined : Number(attachToSceneOrder),\\n        identityMode: attachIdentityMode,\\n      });',
)
"""
new_assignment = """replace_once(
    \"client/src/pages/DesignerWardrobePage.tsx\",
    '        characterId: Number(attachCharId),\\n        wardrobeItemId: attachItem.id,\\n        assignmentType: attachAssignType as any,\\n        usageMode: attachUsage as any,\\n        placementNotes: attachNotes.trim() || undefined,\\n        promptWeight: 60,\\n      });',
    '        characterId: Number(attachCharId),\\n        wardrobeItemId: attachItem.id,\\n        assignmentType: attachAssignType as any,\\n        usageMode: attachUsage as any,\\n        placementNotes: attachNotes.trim() || undefined,\\n        promptWeight: 100,\\n        fromSceneOrder: Number(attachFromSceneOrder),\\n        toSceneOrder: attachToSceneOrder === \"until_changed\" ? undefined : Number(attachToSceneOrder),\\n        identityMode: attachIdentityMode,\\n      });',
)
"""
if text.count(old_assignment) != 1:
    raise RuntimeError(f"Expected one ambiguous assignment replacement block, found {text.count(old_assignment)}")
text = text.replace(old_assignment, new_assignment, 1)

old_controls = """# Character attach controls for scene range and identity mode.
replace_once(
    \"client/src/pages/DesignerWardrobePage.tsx\",
    '''                <div>\\n                  <Label className=\"text-zinc-400\">Type</Label>\\n                  <Select value={attachAssignType} onValueChange={setAttachAssignType}>''',
"""
new_controls = """# Character attach controls for scene range and identity mode.
replace_once(
    \"client/src/pages/DesignerWardrobePage.tsx\",
    '''                <div>\\n                  <Label className=\"text-zinc-400\">Character</Label>\\n                  <Select value={attachCharId} onValueChange={setAttachCharId}>\\n                    <SelectTrigger className=\"bg-zinc-950 border-amber-500/20 mt-1\">\\n                      <SelectValue placeholder=\"Pick a character\" />\\n                    </SelectTrigger>\\n                    <SelectContent className=\"bg-zinc-900 text-zinc-100 border-amber-500/20\">\\n                      {(projectCharsQ.data ?? []).map((c: any) => (\\n                        <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>\\n                      ))}\\n                    </SelectContent>\\n                  </Select>\\n                </div>\\n                <div>\\n                  <Label className=\"text-zinc-400\">Type</Label>\\n                  <Select value={attachAssignType} onValueChange={setAttachAssignType}>''',
"""
if text.count(old_controls) != 1:
    raise RuntimeError(f"Expected one character-control replacement header, found {text.count(old_controls)}")
text = text.replace(old_controls, new_controls, 1)

text = text.replace(
    '    ROOT / ".github/workflows/character-costume-continuity-patch.yml",\n',
    '    ROOT / ".github/workflows/character-costume-continuity-patch.yml",\n    ROOT / ".github/scripts/fix_character_costume_patch_script.py",\n    ROOT / ".github/character-costume-patch-error.txt",\n',
    1,
)
patch.write_text(text, encoding="utf-8")
Path(__file__).unlink()
print("Patch script targets corrected.")
