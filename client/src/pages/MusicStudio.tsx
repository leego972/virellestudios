import { useState, useMemo, useRef, useEffect, useCallback } from "react";
  import { Button } from "@/components/ui/button";
  import { Card, CardContent } from "@/components/ui/card";
  import { Badge } from "@/components/ui/badge";
  import { Input } from "@/components/ui/input";
  import { Slider } from "@/components/ui/slider";
  import {
    ArrowLeft, Search, Music2, Play, Pause, Download, Heart, Crown,
    Clock, Star, Wand2, CheckCircle2, Volume2, Sliders, SkipBack, SkipForward, X
  } from "lucide-react";
  import { useLocation } from "wouter";
  import { toast } from "sonner";

  // SoundHelix provides 16 free royalty-free demo tracks — mapped 1:1 then wrapped
  const PREVIEW_URLS: Record<number, string> = {
    1: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    2: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    3: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    4: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    5: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
    6: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3",
    7: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3",
    8: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
    9: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3",
    10: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3",
    11: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3",
    12: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3",
    13: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3",
    14: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-14.mp3",
    15: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3",
    16: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3",
    17: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    18: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    19: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    20: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
  };

  const TRACKS = [
    { id:1,  title:"Throne of Gold",    artist:"Virelle Orchestral",  genre:"Cinematic Epic",          mood:"Triumphant", bpm:95,  duration:"3:42", tags:["orchestral","epic","hero","brass","strings"],            featured:true  },
    { id:2,  title:"Neon Abyss",        artist:"Synthetic Noir",      genre:"Electronic / Neo-Noir",   mood:"Tense",      bpm:110, duration:"4:18", tags:["electronic","noir","cyberpunk","dark","bass"]                           },
    { id:3,  title:"Sahara Dawn",       artist:"World Collective",    genre:"World / Documentary",     mood:"Inspiring",  bpm:80,  duration:"3:55", tags:["world","documentary","inspiring","ethnic","drums"]                      },
    { id:4,  title:"Last Signal",       artist:"Orbital Drift",       genre:"Sci-Fi / Space",          mood:"Melancholy", bpm:75,  duration:"5:02", tags:["sci-fi","space","atmospheric","melancholy","pads"],    featured:true  },
    { id:5,  title:"Broken Vows",       artist:"Chamber Strings",     genre:"Drama / Emotional",       mood:"Sad",        bpm:68,  duration:"3:28", tags:["strings","emotional","drama","intimate","piano"]                        },
    { id:6,  title:"The Reckoning",     artist:"Dark Matter Ensemble",genre:"Thriller / Suspense",     mood:"Suspense",   bpm:120, duration:"2:58", tags:["thriller","tension","suspense","percussion","staccato"]                 },
    { id:7,  title:"Golden Hour",       artist:"Acoustic Soul",       genre:"Indie / Feel Good",       mood:"Happy",      bpm:105, duration:"3:35", tags:["acoustic","indie","positive","guitar","uplifting"]                      },
    { id:8,  title:"War Machine",       artist:"Percussion Brigade",  genre:"Action / War",            mood:"Intense",    bpm:140, duration:"3:15", tags:["action","war","percussion","intense","drums"],         featured:true  },
    { id:9,  title:"Invisible Thread",  artist:"Ambient Waves",       genre:"Ambient / Meditation",    mood:"Peaceful",   bpm:60,  duration:"6:20", tags:["ambient","meditation","peaceful","ethereal","pads"]                     },
    { id:10, title:"Downtown Kings",    artist:"Urban Pulse",         genre:"Hip-Hop / Urban",         mood:"Confident",  bpm:90,  duration:"3:48", tags:["hip-hop","urban","confident","beats","bass"]                            },
    { id:11, title:"Children of War",   artist:"Virelle Orchestral",  genre:"Drama / Historical",      mood:"Solemn",     bpm:72,  duration:"4:05", tags:["orchestral","historical","solemn","brass","choir"]                      },
    { id:12, title:"Velocity",          artist:"Synthetic Noir",      genre:"Action / Chase",          mood:"Adrenaline", bpm:155, duration:"2:44", tags:["action","chase","fast","electronic","adrenaline"]                       },
    { id:13, title:"Monsoon Season",    artist:"World Collective",    genre:"World / Drama",           mood:"Melancholy", bpm:82,  duration:"4:30", tags:["world","rain","melancholy","ethnic","strings"]                          },
    { id:14, title:"Protocol Zero",     artist:"Orbital Drift",       genre:"Sci-Fi / Thriller",       mood:"Tense",      bpm:118, duration:"3:50", tags:["sci-fi","thriller","tense","synth","glitch"]                            },
    { id:15, title:"Old Town Grace",    artist:"Country Roads",       genre:"Country / Western",       mood:"Nostalgic",  bpm:88,  duration:"3:22", tags:["country","western","nostalgic","guitar","fiddle"]                       },
    { id:16, title:"La Serenata",       artist:"Romance Strings",     genre:"Romance / Drama",         mood:"Romantic",   bpm:65,  duration:"4:15", tags:["romance","strings","romantic","intimate","violin"]                      },
    { id:17, title:"Rise of Empires",   artist:"Dark Matter Ensemble",genre:"Fantasy / Epic",          mood:"Epic",       bpm:100, duration:"5:30", tags:["fantasy","epic","choir","brass","triumphant"],         featured:true  },
    { id:18, title:"Street Gospel",     artist:"Urban Pulse",         genre:"Gospel / Soul",           mood:"Uplifting",  bpm:95,  duration:"4:00", tags:["gospel","soul","uplifting","choir","piano"]                             },
    { id:19, title:"Polar Night",       artist:"Ambient Waves",       genre:"Ambient / Arctic",        mood:"Mysterious", bpm:55,  duration:"7:10", tags:["ambient","arctic","mysterious","drone","nature"]                        },
    { id:20, title:"Katana Storm",      artist:"Eastern Force",       genre:"Asian Fusion / Action",   mood:"Intense",    bpm:132, duration:"3:05", tags:["asian","action","taiko","intense","traditional"]                        },
  ];

  const GENRES = ["All","Cinematic Epic","Electronic / Neo-Noir","World / Documentary","Sci-Fi / Space","Drama / Emotional","Thriller / Suspense","Indie / Feel Good","Action / War","Ambient / Meditation","Hip-Hop / Urban","Fantasy / Epic","Romance / Drama"];
  const MOODS  = ["All","Triumphant","Tense","Inspiring","Melancholy","Sad","Suspense","Happy","Intense","Peaceful","Confident","Solemn","Adrenaline","Romantic","Epic","Uplifting","Mysterious"];

  function formatTime(secs: number) {
    if (!isFinite(secs)) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  export default function MusicStudio() {
    const [, setLocation] = useLocation();
    const [search, setSearch]     = useState("");
    const [genre, setGenre]       = useState("All");
    const [mood, setMood]         = useState("All");
    const [playing, setPlaying]   = useState<number | null>(null);
    const [loading, setLoading]   = useState<number | null>(null);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume]     = useState(0.8);
    const [liked, setLiked]       = useState<Set<number>>(new Set());
    const [downloaded, setDownloaded] = useState<Set<number>>(new Set());

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const rafRef   = useRef<number | null>(null);

    const currentTrack = TRACKS.find(t => t.id === playing) ?? null;

    const stopProgress = () => {
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    };

    const tickProgress = useCallback(() => {
      if (!audioRef.current) return;
      setProgress(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || 0);
      rafRef.current = requestAnimationFrame(tickProgress);
    }, []);

    const playTrack = useCallback((id: number) => {
      const url = PREVIEW_URLS[id];
      if (!url) return;

      if (playing === id) {
        if (audioRef.current?.paused === false) {
          audioRef.current.pause();
          stopProgress();
          setPlaying(null);
        }
        return;
      }

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
      stopProgress();
      setLoading(id);
      setProgress(0);

      const audio = new Audio(url);
      audio.volume = volume;
      audio.preload = "auto";
      audioRef.current = audio;

      audio.oncanplay = () => {
        setLoading(null);
        setPlaying(id);
        setDuration(audio.duration || 0);
        audio.play().catch(() => toast.error("Playback blocked — click the track to retry"));
        rafRef.current = requestAnimationFrame(tickProgress);
      };

      audio.onended = () => {
        stopProgress();
        setPlaying(null);
        setProgress(0);
        const idx = TRACKS.findIndex(t => t.id === id);
        const next = TRACKS[(idx + 1) % TRACKS.length];
        setTimeout(() => playTrack(next.id), 300);
      };

      audio.onerror = () => {
        setLoading(null);
        setPlaying(null);
        toast.error("Could not load preview for this track");
      };
    }, [playing, volume, tickProgress]);

    const skipPrev = () => {
      if (!playing) return;
      const idx = TRACKS.findIndex(t => t.id === playing);
      playTrack(TRACKS[(idx - 1 + TRACKS.length) % TRACKS.length].id);
    };

    const skipNext = () => {
      if (!playing) return;
      const idx = TRACKS.findIndex(t => t.id === playing);
      playTrack(TRACKS[(idx + 1) % TRACKS.length].id);
    };

    const seek = (val: number[]) => {
      if (!audioRef.current) return;
      audioRef.current.currentTime = val[0];
      setProgress(val[0]);
    };

    useEffect(() => {
      if (audioRef.current) audioRef.current.volume = volume;
    }, [volume]);

    useEffect(() => {
      return () => {
        audioRef.current?.pause();
        stopProgress();
      };
    }, []);

    const filtered = useMemo(() => TRACKS.filter(t => {
      const q = search.toLowerCase();
      return (!q || t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q) || t.tags.some(tg => tg.includes(q)))
        && (genre === "All" || t.genre === genre)
        && (mood === "All" || t.mood === mood);
    }), [search, genre, mood]);

    const handleDownload = (t: typeof TRACKS[0]) => {
      setDownloaded(prev => new Set([...prev, t.id]));
      toast.success(`"${t.title}" added to your library`, { description: "WAV 96kHz/24-bit · Royalty-free · Commercial license included" });
    };

    return (
      <div className="min-h-screen text-white" style={{ background: "linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)", paddingBottom: playing ? "100px" : "40px" }}>

        {/* Header */}
        <div className="border-b border-amber-500/20 bg-black/60 backdrop-blur-xl sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/")} className="text-white/60 hover:text-white shrink-0">
              <ArrowLeft className="w-5 h-5 text-amber-400/70" />
            </Button>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-gradient-to-br from-amber-500 to-amber-700 rounded-lg flex items-center justify-center shadow-lg shadow-amber-500/30">
                <Music2 className="w-5 h-5 text-black" />
              </div>
              <div>
                <h1 className="text-lg font-black tracking-tight uppercase italic gradient-text-gold">Music Studio</h1>
                <p className="text-[10px] text-white/40 uppercase tracking-widest">Film Scores · Soundtracks · Royalty-Free</p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-4 ml-auto text-xs text-white/40">
              <span><span className="text-amber-400 font-bold">{TRACKS.length}</span> tracks</span>
              <span><span className="text-green-400 font-bold">100%</span> royalty-free</span>
              <span><span className="text-amber-400 font-bold">WAV 96kHz</span></span>
            </div>
            <Badge variant="outline" className="border-amber-500/30 text-amber-500 bg-amber-500/5 hidden sm:flex shrink-0">
              <Crown className="w-3 h-3 mr-1.5" /> Pro
            </Badge>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Total Tracks", value: TRACKS.length, icon: Music2 },
              { label: "Genres",       value: GENRES.length - 1, icon: Sliders },
              { label: "Format",       value: "WAV 96kHz", icon: Volume2 },
              { label: "License",      value: "Commercial", icon: Star },
            ].map(s => (
              <div key={s.label} className="glass-card rounded-xl p-4 border border-amber-500/10 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                  <s.icon className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <p className="text-base font-black text-white">{s.value}</p>
                  <p className="text-[10px] text-white/40 uppercase tracking-wider">{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Search + Filters */}
          <div className="flex flex-col md:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400/60" />
              <Input placeholder="Search by title, artist, mood, tag..." className="pl-11 bg-white/5 border-amber-500/20 h-11 text-white placeholder:text-white/30" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select value={genre} onChange={e => setGenre(e.target.value)} className="px-4 h-11 rounded-lg bg-white/5 border border-amber-500/20 text-white text-sm min-w-[200px]">
              {GENRES.map(g => <option key={g} value={g} className="bg-zinc-900">{g}</option>)}
            </select>
            <select value={mood} onChange={e => setMood(e.target.value)} className="px-4 h-11 rounded-lg bg-white/5 border border-amber-500/20 text-white text-sm min-w-[160px]">
              {MOODS.map(m => <option key={m} value={m} className="bg-zinc-900">{m}</option>)}
            </select>
          </div>

          {/* Track list */}
          <div className="space-y-2">
            {filtered.map(t => {
              const isPlaying = playing === t.id;
              const isLoading = loading === t.id;
              const pct = isPlaying && duration > 0 ? (progress / duration) * 100 : 0;
              return (
                <div key={t.id}
                  className={`flex items-center gap-4 p-4 rounded-xl border transition-all group cursor-pointer ${isPlaying ? "border-amber-500 bg-amber-500/5" : "border-amber-500/10 bg-white/[0.02] hover:border-amber-500/30 hover:bg-white/[0.04]"}`}
                  onClick={() => playTrack(t.id)}>

                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-700/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                    {isLoading
                      ? <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                      : isPlaying
                        ? <Pause className="w-4 h-4 text-amber-400" />
                        : <Play className="w-4 h-4 text-amber-400/70" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm text-white truncate">{t.title}</p>
                      {t.featured && <Badge className="bg-amber-500 text-black text-[9px] border-none px-1.5 shrink-0">★</Badge>}
                    </div>
                    <p className="text-xs text-white/40 truncate">{t.artist} · {t.genre}</p>
                    {isPlaying && duration > 0 && (
                      <div className="mt-1.5 h-0.5 rounded-full bg-white/10 overflow-hidden w-full">
                        <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    )}
                  </div>

                  <div className="hidden md:flex items-center gap-3 shrink-0">
                    <Badge variant="outline" className="border-amber-500/20 text-amber-400/70 text-[10px]">{t.mood}</Badge>
                    <span className="text-xs text-white/30">{t.bpm} BPM</span>
                    <span className="text-xs text-white/30 w-10 text-right">
                      {isPlaying && duration > 0 ? formatTime(progress) : t.duration}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 ml-2 shrink-0" onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-white/30 hover:text-red-400"
                      onClick={() => setLiked(prev => { const n = new Set(prev); n.has(t.id) ? n.delete(t.id) : n.add(t.id); return n; })}>
                      <Heart className={`w-4 h-4 ${liked.has(t.id) ? "fill-red-400 text-red-400" : ""}`} />
                    </Button>
                    <Button size="sm" onClick={() => handleDownload(t)}
                      className={`h-8 text-xs font-bold px-3 ${downloaded.has(t.id) ? "bg-green-600 hover:bg-green-500 text-white" : "bg-amber-500 hover:bg-amber-400 text-black"}`}>
                      {downloaded.has(t.id)
                        ? <><CheckCircle2 className="w-3 h-3 mr-1" />Saved</>
                        : <><Download className="w-3 h-3 mr-1" />License</>}
                    </Button>
                  </div>
                </div>
              );
            })}

            {filtered.length === 0 && (
              <div className="text-center py-16 text-white/30">
                <Music2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No tracks match your search</p>
                <Button variant="ghost" size="sm" className="mt-3 text-amber-400/60" onClick={() => { setSearch(""); setGenre("All"); setMood("All"); }}>
                  Clear filters
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Sticky mini-player */}
        {(playing || loading) && currentTrack && (
          <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-amber-500/30 bg-black/90 backdrop-blur-2xl px-4 py-3">
            <div className="max-w-7xl mx-auto flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/30">
                <Music2 className="w-5 h-5 text-black" />
              </div>
              <div className="flex-1 min-w-0 hidden sm:block">
                <p className="text-sm font-bold text-white truncate">{currentTrack.title}</p>
                <p className="text-xs text-white/40 truncate">{currentTrack.artist} · {currentTrack.genre}</p>
              </div>
              <div className="flex-1 flex flex-col gap-1 max-w-md">
                <Slider
                  value={[progress]}
                  max={duration || 1}
                  step={0.5}
                  onValueChange={seek}
                  className="[&>span:first-child]:bg-white/10 [&_[role=slider]]:bg-amber-400 [&_[role=slider]]:border-amber-500 [&>span:first-child>span]:bg-amber-500"
                />
                <div className="flex justify-between text-[10px] text-white/30">
                  <span>{formatTime(progress)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-white/60 hover:text-white" onClick={skipPrev}><SkipBack className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-amber-400 hover:text-amber-300" onClick={() => playTrack(currentTrack.id)}>
                  {loading === currentTrack.id
                    ? <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                    : playing === currentTrack.id ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-white/60 hover:text-white" onClick={skipNext}><SkipForward className="w-4 h-4" /></Button>
              </div>
              <div className="hidden md:flex items-center gap-2 shrink-0 w-28">
                <Volume2 className="w-3.5 h-3.5 text-white/40 shrink-0" />
                <Slider
                  value={[volume]}
                  max={1}
                  step={0.05}
                  onValueChange={v => setVolume(v[0])}
                  className="[&>span:first-child]:bg-white/10 [&_[role=slider]]:bg-amber-400 [&_[role=slider]]:border-amber-500 [&>span:first-child>span]:bg-amber-500"
                />
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-white/30 hover:text-white shrink-0"
                onClick={() => { audioRef.current?.pause(); stopProgress(); setPlaying(null); setLoading(null); }}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }
  