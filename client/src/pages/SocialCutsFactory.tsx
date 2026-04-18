import { useMemo, useState } from "react";
import { Link, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Sparkles,
  Loader2,
  Copy,
  Smartphone,
  Square,
  Monitor,
  Scissors,
} from "lucide-react";
import { toast } from "sonner";

type Format = "vertical" | "square" | "horizontal";

const FORMATS: Record<Format, { label: string; ratio: string; runtime: string; platforms: string; icon: any }> = {
  vertical: {
    label: "Vertical",
    ratio: "9:16",
    runtime: "15–60s",
    platforms: "TikTok · Reels · Shorts",
    icon: Smartphone,
  },
  square: {
    label: "Square",
    ratio: "1:1",
    runtime: "30–60s",
    platforms: "Instagram feed · LinkedIn",
    icon: Square,
  },
  horizontal: {
    label: "Horizontal",
    ratio: "16:9",
    runtime: "30–90s",
    platforms: "YouTube · X · pre-roll",
    icon: Monitor,
  },
};

const ANGLES = [
  "Hook-first character moment",
  "Behind-the-scenes / making-of",
  "Single-line dialogue tease",
  "Visual world reveal",
  "Cast intro carousel",
  "Director POV / talking-head",
  "Mood-piece (no dialogue)",
  "Question-and-payoff",
];

export default function SocialCutsFactory() {
  const params = useParams<{ projectId: string }>();
  const projectId = parseInt(params.projectId || "0");
  const hasProject = !!projectId;

  const { data: project } = trpc.project.get.useQuery({ id: projectId }, { enabled: hasProject });
  const { data: scenes } = trpc.scene.listByProject.useQuery(
    { projectId },
    { enabled: hasProject }
  );

  const sendMessage = trpc.directorChat.send.useMutation();
  const { data: history, refetch: refetchHistory } = trpc.directorChat.history.useQuery(
    { projectId },
    { enabled: hasProject, refetchInterval: 4000 }
  );

  const [format, setFormat] = useState<Format>("vertical");
  const [angle, setAngle] = useState<string>(ANGLES[0]);
  const [hook, setHook] = useState("");
  const [cta, setCta] = useState("Follow for the drop.");
  const [generating, setGenerating] = useState(false);

  const sortedScenes = useMemo(
    () => (scenes ?? []).slice().sort((a: any, b: any) => (a.orderIndex || 0) - (b.orderIndex || 0)),
    [scenes]
  );

  const lastBrief = useMemo(() => {
    const want = `[SocialCut:${format}:${angle}]`;
    for (const m of (history ?? []).slice().reverse()) {
      if ((m as any).role === "assistant" && ((m as any).content || "").startsWith("# ")) {
        // any AI response is fine — show most recent
      }
    }
    // pick the most recent assistant whose preceding user message tag matches
    const arr = (history ?? []) as any[];
    for (let i = arr.length - 1; i >= 0; i--) {
      const msg = arr[i];
      if (msg.role !== "assistant") continue;
      const prev = arr[i - 1];
      if (prev && prev.role === "user" && (prev.content || "").startsWith(want)) {
        return msg.content as string;
      }
    }
    return null;
  }, [history, format, angle]);

  async function generate() {
    if (!hasProject) return;
    if (sortedScenes.length === 0) {
      toast.error("Add scenes to your project first.");
      return;
    }
    if (!hook.trim()) {
      toast.error("Add a one-line hook.");
      return;
    }
    setGenerating(true);
    try {
      const sceneSummary = sortedScenes
        .slice(0, 8)
        .map(
          (s: any, i: number) =>
            `Scene ${s.orderIndex ?? i + 1}: ${s.title || "Untitled"} — ${s.timeOfDay || "?"} ${s.locationType || s.city || ""} — ${s.mood || ""}\n  ${s.description || ""}`
        )
        .join("\n\n");

      const fmt = FORMATS[format];
      const prompt = `Plan a ${fmt.label} (${fmt.ratio}) social cut for "${project?.title || "Untitled"}".
Target platforms: ${fmt.platforms}. Runtime: ${fmt.runtime}.
Creative angle: ${angle}
Hook (≤8 words to grab in 0–2s): "${hook}"
CTA: "${cta}"

Available source scenes:
${sceneSummary}

Output a clean markdown brief with these sections:
1. **Hook (0–2s)** — exact on-screen text + which source scene + visual choice
2. **Beats (2–${format === "vertical" ? "30" : "60"}s)** — bullet list of 4–6 cuts, each with timestamp, source scene #, the moment, and any text overlay
3. **CTA outro** — text + duration
4. **Captions** — 4 caption variants (one tease, one stat-style, one dialogue lift, one question), each ≤140 chars
5. **Hashtags** — 8 ranked
6. **Thumbnail concept** — 1-line description for first frame
7. **Audio direction** — ${format === "vertical" ? "trending-sound brief + dialogue mix note" : "score brief + dialogue mix note"}

Be concrete: name actual scene numbers from the list above. No fluff.`;

      await sendMessage.mutateAsync({
        projectId,
        message: `[SocialCut:${format}:${angle}]\n\n${prompt}`,
      });
      await refetchHistory();
      toast.success(`${fmt.label} brief generated.`);
    } catch (e: any) {
      toast.error(e?.message || "Generation failed.");
    } finally {
      setGenerating(false);
    }
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("Copied.");
  }

  return (
    <div className="container max-w-6xl py-6 space-y-6">
      <div className="flex items-center justify-between">
        <Link href={`/projects/${projectId}`}>
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to project
          </Button>
        </Link>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Scissors className="h-4 w-4" /> Social Cuts Factory
        </div>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Social Cuts Factory</h1>
        <p className="text-muted-foreground mt-1">
          Generate platform-ready cut briefs from your scenes — vertical for TikTok/Reels, square for IG, horizontal for YouTube.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-3">
        {(Object.keys(FORMATS) as Format[]).map((f) => {
          const F = FORMATS[f];
          const Icon = F.icon;
          const active = f === format;
          return (
            <button
              key={f}
              onClick={() => setFormat(f)}
              className={`text-left p-4 rounded-lg border transition-all ${
                active
                  ? "border-primary bg-accent/60 shadow-sm"
                  : "hover:border-primary/50 hover:bg-accent/30"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <Icon className="h-5 w-5" />
                <Badge variant={active ? "default" : "outline"} className="text-[10px]">{F.ratio}</Badge>
              </div>
              <div className="font-semibold">{F.label}</div>
              <div className="text-xs text-muted-foreground">{F.platforms}</div>
              <div className="text-xs text-muted-foreground mt-1">{F.runtime}</div>
            </button>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Brief inputs</CardTitle>
          <CardDescription>
            Pulling from {sortedScenes.length} scene{sortedScenes.length === 1 ? "" : "s"} of{" "}
            <span className="font-medium">{project?.title || "your project"}</span>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs">Creative angle</Label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {ANGLES.map((a) => (
                <button
                  key={a}
                  onClick={() => setAngle(a)}
                  className={`text-xs px-2 py-1 rounded border ${
                    a === angle
                      ? "bg-primary text-primary-foreground border-primary"
                      : "hover:bg-accent"
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs">Hook (≤8 words, must work in first 2 seconds)</Label>
            <Input value={hook} onChange={(e) => setHook(e.target.value)} placeholder="What if you couldn't trust your own memories?" />
          </div>
          <div>
            <Label className="text-xs">CTA</Label>
            <Input value={cta} onChange={(e) => setCta(e.target.value)} />
          </div>

          <Button onClick={generate} disabled={generating} className="gap-2" size="sm">
            {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            Generate {FORMATS[format].label} brief
          </Button>
        </CardContent>
      </Card>

      {lastBrief && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Latest brief</CardTitle>
              <CardDescription>{FORMATS[format].label} · {angle}</CardDescription>
            </div>
            <Button onClick={() => copy(lastBrief)} size="sm" variant="ghost" className="gap-2">
              <Copy className="h-3 w-3" /> Copy
            </Button>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{lastBrief}</pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
