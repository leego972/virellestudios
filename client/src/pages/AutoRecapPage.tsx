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
      // v6.67 ÃÂ¢ÃÂÃÂ live status polling per upgrade-kit Phase 4 UX.
      // v6.71 ÃÂ¢ÃÂÃÂ Stop polling on every terminal state, including the new
      // honest "outline_completed" / "render_completed".
      refetchInterval: (q) => {
        const status = (q.state.data as any)?.recap?.status;
        const terminal = ["completed", "outline_completed", "render_completed", "failed"];
        return status && !terminal.includes(status) ? 3000 : false;
      },
    }
  );

  const attachMut = trpc.recap.attach.useMutation({
    onSuccess: () => existingRecaps.refetch(),
  });

  // v6.71 ÃÂ¢ÃÂÃÂ Render the final MP4 from a completed outline. The mutation
  // returns immediately with status: "render_pending"; the polling above
  // picks up the worker's progress.
  const renderMp4Mut = trpc.recap.renderMp4.useMutation({
    onSuccess: () => recapDetail.refetch(),
  });

  // v6.72 ÃÂ¢ÃÂÃÂ Cancel an in-flight MP4 render. Refunds the reservation and
  // flips the recap back to outline_completed. Does not abort the underlying
  // ffmpeg process (the worker is fire-and-forget) but the safeFail path is
  // idempotent so the late finish/fail does no harm.
  const cancelRenderMut = trpc.recap.cancelRender.useMutation({
    onSuccess: () => recapDetail.refetch(),
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
    <div className="min-h-screen text-zinc-100 p-4 md:p-6" style={{ background:"linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)" }}>
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <Link href={`/projects/${projectId}`}>
            <a className="text-sm text-zinc-400 hover:text-zinc-200">ÃÂ¢ÃÂÃÂ Back to project</a>
          </Link>
          <h1 className="text-2xl font-bold mt-2 text-gold-shimmer">Auto Recap</h1>
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
          <div className="border border-amber-500/20 bg-gradient-to-r from-amber-950/10 via-zinc-900/40 to-zinc-900/40 rounded-lg p-4 text-sm text-zinc-300">
            You need at least two rendered film-type episodes in this project before you can
            generate a recap. Render the next episode and one previous episode first.
          </div>
        )}

        {isEpisodic && episodes.length >= 2 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <section className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-amber-400/60 mb-2">
                  Target episode (where the recap plays at the start)
                </label>
                <select
                  value={targetMovieId ?? ""}
                  onChange={(e) => {
                    const v = e.target.value ? parseInt(e.target.value, 10) : null;
                    setTargetMovieId(v);
                    setSourceMovieIds(sourceMovieIds.filter((s) => s !== v));
                  }}
                  className="w-full bg-zinc-900 border border-amber-500/20 rounded px-3 py-2 text-sm"
                >
                  <option value="">Pick an episodeÃÂ¢ÃÂÃÂ¦</option>
                  {episodes.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-amber-400/60 mb-2">
                  Source episodes (recap material)
                </label>
                <div className="space-y-1 max-h-56 overflow-auto border border-amber-500/20 rounded p-2 bg-gradient-to-r from-amber-950/10 via-zinc-900/40 to-zinc-900/40">
                  {episodes
                    .filter((m) => m.id !== targetMovieId)
                    .map((m) => (
                      <label key={m.id} className="flex items-center gap-2 text-sm py-1 cursor-pointer hover:bg-amber-500/10/30 rounded px-2">
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
                  <label className="block text-xs uppercase tracking-wider text-amber-400/60 mb-1">
                    Length
                  </label>
                  <select
                    value={lengthSeconds}
                    onChange={(e) => setLengthSeconds(parseInt(e.target.value, 10) as Length)}
                    className="w-full bg-zinc-900 border border-amber-500/20 rounded px-2 py-1.5 text-sm"
                  >
                    <option value={60}>60s</option>
                    <option value={90}>90s</option>
                    <option value={120}>120s</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-amber-400/60 mb-1">
                    Style
                  </label>
                  <select
                    value={style}
                    onChange={(e) => setStyle(e.target.value as Style)}
                    className="w-full bg-zinc-900 border border-amber-500/20 rounded px-2 py-1.5 text-sm"
                  >
                    <option value="cinematic">Cinematic</option>
                    <option value="suspenseful">Suspenseful</option>
                    <option value="fast-cut">Fast cut</option>
                    <option value="emotional">Emotional</option>
                    <option value="minimal">Minimal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-amber-400/60 mb-1">
                    Resolution
                  </label>
                  <select
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value as Resolution)}
                    className="w-full bg-zinc-900 border border-amber-500/20 rounded px-2 py-1.5 text-sm"
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
              <div className="border border-amber-500/20 bg-gradient-to-r from-amber-950/10 via-zinc-900/40 to-zinc-900/40 rounded-lg p-4">
                <div className="text-xs uppercase tracking-wider text-amber-400/60 mb-2">
                  Estimate
                </div>
                {!estimateInput ? (
                  <div className="text-sm text-zinc-500 italic">
                    Pick a target and at least one source episode to see the cost.
                  </div>
                ) : estimate.isLoading ? (
                  <div className="text-sm text-zinc-500">CalculatingÃÂ¢ÃÂÃÂ¦</div>
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
                    <div className="border-t border-amber-500/20 pt-2 mt-2 text-xs text-zinc-400">
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
                  // v6.70 ÃÂ¢ÃÂÃÂ A recap is "settled" when it is in any terminal
                  // state (legacy "completed", honest "outline_completed",
                  // future "render_completed", or "failed"). Block while a
                  // generate is mid-flight.
                  !!recapDetail.data?.recap && !["completed", "outline_completed", "render_completed", "failed"].includes(recapDetail.data.recap.status)
                }
                onClick={handleGenerate}
                className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-700 disabled:text-zinc-500 text-black font-medium py-2.5 rounded transition-colors"
              >
                {generateMut.isPending ? "GeneratingÃÂ¢ÃÂÃÂ¦" : "Generate Auto Recap"}
              </button>

              {generateMut.error && (
                <div className="border border-red-500/40 bg-red-500/10 text-red-300 rounded p-3 text-sm">
                  {generateMut.error.message}
                </div>
              )}

              {recapDetail.data && (
                <div className="border border-amber-500/20 bg-gradient-to-r from-amber-950/10 via-zinc-900/40 to-zinc-900/40 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs uppercase tracking-wider text-amber-400/60">
                      Recap #{recapDetail.data.recap.id}
                    </div>
                    {(() => {
                      // v6.70 ÃÂ¢ÃÂÃÂ Honest status labels. We do NOT render a
                      // final MP4 yet; the success state is "outline ready".
                      // Only show "Final recap video ready" when the recap
                      // actually has a downloadable asset.
                      const s = recapDetail.data.recap.status;
                      const hasAsset = !!(recapDetail.data.recap as any).outputAssetId
                        || !!(recapDetail.data.recap as any).fileUrl;
                      let label = s;
                      let cls = "bg-zinc-700 text-zinc-300";
                      if (s === "render_completed" || (s === "completed" && hasAsset)) {
                        label = "Final recap video ready";
                        cls = "bg-emerald-500/20 text-emerald-300";
                      } else if (s === "outline_completed" || s === "completed") {
                        label = "Recap outline ready";
                        cls = "bg-amber-500/20 text-amber-300";
                      } else if (s === "render_pending") {
                        // v6.71 ÃÂ¢ÃÂÃÂ render_pending is now the live MP4 render
                        // state, not the outline-saving state.
                        label = "Rendering MP4ÃÂ¢ÃÂÃÂ¦";
                        cls = "bg-amber-500/20 text-amber-300";
                      } else if (s === "failed") {
                        label = "Failed";
                        cls = "bg-red-500/20 text-red-300";
                      }
                      return (
                        <div className={`text-xs px-2 py-0.5 rounded ${cls}`}>
                          {label}
                        </div>
                      );
                    })()}
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
                            <span className="text-zinc-500">[{seg.startTimeSeconds.toFixed(1)}s ÃÂ¢ÃÂÃÂ {seg.endTimeSeconds.toFixed(1)}s]</span>{" "}
                            {seg.reason}
                            {seg.caption && (
                              <div className="text-zinc-500 italic">"{seg.caption}"</div>
                            )}
                          </li>
                        ))}
                      </ol>
                      {recapDetail.data.recap.voiceoverScript && (
                        <div className="mt-3 pt-3 border-t border-amber-500/20">
                          <div className="text-xs uppercase tracking-wider text-amber-400/60 mb-1">
                            Voiceover script
                          </div>
                          <div className="text-xs text-zinc-300 whitespace-pre-wrap">
                            {recapDetail.data.recap.voiceoverScript}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {(() => {
                    // v6.70 ÃÂ¢ÃÂÃÂ Show the attach + render controls for every
                    // terminal success state (legacy "completed" + honest
                    // "outline_completed" + "render_completed"). Also show
                    // a live "rendering" indicator while render_pending.
                    const s = recapDetail.data.recap.status;
                    const ready = s === "completed" || s === "outline_completed" || s === "render_completed" || s === "render_pending";
                    if (!ready) return null;
                    const hasAsset = !!(recapDetail.data.recap as any).outputAssetId
                      || !!(recapDetail.data.recap as any).fileUrl;
                    const isRendering = s === "render_pending";
                    const canRender = !hasAsset && !isRendering && (s === "outline_completed" || s === "completed");
                    return (
                      <div className="pt-3 border-t border-amber-500/20 space-y-2">
                        {/* v6.70/v6.71 ÃÂ¢ÃÂÃÂ Honest disclaimer when no MP4 exists yet. */}
                        {!hasAsset && !isRendering && (
                          <div className="text-[11px] text-zinc-500">
                            Preview from source segments. The recap outline (beat list + voiceover script) is saved.
                            Click "Render final MP4" to cut, stitch, and export the final video.
                          </div>
                        )}
                        {/* v6.71 ÃÂ¢ÃÂÃÂ Live rendering indicator while the worker runs. */}
                        {/* v6.72 ÃÂ¢ÃÂÃÂ Adds a Cancel button that refunds credits
                            and flips the recap back to outline_completed. */}
                        {isRendering && (
                          <div className="space-y-2">
                            <div className="text-xs text-amber-300 flex items-center gap-2">
                              <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-300 animate-pulse" />
                              Rendering final MP4ÃÂ¢ÃÂÃÂ¦ (the page will refresh automatically)
                            </div>
                            <button
                              onClick={() => {
                                if (window.confirm("Cancel this render? Your credits will be refunded and you can retry from the recap outline.")) {
                                  cancelRenderMut.mutate({ recapId: recapDetail.data.recap.id });
                                }
                              }}
                              disabled={cancelRenderMut.isPending}
                              className="text-xs bg-zinc-800 hover:bg-amber-500/10 disabled:opacity-50 px-3 py-1.5 rounded text-zinc-200"
                            >
                              {cancelRenderMut.isPending ? "CancellingÃÂ¢ÃÂÃÂ¦" : "Cancel render"}
                            </button>
                            {cancelRenderMut.error && (
                              <div className="text-xs text-red-300">{cancelRenderMut.error.message}</div>
                            )}
                          </div>
                        )}
                        {/* v6.71 ÃÂ¢ÃÂÃÂ Render final MP4 button. Only available
                            when the outline is settled and no asset exists. */}
                        {canRender && (
                          <button
                            onClick={() => renderMp4Mut.mutate({ recapId: recapDetail.data.recap.id })}
                            disabled={renderMp4Mut.isPending}
                            className="text-xs bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-700 disabled:text-zinc-500 px-3 py-1.5 rounded text-black font-medium"
                          >
                            {renderMp4Mut.isPending ? "Starting renderÃÂ¢ÃÂÃÂ¦" : "Render final MP4"}
                          </button>
                        )}
                        {/* v6.71 ÃÂ¢ÃÂÃÂ Surface render-mutation errors (insufficient
                            credits, bad state, dispatch failure, etc.). */}
                        {renderMp4Mut.error && (
                          <div className="text-xs text-red-300">{renderMp4Mut.error.message}</div>
                        )}
                        {/* v6.70 ÃÂ¢ÃÂÃÂ Only render a download button when an actual file exists. */}
                        {hasAsset && (recapDetail.data.recap as any).fileUrl && (
                          <a
                            href={(recapDetail.data.recap as any).fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-block text-xs bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 rounded text-white"
                          >
                            Download MP4
                          </a>
                        )}
                        {recapDetail.data.recap.attachedAt ? (
                          <div className="text-xs text-emerald-300">
                            Attached to episode on{" "}
                            {new Date(recapDetail.data.recap.attachedAt as any).toLocaleString()}.
                          </div>
                        ) : !isRendering ? (
                          <button
                            onClick={() => attachMut.mutate({ recapId: recapDetail.data.recap.id })}
                            disabled={attachMut.isPending}
                            className="text-xs bg-zinc-800 hover:bg-amber-500/10 px-3 py-1.5 rounded text-zinc-200 disabled:opacity-50"
                          >
                            {attachMut.isPending ? "AttachingÃÂ¢ÃÂÃÂ¦" : "Attach to episode intro"}
                          </button>
                        ) : null}
                      </div>
                    );
                  })()}
                </div>
              )}

              {existingRecaps.data && existingRecaps.data.length > 0 && (
                <div className="border border-amber-500/20 bg-gradient-to-r from-amber-950/10 via-zinc-900/40 to-zinc-900/40 rounded-lg p-4">
                  <div className="text-xs uppercase tracking-wider text-amber-400/60 mb-2">
                    Earlier recaps for this episode
                  </div>
                  <ul className="space-y-1 text-xs text-zinc-300">
                    {existingRecaps.data.map((r) => (
                      <li key={r.id} className="flex justify-between">
                        <span>#{r.id} ÃÂÃÂ· {r.lengthSeconds}s ÃÂÃÂ· {r.style}</span>
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
