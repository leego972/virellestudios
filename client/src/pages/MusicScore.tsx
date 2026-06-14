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
    ArrowLeft, Plus, Trash2, Wand2, Loader2, Music, Download,
    Play, Pause, Mic, Volume2, Sliders, FileText, ExternalLink,
    Search, ChevronDown, ChevronUp, Sparkles, CheckCircle2,
    Clock, Tag, Save, X, User, Waves, Headphones,
  } from "lucide-react";
  import { SubscriptionGate } from "@/components/SubscriptionGate";

  // âââ Constants ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

  const CUE_TYPES = [
    { id: "underscore",    label: "Underscore",    color: "text-blue-400",   bg: "bg-blue-500/10",   dot: "#60a5fa" },
    { id: "source_music",  label: "Source Music",  color: "text-green-400",  bg: "bg-green-500/10",  dot: "#4ade80" },
    { id: "sting",         label: "Sting",         color: "text-amber-400",  bg: "bg-amber-500/10",  dot: "#fbbf24" },
    { id: "theme",         label: "Theme",         color: "text-purple-400", bg: "bg-purple-500/10", dot: "#c084fc" },
    { id: "transition",    label: "Transition",    color: "text-cyan-400",   bg: "bg-cyan-500/10",   dot: "#22d3ee" },
    { id: "silence",       label: "Silence",       color: "text-gray-400",   bg: "bg-gray-500/10",   dot: "#9ca3af" },
  ];
  const FOLEY_TYPES  = ["footsteps","cloth","props","impacts","environmental","custom"] as const;
  const ADR_STATUSES = ["pending","approved","recorded","mixed"] as const;
  const FOLEY_STATUSES = ["pending","approved","recorded","mixed"] as const;
  const CUEQ_STATUSES  = ["draft","spotting","recording","mixed","final","licensed"] as const;
  const MOODS = ["Tense","Dramatic","Hopeful","Melancholic","Triumphant","Mysterious","Romantic","Comedic","Action","Ambient","Horror","Inspirational"];
  const TEMPOS = ["Very Slow (< 60 BPM)","Slow (60â80 BPM)","Moderate (80â100 BPM)","Upbeat (100â120 BPM)","Fast (120â140 BPM)","Very Fast (> 140 BPM)"];
  const SYNC_PLATFORMS = [
    { name: "Artlist",        desc: "Unlimited sync Â· annual sub",                    url: "https://artlist.io",                   price: "$200â$500/yr",    best: "Online & Social" },
    { name: "Musicbed",       desc: "Per-licence Â· premium film catalogue",           url: "https://www.musicbed.com",              price: "$10â$500/track",  best: "Film & Commercial" },
    { name: "Epidemic Sound", desc: "YouTube/Twitch/podcasts Â· clear rights",         url: "https://www.epidemicsound.com",         price: "$15â$50/mo",      best: "YouTube & Streaming" },
    { name: "Soundstripe",    desc: "Unlimited sub Â· indie film focus",               url: "https://www.soundstripe.com",           price: "$16/mo",          best: "Indie Film" },
    { name: "Pond5",          desc: "Per-track Â· large catalogue",                    url: "https://www.pond5.com",                 price: "$10â$2000/track", best: "Feature Film" },
    { name: "MOJO (Musicbed)","desc": "One-time theatrical / festival / broadcast",   url: "https://www.musicbed.com/mojo",         price: "Custom quote",    best: "Theatrical / Festival" },
    { name: "PremiumBeat",    desc: "Subscription or per-track Â· Shutterstock brand", url: "https://www.premiumbeat.com",           price: "$49â$199/track",  best: "Commercial & Brand" },
    { name: "Motion Array",   desc: "All-in-one assets + music subscription",         url: "https://motionarray.com",               price: "$29/mo",          best: "Motion Design" },
  ];

  // âââ Extras stored in notes JSON âââââââââââââââââââââââââââââââââââââââââââ
  interface CueExtras {
    mood: string; tempoBpm: number; musicalKey: string;
    instrumentation: string; composerNote: string; syncLicense: string;
    cueStatus: string;
  }
  const DEFAULT_EXTRAS: CueExtras = { mood: "Dramatic", tempoBpm: 90, musicalKey: "C minor", instrumentation: "", composerNote: "", syncLicense: "", cueStatus: "draft" };
  function parseCueExtras(notes?: string | null): CueExtras {
    if (!notes) return { ...DEFAULT_EXTRAS };
    try {
      const p = JSON.parse(notes);
      if (typeof p === "object" && "mood" in p) return { ...DEFAULT_EXTRAS, ...p };
      return { ...DEFAULT_EXTRAS, composerNote: notes };
    } catch { return { ...DEFAULT_EXTRAS, composerNote: notes }; }
  }
  function serializeCueExtras(e: CueExtras): string { return JSON.stringify(e); }

  // âââ Sub-components âââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

  function CueTypeBadge({ type }: { type: string }) {
    const t = CUE_TYPES.find(c => c.id === type) || CUE_TYPES[0];
    return (
      <div className={`inline-flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${t.bg}`}>
        <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: t.dot }} />
        <span className={t.color}>{t.label}</span>
      </div>
    );
  }

  function StatusPill({ status }: { status: string }) {
    const colors: Record<string, string> = {
      draft: "bg-gray-500/15 text-gray-400", spotting: "bg-amber-500/15 text-amber-400",
      recording: "bg-blue-500/15 text-blue-400", mixed: "bg-violet-500/15 text-violet-400",
      final: "bg-green-500/15 text-green-400", licensed: "bg-emerald-500/15 text-emerald-400",
      pending: "bg-gray-500/15 text-gray-400", approved: "bg-green-500/15 text-green-400",
      recorded: "bg-blue-500/15 text-blue-400",
    };
    return <span className={`text-[9px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${colors[status] || "bg-gray-500/15 text-gray-400"}`}>{status}</span>;
  }

  // âââ Main component ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

  function MusicScoreInner() {
    const params   = useParams<{ id: string }>();
    const projectId = parseInt(params.id || "0");
    const [, setLocation] = useLocation();
    const utils = trpc.useUtils();

    const [activeTab,   setActiveTab]   = useState("cues");
    const [expandedCue, setExpandedCue] = useState<number | null>(null);
    const [editForm,    setEditForm]    = useState<Partial<any> | null>(null);
    const [editExtras,  setEditExtras]  = useState<CueExtras>(DEFAULT_EXTRAS);
    const [aiStyle,     setAiStyle]     = useState("orchestral");
    const [aiContext,   setAiContext]    = useState("");
    const [extraEdits,  setExtraEdits]  = useState<Record<number, Partial<CueExtras>>>({});

    // ââ Queries ââ
    const { data: cues,     isLoading: cuesLoading }  = trpc.filmPost.listScoreCues.useQuery({ projectId }, { enabled: !!projectId });
    const { data: adrList,  isLoading: adrLoading }   = trpc.filmPost.listAdrTracks.useQuery({ projectId }, { enabled: !!projectId });
    const { data: foleyList,isLoading: foleyLoading }  = trpc.filmPost.listFoleyTracks.useQuery({ projectId }, { enabled: !!projectId });
    const { data: mixSettings }                        = trpc.filmPost.getMixSettings.useQuery({ projectId }, { enabled: !!projectId });

    // ââ Mutations ââ
    const createCue  = trpc.filmPost.createScoreCue.useMutation({ onSuccess: () => { toast.success("Cue added"); utils.filmPost.listScoreCues.invalidate(); setEditForm(null); }, onError: e => toast.error(e.message) });
    const updateCue  = trpc.filmPost.updateScoreCue.useMutation({ onSuccess: () => utils.filmPost.listScoreCues.invalidate(), onError: e => toast.error(e.message) });
    const deleteCue  = trpc.filmPost.deleteScoreCue.useMutation({ onSuccess: () => { toast.success("Cue removed"); utils.filmPost.listScoreCues.invalidate(); }, onError: e => toast.error(e.message) });
    const genCues    = trpc.filmPost.generateScoreCues.useMutation({ onSuccess: (d) => { toast.success(`Generated ${d.cues.length} score cues!`); d.cues.forEach(c => createCue.mutate({ projectId, cueNumber: c.cueNumber, title: c.title, cueType: c.cueType as any, description: c.description, duration: c.duration, notes: serializeCueExtras({ ...DEFAULT_EXTRAS, composerNote: c.notes }) })); }, onError: e => toast.error(e.message) });

    const createAdr  = trpc.filmPost.createAdrTrack.useMutation({ onSuccess: () => { toast.success("ADR track added"); utils.filmPost.listAdrTracks.invalidate(); }, onError: e => toast.error(e.message) });
    const deleteAdr  = trpc.filmPost.deleteAdrTrack.useMutation({ onSuccess: () => { utils.filmPost.listAdrTracks.invalidate(); }, onError: e => toast.error(e.message) });
    const genAdr     = trpc.filmPost.generateAdrSuggestions.useMutation({ onSuccess: d => { toast.success(`Generated ${d.suggestions.length} ADR suggestions`); d.suggestions.forEach((s: any) => createAdr.mutate({ projectId, characterName: s.characterName, dialogueLine: s.dialogueLine, trackType: s.trackType as any, notes: s.notes })); }, onError: e => toast.error(e.message) });

    const createFoley = trpc.filmPost.createFoleyTrack.useMutation({ onSuccess: () => { toast.success("Foley track added"); utils.filmPost.listFoleyTracks.invalidate(); }, onError: e => toast.error(e.message) });
    const deleteFoley = trpc.filmPost.deleteFoleyTrack.useMutation({ onSuccess: () => utils.filmPost.listFoleyTracks.invalidate(), onError: e => toast.error(e.message) });
    const genFoley    = trpc.filmPost.generateFoleySuggestions.useMutation({ onSuccess: d => { toast.success(`Generated ${d.suggestions.length} Foley suggestions`); d.suggestions.forEach((s: any) => createFoley.mutate({ projectId, name: s.name, foleyType: s.foleyType as any, description: s.description, notes: s.notes })); }, onError: e => toast.error(e.message) });

    const saveMix    = trpc.filmPost.saveMixSettings.useMutation({ onSuccess: () => { toast.success("Mix settings saved"); utils.filmPost.getMixSettings.invalidate(); }, onError: e => toast.error(e.message) });
    const exportMix  = trpc.filmPost.exportMixSummary.useMutation({ onSuccess: d => { const blob = new Blob([JSON.stringify(d, null, 2)], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `mix-summary-${projectId}.json`; a.click(); toast.success("Mix summary exported"); }, onError: e => toast.error(e.message) });

    const allCues = cues || [];
    const totalDuration = allCues.reduce((s: number, c: any) => s + (c.duration || 0), 0);

    const getExtras = (cue: any): CueExtras => ({ ...parseCueExtras(cue.notes), ...(extraEdits[cue.id] || {}) });
    const saveExtras = (cue: any, patch: Partial<CueExtras>) => {
      const updated = { ...parseCueExtras(cue.notes), ...patch };
      setExtraEdits(p => ({ ...p, [cue.id]: { ...p[cue.id], ...patch } }));
      updateCue.mutate({ id: cue.id, notes: serializeCueExtras(updated) });
    };

    const exportCueSheet = () => {
      const hdr = ["Cue #","Title","Type","Status","Duration (s)","Mood","BPM","Key","Instrumentation","Composer Notes"];
      const rows = allCues.map((c: any) => {
        const e = getExtras(c);
        return [`"${c.cueNumber}"`,`"${c.title}"`,c.cueType,e.cueStatus,c.duration||"",`"${e.mood}"`,e.tempoBpm,`"${e.musicalKey}"`,`"${e.instrumentation}"`,`"${e.composerNote}"`].join(",");
      });
      const blob = new Blob([[hdr.join(","), ...rows].join("\n")], { type: "text/csv" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `cue-sheet-${projectId}.csv`; a.click();
      toast.success("Cue sheet exported as CSV");
    };

    // ââ New cue form helpers ââ
    const openNewCue = () => {
      const num = allCues.length ? `${Math.floor((allCues.length)/3)+1}M${(allCues.length%3)+1}` : "1M1";
      setEditForm({ cueNumber: num, title: "", cueType: "underscore", description: "", volume: 0.7, fadeIn: 0, fadeOut: 2, duration: 60 });
      setEditExtras({ ...DEFAULT_EXTRAS });
    };
    const submitCue = () => {
      if (!editForm?.title || !editForm?.cueNumber) { toast.error("Cue number and title are required"); return; }
      createCue.mutate({ projectId, cueNumber: editForm.cueNumber, title: editForm.title, cueType: editForm.cueType, description: editForm.description, volume: editForm.volume, fadeIn: editForm.fadeIn, fadeOut: editForm.fadeOut, duration: editForm.duration, notes: serializeCueExtras(editExtras) });
    };

    const [mixState, setMixState] = useState({ dialogueBus: 0.9, musicBus: 0.7, effectsBus: 0.75, masterVolume: 0.85, reverbRoom: "medium" as const, compressionRatio: 2, noiseReduction: false, notes: "" });
    // Load mix state from server
    if (mixSettings && !mixState.notes && mixSettings.dialogueBus) {
      // Already loaded â just show values
    }

    return (
      <div className="min-h-screen" style={{ background: "linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)" }}>
        {/* Header */}
        <div className="border-b sticky top-0 z-20" style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(7,7,14,0.97)", backdropFilter: "blur(24px)" }}>
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => setLocation(`/projects/${projectId}`)} className="gap-2 text-muted-foreground h-8"><ArrowLeft className="h-4 w-4" />Back</Button>
              <div className="h-5 w-px bg-border/40" />
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg,#1d4ed8,#7c3aed)" }}>
                  <Music className="text-white" style={{ width: 18, height: 18 }} />
                </div>
                <div>
                  <div className="font-bold text-sm">Music Score Studio</div>
                  <div className="text-[10px] text-muted-foreground">{allCues.length} cues Â· {(totalDuration/60).toFixed(1)} min scored Â· {(adrList||[]).length} ADR Â· {(foleyList||[]).length} Foley</div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={exportCueSheet} className="gap-2 h-8 text-xs border-border/50 hover:border-amber-500/50 hover:text-amber-400"><FileText className="h-3.5 w-3.5" />Cue Sheet CSV</Button>
              <Button size="sm" onClick={openNewCue} className="gap-2 h-8 text-xs" style={{ background: "linear-gradient(135deg,#1d4ed8,#7c3aed)" }}><Plus className="h-3.5 w-3.5" />Add Cue</Button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Stats */}
          <div className="mb-5 grid grid-cols-3 sm:grid-cols-6 gap-3">
            {[
              { label: "Score Cues",  val: allCues.length, color: "text-white" },
              { label: "Scored",      val: `${(totalDuration/60).toFixed(1)}m`, color: "text-white" },
              ...CUE_TYPES.slice(0,4).map(t => ({ label: t.label, val: allCues.filter((c:any)=>c.cueType===t.id).length, color: t.color })),
            ].map((s,i) => (
              <div key={i} className="rounded-xl border px-3 py-2.5" style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
                <div className="text-[9px] text-muted-foreground uppercase tracking-wider">{s.label}</div>
                <div className={`text-xl font-bold mt-0.5 ${s.color}`}>{s.val}</div>
              </div>
            ))}
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6 border border-border/40 bg-black/40 h-9 gap-0.5">
              <TabsTrigger value="cues"    className="gap-1.5 text-xs h-7 data-[state=active]:text-amber-400"><Music className="h-3.5 w-3.5" />Score Cues</TabsTrigger>
              <TabsTrigger value="mix"     className="gap-1.5 text-xs h-7 data-[state=active]:text-amber-400"><Sliders className="h-3.5 w-3.5" />Mix Settings</TabsTrigger>
              <TabsTrigger value="adr"     className="gap-1.5 text-xs h-7 data-[state=active]:text-amber-400"><Mic className="h-3.5 w-3.5" />ADR / Dialogue</TabsTrigger>
              <TabsTrigger value="foley"   className="gap-1.5 text-xs h-7 data-[state=active]:text-amber-400"><Headphones className="h-3.5 w-3.5" />Foley</TabsTrigger>
              <TabsTrigger value="sync"    className="gap-1.5 text-xs h-7 data-[state=active]:text-amber-400"><ExternalLink className="h-3.5 w-3.5" />Sync Library</TabsTrigger>
            </TabsList>

            {/* ââ SCORE CUES ââ */}
            <TabsContent value="cues">
              <div className="space-y-3">
                {/* AI Generate */}
                <div className="rounded-xl border p-4 flex items-center gap-4 flex-wrap" style={{ borderColor: "rgba(124,58,237,0.2)", background: "rgba(124,58,237,0.04)" }}>
                  <Wand2 className="h-5 w-5 text-violet-400 shrink-0" />
                  <div className="flex-1 space-y-2 min-w-[200px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Input value={aiStyle} onChange={e => setAiStyle(e.target.value)} placeholder="Score style (e.g. orchestral, minimalist piano, electronic)" className="h-8 text-xs bg-black/30 border-border/40 flex-1 min-w-48" />
                      <Button size="sm" onClick={() => genCues.mutate({ projectId, style: aiStyle, context: aiContext })} disabled={genCues.isPending} className="gap-2 h-8 text-xs" style={{ background: "linear-gradient(135deg,#1d4ed8,#7c3aed)" }}>
                        {genCues.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-400" /> : <Sparkles className="h-3.5 w-3.5" />}AI Generate Score
                      </Button>
                    </div>
                    <Input value={aiContext} onChange={e => setAiContext(e.target.value)} placeholder="Additional context for the composerâ¦" className="h-8 text-xs bg-black/30 border-border/40" />
                  </div>
                </div>

                {/* New cue form */}
                {editForm && (
                  <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: "rgba(124,58,237,0.35)", background: "rgba(124,58,237,0.05)" }}>
                    <div className="flex items-center justify-between"><p className="text-sm font-semibold">New Score Cue</p><button onClick={() => setEditForm(null)} className="text-muted-foreground hover:text-white"><X className="h-4 w-4" /></button></div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Cue Number</Label><Input value={editForm.cueNumber} onChange={e => setEditForm(p => ({ ...p, cueNumber: e.target.value }))} placeholder="1M1" className="h-8 text-xs bg-black/30 font-mono" /></div>
                      <div className="space-y-1.5 col-span-2"><Label className="text-xs text-muted-foreground">Cue Title</Label><Input value={editForm.title} onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. The Arrival" className="h-8 text-xs bg-black/30" /></div>
                      <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Type</Label><Select value={editForm.cueType} onValueChange={v => setEditForm(p => ({ ...p, cueType: v }))}><SelectTrigger className="h-8 text-xs bg-black/30 border-border/40"><SelectValue /></SelectTrigger><SelectContent>{CUE_TYPES.map(t => <SelectItem key={t.id} value={t.id} className="text-xs"><span className={t.color}>{t.label}</span></SelectItem>)}</SelectContent></Select></div>
                    </div>
                    <Textarea value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} placeholder="Emotional direction and what the music should achieve in this sceneâ¦" className="text-xs bg-black/30 resize-none min-h-[60px] border-border/40" />
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Mood</Label><Select value={editExtras.mood} onValueChange={v => setEditExtras(p=>({...p,mood:v}))}><SelectTrigger className="h-8 text-xs bg-black/30 border-border/40"><SelectValue /></SelectTrigger><SelectContent>{MOODS.map(m=><SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>)}</SelectContent></Select></div>
                      <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Tempo (BPM)</Label><Input type="number" value={editExtras.tempoBpm} onChange={e => setEditExtras(p=>({...p,tempoBpm:parseInt(e.target.value)||90}))} className="h-8 text-xs bg-black/30 font-mono" /></div>
                      <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Key</Label><Input value={editExtras.musicalKey} onChange={e => setEditExtras(p=>({...p,musicalKey:e.target.value}))} placeholder="C minor" className="h-8 text-xs bg-black/30" /></div>
                      <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Duration (s)</Label><Input type="number" value={editForm.duration} onChange={e => setEditForm(p=>({...p,duration:parseInt(e.target.value)||60}))} className="h-8 text-xs bg-black/30 font-mono" /></div>
                    </div>
                    <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Instrumentation</Label><Input value={editExtras.instrumentation} onChange={e => setEditExtras(p=>({...p,instrumentation:e.target.value}))} placeholder="e.g. Full orchestra, strings and piano, solo celloâ¦" className="h-8 text-xs bg-black/30" /></div>
                    <Textarea value={editExtras.composerNote} onChange={e => setEditExtras(p=>({...p,composerNote:e.target.value}))} placeholder="Composer notes â reference tracks, temp music inspiration, specific techniquesâ¦" className="text-xs bg-black/30 resize-none min-h-[60px] border-border/40" />
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="ghost" onClick={() => setEditForm(null)} className="gap-2 text-xs">Cancel</Button>
                      <Button size="sm" onClick={submitCue} disabled={createCue.isPending} className="gap-2 text-xs" style={{ background: "linear-gradient(135deg,#1d4ed8,#7c3aed)" }}>
                        {createCue.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-400" /> : <Plus className="h-3.5 w-3.5" />}Add Cue
                      </Button>
                    </div>
                  </div>
                )}

                {/* Cue list */}
                {cuesLoading ? (
                  <div className="space-y-2">{[1,2,3].map(i=><div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.03)" }} />)}</div>
                ) : allCues.length === 0 ? (
                  <div className="rounded-2xl border-2 border-dashed flex flex-col items-center py-20 gap-4" style={{ borderColor: "rgba(124,58,237,0.12)" }}>
                    <Music className="h-12 w-12 text-violet-400 opacity-30" />
                    <div className="text-center"><p className="text-sm font-semibold">No score cues yet</p><p className="text-xs text-muted-foreground mt-1">Add cues manually or let AI generate a full cue sheet</p></div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={openNewCue} className="gap-2 text-xs border-border/40 hover:border-amber-500/50 hover:text-amber-400"><Plus className="h-3.5 w-3.5" />Add Cue</Button>
                      <Button size="sm" onClick={() => genCues.mutate({ projectId, style: aiStyle })} disabled={genCues.isPending} className="gap-2 text-xs" style={{ background: "linear-gradient(135deg,#1d4ed8,#7c3aed)" }}>
                        <Sparkles className="h-3.5 w-3.5" />AI Generate
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Header */}
                    <div className="grid px-4 py-1.5 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/50" style={{ gridTemplateColumns: "72px 1fr 150px 120px 80px 32px" }}>
                      <div>Cue #</div><div>Title</div><div>Type / Status</div><div>Mood / BPM</div><div>Duration</div><div />
                    </div>
                    {allCues.map((cue: any) => {
                      const ex = getExtras(cue);
                      const isExpanded = expandedCue === cue.id;
                      return (
                        <div key={cue.id} className="rounded-xl border overflow-hidden transition-all" style={{ borderColor: isExpanded ? "rgba(124,58,237,0.35)" : "rgba(255,255,255,0.07)", background: isExpanded ? "rgba(124,58,237,0.04)" : "rgba(255,255,255,0.02)" }}>
                          <div className="grid items-center px-4 py-3 gap-2 cursor-pointer" style={{ gridTemplateColumns: "72px 1fr 150px 120px 80px 32px" }} onClick={() => setExpandedCue(isExpanded ? null : cue.id)}>
                            <span className="text-xs font-mono font-bold text-violet-400">{cue.cueNumber}</span>
                            <div><p className="text-xs font-semibold truncate">{cue.title}</p><p className="text-[10px] text-muted-foreground truncate">{cue.description?.slice(0,60) || "â"}</p></div>
                            <div className="flex flex-col gap-1"><CueTypeBadge type={cue.cueType} /><StatusPill status={ex.cueStatus} /></div>
                            <div className="text-[10px] text-muted-foreground space-y-0.5"><div>{ex.mood}</div><div className="font-mono">{ex.tempoBpm} BPM Â· {ex.musicalKey}</div></div>
                            <div className="text-[10px] font-mono text-muted-foreground">{cue.duration ? `${cue.duration}s` : "â"}</div>
                            <div className="flex justify-end">{isExpanded ? <ChevronUp className="h-4 w-4 text-violet-400" /> : <ChevronDown className="h-4 w-4 text-muted-foreground/50" />}</div>
                          </div>
                          {isExpanded && (
                            <div className="border-t px-4 py-5 space-y-5" style={{ borderColor: "rgba(124,58,237,0.12)", background: "rgba(0,0,0,0.2)" }}>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <div className="space-y-1.5"><Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Status</Label><Select value={ex.cueStatus} onValueChange={v => saveExtras(cue, { cueStatus: v })}><SelectTrigger className="h-8 text-xs bg-black/30 border-border/40"><SelectValue /></SelectTrigger><SelectContent>{CUEQ_STATUSES.map(s => <SelectItem key={s} value={s} className="text-xs capitalize">{s}</SelectItem>)}</SelectContent></Select></div>
                                <div className="space-y-1.5"><Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Mood</Label><Select value={ex.mood} onValueChange={v => saveExtras(cue, { mood: v })}><SelectTrigger className="h-8 text-xs bg-black/30 border-border/40"><SelectValue /></SelectTrigger><SelectContent>{MOODS.map(m => <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>)}</SelectContent></Select></div>
                                <div className="space-y-1.5"><Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Tempo (BPM)</Label><Input type="number" value={ex.tempoBpm} onChange={e => saveExtras(cue, { tempoBpm: parseInt(e.target.value)||90 })} className="h-8 text-xs bg-black/30 font-mono border-border/40" /></div>
                                <div className="space-y-1.5"><Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Musical Key</Label><Input value={ex.musicalKey} onChange={e => saveExtras(cue, { musicalKey: e.target.value })} placeholder="C minor" className="h-8 text-xs bg-black/30 border-border/40" /></div>
                              </div>
                              <div className="space-y-1.5"><Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Instrumentation</Label><Input value={ex.instrumentation} onChange={e => saveExtras(cue, { instrumentation: e.target.value })} placeholder="Full orchestra Â· strings Â· brass Â· solo oboeâ¦" className="h-8 text-xs bg-black/30 border-border/40" /></div>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between"><Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Volume</Label><span className="text-[10px] font-mono text-violet-400">{Math.round((cue.volume||0.7)*100)}%</span></div>
                                  <Slider value={[cue.volume||0.7]} onValueChange={([v]) => updateCue.mutate({ id: cue.id, volume: v })} min={0} max={1} step={0.05} />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Duration (s)</Label>
                                  <Input type="number" value={cue.duration||""} onChange={e => updateCue.mutate({ id: cue.id, duration: parseFloat(e.target.value)||undefined })} className="h-8 text-xs bg-black/30 font-mono border-border/40" />
                                </div>
                              </div>
                              <div className="space-y-1.5"><Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Composer Notes</Label><Textarea value={ex.composerNote} onChange={e => saveExtras(cue, { composerNote: e.target.value })} placeholder="Reference tracks, temp music, specific emotional direction, technical requirementsâ¦" className="text-xs bg-black/30 resize-none min-h-[70px] border-violet-500/10" /></div>
                              <div className="space-y-1.5"><Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Sync License Notes</Label><Input value={ex.syncLicense} onChange={e => saveExtras(cue, { syncLicense: e.target.value })} placeholder="Source music title, publisher, licence status, MFN clauseâ¦" className="h-8 text-xs bg-black/30 border-border/40" /></div>
                              <div className="flex justify-end"><button onClick={() => deleteCue.mutate({ id: cue.id })} className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg border border-transparent hover:border-red-500/20 hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-all"><Trash2 className="h-3.5 w-3.5" />Remove Cue</button></div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ââ MIX SETTINGS ââ */}
            <TabsContent value="mix">
              <div className="max-w-2xl space-y-6">
                <div className="rounded-xl border px-4 py-3 flex items-center gap-3" style={{ borderColor: "rgba(124,58,237,0.2)", background: "rgba(124,58,237,0.04)" }}>
                  <Sliders className="h-4 w-4 text-violet-400 shrink-0" style={{ width: 16, height: 16 }} />
                  <p className="text-xs text-muted-foreground">3-bus mix: Dialogue, Music, and Effects busses with master volume, EQ, reverb, and noise reduction. These settings are baked into the final film render.</p>
                </div>
                {[
                  { key: "dialogueBus", label: "Dialogue Bus", color: "#60a5fa" },
                  { key: "musicBus",    label: "Music Bus",    color: "#c084fc" },
                  { key: "effectsBus",  label: "Effects Bus",  color: "#4ade80" },
                  { key: "masterVolume",label: "Master Volume",color: "#D4AF37" },
                ].map(b => (
                  <div key={b.key} className="space-y-2">
                    <div className="flex items-center justify-between"><Label className="text-xs">{b.label}</Label><span className="text-xs font-mono" style={{ color: b.color }}>{Math.round(((mixSettings as any)?.[b.key] || (mixState as any)[b.key] || 0.75)*100)}%</span></div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
                      <div className="h-full rounded-full" style={{ width: `${((mixSettings as any)?.[b.key] || (mixState as any)[b.key] || 0.75)*100}%`, background: b.color, opacity: 0.7 }} />
                    </div>
                    <Slider value={[(mixSettings as any)?.[b.key] || (mixState as any)[b.key] || 0.75]} onValueChange={([v]) => setMixState(p => ({ ...p, [b.key]: v }))} min={0} max={1} step={0.05} />
                  </div>
                ))}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Reverb Room</Label><Select value={(mixSettings?.reverbRoom || mixState.reverbRoom) as string} onValueChange={v => setMixState(p => ({ ...p, reverbRoom: v as any }))}><SelectTrigger className="h-9 text-xs bg-black/30 border-border/40"><SelectValue /></SelectTrigger><SelectContent>{["none","small","medium","large","hall","cathedral"].map(v => <SelectItem key={v} value={v} className="text-xs capitalize">{v}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Compression Ratio</Label><Input type="number" min={1} max={20} value={mixState.compressionRatio} onChange={e => setMixState(p=>({...p, compressionRatio: parseFloat(e.target.value)||2}))} className="h-9 text-xs bg-black/30 font-mono border-border/40" /></div>
                </div>
                <div className="flex items-center justify-between rounded-xl border px-4 py-3" style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
                  <div><p className="text-xs font-semibold">Noise Reduction</p><p className="text-[10px] text-muted-foreground">Apply AI-based noise removal to dialogue tracks</p></div>
                  <Switch checked={mixState.noiseReduction} onCheckedChange={v => setMixState(p=>({...p,noiseReduction:v}))} />
                </div>
                <Textarea value={mixState.notes} onChange={e => setMixState(p=>({...p,notes:e.target.value}))} placeholder="Mix supervisor notes â special instructions, reference mix, delivery formatâ¦" className="text-xs bg-black/30 resize-none min-h-[80px] border-border/40" />
                <div className="flex gap-3">
                  <Button onClick={() => saveMix.mutate({ projectId, ...mixState })} disabled={saveMix.isPending} className="gap-2" style={{ background: "linear-gradient(135deg,#1d4ed8,#7c3aed)" }}>
                    {saveMix.isPending ? <Loader2 className="h-4 w-4 animate-spin text-amber-400" /> : <Save className="h-4 w-4" />}Save Mix Settings
                  </Button>
                  <Button variant="outline" onClick={() => exportMix.mutate({ projectId })} disabled={exportMix.isPending} className="gap-2 border-border/40">
                    {exportMix.isPending ? <Loader2 className="h-4 w-4 animate-spin text-amber-400" /> : <Download className="h-4 w-4" />}Export Summary
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* ââ ADR ââ */}
            <TabsContent value="adr">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div><p className="text-sm font-semibold">ADR / Dialogue Replacement</p><p className="text-xs text-muted-foreground mt-0.5">Automated Dialogue Replacement tracks for post-sync recording</p></div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => genAdr.mutate({ projectId })} disabled={genAdr.isPending} className="gap-2 text-xs border-border/40"><Sparkles className="h-3.5 w-3.5" />{genAdr.isPending ? "Generatingâ¦" : "AI Suggest"}</Button>
                  </div>
                </div>
                {adrLoading ? <div className="h-20 rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.03)" }} /> : (adrList||[]).length === 0 ? (
                  <div className="rounded-xl border-2 border-dashed flex flex-col items-center py-16 gap-3" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                    <Mic className="h-10 w-10 opacity-20" />
                    <p className="text-sm">No ADR tracks added</p>
                    <Button size="sm" variant="outline" onClick={() => genAdr.mutate({ projectId })} disabled={genAdr.isPending} className="gap-2 text-xs border-border/40"><Sparkles className="h-3.5 w-3.5" />AI Suggest ADR Lines</Button>
                  </div>
                ) : (
                  <div className="rounded-xl border overflow-hidden" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                    <table className="w-full text-xs">
                      <thead><tr style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>{["Character","Dialogue Line","Type","Status","Notes",""].map(h => <th key={h} className="text-left px-3 py-2.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>)}</tr></thead>
                      <tbody className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                        {(adrList||[]).map((t: any) => (
                          <tr key={t.id} className="hover:bg-white/[0.015]">
                            <td className="px-3 py-2.5 font-semibold">{t.characterName || "â"}</td>
                            <td className="px-3 py-2.5 text-muted-foreground max-w-[200px] truncate">{t.dialogueLine || "â"}</td>
                            <td className="px-3 py-2.5"><span className="text-[9px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded-full">{t.trackType || "dialogue"}</span></td>
                            <td className="px-3 py-2.5"><StatusPill status={t.status || "pending"} /></td>
                            <td className="px-3 py-2.5 text-muted-foreground max-w-[150px] truncate">{t.notes || "â"}</td>
                            <td className="px-3 py-2.5"><button onClick={() => deleteAdr.mutate({ id: t.id })} className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-all"><Trash2 className="h-3.5 w-3.5" /></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ââ FOLEY ââ */}
            <TabsContent value="foley">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div><p className="text-sm font-semibold">Foley Track Sheet</p><p className="text-xs text-muted-foreground mt-0.5">Footsteps, cloth, props, impacts, environmental sounds for post-sync recording</p></div>
                  <Button size="sm" variant="outline" onClick={() => genFoley.mutate({ projectId })} disabled={genFoley.isPending} className="gap-2 text-xs border-border/40"><Sparkles className="h-3.5 w-3.5" />{genFoley.isPending ? "Generatingâ¦" : "AI Suggest Foley"}</Button>
                </div>
                {foleyLoading ? <div className="h-20 rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.03)" }} /> : (foleyList||[]).length === 0 ? (
                  <div className="rounded-xl border-2 border-dashed flex flex-col items-center py-16 gap-3" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                    <Headphones className="h-10 w-10 opacity-20" />
                    <p className="text-sm">No Foley tracks added</p>
                    <Button size="sm" variant="outline" onClick={() => genFoley.mutate({ projectId })} disabled={genFoley.isPending} className="gap-2 text-xs border-border/40"><Sparkles className="h-3.5 w-3.5" />AI Suggest Foley</Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {(foleyList||[]).map((t: any) => (
                      <div key={t.id} className="flex flex-col gap-2 p-3.5 rounded-xl border" style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0"><p className="text-xs font-semibold truncate">{t.name}</p><span className="text-[9px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded-full">{t.foleyType}</span></div>
                          <button onClick={() => deleteFoley.mutate({ id: t.id })} className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-all shrink-0"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-relaxed">{t.description || "â"}</p>
                        <StatusPill status={t.status || "pending"} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ââ SYNC LIBRARY ââ */}
            <TabsContent value="sync">
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground">Recommended sync licensing platforms for independent and theatrical film. Compare pricing models and choose the right partner for your distribution plan.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {SYNC_PLATFORMS.map((p, i) => (
                    <a key={i} href={p.url} target="_blank" rel="noopener noreferrer"
                      className="flex flex-col gap-2.5 p-4 rounded-xl border transition-all hover:border-violet-500/25 group"
                      style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-bold group-hover:text-violet-400 transition-colors">{p.name}</p>
                        <ExternalLink className="h-4 w-4 text-muted-foreground/40 shrink-0 group-hover:text-violet-400 transition-colors" />
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{p.desc}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] font-mono text-muted-foreground">{p.price}</span>
                        <span className="text-[9px] bg-violet-500/10 text-violet-400 px-2 py-0.5 rounded-full">{p.best}</span>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    );
  }

  export default function MusicScore() {
    return <SubscriptionGate feature="canUseMusicScore"><MusicScoreInner /></SubscriptionGate>;
  }
  