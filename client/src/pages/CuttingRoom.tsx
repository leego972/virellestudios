import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
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
  ExternalLink,
  Clapperboard,
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
  const exportMovie = trpc.movie.exportFromProject.useMutation();
  const { data: history, refetch: refetchHistory } = trpc.directorChat.history.useQuery(
    { projectId },
    { enabled: hasProject, refetchInterval: 4000 }
  );
  const [generating, setGenerating] = useState<"masteringNotes" | null>(null);
  const [exportingTrailer, setExportingTrailer] = useState(false);
  const [trailerMovieId, setTrailerMovieId] = useState<number | null>(null);

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

  async function generateMasteringNotes() {
    if (!hasProject) return;
    if (sortedScenes.length === 0) { toast.error("Add scenes first."); return; }
    setGenerating("masteringNotes");
    try {
      const summary = (sortedScenes as any[]).map((s: any, i: number) =>
        `${s.orderIndex ?? i + 1}. ${s.title || "Untitled"} — ${fmtSeconds(s.duration || 0)} — ${s.mood || "?"} — ${s.locationType || "?"}`,
      ).join("\n");
      await sendMessage.mutateAsync({
        projectId,
        message: `[CuttingRoom:masteringNotes]\n\nWrite a final-mastering punch list for "${project?.title || "Untitled"}" (total runtime ${fmtSeconds(totalRuntime)}).\nScene list:\n${summary}\n\nOutput a clean checklist grouped under: Picture, Sound (dialogue/music/SFX), Color, Captions, Deliverables (DCP, ProRes, h264, audio stems). Keep each item terse and specific.`,
      });
      await refetchHistory();
      toast.success("Mastering notes ready.");
    } catch (e: any) {
      toast.error(e?.message || "Generation failed.");
    } finally {
      setGenerating(null);
    }
  }

  async function generateTrailer() {
    if (!hasProject) return;
    const videoScenes = (sortedScenes as any[]).filter((s: any) => s.videoUrl);
    if (videoScenes.length === 0) {
      toast.error("No scene videos yet — generate at least one scene video first.");
      return;
    }
    setExportingTrailer(true);
    try {
      const result = await exportMovie.mutateAsync({ projectId, exportType: "trailer" });
      setTrailerMovieId((result as any).movieIds?.[0] ?? null);
      toast.success("Trailer compiled! Opening My Movies…");
    } catch (e: any) {
      toast.error(e?.message || "Trailer failed — make sure your scenes have generated videos.");
    } finally {
      setExportingTrailer(false);
    }
  }


function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="space-y-1 max-h-72 overflow-y-auto text-xs leading-relaxed">
      {content.split("\n").map((line, i) => {
        if (line.startsWith("### ")) return <p key={i} className="font-bold text-amber-400/90 mt-2 first:mt-0">{line.slice(4)}</p>;
        if (line.startsWith("## ")) return <p key={i} className="font-bold text-amber-400/70 mt-2 first:mt-0">{line.slice(3)}</p>;
        if (line.startsWith("- ") || line.startsWith("* ")) {
          const txt = line.slice(2).replace(/\*\*(.+?)\*\*/g, "$1");
          return <p key={i} className="pl-3 before:content-['·'] before:mr-1.5 before:text-muted-foreground text-foreground/80">{txt}</p>;
        }
        if (line.trim() === "") return <div key={i} className="h-1" />;
        const txt = line.replace(/\*\*(.+?)\*\*/g, "$1");
        return <p key={i} className="text-foreground/80">{txt}</p>;
      })}
    </div>
  );
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
            <div className="py-8 text-center">
              <p className="text-sm text-foreground/80 font-medium">No scenes on the timeline yet</p>
              <p className="text-xs text-muted-foreground mt-1">Add scenes in the Scene Editor and the post-production checklist will appear here.</p>
            </div>
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

      {/* AI mastering notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> Mastering punch-list
          </CardTitle>
          <CardDescription>AI-generated final-delivery checklist for picture, sound, color, captions &amp; deliverables.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            size="sm"
            onClick={generateMasteringNotes}
            disabled={!!generating}
            className="gap-2"
          >
            {generating === "masteringNotes" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            {lastByTag("masteringNotes") ? "Regenerate" : "Generate"}
          </Button>
          {lastByTag("masteringNotes") && (
            <MarkdownContent content={lastByTag("masteringNotes")!} />
          )}
        </CardContent>
      </Card>

      {/* 90-second trailer cut — real video */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clapperboard className="h-4 w-4" /> 90-second trailer
          </CardTitle>
          <CardDescription>
            Stitches your scene videos into a real MP4 trailer with the Virelle Studios intro.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Scene video status */}
          <div className="flex flex-wrap gap-1.5">
            {(sortedScenes as any[]).map((s: any, i: number) => (
              <div key={s.id} className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] border ${s.videoUrl ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" : "border-border text-muted-foreground"}`}>
                {s.videoUrl ? "✓" : "○"} Scene {s.orderIndex ?? i + 1}
              </div>
            ))}
            {sortedScenes.length === 0 && (
              <p className="text-xs text-muted-foreground">No scenes yet.</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              onClick={generateTrailer}
              disabled={exportingTrailer}
              className="gap-2 bg-amber-600 hover:bg-amber-500 text-white"
            >
              {exportingTrailer ? <Loader2 className="h-3 w-3 animate-spin" /> : <Video className="h-3 w-3" />}
              {exportingTrailer ? "Compiling trailer…" : "Generate trailer video"}
            </Button>
            {trailerMovieId && (
              <Link href="/movies">
                <Button size="sm" variant="outline" className="gap-2 border-amber-500/40 text-amber-400 hover:bg-amber-500/10">
                  <ExternalLink className="h-3 w-3" /> Watch in My Movies
                </Button>
              </Link>
            )}
          </div>
          {(sortedScenes as any[]).filter((s: any) => s.videoUrl).length === 0 && sortedScenes.length > 0 && (
            <p className="text-xs text-amber-400/80">
              ⚠ No scene videos yet. Generate scene videos in the Scene Editor first, then come back to compile the trailer.
            </p>
          )}
        </CardContent>
      </Card>
  {!!projectId && <NextStageCTA projectId={projectId} currentStage={7} />}
    </div>
  );
}
