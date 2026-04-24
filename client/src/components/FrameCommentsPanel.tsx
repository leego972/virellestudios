import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { MessageSquarePlus, X, Check, Trash2, MessageCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface FrameCommentsPanelProps {
  projectId: number;
  sceneId?: number;
  movieId?: number;
  /** Current player time in seconds — used for "Add comment at current time". */
  currentTime: number;
  /** Total clip duration — used to position markers on the supplied bar. */
  duration: number;
  /** Click handler for jumping the player to a specific second. */
  onSeek: (seconds: number) => void;
  /** Optional close (for embedded panel). */
  onClose?: () => void;
}

const fmt = (s: number) => {
  const t = Math.max(0, Math.floor(s));
  const m = Math.floor(t / 60);
  const r = t % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
};

/**
 * v6.62 — Frame-timestamp comments panel.
 *
 * Drops into MediaPlayer alongside the video. Lets directors and reviewers
 * leave notes pinned to a specific second of the clip — Frame.io / Vimeo
 * Review parity, table-stakes for any pro film tool.
 *
 * Renders:
 *  - A list of all comments for this clip, sorted by timestamp
 *  - "Add at NN:NN" inline composer (uses the current player time)
 *  - Per-comment Resolve / Delete actions
 *
 * The marker pips on the player scrubber are rendered separately by
 * MediaPlayer using the same comments query (kept in sync via tRPC cache).
 */
export default function FrameCommentsPanel({
  projectId,
  sceneId,
  movieId,
  currentTime,
  duration: _duration,
  onSeek,
  onClose,
}: FrameCommentsPanelProps) {
  const [draft, setDraft] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);

  const queryInput = useMemo(
    () => ({ projectId, sceneId, movieId }),
    [projectId, sceneId, movieId]
  );
  const { data: comments, refetch, isLoading } = trpc.frameComment.list.useQuery(queryInput, {
    refetchInterval: 30_000,
  });

  const createMut = trpc.frameComment.create.useMutation({
    onSuccess: () => { setDraft(""); setComposerOpen(false); refetch(); },
    onError: (e) => toast.error(e.message || "Could not save comment"),
  });
  const updateMut = trpc.frameComment.update.useMutation({ onSuccess: () => refetch() });
  const deleteMut = trpc.frameComment.delete.useMutation({
    onSuccess: () => { toast.success("Comment deleted"); refetch(); },
    onError: (e) => toast.error(e.message || "Could not delete"),
  });

  const handleSubmit = () => {
    const text = draft.trim();
    if (!text) return;
    createMut.mutate({
      projectId,
      sceneId,
      movieId,
      timestampSeconds: Math.round(currentTime * 10) / 10,
      body: text,
    });
  };

  const list = comments || [];

  return (
    <aside className="flex flex-col h-full bg-zinc-900 border-l border-white/10 w-full sm:w-80 max-w-full">
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-white">Frame Comments</h3>
          {list.length > 0 && (
            <span className="text-[10px] uppercase tracking-wide text-white/50">
              {list.length}
            </span>
          )}
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 text-white/40 hover:text-white" aria-label="Close comments">
            <X className="h-4 w-4" />
          </button>
        )}
      </header>

      {/* Composer */}
      <div className="px-3 py-2 border-b border-white/10 bg-black/30">
        {composerOpen ? (
          <div className="space-y-2">
            <div className="text-[11px] text-amber-400 font-mono">
              At {fmt(currentTime)}
            </div>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Note for this frame…"
              rows={3}
              autoFocus
              className="w-full px-2 py-1.5 rounded bg-black/50 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-amber-500/60 resize-none"
              maxLength={2000}
            />
            <div className="flex items-center justify-end gap-2">
              <Button size="sm" variant="ghost" className="h-7 text-xs text-white/60 hover:text-white" onClick={() => { setComposerOpen(false); setDraft(""); }}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="h-7 text-xs bg-amber-500 hover:bg-amber-600 text-black"
                onClick={handleSubmit}
                disabled={!draft.trim() || createMut.isPending}
              >
                {createMut.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Post"}
              </Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setComposerOpen(true)}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-white/60 hover:text-white hover:bg-white/5 transition-colors"
          >
            <MessageSquarePlus className="h-3.5 w-3.5" />
            Add comment at <span className="text-amber-400 font-mono">{fmt(currentTime)}</span>
          </button>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="py-8 text-center text-xs text-white/40">
            <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" /> Loading comments…
          </div>
        ) : list.length === 0 ? (
          <div className="py-12 text-center px-6">
            <MessageCircle className="h-8 w-8 text-white/20 mx-auto mb-2" />
            <p className="text-sm text-white/40">No comments yet</p>
            <p className="text-[11px] text-white/30 mt-1">
              Pause at any moment and leave a note pinned to that frame.
            </p>
          </div>
        ) : (
          list.map((c: any) => (
            <div
              key={c.id}
              className={`px-3 py-2.5 border-b border-white/5 hover:bg-white/5 transition-colors ${
                c.resolved ? "opacity-50" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <button
                  onClick={() => onSeek(c.timestampSeconds)}
                  className="text-[11px] font-mono text-amber-400 hover:text-amber-300"
                  title="Jump to this frame"
                >
                  {fmt(c.timestampSeconds)}
                </button>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => updateMut.mutate({ id: c.id, resolved: !c.resolved })}
                    className={`p-1 transition-colors ${c.resolved ? "text-amber-400 hover:text-white/40" : "text-white/30 hover:text-amber-400"}`}
                    title={c.resolved ? "Unresolve" : "Mark resolved"}
                  >
                    <Check className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => deleteMut.mutate({ id: c.id })}
                    className="p-1 text-white/30 hover:text-red-400 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
              <p className="text-xs text-white/80 whitespace-pre-wrap break-words leading-snug">
                {c.body}
              </p>
              <p className="text-[10px] text-white/30 mt-1">
                {c.authorName}
              </p>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}

/**
 * Marker overlay rendered inside MediaPlayer's scrubber. Kept in this file
 * so both surfaces stay in sync (single source of truth for the comment list).
 */
export function FrameCommentMarkers({
  projectId,
  sceneId,
  movieId,
  duration,
  onSeek,
}: {
  projectId: number;
  sceneId?: number;
  movieId?: number;
  duration: number;
  onSeek: (seconds: number) => void;
}) {
  const { data: comments } = trpc.frameComment.list.useQuery(
    { projectId, sceneId, movieId },
    { refetchInterval: 30_000 }
  );
  if (!comments?.length || !duration) return null;
  return (
    <>
      {comments.map((c: any) => {
        const pct = Math.min(100, Math.max(0, (c.timestampSeconds / duration) * 100));
        return (
          <button
            key={c.id}
            type="button"
            onClick={(e) => { e.stopPropagation(); onSeek(c.timestampSeconds); }}
            className={`absolute -top-1 w-2 h-2 rounded-full ${c.resolved ? "bg-white/40" : "bg-amber-400"} ring-1 ring-black/40 hover:scale-150 transition-transform z-10`}
            style={{ left: `${pct}%`, transform: "translateX(-50%)" }}
            title={`${fmt(c.timestampSeconds)} — ${c.body.slice(0, 80)}${c.body.length > 80 ? "…" : ""}`}
            aria-label={`Comment at ${fmt(c.timestampSeconds)}`}
          />
        );
      })}
    </>
  );
}
