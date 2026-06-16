import { useState } from "react";
  import { useLocation } from "wouter";
  import { Tv, Plus, ChevronRight, Trash2, Edit2, Film, BookOpen, Save, X, Users, Globe, Layers, Download, BarChart3, FileJson } from "lucide-react";
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

  interface Episode {
    id: string;
    number: number;
    title: string;
    logline: string;
    status: "outline" | "draft" | "locked";
  }

  interface Season {
    id: string;
    number: number;
    arc: string;
    episodes: Episode[];
  }

  interface Series {
    id: string;
    title: string;
    format: string;
    genre: string;
    logline: string;
    premise: string;
    worldBuilding: string;
    mainCharacters: string;
    toneAndStyle: string;
    seasons: Season[];
  }

  const FORMATS = ["Drama Series","Comedy Series","Limited Series","Anthology","Docuseries","Animation","Web Series","Mini-Series"];
  const GENRES  = ["Drama","Comedy","Thriller","Sci-Fi","Horror","Fantasy","Crime","Romance","Documentary","Action","Mystery"];
  const EPISODE_STATUS_COLOR: Record<string, string> = {
    outline: "bg-muted text-muted-foreground",
    draft:   "bg-amber-400/20 text-amber-400",
    locked:  "bg-green-500/20 text-green-600",
  };

  const DEFAULT_SERIES: Series = {
    id: "1", title: "", format: "Drama Series", genre: "Drama",
    logline: "", premise: "", worldBuilding: "", mainCharacters: "", toneAndStyle: "",
    seasons: [{ id: "s1", number: 1, arc: "", episodes: [{ id: "e1", number: 1, title: "", logline: "", status: "outline" }] }],
  };

  function exportSeriesJSON(s: Series) {
    const blob = new Blob([JSON.stringify(s, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `${s.title.replace(/\s+/g, "-").toLowerCase()}-bible.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Series bible exported as JSON");
  }

  function exportAllSeriesJSON(all: Series[]) {
    const blob = new Blob([JSON.stringify(all, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = "virelle-series-bibles.json";
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${all.length} series exported`);
  }

  export default function SeriesBible() {
    const [, setLocation] = useLocation();
    const [series, setSeries] = useState<Series[]>(() => {
      try { return JSON.parse(localStorage.getItem("virelle_series") ?? "[]"); } catch { return []; }
    });
    const [activeSeries, setActiveSeries]   = useState<Series | null>(null);
    const [editingSeries, setEditingSeries] = useState<Series | null>(null);
    const [editingEpisode, setEditingEpisode] = useState<{ seasonId: string; ep: Episode } | null>(null);

    const persist = (next: Series[]) => {
      setSeries(next);
      localStorage.setItem("virelle_series", JSON.stringify(next));
    };

    const save = (s: Series) => {
      const next = series.find(x => x.id === s.id)
        ? series.map(x => x.id === s.id ? s : x)
        : [...series, s];
      persist(next);
      setActiveSeries(s);
      setEditingSeries(null);
      toast.success("Series bible saved");
    };

    const deleteSeries = (id: string) => {
      persist(series.filter(s => s.id !== id));
      if (activeSeries?.id === id) setActiveSeries(null);
      toast.success("Series deleted");
    };

    const addSeason = () => {
      if (!activeSeries) return;
      const next: Season = { id: Date.now().toString(), number: activeSeries.seasons.length + 1, arc: "", episodes: [] };
      save({ ...activeSeries, seasons: [...activeSeries.seasons, next] });
    };

    const addEpisode = (seasonId: string) => {
      if (!activeSeries) return;
      const season = activeSeries.seasons.find(s => s.id === seasonId);
      if (!season) return;
      const ep: Episode = { id: Date.now().toString(), number: season.episodes.length + 1, title: "", logline: "", status: "outline" };
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

    // ── Series detail view ────────────────────────────────────────────────────────
    if (activeSeries && !editingSeries) {
      const eps = activeSeries.seasons.reduce((t, s) => t + s.episodes.length, 0);
      const locked = activeSeries.seasons.reduce((t, s) => t + s.episodes.filter(e => e.status === "locked").length, 0);
      return (
        <div className="max-w-5xl mx-auto space-y-6 py-6">
          <div className="flex items-center gap-3 flex-wrap">
            <Button variant="ghost" size="sm" onClick={() => setActiveSeries(null)}>
              <ChevronRight className="h-4 w-4 rotate-180 mr-1" />All Series
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold truncate text-gold-shimmer">{activeSeries.title}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge variant="outline">{activeSeries.format}</Badge>
                <Badge variant="outline">{activeSeries.genre}</Badge>
                <span className="text-xs text-muted-foreground">{activeSeries.seasons.length} season{activeSeries.seasons.length !== 1 ? "s" : ""} · {eps} episode{eps !== 1 ? "s" : ""}</span>
                {locked > 0 && <Badge className="bg-green-500/20 text-green-600 border-none text-[10px]">{locked} locked</Badge>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => exportSeriesJSON(activeSeries)}>
                <FileJson className="h-3.5 w-3.5 mr-1" />Export
              </Button>
              <Button variant="outline" size="sm" onClick={() => setEditingSeries(activeSeries)}>
                <Edit2 className="h-3.5 w-3.5 mr-1" />Edit Bible
              </Button>
            </div>
          </div>

          <Tabs defaultValue="overview">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview"  className="data-[state=active]:text-amber-400">Overview</TabsTrigger>
              <TabsTrigger value="world"     className="data-[state=active]:text-amber-400">World</TabsTrigger>
              <TabsTrigger value="characters"className="data-[state=active]:text-amber-400">Characters</TabsTrigger>
              <TabsTrigger value="episodes"  className="data-[state=active]:text-amber-400">Episodes</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 mt-4">
              <Card className="glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
                <CardContent className="p-4">
                  {activeSeries.logline && <p className="text-sm italic text-muted-foreground mb-3">"{activeSeries.logline}"</p>}
                  {activeSeries.premise && <><Separator className="mb-3" /><p className="text-sm text-muted-foreground">{activeSeries.premise}</p></>}
                </CardContent>
              </Card>
              {activeSeries.toneAndStyle && (
                <Card className="glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
                  <CardHeader><CardTitle className="text-sm gradient-text-gold">Tone & Style</CardTitle></CardHeader>
                  <CardContent><p className="text-sm text-muted-foreground">{activeSeries.toneAndStyle}</p></CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="world" className="mt-4">
              <Card className="glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
                <CardHeader><CardTitle className="text-sm flex items-center gap-2 gradient-text-gold"><Globe className="h-4 w-4 text-amber-400" />World Building</CardTitle></CardHeader>
                <CardContent><p className="text-sm text-muted-foreground whitespace-pre-wrap">{activeSeries.worldBuilding || "No world building notes yet. Edit the bible to add them."}</p></CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="characters" className="mt-4">
              <Card className="glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
                <CardHeader><CardTitle className="text-sm flex items-center gap-2 gradient-text-gold"><Users className="h-4 w-4 text-amber-400" />Main Characters</CardTitle></CardHeader>
                <CardContent><p className="text-sm text-muted-foreground whitespace-pre-wrap">{activeSeries.mainCharacters || "No character notes yet. Edit the bible to add them."}</p></CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="episodes" className="space-y-4 mt-4">
              {activeSeries.seasons.map(season => (
                <div key={season.id}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold flex items-center gap-2 gradient-text-gold">
                      <Layers className="h-4 w-4 text-amber-400" />Season {season.number}
                      <span className="text-xs text-muted-foreground font-normal">({season.episodes.length} episodes)</span>
                    </h3>
                    <Button variant="outline" size="sm" onClick={() => addEpisode(season.id)}>
                      <Plus className="h-3.5 w-3.5 mr-1" />Add Episode
                    </Button>
                  </div>
                  {season.arc && <p className="text-xs text-muted-foreground mb-3 italic">{season.arc}</p>}
                  <div className="space-y-2">
                    {season.episodes.map(ep => (
                      <Card key={ep.id} className="hover:border-primary/30 transition-colors glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20">
                        <CardContent className="p-3 flex items-start gap-3">
                          <span className="text-xs font-bold text-amber-400 bg-amber-400/10 rounded px-1.5 py-0.5 shrink-0">
                            S{season.number}E{ep.number}
                          </span>
                          <div className="flex-1 min-w-0">
                            {editingEpisode?.ep.id === ep.id ? (
                              <div className="space-y-2">
                                <Input placeholder="Episode title" value={editingEpisode.ep.title}
                                  onChange={e => setEditingEpisode(prev => prev ? { ...prev, ep: { ...prev.ep, title: e.target.value } } : null)}
                                  className="h-7 text-sm" />
                                <Textarea placeholder="Episode logline…" value={editingEpisode.ep.logline}
                                  onChange={e => setEditingEpisode(prev => prev ? { ...prev, ep: { ...prev.ep, logline: e.target.value } } : null)}
                                  className="h-16 text-xs" />
                                <div className="flex gap-2 items-center">
                                  <Select value={editingEpisode.ep.status}
                                    onValueChange={v => setEditingEpisode(prev => prev ? { ...prev, ep: { ...prev.ep, status: v as any } } : null)}>
                                    <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      {(["outline","draft","locked"] as const).map(s => <SelectItem key={s} value={s} className="text-xs capitalize">{s}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                  <Button size="sm" className="h-7 text-xs" onClick={() => saveEpisode(season.id, editingEpisode.ep)}>
                                    <Save className="h-3 w-3 mr-1" />Save
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditingEpisode(null)}>
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm">{ep.title || "(Untitled)"}</span>
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded capitalize ${EPISODE_STATUS_COLOR[ep.status]}`}>{ep.status}</span>
                                </div>
                                {ep.logline && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{ep.logline}</p>}
                              </>
                            )}
                          </div>
                          {editingEpisode?.ep.id !== ep.id && (
                            <div className="flex gap-1 shrink-0">
                              <Button variant="ghost" size="icon" className="h-7 w-7"
                                onClick={() => setEditingEpisode({ seasonId: season.id, ep: { ...ep } })}>
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => deleteEpisode(season.id, ep.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                    {season.episodes.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-4 border border-dashed border-amber-500/10 rounded-lg">
                        No episodes yet — add the first one
                      </p>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" className="mt-3 text-xs text-amber-400/60 hover:text-amber-400" onClick={addSeason}>
                    + Add Season {activeSeries.seasons.length + 1}
                  </Button>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </div>
      );
    }

    // ── Edit / Create form ────────────────────────────────────────────────────────
    const form  = editingSeries ?? DEFAULT_SERIES;
    const isNew = !series.find(s => s.id === form.id);

    if (editingSeries || (!activeSeries && series.length === 0)) {
      return (
        <div className="max-w-3xl mx-auto space-y-6 py-6">
          <div className="flex items-center gap-3">
            {series.length > 0 && (
              <Button variant="ghost" size="icon"
                onClick={() => { setEditingSeries(null); setActiveSeries(activeSeries); }}>
                <ChevronRight className="h-4 w-4 rotate-180" />
              </Button>
            )}
            <h1 className="text-2xl font-bold flex items-center gap-2 text-gold-shimmer">
              <Tv className="h-6 w-6 text-amber-400" />
              {isNew ? "New Series Bible" : "Edit Series Bible"}
            </h1>
          </div>

          <div className="glass-card rounded-xl border border-amber-500/20 p-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2 space-y-1.5">
                <Label>Series Title <span className="text-amber-400">*</span></Label>
                <Input placeholder="My Series Title" value={form.title}
                  onChange={e => setEditingSeries(p => ({ ...(p ?? form), title: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Format</Label>
                <Select value={form.format} onValueChange={v => setEditingSeries(p => ({ ...(p ?? form), format: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{FORMATS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Genre</Label>
                <Select value={form.genre} onValueChange={v => setEditingSeries(p => ({ ...(p ?? form), genre: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{GENRES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label>Logline</Label>
                <Textarea className="h-16 focus:ring-amber-500/30 focus:border-amber-500/50"
                  placeholder="One-sentence description of the series…" value={form.logline}
                  onChange={e => setEditingSeries(p => ({ ...(p ?? form), logline: e.target.value }))} />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label>Premise</Label>
                <Textarea className="h-24 focus:ring-amber-500/30 focus:border-amber-500/50"
                  placeholder="Central concept, conflict, and world of the series…" value={form.premise}
                  onChange={e => setEditingSeries(p => ({ ...(p ?? form), premise: e.target.value }))} />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label>World Building</Label>
                <Textarea className="h-24 focus:ring-amber-500/30 focus:border-amber-500/50"
                  placeholder="Setting, rules, history, and atmosphere…" value={form.worldBuilding}
                  onChange={e => setEditingSeries(p => ({ ...(p ?? form), worldBuilding: e.target.value }))} />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label>Main Characters</Label>
                <Textarea className="h-24 focus:ring-amber-500/30 focus:border-amber-500/50"
                  placeholder="Central characters and their arcs across the series…" value={form.mainCharacters}
                  onChange={e => setEditingSeries(p => ({ ...(p ?? form), mainCharacters: e.target.value }))} />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label>Tone & Style</Label>
                <Textarea className="h-20 focus:ring-amber-500/30 focus:border-amber-500/50"
                  placeholder="Visual language, pacing, tone, comparable shows…" value={form.toneAndStyle}
                  onChange={e => setEditingSeries(p => ({ ...(p ?? form), toneAndStyle: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button className="flex-1 bg-amber-600 hover:bg-amber-500 text-black font-bold"
                onClick={() => {
                  if (!form.title.trim()) { toast.error("Title is required"); return; }
                  save({ ...form, id: form.id || Date.now().toString() });
                }}>
                <Save className="h-4 w-4 mr-2" />Save Bible
              </Button>
              {(series.length > 0 || activeSeries) && (
                <Button variant="outline" onClick={() => setEditingSeries(null)}>Cancel</Button>
              )}
            </div>
          </div>
        </div>
      );
    }

    // ── Series list view ──────────────────────────────────────────────────────────
    return (
      <div className="max-w-5xl mx-auto space-y-6 py-6">
        {/* Page header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2.5 text-gold-shimmer">
              <Tv className="h-6 w-6 text-amber-400" />Series Bible
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Develop and manage your episodic TV & streaming projects</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {series.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => exportAllSeriesJSON(series)}>
                <FileJson className="h-3.5 w-3.5 mr-1.5" />Export All
              </Button>
            )}
            <Button className="bg-amber-600 hover:bg-amber-500 text-black font-bold"
              onClick={() => setEditingSeries({ ...DEFAULT_SERIES, id: Date.now().toString(), seasons: [{ id: Date.now().toString(), number: 1, arc: "", episodes: [] }] })}>
              <Plus className="h-4 w-4 mr-2" />New Series
            </Button>
          </div>
        </div>

        {/* Stats strip */}
        {series.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Series", value: series.length, icon: Tv },
              { label: "Seasons", value: totalSeasons, icon: Layers },
              { label: "Episodes", value: totalEpisodes, icon: Film },
            ].map(s => (
              <div key={s.label} className="glass-card rounded-xl border border-amber-500/10 p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                  <s.icon className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <p className="text-xl font-black text-white">{s.value}</p>
                  <p className="text-[10px] text-white/40 uppercase tracking-wider">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Series cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {series.map(s => {
            const totalEps = s.seasons.reduce((t, season) => t + season.episodes.length, 0);
            const locked   = s.seasons.reduce((t, season) => t + season.episodes.filter(e => e.status === "locked").length, 0);
            return (
              <Card key={s.id}
                className="cursor-pointer hover:border-amber-500/40 transition-all group glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20"
                onClick={() => setActiveSeries(s)}>
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-base truncate group-hover:text-amber-400 transition-colors leading-tight">{s.title}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                      onClick={e => { e.stopPropagation(); deleteSeries(s.id); }}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="outline" className="text-[10px] border-amber-500/20">{s.format}</Badge>
                    <Badge variant="outline" className="text-[10px] border-amber-500/20">{s.genre}</Badge>
                  </div>
                  {s.logline && <p className="text-xs text-muted-foreground line-clamp-2 italic">"{s.logline}"</p>}
                  <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-amber-500/10 pt-3">
                    <span>{s.seasons.length} season{s.seasons.length !== 1 ? "s" : ""} · {totalEps} ep{totalEps !== 1 ? "s" : ""}</span>
                    {locked > 0 && <Badge className="bg-green-500/20 text-green-600 border-none text-[10px]">{locked} locked</Badge>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Empty state */}
        {series.length === 0 && (
          <div className="text-center py-24 border border-dashed border-amber-500/20 rounded-2xl">
            <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Tv className="w-8 h-8 text-amber-400/60" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Start Your Series Bible</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
              Build out your TV series — episodes, seasons, world-building, characters, and tone — all in one place.
            </p>
            <Button className="bg-amber-600 hover:bg-amber-500 text-black font-bold"
              onClick={() => setEditingSeries({ ...DEFAULT_SERIES, id: Date.now().toString(), seasons: [{ id: Date.now().toString(), number: 1, arc: "", episodes: [] }] })}>
              <Plus className="h-4 w-4 mr-2" />Create First Series
            </Button>
          </div>
        )}
      </div>
    );
  }
  