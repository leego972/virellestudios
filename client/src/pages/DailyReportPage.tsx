import { useMemo } from "react";
import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";

export default function DailyReportPage() {
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
  const { data: crew = [] } = trpc.crewContact.list.useQuery(
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

  const totalDurationSec = useMemo(
    () => dayScenes.reduce((sum: number, s: any) => sum + (s.duration ?? 0), 0),
    [dayScenes]
  );
  const totalPages = useMemo(() => {
    // Industry rule of thumb: 1 page ≈ 1 minute of screen time.
    const minutes = totalDurationSec / 60;
    return Math.round(minutes * 8) / 8; // eighths of a page
  }, [totalDurationSec]);

  // INDEX VIEW
  if (!selectedDayId) {
    return (
      <div className="min-h-screen text-zinc-100 p-4 md:p-6 print:hidden" style={{ background:"linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)" }}>
        <div className="max-w-5xl mx-auto space-y-4">
          <Link href={`/projects/${projectId}`}>
            <a className="text-sm text-zinc-400 hover:text-zinc-200">← Back to project</a>
          </Link>
          <h1 className="text-2xl font-bold">Daily Production Report — pick a day</h1>
          <p className="text-sm text-zinc-400">
            The Daily Production Report (DPR) is the wrap-of-day summary the AD signs every
            night. It captures call/wrap, scenes shot, page count completed, weather, and
            location. Pick a day below — your browser's print dialog will produce a clean PDF.
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
                  <Link key={d.id} href={`/projects/${projectId}/daily-report/${d.id}`}>
                    <a className="block border border-zinc-800 hover:border-amber-500/50 rounded-lg p-4 bg-zinc-900/40">
                      <div className="text-xs text-zinc-500">Day {d.dayNumber}</div>
                      <div className="text-base font-medium">
                        {d.shootDate ? new Date(d.shootDate).toLocaleDateString() : "Unscheduled"}
                      </div>
                      <div className="text-xs text-zinc-400 mt-1">
                        {count} scene{count === 1 ? "" : "s"} planned
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
          .dpr-section { page-break-inside: avoid; }
        }
        .dpr-page { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        .dpr-table { width: 100%; border-collapse: collapse; }
        .dpr-table th, .dpr-table td { border: 1px solid #999; padding: 4px 6px; text-align: left; font-size: 11px; }
        .dpr-table th { background: #f0f0f0; font-weight: 600; }
        .dpr-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; color: #666; }
        .dpr-value { font-size: 12px; font-weight: 500; min-height: 16px; }
      `}</style>
      <div className="no-print bg-zinc-900 text-zinc-100 p-3 flex items-center gap-4 sticky top-0 z-10">
        <Link href={`/projects/${projectId}/daily-report`}>
          <a className="text-sm text-zinc-400 hover:text-zinc-200">← Pick another day</a>
        </Link>
        <button
          onClick={() => window.print()}
          className="ml-auto px-4 py-1.5 rounded bg-amber-500 text-black text-sm font-medium hover:bg-amber-400"
        >
          Print to PDF
        </button>
      </div>
      <div className="dpr-page max-w-4xl mx-auto p-8">
        <div className="border-b-2 border-black pb-3 mb-4 flex items-baseline justify-between">
          <h1 className="text-xl font-bold uppercase tracking-wide">
            DAILY PRODUCTION REPORT
          </h1>
          <span className="text-sm">
            Day {day?.dayNumber} of {days.length}
          </span>
        </div>

        <div className="dpr-section mb-4">
          <h2 className="dpr-label mb-2">Production</h2>
          <table className="dpr-table">
            <tbody>
              <tr>
                <td><span className="dpr-label">Project</span><div className="dpr-value">{project?.title || "—"}</div></td>
                <td><span className="dpr-label">Date</span><div className="dpr-value">{day?.shootDate ? new Date(day.shootDate).toLocaleDateString() : "—"}</div></td>
                <td><span className="dpr-label">Call Time</span><div className="dpr-value">{day?.callTime || "—"}</div></td>
                <td><span className="dpr-label">Wrap Time</span><div className="dpr-value">{day?.wrapTime || "—"}</div></td>
              </tr>
              <tr>
                <td colSpan={2}><span className="dpr-label">Location</span><div className="dpr-value">{location ? (location as any).name : "—"}</div></td>
                <td colSpan={2}><span className="dpr-label">Weather</span><div className="dpr-value">{day?.weatherNote || "—"}</div></td>
              </tr>
              <tr>
                <td colSpan={2}><span className="dpr-label">Hospital</span><div className="dpr-value">{day?.hospitalInfo || "—"}</div></td>
                <td colSpan={2}><span className="dpr-label">Parking</span><div className="dpr-value">{day?.parkingInfo || "—"}</div></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="dpr-section mb-4">
          <h2 className="dpr-label mb-2">Scenes Scheduled ({dayScenes.length})</h2>
          {dayScenes.length === 0 ? (
            <div className="italic text-zinc-600 text-sm">No scenes scheduled for this day.</div>
          ) : (
            <table className="dpr-table">
              <thead>
                <tr>
                  <th style={{ width: 30 }}>#</th>
                  <th>Title</th>
                  <th style={{ width: 80 }}>INT/EXT</th>
                  <th style={{ width: 70 }}>Time</th>
                  <th style={{ width: 60 }}>Pages</th>
                  <th style={{ width: 80 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {dayScenes.map((s: any, i: number) => {
                  const pages = ((s.duration ?? 0) / 60) * 8 / 8;
                  return (
                    <tr key={s.id}>
                      <td>{i + 1}</td>
                      <td>{s.title || `Scene ${s.orderIndex + 1}`}</td>
                      <td>{s.locationType || "—"}</td>
                      <td>{s.timeOfDay || "—"}</td>
                      <td>{pages.toFixed(2)}</td>
                      <td>____________</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="dpr-section mb-4">
          <h2 className="dpr-label mb-2">Page Count</h2>
          <table className="dpr-table">
            <thead>
              <tr>
                <th>Scheduled</th>
                <th>Completed</th>
                <th>Remaining</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{totalPages.toFixed(2)}</td>
                <td>____________</td>
                <td>____________</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="dpr-section mb-4">
          <h2 className="dpr-label mb-2">Crew on Set</h2>
          {(crew as any[]).length === 0 ? (
            <div className="italic text-zinc-600 text-sm">No crew listed.</div>
          ) : (
            <table className="dpr-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role / Department</th>
                  <th>In</th>
                  <th>Out</th>
                </tr>
              </thead>
              <tbody>
                {(crew as any[]).map((c: any) => (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td>{c.role || c.department || "—"}</td>
                    <td>____________</td>
                    <td>____________</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="dpr-section mb-4">
          <h2 className="dpr-label mb-2">Meal Breaks / Notes</h2>
          <div style={{ minHeight: 80, border: "1px solid #999", padding: 6 }}>
            {day?.generalNotes || ""}
          </div>
        </div>

        <div className="dpr-section mt-6">
          <h2 className="dpr-label mb-2">Signatures</h2>
          <table className="dpr-table">
            <tbody>
              <tr>
                <td><span className="dpr-label">1st AD</span><div style={{ minHeight: 30 }}></div></td>
                <td><span className="dpr-label">UPM</span><div style={{ minHeight: 30 }}></div></td>
                <td><span className="dpr-label">Director</span><div style={{ minHeight: 30 }}></div></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="border-t-2 border-black pt-2 mt-8 text-xs flex justify-between">
          <span>Generated by Virelle Studios</span>
          <span>{new Date().toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
