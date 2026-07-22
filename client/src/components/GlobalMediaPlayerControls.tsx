import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Maximize,
  Minimize,
  Minus,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  SkipBack,
  SkipForward,
  Square,
  Trash2,
  X,
} from "lucide-react";

const SEEK_SECONDS = 10;
const PLAYER_ROOT_ATTR = "data-virelle-player-root";
const MINIMISED_ATTR = "data-virelle-minimised";

function findPlayerRoot(): HTMLElement | null {
  return (
    Array.from(document.querySelectorAll<HTMLElement>("div.fixed.inset-0")).find(
      candidate =>
        candidate.isConnected &&
        !!candidate.querySelector<HTMLButtonElement>(
          'button[aria-label="Close player"]',
        ),
    ) ?? null
  );
}

function normaliseUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value, window.location.href).href;
  } catch {
    return value;
  }
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

export default function GlobalMediaPlayerControls() {
  const utils = trpc.useUtils();
  const [playerRoot, setPlayerRoot] = useState<HTMLElement | null>(null);
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  const [isMinimised, setIsMinimised] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const isMovieLibrary =
    typeof window !== "undefined" &&
    (window.location.pathname === "/movies" ||
      window.location.pathname.startsWith("/movies/"));

  const { data: movies = [] } = trpc.movie.list.useQuery(undefined, {
    enabled: !!playerRoot && isMovieLibrary,
    staleTime: 30_000,
  });

  const activeLibraryMovie = useMemo(() => {
    if (!video || !isMovieLibrary) return null;
    const activeUrl = normaliseUrl(video.currentSrc || video.src);
    return (
      movies.find((movie: any) => normaliseUrl(movie.fileUrl) === activeUrl) ??
      null
    );
  }, [isMovieLibrary, movies, video]);

  const deleteMutation = trpc.movie.delete.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.movie.list.invalidate(),
        utils.movie.listGrouped.invalidate(),
      ]);
      setDeleteConfirmOpen(false);
      toast.success("Video deleted");
      const closeButton =
        playerRoot?.querySelector<HTMLButtonElement>(
          'button[aria-label="Close player"]',
        );
      closeButton?.click();
    },
    onError: error =>
      toast.error(error.message || "Video could not be deleted."),
  });

  useEffect(() => {
    const refresh = () => {
      const nextRoot = findPlayerRoot();
      setPlayerRoot(previous => (previous === nextRoot ? previous : nextRoot));
      setVideo(previous => {
        const nextVideo =
          nextRoot?.querySelector<HTMLVideoElement>("video") ?? null;
        return previous === nextVideo ? previous : nextVideo;
      });
    };

    refresh();
    const observer = new MutationObserver(refresh);
    observer.observe(document.body, { childList: true, subtree: true });
    const interval = window.setInterval(refresh, 1000);
    return () => {
      observer.disconnect();
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!playerRoot) {
      setIsMinimised(false);
      document.body.classList.remove("virelle-pro-player-active");
      return;
    }

    playerRoot.setAttribute(PLAYER_ROOT_ATTR, "true");
    playerRoot.setAttribute(MINIMISED_ATTR, String(isMinimised));
    document.body.classList.add("virelle-pro-player-active");

    return () => {
      playerRoot.removeAttribute(PLAYER_ROOT_ATTR);
      playerRoot.removeAttribute(MINIMISED_ATTR);
      document.body.classList.remove("virelle-pro-player-active");
    };
  }, [isMinimised, playerRoot]);

  useEffect(() => {
    if (!video) {
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      return;
    }

    const sync = () => {
      setIsPlaying(!video.paused && !video.ended);
      setCurrentTime(video.currentTime || 0);
      setDuration(Number.isFinite(video.duration) ? video.duration : 0);
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    sync();
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("timeupdate", sync);
    video.addEventListener("durationchange", sync);
    video.addEventListener("loadedmetadata", sync);
    video.addEventListener("ended", sync);
    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("timeupdate", sync);
      video.removeEventListener("durationchange", sync);
      video.removeEventListener("loadedmetadata", sync);
      video.removeEventListener("ended", sync);
    };
  }, [video]);

  useEffect(() => {
    const onFullscreenChange = () =>
      setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const closePlayer = useCallback(() => {
    const closeButton =
      playerRoot?.querySelector<HTMLButtonElement>(
        'button[aria-label="Close player"]',
      );
    closeButton?.click();
  }, [playerRoot]);

  const togglePlay = useCallback(() => {
    if (!video) return;
    if (video.paused) {
      void video
        .play()
        .catch(() => toast.error("Playback could not be started."));
    } else {
      video.pause();
    }
  }, [video]);

  const stop = useCallback(() => {
    if (!video) return;
    video.pause();
    video.currentTime = 0;
    setCurrentTime(0);
  }, [video]);

  const seek = useCallback(
    (delta: number) => {
      if (!video) return;
      const upper = Number.isFinite(video.duration)
        ? video.duration
        : Number.MAX_SAFE_INTEGER;
      video.currentTime = Math.max(
        0,
        Math.min(upper, video.currentTime + delta),
      );
    },
    [video],
  );

  const clickLegacyControl = useCallback(
    (ariaLabel: string) => {
      playerRoot
        ?.querySelector<HTMLButtonElement>(`button[aria-label="${ariaLabel}"]`)
        ?.click();
    },
    [playerRoot],
  );

  const toggleFullscreen = useCallback(async () => {
    try {
      if (isMinimised) setIsMinimised(false);
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      toast.error("Fullscreen is not available in this browser.");
    }
  }, [isMinimised]);

  const minimise = useCallback(async () => {
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {
        // Continue minimising if the browser already exited fullscreen.
      }
    }
    setIsMinimised(true);
  }, []);

  if (!playerRoot) return null;

  const title =
    playerRoot.querySelector("h2")?.textContent?.trim() ||
    activeLibraryMovie?.title ||
    "Media";
  const previousButton =
    playerRoot.querySelector<HTMLButtonElement>(
      'button[aria-label="Previous video"]',
    );
  const nextButton =
    playerRoot.querySelector<HTMLButtonElement>(
      'button[aria-label="Next video"]',
    );
  const canPrevious = !!previousButton && !previousButton.disabled;
  const canNext = !!nextButton && !nextButton.disabled;

  return (
    <>
      <style>{`
        [${PLAYER_ROOT_ATTR}="true"] > div.absolute.top-0.left-0.right-0 > div:last-child {
          opacity: 0 !important;
          pointer-events: none !important;
        }
        [${PLAYER_ROOT_ATTR}="true"][${MINIMISED_ATTR}="true"] {
          opacity: 0 !important;
          pointer-events: none !important;
          width: 1px !important;
          height: 1px !important;
          left: -10000px !important;
          top: auto !important;
          bottom: 0 !important;
          overflow: hidden !important;
        }
      `}</style>

      {!isMinimised && (
        <>
          <div
            data-global-media-controls="window"
            className="fixed right-2 z-[80] flex items-center gap-0.5 rounded-bl-xl bg-black/70 pr-1 shadow-xl backdrop-blur-md"
            style={{ top: "max(0.75rem, env(safe-area-inset-top))" }}
          >
            {activeLibraryMovie && (
              <Button
                size="icon"
                variant="ghost"
                className="h-11 w-11 text-white/70 hover:bg-red-500/15 hover:text-red-300"
                onClick={() => setDeleteConfirmOpen(true)}
                aria-label="Delete video"
                title="Delete video"
              >
                <Trash2 className="h-5 w-5" />
              </Button>
            )}
            <Button
              size="icon"
              variant="ghost"
              className="h-11 w-11 text-white/80 hover:text-white"
              onClick={() => void minimise()}
              aria-label="Minimise player"
              title="Minimise"
            >
              <Minus className="h-5 w-5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-11 w-11 text-white/80 hover:text-white"
              onClick={() => void toggleFullscreen()}
              aria-label={
                isFullscreen ? "Exit fullscreen" : "Enter fullscreen"
              }
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? (
                <Minimize className="h-5 w-5" />
              ) : (
                <Maximize className="h-5 w-5" />
              )}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-11 w-11 text-white hover:bg-red-500/80"
              onClick={closePlayer}
              aria-label="Close upgraded player"
              title="Close"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {video && (
            <div
              data-global-media-controls="transport"
              className="fixed bottom-[84px] left-1/2 z-[75] flex -translate-x-1/2 items-center gap-0.5 rounded-xl border border-white/10 bg-black/75 p-1 shadow-2xl backdrop-blur-md"
            >
              {canPrevious && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-10 w-10 text-white/75"
                  onClick={() => clickLegacyControl("Previous video")}
                  aria-label="Previous scene"
                  title="Previous scene"
                >
                  <SkipBack className="h-4 w-4" />
                </Button>
              )}
              <Button
                size="icon"
                variant="ghost"
                className="h-10 w-10 text-white/75"
                onClick={() => seek(-SEEK_SECONDS)}
                aria-label={`Rewind ${SEEK_SECONDS} seconds`}
                title={`Rewind ${SEEK_SECONDS} seconds`}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-11 w-11 text-white"
                onClick={togglePlay}
                aria-label={isPlaying ? "Pause" : "Play"}
                title={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5 fill-white" />
                ) : (
                  <Play className="ml-0.5 h-5 w-5 fill-white" />
                )}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-10 w-10 text-white/75"
                onClick={stop}
                aria-label="Stop"
                title="Stop"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-10 w-10 text-white/75"
                onClick={() => seek(SEEK_SECONDS)}
                aria-label={`Fast forward ${SEEK_SECONDS} seconds`}
                title={`Fast forward ${SEEK_SECONDS} seconds`}
              >
                <RotateCw className="h-4 w-4" />
              </Button>
              {canNext && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-10 w-10 text-white/75"
                  onClick={() => clickLegacyControl("Next video")}
                  aria-label="Next scene"
                  title="Next scene"
                >
                  <SkipForward className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </>
      )}

      {isMinimised && (
        <div
          data-global-media-controls="minimised"
          className="fixed bottom-0 left-0 right-0 z-[90] flex min-h-[68px] items-center gap-2 border-t border-white/10 bg-black/95 px-3 shadow-2xl"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-white">{title}</p>
            <p className="font-mono text-[10px] text-white/45">
              {formatTime(currentTime)} / {formatTime(duration)}
            </p>
          </div>
          {canPrevious && (
            <Button
              size="icon"
              variant="ghost"
              className="h-9 w-9 text-white/70"
              onClick={() => clickLegacyControl("Previous video")}
              aria-label="Previous scene"
            >
              <SkipBack className="h-4 w-4" />
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            className="h-9 w-9 text-white"
            onClick={togglePlay}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4 fill-white" />
            ) : (
              <Play className="ml-0.5 h-4 w-4 fill-white" />
            )}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="hidden h-9 w-9 text-white/70 sm:flex"
            onClick={stop}
            aria-label="Stop"
          >
            <Square className="h-3.5 w-3.5 fill-current" />
          </Button>
          {canNext && (
            <Button
              size="icon"
              variant="ghost"
              className="h-9 w-9 text-white/70"
              onClick={() => clickLegacyControl("Next video")}
              aria-label="Next scene"
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            className="h-9 w-9 text-white/70"
            onClick={() => setIsMinimised(false)}
            aria-label="Restore player"
            title="Restore"
          >
            <Maximize className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-9 w-9 text-white/80 hover:bg-red-500/80"
            onClick={closePlayer}
            aria-label="Close upgraded player"
            title="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <AlertDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this video?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes “{activeLibraryMovie?.title || title}”
              from your movie library. Closing or minimising the player never
              deletes media.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={!activeLibraryMovie || deleteMutation.isPending}
              onClick={event => {
                event.preventDefault();
                if (activeLibraryMovie) {
                  deleteMutation.mutate({ id: activeLibraryMovie.id });
                }
              }}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete video"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
