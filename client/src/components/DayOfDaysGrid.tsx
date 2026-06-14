import { useMemo } from "react";

interface Scene {
  id: number;
  shootDayId?: number | null;
  characterIds?: number[] | null;
}
interface ShootDay { id: number; dayNumber: number; shootDate?: string | Date | null; }
interface Character { id: number; name: string; }

interface Props {
  scenes: Scene[];
  days: ShootDay[];
  characters: Character[];
}

/**
 * v6.63 — Day Out of Days. The classic 1AD grid showing which actor works
 * on which day. Cells: SW = Start/Wrap, W = Work, H = Hold, "" = off.
 * Powers payroll/hold-day calculations and schedule gut-checks.
 */
export default function DayOfDaysGrid({ scenes, days, characters }: Props) {
  const sortedDays = useMemo(() => [...days].sort((a, b) => a.dayNumber - b.dayNumber), [days]);

  // Build per-character set of working days
  const workingByChar = useMemo(() => {
    const m = new Map<number, Set<number>>();
    for (const c of characters) m.set(c.id, new Set());
    for (const s of scenes) {
      if (!s.shootDayId) continue;
      for (const cid of (s.characterIds || [])) {
        if (m.has(cid)) m.get(cid)!.add(s.shootDayId);
      }
    }
    return m;
  }, [scenes, characters]);

  function cellLabel(cid: number, dayId: number): { label: string; color: string } {
    const set = workingByChar.get(cid);
    if (!set) return { label: "", color: "" };
    const works = set.has(dayId);
    if (!works) {
      // Hold day = between first and last working day
      const dayNums = sortedDays.map((d) => d.id);
      const idx = dayNums.indexOf(dayId);
      const workIdxs = dayNums.map((id, i) => set.has(id) ? i : -1).filter((i) => i >= 0);
      if (workIdxs.length === 0) return { label: "", color: "" };
      const first = workIdxs[0]; const last = workIdxs[workIdxs.length - 1];
      if (idx > first && idx < last) return { label: "H", color: "bg-amber-900/50 text-amber-200" };
      return { label: "", color: "text-zinc-700" };
    }
    // Working day. Mark Start/Wrap if first or last.
    const dayNums = sortedDays.map((d) => d.id);
    const idx = dayNums.indexOf(dayId);
    const workIdxs = dayNums.map((id, i) => set.has(id) ? i : -1).filter((i) => i >= 0);
    const isFirst = workIdxs[0] === idx;
    const isLast = workIdxs[workIdxs.length - 1] === idx;
    if (isFirst && isLast) return { label: "SW", color: "bg-emerald-700 text-white font-semibold" };
    if (isFirst) return { label: "S", color: "bg-emerald-700 text-white font-semibold" };
    if (isLast) return { label: "W", color: "bg-rose-700 text-white font-semibold" };
    return { label: "·", color: "bg-[rgba(255,255,255,0.04)] text-zinc-200" };
  }

  if (characters.length === 0 || sortedDays.length === 0) {
    return (
      <div className="text-sm text-zinc-500 italic border border-dashed border-[rgba(255,255,255,0.07)] rounded p-8 text-center">
        Need at least one character and one shoot day to render the Day-Out-of-Days grid.
      </div>
    );
  }

  // Per-character work day count
  const totals = new Map<number, { work: number; hold: number }>();
  for (const c of characters) {
    let work = 0, hold = 0;
    for (const d of sortedDays) {
      const r = cellLabel(c.id, d.id);
      if (r.label === "S" || r.label === "W" || r.label === "SW" || r.label === "·") work++;
      if (r.label === "H") hold++;
    }
    totals.set(c.id, { work, hold });
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto border border-[rgba(255,255,255,0.07)] rounded">
        <table className="text-xs">
          <thead className="bg-[rgba(255,255,255,0.04)] text-zinc-400">
            <tr>
              <th className="sticky left-0 bg-[rgba(255,255,255,0.04)] px-3 py-2 text-left font-semibold border-r border-[rgba(255,255,255,0.07)] min-w-[140px]">Cast</th>
              {sortedDays.map((d) => (
                <th key={d.id} className="px-2 py-2 text-center min-w-[42px] border-r border-[rgba(255,255,255,0.07)]/50">
                  <div className="text-amber-500">D{d.dayNumber}</div>
                  {d.shootDate && (
                    <div className="text-[9px] text-zinc-500">{new Date(d.shootDate as any).toLocaleDateString(undefined, { month: "numeric", day: "numeric" })}</div>
                  )}
                </th>
              ))}
              <th className="px-2 py-2 text-center bg-[rgba(255,255,255,0.02)] border-l border-zinc-700 min-w-[50px]">Work</th>
              <th className="px-2 py-2 text-center bg-[rgba(255,255,255,0.02)] min-w-[50px]">Hold</th>
            </tr>
          </thead>
          <tbody>
            {characters.map((c) => {
              const t = totals.get(c.id) || { work: 0, hold: 0 };
              return (
                <tr key={c.id} className="border-t border-[rgba(255,255,255,0.07)] hover:bg-[rgba(255,255,255,0.02)]/40">
                  <td className="sticky left-0 bg-[#07070e] px-3 py-1.5 text-zinc-200 font-medium border-r border-[rgba(255,255,255,0.07)]">{c.name}</td>
                  {sortedDays.map((d) => {
                    const r = cellLabel(c.id, d.id);
                    return (
                      <td key={d.id} className="px-1 py-0 text-center border-r border-[rgba(255,255,255,0.07)]/50">
                        <div className={`mx-auto w-7 h-7 flex items-center justify-center rounded text-[10px] ${r.color}`}>
                          {r.label}
                        </div>
                      </td>
                    );
                  })}
                  <td className="px-2 py-1.5 text-center text-emerald-300 border-l border-zinc-700">{t.work}</td>
                  <td className="px-2 py-1.5 text-center text-amber-300">{t.hold}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="text-[11px] text-zinc-500 flex flex-wrap gap-3">
        <span><span className="bg-emerald-700 text-white px-1.5 rounded">S</span> Start day</span>
        <span><span className="bg-rose-700 text-white px-1.5 rounded">W</span> Wrap day</span>
        <span><span className="bg-emerald-700 text-white px-1.5 rounded">SW</span> Start & Wrap (one-day actor)</span>
        <span><span className="bg-[rgba(255,255,255,0.04)] text-zinc-200 px-1.5 rounded">·</span> Working</span>
        <span><span className="bg-amber-900/50 text-amber-200 px-1.5 rounded">H</span> Hold</span>
      </div>
    </div>
  );
}
