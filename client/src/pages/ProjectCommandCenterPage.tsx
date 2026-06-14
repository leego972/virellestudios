// v6.68 Phase 2 — Project Command Center.
// Single page where users can see what is missing in their film and what to do
// next. All data is derived server-side from the existing tables; no
// expensive AI work is triggered from this view.

import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import SiteHead from "@/components/SiteHead";
import ElementsPanel from "@/components/ElementsPanel";
// v6.74 — Continuity warnings rollup. Sits next to ElementsPanel so users
// see what's missing per scene at a glance before spending video credits.
import ContinuityWarningsPanel from "@/components/ContinuityWarningsPanel";

function statusDot(ok: boolean) {
  return (
    <span
      className={
        "inline-block w-2 h-2 rounded-full mr-2 " +
        (ok ? "bg-emerald-400" : "bg-zinc-600")
      }
    />
  );
}

function fmtRuntime(seconds: number): string {
  if (!seconds || seconds < 1) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function ProjectCommandCenterPage() {
  const params = useParams<{ id: string }>();
  const projectId = Number(params?.id);
  const projectQ = trpc.project.get.useQuery(
    { id: projectId },
    { enabled: Number.isFinite(projectId) },
  );
  const healthQ = trpc.project.getHealthSummary.useQuery(
    { projectId },
    { enabled: Number.isFinite(projectId), refetchInterval: 15000 },
  );

  const project = (projectQ.data as any) ?? null;
  const h = healthQ.data;

  return (
    <div className="min-h-screen text-zinc-100 px-6 py-8" style={{ background:"linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)" }}>
      <SiteHead title={`Command Center — ${project?.title ?? "Project"}`} />
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <div className="text-xs uppercase tracking-wider text-amber-400/80">
              Project Command Center
            </div>
            <h1 className="text-3xl font-semibold mt-1 gradient-text-gold">
              {project?.title ?? "Untitled project"}
            </h1>
            <p className="text-zinc-400 text-sm mt-1">
              One place to see what your film needs next.
            </p>
          </div>
          <Link
            href={`/projects/${projectId}`}
            className="text-xs bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded text-zinc-200"
          >
            Back to project
          </Link>
        </header>

        {(projectQ.isLoading || healthQ.isLoading) && (
          <div className="text-sm text-zinc-500">Loading project health…</div>
        )}

        {h && (
          <>
            {h.nextBestAction && (
              <section className="border border-amber-500/40 bg-amber-500/5 rounded-lg p-5 flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="text-xs uppercase tracking-wider text-amber-300 mb-1">
                    Next best action
                  </div>
                  <div className="text-lg font-medium text-zinc-100">
                    {h.nextBestAction.label}
                  </div>
                  <div className="text-sm text-zinc-400 mt-1">
                    {h.nextBestAction.reason}
                  </div>
                </div>
                <Link
                  href={h.nextBestAction.href}
                  className="bg-amber-500 hover:bg-amber-400 text-black px-4 py-2 rounded text-sm font-medium"
                >
                  Take me there
                </Link>
              </section>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card title="Story">
                <Row ok={h.story.hasScript} label="Script attached" />
                <Row ok={h.story.hasLogline} label="Logline / description" />
                <Row ok={h.story.hasPlotSummary} label="Plot summary" />
                <Stat label="Scenes" value={h.story.sceneCount} />
                <Stat
                  label="Shot list coverage"
                  value={`${h.story.shotListCoveragePct}%`}
                />
              </Card>

              <Card title="Cast & Continuity">
                <Stat label="Characters" value={h.cast.characterCount} />
                <Stat
                  label="With descriptions"
                  value={`${h.cast.charactersWithDescription} / ${h.cast.characterCount}`}
                />
                <Stat
                  label="With reference images"
                  value={`${h.cast.charactersWithReferenceImages} / ${h.cast.characterCount}`}
                />
                {h.cast.consistencyWarnings.length > 0 && (
                  <ul className="mt-2 space-y-1 text-xs text-amber-300/90 list-disc list-inside">
                    {h.cast.consistencyWarnings.map((w: string, i: number) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                )}
              </Card>

              <Card title="Production">
                <Stat label="Total scenes" value={h.production.totalScenes} />
                <Stat
                  label="Generated"
                  value={`${h.production.generatedScenes} / ${h.production.totalScenes}`}
                />
                <Stat label="Pending" value={h.production.pendingScenes} />
                <Stat label="Failed" value={h.production.failedScenes} />
                <Stat label="Approved" value={h.production.approvedScenes} />
                <Stat
                  label="Estimated runtime"
                  value={fmtRuntime(h.production.estimatedRuntimeSeconds)}
                />
              </Card>

              <Card title="Post-Production">
                <Row ok={h.postProduction.subtitlesReady} label="Subtitles" />
                <Row ok={h.postProduction.soundtrackReady} label="Soundtrack" />
                <Row ok={h.postProduction.creditsReady} label="Opening / closing credits" />
                <Row
                  ok={h.postProduction.colorGradingChosen}
                  label="Color grading selected"
                />
                <Row ok={h.postProduction.exportReady} label="Export ready" />
                {h.postProduction.exportBlockers.length > 0 && (
                  <ul className="mt-2 space-y-1 text-xs text-amber-300/90 list-disc list-inside">
                    {h.postProduction.exportBlockers.map((w: string, i: number) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                )}
              </Card>

              <Card title="Monetization & usage">
                <Stat label="Credit balance" value={h.monetization.creditBalance} />
                <Stat
                  label="Provider mode"
                  value={h.monetization.providerMode}
                />
                <Stat
                  label="Preferred video provider"
                  value={h.monetization.preferredVideoProvider ?? "platform default"}
                />
                <Stat
                  label="Preferred LLM provider"
                  value={h.monetization.preferredLlmProvider ?? "platform default"}
                />
                <div className="mt-3">
                  <Link
                    href="/settings/byok"
                    className="text-xs underline text-zinc-300 hover:text-white"
                  >
                    Manage BYOK keys & provider preferences
                  </Link>
                </div>
              </Card>

              <Card title="Episodic">
                <Row
                  ok={h.isEpisodic}
                  label={
                    h.isEpisodic
                      ? "Episodic project — Auto Recap available"
                      : "Standalone project (Auto Recap is for episodic only)"
                  }
                />
                {h.isEpisodic && (
                  <div className="mt-3">
                    <Link
                      href={`/projects/${projectId}/auto-recap`}
                      className="text-xs underline text-zinc-300 hover:text-white"
                    >
                      Open Auto Recap →
                    </Link>
                  </div>
                )}
              </Card>
            </div>
            {/* v6.69 — Production Elements + Script Breakdown shortcuts. */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <ElementsPanel projectId={projectId} />
              </div>
              <div className="border border-zinc-800 bg-zinc-900/40 rounded-lg p-5 flex flex-col">
                <h2 className="text-sm uppercase tracking-wider mb-3 gradient-text-gold">Quick actions</h2>
                <Link
                  href={`/projects/${projectId}/script-breakdown`}
                  className="text-sm text-amber-300 hover:underline mb-2"
                >
                  Run script-to-scene breakdown →
                </Link>
                <Link
                  href={`/projects/${projectId}/pitch-deck`}
                  className="text-sm text-amber-300 hover:underline mb-2"
                >
                  Open pitch deck →
                </Link>
                <Link
                  href={`/projects/${projectId}/brands`}
                  className="text-sm text-amber-300 hover:underline mb-2"
                >
                  Manage allowed brands →
                </Link>
                <Link
                  href={`/projects/${projectId}/wardrobe`}
                  className="text-sm text-amber-300 hover:underline mb-2"
                >
                  Designer Wardrobe (costumes, fashion, props) →
                </Link>
                <Link
                  href={`/awaiting-review`}
                  className="text-sm text-amber-300 hover:underline"
                >
                  Awaiting your review →
                </Link>
              </div>
            </div>
            {/* v6.74 Phase 4 — Continuity warnings panel. Sits BELOW the
                Elements panel so the order is: what's there → what's missing.
                The panel is a pure read; no expensive work is triggered. */}
            <div className="mt-4">
              <ContinuityWarningsPanel projectId={projectId} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border border-zinc-800 bg-zinc-900/40 rounded-lg p-5">
      <h2 className="text-sm uppercase tracking-wider mb-3 gradient-text-gold">{title}</h2>
      <div className="space-y-1.5">{children}</div>
    </section>
  );
}

function Row({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center text-sm text-zinc-200">
      {statusDot(ok)}
      <span>{label}</span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-zinc-400">{label}</span>
      <span className="text-zinc-100 font-medium">{value}</span>
    </div>
  );
}
