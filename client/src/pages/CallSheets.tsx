import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, FileText, Printer, Calendar, Clock } from "lucide-react";

/** v6.63 — Call sheets index. Lists every shoot day with a link to print. */
export default function CallSheets() {
  const { id } = useParams<{ id: string }>();
  const projectId = parseInt(id || "0");
  const { data: project } = trpc.project.get.useQuery({ id: projectId }, { enabled: !!projectId });
  const { data: days = [] } = trpc.shootDay.list.useQuery({ projectId }, { enabled: !!projectId });

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-4">
        <div>
          <Link href={`/projects/${projectId}`}>
            <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-zinc-100">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to project
            </Button>
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-2 mt-1">
            <FileText className="w-6 h-6 text-amber-500" />
            Call Sheets
          </h1>
          <p className="text-sm text-zinc-400">{project?.title || "—"} · one printable sheet per shoot day.</p>
        </div>

        {(days as any[]).length === 0 ? (
          <Card className="bg-zinc-950 border-zinc-800">
            <CardContent className="p-8 text-center text-sm text-zinc-500">
              No shoot days yet.{" "}
              <Link href={`/projects/${projectId}/schedule`}>
                <Button variant="link" className="text-amber-500 px-1">Create one on the Schedule page →</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(days as any[]).map((d) => (
              <Card key={d.id} className="bg-zinc-950 border-zinc-800 hover:border-amber-700 transition-colors">
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-amber-500 text-xs uppercase tracking-wide font-semibold flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Day {d.dayNumber}
                    </div>
                    <div className="text-zinc-100 text-sm font-medium mt-1">
                      {d.shootDate ? new Date(d.shootDate).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" }) : "Date TBD"}
                    </div>
                    <div className="text-xs text-zinc-400 flex items-center gap-2 mt-1">
                      {d.callTime && <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />Call {d.callTime}</span>}
                      {d.wrapTime && <span>· Wrap {d.wrapTime}</span>}
                    </div>
                  </div>
                  <Link href={`/projects/${projectId}/call-sheets/${d.id}`}>
                    <Button size="sm" variant="outline">
                      <Printer className="w-3.5 h-3.5 mr-1" /> Open
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
