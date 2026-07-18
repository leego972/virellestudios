import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import SiteHead from "@/components/SiteHead";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft, Download, Film, Loader2, ScanFace, ShieldCheck, Smartphone, Sparkles } from "lucide-react";

const IOS_APP_URL = "https://apps.apple.com/app/virelle-studios/id6761315616";

export default function SwappysHub() {
  const [, setLocation] = useLocation();
  const [projectId, setProjectId] = useState<number | null>(null);
  const [sceneId, setSceneId] = useState<number | null>(null);

  const projectsQuery = trpc.project.list.useQuery();
  const scenesQuery = trpc.scene.listByProject.useQuery(
    { projectId: projectId ?? 0 },
    { enabled: Boolean(projectId) },
  );

  const selectedProject = useMemo(
    () => projectsQuery.data?.find((project) => project.id === projectId),
    [projectId, projectsQuery.data],
  );
  const selectedScene = useMemo(
    () => scenesQuery.data?.find((scene) => scene.id === sceneId),
    [sceneId, scenesQuery.data],
  );

  const openStudio = () => {
    if (!projectId || !sceneId) return;
    setLocation(`/projects/${projectId}/scenes/${sceneId}/vfx-suite`);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHead
        title="Swappys Transform Studio"
        description="Open the Swappys daughter app or use the complete Virelle VFX workflow for a selected production scene."
      />

      <header className="border-b border-border/70 bg-background/90 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Button type="button" variant="ghost" size="icon" onClick={() => setLocation("/")} aria-label="Back to dashboard">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
              <ScanFace className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold">Swappys Transform Studio</h1>
              <p className="truncate text-xs text-muted-foreground">A Virelle Studios daughter app</p>
            </div>
          </div>
          <Badge variant="outline" className="ml-auto border-amber-500/30 text-amber-400">Connected workflow</Badge>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <Card className="border-amber-500/20">
            <CardHeader>
              <div className="mb-2 flex items-center gap-2 text-amber-400">
                <Film className="h-5 w-5" />
                <span className="text-xs font-semibold uppercase tracking-[0.2em]">Virelle production workflow</span>
              </div>
              <CardTitle>Assign the transformation to a real scene</CardTitle>
              <CardDescription>
                Select the production and scene first. Swappys will then open inside the full VFX Suite with consent,
                uploads, credit calculation, watermark rules and project persistence.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="swappys-project">Project</Label>
                <Select
                  value={projectId ? String(projectId) : undefined}
                  onValueChange={(value) => {
                    setProjectId(Number(value));
                    setSceneId(null);
                  }}
                  disabled={projectsQuery.isLoading}
                >
                  <SelectTrigger id="swappys-project" className="min-h-11">
                    <SelectValue placeholder={projectsQuery.isLoading ? "Loading projects…" : "Select a project"} />
                  </SelectTrigger>
                  <SelectContent>
                    {(projectsQuery.data ?? []).map((project) => (
                      <SelectItem key={project.id} value={String(project.id)}>{project.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="swappys-scene">Scene</Label>
                <Select
                  value={sceneId ? String(sceneId) : undefined}
                  onValueChange={(value) => setSceneId(Number(value))}
                  disabled={!projectId || scenesQuery.isLoading}
                >
                  <SelectTrigger id="swappys-scene" className="min-h-11">
                    <SelectValue placeholder={!projectId ? "Select a project first" : scenesQuery.isLoading ? "Loading scenes…" : "Select a scene"} />
                  </SelectTrigger>
                  <SelectContent>
                    {(scenesQuery.data ?? []).map((scene, index) => (
                      <SelectItem key={scene.id} value={String(scene.id)}>
                        {scene.orderIndex != null ? `Scene ${scene.orderIndex + 1}` : `Scene ${index + 1}`} — {scene.title || "Untitled"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {projectId && !scenesQuery.isLoading && (scenesQuery.data?.length ?? 0) === 0 && (
                <Alert>
                  <AlertTitle>No scenes in {selectedProject?.title || "this project"}</AlertTitle>
                  <AlertDescription>Create a scene before opening the production VFX workflow.</AlertDescription>
                </Alert>
              )}

              <Button type="button" className="min-h-11 w-full" disabled={!projectId || !sceneId} onClick={openStudio}>
                <Sparkles className="mr-2 h-4 w-4" />
                Open Swappys for {selectedScene?.title || "selected scene"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="mb-2 flex items-center gap-2 text-amber-400">
                <Smartphone className="h-5 w-5" />
                <span className="text-xs font-semibold uppercase tracking-[0.2em]">Daughter app</span>
              </div>
              <CardTitle>Swappys Mobile</CardTitle>
              <CardDescription>
                Capture or choose reference images on your phone. Free outputs remain visibly watermarked; eligible
                Virelle accounts can unlock their subscription benefits after secure sign-in.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 rounded-xl border border-border/70 bg-muted/20 p-4 text-sm">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  <p>Only transform media you own or are authorised to use.</p>
                </div>
                <div className="flex items-start gap-3">
                  <ScanFace className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                  <p>Still-image transformation is the supported mobile workflow. Production video work belongs in the Virelle VFX Suite.</p>
                </div>
              </div>
              <Button type="button" variant="outline" className="min-h-11 w-full" onClick={() => window.open(IOS_APP_URL, "_blank", "noopener,noreferrer")}>
                <Download className="mr-2 h-4 w-4" />
                Open the iOS download page
              </Button>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
