// v6.69 Phase 3 Ã¢ÂÂ Script-to-Storyboard Breakdown Wizard.
// v6.73 Phase 2 Ã¢ÂÂ Polish: append/replace mode (with destructive confirm),
// post-apply summary (created / reused / new / missing references).
// v6.74 Phase 3 Ã¢ÂÂ Richer review screen. Step 2 now shows five distinct
// sections (Story / Characters / Locations / Props / Scenes), each with
// per-row include toggles, so the user can curate the entire breakdown
// before any DB write happens. The wizard now ships top-level characters +
// locations + per-scene props/shot suggestions/continuity notes/dialogue
// to the apply mutation, which packs them into existing scene columns.
//
// Three steps:
//   1. Load the project's existing script (or paste a new one).
//   2. Review the proposed breakdown (story / cast / locations / props /
//      scenes Ã¢ÂÂ each with toggles to remove rows). If the project already
//      has scenes, prompt for append vs replace.
//   3. Apply Ã¢ÂÂ creates scenes (and now characters/locations) for the project,
//      then shows a rich summary.
//
// All AI calls are server-side; this page only renders proposals and lets the
// user explicitly approve before any DB write happens.

import { useState, useMemo, useEffect } from "react";
import { useParams, Link } from "wouter";
import { trpc } from "../lib/trpc";

// v6.74 Ã¢ÂÂ Richer per-scene shape returned by analyzeScript. All v6.74-only
// fields are tolerant of legacy/empty server payloads (default to []/null).
type ProposedShotSuggestion = {
  shotType: string | null;
  lens: string | null;
  movement: string | null;
  framing: string | null;
  notes: string | null;
  durationSec: number | null;
};
type ProposedScene = {
  sceneNumber: number;
  title: string;
  description: string;
  location: string | null;
  timeOfDay: string | null;
  mood: string | null;
  characters: string[];
  estimatedDuration: number;
  // v6.74 additions
  dialogue: string | null;
  props: string[];
  shotSuggestions: ProposedShotSuggestion[];
  continuityNotes: string | null;
};
type ProposedCharacter = {
  name: string;
  role: string | null;
  description: string | null;
};
type ProposedLocation = {
  name: string;
  locationType: string | null;
  description: string | null;
};

export default function ScriptBreakdownWizardPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = Number(params.projectId);
  const utils = trpc.useUtils();

  const projectQ = trpc.project.get.useQuery({ id: projectId }, { enabled: !!projectId });
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [script, setScript] = useState<string>("");
  const [proposed, setProposed] = useState<ProposedScene[]>([]);
  const [skipped, setSkipped] = useState<Record<number, boolean>>({});
  const [warnings, setWarnings] = useState<string[]>([]);
  const [source, setSource] = useState<string>("");
  // v6.73 Ã¢ÂÂ append (default, safe) vs replace (destructive, requires
  // explicit double-confirmation before we send the mutation).
  const [mode, setMode] = useState<"append" | "replace">("append");

  // v6.74 Ã¢ÂÂ Rich top-level metadata + entity proposals. All optional in the
  // server response, so we render conditionally and never crash on the older
  // minimal shape from a v6.73-or-earlier server.
  const [storyTitle, setStoryTitle] = useState<string | null>(null);
  const [storyLogline, setStoryLogline] = useState<string | null>(null);
  const [storyGenre, setStoryGenre] = useState<string | null>(null);
  const [storyTone, setStoryTone] = useState<string | null>(null);
  const [storyThemes, setStoryThemes] = useState<string[]>([]);
  const [proposedChars, setProposedChars] = useState<ProposedCharacter[]>([]);
  const [proposedLocs, setProposedLocs] = useState<ProposedLocation[]>([]);
  const [proposedProps, setProposedProps] = useState<string[]>([]);
  // Per-row include toggles Ã¢ÂÂ same pattern as the scene `skipped` map.
  const [skippedChars, setSkippedChars] = useState<Record<string, boolean>>({});
  const [skippedLocs, setSkippedLocs] = useState<Record<string, boolean>>({});
  const [skippedProps, setSkippedProps] = useState<Record<string, boolean>>({});

  const analyzeMut = trpc.preproduction.analyzeScriptForBreakdown.useMutation({
    onSuccess: (data: any) => {
      // Normalize per-scene shape so v6.73 servers don't crash the new UI.
      const scenes: ProposedScene[] = (data?.scenes ?? []).map((s: any) => ({
        sceneNumber: s.sceneNumber,
        title: s.title,
        description: s.description,
        location: s.location ?? null,
        timeOfDay: s.timeOfDay ?? null,
        mood: s.mood ?? null,
        characters: Array.isArray(s.characters) ? s.characters : [],
        estimatedDuration: s.estimatedDuration ?? 30,
        dialogue: s.dialogue ?? null,
        props: Array.isArray(s.props) ? s.props : [],
        shotSuggestions: Array.isArray(s.shotSuggestions) ? s.shotSuggestions : [],
        continuityNotes: s.continuityNotes ?? null,
      }));
      setProposed(scenes);
      setWarnings(data?.warnings ?? []);
      setSource(data?.source ?? "");
      setStoryTitle(data?.title ?? null);
      setStoryLogline(data?.logline ?? null);
      setStoryGenre(data?.genre ?? null);
      setStoryTone(data?.tone ?? null);
      setStoryThemes(Array.isArray(data?.themes) ? data.themes : []);
      setProposedChars(Array.isArray(data?.characters) ? data.characters : []);
      setProposedLocs(Array.isArray(data?.locations) ? data.locations : []);
      setProposedProps(Array.isArray(data?.props) ? data.props : []);
      setSkippedChars({});
      setSkippedLocs({});
      setSkippedProps({});
      setStep(2);
    },
  });
  const applyMut = trpc.preproduction.applyBreakdownToProject.useMutation({
    onSuccess: async () => {
      await utils.project.get.invalidate({ id: projectId });
      setStep(3);
    },
  });

  const project: any = projectQ.data;
  const existingScript: string = useMemo(() => {
    return (
      project?.script ??
      project?.scriptText ??
      project?.fullScript ??
      project?.screenplay ??
      ""
    );
  }, [project]);

  const accepted = proposed.filter((s) => !skipped[s.sceneNumber]);
  const acceptedChars = proposedChars.filter((c) => !skippedChars[c.name.toLowerCase()]);
  const acceptedLocs = proposedLocs.filter((l) => !skippedLocs[l.name.toLowerCase()]);
  const acceptedProps = proposedProps.filter((p) => !skippedProps[p.toLowerCase()]);

  // v6.73 Ã¢ÂÂ Surface the existing scene count so the user can decide between
  // append and replace with full information.
  const existingSceneCount: number =
    Array.isArray(project?.scenes) ? project.scenes.length :
    typeof project?.sceneCount === "number" ? project.sceneCount :
    0;

  // Reset step transitions when the user navigates away mid-flow.
  useEffect(() => {
    if (step === 1) {
      setProposed([]);
      setProposedChars([]);
      setProposedLocs([]);
      setProposedProps([]);
    }
  }, [step]);

  return (
    <div className="min-h-screen" style={{ background:"linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)" }}>
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      <div className="flex items-center gap-3 mb-4">
        <Link href={`/projects/${projectId}/command-center`}>
          <a className="text-sm text-amber-300 hover:underline">Ã¢ÂÂ Command Center</a>
        </Link>
        <h1 className="text-2xl font-semibold gradient-text-gold">Script-to-Scene Breakdown</h1>
      </div>

      <ol className="flex gap-2 text-xs text-zinc-400 mb-6">
        {[1, 2, 3].map((n) => (
          <li
            key={n}
            className={`px-2 py-0.5 rounded border ${
              step === n
                ? "border-amber-500 text-amber-300"
                : step > n
                ? "border-emerald-700 text-emerald-300"
                : "border-zinc-800 text-zinc-500"
            }`}
          >
            Step {n} Ã¢ÂÂ{" "}
            {n === 1 ? "Load script" : n === 2 ? "Review proposal" : "Apply"}
          </li>
        ))}
      </ol>

      {step === 1 && (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-4">
          <div className="text-sm text-zinc-300 mb-2">
            Paste a script or use the project's saved script. Nothing will be
            written to your project until you approve in step 3.
          </div>
          {existingScript && (
            <button
              type="button"
              onClick={() => setScript(existingScript)}
              className="text-xs text-amber-300 hover:underline mb-2"
            >
              Use the saved script ({existingScript.length} characters)
            </button>
          )}
          <textarea
            value={script}
            onChange={(e) => setScript(e.target.value)}
            placeholder="Paste your screenplay hereÃ¢ÂÂ¦"
            rows={14}
            className="w-full bg-zinc-950 border border-zinc-800 rounded p-3 text-sm font-mono"
          />
          <div className="mt-3 flex items-center justify-between">
            <div className="text-xs text-zinc-500">
              {script.trim().length} characters ÃÂ· {script.split(/\n+/).length} lines
            </div>
            <button
              onClick={() =>
                analyzeMut.mutate({ projectId, script })
              }
              disabled={analyzeMut.isPending || script.trim().length < 40}
              className="bg-amber-500 hover:bg-amber-400 text-black px-4 py-2 rounded text-sm font-medium disabled:opacity-50"
            >
              {analyzeMut.isPending ? "AnalyzingÃ¢ÂÂ¦" : "Analyze script Ã¢ÂÂ"}
            </button>
          </div>
          {analyzeMut.error && (
            <div className="mt-2 text-xs text-rose-300">{analyzeMut.error.message}</div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          {warnings.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded p-3 text-xs text-amber-200">
              {warnings.map((w, i) => (
                <div key={i}>ÃÂ· {w}</div>
              ))}
            </div>
          )}
          <div className="text-sm text-zinc-300">
            Proposing <strong>{proposed.length}</strong> scene{proposed.length === 1 ? "" : "s"}
            {source ? ` (${source} source)` : ""}. Uncheck anything you don't want Ã¢ÂÂ only ticked rows are saved.
          </div>

          {/* Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ Section 1: Story Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ */}
          {(storyTitle || storyLogline || storyGenre || storyTone || storyThemes.length > 0) && (
            <details className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-4" open>
              <summary className="cursor-pointer text-sm font-semibold text-zinc-100">
                Story
              </summary>
              <div className="mt-3 space-y-1.5 text-xs text-zinc-300">
                {storyTitle && (
                  <div><span className="text-zinc-500">Title:</span> <span className="text-zinc-100">{storyTitle}</span></div>
                )}
                {storyLogline && (
                  <div><span className="text-zinc-500">Logline:</span> <span className="text-zinc-100">{storyLogline}</span></div>
                )}
                {storyGenre && (
                  <div><span className="text-zinc-500">Genre:</span> <span className="text-zinc-100">{storyGenre}</span></div>
                )}
                {storyTone && (
                  <div><span className="text-zinc-500">Tone:</span> <span className="text-zinc-100">{storyTone}</span></div>
                )}
                {storyThemes.length > 0 && (
                  <div>
                    <span className="text-zinc-500">Themes:</span>{" "}
                    <span className="text-zinc-100">{storyThemes.join(" ÃÂ· ")}</span>
                  </div>
                )}
                <div className="pt-1 text-[11px] text-zinc-500 italic">
                  Story metadata is shown for context only Ã¢ÂÂ it isn't written to the project.
                </div>
              </div>
            </details>
          )}

          {/* Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ Section 2: Characters Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ */}
          {proposedChars.length > 0 && (
            <details className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-4" open>
              <summary className="cursor-pointer text-sm font-semibold text-zinc-100 flex items-center justify-between">
                <span>Characters ÃÂ· {acceptedChars.length} / {proposedChars.length} selected</span>
              </summary>
              <ul className="mt-3 divide-y divide-zinc-800">
                {proposedChars.map((c) => {
                  const k = c.name.toLowerCase();
                  return (
                    <li key={k}>
                      <label className="flex items-start gap-3 py-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!skippedChars[k]}
                          onChange={(e) =>
                            setSkippedChars((prev) => ({ ...prev, [k]: !e.target.checked }))
                          }
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-zinc-100 font-medium">
                            {c.name}
                            {c.role && <span className="ml-2 text-[10px] uppercase tracking-wider text-amber-300/80">{c.role}</span>}
                          </div>
                          {c.description && (
                            <div className="text-xs text-zinc-400 line-clamp-2">{c.description}</div>
                          )}
                        </div>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </details>
          )}

          {/* Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ Section 3: Locations Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ */}
          {proposedLocs.length > 0 && (
            <details className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-4" open>
              <summary className="cursor-pointer text-sm font-semibold text-zinc-100 flex items-center justify-between">
                <span>Locations ÃÂ· {acceptedLocs.length} / {proposedLocs.length} selected</span>
              </summary>
              <ul className="mt-3 divide-y divide-zinc-800">
                {proposedLocs.map((l) => {
                  const k = l.name.toLowerCase();
                  return (
                    <li key={k}>
                      <label className="flex items-start gap-3 py-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!skippedLocs[k]}
                          onChange={(e) =>
                            setSkippedLocs((prev) => ({ ...prev, [k]: !e.target.checked }))
                          }
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-zinc-100 font-medium">
                            {l.name}
                            {l.locationType && <span className="ml-2 text-[10px] uppercase tracking-wider text-amber-300/80">{l.locationType}</span>}
                          </div>
                          {l.description && (
                            <div className="text-xs text-zinc-400 line-clamp-2">{l.description}</div>
                          )}
                        </div>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </details>
          )}

          {/* Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ Section 4: Props Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ */}
          {proposedProps.length > 0 && (
            <details className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-4" open>
              <summary className="cursor-pointer text-sm font-semibold text-zinc-100 flex items-center justify-between">
                <span>Props ÃÂ· {acceptedProps.length} / {proposedProps.length} selected</span>
              </summary>
              <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                {proposedProps.map((p) => {
                  const k = p.toLowerCase();
                  return (
                    <li key={k}>
                      <label className="flex items-center gap-2 py-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!skippedProps[k]}
                          onChange={(e) =>
                            setSkippedProps((prev) => ({ ...prev, [k]: !e.target.checked }))
                          }
                        />
                        <span className="text-xs text-zinc-200">{p}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-2 text-[11px] text-zinc-500 italic">
                Selected props are saved on the relevant scenes (and shown in production notes).
              </div>
            </details>
          )}

          {/* Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ Section 5: Scenes Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ */}
          <details className="bg-zinc-900/60 border border-zinc-800 rounded-lg" open>
            <summary className="cursor-pointer p-4 text-sm font-semibold text-zinc-100">
              Scenes ÃÂ· {accepted.length} / {proposed.length} selected
            </summary>
            <div className="divide-y divide-zinc-800 max-h-[60vh] overflow-y-auto">
              {proposed.map((s) => (
                <label
                  key={s.sceneNumber}
                  className="flex items-start gap-3 p-3 hover:bg-amber-500/10 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={!skipped[s.sceneNumber]}
                    onChange={(e) =>
                      setSkipped((prev) => ({
                        ...prev,
                        [s.sceneNumber]: !e.target.checked,
                      }))
                    }
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <span>Scene {s.sceneNumber}</span>
                      {s.location && <span>ÃÂ· {s.location}</span>}
                      {s.timeOfDay && <span>ÃÂ· {s.timeOfDay}</span>}
                      {s.mood && <span>ÃÂ· {s.mood}</span>}
                      <span>ÃÂ· ~{s.estimatedDuration}s</span>
                    </div>
                    <div className="text-sm text-zinc-100 font-medium truncate">
                      {s.title}
                    </div>
                    <div className="text-xs text-zinc-400 line-clamp-2">{s.description}</div>
                    {s.characters.length > 0 && (
                      <div className="mt-1 text-[10px] text-amber-200/80">
                        {s.characters.join(" ÃÂ· ")}
                      </div>
                    )}
                    {/* v6.74 Ã¢ÂÂ surface props/shots/continuity per scene so the
                        user can spot-check before approving. Each is rendered
                        only when present so old payloads stay clean. */}
                    {s.props.length > 0 && (
                      <div className="mt-1 text-[10px] text-zinc-400">
                        <span className="text-zinc-500">Props:</span> {s.props.join(", ")}
                      </div>
                    )}
                    {s.shotSuggestions.length > 0 && (
                      <div className="mt-1 text-[10px] text-zinc-400">
                        <span className="text-zinc-500">Shots:</span>{" "}
                        {s.shotSuggestions.map((sh, i) => {
                          const parts = [sh.shotType, sh.lens, sh.movement, sh.framing].filter(Boolean);
                          const label = parts.join(" / ") || (sh.notes ? sh.notes.slice(0, 40) : "shot");
                          return <span key={i} className="mr-2">ÃÂ· {label}</span>;
                        })}
                      </div>
                    )}
                    {s.continuityNotes && (
                      <div className="mt-1 text-[10px] text-amber-300/80">
                        <span className="text-amber-300">Continuity:</span> {s.continuityNotes}
                      </div>
                    )}
                    {s.dialogue && (
                      <div className="mt-1 text-[10px] text-zinc-500 italic line-clamp-1">
                        Ã¢ÂÂ{s.dialogue}Ã¢ÂÂ
                      </div>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </details>

          {/* v6.73 Ã¢ÂÂ Append vs replace prompt. Only shown when the project
              already has scenes; in fresh projects there's nothing to
              replace so we hide the choice entirely. */}
          {existingSceneCount > 0 && (
            <div className="bg-gradient-to-r from-amber-950/10 via-zinc-900/40 to-zinc-900/40 border border-zinc-800 rounded p-3 space-y-2">
              <div className="text-xs text-zinc-300">
                This project already has <strong>{existingSceneCount}</strong> scene
                {existingSceneCount === 1 ? "" : "s"}. How should these be applied?
              </div>
              <div className="flex flex-col gap-1">
                <label className="flex items-center gap-2 text-xs text-zinc-200 cursor-pointer">
                  <input
                    type="radio"
                    name="mode"
                    checked={mode === "append"}
                    onChange={() => setMode("append")}
                  />
                  <span><strong>Append</strong> Ã¢ÂÂ add these as new scenes after the existing ones (safe).</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-rose-200 cursor-pointer">
                  <input
                    type="radio"
                    name="mode"
                    checked={mode === "replace"}
                    onChange={() => setMode("replace")}
                  />
                  <span><strong>Replace</strong> Ã¢ÂÂ delete all existing scenes first, then create these (destructive).</span>
                </label>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <button
              onClick={() => setStep(1)}
              className="text-xs text-zinc-400 hover:underline"
            >
              Ã¢ÂÂ Back
            </button>
            <button
              onClick={() => {
                // v6.73 Ã¢ÂÂ Replace requires an explicit destructive confirm
                // before we even send the mutation. The backend also
                // double-checks via confirmReplace, so this can't slip past
                // a missed UI guard.
                if (mode === "replace" && existingSceneCount > 0) {
                  const ok = window.confirm(
                    `Replace mode will permanently delete ${existingSceneCount} existing scene` +
                    `${existingSceneCount === 1 ? "" : "s"} from this project before creating ` +
                    `${accepted.length} new one${accepted.length === 1 ? "" : "s"}. ` +
                    `This cannot be undone. Continue?`,
                  );
                  if (!ok) return;
                }
                // v6.74 Ã¢ÂÂ only send props/characters that the user actually
                // ticked. Per-scene props are filtered to the project-wide
                // accepted set so a deselected prop disappears everywhere.
                const acceptedPropSet = new Set(acceptedProps.map((p) => p.toLowerCase()));
                const acceptedCharSet = new Set(acceptedChars.map((c) => c.name.toLowerCase()));
                const scenesToSend = accepted.map((s) => ({
                  sceneNumber: s.sceneNumber,
                  title: s.title,
                  description: s.description,
                  location: s.location,
                  timeOfDay: s.timeOfDay as any,
                  mood: s.mood,
                  characters: s.characters.filter((c) => acceptedCharSet.has(c.toLowerCase())),
                  estimatedDuration: s.estimatedDuration,
                  dialogue: s.dialogue,
                  props: s.props.filter((p) => acceptedPropSet.has(p.toLowerCase())),
                  shotSuggestions: s.shotSuggestions,
                  continuityNotes: s.continuityNotes,
                }));
                applyMut.mutate({
                  projectId,
                  mode,
                  confirmReplace: mode === "replace",
                  scenes: scenesToSend as any,
                  characters: acceptedChars as any,
                  locations: acceptedLocs as any,
                });
              }}
              disabled={applyMut.isPending || accepted.length === 0}
              className={`px-4 py-2 rounded text-sm font-medium disabled:opacity-50 ${
                mode === "replace"
                  ? "bg-rose-500 hover:bg-rose-400 text-white"
                  : "bg-amber-500 hover:bg-amber-400 text-black"
              }`}
            >
              {applyMut.isPending
                ? (mode === "replace" ? "ReplacingÃ¢ÂÂ¦" : "ApplyingÃ¢ÂÂ¦")
                : (mode === "replace"
                    ? `Replace ${existingSceneCount} Ã¢ÂÂ ${accepted.length}`
                    : `Apply ${accepted.length} scene${accepted.length === 1 ? "" : "s"}`)}
            </button>
          </div>
          {applyMut.error && (
            <div className="text-xs text-rose-300">{applyMut.error.message}</div>
          )}
        </div>
      )}

      {step === 3 && (
        // v6.73 Ã¢ÂÂ Rich post-apply summary: created + (if replace) deleted +
        // reused vs new characters/locations + missing references + clear
        // next-action call-outs. v6.74 Ã¢ÂÂ also calls out characters/locations
        // we actually created from the breakdown.
        <div className="space-y-4">
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-6">
            <div className="text-emerald-200 text-lg font-medium mb-1">
              Breakdown applied.
            </div>
            <div className="text-sm text-zinc-300">
              {applyMut.data?.created ?? 0} new scene
              {applyMut.data?.created === 1 ? "" : "s"} added to your project
              {(applyMut.data?.deleted ?? 0) > 0
                ? ` ÃÂ· ${applyMut.data!.deleted} previous scene${applyMut.data!.deleted === 1 ? "" : "s"} replaced`
                : ""}
              {((applyMut.data?.summary as any)?.createdCharacters?.length ?? 0) > 0
                ? ` ÃÂ· ${(applyMut.data!.summary as any).createdCharacters.length} character${(applyMut.data!.summary as any).createdCharacters.length === 1 ? "" : "s"} imported`
                : ""}
              {((applyMut.data?.summary as any)?.createdLocations?.length ?? 0) > 0
                ? ` ÃÂ· ${(applyMut.data!.summary as any).createdLocations.length} location${(applyMut.data!.summary as any).createdLocations.length === 1 ? "" : "s"} imported`
                : ""}
              .
            </div>
            {applyMut.data?.failures && applyMut.data.failures.length > 0 && (
              <div className="mt-2 text-xs text-rose-300">
                {applyMut.data.failures.length} scene{applyMut.data.failures.length === 1 ? "" : "s"} failed to save:
                <ul className="list-disc ml-5 mt-1">
                  {applyMut.data.failures.map((f) => (
                    <li key={f.sceneNumber}>Scene {f.sceneNumber}: {f.error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {applyMut.data?.summary && (
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-4 space-y-3">
              <div className="text-sm font-semibold text-zinc-100">Summary</div>
              {(applyMut.data.summary.reusedCharacters.length > 0 ||
                applyMut.data.summary.newCharacters.length > 0 ||
                ((applyMut.data.summary as any).createdCharacters?.length ?? 0) > 0) && (
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-amber-300/80 mb-1">
                    Characters
                  </div>
                  {((applyMut.data.summary as any).createdCharacters?.length ?? 0) > 0 && (
                    <div className="text-xs text-emerald-200">
                      Imported: {(applyMut.data.summary as any).createdCharacters.join(", ")}
                    </div>
                  )}
                  {applyMut.data.summary.reusedCharacters.length > 0 && (
                    <div className="text-xs text-emerald-200/80">
                      Reused: {applyMut.data.summary.reusedCharacters.join(", ")}
                    </div>
                  )}
                  {applyMut.data.summary.newCharacters.length > 0 && (
                    <div className="text-xs text-amber-200">
                      New (not yet in your project): {applyMut.data.summary.newCharacters.join(", ")}
                    </div>
                  )}
                </div>
              )}
              {(applyMut.data.summary.reusedLocations.length > 0 ||
                applyMut.data.summary.newLocations.length > 0 ||
                ((applyMut.data.summary as any).createdLocations?.length ?? 0) > 0) && (
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-amber-300/80 mb-1">
                    Locations
                  </div>
                  {((applyMut.data.summary as any).createdLocations?.length ?? 0) > 0 && (
                    <div className="text-xs text-emerald-200">
                      Imported: {(applyMut.data.summary as any).createdLocations.join(", ")}
                    </div>
                  )}
                  {applyMut.data.summary.reusedLocations.length > 0 && (
                    <div className="text-xs text-emerald-200/80">
                      Reused: {applyMut.data.summary.reusedLocations.join(", ")}
                    </div>
                  )}
                  {applyMut.data.summary.newLocations.length > 0 && (
                    <div className="text-xs text-amber-200">
                      New (not yet in your project): {applyMut.data.summary.newLocations.join(", ")}
                    </div>
                  )}
                </div>
              )}
              {applyMut.data.summary.missingReferences.length > 0 && (
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-amber-300/80 mb-1">
                    Missing references Ã¢ÂÂ fix these before generating video
                  </div>
                  <ul className="text-xs text-rose-200 list-disc ml-5 space-y-0.5">
                    {applyMut.data.summary.missingReferences.map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Link href={`/projects/${projectId}`}>
              <a className="inline-block bg-amber-500 hover:bg-amber-400 text-black px-4 py-2 rounded text-sm font-medium">
                Open project
              </a>
            </Link>
            <Link href={`/projects/${projectId}/storyboard`}>
              <a className="inline-block bg-zinc-800 hover:bg-amber-500/10 text-zinc-100 px-4 py-2 rounded text-sm">
                Open storyboard
              </a>
            </Link>
            {applyMut.data?.summary && applyMut.data.summary.newCharacters.length > 0 && (
              <Link href={`/projects/${projectId}/characters`}>
                <a className="inline-block bg-zinc-800 hover:bg-amber-500/10 text-zinc-100 px-4 py-2 rounded text-sm">
                  Add reference images
                </a>
              </Link>
            )}
          </div>
        </div>
      )}
      </div>
  );
}
