// v6.73 Phase 4 — ContinuityWarningsPanel.
//
// Project-wide rollup of generation-readiness warnings/missing items.
// Sits next to ElementsPanel (which lists what *is* there) — this one lists
// what is *missing* so users can see at a glance what to fix before they
// spend video credits.
//
// Pure read. Uses elements.getProjectReadiness which itself is read-only.

import { trpc } from "../lib/trpc";

type Props = { projectId: number };

function scoreClass(score: number): string {
  if (score >= 80) return "bg-emerald-500/15 text-emerald-200 border-emerald-500/40";
  if (score >= 50) return "bg-amber-500/15 text-amber-200 border-amber-500/40";
  return "bg-rose-500/15 text-rose-200 border-rose-500/40";
}

export default function ContinuityWarningsPanel({ projectId }: Props) {
  const q = trpc.elements.getProjectReadiness.useQuery({ projectId }, { enabled: !!projectId });

  if (q.isLoading) {
    return <div className="text-sm text-zinc-400">Computing readiness…</div>;
  }
  if (q.error) {
    return (
      <div className="text-sm text-rose-300">
        Couldn't compute readiness: {q.error.message}
      </div>
    );
  }
  const data = q.data;
  if (!data || data.totalScenes === 0) {
    return (
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-4">
        <div className="text-sm font-semibold text-zinc-100 mb-1">Continuity Readiness</div>
        <div className="text-xs text-zinc-500 italic">
          No scenes yet — use the Script Breakdown wizard to populate scenes, then this panel will surface what's missing.
        </div>
      </div>
    );
  }

  // Collect per-issue counts so the top of the panel summarizes the whole
  // project at a glance instead of forcing the user to scroll a long list.
  const issueCounts = new Map<string, number>();
  for (const s of data.scenes) {
    for (const m of s.missing) issueCounts.set(m, (issueCounts.get(m) ?? 0) + 1);
    for (const w of s.warnings) issueCounts.set(w, (issueCounts.get(w) ?? 0) + 1);
  }
  const topIssues = Array.from(issueCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const scoreCls = scoreClass(data.averageScore);

  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-zinc-100">Continuity Readiness</div>
          <div className="text-xs text-zinc-500">
            {data.totalScenes} scene{data.totalScenes === 1 ? "" : "s"} · check before generating video
          </div>
        </div>
        <div className={`text-sm font-medium px-3 py-1 rounded border ${scoreCls}`}>
          {data.averageScore} / 100
        </div>
      </div>

      {topIssues.length > 0 && (
        <div>
          <div className="text-[11px] uppercase tracking-wide text-amber-300/80 mb-1">
            Top issues across the project
          </div>
          <ul className="text-xs text-zinc-300 space-y-1">
            {topIssues.map(([issue, count]) => (
              <li key={issue} className="flex items-start gap-2">
                <span className="text-zinc-500 shrink-0">×{count}</span>
                <span>{issue}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <div className="text-[11px] uppercase tracking-wide text-amber-300/80 mb-1">
          Per-scene breakdown
        </div>
        <ul className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
          {data.scenes.map((s) => {
            const cls = scoreClass(s.score);
            const hasIssues = s.warnings.length > 0 || s.missing.length > 0;
            return (
              <li key={s.sceneId} className="text-xs">
                <div className="flex items-center gap-2">
                  <span className={`px-1.5 py-0.5 rounded border text-[10px] ${cls}`}>
                    {s.score}
                  </span>
                  <span className="text-zinc-400 shrink-0">Scene {s.sceneNumber}</span>
                  <span className="text-zinc-200 truncate">{s.title}</span>
                </div>
                {hasIssues && (
                  <ul className="mt-0.5 ml-9 text-[11px] text-zinc-500 space-y-0.5">
                    {s.missing.map((m, i) => (
                      <li key={`m${i}`} className="text-rose-300/90">· {m}</li>
                    ))}
                    {s.warnings.map((w, i) => (
                      <li key={`w${i}`} className="text-amber-200/80">· {w}</li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
