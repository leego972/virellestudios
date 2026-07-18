import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import SiteHead from "@/components/SiteHead";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Captions, Hand, Languages, Mic, Volume2 } from "lucide-react";

export default function AccessibilityStudio() {
  const [, navigate] = useLocation();
  const [projectId, setProjectId] = useState<number | null>(null);
  const projects = trpc.project.list.useQuery();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHead title="Accessibility Studio" description="Connect captions, language briefs and multilingual dubbing to a Virelle production." />
      <header className="border-b border-border/70 bg-background/90 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-5xl items-center gap-3 px-4 sm:px-6">
          <Button type="button" variant="ghost" size="icon" onClick={() => navigate("/")} aria-label="Back to dashboard">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
            <Hand className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Accessibility Studio</h1>
            <p className="text-xs text-muted-foreground">Captions, descriptive tracks, language briefs and dubbing</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-10 sm:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Select the production</CardTitle>
            <CardDescription>
              Accessibility outputs must remain attached to a real project. Choose the film before opening its caption or dubbing workflow.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="accessibility-project">Project</Label>
              <Select value={projectId ? String(projectId) : undefined} onValueChange={(value) => setProjectId(Number(value))} disabled={projects.isLoading}>
                <SelectTrigger id="accessibility-project" className="min-h-11">
                  <SelectValue placeholder={projects.isLoading ? "Loading projects…" : "Select a project"} />
                </SelectTrigger>
                <SelectContent>
                  {(projects.data ?? []).map((project) => (
                    <SelectItem key={project.id} value={String(project.id)}>{project.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <section className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-300">
                <Captions className="h-5 w-5" />
              </div>
              <CardTitle>Captions and production briefs</CardTitle>
              <CardDescription>
                Generate, edit and export SRT/VTT captions, descriptive sound tracks and sign-language production briefs.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button type="button" className="min-h-11 w-full" disabled={!projectId} onClick={() => projectId && navigate(`/projects/${projectId}/subtitles`)}>
                <Volume2 className="mr-2 h-4 w-4" />
                Open captions and briefs
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300">
                <Languages className="h-5 w-5" />
              </div>
              <CardTitle>Multilingual dubbing</CardTitle>
              <CardDescription>
                Translate scene dialogue, generate multilingual voice audio and apply the selected dubbing or lip-sync mode.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button type="button" variant="outline" className="min-h-11 w-full" disabled={!projectId} onClick={() => projectId && navigate(`/projects/${projectId}/dubbing`)}>
                <Mic className="mr-2 h-4 w-4" />
                Open dubbing workflow
              </Button>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
