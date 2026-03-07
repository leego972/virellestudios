import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Upload, Video, Film, Play, ImagePlus, X } from "lucide-react";
import VirelleChatBubble from "@/components/VirelleChatBubble";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Plus,
  Loader2,
  Sparkles,
  Trash2,
  GripVertical,
  Image as ImageIcon,
  ChevronUp,
  ChevronDown,
  Eye,
  Clapperboard,
  Sun,
  Cloud,
  Lightbulb,
  Camera,
  MapPin,
  Home,
  Car,
  Heart,
  Users,
  MessageSquare,
  Clock,
  Music,
  Volume2,
  Palette,
  Scissors,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { useLocation, useParams } from "wouter";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  TIME_OF_DAY_OPTIONS, TIME_OF_DAY_LABELS,
  WEATHER_OPTIONS, WEATHER_LABELS,
  LIGHTING_OPTIONS, LIGHTING_LABELS,
  CAMERA_ANGLE_OPTIONS, CAMERA_ANGLE_LABELS,
  CAMERA_MOVEMENT_OPTIONS, CAMERA_MOVEMENT_LABELS,
  LENS_OPTIONS, LENS_LABELS,
  DEPTH_OF_FIELD_OPTIONS, DEPTH_OF_FIELD_LABELS,
  COLOR_GRADE_OPTIONS, COLOR_GRADE_LABELS,
  SEASON_OPTIONS, SEASON_LABELS,
  TRANSITION_OPTIONS, TRANSITION_LABELS,
  CROWD_LEVEL_OPTIONS, CROWD_LEVEL_LABELS,
  VFX_OPTIONS, VFX_LABELS,
  MOOD_OPTIONS_EXTENDED, MOOD_LABELS,
  LOCATION_TYPES_EXTENDED,
  REAL_ESTATE_STYLES,
  VEHICLE_TYPES_EXTENDED,
  WARDROBE_CATEGORY_LABELS,
  WARDROBE_CATEGORIES,
  FOCAL_LENGTH_OPTIONS,
  SHOT_TYPE_OPTIONS,
  FRAME_RATE_OPTIONS,
  ASPECT_RATIO_OPTIONS,
  COLOR_TEMPERATURE_OPTIONS,
  COLOR_PALETTE_OPTIONS,
  EMOTIONAL_BEAT_OPTIONS,
  MUSIC_MOOD_OPTIONS,
  MUSIC_TEMPO_OPTIONS,
  AMBIENT_SOUND_OPTIONS,
  ACTION_PRESETS,
  CAMERA_BODY_OPTIONS, CAMERA_BODY_LABELS,
  LENS_BRAND_OPTIONS, LENS_BRAND_LABELS,
  APERTURE_OPTIONS, APERTURE_LABELS,
  GENRE_MOTION_OPTIONS, GENRE_MOTION_LABELS,
  VISUAL_STYLE_OPTIONS, VISUAL_STYLE_LABELS,
  CHARACTER_EMOTION_OPTIONS, CHARACTER_EMOTION_LABELS,
  SPEED_RAMP_OPTIONS, SPEED_RAMP_LABELS,
  LIP_SYNC_OPTIONS, LIP_SYNC_LABELS,
} from "@shared/types";

type SceneWardrobeEntry = {
  characterId: number;
  characterName: string;
  wardrobeCategory: string;
  wardrobeDescription: string;
  makeupNotes?: string;
  hairNotes?: string;
  accessories?: string;
};

type SceneForm = {
  title: string;
  description: string;
  // Atmosphere
  timeOfDay: string;
  weather: string;
  season: string;
  lighting: string;
  mood: string;
  emotionalBeat: string;
  // Camera & Optics
  cameraAngle: string;
  cameraMovement: string;
  lensType: string;
  focalLength: string;
  depthOfField: string;
  shotType: string;
  frameRate: string;
  aspectRatio: string;
  // Color
  colorGrade: string;
  colorPalette: string;
  // Tier 1-3 new fields
  cameraBody: string;
  lensBrand: string;
  aperture: string;
  speedRamp: string;
  visualStyle: string;
  genreMotion: string;
  lipSyncMode: string;
  colorTemperature: string;
  // Location
  locationType: string;
  locationCountry: string;
  locationCity: string;
  locationDetails: string;
  realEstateStyle: string;
  vehicleType: string;
  // Composition
  foregroundElements: string;
  backgroundElements: string;
  characterBlocking: string;
  actionDescription: string;
  crowdLevel: string;
  // Characters
  characterIds: number[];
  characterWardrobe: SceneWardrobeEntry[];
  // Dialogue
  dialogueText: string;
  subtitleText: string;
  // Sound
  soundDesign: string;
  ambientSound: string;
  sfxNotes: string;
  musicMood: string;
  musicTempo: string;
  soundtrackId: number | null;
  soundtrackVolume: number;
  // VFX & Production
  vfxElements: string;
  vfxNotes: string;
  props: string;
  makeupNotes: string;
  stuntNotes: string;
  budgetEstimate: number | null;
  shootingDays: number | null;
  aiPromptOverride: string;
  // Timing
  duration: number;
  transition: string;
  transitionDuration: number;
  // Director
  directorNotes: string;
  externalFootageUrl: string;
  externalFootageType: string;
  externalFootageLabel: string;
  referenceImages: string[];
};

const defaultScene: SceneForm = {
  title: "",
  description: "",
  // Atmosphere
  timeOfDay: "afternoon",
  weather: "clear",
  season: "",
  lighting: "natural",
  mood: "",
  emotionalBeat: "",
  // Camera & Optics
  cameraAngle: "medium",
  cameraMovement: "",
  lensType: "",
  focalLength: "",
  depthOfField: "",
  shotType: "",
  frameRate: "",
  aspectRatio: "",
  // Color
  colorGrade: "",
  colorPalette: "",
  cameraBody: "",
  lensBrand: "",
  aperture: "",
  speedRamp: "normal",
  visualStyle: "photorealistic",
  genreMotion: "auto",
  lipSyncMode: "none",
  colorTemperature: "",
  // Location
  locationType: "",
  locationCountry: "",
  locationCity: "",
  locationDetails: "",
  realEstateStyle: "",
  vehicleType: "None",
  // Composition
  foregroundElements: "",
  backgroundElements: "",
  characterBlocking: "",
  actionDescription: "",
  crowdLevel: "",
  // Characters
  characterIds: [],
  characterWardrobe: [],
  // Dialogue
  dialogueText: "",
  subtitleText: "",
  // Sound
  soundDesign: "",
  ambientSound: "",
  sfxNotes: "",
  musicMood: "",
  musicTempo: "",
  soundtrackId: null,
  soundtrackVolume: 80,
  // VFX & Production
  vfxElements: "",
  vfxNotes: "",
  props: "",
  makeupNotes: "",
  stuntNotes: "",
  budgetEstimate: null,
  shootingDays: null,
  aiPromptOverride: "",
  // Timing
  duration: 30,
  transition: "",
  transitionDuration: 0.5,
  // Director
  directorNotes: "",
  externalFootageUrl: "",
  externalFootageType: "none",
  externalFootageLabel: "",
  referenceImages: [],
};

export default function SceneEditor() {
  const { id } = useParams<{ id: string }>();
  const projectId = parseInt(id || "0");
  const [, setLocation] = useLocation();
  const [selectedSceneId, setSelectedSceneId] = useState<number | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [form, setForm] = useState<SceneForm>(defaultScene);

  const { data: project } = trpc.project.get.useQuery({ id: projectId });
  const { data: scenes, isLoading } = trpc.scene.listByProject.useQuery({ projectId });
  const { data: characters } = trpc.character.listByProject.useQuery({ projectId });
  const { data: soundtracks } = trpc.soundtrack.listByProject.useQuery({ projectId });
  const utils = trpc.useUtils();

  const createMutation = trpc.scene.create.useMutation({
    onSuccess: () => {
      utils.scene.listByProject.invalidate({ projectId });
      toast.success("Scene created");
      setEditDialogOpen(false);
      setForm(defaultScene);
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.scene.update.useMutation({
    onSuccess: () => {
      utils.scene.listByProject.invalidate({ projectId });
      toast.success("Scene updated");
      setEditDialogOpen(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.scene.delete.useMutation({
    onSuccess: () => {
      utils.scene.listByProject.invalidate({ projectId });
      toast.success("Scene deleted");
      setDeleteId(null);
      if (selectedSceneId === deleteId) setSelectedSceneId(null);
    },
  });

  const reorderMutation = trpc.scene.reorder.useMutation({
    onSuccess: () => utils.scene.listByProject.invalidate({ projectId }),
  });

  const previewMutation = trpc.scene.generatePreview.useMutation({
    onSuccess: (result) => {
      utils.scene.listByProject.invalidate({ projectId });
      if (result.url) setPreviewUrl(result.url);
      toast.success("Preview generated");
    },
    onError: (err) => toast.error(err.message),
  });

  const bulkGenMutation = trpc.scene.bulkGeneratePreviews.useMutation({
    onSuccess: (result) => {
      utils.scene.listByProject.invalidate({ projectId });
      toast.success(`Generated ${result.generated} preview images (${result.total} total scenes)`);
    },
    onError: (err) => toast.error(err.message),
  });

  const videoMutation = trpc.scene.generateVideo.useMutation({
    onSuccess: (result: any) => {
      utils.scene.listByProject.invalidate({ projectId });
      if (result.status === "generating") {
        toast.success("Video generation started! This may take 2-5 minutes. The page will auto-refresh.");
        // Poll every 10 seconds until scene status changes
        const pollInterval = setInterval(async () => {
          const data = await utils.scene.listByProject.fetch({ projectId });
          const scene = data?.find((s: any) => s.id === result.sceneId);
          if (scene && (scene as any).status === "completed") {
            clearInterval(pollInterval);
            utils.scene.listByProject.invalidate({ projectId });
            toast.success("Video generation complete!");
          } else if (scene && (scene as any).status === "failed") {
            clearInterval(pollInterval);
            utils.scene.listByProject.invalidate({ projectId });
            toast.error("Video generation failed. Please try again.");
          }
        }, 10000);
        // Stop polling after 10 minutes max
        setTimeout(() => clearInterval(pollInterval), 600000);
      } else {
        toast.success(`Video generated via ${result.provider} (${result.duration}s)`);
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const bulkVideoMutation = trpc.scene.bulkGenerateVideos.useMutation({
    onSuccess: (result) => {
      utils.scene.listByProject.invalidate({ projectId });
      toast.success(`Generated ${result.generated} videos (${result.total} total scenes)`);
    },
    onError: (err) => toast.error(err.message),
  });

  const refImageUploadMutation = trpc.upload.referenceImage.useMutation({
    onError: (err) => toast.error(err.message),
  });
  const refImageRemoveMutation = trpc.upload.removeReferenceImage.useMutation({
    onError: (err) => toast.error(err.message),
  });

  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);

  const openNewScene = () => {
    setSelectedSceneId(null);
    setForm({ ...defaultScene });
    setEditDialogOpen(true);
  };

  const openEditScene = (scene: any) => {
    setSelectedSceneId(scene.id);
    // Support both old extendedData format and new direct columns
    const ext = (scene.extendedData || {}) as any;
    setForm({
      title: scene.title || "",
      description: scene.description || "",
      // Atmosphere
      timeOfDay: scene.timeOfDay || "afternoon",
      weather: scene.weather || "clear",
      season: scene.season || ext.season || "",
      lighting: scene.lighting || "natural",
      mood: scene.mood || "",
      emotionalBeat: scene.emotionalBeat || "",
      // Camera & Optics
      cameraAngle: scene.cameraAngle || "medium",
      cameraMovement: scene.cameraMovement || ext.cameraMovement || "",
      lensType: scene.lensType || ext.lensType || "",
      focalLength: scene.focalLength || "",
      depthOfField: scene.depthOfField || ext.depthOfField || "",
      shotType: scene.shotType || "",
      frameRate: scene.frameRate || "",
      aspectRatio: scene.aspectRatio || "",
      // Color
      colorGrade: scene.colorGrading || ext.colorGrade || "",
      colorPalette: scene.colorPalette || "",
      cameraBody: (scene as any).cameraBody || "",
      lensBrand: (scene as any).lensBrand || "",
      aperture: (scene as any).aperture || "",
      speedRamp: (scene as any).speedRamp || "normal",
      visualStyle: (scene as any).visualStyle || "photorealistic",
      genreMotion: (scene as any).genreMotion || "auto",
      lipSyncMode: (scene as any).lipSyncMode || "none",
      colorTemperature: scene.colorTemperature || "",
      // Location
      locationType: scene.locationType || "",
      locationCountry: scene.country || ext.locationCountry || "",
      locationCity: scene.city || ext.locationCity || "",
      locationDetails: scene.locationDetail || ext.locationDetails || "",
      realEstateStyle: scene.realEstateStyle || "",
      vehicleType: scene.vehicleType || "None",
      // Composition
      foregroundElements: scene.foregroundElements || "",
      backgroundElements: scene.backgroundElements || "",
      characterBlocking: scene.characterBlocking || ext.characterBlocking || "",
      actionDescription: scene.actionDescription || "",
      crowdLevel: scene.crowdLevel || ext.crowdLevel || "",
      // Characters
      characterIds: (scene.characterIds as number[]) || [],
      characterWardrobe: (scene.wardrobe as any[]) || ext.characterWardrobe || [],
      // Dialogue
      dialogueText: scene.dialogueText || "",
      subtitleText: scene.subtitleText || "",
      // Sound
      soundDesign: scene.sfxProductionNotes || ext.soundDesign || "",
      ambientSound: scene.ambientSound || ext.ambientSound || "",
      sfxNotes: scene.sfxNotes || "",
      musicMood: scene.musicMood || "",
      musicTempo: scene.musicTempo || "",
      soundtrackId: scene.soundtrackId || null,
      soundtrackVolume: scene.soundtrackVolume ?? 80,
      // VFX & Production
      vfxElements: (scene.visualEffects as any)?.[0] || ext.vfxElements || "",
      vfxNotes: scene.vfxNotes || "",
      props: Array.isArray(scene.props) ? (scene.props as string[]).join(", ") : "",
      makeupNotes: scene.makeupNotes || "",
      stuntNotes: scene.stuntNotes || "",
      budgetEstimate: scene.budgetEstimate || null,
      shootingDays: scene.shootingDays || null,
      aiPromptOverride: scene.aiPromptOverride || "",
      // Timing
      duration: scene.duration || 30,
      transition: scene.transitionType || ext.transition || "",
      transitionDuration: scene.transitionDuration ?? 0.5,
      // Director
      directorNotes: scene.productionNotes || ext.directorNotes || "",
      externalFootageUrl: (scene as any).externalFootageUrl || "",
      externalFootageType: (scene as any).externalFootageType || "none",
      externalFootageLabel: (scene as any).externalFootageLabel || "",
      referenceImages: (scene as any).referenceImages || [],
    });
    setEditDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      title: form.title,
      description: form.description,
      // Atmosphere
      timeOfDay: form.timeOfDay || undefined,
      weather: form.weather || undefined,
      season: form.season || undefined,
      lighting: form.lighting || undefined,
      mood: form.mood || undefined,
      emotionalBeat: form.emotionalBeat || undefined,
      // Camera & Optics
      cameraAngle: form.cameraAngle || undefined,
      cameraMovement: form.cameraMovement || undefined,
      lensType: form.lensType || undefined,
      focalLength: form.focalLength || undefined,
      depthOfField: form.depthOfField || undefined,
      shotType: form.shotType || undefined,
      frameRate: form.frameRate || undefined,
      aspectRatio: form.aspectRatio || undefined,
      // Color
      colorGrading: form.colorGrade || undefined,
      colorPalette: form.colorPalette || undefined,
      cameraBody: form.cameraBody || undefined,
      lensBrand: form.lensBrand || undefined,
      aperture: form.aperture || undefined,
      speedRamp: form.speedRamp || undefined,
      visualStyle: form.visualStyle || undefined,
      genreMotion: form.genreMotion || undefined,
      lipSyncMode: form.lipSyncMode || undefined,
      colorTemperature: form.colorTemperature || undefined,
      // Location
      locationType: form.locationType || undefined,
      realEstateStyle: form.realEstateStyle || undefined,
      country: form.locationCountry || undefined,
      city: form.locationCity || undefined,
      locationDetail: form.locationDetails || undefined,
      vehicleType: form.vehicleType || undefined,
      // Composition
      foregroundElements: form.foregroundElements || undefined,
      backgroundElements: form.backgroundElements || undefined,
      characterBlocking: form.characterBlocking || undefined,
      actionDescription: form.actionDescription || undefined,
      crowdLevel: form.crowdLevel || undefined,
      // Characters
      characterIds: form.characterIds,
      wardrobe: form.characterWardrobe.length > 0 ? form.characterWardrobe : undefined,
      // Dialogue
      dialogueText: form.dialogueText || undefined,
      subtitleText: form.subtitleText || undefined,
      // Sound
      ambientSound: form.ambientSound || undefined,
      sfxNotes: form.sfxNotes || undefined,
      musicMood: form.musicMood || undefined,
      musicTempo: form.musicTempo || undefined,
      soundtrackId: form.soundtrackId,
      soundtrackVolume: form.soundtrackVolume,
      // VFX & Production
      vfxNotes: form.vfxNotes || undefined,
      visualEffects: form.vfxElements ? [form.vfxElements] : undefined,
      props: form.props ? form.props.split(",").map((p: string) => p.trim()).filter(Boolean) : undefined,
      makeupNotes: form.makeupNotes || undefined,
      stuntNotes: form.stuntNotes || undefined,
      productionNotes: form.directorNotes || undefined,
      externalFootageUrl: form.externalFootageUrl || undefined,
      externalFootageType: form.externalFootageType !== "none" ? form.externalFootageType : undefined,
      externalFootageLabel: form.externalFootageLabel || undefined,
      referenceImages: form.referenceImages.length > 0 ? form.referenceImages : undefined,
      budgetEstimate: form.budgetEstimate || undefined,
      shootingDays: form.shootingDays || undefined,
      aiPromptOverride: form.aiPromptOverride || undefined,
      // Timing
      duration: form.duration,
      transitionType: form.transition || undefined,
      transitionDuration: form.transitionDuration,
    };
    if (selectedSceneId) {
      updateMutation.mutate({ id: selectedSceneId, ...payload });
    } else {
      createMutation.mutate({
        projectId,
        orderIndex: scenes?.length || 0,
        ...payload,
      });
    }
  };

  const moveScene = (sceneId: number, direction: "up" | "down") => {
    if (!scenes) return;
    const idx = scenes.findIndex((s) => s.id === sceneId);
    if (idx < 0) return;
    const newIdx = direction === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= scenes.length) return;
    const ids = scenes.map((s) => s.id);
    [ids[idx], ids[newIdx]] = [ids[newIdx], ids[idx]];
    reorderMutation.mutate({ projectId, sceneIds: ids });
  };

  const setField = (key: keyof SceneForm, value: any) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggleCharacter = (charId: number) => {
    setForm((prev) => ({
      ...prev,
      characterIds: prev.characterIds.includes(charId)
        ? prev.characterIds.filter((id) => id !== charId)
        : [...prev.characterIds, charId],
    }));
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="max-w-6xl mx-auto space-y-4 md:space-y-6 px-2 md:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={() => setLocation(`/projects/${projectId}`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-base md:text-xl font-semibold tracking-tight truncate">
              Scene Editor {project?.title ? `— ${project.title}` : ""}
            </h1>
            <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5">
              {scenes?.length || 0} scenes · Drag to reorder
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 md:gap-2 pl-11 sm:pl-0 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (!projectId) return;
              bulkGenMutation.mutate({ projectId: Number(projectId) });
            }}
            disabled={bulkGenMutation.isPending}
          >
            {bulkGenMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-1" />
            )}
            <span className="hidden sm:inline">Generate All</span>
            <span className="sm:hidden">Gen All</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
            onClick={() => {
              if (!projectId) return;
              bulkVideoMutation.mutate({ projectId: Number(projectId) });
            }}
            disabled={bulkVideoMutation.isPending}
          >
            {bulkVideoMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Film className="h-4 w-4 mr-1" />
            )}
            <span className="hidden sm:inline">Generate Videos</span>
            <span className="sm:hidden">Videos</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-primary/40 text-primary hover:bg-primary/10"
            onClick={() => setLocation(`/projects/${projectId}/director-cut`)}
          >
            <Scissors className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Director's Cut</span>
          </Button>
          <Button size="sm" onClick={openNewScene}>
            <Plus className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Add Scene</span>
          </Button>
        </div>
      </div>

      {/* Timeline */}
      {scenes && scenes.length > 0 && (
        <Card className="bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Timeline</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <ScrollArea className="w-full">
              <div className="flex gap-2 pb-2" style={{ minWidth: "max-content" }}>
                {scenes.map((scene, idx) => (
                  <div
                    key={scene.id}
                    className={`shrink-0 w-32 cursor-pointer rounded-md border p-2 transition-colors ${
                      selectedSceneId === scene.id ? "border-primary bg-primary/5" : "hover:border-muted-foreground/30"
                    }`}
                    onClick={() => openEditScene(scene)}
                  >
                    {scene.thumbnailUrl ? (
                      <div className="aspect-video rounded overflow-hidden bg-muted mb-1.5">
                        <img src={scene.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="aspect-video rounded bg-muted/50 flex items-center justify-center mb-1.5">
                        <ImageIcon className="h-4 w-4 text-muted-foreground/30" />
                      </div>
                    )}
                    <p className="text-xs font-medium truncate">{scene.title || `Scene ${idx + 1}`}</p>
                    <p className="text-[10px] text-muted-foreground">{scene.duration || 30}s</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Scene List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-card/50">
              <CardContent className="p-4">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !scenes?.length ? (
        <Card className="bg-card/50 border-dashed">
          <CardContent className="p-12 flex flex-col items-center text-center">
            <Clapperboard className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              No scenes yet. Start building your film scene by scene.
            </p>
            <Button size="sm" onClick={openNewScene}>
              <Plus className="h-4 w-4 mr-1" />
              Create First Scene
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {scenes.map((scene, idx) => (
            <Card key={scene.id} className="bg-card/50 group">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="flex flex-col gap-0.5 shrink-0">
                  <Button variant="ghost" size="sm" className="h-5 w-5 p-0" disabled={idx === 0}
                    onClick={() => moveScene(scene.id, "up")}>
                    <ChevronUp className="h-3 w-3" />
                  </Button>
                  <GripVertical className="h-4 w-4 text-muted-foreground/40 mx-auto" />
                  <Button variant="ghost" size="sm" className="h-5 w-5 p-0" disabled={idx === scenes.length - 1}
                    onClick={() => moveScene(scene.id, "down")}>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </div>

                <div className="relative h-16 w-24 shrink-0">
                  {scene.thumbnailUrl ? (
                    <div className="h-full w-full rounded overflow-hidden bg-muted">
                      <img src={scene.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="h-full w-full rounded bg-muted/50 flex items-center justify-center">
                      <ImageIcon className="h-5 w-5 text-muted-foreground/30" />
                    </div>
                  )}
                  {(scene as any).videoUrl && (
                    <button
                      className="absolute inset-0 flex items-center justify-center bg-black/40 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => { e.stopPropagation(); setVideoPreviewUrl((scene as any).videoUrl); }}
                    >
                      <Play className="h-6 w-6 text-white fill-white" />
                    </button>
                  )}
                  {(scene as any).videoUrl && (
                    <div className="absolute top-0.5 right-0.5">
                      <Badge className="text-[8px] h-3.5 px-1 bg-amber-500/80 text-white border-0">VIDEO</Badge>
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1 cursor-pointer" onClick={() => openEditScene(scene)}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-mono">#{idx + 1}</span>
                    <p className="text-sm font-medium truncate">{scene.title || "Untitled Scene"}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {[scene.timeOfDay, scene.locationType, scene.mood, scene.lighting].filter(Boolean).join(" · ")}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-[10px] h-5 capitalize">{scene.status}</Badge>
                    <span className="text-[10px] text-muted-foreground">{scene.duration || 30}s</span>
                    {(scene as any).videoUrl && <Badge variant="outline" className="text-[10px] h-5 text-amber-400 border-amber-500/30"><Video className="h-2.5 w-2.5 mr-0.5" />Video</Badge>}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                    onClick={() => videoMutation.mutate({ sceneId: scene.id })}
                    disabled={videoMutation.isPending}>
                    {videoMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Film className="h-3 w-3 mr-1" />}
                    Video
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs"
                    onClick={() => previewMutation.mutate({ sceneId: scene.id })}
                    disabled={previewMutation.isPending}>
                    {previewMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3 mr-1" />}
                    Preview
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => openEditScene(scene)}>
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                    onClick={() => setDeleteId(scene.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Scene Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => { if (!open) { setEditDialogOpen(false); setSelectedSceneId(null); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto w-[95vw] md:w-auto">
          <DialogHeader>
            <DialogTitle className="text-base">
              {selectedSceneId ? "Edit Scene" : "New Scene"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5 mt-2">
            {/* Basic Info */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider font-medium">
                <Clapperboard className="h-3.5 w-3.5" />
                Scene Info
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Scene Title</Label>
                  <Input placeholder="e.g. The Chase Begins" value={form.title} onChange={e => setField("title", e.target.value)} className="h-9 text-sm bg-background/50" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />Duration (seconds)</Label>
                  <Input type="number" min={1} max={600} value={form.duration} onChange={e => setField("duration", parseInt(e.target.value) || 30)} className="h-9 text-sm bg-background/50" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Scene Description</Label>
                <Textarea placeholder="Describe what happens in this scene in detail — actions, emotions, key moments..." value={form.description} onChange={e => setField("description", e.target.value)} className="min-h-[80px] text-sm bg-background/50 resize-y" />
              </div>
            </div>

            <Separator />

            {/* Time & Atmosphere */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider font-medium">
                <Sun className="h-3.5 w-3.5" />
                Time, Weather & Atmosphere
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Time of Day</Label>
                  <Select value={form.timeOfDay} onValueChange={v => setField("timeOfDay", v)}>
                    <SelectTrigger className="h-9 text-sm bg-background/50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(TIME_OF_DAY_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Season</Label>
                  <Select value={form.season} onValueChange={v => setField("season", v)}>
                    <SelectTrigger className="h-9 text-sm bg-background/50"><SelectValue placeholder="Any" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any_season">Any Season</SelectItem>
                      {Object.entries(SEASON_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1"><Cloud className="h-3 w-3" />Weather</Label>
                  <Select value={form.weather} onValueChange={v => setField("weather", v)}>
                    <SelectTrigger className="h-9 text-sm bg-background/50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(WEATHER_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                 <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1"><Heart className="h-3 w-3" />Mood</Label>
                  <Select value={form.mood} onValueChange={v => setField("mood", v)}>
                    <SelectTrigger className="h-9 text-sm bg-background/50"><SelectValue placeholder="Select mood" /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(MOOD_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Emotional Beat</Label>
                  <Select value={form.emotionalBeat} onValueChange={v => setField("emotionalBeat", v)}>
                    <SelectTrigger className="h-9 text-sm bg-background/50"><SelectValue placeholder="Select beat" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unspecified">Unspecified</SelectItem>
                      {EMOTIONAL_BEAT_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <Separator />
            {/* Camera & Lighting */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider font-medium">
                <Camera className="h-3.5 w-3.5" />
                Camera, Lens & Lighting
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Camera Angle / Shot</Label>
                  <Select value={form.cameraAngle} onValueChange={v => setField("cameraAngle", v)}>
                    <SelectTrigger className="h-9 text-sm bg-background/50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(CAMERA_ANGLE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Camera Movement</Label>
                  <Select value={form.cameraMovement} onValueChange={v => setField("cameraMovement", v)}>
                    <SelectTrigger className="h-9 text-sm bg-background/50"><SelectValue placeholder="Select movement" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="static">No movement (static)</SelectItem>
                      {Object.entries(CAMERA_MOVEMENT_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Lens Type</Label>
                  <Select value={form.lensType} onValueChange={v => setField("lensType", v)}>
                    <SelectTrigger className="h-9 text-sm bg-background/50"><SelectValue placeholder="Select lens" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto_default">Auto / Default</SelectItem>
                      {Object.entries(LENS_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Depth of Field</Label>
                  <Select value={form.depthOfField} onValueChange={v => setField("depthOfField", v)}>
                    <SelectTrigger className="h-9 text-sm bg-background/50"><SelectValue placeholder="Select DoF" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto</SelectItem>
                      {Object.entries(DEPTH_OF_FIELD_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1"><Lightbulb className="h-3 w-3" />Lighting Setup</Label>
                  <Select value={form.lighting} onValueChange={v => setField("lighting", v)}>
                    <SelectTrigger className="h-9 text-sm bg-background/50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(LIGHTING_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                 <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Color Grade / LUT</Label>
                  <Select value={form.colorGrade} onValueChange={v => setField("colorGrade", v)}>
                    <SelectTrigger className="h-9 text-sm bg-background/50"><SelectValue placeholder="Select grade" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No specific grade</SelectItem>
                      {Object.entries(COLOR_GRADE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Focal Length</Label>
                  <Select value={form.focalLength} onValueChange={v => setField("focalLength", v)}>
                    <SelectTrigger className="h-9 text-sm bg-background/50"><SelectValue placeholder="Select focal length" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto_director">Auto / Director's choice</SelectItem>
                      {FOCAL_LENGTH_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Shot Type</Label>
                  <Select value={form.shotType} onValueChange={v => setField("shotType", v)}>
                    <SelectTrigger className="h-9 text-sm bg-background/50"><SelectValue placeholder="Select shot type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unspecified">Unspecified</SelectItem>
                      {SHOT_TYPE_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Frame Rate</Label>
                  <Select value={form.frameRate} onValueChange={v => setField("frameRate", v)}>
                    <SelectTrigger className="h-9 text-sm bg-background/50"><SelectValue placeholder="Select frame rate" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default_24fps">Default (24fps)</SelectItem>
                      {FRAME_RATE_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Aspect Ratio</Label>
                  <Select value={form.aspectRatio} onValueChange={v => setField("aspectRatio", v)}>
                    <SelectTrigger className="h-9 text-sm bg-background/50"><SelectValue placeholder="Select aspect ratio" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="project_default">Project default</SelectItem>
                      {ASPECT_RATIO_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Color Temperature</Label>
                  <Select value={form.colorTemperature} onValueChange={v => setField("colorTemperature", v)}>
                    <SelectTrigger className="h-9 text-sm bg-background/50"><SelectValue placeholder="Select temperature" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto</SelectItem>
                      {COLOR_TEMPERATURE_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Color Palette</Label>
                  <Select value={form.colorPalette} onValueChange={v => setField("colorPalette", v)}>
                    <SelectTrigger className="h-9 text-sm bg-background/50"><SelectValue placeholder="Select palette" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto</SelectItem>
                      {COLOR_PALETTE_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <Separator />
            {/* Camera Rig — Tier 1 */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider font-medium">
                <Camera className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-amber-400">Camera Rig</span>
                <Badge className="text-xs h-4 bg-amber-500/20 text-amber-400 border-amber-500/40">Pro</Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Camera Body / Sensor</Label>
                  <Select value={form.cameraBody || ""} onValueChange={v => setField("cameraBody", v)}>
                    <SelectTrigger className="h-9 text-sm bg-background/50"><SelectValue placeholder="Select camera body" /></SelectTrigger>
                    <SelectContent>
                      {CAMERA_BODY_OPTIONS.map(o => <SelectItem key={o} value={o}>{CAMERA_BODY_LABELS[o] || o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Lens Glass</Label>
                  <Select value={form.lensBrand || ""} onValueChange={v => setField("lensBrand", v)}>
                    <SelectTrigger className="h-9 text-sm bg-background/50"><SelectValue placeholder="Select lens" /></SelectTrigger>
                    <SelectContent>
                      {LENS_BRAND_OPTIONS.map(o => <SelectItem key={o} value={o}>{LENS_BRAND_LABELS[o] || o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Aperture / T-Stop</Label>
                  <Select value={form.aperture || ""} onValueChange={v => setField("aperture", v)}>
                    <SelectTrigger className="h-9 text-sm bg-background/50"><SelectValue placeholder="Select aperture" /></SelectTrigger>
                    <SelectContent>
                      {APERTURE_OPTIONS.map(o => <SelectItem key={o} value={o}>{APERTURE_LABELS[o] || o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Speed Ramp</Label>
                  <Select value={form.speedRamp || "normal"} onValueChange={v => setField("speedRamp", v)}>
                    <SelectTrigger className="h-9 text-sm bg-background/50"><SelectValue placeholder="Normal speed" /></SelectTrigger>
                    <SelectContent>
                      {SPEED_RAMP_OPTIONS.map(o => <SelectItem key={o} value={o}>{SPEED_RAMP_LABELS[o] || o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <Separator />
            {/* Visual Style & Genre Motion — Tier 2 */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider font-medium">
                <Palette className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-amber-400">Visual Style & Motion Logic</span>
                <Badge className="text-xs h-4 bg-amber-500/20 text-amber-400 border-amber-500/40">Pro</Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Visual Style</Label>
                  <Select value={form.visualStyle || "photorealistic"} onValueChange={v => setField("visualStyle", v)}>
                    <SelectTrigger className="h-9 text-sm bg-background/50"><SelectValue placeholder="Photorealistic" /></SelectTrigger>
                    <SelectContent>
                      {VISUAL_STYLE_OPTIONS.map(o => <SelectItem key={o} value={o}>{VISUAL_STYLE_LABELS[o] || o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Genre Motion Logic</Label>
                  <Select value={form.genreMotion || "auto"} onValueChange={v => setField("genreMotion", v)}>
                    <SelectTrigger className="h-9 text-sm bg-background/50"><SelectValue placeholder="Auto" /></SelectTrigger>
                    <SelectContent>
                      {GENRE_MOTION_OPTIONS.map(o => <SelectItem key={o} value={o}>{GENRE_MOTION_LABELS[o] || o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Lip-Sync Mode</Label>
                  <Select value={form.lipSyncMode || "none"} onValueChange={v => setField("lipSyncMode", v)}>
                    <SelectTrigger className="h-9 text-sm bg-background/50"><SelectValue placeholder="No lip sync" /></SelectTrigger>
                    <SelectContent>
                      {LIP_SYNC_OPTIONS.map(o => <SelectItem key={o} value={o}>{LIP_SYNC_LABELS[o] || o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <Separator />
            {/* Location & Setting */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider font-medium">
                <MapPin className="h-3.5 w-3.5" />
                Location & Setting
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Location Type</Label>
                  <Select value={form.locationType} onValueChange={v => setField("locationType", v)}>
                    <SelectTrigger className="h-9 text-sm bg-background/50"><SelectValue placeholder="Select location" /></SelectTrigger>
                    <SelectContent>
                      {LOCATION_TYPES_EXTENDED.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1"><Home className="h-3 w-3" />Architectural Style</Label>
                  <Select value={form.realEstateStyle} onValueChange={v => setField("realEstateStyle", v)}>
                    <SelectTrigger className="h-9 text-sm bg-background/50"><SelectValue placeholder="Select style" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any_style">Any style</SelectItem>
                      {REAL_ESTATE_STYLES.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Country</Label>
                  <Input placeholder="e.g. United States, France, Japan" value={form.locationCountry} onChange={e => setField("locationCountry", e.target.value)} className="h-9 text-sm bg-background/50" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">City / Region</Label>
                  <Input placeholder="e.g. New York, Paris, Tokyo" value={form.locationCity} onChange={e => setField("locationCity", e.target.value)} className="h-9 text-sm bg-background/50" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Location Details</Label>
                <Input placeholder="e.g. Rooftop of a glass skyscraper, rain-slicked streets below" value={form.locationDetails} onChange={e => setField("locationDetails", e.target.value)} className="h-9 text-sm bg-background/50" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1"><Car className="h-3 w-3" />Vehicle</Label>
                  <Select value={form.vehicleType} onValueChange={v => setField("vehicleType", v)}>
                    <SelectTrigger className="h-9 text-sm bg-background/50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {VEHICLE_TYPES_EXTENDED.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Crowd Level</Label>
                  <Select value={form.crowdLevel} onValueChange={v => setField("crowdLevel", v)}>
                    <SelectTrigger className="h-9 text-sm bg-background/50"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unspecified">Unspecified</SelectItem>
                      {Object.entries(CROWD_LEVEL_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* Characters */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider font-medium">
                <Users className="h-3.5 w-3.5" />
                Characters in Scene
              </div>
              {characters && characters.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {characters.map((char) => (
                      <button
                        key={char.id}
                        type="button"
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs transition-colors ${
                          form.characterIds.includes(char.id)
                            ? "border-primary bg-primary/10 text-primary"
                            : "hover:border-muted-foreground/30"
                        }`}
                        onClick={() => toggleCharacter(char.id)}
                      >
                        {char.photoUrl ? (
                          <img src={char.photoUrl} alt="" className="h-5 w-5 rounded-full object-cover" />
                        ) : (
                          <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center">
                            <span className="text-[10px]">{char.name[0]}</span>
                          </div>
                        )}
                        {char.name}
                      </button>
                    ))}
                  </div>

                  {/* Per-character wardrobe overrides */}
                  {form.characterIds.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground font-medium">Scene Wardrobe Overrides</Label>
                      <p className="text-[11px] text-muted-foreground">Specify what each character wears in this scene. Leave blank to use their default wardrobe.</p>
                      {form.characterIds.map(charId => {
                        const char = characters?.find(c => c.id === charId);
                        if (!char) return null;
                        const entry = form.characterWardrobe.find(w => w.characterId === charId) || { characterId: charId, characterName: char.name, wardrobeCategory: "", wardrobeDescription: "" };
                        const updateWardrobe = (updates: Partial<SceneWardrobeEntry>) => {
                          setForm(prev => {
                            const existing = prev.characterWardrobe.filter(w => w.characterId !== charId);
                            const updated = { ...entry, ...updates };
                            return { ...prev, characterWardrobe: [...existing, updated] };
                          });
                        };
                        return (
                          <div key={charId} className="border rounded-md p-3 space-y-2 bg-muted/20">
                            <div className="flex items-center gap-2">
                              {char.photoUrl ? <img src={char.photoUrl} alt="" className="h-5 w-5 rounded-full object-cover" /> : <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center"><span className="text-[10px]">{char.name[0]}</span></div>}
                              <span className="text-xs font-medium">{char.name}</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <Label className="text-[11px] text-muted-foreground">Wardrobe Category</Label>
                                <Select value={entry.wardrobeCategory} onValueChange={v => updateWardrobe({ wardrobeCategory: v })}>
                                  <SelectTrigger className="h-8 text-xs bg-background/50"><SelectValue placeholder="Default" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="from_profile">Default (from profile)</SelectItem>
                                    {WARDROBE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{WARDROBE_CATEGORY_LABELS[c]}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[11px] text-muted-foreground">Hair / Styling</Label>
                                <Input placeholder="e.g. slicked back, wet" value={entry.hairNotes || ""} onChange={e => updateWardrobe({ hairNotes: e.target.value })} className="h-8 text-xs bg-background/50" />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[11px] text-muted-foreground">Outfit Description</Label>
                              <Input placeholder="e.g. black tuxedo, white dress shirt, no tie" value={entry.wardrobeDescription} onChange={e => updateWardrobe({ wardrobeDescription: e.target.value })} className="h-8 text-xs bg-background/50" />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <Label className="text-[11px] text-muted-foreground">Makeup / FX</Label>
                                <Input placeholder="e.g. bruised eye, blood on lip" value={entry.makeupNotes || ""} onChange={e => updateWardrobe({ makeupNotes: e.target.value })} className="h-8 text-xs bg-background/50" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[11px] text-muted-foreground">Accessories / Props</Label>
                                <Input placeholder="e.g. gold watch, briefcase" value={entry.accessories || ""} onChange={e => updateWardrobe({ accessories: e.target.value })} className="h-8 text-xs bg-background/50" />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Character Blocking / Positions</Label>
                    <Textarea
                      placeholder="Describe where each character is positioned and how they move. e.g. 'MARCUS stands at the window, back to camera. ELENA enters from left, stops 3 feet behind him.'"
                      value={form.characterBlocking}
                      onChange={e => setField("characterBlocking", e.target.value)}
                      className="min-h-[60px] text-sm bg-background/50 resize-y"
                    />
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No characters in this project yet. Add characters from the project page.
                </p>
              )}
            </div>

            <Separator />

            {/* Soundtrack */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider font-medium">
                <Music className="h-3.5 w-3.5" />
                Scene Soundtrack
              </div>
              {soundtracks && soundtracks.length > 0 ? (
                <div className="space-y-3">
                  <Select
                    value={form.soundtrackId ? String(form.soundtrackId) : "none"}
                    onValueChange={v => setField("soundtrackId", v === "none" ? null : parseInt(v))}
                  >
                    <SelectTrigger className="h-9 text-sm bg-background/50">
                      <SelectValue placeholder="Select soundtrack" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No soundtrack</SelectItem>
                      {soundtracks.map(st => (
                        <SelectItem key={st.id} value={String(st.id)}>
                          <span className="flex items-center gap-2">
                            <Music className="h-3 w-3" />
                            {st.title}
                            {st.genre && <span className="text-muted-foreground">· {st.genre}</span>}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.soundtrackId && (
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <Volume2 className="h-3 w-3" />
                        Volume: {form.soundtrackVolume}%
                      </Label>
                      <Slider
                        value={[form.soundtrackVolume]}
                        onValueChange={([v]) => setField("soundtrackVolume", v)}
                        min={0}
                        max={100}
                        step={5}
                        className="w-full"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No soundtracks uploaded yet. Add soundtracks from the project Soundtrack tab.
                </p>
              )}
            </div>

            <Separator />

            <Separator />

            {/* VFX & Post Production */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider font-medium">
                <Sparkles className="h-3.5 w-3.5" />
                VFX & Post Production
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Visual Effects</Label>
                  <Select value={form.vfxElements} onValueChange={v => setField("vfxElements", v)}>
                    <SelectTrigger className="h-9 text-sm bg-background/50"><SelectValue placeholder="No VFX" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No VFX</SelectItem>
                      {Object.entries(VFX_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Scene Transition</Label>
                  <Select value={form.transition} onValueChange={v => setField("transition", v)}>
                    <SelectTrigger className="h-9 text-sm bg-background/50"><SelectValue placeholder="Cut" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hard_cut">Hard Cut (default)</SelectItem>
                      {Object.entries(TRANSITION_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* Dialogue */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider font-medium">
                <MessageSquare className="h-3.5 w-3.5" />
                Dialogue
              </div>
              <Textarea
                placeholder="Write the dialogue for this scene. Use character names followed by colons to indicate who is speaking..."
                value={form.dialogueText}
                onChange={e => setField("dialogueText", e.target.value)}
                className="min-h-[80px] text-sm bg-background/50 resize-y font-mono"
              />
            </div>

            <Separator />

              {/* Sound Design */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider font-medium">
                <Volume2 className="h-3.5 w-3.5" />
                Sound Design
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Music Mood</Label>
                  <Select value={form.musicMood} onValueChange={v => setField("musicMood", v)}>
                    <SelectTrigger className="h-9 text-sm bg-background/50"><SelectValue placeholder="Select music mood" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no_preference">No preference</SelectItem>
                      {MUSIC_MOOD_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Music Tempo</Label>
                  <Select value={form.musicTempo} onValueChange={v => setField("musicTempo", v)}>
                    <SelectTrigger className="h-9 text-sm bg-background/50"><SelectValue placeholder="Select tempo" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no_preference">No preference</SelectItem>
                      {MUSIC_TEMPO_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Ambient Sound</Label>
                  <Select value={form.ambientSound} onValueChange={v => setField("ambientSound", v)}>
                    <SelectTrigger className="h-9 text-sm bg-background/50"><SelectValue placeholder="Select ambient" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No specific ambient</SelectItem>
                      {AMBIENT_SOUND_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">SFX Notes</Label>
                  <Input placeholder="e.g. glass breaking, gunshot echo, door slam" value={form.sfxNotes} onChange={e => setField("sfxNotes", e.target.value)} className="h-9 text-sm bg-background/50" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Sound Design Notes</Label>
                <Input placeholder="e.g. reverb-heavy, muffled underwater, hyper-real foley" value={form.soundDesign} onChange={e => setField("soundDesign", e.target.value)} className="h-9 text-sm bg-background/50" />
              </div>
            </div>
            <Separator />
            {/* Production Details */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider font-medium">
                <Sparkles className="h-3.5 w-3.5" />
                Production Details
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Action Description</Label>
                  <Select value={form.actionDescription} onValueChange={v => setField("actionDescription", v)}>
                    <SelectTrigger className="h-9 text-sm bg-background/50"><SelectValue placeholder="Select action type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="custom">Custom (see description)</SelectItem>
                      {ACTION_PRESETS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">VFX Notes</Label>
                  <Input placeholder="e.g. practical fire, wire work, CGI crowd" value={form.vfxNotes} onChange={e => setField("vfxNotes", e.target.value)} className="h-9 text-sm bg-background/50" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Props</Label>
                  <Input placeholder="e.g. briefcase, gun, wedding ring (comma separated)" value={form.props} onChange={e => setField("props", e.target.value)} className="h-9 text-sm bg-background/50" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Makeup / SFX Makeup</Label>
                  <Input placeholder="e.g. bruised eye, prosthetic scar, ageing makeup" value={form.makeupNotes} onChange={e => setField("makeupNotes", e.target.value)} className="h-9 text-sm bg-background/50" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Stunt Notes</Label>
                  <Input placeholder="e.g. car flip, rooftop jump, fight choreography" value={form.stuntNotes} onChange={e => setField("stuntNotes", e.target.value)} className="h-9 text-sm bg-background/50" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Est. Budget (USD)</Label>
                  <Input type="number" placeholder="e.g. 50000" value={form.budgetEstimate ?? ""} onChange={e => setField("budgetEstimate", e.target.value ? Number(e.target.value) : null)} className="h-9 text-sm bg-background/50" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Shooting Days</Label>
                  <Input type="number" placeholder="e.g. 2" value={form.shootingDays ?? ""} onChange={e => setField("shootingDays", e.target.value ? Number(e.target.value) : null)} className="h-9 text-sm bg-background/50" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Foreground Elements</Label>
                <Input placeholder="e.g. broken glass, scattered papers, candles" value={form.foregroundElements} onChange={e => setField("foregroundElements", e.target.value)} className="h-9 text-sm bg-background/50" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Background Elements</Label>
                <Input placeholder="e.g. city skyline, burning building, crowd of onlookers" value={form.backgroundElements} onChange={e => setField("backgroundElements", e.target.value)} className="h-9 text-sm bg-background/50" />
              </div>
            </div>
            <Separator />
            {/* AI Prompt Override */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider font-medium">
                <Sparkles className="h-3.5 w-3.5" />
                AI Prompt Override
              </div>
              <Textarea
                placeholder="Override the AI-generated prompt entirely. Leave blank to let the AI build the prompt from your scene settings. Use this for precise control over the final image/video generation prompt."
                value={form.aiPromptOverride}
                onChange={e => setField("aiPromptOverride", e.target.value)}
                className="min-h-[70px] text-sm bg-background/50 resize-y font-mono"
              />
            </div>
            <Separator />
            {/* Director's Notes */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider font-medium">
                <Eye className="h-3.5 w-3.5" />
                Director's Notes
              </div>
              <Textarea
                placeholder="Private notes for this scene — creative intent, references, technical reminders, continuity notes..."
                value={form.directorNotes}
                onChange={e => setField("directorNotes", e.target.value)}
                className="min-h-[60px] text-sm bg-background/50 resize-y"
              />
            </div>

            {/* ─── Reference Images ─── */}
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider font-medium">
                <ImagePlus className="h-3.5 w-3.5" />
                Reference Images
              </div>
              <p className="text-xs text-muted-foreground">Upload reference images (logos, concept art, mood boards) to guide AI generation. PNG, JPG, WEBP — max 10MB each.</p>
              {form.referenceImages.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {form.referenceImages.map((url: string, idx: number) => (
                    <div key={idx} className="relative group rounded-lg overflow-hidden border border-border/60 aspect-square">
                      <img src={url} alt={`Reference ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={async () => {
                          if (selectedSceneId) {
                            refImageRemoveMutation.mutate({ sceneId: selectedSceneId, imageUrl: url }, {
                              onSuccess: (result) => setField("referenceImages", result.referenceImages),
                              onError: () => setField("referenceImages", form.referenceImages.filter((_: string, i: number) => i !== idx)),
                            });
                          } else { setField("referenceImages", form.referenceImages.filter((_: string, i: number) => i !== idx)); }
                        }}
                        className="absolute top-1 right-1 bg-black/70 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                      ><X className="h-3 w-3 text-white" /></button>
                    </div>
                  ))}
                </div>
              )}
              <label className="flex flex-col items-center justify-center gap-2 p-4 rounded-lg border-2 border-dashed border-border/60 hover:border-amber-500/50 cursor-pointer transition-colors bg-background/30">
                <ImagePlus className="h-5 w-5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground text-center">Click to upload reference image<br /><span className="text-[10px]">PNG, JPG, WEBP — max 10MB</span></span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 10 * 1024 * 1024) { alert("File too large. Max 10MB."); return; }
                    const reader = new FileReader();
                    reader.onload = async (ev) => {
                      const base64 = (ev.target?.result as string).split(",")[1];
                      if (selectedSceneId) {
                        refImageUploadMutation.mutate({
                          base64,
                          filename: file.name,
                          contentType: file.type,
                          sceneId: selectedSceneId,
                        }, {
                          onSuccess: (result) => setField("referenceImages", result.referenceImages),
                        });
                      } else {
                        // Scene not saved yet — store as data URL temporarily
                        setField("referenceImages", [...form.referenceImages, ev.target?.result as string]);
                      }
                    };
                    reader.readAsDataURL(file);
                  }}
                />
              </label>
            </div>

            {/* ─── External Footage Upload ─── */}
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider font-medium">
                <Upload className="h-3.5 w-3.5" />
                External Footage
              </div>
              <p className="text-xs text-muted-foreground">Upload externally shot footage (MP4, MOV, AVI — max 150MB) to attach to this scene.</p>
              {form.externalFootageUrl ? (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <Video className="h-4 w-4 text-amber-400 shrink-0" />
                  <span className="text-xs text-amber-300 truncate flex-1">{form.externalFootageLabel || "Uploaded footage"}</span>
                  <button
                    type="button"
                    onClick={() => { setField("externalFootageUrl", ""); setField("externalFootageLabel", ""); setField("externalFootageType", "none"); }}
                    className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                  >Remove</button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-2 p-4 rounded-lg border-2 border-dashed border-border/60 hover:border-amber-500/50 cursor-pointer transition-colors bg-background/30">
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground text-center">Click to upload footage<br /><span className="text-[10px]">MP4, MOV, AVI, MKV — max 150MB</span></span>
                  <input
                    type="file"
                    accept="video/mp4,video/quicktime,video/avi,video/x-matroska,video/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 150 * 1024 * 1024) { alert("File too large. Max 150MB."); return; }
                      const reader = new FileReader();
                      reader.onload = async (ev) => {
                        const base64 = (ev.target?.result as string).split(",")[1];
                        try {
                          // We'll store it temporarily and upload on save
                          setField("externalFootageLabel", file.name);
                          setField("externalFootageType", "replace");
                          // Store base64 temporarily in a data URL for preview
                          setField("externalFootageUrl", `data:${file.type};base64,${base64.substring(0, 20)}...pending`);
                        } catch (err) { console.error(err); }
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
              )}
              {form.externalFootageUrl && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Footage Usage Mode</Label>
                  <select
                    value={form.externalFootageType}
                    onChange={e => setField("externalFootageType", e.target.value)}
                    className="w-full h-9 text-sm bg-background/50 border border-border rounded-md px-3"
                  >
                    <option value="replace">Replace AI generation — use this footage as the scene</option>
                    <option value="overlay">Overlay — composite AI elements over this footage</option>
                    <option value="reference">Reference only — use for style/continuity matching</option>
                  </select>
                </div>
              )}
            </div>
            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t">
              {selectedSceneId && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      previewMutation.mutate({ sceneId: selectedSceneId });
                    }}
                    disabled={previewMutation.isPending}
                  >
                    {previewMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-1" />
                    )}
                    <span className="hidden sm:inline">Generate Preview</span>
                    <span className="sm:hidden">Preview</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
                    onClick={() => {
                      videoMutation.mutate({ sceneId: selectedSceneId });
                    }}
                    disabled={videoMutation.isPending}
                  >
                    {videoMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <Film className="h-4 w-4 mr-1" />
                    )}
                    <span className="hidden sm:inline">Generate Video</span>
                    <span className="sm:hidden">Video</span>
                  </Button>
                </>
              )}
              <div className="flex gap-2 ml-auto">
                <Button type="button" variant="ghost" size="sm" onClick={() => setEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isSaving}>
                  {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                  {selectedSceneId ? "Save Changes" : "Create Scene"}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">Scene Preview</DialogTitle>
          </DialogHeader>
          {previewUrl && (
            <div className="aspect-video rounded-md overflow-hidden bg-muted">
              <img src={previewUrl} alt="Scene preview" className="w-full h-full object-cover" />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Video Preview Dialog */}
      <Dialog open={!!videoPreviewUrl} onOpenChange={() => setVideoPreviewUrl(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Film className="h-4 w-4 text-amber-400" />
              Scene Video
            </DialogTitle>
          </DialogHeader>
          {videoPreviewUrl && (
            <div className="aspect-video rounded-md overflow-hidden bg-black">
              <video src={videoPreviewUrl} controls autoPlay className="w-full h-full object-contain" />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete scene?</AlertDialogTitle>
            <AlertDialogDescription>This scene will be permanently removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Virelle AI Director Chat */}
      {scenes && scenes.length > 0 && (
        <VirelleChatBubble
          sceneId={selectedSceneId || scenes[0]?.id || 0}
          sceneTitle={selectedSceneId ? scenes.find(s => s.id === selectedSceneId)?.title || "Scene" : scenes[0]?.title || "Scene"}
          onSceneUpdated={() => utils.scene.listByProject.invalidate({ projectId })}
        />
      )}
    </div>
  );
}
