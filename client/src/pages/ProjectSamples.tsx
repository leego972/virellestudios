import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Play, Upload, Trash2, Edit2, Film, Eye, EyeOff,
  Loader2, ChevronUp, ChevronDown, X, Clapperboard
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────
interface ProjectSample {
  id: number;
  title: string;
  description: string | null;
  genre: string | null;
  provider: string | null;
  videoUrl: string;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  displayOrder: number;
  isPublished: boolean;
  uploadedBy: number;
  createdAt: string | Date;
  updatedAt: string | Date;
}

const GENRES = [
  "Action", "Thriller", "Drama", "Romance", "Comedy", "Horror",
  "Sci-Fi", "Fantasy", "Documentary", "Mystery", "Crime", "Adventure",
];

const PROVIDERS = [
  "Runway Gen-4", "Runway Gen-3", "OpenAI Sora", "fal.ai HunyuanVideo",
  "Replicate Wan2.1", "Luma Dream Machine", "SeedDance 1.5 Pro", "Pollinations",
];

// ─── Video Player Modal ───────────────────────────────────────────────────────
function VideoPlayerModal({
  sample,
  onClose,
}: {
  sample: ProjectSample;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-white/70 hover:text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Video */}
        <div className="rounded-xl overflow-hidden shadow-2xl bg-black">
          <video
            src={sample.videoUrl}
            controls
            autoPlay
            className="w-full max-h-[75vh] object-contain"
            poster={sample.thumbnailUrl || undefined}
          />
        </div>

        {/* Info bar */}
        <div className="mt-3 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-white font-semibold text-lg">{sample.title}</h2>
            {sample.description && (
              <p className="text-white/60 text-sm mt-1 line-clamp-2">{sample.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0 mt-1">
            {sample.genre && (
              <Badge className="bg-amber-600/80 text-white border-0 text-xs">{sample.genre}</Badge>
            )}
            {sample.provider && (
              <Badge variant="outline" className="text-white/70 border-white/20 text-xs">{sample.provider}</Badge>
            )}
            {sample.durationSeconds && (
              <span className="text-white/50 text-xs">
                {Math.floor(sample.durationSeconds / 60)}:{String(sample.durationSeconds % 60).padStart(2, "0")}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sample Card ─────────────────────────────────────────────────────────────
function SampleCard({
  sample,
  isAdmin,
  onPlay,
  onDelete,
  onTogglePublish,
  onMoveUp,
  onMoveDown,
}: {
  sample: ProjectSample;
  isAdmin: boolean;
  onPlay: () => void;
  onDelete: () => void;
  onTogglePublish: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  return (
    <div className={`group relative rounded-xl overflow-hidden bg-card border border-border shadow-md transition-all duration-300 hover:shadow-xl hover:border-amber-500/40 ${!sample.isPublished ? "opacity-60" : ""}`}>
      {/* Thumbnail / Preview */}
      <div
        className="relative aspect-video bg-black cursor-pointer overflow-hidden"
        onClick={onPlay}
      >
        {sample.thumbnailUrl ? (
          <img
            src={sample.thumbnailUrl}
            alt={sample.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
            <Clapperboard className="w-12 h-12 text-amber-500/40" />
          </div>
        )}

        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-all duration-300">
          <div className="w-14 h-14 rounded-full bg-amber-500/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 scale-75 group-hover:scale-100 shadow-lg">
            <Play className="w-6 h-6 text-black ml-1" fill="black" />
          </div>
        </div>

        {/* Duration badge */}
        {sample.durationSeconds && (
          <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded font-mono">
            {Math.floor(sample.durationSeconds / 60)}:{String(sample.durationSeconds % 60).padStart(2, "0")}
          </div>
        )}

        {/* Unpublished badge */}
        {!sample.isPublished && (
          <div className="absolute top-2 left-2 bg-gray-800/90 text-gray-300 text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
            <EyeOff className="w-3 h-3" /> Draft
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-semibold text-foreground line-clamp-1 mb-1">{sample.title}</h3>
        {sample.description && (
          <p className="text-muted-foreground text-sm line-clamp-2 mb-3">{sample.description}</p>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          {sample.genre && (
            <Badge className="bg-amber-600/20 text-amber-700 dark:text-amber-400 border-amber-500/30 text-xs">{sample.genre}</Badge>
          )}
          {sample.provider && (
            <Badge variant="outline" className="text-muted-foreground text-xs">{sample.provider}</Badge>
          )}
        </div>
      </div>

      {/* Admin controls */}
      {isAdmin && (
        <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onTogglePublish(); }}
            className="w-7 h-7 rounded bg-black/70 flex items-center justify-center text-white hover:bg-black/90 transition-colors"
            title={sample.isPublished ? "Unpublish" : "Publish"}
          >
            {sample.isPublished ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
            className="w-7 h-7 rounded bg-black/70 flex items-center justify-center text-white hover:bg-black/90 transition-colors"
            title="Move up"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
            className="w-7 h-7 rounded bg-black/70 flex items-center justify-center text-white hover:bg-black/90 transition-colors"
            title="Move down"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="w-7 h-7 rounded bg-red-900/80 flex items-center justify-center text-red-300 hover:bg-red-800 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Upload Form ──────────────────────────────────────────────────────────────
function UploadForm({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [thumbPreview, setThumbPreview] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    genre: "",
    provider: "",
    durationSeconds: "",
    displayOrder: "0",
    isPublished: true,
  });
  const videoInputRef = useRef<HTMLInputElement>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);

  const createMutation = trpc.projectSamples.create.useMutation({
    onSuccess: () => {
      toast.success("Sample uploaded successfully!");
      setOpen(false);
      setVideoFile(null);
      setThumbFile(null);
      setThumbPreview(null);
      setForm({ title: "", description: "", genre: "", provider: "", durationSeconds: "", displayOrder: "0", isPublished: true });
      onSuccess();
    },
    onError: (err) => {
      toast.error(`Upload failed: ${err.message}`);
      setUploading(false);
    },
  });

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleSubmit = async () => {
    if (!videoFile) { toast.error("Please select a video file"); return; }
    if (!form.title.trim()) { toast.error("Please enter a title"); return; }
    setUploading(true);
    try {
      const videoBase64 = await fileToBase64(videoFile);
      let thumbnailBase64: string | undefined;
      let thumbnailFilename: string | undefined;
      let thumbnailContentType: string | undefined;
      if (thumbFile) {
        thumbnailBase64 = await fileToBase64(thumbFile);
        thumbnailFilename = thumbFile.name;
        thumbnailContentType = thumbFile.type;
      }
      await createMutation.mutateAsync({
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        genre: form.genre || undefined,
        provider: form.provider || undefined,
        durationSeconds: form.durationSeconds ? parseInt(form.durationSeconds) : undefined,
        displayOrder: parseInt(form.displayOrder) || 0,
        isPublished: form.isPublished,
        videoBase64,
        videoFilename: videoFile.name,
        videoContentType: videoFile.type || "video/mp4",
        thumbnailBase64,
        thumbnailFilename,
        thumbnailContentType,
      });
    } catch {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-amber-600 hover:bg-amber-700 text-white gap-2">
          <Upload className="w-4 h-4" />
          Upload Sample
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Film className="w-5 h-5 text-amber-500" />
            Upload Project Sample
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Title */}
          <div>
            <Label>Title *</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. The Last Extraction — Action Scene"
              className="mt-1"
            />
          </div>

          {/* Description */}
          <div>
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Brief description of the scene..."
              rows={3}
              className="mt-1"
            />
          </div>

          {/* Genre + Provider */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Genre</Label>
              <Select value={form.genre} onValueChange={(v) => setForm(f => ({ ...f, genre: v }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select genre" />
                </SelectTrigger>
                <SelectContent>
                  {GENRES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>AI Provider</Label>
              <Select value={form.provider} onValueChange={(v) => setForm(f => ({ ...f, provider: v }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDERS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Duration + Order */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Duration (seconds)</Label>
              <Input
                type="number"
                value={form.durationSeconds}
                onChange={(e) => setForm(f => ({ ...f, durationSeconds: e.target.value }))}
                placeholder="e.g. 30"
                min={1}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Display Order</Label>
              <Input
                type="number"
                value={form.displayOrder}
                onChange={(e) => setForm(f => ({ ...f, displayOrder: e.target.value }))}
                placeholder="0"
                min={0}
                className="mt-1"
              />
            </div>
          </div>

          {/* Published toggle */}
          <div className="flex items-center gap-3">
            <Switch
              checked={form.isPublished}
              onCheckedChange={(v) => setForm(f => ({ ...f, isPublished: v }))}
            />
            <Label className="cursor-pointer">Publish immediately</Label>
          </div>

          {/* Video file */}
          <div>
            <Label>Video File * (MP4, MOV, WebM — max 350MB)</Label>
            <div
              className="mt-1 border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-amber-500/50 transition-colors"
              onClick={() => videoInputRef.current?.click()}
            >
              {videoFile ? (
                <div className="flex items-center justify-center gap-2 text-sm text-foreground">
                  <Film className="w-4 h-4 text-amber-500" />
                  {videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(1)} MB)
                </div>
              ) : (
                <div className="text-muted-foreground text-sm">
                  <Upload className="w-6 h-6 mx-auto mb-1 opacity-50" />
                  Click to select video
                </div>
              )}
            </div>
            <input
              ref={videoInputRef}
              type="file"
              accept="video/mp4,video/mov,video/quicktime,video/webm,video/x-msvideo"
              className="hidden"
              onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
            />
          </div>

          {/* Thumbnail file */}
          <div>
            <Label>Thumbnail Image (optional — JPG, PNG, WebP)</Label>
            <div
              className="mt-1 border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-amber-500/50 transition-colors"
              onClick={() => thumbInputRef.current?.click()}
            >
              {thumbPreview ? (
                <img src={thumbPreview} alt="Thumbnail preview" className="h-24 mx-auto rounded object-cover" />
              ) : (
                <div className="text-muted-foreground text-sm">
                  <Upload className="w-6 h-6 mx-auto mb-1 opacity-50" />
                  Click to select thumbnail
                </div>
              )}
            </div>
            <input
              ref={thumbInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0] || null;
                setThumbFile(f);
                if (f) {
                  const reader = new FileReader();
                  reader.onload = (ev) => setThumbPreview(ev.target?.result as string);
                  reader.readAsDataURL(f);
                } else {
                  setThumbPreview(null);
                }
              }}
            />
          </div>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={uploading || !videoFile || !form.title.trim()}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white"
          >
            {uploading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...</>
            ) : (
              <><Upload className="w-4 h-4 mr-2" /> Upload Sample</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ProjectSamples() {
  const [playingSample, setPlayingSample] = useState<ProjectSample | null>(null);

  // Auth
  const { data: me } = trpc.auth.me.useQuery();
  const isAdmin = me?.role === "admin";

  // Fetch samples
  const { data: samples = [], isLoading, refetch } = isAdmin
    ? trpc.projectSamples.listAll.useQuery()
    : trpc.projectSamples.list.useQuery();

  const deleteMutation = trpc.projectSamples.delete.useMutation({
    onSuccess: () => { toast.success("Sample deleted"); refetch(); },
    onError: (err) => toast.error(`Delete failed: ${err.message}`),
  });

  const updateMutation = trpc.projectSamples.update.useMutation({
    onSuccess: () => refetch(),
    onError: (err) => toast.error(`Update failed: ${err.message}`),
  });

  const handleDelete = (id: number) => {
    if (!confirm("Delete this sample? This cannot be undone.")) return;
    deleteMutation.mutate({ id });
  };

  const handleTogglePublish = (sample: ProjectSample) => {
    updateMutation.mutate({ id: sample.id, isPublished: !sample.isPublished });
  };

  const handleMoveUp = (sample: ProjectSample, index: number) => {
    if (index === 0) return;
    const prev = samples[index - 1];
    updateMutation.mutate({ id: sample.id, displayOrder: prev.displayOrder - 1 });
  };

  const handleMoveDown = (sample: ProjectSample, index: number) => {
    if (index === samples.length - 1) return;
    const next = samples[index + 1];
    updateMutation.mutate({ id: sample.id, displayOrder: next.displayOrder + 1 });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Video Player Modal */}
      {playingSample && (
        <VideoPlayerModal
          sample={playingSample}
          onClose={() => setPlayingSample(null)}
        />
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-amber-600/20 flex items-center justify-center">
                <Film className="w-5 h-5 text-amber-500" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Project Samples</h1>
            </div>
            <p className="text-muted-foreground">
              {isAdmin
                ? "Showcase your best AI-generated scenes. Upload videos to demonstrate Virelle Studios' output quality."
                : "Explore AI-generated film scenes created with Virelle Studios. Click any scene to watch it in full."}
            </p>
          </div>
          {isAdmin && (
            <UploadForm onSuccess={refetch} />
          )}
        </div>

        {/* Stats bar (admin only) */}
        {isAdmin && samples.length > 0 && (
          <div className="flex items-center gap-6 mb-6 p-4 rounded-xl bg-card border border-border">
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">{samples.length}</div>
              <div className="text-xs text-muted-foreground">Total Samples</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-500">{samples.filter(s => s.isPublished).length}</div>
              <div className="text-xs text-muted-foreground">Published</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-400">{samples.filter(s => !s.isPublished).length}</div>
              <div className="text-xs text-muted-foreground">Drafts</div>
            </div>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && samples.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-2xl bg-amber-600/10 flex items-center justify-center mb-4">
              <Clapperboard className="w-10 h-10 text-amber-500/50" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No samples yet</h3>
            <p className="text-muted-foreground max-w-sm">
              {isAdmin
                ? "Upload your first AI-generated scene to showcase Virelle Studios' output quality to users."
                : "The admin hasn't uploaded any sample scenes yet. Check back soon!"}
            </p>
            {isAdmin && (
              <div className="mt-6">
                <UploadForm onSuccess={refetch} />
              </div>
            )}
          </div>
        )}

        {/* Grid */}
        {!isLoading && samples.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {samples.map((sample, index) => (
              <SampleCard
                key={sample.id}
                sample={sample as ProjectSample}
                isAdmin={isAdmin}
                onPlay={() => setPlayingSample(sample as ProjectSample)}
                onDelete={() => handleDelete(sample.id)}
                onTogglePublish={() => handleTogglePublish(sample as ProjectSample)}
                onMoveUp={() => handleMoveUp(sample as ProjectSample, index)}
                onMoveDown={() => handleMoveDown(sample as ProjectSample, index)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
