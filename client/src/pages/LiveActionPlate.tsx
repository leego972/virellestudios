import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, Upload, Film, Layers, Eye, Wand2, Loader2,
  CheckCircle2, Camera, Users, CloudSun, Maximize2,
} from "lucide-react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { LIVE_ACTION_COMPOSITE_OPTIONS, LIVE_ACTION_COMPOSITE_LABELS } from "@shared/types";

const COMPOSITE_ICONS: Record<string, React.ReactNode> = {
  "none": <Film className="w-5 h-5" />,
  "background-replacement": <CloudSun className="w-5 h-5" />,
  "foreground-character-insert": <Users className="w-5 h-5" />,
  "full-scene-composite": <Layers className="w-5 h-5" />,
  "vfx-element-overlay": <Wand2 className="w-5 h-5" />,
  "sky-replacement": <CloudSun className="w-5 h-5" />,
  "crowd-multiplication": <Users className="w-5 h-5" />,
  "environment-extension": <Maximize2 className="w-5 h-5" />,
};

export default function LiveActionPlate() {
  const [, navigate] = useLocation();
  const params = useParams<{ projectId: string; sceneId: string }>();
  const projectId = parseInt(params.projectId || "0");
  const sceneId = parseInt(params.sceneId || "0");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [compositeMode, setCompositeMode] = useState("background-replacement");
  const [blendStrength, setBlendStrength] = useState(85);
  const [colorMatchStrength, setColorMatchStrength] = useState(70);
  const [compositeInstructions, setCompositeInstructions] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processComplete, setProcessComplete] = useState(false);
  const [plateUploaded, setPlateUploaded] = useState(false);
  const [plateUrl, setPlateUrl] = useState("");
  const [uploadingPlate, setUploadingPlate] = useState(false);

  const updateSceneMutation = trpc.scene.update.useMutation();
  const generateVideoMutation = trpc.generation.generateVideo.useMutation();
  const uploadFootageMutation = trpc.upload.footage.useMutation();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 150 * 1024 * 1024) {
      toast.error("File too large. Maximum size is 150MB.");
      return;
    }
    setUploadingPlate(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const result = await uploadFootageMutation.mutateAsync({
        base64,
        filename: file.name,
        contentType: file.type,
        sceneId: sceneId || undefined,
        footageType: "reference",
        label: "Live Action Plate",
      });
      setPlateUrl(result.url);
      setPlateUploaded(true);
      toast.success("Live action plate uploaded successfully");
    } catch (err: any) {
      toast.error(err?.message || "Upload failed. Please try again.");
    } finally {
      setUploadingPlate(false);
    }
  };

  const handleProcess = async () => {
    if (!plateUploaded || !plateUrl) {
      toast.error("Please upload a live action plate first");
      return;
    }
    if (!sceneId) {
      toast.error("No scene found. Navigate here from a specific scene.");
      return;
    }
    setIsProcessing(true);
    setProcessComplete(false);
    try {
      const compositePrompt = compositeInstructions ||
        `${LIVE_ACTION_COMPOSITE_LABELS[compositeMode] || compositeMode} with ${blendStrength}% blend strength and ${colorMatchStrength}% color match. Seamlessly integrate AI-generated content with the live action plate.`;
      await updateSceneMutation.mutateAsync({
        id: sceneId,
        liveActionPlateUrl: plateUrl,
        liveActionCompositeMode: compositeMode,
        retakeInstructions: compositePrompt,
      });
      await generateVideoMutation.mutateAsync({ sceneId });
      setProcessComplete(true);
      toast.success("Live action composite saved — video regeneration queued");
    } catch (err: any) {
      toast.error(err?.message || "Composite generation failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border/40 bg-black/20 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/projects/${projectId}`)}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold flex items-center gap-2">
                <Film className="w-5 h-5 text-amber-400" />
                Live Action Plate Integration
              </h1>
              <p className="text-xs text-muted-foreground">
                Blend AI-generated content with real footage
              </p>
            </div>
          </div>
          <Button
            size="sm"
            className="bg-amber-500 hover:bg-amber-600 text-black"
            onClick={handleProcess}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Compositing...</>
            ) : processComplete ? (
              <><CheckCircle2 className="w-4 h-4 mr-1" /> View Result</>
            ) : (
              <><Layers className="w-4 h-4 mr-1" /> Generate Composite</>
            )}
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-3 md:p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: Upload & Mode */}
        <div className="space-y-4">
          <Card className="border-amber-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Upload className="w-4 h-4 text-amber-400" />
                Upload Live Action Plate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/quicktime,image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleFileSelect}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPlate}
                className={`w-full border border-dashed rounded-lg p-8 text-sm transition-colors flex flex-col items-center gap-2 ${
                  plateUploaded
                    ? "border-green-500/60 bg-green-500/5 text-green-400"
                    : "border-amber-500/30 text-muted-foreground hover:border-amber-500/60 hover:text-amber-400"
                }`}
              >
                {uploadingPlate ? (
                  <>
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <span>Uploading plate...</span>
                  </>
                ) : plateUploaded ? (
                  <>
                    <CheckCircle2 className="w-8 h-8" />
                    <span>Plate uploaded successfully</span>
                    <span className="text-xs opacity-60">Click to replace</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-8 h-8" />
                    <span>Drop video or image file here</span>
                    <span className="text-xs opacity-60">MP4, MOV, PNG, JPG up to 500MB</span>
                  </>
                )}
              </button>
            </CardContent>
          </Card>

          <Card className="border-amber-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Composite Mode</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {LIVE_ACTION_COMPOSITE_OPTIONS.filter((o) => o !== "none").map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setCompositeMode(mode)}
                    className={`w-full text-left p-3 rounded-lg border transition-all flex items-center gap-3 ${
                      compositeMode === mode
                        ? "border-amber-500 bg-amber-500/10"
                        : "border-border/40 bg-black/20 hover:border-amber-500/40"
                    }`}
                  >
                    <span className={compositeMode === mode ? "text-amber-400" : "text-muted-foreground"}>
                      {COMPOSITE_ICONS[mode]}
                    </span>
                    <span className="text-xs">{LIVE_ACTION_COMPOSITE_LABELS[mode]}</span>
                    {compositeMode === mode && (
                      <CheckCircle2 className="w-3 h-3 text-amber-400 ml-auto flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Settings */}
        <div className="space-y-4">
          <Card className="border-amber-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Composite Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <Label className="text-xs text-muted-foreground">Blend Strength</Label>
                  <span className="text-xs text-amber-400">{blendStrength}%</span>
                </div>
                <Slider
                  value={[blendStrength]}
                  onValueChange={([v]) => setBlendStrength(v)}
                  min={10} max={100} step={5}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  How seamlessly the AI content blends with the live plate
                </p>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <Label className="text-xs text-muted-foreground">Color Match Strength</Label>
                  <span className="text-xs text-amber-400">{colorMatchStrength}%</span>
                </div>
                <Slider
                  value={[colorMatchStrength]}
                  onValueChange={([v]) => setColorMatchStrength(v)}
                  min={0} max={100} step={5}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Match AI content color grade to the live footage
                </p>
              </div>
              <Separator />
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Composite Instructions</Label>
                <Textarea
                  value={compositeInstructions}
                  onChange={(e) => setCompositeInstructions(e.target.value)}
                  placeholder="Describe how to blend the AI content with the live footage (e.g., 'Replace the sky with a stormy AI sky', 'Insert the AI character into the left side of frame', 'Extend the background environment beyond the set walls')..."
                  className="text-xs min-h-[120px] resize-none" autoCapitalize="sentences" autoCorrect="on" enterKeyHint="done" />
              </div>
            </CardContent>
          </Card>

          {processComplete && (
            <Card className="border-green-500/40 bg-green-500/5">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-8 h-8 text-green-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-green-400">Composite Complete</p>
                    <p className="text-xs text-muted-foreground">
                      Your live action composite is ready. The output has been saved to your scene.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
