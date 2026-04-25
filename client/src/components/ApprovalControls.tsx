import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { CheckCircle2, AlertTriangle, RotateCcw, Loader2 } from "lucide-react";
import ApprovalBadge, { ApprovalStatus } from "./ApprovalBadge";

interface Props {
  kind: "scene" | "movie";
  id: number;
  status: ApprovalStatus | string | null | undefined;
  note?: string | null;
  onChange?: () => void;
}

/**
 * v6.63 — Approval workflow controls. Director/Producer marks the
 * scene/cut as approved or requests changes with a note. Used inside
 * SceneEditor, the Movies grid, and the rollup approvals panel.
 */
export default function ApprovalControls({ kind, id, status, note, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [draftNote, setDraftNote] = useState(note || "");
  const utils = trpc.useUtils();

  const sceneMut = trpc.sceneApproval.set.useMutation();
  const movieMut = trpc.movieApproval.set.useMutation();
  const isPending = sceneMut.isPending || movieMut.isPending;

  async function setStatus(next: ApprovalStatus) {
    try {
      if (kind === "scene") {
        await sceneMut.mutateAsync({ sceneId: id, status: next, note: draftNote || null });
        await utils.scene.listByProject.invalidate();
        await utils.activity.list.invalidate().catch(() => {});
      } else {
        await movieMut.mutateAsync({ movieId: id, status: next, note: draftNote || null });
        await utils.movie.list.invalidate().catch(() => {});
        await utils.activity.list.invalidate().catch(() => {});
      }
      toast.success(next === "approved" ? "Marked approved" : next === "changes_requested" ? "Changes requested" : "Reset to pending");
      setOpen(false);
      onChange?.();
    } catch (e: any) {
      toast.error(e?.message || "Failed to update approval");
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <ApprovalBadge status={status} size="md" />
        {!open && (
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setOpen(true)}>
            Update approval
          </Button>
        )}
      </div>
      {note && !open && (
        <div className="text-xs text-zinc-400 bg-zinc-900/50 border border-zinc-800 rounded px-2 py-1.5">
          <span className="font-semibold text-zinc-300">Note:</span> {note}
        </div>
      )}
      {open && (
        <div className="space-y-2 p-3 bg-zinc-900/60 border border-zinc-800 rounded">
          <Textarea
            value={draftNote}
            onChange={(e) => setDraftNote(e.target.value)}
            placeholder="Optional note explaining the decision..."
            className="bg-zinc-950 border-zinc-800 text-sm"
            rows={2}
            maxLength={2000}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" disabled={isPending} onClick={() => setStatus("approved")} className="bg-emerald-700 hover:bg-emerald-600 text-white">
              {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              <span className="ml-1">Approve</span>
            </Button>
            <Button size="sm" disabled={isPending} onClick={() => setStatus("changes_requested")} className="bg-amber-700 hover:bg-amber-600 text-white">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span className="ml-1">Request changes</span>
            </Button>
            <Button size="sm" variant="outline" disabled={isPending} onClick={() => setStatus("pending")}>
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="ml-1">Reset</span>
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}
