import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Download, FileCode, FileText, Film, Table, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { NextStageCTA } from "@/components/NextStageCTA";
import { SubscriptionGate } from "@/components/SubscriptionGate";

// Map old format keys to new backend format values
const FORMAT_MAP: Record<string, "fcpxml" | "edl" | "csv" | "premiere_xml" | "resolve_xml"> = {
  "xml-premiere-pro": "premiere_xml",
  "xml-final-cut-pro-x": "fcpxml",
  "edl-davinci-resolve": "resolve_xml",
  "aaf-avid-media-composer": "edl",
  "csv-shot-list": "csv",
  "pdf-production-report": "csv",
};

const FORMAT_FILENAMES: Record<string, string> = {
  "xml-premiere-pro": "_premiere.xml",
  "xml-final-cut-pro-x": ".fcpxml",
  "edl-davinci-resolve": ".fcpxml",
  "aaf-avid-media-composer": ".edl",
  "csv-shot-list": "_scenes.csv",
  "pdf-production-report": "_scenes.csv",
};

const FORMAT_ICONS: Record<string, React.ReactNode> = {
  "xml-premiere-pro": <FileCode className="w-5 h-5 text-blue-400" />,
  "xml-final-cut-pro-x": <FileCode className="w-5 h-5 text-zinc-300" />,
  "edl-davinci-resolve": <Film className="w-5 h-5 text-amber-400" />,
  "aaf-avid-media-composer": <Film className="w-5 h-5 text-green-400" />,
  "csv-shot-list": <Table className="w-5 h-5 text-emerald-400" />,
  "pdf-production-report": <FileText className="w-5 h-5 text-red-400" />,
};

const NLE_EXPORT_OPTIONS = Object.keys(FORMAT_MAP);
const NLE_EXPORT_LABELS: Record<string, string> = {
  "xml-premiere-pro": "Adobe Premiere Pro (XML)",
  "xml-final-cut-pro-x": "Final Cut Pro X (FCPXML)",
  "edl-davinci-resolve": "DaVinci Resolve (EDL)",
  "aaf-avid-media-composer": "Avid Media Composer (AAF)",
  "csv-shot-list": "Shot List (CSV)",
  "pdf-production-report": "Production Report (PDF)",
};

const FORMAT_DESCRIPTIONS: Record<string, string> = {
  "xml-premiere-pro": "Import your entire project timeline directly into Adobe Premiere Pro. Includes all scene metadata, cuts, and transitions.",
  "xml-final-cut-pro-x": "FCPXML format compatible with Final Cut Pro X and later. Preserves timeline structure, clips, and markers.",
  "edl-davinci-resolve": "Edit Decision List format for DaVinci Resolve. Standard EDL with timecode, transitions, and clip references.",
  "aaf-avid-media-composer": "Advanced Authoring Format for Avid Media Composer. Full metadata transfer including effects and audio.",
  "csv-shot-list": "Spreadsheet-compatible CSV with all shot data: scene number, description, camera settings, duration, and status.",
  "pdf-production-report": "Comprehensive production report PDF including script breakdown, shot list, budget estimate, and character notes.",
};

function NLEExportInner() {
  const [, navigate] = useLocation();
  const params = useParams<{ projectId: string }>();
  const projectId = parseInt(params.projectId || "0");

  const [selectedFormat, setSelectedFormat] = useState("xml-premiere-pro");
  // v6.62 Ã¢ÂÂ Aspect ratio preset. Embeds matching frame dimensions in the
  // exported sequence header (FCPXML/Premiere XML) and adds metadata for EDL/CSV.
  // Initial value is 16:9 but we hydrate from the project's sticky preference
  // (project.exportAspectRatio) once loaded Ã¢ÂÂ see useEffect below.
  type AspectRatioValue = "16:9" | "9:16" | "1:1" | "4:5" | "21:9" | "2.39:1";
  const [aspectRatio, setAspectRatio] = useState<AspectRatioValue>("16:9");
  // Track whether the user has touched the chooser this session Ã¢ÂÂ once they
  // have, we stop overwriting their choice with the project's stored value.
  const [aspectTouched, setAspectTouched] = useState(false);
  const [includeOptions, setIncludeOptions] = useState({
    sceneMetadata: true,
    cameraSettings: true,
    characterNotes: true,
    dialogueLines: true,
    soundtrackRefs: true,
    vfxNotes: true,
    budgetData: false,
    productionNotes: true,
  });
  const [isExporting, setIsExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);

  const { data: project } = trpc.project.get.useQuery({ id: projectId }, { enabled: !!projectId });
  const exportNLEMutation = trpc.movie.exportNLE.useMutation();

  // Hydrate aspect ratio from the project's sticky preference once the project
  // loads, but never override an explicit user selection in this session.
  useEffect(() => {
    if (aspectTouched) return;
    const stored = (project as any)?.exportAspectRatio as AspectRatioValue | undefined;
    if (stored && stored !== aspectRatio && ["16:9","9:16","1:1","4:5","21:9","2.39:1"].includes(stored)) {
      setAspectRatio(stored);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project, aspectTouched]);

  const handleExport = async () => {
    const backendFormat = FORMAT_MAP[selectedFormat];
    if (!backendFormat) return;
    setIsExporting(true);
    setExportComplete(false);
    try {
      const result = await exportNLEMutation.mutateAsync({
        projectId,
        format: backendFormat,
        aspectRatio,
        includeOptions: {
          videoClips: includeOptions.sceneMetadata,
          audioTracks: includeOptions.soundtrackRefs,
          subtitles: false,
          markers: includeOptions.productionNotes,
          colorMetadata: includeOptions.cameraSettings,
        },
      });
      // Decode base64 and trigger browser file download
      const bytes = Uint8Array.from(atob(result.base64), c => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: result.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setExportComplete(true);
      toast.success(`Export downloaded Ã¢ÂÂ ${result.sceneCount} scene${result.sceneCount !== 1 ? "s" : ""} included`);
    } catch (err: any) {
      toast.error(err?.message || "Export failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const toggleOption = (key: keyof typeof includeOptions) => {
    setIncludeOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="min-h-screen" style={{ background:"linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)" }}>
      <div className="border-b sticky top-0 z-20" style={{ borderColor:"rgba(255,255,255,0.07)", background:"rgba(7,7,14,0.97)", backdropFilter:"blur(24px)" }}>
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(`/projects/${projectId}`)} className="gap-2 text-muted-foreground h-8"><ArrowLeft className="h-4 w-4" />Back</Button>
            <div>
              <div className="h-5 w-px bg-border/40 ml-1" />
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0" style={{ background:"linear-gradient(135deg,#D4AF37,#b8960c)" }}><Download className="text-black" style={{ width:18, height:18 }} /></div>
                <div><div className="font-bold text-sm">NLE Export</div><div className="text-[10px] text-muted-foreground">Export to Premiere Pro, Final Cut, DaVinci Resolve &amp; more</div></div>
              </div>
            </div>
          </div>
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5" style={{ background:"linear-gradient(135deg,#D4AF37,#b8960c)", color:"#000" }}
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin text-amber-400" />ExportingÃ¢ÂÂ¦</>
            ) : exportComplete ? (
              <><CheckCircle2 className="h-3.5 w-3.5" />Download</>
            ) : (
              <><Download className="h-3.5 w-3.5" />Export</>
            )}
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Format Selection */}
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-3">Select Export Format</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {NLE_EXPORT_OPTIONS.map((format) => (
              <button
                key={format}
                onClick={() => setSelectedFormat(format)}
                className="text-left rounded-xl border transition-all p-3.5" style={{ borderColor: selectedFormat===format ? "rgba(212,175,55,0.4)" : "rgba(255,255,255,0.07)", background: selectedFormat===format ? "rgba(212,175,55,0.06)" : "rgba(255,255,255,0.02)" }} data-dummy={"
                  selectedFormat === format
                    ? "border-amber-500 bg-amber-500/10"
                    : "border-border/40 bg-black/20 hover:border-amber-500/40"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {FORMAT_ICONS[format]}
                  <span className="text-sm font-medium">{NLE_EXPORT_LABELS[format]}</span>
                  {selectedFormat === format && (
                    <Badge className="ml-auto bg-amber-500 text-black text-xs h-4">Selected</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {FORMAT_DESCRIPTIONS[format]}
                </p>
              </button>
            ))}
          </div>
        </div>

        <Separator />

        {/* v6.62 Ã¢ÂÂ Aspect ratio presets */}
        <div>
          <h2 className="text-sm font-medium mb-3 gradient-text-gold">Aspect Ratio</h2>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {([
              { value: "16:9",   label: "16:9",   sub: "Widescreen", w: 1920, h: 1080, ar: 16/9 },
              { value: "9:16",   label: "9:16",   sub: "Vertical",   w: 1080, h: 1920, ar: 9/16 },
              { value: "1:1",    label: "1:1",    sub: "Square",     w: 1080, h: 1080, ar: 1 },
              { value: "4:5",    label: "4:5",    sub: "Portrait",   w: 1080, h: 1350, ar: 4/5 },
              { value: "21:9",   label: "21:9",   sub: "Ultrawide",  w: 2560, h: 1080, ar: 21/9 },
              { value: "2.39:1", label: "2.39:1", sub: "Anamorphic", w: 2048, h: 858,  ar: 2.39 },
            ] as const).map((opt) => {
              const active = aspectRatio === opt.value;
              const previewH = 32;
              const previewW = Math.max(18, Math.min(64, Math.round(previewH * opt.ar)));
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { setAspectRatio(opt.value); setAspectTouched(true); }}
                  className={`flex flex-col items-center gap-1 px-2 py-3 rounded-lg border transition-all ${
                    active
                      ? "border-amber-500 bg-amber-500/10"
                      : "border-border/40 bg-black/20 hover:border-amber-500/40"
                  }`}
                  aria-pressed={active}
                  aria-label={`${opt.label} ${opt.sub} ${opt.w}x${opt.h}`}
                >
                  <div
                    className={`rounded-sm ${active ? "bg-amber-500" : "bg-white/30"}`}
                    style={{ width: previewW, height: previewH }}
                  />
                  <div className="text-xs font-medium leading-none">{opt.label}</div>
                  <div className="text-[10px] text-muted-foreground leading-none">{opt.sub}</div>
                  <div className="text-[10px] font-mono text-muted-foreground/60 leading-none">{opt.w}x{opt.h}</div>
                </button>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* Export Options */}
        <div>
          <h2 className="text-sm font-medium mb-3 gradient-text-gold">Include in Export</h2>
          <Card className="border-amber-500/20 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
            <CardContent className="pt-4 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(includeOptions).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2">
                    <Checkbox
                      id={key}
                      checked={value}
                      onCheckedChange={() => toggleOption(key as keyof typeof includeOptions)}
                    />
                    <Label htmlFor={key} className="text-sm cursor-pointer">
                      {key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}
                    </Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Export Preview */}
        {exportComplete && (
          <Card className="border-green-500/40 bg-green-500/5 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
            <CardContent className="pt-4 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-8 h-8 text-green-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-green-400">Export Ready</p>
                  <p className="text-xs text-muted-foreground">
                    Your {NLE_EXPORT_LABELS[selectedFormat]} is ready for download. Click the Download button above to save it.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      {!!projectId && <NextStageCTA projectId={projectId} currentStage={7} />}
    </div>
  );
}

export default function NLEExport() {
  return (
    <SubscriptionGate
      feature="NLE Export"
      featureKey="canUseNLEExport"
      requiredTier="independent"
    >
      <NLEExportInner />
    </SubscriptionGate>
  );
}
