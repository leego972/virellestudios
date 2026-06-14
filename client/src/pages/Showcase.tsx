import { useState, useRef } from "react";
import { Link } from "wouter";
import SiteHead from "@/components/SiteHead";
import { trpc } from "@/lib/trpc";
import GoldWatermarkLaunch from "@/components/GoldWatermarkLaunch";
import { Play, Pause, Volume2, VolumeX, Maximize, Film, Clock, Layers, Eye, ChevronDown, ChevronUp, Sparkles, Star, TrendingUp, Zap, Users, Globe, Mail, FileText, X as XIcon, CheckCircle2, MessageSquare } from "lucide-react";
import showrunner from "@/data/showrunnerShowcase";
import movie from "@/data/showrunnerMovie";

/**
 * Showcase / Demo Reel — Public page to display VirElle Studios film quality.
 * Shows completed AI-generated films with cinematic video players.
 */
export default function Showcase() {
  const { data: films, isLoading } = trpc.showcase.featured.useQuery();
  const [expandedFilm, setExpandedFilm] = useState<number | null>(null);
  const [activeScene, setActiveScene] = useState<Record<number, number>>({});

  return (
    <div className="min-h-screen text-white relative overflow-hidden" style={{ background:"linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)" }}>
      {/* Golden logo watermark */}
      <GoldWatermarkLaunch />

      {/* Cinematic grain overlay */}
      <div className="fixed inset-0 pointer-events-none z-[1] opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Hero Section */}
      <header className="relative z-10 pt-8 pb-16 px-4">
        <div className="max-w-7xl mx-auto text-center">
          {/* Logo */}
          <div className="flex items-center justify-center mb-6">
            <img
              src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663418605762/hxRQQgsmyjgcByim.png"
              alt="VirElle Studios"
              className="w-28 h-28 object-contain"
              style={{ filter: "sepia(1) saturate(3) brightness(1.3) hue-rotate(10deg)" }}
            />
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight mb-4 text-gold-shimmer"
            style={{
              background: "linear-gradient(135deg, #d4af37 0%, #f5e6a3 30%, #d4af37 50%, #b8941f 70%, #d4af37 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>
            SHOWCASE
          </h1>
          <p className="text-lg md:text-xl text-neutral-400 max-w-2xl mx-auto mb-2">
            AI-Generated Cinema — Every Frame Crafted by Artificial Intelligence
          </p>
          <p className="text-sm text-neutral-500 max-w-xl mx-auto">
            Experience the future of filmmaking. These films were created entirely using VirElle Studios —
            from script to screen, powered by AI.
          </p>

          {/* Stats bar */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 mt-10">
            <div className="text-center">
              <div className="text-2xl font-bold gradient-text-gold" style={{ color: "#d4af37" }}>
                {films?.length || 0}
              </div>
              <div className="text-xs text-neutral-500 uppercase tracking-wider">Films</div>
            </div>
            <div className="w-px h-8 bg-neutral-800" />
            <div className="text-center">
              <div className="text-2xl font-bold gradient-text-gold" style={{ color: "#d4af37" }}>
                {films?.reduce((acc: number, f: any) => acc + (f.completedScenes || 0), 0) || 0}
              </div>
              <div className="text-xs text-neutral-500 uppercase tracking-wider">Scenes</div>
            </div>
            <div className="w-px h-8 bg-neutral-800" />
            <div className="text-center">
              <div className="text-2xl font-bold gradient-text-gold" style={{ color: "#d4af37" }}>1080p</div>
              <div className="text-xs text-neutral-500 uppercase tracking-wider">Quality</div>
            </div>
            <div className="w-px h-8 bg-neutral-800" />
            <div className="text-center">
              <div className="text-2xl font-bold gradient-text-gold" style={{ color: "#d4af37" }}>100%</div>
              <div className="text-xs text-neutral-500 uppercase tracking-wider">AI Generated</div>
            </div>
          </div>
        </div>
      </header>

      {/* THE SHOWRUNNER — featured Virelle Studios showcase */}
      <TheShowrunnerSection />

      {/* Film Grid */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 pb-24">
        {isLoading ? (
          <div className="flex items-center justify-center py-32">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-2 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: "#d4af37", borderTopColor: "transparent" }} />
              <p className="text-neutral-500">Loading showcase...</p>
            </div>
          </div>
        ) : !films || films.length === 0 ? (
          // Static sample showcase — displayed when no user films are published yet
          <div className="space-y-12">
            {[
              {
                id: "sample-opener",
                title: "Virelle Studios — Cinematic Opener",
                genre: "Brand Film",
                directorName: "VirElle Studios",
                plotSummary: "The official Virelle Studios brand opener — a white dove descends through god rays, lands on a polished silver shield, and triggers a breathtaking golden transformation as the VS emblem is revealed. Wings flapping, angelic choir, 16 seconds of pure cinematic identity. Generated entirely within the Virelle platform.",
                completedScenes: 3,
                resolution: "1080p",
                quality: "Cinematic",
                scenes: [
                  {
                    id: 1,
                    title: "Dove Approach",
                    description: "A majestic white dove descends through dramatic god rays toward an ancient silver crest.",
                    videoUrl: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663418605762/virelle_studios_opener_final.mp4",
                    thumbnailUrl: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663418605762/hxRQQgsmyjgcByim.png",
                    duration: 6,
                    orderIndex: 0,
                  },
                  {
                    id: 2,
                    title: "The Golden Transformation",
                    description: "The dove lands and everything it touches turns to pure 24k gold — shield, branches, emblem.",
                    videoUrl: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663418605762/virelle_studios_opener_final.mp4",
                    thumbnailUrl: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663418605762/hxRQQgsmyjgcByim.png",
                    duration: 6,
                    orderIndex: 1,
                  },
                  {
                    id: 3,
                    title: "Revelation",
                    description: "The complete golden Virelle Studios emblem holds as the angelic choir sustains and fades.",
                    videoUrl: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663418605762/virelle_studios_opener_final.mp4",
                    thumbnailUrl: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663418605762/hxRQQgsmyjgcByim.png",
                    duration: 4,
                    orderIndex: 2,
                  },
                ],
              },
            ].map((sample) => (
              <FilmCard
                key={sample.id}
                film={sample as any}
                isExpanded={expandedFilm === (sample.id as any)}
                onToggle={() => setExpandedFilm(expandedFilm === (sample.id as any) ? null : (sample.id as any))}
                activeSceneIndex={activeScene[sample.id as any] || 0}
                onSceneChange={(idx) => setActiveScene(prev => ({ ...prev, [sample.id as any]: idx }))}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-12">
            {films.map((film) => (
              <FilmCard
                key={film.id}
                film={film}
                isExpanded={expandedFilm === film.id}
                onToggle={() => setExpandedFilm(expandedFilm === film.id ? null : film.id)}
                activeSceneIndex={activeScene[film.id] || 0}
                onSceneChange={(idx) => setActiveScene(prev => ({ ...prev, [film.id]: idx }))}
              />
            ))}
          </div>
        )}
      </main>

      {/* ─── Phase 3: Public Discovery Feed ──────────────────────────────── */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 pb-16">
        <div className="mb-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-2 text-gold-shimmer"
            style={{
              background: "linear-gradient(135deg, #d4af37 0%, #f5e6a3 50%, #d4af37 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>
            Creator Discovery
          </h2>
          <p className="text-neutral-500 text-sm">Public films created by VirElle Studios members</p>
        </div>
        <DiscoveryFeed />
      </section>

      {/* Footer CTA */}
      <footer className="relative z-10 border-t border-neutral-900 py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <Sparkles className="w-8 h-8 mx-auto mb-4 text-amber-400 gold-glow" style={{ color: "#d4af37" }} />
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gold-shimmer"
            style={{
              background: "linear-gradient(135deg, #d4af37 0%, #f5e6a3 50%, #d4af37 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>
            Create Your Own Film
          </h2>
          <p className="text-neutral-400 mb-8 max-w-lg mx-auto">
            Join VirElle Studios and bring your stories to life with AI-powered filmmaking.
            From concept to cinema in minutes.
          </p>
          <a
            href="/register"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-lg font-semibold text-black text-lg transition-all hover:scale-105"
            style={{
              background: "linear-gradient(135deg, #d4af37 0%, #f5e6a3 50%, #d4af37 100%)",
            }}
          >
            <Film className="w-5 h-5" />
            Start Creating Free
          </a>
          <p className="text-xs text-neutral-600 mt-4">All prices in USD. Professional filmmaking tools included.</p>
        </div>
      </footer>
    </div>
  );
}

/* ─── Film Card Component ─────────────────────────────────────────────────── */

interface FilmScene {
  id: number;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl?: string;
  duration?: number;
  orderIndex: number;
  mood?: string;
  timeOfDay?: string;
  locationType?: string;
}

interface FilmData {
  id: number;
  title: string;
  genre?: string;
  plotSummary?: string;
  duration?: number;
  quality?: string;
  resolution?: string;
  directorName: string;
  sceneCount: number;
  completedScenes: number;
  scenes: FilmScene[];
}

function FilmCard({
  film,
  isExpanded,
  onToggle,
  activeSceneIndex,
  onSceneChange,
}: {
  film: FilmData;
  isExpanded: boolean;
  onToggle: () => void;
  activeSceneIndex: number;
  onSceneChange: (idx: number) => void;
}) {
  const currentScene = film.scenes[activeSceneIndex] || film.scenes[0];

  return (
    <div className="rounded-2xl overflow-hidden border border-neutral-800/50 bg-neutral-950/80 backdrop-blur-sm">
      {/* Main Video Player */}
      <div className="relative aspect-video bg-black">
        {currentScene?.videoUrl ? (
          <VideoPlayer
            key={currentScene.id}
            src={currentScene.videoUrl}
            title={currentScene.title}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-900">
            <Film className="w-16 h-16 text-neutral-700" />
          </div>
        )}

        {/* Film title overlay */}
        <div className="absolute top-0 left-0 right-0 p-6 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-gold-shimmer">{film.title}</h2>
              <div className="flex items-center gap-3 mt-1 text-sm text-neutral-400">
                {film.genre && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium border"
                    style={{ borderColor: "#d4af37", color: "#d4af37" }}>
                    {film.genre}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5" />
                  {film.completedScenes} scenes
                </span>
                {film.resolution && (
                  <span className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" />
                    {film.resolution}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-neutral-500 uppercase tracking-wider">Directed by</div>
              <div className="text-sm font-medium" style={{ color: "#d4af37" }}>{film.directorName}</div>
            </div>
          </div>
        </div>

        {/* Current scene title overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent pointer-events-none">
          <div className="text-sm text-neutral-300">
            <span className="font-medium" style={{ color: "#d4af37" }}>
              Scene {activeSceneIndex + 1}:
            </span>{" "}
            {currentScene?.title}
          </div>
          {currentScene?.description && (
            <p className="text-xs text-neutral-500 mt-1 line-clamp-2">{currentScene.description}</p>
          )}
        </div>
      </div>

      {/* Scene Selector Strip */}
      <div className="p-4 border-t border-neutral-800/50">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-neutral-800">
          {film.scenes.map((scene, idx) => (
            <button
              key={scene.id}
              onClick={() => onSceneChange(idx)}
              className={`flex-shrink-0 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                idx === activeSceneIndex
                  ? "text-black"
                  : "bg-neutral-900 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-300 border border-neutral-800"
              }`}
              style={idx === activeSceneIndex ? {
                background: "linear-gradient(135deg, #d4af37 0%, #f5e6a3 50%, #d4af37 100%)",
              } : {}}
            >
              #{idx + 1} {scene.title}
            </button>
          ))}
        </div>
      </div>

      {/* Expandable Details */}
      <div className="px-4 pb-2">
        <button
          onClick={onToggle}
          className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-300 transition-colors py-2 w-full"
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          {isExpanded ? "Hide Details" : "Show Film Details"}
        </button>
      </div>

      {isExpanded && (
        <div className="px-6 pb-6 border-t border-neutral-800/50 pt-4">
          {film.plotSummary && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold uppercase tracking-wider mb-2" style={{ color: "#d4af37" }}>
                Synopsis
              </h3>
              <p className="text-sm text-neutral-400 leading-relaxed">{film.plotSummary}</p>
            </div>
          )}

          {/* Scene Grid */}
          <h3 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: "#d4af37" }}>
            All Scenes
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {film.scenes.map((scene, idx) => (
              <button
                key={scene.id}
                onClick={() => {
                  onSceneChange(idx);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={`group relative rounded-lg overflow-hidden border transition-all hover:scale-[1.02] ${
                  idx === activeSceneIndex
                    ? "border-[#d4af37] ring-1 ring-[#d4af37]/30"
                    : "border-neutral-800 hover:border-neutral-700"
                }`}
              >
                <div className="aspect-video bg-neutral-900 flex items-center justify-center">
                  {scene.thumbnailUrl ? (
                    <img src={scene.thumbnailUrl} alt={scene.title} className="w-full h-full object-cover" />
                  ) : (
                    <Play className="w-6 h-6 text-neutral-700 group-hover:text-amber-400 transition-colors" />
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Play className="w-8 h-8 text-white" />
                  </div>
                </div>
                <div className="p-2 bg-neutral-900/80">
                  <div className="text-xs font-medium truncate">#{idx + 1} {scene.title}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {scene.mood && <span className="text-[10px] text-neutral-500">{scene.mood}</span>}
                    {scene.timeOfDay && <span className="text-[10px] text-neutral-600">{scene.timeOfDay}</span>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Video Player Component ──────────────────────────────────────────────── */

function VideoPlayer({ src, title }: { src: string; title: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [showControls, setShowControls] = useState(true);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const pct = (videoRef.current.currentTime / videoRef.current.duration) * 100;
    setProgress(pct || 0);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = pct * videoRef.current.duration;
  };

  const toggleFullscreen = () => {
    if (!videoRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      videoRef.current.requestFullscreen();
    }
  };

  return (
    <div
      className="relative w-full h-full group cursor-pointer"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(isPlaying ? false : true)}
      onClick={togglePlay}
    >
      <video
        ref={videoRef}
        src={src}
        className="w-full h-full object-cover"
        muted={isMuted}
        loop
        playsInline
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => setIsPlaying(false)}
      />

      {/* Play button overlay when paused */}
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <div className="w-20 h-20 rounded-full flex items-center justify-center transition-transform hover:scale-110"
            style={{ background: "linear-gradient(135deg, #d4af37 0%, #f5e6a3 50%, #d4af37 100%)" }}>
            <Play className="w-8 h-8 text-black ml-1" fill="black" />
          </div>
        </div>
      )}

      {/* Controls bar */}
      <div
        className={`absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 to-transparent transition-opacity ${
          showControls || !isPlaying ? "opacity-100" : "opacity-0"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress bar */}
        <div
          className="w-full h-1 bg-neutral-700 rounded-full cursor-pointer mb-3 group/progress"
          onClick={handleSeek}
        >
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${progress}%`,
              background: "linear-gradient(90deg, #d4af37, #f5e6a3)",
            }}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="text-white hover:text-[#d4af37] transition-colors"
              aria-label={isPlaying ? "Pause" : "Play"}
              aria-pressed={isPlaying}
            >
              {isPlaying ? <Pause className="w-5 h-5" aria-hidden="true" /> : <Play className="w-5 h-5" aria-hidden="true" />}
            </button>
            <button
              onClick={toggleMute}
              className="text-white hover:text-[#d4af37] transition-colors"
              aria-label={isMuted ? "Unmute" : "Mute"}
              aria-pressed={isMuted}
            >
              {isMuted ? <VolumeX className="w-5 h-5" aria-hidden="true" /> : <Volume2 className="w-5 h-5" aria-hidden="true" />}
            </button>
            <span className="text-xs text-neutral-400">{title}</span>
          </div>
          <button
            onClick={toggleFullscreen}
            className="text-white hover:text-[#d4af37] transition-colors"
            aria-label="Fullscreen"
          >
            <Maximize className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Phase 3: Discovery Feed Component ─────────────────────────────────────── */

type DiscoverySurface = "featured" | "trending" | "new" | "staff_picks";

interface PublicFilm {
  id: number;
  slug: string;
  title: string;
  genre?: string;
  logline?: string;
  thumbnailUrl?: string;
  trailerUrl?: string;
  viewCount: number;
  playCount: number;
  shareCount: number;
  creatorName: string;
  creatorSlug?: string;
  rankScore?: number;
}

function DiscoveryFeed() {
  const [surface, setSurface] = useState<DiscoverySurface>("featured");
  const { data: films, isLoading } = trpc.showcase.getRanked.useQuery({ surface, limit: 12 });

  const tabs: { key: DiscoverySurface; label: string; icon: any }[] = [
    { key: "featured", label: "Featured", icon: Star },
    { key: "trending", label: "Trending", icon: TrendingUp },
    { key: "new", label: "New", icon: Zap },
    { key: "staff_picks", label: "Staff Picks", icon: Sparkles },
  ];

  return (
    <div>
      <SiteHead title="Public Showcase — Films & Reels" description="Watch films, reels, and promos created on Virelle Studios by indie filmmakers and major studios worldwide." />
      {/* Surface Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 scrollbar-thin scrollbar-thumb-neutral-800">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = surface === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setSurface(tab.key)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                active
                  ? "text-black border-transparent"
                  : "bg-transparent text-neutral-400 border-neutral-800 hover:border-neutral-600 hover:text-neutral-300"
              }`}
              style={active ? {
                background: "linear-gradient(135deg, #d4af37 0%, #f5e6a3 50%, #d4af37 100%)",
              } : {}}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Film Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl bg-neutral-900 border border-neutral-800 overflow-hidden animate-pulse">
              <div className="aspect-video bg-neutral-800" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-neutral-800 rounded w-3/4" />
                <div className="h-3 bg-neutral-800 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : !films?.length ? (
        <div className="text-center py-16 text-neutral-500">
          <Globe className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No public films in this category yet.</p>
          <p className="text-xs mt-1 text-neutral-600">Be the first to publish your film to the showcase!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {(films as PublicFilm[]).map((film) => (
            <Link key={film.id} href={`/films/${film.slug}`}>
              <div className="group rounded-xl bg-neutral-900 border border-neutral-800 overflow-hidden hover:border-neutral-600 transition-all hover:scale-[1.02] cursor-pointer">
                {/* Thumbnail */}
                <div className="relative aspect-video bg-neutral-800 overflow-hidden">
                  {film.thumbnailUrl ? (
                    <img
                      src={film.thumbnailUrl}
                      alt={film.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Film className="w-10 h-10 text-neutral-700" />
                    </div>
                  )}
                  {/* Play overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full glass-card/20 backdrop-blur-sm flex items-center justify-center">
                      <Play className="w-5 h-5 text-white ml-0.5" />
                    </div>
                  </div>
                  {/* Genre chip */}
                  {film.genre && (
                    <div className="absolute top-2 left-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium border"
                        style={{ borderColor: "#d4af37", color: "#d4af37", background: "rgba(0,0,0,0.7)" }}>
                        {film.genre}
                      </span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="font-semibold text-sm truncate gradient-text-gold">{film.title}</h3>
                  {film.logline && (
                    <p className="text-xs text-neutral-400 mt-1 line-clamp-2">{film.logline}</p>
                  )}
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-1 text-xs text-neutral-500">
                      <Users className="w-3 h-3" />
                      {film.creatorSlug ? (
                        <span
                          className="hover:text-amber-400 transition-colors"
                          onClick={(e) => { e.preventDefault(); window.location.href = `/creators/${film.creatorSlug}`; }}
                        >
                          {film.creatorName}
                        </span>
                      ) : (
                        <span>{film.creatorName}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-neutral-600">
                      <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" />{film.viewCount}</span>
                      <span className="flex items-center gap-0.5"><Play className="w-3 h-3" />{film.playCount}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
 * THE SHOWRUNNER — featured Virelle Studios showcase
 *
 * Renders the full 10-section showcase package: hero, disclaimer, inciting
 * email, character cards, full short-film script (collapsible), the
 * SIGNAL BLACK show-within-show mini-trailer, the production-package
 * checklist, the clips-vs-production comparison, the 3 social cuts, and the
 * closing CTA. All copy lives in client/src/data/showrunnerShowcase.ts.
 * ────────────────────────────────────────────────────────────────────────── */

  /* ─────────────────────────────────────────────────────────────────────────
   * TheShowrunnerSection
   * Full cinematic showcase for THE SHOWRUNNER — premium black/gold styling.
   * All copy lives in client/src/data/showrunnerShowcase.ts and showrunnerMovie.ts
   * ────────────────────────────────────────────────────────────────────────── */
  function TheShowrunnerSection() {
    const [scriptOpen, setScriptOpen] = useState(false);

    return (
      <section
        className="relative z-10 max-w-7xl mx-auto px-4 pb-24"
        data-testid="section-showrunner"
      >
        {/* ── CINEMATIC HERO ── */}
        <div
          className="relative overflow-hidden rounded-2xl border border-amber-500/25 mb-16 text-center"
          style={{
            background:
              "linear-gradient(160deg, #0c0c0c 0%, #110f05 45%, #0c0c0c 100%)",
          }}
        >
          {/* Film-frame corner brackets */}
          <div className="absolute top-4 left-4 w-7 h-7 border-t-2 border-l-2 border-amber-500/50 pointer-events-none" />
          <div className="absolute top-4 right-4 w-7 h-7 border-t-2 border-r-2 border-amber-500/50 pointer-events-none" />
          <div className="absolute bottom-4 left-4 w-7 h-7 border-b-2 border-l-2 border-amber-500/50 pointer-events-none" />
          <div className="absolute bottom-4 right-4 w-7 h-7 border-b-2 border-r-2 border-amber-500/50 pointer-events-none" />

          {/* Gold top rule */}
          <div
            className="h-[2px] w-full"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, #d4af37 30%, #f5e6a3 50%, #d4af37 70%, transparent 100%)",
            }}
          />

          <div className="px-6 py-14 md:py-20 relative z-10">
            <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold uppercase tracking-wider">
              <Star className="w-3 h-3" />
              Featured Showcase · VirElle Studios Original
            </div>

            <h2
              className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tighter mb-5 leading-none"
              style={{
                background:
                  "linear-gradient(135deg, #d4af37 0%, #f5e6a3 30%, #fffbe8 50%, #d4af37 70%, #b8941f 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
              data-testid="text-showrunner-title"
            >
              {showrunner.title}
            </h2>

            <p className="text-xl md:text-2xl text-amber-300/70 italic mb-6 tracking-wide">
              "{showrunner.tagline}"
            </p>

            <p className="text-sm md:text-base text-neutral-400 max-w-2xl mx-auto leading-relaxed mb-10">
              {showrunner.logline}
            </p>

            <div className="flex items-center justify-center flex-wrap gap-3 md:gap-6">
              {["9 SCENES", "4–5 MIN", "COMEDY · DRAMA", "MELBOURNE", "AI SHOWCASE"].map(
                (tag, i, arr) => (
                  <span key={tag} className="flex items-center gap-3 md:gap-6">
                    <span className="text-[11px] text-neutral-500 uppercase tracking-widest font-semibold">
                      {tag}
                    </span>
                    {i < arr.length - 1 && (
                      <span className="text-amber-500/30 hidden sm:inline">·</span>
                    )}
                  </span>
                )
              )}
            </div>
          </div>

          {/* Gold bottom rule */}
          <div
            className="h-[1px] w-full"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, #d4af37 30%, #f5e6a3 50%, #d4af37 70%, transparent 100%)",
            }}
          />
        </div>

        {/* ── DISCLAIMER ── */}
        <div className="rounded-lg border border-neutral-800 bg-neutral-950/80 p-5 mb-12 max-w-3xl mx-auto relative">
          <div className="absolute -top-2.5 left-6 px-2 bg-neutral-950 text-[10px] uppercase tracking-widest text-amber-400/70 font-semibold">
            Disclaimer · Appears after opener, before film
          </div>
          <p className="text-xs text-neutral-400 leading-relaxed">
            {showrunner.disclaimer.short}
          </p>
        </div>

        {/* ── INCITING EMAIL FROM SAM ── */}
        <div className="mb-16 max-w-3xl mx-auto">
          <div className="text-center mb-6">
            <div className="text-xs text-amber-400/70 uppercase tracking-widest mb-2 font-semibold">
              The Inciting Email
            </div>
            <h3 className="text-2xl font-bold text-gold-shimmer">
              One email reminded him he was a storyteller.
            </h3>
          </div>
          <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 overflow-hidden shadow-xl shadow-black/40">
            <div className="border-b border-neutral-800 bg-neutral-950 px-5 py-3 flex items-center gap-3">
              <Mail className="w-4 h-4 text-amber-400/70" />
              <div className="flex-1 text-xs">
                <div className="text-neutral-300">
                  From:{" "}
                  <span className="text-white font-medium">
                    {showrunner.samEmail.from}
                  </span>
                </div>
                <div className="text-neutral-400">
                  Subject:{" "}
                  <span className="text-amber-300/80">
                    {showrunner.samEmail.subject}
                  </span>
                </div>
              </div>
            </div>
            <pre className="p-5 text-sm text-neutral-300 leading-relaxed font-sans whitespace-pre-wrap">
  {showrunner.samEmail.body}
            </pre>
          </div>
        </div>

        {/* ── CHARACTER CARDS ── */}
        <div className="mb-16">
          <div className="text-center mb-8">
            <div className="text-xs text-amber-400/70 uppercase tracking-widest mb-2 font-semibold">
              Cast
            </div>
            <h3 className="text-2xl md:text-3xl font-bold text-gold-shimmer">
              Main characters
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {showrunner.characters.map((c) => {
              const initial = c.name.charAt(0).toUpperCase();
              const colors = [
                "from-amber-600 to-amber-900",
                "from-neutral-600 to-neutral-900",
                "from-stone-600 to-stone-900",
                "from-zinc-600 to-zinc-900",
                "from-orange-700 to-orange-950",
              ];
              const colorIdx = c.name.charCodeAt(0) % colors.length;
              return (
                <div
                  key={c.name}
                  className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-5 hover:border-amber-500/50 hover:bg-neutral-900/60 transition-all group"
                  data-testid={`card-character-${c.name.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className={`w-10 h-10 rounded-full bg-gradient-to-br ${colors[colorIdx]} flex items-center justify-center text-white font-black text-lg shrink-0 shadow-md`}
                    >
                      {initial}
                    </div>
                    <div>
                      <div className="text-base font-bold text-white leading-tight">
                        {c.name}
                      </div>
                      <div className="text-[10px] text-amber-400/80 uppercase tracking-wider font-semibold">
                        {c.role}
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-neutral-400 leading-relaxed">
                    {c.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── FULL SCRIPT (COLLAPSIBLE) ── */}
        <div className="mb-16">
          <div className="text-center mb-8">
            <div className="text-xs text-amber-400/70 uppercase tracking-widest mb-2 font-semibold">
              Short Film
            </div>
            <h3 className="text-2xl md:text-3xl font-bold text-gold-shimmer">
              Full script
            </h3>
          </div>
          <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 overflow-hidden max-w-4xl mx-auto shadow-lg shadow-black/30">
            <button
              type="button"
              onClick={() => setScriptOpen((o) => !o)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-neutral-900/50 transition-colors"
              data-testid="button-toggle-script"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-amber-400" />
                <span className="text-white font-semibold">
                  {showrunner.fullScript.length} scenes — read the full script
                </span>
              </div>
              {scriptOpen ? (
                <ChevronUp className="w-5 h-5 text-neutral-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-neutral-400" />
              )}
            </button>
            {scriptOpen && (
              <div className="border-t border-neutral-800 p-6 space-y-10 max-h-[640px] overflow-y-auto">
                {showrunner.fullScript.map((scene) => (
                  <div key={scene.id}>
                    <div className="text-xs text-amber-400/70 uppercase tracking-widest font-semibold mb-1">
                      {scene.heading}
                    </div>
                    <div className="text-xs text-neutral-500 italic mb-3">
                      {scene.setting}
                    </div>
                    <div className="space-y-3">
                      {scene.lines.map((line, i) => {
                        if (line.type === "action") {
                          return (
                            <p
                              key={i}
                              className="text-sm text-neutral-300 leading-relaxed italic"
                            >
                              {line.text}
                            </p>
                          );
                        }
                        if (line.type === "dialogue") {
                          return (
                            <div key={i} className="ml-6">
                              <div className="text-xs font-bold text-amber-400/90 uppercase tracking-wider">
                                {line.speaker}
                              </div>
                              <div className="text-sm text-neutral-200">
                                {line.text}
                              </div>
                            </div>
                          );
                        }
                        if (line.type === "on_screen") {
                          return (
                            <div
                              key={i}
                              className="text-center text-xs text-amber-300/80 uppercase tracking-widest font-semibold border-y border-neutral-800 py-2"
                            >
                              {line.text}
                            </div>
                          );
                        }
                        if (line.type === "transition") {
                          return (
                            <div
                              key={i}
                              className="text-xs text-neutral-500 uppercase tracking-widest text-right font-semibold"
                            >
                              {line.text}
                            </div>
                          );
                        }
                        if (line.type === "caption") {
                          return (
                            <div
                              key={i}
                              className="text-center text-sm text-amber-300/80 italic"
                            >
                              {line.text}
                            </div>
                          );
                        }
                        if (line.type === "email") {
                          return (
                            <pre
                              key={i}
                              className="text-xs text-neutral-300 bg-neutral-900/80 border border-neutral-800 rounded p-3 whitespace-pre-wrap font-mono"
                            >
                              {line.text}
                            </pre>
                          );
                        }
                        return null;
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── SIGNAL BLACK — SCI-FI NOIR (show within the show) ── */}
        <div className="mb-16">
          <div className="text-center mb-6">
            <div className="text-xs text-amber-400/70 uppercase tracking-widest mb-2 font-semibold">
              Show Within The Show
            </div>
            <h3 className="text-3xl md:text-4xl font-bold tracking-tight text-gold-shimmer">
              {showrunner.signalBlackMiniTrailer.title}
            </h3>
            <p className="text-sm text-amber-300/70 italic mt-2">
              {showrunner.signalBlackMiniTrailer.tagline}
            </p>
          </div>

          {/* Distinct sci-fi noir card */}
          <div
            className="relative overflow-hidden rounded-xl border border-blue-900/50 max-w-3xl mx-auto"
            style={{
              background:
                "linear-gradient(160deg, #03050f 0%, #060918 50%, #020408 100%)",
            }}
          >
            {/* Sci-fi corner badge */}
            <div className="absolute top-0 right-0 px-3 py-1.5 text-[10px] font-mono font-bold text-blue-400/80 bg-blue-500/10 border-l border-b border-blue-500/20 rounded-bl-lg uppercase tracking-widest">
              SCI-FI NOIR
            </div>

            {/* Blue top accent */}
            <div
              className="h-[1px] w-full"
              style={{
                background:
                  "linear-gradient(90deg, transparent 0%, #1d4ed8 30%, #60a5fa 50%, #1d4ed8 70%, transparent 100%)",
              }}
            />

            <div className="p-6 space-y-3">
              {showrunner.signalBlackMiniTrailer.beats.map((b, i) => {
                if (b.kind === "voiceover" || b.kind === "dialogue") {
                  return (
                    <div key={i} className="border-l-2 border-blue-700/50 pl-4">
                      <div className="text-[10px] font-bold text-blue-400/80 uppercase tracking-widest">
                        {b.speaker}
                      </div>
                      <div className="text-sm text-blue-100/90 italic">
                        "{b.text}"
                      </div>
                    </div>
                  );
                }
                if (b.kind === "visual") {
                  return (
                    <p key={i} className="text-xs text-blue-900/80 italic">
                      {b.text}
                    </p>
                  );
                }
                if (b.kind === "on_screen") {
                  return (
                    <div
                      key={i}
                      className="text-center text-xs text-blue-300/90 uppercase tracking-widest font-semibold py-1 border-y border-blue-900/40"
                    >
                      {b.text}
                    </div>
                  );
                }
                if (b.kind === "title") {
                  return (
                    <div
                      key={i}
                      className="text-center text-2xl font-black text-blue-300 tracking-widest pt-3"
                      style={{
                        textShadow: "0 0 20px rgba(96,165,250,0.4)",
                      }}
                    >
                      {b.text}
                    </div>
                  );
                }
                return null;
              })}
            </div>

            <div
              className="h-[1px] w-full"
              style={{
                background:
                  "linear-gradient(90deg, transparent 0%, #1d4ed8 30%, #60a5fa 50%, #1d4ed8 70%, transparent 100%)",
              }}
            />
          </div>
        </div>

        {/* ── PRODUCTION PACKAGE ── */}
        <div className="mb-16">
          <div className="text-center mb-8">
            <div className="text-xs text-amber-400/70 uppercase tracking-widest mb-2 font-semibold">
              What Virelle Built
            </div>
            <h3 className="text-2xl md:text-3xl font-bold text-gold-shimmer">
              A complete production package
            </h3>
            <p className="text-sm text-neutral-500 mt-2 max-w-xl mx-auto">
              Everything a show needs — built from one idea, no crew, no budget.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {showrunner.productionPackageChecklist.map((item) => (
              <div
                key={item.label}
                className="flex items-start gap-3 rounded-lg border border-neutral-800 bg-neutral-950/40 p-4 hover:border-amber-500/30 hover:bg-neutral-900/40 transition-all"
                data-testid={`card-package-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <CheckCircle2 className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-sm font-semibold text-white">
                    {item.label}
                  </div>
                  <div className="text-xs text-neutral-400 mt-0.5">
                    {item.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── CLIPWIZARD COMPARISON ── */}
        <div className="mb-16">
          <div className="text-center mb-8">
            <div className="text-xs text-amber-400/70 uppercase tracking-widest mb-2 font-semibold">
              The Difference
            </div>
            <h3 className="text-2xl md:text-3xl font-bold text-gold-shimmer">
              {showrunner.comparisonCopy.headline}
            </h3>
            <p className="text-sm text-neutral-400 max-w-2xl mx-auto mt-3 leading-relaxed">
              {showrunner.comparisonCopy.body}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
            {/* Rival — clearly fictional */}
            <div className="rounded-xl border border-red-900/30 bg-red-950/10 p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="text-xs text-red-400/80 uppercase tracking-widest font-semibold">
                  {showrunner.comparisonCopy.rivalName}
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-900/30 text-red-400/60 border border-red-900/30 uppercase tracking-wider font-mono">
                  fictional
                </span>
              </div>
              <ul className="space-y-2">
                {showrunner.comparisonCopy.clipWizardCons.map((con) => (
                  <li
                    key={con}
                    className="flex items-start gap-2 text-sm text-neutral-400"
                  >
                    <XIcon className="w-4 h-4 text-red-500/60 mt-0.5 shrink-0" />
                    {con}
                  </li>
                ))}
              </ul>
            </div>

            {/* Virelle Studios */}
            <div
              className="rounded-xl border border-amber-500/30 p-5"
              style={{ background: "linear-gradient(160deg, #100e03 0%, #0c0a02 100%)" }}
            >
              <div className="text-xs text-amber-400 uppercase tracking-widest font-bold mb-4">
                Virelle Studios
              </div>
              <ul className="space-y-2">
                {showrunner.comparisonCopy.virellePros.map((pro) => (
                  <li
                    key={pro}
                    className="flex items-start gap-2 text-sm text-neutral-200"
                  >
                    <CheckCircle2 className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                    {pro}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="text-[11px] text-neutral-600 italic text-center mt-4 max-w-xl mx-auto">
            {showrunner.comparisonCopy.rivalNote}
          </p>
        </div>

        {/* ── SOCIAL CUTS ── */}
        <div className="mb-16">
          <div className="text-center mb-8">
            <div className="text-xs text-amber-400/70 uppercase tracking-widest mb-2 font-semibold">
              Social Cuts
            </div>
            <h3 className="text-2xl md:text-3xl font-bold text-gold-shimmer">
              3 ready-to-post versions
            </h3>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {showrunner.socialCuts.map((cut) => (
              <div
                key={cut.length}
                className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-5"
                data-testid={`card-cut-${cut.length}`}
              >
                <div className="flex items-baseline gap-2 mb-3">
                  <MessageSquare className="w-4 h-4 text-amber-400" />
                  <span className="text-2xl font-bold text-amber-400">
                    {cut.length}
                  </span>
                  <span className="text-xs text-neutral-500 uppercase tracking-wider">
                    {cut.label}
                  </span>
                </div>
                <ol className="space-y-1.5 mb-4">
                  {cut.beats.map((beat, i) => (
                    <li
                      key={i}
                      className="text-xs text-neutral-300 leading-relaxed flex gap-2"
                    >
                      <span className="text-amber-400/50 font-mono shrink-0">
                        {i + 1}.
                      </span>
                      <span>{beat}</span>
                    </li>
                  ))}
                </ol>
                <div className="text-xs text-amber-300/80 font-semibold border-t border-neutral-800 pt-3">
                  → {cut.cta}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── FILM STRUCTURE ── */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <div>
              <h3 className="text-xl font-bold tracking-tight gradient-text-gold">
                Film Structure
              </h3>
              <p className="text-xs text-neutral-500">
                Order of elements in the final cut.
              </p>
            </div>
          </div>
          <ol className="space-y-3">
            {movie.filmStructure.map((item) => (
              <li
                key={item.order}
                className="flex gap-4 rounded-lg border border-neutral-800 bg-neutral-950/60 p-4 items-start"
              >
                <span className="text-amber-400 font-mono font-bold text-lg shrink-0 w-6 text-right">
                  {item.order}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-2 mb-1">
                    <span className="text-sm font-semibold text-white">
                      {item.label}
                    </span>
                    <span className="text-xs text-amber-400/70 font-mono">
                      {item.durationNote}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* ── SCENE GENERATION PROMPTS ── */}
        <div className="mb-16">
          <div className="mb-6">
            <h3 className="text-xl font-bold tracking-tight gradient-text-gold">
              Scene Generation Prompts
            </h3>
            <p className="text-xs text-neutral-500 mt-1">
              Visual prompts for each scene — ready for generation.
            </p>
          </div>
          <div className="space-y-4">
            {movie.generationPrompts.map((prompt) => (
              <div
                key={prompt.sceneId}
                className="rounded-lg border border-neutral-800 bg-neutral-950/60 p-5"
              >
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="text-amber-400 font-bold text-sm">
                    {prompt.heading}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/25 font-mono uppercase tracking-wider">
                    Ready for Generation
                  </span>
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed mb-3">
                  {prompt.visualPrompt}
                </p>
                <p className="text-[11px] text-neutral-500 italic border-t border-neutral-800 pt-2">
                  Style: {prompt.styleNotes}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── VOICE DIRECTION ── */}
        <div className="mb-16">
          <h3 className="text-xl font-bold mb-1 tracking-tight gradient-text-gold">
            Voice Direction
          </h3>
          <p className="text-xs text-neutral-500 mb-6">
            Per-character voice notes for casting and voiceover direction.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {movie.voiceDirection.map((v) => (
              <div
                key={v.character}
                className="rounded-lg border border-neutral-800 bg-neutral-950/60 p-4"
              >
                <div className="text-sm font-bold text-amber-400 mb-2">
                  {v.character}
                </div>
                <div className="text-xs text-neutral-400 mb-1">
                  <span className="text-neutral-500">Voice: </span>
                  {v.voiceType}
                </div>
                <div className="text-xs text-neutral-400 mb-1">
                  <span className="text-neutral-500">Delivery: </span>
                  {v.delivery}
                </div>
                <div className="text-xs text-neutral-400 mb-2">
                  <span className="text-neutral-500">Pace: </span>
                  {v.pace}
                </div>
                <p className="text-xs text-neutral-500 italic border-t border-neutral-800 pt-2 leading-relaxed">
                  {v.notes}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── MUSIC DIRECTION ── */}
        <div className="mb-16">
          <h3 className="text-xl font-bold mb-1 tracking-tight gradient-text-gold">
            Music Direction
          </h3>
          <p className="text-xs text-neutral-500 mb-6">
            Per-act scoring guide for the composer.
          </p>
          <div className="space-y-3">
            {movie.musicDirection.map((m) => (
              <div
                key={m.act}
                className="rounded-lg border border-neutral-800 bg-neutral-950/60 p-4"
              >
                <div className="flex flex-wrap items-baseline gap-2 mb-2">
                  <span className="text-sm font-bold text-white">{m.act}</span>
                  <span className="text-xs text-amber-400/70 font-mono">
                    {m.scenes}
                  </span>
                </div>
                <div className="text-xs text-neutral-400 mb-1">
                  <span className="text-neutral-500">Tone: </span>
                  {m.tone}
                </div>
                <div className="text-xs text-neutral-400 mb-1">
                  <span className="text-neutral-500">Instrumentation: </span>
                  {m.instrumentation}
                </div>
                <p className="text-xs text-neutral-500 italic border-t border-neutral-800 pt-2 mt-2">
                  {m.cue}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── SOUND DESIGN ── */}
        <div className="mb-16">
          <h3 className="text-xl font-bold mb-1 tracking-tight gradient-text-gold">
            Sound Design
          </h3>
          <p className="text-xs text-neutral-500 mb-6">
            Key audio elements and placement notes.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {movie.soundDesign.map((s) => (
              <div
                key={s.element}
                className="rounded-lg border border-neutral-800 bg-neutral-950/60 p-4"
              >
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-sm font-semibold text-amber-400">
                    {s.element}
                  </span>
                  <span className="text-[10px] text-neutral-600 font-mono">
                    {s.scene}
                  </span>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  {s.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── EDIT PLAN ── */}
        <div className="mb-16">
          <h3 className="text-xl font-bold mb-1 tracking-tight gradient-text-gold">
            Edit Plan
          </h3>
          <p className="text-xs text-neutral-500 mb-6">
            Runtime targets and pacing notes for each segment.
          </p>
          <div className="rounded-lg border border-neutral-800 bg-neutral-950/60 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-neutral-800">
                  <th className="text-left text-neutral-500 font-semibold p-3 uppercase tracking-wider border-b border-amber-500/20 text-amber-400/70 font-semibold tracking-wide uppercase text-xs">
                    Segment
                  </th>
                  <th className="text-left text-neutral-500 font-semibold p-3 uppercase tracking-wider border-b border-amber-500/20 text-amber-400/70 font-semibold tracking-wide uppercase text-xs">
                    Target
                  </th>
                  <th className="text-left text-neutral-500 font-semibold p-3 uppercase tracking-wider hidden md:table-cell border-b border-amber-500/20 text-amber-400/70 font-semibold tracking-wide uppercase text-xs">
                    Pacing
                  </th>
                </tr>
              </thead>
              <tbody>
                {movie.editPlan.map((e, i) => (
                  <tr
                    key={e.scene}
                    className={`border-b border-neutral-800/50 ${
                      i % 2 === 0 ? "bg-neutral-950/20" : ""
                    }`}
                  >
                    <td className="p-3 text-neutral-300 font-medium">
                      {e.scene}
                    </td>
                    <td className="p-3 text-amber-400 font-mono whitespace-nowrap">
                      {e.targetRuntime}
                    </td>
                    <td className="p-3 text-neutral-500 hidden md:table-cell leading-relaxed">
                      {e.pacingNotes}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── ASSET PLACEHOLDERS ── */}
        <div className="mb-16">
          <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
            <div>
              <h3 className="text-xl font-bold tracking-tight gradient-text-gold">
                Asset Placeholders
              </h3>
              <p className="text-xs text-neutral-500 mt-1">
                No media produced yet — all ready for generation.
              </p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-amber-400/30 bg-amber-400/5 text-amber-400 text-xs font-semibold">
              <Sparkles className="w-3 h-3" />
              Ready for Generation
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {movie.assetPlaceholders.map((a) => (
              <div
                key={a.filename}
                className="rounded-lg border border-neutral-800 bg-neutral-950/60 p-4 flex flex-col gap-2 hover:border-neutral-700 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-mono uppercase font-bold ${
                      a.type === "video"
                        ? "bg-blue-400/10 text-blue-400 border border-blue-400/20"
                        : a.type === "image"
                          ? "bg-purple-400/10 text-purple-400 border border-purple-400/20"
                          : a.type === "subtitle"
                            ? "bg-green-400/10 text-green-400 border border-green-400/20"
                            : "bg-neutral-400/10 text-neutral-400 border border-neutral-400/20"
                    }`}
                  >
                    {a.type}
                  </span>
                  <span className="text-xs font-mono text-neutral-300 truncate flex-1">
                    {a.filename}
                  </span>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  {a.description}
                </p>
                <div className="flex items-center justify-between mt-auto pt-2 border-t border-neutral-800">
                  <span className="text-[10px] text-neutral-600 font-mono">
                    {a.specs}
                  </span>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard?.writeText(a.description).catch(() => {})}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/20 font-mono uppercase tracking-wider cursor-pointer hover:bg-amber-400/20 hover:border-amber-400/40 transition-colors active:scale-95"
                    title="Copy to clipboard"
                  >
                    Ready for Generation
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-neutral-600 mt-4 italic text-center">
            Assets will be placed at{" "}
            <code className="font-mono text-neutral-500">
              public/showcase/the-showrunner/
            </code>{" "}
            once generated.
          </p>
        </div>

        {/* ── CTA ── */}
        <div
          className="relative overflow-hidden rounded-2xl border border-amber-500/25 text-center px-6 py-14 md:py-20"
          style={{
            background:
              "linear-gradient(160deg, #0c0c0c 0%, #110f05 45%, #0c0c0c 100%)",
          }}
        >
          {/* Corner brackets */}
          <div className="absolute top-4 left-4 w-7 h-7 border-t-2 border-l-2 border-amber-500/40 pointer-events-none" />
          <div className="absolute top-4 right-4 w-7 h-7 border-t-2 border-r-2 border-amber-500/40 pointer-events-none" />
          <div className="absolute bottom-4 left-4 w-7 h-7 border-b-2 border-l-2 border-amber-500/40 pointer-events-none" />
          <div className="absolute bottom-4 right-4 w-7 h-7 border-b-2 border-r-2 border-amber-500/40 pointer-events-none" />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold uppercase tracking-wider">
              <Zap className="w-3 h-3" />
              Start building your show
            </div>

            <h3 className="text-3xl md:text-4xl lg:text-5xl font-black mb-4 tracking-tight text-gold-shimmer">
              {showrunner.landingCopy.headline}
            </h3>
            <p className="text-sm md:text-base text-neutral-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              {showrunner.landingCopy.subheadline}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link href="/register">
                <button
                  type="button"
                  className="px-8 py-3.5 rounded-xl font-bold text-black text-base transition-all hover:scale-105 active:scale-95 shadow-xl shadow-amber-500/20"
                  style={{
                    background:
                      "linear-gradient(135deg, #d4af37 0%, #f5e6a3 50%, #d4af37 100%)",
                  }}
                  data-testid="button-cta-start-production"
                >
                  Start Your Production
                </button>
              </Link>

              <Link href="/signature-cast">
                  <button
                    type="button"
                    className="px-7 py-3.5 rounded-xl font-semibold text-amber-300 text-sm border border-amber-500/30 hover:bg-amber-500/10 transition-all"
                  >
                    Browse Digital Cast
                  </button>
                </Link>

                <button
                type="button"
                className="flex items-center gap-2 px-6 py-3.5 rounded-xl border border-amber-500/30 text-amber-400 text-sm font-semibold cursor-pointer hover:bg-amber-500/10 transition-all active:scale-95"
              >
                <Sparkles className="w-4 h-4" />
                Ready for Generation
              </button>
            </div>

            <p className="text-xs text-neutral-600 mt-8 italic">
              Built as a VirElle Studios showcase. No generation credits were spent.
            </p>
          </div>
        </div>
      </section>
    );
  }
  