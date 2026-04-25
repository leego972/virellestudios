import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Grid3x3 } from "lucide-react";
import DayOfDaysGrid from "@/components/DayOfDaysGrid";

/** v6.63 — Day-Out-of-Days standalone page. */
export default function DayOutOfDays() {
  const { id } = useParams<{ id: string }>();
  const projectId = parseInt(id || "0");
  const { data: project } = trpc.project.get.useQuery({ id: projectId }, { enabled: !!projectId });
  const { data: days = [] } = trpc.shootDay.list.useQuery({ projectId }, { enabled: !!projectId });
  const { data: scenes = [] } = trpc.scene.listByProject.useQuery({ projectId }, { enabled: !!projectId });
  const { data: characters = [] } = trpc.character.listByProject.useQuery({ projectId }, { enabled: !!projectId });

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        <div>
          <Link href={`/projects/${projectId}/schedule`}>
            <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-zinc-100">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to schedule
            </Button>
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-2 mt-1">
            <Grid3x3 className="w-6 h-6 text-amber-500" />
            Day-Out-of-Days
          </h1>
          <p className="text-sm text-zinc-400">{project?.title || "—"} · cast working / hold day grid for the entire shoot.</p>
        </div>
        <DayOfDaysGrid scenes={scenes as any} days={days as any} characters={characters as any} />
      </div>
    </div>
  );
}
