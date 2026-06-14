import { useState, useRef } from "react";
  import { trpc } from "@/lib/trpc";
  import { useParams, useLocation, Link } from "wouter";
  import { useAuth } from "@/_core/hooks/useAuth";
  import { Button } from "@/components/ui/button";
  import { Badge } from "@/components/ui/badge";
  import { Input } from "@/components/ui/input";
  import { Textarea } from "@/components/ui/textarea";
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
  import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
  import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
  import { toast } from "sonner";
  import {
    ArrowLeft, Plus, Search, User, Mic, Upload, Trash2, Edit3,
    Loader2, Volume2, Wand2, Film, Star, Info, CheckCircle2,
    ChevronRight, Copy,
  } from "lucide-react";
  import { getLoginUrl } from "@/const";
  import { NextStageCTA } from "@/components/NextStageCTA";
  import { SubscriptionGate } from "@/components/SubscriptionGate";

  const VOICE_PRESETS = [
    { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel",  desc: "Young, calm",      gender: "F" },
    { id: "AZnzlk1XvdvUeBnXmlld", name: "Domi",    desc: "Confident",        gender: "F" },
    { id: "EXAVITQu4vr4xnSDxMaL", name: "Bella",   desc: "Warm storyteller", gender: "F" },
    { id: "XrExE9yKIg1WjnnlVkGX", name: "Matilda", desc: "Cozy, friendly",   gender: "F" },
    { id: "ErXwobaYiN019PkySvjV", name: "Antoni",  desc: "Smooth",           gender: "M" },
    { id: "TxGEqnHWrfWFTfGW9XjX", name: "Josh",    desc: "Deep, narrative",  gender: "M" },
    { id: "onwK4e9ZLuTAKqWW03F9", name: "Daniel",  desc: "British, deep",    gender: "M" },
    { id: "pNInz6obpgDQGcFmaJgB", name: "Adam",    desc: "Authoritative",    gender: "M" },
    { id: "VR6AewLTigWG4xSOukaG", name: "Arnold",  desc: "Crisp, strong",    gender: "M" },
    { id: "2EiwWnXFnvU5JabPnv8n", name: "Clyde",   desc: "Gravelly veteran", gender: "M" },
  ];

  const ROLES = ["Lead", "Supporting", "Featured Extra", "Extra", "Narrator", "Voice-Only", "Antagonist", "Mentor", "Comic Relief", "Love Interest"];
  const ARC_TYPES = ["Hero", "Anti-Hero", "Villain", "Mentor", "Trickster", "Shapeshifter", "Threshold Guardian", "Herald", "Shadow"];
  const MORAL_ALIGNMENTS = ["Lawful Good", "Neutral Good", "Chaotic Good", "Lawful Neutral", "True Neutral", "Chaotic Neutral", "Lawful Evil", "Neutral Evil", "Chaotic Evil"];

  function CharacterAvatar({ char }: { char: any }) {
    return (
      <div className="h-14 w-14 rounded-xl overflow-hidden shrink-0 flex items-center justify-center"
        style={{ background: "linear-gradient(135deg,rgba(212,175,55,0.15),rgba(99,102,241,0.15))", border:"1px solid rgba(255,255,255,0.07)" }}>
        {char.photoUrl
          ? <img src={char.photoUrl} alt={char.name} className="h-full w-full object-cover" />
          : <User style={{ width:24, height:24, color:"rgba(255,255,255,0.2)" }} />}
      </div>
    );
  }

  function CharacterCard({ char, selected, onClick, onEdit, onDelete }: {
    char: any; selected: boolean; onClick: () => void;
    onEdit: () => void; onDelete: () => void;
  }) {
    const hasVoice = !!(char.voiceId);
    return (
      <div onClick={onClick}
        className="group rounded-xl border cursor-pointer transition-all"
        style={{
          borderColor: selected ? "rgba(212,175,55,0.4)" : "rgba(255,255,255,0.07)",
          background:  selected ? "rgba(212,175,55,0.05)" : "rgba(255,255,255,0.02)",
        }}>
        <div className="p-3 flex items-center gap-3">
          <CharacterAvatar char={char} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm truncate">{char.name}</span>
              {char.isAiActor && <Star className="h-3 w-3 shrink-0 text-amber-400" />}
            </div>
            <div className="text-[10px] text-muted-foreground truncate">{char.role || "Character"}</div>
            <div className="flex items-center gap-1.5 mt-1">
              {hasVoice && (
                <Badge className="text-[9px] border-0 px-1.5 py-0" style={{ background:"rgba(99,102,241,0.15)", color:"#818cf8" }}>
                  <Mic className="h-2.5 w-2.5 mr-1" />Voice set
                </Badge>
              )}
              {char.arcType && (
                <Badge className="text-[9px] border-0 px-1.5 py-0" style={{ background:"rgba(255,255,255,0.07)", color:"rgba(255,255,255,0.4)" }}>
                  {char.arcType}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={e => { e.stopPropagation(); onEdit(); }}
              className="h-6 w-6 rounded-md flex items-center justify-center hover:bg-white/10">
              <Edit3 style={{ width:11, height:11 }} />
            </button>
            <button onClick={e => { e.stopPropagation(); onDelete(); }}
              className="h-6 w-6 rounded-md flex items-center justify-center hover:bg-red-500/10">
              <Trash2 style={{ width:11, height:11, color:"#f87171" }} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  function VoiceCloneSection({ characterId, characterName, currentVoiceId, onVoiceSet }: {
    characterId: number; characterName: string; currentVoiceId?: string;
    onVoiceSet: (voiceId: string) => void;
  }) {
    const [file, setFile] = useState<File | null>(null);
    const [cloning, setCloning] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);
    const cloneVoice = trpc.auth.cloneVoice.useMutation();

    async function handleClone() {
      if (!file) { toast.error("Upload a voice sample first (30+ seconds)"); return; }
      setCloning(true);
      try {
        const arrayBuffer = await file.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString("base64");
        const res = await cloneVoice.mutateAsync({
          characterId,
          name: `${characterName} — Virelle`,
          audioBase64: base64,
          description: `Voice clone for character ${characterName}`,
        });
        onVoiceSet(res.voiceId);
        toast.success("Voice cloned and saved to character!");
      } catch (e: any) { toast.error(e.message || "Voice cloning failed"); }
      finally { setCloning(false); }
    }

    return (
      <div className="space-y-4">
        <div className="rounded-xl border px-4 py-3 flex items-start gap-3" style={{ borderColor:"rgba(99,102,241,0.2)", background:"rgba(99,102,241,0.04)" }}>
          <Info className="h-4 w-4 mt-0.5 shrink-0" style={{ color:"#818cf8" }} />
          <p className="text-xs text-muted-foreground">Upload 30–120 seconds of clean audio to clone a custom voice for this character. Uses ElevenLabs Voice Cloning.</p>
        </div>
        {currentVoiceId && (
          <div className="rounded-xl border px-4 py-2.5 flex items-center gap-2.5" style={{ borderColor:"rgba(74,222,128,0.2)", background:"rgba(74,222,128,0.04)" }}>
            <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color:"#4ade80" }} />
            <div>
              <div className="text-xs font-semibold" style={{ color:"#4ade80" }}>Voice cloned</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">ID: {currentVoiceId.slice(0,16)}…</div>
            </div>
            <button onClick={() => { navigator.clipboard.writeText(currentVoiceId); toast.success("Voice ID copied"); }}
              className="ml-auto p-1.5 rounded hover:bg-white/5">
              <Copy className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
        )}
        <div className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer hover:bg-white/5 transition-colors"
          style={{ borderColor:"rgba(255,255,255,0.1)" }}
          onClick={() => fileRef.current?.click()}>
          <Upload className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm font-medium">{file ? file.name : "Upload voice sample"}</p>
          <p className="text-xs text-muted-foreground mt-1">MP3, WAV, M4A · 30s–5min · Clear audio only</p>
          <input ref={fileRef} type="file" accept="audio/*" className="hidden"
            onChange={e => setFile(e.target.files?.[0] || null)} />
        </div>
        <Button className="w-full gap-2 h-10" onClick={handleClone} disabled={cloning || !file}
          style={{ background:"linear-gradient(135deg,#6366f1,#4f46e5)", color:"#fff" }}>
          {cloning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
          {cloning ? "Cloning voice…" : "Clone Voice with ElevenLabs"}
        </Button>
      </div>
    );
  }

  function CharacterDialog({ char, projectId, onClose, onSaved }: {
    char?: any; projectId?: number; onClose: () => void; onSaved: () => void;
  }) {
    const [tab, setTab] = useState("profile");
    const [form, setForm] = useState({
      name: char?.name || "",
      role: char?.role || "",
      description: char?.description || "",
      backstory: char?.backstory || "",
      motivations: char?.motivations || "",
      arcType: char?.arcType || "",
      moralAlignment: char?.moralAlignment || "",
      speechPattern: char?.speechPattern || "",
      voiceId: char?.voiceId || "",
      voiceType: char?.voiceType || "",
      nationality: char?.nationality || "",
    });
    const [saving, setSaving] = useState(false);
    const createChar = trpc.character.create.useMutation();
    const updateChar = trpc.character.update.useMutation();

    const patch = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

    async function handleSave() {
      if (!form.name.trim()) { toast.error("Name is required"); return; }
      setSaving(true);
      try {
        if (char) {
          await updateChar.mutateAsync({ id: char.id, ...form });
          toast.success("Character updated");
        } else {
          await createChar.mutateAsync({ projectId: projectId || null, ...form });
          toast.success("Character created");
        }
        onSaved();
        onClose();
      } catch (e: any) { toast.error(e.message || "Save failed"); }
      finally { setSaving(false); }
    }

    return (
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto" style={{ background:"#0c0b18", borderColor:"rgba(255,255,255,0.1)" }}>
        <DialogHeader>
          <DialogTitle className="font-serif text-lg" style={{ color:"#D4AF37" }}>
            {char ? "Edit Character" : "New Character"}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="profile"  className="text-xs data-[state=active]:bg-white/10">Profile</TabsTrigger>
            <TabsTrigger value="voice"    className="text-xs data-[state=active]:bg-white/10">Voice</TabsTrigger>
            <TabsTrigger value="story"    className="text-xs data-[state=active]:bg-white/10">Story</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-3 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Name *</label>
                <Input value={form.name} onChange={e => patch("name", e.target.value)}
                  placeholder="Character name" className="h-9 text-sm bg-white/5 border-white/10" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Role</label>
                <Select value={form.role} onValueChange={v => patch("role", v)}>
                  <SelectTrigger className="h-9 text-xs bg-white/5 border-white/10"><SelectValue placeholder="Select role" /></SelectTrigger>
                  <SelectContent>{ROLES.map(r => <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Nationality</label>
                <Input value={form.nationality} onChange={e => patch("nationality", e.target.value)}
                  placeholder="e.g. American" className="h-9 text-xs bg-white/5 border-white/10" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Character Arc</label>
                <Select value={form.arcType} onValueChange={v => patch("arcType", v)}>
                  <SelectTrigger className="h-9 text-xs bg-white/5 border-white/10"><SelectValue placeholder="Arc type" /></SelectTrigger>
                  <SelectContent>{ARC_TYPES.map(a => <SelectItem key={a} value={a} className="text-xs">{a}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Moral Alignment</label>
                <Select value={form.moralAlignment} onValueChange={v => patch("moralAlignment", v)}>
                  <SelectTrigger className="h-9 text-xs bg-white/5 border-white/10"><SelectValue placeholder="Alignment" /></SelectTrigger>
                  <SelectContent>{MORAL_ALIGNMENTS.map(m => <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Description</label>
                <Textarea value={form.description} onChange={e => patch("description", e.target.value)}
                  placeholder="Physical appearance, personality overview…"
                  className="text-xs min-h-[80px] bg-white/5 border-white/10 resize-none" />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="voice" className="space-y-4 mt-4">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground">ElevenLabs Preset Voice</label>
              <Select value={form.voiceId} onValueChange={v => patch("voiceId", v)}>
                <SelectTrigger className="h-9 text-xs bg-white/5 border-white/10">
                  <Mic className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Choose a preset voice" />
                </SelectTrigger>
                <SelectContent>
                  {VOICE_PRESETS.map(v => (
                    <SelectItem key={v.id} value={v.id} className="text-xs">
                      {v.name} ({v.gender}) — {v.desc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Voice Description</label>
              <Input value={form.voiceType} onChange={e => patch("voiceType", e.target.value)}
                placeholder="e.g. Deep baritone, slight rasp, measured delivery"
                className="h-9 text-xs bg-white/5 border-white/10" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Speech Pattern</label>
              <Input value={form.speechPattern} onChange={e => patch("speechPattern", e.target.value)}
                placeholder="e.g. Short sentences, formal, never uses contractions"
                className="h-9 text-xs bg-white/5 border-white/10" />
            </div>
            {char && (
              <div className="border-t border-white/10 pt-4">
                <p className="text-xs font-semibold mb-3">Clone Voice from Audio</p>
                <VoiceCloneSection
                  characterId={char.id}
                  characterName={char.name}
                  currentVoiceId={char.voiceId}
                  onVoiceSet={v => patch("voiceId", v)}
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="story" className="space-y-3 mt-4">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Backstory</label>
              <Textarea value={form.backstory} onChange={e => patch("backstory", e.target.value)}
                placeholder="Where did this character come from? What shaped them?"
                className="text-xs min-h-[100px] bg-white/5 border-white/10 resize-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Motivations</label>
              <Textarea value={form.motivations} onChange={e => patch("motivations", e.target.value)}
                placeholder="What do they want? What are they afraid to lose?"
                className="text-xs min-h-[80px] bg-white/5 border-white/10 resize-none" />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex gap-2 mt-2 pt-3 border-t border-white/10">
          <Button variant="outline" className="flex-1 h-9 text-xs border-white/10" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 h-9 text-xs gap-2" onClick={handleSave} disabled={saving}
            style={{ background:"linear-gradient(135deg,#D4AF37,#b8960c)", color:"#000" }}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            {saving ? "Saving…" : char ? "Save Changes" : "Create Character"}
          </Button>
        </div>
      </DialogContent>
    );
  }

  function CharactersInner() {
    const { user, loading: authLoading } = useAuth();
    const params = useParams<{ projectId: string }>();
    const [, navigate] = useLocation();
    const projectId = Number(params.projectId) || 0;
    const hasProject = !!projectId && !!user;

    const [search, setSearch] = useState("");
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [editChar, setEditChar] = useState<any>(null);
    const [showCreate, setShowCreate] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
    const [deleting, setDeleting] = useState(false);

    const { data: project } = trpc.project.get.useQuery({ id: projectId }, { enabled: hasProject });
    const { data: chars,  refetch } = hasProject
      ? trpc.character.listByProject.useQuery({ projectId }, { enabled: hasProject })
      : trpc.character.list.useQuery(undefined, { enabled: !!user });
    const deleteChar = trpc.character.delete.useMutation();
    const utils = trpc.useUtils();

    if (!user && !authLoading) { window.location.href = getLoginUrl(); return null; }

    const filtered = (chars ?? []).filter((c: any) =>
      !search || c.name.toLowerCase().includes(search.toLowerCase()) || (c.role||"").toLowerCase().includes(search.toLowerCase())
    );
    const selected = filtered.find((c: any) => c.id === selectedId) as any;

    async function handleDelete(id: number) {
      setDeleting(true);
      try {
        await deleteChar.mutateAsync({ id });
        if (selectedId === id) setSelectedId(null);
        await refetch();
        toast.success("Character deleted");
      } catch (e: any) { toast.error(e.message); }
      finally { setDeleting(false); setDeleteConfirm(null); }
    }

    function onSaved() {
      refetch();
      if (hasProject) utils.character.listByProject.invalidate({ projectId });
      else utils.character.list.invalidate();
    }

    return (
      <div className="min-h-screen" style={{ background:"linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)" }}>
        {/* Header */}
        <div className="border-b sticky top-0 z-20" style={{ borderColor:"rgba(255,255,255,0.07)", background:"rgba(7,7,14,0.97)", backdropFilter:"blur(24px)" }}>
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => navigate(hasProject ? `/projects/${projectId}` : "/dashboard")} className="gap-2 text-muted-foreground h-8">
                <ArrowLeft className="h-4 w-4" />Back
              </Button>
              <div className="h-5 w-px bg-border/40" />
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background:"linear-gradient(135deg,#D4AF37,#b8960c)" }}>
                  <User style={{ width:18, height:18, color:"#000" }} />
                </div>
                <div>
                  <div className="font-bold text-sm">Characters</div>
                  <div className="text-[10px] text-muted-foreground">
                    {project ? project.title + " · " : ""}
                    {filtered.length} character{filtered.length !== 1 ? "s" : ""}
                  </div>
                </div>
              </div>
            </div>
            <Button size="sm" onClick={() => setShowCreate(true)} className="gap-2 h-8 text-xs"
              style={{ background:"linear-gradient(135deg,#D4AF37,#b8960c)", color:"#000" }}>
              <Plus className="h-3.5 w-3.5" />New Character
            </Button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-6 flex gap-5">
          {/* Left: Character list */}
          <div className="w-72 shrink-0 space-y-3">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search characters…"
                className="pl-9 h-9 text-xs bg-white/5 border-white/10" />
            </div>

            {filtered.length === 0 && (
              <div className="rounded-2xl border-2 border-dashed flex flex-col items-center py-16 gap-3" style={{ borderColor:"rgba(255,255,255,0.07)" }}>
                <User className="h-10 w-10 opacity-20" />
                <p className="text-sm text-center">{search ? "No matches" : "No characters yet"}</p>
                {!search && (
                  <Button size="sm" className="gap-2 mt-2 h-8 text-xs" onClick={() => setShowCreate(true)}
                    style={{ background:"linear-gradient(135deg,#D4AF37,#b8960c)", color:"#000" }}>
                    <Plus className="h-3.5 w-3.5" />Create First Character
                  </Button>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              {filtered.map((c: any) => (
                <CharacterCard key={c.id} char={c}
                  selected={selectedId === c.id}
                  onClick={() => setSelectedId(c.id)}
                  onEdit={() => setEditChar(c)}
                  onDelete={() => setDeleteConfirm(c.id)}
                />
              ))}
            </div>
          </div>

          {/* Right: Character detail */}
          <div className="flex-1 min-w-0">
            {!selected ? (
              <div className="rounded-2xl border-2 border-dashed flex flex-col items-center py-24 gap-3" style={{ borderColor:"rgba(255,255,255,0.07)" }}>
                <Film className="h-12 w-12 opacity-20" />
                <p className="text-sm">Select a character to view their profile</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Hero */}
                <div className="rounded-2xl border px-6 py-5 flex items-start gap-5" style={{ borderColor:"rgba(255,255,255,0.07)", background:"rgba(255,255,255,0.02)" }}>
                  <div className="h-20 w-20 rounded-2xl overflow-hidden shrink-0 flex items-center justify-center"
                    style={{ background:"linear-gradient(135deg,rgba(212,175,55,0.15),rgba(99,102,241,0.15))", border:"1px solid rgba(255,255,255,0.08)" }}>
                    {selected.photoUrl
                      ? <img src={selected.photoUrl} alt={selected.name} className="h-full w-full object-cover" />
                      : <User style={{ width:32, height:32, color:"rgba(255,255,255,0.2)" }} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5">
                      <h2 className="font-serif text-2xl">{selected.name}</h2>
                      {selected.isAiActor && <Badge className="border-0" style={{ background:"rgba(212,175,55,0.15)", color:"#D4AF37" }}><Star className="h-3 w-3 mr-1" />AI Actor</Badge>}
                    </div>
                    <div className="text-sm text-muted-foreground">{selected.role || "Character"} {selected.nationality ? `· ${selected.nationality}` : ""}</div>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {selected.arcType && <Badge className="text-[10px] border-0" style={{ background:"rgba(99,102,241,0.1)", color:"#818cf8" }}>{selected.arcType}</Badge>}
                      {selected.moralAlignment && <Badge className="text-[10px] border-0" style={{ background:"rgba(255,255,255,0.07)", color:"rgba(255,255,255,0.5)" }}>{selected.moralAlignment}</Badge>}
                      {selected.voiceId && <Badge className="text-[10px] border-0" style={{ background:"rgba(74,222,128,0.1)", color:"#4ade80" }}><Mic className="h-2.5 w-2.5 mr-1" />Voice set</Badge>}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="gap-2 h-8 text-xs border-white/10 shrink-0" onClick={() => setEditChar(selected)}>
                    <Edit3 className="h-3.5 w-3.5" />Edit
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Description */}
                  {selected.description && (
                    <div className="rounded-xl border px-4 py-3 space-y-1.5" style={{ borderColor:"rgba(255,255,255,0.07)", background:"rgba(255,255,255,0.02)" }}>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Description</p>
                      <p className="text-sm leading-relaxed">{selected.description}</p>
                    </div>
                  )}
                  {/* Backstory */}
                  {selected.backstory && (
                    <div className="rounded-xl border px-4 py-3 space-y-1.5" style={{ borderColor:"rgba(255,255,255,0.07)", background:"rgba(255,255,255,0.02)" }}>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Backstory</p>
                      <p className="text-sm leading-relaxed line-clamp-4">{selected.backstory}</p>
                    </div>
                  )}
                  {/* Voice */}
                  <div className="rounded-xl border px-4 py-3 space-y-2" style={{ borderColor:"rgba(99,102,241,0.15)", background:"rgba(99,102,241,0.03)" }}>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Voice Profile</p>
                    {selected.voiceId ? (
                      <div className="flex items-center gap-2">
                        <Volume2 className="h-4 w-4" style={{ color:"#818cf8" }} />
                        <div>
                          <div className="text-xs font-semibold">Custom voice assigned</div>
                          <div className="text-[10px] text-muted-foreground">{selected.voiceType || "ElevenLabs voice"}</div>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs text-muted-foreground">{selected.voiceType || "No voice assigned"}</p>
                        <Button size="sm" variant="ghost" className="gap-2 h-7 text-xs mt-1 text-indigo-400" onClick={() => setEditChar(selected)}>
                          <Mic className="h-3 w-3" />Assign voice →
                        </Button>
                      </div>
                    )}
                    {selected.speechPattern && <p className="text-xs text-muted-foreground italic">"{selected.speechPattern}"</p>}
                  </div>
                  {/* Motivations */}
                  {selected.motivations && (
                    <div className="rounded-xl border px-4 py-3 space-y-1.5" style={{ borderColor:"rgba(255,255,255,0.07)", background:"rgba(255,255,255,0.02)" }}>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Motivations</p>
                      <p className="text-sm leading-relaxed">{selected.motivations}</p>
                    </div>
                  )}
                </div>

                {/* Navigate to Dubbing */}
                {hasProject && (
                  <Link href={`/projects/${projectId}/dubbing`}>
                    <div className="rounded-xl border px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-white/5 transition-colors" style={{ borderColor:"rgba(212,175,55,0.15)" }}>
                      <Mic className="h-5 w-5 shrink-0" style={{ color:"#D4AF37" }} />
                      <div className="flex-1">
                        <div className="text-sm font-semibold">Dub this character's dialogue</div>
                        <div className="text-xs text-muted-foreground">Go to Dubbing Studio →</div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>

        {hasProject && <NextStageCTA projectId={projectId} currentStage={2} />}

        {/* Create dialog */}
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <CharacterDialog projectId={projectId || undefined} onClose={() => setShowCreate(false)} onSaved={onSaved} />
        </Dialog>

        {/* Edit dialog */}
        <Dialog open={!!editChar} onOpenChange={open => !open && setEditChar(null)}>
          {editChar && (
            <CharacterDialog char={editChar} projectId={projectId || undefined}
              onClose={() => setEditChar(null)} onSaved={onSaved} />
          )}
        </Dialog>

        {/* Delete confirm */}
        <Dialog open={deleteConfirm !== null} onOpenChange={open => !open && setDeleteConfirm(null)}>
          <DialogContent className="max-w-sm" style={{ background:"#0c0b18", borderColor:"rgba(255,255,255,0.1)" }}>
            <DialogHeader><DialogTitle>Delete character?</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">This cannot be undone. All scene references to this character will be unlinked.</p>
            <div className="flex gap-2 mt-2">
              <Button variant="outline" className="flex-1 border-white/10" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
              <Button className="flex-1 bg-red-500/80 hover:bg-red-500 text-white" onClick={() => deleteConfirm && handleDelete(deleteConfirm)} disabled={deleting}>
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  export default function Characters() {
    return (
      <SubscriptionGate feature="Characters" featureKey="canUseCharacters" requiredTier="indie">
        <CharactersInner />
      </SubscriptionGate>
    );
  }
  