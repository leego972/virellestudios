import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { ListVideo, X, Loader2, ExternalLink, XCircle, Film } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

/**
 * v6.62 â Global Render Queue tray.
 *
 * Sits next to NotificationBell in the dashboard header. Shows every in-flight
 * render (jobs + scenes) for the current user across ALL projects, polled
 * every 5s when open / 15s when closed. This is the "what's cooking" surface
 * directors expect from any pro tool (Runway / Veo / LTX Studio).
 *
 * Each row is clickable (jumps to the project), shows progress where the
 * backend tracks it, and exposes a per-row cancel button.
 */
export default function RenderQueueTray() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const [, navigate] = useLocation();

  // Poll faster when the user is actually looking at the tray.
  const { data: rows, refetch } = trpc.generation.listActiveForUser.useQuery(
    undefined,
    { refetchInterval: open ? 5_000 : 15_000 }
  );

  const cancelMut = trpc.generation.cancelRender.useMutation({
    onSuccess: () => { toast.success("Render cancelled"); refetch(); },
    onError: (e) => toast.error(e.message || "Could not cancel"),
  });

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const count = rows?.length || 0;
  const activeAny = count > 0;

  const formatElapsed = (sec: number) => {
    const s = Math.max(0, Math.floor(sec));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return m > 0 ? `${m}m ${r}s` : `${r}s`;
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        title={count > 0 ? `${count} active render${count === 1 ? "" : "s"}` : "Render queue"}
        aria-label={count > 0 ? `Render queue, ${count} active` : "Render queue"}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <ListVideo className={`h-5 w-5 ${activeAny ? "text-amber-400" : ""}`} aria-hidden="true" />
        {activeAny && (
          <>
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-amber-500 text-black text-[10px] font-bold px-1">
              {count > 99 ? "99+" : count}
            </span>
            {/* subtle pulse to draw the eye when work is in flight */}
            <span className="absolute inset-0 rounded-lg bg-amber-500/10 animate-pulse pointer-events-none" />
          </>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 max-h-[480px] bg-[#0c0b18] border border-white/10 rounded-xl shadow-2xl z-[100] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <ListVideo className="h-4 w-4 text-amber-400" aria-hidden="true" />
              <h3 className="text-sm font-semibold gradient-text-gold">Render Queue</h3>
              {activeAny && (
                <span className="text-[10px] uppercase tracking-wide text-amber-400/80 font-medium">
                  {count} active
                </span>
              )}
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1 text-white/40 hover:text-white"
              aria-label="Close render queue"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {!rows || rows.length === 0 ? (
              <div className="py-12 text-center px-6">
                <Film className="h-8 w-8 text-white/20 mx-auto mb-2" />
                <p className="text-sm text-white/40">No active renders</p>
                <p className="text-[11px] text-white/30 mt-1">
                  Generations you start will appear here in real time.
                </p>
              </div>
            ) : (
              rows.map((r: any) => (
                <div
                  key={`${r.kind}-${r.id}`}
                  className="px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white font-medium truncate">{r.label}</p>
                      <button
                        onClick={() => { navigate(`/projects/${r.projectId}`); setOpen(false); }}
                        className="text-[11px] text-amber-400 hover:text-amber-300 truncate flex items-center gap-1 mt-0.5"
                      >
                        <ExternalLink className="h-2.5 w-2.5" />
                        {r.projectTitle}
                      </button>
                    </div>
                    <button
                      onClick={() => cancelMut.mutate({ kind: r.kind, id: r.id })}
                      disabled={cancelMut.isPending}
                      className="p-1 text-white/30 hover:text-red-400 transition-colors flex-shrink-0"
                      title="Cancel this render"
                      aria-label="Cancel render"
                    >
                      <XCircle className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>

                  {/* Progress bar (or indeterminate shimmer) */}
                  <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
                    {typeof r.progress === "number" && r.progress > 0 ? (
                      <div
                        className="h-full bg-amber-500 transition-[width] duration-500"
                        style={{ width: `${Math.min(100, Math.max(2, r.progress))}%` }}
                      />
                    ) : (
                      <div className="h-full w-1/3 bg-amber-500/60 animate-pulse" />
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[10px] text-white/40 flex items-center gap-1">
                      <Loader2 className="h-2.5 w-2.5 animate-spin" />
                      {r.status === "queued" ? "Queued" : "Rendering"} Â· {formatElapsed(r.elapsedSeconds)}
                    </span>
                    {typeof r.progress === "number" && r.progress > 0 && (
                      <span className="text-[10px] text-white/50 font-mono">{Math.round(r.progress)}%</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {activeAny && (
            <div className="px-4 py-2 border-t border-white/10 bg-black/30">
              <p className="text-[10px] text-white/40 leading-tight">
                Updates every 5s. Cancelling refunds nothing â credits already deducted.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
