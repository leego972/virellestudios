import { useMemo } from "react";
  import { useAuth } from "@/_core/hooks/useAuth";
  import { trpc } from "@/lib/trpc";
  import { useLocation } from "wouter";
  import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
  import { Badge } from "@/components/ui/badge";
  import { Button } from "@/components/ui/button";
  import { AlertTriangle, CheckCircle2, Loader2, Layers, ArrowRight } from "lucide-react";

  interface ContinuityWarningsPanelProps {
    projectId: number | string;
  }

  export default function ContinuityWarningsPanel({ projectId }: ContinuityWarningsPanelProps) {
    const { user } = useAuth();
    const [, navigate] = useLocation();
    const numId = Number(projectId);

    const { data: scenes, isLoading } = trpc.scene.listByProject.useQuery(
      { projectId: numId },
      { enabled: !!user && !!numId }
    );

    const stats = useMemo(() => {
      if (!scenes) return null;
      const total = scenes.length;
      // Scenes with production notes or wardrobe notes are "tracked"
      const tracked = scenes.filter((s: any) =>
        s.productionNotes || s.wardrobeNotes || s.continuityNotes
      ).length;
      // Scenes missing core continuity fields
      const gaps = scenes.filter((s: any) =>
        !s.timeOfDay || !s.locationType
      ).length;
      return { total, tracked, gaps };
    }, [scenes]);

    return (
      <Card className="glass-card" style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2" style={{ color: "#D4AF37" }}>
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            Continuity Warnings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
            </div>
          ) : !stats || stats.total === 0 ? (
            <div className="flex flex-col items-center gap-2 py-4 text-center">
              <Layers className="h-8 w-8 text-zinc-600" />
              <p className="text-xs text-muted-foreground">No scenes yet. Add scenes to track continuity.</p>
            </div>
          ) : (
            <>
              {/* Scene coverage summary */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg p-2.5 text-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <p className="text-lg font-bold text-zinc-100">{stats.total}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Scenes</p>
                </div>
                <div className="rounded-lg p-2.5 text-center" style={{ background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.15)" }}>
                  <p className="text-lg font-bold text-amber-400">{stats.tracked}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Tracked</p>
                </div>
                <div
                  className="rounded-lg p-2.5 text-center"
                  style={{
                    background: stats.gaps > 0 ? "rgba(239,68,68,0.06)" : "rgba(52,211,153,0.06)",
                    border: `1px solid ${stats.gaps > 0 ? "rgba(239,68,68,0.2)" : "rgba(52,211,153,0.2)"}`,
                  }}
                >
                  <p className={`text-lg font-bold ${stats.gaps > 0 ? "text-red-400" : "text-emerald-400"}`}>{stats.gaps}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Gaps</p>
                </div>
              </div>

              {/* Status badge */}
              {stats.gaps === 0 ? (
                <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  All scenes have time-of-day and location set.
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-amber-400">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {stats.gaps} scene{stats.gaps !== 1 ? "s" : ""} missing time-of-day or location.
                </div>
              )}

              {/* CTA to full panel */}
              <Button
                size="sm"
                variant="outline"
                className="w-full gap-1.5 text-xs border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                onClick={() => navigate(`/projects/${projectId}/continuity-check`)}
              >
                Full Continuity Check
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    );
  }
  