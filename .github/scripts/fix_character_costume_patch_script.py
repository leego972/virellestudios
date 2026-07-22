from pathlib import Path

root = Path(__file__).resolve().parents[2]
patch = root / ".github/scripts/apply_character_costume_continuity.py"
text = patch.read_text(encoding="utf-8")
old = '''replace_once(
    "client/src/pages/DesignerWardrobePage.tsx",
    '        placementNotes: attachNotes.trim() || undefined,\\n        promptWeight: 60,\\n      });',
    '        placementNotes: attachNotes.trim() || undefined,\\n        promptWeight: 100,\\n        fromSceneOrder: Number(attachFromSceneOrder),\\n        toSceneOrder: attachToSceneOrder === "until_changed" ? undefined : Number(attachToSceneOrder),\\n        identityMode: attachIdentityMode,\\n      });',
)
'''
new = '''replace_once(
    "client/src/pages/DesignerWardrobePage.tsx",
    '        characterId: Number(attachCharId),\\n        wardrobeItemId: attachItem.id,\\n        assignmentType: attachAssignType as any,\\n        usageMode: attachUsage as any,\\n        placementNotes: attachNotes.trim() || undefined,\\n        promptWeight: 60,\\n      });',
    '        characterId: Number(attachCharId),\\n        wardrobeItemId: attachItem.id,\\n        assignmentType: attachAssignType as any,\\n        usageMode: attachUsage as any,\\n        placementNotes: attachNotes.trim() || undefined,\\n        promptWeight: 100,\\n        fromSceneOrder: Number(attachFromSceneOrder),\\n        toSceneOrder: attachToSceneOrder === "until_changed" ? undefined : Number(attachToSceneOrder),\\n        identityMode: attachIdentityMode,\\n      });',
)
'''
if text.count(old) != 1:
    raise RuntimeError(f"Expected one ambiguous replacement block, found {text.count(old)}")
text = text.replace(old, new, 1)
text = text.replace(
    '    ROOT / ".github/workflows/character-costume-continuity-patch.yml",\n',
    '    ROOT / ".github/workflows/character-costume-continuity-patch.yml",\n    ROOT / ".github/scripts/fix_character_costume_patch_script.py",\n    ROOT / ".github/character-costume-patch-error.txt",\n',
    1,
)
patch.write_text(text, encoding="utf-8")
Path(__file__).unlink()
print("Patch script target corrected.")
