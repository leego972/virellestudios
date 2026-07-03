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
import { AlertTriangle, ArrowLeft, BadgeCheck, Camera, CheckCircle2, Clapperboard, Eraser, Eye, FileCheck2, Film, Layers, Loader2, Maximize2, Palette, ScanFace, ShieldCheck, Sparkles, Upload, Wand2, X, Zap } from "lucide-react";
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
  "stabilization": "Stabilization / Camera Shake Repair",
  "lens-distortion-repair": "Lens Distortion Repair",
  "chromatic-repair": "Chromatic Aberration Repair",
  "final-qc-pass": "Final QC / Continuity Pass",
  "render-pass-provenance": "Render Pass Provenance",
  "edit-handoff-package": "Editorial Handoff Package",
};

const VFX_ICONS: Record<string, ReactNode> = {
  "swappys-digital-double": <ScanFace className="w-4 h-4" />,
  "stunt-face-replacement": <ShieldCheck className="w-4 h-4" />,
  "actor-continuity-match": <BadgeCheck className="w-4 h-4" />,
  "pickup-scene-match": <Clapperboard className="w-4 h-4" />,
  "ai-stunt-insert": <Sparkles className="w-4 h-4" />,
  "performance-polish": <Wand2 className="w-4 h-4" />,
  "multi-anchor-character-lock": <ScanFace className="w-4 h-4" />,
  "temporal-consistency-pass": <Film className="w-4 h-4" />,
  "gender-transform": <ScanFace className="w-4 h-4" />,
  "age-transform": <Eye className="w-4 h-4" />,
  "childhood-self": <Sparkles className="w-4 h-4" />,
  "scene-extension-outpaint": <Maximize2 className="w-4 h-4" />,
  "object-removal-inpaint": <Eraser className="w-4 h-4" />,
  "stabilization": <Layers className="w-4 h-4" />,
  "upscale-4k": <Zap className="w-4 h-4" />,
  "upscale-8k": <Zap className="w-4 h-4" />,
  "denoising-grain-removal": <Wand2 className="w-4 h-4" />,
  "face-enhancement": <Eye className="w-4 h-4" />,
  "style-transfer": <Palette className="w-4 h-4" />,
  "color-match": <Palette className="w-4 h-4" />,
  "motion-blur-add": <Wand2 className="w-4 h-4" />,
  "lens-flare-add": <Zap className="w-4 h-4" />,
  "film-grain-add": <Film className="w-4 h-4" />,
  "depth-of-field-post": <Camera className="w-4 h-4" />,
  "vignette-add": <Layers className="w-4 h-4" />,
  "camera-matchmove-solve": <Camera className="w-4 h-4" />,
  "neural-matte-edge-refine": <Layers className="w-4 h-4" />,
  "render-pass-provenance": <FileCheck2 className="w-4 h-4" />,
  "edit-handoff-package": <FileCheck2 className="w-4 h-4" />,
  "final-qc-pass": <FileCheck2 className="w-4 h-4" />,
};

const VFX_CATEGORIES: Record<string, string[]> = {
  "Swappys Transform Studio": ["swappys-digital-double", "gender-transform", "age-transform", "childhood-self", "stunt-face-replacement", "actor-continuity-match", "pickup-scene-match", "ai-stunt-insert", "performance-polish", "multi-anchor-character-lock", "temporal-consistency-pass"],
  "Compositing & Plates": ["roto-person-isolation", "green-screen-keying", "background-replacement", "foreground-composite", "sky-replacement", "set-extension", "crowd-multiplication", "camera-matchmove-solve"],
  "Cleanup & Safety": ["object-removal-inpaint", "wire-rig-removal", "safety-gear-removal", "reflection-cleanup", "screen-replacement", "neural-matte-edge-refine"],
  "Action & Atmosphere": ["muzzle-flash-practical", "debris-dust-impact", "weather-rain-snow", "fire-smoke-atmosphere", "motion-blur-add", "lens-flare-add"],
  "Image Quality & Restoration": ["scene-extension-outpaint", "upscale-4k", "upscale-8k", "denoising-grain-removal", "face-enhancement", "beauty-retouch-film", "de-age-subtle", "film-damage-restore", "deflicker-exposure"],
  "Finishing, QC & Handoff": ["color-match", "style-transfer", "film-grain-add", "depth-of-field-post", "vignette-add", "stabilization", "lens-distortion-repair", "chromatic-repair", "final-qc-pass", "render-pass-provenance", "edit-handoff-package"],
};

const SWAPPYS_OPS = new Set(["swappys-digital-double", "gender-transform", "age-transform", "childhood-self", "stunt-face-replacement", "actor-continuity-match", "pickup-scene-match", "ai-stunt-insert", "performance-polish", "multi-anchor-character-lock", "temporal-consistency-pass"]);

type UploadKind = "sourceImage" | "referenceImage" | "sourceVideo" | "referenceVideo";
type TransformGoal = "appearance_reference" | "boy_to_girl" | "girl_to_boy" | "younger_self" | "older_self" | "adult_to_child" | "child_to_adult" | "custom_prompt";

function VFXSuiteInner() {
  const [, navigate] = useLocation();
  const params = useParams<{ projectId: string; sceneId: string }>();
  const projectId = parseInt(params.projectId || "0");
  const sceneId = parseInt(params.sceneId || "0");
  const { isCreator, isIndustry } = useSubscription();

  const createStudioVfxJob = (trpc as any).vfxSfx.createStudioVfxJob.useMutation();
  const uploadRefImageMutation = trpc.upload.referenceImage.useMutation();

  const sourceImageRef = useRef<HTMLInputElement>(null);
  const referenceImageRef = useRef<HTMLInputElement>(null);
  const sourceVideoRef = useRef<HTMLInputElement>(null);
  const referenceVideoRef = useRef<HTMLInputElement>(null);

  const [selectedOps, setSelectedOps] = useState<string[]>([]);
  const [intensity, setIntensity] = useState(75);
  const [directorNotes, setDirectorNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processComplete, setProcessComplete] = useState(false);
  const [sourceImageUrls, setSourceImageUrls] = useState<string[]>([]);
  const [referenceImageUrls, setReferenceImageUrls] = useState<string[]>([]);
  const [sourceVideoUrl, setSourceVideoUrl] = useState<string | null>(null);
  const [referenceVideoUrl, setReferenceVideoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState<UploadKind | null>(null);
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [hideVisibleWatermark, setHideVisibleWatermark] = useState(false);
  const [exportQuality, setExportQuality] = useState<"preview" | "final" | "master">("preview");
  const [transformGoal, setTransformGoal] = useState<TransformGoal>("appearance_reference");
  const [targetAge, setTargetAge] = useState<string>("");
  const [targetPresentation, setTargetPresentation] = useState("");
  const [lastJob, setLastJob] = useState<{ creditCost?: number; watermarkMode?: string; enhancedImageUrl?: string | null } | null>(null);

  const selectedSwappys = selectedOps.some((op) => SWAPPYS_OPS.has(op)) || transformGoal !== "appearance_reference";
  const mediaCount = sourceImageUrls.length + referenceImageUrls.length + (sourceVideoUrl ? 1 : 0) + (referenceVideoUrl ? 1 : 0);
  const estimatedCredits = selectedSwappys ? exportQuality === "preview" ? 12 + Math.ceil(mediaCount / 3) : exportQuality === "final" ? 24 + Math.ceil(mediaCount / 2) : 40 + mediaCount : selectedOps.length <= 2 ? 6 : selectedOps.length <= 5 ? 12 : 18;

  const uploadMedia = async (files: FileList | null, kind: UploadKind) => {
    if (!files || files.length === 0) return;
    if (!sceneId) return toast.error("No scene found. Navigate here from a specific scene.");
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
        const result = await uploadRefImageMutation.mutateAsync({ base64, filename: file.name, contentType: file.type as any, sceneId });
        urls.push(result.url);
      }
      if (kind === "sourceImage") setSourceImageUrls((prev) => [...prev, ...urls]);
      if (kind === "referenceImage") setReferenceImageUrls((prev) => [...prev, ...urls]);
      if (kind === "sourceVideo") setSourceVideoUrl(urls[0] || null);
      if (kind === "referenceVideo") setReferenceVideoUrl(urls[0] || null);
      toast.success(`${urls.length} file${urls.length === 1 ? "" : "s"} uploaded`);
    } catch (err: any) {
      toast.error(err?.message || "Upload failed. You can paste a media URL manually if needed.");
    } finally {
      setUploading(null);
      if (sourceImageRef.current) sourceImageRef.current.value = "";
      if (referenceImageRef.current) referenceImageRef.current.value = "";
      if (sourceVideoRef.current) sourceVideoRef.current.value = "";
      if (referenceVideoRef.current) referenceVideoRef.current.value = "";
    }
  };

  const toggleOp = (op: string) => {
    setProcessComplete(false);
    setSelectedOps((prev) => prev.includes(op) ? prev.filter((o) => o !== op) : [...prev, op]);
  };

  const removeUrl = (kind: "sourceImage" | "referenceImage", index: number) => {
    if (kind === "sourceImage") setSourceImageUrls((prev) => prev.filter((_, i) => i !== index));
    if (kind === "referenceImage") setReferenceImageUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleProcess = async () => {
    if (selectedOps.length === 0 && transformGoal === "appearance_reference") return toast.error("Select at least one VFX/transform operation");
    if (!projectId || !sceneId) return toast.error("No scene found. Navigate here from a specific scene.");
    if (selectedSwappys && !consentConfirmed) return toast.error("Confirm actor likeness/media consent before using Swappys Transform Studio.");
    if (hideVisibleWatermark && !isCreator) return toast.error("Visible watermark toggle requires Virelle Creator membership or higher.");
    setIsProcessing(true);
    setProcessComplete(false);
    try {
      const result = await createStudioVfxJob.mutateAsync({
        projectId,
        sceneId,
        operations: selectedOps.length ? selectedOps : ["swappys-digital-double"],
        intensity,
        sourcePlateUrl: sourceImageUrls[0] || null,
        actorReferenceUrl: referenceImageUrls[0] || null,
        sourceImageUrls,
        referenceImageUrls,
        sourceVideoUrl,
        referenceVideoUrl,
        transformGoal,
        targetAge: targetAge.trim() ? Number(targetAge) : null,
        targetPresentation: targetPresentation.trim() || null,
        consentConfirmed: selectedSwappys ? consentConfirmed : false,
        consentNotes: selectedSwappys ? directorNotes : null,
        hideVisibleWatermark: selectedSwappys ? hideVisibleWatermark : false,
        exportQuality,
        directorNotes,
        runImagePass: true,
      });
      setLastJob({ creditCost: result.creditCost, watermarkMode: result.watermarkMode, enhancedImageUrl: result.enhancedImageUrl });
      setProcessComplete(true);
      toast.success(`VFX Studio job created. ${result.creditCost} credits charged.`);
    } catch (err: any) {
      toast.error(err?.message || "VFX processing failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)" }}>
      <div className="border-b sticky top-0 z-20 px-4 py-3" style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(7,7,14,0.97)", backdropFilter: "blur(24px)" }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3"><Button variant="ghost" size="icon" onClick={() => navigate(`/projects/${projectId}`)} aria-label="Back to project"><ArrowLeft className="w-4 h-4" /></Button><div><h1 className="text-lg font-semibold flex items-center gap-2 text-gold-shimmer"><Wand2 className="w-5 h-5 text-amber-400" />VFX Suite<Badge className="bg-amber-500/15 text-amber-300 border border-amber-500/30">Studio</Badge></h1><p className="text-xs text-muted-foreground">Multi-media Swappys transforms, digital doubles, compositing, restoration, finishing and QC.</p></div></div>
          <div className="flex items-center gap-2">{selectedOps.length > 0 && <Button variant="ghost" size="sm" onClick={() => { setSelectedOps([]); setProcessComplete(false); }}>Clear All</Button>}<Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-black" onClick={handleProcess} disabled={isProcessing}>{isProcessing ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Processing...</> : processComplete ? <><CheckCircle2 className="w-4 h-4 mr-1" /> Created</> : <><Wand2 className="w-4 h-4 mr-1" /> Create VFX Job</>}</Button></div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-3 md:p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-5">
          <Card className="border-amber-500/20 glass-card"><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2 text-amber-300"><Sparkles className="w-4 h-4" /> Transform Goal & Studio Media</CardTitle></CardHeader><CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3"><div><Label className="text-xs text-muted-foreground">Transform Goal</Label><select value={transformGoal} onChange={(e) => setTransformGoal(e.target.value as TransformGoal)} className="w-full mt-1 rounded-md bg-black/30 border border-border px-3 py-2 text-sm"><option value="appearance_reference">Appearance reference</option><option value="boy_to_girl">Boy → Girl / feminine presentation</option><option value="girl_to_boy">Girl → Boy / masculine presentation</option><option value="younger_self">Younger self / de-age</option><option value="older_self">Older self / age-up</option><option value="adult_to_child">Childhood self / adult → child</option><option value="child_to_adult">Child → adult progression</option><option value="custom_prompt">Custom prompt</option></select></div><div><Label className="text-xs text-muted-foreground">Target Age</Label><input value={targetAge} onChange={(e) => setTargetAge(e.target.value.replace(/[^0-9]/g, ""))} placeholder="optional" className="w-full mt-1 rounded-md bg-black/30 border border-border px-3 py-2 text-sm" /></div><div><Label className="text-xs text-muted-foreground">Target Presentation / Style</Label><input value={targetPresentation} onChange={(e) => setTargetPresentation(e.target.value)} placeholder="cinematic, feminine, masculine, 10yo self..." className="w-full mt-1 rounded-md bg-black/30 border border-border px-3 py-2 text-sm" /></div></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3"><div className="rounded-lg border border-border/40 bg-black/20 p-3"><Label className="text-xs text-amber-200">Source Person Media</Label><p className="text-[11px] text-muted-foreground mt-1">Who is being transformed. Upload multiple photos and optional source/performance video.</p><div className="flex gap-2 mt-2"><Button size="sm" variant="outline" onClick={() => sourceImageRef.current?.click()} disabled={uploading === "sourceImage"}><Upload className="w-3 h-3 mr-1" />Images</Button><Button size="sm" variant="outline" onClick={() => sourceVideoRef.current?.click()} disabled={uploading === "sourceVideo"}><Film className="w-3 h-3 mr-1" />Video</Button></div><input ref={sourceImageRef} className="hidden" type="file" accept="image/*" multiple onChange={(e) => uploadMedia(e.target.files, "sourceImage")} /><input ref={sourceVideoRef} className="hidden" type="file" accept="video/*" onChange={(e) => uploadMedia(e.target.files, "sourceVideo")} /><div className="text-[11px] text-muted-foreground mt-2">{sourceImageUrls.length} source image(s) · {sourceVideoUrl ? "source video set" : "no source video"}</div></div><div className="rounded-lg border border-border/40 bg-black/20 p-3"><Label className="text-xs text-amber-200">Target / Reference Media</Label><p className="text-[11px] text-muted-foreground mt-1">What the person should look like. Upload childhood photos, gender/presentation refs, age refs and optional reference video.</p><div className="flex gap-2 mt-2"><Button size="sm" variant="outline" onClick={() => referenceImageRef.current?.click()} disabled={uploading === "referenceImage"}><Upload className="w-3 h-3 mr-1" />Images</Button><Button size="sm" variant="outline" onClick={() => referenceVideoRef.current?.click()} disabled={uploading === "referenceVideo"}><Film className="w-3 h-3 mr-1" />Video</Button></div><input ref={referenceImageRef} className="hidden" type="file" accept="image/*" multiple onChange={(e) => uploadMedia(e.target.files, "referenceImage")} /><input ref={referenceVideoRef} className="hidden" type="file" accept="video/*" onChange={(e) => uploadMedia(e.target.files, "referenceVideo")} /><div className="text-[11px] text-muted-foreground mt-2">{referenceImageUrls.length} reference image(s) · {referenceVideoUrl ? "reference video set" : "no reference video"}</div></div></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-muted-foreground">{sourceImageUrls.map((u, i) => <div key={u} className="flex items-center gap-2 truncate rounded border border-border/40 p-2"><span className="text-amber-300">Source {i + 1}</span><span className="truncate">{u}</span><button onClick={() => removeUrl("sourceImage", i)}><X className="w-3 h-3" /></button></div>)}{referenceImageUrls.map((u, i) => <div key={u} className="flex items-center gap-2 truncate rounded border border-border/40 p-2"><span className="text-amber-300">Ref {i + 1}</span><span className="truncate">{u}</span><button onClick={() => removeUrl("referenceImage", i)}><X className="w-3 h-3" /></button></div>)}</div>
          </CardContent></Card>

          <Card className="border-amber-500/20 glass-card"><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2 text-amber-300"><Sparkles className="w-4 h-4" /> Professional VFX Operations</CardTitle></CardHeader><CardContent className="space-y-5">{Object.entries(VFX_CATEGORIES).map(([category, ops]) => <div key={category}><h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">{category}</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-2">{ops.map((op) => { const selected = selectedOps.includes(op); return <button key={op} onClick={() => toggleOp(op)} className={`text-left p-3 rounded-lg border transition-all flex items-center gap-2 ${selected ? "border-amber-500 bg-amber-500/10" : "border-border/40 bg-black/20 hover:border-amber-500/40"}`}><span className={selected ? "text-amber-400" : "text-muted-foreground"}>{VFX_ICONS[op] || <Layers className="w-4 h-4" />}</span><span className="text-xs">{VFX_LABELS[op]}</span>{selected && <CheckCircle2 className="w-3 h-3 text-amber-400 ml-auto flex-shrink-0" />}</button>; })}</div></div>)}</CardContent></Card>
        </div>

        <div className="space-y-4">
          <Card className="border-amber-500/20 glass-card gold-glow"><CardHeader className="pb-2"><CardTitle className="text-sm gradient-text-gold">Processing Settings</CardTitle></CardHeader><CardContent className="space-y-4"><div><div className="flex justify-between mb-1"><Label className="text-xs text-muted-foreground">Effect Intensity</Label><span className="text-xs text-amber-400">{intensity}%</span></div><Slider value={[intensity]} onValueChange={([v]) => setIntensity(v)} min={10} max={100} step={5} /></div><Separator /><div className="space-y-2"><Label className="text-xs text-muted-foreground">Export Quality</Label><div className="grid grid-cols-3 gap-2">{(["preview", "final", "master"] as const).map((q) => <button key={q} onClick={() => setExportQuality(q)} className={`rounded-md border px-2 py-2 text-xs ${exportQuality === q ? "border-amber-500 bg-amber-500/10 text-amber-300" : "border-border/40 text-muted-foreground"}`}>{q}</button>)}</div><p className="text-[11px] text-muted-foreground">Estimated cost: {estimatedCredits} credits · {mediaCount} media input(s)</p></div>{selectedSwappys && <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-3 space-y-3"><div className="flex items-start gap-2"><Checkbox checked={consentConfirmed} onCheckedChange={(v) => setConsentConfirmed(Boolean(v))} /><div><Label className="text-xs text-amber-200">I confirm actor likeness / media consent and rights clearance.</Label><p className="text-[11px] text-muted-foreground mt-1">Required for digital-double, gender, age, childhood, stunt, pickup and actor-continuity work.</p></div></div><div className="flex items-center justify-between gap-3"><div><Label className="text-xs text-amber-200">Hide visible watermark</Label><p className="text-[11px] text-muted-foreground">Creator+ only. Internal audit/provenance remains stored.</p></div><Switch checked={hideVisibleWatermark} disabled={!isCreator} onCheckedChange={setHideVisibleWatermark} /></div>{!isCreator && <div className="flex gap-2 text-[11px] text-amber-200"><AlertTriangle className="w-3 h-3 mt-0.5" /> Upgrade to Virelle Creator for studio watermark controls.</div>}</div>}<Separator /><div><Label className="text-xs text-muted-foreground mb-1 block">Director / VFX Supervisor Notes</Label><Textarea value={directorNotes} onChange={(e) => setDirectorNotes(e.target.value)} placeholder="Describe the exact VFX target: use these childhood photos to make me look 10, transform presentation, match actor to stunt plate, preserve identity, remove harness, etc." className="text-xs min-h-[140px] resize-none" /></div></CardContent></Card>
          <Card className="border-amber-500/20 glass-card"><CardHeader className="pb-2"><CardTitle className="text-sm gradient-text-gold">Selected Operations</CardTitle></CardHeader><CardContent>{selectedOps.length === 0 ? <p className="text-xs text-muted-foreground">No operations selected. Transform goal can still create a Swappys job.</p> : <div className="space-y-1">{selectedOps.map((op) => <div key={op} className="flex items-center justify-between gap-2"><span className="text-xs text-amber-400">{VFX_LABELS[op]}</span><button onClick={() => toggleOp(op)}><X className="w-3 h-3 text-muted-foreground hover:text-red-400" /></button></div>)}</div>}{lastJob && <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-2 text-[11px] text-muted-foreground space-y-2"><div>Last job: {lastJob.creditCost} credits · watermark: {lastJob.watermarkMode || "default"}</div><Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700 text-white" onClick={() => { const params = new URLSearchParams(); if (referenceImageUrls[0]) params.set("avatarRef", referenceImageUrls[0]); if (sourceImageUrls[0]) params.set("avatarSource", sourceImageUrls[0]); params.set("goal", transformGoal); if (projectId) params.set("projectId", String(projectId)); if (sceneId) params.set("sceneId", String(sceneId)); navigate(`/virelle-broadcast-render?${params.toString()}`); }}>Go Live as this Avatar</Button></div>}{isIndustry && <Badge className="mt-3 bg-purple-500/15 text-purple-200 border border-purple-400/30">Industry access active</Badge>}</CardContent></Card>
        </div>
      </div>
    </div>
  );
}

export default function VFXSuite() {
  return <SubscriptionGate feature="Visual Effects Suite" featureKey="canUseVisualEffects" requiredTier="amateur"><VFXSuiteInner /></SubscriptionGate>;
}
