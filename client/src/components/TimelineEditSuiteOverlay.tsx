import { useEffect, useMemo, useState, type DragEvent } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Download,
  Film,
  GripVertical,
  Loader2,
  Music,
  Save,
  Settings2,
  SlidersHorizontal,
  Volume2,
  X,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TIMELINE_PATH = /^\/projects\/(\d+)\/feature-timeline\/?$/;
const FRAME_RATE = 24;

const TRANSITIONS = [
  { value: "cut", label: "Cut" },
  { value: "dissolve", label: "Cross dissolve" },
  { value: "fade", label: "Fade" },
  { value: "dip-to-black", label: "Dip to black" },
  { value: "wipe", label: "Wipe" },
  { value: "j-cut", label: "J-cut" },
  { value: "l-cut", label: "L-cut" },
];

type CutScene = {
  id: number;
  cutId: number;
  sceneId: number;
  orderIndex: number;
  isIncluded: boolean;
  trimIn: number;
  trimOut: number;
  transitionType: string;
  transitionDuration: number;
  directorNote?: string;
  scene: {
    id: number;
    title?: string | null;
    description?: string | null;
    duration?: number | null;
    videoUrl?: string | null;
    thumbnailUrl?: string | null;
  } | null;
};

type AudioMix = {
  dialogueBus: number;
  musicBus: number;
  effectsBus: number;
  masterVolume: number;
  audioPassNotes: string;
  mixStatus: "draft" | "in-progress" | "locked" | "final";
};

function routeProjectId(): number | null {
  if (typeof window === "undefined") return null;
  const match = window.location.pathname.match(TIMELINE_PATH);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function formatTime(seconds: number): string {
  const safe = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const remainder = safe % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`
    : `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function secondsToTimecode(seconds: number, fps = FRAME_RATE): string {
  const totalFrames = Math.max(0, Math.round(seconds * fps));
  const frames = totalFrames % fps;
  const totalSeconds = Math.floor(totalFrames / fps);
  const secs = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}:${String(frames).padStart(2, "0")}`;
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function filename(value: string): string {
  return value.trim().replace(/[^a-zA-Z0-9-_]+/g, "_").replace(/^_+|_+$/g, "") || "virelle_cut";
}

function downloadText(name: string, type: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function buildEdl(projectTitle: string, cutName: string, clips: CutScene[]): string {
  const lines = [`TITLE: ${projectTitle} - ${cutName}`, "FCM: NON-DROP FRAME", ""];
  let timelineCursor = 0;
  clips.forEach((clip, index) => {
    const sourceDuration = Math.max(0, Number(clip.scene?.duration || 0));
    const trimIn = Math.max(0, Number(clip.trimIn || 0));
    const trimOut = Math.max(0, Number(clip.trimOut || 0));
    const duration = Math.max(0, sourceDuration - trimIn - trimOut);
    const sourceIn = trimIn;
    const sourceOut = trimIn + duration;
    const recordIn = timelineCursor;
    const recordOut = timelineCursor + duration;
    const reel = `SC${String(index + 1).padStart(3, "0")}`;
    lines.push(`${String(index + 1).padStart(3, "0")}  ${reel} V     C        ${secondsToTimecode(sourceIn)} ${secondsToTimecode(sourceOut)} ${secondsToTimecode(recordIn)} ${secondsToTimecode(recordOut)}`);
    lines.push(`* FROM CLIP NAME: ${clip.scene?.title || `Scene ${index + 1}`}`);
    if (clip.scene?.videoUrl) lines.push(`* SOURCE FILE: ${clip.scene.videoUrl}`);
    if (clip.transitionType && clip.transitionType !== "cut") lines.push(`* TRANSITION: ${clip.transitionType} ${clip.transitionDuration || 0}s`);
    if (clip.directorNote) lines.push(`* COMMENT: ${clip.directorNote.replace(/\r?\n/g, " ")}`);
    lines.push("");
    timelineCursor = recordOut;
  });
  return lines.join("\n");
}

function buildFcpxml(projectTitle: string, cutName: string, clips: CutScene[]): string {
  const assets = clips.map((clip, index) => {
    const durationFrames = Math.max(1, Math.round(Number(clip.scene?.duration || 1) * FRAME_RATE));
    const source = clip.scene?.videoUrl ? xmlEscape(clip.scene.videoUrl) : "file:///MISSING_MEDIA";
    return `<asset id="r${index + 2}" name="${xmlEscape(clip.scene?.title || `Scene ${index + 1}`)}" start="0s" duration="${durationFrames}/${FRAME_RATE}s" hasVideo="1" hasAudio="1"><media-rep kind="original-media" src="${source}"/></asset>`;
  }).join("");

  let cursorFrames = 0;
  const spine = clips.map((clip, index) => {
    const rawFrames = Math.max(1, Math.round(Number(clip.scene?.duration || 1) * FRAME_RATE));
    const trimInFrames = Math.max(0, Math.round(Number(clip.trimIn || 0) * FRAME_RATE));
    const trimOutFrames = Math.max(0, Math.round(Number(clip.trimOut || 0) * FRAME_RATE));
    const durationFrames = Math.max(1, rawFrames - trimInFrames - trimOutFrames);
    const offset = cursorFrames;
    cursorFrames += durationFrames;
    const transitionNote = clip.transitionType && clip.transitionType !== "cut"
      ? `<note>Transition: ${xmlEscape(clip.transitionType)} ${Number(clip.transitionDuration || 0).toFixed(2)}s</note>`
      : "";
    return `<asset-clip ref="r${index + 2}" name="${xmlEscape(clip.scene?.title || `Scene ${index + 1}`)}" offset="${offset}/${FRAME_RATE}s" start="${trimInFrames}/${FRAME_RATE}s" duration="${durationFrames}/${FRAME_RATE}s" tcFormat="NDF">${transitionNote}</asset-clip>`;
  }).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE fcpxml>\n<fcpxml version="1.10"><resources><format id="r1" name="FFVideoFormat1080p24" frameDuration="1/${FRAME_RATE}s" width="1920" height="1080"/>${assets}</resources><library><event name="${xmlEscape(projectTitle)}"><project name="${xmlEscape(cutName)}"><sequence format="r1" duration="${Math.max(1, cursorFrames)}/${FRAME_RATE}s" tcStart="0s" tcFormat="NDF"><spine>${spine}</spine></sequence></project></event></library></fcpxml>`;
}

export default function TimelineEditSuiteOverlay() {
  const [projectId, setProjectId] = useState<number | null>(() => routeProjectId());
  const [open, setOpen] = useState(false);
  const [selectedCutId, setSelectedCutId] = useState<number | null>(null);
  const [draggedClipId, setDraggedClipId] = useState<number | null>(null);
  const [localClips, setLocalClips] = useState<CutScene[]>([]);
  const [audioMix, setAudioMix] = useState<AudioMix>({
    dialogueBus: 0.9,
    musicBus: 0.25,
    effectsBus: 0.6,
    masterVolume: 1,
    audioPassNotes: "",
    mixStatus: "draft",
  });
  const utils = trpc.useUtils();

  useEffect(() => {
    const sync = () => {
      const next = routeProjectId();
      setProjectId(next);
      if (!next) setOpen(false);
    };
    sync();
    const interval = window.setInterval(sync, 750);
    window.addEventListener("popstate", sync);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("popstate", sync);
    };
  }, []);

  const projectQuery = trpc.project.get.useQuery({ id: projectId! }, { enabled: !!projectId && open });
  const summaryQuery = trpc.featureFilm.getFeatureFilmSummary.useQuery({ projectId: projectId! }, { enabled: !!projectId && open });
  const cuts = summaryQuery.data?.cuts || [];
  const effectiveCutId = selectedCutId || cuts.find((cut: any) => cut.isDefault)?.id || cuts[0]?.id || null;
  const cutQuery = trpc.featureFilm.getCut.useQuery({ cutId: effectiveCutId! }, { enabled: !!effectiveCutId && open });
  const audioQuery = trpc.featureFilm.getAudioPlan.useQuery({ projectId: projectId! }, { enabled: !!projectId && open });

  useEffect(() => {
    setLocalClips([...(cutQuery.data?.scenes || [])].sort((left: any, right: any) => left.orderIndex - right.orderIndex) as CutScene[]);
  }, [cutQuery.data?.scenes]);

  useEffect(() => {
    if (!audioQuery.data) return;
    setAudioMix({
      dialogueBus: Number(audioQuery.data.dialogueBus ?? 0.9),
      musicBus: Number(audioQuery.data.musicBus ?? 0.25),
      effectsBus: Number(audioQuery.data.effectsBus ?? 0.6),
      masterVolume: Number(audioQuery.data.masterVolume ?? 1),
      audioPassNotes: audioQuery.data.audioPassNotes || "",
      mixStatus: (audioQuery.data.mixStatus || "draft") as AudioMix["mixStatus"],
    });
  }, [audioQuery.data]);

  const updateClipMutation = trpc.featureFilm.updateCutScene.useMutation({
    onSuccess: async () => {
      if (effectiveCutId) await utils.featureFilm.getCut.invalidate({ cutId: effectiveCutId });
    },
    onError: error => toast.error(error.message),
  });
  const reorderMutation = trpc.featureFilm.reorderCutScenes.useMutation({
    onSuccess: async () => {
      if (effectiveCutId) await utils.featureFilm.getCut.invalidate({ cutId: effectiveCutId });
      toast.success("Timeline order saved");
    },
    onError: error => toast.error(error.message),
  });
  const saveAudioMutation = trpc.featureFilm.saveAudioPlan.useMutation({
    onSuccess: async () => {
      if (projectId) await utils.featureFilm.getAudioPlan.invalidate({ projectId });
      toast.success("Audio mix saved");
    },
    onError: error => toast.error(error.message),
  });

  if (!projectId) return null;

  const includedClips = localClips.filter(clip => clip.isIncluded);
  const totalDuration = includedClips.reduce((sum, clip) => sum + Math.max(0, Number(clip.scene?.duration || 0) - Number(clip.trimIn || 0) - Number(clip.trimOut || 0)), 0);
  const locked = !!cutQuery.data?.cut?.isLocked;

  const saveClipField = (clip: CutScene, changes: Partial<Pick<CutScene, "trimIn" | "trimOut" | "transitionType" | "transitionDuration" | "directorNote" | "isIncluded">>) => {
    const rawDuration = Math.max(0, Number(clip.scene?.duration || 0));
    const trimIn = changes.trimIn ?? clip.trimIn;
    const trimOut = changes.trimOut ?? clip.trimOut;
    if (trimIn < 0 || trimOut < 0 || trimIn + trimOut >= rawDuration) {
      toast.error("Trim values must leave at least one second of usable media.");
      return;
    }
    updateClipMutation.mutate({ cutSceneId: clip.id, ...changes });
  };

  const reorder = (sourceId: number, targetId: number) => {
    if (!effectiveCutId || sourceId === targetId || locked) return;
    const next = [...localClips];
    const sourceIndex = next.findIndex(clip => clip.id === sourceId);
    const targetIndex = next.findIndex(clip => clip.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, moved);
    setLocalClips(next);
    reorderMutation.mutate({ cutId: effectiveCutId, orderedCutSceneIds: next.map(clip => clip.id) });
  };

  const exportCut = (format: "edl" | "fcpxml") => {
    const usable = includedClips.filter(clip => !!clip.scene);
    if (usable.length === 0) {
      toast.error("The selected cut has no included scenes to export.");
      return;
    }
    const missingMedia = usable.filter(clip => !clip.scene?.videoUrl).length;
    if (missingMedia > 0) toast.warning(`${missingMedia} clip${missingMedia === 1 ? "" : "s"} have no video URL and will require relinking in the editor.`);
    const projectTitle = projectQuery.data?.title || "Virelle Project";
    const cutName = cutQuery.data?.cut?.name || "Cut";
    if (format === "edl") {
      downloadText(`${filename(projectTitle)}_${filename(cutName)}.edl`, "text/plain;charset=utf-8", buildEdl(projectTitle, cutName, usable));
    } else {
      downloadText(`${filename(projectTitle)}_${filename(cutName)}.fcpxml`, "application/xml;charset=utf-8", buildFcpxml(projectTitle, cutName, usable));
    }
    toast.success(`${format === "edl" ? "EDL" : "FCPXML"} exported`);
  };

  return (
    <>
      {!open && (
        <Button onClick={() => setOpen(true)} className="fixed bottom-5 right-5 z-[70] h-12 gap-2 rounded-full border border-amber-300/30 bg-[#15130d] px-5 text-amber-100 shadow-2xl shadow-black/50 hover:bg-[#211d10]">
          <SlidersHorizontal className="h-4 w-4 text-amber-300" /> Professional edit suite
        </Button>
      )}

      {open && (
        <div className="fixed inset-0 z-[120] flex flex-col bg-[#07070e] text-zinc-100">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#0b0b12] px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <Button size="icon" variant="ghost" onClick={() => setOpen(false)} aria-label="Close edit suite"><ArrowLeft className="h-5 w-5" /></Button>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 ring-1 ring-amber-300/20"><Film className="h-5 w-5 text-amber-300" /></div>
              <div className="min-w-0"><h2 className="truncate text-base font-semibold">{projectQuery.data?.title || "Project"} — Edit Suite</h2><p className="text-xs text-zinc-500">Persistent cuts, trims, transitions, mix and NLE handoff</p></div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={effectiveCutId ? String(effectiveCutId) : undefined} onValueChange={value => setSelectedCutId(Number(value))}>
                <SelectTrigger className="h-9 w-[220px] border-white/10 bg-black/20"><SelectValue placeholder="Select a cut" /></SelectTrigger>
                <SelectContent>{cuts.map((cut: any) => <SelectItem key={cut.id} value={String(cut.id)}>{cut.name} {cut.isDefault ? "(Default)" : ""}</SelectItem>)}</SelectContent>
              </Select>
              <Button size="sm" variant="outline" className="gap-2 border-white/10" onClick={() => exportCut("edl")} disabled={!effectiveCutId}><Download className="h-4 w-4" /> EDL</Button>
              <Button size="sm" variant="outline" className="gap-2 border-white/10" onClick={() => exportCut("fcpxml")} disabled={!effectiveCutId}><Download className="h-4 w-4" /> FCPXML</Button>
              <Button size="icon" variant="ghost" onClick={() => setOpen(false)} aria-label="Close edit suite"><X className="h-5 w-5" /></Button>
            </div>
          </header>

          {summaryQuery.isLoading || cutQuery.isLoading ? (
            <div className="flex flex-1 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-amber-300" /></div>
          ) : !effectiveCutId ? (
            <div className="flex flex-1 items-center justify-center p-6 text-center"><div><Settings2 className="mx-auto h-10 w-10 text-amber-300" /><h3 className="mt-4 font-semibold">Create a cut first</h3><p className="mt-2 text-sm text-zinc-500">Use the existing Feature Timeline page to create a versioned cut from your project scenes.</p></div></div>
          ) : (
            <Tabs defaultValue="timeline" className="flex min-h-0 flex-1 flex-col">
              <div className="border-b border-white/10 px-4"><TabsList className="h-11 bg-transparent"><TabsTrigger value="timeline">Timeline</TabsTrigger><TabsTrigger value="audio">Audio mix</TabsTrigger></TabsList></div>
              <TabsContent value="timeline" className="m-0 min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <Badge className="bg-amber-500/15 text-amber-200 hover:bg-amber-500/15">{includedClips.length} included clips</Badge>
                  <Badge variant="outline" className="border-white/10 text-zinc-400">{formatTime(totalDuration)} runtime</Badge>
                  {locked && <Badge variant="outline" className="border-red-400/20 text-red-300">Cut locked</Badge>}
                  <span className="text-xs text-zinc-600">Drag clips to reorder. All changes persist to the selected cut.</span>
                </div>
                <div className="space-y-3">
                  {localClips.map((clip, index) => {
                    const rawDuration = Math.max(0, Number(clip.scene?.duration || 0));
                    const usableDuration = Math.max(0, rawDuration - clip.trimIn - clip.trimOut);
                    return (
                      <article
                        key={clip.id}
                        draggable={!locked}
                        onDragStart={(event: DragEvent<HTMLElement>) => { setDraggedClipId(clip.id); event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", String(clip.id)); }}
                        onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }}
                        onDrop={event => { event.preventDefault(); if (draggedClipId) reorder(draggedClipId, clip.id); setDraggedClipId(null); }}
                        onDragEnd={() => setDraggedClipId(null)}
                        className={`rounded-xl border p-3 transition ${clip.isIncluded ? "border-white/10 bg-white/[0.025]" : "border-white/[0.05] bg-black/20 opacity-55"} ${draggedClipId === clip.id ? "scale-[0.99] border-amber-300/50" : ""}`}
                      >
                        <div className="grid gap-3 lg:grid-cols-[auto_120px_minmax(180px,1fr)_140px_180px_auto] lg:items-center">
                          <div className="flex items-center gap-2"><GripVertical className="h-4 w-4 cursor-grab text-white/25" /><span className="flex h-7 w-7 items-center justify-center rounded bg-black/30 text-[10px] font-semibold text-amber-300">{index + 1}</span></div>
                          <div className="aspect-video overflow-hidden rounded bg-black/40">{clip.scene?.thumbnailUrl ? <img src={clip.scene.thumbnailUrl} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><Film className="h-5 w-5 text-zinc-700" /></div>}</div>
                          <div className="min-w-0"><p className="truncate text-sm font-medium">{clip.scene?.title || `Scene ${clip.sceneId}`}</p><p className="mt-1 line-clamp-2 text-xs text-zinc-600">{clip.scene?.description || "No description"}</p><p className="mt-1 font-mono text-[10px] text-zinc-500">Source {formatTime(rawDuration)} · Used {formatTime(usableDuration)}</p></div>
                          <div className="grid grid-cols-2 gap-2"><div><Label className="text-[10px] text-zinc-500">Trim in</Label><Input type="number" min={0} max={Math.max(0, rawDuration - clip.trimOut - 1)} defaultValue={clip.trimIn} disabled={locked} className="h-8" onBlur={event => saveClipField(clip, { trimIn: Number(event.target.value) })} /></div><div><Label className="text-[10px] text-zinc-500">Trim out</Label><Input type="number" min={0} max={Math.max(0, rawDuration - clip.trimIn - 1)} defaultValue={clip.trimOut} disabled={locked} className="h-8" onBlur={event => saveClipField(clip, { trimOut: Number(event.target.value) })} /></div></div>
                          <div className="grid grid-cols-[1fr_72px] gap-2"><div><Label className="text-[10px] text-zinc-500">Transition</Label><Select value={clip.transitionType || "cut"} disabled={locked} onValueChange={value => saveClipField(clip, { transitionType: value })}><SelectTrigger className="h-8"><SelectValue /></SelectTrigger><SelectContent>{TRANSITIONS.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></div><div><Label className="text-[10px] text-zinc-500">Seconds</Label><Input type="number" min={0} max={10} step={0.1} defaultValue={clip.transitionDuration || 0} disabled={locked || clip.transitionType === "cut"} className="h-8" onBlur={event => saveClipField(clip, { transitionDuration: Number(event.target.value) })} /></div></div>
                          <Button size="sm" variant={clip.isIncluded ? "outline" : "default"} disabled={locked} className="h-8" onClick={() => saveClipField(clip, { isIncluded: !clip.isIncluded })}>{clip.isIncluded ? "Exclude" : "Include"}</Button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </TabsContent>

              <TabsContent value="audio" className="m-0 min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
                <div className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-white/[0.025] p-5">
                  <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15"><Music className="h-5 w-5 text-amber-300" /></div><div><h3 className="font-semibold">Project audio mix</h3><p className="text-xs text-zinc-500">Persistent dialogue, music, effects and master buses</p></div></div>
                  <div className="mt-6 space-y-6">
                    {([
                      ["Dialogue", "dialogueBus", audioMix.dialogueBus],
                      ["Music", "musicBus", audioMix.musicBus],
                      ["Effects", "effectsBus", audioMix.effectsBus],
                      ["Master", "masterVolume", audioMix.masterVolume],
                    ] as const).map(([label, key, value]) => (
                      <div key={key} className="grid gap-3 sm:grid-cols-[110px_1fr_70px] sm:items-center"><Label className="flex items-center gap-2"><Volume2 className="h-4 w-4 text-zinc-500" />{label}</Label><Slider min={0} max={1} step={0.01} value={[value]} onValueChange={values => setAudioMix(current => ({ ...current, [key]: values[0] }))} /><span className="rounded bg-black/30 px-2 py-1 text-center font-mono text-xs text-zinc-400">{Math.round(value * 100)}%</span></div>
                    ))}
                    <div className="grid gap-3 sm:grid-cols-2"><div><Label>Mix status</Label><Select value={audioMix.mixStatus} onValueChange={value => setAudioMix(current => ({ ...current, mixStatus: value as AudioMix["mixStatus"] }))}><SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="in-progress">In progress</SelectItem><SelectItem value="locked">Locked</SelectItem><SelectItem value="final">Final</SelectItem></SelectContent></Select></div></div>
                    <div><Label htmlFor="timeline-audio-notes">Audio pass notes</Label><Textarea id="timeline-audio-notes" value={audioMix.audioPassNotes} onChange={event => setAudioMix(current => ({ ...current, audioPassNotes: event.target.value }))} rows={5} className="mt-1.5" placeholder="Dialogue cleanup, music cues, ambience and mix notes" /></div>
                    <Button className="gap-2 bg-amber-500 text-black hover:bg-amber-400" disabled={saveAudioMutation.isPending} onClick={() => saveAudioMutation.mutate({ projectId, ...audioMix })}>{saveAudioMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save audio mix</Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>
      )}
    </>
  );
}
