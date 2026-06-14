import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { X, Play, Pause, Layers } from "lucide-react";

interface Props {
  projectId: number;
  sceneId: number;
  open: boolean;
  onClose: () => void;
  /** The current scene's videoUrl, used as the right-hand "current" track. */
  currentUrl?: string | null;
}

/**
 * v6.63 â Side-by-side version compare. Pulls saved alt versions from the
 * shotVersions store (keyed per scene). Synchronizes play/pause + scrubbing
 * across both video elements so the user can A/B compare cuts/takes.
 *
 * StudioBinder/Frame.io style: top picker row + dual-pane player + sync bar.
 */
export default function VersionCompareDrawer({ projectId, sceneId, open, onClose, currentUrl }: Props) {
  const { data, isLoading } = trpc.shotVersions.list.useQuery({ projectId, sceneId }, { enabled: open });
  const versions: Array<{ label: string; url?: string; notes?: string }> = (data?.[0]?.versions as any) || [];

  const [leftIdx, setLeftIdx] = useState<number>(0);
  const [rightUrl, setRightUrl] = useState<string | null>(currentUrl || null);
  const [playing, setPlaying] = useState(false);
  const leftRef = useRef<HTMLVideoElement>(null);
  const rightRef = useRef<HTMLVideoElement>(null);

  useEffect(() => { setRightUrl(currentUrl || null); }, [currentUrl, open]);

  function syncPlay() {
    const l = leftRef.current;
    const r = rightRef.current;
    if (!l || !r) return;
    if (playing) {
      l.pause(); r.pause();
      setPlaying(false);
    } else {
      l.currentTime = 0; r.currentTime = 0;
      l.play().catch(() => {}); r.play().catch(() => {});
      setPlaying(true);
    }
  }

  function syncScrub(e: React.ChangeEvent<HTMLInputElement>) {
    const t = Number(e.target.value);
    if (leftRef.current) leftRef.current.currentTime = t;
    if (rightRef.current) rightRef.current.currentTime = t;
  }

  if (!open) return null;
  const leftVersion = versions[leftIdx];
  const leftUrl = leftVersion?.url || null;
  const maxDur = Math.max(leftRef.current?.duration || 0, rightRef.current?.duration || 0, 1);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 md:p-8">
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl w-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-gradient-to-r from-zinc-900 to-zinc-950">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-semibold gradient-text-gold">Compare versions â Scene {sceneId}</h2>
          </div>
          <Button size="sm" variant="ghost" onClick={onClose} className="h-8 w-8 p-0">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-4">
          {isLoading ? (
            <div className="text-sm text-zinc-500 text-center py-8">Loading versionsâ¦</div>
          ) : versions.length === 0 ? (
            <div className="text-sm text-zinc-500 text-center py-12 border border-dashed border-zinc-800 rounded">
              No saved alternate versions for this scene yet. Save a version from the regenerate panel to compare it here.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs text-zinc-400 uppercase tracking-wide">Version A</label>
                    <select
                      value={leftIdx}
                      onChange={(e) => setLeftIdx(Number(e.target.value))}
                      className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs"
                    >
                      {versions.map((v, i) => (
                        <option key={i} value={i}>{v.label || `Take ${i + 1}`}</option>
                      ))}
                    </select>
                  </div>
                  {leftUrl ? (
                    <video ref={leftRef} src={leftUrl} className="w-full aspect-video bg-black rounded border border-zinc-800" controls={false} muted />
                  ) : (
                    <div className="aspect-video bg-zinc-900 border border-dashed border-zinc-800 rounded flex items-center justify-center text-xs text-zinc-500">
                      No URL on this version
                    </div>
                  )}
                  {leftVersion?.notes && <div className="text-xs text-zinc-400">{leftVersion.notes}</div>}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs text-zinc-400 uppercase tracking-wide">Version B (current)</label>
                  </div>
                  {rightUrl ? (
                    <video ref={rightRef} src={rightUrl} className="w-full aspect-video bg-black rounded border border-zinc-800" controls={false} muted />
                  ) : (
                    <div className="aspect-video bg-zinc-900 border border-dashed border-zinc-800 rounded flex items-center justify-center text-xs text-zinc-500">
                      No current render
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-zinc-900/50 border border-zinc-800 rounded">
                <Button size="sm" onClick={syncPlay} className="bg-amber-600 hover:bg-amber-500 text-zinc-950">
                  {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span className="ml-1">{playing ? "Pause" : "Play"} both</span>
                </Button>
                <input
                  type="range"
                  min={0}
                  max={maxDur}
                  step={0.05}
                  defaultValue={0}
                  onChange={syncScrub}
                  className="flex-1 accent-amber-500"
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
