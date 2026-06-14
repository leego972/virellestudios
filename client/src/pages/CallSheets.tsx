import { useParams, useLocation } from "wouter";
  import { Button } from "@/components/ui/button";
  import { trpc } from "@/lib/trpc";
  import {
    ArrowLeft, FileText, Printer, Calendar, Clock,
    MapPin, Users, Plus, ChevronRight, Clapperboard,
  } from "lucide-react";

  const GOLD = "#D4AF37";

  function fmt(date: string) {
    if (!date) return null;
    return new Date(date).toLocaleDateString("en-US", { weekday:"long", month:"short", day:"numeric" });
  }

  export default function CallSheets() {
    const { id } = useParams<{ id: string }>();
    const projectId = parseInt(id || "0");
    const [, navigate] = useLocation();

    const { data: project } = trpc.project.get.useQuery({ id: projectId }, { enabled: !!projectId });
    const { data: days  = [] } = trpc.shootDay.list.useQuery({ projectId }, { enabled: !!projectId });
    const { data: scenes = [] } = trpc.scene.listByProject.useQuery({ projectId }, { enabled: !!projectId });
    const { data: locs  = [] } = trpc.location.listByProject.useQuery({ projectId }, { enabled: !!projectId });

    const totalDays = (days as any[]).length;
    const dayWithDate = (days as any[]).filter((d: any) => d.shootDate).length;

    return (
      <div className="min-h-screen" style={{ background:"linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)" }}>
        {/* Header */}
        <div className="border-b sticky top-0 z-20" style={{ borderColor:"rgba(255,255,255,0.07)", background:"rgba(7,7,14,0.97)", backdropFilter:"blur(24px)" }}>
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => navigate(`/projects/${projectId}`)} className="gap-2 text-muted-foreground h-8"><ArrowLeft className="h-4 w-4" />Back</Button>
              <div className="h-5 w-px bg-border/40" />
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0" style={{ background:"linear-gradient(135deg,#D4AF37,#b8960c)" }}>
                  <FileText className="text-black" style={{ width:18, height:18 }} />
                </div>
                <div>
                  <div className="font-bold text-sm">{project?.title} — Call Sheets</div>
                  <div className="text-[10px] text-muted-foreground">{totalDays} shoot day{totalDays!==1?"s":""} · {dayWithDate} with dates · one printable sheet per day</div>
                </div>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => navigate(`/projects/${projectId}/schedule`)} className="h-8 text-xs gap-1.5 border-border/40">
              <Plus className="h-3.5 w-3.5" />Add Days
            </Button>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-5 space-y-4">

          {/* Stats row */}
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
            {[
              { label:"Shoot Days",   val:String(totalDays),            color:GOLD        },
              { label:"Dated",        val:String(dayWithDate),          color:"#60a5fa"   },
              { label:"Total Scenes", val:String((scenes as any[]).length), color:"#a78bfa" },
              { label:"Locations",    val:String((locs   as any[]).length), color:"#34d399" },
            ].map((s,i) => (
              <div key={i} className="rounded-xl border px-3 py-2.5" style={{ borderColor:"rgba(255,255,255,0.07)", background:"rgba(255,255,255,0.02)" }}>
                <div className="text-[9px] text-muted-foreground uppercase tracking-wider">{s.label}</div>
                <div className="text-xl font-bold mt-0.5" style={{ color:s.color }}>{s.val}</div>
              </div>
            ))}
          </div>

          {/* Day list */}
          {totalDays === 0 ? (
            <div className="rounded-2xl border-2 border-dashed flex flex-col items-center py-24 gap-3" style={{ borderColor:"rgba(255,255,255,0.06)" }}>
              <Clapperboard className="h-12 w-12 opacity-20" />
              <p className="text-sm font-medium">No shoot days yet</p>
              <p className="text-xs text-muted-foreground text-center max-w-xs">Create shoot days on the Schedule page — each will get its own printable call sheet.</p>
              <Button size="sm" onClick={() => navigate(`/projects/${projectId}/schedule`)} className="mt-2 gap-1.5 text-xs" style={{ background:"linear-gradient(135deg,#D4AF37,#b8960c)", color:"#000" }}>
                <Plus className="h-3 w-3" />Open Schedule
              </Button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {(days as any[]).map((d: any) => {
                const loc = (locs as any[]).find((l: any) => l.id === d.locationId);
                const dayScenesCount = (scenes as any[]).filter((s: any) => s.shootDayId === d.id).length;

                return (
                  <div key={d.id} className="rounded-xl border overflow-hidden transition-all group hover:border-yellow-500/20"
                    style={{ borderColor:"rgba(255,255,255,0.07)", background:"rgba(255,255,255,0.02)" }}>
                    <div className="flex items-center gap-4 px-5 py-4">
                      {/* Day badge */}
                      <div className="h-12 w-12 rounded-xl flex flex-col items-center justify-center shrink-0 border"
                        style={{ borderColor:"rgba(212,175,55,0.2)", background:"rgba(212,175,55,0.06)" }}>
                        <span className="text-[9px] text-muted-foreground/50 uppercase tracking-wider">Day</span>
                        <span className="text-lg font-bold leading-none" style={{ color:GOLD }}>{d.dayNumber}</span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold">
                            {d.shootDate ? fmt(d.shootDate) : <span className="text-muted-foreground/50 italic">Date TBD</span>}
                          </span>
                          {d.callTime && (
                            <span className="flex items-center gap-1 text-[10px] text-muted-foreground/50 px-1.5 py-0.5 rounded-full border border-white/6">
                              <Clock style={{ width:9, height:9 }} />Call {d.callTime}
                              {d.wrapTime && <> · Wrap {d.wrapTime}</>}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1.5">
                          {loc && (
                            <span className="flex items-center gap-1 text-[10px] text-muted-foreground/50">
                              <MapPin style={{ width:9, height:9 }} />{loc.name}
                            </span>
                          )}
                          {dayScenesCount > 0 && (
                            <span className="flex items-center gap-1 text-[10px] text-muted-foreground/50">
                              <Clapperboard style={{ width:9, height:9 }} />{dayScenesCount} scene{dayScenesCount!==1?"s":""}
                            </span>
                          )}
                          {d.weatherNote && (
                            <span className="text-[10px] text-muted-foreground/40 truncate">{d.weatherNote}</span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <Button size="sm" variant="outline" onClick={() => navigate(`/projects/${projectId}/call-sheets/${d.id}`)} className="h-8 text-xs gap-1.5 border-border/40 group-hover:border-yellow-500/30">
                          <Printer style={{ width:12, height:12 }} />Open Sheet
                        </Button>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/20 group-hover:/60 transition-colors" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Quick link to schedule */}
          {totalDays > 0 && (
            <div className="flex justify-center pt-2">
              <Button variant="ghost" size="sm" onClick={() => navigate(`/projects/${projectId}/schedule`)} className="text-xs text-muted-foreground/50 hover: gap-1.5">
                <Calendar style={{ width:12, height:12 }} />Manage schedule & shoot days
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }
  