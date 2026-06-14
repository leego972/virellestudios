import { useParams, useLocation } from "wouter";
  import { Button } from "@/components/ui/button";
  import { trpc } from "@/lib/trpc";
  import { ArrowLeft, Grid3x3, Calendar, Users, Clapperboard } from "lucide-react";
  import DayOfDaysGrid from "@/components/DayOfDaysGrid";

  const GOLD = "#D4AF37";

  export default function DayOutOfDays() {
    const { id } = useParams<{ id: string }>();
    const projectId = parseInt(id || "0");
    const [, navigate] = useLocation();

    const { data: project    } = trpc.project.get.useQuery({ id: projectId }, { enabled: !!projectId });
    const { data: days    = []} = trpc.shootDay.list.useQuery({ projectId }, { enabled: !!projectId });
    const { data: scenes  = []} = trpc.scene.listByProject.useQuery({ projectId }, { enabled: !!projectId });
    const { data: characters= []} = trpc.character.listByProject.useQuery({ projectId }, { enabled: !!projectId });

    const daysArr  = days      as any[];
    const scenesArr = scenes   as any[];
    const charsArr  = characters as any[];

    return (
      <div className="min-h-screen" style={{ background:"linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)" }}>
        {/* Header */}
        <div className="border-b sticky top-0 z-20" style={{ borderColor:"rgba(255,255,255,0.07)", background:"rgba(7,7,14,0.97)", backdropFilter:"blur(24px)" }}>
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => navigate(`/projects/${projectId}/schedule`)} className="gap-2 text-muted-foreground h-8"><ArrowLeft className="h-4 w-4" />Schedule</Button>
              <div className="h-5 w-px bg-border/40" />
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0" style={{ background:"linear-gradient(135deg,#D4AF37,#b8960c)" }}>
                  <Grid3x3 className="text-black" style={{ width:18, height:18 }} />
                </div>
                <div>
                  <div className="font-bold text-sm">{project?.title} — Day-Out-of-Days</div>
                  <div className="text-[10px] text-muted-foreground">Cast working / hold grid across the entire shoot</div>
                </div>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => navigate(`/projects/${projectId}/call-sheets`)} className="h-8 text-xs gap-1.5 border-border/40">
              <Calendar style={{ width:12, height:12 }} />Call Sheets
            </Button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-5 space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { label:"Shoot Days",  val:String(daysArr.length),  color:GOLD        },
              { label:"Characters",  val:String(charsArr.length), color:"#f472b6"   },
              { label:"Scenes",      val:String(scenesArr.length),color:"#60a5fa"   },
            ].map((s,i) => (
              <div key={i} className="rounded-xl border px-3 py-2.5" style={{ borderColor:"rgba(255,255,255,0.07)", background:"rgba(255,255,255,0.02)" }}>
                <div className="text-[9px] text-muted-foreground uppercase tracking-wider">{s.label}</div>
                <div className="text-xl font-bold mt-0.5" style={{ color:s.color }}>{s.val}</div>
              </div>
            ))}
          </div>

          {/* DOOD Grid component */}
          {daysArr.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed flex flex-col items-center py-24 gap-3" style={{ borderColor:"rgba(255,255,255,0.06)" }}>
              <Users className="h-12 w-12 opacity-20" />
              <p className="text-sm font-medium">No shoot days yet</p>
              <p className="text-xs text-muted-foreground text-center max-w-xs">Add shoot days on the Schedule page, then the Day-Out-of-Days grid will populate automatically.</p>
              <Button size="sm" onClick={() => navigate(`/projects/${projectId}/schedule`)} className="mt-2 gap-1.5 text-xs" style={{ background:"linear-gradient(135deg,#D4AF37,#b8960c)", color:"#000" }}>
                <Calendar style={{ width:12, height:12 }} />Open Schedule
              </Button>
            </div>
          ) : (
            <div className="rounded-2xl border overflow-hidden" style={{ borderColor:"rgba(255,255,255,0.07)" }}>
              <DayOfDaysGrid scenes={scenesArr} days={daysArr} characters={charsArr} />
            </div>
          )}
        </div>
      </div>
    );
  }
  