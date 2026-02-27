import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Volume1,
  Maximize,
  Minimize,
  SkipBack,
  SkipForward,
  PictureInPicture2,
  Settings,
  X,
  ChevronLeft,
  ChevronRight,
  Repeat,
  Download,
  Film,
} from "lucide-react";

type MovieItem = {
  id: number;
  title: string;
  description: string | null;
  type: string;
  fileUrl: string | null;
  thumbnailUrl: string | null;
  duration: number | null;
  fileSize: number | null;
  mimeType: string | null;
  movieTitle: string | null;
  sceneNumber: number | null;
};

interface MediaPlayerProps {
  movie: MovieItem;
  playlist?: MovieItem[];
  onClose: () => void;
  onNavigate?: (movieId: number) => void;
}

const PLAYBACK_SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

const TYPE_LABELS: Record<string, string> = {
  scene: "Scene",
  trailer: "Trailer",
  film: "Full Film",
};

const TYPE_COLORS: Record<string, string> = {
  scene: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  trailer: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  film: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};

export default function MediaPlayer({ movie, playlist, onClose, onNavigate }: MediaPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isLooping, setIsLooping] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(false);

  const currentIndex = playlist?.findIndex((m) => m.id === movie.id) ?? -1;
  const hasPrev = playlist && currentIndex > 0;
  const hasNext = playlist && currentIndex < (playlist?.length ?? 0) - 1;

  // Auto-hide controls
  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    setShowControls(true);
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
        setShowSpeedMenu(false);
      }, 3000);
    }
  }, [isPlaying]);

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onTimeUpdate = () => setCurrentTime(video.currentTime);
    const onDurationChange = () => setDuration(video.duration);
    const onProgress = () => {
      if (video.buffered.length > 0) {
        setBuffered(video.buffered.end(video.buffered.length - 1));
      }
    };
    const onWaiting = () => setIsLoading(true);
    const onCanPlay = () => { setIsLoading(false); setHasError(false); };
    const onError = () => { setIsLoading(false); setHasError(true); };
    const onEnded = () => {
      if (isLooping) {
        video.currentTime = 0;
        video.play();
      } else if (hasNext && onNavigate) {
        onNavigate(playlist![currentIndex + 1].id);
      } else {
        setIsPlaying(false);
      }
    };

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("durationchange", onDurationChange);
    video.addEventListener("progress", onProgress);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("error", onError);
    video.addEventListener("ended", onEnded);

    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("durationchange", onDurationChange);
      video.removeEventListener("progress", onProgress);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("error", onError);
      video.removeEventListener("ended", onEnded);
    };
  }, [isLooping, hasNext, currentIndex, playlist, onNavigate]);

  // Fullscreen change listener
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const video = videoRef.current;
      if (!video) return;

      switch (e.key.toLowerCase()) {
        case " ":
        case "k":
          e.preventDefault();
          video.paused ? video.play() : video.pause();
          resetControlsTimeout();
          break;
        case "arrowleft":
          e.preventDefault();
          video.currentTime = Math.max(0, video.currentTime - 10);
          resetControlsTimeout();
          break;
        case "arrowright":
          e.preventDefault();
          video.currentTime = Math.min(video.duration, video.currentTime + 10);
          resetControlsTimeout();
          break;
        case "arrowup":
          e.preventDefault();
          setVolume((v) => { const nv = Math.min(1, v + 0.1); video.volume = nv; return nv; });
          resetControlsTimeout();
          break;
        case "arrowdown":
          e.preventDefault();
          setVolume((v) => { const nv = Math.max(0, v - 0.1); video.volume = nv; return nv; });
          resetControlsTimeout();
          break;
        case "m":
          e.preventDefault();
          setIsMuted((m) => { video.muted = !m; return !m; });
          resetControlsTimeout();
          break;
        case "f":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "escape":
          if (isFullscreen) {
            document.exitFullscreen();
          } else {
            onClose();
          }
          break;
        case "j":
          e.preventDefault();
          video.currentTime = Math.max(0, video.currentTime - 10);
          resetControlsTimeout();
          break;
        case "l":
          e.preventDefault();
          video.currentTime = Math.min(video.duration, video.currentTime + 10);
          resetControlsTimeout();
          break;
        case "n":
          if (hasNext && onNavigate) {
            e.preventDefault();
            onNavigate(playlist![currentIndex + 1].id);
          }
          break;
        case "p":
          if (hasPrev && onNavigate) {
            e.preventDefault();
            onNavigate(playlist![currentIndex - 1].id);
          }
          break;
        case "0":
        case "home":
          e.preventDefault();
          video.currentTime = 0;
          resetControlsTimeout();
          break;
        case "end":
          e.preventDefault();
          video.currentTime = video.duration;
          resetControlsTimeout();
          break;
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isFullscreen, hasNext, hasPrev, currentIndex, playlist, onNavigate, resetControlsTimeout, onClose]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    video.paused ? video.play() : video.pause();
    resetControlsTimeout();
  };

  const toggleFullscreen = async () => {
    const container = containerRef.current;
    if (!container) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await container.requestFullscreen();
    }
  };

  const togglePiP = async () => {
    const video = videoRef.current;
    if (!video) return;
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
    } else {
      await video.requestPictureInPicture();
    }
  };

  const handleSeek = (value: number[]) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = value[0];
    setCurrentTime(value[0]);
  };

  const handleVolumeChange = (value: number[]) => {
    const video = videoRef.current;
    if (!video) return;
    const v = value[0];
    video.volume = v;
    setVolume(v);
    if (v > 0 && isMuted) {
      video.muted = false;
      setIsMuted(false);
    }
  };

  const handleSpeedChange = (speed: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = speed;
    setPlaybackSpeed(speed);
    setShowSpeedMenu(false);
  };

  const handleProgressHover = (e: React.MouseEvent<HTMLDivElement>) => {
    const bar = progressBarRef.current;
    if (!bar || !duration) return;
    const rect = bar.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    setHoverTime(pos * duration);
    setHoverPosition(e.clientX - rect.left);
  };

  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  const playableMovies = playlist?.filter((m) => m.fileUrl) ?? [];

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
      {/* Top Bar */}
      <div
        className={`absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/80 to-transparent px-4 py-3 flex items-center justify-between transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Button size="icon" variant="ghost" className="text-white hover:bg-white/10 shrink-0" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <h2 className="text-white font-medium text-sm sm:text-base truncate">{movie.title}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge className={`${TYPE_COLORS[movie.type] || TYPE_COLORS.film} border text-[10px]`}>
                {TYPE_LABELS[movie.type] || movie.type}
              </Badge>
              {movie.movieTitle && (
                <span className="text-white/50 text-xs truncate">{movie.movieTitle}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {playlist && playlist.length > 1 && (
            <Button
              size="sm"
              variant="ghost"
              className="text-white/70 hover:text-white hover:bg-white/10 gap-1 text-xs"
              onClick={() => setShowPlaylist(!showPlaylist)}
            >
              <Film className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{currentIndex + 1}/{playableMovies.length}</span>
            </Button>
          )}
          {movie.fileUrl && (
            <Button
              size="icon"
              variant="ghost"
              className="text-white/70 hover:text-white hover:bg-white/10"
              onClick={() => {
                const a = document.createElement("a");
                a.href = movie.fileUrl!;
                a.download = movie.title;
                a.click();
              }}
            >
              <Download className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Playlist Sidebar */}
      {showPlaylist && playlist && (
        <div className="absolute top-0 right-0 bottom-0 w-72 sm:w-80 z-30 bg-black/90 backdrop-blur-sm border-l border-white/10 overflow-y-auto">
          <div className="p-3 border-b border-white/10 flex items-center justify-between sticky top-0 bg-black/90 backdrop-blur-sm">
            <h3 className="text-white text-sm font-medium">Playlist</h3>
            <Button size="icon" variant="ghost" className="text-white/70 hover:text-white h-7 w-7" onClick={() => setShowPlaylist(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="p-2 space-y-1">
            {playableMovies.map((m, i) => (
              <button
                key={m.id}
                className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors ${m.id === movie.id ? "bg-white/15 ring-1 ring-primary/50" : "hover:bg-white/10"}`}
                onClick={() => {
                  if (onNavigate && m.id !== movie.id) onNavigate(m.id);
                }}
              >
                <div className="relative w-16 h-10 rounded bg-white/5 overflow-hidden shrink-0">
                  {m.thumbnailUrl ? (
                    <img src={m.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Film className="h-4 w-4 text-white/20" />
                    </div>
                  )}
                  {m.id === movie.id && (
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                      <Play className="h-3 w-3 text-white fill-white" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-xs truncate ${m.id === movie.id ? "text-white font-medium" : "text-white/70"}`}>
                    {m.title}
                  </p>
                  <p className="text-[10px] text-white/40 mt-0.5">
                    {TYPE_LABELS[m.type] || m.type}
                    {m.duration ? ` · ${formatTime(m.duration)}` : ""}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Video Area */}
      <div
        ref={containerRef}
        className="flex-1 relative flex items-center justify-center cursor-pointer"
        onClick={(e) => {
          // Don't toggle play if clicking on controls
          if ((e.target as HTMLElement).closest("[data-controls]")) return;
          togglePlay();
          resetControlsTimeout();
        }}
        onMouseMove={resetControlsTimeout}
        onTouchStart={resetControlsTimeout}
      >
        {movie.fileUrl ? (
          <video
            ref={videoRef}
            src={movie.fileUrl}
            className="max-w-full max-h-full w-full h-full object-contain"
            playsInline
            autoPlay
            poster={movie.thumbnailUrl || undefined}
          />
        ) : (
          <div className="flex flex-col items-center gap-4 text-white/50">
            <Film className="h-20 w-20" />
            <p className="text-lg">No video file uploaded</p>
          </div>
        )}

        {/* Loading Spinner */}
        {isLoading && movie.fileUrl && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        )}

        {/* Error State */}
        {hasError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white/70">
            <Film className="h-16 w-16 mb-4 text-red-400/50" />
            <p className="text-lg font-medium text-red-400">Failed to load video</p>
            <p className="text-sm mt-1">The video file may be unavailable or in an unsupported format.</p>
            <Button
              variant="outline"
              className="mt-4 border-white/20 text-white hover:bg-white/10"
              onClick={() => {
                setHasError(false);
                setIsLoading(true);
                videoRef.current?.load();
              }}
            >
              Try Again
            </Button>
          </div>
        )}

        {/* Center Play Button (shown when paused and controls visible) */}
        {!isPlaying && showControls && movie.fileUrl && !hasError && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center">
              <Play className="h-8 w-8 sm:h-10 sm:w-10 text-white fill-white ml-1" />
            </div>
          </div>
        )}

        {/* Bottom Controls */}
        {movie.fileUrl && (
          <div
            data-controls
            className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-16 pb-3 px-3 sm:px-5 transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Progress Bar */}
            <div
              ref={progressBarRef}
              className="group relative h-6 flex items-center cursor-pointer mb-1"
              onMouseMove={handleProgressHover}
              onMouseLeave={() => setHoverTime(null)}
            >
              {/* Hover Time Tooltip */}
              {hoverTime !== null && (
                <div
                  className="absolute -top-8 bg-black/90 text-white text-xs px-2 py-1 rounded pointer-events-none"
                  style={{ left: `${hoverPosition}px`, transform: "translateX(-50%)" }}
                >
                  {formatTime(hoverTime)}
                </div>
              )}

              {/* Track Background */}
              <div className="absolute left-0 right-0 h-1 group-hover:h-1.5 bg-white/20 rounded-full transition-all">
                {/* Buffered */}
                <div
                  className="absolute h-full bg-white/30 rounded-full"
                  style={{ width: `${duration ? (buffered / duration) * 100 : 0}%` }}
                />
                {/* Progress */}
                <div
                  className="absolute h-full bg-primary rounded-full"
                  style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                />
                {/* Thumb */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                  style={{ left: `${duration ? (currentTime / duration) * 100 : 0}%`, transform: "translate(-50%, -50%)" }}
                />
              </div>

              {/* Invisible Slider for interaction */}
              <Slider
                value={[currentTime]}
                min={0}
                max={duration || 1}
                step={0.1}
                onValueChange={handleSeek}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>

            {/* Controls Row */}
            <div className="flex items-center justify-between gap-2">
              {/* Left Controls */}
              <div className="flex items-center gap-1 sm:gap-2">
                {/* Prev */}
                {playlist && playlist.length > 1 && (
                  <TooltipProvider delayDuration={300}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-white/80 hover:text-white hover:bg-white/10 h-8 w-8 sm:h-9 sm:w-9"
                          disabled={!hasPrev}
                          onClick={() => hasPrev && onNavigate?.(playlist![currentIndex - 1].id)}
                        >
                          <SkipBack className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top"><p>Previous (P)</p></TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                {/* Play/Pause */}
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-white hover:bg-white/10 h-9 w-9 sm:h-10 sm:w-10"
                        onClick={togglePlay}
                      >
                        {isPlaying ? <Pause className="h-5 w-5 fill-white" /> : <Play className="h-5 w-5 fill-white ml-0.5" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top"><p>{isPlaying ? "Pause" : "Play"} (Space)</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {/* Next */}
                {playlist && playlist.length > 1 && (
                  <TooltipProvider delayDuration={300}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-white/80 hover:text-white hover:bg-white/10 h-8 w-8 sm:h-9 sm:w-9"
                          disabled={!hasNext}
                          onClick={() => hasNext && onNavigate?.(playlist![currentIndex + 1].id)}
                        >
                          <SkipForward className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top"><p>Next (N)</p></TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                {/* Volume */}
                <div className="flex items-center gap-1 group/vol">
                  <TooltipProvider delayDuration={300}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-white/80 hover:text-white hover:bg-white/10 h-8 w-8 sm:h-9 sm:w-9"
                          onClick={() => {
                            const video = videoRef.current;
                            if (!video) return;
                            video.muted = !isMuted;
                            setIsMuted(!isMuted);
                          }}
                        >
                          <VolumeIcon className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top"><p>Mute (M)</p></TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <div className="w-0 overflow-hidden group-hover/vol:w-20 transition-all duration-200">
                    <Slider
                      value={[isMuted ? 0 : volume]}
                      min={0}
                      max={1}
                      step={0.05}
                      onValueChange={handleVolumeChange}
                      className="w-20"
                    />
                  </div>
                </div>

                {/* Time */}
                <span className="text-white/70 text-xs sm:text-sm font-mono ml-1 whitespace-nowrap">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              {/* Right Controls */}
              <div className="flex items-center gap-1">
                {/* Loop */}
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className={`h-8 w-8 sm:h-9 sm:w-9 hover:bg-white/10 hidden sm:flex ${isLooping ? "text-primary" : "text-white/60 hover:text-white"}`}
                        onClick={() => setIsLooping(!isLooping)}
                      >
                        <Repeat className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top"><p>{isLooping ? "Disable" : "Enable"} Loop</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {/* Speed */}
                <div className="relative">
                  <TooltipProvider delayDuration={300}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          className={`h-8 sm:h-9 px-2 hover:bg-white/10 text-xs font-mono ${playbackSpeed !== 1 ? "text-primary" : "text-white/60 hover:text-white"}`}
                          onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                        >
                          {playbackSpeed}x
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top"><p>Playback Speed</p></TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  {showSpeedMenu && (
                    <div className="absolute bottom-full right-0 mb-2 bg-black/95 border border-white/10 rounded-lg p-1 min-w-[100px]">
                      {PLAYBACK_SPEEDS.map((speed) => (
                        <button
                          key={speed}
                          className={`w-full text-left px-3 py-1.5 rounded text-sm transition-colors ${speed === playbackSpeed ? "bg-primary/20 text-primary" : "text-white/70 hover:text-white hover:bg-white/10"}`}
                          onClick={() => handleSpeedChange(speed)}
                        >
                          {speed}x
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* PiP */}
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-white/60 hover:text-white hover:bg-white/10 h-8 w-8 sm:h-9 sm:w-9 hidden sm:flex"
                        onClick={togglePiP}
                      >
                        <PictureInPicture2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top"><p>Picture-in-Picture</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {/* Fullscreen */}
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-white/80 hover:text-white hover:bg-white/10 h-8 w-8 sm:h-9 sm:w-9"
                        onClick={toggleFullscreen}
                      >
                        {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top"><p>{isFullscreen ? "Exit Fullscreen" : "Fullscreen"} (F)</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
