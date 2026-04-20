import { useMemo, useState } from "react";
import { Link, useParams } from "wouter";
import { NextStageCTA } from "@/components/NextStageCTA";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  ExternalLink,
  Sparkles,
  Loader2,
  Copy,
  Rocket,
  Gift,
  Video,
} from "lucide-react";
import { toast } from "sonner";

type Kind = "campaign" | "rewards" | "videoScript";

const CROWDFUNDING_KEYWORDS = [
  "kickstarter",
  "indiegogo",
  "seed&spark",
  "seed & spark",
  "seedandspark",
  "patreon",
  "gofundme",
  "fundme.club",
  "ko-fi",
  "wefunder",
  "republic",
  "startengine",
  "crowdfunding",
  "crowd-funding",
];

function isCrowdfundingSource(s: any): boolean {
  const pack = (s.packType || "").toLowerCase();
  if (pack.includes("crowdfunding")) return true;
  const haystack = `${s.organization || ""} ${s.type || ""} ${s.supports || ""}`.toLowerCase();
  return CROWDFUNDING_KEYWORDS.some((k) => haystack.includes(k));
}

const PROMPTS: Record<Kind, (b: BriefState, t: string) => string> = {
  campaign: (b, t) =>
    `Write a Kickstarter/Indiegogo campaign pitch (≤350 words) for "${t}".
Format: ${b.format}. Genre: ${b.genre}. Audience: ${b.audience}.
Funding goal: ${b.goal} ${b.currency}. Campaign length: ${b.duration} days.
Premise: ${b.premise}

Structure: 1) opening hook, 2) why this story matters now, 3) who we are, 4) what your contribution unlocks, 5) call-to-action. Warm, urgent, specific. No buzzwords.`,
  rewards: (b, t) =>
    `Design a 7-tier reward ladder for the "${t}" crowdfunding campaign.
Format: ${b.format}. Genre: ${b.genre}. Goal: ${b.goal} ${b.currency}.
Tiers should escalate from $5 to $5,000+. For each tier: name, dollar amount, 1-line description, estimated delivery month, fulfillment cost note. Output as a clean markdown table.`,
  videoScript: (b, t) =>
    `Write a 90-second pitch-video script for the "${t}" crowdfunding campaign.
Format: ${b.format}. Genre: ${b.genre}. Tone: ${b.tone}. Premise: ${b.premise}
Goal: ${b.goal} ${b.currency}.
Two columns: VISUAL | AUDIO. Open with a 5-second hook. Include filmmaker on-camera moment, story tease, ask, thank-you beat. End with on-screen URL + date.`,
};

interface BriefState {
  format: string;
  genre: string;
  audience: string;
  tone: string;
  premise: string;
  goal: string;
  currency: string;
  duration: string;
}

export default function CrowdfundingHub() {
  const params = useParams<{ projectId?: string }>();
  const projectId = parseInt(params.projectId || "0");
  const hasProject = !!projectId;

  const { data: sources } = trpc.funding.list.useQuery({});
  const { data: project } = trpc.project.get.useQuery(
    { id: projectId },
    { enabled: hasProject }
  );

  const platforms = useMemo(
    () => (sources ?? []).filter(isCrowdfundingSource),
    [sources]
  );

  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return platforms;
    return platforms.filter(
      (p: any) =>
        (p.organization || "").toLowerCase().includes(s) ||
        (p.country || "").toLowerCase().includes(s) ||
        (p.supports || "").toLowerCase().includes(s)
    );
  }, [platforms, search]);

  const [brief, setBrief] = useState<BriefState>({
    format: "Feature",
    genre: "",
    audience: "",
    tone: "Warm, urgent",
    premise: "",
    goal: "25000",
    currency: "USD",
    duration: "30",
  });
  const [generating, setGenerating] = useState<Kind | null>(null);

  const sendMessage = trpc.directorChat.send.useMutation();
  const { data: history, refetch: refetchHistory } = trpc.directorChat.history.useQuery(
    { projectId },
    { enabled: hasProject, refetchInterval: 4000 }
  );

  const lastByKind = useMemo(() => {
    const out: Record<string, string> = {};
    for (const m of history ?? []) {
      const tag = (m as any).metadata?.crowdfundingKind as string | undefined;
      if (tag && (m as any).role === "assistant") {
        out[tag] = (m as any).content as string;
      }
    }
    return out;
  }, [history]);

  async function generate(kind: Kind) {
    if (!hasProject) {
      toast.error("Open this from a project to generate AI copy.");
      return;
    }
    if (!brief.premise.trim()) {
      toast.error("Add a premise before generating.");
      return;
    }
    setGenerating(kind);
    try {
      await sendMessage.mutateAsync({
        projectId,
        message: `[CrowdfundingHub:${kind}]\n\n${PROMPTS[kind](brief, project?.title || "Untitled")}`,
      });
      await refetchHistory();
      toast.success(`${kind} drafted.`);
    } catch (e: any) {
      toast.error(e?.message || "Generation failed.");
    } finally {
      setGenerating(null);
    }
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("Copied.");
  }

  return (
    <div className="container max-w-6xl py-6 space-y-6">
      <div className="flex items-center justify-between">
        <Link href={hasProject ? `/projects/${projectId}` : "/funding"}>
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        </Link>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Rocket className="h-4 w-4" /> Crowdfunding Hub
        </div>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Crowdfunding Hub</h1>
        <p className="text-muted-foreground mt-1">
          {platforms.length} platforms · launch-ready campaign copy, reward tiers, and pitch-video scripts.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Platforms list */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Platforms</CardTitle>
            <CardDescription>Curated from the Funding Directory.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Search platforms…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
              {filtered.map((p: any) => (
                <a
                  key={p.id}
                  href={p.website || "#"}
                  target="_blank" rel="noopener noreferrer"
                  rel="noopener noreferrer"
                  className="block p-3 rounded-lg border hover:border-primary hover:bg-accent/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{p.organization}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {p.country}{p.type ? ` · ${p.type}` : ""}
                      </div>
                    </div>
                    <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground mt-0.5" />
                  </div>
                  {p.supports && (
                    <div className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
                      {p.supports}
                    </div>
                  )}
                </a>
              ))}
              {filtered.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No platforms match.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* AI campaign builder */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> AI Campaign Builder
            </CardTitle>
            <CardDescription>
              {hasProject
                ? `Draft pitch, rewards, and a 90-second video script for "${project?.title || "your project"}".`
                : "Open from a project to generate AI copy."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Format</Label>
                <Select value={brief.format} onValueChange={(v) => setBrief({ ...brief, format: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Feature">Feature</SelectItem>
                    <SelectItem value="Short">Short</SelectItem>
                    <SelectItem value="Series">Series</SelectItem>
                    <SelectItem value="Documentary">Documentary</SelectItem>
                    <SelectItem value="Web3 / NFT">Web3 / NFT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Genre</Label>
                <Input value={brief.genre} onChange={(e) => setBrief({ ...brief, genre: e.target.value })} placeholder="Sci-fi thriller" />
              </div>
              <div>
                <Label className="text-xs">Audience</Label>
                <Input value={brief.audience} onChange={(e) => setBrief({ ...brief, audience: e.target.value })} placeholder="Indie genre fans 18-34" />
              </div>
              <div>
                <Label className="text-xs">Tone</Label>
                <Input value={brief.tone} onChange={(e) => setBrief({ ...brief, tone: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Goal</Label>
                <Input value={brief.goal} onChange={(e) => setBrief({ ...brief, goal: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Currency</Label>
                <Select value={brief.currency} onValueChange={(v) => setBrief({ ...brief, currency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="CAD">CAD</SelectItem>
                    <SelectItem value="AUD">AUD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs">Premise (1–3 sentences)</Label>
                <Textarea
                  rows={3}
                  value={brief.premise}
                  onChange={(e) => setBrief({ ...brief, premise: e.target.value })}
                  placeholder="A one-paragraph premise the AI can build from."
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Button onClick={() => generate("campaign")} disabled={!!generating || !hasProject} className="gap-2" size="sm">
                {generating === "campaign" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Rocket className="h-3 w-3" />}
                Pitch
              </Button>
              <Button onClick={() => generate("rewards")} disabled={!!generating || !hasProject} className="gap-2" size="sm" variant="secondary">
                {generating === "rewards" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Gift className="h-3 w-3" />}
                Rewards
              </Button>
              <Button onClick={() => generate("videoScript")} disabled={!!generating || !hasProject} className="gap-2" size="sm" variant="secondary">
                {generating === "videoScript" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Video className="h-3 w-3" />}
                Video
              </Button>
            </div>

            {(["campaign", "rewards", "videoScript"] as Kind[]).map((k) =>
              lastByKind[k] ? (
                <div key={k} className="border rounded-lg p-3 bg-muted/30">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="text-[10px] uppercase">{k}</Badge>
                    <Button size="sm" variant="ghost" onClick={() => copy(lastByKind[k])} className="h-6 gap-1 text-xs">
                      <Copy className="h-3 w-3" /> Copy
                    </Button>
                  </div>
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{lastByKind[k]}</pre>
                </div>
              ) : null
            )}
          </CardContent>
        </Card>
      </div>
  {!!projectId && <NextStageCTA projectId={projectId} currentStage={5} />}
    </div>
  );
}
