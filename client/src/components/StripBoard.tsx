import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Calendar, MapPin, Clock, ArrowRight, ArrowLeft, X } from "lucide-react";

interface Scene {
  id: number;
  title?: string | null;
  sceneNumber?: number | null;
  description?: string | null;
  intExt?: string | null;
  timeOfDay?: string | null;
  location?: string | null;
  characterIds?: number[] | null;
  shootDayId?: number | null;
  shootOrder?: number | null;
  approvalStatus?: string | null;
}
interface ShootDay {
  id: number;
  dayNumber: number;
  shootDate?: string | Date | null;
  callTime?: string | null;
  wrapTime?: string | null;
  locationId?: number | null;
}

interface Props {
  projectId: number;
  scenes: Scene[];
  days: ShootDay[];
  locations?: Array<{ id: number; name: string }>;
}

/**
 * v6.63 — Strip board: classic film-production scheduling view. Each shoot
 * day is a column with its scenes stacked as colored "strips" (color by
 * INT/EXT). Unscheduled scenes sit in a sidebar; click arrows to assign /
 * unassign / reorder. (Drag-drop is intentionally avoided to keep things
 * keyboard-accessible and snappy on mobile.)
 */
export default function StripBoard({ projectId, scenes, days, locations = [] }: Props) {
  const utils = trpc.useUtils();
  const assignMut = trpc.shootDay.assignScene.useMutation();
  const locById = useMemo(() => new Map(locations.map((l) => [l.id, l.name])), [locations]);

  const unscheduled = scenes.filter((s) => !s.shootDayId);
  const byDay = useMemo(() => {
    const map = new Map<number, Scene[]>();
    for (const d of days) map.set(d.id, []);
    for (const s of scenes) {
      if (s.shootDayId && map.has(s.shootDayId)) map.get(s.shootDayId)!.push(s);
    }
    for (const arr of map.values()) arr.sort((a, b) => (a.shootOrder || 0) - (b.shootOrder || 0));
    return map;
  }, [scenes, days]);

  async function assign(sceneId: number, dayId: number | null, order = 0) {
    try {
      await assignMut.mutateAsync({ sceneId, shootDayId: dayId, shootOrder: order });
      await utils.scene.listByProject.invalidate();
      await utils.shootDay.list.invalidate();
    } catch (e: any) { toast.error(e?.message || "Failed"); }
  }

  function stripColor(s: Scene) {
    const ie = (s.intExt || "").toUpperCase();
    const tod = (s.timeOfDay || "").toLowerCase();
    if (ie.includes("EXT") && tod.includes("night")) return "bg-indigo-900/60 border-indigo-700";
    if (ie.includes("EXT")) return "bg-amber-900/40 border-amber-700";
    if (tod.includes("night")) return "bg-blue-900/50 border-blue-700";
    return "bg-zinc-800/60 border-zinc-700";
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
      {/* Unscheduled column */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 h-fit lg:max-h-[70vh] lg:overflow-auto">
        <div className="text-xs uppercase tracking-wider text-zinc-400 font-semibold mb-2">
          Unscheduled · {unscheduled.length}
        </div>
        {unscheduled.length === 0 ? (
          <div className="text-xs text-zinc-500 italic py-2">All scenes scheduled.</div>
        ) : (
          <div className="space-y-1.5">
            {unscheduled.map((s) => (
              <div key={s.id} className={`p-2 rounded border ${stripColor(s)} text-xs`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-zinc-300">#{s.sceneNumber || s.id}</div>
                    <div className="text-zinc-100 truncate">{s.title || s.description?.slice(0, 60) || "Untitled"}</div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">
                      {s.intExt || "—"} · {s.timeOfDay || "—"}
                    </div>
                  </div>
                  {days.length > 0 && (
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        if (v) assign(s.id, v, byDay.get(v)?.length || 0);
                      }}
                      className="bg-zinc-900 border border-zinc-700 rounded text-[10px] px-1 py-0.5"
                    >
                      <option value="">→ Day…</option>
                      {days.map((d) => (
                        <option key={d.id} value={d.id}>Day {d.dayNumber}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Day columns */}
      <div className="overflow-x-auto">
        {days.length === 0 ? (
          <div className="text-sm text-zinc-500 italic border border-dashed border-zinc-800 rounded p-8 text-center">
            No shoot days yet. Click <span className="text-zinc-300">Add day</span> above to create one.
          </div>
        ) : (
          <div className="flex gap-3 pb-2 min-w-min">
            {days.map((d) => {
              const dayScenes = byDay.get(d.id) || [];
              const dateLabel = d.shootDate ? new Date(d.shootDate as any).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }) : "Unscheduled date";
              return (
                <div key={d.id} className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 w-[260px] flex-shrink-0 lg:max-h-[70vh] lg:overflow-auto">
                  <div className="mb-2">
                    <div className="flex items-center gap-1.5 text-amber-500 font-semibold">
                      <Calendar className="w-3.5 h-3.5" />
                      <span className="text-sm">Day {d.dayNumber}</span>
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">{dateLabel}</div>
                    <div className="text-[10px] text-zinc-500 flex items-center gap-2 mt-0.5">
                      {d.callTime && <span className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{d.callTime}</span>}
                      {d.locationId && locById.has(d.locationId) && <span className="flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{locById.get(d.locationId)}</span>}
                    </div>
                  </div>
                  {dayScenes.length === 0 ? (
                    <div className="text-[11px] text-zinc-500 italic py-2 text-center">No scenes assigned</div>
                  ) : (
                    <div className="space-y-1.5">
                      {dayScenes.map((s, i) => (
                        <div key={s.id} className={`p-2 rounded border ${stripColor(s)} text-xs`}>
                          <div className="flex items-start justify-between gap-1.5">
                            <div className="flex-1 min-w-0">
                              <div className="font-mono text-zinc-300">#{s.sceneNumber || s.id}</div>
                              <div className="text-zinc-100 truncate">{s.title || s.description?.slice(0, 60) || "Untitled"}</div>
                              <div className="text-[10px] text-zinc-400 mt-0.5">
                                {s.intExt || "—"} · {s.timeOfDay || "—"}
                              </div>
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <button onClick={() => assign(s.id, d.id, Math.max(0, i - 1))} disabled={i === 0} className="text-zinc-500 hover:text-zinc-200 disabled:opacity-30" aria-label="Move up">
                                <ArrowLeft className="w-3 h-3 -rotate-90" />
                              </button>
                              <button onClick={() => assign(s.id, d.id, i + 1)} disabled={i === dayScenes.length - 1} className="text-zinc-500 hover:text-zinc-200 disabled:opacity-30" aria-label="Move down">
                                <ArrowRight className="w-3 h-3 rotate-90" />
                              </button>
                              <button onClick={() => assign(s.id, null, 0)} className="text-red-400 hover:text-red-300" aria-label="Unassign">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
