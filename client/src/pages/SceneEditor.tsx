import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { useLocation, useParams } from "wouter";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  TIME_OF_DAY_OPTIONS,
  WEATHER_OPTIONS,
  LIGHTING_OPTIONS,
  CAMERA_ANGLE_OPTIONS,
  LOCATION_TYPES,
  REAL_ESTATE_STYLES,
  VEHICLE_TYPES,
  MOOD_OPTIONS,
} from "@shared/types";

type SceneForm = {
  title: string;
  description: string;
  timeOfDay: string;
  weather: string;
  lighting: string;
  cameraAngle: string;
  locationType: string;
  realEstateStyle: string;
  vehicleType: string;
  mood: string;
  characterIds: number[];
  dialogueText: string;
  duration: number;
  soundtrackId: number | null;
  soundtrackVolume: number;
};

const defaultScene: SceneForm = {
  title: "",
  description: "",
  timeOfDay: "afternoon",
  weather: "clear",
  lighting: "natural",
  cameraAngle: "medium",
  locationType: "",
  realEstateStyle: "",
  vehicleType: "None",
  mood: "",
  characterIds: [],
  dialogueText: "",
  duration: 30,
  soundtrackId: null,
  soundtrackVolume: 80,
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

  const openNewScene = () => {
    setSelectedSceneId(null);
    setForm({ ...defaultScene });
    setEditDialogOpen(true);
  };

  const openEditScene = (scene: any) => {
    setSelectedSceneId(scene.id);
    setForm({
      title: scene.title || "",
      description: scene.description || "",
      timeOfDay: scene.timeOfDay || "afternoon",
      weather: scene.weather || "clear",
      lighting: scene.lighting || "natural",
      cameraAngle: scene.cameraAngle || "medium",
      locationType: scene.locationType || "",
      realEstateStyle: scene.realEstateStyle || "",
      vehicleType: scene.vehicleType || "None",
      mood: scene.mood || "",
      characterIds: (scene.characterIds as number[]) || [],
      dialogueText: scene.dialogueText || "",
      duration: scene.duration || 30,
      soundtrackId: scene.soundtrackId || null,
      soundtrackVolume: scene.soundtrackVolume ?? 80,
    });
    setEditDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      timeOfDay: form.timeOfDay as any,
      weather: form.weather as any,
      lighting: form.lighting as any,
      cameraAngle: form.cameraAngle as any,
      locationType: form.locationType || undefined,
      realEstateStyle: form.realEstateStyle || undefined,
      vehicleType: form.vehicleType || undefined,
      mood: form.mood || undefined,
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
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={() => setLocation(`/projects/${projectId}`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight truncate">
              Scene Editor {project?.title ? `— ${project.title}` : ""}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {scenes?.length || 0} scenes · Drag to reorder
            </p>
          </div>
        </div>
        <Button size="sm" onClick={openNewScene}>
          <Plus className="h-4 w-4 mr-1" />
          Add Scene
        </Button>
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

                {scene.thumbnailUrl ? (
                  <div className="h-16 w-24 rounded overflow-hidden bg-muted shrink-0">
                    <img src={scene.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="h-16 w-24 rounded bg-muted/50 flex items-center justify-center shrink-0">
                    <ImageIcon className="h-5 w-5 text-muted-foreground/30" />
                  </div>
                )}

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
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
              <div className="grid grid-cols-2 gap-3">
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
                Time & Atmosphere
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Time of Day</Label>
                  <Select value={form.timeOfDay} onValueChange={v => setField("timeOfDay", v)}>
                    <SelectTrigger className="h-9 text-sm bg-background/50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TIME_OF_DAY_OPTIONS.map(o => <SelectItem key={o} value={o}>{o.replace("-", " ")}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1"><Cloud className="h-3 w-3" />Weather</Label>
                  <Select value={form.weather} onValueChange={v => setField("weather", v)}>
                    <SelectTrigger className="h-9 text-sm bg-background/50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {WEATHER_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1"><Heart className="h-3 w-3" />Mood</Label>
                  <Select value={form.mood} onValueChange={v => setField("mood", v)}>
                    <SelectTrigger className="h-9 text-sm bg-background/50"><SelectValue placeholder="Select mood" /></SelectTrigger>
                    <SelectContent>
                      {MOOD_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
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
                Camera & Lighting
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Camera Angle</Label>
                  <Select value={form.cameraAngle} onValueChange={v => setField("cameraAngle", v)}>
                    <SelectTrigger className="h-9 text-sm bg-background/50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CAMERA_ANGLE_OPTIONS.map(o => <SelectItem key={o} value={o}>{o.replace("-", " ")}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1"><Lightbulb className="h-3 w-3" />Lighting</Label>
                  <Select value={form.lighting} onValueChange={v => setField("lighting", v)}>
                    <SelectTrigger className="h-9 text-sm bg-background/50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LIGHTING_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
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
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Location Type</Label>
                  <Select value={form.locationType} onValueChange={v => setField("locationType", v)}>
                    <SelectTrigger className="h-9 text-sm bg-background/50"><SelectValue placeholder="Select location" /></SelectTrigger>
                    <SelectContent>
                      {LOCATION_TYPES.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1"><Home className="h-3 w-3" />Real Estate Style</Label>
                  <Select value={form.realEstateStyle} onValueChange={v => setField("realEstateStyle", v)}>
                    <SelectTrigger className="h-9 text-sm bg-background/50"><SelectValue placeholder="Select style" /></SelectTrigger>
                    <SelectContent>
                      {REAL_ESTATE_STYLES.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-1"><Car className="h-3 w-3" />Vehicle</Label>
                <Select value={form.vehicleType} onValueChange={v => setField("vehicleType", v)}>
                  <SelectTrigger className="h-9 text-sm bg-background/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VEHICLE_TYPES.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
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

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              {selectedSceneId && (
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
                  Generate Preview
                </Button>
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
    </div>
  );
}
