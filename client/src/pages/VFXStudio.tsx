import { useState, useRef } from "react";
  import { trpc } from "@/lib/trpc";
  import { toast } from "sonner";
  import { Button } from "@/components/ui/button";
  import { Badge } from "@/components/ui/badge";
  import { Textarea } from "@/components/ui/textarea";
  import { Input } from "@/components/ui/input";
  import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
  import {
    Sparkles, Layers, Music, Film, Wand2, Zap, Plus, Trash2, ToggleLeft, ToggleRight,
    ChevronRight, Loader2, Download, Play, Pause, RefreshCw, Check, Star, Info,
    Volume2, VolumeX, Eye, ArrowRight, AlertCircle, Settings, Crown, Cpu,
  } from "lucide-react";

  // ─── Types ────────────────────────────────────────────────────────────────────
  interface VfxPack {
    id: number; name: string; category: string; description: string;
    fileCount: number; resolution: string; software: string; tags: string[];
    featured?: boolean; isActive?: boolean;
  }
  interface SfxPack {
    id: number; name: string; category: string; description: string;
    fileCount: number; format: string; tags: string[];
    featured?: boolean; isActive?: boolean;
  }

  // ─── Category colour map ───────────────────────────────────────────────────────
  const CAT_COLORS: Record<string, string> = {
    "Particles":     "#c9a84c", "Explosions": "#e05a2b", "Fire & Smoke": "#e07b2b",
    "Sci-Fi":        "#3bcfe0", "Weather":    "#5ba8e0", "Light FX":     "#f0d060",
    "Transitions":   "#9b7fe0", "Film Textures":"#a08050","Fantasy":      "#e080d0",
    "Horror":        "#c03030", "Glitch":     "#40e0a0", "Water":        "#40a0e0",
    "Atmosphere":    "#e0c060", "Neon/Cyberpunk":"#e040e0",
    "Foley":         "#c9a84c", "Ambience":   "#5ba8e0", "Action":       "#e05a2b",
    "Weapons":       "#c03030", "Vehicles":   "#808080", "Crowds":       "#e0c060",
    "Nature":        "#60c060", "Cinematic":  "#d4a847", "UI/Tech":      "#3bcfe0",
    "Music Stings":  "#9b7fe0", "Underwater": "#40a0e0", "Historical":   "#a08050",
  };

  // ─── Per-pack cinematic image prompts ────────────────────────────────────────
    const PACK_IMAGE_PROMPTS: Record<number, string> = {
      1:   "golden dust motes suspended in god rays slicing through a dark cinematic scene, volumetric light shafts, organic particle scatter, dramatic chiaroscuro lighting, prestige film still 4K",
      2:   "massive pyrotechnic fireball explosion against black sky captured Phantom high-speed camera, spherical shockwave pressure distortion ring, ember debris cloud, Hollywood action film element",
      3:   "billowing practical smoke machine fog filling noir alley, fire embers floating in haze, colored smoke tendrils magenta and amber, atmospheric depth layers, cinematic film grain",
      4:   "futuristic holographic HUD interface overlay glowing blue-white in darkness, translucent scanning grid projection, floating data readout panels, sci-fi prestige film production still",
      5:   "cinematic practical rain streaking through golden streetlamp glow, layered fog banks, puddle reflections of neon signs, wet surfaces glistening, overcast silver diffuse light",
      6:   "anamorphic lens flare horizontal blue-teal streak across darkened cinematic frame, warm amber light leak bleeding from upper corner, oval bokeh balls, Hollywood cinematography",
      7:   "cinematic motion blur light streaks from high-velocity camera whip across city lights at night, overexposure bloom at practicals, crushing vignette, prestige drama film still",
      8:   "extreme close-up Kodak Vision3 film grain organic silver halide texture, halation glow blooming around window highlight, deep corner vignette, analog warmth, 35mm film still",
      9:   "magical golden particle energy swirling around mystical source, crystalline fairy dust glowing, ethereal luminous haze, fantasy epic cinematography, awe-inspiring film frame",
      10:  "psychological horror vignette crushing frame edges, desaturated sickly skin tones with deep inky shadows, high-contrast chiaroscuro, analog film flicker grain, dread atmosphere",
      11:  "digital signal corruption fragmenting cinematic frame, RGB chromatic aberration channel split, datamosh pixel smear, horizontal CRT scanline overlay, glitch art film still",
      12:  "practical water splash impact frozen super slow-motion Phantom camera, underwater caustic light ripple patterns on surfaces, ocean spray mist particles, wet mirror reflections",
      13:  "deep space nebula color field behind spacecraft, dense starfield depth layers, asteroid debris scatter, planetary limb atmosphere glow on horizon, sci-fi epic prestige film still",
      14:  "golden-hour aerial atmospheric haze, volumetric god rays cutting through rolling mist layers, cinematic wide lens, prestige drama landscape, breathtaking light scatter",
      15:  "neon cyberpunk light streak overlays magenta-cyan-amber at night, rain-wet ground mirror reflections of colored city lights, defocused bokeh balls background, neo-noir crushed shadows",
      101: "Hollywood practical pyrotechnic explosion on studio lot, fireball with shockwave debris, pressure wave distortion visible in air, massive scale action film production photography",
      102: "intimate cinematic foley session: artist hands on rich textures — velvet cloth, worn leather, gravel — warm practicals overhead, tactile sound design film production still",
      103: "alien spacecraft interior glowing control panels blue-white, energy weapon discharge lightning arc, holographic interface active in darkness, sci-fi production design film still",
      104: "immersive forest dawn panorama: morning mist layers through ancient canopy, dappled golden light, stream below, birds in branches, prestige nature documentary wide establishing shot",
      105: "psychological horror corridor: single practical ceiling light swing, deep shadow, tension composition, unsettling implied presence at frame edge, arthouse horror cinematography",
      106: "Hong Kong action choreography mid-fight: fists blurred mid-strike, dust particle scatter, dramatic film grain, impact moment frozen in high-speed, Yuen Woo-ping visual language",
      107: "cinematic firearms close-up: revolver hammer cocking in ultra slow-motion, muzzle blast light flash caught on camera, smoke curl from barrel, detailed steel texture, action film",
      108: "high-performance supercar mid-drift on rain-slicked circuit at dusk, tire smoke billowing, motion blur headlights streaking, cinematic automotive commercial prestige aesthetic",
      109: "packed stadium crowd roar at golden hour, thousands of faces lit warm amber, massive scale spectacle, wave sweeping through stands, cinematic sports epic wide establishing shot",
      110: "sweeping nature documentary: eagle soaring over misty mountain valley at dawn, cascading waterfalls, ancient forest canopy, pristine wilderness, golden-hour god rays piercing mist",
      111: "cinematic orchestra concert hall wide shot: full ensemble at fortissimo climax, conductor silhouette mid-beat, brass players raised, chandelier glow, prestige concert film photography",
      112: "sleek sci-fi command center at night, blue holographic displays, operator at glowing terminal, digital data streams flowing across screens, high-tech film production design still",
      113: "grand concert hall dramatic angle: full orchestra tutti at climax, strings bowing in unison, brass raised to sky, chandelier sparkle, prestige concert film wide shot",
      114: "deep ocean underwater world: shafts of cerulean light piercing blue-green water column, whale silhouette at distance, bubble streams rising, deep sea cinematic photography",
      115: "medieval battle epic: armies clashing at dawn on mist-covered field, swords raised, cavalry charge dust cloud, massive scale, Braveheart cinematography, golden sunrise rim light",
    };

    function packImageUrl(_id: number): string {
      return "";
    }

    // ─── Pack thumbnail — real AI-generated cinematic image per pack ──────────────
    function PackThumb({ id, name, category, size = 80 }: { id: number; name: string; category: string; size?: number }) {
      const [loaded, setLoaded] = useState(false);
      const [errored, setErrored] = useState(false);
      const color = CAT_COLORS[category] || "#c9a84c";
      const letter = name[0].toUpperCase();
      const src = packImageUrl(id);
      return (
        <div style={{ width: size, height: size, flexShrink: 0, borderRadius: 10, overflow: "hidden",
          background: `linear-gradient(135deg, ${color}22 0%, ${color}08 100%)`,
          border: `1px solid ${color}40`, display: "flex", alignItems: "center", justifyContent: "center",
          position: "relative" }}>
          {src && !errored && (
            <img src={src} alt={name}
              onLoad={() => setLoaded(true)}
              onError={() => setErrored(true)}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%",
                objectFit: "cover", opacity: loaded ? 1 : 0, transition: "opacity 0.5s ease" }} />
          )}
          {src && !loaded && !errored && (
            <div style={{ position: "absolute", inset: 0,
              background: `linear-gradient(90deg, ${color}08 25%, ${color}20 50%, ${color}08 75%)`,
              backgroundSize: "200% 100%", animation: "pulse 1.8s ease-in-out infinite" }} />
          )}
          {(!src || errored) && (
            <span style={{ fontSize: size * 0.45, fontWeight: 900, color, opacity: 0.9, position: "relative", zIndex: 1 }}>{letter}</span>
          )}
          {loaded && (
            <div style={{ position: "absolute", inset: 0,
              background: `linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.5) 100%)` }} />
          )}
        </div>
      );
    }

    // ─── Audio player component ───────────────────────────────────────────────────
  function AudioPlayer({ url, label }: { url: string; label?: string }) {
    const [playing, setPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);
    const toggle = () => {
      if (!audioRef.current) return;
      if (playing) { audioRef.current.pause(); setPlaying(false); }
      else { audioRef.current.play(); setPlaying(true); }
    };
    return (
      <div className="flex items-center gap-3 p-3 rounded-xl border border-amber-500/20 bg-white/[0.02]">
        <audio ref={audioRef} src={url} onEnded={() => setPlaying(false)} />
        <button onClick={toggle}
          className="w-9 h-9 rounded-full bg-amber-500/20 hover:bg-amber-500/40 flex items-center justify-center transition-colors shrink-0">
          {playing ? <Pause className="w-4 h-4 text-amber-400" /> : <Play className="w-4 h-4 text-amber-400 ml-0.5" />}
        </button>
        <div className="flex-1 min-w-0">
          {label && <p className="text-xs text-white/60 truncate">{label}</p>}
          <div className="h-1.5 bg-white/10 rounded-full mt-1.5 overflow-hidden">
            <div className="h-full bg-amber-500/60 rounded-full" style={{ width: playing ? "60%" : "0%", transition: "width 0.3s" }} />
          </div>
        </div>
        <a href={url} download className="text-amber-400/60 hover:text-amber-400 transition-colors">
          <Download className="w-4 h-4" />
        </a>
      </div>
    );
  }

  // ─── Pipeline status banner ───────────────────────────────────────────────────
  function PipelineBanner() {
    const { data } = trpc.vfxSfx.getActivePipelineContext.useQuery();
    if (!data || data.activeCount === 0) return null;
    return (
      <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-amber-500/30 bg-amber-500/5 mb-5">
        <Cpu className="w-4 h-4 text-amber-400 shrink-0" />
        <p className="text-xs text-amber-300/80">
          <span className="font-bold text-amber-400">{data.activeCount} pack{data.activeCount !== 1 ? "s" : ""} active</span>
          {" "}— automatically injected into every scene you generate
          {data.vfxPackNames?.length ? <span className="text-amber-400/60"> · {data.vfxPackNames.slice(0,2).join(", ")}{data.vfxPackNames.length > 2 ? ` +${data.vfxPackNames.length-2} more` : ""}</span> : null}
        </p>
      </div>
    );
  }

  // ─── Pack card (used in Browse tabs) ─────────────────────────────────────────
  function PackCard({ pack, inLibrary, onAdd, onRemove, busy }: {
    pack: VfxPack | SfxPack; inLibrary: boolean;
    onAdd: () => void; onRemove: () => void; busy: boolean;
  }) {
    const [expanded, setExpanded] = useState(false);
    const color = CAT_COLORS[(pack as any).category] || "#c9a84c";
    const fileKey = "fileCount" in pack ? `${pack.fileCount.toLocaleString()} files` : "";
    const resKey = "resolution" in pack ? (pack as VfxPack).resolution : (pack as SfxPack).format;
    return (
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-colors overflow-hidden">
        <div className="flex items-start gap-4 p-4">
          <PackThumb id={(pack as any).id ?? 0} name={pack.name} category={(pack as any).category} size={72} />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-white truncate">{pack.name}</h3>
                  {(pack as any).featured && <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge className="text-[9px] border-none px-1.5 font-semibold"
                    style={{ background: color + "22", color }}>
                    {(pack as any).category}
                  </Badge>
                  <span className="text-[10px] text-white/30">{fileKey}</span>
                  <span className="text-[10px] text-white/25">{resKey}</span>
                </div>
              </div>
              <button
                onClick={inLibrary ? onRemove : onAdd}
                disabled={busy}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  inLibrary
                    ? "bg-amber-500/15 text-amber-400 hover:bg-red-500/20 hover:text-red-400 border border-amber-500/30"
                    : "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/30"
                } disabled:opacity-40`}>
                {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : inLibrary ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                {inLibrary ? "In Library" : "Add"}
              </button>
            </div>
            <p className={`text-xs text-white/45 mt-2 leading-relaxed ${expanded ? "" : "line-clamp-2"}`}>{pack.description}</p>
            {pack.description.length > 120 && (
              <button onClick={() => setExpanded(e => !e)} className="text-[10px] text-amber-400/60 hover:text-amber-400 mt-1 transition-colors">
                {expanded ? "less" : "more"}
              </button>
            )}
            <div className="flex flex-wrap gap-1 mt-2">
              {pack.tags.slice(0,4).map(t => (
                <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.04] text-white/30">{t}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main page ─────────────────────────────────────────────────────────────────
  export default function VFXStudio() {
    const [tab, setTab] = useState("library");
    const [busyPacks, setBusyPacks] = useState<Set<string>>(new Set());
    const [vfxFilter, setVfxFilter] = useState("All");
    const [sfxFilter, setSfxFilter] = useState("All");

    // Apply-to-Scene state
    const [sceneId, setSceneId] = useState("");
    const [selectedVfxIds, setSelectedVfxIds] = useState<number[]>([]);
    const [applyResult, setApplyResult] = useState<{ enhancedImageUrl: string; originalImageUrl?: string } | null>(null);

    // Custom SFX state
    const [sfxPrompt, setSfxPrompt] = useState("");
    const [sfxDuration, setSfxDuration] = useState(5);
    const [customSfxResult, setCustomSfxResult] = useState<{ audioUrl: string; prompt: string } | null>(null);

    // Project theme state
    const [projectId, setProjectId] = useState("");
    const [themeVfxIds, setThemeVfxIds] = useState<number[]>([]);
    const [themeSfxIds, setThemeSfxIds] = useState<number[]>([]);
    const [themeName, setThemeName] = useState("");

    // Suggest state
    const [suggestResult, setSuggestResult] = useState<{ vfxIds: number[]; sfxIds: number[]; reasoning: string; sfxPrompt: string } | null>(null);

    // ── Queries ────────────────────────────────────────────────────────────────
    const utils = trpc.useUtils();
    const { data: library, isLoading: libLoading } = trpc.vfxSfx.getLibrary.useQuery();
    const { data: vfxPacks } = trpc.vfxSfx.listVfxPacks.useQuery();
    const { data: sfxPacks } = trpc.vfxSfx.listSfxPacks.useQuery();
    const { data: projects } = trpc.project.list.useQuery();

    // ── Mutations ──────────────────────────────────────────────────────────────
    const addToLib = trpc.vfxSfx.addToLibrary.useMutation({
      onSuccess: () => { utils.vfxSfx.getLibrary.invalidate(); utils.vfxSfx.getActivePipelineContext.invalidate(); toast.success("Added to library"); },
      onError: e => toast.error(e.message),
    });
    const removeFromLib = trpc.vfxSfx.removeFromLibrary.useMutation({
      onSuccess: () => { utils.vfxSfx.getLibrary.invalidate(); utils.vfxSfx.getActivePipelineContext.invalidate(); toast.success("Removed from library"); },
      onError: e => toast.error(e.message),
    });
    const setActive = trpc.vfxSfx.setPackActive.useMutation({
      onSuccess: () => { utils.vfxSfx.getLibrary.invalidate(); utils.vfxSfx.getActivePipelineContext.invalidate(); },
      onError: e => toast.error(e.message),
    });
    const applyVfx = trpc.vfxSfx.applyVfxToScene.useMutation({
      onSuccess: data => { setApplyResult(data); toast.success("VFX rendered into scene"); },
      onError: e => toast.error(e.message),
    });
    const genSfx = trpc.vfxSfx.generateCustomSfx.useMutation({
      onSuccess: data => { setCustomSfxResult(data); toast.success("SFX generated"); },
      onError: e => toast.error(e.message),
    });
    const suggestVfx = trpc.vfxSfx.suggestVfxForScene.useMutation({
      onSuccess: data => setSuggestResult(data),
      onError: e => toast.error(e.message),
    });
    const setTheme = trpc.vfxSfx.setProjectVfxTheme.useMutation({
      onSuccess: () => toast.success("Project VFX theme saved"),
      onError: e => toast.error(e.message),
    });

    // ── Helpers ────────────────────────────────────────────────────────────────
    const libraryVfxIds = new Set((library?.vfx || []).map(p => p.id));
    const librarySfxIds = new Set((library?.sfx || []).map(p => p.id));

    function packKey(packId: number, packType: "vfx" | "sfx") { return `${packType}_${packId}`; }

    async function handleAdd(packId: number, packType: "vfx" | "sfx") {
      const key = packKey(packId, packType);
      setBusyPacks(s => new Set(s).add(key));
      try { await addToLib.mutateAsync({ packId, packType }); } finally {
        setBusyPacks(s => { const n = new Set(s); n.delete(key); return n; });
      }
    }
    async function handleRemove(packId: number, packType: "vfx" | "sfx") {
      const key = packKey(packId, packType);
      setBusyPacks(s => new Set(s).add(key));
      try { await removeFromLib.mutateAsync({ packId, packType }); } finally {
        setBusyPacks(s => { const n = new Set(s); n.delete(key); return n; });
      }
    }

    const vfxCategories = ["All", ...Array.from(new Set((vfxPacks || []).map(p => p.category)))];
    const sfxCategories = ["All", ...Array.from(new Set((sfxPacks || []).map(p => p.category)))];
    const filteredVfx = (vfxPacks || []).filter(p => vfxFilter === "All" || p.category === vfxFilter);
    const filteredSfx = (sfxPacks || []).filter(p => sfxFilter === "All" || p.category === sfxFilter);

    const goldGrad = "linear-gradient(135deg,#c9a84c 0%,#f0d090 50%,#c9a84c 100%)";
    const PAGE_BG = "min-h-screen" ;

    return (
      <div className={PAGE_BG} style={{ background: "linear-gradient(160deg,#070604 0%,#0c0a06 60%,#050403 100%)" }}>
        <div className="max-w-6xl mx-auto px-4 py-8">

          {/* ── Header ── */}
          <div className="mb-8">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg,#c9a84c22,#c9a84c08)", border: "1px solid #c9a84c40" }}>
                    <Layers className="w-5 h-5 text-amber-400" />
                  </div>
                  <h1 className="text-3xl font-black tracking-tight"
                    style={{ background: goldGrad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                    VFX & Sound Studio
                  </h1>
                </div>
                <p className="text-sm text-white/40 max-w-xl">
                  Professional VFX elements and AI-generated SFX — integrated directly into your scene generation pipeline.
                  Active packs are automatically injected into every scene render.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {library && (library.vfx.length + library.sfx.length) > 0 && (
                  <Badge className="text-xs border-none px-2.5 py-1 font-semibold"
                    style={{ background: "#c9a84c22", color: "#c9a84c" }}>
                    {(library.vfx.filter(p => p.isActive).length + library.sfx.filter(p => p.isActive).length)} active in pipeline
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <PipelineBanner />

          {/* ── Tabs ── */}
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="flex gap-1 p-1 rounded-xl mb-6 overflow-x-auto"
              style={{ background: "#ffffff08", border: "1px solid #ffffff0a" }}>
              {[
                { value: "library",  label: "My Library",    icon: Star },
                { value: "vfx",      label: "VFX Packs",     icon: Layers },
                { value: "sfx",      label: "Sound Design",  icon: Music },
                { value: "apply",    label: "Apply to Scene",icon: Wand2 },
                { value: "theme",    label: "Project Theme", icon: Film },
              ].map(t => (
                <TabsTrigger key={t.value} value={t.value}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all data-[state=active]:text-black data-[state=active]:shadow-sm"
                  style={{ color: tab === t.value ? "#000" : "#ffffff60",
                    background: tab === t.value ? goldGrad : "transparent" }}>
                  <t.icon className="w-3.5 h-3.5" /> {t.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* ─────────────── TAB 1: MY LIBRARY ─────────────── */}
            <TabsContent value="library">
              {libLoading ? (
                <div className="flex items-center justify-center py-24">
                  <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
                </div>
              ) : (!library || (library.vfx.length + library.sfx.length) === 0) ? (
                <div className="text-center py-20 space-y-4">
                  <div className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center"
                    style={{ background: "#c9a84c18", border: "1px solid #c9a84c30" }}>
                    <Layers className="w-10 h-10 text-amber-400/40" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">Your library is empty</h3>
                    <p className="text-sm text-white/40 mt-1">Browse VFX and Sound Design tabs to add packs.<br />Active packs are automatically applied to every scene you generate.</p>
                  </div>
                  <div className="flex items-center justify-center gap-3">
                    <Button onClick={() => setTab("vfx")} className="bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/30">
                      <Layers className="w-4 h-4 mr-2" /> Browse VFX Packs
                    </Button>
                    <Button onClick={() => setTab("sfx")} className="bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/30">
                      <Music className="w-4 h-4 mr-2" /> Browse SFX Packs
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* How pipeline injection works */}
                  <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-500/15 bg-amber-500/[0.03]">
                    <Info className="w-4 h-4 text-amber-400/70 shrink-0 mt-0.5" />
                    <p className="text-xs text-white/50 leading-relaxed">
                      <span className="text-amber-400 font-semibold">Pipeline injection:</span> Toggle a pack ON to inject its professional cinematic prompt into every scene you generate. 
                      This is equivalent to a VFX supervisor adding directives to your shot list — the AI renderer responds with those exact elements baked into the frame.
                    </p>
                  </div>

                  {/* VFX Library */}
                  {library.vfx.length > 0 && (
                    <section>
                      <h2 className="text-sm font-black text-white/70 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Layers className="w-4 h-4 text-amber-400" /> VFX Packs ({library.vfx.length})
                      </h2>
                      <div className="space-y-2">
                        {library.vfx.map(pack => (
                          <div key={pack.id} className="flex items-center gap-4 p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.03] transition-colors">
                            <PackThumb id={(pack as any).id ?? 0} name={pack.name} category={pack.category} size={52} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-white truncate">{pack.name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <Badge className="text-[9px] border-none px-1.5"
                                  style={{ background: (CAT_COLORS[pack.category] || "#c9a84c") + "22", color: CAT_COLORS[pack.category] || "#c9a84c" }}>
                                  {pack.category}
                                </Badge>
                                <span className="text-[10px] text-white/30">{pack.resolution}</span>
                              </div>
                            </div>
                            {/* Active toggle */}
                            <button onClick={() => setActive.mutate({ packId: pack.id, packType: "vfx", active: !pack.isActive })}
                              className="flex items-center gap-2 text-xs transition-colors px-3 py-1.5 rounded-lg border"
                              style={pack.isActive
                                ? { background: "#c9a84c20", color: "#c9a84c", borderColor: "#c9a84c40" }
                                : { background: "#ffffff08", color: "#ffffff40", borderColor: "#ffffff12" }}>
                              {pack.isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                              {pack.isActive ? "Active" : "Off"}
                            </button>
                            <button onClick={() => handleRemove(pack.id, "vfx")}
                              disabled={busyPacks.has(packKey(pack.id, "vfx"))}
                              className="text-white/20 hover:text-red-400 transition-colors disabled:opacity-40">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* SFX Library */}
                  {library.sfx.length > 0 && (
                    <section>
                      <h2 className="text-sm font-black text-white/70 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Volume2 className="w-4 h-4 text-amber-400" /> SFX Packs ({library.sfx.length})
                      </h2>
                      <div className="space-y-2">
                        {library.sfx.map(pack => (
                          <div key={pack.id} className="flex items-center gap-4 p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.03] transition-colors">
                            <PackThumb id={(pack as any).id ?? 0} name={pack.name} category={pack.category} size={52} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-white truncate">{pack.name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <Badge className="text-[9px] border-none px-1.5"
                                  style={{ background: (CAT_COLORS[pack.category] || "#c9a84c") + "22", color: CAT_COLORS[pack.category] || "#c9a84c" }}>
                                  {pack.category}
                                </Badge>
                                <span className="text-[10px] text-white/30">{pack.format}</span>
                              </div>
                            </div>
                            <button onClick={() => setActive.mutate({ packId: pack.id, packType: "sfx", active: !pack.isActive })}
                              className="flex items-center gap-2 text-xs transition-colors px-3 py-1.5 rounded-lg border"
                              style={pack.isActive
                                ? { background: "#c9a84c20", color: "#c9a84c", borderColor: "#c9a84c40" }
                                : { background: "#ffffff08", color: "#ffffff40", borderColor: "#ffffff12" }}>
                              {pack.isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                              {pack.isActive ? "Active" : "Off"}
                            </button>
                            <button onClick={() => handleRemove(pack.id, "sfx")}
                              disabled={busyPacks.has(packKey(pack.id, "sfx"))}
                              className="text-white/20 hover:text-red-400 transition-colors disabled:opacity-40">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              )}
            </TabsContent>

            {/* ─────────────── TAB 2: VFX PACKS ─────────────── */}
            <TabsContent value="vfx">
              <div className="space-y-5">
                {/* Category filter */}
                <div className="flex flex-wrap gap-2">
                  {vfxCategories.map(cat => (
                    <button key={cat} onClick={() => setVfxFilter(cat)}
                      className="px-3 py-1 rounded-full text-xs font-semibold transition-all"
                      style={vfxFilter === cat
                        ? { background: "#c9a84c30", color: "#c9a84c", border: "1px solid #c9a84c50" }
                        : { background: "#ffffff08", color: "#ffffff40", border: "1px solid #ffffff0a" }}>
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Compare row */}
                <div className="p-3 rounded-xl border border-amber-500/10 bg-amber-500/[0.02] flex items-start gap-3">
                  <Zap className="w-4 h-4 text-amber-400/60 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-white/40 leading-relaxed">
                    <span className="text-amber-400/80 font-semibold">How Virelle beats ActionVFX + Runway combined:</span> Instead of downloading assets and manually compositing them in After Effects, 
                    Virelle injects the VFX prompt directly into the AI renderer — the effect is photorealistically baked into your frame in one generation pass. 
                    Zero compositing. Zero export. Industry-grade results.
                  </p>
                </div>

                <div className="grid gap-3">
                  {filteredVfx.map(pack => (
                    <PackCard key={pack.id} pack={pack}
                      inLibrary={libraryVfxIds.has(pack.id)}
                      onAdd={() => handleAdd(pack.id, "vfx")}
                      onRemove={() => handleRemove(pack.id, "vfx")}
                      busy={busyPacks.has(packKey(pack.id, "vfx"))}
                    />
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* ─────────────── TAB 3: SOUND DESIGN ─────────────── */}
            <TabsContent value="sfx">
              <div className="space-y-6">

                {/* ── Custom SFX Generator — the killer feature ── */}
                <div className="rounded-2xl border p-5 space-y-4"
                  style={{ borderColor: "#c9a84c30", background: "linear-gradient(135deg,#c9a84c08 0%,transparent 100%)" }}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: "#c9a84c20", border: "1px solid #c9a84c40" }}>
                      <Sparkles className="w-4 h-4 text-amber-400" />
                    </div>
                    <div>
                      <h2 className="text-sm font-black text-white">AI Custom SFX Generator</h2>
                      <p className="text-[11px] text-white/40">Describe any sound — ElevenLabs generates it in seconds. No SFX library has this.</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Textarea
                      value={sfxPrompt}
                      onChange={e => setSfxPrompt(e.target.value)}
                      placeholder="Describe exactly what you need: e.g. 'A massive cathedral door creaking open with stone scraping, deep reverb, with a distant choir echo fading in'"
                      className="min-h-[80px] resize-none bg-white/[0.04] border-white/10 text-white placeholder:text-white/25 text-sm"
                    />
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-3">
                        <label className="text-xs text-white/50 whitespace-nowrap">Duration: <span className="text-amber-400 font-bold">{sfxDuration}s</span></label>
                        <input type="range" min={1} max={22} value={sfxDuration} onChange={e => setSfxDuration(Number(e.target.value))}
                          className="w-24 accent-amber-500" />
                      </div>
                      <Button onClick={() => genSfx.mutate({ prompt: sfxPrompt, durationSeconds: sfxDuration })}
                        disabled={!sfxPrompt.trim() || genSfx.isPending}
                        className="ml-auto font-black text-black"
                        style={{ background: goldGrad }}>
                        {genSfx.isPending ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Generating...</> : <><Sparkles className="w-4 h-4 mr-2" />Generate SFX</>}
                      </Button>
                    </div>

                    {genSfx.error?.message?.includes("NO_ELEVENLABS_KEY") && (
                      <div className="flex items-start gap-3 p-3 rounded-xl border border-amber-500/20 bg-amber-500/5">
                        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div className="text-xs text-white/60">
                          <span className="text-amber-400 font-semibold">ElevenLabs key required.</span> Add your free key in{" "}
                          <a href="/settings/api-keys" className="text-amber-400 underline">Settings → API Keys</a>.
                          Get a free key at <a href="https://elevenlabs.io" target="_blank" rel="noopener noreferrer" className="text-amber-400 underline">elevenlabs.io</a>.
                        </div>
                      </div>
                    )}

                    {customSfxResult && (
                      <div className="space-y-2">
                        <AudioPlayer url={customSfxResult.audioUrl} label={customSfxResult.prompt} />
                        <p className="text-[10px] text-white/30 text-right">Generated · Right-click audio player to save</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Category filter */}
                <div className="flex flex-wrap gap-2">
                  {sfxCategories.map(cat => (
                    <button key={cat} onClick={() => setSfxFilter(cat)}
                      className="px-3 py-1 rounded-full text-xs font-semibold transition-all"
                      style={sfxFilter === cat
                        ? { background: "#c9a84c30", color: "#c9a84c", border: "1px solid #c9a84c50" }
                        : { background: "#ffffff08", color: "#ffffff40", border: "1px solid #ffffff0a" }}>
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="grid gap-3">
                  {filteredSfx.map(pack => (
                    <PackCard key={pack.id} pack={pack}
                      inLibrary={librarySfxIds.has(pack.id)}
                      onAdd={() => handleAdd(pack.id, "sfx")}
                      onRemove={() => handleRemove(pack.id, "sfx")}
                      busy={busyPacks.has(packKey(pack.id, "sfx"))}
                    />
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* ─────────────── TAB 4: APPLY TO SCENE ─────────────── */}
            <TabsContent value="apply">
              <div className="space-y-6">
                <div className="grid lg:grid-cols-2 gap-6">

                  {/* Left: Controls */}
                  <div className="space-y-5">
                    <div className="p-4 rounded-xl border border-amber-500/15 bg-amber-500/[0.02]">
                      <p className="text-xs text-white/50 leading-relaxed">
                        <span className="text-amber-400 font-semibold">What this does:</span> Takes your scene's existing image and runs an AI VFX second-pass using img2img generation. 
                        The VFX packs you select are translated into precise cinematic prompt language and baked photorealistically into the frame — like having a DI colourist and VFX compositor in one click.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-white/60 uppercase tracking-wider">Scene ID</label>
                      <div className="flex gap-2">
                        <Input value={sceneId} onChange={e => setSceneId(e.target.value)}
                          placeholder="Enter scene ID (visible in Scene Editor URL)"
                          className="bg-white/[0.04] border-white/10 text-white placeholder:text-white/25" />
                        {sceneId && (
                          <Button variant="outline" size="sm"
                            onClick={() => suggestVfx.mutate({ sceneId: Number(sceneId) })}
                            disabled={suggestVfx.isPending || isNaN(Number(sceneId))}
                            className="shrink-0 border-amber-500/30 text-amber-400 hover:bg-amber-500/10">
                            {suggestVfx.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                          </Button>
                        )}
                      </div>
                      {suggestResult && (
                        <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-2">
                          <p className="text-xs font-bold text-amber-400">AI VFX Supervisor Suggests:</p>
                          <p className="text-xs text-white/60">{suggestResult.reasoning}</p>
                          {(suggestResult.vfxIds.length > 0 || suggestResult.sfxIds.length > 0) && (
                            <Button size="sm" className="text-xs h-7"
                              style={{ background: "#c9a84c20", color: "#c9a84c", border: "1px solid #c9a84c30" }}
                              onClick={() => setSelectedVfxIds(suggestResult.vfxIds)}>
                              Apply Suggestions ({suggestResult.vfxIds.length} VFX packs)
                            </Button>
                          )}
                          {suggestResult.sfxPrompt && (
                            <button className="block text-[11px] text-amber-400/60 hover:text-amber-400 transition-colors"
                              onClick={() => { setSfxPrompt(suggestResult.sfxPrompt); setTab("sfx"); }}>
                              → Use AI SFX prompt: "{suggestResult.sfxPrompt.slice(0,60)}..."
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-white/60 uppercase tracking-wider">
                        Select VFX Packs to Apply ({selectedVfxIds.length} selected)
                      </label>
                      <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
                        {(vfxPacks || []).map(pack => {
                          const selected = selectedVfxIds.includes(pack.id);
                          const color = CAT_COLORS[pack.category] || "#c9a84c";
                          return (
                            <label key={pack.id} className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all"
                              style={selected
                                ? { background: color + "12", border: "1px solid " + color + "30" }
                                : { background: "#ffffff04", border: "1px solid #ffffff08" }}>
                              <input type="checkbox" checked={selected}
                                onChange={() => setSelectedVfxIds(ids =>
                                  ids.includes(pack.id) ? ids.filter(i => i !== pack.id) : [...ids, pack.id]
                                )}
                                className="accent-amber-500" />
                              <PackThumb id={(pack as any).id ?? 0} name={pack.name} category={pack.category} size={36} />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-white truncate">{pack.name}</p>
                                <p className="text-[10px] text-white/35">{pack.category}</p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <Button onClick={() => {
                      if (!sceneId || selectedVfxIds.length === 0) return;
                      setApplyResult(null);
                      applyVfx.mutate({ sceneId: Number(sceneId), vfxPackIds: selectedVfxIds });
                    }}
                      disabled={!sceneId || selectedVfxIds.length === 0 || applyVfx.isPending || isNaN(Number(sceneId))}
                      className="w-full h-12 font-black text-black text-base"
                      style={{ background: goldGrad }}>
                      {applyVfx.isPending
                        ? <><Loader2 className="w-5 h-5 animate-spin mr-2" />Rendering VFX pass...</>
                        : <><Wand2 className="w-5 h-5 mr-2" />Apply VFX to Scene</>}
                    </Button>
                  </div>

                  {/* Right: Before/After */}
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-white/60 uppercase tracking-wider">Before / After</label>
                    {applyResult ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <p className="text-[10px] text-white/40 text-center">Original</p>
                            {applyResult.originalImageUrl ? (
                              <img src={applyResult.originalImageUrl} alt="Original" className="w-full rounded-xl object-cover aspect-video" />
                            ) : (
                              <div className="w-full rounded-xl aspect-video bg-white/[0.04] flex items-center justify-center">
                                <Eye className="w-6 h-6 text-white/20" />
                              </div>
                            )}
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] text-amber-400/60 text-center font-semibold">VFX Applied</p>
                            <img src={applyResult.enhancedImageUrl} alt="VFX Enhanced" className="w-full rounded-xl object-cover aspect-video ring-1 ring-amber-500/40" />
                          </div>
                        </div>
                        <a href={applyResult.enhancedImageUrl} download className="flex items-center justify-center gap-2 p-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 text-xs text-amber-400 hover:bg-amber-500/10 transition-colors">
                          <Download className="w-4 h-4" /> Download VFX-enhanced frame
                        </a>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-white/10 aspect-video flex items-center justify-center">
                        <div className="text-center space-y-2">
                          <Eye className="w-8 h-8 text-white/15 mx-auto" />
                          <p className="text-xs text-white/25">Before / after will appear here</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ─────────────── TAB 5: PROJECT THEME ─────────────── */}
            <TabsContent value="theme">
              <div className="max-w-2xl space-y-6">
                <div className="p-4 rounded-xl border border-amber-500/15 bg-amber-500/[0.02]">
                  <p className="text-xs text-white/50 leading-relaxed">
                    <span className="text-amber-400 font-semibold">Project-wide VFX signature:</span> Set a consistent visual and sonic identity for your entire film. 
                    Every scene generated in this project will carry this signature — like a DP establishing the look on day one of principal photography.
                    No other AI film platform offers project-level VFX consistency.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/60 uppercase tracking-wider">Project</label>
                  <select value={projectId} onChange={e => setProjectId(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-white/10 bg-white/[0.04] text-white text-sm">
                    <option value="">Select a project...</option>
                    {(projects || []).map((p: any) => (
                      <option key={p.id} value={p.id}>{p.title || `Project ${p.id}`}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/60 uppercase tracking-wider">Theme Name</label>
                  <Input value={themeName} onChange={e => setThemeName(e.target.value)}
                    placeholder="e.g. Neo-Noir Street Level, Golden Age Hollywood, Sci-Fi Dystopia..."
                    className="bg-white/[0.04] border-white/10 text-white placeholder:text-white/25" />
                </div>

                <div className="grid md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/60 uppercase tracking-wider">
                      VFX Signature ({themeVfxIds.length} packs)
                    </label>
                    <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                      {(vfxPacks || []).map(pack => {
                        const selected = themeVfxIds.includes(pack.id);
                        const color = CAT_COLORS[pack.category] || "#c9a84c";
                        return (
                          <label key={pack.id} className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all"
                            style={selected
                              ? { background: color + "10", border: "1px solid " + color + "25" }
                              : { background: "#ffffff03", border: "1px solid #ffffff06" }}>
                            <input type="checkbox" checked={selected}
                              onChange={() => setThemeVfxIds(ids =>
                                ids.includes(pack.id) ? ids.filter(i => i !== pack.id) : [...ids, pack.id]
                              )} className="accent-amber-500" />
                            <p className="text-xs text-white/70 truncate flex-1">{pack.name}</p>
                            <span className="text-[9px]" style={{ color }}>{pack.category}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/60 uppercase tracking-wider">
                      SFX Signature ({themeSfxIds.length} packs)
                    </label>
                    <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                      {(sfxPacks || []).map(pack => {
                        const selected = themeSfxIds.includes(pack.id);
                        const color = CAT_COLORS[pack.category] || "#c9a84c";
                        return (
                          <label key={pack.id} className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all"
                            style={selected
                              ? { background: color + "10", border: "1px solid " + color + "25" }
                              : { background: "#ffffff03", border: "1px solid #ffffff06" }}>
                            <input type="checkbox" checked={selected}
                              onChange={() => setThemeSfxIds(ids =>
                                ids.includes(pack.id) ? ids.filter(i => i !== pack.id) : [...ids, pack.id]
                              )} className="accent-amber-500" />
                            <p className="text-xs text-white/70 truncate flex-1">{pack.name}</p>
                            <span className="text-[9px]" style={{ color }}>{pack.category}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <Button onClick={() => {
                  if (!projectId) { toast.error("Select a project first"); return; }
                  setTheme.mutate({
                    projectId: Number(projectId),
                    vfxPackIds: themeVfxIds,
                    sfxPackIds: themeSfxIds,
                    themeName: themeName || undefined,
                  });
                }}
                  disabled={!projectId || setTheme.isPending}
                  className="w-full h-12 font-black text-black text-base"
                  style={{ background: goldGrad }}>
                  {setTheme.isPending
                    ? <><Loader2 className="w-5 h-5 animate-spin mr-2" />Saving Theme...</>
                    : <><Film className="w-5 h-5 mr-2" />Save Project VFX Theme</>}
                </Button>

                {/* Competitive callout */}
                <div className="p-4 rounded-2xl border border-white/[0.04] bg-white/[0.02]">
                  <p className="text-xs font-black text-amber-400 mb-2 uppercase tracking-wider">Virelle vs. The Field</p>
                  <div className="space-y-1.5">
                    {[
                      ["ActionVFX", "Static download library. No AI. No pipeline integration. Requires After Effects."],
                      ["ElevenLabs", "SFX generation only. No VFX. No scene integration."],
                      ["Runway", "Video generation. No VFX library. No SFX. No project themes."],
                      ["Adobe Firefly", "Image generation. No VFX injection. No SFX. No film pipeline."],
                      ["Virelle ✦", "VFX + SFX library + AI SFX generation + pipeline injection + project themes + AI VFX suggestions — all in one."],
                    ].map(([platform, desc]) => (
                      <div key={platform} className="flex items-start gap-2">
                        <span className={`text-[10px] font-bold shrink-0 ${platform.includes("Virelle") ? "text-amber-400" : "text-white/30"}`} style={{ minWidth: 90 }}>{platform}</span>
                        <span className={`text-[10px] leading-relaxed ${platform.includes("Virelle") ? "text-white/70" : "text-white/25"}`}>{desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

          </Tabs>
        </div>
      </div>
    );
  }
  