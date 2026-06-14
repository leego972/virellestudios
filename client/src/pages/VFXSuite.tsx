import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, Wand2, Layers, Maximize2, Eraser, Palette,
  Zap, Eye, Upload, Loader2, CheckCircle2, Plus, X,
} from "lucide-react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { VFX_SUITE_OPTIONS, VFX_SUITE_LABELS } from "@shared/types";
import { SubscriptionGate } from "@/components/SubscriptionGate";

const VFX_ICONS: Record<string, React.ReactNode> = {
  "none": <X className="w-4 h-4" />,
  "scene-extension-outpaint": <Maximize2 className="w-4 h-4" />,
  "object-removal-inpaint": <Eraser className="w-4 h-4" />,
  "style-transfer": <Palette className="w-4 h-4" />,
  "face-enhancement": <Eye className="w-4 h-4" />,
  "upscale-4k": <Zap className="w-4 h-4" />,
  "upscale-8k": <Zap className="w-4 h-4" />,
  "denoising-grain-removal": <Wand2 className="w-4 h-4" />,
  "stabilization": <Layers className="w-4 h-4" />,
  "color-match": <Palette className="w-4 h-4" />,
  "motion-blur-add": <Wand2 className="w-4 h-4" />,
  "lens-flare-add": <Zap className="w-4 h-4" />,
  "film-grain-add": <Layers className="w-4 h-4" />,
  "depth-of-field-post": <Eye className="w-4 h-4" />,
  "vignette-add": <Layers className="w-4 h-4" />,
};

const VFX_CATEGORIES: Record<string, string[]> = {
  "Spatial & Composition": ["scene-extension-outpaint", "object-removal-inpaint", "stabilization"],
  "Resolution & Quality": ["upscale-4k", "upscale-8k", "denoising-grain-removal", "face-enhancement"],
  "Style & Color": ["style-transfer", "color-match"],
  "Cinematic Effects": ["motion-blur-add", "lens-flare-add", "film-grain-add", "depth-of-field-post", "vignette-add"],
};

function VFXSuiteInner() {
  const [, navigate] = useLocation();
  const params = useParams<{ projectId: string; sceneId: string }>();
  const projectId = parseInt(params.projectId || "0");
  const sceneId = parseInt(params.sceneId || "0");

  const updateSceneMutation = trpc.scene.update.useMutation();
  const generateVideoMutation = trpc.scene.generateVideo.useMutation();
  const uploadImageMutation = trpc.upload.image.useMutation();
  const uploadRefImageMutation = trpc.upload.referenceImage.useMutation();

  const frameFileRef = useRef<HTMLInputElement>(null);
  const [selectedOps, setSelectedOps] = useState<string[]>([]);
  const [intensity, setIntensity] = useState(75);
  const [retakeInstructions, setRetakeInstructions] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processComplete, setProcessComplete] = useState(false);
  const [uploadedFrameUrl, setUploadedFrameUrl] = useState<string | null>(null);
  const [uploadingFrame, setUploadingFrame] = useState(false);

  const handleFrameUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      toast.error("File too large. Max 20MB.");
      return;
    }
    if (!sceneId) {
      toast.error("No scene found. Navigate here from a specific scene.");
      return;
    }
    setUploadingFrame(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      // Upload as reference image directly attached to the scene
      const result = await uploadRefImageMutation.mutateAsync({
        base64,
        filename: file.name,
        contentType: (file.type as any),
        sceneId,
      });
      setUploadedFrameUrl(result.url);
      toast.success("Source frame uploaded — it will be used as a visual reference for VFX processing");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploadingFrame(false);
      if (frameFileRef.current) frameFileRef.current.value = "";
    }
  };

  const toggleOp = (op: string) => {
    if (op === "none") {
      setSelectedOps([]);
      return;
    }
    setSelectedOps((prev) =>
      prev.includes(op) ? prev.filter((o) => o !== op) : [...prev, op]
    );
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
    setIsProcessing(true);
    setProcessComplete(false);
    try {
      // Persist VFX operations and instructions to the scene record
      const vfxPrompt = retakeInstructions ||
        `Apply post-processing VFX at ${intensity}% intensity: ${selectedOps.map(op => VFX_SUITE_LABELS[op] || op).join(", ")}. Preserve all original scene elements, characters, and composition.`;
      await updateSceneMutation.mutateAsync({
        id: sceneId,
        vfxSuiteOperations: { operations: selectedOps, intensity },
        retakeInstructions: vfxPrompt,
      });
      // Trigger video regeneration with VFX parameters embedded in the prompt
      await generateVideoMutation.mutateAsync({ sceneId });
      setProcessComplete(true);
      toast.success(`${selectedOps.length} VFX operation${selectedOps.length > 1 ? "s" : ""} saved — video regeneration queued`);
    } catch (err: any) {
      toast.error(err?.message || "VFX processing failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background:"linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)" }}>
      <div className="border-b sticky top-0 z-20 px-4 py-3" style={{ borderColor:"rgba(255,255,255,0.07)", background:"rgba(7,7,14,0.97)", backdropFilter:"blur(24px)" }}>
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/projects/${projectId}`)} aria-label="Back to project">
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold flex items-center gap-2 text-gold-shimmer">
                <Wand2 className="w-5 h-5 text-amber-400" />
                VFX Suite
              </h1>
              <p className="text-xs text-muted-foreground">
                {selectedOps.length > 0
                  ? `${selectedOps.length} operation${selectedOps.length > 1 ? "s" : ""} selected`
                  : "Select VFX operations to apply"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {selectedOps.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setSelectedOps([])}>
                Clear All
              </Button>
            )}
            <Button
              size="sm"
              className="bg-amber-500 hover:bg-amber-600 text-black"
              onClick={handleProcess}
              disabled={isProcessing || selectedOps.length === 0}
            >
              {isProcessing ? (
                <><Loader2 className="w-4 h-4 mr-1 animate-spin text-amber-400" /> Processing...</>
              ) : processComplete ? (
                <><CheckCircle2 className="w-4 h-4 mr-1 text-amber-400" /> Done</>
              ) : (
                <><Wand2 className="w-4 h-4 mr-1" /> Apply VFX</>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-3 md:p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* VFX Operations */}
        <div className="col-span-2 space-y-4">
          {Object.entries(VFX_CATEGORIES).map(([category, ops]) => (
            <div key={category}>
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                {category}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {ops.map((op) => (
                  <button
                    key={op}
                    onClick={() => toggleOp(op)}
                    className={`text-left p-3 rounded-lg border transition-all flex items-center gap-2 ${
                      selectedOps.includes(op)
                        ? "border-amber-500 bg-amber-500/10"
                        : "border-border/40 bg-black/20 hover:border-amber-500/40"
                    }`}
                  >
                    <span className={selectedOps.includes(op) ? "text-amber-400" : "text-muted-foreground"}>
                      {VFX_ICONS[op]}
                    </span>
                    <span className="text-xs">{VFX_SUITE_LABELS[op]}</span>
                    {selectedOps.includes(op) && (
                      <CheckCircle2 className="w-3 h-3 text-amber-400 ml-auto flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Settings Panel */}
        <div className="space-y-4">
          <Card className="border-amber-500/20 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow gold-glow">
            <CardHeader className="pb-2 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
              <CardTitle className="text-sm gradient-text-gold glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">Processing Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
              <div>
                <div className="flex justify-between mb-1">
                  <Label className="text-xs text-muted-foreground">Effect Intensity</Label>
                  <span className="text-xs text-amber-400">{intensity}%</span>
                </div>
                <Slider
                  value={[intensity]}
                  onValueChange={([v]) => setIntensity(v)}
                  min={10} max={100} step={5}
                />
              </div>
              <Separator />
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Retake / Edit Instructions</Label>
                <Textarea
                  value={retakeInstructions}
                  onChange={(e) => setRetakeInstructions(e.target.value)}
                  placeholder="Describe what to change in this scene (e.g., 'Remove the lamp in the background', 'Extend the sky upward', 'Add lens flare on the window')..."
                  className="text-xs min-h-[100px] resize-none" autoCapitalize="sentences" autoCorrect="on" enterKeyHint="done" />
              </div>
              <Separator />
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Upload Source Frame</Label>
                <input
                  ref={frameFileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleFrameUpload}
                />
                <button
                  onClick={() => frameFileRef.current?.click()}
                  disabled={uploadingFrame}
                  className="w-full border border-dashed border-amber-500/30 rounded-lg p-4 text-xs text-muted-foreground hover:border-amber-500/60 hover:text-amber-400 transition-colors flex flex-col items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploadingFrame ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
                      <span className="text-amber-400">Uploading...</span>
                    </>
                  ) : uploadedFrameUrl ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                      <span className="text-green-400">Frame uploaded</span>
                      <span className="text-xs opacity-60">Click to replace</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      <span>Click to upload source frame</span>
                      <span className="text-xs opacity-60">PNG, JPG, WebP up to 20MB</span>
                    </>
                  )}
                </button>
              </div>
            </CardContent>
          </Card>

          {selectedOps.length > 0 && (
            <Card className="border-amber-500/20 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
              <CardHeader className="pb-2 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
                <CardTitle className="text-sm gradient-text-gold glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">Selected Operations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {selectedOps.map((op) => (
                    <div key={op} className="flex items-center justify-between">
                      <span className="text-xs text-amber-400">{VFX_SUITE_LABELS[op]}</span>
                      <button onClick={() => toggleOp(op)}>
                        <X className="w-3 h-3 text-muted-foreground hover:text-red-400" />
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VFXSuite() {
  return (
    <SubscriptionGate
      feature="Visual Effects Suite"
      featureKey="canUseVisualEffects"
      requiredTier="independent"
    >
      <VFXSuiteInner />
    </SubscriptionGate>
  );
}
