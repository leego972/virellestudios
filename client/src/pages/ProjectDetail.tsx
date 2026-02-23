import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
} from "lucide-react";
import { useLocation, useParams } from "wouter";
import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import {
  RATING_OPTIONS,
  GENRE_OPTIONS,
} from "@shared/types";

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const projectId = parseInt(id || "0");
  const [, setLocation] = useLocation();
  const [charDialogOpen, setCharDialogOpen] = useState(false);
  const [trailerDialogOpen, setTrailerDialogOpen] = useState(false);
  const [charForm, setCharForm] = useState({
    name: "", description: "", photoUrl: "",
    age: "", gender: "", ethnicity: "", build: "", hairColor: "", role: "",
  });
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: project, isLoading } = trpc.project.get.useQuery({ id: projectId });
  const { data: scenes } = trpc.scene.listByProject.useQuery({ projectId });
  const { data: characters } = trpc.character.listByProject.useQuery({ projectId });
  const { data: jobs } = trpc.generation.listJobs.useQuery({ projectId });
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
    onSuccess: (result) => {
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
        <div className="flex items-center gap-2 shrink-0">
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
        <TabsList className="bg-card/50">
          <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
          <TabsTrigger value="characters" className="text-xs">
            Characters {characters?.length ? `(${characters.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="scenes" className="text-xs">
            Scenes {scenes?.length ? `(${scenes.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="trailer" className="text-xs">Trailer</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Thumbnail */}
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

            {/* Details */}
            <Card className="bg-card/50 lg:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Project Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {project.description && (
                  <p className="text-sm text-muted-foreground">{project.description}</p>
                )}
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

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3">
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
            <Button size="sm" variant="outline" onClick={() => setCharDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add Character
            </Button>
          </div>
          {!characters?.length ? (
            <Card className="bg-card/50 border-dashed">
              <CardContent className="p-10 flex flex-col items-center text-center">
                <Users className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground mb-3">No characters added yet</p>
                <Button size="sm" variant="outline" onClick={() => setCharDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Character
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {characters.map((char) => {
                const attrs = (char.attributes || {}) as any;
                return (
                  <Card key={char.id} className="bg-card/50">
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
                      {(attrs.role || attrs.age) && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {[attrs.role, attrs.age && `Age ${attrs.age}`, attrs.gender].filter(Boolean).join(" · ")}
                        </p>
                      )}
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

        {/* Trailer Tab */}
        <TabsContent value="trailer" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">AI-generated movie trailer</p>
              <p className="text-xs text-muted-foreground/60 mt-0.5">
                All trailers are G-rated and spoiler-free
              </p>
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
                <p className="text-sm text-muted-foreground">
                  Create scenes first before generating a trailer
                </p>
              </CardContent>
            </Card>
          )}

          {trailerData && (
            <Card className="bg-card/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">{trailerData.trailerTitle || "Movie Trailer"}</CardTitle>
                {trailerData.tagline && (
                  <p className="text-xs text-muted-foreground italic">{trailerData.tagline}</p>
                )}
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

      {/* Add Character Dialog */}
      <Dialog open={charDialogOpen} onOpenChange={setCharDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">Add Character to Project</DialogTitle>
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
            {/* Photo */}
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
                    <SelectItem value="other">Other</SelectItem>
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
    </div>
  );
}
