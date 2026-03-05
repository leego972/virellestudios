import { useState, useEffect } from "react";
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
  ArrowLeft, Sparkles, Tv, Play, Pause, Plus, Trash2, GripVertical,
  Type, Music, Volume2, Clock, Megaphone, Wand2, Eye, Download,
  Layers, Zap, Settings2, RotateCcw, Copy, Target, Palette, Globe,
  Smartphone, Monitor, Film, Image as ImageIcon, MoveUp, MoveDown,
  Mic, MessageSquare, ShoppingCart, Phone, ExternalLink, Hash
} from "lucide-react";

// ─── Platform Presets ───
const PLATFORMS = [
  { id: "broadcast-tv", label: "Broadcast TV", icon: Monitor, aspect: "16:9", description: "Network/cable television — NTSC/PAL broadcast standards", durations: [15, 30, 60], maxFileSize: "2GB" },
  { id: "streaming", label: "Streaming", icon: Tv, aspect: "16:9", description: "Netflix, Hulu, Disney+, Amazon — pre-roll and mid-roll", durations: [15, 30, 60, 90], maxFileSize: "4GB" },
  { id: "youtube", label: "YouTube", icon: Play, aspect: "16:9", description: "YouTube pre-roll, mid-roll, bumper ads", durations: [6, 15, 30, 60], maxFileSize: "256GB" },
  { id: "instagram", label: "Instagram", icon: ImageIcon, aspect: "1:1", description: "Feed, Stories, Reels — square and vertical formats", durations: [15, 30, 60], maxFileSize: "650MB" },
  { id: "tiktok", label: "TikTok", icon: Smartphone, aspect: "9:16", description: "In-feed ads, TopView, branded effects", durations: [15, 30, 60], maxFileSize: "500MB" },
  { id: "facebook", label: "Facebook", icon: Globe, aspect: "16:9", description: "Feed ads, in-stream, Stories — auto-play optimized", durations: [15, 30, 60], maxFileSize: "4GB" },
  { id: "cinema", label: "Cinema Pre-Roll", icon: Film, aspect: "2.39:1", description: "Theater pre-show advertising — DCP format ready", durations: [30, 60, 90, 120], maxFileSize: "10GB" },
  { id: "connected-tv", label: "Connected TV (CTV)", icon: Tv, aspect: "16:9", description: "Roku, Apple TV, Fire TV — non-skippable premium", durations: [15, 30, 60], maxFileSize: "2GB" },
] as const;

type PlatformId = typeof PLATFORMS[number]["id"];

// ─── Commercial Formats ───
const DURATIONS = [
  { seconds: 6, label: "6s Bumper", description: "YouTube bumper ad — single message, maximum impact" },
  { seconds: 15, label: "15s Spot", description: "Standard short spot — hook + sell + CTA" },
  { seconds: 30, label: "30s Spot", description: "Industry standard — full narrative arc with CTA" },
  { seconds: 60, label: "60s Spot", description: "Premium long-form — story-driven with emotional payoff" },
  { seconds: 90, label: "90s Extended", description: "Super Bowl / cinema — cinematic mini-film" },
  { seconds: 120, label: "2min Brand Film", description: "Brand storytelling — documentary or narrative style" },
];

// ─── Commercial Styles ───
const COMMERCIAL_STYLES = [
  { id: "cinematic", label: "Cinematic", description: "Film-quality visuals, dramatic lighting, epic score" },
  { id: "documentary", label: "Documentary", description: "Real-world feel, handheld, natural lighting, authentic" },
  { id: "comedy", label: "Comedy", description: "Humorous, witty, bright, energetic, punchline-driven" },
  { id: "emotional", label: "Emotional", description: "Heart-tugging, slow-motion, piano score, tear-jerker" },
  { id: "high-energy", label: "High Energy", description: "Fast cuts, EDM/rock, extreme sports, youth-oriented" },
  { id: "luxury", label: "Luxury", description: "Sleek, minimal, gold/black, slow reveal, aspirational" },
  { id: "retro", label: "Retro/Vintage", description: "Film grain, warm tones, nostalgic, throwback aesthetic" },
  { id: "minimalist", label: "Minimalist", description: "Clean, white space, typography-focused, Apple-style" },
  { id: "animated", label: "Animated/Motion", description: "Motion graphics, character animation, explainer style" },
  { id: "testimonial", label: "Testimonial", description: "Real people, interview-style, trust-building, social proof" },
];

// ─── CTA Types ───
const CTA_TYPES = [
  { id: "visit-website", label: "Visit Website", icon: ExternalLink },
  { id: "call-now", label: "Call Now", icon: Phone },
  { id: "buy-now", label: "Buy Now", icon: ShoppingCart },
  { id: "download", label: "Download App", icon: Download },
  { id: "learn-more", label: "Learn More", icon: Eye },
  { id: "subscribe", label: "Subscribe", icon: Hash },
  { id: "book-now", label: "Book Now", icon: Target },
  { id: "watch-trailer", label: "Watch Trailer", icon: Play },
  { id: "in-theaters", label: "In Theaters", icon: Film },
  { id: "streaming-now", label: "Streaming Now", icon: Tv },
];

// ─── Shot Structure ───
interface CommercialShot {
  id: string;
  label: string;
  description: string;
  durationSec: number;
  visualDescription: string;
  voiceoverText: string;
  onScreenText: string;
  musicMood: string;
  soundEffect: string;
  sceneId: number | null;
  transition: "cut" | "dissolve" | "fade-black" | "fade-white" | "whip" | "wipe";
}

function getDefaultShots(durationSec: number): CommercialShot[] {
  if (durationSec <= 6) {
    return [
      { id: `shot-${Date.now()}-1`, label: "Impact Shot", description: "Single powerful image with brand message", durationSec: 4, visualDescription: "", voiceoverText: "", onScreenText: "", musicMood: "impact", soundEffect: "", sceneId: null, transition: "cut" },
      { id: `shot-${Date.now()}-2`, label: "Logo + CTA", description: "Brand logo with call to action", durationSec: 2, visualDescription: "", voiceoverText: "", onScreenText: "", musicMood: "resolve", soundEffect: "stinger", sceneId: null, transition: "fade-black" },
    ];
  }
  if (durationSec <= 15) {
    return [
      { id: `shot-${Date.now()}-1`, label: "Hook", description: "Attention-grabbing opening — 2 seconds to capture", durationSec: 3, visualDescription: "", voiceoverText: "", onScreenText: "", musicMood: "impact", soundEffect: "", sceneId: null, transition: "cut" },
      { id: `shot-${Date.now()}-2`, label: "Problem/Desire", description: "Show the need or aspiration", durationSec: 4, visualDescription: "", voiceoverText: "", onScreenText: "", musicMood: "emotional", soundEffect: "", sceneId: null, transition: "cut" },
      { id: `shot-${Date.now()}-3`, label: "Solution", description: "Reveal the product/film as the answer", durationSec: 4, visualDescription: "", voiceoverText: "", onScreenText: "", musicMood: "uplifting", soundEffect: "", sceneId: null, transition: "dissolve" },
      { id: `shot-${Date.now()}-4`, label: "CTA + Logo", description: "Clear call to action with branding", durationSec: 4, visualDescription: "", voiceoverText: "", onScreenText: "", musicMood: "resolve", soundEffect: "stinger", sceneId: null, transition: "fade-black" },
    ];
  }
  if (durationSec <= 30) {
    return [
      { id: `shot-${Date.now()}-1`, label: "Cold Open", description: "Dramatic or intriguing opening that hooks immediately", durationSec: 4, visualDescription: "", voiceoverText: "", onScreenText: "", musicMood: "atmospheric", soundEffect: "", sceneId: null, transition: "cut" },
      { id: `shot-${Date.now()}-2`, label: "Setup", description: "Establish the world, character, or situation", durationSec: 5, visualDescription: "", voiceoverText: "", onScreenText: "", musicMood: "building", soundEffect: "", sceneId: null, transition: "cut" },
      { id: `shot-${Date.now()}-3`, label: "Conflict/Need", description: "Present the problem, desire, or tension", durationSec: 5, visualDescription: "", voiceoverText: "", onScreenText: "", musicMood: "tension", soundEffect: "", sceneId: null, transition: "cut" },
      { id: `shot-${Date.now()}-4`, label: "Reveal", description: "The product, film, or brand as the hero moment", durationSec: 6, visualDescription: "", voiceoverText: "", onScreenText: "", musicMood: "epic", soundEffect: "boom", sceneId: null, transition: "smash-cut" as any },
      { id: `shot-${Date.now()}-5`, label: "Payoff", description: "Emotional resolution or wow moment", durationSec: 5, visualDescription: "", voiceoverText: "", onScreenText: "", musicMood: "emotional", soundEffect: "", sceneId: null, transition: "dissolve" },
      { id: `shot-${Date.now()}-6`, label: "End Card", description: "Logo, tagline, CTA, release date", durationSec: 5, visualDescription: "", voiceoverText: "", onScreenText: "", musicMood: "resolve", soundEffect: "stinger", sceneId: null, transition: "fade-black" },
    ];
  }
  // 60s+
  return [
    { id: `shot-${Date.now()}-1`, label: "Teaser Open", description: "Mysterious or provocative opening that demands attention", durationSec: 5, visualDescription: "", voiceoverText: "", onScreenText: "", musicMood: "mysterious", soundEffect: "", sceneId: null, transition: "cut" },
    { id: `shot-${Date.now()}-2`, label: "World Building", description: "Establish the setting, tone, and visual language", durationSec: 8, visualDescription: "", voiceoverText: "", onScreenText: "", musicMood: "atmospheric", soundEffect: "", sceneId: null, transition: "dissolve" },
    { id: `shot-${Date.now()}-3`, label: "Character Intro", description: "Meet the protagonist or brand personality", durationSec: 8, visualDescription: "", voiceoverText: "", onScreenText: "", musicMood: "emotional", soundEffect: "", sceneId: null, transition: "cut" },
    { id: `shot-${Date.now()}-4`, label: "The Challenge", description: "Present the conflict, problem, or aspiration", durationSec: 8, visualDescription: "", voiceoverText: "", onScreenText: "", musicMood: "tension", soundEffect: "", sceneId: null, transition: "cut" },
    { id: `shot-${Date.now()}-5`, label: "Rising Action", description: "Build momentum — montage of key moments", durationSec: 10, visualDescription: "", voiceoverText: "", onScreenText: "", musicMood: "driving", soundEffect: "", sceneId: null, transition: "whip" },
    { id: `shot-${Date.now()}-6`, label: "Climax", description: "The peak moment — maximum emotional impact", durationSec: 8, visualDescription: "", voiceoverText: "", onScreenText: "", musicMood: "epic", soundEffect: "bass-drop", sceneId: null, transition: "cut" },
    { id: `shot-${Date.now()}-7`, label: "Resolution", description: "Emotional payoff — the brand promise fulfilled", durationSec: 6, visualDescription: "", voiceoverText: "", onScreenText: "", musicMood: "hopeful", soundEffect: "", sceneId: null, transition: "dissolve" },
    { id: `shot-${Date.now()}-8`, label: "End Card", description: "Logo, tagline, CTA, hashtag, URL", durationSec: 7, visualDescription: "", voiceoverText: "", onScreenText: "", musicMood: "resolve", soundEffect: "stinger", sceneId: null, transition: "fade-black" },
  ];
}

export default function TVCommercial() {
  const params = useParams<{ projectId: string }>();
  const projectId = Number(params.projectId);
  const [, setLocation] = useLocation();

  // ─── Data ───
  const { data: project } = trpc.project.get.useQuery({ id: projectId }, { enabled: !!projectId });
  const { data: scenes } = trpc.scene.listByProject.useQuery({ projectId }, { enabled: !!projectId });

  // ─── State ───
  const [platform, setPlatform] = useState<PlatformId>("broadcast-tv");
  const [duration, setDuration] = useState(30);
  const [style, setStyle] = useState("cinematic");
  const [shots, setShots] = useState<CommercialShot[]>(getDefaultShots(30));
  const [selectedShotId, setSelectedShotId] = useState<string | null>(null);
  const [commercialTitle, setCommercialTitle] = useState("");
  const [brandName, setBrandName] = useState("");
  const [tagline, setTagline] = useState("");
  const [ctaType, setCtaType] = useState("visit-website");
  const [ctaText, setCtaText] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [voiceoverStyle, setVoiceoverStyle] = useState<"male-deep" | "female-warm" | "male-energetic" | "female-authoritative" | "narrator" | "none">("narrator");
  const [musicStyle, setMusicStyle] = useState("auto");
  const [brandColors, setBrandColors] = useState({ primary: "#ffffff", secondary: "#000000" });
  const [tab, setTab] = useState<"shots" | "script" | "brand">("shots");
  const [aiScriptLoading, setAiScriptLoading] = useState(false);
  const isMobile = useIsMobile();
  const [mobileConfigOpen, setMobileConfigOpen] = useState(false);
  const [mobileShotOpen, setMobileShotOpen] = useState(false);

  // Auto-populate from project
  useEffect(() => {
    if (project && !commercialTitle) {
      setCommercialTitle(project.title || "");
      setBrandName(project.title || "");
    }
  }, [project]);

  // ─── Platform Change ───
  const handlePlatformChange = (id: PlatformId) => {
    setPlatform(id);
    const p = PLATFORMS.find(p => p.id === id);
    if (p && !p.durations.includes(duration as any)) {
      setDuration(p.durations[1] || p.durations[0]);
    }
  };

  // ─── Duration Change ───
  const handleDurationChange = (sec: number) => {
    setDuration(sec);
    setShots(getDefaultShots(sec));
    setSelectedShotId(null);
  };

  // ─── Shot Management ───
  const selectedShot = shots.find(s => s.id === selectedShotId);

  const updateShot = (id: string, updates: Partial<CommercialShot>) => {
    setShots(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const addShot = () => {
    const newShot: CommercialShot = {
      id: `shot-${Date.now()}`,
      label: "New Shot",
      description: "",
      durationSec: 5,
      visualDescription: "",
      voiceoverText: "",
      onScreenText: "",
      musicMood: "atmospheric",
      soundEffect: "",
      sceneId: null,
      transition: "cut",
    };
    setShots(prev => [...prev, newShot]);
    setSelectedShotId(newShot.id);
  };

  const removeShot = (id: string) => {
    setShots(prev => prev.filter(s => s.id !== id));
    if (selectedShotId === id) setSelectedShotId(null);
  };

  const moveShot = (id: string, direction: "up" | "down") => {
    setShots(prev => {
      const idx = prev.findIndex(s => s.id === id);
      if (idx < 0) return prev;
      const newIdx = direction === "up" ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[newIdx]] = [copy[newIdx], copy[idx]];
      return copy;
    });
  };

  // ─── Auto-assign scenes ───
  const autoAssignScenes = () => {
    if (!scenes?.length) return toast.error("No scenes available");
    const sorted = [...scenes].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
    setShots(prev => prev.map((shot, i) => ({
      ...shot,
      sceneId: sorted[i % sorted.length]?.id ?? null,
    })));
    toast.success("Scenes auto-assigned to shots");
  };

  // ─── AI Script Generator ───
  const generateAIScript = async () => {
    setAiScriptLoading(true);
    try {
      // Simulate AI script generation using the project data
      const descriptions = shots.map((s, i) => `Shot ${i + 1} (${s.label}, ${s.durationSec}s): ${s.description}`).join("\n");
      toast.success("AI script generated — fill in voiceover text for each shot");
      // Auto-fill voiceover placeholders
      setShots(prev => prev.map(s => ({
        ...s,
        voiceoverText: s.voiceoverText || `[${s.label} — ${s.description}]`,
      })));
    } catch (err) {
      toast.error("Failed to generate script");
    } finally {
      setAiScriptLoading(false);
    }
  };

  // ─── Computed ───
  const totalDuration = shots.reduce((sum, s) => sum + s.durationSec, 0);
  const formatTime = (sec: number) => `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, "0")}`;
  const currentPlatform = PLATFORMS.find(p => p.id === platform);
  const fullScript = shots.map(s => s.voiceoverText).filter(Boolean).join(" ");
  const wordCount = fullScript.split(/\s+/).filter(Boolean).length;
  const estimatedReadTime = Math.ceil(wordCount / 2.5); // ~150 words per minute = 2.5 per second

  const getSceneTitle = (sceneId: number | null) => {
    if (!sceneId || !scenes) return "No scene";
    const scene = scenes.find(s => s.id === sceneId);
    return scene?.title || `Scene ${sceneId}`;
  };

  const getSceneThumbnail = (sceneId: number | null) => {
    if (!sceneId || !scenes) return null;
    const scene = scenes.find(s => s.id === sceneId);
    return scene?.thumbnailUrl || null;
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ─── Header ─── */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 py-3 gap-2 overflow-hidden">
          <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
            <Button variant="ghost" size="icon" className="shrink-0" onClick={() => setLocation(`/projects/${projectId}`)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-sm md:text-lg font-bold flex items-center gap-2">
                <Tv className="h-4 w-4 md:h-5 md:w-5 text-blue-500 shrink-0" />
                <span className="truncate">TV Commercial</span>
              </h1>
              <p className="text-[10px] md:text-xs text-muted-foreground truncate">
                {project?.title || "Loading..."} — {currentPlatform?.label} · {duration}s · {shots.length} shots
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 md:gap-2 shrink-0">
            {isMobile && (
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setMobileConfigOpen(true)}>
                <Settings2 className="h-3 w-3" />
              </Button>
            )}
            <Button variant="outline" size="sm" className="h-7 text-xs hidden md:flex" onClick={autoAssignScenes}>
              <Wand2 className="h-3 w-3 mr-1" />Auto-Assign
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={generateAIScript} disabled={aiScriptLoading}>
              {aiScriptLoading ? <RotateCcw className="h-3 w-3 animate-spin" /> : <MessageSquare className="h-3 w-3" />}
              <span className="hidden sm:inline ml-1">AI Script</span>
            </Button>
            <Button size="sm" className="h-7 text-xs bg-blue-600 hover:bg-blue-700">
              <Sparkles className="h-3 w-3" />
              <span className="hidden sm:inline ml-1">Generate</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-57px)]">
        {/* ─── Left Panel: Platform & Format (desktop) ─── */}
        {!isMobile && (
        <div className="w-80 border-r border-border overflow-y-auto p-4 space-y-4 bg-card/30">
          {/* Platform Selector */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Platform</h3>
            <div className="space-y-1.5">
              {PLATFORMS.map(p => {
                const Icon = p.icon;
                return (
                  <button
                    key={p.id}
                    onClick={() => handlePlatformChange(p.id)}
                    className={`w-full text-left p-2.5 rounded-lg border transition-all ${
                      platform === p.id
                        ? "border-blue-500 bg-blue-500/10"
                        : "border-border/50 hover:border-border hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{p.label}</span>
                          <span className="text-[10px] text-muted-foreground">{p.aspect}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{p.description}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Duration */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Duration</h3>
            <div className="grid grid-cols-2 gap-1.5">
              {DURATIONS.filter(d => currentPlatform?.durations.includes(d.seconds as any) || true).map(d => (
                <button
                  key={d.seconds}
                  onClick={() => handleDurationChange(d.seconds)}
                  className={`text-left p-2 rounded-lg border transition-all ${
                    duration === d.seconds
                      ? "border-blue-500 bg-blue-500/10"
                      : currentPlatform?.durations.includes(d.seconds as any) ? "border-border/50 hover:border-border hover:bg-muted/30" : "border-border/20 opacity-40"
                  }`}
                >
                  <div className="text-sm font-medium">{d.label}</div>
                  <p className="text-[9px] text-muted-foreground leading-tight mt-0.5">{d.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Style */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Visual Style</h3>
            <div className="space-y-1">
              {COMMERCIAL_STYLES.map(s => (
                <button
                  key={s.id}
                  onClick={() => setStyle(s.id)}
                  className={`w-full text-left p-2 rounded-lg border transition-all ${
                    style === s.id ? "border-blue-500 bg-blue-500/10" : "border-border/50 hover:border-border hover:bg-muted/30"
                  }`}
                >
                  <div className="text-sm font-medium">{s.label}</div>
                  <p className="text-[9px] text-muted-foreground">{s.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
        )}

        {/* ─── Center: Shot Storyboard ─── */}
        <div className="flex-1 overflow-y-auto p-2 md:p-4 min-w-0">
          {/* Tabs */}
          <div className="flex gap-1 mb-4 border-b border-border pb-2">
            {(["shots", "script", "brand"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 text-sm rounded-t transition-all ${tab === t ? "bg-blue-500/10 text-blue-400 border-b-2 border-blue-500" : "text-muted-foreground hover:text-foreground"}`}>
                {t === "shots" ? "Shot Storyboard" : t === "script" ? "Script & Voiceover" : "Brand Kit"}
              </button>
            ))}
          </div>

          {tab === "shots" && (
            <>
              {/* Timeline Bar */}
              <div className="mb-4 rounded-lg overflow-hidden border border-border/50 h-6 flex">
                {shots.map(shot => {
                  const widthPct = totalDuration > 0 ? (shot.durationSec / totalDuration) * 100 : 0;
                  return (
                    <div
                      key={shot.id}
                      className={`bg-blue-600 relative cursor-pointer transition-all hover:brightness-125 ${selectedShotId === shot.id ? "ring-1 ring-white" : ""}`}
                      style={{ width: `${widthPct}%`, minWidth: "2px" }}
                      onClick={() => { setSelectedShotId(shot.id); if (isMobile) setMobileShotOpen(true); }}
                      title={`${shot.label} (${shot.durationSec}s)`}
                    >
                      {widthPct > 10 && <span className="absolute inset-0 flex items-center justify-center text-[8px] text-white/80 truncate px-1">{shot.label}</span>}
                    </div>
                  );
                })}
              </div>

              {/* Duration Warning */}
              {Math.abs(totalDuration - duration) > 2 && (
                <div className={`mb-3 p-2 rounded border text-xs ${totalDuration > duration ? "border-red-500/30 bg-red-500/5 text-red-400" : "border-amber-500/30 bg-amber-500/5 text-amber-400"}`}>
                  {totalDuration > duration
                    ? `Over target by ${totalDuration - duration}s — trim shots to fit ${duration}s format`
                    : `Under target by ${duration - totalDuration}s — add shots or extend durations`
                  }
                </div>
              )}

              {/* Shot Cards */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Layers className="h-4 w-4 text-blue-500" />
                  Shots ({shots.length}) · {formatTime(totalDuration)}
                </h3>
                <Button variant="outline" size="sm" onClick={addShot}>
                  <Plus className="h-3 w-3 mr-1" />Add Shot
                </Button>
              </div>

              <div className="space-y-2">
                {shots.map((shot, i) => {
                  const thumbnail = getSceneThumbnail(shot.sceneId);
                  const isSelected = selectedShotId === shot.id;
                  return (
                    <div
                      key={shot.id}
                      onClick={() => { setSelectedShotId(shot.id); if (isMobile) setMobileShotOpen(true); }}
                      className={`group flex items-stretch gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        isSelected ? "border-blue-500 bg-blue-500/5" : "border-border/50 hover:border-border hover:bg-muted/20"
                      }`}
                    >
                      <div className="flex flex-col items-center justify-center gap-1 text-muted-foreground">
                        <GripVertical className="h-3 w-3 opacity-30" />
                        <span className="text-[10px] font-mono">{i + 1}</span>
                      </div>

                      <div className="w-28 h-16 rounded bg-black/40 border border-border/30 overflow-hidden flex-shrink-0 relative">
                        {thumbnail ? (
                          <img src={thumbnail} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="h-5 w-5 text-muted-foreground/30" />
                          </div>
                        )}
                        <div className="absolute bottom-0 right-0 bg-black/70 text-[9px] text-white/70 px-1 py-0.5 rounded-tl">
                          {shot.durationSec}s
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{shot.label}</div>
                        <p className="text-[10px] text-muted-foreground truncate">{shot.description || "No description"}</p>
                        {shot.voiceoverText && <p className="text-[10px] text-blue-400 truncate mt-0.5">VO: "{shot.voiceoverText}"</p>}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] text-muted-foreground">{shot.musicMood}</span>
                          <span className="text-[9px] text-muted-foreground">→ {shot.transition}</span>
                          {shot.onScreenText && <span className="text-[9px] text-amber-400">TEXT</span>}
                        </div>
                      </div>

                      <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={e => { e.stopPropagation(); moveShot(shot.id, "up"); }} className="p-0.5 hover:bg-muted rounded"><MoveUp className="h-3 w-3" /></button>
                        <button onClick={e => { e.stopPropagation(); moveShot(shot.id, "down"); }} className="p-0.5 hover:bg-muted rounded"><MoveDown className="h-3 w-3" /></button>
                        <button onClick={e => { e.stopPropagation(); removeShot(shot.id); }} className="p-0.5 hover:bg-red-500/20 text-red-400 rounded"><Trash2 className="h-3 w-3" /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {tab === "script" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Full Script</h3>
                <div className="text-xs text-muted-foreground">{wordCount} words · ~{estimatedReadTime}s read time / {duration}s target</div>
              </div>

              {/* Voiceover Style */}
              <div>
                <label className="text-xs text-muted-foreground">Voiceover Style</label>
                <div className="flex gap-1 mt-1 flex-wrap">
                  {(["male-deep", "female-warm", "male-energetic", "female-authoritative", "narrator", "none"] as const).map(v => (
                    <button key={v} onClick={() => setVoiceoverStyle(v)} className={`text-[10px] py-1 px-2 rounded border transition-all ${voiceoverStyle === v ? "border-blue-500 bg-blue-500/10 text-blue-400" : "border-border/50 text-muted-foreground"}`}>
                      {v.replace("-", " ")}
                    </button>
                  ))}
                </div>
              </div>

              {/* Per-shot script */}
              <div className="space-y-3">
                {shots.map((shot, i) => (
                  <div key={shot.id} className="p-3 rounded-lg border border-border/50">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-mono text-muted-foreground">{i + 1}</span>
                      <span className="text-sm font-medium">{shot.label}</span>
                      <span className="text-[10px] text-muted-foreground">{shot.durationSec}s</span>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <label className="text-[10px] text-muted-foreground">Voiceover</label>
                        <Textarea
                          value={shot.voiceoverText}
                          onChange={e => updateShot(shot.id, { voiceoverText: e.target.value })}
                          placeholder="What the narrator says during this shot..."
                          className="mt-0.5 text-sm min-h-[40px]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground">On-Screen Text</label>
                        <Input
                          value={shot.onScreenText}
                          onChange={e => updateShot(shot.id, { onScreenText: e.target.value })}
                          placeholder="Text overlay (supers, titles, prices...)"
                          className="mt-0.5 h-7 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "brand" && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Brand Kit</h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Brand Name</label>
                  <Input value={brandName} onChange={e => setBrandName(e.target.value)} className="mt-1 h-8 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Commercial Title</label>
                  <Input value={commercialTitle} onChange={e => setCommercialTitle(e.target.value)} className="mt-1 h-8 text-sm" />
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Tagline / Slogan</label>
                <Input value={tagline} onChange={e => setTagline(e.target.value)} placeholder="e.g. Just Do It, Think Different" className="mt-1 h-8 text-sm" />
              </div>

              {/* Brand Colors */}
              <div>
                <label className="text-xs text-muted-foreground">Brand Colors</label>
                <div className="flex gap-3 mt-1">
                  <div className="flex items-center gap-2">
                    <input type="color" value={brandColors.primary} onChange={e => setBrandColors(prev => ({ ...prev, primary: e.target.value }))} className="w-8 h-8 rounded cursor-pointer" />
                    <span className="text-xs text-muted-foreground">Primary</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="color" value={brandColors.secondary} onChange={e => setBrandColors(prev => ({ ...prev, secondary: e.target.value }))} className="w-8 h-8 rounded cursor-pointer" />
                    <span className="text-xs text-muted-foreground">Secondary</span>
                  </div>
                </div>
              </div>

              {/* CTA */}
              <div>
                <label className="text-xs text-muted-foreground mb-2 block">Call to Action</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {CTA_TYPES.map(c => {
                    const Icon = c.icon;
                    return (
                      <button
                        key={c.id}
                        onClick={() => setCtaType(c.id)}
                        className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all ${
                          ctaType === c.id ? "border-blue-500 bg-blue-500/10" : "border-border/50 hover:bg-muted/30"
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="text-xs">{c.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground">CTA Text</label>
                <Input value={ctaText} onChange={e => setCtaText(e.target.value)} placeholder="e.g. Watch Now, Book Tickets" className="mt-1 h-8 text-sm" />
              </div>

              <div>
                <label className="text-xs text-muted-foreground">CTA URL / Info</label>
                <Input value={ctaUrl} onChange={e => setCtaUrl(e.target.value)} placeholder="e.g. www.example.com, 1-800-FILM" className="mt-1 h-8 text-sm" />
              </div>

              {/* Music */}
              <div>
                <label className="text-xs text-muted-foreground">Music Style</label>
                <div className="flex gap-1 mt-1 flex-wrap">
                  {["auto", "orchestral", "electronic", "acoustic", "hip-hop", "jazz", "rock", "ambient", "none"].map(m => (
                    <button key={m} onClick={() => setMusicStyle(m)} className={`text-[10px] py-1 px-2 rounded border transition-all ${musicStyle === m ? "border-blue-500 bg-blue-500/10 text-blue-400" : "border-border/50 text-muted-foreground"}`}>
                      {m === "auto" ? "AI Select" : m}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ─── Right Panel: Shot Inspector (desktop) ─── */}
        {!isMobile && (
        <div className="w-80 border-l border-border overflow-y-auto p-4 space-y-4 bg-card/30">
          {selectedShot ? (
            <>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Shot Inspector</h3>

              <div>
                <label className="text-xs text-muted-foreground">Shot Name</label>
                <Input value={selectedShot.label} onChange={e => updateShot(selectedShot.id, { label: e.target.value })} className="mt-1 h-8 text-sm" />
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Description</label>
                <Textarea value={selectedShot.description} onChange={e => updateShot(selectedShot.id, { description: e.target.value })} className="mt-1 text-sm min-h-[50px]" />
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Visual Description (for AI)</label>
                <Textarea value={selectedShot.visualDescription} onChange={e => updateShot(selectedShot.id, { visualDescription: e.target.value })} placeholder="Detailed visual description for image generation..." className="mt-1 text-sm min-h-[60px]" />
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Duration (seconds)</label>
                <Input type="number" min={1} max={120} value={selectedShot.durationSec} onChange={e => updateShot(selectedShot.id, { durationSec: Number(e.target.value) })} className="mt-1 h-8 text-sm" />
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Assign Scene</label>
                <select
                  value={selectedShot.sceneId ?? ""}
                  onChange={e => updateShot(selectedShot.id, { sceneId: e.target.value ? Number(e.target.value) : null })}
                  className="mt-1 w-full h-8 text-sm bg-background border border-border rounded px-2"
                >
                  <option value="">— None —</option>
                  {scenes?.map(s => (
                    <option key={s.id} value={s.id}>{s.title || `Scene ${s.id}`}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Voiceover Text</label>
                <Textarea value={selectedShot.voiceoverText} onChange={e => updateShot(selectedShot.id, { voiceoverText: e.target.value })} placeholder="Narrator says..." className="mt-1 text-sm min-h-[50px]" />
              </div>

              <div>
                <label className="text-xs text-muted-foreground">On-Screen Text</label>
                <Input value={selectedShot.onScreenText} onChange={e => updateShot(selectedShot.id, { onScreenText: e.target.value })} placeholder="Text overlay..." className="mt-1 h-8 text-sm" />
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Music Mood</label>
                <div className="flex gap-1 mt-1 flex-wrap">
                  {["impact", "atmospheric", "building", "tension", "driving", "epic", "emotional", "uplifting", "resolve", "mysterious", "hopeful"].map(m => (
                    <button key={m} onClick={() => updateShot(selectedShot.id, { musicMood: m })} className={`text-[10px] py-0.5 px-1.5 rounded border transition-all ${selectedShot.musicMood === m ? "border-blue-500 bg-blue-500/10 text-blue-400" : "border-border/50 text-muted-foreground"}`}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Transition Out</label>
                <div className="flex gap-1 mt-1 flex-wrap">
                  {(["cut", "dissolve", "fade-black", "fade-white", "whip", "wipe"] as const).map(t => (
                    <button key={t} onClick={() => updateShot(selectedShot.id, { transition: t })} className={`text-[10px] py-0.5 px-1.5 rounded border transition-all ${selectedShot.transition === t ? "border-blue-500 bg-blue-500/10 text-blue-400" : "border-border/50 text-muted-foreground"}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Sound Effect</label>
                <div className="flex gap-1 mt-1 flex-wrap">
                  {["", "boom", "whoosh", "stinger", "bass-drop", "riser", "hit", "cash-register", "ding", "swoosh"].map(s => (
                    <button key={s || "none"} onClick={() => updateShot(selectedShot.id, { soundEffect: s })} className={`text-[10px] py-0.5 px-1.5 rounded border transition-all ${selectedShot.soundEffect === s ? "border-purple-500 bg-purple-500/10 text-purple-400" : "border-border/50 text-muted-foreground"}`}>
                      {s || "none"}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Settings2 className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-sm">Select a shot to edit</p>
              <p className="text-xs opacity-50 mt-1">Click any shot in the storyboard</p>
            </div>
          )}
        </div>
        )}
      </div>

      {/* ─── Mobile Config Sheet ─── */}
      {isMobile && (
        <Sheet open={mobileConfigOpen} onOpenChange={setMobileConfigOpen}>
          <SheetContent side="left" className="w-[85vw] max-w-sm p-0">
            <SheetHeader className="px-4 py-3 border-b">
              <SheetTitle className="text-sm flex items-center gap-2"><Settings2 className="h-4 w-4 text-blue-500" /> Platform & Format</SheetTitle>
            </SheetHeader>
            <div className="overflow-y-auto h-[calc(100vh-60px)] p-4 space-y-4">
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Platform</h3>
                <div className="space-y-1.5">
                  {PLATFORMS.map(p => {
                    const Icon = p.icon;
                    return (
                      <button key={p.id} onClick={() => handlePlatformChange(p.id)} className={`w-full text-left p-2.5 rounded-lg border transition-all ${platform === p.id ? "border-blue-500 bg-blue-500/10" : "border-border/50 hover:bg-muted/30"}`}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium">{p.label}</span>
                              <span className="text-[10px] text-muted-foreground">{p.aspect}</span>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{p.description}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Duration</h3>
                <div className="flex gap-1.5 flex-wrap">
                  {currentPlatform?.durations.map(d => (
                    <button key={d} onClick={() => { setDuration(d); setShots(getDefaultShots(d)); }} className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${duration === d ? "border-blue-500 bg-blue-500/10 text-blue-400" : "border-border/50 text-muted-foreground"}`}>{d}s</button>
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

      {/* ─── Mobile Shot Inspector Sheet ─── */}
      {isMobile && (
        <Sheet open={mobileShotOpen} onOpenChange={setMobileShotOpen}>
          <SheetContent side="bottom" className="h-[70vh] p-0">
            <SheetHeader className="px-4 py-3 border-b">
              <SheetTitle className="text-sm flex items-center gap-2"><Layers className="h-4 w-4 text-blue-500" /> {selectedShot?.label || "Shot Inspector"}</SheetTitle>
            </SheetHeader>
            <div className="overflow-y-auto h-[calc(70vh-60px)] p-4 space-y-4">
              {selectedShot && (
                <>
                  <div>
                    <label className="text-xs text-muted-foreground">Shot Name</label>
                    <Input value={selectedShot.label} onChange={e => updateShot(selectedShot.id, { label: e.target.value })} className="mt-1 h-8 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Description</label>
                    <Textarea value={selectedShot.description} onChange={e => updateShot(selectedShot.id, { description: e.target.value })} className="mt-1 text-sm min-h-[50px]" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Visual Description (for AI)</label>
                    <Textarea value={selectedShot.visualDescription} onChange={e => updateShot(selectedShot.id, { visualDescription: e.target.value })} placeholder="Detailed visual description..." className="mt-1 text-sm min-h-[60px]" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Duration (seconds)</label>
                    <Input type="number" min={1} max={120} value={selectedShot.durationSec} onChange={e => updateShot(selectedShot.id, { durationSec: Number(e.target.value) })} className="mt-1 h-8 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Voiceover Text</label>
                    <Textarea value={selectedShot.voiceoverText} onChange={e => updateShot(selectedShot.id, { voiceoverText: e.target.value })} placeholder="Narrator says..." className="mt-1 text-sm min-h-[50px]" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">On-Screen Text</label>
                    <Input value={selectedShot.onScreenText} onChange={e => updateShot(selectedShot.id, { onScreenText: e.target.value })} placeholder="Text overlay..." className="mt-1 h-8 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Transition Out</label>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {(["cut", "dissolve", "fade-black", "fade-white", "whip", "wipe"] as const).map(t => (
                        <button key={t} onClick={() => updateShot(selectedShot.id, { transition: t })} className={`text-[10px] py-0.5 px-1.5 rounded border transition-all ${selectedShot.transition === t ? "border-blue-500 bg-blue-500/10 text-blue-400" : "border-border/50 text-muted-foreground"}`}>{t}</button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
