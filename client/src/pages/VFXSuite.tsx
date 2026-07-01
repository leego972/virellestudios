import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertTriangle,
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
  Maximize2,
  Palette,
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
  "scene-extension-outpaint": "Scene Extension / Outpainting",
  "object-removal-inpaint": "Object Removal / Inpainting",
  "stabilization": "Stabilization / Camera Shake Repair",
  "upscale-4k": "Upscale to 4K",
  "upscale-8k": "Upscale to 8K",
  "denoising-grain-removal": "Denoising / Grain Repair",
  "face-enhancement": "Face Enhancement / Detail Recovery",
  "style-transfer": "Style Transfer",
  "color-match": "Colour Match to Source Plate",
  "motion-blur-add": "Cinematic Motion Blur",
  "lens-flare-add": "Anamorphic Lens Flare",
  "film-grain-add": "Film Grain / Analog Texture",
  "depth-of-field-post": "Post Depth of Field / Rack Focus",
  "vignette-add": "Cinematic Vignette",

  // Swappys / digital-double feature set.
  "swappys-digital-double": "Swappys Digital Double",
  "stunt-face-replacement": "Stunt Face Replacement",
  "actor-continuity-match": "Actor Continuity Match",
  "pickup-scene-match": "Pickup / Reshoot Match",
  "ai-stunt-insert": "AI Stunt Insert",
  "performance-polish": "Performance Polish",

  // Advanced professional studio effects.
  "roto-person-isolation": "AI Rotoscope / Person Isolation",
  "green-screen-keying": "Green Screen / Keying",
  "background-replacement": "Background Replacement",
  "foreground-composite": "Foreground Composite",
  "sky-replacement": "Sky Replacement",
  "set-extension": "Set Extension",
  "crowd-multiplication": "Crowd Multiplication",
  "wire-rig-removal": "Wire / Rig Removal",
  "safety-gear-removal": "Safety Gear Cleanup",
  "reflection-cleanup": "Reflection Cleanup",
  "screen-replacement": "Screen Replacement",
  "muzzle-flash-practical": "Practical Action Flash / Spark",
  "debris-dust-impact": "Debris / Dust Impact",
  "weather-rain-snow": "Rain / Snow / Weather Layer",
  "fire-smoke-atmosphere": "Fire / Smoke Atmosphere",
  "night-for-day": "Day-for-Night / Night-for-Day",
  "beauty-retouch-film": "Film Beauty Retouch",
  "de-age-subtle": "Subtle De-Aging",
  "film-damage-restore": "Film Damage Restoration",
  "deflicker-exposure": "Deflicker / Exposure Repair",
  "lens-distortion-repair": "Lens Distortion Repair",
  "chromatic-repair": "Chromatic Aberration Repair",
  "final-qc-pass": "Final QC / Continuity Pass",
};

const VFX_ICONS: Record<string, React.ReactNode> = {
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
  "swappys-digital-double": <ScanFace className="w-4 h-4" />,
  "stunt-face-replacement": <ShieldCheck className="w-4 h-4" />,
  "actor-continuity-match": <BadgeCheck className="w-4 h-4" />,
  "pickup-scene-match": <Clapperboard className="w-4 h-4" />,
  "ai-stunt-insert": <Sparkles className="w-4 h-4" />,
  "performance-polish": <Wand2 className="w-4 h-4" />,
  "final-qc-pass": <FileCheck2 className="w-4 h-4" />,
};

const VFX_CATEGORIES: Record<string, string[]> = {
  "Swappys Digital Double": [
    "swappys-digital-double",
    "stunt-face-replacement",
    "actor-continuity-match",
    "pickup-scene-match",
    "ai-stunt-insert",
    "performance-polish",
  ],
  "Compositing & Plates": [
    "roto-person-isolation",
    "green-screen-keying",
    "background-replacement",
    "foreground-composite",
    "sky-replacement",
    "set-extension",
    "crowd-multiplication",
  ],
  "Cleanup & Safety": [
    "object-removal-inpaint",
    "wire-rig-removal",
    "safety-gear-removal",
    "reflection-cleanup",
    "screen-replacement",
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
    "upscale-4k",
    "upscale-8k",
    "denoising-grain-removal",
    "face-enhancement",
    "beauty-retouch-film",
    "de-age-subtle",
    "film-damage-restore",
    "deflicker-exposure",
  ],
  "Finishing & QC": [
    "color-match",
    "style-transfer",
    "film-grain-add",
    "depth-of-field-post",
    "vignette-add",
    "stabilization",
    "lens-distortion-repair",
    "chromatic-repair",
    "final-qc-pass",
  ],
};

const SWAPPYS_OPS = new Set([
  "swappys-digital-double",
  "stunt-face-replacement",
  "actor-continuity-match",
  "pickup-scene-match",
  "ai-stunt-insert",
  "performance-polish",
]);

function VFXSuiteInner() {
  const [, navigate] = useLocation();
  const params = useParams<{ projectId: string; sceneId: string }>();
  const projectId = parseInt(params.projectId || "0");
  const sceneId = parseInt(params.sceneId || "0");
  const { isCreator, isIndustry } = useSubscription();

  const updateSceneMutation = trpc.scene.update.useMutation();
  const generateVideoMutation = trpc.scene.generateVideo.useMutation();
  const uploadRefImageMutation = trpc.upload.referenceImage.useMutation();

  const sourcePlateRef = useRef<HTMLInputElement>(null);
  const actorRef = useRef<HTMLInputElement>(null);
  const [selectedOps, setSelectedOps] = useState<string[]>([]);
  const [intensity, setIntensity] = useState(75);
  const [retakeInstructions, setRetakeInstructions] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processComplete, setProcessComplete] = useState(false);
  const [sourcePlateUrl, setSourcePlateUrl] = useState<string | null>(null);
  const [actorReferenceUrl, setActorReferenceUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState<"source" | "actor" | null>(null);
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [hideVisibleWatermark, setHideVisibleWatermark] = useState(false);
  const [exportQuality, setExportQuality] = useState<"preview" | "final" | "master">("preview");

  const selectedSwappys = selectedOps.some((op) => SWAPPYS_OPS.has(op));
  const estimatedCredits = selectedSwappys
    ? exportQuality === "preview" ? 12 : exportQuality === "final" ? 24 : 40
    : selectedOps.length <= 2 ? 6 : selectedOps.length <= 5 ? 12 : 18;

  const uploadReference = async (file: File, kind: "source" | "actor") => {
    if (file.size > 40 * 1024 * 1024) {
      toast.error("File too large. Max 40MB.");
      return;
    }
    if (!sceneId) {
      toast.error("No scene found. Navigate here from a specific scene.");
      return;
    }
    setUploading(kind);
    try {
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
      if (kind === "source") setSourcePlateUrl(result.url);
      if (kind === "actor") setActorReferenceUrl(result.url);
      toast.success(kind === "source" ? "Source plate uploaded" : "Actor reference uploaded");
    } catch (err: any) {
      toast.error(err?.message || "Upload failed");
    } finally {
      setUploading(null);
      if (sourcePlateRef.current) sourcePlateRef.current.value = "";
      if (actorRef.current) actorRef.current.value = "";
    }
  };

  const toggleOp = (op: string) => {
    setSelectedOps((prev) => prev.includes(op) ? prev.filter((o) => o !== op) : [...prev, op]);
  };

  const buildPrompt = () => {
    const operationText = selectedOps.map((op) => VFX_LABELS[op] || op).join(", ");
    const studioNotes = [
      `Apply professional VFX operations at ${intensity}% intensity: ${operationText}.`,
      selectedSwappys ? "SWAPPYS DIGITAL DOUBLE DIRECTIVE: preserve actor identity continuity across the shot, match head angle, expression, lighting, skin detail, wardrobe continuity, motion blur, grain, lens distortion, and camera perspective. This is for consented film-production digital-double/stunt/pickup work." : "",
      sourcePlateUrl ? "Use uploaded source plate as the live-action/VFX plate reference." : "",
      actorReferenceUrl ? "Use uploaded actor reference as the approved likeness/continuity source." : "",
      hideVisibleWatermark ? "Studio export setting: hide visible watermark on final production output, while retaining internal consent/audit/provenance metadata." : "Studio export setting: retain visible AI-altered disclosure/watermark.",
      exportQuality === "master" ? "Master quality target: finishing pass suitable for edit handoff; prioritise temporal consistency, artifact reduction, edge fidelity, and colour-science match." : "",
      retakeInstructions.trim() ? `DIRECTOR NOTES: ${retakeInstructions.trim()}` : "",
    ];
    return studioNotes.filter(Boolean).join(" ");
  };

  const handleProcess = async () => {
    if (selectedOps.length === 0) {
      toast.error("Select at least one VFX operation");
      return;
    }
    if (!sceneId) {
      toast.error("No scene found. Navigate here from a specific scene.");
      return;
    }
    if (selectedSwappys && !consentConfirmed) {
      toast.error("Confirm actor likeness consent before using Swappys Digital Double.");
      return;
    }
    if (hideVisibleWatermark && !isCreator) {
      toast.error("Visible watermark toggle requires Virelle Creator membership or higher.");
      return;
    }

    setIsProcessing(true);
    setProcessComplete(false);
    try {
      await updateSceneMutation.mutateAsync({
        id: sceneId,
        vfxSuiteOperations: {
          operations: selectedOps,
          intensity,
          sourcePlateUrl,
          actorReferenceUrl,
          estimatedCredits,
          exportQuality,
          swappys: selectedSwappys ? {
            consentConfirmed,
            hideVisibleWatermark,
            watermarkMode: hideVisibleWatermark ? "studio_hidden_visible_mark_internal_audit" : "visible_ai_altered_mark",
            membershipGate: "creator_or_higher",
            provenanceRequired: true,
          } : null,
        },
        retakeInstructions: buildPrompt(),
      } as any);
      await generateVideoMutation.mutateAsync({ sceneId });
      setProcessComplete(true);
      toast.success(`${selectedOps.length} VFX operation${selectedOps.length > 1 ? "s" : ""} saved and regeneration queued`);
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
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/projects/${projectId}`)} aria-label="Back to project">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold flex items-center gap-2 text-gold-shimmer">
                <Wand2 className="w-5 h-5 text-amber-400" />
                VFX Suite
                <Badge className="bg-amber-500/15 text-amber-300 border border-amber-500/30">Studio</Badge>
              </h1>
              <p className="text-xs text-muted-foreground">
                Swappys digital doubles, compositing, cleanup, restoration, finishing and QC.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {selectedOps.length > 0 && <Button variant="ghost" size="sm" onClick={() => setSelectedOps([])}>Clear All</Button>}
            <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-black" onClick={handleProcess} disabled={isProcessing || selectedOps.length === 0}>
              {isProcessing ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Processing...</> : processComplete ? <><CheckCircle2 className="w-4 h-4 mr-1" /> Queued</> : <><Wand2 className="w-4 h-4 mr-1" /> Apply VFX</>}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-3 md:p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-5">
          <Card className="border-amber-500/20 glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-amber-300"><Sparkles className="w-4 h-4" /> Professional VFX Operations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {Object.entries(VFX_CATEGORIES).map(([category, ops]) => (
                <div key={category}>
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">{category}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {ops.map((op) => {
                      const selected = selectedOps.includes(op);
                      return (
                        <button key={op} onClick={() => toggleOp(op)} className={`text-left p-3 rounded-lg border transition-all flex items-center gap-2 ${selected ? "border-amber-500 bg-amber-500/10" : "border-border/40 bg-black/20 hover:border-amber-500/40"}`}>
                          <span className={selected ? "text-amber-400" : "text-muted-foreground"}>{VFX_ICONS[op] || <Layers className="w-4 h-4" />}</span>
                          <span className="text-xs">{VFX_LABELS[op]}</span>
                          {selected && <CheckCircle2 className="w-3 h-3 text-amber-400 ml-auto flex-shrink-0" />}
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
          <Card className="border-amber-500/20 glass-card gold-glow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm gradient-text-gold">Processing Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between mb-1"><Label className="text-xs text-muted-foreground">Effect Intensity</Label><span className="text-xs text-amber-400">{intensity}%</span></div>
                <Slider value={[intensity]} onValueChange={([v]) => setIntensity(v)} min={10} max={100} step={5} />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Export Quality</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(["preview", "final", "master"] as const).map((q) => (
                    <button key={q} onClick={() => setExportQuality(q)} className={`rounded-md border px-2 py-2 text-xs ${exportQuality === q ? "border-amber-500 bg-amber-500/10 text-amber-300" : "border-border/40 text-muted-foreground"}`}>{q}</button>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground">Estimated cost: {estimatedCredits} credits</p>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Source Plate / Footage Reference</Label>
                <input ref={sourcePlateRef} type="file" accept="image/png,image/jpeg,image/webp,video/mp4,video/quicktime" className="hidden" onChange={(e) => e.target.files?.[0] && uploadReference(e.target.files[0], "source")} />
                <Button variant="outline" className="w-full justify-start text-xs" onClick={() => sourcePlateRef.current?.click()} disabled={uploading === "source"}>
                  {uploading === "source" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : sourcePlateUrl ? <CheckCircle2 className="w-4 h-4 mr-2 text-green-400" /> : <Upload className="w-4 h-4 mr-2" />}
                  {sourcePlateUrl ? "Source plate uploaded" : "Upload source plate"}
                </Button>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Actor Reference / Approved Likeness</Label>
                <input ref={actorRef} type="file" accept="image/png,image/jpeg,image/webp,video/mp4,video/quicktime" className="hidden" onChange={(e) => e.target.files?.[0] && uploadReference(e.target.files[0], "actor")} />
                <Button variant="outline" className="w-full justify-start text-xs" onClick={() => actorRef.current?.click()} disabled={uploading === "actor"}>
                  {uploading === "actor" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : actorReferenceUrl ? <CheckCircle2 className="w-4 h-4 mr-2 text-green-400" /> : <Upload className="w-4 h-4 mr-2" />}
                  {actorReferenceUrl ? "Actor reference uploaded" : "Upload actor reference"}
                </Button>
              </div>

              {selectedSwappys && (
                <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-3 space-y-3">
                  <div className="flex items-start gap-2">
                    <Checkbox checked={consentConfirmed} onCheckedChange={(v) => setConsentConfirmed(Boolean(v))} />
                    <div>
                      <Label className="text-xs text-amber-200">I confirm actor likeness consent / rights clearance.</Label>
                      <p className="text-[11px] text-muted-foreground mt-1">Required for digital-double, stunt, pickup and actor-continuity work.</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <Label className="text-xs text-amber-200">Hide visible watermark</Label>
                      <p className="text-[11px] text-muted-foreground">Creator+ only. Internal audit/provenance remains stored.</p>
                    </div>
                    <Switch checked={hideVisibleWatermark} disabled={!isCreator} onCheckedChange={setHideVisibleWatermark} />
                  </div>
                  {!isCreator && (
                    <div className="flex gap-2 text-[11px] text-amber-200"><AlertTriangle className="w-3 h-3 mt-0.5" /> Upgrade to Virelle Creator for studio watermark controls.</div>
                  )}
                </div>
              )}

              <Separator />

              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Director / VFX Supervisor Notes</Label>
                <Textarea value={retakeInstructions} onChange={(e) => setRetakeInstructions(e.target.value)} placeholder="Describe the exact VFX target: match actor face to stunt plate, remove harness, replace background, restore grain, match lighting, etc." className="text-xs min-h-[120px] resize-none" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-amber-500/20 glass-card">
            <CardHeader className="pb-2"><CardTitle className="text-sm gradient-text-gold">Selected Operations</CardTitle></CardHeader>
            <CardContent>
              {selectedOps.length === 0 ? (
                <p className="text-xs text-muted-foreground">No operations selected.</p>
              ) : (
                <div className="space-y-1">
                  {selectedOps.map((op) => <div key={op} className="flex items-center justify-between gap-2"><span className="text-xs text-amber-400">{VFX_LABELS[op]}</span><button onClick={() => toggleOp(op)}><X className="w-3 h-3 text-muted-foreground hover:text-red-400" /></button></div>)}
                </div>
              )}
              {isIndustry && <Badge className="mt-3 bg-purple-500/15 text-purple-200 border border-purple-400/30">Industry access active</Badge>}
            </CardContent>
          </Card>
        </div>
      </div>
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
