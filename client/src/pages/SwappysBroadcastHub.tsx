import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowRight,
  Broadcast,
  Clapperboard,
  Download,
  Film,
  RadioTower,
  ScanFace,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useLocation } from "wouter";

const workflowSteps = [
  {
    icon: ScanFace,
    title: "Create the Swappys performance",
    description: "Open a project scene, add source and reference media, then create the approved digital-double or transformation output.",
  },
  {
    icon: Film,
    title: "Review the production output",
    description: "Use final or master quality, continuity controls, watermark settings and project-level provenance inside Virelle Studios.",
  },
  {
    icon: RadioTower,
    title: "Send it to Broadcast or Studio Render",
    description: "Hand the exact Swappys job to the secured output workflow for BYOK rendering, OBS, WebRTC or configured RTMP destinations.",
  },
];

export default function SwappysBroadcastHub() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-full bg-background px-4 py-6 md:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-background to-blue-500/10 p-6 md:p-8">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />
          <div className="relative max-w-3xl space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-amber-500/30 bg-amber-500/15 text-amber-300">Swappys Studio</Badge>
              <Badge variant="outline">Broadcast Outputs</Badge>
              <Badge variant="outline">Creator+</Badge>
            </div>
            <div>
              <h1 className="flex items-center gap-3 text-3xl font-semibold tracking-tight md:text-4xl">
                <Broadcast className="h-8 w-8 text-amber-400" />
                Swappys & Broadcast
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
                One production section for digital doubles, likeness transformations, studio renders and secured live-output handoff. Start with a project scene, create the Swappys result, then route the exact approved output into Virelle Broadcast.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button className="bg-amber-500 text-black hover:bg-amber-400" onClick={() => navigate("/projects")}>
                <Clapperboard className="mr-2 h-4 w-4" />
                Start Swappys in a Project
              </Button>
              <Button variant="outline" onClick={() => navigate("/virelle-broadcast-render")}>
                <RadioTower className="mr-2 h-4 w-4" />
                Open Broadcast Outputs
              </Button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <Card className="border-amber-500/20">
            <CardHeader>
              <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
                <ScanFace className="h-6 w-6" />
              </div>
              <CardTitle>Swappys Transform Studio</CardTitle>
              <CardDescription>Project-scene digital doubles, actor continuity, age and presentation transforms, stunt replacement and performance polish.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Swappys works inside a Virelle project so source media, references, consent, credits and output provenance stay attached to the correct scene.
              </p>
              <Button className="w-full" onClick={() => navigate("/projects")}>
                Choose Project <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          <Card className="border-blue-500/20">
            <CardHeader>
              <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                <RadioTower className="h-6 w-6" />
              </div>
              <CardTitle>Broadcast & Studio Render</CardTitle>
              <CardDescription>Use the exact approved Swappys job for secured BYOK rendering and configured broadcast destinations.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                The output workflow preserves job identity, masks stream credentials in storage and only reports a broadcast as ready after the configured bridge accepts it.
              </p>
              <Button className="w-full" variant="outline" onClick={() => navigate("/virelle-broadcast-render")}>
                Open Output Console <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          <Card className="border-purple-500/20">
            <CardHeader>
              <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-purple-500/10 text-purple-300">
                <Download className="h-6 w-6" />
              </div>
              <CardTitle>Standalone Swappys App</CardTitle>
              <CardDescription>Use the downloadable app as the entry product, then move serious production work into Virelle Studios.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                The standalone app is designed for marked previews. Virelle adds project continuity, multi-reference controls, final/master quality, broadcast handoff and studio provenance.
              </p>
              <Button className="w-full" variant="outline" onClick={() => navigate("/download")}>
                View Verified Downloads <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </section>

        <section className="rounded-2xl border bg-card p-5 md:p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-semibold">
                <Sparkles className="h-5 w-5 text-amber-400" />
                Production workflow
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">The section keeps creation and output separate while making the handoff explicit.</p>
            </div>
            <div className="hidden items-center gap-2 text-xs text-muted-foreground md:flex">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              Consent, rights and provenance retained
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {workflowSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={step.title} className="relative rounded-xl border border-border/60 bg-background/60 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">Step {index + 1}</span>
                  </div>
                  <h3 className="font-medium">{step.title}</h3>
                  <p className="mt-2 text-sm leading-5 text-muted-foreground">{step.description}</p>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
