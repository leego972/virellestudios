import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Activity, Loader2, CheckCircle2, AlertTriangle, Calendar, Users, FileText, DollarSign, ListChecks, Edit3 } from "lucide-react";

const ICONS: Record<string, any> = {
  "scene.approval.set": CheckCircle2,
  "movie.approval.set": CheckCircle2,
  "scene.shotlist.update": ListChecks,
  "scene.shootday.assign": Calendar,
  "shootday.create": Calendar,
  "shootday.update": Calendar,
  "shootday.delete": Calendar,
  "crew.create": Users,
  "crew.delete": Users,
  "budget.update": DollarSign,
};

function describe(e: any): string {
  const p = e.payload || {};
  switch (e.eventType) {
    case "scene.approval.set": return `Marked scene ${p.sceneId ?? ""} as ${p.status}${p.note ? ` — "${p.note}"` : ""}`;
    case "movie.approval.set": return `Marked cut ${p.movieId ?? ""} as ${p.status}${p.note ? ` — "${p.note}"` : ""}`;
    case "scene.shotlist.update": return `Updated shot list on scene ${p.sceneId ?? ""} (${p.count} shots)`;
    case "scene.shootday.assign": return p.shootDayId ? `Assigned scene ${p.sceneId} to day ${p.shootDayId}` : `Unscheduled scene ${p.sceneId}`;
    case "shootday.create": return `Created shoot day ${p.dayNumber ?? p.dayId ?? ""}`;
    case "shootday.update": return `Updated shoot day ${p.dayId ?? ""}`;
    case "shootday.delete": return `Deleted shoot day ${p.dayId ?? ""}`;
    case "crew.create": return `Added crew contact "${p.name ?? ""}"`;
    case "crew.delete": return `Removed crew contact ${p.id ?? ""}`;
    case "budget.update": return `Updated budget — total ${p.currency} ${p.totalEstimate}`;
    default: return e.eventType;
  }
}

/** v6.63 — Project activity timeline. Append-only audit feed. */
export default function ActivityTimeline() {
  const { id } = useParams<{ id: string }>();
  const projectId = parseInt(id || "0");
  const { data: project } = trpc.project.get.useQuery({ id: projectId }, { enabled: !!projectId });
  const { data: events = [], isLoading } = trpc.activity.list.useQuery({ projectId, limit: 200 }, { enabled: !!projectId });

  return (
    <div className="min-h-screen text-zinc-100 p-4 md:p-6" style={{ background:"linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)" }}>
      <div className="max-w-3xl mx-auto space-y-4">
        <div>
          <Link href={`/projects/${projectId}`}>
            <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-zinc-100">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to project
            </Button>
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-2 mt-1 gradient-text-gold">
            <Activity className="w-6 h-6 text-amber-500" /> Activity
          </h1>
          <p className="text-sm text-zinc-400">{project?.title || "—"} · last 200 events.</p>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-zinc-500"><Loader2 className="w-5 h-5 animate-spin inline mr-2 text-amber-400" />Loading…</div>
        ) : (events as any[]).length === 0 ? (
          <Card className="bg-zinc-950 border-zinc-800 glass-card"><CardContent className="p-8 text-center text-sm text-zinc-500 glass-card">No activity yet. Approvals, schedule changes, and crew updates will show up here.</CardContent></Card>
        ) : (
          <div className="space-y-2">
            {(events as any[]).map((e) => {
              const Icon = ICONS[e.eventType] || Edit3;
              const isApprove = e.eventType.endsWith("approval.set");
              const status = e.payload?.status;
              return (
                <Card key={e.id} className="bg-zinc-950 border-zinc-800 glass-card">
                  <CardContent className="p-3 flex items-start gap-3 glass-card">
                    <div className={`flex-shrink-0 mt-0.5 ${isApprove && status === "approved" ? "text-emerald-400" : isApprove && status === "changes_requested" ? "text-amber-400" : "text-zinc-500"}`}>
                      {isApprove && status === "changes_requested" ? <AlertTriangle className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-zinc-100">{describe(e)}</div>
                      <div className="text-xs text-zinc-500 mt-0.5">
                        {e.actor || "User"} · {new Date(e.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
