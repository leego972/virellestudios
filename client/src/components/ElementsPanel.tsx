// v6.69 Phase 4 — ElementsPanel.
//
// Displays the unified character / location / prop / style element set for a
// project so the user has a single surface for the consistency layer.
// Pure read; embedded inside the Project Command Center.

import { trpc } from "../lib/trpc";

type Props = { projectId: number };

export default function ElementsPanel({ projectId }: Props) {
  const q = trpc.elements.listProjectElements.useQuery({ projectId });
  if (q.isLoading) {
    return <div className="text-sm text-zinc-400">Loading elements…</div>;
  }
  if (q.error) {
    return <div className="text-sm text-rose-300">Couldn't load elements: {q.error.message}</div>;
  }
  const data: any = q.data ?? {};
  const characters: any[] = data.characters ?? [];
  const locations: any[] = data.locations ?? [];
  const props: any[] = data.props ?? [];
  const styles: any[] = data.styles ?? [];

  const Section = ({ title, items, emptyHint }: { title: string; items: any[]; emptyHint: string }) => (
    <div className="mb-3">
      <div className="text-xs uppercase tracking-wide text-amber-300/80 mb-1">{title}</div>
      {items.length === 0 ? (
        <div className="text-xs text-zinc-500 italic">{emptyHint}</div>
      ) : (
        <ul className="text-sm text-zinc-200 space-y-1">
          {items.slice(0, 12).map((it: any, idx: number) => (
            <li key={it.id ?? idx} className="flex items-start gap-2">
              <span className="mt-1 inline-block w-1.5 h-1.5 rounded-full bg-amber-400" />
              <div>
                <div className="font-medium">{it.name ?? it.title ?? "Untitled"}</div>
                {it.description && (
                  <div className="text-xs text-zinc-400 line-clamp-2">{it.description}</div>
                )}
              </div>
            </li>
          ))}
          {items.length > 12 && (
            <li className="text-xs text-zinc-500">…and {items.length - 12} more.</li>
          )}
        </ul>
      )}
    </div>
  );

  return (
    <div className="rounded-lg p-4" style={{ border:"1px solid rgba(255,255,255,0.07)", background:"rgba(255,255,255,0.02)" }}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold gradient-text-gold">Production Elements</h3>
        <div className="text-xs text-zinc-500">
          {characters.length} characters · {locations.length} locations · {props.length} props
        </div>
      </div>
      <Section title="Characters" items={characters} emptyHint="No characters defined yet." />
      <Section title="Locations" items={locations} emptyHint="Add a primary location to keep continuity tight." />
      <Section title="Props" items={props} emptyHint="Recurring props help the AI keep continuity across scenes." />
      <Section title="Style anchors" items={styles} emptyHint="Pick a tone, palette, or genre to lock the style." />
    </div>
  );
}
