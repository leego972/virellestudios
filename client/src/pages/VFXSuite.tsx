import { useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  BadgeCheck,
  Camera,
  CheckCircle2,
  Clapperboard,
  Eraser,
  Eye,
  FileCheck2,
  Film,
  Layers,
  Loader2,
  LockKeyhole,
  Maximize2,
  Palette,
  RadioTower,
  ScanFace,
  ShieldCheck,
  Sparkles,
  Upload,
  Wand2,
  X,
  Zap,
} from "lucide-react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { SubscriptionGate } from "@/components/SubscriptionGate";
import { useSubscription } from "@/hooks/useSubscription";

const VFX_LABELS: Record<string, string> = {
  "swappys-digital-double": "Swappys Digital Double",
  "stunt-face-replacement": "Stunt Face Replacement",
  "actor-continuity-match": "Actor Continuity Match",
  "pickup-scene-match": "Pickup / Reshoot Match",
  "ai-stunt-insert": "AI Stunt Insert",
  "performance-polish": "Performance Polish",
  "multi-anchor-character-lock": "Multi-Anchor Character Lock",
  "temporal-consistency-pass": "Temporal Consistency Pass",
  "gender-transform": "Gender / Presentation Transform",
  "age-transform": "Age Transform",
  "childhood-self": "Childhood Self Reconstruction",
  "roto-person-isolation": "AI Rotoscope / Person Isolation",
  "green-screen-keying": "Green Screen / Keying",
  "background-replacement": "Background Replacement",
  "foreground-composite": "Foreground Composite",
  "sky-replacement": "Sky Replacement",
  "set-extension": "Set Extension",
  "crowd-multiplication": "Crowd Multiplication",
  "camera-matchmove-solve": "Camera Matchmove / Plate Solve",
  "object-removal-inpaint": "Object Removal / Inpainting",
  "wire-rig-removal": "Wire / Rig Removal",
  "safety-gear-removal": "Safety Gear Cleanup",
  "reflection-cleanup": "Reflection Cleanup",
  "screen-replacement": "Screen Replacement",
  "neural-matte-edge-refine": "Neural Matte Edge Refinement",
  "muzzle-flash-practical": "Practical Action Flash / Spark",
  "debris-dust-impact": "Debris / Dust Impact",
  "weather-rain-snow": "Rain / Snow / Weather Layer",
  "fire-smoke-atmosphere": "Fire / Smoke Atmosphere",
  "motion-blur-add": "Cinematic Motion Blur",
  "lens-flare-add": "Anamorphic Lens Flare",
  "scene-extension-outpaint": "Scene Extension / Outpainting",
  "upscale-4k": "Upscale to 4K",
  "upscale-8k": "Upscale to 8K",
  "denoising-grain-removal": "Denoising / Grain Repair",
  "face-enhancement": "Face Enhancement / Detail Recovery",
  "beauty-retouch-film": "Film Beauty Retouch",
  "de-age-subtle": "Subtle De-Aging",
  "film-damage-restore": "Film Damage Restoration",
  "deflicker-exposure": "Deflicker / Exposure Repair",
  "color-match": "Colour Match to Source Plate",
  "style-transfer": "Style Transfer",
  "film-grain-add": "Film Grain / Analog Texture",
  "depth-of-field-post": "Post Depth of Field / Rack Focus",
  "vignette-add": "Cinematic Vignette",
  stabilization: "Stabilization / Camera Shake Repair",
  "lens-distortion-repair": "Lens Distortion Repair",
  "chromatic-repair": "Chromatic Aberration Repair",
  "final-qc-pass": "Final QC / Continuity Pass",
  "render-pass-provenance": "Render Pass Provenance",
  "edit-handoff-package": "Editorial Handoff Package",
};

const VFX_ICONS: Record<string, ReactNode> = {
  "swappys-digital-double": <ScanFace className="h-4 w-4" />,
  "stunt-face-replacement": <ShieldCheck className="h-4 w-4" />,
  "actor-continuity-match": <BadgeCheck className="h-4 w-4" />,
  "pickup-scene-match": <Clapperboard className="h-4 w-4" />,
  "ai-stunt-insert": <Sparkles className="h-4 w-4" />,
  "performance-polish": <Wand2 className="h-4 w-4" />,
  "multi-anchor-character-lock": <ScanFace className="h-4 w-4" />,
  "temporal-consistency-pass": <Film className="h-4 w-4" />,
  "gender-transform": <ScanFace className="h-4 w-4" />,
  "age-transform": <Eye className="h-4 w-4" />,
  "childhood-self": <Sparkles className="h-4 w-4" />,
  "scene-extension-outpaint": <Maximize2 className="h-4 w-4" />,
  "object-removal-inpaint": <Eraser className="h-4 w-4" />,
  stabilization: <Layers className="h-4 w-4" />,
  "upscale-4k": <Zap className="h-4 w-4" />,
  "upscale-8k": <Zap className="h-4 w-4" />,
  "denoising-grain-removal": <Wand2 className="h-4 w-4" />,
  "face-enhancement": <Eye className="h-4 w-4" />,
  "style-transfer": <Palette className="h-4 w-4" />,
  "color-match": <Palette className="h-4 w-4" />,
  "motion-blur-add": <Wand2 className="h-4 w-4" />,
  "lens-flare-add": <Zap className="h-4 w-4" />,
  "film-grain-add": <Film className="h-4 w-4" />,
  "depth-of-field-post": <Camera className="h-4 w-4" />,
  "camera-matchmove-solve": <Camera className="h-4 w-4" />,
  "render-pass-provenance": <FileCheck2 className="h-4 w-4" />,
  "edit-handoff-package": <FileCheck2 className="h-4 w-4" />,
  "final-qc-pass": <FileCheck2 className="h-4 w-4" />,
};

const VFX_CATEGORIES: Record<string, string[]> = {
  "Special Effects — Swappys (Standard)": [
    "swappys-digital-double",
    "gender-transform",
    "age-transform",
    "childhood-self",
    "stunt-face-replacement",
    "actor-continuity-match",
    "pickup-scene-match",
    "ai-stunt-insert",
    "performance-polish",
    "multi-anchor-character-lock",
    "temporal-consistency-pass",
  ],
  "Compositing & Plates": [
    "roto-person-isolation",
    "green-screen-keying",
    "background-replacement",
    "foreground-composite",
    "sky-replacement",
    "set-extension",
    "crowd-multiplication",
    "camera-matchmove-solve",
  ],
  "Cleanup & Safety": [
    "object-removal-inpaint",
    "wire-rig-removal",
    "safety-gear-removal",
    "reflection-cleanup",
    "screen-replacement",
    "neural-matte-edge-refine",
  ],
  "Action & Atmosphere": [
    "muzzle-flash-practical",
    "debris-dust-impact",
    "weather-rain-snow",
    "fire-smoke-atmosphere",
    "motion-blur-add",
    "lens-flare-add",
  ],
  "Image Quality & Restoration": [
    "scene-extension-outpaint",
    "upscale-4k",
    "upscale-8k",
    "denoising-grain-removal",
    "face-enhancement",
    "beauty-retouch-film",
    "de-age-subtle",
    "film-damage-restore",
    "deflicker-exposure",
  ],
  "Finishing, QC & Handoff": [
    "color-match",
    "style-transfer",
    "film-grain-add",
    "depth-of-field-post",
    "vignette-add",
    "stabilization",
    "lens-distortion-repair",
    "chromatic-repair",
    "final-qc-pass",
    "render-pass-provenance",
    "edit-handoff-package",
  ],
};

const SWAPPYS_OPS = new Set([
  "swappys-digital-double",
  "gender-transform",
  "age-transform",
  "childhood-self",
  "stunt-face-replacement",
  "actor-continuity-match",
  "pickup-scene-match",
  "ai-stunt-insert",
  "performance-polish",
  "multi-anchor-character-lock",
  "temporal-consistency-pass",
]);

type TransformGoal =
  | "appearance_reference"
  | "boy_to_girl"
  | "girl_to_boy"
  | "younger_self"
  | "older_self"
  | "adult_to_child"
  | "child_to_adult"
  | "custom_prompt";
type Rating = "G" | "PG" | "PG-13" | "R";
type LastJob = {
  creditCost?: number;
  watermarkMode?: string;
  enhancedImageUrl?: string | null;
  swappysJobId?: number | null;
};

function VFXSuiteInner() {
  const [, navigate] = useLocation();
  const params = useParams<{ projectId: string; sceneId: string }>();
  const projectId = Number.parseInt(params.projectId || "0", 10);
  const sceneId = Number.parseInt(params.sceneId || "0", 10);
  const { isCreator, isIndustry } = useSubscription();
  const createStudioVfxJob = (trpc as any).vfxSfx.createStudioVfxJob.useMutation();
  const uploadRefImageMutation = (trpc as any).upload.referenceImage.useMutation();

  const sourceImageRef = useRef<HTMLInputElement>(null);
  const referenceImageRef = useRef<HTMLInputElement>(null);
  const [selectedOps, setSelectedOps] = useState<string[]>([]);
  const [intensity, setIntensity] = useState(75);
  const [directorNotes, setDirectorNotes] = useState("");
  const [rating, setRating] = useState<Rating>("PG-13");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processComplete, setProcessComplete] = useState(false);
  const [sourceImageUrls, setSourceImageUrls] = useState<string[]>([]);
  const [referenceImageUrls, setReferenceImageUrls] = useState<string[]>([]);
  const [sourceVideoUrl, setSourceVideoUrl] = useState("");
  const [referenceVideoUrl, setReferenceVideoUrl] = useState("");
  const [uploading, setUploading] = useState<"source" | "reference" | null>(null);
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [aiGeneratedCharactersOnly, setAiGeneratedCharactersOnly] = useState(false);
  const [hideVisibleWatermark, setHideVisibleWatermark] = useState(false);
  const [exportQuality, setExportQuality] = useState<"preview" | "final" | "master">("preview");
  const [transformGoal, setTransformGoal] = useState<TransformGoal>("appearance_reference");
  const [targetAge, setTargetAge] = useState("");
  const [targetPresentation, setTargetPresentation] = useState("");
  const [lastJob, setLastJob] = useState<LastJob | null>(null);

  const selectedSwappys = selectedOps.some((operation) => SWAPPYS_OPS.has(operation))
    || transformGoal !== "appearance_reference";
  const mediaCount = sourceImageUrls.length
    + referenceImageUrls.length
    + (sourceVideoUrl ? 1 : 0)
    + (referenceVideoUrl ? 1 : 0);
  const estimatedCredits = selectedSwappys
    ? exportQuality === "preview" ? 12 + Math.ceil(mediaCount / 3)
      : exportQuality === "final" ? 24 + Math.ceil(mediaCount / 2)
        : 40 + mediaCount
    : selectedOps.length <= 2 ? 6 : selectedOps.length <= 5 ? 12 : 18;

  const uploadImages = async (files: FileList | null, kind: "source" | "reference") => {
    if (!files?.length) return;
    if (!sceneId) return toast.error("Open the VFX Suite from a specific scene.");
    setUploading(kind);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(String(reader.result).split(",")[1]);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        const result = await uploadRefImageMutation.mutateAsync({
          base64,
          filename: file.name,
          contentType: file.type as any,
          sceneId,
        });
        urls.push(result.url);
      }
      if (kind === "source") setSourceImageUrls((previous) => [...previous, ...urls]);
      else setReferenceImageUrls((previous) => [...previous, ...urls]);
      toast.success(`${urls.length} image${urls.length === 1 ? "" : "s"} uploaded`);
    } catch (error: any) {
      toast.error(error?.message || "Image upload failed.");
    } finally {
      setUploading(null);
    }
  };

  const toggleOp = (operation: string) => {
    setProcessComplete(false);
    setSelectedOps((previous) => previous.includes(operation)
      ? previous.filter((item) => item !== operation)
      : [...previous, operation]);
  };

  const handleProcess = async () => {
    if (selectedOps.length === 0 && transformGoal === "appearance_reference") {
      return toast.error("Select a VFX or Swappys operation.");
    }
    if (!projectId || !sceneId) return toast.error("Open the VFX Suite from a specific scene.");
    if (selectedSwappys && !consentConfirmed && !aiGeneratedCharactersOnly) {
      return toast.error("Confirm likeness consent or confirm that all characters are original AI-generated characters.");
    }
    if (hideVisibleWatermark && !isCreator) {
      return toast.error("Watermark controls require Virelle Creator membership or higher.");
    }

    const operations = [...selectedOps];
    if (selectedSwappys && !operations.some((operation) => SWAPPYS_OPS.has(operation))) {
      operations.unshift("swappys-digital-double");
    }

    setIsProcessing(true);
    setProcessComplete(false);
    try {
      const result = await createStudioVfxJob.mutateAsync({
        projectId,
        sceneId,
        operations: Array.from(new Set(operations)),
        intensity,
        sourcePlateUrl: sourceImageUrls[0] || null,
        actorReferenceUrl: referenceImageUrls[0] || null,
        sourceImageUrls,
        referenceImageUrls,
        sourceVideoUrl: sourceVideoUrl.trim() || null,
        referenceVideoUrl: referenceVideoUrl.trim() || null,
        transformGoal,
        targetAge: targetAge.trim() ? Number(targetAge) : null,
        targetPresentation: targetPresentation.trim() || null,
        consentConfirmed: selectedSwappys ? (consentConfirmed || aiGeneratedCharactersOnly) : false,
        consentNotes: selectedSwappys
          ? `Film rating: ${rating}. ${directorNotes}`
          : null,
        contentMode: "standard",
        allSubjectsAdultsConfirmed: false,
        publicFigureLikeness: false,
        aiGeneratedCharactersOnly,
        hideVisibleWatermark: selectedSwappys ? hideVisibleWatermark : false,
        exportQuality,
        directorNotes: `STANDARD RATING ${rating}: non-explicit film treatment. ${directorNotes}`,
        runImagePass: true,
      });
      setLastJob({
        creditCost: result.creditCost,
        watermarkMode: result.watermarkMode,
        enhancedImageUrl: result.enhancedImageUrl,
        swappysJobId: result.swappysJobId,
      });
      setProcessComplete(true);
      toast.success(`VFX Studio job created. ${result.creditCost} credits charged.`);
    } catch (error: any) {
      toast.error(error?.message || "VFX processing failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#07070e] via-[#0c0b18] to-[#07070a]">
      <div className="sticky top-0 z-20 border-b border-white/10 bg-[#07070e]/95 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/projects/${projectId}`)} aria-label="Back to project"><ArrowLeft className="h-4 w-4" /></Button>
            <div>
              <h1 className="flex items-center gap-2 text-lg font-semibold text-gold-shimmer"><Wand2 className="h-5 w-5 text-amber-400" />VFX & Special Effects<Badge className="border border-amber-500/30 bg-amber-500/15 text-amber-300">Standard</Badge></h1>
              <p className="text-xs text-muted-foreground">Rating-controlled Swappys, digital doubles, compositing, restoration and finishing.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => { window.location.href = "/virelle-broadcast-render?workspace=adult"; }}><LockKeyhole className="mr-1 h-4 w-4" />Adult 18+</Button>
            {selectedOps.length > 0 && <Button variant="ghost" size="sm" onClick={() => { setSelectedOps([]); setProcessComplete(false); }}>Clear</Button>}
            <Button size="sm" className="bg-amber-500 text-black hover:bg-amber-600" onClick={handleProcess} disabled={isProcessing}>{isProcessing ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" />Processing</> : processComplete ? <><CheckCircle2 className="mr-1 h-4 w-4" />Created</> : <><Wand2 className="mr-1 h-4 w-4" />Create Job</>}</Button>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 p-3 md:p-4 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card className="border-amber-500/20 bg-black/20">
            <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm text-amber-300"><Sparkles className="h-4 w-4" />Transform Goal & Media</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <div><Label className="text-xs text-muted-foreground">Transform Goal</Label><select value={transformGoal} onChange={(event) => setTransformGoal(event.target.value as TransformGoal)} className="mt-1 w-full rounded-md border border-border bg-black/30 px-3 py-2 text-sm"><option value="appearance_reference">Appearance reference</option><option value="boy_to_girl">Feminine presentation</option><option value="girl_to_boy">Masculine presentation</option><option value="younger_self">Younger self</option><option value="older_self">Older self</option><option value="adult_to_child">Childhood self</option><option value="child_to_adult">Child to adult progression</option><option value="custom_prompt">Custom prompt</option></select></div>
                <div><Label className="text-xs text-muted-foreground">Target Age</Label><Input value={targetAge} onChange={(event) => setTargetAge(event.target.value.replace(/[^0-9]/g, ""))} placeholder="optional" className="mt-1" /></div>
                <div><Label className="text-xs text-muted-foreground">Film Rating</Label><select value={rating} onChange={(event) => setRating(event.target.value as Rating)} className="mt-1 w-full rounded-md border border-border bg-black/30 px-3 py-2 text-sm"><option value="G">G</option><option value="PG">PG</option><option value="PG-13">PG-13</option><option value="R">R — non-explicit</option></select></div>
                <div><Label className="text-xs text-muted-foreground">Presentation / Style</Label><Input value={targetPresentation} onChange={(event) => setTargetPresentation(event.target.value)} className="mt-1" /></div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <MediaBox title="Source Person Media" description="Who or what is being transformed." imageCount={sourceImageUrls.length} imageRef={sourceImageRef} uploading={uploading === "source"} onUpload={(files) => uploadImages(files, "source")} videoUrl={sourceVideoUrl} setVideoUrl={setSourceVideoUrl} />
                <MediaBox title="Target / Reference Media" description="What the result should match." imageCount={referenceImageUrls.length} imageRef={referenceImageRef} uploading={uploading === "reference"} onUpload={(files) => uploadImages(files, "reference")} videoUrl={referenceVideoUrl} setVideoUrl={setReferenceVideoUrl} />
              </div>

              <div className="grid grid-cols-1 gap-2 text-[11px] text-muted-foreground md:grid-cols-2">
                {sourceImageUrls.map((url, index) => <MediaChip key={`${url}-${index}`} label={`Source ${index + 1}`} url={url} remove={() => setSourceImageUrls((previous) => previous.filter((_, itemIndex) => itemIndex !== index))} />)}
                {referenceImageUrls.map((url, index) => <MediaChip key={`${url}-${index}`} label={`Ref ${index + 1}`} url={url} remove={() => setReferenceImageUrls((previous) => previous.filter((_, itemIndex) => itemIndex !== index))} />)}
              </div>
            </CardContent>
          </Card>

          <Card className="border-amber-500/20 bg-black/20">
            <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm text-amber-300"><Sparkles className="h-4 w-4" />Professional VFX Operations</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              {Object.entries(VFX_CATEGORIES).map(([category, operations]) => (
                <div key={category}>
                  <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">{category}</h3>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    {operations.map((operation) => {
                      const selected = selectedOps.includes(operation);
                      return (
                        <button key={operation} onClick={() => toggleOp(operation)} className={`flex items-center gap-2 rounded-lg border p-3 text-left transition-all ${selected ? "border-amber-500 bg-amber-500/10" : "border-border/40 bg-black/20 hover:border-amber-500/40"}`}>
                          <span className={selected ? "text-amber-400" : "text-muted-foreground"}>{VFX_ICONS[operation] || <Layers className="h-4 w-4" />}</span>
                          <span className="text-xs">{VFX_LABELS[operation]}</span>
                          {selected && <CheckCircle2 className="ml-auto h-3 w-3 shrink-0 text-amber-400" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="border-blue-500/25 bg-blue-500/5">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-blue-200">Standard Swappys Policy</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-[11px] leading-relaxed text-muted-foreground">
              <p>Swappys appears here for ordinary film and VFX work. Output follows the selected film rating and remains non-explicit.</p>
              <p>Age-appropriate, non-sexual teenage story scenes may be created. Sexualised or explicit depictions involving minors are prohibited under every rating.</p>
              <Button className="w-full" variant="outline" onClick={() => { window.location.href = "/virelle-broadcast-render?workspace=adult"; }}><LockKeyhole className="mr-2 h-4 w-4" />Open Separate Adult Workspace</Button>
            </CardContent>
          </Card>

          <Card className="border-amber-500/20 bg-black/20">
            <CardHeader className="pb-2"><CardTitle className="text-sm gradient-text-gold">Processing Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><div className="mb-1 flex justify-between"><Label className="text-xs text-muted-foreground">Effect Intensity</Label><span className="text-xs text-amber-400">{intensity}%</span></div><Slider value={[intensity]} onValueChange={([value]) => setIntensity(value)} min={10} max={100} step={5} /></div>
              <Separator />
              <div className="space-y-2"><Label className="text-xs text-muted-foreground">Export Quality</Label><div className="grid grid-cols-3 gap-2">{(["preview", "final", "master"] as const).map((quality) => <button key={quality} onClick={() => setExportQuality(quality)} className={`rounded-md border px-2 py-2 text-xs ${exportQuality === quality ? "border-amber-500 bg-amber-500/10 text-amber-300" : "border-border/40 text-muted-foreground"}`}>{quality}</button>)}</div><p className="text-[11px] text-muted-foreground">Estimated: {estimatedCredits} credits · {mediaCount} media input(s)</p></div>
              {selectedSwappys && <div className="space-y-3 rounded-lg border border-amber-500/25 bg-amber-500/5 p-3"><div className="flex items-start gap-2"><Checkbox checked={aiGeneratedCharactersOnly} onCheckedChange={(value) => setAiGeneratedCharactersOnly(Boolean(value))} /><div><Label className="text-xs text-amber-200">Original AI-generated characters only</Label><p className="mt-1 text-[11px] text-muted-foreground">No real person's likeness is used.</p></div></div>{!aiGeneratedCharactersOnly && <div className="flex items-start gap-2"><Checkbox checked={consentConfirmed} onCheckedChange={(value) => setConsentConfirmed(Boolean(value))} /><div><Label className="text-xs text-amber-200">I confirm likeness, media and distribution rights.</Label><p className="mt-1 text-[11px] text-muted-foreground">Required for digital doubles, age transforms, stunts, pickups, renders and broadcasts.</p></div></div>}<div className="flex items-center justify-between gap-3"><div><Label className="text-xs text-amber-200">Hide visible watermark</Label><p className="text-[11px] text-muted-foreground">Internal provenance remains.</p></div><Switch checked={hideVisibleWatermark} disabled={!isCreator} onCheckedChange={setHideVisibleWatermark} /></div></div>}
              <Separator />
              <div><Label className="mb-1 block text-xs text-muted-foreground">Director / VFX Notes</Label><Textarea value={directorNotes} onChange={(event) => setDirectorNotes(event.target.value)} placeholder="Describe the lawful transformation and continuity target." className="min-h-[130px] resize-none text-xs" /></div>
            </CardContent>
          </Card>

          <Card className="border-amber-500/20 bg-black/20">
            <CardHeader className="pb-2"><CardTitle className="text-sm gradient-text-gold">Output & Handoff</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {lastJob ? <>
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2 text-[11px] text-muted-foreground">Job #{lastJob.swappysJobId || "VFX"} · {lastJob.creditCost} credits · {lastJob.watermarkMode || "default"}</div>
                {lastJob.enhancedImageUrl && <img src={lastJob.enhancedImageUrl} alt="Swappys output" className="w-full rounded-lg border border-border/50" />}
                <Button className="w-full bg-blue-600 text-white hover:bg-blue-700" disabled={!lastJob.swappysJobId} onClick={() => navigate(`/virelle-broadcast-render?workspace=standard&swappysJobId=${lastJob.swappysJobId}`)}><RadioTower className="mr-2 h-4 w-4" />Send Exact Job to Standard Broadcast</Button>
              </> : <p className="text-xs text-muted-foreground">Create a Swappys job to unlock exact Studio Render and Broadcast handoff.</p>}
              {isIndustry && <Badge className="border border-purple-400/30 bg-purple-500/15 text-purple-200">Industry access active</Badge>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function MediaBox({
  title,
  description,
  imageCount,
  imageRef,
  uploading,
  onUpload,
  videoUrl,
  setVideoUrl,
}: {
  title: string;
  description: string;
  imageCount: number;
  imageRef: React.RefObject<HTMLInputElement | null>;
  uploading: boolean;
  onUpload: (files: FileList | null) => void;
  videoUrl: string;
  setVideoUrl: (value: string) => void;
}) {
  return (
    <div className="rounded-lg border border-border/40 bg-black/20 p-3">
      <Label className="text-xs text-amber-200">{title}</Label>
      <p className="mt-1 text-[11px] text-muted-foreground">{description}</p>
      <Button size="sm" variant="outline" className="mt-2" onClick={() => imageRef.current?.click()} disabled={uploading}>{uploading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Upload className="mr-1 h-3 w-3" />}Images</Button>
      <input ref={imageRef} className="hidden" type="file" accept="image/*" multiple onChange={(event) => onUpload(event.target.files)} />
      <Input className="mt-2" placeholder="Optional secure video URL" value={videoUrl} onChange={(event) => setVideoUrl(event.target.value)} />
      <div className="mt-2 text-[11px] text-muted-foreground">{imageCount} image(s) · {videoUrl ? "video set" : "no video"}</div>
    </div>
  );
}

function MediaChip({ label, url, remove }: { label: string; url: string; remove: () => void }) {
  return (
    <div className="flex items-center gap-2 truncate rounded border border-border/40 p-2">
      <span className="text-amber-300">{label}</span><span className="truncate">{url}</span><button onClick={remove}><X className="h-3 w-3" /></button>
    </div>
  );
}

export default function VFXSuite() {
  return (
    <SubscriptionGate feature="Visual Effects Suite" featureKey="canUseVisualEffects" requiredTier="amateur">
      <VFXSuiteInner />
    </SubscriptionGate>
  );
}
