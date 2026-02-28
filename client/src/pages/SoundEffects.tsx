import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Plus,
  Loader2,
  Trash2,
  Volume2,
  VolumeX,
  Upload,
  Play,
  Pause,
  Search,
  Music,
  Zap,
  Wind,
  Droplets,
  CloudLightning,
  Footprints,
  Car,
  Bird,
  Flame,
  Waves,
  TreePine,
  DoorOpen,
  Clock,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLocation, useParams } from "wouter";
import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";

// Standard preset sound effects library
const PRESET_SOUNDS = [
  // Nature
  { name: "Rain (Light)", category: "Nature", tags: "rain,drizzle,weather,nature" },
  { name: "Rain (Heavy)", category: "Nature", tags: "rain,storm,downpour,weather" },
  { name: "Thunder", category: "Nature", tags: "thunder,storm,lightning,weather" },
  { name: "Wind (Gentle)", category: "Nature", tags: "wind,breeze,nature" },
  { name: "Wind (Strong)", category: "Nature", tags: "wind,gale,storm" },
  { name: "Ocean Waves", category: "Nature", tags: "ocean,waves,sea,water,beach" },
  { name: "River Stream", category: "Nature", tags: "river,stream,water,flowing" },
  { name: "Birds Chirping", category: "Nature", tags: "birds,chirping,morning,nature" },
  { name: "Crickets", category: "Nature", tags: "crickets,night,insects,nature" },
  { name: "Rustling Leaves", category: "Nature", tags: "leaves,trees,wind,forest" },
  { name: "Fire Crackling", category: "Nature", tags: "fire,crackling,campfire,flames" },
  { name: "Waterfall", category: "Nature", tags: "waterfall,water,nature,cascade" },

  // Urban
  { name: "City Traffic", category: "Urban", tags: "traffic,city,cars,urban,street" },
  { name: "Car Horn", category: "Urban", tags: "horn,car,traffic,city" },
  { name: "Car Engine Start", category: "Urban", tags: "car,engine,start,vehicle" },
  { name: "Car Door Slam", category: "Urban", tags: "car,door,slam,vehicle" },
  { name: "Tire Screech", category: "Urban", tags: "tire,screech,car,chase" },
  { name: "Siren (Police)", category: "Urban", tags: "siren,police,emergency" },
  { name: "Siren (Ambulance)", category: "Urban", tags: "siren,ambulance,emergency" },
  { name: "Subway Train", category: "Urban", tags: "subway,train,metro,underground" },
  { name: "Crowd Murmur", category: "Urban", tags: "crowd,people,murmur,background" },
  { name: "Construction", category: "Urban", tags: "construction,building,drill,hammer" },
  { name: "Helicopter", category: "Urban", tags: "helicopter,flying,chopper,aerial" },

  // Indoor
  { name: "Door Open/Close", category: "Indoor", tags: "door,open,close,creak" },
  { name: "Door Knock", category: "Indoor", tags: "door,knock,knocking" },
  { name: "Footsteps (Wood)", category: "Indoor", tags: "footsteps,walking,wood,floor" },
  { name: "Footsteps (Tile)", category: "Indoor", tags: "footsteps,walking,tile,floor" },
  { name: "Footsteps (Gravel)", category: "Indoor", tags: "footsteps,walking,gravel,outdoor" },
  { name: "Glass Breaking", category: "Indoor", tags: "glass,breaking,shatter,crash" },
  { name: "Phone Ringing", category: "Indoor", tags: "phone,ringing,telephone,call" },
  { name: "Clock Ticking", category: "Indoor", tags: "clock,ticking,time,suspense" },
  { name: "Keyboard Typing", category: "Indoor", tags: "keyboard,typing,computer,office" },
  { name: "Paper Rustling", category: "Indoor", tags: "paper,rustling,document,office" },

  // Action
  { name: "Gunshot (Single)", category: "Action", tags: "gunshot,gun,shot,weapon" },
  { name: "Gunshot (Burst)", category: "Action", tags: "gunshot,burst,automatic,weapon" },
  { name: "Explosion (Small)", category: "Action", tags: "explosion,blast,small" },
  { name: "Explosion (Large)", category: "Action", tags: "explosion,blast,large,boom" },
  { name: "Punch/Hit", category: "Action", tags: "punch,hit,fight,impact" },
  { name: "Sword Clash", category: "Action", tags: "sword,clash,metal,fight" },
  { name: "Body Fall", category: "Action", tags: "body,fall,thud,impact" },
  { name: "Running", category: "Action", tags: "running,chase,footsteps,fast" },
  { name: "Car Chase", category: "Action", tags: "car,chase,speed,pursuit" },
  { name: "Crash/Collision", category: "Action", tags: "crash,collision,impact,accident" },

  // Emotional
  { name: "Heartbeat", category: "Emotional", tags: "heartbeat,heart,tension,suspense" },
  { name: "Breathing (Heavy)", category: "Emotional", tags: "breathing,heavy,tension,fear" },
  { name: "Crying", category: "Emotional", tags: "crying,tears,sad,emotional" },
  { name: "Laughter", category: "Emotional", tags: "laughter,laughing,happy,comedy" },
  { name: "Gasp", category: "Emotional", tags: "gasp,shock,surprise,breath" },
  { name: "Scream", category: "Emotional", tags: "scream,horror,fear,shock" },
  { name: "Whisper", category: "Emotional", tags: "whisper,quiet,secret,intimate" },
  { name: "Applause", category: "Emotional", tags: "applause,clapping,audience,crowd" },

  // Sci-Fi / Fantasy
  { name: "Laser Beam", category: "Sci-Fi", tags: "laser,beam,sci-fi,weapon,space" },
  { name: "Spaceship Engine", category: "Sci-Fi", tags: "spaceship,engine,sci-fi,space" },
  { name: "Teleport", category: "Sci-Fi", tags: "teleport,portal,sci-fi,magic" },
  { name: "Robot Servo", category: "Sci-Fi", tags: "robot,servo,mechanical,sci-fi" },
  { name: "Energy Shield", category: "Sci-Fi", tags: "shield,energy,force-field,sci-fi" },
  { name: "Magic Spell", category: "Sci-Fi", tags: "magic,spell,fantasy,enchant" },
  { name: "Dragon Roar", category: "Sci-Fi", tags: "dragon,roar,fantasy,creature" },
  { name: "Alien Ambience", category: "Sci-Fi", tags: "alien,ambience,space,sci-fi" },

  // Transitions
  { name: "Whoosh", category: "Transition", tags: "whoosh,transition,swipe,fast" },
  { name: "Boom (Impact)", category: "Transition", tags: "boom,impact,transition,hit" },
  { name: "Rise (Tension)", category: "Transition", tags: "rise,tension,building,suspense" },
  { name: "Sting (Dramatic)", category: "Transition", tags: "sting,dramatic,reveal,shock" },
  { name: "Reverse Cymbal", category: "Transition", tags: "cymbal,reverse,transition,build" },
  { name: "Record Scratch", category: "Transition", tags: "record,scratch,comedy,stop" },
];

const CATEGORIES = ["All", "Nature", "Urban", "Indoor", "Action", "Emotional", "Sci-Fi", "Transition", "Custom"] as const;

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Nature: <TreePine className="h-3.5 w-3.5" />,
  Urban: <Car className="h-3.5 w-3.5" />,
  Indoor: <DoorOpen className="h-3.5 w-3.5" />,
  Action: <Zap className="h-3.5 w-3.5" />,
  Emotional: <Music className="h-3.5 w-3.5" />,
  "Sci-Fi": <Waves className="h-3.5 w-3.5" />,
  Transition: <Wind className="h-3.5 w-3.5" />,
  Custom: <Upload className="h-3.5 w-3.5" />,
};

export default function SoundEffects() {
  const { user, loading: authLoading } = useAuth();
  const params = useParams<{ id: string }>();
  const projectId = Number(params.id);
  const [, setLocation] = useLocation();

  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customCategory, setCustomCategory] = useState("Custom");
  const [customTags, setCustomTags] = useState("");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [assignSceneId, setAssignSceneId] = useState<number | null>(null);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedSoundForAssign, setSelectedSoundForAssign] = useState<string>("");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const project = trpc.project.get.useQuery({ id: projectId }, { enabled: !!user });
  const soundEffects = trpc.soundEffect.list.useQuery({ projectId }, { enabled: !!user });
  const scenes = trpc.scene.listByProject.useQuery({ projectId }, { enabled: !!user });
  const addMutation = trpc.soundEffect.create.useMutation({
    onSuccess: () => {
      soundEffects.refetch();
      toast.success("Sound effect added to project");
    },
  });
  const deleteMutation = trpc.soundEffect.delete.useMutation({
    onSuccess: () => {
      soundEffects.refetch();
      toast.success("Sound effect removed");
    },
  });
  const updateMutation = trpc.soundEffect.update.useMutation({
    onSuccess: () => soundEffects.refetch(),
  });
  const uploadMutation = trpc.soundEffect.upload.useMutation({
    onSuccess: () => {
      soundEffects.refetch();
      setShowUploadDialog(false);
      setCustomName("");
      setCustomTags("");
      toast.success("Custom sound uploaded");
    },
  });

  const filteredPresets = PRESET_SOUNDS.filter((s) => {
    const matchesCategory = selectedCategory === "All" || s.category === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.tags.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const projectSounds = soundEffects.data || [];
  const filteredProjectSounds = projectSounds.filter((s) => {
    if (selectedCategory === "Custom") return s.isCustom === 1;
    if (selectedCategory !== "All" && s.category !== selectedCategory) return false;
    if (searchQuery && !s.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const addPresetToProject = (preset: (typeof PRESET_SOUNDS)[0]) => {
    addMutation.mutate({
      projectId,
      name: preset.name,
      category: preset.category,
      tags: preset.tags.split(","),
      isCustom: 0,
      volume: 0.8,
    });
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const fileInput = document.getElementById("sfx-upload") as HTMLInputElement;
    const file = fileInput?.files?.[0];
    if (!file || !customName) return;

    setUploading(true);
    try {
      const buffer = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
      );
      const uploadResult = await uploadMutation.mutateAsync({
        projectId,
        fileName: file.name,
        fileData: base64,
        contentType: file.type,
      });
      // Now create the sound effect entry with the uploaded URL
      addMutation.mutate({
        projectId,
        name: customName,
        category: customCategory,
        tags: customTags ? customTags.split(",").map(t => t.trim()) : [],
        fileUrl: uploadResult.url,
        fileKey: uploadResult.key,
        isCustom: 1,
      });
    } catch {
      toast.error("Failed to upload sound");
    } finally {
      setUploading(false);
    }
  };

  const isPresetAdded = (presetName: string) => {
    return projectSounds.some((s) => s.name === presetName);
  };

  // Web Audio API preview for preset sounds
  const playPreview = (name: string, category: string) => {
    if (playingId === name) {
      setPlayingId(null);
      return;
    }
    setPlayingId(name);
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.2);
      // Different sounds per category
      const catLower = category.toLowerCase();
      if (catLower.includes("explosion") || catLower.includes("impact")) {
        osc.type = "sawtooth"; osc.frequency.setValueAtTime(80, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + 1);
      } else if (catLower.includes("ambient") || catLower.includes("nature")) {
        osc.type = "sine"; osc.frequency.setValueAtTime(220, ctx.currentTime);
      } else if (catLower.includes("sci-fi") || catLower.includes("electronic")) {
        osc.type = "square"; osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.5);
      } else if (catLower.includes("horror") || catLower.includes("tension")) {
        osc.type = "sine"; osc.frequency.setValueAtTime(60, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(120, ctx.currentTime + 1);
      } else if (catLower.includes("weather")) {
        osc.type = "triangle"; osc.frequency.setValueAtTime(300, ctx.currentTime);
      } else if (catLower.includes("vehicle") || catLower.includes("mechanical")) {
        osc.type = "sawtooth"; osc.frequency.setValueAtTime(150, ctx.currentTime);
      } else {
        osc.type = "sine"; osc.frequency.setValueAtTime(330, ctx.currentTime);
      }
      osc.start();
      osc.stop(ctx.currentTime + 1.2);
      setTimeout(() => { setPlayingId(null); ctx.close(); }, 1200);
    } catch {
      setPlayingId(null);
    }
  };

  const handleAssignToScene = (soundName: string) => {
    setSelectedSoundForAssign(soundName);
    setShowAssignDialog(true);
  };

  const confirmAssign = () => {
    if (!assignSceneId || !selectedSoundForAssign) return;
    const sound = projectSounds.find((s) => s.name === selectedSoundForAssign);
    if (sound) {
      updateMutation.mutate({ id: sound.id, sceneId: assignSceneId });
      toast.success(`Assigned "${selectedSoundForAssign}" to scene`);
    }
    setShowAssignDialog(false);
    setAssignSceneId(null);
  };

  if (authLoading || !user) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-background/95 backdrop-blur sticky top-0 z-30">
        <div className="container py-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-9 sm:w-9 shrink-0" onClick={() => setLocation(`/projects/${projectId}`)}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-semibold truncate">Sound Effects Library</h1>
                <p className="text-xs text-muted-foreground truncate">{project.data?.title}</p>
              </div>
            </div>
            <Button onClick={() => setShowUploadDialog(true)} size="sm" className="shrink-0">
              <Upload className="h-4 w-4 mr-2" />
              Upload Custom Sound
            </Button>
          </div>
        </div>
      </div>

      <div className="container py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Categories */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Categories</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-0.5 px-2 pb-3">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 transition-colors ${
                        selectedCategory === cat
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {cat !== "All" && CATEGORY_ICONS[cat]}
                      {cat}
                      {cat !== "All" && (
                        <span className="ml-auto text-xs opacity-70">
                          {cat === "Custom"
                            ? projectSounds.filter((s) => s.isCustom === 1).length
                            : PRESET_SOUNDS.filter((s) => s.category === cat).length}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Project Sounds Summary */}
            <Card className="mt-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Project Sounds</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{projectSounds.length}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {projectSounds.filter((s) => !s.isCustom).length} presets,{" "}
                  {projectSounds.filter((s) => s.isCustom === 1).length} custom
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search sounds by name or tag..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Added to Project */}
            {filteredProjectSounds.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Volume2 className="h-4 w-4 text-primary" />
                  In This Project ({filteredProjectSounds.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredProjectSounds.map((sound) => (
                    <Card key={sound.id} className="group">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium truncate">{sound.name}</span>
                              {sound.isCustom === 1 && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                  Custom
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary" className="text-[10px]">
                                {sound.category}
                              </Badge>
                              {sound.sceneId && (
                                <span className="text-[10px] text-muted-foreground">
                                  Scene #{sound.sceneId}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleAssignToScene(sound.name)}
                            >
                              <Clock className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={() => deleteMutation.mutate({ id: sound.id })}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                        {/* Volume Control */}
                        <div className="flex items-center gap-2 mt-2">
                          <VolumeX className="h-3 w-3 text-muted-foreground" />
                            <Slider
                            value={[Math.round((sound.volume ?? 0.8) * 100)]}
                            min={0}
                            max={100}
                            step={1}
                            onValueChange={([v]) =>
                              updateMutation.mutate({ id: sound.id, volume: v / 100 })
                            }
                            className="flex-1"
                          />
                          <Volume2 className="h-3 w-3 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground w-7 text-right">
                            {Math.round((sound.volume ?? 0.8) * 100)}%
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Preset Library */}
            {selectedCategory !== "Custom" && (
              <div>
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Music className="h-4 w-4 text-primary" />
                  Standard Library ({filteredPresets.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                  {filteredPresets.map((preset) => {
                    const added = isPresetAdded(preset.name);
                    return (
                      <div
                        key={preset.name}
                        className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                          added ? "bg-primary/5 border-primary/20" : "hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{preset.name}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              {preset.category}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => playPreview(preset.name, preset.category)}
                          >
                            {playingId === preset.name ? (
                              <Volume2 className="h-3.5 w-3.5 text-primary animate-pulse" />
                            ) : (
                              <Play className="h-3.5 w-3.5" />
                            )}
                          </Button>
                          <Button
                            variant={added ? "secondary" : "outline"}
                            size="sm"
                            className="h-7 text-xs"
                            disabled={added || addMutation.isPending}
                            onClick={() => addPresetToProject(preset)}
                          >
                            {added ? "Added" : (
                              <>
                                <Plus className="h-3 w-3 mr-1" />
                                Add
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {filteredPresets.length === 0 && filteredProjectSounds.length === 0 && (
              <div className="text-center py-12">
                <Volume2 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No sounds found matching your search.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upload Custom Sound Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Custom Sound Effect</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Sound Name</Label>
              <Input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g., Custom Explosion"
                required
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Category</Label>
              <Select value={customCategory} onValueChange={setCustomCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.filter((c) => c !== "All").map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Tags (comma-separated)</Label>
              <Input
                value={customTags}
                onChange={(e) => setCustomTags(e.target.value)}
                placeholder="e.g., explosion, blast, custom"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Audio File</Label>
              <Input id="sfx-upload" type="file" accept="audio/*" required className="mt-1" />
              <p className="text-[10px] text-muted-foreground mt-1">
                Supports MP3, WAV, OGG, M4A. Max 16MB.
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setShowUploadDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={uploading || uploadMutation.isPending}>
                {uploading || uploadMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Upload
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign to Scene Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Assign to Scene</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Assign "{selectedSoundForAssign}" to a specific scene.
            </p>
            <Select
              value={assignSceneId ? String(assignSceneId) : ""}
              onValueChange={(v) => setAssignSceneId(Number(v))}
            >
              <SelectTrigger><SelectValue placeholder="Select a scene" /></SelectTrigger>
              <SelectContent>
                {(scenes.data || []).map((scene: any) => (
                  <SelectItem key={scene.id} value={String(scene.id)}>
                    {scene.title || `Scene ${scene.orderIndex + 1}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowAssignDialog(false)}>Cancel</Button>
              <Button onClick={confirmAssign} disabled={!assignSceneId}>Assign</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
