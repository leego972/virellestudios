// v6.69 Phase 4 — SceneElementTags.
//
// Inline chip row that surfaces the production-element context for one scene
// (characters present, location, mood, props). Pure read.

import { trpc } from "../lib/trpc";

type Props = { sceneId: number };

export default function SceneElementTags({ sceneId }: Props) {
  const q = trpc.elements.getPromptContextForScene.useQuery({ sceneId }, { enabled: !!sceneId });
  if (q.isLoading) return <div className="text-xs text-zinc-500">Loading scene context…</div>;
  if (q.error || !q.data) return null;
  const ctx: any = q.data;
  const chips: { label: string; tone: string }[] = [];
  for (const c of (ctx.characters ?? [])) chips.push({ label: c.name ?? "Character", tone: "amber" });
  if (ctx.location?.name) chips.push({ label: ctx.location.name, tone: "sky" });
  if (ctx.timeOfDay) chips.push({ label: ctx.timeOfDay, tone: "violet" });
  if (ctx.mood) chips.push({ label: ctx.mood, tone: "rose" });
  for (const p of (ctx.props ?? []).slice(0, 4)) chips.push({ label: p.name ?? "Prop", tone: "emerald" });
  if (chips.length === 0) {
    return <div className="text-xs text-zinc-500 italic">No element context yet — add characters or a location to lock continuity.</div>;
  }
  const toneCls = (t: string) => ({
    amber:   "bg-amber-500/10 text-amber-200 border-amber-500/30",
    sky:     "bg-sky-500/10 text-sky-200 border-sky-500/30",
    violet:  "bg-violet-500/10 text-violet-200 border-violet-500/30",
    rose:    "bg-rose-500/10 text-rose-200 border-rose-500/30",
    emerald: "bg-emerald-500/10 text-emerald-200 border-emerald-500/30",
  } as Record<string, string>)[t] ?? "bg-zinc-800 text-zinc-200 border-zinc-700";
  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((c, i) => (
        <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded border ${toneCls(c.tone)}`}>
          {c.label}
        </span>
      ))}
    </div>
  );
}
