import { useState, useMemo, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Save, Plus, Trash2, MessageSquare, Palette, GitBranch, ListOrdered, Package, Scale, Send, ScrollText, Layers, Scissors, Download, Gauge, Users, Pause, Play, RotateCcw, Eraser, Zap, Lock, Unlock, Sparkles, Calculator, CheckCheck, DollarSign, Clock, TrendingUp, ThumbsUp, ThumbsDown } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

/* ─── Live Presence Bar (heartbeats every 12s, polls every 6s) ─── */
function PresenceBar({ projectId, tab }: { projectId: number; tab: string }) {
  const heartbeat = trpc.presence.heartbeat.useMutation();
  const list = trpc.presence.list.useQuery({ projectId }, { refetchInterval: 6000 });
  const tabRef = useRef(tab);
  useEffect(() => { tabRef.current = tab; }, [tab]);
  useEffect(() => {
    const ping = () => { heartbeat.mutate({ projectId, tab: tabRef.current }); };
    ping();
    const id = setInterval(ping, 12000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);
  const users = (list.data || []) as any[];
  if (users.length === 0) return null;
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <Users className="h-3.5 w-3.5" />
      <span>{users.length} live</span>
      <div className="flex -space-x-1">
        {users.slice(0, 6).map((u: any, i: number) => {
          const initial = (u.email || "?").charAt(0).toUpperCase();
          return (
            <div key={i} title={`${u.email || "user"} · ${u.tab || ""}`} className="h-6 w-6 rounded-full bg-emerald-600/80 text-white text-[10px] flex items-center justify-center border border-background ring-1 ring-emerald-400/30">
              {initial}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const uid = () => `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export default function ProStudioOps() {
  const { projectId: pidParam } = useParams<{ projectId: string }>();
  const projectId = Number(pidParam);
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");

  // ─── Pro NLE keyboard shortcuts (only when not typing in form fields) ───
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      const map: Record<string, string> = {
        "1": "dashboard", "2": "comments", "3": "color", "4": "versions", "5": "queue",
        "6": "deliver", "7": "clear", "8": "dist", "9": "audit", "0": "cuts",
        "d": "dashboard", "f": "comments", "q": "queue", "p": "deliver", "x": "cuts", "l": "locks",
        "a": "approvals", "b": "budget",
      };
      if (map[e.key]) { setActiveTab(map[e.key]); e.preventDefault(); }
      else if (e.key === "?") { toast.info("Shortcuts: 1-0 = tabs · D Dashboard · F Frames · Q Queue · P Deliverables · L Locks · A Approvals · B Budget · X Cuts"); e.preventDefault(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  if (!isAuthenticated) { if (typeof window !== "undefined") window.location.href = "/login"; return null; }
  if (!projectId) return <div className="p-8 text-sm text-muted-foreground">Invalid project.</div>;

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl overflow-x-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/projects/${projectId}`)} aria-label="Back to project"><ArrowLeft className="h-4 w-4" aria-hidden="true" /></Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold gradient-text-gold">Studio Operations</h1>
          <p className="text-xs text-muted-foreground">Pro production workflow · live multi-user collab · server-enforced render budget · NLE shortcuts (press ?)</p>
        </div>
        <PresenceBar projectId={projectId} tab={activeTab} />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap gap-1 h-auto mb-4">
          <TabsTrigger value="dashboard"><Gauge className="h-3.5 w-3.5 mr-1.5" />Dashboard</TabsTrigger>
          <TabsTrigger value="comments"><MessageSquare className="h-3.5 w-3.5 mr-1.5" />Frame Reviews</TabsTrigger>
          <TabsTrigger value="color"><Palette className="h-3.5 w-3.5 mr-1.5" />Color</TabsTrigger>
          <TabsTrigger value="versions"><GitBranch className="h-3.5 w-3.5 mr-1.5" />Asset Versions</TabsTrigger>
          <TabsTrigger value="queue"><ListOrdered className="h-3.5 w-3.5 mr-1.5" />Render Queue</TabsTrigger>
          <TabsTrigger value="deliver"><Package className="h-3.5 w-3.5 mr-1.5" />Deliverables</TabsTrigger>
          <TabsTrigger value="clear"><Scale className="h-3.5 w-3.5 mr-1.5" />Clearances</TabsTrigger>
          <TabsTrigger value="dist"><Send className="h-3.5 w-3.5 mr-1.5" />Distribution</TabsTrigger>
          <TabsTrigger value="audit"><ScrollText className="h-3.5 w-3.5 mr-1.5" />Audit Log</TabsTrigger>
          <TabsTrigger value="proxy"><Layers className="h-3.5 w-3.5 mr-1.5" />Proxy Chain</TabsTrigger>
          <TabsTrigger value="cuts"><Scissors className="h-3.5 w-3.5 mr-1.5" />Cuts & Transitions</TabsTrigger>
          <TabsTrigger value="locks"><Lock className="h-3.5 w-3.5 mr-1.5" />Locks</TabsTrigger>
          <TabsTrigger value="approvals"><CheckCheck className="h-3.5 w-3.5 mr-1.5" />Approvals</TabsTrigger>
          <TabsTrigger value="budget"><DollarSign className="h-3.5 w-3.5 mr-1.5" />Budget & Savings</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard"><StudioDashboardTab projectId={projectId} /></TabsContent>
        <TabsContent value="comments"><FrameCommentsTab projectId={projectId} /></TabsContent>
        <TabsContent value="color"><ColorTab projectId={projectId} /></TabsContent>
        <TabsContent value="versions"><AssetVersionsTab projectId={projectId} /></TabsContent>
        <TabsContent value="queue"><RenderQueueTab projectId={projectId} /></TabsContent>
        <TabsContent value="deliver"><DeliverablesTab projectId={projectId} /></TabsContent>
        <TabsContent value="clear"><ClearancesTab projectId={projectId} /></TabsContent>
        <TabsContent value="dist"><DistributionTab projectId={projectId} /></TabsContent>
        <TabsContent value="audit"><AuditTab projectId={projectId} /></TabsContent>
        <TabsContent value="proxy"><ProxyTab projectId={projectId} /></TabsContent>
        <TabsContent value="cuts"><CutsTab projectId={projectId} /></TabsContent>
        <TabsContent value="locks"><LocksTab projectId={projectId} /></TabsContent>
        <TabsContent value="approvals"><ApprovalsTab projectId={projectId} /></TabsContent>
        <TabsContent value="budget"><StudioBudgetTab projectId={projectId} /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ─── Studio Dashboard: single pane of glass for production readiness ─── */
function StudioDashboardTab({ projectId }: { projectId: number }) {
  const summary = trpc.studioDashboard.summary.useQuery({ projectId }, { refetchInterval: 8000 });
  const d = summary.data as any;
  if (!d) return <div className="p-6 text-sm text-muted-foreground">Loading studio metrics…</div>;
  const burn = d.spend.burnPct;
  const burnColor = burn == null ? "text-muted-foreground" : burn > 90 ? "text-rose-400" : burn > 70 ? "text-amber-400" : "text-emerald-400";
  const readyColor = d.readiness > 80 ? "text-emerald-400" : d.readiness > 50 ? "text-amber-400" : "text-rose-400";
  return (
    <div className="min-h-screen pb-10" style={{ background:"linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)" }}>
    <div className="max-w-7xl mx-auto space-y-4 px-4 py-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4 glass-card">
          <div className="text-xs text-muted-foreground">Production Readiness</div>
          <div className={`text-3xl font-bold ${readyColor}`}>{d.readiness}%</div>
          <div className="text-[11px] text-muted-foreground mt-1">{d.scenes.withVideo}/{d.scenes.total} scenes rendered</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 glass-card">
          <div className="text-xs text-muted-foreground">Render Queue</div>
          <div className="text-3xl font-bold">{d.queue.queued + d.queue.running}</div>
          <div className="text-[11px] text-muted-foreground mt-1">
            <span className="text-blue-400">{d.queue.running} running</span> · <span>{d.queue.queued} queued</span>
            {d.queue.failed > 0 && <span className="text-rose-400"> · {d.queue.failed} failed</span>}
            {d.queue.paused > 0 && <span className="text-amber-400"> · {d.queue.paused} paused</span>}
          </div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 glass-card">
          <div className="text-xs text-muted-foreground">Today's Render Spend</div>
          <div className={`text-3xl font-bold ${burnColor}`}>{d.spend.today}<span className="text-sm font-normal text-muted-foreground">cr</span></div>
          <div className="text-[11px] text-muted-foreground mt-1">
            {d.spend.dailyCap != null ? `${burn ?? 0}% of ${d.spend.dailyCap}cr daily cap` : "No cap set"}
          </div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 glass-card">
          <div className="text-xs text-muted-foreground">Active Collaborators</div>
          <div className="text-3xl font-bold text-emerald-400">{d.activeUsers}</div>
          <div className="text-[11px] text-muted-foreground mt-1">live in last 45s</div>
        </CardContent></Card>
      </div>
      {d.savings && d.savings.renderedScenes > 0 && (
        <Card className="border-emerald-500/40 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent glass-card">
          <CardContent className="pt-5 pb-5 glass-card">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-emerald-300/80 mb-2"><TrendingUp className="h-3.5 w-3.5" />Virelle vs Traditional Production</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-xs text-muted-foreground flex items-center gap-1.5"><DollarSign className="h-3 w-3" />Money saved</div>
                <div className="text-3xl font-bold text-emerald-400">${d.savings.moneySavedUsd.toLocaleString()}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">vs ${d.savings.tradEquivalentUsd.toLocaleString()} traditional · spent ${d.savings.spentUsd.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground flex items-center gap-1.5"><Clock className="h-3 w-3" />Time saved</div>
                <div className="text-3xl font-bold text-teal-400">{d.savings.timeSavedDays} days</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">{d.savings.renderedScenes} scenes rendered · ~1 shoot day each</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground flex items-center gap-1.5"><Sparkles className="h-3 w-3" />Cost multiplier</div>
                <div className="text-3xl font-bold text-violet-300">{d.savings.savingsMultiplier ? `${d.savings.savingsMultiplier}×` : "—"}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">cheaper than shooting traditional</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      {d.approvals && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Card><CardContent className="pt-3 pb-3 glass-card"><div className="text-[10px] uppercase text-muted-foreground">Fully Approved</div><div className="text-xl font-bold text-emerald-400">{d.approvals.fullyApproved}</div></CardContent></Card>
          <Card><CardContent className="pt-3 pb-3 glass-card"><div className="text-[10px] uppercase text-muted-foreground">Partial Sign-off</div><div className="text-xl font-bold text-amber-400">{d.approvals.partial}</div></CardContent></Card>
          <Card><CardContent className="pt-3 pb-3 glass-card"><div className="text-[10px] uppercase text-muted-foreground">Pending Review</div><div className="text-xl font-bold text-muted-foreground">{d.approvals.pending}</div></CardContent></Card>
          <Card><CardContent className="pt-3 pb-3 glass-card"><div className="text-[10px] uppercase text-muted-foreground">Rejected</div><div className="text-xl font-bold text-rose-400">{d.approvals.rejected}</div></CardContent></Card>
        </div>
      )}
      {d.forecast && (
        <Card className="border-violet-500/30 bg-violet-500/5 glass-card"><CardContent className="pt-4 flex flex-wrap items-center justify-between gap-3 glass-card">
          <div className="flex items-center gap-3">
            <Calculator className="h-5 w-5 text-violet-400" />
            <div>
              <div className="text-xs text-muted-foreground">Production Cost Forecast</div>
              <div className="text-base font-semibold">{d.forecast.unrenderedScenes} scenes left to render · est <span className="text-violet-300">{d.forecast.estimatedCredits} credits</span></div>
            </div>
          </div>
          <div className="text-[11px] text-muted-foreground">
            {d.spend.dailyCap != null ? `≈ ${Math.ceil(d.forecast.estimatedCredits / d.spend.dailyCap)} day(s) at current daily cap` : "No daily cap set"}
            {d.scenes.locked > 0 && <span className="ml-3 text-amber-400">· 🔒 {d.scenes.locked} locked scene(s)</span>}
          </div>
        </CardContent></Card>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card><CardHeader><CardTitle className="text-sm flex items-center gap-2 gradient-text-gold glass-card"><MessageSquare className="h-4 w-4" />Frame Reviews</CardTitle></CardHeader><CardContent>
          <div className="flex items-baseline gap-3"><div className="text-2xl font-bold">{d.comments.open}</div><div className="text-xs text-muted-foreground">open · {d.comments.resolved} resolved</div></div>
          {d.comments.open > 0 && <div className="text-[11px] text-amber-400 mt-1">⚠ awaiting director attention</div>}
        </CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm flex items-center gap-2 gradient-text-gold glass-card"><Package className="h-4 w-4" />Deliverables</CardTitle></CardHeader><CardContent>
          <div className="flex items-baseline gap-3"><div className="text-2xl font-bold">{d.deliverables.ready}/{d.deliverables.total}</div><div className="text-xs text-muted-foreground">ready</div></div>
          {d.deliverables.total > 0 && d.deliverables.ready < d.deliverables.total && <div className="text-[11px] text-muted-foreground mt-1">{d.deliverables.total - d.deliverables.ready} pending packaging</div>}
        </CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm flex items-center gap-2 gradient-text-gold glass-card"><Scale className="h-4 w-4" />Clearances</CardTitle></CardHeader><CardContent>
          <div className="flex items-baseline gap-3"><div className="text-2xl font-bold">{d.clearances.total - d.clearances.pending}/{d.clearances.total}</div><div className="text-xs text-muted-foreground">cleared</div></div>
          {d.clearances.pending > 0 && <div className="text-[11px] text-rose-400 mt-1">⚠ {d.clearances.pending} blocking distribution</div>}
        </CardContent></Card>
      </div>
      {d.queue.cap?.pauseOnExceed && (
        <Card className="border-emerald-500/30 bg-emerald-500/5 glass-card"><CardContent className="pt-4 glass-card">
          <div className="text-xs text-emerald-400 font-medium flex items-center gap-2"><Zap className="h-3.5 w-3.5" />Render Queue Executor active</div>
          <div className="text-[11px] text-muted-foreground mt-1">Server-side enforcement: per-job cap {d.queue.cap.perJobCredits ?? "—"}cr · daily cap {d.queue.cap.dailyCredits ?? "—"}cr · jobs over cap will be rejected at the generation chokepoint.</div>
        </CardContent></Card>
      )}
    </div>
  );
}

function useScenes(projectId: number) {
  return trpc.scene.listByProject.useQuery({ projectId });
}

/* ─── Frame Comments ─── */
function FrameCommentsTab({ projectId }: { projectId: number }) {
  const scenes = useScenes(projectId);
  const all = trpc.frameComments.list.useQuery({ projectId }, { refetchInterval: 6000 });
  const save = trpc.frameComments.save.useMutation({ onSuccess: () => { toast.success("Comments saved"); all.refetch(); } });
  const audit = trpc.auditLog.append.useMutation();
  const { user } = useAuth();
  const [sel, setSel] = useState<number | null>(null);
  const sceneList = (scenes.data || []) as any[];
  const sceneId = sel ?? sceneList[0]?.id ?? null;
  const map = useMemo(() => { const m = new Map<number, any[]>(); for (const v of (all.data || [])) m.set(v.sceneId, v.comments); return m; }, [all.data]);
  const [draft, setDraft] = useState<any[] | null>(null);
  const live: any[] = draft ?? (sceneId != null ? map.get(sceneId) || [] : []);
  const [text, setText] = useState(""); const [tc, setTc] = useState(""); const [role, setRole] = useState("director");
  const add = () => { if (!text.trim() || sceneId == null) return; setDraft([...live, { id: uid(), author: (user as any)?.email || "user", role, timecode: tc || undefined, text, status: "open", createdAt: new Date().toISOString() }]); setText(""); setTc(""); };
  const setStatus = (i: number, s: any) => { const next = [...live]; next[i] = { ...next[i], status: s }; setDraft(next); };
  const remove = (i: number) => setDraft(live.filter((_, j) => j !== i));
  const persist = () => { if (sceneId == null || !draft) return; save.mutate({ projectId, sceneId, comments: live }); audit.mutate({ projectId, event: { action: "frameComments.save", targetType: "scene", targetId: String(sceneId), summary: `Updated ${live.length} comments on scene ${sceneId}` } }); setDraft(null); };

  return (
    <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-4">
      <Card><CardHeader><CardTitle className="text-sm gradient-text-gold glass-card">Scenes</CardTitle></CardHeader>
        <CardContent className="p-2 max-h-[60vh] overflow-y-auto glass-card">
          {sceneList.map(s => (
            <button key={s.id} onClick={() => { setSel(s.id); setDraft(null); }} className={`w-full text-left p-2 rounded text-xs hover:bg-muted/50 ${sceneId === s.id ? "bg-muted/70 ring-1 ring-primary/30" : ""}`}>
              <div className="font-medium truncate">{s.title || s.name || `Scene ${s.id}`}</div>
              <div className="text-[10px] text-muted-foreground">{(map.get(s.id) || []).length} comments · {(map.get(s.id) || []).filter(c => c.status === "open").length} open</div>
            </button>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-sm gradient-text-gold glass-card">Review Thread</CardTitle><p className="text-xs text-muted-foreground">Frame.io-style timecoded reviews. Roles, statuses, sign-off list.</p></CardHeader>
        <CardContent className="space-y-2 glass-card">
          {live.length === 0 && <p className="text-xs text-muted-foreground">No comments yet.</p>}
          {live.map((c, i) => (
            <div key={c.id} className={`border rounded p-2 ${c.status === "approved" ? "border-emerald-500/40 bg-emerald-500/5" : c.status === "resolved" ? "border-blue-500/30" : "border-amber-500/30 bg-amber-500/5"}`}>
              <div className="flex items-center gap-2 text-xs">
                <Badge variant="outline" className="text-[9px]">{c.role}</Badge>
                <span className="font-medium">{c.author}</span>
                {c.timecode && <span className="font-mono text-muted-foreground">@ {c.timecode}</span>}
                <span className="text-muted-foreground ml-auto">{new Date(c.createdAt).toLocaleString()}</span>
              </div>
              <p className="text-sm mt-1 whitespace-pre-wrap">{c.text}</p>
              <div className="flex gap-1 mt-1.5">
                <Button size="sm" variant={c.status === "open" ? "default" : "outline"} className="h-6 text-[10px] px-2" onClick={() => setStatus(i, "open")}>open</Button>
                <Button size="sm" variant={c.status === "resolved" ? "default" : "outline"} className="h-6 text-[10px] px-2" onClick={() => setStatus(i, "resolved")}>resolved</Button>
                <Button size="sm" variant={c.status === "approved" ? "default" : "outline"} className="h-6 text-[10px] px-2" onClick={() => setStatus(i, "approved")}>approved</Button>
                <Button size="icon" variant="ghost" className="h-6 w-6 ml-auto" onClick={() => remove(i)} aria-label="Delete note"><Trash2 className="h-3 w-3 text-destructive" aria-hidden="true" /></Button>
              </div>
            </div>
          ))}
          {sceneId != null && (
            <div className="border-t pt-2 space-y-2">
              <div className="flex gap-2">
                <Select value={role} onValueChange={setRole}><SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent>{["director","producer","editor","colorist","sound","vfx","client"].map(r => <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>)}</SelectContent></Select>
                <Input placeholder="00:01:23:14" value={tc} onChange={e => setTc(e.target.value)} className="h-8 text-xs max-w-[140px] font-mono" />
              </div>
              <Textarea rows={2} value={text} onChange={e => setText(e.target.value)} placeholder="Add a review note..." className="text-xs" />
              <div className="flex justify-between"><Button size="sm" onClick={add}><Plus className="h-3.5 w-3.5 mr-1" />Add Comment</Button><Button size="sm" onClick={persist} disabled={!draft || save.isPending}><Save className="h-3.5 w-3.5 mr-1.5" />Save Thread</Button></div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── Color Pipeline ─── */
function ColorTab({ projectId }: { projectId: number }) {
  const scenes = useScenes(projectId);
  const all = trpc.colorPipeline.list.useQuery({ projectId });
  const save = trpc.colorPipeline.save.useMutation({ onSuccess: () => { toast.success("Color saved"); all.refetch(); } });
  const audit = trpc.auditLog.append.useMutation();
  const [sel, setSel] = useState<number | null>(null);
  const sceneList = (scenes.data || []) as any[];
  const sceneId = sel ?? sceneList[0]?.id ?? null;
  const map = useMemo(() => { const m = new Map<number, any>(); for (const v of (all.data || [])) m.set(v.sceneId, v.data); return m; }, [all.data]);
  const def = { slope: [1,1,1] as [number,number,number], offset: [0,0,0] as [number,number,number], power: [1,1,1] as [number,number,number], saturation: 1, lutName: "", lutUrl: "", colorSpace: "rec709", gamma: "2.4" };
  const [draft, setDraft] = useState<any | null>(null);
  const live = draft ?? (sceneId != null ? (map.get(sceneId) || def) : def);
  const setVec = (k: "slope"|"offset"|"power", i: number, v: number) => { const next = { ...live, [k]: [...live[k]] }; next[k][i] = v; setDraft(next); };
  const persist = () => { if (sceneId == null || !draft) return; save.mutate({ projectId, sceneId, data: live }); audit.mutate({ projectId, event: { action: "colorPipeline.save", targetType: "scene", targetId: String(sceneId), summary: `Saved CDL for scene ${sceneId}` } }); setDraft(null); };

  return (
    <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-4">
      <Card><CardHeader><CardTitle className="text-sm gradient-text-gold glass-card">Scenes</CardTitle></CardHeader>
        <CardContent className="p-2 max-h-[60vh] overflow-y-auto glass-card">
          {sceneList.map(s => (
            <button key={s.id} onClick={() => { setSel(s.id); setDraft(null); }} className={`w-full text-left p-2 rounded text-xs hover:bg-muted/50 ${sceneId === s.id ? "bg-muted/70 ring-1 ring-primary/30" : ""}`}>
              <div className="font-medium truncate">{s.title || s.name || `Scene ${s.id}`}</div>
              {map.has(s.id) && <Badge variant="outline" className="text-[9px] mt-0.5">CDL set</Badge>}
            </button>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-sm gradient-text-gold glass-card">CDL + LUT + Color Space</CardTitle><p className="text-xs text-muted-foreground">ASC-CDL slope/offset/power/saturation per shot for DI handoff.</p></CardHeader>
        <CardContent className="space-y-3 glass-card">
          {(["slope","offset","power"] as const).map(k => (
            <div key={k}>
              <Label className="text-xs uppercase">{k}</Label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                {["R","G","B"].map((ch, i) => (
                  <div key={ch}><Label className="text-[10px] text-muted-foreground">{ch}</Label><Input type="number" step="0.01" value={live[k][i]} onChange={e => setVec(k, i, Number(e.target.value))} className="h-8 text-xs font-mono" /></div>
                ))}
              </div>
            </div>
          ))}
          <div><Label className="text-xs">Saturation</Label><Input type="number" step="0.01" value={live.saturation} onChange={e => setDraft({ ...live, saturation: Number(e.target.value) })} className="h-8 text-xs font-mono max-w-[120px]" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">LUT Name</Label><Input value={live.lutName || ""} onChange={e => setDraft({ ...live, lutName: e.target.value })} placeholder="Arri LogC → Rec709" className="h-8 text-xs" /></div>
            <div><Label className="text-xs">LUT URL</Label><Input value={live.lutUrl || ""} onChange={e => setDraft({ ...live, lutUrl: e.target.value })} placeholder="https://....cube" className="h-8 text-xs" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Color Space</Label>
              <Select value={live.colorSpace} onValueChange={v => setDraft({ ...live, colorSpace: v })}><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent>{["rec709","rec2020","aces_cg","aces_cct","p3_d65","s_log3","arri_logc","display_p3"].map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent></Select>
            </div>
            <div><Label className="text-xs">Gamma / EOTF</Label>
              <Select value={live.gamma || "2.4"} onValueChange={v => setDraft({ ...live, gamma: v })}><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent>{["2.2","2.4","2.6","srgb","pq_st2084","hlg","linear"].map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent></Select>
            </div>
          </div>
          <Button size="sm" onClick={persist} disabled={!draft || save.isPending}><Save className="h-3.5 w-3.5 mr-1.5" />Save Color</Button>
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── Asset Versions ─── */
function AssetVersionsTab({ projectId }: { projectId: number }) {
  const list = trpc.assetVersions.list.useQuery({ projectId });
  const snap = trpc.assetVersions.snapshot.useMutation({ onSuccess: () => { toast.success("Snapshot saved"); list.refetch(); } });
  const audit = trpc.auditLog.append.useMutation();
  const [form, setForm] = useState<any>({ assetType: "script", label: "", notes: "", payloadUrl: "", checksum: "" });
  const submit = () => { if (!form.label) return; snap.mutate({ projectId, ...form, notes: form.notes || undefined, payloadUrl: form.payloadUrl || undefined, checksum: form.checksum || undefined }); audit.mutate({ projectId, event: { action: "assetVersions.snapshot", targetType: form.assetType, summary: `Snapshot: ${form.label}` } }); setForm({ ...form, label: "", notes: "", payloadUrl: "", checksum: "" }); };
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card><CardHeader><CardTitle className="text-sm gradient-text-gold glass-card">New Snapshot</CardTitle><p className="text-xs text-muted-foreground">Pin a version of any project asset for rollback or audit.</p></CardHeader>
        <CardContent className="space-y-2 glass-card">
          <div><Label className="text-xs">Asset Type</Label>
            <Select value={form.assetType} onValueChange={v => setForm({ ...form, assetType: v })}><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent>{["script","schedule","budget","edl","audio_stems","color_grade"].map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent></Select>
          </div>
          <div><Label className="text-xs">Version Label</Label><Input value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} placeholder="v3 — investor draft" className="h-8 text-xs" /></div>
          <div><Label className="text-xs">Payload URL (optional)</Label><Input value={form.payloadUrl} onChange={e => setForm({ ...form, payloadUrl: e.target.value })} placeholder="https://...pdf / .fdx / .edl" className="h-8 text-xs" /></div>
          <div><Label className="text-xs">Checksum (optional)</Label><Input value={form.checksum} onChange={e => setForm({ ...form, checksum: e.target.value })} placeholder="sha256:..." className="h-8 text-xs font-mono" /></div>
          <div><Label className="text-xs">Notes</Label><Textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="text-xs" /></div>
          <Button size="sm" onClick={submit} disabled={snap.isPending || !form.label}><Plus className="h-3.5 w-3.5 mr-1.5" />Snapshot</Button>
        </CardContent>
      </Card>
      <Card><CardHeader><CardTitle className="text-sm gradient-text-gold glass-card">Version History</CardTitle></CardHeader>
        <CardContent className="space-y-1.5 max-h-[60vh] overflow-y-auto glass-card">
          {(list.data || []).length === 0 && <p className="text-xs text-muted-foreground">No snapshots yet.</p>}
          {(list.data || []).map((v: any) => (
            <div key={v.id} className="border rounded p-2 text-xs">
              <div className="flex items-center gap-2"><Badge variant="outline" className="text-[9px]">{v.assetType}</Badge><span className="font-medium">{v.label}</span><span className="ml-auto text-muted-foreground">{new Date(v.createdAt).toLocaleString()}</span></div>
              {v.notes && <p className="text-muted-foreground mt-1">{v.notes}</p>}
              {v.payloadUrl && <a href={v.payloadUrl} target="_blank" rel="noreferrer" className="text-primary text-[10px] underline">{v.payloadUrl}</a>}
              {v.checksum && <div className="font-mono text-[9px] text-muted-foreground mt-0.5">{v.checksum}</div>}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── Render Queue ─── */
function RenderQueueTab({ projectId }: { projectId: number }) {
  const scenes = useScenes(projectId);
  const q = trpc.renderQueue.get.useQuery({ projectId }, { refetchInterval: 8000 });
  const save = trpc.renderQueue.save.useMutation({ onSuccess: () => { toast.success("Queue saved"); q.refetch(); } });
  const bulk = trpc.renderQueueBulk.run.useMutation({ onSuccess: (r: any) => { toast.success(`Bulk: ${r.changed} jobs updated`); q.refetch(); } });
  const audit = trpc.auditLog.append.useMutation();
  const runBulk = (action: "pauseAll"|"resumeAll"|"retryFailed"|"clearDone"|"startAllQueued") => { bulk.mutate({ projectId, action }); audit.mutate({ projectId, event: { action: `renderQueue.bulk.${action}`, summary: `Bulk ${action}` } }); };
  const runVid = trpc.scene.generateVideo.useMutation({
    onSuccess: () => { toast.success("Render kicked off — credits deducted, video generation in progress."); q.refetch(); },
    onError: (err: any) => { toast.error(err?.message || "Render failed"); q.refetch(); },
  });
  const runNow = (job: any) => {
    if (!job.sceneId) { toast.error("This job has no scene attached — set sceneId first."); return; }
    runVid.mutate({ sceneId: job.sceneId });
    audit.mutate({ projectId, event: { action: "renderQueue.runNow", targetType: "scene", targetId: String(job.sceneId), summary: `Run now: ${job.label}` } });
  };
  const [draft, setDraft] = useState<any | null>(null);
  const live = draft ?? q.data ?? { jobs: [], cap: { dailyCredits: 500, perJobCredits: 100, pauseOnExceed: true } };
  const update = (patch: any) => setDraft({ ...live, ...patch });
  const updateCap = (patch: any) => setDraft({ ...live, cap: { ...(live.cap || { dailyCredits: 500, perJobCredits: 100, pauseOnExceed: true }), ...patch } });
  const updateJob = (i: number, patch: any) => { const jobs = [...live.jobs]; jobs[i] = { ...jobs[i], ...patch }; setDraft({ ...live, jobs }); };
  const addJob = () => setDraft({ ...live, jobs: [...live.jobs, { id: uid(), label: "New render", sceneId: null, priority: "normal", model: "sora-2-pro", estimatedCredits: 50, maxRetries: 2, scheduledAt: null, status: "queued" }] });
  const removeJob = (i: number) => setDraft({ ...live, jobs: live.jobs.filter((_: any, j: number) => j !== i) });
  const moveUp = (i: number) => { if (i === 0) return; const jobs = [...live.jobs]; [jobs[i-1], jobs[i]] = [jobs[i], jobs[i-1]]; setDraft({ ...live, jobs }); };
  const persist = () => { save.mutate({ projectId, data: live }); audit.mutate({ projectId, event: { action: "renderQueue.save", summary: `Queue: ${live.jobs.length} jobs, cap=${live.cap?.dailyCredits || "—"}/day` } }); setDraft(null); };
  const dailyEstimate = live.jobs.filter((j: any) => j.status === "queued" || j.status === "running").reduce((s: number, j: any) => s + j.estimatedCredits, 0);
  const overCap = live.cap?.dailyCredits != null && dailyEstimate > live.cap.dailyCredits;

  return (
    <div className="space-y-4">
      <Card><CardHeader><CardTitle className="text-sm gradient-text-gold glass-card">Cost Caps</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3 glass-card">
          <div><Label className="text-xs">Daily credit cap</Label><Input type="number" value={live.cap?.dailyCredits ?? ""} onChange={e => updateCap({ dailyCredits: e.target.value ? Number(e.target.value) : null })} className="h-8 text-xs" /></div>
          <div><Label className="text-xs">Per-job cap</Label><Input type="number" value={live.cap?.perJobCredits ?? ""} onChange={e => updateCap({ perJobCredits: e.target.value ? Number(e.target.value) : null })} className="h-8 text-xs" /></div>
          <div className="flex items-end gap-2 pb-1"><Switch checked={!!live.cap?.pauseOnExceed} onCheckedChange={c => updateCap({ pauseOnExceed: c })} /><span className="text-xs">Pause queue if over cap</span></div>
        </CardContent>
      </Card>
      <Card><CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2 glass-card"><CardTitle className="text-sm gradient-text-gold glass-card">Queue ({live.jobs.length} jobs · est {dailyEstimate} cr {overCap && <span className="text-rose-400">⚠ over cap</span>})</CardTitle>
        <div className="flex flex-wrap gap-1">
          <Button size="sm" variant="outline" onClick={() => runBulk("startAllQueued")} disabled={bulk.isPending}><Play className="h-3.5 w-3.5 mr-1" />Start All</Button>
          <Button size="sm" variant="outline" onClick={() => runBulk("pauseAll")} disabled={bulk.isPending}><Pause className="h-3.5 w-3.5 mr-1" />Pause All</Button>
          <Button size="sm" variant="outline" onClick={() => runBulk("resumeAll")} disabled={bulk.isPending}>Resume Paused</Button>
          <Button size="sm" variant="outline" onClick={() => runBulk("retryFailed")} disabled={bulk.isPending}><RotateCcw className="h-3.5 w-3.5 mr-1" />Retry Failed</Button>
          <Button size="sm" variant="outline" onClick={() => runBulk("clearDone")} disabled={bulk.isPending}><Eraser className="h-3.5 w-3.5 mr-1" />Clear Done</Button>
          <Button size="sm" onClick={addJob}><Plus className="h-3.5 w-3.5 mr-1" />Add Job</Button>
        </div>
      </CardHeader>
        <CardContent className="space-y-2 glass-card">
          {live.jobs.map((j: any, i: number) => (
            <div key={j.id} className="border rounded p-2 grid grid-cols-12 gap-2 min-w-[600px] items-center text-xs">
              <Input value={j.label} onChange={e => updateJob(i, { label: e.target.value })} className="h-8 text-xs col-span-3" />
              <Select value={j.sceneId == null ? "none" : String(j.sceneId)} onValueChange={v => updateJob(i, { sceneId: v === "none" ? null : Number(v) })}><SelectTrigger className="h-8 text-xs col-span-2"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none" className="text-xs">— no scene —</SelectItem>{(scenes.data || []).map((s: any) => <SelectItem key={s.id} value={String(s.id)} className="text-xs">{s.title || `Scene ${s.id}`}</SelectItem>)}</SelectContent></Select>
              <Select value={j.priority} onValueChange={v => updateJob(i, { priority: v })}><SelectTrigger className="h-8 text-xs col-span-1"><SelectValue /></SelectTrigger><SelectContent>{["low","normal","high","urgent"].map(p => <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>)}</SelectContent></Select>
              <Input value={j.model} onChange={e => updateJob(i, { model: e.target.value })} className="h-8 text-xs col-span-2" placeholder="model" />
              <Input type="number" value={j.estimatedCredits} onChange={e => updateJob(i, { estimatedCredits: Number(e.target.value) })} className="h-8 text-xs col-span-1 font-mono" />
              <Select value={j.status} onValueChange={v => updateJob(i, { status: v })}><SelectTrigger className="h-8 text-xs col-span-2"><SelectValue /></SelectTrigger><SelectContent>{["queued","running","done","failed","paused","skipped"].map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}</SelectContent></Select>
              <div className="flex gap-0.5 col-span-1 justify-end">
                {(j.status === "queued" || j.status === "failed" || j.status === "paused") && (
                  <Button size="icon" variant="ghost" className="h-7 w-7" title="Run now (charge & generate)" onClick={() => runNow(j)} disabled={runVid.isPending} aria-label="Run job now (charge and generate)"><Sparkles className="h-3 w-3 text-violet-400" aria-hidden="true" /></Button>
                )}
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => moveUp(i)} aria-label="Move job up in queue"><span aria-hidden="true">↑</span></Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeJob(i)} aria-label="Remove job from queue"><Trash2 className="h-3 w-3 text-destructive" aria-hidden="true" /></Button>
              </div>
            </div>
          ))}
          <div className="flex justify-end pt-2"><Button size="sm" onClick={persist} disabled={save.isPending || !draft}><Save className="h-3.5 w-3.5 mr-1.5" />Save Queue</Button></div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── Deliverables ─── */
function DeliverablesTab({ projectId }: { projectId: number }) {
  const list = trpc.deliverables.list.useQuery({ projectId });
  const save = trpc.deliverables.save.useMutation({ onSuccess: () => { toast.success("Deliverables saved"); list.refetch(); } });
  const manifest = trpc.deliverables.manifest.useQuery({ projectId });
  const audit = trpc.auditLog.append.useMutation();
  const [draft, setDraft] = useState<any[] | null>(null);
  const live = draft ?? list.data ?? [];
  const update = (i: number, patch: any) => { const next = [...live]; next[i] = { ...next[i], ...patch }; setDraft(next); };
  const remove = (i: number) => setDraft(live.filter((_: any, j: number) => j !== i));
  const presets: any = { prores4444: { ar: "16:9", fps: 24, mix: "5.1" }, dcp_2k: { ar: "1.85:1", fps: 24, mix: "5.1" }, dcp_4k: { ar: "1.85:1", fps: 24, mix: "5.1" }, imf: { ar: "16:9", fps: 24, mix: "5.1" }, broadcast_safe: { ar: "16:9", fps: 23.976, mix: "stereo" }, youtube_4k: { ar: "16:9", fps: 24, mix: "stereo" }, tiktok_vertical: { ar: "9:16", fps: 30, mix: "stereo" }, instagram_square: { ar: "1:1", fps: 30, mix: "stereo" }, ig_reel: { ar: "9:16", fps: 30, mix: "stereo" }, x_landscape: { ar: "16:9", fps: 30, mix: "stereo" }, prores_proxy: { ar: "16:9", fps: 24, mix: "stereo" } };
  const add = (profile: string) => { const p = presets[profile]; setDraft([...live, { id: uid(), profile, label: profile.replace(/_/g, " "), aspectRatio: p.ar, frameRate: p.fps, audioMix: p.mix, captions: true, hdrPass: "sdr", status: "pending", createdAt: new Date().toISOString() }]); };
  const persist = () => { save.mutate({ projectId, specs: live }); audit.mutate({ projectId, event: { action: "deliverables.save", summary: `${live.length} delivery specs` } }); setDraft(null); };
  const downloadManifest = () => { if (!manifest.data) return; const blob = new Blob([JSON.stringify(manifest.data, null, 2)], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `delivery-manifest-${manifest.data.project.id}.json`; a.click(); URL.revokeObjectURL(a.href); };

  return (
    <div className="space-y-3">
      <Card><CardHeader><CardTitle className="text-sm gradient-text-gold glass-card">Add Deliverable Profile</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-1.5 glass-card">
          {Object.keys(presets).map(p => <Button key={p} size="sm" variant="outline" className="text-[10px] h-7" onClick={() => add(p)}><Plus className="h-3 w-3 mr-1" />{p.replace(/_/g, " ")}</Button>)}
        </CardContent>
      </Card>
      <Card><CardHeader className="flex flex-row items-center justify-between glass-card"><CardTitle className="text-sm gradient-text-gold glass-card">Deliverable Specs</CardTitle><div className="flex gap-2"><Button size="sm" variant="outline" onClick={downloadManifest} disabled={!manifest.data}><Download className="h-3.5 w-3.5 mr-1.5" />Manifest</Button><Button size="sm" onClick={persist} disabled={!draft || save.isPending}><Save className="h-3.5 w-3.5 mr-1.5" />Save</Button></div></CardHeader>
        <CardContent className="space-y-2 glass-card">
          {live.length === 0 && <p className="text-xs text-muted-foreground">No deliverables.</p>}
          {live.map((d: any, i: number) => (
            <div key={d.id} className="border rounded p-2 grid grid-cols-12 gap-2 min-w-[600px] items-center text-xs">
              <Badge className="col-span-2 justify-center text-[9px]">{d.profile}</Badge>
              <Input value={d.label} onChange={e => update(i, { label: e.target.value })} className="h-8 text-xs col-span-2" />
              <Input value={d.aspectRatio} onChange={e => update(i, { aspectRatio: e.target.value })} className="h-8 text-xs col-span-1" />
              <Input type="number" step="0.001" value={d.frameRate} onChange={e => update(i, { frameRate: Number(e.target.value) })} className="h-8 text-xs col-span-1 font-mono" />
              <Select value={d.audioMix} onValueChange={v => update(i, { audioMix: v })}><SelectTrigger className="h-8 text-xs col-span-1"><SelectValue /></SelectTrigger><SelectContent>{["stereo","5.1","7.1","atmos"].map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent></Select>
              <Select value={d.hdrPass || "sdr"} onValueChange={v => update(i, { hdrPass: v })}><SelectTrigger className="h-8 text-xs col-span-1"><SelectValue /></SelectTrigger><SelectContent>{["sdr","hdr10","dolby_vision"].map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent></Select>
              <Select value={d.status} onValueChange={v => update(i, { status: v })}><SelectTrigger className="h-8 text-xs col-span-2"><SelectValue /></SelectTrigger><SelectContent>{["pending","building","ready","failed"].map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent></Select>
              <div className="flex gap-1 col-span-2 justify-end items-center">
                <label className="flex items-center gap-1 text-[10px]"><input type="checkbox" checked={d.captions} onChange={e => update(i, { captions: e.target.checked })} />CC</label>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => remove(i)} aria-label="Remove deliverable"><Trash2 className="h-3 w-3 text-destructive" aria-hidden="true" /></Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── Clearances ─── */
function ClearancesTab({ projectId }: { projectId: number }) {
  const list = trpc.clearances.list.useQuery({ projectId });
  const save = trpc.clearances.save.useMutation({ onSuccess: () => { toast.success("Clearances saved"); list.refetch(); } });
  const audit = trpc.auditLog.append.useMutation();
  const [draft, setDraft] = useState<any[] | null>(null);
  const live = draft ?? list.data ?? [];
  const update = (i: number, patch: any) => { const next = [...live]; next[i] = { ...next[i], ...patch }; setDraft(next); };
  const remove = (i: number) => setDraft(live.filter((_: any, j: number) => j !== i));
  const add = (kind: string) => setDraft([...live, { id: uid(), kind, title: "", counterparty: "", status: "needed", territory: "Worldwide", term: "Perpetuity", feeUsd: 0 }]);
  const persist = () => { save.mutate({ projectId, records: live }); audit.mutate({ projectId, event: { action: "clearances.save", summary: `${live.length} clearance records` } }); setDraft(null); };

  return (
    <div className="space-y-3">
      <Card><CardHeader><CardTitle className="text-sm gradient-text-gold glass-card">Add Clearance</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-1.5 glass-card">
          {["music_sync","master_use","location_release","talent_release","ai_rider_sag","stock_footage","trademark"].map(k => <Button key={k} size="sm" variant="outline" className="text-[10px] h-7" onClick={() => add(k)}><Plus className="h-3 w-3 mr-1" />{k.replace(/_/g," ")}</Button>)}
        </CardContent>
      </Card>
      <Card><CardHeader className="flex flex-row items-center justify-between glass-card"><CardTitle className="text-sm gradient-text-gold glass-card">Clearance Tracker</CardTitle><Button size="sm" onClick={persist} disabled={!draft || save.isPending}><Save className="h-3.5 w-3.5 mr-1.5" />Save</Button></CardHeader>
        <CardContent className="space-y-2 glass-card">
          {live.length === 0 && <p className="text-xs text-muted-foreground">No clearances tracked.</p>}
          {live.map((c: any, i: number) => (
            <div key={c.id} className="border rounded p-2 space-y-1.5 text-xs">
              <div className="grid grid-cols-12 gap-2 min-w-[600px] items-center">
                <Badge variant="outline" className="col-span-2 justify-center text-[9px]">{c.kind}</Badge>
                <Input value={c.title} onChange={e => update(i, { title: e.target.value })} placeholder="Title (song/location/talent name)" className="h-8 text-xs col-span-3" />
                <Input value={c.counterparty} onChange={e => update(i, { counterparty: e.target.value })} placeholder="Rights holder" className="h-8 text-xs col-span-3" />
                <Select value={c.status} onValueChange={v => update(i, { status: v })}><SelectTrigger className="h-8 text-xs col-span-2"><SelectValue /></SelectTrigger><SelectContent>{["needed","requested","negotiating","signed","denied","not_required"].map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}</SelectContent></Select>
                <Input type="number" value={c.feeUsd ?? 0} onChange={e => update(i, { feeUsd: Number(e.target.value) })} placeholder="Fee USD" className="h-8 text-xs col-span-1 font-mono" />
                <Button size="icon" variant="ghost" className="h-7 w-7 col-span-1" onClick={() => remove(i)} aria-label="Remove clearance"><Trash2 className="h-3 w-3 text-destructive" aria-hidden="true" /></Button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Input value={c.territory || ""} onChange={e => update(i, { territory: e.target.value })} placeholder="Territory" className="h-7 text-xs" />
                <Input value={c.term || ""} onChange={e => update(i, { term: e.target.value })} placeholder="Term" className="h-7 text-xs" />
                <Input value={c.documentUrl || ""} onChange={e => update(i, { documentUrl: e.target.value })} placeholder="Document URL" className="h-7 text-xs" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── Distribution ─── */
function DistributionTab({ projectId }: { projectId: number }) {
  const list = trpc.distributionTargets.list.useQuery({ projectId });
  const save = trpc.distributionTargets.save.useMutation({ onSuccess: () => { toast.success("Distribution saved"); list.refetch(); } });
  const audit = trpc.auditLog.append.useMutation();
  const [draft, setDraft] = useState<any[] | null>(null);
  const live = draft ?? list.data ?? [];
  const update = (i: number, patch: any) => { const next = [...live]; next[i] = { ...next[i], ...patch }; setDraft(next); };
  const remove = (i: number) => setDraft(live.filter((_: any, j: number) => j !== i));
  const add = (platform: string) => setDraft([...live, { id: uid(), platform, label: platform, status: "draft" }]);
  const persist = () => { save.mutate({ projectId, targets: live }); audit.mutate({ projectId, event: { action: "distributionTargets.save", summary: `${live.length} distribution targets` } }); setDraft(null); };

  return (
    <div className="space-y-3">
      <Card><CardHeader><CardTitle className="text-sm gradient-text-gold glass-card">Add Distribution Target</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-1.5 glass-card">
          {["filmfreeway","vimeo_ott","prime_video_direct","youtube","tiktok","meta","x_video","tubi","plex","custom"].map(p => <Button key={p} size="sm" variant="outline" className="text-[10px] h-7" onClick={() => add(p)}><Plus className="h-3 w-3 mr-1" />{p.replace(/_/g," ")}</Button>)}
        </CardContent>
      </Card>
      <Card><CardHeader className="flex flex-row items-center justify-between glass-card"><CardTitle className="text-sm gradient-text-gold glass-card">Distribution Plan</CardTitle><Button size="sm" onClick={persist} disabled={!draft || save.isPending}><Save className="h-3.5 w-3.5 mr-1.5" />Save</Button></CardHeader>
        <CardContent className="space-y-2 glass-card">
          {live.length === 0 && <p className="text-xs text-muted-foreground">No targets yet.</p>}
          {live.map((t: any, i: number) => (
            <div key={t.id} className="border rounded p-2 grid grid-cols-12 gap-2 min-w-[600px] items-center text-xs">
              <Badge variant="outline" className="col-span-2 justify-center text-[9px]">{t.platform}</Badge>
              <Input value={t.label} onChange={e => update(i, { label: e.target.value })} className="h-8 text-xs col-span-3" />
              <Input value={t.accountHandle || ""} onChange={e => update(i, { accountHandle: e.target.value })} placeholder="@handle" className="h-8 text-xs col-span-2" />
              <Select value={t.status} onValueChange={v => update(i, { status: v })}><SelectTrigger className="h-8 text-xs col-span-2"><SelectValue /></SelectTrigger><SelectContent>{["draft","scheduled","submitted","live","rejected"].map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}</SelectContent></Select>
              <Input value={t.liveUrl || ""} onChange={e => update(i, { liveUrl: e.target.value })} placeholder="Live URL" className="h-8 text-xs col-span-2" />
              <Button size="icon" variant="ghost" className="h-7 w-7 col-span-1" onClick={() => remove(i)} aria-label="Remove takedown entry"><Trash2 className="h-3 w-3 text-destructive" aria-hidden="true" /></Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── Audit Log ─── */
function AuditTab({ projectId }: { projectId: number }) {
  const list = trpc.auditLog.list.useQuery({ projectId, limit: 500 });
  const download = () => { if (!list.data) return; const blob = new Blob([JSON.stringify(list.data, null, 2)], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `audit-log-project-${projectId}.json`; a.click(); URL.revokeObjectURL(a.href); };
  return (
    <Card><CardHeader className="flex flex-row items-center justify-between glass-card"><CardTitle className="text-sm gradient-text-gold glass-card">Activity Trail ({(list.data || []).length} events)</CardTitle><Button size="sm" variant="outline" onClick={download}><Download className="h-3.5 w-3.5 mr-1.5" />Export JSON</Button></CardHeader>
      <CardContent>
        <div className="max-h-[60vh] overflow-y-auto">
          {(list.data || []).length === 0 && <p className="text-xs text-muted-foreground">No activity recorded yet.</p>}
          {(list.data || []).map((e: any) => (
            <div key={e.id} className="border-b py-2 text-xs">
              <div className="flex items-center gap-2"><Badge variant="outline" className="text-[9px]">{e.action}</Badge>{e.targetType && <span className="text-muted-foreground">{e.targetType}{e.targetId ? `#${e.targetId}` : ""}</span>}<span className="ml-auto text-muted-foreground">{new Date(e.at).toLocaleString()}</span></div>
              <p className="mt-0.5">{e.summary}</p>
              <div className="text-[10px] text-muted-foreground">by {e.actorEmail || `user#${e.actorId}`}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Proxy Chain ─── */
function ProxyTab({ projectId }: { projectId: number }) {
  const scenes = useScenes(projectId);
  const all = trpc.proxyChain.list.useQuery({ projectId });
  const save = trpc.proxyChain.save.useMutation({ onSuccess: () => { toast.success("Proxy chain saved"); all.refetch(); } });
  const audit = trpc.auditLog.append.useMutation();
  const map = useMemo(() => { const m = new Map<number, any>(); for (const v of (all.data || [])) m.set(v.sceneId, v.data); return m; }, [all.data]);
  const [drafts, setDrafts] = useState<Record<number, any>>({});
  const def = { proxyStatus: "pending" as const, masterStatus: "pending" as const };
  const get = (id: number) => drafts[id] ?? map.get(id) ?? def;
  const update = (id: number, patch: any) => setDrafts({ ...drafts, [id]: { ...get(id), ...patch } });
  const persist = (id: number) => { const d = get(id); save.mutate({ projectId, sceneId: id, data: d }); audit.mutate({ projectId, event: { action: "proxyChain.save", targetType: "scene", targetId: String(id), summary: `proxy=${d.proxyStatus} master=${d.masterStatus}` } }); const next = { ...drafts }; delete next[id]; setDrafts(next); };

  return (
    <Card><CardHeader><CardTitle className="text-sm gradient-text-gold glass-card">Proxy → Master Conform</CardTitle><p className="text-xs text-muted-foreground">Edit on 1/4-res proxies, conform to full-res master only on final pass.</p></CardHeader>
      <CardContent className="space-y-2 max-h-[70vh] overflow-y-auto glass-card">
        {((scenes.data || []) as any[]).map(s => {
          const d = get(s.id); const dirty = drafts[s.id] != null;
          return (
            <div key={s.id} className="border rounded p-2 grid grid-cols-12 gap-2 min-w-[600px] items-center text-xs">
              <div className="col-span-2 truncate font-medium">{s.title || `Scene ${s.id}`}</div>
              <Input value={d.proxyUrl || ""} onChange={e => update(s.id, { proxyUrl: e.target.value })} placeholder="Proxy URL" className="h-8 text-xs col-span-3" />
              <Input value={d.proxyResolution || ""} onChange={e => update(s.id, { proxyResolution: e.target.value })} placeholder="540p" className="h-8 text-xs col-span-1" />
              <Select value={d.proxyStatus} onValueChange={v => update(s.id, { proxyStatus: v })}><SelectTrigger className="h-8 text-xs col-span-1"><SelectValue /></SelectTrigger><SelectContent>{["pending","ready","failed"].map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent></Select>
              <Input value={d.masterUrl || ""} onChange={e => update(s.id, { masterUrl: e.target.value })} placeholder="Master URL" className="h-8 text-xs col-span-3" />
              <Select value={d.masterStatus} onValueChange={v => update(s.id, { masterStatus: v })}><SelectTrigger className="h-8 text-xs col-span-1"><SelectValue /></SelectTrigger><SelectContent>{["pending","ready","failed"].map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent></Select>
              <Button size="icon" variant={dirty ? "default" : "ghost"} className="h-7 w-7 col-span-1" onClick={() => persist(s.id)} disabled={!dirty} aria-label={`Save deliverables for scene ${s.title || s.order}`}><Save className="h-3 w-3" aria-hidden="true" /></Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

/* ─── Cuts & Transitions ─── */
function CutsTab({ projectId }: { projectId: number }) {
  const scenes = useScenes(projectId);
  const all = trpc.timelineCuts.list.useQuery({ projectId });
  const save = trpc.timelineCuts.save.useMutation({ onSuccess: () => { toast.success("Cuts saved"); all.refetch(); } });
  const audit = trpc.auditLog.append.useMutation();
  const map = useMemo(() => { const m = new Map<number, any>(); for (const v of (all.data || [])) m.set(v.sceneId, v.data); return m; }, [all.data]);
  const def = { trimInSec: 0, trimOutSec: 0, transitionIn: "cut" as const, transitionInDurationSec: 0, transitionOut: "cut" as const, transitionOutDurationSec: 0, audioFadeInSec: 0, audioFadeOutSec: 0 };
  const [drafts, setDrafts] = useState<Record<number, any>>({});
  const get = (id: number) => drafts[id] ?? map.get(id) ?? def;
  const update = (id: number, patch: any) => setDrafts({ ...drafts, [id]: { ...get(id), ...patch } });
  const persist = (id: number) => { save.mutate({ projectId, sceneId: id, data: get(id) }); audit.mutate({ projectId, event: { action: "timelineCuts.save", targetType: "scene", targetId: String(id), summary: `cuts updated for scene ${id}` } }); const next = { ...drafts }; delete next[id]; setDrafts(next); };

  return (
    <Card><CardHeader><CardTitle className="text-sm gradient-text-gold glass-card">Trim In/Out, Transitions, Audio Fades</CardTitle><p className="text-xs text-muted-foreground">NLE-style J/L cuts, dissolves, audio crossfade per scene.</p></CardHeader>
      <CardContent className="space-y-2 max-h-[70vh] overflow-y-auto glass-card">
        {((scenes.data || []) as any[]).map(s => {
          const d = get(s.id); const dirty = drafts[s.id] != null;
          return (
            <div key={s.id} className="border rounded p-2 space-y-2 text-xs">
              <div className="font-medium">{s.title || `Scene ${s.id}`}</div>
              <div className="grid grid-cols-12 gap-2 min-w-[600px] items-end">
                <div className="col-span-2"><Label className="text-[10px]">Trim In (s)</Label><Input type="number" step="0.1" value={d.trimInSec} onChange={e => update(s.id, { trimInSec: Number(e.target.value) })} className="h-7 text-xs font-mono" /></div>
                <div className="col-span-2"><Label className="text-[10px]">Trim Out (s)</Label><Input type="number" step="0.1" value={d.trimOutSec} onChange={e => update(s.id, { trimOutSec: Number(e.target.value) })} className="h-7 text-xs font-mono" /></div>
                <div className="col-span-2"><Label className="text-[10px]">In transition</Label>
                  <Select value={d.transitionIn} onValueChange={v => update(s.id, { transitionIn: v })}><SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger><SelectContent>{["cut","fade","dissolve","wipe","jcut","lcut"].map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent></Select>
                </div>
                <div className="col-span-1"><Label className="text-[10px]">In dur</Label><Input type="number" step="0.1" value={d.transitionInDurationSec} onChange={e => update(s.id, { transitionInDurationSec: Number(e.target.value) })} className="h-7 text-xs font-mono" /></div>
                <div className="col-span-2"><Label className="text-[10px]">Out transition</Label>
                  <Select value={d.transitionOut} onValueChange={v => update(s.id, { transitionOut: v })}><SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger><SelectContent>{["cut","fade","dissolve","wipe","jcut","lcut"].map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent></Select>
                </div>
                <div className="col-span-1"><Label className="text-[10px]">Out dur</Label><Input type="number" step="0.1" value={d.transitionOutDurationSec} onChange={e => update(s.id, { transitionOutDurationSec: Number(e.target.value) })} className="h-7 text-xs font-mono" /></div>
                <div className="col-span-1"><Label className="text-[10px]">A fadeIn</Label><Input type="number" step="0.1" value={d.audioFadeInSec} onChange={e => update(s.id, { audioFadeInSec: Number(e.target.value) })} className="h-7 text-xs font-mono" /></div>
                <div className="col-span-1"><Label className="text-[10px]">A fadeOut</Label><Input type="number" step="0.1" value={d.audioFadeOutSec} onChange={e => update(s.id, { audioFadeOutSec: Number(e.target.value) })} className="h-7 text-xs font-mono" /></div>
              </div>
              <div className="flex justify-end"><Button size="sm" variant={dirty ? "default" : "outline"} disabled={!dirty} onClick={() => persist(s.id)}><Save className="h-3 w-3 mr-1" />Save</Button></div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

/* ─── Scene Locks: prevent accidental re-renders of approved scenes ─── */
function LocksTab({ projectId }: { projectId: number }) {
  const scenes = useScenes(projectId);
  const list = trpc.sceneLocks.list.useQuery({ projectId }, { refetchInterval: 10000 });
  const toggle = trpc.sceneLocks.toggle.useMutation({
    onSuccess: () => { toast.success("Lock updated"); list.refetch(); },
    onError: (e: any) => toast.error(e?.message || "Toggle failed"),
  });
  const audit = trpc.auditLog.append.useMutation();
  const locks = (list.data || []) as Array<{ sceneId: number; locked: boolean; reason?: string; lockedBy?: string; lockedAt?: number }>;
  const lockMap = new Map(locks.map(l => [l.sceneId, l]));
  const [lockDialog, setLockDialog] = useState<{ sceneId: number; label: string; reason: string } | null>(null);
  const submitLockDialog = () => {
    if (!lockDialog) return;
    const reason = lockDialog.reason.trim() || "approved";
    toggle.mutate({ projectId, sceneId: lockDialog.sceneId, locked: true, reason });
    audit.mutate({ projectId, event: { action: "sceneLock.lock", targetType: "scene", targetId: String(lockDialog.sceneId), summary: `Locked: ${lockDialog.label} — ${reason}` } });
    setLockDialog(null);
  };
  const onToggle = (sceneId: number, locked: boolean, label: string) => {
    if (locked) {
      setLockDialog({ sceneId, label, reason: "approved" });
      return;
    }
    toggle.mutate({ projectId, sceneId, locked: false });
    audit.mutate({ projectId, event: { action: "sceneLock.unlock", targetType: "scene", targetId: String(sceneId), summary: `Unlocked: ${label}` } });
  };
  if (!scenes.data?.length) return <Card><CardContent className="pt-6 text-sm text-muted-foreground glass-card">No scenes yet — create scenes first to lock approved renders.</CardContent></Card>;
  const lockedCount = locks.filter(l => l.locked).length;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2 gradient-text-gold glass-card"><Lock className="h-4 w-4" />Scene Locks</CardTitle>
        <div className="text-xs text-muted-foreground">Locked scenes cannot be re-rendered. Protects approved cuts from accidental credit spend. <span className="text-amber-400">{lockedCount} of {scenes.data.length} locked.</span></div>
      </CardHeader>
      <CardContent className="space-y-2 glass-card">
        {scenes.data.map((s: any) => {
          const lk = lockMap.get(s.id);
          const isLocked = !!lk?.locked;
          return (
            <div key={s.id} className={`flex items-center gap-3 p-2.5 rounded border ${isLocked ? "border-amber-500/40 bg-amber-500/5" : "border-border bg-card/50"}`}>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate flex items-center gap-2">
                  {isLocked ? <Lock className="h-3.5 w-3.5 text-amber-400 shrink-0" /> : <Unlock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                  Scene {s.order ?? s.id}: {s.title || s.description?.slice(0, 60) || "(untitled)"}
                </div>
                {isLocked && lk && (
                  <div className="text-[11px] text-muted-foreground mt-0.5 ml-5">
                    🔒 {lk.reason || "locked"} · by {lk.lockedBy || "—"} {lk.lockedAt ? `· ${new Date(lk.lockedAt).toLocaleString()}` : ""}
                  </div>
                )}
                {!isLocked && s.videoUrl && <div className="text-[11px] text-emerald-400/70 mt-0.5 ml-5">✓ has render — consider locking once approved</div>}
              </div>
              <Switch checked={isLocked} onCheckedChange={(v) => onToggle(s.id, v, s.title || `Scene ${s.order ?? s.id}`)} disabled={toggle.isPending} />
            </div>
          );
        })}
      </CardContent>

      <Dialog open={!!lockDialog} onOpenChange={(o) => { if (!o) setLockDialog(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="gradient-text-gold">Lock scene "{lockDialog?.label}"</DialogTitle>
            <DialogDescription>Provide a reason — this is recorded in the audit log and shown next to the lock.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="lock-reason">Lock reason</Label>
            <Input
              id="lock-reason"
              value={lockDialog?.reason || ""}
              onChange={(e) => setLockDialog((s) => s ? { ...s, reason: e.target.value } : s)}
              placeholder="e.g. approved by client, final cut"
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submitLockDialog(); } }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLockDialog(null)}>Cancel</Button>
            <Button onClick={submitLockDialog} disabled={toggle.isPending}>Lock scene</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/* ─── 3-Tier Approval Chain (director → producer → exec, auto-locks on full sign-off) ─── */
function ApprovalsTab({ projectId }: { projectId: number }) {
  const scenes = useScenes(projectId);
  const list = trpc.approvals.get.useQuery({ projectId }, { refetchInterval: 10000 });
  const setOne = trpc.approvals.set.useMutation({
    onSuccess: (r: any) => { toast.success(r?.autoLocked ? "Approved + auto-locked (full sign-off)" : "Approval saved"); list.refetch(); },
    onError: (e: any) => toast.error(e?.message || "Save failed"),
  });
  const audit = trpc.auditLog.append.useMutation();
  const approvals = (list.data || {}) as any;
  const [rejectDialog, setRejectDialog] = useState<{ sceneId: number; role: "director"|"producer"|"exec"; label: string; note: string } | null>(null);
  const submitRejectDialog = () => {
    if (!rejectDialog) return;
    const note = rejectDialog.note.trim();
    setOne.mutate({ projectId, sceneId: rejectDialog.sceneId, role: rejectDialog.role, state: "rejected", note });
    audit.mutate({ projectId, event: { action: "approval.rejected", targetType: "scene", targetId: String(rejectDialog.sceneId), summary: `${rejectDialog.role.toUpperCase()} rejected: ${rejectDialog.label}${note ? ` — ${note}` : ""}` } });
    setRejectDialog(null);
  };
  if (!scenes.data?.length) return <Card><CardContent className="pt-6 text-sm text-muted-foreground glass-card">No scenes yet — create scenes first to route them through approval.</CardContent></Card>;
  const apply = (sceneId: number, role: "director"|"producer"|"exec", state: "approved"|"rejected"|"pending", label: string) => {
    if (state === "rejected") {
      setRejectDialog({ sceneId, role, label, note: "" });
      return;
    }
    setOne.mutate({ projectId, sceneId, role, state });
    audit.mutate({ projectId, event: { action: `approval.${state}`, targetType: "scene", targetId: String(sceneId), summary: `${role.toUpperCase()} ${state}: ${label}` } });
  };
  const pill = (s?: string) => {
    if (s === "approved") return <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40">approved</Badge>;
    if (s === "rejected") return <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/40">rejected</Badge>;
    return <Badge variant="outline" className="text-muted-foreground">pending</Badge>;
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2 gradient-text-gold glass-card"><CheckCheck className="h-4 w-4" />3-Tier Approval Chain</CardTitle>
        <div className="text-xs text-muted-foreground">Director → Producer → Executive. When all three approve, scene <strong>auto-locks</strong> against further renders.</div>
      </CardHeader>
      <CardContent className="space-y-2 glass-card">
        <div className="grid grid-cols-12 gap-2 min-w-[600px] px-2 text-[10px] uppercase text-muted-foreground tracking-wider">
          <div className="col-span-4">Scene</div>
          <div className="col-span-2 text-center">Director</div>
          <div className="col-span-2 text-center">Producer</div>
          <div className="col-span-2 text-center">Exec</div>
          <div className="col-span-2"></div>
        </div>
        {scenes.data.map((s: any) => {
          const a = approvals[String(s.id)] || {};
          const all = a.director?.state === "approved" && a.producer?.state === "approved" && a.exec?.state === "approved";
          return (
            <div key={s.id} className={`grid grid-cols-12 gap-2 min-w-[600px] items-center p-2 rounded border ${all ? "border-emerald-500/40 bg-emerald-500/5" : "border-border bg-card/50"}`}>
              <div className="col-span-4 min-w-0">
                <div className="text-sm font-medium truncate">Scene {s.order ?? s.id}: {s.title || s.description?.slice(0, 50) || "(untitled)"}</div>
                {all && <div className="text-[10px] text-emerald-400 mt-0.5">🔒 fully approved → auto-locked</div>}
              </div>
              {(["director","producer","exec"] as const).map(role => (
                <div key={role} className="col-span-2 flex items-center justify-center gap-1">
                  {pill(a[role]?.state)}
                </div>
              ))}
              <div className="col-span-2 flex justify-end gap-1 flex-wrap">
                {(["director","producer","exec"] as const).map(role => (
                  <div key={role} className="flex gap-0.5">
                    <Button size="icon" variant="ghost" className="h-6 w-6" title={`${role}: approve`} onClick={() => apply(s.id, role, "approved", s.title || `Scene ${s.order}`)} disabled={setOne.isPending} aria-label={`${role} approve scene ${s.title || s.order}`}><ThumbsUp className="h-3 w-3 text-emerald-400" aria-hidden="true" /></Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6" title={`${role}: reject`} onClick={() => apply(s.id, role, "rejected", s.title || `Scene ${s.order}`)} disabled={setOne.isPending} aria-label={`${role} reject scene ${s.title || s.order}`}><ThumbsDown className="h-3 w-3 text-rose-400" aria-hidden="true" /></Button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </CardContent>

      <Dialog open={!!rejectDialog} onOpenChange={(o) => { if (!o) setRejectDialog(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="gradient-text-gold">Reject as {rejectDialog?.role}</DialogTitle>
            <DialogDescription>Add a rejection reason for "{rejectDialog?.label}". This is recorded in the audit log.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-note">Rejection reason</Label>
            <Textarea
              id="reject-note"
              rows={3}
              value={rejectDialog?.note || ""}
              onChange={(e) => setRejectDialog((s) => s ? { ...s, note: e.target.value } : s)}
              placeholder="e.g. Continuity issue in shot 3, lighting needs grade pass…"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(null)}>Cancel</Button>
            <Button onClick={submitRejectDialog} disabled={setOne.isPending} className="bg-rose-600 hover:bg-rose-500 text-white">Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/* ─── Studio Budget + Director-facing Savings Tracker ─── */
function StudioBudgetTab({ projectId }: { projectId: number }) {
  const q = trpc.studioBudget.get.useQuery({ projectId }, { refetchInterval: 10000 });
  const save = trpc.studioBudget.set.useMutation({
    onSuccess: () => { toast.success("Budget saved"); q.refetch(); },
    onError: (e: any) => toast.error(e?.message || "Save failed"),
  });
  const audit = trpc.auditLog.append.useMutation();
  const [draft, setDraft] = useState<any | null>(null);
  const live = draft ?? q.data;
  if (!live) return <div className="p-6 text-sm text-muted-foreground">Loading budget…</div>;
  const update = (patch: any) => setDraft({ ...live, ...patch });
  const updateStage = (k: string, v: number) => setDraft({ ...live, byStage: { ...live.byStage, [k]: v } });
  const persist = () => {
    save.mutate({ projectId, totalBudget: live.totalBudget, byStage: live.byStage, contingencyPct: live.contingencyPct, tradCostPerScene: live.tradCostPerScene, tradHoursPerScene: live.tradHoursPerScene, creditUsdRate: live.creditUsdRate });
    audit.mutate({ projectId, event: { action: "budget.save", summary: `Budget set to $${live.totalBudget}` } });
    setDraft(null);
  };
  const s = live.savings;
  const stageSum = Object.values(live.byStage).reduce((a: number, b: any) => a + Number(b || 0), 0) as number;
  return (
    <div className="space-y-4">
      {s && (
        <Card className="border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent glass-card">
          <CardHeader className="pb-2 glass-card"><CardTitle className="text-sm flex items-center gap-2 text-emerald-300 gradient-text-gold glass-card"><TrendingUp className="h-4 w-4" />What Virelle has saved you on this project</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 glass-card">
            <div>
              <div className="text-xs text-muted-foreground flex items-center gap-1.5"><DollarSign className="h-3 w-3" />Money saved</div>
              <div className="text-4xl font-bold text-emerald-400">${s.moneySavedUsd.toLocaleString()}</div>
              <div className="text-[11px] text-muted-foreground mt-1">vs ${s.tradEquivalentUsd.toLocaleString()} at industry rates · you spent ${live.spentUsd.toLocaleString()} ({live.spentCredits} credits)</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground flex items-center gap-1.5"><Clock className="h-3 w-3" />Time saved</div>
              <div className="text-4xl font-bold text-teal-400">{s.timeSavedDays} <span className="text-xl">days</span></div>
              <div className="text-[11px] text-muted-foreground mt-1">{s.timeSavedHours.toLocaleString()} hours · {s.renderedScenes} scenes × {live.tradHoursPerScene}h shoot day</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground flex items-center gap-1.5"><Sparkles className="h-3 w-3" />Cost multiplier</div>
              <div className="text-4xl font-bold text-violet-300">{s.savingsMultiplier ? `${s.savingsMultiplier}×` : "—"}</div>
              <div className="text-[11px] text-muted-foreground mt-1">cheaper than traditional production</div>
            </div>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2 gradient-text-gold glass-card"><DollarSign className="h-4 w-4" />Project Budget</CardTitle></CardHeader>
        <CardContent className="space-y-3 glass-card">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div><Label className="text-xs">Total budget (USD)</Label><Input type="number" value={live.totalBudget} onChange={e => update({ totalBudget: Number(e.target.value) })} /></div>
            <div><Label className="text-xs">Contingency %</Label><Input type="number" value={live.contingencyPct} onChange={e => update({ contingencyPct: Number(e.target.value) })} /></div>
            <div><Label className="text-xs">Spent to date</Label><div className="h-9 flex items-center font-mono text-sm">${live.spentUsd.toLocaleString()}</div></div>
            <div><Label className="text-xs">Variance</Label><div className={`h-9 flex items-center font-mono text-sm ${live.variance < 0 ? "text-rose-400" : "text-emerald-400"}`}>${live.variance.toLocaleString()}{live.burnPct != null && <span className="ml-2 text-[11px] text-muted-foreground">({live.burnPct}% burned)</span>}</div></div>
          </div>
          <div className="space-y-1 pt-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground text-amber-400/60">Allocation by stage</Label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {Object.entries(live.byStage).map(([k, v]: [string, any]) => (
                <div key={k}><Label className="text-[10px] capitalize">{k.replace(/([A-Z])/g, " $1")}</Label><Input type="number" value={v} onChange={e => updateStage(k, Number(e.target.value))} className="h-8 text-sm" /></div>
              ))}
            </div>
            <div className="text-[11px] text-muted-foreground text-right">Stage sum: ${stageSum.toLocaleString()}{Math.abs(stageSum - live.totalBudget) > 1 && <span className="ml-2 text-amber-400">⚠ doesn't equal total ({live.totalBudget})</span>}</div>
          </div>
          <div className="space-y-1 pt-3 border-t border-border/40">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground text-amber-400/60">Industry savings benchmarks (used for ROI calc)</Label>
            <div className="grid grid-cols-3 gap-2">
              <div><Label className="text-[10px]">Traditional cost / scene (USD)</Label><Input type="number" value={live.tradCostPerScene} onChange={e => update({ tradCostPerScene: Number(e.target.value) })} className="h-8 text-sm" /></div>
              <div><Label className="text-[10px]">Traditional hours / scene</Label><Input type="number" value={live.tradHoursPerScene} onChange={e => update({ tradHoursPerScene: Number(e.target.value) })} className="h-8 text-sm" /></div>
              <div><Label className="text-[10px]">Credit-to-USD rate</Label><Input type="number" step="0.01" value={live.creditUsdRate} onChange={e => update({ creditUsdRate: Number(e.target.value) })} className="h-8 text-sm" /></div>
            </div>
          </div>
          <div className="flex justify-end pt-2"><Button size="sm" onClick={persist} disabled={save.isPending || !draft}><Save className="h-3.5 w-3.5 mr-1.5" />Save Budget</Button></div>
        </CardContent>
      </Card>
        </div>
  );
}
