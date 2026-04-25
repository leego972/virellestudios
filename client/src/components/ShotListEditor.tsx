import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Plus, Trash2, Save, GripVertical, Loader2 } from "lucide-react";

export interface ShotRow {
  number: string | number;
  shotType?: string;
  lens?: string;
  movement?: string;
  framing?: string;
  notes?: string;
  durationSec?: number;
}

interface Props {
  sceneId: number;
  initial?: ShotRow[] | null;
}

const SHOT_TYPES = ["WS", "MS", "CU", "ECU", "MCU", "OTS", "Insert", "Establishing", "Two-shot"];
const MOVEMENTS = ["Static", "Pan", "Tilt", "Dolly", "Push-in", "Pull-out", "Tracking", "Handheld", "Crane", "Steadicam"];

/**
 * v6.63 — Per-scene structured shot list editor. Saves to scenes.shotList
 * via the sceneShotList.save tRPC route. Renders inline in SceneEditor
 * and on the standalone shot list page.
 */
export default function ShotListEditor({ sceneId, initial }: Props) {
  const [rows, setRows] = useState<ShotRow[]>(() => {
    if (Array.isArray(initial)) return initial as ShotRow[];
    return [];
  });
  const [dirty, setDirty] = useState(false);
  const utils = trpc.useUtils();
  const saveMut = trpc.sceneShotList.save.useMutation();

  useEffect(() => {
    if (Array.isArray(initial) && rows.length === 0 && !dirty) {
      setRows(initial as ShotRow[]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  function addRow() {
    setRows((r) => [...r, { number: r.length + 1, shotType: "MS", movement: "Static", durationSec: 4 }]);
    setDirty(true);
  }
  function removeRow(idx: number) {
    setRows((r) => r.filter((_, i) => i !== idx).map((row, i) => ({ ...row, number: i + 1 })));
    setDirty(true);
  }
  function update(idx: number, patch: Partial<ShotRow>) {
    setRows((r) => r.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
    setDirty(true);
  }
  function move(idx: number, dir: -1 | 1) {
    setRows((r) => {
      const next = [...r];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return r;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next.map((row, i) => ({ ...row, number: i + 1 }));
    });
    setDirty(true);
  }
  async function save() {
    try {
      await saveMut.mutateAsync({ sceneId, shotList: rows as any });
      await utils.scene.get.invalidate({ id: sceneId }).catch(() => {});
      toast.success(`Saved ${rows.length} shot${rows.length === 1 ? "" : "s"}`);
      setDirty(false);
    } catch (e: any) {
      toast.error(e?.message || "Failed to save");
    }
  }

  const totalDuration = rows.reduce((sum, r) => sum + (r.durationSec || 0), 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-sm text-zinc-400">
          <span className="font-semibold text-zinc-200">{rows.length}</span> shot{rows.length === 1 ? "" : "s"} ·
          <span className="ml-2">total</span> <span className="font-semibold text-zinc-200">{totalDuration}s</span>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={addRow}><Plus className="w-3.5 h-3.5 mr-1" /> Add shot</Button>
          <Button size="sm" disabled={!dirty || saveMut.isPending} onClick={save} className="bg-amber-600 hover:bg-amber-500 text-zinc-950">
            {saveMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Save className="w-3.5 h-3.5 mr-1" />}
            Save
          </Button>
        </div>
      </div>
      {rows.length === 0 ? (
        <div className="text-sm text-zinc-500 italic border border-dashed border-zinc-800 rounded p-6 text-center">
          No shots yet. Click <span className="text-zinc-300">Add shot</span> to start the list.
        </div>
      ) : (
        <div className="overflow-x-auto border border-zinc-800 rounded">
          <table className="w-full text-xs">
            <thead className="bg-zinc-900/80 text-zinc-400">
              <tr>
                <th className="px-2 py-2 text-left w-10">#</th>
                <th className="px-2 py-2 text-left w-24">Type</th>
                <th className="px-2 py-2 text-left w-20">Lens</th>
                <th className="px-2 py-2 text-left w-32">Movement</th>
                <th className="px-2 py-2 text-left w-24">Framing</th>
                <th className="px-2 py-2 text-left">Notes</th>
                <th className="px-2 py-2 text-left w-16">Sec</th>
                <th className="px-2 py-2 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={idx} className="border-t border-zinc-800 hover:bg-zinc-900/40">
                  <td className="px-2 py-1.5 text-zinc-300 font-mono">
                    <div className="flex items-center gap-1">
                      <button onClick={() => move(idx, -1)} className="text-zinc-500 hover:text-zinc-200" aria-label="Move up">
                        <GripVertical className="w-3 h-3" />
                      </button>
                      {row.number}
                    </div>
                  </td>
                  <td className="px-1 py-1">
                    <select
                      value={row.shotType || ""}
                      onChange={(e) => update(idx, { shotType: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded px-1 py-1 text-xs"
                    >
                      <option value="">—</option>
                      {SHOT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </td>
                  <td className="px-1 py-1">
                    <Input value={row.lens || ""} onChange={(e) => update(idx, { lens: e.target.value })} className="h-7 text-xs bg-zinc-950 border-zinc-800" placeholder="35mm" />
                  </td>
                  <td className="px-1 py-1">
                    <select
                      value={row.movement || ""}
                      onChange={(e) => update(idx, { movement: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded px-1 py-1 text-xs"
                    >
                      <option value="">—</option>
                      {MOVEMENTS.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </td>
                  <td className="px-1 py-1">
                    <Input value={row.framing || ""} onChange={(e) => update(idx, { framing: e.target.value })} className="h-7 text-xs bg-zinc-950 border-zinc-800" placeholder="Eye-level" />
                  </td>
                  <td className="px-1 py-1">
                    <Textarea value={row.notes || ""} onChange={(e) => update(idx, { notes: e.target.value })} className="text-xs bg-zinc-950 border-zinc-800 min-h-[28px] py-1" rows={1} />
                  </td>
                  <td className="px-1 py-1">
                    <Input type="number" min={0} max={7200} value={row.durationSec ?? 0} onChange={(e) => update(idx, { durationSec: Number(e.target.value) || 0 })} className="h-7 text-xs bg-zinc-950 border-zinc-800 w-14" />
                  </td>
                  <td className="px-1 py-1 text-right">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400 hover:text-red-300" onClick={() => removeRow(idx)} aria-label="Remove shot">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
