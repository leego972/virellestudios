import { useState, useRef } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import GoldWatermarkLaunch from "@/components/GoldWatermarkLaunch";
import { Play, Pause, Volume2, VolumeX, Maximize, Film, Clock, Layers, Eye, ChevronDown, ChevronUp, Sparkles, Star, TrendingUp, Zap, Users, Globe } from "lucide-react";

/**
 * Showcase / Demo Reel — Public page to display VirElle Studios film quality.
 * Shows completed AI-generated films with cinematic video players.
 */
export default function Showcase() {
  const { data: films, isLoading } = trpc.showcase.featured.useQuery();
  const [expandedFilm, setExpandedFilm] = useState<number | null>(null);
  const [activeScene, setActiveScene] = useState<Record<number, number>>({});

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
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

          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight mb-4"
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
              <div className="text-2xl font-bold" style={{ color: "#d4af37" }}>
                {films?.length || 0}
              </div>
              <div className="text-xs text-neutral-500 uppercase tracking-wider">Films</div>
            </div>
            <div className="w-px h-8 bg-neutral-800" />
            <div className="text-center">
              <div className="text-2xl font-bold" style={{ color: "#d4af37" }}>
                {films?.reduce((acc: number, f: any) => acc + (f.completedScenes || 0), 0) || 0}
              </div>
              <div className="text-xs text-neutral-500 uppercase tracking-wider">Scenes</div>
            </div>
            <div className="w-px h-8 bg-neutral-800" />
            <div className="text-center">
              <div className="text-2xl font-bold" style={{ color: "#d4af37" }}>1080p</div>
              <div className="text-xs text-neutral-500 uppercase tracking-wider">Quality</div>
            </div>
            <div className="w-px h-8 bg-neutral-800" />
            <div className="text-center">
              <div className="text-2xl font-bold" style={{ color: "#d4af37" }}>100%</div>
              <div className="text-xs text-neutral-500 uppercase tracking-wider">AI Generated</div>
            </div>
          </div>
        </div>
      </header>

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
          <h2 className="text-2xl md:text-3xl font-bold mb-2"
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
          <Sparkles className="w-8 h-8 mx-auto mb-4" style={{ color: "#d4af37" }} />
          <h2 className="text-3xl md:text-4xl font-bold mb-4"
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
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{film.title}</h2>
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
                    <Play className="w-6 h-6 text-neutral-700 group-hover:text-neutral-500 transition-colors" />
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
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>
            <button
              onClick={toggleMute}
              className="text-white hover:text-[#d4af37] transition-colors"
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
            <span className="text-xs text-neutral-400">{title}</span>
          </div>
          <button
            onClick={toggleFullscreen}
            className="text-white hover:text-[#d4af37] transition-colors"
          >
            <Maximize className="w-4 h-4" />
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
                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
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
                  <h3 className="font-semibold text-white text-sm truncate">{film.title}</h3>
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
