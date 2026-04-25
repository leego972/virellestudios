// v6.69 — Phase 3: Script-to-Storyboard breakdown analyzer.
// v6.74 — Phase 1: Richer breakdown schema. The analyzer now returns
//   top-level story metadata (title, logline, genre, tone, themes) plus
//   project-wide entities (characters, locations, props) PLUS richer
//   per-scene fields (dialogue, props, shotSuggestions, continuityNotes).
//   The shape is forward-compatible — the wizard happily consumes the
//   minimal v6.69/v6.73 shape too thanks to the normalize() helper which
//   accepts both `characters` (array of strings, old) and `characterNames`
//   (array of strings, new) and derives top-level entities from per-scene
//   data when the LLM forgets to emit them.
//
// Pure read/inference module. NEVER writes to the database — the caller
// (the wizard) must explicitly apply the breakdown.

import { invokeLLM, withUserLlmKey } from "./llm";
import { safeJsonExtract } from "./safeParse";
import * as db from "../db";
import { decryptApiKey } from "./securityEngine";

// v6.74 — Per-scene shot suggestion entry. Mirrors the existing scenes.shotList
// JSON shape so the wizard can save these straight into the column without a
// translation layer.
export type ProposedShotSuggestion = {
  shotType: string | null;        // wide / medium / close-up / insert / etc.
  lens: string | null;            // 24mm / 85mm / anamorphic prime / etc.
  movement: string | null;        // static / dolly-in / handheld / crane / etc.
  framing: string | null;         // single / two-shot / OTS / etc.
  notes: string | null;           // free-form direction
  durationSec: number | null;     // suggested length, if the LLM proposed one
};

export type ProposedScene = {
  sceneNumber: number;
  title: string;
  description: string;
  location: string | null;
  timeOfDay: "dawn" | "morning" | "afternoon" | "evening" | "night" | "golden-hour" | null;
  mood: string | null;
  characters: string[];                  // names only — wizard maps to characterIds
  estimatedDuration: number;
  // v6.74 additions — all optional to stay backward compatible.
  dialogue: string | null;               // condensed dialogue/voice-over text
  props: string[];                       // discrete propable items in this scene
  shotSuggestions: ProposedShotSuggestion[];
  continuityNotes: string | null;        // wardrobe/timing/eyeline risks etc.
};

// v6.74 — Top-level story + entity metadata. All fields are optional so the
// wizard never explodes when the LLM (or fallback) returns an old/minimal
// shape — those fields are then derived from the scenes themselves.
export type ProposedCharacter = {
  name: string;
  role: string | null;
  description: string | null;
};
export type ProposedLocation = {
  name: string;
  locationType: string | null;
  description: string | null;
};

export type BreakdownResult = {
  source: "llm" | "deterministic";
  totalScenes: number;
  scenes: ProposedScene[];
  warnings: string[];
  // v6.74 — story metadata.
  title: string | null;
  logline: string | null;
  genre: string | null;
  tone: string | null;
  themes: string[];
  // v6.74 — derived project-wide entities. Always populated, even when the
  // LLM forgets — we walk every scene and build them from per-scene fields.
  characters: ProposedCharacter[];
  locations: ProposedLocation[];
  props: string[];
};

/** Decrypt the user's preferred LLM key, if any, so invokeLLM can use it. */
async function getUserLlmKeys(userId: number): Promise<{
  openaiKey: string | null;
  anthropicKey: string | null;
  veniceKey: string | null;
}> {
  const user: any = await db.getUserById(userId).catch(() => null);
  const safeDecrypt = (v: any): string | null => {
    if (!v || typeof v !== "string") return null;
    try { return decryptApiKey(v); } catch { return null; }
  };
  return {
    openaiKey: safeDecrypt(user?.userOpenaiKey),
    anthropicKey: safeDecrypt(user?.userAnthropicKey),
    veniceKey: safeDecrypt(user?.userVeniceKey),
  };
}

/** Deterministic fallback — splits the script on "INT./EXT." sluglines or
 *  "SCENE n" markers, falling back to one paragraph per chunk. */
function deterministicSplit(script: string): ProposedScene[] {
  const trimmed = script.trim();
  if (!trimmed) return [];
  const slugRe = /(^|\n)\s*(INT\.|EXT\.|INT\/EXT\.|EXT\/INT\.|SCENE\s+\d+)/gi;
  const indices: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = slugRe.exec(trimmed)) !== null) indices.push(m.index + (m[1] ? 1 : 0));
  let chunks: string[];
  if (indices.length >= 2) {
    chunks = [];
    for (let i = 0; i < indices.length; i++) {
      const start = indices[i];
      const end = i + 1 < indices.length ? indices[i + 1] : trimmed.length;
      chunks.push(trimmed.slice(start, end).trim());
    }
  } else {
    chunks = trimmed.split(/\n{2,}/).map((p) => p.trim()).filter((p) => p.length > 30);
  }
  return chunks.slice(0, 60).map((chunk, idx) => {
    const firstLine = chunk.split("\n")[0].slice(0, 120);
    const dayNight = /\bNIGHT\b/i.test(firstLine) ? "night"
      : /\bDAY\b/i.test(firstLine) ? "afternoon"
      : /\bDAWN\b/i.test(firstLine) ? "dawn"
      : /\bMORNING\b/i.test(firstLine) ? "morning"
      : /\bEVENING\b/i.test(firstLine) ? "evening"
      : null;
    const intExt = /^INT\./i.test(firstLine) ? "interior"
      : /^EXT\./i.test(firstLine) ? "exterior" : null;
    const locMatch = firstLine.match(/(?:INT\.|EXT\.|INT\/EXT\.|EXT\/INT\.)\s*([A-Z][^\-–—]*?)(?:\s*[-–—]|$)/i);
    return {
      sceneNumber: idx + 1,
      title: firstLine.replace(/^(INT\.|EXT\.|INT\/EXT\.|EXT\/INT\.)\s*/i, "").trim() || `Scene ${idx + 1}`,
      description: chunk.length > firstLine.length ? chunk.slice(firstLine.length).trim().slice(0, 800) : chunk,
      location: locMatch ? locMatch[1].trim() : (intExt ?? null),
      timeOfDay: dayNight as any,
      mood: null,
      characters: [],
      estimatedDuration: 30,
      // v6.74 additions — empty/null for the deterministic split so the wizard
      // still renders the new sections (just empty) for parity with LLM output.
      dialogue: null,
      props: [],
      shotSuggestions: [],
      continuityNotes: null,
    };
  });
}

const SYSTEM_PROMPT = `You are a senior script supervisor breaking a screenplay into scenes for production planning.

Return a JSON object with this exact shape:
{
  "title": string|null,            // overall film/episode title if you can infer it
  "logline": string|null,          // one-sentence pitch
  "genre": string|null,            // e.g. "psychological thriller", "sci-fi noir"
  "tone": string|null,             // e.g. "bleak, dryly comic", "epic, mythic"
  "themes": string[],              // 1-6 thematic concerns; [] if unsure
  "characters": [                  // distinct speaking/acting characters
    { "name": string, "role": string|null, "description": string|null }
  ],
  "locations": [                   // distinct shooting locations
    { "name": string, "locationType": string|null, "description": string|null }
  ],
  "props": string[],               // unique props referenced across the script
  "scenes": [
    {
      "sceneNumber": int,          // 1-based
      "title": string,             // short
      "description": string,       // 1-3 sentences
      "location": string|null,
      "timeOfDay": "dawn"|"morning"|"afternoon"|"evening"|"night"|"golden-hour"|null,
      "mood": string|null,
      "characters": string[],      // speaking-character names
      "estimatedDuration": int,    // seconds, 15-180
      "dialogue": string|null,     // condensed dialogue/voice-over for this scene
      "props": string[],           // props specifically used in THIS scene
      "shotSuggestions": [         // 0-5 shot ideas (empty array if unsure)
        {
          "shotType": string|null,
          "lens": string|null,
          "movement": string|null,
          "framing": string|null,
          "notes": string|null,
          "durationSec": int|null
        }
      ],
      "continuityNotes": string|null  // wardrobe/timing/eyeline risks, etc.
    }
  ]
}

Rules:
- Output AT MOST 60 scenes.
- Do not invent characters that don't appear in the script.
- Reuse the EXACT character + location + prop names across scenes so the wizard can deduplicate.
- If the field is genuinely unknown, return null (or an empty array). Do not hallucinate.
- Output ONLY the JSON object — no prose, no markdown, no comments.`;

/**
 * Normalize a single scene from either the v6.69 minimal shape or the v6.74
 * rich shape. Accepts both `characters` (string[]) AND `characterNames`
 * (string[]) for the character list so we never silently drop names. All
 * v6.74 additions default to null/[] so old payloads keep working.
 */
function normalizeScene(s: any, idx: number): ProposedScene {
  // Accept either characters or characterNames; merge if both present.
  const charList: string[] = [];
  const seenChar = new Set<string>();
  const pushName = (raw: any) => {
    if (raw === null || raw === undefined) return;
    const name = String(typeof raw === "string" ? raw : raw?.name ?? "").trim();
    if (!name) return;
    const k = name.toLowerCase();
    if (seenChar.has(k)) return;
    seenChar.add(k);
    charList.push(name.slice(0, 80));
  };
  if (Array.isArray(s.characters)) for (const c of s.characters) pushName(c);
  if (Array.isArray(s.characterNames)) for (const c of s.characterNames) pushName(c);
  if (Array.isArray(s.cast)) for (const c of s.cast) pushName(c);

  // Props: always normalize to string[]; accept either props or propList.
  const propList: string[] = [];
  const seenProp = new Set<string>();
  const pushProp = (raw: any) => {
    if (raw === null || raw === undefined) return;
    const name = String(typeof raw === "string" ? raw : raw?.name ?? "").trim();
    if (!name) return;
    const k = name.toLowerCase();
    if (seenProp.has(k)) return;
    seenProp.add(k);
    propList.push(name.slice(0, 120));
  };
  if (Array.isArray(s.props)) for (const p of s.props) pushProp(p);
  if (Array.isArray(s.propList)) for (const p of s.propList) pushProp(p);

  // Shot suggestions: accept array of objects OR strings (treat strings as notes).
  const shotSuggestions: ProposedShotSuggestion[] = [];
  const rawShots: any[] = Array.isArray(s.shotSuggestions)
    ? s.shotSuggestions
    : Array.isArray(s.shots)
      ? s.shots
      : [];
  for (const sh of rawShots.slice(0, 5)) {
    if (typeof sh === "string") {
      shotSuggestions.push({ shotType: null, lens: null, movement: null, framing: null, notes: sh.slice(0, 400), durationSec: null });
      continue;
    }
    if (sh && typeof sh === "object") {
      const dur = sh.durationSec ?? sh.duration ?? null;
      shotSuggestions.push({
        shotType: sh.shotType ? String(sh.shotType).slice(0, 64) : null,
        lens: sh.lens ? String(sh.lens).slice(0, 128) : null,
        movement: sh.movement ? String(sh.movement).slice(0, 128) : null,
        framing: sh.framing ? String(sh.framing).slice(0, 64) : null,
        notes: sh.notes ? String(sh.notes).slice(0, 400) : null,
        durationSec: typeof dur === "number" && isFinite(dur) ? Math.max(1, Math.min(600, Math.round(dur))) : null,
      });
    }
  }

  return {
    sceneNumber: Number(s.sceneNumber ?? idx + 1),
    title: String(s.title ?? `Scene ${idx + 1}`).slice(0, 200),
    description: String(s.description ?? "").slice(0, 1200),
    location: s.location ? String(s.location).slice(0, 200) : null,
    timeOfDay: ["dawn","morning","afternoon","evening","night","golden-hour"].includes(s.timeOfDay)
      ? s.timeOfDay : null,
    mood: s.mood ? String(s.mood).slice(0, 120) : null,
    characters: charList.slice(0, 12),
    estimatedDuration: Math.max(15, Math.min(180, Number(s.estimatedDuration ?? 30))),
    // v6.74 additions.
    dialogue: s.dialogue ? String(s.dialogue).slice(0, 4000) : null,
    props: propList.slice(0, 24),
    shotSuggestions,
    continuityNotes: s.continuityNotes
      ? String(s.continuityNotes).slice(0, 1200)
      : (s.continuity ? String(s.continuity).slice(0, 1200) : null),
  };
}

/**
 * v6.74 — Top-level entity derivation. If the LLM omitted top-level
 * `characters` / `locations` / `props`, we walk every scene and build them
 * from the per-scene fields so the wizard never shows an empty review.
 */
function deriveTopLevelEntities(
  scenes: ProposedScene[],
  topChars: any[],
  topLocs: any[],
  topProps: any[],
): { characters: ProposedCharacter[]; locations: ProposedLocation[]; props: string[] } {
  // Characters — start with the LLM's explicit top-level list, then fold in
  // any per-scene names that are missing.
  const charMap = new Map<string, ProposedCharacter>();
  const addChar = (name: string, role: string | null, description: string | null) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const k = trimmed.toLowerCase();
    if (charMap.has(k)) {
      // Enrich existing entry if the new one has more detail.
      const existing = charMap.get(k)!;
      if (!existing.role && role) existing.role = role;
      if (!existing.description && description) existing.description = description;
    } else {
      charMap.set(k, { name: trimmed.slice(0, 128), role: role ? role.slice(0, 128) : null, description: description ? description.slice(0, 1200) : null });
    }
  };
  for (const c of topChars) {
    if (typeof c === "string") addChar(c, null, null);
    else if (c && typeof c === "object" && c.name) addChar(String(c.name), c.role ? String(c.role) : null, c.description ? String(c.description) : null);
  }
  for (const sc of scenes) for (const name of sc.characters) addChar(name, null, null);

  // Locations — same idea, derive from scene.location when the top-level
  // list is missing or incomplete.
  const locMap = new Map<string, ProposedLocation>();
  const addLoc = (name: string, locationType: string | null, description: string | null) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const k = trimmed.toLowerCase();
    if (locMap.has(k)) {
      const existing = locMap.get(k)!;
      if (!existing.locationType && locationType) existing.locationType = locationType;
      if (!existing.description && description) existing.description = description;
    } else {
      locMap.set(k, { name: trimmed.slice(0, 255), locationType: locationType ? locationType.slice(0, 128) : null, description: description ? description.slice(0, 1200) : null });
    }
  };
  for (const l of topLocs) {
    if (typeof l === "string") addLoc(l, null, null);
    else if (l && typeof l === "object" && l.name) addLoc(String(l.name), l.locationType ? String(l.locationType) : null, l.description ? String(l.description) : null);
  }
  for (const sc of scenes) if (sc.location) addLoc(sc.location, null, null);

  // Props — flat string[], dedupe case-insensitively.
  const propSet = new Map<string, string>();
  const addProp = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const k = trimmed.toLowerCase();
    if (!propSet.has(k)) propSet.set(k, trimmed.slice(0, 120));
  };
  for (const p of topProps) {
    if (typeof p === "string") addProp(p);
    else if (p && typeof p === "object" && p.name) addProp(String(p.name));
  }
  for (const sc of scenes) for (const p of sc.props) addProp(p);

  return {
    characters: Array.from(charMap.values()).slice(0, 60),
    locations: Array.from(locMap.values()).slice(0, 60),
    props: Array.from(propSet.values()).slice(0, 200),
  };
}

export async function analyzeScript(
  userId: number,
  script: string,
  opts: { maxScenes?: number; userModel?: string } = {},
): Promise<BreakdownResult> {
  const warnings: string[] = [];
  if (!script || script.trim().length < 40) {
    return {
      source: "deterministic",
      totalScenes: 0,
      scenes: [],
      warnings: ["Script is empty or too short to break down."],
      title: null, logline: null, genre: null, tone: null, themes: [],
      characters: [], locations: [], props: [],
    };
  }
  const keys = await getUserLlmKeys(userId);
  const hasUserKey = !!(keys.openaiKey || keys.anthropicKey || keys.veniceKey);
  if (!hasUserKey && !process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
    warnings.push("No LLM key available — using deterministic split. Add a key under Settings → BYOK for AI-powered breakdown.");
    const scenes = deterministicSplit(script).slice(0, opts.maxScenes ?? 60);
    const derived = deriveTopLevelEntities(scenes, [], [], []);
    return {
      source: "deterministic",
      totalScenes: scenes.length,
      scenes,
      warnings,
      title: null, logline: null, genre: null, tone: null, themes: [],
      characters: derived.characters,
      locations: derived.locations,
      props: derived.props,
    };
  }
  try {
    const result = await withUserLlmKey(keys, async () => {
      return invokeLLM({
        model: opts.userModel ?? "gpt-4.1-mini",
        userApiKey: keys.openaiKey ?? undefined,
        systemTag: "script-breakdown",
        responseFormat: { type: "json_object" } as any,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Script:\n\n${script.slice(0, 60000)}` },
        ],
        // v6.74 — bumped from 4000 → 6000 to fit the richer schema (top-level
        // entities + per-scene props/shots/continuity) for ~30-40 scene scripts.
        maxTokens: 6000,
      });
    });
    const raw = result?.choices?.[0]?.message?.content;
    const text = typeof raw === "string"
      ? raw
      : Array.isArray(raw)
        ? raw.map((p: any) => (typeof p === "string" ? p : p?.text ?? "")).join("")
        : "";
    const parsed = safeJsonExtract<any>(text, {});
    const arr: any[] = Array.isArray(parsed?.scenes) ? parsed.scenes : [];
    if (arr.length === 0) {
      warnings.push("LLM returned no scenes; falling back to deterministic split.");
      const scenes = deterministicSplit(script).slice(0, opts.maxScenes ?? 60);
      const derived = deriveTopLevelEntities(scenes, [], [], []);
      return {
        source: "deterministic",
        totalScenes: scenes.length,
        scenes,
        warnings,
        title: null, logline: null, genre: null, tone: null, themes: [],
        characters: derived.characters,
        locations: derived.locations,
        props: derived.props,
      };
    }
    const scenes: ProposedScene[] = arr.slice(0, opts.maxScenes ?? 60).map((s, idx) => normalizeScene(s, idx));
    const derived = deriveTopLevelEntities(
      scenes,
      Array.isArray(parsed?.characters) ? parsed.characters : [],
      Array.isArray(parsed?.locations) ? parsed.locations : [],
      Array.isArray(parsed?.props) ? parsed.props : [],
    );
    const themes: string[] = Array.isArray(parsed?.themes)
      ? parsed.themes.map((t: any) => String(t).slice(0, 80)).filter(Boolean).slice(0, 8)
      : [];
    return {
      source: "llm",
      totalScenes: scenes.length,
      scenes,
      warnings,
      title: parsed?.title ? String(parsed.title).slice(0, 255) : null,
      logline: parsed?.logline ? String(parsed.logline).slice(0, 600) : null,
      genre: parsed?.genre ? String(parsed.genre).slice(0, 128) : null,
      tone: parsed?.tone ? String(parsed.tone).slice(0, 255) : null,
      themes,
      characters: derived.characters,
      locations: derived.locations,
      props: derived.props,
    };
  } catch (err: any) {
    warnings.push(`LLM call failed (${err?.message ?? "unknown"}); using deterministic split.`);
    const scenes = deterministicSplit(script).slice(0, opts.maxScenes ?? 60);
    const derived = deriveTopLevelEntities(scenes, [], [], []);
    return {
      source: "deterministic",
      totalScenes: scenes.length,
      scenes,
      warnings,
      title: null, logline: null, genre: null, tone: null, themes: [],
      characters: derived.characters,
      locations: derived.locations,
      props: derived.props,
    };
  }
}
