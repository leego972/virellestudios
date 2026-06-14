import { useState } from "react";
  import { useParams, useLocation } from "wouter";
  import { trpc } from "@/lib/trpc";
  import { Button } from "@/components/ui/button";
  import { Card, CardContent } from "@/components/ui/card";
  import { Input } from "@/components/ui/input";
  import { Label } from "@/components/ui/label";
  import { Textarea } from "@/components/ui/textarea";
  import { Badge } from "@/components/ui/badge";
  import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
  import { Slider } from "@/components/ui/slider";
  import { toast } from "sonner";
  import {
    ArrowLeft, Plus, Trash2, Wand2, Download, Loader2, Zap, Eye,
    Layers, Sparkles, CheckCircle2, Info, X, Search, Film, Palette,
    Sun, Snowflake, Flame, Cloud, Star, Droplets, Monitor, Wind
  } from "lucide-react";

  const VFX_CATEGORIES = [
    { id: "explosions", label: "Fire & Explosions", icon: Flame, color: "text-orange-400", bg: "bg-orange-500/10" },
    { id: "weather", label: "Weather", icon: Cloud, color: "text-sky-400", bg: "bg-sky-500/10" },
    { id: "sci-fi", label: "Sci-Fi", icon: Zap, color: "text-cyan-400", bg: "bg-cyan-500/10" },
    { id: "magic", label: "Magic & Fantasy", icon: Sparkles, color: "text-purple-400", bg: "bg-purple-500/10" },
    { id: "particles", label: "Particles", icon: Star, color: "text-yellow-400", bg: "bg-yellow-500/10" },
    { id: "water", label: "Water", icon: Droplets, color: "text-blue-400", bg: "bg-blue-500/10" },
    { id: "screen", label: "Screen FX & Color", icon: Monitor, color: "text-green-400", bg: "bg-green-500/10" },
    { id: "destruction", label: "Destruction", icon: Wind, color: "text-red-400", bg: "bg-red-500/10" },
    { id: "light", label: "Lighting", icon: Sun, color: "text-amber-400", bg: "bg-amber-500/10" },
    { id: "creature", label: "Creature FX", icon: Eye, color: "text-rose-400", bg: "bg-rose-500/10" },
  ];

  const LAYERS = ["background","midground","foreground","overlay"] as const;
  const BLEND_MODES = ["normal","screen","multiply","add","overlay","soft-light"];

  function IntensityBar({ value }: { value: number }) {
    return (
      <div className="flex items-center gap-1.5">
        <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${value * 100}%`, background: `linear-gradient(90deg, #8b5cf6, ${value > 0.7 ? "#ef4444" : value > 0.4 ? "#eab308" : "#8b5cf6"})` }} />
        </div>
        <span className="text-[10px] font-mono text-muted-foreground w-7 text-right">{Math.round(value * 100)}%</span>
      </div>
    );
  }

  export default function VisualEffects() {
    const params = useParams<{ id: string }>();
    const projectId = parseInt(params.id || "0");
    const [, setLocation] = useLocation();
    const utils = trpc.useUtils();

    const [activeTab, setActiveTab] = useState("applied");
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedVfxId, setSelectedVfxId] = useState<number | null>(null);
    const [editingNotes, setEditingNotes] = useState("");

    const { data: appliedVfx, isLoading } = trpc.visualEffect.listByProject.useQuery({ projectId }, { enabled: !!projectId });
    const { data: presets } = trpc.visualEffect.presets.useQuery();

    const createMutation = trpc.visualEffect.create.useMutation({
      onSuccess: (d) => { toast.success("Effect added to project"); utils.visualEffect.listByProject.invalidate(); setSelectedVfxId(d.id); },
      onError: (e) => toast.error(e.message),
    });
    const updateMutation = trpc.visualEffect.update.useMutation({
      onSuccess: () => { toast.success("Updated"); utils.visualEffect.listByProject.invalidate(); },
      onError: (e) => toast.error(e.message),
    });
    const deleteMutation = trpc.visualEffect.delete.useMutation({
      onSuccess: () => { toast.success("Removed"); utils.visualEffect.listByProject.invalidate(); setSelectedVfxId(null); },
      onError: (e) => toast.error(e.message),
    });

    const allVfx = appliedVfx || [];
    const selectedVfx = allVfx.find((v: any) => v.id === selectedVfxId);

    const filteredPresets = (presets || []).filter((p: any) =>
      (selectedCategory === "all" || p.category === selectedCategory) &&
      (p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.description?.toLowerCase().includes(searchQuery.toLowerCase()) || !searchQuery)
    );

    const addPreset = (preset: any) => {
      createMutation.mutate({
        projectId,
        name: preset.name,
        category: preset.category,
        subcategory: preset.subcategory,
        description: preset.description,
        intensity: 0.7,
        layer: "foreground",
        tags: preset.tags,
      });
    };

    const exportVfxNotes = () => {
      const lines = [
        "VFX SHOT LIST",
        "=".repeat(50),
        `Project ID: ${projectId}`,
        `Total VFX: ${allVfx.length}`,
        "",
        "EFFECTS BREAKDOWN:",
        "-".repeat(50),
        ...allVfx.map((v: any, i: number) =>
          `${String(i+1).padStart(2,"0")}. [${v.category?.toUpperCase()}] ${v.name}`
          + `\n    Layer: ${v.layer} | Intensity: ${Math.round((v.intensity||0.7)*100)}%`
          + `\n    Description: ${v.description || "N/A"}`
          + (v.notes ? `\n    Director Notes: ${v.notes}` : "")
          + `\n    AI Prompt: Apply ${v.name} (${v.description}) at ${Math.round((v.intensity||0.7)*100)}% intensity on the ${v.layer} layer`
        ),
        "",
        "=".repeat(50),
        "Generated by Virelle Studios · virelle.life",
      ];
      const blob = new Blob([lines.join("\n")], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "vfx-shot-list.txt"; a.click();
      URL.revokeObjectURL(url);
      toast.success("VFX shot list exported");
    };

    return (
      <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #08080e 0%, #0d0b1a 100%)" }}>
        {/* Header */}
        <div className="border-b sticky top-0 z-20" style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(8,8,14,0.97)", backdropFilter: "blur(24px)" }}>
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => setLocation(`/projects/${projectId}`)} className="gap-2 text-muted-foreground"><ArrowLeft className="h-4 w-4" />Back</Button>
              <div className="h-5 w-px bg-border/50" />
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg,#8b5cf6,#7c3aed)" }}>
                  <Zap className="h-4 w-4 text-white" />
                </div>
                <div>
                  <div className="font-semibold text-sm">Visual Effects Studio</div>
                  <div className="text-[10px] text-muted-foreground">{allVfx.length} effects applied</div>
                </div>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={exportVfxNotes} className="gap-2"><Download className="h-3.5 w-3.5" />VFX Shot List</Button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Pipeline banner */}
          <div className="mb-5 rounded-lg border px-4 py-3 flex items-start gap-3" style={{ borderColor: "rgba(139,92,246,0.3)", background: "rgba(139,92,246,0.05)" }}>
            <Sparkles className="h-4 w-4 text-violet-400 mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              <span className="text-violet-400 font-medium">Connected to AI Generation.</span>{" "}
              All VFX applied here write into the scene generation pipeline as <span className="text-violet-300 font-mono text-[11px]">vfxNotes</span> and <span className="text-violet-300 font-mono text-[11px]">visualEffects</span> parameters.
              The AI composites these effects at render time — specifying layer, intensity, and blend mode for photorealistic output.
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6 border border-border/50 bg-background/50">
              <TabsTrigger value="applied" className="gap-2 text-xs"><Layers className="h-3.5 w-3.5" />Applied VFX ({allVfx.length})</TabsTrigger>
              <TabsTrigger value="library" className="gap-2 text-xs"><Star className="h-3.5 w-3.5" />VFX Library</TabsTrigger>
            </TabsList>

            {/* ── APPLIED VFX ── */}
            <TabsContent value="applied">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2 space-y-3">
                  {isLoading ? (
                    <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="h-16 rounded-xl bg-muted/20 animate-pulse"/>)}</div>
                  ) : allVfx.length === 0 ? (
                    <div className="rounded-xl border-2 border-dashed flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground" style={{ borderColor: "rgba(139,92,246,0.12)" }}>
                      <Zap className="h-12 w-12 opacity-15" />
                      <p className="text-sm font-medium">No VFX applied yet</p>
                      <p className="text-xs opacity-60">Browse the library and add effects to your project</p>
                      <Button size="sm" onClick={() => setActiveTab("library")} className="gap-2 mt-2" style={{ background: "linear-gradient(135deg,#8b5cf6,#7c3aed)" }}>
                        <Star className="h-3.5 w-3.5" />Browse VFX Library
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {allVfx.map((vfx: any) => {
                        const cat = VFX_CATEGORIES.find(c => c.id === vfx.category);
                        const Icon = cat?.icon || Zap;
                        const isSelected = vfx.id === selectedVfxId;
                        return (
                          <div
                            key={vfx.id}
                            onClick={() => { setSelectedVfxId(vfx.id); setEditingNotes(vfx.notes || ""); }}
                            className={`group flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${isSelected ? "border-violet-500/40 bg-violet-500/5" : "border-border/50 hover:border-border/80 bg-card/40"}`}
                          >
                            <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${cat?.bg || "bg-muted/20"}`}>
                              <Icon className={`h-5 w-5 ${cat?.color || "text-muted-foreground"}`} />
                            </div>
                            <div className="flex-1 min-w-0 space-y-1.5">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium">{vfx.name}</p>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${cat?.bg} ${cat?.color}`}>{cat?.label || vfx.category}</span>
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted/30 text-muted-foreground">{vfx.layer}</span>
                              </div>
                              <IntensityBar value={vfx.intensity ?? 0.7} />
                            </div>
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

                {/* Editor panel */}
                <div>
                  {selectedVfx ? (
                    <div className="rounded-xl border overflow-hidden sticky top-20" style={{ borderColor: "rgba(139,92,246,0.2)" }}>
                      <div className="px-4 py-3 flex items-center gap-2" style={{ background: "rgba(139,92,246,0.08)", borderBottom: "1px solid rgba(139,92,246,0.15)" }}>
                        <Zap className="h-4 w-4 text-violet-400" />
                        <span className="text-sm font-medium">{selectedVfx.name}</span>
                      </div>
                      <div className="p-4 space-y-4">
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <Label className="text-xs text-muted-foreground">Intensity</Label>
                            <span className="text-xs font-mono text-violet-400">{Math.round((selectedVfx.intensity ?? 0.7) * 100)}%</span>
                          </div>
                          <Slider
                            value={[selectedVfx.intensity ?? 0.7]}
                            onValueChange={([v]) => updateMutation.mutate({ id: selectedVfx.id, intensity: v })}
                            min={0} max={1} step={0.05}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Layer</Label>
                          <Select value={selectedVfx.layer || "foreground"} onValueChange={v => updateMutation.mutate({ id: selectedVfx.id, layer: v as any })}>
                            <SelectTrigger className="h-8 text-xs bg-background/50"><SelectValue /></SelectTrigger>
                            <SelectContent>{LAYERS.map(l => <SelectItem key={l} value={l} className="text-xs capitalize">{l}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground flex items-center gap-1"><Sparkles className="h-3 w-3 text-violet-400" />AI Generation Note</Label>
                          <Textarea
                            value={editingNotes}
                            onChange={e => setEditingNotes(e.target.value)}
                            placeholder="e.g. Apply this effect during the action climax scene, full intensity, blended with rain..."
                            className="text-xs min-h-[80px] bg-background/50 resize-none border-violet-500/20"
                          />
                          <p className="text-[10px] text-muted-foreground">Sent to AI as VFX compositing instructions.</p>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Description</Label>
                          <p className="text-xs text-muted-foreground leading-relaxed">{selectedVfx.description || "—"}</p>
                        </div>
                        <Button size="sm" className="w-full gap-2" style={{ background: "linear-gradient(135deg,#8b5cf6,#7c3aed)" }}
                          onClick={() => updateMutation.mutate({ id: selectedVfx.id, notes: editingNotes })}
                          disabled={updateMutation.isPending}>
                          {updateMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}Save Notes
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                      <Layers className="h-8 w-8 opacity-20" />
                      <p className="text-xs text-center">Select an effect<br />to edit its settings</p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* ── VFX LIBRARY ── */}
            <TabsContent value="library">
              <div className="space-y-4">
                <div className="flex flex-wrap gap-3 items-center">
                  <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search effects..." className="h-8 pl-9 text-xs bg-background/50" />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setSelectedCategory("all")} className={`text-[11px] px-3 py-1.5 rounded-full border transition-all ${selectedCategory === "all" ? "border-violet-500/50 bg-violet-500/10 text-violet-400" : "border-border/40 text-muted-foreground hover:border-border"}`}>All</button>
                  {VFX_CATEGORIES.map(c => {
                    const Icon = c.icon;
                    return (
                      <button key={c.id} onClick={() => setSelectedCategory(c.id)}
                        className={`flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-full border transition-all ${selectedCategory === c.id ? `${c.bg} ${c.color} border-current` : "border-border/40 text-muted-foreground hover:border-border"}`}>
                        <Icon className="h-3 w-3" />{c.label}
                      </button>
                    );
                  })}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {filteredPresets.map((preset: any, i: number) => {
                    const cat = VFX_CATEGORIES.find(c => c.id === preset.category);
                    const Icon = cat?.icon || Zap;
                    const alreadyAdded = allVfx.some((v: any) => v.name === preset.name);
                    return (
                      <div key={i} className={`group flex flex-col gap-2.5 p-3.5 rounded-xl border transition-all hover:scale-[1.02] ${cat?.bg || "bg-muted/10"}`}
                        style={{ borderColor: "rgba(255,255,255,0.07)", transition: "all 0.15s ease" }}>
                        <div className="flex items-start justify-between gap-2">
                          <div className={`h-8 w-8 rounded-lg ${cat?.bg} flex items-center justify-center shrink-0`}>
                            <Icon className={`h-4 w-4 ${cat?.color || "text-muted-foreground"}`} />
                          </div>
                          {alreadyAdded && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />}
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-semibold">{preset.name}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug line-clamp-2">{preset.description}</p>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {(preset.tags || []).slice(0,3).map((tag: string) => (
                              <span key={tag} className="text-[9px] text-muted-foreground px-1.5 py-0.5 rounded bg-background/40">{tag}</span>
                            ))}
                          </div>
                        </div>
                        <Button size="sm" className={`w-full h-7 text-[11px] gap-1.5 ${alreadyAdded ? "" : ""}`}
                          variant={alreadyAdded ? "secondary" : "outline"}
                          onClick={() => !alreadyAdded && addPreset(preset)}
                          disabled={alreadyAdded || createMutation.isPending}>
                          {alreadyAdded ? <><CheckCircle2 className="h-3 w-3" />Applied</> : <><Plus className="h-3 w-3" />Apply to Film</>}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    );
  }
  