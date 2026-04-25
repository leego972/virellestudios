// v6.69 Phase 3 — Script-to-Storyboard Breakdown Wizard.
//
// Three steps:
//   1. Load the project's existing script (or paste a new one).
//   2. Review the proposed scene breakdown (with toggles to remove rows).
//   3. Apply — creates scenes for the project, returns the count.
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
          <div className="mt-3 flex items-center justify-between">
            <button
              onClick={() => setStep(1)}
              className="text-xs text-zinc-400 hover:underline"
            >
              ← Back
            </button>
            <button
              onClick={() =>
                applyMut.mutate({ projectId, scenes: accepted as any })
              }
              disabled={applyMut.isPending || accepted.length === 0}
              className="bg-amber-500 hover:bg-amber-400 text-black px-4 py-2 rounded text-sm font-medium disabled:opacity-50"
            >
              {applyMut.isPending ? "Applying…" : `Apply ${accepted.length} scene${accepted.length === 1 ? "" : "s"}`}
            </button>
          </div>
          {applyMut.error && (
            <div className="mt-2 text-xs text-rose-300">{applyMut.error.message}</div>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-6 text-center">
          <div className="text-emerald-200 text-lg font-medium mb-2">
            Breakdown applied.
          </div>
          <div className="text-sm text-zinc-300 mb-4">
            {applyMut.data?.created ?? 0} new scene
            {applyMut.data?.created === 1 ? "" : "s"} added to your project.
          </div>
          <Link href={`/projects/${projectId}`}>
            <a className="inline-block bg-amber-500 hover:bg-amber-400 text-black px-4 py-2 rounded text-sm font-medium">
              Open project
            </a>
          </Link>
        </div>
      )}
    </div>
  );
}
