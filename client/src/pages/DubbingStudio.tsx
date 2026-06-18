import { useState, useRef, useEffect } from "react";
  import { trpc } from "@/lib/trpc";
  import { useParams, useLocation, Link } from "wouter";
  import { useAuth } from "@/_core/hooks/useAuth";
  import { Button } from "@/components/ui/button";
  import { Badge } from "@/components/ui/badge";
  import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
  import { Textarea } from "@/components/ui/textarea";
  import { toast } from "sonner";
  import {
    ArrowLeft, Mic, Globe2, Play, Pause, Volume2, Loader2, Sparkles,
    Save, RefreshCw, Music2, Wand2, CheckCircle2, Info, Upload,
  } from "lucide-react";
  import { getLoginUrl } from "@/const";
  import { NextStageCTA } from "@/components/NextStageCTA";
  import { SubscriptionGate } from "@/components/SubscriptionGate";

  const LANGUAGES = [
    { code: "en", label: "English" }, { code: "es", label: "Spanish" },
    { code: "fr", label: "French" }, { code: "de", label: "German" },
    { code: "it", label: "Italian" }, { code: "pt", label: "Portuguese" },
    { code: "ru", label: "Russian" }, { code: "ja", label: "Japanese" },
    { code: "ko", label: "Korean" }, { code: "zh", label: "Chinese (Mandarin)" },
    { code: "ar", label: "Arabic" }, { code: "hi", label: "Hindi" },
    { code: "nl", label: "Dutch" }, { code: "pl", label: "Polish" },
    { code: "sv", label: "Swedish" }, { code: "tr", label: "Turkish" },
    { code: "uk", label: "Ukrainian" }, { code: "id", label: "Indonesian" },
    { code: "fi", label: "Finnish" }, { code: "no", label: "Norwegian" },
    { code: "da", label: "Danish" }, { code: "cs", label: "Czech" },
    { code: "ro", label: "Romanian" }, { code: "hu", label: "Hungarian" },
    { code: "el", label: "Greek" }, { code: "he", label: "Hebrew" },
    { code: "vi", label: "Vietnamese" }, { code: "th", label: "Thai" },
    { code: "ms", label: "Malay" }, { code: "tl", label: "Filipino" },
  ];

  const VOICES = [
    { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel",  desc: "Calm, professional",        gender: "F", accent: "American" },
    { id: "AZnzlk1XvdvUeBnXmlld", name: "Domi",    desc: "Strong, confident",          gender: "F", accent: "American" },
    { id: "EXAVITQu4vr4xnSDxMaL", name: "Bella",   desc: "Soft, warm storytelling",    gender: "F", accent: "American" },
    { id: "XrExE9yKIg1WjnnlVkGX", name: "Matilda", desc: "Warm, cozy, friendly",       gender: "F", accent: "American" },
    { id: "jBpfuIE2acCO8z3wKNLl", name: "Gigi",    desc: "Playful, young",             gender: "F", accent: "American" },
    { id: "oWAxZDx7w5VEj9dCyTzz", name: "Grace",   desc: "Gentle, Southern US",        gender: "F", accent: "American" },
    { id: "ErXwobaYiN019PkySvjV", name: "Antoni",  desc: "Well-rounded, smooth",       gender: "M", accent: "American" },
    { id: "TxGEqnHWrfWFTfGW9XjX", name: "Josh",    desc: "Deep, narrative",            gender: "M", accent: "American" },
    { id: "VR6AewLTigWG4xSOukaG", name: "Arnold",  desc: "Crisp, authoritative",       gender: "M", accent: "American" },
    { id: "pNInz6obpgDQGcFmaJgB", name: "Adam",    desc: "Deep, narrative, news",      gender: "M", accent: "American" },
    { id: "onwK4e9ZLuTAKqWW03F9", name: "Daniel",  desc: "Deep, authoritative",        gender: "M", accent: "British" },
    { id: "N2lVS1w4EtoT3dr4eOWO", name: "Callum",  desc: "Intense, grounded",          gender: "M", accent: "British" },
    { id: "CYw3kZ02Hs0563khs1Fj", name: "Dave",    desc: "Relaxed, conversational",    gender: "M", accent: "British" },
    { id: "IKne3meq5aSn9XLyUdCD", name: "Charlie", desc: "Natural, casual",            gender: "M", accent: "Australian" },
    { id: "2EiwWnXFnvU5JabPnv8n", name: "Clyde",   desc: "Gravelly, veteran",          gender: "M", accent: "American" },
    { id: "g5CIjZEefAph4nQFvHAz", name: "Ethan",   desc: "Whispery, ASMR-quality",     gender: "M", accent: "American" },
  ];

  const LIP_SYNC_MODES = [
    { id: "none",    label: "None",         desc: "Audio only — no visual sync" },
    { id: "overlay", label: "Audio Overlay",desc: "Dub audio replaces original track" },
    { id: "d-id",    label: "Talking Head", desc: "D-ID lip-syncs character to audio (Pro)" },
  ];

  function AudioPlayer({ base64, label }: { base64: string; label: string }) {
    const [playing, setPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
      const src = `data:audio/mpeg;base64,${base64}`;
      audioRef.current = new Audio(src);
      audioRef.current.onended = () => setPlaying(false);
      return () => { audioRef.current?.pause(); };
    }, [base64]);

    const toggle = () => {
      if (!audioRef.current) return;
      if (playing) { audioRef.current.pause(); setPlaying(false); }
      else { audioRef.current.play(); setPlaying(true); }
    };

    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl border"
        style={{ borderColor: "rgba(212,175,55,0.2)", background: "rgba(212,175,55,0.04)" }}>
        <button onClick={toggle}
          className="h-9 w-9 rounded-full flex items-center justify-center transition-all"
          style={{ background: "linear-gradient(135deg,#D4AF37,#b8960c)" }}>
          {playing
            ? <Pause  style={{ width:14, height:14, color:"#000" }} />
            : <Play   style={{ width:14, height:14, color:"#000", marginLeft:1 }} />}
        </button>
        <div>
          <div className="text-xs font-semibold" style={{ color:"#D4AF37" }}>{label}</div>
          <div className="text-[10px] text-muted-foreground">Click to preview dubbed audio</div>
        </div>
        <Volume2 className="ml-auto h-4 w-4 text-muted-foreground" />
      </div>
    );
  }

  function DubbingStudioInner() {
    const { user, loading: authLoading } = useAuth();
    const params = useParams<{ projectId: string }>();
    const [, navigate] = useLocation();
    const projectId = Number(params.projectId);
    const hasProject = !!projectId && !!user;

    const [selectedSceneId, setSelectedSceneId] = useState<number | null>(null);
    const [targetLanguage, setTargetLanguage] = useState("es");
    const [selectedVoiceId, setSelectedVoiceId] = useState(VOICES[0].id);
    const [editableText, setEditableText] = useState("");
    const [translatedText, setTranslatedText] = useState("");
    const [generatedAudioB64, setGeneratedAudioB64] = useState<string | null>(null);
    const [lipSyncMode, setLipSyncMode] = useState("overlay");
    const [tab, setTab] = useState("dub");
    const [translating, setTranslating] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [saving, setSaving] = useState(false);

    const { data: project } = trpc.project.get.useQuery({ id: projectId }, { enabled: hasProject });
    const { data: scenes  } = trpc.scene.listByProject.useQuery({ projectId }, { enabled: hasProject });
    const generateDub       = trpc.dubbing.generateDub.useMutation();
    const translateText     = trpc.dubbing.translateText.useMutation();
    const applyLipSync      = trpc.dubbing.applyLipSync.useMutation();
    const utils             = trpc.useUtils();

    const sortedScenes = (scenes ?? []).slice().sort((a: any, b: any) => (a.orderIndex||0)-(b.orderIndex||0));
    const selectedScene = sortedScenes.find((s: any) => s.id === selectedSceneId) as any;

    useEffect(() => {
      if (selectedScene) {
        setEditableText(selectedScene.dialogueText || selectedScene.description || "");
        setTranslatedText("");
        setGeneratedAudioB64(null);
      }
    }, [selectedSceneId]);

    useEffect(() => {
      if (sortedScenes.length && !selectedSceneId) setSelectedSceneId((sortedScenes[0] as any).id);
    }, [scenes]);

    if (!user && !authLoading) { window.location.href = getLoginUrl(); return null; }

    async function handleTranslate() {
      if (!editableText.trim()) { toast.error("No dialogue text to translate"); return; }
      setTranslating(true);
      try {
        const res = await translateText.mutateAsync({ text: editableText, targetLanguage, sourceLanguage: "en" });
        setTranslatedText(res.translatedText);
        toast.success("Translation complete");
      } catch (e: any) { toast.error(e.message || "Translation failed"); }
      finally { setTranslating(false); }
    }

    async function handleGenerateDub() {
      const text = translatedText || editableText;
      if (!text.trim()) { toast.error("Enter dialogue text first"); return; }
      setGenerating(true);
      try {
        const res = await generateDub.mutateAsync({ text, voiceId: selectedVoiceId, targetLanguage });
        setGeneratedAudioB64(res.audioBase64);
        toast.success("Dubbed audio generated");
      } catch (e: any) { toast.error(e.message || "Generation failed"); }
      finally { setGenerating(false); }
    }

    async function handleSave() {
      if (!selectedSceneId || !generatedAudioB64) { toast.error("Generate audio first"); return; }
      setSaving(true);
      try {
        await applyLipSync.mutateAsync({ sceneId: selectedSceneId, audioBase64: generatedAudioB64, mode: lipSyncMode as any });
        await utils.scene.listByProject.invalidate({ projectId });
        toast.success("Lip sync saved to scene");
      } catch (e: any) { toast.error(e.message || "Save failed"); }
      finally { setSaving(false); }
    }

    const voice = VOICES.find(v => v.id === selectedVoiceId);
    const langLabel = LANGUAGES.find(l => l.code === targetLanguage)?.label || targetLanguage;

    return (
      <div className="min-h-screen" style={{ background:"linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)" }}>
        {/* Header */}
        <div className="border-b sticky top-0 z-20" style={{ borderColor:"rgba(255,255,255,0.07)", background:"rgba(7,7,14,0.97)", backdropFilter:"blur(24px)" }}>
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(hasProject ? `/projects/${projectId}` : "/dashboard")} className="gap-2 text-muted-foreground h-8">
              <ArrowLeft className="h-4 w-4" />Back
            </Button>
            <div className="h-5 w-px bg-border/40" />
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background:"linear-gradient(135deg,#6366f1,#4f46e5)" }}>
                <Mic style={{ width:18, height:18, color:"#fff" }} />
              </div>
              <div>
                <div className="font-bold text-sm">Dubbing Studio</div>
                <div className="text-[10px] text-muted-foreground">AI lip sync · 30 languages · ElevenLabs multilingual v2</div>
              </div>
            </div>
            {project && <Badge className="ml-2 text-[10px] border-0" style={{ background:"rgba(212,175,55,0.1)", color:"#D4AF37" }}>{project.title}</Badge>}
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-6 flex gap-5">
          {/* Left: Scene list */}
          <div className="w-64 shrink-0 space-y-1.5">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">Scenes</p>
            {sortedScenes.length === 0 && (
              <div className="rounded-xl border border-dashed py-10 flex flex-col items-center gap-2" style={{ borderColor:"rgba(255,255,255,0.07)" }}>
                <Mic className="h-8 w-8 opacity-20" />
                <p className="text-xs text-muted-foreground text-center">No scenes yet</p>
              </div>
            )}
            {sortedScenes.map((s: any, i: number) => {
              const hasDub = !!(s.lipSyncAudioUrl);
              return (
                <button key={s.id}
                  onClick={() => setSelectedSceneId(s.id)}
                  className="w-full text-left rounded-xl px-3 py-2.5 border transition-all"
                  style={{
                    borderColor: selectedSceneId===s.id ? "rgba(212,175,55,0.4)" : "rgba(255,255,255,0.06)",
                    background:  selectedSceneId===s.id ? "rgba(212,175,55,0.08)" : "rgba(255,255,255,0.02)",
                  }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold truncate">{i+1}. {s.title || "Untitled"}</span>
                    {hasDub && <CheckCircle2 className="h-3 w-3 shrink-0" style={{ color:"#4ade80" }} />}
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate mt-0.5">{s.locationType || "Interior"} · {s.mood || "—"}</p>
                </button>
              );
            })}
          </div>

          {/* Right: Dubbing panel */}
          <div className="flex-1 min-w-0 space-y-4">
            {!selectedScene ? (
              <div className="rounded-2xl border-2 border-dashed flex flex-col items-center py-24 gap-3" style={{ borderColor:"rgba(255,255,255,0.07)" }}>
                <Mic className="h-12 w-12 opacity-20" />
                <p className="text-sm">Select a scene to begin dubbing</p>
              </div>
            ) : (
              <>
                {/* Scene header */}
                <div className="rounded-xl border px-4 py-3 flex items-center justify-between" style={{ borderColor:"rgba(255,255,255,0.07)", background:"rgba(255,255,255,0.02)" }}>
                  <div>
                    <div className="font-semibold text-sm">{selectedScene.title || "Untitled Scene"}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {selectedScene.locationType || "Interior"} · {selectedScene.mood || "Neutral"} · {selectedScene.duration || 0}s
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedScene.lipSyncAudioUrl && (
                      <Badge className="text-[10px] border-0" style={{ background:"rgba(74,222,128,0.1)", color:"#4ade80" }}>Dubbed</Badge>
                    )}
                    <Badge className="text-[10px] border-0" style={{ background:"rgba(212,175,55,0.1)", color:"#D4AF37" }}>
                      {selectedScene.lipSyncMode || "No dub"}
                    </Badge>
                  </div>
                </div>

                <Tabs value={tab} onValueChange={setTab}>
                  <TabsList className="h-9 bg-white/5 border border-white/10">
                    <TabsTrigger value="dub"       className="text-xs h-7 data-[state=active]:bg-white/10">Dub</TabsTrigger>
                    <TabsTrigger value="lipsync"   className="text-xs h-7 data-[state=active]:bg-white/10">Lip Sync</TabsTrigger>
                    <TabsTrigger value="settings"  className="text-xs h-7 data-[state=active]:bg-white/10">Settings</TabsTrigger>
                  </TabsList>

                  {/* DUB TAB */}
                  <TabsContent value="dub" className="space-y-4 mt-4">
                    {/* Language + Voice selectors */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Target Language</label>
                        <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                          <SelectTrigger className="h-9 text-xs bg-white/5 border-white/10">
                            <Globe2 className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {LANGUAGES.map(l => <SelectItem key={l.code} value={l.code} className="text-xs">{l.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Voice</label>
                        <Select value={selectedVoiceId} onValueChange={setSelectedVoiceId}>
                          <SelectTrigger className="h-9 text-xs bg-white/5 border-white/10">
                            <Mic className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {VOICES.map(v => (
                              <SelectItem key={v.id} value={v.id} className="text-xs">
                                {v.name} ({v.gender}) · {v.accent}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {voice && <p className="text-[10px] text-muted-foreground pl-0.5">{voice.desc}</p>}
                      </div>
                    </div>

                    {/* Original dialogue */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Original Dialogue</label>
                        <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1.5 text-indigo-400 hover:text-indigo-300"
                          onClick={handleTranslate} disabled={translating || !editableText.trim()}>
                          {translating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Globe2 className="h-3 w-3" />}
                          {translating ? "Translating…" : `Auto-translate → ${langLabel}`}
                        </Button>
                      </div>
                      <Textarea
                        value={editableText}
                        onChange={e => setEditableText(e.target.value)}
                        placeholder="Paste or type the dialogue for this scene…"
                        className="text-xs min-h-[100px] bg-white/5 border-white/10 resize-none"
                      />
                    </div>

                    {/* Translated text */}
                    {translatedText && (
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-widest text-muted-foreground">{langLabel} Translation</label>
                        <Textarea
                          value={translatedText}
                          onChange={e => setTranslatedText(e.target.value)}
                          className="text-xs min-h-[100px] bg-indigo-950/20 border-indigo-500/20 resize-none"
                        />
                        <p className="text-[10px] text-muted-foreground">Edit the translation if needed before generating audio.</p>
                      </div>
                    )}

                    {/* Generate button */}
                    <Button className="w-full gap-2 h-10" onClick={handleGenerateDub} disabled={generating}
                      style={{ background:"linear-gradient(135deg,#6366f1,#4f46e5)", color:"#fff" }}>
                      {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                      {generating ? "Generating dubbed audio…" : `Generate Dub in ${langLabel}`}
                    </Button>

                    {/* Audio preview */}
                    {generatedAudioB64 && (
                      <div className="space-y-3">
                        <AudioPlayer base64={generatedAudioB64} label={`${langLabel} dub · ${voice?.name} voice`} />
                        <Button className="w-full gap-2 h-9" onClick={handleSave} disabled={saving}
                          style={{ background:"linear-gradient(135deg,#D4AF37,#b8960c)", color:"#000" }}>
                          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          {saving ? "Saving to scene…" : "Save Dub to Scene"}
                        </Button>
                      </div>
                    )}
                  </TabsContent>

                  {/* LIP SYNC TAB */}
                  <TabsContent value="lipsync" className="space-y-4 mt-4">
                    <div className="rounded-xl border px-4 py-3 flex items-start gap-3" style={{ borderColor:"rgba(99,102,241,0.2)", background:"rgba(99,102,241,0.04)" }}>
                      <Info className="h-4 w-4 mt-0.5 shrink-0" style={{ color:"#818cf8" }} />
                      <p className="text-xs text-muted-foreground">
                        Lip Sync replaces the original audio track with your dubbed audio. 
                        <strong className="text-white"> Talking Head</strong> mode uses D-ID to animate a character portrait in sync with the dubbed audio.
                      </p>
                    </div>
                    <div className="grid gap-3">
                      {LIP_SYNC_MODES.map(mode => (
                        <button key={mode.id}
                          onClick={() => setLipSyncMode(mode.id)}
                          className="w-full rounded-xl border px-4 py-3 text-left transition-all"
                          style={{
                            borderColor: lipSyncMode===mode.id ? "rgba(212,175,55,0.4)" : "rgba(255,255,255,0.08)",
                            background:  lipSyncMode===mode.id ? "rgba(212,175,55,0.06)" : "transparent",
                          }}>
                          <div className="flex items-center gap-2">
                            <div className="h-4 w-4 rounded-full border-2 flex items-center justify-center"
                              style={{ borderColor: lipSyncMode===mode.id ? "#D4AF37" : "rgba(255,255,255,0.2)" }}>
                              {lipSyncMode===mode.id && <div className="h-2 w-2 rounded-full" style={{ background:"#D4AF37" }} />}
                            </div>
                            <span className="text-sm font-semibold">{mode.label}</span>
                            {mode.id==="d-id" && <Badge className="text-[9px] border-0 ml-auto" style={{ background:"rgba(212,175,55,0.15)", color:"#D4AF37" }}>Pro</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 pl-6">{mode.desc}</p>
                        </button>
                      ))}
                    </div>
                    {selectedScene.lipSyncAudioUrl && (
                      <div className="rounded-xl border px-4 py-3 flex items-center gap-3" style={{ borderColor:"rgba(74,222,128,0.2)", background:"rgba(74,222,128,0.04)" }}>
                        <CheckCircle2 className="h-5 w-5 shrink-0" style={{ color:"#4ade80" }} />
                        <div>
                          <div className="text-xs font-semibold" style={{ color:"#4ade80" }}>Lip sync applied</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">Mode: {selectedScene.lipSyncMode} · Generate a new dub to replace.</div>
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  {/* SETTINGS TAB */}
                  <TabsContent value="settings" className="space-y-4 mt-4">
                    <div className="rounded-xl border px-4 py-4 space-y-3" style={{ borderColor:"rgba(255,255,255,0.07)", background:"rgba(255,255,255,0.02)" }}>
                      <p className="text-xs font-semibold">ElevenLabs Configuration</p>
                      <p className="text-xs text-muted-foreground">Dubbing uses your ElevenLabs Multilingual v2 model. Ensure your key supports multilingual generation.</p>
                      <div className="flex gap-2">
                        <Link href="/settings?tab=api-keys">
                          <Button size="sm" variant="outline" className="gap-2 h-8 text-xs border-white/10">
                            <Music2 className="h-3.5 w-3.5" />Configure API Keys
                          </Button>
                        </Link>
                      </div>
                    </div>
                    <div className="rounded-xl border px-4 py-4 space-y-2" style={{ borderColor:"rgba(255,255,255,0.07)", background:"rgba(255,255,255,0.02)" }}>
                      <p className="text-xs font-semibold">Voice Cloning</p>
                      <p className="text-xs text-muted-foreground">Clone a custom voice for any character from a 30-second audio sample. Go to the Characters page to set up voice clones.</p>
                      <Link href={hasProject ? `/projects/${projectId}/characters` : "/characters"}>
                        <Button size="sm" variant="outline" className="gap-2 h-8 text-xs border-white/10 mt-2">
                          <Upload className="h-3.5 w-3.5" />Clone a Character Voice
                        </Button>
                      </Link>
                    </div>
                  </TabsContent>
                </Tabs>
              </>
            )}
          </div>
        </div>

        {hasProject && <NextStageCTA projectId={projectId} currentStage={6} />}
      </div>
    );
  }

  export default function DubbingStudio() {
    return (
      <SubscriptionGate feature="Dubbing Studio" featureKey="canUseDubbingStudio" requiredTier="indie">
        <DubbingStudioInner />
      </SubscriptionGate>
    );
  }
  