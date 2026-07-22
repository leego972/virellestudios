import { useEffect, useMemo, useState, type DragEvent } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  Check,
  ChevronLeft,
  Clapperboard,
  Download,
  GripVertical,
  Loader2,
  Lock,
  Music,
  Save,
  SlidersHorizontal,
  Volume2,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";

type CutScene = {
  id: number;
  sceneId: number;
  orderIndex: number;
  isIncluded: boolean;
  trimIn: number | null;
  trimOut: number | null;
  transitionType: string | null;
  transitionDuration: number | null;
  directorNote: string | null;
  scene: {
    id: number;
    title: string | null;
    description: string | null;
    duration: number | null;
    thumbnailUrl: string | null;
    videoUrl: string | null;
  } | null;
};

type ClipDraft = {
  trimIn: string;
  trimOut: string;
  transitionType: string;
  transitionDuration: string;
  directorNote: string;
};

type AudioDraft = {
  dialogueBus: number;
  musicBus: number;
  effectsBus: number;
  masterVolume: number;
  mixStatus: "draft" | "in-progress" | "locked" | "final";
  audioPassNotes: string;
};

const TRANSITIONS = [
  ["cut", "Cut"],
  ["dissolve", "Cross Dissolve"],
  ["fade", "Fade"],
  ["dip-to-black", "Dip to Black"],
  ["wipe", "Wipe"],
  ["match-cut", "Match Cut"],
  ["j-cut", "J-Cut"],
  ["l-cut", "L-Cut"],
] as const;

function getProjectId(pathname: string): number | null {
  const match = pathname.match(/^\/projects\/(\d+)\/feature-timeline\/?$/);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

function clampNumber(value: string, minimum: number, maximum: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return minimum;
  return Math.min(maximum, Math.max(minimum, parsed));
}

export default function FeatureTimelineProductionControls() {
  const [location, navigate] = useLocation();
  const projectId = getProjectId(location);
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [selectedCutId, setSelectedCutId] = useState<number | null>(null);
  const [draggedCutSceneId, setDraggedCutSceneId] = useState<number | null>(null);
  const [localOrder, setLocalOrder] = useState<number[]>([]);
  const [clipDrafts, setClipDrafts] = useState<Record<number, ClipDraft>>({});
  const [savingClipId, setSavingClipId] = useState<number | null>(null);
  const [audioDraft, setAudioDraft] = useState<AudioDraft>({
    dialogueBus: 100,
    musicBus: 80,
    effectsBus: 85,
    masterVolume: 100,
    mixStatus: "draft",
    audioPassNotes: "",
  });

  const { data: summary, isLoading: summaryLoading } =
    trpc.featureFilm.getFeatureFilmSummary.useQuery(
      { projectId: projectId! },
      { enabled: !!projectId },
    );
  const cuts = summary?.cuts || [];
  const effectiveCutId = selectedCutId ?? cuts[0]?.id ?? null;

  useEffect(() => {
    if (!projectId) {
      setOpen(false);
      setSelectedCutId(null);
      return;
    }
    if (selectedCutId === null && cuts[0]?.id) setSelectedCutId(cuts[0].id);
  }, [cuts, projectId, selectedCutId]);

  const { data: cutData, isLoading: cutLoading } = trpc.featureFilm.getCut.useQuery(
    { cutId: effectiveCutId! },
    { enabled: !!projectId && !!effectiveCutId },
  );
  const { data: audioPlan, isLoading: audioLoading } =
    trpc.featureFilm.getAudioPlan.useQuery(
      { projectId: projectId! },
      { enabled: !!projectId },
    );

  const baseScenes = useMemo(
    () =>
      ([...(cutData?.scenes || [])] as unknown as CutScene[]).sort(
        (left, right) => left.orderIndex - right.orderIndex,
      ),
    [cutData?.scenes],
  );

  useEffect(() => {
    setLocalOrder(baseScenes.map(scene => scene.id));
    setClipDrafts(
      Object.fromEntries(
        baseScenes.map(scene => [
          scene.id,
          {
            trimIn: String(scene.trimIn || 0),
            trimOut: String(scene.trimOut || 0),
            transitionType: scene.transitionType || "cut",
            transitionDuration: String(scene.transitionDuration || 0),
            directorNote: scene.directorNote || "",
          },
        ]),
      ),
    );
  }, [baseScenes]);

  useEffect(() => {
    if (!audioPlan) return;
    setAudioDraft({
      dialogueBus: Math.round(Number(audioPlan.dialogueBus ?? 1) * 100),
      musicBus: Math.round(Number(audioPlan.musicBus ?? 0.8) * 100),
      effectsBus: Math.round(Number(audioPlan.effectsBus ?? 0.85) * 100),
      masterVolume: Math.round(Number(audioPlan.masterVolume ?? 1) * 100),
      mixStatus: (audioPlan.mixStatus as AudioDraft["mixStatus"]) || "draft",
      audioPassNotes: audioPlan.audioPassNotes || "",
    });
  }, [audioPlan]);

  const updateCutScene = trpc.featureFilm.updateCutScene.useMutation({
    onError: error => toast.error(error.message),
  });
  const reorderCutScenes = trpc.featureFilm.reorderCutScenes.useMutation({
    onSuccess: async () => {
      if (effectiveCutId) await utils.featureFilm.getCut.invalidate({ cutId: effectiveCutId });
      toast.success("Timeline order saved.");
    },
    onError: error => {
      setLocalOrder(baseScenes.map(scene => scene.id));
      toast.error(error.message);
    },
  });
  const saveAudioPlan = trpc.featureFilm.saveAudioPlan.useMutation({
    onSuccess: async () => {
      if (projectId) {
        await Promise.all([
          utils.featureFilm.getAudioPlan.invalidate({ projectId }),
          utils.featureFilm.getFeatureFilmSummary.invalidate({ projectId }),
        ]);
      }
      toast.success("Audio mix plan saved.");
    },
    onError: error => toast.error(error.message),
  });

  const orderedScenes = useMemo(() => {
    const byId = new Map(baseScenes.map(scene => [scene.id, scene]));
    const ordered = localOrder.map(id => byId.get(id)).filter(Boolean) as CutScene[];
    for (const scene of baseScenes) {
      if (!localOrder.includes(scene.id)) ordered.push(scene);
    }
    return ordered;
  }, [baseScenes, localOrder]);

  const includedDuration = orderedScenes
    .filter(scene => scene.isIncluded)
    .reduce((total, scene) => {
      const draft = clipDrafts[scene.id];
      const raw = Number(scene.scene?.duration || 0);
      const trimIn = clampNumber(draft?.trimIn || "0", 0, raw);
      const trimOut = clampNumber(draft?.trimOut || "0", 0, Math.max(0, raw - trimIn));
      return total + Math.max(0, raw - trimIn - trimOut);
    }, 0);

  const saveClip = async (scene: CutScene) => {
    const draft = clipDrafts[scene.id];
    if (!draft || cutData?.cut?.isLocked) return;
    const rawDuration = Math.max(0, Number(scene.scene?.duration || 0));
    const trimIn = clampNumber(draft.trimIn, 0, rawDuration);
    const trimOut = clampNumber(draft.trimOut, 0, Math.max(0, rawDuration - trimIn));
    const transitionDuration = clampNumber(draft.transitionDuration, 0, 30);
    setClipDrafts(previous => ({
      ...previous,
      [scene.id]: {
        ...draft,
        trimIn: String(trimIn),
        trimOut: String(trimOut),
        transitionDuration: String(transitionDuration),
      },
    }));
    setSavingClipId(scene.id);
    try {
      await updateCutScene.mutateAsync({
        cutSceneId: scene.id,
        trimIn,
        trimOut,
        transitionType: draft.transitionType,
        transitionDuration,
        directorNote: draft.directorNote.trim(),
      });
      if (effectiveCutId) await utils.featureFilm.getCut.invalidate({ cutId: effectiveCutId });
      toast.success(`Saved ${scene.scene?.title || "scene"}.`);
    } finally {
      setSavingClipId(null);
    }
  };

  const toggleIncluded = async (scene: CutScene, included: boolean) => {
    if (cutData?.cut?.isLocked) return;
    try {
      await updateCutScene.mutateAsync({ cutSceneId: scene.id, isIncluded: included });
      if (effectiveCutId) await utils.featureFilm.getCut.invalidate({ cutId: effectiveCutId });
    } catch {
      // Mutation handler already surfaces the error.
    }
  };

  const dropScene = (targetId: number) => {
    if (!effectiveCutId || draggedCutSceneId === null || draggedCutSceneId === targetId) return;
    const sourceIndex = localOrder.indexOf(draggedCutSceneId);
    const targetIndex = localOrder.indexOf(targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;
    const next = [...localOrder];
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, moved);
    setLocalOrder(next);
    setDraggedCutSceneId(null);
    reorderCutScenes.mutate({ cutId: effectiveCutId, orderedCutSceneIds: next });
  };

  const saveAudio = () => {
    if (!projectId) return;
    saveAudioPlan.mutate({
      projectId,
      dialogueBus: audioDraft.dialogueBus / 100,
      musicBus: audioDraft.musicBus / 100,
      effectsBus: audioDraft.effectsBus / 100,
      masterVolume: audioDraft.masterVolume / 100,
      mixStatus: audioDraft.mixStatus,
      audioPassNotes: audioDraft.audioPassNotes.trim(),
    });
  };

  if (!projectId) return null;

  const locked = !!cutData?.cut?.isLocked;
  const loading = summaryLoading || (!!effectiveCutId && cutLoading);

  return (
    <>
      {!open && (
        <Button
          className="fixed bottom-5 right-5 z-[70] gap-2 rounded-full bg-amber-500 px-4 text-black shadow-2xl hover:bg-amber-400"
          onClick={() => setOpen(true)}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Edit Controls
        </Button>
      )}

      {open && (
        <div className="fixed inset-0 z-[70] bg-black/45 backdrop-blur-[2px]" onClick={() => setOpen(false)}>
          <aside
            className="absolute inset-y-0 right-0 flex w-full max-w-xl flex-col border-l border-amber-500/20 bg-[#090910] shadow-2xl"
            onClick={event => event.stopPropagation()}
            aria-label="Feature timeline production controls"
          >
            <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="flex items-center gap-2">
                <Clapperboard className="h-5 w-5 text-amber-400" />
                <div>
                  <h2 className="text-sm font-semibold text-white">Professional Edit Controls</h2>
                  <p className="text-[10px] text-white/45">Uses the current persisted Feature Timeline cut</p>
                </div>
              </div>
              <Button size="icon" variant="ghost" onClick={() => setOpen(false)} aria-label="Close edit controls">
                <X className="h-4 w-4" />
              </Button>
            </header>

            <div className="border-b border-white/10 p-4">
              <div className="flex items-end gap-3">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Label>Cut</Label>
                  <Select
                    value={effectiveCutId ? String(effectiveCutId) : undefined}
                    onValueChange={value => setSelectedCutId(Number(value))}
                  >
                    <SelectTrigger><SelectValue placeholder="Select cut" /></SelectTrigger>
                    <SelectContent>
                      {cuts.map(cut => (
                        <SelectItem key={cut.id} value={String(cut.id)}>{cut.name} · {cut.version}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline" className="gap-2" onClick={() => navigate(`/projects/${projectId}/nle-export`)}>
                  <Download className="h-4 w-4" /> Export
                </Button>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <Badge variant="outline">{orderedScenes.filter(scene => scene.isIncluded).length} included</Badge>
                <Badge variant="outline">{formatDuration(includedDuration)}</Badge>
                {locked && <Badge className="gap-1 bg-green-950 text-green-300"><Lock className="h-3 w-3" />Locked</Badge>}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex min-h-[300px] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-amber-400" /></div>
              ) : !effectiveCutId ? (
                <div className="p-8 text-center text-sm text-white/50">Create a cut in the existing Feature Timeline to begin editing.</div>
              ) : (
                <div className="space-y-6 p-4">
                  <section>
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-white">Timeline clips</h3>
                        <p className="text-xs text-white/45">Drag to reorder. Edit trim and transitions, then save each clip.</p>
                      </div>
                      {reorderCutScenes.isPending && <Loader2 className="h-4 w-4 animate-spin text-amber-400" />}
                    </div>
                    <div className="space-y-2">
                      {orderedScenes.map((scene, index) => {
                        const draft = clipDrafts[scene.id];
                        if (!draft) return null;
                        const effectiveDuration = Math.max(
                          0,
                          Number(scene.scene?.duration || 0) - Number(draft.trimIn || 0) - Number(draft.trimOut || 0),
                        );
                        return (
                          <article
                            key={scene.id}
                            draggable={!locked && !reorderCutScenes.isPending}
                            onDragStart={(event: DragEvent<HTMLElement>) => {
                              setDraggedCutSceneId(scene.id);
                              event.dataTransfer.effectAllowed = "move";
                              event.dataTransfer.setData("text/plain", String(scene.id));
                            }}
                            onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }}
                            onDrop={event => { event.preventDefault(); dropScene(scene.id); }}
                            onDragEnd={() => setDraggedCutSceneId(null)}
                            className={`rounded-xl border p-3 transition ${draggedCutSceneId === scene.id ? "border-amber-400/60 opacity-55" : "border-white/10 bg-white/[0.025]"}`}
                          >
                            <div className="flex items-center gap-2">
                              <GripVertical className={`h-4 w-4 shrink-0 ${locked ? "text-white/10" : "cursor-grab text-white/30"}`} />
                              <span className="w-6 font-mono text-[10px] text-white/35">{String(index + 1).padStart(2, "0")}</span>
                              <div className="h-10 w-16 shrink-0 overflow-hidden rounded bg-black/40">
                                {scene.scene?.thumbnailUrl ? <img src={scene.scene.thumbnailUrl} alt="" className="h-full w-full object-cover" /> : null}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className={`truncate text-xs font-medium ${scene.isIncluded ? "text-white" : "text-white/35 line-through"}`}>{scene.scene?.title || `Scene ${scene.sceneId}`}</p>
                                <p className="font-mono text-[10px] text-amber-300/70">{formatDuration(effectiveDuration)}</p>
                              </div>
                              <label className="flex items-center gap-1.5 text-[10px] text-white/55">
                                <Checkbox checked={scene.isIncluded} disabled={locked || updateCutScene.isPending} onCheckedChange={value => void toggleIncluded(scene, value === true)} />
                                Include
                              </label>
                            </div>

                            <div className="mt-3 grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <Label className="text-[10px]">Trim in (seconds)</Label>
                                <Input
                                  type="number" min={0} step="0.1" value={draft.trimIn} disabled={locked}
                                  onChange={event => setClipDrafts(previous => ({ ...previous, [scene.id]: { ...draft, trimIn: event.target.value } }))}
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px]">Trim out (seconds)</Label>
                                <Input
                                  type="number" min={0} step="0.1" value={draft.trimOut} disabled={locked}
                                  onChange={event => setClipDrafts(previous => ({ ...previous, [scene.id]: { ...draft, trimOut: event.target.value } }))}
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px]">Transition</Label>
                                <Select
                                  value={draft.transitionType}
                                  disabled={locked}
                                  onValueChange={value => setClipDrafts(previous => ({ ...previous, [scene.id]: { ...draft, transitionType: value } }))}
                                >
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>{TRANSITIONS.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px]">Transition duration</Label>
                                <Input
                                  type="number" min={0} max={30} step="0.1" value={draft.transitionDuration} disabled={locked || draft.transitionType === "cut"}
                                  onChange={event => setClipDrafts(previous => ({ ...previous, [scene.id]: { ...draft, transitionDuration: event.target.value } }))}
                                />
                              </div>
                            </div>
                            <div className="mt-2 space-y-1">
                              <Label className="text-[10px]">Director note</Label>
                              <Textarea
                                rows={2} value={draft.directorNote} disabled={locked}
                                onChange={event => setClipDrafts(previous => ({ ...previous, [scene.id]: { ...draft, directorNote: event.target.value } }))}
                                placeholder="Edit, VFX, continuity, or handoff note"
                              />
                            </div>
                            {!locked && (
                              <div className="mt-2 flex justify-end">
                                <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => void saveClip(scene)} disabled={savingClipId !== null}>
                                  {savingClipId === scene.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                                  Save clip
                                </Button>
                              </div>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  </section>

                  <section className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
                    <div className="mb-4 flex items-center gap-2">
                      <Music className="h-4 w-4 text-amber-400" />
                      <div>
                        <h3 className="text-sm font-semibold text-white">Three-bus audio mix</h3>
                        <p className="text-[10px] text-white/45">Persistent project audio plan used for the final compile handoff.</p>
                      </div>
                    </div>
                    {audioLoading ? (
                      <Loader2 className="mx-auto h-5 w-5 animate-spin text-amber-400" />
                    ) : (
                      <div className="space-y-4">
                        {([
                          ["dialogueBus", "Dialogue", Volume2],
                          ["musicBus", "Music", Music],
                          ["effectsBus", "Effects", SlidersHorizontal],
                          ["masterVolume", "Master", Check],
                        ] as const).map(([key, label, Icon]) => (
                          <div key={key} className="grid grid-cols-[90px_1fr_45px] items-center gap-2">
                            <span className="flex items-center gap-1.5 text-xs text-white/65"><Icon className="h-3.5 w-3.5" />{label}</span>
                            <input
                              type="range" min={0} max={100} step={1} value={audioDraft[key]}
                              onChange={event => setAudioDraft(previous => ({ ...previous, [key]: Number(event.target.value) }))}
                              className="w-full accent-amber-400"
                            />
                            <span className="text-right font-mono text-xs text-amber-300">{audioDraft[key]}%</span>
                          </div>
                        ))}
                        <div className="space-y-1.5">
                          <Label>Mix status</Label>
                          <Select value={audioDraft.mixStatus} onValueChange={value => setAudioDraft(previous => ({ ...previous, mixStatus: value as AudioDraft["mixStatus"] }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="draft">Draft</SelectItem>
                              <SelectItem value="in-progress">In progress</SelectItem>
                              <SelectItem value="locked">Locked</SelectItem>
                              <SelectItem value="final">Final</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label>Audio pass notes</Label>
                          <Textarea rows={3} value={audioDraft.audioPassNotes} onChange={event => setAudioDraft(previous => ({ ...previous, audioPassNotes: event.target.value }))} placeholder="Dialogue cleanup, music ducking, Foley, ambience, loudness, delivery notes" />
                        </div>
                        <Button className="w-full gap-2 bg-amber-500 text-black hover:bg-amber-400" onClick={saveAudio} disabled={saveAudioPlan.isPending}>
                          {saveAudioPlan.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          Save audio plan
                        </Button>
                      </div>
                    )}
                  </section>
                </div>
              )}
            </div>

            <footer className="flex items-center justify-between border-t border-white/10 px-4 py-3 text-[10px] text-white/35">
              <span>Changes persist through existing Feature Film procedures.</span>
              <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => setOpen(false)}><ChevronLeft className="h-3.5 w-3.5" />Return to timeline</Button>
            </footer>
          </aside>
        </div>
      )}
    </>
  );
}
