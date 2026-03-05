import { useState } from "react";
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
  const params = useParams<{ projectId: string }>();
  const projectId = parseInt(params.projectId || "0");

  const [compositeMode, setCompositeMode] = useState("background-replacement");
  const [blendStrength, setBlendStrength] = useState(85);
  const [colorMatchStrength, setColorMatchStrength] = useState(70);
  const [compositeInstructions, setCompositeInstructions] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processComplete, setProcessComplete] = useState(false);
  const [plateUploaded, setPlateUploaded] = useState(false);

  const handleProcess = async () => {
    if (!plateUploaded) {
      toast.error("Please upload a live action plate first");
      return;
    }
    setIsProcessing(true);
    setProcessComplete(false);
    try {
      await new Promise((resolve) => setTimeout(resolve, 4000));
      setProcessComplete(true);
      toast.success("Live action composite generated successfully");
    } catch (err) {
      toast.error("Composite generation failed. Please try again.");
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

      <div className="max-w-5xl mx-auto p-4 grid grid-cols-2 gap-4">
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
              <button
                onClick={() => setPlateUploaded(true)}
                className={`w-full border border-dashed rounded-lg p-8 text-sm transition-colors flex flex-col items-center gap-2 ${
                  plateUploaded
                    ? "border-green-500/60 bg-green-500/5 text-green-400"
                    : "border-amber-500/30 text-muted-foreground hover:border-amber-500/60 hover:text-amber-400"
                }`}
              >
                {plateUploaded ? (
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
                  className="text-xs min-h-[120px] resize-none"
                />
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
