import { useState, useRef, useEffect } from "react";
  import { useParams, Link } from "wouter";
  import { trpc } from "@/lib/trpc";
  import { Button } from "@/components/ui/button";
  import { Slider } from "@/components/ui/slider";
  import { Badge } from "@/components/ui/badge";
  import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
  import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
  import { toast } from "sonner";
  import {
    Volume2, VolumeX, Music, Mic, Zap, Wind, Radio,
    Play, Pause, SkipBack, ChevronLeft, Save, RotateCcw,
    Headphones, Waves, SlidersHorizontal, Lock, Unlock,
  } from "lucide-react";

  type TrackId = "dialogue" | "music" | "sfx" | "ambient" | "voiceover";

  interface Track {
    id: TrackId;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    defaultVolume: number;
  }

  const TRACKS: Track[] = [
    { id: "dialogue",  label: "Dialogue",   icon: Mic,    color: "#D4AF37", defaultVolume: 85 },
    { id: "music",     label: "Music",      icon: Music,  color: "#7C9FE4", defaultVolume: 60 },
    { id: "sfx",       label: "SFX",        icon: Zap,    color: "#E47C7C", defaultVolume: 70 },
    { id: "ambient",   label: "Ambient",    icon: Wind,   color: "#7CE47C", defaultVolume: 45 },
    { id: "voiceover", label: "Voice-over", icon: Radio,  color: "#C17CE4", defaultVolume: 80 },
  ];

  interface TrackState {
    volume: number;
    pan: number;
    muted: boolean;
    solo: boolean;
    fadeIn: number;
    fadeOut: number;
    locked: boolean;
  }

  type MixState = Record<TrackId, TrackState>;

  function defaultMix(): MixState {
    return Object.fromEntries(TRACKS.map(t => [t.id, {
      volume: t.defaultVolume,
      pan: 0,
      muted: false,
      solo: false,
      fadeIn: 0,
      fadeOut: 0,
      locked: false,
    }])) as MixState;
  }

  const MASTER_PRESETS: Array<{ label: string; values: Partial<Record<TrackId, Partial<TrackState>>> }> = [
    { label: "Balanced",       values: { dialogue:{volume:85}, music:{volume:60}, sfx:{volume:70}, ambient:{volume:45}, voiceover:{volume:80} } },
    { label: "Cinema",         values: { dialogue:{volume:90}, music:{volume:75}, sfx:{volume:65}, ambient:{volume:30}, voiceover:{volume:85} } },
    { label: "Documentary",    values: { dialogue:{volume:95}, music:{volume:40}, sfx:{volume:50}, ambient:{volume:55}, voiceover:{volume:90} } },
    { label: "Action / Fight", values: { dialogue:{volume:70}, music:{volume:80}, sfx:{volume:90}, ambient:{volume:35}, voiceover:{volume:60} } },
    { label: "Dialogue Heavy", values: { dialogue:{volume:95}, music:{volume:30}, sfx:{volume:40}, ambient:{volume:25}, voiceover:{volume:90} } },
    { label: "Music Video",    values: { dialogue:{volume:50}, music:{volume:95}, sfx:{volume:55}, ambient:{volume:20}, voiceover:{volume:60} } },
    { label: "Horror / Dread", values: { dialogue:{volume:80}, music:{volume:65}, sfx:{volume:85}, ambient:{volume:70}, voiceover:{volume:75} } },
    { label: "Silent / Score", values: { dialogue:{volume:20}, music:{volume:90}, sfx:{volume:50}, ambient:{volume:60}, voiceover:{volume:15} } },
  ];

  function VUMeter({ level, muted }: { level: number; muted: boolean }) {
    const bars = 12;
    return (
      <div className="flex gap-[2px] h-16 items-end">
        {Array.from({ length: bars }).map((_, i) => {
          const threshold = ((i + 1) / bars) * 100;
          const active = !muted && threshold <= level;
          const color = i >= 10 ? "#ef4444" : i >= 8 ? "#f59e0b" : "#22c55e";
          return (
            <div key={i} className="w-1.5 rounded-t-[1px] transition-all duration-100"
              style={{ height: `${((i + 1) / bars) * 100}%`, background: active ? color : "rgba(255,255,255,0.08)" }} />
          );
        })}
      </div>
    );
  }

  export default function AudioMixer() {
    const { projectId } = useParams<{ projectId: string }>();
    const pid = Number(projectId);

    const utils = trpc.useUtils();
    const { data: scenes = [] } = trpc.scene.listByProject.useQuery({ projectId: pid }, { enabled: !!pid });
    const mixSettingsQuery = trpc.filmPost.getMixSettings.useQuery({ projectId: pid }, { enabled: Number.isInteger(pid) && pid > 0 });

    const [selectedSceneId, setSelectedSceneId] = useState<number | null>(null);
    const [mix, setMix] = useState<MixState>(defaultMix);
    const [masterVolume, setMasterVolume] = useState(85);
    const [isPlaying, setIsPlaying] = useState(false);
    const [elapsed, setElapsed] = useState(0);
    const [dirty, setDirty] = useState(false);
    const [savedPreset, setSavedPreset] = useState<string>("Balanced");
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const hydratedSettingsId = useRef<number | null>(null);

    const selectedScene = scenes.find(s => s.id === selectedSceneId);

    const saveMutation = trpc.filmPost.saveMixSettings.useMutation({
      onSuccess: () => {
        setDirty(false);
        utils.filmPost.getMixSettings.invalidate({ projectId: pid });
        toast.success("Project mix saved.", { description: "These levels and channel settings will be available when the project is reopened." });
      },
      onError: (error) => toast.error(error.message || "The mix could not be saved."),
    });
    const resetMutation = trpc.filmPost.resetMixSettings.useMutation({
      onSuccess: () => {
        setMix(defaultMix());
        setMasterVolume(85);
        setSavedPreset("Balanced");
        setDirty(false);
        hydratedSettingsId.current = null;
        utils.filmPost.getMixSettings.invalidate({ projectId: pid });
        toast.success("Project mix reset to defaults.");
      },
      onError: (error) => toast.error(error.message || "The mix could not be reset."),
    });

    useEffect(() => {
      if (scenes.length > 0 && !selectedSceneId) setSelectedSceneId(scenes[0].id);
    }, [scenes, selectedSceneId]);

    useEffect(() => {
      const settings = mixSettingsQuery.data;
      if (!settings || hydratedSettingsId.current === settings.id) return;
      let details: any = {};
      try {
        details = settings.notes ? JSON.parse(settings.notes) : {};
      } catch {
        details = {};
      }
      const detailedTracks = details?.tracks && typeof details.tracks === "object" ? details.tracks : {};
      setMix((current) => ({
        ...current,
        dialogue: { ...current.dialogue, ...detailedTracks.dialogue, volume: Math.round(Number(settings.dialogueBus ?? 0.85) * 100) },
        music: { ...current.music, ...detailedTracks.music, volume: Math.round(Number(settings.musicBus ?? 0.6) * 100) },
        sfx: { ...current.sfx, ...detailedTracks.sfx, volume: Math.round(Number(settings.effectsBus ?? 0.7) * 100) },
        ambient: { ...current.ambient, ...detailedTracks.ambient },
        voiceover: { ...current.voiceover, ...detailedTracks.voiceover },
      }));
      setMasterVolume(Math.round(Number(settings.masterVolume ?? 0.85) * 100));
      setSavedPreset(typeof details?.preset === "string" ? details.preset : "Balanced");
      if (Number.isInteger(details?.selectedSceneId)) setSelectedSceneId(details.selectedSceneId);
      hydratedSettingsId.current = settings.id;
      setDirty(false);
    }, [mixSettingsQuery.data]);

    useEffect(() => {
      if (isPlaying) {
        timerRef.current = setInterval(() => setElapsed(e => e + 0.1), 100);
      } else {
        if (timerRef.current) clearInterval(timerRef.current);
      }
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [isPlaying]);

    const setTrack = (id: TrackId, patch: Partial<TrackState>) => {
      if (mix[id].locked) return;
      setMix(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));
      setDirty(true);
    };

    const toggleMute  = (id: TrackId) => setTrack(id, { muted: !mix[id].muted });
    const toggleSolo  = (id: TrackId) => {
      const anySolo = Object.values(mix).some(t => t.solo);
      const isSolo  = mix[id].solo;
      if (!anySolo || isSolo) setTrack(id, { solo: !isSolo });
      else setTrack(id, { solo: !isSolo });
    };
    const toggleLock  = (id: TrackId) => setMix(prev => ({ ...prev, [id]: { ...prev[id], locked: !prev[id].locked } }));

    const applyPreset = (label: string) => {
      const preset = MASTER_PRESETS.find(p => p.label === label);
      if (!preset) return;
      setMix(prev => {
        const next = { ...prev };
        for (const [id, patch] of Object.entries(preset.values)) {
          if (!next[id as TrackId].locked) next[id as TrackId] = { ...next[id as TrackId], ...patch };
        }
        return next;
      });
      setSavedPreset(label);
      setDirty(true);
    };

    const handleSave = () => {
      if (!Number.isInteger(pid) || pid <= 0) {
        toast.error("A valid project is required before saving the mix.");
        return;
      }
      saveMutation.mutate({
        projectId: pid,
        dialogueBus: mix.dialogue.volume / 100,
        musicBus: mix.music.volume / 100,
        effectsBus: mix.sfx.volume / 100,
        masterVolume: masterVolume / 100,
        notes: JSON.stringify({
          version: 1,
          preset: savedPreset,
          selectedSceneId,
          tracks: mix,
        }),
      });
    };

    const handleReset = () => {
      if (!Number.isInteger(pid) || pid <= 0) return;
      resetMutation.mutate({ projectId: pid });
    };

    const anySolo = Object.values(mix).some(t => t.solo);

    const effectiveVolume = (id: TrackId) => {
      if (mix[id].muted) return 0;
      if (anySolo && !mix[id].solo) return 0;
      return (mix[id].volume / 100) * (masterVolume / 100) * 100;
    };

    const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2,"0")}:${String(Math.floor(s % 60)).padStart(2,"0")}`;

    return (
      <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href={`/projects/${projectId}/cutting-room`}>
              <Button variant="ghost" size="icon" className="h-8 w-8"><ChevronLeft className="h-4 w-4" /></Button>
            </Link>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-amber-500/80">Post-Production</div>
              <h1 className="font-serif text-2xl gradient-text-gold flex items-center gap-2">
                <Headphones className="h-5 w-5" style={{ color: "#D4AF37" }} />
                Audio Mixer
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleReset} disabled={resetMutation.isPending || mixSettingsQuery.isLoading} className="gap-1.5 border-border/40 h-8 text-xs">
              <RotateCcw className="h-3.5 w-3.5" />{resetMutation.isPending ? "Resetting…" : "Reset"}
            </Button>
            <Button size="sm" onClick={handleSave} disabled={!dirty || saveMutation.isPending || mixSettingsQuery.isLoading}
              className="gap-1.5 h-8 text-xs text-black font-semibold"
              style={{ background: dirty ? "linear-gradient(135deg,#D4AF37,#F5D97E)" : undefined }}>
              <Save className="h-3.5 w-3.5" />{saveMutation.isPending ? "Saving…" : "Save Mix"}
            </Button>
          </div>
        </div>

        {/* Scene selector + Preset */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex-1">
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">Scene</label>
            <Select value={selectedSceneId?.toString() ?? ""} onValueChange={v => setSelectedSceneId(Number(v))}>
              <SelectTrigger className="h-9 bg-background/50 border-border/50 focus:ring-amber-500/30">
                <SelectValue placeholder="Select a scene…" />
              </SelectTrigger>
              <SelectContent>
                {scenes.map(s => (
                  <SelectItem key={s.id} value={s.id.toString()}>
                    Scene {s.orderIndex ?? s.id}: {s.title || s.location || "Untitled"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:w-52">
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">Mix Preset</label>
            <Select value={savedPreset} onValueChange={applyPreset}>
              <SelectTrigger className="h-9 bg-background/50 border-border/50 focus:ring-amber-500/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MASTER_PRESETS.map(p => <SelectItem key={p.label} value={p.label}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_260px] gap-5">
          {/* Mixer board */}
          <Card style={{ border:"1px solid rgba(212,175,55,0.15)", background:"rgba(10,10,10,0.6)" }}>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4" style={{ color:"#D4AF37" }} /> Channel Strip
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="flex gap-3 overflow-x-auto pb-2">
                {TRACKS.map(track => {
                  const ts = mix[track.id];
                  const effVol = effectiveVolume(track.id);
                  const Icon = track.icon as React.ComponentType<React.SVGProps<SVGSVGElement>>;
                  return (
                    <div key={track.id} className="flex flex-col items-center gap-2 min-w-[84px] flex-1"
                      style={{ opacity: (anySolo && !ts.solo && !ts.muted) ? 0.35 : 1, transition: "opacity .2s" }}>
                      {/* Track header */}
                      <div className="flex flex-col items-center gap-1 w-full">
                        <div className="h-8 w-8 rounded-full flex items-center justify-center border"
                          style={{ background: ts.muted ? "rgba(255,255,255,0.04)" : `${track.color}18`, borderColor: ts.muted ? "rgba(255,255,255,0.1)" : `${track.color}40` }}>
                          <Icon className="h-3.5 w-3.5" style={{ color: ts.muted ? "#555" : track.color }} />
                        </div>
                        <span className="text-[10px] font-medium tracking-wide" style={{ color: ts.muted ? "#555" : track.color }}>{track.label}</span>
                      </div>

                      {/* VU meter */}
                      <VUMeter level={effVol} muted={ts.muted} />

                      {/* Volume fader */}
                      <div className="flex flex-col items-center gap-1.5 w-full">
                        <span className="text-[10px] text-muted-foreground tabular-nums">{ts.volume}%</span>
                        <div className="h-28 flex items-center justify-center">
                          <input type="range" min={0} max={100} value={ts.volume} {...({orient:"vertical"} as any)}
                            className="appearance-none w-2 h-24 rounded-full cursor-pointer"
                            style={{ writingMode: "vertical-lr", direction: "rtl", accentColor: track.color }}
                            disabled={ts.locked}
                            onChange={e => setTrack(track.id, { volume: Number(e.target.value) })} />
                        </div>
                      </div>

                      {/* Pan */}
                      <div className="w-full space-y-0.5">
                        <span className="text-[9px] text-muted-foreground block text-center">
                          Pan {ts.pan === 0 ? "C" : ts.pan > 0 ? `R${ts.pan}` : `L${Math.abs(ts.pan)}`}
                        </span>
                        <Slider min={-50} max={50} step={1} value={[ts.pan]} disabled={ts.locked}
                          onValueChange={([v]) => setTrack(track.id, { pan: v })}
                          className="h-1.5" />
                      </div>

                      {/* Fade in/out */}
                      <div className="w-full grid grid-cols-2 gap-1">
                        <div className="space-y-0.5">
                          <span className="text-[9px] text-muted-foreground block text-center">In</span>
                          <Select value={ts.fadeIn.toString()} onValueChange={v => setTrack(track.id, { fadeIn: Number(v) })}>
                            <SelectTrigger className="h-6 text-[9px] px-1.5 bg-background/50 border-border/40"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {[0,0.5,1,2,3,5].map(v => <SelectItem key={v} value={v.toString()} className="text-xs">{v === 0 ? "None" : `${v}s`}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[9px] text-muted-foreground block text-center">Out</span>
                          <Select value={ts.fadeOut.toString()} onValueChange={v => setTrack(track.id, { fadeOut: Number(v) })}>
                            <SelectTrigger className="h-6 text-[9px] px-1.5 bg-background/50 border-border/40"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {[0,0.5,1,2,3,5].map(v => <SelectItem key={v} value={v.toString()} className="text-xs">{v === 0 ? "None" : `${v}s`}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Mute / Solo / Lock */}
                      <div className="flex gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button onClick={() => toggleMute(track.id)}
                              className="h-6 w-6 rounded text-[10px] font-bold border transition-colors"
                              style={{ borderColor: ts.muted ? "#ef444460" : "rgba(255,255,255,0.12)", background: ts.muted ? "rgba(239,68,68,0.15)" : "transparent", color: ts.muted ? "#ef4444" : "#888" }}>
                              M
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Mute</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button onClick={() => toggleSolo(track.id)}
                              className="h-6 w-6 rounded text-[10px] font-bold border transition-colors"
                              style={{ borderColor: ts.solo ? "#D4AF3760" : "rgba(255,255,255,0.12)", background: ts.solo ? "rgba(212,175,55,0.15)" : "transparent", color: ts.solo ? "#D4AF37" : "#888" }}>
                              S
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Solo</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button onClick={() => toggleLock(track.id)}
                              className="h-6 w-6 rounded border transition-colors flex items-center justify-center"
                              style={{ borderColor: ts.locked ? "#7C9FE440" : "rgba(255,255,255,0.12)", background: ts.locked ? "rgba(124,159,228,0.15)" : "transparent" }}>
                              {ts.locked ? <Lock className="h-3 w-3 text-[#7C9FE4]" /> : <Unlock className="h-3 w-3 text-[#555]" />}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>{ts.locked ? "Unlock" : "Lock"}</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  );
                })}

                {/* Master bus */}
                <div className="flex flex-col items-center gap-2 min-w-[84px] border-l border-amber-500/20 pl-3">
                  <div className="h-8 w-8 rounded-full flex items-center justify-center border"
                    style={{ background:"rgba(212,175,55,0.1)", borderColor:"rgba(212,175,55,0.3)" }}>
                    <Waves className="h-3.5 w-3.5" style={{ color:"#D4AF37" }} />
                  </div>
                  <span className="text-[10px] font-medium tracking-wide" style={{ color:"#D4AF37" }}>Master</span>
                  <VUMeter level={masterVolume} muted={false} />
                  <div className="flex flex-col items-center gap-1.5 w-full">
                    <span className="text-[10px] text-muted-foreground tabular-nums">{masterVolume}%</span>
                    <div className="h-28 flex items-center justify-center">
                      <input type="range" min={0} max={100} value={masterVolume} {...({orient:"vertical"} as any)}
                        className="appearance-none w-2 h-24 rounded-full cursor-pointer"
                        style={{ writingMode: "vertical-lr", direction: "rtl", accentColor: "#D4AF37" }}
                        onChange={e => { setMasterVolume(Number(e.target.value)); setDirty(true); }} />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Right panel — transport + scene info */}
          <div className="space-y-4">
            {/* Transport controls */}
            <Card style={{ border:"1px solid rgba(212,175,55,0.15)", background:"rgba(10,10,10,0.6)" }}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Transport</span>
                  <span className="text-xs text-muted-foreground font-mono">{formatTime(elapsed)}</span>
                </div>
                <div className="flex items-center justify-center gap-3">
                  <Button variant="outline" size="icon" className="h-9 w-9 border-border/40" onClick={() => setElapsed(0)}>
                    <SkipBack className="h-4 w-4" />
                  </Button>
                  <Button size="icon" className="h-11 w-11 rounded-full"
                    style={{ background:"linear-gradient(135deg,#D4AF37,#F5D97E)", color:"black" }}
                    onClick={() => setIsPlaying(p => !p)}>
                    {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
                  </Button>
                  <Button variant="outline" size="icon" className="h-9 w-9 border-border/40" onClick={() => { setIsPlaying(false); setElapsed(0); }}>
                    <Volume2 className="h-4 w-4" />
                  </Button>
                </div>
                {/* Waveform placeholder */}
                <div className="rounded-lg border border-border/30 h-12 flex items-center px-3 gap-0.5 overflow-hidden"
                  style={{ background:"rgba(255,255,255,0.02)" }}>
                  {Array.from({ length: 60 }).map((_, i) => (
                    <div key={i} className="flex-1 rounded-full"
                      style={{ height: `${28 + Math.sin(i * 0.8) * 14 + Math.sin(i * 2.17) * 8}%`, background: isPlaying && Math.floor(elapsed * 10) % 60 === i ? "#D4AF37" : "rgba(212,175,55,0.3)", transition:"background .1s" }} />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Scene info */}
            {selectedScene && (
              <Card style={{ border:"1px solid rgba(212,175,55,0.15)", background:"rgba(10,10,10,0.6)" }}>
                <CardContent className="p-4 space-y-2">
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Selected Scene</span>
                  <p className="text-sm font-medium">{selectedScene.title || selectedScene.location || "Untitled"}</p>
                  {selectedScene.mood && <Badge className="text-[10px] border-amber-500/30 text-amber-400 bg-amber-500/10">{selectedScene.mood}</Badge>}
                  {selectedScene.location && <p className="text-xs text-muted-foreground">{selectedScene.location}</p>}
                </CardContent>
              </Card>
            )}

            {/* Quick links */}
            <Card style={{ border:"1px solid rgba(212,175,55,0.15)", background:"rgba(10,10,10,0.6)" }}>
              <CardContent className="p-4 space-y-1.5">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground block mb-2">Related Tools</span>
                {[
                  { label: "Sound Effects", href: `/projects/${projectId}/sound-effects` },
                  { label: "Music Score",   href: `/projects/${projectId}/music-score`   },
                  { label: "Dubbing Studio",href: `/projects/${projectId}/dubbing`  },
                  { label: "Cutting Room",  href: `/projects/${projectId}/cutting-room`  },
                ].map(l => (
                  <Link key={l.label} href={l.href}>
                    <div className="text-xs text-muted-foreground hover:text-amber-400 transition-colors py-0.5 cursor-pointer"
                      style={{ borderBottom:"1px solid rgba(255,255,255,0.04)" }}>{l.label} →</div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }
  