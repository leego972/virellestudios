import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { useParams, useLocation } from "wouter";
import { Loader2, ArrowLeft, ListOrdered, Printer, Sparkles } from "lucide-react";
import { useState } from "react";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";

type Shot = {
  shotNumber: string;
  sceneTitle: string;
  shotType: string;
  cameraMovement: string;
  lens: string;
  framing: string;
  action: string;
  dialogue: string;
  props: string;
  wardrobe: string;
  vfx: string;
  notes: string;
};

export default function ShotList() {
  const { user, loading: authLoading } = useAuth();
  const params = useParams<{ projectId: string }>();
  const [, navigate] = useLocation();
  const projectId = Number(params.projectId);

  const [shots, setShots] = useState<Shot[]>([]);
  const [generated, setGenerated] = useState(false);

  const { data: project, isLoading: projectLoading } = trpc.project.get.useQuery(
    { id: projectId },
    { enabled: !!user && !!projectId }
  );

  const generateShotList = trpc.shotList.generate.useMutation({
    onSuccess: (data: { shots: Shot[] }) => {
      setShots(data.shots || []);
      setGenerated(true);
      toast.success(`Generated ${data.shots?.length || 0} shots`);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to generate shot list");
    },
  });

  if (authLoading || projectLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    window.location.href = getLoginUrl();
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/project/${projectId}`)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">{project?.title} — Shot List</h1>
              <p className="text-xs text-muted-foreground">{shots.length} shots</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {generated && (
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer className="h-4 w-4 mr-1" />Print
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => generateShotList.mutate({ projectId })}
              disabled={generateShotList.isPending}
            >
              {generateShotList.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Sparkles className="h-4 w-4 mr-1" />
              )}
              {generated ? "Regenerate" : "Generate Shot List"}
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {!generated ? (
          <div className="flex flex-col items-center py-20 text-center">
            <ListOrdered className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground mb-1">No shot list generated yet</p>
            <p className="text-xs text-muted-foreground mb-4">AI will analyze your scenes and generate a professional shot list</p>
            <Button
              onClick={() => generateShotList.mutate({ projectId })}
              disabled={generateShotList.isPending}
            >
              {generateShotList.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Sparkles className="h-4 w-4 mr-1" />
              )}
              Generate Shot List
            </Button>
          </div>
        ) : (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ListOrdered className="h-4 w-4 text-primary" />
                Shot List — {shots.length} shots
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16 text-xs">#</TableHead>
                      <TableHead className="text-xs">Scene</TableHead>
                      <TableHead className="text-xs">Shot Type</TableHead>
                      <TableHead className="text-xs">Camera</TableHead>
                      <TableHead className="text-xs">Lens</TableHead>
                      <TableHead className="text-xs">Framing</TableHead>
                      <TableHead className="text-xs min-w-[200px]">Action</TableHead>
                      <TableHead className="text-xs">Dialogue</TableHead>
                      <TableHead className="text-xs">Props</TableHead>
                      <TableHead className="text-xs">Wardrobe</TableHead>
                      <TableHead className="text-xs">VFX</TableHead>
                      <TableHead className="text-xs">Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shots.map((shot, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="text-xs font-mono">{shot.shotNumber}</TableCell>
                        <TableCell className="text-xs">
                          <Badge variant="outline" className="text-[10px]">{shot.sceneTitle}</Badge>
                        </TableCell>
                        <TableCell className="text-xs">{shot.shotType}</TableCell>
                        <TableCell className="text-xs">{shot.cameraMovement}</TableCell>
                        <TableCell className="text-xs">{shot.lens}</TableCell>
                        <TableCell className="text-xs">{shot.framing}</TableCell>
                        <TableCell className="text-xs">{shot.action}</TableCell>
                        <TableCell className="text-xs italic text-muted-foreground">{shot.dialogue || "—"}</TableCell>
                        <TableCell className="text-xs">{shot.props || "—"}</TableCell>
                        <TableCell className="text-xs">{shot.wardrobe || "—"}</TableCell>
                        <TableCell className="text-xs">{shot.vfx || "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{shot.notes || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
