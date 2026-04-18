import { useMemo, useState } from "react";
import { Link, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  ClipboardList,
  Sparkles,
  Loader2,
  Copy,
  Printer,
  Sun,
  Moon,
  Sunrise,
  Sunset,
  Cloud,
  MapPin,
  Users,
  Clock,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";

const TIME_ICONS: Record<string, any> = {
  dawn: Sunrise,
  morning: Sun,
  afternoon: Sun,
  evening: Sunset,
  night: Moon,
  "golden-hour": Sunset,
};

function timeIcon(t?: string | null) {
  const Icon = TIME_ICONS[t || ""] || Cloud;
  return <Icon className="h-3 w-3" />;
}

function fmtDuration(secs?: number | null) {
  const s = secs || 0;
  if (s < 60) return `${s}s`;
  return `${Math.round(s / 60)}m`;
}

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

export default function ProductionOffice() {
  const params = useParams<{ projectId: string }>();
  const projectId = parseInt(params.projectId || "0");
  const hasProject = !!projectId;

  const { data: project } = trpc.project.get.useQuery({ id: projectId }, { enabled: hasProject });
  const { data: scenes } = trpc.scene.listByProject.useQuery(
    { projectId },
    { enabled: hasProject }
  );
  const { data: characters } = trpc.character.listByProject.useQuery(
    { projectId },
    { enabled: hasProject }
  );

  const sendMessage = trpc.directorChat.send.useMutation();
  const { data: history, refetch: refetchHistory } = trpc.directorChat.history.useQuery(
    { projectId },
    { enabled: hasProject, refetchInterval: 4000 }
  );

  // ── Stripboard: group scenes into shoot days ──
  const [shootDays, setShootDays] = useState<number>(5);
  const [startDate, setStartDate] = useState<string>(() =>
    new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 10)
  );

  const sortedScenes = useMemo(
    () => (scenes ?? []).slice().sort((a: any, b: any) => (a.orderIndex || 0) - (b.orderIndex || 0)),
    [scenes]
  );

  // group by location for efficient scheduling, then chunk into N days
  const stripboard = useMemo(() => {
    if (sortedScenes.length === 0) return [];
    const byLocation: Record<string, any[]> = {};
    for (const s of sortedScenes) {
      const loc = (s.locationType || s.city || "Unspecified").toString();
      if (!byLocation[loc]) byLocation[loc] = [];
      byLocation[loc].push(s);
    }
    const ordered = Object.values(byLocation).flat();
    const perDay = Math.max(1, Math.ceil(ordered.length / shootDays));
    const days: { day: number; date: string; scenes: any[] }[] = [];
    const start = new Date(startDate);
    for (let i = 0; i < shootDays; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      days.push({
        day: i + 1,
        date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
        scenes: ordered.slice(i * perDay, (i + 1) * perDay),
      });
    }
    return days;
  }, [sortedScenes, shootDays, startDate]);

  // ── Day-out-of-days for cast ──
  const dood = useMemo(() => {
    if (!characters || stripboard.length === 0) return [];
    return characters.map((c: any) => {
      const days = stripboard.map((d) =>
        d.scenes.some((s: any) => {
          const ids = (s.characterIds || []) as number[];
          return Array.isArray(ids) && ids.includes(c.id);
        })
      );
      const totalDays = days.filter(Boolean).length;
      return { character: c, days, totalDays };
    });
  }, [characters, stripboard]);

  // ── AI call sheet ──
  const [callDayIdx, setCallDayIdx] = useState(0);
  const [crewCallTime, setCrewCallTime] = useState("06:30");
  const [unitBase, setUnitBase] = useState("");
  const [generating, setGenerating] = useState(false);

  const lastCallSheet = useMemo(() => {
    const tag = `callSheet:${callDayIdx}`;
    for (const m of (history ?? []).slice().reverse()) {
      const meta = (m as any).metadata || {};
      if (meta.callSheetDay === callDayIdx && (m as any).role === "assistant") {
        return (m as any).content as string;
      }
      // fallback: tag in content
      if ((m as any).role === "assistant" && ((m as any).content || "").startsWith(`[CallSheet:${callDayIdx}]`)) {
        return (m as any).content as string;
      }
    }
    return null;
  }, [history, callDayIdx]);

  async function generateCallSheet() {
    if (!hasProject) return;
    const day = stripboard[callDayIdx];
    if (!day || day.scenes.length === 0) {
      toast.error("Pick a day that has scenes.");
      return;
    }
    setGenerating(true);
    try {
      const cast = (characters ?? [])
        .filter((c: any) =>
          day.scenes.some((s: any) =>
            Array.isArray(s.characterIds) && s.characterIds.includes(c.id)
          )
        )
        .map((c: any) => `- ${c.name}${c.role ? ` (${c.role})` : ""}`)
        .join("\n");

      const sceneList = day.scenes
        .map(
          (s: any, i: number) =>
            `Scene ${s.orderIndex ?? i + 1}: ${s.title || "Untitled"}\n  Location: ${s.locationType || s.city || "TBD"}\n  Time of day: ${s.timeOfDay || "TBD"} · Duration: ${fmtDuration(s.duration)}\n  ${s.description || ""}`
        )
        .join("\n\n");

      const prompt = `Generate a professional one-page film call sheet (markdown) for "${project?.title || "Untitled"}".

Shoot day: Day ${day.day} of ${stripboard.length} · Date: ${day.date}
General crew call: ${crewCallTime}
Unit base / parking: ${unitBase || "TBD"}
Locations covered today: ${[...new Set(day.scenes.map((s: any) => s.locationType || s.city || "TBD"))].join(", ")}

Cast working today:
${cast || "(none assigned)"}

Scenes:
${sceneList}

Sections required (in order):
1. Header (title, day, date, weather note)
2. Crew call / shoot call / wrap target
3. Cast call times (pickup / makeup / on set)
4. Scene schedule with shot count + page count estimate
5. Locations & parking
6. Catering schedule (breakfast, lunch, craft)
7. Safety notes & nearest hospital placeholder
8. Emergency contacts placeholder

Output clean markdown only — no commentary.`;

      await sendMessage.mutateAsync({
        projectId,
        message: `[CallSheet:${callDayIdx}]\n\n${prompt}`,
      });
      await refetchHistory();
      toast.success(`Call sheet drafted for day ${day.day}.`);
    } catch (e: any) {
      toast.error(e?.message || "Generation failed.");
    } finally {
      setGenerating(false);
    }
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("Copied.");
  }

  function printSheet() {
    if (!lastCallSheet) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>Call Sheet</title><style>
body{font:14px/1.5 -apple-system,sans-serif;max-width:780px;margin:32px auto;padding:0 24px;color:#111}
h1,h2,h3{margin-top:1.5em}
pre{white-space:pre-wrap;font:inherit}
@media print{body{margin:0}}
</style></head><body><pre>${lastCallSheet.replace(/[<>]/g, (c) => (c === "<" ? "&lt;" : "&gt;"))}</pre></body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 200);
  }

  return (
    <div className="container max-w-7xl py-6 space-y-6">
      <div className="flex items-center justify-between">
        <Link href={`/projects/${projectId}`}>
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to project
          </Button>
        </Link>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ClipboardList className="h-4 w-4" /> Production Office
        </div>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Production Office</h1>
        <p className="text-muted-foreground mt-1">
          Stripboard, day-out-of-days, and AI call-sheet generator for{" "}
          <span className="font-medium">{project?.title || "your project"}</span>.
        </p>
      </div>

      {/* Schedule controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Schedule</CardTitle>
          <CardDescription>
            {sortedScenes.length} scenes · estimated total runtime{" "}
            {fmtDuration(sortedScenes.reduce((acc: number, s: any) => acc + (s.duration || 0), 0))}.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">Shoot days</Label>
            <Input
              type="number"
              min={1}
              max={60}
              value={shootDays}
              onChange={(e) => setShootDays(Math.max(1, parseInt(e.target.value) || 1))}
            />
          </div>
          <div>
            <Label className="text-xs">Start date</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="flex items-end">
            <p className="text-xs text-muted-foreground">
              Scenes are auto-grouped by location, then chunked across the schedule.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Stripboard */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" /> Stripboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {stripboard.map((day) => (
              <div key={day.day} className="border rounded-lg p-3 space-y-2 bg-muted/20">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">Day {day.day}</div>
                  <Badge variant="outline" className="text-[10px]">{day.date}</Badge>
                </div>
                {day.scenes.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">— hold day —</p>
                ) : (
                  day.scenes.map((s: any) => (
                    <div key={s.id} className="text-xs border rounded p-2 bg-background space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium truncate">
                          #{s.orderIndex ?? "?"} · {s.title || "Untitled"}
                        </span>
                        <span className="flex items-center gap-1 text-muted-foreground shrink-0">
                          <Clock className="h-3 w-3" />
                          {fmtDuration(s.duration)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span className="flex items-center gap-1">
                          {timeIcon(s.timeOfDay)} {s.timeOfDay || "—"}
                        </span>
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="h-3 w-3" />
                          {s.locationType || s.city || "TBD"}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ))}
            {stripboard.length === 0 && (
              <p className="text-sm text-muted-foreground py-6 col-span-full text-center">
                No scenes yet. Build your script first.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Day-out-of-days */}
      {dood.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" /> Day-out-of-days
            </CardTitle>
            <CardDescription>Which cast works which days. Plan their pickup, holds, and travel.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-1 pr-2 sticky left-0 bg-background">Cast</th>
                  {stripboard.map((d) => (
                    <th key={d.day} className="text-center px-1 font-medium">
                      D{d.day}
                    </th>
                  ))}
                  <th className="text-center px-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {dood.map(({ character, days, totalDays }) => (
                  <tr key={character.id} className="border-b last:border-0">
                    <td className="py-1.5 pr-2 sticky left-0 bg-background font-medium truncate max-w-[180px]">
                      {character.name}
                    </td>
                    {days.map((working: boolean, i: number) => (
                      <td key={i} className="text-center">
                        {working ? (
                          <span className="inline-block w-4 h-4 rounded bg-primary text-primary-foreground text-[10px] leading-4">W</span>
                        ) : (
                          <span className="text-muted-foreground/40">·</span>
                        )}
                      </td>
                    ))}
                    <td className="text-center font-medium px-2">{totalDays}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* AI call sheet */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> AI Call Sheet
          </CardTitle>
          <CardDescription>Pick a day and generate a print-ready one-pager.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Day</Label>
              <Select
                value={String(callDayIdx)}
                onValueChange={(v) => setCallDayIdx(parseInt(v))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {stripboard.map((d, i) => (
                    <SelectItem key={d.day} value={String(i)}>
                      Day {d.day} — {d.date} ({d.scenes.length} scn)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Crew call</Label>
              <Input value={crewCallTime} onChange={(e) => setCrewCallTime(e.target.value)} placeholder="06:30" />
            </div>
            <div>
              <Label className="text-xs">Unit base / parking</Label>
              <Input value={unitBase} onChange={(e) => setUnitBase(e.target.value)} placeholder="123 Elm St lot" />
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={generateCallSheet} disabled={generating || stripboard.length === 0} size="sm" className="gap-2">
              {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              Draft call sheet
            </Button>
            {lastCallSheet && (
              <>
                <Button onClick={() => copy(lastCallSheet)} size="sm" variant="secondary" className="gap-2">
                  <Copy className="h-3 w-3" /> Copy
                </Button>
                <Button onClick={printSheet} size="sm" variant="secondary" className="gap-2">
                  <Printer className="h-3 w-3" /> Print
                </Button>
              </>
            )}
          </div>

          {lastCallSheet && (
            <div className="border rounded-lg p-3 bg-muted/30 max-h-[480px] overflow-y-auto">
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{lastCallSheet}</pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
