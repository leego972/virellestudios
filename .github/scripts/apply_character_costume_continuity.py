from __future__ import annotations

from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def write(path: str, content: str) -> None:
    (ROOT / path).write_text(content, encoding="utf-8")


def replace_once(path: str, old: str, new: str) -> None:
    content = read(path)
    count = content.count(old)
    if count != 1:
        raise RuntimeError(f"{path}: expected exactly one match, found {count}: {old[:120]!r}")
    write(path, content.replace(old, new, 1))


def regex_once(path: str, pattern: str, replacement: str, flags: int = 0) -> None:
    content = read(path)
    updated, count = re.subn(pattern, replacement, content, count=1, flags=flags)
    if count != 1:
        raise RuntimeError(f"{path}: expected exactly one regex match, found {count}: {pattern[:120]!r}")
    write(path, updated)


# ─── Database schema and startup migration ──────────────────────────────────
replace_once(
    "drizzle/schema.ts",
    '  referencePrompt: text("referencePrompt"),\n  brandPlacementAllowed:',
    '  referencePrompt: text("referencePrompt"),\n  // none | partial | full. Full coverage suppresses the actor face reference while assigned.\n  faceCoverage: varchar("faceCoverage", { length: 16 }).default("none").notNull(),\n  brandPlacementAllowed:',
)
replace_once(
    "drizzle/schema.ts",
    '  toSceneOrder: int("toSceneOrder"),      // NULL = open-ended\n  // reference | must_match',
    '  toSceneOrder: int("toSceneOrder"),      // NULL = open-ended\n  // auto | use_character_face | conceal_character_face\n  identityMode: varchar("identityMode", { length: 32 }).default("auto").notNull(),\n  // reference | must_match',
)

replace_once(
    "server/_core/autoMigrate.ts",
    '          referencePrompt TEXT NULL,\n          brandPlacementAllowed BOOLEAN NOT NULL DEFAULT FALSE,',
    '          referencePrompt TEXT NULL,\n          faceCoverage VARCHAR(16) NOT NULL DEFAULT \'none\',\n          brandPlacementAllowed BOOLEAN NOT NULL DEFAULT FALSE,',
)
replace_once(
    "server/_core/autoMigrate.ts",
    '          sceneId INT NULL,\n          usageMode VARCHAR(64) NOT NULL DEFAULT \'reference\',',
    '          sceneId INT NULL,\n          fromSceneOrder INT NULL,\n          toSceneOrder INT NULL,\n          identityMode VARCHAR(32) NOT NULL DEFAULT \'auto\',\n          usageMode VARCHAR(64) NOT NULL DEFAULT \'reference\',',
)
replace_once(
    "server/_core/autoMigrate.ts",
    '  const missingColumns: ColumnCheck[] = [\n',
    '  const missingColumns: ColumnCheck[] = [\n    // Character/costume continuity contract\n    { table: "wardrobeItems", column: "faceCoverage", definition: "VARCHAR(16) NOT NULL DEFAULT \'none\'" },\n    { table: "wardrobeAssignments", column: "fromSceneOrder", definition: "INT NULL" },\n    { table: "wardrobeAssignments", column: "toSceneOrder", definition: "INT NULL" },\n    { table: "wardrobeAssignments", column: "identityMode", definition: "VARCHAR(32) NOT NULL DEFAULT \'auto\'" },\n',
)

migration = ROOT / "drizzle/0036_character_costume_continuity.sql"
migration.write_text(
    """-- 0036 — Mandatory per-character costume continuity and face-covering identity rules\nALTER TABLE wardrobeItems\n  ADD COLUMN faceCoverage VARCHAR(16) NOT NULL DEFAULT 'none' AFTER referencePrompt;\n\nALTER TABLE wardrobeAssignments\n  ADD COLUMN identityMode VARCHAR(32) NOT NULL DEFAULT 'auto' AFTER toSceneOrder;\n""",
    encoding="utf-8",
)

# ─── DB helper for closing/opening costume ranges ───────────────────────────
replace_once(
    "server/db.ts",
    '''export async function createWardrobeAssignment(data: InsertWardrobeAssignment): Promise<WardrobeAssignment> {\n  const db = await getDb();\n  if (!db) throw new Error("Database not available");\n  const result = await db.insert(wardrobeAssignments).values(data);\n  const id = (result as any)[0]?.insertId ?? (data as any).id;\n  return (await db.select().from(wardrobeAssignments).where(eq(wardrobeAssignments.id, id)))[0];\n}\n''',
    '''export async function createWardrobeAssignment(data: InsertWardrobeAssignment): Promise<WardrobeAssignment> {\n  const db = await getDb();\n  if (!db) throw new Error("Database not available");\n  const result = await db.insert(wardrobeAssignments).values(data);\n  const id = (result as any)[0]?.insertId ?? (data as any).id;\n  return (await db.select().from(wardrobeAssignments).where(eq(wardrobeAssignments.id, id)))[0];\n}\n\nexport async function updateWardrobeAssignment(\n  id: number,\n  data: Partial<InsertWardrobeAssignment>,\n): Promise<WardrobeAssignment | undefined> {\n  const db = await getDb();\n  if (!db) return undefined;\n  await db.update(wardrobeAssignments).set(data).where(eq(wardrobeAssignments.id, id));\n  return (await db.select().from(wardrobeAssignments).where(eq(wardrobeAssignments.id, id)))[0];\n}\n''',
)

# ─── Wardrobe item and assignment APIs ──────────────────────────────────────
replace_once(
    "server/routers.ts",
    '        referencePrompt: z.string().max(2000).optional(),\n        brandPlacementAllowed:',
    '        referencePrompt: z.string().max(2000).optional(),\n        faceCoverage: z.enum(["none", "partial", "full"]).default("none"),\n        brandPlacementAllowed:',
)
replace_once(
    "server/routers.ts",
    '          referencePrompt: input.referencePrompt?.trim() || null,\n          brandPlacementAllowed:',
    '          referencePrompt: input.referencePrompt?.trim() || null,\n          faceCoverage: input.faceCoverage,\n          brandPlacementAllowed:',
)
replace_once(
    "server/routers.ts",
    '        referencePrompt: z.string().max(2000).nullish(),\n        visibility:',
    '        referencePrompt: z.string().max(2000).nullish(),\n        faceCoverage: z.enum(["none", "partial", "full"]).optional(),\n        visibility:',
)
replace_once(
    "server/routers.ts",
    '          "name", "description", "primaryImageUrl", "referencePrompt",\n          "visibility", "status", "licenseNotes",',
    '          "name", "description", "primaryImageUrl", "referencePrompt", "faceCoverage",\n          "visibility", "status", "licenseNotes",',
)

old_attach = '''        placementNotes: z.string().max(2000).optional(),\n        promptWeight: z.number().int().min(0).max(100).default(50),\n      }))\n      .mutation(async ({ ctx, input }) => {\n        await assertCanAccessProject(input.projectId, ctx.user.id);\n        const item = await db.getWardrobeItemById(input.wardrobeItemId);'''
new_attach = '''        placementNotes: z.string().max(2000).optional(),\n        promptWeight: z.number().int().min(0).max(100).default(100),\n        fromSceneOrder: z.number().int().min(0),\n        toSceneOrder: z.number().int().min(0).optional(),\n        identityMode: z.enum(["auto", "use_character_face", "conceal_character_face"]).default("auto"),\n      }).superRefine((value, ctx) => {\n        if (value.toSceneOrder !== undefined && value.toSceneOrder < value.fromSceneOrder) {\n          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["toSceneOrder"], message: "End scene must be after the start scene." });\n        }\n      }))\n      .mutation(async ({ ctx, input }) => {\n        await assertCanAccessProject(input.projectId, ctx.user.id);\n        const item = await db.getWardrobeItemById(input.wardrobeItemId);'''
replace_once("server/routers.ts", old_attach, new_attach)

replace_once(
    "server/routers.ts",
    '''        const character = await db.getCharacterById(input.characterId);\n        if (!character) throw new TRPCError({ code: "NOT_FOUND", message: "Character not found" });\n        return db.createWardrobeAssignment({\n          userId: ctx.user.id,\n          projectId: input.projectId,\n          wardrobeItemId: input.wardrobeItemId,\n          assignmentType: input.assignmentType,\n          characterId: input.characterId,\n          sceneId: null,\n          usageMode: input.usageMode,\n          placementNotes: input.placementNotes?.trim() || null,\n          promptWeight: input.promptWeight,\n          locked: false,\n        } as any);''',
    '''        const character = await db.getCharacterById(input.characterId);\n        if (!character || character.projectId !== input.projectId) {\n          throw new TRPCError({ code: "NOT_FOUND", message: "Character not found in this project" });\n        }\n\n        // A new costume begins at the selected scene and automatically closes the\n        // previous look. It remains active until the next assigned costume.\n        const timeline = (await db.getWardrobeAssignmentsByCharacter(input.characterId))\n          .filter((assignment) => assignment.projectId === input.projectId && assignment.characterId === input.characterId);\n        for (const assignment of timeline) {\n          const start = assignment.fromSceneOrder ?? 0;\n          const end = assignment.toSceneOrder ?? Number.MAX_SAFE_INTEGER;\n          if (start === input.fromSceneOrder) {\n            await db.deleteWardrobeAssignment(assignment.id);\n          } else if (start < input.fromSceneOrder && end >= input.fromSceneOrder) {\n            await db.updateWardrobeAssignment(assignment.id, { toSceneOrder: input.fromSceneOrder - 1 } as any);\n          }\n        }\n        const nextStart = timeline\n          .map((assignment) => assignment.fromSceneOrder ?? 0)\n          .filter((start) => start > input.fromSceneOrder)\n          .sort((a, b) => a - b)[0];\n        const requestedEnd = input.toSceneOrder ?? Number.MAX_SAFE_INTEGER;\n        const effectiveEnd = nextStart === undefined ? requestedEnd : Math.min(requestedEnd, nextStart - 1);\n        const derivedIdentityMode = input.identityMode === "auto" && item.faceCoverage === "full"\n          ? "conceal_character_face"\n          : input.identityMode;\n\n        return db.createWardrobeAssignment({\n          userId: ctx.user.id,\n          projectId: input.projectId,\n          wardrobeItemId: input.wardrobeItemId,\n          assignmentType: input.assignmentType,\n          characterId: input.characterId,\n          sceneId: null,\n          fromSceneOrder: input.fromSceneOrder,\n          toSceneOrder: Number.isFinite(effectiveEnd) ? effectiveEnd : null,\n          identityMode: derivedIdentityMode,\n          usageMode: input.usageMode,\n          placementNotes: input.placementNotes?.trim() || null,\n          promptWeight: input.promptWeight,\n          locked: true,\n        } as any);''',
)

# ─── Wardrobe prompt metadata ───────────────────────────────────────────────
replace_once(
    "server/_core/wardrobeContinuity.ts",
    '  referencePrompt?: string | null;\n  colors?: unknown;',
    '  referencePrompt?: string | null;\n  faceCoverage?: string | null;\n  colors?: unknown;',
)
replace_once(
    "server/_core/wardrobeContinuity.ts",
    '    item.referencePrompt && `visual reference: ${item.referencePrompt.trim()}`,\n    item.primaryImageUrl &&',
    '    item.referencePrompt && `visual reference: ${item.referencePrompt.trim()}`,\n    item.faceCoverage === "full" && "FULL FACE COVERAGE: the costume mask/cowl/helmet completely replaces the visible actor face; no facial skin, hairline, eyes, mouth or uncovered identity may appear",\n    item.faceCoverage === "partial" && "PARTIAL FACE COVERAGE: preserve the exact mask/helmet coverage shown in the costume reference",\n    item.primaryImageUrl &&',
)

# ─── Authoritative scene contract ───────────────────────────────────────────
replace_once(
    "server/_core/sceneGenerationContext.ts",
    '  wardrobeReferenceImageUrl?: string;\n  explicitChange: boolean;',
    '  wardrobeReferenceImageUrl?: string;\n  faceCoverage: "none" | "partial" | "full";\n  identityMode: "auto" | "use_character_face" | "conceal_character_face";\n  suppressCharacterFaceReference: boolean;\n  explicitChange: boolean;',
)
replace_once(
    "server/_core/sceneGenerationContext.ts",
    '  const canonicalCharacters: CanonicalSceneCharacter[] = [];\n  const characterDescriptions: string[] = [];',
    '  const canonicalCharacters: CanonicalSceneCharacter[] = [];\n  const characterDescriptions: string[] = [];\n  const missingCharacterWardrobe: string[] = [];',
)
replace_once(
    "server/_core/sceneGenerationContext.ts",
    '''    const selectedItem = selectedRow?.item as WardrobeItemRecord | undefined;\n    let wardrobeAnchor: string | undefined;\n    let wardrobeReferenceImageUrl: string | undefined;''',
    '''    const selectedItem = selectedRow?.item as WardrobeItemRecord | undefined;\n    if (!selectedItem && !inlineOutfitChange) {\n      missingCharacterWardrobe.push(`${character.name} (scene ${sceneOrder + 1})`);\n    }\n    let wardrobeAnchor: string | undefined;\n    let wardrobeReferenceImageUrl: string | undefined;''',
)
replace_once(
    "server/_core/sceneGenerationContext.ts",
    '''    const identityImageUrl = characterImage(character);\n    const explicitChange = inlineOutfitChange || Boolean(selectedRow && (selectedRow.assignment.fromSceneOrder ?? 0) === sceneOrder);\n    wardrobeBindings.push({\n      characterId: character.id,\n      characterName: character.name,\n      wardrobeItemId: selectedItem?.id,\n      assignmentId: selectedRow?.assignment?.id,\n      promptAnchor: wardrobeAnchor,\n      characterReferenceImageUrl: identityImageUrl,\n      wardrobeReferenceImageUrl,\n      explicitChange,\n      carriedForward: selected.carriedForward,\n    });\n\n    const dna = buildCharacterDNA(character, wardrobeAnchor ? { wardrobeDescription: wardrobeAnchor } : undefined);\n    characterDescriptions.push(dna.promptAnchor);\n    canonicalCharacters.push({\n      id: character.id,\n      name: character.name,\n      visualAnchor: dna.promptAnchor,\n      wardrobe: character.clothing || undefined,\n      wardrobeAnchor,\n      blocking: (scene as any).characterBlocking || undefined,\n      referenceImageUrl: identityImageUrl,\n      wardrobeReferenceImageUrl,\n    });''',
    '''    const faceCoverage = (selectedItem?.faceCoverage === "full" || selectedItem?.faceCoverage === "partial")\n      ? selectedItem.faceCoverage\n      : "none";\n    const identityMode = (selectedRow?.assignment?.identityMode || "auto") as "auto" | "use_character_face" | "conceal_character_face";\n    const suppressCharacterFaceReference = identityMode === "conceal_character_face" || (identityMode === "auto" && faceCoverage === "full");\n    const identityImageUrl = suppressCharacterFaceReference ? undefined : characterImage(character);\n    const explicitChange = inlineOutfitChange || Boolean(selectedRow && (selectedRow.assignment.fromSceneOrder ?? 0) === sceneOrder);\n    wardrobeBindings.push({\n      characterId: character.id,\n      characterName: character.name,\n      wardrobeItemId: selectedItem?.id,\n      assignmentId: selectedRow?.assignment?.id,\n      promptAnchor: wardrobeAnchor,\n      characterReferenceImageUrl: identityImageUrl,\n      wardrobeReferenceImageUrl,\n      faceCoverage,\n      identityMode,\n      suppressCharacterFaceReference,\n      explicitChange,\n      carriedForward: selected.carriedForward,\n    });\n\n    const dna = buildCharacterDNA(character, wardrobeAnchor ? { wardrobeDescription: wardrobeAnchor } : undefined);\n    const visualAnchor = suppressCharacterFaceReference\n      ? `[CHARACTER ${character.name}: FULL-COSTUME IDENTITY HARD-LOCK — the assigned costume is the visible identity. The original actor face and face portrait are intentionally suppressed. Render the exact full mask/cowl/helmet from the costume reference with zero exposed facial skin, hairline, eyes, mouth or recognisable uncovered face. Preserve body build and movement continuity: ${dna.attributes.age}, ${dna.attributes.build}${dna.attributes.height ? `, ${dna.attributes.height}` : ""}. ${wardrobeAnchor || "Maintain the assigned full-face costume exactly."}]`\n      : dna.promptAnchor;\n    characterDescriptions.push(visualAnchor);\n    canonicalCharacters.push({\n      id: character.id,\n      name: character.name,\n      visualAnchor,\n      wardrobe: character.clothing || undefined,\n      wardrobeAnchor,\n      blocking: (scene as any).characterBlocking || undefined,\n      referenceImageUrl: identityImageUrl,\n      wardrobeReferenceImageUrl,\n    });''',
)
replace_once(
    "server/_core/sceneGenerationContext.ts",
    '  for (const row of applicableRows.filter((entry) => !entry.assignment?.characterId)) {',
    '  if (missingCharacterWardrobe.length) {\n    throw new Error(`Wardrobe assignment required before generation. Assign a costume to every on-screen character in Project Wardrobe. Missing: ${missingCharacterWardrobe.join(", ")}.`);\n  }\n\n  for (const row of applicableRows.filter((entry) => !entry.assignment?.characterId)) {',
)

# ─── Quality review explicitly rejects exposed faces under full masks ───────
replace_once(
    "server/_core/videoQualityGate.ts",
    '      "A garment appearing on the wrong character is an automatic wardrobe failure. Any unexplained clothing change between generated frames or from the continuity frame is an automatic continuity failure.",',
    '      "A garment appearing on the wrong character is an automatic wardrobe failure. Any unexplained clothing change between generated frames or from the continuity frame is an automatic continuity failure.",\n      "When the contract requires FULL FACE COVERAGE or concealed character identity, any visible original actor face, facial skin, hairline, eyes or mouth is an automatic identity and wardrobe failure.",',
)

# ─── Project wardrobe UI: face coverage + scene-range assignment ────────────
replace_once(
    "client/src/pages/DesignerWardrobePage.tsx",
    '  referencePrompt: string;\n  characterWardrobeAllowed:',
    '  referencePrompt: string;\n  faceCoverage: "none" | "partial" | "full";\n  characterWardrobeAllowed:',
)
replace_once(
    "client/src/pages/DesignerWardrobePage.tsx",
    '  primaryImageUrl: "", referencePrompt: "",\n  characterWardrobeAllowed:',
    '  primaryImageUrl: "", referencePrompt: "", faceCoverage: "none",\n  characterWardrobeAllowed:',
)
replace_once(
    "client/src/pages/DesignerWardrobePage.tsx",
    '  const [attachNotes, setAttachNotes] = useState<string>("");',
    '  const [attachNotes, setAttachNotes] = useState<string>("");\n  const [attachFromSceneOrder, setAttachFromSceneOrder] = useState<string>("");\n  const [attachToSceneOrder, setAttachToSceneOrder] = useState<string>("until_changed");\n  const [attachIdentityMode, setAttachIdentityMode] = useState<"auto" | "use_character_face" | "conceal_character_face">("auto");',
)
replace_once(
    "client/src/pages/DesignerWardrobePage.tsx",
    '  const profile = profileQ.data ?? null;\n',
    '''  const profile = profileQ.data ?? null;\n  const sortedProjectScenes = useMemo(\n    () => [...(projectScenesQ.data ?? [])].sort((a: any, b: any) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)),\n    [projectScenesQ.data],\n  );\n  const activeAssignmentFor = (characterId: number, sceneOrder: number) =>\n    (projectAssignmentsQ.data ?? [])\n      .filter((assignment: any) => assignment.characterId === characterId)\n      .filter((assignment: any) => (assignment.fromSceneOrder ?? 0) <= sceneOrder && (assignment.toSceneOrder ?? Number.MAX_SAFE_INTEGER) >= sceneOrder)\n      .sort((a: any, b: any) => Number(Boolean(b.locked)) - Number(Boolean(a.locked)) || (b.fromSceneOrder ?? 0) - (a.fromSceneOrder ?? 0))[0];\n  const continuityGaps = useMemo(() => sortedProjectScenes.flatMap((scene: any) => {\n    const ids = Array.isArray(scene.characterIds) ? scene.characterIds : [];\n    return ids.flatMap((characterId: number) => activeAssignmentFor(characterId, scene.orderIndex ?? 0) ? [] : [{ scene, characterId }]);\n  }), [sortedProjectScenes, projectAssignmentsQ.data]);\n''',
)
replace_once(
    "client/src/pages/DesignerWardrobePage.tsx",
    '      referencePrompt: itemForm.referencePrompt.trim() || undefined,\n      characterWardrobeAllowed:',
    '      referencePrompt: itemForm.referencePrompt.trim() || undefined,\n      faceCoverage: itemForm.faceCoverage,\n      characterWardrobeAllowed:',
)
replace_once(
    "client/src/pages/DesignerWardrobePage.tsx",
    '    setAttachNotes("");\n    setAttachOpen(true);',
    '    setAttachNotes("");\n    setAttachFromSceneOrder("");\n    setAttachToSceneOrder("until_changed");\n    setAttachIdentityMode(item.faceCoverage === "full" ? "conceal_character_face" : "auto");\n    setAttachOpen(true);',
)
replace_once(
    "client/src/pages/DesignerWardrobePage.tsx",
    '      if (!attachCharId) { toast.error("Pick a character"); return; }\n      attachToCharacter.mutate({',
    '      if (!attachCharId) { toast.error("Pick a character"); return; }\n      if (attachFromSceneOrder === "") { toast.error("Choose the scene where this costume begins"); return; }\n      attachToCharacter.mutate({',
)
replace_once(
    "client/src/pages/DesignerWardrobePage.tsx",
    '        placementNotes: attachNotes.trim() || undefined,\n        promptWeight: 60,\n      });',
    '        placementNotes: attachNotes.trim() || undefined,\n        promptWeight: 100,\n        fromSceneOrder: Number(attachFromSceneOrder),\n        toSceneOrder: attachToSceneOrder === "until_changed" ? undefined : Number(attachToSceneOrder),\n        identityMode: attachIdentityMode,\n      });',
)
replace_once(
    "client/src/pages/DesignerWardrobePage.tsx",
    '''            <div>\n              <Label className="text-zinc-400">Reference prompt for the AI</Label>''',
    '''            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">\n              <div>\n                <Label className="text-zinc-400">Face coverage</Label>\n                <Select value={itemForm.faceCoverage} onValueChange={(v) => setItemForm((f) => ({ ...f, faceCoverage: v as ItemForm["faceCoverage"] }))}>\n                  <SelectTrigger className="bg-zinc-950 border-amber-500/20 mt-1"><SelectValue /></SelectTrigger>\n                  <SelectContent className="bg-zinc-900 text-zinc-100 border-amber-500/20">\n                    <SelectItem value="none">Face visible</SelectItem>\n                    <SelectItem value="partial">Partial mask / helmet</SelectItem>\n                    <SelectItem value="full">Full face covering — suppress actor face</SelectItem>\n                  </SelectContent>\n                </Select>\n              </div>\n              <div className="text-xs text-zinc-500 self-end pb-2">Full coverage is for costumes such as Spider-Man-style masks, Batman-style cowls, sealed helmets or creature heads. The costume image replaces the actor face reference while active.</div>\n            </div>\n            <div>\n              <Label className="text-zinc-400">Reference prompt for the AI</Label>''',
)

# Add readiness panel before the existing Project Wardrobe description.
replace_once(
    "client/src/pages/DesignerWardrobePage.tsx",
    '''            <TabsContent value="project" className="mt-4">\n              <div className="mb-2 text-sm text-zinc-400">''',
    '''            <TabsContent value="project" className="mt-4">\n              <Card className={`mb-4 border ${continuityGaps.length ? "border-rose-500/40 bg-rose-950/15" : "border-emerald-500/30 bg-emerald-950/10"}`}>\n                <CardContent className="p-4">\n                  <div className="flex items-center justify-between gap-3">\n                    <div>\n                      <div className="font-medium">Character costume continuity</div>\n                      <div className="text-xs text-zinc-400 mt-1">Every on-screen character must have one assigned wardrobe or costume. It continues automatically until a replacement begins.</div>\n                    </div>\n                    <Badge className={continuityGaps.length ? "bg-rose-500/15 text-rose-300" : "bg-emerald-500/15 text-emerald-300"}>\n                      {continuityGaps.length ? `${continuityGaps.length} missing` : "Ready"}\n                    </Badge>\n                  </div>\n                  {continuityGaps.length > 0 ? (\n                    <div className="mt-3 grid gap-2 sm:grid-cols-2">\n                      {continuityGaps.slice(0, 12).map(({ scene, characterId }: any) => {\n                        const character = projectCharsQ.data?.find((entry: any) => entry.id === characterId);\n                        return <div key={`${scene.id}-${characterId}`} className="rounded border border-rose-500/20 bg-black/20 px-3 py-2 text-xs">Scene {(scene.orderIndex ?? 0) + 1}: <span className="text-rose-300">{character?.name ?? `Character #${characterId}`} needs a costume</span></div>;\n                      })}\n                    </div>\n                  ) : null}\n                </CardContent>\n              </Card>\n              <div className="mb-2 text-sm text-zinc-400">''',
)

# Assignment display: range and full-face status.
replace_once(
    "client/src/pages/DesignerWardrobePage.tsx",
    '''                            <div className="text-xs text-zinc-500 mt-0.5">\n                              {charName ? `Character: ${charName}` : null}\n                              {sceneRef ? `Scene #${sceneRef.sceneNumber ?? sceneRef.id}${sceneRef.title ? ` — ${sceneRef.title}` : ""}` : null}\n                            </div>''',
    '''                            <div className="text-xs text-zinc-500 mt-0.5">\n                              {charName ? `Character: ${charName}` : null}\n                              {charName ? ` · Scenes ${(a.fromSceneOrder ?? 0) + 1}–${a.toSceneOrder == null ? "until changed" : a.toSceneOrder + 1}` : null}\n                              {sceneRef ? `Scene #${sceneRef.sceneNumber ?? sceneRef.id}${sceneRef.title ? ` — ${sceneRef.title}` : ""}` : null}\n                            </div>\n                            {a.identityMode === "conceal_character_face" || item?.faceCoverage === "full" ? (\n                              <Badge className="mt-1 bg-violet-500/15 text-violet-300">Full face covered · actor face suppressed</Badge>\n                            ) : null}''',
)

# Character attach controls for scene range and identity mode.
replace_once(
    "client/src/pages/DesignerWardrobePage.tsx",
    '''                <div>\n                  <Label className="text-zinc-400">Type</Label>\n                  <Select value={attachAssignType} onValueChange={setAttachAssignType}>''',
    '''                <div className="grid grid-cols-2 gap-3">\n                  <div>\n                    <Label className="text-zinc-400">Costume begins in scene *</Label>\n                    <Select value={attachFromSceneOrder} onValueChange={setAttachFromSceneOrder}>\n                      <SelectTrigger className="bg-zinc-950 border-amber-500/20 mt-1"><SelectValue placeholder="Choose scene" /></SelectTrigger>\n                      <SelectContent className="bg-zinc-900 text-zinc-100 border-amber-500/20 max-h-72">\n                        {sortedProjectScenes.map((scene: any) => <SelectItem key={scene.id} value={String(scene.orderIndex ?? 0)}>Scene {(scene.orderIndex ?? 0) + 1}{scene.title ? ` — ${scene.title}` : ""}</SelectItem>)}\n                      </SelectContent>\n                    </Select>\n                  </div>\n                  <div>\n                    <Label className="text-zinc-400">Costume ends</Label>\n                    <Select value={attachToSceneOrder} onValueChange={setAttachToSceneOrder}>\n                      <SelectTrigger className="bg-zinc-950 border-amber-500/20 mt-1"><SelectValue /></SelectTrigger>\n                      <SelectContent className="bg-zinc-900 text-zinc-100 border-amber-500/20 max-h-72">\n                        <SelectItem value="until_changed">Until another costume is assigned</SelectItem>\n                        {sortedProjectScenes.filter((scene: any) => attachFromSceneOrder === "" || (scene.orderIndex ?? 0) >= Number(attachFromSceneOrder)).map((scene: any) => <SelectItem key={scene.id} value={String(scene.orderIndex ?? 0)}>End after scene {(scene.orderIndex ?? 0) + 1}</SelectItem>)}\n                      </SelectContent>\n                    </Select>\n                  </div>\n                </div>\n                <div>\n                  <Label className="text-zinc-400">Face identity while costume is active</Label>\n                  <Select value={attachIdentityMode} onValueChange={(value) => setAttachIdentityMode(value as typeof attachIdentityMode)}>\n                    <SelectTrigger className="bg-zinc-950 border-amber-500/20 mt-1"><SelectValue /></SelectTrigger>\n                    <SelectContent className="bg-zinc-900 text-zinc-100 border-amber-500/20">\n                      <SelectItem value="auto">Automatic from costume face coverage</SelectItem>\n                      <SelectItem value="use_character_face">Use original character face</SelectItem>\n                      <SelectItem value="conceal_character_face">Full costume — suppress original face</SelectItem>\n                    </SelectContent>\n                  </Select>\n                </div>\n                <div>\n                  <Label className="text-zinc-400">Type</Label>\n                  <Select value={attachAssignType} onValueChange={setAttachAssignType}>''',
)

# ─── Regression tests ───────────────────────────────────────────────────────
test_path = ROOT / "server/characterCostumeContinuity.test.ts"
test_path.write_text(
    '''import { beforeEach, describe, expect, it, vi } from "vitest";\n\nconst dbMocks = vi.hoisted(() => ({\n  getSceneById: vi.fn(),\n  getProjectCharacters: vi.fn(),\n  getWardrobeLeasesByUser: vi.fn(),\n}));\nconst getDbMock = vi.hoisted(() => vi.fn());\nvi.mock("./db", () => ({ ...dbMocks, getDb: getDbMock }));\n\nimport { loadSceneGenerationContext } from "./_core/sceneGenerationContext";\n\nfunction mockDatabase(rows: any[]) {\n  let call = 0;\n  getDbMock.mockResolvedValue({\n    select: vi.fn(() => {\n      call++;\n      if (call === 1) return { from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([{ userId: 7 }]) })) })) };\n      return { from: vi.fn(() => ({ innerJoin: vi.fn(() => ({ where: vi.fn().mockResolvedValue(rows) })) })) };\n    }),\n  });\n}\n\ndescribe("mandatory character costume continuity", () => {\n  beforeEach(() => {\n    vi.clearAllMocks();\n    dbMocks.getWardrobeLeasesByUser.mockResolvedValue([]);\n  });\n\n  it("blocks generation when an on-screen character has no assigned costume", async () => {\n    dbMocks.getSceneById.mockResolvedValue({ id: 1, projectId: 99, orderIndex: 0, title: "Arrival", description: "Mara arrives.", characterIds: [11], wardrobe: [], duration: 8, aspectRatio: "16:9", frameRate: "24" });\n    dbMocks.getProjectCharacters.mockResolvedValue([{ id: 11, userId: 7, projectId: 99, name: "Mara", photoUrl: "https://assets.test/mara.jpg", attributes: {} }]);\n    mockDatabase([]);\n    await expect(loadSceneGenerationContext(1, 99)).rejects.toThrow(/Wardrobe assignment required/);\n  });\n\n  it("suppresses the actor face reference for a full-face costume", async () => {\n    dbMocks.getSceneById.mockResolvedValue({ id: 2, projectId: 99, orderIndex: 2, title: "Rooftop", description: "The masked vigilante watches the street.", characterIds: [11], wardrobe: [], duration: 8, aspectRatio: "16:9", frameRate: "24" });\n    dbMocks.getProjectCharacters.mockResolvedValue([{ id: 11, userId: 7, projectId: 99, name: "Mara", photoUrl: "https://assets.test/mara-face.jpg", attributes: { ageRange: "30s", build: "athletic" } }]);\n    mockDatabase([{\n      assignment: { id: 9, userId: 7, projectId: 99, wardrobeItemId: 50, characterId: 11, sceneId: null, fromSceneOrder: 2, toSceneOrder: null, identityMode: "conceal_character_face", placementNotes: null, locked: true },\n      item: { id: 50, collectionId: null, userId: 7, name: "Obsidian Vigilante Suit", category: "costume", primaryImageUrl: "https://assets.test/full-mask.jpg", imageUrls: ["https://assets.test/full-mask.jpg"], referencePrompt: "complete black armored suit with sealed cowl and opaque eye lenses", faceCoverage: "full", status: "active", characterWardrobeAllowed: true },\n    }]);\n    const context = await loadSceneGenerationContext(2, 99);\n    expect(context.wardrobeBindings[0].suppressCharacterFaceReference).toBe(true);\n    expect(context.wardrobeBindings[0].characterReferenceImageUrl).toBeUndefined();\n    expect(context.referenceImages).not.toContain("https://assets.test/mara-face.jpg");\n    expect(context.referenceImages).toContain("https://assets.test/full-mask.jpg");\n    expect(context.canonicalPrompt).toContain("original actor face and face portrait are intentionally suppressed");\n    expect(context.canonicalPrompt).toContain("zero exposed facial skin");\n  });\n});\n''',
    encoding="utf-8",
)

# Remove the one-shot patch files before committing the product changes.
for temporary in [
    ROOT / ".github/scripts/apply_character_costume_continuity.py",
    ROOT / ".github/workflows/character-costume-continuity-patch.yml",
]:
    if temporary.exists():
        temporary.unlink()

print("Character/costume continuity patch applied successfully.")
