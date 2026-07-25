import { useMemo, useState } from "react";
import { HollywoodIcon } from "@/components/HollywoodIcon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type CaptureMode = "photos" | "video";
type UploadStage = "idle" | "uploading" | "creating" | "queuing" | "complete";

interface DesignerGarmentUploadFormProps {
  collections: Array<{ id: number; name: string }>;
  onComplete: () => void;
}

function money(cents: number): string {
  return `A$${(cents / 100).toFixed(2)}`;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const allowed = /^(image\/(png|jpeg|webp)|video\/(mp4|quicktime|webm))$/;
    if (!allowed.test(file.type)) {
      reject(new Error("Use PNG, JPEG, WebP, MP4, MOV or WebM files."));
      return;
    }
    const limit = file.type.startsWith("image/") ? 8 * 1024 * 1024 : 18 * 1024 * 1024;
    if (file.size > limit) {
      reject(new Error(file.type.startsWith("image/")
        ? "Each photo must be smaller than 8 MB."
        : "The video must be smaller than 18 MB. Record at 720p or trim it to 8–20 seconds."));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("The selected file could not be read."));
    reader.readAsDataURL(file);
  });
}

function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const duration = Number(video.duration || 0);
      URL.revokeObjectURL(url);
      resolve(duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("The video could not be opened."));
    };
    video.src = url;
  });
}

function csv(value: string): string[] {
  return value.split(",").map((entry) => entry.trim()).filter(Boolean);
}

function stageText(stage: UploadStage): string {
  if (stage === "uploading") return "Uploading garment references…";
  if (stage === "creating") return "Creating the private listing…";
  if (stage === "queuing") return "Queuing the hidden generation pack…";
  if (stage === "complete") return "Upload complete";
  return "Upload garment";
}

function CaptureOption({
  active,
  title,
  description,
  tool,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  tool: "asset_marketplace" | "video_generation";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border p-4 text-left transition-all ${
        active
          ? "border-amber-400/70 bg-amber-500/10 shadow-lg shadow-amber-500/10"
          : "border-amber-500/20 bg-black/30 hover:border-amber-500/45"
      }`}
    >
      <div className="flex items-center gap-3">
        <HollywoodIcon tool={tool} size={42} className="rounded-xl" />
        <div>
          <p className="font-serif text-base font-black gradient-text-gold">{title}</p>
          <p className="mt-1 text-xs leading-relaxed text-white/50">{description}</p>
        </div>
      </div>
    </button>
  );
}

export default function DesignerGarmentUploadForm({ collections, onComplete }: DesignerGarmentUploadFormProps) {
  const utils = trpc.useUtils();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("fashion");
  const [retailDollars, setRetailDollars] = useState("");
  const [virtualOnly, setVirtualOnly] = useState(false);
  const [requestedPublish, setRequestedPublish] = useState(true);
  const [collectionId, setCollectionId] = useState("");
  const [colours, setColours] = useState("");
  const [materials, setMaterials] = useState("");
  const [captureMode, setCaptureMode] = useState<CaptureMode>("photos");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [angleFiles, setAngleFiles] = useState<File[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [stage, setStage] = useState<UploadStage>("idle");

  const physicalCents = Math.max(0, Math.round(Number(retailDollars || 0) * 100));
  const virtualCents = physicalCents > 0 ? Math.round(physicalCents * 0.03) : 0;
  const coverPreview = useMemo(() => coverFile ? URL.createObjectURL(coverFile) : "", [coverFile]);
  const busy = stage !== "idle" && stage !== "complete";

  const createItem = trpc.wardrobeMarket.commerce.designer.createItem.useMutation();
  const uploadCapture = trpc.wardrobeMarket.commerce.garmentIngestion.uploadCapture.useMutation();
  const queueCapture = trpc.wardrobeMarket.commerce.garmentIngestion.queue.useMutation();

  const reset = () => {
    setName("");
    setDescription("");
    setCategory("fashion");
    setRetailDollars("");
    setVirtualOnly(false);
    setRequestedPublish(true);
    setCollectionId("");
    setColours("");
    setMaterials("");
    setCaptureMode("photos");
    setCoverFile(null);
    setAngleFiles([]);
    setVideoFile(null);
    setStage("idle");
  };

  const submit = async () => {
    if (!name.trim() || description.trim().length < 10 || physicalCents < 1667 || !coverFile) {
      toast.error("Add the item name, description, front photo and a retail price of at least A$16.67.");
      return;
    }
    if (captureMode === "photos" && angleFiles.length < 2) {
      toast.error("Add at least two more views: back and side or three-quarter.");
      return;
    }
    if (captureMode === "video" && !videoFile) {
      toast.error("Add the short 360° mannequin video.");
      return;
    }

    try {
      setStage("uploading");
      const coverDataUrl = await fileToDataUrl(coverFile);
      const cover = await uploadCapture.mutateAsync({ role: "cover", dataUrl: coverDataUrl });
      const angleUrls: string[] = [];
      let videoUrl: string | undefined;

      if (captureMode === "photos") {
        for (const file of angleFiles.slice(0, 5)) {
          const dataUrl = await fileToDataUrl(file);
          const uploaded = await uploadCapture.mutateAsync({ role: "angle", dataUrl });
          angleUrls.push(uploaded.url);
        }
      } else if (videoFile) {
        const duration = await getVideoDuration(videoFile);
        if (duration < 8 || duration > 20) {
          throw new Error("Keep the 360° video between 8 and 20 seconds.");
        }
        const dataUrl = await fileToDataUrl(videoFile);
        const uploaded = await uploadCapture.mutateAsync({ role: "video", dataUrl });
        videoUrl = uploaded.url;
      }

      setStage("creating");
      const item = await createItem.mutateAsync({
        name: name.trim(),
        description: description.trim(),
        category,
        wardrobeType: category,
        primaryImageUrl: cover.url,
        retailPriceAudCents: physicalCents,
        virtualOnly,
        collectionId: collectionId ? Number(collectionId) : undefined,
        publish: false,
      });

      setStage("queuing");
      await queueCapture.mutateAsync({
        wardrobeItemId: item.id,
        captureMode,
        coverImageUrl: cover.url,
        angleImageUrls: angleUrls,
        videoUrl,
        colours: csv(colours),
        materials: csv(materials),
        requestedPublish,
      });

      await Promise.all([
        utils.wardrobeMarket.commerce.designer.listItems.invalidate(),
        utils.wardrobeMarket.commerce.garmentIngestion.listMine.invalidate(),
      ]);
      setStage("complete");
      toast.success("Item uploaded. It is private while Virelle builds and checks the hidden generation pack.");
      onComplete();
      window.setTimeout(reset, 800);
    } catch (error) {
      setStage("idle");
      toast.error(error instanceof Error ? error.message : "The garment could not be uploaded.");
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <section className="rounded-3xl border border-amber-500/25 bg-gradient-to-br from-amber-500/[0.08] via-black/50 to-black/80 p-5 sm:p-6 shadow-2xl shadow-black/30">
        <div className="flex items-start gap-4">
          <HollywoodIcon tool="continuity_checker" size={52} className="rounded-2xl" />
          <div>
            <h3 className="font-serif text-xl font-black gradient-text-gold">One simple upload. Full video-ready garment pack.</h3>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/55">
              Customers see one clean shop image. Virelle privately builds the 3D model, verified angles, material data and continuity references used by the AI video pipeline.
            </p>
            <p className="mt-2 text-xs font-semibold text-emerald-300">No paid AI API is called during this upload.</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <CaptureOption
          active={captureMode === "photos"}
          title="3–6 quick photos"
          description="Front, back and one side or three-quarter view. Phone photos are sufficient."
          tool="asset_marketplace"
          onClick={() => { setCaptureMode("photos"); setVideoFile(null); }}
        />
        <CaptureOption
          active={captureMode === "video"}
          title="Front photo + short 360° video"
          description="Record one slow 8–20 second walk around a mannequin wearing the garment."
          tool="video_generation"
          onClick={() => { setCaptureMode("video"); setAngleFiles([]); }}
        />
      </section>

      <section className="rounded-2xl border border-amber-500/20 bg-black/35 p-5">
        <div className="flex items-center gap-3">
          <HollywoodIcon tool="shot_list" size={38} />
          <h3 className="font-serif text-base font-black gradient-text-gold">Keep the capture simple</h3>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            "Use a mannequin or hanger against a plain background.",
            "Keep the entire garment visible in normal, even light.",
            captureMode === "photos" ? "Take front, back and side views." : "Walk around once without zooming.",
          ].map((instruction, index) => (
            <div key={instruction} className="rounded-xl border border-amber-500/15 bg-white/[0.025] p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-400/70">Step {index + 1}</p>
              <p className="mt-2 text-xs leading-relaxed text-white/60">{instruction}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-amber-500/20 bg-black/35 p-5 space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Item name</Label>
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Black leather biker jacket" className="bg-white/5 border-amber-500/20" />
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <select value={category} onChange={(event) => setCategory(event.target.value)} className="h-10 w-full rounded-md border border-amber-500/20 bg-black px-3 text-sm">
              <option value="fashion">Fashion</option>
              <option value="costume">Costume</option>
              <option value="period_costume">Period costume</option>
              <option value="uniform">Uniform</option>
              <option value="fantasy_sci_fi">Fantasy / Sci-Fi</option>
              <option value="shoes">Shoes</option>
              <option value="accessory">Accessory</option>
              <option value="jewellery">Jewellery</option>
              <option value="bag">Bag</option>
              <option value="hat">Hat</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Short description</Label>
          <Textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe the cut, fit, visible details and intended material." className="min-h-24 bg-white/5 border-amber-500/20" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Colours</Label>
            <Input value={colours} onChange={(event) => setColours(event.target.value)} placeholder="black, silver" className="bg-white/5 border-amber-500/20" />
          </div>
          <div className="space-y-1.5">
            <Label>Materials</Label>
            <Input value={materials} onChange={(event) => setMaterials(event.target.value)} placeholder="leather, metal zip" className="bg-white/5 border-amber-500/20" />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Physical retail price (AUD)</Label>
            <Input type="number" min="16.67" step="0.01" value={retailDollars} onChange={(event) => setRetailDollars(event.target.value)} className="bg-white/5 border-amber-500/20" />
          </div>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Automatic virtual price</p>
            <p className="mt-1 font-serif text-2xl font-black text-amber-400">{money(virtualCents)}</p>
            <p className="text-[10px] text-white/35">3% of {money(physicalCents)}</p>
          </div>
        </div>

        {collections.length > 0 && (
          <div className="space-y-1.5">
            <Label>Collection</Label>
            <select value={collectionId} onChange={(event) => setCollectionId(event.target.value)} className="h-10 w-full rounded-md border border-amber-500/20 bg-black px-3 text-sm">
              <option value="">Designer Store (automatic)</option>
              {collections.map((collection) => <option key={collection.id} value={collection.id}>{collection.name}</option>)}
            </select>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-amber-500/20 bg-black/35 p-5 space-y-5">
        <div className="flex items-center gap-3">
          <HollywoodIcon tool="asset_marketplace" size={38} />
          <div>
            <h3 className="font-serif text-base font-black gradient-text-gold">Garment capture</h3>
            <p className="text-xs text-white/45">The front image becomes the only customer-facing shop image.</p>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Clear front photo *</Label>
          <Input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setCoverFile(event.target.files?.[0] ?? null)} className="bg-white/5 border-amber-500/20" />
          {coverPreview && <img src={coverPreview} alt="Front garment preview" className="h-48 w-36 rounded-xl border border-amber-500/25 object-cover" />}
        </div>

        {captureMode === "photos" ? (
          <div className="space-y-2">
            <Label>Back and side views * <span className="font-normal text-white/35">(choose 2–5 photos)</span></Label>
            <Input type="file" multiple accept="image/png,image/jpeg,image/webp" onChange={(event) => setAngleFiles(Array.from(event.target.files ?? []).slice(0, 5))} className="bg-white/5 border-amber-500/20" />
            <p className="text-xs text-white/40">{angleFiles.length} additional view{angleFiles.length === 1 ? "" : "s"} selected.</p>
          </div>
        ) : (
          <div className="space-y-2">
            <Label>8–20 second 360° mannequin video *</Label>
            <Input type="file" accept="video/mp4,video/quicktime,video/webm" onChange={(event) => setVideoFile(event.target.files?.[0] ?? null)} className="bg-white/5 border-amber-500/20" />
            <p className="text-xs text-white/40">720p is enough. Walk around once, keep the full garment in frame and do not zoom.</p>
          </div>
        )}
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="flex items-center justify-between rounded-2xl border border-amber-500/20 bg-black/35 p-4">
          <div>
            <p className="text-sm font-bold">Virtual-only item</p>
            <p className="mt-1 text-xs text-white/40">No physical shipping option.</p>
          </div>
          <Switch checked={virtualOnly} onCheckedChange={setVirtualOnly} />
        </div>
        <div className="flex items-center justify-between rounded-2xl border border-amber-500/20 bg-black/35 p-4">
          <div>
            <p className="text-sm font-bold">Publish after approval</p>
            <p className="mt-1 text-xs text-white/40">The item stays private until quality checks pass.</p>
          </div>
          <Switch checked={requestedPublish} onCheckedChange={setRequestedPublish} />
        </div>
      </section>

      <Button onClick={submit} disabled={busy} className="h-13 w-full bg-amber-500 text-black hover:bg-amber-400 font-black btn-gold">
        {busy ? <span className="mr-3 inline-block h-4 w-4 animate-spin rounded-full border-2 border-black/25 border-t-black" /> : <HollywoodIcon tool="full_film_generator" size={28} className="mr-2" />}
        {stageText(stage)}
      </Button>
    </div>
  );
}
