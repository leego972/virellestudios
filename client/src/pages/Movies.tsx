import { useState, useRef, useCallback } from "react";
import MediaPlayer from "@/components/MediaPlayer";
import StudioOpener from "@/components/StudioOpener";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useSubscription } from "@/hooks/useSubscription";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Film,
  Clapperboard,
  Play,
  Download,
  Trash2,
  Search,
  Grid3X3,
  List,
  FileVideo,
  Clock,
  HardDrive,
  FolderOpen,
  ChevronLeft,
  Folder,
  Sparkles,
  Youtube,
  ExternalLink,
  Lock,
} from "lucide-react";
import { useLocation } from "wouter";

type MovieType = "scene" | "trailer" | "film";

const TYPE_LABELS: Record<MovieType, string> = {
  scene: "Scene",
  trailer: "Trailer",
  film: "Full Film",
};

const TYPE_COLORS: Record<MovieType, string> = {
  scene: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  trailer: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  film: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

type MovieItem = {
  id: number;
  userId: number;
  projectId: number | null;
  movieTitle: string | null;
  title: string;
  sceneNumber: number | null;
  description: string | null;
  type: string;
  fileUrl: string | null;
  fileKey: string | null;
  thumbnailUrl: string | null;
  thumbnailKey: string | null;
  duration: number | null;
  fileSize: number | null;
  mimeType: string | null;
  tags: unknown;
  createdAt: Date;
  updatedAt: Date;
};

// ─── YouTube Export Modal ────────────────────────────────────────────────────
function YouTubeExportModal({
  movie,
  open,
  onClose,
}: {
  movie: MovieItem | null;
  open: boolean;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [privacy, setPrivacy] = useState<"public" | "unlisted" | "private">("public");
  const exportMutation = trpc.youtube.exportToChannel.useMutation({
    onSuccess: (data) => {
      toast.success(
        <span>
          Uploaded to YouTube!{" "}
          <a
            href={data.youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-amber-400"
          >
            Watch on YouTube
          </a>
        </span>
      );
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  // Pre-fill title when movie changes
  const prevMovieId = useRef<number | null>(null);
  if (movie && movie.id !== prevMovieId.current) {
    prevMovieId.current = movie.id;
    setTitle(movie.title);
    setDescription(
      movie.description
        ? `${movie.description}\n\nCreated with Virelle Studios — AI-powered cinema.\nhttps://virelle.life`
        : `Created with Virelle Studios — AI-powered cinema.\nhttps://virelle.life`
    );
  }

  if (!movie) return null;

  const canExport = !!movie.fileUrl;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Youtube className="h-5 w-5 text-red-500" />
            Export to Virelle Studios YouTube
          </DialogTitle>
          <DialogDescription>
            This will upload your video to the official{" "}
            <span className="text-amber-400 font-medium">Virelle Studios</span>{" "}
            YouTube channel.
          </DialogDescription>
        </DialogHeader>

        {!canExport ? (
          <div className="py-4 text-center text-muted-foreground">
            <FileVideo className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p>This movie has no video file to upload.</p>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="yt-title">Title</Label>
              <Input
                id="yt-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
                placeholder="Video title on YouTube"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="yt-desc">Description</Label>
              <Textarea
                id="yt-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                maxLength={5000}
                placeholder="Video description"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Privacy</Label>
              <Select value={privacy} onValueChange={(v) => setPrivacy(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="unlisted">Unlisted</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={exportMutation.isPending}>
            Cancel
          </Button>
          {canExport && (
            <Button
              className="gap-2 bg-red-600 hover:bg-red-700 text-white"
              disabled={!title.trim() || exportMutation.isPending}
              onClick={() =>
                exportMutation.mutate({
                  movieId: movie.id,
                  videoUrl: movie.fileUrl!,
                  title: title.trim(),
                  description,
                  privacyStatus: privacy,
                  projectId: movie.projectId ?? undefined,
                })
              }
            >
              <Youtube className="h-4 w-4" />
              {exportMutation.isPending ? "Uploading…" : "Upload to YouTube"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Movies() {
  const [showPlayer, setShowPlayer] = useState<number | null>(null);
  const [showOpenerBefore, setShowOpenerBefore] = useState<number | null>(null); // movie ID to play after opener
  const [searchQuery, setSearchQuery] = useState("");
  const [ytExportMovie, setYtExportMovie] = useState<MovieItem | null>(null);
  const { tier, isAdmin } = useSubscription();
  const paidTiers = ["independent", "creator", "studio", "industry", "beta"];
  const canYouTubeExport = isAdmin || paidTiers.includes(tier);

  // Helper: show opener before playing full films, play scenes/trailers directly
  const playMovie = useCallback((movieId: number, movieType?: string) => {
    if (movieType === "film") {
      setShowOpenerBefore(movieId);
    } else {
      setShowPlayer(movieId);
    }
  }, []);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [, setLocation] = useLocation();

  const utils = trpc.useUtils();
  const { data: grouped, isLoading } = trpc.movie.listGrouped.useQuery();
  const { data: allMovies = [] } = trpc.movie.list.useQuery();

  const openYouTubeExport = useCallback((movie: MovieItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canYouTubeExport) {
      toast.error("YouTube export is available on Studio plan and above. Upgrade to unlock.");
      return;
    }
    setYtExportMovie(movie);
  }, [canYouTubeExport]);

  const deleteMutation = trpc.movie.delete.useMutation({
    onSuccess: () => {
      utils.movie.listGrouped.invalidate();
      utils.movie.list.invalidate();
      toast.success("Movie deleted");
    },
    onError: (err) => toast.error(err.message),
  });

  // Get folder contents when inside a folder
  const folderContents: MovieItem[] = activeFolder && grouped?.folders
    ? (grouped.folders[activeFolder] || []).sort((a, b) => {
        if (a.type === "film" && b.type !== "film") return -1;
        if (b.type === "film" && a.type !== "film") return 1;
        if (a.type === "trailer" && b.type === "scene") return -1;
        if (b.type === "trailer" && a.type === "scene") return 1;
        return (a.sceneNumber || 0) - (b.sceneNumber || 0);
      })
    : [];

  // Filter for search
  const filteredFolderContents = folderContents.filter(
    (m) =>
      !searchQuery ||
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const playerMovie = showPlayer
    ? allMovies.find((m) => m.id === showPlayer)
    : null;

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="h-12 bg-muted rounded" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-muted rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const folders = grouped?.folders || {};
  const topLevel = grouped?.topLevel || [];
  const folderNames = Object.keys(folders);

  // Filter folders and top-level by search
  const filteredFolderNames = folderNames.filter(
    (name) =>
      !searchQuery || name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredTopLevel = topLevel.filter(
    (m) =>
      (!searchQuery ||
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.description?.toLowerCase().includes(searchQuery.toLowerCase())) &&
      (!typeFilter || m.type === typeFilter)
  );

  // Render a movie card
  const renderMovieCard = (movie: MovieItem) => (
    <Card
      key={movie.id}
      className="overflow-hidden group hover:ring-1 hover:ring-primary/30 transition-all cursor-pointer"
      onClick={() => (movie.fileUrl || movie.thumbnailUrl) ? playMovie(movie.id, movie.type) : undefined}
    >
      <div className="relative aspect-video bg-muted">
        {movie.thumbnailUrl ? (
          <img
            src={movie.thumbnailUrl}
            alt={movie.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Film className="h-12 w-12 text-muted-foreground/30" />
          </div>
        )}
        {/* Play button - visible for any movie with content */}
        {(movie.fileUrl || movie.thumbnailUrl) && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center group-hover:bg-primary/80 transition-all group-hover:scale-110">
              <Play className="h-7 w-7 text-white fill-white ml-1" />
            </div>
          </div>
        )}
        {/* Hover overlay with action buttons - desktop only */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:flex flex-col items-center justify-end pb-3 gap-2">
          {/* Primary row: Watch + Download */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              className="gap-1 h-8 text-xs"
              onClick={(e) => { e.stopPropagation(); playMovie(movie.id, movie.type); }}
            >
              <Play className="h-3 w-3" />
              Watch
            </Button>
            {movie.fileUrl && (
              <Button
                size="sm"
                variant="secondary"
                className="gap-1 h-8 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  const a = document.createElement("a");
                  a.href = movie.fileUrl!;
                  a.download = movie.title;
                  a.click();
                }}
              >
                <Download className="h-3 w-3" />
                Download
              </Button>
            )}
          </div>
          {/* Secondary row: YouTube export (only for trailers & films) */}
          {movie.fileUrl && (movie.type === "trailer" || movie.type === "film") && (
            <Button
              size="sm"
              variant="secondary"
              className={`gap-1.5 h-8 text-xs w-auto px-3 ${
                canYouTubeExport
                  ? "bg-red-600/90 hover:bg-red-600 text-white border-0"
                  : "text-muted-foreground/60 border border-muted-foreground/20"
              }`}
              onClick={(e) => openYouTubeExport(movie, e)}
              title={canYouTubeExport ? "Export to Virelle Studios YouTube" : "Upgrade to Studio plan to export to YouTube"}
            >
              {canYouTubeExport ? <Youtube className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
              {canYouTubeExport ? "Export to YouTube" : "YouTube (Upgrade)"}
            </Button>
          )}
        </div>
        <Badge
          className={`absolute top-2 left-2 ${TYPE_COLORS[movie.type as MovieType]} border text-xs`}
        >
          {TYPE_LABELS[movie.type as MovieType]}
        </Badge>
        {movie.duration && (
          <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
            {formatDuration(movie.duration)}
          </div>
        )}
        {movie.sceneNumber && movie.type === "scene" && (
          <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
            #{movie.sceneNumber}
          </div>
        )}
      </div>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-medium truncate">{movie.title}</h3>
            {movie.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {movie.description}
              </p>
            )}
          </div>
          {/* Card top-right: only delete icon always visible; play is shown on mobile */}
          <div className="flex items-center gap-1 shrink-0">
            {(movie.fileUrl || movie.thumbnailUrl) && (
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 sm:hidden text-primary hover:text-primary"
                onClick={(e) => {
                  e.stopPropagation();
                  playMovie(movie.id, movie.type);
                }}
              >
                <Play className="h-4 w-4" />
              </Button>
            )}
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm("Delete this movie?")) {
                  deleteMutation.mutate({ id: movie.id });
                }
              }}
            >
              <Trash2 className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
          {movie.fileSize && (
            <span className="flex items-center gap-1">
              <HardDrive className="h-3 w-3" />
              {formatFileSize(movie.fileSize)}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {new Date(movie.createdAt).toLocaleDateString()}
          </span>
        </div>
        {(() => {
          const tagArr = movie.tags as string[] | null;
          if (!tagArr || !Array.isArray(tagArr) || tagArr.length === 0)
            return null;
          return (
            <div className="flex flex-wrap gap-1 mt-2">
              {tagArr.map((tag: string, i: number) => (
                <Badge
                  key={i}
                  variant="outline"
                  className="text-[10px] px-1.5 py-0"
                >
                  {String(tag)}
                </Badge>
              ))}
            </div>
          );
        })()}
      </CardContent>
    </Card>
  );

  // Render a movie list row
  const renderMovieRow = (movie: MovieItem) => (
    <Card
      key={movie.id}
      className="hover:ring-1 hover:ring-primary/30 transition-all cursor-pointer"
      onClick={() => (movie.fileUrl || movie.thumbnailUrl) ? playMovie(movie.id, movie.type) : undefined}
    >
      <CardContent className="p-3 flex items-center gap-4">
        <div className="w-24 h-16 rounded-md overflow-hidden bg-muted shrink-0 relative group">
          {movie.thumbnailUrl ? (
            <img
              src={movie.thumbnailUrl}
              alt={movie.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Film className="h-6 w-6 text-muted-foreground/30" />
            </div>
          )}
          {(movie.fileUrl || movie.thumbnailUrl) && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-black/50 flex items-center justify-center group-hover:bg-primary/80 transition-all">
                <Play className="h-4 w-4 text-white fill-white ml-0.5" />
              </div>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium truncate">{movie.title}</h3>
            <Badge
              className={`${TYPE_COLORS[movie.type as MovieType]} border text-[10px] shrink-0`}
            >
              {TYPE_LABELS[movie.type as MovieType]}
            </Badge>
            {movie.sceneNumber && movie.type === "scene" && (
              <span className="text-xs text-muted-foreground">
                #{movie.sceneNumber}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            {movie.duration && <span>{formatDuration(movie.duration)}</span>}
            {movie.fileSize && <span>{formatFileSize(movie.fileSize)}</span>}
            <span>{new Date(movie.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          <Button
            size="icon"
            variant="ghost"
            className="h-9 w-9 sm:h-8 sm:w-8"
            onClick={(e) => { e.stopPropagation(); playMovie(movie.id, movie.type); }}
          >
            <Play className="h-4 w-4" />
          </Button>
          {movie.fileUrl && (
            <Button
              size="icon"
              variant="ghost"
              className="h-9 w-9 sm:h-8 sm:w-8 hidden sm:flex"
              onClick={(e) => {
                e.stopPropagation();
                const a = document.createElement("a");
                a.href = movie.fileUrl!;
                a.download = movie.title;
                a.click();
              }}
            >
              <Download className="h-4 w-4" />
            </Button>
          )}
          {movie.fileUrl && (
            <Button
              size="icon"
              variant="ghost"
              className={`h-9 w-9 sm:h-8 sm:w-8 hidden sm:flex ${canYouTubeExport ? "text-red-400 hover:text-red-300" : "text-muted-foreground/40"}`}
              onClick={(e) => openYouTubeExport(movie, e)}
              title={canYouTubeExport ? "Export to Virelle Studios YouTube" : "Upgrade to export to YouTube"}
            >
              <Youtube className="h-4 w-4" />
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            className="h-9 w-9 sm:h-8 sm:w-8 text-destructive hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              if (confirm("Delete this movie?")) {
                deleteMutation.mutate({ id: movie.id });
              }
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          {activeFolder ? (
            <div>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 -ml-2 mb-1 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setActiveFolder(null);
                  setSearchQuery("");
                }}
              >
                <ChevronLeft className="h-4 w-4" />
                Back to My Movies
              </Button>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <FolderOpen className="h-6 w-6 text-primary" />
                {activeFolder}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {folderContents.length} item
                {folderContents.length !== 1 ? "s" : ""} —{" "}
                {folderContents.filter((m) => m.type === "scene").length} scenes
                {folderContents.filter((m) => m.type === "trailer").length > 0 &&
                  `, ${folderContents.filter((m) => m.type === "trailer").length} trailer${folderContents.filter((m) => m.type === "trailer").length !== 1 ? "s" : ""}`}
                {folderContents.filter((m) => m.type === "film").length > 0 &&
                  `, ${folderContents.filter((m) => m.type === "film").length} film${folderContents.filter((m) => m.type === "film").length !== 1 ? "s" : ""}`}
              </p>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <Clapperboard className="h-6 w-6 text-primary" />
                My Movies
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Your generated films, scenes, and trailers
              </p>
            </>
          )}
        </div>
        <Button
          onClick={() => setLocation("/projects")}
          className="gap-2"
        >
          <Sparkles className="h-4 w-4" />
          Create New Film
        </Button>
      </div>

      {/* Search & View Toggle */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={
              activeFolder
                ? `Search in ${activeFolder}...`
                : "Search movies and folders..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex border rounded-md">
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="icon"
            className="rounded-r-none"
            onClick={() => setViewMode("grid")}
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="icon"
            className="rounded-l-none"
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats (only on main view) */}
      {!activeFolder && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className={`cursor-pointer transition-all hover:ring-1 hover:ring-primary/30 ${typeFilter === null ? 'ring-1 ring-primary/20' : ''}`} onClick={() => setTypeFilter(null)}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Folder className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{folderNames.length}</p>
                <p className="text-xs text-muted-foreground">Movie Folders</p>
              </div>
            </CardContent>
          </Card>
          <Card className={`cursor-pointer transition-all hover:ring-1 hover:ring-emerald-500/30 ${typeFilter === 'film' ? 'ring-1 ring-emerald-500/40' : ''}`} onClick={() => setTypeFilter(typeFilter === 'film' ? null : 'film')}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Clapperboard className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {allMovies.filter((m) => m.type === "film").length}
                </p>
                <p className="text-xs text-muted-foreground">Films</p>
              </div>
            </CardContent>
          </Card>
          <Card className={`cursor-pointer transition-all hover:ring-1 hover:ring-blue-500/30 ${typeFilter === 'scene' ? 'ring-1 ring-blue-500/40' : ''}`} onClick={() => setTypeFilter(typeFilter === 'scene' ? null : 'scene')}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Film className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {allMovies.filter((m) => m.type === "scene").length}
                </p>
                <p className="text-xs text-muted-foreground">Scenes</p>
              </div>
            </CardContent>
          </Card>
          <Card className={`cursor-pointer transition-all hover:ring-1 hover:ring-amber-500/30 ${typeFilter === 'trailer' ? 'ring-1 ring-amber-500/40' : ''}`} onClick={() => setTypeFilter(typeFilter === 'trailer' ? null : 'trailer')}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Play className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {allMovies.filter((m) => m.type === "trailer").length}
                </p>
                <p className="text-xs text-muted-foreground">Trailers</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MAIN VIEW: Folders + Top-Level Films */}
      {!activeFolder && (
        <>
          {filteredFolderNames.length === 0 && filteredTopLevel.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Clapperboard className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">No movies yet</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                {searchQuery
                  ? "No movies match your search. Try a different query."
                  : "Create a project and generate your first film to see it here."}
              </p>
              {!searchQuery && (
                <Button
                  onClick={() => setLocation("/projects")}
                  className="mt-4 gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  Create Your First Film
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Movie Folders */}
              {filteredFolderNames.length > 0 && (
                <div>
                  <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
                    Movie Folders
                  </h2>
                  {viewMode === "grid" ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                      {filteredFolderNames.map((folderName) => {
                        const items = folders[folderName];
                        const sceneCount = items.filter(
                          (m) => m.type === "scene"
                        ).length;
                        const trailerCount = items.filter(
                          (m) => m.type === "trailer"
                        ).length;
                        const filmCount = items.filter(
                          (m) => m.type === "film"
                        ).length;
                        const thumb = items.find((m) => m.thumbnailUrl);
                        return (
                          <Card
                            key={folderName}
                            className="overflow-hidden cursor-pointer group hover:ring-1 hover:ring-primary/30 transition-all"
                            onClick={() => {
                              setActiveFolder(folderName);
                              setSearchQuery("");
                            }}
                          >
                            <div className="relative aspect-video bg-gradient-to-br from-primary/10 to-primary/5">
                              {thumb?.thumbnailUrl ? (
                                <img
                                  src={thumb.thumbnailUrl}
                                  alt={folderName}
                                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Folder className="h-16 w-16 text-primary/30" />
                                </div>
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                              <div className="absolute bottom-3 left-3 right-3">
                                <h3 className="text-white font-semibold text-lg truncate">
                                  {folderName}
                                </h3>
                                <div className="flex items-center gap-2 mt-1">
                                  {sceneCount > 0 && (
                                    <span className="text-white/70 text-xs">
                                      {sceneCount} scene
                                      {sceneCount !== 1 ? "s" : ""}
                                    </span>
                                  )}
                                  {trailerCount > 0 && (
                                    <span className="text-white/70 text-xs">
                                      {trailerCount} trailer
                                      {trailerCount !== 1 ? "s" : ""}
                                    </span>
                                  )}
                                  {filmCount > 0 && (
                                    <span className="text-white/70 text-xs">
                                      {filmCount} film
                                      {filmCount !== 1 ? "s" : ""}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="absolute top-2 right-2">
                                <Badge className="bg-black/50 text-white border-none text-xs">
                                  <FolderOpen className="h-3 w-3 mr-1" />
                                  {items.length}
                                </Badge>
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredFolderNames.map((folderName) => {
                        const items = folders[folderName];
                        const sceneCount = items.filter(
                          (m) => m.type === "scene"
                        ).length;
                        const trailerCount = items.filter(
                          (m) => m.type === "trailer"
                        ).length;
                        const filmCount = items.filter(
                          (m) => m.type === "film"
                        ).length;
                        return (
                          <Card
                            key={folderName}
                            className="cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all"
                            onClick={() => {
                              setActiveFolder(folderName);
                              setSearchQuery("");
                            }}
                          >
                            <CardContent className="p-3 flex items-center gap-4">
                              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                <Folder className="h-6 w-6 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-medium truncate">
                                  {folderName}
                                </h3>
                                <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                                  {sceneCount > 0 && (
                                    <span>
                                      {sceneCount} scene
                                      {sceneCount !== 1 ? "s" : ""}
                                    </span>
                                  )}
                                  {trailerCount > 0 && (
                                    <span>
                                      {trailerCount} trailer
                                      {trailerCount !== 1 ? "s" : ""}
                                    </span>
                                  )}
                                  {filmCount > 0 && (
                                    <span>
                                      {filmCount} film
                                      {filmCount !== 1 ? "s" : ""}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <FileVideo className="h-4 w-4 text-muted-foreground" />
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Top-Level Films (no folder) */}
              {filteredTopLevel.length > 0 && (
                <div>
                  <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
                    {folderNames.length > 0 ? "Standalone" : "All Movies"}
                  </h2>
                  {viewMode === "grid" ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                      {filteredTopLevel.map(renderMovieCard)}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredTopLevel.map(renderMovieRow)}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* FOLDER VIEW: Contents of a movie folder */}
      {activeFolder && (
        <>
          {filteredFolderContents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FolderOpen className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">Folder is empty</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                {searchQuery
                  ? "No items match your search."
                  : "Generate scenes from your project to populate this folder."}
              </p>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {filteredFolderContents.map(renderMovieCard)}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredFolderContents.map(renderMovieRow)}
            </div>
          )}
        </>
      )}

      {/* Studio Opener - plays before films */}
      {showOpenerBefore && (
        <StudioOpener
          onComplete={() => {
            const movieId = showOpenerBefore;
            setShowOpenerBefore(null);
            setShowPlayer(movieId);
          }}
          mode="film"
          skippable
        />
      )}

      {/* Full-Featured Media Player */}
      {showPlayer && playerMovie && (
        <MediaPlayer
          movie={playerMovie}
          playlist={activeFolder ? folderContents : allMovies}
          onClose={() => setShowPlayer(null)}
          onNavigate={(movieId) => setShowPlayer(movieId)}
        />
      )}

      {/* YouTube Export Modal */}
      <YouTubeExportModal
        movie={ytExportMovie}
        open={!!ytExportMovie}
        onClose={() => setYtExportMovie(null)}
      />
    </div>
  );
}
