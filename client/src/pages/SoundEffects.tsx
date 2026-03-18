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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
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
  Sparkles,
  Mic,
  Headphones,
  Sliders,
  Film,
  CheckCircle,
  XCircle,
  AlertCircle,
  RotateCcw,
  Save,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Textarea } from "@/components/ui/textarea";
import { useLocation, useParams } from "wouter";
import { useState, useRef } from "react";
import { toast } from "sonner";

const ADR_STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <AlertCircle className="h-3.5 w-3.5 text-yellow-500" />,
  recorded: <CheckCircle className="h-3.5 w-3.5 text-blue-500" />,
  approved: <CheckCircle className="h-3.5 w-3.5 text-green-500" />,
  rejected: <XCircle className="h-3.5 w-3.5 text-red-500" />,
};

const FOLEY_TYPE_LABELS: Record<string, string> = {
  footsteps: "Footsteps",
  cloth: "Cloth / Costume",
  props: "Props",
  impacts: "Impacts",
  environmental: "Environmental",
  custom: "Custom",
};

const CUE_TYPE_LABELS: Record<string, string> = {
  underscore: "Underscore",
  source_music: "Source Music",
  sting: "Sting",
  theme: "Theme",
  transition: "Transition",
  silence: "Silence / Pause",
};

const REVERB_LABELS: Record<string, string> = {
  none: "No Reverb (Dry)",
  small: "Small Room",
  medium: "Medium Room",
  large: "Large Room / Stage",
  hall: "Concert Hall",
  cathedral: "Cathedral",
};

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
  // ─── Bollywood ───
  { name: "Tabla Rhythm", category: "Bollywood", tags: "tabla,bollywood,indian,percussion,rhythm" },
  { name: "Sitar Melody", category: "Bollywood", tags: "sitar,bollywood,indian,strings,melody" },
  { name: "Dhol Drum", category: "Bollywood", tags: "dhol,bollywood,indian,drum,celebration" },
  { name: "Bollywood Orchestral Swell", category: "Bollywood", tags: "bollywood,orchestral,swell,dramatic,indian" },
  { name: "Monsoon Rain (Mumbai)", category: "Bollywood", tags: "monsoon,rain,mumbai,bollywood,india" },
  { name: "Bazaar Market Ambience", category: "Bollywood", tags: "bazaar,market,india,crowd,ambience" },
  { name: "Temple Bells", category: "Bollywood", tags: "temple,bells,india,spiritual,hindu" },
  { name: "Crowd Celebration (Holi)", category: "Bollywood", tags: "holi,celebration,crowd,india,festival" },
  // ─── Korean Cinema ───
  { name: "Seoul Street Ambience", category: "Korean Cinema", tags: "seoul,korea,street,urban,ambience" },
  { name: "Neon Hum (Seoul Night)", category: "Korean Cinema", tags: "neon,seoul,night,urban,hum" },
  { name: "Subway Rumble", category: "Korean Cinema", tags: "subway,metro,underground,rumble,korea" },
  { name: "Tension Drone (Korean)", category: "Korean Cinema", tags: "tension,drone,korean,thriller,suspense" },
  { name: "Rain on Concrete (Seoul)", category: "Korean Cinema", tags: "rain,concrete,seoul,korea,urban" },
  { name: "Heartbeat Pulse", category: "Korean Cinema", tags: "heartbeat,pulse,tension,thriller,korean" },
  // ─── Japanese Cinema ───
  { name: "Shakuhachi Flute", category: "Japanese Cinema", tags: "shakuhachi,flute,japanese,traditional,zen" },
  { name: "Taiko Drum", category: "Japanese Cinema", tags: "taiko,drum,japanese,traditional,epic" },
  { name: "Koto Strings", category: "Japanese Cinema", tags: "koto,strings,japanese,traditional,melody" },
  { name: "Cherry Blossom Wind", category: "Japanese Cinema", tags: "cherry,blossom,wind,japan,spring" },
  { name: "Cicada Summer (Japan)", category: "Japanese Cinema", tags: "cicada,summer,japan,insects,nature" },
  { name: "Temple Bell (Japan)", category: "Japanese Cinema", tags: "temple,bell,japan,buddhist,spiritual" },
  // ─── Nollywood ───
  { name: "Afrobeats Rhythm", category: "Nollywood", tags: "afrobeats,nigeria,nollywood,rhythm,african" },
  { name: "Talking Drum (Yoruba)", category: "Nollywood", tags: "talking,drum,yoruba,nigeria,african" },
  { name: "Lagos Street Ambience", category: "Nollywood", tags: "lagos,nigeria,street,urban,nollywood" },
  { name: "Tropical Rain (Nigeria)", category: "Nollywood", tags: "rain,tropical,nigeria,nollywood,weather" },
  { name: "Church Choir (Gospel)", category: "Nollywood", tags: "church,choir,gospel,nigeria,spiritual" },
  { name: "Kora Strings", category: "African Cinema", tags: "kora,strings,african,west africa,traditional" },
  { name: "Djembe Drum", category: "African Cinema", tags: "djembe,drum,african,percussion,traditional" },
  { name: "Savanna Ambience", category: "African Cinema", tags: "savanna,africa,nature,wildlife,ambient" },
  // ─── Middle Eastern Cinema ───
  { name: "Oud Melody", category: "Middle Eastern", tags: "oud,arabic,middle eastern,strings,melody" },
  { name: "Darbuka Percussion", category: "Middle Eastern", tags: "darbuka,percussion,arabic,middle eastern,rhythm" },
  { name: "Desert Wind", category: "Middle Eastern", tags: "desert,wind,middle eastern,ambient,sand" },
  { name: "Ney Flute", category: "Middle Eastern", tags: "ney,flute,turkish,middle eastern,traditional" },
  { name: "Qanun Strings", category: "Middle Eastern", tags: "qanun,strings,arabic,middle eastern,traditional" },
  // ─── French Cinema ───
  { name: "Parisian Street Ambience", category: "French Cinema", tags: "paris,france,street,cafe,ambience" },
  { name: "Accordion Melody", category: "French Cinema", tags: "accordion,french,paris,melody,chanson" },
  { name: "Café Interior (Paris)", category: "French Cinema", tags: "cafe,paris,interior,ambience,french" },
  { name: "Seine River Ambience", category: "French Cinema", tags: "seine,river,paris,water,ambient" },
  // ─── Latin American Cinema ───
  { name: "Classical Guitar (Latin)", category: "Latin American", tags: "guitar,latin,classical,spanish,melody" },
  { name: "Mariachi Brass", category: "Latin American", tags: "mariachi,brass,mexican,latin,trumpet" },
  { name: "Samba Percussion", category: "Latin American", tags: "samba,percussion,brazil,latin,rhythm" },
  { name: "Cumbia Rhythm", category: "Latin American", tags: "cumbia,colombia,latin,rhythm,dance" },
  { name: "Tropical Market Ambience", category: "Latin American", tags: "market,tropical,latin,crowd,ambience" },

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
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [generatePrompt, setGeneratePrompt] = useState("");
  const [generateName, setGenerateName] = useState("");
  const [generateDuration, setGenerateDuration] = useState(10);
  const [generateSceneId, setGenerateSceneId] = useState<number | undefined>(undefined);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Post-production state
  const [showAdrDialog, setShowAdrDialog] = useState(false);
  const [showFoleyDialog, setShowFoleyDialog] = useState(false);
  const [showScoreCueDialog, setShowScoreCueDialog] = useState(false);
  const [adrCharacter, setAdrCharacter] = useState("");
  const [adrLine, setAdrLine] = useState("");
  const [adrType, setAdrType] = useState<"adr" | "wild_track" | "loop_group" | "walla">("adr");
  const [adrSceneId, setAdrSceneId] = useState<number | undefined>(undefined);
  const [adrNotes, setAdrNotes] = useState("");
  const [foleyName, setFoleyName] = useState("");
  const [foleyType, setFoleyType] = useState<"footsteps" | "cloth" | "props" | "impacts" | "environmental" | "custom">("custom");
  const [foleyDesc, setFoleyDesc] = useState("");
  const [foleySceneId, setFoleySceneId] = useState<number | undefined>(undefined);
  const [cueNumber, setCueNumber] = useState("");
  const [cueTitle, setCueTitle] = useState("");
  const [cueType, setCueType] = useState<"underscore" | "source_music" | "sting" | "theme" | "transition" | "silence">("underscore");
  const [cueDesc, setCueDesc] = useState("");
  const [cueSceneId, setCueSceneId] = useState<number | undefined>(undefined);
  const [cueFadeIn, setCueFadeIn] = useState(0);
  const [cueFadeOut, setCueFadeOut] = useState(0);
  const [mixSaving, setMixSaving] = useState(false);
  const [mix, setMix] = useState({
    dialogueBus: 0.85, musicBus: 0.70, effectsBus: 0.75, masterVolume: 1.0,
    dialogueEqLow: 0, dialogueEqMid: 0, dialogueEqHigh: 0,
    musicEqLow: 0, musicEqMid: 0, musicEqHigh: 0,
    sfxEqLow: 0, sfxEqMid: 0, sfxEqHigh: 0,
    reverbRoom: "none" as const, reverbAmount: 0,
    compressionRatio: 1.0, noiseReduction: false, notes: "",
  });
  const mixInitialized = useRef(false);

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
  const generateMutation = trpc.soundEffect.generateFromText.useMutation({
    onSuccess: () => {
      soundEffects.refetch();
      setShowGenerateDialog(false);
      setGeneratePrompt("");
      setGenerateName("");
      setGenerateDuration(10);
      setGenerateSceneId(undefined);
      toast.success("Sound effect generated successfully");
    },
    onError: (err) => toast.error(err.message || "Failed to generate sound effect"),
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

  // Post-production queries
  const adrTracks = trpc.filmPost.listAdrTracks.useQuery({ projectId }, { enabled: !!user });
  const foleyTracks = trpc.filmPost.listFoleyTracks.useQuery({ projectId }, { enabled: !!user });
  const scoreCues = trpc.filmPost.listScoreCues.useQuery({ projectId }, { enabled: !!user });
  const mixSettings = trpc.filmPost.getMixSettings.useQuery({ projectId }, { enabled: !!user });

  // Sync mix from DB
  const mixLoaded = mixSettings.data;
  if (mixLoaded && !mixInitialized.current) {
    mixInitialized.current = true;
    setMix({
      dialogueBus: mixLoaded.dialogueBus ?? 0.85,
      musicBus: mixLoaded.musicBus ?? 0.70,
      effectsBus: mixLoaded.effectsBus ?? 0.75,
      masterVolume: mixLoaded.masterVolume ?? 1.0,
      dialogueEqLow: mixLoaded.dialogueEqLow ?? 0,
      dialogueEqMid: mixLoaded.dialogueEqMid ?? 0,
      dialogueEqHigh: mixLoaded.dialogueEqHigh ?? 0,
      musicEqLow: mixLoaded.musicEqLow ?? 0,
      musicEqMid: mixLoaded.musicEqMid ?? 0,
      musicEqHigh: mixLoaded.musicEqHigh ?? 0,
      sfxEqLow: mixLoaded.sfxEqLow ?? 0,
      sfxEqMid: mixLoaded.sfxEqMid ?? 0,
      sfxEqHigh: mixLoaded.sfxEqHigh ?? 0,
      reverbRoom: (mixLoaded.reverbRoom as any) ?? "none",
      reverbAmount: mixLoaded.reverbAmount ?? 0,
      compressionRatio: mixLoaded.compressionRatio ?? 1.0,
      noiseReduction: mixLoaded.noiseReduction ?? false,
      notes: mixLoaded.notes ?? "",
    });
  }

  // Post-production mutations
  const createAdr = trpc.filmPost.createAdrTrack.useMutation({
    onSuccess: () => { adrTracks.refetch(); setShowAdrDialog(false); setAdrCharacter(""); setAdrLine(""); setAdrNotes(""); toast.success("ADR track added"); },
    onError: (e) => toast.error(e.message),
  });
  const deleteAdr = trpc.filmPost.deleteAdrTrack.useMutation({ onSuccess: () => { adrTracks.refetch(); toast.success("ADR track removed"); } });
  const updateAdr = trpc.filmPost.updateAdrTrack.useMutation({ onSuccess: () => adrTracks.refetch() });
  const createFoley = trpc.filmPost.createFoleyTrack.useMutation({
    onSuccess: () => { foleyTracks.refetch(); setShowFoleyDialog(false); setFoleyName(""); setFoleyDesc(""); toast.success("Foley track added"); },
    onError: (e) => toast.error(e.message),
  });
  const deleteFoley = trpc.filmPost.deleteFoleyTrack.useMutation({ onSuccess: () => { foleyTracks.refetch(); toast.success("Foley track removed"); } });
  const updateFoley = trpc.filmPost.updateFoleyTrack.useMutation({ onSuccess: () => foleyTracks.refetch() });
  const createCue = trpc.filmPost.createScoreCue.useMutation({
    onSuccess: () => { scoreCues.refetch(); setShowScoreCueDialog(false); setCueNumber(""); setCueTitle(""); setCueDesc(""); toast.success("Score cue added"); },
    onError: (e) => toast.error(e.message),
  });
  const deleteCue = trpc.filmPost.deleteScoreCue.useMutation({ onSuccess: () => { scoreCues.refetch(); toast.success("Score cue removed"); } });
  const saveMixMutation = trpc.filmPost.saveMixSettings.useMutation({
    onSuccess: () => { mixSettings.refetch(); toast.success("Mix settings saved"); },
    onError: (e) => toast.error(e.message),
  });
  const resetMixMutation = trpc.filmPost.resetMixSettings.useMutation({
    onSuccess: () => {
      mixInitialized.current = false;
      mixSettings.refetch();
      setMix({ dialogueBus: 0.85, musicBus: 0.70, effectsBus: 0.75, masterVolume: 1.0, dialogueEqLow: 0, dialogueEqMid: 0, dialogueEqHigh: 0, musicEqLow: 0, musicEqMid: 0, musicEqHigh: 0, sfxEqLow: 0, sfxEqMid: 0, sfxEqHigh: 0, reverbRoom: "none", reverbAmount: 0, compressionRatio: 1.0, noiseReduction: false, notes: "" });
      toast.success("Mix reset to defaults");
    },
  });

  const handleSaveMix = async () => {
    setMixSaving(true);
    try { await saveMixMutation.mutateAsync({ projectId, ...mix }); }
    finally { setMixSaving(false); }
  };

  const sceneList = scenes.data || [];

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
        <Tabs defaultValue="library">
          <TabsList className="mb-6">
            <TabsTrigger value="library" className="flex items-center gap-2">
              <Music className="h-4 w-4" />
              Sound Library
            </TabsTrigger>
            <TabsTrigger value="postpro" className="flex items-center gap-2">
              <Film className="h-4 w-4" />
              Film Post-Production
            </TabsTrigger>
          </TabsList>

          {/* ── SOUND LIBRARY TAB ── */}
          <TabsContent value="library">
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
                className="pl-10" inputMode="search" autoCapitalize="off" enterKeyHint="search" />
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
          </TabsContent>

          {/* ── FILM POST-PRODUCTION TAB ── */}
          <TabsContent value="postpro">
            <div className="space-y-8">

              {/* ── ADR / DIALOGUE ── */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Mic className="h-5 w-5 text-blue-500" />
                      ADR &amp; Dialogue
                    </CardTitle>
                    <Button size="sm" onClick={() => setShowAdrDialog(true)}>
                      <Plus className="h-4 w-4 mr-1" /> Add ADR Track
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Automated Dialogue Replacement, wild tracks, loop group, and walla sessions.</p>
                </CardHeader>
                <CardContent>
                  {(adrTracks.data || []).length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      <Mic className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      No ADR tracks yet. Add tracks that need replacement or wild recording.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(adrTracks.data || []).map((track: any) => (
                        <div key={track.id} className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30">
                          <div className="mt-0.5">{ADR_STATUS_ICONS[track.status] ?? ADR_STATUS_ICONS.pending}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm">{track.characterName}</span>
                              <Badge variant="outline" className="text-[10px]">{track.trackType?.replace("_", " ").toUpperCase()}</Badge>
                              <Badge variant="secondary" className="text-[10px] capitalize">{track.status}</Badge>
                              {track.sceneId && <span className="text-[10px] text-muted-foreground">Scene #{track.sceneId}</span>}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{track.dialogueLine}</p>
                            {track.notes && <p className="text-[10px] text-muted-foreground mt-0.5 italic">{track.notes}</p>}
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Select
                              value={track.status}
                              onValueChange={(v) => updateAdr.mutate({ id: track.id, status: v as any })}
                            >
                              <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="recorded">Recorded</SelectItem>
                                <SelectItem value="approved">Approved</SelectItem>
                                <SelectItem value="rejected">Rejected</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteAdr.mutate({ id: track.id })}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* ── FOLEY ── */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Footprints className="h-5 w-5 text-amber-500" />
                      Foley
                    </CardTitle>
                    <Button size="sm" onClick={() => setShowFoleyDialog(true)}>
                      <Plus className="h-4 w-4 mr-1" /> Add Foley Track
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Footsteps, cloth, props, impacts, and environmental sounds recorded in sync with picture.</p>
                </CardHeader>
                <CardContent>
                  {(foleyTracks.data || []).length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      <Footprints className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      No Foley tracks yet. Add sounds that need to be recorded in sync with picture.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(foleyTracks.data || []).map((track: any) => (
                        <div key={track.id} className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm">{track.name}</span>
                              <Badge variant="outline" className="text-[10px]">{FOLEY_TYPE_LABELS[track.foleyType] ?? track.foleyType}</Badge>
                              <Badge variant="secondary" className="text-[10px] capitalize">{track.status}</Badge>
                              {track.sceneId && <span className="text-[10px] text-muted-foreground">Scene #{track.sceneId}</span>}
                            </div>
                            {track.description && <p className="text-xs text-muted-foreground mt-1">{track.description}</p>}
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-[10px] text-muted-foreground">Volume:</span>
                              <Slider
                                value={[Math.round((track.volume ?? 0.8) * 100)]}
                                min={0} max={100} step={1}
                                onValueChange={([v]) => updateFoley.mutate({ id: track.id, volume: v / 100 })}
                                className="w-32"
                              />
                              <span className="text-[10px] text-muted-foreground w-8">{Math.round((track.volume ?? 0.8) * 100)}%</span>
                            </div>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Select
                              value={track.status}
                              onValueChange={(v) => updateFoley.mutate({ id: track.id, status: v as any })}
                            >
                              <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="recorded">Recorded</SelectItem>
                                <SelectItem value="approved">Approved</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteFoley.mutate({ id: track.id })}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* ── SCORE / MUSIC CUES ── */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Music className="h-5 w-5 text-purple-500" />
                      Score &amp; Music Cues
                    </CardTitle>
                    <Button size="sm" onClick={() => setShowScoreCueDialog(true)}>
                      <Plus className="h-4 w-4 mr-1" /> Add Cue
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Underscore, source music, stings, and thematic cues assigned to scenes.</p>
                </CardHeader>
                <CardContent>
                  {(scoreCues.data || []).length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      <Music className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      No score cues yet. Map your music cues to scenes.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(scoreCues.data || []).map((cue: any) => (
                        <div key={cue.id} className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              {cue.cueNumber && <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{cue.cueNumber}</span>}
                              <span className="font-medium text-sm">{cue.title}</span>
                              <Badge variant="outline" className="text-[10px]">{CUE_TYPE_LABELS[cue.cueType] ?? cue.cueType}</Badge>
                              {cue.sceneId && <span className="text-[10px] text-muted-foreground">Scene #{cue.sceneId}</span>}
                            </div>
                            {cue.description && <p className="text-xs text-muted-foreground mt-1">{cue.description}</p>}
                            <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground">
                              {cue.fadeInSeconds > 0 && <span>Fade in: {cue.fadeInSeconds}s</span>}
                              {cue.fadeOutSeconds > 0 && <span>Fade out: {cue.fadeOutSeconds}s</span>}
                              {cue.durationSeconds > 0 && <span>Duration: {cue.durationSeconds}s</span>}
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-[10px] text-muted-foreground">Level:</span>
                              <Slider
                                value={[Math.round((cue.volume ?? 0.7) * 100)]}
                                min={0} max={100} step={1}
                                className="w-32"
                                onValueChange={() => {}}
                              />
                              <span className="text-[10px] text-muted-foreground w-8">{Math.round((cue.volume ?? 0.7) * 100)}%</span>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => deleteCue.mutate({ id: cue.id })}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* ── FILM MIX PANEL ── */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Sliders className="h-5 w-5 text-green-500" />
                      Film Mix Panel
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => resetMixMutation.mutate({ projectId })} disabled={resetMixMutation.isPending}>
                        <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset
                      </Button>
                      <Button size="sm" onClick={handleSaveMix} disabled={mixSaving}>
                        {mixSaving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                        Save Mix
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Three-bus film mix: Dialogue, Music, and Effects levels with EQ, reverb, and compression settings.</p>
                </CardHeader>
                <CardContent className="space-y-6">

                  {/* Master */}
                  <div className="p-3 rounded-lg bg-muted/40 border">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold flex items-center gap-2"><Headphones className="h-4 w-4" /> Master Output</h4>
                      <span className="text-sm font-mono">{Math.round(mix.masterVolume * 100)}%</span>
                    </div>
                    <Slider value={[Math.round(mix.masterVolume * 100)]} min={0} max={100} step={1}
                      onValueChange={([v]) => setMix(m => ({ ...m, masterVolume: v / 100 }))} />
                  </div>

                  {/* Three buses */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Dialogue Bus */}
                    <div className="p-3 rounded-lg border space-y-3">
                      <h4 className="text-sm font-semibold text-blue-600 dark:text-blue-400">Dialogue Bus</h4>
                      <div>
                        <div className="flex justify-between text-xs text-muted-foreground mb-1"><span>Level</span><span>{Math.round(mix.dialogueBus * 100)}%</span></div>
                        <Slider value={[Math.round(mix.dialogueBus * 100)]} min={0} max={100} step={1}
                          onValueChange={([v]) => setMix(m => ({ ...m, dialogueBus: v / 100 }))} />
                      </div>
                      <Separator />
                      <div className="space-y-2">
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">EQ</p>
                        <div><div className="flex justify-between text-[10px] text-muted-foreground mb-1"><span>Low (80Hz)</span><span>{mix.dialogueEqLow > 0 ? "+" : ""}{mix.dialogueEqLow}dB</span></div>
                          <Slider value={[mix.dialogueEqLow]} min={-12} max={12} step={1} onValueChange={([v]) => setMix(m => ({ ...m, dialogueEqLow: v }))} /></div>
                        <div><div className="flex justify-between text-[10px] text-muted-foreground mb-1"><span>Mid (1kHz)</span><span>{mix.dialogueEqMid > 0 ? "+" : ""}{mix.dialogueEqMid}dB</span></div>
                          <Slider value={[mix.dialogueEqMid]} min={-12} max={12} step={1} onValueChange={([v]) => setMix(m => ({ ...m, dialogueEqMid: v }))} /></div>
                        <div><div className="flex justify-between text-[10px] text-muted-foreground mb-1"><span>High (8kHz)</span><span>{mix.dialogueEqHigh > 0 ? "+" : ""}{mix.dialogueEqHigh}dB</span></div>
                          <Slider value={[mix.dialogueEqHigh]} min={-12} max={12} step={1} onValueChange={([v]) => setMix(m => ({ ...m, dialogueEqHigh: v }))} /></div>
                      </div>
                    </div>

                    {/* Music Bus */}
                    <div className="p-3 rounded-lg border space-y-3">
                      <h4 className="text-sm font-semibold text-purple-600 dark:text-purple-400">Music Bus</h4>
                      <div>
                        <div className="flex justify-between text-xs text-muted-foreground mb-1"><span>Level</span><span>{Math.round(mix.musicBus * 100)}%</span></div>
                        <Slider value={[Math.round(mix.musicBus * 100)]} min={0} max={100} step={1}
                          onValueChange={([v]) => setMix(m => ({ ...m, musicBus: v / 100 }))} />
                      </div>
                      <Separator />
                      <div className="space-y-2">
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">EQ</p>
                        <div><div className="flex justify-between text-[10px] text-muted-foreground mb-1"><span>Low (80Hz)</span><span>{mix.musicEqLow > 0 ? "+" : ""}{mix.musicEqLow}dB</span></div>
                          <Slider value={[mix.musicEqLow]} min={-12} max={12} step={1} onValueChange={([v]) => setMix(m => ({ ...m, musicEqLow: v }))} /></div>
                        <div><div className="flex justify-between text-[10px] text-muted-foreground mb-1"><span>Mid (1kHz)</span><span>{mix.musicEqMid > 0 ? "+" : ""}{mix.musicEqMid}dB</span></div>
                          <Slider value={[mix.musicEqMid]} min={-12} max={12} step={1} onValueChange={([v]) => setMix(m => ({ ...m, musicEqMid: v }))} /></div>
                        <div><div className="flex justify-between text-[10px] text-muted-foreground mb-1"><span>High (8kHz)</span><span>{mix.musicEqHigh > 0 ? "+" : ""}{mix.musicEqHigh}dB</span></div>
                          <Slider value={[mix.musicEqHigh]} min={-12} max={12} step={1} onValueChange={([v]) => setMix(m => ({ ...m, musicEqHigh: v }))} /></div>
                      </div>
                    </div>

                    {/* Effects Bus */}
                    <div className="p-3 rounded-lg border space-y-3">
                      <h4 className="text-sm font-semibold text-amber-600 dark:text-amber-400">Effects Bus</h4>
                      <div>
                        <div className="flex justify-between text-xs text-muted-foreground mb-1"><span>Level</span><span>{Math.round(mix.effectsBus * 100)}%</span></div>
                        <Slider value={[Math.round(mix.effectsBus * 100)]} min={0} max={100} step={1}
                          onValueChange={([v]) => setMix(m => ({ ...m, effectsBus: v / 100 }))} />
                      </div>
                      <Separator />
                      <div className="space-y-2">
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">EQ</p>
                        <div><div className="flex justify-between text-[10px] text-muted-foreground mb-1"><span>Low (80Hz)</span><span>{mix.sfxEqLow > 0 ? "+" : ""}{mix.sfxEqLow}dB</span></div>
                          <Slider value={[mix.sfxEqLow]} min={-12} max={12} step={1} onValueChange={([v]) => setMix(m => ({ ...m, sfxEqLow: v }))} /></div>
                        <div><div className="flex justify-between text-[10px] text-muted-foreground mb-1"><span>Mid (1kHz)</span><span>{mix.sfxEqMid > 0 ? "+" : ""}{mix.sfxEqMid}dB</span></div>
                          <Slider value={[mix.sfxEqMid]} min={-12} max={12} step={1} onValueChange={([v]) => setMix(m => ({ ...m, sfxEqMid: v }))} /></div>
                        <div><div className="flex justify-between text-[10px] text-muted-foreground mb-1"><span>High (8kHz)</span><span>{mix.sfxEqHigh > 0 ? "+" : ""}{mix.sfxEqHigh}dB</span></div>
                          <Slider value={[mix.sfxEqHigh]} min={-12} max={12} step={1} onValueChange={([v]) => setMix(m => ({ ...m, sfxEqHigh: v }))} /></div>
                      </div>
                    </div>
                  </div>

                  {/* Reverb + Compression + Noise Reduction */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg border space-y-3">
                      <h4 className="text-sm font-semibold">Room Reverb</h4>
                      <Select value={mix.reverbRoom} onValueChange={(v) => setMix(m => ({ ...m, reverbRoom: v as any }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(REVERB_LABELS).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {mix.reverbRoom !== "none" && (
                        <div>
                          <div className="flex justify-between text-xs text-muted-foreground mb-1"><span>Reverb Amount</span><span>{Math.round(mix.reverbAmount * 100)}%</span></div>
                          <Slider value={[Math.round(mix.reverbAmount * 100)]} min={0} max={100} step={1}
                            onValueChange={([v]) => setMix(m => ({ ...m, reverbAmount: v / 100 }))} />
                        </div>
                      )}
                    </div>
                    <div className="p-3 rounded-lg border space-y-3">
                      <h4 className="text-sm font-semibold">Dynamics</h4>
                      <div>
                        <div className="flex justify-between text-xs text-muted-foreground mb-1"><span>Compression Ratio</span><span>{mix.compressionRatio.toFixed(1)}:1</span></div>
                        <Slider value={[Math.round(mix.compressionRatio * 10)]} min={10} max={80} step={5}
                          onValueChange={([v]) => setMix(m => ({ ...m, compressionRatio: v / 10 }))} />
                        <p className="text-[10px] text-muted-foreground mt-1">1:1 = no compression · 8:1 = heavy limiting</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Dialogue Noise Reduction</p>
                          <p className="text-[10px] text-muted-foreground">Apply AI noise reduction to dialogue tracks</p>
                        </div>
                        <Switch checked={mix.noiseReduction} onCheckedChange={(v) => setMix(m => ({ ...m, noiseReduction: v }))} />
                      </div>
                    </div>
                  </div>

                  {/* Mix Notes */}
                  <div>
                    <Label className="text-sm font-medium">Mix Notes / Instructions for Re-recording Mixer</Label>
                    <Textarea
                      className="mt-2 resize-none"
                      rows={3}
                      placeholder="e.g. Dialogue should be centred and clear. Music should sit under dialogue at -6dB. SFX at -3dB for action sequences..."
                      value={mix.notes}
                      onChange={(e) => setMix(m => ({ ...m, notes: e.target.value }))}
                    />
                  </div>

                </CardContent>
              </Card>

            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Upload Custom Sound Dialog */}
      {/* AI Generate Sound Dialog */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              AI Sound Generation
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Describe the sound you want. ElevenLabs AI will generate it for you.
            </p>
            <div className="space-y-2">
              <Label>Sound Description *</Label>
              <Textarea
                placeholder="e.g. White dove wings flapping rapidly as it lands, feathers rustling, gentle whoosh of air"
                value={generatePrompt}
                onChange={(e) => setGeneratePrompt(e.target.value)}
                rows={3}
                className="resize-none" autoCapitalize="sentences" autoCorrect="on" enterKeyHint="done" />
            </div>
            <div className="space-y-2">
              <Label>Sound Name</Label>
              <Input
                placeholder="e.g. Dove Wing Flap"
                value={generateName}
                onChange={(e) => setGenerateName(e.target.value)} autoCapitalize="sentences" autoCorrect="on" enterKeyHint="next" />
            </div>
            <div className="space-y-2">
              <Label>Duration: {generateDuration}s</Label>
              <Slider
                min={1}
                max={22}
                step={1}
                value={[generateDuration]}
                onValueChange={([v]) => setGenerateDuration(v)}
              />
            </div>
            <div className="space-y-2">
              <Label>Assign to Scene (optional)</Label>
              <Select
                value={generateSceneId?.toString() ?? ""}
                onValueChange={(v) => setGenerateSceneId(v ? Number(v) : undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No scene assignment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No scene assignment</SelectItem>
                  {scenes.data?.map((s) => (
                    <SelectItem key={s.id} value={s.id.toString()}>
                      {s.title || `Scene ${s.orderIndex + 1}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                onClick={() => {
                  if (!generatePrompt.trim()) {
                    toast.error("Please enter a sound description");
                    return;
                  }
                  generateMutation.mutate({
                    projectId,
                    sceneId: generateSceneId,
                    prompt: generatePrompt.trim(),
                    name: generateName.trim() || undefined,
                    durationSeconds: generateDuration,
                    category: "Generated",
                    volume: 0.9,
                    startTime: 0,
                  });
                }}
                disabled={generateMutation.isPending || !generatePrompt.trim()}
              >
                {generateMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</>
                ) : (
                  <><Sparkles className="h-4 w-4 mr-2" />Generate Sound</>
                )}
              </Button>
              <Button variant="outline" onClick={() => setShowGenerateDialog(false)} disabled={generateMutation.isPending}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
                required autoCapitalize="sentences" autoCorrect="on" enterKeyHint="next" />
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
                placeholder="e.g., explosion, blast, custom" autoCapitalize="sentences" autoCorrect="on" enterKeyHint="next" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Audio File</Label>
              <Input id="sfx-upload" type="file" accept="audio/*" required className="mt-1" autoCapitalize="sentences" autoCorrect="on" enterKeyHint="next" />
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

      {/* ADR Track Dialog */}
      <Dialog open={showAdrDialog} onOpenChange={setShowAdrDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Mic className="h-5 w-5 text-blue-500" />Add ADR Track</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Character Name *</Label>
              <Input placeholder="e.g. DETECTIVE HAYES" value={adrCharacter} onChange={(e) => setAdrCharacter(e.target.value)} autoCapitalize="words" enterKeyHint="next" />
            </div>
            <div className="space-y-2">
              <Label>Original Dialogue Line *</Label>
              <Textarea placeholder="The exact line of dialogue that needs to be replaced or recorded" value={adrLine} onChange={(e) => setAdrLine(e.target.value)} rows={3} className="resize-none" autoCapitalize="sentences" enterKeyHint="done" />
            </div>
            <div className="space-y-2">
              <Label>Track Type</Label>
              <Select value={adrType} onValueChange={(v) => setAdrType(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="adr">ADR (Automated Dialogue Replacement)</SelectItem>
                  <SelectItem value="wild_track">Wild Track</SelectItem>
                  <SelectItem value="loop_group">Loop Group</SelectItem>
                  <SelectItem value="walla">Walla / Background Voices</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Assign to Scene (optional)</Label>
              <Select value={adrSceneId?.toString() ?? ""} onValueChange={(v) => setAdrSceneId(v ? Number(v) : undefined)}>
                <SelectTrigger><SelectValue placeholder="No scene" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No scene assignment</SelectItem>
                  {sceneList.map((s: any) => <SelectItem key={s.id} value={s.id.toString()}>{s.title || `Scene ${s.orderIndex + 1}`}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea placeholder="e.g. Needs to match lip movement at 01:23:45. Tone: urgent." value={adrNotes} onChange={(e) => setAdrNotes(e.target.value)} rows={2} className="resize-none" autoCapitalize="sentences" enterKeyHint="done" />
            </div>
            <div className="flex gap-2 pt-2">
              <Button className="flex-1" onClick={() => createAdr.mutate({ projectId, characterName: adrCharacter, dialogueLine: adrLine, trackType: adrType, sceneId: adrSceneId, notes: adrNotes })} disabled={createAdr.isPending || !adrCharacter.trim() || !adrLine.trim()}>
                {createAdr.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                Add ADR Track
              </Button>
              <Button variant="outline" onClick={() => setShowAdrDialog(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Foley Track Dialog */}
      <Dialog open={showFoleyDialog} onOpenChange={setShowFoleyDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Footprints className="h-5 w-5 text-amber-500" />Add Foley Track</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Track Name *</Label>
              <Input placeholder="e.g. Leather shoes on marble — INT. LOBBY" value={foleyName} onChange={(e) => setFoleyName(e.target.value)} autoCapitalize="sentences" enterKeyHint="next" />
            </div>
            <div className="space-y-2">
              <Label>Foley Type</Label>
              <Select value={foleyType} onValueChange={(v) => setFoleyType(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(FOLEY_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description / Recording Notes</Label>
              <Textarea placeholder="e.g. Character walks briskly across marble floor. Heels. Medium pace." value={foleyDesc} onChange={(e) => setFoleyDesc(e.target.value)} rows={2} className="resize-none" autoCapitalize="sentences" enterKeyHint="done" />
            </div>
            <div className="space-y-2">
              <Label>Assign to Scene (optional)</Label>
              <Select value={foleySceneId?.toString() ?? ""} onValueChange={(v) => setFoleySceneId(v ? Number(v) : undefined)}>
                <SelectTrigger><SelectValue placeholder="No scene" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No scene assignment</SelectItem>
                  {sceneList.map((s: any) => <SelectItem key={s.id} value={s.id.toString()}>{s.title || `Scene ${s.orderIndex + 1}`}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-2">
              <Button className="flex-1" onClick={() => createFoley.mutate({ projectId, name: foleyName, foleyType, description: foleyDesc, sceneId: foleySceneId })} disabled={createFoley.isPending || !foleyName.trim()}>
                {createFoley.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                Add Foley Track
              </Button>
              <Button variant="outline" onClick={() => setShowFoleyDialog(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Score Cue Dialog */}
      <Dialog open={showScoreCueDialog} onOpenChange={setShowScoreCueDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Music className="h-5 w-5 text-purple-500" />Add Score Cue</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Cue Number</Label>
                <Input placeholder="e.g. 1M1" value={cueNumber} onChange={(e) => setCueNumber(e.target.value)} autoCapitalize="characters" enterKeyHint="next" />
              </div>
              <div className="space-y-2">
                <Label>Cue Title *</Label>
                <Input placeholder="e.g. Opening Theme" value={cueTitle} onChange={(e) => setCueTitle(e.target.value)} autoCapitalize="words" enterKeyHint="next" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Cue Type</Label>
              <Select value={cueType} onValueChange={(v) => setCueType(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CUE_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description / Composer Notes</Label>
              <Textarea placeholder="e.g. Slow build from strings, full orchestra at climax. Underscore dialogue." value={cueDesc} onChange={(e) => setCueDesc(e.target.value)} rows={2} className="resize-none" autoCapitalize="sentences" enterKeyHint="done" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Fade In: {cueFadeIn}s</Label>
                <Slider value={[cueFadeIn]} min={0} max={10} step={0.5} onValueChange={([v]) => setCueFadeIn(v)} />
              </div>
              <div className="space-y-2">
                <Label>Fade Out: {cueFadeOut}s</Label>
                <Slider value={[cueFadeOut]} min={0} max={10} step={0.5} onValueChange={([v]) => setCueFadeOut(v)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Assign to Scene (optional)</Label>
              <Select value={cueSceneId?.toString() ?? ""} onValueChange={(v) => setCueSceneId(v ? Number(v) : undefined)}>
                <SelectTrigger><SelectValue placeholder="No scene" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No scene assignment</SelectItem>
                  {sceneList.map((s: any) => <SelectItem key={s.id} value={s.id.toString()}>{s.title || `Scene ${s.orderIndex + 1}`}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-2">
              <Button className="flex-1" onClick={() => createCue.mutate({ projectId, cueNumber: cueNumber || "TBD", title: cueTitle, cueType, description: cueDesc, sceneId: cueSceneId, fadeIn: cueFadeIn, fadeOut: cueFadeOut })} disabled={createCue.isPending || !cueTitle.trim()}>
                {createCue.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                Add Score Cue
              </Button>
              <Button variant="outline" onClick={() => setShowScoreCueDialog(false)}>Cancel</Button>
            </div>
          </div>
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
