import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useIsMobile } from "@/hooks/useMobile";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  ArrowLeft, Sparkles, Film, Play, Pause, Plus, Trash2, GripVertical,
  Type, Music, Volume2, Clock, Clapperboard, Wand2, ChevronDown, ChevronUp,
  Eye, Download, Layers, Zap, Settings2, RotateCcw, Copy, MoveUp, MoveDown,
  Image as ImageIcon, Video, Megaphone, Star, Target, Palette
} from "lucide-react";
import { NextStageCTA } from "@/components/NextStageCTA";
import { SubscriptionGate } from "@/components/SubscriptionGate";

// âââ Trailer Types âââ
const TRAILER_TYPES = [
  { id: "teaser", label: "Teaser", duration: "30-60s", icon: "ð¬", description: "Short, mysterious â builds curiosity with minimal plot reveal. Usually released 6+ months before premiere.", beats: 3 },
  { id: "theatrical", label: "Theatrical", duration: "2:00-2:30", icon: "ð¥", description: "Full cinematic trailer â three-act structure with rising tension, hero shots, and climactic montage.", beats: 8 },
  { id: "tv-spot", label: "TV Spot", duration: "15-30s", icon: "ðº", description: "Broadcast-ready TV advertisement â punchy, high-energy, single hook with release date.", beats: 4 },
  { id: "international", label: "International", duration: "2:00-3:00", icon: "ð", description: "Extended cut for international markets â more context, slower pacing, culturally neutral imagery.", beats: 10 },
  { id: "red-band", label: "Red Band", duration: "2:00-2:30", icon: "ð´", description: "Restricted trailer for mature audiences â showcases the film's true tone and intensity.", beats: 8 },
  { id: "final", label: "Final Trailer", duration: "2:00-2:30", icon: "â­", description: "Last trailer before release â maximum hype, key moments, critical acclaim quotes.", beats: 8 },
] as const;

type TrailerType = typeof TRAILER_TYPES[number]["id"];

// âââ Beat Templates âââ
interface Beat {
  id: string;
  label: string;
  description: string;
  durationSec: number;
  sceneId: number | null;
  customText: string;
  titleCard: boolean;
  titleCardText: string;
  titleCardStyle: "fade" | "slam" | "typewriter" | "glitch" | "cinematic";
  musicMood: string;
  pacing: "slow" | "medium" | "fast" | "frenetic";
  transition: "cut" | "dissolve" | "fade-black" | "fade-white" | "whip" | "smash-cut" | "match-cut";
  soundEffect: string;
}

const THEATRICAL_BEATS: Omit<Beat, "id" | "sceneId">[] = [
  { label: "Studio Logos", description: "Production company logos with ambient sound", durationSec: 5, customText: "", titleCard: false, titleCardText: "", titleCardStyle: "fade", musicMood: "ambient", pacing: "slow", transition: "fade-black", soundEffect: "" },
  { label: "World Establishment", description: "Wide establishing shots â introduce the world, time period, setting", durationSec: 15, customText: "", titleCard: false, titleCardText: "", titleCardStyle: "fade", musicMood: "atmospheric", pacing: "slow", transition: "dissolve", soundEffect: "" },
  { label: "Character Introduction", description: "Meet the protagonist â their normal life, desires, personality", durationSec: 12, customText: "", titleCard: false, titleCardText: "", titleCardStyle: "fade", musicMood: "emotional", pacing: "medium", transition: "cut", soundEffect: "" },
  { label: "Inciting Incident", description: "The event that disrupts everything â the call to adventure", durationSec: 10, customText: "", titleCard: true, titleCardText: "THIS SUMMER", titleCardStyle: "slam", musicMood: "tension", pacing: "medium", transition: "smash-cut", soundEffect: "boom" },
  { label: "Rising Action", description: "Escalating conflict â montage of challenges, obstacles, stakes", durationSec: 20, customText: "", titleCard: false, titleCardText: "", titleCardStyle: "fade", musicMood: "driving", pacing: "fast", transition: "whip", soundEffect: "" },
  { label: "Emotional Core", description: "The heart of the story â key relationship moment or revelation", durationSec: 10, customText: "", titleCard: true, titleCardText: "ONE CHANCE", titleCardStyle: "typewriter", musicMood: "emotional", pacing: "slow", transition: "dissolve", soundEffect: "" },
  { label: "Climactic Montage", description: "Rapid-fire peak moments â action, drama, spectacle at maximum intensity", durationSec: 15, customText: "", titleCard: false, titleCardText: "", titleCardStyle: "fade", musicMood: "epic", pacing: "frenetic", transition: "smash-cut", soundEffect: "bass-drop" },
  { label: "Title Card & Date", description: "Film title reveal with release date and credits", durationSec: 8, customText: "", titleCard: true, titleCardText: "", titleCardStyle: "cinematic", musicMood: "resolve", pacing: "slow", transition: "fade-black", soundEffect: "stinger" },
];

const TEASER_BEATS: Omit<Beat, "id" | "sceneId">[] = [
  { label: "Mystery Open", description: "Cryptic imagery â a single evocative shot that raises questions", durationSec: 10, customText: "", titleCard: false, titleCardText: "", titleCardStyle: "fade", musicMood: "mysterious", pacing: "slow", transition: "fade-black", soundEffect: "" },
  { label: "Glimpse", description: "Brief flashes of the world and characters â tantalizing fragments", durationSec: 15, customText: "", titleCard: true, titleCardText: "", titleCardStyle: "glitch", musicMood: "tension", pacing: "medium", transition: "smash-cut", soundEffect: "whoosh" },
  { label: "Title Reveal", description: "Film title with release window â leave them wanting more", durationSec: 8, customText: "", titleCard: true, titleCardText: "", titleCardStyle: "cinematic", musicMood: "resolve", pacing: "slow", transition: "fade-black", soundEffect: "stinger" },
];

const TV_SPOT_BEATS: Omit<Beat, "id" | "sceneId">[] = [
  { label: "Hook", description: "Immediate attention grab â the single most compelling moment", durationSec: 5, customText: "", titleCard: false, titleCardText: "", titleCardStyle: "fade", musicMood: "impact", pacing: "fast", transition: "cut", soundEffect: "boom" },
  { label: "Sell", description: "Quick montage of the best shots â action, emotion, spectacle", durationSec: 10, customText: "", titleCard: false, titleCardText: "", titleCardStyle: "fade", musicMood: "driving", pacing: "frenetic", transition: "whip", soundEffect: "" },
  { label: "Quote", description: "Critical acclaim or audience reaction quote", durationSec: 5, customText: "", titleCard: true, titleCardText: "\"A MASTERPIECE\" â Critics", titleCardStyle: "slam", musicMood: "epic", pacing: "fast", transition: "smash-cut", soundEffect: "" },
  { label: "CTA", description: "Title, release date, 'In Theaters Now' or 'Streaming on...'", durationSec: 5, customText: "", titleCard: true, titleCardText: "", titleCardStyle: "cinematic", musicMood: "resolve", pacing: "medium", transition: "fade-black", soundEffect: "stinger" },
];

function getDefaultBeats(type: TrailerType): Beat[] {
  const templates = type === "teaser" ? TEASER_BEATS
    : type === "tv-spot" ? TV_SPOT_BEATS
    : THEATRICAL_BEATS;
  return templates.map((b, i) => ({ ...b, id: `beat-${i}-${Date.now()}`, sceneId: null }));
}

// âââ Music Moods âââ
const MUSIC_MOODS = [
  "ambient", "atmospheric", "mysterious", "emotional", "tension",
  "driving", "epic", "frenetic", "impact", "resolve", "heroic",
  "dark", "hopeful", "melancholy", "triumphant", "suspense"
];

// âââ Title Card Styles âââ
const TITLE_CARD_STYLES = [
  { id: "fade", label: "Fade In", description: "Classic elegant fade" },
  { id: "slam", label: "Slam Cut", description: "Hard impact with sound" },
  { id: "typewriter", label: "Typewriter", description: "Letter-by-letter reveal" },
  { id: "glitch", label: "Glitch", description: "Digital distortion effect" },
  { id: "cinematic", label: "Cinematic", description: "Slow zoom with lens flare" },
] as const;

// âââ Sound Effects âââ
const SOUND_EFFECTS = ["", "boom", "whoosh", "stinger", "bass-drop", "riser", "hit", "reverse-cymbal", "thunder", "heartbeat", "glass-shatter", "door-slam"];

// âââ Pacing Labels âââ
const PACING_COLORS: Record<string, string> = {
  slow: "bg-blue-500/20 text-blue-400",
  medium: "bg-amber-500/20 text-amber-400",
  fast: "bg-orange-500/20 text-orange-400",
  frenetic: "bg-red-500/20 text-red-400",
};

function TrailerStudioInner() {
  const params = useParams<{ projectId: string }>();
  const projectId = Number(params.projectId);
  const [, setLocation] = useLocation();

  // âââ Data âââ
  const { data: project } = trpc.project.get.useQuery({ id: projectId }, { enabled: !!projectId });
  const { data: scenes } = trpc.scene.listByProject.useQuery({ projectId }, { enabled: !!projectId });
  const generateTrailer = trpc.generation.generateTrailer.useMutation({
    onSuccess: (data) => {
      toast.success("Trailer generated successfully!");
      setGeneratedResult(data);
    },
    onError: (err) => toast.error(err.message),
  });

  // âââ State âââ
  const [trailerType, setTrailerType] = useState<TrailerType>("theatrical");
  const [beats, setBeats] = useState<Beat[]>(getDefaultBeats("theatrical"));
  const [selectedBeatId, setSelectedBeatId] = useState<string | null>(null);
  const [trailerTitle, setTrailerTitle] = useState("");
  const [tagline, setTagline] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  const [targetAudience, setTargetAudience] = useState("general");
  const [musicTrack, setMusicTrack] = useState("auto");
  const [overallPacing, setOverallPacing] = useState<"standard" | "slow" | "fast">("standard");
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "2.39:1" | "4:3" | "9:16">("16:9");
  const [generatedResult, setGeneratedResult] = useState<any>(null);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const isMobile = useIsMobile();
  const [mobileConfigOpen, setMobileConfigOpen] = useState(false);
  const [mobileBeatOpen, setMobileBeatOpen] = useState(false);
  const [currentBeatPreview, setCurrentBeatPreview] = useState(0);
  const previewTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-populate title from project
  useEffect(() => {
    if (project && !trailerTitle) {
      setTrailerTitle(project.title || "");
    }
  }, [project]);

  // âââ Trailer Type Change âââ
  const handleTypeChange = (type: TrailerType) => {
    setTrailerType(type);
    setBeats(getDefaultBeats(type));
    setSelectedBeatId(null);
  };

  // âââ Beat Management âââ
  const selectedBeat = beats.find(b => b.id === selectedBeatId);

  const updateBeat = (id: string, updates: Partial<Beat>) => {
    setBeats(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
  };

  const addBeat = () => {
    const newBeat: Beat = {
      id: `beat-${Date.now()}`,
      label: "New Beat",
      description: "",
      durationSec: 10,
      sceneId: null,
      customText: "",
      titleCard: false,
      titleCardText: "",
      titleCardStyle: "fade",
      musicMood: "atmospheric",
      pacing: "medium",
      transition: "cut",
      soundEffect: "",
    };
    setBeats(prev => [...prev, newBeat]);
    setSelectedBeatId(newBeat.id);
  };

  const removeBeat = (id: string) => {
    setBeats(prev => prev.filter(b => b.id !== id));
    if (selectedBeatId === id) setSelectedBeatId(null);
  };

  const moveBeat = (id: string, direction: "up" | "down") => {
    setBeats(prev => {
      const idx = prev.findIndex(b => b.id === id);
      if (idx < 0) return prev;
      const newIdx = direction === "up" ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[newIdx]] = [copy[newIdx], copy[idx]];
      return copy;
    });
  };

  const duplicateBeat = (id: string) => {
    const beat = beats.find(b => b.id === id);
    if (!beat) return;
    const idx = beats.findIndex(b => b.id === id);
    const newBeat = { ...beat, id: `beat-${Date.now()}`, label: `${beat.label} (copy)` };
    setBeats(prev => [...prev.slice(0, idx + 1), newBeat, ...prev.slice(idx + 1)]);
  };

  // âââ Auto-assign scenes to beats âââ
  const autoAssignScenes = () => {
    if (!scenes?.length) return toast.error("No scenes available");
    const sorted = [...scenes].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
    const firstHalf = sorted.slice(0, Math.ceil(sorted.length / 2));
    setBeats(prev => prev.map((beat, i) => {
      if (beat.titleCard && !beat.sceneId) return beat; // Don't assign scenes to pure title cards
      const sceneIdx = i % firstHalf.length;
      return { ...beat, sceneId: firstHalf[sceneIdx]?.id ?? null };
    }));
    toast.success("Scenes auto-assigned (first half only â no spoilers)");
  };

  // âââ Total Duration âââ
  const totalDuration = beats.reduce((sum, b) => sum + b.durationSec, 0);
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // âââ Preview Playback âââ
  const togglePreview = () => {
    if (previewPlaying) {
      if (previewTimerRef.current) clearInterval(previewTimerRef.current);
      setPreviewPlaying(false);
    } else {
      setPreviewPlaying(true);
      setCurrentBeatPreview(0);
      let beatIdx = 0;
      const advanceBeat = () => {
        if (beatIdx >= beats.length) {
          if (previewTimerRef.current) clearInterval(previewTimerRef.current);
          setPreviewPlaying(false);
          setCurrentBeatPreview(0);
          return;
        }
        setCurrentBeatPreview(beatIdx);
        setSelectedBeatId(beats[beatIdx]?.id ?? null);
        const nextDelay = (beats[beatIdx]?.durationSec ?? 3) * 200; // 5x speed for preview
        beatIdx++;
        previewTimerRef.current = setTimeout(advanceBeat, nextDelay) as any;
      };
      advanceBeat();
    }
  };

  // âââ Generate âââ
  const handleGenerate = () => {
    if (!projectId) return;
    generateTrailer.mutate({ projectId });
  };

  // âââ Get scene thumbnail for a beat âââ
  const getSceneThumbnail = (sceneId: number | null) => {
    if (!sceneId || !scenes) return null;
    const scene = scenes.find(s => s.id === sceneId);
    return scene?.thumbnailUrl || null;
  };

  const getSceneTitle = (sceneId: number | null) => {
    if (!sceneId || !scenes) return "No scene assigned";
    const scene = scenes.find(s => s.id === sceneId);
    return scene?.title || `Scene ${sceneId}`;
  };

  return (
    <div className="min-h-screen text-foreground" style={{ background:"linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)" }}>
      {/* âââ Header âââ */}
      <div className="border-b sticky top-0 z-40" style={{ borderColor:"rgba(255,255,255,0.07)", background:"rgba(7,7,14,0.97)", backdropFilter:"blur(24px)" }}>
        <div className="flex items-center justify-between px-2 md:px-4 py-2 md:py-3">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <Button variant="ghost" size="icon" className="shrink-0" onClick={() => setLocation(`/projects/${projectId}`)} aria-label="Back to project">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-sm md:text-lg font-bold flex items-center gap-2 gradient-text-gold">
                <Film className="h-4 w-4 md:h-5 md:w-5 text-amber-500 shrink-0" />
                <span className="truncate">Trailer Studio</span>
              </h1>
              <p className="text-[10px] md:text-xs text-muted-foreground truncate">{project?.title || "Loading..."} â {formatTime(totalDuration)}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
            {isMobile && (
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setMobileConfigOpen(true)}>
                <Settings2 className="h-3 w-3" />
              </Button>
            )}
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={togglePreview}>
              {previewPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
              <span className="hidden sm:inline ml-1">{previewPlaying ? "Stop" : "Preview"}</span>
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs hidden md:flex" onClick={autoAssignScenes}>
              <Wand2 className="h-3 w-3 mr-1" />Auto-Assign
            </Button>
            <Button size="sm" className="h-7 text-xs bg-amber-600 hover:bg-amber-700" onClick={handleGenerate} disabled={generateTrailer.isPending} title="20 credits">
              {generateTrailer.isPending ? <RotateCcw className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              <span className="hidden sm:inline ml-1">{generateTrailer.isPending ? "Generating..." : "Generate"}</span>
              {!generateTrailer.isPending && <span className="ml-1 text-[10px] font-medium opacity-80">20cr</span>}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-57px)]">
        {/* âââ Left Panel: Trailer Config (desktop) âââ */}
        {!isMobile && (
        <div className="w-80 border-r border-border overflow-y-auto p-4 space-y-4 bg-card/30">
          {/* Trailer Type Selector */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Trailer Type</h3>
            <div className="space-y-1.5">
              {TRAILER_TYPES.map(t => (
                <button
                  key={t.id}
                  onClick={() => handleTypeChange(t.id)}
                  className={`w-full text-left p-2.5 rounded-lg border transition-all ${
                    trailerType === t.id
                      ? "border-amber-500 bg-amber-500/10"
                      : "border-border/50 hover:border-border hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{t.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{t.label}</span>
                        <span className="text-[10px] text-muted-foreground">{t.duration}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{t.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Trailer Details */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Details</h3>
            <div>
              <label className="text-xs text-muted-foreground">Trailer Title</label>
              <Input value={trailerTitle} onChange={e => setTrailerTitle(e.target.value)} placeholder="e.g. Official Theatrical Trailer" className="mt-1 h-8 text-sm" autoCapitalize="sentences" autoCorrect="on" enterKeyHint="next" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Tagline</label>
              <Input value={tagline} onChange={e => setTagline(e.target.value)} placeholder="e.g. Every legend has a beginning" className="mt-1 h-8 text-sm" autoCapitalize="sentences" autoCorrect="on" enterKeyHint="next" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Release Date</label>
              <Input value={releaseDate} onChange={e => setReleaseDate(e.target.value)} placeholder="e.g. Summer 2026" className="mt-1 h-8 text-sm" autoCapitalize="sentences" autoCorrect="on" enterKeyHint="next" />
            </div>
          </div>

          {/* Global Settings */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Global Settings</h3>
            <div>
              <label className="text-xs text-muted-foreground">Overall Pacing</label>
              <div className="flex gap-1 mt-1">
                {(["slow", "standard", "fast"] as const).map(p => (
                  <button key={p} onClick={() => setOverallPacing(p)} className={`flex-1 text-[10px] py-1.5 rounded border transition-all ${overallPacing === p ? "border-amber-500 bg-amber-500/10 text-amber-400" : "border-border/50 text-muted-foreground hover:bg-muted/30"}`}>
                    {p === "slow" ? "Slow Burn" : p === "standard" ? "Standard" : "High Energy"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Aspect Ratio</label>
              <div className="flex gap-1 mt-1">
                {(["16:9", "2.39:1", "4:3", "9:16"] as const).map(ar => (
                  <button key={ar} onClick={() => setAspectRatio(ar)} className={`flex-1 text-[10px] py-1.5 rounded border transition-all ${aspectRatio === ar ? "border-amber-500 bg-amber-500/10 text-amber-400" : "border-border/50 text-muted-foreground hover:bg-muted/30"}`}>
                    {ar}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Target Audience</label>
              <div className="flex gap-1 mt-1 flex-wrap">
                {["general", "young-adult", "mature", "family", "arthouse"].map(a => (
                  <button key={a} onClick={() => setTargetAudience(a)} className={`text-[10px] py-1 px-2 rounded border transition-all ${targetAudience === a ? "border-amber-500 bg-amber-500/10 text-amber-400" : "border-border/50 text-muted-foreground hover:bg-muted/30"}`}>
                    {a.replace("-", " ")}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Music */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1"><Music className="h-3 w-3" />Music Track</h3>
            <div className="flex gap-1 flex-wrap">
              {["auto", "epic-orchestral", "electronic-pulse", "piano-emotional", "dark-ambient", "none"].map(m => (
                <button key={m} onClick={() => setMusicTrack(m)} className={`text-[10px] py-1 px-2 rounded border transition-all ${musicTrack === m ? "border-amber-500 bg-amber-500/10 text-amber-400" : "border-border/50 text-muted-foreground hover:bg-muted/30"}`}>
                  {m === "auto" ? "AI Select" : m.replace(/-/g, " ")}
                </button>
              ))}
            </div>
          </div>
        </div>

        )}

        {/* âââ Center: Beat Timeline âââ */}
        <div className="flex-1 overflow-y-auto p-2 md:p-4 min-w-0">
          {/* Preview Area */}
          <div className="mb-4">
            <div className={`relative rounded-lg overflow-hidden bg-black/80 border border-border/50 ${aspectRatio === "9:16" ? "w-48 h-80 mx-auto" : aspectRatio === "4:3" ? "aspect-[4/3] max-w-2xl mx-auto" : aspectRatio === "2.39:1" ? "aspect-[2.39/1] max-w-3xl mx-auto" : "aspect-video max-w-2xl mx-auto"}`}>
              {previewPlaying && beats[currentBeatPreview] ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
                  {getSceneThumbnail(beats[currentBeatPreview].sceneId) ? (
                    <img src={getSceneThumbnail(beats[currentBeatPreview].sceneId)!} alt="" className="absolute inset-0 w-full h-full object-cover opacity-80" />
                  ) : null}
                  <div className="relative z-10 text-center">
                    {beats[currentBeatPreview].titleCard && (
                      <div className={`text-2xl font-bold text-white drop-shadow-lg ${beats[currentBeatPreview].titleCardStyle === "slam" ? "animate-pulse" : ""}`}>
                        {beats[currentBeatPreview].titleCardText || trailerTitle}
                      </div>
                    )}
                    <div className="mt-2 text-xs text-white/60">{beats[currentBeatPreview].label}</div>
                  </div>
                  {/* Pacing indicator */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2">
                    <div className={`text-[9px] px-1.5 py-0.5 rounded ${PACING_COLORS[beats[currentBeatPreview].pacing]}`}>
                      {beats[currentBeatPreview].pacing}
                    </div>
                    <div className="text-[9px] text-white/40">{beats[currentBeatPreview].musicMood}</div>
                    <div className="flex-1" />
                    <div className="text-[9px] text-white/40">Beat {currentBeatPreview + 1}/{beats.length}</div>
                  </div>
                </div>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                  <Film className="h-10 w-10 mb-2 opacity-30" />
                  <p className="text-sm">Click Preview to see your trailer structure</p>
                  <p className="text-xs opacity-50 mt-1">{formatTime(totalDuration)} Â· {beats.length} beats Â· {trailerType}</p>
                </div>
              )}
            </div>
          </div>

          {/* Beat List */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Layers className="h-4 w-4 text-amber-500" />
              Beat Structure
              <span className="text-xs text-muted-foreground font-normal">({beats.length} beats Â· {formatTime(totalDuration)})</span>
            </h3>
            <Button variant="outline" size="sm" onClick={addBeat}>
              <Plus className="h-3 w-3 mr-1" />Add Beat
            </Button>
          </div>

          {/* Pacing Timeline Bar */}
          <div className="mb-4 rounded-lg overflow-hidden border border-border/50 h-6 flex">
            {beats.map((beat, i) => {
              const widthPct = (beat.durationSec / totalDuration) * 100;
              const colors: Record<string, string> = {
                slow: "bg-blue-600", medium: "bg-amber-600", fast: "bg-orange-600", frenetic: "bg-red-600"
              };
              return (
                <div
                  key={beat.id}
                  className={`${colors[beat.pacing]} relative cursor-pointer transition-all hover:brightness-125 ${selectedBeatId === beat.id ? "ring-1 ring-white" : ""}`}
                  style={{ width: `${widthPct}%`, minWidth: "2px" }}
                  onClick={() => { setSelectedBeatId(beat.id); if (isMobile) setMobileBeatOpen(true); }}
                >
                  {widthPct > 8 && <span className="absolute inset-0 flex items-center justify-center text-[8px] text-white/80 truncate px-1">{beat.label}</span>}
                </div>
              );
            })}
          </div>

          {/* Beat Cards */}
          <div className="space-y-2">
            {beats.map((beat, i) => {
              const thumbnail = getSceneThumbnail(beat.sceneId);
              const isSelected = selectedBeatId === beat.id;
              return (
                <div
                  key={beat.id}
                  onClick={() => setSelectedBeatId(beat.id)}
                  className={`group flex items-stretch gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    isSelected ? "border-amber-500 bg-amber-500/5" : previewPlaying && currentBeatPreview === i ? "border-green-500 bg-green-500/5" : "border-border/50 hover:border-border hover:bg-muted/20"
                  }`}
                >
                  {/* Drag Handle + Index */}
                  <div className="flex flex-col items-center justify-center gap-1 text-muted-foreground">
                    <GripVertical className="h-3 w-3 opacity-30" />
                    <span className="text-[10px] font-mono">{i + 1}</span>
                  </div>

                  {/* Thumbnail */}
                  <div className="w-24 h-16 rounded bg-black/40 border border-border/30 overflow-hidden flex-shrink-0 relative">
                    {thumbnail ? (
                      <img src={thumbnail} alt="" className="w-full h-full object-cover" />
                    ) : beat.titleCard ? (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-900/30 to-black">
                        <Type className="h-5 w-5 text-amber-500/50" />
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="h-5 w-5 text-muted-foreground/30" />
                      </div>
                    )}
                    <div className="absolute bottom-0 right-0 bg-black/70 text-[9px] text-white/70 px-1 py-0.5 rounded-tl">
                      {beat.durationSec}s
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{beat.label}</span>
                      {beat.titleCard && <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">TITLE CARD</span>}
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate mt-0.5">{beat.description || "No description"}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded ${PACING_COLORS[beat.pacing]}`}>{beat.pacing}</span>
                      <span className="text-[9px] text-muted-foreground">{beat.musicMood}</span>
                      <span className="text-[9px] text-muted-foreground">â {beat.transition}</span>
                      {beat.soundEffect && <span className="text-[9px] text-purple-400">âª {beat.soundEffect}</span>}
                    </div>
                  </div>

                  {/* Scene Assignment */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-[10px] text-muted-foreground">{getSceneTitle(beat.sceneId)}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={e => { e.stopPropagation(); moveBeat(beat.id, "up"); }} className="p-0.5 hover:bg-muted rounded"><MoveUp className="h-3 w-3" /></button>
                    <button onClick={e => { e.stopPropagation(); moveBeat(beat.id, "down"); }} className="p-0.5 hover:bg-muted rounded"><MoveDown className="h-3 w-3" /></button>
                    <button onClick={e => { e.stopPropagation(); duplicateBeat(beat.id); }} className="p-0.5 hover:bg-muted rounded"><Copy className="h-3 w-3" /></button>
                    <button onClick={e => { e.stopPropagation(); removeBeat(beat.id); }} className="p-0.5 hover:bg-red-500/20 text-red-400 rounded"><Trash2 className="h-3 w-3" /></button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Generated Result */}
          {generatedResult && (
            <Card className="mt-6 border-green-500/30 bg-green-500/5 glass-card shadow-lg shadow-amber-500/5">
              <CardHeader className="pb-2 glass-card shadow-lg shadow-amber-500/5">
                <CardTitle className="text-sm flex items-center gap-2 gradient-text-gold glass-card shadow-lg shadow-amber-500/5">
                  <Sparkles className="h-4 w-4 text-green-400" />
                  Generated: {generatedResult.trailerTitle}
                </CardTitle>
                {generatedResult.tagline && <p className="text-xs text-muted-foreground italic">"{generatedResult.tagline}"</p>}
              </CardHeader>
              <CardContent>
                {generatedResult.images?.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {generatedResult.images.map((url: string, i: number) => (
                      <img key={i} src={url} alt={`Trailer shot ${i + 1}`} className="w-full rounded aspect-video object-cover" />
                    ))}
                  </div>
                )}
                {generatedResult.scenes?.length > 0 && (
                  <div className="space-y-1">
                    {generatedResult.scenes.sort((a: any, b: any) => a.trailerOrder - b.trailerOrder).map((s: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground w-4">{i + 1}.</span>
                        <span>{s.trailerDescription}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* âââ Right Panel: Beat Inspector (desktop) âââ */}
        {!isMobile && (
        <div className="w-80 border-l border-border overflow-y-auto p-4 space-y-4 bg-card/30">
          {selectedBeat ? (
            <>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Beat Inspector</h3>

              <div>
                <label className="text-xs text-muted-foreground">Beat Name</label>
                <Input value={selectedBeat.label} onChange={e => updateBeat(selectedBeat.id, { label: e.target.value })} className="mt-1 h-8 text-sm" autoCapitalize="sentences" autoCorrect="on" enterKeyHint="next" />
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Description</label>
                <Textarea value={selectedBeat.description} onChange={e => updateBeat(selectedBeat.id, { description: e.target.value })} className="mt-1 text-sm min-h-[60px]" autoCapitalize="sentences" autoCorrect="on" enterKeyHint="done" />
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Duration (seconds)</label>
                <Input type="number" min={1} max={120} value={selectedBeat.durationSec} onChange={e => updateBeat(selectedBeat.id, { durationSec: Number(e.target.value) })} className="mt-1 h-8 text-sm" inputMode="numeric" enterKeyHint="done" />
              </div>

              {/* Scene Assignment */}
              <div>
                <label className="text-xs text-muted-foreground">Assign Scene</label>
                <select
                  value={selectedBeat.sceneId ?? ""}
                  onChange={e => updateBeat(selectedBeat.id, { sceneId: e.target.value ? Number(e.target.value) : null })}
                  className="mt-1 w-full h-8 text-sm bg-background border border-border rounded px-2"
                >
                  <option value="">â None â</option>
                  {scenes?.map(s => (
                    <option key={s.id} value={s.id}>{s.title || `Scene ${s.id}`}</option>
                  ))}
                </select>
              </div>

              {/* Title Card */}
              <div>
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                  <input type="checkbox" checked={selectedBeat.titleCard} onChange={e => updateBeat(selectedBeat.id, { titleCard: e.target.checked })} className="rounded" />
                  Title Card Overlay
                </label>
                {selectedBeat.titleCard && (
                  <div className="mt-2 space-y-2 pl-4 border-l-2 border-amber-500/30">
                    <Input value={selectedBeat.titleCardText} onChange={e => updateBeat(selectedBeat.id, { titleCardText: e.target.value })} placeholder="Title card text..." className="h-8 text-sm" autoCapitalize="sentences" autoCorrect="on" enterKeyHint="next" />
                    <div className="flex gap-1 flex-wrap">
                      {TITLE_CARD_STYLES.map(s => (
                        <button key={s.id} onClick={() => updateBeat(selectedBeat.id, { titleCardStyle: s.id })} className={`text-[10px] py-1 px-2 rounded border transition-all ${selectedBeat.titleCardStyle === s.id ? "border-amber-500 bg-amber-500/10 text-amber-400" : "border-border/50 text-muted-foreground"}`}>
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Pacing */}
              <div>
                <label className="text-xs text-muted-foreground">Pacing</label>
                <div className="flex gap-1 mt-1">
                  {(["slow", "medium", "fast", "frenetic"] as const).map(p => (
                    <button key={p} onClick={() => updateBeat(selectedBeat.id, { pacing: p })} className={`flex-1 text-[10px] py-1.5 rounded border transition-all ${selectedBeat.pacing === p ? "border-amber-500 bg-amber-500/10 text-amber-400" : "border-border/50 text-muted-foreground"}`}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Music Mood */}
              <div>
                <label className="text-xs text-muted-foreground">Music Mood</label>
                <div className="flex gap-1 mt-1 flex-wrap">
                  {MUSIC_MOODS.map(m => (
                    <button key={m} onClick={() => updateBeat(selectedBeat.id, { musicMood: m })} className={`text-[10px] py-0.5 px-1.5 rounded border transition-all ${selectedBeat.musicMood === m ? "border-amber-500 bg-amber-500/10 text-amber-400" : "border-border/50 text-muted-foreground"}`}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Transition */}
              <div>
                <label className="text-xs text-muted-foreground">Transition Out</label>
                <div className="flex gap-1 mt-1 flex-wrap">
                  {(["cut", "dissolve", "fade-black", "fade-white", "whip", "smash-cut", "match-cut"] as const).map(t => (
                    <button key={t} onClick={() => updateBeat(selectedBeat.id, { transition: t })} className={`text-[10px] py-0.5 px-1.5 rounded border transition-all ${selectedBeat.transition === t ? "border-amber-500 bg-amber-500/10 text-amber-400" : "border-border/50 text-muted-foreground"}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sound Effect */}
              <div>
                <label className="text-xs text-muted-foreground">Sound Effect</label>
                <div className="flex gap-1 mt-1 flex-wrap">
                  {SOUND_EFFECTS.map(s => (
                    <button key={s || "none"} onClick={() => updateBeat(selectedBeat.id, { soundEffect: s })} className={`text-[10px] py-0.5 px-1.5 rounded border transition-all ${selectedBeat.soundEffect === s ? "border-purple-500 bg-purple-500/10 text-purple-400" : "border-border/50 text-muted-foreground"}`}>
                      {s || "none"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Director Notes */}
              <div>
                <label className="text-xs text-muted-foreground">Director Notes</label>
                <Textarea value={selectedBeat.customText} onChange={e => updateBeat(selectedBeat.id, { customText: e.target.value })} placeholder="Notes for this beat..." className="mt-1 text-sm min-h-[50px]" autoCapitalize="sentences" autoCorrect="on" enterKeyHint="done" />
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Settings2 className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-sm">Select a beat to edit</p>
              <p className="text-xs opacity-50 mt-1">Click any beat in the timeline</p>
            </div>
          )}
        </div>
        )}
      </div>

      {/* âââ Mobile Config Sheet âââ */}
      {isMobile && (
        <Sheet open={mobileConfigOpen} onOpenChange={setMobileConfigOpen}>
          <SheetContent side="left" className="w-[85vw] max-w-sm p-0">
            <SheetHeader className="px-4 py-3 border-b">
              <SheetTitle className="text-sm flex items-center gap-2 gradient-text-gold"><Settings2 className="h-4 w-4 text-amber-500" /> Trailer Config</SheetTitle>
            </SheetHeader>
            <div className="overflow-y-auto h-[calc(100vh-60px)] p-4 space-y-4">
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Trailer Type</h3>
                <div className="space-y-1.5">
                  {TRAILER_TYPES.map(t => (
                    <button key={t.id} onClick={() => { handleTypeChange(t.id); }} className={`w-full text-left p-2.5 rounded-lg border transition-all ${trailerType === t.id ? "border-amber-500 bg-amber-500/10" : "border-border/50 hover:bg-muted/30"}`}>
                      <div className="flex items-center gap-2">
                        <span>{t.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium">{t.label}</span>
                            <span className="text-[10px] text-muted-foreground">{t.duration}</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{t.description}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Pacing</label>
                <div className="flex gap-1 mt-1">
                  {(["slow", "standard", "fast"] as const).map(p => (
                    <button key={p} onClick={() => setOverallPacing(p)} className={`flex-1 text-[10px] py-1.5 rounded border transition-all ${overallPacing === p ? "border-amber-500 bg-amber-500/10 text-amber-400" : "border-border/50 text-muted-foreground"}`}>{p}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Aspect Ratio</label>
                <div className="flex gap-1 mt-1">
                  {(["16:9", "2.39:1", "4:3", "9:16"] as const).map(ar => (
                    <button key={ar} onClick={() => setAspectRatio(ar)} className={`flex-1 text-[10px] py-1.5 rounded border transition-all ${aspectRatio === ar ? "border-amber-500 bg-amber-500/10 text-amber-400" : "border-border/50 text-muted-foreground"}`}>{ar}</button>
                  ))}
                </div>
              </div>
              <Button className="w-full" size="sm" onClick={autoAssignScenes}>
                <Wand2 className="h-3 w-3 mr-1" /> Auto-Assign Scenes
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* âââ Mobile Beat Inspector Sheet âââ */}
      {isMobile && (
        <Sheet open={mobileBeatOpen} onOpenChange={setMobileBeatOpen}>
          <SheetContent side="bottom" className="h-[70vh] p-0">
            <SheetHeader className="px-4 py-3 border-b">
              <SheetTitle className="text-sm flex items-center gap-2 gradient-text-gold"><Layers className="h-4 w-4 text-amber-500" /> {selectedBeat?.label || "Beat Inspector"}</SheetTitle>
            </SheetHeader>
            <div className="overflow-y-auto h-[calc(70vh-60px)] p-4 space-y-4">
              {selectedBeat && (
                <>
                  <div>
                    <label className="text-xs text-muted-foreground">Beat Name</label>
                    <Input value={selectedBeat.label} onChange={e => updateBeat(selectedBeat.id, { label: e.target.value })} className="mt-1 h-8 text-sm" autoCapitalize="sentences" autoCorrect="on" enterKeyHint="next" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Description</label>
                    <Textarea value={selectedBeat.description} onChange={e => updateBeat(selectedBeat.id, { description: e.target.value })} className="mt-1 text-sm min-h-[60px]" autoCapitalize="sentences" autoCorrect="on" enterKeyHint="done" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Duration (seconds)</label>
                    <Input type="number" min={1} max={120} value={selectedBeat.durationSec} onChange={e => updateBeat(selectedBeat.id, { durationSec: Number(e.target.value) })} className="mt-1 h-8 text-sm" inputMode="numeric" enterKeyHint="done" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Assign Scene</label>
                    <select value={selectedBeat.sceneId ?? ""} onChange={e => updateBeat(selectedBeat.id, { sceneId: e.target.value ? Number(e.target.value) : null })} className="mt-1 w-full h-8 text-sm bg-background border border-border rounded px-2">
                      <option value="">â None â</option>
                      {scenes?.map(s => (<option key={s.id} value={s.id}>{s.title || `Scene ${s.id}`}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Pacing</label>
                    <div className="flex gap-1 mt-1">
                      {(["slow", "medium", "fast", "frenetic"] as const).map(p => (
                        <button key={p} onClick={() => updateBeat(selectedBeat.id, { pacing: p })} className={`flex-1 text-[10px] py-1.5 rounded border transition-all ${selectedBeat.pacing === p ? "border-amber-500 bg-amber-500/10 text-amber-400" : "border-border/50 text-muted-foreground"}`}>{p}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Transition Out</label>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {(["cut", "dissolve", "fade-black", "fade-white", "whip", "smash-cut", "match-cut"] as const).map(t => (
                        <button key={t} onClick={() => updateBeat(selectedBeat.id, { transition: t })} className={`text-[10px] py-0.5 px-1.5 rounded border transition-all ${selectedBeat.transition === t ? "border-amber-500 bg-amber-500/10 text-amber-400" : "border-border/50 text-muted-foreground"}`}>{t}</button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>
      )}
      {!!projectId && <NextStageCTA projectId={projectId} currentStage={8} />}
    </div>
  );
}

export default function TrailerStudio() {
  return (
    <SubscriptionGate
      feature="Trailer Studio"
      featureKey="canUseTrailerGeneration"
      requiredTier="independent"
    >
      <TrailerStudioInner />
    </SubscriptionGate>
  );
}
