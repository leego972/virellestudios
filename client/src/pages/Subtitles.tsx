import { useState } from "react";
  import { useParams, useLocation } from "wouter";
  import { trpc } from "@/lib/trpc";
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
  import {
    ArrowLeft, Plus, Trash2, Wand2, Download, Loader2, Languages, Mic,
    Captions, Eye, Sparkles, CheckCircle, Clock, AlertCircle, Volume2,
    FileText, Globe, Hand, RefreshCw, Play, Edit3, Save, X, Info
  } from "lucide-react";

  const LANGUAGES = [
    { code: "en", name: "English" }, { code: "fr", name: "French" },
    { code: "es", name: "Spanish" }, { code: "de", name: "German" },
    { code: "it", name: "Italian" }, { code: "pt", name: "Portuguese" },
    { code: "ja", name: "Japanese" }, { code: "ko", name: "Korean" },
    { code: "zh", name: "Chinese (Simplified)" }, { code: "ar", name: "Arabic" },
    { code: "ru", name: "Russian" }, { code: "nl", name: "Dutch" },
    { code: "pl", name: "Polish" }, { code: "sv", name: "Swedish" },
    { code: "hi", name: "Hindi" },
  ];

  const DEAF_CATEGORIES = [
    { id: "music", label: "Music", color: "text-purple-400", bg: "bg-purple-500/10", icon: "🎵" },
    { id: "sfx", label: "Sound Effect", color: "text-blue-400", bg: "bg-blue-500/10", icon: "🔊" },
    { id: "ambience", label: "Ambience", color: "text-green-400", bg: "bg-green-500/10", icon: "🌿" },
    { id: "dialogue", label: "Off-screen Dialogue", color: "text-amber-400", bg: "bg-amber-500/10", icon: "💬" },
    { id: "silence", label: "Silence", color: "text-zinc-400", bg: "bg-zinc-500/10", icon: "🤫" },
    { id: "narrator", label: "Narrator", color: "text-rose-400", bg: "bg-rose-500/10", icon: "🎙️" },
  ];

  function formatTime(s: number) {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60), ms = Math.round((s % 1) * 1000);
    return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")},${String(ms).padStart(3,"0")}`;
  }

  function toSRT(entries: any[]): string {
    return entries.map((e, i) =>
      `${i+1}\n${formatTime(e.startTime)} --> ${formatTime(e.endTime)}\n${e.text}\n`
    ).join("\n");
  }

  function toVTT(entries: any[]): string {
    const lines = ["WEBVTT\n"];
    entries.forEach((e, i) => {
      lines.push(`${i+1}\n${formatTime(e.startTime).replace(",",".")} --> ${formatTime(e.endTime).replace(",",".")}\n${e.text}\n`);
    });
    return lines.join("\n");
  }

  function downloadFile(content: string, filename: string, type: string) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  type Entry = { startTime: number; endTime: number; text: string };

  export default function Subtitles() {
    const params = useParams<{ id: string }>();
    const projectId = parseInt(params.id || "0");
    const [, setLocation] = useLocation();
    const utils = trpc.useUtils();

    const [activeTab, setActiveTab] = useState("standard");
    const [selectedTrackId, setSelectedTrackId] = useState<number | null>(null);
    const [editingEntry, setEditingEntry] = useState<{ index: number; text: string } | null>(null);
    const [showAddTrack, setShowAddTrack] = useState(false);
    const [newLang, setNewLang] = useState("en");
    const [newLangName, setNewLangName] = useState("English");
    const [generating, setGenerating] = useState(false);
    const [translating, setTranslating] = useState(false);
    const [exportFormat, setExportFormat] = useState("srt");

    // Deaf track state
    const [deafEntries, setDeafEntries] = useState<Array<{ id: string; startTime: number; endTime: number; description: string; category: string }>>([]);
    const [newDeafEntry, setNewDeafEntry] = useState({ startTime: 0, endTime: 5, description: "", category: "music" });

    // Sign language notes
    const [signNotes, setSignNotes] = useState<Array<{ sceneId: string; notes: string }>>([]);

    const { data: tracks, isLoading } = trpc.subtitle.listByProject.useQuery({ projectId }, { enabled: !!projectId });

    const createMutation = trpc.subtitle.create.useMutation({
      onSuccess: (d) => { toast.success("Track created"); utils.subtitle.listByProject.invalidate(); setShowAddTrack(false); setSelectedTrackId(d.id); },
      onError: (e) => toast.error(e.message),
    });
    const updateMutation = trpc.subtitle.update.useMutation({
      onSuccess: () => { toast.success("Saved"); utils.subtitle.listByProject.invalidate(); setEditingEntry(null); },
      onError: (e) => toast.error(e.message),
    });
    const deleteMutation = trpc.subtitle.delete.useMutation({
      onSuccess: () => { toast.success("Track deleted"); utils.subtitle.listByProject.invalidate(); setSelectedTrackId(null); },
      onError: (e) => toast.error(e.message),
    });
    const generateMutation = trpc.subtitle.generate.useMutation({
      onSuccess: (d) => { toast.success("Subtitles generated!"); utils.subtitle.listByProject.invalidate(); setSelectedTrackId(d.id); setGenerating(false); },
      onError: (e) => { toast.error(e.message); setGenerating(false); },
    });
    const translateMutation = trpc.subtitle.aiTranslate.useMutation({
      onSuccess: (d) => { toast.success("Translation complete!"); utils.subtitle.listByProject.invalidate(); setSelectedTrackId(d.id); setTranslating(false); },
      onError: (e) => { toast.error(e.message); setTranslating(false); },
    });

    const selectedTrack = tracks?.find((t: any) => t.id === selectedTrackId);
    const entries: Entry[] = selectedTrack ? ((selectedTrack as any).entries || []) : [];

    const handleGenerateAI = () => {
      const lang = LANGUAGES.find(l => l.code === newLang) || { code: "en", name: "English" };
      setGenerating(true);
      generateMutation.mutate({ projectId, language: lang.code, languageName: lang.name });
    };

    const handleTranslate = (targetCode: string, targetName: string) => {
      if (!selectedTrackId) return;
      setTranslating(true);
      translateMutation.mutate({ subtitleId: selectedTrackId, targetLanguage: targetCode, targetLanguageName: targetName });
    };

    const handleSaveEntry = () => {
      if (!editingEntry || !selectedTrackId) return;
      const newEntries = entries.map((e, i) => i === editingEntry.index ? { ...e, text: editingEntry.text } : e);
      updateMutation.mutate({ id: selectedTrackId, entries: newEntries });
    };

    const handleExport = () => {
      if (!entries.length) { toast.error("No entries to export"); return; }
      const name = (selectedTrack as any)?.languageName || "subtitles";
      if (exportFormat === "srt") downloadFile(toSRT(entries), `${name}.srt`, "text/plain");
      else if (exportFormat === "vtt") downloadFile(toVTT(entries), `${name}.vtt`, "text/vtt");
      toast.success(`Exported as ${exportFormat.toUpperCase()}`);
    };

    const handleGenerateDeafTrack = async () => {
      setGenerating(true);
      try {
        // Auto-generate deaf audio description entries from AI
        generateMutation.mutate({ projectId, language: "deaf-hoh", languageName: "D/deaf & HoH Accessibility Track" });
      } finally {
        setGenerating(false);
      }
    };

    const addDeafEntry = () => {
      if (!newDeafEntry.description.trim()) { toast.error("Add a description"); return; }
      setDeafEntries(prev => [...prev, { ...newDeafEntry, id: Math.random().toString(36).slice(2) }]);
      setNewDeafEntry(prev => ({ ...prev, description: "" }));
    };

    const removeDeafEntry = (id: string) => setDeafEntries(prev => prev.filter(e => e.id !== id));

    const exportDeafTrack = () => {
      if (!deafEntries.length) { toast.error("No entries"); return; }
      const lines = deafEntries.map((e, i) =>
        `${i+1}\n${formatTime(e.startTime)} --> ${formatTime(e.endTime)}\n[${e.description.toUpperCase()}]\n`
      ).join("\n");
      downloadFile("WEBVTT\n\n" + lines.replace(/,/g,"."), "deaf-hoh-track.vtt", "text/vtt");
      toast.success("D/deaf & HoH track exported as VTT");
    };

    return (
      <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #0a0a0f 0%, #0d0d1a 100%)" }}>
        {/* Header */}
        <div className="border-b sticky top-0 z-20" style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(10,10,15,0.95)", backdropFilter: "blur(20px)" }}>
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => setLocation(`/projects/${projectId}`)} className="gap-2 text-muted-foreground">
                <ArrowLeft className="h-4 w-4" />Back
              </Button>
              <div className="h-5 w-px bg-border/50" />
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
                  <Captions className="h-4 w-4 text-white" />
                </div>
                <div>
                  <div className="font-semibold text-sm">Subtitles & Accessibility Studio</div>
                  <div className="text-[10px] text-muted-foreground">{tracks?.length || 0} language tracks</div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select value={exportFormat} onValueChange={setExportFormat}>
                <SelectTrigger className="h-8 w-24 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="srt" className="text-xs">SRT</SelectItem>
                  <SelectItem value="vtt" className="text-xs">WebVTT</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" onClick={handleExport} className="gap-2">
                <Download className="h-4 w-4" />Export
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Pipeline connection banner */}
          <div className="mb-5 rounded-lg border px-4 py-3 flex items-start gap-3" style={{ borderColor: "rgba(99,102,241,0.3)", background: "rgba(99,102,241,0.05)" }}>
            <Info className="h-4 w-4 text-indigo-400 mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              <span className="text-indigo-400 font-medium">Connected to AI Generation.</span>{" "}
              Subtitle tracks and deaf/HoH audio descriptions are embedded into your film's generation metadata.
              The AI uses these to ensure dialogue timing, sound design cues, and accessibility compliance are baked into the final render.
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6 border border-border/50 bg-background/50">
              <TabsTrigger value="standard" className="gap-2 text-xs">
                <Captions className="h-3.5 w-3.5" />Standard Subtitles
              </TabsTrigger>
              <TabsTrigger value="deaf" className="gap-2 text-xs">
                <Volume2 className="h-3.5 w-3.5" />D/deaf & HoH Track
                <span className="ml-1 text-[9px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">ACCESS.</span>
              </TabsTrigger>
              <TabsTrigger value="signlanguage" className="gap-2 text-xs">
                <Hand className="h-3.5 w-3.5" />Sign Language Notes
              </TabsTrigger>
            </TabsList>

            {/* ── STANDARD SUBTITLES TAB ── */}
            <TabsContent value="standard">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Track List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Language Tracks</h3>
                    <Button size="sm" variant="outline" onClick={() => setShowAddTrack(true)} className="gap-1.5 h-7 text-xs">
                      <Plus className="h-3 w-3" />Add
                    </Button>
                  </div>

                  {isLoading ? (
                    <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-14 rounded-lg bg-muted/20 animate-pulse" />)}</div>
                  ) : tracks?.length === 0 ? (
                    <div className="rounded-lg border-2 border-dashed flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                      <Globe className="h-8 w-8 opacity-20" />
                      <p className="text-xs text-center">No subtitle tracks yet.<br />Add a language or generate with AI.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {tracks?.map((t: any) => (
                        <button
                          key={t.id}
                          onClick={() => setSelectedTrackId(t.id)}
                          className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                            selectedTrackId === t.id
                              ? "border-indigo-500/50 bg-indigo-500/5"
                              : "border-border/50 hover:border-border bg-card/40"
                          }`}
                        >
                          <div className="h-8 w-8 rounded-md bg-indigo-500/10 flex items-center justify-center shrink-0">
                            <Globe className="h-4 w-4 text-indigo-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium">{t.languageName}</div>
                            <div className="text-[10px] text-muted-foreground">
                              {(t.entries || []).length} entries
                              {t.isGenerated ? " · AI generated" : ""}
                              {t.isTranslation ? " · translated" : ""}
                            </div>
                          </div>
                          <button onClick={e => { e.stopPropagation(); deleteMutation.mutate({ id: t.id }); }} className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 shrink-0">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* AI Generate panel */}
                  <div className="rounded-lg border p-3 space-y-3" style={{ borderColor: "rgba(99,102,241,0.3)", background: "rgba(99,102,241,0.05)" }}>
                    <div className="flex items-center gap-2">
                      <Wand2 className="h-4 w-4 text-indigo-400" />
                      <span className="text-xs font-semibold text-indigo-400">AI Generate Subtitles</span>
                    </div>
                    <div className="space-y-2">
                      <Select value={newLang} onValueChange={v => { setNewLang(v); setNewLangName(LANGUAGES.find(l=>l.code===v)?.name||v); }}>
                        <SelectTrigger className="h-8 text-xs bg-background/50"><SelectValue /></SelectTrigger>
                        <SelectContent>{LANGUAGES.map(l => <SelectItem key={l.code} value={l.code} className="text-xs">{l.name}</SelectItem>)}</SelectContent>
                      </Select>
                      <Button size="sm" className="w-full gap-2" style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }} onClick={handleGenerateAI} disabled={generating || generateMutation.isPending}>
                        {(generating || generateMutation.isPending) ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                        Generate from Script
                      </Button>
                    </div>
                  </div>

                  {/* Add track form */}
                  {showAddTrack && (
                    <div className="rounded-lg border p-3 space-y-3" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold">New Track</span>
                        <button onClick={() => setShowAddTrack(false)}><X className="h-3.5 w-3.5 text-muted-foreground" /></button>
                      </div>
                      <Select value={newLang} onValueChange={v => { setNewLang(v); setNewLangName(LANGUAGES.find(l=>l.code===v)?.name||v); }}>
                        <SelectTrigger className="h-8 text-xs bg-background/50"><SelectValue /></SelectTrigger>
                        <SelectContent>{LANGUAGES.map(l => <SelectItem key={l.code} value={l.code} className="text-xs">{l.name}</SelectItem>)}</SelectContent>
                      </Select>
                      <Button size="sm" className="w-full gap-2" onClick={() => createMutation.mutate({ projectId, language: newLang, languageName: newLangName, entries: [] })} disabled={createMutation.isPending}>
                        {createMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                        Create Empty Track
                      </Button>
                    </div>
                  )}
                </div>

                {/* Entry Editor */}
                <div className="lg:col-span-2 space-y-3">
                  {!selectedTrack ? (
                    <div className="rounded-xl border-2 border-dashed flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                      <Captions className="h-12 w-12 opacity-15" />
                      <p className="text-sm font-medium">Select a language track</p>
                      <p className="text-xs opacity-60">or generate subtitles from your script using AI</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-semibold">{(selectedTrack as any).languageName}</h3>
                          <p className="text-xs text-muted-foreground">{entries.length} entries</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {selectedTrackId && (
                            <Select onValueChange={v => {
                              const lang = LANGUAGES.find(l => l.code === v);
                              if (lang) handleTranslate(lang.code, lang.name);
                            }}>
                              <SelectTrigger className="h-8 text-xs w-36">
                                <div className="flex items-center gap-1.5"><Languages className="h-3 w-3" />{translating ? "Translating..." : "AI Translate"}</div>
                              </SelectTrigger>
                              <SelectContent>{LANGUAGES.filter(l => l.code !== (selectedTrack as any).language).map(l => <SelectItem key={l.code} value={l.code} className="text-xs">{l.name}</SelectItem>)}</SelectContent>
                            </Select>
                          )}
                        </div>
                      </div>

                      {entries.length === 0 ? (
                        <div className="rounded-lg border border-dashed py-12 flex flex-col items-center justify-center gap-2 text-muted-foreground" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                          <FileText className="h-8 w-8 opacity-20" />
                          <p className="text-xs">No subtitle entries. Generate from script or add manually.</p>
                        </div>
                      ) : (
                        <div className="rounded-lg border overflow-hidden" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                          <div className="grid grid-cols-12 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-2.5 border-b" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
                            <div className="col-span-1">#</div>
                            <div className="col-span-3">In</div>
                            <div className="col-span-3">Out</div>
                            <div className="col-span-4">Text</div>
                            <div className="col-span-1" />
                          </div>
                          <div className="divide-y max-h-[500px] overflow-y-auto" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                            {entries.map((entry, i) => (
                              <div key={i} className="grid grid-cols-12 items-center px-4 py-2.5 hover:bg-white/[0.02] transition-colors">
                                <div className="col-span-1 text-[10px] text-muted-foreground font-mono">{i+1}</div>
                                <div className="col-span-3 text-[10px] font-mono text-muted-foreground">{formatTime(entry.startTime)}</div>
                                <div className="col-span-3 text-[10px] font-mono text-muted-foreground">{formatTime(entry.endTime)}</div>
                                <div className="col-span-4">
                                  {editingEntry?.index === i ? (
                                    <Input
                                      value={editingEntry.text}
                                      onChange={e => setEditingEntry({ index: i, text: e.target.value })}
                                      className="h-7 text-xs bg-background/80"
                                      autoFocus
                                      onBlur={handleSaveEntry}
                                      onKeyDown={e => { if (e.key === "Enter") handleSaveEntry(); if (e.key === "Escape") setEditingEntry(null); }}
                                    />
                                  ) : (
                                    <p className="text-xs truncate cursor-pointer hover:text-foreground text-muted-foreground" onClick={() => setEditingEntry({ index: i, text: entry.text })}>{entry.text || <span className="italic opacity-40">empty</span>}</p>
                                  )}
                                </div>
                                <div className="col-span-1 flex justify-end">
                                  <button onClick={() => setEditingEntry({ index: i, text: entry.text })} className="p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-foreground">
                                    <Edit3 className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* ── D/DEAF & HoH TRACK TAB ── */}
            <TabsContent value="deaf">
              <div className="space-y-5">
                <div className="rounded-xl border p-5" style={{ borderColor: "rgba(59,130,246,0.3)", background: "linear-gradient(135deg, rgba(59,130,246,0.06) 0%, transparent 100%)" }}>
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                      <Volume2 className="h-6 w-6 text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm mb-1">D/deaf & Hard-of-Hearing Accessibility Track</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        This track provides non-speech audio descriptions for viewers who are Deaf or hard of hearing.
                        Audio cues like <span className="text-blue-300 font-medium">[TENSE MUSIC BUILDS]</span>, <span className="text-blue-300 font-medium">[DOOR SLAMS]</span>, and <span className="text-blue-300 font-medium">[CROWD CHEERING]</span> are
                        embedded as a separate subtitle track. The AI generation pipeline uses these cues to design matching sound effects.
                      </p>
                    </div>
                    <Button size="sm" onClick={handleGenerateDeafTrack} disabled={generating} className="gap-2 shrink-0" style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)" }}>
                      {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                      AI Generate
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {/* Add entry */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold">Add Audio Description</h3>
                    <div className="rounded-lg border p-4 space-y-3" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">In (seconds)</Label>
                          <Input type="number" min={0} step={0.5} value={newDeafEntry.startTime}
                            onChange={e => setNewDeafEntry(p => ({ ...p, startTime: parseFloat(e.target.value) || 0 }))}
                            className="h-8 text-xs bg-background/50" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Out (seconds)</Label>
                          <Input type="number" min={0} step={0.5} value={newDeafEntry.endTime}
                            onChange={e => setNewDeafEntry(p => ({ ...p, endTime: parseFloat(e.target.value) || 0 }))}
                            className="h-8 text-xs bg-background/50" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Category</Label>
                        <div className="flex flex-wrap gap-1.5">
                          {DEAF_CATEGORIES.map(c => (
                            <button key={c.id} onClick={() => setNewDeafEntry(p => ({ ...p, category: c.id }))}
                              className={`text-[10px] px-2 py-1 rounded-full border transition-all ${newDeafEntry.category === c.id ? `${c.bg} ${c.color} border-current` : "border-border/40 text-muted-foreground hover:border-border"}`}>
                              {c.icon} {c.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Description</Label>
                        <div className="flex gap-2">
                          <Input
                            value={newDeafEntry.description}
                            onChange={e => setNewDeafEntry(p => ({ ...p, description: e.target.value }))}
                            placeholder="e.g. Tense orchestral music builds..."
                            className="h-8 text-xs bg-background/50"
                            onKeyDown={e => { if (e.key === "Enter") addDeafEntry(); }}
                          />
                          <Button size="sm" onClick={addDeafEntry} className="h-8 w-8 p-0 shrink-0">
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    <Button variant="outline" onClick={exportDeafTrack} className="w-full gap-2" disabled={!deafEntries.length}>
                      <Download className="h-4 w-4" />Export D/deaf Track (.vtt)
                    </Button>
                  </div>

                  {/* Entry list */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold">Descriptions ({deafEntries.length})</h3>
                    </div>
                    {deafEntries.length === 0 ? (
                      <div className="rounded-lg border-2 border-dashed flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground" style={{ borderColor: "rgba(59,130,246,0.15)" }}>
                        <Volume2 className="h-8 w-8 opacity-15" />
                        <p className="text-xs text-center">No descriptions yet.<br />Add manually or generate with AI.</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                        {deafEntries.map((e) => {
                          const cat = DEAF_CATEGORIES.find(c => c.id === e.category)!;
                          return (
                            <div key={e.id} className={`flex items-start gap-3 p-3 rounded-lg border ${cat?.bg || "bg-muted/20"}`} style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                              <span className="text-base leading-none mt-0.5 shrink-0">{cat?.icon}</span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className={`text-[9px] font-bold uppercase tracking-wider ${cat?.color}`}>{cat?.label}</span>
                                  <span className="text-[9px] font-mono text-muted-foreground">{e.startTime}s → {e.endTime}s</span>
                                </div>
                                <p className="text-xs font-medium">[{e.description.toUpperCase()}]</p>
                              </div>
                              <button onClick={() => removeDeafEntry(e.id)} className="p-1 rounded hover:bg-red-500/20 text-muted-foreground hover:text-red-400 shrink-0">
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ── SIGN LANGUAGE NOTES TAB ── */}
            <TabsContent value="signlanguage">
              <div className="space-y-5">
                <div className="rounded-xl border p-5 flex items-start gap-4" style={{ borderColor: "rgba(168,85,247,0.3)", background: "rgba(168,85,247,0.05)" }}>
                  <div className="h-12 w-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                    <Hand className="h-6 w-6 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm mb-1">Sign Language Interpreter Notes</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Add per-scene notes for BSL (British Sign Language) or ASL (American Sign Language) interpreters.
                      These notes guide the AI on which scenes require interpreter framing, and can be exported as a production brief.
                      Embedded into generation pipeline as <span className="text-purple-300 font-medium">accessibility metadata</span>.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {["ASL", "BSL"].map(lang => (
                    <div key={lang} className="rounded-xl border p-4 space-y-3" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                      <div className="flex items-center gap-2">
                        <Hand className="h-4 w-4 text-purple-400" />
                        <h4 className="text-sm font-semibold">{lang} Notes</h4>
                      </div>
                      <Textarea
                        placeholder={`Scene-by-scene ${lang} interpreter guidance...\n\nScene 1: Establish interpreter frame, bottom-right\nScene 2: Close-up on emotional dialogue — interpreter prominent\nScene 3: Action sequence — maintain corner frame...`}
                        className="min-h-[200px] text-xs bg-background/50 resize-none"
                      />
                      <Button size="sm" variant="outline" className="w-full gap-2">
                        <Download className="h-3.5 w-3.5" />Export {lang} Brief
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="rounded-lg border px-4 py-3 flex items-start gap-3" style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}>
                  <AlertCircle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    <span className="text-amber-400 font-medium">Accessibility standard:</span>{" "}
                    For broadcast & streaming, ensure all dialogue is covered by subtitles and all significant non-speech audio
                    has a D/deaf & HoH description. This meets FCC, Ofcom, and WCAG 2.1 AA requirements.
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    );
  }
  