import { useAuth } from "@/_core/hooks/useAuth";
import CinematicEmptyState from "@/components/CinematicEmptyState";
import MediaPlayer from "@/components/MediaPlayer";
import { NextStageCTA } from "@/components/NextStageCTA";
import { SubscriptionGate } from "@/components/SubscriptionGate";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  Camera,
  Clock,
  Download,
  Edit3,
  Film,
  Grid3X3,
  GripVertical,
  List,
  Loader2,
  MapPin,
  Play,
  Printer,
  RefreshCw,
  Save,
  Sparkles,
  Sun,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
  type DragEvent,
} from "react";
import { toast } from "sonner";
import { useLocation, useParams } from "wouter";

const TRANSITION_LABELS: Record<string, string> = {
  cut: "CUT",
  fade: "FADE",
  dissolve: "DISSOLVE",
  wipe: "WIPE",
  "iris-in": "IRIS IN",
  "iris-out": "IRIS OUT",
  "smash-cut": "SMASH CUT",
  "match-cut": "MATCH CUT",
  "j-cut": "J-CUT",
  "l-cut": "L-CUT",
};

function formatTime(seconds: number): string {
  const safe = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

function sanitiseFilename(value: string): string {
  return value.trim().replace(/[^a-zA-Z0-9-_]+/g, "_").replace(/^_+|_+$/g, "") || "storyboard";
}

function StoryboardInner() {
  const { user, loading: authLoading } = useAuth();
  const params = useParams<{ projectId: string }>();
  const [, navigate] = useLocation();
  const projectId = Number(params.projectId);
  const validProjectId = Number.isFinite(projectId) && projectId > 0;
  const utils = trpc.useUtils();

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [orderedScenes, setOrderedScenes] = useState<any[]>([]);
  const [draggingSceneId, setDraggingSceneId] = useState<number | null>(null);
  const [videoPreviewSceneId, setVideoPreviewSceneId] = useState<number | null>(null);
  const [editScene, setEditScene] = useState<any | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPrompt, setEditPrompt] = useState("");
  const [generateConfirmOpen, setGenerateConfirmOpen] = useState(false);
  const [autoGenRunning, setAutoGenRunning] = useState(false);
  const [autoGenProgress, setAutoGenProgress] = useState({ done: 0, total: 0 });
  const [generatingSceneId, setGeneratingSceneId] = useState<number | null>(null);

  const { data: project, isLoading: projectLoading } = trpc.project.get.useQuery(
    { id: projectId },
    { enabled: !!user && validProjectId },
  );
  const { data: scenes, isLoading: scenesLoading } = trpc.scene.listByProject.useQuery(
    { projectId },
    { enabled: !!user && validProjectId },
  );
  const { data: characters } = trpc.character.listByProject.useQuery(
    { projectId },
    { enabled: !!user && validProjectId },
  );

  useEffect(() => {
    setOrderedScenes(
      [...(scenes ?? [])].sort(
        (left: any, right: any) =>
          (left.orderIndex ?? 0) - (right.orderIndex ?? 0),
      ),
    );
  }, [scenes]);

  const generateFrameMutation = trpc.scene.generatePreview.useMutation();
  const updateSceneMutation = trpc.scene.update.useMutation();
  const reorderMutation = trpc.scene.reorder.useMutation();

  const missingFrames = orderedScenes.filter(scene => !scene.thumbnailUrl);
  const totalDuration = orderedScenes.reduce(
    (total, scene) => total + (scene.duration || 30),
    0,
  );
  const withVideo = orderedScenes.filter(scene => scene.videoUrl).length;
  const withFrame = orderedScenes.filter(scene => scene.thumbnailUrl).length;

  const getCharacterName = (id: number) =>
    (characters ?? []).find((character: any) => character.id === id)?.name ||
    "Unknown";

  const videoPlaylist = useMemo(
    () =>
      orderedScenes
        .filter(scene => !!scene.videoUrl)
        .map((scene, index) => ({
          id: scene.id,
          title: scene.title || `Scene ${index + 1}`,
          description: scene.description || null,
          type: "scene",
          fileUrl: scene.videoUrl || null,
          thumbnailUrl: scene.thumbnailUrl || null,
          duration: scene.duration || null,
          fileSize: null,
          mimeType: "video/mp4",
          movieTitle: project?.title || null,
          sceneNumber: index + 1,
        })),
    [orderedScenes, project?.title],
  );

  const activeVideo =
    videoPlaylist.find(item => item.id === videoPreviewSceneId) || null;

  const generateMissingFrames = async () => {
    const targets = orderedScenes.filter(scene => !scene.thumbnailUrl);
    setGenerateConfirmOpen(false);
    if (targets.length === 0) {
      toast.info("Every scene already has a storyboard frame.");
      return;
    }

    setAutoGenRunning(true);
    setAutoGenProgress({ done: 0, total: targets.length });
    const failed: string[] = [];

    try {
      for (let index = 0; index < targets.length; index += 1) {
        const scene = targets[index];
        try {
          await generateFrameMutation.mutateAsync({ sceneId: scene.id });
        } catch (error) {
          failed.push(
            scene.title ||
              `Scene ${orderedScenes.findIndex(item => item.id === scene.id) + 1}`,
          );
        }
        setAutoGenProgress({ done: index + 1, total: targets.length });
      }
      await utils.scene.listByProject.invalidate({ projectId });

      if (failed.length === 0) {
        toast.success(`Generated ${targets.length} storyboard frame${targets.length === 1 ? "" : "s"}.`);
      } else {
        toast.error(
          `${targets.length - failed.length} frame${targets.length - failed.length === 1 ? "" : "s"} generated; ${failed.length} failed. No video generation was started.`,
          { duration: 8000 },
        );
      }
    } finally {
      setAutoGenRunning(false);
    }
  };

  const regenerateFrame = async (scene: any) => {
    if (autoGenRunning || generatingSceneId !== null) return;
    setGeneratingSceneId(scene.id);
    try {
      await generateFrameMutation.mutateAsync({ sceneId: scene.id });
      await utils.scene.listByProject.invalidate({ projectId });
      toast.success("Storyboard frame regenerated.");
    } catch (error: any) {
      toast.error(error?.message || "Storyboard frame generation failed.");
    } finally {
      setGeneratingSceneId(null);
    }
  };

  const openEditor = (scene: any) => {
    setEditScene(scene);
    setEditTitle(scene.title || "");
    setEditDescription(scene.description || "");
    setEditPrompt(scene.aiPromptOverride || "");
  };

  const saveSceneEdits = async () => {
    if (!editScene) return;
    try {
      await updateSceneMutation.mutateAsync({
        id: editScene.id,
        title: editTitle.trim(),
        description: editDescription.trim(),
        aiPromptOverride: editPrompt.trim(),
      });
      await utils.scene.listByProject.invalidate({ projectId });
      setEditScene(null);
      toast.success("Storyboard scene updated.");
    } catch (error: any) {
      toast.error(error?.message || "Scene changes could not be saved.");
    }
  };

  const reorderScenes = async (targetSceneId: number) => {
    if (draggingSceneId === null || draggingSceneId === targetSceneId) return;
    const previous = orderedScenes;
    const sourceIndex = previous.findIndex(scene => scene.id === draggingSceneId);
    const targetIndex = previous.findIndex(scene => scene.id === targetSceneId);
    if (sourceIndex < 0 || targetIndex < 0) return;

    const next = [...previous];
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, moved);
    setOrderedScenes(next);

    try {
      await reorderMutation.mutateAsync({
        projectId,
        sceneIds: next.map(scene => scene.id),
      });
      await utils.scene.listByProject.invalidate({ projectId });
      toast.success("Storyboard order saved.");
    } catch (error: any) {
      setOrderedScenes(previous);
      toast.error(error?.message || "Storyboard order could not be saved.");
    } finally {
      setDraggingSceneId(null);
    }
  };

  const exportText = () => {
    if (!project || orderedScenes.length === 0) return;
    const lines = [
      `STORYBOARD: ${project.title}`,
      `Generated by Virelle Studios — ${new Date().toLocaleDateString()}`,
      `Scenes: ${orderedScenes.length} · Duration: ${formatTime(totalDuration)}`,
      "=".repeat(64),
      "",
    ];

    orderedScenes.forEach((scene, index) => {
      lines.push(`SCENE ${index + 1}: ${scene.title || "Untitled"}`);
      lines.push("-".repeat(44));
      if (scene.thumbnailUrl) lines.push(`Frame: ${scene.thumbnailUrl}`);
      if (scene.description) lines.push(`Description: ${scene.description}`);
      if (scene.aiPromptOverride) lines.push(`Visual prompt: ${scene.aiPromptOverride}`);
      if (scene.locationType) lines.push(`Location: ${scene.locationType}`);
      if (scene.timeOfDay) lines.push(`Time: ${scene.timeOfDay}`);
      if (scene.cameraAngle) lines.push(`Camera: ${scene.cameraAngle}`);
      if (scene.mood) lines.push(`Mood: ${scene.mood}`);
      lines.push(`Duration: ${formatTime(scene.duration || 30)}`);
      const characterIds = Array.isArray(scene.characterIds)
        ? scene.characterIds
        : [];
      if (characterIds.length > 0) {
        lines.push(`Cast: ${characterIds.map(getCharacterName).join(", ")}`);
      }
      if (index < orderedScenes.length - 1 && scene.transitionType) {
        lines.push(
          `Transition: ${TRANSITION_LABELS[scene.transitionType] || scene.transitionType}`,
        );
      }
      lines.push("");
    });

    const url = URL.createObjectURL(
      new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${sanitiseFilename(project.title || "storyboard")}_storyboard.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  if (authLoading || projectLoading || scenesLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#07070e]">
        <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
      </div>
    );
  }

  if (!user) {
    window.location.href = getLoginUrl();
    return null;
  }

  if (!project) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#07070e]">
        <p className="text-muted-foreground">Project not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#07070e_0%,#0c0b18_60%,#07070a_100%)]">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#07070ef7] backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/projects/${projectId}`)}
              className="h-8 gap-2 text-muted-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div className="h-5 w-px bg-border/40" />
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700">
                <Film className="h-[18px] w-[18px] text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-sm font-bold">
                  {project.title} — Storyboard
                </h1>
                <p className="text-[10px] text-muted-foreground">
                  {orderedScenes.length} scenes · {formatTime(totalDuration)} · {withFrame} framed
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              size="sm"
              onClick={() => setGenerateConfirmOpen(true)}
              disabled={autoGenRunning || missingFrames.length === 0}
              className="h-8 gap-2 bg-gradient-to-br from-[#D4AF37] to-[#b8960c] text-xs text-black hover:brightness-110"
            >
              {autoGenRunning ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Generating {autoGenProgress.done}/{autoGenProgress.total}
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  {missingFrames.length > 0
                    ? `Generate ${missingFrames.length} Missing Frame${missingFrames.length === 1 ? "" : "s"}`
                    : "All Frames Generated"}
                </>
              )}
            </Button>

            <div className="flex h-8 overflow-hidden rounded-lg border border-border/40">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`flex h-full items-center px-2.5 ${viewMode === "grid" ? "bg-amber-500/10 text-white" : "text-muted-foreground/50"}`}
                aria-label="Grid view"
              >
                <Grid3X3 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`flex h-full items-center border-l border-border/40 px-2.5 ${viewMode === "list" ? "bg-amber-500/10 text-white" : "text-muted-foreground/50"}`}
                aria-label="List view"
              >
                <List className="h-3.5 w-3.5" />
              </button>
            </div>

            <Button
              size="sm"
              variant="ghost"
              onClick={exportText}
              disabled={orderedScenes.length === 0}
              className="h-8 gap-1.5 text-xs text-muted-foreground"
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.print()}
              className="h-8 gap-1.5 border-border/40 text-xs"
            >
              <Printer className="h-3.5 w-3.5" />
              Print
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        {orderedScenes.length > 0 && (
          <>
            <div className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {[
                { label: "Scenes", value: orderedScenes.length },
                { label: "Duration", value: formatTime(totalDuration) },
                { label: "With Video", value: withVideo },
                { label: "Boarded", value: withFrame },
              ].map(stat => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5"
                >
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground">
                    {stat.label}
                  </p>
                  <p className="mt-0.5 text-lg font-bold text-[#D4AF37]">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
            <p className="mb-4 flex items-center gap-1.5 text-xs text-muted-foreground/60">
              <GripVertical className="h-3.5 w-3.5" />
              Drag scenes to reorder them. Reordering is saved to the project and used by the timeline.
            </p>
          </>
        )}

        {orderedScenes.length === 0 ? (
          <CinematicEmptyState
            quoteSeed="storyboard"
            icon={<Grid3X3 className="h-9 w-9 text-amber-400/70" />}
            title="No scenes to board yet"
            description="Use Script Breakdown or the Scene Editor to create scenes. This page then generates real still frames from those persisted scenes."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button onClick={() => navigate(`/projects/${projectId}/script-breakdown`)} className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  Script Breakdown
                </Button>
                <Button variant="outline" onClick={() => navigate(`/projects/${projectId}/scenes`)}>
                  Scene Editor
                </Button>
              </div>
            }
          />
        ) : (
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                : "space-y-3"
            }
          >
            {orderedScenes.map((scene, index) => {
              const characterIds = Array.isArray(scene.characterIds)
                ? scene.characterIds
                : [];
              const isGenerating = generatingSceneId === scene.id;
              const transition =
                index < orderedScenes.length - 1 && scene.transitionType
                  ? TRANSITION_LABELS[scene.transitionType] || scene.transitionType
                  : null;

              return (
                <article
                  key={scene.id}
                  draggable={!autoGenRunning && generatingSceneId === null}
                  onDragStart={(event: DragEvent<HTMLElement>) => {
                    setDraggingSceneId(scene.id);
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", String(scene.id));
                  }}
                  onDragOver={event => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                  }}
                  onDrop={event => {
                    event.preventDefault();
                    void reorderScenes(scene.id);
                  }}
                  onDragEnd={() => setDraggingSceneId(null)}
                  className={`group overflow-hidden rounded-xl border bg-white/[0.02] transition ${
                    draggingSceneId === scene.id
                      ? "scale-[0.98] border-amber-400/50 opacity-50"
                      : "border-white/10 hover:border-amber-400/25"
                  } ${viewMode === "list" ? "flex flex-col sm:flex-row" : "flex flex-col"}`}
                >
                  <div
                    className={`relative overflow-hidden bg-black/40 ${
                      viewMode === "list"
                        ? "aspect-video w-full sm:w-64 sm:shrink-0"
                        : "aspect-video w-full"
                    }`}
                  >
                    {scene.thumbnailUrl ? (
                      <img
                        src={scene.thumbnailUrl}
                        alt={`${scene.title || `Scene ${index + 1}`} storyboard frame`}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-white/25">
                        <Camera className="h-8 w-8" />
                        <span className="text-xs">Frame not generated</span>
                      </div>
                    )}

                    <div className="absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-md border border-amber-400/30 bg-black/70 text-[11px] font-bold text-amber-300">
                      {index + 1}
                    </div>
                    <div className="absolute right-2 top-2 rounded bg-black/70 px-1.5 py-0.5 font-mono text-[10px] text-white/70">
                      {formatTime(scene.duration || 30)}
                    </div>

                    {scene.videoUrl && (
                      <button
                        type="button"
                        className="absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 transition-opacity hover:bg-black/30 group-hover:opacity-100 focus-visible:opacity-100"
                        onClick={() => setVideoPreviewSceneId(scene.id)}
                        aria-label={`Play ${scene.title || `scene ${index + 1}`}`}
                      >
                        <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-amber-400 bg-black/60 text-amber-300">
                          <Play className="ml-0.5 h-5 w-5 fill-current" />
                        </span>
                      </button>
                    )}
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col p-3">
                    <div className="mb-2 flex items-start gap-2">
                      <GripVertical className="mt-0.5 h-4 w-4 shrink-0 cursor-grab text-white/25 active:cursor-grabbing" />
                      <div className="min-w-0 flex-1">
                        <h2 className="truncate text-sm font-semibold">
                          {scene.title || `Scene ${index + 1}`}
                        </h2>
                        <p className="mt-1 line-clamp-3 text-[11px] leading-relaxed text-muted-foreground/70">
                          {scene.description || "No scene description."}
                        </p>
                      </div>
                    </div>

                    <div className="mb-3 flex flex-wrap gap-1">
                      {scene.timeOfDay && (
                        <Badge variant="outline" className="gap-1 border-white/10 text-[9px] text-white/55">
                          <Sun className="h-2.5 w-2.5" />
                          {scene.timeOfDay}
                        </Badge>
                      )}
                      {scene.locationType && (
                        <Badge variant="outline" className="gap-1 border-white/10 text-[9px] text-white/55">
                          <MapPin className="h-2.5 w-2.5" />
                          {scene.locationType}
                        </Badge>
                      )}
                      {characterIds.length > 0 && (
                        <Badge variant="outline" className="max-w-full truncate border-white/10 text-[9px] text-white/45">
                          {characterIds.map(getCharacterName).join(", ")}
                        </Badge>
                      )}
                      {transition && (
                        <Badge className="border border-amber-400/20 bg-amber-400/10 text-[9px] text-amber-300">
                          {transition}
                        </Badge>
                      )}
                    </div>

                    {scene.aiPromptOverride && (
                      <p className="mb-3 line-clamp-2 rounded-lg border border-white/5 bg-black/20 p-2 text-[10px] italic text-white/45">
                        Visual prompt: {scene.aiPromptOverride}
                      </p>
                    )}

                    <div className="mt-auto flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 flex-1 gap-1.5 border-white/10 text-xs"
                        onClick={() => openEditor(scene)}
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant={scene.thumbnailUrl ? "ghost" : "default"}
                        className={`h-8 flex-1 gap-1.5 text-xs ${
                          scene.thumbnailUrl
                            ? "text-amber-300 hover:bg-amber-400/10"
                            : "bg-amber-500 text-black hover:bg-amber-400"
                        }`}
                        disabled={autoGenRunning || generatingSceneId !== null}
                        onClick={() => void regenerateFrame(scene)}
                      >
                        {isGenerating ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : scene.thumbnailUrl ? (
                          <RefreshCw className="h-3.5 w-3.5" />
                        ) : (
                          <Sparkles className="h-3.5 w-3.5" />
                        )}
                        {isGenerating
                          ? "Generating"
                          : scene.thumbnailUrl
                            ? "Regenerate"
                            : "Generate"}
                      </Button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      <Dialog open={!!editScene} onOpenChange={open => !open && setEditScene(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit storyboard scene</DialogTitle>
            <DialogDescription>
              Changes are saved to the existing scene. The visual prompt is used by the real preview-frame generator.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="storyboard-title">Scene title</Label>
              <Input
                id="storyboard-title"
                value={editTitle}
                onChange={event => setEditTitle(event.target.value)}
                maxLength={255}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="storyboard-description">Scene description</Label>
              <Textarea
                id="storyboard-description"
                value={editDescription}
                onChange={event => setEditDescription(event.target.value)}
                rows={5}
                maxLength={2000}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="storyboard-prompt">Visual generation prompt</Label>
              <Textarea
                id="storyboard-prompt"
                value={editPrompt}
                onChange={event => setEditPrompt(event.target.value)}
                rows={4}
                placeholder="Optional exact visual direction for this frame"
              />
              <p className="text-xs text-muted-foreground">
                Character references, wardrobe, project Visual DNA and continuity context remain injected by the existing generation pipeline.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditScene(null)} disabled={updateSceneMutation.isPending}>
              Cancel
            </Button>
            <Button onClick={() => void saveSceneEdits()} disabled={updateSceneMutation.isPending} className="gap-2">
              {updateSceneMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={generateConfirmOpen} onOpenChange={setGenerateConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Generate missing storyboard frames?</AlertDialogTitle>
            <AlertDialogDescription>
              This will generate {missingFrames.length} real still image{missingFrames.length === 1 ? "" : "s"} using the existing scene preview pipeline and image-generation credits. It will not generate video or consume video-generation credits.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={event => {
              event.preventDefault();
              void generateMissingFrames();
            }}>
              Generate frames
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {activeVideo && (
        <MediaPlayer
          movie={activeVideo}
          playlist={videoPlaylist}
          onClose={() => setVideoPreviewSceneId(null)}
          onNavigate={setVideoPreviewSceneId}
          projectId={projectId}
          sceneId={activeVideo.id}
        />
      )}

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
