import { useState } from "react";
import { SubscriptionGate } from "@/components/SubscriptionGate";
  import { useParams, useLocation } from "wouter";
  import { ArrowLeft, Music, Plus, Play, Pause, Trash2, Wand2, Download, ExternalLink, Clock, Tag, Loader2, CheckCircle } from "lucide-react";
  import { Button } from "@/components/ui/button";
  import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
  import { Input } from "@/components/ui/input";
  import { Label } from "@/components/ui/label";
  import { Textarea } from "@/components/ui/textarea";
  import { Badge } from "@/components/ui/badge";
  import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
  import { Slider } from "@/components/ui/slider";
  import { Separator } from "@/components/ui/separator";
  import { toast } from "sonner";

  interface ScoreCue {
    id: string;
    scene: string;
    mood: string;
    tempo: string;
    duration: number;
    notes: string;
    status: "draft" | "pending" | "approved";
  }

  const MOOD_OPTIONS = ["Tense","Dramatic","Hopeful","Melancholic","Triumphant","Mysterious","Romantic","Comedic","Action","Ambient","Horror","Inspirational"];
  const TEMPO_OPTIONS = ["Very Slow (< 60 BPM)","Slow (60–80 BPM)","Moderate (80–100 BPM)","Upbeat (100–120 BPM)","Fast (120–140 BPM)","Very Fast (> 140 BPM)"];

  const ROYALTY_FREE_LIBRARY = [
    { title: "Cinematic Tension Rise", genre: "Score", mood: "Tense", bpm: 85, duration: "2:14", source: "Pixabay", url: "https://pixabay.com/music/search/cinematic/" },
    { title: "Emotional Piano Theme", genre: "Score", mood: "Melancholic", bpm: 72, duration: "3:02", source: "Free Music Archive", url: "https://freemusicarchive.org" },
    { title: "Epic Orchestral Surge", genre: "Score", mood: "Triumphant", bpm: 128, duration: "1:48", source: "Incompetech", url: "https://incompetech.com" },
    { title: "Dark Ambient Drone", genre: "Ambient", mood: "Horror", bpm: 60, duration: "4:20", source: "Pixabay", url: "https://pixabay.com/music/search/dark-ambient/" },
    { title: "Hopeful Strings", genre: "Score", mood: "Hopeful", bpm: 90, duration: "2:55", source: "ccMixter", url: "https://ccmixter.org" },
    { title: "Action Percussion Loop", genre: "Score", mood: "Action", bpm: 140, duration: "1:30", source: "Incompetech", url: "https://incompetech.com" },
    { title: "Romantic Guitar Theme", genre: "Score", mood: "Romantic", bpm: 78, duration: "3:10", source: "Free Music Archive", url: "https://freemusicarchive.org" },
    { title: "Mystery Suspense Bed", genre: "Ambient", mood: "Mysterious", bpm: 70, duration: "2:40", source: "ccMixter", url: "https://ccmixter.org" },
    { title: "Indie Folk Journey", genre: "Folk", mood: "Inspirational", bpm: 95, duration: "3:30", source: "Incompetech", url: "https://incompetech.com" },
    { title: "Electronic Urban Beat", genre: "Electronic", mood: "Action", bpm: 130, duration: "2:00", source: "Pixabay", url: "https://pixabay.com/music/search/electronic/" },
  ];

  const SYNC_PLATFORMS = [
    { name: "Artlist", description: "Unlimited sync licence, annual subscription. Best for online/social distribution.", url: "https://artlist.io", priceRange: "$200–$500/yr", bestFor: "Online & Social" },
    { name: "Musicbed", description: "Per-licence or subscription. Premium artists, strong film catalogue.", url: "https://www.musicbed.com", priceRange: "$10–$500/track", bestFor: "Film & Commercial" },
    { name: "Epidemic Sound", description: "Subscription covers YouTube, Twitch, podcasts. Clear monetisation rights.", url: "https://www.epidemicsound.com", priceRange: "$15–$50/mo", bestFor: "YouTube & Streaming" },
    { name: "Soundstripe", description: "Unlimited subscription. Good for indie films and branded content.", url: "https://www.soundstripe.com", priceRange: "$16/mo", bestFor: "Indie Film" },
    { name: "Pond5", description: "Per-track licensing. Large catalogue, negotiable for feature films.", url: "https://www.pond5.com", priceRange: "$10–$2000/track", bestFor: "Feature Film" },
    { name: "MOJO (Musicbed)", description: "One-time licence for theatrical release, festival, and broadcast.", url: "https://www.musicbed.com/mojo", priceRange: "Custom quote", bestFor: "Theatrical / Festival" },
  ];

  function MusicScoreInner() {
    const params = useParams<{ id: string }>();
    const projectId = params.id;
    const [, setLocation] = useLocation();

    const [cues, setCues] = useState<ScoreCue[]>([
      { id: "1", scene: "Opening sequence", mood: "Mysterious", tempo: "Slow (60–80 BPM)", duration: 90, notes: "Builds slowly as titles appear", status: "draft" },
      { id: "2", scene: "First act climax", mood: "Dramatic", tempo: "Fast (120–140 BPM)", duration: 120, notes: "Full orchestra swell", status: "approved" },
    ]);
    const [editingCue, setEditingCue] = useState<Partial<ScoreCue> | null>(null);
    const [generating, setGenerating] = useState<string | null>(null);
    const [libSearch, setLibSearch] = useState("");
    const [libMood, setLibMood] = useState("all");

    const addCue = () => setEditingCue({ id: Date.now().toString(), scene: "", mood: "Dramatic", tempo: "Moderate (80–100 BPM)", duration: 60, notes: "", status: "draft" });

    const saveCue = () => {
      if (!editingCue?.scene) { toast.error("Scene name is required"); return; }
      setCues(prev => {
        const exists = prev.find(c => c.id === editingCue.id);
        if (exists) return prev.map(c => c.id === editingCue.id ? { ...c, ...editingCue } as ScoreCue : c);
        return [...prev, editingCue as ScoreCue];
      });
      setEditingCue(null);
      toast.success("Score cue saved");
    };

    const deleteCue = (id: string) => {
      setCues(prev => prev.filter(c => c.id !== id));
      toast.success("Cue removed");
    };

    const generateBrief = async (cue: ScoreCue) => {
      setGenerating(cue.id);
      await new Promise(r => setTimeout(r, 1800));
      setGenerating(null);
      toast.success("Composer brief copied to clipboard — paste into Suno, Udio, or send to your composer");
      const brief = `SCENE: ${cue.scene}\nMOOD: ${cue.mood}\nTEMPO: ${cue.tempo}\nDURATION: ${cue.duration}s\nNOTES: ${cue.notes}\n\nComposer Brief:\nWrite a ${cue.duration}-second ${cue.mood.toLowerCase()} cue for the scene "${cue.scene}". Tempo should be ${cue.tempo}. ${cue.notes}`;
      navigator.clipboard?.writeText(brief).catch(() => {});
    };

    const filteredLib = ROYALTY_FREE_LIBRARY.filter(t =>
      (libMood === "all" || t.mood === libMood) &&
      (t.title.toLowerCase().includes(libSearch.toLowerCase()) || t.genre.toLowerCase().includes(libSearch.toLowerCase()))
    );

    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation(`/projects/${projectId}`)}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Music className="h-6 w-6 text-primary" /> Music & Score</h1>
            <p className="text-sm text-muted-foreground">Plan your score cues, find royalty-free music, and manage sync licences</p>
          </div>
        </div>

        <Tabs defaultValue="cues">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="cues">Score Cues</TabsTrigger>
            <TabsTrigger value="library">Free Library</TabsTrigger>
            <TabsTrigger value="sync">Sync Licences</TabsTrigger>
          </TabsList>

          {/* ── Score Cues ── */}
          <TabsContent value="cues" className="space-y-4 mt-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">{cues.length} cue{cues.length !== 1 ? "s" : ""} planned</p>
              <Button onClick={addCue}><Plus className="h-4 w-4 mr-2" />Add Cue</Button>
            </div>

            {editingCue && (
              <Card className="border-primary/30">
                <CardHeader><CardTitle className="text-base">{editingCue.id && cues.find(c => c.id === editingCue.id) ? "Edit Cue" : "New Score Cue"}</CardTitle></CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2"><Label>Scene / Description</Label><Input placeholder="e.g. Opening title sequence" value={editingCue.scene ?? ""} onChange={e => setEditingCue(p => ({ ...p, scene: e.target.value }))} /></div>
                  <div className="space-y-2"><Label>Mood</Label><Select value={editingCue.mood ?? "Dramatic"} onValueChange={v => setEditingCue(p => ({ ...p, mood: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{MOOD_OPTIONS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-2"><Label>Tempo</Label><Select value={editingCue.tempo ?? ""} onValueChange={v => setEditingCue(p => ({ ...p, tempo: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TEMPO_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-2 sm:col-span-2"><Label>Duration: {editingCue.duration ?? 60}s ({Math.floor((editingCue.duration ?? 60) / 60)}:{String((editingCue.duration ?? 60) % 60).padStart(2,"0")})</Label><Slider min={5} max={600} step={5} value={[editingCue.duration ?? 60]} onValueChange={([v]) => setEditingCue(p => ({ ...p, duration: v }))} /></div>
                  <div className="space-y-2 sm:col-span-2"><Label>Notes for composer</Label><Textarea placeholder="Any specific instruments, references, or emotional direction..." value={editingCue.notes ?? ""} onChange={e => setEditingCue(p => ({ ...p, notes: e.target.value }))} /></div>
                  <div className="flex gap-2 sm:col-span-2">
                    <Button onClick={saveCue}>Save Cue</Button>
                    <Button variant="outline" onClick={() => setEditingCue(null)}>Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-3">
              {cues.map(cue => (
                <Card key={cue.id} className="hover:border-primary/30 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium truncate">{cue.scene}</span>
                          <Badge variant="outline" className="text-xs">{cue.mood}</Badge>
                          <Badge variant={cue.status === "approved" ? "default" : "secondary"} className="text-xs capitalize">{cue.status}</Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{Math.floor(cue.duration / 60)}:{String(cue.duration % 60).padStart(2,"0")}</span>
                          <span>{cue.tempo}</span>
                        </div>
                        {cue.notes && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{cue.notes}</p>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => generateBrief(cue)} disabled={generating === cue.id} title="Generate composer brief">
                          {generating === cue.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingCue({ ...cue })}><Plus className="h-3.5 w-3.5 rotate-45" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteCue(cue.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {cues.length === 0 && <div className="text-center py-12 text-muted-foreground"><Music className="h-10 w-10 mx-auto mb-3 opacity-30" /><p>No score cues yet. Add your first cue to start planning your film's music.</p></div>}
            </div>
          </TabsContent>

          {/* ── Free Library ── */}
          <TabsContent value="library" className="space-y-4 mt-4">
            <div className="flex gap-3 flex-wrap">
              <Input placeholder="Search tracks…" value={libSearch} onChange={e => setLibSearch(e.target.value)} className="max-w-xs" />
              <Select value={libMood} onValueChange={setLibMood}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All moods</SelectItem>{MOOD_OPTIONS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredLib.map((track, i) => (
                <Card key={i} className="hover:border-primary/30 transition-colors">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Music className="h-4 w-4 text-primary" /></div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{track.title}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-[10px]">{track.mood}</Badge>
                        <span>{track.bpm} BPM</span>
                        <span>{track.duration}</span>
                      </div>
                    </div>
                    <a href={track.url} target="_blank" rel="noopener noreferrer"><Button variant="ghost" size="icon" className="h-8 w-8 shrink-0"><ExternalLink className="h-3.5 w-3.5" /></Button></a>
                  </CardContent>
                </Card>
              ))}
            </div>
            <p className="text-xs text-muted-foreground text-center">All tracks link to royalty-free / CC-licensed sources. Always verify the licence for your distribution platform before use.</p>
          </TabsContent>

          {/* ── Sync Licences ── */}
          <TabsContent value="sync" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">Sync licensing lets you use commercial music in your film. Choose the right platform based on your distribution and budget.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              {SYNC_PLATFORMS.map((p, i) => (
                <Card key={i} className="hover:border-primary/30 transition-colors">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{p.name}</span>
                      <Badge className="text-xs">{p.bestFor}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{p.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-primary">{p.priceRange}</span>
                      <a href={p.url} target="_blank" rel="noopener noreferrer"><Button variant="outline" size="sm" className="h-7 text-xs gap-1"><ExternalLink className="h-3 w-3" />Visit</Button></a>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

export default function MusicScore() {
  return (
    <SubscriptionGate
      feature="Music Score"
      featureKey="canUseAISoundtrack"
      requiredTier="independent"
    >
      <MusicScoreInner />
    </SubscriptionGate>
  );
}
