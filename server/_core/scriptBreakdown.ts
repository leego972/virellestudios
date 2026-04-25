// v6.69 — Phase 3: Script-to-Storyboard breakdown analyzer.
//
// Pure read/inference module. Takes a raw script string and returns a list of
// proposed scenes. NEVER writes to the database — the caller (the wizard)
// must explicitly apply the breakdown. NEVER touches the generation engine.
//
// Falls back to a deterministic split when no LLM provider is available so
// the route is still usable in dev without burning credits.

import { invokeLLM, withUserLlmKey } from "./llm";
import { safeJsonExtract } from "./safeParse";
import * as db from "../db";
import { decryptApiKey } from "./securityEngine";

export type ProposedScene = {
  sceneNumber: number;
  title: string;
  description: string;
  location: string | null;
  timeOfDay: "dawn" | "morning" | "afternoon" | "evening" | "night" | "golden-hour" | null;
  mood: string | null;
  characters: string[];
  estimatedDuration: number;
};

export type BreakdownResult = {
  source: "llm" | "deterministic";
  totalScenes: number;
  scenes: ProposedScene[];
  warnings: string[];
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
    };
  });
}

const SYSTEM_PROMPT = `You are a senior script supervisor breaking a screenplay into scenes for production planning. Return a JSON object with a single key "scenes" whose value is an array. Each scene MUST have: sceneNumber (1-based int), title (short string), description (1-3 sentences), location (string or null), timeOfDay (one of "dawn","morning","afternoon","evening","night","golden-hour" or null), mood (string or null), characters (array of speaking-character names), estimatedDuration (int seconds, 15-180). Output AT MOST 60 scenes. Do not invent characters that don't appear in the script. Output ONLY the JSON object — no prose, no markdown.`;

export async function analyzeScript(
  userId: number,
  script: string,
  opts: { maxScenes?: number; userModel?: string } = {},
): Promise<BreakdownResult> {
  const warnings: string[] = [];
  if (!script || script.trim().length < 40) {
    return { source: "deterministic", totalScenes: 0, scenes: [], warnings: ["Script is empty or too short to break down."] };
  }
  const keys = await getUserLlmKeys(userId);
  const hasUserKey = !!(keys.openaiKey || keys.anthropicKey || keys.veniceKey);
  if (!hasUserKey && !process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
    warnings.push("No LLM key available — using deterministic split. Add a key under Settings → BYOK for AI-powered breakdown.");
    const scenes = deterministicSplit(script).slice(0, opts.maxScenes ?? 60);
    return { source: "deterministic", totalScenes: scenes.length, scenes, warnings };
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
        maxTokens: 4000,
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
      return { source: "deterministic", totalScenes: scenes.length, scenes, warnings };
    }
    const scenes: ProposedScene[] = arr.slice(0, opts.maxScenes ?? 60).map((s: any, idx: number) => ({
      sceneNumber: Number(s.sceneNumber ?? idx + 1),
      title: String(s.title ?? `Scene ${idx + 1}`).slice(0, 200),
      description: String(s.description ?? "").slice(0, 1200),
      location: s.location ? String(s.location).slice(0, 200) : null,
      timeOfDay: ["dawn","morning","afternoon","evening","night","golden-hour"].includes(s.timeOfDay)
        ? s.timeOfDay : null,
      mood: s.mood ? String(s.mood).slice(0, 120) : null,
      characters: Array.isArray(s.characters)
        ? s.characters.map((c: any) => String(c).slice(0, 80)).slice(0, 12)
        : [],
      estimatedDuration: Math.max(15, Math.min(180, Number(s.estimatedDuration ?? 30))),
    }));
    return { source: "llm", totalScenes: scenes.length, scenes, warnings };
  } catch (err: any) {
    warnings.push(`LLM call failed (${err?.message ?? "unknown"}); using deterministic split.`);
    const scenes = deterministicSplit(script).slice(0, opts.maxScenes ?? 60);
    return { source: "deterministic", totalScenes: scenes.length, scenes, warnings };
  }
}
