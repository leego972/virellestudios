import { useEffect, useMemo, useState, type DragEvent } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Camera,
  ChevronDown,
  ChevronUp,
  Clock,
  Edit3,
  Film,
  GripVertical,
  ImagePlus,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  Wand2,
  X,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

const STORYBOARD_PATH = /^\/projects\/(\d+)\/storyboard\/?$/;
const DEFAULT_SHOT_SECONDS = 8;

type ShotMetadata = {
  cameraAngle?: string;
  movement?: string;
  description?: string;
  shotType?: string;
  lens?: string;
  framing?: string;
  notes?: string;
};

type ShotPackage = {
  id: number;
  sceneId: number;
  projectId: number;
  shotIndex: number;
  prompt: string;
  negativePrompt?: string | null;
  durationSeconds: number;
  keyframeUrl?: string | null;
  status: "pending" | "generating" | "completed" | "failed" | "retrying";
  errorMessage?: string | null;
  metadata?: ShotMetadata | null;
};

type ShotForm = {
  prompt: string;
  negativePrompt: string;
  durationSeconds: number;
  cameraAngle: string;
  movement: string;
  description: string;
  shotType: string;
  lens: string;
  framing: string;
  notes: string;
};

const EMPTY_SHOT_FORM: ShotForm = {
  prompt: "",
  negativePrompt: "",
  durationSeconds: DEFAULT_SHOT_SECONDS,
  cameraAngle: "",
  movement: "",
  description: "",
  shotType: "",
  lens: "",
  framing: "",
  notes: "",
};

function shotToForm(shot?: ShotPackage | null): ShotForm {
  if (!shot) return { ...EMPTY_SHOT_FORM };
  const metadata = shot.metadata || {};
  return {
    prompt: shot.prompt || "",
    negativePrompt: shot.negativePrompt || "",
    durationSeconds: shot.durationSeconds || DEFAULT_SHOT_SECONDS,
    cameraAngle: metadata.cameraAngle || "",
    movement: metadata.movement || "",
    description: metadata.description || "",
    shotType: metadata.shotType || "",
    lens: metadata.lens || "",
    framing: metadata.framing || "",
    notes: metadata.notes || "",
  };
}

function formatDuration(seconds: number): string {
  const safe = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const minutes = Math.floor(safe / 60);
  const remainder = safe % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function getRouteProjectId(): number | null {
  if (typeof window === "undefined") return null;
  const match = window.location.pathname.match(STORYBOARD_PATH);
  if (!match) return null;
  const projectId = Number(match[1]);
  return Number.isFinite(projectId) && projectId > 0 ? projectId : null;
}

export default function StoryboardShotWorkspaceOverlay() {
  const [projectId, setProjectId] = useState<number | null>(() => getRouteProjectId());
  const [open, setOpen] = useState(false);
  const [selectedSceneId, setSelectedSceneId] = useState<number | null>(null);
  const [editingShot, setEditingShot] = useState<ShotPackage | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteShotId, setDeleteShotId] = useState<number | null>(null);
  const [shotForm, setShotForm] = useState<ShotForm>({ ...EMPTY_SHOT_FORM });
  const [draggedShotId, setDraggedShotId] = useState<number | null>(null);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);
  const utils = trpc.useUtils();

  useEffect(() => {
    const syncRoute = () => {
      const nextProjectId = getRouteProjectId();
      setProjectId(nextProjectId);
      if (!nextProjectId) setOpen(false);
    };
    syncRoute();
    window.addEventListener("popstate", syncRoute);
    const interval = window.setInterval(syncRoute, 750);
    return () => {
      window.removeEventListener("popstate", syncRoute);
      window.clearInterval(interval);
    };
  }, []);

  const projectQuery = trpc.project.get.useQuery(
    { id: projectId! },
    { enabled: !!projectId && open },
  );
  const scenesQuery = trpc.scene.listByProject.useQuery(
    { projectId: projectId! },
    { enabled: !!projectId && open },
  );
  const scenes = useMemo(
    () => [...(scenesQuery.data || [])].sort((left: any, right: any) => (left.orderIndex || 0) - (right.orderIndex || 0)),
    [scenesQuery.data],
  );
  const effectiveSceneId = selectedSceneId || scenes[0]?.id || null;
  const selectedScene = scenes.find((scene: any) => scene.id === effectiveSceneId) || null;

  const shotsQuery = trpc.featureFilm.getShotPackages.useQuery(
    { sceneId: effectiveSceneId! },
    { enabled: !!effectiveSceneId && open },
  );
  const shots = useMemo(
    () => [...((shotsQuery.data || []) as ShotPackage[])].sort((left, right) => left.shotIndex - right.shotIndex),
    [shotsQuery.data],
  );

  const planMutation = trpc.featureFilm.planShotPackages.useMutation({
    onSuccess: async result => {
      if (effectiveSceneId) await utils.featureFilm.getShotPackages.invalidate({ sceneId: effectiveSceneId });
      toast.success(`${result.shotCount} shot${result.shotCount === 1 ? "" : "s"} planned`);
    },
    onError: error => toast.error(error.message),
  });

  const addMutation = trpc.narrative.addStoryboardShot.useMutation({
    onSuccess: async () => {
      if (effectiveSceneId) await utils.featureFilm.getShotPackages.invalidate({ sceneId: effectiveSceneId });
      setAddDialogOpen(false);
      setShotForm({ ...EMPTY_SHOT_FORM });
      toast.success("Storyboard shot added");
    },
    onError: error => toast.error(error.message),
  });

  const updateMutation = trpc.narrative.updateStoryboardShot.useMutation({
    onSuccess: async () => {
      if (effectiveSceneId) await utils.featureFilm.getShotPackages.invalidate({ sceneId: effectiveSceneId });
      setEditingShot(null);
      toast.success("Storyboard shot saved");
    },
    onError: error => toast.error(error.message),
  });

  const reorderMutation = trpc.narrative.reorderStoryboardShots.useMutation({
    onSuccess: async () => {
      if (effectiveSceneId) await utils.featureFilm.getShotPackages.invalidate({ sceneId: effectiveSceneId });
    },
    onError: error => toast.error(error.message),
  });

  const deleteMutation = trpc.narrative.deleteStoryboardShot.useMutation({
    onSuccess: async () => {
      if (effectiveSceneId) await utils.featureFilm.getShotPackages.invalidate({ sceneId: effectiveSceneId });
      setDeleteShotId(null);
      toast.success("Storyboard shot deleted");
    },
    onError: error => toast.error(error.message),
  });

  const keyframeMutation = trpc.narrative.generateStoryboardKeyframe.useMutation({
    onSuccess: async () => {
      if (effectiveSceneId) await utils.featureFilm.getShotPackages.invalidate({ sceneId: effectiveSceneId });
      if (projectId) await utils.scene.listByProject.invalidate({ projectId });
    },
    onError: error => toast.error(error.message),
  });

  if (!projectId) return null;

  const totalDuration = shots.reduce((sum, shot) => sum + (shot.durationSeconds || 0), 0);
  const completedFrames = shots.filter(shot => !!shot.keyframeUrl).length;
  const activeGeneratingShotId = keyframeMutation.variables?.shotPackageId;
  const busy = planMutation.isPending || keyframeMutation.isPending || !!bulkProgress;

  const planSelectedScene = async () => {
    if (!selectedScene) return;
    const sceneDuration = Math.max(10, Math.min(600, Number(selectedScene.duration) || 30));
    const shotDurationSeconds = sceneDuration <= 30 ? 6 : sceneDuration <= 90 ? 8 : 10;
    await planMutation.mutateAsync({
      sceneId: selectedScene.id,
      targetDurationSeconds: sceneDuration,
      shotDurationSeconds,
    });
  };

  const saveShot = () => {
    if (!editingShot || !shotForm.prompt.trim()) return;
    updateMutation.mutate({
      shotPackageId: editingShot.id,
      prompt: shotForm.prompt.trim(),
      negativePrompt: shotForm.negativePrompt.trim() || null,
      durationSeconds: Math.max(1, Math.min(60, Number(shotForm.durationSeconds) || DEFAULT_SHOT_SECONDS)),
      metadata: {
        cameraAngle: shotForm.cameraAngle.trim() || undefined,
        movement: shotForm.movement.trim() || undefined,
        description: shotForm.description.trim() || undefined,
        shotType: shotForm.shotType.trim() || undefined,
        lens: shotForm.lens.trim() || undefined,
        framing: shotForm.framing.trim() || undefined,
        notes: shotForm.notes.trim() || undefined,
      },
    });
  };

  const addShot = () => {
    if (!effectiveSceneId || !shotForm.prompt.trim()) return;
    addMutation.mutate({
      sceneId: effectiveSceneId,
      prompt: shotForm.prompt.trim(),
      negativePrompt: shotForm.negativePrompt.trim() || undefined,
      durationSeconds: Math.max(1, Math.min(60, Number(shotForm.durationSeconds) || DEFAULT_SHOT_SECONDS)),
      metadata: {
        cameraAngle: shotForm.cameraAngle.trim() || undefined,
        movement: shotForm.movement.trim() || undefined,
        description: shotForm.description.trim() || undefined,
        shotType: shotForm.shotType.trim() || undefined,
        lens: shotForm.lens.trim() || undefined,
        framing: shotForm.framing.trim() || undefined,
        notes: shotForm.notes.trim() || undefined,
      },
    });
  };

  const reorder = (sourceId: number, targetId: number) => {
    if (!effectiveSceneId || sourceId === targetId) return;
    const next = [...shots];
    const sourceIndex = next.findIndex(shot => shot.id === sourceId);
    const targetIndex = next.findIndex(shot => shot.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, moved);
    reorderMutation.mutate({
      sceneId: effectiveSceneId,
      orderedShotPackageIds: next.map(shot => shot.id),
    });
  };

  const moveShot = (shotId: number, direction: -1 | 1) => {
    const currentIndex = shots.findIndex(shot => shot.id === shotId);
    const target = shots[currentIndex + direction];
    if (!target) return;
    reorder(shotId, target.id);
  };

  const generateAllMissing = async () => {
    if (!selectedScene) return;
    let currentShots = shots;
    if (currentShots.length === 0) {
      const sceneDuration = Math.max(10, Math.min(600, Number(selectedScene.duration) || 30));
      const planned = await planMutation.mutateAsync({
        sceneId: selectedScene.id,
        targetDurationSeconds: sceneDuration,
        shotDurationSeconds: sceneDuration <= 30 ? 6 : sceneDuration <= 90 ? 8 : 10,
      });
      currentShots = (planned.shots || []) as ShotPackage[];
    }
    const pending = currentShots.filter(shot => !shot.keyframeUrl);
    if (pending.length === 0) {
      toast.info("Every shot already has a keyframe");
      return;
    }
    setBulkProgress({ done: 0, total: pending.length });
    try {
      for (let index = 0; index < pending.length; index += 1) {
        await keyframeMutation.mutateAsync({ shotPackageId: pending[index].id });
        setBulkProgress({ done: index + 1, total: pending.length });
      }
      await utils.featureFilm.getShotPackages.invalidate({ sceneId: selectedScene.id });
      toast.success(`${pending.length} storyboard keyframe${pending.length === 1 ? "" : "s"} generated`);
    } finally {
      setBulkProgress(null);
    }
  };

  return (
    <>
      {!open && (
        <Button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-[70] h-12 gap-2 rounded-full border border-amber-300/30 bg-[#15130d] px-5 text-amber-100 shadow-2xl shadow-black/50 hover:bg-[#211d10]"
        >
          <Film className="h-4 w-4 text-amber-300" />
          Shot-by-shot board
        </Button>
      )}

      {open && (
        <div className="fixed inset-0 z-[120] flex flex-col bg-[#07070e] text-zinc-100">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#0b0b12] px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <Button size="icon" variant="ghost" onClick={() => setOpen(false)} aria-label="Close shot workspace">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 ring-1 ring-amber-300/20">
                <Camera className="h-5 w-5 text-amber-300" />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold">{projectQuery.data?.title || "Project"} — Shot Board</h2>
                <p className="text-xs text-zinc-500">Edit and approve individual shots before video generation</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" className="gap-2 border-white/10" onClick={() => { setShotForm({ ...EMPTY_SHOT_FORM }); setAddDialogOpen(true); }} disabled={!selectedScene || busy}>
                <Plus className="h-4 w-4" /> Add shot
              </Button>
              <Button variant="outline" size="sm" className="gap-2 border-white/10" onClick={() => void planSelectedScene()} disabled={!selectedScene || busy}>
                {planMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                {shots.length > 0 ? "Re-plan shots" : "Plan shots"}
              </Button>
              <Button size="sm" className="gap-2 bg-amber-500 text-black hover:bg-amber-400" onClick={() => void generateAllMissing()} disabled={!selectedScene || busy}>
                {bulkProgress ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {bulkProgress ? `Generating ${bulkProgress.done}/${bulkProgress.total}` : "Generate missing frames"}
              </Button>
              <Button size="icon" variant="ghost" onClick={() => setOpen(false)} aria-label="Close shot workspace">
                <X className="h-5 w-5" />
              </Button>
            </div>
          </header>

          <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)]">
            <aside className="min-h-0 overflow-y-auto border-b border-white/10 bg-black/20 p-3 lg:border-b-0 lg:border-r">
              <div className="mb-3 rounded-xl border border-amber-300/15 bg-amber-300/[0.04] p-3 text-[11px] leading-relaxed text-zinc-500">
                Planning uses the existing script and scene data. Keyframes consume image-generation credits only. No video job is started here.
              </div>
              <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-600">Scenes</p>
              <div className="space-y-1.5">
                {scenes.map((scene: any, index: number) => (
                  <button
                    key={scene.id}
                    type="button"
                    onClick={() => setSelectedSceneId(scene.id)}
                    className={`w-full rounded-lg border p-2.5 text-left transition ${scene.id === effectiveSceneId ? "border-amber-300/35 bg-amber-300/[0.08]" : "border-white/[0.06] bg-white/[0.02] hover:border-white/15"}`}
                  >
                    <div className="flex gap-2">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-black/30 text-[10px] font-semibold text-amber-300">{index + 1}</span>
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-medium">{scene.title || `Scene ${index + 1}`}</span>
                        <span className="mt-0.5 block line-clamp-2 text-[10px] leading-relaxed text-zinc-600">{scene.description || "No description"}</span>
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </aside>

            <main className="min-h-0 overflow-y-auto p-4 sm:p-6">
              {!selectedScene ? (
                <div className="flex h-full items-center justify-center text-sm text-zinc-500">Create or import scenes before building a shot board.</div>
              ) : (
                <>
                  <section className="mb-5 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                      <div>
                        <div className="flex flex-wrap gap-2">
                          <Badge className="bg-amber-500/15 text-amber-200 hover:bg-amber-500/15">{shots.length} shots</Badge>
                          <Badge variant="outline" className="border-white/10 text-zinc-400">{completedFrames}/{shots.length} framed</Badge>
                          <Badge variant="outline" className="border-white/10 text-zinc-400">{formatDuration(totalDuration)} planned</Badge>
                        </div>
                        <h3 className="mt-3 text-xl font-semibold">{selectedScene.title || "Untitled scene"}</h3>
                        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-zinc-500">{selectedScene.description || "Add a scene description for a stronger shot breakdown."}</p>
                      </div>
                    </div>
                  </section>

                  {shotsQuery.isLoading ? (
                    <div className="flex h-64 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-amber-300" /></div>
                  ) : shots.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-10 text-center">
                      <Wand2 className="mx-auto h-9 w-9 text-amber-300" />
                      <h3 className="mt-4 font-semibold">No shots planned for this scene</h3>
                      <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-zinc-500">Generate an AI cinematography breakdown, then edit every shot before creating reference frames.</p>
                      <Button className="mt-5 bg-amber-500 text-black hover:bg-amber-400" onClick={() => void planSelectedScene()} disabled={busy}>
                        {planMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                        Plan this scene
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {shots.map((shot, index) => {
                        const metadata = shot.metadata || {};
                        const isGenerating = activeGeneratingShotId === shot.id && keyframeMutation.isPending;
                        return (
                          <article
                            key={shot.id}
                            draggable={!busy}
                            onDragStart={(event: DragEvent<HTMLElement>) => {
                              setDraggedShotId(shot.id);
                              event.dataTransfer.effectAllowed = "move";
                              event.dataTransfer.setData("text/plain", String(shot.id));
                            }}
                            onDragOver={event => {
                              event.preventDefault();
                              event.dataTransfer.dropEffect = "move";
                            }}
                            onDrop={event => {
                              event.preventDefault();
                              if (draggedShotId) reorder(draggedShotId, shot.id);
                              setDraggedShotId(null);
                            }}
                            onDragEnd={() => setDraggedShotId(null)}
                            className={`overflow-hidden rounded-xl border bg-white/[0.025] transition ${draggedShotId === shot.id ? "scale-[0.98] border-amber-300/50 opacity-50" : "border-white/10 hover:border-amber-300/25"}`}
                          >
                            <div className="relative aspect-video bg-black/40">
                              {shot.keyframeUrl ? (
                                <img src={shot.keyframeUrl} alt={`Shot ${index + 1} storyboard frame`} className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full flex-col items-center justify-center gap-2 text-zinc-700">
                                  {isGenerating ? <Loader2 className="h-8 w-8 animate-spin text-amber-300" /> : <ImagePlus className="h-8 w-8" />}
                                  <span className="text-xs">{isGenerating ? "Generating keyframe" : "No keyframe"}</span>
                                </div>
                              )}
                              <span className="absolute left-2 top-2 rounded-md border border-amber-300/25 bg-black/75 px-2 py-1 text-[10px] font-semibold text-amber-200">SHOT {index + 1}</span>
                              <span className="absolute right-2 top-2 rounded bg-black/75 px-1.5 py-1 font-mono text-[10px] text-white/70"><Clock className="mr-1 inline h-3 w-3" />{shot.durationSeconds}s</span>
                            </div>

                            <div className="p-3">
                              <div className="flex items-start gap-2">
                                <GripVertical className="mt-0.5 h-4 w-4 shrink-0 cursor-grab text-white/25" />
                                <p className="line-clamp-3 min-h-[3.75rem] flex-1 text-xs leading-relaxed text-zinc-300">{shot.prompt}</p>
                              </div>
                              <div className="mt-3 flex flex-wrap gap-1.5">
                                {metadata.shotType && <Badge variant="outline" className="border-white/10 text-[9px] text-zinc-500">{metadata.shotType}</Badge>}
                                {metadata.cameraAngle && <Badge variant="outline" className="border-white/10 text-[9px] text-zinc-500">{metadata.cameraAngle}</Badge>}
                                {metadata.movement && <Badge variant="outline" className="border-white/10 text-[9px] text-zinc-500">{metadata.movement}</Badge>}
                                {metadata.lens && <Badge variant="outline" className="border-white/10 text-[9px] text-zinc-500">{metadata.lens}</Badge>}
                              </div>
                              {shot.status === "failed" && shot.errorMessage && <p className="mt-2 rounded border border-red-500/20 bg-red-500/5 p-2 text-[10px] text-red-300">{shot.errorMessage}</p>}
                              <div className="mt-4 flex items-center gap-1.5">
                                <Button size="icon" variant="ghost" className="h-8 w-8" disabled={index === 0 || busy} onClick={() => moveShot(shot.id, -1)} aria-label="Move shot earlier"><ChevronUp className="h-4 w-4" /></Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8" disabled={index === shots.length - 1 || busy} onClick={() => moveShot(shot.id, 1)} aria-label="Move shot later"><ChevronDown className="h-4 w-4" /></Button>
                                <Button size="sm" variant="outline" className="h-8 flex-1 gap-1.5 border-white/10 text-xs" disabled={busy} onClick={() => { setEditingShot(shot); setShotForm(shotToForm(shot)); }}><Edit3 className="h-3.5 w-3.5" /> Edit</Button>
                                <Button size="sm" className={`h-8 flex-1 gap-1.5 text-xs ${shot.keyframeUrl ? "bg-white/5 text-amber-200 hover:bg-amber-500/10" : "bg-amber-500 text-black hover:bg-amber-400"}`} disabled={busy} onClick={() => keyframeMutation.mutate({ shotPackageId: shot.id })}>
                                  {isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : shot.keyframeUrl ? <RefreshCw className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
                                  {shot.keyframeUrl ? "Regenerate" : "Generate"}
                                </Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-500 hover:bg-red-500/10 hover:text-red-300" disabled={busy} onClick={() => setDeleteShotId(shot.id)} aria-label="Delete shot"><Trash2 className="h-4 w-4" /></Button>
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </main>
          </div>
        </div>
      )}

      <Dialog open={addDialogOpen || !!editingShot} onOpenChange={dialogOpen => { if (!dialogOpen) { setAddDialogOpen(false); setEditingShot(null); setShotForm({ ...EMPTY_SHOT_FORM }); } }}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingShot ? `Edit shot ${editingShot.shotIndex}` : "Add storyboard shot"}</DialogTitle>
            <DialogDescription>These fields drive the persisted storyboard keyframe and later video-generation handoff.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="story-shot-prompt">Visual prompt</Label><Textarea id="story-shot-prompt" value={shotForm.prompt} onChange={event => setShotForm(current => ({ ...current, prompt: event.target.value }))} rows={5} maxLength={4000} /></div>
            <div className="space-y-1.5"><Label htmlFor="story-shot-type">Shot type</Label><Input id="story-shot-type" value={shotForm.shotType} onChange={event => setShotForm(current => ({ ...current, shotType: event.target.value }))} placeholder="establishing, close-up, insert" /></div>
            <div className="space-y-1.5"><Label htmlFor="story-shot-angle">Camera angle</Label><Input id="story-shot-angle" value={shotForm.cameraAngle} onChange={event => setShotForm(current => ({ ...current, cameraAngle: event.target.value }))} placeholder="eye level, low angle, overhead" /></div>
            <div className="space-y-1.5"><Label htmlFor="story-shot-movement">Camera movement</Label><Input id="story-shot-movement" value={shotForm.movement} onChange={event => setShotForm(current => ({ ...current, movement: event.target.value }))} placeholder="static, dolly in, handheld" /></div>
            <div className="space-y-1.5"><Label htmlFor="story-shot-lens">Lens / focal length</Label><Input id="story-shot-lens" value={shotForm.lens} onChange={event => setShotForm(current => ({ ...current, lens: event.target.value }))} placeholder="35mm anamorphic" /></div>
            <div className="space-y-1.5"><Label htmlFor="story-shot-framing">Framing</Label><Input id="story-shot-framing" value={shotForm.framing} onChange={event => setShotForm(current => ({ ...current, framing: event.target.value }))} placeholder="medium two-shot" /></div>
            <div className="space-y-1.5"><Label htmlFor="story-shot-duration">Duration (seconds)</Label><Input id="story-shot-duration" type="number" min={1} max={60} value={shotForm.durationSeconds} onChange={event => setShotForm(current => ({ ...current, durationSeconds: Number(event.target.value) }))} /></div>
            <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="story-shot-beat">Beat / action description</Label><Textarea id="story-shot-beat" value={shotForm.description} onChange={event => setShotForm(current => ({ ...current, description: event.target.value }))} rows={3} maxLength={2000} /></div>
            <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="story-shot-negative">Negative prompt</Label><Textarea id="story-shot-negative" value={shotForm.negativePrompt} onChange={event => setShotForm(current => ({ ...current, negativePrompt: event.target.value }))} rows={2} maxLength={2000} placeholder="Elements that must not appear" /></div>
            <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="story-shot-notes">Production notes</Label><Textarea id="story-shot-notes" value={shotForm.notes} onChange={event => setShotForm(current => ({ ...current, notes: event.target.value }))} rows={2} maxLength={2000} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddDialogOpen(false); setEditingShot(null); setShotForm({ ...EMPTY_SHOT_FORM }); }}>Cancel</Button>
            <Button onClick={editingShot ? saveShot : addShot} disabled={!shotForm.prompt.trim() || addMutation.isPending || updateMutation.isPending} className="bg-amber-500 text-black hover:bg-amber-400">
              {(addMutation.isPending || updateMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingShot ? "Save shot" : "Add shot"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteShotId !== null} onOpenChange={dialogOpen => !dialogOpen && setDeleteShotId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete this storyboard shot?</AlertDialogTitle><AlertDialogDescription>The shot plan and its generated keyframe reference will be removed. Generated video assets are not deleted.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={deleteMutation.isPending || deleteShotId === null} onClick={event => { event.preventDefault(); if (deleteShotId !== null) deleteMutation.mutate({ shotPackageId: deleteShotId }); }}>
              {deleteMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deleting</> : "Delete shot"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
