import { useState, useRef } from "react";
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
  import { Separator } from "@/components/ui/separator";
  import { toast } from "sonner";
  import {
    ArrowLeft, Plus, Trash2, Wand2, Upload, Loader2, Volume2, Music,
    Mic, Play, Pause, Sliders, Download, Info, Sparkles, RefreshCw,
    Headphones, Radio, Zap, Wind, Car, Footprints, Trees, Building2,
    X, Save, Clock, Tag, ExternalLink, CheckCircle2, AlertCircle, Search
  } from "lucide-react";

  const SFX_CATEGORIES = [
    { id: "ambient", label: "Ambient", icon: Wind, color: "text-green-400", bg: "bg-green-500/10" },
    { id: "impacts", label: "Impacts", icon: Zap, color: "text-red-400", bg: "bg-red-500/10" },
    { id: "vehicles", label: "Vehicles", icon: Car, color: "text-blue-400", bg: "bg-blue-500/10" },
    { id: "footsteps", label: "Footsteps", icon: Footprints, color: "text-amber-400", bg: "bg-amber-500/10" },
    { id: "nature", label: "Nature", icon: Trees, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { id: "doors", label: "Doors & Interiors", icon: Building2, color: "text-orange-400", bg: "bg-orange-500/10" },
    { id: "electronic", label: "Electronic", icon: Radio, color: "text-cyan-400", bg: "bg-cyan-500/10" },
    { id: "horror", label: "Horror & Suspense", icon: Headphones, color: "text-rose-400", bg: "bg-rose-500/10" },
    { id: "weather", label: "Weather", icon: Wind, color: "text-sky-400", bg: "bg-sky-500/10" },
    { id: "musical", label: "Musical Stingers", icon: Music, color: "text-purple-400", bg: "bg-purple-500/10" },
    { id: "foley", label: "Foley / ADR", icon: Mic, color: "text-pink-400", bg: "bg-pink-500/10" },
    { id: "Generated", label: "AI Generated", icon: Sparkles, color: "text-yellow-400", bg: "bg-yellow-500/10" },
  ];

  function VolumeBar({ value }: { value: number }) {
    const bars = 12;
    const active = Math.round(value * bars);
    return (
      <div className="flex items-end gap-0.5 h-5">
        {Array.from({ length: bars }).map((_, i) => (
          <div
            key={i}
            className="w-1 rounded-sm transition-all"
            style={{
              height: `${30 + (i / bars) * 70}%`,
              background: i < active
                ? i < bars * 0.6 ? "#22c55e" : i < bars * 0.85 ? "#eab308" : "#ef4444"
                : "rgba(255,255,255,0.08)"
            }}
          />
        ))}
      </div>
    );
  }

  export default function SoundEffects() {
    const params = useParams<{ id: string }>();
    const projectId = parseInt(params.id || "0");
    const [, setLocation] = useLocation();
    const utils = trpc.useUtils();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [activeTab, setActiveTab] = useState("mixboard");
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [playingId, setPlayingId] = useState<string | null>(null);
    const [generatingId, setGeneratingId] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // AI Generate state
    const [aiPrompt, setAiPrompt] = useState("");
    const [aiDuration, setAiDuration] = useState(5);
    const [aiCategory, setAiCategory] = useState("ambient");
    const [aiName, setAiName] = useState("");

    // Upload state
    const [uploading, setUploading] = useState(false);

    const { data: sfxList, isLoading } = trpc.soundEffect.list.useQuery({ projectId }, { enabled: !!projectId });
    const { data: presets } = trpc.soundEffect.presets.useQuery();

    const createMutation = trpc.soundEffect.create.useMutation({
      onSuccess: () => { toast.success("Sound effect added"); utils.soundEffect.list.invalidate(); },
      onError: (e) => toast.error(e.message),
    });
    const updateMutation = trpc.soundEffect.update.useMutation({
      onSuccess: () => { toast.success("Updated"); utils.soundEffect.list.invalidate(); },
      onError: (e) => toast.error(e.message),
    });
    const deleteMutation = trpc.soundEffect.delete.useMutation({
      onSuccess: () => { toast.success("Removed"); utils.soundEffect.list.invalidate(); },
      onError: (e) => toast.error(e.message),
    });
    const generateMutation = trpc.soundEffect.generateFromText.useMutation({
      onSuccess: () => { toast.success("Sound effect generated!"); utils.soundEffect.list.invalidate(); setAiPrompt(""); setAiName(""); },
      onError: (e) => toast.error(e.message),
    });
    const uploadMutation = trpc.soundEffect.upload.useMutation({
      onSuccess: (data, vars) => {
        createMutation.mutate({ projectId, name: vars.fileName.replace(/\.[^.]+$/, ""), category: "foley", fileUrl: data.url, fileKey: data.key, isCustom: 1 });
        setUploading(false);
      },
      onError: (e) => { toast.error(e.message); setUploading(false); },
    });

    const playAudio = (url: string, id: string) => {
      if (playingId === id) {
        audioRef.current?.pause();
        setPlayingId(null);
        return;
      }
      if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = url; audioRef.current.play(); }
      else {
        const a = new Audio(url); audioRef.current = a;
        a.play(); a.onended = () => setPlayingId(null);
      }
      setPlayingId(id);
    };

    const handleFileUpload = async (file: File) => {
      const valid = ["audio/mpeg","audio/mp3","audio/wav","audio/ogg","audio/mp4","audio/webm","audio/x-m4a","audio/aac","audio/flac"];
      if (!valid.includes(file.type)) { toast.error("Unsupported audio format"); return; }
      if (file.size > 50 * 1024 * 1024) { toast.error("File too large — max 50MB"); return; }
      setUploading(true);
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = (e.target?.result as string).split(",")[1];
        uploadMutation.mutate({ projectId, fileName: file.name, fileData: base64, contentType: file.type as any });
      };
      reader.readAsDataURL(file);
    };

    const addPreset = (preset: any) => {
      createMutation.mutate({ projectId, name: preset.name, category: preset.category, tags: preset.tags, volume: 0.8 });
    };

    const allSfx = sfxList || [];
    const filteredSfx = allSfx.filter((s: any) =>
      (selectedCategory === "all" || s.category === selectedCategory) &&
      (s.name.toLowerCase().includes(searchQuery.toLowerCase()) || !searchQuery)
    );

    const filteredPresets = (presets || []).filter((p: any) =>
      (selectedCategory === "all" || p.category === selectedCategory) &&
      (p.name.toLowerCase().includes(searchQuery.toLowerCase()) || !searchQuery)
    );

    const totalDuration = allSfx.reduce((s: number, e: any) => s + (e.duration || 0), 0);

    const exportMixSheet = () => {
      const lines = [
        "SOUND EFFECTS MIX SHEET",
        "=".repeat(50),
        `Project ID: ${projectId}`,
        `Total SFX: ${allSfx.length} | Total duration: ${totalDuration}s`,
        "",
        "MIX BREAKDOWN:",
        "-".repeat(50),
        ...allSfx.map((s: any, i: number) =>
          `${String(i+1).padStart(2,"0")}. [${s.category?.toUpperCase()}] ${s.name}`
          + `\n    Volume: ${Math.round((s.volume||0.8)*100)}% | Start: ${s.startTime||0}s | Loop: ${s.loop ? "Yes" : "No"}`
          + (s.notes ? `\n    Notes: ${s.notes}` : "")
          + `\n    AI Prompt: ${s.name} — used in ${s.category} track for film generation`
        ),
        "",
        "=".repeat(50),
        "Generated by Virelle Studios · virelle.life",
      ];
      const blob = new Blob([lines.join("\n")], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "mix-sheet.txt"; a.click();
      URL.revokeObjectURL(url);
      toast.success("Mix sheet exported");
    };

    return (
      <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #080810 0%, #0d0d1a 100%)" }}>
        {/* Header */}
        <div className="border-b sticky top-0 z-20" style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(8,8,16,0.97)", backdropFilter: "blur(24px)" }}>
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => setLocation(`/projects/${projectId}`)} className="gap-2 text-muted-foreground"><ArrowLeft className="h-4 w-4" />Back</Button>
              <div className="h-5 w-px bg-border/50" />
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg,#ec4899,#f43f5e)" }}>
                  <Music className="h-4 w-4 text-white" />
                </div>
                <div>
                  <div className="font-semibold text-sm">Sound Effects Studio</div>
                  <div className="text-[10px] text-muted-foreground">{allSfx.length} effects · {totalDuration}s</div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={exportMixSheet} className="gap-2"><Download className="h-3.5 w-3.5" />Mix Sheet</Button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Pipeline connection banner */}
          <div className="mb-5 rounded-lg border px-4 py-3 flex items-start gap-3" style={{ borderColor: "rgba(236,72,153,0.3)", background: "rgba(236,72,153,0.05)" }}>
            <Sparkles className="h-4 w-4 text-pink-400 mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              <span className="text-pink-400 font-medium">Connected to AI Generation.</span>{" "}
              Every sound effect you add writes into your film's generation pipeline as <span className="text-pink-300 font-mono text-[11px]">sfxNotes</span> and <span className="text-pink-300 font-mono text-[11px]">sfxProductionNotes</span>.
              The AI uses these to match audio design, pacing, and atmosphere when rendering each scene.
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6 border border-border/50 bg-background/50">
              <TabsTrigger value="mixboard" className="gap-2 text-xs"><Sliders className="h-3.5 w-3.5" />Mix Board</TabsTrigger>
              <TabsTrigger value="library" className="gap-2 text-xs"><Music className="h-3.5 w-3.5" />SFX Library</TabsTrigger>
              <TabsTrigger value="aigenerate" className="gap-2 text-xs"><Wand2 className="h-3.5 w-3.5" />AI Generate</TabsTrigger>
              <TabsTrigger value="upload" className="gap-2 text-xs"><Upload className="h-3.5 w-3.5" />Upload</TabsTrigger>
            </TabsList>

            {/* ── MIX BOARD ── */}
            <TabsContent value="mixboard">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search effects..." className="h-8 pl-9 text-xs bg-background/50" />
                  </div>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="h-8 w-40 text-xs bg-background/50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">All Categories</SelectItem>
                      {SFX_CATEGORIES.map(c => <SelectItem key={c.id} value={c.id} className="text-xs">{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {isLoading ? (
                  <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 rounded-xl bg-muted/20 animate-pulse" />)}</div>
                ) : filteredSfx.length === 0 ? (
                  <div className="rounded-xl border-2 border-dashed flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground" style={{ borderColor: "rgba(236,72,153,0.12)" }}>
                    <Music className="h-12 w-12 opacity-15" />
                    <p className="text-sm font-medium">No sound effects yet</p>
                    <p className="text-xs opacity-60">Browse the library, generate with AI, or upload your own files</p>
                    <div className="flex gap-2 mt-2">
                      <Button size="sm" variant="outline" onClick={() => setActiveTab("library")} className="gap-2"><Music className="h-3.5 w-3.5" />Browse Library</Button>
                      <Button size="sm" onClick={() => setActiveTab("aigenerate")} className="gap-2" style={{ background: "linear-gradient(135deg,#ec4899,#f43f5e)" }}><Wand2 className="h-3.5 w-3.5" />AI Generate</Button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border overflow-hidden" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                    <div className="grid grid-cols-12 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-2.5 border-b" style={{ borderColor: "rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.02)" }}>
                      <div className="col-span-1" />
                      <div className="col-span-3">Name</div>
                      <div className="col-span-2">Category</div>
                      <div className="col-span-3">Volume</div>
                      <div className="col-span-2">Duration</div>
                      <div className="col-span-1" />
                    </div>
                    <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                      {filteredSfx.map((sfx: any) => {
                        const cat = SFX_CATEGORIES.find(c => c.id === sfx.category);
                        const Icon = cat?.icon || Music;
                        const vol = sfx.volume ?? 0.8;
                        return (
                          <div key={sfx.id} className="grid grid-cols-12 items-center px-4 py-3 hover:bg-white/[0.015] transition-colors group">
                            <div className="col-span-1">
                              <button
                                onClick={() => sfx.fileUrl ? playAudio(sfx.fileUrl, String(sfx.id)) : toast.info("No audio file — add a URL or generate with AI")}
                                className={`h-8 w-8 rounded-full flex items-center justify-center transition-all ${sfx.fileUrl ? "hover:bg-pink-500/20 cursor-pointer" : "opacity-30 cursor-not-allowed"}`}
                                style={{ background: playingId === String(sfx.id) ? "rgba(236,72,153,0.2)" : "rgba(255,255,255,0.05)" }}
                              >
                                {playingId === String(sfx.id) ? <Pause className="h-3.5 w-3.5 text-pink-400" /> : <Play className="h-3.5 w-3.5 text-muted-foreground" />}
                              </button>
                            </div>
                            <div className="col-span-3">
                              <p className="text-xs font-medium truncate">{sfx.name}</p>
                              {sfx.isCustom ? <span className="text-[9px] text-pink-400">Custom upload</span> : sfx.fileUrl ? <span className="text-[9px] text-emerald-400">AI generated</span> : <span className="text-[9px] text-muted-foreground">Preset</span>}
                            </div>
                            <div className="col-span-2">
                              <div className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full ${cat?.bg || "bg-muted/20"}`}>
                                <Icon className={`h-2.5 w-2.5 ${cat?.color || "text-muted-foreground"}`} />
                                <span className={cat?.color || "text-muted-foreground"}>{cat?.label || sfx.category}</span>
                              </div>
                            </div>
                            <div className="col-span-3">
                              <div className="flex items-center gap-2">
                                <VolumeBar value={vol} />
                                <Slider
                                  value={[vol]}
                                  onValueChange={([v]) => updateMutation.mutate({ id: sfx.id, volume: v })}
                                  min={0} max={1} step={0.05}
                                  className="w-20"
                                />
                                <span className="text-[10px] text-muted-foreground w-7 text-right font-mono">{Math.round(vol * 100)}%</span>
                              </div>
                            </div>
                            <div className="col-span-2 text-[10px] text-muted-foreground flex items-center gap-1">
                              {sfx.duration ? <><Clock className="h-3 w-3" />{sfx.duration}s</> : "—"}
                              {sfx.loop ? <span className="text-[9px] text-blue-400 ml-1">LOOP</span> : ""}
                            </div>
                            <div className="col-span-1 flex justify-end">
                              <button onClick={() => deleteMutation.mutate({ id: sfx.id })} className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-all">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ── SFX LIBRARY ── */}
            <TabsContent value="library">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search library..." className="h-8 pl-9 text-xs bg-background/50" />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setSelectedCategory("all")} className={`text-[11px] px-3 py-1.5 rounded-full border transition-all ${selectedCategory === "all" ? "border-pink-500/50 bg-pink-500/10 text-pink-400" : "border-border/40 text-muted-foreground hover:border-border"}`}>All</button>
                  {SFX_CATEGORIES.map(c => {
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
                    const cat = SFX_CATEGORIES.find(c => c.id === preset.category);
                    const Icon = cat?.icon || Music;
                    const alreadyAdded = allSfx.some((s: any) => s.name === preset.name);
                    return (
                      <div key={i} className={`group relative flex flex-col gap-2 p-3 rounded-xl border transition-all ${cat?.bg || "bg-muted/10"}`}
                        style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                        <div className="flex items-start justify-between gap-2">
                          <div className={`h-7 w-7 rounded-lg ${cat?.bg || "bg-muted/20"} flex items-center justify-center shrink-0`}>
                            <Icon className={`h-3.5 w-3.5 ${cat?.color || "text-muted-foreground"}`} />
                          </div>
                          {alreadyAdded && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />}
                        </div>
                        <div>
                          <p className="text-xs font-medium">{preset.name}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {(preset.tags || []).slice(0,3).map((tag: string) => (
                              <span key={tag} className="text-[9px] text-muted-foreground px-1.5 py-0.5 rounded bg-background/40">{tag}</span>
                            ))}
                          </div>
                        </div>
                        <Button size="sm" variant="outline" className="w-full h-7 text-[11px] gap-1.5 mt-auto" onClick={() => addPreset(preset)} disabled={alreadyAdded || createMutation.isPending}>
                          {alreadyAdded ? <><CheckCircle2 className="h-3 w-3 text-emerald-400" />Added</> : <><Plus className="h-3 w-3" />Add to Mix</>}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </TabsContent>

            {/* ── AI GENERATE ── */}
            <TabsContent value="aigenerate">
              <div className="max-w-2xl mx-auto space-y-5">
                <div className="rounded-xl border p-5" style={{ borderColor: "rgba(236,72,153,0.3)", background: "linear-gradient(135deg,rgba(236,72,153,0.07) 0%, transparent 100%)" }}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center shrink-0">
                      <Wand2 className="h-5 w-5 text-pink-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">AI Sound Effect Generator</h3>
                      <p className="text-xs text-muted-foreground">Powered by ElevenLabs Sound Generation API</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Name</Label>
                      <Input value={aiName} onChange={e => setAiName(e.target.value)} placeholder="e.g. Heavy Rain on Tin Roof" className="bg-background/50 text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Describe the sound</Label>
                      <Textarea
                        value={aiPrompt}
                        onChange={e => setAiPrompt(e.target.value)}
                        placeholder="Describe your sound effect in detail...&#10;e.g. Heavy rain hitting a tin roof with distant thunder rolling, cinematic and atmospheric, gradually intensifying over 8 seconds"
                        className="min-h-[100px] bg-background/50 resize-none text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs text-muted-foreground">Duration</Label>
                          <span className="text-xs font-mono text-pink-400">{aiDuration}s</span>
                        </div>
                        <Slider value={[aiDuration]} onValueChange={([v]) => setAiDuration(v)} min={1} max={30} step={1} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Category</Label>
                        <Select value={aiCategory} onValueChange={setAiCategory}>
                          <SelectTrigger className="h-9 text-xs bg-background/50"><SelectValue /></SelectTrigger>
                          <SelectContent>{SFX_CATEGORIES.map(c => <SelectItem key={c.id} value={c.id} className="text-xs">{c.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button
                      className="w-full gap-2 h-11"
                      style={{ background: "linear-gradient(135deg,#ec4899,#f43f5e)" }}
                      onClick={() => generateMutation.mutate({ projectId, prompt: aiPrompt, durationSeconds: aiDuration, name: aiName || aiPrompt.slice(0,60), category: aiCategory })}
                      disabled={!aiPrompt.trim() || generateMutation.isPending}
                    >
                      {generateMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin" />Generating...</> : <><Wand2 className="h-4 w-4" />Generate Sound Effect</>}
                    </Button>
                    <div className="rounded-lg border px-3 py-2.5 flex items-start gap-2" style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
                      <AlertCircle className="h-3.5 w-3.5 text-amber-400 mt-0.5 shrink-0" />
                      <p className="text-[10px] text-muted-foreground leading-relaxed">Requires an <span className="text-amber-400">ElevenLabs API key</span> configured in Settings → API Keys. Generation deducts credits. The generated file is stored in your project and fed directly to the AI generation pipeline as an SFX asset.</p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ── UPLOAD ── */}
            <TabsContent value="upload">
              <div className="max-w-2xl mx-auto">
                <div
                  className="rounded-2xl border-2 border-dashed flex flex-col items-center justify-center py-16 gap-4 cursor-pointer transition-all hover:border-pink-500/40 hover:bg-pink-500/[0.02]"
                  style={{ borderColor: "rgba(236,72,153,0.2)" }}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); }}
                  onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFileUpload(f); }}
                >
                  {uploading ? (
                    <><Loader2 className="h-10 w-10 text-pink-400 animate-spin" /><p className="text-sm font-medium">Uploading...</p></>
                  ) : (
                    <>
                      <div className="h-16 w-16 rounded-2xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center">
                        <Upload className="h-8 w-8 text-pink-400" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold">Drop audio file here</p>
                        <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
                        <p className="text-[10px] text-muted-foreground mt-2">MP3 · WAV · OGG · AAC · FLAC · M4A · up to 50MB</p>
                      </div>
                    </>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept="audio/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }} />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    );
  }
  