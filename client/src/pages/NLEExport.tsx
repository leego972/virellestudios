import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Download,
  FileCode,
  Film,
  Loader2,
  Table,
} from "lucide-react";
import { NextStageCTA } from "@/components/NextStageCTA";
import { SubscriptionGate } from "@/components/SubscriptionGate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";

type ExportFormat = "premiere_xml" | "fcpxml" | "edl" | "csv";
type AspectRatioValue = "16:9" | "9:16" | "1:1" | "4:5" | "21:9" | "2.39:1";
type FrameRate = 24 | 25 | 30;

type CutScene = {
  id: number;
  sceneId: number;
  orderIndex: number;
  isIncluded: boolean;
  trimIn: number | null;
  trimOut: number | null;
  transitionType: string | null;
  transitionDuration: number | null;
  directorNote: string | null;
  scene: {
    id: number;
    title: string | null;
    description: string | null;
    duration: number | null;
    videoUrl: string | null;
    thumbnailUrl: string | null;
    cameraAngle?: string | null;
    cameraMovement?: string | null;
    lensType?: string | null;
    focalLength?: string | null;
    productionNotes?: string | null;
    dialogueText?: string | null;
  } | null;
};

type TimelineClip = {
  index: number;
  cutSceneId: number;
  sceneId: number;
  name: string;
  description: string;
  sourceUrl: string;
  hasMedia: boolean;
  sourceInSeconds: number;
  sourceOutSeconds: number;
  durationSeconds: number;
  recordInSeconds: number;
  recordOutSeconds: number;
  transitionType: string;
  transitionDurationSeconds: number;
  directorNote: string;
  camera: string;
  dialogue: string;
};

const ASPECTS: Record<AspectRatioValue, { width: number; height: number; label: string }> = {
  "16:9": { width: 1920, height: 1080, label: "Widescreen" },
  "9:16": { width: 1080, height: 1920, label: "Vertical" },
  "1:1": { width: 1080, height: 1080, label: "Square" },
  "4:5": { width: 1080, height: 1350, label: "Portrait" },
  "21:9": { width: 2560, height: 1080, label: "Ultrawide" },
  "2.39:1": { width: 2048, height: 858, label: "Anamorphic" },
};

const FORMAT_OPTIONS: Array<{
  value: ExportFormat;
  label: string;
  description: string;
  icon: ReactNode;
}> = [
  {
    value: "premiere_xml",
    label: "Adobe Premiere Pro XML",
    description: "XMEML sequence with source clips, trims, record timing, notes, and transitions.",
    icon: <FileCode className="h-5 w-5 text-blue-400" />,
  },
  {
    value: "fcpxml",
    label: "Final Cut Pro FCPXML",
    description: "FCPXML 1.10 library containing the selected cut and linked source assets.",
    icon: <FileCode className="h-5 w-5 text-zinc-200" />,
  },
  {
    value: "edl",
    label: "DaVinci Resolve CMX3600 EDL",
    description: "Industry-standard video edit decision list with source and record timecodes.",
    icon: <Film className="h-5 w-5 text-amber-400" />,
  },
  {
    value: "csv",
    label: "Timeline / Shot List CSV",
    description: "Spreadsheet-ready clip, trim, transition, timing, camera, and note data.",
    icon: <Table className="h-5 w-5 text-emerald-400" />,
  },
];

function safeFilename(value: string): string {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9-_]+/g, "_")
    .replace(/^_+|_+$/g, "") || "virelle_timeline";
}

function xmlEscape(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function csvEscape(value: unknown): string {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function secondsToFrames(seconds: number, frameRate: FrameRate): number {
  return Math.max(0, Math.round(seconds * frameRate));
}

function framesToTimecode(frames: number, frameRate: FrameRate): string {
  const safeFrames = Math.max(0, Math.round(frames));
  const framesPerHour = frameRate * 60 * 60;
  const framesPerMinute = frameRate * 60;
  const hours = Math.floor(safeFrames / framesPerHour);
  const afterHours = safeFrames % framesPerHour;
  const minutes = Math.floor(afterHours / framesPerMinute);
  const afterMinutes = afterHours % framesPerMinute;
  const seconds = Math.floor(afterMinutes / frameRate);
  const frame = afterMinutes % frameRate;
  return [hours, minutes, seconds, frame]
    .map(value => String(value).padStart(2, "0"))
    .join(":");
}

function transitionCode(value: string): string {
  const normalised = value.toLowerCase();
  if (normalised.includes("dissolve") || normalised.includes("fade")) return "D";
  if (normalised.includes("wipe")) return "W001";
  return "C";
}

function buildTimeline(cutScenes: CutScene[]): TimelineClip[] {
  let cursor = 0;
  return [...cutScenes]
    .filter(cutScene => cutScene.isIncluded && cutScene.scene)
    .sort((left, right) => left.orderIndex - right.orderIndex)
    .map((cutScene, index) => {
      const scene = cutScene.scene!;
      const rawDuration = Math.max(0, Number(scene.duration || 0));
      const trimIn = Math.max(0, Number(cutScene.trimIn || 0));
      const trimOut = Math.max(0, Number(cutScene.trimOut || 0));
      const duration = Math.max(0, rawDuration - trimIn - trimOut);
      const clip: TimelineClip = {
        index: index + 1,
        cutSceneId: cutScene.id,
        sceneId: cutScene.sceneId,
        name: scene.title || `Scene ${index + 1}`,
        description: scene.description || "",
        sourceUrl: scene.videoUrl || `file:///OFFLINE_MEDIA/scene_${cutScene.sceneId}.mp4`,
        hasMedia: !!scene.videoUrl,
        sourceInSeconds: trimIn,
        sourceOutSeconds: trimIn + duration,
        durationSeconds: duration,
        recordInSeconds: cursor,
        recordOutSeconds: cursor + duration,
        transitionType: cutScene.transitionType || "cut",
        transitionDurationSeconds: Math.max(0, Number(cutScene.transitionDuration || 0)),
        directorNote: cutScene.directorNote || scene.productionNotes || "",
        camera: [scene.cameraAngle, scene.cameraMovement, scene.lensType, scene.focalLength]
          .filter(Boolean)
          .join(" / "),
        dialogue: scene.dialogueText || "",
      };
      cursor += duration;
      return clip;
    });
}

function buildEdl(title: string, clips: TimelineClip[], frameRate: FrameRate): string {
  const recordStartFrames = 60 * 60 * frameRate;
  const lines = [`TITLE: ${title}`, "FCM: NON-DROP FRAME", ""];

  clips.forEach(clip => {
    const event = String(clip.index).padStart(3, "0");
    const reel = `SC${String(clip.sceneId).padStart(6, "0")}`.slice(-8);
    const sourceIn = framesToTimecode(secondsToFrames(clip.sourceInSeconds, frameRate), frameRate);
    const sourceOut = framesToTimecode(secondsToFrames(clip.sourceOutSeconds, frameRate), frameRate);
    const recordIn = framesToTimecode(recordStartFrames + secondsToFrames(clip.recordInSeconds, frameRate), frameRate);
    const recordOut = framesToTimecode(recordStartFrames + secondsToFrames(clip.recordOutSeconds, frameRate), frameRate);
    const code = transitionCode(clip.transitionType);
    const transitionFrames = secondsToFrames(clip.transitionDurationSeconds, frameRate);
    lines.push(
      `${event}  ${reel.padEnd(8, " ")} V     ${code.padEnd(4, " ")}${code === "C" ? "" : String(transitionFrames).padStart(3, "0")} ${sourceIn} ${sourceOut} ${recordIn} ${recordOut}`,
    );
    lines.push(`* FROM CLIP NAME: ${clip.name}`);
    lines.push(`* SOURCE FILE: ${clip.sourceUrl}`);
    if (clip.directorNote) lines.push(`* COMMENT: ${clip.directorNote.replace(/[\r\n]+/g, " ")}`);
    if (!clip.hasMedia) lines.push("* WARNING: OFFLINE MEDIA PLACEHOLDER");
    lines.push("");
  });

  return lines.join("\n");
}

function buildPremiereXml(
  title: string,
  clips: TimelineClip[],
  frameRate: FrameRate,
  width: number,
  height: number,
  includeNotes: boolean,
): string {
  const totalFrames = clips.reduce(
    (sum, clip) => sum + secondsToFrames(clip.durationSeconds, frameRate),
    0,
  );

  const clipItems = clips
    .map((clip, index) => {
      const start = secondsToFrames(clip.recordInSeconds, frameRate);
      const end = secondsToFrames(clip.recordOutSeconds, frameRate);
      const duration = secondsToFrames(clip.durationSeconds, frameRate);
      const inFrames = secondsToFrames(clip.sourceInSeconds, frameRate);
      const outFrames = secondsToFrames(clip.sourceOutSeconds, frameRate);
      return `
          <clipitem id="clipitem-${index + 1}">
            <name>${xmlEscape(clip.name)}</name>
            <enabled>TRUE</enabled>
            <duration>${duration}</duration>
            <rate><timebase>${frameRate}</timebase><ntsc>FALSE</ntsc></rate>
            <start>${start}</start>
            <end>${end}</end>
            <in>${inFrames}</in>
            <out>${outFrames}</out>
            <file id="file-${index + 1}">
              <name>${xmlEscape(clip.name)}.mp4</name>
              <pathurl>${xmlEscape(clip.sourceUrl)}</pathurl>
              <rate><timebase>${frameRate}</timebase><ntsc>FALSE</ntsc></rate>
              <duration>${Math.max(outFrames, duration)}</duration>
              <media><video><samplecharacteristics>
                <width>${width}</width><height>${height}</height>
              </samplecharacteristics></video></media>
            </file>
            ${includeNotes && clip.directorNote ? `<comments>${xmlEscape(clip.directorNote)}</comments>` : ""}
            <labels><label2>${clip.hasMedia ? "Forest" : "Rose"}</label2></labels>
          </clipitem>`;
    })
    .join("");

  const transitions = clips
    .slice(1)
    .filter(clip => transitionCode(clip.transitionType) !== "C")
    .map((clip, index) => {
      const center = secondsToFrames(clip.recordInSeconds, frameRate);
      const duration = Math.max(1, secondsToFrames(clip.transitionDurationSeconds, frameRate));
      const start = Math.max(0, center - Math.floor(duration / 2));
      const end = center + Math.ceil(duration / 2);
      return `
          <transitionitem id="transition-${index + 1}">
            <start>${start}</start><end>${end}</end><alignment>center</alignment>
            <effect><name>${xmlEscape(clip.transitionType)}</name><effectid>Cross Dissolve</effectid><effectcategory>Dissolve</effectcategory><effecttype>transition</effecttype><mediatype>video</mediatype></effect>
          </transitionitem>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE xmeml>
<xmeml version="5">
  <sequence id="sequence-1">
    <name>${xmlEscape(title)}</name>
    <duration>${totalFrames}</duration>
    <rate><timebase>${frameRate}</timebase><ntsc>FALSE</ntsc></rate>
    <timecode><rate><timebase>${frameRate}</timebase><ntsc>FALSE</ntsc></rate><string>01:00:00:00</string><frame>${60 * 60 * frameRate}</frame><displayformat>NDF</displayformat></timecode>
    <media>
      <video>
        <format><samplecharacteristics><rate><timebase>${frameRate}</timebase><ntsc>FALSE</ntsc></rate><width>${width}</width><height>${height}</height><anamorphic>FALSE</anamorphic><pixelaspectratio>square</pixelaspectratio></samplecharacteristics></format>
        <track>${clipItems}${transitions}
          <enabled>TRUE</enabled><locked>FALSE</locked>
        </track>
      </video>
    </media>
  </sequence>
</xmeml>`;
}

function buildFcpxml(
  title: string,
  clips: TimelineClip[],
  frameRate: FrameRate,
  width: number,
  height: number,
  includeNotes: boolean,
): string {
  const totalFrames = clips.reduce(
    (sum, clip) => sum + secondsToFrames(clip.durationSeconds, frameRate),
    0,
  );
  const secondsFraction = (frames: number) => `${Math.max(0, frames)}/${frameRate}s`;

  const resources = clips
    .map(
      (clip, index) =>
        `<asset id="r${index + 2}" name="${xmlEscape(clip.name)}" src="${xmlEscape(clip.sourceUrl)}" start="0s" duration="${secondsFraction(
          Math.max(
            secondsToFrames(clip.sourceOutSeconds, frameRate),
            secondsToFrames(clip.durationSeconds, frameRate),
          ),
        )}" hasVideo="1" format="r1"/>`,
    )
    .join("\n    ");

  const spine = clips
    .map((clip, index) => {
      const offset = secondsFraction(
        secondsToFrames(clip.recordInSeconds, frameRate) + 60 * 60 * frameRate,
      );
      const start = secondsFraction(secondsToFrames(clip.sourceInSeconds, frameRate));
      const duration = secondsFraction(secondsToFrames(clip.durationSeconds, frameRate));
      const marker =
        includeNotes && clip.directorNote
          ? `<marker start="0s" value="${xmlEscape(clip.directorNote)}"/>`
          : "";
      const transition =
        index > 0 && transitionCode(clip.transitionType) !== "C"
          ? `<transition name="${xmlEscape(clip.transitionType)}" offset="${offset}" duration="${secondsFraction(
              Math.max(1, secondsToFrames(clip.transitionDurationSeconds, frameRate)),
            )}"/>`
          : "";
      return `${transition}<asset-clip name="${xmlEscape(clip.name)}" ref="r${index + 2}" offset="${offset}" start="${start}" duration="${duration}" tcFormat="NDF">${marker}</asset-clip>`;
    })
    .join("\n              ");

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE fcpxml>
<fcpxml version="1.10">
  <resources>
    <format id="r1" name="FFVideoFormat${height}p${frameRate}" frameDuration="1/${frameRate}s" width="${width}" height="${height}" colorSpace="1-1-1 (Rec. 709)"/>
    ${resources}
  </resources>
  <library>
    <event name="Virelle Studios">
      <project name="${xmlEscape(title)}">
        <sequence format="r1" duration="${secondsFraction(totalFrames)}" tcStart="3600s" tcFormat="NDF" audioLayout="stereo" audioRate="48k">
          <spine>
              ${spine}
          </spine>
        </sequence>
      </project>
    </event>
  </library>
</fcpxml>`;
}

function buildCsv(clips: TimelineClip[], frameRate: FrameRate): string {
  const headers = [
    "Event",
    "Scene ID",
    "Title",
    "Description",
    "Media URL",
    "Media Status",
    "Source In",
    "Source Out",
    "Record In",
    "Record Out",
    "Duration Seconds",
    "Transition",
    "Transition Duration Seconds",
    "Camera",
    "Director Note",
    "Dialogue",
  ];
  const rows = clips.map(clip => [
    clip.index,
    clip.sceneId,
    clip.name,
    clip.description,
    clip.sourceUrl,
    clip.hasMedia ? "online" : "offline",
    framesToTimecode(secondsToFrames(clip.sourceInSeconds, frameRate), frameRate),
    framesToTimecode(secondsToFrames(clip.sourceOutSeconds, frameRate), frameRate),
    framesToTimecode(secondsToFrames(clip.recordInSeconds, frameRate) + 60 * 60 * frameRate, frameRate),
    framesToTimecode(secondsToFrames(clip.recordOutSeconds, frameRate) + 60 * 60 * frameRate, frameRate),
    clip.durationSeconds.toFixed(3),
    clip.transitionType,
    clip.transitionDurationSeconds.toFixed(3),
    clip.camera,
    clip.directorNote,
    clip.dialogue,
  ]);
  return [headers, ...rows]
    .map(row => row.map(csvEscape).join(","))
    .join("\r\n");
}

function downloadText(filename: string, mimeType: string, contents: string): void {
  const url = URL.createObjectURL(new Blob([contents], { type: `${mimeType};charset=utf-8` }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function NLEExportInner() {
  const [, navigate] = useLocation();
  const params = useParams<{ projectId: string }>();
  const projectId = Number(params.projectId || 0);
  const validProjectId = Number.isFinite(projectId) && projectId > 0;

  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>("premiere_xml");
  const [selectedCutId, setSelectedCutId] = useState<number | null>(null);
  const [aspectRatio, setAspectRatio] = useState<AspectRatioValue>("16:9");
  const [frameRate, setFrameRate] = useState<FrameRate>(24);
  const [includeNotes, setIncludeNotes] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);

  const { data: project, isLoading: projectLoading } = trpc.project.get.useQuery(
    { id: projectId },
    { enabled: validProjectId },
  );
  const { data: summary, isLoading: summaryLoading } =
    trpc.featureFilm.getFeatureFilmSummary.useQuery(
      { projectId },
      { enabled: validProjectId },
    );

  const cuts = summary?.cuts || [];
  const effectiveCutId = selectedCutId ?? cuts[0]?.id ?? null;

  useEffect(() => {
    if (selectedCutId === null && cuts[0]?.id) setSelectedCutId(cuts[0].id);
  }, [cuts, selectedCutId]);

  const { data: cutData, isLoading: cutLoading } = trpc.featureFilm.getCut.useQuery(
    { cutId: effectiveCutId! },
    { enabled: !!effectiveCutId },
  );

  const timeline = useMemo(
    () => buildTimeline(((cutData?.scenes || []) as unknown) as CutScene[]),
    [cutData?.scenes],
  );
  const offlineCount = timeline.filter(clip => !clip.hasMedia).length;
  const timelineDuration = timeline.reduce((sum, clip) => sum + clip.durationSeconds, 0);
  const activeAspect = ASPECTS[aspectRatio];
  const activeCut = cuts.find(cut => cut.id === effectiveCutId);

  const handleExport = () => {
    if (!project || !activeCut || timeline.length === 0) {
      toast.error("Select a cut containing at least one included scene before exporting.");
      return;
    }

    setIsExporting(true);
    setExportComplete(false);
    try {
      const title = `${project.title} — ${activeCut.name}`;
      const basename = safeFilename(`${project.title}_${activeCut.name}`);
      if (selectedFormat === "edl") {
        downloadText(`${basename}.edl`, "text/plain", buildEdl(title, timeline, frameRate));
      } else if (selectedFormat === "csv") {
        downloadText(`${basename}_timeline.csv`, "text/csv", buildCsv(timeline, frameRate));
      } else if (selectedFormat === "fcpxml") {
        downloadText(
          `${basename}.fcpxml`,
          "application/xml",
          buildFcpxml(
            title,
            timeline,
            frameRate,
            activeAspect.width,
            activeAspect.height,
            includeNotes,
          ),
        );
      } else {
        downloadText(
          `${basename}_premiere.xml`,
          "application/xml",
          buildPremiereXml(
            title,
            timeline,
            frameRate,
            activeAspect.width,
            activeAspect.height,
            includeNotes,
          ),
        );
      }
      setExportComplete(true);
      toast.success(`Exported ${timeline.length} timeline clip${timeline.length === 1 ? "" : "s"}.`);
    } catch (error: any) {
      toast.error(error?.message || "Timeline export failed.");
    } finally {
      setIsExporting(false);
    }
  };

  const loading = projectLoading || summaryLoading || (!!effectiveCutId && cutLoading);

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#07070e_0%,#0c0b18_60%,#07070a_100%)]">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#07070ef7] backdrop-blur-2xl">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/projects/${projectId}`)}
              className="h-8 gap-2 text-muted-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div className="h-5 w-px bg-border/40" />
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#b8960c]">
                <Download className="h-[18px] w-[18px] text-black" />
              </div>
              <div>
                <h1 className="text-sm font-bold">Professional NLE Export</h1>
                <p className="text-[10px] text-muted-foreground">
                  Real cut, trim, transition, timecode, and source-media exports
                </p>
              </div>
            </div>
          </div>
          <Button
            size="sm"
            onClick={handleExport}
            disabled={loading || isExporting || timeline.length === 0}
            className="h-8 gap-1.5 bg-gradient-to-br from-[#D4AF37] to-[#b8960c] text-xs text-black hover:brightness-110"
          >
            {isExporting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : exportComplete ? (
              <CheckCircle2 className="h-3.5 w-3.5" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            {isExporting ? "Exporting" : exportComplete ? "Export Again" : "Export Cut"}
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        {loading ? (
          <div className="flex min-h-[320px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
          </div>
        ) : cuts.length === 0 ? (
          <Card className="border-amber-500/20 bg-black/20">
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <Film className="h-9 w-9 text-white/20" />
              <div>
                <h2 className="font-semibold">No persisted cut available</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create a cut in Feature Timeline first. Exports use its saved order, trims, inclusions, and transitions.
                </p>
              </div>
              <Button onClick={() => navigate(`/projects/${projectId}/feature-timeline`)}>
                Open Feature Timeline
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <section className="grid gap-3 md:grid-cols-4">
              <Card className="border-white/10 bg-white/[0.02] md:col-span-2">
                <CardContent className="space-y-2 pt-4">
                  <Label>Saved cut</Label>
                  <Select
                    value={effectiveCutId ? String(effectiveCutId) : undefined}
                    onValueChange={value => {
                      setSelectedCutId(Number(value));
                      setExportComplete(false);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select cut" />
                    </SelectTrigger>
                    <SelectContent>
                      {cuts.map(cut => (
                        <SelectItem key={cut.id} value={String(cut.id)}>
                          {cut.name} · {cut.version}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
              <Card className="border-white/10 bg-white/[0.02]">
                <CardContent className="pt-4">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Included clips</p>
                  <p className="mt-1 text-xl font-bold text-amber-300">{timeline.length}</p>
                </CardContent>
              </Card>
              <Card className="border-white/10 bg-white/[0.02]">
                <CardContent className="pt-4">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Runtime</p>
                  <p className="mt-1 font-mono text-xl font-bold text-amber-300">
                    {framesToTimecode(secondsToFrames(timelineDuration, frameRate), frameRate)}
                  </p>
                </CardContent>
              </Card>
            </section>

            {offlineCount > 0 && (
              <div className="flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-100">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <p>
                  {offlineCount} included scene{offlineCount === 1 ? " has" : "s have"} no generated video URL. The export remains valid and includes clearly marked offline-media placeholders for relinking in the NLE.
                </p>
              </div>
            )}

            <section>
              <h2 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                Export format
              </h2>
              <div className="grid gap-3 md:grid-cols-2">
                {FORMAT_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setSelectedFormat(option.value);
                      setExportComplete(false);
                    }}
                    className={`rounded-xl border p-4 text-left transition ${
                      selectedFormat === option.value
                        ? "border-amber-400/50 bg-amber-400/[0.07]"
                        : "border-white/10 bg-white/[0.02] hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {option.icon}
                      <span className="text-sm font-medium">{option.label}</span>
                      {selectedFormat === option.value && (
                        <Badge className="ml-auto bg-amber-400 text-black">Selected</Badge>
                      )}
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      {option.description}
                    </p>
                  </button>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                AAF and PDF are not presented as working exports because this build does not contain a native AAF encoder or PDF rendering service. The four formats above are generated as actual files.
              </p>
            </section>

            <Separator />

            <section className="grid gap-5 md:grid-cols-2">
              <div>
                <h2 className="mb-3 text-sm font-medium text-amber-200">Sequence format</h2>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.entries(ASPECTS) as Array<[AspectRatioValue, (typeof ASPECTS)[AspectRatioValue]]>).map(
                    ([value, option]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => {
                          setAspectRatio(value);
                          setExportComplete(false);
                        }}
                        className={`rounded-lg border px-2 py-3 text-center transition ${
                          aspectRatio === value
                            ? "border-amber-400 bg-amber-400/10"
                            : "border-white/10 bg-black/20 hover:border-white/20"
                        }`}
                      >
                        <p className="text-xs font-medium">{value}</p>
                        <p className="mt-1 text-[10px] text-muted-foreground">{option.label}</p>
                        <p className="mt-1 font-mono text-[9px] text-white/35">
                          {option.width}×{option.height}
                        </p>
                      </button>
                    ),
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Frame rate</Label>
                  <Select
                    value={String(frameRate)}
                    onValueChange={value => {
                      setFrameRate(Number(value) as FrameRate);
                      setExportComplete(false);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="24">24 fps — cinema</SelectItem>
                      <SelectItem value="25">25 fps — PAL</SelectItem>
                      <SelectItem value="30">30 fps — digital / NTSC integer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-white/10 bg-black/20 p-3">
                  <Checkbox
                    checked={includeNotes}
                    onCheckedChange={value => setIncludeNotes(value === true)}
                  />
                  <span>
                    <span className="block text-sm font-medium">Include director notes and markers</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      Adds comments/markers to XML formats and note columns to CSV. EDL comments are always retained.
                    </span>
                  </span>
                </label>
              </div>
            </section>

            <Card className="border-white/10 bg-black/20">
              <CardContent className="pt-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Ready to export: {activeCut?.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Source order, included/excluded state, trim in/out, transitions, and record timecodes come from the persisted cut.
                    </p>
                  </div>
                  <Button
                    onClick={handleExport}
                    disabled={isExporting || timeline.length === 0}
                    className="gap-2 bg-amber-500 text-black hover:bg-amber-400"
                  >
                    <Download className="h-4 w-4" />
                    Export {FORMAT_OPTIONS.find(option => option.value === selectedFormat)?.label}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>
      {validProjectId && <NextStageCTA projectId={projectId} currentStage={7} />}
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
