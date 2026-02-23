import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Film,
  Zap,
  Layers,
  Users,
  Plus,
  Upload,
  Loader2,
  Play,
  Pause,
  Clapperboard,
  Image as ImageIcon,
  Sparkles,
  X,
  User,
  FileText,
  Music,
  Volume2,
  Trash2,
  Wand2,
} from "lucide-react";
import { useLocation, useParams } from "wouter";
import { useState, useRef, useCallback, useMemo } from "react";
import { toast } from "sonner";
import {
  RATING_OPTIONS,
  GENRE_OPTIONS,
} from "@shared/types";

const MOOD_OPTIONS = [
  "Epic", "Romantic", "Tense", "Upbeat", "Melancholic", "Mysterious",
  "Triumphant", "Peaceful", "Dark", "Playful", "Nostalgic", "Heroic",
];

const GENRE_MUSIC_OPTIONS = [
  "Orchestral", "Electronic", "Ambient", "Rock", "Jazz", "Classical",
  "Hip-Hop", "Folk", "World", "Cinematic Score", "Pop", "Blues",
];

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const projectId = parseInt(id || "0");
  const [, setLocation] = useLocation();
  const [charDialogOpen, setCharDialogOpen] = useState(false);
  const [aiCharDialogOpen, setAiCharDialogOpen] = useState(false);
  const [trailerDialogOpen, setTrailerDialogOpen] = useState(false);
  const [soundtrackDialogOpen, setSoundtrackDialogOpen] = useState(false);
  const [charForm, setCharForm] = useState({
    name: "", description: "", photoUrl: "",
    age: "", gender: "", ethnicity: "", build: "", hairColor: "", role: "",
  });
  const [aiCharForm, setAiCharForm] = useState({
    name: "",
    ageRange: "",
    gender: "",
    ethnicity: "",
    skinTone: "",
    build: "",
    height: "",
    hairColor: "",
    hairStyle: "",
    eyeColor: "",
    facialFeatures: "",
    facialHair: "",
    distinguishingMarks: "",
    clothingStyle: "",
    expression: "",
    additionalNotes: "",
  });
  const [soundtrackForm, setSoundtrackForm] = useState({
    title: "", artist: "", genre: "", mood: "", notes: "",
    volume: 0.7, fadeIn: 0, fadeOut: 0, loop: 0,
  });
  const [uploading, setUploading] = useState(false);
  const [audioUploading, setAudioUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLInputElement>(null);

  const { data: project, isLoading } = trpc.project.get.useQuery({ id: projectId });
  const { data: scenes } = trpc.scene.listByProject.useQuery({ projectId });
  const { data: characters } = trpc.character.listByProject.useQuery({ projectId });
  const { data: jobs } = trpc.generation.listJobs.useQuery({ projectId });
  const { data: soundtracks } = trpc.soundtrack.listByProject.useQuery({ projectId });
  const utils = trpc.useUtils();

  const uploadMutation = trpc.upload.image.useMutation();
  const createCharMutation = trpc.character.create.useMutation({
    onSuccess: () => {
      utils.character.listByProject.invalidate({ projectId });
      toast.success("Character added");
      setCharDialogOpen(false);
      setCharForm({ name: "", description: "", photoUrl: "", age: "", gender: "", ethnicity: "", build: "", hairColor: "", role: "" });
    },
    onError: (err) => toast.error(err.message),
  });

  const aiCharMutation = trpc.character.aiGenerate.useMutation({
    onSuccess: () => {
      utils.character.listByProject.invalidate({ projectId });
      utils.character.listLibrary.invalidate();
      toast.success("AI character generated and saved");
      setAiCharDialogOpen(false);
      setAiCharForm({ name: "", ageRange: "", gender: "", ethnicity: "", skinTone: "", build: "", height: "", hairColor: "", hairStyle: "", eyeColor: "", facialFeatures: "", facialHair: "", distinguishingMarks: "", clothingStyle: "", expression: "", additionalNotes: "" });
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteCharMutation = trpc.character.delete.useMutation({
    onSuccess: () => {
      utils.character.listByProject.invalidate({ projectId });
      toast.success("Character removed");
    },
  });

  const createSoundtrackMutation = trpc.soundtrack.create.useMutation({
    onSuccess: () => {
      utils.soundtrack.listByProject.invalidate({ projectId });
      toast.success("Soundtrack added");
      setSoundtrackDialogOpen(false);
      setSoundtrackForm({ title: "", artist: "", genre: "", mood: "", notes: "", volume: 0.7, fadeIn: 0, fadeOut: 0, loop: 0 });
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteSoundtrackMutation = trpc.soundtrack.delete.useMutation({
    onSuccess: () => {
      utils.soundtrack.listByProject.invalidate({ projectId });
      toast.success("Soundtrack removed");
    },
  });

  const uploadAudioMutation = trpc.soundtrack.uploadAudio.useMutation();

  const quickGenMutation = trpc.generation.quickGenerate.useMutation({
    onSuccess: (result) => {
      utils.project.get.invalidate({ id: projectId });
      utils.scene.listByProject.invalidate({ projectId });
      utils.generation.listJobs.invalidate({ projectId });
      toast.success(`Generated ${result.scenesCreated} scenes`);
    },
    onError: (err) => toast.error(err.message),
  });

  const trailerMutation = trpc.generation.generateTrailer.useMutation({
    onSuccess: () => {
      utils.generation.listJobs.invalidate({ projectId });
      setTrailerDialogOpen(true);
      toast.success("Trailer generated");
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.project.update.useMutation({
    onSuccess: () => {
      utils.project.get.invalidate({ id: projectId });
      toast.success("Project updated");
    },
  });

  const handlePhotoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("File must be under 10MB"); return; }
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        const result = await uploadMutation.mutateAsync({ base64, filename: file.name, contentType: file.type });
        setCharForm((prev) => ({ ...prev, photoUrl: result.url }));
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch { toast.error("Upload failed"); setUploading(false); }
  }, [uploadMutation]);

  const handleAudioUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 16 * 1024 * 1024) { toast.error("Audio must be under 16MB"); return; }
    setAudioUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        const result = await uploadAudioMutation.mutateAsync({ base64, filename: file.name, contentType: file.type });
        setSoundtrackForm((prev) => ({ ...prev, title: prev.title || file.name.replace(/\.[^.]+$/, "") }));
        // Store the URL temporarily for submission
        (window as any).__pendingAudioUrl = result.url;
        (window as any).__pendingAudioKey = result.key;
        setAudioUploading(false);
        toast.success("Audio uploaded");
      };
      reader.readAsDataURL(file);
    } catch { toast.error("Upload failed"); setAudioUploading(false); }
  }, [uploadAudioMutation]);

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="max-w-5xl mx-auto flex flex-col items-center py-20">
        <Film className="h-10 w-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">Project not found</p>
        <Button variant="ghost" size="sm" className="mt-4" onClick={() => setLocation("/projects")}>
          Back to projects
        </Button>
      </div>
    );
  }

  const latestTrailerJob = jobs?.find(j => (j.metadata as any)?.trailerType === "cinematic" && j.status === "completed");
  const trailerData = latestTrailerJob?.metadata as any;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={() => setLocation("/projects")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight truncate">{project.title}</h1>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              {project.mode === "quick" ? <Zap className="h-3 w-3" /> : <Layers className="h-3 w-3" />}
              <span className="capitalize">{project.mode}</span>
              {project.rating && <><span>·</span><span>{project.rating}</span></>}
              {project.genre && <><span>·</span><span>{project.genre}</span></>}
              {project.duration && <><span>·</span><span>{project.duration} min</span></>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          <Button size="sm" variant="outline" onClick={() => setLocation(`/project/${project.id}/script/new`)}>
            <FileText className="h-4 w-4 mr-1" />
            Script Writer
          </Button>
          {project.mode === "manual" && (
            <Button size="sm" variant="outline" onClick={() => setLocation(`/projects/${project.id}/scenes`)}>
              <Layers className="h-4 w-4 mr-1" />
              Scene Editor
            </Button>
          )}
          {project.mode === "quick" && project.status === "draft" && (
            <Button
              size="sm"
              onClick={() => quickGenMutation.mutate({ projectId: project.id })}
              disabled={quickGenMutation.isPending}
            >
              {quickGenMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Generating...</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-1" />Generate Film</>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Generation Progress */}
      {(project.status === "generating" || quickGenMutation.isPending) && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm font-medium">Generating your film...</span>
            </div>
            <Progress value={project.progress || 10} className="h-1.5" />
            <p className="text-xs text-muted-foreground mt-2">
              AI is creating scenes based on your plot and characters
            </p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-card/50 flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
          <TabsTrigger value="characters" className="text-xs">
            Characters {characters?.length ? `(${characters.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="scenes" className="text-xs">
            Scenes {scenes?.length ? `(${scenes.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="soundtrack" className="text-xs">
            <Music className="h-3 w-3 mr-1" />Soundtrack {soundtracks?.length ? `(${soundtracks.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="trailer" className="text-xs">Trailer</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="bg-card/50">
              <CardContent className="p-4">
                {project.thumbnailUrl ? (
                  <div className="aspect-video rounded-md overflow-hidden bg-muted">
                    <img src={project.thumbnailUrl} alt={project.title} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="aspect-video rounded-md bg-muted/50 flex items-center justify-center">
                    <Film className="h-10 w-10 text-muted-foreground/30" />
                  </div>
                )}
                <div className="mt-3 flex items-center gap-2">
                  <Badge variant="outline" className="text-xs capitalize">{project.status}</Badge>
                  <Badge variant="outline" className="text-xs">{project.resolution}</Badge>
                  <Badge variant="outline" className="text-xs capitalize">{project.quality}</Badge>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card/50 lg:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Project Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {project.description && <p className="text-sm text-muted-foreground">{project.description}</p>}
                {project.plotSummary && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Plot Summary</Label>
                    <p className="text-sm mt-1 leading-relaxed">{project.plotSummary}</p>
                  </div>
                )}
                {!project.plotSummary && !project.description && (
                  <p className="text-sm text-muted-foreground/60">No description added yet.</p>
                )}
              </CardContent>
            </Card>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <Card className="bg-card/50">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-semibold">{scenes?.length || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Scenes</p>
              </CardContent>
            </Card>
            <Card className="bg-card/50">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-semibold">{characters?.length || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Characters</p>
              </CardContent>
            </Card>
            <Card className="bg-card/50">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-semibold">{soundtracks?.length || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Tracks</p>
              </CardContent>
            </Card>
            <Card className="bg-card/50">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-semibold">{jobs?.filter(j => j.status === "completed").length || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Generations</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Characters Tab */}
        <TabsContent value="characters" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Characters in this project</p>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setAiCharDialogOpen(true)}>
                <Wand2 className="h-4 w-4 mr-1" />
                AI Generate
              </Button>
              <Button size="sm" variant="outline" onClick={() => setCharDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Upload Photo
              </Button>
            </div>
          </div>
          {!characters?.length ? (
            <Card className="bg-card/50 border-dashed">
              <CardContent className="p-10 flex flex-col items-center text-center">
                <Users className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground mb-1">No characters added yet</p>
                <p className="text-xs text-muted-foreground/60 mb-4">Upload a photo or generate an AI character</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setAiCharDialogOpen(true)}>
                    <Wand2 className="h-4 w-4 mr-1" />AI Generate
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setCharDialogOpen(true)}>
                    <Upload className="h-4 w-4 mr-1" />Upload Photo
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {characters.map((char) => {
                const attrs = (char.attributes || {}) as any;
                return (
                  <Card key={char.id} className="bg-card/50 group relative">
                    <CardContent className="p-3">
                      {char.photoUrl ? (
                        <div className="aspect-square rounded-md overflow-hidden mb-2 bg-muted">
                          <img src={char.photoUrl} alt={char.name} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="aspect-square rounded-md mb-2 bg-muted/50 flex items-center justify-center">
                          <User className="h-8 w-8 text-muted-foreground/30" />
                        </div>
                      )}
                      <p className="text-sm font-medium truncate">{char.name}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        {attrs.aiGenerated && <Badge variant="secondary" className="text-[10px] px-1 py-0">AI</Badge>}
                        <p className="text-xs text-muted-foreground truncate">
                          {[attrs.role, attrs.age || attrs.ageRange, attrs.gender].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      <button
                        className="absolute top-2 right-2 h-6 w-6 bg-destructive/80 rounded-full items-center justify-center hidden group-hover:flex"
                        onClick={() => deleteCharMutation.mutate({ id: char.id })}
                      >
                        <X className="h-3 w-3 text-white" />
                      </button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Scenes Tab */}
        <TabsContent value="scenes" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {scenes?.length ? `${scenes.length} scenes` : "No scenes yet"}
            </p>
            <Button size="sm" variant="outline" onClick={() => setLocation(`/projects/${project.id}/scenes`)}>
              <Layers className="h-4 w-4 mr-1" />
              Open Scene Editor
            </Button>
          </div>
          {scenes?.length ? (
            <div className="space-y-2">
              {scenes.map((scene, idx) => (
                <Card key={scene.id} className="bg-card/50">
                  <CardContent className="p-3 flex items-center gap-3">
                    {scene.thumbnailUrl ? (
                      <div className="h-14 w-20 rounded overflow-hidden bg-muted shrink-0">
                        <img src={scene.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="h-14 w-20 rounded bg-muted/50 flex items-center justify-center shrink-0">
                        <ImageIcon className="h-5 w-5 text-muted-foreground/30" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">#{idx + 1}</span>
                        <p className="text-sm font-medium truncate">{scene.title || "Untitled Scene"}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {[scene.timeOfDay, scene.locationType, scene.mood].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs capitalize shrink-0">{scene.status}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-card/50 border-dashed">
              <CardContent className="p-10 flex flex-col items-center text-center">
                <Clapperboard className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground mb-3">
                  {project.mode === "quick" ? "Generate your film to create scenes automatically" : "Open the scene editor to start crafting scenes"}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Soundtrack Tab */}
        <TabsContent value="soundtrack" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Background music and soundtrack</p>
              <p className="text-xs text-muted-foreground/60 mt-0.5">Add tracks for the overall film or assign to specific scenes</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setSoundtrackDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add Track
            </Button>
          </div>
          {!soundtracks?.length ? (
            <Card className="bg-card/50 border-dashed">
              <CardContent className="p-10 flex flex-col items-center text-center">
                <Music className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground mb-3">No soundtracks added yet</p>
                <Button size="sm" variant="outline" onClick={() => setSoundtrackDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />Add Track
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {soundtracks.map((track) => (
                <Card key={track.id} className="bg-card/50 group">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                      <Music className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{track.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {[track.artist, track.genre, track.mood].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Volume2 className="h-3 w-3" />
                        {Math.round((track.volume || 0.7) * 100)}%
                      </div>
                      {track.fileUrl && (
                        <audio controls className="h-8 w-36" src={track.fileUrl} preload="none" />
                      )}
                      <button
                        className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        onClick={() => deleteSoundtrackMutation.mutate({ id: track.id })}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Trailer Tab */}
        <TabsContent value="trailer" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">AI-generated movie trailer</p>
              <p className="text-xs text-muted-foreground/60 mt-0.5">All trailers are G-rated and spoiler-free</p>
            </div>
            <Button
              size="sm"
              onClick={() => trailerMutation.mutate({ projectId: project.id })}
              disabled={trailerMutation.isPending || !scenes?.length}
            >
              {trailerMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Generating...</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-1" />Generate Trailer</>
              )}
            </Button>
          </div>
          {!scenes?.length && (
            <Card className="bg-card/50 border-dashed">
              <CardContent className="p-10 flex flex-col items-center text-center">
                <Play className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">Create scenes first before generating a trailer</p>
              </CardContent>
            </Card>
          )}
          {trailerData && (
            <Card className="bg-card/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">{trailerData.trailerTitle || "Movie Trailer"}</CardTitle>
                {trailerData.tagline && <p className="text-xs text-muted-foreground italic">{trailerData.tagline}</p>}
              </CardHeader>
              <CardContent className="space-y-3">
                {trailerData.trailerImages?.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {trailerData.trailerImages.map((url: string, i: number) => (
                      <div key={i} className="aspect-video rounded-md overflow-hidden bg-muted">
                        <img src={url} alt={`Trailer shot ${i + 1}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}
                {trailerData.trailerScenes?.length > 0 && (
                  <div className="space-y-2 mt-3">
                    {trailerData.trailerScenes
                      .sort((a: any, b: any) => a.trailerOrder - b.trailerOrder)
                      .map((ts: any, i: number) => (
                        <div key={i} className="flex items-start gap-2">
                          <span className="text-xs text-primary font-medium mt-0.5 shrink-0">{i + 1}.</span>
                          <p className="text-xs text-muted-foreground">{ts.trailerDescription}</p>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Character (Photo Upload) Dialog */}
      <Dialog open={charDialogOpen} onOpenChange={setCharDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">Add Character with Photo</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!charForm.name.trim()) { toast.error("Name is required"); return; }
              createCharMutation.mutate({
                projectId,
                name: charForm.name.trim(),
                description: charForm.description.trim() || undefined,
                photoUrl: charForm.photoUrl || undefined,
                attributes: {
                  age: charForm.age || undefined,
                  gender: charForm.gender || undefined,
                  ethnicity: charForm.ethnicity || undefined,
                  build: charForm.build || undefined,
                  hairColor: charForm.hairColor || undefined,
                  role: charForm.role || undefined,
                },
              });
            }}
            className="space-y-4 mt-2"
          >
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Character Photo</Label>
              <div className="flex items-center gap-4">
                {charForm.photoUrl ? (
                  <div className="relative h-20 w-20 rounded-md overflow-hidden bg-muted shrink-0">
                    <img src={charForm.photoUrl} alt="" className="w-full h-full object-cover" />
                    <button type="button" className="absolute top-1 right-1 h-5 w-5 bg-black/60 rounded-full flex items-center justify-center"
                      onClick={() => setCharForm(p => ({ ...p, photoUrl: "" }))}>
                      <X className="h-3 w-3 text-white" />
                    </button>
                  </div>
                ) : (
                  <div className="h-20 w-20 rounded-md border border-dashed flex items-center justify-center cursor-pointer hover:border-primary/40 transition-colors shrink-0"
                    onClick={() => fileRef.current?.click()}>
                    {uploading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : <Upload className="h-5 w-5 text-muted-foreground" />}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">JPG, PNG up to 10MB</p>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Name <span className="text-destructive">*</span></Label>
              <Input placeholder="Character name" value={charForm.name} onChange={e => setCharForm(p => ({ ...p, name: e.target.value }))} className="h-9 text-sm bg-background/50" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Role in Story</Label>
              <Select value={charForm.role} onValueChange={v => setCharForm(p => ({ ...p, role: v }))}>
                <SelectTrigger className="h-9 text-sm bg-background/50"><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="protagonist">Protagonist</SelectItem>
                  <SelectItem value="antagonist">Antagonist</SelectItem>
                  <SelectItem value="supporting">Supporting</SelectItem>
                  <SelectItem value="minor">Minor</SelectItem>
                  <SelectItem value="extra">Extra</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Age</Label>
                <Input placeholder="e.g. 35" value={charForm.age} onChange={e => setCharForm(p => ({ ...p, age: e.target.value }))} className="h-9 text-sm bg-background/50" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Gender</Label>
                <Select value={charForm.gender} onValueChange={v => setCharForm(p => ({ ...p, gender: v }))}>
                  <SelectTrigger className="h-9 text-sm bg-background/50"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="non-binary">Non-binary</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Ethnicity</Label>
                <Input placeholder="e.g. Caucasian" value={charForm.ethnicity} onChange={e => setCharForm(p => ({ ...p, ethnicity: e.target.value }))} className="h-9 text-sm bg-background/50" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Build</Label>
                <Select value={charForm.build} onValueChange={v => setCharForm(p => ({ ...p, build: v }))}>
                  <SelectTrigger className="h-9 text-sm bg-background/50"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="slim">Slim</SelectItem>
                    <SelectItem value="average">Average</SelectItem>
                    <SelectItem value="athletic">Athletic</SelectItem>
                    <SelectItem value="muscular">Muscular</SelectItem>
                    <SelectItem value="heavy">Heavy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Hair Color</Label>
              <Input placeholder="e.g. Black, Blonde" value={charForm.hairColor} onChange={e => setCharForm(p => ({ ...p, hairColor: e.target.value }))} className="h-9 text-sm bg-background/50" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Full Description</Label>
              <Textarea placeholder="Personality, background, motivations, distinctive features, wardrobe style..." value={charForm.description} onChange={e => setCharForm(p => ({ ...p, description: e.target.value }))} className="min-h-[80px] text-sm bg-background/50 resize-y" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setCharDialogOpen(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={createCharMutation.isPending}>
                {createCharMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Add Character
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* AI Character Generator Dialog */}
      <Dialog open={aiCharDialogOpen} onOpenChange={setAiCharDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-primary" />
              AI Character Generator
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Select physical features and AI will generate a Hollywood-quality photorealistic character portrait
            </p>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!aiCharForm.name.trim()) { toast.error("Character name is required"); return; }
              if (!aiCharForm.gender) { toast.error("Gender is required"); return; }
              if (!aiCharForm.ageRange) { toast.error("Age range is required"); return; }
              if (!aiCharForm.ethnicity) { toast.error("Ethnicity is required"); return; }
              if (!aiCharForm.hairColor) { toast.error("Hair color is required"); return; }
              if (!aiCharForm.hairStyle) { toast.error("Hair style is required"); return; }
              if (!aiCharForm.eyeColor) { toast.error("Eye color is required"); return; }
              aiCharMutation.mutate({
                name: aiCharForm.name.trim(),
                projectId: projectId,
                features: {
                  ageRange: aiCharForm.ageRange,
                  gender: aiCharForm.gender,
                  ethnicity: aiCharForm.ethnicity,
                  skinTone: aiCharForm.skinTone || undefined,
                  build: aiCharForm.build || undefined,
                  height: aiCharForm.height || undefined,
                  hairColor: aiCharForm.hairColor,
                  hairStyle: aiCharForm.hairStyle,
                  eyeColor: aiCharForm.eyeColor,
                  facialFeatures: aiCharForm.facialFeatures || undefined,
                  facialHair: aiCharForm.facialHair || undefined,
                  distinguishingMarks: aiCharForm.distinguishingMarks || undefined,
                  clothingStyle: aiCharForm.clothingStyle || undefined,
                  expression: aiCharForm.expression || undefined,
                  additionalNotes: aiCharForm.additionalNotes || undefined,
                },
              });
            }}
            className="space-y-4 mt-2"
          >
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Character Name <span className="text-destructive">*</span></Label>
              <Input placeholder="e.g. Detective Marcus Cole" value={aiCharForm.name} onChange={e => setAiCharForm(p => ({ ...p, name: e.target.value }))} className="h-9 text-sm bg-background/50" />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Gender <span className="text-destructive">*</span></Label>
                <Select value={aiCharForm.gender} onValueChange={v => setAiCharForm(p => ({ ...p, gender: v }))}>
                  <SelectTrigger className="h-9 text-sm bg-background/50"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="non-binary">Non-binary</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Age Range <span className="text-destructive">*</span></Label>
                <Select value={aiCharForm.ageRange} onValueChange={v => setAiCharForm(p => ({ ...p, ageRange: v }))}>
                  <SelectTrigger className="h-9 text-sm bg-background/50"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="teens">Teens (13-19)</SelectItem>
                    <SelectItem value="20s">20s</SelectItem>
                    <SelectItem value="30s">30s</SelectItem>
                    <SelectItem value="40s">40s</SelectItem>
                    <SelectItem value="50s">50s</SelectItem>
                    <SelectItem value="60s">60s</SelectItem>
                    <SelectItem value="70s+">70s+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Ethnicity <span className="text-destructive">*</span></Label>
                <Select value={aiCharForm.ethnicity} onValueChange={v => setAiCharForm(p => ({ ...p, ethnicity: v }))}>
                  <SelectTrigger className="h-9 text-sm bg-background/50"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Caucasian">Caucasian</SelectItem>
                    <SelectItem value="African">African</SelectItem>
                    <SelectItem value="African American">African American</SelectItem>
                    <SelectItem value="East Asian">East Asian</SelectItem>
                    <SelectItem value="South Asian">South Asian</SelectItem>
                    <SelectItem value="Southeast Asian">Southeast Asian</SelectItem>
                    <SelectItem value="Middle Eastern">Middle Eastern</SelectItem>
                    <SelectItem value="Latino/Hispanic">Latino/Hispanic</SelectItem>
                    <SelectItem value="Native American">Native American</SelectItem>
                    <SelectItem value="Pacific Islander">Pacific Islander</SelectItem>
                    <SelectItem value="Mixed">Mixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Skin Tone</Label>
                <Select value={aiCharForm.skinTone} onValueChange={v => setAiCharForm(p => ({ ...p, skinTone: v }))}>
                  <SelectTrigger className="h-9 text-sm bg-background/50"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="very fair">Very Fair</SelectItem>
                    <SelectItem value="fair">Fair</SelectItem>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="olive">Olive</SelectItem>
                    <SelectItem value="tan">Tan</SelectItem>
                    <SelectItem value="brown">Brown</SelectItem>
                    <SelectItem value="dark brown">Dark Brown</SelectItem>
                    <SelectItem value="deep">Deep</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Build</Label>
                <Select value={aiCharForm.build} onValueChange={v => setAiCharForm(p => ({ ...p, build: v }))}>
                  <SelectTrigger className="h-9 text-sm bg-background/50"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="petite">Petite</SelectItem>
                    <SelectItem value="slim">Slim</SelectItem>
                    <SelectItem value="average">Average</SelectItem>
                    <SelectItem value="athletic">Athletic</SelectItem>
                    <SelectItem value="muscular">Muscular</SelectItem>
                    <SelectItem value="stocky">Stocky</SelectItem>
                    <SelectItem value="heavy">Heavy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Height</Label>
                <Select value={aiCharForm.height} onValueChange={v => setAiCharForm(p => ({ ...p, height: v }))}>
                  <SelectTrigger className="h-9 text-sm bg-background/50"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short">Short</SelectItem>
                    <SelectItem value="below average">Below Average</SelectItem>
                    <SelectItem value="average">Average</SelectItem>
                    <SelectItem value="above average">Above Average</SelectItem>
                    <SelectItem value="tall">Tall</SelectItem>
                    <SelectItem value="very tall">Very Tall</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Hair Color <span className="text-destructive">*</span></Label>
                <Select value={aiCharForm.hairColor} onValueChange={v => setAiCharForm(p => ({ ...p, hairColor: v }))}>
                  <SelectTrigger className="h-9 text-sm bg-background/50"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="black">Black</SelectItem>
                    <SelectItem value="dark brown">Dark Brown</SelectItem>
                    <SelectItem value="brown">Brown</SelectItem>
                    <SelectItem value="light brown">Light Brown</SelectItem>
                    <SelectItem value="blonde">Blonde</SelectItem>
                    <SelectItem value="platinum blonde">Platinum Blonde</SelectItem>
                    <SelectItem value="red">Red</SelectItem>
                    <SelectItem value="auburn">Auburn</SelectItem>
                    <SelectItem value="gray">Gray</SelectItem>
                    <SelectItem value="white">White</SelectItem>
                    <SelectItem value="bald">Bald</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Hair Style <span className="text-destructive">*</span></Label>
                <Select value={aiCharForm.hairStyle} onValueChange={v => setAiCharForm(p => ({ ...p, hairStyle: v }))}>
                  <SelectTrigger className="h-9 text-sm bg-background/50"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short cropped">Short Cropped</SelectItem>
                    <SelectItem value="buzz cut">Buzz Cut</SelectItem>
                    <SelectItem value="slicked back">Slicked Back</SelectItem>
                    <SelectItem value="wavy medium-length">Wavy Medium</SelectItem>
                    <SelectItem value="long straight">Long Straight</SelectItem>
                    <SelectItem value="long wavy">Long Wavy</SelectItem>
                    <SelectItem value="curly">Curly</SelectItem>
                    <SelectItem value="afro">Afro</SelectItem>
                    <SelectItem value="braided">Braided</SelectItem>
                    <SelectItem value="ponytail">Ponytail</SelectItem>
                    <SelectItem value="bob">Bob</SelectItem>
                    <SelectItem value="pixie cut">Pixie Cut</SelectItem>
                    <SelectItem value="dreadlocks">Dreadlocks</SelectItem>
                    <SelectItem value="mohawk">Mohawk</SelectItem>
                    <SelectItem value="shaved sides">Shaved Sides</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Eye Color <span className="text-destructive">*</span></Label>
                <Select value={aiCharForm.eyeColor} onValueChange={v => setAiCharForm(p => ({ ...p, eyeColor: v }))}>
                  <SelectTrigger className="h-9 text-sm bg-background/50"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="brown">Brown</SelectItem>
                    <SelectItem value="dark brown">Dark Brown</SelectItem>
                    <SelectItem value="hazel">Hazel</SelectItem>
                    <SelectItem value="green">Green</SelectItem>
                    <SelectItem value="blue">Blue</SelectItem>
                    <SelectItem value="gray">Gray</SelectItem>
                    <SelectItem value="amber">Amber</SelectItem>
                    <SelectItem value="black">Black</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Facial Features</Label>
                <Input placeholder="e.g. sharp jawline, high cheekbones" value={aiCharForm.facialFeatures} onChange={e => setAiCharForm(p => ({ ...p, facialFeatures: e.target.value }))} className="h-9 text-sm bg-background/50" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Facial Hair</Label>
                <Select value={aiCharForm.facialHair} onValueChange={v => setAiCharForm(p => ({ ...p, facialHair: v }))}>
                  <SelectTrigger className="h-9 text-sm bg-background/50"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None / Clean-shaven</SelectItem>
                    <SelectItem value="light stubble">Light Stubble</SelectItem>
                    <SelectItem value="heavy stubble">Heavy Stubble</SelectItem>
                    <SelectItem value="short beard">Short Beard</SelectItem>
                    <SelectItem value="full beard">Full Beard</SelectItem>
                    <SelectItem value="goatee">Goatee</SelectItem>
                    <SelectItem value="mustache">Mustache</SelectItem>
                    <SelectItem value="handlebar mustache">Handlebar Mustache</SelectItem>
                    <SelectItem value="sideburns">Sideburns</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Distinguishing Marks</Label>
                <Input placeholder="e.g. scar on left cheek, freckles, tattoo on neck" value={aiCharForm.distinguishingMarks} onChange={e => setAiCharForm(p => ({ ...p, distinguishingMarks: e.target.value }))} className="h-9 text-sm bg-background/50" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Expression</Label>
                <Select value={aiCharForm.expression} onValueChange={v => setAiCharForm(p => ({ ...p, expression: v }))}>
                  <SelectTrigger className="h-9 text-sm bg-background/50"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="neutral">Neutral</SelectItem>
                    <SelectItem value="confident">Confident</SelectItem>
                    <SelectItem value="serious">Serious</SelectItem>
                    <SelectItem value="warm and friendly">Warm & Friendly</SelectItem>
                    <SelectItem value="mysterious">Mysterious</SelectItem>
                    <SelectItem value="intense">Intense</SelectItem>
                    <SelectItem value="gentle">Gentle</SelectItem>
                    <SelectItem value="determined">Determined</SelectItem>
                    <SelectItem value="menacing">Menacing</SelectItem>
                    <SelectItem value="playful">Playful</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Clothing Style</Label>
              <Input placeholder="e.g. tailored black suit, leather jacket, military uniform" value={aiCharForm.clothingStyle} onChange={e => setAiCharForm(p => ({ ...p, clothingStyle: e.target.value }))} className="h-9 text-sm bg-background/50" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Additional Notes</Label>
              <Textarea placeholder="Any other details about this character's appearance..." value={aiCharForm.additionalNotes} onChange={e => setAiCharForm(p => ({ ...p, additionalNotes: e.target.value }))} className="min-h-[60px] text-sm bg-background/50 resize-y" />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setAiCharDialogOpen(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={aiCharMutation.isPending}>
                {aiCharMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-1" />Generating Portrait...</>
                ) : (
                  <><Wand2 className="h-4 w-4 mr-1" />Generate Character</>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Soundtrack Dialog */}
      <Dialog open={soundtrackDialogOpen} onOpenChange={setSoundtrackDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Music className="h-4 w-4 text-primary" />
              Add Soundtrack
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!soundtrackForm.title.trim()) { toast.error("Title is required"); return; }
              const audioUrl = (window as any).__pendingAudioUrl;
              const audioKey = (window as any).__pendingAudioKey;
              createSoundtrackMutation.mutate({
                projectId,
                title: soundtrackForm.title.trim(),
                artist: soundtrackForm.artist.trim() || undefined,
                genre: soundtrackForm.genre || undefined,
                mood: soundtrackForm.mood || undefined,
                notes: soundtrackForm.notes.trim() || undefined,
                volume: soundtrackForm.volume,
                fadeIn: soundtrackForm.fadeIn,
                fadeOut: soundtrackForm.fadeOut,
                loop: soundtrackForm.loop,
                fileUrl: audioUrl || undefined,
                fileKey: audioKey || undefined,
              });
              (window as any).__pendingAudioUrl = undefined;
              (window as any).__pendingAudioKey = undefined;
            }}
            className="space-y-4 mt-2"
          >
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Audio File</Label>
              <div className="flex items-center gap-3">
                <Button type="button" variant="outline" size="sm" onClick={() => audioRef.current?.click()} disabled={audioUploading}>
                  {audioUploading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Upload className="h-4 w-4 mr-1" />}
                  Upload Audio
                </Button>
                <p className="text-xs text-muted-foreground">MP3, WAV, OGG up to 16MB</p>
                <input ref={audioRef} type="file" accept="audio/*" className="hidden" onChange={handleAudioUpload} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Track Title <span className="text-destructive">*</span></Label>
              <Input placeholder="e.g. Main Theme" value={soundtrackForm.title} onChange={e => setSoundtrackForm(p => ({ ...p, title: e.target.value }))} className="h-9 text-sm bg-background/50" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Artist / Composer</Label>
              <Input placeholder="e.g. Hans Zimmer" value={soundtrackForm.artist} onChange={e => setSoundtrackForm(p => ({ ...p, artist: e.target.value }))} className="h-9 text-sm bg-background/50" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Genre</Label>
                <Select value={soundtrackForm.genre} onValueChange={v => setSoundtrackForm(p => ({ ...p, genre: v }))}>
                  <SelectTrigger className="h-9 text-sm bg-background/50"><SelectValue placeholder="Select genre" /></SelectTrigger>
                  <SelectContent>
                    {GENRE_MUSIC_OPTIONS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Mood</Label>
                <Select value={soundtrackForm.mood} onValueChange={v => setSoundtrackForm(p => ({ ...p, mood: v }))}>
                  <SelectTrigger className="h-9 text-sm bg-background/50"><SelectValue placeholder="Select mood" /></SelectTrigger>
                  <SelectContent>
                    {MOOD_OPTIONS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Volume: {Math.round(soundtrackForm.volume * 100)}%</Label>
              <Slider
                value={[soundtrackForm.volume]}
                onValueChange={([v]) => setSoundtrackForm(p => ({ ...p, volume: v }))}
                min={0} max={1} step={0.05}
                className="w-full"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Fade In (sec)</Label>
                <Input type="number" min={0} max={30} value={soundtrackForm.fadeIn} onChange={e => setSoundtrackForm(p => ({ ...p, fadeIn: Number(e.target.value) }))} className="h-9 text-sm bg-background/50" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Fade Out (sec)</Label>
                <Input type="number" min={0} max={30} value={soundtrackForm.fadeOut} onChange={e => setSoundtrackForm(p => ({ ...p, fadeOut: Number(e.target.value) }))} className="h-9 text-sm bg-background/50" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Loop</Label>
                <Select value={String(soundtrackForm.loop)} onValueChange={v => setSoundtrackForm(p => ({ ...p, loop: Number(v) }))}>
                  <SelectTrigger className="h-9 text-sm bg-background/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">No Loop</SelectItem>
                    <SelectItem value="1">Loop</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Director Notes</Label>
              <Textarea placeholder="Notes about when and how to use this track..." value={soundtrackForm.notes} onChange={e => setSoundtrackForm(p => ({ ...p, notes: e.target.value }))} className="min-h-[60px] text-sm bg-background/50 resize-y" />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setSoundtrackDialogOpen(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={createSoundtrackMutation.isPending}>
                {createSoundtrackMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Add Soundtrack
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
