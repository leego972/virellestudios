import { useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { ImagePlus, X, Loader2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface ProjectReferenceImageDropProps {
  /** When set, uploads persist immediately to the project. */
  projectId?: number;
  /** Pre-create mode: parent owns the queued URLs (data URLs). */
  pendingImages?: string[];
  onPendingChange?: (images: string[]) => void;
  /** When persisted (projectId set), parent gets the live array after each change. */
  onPersistedChange?: (images: string[]) => void;
  /** Initial persisted images for the project. */
  initialImages?: string[];
  className?: string;
}

const MAX_FILES = 5;
const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED = "image/png,image/jpeg,image/webp,image/*";

/**
 * v6.62 — Project-level reference image dropper.
 *
 * Shown on the New Project form and the project sidebar so directors can
 * attach a logo, mood board, or concept-art frame ONCE and have it propagate
 * to every scene in the project as a style anchor (precedence: scene refs →
 * project refs → character photos).
 *
 * Two modes:
 *  - Persisted (projectId set): uploads go straight to S3 + project.referenceImages
 *  - Pending (no projectId yet): emits data URLs upward; parent flushes after create
 */
export default function ProjectReferenceImageDrop({
  projectId,
  pendingImages,
  onPendingChange,
  onPersistedChange,
  initialImages,
  className = "",
}: ProjectReferenceImageDropProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [persisted, setPersisted] = useState<string[]>(initialImages || []);
  const [busy, setBusy] = useState(false);

  const uploadMut = trpc.upload.projectReferenceImage.useMutation();
  const removeMut = trpc.upload.removeProjectReferenceImage.useMutation();

  const isPending = !projectId;
  const images = isPending ? (pendingImages || []) : persisted;

  const handleFile = async (file: File) => {
    if (file.size > MAX_BYTES) {
      toast.error("File too large. Max 10MB.");
      return;
    }
    if (images.length >= MAX_FILES) {
      toast.error(`Up to ${MAX_FILES} reference images per project`);
      return;
    }
    setBusy(true);
    try {
      const dataUrl: string = await new Promise((res, rej) => {
        const fr = new FileReader();
        fr.onload = () => res(fr.result as string);
        fr.onerror = rej;
        fr.readAsDataURL(file);
      });

      if (isPending) {
        // Pending mode — store data URL locally; parent flushes after create.
        const next = [...images, dataUrl];
        onPendingChange?.(next);
      } else {
        const base64 = dataUrl.split(",")[1] || "";
        const result = await uploadMut.mutateAsync({
          base64,
          filename: file.name,
          contentType: file.type || "image/png",
          projectId: projectId!,
        });
        setPersisted(result.referenceImages);
        onPersistedChange?.(result.referenceImages);
      }
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleRemove = async (url: string, idx: number) => {
    if (isPending) {
      const next = images.filter((_, i) => i !== idx);
      onPendingChange?.(next);
      return;
    }
    try {
      const result = await removeMut.mutateAsync({ projectId: projectId!, imageUrl: url });
      setPersisted(result.referenceImages);
      onPersistedChange?.(result.referenceImages);
    } catch (e: any) {
      toast.error(e?.message || "Remove failed");
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-amber-400" />
          <span className="text-sm font-medium">Style anchors</span>
          <span className="text-[11px] text-muted-foreground">
            {images.length}/{MAX_FILES} · applies to all scenes
          </span>
        </div>
      </div>

      {/* Thumbnails */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {images.map((url, idx) => (
            <div
              key={`${url.slice(0, 40)}-${idx}`}
              className="relative aspect-square rounded-md overflow-hidden border border-border/50 bg-black/30 group"
            >
              <img src={url} alt={`Reference ${idx + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => handleRemove(url, idx)}
                className="absolute top-1 right-1 p-1 rounded-full bg-black/70 text-white/80 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Remove reference image"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Drop zone */}
      {images.length < MAX_FILES && (
        <label
          htmlFor="proj-ref-image-input"
          className={`flex items-center justify-center gap-2 px-4 py-3 rounded-md border border-dashed border-border/60 hover:border-amber-500/60 bg-black/20 cursor-pointer transition-colors text-xs text-muted-foreground hover:text-foreground ${busy ? "opacity-60 pointer-events-none" : ""}`}
        >
          {busy ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Uploading…</>
          ) : (
            <><ImagePlus className="h-4 w-4" /> Add a logo, mood board, or concept frame</>
          )}
          <input
            id="proj-ref-image-input"
            ref={inputRef}
            type="file"
            accept={ACCEPTED}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
            }}
          />
        </label>
      )}

      {images.length > 0 && (
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Used as visual anchors when generating scenes that have no
          reference images of their own. Override per-scene in the editor.
        </p>
      )}
    </div>
  );
}
