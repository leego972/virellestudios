import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { useParams, useLocation } from "wouter";
import { Loader2, ArrowLeft, Grid3X3, List, Printer, Clock, MapPin, Camera, Sun, Cloud, Palette, ArrowRight } from "lucide-react";
import { useState } from "react";
import { getLoginUrl } from "@/const";

const TRANSITION_LABELS: Record<string, string> = {
  cut: "CUT", fade: "FADE", dissolve: "DISSOLVE", wipe: "WIPE",
  "iris-in": "IRIS IN", "iris-out": "IRIS OUT", "smash-cut": "SMASH CUT",
  "match-cut": "MATCH CUT", "j-cut": "J-CUT", "l-cut": "L-CUT",
};

export default function Storyboard() {
  const { user, loading: authLoading } = useAuth();
  const params = useParams<{ projectId: string }>();
  const [, navigate] = useLocation();
  const projectId = Number(params.projectId);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const { data: project, isLoading: projectLoading } = trpc.project.get.useQuery(
    { id: projectId },
    { enabled: !!user && !!projectId }
  );
  const { data: scenes, isLoading: scenesLoading } = trpc.scene.listByProject.useQuery(
    { projectId },
    { enabled: !!user && !!projectId }
  );
  const { data: characters } = trpc.character.listByProject.useQuery(
    { projectId },
    { enabled: !!user && !!projectId }
  );

  if (authLoading || projectLoading || scenesLoading) {
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

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Project not found</p>
      </div>
    );
  }

  const getCharName = (id: number) => characters?.find(c => c.id === id)?.name || "Unknown";
  const totalDuration = scenes?.reduce((sum, s) => sum + (s.duration || 30), 0) || 0;
  const formatTime = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-9 sm:w-9 shrink-0" onClick={() => navigate(`/projects/${projectId}`)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-semibold truncate">{project.title} — Storyboard</h1>
              <p className="text-xs text-muted-foreground">{scenes?.length || 0} scenes · {formatTime(totalDuration)} total</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode("grid")}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-1" />
              Print
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {!scenes || scenes.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <Grid3X3 className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">No scenes yet. Add scenes in the Scene Editor first.</p>
            <Button className="mt-4" size="sm" onClick={() => navigate(`/projects/${projectId}/scenes`)}>
              Go to Scene Editor
            </Button>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {scenes.map((scene, idx) => (
              <Card key={scene.id} className="overflow-hidden group hover:ring-1 hover:ring-primary/30 transition-all cursor-pointer"
                onClick={() => navigate(`/projects/${projectId}/scenes`)}>
                {/* Thumbnail */}
                <div className="aspect-video bg-muted relative overflow-hidden">
                  {scene.thumbnailUrl ? (
                    <img src={scene.thumbnailUrl} alt={scene.title || ""} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Camera className="h-8 w-8 text-muted-foreground/20" />
                    </div>
                  )}
                  <div className="absolute top-2 left-2">
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-black/60 text-white border-0">
                      {idx + 1}
                    </Badge>
                  </div>
                  <div className="absolute bottom-2 right-2">
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-black/60 text-white border-0">
                      {formatTime(scene.duration || 30)}
                    </Badge>
                  </div>
                  {/* Transition indicator */}
                  {idx < scenes.length - 1 && scene.transitionType && scene.transitionType !== "cut" && (
                    <div className="absolute bottom-2 left-2">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-primary/80 text-primary-foreground border-0">
                        {TRANSITION_LABELS[scene.transitionType] || scene.transitionType}
                      </Badge>
                    </div>
                  )}
                </div>
                {/* Info */}
                <CardContent className="p-3 space-y-1.5">
                  <h3 className="text-sm font-medium truncate">{scene.title || `Scene ${idx + 1}`}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">{scene.description || "No description"}</p>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {scene.timeOfDay && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        <Sun className="h-2.5 w-2.5 mr-0.5" />{scene.timeOfDay}
                      </Badge>
                    )}
                    {scene.locationType && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        <MapPin className="h-2.5 w-2.5 mr-0.5" />{scene.locationType}
                      </Badge>
                    )}
                    {scene.weather && scene.weather !== "clear" && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        <Cloud className="h-2.5 w-2.5 mr-0.5" />{scene.weather}
                      </Badge>
                    )}
                    {scene.colorGrading && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        <Palette className="h-2.5 w-2.5 mr-0.5" />{scene.colorGrading}
                      </Badge>
                    )}
                  </div>
                  {/* Characters */}
                  {(scene.characterIds as number[] || []).length > 0 && (
                    <p className="text-[10px] text-muted-foreground pt-1">
                      Cast: {(scene.characterIds as number[]).map(id => getCharName(id)).join(", ")}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          /* List View */
          <div className="space-y-2">
            {scenes.map((scene, idx) => (
              <div key={scene.id}>
                <div className="flex gap-4 p-3 rounded-lg border bg-card/50 hover:ring-1 hover:ring-primary/30 transition-all cursor-pointer"
                  onClick={() => navigate(`/projects/${projectId}/scenes`)}>
                  {/* Thumbnail */}
                  <div className="w-40 h-24 rounded-md overflow-hidden bg-muted shrink-0">
                    {scene.thumbnailUrl ? (
                      <img src={scene.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Camera className="h-6 w-6 text-muted-foreground/20" />
                      </div>
                    )}
                  </div>
                  {/* Details */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">{idx + 1}</Badge>
                      <h3 className="text-sm font-medium truncate">{scene.title || `Scene ${idx + 1}`}</h3>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0 ml-auto">
                        <Clock className="h-2.5 w-2.5 mr-0.5" />{formatTime(scene.duration || 30)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{scene.description || "No description"}</p>
                    <div className="flex flex-wrap gap-1">
                      {scene.timeOfDay && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{scene.timeOfDay}</Badge>}
                      {scene.locationType && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{scene.locationType}</Badge>}
                      {scene.cameraAngle && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{scene.cameraAngle}</Badge>}
                      {scene.lighting && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{scene.lighting}</Badge>}
                      {scene.mood && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{scene.mood}</Badge>}
                    </div>
                    {(scene.characterIds as number[] || []).length > 0 && (
                      <p className="text-[10px] text-muted-foreground">
                        Cast: {(scene.characterIds as number[]).map(id => getCharName(id)).join(", ")}
                      </p>
                    )}
                    {scene.productionNotes && (
                      <p className="text-[10px] text-amber-500 italic">Note: {scene.productionNotes}</p>
                    )}
                  </div>
                </div>
                {/* Transition arrow between scenes */}
                {idx < scenes.length - 1 && (
                  <div className="flex items-center justify-center py-1">
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <ArrowRight className="h-3 w-3" />
                      <span>{TRANSITION_LABELS[scene.transitionType || "cut"] || "CUT"}</span>
                      {scene.transitionDuration && scene.transitionDuration > 0 && (
                        <span>({scene.transitionDuration}s)</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body { background: white !important; color: black !important; }
          .border-b.bg-card\\/50 button { display: none !important; }
          .hover\\:ring-1 { box-shadow: none !important; }
        }
      `}</style>
    </div>
  );
}
