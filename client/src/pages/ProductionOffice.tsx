import { useMemo, useState } from "react";
import { Link, useParams } from "wouter";
import { NextStageCTA } from "@/components/NextStageCTA";
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

  // Ã¢ÂÂÃ¢ÂÂ Stripboard: group scenes into shoot days Ã¢ÂÂÃ¢ÂÂ
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

  // Ã¢ÂÂÃ¢ÂÂ Day-out-of-days for cast Ã¢ÂÂÃ¢ÂÂ
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

  // Ã¢ÂÂÃ¢ÂÂ AI call sheet Ã¢ÂÂÃ¢ÂÂ
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
            `Scene ${s.orderIndex ?? i + 1}: ${s.title || "Untitled"}\n  Location: ${s.locationType || s.city || "TBD"}\n  Time of day: ${s.timeOfDay || "TBD"} ÃÂ· Duration: ${fmtDuration(s.duration)}\n  ${s.description || ""}`
        )
        .join("\n\n");

      const prompt = `Generate a professional one-page film call sheet (markdown) for "${project?.title || "Untitled"}".

Shoot day: Day ${day.day} of ${stripboard.length} ÃÂ· Date: ${day.date}
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

Output clean markdown only Ã¢ÂÂ no commentary.`;

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
    <div className="min-h-screen pb-10" style={{ background:"linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)" }}>
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
        <h1 className="text-3xl font-bold tracking-tight text-gold-shimmer">Production Office</h1>
        <p className="text-muted-foreground mt-1">
          Stripboard, day-out-of-days, and AI call-sheet generator for{" "}
          <span className="font-medium">{project?.title || "your project"}</span>.
        </p>
      </div>

      {/* Schedule controls */}
      <CardclassName="glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow gold-glow" >
        <CardclassName="glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow" Header>
          <CardTitle className="text-base gradient-text-gold">Schedule</CardTitle>
          <CardclassName="glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow" Description>
            {sortedScenes.length} scenes ÃÂ· estimated total runtime{" "}
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
      <CardclassName="glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow" >
        <CardclassName="glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow" Header>
          <CardTitle className="text-base flex items-center gap-2 gradient-text-gold">
            <Calendar className="h-4 w-4" /> Stripboard
          </CardTitle>
        </CardHeader>
        <CardclassName="glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow" Content>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {stripboard.map((day) => (
              <div key={day.day} className="border rounded-lg p-3 space-y-2 bg-muted/20">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">Day {day.day}</div>
                  <Badge variant="outline" className="text-[10px]">{day.date}</Badge>
                </div>
                {day.scenes.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Ã¢ÂÂ hold day Ã¢ÂÂ</p>
                ) : (
                  day.scenes.map((s: any) => (
                    <div key={s.id} className="text-xs border rounded p-2 bg-[#07070e] space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium truncate">
                          #{s.orderIndex ?? "?"} ÃÂ· {s.title || "Untitled"}
                        </span>
                        <span className="flex items-center gap-1 text-muted-foreground shrink-0">
                          <Clock className="h-3 w-3" />
                          {fmtDuration(s.duration)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span className="flex items-center gap-1">
                          {timeIcon(s.timeOfDay)} {s.timeOfDay || "Ã¢ÂÂ"}
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
              <div className="py-8 col-span-full text-center">
                <p className="text-sm text-foreground/80 font-medium">Stripboard empty</p>
                <p className="text-xs text-muted-foreground mt-1">Write your script in the Scene Editor Ã¢ÂÂ locations, time of day and characters will roll up here automatically.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Day-out-of-days */}
      {dood.length > 0 && (
        <CardclassName="glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow" >
          <CardclassName="glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow" Header>
            <CardTitle className="text-base flex items-center gap-2 gradient-text-gold">
              <Users className="h-4 w-4" /> Day-out-of-days
            </CardTitle>
            <CardclassName="glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow" Description>Which cast works which days. Plan their pickup, holds, and travel.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-1 pr-2 sticky left-0 bg-[#07070e]">Cast</th>
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
                    <td className="py-1.5 pr-2 sticky left-0 bg-[#07070e] font-medium truncate max-w-[180px]">
                      {character.name}
                    </td>
                    {days.map((working: boolean, i: number) => (
                      <td key={i} className="text-center">
                        {working ? (
                          <span className="inline-block w-4 h-4 rounded bg-amber-500 text-white text-[10px] leading-4">W</span>
                        ) : (
                          <span className="text-muted-foreground/40">ÃÂ·</span>
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
      <CardclassName="glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow" >
        <CardclassName="glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow" Header>
          <CardTitle className="text-base flex items-center gap-2 gradient-text-gold">
            <Sparkles className="h-4 w-4" /> AI Call Sheet
          </CardTitle>
          <CardclassName="glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow" Description>Pick a day and generate a print-ready one-pager.</CardDescription>
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
                      Day {d.day} Ã¢ÂÂ {d.date} ({d.scenes.length} scn)
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
            <Button onClick={generateCallSheet} disabled={generating || stripboard.length === 0} size="sm" className="gap-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold">
              {generating ? <Loader2 className="h-3 w-3 animate-spin text-amber-400" /> : <Sparkles className="h-3 w-3" />}
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

      {/* Ã¢ÂÂÃ¢ÂÂ Daily Production Report (DPR) Ã¢ÂÂ pro-studio wrap report Ã¢ÂÂÃ¢ÂÂ */}
      {!!projectId && stripboard.length > 0 && (
        <DailyProductionReport
          projectId={projectId}
          stripboard={stripboard}
          history={history as any[] | undefined}
          refetchHistory={refetchHistory}
        />
      )}

      {/* Ã¢ÂÂÃ¢ÂÂ Chain of Title Ã¢ÂÂ clearance / rights tracker Ã¢ÂÂÃ¢ÂÂ */}
      {!!projectId && <ChainOfTitleSection projectId={projectId} />}

  {!!projectId && <NextStageCTA projectId={projectId} currentStage={4} />}
    </div>
  );
}

// Ã¢ÂÂÃ¢ÂÂ Daily Production Report (DPR) Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
// After each shoot day, an AD logs scenes shot, hours worked, meal
// breaks, weather, and any incidents. Insurance, payroll, completion
// bond, and post-production planning all depend on these reports.
function DailyProductionReport({
  projectId,
  stripboard,
  history,
  refetchHistory,
}: {
  projectId: number;
  stripboard: any[];
  history: any[] | undefined;
  refetchHistory: () => void;
}) {
  const [dayIdx, setDayIdx] = useState(0);
  const [generating, setGenerating] = useState(false);
  const sendMessage = trpc.directorChat.send.useMutation();

  const lastDpr = useMemo(() => {
    if (!history) return null;
    const tag = `[DPR:${dayIdx}]`;
    for (let i = history.length - 1; i >= 0; i--) {
      const m: any = history[i];
      if (m.role === "assistant" && history[i - 1]?.content?.includes(tag)) {
        return m.content as string;
      }
    }
    return null;
  }, [history, dayIdx]);

  async function generateDpr() {
    const day = stripboard[dayIdx];
    if (!day) return;
    setGenerating(true);
    try {
      const prompt = `[DPR:${dayIdx}]
You are a 1st AD producing a Daily Production Report (DPR) for the
end of shoot day ${day.day} of ${stripboard.length}, date ${day.date}.

Scenes scheduled today:
${day.scenes.map((s: any) => `- Sc ${s.sceneNumber || s.id} ${s.title || ""} (${s.location || s.locationType || "loc TBD"})`).join("\n")}

Generate a clean, distributor-grade DPR in markdown with:
1. Header: production title, date, day X of Y, location, weather (assume seasonal)
2. Scenes shot vs scheduled (assume all scheduled were shot unless noted)
3. Setups / takes summary (estimate professional norms Ã¢ÂÂ 6-12 setups/day)
4. Crew/cast call vs actual wrap time (12-hour day baseline)
5. Meal breaks (breakfast 7am, lunch ~6 hrs after call, no second meal penalty)
6. Script pages shot vs scheduled
7. Camera reports Ã¢ÂÂ media transferred, backup status (assume A/B + LTO)
8. Sound / continuity / makeup notes (typical)
9. Safety incidents (none Ã¢ÂÂ clean day)
10. Producer's notes Ã¢ÂÂ outstanding items, tomorrow's priorities

Output clean markdown only, no commentary.`;
      await sendMessage.mutateAsync({ projectId, message: prompt });
      await refetchHistory();
      toast.success(`Wrap report drafted for day ${day.day}.`);
    } catch (e: any) {
      toast.error(e?.message || "Generation failed.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <CardclassName="glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow" >
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2 gradient-text-gold">
          <ClipboardList className="h-4 w-4" />
          Daily Production Report
        </CardTitle>
        <CardDescription className="text-xs">
          Wrap-of-day report for insurance, payroll, completion bond and post planning.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Shoot day</Label>
          <Select value={String(dayIdx)} onValueChange={(v) => setDayIdx(parseInt(v))}>
            <SelectTrigger className="h-8 w-44 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {stripboard.map((d: any, i: number) => (
                <SelectItem key={i} value={String(i)}>Day {d.day} Ã¢ÂÂ {d.date}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={generateDpr} disabled={generating} size="sm" className="gap-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold">
            {generating ? <Loader2 className="h-3 w-3 animate-spin text-amber-400" /> : <Sparkles className="h-3 w-3" />}
            Generate wrap report
          </Button>
        </div>
        {lastDpr && (
          <div className="border rounded-lg p-3 bg-muted/30 max-h-[480px] overflow-y-auto">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{lastDpr}</pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Ã¢ÂÂÃ¢ÂÂ Chain of Title Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
// Distributors, festivals, and streamers will not accept a film without
// proof every right has been cleared. This is the producer's checklist.
const COT_TEMPLATE = [
  { key: "literary", label: "Literary rights / underlying material" },
  { key: "screenplay", label: "Screenplay (writer agreement, WGA if applicable)" },
  { key: "lifeRights", label: "Life rights (real-person depictions)" },
  { key: "depiction", label: "Depiction releases (any recognizable person)" },
  { key: "cast", label: "Talent agreements (cast, SAG-AFTRA paperwork)" },
  { key: "crew", label: "Crew deal memos" },
  { key: "locations", label: "Location releases (every location)" },
  { key: "musicSync", label: "Music sync licenses (every cue)" },
  { key: "musicMaster", label: "Music master use licenses" },
  { key: "musicScore", label: "Composer / score work-for-hire" },
  { key: "stockFootage", label: "Stock footage / archival licenses" },
  { key: "logos", label: "Trademark / logo / product clearances" },
  { key: "eo", label: "Errors & Omissions (E&O) insurance" },
  { key: "guildResiduals", label: "Guild residuals reserve (SAG / DGA / WGA)" },
  { key: "permits", label: "Filming permits & COIs" },
];
const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "bg-gray-500/15 text-zinc-400 border-gray-500/40" },
  in_progress: { label: "In progress", color: "bg-amber-500/15 text-amber-500 border-amber-500/40" },
  cleared: { label: "Cleared", color: "bg-green-500/15 text-green-500 border-green-500/40" },
  na: { label: "N/A", color: "bg-muted text-muted-foreground border-border" },
};

function ChainOfTitleSection({ projectId }: { projectId: number }) {
  const utils = trpc.useUtils();
  const cot = trpc.chainOfTitle.get.useQuery({ projectId });
  const save = trpc.chainOfTitle.save.useMutation({
    onSuccess: () => {
      toast.success("Chain of title saved");
      utils.chainOfTitle.get.invalidate({ projectId });
    },
    onError: (e) => toast.error(e.message),
  });

  const [items, setItems] = useState<any[] | null>(null);
  const effective = items ?? cot.data?.items ?? COT_TEMPLATE.map((t) => ({ ...t, status: "pending", notes: "", docUrl: "" }));

  // Merge in any missing template items so future additions appear automatically
  const merged = useMemo(() => {
    const byKey = new Map<string, any>(effective.map((i: any) => [i.key, i]));
    return COT_TEMPLATE.map((t) => byKey.get(t.key) || { ...t, status: "pending", notes: "", docUrl: "" });
  }, [effective]);

  const update = (key: string, patch: any) => {
    const next = merged.map((i: any) => (i.key === key ? { ...i, ...patch } : i));
    setItems(next);
  };

  const cleared = merged.filter((i: any) => i.status === "cleared" || i.status === "na").length;
  const pct = Math.round((cleared / COT_TEMPLATE.length) * 100);
  const dirty = items != null;

  return (
    <CardclassName="glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow" >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2 gradient-text-gold">
              <ClipboardList className="h-4 w-4" />
              Chain of Title
            </CardTitle>
            <CardDescription className="text-xs">
              Rights & clearances tracker Ã¢ÂÂ required by distributors, festivals, streamers and E&O insurers.
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-xs">{cleared}/{COT_TEMPLATE.length} cleared ÃÂ· {pct}%</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {merged.map((item: any) => (
          <div key={item.key} className="border rounded-lg p-2.5 bg-muted/20">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <p className="text-sm font-medium">{item.label}</p>
              <Select value={item.status} onValueChange={(v) => update(item.key, { status: v })}>
                <SelectTrigger className={`h-7 w-32 text-xs ${STATUS_LABELS[item.status]?.color || ""}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k} className="text-xs">{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Notes (party, contract date, payment termsÃ¢ÂÂ¦)"
                value={item.notes || ""}
                onChange={(e) => update(item.key, { notes: e.target.value.slice(0, 2000) })}
                className="h-7 text-xs flex-1"
              />
              <Input
                placeholder="Doc URL (optional)"
                value={item.docUrl || ""}
                onChange={(e) => update(item.key, { docUrl: e.target.value.slice(0, 500) })}
                className="h-7 text-xs w-48"
              />
            </div>
          </div>
        ))}
        <div className="flex items-center justify-between pt-2">
          <p className="text-[11px] text-muted-foreground">
            {cot.data?.updatedAt ? `Last saved ${new Date(cot.data.updatedAt as any).toLocaleString()}` : "Not saved yet"}
          </p>
          <Button
            size="sm"
            disabled={!dirty || save.isPending}
            onClick={() => save.mutate({ projectId, items: merged })}
          >
            {save.isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin text-amber-400" /> : null}
            Save chain of title
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
