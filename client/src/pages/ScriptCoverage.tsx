import { useState } from "react";
  import { useParams, useLocation } from "wouter";
  import { ArrowLeft, FileSearch, Wand2, Loader2, Star, TrendingUp, Users, MessageSquare, AlertTriangle, CheckCircle, Download, Copy, BarChart3, Coins } from "lucide-react";
  import { Button } from "@/components/ui/button";
  import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
  import { Textarea } from "@/components/ui/textarea";
  import { Label } from "@/components/ui/label";
  import { Input } from "@/components/ui/input";
  import { Badge } from "@/components/ui/badge";
  import { Progress } from "@/components/ui/progress";
  import { Separator } from "@/components/ui/separator";
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
  import { toast } from "sonner";
  import { trpc } from "@/lib/trpc";
  import { useSubscription } from "@/hooks/useSubscription";

  interface CoverageReport {
    title: string;
    genre: string;
    format: string;
    logline: string;
    premise: string;
    scores: { premise: number; structure: number; characters: number; dialogue: number; pacing: number; originality: number; marketability: number };
    recommendation: "Consider" | "Pass" | "Recommend";
    synopsisNotes: string;
    strengths: string[];
    weaknesses: string[];
    notes: string;
  }

  const SAMPLE_REPORT: CoverageReport = {
    title: "Sample Analysis",
    genre: "Drama/Thriller",
    format: "Feature",
    logline: "A disgraced detective must solve her daughter's disappearance in 48 hours — or become the prime suspect.",
    premise: "Strong high-concept hook with clear ticking clock. The dual-threat structure (solve it or be blamed) creates compelling dramatic irony. Premise is commercially viable in the current streaming landscape.",
    scores: { premise: 82, structure: 74, characters: 88, dialogue: 79, pacing: 71, originality: 68, marketability: 85 },
    recommendation: "Consider",
    synopsisNotes: "Three-act structure is present but the second act midpoint feels underdeveloped. The protagonist's arc from disgraced detective to self-redemption is earned but telegraphed early.",
    strengths: ["Compelling central protagonist with a clear internal flaw", "High commercial concept with existing audience appetite", "Strong dialogue — voice is consistent throughout", "Emotional stakes are clear from page one"],
    weaknesses: ["Second act loses momentum between pages 55–80", "Antagonist motivation is underwritten", "Resolution arrives slightly too easily — earned catharsis is missing", "Some expository scenes could be dramatised rather than stated"],
    notes: "This script shows a writer with strong instincts for character and dialogue. With a focused rewrite on the second act and antagonist development, this could move to a Recommend.",
  };

  function ScoreBar({ label, value }: { label: string; value: number }) {
    const color = value >= 80 ? "bg-green-500" : value >= 65 ? "bg-primary" : "bg-amber-500";
    return (
      <div className="min-h-screen" style={{ background:"linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)" }}>
      <div className="max-w-5xl mx-auto space-y-1 px-4 py-6">
        <div className="flex justify-between text-xs"><span className="text-muted-foreground">{label}</span><span className="font-medium">{value}/100</span></div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden"><div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${value}%` }} /></div>
      </div>
    );
  }

  export default function ScriptCoverage() {
    const params = useParams<{ id: string }>();
    const projectId = params.id;
    const [, setLocation] = useLocation();
    const [scriptText, setScriptText] = useState("");
    const [scriptTitle, setScriptTitle] = useState("");
    const [genre, setGenre] = useState("");
    const [format, setFormat] = useState("Feature");
    const [report, setReport] = useState<CoverageReport | null>(null);
    const [apiKey, setApiKey] = useState(() => localStorage.getItem("virelle_openai_key") ?? localStorage.getItem("virelle_anthropic_key") ?? "");

    const { generationsUsed, generationsLimit } = useSubscription();

    const analyzeMutation = trpc.coverage.analyze.useMutation({
      onSuccess: (data) => {
        setReport(data as CoverageReport);
        toast.success("Coverage report generated — 5 credits deducted");
      },
      onError: (err) => {
        toast.error("Analysis failed: " + err.message);
      },
    });

    const analyze = () => {
      if (!scriptText.trim() || scriptText.trim().length < 500) { toast.error("Please paste at least 500 characters of script text"); return; }
      if (!apiKey.trim()) { toast.error("Add your OpenAI or Anthropic API key in Settings → API Keys, or paste it temporarily above"); return; }
      analyzeMutation.mutate({ scriptText, title: scriptTitle || undefined, genre: genre || undefined, format, byokKey: apiKey });
    };

    const showSample = () => { setReport(SAMPLE_REPORT); toast.info("Showing sample coverage report"); };

    const downloadReport = () => {
      if (!report) return;
      const avg = Math.round(Object.values(report.scores).reduce((a, b) => a + b, 0) / 7);
      const text = `SCRIPT COVERAGE REPORT
  ======================
  Title: ${report.title}
  Genre: ${report.genre} | Format: ${report.format}
  Recommendation: ${report.recommendation.toUpperCase()}
  Overall Score: ${avg}/100

  LOGLINE
  ${report.logline}

  PREMISE
  ${report.premise}

  SCORES
  ${Object.entries(report.scores).map(([k, v]) => `  ${k.charAt(0).toUpperCase() + k.slice(1)}: ${v}/100`).join("\n")}

  SYNOPSIS NOTES
  ${report.synopsisNotes}

  STRENGTHS
  ${report.strengths.map(s => `• ${s}`).join("\n")}

  WEAKNESSES
  ${report.weaknesses.map(w => `• ${w}`).join("\n")}

  READER NOTES
  ${report.notes}

  Generated by Virelle Studios Script Coverage`;
      const blob = new Blob([text], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `coverage-${report.title.replace(/\s+/g, "-")}.txt`; a.click();
      URL.revokeObjectURL(url);
    };

    const analyzing = analyzeMutation.isPending;

    return (
      <div className="max-w-5xl mx-auto space-y-6 min-h-screen py-6 px-4" style={{ background:"linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)" }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setLocation(`/projects/${projectId}`)}><ArrowLeft className="h-4 w-4" /></Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2 gradient-text-gold"><FileSearch className="h-6 w-6 text-primary" /> Script Coverage</h1>
              <p className="text-sm text-muted-foreground">AI-powered script analysis — logline, scores, strengths, and a professional reader's report</p>
            </div>
          </div>
          <Badge variant="outline" className="flex items-center gap-1.5 text-xs">
            <Coins className="h-3 w-3 text-amber-500" />
            5 credits per analysis · {generationsLimit - generationsUsed} remaining
          </Badge>
        </div>

        {!report ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-base gradient-text-gold glass-card">Script Details</CardTitle></CardHeader>
                <CardContent className="space-y-4 glass-card">
                  <div className="space-y-1.5"><Label>Title</Label><Input placeholder="Untitled Script" value={scriptTitle} onChange={e => setScriptTitle(e.target.value)} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5"><Label>Genre</Label><Input placeholder="Drama, Thriller…" value={genre} onChange={e => setGenre(e.target.value)} /></div>
                    <div className="space-y-1.5"><Label>Format</Label><Select value={format} onValueChange={setFormat}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Feature","Short Film","TV Pilot","Web Series Episode","Documentary"].map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent></Select></div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>OpenAI or Anthropic API Key (BYOK)</Label>
                    <Input type="password" placeholder="sk-… or sk-ant-…" value={apiKey} onChange={e => setApiKey(e.target.value)} />
                    <p className="text-[10px] text-muted-foreground">Your key is sent to Virelle's server for this analysis only and never stored. Manage keys permanently in Settings → API Keys.</p>
                  </div>
                </CardContent>
              </Card>
              <div className="space-y-1.5">
                <Label>Paste Script Text (minimum 500 characters)</Label>
                <Textarea className="h-48 font-mono text-xs" placeholder={"FADE IN:\n\nINT. DETECTIVE'S OFFICE - NIGHT\n\nPaste your script or excerpt here..."} value={scriptText} onChange={e => setScriptText(e.target.value)} />
                <p className="text-xs text-muted-foreground">{scriptText.length.toLocaleString()} characters</p>
              </div>
              <div className="flex gap-3">
                <Button className="flex-1" onClick={analyze} disabled={analyzing}>
                  {analyzing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin text-amber-400" />Analysing…</> : <><Wand2 className="h-4 w-4 mr-2" />Generate Coverage · 5 credits</>}
                </Button>
                <Button variant="outline" onClick={showSample}>View Sample</Button>
              </div>
            </div>
            <Card className="flex flex-col justify-center items-center p-8 text-center border-dashed glass-card">
              <FileSearch className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="font-medium">Your coverage report will appear here</p>
              <p className="text-sm text-muted-foreground mt-1">Paste your script and click Generate Coverage, or view a sample report to see what to expect.</p>
              <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1"><Coins className="h-3 w-3 text-amber-500" />5 credits per analysis — uses your BYOK key</p>
            </Card>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-xl font-bold gradient-text-gold">{report.title}</h2>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge variant="outline">{report.genre}</Badge>
                  <Badge variant="outline">{report.format}</Badge>
                  <Badge className={`${report.recommendation === "Recommend" ? "bg-green-500" : report.recommendation === "Consider" ? "bg-primary" : "bg-destructive"} text-white`}>{report.recommendation}</Badge>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setReport(null)}>New Analysis</Button>
                <Button size="sm" onClick={downloadReport}><Download className="h-4 w-4 mr-1" />Download</Button>
              </div>
            </div>

            <Card><CardContent className="p-4 glass-card"><p className="text-sm italic text-muted-foreground">"{report.logline}"</p></CardContent></Card>

            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="lg:col-span-1 glass-card">
                <CardHeader><CardTitle className="text-sm flex items-center gap-2 gradient-text-gold glass-card"><BarChart3 className="h-4 w-4 text-primary" />Scores</CardTitle></CardHeader>
                <CardContent className="space-y-3 glass-card">
                  {Object.entries(report.scores).map(([k, v]) => <ScoreBar key={k} label={k.charAt(0).toUpperCase() + k.slice(1)} value={v} />)}
                  <Separator />
                  <div className="flex justify-between text-sm font-medium"><span>Overall</span><span>{Math.round(Object.values(report.scores).reduce((a, b) => a + b, 0) / 7)}/100</span></div>
                </CardContent>
              </Card>
              <div className="lg:col-span-2 space-y-4">
                <Card><CardHeader><CardTitle className="text-sm gradient-text-gold glass-card">Premise Analysis</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">{report.premise}</p></CardContent></Card>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Card><CardHeader><CardTitle className="text-sm flex items-center gap-2 text-green-500 gradient-text-gold glass-card"><CheckCircle className="h-4 w-4 text-amber-400" />Strengths</CardTitle></CardHeader><CardContent><ul className="space-y-1.5">{report.strengths.map((s, i) => <li key={i} className="text-xs text-muted-foreground flex gap-2"><span className="text-green-500 shrink-0">+</span>{s}</li>)}</ul></CardContent></Card>
                  <Card><CardHeader><CardTitle className="text-sm flex items-center gap-2 text-amber-500 glass-card"><AlertTriangle className="h-4 w-4" />Weaknesses</CardTitle></CardHeader><CardContent><ul className="space-y-1.5">{report.weaknesses.map((w, i) => <li key={i} className="text-xs text-muted-foreground flex gap-2"><span className="text-amber-500 shrink-0">−</span>{w}</li>)}</ul></CardContent></Card>
                </div>
                <Card><CardHeader><CardTitle className="text-sm flex items-center gap-2 gradient-text-gold glass-card"><MessageSquare className="h-4 w-4 text-primary" />Synopsis Notes</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">{report.synopsisNotes}</p></CardContent></Card>
                <Card><CardHeader><CardTitle className="text-sm flex items-center gap-2 gradient-text-gold glass-card"><Star className="h-4 w-4 text-primary" />Reader Notes</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">{report.notes}</p></CardContent></Card>
              </div>
            </div>
          </div>
        )}
          </div>
  );
}
