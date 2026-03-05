import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  ArrowLeft, Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Scissors, Trash2, Copy, RotateCcw, ChevronLeft, ChevronRight,
  GripVertical, Film, Clock, Eye, EyeOff, Layers, AlertCircle,
  CheckCircle2, RefreshCw, Download, ZoomIn, ZoomOut, Maximize2,
  MessageSquare, Wand2, SplitSquareHorizontal, Merge, Flag,
  ChevronDown, ChevronUp, Settings2, Save, Loader2, Plus, X,
} from "lucide-react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useIsMobile } from "@/hooks/useMobile";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

// ─── Types ────────────────────────────────────────────────────────────────────

type SceneStatus = "draft" | "generating" | "completed" | "failed";

interface TimelineScene {
  id: number;
  orderIndex: number;
  title: string | null;
  description: string | null;
  duration: number;          // seconds
  thumbnailUrl: string | null;
  videoUrl: string | null;
  status: SceneStatus;
  transitionType: string;
  transitionDuration: number;
  retakeInstructions: string | null;
  retakeCount: number;
  // Timeline-local edit state (not yet saved)
  trimIn: number;            // seconds from start to cut in
  trimOut: number;           // seconds from end to cut out (positive = trim from end)
  isMuted: boolean;
  isDisabled: boolean;       // soft-delete from timeline without deleting from DB
  localNotes: string;
}

type PanelMode = "inspector" | "retake" | "transition";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function statusColor(status: SceneStatus) {
  switch (status) {
    case "completed": return "text-green-400 bg-green-500/10 border-green-500/30";
    case "generating": return "text-amber-400 bg-amber-500/10 border-amber-500/30";
    case "failed": return "text-red-400 bg-red-500/10 border-red-500/30";
    default: return "text-zinc-400 bg-zinc-500/10 border-zinc-500/30";
  }
}

const TRANSITION_OPTIONS = [
  { value: "cut", label: "Hard Cut" },
  { value: "fade", label: "Fade to Black" },
  { value: "dissolve", label: "Cross Dissolve" },
  { value: "wipe_left", label: "Wipe Left" },
  { value: "wipe_right", label: "Wipe Right" },
  { value: "push_left", label: "Push Left" },
  { value: "push_right", label: "Push Right" },
  { value: "zoom_in", label: "Zoom In" },
  { value: "zoom_out", label: "Zoom Out" },
  { value: "flash", label: "Flash White" },
  { value: "dip_black", label: "Dip to Black" },
  { value: "dip_white", label: "Dip to White" },
];

// ─── Timeline Clip Component ───────────────────────────────────────────────────

function TimelineClip({
  scene,
  index,
  isSelected,
  isPlaying,
  zoom,
  onSelect,
  onDragStart,
  onDragOver,
  onDrop,
  onToggleMute,
  onToggleDisable,
  onDelete,
  onDuplicate,
}: {
  scene: TimelineScene;
  index: number;
  isSelected: boolean;
  isPlaying: boolean;
  zoom: number;
  onSelect: () => void;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  onToggleMute: () => void;
  onToggleDisable: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const effectiveDuration = Math.max(1, scene.duration - scene.trimIn - scene.trimOut);
  const widthPx = Math.max(80, effectiveDuration * zoom);

  return (
    <div
      className={`relative flex-shrink-0 group cursor-pointer select-none transition-all
        ${scene.isDisabled ? "opacity-30" : "opacity-100"}
        ${isSelected ? "ring-2 ring-primary ring-offset-1 ring-offset-black" : "hover:ring-1 hover:ring-white/20"}
      `}
      style={{ width: `${widthPx}px` }}
      onClick={onSelect}
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, index)}
    >
      {/* Clip body */}
      <div className={`h-20 rounded-md overflow-hidden border ${isSelected ? "border-primary/60" : "border-white/10"} bg-zinc-900 relative`}>
        {/* Thumbnail */}
        {scene.thumbnailUrl ? (
          <img
            src={scene.thumbnailUrl}
            alt={scene.title || `Scene ${index + 1}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-zinc-800">
            <Film className="w-6 h-6 text-zinc-600" />
          </div>
        )}

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

        {/* Status indicator */}
        <div className="absolute top-1 right-1">
          {scene.status === "completed" && scene.videoUrl && (
            <div className="w-2 h-2 rounded-full bg-green-400" title="Video ready" />
          )}
          {scene.status === "generating" && (
            <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />
          )}
          {scene.status === "failed" && (
            <AlertCircle className="w-3 h-3 text-red-400" />
          )}
          {scene.status === "draft" && (
            <div className="w-2 h-2 rounded-full bg-zinc-500" title="Draft" />
          )}
        </div>

        {/* Retake badge */}
        {(scene.retakeCount || 0) > 0 && (
          <div className="absolute top-1 left-1">
            <span className="text-[9px] bg-amber-500/80 text-black px-1 rounded font-bold">
              R{scene.retakeCount}
            </span>
          </div>
        )}

        {/* Mute indicator */}
        {scene.isMuted && (
          <div className="absolute bottom-6 right-1">
            <VolumeX className="w-3 h-3 text-red-400" />
          </div>
        )}

        {/* Scene label */}
        <div className="absolute bottom-0 left-0 right-0 px-1.5 pb-1">
          <p className="text-[10px] font-medium text-white truncate leading-tight">
            {scene.title || `Scene ${index + 1}`}
          </p>
          <p className="text-[9px] text-white/50 font-mono">
            {formatTime(effectiveDuration)}
            {(scene.trimIn > 0 || scene.trimOut > 0) && (
              <span className="text-amber-400 ml-1">✂</span>
            )}
          </p>
        </div>

        {/* Trim handles */}
        {isSelected && (
          <>
            <div
              className="absolute left-0 top-0 bottom-0 w-2 bg-primary/60 cursor-col-resize hover:bg-primary rounded-l-md"
              title="Trim In"
            />
            <div
              className="absolute right-0 top-0 bottom-0 w-2 bg-primary/60 cursor-col-resize hover:bg-primary rounded-r-md"
              title="Trim Out"
            />
          </>
        )}

        {/* Drag handle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-60 transition-opacity">
          <GripVertical className="w-4 h-4 text-white" />
        </div>
      </div>

      {/* Quick action bar (visible on hover/select) */}
      <div className={`absolute -top-7 left-0 right-0 flex items-center justify-center gap-0.5 transition-opacity ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="h-5 w-5 rounded bg-zinc-800 border border-white/10 flex items-center justify-center hover:bg-zinc-700"
                onClick={(e) => { e.stopPropagation(); onToggleMute(); }}
              >
                {scene.isMuted ? <VolumeX className="w-2.5 h-2.5 text-red-400" /> : <Volume2 className="w-2.5 h-2.5 text-white/60" />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top"><p>{scene.isMuted ? "Unmute" : "Mute"}</p></TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="h-5 w-5 rounded bg-zinc-800 border border-white/10 flex items-center justify-center hover:bg-zinc-700"
                onClick={(e) => { e.stopPropagation(); onToggleDisable(); }}
              >
                {scene.isDisabled ? <Eye className="w-2.5 h-2.5 text-white/60" /> : <EyeOff className="w-2.5 h-2.5 text-white/60" />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top"><p>{scene.isDisabled ? "Enable" : "Disable (skip in playback)"}</p></TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="h-5 w-5 rounded bg-zinc-800 border border-white/10 flex items-center justify-center hover:bg-zinc-700"
                onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
              >
                <Copy className="w-2.5 h-2.5 text-white/60" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top"><p>Duplicate</p></TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="h-5 w-5 rounded bg-zinc-800 border border-white/10 flex items-center justify-center hover:bg-red-900/60"
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
              >
                <Trash2 className="w-2.5 h-2.5 text-red-400" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top"><p>Remove from timeline</p></TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Transition marker (after clip) */}
      <div className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center">
        <div className={`w-5 h-5 rounded-full border flex items-center justify-center text-[8px] font-bold
          ${scene.transitionType === "cut" ? "bg-zinc-800 border-zinc-600 text-zinc-400" : "bg-primary/20 border-primary/60 text-primary"}`}
          title={`Transition: ${scene.transitionType}`}
        >
          {scene.transitionType === "cut" ? "C" : scene.transitionType === "dissolve" ? "D" : scene.transitionType === "fade" ? "F" : "T"}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function DirectorCut() {
  const [, navigate] = useLocation();
  const params = useParams<{ projectId: string }>();
  const projectId = parseInt(params.projectId || "0");

  // Data
  const { data: project } = trpc.project.get.useQuery({ id: projectId }, { enabled: !!projectId });
  const { data: rawScenes, refetch: refetchScenes } = trpc.scene.listByProject.useQuery(
    { projectId },
    { enabled: !!projectId }
  );

  // Mutations
  const updateSceneMutation = trpc.scene.update.useMutation();
  const deleteSceneMutation = trpc.scene.delete.useMutation();
  const reorderMutation = trpc.scene.reorder.useMutation();
  const generatePreviewMutation = trpc.scene.generatePreview.useMutation({
    onSuccess: () => { refetchScenes(); toast.success("Preview regenerated"); },
    onError: (e) => toast.error(e.message),
  });

  // Timeline state
  const [scenes, setScenes] = useState<TimelineScene[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [zoom, setZoom] = useState(8); // px per second
  const [panelMode, setPanelMode] = useState<PanelMode>("inspector");
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [playheadTime, setPlayheadTime] = useState(0);
  const [currentPlayingIdx, setCurrentPlayingIdx] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Drag state
  const dragFromIdx = useRef<number | null>(null);

  // Mobile
  const isMobile = useIsMobile();
  const [mobileInspectorOpen, setMobileInspectorOpen] = useState(false);

  // Retake dialog
  const [retakeDialogOpen, setRetakeDialogOpen] = useState(false);
  const [retakeText, setRetakeText] = useState("");

  // Delete confirm dialog
  const [deleteConfirmIdx, setDeleteConfirmIdx] = useState<number | null>(null);

  // ── Initialise timeline from raw scenes ──────────────────────────────────────
  useEffect(() => {
    if (!rawScenes) return;
    setScenes(
      [...rawScenes]
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((s) => ({
          id: s.id,
          orderIndex: s.orderIndex,
          title: s.title,
          description: s.description,
          duration: s.duration || 30,
          thumbnailUrl: s.thumbnailUrl,
          videoUrl: (s as any).videoUrl || null,
          status: s.status as SceneStatus,
          transitionType: s.transitionType || "cut",
          transitionDuration: s.transitionDuration || 0.5,
          retakeInstructions: (s as any).retakeInstructions || null,
          retakeCount: (s as any).retakeCount || 0,
          trimIn: 0,
          trimOut: 0,
          isMuted: false,
          isDisabled: false,
          localNotes: "",
        }))
    );
  }, [rawScenes]);

  // ── Computed values ───────────────────────────────────────────────────────────
  const activeScenes = scenes.filter((s) => !s.isDisabled);
  const totalDuration = activeScenes.reduce(
    (acc, s) => acc + Math.max(1, s.duration - s.trimIn - s.trimOut),
    0
  );
  const selectedScene = selectedIdx !== null ? scenes[selectedIdx] : null;

  // ── Playback ──────────────────────────────────────────────────────────────────
  const stopPlayback = useCallback(() => {
    setIsPlaying(false);
    setCurrentPlayingIdx(null);
    if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    if (videoRef.current) videoRef.current.pause();
  }, []);

  const startPlayback = useCallback(() => {
    if (activeScenes.length === 0) return;
    setIsPlaying(true);
    let elapsed = 0;
    let sceneIdx = 0;

    // Find the scene at playhead
    for (let i = 0; i < activeScenes.length; i++) {
      const dur = Math.max(1, activeScenes[i].duration - activeScenes[i].trimIn - activeScenes[i].trimOut);
      if (elapsed + dur > playheadTime) {
        sceneIdx = i;
        break;
      }
      elapsed += dur;
    }

    setCurrentPlayingIdx(sceneIdx);

    // Load video if available
    const scene = activeScenes[sceneIdx];
    if (scene.videoUrl && videoRef.current) {
      videoRef.current.src = scene.videoUrl;
      videoRef.current.currentTime = scene.trimIn + (playheadTime - elapsed);
      videoRef.current.play().catch(() => {});
    }

    playIntervalRef.current = setInterval(() => {
      setPlayheadTime((prev) => {
        const next = prev + 0.1;
        if (next >= totalDuration) {
          stopPlayback();
          return 0;
        }
        return next;
      });
    }, 100);
  }, [activeScenes, playheadTime, totalDuration, stopPlayback]);

  useEffect(() => {
    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, []);

  // ── Drag & Drop reorder ───────────────────────────────────────────────────────
  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    dragFromIdx.current = index;
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    const fromIndex = dragFromIdx.current;
    if (fromIndex === null || fromIndex === toIndex) return;
    setScenes((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next.map((s, i) => ({ ...s, orderIndex: i }));
    });
    setSelectedIdx(toIndex);
    setHasUnsavedChanges(true);
    dragFromIdx.current = null;
  }, []);

  // ── Scene operations ──────────────────────────────────────────────────────────
  const updateScene = useCallback((idx: number, patch: Partial<TimelineScene>) => {
    setScenes((prev) => prev.map((s, i) => i === idx ? { ...s, ...patch } : s));
    setHasUnsavedChanges(true);
  }, []);

  const duplicateScene = useCallback((idx: number) => {
    setScenes((prev) => {
      const copy = { ...prev[idx], id: -Date.now(), orderIndex: idx + 1 };
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next.map((s, i) => ({ ...s, orderIndex: i }));
    });
    setSelectedIdx(idx + 1);
    setHasUnsavedChanges(true);
    toast.success("Scene duplicated in timeline");
  }, []);

  const removeFromTimeline = useCallback((idx: number) => {
    setScenes((prev) => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, orderIndex: i })));
    setSelectedIdx(null);
    setDeleteConfirmIdx(null);
    setHasUnsavedChanges(true);
  }, []);

  // ── Save changes ──────────────────────────────────────────────────────────────
  const saveChanges = useCallback(async () => {
    setIsSaving(true);
    try {
      // Save order
      await reorderMutation.mutateAsync({
        projectId,
        sceneIds: scenes.filter(s => s.id > 0).map(s => s.id),
      });

      // Save per-scene changes (transition, retake instructions)
      for (const scene of scenes) {
        if (scene.id < 0) continue; // skip duplicates (not yet in DB)
        await updateSceneMutation.mutateAsync({
          id: scene.id,
          transitionType: scene.transitionType,
          transitionDuration: scene.transitionDuration,
          retakeInstructions: scene.retakeInstructions || undefined,
          retakeCount: scene.retakeCount,
          productionNotes: scene.localNotes || undefined,
        });
      }

      setHasUnsavedChanges(false);
      toast.success("Timeline saved");
    } catch (e: any) {
      toast.error("Save failed: " + e.message);
    } finally {
      setIsSaving(false);
    }
  }, [scenes, projectId, reorderMutation, updateSceneMutation]);

  // ── Submit retake ─────────────────────────────────────────────────────────────
  const submitRetake = useCallback(async () => {
    if (selectedIdx === null) return;
    const scene = scenes[selectedIdx];
    if (!retakeText.trim()) { toast.error("Please describe what needs to change"); return; }
    try {
      await updateSceneMutation.mutateAsync({
        id: scene.id,
        retakeInstructions: retakeText.trim(),
        retakeCount: (scene.retakeCount || 0) + 1,
        status: "draft",
      });
      updateScene(selectedIdx, {
        retakeInstructions: retakeText.trim(),
        retakeCount: (scene.retakeCount || 0) + 1,
        status: "draft",
      });
      setRetakeDialogOpen(false);
      setRetakeText("");
      toast.success("Retake instructions saved — re-generate the scene to apply");
    } catch (e: any) {
      toast.error(e.message);
    }
  }, [selectedIdx, scenes, retakeText, updateSceneMutation, updateScene]);

  // ── Playhead position on timeline ─────────────────────────────────────────────
  const timelineRef = useRef<HTMLDivElement>(null);
  const handleTimelineClick = useCallback((e: React.MouseEvent) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + timelineRef.current.scrollLeft;
    const time = x / zoom;
    setPlayheadTime(Math.max(0, Math.min(time, totalDuration)));
  }, [zoom, totalDuration]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === "Space") { e.preventDefault(); isPlaying ? stopPlayback() : startPlayback(); }
      if (e.code === "ArrowLeft" && selectedIdx !== null && selectedIdx > 0) setSelectedIdx(selectedIdx - 1);
      if (e.code === "ArrowRight" && selectedIdx !== null && selectedIdx < scenes.length - 1) setSelectedIdx(selectedIdx + 1);
      if ((e.code === "Delete" || e.code === "Backspace") && selectedIdx !== null) setDeleteConfirmIdx(selectedIdx);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isPlaying, startPlayback, stopPlayback, selectedIdx, scenes.length]);

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* ── Top Bar ── */}
      <div className="flex items-center justify-between px-2 md:px-4 py-2 md:py-2.5 border-b border-white/10 bg-zinc-950/80 backdrop-blur shrink-0">
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => navigate(`/projects/${projectId}`)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-xs md:text-sm font-semibold text-white flex items-center gap-1.5 md:gap-2">
              <Scissors className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary shrink-0" />
              <span className="truncate">Director's Cut</span>
              {hasUnsavedChanges && <span className="text-[10px] text-amber-400 font-normal shrink-0">●</span>}
            </h1>
            <p className="text-[11px] text-zinc-500 truncate">{project?.title || "Loading..."}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
          <span className="text-[10px] md:text-xs text-zinc-500 font-mono hidden sm:inline">{scenes.filter(s => !s.isDisabled).length} scenes · {formatTime(totalDuration)}</span>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1.5 hidden md:flex"
            onClick={() => navigate(`/projects/${projectId}/scenes`)}
          >
            <Film className="w-3 h-3" />
            Scene Editor
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1.5 hidden md:flex"
            onClick={() => navigate(`/projects/${projectId}/nle-export`)}
          >
            <Download className="w-3 h-3" />
            NLE Export
          </Button>
          <Button
            size="sm"
            className="h-7 text-xs gap-1.5 bg-primary hover:bg-primary/90"
            onClick={saveChanges}
            disabled={isSaving || !hasUnsavedChanges}
          >
            {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            {isSaving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      {/* ── Main Layout ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left: Preview + Timeline ── */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">

          {/* Preview Monitor */}
          <div className="bg-black border-b border-white/10 flex items-center justify-center" style={{ height: isMobile ? "160px" : "240px" }}>
            {selectedScene?.videoUrl ? (
              <video
                ref={videoRef}
                src={selectedScene.videoUrl}
                className="h-full w-auto max-w-full object-contain"
                controls={false}
                loop={false}
              />
            ) : selectedScene?.thumbnailUrl ? (
              <img
                src={selectedScene.thumbnailUrl}
                alt="Scene preview"
                className="h-full w-auto max-w-full object-contain"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-zinc-600">
                <Film className="w-12 h-12" />
                <p className="text-sm">{scenes.length === 0 ? "No scenes yet" : selectedScene ? "No preview available" : "Select a scene to preview"}</p>
              </div>
            )}
          </div>

          {/* Playback Controls */}
          <div className="flex items-center justify-between px-2 md:px-4 py-1.5 md:py-2 bg-zinc-950 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-0.5 md:gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPlayheadTime(0)}>
                <SkipBack className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 bg-white/5 hover:bg-white/10"
                onClick={() => isPlaying ? stopPlayback() : startPlayback()}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPlayheadTime(totalDuration)}>
                <SkipForward className="w-3.5 h-3.5" />
              </Button>
              <span className="text-[10px] md:text-xs font-mono text-zinc-400 ml-1 md:ml-2">
                {formatTime(playheadTime)} / {formatTime(totalDuration)}
              </span>
            </div>
            <div className="flex items-center gap-1 md:gap-2">
              {isMobile && selectedScene && (
                <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1 px-2" onClick={() => setMobileInspectorOpen(true)}>
                  <Layers className="w-3 h-3" /> Edit
                </Button>
              )}
              <span className="text-[10px] text-zinc-600 hidden sm:inline">Zoom</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setZoom(z => Math.max(3, z - 2))}>
                <ZoomOut className="w-3 h-3" />
              </Button>
              <span className="text-[10px] text-zinc-500 w-6 text-center">{zoom}x</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setZoom(z => Math.min(30, z + 2))}>
                <ZoomIn className="w-3 h-3" />
              </Button>
            </div>
          </div>

          {/* Timeline */}
          <div className="flex-1 overflow-hidden flex flex-col bg-zinc-950">
            {/* Timecode ruler */}
            <div
              className="h-6 border-b border-white/10 bg-zinc-900 relative overflow-hidden shrink-0 cursor-pointer"
              onClick={handleTimelineClick}
            >
              <div className="flex items-end h-full pl-4" style={{ gap: 0 }}>
                {Array.from({ length: Math.ceil(totalDuration / 5) + 1 }).map((_, i) => (
                  <div
                    key={i}
                    className="absolute bottom-0 flex flex-col items-center"
                    style={{ left: `${i * 5 * zoom + 16}px` }}
                  >
                    <span className="text-[9px] text-zinc-600 font-mono">{formatTime(i * 5)}</span>
                    <div className="w-px h-2 bg-zinc-700" />
                  </div>
                ))}
                {/* Playhead */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-primary z-10 pointer-events-none"
                  style={{ left: `${playheadTime * zoom + 16}px` }}
                >
                  <div className="w-2 h-2 bg-primary rounded-full -translate-x-[3px]" />
                </div>
              </div>
            </div>

            {/* Clips track */}
            <ScrollArea className="flex-1">
              <div
                ref={timelineRef}
                className="flex items-center gap-6 px-4 py-6 min-h-[140px] relative"
                style={{ minWidth: `${totalDuration * zoom + 100}px` }}
                onClick={handleTimelineClick}
              >
                {/* Playhead line */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-primary/60 z-20 pointer-events-none"
                  style={{ left: `${playheadTime * zoom + 16}px` }}
                />

                {scenes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center w-full gap-2 text-zinc-600 py-8">
                    <Film className="w-10 h-10" />
                    <p className="text-sm">No scenes in timeline</p>
                    <Button size="sm" variant="outline" className="text-xs" onClick={() => navigate(`/projects/${projectId}/scenes`)}>
                      <Plus className="w-3 h-3 mr-1" /> Add Scenes
                    </Button>
                  </div>
                ) : (
                  scenes.map((scene, idx) => (
                    <TimelineClip
                      key={scene.id}
                      scene={scene}
                      index={idx}
                      isSelected={selectedIdx === idx}
                      isPlaying={isPlaying && currentPlayingIdx === idx}
                      zoom={zoom}
                      onSelect={() => { setSelectedIdx(idx); setPanelMode("inspector"); }}
                      onDragStart={handleDragStart}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      onToggleMute={() => updateScene(idx, { isMuted: !scene.isMuted })}
                      onToggleDisable={() => updateScene(idx, { isDisabled: !scene.isDisabled })}
                      onDelete={() => setDeleteConfirmIdx(idx)}
                      onDuplicate={() => duplicateScene(idx)}
                    />
                  ))
                )}
              </div>
            </ScrollArea>

            {/* Timeline footer: keyboard shortcuts hint */}
            {!isMobile && (
              <div className="px-4 py-1.5 border-t border-white/5 bg-zinc-950 flex items-center gap-4 shrink-0">
                <span className="text-[10px] text-zinc-600">
                  <kbd className="bg-zinc-800 px-1 rounded text-zinc-400">Space</kbd> Play/Pause ·
                  <kbd className="bg-zinc-800 px-1 rounded text-zinc-400 ml-1">←→</kbd> Select scene ·
                  <kbd className="bg-zinc-800 px-1 rounded text-zinc-400 ml-1">Del</kbd> Remove ·
                  Drag clips to reorder
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Inspector Panel (desktop only) ── */}
        {!isMobile && (
        <div className="w-80 border-l border-white/10 bg-zinc-950 flex flex-col shrink-0">
          {/* Panel tabs */}
          <div className="flex border-b border-white/10 shrink-0">
            {(["inspector", "retake", "transition"] as PanelMode[]).map((mode) => (
              <button
                key={mode}
                className={`flex-1 py-2.5 text-xs font-medium capitalize transition-colors
                  ${panelMode === mode ? "text-white border-b-2 border-primary bg-white/5" : "text-zinc-500 hover:text-zinc-300"}`}
                onClick={() => setPanelMode(mode)}
              >
                {mode === "inspector" ? "Inspector" : mode === "retake" ? "Retake" : "Transition"}
              </button>
            ))}
          </div>

          <ScrollArea className="flex-1">
            {selectedScene === null ? (
              <div className="flex flex-col items-center justify-center h-48 gap-2 text-zinc-600 px-4">
                <Layers className="w-8 h-8" />
                <p className="text-sm text-center">Select a scene in the timeline to inspect and edit it</p>
              </div>
            ) : (
              <div className="p-4 space-y-4">

                {/* ── Inspector Panel ── */}
                {panelMode === "inspector" && (
                  <>
                    <div>
                      <p className="text-xs font-semibold text-zinc-300 mb-1">Scene {(selectedIdx ?? 0) + 1}</p>
                      <p className="text-sm font-medium text-white">{selectedScene.title || "Untitled Scene"}</p>
                      {selectedScene.description && (
                        <p className="text-xs text-zinc-500 mt-1 line-clamp-3">{selectedScene.description}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-zinc-900 rounded p-2">
                        <p className="text-zinc-500 mb-0.5">Duration</p>
                        <p className="font-mono text-white">{formatTime(selectedScene.duration)}</p>
                      </div>
                      <div className="bg-zinc-900 rounded p-2">
                        <p className="text-zinc-500 mb-0.5">Effective</p>
                        <p className="font-mono text-white">{formatTime(Math.max(1, selectedScene.duration - selectedScene.trimIn - selectedScene.trimOut))}</p>
                      </div>
                      <div className={`rounded p-2 border ${statusColor(selectedScene.status)}`}>
                        <p className="mb-0.5 opacity-70">Status</p>
                        <p className="font-medium capitalize">{selectedScene.status}</p>
                      </div>
                      <div className="bg-zinc-900 rounded p-2">
                        <p className="text-zinc-500 mb-0.5">Retakes</p>
                        <p className="font-mono text-white">{selectedScene.retakeCount}</p>
                      </div>
                    </div>

                    <Separator className="bg-white/10" />

                    {/* Trim controls */}
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                        <Scissors className="w-3 h-3" /> Trim
                      </p>
                      <div>
                        <div className="flex justify-between mb-1">
                          <Label className="text-[11px] text-zinc-500">Trim In (from start)</Label>
                          <span className="text-[11px] font-mono text-zinc-400">{formatTime(selectedScene.trimIn)}</span>
                        </div>
                        <Slider
                          value={[selectedScene.trimIn]}
                          min={0}
                          max={Math.max(0, selectedScene.duration - selectedScene.trimOut - 1)}
                          step={0.5}
                          onValueChange={([v]) => updateScene(selectedIdx!, { trimIn: v })}
                          className="w-full"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <Label className="text-[11px] text-zinc-500">Trim Out (from end)</Label>
                          <span className="text-[11px] font-mono text-zinc-400">{formatTime(selectedScene.trimOut)}</span>
                        </div>
                        <Slider
                          value={[selectedScene.trimOut]}
                          min={0}
                          max={Math.max(0, selectedScene.duration - selectedScene.trimIn - 1)}
                          step={0.5}
                          onValueChange={([v]) => updateScene(selectedIdx!, { trimOut: v })}
                          className="w-full"
                        />
                      </div>
                      {(selectedScene.trimIn > 0 || selectedScene.trimOut > 0) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 text-xs text-zinc-500 hover:text-white"
                          onClick={() => updateScene(selectedIdx!, { trimIn: 0, trimOut: 0 })}
                        >
                          <RotateCcw className="w-3 h-3 mr-1" /> Reset trim
                        </Button>
                      )}
                    </div>

                    <Separator className="bg-white/10" />

                    {/* Director notes */}
                    <div>
                      <Label className="text-[11px] text-zinc-500 mb-1.5 block">Director Notes</Label>
                      <Textarea
                        value={selectedScene.localNotes}
                        onChange={(e) => updateScene(selectedIdx!, { localNotes: e.target.value })}
                        placeholder="Add notes for this scene..."
                        className="text-xs min-h-[80px] bg-zinc-900 border-zinc-700 resize-none"
                      />
                    </div>

                    <Separator className="bg-white/10" />

                    {/* Actions */}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-zinc-300">Actions</p>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs gap-1.5"
                          onClick={() => {
                            generatePreviewMutation.mutate({ sceneId: selectedScene.id });
                          }}
                          disabled={generatePreviewMutation.isPending}
                        >
                          {generatePreviewMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                          Regen Preview
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs gap-1.5"
                          onClick={() => navigate(`/projects/${projectId}/scenes`)}
                        >
                          <Settings2 className="w-3 h-3" />
                          Edit Scene
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs gap-1.5"
                          onClick={() => duplicateScene(selectedIdx!)}
                        >
                          <Copy className="w-3 h-3" />
                          Duplicate
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs gap-1.5 text-red-400 hover:text-red-300 border-red-500/20 hover:border-red-500/40"
                          onClick={() => setDeleteConfirmIdx(selectedIdx!)}
                        >
                          <Trash2 className="w-3 h-3" />
                          Remove
                        </Button>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full h-8 text-xs gap-1.5 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                        onClick={() => { setPanelMode("retake"); setRetakeText(selectedScene.retakeInstructions || ""); }}
                      >
                        <Flag className="w-3 h-3" />
                        Request Retake
                      </Button>
                    </div>
                  </>
                )}

                {/* ── Retake Panel ── */}
                {panelMode === "retake" && (
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-semibold text-white mb-1 flex items-center gap-1.5">
                        <Flag className="w-3 h-3 text-amber-400" /> Request Retake
                      </p>
                      <p className="text-[11px] text-zinc-500">
                        Describe what needs to change in this scene. The AI will use these instructions when you re-generate it.
                      </p>
                    </div>

                    {selectedScene.retakeCount > 0 && (
                      <div className="bg-amber-500/10 border border-amber-500/20 rounded p-2">
                        <p className="text-[11px] text-amber-400 font-medium">Retake #{selectedScene.retakeCount} requested</p>
                        {selectedScene.retakeInstructions && (
                          <p className="text-[11px] text-zinc-400 mt-1 italic">"{selectedScene.retakeInstructions}"</p>
                        )}
                      </div>
                    )}

                    <div>
                      <Label className="text-[11px] text-zinc-500 mb-1.5 block">What needs to change?</Label>
                      <Textarea
                        value={retakeText}
                        onChange={(e) => setRetakeText(e.target.value)}
                        placeholder="e.g. The lighting is too dark — make it golden hour. The character should be running, not walking. Add more crowd in the background..."
                        className="text-xs min-h-[120px] bg-zinc-900 border-zinc-700 resize-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <Button
                        className="w-full h-8 text-xs gap-1.5 bg-amber-600 hover:bg-amber-500 text-black font-semibold"
                        onClick={submitRetake}
                        disabled={updateSceneMutation.isPending}
                      >
                        {updateSceneMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Flag className="w-3 h-3" />}
                        Save Retake Instructions
                      </Button>
                      <Button
                        className="w-full h-8 text-xs gap-1.5"
                        variant="outline"
                        onClick={() => {
                          submitRetake().then(() => {
                            generatePreviewMutation.mutate({ sceneId: selectedScene.id });
                          });
                        }}
                        disabled={updateSceneMutation.isPending || generatePreviewMutation.isPending}
                      >
                        <Wand2 className="w-3 h-3" />
                        Save & Re-generate Now
                      </Button>
                    </div>

                    <Separator className="bg-white/10" />
                    <div>
                      <p className="text-[11px] text-zinc-500 font-medium mb-2">Retake History</p>
                      {selectedScene.retakeCount === 0 ? (
                        <p className="text-[11px] text-zinc-600">No retakes yet</p>
                      ) : (
                        <div className="space-y-1">
                          {Array.from({ length: selectedScene.retakeCount }).map((_, i) => (
                            <div key={i} className="flex items-center gap-2 text-[11px] text-zinc-500">
                              <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />
                              Retake #{i + 1} submitted
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Transition Panel ── */}
                {panelMode === "transition" && (
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-semibold text-white mb-1 flex items-center gap-1.5">
                        <SplitSquareHorizontal className="w-3 h-3 text-primary" /> Transition After Scene
                      </p>
                      <p className="text-[11px] text-zinc-500">
                        Set the transition between this scene and the next one.
                      </p>
                    </div>

                    <div>
                      <Label className="text-[11px] text-zinc-500 mb-1.5 block">Transition Type</Label>
                      <Select
                        value={selectedScene.transitionType}
                        onValueChange={(v) => updateScene(selectedIdx!, { transitionType: v })}
                      >
                        <SelectTrigger className="h-8 text-xs bg-zinc-900 border-zinc-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TRANSITION_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value} className="text-xs">
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <div className="flex justify-between mb-1.5">
                        <Label className="text-[11px] text-zinc-500">Duration</Label>
                        <span className="text-[11px] font-mono text-zinc-400">{selectedScene.transitionDuration.toFixed(1)}s</span>
                      </div>
                      <Slider
                        value={[selectedScene.transitionDuration]}
                        min={0.1}
                        max={3.0}
                        step={0.1}
                        onValueChange={([v]) => updateScene(selectedIdx!, { transitionDuration: v })}
                        disabled={selectedScene.transitionType === "cut"}
                        className="w-full"
                      />
                    </div>

                    {/* Apply to all */}
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full h-8 text-xs gap-1.5"
                      onClick={() => {
                        setScenes((prev) => prev.map((s) => ({
                          ...s,
                          transitionType: selectedScene.transitionType,
                          transitionDuration: selectedScene.transitionDuration,
                        })));
                        setHasUnsavedChanges(true);
                        toast.success("Transition applied to all scenes");
                      }}
                    >
                      <Merge className="w-3 h-3" />
                      Apply to All Scenes
                    </Button>

                    <Separator className="bg-white/10" />

                    {/* Transition preview grid */}
                    <div>
                      <p className="text-[11px] text-zinc-500 font-medium mb-2">Quick Select</p>
                      <div className="grid grid-cols-3 gap-1.5">
                        {TRANSITION_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            className={`p-2 rounded text-[10px] text-center border transition-all
                              ${selectedScene.transitionType === opt.value
                                ? "bg-primary/20 border-primary/60 text-primary"
                                : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500"}`}
                            onClick={() => updateScene(selectedIdx!, { transitionType: opt.value })}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Panel footer: scene counter */}
          {selectedScene && (
            <div className="px-4 py-2 border-t border-white/10 flex items-center justify-between shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                disabled={selectedIdx === 0}
                onClick={() => setSelectedIdx((i) => Math.max(0, (i ?? 0) - 1))}
              >
                <ChevronLeft className="w-3 h-3" />
              </Button>
              <span className="text-[11px] text-zinc-500">
                Scene {(selectedIdx ?? 0) + 1} of {scenes.length}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                disabled={selectedIdx === scenes.length - 1}
                onClick={() => setSelectedIdx((i) => Math.min(scenes.length - 1, (i ?? 0) + 1))}
              >
                <ChevronRight className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>
        )}
      </div>

      {/* ── Mobile Inspector Sheet ── */}
      {isMobile && (
        <Sheet open={mobileInspectorOpen} onOpenChange={setMobileInspectorOpen}>
          <SheetContent side="bottom" className="h-[70vh] bg-zinc-950 border-white/10 p-0">
            <SheetHeader className="px-4 py-3 border-b border-white/10">
              <SheetTitle className="text-sm text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                {selectedScene?.title || "Scene Inspector"}
              </SheetTitle>
            </SheetHeader>
            <div className="flex border-b border-white/10 shrink-0">
              {(["inspector", "retake", "transition"] as PanelMode[]).map((mode) => (
                <button
                  key={mode}
                  className={`flex-1 py-2.5 text-xs font-medium capitalize transition-colors
                    ${panelMode === mode ? "text-white border-b-2 border-primary bg-white/5" : "text-zinc-500 hover:text-zinc-300"}`}
                  onClick={() => setPanelMode(mode)}
                >
                  {mode === "inspector" ? "Inspector" : mode === "retake" ? "Retake" : "Transition"}
                </button>
              ))}
            </div>
            <ScrollArea className="flex-1 h-[calc(70vh-100px)]">
              {selectedScene && (
                <div className="p-4 space-y-4">
                  {panelMode === "inspector" && (
                    <>
                      <div>
                        <p className="text-xs font-semibold text-zinc-300 mb-1">Scene {(selectedIdx ?? 0) + 1}</p>
                        <p className="text-sm font-medium text-white">{selectedScene.title || "Untitled Scene"}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-zinc-900 rounded p-2">
                          <p className="text-zinc-500 mb-0.5">Duration</p>
                          <p className="font-mono text-white">{formatTime(selectedScene.duration)}</p>
                        </div>
                        <div className="bg-zinc-900 rounded p-2">
                          <p className="text-zinc-500 mb-0.5">Effective</p>
                          <p className="font-mono text-white">{formatTime(Math.max(1, selectedScene.duration - selectedScene.trimIn - selectedScene.trimOut))}</p>
                        </div>
                      </div>
                      <Separator className="bg-white/10" />
                      <div className="space-y-3">
                        <p className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5"><Scissors className="w-3 h-3" /> Trim</p>
                        <div>
                          <div className="flex justify-between mb-1">
                            <Label className="text-[11px] text-zinc-500">Trim In</Label>
                            <span className="text-[11px] font-mono text-zinc-400">{formatTime(selectedScene.trimIn)}</span>
                          </div>
                          <Slider value={[selectedScene.trimIn]} min={0} max={Math.max(0, selectedScene.duration - selectedScene.trimOut - 1)} step={0.5} onValueChange={([v]) => updateScene(selectedIdx!, { trimIn: v })} className="w-full" />
                        </div>
                        <div>
                          <div className="flex justify-between mb-1">
                            <Label className="text-[11px] text-zinc-500">Trim Out</Label>
                            <span className="text-[11px] font-mono text-zinc-400">{formatTime(selectedScene.trimOut)}</span>
                          </div>
                          <Slider value={[selectedScene.trimOut]} min={0} max={Math.max(0, selectedScene.duration - selectedScene.trimIn - 1)} step={0.5} onValueChange={([v]) => updateScene(selectedIdx!, { trimOut: v })} className="w-full" />
                        </div>
                      </div>
                      <Separator className="bg-white/10" />
                      <div>
                        <Label className="text-[11px] text-zinc-500 mb-1.5 block">Director Notes</Label>
                        <Textarea value={selectedScene.localNotes} onChange={(e) => updateScene(selectedIdx!, { localNotes: e.target.value })} placeholder="Add notes..." className="text-xs min-h-[60px] bg-zinc-900 border-zinc-700 resize-none" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => generatePreviewMutation.mutate({ sceneId: selectedScene.id })} disabled={generatePreviewMutation.isPending}>
                          <Wand2 className="w-3 h-3" /> Regen
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => navigate(`/projects/${projectId}/scenes`)}>
                          <Settings2 className="w-3 h-3" /> Edit
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => duplicateScene(selectedIdx!)}>
                          <Copy className="w-3 h-3" /> Duplicate
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 text-red-400 border-red-500/20" onClick={() => setDeleteConfirmIdx(selectedIdx!)}>
                          <Trash2 className="w-3 h-3" /> Remove
                        </Button>
                      </div>
                    </>
                  )}
                  {panelMode === "retake" && (
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-white flex items-center gap-1.5"><Flag className="w-3 h-3 text-amber-400" /> Request Retake</p>
                      <Textarea value={retakeText} onChange={(e) => setRetakeText(e.target.value)} placeholder="Describe what needs to change..." className="text-xs min-h-[100px] bg-zinc-900 border-zinc-700 resize-none" />
                      <Button className="w-full h-8 text-xs gap-1.5 bg-amber-600 hover:bg-amber-500 text-black font-semibold" onClick={submitRetake} disabled={updateSceneMutation.isPending}>
                        <Flag className="w-3 h-3" /> Save Retake
                      </Button>
                    </div>
                  )}
                  {panelMode === "transition" && (
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-white flex items-center gap-1.5"><SplitSquareHorizontal className="w-3 h-3 text-primary" /> Transition</p>
                      <Select value={selectedScene.transitionType} onValueChange={(v) => updateScene(selectedIdx!, { transitionType: v })}>
                        <SelectTrigger className="h-8 text-xs bg-zinc-900 border-zinc-700"><SelectValue /></SelectTrigger>
                        <SelectContent>{TRANSITION_OPTIONS.map((opt) => (<SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>))}</SelectContent>
                      </Select>
                      <div>
                        <div className="flex justify-between mb-1.5">
                          <Label className="text-[11px] text-zinc-500">Duration</Label>
                          <span className="text-[11px] font-mono text-zinc-400">{selectedScene.transitionDuration.toFixed(1)}s</span>
                        </div>
                        <Slider value={[selectedScene.transitionDuration]} min={0.1} max={3.0} step={0.1} onValueChange={([v]) => updateScene(selectedIdx!, { transitionDuration: v })} disabled={selectedScene.transitionType === "cut"} className="w-full" />
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {TRANSITION_OPTIONS.map((opt) => (
                          <button key={opt.value} className={`p-2 rounded text-[10px] text-center border transition-all ${selectedScene.transitionType === opt.value ? "bg-primary/20 border-primary/60 text-primary" : "bg-zinc-900 border-zinc-700 text-zinc-400"}`} onClick={() => updateScene(selectedIdx!, { transitionType: opt.value })}>{opt.label}</button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
          </SheetContent>
        </Sheet>
      )}

      {/* ── Delete Confirm Dialog ── */}
      <Dialog open={deleteConfirmIdx !== null} onOpenChange={() => setDeleteConfirmIdx(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <Trash2 className="w-4 h-4" /> Remove from Timeline
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-zinc-400">
            Remove <strong className="text-white">"{deleteConfirmIdx !== null ? (scenes[deleteConfirmIdx]?.title || `Scene ${deleteConfirmIdx + 1}`) : ""}"</strong> from the timeline?
            The scene will still exist in the Scene Editor — this only removes it from the cut.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteConfirmIdx(null)}>Cancel</Button>
            <Button
              size="sm"
              className="bg-red-600 hover:bg-red-500 text-white"
              onClick={() => deleteConfirmIdx !== null && removeFromTimeline(deleteConfirmIdx)}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
