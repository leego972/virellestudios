// v6.69 Phase 3 — Script-to-Storyboard Breakdown Wizard.
// v6.73 Phase 2 — Polish: append/replace mode (with destructive confirm),
// post-apply summary (created / reused / new / missing references).
//
// Three steps:
//   1. Load the project's existing script (or paste a new one).
//   2. Review the proposed scene breakdown (with toggles to remove rows).
//      If the project already has scenes, prompt for append vs replace.
//   3. Apply — creates scenes for the project, then shows a rich summary
//      (created scenes, reused/new characters & locations, missing
//      references, next-action shortcuts).
//
// All AI calls are server-side; this page only renders proposals and lets the
// user explicitly approve before any DB write happens.

import { useState, useMemo } from "react";
import { useParams, Link } from "wouter";
import { trpc } from "../lib/trpc";

type ProposedScene = {
  sceneNumber: number;
  title: string;
  description: string;
  location: string | null;
  timeOfDay: string | null;
  mood: string | null;
  characters: string[];
  estimatedDuration: number;
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
  // v6.73 — append (default, safe) vs replace (destructive, requires
  // explicit double-confirmation before we send the mutation).
  const [mode, setMode] = useState<"append" | "replace">("append");

  const analyzeMut = trpc.preproduction.analyzeScriptForBreakdown.useMutation({
    onSuccess: (data: any) => {
      setProposed(data?.scenes ?? []);
      setWarnings(data?.warnings ?? []);
      setSource(data?.source ?? "");
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
  // v6.73 — Surface the existing scene count so the user can decide between
  // append and replace with full information.
  const existingSceneCount: number =
    Array.isArray(project?.scenes) ? project.scenes.length :
    typeof project?.sceneCount === "number" ? project.sceneCount :
    0;

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      <div className="flex items-center gap-3 mb-4">
        <Link href={`/projects/${projectId}/command-center`}>
          <a className="text-sm text-amber-300 hover:underline">← Command Center</a>
        </Link>
        <h1 className="text-2xl font-semibold text-zinc-100">Script-to-Scene Breakdown</h1>
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
            Step {n} —{" "}
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
            placeholder="Paste your screenplay here…"
            rows={14}
            className="w-full bg-zinc-950 border border-zinc-800 rounded p-3 text-sm font-mono"
          />
          <div className="mt-3 flex items-center justify-between">
            <div className="text-xs text-zinc-500">
              {script.trim().length} characters · {script.split(/\n+/).length} lines
            </div>
            <button
              onClick={() =>
                analyzeMut.mutate({ projectId, script })
              }
              disabled={analyzeMut.isPending || script.trim().length < 40}
              className="bg-amber-500 hover:bg-amber-400 text-black px-4 py-2 rounded text-sm font-medium disabled:opacity-50"
            >
              {analyzeMut.isPending ? "Analyzing…" : "Analyze script →"}
            </button>
          </div>
          {analyzeMut.error && (
            <div className="mt-2 text-xs text-rose-300">{analyzeMut.error.message}</div>
          )}
        </div>
      )}

      {step === 2 && (
        <div>
          {warnings.length > 0 && (
            <div className="mb-3 bg-amber-500/10 border border-amber-500/30 rounded p-3 text-xs text-amber-200">
              {warnings.map((w, i) => (
                <div key={i}>· {w}</div>
              ))}
            </div>
          )}
          <div className="text-sm text-zinc-300 mb-3">
            Proposing <strong>{proposed.length}</strong> scenes
            {source ? ` (${source} source)` : ""}. Uncheck any rows you don't
            want, then click Apply.
          </div>
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg divide-y divide-zinc-800 max-h-[60vh] overflow-y-auto">
            {proposed.map((s) => (
              <label
                key={s.sceneNumber}
                className="flex items-start gap-3 p-3 hover:bg-zinc-900 cursor-pointer"
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
                    {s.location && <span>· {s.location}</span>}
                    {s.timeOfDay && <span>· {s.timeOfDay}</span>}
                    {s.mood && <span>· {s.mood}</span>}
                    <span>· ~{s.estimatedDuration}s</span>
                  </div>
                  <div className="text-sm text-zinc-100 font-medium truncate">
                    {s.title}
                  </div>
                  <div className="text-xs text-zinc-400 line-clamp-2">{s.description}</div>
                  {s.characters.length > 0 && (
                    <div className="mt-1 text-[10px] text-amber-200/80">
                      {s.characters.join(" · ")}
                    </div>
                  )}
                </div>
              </label>
            ))}
          </div>
          {/* v6.73 — Append vs replace prompt. Only shown when the project
              already has scenes; in fresh projects there's nothing to
              replace so we hide the choice entirely. */}
          {existingSceneCount > 0 && (
            <div className="mt-3 bg-zinc-900/40 border border-zinc-800 rounded p-3 space-y-2">
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
                  <span><strong>Append</strong> — add these as new scenes after the existing ones (safe).</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-rose-200 cursor-pointer">
                  <input
                    type="radio"
                    name="mode"
                    checked={mode === "replace"}
                    onChange={() => setMode("replace")}
                  />
                  <span><strong>Replace</strong> — delete all existing scenes first, then create these (destructive).</span>
                </label>
              </div>
            </div>
          )}
          <div className="mt-3 flex items-center justify-between">
            <button
              onClick={() => setStep(1)}
              className="text-xs text-zinc-400 hover:underline"
            >
              ← Back
            </button>
            <button
              onClick={() => {
                // v6.73 — Replace requires an explicit destructive confirm
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
                applyMut.mutate({
                  projectId,
                  mode,
                  confirmReplace: mode === "replace",
                  scenes: accepted as any,
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
                ? (mode === "replace" ? "Replacing…" : "Applying…")
                : (mode === "replace"
                    ? `Replace ${existingSceneCount} → ${accepted.length}`
                    : `Apply ${accepted.length} scene${accepted.length === 1 ? "" : "s"}`)}
            </button>
          </div>
          {applyMut.error && (
            <div className="mt-2 text-xs text-rose-300">{applyMut.error.message}</div>
          )}
        </div>
      )}

      {step === 3 && (
        // v6.73 — Rich post-apply summary: created + (if replace) deleted +
        // reused vs new characters/locations + missing references + clear
        // next-action call-outs. No expensive AI/video work is started
        // automatically — every next step is a deliberate click.
        <div className="space-y-4">
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-6">
            <div className="text-emerald-200 text-lg font-medium mb-1">
              Breakdown applied.
            </div>
            <div className="text-sm text-zinc-300">
              {applyMut.data?.created ?? 0} new scene
              {applyMut.data?.created === 1 ? "" : "s"} added to your project
              {(applyMut.data?.deleted ?? 0) > 0
                ? ` · ${applyMut.data!.deleted} previous scene${applyMut.data!.deleted === 1 ? "" : "s"} replaced`
                : ""}.
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
                applyMut.data.summary.newCharacters.length > 0) && (
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-amber-300/80 mb-1">
                    Characters
                  </div>
                  {applyMut.data.summary.reusedCharacters.length > 0 && (
                    <div className="text-xs text-emerald-200">
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
                applyMut.data.summary.newLocations.length > 0) && (
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-amber-300/80 mb-1">
                    Locations
                  </div>
                  {applyMut.data.summary.reusedLocations.length > 0 && (
                    <div className="text-xs text-emerald-200">
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
                    Missing references — fix these before generating video
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
              <a className="inline-block bg-zinc-800 hover:bg-zinc-700 text-zinc-100 px-4 py-2 rounded text-sm">
                Open storyboard
              </a>
            </Link>
            {applyMut.data?.summary && applyMut.data.summary.newCharacters.length > 0 && (
              <Link href={`/projects/${projectId}/characters`}>
                <a className="inline-block bg-zinc-800 hover:bg-zinc-700 text-zinc-100 px-4 py-2 rounded text-sm">
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
