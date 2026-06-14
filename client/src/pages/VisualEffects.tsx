import { useState } from "react";
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
    ArrowLeft, Plus, Trash2, Wand2, Download, Loader2, Zap, Eye,
    Layers, Sparkles, CheckCircle2, Search, Film, Palette,
    Sun, Flame, Cloud, Star, Droplets, Monitor, Wind,
    ChevronDown, ChevronUp, FileBarChart2, User, Tag,
    Crosshair, Scissors, BarChart3, AlertTriangle, Info,
    Circle, Square, Triangle, Camera, Settings2, X,
  } from "lucide-react";

  // ─── Constants ─────────────────────────────────────────────────────────────────

  const VFX_CATEGORIES = [
    { id: "explosions",   label: "Fire & Explosions",   icon: Flame,    color: "text-orange-400",  bg: "bg-orange-500/10",  border: "border-orange-500/30" },
    { id: "weather",      label: "Weather",             icon: Cloud,    color: "text-sky-400",     bg: "bg-sky-500/10",     border: "border-sky-500/30" },
    { id: "sci-fi",       label: "Sci-Fi",              icon: Zap,      color: "text-cyan-400",    bg: "bg-cyan-500/10",    border: "border-cyan-500/30" },
    { id: "magic",        label: "Magic & Fantasy",     icon: Sparkles, color: "text-purple-400",  bg: "bg-purple-500/10",  border: "border-purple-500/30" },
    { id: "particles",    label: "Particles",           icon: Star,     color: "text-yellow-400",  bg: "bg-yellow-500/10",  border: "border-yellow-500/30" },
    { id: "water",        label: "Water",               icon: Droplets, color: "text-blue-400",    bg: "bg-blue-500/10",    border: "border-blue-500/30" },
    { id: "screen",       label: "Screen FX & Color",   icon: Monitor,  color: "text-green-400",   bg: "bg-green-500/10",   border: "border-green-500/30" },
    { id: "destruction",  label: "Destruction",         icon: Wind,     color: "text-red-400",     bg: "bg-red-500/10",     border: "border-red-500/30" },
    { id: "light",        label: "Lighting",            icon: Sun,      color: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/30" },
    { id: "creature",     label: "Creature FX",         icon: Eye,      color: "text-rose-400",    bg: "bg-rose-500/10",    border: "border-rose-500/30" },
    { id: "crowd",        label: "Digital Crowd",       icon: User,     color: "text-indigo-400",  bg: "bg-indigo-500/10",  border: "border-indigo-500/30" },
    { id: "transition",   label: "Transitions",         icon: Scissors, color: "text-teal-400",    bg: "bg-teal-500/10",    border: "border-teal-500/30" },
  ];

  const LAYERS = ["background","midground","foreground","overlay"] as const;
  const BLEND_MODES = ["normal","screen","multiply","add","overlay","soft-light","color-dodge","luminosity"];

  const VFX_STATUSES = [
    { id: "concept",     label: "Concept",     color: "text-gray-400",    bg: "bg-gray-500/15",    dot: "#9ca3af" },
    { id: "bid",         label: "Bid",         color: "text-amber-400",   bg: "bg-amber-500/15",   dot: "#fbbf24" },
    { id: "approved",    label: "Approved",    color: "text-blue-400",    bg: "bg-blue-500/15",    dot: "#60a5fa" },
    { id: "in_progress", label: "In Progress", color: "text-violet-400",  bg: "bg-violet-500/15",  dot: "#a78bfa" },
    { id: "review",      label: "Review",      color: "text-orange-400",  bg: "bg-orange-500/15",  dot: "#fb923c" },
    { id: "final",       label: "Final",       color: "text-green-400",   bg: "bg-green-500/15",   dot: "#4ade80" },
    { id: "delivered",   label: "Delivered",   color: "text-emerald-400", bg: "bg-emerald-500/15", dot: "#34d399" },
  ];

  const VFX_COMPLEXITY = [
    { id: "simple",     label: "Simple",     color: "text-green-400",   bg: "bg-green-500/10",   desc: "< 2 hrs" },
    { id: "moderate",   label: "Moderate",   color: "text-yellow-400",  bg: "bg-yellow-500/10",  desc: "½ day" },
    { id: "complex",    label: "Complex",    color: "text-orange-400",  bg: "bg-orange-500/10",  desc: "1–2 days" },
    { id: "hero",       label: "Hero Shot",  color: "text-red-400",     bg: "bg-red-500/10",     desc: "1+ week" },
    { id: "impossible", label: "Impossible", color: "text-purple-400",  bg: "bg-purple-500/10",  desc: "Specialist" },
  ];

  const PIPELINE_SOFTWARE = [
    "None / TBD","After Effects","DaVinci Resolve / Fusion","Nuke","Houdini","Maya","Blender","Cinema 4D","Flame","Mocha Pro",
  ];

  const COLOR_SPACES = ["Rec. 709","sRGB","ACES 1.0 cg","Log C (ARRI)","S-Log3 (Sony)","V-Log (Panasonic)","DCI-P3","P3-D65"];

  // ─── VFX Params stored in the parameters JSON field ────────────────────────────
  interface VfxParams {
    status:           string;
    complexity:       string;
    software:         string;
    colorSpace:       string;
    frameIn:          number;
    frameOut:         number;
    artist:           string;
    version:          string;
    chromaKeyEnabled: boolean;
    chromaKeyColor:   string;
    supervisorNotes:  string;
    trackingNotes:    string;
    rotoRequired:     boolean;
    rotoNotes:        string;
  }

  const DEFAULT_VFX_PARAMS: VfxParams = {
    status: "concept", complexity: "moderate", software: "None / TBD",
    colorSpace: "Rec. 709", frameIn: 0, frameOut: 0,
    artist: "", version: "v001",
    chromaKeyEnabled: false, chromaKeyColor: "#00B140",
    supervisorNotes: "", trackingNotes: "", rotoRequired: false, rotoNotes: "",
  };

  function parseVfxParams(parameters: any): VfxParams {
    if (!parameters || typeof parameters !== "object") return { ...DEFAULT_VFX_PARAMS };
    return { ...DEFAULT_VFX_PARAMS, ...parameters };
  }

  // ─── Sub-components ─────────────────────────────────────────────────────────────

  function IntensityBar({ value }: { value: number }) {
    return (
      <div className="flex items-center gap-1.5">
        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${value*100}%`, background: `linear-gradient(90deg, #8b5cf6, ${value>0.75?"#ef4444":value>0.45?"#eab308":"#8b5cf6"})` }} />
        </div>
        <span className="text-[10px] font-mono text-muted-foreground w-7 text-right">{Math.round(value*100)}%</span>
      </div>
    );
  }

  function StatusBadge({ statusId }: { statusId: string }) {
    const s = VFX_STATUSES.find(x => x.id === statusId) || VFX_STATUSES[0];
    return (
      <div className={`inline-flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${s.bg}`}>
        <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: s.dot }} />
        <span className={s.color}>{s.label}</span>
      </div>
    );
  }

  function ComplexityBadge({ complexityId }: { complexityId: string }) {
    const c = VFX_COMPLEXITY.find(x => x.id === complexityId) || VFX_COMPLEXITY[1];
    return (
      <div className={`inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full ${c.bg}`}>
        <span className={c.color}>{c.label}</span>
        <span className="text-muted-foreground/60">·</span>
        <span className="text-muted-foreground/60">{c.desc}</span>
      </div>
    );
  }

  function LayerStack({ layer }: { layer: string }) {
    return (
      <div className="flex items-center gap-0.5">
        {LAYERS.map(l => (
          <div key={l} className={`text-[8px] px-1.5 py-0.5 rounded transition-all ${l === layer ? "bg-violet-500/20 text-violet-400 font-semibold" : "text-muted-foreground/30"}`}>{l.slice(0,2).toUpperCase()}</div>
        ))}
      </div>
    );
  }

  // ─── Main Page ──────────────────────────────────────────────────────────────────

  export default function VisualEffects() {
    const params = useParams<{ id: string }>();
    const projectId = parseInt(params.id || "0");
    const [, setLocation] = useLocation();
    const utils = trpc.useUtils();

    const [activeTab,        setActiveTab]        = useState("shotboard");
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [searchQuery,      setSearchQuery]      = useState("");
    const [selectedId,       setSelectedId]       = useState<number | null>(null);
    const [paramsEdits,      setParamsEdits]      = useState<Record<number, Partial<VfxParams>>>({});
    const [editingNotes,     setEditingNotes]     = useState("");
    const [expandedPreset,   setExpandedPreset]   = useState<string | null>(null);

    const { data: appliedVfx, isLoading } = trpc.visualEffect.listByProject.useQuery({ projectId }, { enabled: !!projectId });
    const { data: presets }               = trpc.visualEffect.presets.useQuery();

    const createMutation = trpc.visualEffect.create.useMutation({
      onSuccess: (d) => { toast.success("Effect added"); utils.visualEffect.listByProject.invalidate(); setSelectedId(d.id); },
      onError: (e) => toast.error(e.message),
    });
    const updateMutation = trpc.visualEffect.update.useMutation({
      onSuccess: () => utils.visualEffect.listByProject.invalidate(),
      onError: (e) => toast.error(e.message),
    });
    const deleteMutation = trpc.visualEffect.delete.useMutation({
      onSuccess: () => { toast.success("Effect removed"); utils.visualEffect.listByProject.invalidate(); setSelectedId(null); },
      onError: (e) => toast.error(e.message),
    });

    const allVfx = appliedVfx || [];
    const selectedVfx = allVfx.find((v: any) => v.id === selectedId);

    const getParams = (vfx: any): VfxParams => ({ ...parseVfxParams(vfx.parameters), ...(paramsEdits[vfx.id] || {}) });

    const saveParams = (vfx: any, patch: Partial<VfxParams>) => {
      const updated = { ...parseVfxParams(vfx.parameters), ...patch };
      setParamsEdits(p => ({ ...p, [vfx.id]: { ...p[vfx.id], ...patch } }));
      updateMutation.mutate({ id: vfx.id, parameters: updated });
    };

    const filteredVfx = allVfx.filter((v: any) =>
      (selectedCategory === "all" || v.category === selectedCategory) &&
      (!searchQuery || v.name.toLowerCase().includes(searchQuery.toLowerCase()) || v.description?.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    const filteredPresets = (presets || []).filter((p: any) =>
      (selectedCategory === "all" || p.category === selectedCategory) &&
      (!searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.description?.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const addPreset = (preset: any) => {
      createMutation.mutate({ projectId, name: preset.name, category: preset.category, subcategory: preset.subcategory, description: preset.description, intensity: 0.7, layer: "foreground", tags: preset.tags });
    };

    // Status counts for the stats bar
    const statusCounts = VFX_STATUSES.map(s => ({ ...s, count: allVfx.filter((v: any) => (parseVfxParams(v.parameters).status || "concept") === s.id).length }));

    const exportBreakdown = () => {
      const hdr = ["Shot #","Name","Category","Status","Complexity","Layer","Blend","Intensity %","Software","Color Space","Frame In","Frame Out","Artist","Version","Chroma Key","Supervisor Notes"];
      const rows = allVfx.map((v: any, i: number) => {
        const p = getParams(v);
        return [`VFX-${String(i+1).padStart(3,"0")}`, `"${v.name}"`, v.category, p.status, p.complexity, v.layer||"foreground", v.blendMode||"normal", Math.round((v.intensity||0.7)*100), `"${p.software}"`, `"${p.colorSpace}"`, p.frameIn, p.frameOut, `"${p.artist}"`, p.version, p.chromaKeyEnabled?"Yes":"No", `"${p.supervisorNotes||""}"`].join(",");
      });
      const blob = new Blob([[hdr.join(","), ...rows].join("\n")], { type: "text/csv" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `vfx-breakdown-${projectId}.csv`; a.click();
      toast.success("VFX breakdown exported");
    };

    return (
      <div className="min-h-screen" style={{ background: "linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#080810 100%)" }}>
        {/* ── Header ── */}
        <div className="border-b sticky top-0 z-20" style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(7,5,14,0.97)", backdropFilter: "blur(24px)" }}>
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => setLocation(`/projects/${projectId}`)} className="gap-2 text-muted-foreground h-8"><ArrowLeft className="h-4 w-4 text-amber-400/70" />Back</Button>
              <div className="h-5 w-px bg-border/40" />
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg,#8b5cf6,#7c3aed)" }}>
                  <Zap className="h-4.5 w-4.5 text-white" style={{ width: 18, height: 18 }} />
                </div>
                <div>
                  <div className="font-bold text-sm tracking-tight">Visual Effects Studio</div>
                  <div className="text-[10px] text-muted-foreground">{allVfx.length} shots · {allVfx.filter((v: any) => parseVfxParams(v.parameters).status === "final" || parseVfxParams(v.parameters).status === "delivered").length} final</div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={exportBreakdown} className="gap-2 h-8 text-xs border-border/50">
                <FileBarChart2 className="h-3.5 w-3.5" />VFX Breakdown
              </Button>
              <Button size="sm" onClick={() => setActiveTab("library")} className="gap-2 h-8 text-xs" style={{ background: "linear-gradient(135deg,#8b5cf6,#7c3aed)" }}>
                <Plus className="h-3.5 w-3.5" />Add Effect
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* ── Stats bar ── */}
          <div className="mb-5 grid grid-cols-4 sm:grid-cols-7 gap-3">
            <div className="rounded-xl border px-3 py-2.5" style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
              <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Total Shots</div>
              <div className="text-xl font-bold mt-0.5">{allVfx.length}</div>
            </div>
            {statusCounts.slice(0,6).map(s => (
              <div key={s.id} className="rounded-xl border px-3 py-2.5" style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
                <div className="text-[9px] text-muted-foreground uppercase tracking-wider">{s.label}</div>
                <div className={`text-xl font-bold mt-0.5 ${s.color}`}>{s.count}</div>
              </div>
            ))}
          </div>

          {/* ── Pipeline banner ── */}
          <div className="mb-6 rounded-xl border px-4 py-3 flex items-start gap-3" style={{ borderColor: "rgba(139,92,246,0.2)", background: "rgba(139,92,246,0.04)" }}>
            <Sparkles className="h-4 w-4 text-violet-400 mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              <span className="text-violet-400 font-semibold">Connected to AI Generation Pipeline.</span>{" "}
              All effects write into <span className="font-mono text-[11px] text-violet-300">vfxNotes</span> and <span className="font-mono text-[11px] text-violet-300">visualEffects</span> — layer order, intensity, blend mode, and color space are composited by the AI renderer at scene generation time.
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6 border border-border/40 bg-black/40 h-9 gap-0.5">
              <TabsTrigger value="shotboard"  className="gap-1.5 text-xs h-7 data-[state=active]:text-amber-400"><Layers className="h-3.5 w-3.5" />Shot Board ({allVfx.length})</TabsTrigger>
              <TabsTrigger value="library"    className="gap-1.5 text-xs h-7 data-[state=active]:text-amber-400"><Star className="h-3.5 w-3.5" />VFX Library</TabsTrigger>
              <TabsTrigger value="breakdown"  className="gap-1.5 text-xs h-7 data-[state=active]:text-amber-400"><FileBarChart2 className="h-3.5 w-3.5" />Breakdown Report</TabsTrigger>
            </TabsList>

            {/* ══════════════════ SHOT BOARD ══════════════════ */}
            <TabsContent value="shotboard">
              <div className="flex gap-5">
                {/* Left: Shot list */}
                <div className="flex-1 min-w-0 space-y-3">
                  {/* Toolbar */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="relative flex-1 min-w-48 max-w-xs">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search effects…" className="h-8 pl-9 text-xs bg-black/30 border-border/40" />
                    </div>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="h-8 w-44 text-xs bg-black/30 border-border/40"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all" className="text-xs">All Categories</SelectItem>
                        {VFX_CATEGORIES.map(c => <SelectItem key={c.id} value={c.id} className="text-xs">{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {isLoading ? (
                    <div className="space-y-2">{[1,2,3,4].map(i=><div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.03)" }} />)}</div>
                  ) : filteredVfx.length === 0 ? (
                    <div className="rounded-2xl border-2 border-dashed flex flex-col items-center py-24 gap-4" style={{ borderColor: "rgba(139,92,246,0.1)" }}>
                      <div className="h-16 w-16 rounded-2xl bg-violet-500/10 flex items-center justify-center">
                        <Zap className="h-8 w-8 text-violet-400 opacity-40" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold">No VFX shots yet</p>
                        <p className="text-xs text-muted-foreground mt-1">Browse the VFX Library and add effects to your project</p>
                      </div>
                      <Button size="sm" onClick={() => setActiveTab("library")} className="gap-1.5 text-xs" style={{ background: "linear-gradient(135deg,#8b5cf6,#7c3aed)" }}>
                        <Star className="h-3.5 w-3.5" />Browse VFX Library
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredVfx.map((vfx: any, shotIdx: number) => {
                        const cat      = VFX_CATEGORIES.find(c => c.id === vfx.category);
                        const Icon     = cat?.icon || Zap;
                        const vp       = getParams(vfx);
                        const isSelected = vfx.id === selectedId;

                        return (
                          <div key={vfx.id}
                            onClick={() => { setSelectedId(isSelected ? null : vfx.id); setEditingNotes(vfx.notes || ""); }}
                            className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all group ${isSelected ? "border-violet-500/40 bg-violet-500/5" : "hover:border-violet-500/20 hover:bg-white/[0.015]"}`}
                            style={{ borderColor: isSelected ? undefined : "rgba(255,255,255,0.07)" }}>

                            {/* Shot # */}
                            <div className="text-[9px] font-mono text-muted-foreground/50 w-8 shrink-0">
                              {String(shotIdx+1).padStart(3,"0")}
                            </div>

                            {/* Category icon */}
                            <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${cat?.bg}`}>
                              <Icon className={`h-5 w-5 ${cat?.color}`} style={{ width: 20, height: 20 }} />
                            </div>

                            {/* Name + badges */}
                            <div className="flex-1 min-w-0 space-y-1.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-semibold truncate">{vfx.name}</p>
                                <StatusBadge statusId={vp.status} />
                                <ComplexityBadge complexityId={vp.complexity} />
                              </div>
                              <div className="flex items-center gap-3 flex-wrap">
                                <IntensityBar value={vfx.intensity ?? 0.7} />
                                <LayerStack layer={vfx.layer || "foreground"} />
                                {vp.artist && <span className="text-[9px] text-muted-foreground/50 flex items-center gap-1"><User className="h-2.5 w-2.5" style={{ width: 10, height: 10 }} />{vp.artist}</span>}
                                {vp.version && <span className="text-[9px] font-mono text-muted-foreground/50">{vp.version}</span>}
                              </div>
                            </div>

                            {/* Delete */}
                            <button onClick={e => { e.stopPropagation(); deleteMutation.mutate({ id: vfx.id }); }}
                              className="p-1.5 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-all shrink-0">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* ── Right: Edit panel ── */}
                {selectedVfx && (() => {
                  const vp = getParams(selectedVfx);
                  return (
                    <div className="w-80 shrink-0 rounded-2xl border overflow-hidden sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto" style={{ borderColor: "rgba(139,92,246,0.25)" }}>
                      {/* Panel header */}
                      <div className="px-4 py-3 flex items-center justify-between" style={{ background: "rgba(139,92,246,0.1)", borderBottom: "1px solid rgba(139,92,246,0.15)" }}>
                        <div className="flex items-center gap-2">
                          <Zap className="h-4 w-4 text-violet-400" />
                          <span className="text-sm font-semibold truncate max-w-[180px]">{selectedVfx.name}</span>
                        </div>
                        <button onClick={() => setSelectedId(null)} className="text-muted-foreground hover:text-white transition-colors">
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="p-4 space-y-5">
                        {/* Status + Complexity */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Status</Label>
                            <Select value={vp.status} onValueChange={v => saveParams(selectedVfx, { status: v })}>
                              <SelectTrigger className="h-8 text-xs bg-black/30 border-border/40"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {VFX_STATUSES.map(s => (
                                  <SelectItem key={s.id} value={s.id} className="text-xs">
                                    <div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full" style={{ background: s.dot }} /><span className={s.color}>{s.label}</span></div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Complexity</Label>
                            <Select value={vp.complexity} onValueChange={v => saveParams(selectedVfx, { complexity: v })}>
                              <SelectTrigger className="h-8 text-xs bg-black/30 border-border/40"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {VFX_COMPLEXITY.map(c => (
                                  <SelectItem key={c.id} value={c.id} className="text-xs">
                                    <span className={c.color}>{c.label}</span><span className="text-muted-foreground ml-1">· {c.desc}</span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Intensity */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Intensity</Label>
                            <span className="text-[10px] font-mono text-violet-400">{Math.round((selectedVfx.intensity??0.7)*100)}%</span>
                          </div>
                          <IntensityBar value={selectedVfx.intensity ?? 0.7} />
                          <Slider value={[selectedVfx.intensity??0.7]} onValueChange={([v]) => updateMutation.mutate({ id: selectedVfx.id, intensity: v })} min={0} max={1} step={0.05} />
                        </div>

                        <Separator className="bg-border/30" />

                        {/* Layer + Blend Mode */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Layer</Label>
                            <Select value={selectedVfx.layer || "foreground"} onValueChange={v => updateMutation.mutate({ id: selectedVfx.id, layer: v as any })}>
                              <SelectTrigger className="h-8 text-xs bg-black/30 border-border/40"><SelectValue /></SelectTrigger>
                              <SelectContent>{LAYERS.map(l => <SelectItem key={l} value={l} className="text-xs capitalize">{l}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Blend Mode</Label>
                            <Select value={selectedVfx.blendMode || "normal"} onValueChange={v => updateMutation.mutate({ id: selectedVfx.id, blendMode: v })}>
                              <SelectTrigger className="h-8 text-xs bg-black/30 border-border/40"><SelectValue /></SelectTrigger>
                              <SelectContent>{BLEND_MODES.map(m => <SelectItem key={m} value={m} className="text-xs capitalize">{m}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Color Tint */}
                        <div className="space-y-1.5">
                          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Color Tint</Label>
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg border border-border/40 shrink-0 overflow-hidden relative cursor-pointer">
                              <div className="absolute inset-0" style={{ background: selectedVfx.colorTint || "transparent" }} />
                              <input type="color" value={selectedVfx.colorTint || "#8b5cf6"} onChange={e => updateMutation.mutate({ id: selectedVfx.id, colorTint: e.target.value })} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                            </div>
                            <Input value={selectedVfx.colorTint || ""} onChange={e => updateMutation.mutate({ id: selectedVfx.id, colorTint: e.target.value })} placeholder="No tint" className="h-8 text-xs bg-black/30 border-border/40 font-mono flex-1" />
                            {selectedVfx.colorTint && <button onClick={() => updateMutation.mutate({ id: selectedVfx.id, colorTint: "" })} className="text-muted-foreground hover:text-red-400 transition-colors"><X className="h-3.5 w-3.5" /></button>}
                          </div>
                        </div>

                        <Separator className="bg-border/30" />

                        {/* Pipeline */}
                        <div className="space-y-3">
                          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Pipeline</Label>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-[9px] text-muted-foreground">Software</Label>
                              <Select value={vp.software} onValueChange={v => saveParams(selectedVfx, { software: v })}>
                                <SelectTrigger className="h-8 text-xs bg-black/30 border-border/40"><SelectValue /></SelectTrigger>
                                <SelectContent>{PIPELINE_SOFTWARE.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-[9px] text-muted-foreground">Color Space</Label>
                              <Select value={vp.colorSpace} onValueChange={v => saveParams(selectedVfx, { colorSpace: v })}>
                                <SelectTrigger className="h-8 text-xs bg-black/30 border-border/40"><SelectValue /></SelectTrigger>
                                <SelectContent>{COLOR_SPACES.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-[9px] text-muted-foreground">Artist</Label>
                              <Input value={vp.artist} onChange={e => saveParams(selectedVfx, { artist: e.target.value })} placeholder="Unassigned" className="h-8 text-xs bg-black/30 border-border/40" />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-[9px] text-muted-foreground">Version</Label>
                              <Input value={vp.version} onChange={e => saveParams(selectedVfx, { version: e.target.value })} placeholder="v001" className="h-8 text-xs bg-black/30 border-border/40 font-mono" />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-[9px] text-muted-foreground">Frame In</Label>
                              <Input type="number" value={vp.frameIn} onChange={e => saveParams(selectedVfx, { frameIn: parseInt(e.target.value)||0 })} className="h-8 text-xs bg-black/30 border-border/40 font-mono" />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-[9px] text-muted-foreground">Frame Out</Label>
                              <Input type="number" value={vp.frameOut} onChange={e => saveParams(selectedVfx, { frameOut: parseInt(e.target.value)||0 })} className="h-8 text-xs bg-black/30 border-border/40 font-mono" />
                            </div>
                          </div>
                        </div>

                        <Separator className="bg-border/30" />

                        {/* Chroma Key */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Chroma Key / Green Screen</Label>
                            <Switch checked={vp.chromaKeyEnabled} onCheckedChange={v => saveParams(selectedVfx, { chromaKeyEnabled: v })} />
                          </div>
                          {vp.chromaKeyEnabled && (
                            <div className="flex items-center gap-2 p-2.5 rounded-lg" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                              <div className="h-8 w-8 rounded-lg border border-border/40 shrink-0 overflow-hidden relative cursor-pointer">
                                <div className="absolute inset-0" style={{ background: vp.chromaKeyColor }} />
                                <input type="color" value={vp.chromaKeyColor} onChange={e => saveParams(selectedVfx, { chromaKeyColor: e.target.value })} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                              </div>
                              <div>
                                <p className="text-[10px] font-semibold" style={{ color: vp.chromaKeyColor }}>{vp.chromaKeyColor}</p>
                                <p className="text-[9px] text-muted-foreground">Key color — click swatch to change</p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Tracking / Roto */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><Crosshair className="h-3 w-3" />Rotoscoping Required</Label>
                            <Switch checked={vp.rotoRequired} onCheckedChange={v => saveParams(selectedVfx, { rotoRequired: v })} />
                          </div>
                          {vp.rotoRequired && (
                            <Textarea value={vp.rotoNotes} onChange={e => saveParams(selectedVfx, { rotoNotes: e.target.value })} placeholder="Describe roto scope: which elements, isolation requirements, tolerance…" className="text-xs min-h-[60px] bg-black/30 resize-none border-border/40" />
                          )}
                        </div>

                        <Separator className="bg-border/30" />

                        {/* Tracking Notes */}
                        <div className="space-y-1.5">
                          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Motion Tracking Notes</Label>
                          <Textarea value={vp.trackingNotes} onChange={e => saveParams(selectedVfx, { trackingNotes: e.target.value })} placeholder="Tracking markers, camera data, stabilization requirements, matchmove references…" className="text-xs min-h-[60px] bg-black/30 resize-none border-border/40" />
                        </div>

                        {/* Supervisor / AI Notes */}
                        <div className="space-y-1.5">
                          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><Sparkles className="h-3 w-3 text-violet-400" />AI Generation Notes</Label>
                          <Textarea value={editingNotes} onChange={e => setEditingNotes(e.target.value)} placeholder="Instructions for AI renderer — timing, blending behavior, scene context, intensity arc…" className="text-xs min-h-[80px] bg-black/30 resize-none border-violet-500/15" />
                          <Button size="sm" className="w-full gap-2 text-xs" style={{ background: "linear-gradient(135deg,#8b5cf6,#7c3aed)" }}
                            onClick={() => updateMutation.mutate({ id: selectedVfx.id, notes: editingNotes })} disabled={updateMutation.isPending}>
                            {updateMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}Save Notes
                          </Button>
                        </div>

                        <Separator className="bg-border/30" />

                        {/* Description */}
                        {selectedVfx.description && (
                          <div className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Effect Description</Label>
                            <p className="text-xs text-muted-foreground leading-relaxed">{selectedVfx.description}</p>
                          </div>
                        )}

                        {/* Delete */}
                        <button onClick={() => deleteMutation.mutate({ id: selectedVfx.id })} className="w-full flex items-center justify-center gap-1.5 text-[11px] px-3 py-2 rounded-lg border border-transparent hover:border-red-500/20 hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-all">
                          <Trash2 className="h-3.5 w-3.5" />Remove Effect
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </TabsContent>

            {/* ══════════════════ VFX LIBRARY ══════════════════ */}
            <TabsContent value="library">
              <div className="space-y-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="relative flex-1 min-w-48 max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search VFX library…" className="h-8 pl-9 text-xs bg-black/30 border-border/40" />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setSelectedCategory("all")} className={`text-[11px] px-3 py-1.5 rounded-full border transition-all ${selectedCategory === "all" ? "border-violet-500/50 bg-violet-500/10 text-violet-400" : "border-border/40 text-muted-foreground hover:border-violet-500/30"}`}>All</button>
                  {VFX_CATEGORIES.map(c => { const Icon = c.icon; return (
                    <button key={c.id} onClick={() => setSelectedCategory(c.id)} className={`flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-full border transition-all ${selectedCategory === c.id ? `${c.bg} ${c.color} ${c.border}` : "border-border/40 text-muted-foreground hover:border-border/60"}`}>
                      <Icon className="h-3 w-3" style={{ width: 12, height: 12 }} />{c.label}
                    </button>
                  ); })}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredPresets.map((preset: any, i: number) => {
                    const cat   = VFX_CATEGORIES.find(c => c.id === preset.category);
                    const Icon  = cat?.icon || Zap;
                    const added = allVfx.some((v: any) => v.name === preset.name);
                    return (
                      <div key={i} className={`flex flex-col gap-3 p-4 rounded-xl border transition-all hover:border-violet-500/25 ${added ? "opacity-60" : ""}`} style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
                        <div className="flex items-start gap-3">
                          <div className={`h-9 w-9 rounded-xl ${cat?.bg} flex items-center justify-center shrink-0`}><Icon className={`h-4.5 w-4.5 ${cat?.color}`} style={{ width: 18, height: 18 }} /></div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-semibold truncate">{preset.name}</p>
                              {added && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />}
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">{preset.description}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {(preset.tags || []).slice(0,4).map((tag: string) => (
                            <span key={tag} className="text-[9px] text-muted-foreground px-1.5 py-0.5 rounded-md" style={{ background: "rgba(255,255,255,0.05)" }}>{tag}</span>
                          ))}
                        </div>
                        <Button size="sm" variant={added ? "ghost" : "outline"} className="w-full h-7 text-[11px] gap-1.5 border-border/40"
                          onClick={() => !added && addPreset(preset)} disabled={added || createMutation.isPending}>
                          {added ? <><CheckCircle2 className="h-3 w-3 text-emerald-400" />Added</> : <><Plus className="h-3 w-3" />Add to Project</>}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </TabsContent>

            {/* ══════════════════ BREAKDOWN REPORT ══════════════════ */}
            <TabsContent value="breakdown">
              <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h3 className="font-bold text-sm">VFX Breakdown Report</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Share with your VFX supervisor, compositing team, and post-production coordinator</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={exportBreakdown} className="gap-2 text-xs border-border/40">
                    <Download className="h-3.5 w-3.5" />Export as CSV
                  </Button>
                </div>

                {/* Complexity summary */}
                {allVfx.length > 0 && (
                  <div className="grid grid-cols-5 gap-2">
                    {VFX_COMPLEXITY.map(c => {
                      const count = allVfx.filter((v: any) => (parseVfxParams(v.parameters).complexity || "moderate") === c.id).length;
                      return (
                        <div key={c.id} className={`rounded-xl border px-3 py-2.5 text-center ${c.bg}`} style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                          <div className={`text-lg font-bold ${c.color}`}>{count}</div>
                          <div className="text-[9px] text-muted-foreground mt-0.5">{c.label}</div>
                          <div className="text-[8px] text-muted-foreground/50">{c.desc}</div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {allVfx.length === 0 ? (
                  <div className="rounded-xl border-2 border-dashed flex flex-col items-center py-16 gap-3 text-muted-foreground" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                    <FileBarChart2 className="h-10 w-10 opacity-20" />
                    <p className="text-sm">No VFX shots added yet</p>
                    <p className="text-xs opacity-60">Add effects to your project to generate a breakdown</p>
                  </div>
                ) : (
                  <div className="rounded-xl border overflow-x-auto" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                    <table className="w-full text-xs min-w-[1000px]">
                      <thead>
                        <tr className="border-b" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.03)" }}>
                          {["Shot #","Name","Category","Status","Complexity","Layer","Blend","Intensity","Software","Color Space","Frames","Artist","Ver","Chroma","Roto","Notes"].map(h => (
                            <th key={h} className="text-left px-3 py-2.5 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground whitespace-nowrap">{h}</th>
                          ))}
                          <th className="px-3 py-2.5" />
                        </tr>
                      </thead>
                      <tbody className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                        {allVfx.map((vfx: any, i: number) => {
                          const vp  = getParams(vfx);
                          const cat = VFX_CATEGORIES.find(c => c.id === vfx.category);
                          const st  = VFX_STATUSES.find(s => s.id === vp.status) || VFX_STATUSES[0];
                          const cx  = VFX_COMPLEXITY.find(c => c.id === vp.complexity) || VFX_COMPLEXITY[1];
                          return (
                            <tr key={vfx.id} className="hover:bg-white/[0.015] transition-colors">
                              <td className="px-3 py-2.5 font-mono font-semibold text-violet-400">VFX-{String(i+1).padStart(3,"0")}</td>
                              <td className="px-3 py-2.5 font-medium whitespace-nowrap">{vfx.name}</td>
                              <td className="px-3 py-2.5"><span className={`text-[9px] px-1.5 py-0.5 rounded-full ${cat?.bg} ${cat?.color}`}>{vfx.category}</span></td>
                              <td className="px-3 py-2.5"><div className="flex items-center gap-1"><div className="h-1.5 w-1.5 rounded-full" style={{ background: st.dot }} /><span className={st.color + " text-[10px]"}>{st.label}</span></div></td>
                              <td className="px-3 py-2.5"><span className={`text-[9px] px-1.5 py-0.5 rounded-full ${cx.bg} ${cx.color}`}>{cx.label}</span></td>
                              <td className="px-3 py-2.5 text-muted-foreground capitalize">{vfx.layer||"fg"}</td>
                              <td className="px-3 py-2.5 text-muted-foreground">{vfx.blendMode||"normal"}</td>
                              <td className="px-3 py-2.5 font-mono text-muted-foreground">{Math.round((vfx.intensity||0.7)*100)}%</td>
                              <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{vp.software?.replace(" / Fusion","")}</td>
                              <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{vp.colorSpace}</td>
                              <td className="px-3 py-2.5 font-mono text-muted-foreground">{vp.frameIn && vp.frameOut ? `${vp.frameIn}–${vp.frameOut}` : "—"}</td>
                              <td className="px-3 py-2.5 text-muted-foreground">{vp.artist || "—"}</td>
                              <td className="px-3 py-2.5 font-mono text-muted-foreground">{vp.version}</td>
                              <td className="px-3 py-2.5 text-center">{vp.chromaKeyEnabled ? <span className="text-emerald-400 font-bold">Y</span> : <span className="text-muted-foreground/40">N</span>}</td>
                              <td className="px-3 py-2.5 text-center">{vp.rotoRequired ? <span className="text-amber-400 font-bold">Y</span> : <span className="text-muted-foreground/40">N</span>}</td>
                              <td className="px-3 py-2.5 max-w-[150px] truncate text-muted-foreground">{vfx.notes || "—"}</td>
                              <td className="px-3 py-2.5">
                                <button onClick={() => { setSelectedId(vfx.id); setEditingNotes(vfx.notes||""); setActiveTab("shotboard"); }} className="text-[9px] text-violet-400 hover:underline whitespace-nowrap">Edit →</button>
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
  