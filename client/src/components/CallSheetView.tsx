import { Calendar, Clock, MapPin, Cloud, Hospital, Car, Users, Film } from "lucide-react";

interface Props {
  data: any; // { day, project, scenes, cast, crew, location }
  printMode?: boolean;
}

/**
 * v6.63 â Call Sheet view. Used both inline (CallSheets index) and on the
 * dedicated print page (CallSheetPrint). Print mode strips chrome and
 * tightens the layout for a clean A4/Letter PDF output via window.print().
 */
export default function CallSheetView({ data, printMode = false }: Props) {
  if (!data) return null;
  const { day, project, scenes = [], cast = [], crew = [], location } = data;
  const dateStr = day?.shootDate ? new Date(day.shootDate).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" }) : "Unscheduled";

  return (
    <div className={printMode ? "bg-white text-black p-8 max-w-[8.5in] mx-auto print:p-4" : "text-zinc-100 p-6 rounded-xl" style={{ border:"1px solid rgba(255,255,255,0.07)", background:"rgba(255,255,255,0.02)" }}}>
      {/* Header */}
      <div className={`flex items-start justify-between pb-4 mb-4 border-b ${printMode ? "border-zinc-300" : "border-zinc-800"}`}>
        <div>
          <div className={`text-xs uppercase tracking-widest ${printMode ? "text-zinc-500" : "text-amber-500"}`}>Call Sheet</div>
          <h1 className={`text-2xl font-bold mt-1 ${printMode ? "text-black" : "text-zinc-100"}`}>{project?.title || "Untitled Project"}</h1>
          <div className={`text-sm mt-0.5 ${printMode ? "text-zinc-600" : "text-zinc-400"}`}>Day {day?.dayNumber} of production</div>
        </div>
        <div className="text-right">
          <div className={`text-sm font-semibold flex items-center gap-1 justify-end ${printMode ? "text-black" : "text-zinc-100"}`}>
            <Calendar className="w-4 h-4" /> {dateStr}
          </div>
          <div className={`text-xs mt-1 ${printMode ? "text-zinc-600" : "text-zinc-400"}`}>
            {day?.callTime ? <>Call: <span className="font-semibold">{day.callTime}</span></> : "Call time TBD"}
            {day?.wrapTime ? <> Â· Wrap: <span className="font-semibold">{day.wrapTime}</span></> : ""}
          </div>
        </div>
      </div>

      {/* Logistics row */}
      <div className={`grid grid-cols-1 md:grid-cols-3 gap-3 mb-4 text-xs ${printMode ? "" : ""}`}>
        <div className={`p-3 rounded border ${printMode ? "border-zinc-300 bg-zinc-50" : "border-zinc-800 bg-zinc-900/40"}`}>
          <div className="font-semibold flex items-center gap-1 mb-1"><MapPin className="w-3.5 h-3.5" /> Location</div>
          <div>{location?.name || "TBD"}</div>
          {location?.address && <div className={`text-[11px] mt-0.5 ${printMode ? "text-zinc-600" : "text-zinc-400"}`}>{location.address}</div>}
        </div>
        <div className={`p-3 rounded border ${printMode ? "border-zinc-300 bg-zinc-50" : "border-zinc-800 bg-zinc-900/40"}`}>
          <div className="font-semibold flex items-center gap-1 mb-1"><Cloud className="w-3.5 h-3.5" /> Weather</div>
          <div>{day?.weatherNote || "â"}</div>
        </div>
        <div className={`p-3 rounded border ${printMode ? "border-zinc-300 bg-zinc-50" : "border-zinc-800 bg-zinc-900/40"}`}>
          <div className="font-semibold flex items-center gap-1 mb-1"><Hospital className="w-3.5 h-3.5" /> Nearest Hospital</div>
          <div className="whitespace-pre-line">{day?.hospitalInfo || "â"}</div>
        </div>
      </div>

      {day?.parkingInfo && (
        <div className={`p-3 rounded border mb-4 text-xs ${printMode ? "border-zinc-300 bg-zinc-50" : "border-zinc-800 bg-zinc-900/40"}`}>
          <div className="font-semibold flex items-center gap-1 mb-1"><Car className="w-3.5 h-3.5" /> Parking & Crew Access</div>
          <div className="whitespace-pre-line">{day.parkingInfo}</div>
        </div>
      )}

      {/* Scenes */}
      <div className="mb-4">
        <div className={`text-sm font-semibold mb-2 flex items-center gap-1.5 ${printMode ? "" : "text-amber-500"}`}>
          <Film className="w-4 h-4" /> Scenes scheduled ({scenes.length})
        </div>
        {scenes.length === 0 ? (
          <div className={`text-xs italic ${printMode ? "text-zinc-500" : "text-zinc-500"}`}>No scenes assigned to this day.</div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className={printMode ? "bg-zinc-100 text-black" : "bg-zinc-900 text-zinc-300"}>
                <th className="px-2 py-1.5 text-left">#</th>
                <th className="px-2 py-1.5 text-left">Scene</th>
                <th className="px-2 py-1.5 text-left">INT/EXT</th>
                <th className="px-2 py-1.5 text-left">Time</th>
                <th className="px-2 py-1.5 text-left">Description</th>
              </tr>
            </thead>
            <tbody>
              {scenes.map((s: any, i: number) => (
                <tr key={s.id} className={`border-t ${printMode ? "border-zinc-200" : "border-zinc-800"}`}>
                  <td className="px-2 py-1.5 font-mono">{i + 1}</td>
                  <td className="px-2 py-1.5 font-mono">#{s.sceneNumber || s.id}</td>
                  <td className="px-2 py-1.5">{s.intExt || "â"}</td>
                  <td className="px-2 py-1.5">{s.timeOfDay || "â"}</td>
                  <td className="px-2 py-1.5">{s.title || (s.description || "").slice(0, 80)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Cast */}
      <div className="mb-4">
        <div className={`text-sm font-semibold mb-2 flex items-center gap-1.5 ${printMode ? "" : "text-amber-500"}`}>
          <Users className="w-4 h-4" /> Cast called ({cast.length})
        </div>
        {cast.length === 0 ? (
          <div className="text-xs italic text-zinc-500">No characters identified for today's scenes.</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            {cast.map((c: any) => (
              <div key={c.id} className={`p-2 rounded border ${printMode ? "border-zinc-300 bg-zinc-50" : "border-zinc-800 bg-zinc-900/40"}`}>
                <div className="font-semibold">{c.name}</div>
                {c.role && <div className={`${printMode ? "text-zinc-600" : "text-zinc-400"} text-[11px]`}>{c.role}</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Crew */}
      <div>
        <div className={`text-sm font-semibold mb-2 flex items-center gap-1.5 ${printMode ? "" : "text-amber-500"}`}>
          <Users className="w-4 h-4" /> Crew ({crew.length})
        </div>
        {crew.length === 0 ? (
          <div className="text-xs italic text-zinc-500">No crew contacts on file. Add them on the Crew page.</div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className={printMode ? "bg-zinc-100 text-black" : "bg-zinc-900 text-zinc-300"}>
                <th className="px-2 py-1.5 text-left">Name</th>
                <th className="px-2 py-1.5 text-left">Role</th>
                <th className="px-2 py-1.5 text-left">Dept</th>
                <th className="px-2 py-1.5 text-left">Call</th>
                <th className="px-2 py-1.5 text-left">Phone</th>
                <th className="px-2 py-1.5 text-left">Email</th>
              </tr>
            </thead>
            <tbody>
              {crew.map((c: any) => (
                <tr key={c.id} className={`border-t ${printMode ? "border-zinc-200" : "border-zinc-800"}`}>
                  <td className="px-2 py-1.5 font-medium">{c.name}</td>
                  <td className="px-2 py-1.5">{c.role || "â"}</td>
                  <td className="px-2 py-1.5">{c.department || "â"}</td>
                  <td className="px-2 py-1.5 font-mono">{c.callTimeOverride || day?.callTime || "â"}</td>
                  <td className="px-2 py-1.5">{c.phone || "â"}</td>
                  <td className="px-2 py-1.5 truncate max-w-[180px]">{c.email || "â"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {day?.generalNotes && (
        <div className={`mt-4 p-3 rounded border text-xs ${printMode ? "border-zinc-300 bg-zinc-50" : "border-zinc-800 bg-zinc-900/40"}`}>
          <div className="font-semibold mb-1">General notes</div>
          <div className="whitespace-pre-line">{day.generalNotes}</div>
        </div>
      )}

      <div className={`mt-6 pt-3 border-t text-[10px] ${printMode ? "border-zinc-300 text-zinc-500" : "border-zinc-800 text-zinc-600"} text-center`}>
        Generated by Virelle Studios Â· {new Date().toLocaleString()}
      </div>
    </div>
  );
}
