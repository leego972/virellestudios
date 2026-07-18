import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import SiteHead from "@/components/SiteHead";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Languages, Mic, Waves } from "lucide-react";

export default function DubbingHub() {
  const [, navigate] = useLocation();
  const [projectId, setProjectId] = useState<number | null>(null);
  const projects = trpc.project.list.useQuery();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHead title="Dubbing Studio" description="Choose a Virelle production and open its multilingual dubbing workflow." />
      <header className="border-b border-border/70 bg-background/90 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-4xl items-center gap-3 px-4 sm:px-6">
          <Button type="button" variant="ghost" size="icon" onClick={() => navigate("/")} aria-label="Back to dashboard">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300">
            <Mic className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Dubbing Studio</h1>
            <p className="text-xs text-muted-foreground">Translation, multilingual voices and scene lip sync</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Select a production</CardTitle>
            <CardDescription>
              Dubbing is stored against real scenes. Choose the production before translating dialogue, generating audio or applying lip sync.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                <Languages className="mb-3 h-5 w-5 text-amber-400" />
                <p className="font-semibold">Translate scene dialogue</p>
                <p className="mt-1 text-sm text-muted-foreground">Keep each translated line tied to the source scene and selected character performance.</p>
              </div>
              <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                <Waves className="mb-3 h-5 w-5 text-amber-400" />
                <p className="font-semibold">Generate and save audio</p>
                <p className="mt-1 text-sm text-muted-foreground">Persist the resulting dub or lip-synced output back to the production scene.</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dubbing-project">Project</Label>
              <Select value={projectId ? String(projectId) : undefined} onValueChange={(value) => setProjectId(Number(value))} disabled={projects.isLoading}>
                <SelectTrigger id="dubbing-project" className="min-h-11">
                  <SelectValue placeholder={projects.isLoading ? "Loading projects…" : "Select a project"} />
                </SelectTrigger>
                <SelectContent>
                  {(projects.data ?? []).map((project) => (
                    <SelectItem key={project.id} value={String(project.id)}>{project.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button type="button" className="min-h-11 w-full" disabled={!projectId} onClick={() => projectId && navigate(`/projects/${projectId}/dubbing`)}>
              <Mic className="mr-2 h-4 w-4" />
              Open Dubbing Studio
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
