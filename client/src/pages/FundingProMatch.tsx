import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Sparkles, Star, ExternalLink, Send, FileText, Trophy, Clock, CheckCircle2, XCircle, AlertCircle, Bookmark, BookmarkCheck, Wand2 } from "lucide-react";
import SiteHead from "@/components/SiteHead";
import { toast } from "sonner";

const STATUS_META: Record<string, { label: string; color: string; icon: any }> = {
  submitted:    { label: "Submitted",     color: "bg-blue-500/20 text-blue-300 border-blue-500/40",       icon: Send },
  under_review: { label: "Under Review",  color: "bg-amber-500/20 text-amber-300 border-amber-500/40",    icon: Clock },
  accepted:     { label: "Accepted",      color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40", icon: Trophy },
  rejected:     { label: "Rejected",      color: "bg-rose-500/20 text-rose-300 border-rose-500/40",       icon: XCircle },
  waitlisted:   { label: "Waitlisted",    color: "bg-violet-500/20 text-violet-300 border-violet-500/40", icon: AlertCircle },
  withdrawn:    { label: "Withdrawn",     color: "bg-zinc-500/20 text-zinc-300 border-amber-500/20/40",       icon: XCircle },
};

export default function FundingProMatch() {
  const [, setLocation] = useLocation();
  const projects = trpc.project.list.useQuery();
  const [projectId, setProjectId] = useState<number | null>(null);
  const firstId = projects.data?.[0]?.id;
  const activeId = projectId ?? firstId ?? null;

  return (
    <div className="min-h-screen pb-10" style={{ background:"linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)" }}>
      <div className="container max-w-7xl mx-auto p-4 space-y-4">
      <SiteHead title="Funding Ã¢ÂÂ Pro Match & Tracker" description="AI-matched funding opportunities for your film, with shortlist, autofill drafts and application status tracking." />
      <div className="flex items-center gap-3">
        <Button size="sm" variant="ghost" onClick={() => setLocation("/funding")}><ArrowLeft className="h-4 w-4 mr-1.5" />Back to Directory</Button>
        <h1 className="text-2xl font-bold text-gold-shimmer">Funding Ã¢ÂÂ Pro Match & Tracker</h1>
        <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/40">v4</Badge>
      </div>

      <Card>
        <CardContent className="pt-4 flex items-center gap-3 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow gold-glow">
          <Label className="text-sm shrink-0">Project:</Label>
          <Select value={activeId ? String(activeId) : ""} onValueChange={v => setProjectId(Number(v))}>
            <SelectTrigger className="max-w-md"><SelectValue placeholder="Choose a project to score againstÃ¢ÂÂ¦" /></SelectTrigger>
            <SelectContent>
              {(projects.data || []).map((p: any) => <SelectItem key={p.id} value={String(p.id)}>{p.title || p.name || `Project ${p.id}`}</SelectItem>)}
            </SelectContent>
          </Select>
          {projects.isLoading && <div className="text-xs text-muted-foreground">loading projectsÃ¢ÂÂ¦</div>}
        </CardContent>
      </Card>

      {!activeId ? (
        <Card><CardContent className="pt-6 text-center text-muted-foreground glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">Select a project above to see ranked matches, your shortlist, and the application tracker.</CardContent></Card>
      ) : (
        <Tabs defaultValue="match" className="space-y-3">
          <TabsList>
            <TabsTrigger value="match"><Sparkles className="h-3.5 w-3.5 mr-1.5" />AI Match Score</TabsTrigger>
            <TabsTrigger value="saved"><Bookmark className="h-3.5 w-3.5 mr-1.5" />Shortlist</TabsTrigger>
            <TabsTrigger value="apps"><FileText className="h-3.5 w-3.5 mr-1.5" />My Applications</TabsTrigger>
            <TabsTrigger value="autofill"><Wand2 className="h-3.5 w-3.5 mr-1.5" />AI Autofill</TabsTrigger>
          </TabsList>
          <TabsContent value="match"><MatchTab projectId={activeId} /></TabsContent>
          <TabsContent value="saved"><SavedTab projectId={activeId} /></TabsContent>
          <TabsContent value="apps"><AppsTab /></TabsContent>
          <TabsContent value="autofill"><AutofillTab projectId={activeId} /></TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function MatchTab({ projectId }: { projectId: number }) {
  const [country, setCountry] = useState<string>("");
  const [limit, setLimit] = useState<number>(25);
  const matches = trpc.funding.matchScore.useQuery({ projectId, limit, country: country || undefined });
  const countries = trpc.funding.countries.useQuery();
  const saved = trpc.funding.savedList.useQuery({ projectId });
  const toggleSaved = trpc.funding.toggleSaved.useMutation({
    onSuccess: () => { toast.success("Shortlist updated"); saved.refetch(); },
  });
  const savedSet = new Set((saved.data || []) as number[]);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2 gradient-text-gold glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow"><Sparkles className="h-4 w-4 text-violet-400" />Ranked Match Score</CardTitle>
        <div className="text-xs text-muted-foreground">Sources scored on country fit, stage, type, and synopsis keyword overlap. Top results first.</div>
      </CardHeader>
      <CardContent className="space-y-3 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
        <div className="flex flex-wrap gap-2 items-end">
          <div><Label className="text-xs">Country filter</Label><Select value={country || "all"} onValueChange={v => setCountry(v === "all" ? "" : v)}>
            <SelectTrigger className="w-56"><SelectValue placeholder="All countries" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All countries</SelectItem>{(countries.data || []).map((c: any) => <SelectItem key={c.country} value={c.country}>{c.country}</SelectItem>)}</SelectContent>
          </Select></div>
          <div><Label className="text-xs">Top N</Label><Input type="number" value={limit} onChange={e => setLimit(Math.min(100, Math.max(1, Number(e.target.value) || 25)))} className="w-24" /></div>
          {matches.isFetching && <div className="text-xs text-muted-foreground">scoringÃ¢ÂÂ¦</div>}
        </div>
        {matches.data?.length === 0 && <div className="text-sm text-muted-foreground py-6 text-center">No matches above threshold. Try removing the country filter or filling in your project's genre/synopsis to improve scoring.</div>}
        <div className="space-y-2">
          {(matches.data || []).map((m: any) => {
            const isSaved = savedSet.has(m.source.id);
            const scoreColor = m.score >= 60 ? "text-emerald-400" : m.score >= 35 ? "text-amber-400" : "text-muted-foreground";
            return (
              <div key={m.source.id} className="border border-border rounded-lg p-3 hover:bg-card/30 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="text-center shrink-0">
                    <div className={`text-2xl font-bold ${scoreColor}`}>{m.score}</div>
                    <div className="text-[10px] uppercase text-muted-foreground tracking-wider">match</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-semibold">{m.source.organization}</div>
                      <Badge variant="outline" className="text-[10px]">{m.source.country}</Badge>
                      {m.source.type && <Badge variant="outline" className="text-[10px]">{m.source.type}</Badge>}
                      {m.source.stage && <Badge variant="outline" className="text-[10px]">{m.source.stage}</Badge>}
                    </div>
                    {m.source.supports && <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{m.source.supports}</div>}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {m.reasons.map((r: string, i: number) => <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-300 border border-violet-500/20">{r}</span>)}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <Button size="sm" variant={isSaved ? "default" : "outline"} onClick={() => toggleSaved.mutate({ projectId, sourceId: m.source.id, saved: !isSaved })} disabled={toggleSaved.isPending}>
                      {isSaved ? <BookmarkCheck className="h-3.5 w-3.5 mr-1" /> : <Bookmark className="h-3.5 w-3.5 mr-1" />}{isSaved ? "Saved" : "Save"}
                    </Button>
                    {m.source.officialSite && <a href={m.source.officialSite} target="_blank" rel="noreferrer"><Button size="sm" variant="ghost" className="w-full"><ExternalLink className="h-3.5 w-3.5 mr-1" />Site</Button></a>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function SavedTab({ projectId }: { projectId: number }) {
  const saved = trpc.funding.savedList.useQuery({ projectId });
  const all = trpc.funding.list.useQuery({});
  const toggleSaved = trpc.funding.toggleSaved.useMutation({ onSuccess: () => saved.refetch() });
  const ids = new Set((saved.data || []) as number[]);
  const sources = (all.data || []).filter((s: any) => ids.has(s.id));
  if (sources.length === 0) return <Card><CardContent className="pt-6 text-center text-muted-foreground glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">No shortlisted sources yet Ã¢ÂÂ save matches from the AI Match Score tab.</CardContent></Card>;
  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2 gradient-text-gold glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow"><Bookmark className="h-4 w-4 text-amber-400" />Shortlist ({sources.length})</CardTitle></CardHeader>
      <CardContent className="space-y-2 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
        {sources.map((s: any) => (
          <div key={s.id} className="border border-border rounded-lg p-3 flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="font-semibold">{s.organization}</div>
              <div className="flex gap-1 mt-1"><Badge variant="outline" className="text-[10px]">{s.country}</Badge>{s.type && <Badge variant="outline" className="text-[10px]">{s.type}</Badge>}</div>
              {s.supports && <div className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{s.supports}</div>}
            </div>
            <div className="flex flex-col gap-1 shrink-0">
              <Button size="sm" variant="outline" onClick={() => toggleSaved.mutate({ projectId, sourceId: s.id, saved: false })}><BookmarkCheck className="h-3.5 w-3.5 mr-1" />Remove</Button>
              {s.officialSite && <a href={s.officialSite} target="_blank" rel="noreferrer"><Button size="sm" variant="ghost" className="w-full"><ExternalLink className="h-3.5 w-3.5 mr-1" />Site</Button></a>}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function AppsTab() {
  const apps = trpc.funding.applicationsList.useQuery();
  const setStatus = trpc.funding.setApplicationStatus.useMutation({
    onSuccess: () => { toast.success("Status updated"); apps.refetch(); },
  });
  const [statusDialog, setStatusDialog] = useState<{ appId: number; status: string; label: string; notes: string } | null>(null);
  const submitStatusDialog = () => {
    if (!statusDialog) return;
    setStatus.mutate({ applicationId: statusDialog.appId as any, status: statusDialog.status as any, notes: statusDialog.notes.trim() || undefined });
    setStatusDialog(null);
  };
  const list = (apps.data || []) as any[];
  if (list.length === 0) return <Card><CardContent className="pt-6 text-center text-muted-foreground glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">No applications submitted yet. Submitted applications will appear here automatically with status tracking.</CardContent></Card>;
  const counts = list.reduce((acc: any, a: any) => { acc[a.status] = (acc[a.status] || 0) + 1; return acc; }, {});
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {Object.keys(STATUS_META).map(k => (
          <Card key={k}><CardContent className="pt-3 pb-3 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow"><div className="text-[10px] uppercase text-muted-foreground">{STATUS_META[k].label}</div><div className="text-xl font-bold">{counts[k] || 0}</div></CardContent></Card>
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2 gradient-text-gold glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow"><FileText className="h-4 w-4" />My Applications ({list.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
          {list.slice().reverse().map((a: any) => {
            const meta = STATUS_META[a.status] || STATUS_META.submitted;
            const Icon = meta.icon;
            return (
              <div key={a.id} className="border border-border rounded-lg p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold">{a.projectTitle} Ã¢ÂÂ {a.organization}</div>
                    <div className="text-xs text-muted-foreground">{a.country} ÃÂ· submitted {new Date(a.submittedAt).toLocaleDateString()}{a.updatedAt && ` ÃÂ· updated ${new Date(a.updatedAt).toLocaleDateString()}`}</div>
                    {a.notes && <div className="text-xs text-muted-foreground mt-1.5 italic">"{a.notes}"</div>}
                  </div>
                  <Badge className={meta.color}><Icon className="h-3 w-3 mr-1" />{meta.label}</Badge>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {Object.keys(STATUS_META).map(k => k !== a.status && (
                    <Button key={k} size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => setStatusDialog({ appId: a.id, status: k, label: STATUS_META[k].label, notes: a.notes || "" })} aria-label={`Change status to ${STATUS_META[k].label}`}>Ã¢ÂÂ {STATUS_META[k].label}</Button>
                  ))}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Dialog open={!!statusDialog} onOpenChange={(o) => { if (!o) setStatusDialog(null); }}>
        <DialogContent className="glass-dark">
          <DialogHeader>
            <DialogTitle className="gradient-text-gold">Change status to "{statusDialog?.label}"</DialogTitle>
            <DialogDescription>Add an optional note explaining the status change.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="status-notes">Note (optional)</Label>
            <Textarea
              id="status-notes"
              rows={3}
              value={statusDialog?.notes || ""}
              onChange={(e) => setStatusDialog((s) => s ? { ...s, notes: e.target.value } : s)}
              placeholder="e.g. Funder asked for revisions, follow-up call scheduled, etc."
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialog(null)}>Cancel</Button>
            <Button onClick={submitStatusDialog} disabled={setStatus.isPending}>Update status</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AutofillTab({ projectId }: { projectId: number }) {
  const sources = trpc.funding.list.useQuery({});
  const [sourceId, setSourceId] = useState<number | null>(null);
  const [draft, setDraft] = useState<any | null>(null);
  const autofill = trpc.funding.autofillDraft.useMutation({
    onSuccess: (r: any) => { setDraft(r.draft); toast.success(`Draft generated (charged ${r.costCharged} credits)`); },
    onError: (e: any) => toast.error(e?.message || "Autofill failed"),
  });
  const src = (sources.data || []).find((s: any) => s.id === sourceId);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2 gradient-text-gold glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow"><Wand2 className="h-4 w-4 text-violet-400" />AI Application Drafter</CardTitle>
        <div className="text-xs text-muted-foreground">Pick a funder; we'll draft tailored application copy from your project bible. Costs ~3 credits.</div>
      </CardHeader>
      <CardContent className="space-y-3 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
        <div className="flex gap-2 items-end">
          <div className="flex-1"><Label className="text-xs">Funding source</Label>
            <Select value={sourceId ? String(sourceId) : ""} onValueChange={v => { setSourceId(Number(v)); setDraft(null); }}>
              <SelectTrigger><SelectValue placeholder="Pick a funderÃ¢ÂÂ¦" /></SelectTrigger>
              <SelectContent>{(sources.data || []).slice(0, 200).map((s: any) => <SelectItem key={s.id} value={String(s.id)}>{s.organization} ({s.country})</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Button onClick={() => sourceId && autofill.mutate({ projectId, fundingSourceId: sourceId })} disabled={!sourceId || autofill.isPending}>
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />{autofill.isPending ? "DraftingÃ¢ÂÂ¦" : "Generate Draft"}
          </Button>
        </div>
        {src && <div className="text-xs text-muted-foreground border border-border rounded p-2"><strong>{src.organization}</strong> Ã¢ÂÂ {src.supports || src.eligibility || "Ã¢ÂÂ"}</div>}
        {draft && (
          <div className="space-y-2">
            {Object.entries(draft).map(([k, v]: [string, any]) => (
              <div key={k}><Label className="text-xs uppercase tracking-wider text-muted-foreground text-amber-400/60">{k.replace(/([A-Z])/g, " $1")}</Label>
                {String(v).length > 80 ? <Textarea value={String(v)} readOnly rows={3} className="text-sm" /> : <Input value={String(v)} readOnly className="text-sm" />}
              </div>
            ))}
            <div className="text-[11px] text-muted-foreground">Copy these into the application form on the directory page. Saved automatically once you submit.</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
