import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "wouter";
import { NextStageCTA } from "@/components/NextStageCTA";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  Film,
  Sparkles,
  Loader2,
  Clock,
  Image as ImageIcon,
  Music,
  Mic,
  Video,
  Subtitles,
  Palette,
  CircleCheck,
} from "lucide-react";
import { toast } from "sonner";

const CHECKLIST_ITEMS: { key: string; label: string; icon: any }[] = [
  { key: "storyboard", label: "Storyboard", icon: ImageIcon },
  { key: "takesIngested", label: "Takes ingested", icon: Video },
  { key: "selectsMarked", label: "Selects marked", icon: CircleCheck },
  { key: "dialogueClean", label: "Dialogue cleaned", icon: Mic },
  { key: "scoreLocked", label: "Score locked", icon: Music },
  { key: "sfxLocked", label: "SFX locked", icon: Music },
  { key: "colorPass", label: "Color pass", icon: Palette },
  { key: "captions", label: "Captions / subs", icon: Subtitles },
];

type Checklist = Record<number, Record<string, boolean>>;

function fmtSeconds(secs: number) {
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return s ? `${m}m ${s}s` : `${m}m`;
}

export default function CuttingRoom() {
  const params = useParams<{ projectId: string }>();
  const projectId = parseInt(params.projectId || "0");
  const hasProject = !!projectId;
  const storageKey = `virelle.cuttingRoom.${projectId}`;

  const { data: project } = trpc.project.get.useQuery({ id: projectId }, { enabled: hasProject });
  const { data: scenes } = trpc.scene.listByProject.useQuery(
    { projectId },
    { enabled: hasProject }
  );

  const sortedScenes = useMemo(
    () => (scenes ?? []).slice().sort((a: any, b: any) => (a.orderIndex || 0) - (b.orderIndex || 0)),
    [scenes]
  );

  const totalRuntime = useMemo(
    () => sortedScenes.reduce((acc: number, s: any) => acc + (s.duration || 0), 0),
    [sortedScenes]
  );

  const [checklist, setChecklist] = useState<Checklist>({});
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setChecklist(JSON.parse(raw));
    } catch {}
  }, [storageKey]);
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(checklist));
    } catch {}
  }, [storageKey, checklist]);

  function toggle(sceneId: number, key: string) {
    setChecklist((prev) => ({
      ...prev,
      [sceneId]: { ...(prev[sceneId] || {}), [key]: !(prev[sceneId]?.[key]) },
    }));
  }

  function sceneProgress(sceneId: number) {
    const c = checklist[sceneId] || {};
    const done = CHECKLIST_ITEMS.filter((i) => c[i.key]).length;
    return { done, total: CHECKLIST_ITEMS.length, pct: Math.round((done / CHECKLIST_ITEMS.length) * 100) };
  }

  const overall = useMemo(() => {
    if (sortedScenes.length === 0) return { done: 0, total: 0, pct: 0 };
    let done = 0;
    let total = 0;
    for (const s of sortedScenes) {
      const c = checklist[s.id] || {};
      total += CHECKLIST_ITEMS.length;
      done += CHECKLIST_ITEMS.filter((i) => c[i.key]).length;
    }
    return { done, total, pct: Math.round((done / total) * 100) };
  }, [sortedScenes, checklist]);

  // AI mastering notes
  const sendMessage = trpc.directorChat.send.useMutation();
  const { data: history, refetch: refetchHistory } = trpc.directorChat.history.useQuery(
    { projectId },
    { enabled: hasProject, refetchInterval: 4000 }
  );
  const [generating, setGenerating] = useState<"masteringNotes" | "trailerCut" | null>(null);

  function lastByTag(tag: string): string | null {
    const arr = (history ?? []) as any[];
    for (let i = arr.length - 1; i >= 0; i--) {
      const m = arr[i];
      if (m.role !== "assistant") continue;
      const prev = arr[i - 1];
      if (prev?.role === "user" && (prev.content || "").startsWith(`[CuttingRoom:${tag}]`)) {
        return m.content as string;
      }
    }
    return null;
  }

  async function generate(kind: "masteringNotes" | "trailerCut") {
    if (!hasProject) return;
    if (sortedScenes.length === 0) {
      toast.error("Add scenes first.");
      return;
    }
    setGenerating(kind);
    try {
      const summary = sortedScenes
        .map(
          (s: any, i: number) =>
            `${s.orderIndex ?? i + 1}. ${s.title || "Untitled"} — ${fmtSeconds(s.duration || 0)} — ${s.mood || "?"} — ${s.locationType || "?"}`
        )
        .join("\n");

      const prompts: Record<typeof kind, string> = {
        masteringNotes: `Write a final-mastering punch list for "${project?.title || "Untitled"}" (total runtime ${fmtSeconds(totalRuntime)}).
Scene list:
${summary}

Output a clean checklist grouped under: Picture, Sound (dialogue/music/SFX), Color, Captions, Deliverables (DCP, ProRes, h264, audio stems). Keep each item terse and specific.`,
        trailerCut: `Plan a 90-second trailer cut from these scenes. Pick 6-9 beats from the FIRST HALF only (no spoilers).
Scenes:
${summary}

Output: a markdown table with columns | t | scene # | beat | text overlay (if any) |. End with a 1-line music brief and a tagline (≤8 words).`,
      };

      await sendMessage.mutateAsync({
        projectId,
        message: `[CuttingRoom:${kind}]\n\n${prompts[kind]}`,
      });
      await refetchHistory();
      toast.success("Drafted.");
    } catch (e: any) {
      toast.error(e?.message || "Generation failed.");
    } finally {
      setGenerating(null);
    }
  }

  return (
    <div className="container max-w-7xl py-6 space-y-6">
      <div className="flex items-center justify-between">
        <Link href={`/projects/${projectId}`}>
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to project
          </Button>
        </Link>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Film className="h-4 w-4" /> Cutting Room
        </div>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Cutting Room</h1>
        <p className="text-muted-foreground mt-1">
          {sortedScenes.length} scenes · {fmtSeconds(totalRuntime)} estimated runtime · {overall.pct}% post-ready.
        </p>
      </div>

      {/* Overall progress */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Post-production progress</CardTitle>
          <CardDescription>{overall.done} of {overall.total} checklist items done across all scenes.</CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={overall.pct} />
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Scene timeline</CardTitle>
          <CardDescription>Each strip shows the per-scene asset checklist. Tick items as post advances.</CardDescription>
        </CardHeader>
        <CardContent>
          {sortedScenes.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No scenes yet.</p>
          ) : (
            <div className="space-y-2">
              {sortedScenes.map((s: any, i: number) => {
                const p = sceneProgress(s.id);
                const c = checklist[s.id] || {};
                const widthPct = totalRuntime > 0 ? Math.max(6, ((s.duration || 0) / totalRuntime) * 100) : 100 / sortedScenes.length;
                return (
                  <div key={s.id} className="border rounded-lg p-3 bg-muted/20">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge variant="outline" className="text-[10px] shrink-0">#{s.orderIndex ?? i + 1}</Badge>
                        <span className="font-medium truncate">{s.title || "Untitled"}</span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                          <Clock className="h-3 w-3" /> {fmtSeconds(s.duration || 0)}
                        </span>
                      </div>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] ${
                          p.pct === 100
                            ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                            : p.pct >= 50
                            ? "bg-blue-500/20 text-blue-700 dark:text-blue-300"
                            : "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                        }`}
                      >
                        {p.done}/{p.total}
                      </Badge>
                    </div>

                    {/* runtime strip */}
                    <div
                      className="h-1.5 rounded bg-primary/20 mb-2"
                      style={{ width: `${widthPct}%` }}
                    >
                      <div className="h-1.5 rounded bg-primary" style={{ width: `${p.pct}%` }} />
                    </div>

                    {/* checklist */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {CHECKLIST_ITEMS.map((item) => {
                        const Icon = item.icon;
                        const on = !!c[item.key];
                        return (
                          <label
                            key={item.key}
                            className={`flex items-center gap-1.5 px-2 py-1 rounded cursor-pointer text-xs border transition-colors ${
                              on ? "bg-primary/10 border-primary/40" : "border-transparent hover:bg-accent"
                            }`}
                          >
                            <Checkbox checked={on} onCheckedChange={() => toggle(s.id, item.key)} />
                            <Icon className="h-3 w-3" />
                            <span className="truncate">{item.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI mastering + trailer cut */}
      <div className="grid md:grid-cols-2 gap-4">
        {(["masteringNotes", "trailerCut"] as const).map((k) => {
          const last = lastByTag(k);
          const titleMap = { masteringNotes: "Mastering punch-list", trailerCut: "90-second trailer cut" };
          return (
            <Card key={k}>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4" /> {titleMap[k]}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  size="sm"
                  onClick={() => generate(k)}
                  disabled={!!generating}
                  className="gap-2"
                >
                  {generating === k ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  {last ? "Regenerate" : "Generate"}
                </Button>
                {last && (
                  <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed max-h-72 overflow-y-auto p-2 bg-muted/30 border rounded">
                    {last}
                  </pre>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
  {!!projectId && <NextStageCTA projectId={projectId} currentStage={7} />}
    </div>
  );
}
