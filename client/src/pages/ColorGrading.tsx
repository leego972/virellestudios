import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useParams, useLocation } from "wouter";
import { Loader2, ArrowLeft, Palette, Check } from "lucide-react";
import { useState, useEffect } from "react";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";

const COLOR_PRESETS = [
  { name: "natural", label: "Natural", desc: "True-to-life colors", gradient: "from-green-400 to-blue-400", settings: { temperature: 50, tint: 50, contrast: 50, saturation: 50, highlights: 50, shadows: 50, vibrance: 50, clarity: 50 } },
  { name: "warm-vintage", label: "Warm Vintage", desc: "Golden warm tones, nostalgic", gradient: "from-amber-400 to-orange-500", settings: { temperature: 70, tint: 55, contrast: 45, saturation: 40, highlights: 55, shadows: 40, vibrance: 35, clarity: 45 } },
  { name: "cold-thriller", label: "Cold Thriller", desc: "Blue-teal desaturated", gradient: "from-blue-500 to-cyan-600", settings: { temperature: 30, tint: 45, contrast: 65, saturation: 35, highlights: 40, shadows: 60, vibrance: 30, clarity: 60 } },
  { name: "neon-cyberpunk", label: "Neon Cyberpunk", desc: "High contrast neon glow", gradient: "from-pink-500 to-purple-600", settings: { temperature: 45, tint: 60, contrast: 75, saturation: 80, highlights: 65, shadows: 70, vibrance: 85, clarity: 70 } },
  { name: "bleach-bypass", label: "Bleach Bypass", desc: "Desaturated, high contrast", gradient: "from-gray-400 to-gray-600", settings: { temperature: 48, tint: 50, contrast: 70, saturation: 25, highlights: 60, shadows: 55, vibrance: 20, clarity: 65 } },
  { name: "golden-hour", label: "Golden Hour", desc: "Warm sunset glow", gradient: "from-yellow-400 to-red-400", settings: { temperature: 75, tint: 55, contrast: 45, saturation: 60, highlights: 65, shadows: 35, vibrance: 55, clarity: 40 } },
  { name: "noir", label: "Film Noir", desc: "High contrast B&W feel", gradient: "from-gray-800 to-gray-400", settings: { temperature: 45, tint: 50, contrast: 80, saturation: 10, highlights: 70, shadows: 75, vibrance: 5, clarity: 75 } },
  { name: "tropical", label: "Tropical", desc: "Vibrant greens and blues", gradient: "from-emerald-400 to-teal-500", settings: { temperature: 55, tint: 45, contrast: 50, saturation: 70, highlights: 55, shadows: 40, vibrance: 75, clarity: 50 } },
  { name: "horror", label: "Horror", desc: "Dark, desaturated, green tint", gradient: "from-green-800 to-gray-900", settings: { temperature: 40, tint: 40, contrast: 70, saturation: 20, highlights: 30, shadows: 80, vibrance: 15, clarity: 60 } },
  { name: "romantic", label: "Romantic", desc: "Soft pink warmth", gradient: "from-pink-300 to-rose-400", settings: { temperature: 60, tint: 60, contrast: 35, saturation: 55, highlights: 60, shadows: 30, vibrance: 50, clarity: 30 } },
  { name: "sci-fi", label: "Sci-Fi", desc: "Cool blue-purple futuristic", gradient: "from-indigo-500 to-violet-600", settings: { temperature: 35, tint: 55, contrast: 60, saturation: 55, highlights: 50, shadows: 65, vibrance: 60, clarity: 55 } },
  { name: "western", label: "Western", desc: "Dusty warm sepia", gradient: "from-amber-600 to-yellow-700", settings: { temperature: 68, tint: 52, contrast: 55, saturation: 35, highlights: 50, shadows: 45, vibrance: 30, clarity: 50 } },
];

type Settings = {
  temperature: number;
  tint: number;
  contrast: number;
  saturation: number;
  highlights: number;
  shadows: number;
  vibrance: number;
  clarity: number;
};

export default function ColorGrading() {
  const { user, loading: authLoading } = useAuth();
  const params = useParams<{ projectId: string }>();
  const [, navigate] = useLocation();
  const projectId = Number(params.projectId);
  const utils = trpc.useUtils();

  const [selectedPreset, setSelectedPreset] = useState("natural");
  const [settings, setSettings] = useState<Settings>({
    temperature: 50, tint: 50, contrast: 50, saturation: 50,
    highlights: 50, shadows: 50, vibrance: 50, clarity: 50,
  });

  const { data: project, isLoading: projectLoading } = trpc.project.get.useQuery(
    { id: projectId },
    { enabled: !!user && !!projectId }
  );

  const updateProject = trpc.project.update.useMutation({
    onSuccess: () => {
      utils.project.get.invalidate({ id: projectId });
      toast.success("Color grading saved");
    },
  });

  // Load existing settings from project
  useEffect(() => {
    if (project) {
      if (project.colorGrading) setSelectedPreset(project.colorGrading);
      if (project.colorGradingSettings) {
        setSettings(project.colorGradingSettings as Settings);
      } else {
        const preset = COLOR_PRESETS.find(p => p.name === project.colorGrading);
        if (preset) setSettings(preset.settings);
      }
    }
  }, [project]);

  if (authLoading || projectLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    window.location.href = getLoginUrl();
    return null;
  }

  const handlePresetSelect = (preset: typeof COLOR_PRESETS[0]) => {
    setSelectedPreset(preset.name);
    setSettings(preset.settings);
  };

  const handleSave = () => {
    updateProject.mutate({
      id: projectId,
      colorGrading: selectedPreset,
    });
  };

  const SLIDERS: { key: keyof Settings; label: string; leftLabel: string; rightLabel: string }[] = [
    { key: "temperature", label: "Temperature", leftLabel: "Cool", rightLabel: "Warm" },
    { key: "tint", label: "Tint", leftLabel: "Green", rightLabel: "Magenta" },
    { key: "contrast", label: "Contrast", leftLabel: "Flat", rightLabel: "Punchy" },
    { key: "saturation", label: "Saturation", leftLabel: "Muted", rightLabel: "Vivid" },
    { key: "highlights", label: "Highlights", leftLabel: "Dark", rightLabel: "Bright" },
    { key: "shadows", label: "Shadows", leftLabel: "Light", rightLabel: "Deep" },
    { key: "vibrance", label: "Vibrance", leftLabel: "Subtle", rightLabel: "Intense" },
    { key: "clarity", label: "Clarity", leftLabel: "Soft", rightLabel: "Sharp" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/project/${projectId}`)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">{project?.title} — Color Grading</h1>
              <p className="text-xs text-muted-foreground">Set the cinematic look for your film</p>
            </div>
          </div>
          <Button size="sm" onClick={handleSave} disabled={updateProject.isPending}>
            {updateProject.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}
            Save
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">
        {/* Presets Grid */}
        <div>
          <h2 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Palette className="h-4 w-4 text-primary" />
            Color Presets
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {COLOR_PRESETS.map(preset => (
              <Card
                key={preset.name}
                className={`cursor-pointer transition-all hover:ring-1 hover:ring-primary/30 ${
                  selectedPreset === preset.name ? "ring-2 ring-primary" : ""
                }`}
                onClick={() => handlePresetSelect(preset)}
              >
                <CardContent className="p-3 text-center">
                  <div className={`h-12 rounded-md bg-gradient-to-br ${preset.gradient} mb-2`} />
                  <p className="text-xs font-medium">{preset.label}</p>
                  <p className="text-[10px] text-muted-foreground">{preset.desc}</p>
                  {selectedPreset === preset.name && (
                    <Badge className="mt-1 text-[10px] px-1.5 py-0">Active</Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Fine-tune Sliders */}
        <div>
          <h2 className="text-sm font-medium mb-3">Fine-tune Adjustments</h2>
          <Card>
            <CardContent className="p-4 space-y-5">
              {SLIDERS.map(slider => (
                <div key={slider.key} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">{slider.label}</Label>
                    <span className="text-[10px] text-muted-foreground font-mono">{settings[slider.key]}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground w-10 text-right">{slider.leftLabel}</span>
                    <Slider
                      value={[settings[slider.key]]}
                      min={0}
                      max={100}
                      step={1}
                      onValueChange={([val]) => {
                        setSettings(prev => ({ ...prev, [slider.key]: val }));
                        setSelectedPreset("custom");
                      }}
                      className="flex-1"
                    />
                    <span className="text-[10px] text-muted-foreground w-10">{slider.rightLabel}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Preview Strip */}
        <div>
          <h2 className="text-sm font-medium mb-3">Preview</h2>
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div
                className="h-40 bg-gradient-to-r from-gray-900 via-gray-700 to-gray-500 relative"
                style={{
                  filter: `
                    contrast(${0.5 + settings.contrast / 100})
                    saturate(${settings.saturation / 50})
                    brightness(${0.7 + settings.highlights / 150})
                    hue-rotate(${(settings.temperature - 50) * 1.5}deg)
                  `,
                }}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-white text-lg font-light tracking-widest opacity-60">
                    {COLOR_PRESETS.find(p => p.name === selectedPreset)?.label || "Custom"} Look
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
