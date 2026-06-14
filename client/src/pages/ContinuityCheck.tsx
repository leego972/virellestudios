import { useAuth } from "@/_core/hooks/useAuth";
  import { Button } from "@/components/ui/button";
  import { Input } from "@/components/ui/input";
  import { Label } from "@/components/ui/label";
  import { Textarea } from "@/components/ui/textarea";
  import { Badge } from "@/components/ui/badge";
  import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
  import { Switch } from "@/components/ui/switch";
  import { trpc } from "@/lib/trpc";
  import { useParams, useLocation } from "wouter";
  import {
    Loader2, ArrowLeft, ShieldCheck, AlertTriangle, AlertCircle, Info,
    Sparkles, Download, Plus, Trash2, Check, X, Eye, ChevronDown,
    ChevronUp, Filter, Shirt, Scissors, Package, Clock, Cloud,
    Clapperboard, StickyNote, Flag, RefreshCw, FileText, CheckCircle2,
    ClipboardList, Layers,
  } from "lucide-react";
  import { useState, useEffect, useCallback, useMemo } from "react";
  import { getLoginUrl } from "@/const";
  import { toast } from "sonner";
  import { NextStageCTA } from "@/components/NextStageCTA";
  import { SubscriptionGate } from "@/components/SubscriptionGate";
  
  // ─── Types ────────────────────────────────────────────────────────────────────

  interface SceneNote {
    sceneId: number;
    wardrobe:      string;
    hairMakeup:    string;
    propsIn:       string;
    propsOut:      string;
    actionEnd:     string;
    timeOfDay:     string;
    weather:       string;
    lighting:      string;
    matchNote:     string;
    supervisorNote:string;
  }

  type IssueSeverity = "high" | "medium" | "low";
  type IssueStatus   = "open" | "acknowledged" | "fixed";
  type IssueSource   = "ai" | "manual";

  interface ContinuityIssue {
    id:          string;
    severity:    IssueSeverity;
    category:    string;
    sceneRef:    string;
    description: string;
    suggestion:  string;
    status:      IssueStatus;
    source:      IssueSource;
    addedAt:     string;
  }

  interface ProjectData {
    notes:  Record<number, SceneNote>;
    issues: ContinuityIssue[];
  }

  // ─── Constants ────────────────────────────────────────────────────────────────

  const ISSUE_CATEGORIES = [
    "Wardrobe", "Hair & Makeup", "Props", "Time of Day", "Weather / Lighting",
    "Character Presence", "Action Match", "Location", "Vehicle", "Dialogue", "Other",
  ];
  const SEVERITY_CFG: Record<IssueSeverity, { label: string; color: string; bg: string; border: string; dot: string }> = {
    high:   { label: "High",   color: "text-red-400",   bg: "bg-red-500/8",   border: "border-red-500/20",   dot: "#f87171" },
    medium: { label: "Medium", color: "text-amber-400", bg: "bg-amber-500/8", border: "border-amber-500/20", dot: "#fbbf24" },
    low:    { label: "Low",    color: "text-blue-400",  bg: "bg-blue-500/8",  border: "border-blue-500/20",  dot: "#60a5fa" },
  };
  const STATUS_CFG: Record<IssueStatus, { label: string; color: string; bg: string }> = {
    open:         { label: "Open",         color: "text-red-400",   bg: "bg-red-500/10" },
    acknowledged: { label: "Acknowledged", color: "text-amber-400", bg: "bg-amber-500/10" },
    fixed:        { label: "Fixed",        color: "text-green-400", bg: "bg-green-500/10" },
  };
  const BLANK_NOTE = (): SceneNote => ({
    sceneId: 0, wardrobe: "", hairMakeup: "", propsIn: "", propsOut: "",
    actionEnd: "", timeOfDay: "", weather: "", lighting: "", matchNote: "", supervisorNote: "",
  });

  // ─── Persistence ──────────────────────────────────────────────────────────────

  function loadData(projectId: number): ProjectData {
    try {
      const raw = localStorage.getItem(`continuity-${projectId}`);
      return raw ? JSON.parse(raw) : { notes: {}, issues: [] };
    } catch { return { notes: {}, issues: [] }; }
  }
  function saveData(projectId: number, data: ProjectData) {
    localStorage.setItem(`continuity-${projectId}`, JSON.stringify(data));
  }

  // ─── Sub-components ───────────────────────────────────────────────────────────

  function SeverityBadge({ severity }: { severity: IssueSeverity }) {
    const c = SEVERITY_CFG[severity];
    return (
      <span className={`inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${c.bg} ${c.border} border`}>
        <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: c.dot }} />
        <span className={c.color}>{c.label}</span>
      </span>
    );
  }

  function StatusPill({ status, onClick }: { status: IssueStatus; onClick?: () => void }) {
    const c = STATUS_CFG[status];
    return (
      <button onClick={onClick} className={`text-[9px] font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full ${c.bg} ${c.color} transition-opacity hover:opacity-80`}>
        {c.label}
      </button>
    );
  }

  function CategoryTag({ cat }: { cat: string }) {
    const icons: Record<string, any> = {
      "Wardrobe": Shirt, "Hair & Makeup": Scissors, "Props": Package,
      "Time of Day": Clock, "Weather / Lighting": Cloud,
      "Character Presence": Eye, "Action Match": Clapperboard,
      "Location": Flag, "Dialogue": StickyNote,
    };
    const Icon = icons[cat] || AlertCircle;
    return (
      <span className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/5 text-muted-foreground">
        <Icon style={{ width: 10, height: 10 }} />{cat}
      </span>
    );
  }

  // ─── Scene Continuity Card ────────────────────────────────────────────────────

  function SceneCard({
    scene, note, onSave, onFlag, characters,
  }: {
    scene: any;
    note: SceneNote;
    onSave: (n: SceneNote) => void;
    onFlag: (sceneRef: string, desc: string, cat: string) => void;
    characters: any[];
  }) {
    const [expanded, setExpanded] = useState(false);
    const [local, setLocal] = useState<SceneNote>(note);
    const [dirty, setDirty] = useState(false);

    useEffect(() => { setLocal(note); setDirty(false); }, [note]);

    const p = (patch: Partial<SceneNote>) => { setLocal(prev => ({ ...prev, ...patch })); setDirty(true); };
    const save = () => { onSave(local); setDirty(false); toast.success("Scene notes saved"); };

    const sceneChars = (scene.characterIds as number[] || [])
      .map((id: number) => characters.find(c => c.id === id)?.name)
      .filter(Boolean).join(", ");

    const hasNotes = local.wardrobe || local.hairMakeup || local.propsIn || local.supervisorNote;
    const noteCount = [local.wardrobe, local.hairMakeup, local.propsIn, local.propsOut, local.actionEnd, local.supervisorNote].filter(Boolean).length;

    return (
      <div className="rounded-xl border overflow-hidden transition-all"
        style={{ borderColor: expanded ? "rgba(212,175,55,0.35)" : "rgba(255,255,255,0.07)", background: expanded ? "rgba(212,175,55,0.03)" : "rgba(255,255,255,0.015)" }}>

        {/* Row header */}
        <div className="flex items-center gap-3 px-4 py-3 cursor-pointer" onClick={() => setExpanded(e => !e)}>
          {/* Scene number chip */}
          <div className="h-9 w-9 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0"
            style={{ background: hasNotes ? "rgba(212,175,55,0.12)" : "rgba(255,255,255,0.05)", color: hasNotes ? "#D4AF37" : "rgba(255,255,255,0.3)", border: hasNotes ? "1px solid rgba(212,175,55,0.2)" : "1px solid rgba(255,255,255,0.06)" }}>
            {scene.sceneNumber || scene.orderIndex + 1 || "?"}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs font-semibold truncate">{scene.title || "Untitled Scene"}</p>
              {scene.intExt && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/5 text-muted-foreground/70">{scene.intExt}</span>}
              {scene.timeOfDay && <span className="text-[9px] text-muted-foreground/50">{scene.timeOfDay}</span>}
              {scene.locationType && <span className="text-[9px] text-muted-foreground/50 hidden sm:inline">{scene.locationType}</span>}
            </div>
            {sceneChars && <p className="text-[10px] text-muted-foreground/50 truncate mt-0.5">{sceneChars}</p>}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {noteCount > 0 && (
              <span className="text-[9px] px-2 py-0.5 rounded-full font-semibold" style={{ background: "rgba(212,175,55,0.1)", color: "#D4AF37" }}>
                {noteCount} notes
              </span>
            )}
            {dirty && <span className="text-[9px] text-amber-400 font-semibold">unsaved</span>}
            {expanded ? <ChevronUp className="h-4 w-4 text-yellow-400" /> : <ChevronDown className="h-4 w-4 text-muted-foreground/30" />}
          </div>
        </div>

        {/* Expanded detail */}
        {expanded && (
          <div className="border-t px-4 py-5 space-y-5" style={{ borderColor: "rgba(212,175,55,0.1)", background: "rgba(0,0,0,0.25)" }}>

            {/* Quick flags */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">Quick flag:</span>
              {["Wardrobe change", "Hair inconsistency", "Prop missing", "Time jump", "Action mismatch"].map(f => (
                <button key={f} onClick={() => onFlag(`Scene ${scene.sceneNumber || (scene.orderIndex + 1)}: ${scene.title || ""}`, f + " flagged by script supervisor", f.split(" ")[0] === "Wardrobe" ? "Wardrobe" : f.split(" ")[0] === "Hair" ? "Hair & Makeup" : f.split(" ")[0] === "Prop" ? "Props" : f.split(" ")[0] === "Time" ? "Time of Day" : "Action Match")}
                  className="text-[9px] px-2.5 py-1 rounded-full border border-border/30 hover:border-amber-500/30 hover:bg-amber-500/5 text-muted-foreground hover:text-amber-400 transition-all flex items-center gap-1">
                  <Flag style={{ width: 10, height: 10 }} />{f}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Wardrobe */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5"><Shirt style={{ width: 12, height: 12 }} className="text-muted-foreground" /><label className="text-[10px] text-muted-foreground uppercase tracking-wider">Wardrobe State</label></div>
                <Textarea value={local.wardrobe} onChange={e => p({ wardrobe: e.target.value })}
                  placeholder="Describe each character's wardrobe — condition, any tears/stains, accessories, state at scene end…"
                  className="text-xs bg-black/30 border-border/30 resize-none min-h-[72px]" />
              </div>

              {/* Hair & Makeup */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5"><Scissors style={{ width: 12, height: 12 }} className="text-muted-foreground" /><label className="text-[10px] text-muted-foreground uppercase tracking-wider">Hair & Makeup</label></div>
                <Textarea value={local.hairMakeup} onChange={e => p({ hairMakeup: e.target.value })}
                  placeholder="Hair position, makeup condition, prosthetics state, injuries showing…"
                  className="text-xs bg-black/30 border-border/30 resize-none min-h-[72px]" />
              </div>

              {/* Props In */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5"><Package style={{ width: 12, height: 12 }} className="text-muted-foreground" /><label className="text-[10px] text-muted-foreground uppercase tracking-wider">Props — Present</label></div>
                <Textarea value={local.propsIn} onChange={e => p({ propsIn: e.target.value })}
                  placeholder="Props visible/in use at START of scene…"
                  className="text-xs bg-black/30 border-border/30 resize-none min-h-[60px]" />
              </div>

              {/* Props Out */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5"><Package style={{ width: 12, height: 12 }} className="text-muted-foreground" /><label className="text-[10px] text-muted-foreground uppercase tracking-wider">Props — End State</label></div>
                <Textarea value={local.propsOut} onChange={e => p({ propsOut: e.target.value })}
                  placeholder="Props at END of scene — what moved, broke, was consumed or left behind…"
                  className="text-xs bg-black/30 border-border/30 resize-none min-h-[60px]" />
              </div>

              {/* Action End */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5"><Clapperboard style={{ width: 12, height: 12 }} className="text-muted-foreground" /><label className="text-[10px] text-muted-foreground uppercase tracking-wider">Action / Body Position at End</label></div>
                <Textarea value={local.actionEnd} onChange={e => p({ actionEnd: e.target.value })}
                  placeholder="Where each character is standing/sitting/moving at the END of the scene — needed for match-cut to next scene…"
                  className="text-xs bg-black/30 border-border/30 resize-none min-h-[72px]" />
              </div>

              {/* Match To Next */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5"><CheckCircle2 style={{ width: 12, height: 12 }} className="text-muted-foreground" /><label className="text-[10px] text-muted-foreground uppercase tracking-wider">Match Note → Next Scene</label></div>
                <Textarea value={local.matchNote} onChange={e => p({ matchNote: e.target.value })}
                  placeholder="What must match at the top of the NEXT scene to maintain continuity — eye line, hand position, expression, sound…"
                  className="text-xs bg-black/30 border-border/30 resize-none min-h-[72px]" />
              </div>

              {/* Environment */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5"><Cloud style={{ width: 12, height: 12 }} className="text-muted-foreground" /><label className="text-[10px] text-muted-foreground uppercase tracking-wider">Weather / Lighting</label></div>
                <Input value={local.weather} onChange={e => p({ weather: e.target.value })}
                  placeholder="Overcast, sunny, rain, golden hour, night…"
                  className="h-8 text-xs bg-black/30 border-border/30" />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5"><Clock style={{ width: 12, height: 12 }} className="text-muted-foreground" /><label className="text-[10px] text-muted-foreground uppercase tracking-wider">Time of Day (Narrative)</label></div>
                <Input value={local.timeOfDay} onChange={e => p({ timeOfDay: e.target.value })}
                  placeholder="Narrative time — e.g. 3pm Tuesday, Day 2 of story…"
                  className="h-8 text-xs bg-black/30 border-border/30" />
              </div>
            </div>

            {/* Supervisor note */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5"><StickyNote style={{ width: 12, height: 12 }} className="text-muted-foreground" /><label className="text-[10px] text-muted-foreground uppercase tracking-wider">Script Supervisor Note</label></div>
              <Textarea value={local.supervisorNote} onChange={e => p({ supervisorNote: e.target.value })}
                placeholder="Any additional notes — special continuity concerns, wild lines taken, coverage gaps, performance notes for editing…"
                className="text-xs bg-black/30 border-border/30 resize-none min-h-[60px]" />
            </div>

            <div className="flex items-center justify-between pt-1">
              <button onClick={() => onFlag(
                `Scene ${scene.sceneNumber || (scene.orderIndex + 1)}: ${scene.title || ""}`,
                "Manual flag from scene log", "Other"
              )} className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg border border-border/30 hover:border-amber-500/30 hover:bg-amber-500/5 text-muted-foreground hover:text-amber-400 transition-all">
                <Flag style={{ width: 12, height: 12 }} />Add Issue Flag
              </button>
              {dirty && (
                <Button size="sm" onClick={save} className="gap-2 h-8 text-xs" style={{ background: "linear-gradient(135deg,#D4AF37,#b8960c)", color: "#000" }}>
                  <Check style={{ width: 12, height: 12 }} />Save Notes
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── New Issue Form ───────────────────────────────────────────────────────────

  function AddIssueForm({ scenes, onAdd, onClose }: { scenes: any[]; onAdd: (i: ContinuityIssue) => void; onClose: () => void }) {
    const [form, setForm] = useState({ severity: "medium" as IssueSeverity, category: "Wardrobe", sceneRef: "", description: "", suggestion: "" });
    const p = (patch: Partial<typeof form>) => setForm(prev => ({ ...prev, ...patch }));

    const submit = () => {
      if (!form.description) { toast.error("Description is required"); return; }
      onAdd({ id: crypto.randomUUID(), ...form, status: "open", source: "manual", addedAt: new Date().toISOString() });
      onClose();
      toast.success("Issue flagged");
    };

    return (
      <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: "rgba(212,175,55,0.25)", background: "rgba(212,175,55,0.03)" }}>
        <div className="flex items-center justify-between"><p className="text-sm font-semibold">Flag Continuity Issue</p><button onClick={onClose} className="text-muted-foreground hover:text-white"><X className="h-4 w-4" /></button></div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5"><label className="text-[10px] text-muted-foreground uppercase tracking-wider">Severity</label>
            <Select value={form.severity} onValueChange={v => p({ severity: v as IssueSeverity })}>
              <SelectTrigger className="h-8 text-xs bg-black/30 border-border/40"><SelectValue /></SelectTrigger>
              <SelectContent>{(["high","medium","low"] as IssueSeverity[]).map(s => <SelectItem key={s} value={s} className="text-xs capitalize"><span className={SEVERITY_CFG[s].color}>{SEVERITY_CFG[s].label}</span></SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><label className="text-[10px] text-muted-foreground uppercase tracking-wider">Category</label>
            <Select value={form.category} onValueChange={v => p({ category: v })}>
              <SelectTrigger className="h-8 text-xs bg-black/30 border-border/40"><SelectValue /></SelectTrigger>
              <SelectContent>{ISSUE_CATEGORIES.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><label className="text-[10px] text-muted-foreground uppercase tracking-wider">Scene Reference</label>
            <Select value={form.sceneRef} onValueChange={v => p({ sceneRef: v })}>
              <SelectTrigger className="h-8 text-xs bg-black/30 border-border/40"><SelectValue placeholder="Select scene…" /></SelectTrigger>
              <SelectContent>{scenes.map((s,i) => <SelectItem key={s.id} value={`Scene ${s.sceneNumber || i+1}: ${s.title || ""}`} className="text-xs">Scene {s.sceneNumber || i+1}: {s.title || "Untitled"}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5"><label className="text-[10px] text-muted-foreground uppercase tracking-wider">Issue Description</label>
          <Textarea value={form.description} onChange={e => p({ description: e.target.value })} placeholder="Describe the continuity problem clearly…" className="text-xs bg-black/30 border-border/30 resize-none min-h-[70px]" />
        </div>
        <div className="space-y-1.5"><label className="text-[10px] text-muted-foreground uppercase tracking-wider">Suggested Fix</label>
          <Textarea value={form.suggestion} onChange={e => p({ suggestion: e.target.value })} placeholder="How could this be fixed in editing or reshoots…" className="text-xs bg-black/30 border-border/30 resize-none min-h-[50px]" />
        </div>
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={onClose} className="text-xs">Cancel</Button>
          <Button size="sm" onClick={submit} className="gap-2 text-xs" style={{ background: "linear-gradient(135deg,#D4AF37,#b8960c)", color: "#000" }}><Flag style={{ width: 12, height: 12 }} />Flag Issue</Button>
        </div>
      </div>
    );
  }

  // ─── Main component ───────────────────────────────────────────────────────────

  function ContinuityCheckInner() {
    const { user, loading: authLoading } = useAuth();
    const params = useParams<{ projectId: string }>();
    const [, navigate] = useLocation();
    const projectId = Number(params.projectId);

    const [activeTab,   setActiveTab]   = useState("log");
    const [data,        setData]        = useState<ProjectData>({ notes: {}, issues: [] });
    const [showAddForm, setShowAddForm] = useState(false);
    const [addFormInit, setAddFormInit] = useState<Partial<ContinuityIssue>>({});
    const [filterSev,   setFilterSev]   = useState("all");
    const [filterCat,   setFilterCat]   = useState("all");
    const [filterStat,  setFilterStat]  = useState("all");
    const [expandAI,    setExpandAI]    = useState(true);
    const [lastAiRun,   setLastAiRun]   = useState<string | null>(null);

    // Queries
    const { data: project,    isLoading: projLoading  } = trpc.project.get.useQuery({ id: projectId }, { enabled: !!user && !!projectId });
    const { data: scenes,     isLoading: scenesLoading } = trpc.scene.listByProject.useQuery({ projectId }, { enabled: !!user && !!projectId });
    const { data: characters                           } = trpc.character.listByProject.useQuery({ projectId }, { enabled: !!user && !!projectId });

    const aiCheck = trpc.continuity.check.useMutation({
      onSuccess: (report: any) => {
        const newIssues: ContinuityIssue[] = (report.issues || []).map((i: any) => ({
          id: crypto.randomUUID(), severity: (i.severity || "medium") as IssueSeverity,
          category: i.category || "Other", sceneRef: i.scenes || "",
          description: i.description || "", suggestion: i.suggestion || "",
          status: "open" as IssueStatus, source: "ai" as IssueSource,
          addedAt: new Date().toISOString(),
        }));
        const merged = [...data.issues.filter(x => x.source !== "ai"), ...newIssues];
        const next = { ...data, issues: merged };
        setData(next); saveData(projectId, next);
        setLastAiRun(new Date().toLocaleTimeString());
        setActiveTab("issues");
        toast.success(`AI found ${newIssues.length} issue${newIssues.length !== 1 ? "s" : ""} — manual flags preserved`);
      },
      onError: (e: any) => toast.error(e.message || "AI check failed"),
    });

    // Load from localStorage
    useEffect(() => { if (projectId) setData(loadData(projectId)); }, [projectId]);

    const persist = useCallback((next: ProjectData) => { setData(next); saveData(projectId, next); }, [projectId]);

    const saveNote = (sceneId: number, note: SceneNote) => {
      persist({ ...data, notes: { ...data.notes, [sceneId]: note } });
    };

    const addIssue = (issue: ContinuityIssue) => persist({ ...data, issues: [...data.issues, issue] });

    const updateIssueStatus = (id: string, status: IssueStatus) => {
      persist({ ...data, issues: data.issues.map(i => i.id === id ? { ...i, status } : i) });
    };

    const deleteIssue = (id: string) => {
      if (!confirm("Remove this issue?")) return;
      persist({ ...data, issues: data.issues.filter(i => i.id !== id) });
    };

    const quickFlag = (sceneRef: string, description: string, category: string) => {
      const issue: ContinuityIssue = {
        id: crypto.randomUUID(), severity: "medium", category, sceneRef,
        description, suggestion: "", status: "open", source: "manual",
        addedAt: new Date().toISOString(),
      };
      const next = { ...data, issues: [...data.issues, issue] };
      persist(next);
      toast.success("Issue flagged");
      setActiveTab("issues");
    };

    const exportCSV = () => {
      const hdr = ["ID","Source","Severity","Category","Scene Ref","Status","Description","Suggestion","Added At"];
      const rows = data.issues.map(i => [
        i.id, i.source, i.severity, `"${i.category}"`, `"${i.sceneRef}"`,
        i.status, `"${i.description.replace(/"/g,'""')}"`, `"${i.suggestion.replace(/"/g,'""')}"`, i.addedAt,
      ].join(","));
      const blob = new Blob([[hdr.join(","), ...rows].join("\n")], { type: "text/csv" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `continuity-${projectId}.csv`; a.click();
      toast.success("Exported as CSV");
    };

    const exportTXT = () => {
      const lines = [
        `CONTINUITY REPORT — ${project?.title || "Untitled"}`,
        `Generated: ${new Date().toLocaleString()}`,
        "=".repeat(60), "",
        `ISSUES: ${high} High · ${medium} Medium · ${low} Low`,
        `STATUS:  ${open} Open · ${acked} Acknowledged · ${fixed} Fixed`,
        "=".repeat(60), "",
      ];
      data.issues.forEach(i => {
        lines.push(`[${i.severity.toUpperCase()}] ${i.category} — ${i.sceneRef}`);
        lines.push(`Status: ${i.status} | Source: ${i.source} | ${new Date(i.addedAt).toLocaleDateString()}`);
        lines.push(`Issue: ${i.description}`);
        if (i.suggestion) lines.push(`Fix: ${i.suggestion}`);
        lines.push("─".repeat(40)); lines.push("");
      });
      if (Object.keys(data.notes).length) {
        lines.push("", "=".repeat(60), "SCENE CONTINUITY LOG", "=".repeat(60), "");
        for (const [sid, note] of Object.entries(data.notes)) {
          const scene = (scenes || []).find(s => s.id === Number(sid));
          if (!scene) continue;
          lines.push(`Scene ${scene.sceneNumber || "?"}: ${scene.title || "Untitled"}`);
          if (note.wardrobe)      lines.push(`  Wardrobe: ${note.wardrobe}`);
          if (note.hairMakeup)    lines.push(`  Hair/Makeup: ${note.hairMakeup}`);
          if (note.propsIn)       lines.push(`  Props In: ${note.propsIn}`);
          if (note.propsOut)      lines.push(`  Props End: ${note.propsOut}`);
          if (note.actionEnd)     lines.push(`  Action End: ${note.actionEnd}`);
          if (note.matchNote)     lines.push(`  Match Note: ${note.matchNote}`);
          if (note.supervisorNote)lines.push(`  Supervisor: ${note.supervisorNote}`);
          lines.push("");
        }
      }
      const blob = new Blob([lines.join("\n")], { type: "text/plain" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `continuity-report-${projectId}.txt`; a.click();
      toast.success("Report exported");
    };

    const allScenes = scenes || [];
    const allChars  = characters || [];

    const filteredIssues = data.issues.filter(i => {
      if (filterSev  !== "all" && i.severity !== filterSev)  return false;
      if (filterCat  !== "all" && i.category !== filterCat)  return false;
      if (filterStat !== "all" && i.status   !== filterStat) return false;
      return true;
    });

    const high   = data.issues.filter(i => i.severity === "high").length;
    const medium = data.issues.filter(i => i.severity === "medium").length;
    const low    = data.issues.filter(i => i.severity === "low").length;
    const open   = data.issues.filter(i => i.status === "open").length;
    const acked  = data.issues.filter(i => i.status === "acknowledged").length;
    const fixed  = data.issues.filter(i => i.status === "fixed").length;
    const loggedScenes = Object.keys(data.notes).length;

    if (authLoading || projLoading || scenesLoading) {
      return <div className="min-h-screen flex items-center justify-center" style={{ background: "#07070e" }}><Loader2 className="h-8 w-8 animate-spin" style={{ color: "#D4AF37" }} /></div>;
    }
    if (!user) { window.location.href = getLoginUrl(); return null; }

    return (
      <div className="min-h-screen" style={{ background: "linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)" }}>
        {/* Header */}
        <div className="border-b sticky top-0 z-20" style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(7,7,14,0.97)", backdropFilter: "blur(24px)" }}>
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => navigate(`/projects/${projectId}`)} className="gap-2 text-muted-foreground h-8"><ArrowLeft className="h-4 w-4" />Back</Button>
              <div className="h-5 w-px bg-border/40" />
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg,#16a34a,#15803d)" }}>
                  <ShieldCheck className="text-white" style={{ width: 18, height: 18 }} />
                </div>
                <div>
                  <div className="font-bold text-sm">{project?.title} — Continuity</div>
                  <div className="text-[10px] text-muted-foreground">
                    {loggedScenes}/{allScenes.length} scenes logged · {open} open issues · {data.issues.length} total
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={exportCSV} disabled={data.issues.length === 0} className="gap-2 h-8 text-xs text-muted-foreground"><Download className="h-3.5 w-3.5" />CSV</Button>
              <Button size="sm" variant="outline" onClick={exportTXT} className="gap-2 h-8 text-xs border-border/50"><FileText className="h-3.5 w-3.5" />Report</Button>
              <Button size="sm" onClick={() => aiCheck.mutate({ projectId })} disabled={aiCheck.isPending} className="gap-2 h-8 text-xs" style={{ background: "linear-gradient(135deg,#16a34a,#15803d)" }}>
                {aiCheck.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}AI Check
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">

          {/* Stats row */}
          <div className="grid grid-cols-3 sm:grid-cols-7 gap-2.5">
            {[
              { label: "Scenes Logged",  val: `${loggedScenes}/${allScenes.length}`, color: "text-white" },
              { label: "Total Issues",   val: data.issues.length, color: "text-white" },
              { label: "High",           val: high,    color: "text-red-400" },
              { label: "Medium",         val: medium,  color: "text-amber-400" },
              { label: "Low",            val: low,     color: "text-blue-400" },
              { label: "Open",           val: open,    color: "text-red-400" },
              { label: "Fixed",          val: fixed,   color: "text-green-400" },
            ].map((s, i) => (
              <div key={i} className="rounded-xl border px-3 py-2.5" style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
                <div className="text-[9px] text-muted-foreground uppercase tracking-wider">{s.label}</div>
                <div className={`text-xl font-bold mt-0.5 ${s.color}`}>{s.val}</div>
              </div>
            ))}
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-5 border border-border/40 bg-black/40 h-9 gap-0.5">
              <TabsTrigger value="log"    className="gap-1.5 text-xs h-7 data-[state=active]:text-amber-400"><ClipboardList className="h-3.5 w-3.5" />Scene Log</TabsTrigger>
              <TabsTrigger value="issues" className="gap-1.5 text-xs h-7 data-[state=active]:text-amber-400">
                <Flag className="h-3.5 w-3.5" />Issues
                {open > 0 && <span className="ml-1 h-4 min-w-[16px] px-1 rounded-full text-[9px] font-bold flex items-center justify-center" style={{ background: "#ef4444", color: "white" }}>{open}</span>}
              </TabsTrigger>
              <TabsTrigger value="report" className="gap-1.5 text-xs h-7 data-[state=active]:text-amber-400"><Layers className="h-3.5 w-3.5" />Summary</TabsTrigger>
            </TabsList>

            {/* ══ SCENE LOG ══ */}
            <TabsContent value="log">
              {allScenes.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed flex flex-col items-center py-20 gap-3" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                  <Clapperboard className="h-12 w-12 opacity-20" />
                  <p className="text-sm">No scenes found</p>
                  <p className="text-xs text-muted-foreground">Create scenes in your project first, then log continuity notes here.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-muted-foreground">{allScenes.length} scenes — click to expand and log continuity notes</p>
                    <p className="text-[10px]" style={{ color: "#D4AF37" }}>{loggedScenes} logged</p>
                  </div>
                  {allScenes.map((scene: any) => (
                    <SceneCard
                      key={scene.id}
                      scene={scene}
                      note={data.notes[scene.id] || { ...BLANK_NOTE(), sceneId: scene.id }}
                      onSave={note => saveNote(scene.id, note)}
                      onFlag={quickFlag}
                      characters={allChars}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ══ ISSUES ══ */}
            <TabsContent value="issues">
              <div className="space-y-4">
                {/* Toolbar */}
                <div className="flex items-center gap-3 flex-wrap">
                  <Select value={filterSev} onValueChange={setFilterSev}>
                    <SelectTrigger className="h-8 text-xs w-36 bg-black/30 border-border/40"><SelectValue placeholder="Severity" /></SelectTrigger>
                    <SelectContent><SelectItem value="all" className="text-xs">All Severities</SelectItem>{(["high","medium","low"] as IssueSeverity[]).map(s=><SelectItem key={s} value={s} className="text-xs capitalize"><span className={SEVERITY_CFG[s].color}>{SEVERITY_CFG[s].label}</span></SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={filterCat} onValueChange={setFilterCat}>
                    <SelectTrigger className="h-8 text-xs w-40 bg-black/30 border-border/40"><SelectValue placeholder="Category" /></SelectTrigger>
                    <SelectContent><SelectItem value="all" className="text-xs">All Categories</SelectItem>{ISSUE_CATEGORIES.map(c=><SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={filterStat} onValueChange={setFilterStat}>
                    <SelectTrigger className="h-8 text-xs w-36 bg-black/30 border-border/40"><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent><SelectItem value="all" className="text-xs">All Statuses</SelectItem>{(["open","acknowledged","fixed"] as IssueStatus[]).map(s=><SelectItem key={s} value={s} className="text-xs capitalize"><span className={STATUS_CFG[s].color}>{STATUS_CFG[s].label}</span></SelectItem>)}</SelectContent>
                  </Select>
                  <div className="flex-1" />
                  <Button size="sm" variant="outline" onClick={() => { setAddFormInit({}); setShowAddForm(true); }} className="gap-2 h-8 text-xs border-border/40">
                    <Plus className="h-3.5 w-3.5" />Flag Issue
                  </Button>
                </div>

                {/* Add form */}
                {showAddForm && (
                  <AddIssueForm scenes={allScenes} onAdd={addIssue} onClose={() => setShowAddForm(false)} />
                )}

                {/* AI context */}
                {lastAiRun && (
                  <div className="rounded-xl border px-4 py-2.5 flex items-center gap-3" style={{ borderColor: "rgba(22,163,74,0.2)", background: "rgba(22,163,74,0.04)" }}>
                    <Sparkles className="h-4 w-4 text-green-400 shrink-0" />
                    <p className="text-xs text-muted-foreground flex-1">Last AI scan: <span className="text-green-400 font-semibold">{lastAiRun}</span> — AI issues replace previous AI scan; manual flags are always preserved.</p>
                    <Button size="sm" variant="ghost" onClick={() => aiCheck.mutate({ projectId })} disabled={aiCheck.isPending} className="gap-1.5 h-7 text-xs text-green-400">
                      {aiCheck.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}Re-scan
                    </Button>
                  </div>
                )}

                {filteredIssues.length === 0 ? (
                  <div className="rounded-2xl border-2 border-dashed flex flex-col items-center py-20 gap-3" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                    <ShieldCheck className="h-12 w-12 text-green-400 opacity-40" />
                    <p className="text-sm font-semibold">{data.issues.length === 0 ? "No issues flagged yet" : "No issues match the filter"}</p>
                    <p className="text-xs text-muted-foreground mt-1 text-center max-w-xs">
                      {data.issues.length === 0
                        ? "Log notes scene-by-scene and use quick-flag buttons, or run AI Check to automatically find continuity errors."
                        : "Try clearing the filters above."}
                    </p>
                    {data.issues.length === 0 && (
                      <Button size="sm" onClick={() => aiCheck.mutate({ projectId })} disabled={aiCheck.isPending} className="gap-2 text-xs mt-2" style={{ background: "linear-gradient(135deg,#16a34a,#15803d)" }}>
                        <Sparkles className="h-3.5 w-3.5" />Run AI Check
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Column header */}
                    <div className="hidden sm:grid px-4 py-1.5 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/40"
                      style={{ gridTemplateColumns: "90px 120px 1fr 160px 120px 28px" }}>
                      <div>Severity</div><div>Category</div><div>Description</div><div>Scene</div><div>Status</div><div />
                    </div>

                    {filteredIssues.map(issue => (
                      <div key={issue.id} className={`rounded-xl border overflow-hidden ${SEVERITY_CFG[issue.severity].bg}`}
                        style={{ borderColor: issue.status === "fixed" ? "rgba(34,197,94,0.15)" : SEVERITY_CFG[issue.severity].border.replace("border-","").replace("/20","").replace("border","") + "33" }}>
                        <div className="hidden sm:grid items-start px-4 py-3 gap-3"
                          style={{ gridTemplateColumns: "90px 120px 1fr 160px 120px 28px" }}>
                          <div className="pt-0.5"><SeverityBadge severity={issue.severity} /></div>
                          <div className="pt-0.5"><CategoryTag cat={issue.category} /></div>
                          <div>
                            <p className={`text-xs leading-relaxed ${issue.status === "fixed" ? "line-through text-muted-foreground/40" : ""}`}>{issue.description}</p>
                            {issue.suggestion && <p className="text-[10px] text-muted-foreground mt-1 italic">{issue.suggestion}</p>}
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-[9px] text-muted-foreground/40">{issue.source === "ai" ? "AI scan" : "Manual"}</span>
                              <span className="text-[9px] text-muted-foreground/40">{new Date(issue.addedAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <p className="text-[10px] text-muted-foreground/60 leading-relaxed pt-0.5">{issue.sceneRef || "—"}</p>
                          <div className="flex flex-col gap-1.5">
                            {(["open","acknowledged","fixed"] as IssueStatus[]).map(s => (
                              <StatusPill key={s} status={s}
                                onClick={() => updateIssueStatus(issue.id, s)} />
                            ))}
                          </div>
                          <button onClick={() => deleteIssue(issue.id)} className="p-1 rounded hover:bg-red-500/10 text-muted-foreground/20 hover:text-red-400 transition-all mt-0.5"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>

                        {/* Mobile layout */}
                        <div className="sm:hidden p-4 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap"><SeverityBadge severity={issue.severity} /><CategoryTag cat={issue.category} /></div>
                          <p className={`text-xs leading-relaxed ${issue.status === "fixed" ? "line-through text-muted-foreground/40" : ""}`}>{issue.description}</p>
                          {issue.sceneRef && <p className="text-[10px] text-muted-foreground/60">{issue.sceneRef}</p>}
                          <div className="flex items-center gap-2 flex-wrap">
                            {(["open","acknowledged","fixed"] as IssueStatus[]).map(s => <StatusPill key={s} status={s} onClick={() => updateIssueStatus(issue.id, s)} />)}
                            <button onClick={() => deleteIssue(issue.id)} className="p-1 ml-auto hover:bg-red-500/10 text-muted-foreground/30 hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ══ SUMMARY ══ */}
            <TabsContent value="report">
              <div className="space-y-5">
                {/* Severity breakdown */}
                <div className="grid grid-cols-3 gap-4">
                  {([["high","High Issues",high],["medium","Medium Issues",medium],["low","Low Issues",low]] as const).map(([sev,label,count]) => {
                    const cfg = SEVERITY_CFG[sev];
                    const total = data.issues.filter(i=>i.severity===sev).length;
                    const fixedN = data.issues.filter(i=>i.severity===sev && i.status==="fixed").length;
                    const pct = total > 0 ? Math.round(fixedN/total*100) : 0;
                    return (
                      <div key={sev} className={`rounded-xl border p-4 ${cfg.bg}`} style={{ borderColor: cfg.border.replace("border-","") }}>
                        <div className="flex items-center justify-between mb-3">
                          <p className={`text-xs font-semibold ${cfg.color}`}>{label}</p>
                          <span className={`text-2xl font-bold ${cfg.color}`}>{count}</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden bg-white/5">
                          <div className="h-full rounded-full bg-green-500/60 transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1.5">{fixedN}/{total} fixed</p>
                      </div>
                    );
                  })}
                </div>

                {/* Category breakdown */}
                <div className="rounded-xl border p-5" style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
                  <p className="text-xs font-semibold mb-4">Issues by Category</p>
                  <div className="space-y-2.5">
                    {ISSUE_CATEGORIES.map(cat => {
                      const catIssues = data.issues.filter(i => i.category === cat);
                      if (catIssues.length === 0) return null;
                      const pct = Math.round((catIssues.filter(i=>i.status==="fixed").length / catIssues.length) * 100);
                      return (
                        <div key={cat} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">{cat}</span>
                            <div className="flex items-center gap-3">
                              <div className="flex gap-1">
                                {catIssues.filter(i=>i.severity==="high").length > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 font-bold">{catIssues.filter(i=>i.severity==="high").length}H</span>}
                                {catIssues.filter(i=>i.severity==="medium").length > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-bold">{catIssues.filter(i=>i.severity==="medium").length}M</span>}
                                {catIssues.filter(i=>i.severity==="low").length > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-bold">{catIssues.filter(i=>i.severity==="low").length}L</span>}
                              </div>
                              <span className="text-[10px] text-muted-foreground/50 w-12 text-right">{pct}% fixed</span>
                            </div>
                          </div>
                          <div className="h-1 rounded-full overflow-hidden bg-white/5">
                            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct === 100 ? "#4ade80" : "#D4AF37", opacity: 0.7 }} />
                          </div>
                        </div>
                      );
                    }).filter(Boolean)}
                    {data.issues.length === 0 && <p className="text-xs text-muted-foreground/50 text-center py-4">No issues yet</p>}
                  </div>
                </div>

                {/* Scene log coverage */}
                <div className="rounded-xl border p-5" style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs font-semibold">Scene Log Coverage</p>
                    <span className="text-[10px]" style={{ color: "#D4AF37" }}>{loggedScenes} / {allScenes.length} scenes</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden bg-white/5 mb-4">
                    <div className="h-full rounded-full transition-all" style={{ width: `${allScenes.length > 0 ? Math.round(loggedScenes/allScenes.length*100) : 0}%`, background: "linear-gradient(90deg,#D4AF37,#b8960c)", opacity: 0.8 }} />
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                    {allScenes.map((scene: any) => {
                      const note = data.notes[scene.id];
                      const hasData = note && (note.wardrobe || note.hairMakeup || note.propsIn || note.supervisorNote);
                      return (
                        <button key={scene.id} onClick={() => { setActiveTab("log"); }}
                          title={`Scene ${scene.sceneNumber || "?"}: ${scene.title || "Untitled"}`}
                          className="h-7 rounded-lg text-[9px] font-bold transition-all"
                          style={{ background: hasData ? "rgba(212,175,55,0.15)" : "rgba(255,255,255,0.04)", color: hasData ? "#D4AF37" : "rgba(255,255,255,0.2)", border: `1px solid ${hasData ? "rgba(212,175,55,0.2)" : "rgba(255,255,255,0.06)"}` }}>
                          {scene.sceneNumber || (scene.orderIndex || 0) + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" onClick={exportCSV} disabled={data.issues.length === 0} className="gap-2 border-border/40"><Download className="h-4 w-4" />Export Issues CSV</Button>
                  <Button variant="outline" onClick={exportTXT} className="gap-2 border-border/40"><FileText className="h-4 w-4" />Full Report TXT</Button>
                  <Button onClick={() => aiCheck.mutate({ projectId })} disabled={aiCheck.isPending} className="gap-2 ml-auto" style={{ background: "linear-gradient(135deg,#16a34a,#15803d)" }}>
                    {aiCheck.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{lastAiRun ? "Re-run AI Scan" : "Run AI Scan"}
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
        <NextStageCTA projectId={projectId} currentStage={6} />
      </div>
    );
  }

  export default function ContinuityCheck() {
    return (
      <SubscriptionGate feature="Continuity Check" featureKey="canUseContinuityCheck" requiredTier="amateur">
        <ContinuityCheckInner />
      </SubscriptionGate>
    );
  }
  