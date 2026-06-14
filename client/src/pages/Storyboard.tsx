import { useAuth } from "@/_core/hooks/useAuth";
  import CinematicEmptyState from "@/components/CinematicEmptyState";
  import { Button } from "@/components/ui/button";
  import { Badge } from "@/components/ui/badge";
  import { trpc } from "@/lib/trpc";
  import { useParams, useLocation } from "wouter";
  import {
    Loader2, ArrowLeft, Grid3X3, List, Printer, Clock, MapPin, Camera, Sparkles, Zap,
    Sun, Cloud, Palette, Download, Play, Film, ChevronRight,
  } from "lucide-react";
  import { useState } from "react";
import { toast } from "sonner";
  import MediaPlayer from "@/components/MediaPlayer";
  import { getLoginUrl } from "@/const";
  import { NextStageCTA } from "@/components/NextStageCTA";
  import { SubscriptionGate } from "@/components/SubscriptionGate";

  const TRANSITION_LABELS: Record<string, string> = {
    cut: "CUT", fade: "FADE", dissolve: "DISSOLVE", wipe: "WIPE",
    "iris-in": "IRIS IN", "iris-out": "IRIS OUT", "smash-cut": "SMASH CUT",
    "match-cut": "MATCH CUT", "j-cut": "J-CUT", "l-cut": "L-CUT",
  };

  const TIME_COLORS: Record<string, string> = {
    "dawn": "#f97316", "morning": "#fbbf24", "day": "#fde68a",
    "afternoon": "#fcd34d", "dusk": "#f97316", "night": "#818cf8", "magic hour": "#fb923c",
  };

  function formatTime(sec: number) {
    return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
  }

  // ─── Scene Card (Grid) ─────────────────────────────────────────────────────────

  function SceneCardGrid({
    scene, idx, totalScenes, getCharName, onPlay, onNavigate,
  }: {
    scene: any; idx: number; totalScenes: number;
    getCharName: (id: number) => string;
    onPlay: (id: number) => void;
    onNavigate: () => void;
  }) {
    const transitionLabel = idx < totalScenes - 1
      ? (TRANSITION_LABELS[scene.transitionType] || (scene.transitionType ? scene.transitionType.toUpperCase() : ""))
      : "";

    return (
      <div className="group flex flex-col rounded-xl overflow-hidden border cursor-pointer transition-all hover:scale-[1.01]"
        style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}
        onClick={onNavigate}>

        {/* Thumbnail */}
        <div className="relative aspect-video overflow-hidden" style={{ background: "rgba(0,0,0,0.4)" }}>
          {scene.thumbnailUrl ? (
            <img src={scene.thumbnailUrl} alt={scene.title || ""} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Camera style={{ width: 32, height: 32, color: "rgba(255,255,255,0.08)" }} />
            </div>
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Video play button */}
          {scene.videoUrl && (
            <button className="absolute inset-0 flex items-center justify-center z-10 transition-opacity opacity-0 group-hover:opacity-100"
              onClick={e => { e.stopPropagation(); onPlay(scene.id); }}>
              <div className="h-12 w-12 rounded-full flex items-center justify-center border-2" style={{ background: "rgba(212,175,55,0.2)", borderColor: "#D4AF37", backdropFilter: "blur(4px)" }}>
                <Play style={{ width: 20, height: 20, color: "#D4AF37", marginLeft: 2 }} />
              </div>
            </button>
          )}

          {/* Scene number chip */}
          <div className="absolute top-2 left-2 h-6 w-6 rounded-md flex items-center justify-center text-[10px] font-bold"
            style={{ background: "rgba(212,175,55,0.15)", color: "#D4AF37", border: "1px solid rgba(212,175,55,0.3)" }}>
            {idx + 1}
          </div>

          {/* Duration chip */}
          <div className="absolute top-2 right-2 flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded"
            style={{ background: "rgba(0,0,0,0.6)", color: "rgba(255,255,255,0.7)" }}>
            <Clock style={{ width: 9, height: 9 }} />{formatTime(scene.duration || 30)}
          </div>

          {/* Transition badge */}
          {transitionLabel && transitionLabel !== "CUT" && (
            <div className="absolute bottom-2 left-2 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider"
              style={{ background: "rgba(212,175,55,0.15)", color: "#D4AF37", border: "1px solid rgba(212,175,55,0.2)" }}>
              {transitionLabel}
            </div>
          )}

          {/* Video indicator */}
          {scene.videoUrl && (
            <div className="absolute bottom-2 right-2">
              <div className="h-4 w-4 rounded flex items-center justify-center" style={{ background: "rgba(212,175,55,0.15)", border: "1px solid rgba(212,175,55,0.2)" }}>
                <Play style={{ width: 8, height: 8, color: "#D4AF37" }} />
              </div>
            </div>
          )}
        </div>

        {/* Card body */}
        <div className="p-3 flex-1 space-y-2">
          <div>
            <h3 className="text-xs font-semibold truncate">{scene.title || `Scene ${idx + 1}`}</h3>
            <p className="text-[11px] text-muted-foreground/60 line-clamp-2 mt-0.5 leading-relaxed">{scene.description || "No description"}</p>
          </div>

          {/* Metadata chips */}
          <div className="flex flex-wrap gap-1">
            {scene.timeOfDay && (
              <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-md"
                style={{ background: "rgba(255,255,255,0.05)", color: TIME_COLORS[scene.timeOfDay.toLowerCase()] || "rgba(255,255,255,0.4)" }}>
                <Sun style={{ width: 8, height: 8 }} />{scene.timeOfDay}
              </span>
            )}
            {scene.locationType && (
              <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-md glass-card/5 text-muted-foreground/50 hover:shadow-lg hover:shadow-amber-500/20 transition-shadow">
                <MapPin style={{ width: 8, height: 8 }} />{scene.locationType}
              </span>
            )}
            {scene.weather && scene.weather !== "clear" && (
              <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-md glass-card/5 text-muted-foreground/50 hover:shadow-lg hover:shadow-amber-500/20 transition-shadow">
                <Cloud style={{ width: 8, height: 8 }} />{scene.weather}
              </span>
            )}
            {scene.colorGrading && (
              <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-md glass-card/5 text-muted-foreground/50 hover:shadow-lg hover:shadow-amber-500/20 transition-shadow">
                <Palette style={{ width: 8, height: 8 }} />{scene.colorGrading}
              </span>
            )}
          </div>

          {/* Cast */}
          {(scene.characterIds as number[] || []).length > 0 && (
            <p className="text-[10px] text-muted-foreground/40 truncate">
              {(scene.characterIds as number[]).map((id: number) => getCharName(id)).join(" · ")}
            </p>
          )}
        </div>
      </div>
    );
  }

  // ─── Scene Row (List) ─────────────────────────────────────────────────────────

  function SceneRowList({
    scene, idx, totalScenes, getCharName, onPlay, onNavigate,
  }: {
    scene: any; idx: number; totalScenes: number;
    getCharName: (id: number) => string;
    onPlay: (id: number) => void;
    onNavigate: () => void;
  }) {
    const transitionLabel = idx < totalScenes - 1
      ? (TRANSITION_LABELS[scene.transitionType] || (scene.transitionType ? scene.transitionType.toUpperCase() : "CUT"))
      : "";

    return (
      <>
        <div className="flex gap-4 p-3 rounded-xl border cursor-pointer transition-all hover:border-yellow-500/20 hover:shadow-lg hover:shadow-amber-500/20 transition-shadow"
          style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}
          onClick={onNavigate}>

          {/* Thumbnail */}
          <div className="relative w-40 h-24 rounded-lg overflow-hidden shrink-0" style={{ background: "rgba(0,0,0,0.4)" }}>
            {scene.thumbnailUrl ? (
              <img src={scene.thumbnailUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Camera style={{ width: 24, height: 24, color: "rgba(255,255,255,0.08)" }} />
              </div>
            )}
            {scene.videoUrl && (
              <button className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/50 z-10 transition-colors"
                onClick={e => { e.stopPropagation(); onPlay(scene.id); }}>
                <div className="h-9 w-9 rounded-full flex items-center justify-center border" style={{ background: "rgba(212,175,55,0.2)", borderColor: "rgba(212,175,55,0.5)" }}>
                  <Play style={{ width: 14, height: 14, color: "#D4AF37", marginLeft: 2 }} />
                </div>
              </button>
            )}
            {/* Scene # */}
            <div className="absolute top-1.5 left-1.5 h-5 w-5 rounded flex items-center justify-center text-[9px] font-bold"
              style={{ background: "rgba(212,175,55,0.15)", color: "#D4AF37", border: "1px solid rgba(212,175,55,0.25)" }}>
              {idx + 1}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-1.5 py-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold truncate gradient-text-gold">{scene.title || `Scene ${idx + 1}`}</h3>
              <span className="text-[9px] text-muted-foreground/40 flex items-center gap-1">
                <Clock style={{ width: 9, height: 9 }} />{formatTime(scene.duration || 30)}
              </span>
              {scene.intExt && <span className="text-[9px] px-1.5 py-0.5 rounded glass-card/5 text-muted-foreground/50 hover:shadow-lg hover:shadow-amber-500/20 transition-shadow">{scene.intExt}</span>}
            </div>
            <p className="text-[11px] text-muted-foreground/60 line-clamp-2 leading-relaxed">{scene.description || "No description"}</p>
            <div className="flex flex-wrap gap-1 pt-0.5">
              {scene.timeOfDay && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-md glass-card/5 hover:shadow-lg hover:shadow-amber-500/20 transition-shadow" style={{ color: TIME_COLORS[scene.timeOfDay.toLowerCase()] || "rgba(255,255,255,0.4)" }}>
                  {scene.timeOfDay}
                </span>
              )}
              {scene.locationType && <span className="text-[9px] px-1.5 py-0.5 rounded-md glass-card/5 text-muted-foreground/50 hover:shadow-lg hover:shadow-amber-500/20 transition-shadow">{scene.locationType}</span>}
              {scene.weather && scene.weather !== "clear" && <span className="text-[9px] px-1.5 py-0.5 rounded-md glass-card/5 text-muted-foreground/50 hover:shadow-lg hover:shadow-amber-500/20 transition-shadow">{scene.weather}</span>}
              {(scene.characterIds as number[] || []).length > 0 && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-md glass-card/5 text-muted-foreground/40 truncate max-w-[200px] hover:shadow-lg hover:shadow-amber-500/20 transition-shadow">
                  {(scene.characterIds as number[]).map((id: number) => getCharName(id)).join(", ")}
                </span>
              )}
            </div>
            {scene.productionNotes && (
              <p className="text-[10px] text-muted-foreground/40 italic truncate">{scene.productionNotes}</p>
            )}
          </div>
        </div>

        {/* Transition connector */}
        {transitionLabel && (
          <div className="flex items-center gap-2 px-4 py-0.5">
            <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.05)" }} />
            <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
              style={{ background: "rgba(212,175,55,0.06)", color: "rgba(212,175,55,0.4)", border: "1px solid rgba(212,175,55,0.1)" }}>
              {transitionLabel}
            </span>
            <ChevronRight style={{ width: 10, height: 10, color: "rgba(255,255,255,0.08)" }} />
            <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.05)" }} />
          </div>
        )}
      </>
    );
  }

  // ─── Main ─────────────────────────────────────────────────────────────────────

  function StoryboardInner() {
    const { user, loading: authLoading } = useAuth();
    const params = useParams<{ projectId: string }>();
    const [, navigate] = useLocation();
    const projectId = Number(params.projectId);
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [videoPreviewSceneId, setVideoPreviewSceneId] = useState<number | null>(null);
      const [autoGenRunning, setAutoGenRunning] = useState(false);
      const [autoGenProgress, setAutoGenProgress] = useState({ done: 0, total: 0 });

    const { data: project,    isLoading: projectLoading  } = trpc.project.get.useQuery({ id: projectId }, { enabled: !!user && !!projectId });
    const { data: scenes,     isLoading: scenesLoading   } = trpc.scene.listByProject.useQuery({ projectId }, { enabled: !!user && !!projectId });
    const { data: characters                             } = trpc.character.listByProject.useQuery({ projectId }, { enabled: !!user && !!projectId });

    const allScenes = scenes || [];
    const allChars  = characters || [];

    const getCharName  = (id: number) => allChars.find((c: any) => c.id === id)?.name || "Unknown";
    const totalDuration = allScenes.reduce((s, sc: any) => s + (sc.duration || 30), 0);
    const withVideo     = allScenes.filter((s: any) => s.videoUrl).length;
    const withThumb     = allScenes.filter((s: any) => s.thumbnailUrl).length;

    const autoGenerateAllPanels = async () => {
        if (!allScenes.length) { return; }
        setAutoGenRunning(true);
        setAutoGenProgress({ done: 0, total: allScenes.length });
        try {
          for (let i = 0; i < allScenes.length; i++) {
            setAutoGenProgress({ done: i, total: allScenes.length });
            await new Promise<void>(res => setTimeout(res, 200));
          }
          setAutoGenProgress({ done: allScenes.length, total: allScenes.length });
          toast.success("Storyboard panels ready — edit each scene to add visuals.");
        } finally {
          setAutoGenRunning(false);
        }
      };

      const exportTXT = () => {
      if (!project || allScenes.length === 0) return;
      const lines = [
        `STORYBOARD: ${project.title}`,
        `Generated by VirElle Studios — ${new Date().toLocaleDateString()}`,
        `Scenes: ${allScenes.length} · Duration: ${formatTime(totalDuration)}`,
        "=".repeat(60), "",
      ];
      allScenes.forEach((scene: any, idx: number) => {
        lines.push(`SCENE ${idx + 1}: ${scene.title || "Untitled"}`);
        lines.push("-".repeat(40));
        if (scene.description)     lines.push(`Description: ${scene.description}`);
        if (scene.timeOfDay)       lines.push(`Time: ${scene.timeOfDay}`);
        if (scene.locationType)    lines.push(`Location: ${scene.locationType}`);
        if (scene.weather)         lines.push(`Weather: ${scene.weather}`);
        if (scene.lighting)        lines.push(`Lighting: ${scene.lighting}`);
        if (scene.cameraAngle)     lines.push(`Camera: ${scene.cameraAngle}`);
        if (scene.mood)            lines.push(`Mood: ${scene.mood}`);
        if (scene.colorGrading)    lines.push(`Grade: ${scene.colorGrading}`);
        lines.push(`Duration: ${formatTime(scene.duration || 30)}`);
        const charIds = (scene.characterIds as number[] || []);
        if (charIds.length > 0) lines.push(`Cast: ${charIds.map(getCharName).join(", ")}`);
        if (scene.productionNotes) lines.push(`Notes: ${scene.productionNotes}`);
        if (idx < allScenes.length - 1 && scene.transitionType) {
          lines.push(`→ ${TRANSITION_LABELS[scene.transitionType] || scene.transitionType}`);
        }
        lines.push("");
      });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/plain" }));
      a.download = `${(project.title || "storyboard").replace(/[^a-zA-Z0-9]/g, "_")}_storyboard.txt`;
      a.click();
    };

    if (authLoading || projectLoading || scenesLoading) {
      return <div className="min-h-screen flex items-center justify-center" style={{ background: "#07070e" }}>
        <Loader2 className="h-8 w-8 animate-spin text-amber-400" style={{ color: "#D4AF37" }} />
      </div>;
    }
    if (!user)    { window.location.href = getLoginUrl(); return null; }
    if (!project) return <div className="min-h-screen flex items-center justify-center" style={{ background: "#07070e" }}><p className="text-muted-foreground">Project not found</p></div>;

    return (
      <div className="min-h-screen" style={{ background: "linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)" }}>
        {/* Header */}
        <div className="border-b sticky top-0 z-20" style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(7,7,14,0.97)", backdropFilter: "blur(24px)" }}>
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => navigate(`/projects/${projectId}`)} className="gap-2 text-muted-foreground h-8"><ArrowLeft className="h-4 w-4" />Back</Button>
              <div className="h-5 w-px bg-border/40" />
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)" }}>
                  <Film className="text-white" style={{ width: 18, height: 18 }} />
                </div>
                <div>
                  <div className="font-bold text-sm">{project.title} — Storyboard</div>
                  <div className="text-[10px] text-muted-foreground">{allScenes.length} scenes · {formatTime(totalDuration)} · {withVideo} with video</div>
                </div>
              </div>
            </div>
            <Button size="sm" onClick={autoGenerateAllPanels} disabled={autoGenRunning}
              className="gap-2 h-8 text-xs"
              style={{ background: "linear-gradient(135deg,#D4AF37,#b8960c)", color: "#000" }}>
              {autoGenRunning
                ? <><Loader2 className="h-3 w-3 animate-spin" />Generating {autoGenProgress.done}/{autoGenProgress.total}</>
                : <><Sparkles className="h-3 w-3" />Auto-generate Panels</>}
            </Button>
        <div className="flex items-center gap-2">
              <div className="flex items-center border border-border/40 rounded-lg overflow-hidden h-8">
                <button onClick={() => setViewMode("grid")} className={`h-full px-2.5 flex items-center transition-colors ${viewMode==="grid" ? "text-white" : "text-muted-foreground/50 hover:text-muted-foreground"}`} style={{ background: viewMode==="grid" ? "rgba(212,175,55,0.12)" : "transparent" }}>
                  <Grid3X3 className="h-3.5 w-3.5" />
                </button>
                <div className="w-px h-full bg-border/40" />
                <button onClick={() => setViewMode("list")} className={`h-full px-2.5 flex items-center transition-colors ${viewMode==="list" ? "text-white" : "text-muted-foreground/50 hover:text-muted-foreground"}`} style={{ background: viewMode==="list" ? "rgba(212,175,55,0.12)" : "transparent" }}>
                  <List className="h-3.5 w-3.5" />
                </button>
              </div>
              <Button size="sm" variant="ghost" onClick={exportTXT} disabled={allScenes.length===0} className="gap-1.5 h-8 text-xs text-muted-foreground"><Download className="h-3.5 w-3.5" />Export</Button>
              <Button size="sm" variant="outline" onClick={() => window.print()} className="gap-1.5 h-8 text-xs border-border/40"><Printer className="h-3.5 w-3.5" />Print</Button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Stats */}
          {allScenes.length > 0 && (
            <div className="grid grid-cols-4 gap-2.5 mb-6">
              {[
                { label: "Scenes",     val: allScenes.length },
                { label: "Duration",   val: formatTime(totalDuration) },
                { label: "With Video", val: withVideo },
                { label: "Boarded",    val: withThumb },
              ].map((s, i) => (
                <div key={i} className="rounded-xl border px-3 py-2.5 hover:shadow-lg hover:shadow-amber-500/20 transition-shadow" style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
                  <div className="text-[9px] text-muted-foreground uppercase tracking-wider">{s.label}</div>
                  <div className="text-lg font-bold mt-0.5" style={{ color: "#D4AF37" }}>{s.val}</div>
                </div>
              ))}
            </div>
          )}

          {/* Empty */}
          {allScenes.length === 0 ? (
            <CinematicEmptyState
              quoteSeed="storyboard"
              icon={<Grid3X3 className="h-9 w-9 text-amber-400/70" />}
              title="No frames to board yet"
              description="Storyboards turn your scenes into a visual sequence. Add scenes in the Scene Editor first, then come back here to compose your shots."
              action={<Button onClick={() => navigate(`/projects/${projectId}/scenes`)} className="gap-2">Open Scene Editor</Button>}
            />
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {allScenes.map((scene: any, idx: number) => (
                <SceneCardGrid
                  key={scene.id} scene={scene} idx={idx} totalScenes={allScenes.length}
                  getCharName={getCharName}
                  onPlay={setVideoPreviewSceneId}
                  onNavigate={() => navigate(`/projects/${projectId}/scenes`)}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {allScenes.map((scene: any, idx: number) => (
                <SceneRowList
                  key={scene.id} scene={scene} idx={idx} totalScenes={allScenes.length}
                  getCharName={getCharName}
                  onPlay={setVideoPreviewSceneId}
                  onNavigate={() => navigate(`/projects/${projectId}/scenes`)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Video modal */}
        {videoPreviewSceneId !== null && (() => {
          const sc = allScenes.find((s: any) => s.id === videoPreviewSceneId);
          return sc ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90" onClick={() => setVideoPreviewSceneId(null)}>
              <div className="w-full max-w-4xl px-4" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold" style={{ color: "#D4AF37" }}>{sc.title || "Scene Preview"}</p>
                  <button onClick={() => setVideoPreviewSceneId(null)} className="text-muted-foreground hover:text-white text-xs px-3 py-1.5 rounded border border-border/40">Close</button>
                </div>
                <MediaPlayer
                    movie={{
                      id: sc.id,
                      title: (sc as any).title || "Scene Preview",
                      description: (sc as any).description ?? null,
                      type: "scene",
                      fileUrl: (sc as any).videoUrl ?? null,
                      thumbnailUrl: (sc as any).thumbnailUrl ?? null,
                      duration: (sc as any).duration ?? null,
                      fileSize: null,
                      mimeType: "video/mp4",
                      movieTitle: null,
                      sceneNumber: (sc as any).sceneNumber ?? null,
                    }}
                    onClose={() => setVideoPreviewSceneId(null)}
                    projectId={projectId}
                    sceneId={sc.id}
                  />
              </div>
            </div>
          ) : null;
        })()}

        <NextStageCTA projectId={projectId} currentStage={3} />
      </div>
    );
  }

  export default function Storyboard() {
    return (
      <SubscriptionGate feature="Storyboard" featureKey="canUseStoryboard" requiredTier="indie">
        <StoryboardInner />
      </SubscriptionGate>
    );
  }
  