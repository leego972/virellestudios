import { useState } from "react";
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
  "xml-final-cut-pro-x": <FileCode className="w-5 h-5 text-gray-300" />,
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

export default function NLEExport() {
  const [, navigate] = useLocation();
  const params = useParams<{ projectId: string }>();
  const projectId = parseInt(params.projectId || "0");

  const [selectedFormat, setSelectedFormat] = useState("xml-premiere-pro");
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

  const handleExport = async () => {
    const backendFormat = FORMAT_MAP[selectedFormat];
    if (!backendFormat) return;
    setIsExporting(true);
    setExportComplete(false);
    try {
      const result = await exportNLEMutation.mutateAsync({
        projectId,
        format: backendFormat,
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
      toast.success(`Export downloaded — ${result.sceneCount} scene${result.sceneCount !== 1 ? "s" : ""} included`);
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
    <div className="min-h-screen bg-background">
      <div className="border-b border-border/40 bg-black/20 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/projects/${projectId}`)}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold flex items-center gap-2">
                <Download className="w-5 h-5 text-amber-400" />
                NLE Export
              </h1>
              <p className="text-xs text-muted-foreground">
                Export your project to professional editing software
              </p>
            </div>
          </div>
          <Button
            size="sm"
            className="bg-amber-500 hover:bg-amber-600 text-black"
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? (
              <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Exporting...</>
            ) : exportComplete ? (
              <><CheckCircle2 className="w-4 h-4 mr-1" /> Download</>
            ) : (
              <><Download className="w-4 h-4 mr-1" /> Export</>
            )}
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Format Selection */}
        <div>
          <h2 className="text-sm font-medium mb-3">Select Export Format</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {NLE_EXPORT_OPTIONS.map((format) => (
              <button
                key={format}
                onClick={() => setSelectedFormat(format)}
                className={`text-left p-4 rounded-lg border transition-all ${
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

        {/* Export Options */}
        <div>
          <h2 className="text-sm font-medium mb-3">Include in Export</h2>
          <Card className="border-amber-500/20">
            <CardContent className="pt-4">
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
          <Card className="border-green-500/40 bg-green-500/5">
            <CardContent className="pt-4">
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
    </div>
  );
}
