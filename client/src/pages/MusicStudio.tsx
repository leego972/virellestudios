import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import SiteHead from "@/components/SiteHead";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Film, Music2, SlidersHorizontal, Sparkles } from "lucide-react";

export default function MusicStudio() {
  const [, navigate] = useLocation();
  const [projectId, setProjectId] = useState<number | null>(null);
  const projects = trpc.project.list.useQuery();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHead title="Music Studio" description="Open the production-connected score and cue workflow for a Virelle project." />
      <header className="border-b border-border/70 bg-background/90 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-4xl items-center gap-3 px-4 sm:px-6">
          <Button type="button" variant="ghost" size="icon" onClick={() => navigate("/")} aria-label="Back to dashboard">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
            <Music2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Music Studio</h1>
            <p className="text-xs text-muted-foreground">Score cues, timing, generation and production placement</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Open a production score</CardTitle>
            <CardDescription>
              Music is managed against a real film project so generated cues, source music, timing and licensing remain connected to the final render.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                <Sparkles className="mb-3 h-5 w-5 text-amber-400" />
                <p className="font-semibold">Generate cues</p>
                <p className="mt-1 text-sm text-muted-foreground">Create score direction from scene mood, timing and story purpose.</p>
              </div>
              <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                <SlidersHorizontal className="mb-3 h-5 w-5 text-amber-400" />
                <p className="font-semibold">Place and adjust</p>
                <p className="mt-1 text-sm text-muted-foreground">Store cue timing, volume, fade and production notes.</p>
              </div>
              <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                <Film className="mb-3 h-5 w-5 text-amber-400" />
                <p className="font-semibold">Keep it attached</p>
                <p className="mt-1 text-sm text-muted-foreground">Maintain the score as part of the production rather than a local demo library.</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="music-project">Project</Label>
              <Select value={projectId ? String(projectId) : undefined} onValueChange={(value) => setProjectId(Number(value))} disabled={projects.isLoading}>
                <SelectTrigger id="music-project" className="min-h-11">
                  <SelectValue placeholder={projects.isLoading ? "Loading projects…" : "Select a project"} />
                </SelectTrigger>
                <SelectContent>
                  {(projects.data ?? []).map((project) => (
                    <SelectItem key={project.id} value={String(project.id)}>{project.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button type="button" className="min-h-11 w-full" disabled={!projectId} onClick={() => projectId && navigate(`/projects/${projectId}/music-score`)}>
              <Music2 className="mr-2 h-4 w-4" />
              Open project score
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
