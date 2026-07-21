import { useState } from "react";
  import { useLocation } from "wouter";
  import {
    Tv, Plus, ChevronRight, Trash2, Edit2, Film, BookOpen, Save, X, Users,
    Globe, Layers, Download, FileJson, Clapperboard, Star, Target, Compass,
    Eye, Zap, Award, PlayCircle, ChevronDown, ChevronUp, Map, Palette,
  } from "lucide-react";
  import { Button } from "@/components/ui/button";
  import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
  import { Input } from "@/components/ui/input";
  import { Label } from "@/components/ui/label";
  import { Textarea } from "@/components/ui/textarea";
  import { Badge } from "@/components/ui/badge";
  import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
  import { Separator } from "@/components/ui/separator";
  import { toast } from "sonner";

  // ── Types ──────────────────────────────────────────────────────────────────────

  interface CharacterProfile {
    id: string;
    name: string;
    role: "lead" | "co-lead" | "supporting" | "recurring" | "antagonist";
    archetype: string;
    logline: string;
    backstory: string;
    arc: string;
    relationships: string;
  }

  interface Episode {
    id: string;
    number: number;
    title: string;
    logline: string;
    coldOpen: string;
    status: "treatment" | "outline" | "draft" | "locked" | "produced";
  }

  interface Season {
    id: string;
    number: number;
    premise: string;
    arc: string;
    episodes: Episode[];
  }

  interface Series {
    id: string;
    title: string;
    tagline: string;
    format: string;
    genres: string[];
    logline: string;
    premise: string;
    thesis: string;
    timePeriod: string;
    setting: string;
    worldBuilding: string;
    toneAndStyle: string;
    visualStyle: string;
    comparables: string;
    targetAudience: string;
    networkFit: string;
    pilotOverview: string;
    pilotColdOpen: string;
    pilotEndingHook: string;
    episodeRuntime: string;
    characters: CharacterProfile[];
    seasons: Season[];
  }

  // ── Constants ──────────────────────────────────────────────────────────────────

  const FORMATS = [
    "Drama Series","Limited Series","Anthology","Comedy Series",
    "Thriller Series","Sci-Fi Series","Mini-Series","Docuseries",
    "Animation","Web Series","Hybrid",
  ];

  const ALL_GENRES = [
    "Drama","Thriller","Crime","Mystery","Sci-Fi","Fantasy","Horror",
    "Comedy","Dark Comedy","Romance","Action","Adventure","Period",
    "Political","Legal","Medical","Psychological","Supernatural","Sports","Music",
  ];

  const ROLE_COLORS: Record<string, string> = {
    lead:       "bg-amber-400/20 text-amber-400 border-amber-400/30",
    "co-lead":  "bg-yellow-400/20 text-yellow-400 border-yellow-400/30",
    supporting: "bg-blue-400/20 text-blue-400 border-blue-400/30",
    recurring:  "bg-purple-400/20 text-purple-400 border-purple-400/30",
    antagonist: "bg-red-400/20 text-red-400 border-red-400/30",
  };

  const STATUS_COLORS: Record<string, string> = {
    treatment: "bg-muted text-muted-foreground",
    outline:   "bg-sky-500/20 text-sky-400",
    draft:     "bg-amber-400/20 text-amber-400",
    locked:    "bg-green-500/20 text-green-400",
    produced:  "bg-purple-500/20 text-purple-400",
  };

  const STATUS_ORDER = ["treatment","outline","draft","locked","produced"] as const;

  const DEFAULT_CHARACTER: () => CharacterProfile = () => ({
    id: Date.now().toString(),
    name: "", role: "supporting", archetype: "",
    logline: "", backstory: "", arc: "", relationships: "",
  });

  const DEFAULT_SERIES: () => Series = () => ({
    id: Date.now().toString(),
    title: "", tagline: "", format: "Drama Series", genres: [],
    logline: "", premise: "", thesis: "", timePeriod: "", setting: "",
    worldBuilding: "", toneAndStyle: "", visualStyle: "",
    comparables: "", targetAudience: "", networkFit: "",
    pilotOverview: "", pilotColdOpen: "", pilotEndingHook: "",
    episodeRuntime: "45-60 min",
    characters: [],
    seasons: [{
      id: "s1", number: 1, premise: "", arc: "",
      episodes: [{ id: "e1", number: 1, title: "", logline: "", coldOpen: "", status: "treatment" }],
    }],
  });

  // ── Export ─────────────────────────────────────────────────────────────────────

  function exportJSON(s: Series) {
    const blob = new Blob([JSON.stringify(s, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `${s.title.replace(/\s+/g, "-").toLowerCase() || "series"}-bible.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Series bible exported");
  }

  // ── Sub-components ─────────────────────────────────────────────────────────────

  function SectionCard({ icon: Icon, title, children }: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    children: React.ReactNode;
  }) {
    return (
      <Card className="glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/15 transition-shadow border-amber-500/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 gradient-text-gold">
            <Icon className="h-4 w-4 text-amber-400 shrink-0" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    );
  }

  function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
      <div className="space-y-1.5">
        <Label className="text-[11px] uppercase tracking-wider text-muted-foreground/70 font-semibold">{label}</Label>
        {children}
      </div>
    );
  }

  function ReadText({ value, placeholder }: { value: string; placeholder: string }) {
    return (
      <p className={`text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed ${!value ? "italic opacity-50" : ""}`}>
        {value || placeholder}
      </p>
    );
  }

  // ── Character Card ─────────────────────────────────────────────────────────────

  function CharacterCard({
    char,
    onEdit,
    onDelete,
  }: {
    char: CharacterProfile;
    onEdit: () => void;
    onDelete: () => void;
  }) {
    const [expanded, setExpanded] = useState(false);
    return (
      <Card className="glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/15 transition-shadow border-amber-500/10">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-500/20 to-amber-700/10 border border-amber-500/20 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-amber-400">{(char.name || "?")[0]?.toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm">{char.name || "(Unnamed)"}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border capitalize font-medium ${ROLE_COLORS[char.role]}`}>{char.role}</span>
                {char.archetype && <span className="text-[10px] text-muted-foreground italic">{char.archetype}</span>}
              </div>
              {char.logline && <p className="text-xs text-muted-foreground mt-1 line-clamp-2 italic">"{char.logline}"</p>}
            </div>
            <div className="flex gap-1 shrink-0">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpanded(e => !e)}>
                {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}><Edit2 className="h-3 w-3" /></Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={onDelete}><Trash2 className="h-3 w-3" /></Button>
            </div>
          </div>

          {expanded && (char.backstory || char.arc || char.relationships) && (
            <div className="mt-4 space-y-3 pl-13 border-t border-amber-500/10 pt-4">
              {char.backstory && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold mb-1">Backstory</p>
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap">{char.backstory}</p>
                </div>
              )}
              {char.arc && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold mb-1">Character Arc</p>
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap">{char.arc}</p>
                </div>
              )}
              {char.relationships && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold mb-1">Key Relationships</p>
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap">{char.relationships}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // ── Character Editor ───────────────────────────────────────────────────────────

  function CharacterEditor({
    initial,
    onSave,
    onCancel,
  }: {
    initial: CharacterProfile;
    onSave: (c: CharacterProfile) => void;
    onCancel: () => void;
  }) {
    const [c, setC] = useState(initial);
    const set = (k: keyof CharacterProfile, v: string) => setC(prev => ({ ...prev, [k]: v }));
    return (
      <Card className="glass-card border-amber-500/20 shadow-lg shadow-amber-500/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm gradient-text-gold">{initial.name ? `Edit — ${initial.name}` : "New Character"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FieldRow label="Character Name">
              <Input placeholder="Full name" value={c.name} onChange={e => set("name", e.target.value)} className="h-8 text-sm" />
            </FieldRow>
            <FieldRow label="Role">
              <Select value={c.role} onValueChange={v => set("role", v)}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["lead","co-lead","supporting","recurring","antagonist"] as const).map(r =>
                    <SelectItem key={r} value={r} className="text-sm capitalize">{r}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </FieldRow>
          </div>
          <FieldRow label="Archetype (e.g. The Reluctant Hero)">
            <Input placeholder="Archetype" value={c.archetype} onChange={e => set("archetype", e.target.value)} className="h-8 text-sm" />
          </FieldRow>
          <FieldRow label="Character Logline">
            <Textarea placeholder="One sentence — who this character is at their core…" value={c.logline} onChange={e => set("logline", e.target.value)} className="h-16 text-sm" />
          </FieldRow>
          <FieldRow label="Backstory">
            <Textarea placeholder="Formative history, wound, secret…" value={c.backstory} onChange={e => set("backstory", e.target.value)} className="h-20 text-sm" />
          </FieldRow>
          <FieldRow label="Character Arc">
            <Textarea placeholder="Where do they begin, what breaks them, where do they land?" value={c.arc} onChange={e => set("arc", e.target.value)} className="h-20 text-sm" />
          </FieldRow>
          <FieldRow label="Key Relationships">
            <Textarea placeholder="How this character relates to others in the ensemble…" value={c.relationships} onChange={e => set("relationships", e.target.value)} className="h-16 text-sm" />
          </FieldRow>
          <div className="flex gap-2 pt-2">
            <Button size="sm" className="gold-button" onClick={() => { if (!c.name) { toast.error("Name required"); return; } onSave(c); }}>
              <Save className="h-3.5 w-3.5 mr-1" />Save Character
            </Button>
            <Button variant="ghost" size="sm" onClick={onCancel}><X className="h-3.5 w-3.5 mr-1" />Cancel</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Series Form ────────────────────────────────────────────────────────────────

  function SeriesForm({ initial, onSave, onCancel }: {
    initial: Series;
    onSave: (s: Series) => void;
    onCancel: () => void;
  }) {
    const [s, setS] = useState(initial);
    const set = (k: keyof Series, v: string | string[]) => setS(prev => ({ ...prev, [k]: v }));
    const toggleGenre = (g: string) =>
      setS(prev => ({ ...prev, genres: prev.genres.includes(g) ? prev.genres.filter(x => x !== g) : [...prev.genres, g] }));

    return (
      <div className="max-w-3xl mx-auto space-y-6 py-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onCancel}><X className="h-4 w-4 mr-1" />Cancel</Button>
          <h1 className="text-xl font-bold gradient-text-gold flex-1">{s.title ? `Editing — ${s.title}` : "New Series Bible"}</h1>
          <Button className="gold-button" size="sm" onClick={() => { if (!s.title) { toast.error("Title required"); return; } onSave(s); }}>
            <Save className="h-4 w-4 mr-1" />Save Bible
          </Button>
        </div>

        {/* Identity */}
        <SectionCard icon={Film} title="Series Identity">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FieldRow label="Series Title">
                <Input placeholder="e.g. EMPIRE OF SHADOWS" value={s.title} onChange={e => set("title", e.target.value)} className="h-9 text-sm font-semibold" />
              </FieldRow>
              <FieldRow label="Tagline">
                <Input placeholder="e.g. Power never forgives." value={s.tagline} onChange={e => set("tagline", e.target.value)} className="h-9 text-sm italic" />
              </FieldRow>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FieldRow label="Format">
                <Select value={s.format} onValueChange={v => set("format", v)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{FORMATS.map(f => <SelectItem key={f} value={f} className="text-sm">{f}</SelectItem>)}</SelectContent>
                </Select>
              </FieldRow>
              <FieldRow label="Episode Runtime">
                <Select value={s.episodeRuntime} onValueChange={v => set("episodeRuntime", v)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Under 15 min","15-30 min","30-45 min","45-60 min","60-75 min","Over 75 min"].map(r =>
                      <SelectItem key={r} value={r} className="text-sm">{r}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </FieldRow>
            </div>
            <FieldRow label="Genre (select up to 3)">
              <div className="flex flex-wrap gap-2 mt-1">
                {ALL_GENRES.map(g => (
                  <button key={g} onClick={() => toggleGenre(g)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      s.genres.includes(g)
                        ? "bg-amber-500/20 border-amber-500/40 text-amber-400 font-medium"
                        : "border-border/40 text-muted-foreground hover:border-amber-500/30 hover:text-amber-400/60"
                    }`}>{g}</button>
                ))}
              </div>
            </FieldRow>
            <FieldRow label="Logline">
              <Textarea placeholder="One sentence — protagonist + goal + obstacle + stakes…" value={s.logline} onChange={e => set("logline", e.target.value)} className="h-16 text-sm" />
            </FieldRow>
            <FieldRow label="Premise">
              <Textarea placeholder="2-3 sentences expanding on the logline…" value={s.premise} onChange={e => set("premise", e.target.value)} className="h-20 text-sm" />
            </FieldRow>
            <FieldRow label="Thematic Thesis — What is this show really about?">
              <Textarea placeholder="The deeper truth your show explores (e.g. 'What does it cost to be free?')…" value={s.thesis} onChange={e => set("thesis", e.target.value)} className="h-16 text-sm" />
            </FieldRow>
            <FieldRow label="Comparable Shows">
              <Input placeholder="e.g. Succession meets Narcos — morally complex + propulsive" value={s.comparables} onChange={e => set("comparables", e.target.value)} className="h-9 text-sm" />
            </FieldRow>
          </div>
        </SectionCard>

        {/* World */}
        <SectionCard icon={Globe} title="World & Setting">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FieldRow label="Time Period">
                <Input placeholder="e.g. Contemporary, 1970s Los Angeles, Near-Future 2047" value={s.timePeriod} onChange={e => set("timePeriod", e.target.value)} className="h-9 text-sm" />
              </FieldRow>
              <FieldRow label="Primary Setting">
                <Input placeholder="e.g. New York City art world, a small border town" value={s.setting} onChange={e => set("setting", e.target.value)} className="h-9 text-sm" />
              </FieldRow>
            </div>
            <FieldRow label="World Building">
              <Textarea placeholder="Rules, institutions, power structures, history — the DNA of your world…" value={s.worldBuilding} onChange={e => set("worldBuilding", e.target.value)} className="h-24 text-sm" />
            </FieldRow>
          </div>
        </SectionCard>

        {/* Tone */}
        <SectionCard icon={Palette} title="Tone, Style & Visuals">
          <div className="space-y-4">
            <FieldRow label="Tone & Style">
              <Textarea placeholder="Mood, register, pacing — how does the show feel? (e.g. Tense, darkly funny, elegiac)" value={s.toneAndStyle} onChange={e => set("toneAndStyle", e.target.value)} className="h-20 text-sm" />
            </FieldRow>
            <FieldRow label="Visual Language">
              <Textarea placeholder="Camera style, color palette, cinematographic references (e.g. Handheld verité, deep shadows, golden-hour nostalgia)" value={s.visualStyle} onChange={e => set("visualStyle", e.target.value)} className="h-20 text-sm" />
            </FieldRow>
          </div>
        </SectionCard>

        {/* Production */}
        <SectionCard icon={Target} title="Target & Distribution">
          <div className="space-y-4">
            <FieldRow label="Target Audience">
              <Input placeholder="e.g. Adults 25–54, prestige drama viewers, fans of The Wire / Succession" value={s.targetAudience} onChange={e => set("targetAudience", e.target.value)} className="h-9 text-sm" />
            </FieldRow>
            <FieldRow label="Network / Platform Fit">
              <Input placeholder="e.g. HBO, Netflix, A24 / Apple TV+, AMC" value={s.networkFit} onChange={e => set("networkFit", e.target.value)} className="h-9 text-sm" />
            </FieldRow>
          </div>
        </SectionCard>

        {/* Pilot */}
        <SectionCard icon={Clapperboard} title="Pilot Blueprint">
          <div className="space-y-4">
            <FieldRow label="Cold Open">
              <Textarea placeholder="How does the pilot open? What's the hook in the first 3 minutes?" value={s.pilotColdOpen} onChange={e => set("pilotColdOpen", e.target.value)} className="h-20 text-sm" />
            </FieldRow>
            <FieldRow label="Pilot Overview">
              <Textarea placeholder="What happens in the pilot? What world do we enter, what's the inciting incident, what question are we left with?" value={s.pilotOverview} onChange={e => set("pilotOverview", e.target.value)} className="h-24 text-sm" />
            </FieldRow>
            <FieldRow label="Ending Hook">
              <Textarea placeholder="What revelation or cliffhanger ends the pilot and demands episode 2?" value={s.pilotEndingHook} onChange={e => set("pilotEndingHook", e.target.value)} className="h-16 text-sm" />
            </FieldRow>
          </div>
        </SectionCard>
      </div>
    );
  }

  // ── Main Component ─────────────────────────────────────────────────────────────

  export default function SeriesBible() {
    const [, setLocation] = useLocation();

    const [series, setSeries] = useState<Series[]>(() => {
      try {
        const raw = JSON.parse(localStorage.getItem("virelle_series") ?? "[]");
        // Migrate legacy items
        return raw.map((s: any) => ({
          ...DEFAULT_SERIES(), ...s,
          genres: s.genres ?? (s.genre ? [s.genre] : []),
          characters: s.characters ?? [],
          seasons: (s.seasons ?? []).map((ss: any) => ({
            ...ss,
            premise: ss.premise ?? "",
            arc: ss.arc ?? "",
            episodes: (ss.episodes ?? []).map((ep: any) => ({
              ...ep, coldOpen: ep.coldOpen ?? "", status: ep.status ?? "treatment",
            })),
          })),
        }));
      } catch { return []; }
    });

    const [activeSeries, setActiveSeries] = useState<Series | null>(null);
    const [editingSeries, setEditingSeries] = useState<Series | null>(null);
    const [editingChar, setEditingChar] = useState<CharacterProfile | null>(null);
    const [addingChar, setAddingChar] = useState(false);
    const [editingEpisode, setEditingEpisode] = useState<{ seasonId: string; ep: Episode } | null>(null);

    const persist = (next: Series[]) => { setSeries(next); localStorage.setItem("virelle_series", JSON.stringify(next)); };

    const save = (s: Series) => {
      const next = series.find(x => x.id === s.id) ? series.map(x => x.id === s.id ? s : x) : [...series, s];
      persist(next);
      setActiveSeries(s);
      setEditingSeries(null);
      toast.success("Series bible saved");
    };

    const deleteSeries = (id: string) => { persist(series.filter(s => s.id !== id)); if (activeSeries?.id === id) setActiveSeries(null); toast.success("Series deleted"); };

    const saveChar = (c: CharacterProfile) => {
      if (!activeSeries) return;
      const chars = activeSeries.characters.find(x => x.id === c.id)
        ? activeSeries.characters.map(x => x.id === c.id ? c : x)
        : [...activeSeries.characters, c];
      save({ ...activeSeries, characters: chars });
      setEditingChar(null);
      setAddingChar(false);
    };

    const deleteChar = (id: string) => {
      if (!activeSeries) return;
      save({ ...activeSeries, characters: activeSeries.characters.filter(c => c.id !== id) });
    };

    const addSeason = () => {
      if (!activeSeries) return;
      save({ ...activeSeries, seasons: [...activeSeries.seasons, { id: Date.now().toString(), number: activeSeries.seasons.length + 1, premise: "", arc: "", episodes: [] }] });
    };

    const addEpisode = (seasonId: string) => {
      if (!activeSeries) return;
      const season = activeSeries.seasons.find(s => s.id === seasonId);
      if (!season) return;
      const ep: Episode = { id: Date.now().toString(), number: season.episodes.length + 1, title: "", logline: "", coldOpen: "", status: "treatment" };
      const updated = { ...activeSeries, seasons: activeSeries.seasons.map(s => s.id === seasonId ? { ...s, episodes: [...s.episodes, ep] } : s) };
      save(updated);
      setEditingEpisode({ seasonId, ep });
    };

    const saveEpisode = (seasonId: string, ep: Episode) => {
      if (!activeSeries) return;
      save({ ...activeSeries, seasons: activeSeries.seasons.map(s => s.id === seasonId ? { ...s, episodes: s.episodes.map(e => e.id === ep.id ? ep : e) } : s) });
      setEditingEpisode(null);
    };

    const deleteEpisode = (seasonId: string, epId: string) => {
      if (!activeSeries) return;
      save({ ...activeSeries, seasons: activeSeries.seasons.map(s => s.id === seasonId ? { ...s, episodes: s.episodes.filter(e => e.id !== epId) } : s) });
    };

    const totalSeasons  = series.reduce((t, s) => t + s.seasons.length, 0);
    const totalEpisodes = series.reduce((t, s) => t + s.seasons.reduce((tt, ss) => tt + ss.episodes.length, 0), 0);

    // ── EDITING FORM ──
    if (editingSeries) return <SeriesForm initial={editingSeries} onSave={save} onCancel={() => setEditingSeries(null)} />;

    // ── DETAIL VIEW ──
    if (activeSeries) {
      const allEps = activeSeries.seasons.reduce((t, s) => t + s.episodes.length, 0);
      const lockedEps = activeSeries.seasons.reduce((t, s) => t + s.episodes.filter(e => e.status === "locked" || e.status === "produced").length, 0);

      return (
        <div className="max-w-4xl mx-auto space-y-6 py-6">
          {/* Page Header */}
          <div className="flex items-start gap-3 flex-wrap">
            <Button variant="ghost" size="sm" onClick={() => setActiveSeries(null)}>
              <ChevronRight className="h-4 w-4 rotate-180 mr-1" />All Series
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-gold-shimmer tracking-tight">{activeSeries.title}</h1>
              {activeSeries.tagline && <p className="text-sm text-muted-foreground italic mt-0.5">"{activeSeries.tagline}"</p>}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge variant="outline" className="border-amber-500/30 text-amber-400/80 text-[11px]">{activeSeries.format}</Badge>
                {activeSeries.genres.map(g => <Badge key={g} variant="outline" className="text-[11px]">{g}</Badge>)}
                {activeSeries.episodeRuntime && <Badge variant="outline" className="text-[11px]">{activeSeries.episodeRuntime}</Badge>}
                <span className="text-xs text-muted-foreground">{activeSeries.seasons.length} Season{activeSeries.seasons.length !== 1 ? "s" : ""} · {allEps} Episode{allEps !== 1 ? "s" : ""}</span>
                {lockedEps > 0 && <span className="text-[10px] bg-green-500/15 text-green-400 px-2 py-0.5 rounded-full">{lockedEps} locked/produced</span>}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="border-amber-500/20 hover:border-amber-500/40" onClick={() => exportJSON(activeSeries)}>
                <FileJson className="h-3.5 w-3.5 mr-1" />Export
              </Button>
              <Button className="gold-button" size="sm" onClick={() => setEditingSeries(activeSeries)}>
                <Edit2 className="h-3.5 w-3.5 mr-1" />Edit Bible
              </Button>
            </div>
          </div>

          <Tabs defaultValue="overview">
            <TabsList className="grid w-full grid-cols-5 h-auto">
              {[
                { value: "overview",    label: "Overview",    icon: BookOpen },
                { value: "world",       label: "World",       icon: Globe },
                { value: "characters",  label: "Characters",  icon: Users },
                { value: "episodes",    label: "Episodes",    icon: Layers },
                { value: "pilot",       label: "Pilot",       icon: Clapperboard },
              ].map(({ value, label, icon: Icon }) => (
                <TabsTrigger key={value} value={value} className="text-xs gap-1.5 py-2 data-[state=active]:text-amber-400">
                  <Icon className="h-3.5 w-3.5" />{label}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* ── OVERVIEW ── */}
            <TabsContent value="overview" className="space-y-4 mt-5">
              {activeSeries.logline && (
                <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
                  <p className="text-base font-medium text-center italic text-amber-100/90 leading-relaxed">"{activeSeries.logline}"</p>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {activeSeries.premise && (
                  <SectionCard icon={Film} title="Premise">
                    <ReadText value={activeSeries.premise} placeholder="No premise yet." />
                  </SectionCard>
                )}
                {activeSeries.thesis && (
                  <SectionCard icon={Star} title="Thematic Thesis">
                    <ReadText value={activeSeries.thesis} placeholder="No thesis yet." />
                  </SectionCard>
                )}
              </div>
              {activeSeries.comparables && (
                <SectionCard icon={Target} title="Comparable Shows">
                  <p className="text-sm text-amber-300/80 font-medium">{activeSeries.comparables}</p>
                </SectionCard>
              )}
              {(activeSeries.targetAudience || activeSeries.networkFit) && (
                <SectionCard icon={Compass} title="Target & Distribution">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {activeSeries.targetAudience && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold mb-1">Target Audience</p>
                        <ReadText value={activeSeries.targetAudience} placeholder="" />
                      </div>
                    )}
                    {activeSeries.networkFit && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold mb-1">Platform Fit</p>
                        <ReadText value={activeSeries.networkFit} placeholder="" />
                      </div>
                    )}
                  </div>
                </SectionCard>
              )}
            </TabsContent>

            {/* ── WORLD ── */}
            <TabsContent value="world" className="space-y-4 mt-5">
              {(activeSeries.timePeriod || activeSeries.setting) && (
                <div className="grid grid-cols-2 gap-3">
                  {activeSeries.timePeriod && (
                    <div className="p-3 rounded-xl border border-amber-500/10 bg-card/40 text-center">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold mb-1">Time Period</p>
                      <p className="text-sm text-amber-300/80 font-medium">{activeSeries.timePeriod}</p>
                    </div>
                  )}
                  {activeSeries.setting && (
                    <div className="p-3 rounded-xl border border-amber-500/10 bg-card/40 text-center">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold mb-1">Setting</p>
                      <p className="text-sm text-amber-300/80 font-medium">{activeSeries.setting}</p>
                    </div>
                  )}
                </div>
              )}
              <SectionCard icon={Globe} title="World Building">
                <ReadText value={activeSeries.worldBuilding} placeholder="No world building notes yet. Edit the bible to add them." />
              </SectionCard>
              {(activeSeries.toneAndStyle || activeSeries.visualStyle) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {activeSeries.toneAndStyle && (
                    <SectionCard icon={Eye} title="Tone & Style">
                      <ReadText value={activeSeries.toneAndStyle} placeholder="" />
                    </SectionCard>
                  )}
                  {activeSeries.visualStyle && (
                    <SectionCard icon={Palette} title="Visual Language">
                      <ReadText value={activeSeries.visualStyle} placeholder="" />
                    </SectionCard>
                  )}
                </div>
              )}
            </TabsContent>

            {/* ── CHARACTERS ── */}
            <TabsContent value="characters" className="mt-5">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">{activeSeries.characters.length} character{activeSeries.characters.length !== 1 ? "s" : ""} in this bible</p>
                  <Button size="sm" className="gold-button" onClick={() => { setAddingChar(true); setEditingChar(null); }}>
                    <Plus className="h-3.5 w-3.5 mr-1" />Add Character
                  </Button>
                </div>
                {addingChar && (
                  <CharacterEditor
                    initial={DEFAULT_CHARACTER()}
                    onSave={saveChar}
                    onCancel={() => setAddingChar(false)}
                  />
                )}
                {activeSeries.characters.map(char =>
                  editingChar?.id === char.id ? (
                    <CharacterEditor key={char.id} initial={char} onSave={saveChar} onCancel={() => setEditingChar(null)} />
                  ) : (
                    <CharacterCard key={char.id} char={char} onEdit={() => { setEditingChar(char); setAddingChar(false); }} onDelete={() => deleteChar(char.id)} />
                  )
                )}
                {activeSeries.characters.length === 0 && !addingChar && (
                  <div className="text-center py-12 border border-dashed border-amber-500/10 rounded-xl">
                    <Users className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No characters yet</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Build your ensemble — every great show starts with unforgettable people.</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ── EPISODES ── */}
            <TabsContent value="episodes" className="space-y-6 mt-5">
              {activeSeries.seasons.map(season => (
                <div key={season.id} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold flex items-center gap-2 gradient-text-gold text-sm">
                        <Layers className="h-4 w-4 text-amber-400" />
                        Season {season.number}
                        <span className="text-xs text-muted-foreground font-normal">({season.episodes.length} ep{season.episodes.length !== 1 ? "s" : ""})</span>
                      </h3>
                      {season.premise && <p className="text-xs text-muted-foreground mt-0.5 italic">{season.premise}</p>}
                      {season.arc && <p className="text-xs text-muted-foreground/60 mt-0.5">{season.arc}</p>}
                    </div>
                    <Button variant="outline" size="sm" className="border-amber-500/20 hover:border-amber-500/40 text-xs" onClick={() => addEpisode(season.id)}>
                      <Plus className="h-3.5 w-3.5 mr-1" />Add Episode
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {season.episodes.map(ep => (
                      <Card key={ep.id} className="hover:border-amber-500/20 transition-colors glass-card shadow-lg shadow-amber-500/5">
                        <CardContent className="p-3 flex items-start gap-3">
                          <span className="text-[11px] font-bold text-amber-400 bg-amber-400/10 rounded px-1.5 py-0.5 shrink-0 font-mono">
                            S{season.number}E{ep.number}
                          </span>
                          <div className="flex-1 min-w-0">
                            {editingEpisode?.ep.id === ep.id ? (
                              <div className="space-y-2">
                                <Input placeholder="Episode title" value={editingEpisode.ep.title} onChange={e => setEditingEpisode(prev => prev ? { ...prev, ep: { ...prev.ep, title: e.target.value } } : null)} className="h-7 text-sm" />
                                <Textarea placeholder="Episode logline…" value={editingEpisode.ep.logline} onChange={e => setEditingEpisode(prev => prev ? { ...prev, ep: { ...prev.ep, logline: e.target.value } } : null)} className="h-16 text-xs" />
                                <Textarea placeholder="Cold open / teaser…" value={editingEpisode.ep.coldOpen ?? ""} onChange={e => setEditingEpisode(prev => prev ? { ...prev, ep: { ...prev.ep, coldOpen: e.target.value } } : null)} className="h-12 text-xs" />
                                <div className="flex gap-2 items-center flex-wrap">
                                  <Select value={editingEpisode.ep.status} onValueChange={v => setEditingEpisode(prev => prev ? { ...prev, ep: { ...prev.ep, status: v as Episode["status"] } } : null)}>
                                    <SelectTrigger className="h-7 text-xs w-32"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      {STATUS_ORDER.map(s => <SelectItem key={s} value={s} className="text-xs capitalize">{s}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                  <Button size="sm" className="h-7 text-xs gold-button" onClick={() => saveEpisode(season.id, editingEpisode.ep)}>
                                    <Save className="h-3 w-3 mr-1" />Save
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditingEpisode(null)}><X className="h-3 w-3" /></Button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium text-sm">{ep.title || "(Untitled)"}</span>
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded capitalize font-medium ${STATUS_COLORS[ep.status]}`}>{ep.status}</span>
                                </div>
                                {ep.logline && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 italic">{ep.logline}</p>}
                                {ep.coldOpen && <p className="text-[10px] text-muted-foreground/50 mt-0.5 line-clamp-1">Open: {ep.coldOpen}</p>}
                              </>
                            )}
                          </div>
                          {editingEpisode?.ep.id !== ep.id && (
                            <div className="flex gap-1 shrink-0">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingEpisode({ seasonId: season.id, ep: { ...ep } })}><Edit2 className="h-3 w-3" /></Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteEpisode(season.id, ep.id)}><Trash2 className="h-3 w-3" /></Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                    {season.episodes.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-4 border border-dashed border-amber-500/10 rounded-lg">No episodes yet</p>
                    )}
                  </div>
                </div>
              ))}
              <Button variant="ghost" size="sm" className="text-xs text-amber-400/60 hover:text-amber-400" onClick={addSeason}>
                <Plus className="h-3.5 w-3.5 mr-1" />Add Season {activeSeries.seasons.length + 1}
              </Button>
            </TabsContent>

            {/* ── PILOT ── */}
            <TabsContent value="pilot" className="space-y-4 mt-5">
              {activeSeries.pilotColdOpen && (
                <SectionCard icon={PlayCircle} title="Cold Open">
                  <ReadText value={activeSeries.pilotColdOpen} placeholder="" />
                </SectionCard>
              )}
              <SectionCard icon={Clapperboard} title="Pilot Overview">
                <ReadText value={activeSeries.pilotOverview} placeholder="No pilot overview yet. Edit the bible to add one." />
              </SectionCard>
              {activeSeries.pilotEndingHook && (
                <SectionCard icon={Zap} title="Ending Hook">
                  <ReadText value={activeSeries.pilotEndingHook} placeholder="" />
                </SectionCard>
              )}
              {!activeSeries.pilotOverview && !activeSeries.pilotColdOpen && !activeSeries.pilotEndingHook && (
                <div className="text-center py-12 border border-dashed border-amber-500/10 rounded-xl">
                  <Clapperboard className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No pilot blueprint yet</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">A great pilot sells the whole series. Edit the bible to write yours.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      );
    }

    // ── LIST VIEW ──
    return (
      <div className="max-w-4xl mx-auto space-y-8 py-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold gradient-text-gold tracking-tight flex items-center gap-2">
              <Tv className="h-6 w-6 text-amber-400" />Series Bibles
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Your complete series development workspace — from logline to locked episode.</p>
          </div>
          <Button className="gold-button" onClick={() => setEditingSeries(DEFAULT_SERIES())}>
            <Plus className="h-4 w-4 mr-1.5" />New Bible
          </Button>
        </div>

        {/* Stats */}
        {series.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Series", value: series.length, icon: Tv },
              { label: "Seasons", value: totalSeasons, icon: Layers },
              { label: "Episodes", value: totalEpisodes, icon: Film },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="p-4 rounded-xl border border-amber-500/10 bg-card/40 text-center">
                <Icon className="h-5 w-5 text-amber-400/60 mx-auto mb-1.5" />
                <p className="text-xl font-bold text-amber-400">{value}</p>
                <p className="text-[11px] text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Series Cards */}
        <div className="space-y-3">
          {series.map(s => {
            const eps = s.seasons.reduce((t, ss) => t + ss.episodes.length, 0);
            const locked = s.seasons.reduce((t, ss) => t + ss.episodes.filter(e => e.status === "locked" || e.status === "produced").length, 0);
            return (
              <Card key={s.id}
                className="glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 hover:border-amber-500/25 transition-all cursor-pointer border-amber-500/10 group"
                onClick={() => setActiveSeries(s)}>
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-700/5 border border-amber-500/20 flex items-center justify-center shrink-0">
                    <Tv className="h-5 w-5 text-amber-400/70" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm group-hover:text-amber-400/90 transition-colors">{s.title || "(Untitled)"}</span>
                      <Badge variant="outline" className="text-[10px] border-amber-500/20 text-amber-400/70">{s.format}</Badge>
                      {s.genres.slice(0,2).map(g => <Badge key={g} variant="outline" className="text-[10px]">{g}</Badge>)}
                    </div>
                    {s.tagline && <p className="text-xs text-muted-foreground italic mt-0.5 truncate">"{s.tagline}"</p>}
                    {s.logline && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{s.logline}</p>}
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground/60">
                      <span>{s.seasons.length} season{s.seasons.length !== 1 ? "s" : ""}</span>
                      <span>·</span>
                      <span>{eps} episode{eps !== 1 ? "s" : ""}</span>
                      <span>·</span>
                      <span>{s.characters.length} character{s.characters.length !== 1 ? "s" : ""}</span>
                      {locked > 0 && <><span>·</span><span className="text-green-400">{locked} locked</span></>}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity" onClick={e => { e.stopPropagation(); exportJSON(s); }}>
                      <FileJson className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity hover:text-destructive" onClick={e => { e.stopPropagation(); deleteSeries(s.id); }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/40 self-center group-hover:text-amber-400/60 transition-colors" />
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {series.length === 0 && (
            <div className="text-center py-20 border border-dashed border-amber-500/10 rounded-2xl">
              <Tv className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground/60 mb-2">No series bibles yet</h3>
              <p className="text-sm text-muted-foreground/40 mb-6 max-w-sm mx-auto">
                Every prestige series starts with a bible. Document your universe — characters, seasons, and pilot blueprint — in one place.
              </p>
              <Button className="gold-button" onClick={() => setEditingSeries(DEFAULT_SERIES())}>
                <Plus className="h-4 w-4 mr-1.5" />Create Your First Bible
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }
  