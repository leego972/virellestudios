import { useMemo, useState } from "react";
import { useParams, Link } from "wouter";
import { NextStageCTA } from "@/components/NextStageCTA";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Lightbulb, FileText, Layout, Wand2, Copy, Download, ArrowLeft, Loader2 } from "lucide-react";

type Format = "Feature" | "Limited Series" | "Short Film" | "Documentary" | "Pilot";

const PROMPTS: Record<string, (b: BriefState, projectTitle: string) => string> = {
  logline: (b, t) => `You are a Hollywood development executive. Write THREE distinct loglines (max 35 words each) for the project "${t}". Format: ${b.format}. Genre: ${b.genre}. Audience: ${b.audience}. Tone: ${b.tone}. Premise: ${b.premise}. Each logline must include protagonist, inciting incident, central goal, and antagonistic force. Output as a numbered list, no preamble.`,
  synopsis: (b, t) => `You are a script consultant. Write a one-page synopsis (350-450 words) for "${t}". Format: ${b.format}. Genre: ${b.genre}. Tone: ${b.tone}. Premise: ${b.premise}. Cover: opening hook, act-one inciting incident, act-two midpoint twist, act-three climax, resolution. Use present tense, screenplay style. No preamble.`,
  treatment: (b, t) => `You are an A-list screenwriter. Write a 3-5 page treatment for "${t}". Format: ${b.format}. Genre: ${b.genre}. Tone: ${b.tone}. Audience: ${b.audience}. Premise: ${b.premise}. Use markdown headings: # Title  ## Logline  ## Themes  ## Main Characters  ## Act One  ## Act Two  ## Act Three  ## Visual Style  ## Comparable Titles  ## Why Now. Be vivid, specific, cinematic.`,
  deck: (b, t) => `You are a pitch-deck specialist. Produce a 10-slide pitch deck outline for "${t}" in markdown. Format: ${b.format}. Genre: ${b.genre}. Tone: ${b.tone}. Audience: ${b.audience}. Premise: ${b.premise}. Slides: 1) Title & Logline 2) The Hook 3) Synopsis 4) Main Characters 5) Tone & Visual Style 6) World & Setting 7) Themes 8) Comparable Titles & Audience 9) Director Vision 10) Why Now. Each slide: heading + 3-6 bullets. No preamble.`,
};

interface BriefState {
  format: Format;
  genre: string;
  audience: string;
  tone: string;
  premise: string;
}

export default function PitchLab() {
  const params = useParams<{ projectId: string }>();
  const projectId = parseInt(params.projectId || "0");
  const { data: project } = trpc.project.get.useQuery({ id: projectId }, { enabled: !!projectId });
  const { data: history, refetch: refetchHistory } = trpc.directorChat.history.useQuery(
    { projectId },
    { enabled: !!projectId, refetchInterval: 4000 }
  );
  const sendMessage = trpc.directorChat.send.useMutation();

  const [brief, setBrief] = useState<BriefState>({
    format: "Feature",
    genre: "",
    audience: "",
    tone: "",
    premise: "",
  });
  const [activeKind, setActiveKind] = useState<keyof typeof PROMPTS>("logline");
  const [generating, setGenerating] = useState<keyof typeof PROMPTS | null>(null);

  const lastByKind = useMemo(() => {
    const out: Record<string, string> = {};
    for (const m of history ?? []) {
      const tag = (m as any).metadata?.pitchKind as string | undefined;
      if (tag && (m as any).role === "assistant") {
        out[tag] = (m as any).content as string;
      }
    }
    return out;
  }, [history]);

  async function generate(kind: keyof typeof PROMPTS) {
    if (!project) return;
    if (!brief.premise.trim()) {
      toast.error("Add a premise (1-3 sentences) before generating.");
      return;
    }
    setGenerating(kind);
    try {
      await sendMessage.mutateAsync({
        projectId,
        message: `[PitchLab:${kind}]\n\n${PROMPTS[kind](brief, project.title || "Untitled")}`,
      });
      await refetchHistory();
      toast.success(`${kind.charAt(0).toUpperCase() + kind.slice(1)} drafted.`);
    } catch (e: any) {
      toast.error(e?.message || "Generation failed.");
    } finally {
      setGenerating(null);
    }
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text).then(() => toast.success("Copied."));
  }

  function downloadMd(name: string, text: string) {
    const blob = new Blob([text], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen pb-10" style={{ background:"linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)" }}>
    <div className="container mx-auto p-4 max-w-6xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/projects/${projectId}`}>
          <Button variant="ghost" size="sm" className="min-h-[44px]">
            <ArrowLeft className="h-4 w-4 mr-2" />Back to project
          </Button>
        </Link>
        <div>
          <div className="text-xs uppercase tracking-widest text-amber-500/80">Stage 1 Â· Idea & Pitch</div>
          <h1 className="font-serif text-3xl flex items-center gap-2 text-gold-shimmer">
            <Lightbulb className="h-6 w-6 text-amber-400" /> Pitch Lab
          </h1>
        </div>
      </div>

      <CardclassName="glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow" >
        <CardclassName="glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow" Header>
          <CardTitle className="gradient-text-gold">Project Brief</CardTitle>
          <CardclassName="glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow" Description>One brief drives every artifact below â logline, synopsis, treatment, and pitch deck.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Format</Label>
            <select
              className="w-full h-10 rounded-md bg-[#07070e] border border-input px-3 text-sm"
              value={brief.format}
              onChange={(e) => setBrief({ ...brief, format: e.target.value as Format })}
            >
              {(["Feature", "Limited Series", "Short Film", "Documentary", "Pilot"] as Format[]).map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Genre</Label>
            <Input value={brief.genre} onChange={(e) => setBrief({ ...brief, genre: e.target.value })} placeholder="e.g. Sci-fi thriller, dark comedy, social drama" />
          </div>
          <div className="space-y-1.5">
            <Label>Target Audience</Label>
            <Input value={brief.audience} onChange={(e) => setBrief({ ...brief, audience: e.target.value })} placeholder="e.g. Adults 25-49, festival circuit, streamers" />
          </div>
          <div className="space-y-1.5">
            <Label>Tone & Comparables</Label>
            <Input value={brief.tone} onChange={(e) => setBrief({ ...brief, tone: e.target.value })} placeholder="e.g. Children of Men x Aftersun" />
          </div>
          <div className="md:col-span-2 space-y-1.5">
            <Label>Premise (1-3 sentences)</Label>
            <Textarea
              rows={3}
              value={brief.premise}
              onChange={(e) => setBrief({ ...brief, premise: e.target.value })}
              placeholder="A grieving roboticist builds a copy of her late daughter â and slowly loses the ability to tell which one is real."
            />
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeKind as string} onValueChange={(v) => setActiveKind(v as keyof typeof PROMPTS)}>
        <TabsList className="flex w-full overflow-x-auto scrollbar-none sm:grid sm:grid-cols-4 h-auto [&>*]:shrink-0 [&>*]:whitespace-nowrap">
          <TabsTrigger value="logline" className="text-xs data-[state=active]:text-amber-400"><Wand2 className="h-3 w-3 mr-1" />Loglines</TabsTrigger>
          <TabsTrigger value="synopsis" className="text-xs data-[state=active]:text-amber-400"><FileText className="h-3 w-3 mr-1" />Synopsis</TabsTrigger>
          <TabsTrigger value="treatment" className="text-xs data-[state=active]:text-amber-400"><FileText className="h-3 w-3 mr-1" />Treatment</TabsTrigger>
          <TabsTrigger value="deck" className="text-xs data-[state=active]:text-amber-400"><Layout className="h-3 w-3 mr-1" />Pitch Deck</TabsTrigger>
        </TabsList>

        {(Object.keys(PROMPTS) as Array<keyof typeof PROMPTS>).map((kind) => (
          <TabsContent key={kind} value={kind} className="space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="text-sm text-muted-foreground">
                {lastByKind[kind] ? <Badge variant="secondary">Drafted</Badge> : <Badge variant="outline">Not yet generated</Badge>}
              </div>
              <div className="flex gap-2">
                <Button onClick={() => generate(kind)} disabled={generating !== null} className="bg-amber-600 hover:bg-amber-500 text-black min-h-[44px]">
                  {generating === kind ? <Loader2 className="h-4 w-4 mr-2 animate-spin text-amber-400" /> : <Wand2 className="h-4 w-4 mr-2" />}
                  Generate
                </Button>
                {lastByKind[kind] && (
                  <>
                    <Button variant="outline" onClick={() => copy(lastByKind[kind])} className="min-h-[44px]"><Copy className="h-4 w-4 mr-2" />Copy</Button>
                    <Button variant="outline" onClick={() => downloadMd(`${project?.title || "project"}-${kind}`, lastByKind[kind])} className="min-h-[44px]"><Download className="h-4 w-4 mr-2" />Export .md</Button>
                  </>
                )}
              </div>
            </div>
            <CardclassName="glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow" >
              <CardContent className="p-6">
                {lastByKind[kind] ? (
                  <pre className="whitespace-pre-wrap text-sm font-sans leading-relaxed">{lastByKind[kind]}</pre>
                ) : (
                  <div className="text-sm text-muted-foreground py-8 text-center">
                    Fill in the brief above and press <strong>Generate</strong> to draft your {kind}.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
  {!!projectId && <NextStageCTA projectId={projectId} currentStage={1} />}
      </div>
  );
}
