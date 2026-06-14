import { useMemo } from "react";
import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";

export default function SidesPage() {
  const { id, dayId } = useParams<{ id: string; dayId?: string }>();
  const projectId = parseInt(id || "0", 10);
  const selectedDayId = dayId ? parseInt(dayId, 10) : null;

  const { data: project } = trpc.project.get.useQuery(
    { id: projectId },
    { enabled: !!projectId }
  );
  const { data: days = [] } = trpc.shootDay.list.useQuery(
    { projectId },
    { enabled: !!projectId }
  );
  const { data: scenes = [] } = trpc.scene.listByProject.useQuery(
    { projectId },
    { enabled: !!projectId }
  );
  const { data: locations = [] } = trpc.location.listByProject.useQuery(
    { projectId },
    { enabled: !!projectId }
  );
  const { data: characters = [] } = trpc.character.listByProject.useQuery(
    { projectId },
    { enabled: !!projectId }
  );

  const day = useMemo(
    () => (selectedDayId ? days.find((d: any) => d.id === selectedDayId) : null),
    [days, selectedDayId]
  );
  const dayScenes = useMemo(
    () =>
      selectedDayId
        ? scenes
            .filter((s: any) => s.shootDayId === selectedDayId)
            .sort((a: any, b: any) => (a.shootOrder ?? 0) - (b.shootOrder ?? 0))
        : [],
    [scenes, selectedDayId]
  );
  const location = useMemo(
    () =>
      day?.locationId ? locations.find((l: any) => l.id === day.locationId) : null,
    [day, locations]
  );
  const charById = useMemo(() => {
    const m = new Map<number, any>();
    for (const c of characters as any[]) m.set(c.id, c);
    return m;
  }, [characters]);

  // INDEX VIEW — pick which day's sides to print
  if (!selectedDayId) {
    return (
      <div className="min-h-screen text-zinc-100 p-4 md:p-6 print:hidden" style={{ background:"linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)" }}>
        <div className="max-w-5xl mx-auto space-y-4">
          <Link href={`/projects/${projectId}`}>
            <a className="text-sm text-zinc-400 hover:text-zinc-200">← Back to project</a>
          </Link>
          <h1 className="text-2xl font-bold gradient-text-gold">Sides — pick a shoot day</h1>
          <p className="text-sm text-zinc-400">
            Sides are the printed pages handed to actors and crew at call time. They contain only
            the scenes scheduled for that day. Pick a day below, then your browser's print dialog
            will produce a clean PDF.
          </p>
          {days.length === 0 ? (
            <div className="text-zinc-500 italic">
              No shoot days scheduled yet. Add some in Schedule.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {days.map((d: any) => {
                const count = scenes.filter((s: any) => s.shootDayId === d.id).length;
                return (
                  <Link key={d.id} href={`/projects/${projectId}/sides/${d.id}`}>
                    <a className="block border border-zinc-800 hover:border-amber-500/50 rounded-lg p-4 bg-zinc-900/40">
                      <div className="text-xs text-zinc-500">Day {d.dayNumber}</div>
                      <div className="text-base font-medium">
                        {d.shootDate ? new Date(d.shootDate).toLocaleDateString() : "Unscheduled"}
                      </div>
                      <div className="text-xs text-zinc-400 mt-1">
                        {count} scene{count === 1 ? "" : "s"} scheduled
                      </div>
                    </a>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // PRINT VIEW
  return (
    <div className="min-h-screen" style={{background:"linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)",color:"var(--foreground)"}}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page { size: letter; margin: 0.5in; }
          body { background: white; }
          .scene-block { page-break-inside: avoid; }
        }
        .sides-page { font-family: Courier, "Courier New", monospace; }
      `}</style>
      <div className="no-print bg-zinc-900 text-zinc-100 p-3 flex items-center gap-4 sticky top-0 z-10">
        <Link href={`/projects/${projectId}/sides`}>
          <a className="text-sm text-zinc-400 hover:text-zinc-200">← Pick another day</a>
        </Link>
        <button
          onClick={() => window.print()}
          className="ml-auto px-4 py-1.5 rounded bg-amber-500 text-black text-sm font-medium hover:bg-amber-400"
        >
          Print to PDF
        </button>
      </div>
      <div className="sides-page max-w-3xl mx-auto p-8">
        <div className="border-b-2 border-black pb-3 mb-4">
          <div className="flex items-baseline justify-between">
            <h1 className="text-xl font-bold uppercase tracking-wide gradient-text-gold">
              {project?.title || "Untitled Project"}
            </h1>
            <span className="text-sm">
              SIDES — Day {day?.dayNumber} of {days.length}
            </span>
          </div>
          <div className="text-sm mt-1 flex flex-wrap gap-4">
            <span>
              <strong>Date:</strong>{" "}
              {day?.shootDate ? new Date(day.shootDate).toLocaleDateString() : "—"}
            </span>
            <span>
              <strong>Call:</strong> {day?.callTime || "—"}
            </span>
            <span>
              <strong>Wrap:</strong> {day?.wrapTime || "—"}
            </span>
            {location && (
              <span>
                <strong>Location:</strong> {(location as any).name}
              </span>
            )}
          </div>
        </div>

        {dayScenes.length === 0 ? (
          <div className="italic text-zinc-600">No scenes scheduled for this day.</div>
        ) : (
          dayScenes.map((s: any, i: number) => {
            const charIds: number[] = Array.isArray(s.characterIds) ? s.characterIds : [];
            const sceneChars = charIds.map((cid) => charById.get(cid)).filter(Boolean);
            return (
              <div key={s.id} className="scene-block mb-6">
                <div className="border-b border-black/30 pb-1 mb-2 flex items-baseline justify-between">
                  <h2 className="text-base font-bold uppercase gradient-text-gold">
                    {i + 1}. {s.title || `Scene ${s.orderIndex + 1}`}
                  </h2>
                  <span className="text-xs">
                    {s.timeOfDay ? s.timeOfDay.toUpperCase() : ""}
                    {s.locationType ? ` · ${s.locationType.toUpperCase()}` : ""}
                  </span>
                </div>
                {sceneChars.length > 0 && (
                  <div className="text-xs mb-1">
                    <strong>Cast:</strong>{" "}
                    {sceneChars.map((c: any) => c.name).join(", ")}
                  </div>
                )}
                {s.description && (
                  <div className="text-sm whitespace-pre-wrap mb-2">{s.description}</div>
                )}
                {s.dialogueText && (
                  <div className="text-sm whitespace-pre-wrap leading-relaxed border-l-2 border-black/20 pl-3 my-2">
                    {s.dialogueText}
                  </div>
                )}
                {s.productionNotes && (
                  <div className="text-xs italic text-zinc-700 mt-1">
                    Note: {s.productionNotes}
                  </div>
                )}
              </div>
            );
          })
        )}

        <div className="border-t-2 border-black pt-2 mt-8 text-xs flex justify-between">
          <span>Generated by Virelle Studios</span>
          <span>{new Date().toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
