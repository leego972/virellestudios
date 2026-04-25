import { useMemo, useState } from "react";
import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";

type Length = 60 | 90 | 120;
type Style = "cinematic" | "suspenseful" | "fast-cut" | "emotional" | "minimal";
type Resolution = "720p" | "1080p" | "4k";

export default function AutoRecapPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = parseInt(id || "0", 10);

  const { data: project } = trpc.project.get.useQuery(
    { id: projectId },
    { enabled: !!projectId }
  );
  const { data: allMovies = [] } = trpc.movie.list.useQuery(undefined, {
    enabled: !!projectId,
  });

  const projectMovies = useMemo(
    () =>
      (allMovies as any[])
        .filter((m) => m.projectId === projectId)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [allMovies, projectId]
  );
  const episodes = useMemo(
    () => projectMovies.filter((m) => m.type === "film"),
    [projectMovies]
  );

  const [targetMovieId, setTargetMovieId] = useState<number | null>(null);
  const [sourceMovieIds, setSourceMovieIds] = useState<number[]>([]);
  const [lengthSeconds, setLengthSeconds] = useState<Length>(90);
  const [style, setStyle] = useState<Style>("cinematic");
  const [resolution, setResolution] = useState<Resolution>("1080p");
  const [includeSubtitles, setIncludeSubtitles] = useState(true);
  const [includeVoiceover, setIncludeVoiceover] = useState(false);
  const [includeOpeningCredits, setIncludeOpeningCredits] = useState(false);
  const [overlayCreditsOnRecap, setOverlayCreditsOnRecap] = useState(false);

  const isEpisodic = (project as any)?.actStructure === "episodic";

  const estimateInput = useMemo(
    () =>
      targetMovieId && sourceMovieIds.length > 0
        ? {
            projectId,
            targetMovieId,
            sourceMovieIds,
            lengthSeconds,
            style,
            resolution,
            includeSubtitles,
            includeVoiceover,
            includeOpeningCredits,
            overlayCreditsOnRecap,
          }
        : null,
    [
      projectId,
      targetMovieId,
      sourceMovieIds,
      lengthSeconds,
      style,
      resolution,
      includeSubtitles,
      includeVoiceover,
      includeOpeningCredits,
      overlayCreditsOnRecap,
    ]
  );

  const estimate = trpc.recap.estimate.useQuery(estimateInput!, {
    enabled: !!estimateInput && isEpisodic,
  });

  const generateMut = trpc.recap.generate.useMutation();
  const [generatedRecapId, setGeneratedRecapId] = useState<number | null>(null);

  const recapDetail = trpc.recap.get.useQuery(
    { recapId: generatedRecapId! },
    {
      enabled: !!generatedRecapId,
      // v6.67 — live status polling per upgrade-kit Phase 4 UX.
      refetchInterval: (q) => {
        const status = (q.state.data as any)?.recap?.status;
        return status && !["completed", "failed"].includes(status) ? 3000 : false;
      },
    }
  );

  const attachMut = trpc.recap.attach.useMutation({
    onSuccess: () => existingRecaps.refetch(),
  });

  const existingRecaps = trpc.recap.listForMovie.useQuery(
    { movieId: targetMovieId! },
    { enabled: !!targetMovieId }
  );

  function toggleSource(mid: number) {
    setSourceMovieIds((prev) =>
      prev.includes(mid) ? prev.filter((x) => x !== mid) : [...prev, mid]
    );
  }

  async function handleGenerate() {
    if (!estimateInput) return;
    try {
      const res = await generateMut.mutateAsync(estimateInput);
      setGeneratedRecapId(res.recapId);
      existingRecaps.refetch();
    } catch (err: any) {
      // Error surfaces in UI via generateMut.error.
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <Link href={`/projects/${projectId}`}>
            <a className="text-sm text-zinc-400 hover:text-zinc-200">← Back to project</a>
          </Link>
          <h1 className="text-2xl font-bold mt-2">Auto Recap</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Generate a "Previously On" recap from earlier episodes. Available for episodic
            projects only. Credits are charged only if generation succeeds.
          </p>
        </div>

        {!isEpisodic && (
          <div className="border border-amber-500/40 bg-amber-500/10 text-amber-100 rounded-lg p-4 text-sm">
            Auto Recap is only available for episodic projects. Open this project's settings and
            set the structure to "episodic" to enable this feature.
          </div>
        )}

        {isEpisodic && episodes.length < 2 && (
          <div className="border border-zinc-700 bg-zinc-900/40 rounded-lg p-4 text-sm text-zinc-300">
            You need at least two rendered film-type episodes in this project before you can
            generate a recap. Render the next episode and one previous episode first.
          </div>
        )}

        {isEpisodic && episodes.length >= 2 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <section className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-zinc-500 mb-2">
                  Target episode (where the recap plays at the start)
                </label>
                <select
                  value={targetMovieId ?? ""}
                  onChange={(e) => {
                    const v = e.target.value ? parseInt(e.target.value, 10) : null;
                    setTargetMovieId(v);
                    setSourceMovieIds(sourceMovieIds.filter((s) => s !== v));
                  }}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm"
                >
                  <option value="">Pick an episode…</option>
                  {episodes.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-zinc-500 mb-2">
                  Source episodes (recap material)
                </label>
                <div className="space-y-1 max-h-56 overflow-auto border border-zinc-800 rounded p-2 bg-zinc-900/40">
                  {episodes
                    .filter((m) => m.id !== targetMovieId)
                    .map((m) => (
                      <label key={m.id} className="flex items-center gap-2 text-sm py-1 cursor-pointer hover:bg-zinc-800/30 rounded px-2">
                        <input
                          type="checkbox"
                          checked={sourceMovieIds.includes(m.id)}
                          onChange={() => toggleSource(m.id)}
                          className="accent-amber-500"
                        />
                        <span className="flex-1 truncate">{m.title}</span>
                        {m.duration ? (
                          <span className="text-xs text-zinc-500">{Math.round(m.duration)}s</span>
                        ) : (
                          <span className="text-xs text-amber-500">no video</span>
                        )}
                      </label>
                    ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-zinc-500 mb-1">
                    Length
                  </label>
                  <select
                    value={lengthSeconds}
                    onChange={(e) => setLengthSeconds(parseInt(e.target.value, 10) as Length)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-sm"
                  >
                    <option value={60}>60s</option>
                    <option value={90}>90s</option>
                    <option value={120}>120s</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-zinc-500 mb-1">
                    Style
                  </label>
                  <select
                    value={style}
                    onChange={(e) => setStyle(e.target.value as Style)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-sm"
                  >
                    <option value="cinematic">Cinematic</option>
                    <option value="suspenseful">Suspenseful</option>
                    <option value="fast-cut">Fast cut</option>
                    <option value="emotional">Emotional</option>
                    <option value="minimal">Minimal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-zinc-500 mb-1">
                    Resolution
                  </label>
                  <select
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value as Resolution)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-sm"
                  >
                    <option value="720p">720p</option>
                    <option value="1080p">1080p</option>
                    <option value="4k">4k</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={includeSubtitles}
                    onChange={(e) => setIncludeSubtitles(e.target.checked)}
                    className="accent-amber-500"
                  />
                  Subtitles
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={includeVoiceover}
                    onChange={(e) => setIncludeVoiceover(e.target.checked)}
                    className="accent-amber-500"
                  />
                  Voiceover script
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={includeOpeningCredits}
                    onChange={(e) => setIncludeOpeningCredits(e.target.checked)}
                    className="accent-amber-500"
                  />
                  Opening credits
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={overlayCreditsOnRecap}
                    onChange={(e) => setOverlayCreditsOnRecap(e.target.checked)}
                    className="accent-amber-500"
                  />
                  Overlay credits on recap
                </label>
              </div>
            </section>

            <section className="space-y-4">
              <div className="border border-zinc-800 bg-zinc-900/40 rounded-lg p-4">
                <div className="text-xs uppercase tracking-wider text-zinc-500 mb-2">
                  Estimate
                </div>
                {!estimateInput ? (
                  <div className="text-sm text-zinc-500 italic">
                    Pick a target and at least one source episode to see the cost.
                  </div>
                ) : estimate.isLoading ? (
                  <div className="text-sm text-zinc-500">Calculating…</div>
                ) : estimate.data ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between font-semibold text-base">
                      <span>Total</span>
                      <span className="text-amber-400">{estimate.data.estimatedCost.total} credits</span>
                    </div>
                    <div className="text-xs text-zinc-400 space-y-0.5">
                      {Object.entries(estimate.data.estimatedCost.breakdown).map(([k, v]) =>
                        v ? (
                          <div key={k} className="flex justify-between">
                            <span className="capitalize">{k.replace(/([A-Z])/g, " $1")}</span>
                            <span>{v as number}</span>
                          </div>
                        ) : null
                      )}
                    </div>
                    <div className="border-t border-zinc-800 pt-2 mt-2 text-xs text-zinc-400">
                      Your balance: {estimate.data.creditBalance} credits.{" "}
                      {!estimate.data.hasEnoughCredits && (
                        <span className="text-red-400">
                          You need {estimate.data.estimatedCost.total - estimate.data.creditBalance} more.
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-red-400">Could not estimate cost.</div>
                )}
              </div>

              <button
                disabled={
                  !estimateInput ||
                  !estimate.data?.hasEnoughCredits ||
                  generateMut.isPending ||
                  !!recapDetail.data?.recap && recapDetail.data.recap.status !== "completed" && recapDetail.data.recap.status !== "failed"
                }
                onClick={handleGenerate}
                className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-700 disabled:text-zinc-500 text-black font-medium py-2.5 rounded transition-colors"
              >
                {generateMut.isPending ? "Generating…" : "Generate Auto Recap"}
              </button>

              {generateMut.error && (
                <div className="border border-red-500/40 bg-red-500/10 text-red-300 rounded p-3 text-sm">
                  {generateMut.error.message}
                </div>
              )}

              {recapDetail.data && (
                <div className="border border-zinc-800 bg-zinc-900/40 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs uppercase tracking-wider text-zinc-500">
                      Recap #{recapDetail.data.recap.id}
                    </div>
                    <div className={`text-xs px-2 py-0.5 rounded ${
                      recapDetail.data.recap.status === "completed"
                        ? "bg-emerald-500/20 text-emerald-300"
                        : recapDetail.data.recap.status === "failed"
                        ? "bg-red-500/20 text-red-300"
                        : "bg-zinc-700 text-zinc-300"
                    }`}>
                      {recapDetail.data.recap.status}
                    </div>
                  </div>
                  {recapDetail.data.recap.errorMessage && (
                    <div className="text-sm text-red-300">{recapDetail.data.recap.errorMessage}</div>
                  )}
                  {!!recapDetail.data.recap.outline && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium">
                        {(recapDetail.data.recap.outline as any).title || "Previously On"}
                      </div>
                      <div className="text-xs text-zinc-400">
                        {(recapDetail.data.recap.outline as any).summary}
                      </div>
                      <ol className="space-y-1 mt-2">
                        {recapDetail.data.segments.map((seg) => (
                          <li key={seg.id} className="text-xs text-zinc-300 border-l-2 border-amber-500/40 pl-2">
                            <span className="text-zinc-500">[{seg.startTimeSeconds.toFixed(1)}s → {seg.endTimeSeconds.toFixed(1)}s]</span>{" "}
                            {seg.reason}
                            {seg.caption && (
                              <div className="text-zinc-500 italic">"{seg.caption}"</div>
                            )}
                          </li>
                        ))}
                      </ol>
                      {recapDetail.data.recap.voiceoverScript && (
                        <div className="mt-3 pt-3 border-t border-zinc-800">
                          <div className="text-xs uppercase tracking-wider text-zinc-500 mb-1">
                            Voiceover script
                          </div>
                          <div className="text-xs text-zinc-300 whitespace-pre-wrap">
                            {recapDetail.data.recap.voiceoverScript}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {recapDetail.data.recap.status === "completed" && (
                    <div className="pt-3 border-t border-zinc-800">
                      {recapDetail.data.recap.attachedAt ? (
                        <div className="text-xs text-emerald-300">
                          Attached to episode on{" "}
                          {new Date(recapDetail.data.recap.attachedAt as any).toLocaleString()}.
                        </div>
                      ) : (
                        <button
                          onClick={() => attachMut.mutate({ recapId: recapDetail.data.recap.id })}
                          disabled={attachMut.isPending}
                          className="text-xs bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded text-zinc-200 disabled:opacity-50"
                        >
                          {attachMut.isPending ? "Attaching…" : "Attach to episode intro"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {existingRecaps.data && existingRecaps.data.length > 0 && (
                <div className="border border-zinc-800 bg-zinc-900/40 rounded-lg p-4">
                  <div className="text-xs uppercase tracking-wider text-zinc-500 mb-2">
                    Earlier recaps for this episode
                  </div>
                  <ul className="space-y-1 text-xs text-zinc-300">
                    {existingRecaps.data.map((r) => (
                      <li key={r.id} className="flex justify-between">
                        <span>#{r.id} · {r.lengthSeconds}s · {r.style}</span>
                        <span className="text-zinc-500">{r.status}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
