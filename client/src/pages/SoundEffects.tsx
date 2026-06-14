import { useState, useRef } from "react";
  import { useParams, useLocation } from "wouter";
  import { trpc } from "@/lib/trpc";
  import { Button } from "@/components/ui/button";
  import { Input } from "@/components/ui/input";
  import { Label } from "@/components/ui/label";
  import { Textarea } from "@/components/ui/textarea";
  import { Badge } from "@/components/ui/badge";
  import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
  import { Slider } from "@/components/ui/slider";
  import { Switch } from "@/components/ui/switch";
  import { Separator } from "@/components/ui/separator";
  import { toast } from "sonner";
  import {
    ArrowLeft, Plus, Trash2, Wand2, Upload, Loader2, Volume2, Music,
    Mic, Play, Pause, Sliders, Download, Sparkles, Clock,
    CheckCircle2, Search, ChevronDown, ChevronUp, Waves, Radio,
    Zap, Wind, Car, Footprints, Trees, Building2, Headphones,
    FileText, LayoutList, Tag, Save, X, Info, RefreshCw,
  } from "lucide-react";

  // ─── Constants ─────────────────────────────────────────────────────────────────

  const SFX_CATEGORIES = [
    { id: "ambient",     label: "Ambient",           icon: Wind,       color: "text-green-400",   bg: "bg-green-500/10",   border: "border-green-500/30" },
    { id: "impacts",     label: "Impacts",            icon: Zap,        color: "text-red-400",     bg: "bg-red-500/10",     border: "border-red-500/30" },
    { id: "vehicles",    label: "Vehicles",           icon: Car,        color: "text-blue-400",    bg: "bg-blue-500/10",    border: "border-blue-500/30" },
    { id: "footsteps",   label: "Footsteps",          icon: Footprints, color: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/30" },
    { id: "nature",      label: "Nature",             icon: Trees,      color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
    { id: "doors",       label: "Doors & Interiors",  icon: Building2,  color: "text-orange-400",  bg: "bg-orange-500/10",  border: "border-orange-500/30" },
    { id: "electronic",  label: "Electronic",         icon: Radio,      color: "text-cyan-400",    bg: "bg-cyan-500/10",    border: "border-cyan-500/30" },
    { id: "horror",      label: "Horror & Suspense",  icon: Headphones, color: "text-rose-400",    bg: "bg-rose-500/10",    border: "border-rose-500/30" },
    { id: "weather",     label: "Weather",            icon: Wind,       color: "text-sky-400",     bg: "bg-sky-500/10",     border: "border-sky-500/30" },
    { id: "musical",     label: "Musical Stingers",   icon: Music,      color: "text-purple-400",  bg: "bg-purple-500/10",  border: "border-purple-500/30" },
    { id: "foley",       label: "Foley / ADR",        icon: Mic,        color: "text-pink-400",    bg: "bg-pink-500/10",    border: "border-pink-500/30" },
    { id: "crowd",       label: "Crowd & Walla",      icon: Volume2,    color: "text-indigo-400",  bg: "bg-indigo-500/10",  border: "border-indigo-500/30" },
    { id: "weapons",     label: "Weapons",            icon: Zap,        color: "text-red-400",     bg: "bg-red-500/10",     border: "border-red-500/30" },
    { id: "transitions", label: "Transitions",        icon: Waves,      color: "text-violet-400",  bg: "bg-violet-500/10",  border: "border-violet-500/30" },
    { id: "Generated",   label: "AI Generated",       icon: Sparkles,   color: "text-yellow-400",  bg: "bg-yellow-500/10",  border: "border-yellow-500/30" },
  ];

  const BUS_ROUTES = [
    { id: "dialog",   label: "Dialog Bus",   color: "text-blue-400",   bg: "bg-blue-500/10",   dot: "#60a5fa" },
    { id: "sfx",      label: "SFX Bus",      color: "text-pink-400",   bg: "bg-pink-500/10",   dot: "#ec4899" },
    { id: "foley",    label: "Foley Bus",    color: "text-amber-400",  bg: "bg-amber-500/10",  dot: "#fbbf24" },
    { id: "ambience", label: "Ambience Bus", color: "text-green-400",  bg: "bg-green-500/10",  dot: "#4ade80" },
    { id: "music",    label: "Music Bus",    color: "text-purple-400", bg: "bg-purple-500/10", dot: "#c084fc" },
    { id: "master",   label: "Master Bus",   color: "text-yellow-400", bg: "bg-yellow-500/10", dot: "#D4AF37" },
  ];

  // ─── Mix Data (stored as JSON in the notes field) ──────────────────────────────
  interface MixData {
    directorNote: string;
    fadeIn:       number;  // 0–10s
    fadeOut:      number;  // 0–10s
    pan:          number;  // -1.0 (L) → 0 (C) → 1.0 (R)
    reverb:       number;  // 0–1.0 wet amount
    pitchShift:   number;  // -12 → +12 semitones
    cueNumber:    string;
    busRoute:     string;
  }

  const DEFAULT_MIX: MixData = { directorNote: "", fadeIn: 0, fadeOut: 0, pan: 0, reverb: 0, pitchShift: 0, cueNumber: "", busRoute: "sfx" };

  function parseMixData(notes?: string | null): MixData {
    if (!notes) return { ...DEFAULT_MIX };
    try {
      const p = JSON.parse(notes);
      if (typeof p === "object" && !Array.isArray(p) && ("fadeIn" in p || "pan" in p || "busRoute" in p))
        return { ...DEFAULT_MIX, ...p };
      return { ...DEFAULT_MIX, directorNote: notes };
    } catch { return { ...DEFAULT_MIX, directorNote: notes }; }
  }
  function serializeMixData(d: MixData): string { return JSON.stringify(d); }

  // ─── Sub-components ─────────────────────────────────────────────────────────────

  function VolumeBar({ value }: { value: number }) {
    const bars = 16, active = Math.round(value * bars);
    return (
      <div className="flex items-end gap-[2px] h-5 shrink-0">
        {Array.from({ length: bars }).map((_, i) => (
          <div key={i} className="w-[3px] rounded-sm"
            style={{ height: `${22 + (i / bars) * 78}%`, background: i < active ? (i < bars * 0.65 ? "#22c55e" : i < bars * 0.85 ? "#eab308" : "#ef4444") : "rgba(255,255,255,0.07)" }} />
        ))}
      </div>
    );
  }

  function PanStrip({ value }: { value: number }) {
    const pct = ((value + 1) / 2) * 100;
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-[9px] text-muted-foreground font-mono w-3">L</span>
        <div className="relative flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-full bg-white/20" />
          <div className="absolute top-0 h-full rounded-full" style={{
            left: value < 0 ? `${pct}%` : "50%",
            right: value > 0 ? `${100 - pct}%` : "50%",
            background: value === 0 ? "rgba(255,255,255,0.3)" : value < 0 ? "#60a5fa" : "#ec4899",
            minWidth: 3,
          }} />
        </div>
        <span className="text-[9px] text-muted-foreground font-mono w-3 text-right">R</span>
      </div>
    );
  }

  function FadeVisual({ fadeIn, fadeOut, duration }: { fadeIn: number; fadeOut: number; duration: number }) {
    const total = Math.max(duration || 5, fadeIn + fadeOut + 0.5);
    const fi = (fadeIn / total) * 100, fo = (fadeOut / total) * 100;
    return (
      <div className="relative h-5 rounded-md overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
        <div className="absolute left-0 top-0 h-full" style={{ width: `${fi}%`, background: "linear-gradient(90deg, transparent, rgba(236,72,153,0.5))" }} />
        <div className="absolute top-0 h-full" style={{ right: 0, width: `${fo}%`, background: "linear-gradient(270deg, transparent, rgba(236,72,153,0.5))" }} />
        <div className="absolute inset-0" style={{ left: `${fi}%`, right: `${fo}%`, background: "rgba(236,72,153,0.22)" }} />
      </div>
    );
  }

  function ReverbMeter({ value }: { value: number }) {
    return (
      <div className="relative h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
        <div className="h-full rounded-full" style={{ width: `${value * 100}%`, background: "linear-gradient(90deg, #a78bfa, #ec4899)" }} />
      </div>
    );
  }

  // ─── Main Page ──────────────────────────────────────────────────────────────────

  export default function SoundEffects() {
    const params = useParams<{ id: string }>();
    const projectId = parseInt(params.id || "0");
    const [, setLocation] = useLocation();
    const utils = trpc.useUtils();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [activeTab,        setActiveTab]        = useState("mixboard");
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [searchQuery,      setSearchQuery]      = useState("");
    const [playingId,        setPlayingId]        = useState<string | null>(null);
    const [expandedId,       setExpandedId]       = useState<number | null>(null);
    const [uploading,        setUploading]        = useState(false);
    const [mixEdits,         setMixEdits]         = useState<Record<number, Partial<MixData>>>({});
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // AI Generate
    const [aiPrompt,    setAiPrompt]    = useState("");
    const [aiDuration,  setAiDuration]  = useState(5);
    const [aiCategory,  setAiCategory]  = useState("ambient");
    const [aiName,      setAiName]      = useState("");

    const { data: sfxList,  isLoading } = trpc.soundEffect.list.useQuery({ projectId }, { enabled: !!projectId });
    const { data: presets }             = trpc.soundEffect.presets.useQuery();

    const createMutation   = trpc.soundEffect.create.useMutation({ onSuccess: () => { toast.success("Cue added to mix"); utils.soundEffect.list.invalidate(); }, onError: (e) => toast.error(e.message) });
    const updateMutation   = trpc.soundEffect.update.useMutation({ onSuccess: () => utils.soundEffect.list.invalidate(), onError: (e) => toast.error(e.message) });
    const deleteMutation   = trpc.soundEffect.delete.useMutation({ onSuccess: () => { toast.success("Cue removed"); utils.soundEffect.list.invalidate(); }, onError: (e) => toast.error(e.message) });
    const generateMutation = trpc.soundEffect.generateFromText.useMutation({ onSuccess: () => { toast.success("Sound effect generated!"); utils.soundEffect.list.invalidate(); setAiPrompt(""); setAiName(""); }, onError: (e) => toast.error(e.message) });
    const uploadMutation   = trpc.soundEffect.upload.useMutation({
      onSuccess: (data, vars) => { createMutation.mutate({ projectId, name: vars.fileName.replace(/\.[^.]+$/, ""), category: "foley", fileUrl: data.url, fileKey: data.key, isCustom: 1 }); setUploading(false); },
      onError: (e) => { toast.error(e.message); setUploading(false); },
    });

    const playAudio = (url: string, id: string) => {
      if (playingId === id) { audioRef.current?.pause(); setPlayingId(null); return; }
      if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = url; audioRef.current.play(); }
      else { const a = new Audio(url); audioRef.current = a; a.play(); a.onended = () => setPlayingId(null); }
      setPlayingId(id);
    };

    const handleFileUpload = (file: File) => {
      const valid = ["audio/mpeg","audio/mp3","audio/wav","audio/ogg","audio/mp4","audio/webm","audio/x-m4a","audio/aac","audio/flac"];
      if (!valid.includes(file.type)) { toast.error("Unsupported audio format"); return; }
      if (file.size > 50 * 1024 * 1024) { toast.error("File too large — max 50 MB"); return; }
      setUploading(true);
      const reader = new FileReader();
      reader.onload = (e) => { const b64 = (e.target?.result as string).split(",")[1]; uploadMutation.mutate({ projectId, fileName: file.name, fileData: b64, contentType: file.type as any }); };
      reader.readAsDataURL(file);
    };

    const addPreset = (preset: any) => createMutation.mutate({ projectId, name: preset.name, category: preset.category, tags: preset.tags, volume: 0.8 });

    const getMix = (sfx: any): MixData => ({ ...parseMixData(sfx.notes), ...(mixEdits[sfx.id] || {}) });

    const saveMix = (sfx: any, patch: Partial<MixData>) => {
      const updated = { ...parseMixData(sfx.notes), ...patch };
      setMixEdits(p => ({ ...p, [sfx.id]: { ...p[sfx.id], ...patch } }));
      updateMutation.mutate({ id: sfx.id, notes: serializeMixData(updated) });
    };

    const getNextCue = (all: any[]) => {
      const nums = all.map((s: any) => parseInt(parseMixData(s.notes).cueNumber?.replace(/\D/g,"") || "0")).filter((n: number) => !isNaN(n));
      return `SFX-${String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3,"0")}`;
    };

    const allSfx = sfxList || [];
    const filteredSfx = allSfx.filter((s: any) =>
      (selectedCategory === "all" || s.category === selectedCategory) &&
      (!searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    const filteredPresets = (presets || []).filter((p: any) =>
      (selectedCategory === "all" || p.category === selectedCategory) &&
      (!searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    const totalDuration = allSfx.reduce((s: number, e: any) => s + (e.duration || 0), 0);
    const busCounts = BUS_ROUTES.map(b => ({ ...b, count: allSfx.filter((s: any) => (parseMixData(s.notes).busRoute || "sfx") === b.id).length }));

    const exportSpottingSheet = () => {
      const hdr = ["Cue #","Name","Category","Bus","In (s)","Dur (s)","Loop","Vol %","Pan","Fade In","Fade Out","Reverb %","Pitch (st)","Notes"];
      const rows = allSfx.map((s: any, i: number) => {
        const m = getMix(s);
        return [m.cueNumber || `SFX-${String(i+1).padStart(3,"0")}`, `"${s.name}"`, s.category, m.busRoute||"sfx", s.startTime||0, s.duration||"", s.loop?"Y":"N", Math.round((s.volume??0.8)*100), m.pan===0?"C":m.pan<0?`L${Math.abs(Math.round(m.pan*100))}`:`R${Math.round(m.pan*100)}`, m.fadeIn, m.fadeOut, Math.round(m.reverb*100), m.pitchShift, `"${m.directorNote||""}"`].join(",");
      });
      const blob = new Blob([[hdr.join(","), ...rows].join("\n")], { type: "text/csv" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `spotting-sheet-${projectId}.csv`; a.click();
      toast.success("Spotting sheet exported");
    };

    return (
      <div className="min-h-screen" style={{ background: "linear-gradient(135deg,#07070e 0%,#0c0c1a 60%,#080a10 100%)" }}>
        {/* ── Header ── */}
        <div className="border-b sticky top-0 z-20" style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(7,7,14,0.97)", backdropFilter: "blur(24px)" }}>
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => setLocation(`/projects/${projectId}`)} className="gap-2 text-muted-foreground h-8"><ArrowLeft className="h-4 w-4 text-amber-400/70" />Back</Button>
              <div className="h-5 w-px bg-border/40" />
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg,#ec4899,#f43f5e)" }}>
                  <Music className="h-4.5 w-4.5 text-white" style={{ width: 18, height: 18 }} />
                </div>
                <div>
                  <div className="font-bold text-sm tracking-tight">Sound Effects Studio</div>
                  <div className="text-[10px] text-muted-foreground">{allSfx.length} cues · {totalDuration.toFixed(1)}s total runtime</div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={exportSpottingSheet} className="gap-2 h-8 text-xs border-border/50">
                <FileText className="h-3.5 w-3.5" />Spotting Sheet
              </Button>
              <Button size="sm" onClick={() => setActiveTab("aigenerate")} className="gap-2 h-8 text-xs" style={{ background: "linear-gradient(135deg,#ec4899,#f43f5e)" }}>
                <Sparkles className="h-3.5 w-3.5" />AI Generate
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* ── Stats bar ── */}
          <div className="mb-5 grid grid-cols-3 sm:grid-cols-6 gap-3">
            {[
              { label: "Total Cues",   value: allSfx.length,             color: "text-white" },
              { label: "Runtime",      value: `${totalDuration.toFixed(0)}s`, color: "text-white" },
              ...busCounts.slice(0,4).map(b => ({ label: b.label.replace(" Bus",""), value: b.count, color: b.color })),
            ].map((s,i) => (
              <div key={i} className="rounded-xl border px-3 py-2.5" style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
                <div className="text-[9px] text-muted-foreground uppercase tracking-wider">{s.label}</div>
                <div className={`text-xl font-bold mt-0.5 ${s.color}`}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* ── Pipeline banner ── */}
          <div className="mb-6 rounded-xl border px-4 py-3 flex items-start gap-3" style={{ borderColor: "rgba(236,72,153,0.2)", background: "rgba(236,72,153,0.04)" }}>
            <Sparkles className="h-4 w-4 text-pink-400 mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              <span className="text-pink-400 font-semibold">Connected to AI Generation Pipeline.</span>{" "}
              Every cue writes into <span className="font-mono text-[11px] text-pink-300">sfxNotes</span> and <span className="font-mono text-[11px] text-pink-300">sfxProductionNotes</span> — bus routing, fade envelopes, reverb, and spatial pan are injected as compositing parameters at render time.
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6 border border-border/40 bg-black/40 h-9 gap-0.5">
              <TabsTrigger value="mixboard"  className="gap-1.5 text-xs h-7 data-[state=active]:text-amber-400"><Sliders className="h-3.5 w-3.5" />Mix Board</TabsTrigger>
              <TabsTrigger value="library"   className="gap-1.5 text-xs h-7 data-[state=active]:text-amber-400"><Music className="h-3.5 w-3.5" />SFX Library</TabsTrigger>
              <TabsTrigger value="aigenerate" className="gap-1.5 text-xs h-7 data-[state=active]:text-amber-400"><Wand2 className="h-3.5 w-3.5" />AI Studio</TabsTrigger>
              <TabsTrigger value="upload"    className="gap-1.5 text-xs h-7 data-[state=active]:text-amber-400"><Upload className="h-3.5 w-3.5" />Upload</TabsTrigger>
              <TabsTrigger value="spotting"  className="gap-1.5 text-xs h-7 data-[state=active]:text-amber-400"><LayoutList className="h-3.5 w-3.5" />Spotting Sheet</TabsTrigger>
            </TabsList>

            {/* ══════════════════ MIX BOARD ══════════════════ */}
            <TabsContent value="mixboard">
              <div className="space-y-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="relative flex-1 min-w-48 max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search cues…" className="h-8 pl-9 text-xs bg-black/30 border-border/40" />
                  </div>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="h-8 w-44 text-xs bg-black/30 border-border/40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">All Categories</SelectItem>
                      {SFX_CATEGORIES.map(c => <SelectItem key={c.id} value={c.id} className="text-xs">{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {isLoading ? (
                  <div className="space-y-2">{[1,2,3,4].map(i=><div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.03)" }} />)}</div>
                ) : filteredSfx.length === 0 ? (
                  <div className="rounded-2xl border-2 border-dashed flex flex-col items-center py-24 gap-4" style={{ borderColor: "rgba(236,72,153,0.1)" }}>
                    <div className="h-16 w-16 rounded-2xl bg-pink-500/10 flex items-center justify-center">
                      <Music className="h-8 w-8 text-pink-400 opacity-40" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold">No cues in mix</p>
                      <p className="text-xs text-muted-foreground mt-1">Browse the SFX Library, generate with AI, or upload your own files</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setActiveTab("library")} className="gap-1.5 text-xs"><Music className="h-3.5 w-3.5" />Library</Button>
                      <Button size="sm" onClick={() => setActiveTab("aigenerate")} className="gap-1.5 text-xs" style={{ background: "linear-gradient(135deg,#ec4899,#f43f5e)" }}><Sparkles className="h-3.5 w-3.5" />AI Studio</Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Column headers */}
                    <div className="grid gap-2 px-4 py-1.5" style={{ gridTemplateColumns: "36px 1fr 160px 200px 100px 32px" }}>
                      {["","Cue Name","Category / Bus","Volume","Time",""].map((h,i) => (
                        <div key={i} className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/50">{h}</div>
                      ))}
                    </div>

                    {filteredSfx.map((sfx: any) => {
                      const cat  = SFX_CATEGORIES.find(c => c.id === sfx.category);
                      const Icon = cat?.icon || Music;
                      const vol  = sfx.volume ?? 0.8;
                      const mix  = getMix(sfx);
                      const bus  = BUS_ROUTES.find(b => b.id === mix.busRoute) || BUS_ROUTES[1];
                      const isExpanded = expandedId === sfx.id;
                      const isPlaying  = playingId === String(sfx.id);

                      return (
                        <div key={sfx.id} className="rounded-xl border overflow-hidden transition-all duration-200"
                          style={{ borderColor: isExpanded ? "rgba(236,72,153,0.35)" : "rgba(255,255,255,0.07)", background: isExpanded ? "rgba(236,72,153,0.035)" : "rgba(255,255,255,0.02)" }}>
                          {/* Main row */}
                          <div className="grid items-center px-4 py-3 gap-2 cursor-pointer group"
                            style={{ gridTemplateColumns: "36px 1fr 160px 200px 100px 32px" }}
                            onClick={() => setExpandedId(isExpanded ? null : sfx.id)}>

                            {/* Play */}
                            <button onClick={e => { e.stopPropagation(); sfx.fileUrl ? playAudio(sfx.fileUrl, String(sfx.id)) : toast.info("No audio file — generate or upload to preview"); }}
                              className={`h-8 w-8 rounded-full flex items-center justify-center border transition-all ${sfx.fileUrl ? "border-pink-500/25 hover:bg-pink-500/15" : "opacity-25 cursor-not-allowed border-white/10"}`}
                              style={{ background: isPlaying ? "rgba(236,72,153,0.2)" : "transparent" }}>
                              {isPlaying ? <Pause className="h-3.5 w-3.5 text-pink-400" /> : <Play className="h-3.5 w-3.5 text-muted-foreground" />}
                            </button>

                            {/* Name + cue# */}
                            <div className="min-w-0">
                              <p className="text-xs font-semibold truncate">{sfx.name}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                {mix.cueNumber
                                  ? <span className="text-[9px] font-mono text-pink-400/80">{mix.cueNumber}</span>
                                  : <span className="text-[9px] text-muted-foreground/30 italic">no cue #</span>}
                                {sfx.loop ? <span className="text-[9px] bg-blue-500/15 text-blue-400 px-1 rounded">LOOP</span> : null}
                              </div>
                            </div>

                            {/* Category + Bus */}
                            <div className="flex flex-col gap-1">
                              <div className={`inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full w-fit ${cat?.bg}`}>
                                <Icon className={`h-2.5 w-2.5 ${cat?.color}`} style={{ width: 10, height: 10 }} />
                                <span className={cat?.color}>{cat?.label || sfx.category}</span>
                              </div>
                              <div className={`inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full w-fit ${bus.bg}`}>
                                <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: bus.dot }} />
                                <span className={bus.color}>{bus.label}</span>
                              </div>
                            </div>

                            {/* Volume */}
                            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                              <VolumeBar value={vol} />
                              <Slider value={[vol]} onValueChange={([v]) => updateMutation.mutate({ id: sfx.id, volume: v })} min={0} max={1} step={0.01} className="w-16" />
                              <span className="text-[10px] font-mono text-muted-foreground w-7 text-right">{Math.round(vol*100)}%</span>
                            </div>

                            {/* Time */}
                            <div className="text-[10px] text-muted-foreground space-y-0.5">
                              <div className="flex items-center gap-1"><Clock className="h-2.5 w-2.5" style={{ width: 10, height: 10 }} />{sfx.startTime ?? "—"}s in</div>
                              <div className="flex items-center gap-1"><Waves className="h-2.5 w-2.5" style={{ width: 10, height: 10 }} />{sfx.duration ?? "—"}s dur</div>
                            </div>

                            {/* Expand chevron */}
                            <div className="flex justify-end">
                              {isExpanded ? <ChevronUp className="h-4 w-4 text-pink-400" /> : <ChevronDown className="h-4 w-4 text-muted-foreground/50" />}
                            </div>
                          </div>

                          {/* ── Expanded mixer strip ── */}
                          {isExpanded && (
                            <div className="border-t px-4 py-5 space-y-6" style={{ borderColor: "rgba(236,72,153,0.12)", background: "rgba(0,0,0,0.25)" }}>
                              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">

                                {/* Pan */}
                                <div className="space-y-2.5">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Stereo Pan</Label>
                                    <span className="text-[10px] font-mono text-pink-400">
                                      {mix.pan === 0 ? "CENTER" : mix.pan < 0 ? `L${Math.abs(Math.round(mix.pan*100))}` : `R${Math.round(mix.pan*100)}`}
                                    </span>
                                  </div>
                                  <PanStrip value={mix.pan} />
                                  <Slider value={[mix.pan]} onValueChange={([v]) => saveMix(sfx, { pan: parseFloat(v.toFixed(2)) })} min={-1} max={1} step={0.05} />
                                  <div className="flex justify-between text-[9px] text-muted-foreground/50 font-mono">
                                    <span>◀ Left</span><span>Center</span><span>Right ▶</span>
                                  </div>
                                </div>

                                {/* Fade Envelope */}
                                <div className="space-y-2.5">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Fade Envelope</Label>
                                    <span className="text-[10px] font-mono text-muted-foreground">↑{mix.fadeIn}s · {mix.fadeOut}s↓</span>
                                  </div>
                                  <FadeVisual fadeIn={mix.fadeIn} fadeOut={mix.fadeOut} duration={sfx.duration || 5} />
                                  <div className="grid grid-cols-2 gap-3 mt-1">
                                    <div className="space-y-1.5">
                                      <div className="flex justify-between"><Label className="text-[9px] text-muted-foreground">Fade In</Label><span className="text-[9px] font-mono text-muted-foreground">{mix.fadeIn}s</span></div>
                                      <Slider value={[mix.fadeIn]} onValueChange={([v]) => saveMix(sfx, { fadeIn: parseFloat(v.toFixed(1)) })} min={0} max={10} step={0.1} />
                                    </div>
                                    <div className="space-y-1.5">
                                      <div className="flex justify-between"><Label className="text-[9px] text-muted-foreground">Fade Out</Label><span className="text-[9px] font-mono text-muted-foreground">{mix.fadeOut}s</span></div>
                                      <Slider value={[mix.fadeOut]} onValueChange={([v]) => saveMix(sfx, { fadeOut: parseFloat(v.toFixed(1)) })} min={0} max={10} step={0.1} />
                                    </div>
                                  </div>
                                </div>

                                {/* Reverb */}
                                <div className="space-y-2.5">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Reverb / Room</Label>
                                    <span className="text-[10px] font-mono text-pink-400">{Math.round(mix.reverb*100)}% Wet</span>
                                  </div>
                                  <ReverbMeter value={mix.reverb} />
                                  <Slider value={[mix.reverb]} onValueChange={([v]) => saveMix(sfx, { reverb: parseFloat(v.toFixed(2)) })} min={0} max={1} step={0.05} />
                                  <div className="flex justify-between text-[9px] text-muted-foreground/50 font-mono"><span>Dry</span><span>Room</span><span>Hall</span></div>
                                </div>

                                {/* Pitch Shift */}
                                <div className="space-y-2.5">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Pitch Shift</Label>
                                    <span className="text-[10px] font-mono text-pink-400">{mix.pitchShift > 0 ? "+" : ""}{mix.pitchShift} st</span>
                                  </div>
                                  <div className="relative h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
                                    <div className="absolute top-0 h-full bg-violet-500/60 rounded-full"
                                      style={{ left: mix.pitchShift < 0 ? `${((mix.pitchShift+12)/24)*100}%` : "50%", right: mix.pitchShift > 0 ? `${((12-mix.pitchShift)/24)*100}%` : "50%", minWidth: 3 }} />
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-full bg-white/20" />
                                  </div>
                                  <Slider value={[mix.pitchShift]} onValueChange={([v]) => saveMix(sfx, { pitchShift: v })} min={-12} max={12} step={1} />
                                  <div className="flex justify-between text-[9px] text-muted-foreground/50 font-mono"><span>-12 st</span><span>Natural</span><span>+12 st</span></div>
                                </div>

                                {/* Bus + Cue */}
                                <div className="space-y-3">
                                  <div className="space-y-1.5">
                                    <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Bus Routing</Label>
                                    <Select value={mix.busRoute} onValueChange={v => saveMix(sfx, { busRoute: v })}>
                                      <SelectTrigger className="h-8 text-xs bg-black/30 border-border/40"><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        {BUS_ROUTES.map(b => (
                                          <SelectItem key={b.id} value={b.id} className="text-xs">
                                            <div className="flex items-center gap-2">
                                              <div className="h-2 w-2 rounded-full" style={{ background: b.dot }} />
                                              <span className={b.color}>{b.label}</span>
                                            </div>
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-1.5">
                                    <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Cue Number</Label>
                                    <div className="flex gap-2">
                                      <Input value={mix.cueNumber} onChange={e => saveMix(sfx, { cueNumber: e.target.value })} placeholder="SFX-001" className="h-8 text-xs bg-black/30 font-mono border-border/40 flex-1" />
                                      <Button size="sm" variant="outline" className="h-8 px-2 text-[10px] shrink-0 border-border/40" onClick={() => saveMix(sfx, { cueNumber: getNextCue(allSfx) })}>Auto</Button>
                                    </div>
                                  </div>
                                </div>

                                {/* Entry + Loop */}
                                <div className="space-y-3">
                                  <div className="space-y-1.5">
                                    <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Scene Entry Point</Label>
                                    <div className="flex items-center gap-2">
                                      <Input type="number" min={0} step={0.1} value={sfx.startTime || 0}
                                        onChange={e => updateMutation.mutate({ id: sfx.id, startTime: parseFloat(e.target.value)||0 })}
                                        className="h-8 text-xs bg-black/30 font-mono border-border/40 flex-1" />
                                      <span className="text-xs text-muted-foreground shrink-0">seconds</span>
                                    </div>
                                  </div>
                                  <div className="space-y-1.5">
                                    <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Loop Playback</Label>
                                    <div className="flex items-center gap-3 h-8">
                                      <Switch checked={!!sfx.loop} onCheckedChange={v => updateMutation.mutate({ id: sfx.id, loop: v ? 1 : 0 })} />
                                      <span className="text-xs text-muted-foreground">{sfx.loop ? "Loops continuously" : "Single playback"}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Sound Design Notes */}
                              <div className="space-y-1.5">
                                <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Sound Design Notes</Label>
                                <Textarea value={mix.directorNote} onChange={e => saveMix(sfx, { directorNote: e.target.value })}
                                  placeholder="e.g. Swell under dialogue beat — cut hard on door slam. Layer with interior room tone. Reverb tail should bleed into next scene…"
                                  className="min-h-[72px] text-xs bg-black/30 resize-none border-pink-500/10" />
                              </div>

                              {/* Delete */}
                              <div className="flex justify-between items-center pt-1">
                                <span className="text-[9px] text-muted-foreground/50">
                                  {sfx.isCustom ? "Custom upload" : sfx.fileUrl ? "AI generated" : "Preset — no audio file attached"}
                                </span>
                                <button onClick={() => deleteMutation.mutate({ id: sfx.id })}
                                  className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg border border-transparent hover:border-red-500/20 hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-all">
                                  <Trash2 className="h-3.5 w-3.5" />Remove Cue
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ══════════════════ SFX LIBRARY ══════════════════ */}
            <TabsContent value="library">
              <div className="space-y-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="relative flex-1 min-w-48 max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search preset library…" className="h-8 pl-9 text-xs bg-black/30 border-border/40" />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setSelectedCategory("all")} className={`text-[11px] px-3 py-1.5 rounded-full border transition-all ${selectedCategory === "all" ? "border-pink-500/50 bg-pink-500/10 text-pink-400" : "border-border/40 text-muted-foreground hover:border-pink-500/30"}`}>All</button>
                  {SFX_CATEGORIES.map(c => { const Icon = c.icon; return (
                    <button key={c.id} onClick={() => setSelectedCategory(c.id)} className={`flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-full border transition-all ${selectedCategory === c.id ? `${c.bg} ${c.color} ${c.border}` : "border-border/40 text-muted-foreground hover:border-border/60"}`}>
                      <Icon className="h-3 w-3" style={{ width: 12, height: 12 }} />{c.label}
                    </button>
                  ); })}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {filteredPresets.map((preset: any, i: number) => {
                    const cat = SFX_CATEGORIES.find(c => c.id === preset.category);
                    const Icon = cat?.icon || Music;
                    const added = allSfx.some((s: any) => s.name === preset.name);
                    return (
                      <div key={i} className={`flex flex-col gap-2.5 p-3.5 rounded-xl border transition-all hover:border-pink-500/20 ${added ? "opacity-60" : ""}`} style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
                        <div className="flex items-center justify-between gap-2">
                          <div className={`h-8 w-8 rounded-xl ${cat?.bg || "bg-muted/20"} flex items-center justify-center shrink-0`}><Icon className={`h-4 w-4 ${cat?.color}`} style={{ width: 16, height: 16 }} /></div>
                          {added && <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />}
                        </div>
                        <div>
                          <p className="text-xs font-semibold">{preset.name}</p>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {(preset.tags || []).slice(0,3).map((tag: string) => (
                              <span key={tag} className="text-[9px] text-muted-foreground px-1.5 py-0.5 rounded-md" style={{ background: "rgba(255,255,255,0.05)" }}>{tag}</span>
                            ))}
                          </div>
                        </div>
                        <Button size="sm" variant={added ? "ghost" : "outline"} className="w-full h-7 text-[11px] gap-1.5 mt-auto border-border/40"
                          onClick={() => !added && addPreset(preset)} disabled={added || createMutation.isPending}>
                          {added ? <><CheckCircle2 className="h-3 w-3 text-emerald-400" />Added</> : <><Plus className="h-3 w-3" />Add to Mix</>}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </TabsContent>

            {/* ══════════════════ AI STUDIO ══════════════════ */}
            <TabsContent value="aigenerate">
              <div className="max-w-2xl mx-auto space-y-5">
                <div className="rounded-2xl border p-6" style={{ borderColor: "rgba(236,72,153,0.3)", background: "linear-gradient(135deg,rgba(236,72,153,0.06) 0%,transparent 100%)" }}>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="h-12 w-12 rounded-2xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center shrink-0">
                      <Wand2 className="h-6 w-6 text-pink-400 text-amber-400 gold-glow" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base gradient-text-gold">AI Sound Effect Generator</h3>
                      <p className="text-xs text-muted-foreground">Powered by ElevenLabs Sound Generation · Up to 30 seconds</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Cue Name</Label>
                      <Input value={aiName} onChange={e => setAiName(e.target.value)} placeholder="e.g. Heavy Rain on Tin Roof" className="bg-black/30 border-border/40 text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Sound Description</Label>
                      <Textarea value={aiPrompt} onChange={e => setAiPrompt(e.target.value)}
                        placeholder={"Describe your sound in cinematic detail…\n\ne.g. Heavy rain hammering a tin roof with distant rolling thunder, atmospheric and immersive, slowly building in intensity over 8 seconds"}
                        className="min-h-[110px] bg-black/30 border-border/40 resize-none text-sm" />
                      <p className="text-[10px] text-muted-foreground">Include: environment · intensity · duration intent · mood · layering for best results.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between"><Label className="text-xs text-muted-foreground">Duration</Label><span className="text-xs font-mono text-pink-400">{aiDuration}s</span></div>
                        <Slider value={[aiDuration]} onValueChange={([v]) => setAiDuration(v)} min={1} max={30} step={1} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Category</Label>
                        <Select value={aiCategory} onValueChange={setAiCategory}>
                          <SelectTrigger className="h-9 text-xs bg-black/30 border-border/40"><SelectValue /></SelectTrigger>
                          <SelectContent>{SFX_CATEGORIES.map(c => <SelectItem key={c.id} value={c.id} className="text-xs">{c.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button className="w-full gap-2 h-11 font-semibold" style={{ background: "linear-gradient(135deg,#ec4899,#f43f5e)" }}
                      onClick={() => generateMutation.mutate({ projectId, prompt: aiPrompt, durationSeconds: aiDuration, name: aiName || aiPrompt.slice(0,60), category: aiCategory })}
                      disabled={!aiPrompt.trim() || generateMutation.isPending}>
                      {generateMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin text-amber-400" />Generating…</> : <><Sparkles className="h-4 w-4" />Generate Sound Effect</>}
                    </Button>
                  </div>
                </div>

                {/* Prompt tips */}
                <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Professional Prompt Examples</p>
                  <div className="space-y-2">
                    {[
                      { label: "Foley",   tip: "Leather dress shoes on polished marble — sharp heel clicks with slight reverb tail, medium pace, confident stride" },
                      { label: "Weather", tip: "Deep thunderclap rolling across open mountains — cinematic, 3-second decay, heavy LFE rumble" },
                      { label: "Vehicle", tip: "Car door slam in a concrete parking garage — sharp metallic resonance, reverb tail 1.5 seconds" },
                      { label: "Sci-Fi",  tip: "Sci-fi airlock cycling — hiss of pressure equalizing, mechanical clank of bolts releasing, subsonic rumble" },
                      { label: "Horror",  tip: "Distant children laughing that slowly distorts into dissonant screaming — unsettling, 6 seconds" },
                      { label: "Crowd",   tip: "Large film festival audience applause swelling then dying down — warm, reverberant, enthusiastic" },
                    ].map((item, i) => (
                      <button key={i} onClick={() => setAiPrompt(item.tip)}
                        className="w-full text-left p-2.5 rounded-lg border text-xs transition-all hover:border-pink-500/30 hover:bg-pink-500/5 flex items-start gap-2.5"
                        style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                        <Badge variant="outline" className="text-[9px] shrink-0 mt-0.5 border-pink-500/30 text-pink-400 h-4">{item.label}</Badge>
                        <span className="text-muted-foreground leading-relaxed">{item.tip}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ══════════════════ UPLOAD ══════════════════ */}
            <TabsContent value="upload">
              <div className="max-w-lg mx-auto space-y-5">
                <div className="rounded-2xl border-2 border-dashed flex flex-col items-center py-20 gap-5 cursor-pointer transition-all hover:border-pink-500/35"
                  style={{ borderColor: "rgba(236,72,153,0.15)" }}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFileUpload(f); }}
                  onClick={() => fileInputRef.current?.click()}>
                  <div className="h-16 w-16 rounded-2xl bg-pink-500/10 flex items-center justify-center">
                    {uploading ? <Loader2 className="h-8 w-8 text-pink-400 animate-spin text-amber-400" /> : <Upload className="h-8 w-8 text-pink-400" />}
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold">{uploading ? "Uploading…" : "Drop audio file or click to browse"}</p>
                    <p className="text-xs text-muted-foreground mt-1">WAV · MP3 · OGG · FLAC · AAC · M4A · Max 50 MB</p>
                  </div>
                  <Button size="sm" variant="outline" className="gap-2 text-xs border-border/40" disabled={uploading}><Upload className="h-3.5 w-3.5" />Browse Files</Button>
                </div>
                <input ref={fileInputRef} type="file" accept="audio/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = ""; }} />
                <div className="rounded-xl border p-4 space-y-2" style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
                  <p className="text-xs font-semibold text-muted-foreground">Supported formats</p>
                  <div className="flex flex-wrap gap-2">
                    {["WAV (uncompressed)","MP3 (compressed)","FLAC (lossless)","AAC / M4A","OGG Vorbis"].map(f => (
                      <span key={f} className="text-[10px] px-2 py-1 rounded-md text-muted-foreground" style={{ background: "rgba(255,255,255,0.05)" }}>{f}</span>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground pt-1">Files are stored securely on cloud storage and linked to your project. After upload you can assign them to scenes, set entry points, and apply mixer settings.</p>
                </div>
              </div>
            </TabsContent>

            {/* ══════════════════ SPOTTING SHEET ══════════════════ */}
            <TabsContent value="spotting">
              <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h3 className="font-bold text-sm">Production Spotting Sheet</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Share with your sound designer, re-recording mixer, and post-production supervisor</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={exportSpottingSheet} className="gap-2 text-xs border-border/40">
                    <Download className="h-3.5 w-3.5" />Export as CSV
                  </Button>
                </div>
                {allSfx.length === 0 ? (
                  <div className="rounded-xl border-2 border-dashed flex flex-col items-center py-16 gap-3 text-muted-foreground" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                    <LayoutList className="h-10 w-10 opacity-20" />
                    <p className="text-sm">No cues added yet</p>
                    <p className="text-xs opacity-60">Add cues to your mix board to generate a spotting sheet</p>
                  </div>
                ) : (
                  <div className="rounded-xl border overflow-x-auto" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                    <table className="w-full text-xs min-w-[900px]">
                      <thead>
                        <tr className="border-b" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.03)" }}>
                          {["Cue #","Name","Category","Bus","In (s)","Dur (s)","Loop","Vol %","Pan","Fade In","Fade Out","Reverb","Pitch","Notes"].map(h => (
                            <th key={h} className="text-left px-3 py-2.5 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground whitespace-nowrap">{h}</th>
                          ))}
                          <th className="px-3 py-2.5" />
                        </tr>
                      </thead>
                      <tbody className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                        {allSfx.map((sfx: any, i: number) => {
                          const mix = getMix(sfx);
                          const cat = SFX_CATEGORIES.find(c => c.id === sfx.category);
                          const bus = BUS_ROUTES.find(b => b.id === mix.busRoute) || BUS_ROUTES[1];
                          const cue = mix.cueNumber || `SFX-${String(i+1).padStart(3,"0")}`;
                          return (
                            <tr key={sfx.id} className="hover:bg-white/[0.015] transition-colors">
                              <td className="px-3 py-2.5 font-mono font-semibold text-pink-400">{cue}</td>
                              <td className="px-3 py-2.5 font-medium whitespace-nowrap">{sfx.name}</td>
                              <td className="px-3 py-2.5"><span className={`text-[9px] px-1.5 py-0.5 rounded-full ${cat?.bg} ${cat?.color}`}>{sfx.category}</span></td>
                              <td className="px-3 py-2.5"><div className="flex items-center gap-1"><div className="h-1.5 w-1.5 rounded-full" style={{ background: bus.dot }} /><span className={bus.color + " text-[10px]"}>{bus.id}</span></div></td>
                              <td className="px-3 py-2.5 font-mono text-muted-foreground">{sfx.startTime || 0}</td>
                              <td className="px-3 py-2.5 font-mono text-muted-foreground">{sfx.duration || "—"}</td>
                              <td className="px-3 py-2.5 text-center">{sfx.loop ? <span className="text-blue-400 font-bold">Y</span> : <span className="text-muted-foreground/40">N</span>}</td>
                              <td className="px-3 py-2.5 font-mono text-muted-foreground">{Math.round((sfx.volume??0.8)*100)}</td>
                              <td className="px-3 py-2.5 font-mono text-muted-foreground">{mix.pan===0?"C":mix.pan<0?`L${Math.abs(Math.round(mix.pan*100))}`:`R${Math.round(mix.pan*100)}`}</td>
                              <td className="px-3 py-2.5 font-mono text-muted-foreground">{mix.fadeIn}s</td>
                              <td className="px-3 py-2.5 font-mono text-muted-foreground">{mix.fadeOut}s</td>
                              <td className="px-3 py-2.5 font-mono text-muted-foreground">{Math.round(mix.reverb*100)}%</td>
                              <td className="px-3 py-2.5 font-mono text-muted-foreground">{mix.pitchShift>0?"+":""}{mix.pitchShift}st</td>
                              <td className="px-3 py-2.5 max-w-[180px] truncate text-muted-foreground">{mix.directorNote || "—"}</td>
                              <td className="px-3 py-2.5">
                                <button onClick={() => { setExpandedId(sfx.id); setActiveTab("mixboard"); }} className="text-[9px] text-pink-400 hover:underline whitespace-nowrap">Edit →</button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    );
  }
  