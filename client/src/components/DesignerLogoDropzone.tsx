import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { ImagePlus, Loader2, Trash2, UploadCloud } from "lucide-react";
import { DragEvent, useRef, useState } from "react";
import { toast } from "sonner";

type DesignerLogoDropzoneProps = {
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
};

const MAX_LOGO_BYTES = 4 * 1024 * 1024;

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function DesignerLogoDropzone({
  value,
  onChange,
  disabled = false,
}: DesignerLogoDropzoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const uploadLogo = trpc.wardrobeMarket.designerLogo.upload.useMutation({
    onSuccess: result => {
      onChange(result.url);
      toast.success("Designer logo uploaded");
    },
    onError: error => toast.error(error.message),
  });

  const upload = async (file: File | undefined) => {
    if (!file || disabled || uploadLogo.isPending) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Use a JPG, PNG or WebP logo.");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      toast.error("Designer logo must be under 4 MB.");
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      await uploadLogo.mutateAsync({ dataUrl, fileName: file.name });
    } catch (error: any) {
      if (!uploadLogo.error) {
        toast.error(error?.message || "Could not upload Designer logo.");
      }
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    void upload(event.dataTransfer.files?.[0]);
  };

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && fileInputRef.current?.click()}
        onKeyDown={event => {
          if (!disabled && (event.key === "Enter" || event.key === " ")) {
            event.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        onDragOver={event => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`flex min-h-40 items-center gap-4 rounded-xl border-2 border-dashed p-4 transition-colors ${
          disabled
            ? "cursor-not-allowed opacity-60"
            : "cursor-pointer hover:border-amber-500/50 hover:bg-accent/30"
        } ${dragging ? "border-amber-400 bg-amber-500/10" : "border-border"}`}
      >
        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted/40">
          {value ? (
            <img
              src={value}
              alt="Designer logo preview"
              className="h-full w-full object-contain"
            />
          ) : uploadLogo.isPending ? (
            <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
          ) : (
            <ImagePlus className="h-8 w-8 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {uploadLogo.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
            ) : (
              <UploadCloud className="h-4 w-4 text-amber-400" />
            )}
            <p className="font-semibold">
              {value ? "Replace Designer logo" : "Upload Designer logo"}
            </p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Drag and drop or tap to select a JPG, PNG or WebP file. Maximum 4 MB.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            A square transparent PNG is recommended for marketplace display.
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          disabled={disabled}
          onChange={event => {
            void upload(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
      </div>

      {value && (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled || uploadLogo.isPending}
            onClick={() => onChange("")}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Remove logo
          </Button>
        </div>
      )}
    </div>
  );
}
