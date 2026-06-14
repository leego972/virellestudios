import { useState } from "react";
  import { useLocation } from "wouter";
  import { Tv, Plus, ChevronRight, Trash2, Edit2, Film, BookOpen, Save, X, Users, Globe, Layers } from "lucide-react";
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
  const GENRES = ["Drama","Comedy","Thriller","Sci-Fi","Horror","Fantasy","Crime","Romance","Documentary","Action","Mystery"];
  const EPISODE_STATUS_COLOR: Record<string, string> = { outline: "bg-muted text-muted-foreground", draft: "bg-primary/20 text-primary", locked: "bg-green-500/20 text-green-600" };

  const DEFAULT_SERIES: Series = {
    id: "1", title: "", format: "Drama Series", genre: "Drama",
    logline: "", premise: "", worldBuilding: "", mainCharacters: "", toneAndStyle: "",
    seasons: [{ id: "s1", number: 1, arc: "", episodes: [{ id: "e1", number: 1, title: "", logline: "", status: "outline" }] }],
  };

  export default function SeriesBible() {
    const [, setLocation] = useLocation();
    const [series, setSeries] = useState<Series[]>(() => {
      try { return JSON.parse(localStorage.getItem("virelle_series") ?? "[]"); } catch { return []; }
    });
    const [activeSeries, setActiveSeries] = useState<Series | null>(null);
    const [editingSeries, setEditingSeries] = useState<Series | null>(null);
    const [editingEpisode, setEditingEpisode] = useState<{ seasonId: string; ep: Episode } | null>(null);

    const save = (s: Series) => {
      const next = series.find(x => x.id === s.id) ? series.map(x => x.id === s.id ? s : x) : [...series, s];
      setSeries(next);
      localStorage.setItem("virelle_series", JSON.stringify(next));
      setActiveSeries(s);
      setEditingSeries(null);
      toast.success("Series saved");
    };

    const deleteSeries = (id: string) => {
      const next = series.filter(s => s.id !== id);
      setSeries(next);
      localStorage.setItem("virelle_series", JSON.stringify(next));
      if (activeSeries?.id === id) setActiveSeries(null);
      toast.success("Series deleted");
    };

    const addSeason = () => {
      if (!activeSeries) return;
      const next: Season = { id: Date.now().toString(), number: activeSeries.seasons.length + 1, arc: "", episodes: [] };
      const updated = { ...activeSeries, seasons: [...activeSeries.seasons, next] };
      save(updated);
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
      const updated = { ...activeSeries, seasons: activeSeries.seasons.map(s => s.id === seasonId ? { ...s, episodes: s.episodes.map(e => e.id === ep.id ? ep : e) } : s) };
      save(updated);
      setEditingEpisode(null);
    };

    const deleteEpisode = (seasonId: string, epId: string) => {
      if (!activeSeries) return;
      const updated = { ...activeSeries, seasons: activeSeries.seasons.map(s => s.id === seasonId ? { ...s, episodes: s.episodes.filter(e => e.id !== epId) } : s) };
      save(updated);
    };

    if (activeSeries && !editingSeries) {
      const totalEps = activeSeries.seasons.reduce((t, s) => t + s.episodes.length, 0);
      return (
        <div className="min-h-screen pb-10" style={{ background:"linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)" }}>
      <div className="max-w-5xl mx-auto space-y-6 py-6">
          <div className="flex items-center gap-3 flex-wrap">
            <Button variant="ghost" size="sm" onClick={() => setActiveSeries(null)}><ChevronRight className="h-4 w-4 rotate-180 mr-1" />All Series</Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold truncate gradient-text-gold">{activeSeries.title}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap"><Badge variant="outline">{activeSeries.format}</Badge><Badge variant="outline">{activeSeries.genre}</Badge><span className="text-xs text-muted-foreground">{activeSeries.seasons.length} season{activeSeries.seasons.length !== 1 ? "s" : ""} · {totalEps} episode{totalEps !== 1 ? "s" : ""}</span></div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setEditingSeries(activeSeries)}><Edit2 className="h-3.5 w-3.5 mr-1" />Edit Bible</Button>
          </div>

          <Tabs defaultValue="overview">
            <TabsList className="grid w-full grid-cols-3 sm:grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="world">World</TabsTrigger>
              <TabsTrigger value="characters">Characters</TabsTrigger>
              <TabsTrigger value="episodes">Episodes</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 mt-4">
              <Card><CardContent className="p-4"><p className="text-sm italic text-muted-foreground mb-3">"{activeSeries.logline}"</p>{activeSeries.premise && <><Separator className="mb-3" /><p className="text-sm text-muted-foreground">{activeSeries.premise}</p></>}</CardContent></Card>
              {activeSeries.toneAndStyle && <Card><CardHeader><CardTitle className="text-sm gradient-text-gold">Tone & Style</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">{activeSeries.toneAndStyle}</p></CardContent></Card>}
            </TabsContent>

            <TabsContent value="world" className="mt-4">
              <Card><CardHeader><CardTitle className="text-sm flex items-center gap-2 gradient-text-gold"><Globe className="h-4 w-4 text-primary" />World Building</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground whitespace-pre-wrap">{activeSeries.worldBuilding || "No world building notes yet. Edit the bible to add them."}</p></CardContent></Card>
            </TabsContent>

            <TabsContent value="characters" className="mt-4">
              <Card><CardHeader><CardTitle className="text-sm flex items-center gap-2 gradient-text-gold"><Users className="h-4 w-4 text-primary" />Main Characters</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground whitespace-pre-wrap">{activeSeries.mainCharacters || "No character notes yet. Edit the bible to add them."}</p></CardContent></Card>
            </TabsContent>

            <TabsContent value="episodes" className="space-y-4 mt-4">
              {activeSeries.seasons.map(season => (
                <div key={season.id}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold flex items-center gap-2"><Layers className="h-4 w-4 text-primary" />Season {season.number}</h3>
                    <Button variant="outline" size="sm" onClick={() => addEpisode(season.id)}><Plus className="h-3.5 w-3.5 mr-1" />Add Episode</Button>
                  </div>
                  {season.arc && <p className="text-xs text-muted-foreground mb-3 italic">{season.arc}</p>}
                  <div className="space-y-2">
                    {season.episodes.map(ep => (
                      <Card key={ep.id} className="hover:border-primary/30 transition-colors">
                        <CardContent className="p-3 flex items-start gap-3">
                          <span className="text-xs font-bold text-primary bg-primary/10 rounded px-1.5 py-0.5 shrink-0">S{season.number}E{ep.number}</span>
                          <div className="flex-1 min-w-0">
                            {editingEpisode?.ep.id === ep.id ? (
                              <div className="space-y-2">
                                <Input placeholder="Episode title" value={editingEpisode.ep.title} onChange={e => setEditingEpisode(prev => prev ? { ...prev, ep: { ...prev.ep, title: e.target.value } } : null)} className="h-7 text-sm" />
                                <Textarea placeholder="Episode logline…" value={editingEpisode.ep.logline} onChange={e => setEditingEpisode(prev => prev ? { ...prev, ep: { ...prev.ep, logline: e.target.value } } : null)} className="h-16 text-xs" />
                                <div className="flex gap-2 items-center">
                                  <Select value={editingEpisode.ep.status} onValueChange={v => setEditingEpisode(prev => prev ? { ...prev, ep: { ...prev.ep, status: v as any } } : null)}>
                                    <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
                                    <SelectContent>{(["outline","draft","locked"] as const).map(s => <SelectItem key={s} value={s} className="text-xs capitalize">{s}</SelectItem>)}</SelectContent>
                                  </Select>
                                  <Button size="sm" className="h-7 text-xs" onClick={() => saveEpisode(season.id, editingEpisode.ep)}><Save className="h-3 w-3 mr-1" />Save</Button>
                                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditingEpisode(null)}><X className="h-3 w-3" /></Button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center gap-2"><span className="font-medium text-sm">{ep.title || "(Untitled)"}</span><span className={`text-[10px] px-1.5 py-0.5 rounded capitalize ${EPISODE_STATUS_COLOR[ep.status]}`}>{ep.status}</span></div>
                                {ep.logline && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{ep.logline}</p>}
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
                    {season.episodes.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No episodes yet</p>}
                  </div>
                  <Button variant="ghost" size="sm" className="mt-2 text-xs" onClick={addSeason}>+ Add Season</Button>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </div>
      );
    }

    const form = editingSeries ?? DEFAULT_SERIES;
    const isNew = !series.find(s => s.id === form.id);

    if (editingSeries || (!activeSeries && series.length === 0)) {
      return (
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-center gap-3">
            {series.length > 0 && <Button variant="ghost" size="icon" onClick={() => { setEditingSeries(null); setActiveSeries(activeSeries); }}><ChevronRight className="h-4 w-4 rotate-180" /></Button>}
            <h1 className="text-2xl font-bold flex items-center gap-2 gradient-text-gold"><Tv className="h-6 w-6 text-primary" />{isNew ? "New Series Bible" : "Edit Series Bible"}</h1>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 space-y-1.5"><Label>Series Title *</Label><Input placeholder="My Series Title" value={form.title} onChange={e => setEditingSeries(p => ({ ...(p ?? form), title: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Format</Label><Select value={form.format} onValueChange={v => setEditingSeries(p => ({ ...(p ?? form), format: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{FORMATS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label>Genre</Label><Select value={form.genre} onValueChange={v => setEditingSeries(p => ({ ...(p ?? form), genre: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{GENRES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent></Select></div>
            <div className="sm:col-span-2 space-y-1.5"><Label>Logline</Label><Textarea className="h-16" placeholder="One-sentence description of the series…" value={form.logline} onChange={e => setEditingSeries(p => ({ ...(p ?? form), logline: e.target.value }))} /></div>
            <div className="sm:col-span-2 space-y-1.5"><Label>Premise</Label><Textarea className="h-24" placeholder="Expand on the central concept, conflict, and world of the series…" value={form.premise} onChange={e => setEditingSeries(p => ({ ...(p ?? form), premise: e.target.value }))} /></div>
            <div className="sm:col-span-2 space-y-1.5"><Label>World Building</Label><Textarea className="h-24" placeholder="Setting, rules, history, and atmosphere of the show's world…" value={form.worldBuilding} onChange={e => setEditingSeries(p => ({ ...(p ?? form), worldBuilding: e.target.value }))} /></div>
            <div className="sm:col-span-2 space-y-1.5"><Label>Main Characters</Label><Textarea className="h-24" placeholder="List and describe your central characters and their arcs across the series…" value={form.mainCharacters} onChange={e => setEditingSeries(p => ({ ...(p ?? form), mainCharacters: e.target.value }))} /></div>
            <div className="sm:col-span-2 space-y-1.5"><Label>Tone & Style</Label><Textarea className="h-20" placeholder="Describe the visual language, pacing, tone, and comparable shows…" value={form.toneAndStyle} onChange={e => setEditingSeries(p => ({ ...(p ?? form), toneAndStyle: e.target.value }))} /></div>
          </div>
          <div className="flex gap-3">
            <Button className="flex-1" onClick={() => { if (!form.title.trim()) { toast.error("Title is required"); return; } save({ ...form, id: form.id || Date.now().toString() }); }}><Save className="h-4 w-4 mr-2" />Save Bible</Button>
            {(series.length > 0 || activeSeries) && <Button variant="outline" onClick={() => { setEditingSeries(null); }}>Cancel</Button>}
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2 gradient-text-gold"><Tv className="h-6 w-6 text-primary" />Series Bible</h1>
          <Button onClick={() => setEditingSeries({ ...DEFAULT_SERIES, id: Date.now().toString(), seasons: [{ id: Date.now().toString(), number: 1, arc: "", episodes: [] }] })}><Plus className="h-4 w-4 mr-2" />New Series</Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {series.map(s => {
            const totalEps = s.seasons.reduce((t, season) => t + season.episodes.length, 0);
            return (
              <Card key={s.id} className="cursor-pointer hover:border-primary/50 transition-colors group" onClick={() => setActiveSeries(s)}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold truncate group-hover:text-primary transition-colors">{s.title}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100" onClick={e => { e.stopPropagation(); deleteSeries(s.id); }}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                  </div>
                  <div className="flex gap-2 flex-wrap"><Badge variant="outline" className="text-[10px]">{s.format}</Badge><Badge variant="outline" className="text-[10px]">{s.genre}</Badge></div>
                  {s.logline && <p className="text-xs text-muted-foreground line-clamp-2">{s.logline}</p>}
                  <p className="text-xs text-muted-foreground">{s.seasons.length} season{s.seasons.length !== 1 ? "s" : ""} · {totalEps} episode{totalEps !== 1 ? "s" : ""}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
          </div>
  );
}
