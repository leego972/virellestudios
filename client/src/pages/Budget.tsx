import { useState, useEffect, useMemo, useCallback } from "react";
  import { useParams, useLocation } from "wouter";
  import { Button } from "@/components/ui/button";
  import { Input } from "@/components/ui/input";
  import { Label } from "@/components/ui/label";
  import { Textarea } from "@/components/ui/textarea";
  import { Badge } from "@/components/ui/badge";
  import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
  import { trpc } from "@/lib/trpc";
  import { toast } from "sonner";
  import {
    ArrowLeft, Plus, DollarSign, Trash2, Save, Loader2, ChevronDown,
    ChevronUp, Download, Printer, AlertTriangle, TrendingUp, TrendingDown,
    Check, X, BarChart3, ListCollapse, Layers, Sparkles, RefreshCw,
  } from "lucide-react";
  import { useAuth } from "@/_core/hooks/useAuth";
  import { getLoginUrl } from "@/const";

  // ─── Types ────────────────────────────────────────────────────────────────────

  interface LineItem { name: string; cost: number; notes?: string; }
  interface Category { label: string; estimate: number; actual: number; items: LineItem[]; notes?: string; }
  type Breakdown = Record<string, Category>;

  // ─── Constants ────────────────────────────────────────────────────────────────

  const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "JPY", "MXN", "BRL", "INR", "KRW"];
  const DEPT_COLORS: Record<string, string> = {
    above_the_line: "#D4AF37", production:  "#60a5fa", equipment: "#a78bfa",
    locations:      "#34d399",  art_dept:    "#fb923c", post:      "#e879f9",
    marketing:      "#22d3ee",  contingency: "#6b7280",
  };

  const DEFAULT_CATEGORIES: Array<{ key: string; label: string }> = [
    { key: "above_the_line", label: "Above the Line" },
    { key: "production",     label: "Production Crew" },
    { key: "equipment",      label: "Camera & Equipment" },
    { key: "locations",      label: "Locations & Permits" },
    { key: "art_dept",       label: "Art / Wardrobe / Props" },
    { key: "post",           label: "Post-Production" },
    { key: "marketing",      label: "Marketing & Deliverables" },
    { key: "contingency",    label: "Contingency (10%)" },
  ];

  const FORMAT_BUDGETS: Record<string, Record<string, number>> = {
    "Short Film (< $10K)": { above_the_line:1200, production:1800, equipment:1500, locations:800, art_dept:900, post:1200, marketing:400, contingency:800 },
    "Micro Feature ($30K)": { above_the_line:6000, production:5000, equipment:4000, locations:2500, art_dept:3000, post:4500, marketing:1500, contingency:3000 },
    "Indie Feature ($100K)": { above_the_line:20000, production:18000, equipment:12000, locations:8000, art_dept:10000, post:18000, marketing:6000, contingency:8000 },
    "Mid-Budget ($500K)": { above_the_line:100000, production:90000, equipment:55000, locations:40000, art_dept:50000, post:90000, marketing:30000, contingency:45000 },
    "Studio ($5M)": { above_the_line:1200000, production:900000, equipment:500000, locations:350000, art_dept:450000, post:900000, marketing:400000, contingency:300000 },
  };

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  function fmt(n: number, currency: string) {
    try { return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(n); }
    catch { return `${currency} ${n.toLocaleString()}`; }
  }

  function pct(part: number, total: number) {
    if (total === 0) return 0;
    return Math.round((part / total) * 100);
  }

  // ─── Budget Bar ───────────────────────────────────────────────────────────────

  function BudgetBar({ estimate, actual, currency, color }: { estimate: number; actual: number; currency: string; color: string }) {
    const over = actual > estimate && estimate > 0;
    const usedPct = estimate > 0 ? Math.min(100, Math.round((actual / estimate) * 100)) : 0;
    return (
      <div className="space-y-1">
        <div className="h-2 rounded-full overflow-hidden bg-white/5">
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${usedPct}%`, background: over ? "#ef4444" : color, opacity: 0.8 }} />
        </div>
        <div className="flex items-center justify-between text-[9px] text-muted-foreground/50">
          <span>{usedPct}% spent</span>
          {over && <span className="text-red-400 font-semibold">+{fmt(actual - estimate, currency)} over</span>}
        </div>
      </div>
    );
  }

  // ─── Department Row ───────────────────────────────────────────────────────────

  function DeptRow({
    deptKey, cat, currency, totalEstimate, onChange, onRemove,
  }: {
    deptKey: string; cat: Category; currency: string; totalEstimate: number;
    onChange: (patch: Partial<Category>) => void;
    onRemove: () => void;
  }) {
    const [expanded, setExpanded] = useState(false);
    const color = DEPT_COLORS[deptKey] || "#D4AF37";
    const over = (cat.actual || 0) > (cat.estimate || 0) && cat.estimate > 0;
    const variance = (cat.actual || 0) - (cat.estimate || 0);
    const share = pct(cat.estimate, totalEstimate);

    const addItem = () => onChange({ items: [...(cat.items || []), { name: "New line item", cost: 0 }] });
    const updateItem = (i: number, patch: Partial<LineItem>) => {
      const items = (cat.items || []).map((it, j) => j === i ? { ...it, ...patch } : it);
      const estimate = items.reduce((s, it) => s + (Number(it.cost) || 0), 0);
      onChange({ items, estimate });
    };
    const removeItem = (i: number) => {
      const items = (cat.items || []).filter((_, j) => j !== i);
      const estimate = items.reduce((s, it) => s + (Number(it.cost) || 0), 0);
      onChange({ items, estimate });
    };

    return (
      <div className="rounded-xl border overflow-hidden transition-all"
        style={{ borderColor: expanded ? `${color}40` : "rgba(255,255,255,0.07)", background: expanded ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.015)" }}>

        {/* Department header */}
        <div className="flex items-center gap-3 px-4 py-3 cursor-pointer" onClick={() => setExpanded(e => !e)}>
          <div className="h-3 w-3 rounded-sm shrink-0" style={{ background: color, opacity: 0.8 }} />
          <Input
            value={cat.label}
            onChange={e => { e.stopPropagation(); onChange({ label: e.target.value }); }}
            onClick={e => e.stopPropagation()}
            className="flex-1 h-8 text-xs font-semibold bg-transparent border-transparent hover:border-border/30 focus:border-border/40 max-w-[220px]"
          />
          <div className="flex items-center gap-4 ml-auto shrink-0">
            {share > 0 && <span className="text-[9px] text-muted-foreground/40 w-12 text-right">{share}%</span>}
            <div className="text-right hidden sm:block">
              <div className="text-[9px] text-muted-foreground/40 uppercase tracking-wider">Estimate</div>
              <div className="text-xs font-semibold" style={{ color }}>{fmt(cat.estimate, currency)}</div>
            </div>
            <div className="text-right hidden sm:block">
              <div className="text-[9px] text-muted-foreground/40 uppercase tracking-wider">Actual</div>
              <div className={`text-xs font-semibold ${over ? "text-red-400" : "text-muted-foreground"}`}>{fmt(cat.actual || 0, currency)}</div>
            </div>
            {over && <AlertTriangle className="h-3.5 w-3.5 text-red-400 shrink-0" />}
            {(cat.actual || 0) > 0 && !over && <Check className="h-3.5 w-3.5 text-green-400 shrink-0" />}
            {expanded ? <ChevronUp className="h-4 w-4" style={{ color }} /> : <ChevronDown className="h-4 w-4 text-muted-foreground/30" />}
          </div>
        </div>

        {/* Progress bar */}
        {(cat.actual || 0) > 0 && !expanded && (
          <div className="px-4 pb-3">
            <BudgetBar estimate={cat.estimate} actual={cat.actual || 0} currency={currency} color={color} />
          </div>
        )}

        {/* Expanded detail */}
        {expanded && (
          <div className="border-t px-4 py-5 space-y-4" style={{ borderColor: `${color}20` }}>
            {/* Estimate + Actual inputs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Estimate</label>
                <Input type="number" min={0} value={cat.estimate}
                  onChange={e => onChange({ estimate: Number(e.target.value) || 0 })}
                  className="h-8 text-xs bg-black/30 border-border/30" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Actual Spent</label>
                <Input type="number" min={0} value={cat.actual || 0}
                  onChange={e => onChange({ actual: Number(e.target.value) || 0 })}
                  className="h-8 text-xs bg-black/30 border-border/30" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Variance</label>
                <div className={`h-8 rounded-md border border-border/30 flex items-center px-3 text-xs font-semibold ${over ? "text-red-400 bg-red-500/5" : variance < 0 ? "text-green-400 bg-green-500/5" : "text-muted-foreground bg-black/20"}`}>
                  {variance > 0 ? "+" : ""}{fmt(variance, currency)} {over ? "over" : variance < 0 ? "under" : "on budget"}
                </div>
              </div>
            </div>

            <BudgetBar estimate={cat.estimate} actual={cat.actual || 0} currency={currency} color={color} />

            {/* Line items */}
            {(cat.items || []).length > 0 && (
              <div className="space-y-2">
                <div className="grid text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/40 px-1"
                  style={{ gridTemplateColumns: "1fr 100px 1fr 28px" }}>
                  <div>Line Item</div><div>Cost</div><div>Notes</div><div />
                </div>
                {(cat.items || []).map((it, i) => (
                  <div key={i} className="grid items-center gap-2" style={{ gridTemplateColumns: "1fr 100px 1fr 28px" }}>
                    <Input value={it.name} onChange={e => updateItem(i, { name: e.target.value })}
                      placeholder="Line item" className="h-7 text-xs bg-black/30 border-border/30" />
                    <Input type="number" min={0} value={it.cost} onChange={e => updateItem(i, { cost: Number(e.target.value) || 0 })}
                      className="h-7 text-xs bg-black/30 border-border/30" />
                    <Input value={it.notes || ""} onChange={e => updateItem(i, { notes: e.target.value })}
                      placeholder="Optional notes" className="h-7 text-xs bg-black/30 border-border/30" />
                    <button onClick={() => removeItem(i)} className="h-7 w-7 flex items-center justify-center rounded hover:bg-red-500/10 text-muted-foreground/30 hover:text-red-400 transition-all">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between">
              <Button size="sm" variant="ghost" onClick={addItem} className="gap-1.5 h-7 text-xs text-muted-foreground border border-border/30 hover:border-border/50">
                <Plus className="h-3.5 w-3.5" />Add Line Item
              </Button>
              <button onClick={onRemove} className="text-[10px] text-muted-foreground/30 hover:text-red-400 transition-all flex items-center gap-1">
                <Trash2 className="h-3 w-3" />Remove Department
              </button>
            </div>

            {cat.notes !== undefined && (
              <div className="space-y-1.5">
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Department Notes</label>
                <Textarea value={cat.notes || ""} onChange={e => onChange({ notes: e.target.value })}
                  placeholder="Budget notes for this department…"
                  className="text-xs bg-black/30 border-border/30 resize-none min-h-[48px]" />
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ─── Main ─────────────────────────────────────────────────────────────────────

  export default function Budget() {
    const { id } = useParams<{ id: string }>();
    const [, navigate] = useLocation();
    const { user, loading: authLoading } = useAuth();
    const projectId = parseInt(id || "0");
    const utils = trpc.useUtils();

    const { data: project }              = trpc.project.get.useQuery({ id: projectId }, { enabled: !!user && !!projectId });
    const { data: budgets = [], isLoading } = trpc.budget.list.useQuery({ projectId }, { enabled: !!user && !!projectId });
    const upsertMut                      = trpc.budgetManual.upsert.useMutation();

    const [breakdown, setBreakdown] = useState<Breakdown>({});
    const [currency,  setCurrency]  = useState("USD");
    const [dirty,     setDirty]     = useState(false);
    const [tab,       setTab]       = useState("overview");
    const [seedOpen,  setSeedOpen]  = useState(false);
    const [seedFmt,   setSeedFmt]   = useState("Indie Feature ($100K)");

    // Seed from DB
    useEffect(() => {
      const b: any = (budgets as any[])[0];
      if (b) {
        setCurrency(b.currency || "USD");
        const bd = (b.breakdown as Breakdown) || {};
        if (Object.keys(bd).length > 0) { setBreakdown(bd); return; }
      }
      if (Object.keys(breakdown).length === 0) {
        const seed: Breakdown = {};
        for (const c of DEFAULT_CATEGORIES) seed[c.key] = { label: c.label, estimate: 0, actual: 0, items: [], notes: "" };
        setBreakdown(seed);
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [budgets]);

    const totals = useMemo(() => {
      let estimate = 0, actual = 0;
      for (const c of Object.values(breakdown)) {
        estimate += Number(c.estimate || 0);
        actual   += Number(c.actual   || 0);
      }
      return { estimate, actual, variance: actual - estimate };
    }, [breakdown]);

    const overBudgetDepts = useMemo(() =>
      Object.entries(breakdown).filter(([,c]) => (c.actual||0) > c.estimate && c.estimate > 0),
      [breakdown]
    );

    const patch = useCallback((key: string, p: Partial<Category>) => {
      setBreakdown(b => ({ ...b, [key]: { ...b[key], ...p } }));
      setDirty(true);
    }, []);

    const addDept = () => {
      const key = `dept_${Date.now()}`;
      setBreakdown(b => ({ ...b, [key]: { label: "New Department", estimate: 0, actual: 0, items: [], notes: "" } }));
      setDirty(true);
    };
    const removeDept = (key: string) => {
      setBreakdown(b => { const n = { ...b }; delete n[key]; return n; });
      setDirty(true);
    };

    const applySeed = () => {
      const amounts = FORMAT_BUDGETS[seedFmt] || {};
      const next: Breakdown = {};
      for (const c of DEFAULT_CATEGORIES) {
        next[c.key] = { label: c.label, estimate: amounts[c.key] || 0, actual: 0, items: [], notes: "" };
      }
      setBreakdown(next); setDirty(true); setSeedOpen(false);
      toast.success(`Seeded budget for "${seedFmt}"`);
    };

    const save = async () => {
      try {
        const clean: Breakdown = {};
        for (const [k, c] of Object.entries(breakdown)) {
          clean[k] = {
            label:    c.label || k,
            estimate: Number(c.estimate || 0),
            actual:   Number(c.actual   || 0),
            items:    (c.items || []).map(it => ({ name: it.name || "Item", cost: Number(it.cost || 0), ...(it.notes ? { notes: it.notes } : {}) })),
            ...(c.notes ? { notes: c.notes } : {}),
          };
        }
        await upsertMut.mutateAsync({ projectId, currency, breakdown: clean });
        await utils.budget.list.invalidate();
        toast.success("Budget saved");
        setDirty(false);
      } catch (e: any) { toast.error(e?.message || "Failed to save"); }
    };

    const exportCSV = () => {
      const rows: string[] = [["Department","Estimate","Actual","Variance","Line Item","Item Cost","Notes"].join(",")];
      for (const [,cat] of Object.entries(breakdown)) {
        if ((cat.items || []).length > 0) {
          for (const it of cat.items || []) {
            rows.push([`"${cat.label}"`, cat.estimate, cat.actual||0, (cat.actual||0)-cat.estimate, `"${it.name}"`, it.cost, `"${it.notes||""}"`].join(","));
          }
        } else {
          rows.push([`"${cat.label}"`, cat.estimate, cat.actual||0, (cat.actual||0)-cat.estimate, "", "", ""].join(","));
        }
      }
      rows.push(["TOTAL", totals.estimate, totals.actual, totals.variance, "", "", ""].join(","));
      const blob = new Blob([rows.join("\n")], { type: "text/csv" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `budget-${projectId}.csv`; a.click();
      toast.success("Exported as CSV");
    };

    const printBudget = () => {
      const w = window.open("", "_blank")!;
      const lines = [
        `<html><head><title>Budget — ${project?.title||"Project"}</title>`,
        `<style>body{font-family:Arial,sans-serif;padding:32px;color:#111}h1{font-size:20px;margin-bottom:4px}p{font-size:12px;color:#666;margin-bottom:24px}table{width:100%;border-collapse:collapse;font-size:12px}th{background:#f4f4f4;padding:8px;text-align:left;border:1px solid #ddd}td{padding:8px;border:1px solid #ddd}.over{color:red}.under{color:green}.total{font-weight:bold;background:#fafafa}</style></head><body>`,
        `<h1>Budget — ${project?.title||"Project"}</h1><p>Generated ${new Date().toLocaleString()} · ${currency}</p>`,
        `<table><tr><th>Department</th><th>Estimate</th><th>Actual</th><th>Variance</th><th>% of Budget</th></tr>`,
      ];
      for (const [,cat] of Object.entries(breakdown)) {
        const v = (cat.actual||0) - cat.estimate;
        const cls = v > 0 ? "over" : v < 0 ? "under" : "";
        lines.push(`<tr><td>${cat.label}</td><td>${fmt(cat.estimate,currency)}</td><td>${fmt(cat.actual||0,currency)}</td><td class="${cls}">${v>=0?"+":""}${fmt(v,currency)}</td><td>${pct(cat.estimate,totals.estimate)}%</td></tr>`);
      }
      lines.push(`<tr class="total"><td>TOTAL</td><td>${fmt(totals.estimate,currency)}</td><td>${fmt(totals.actual,currency)}</td><td>${totals.variance>=0?"+":""}${fmt(totals.variance,currency)}</td><td>100%</td></tr></table></body></html>`);
      w.document.write(lines.join(""));
      w.document.close(); w.print();
    };

    if (authLoading) return <div className="min-h-screen flex items-center justify-center" style={{ background:"#07070e" }}><Loader2 className="h-8 w-8 animate-spin" style={{ color:"#D4AF37" }} /></div>;
    if (!user) { window.location.href = getLoginUrl(); return null; }

    return (
      <div className="min-h-screen" style={{ background:"linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)" }}>
        {/* Header */}
        <div className="border-b sticky top-0 z-20" style={{ borderColor:"rgba(255,255,255,0.07)", background:"rgba(7,7,14,0.97)", backdropFilter:"blur(24px)" }}>
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => navigate(`/projects/${projectId}`)} className="gap-2 text-muted-foreground h-8">
                <ArrowLeft className="h-4 w-4 text-amber-400/70" />Back
              </Button>
              <div className="h-5 w-px bg-border/40" />
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0" style={{ background:"linear-gradient(135deg,#D4AF37,#b8960c)" }}>
                  <DollarSign className="text-black" style={{ width:18, height:18 }} />
                </div>
                <div>
                  <div className="font-bold text-sm">{project?.title} — Budget</div>
                  <div className="text-[10px] text-muted-foreground">
                    {fmt(totals.estimate,currency)} estimated · {overBudgetDepts.length > 0 ? `${overBudgetDepts.length} dept${overBudgetDepts.length>1?"s":""} over budget` : "on track"}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select value={currency} onValueChange={v => { setCurrency(v); setDirty(true); }}>
                <SelectTrigger className="h-8 w-20 text-xs bg-black/30 border-border/40"><SelectValue /></SelectTrigger>
                <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent>
              </Select>
              <Button size="sm" variant="ghost" onClick={exportCSV} className="gap-1.5 h-8 text-xs text-muted-foreground"><Download className="h-3.5 w-3.5" />CSV</Button>
              <Button size="sm" variant="outline" onClick={printBudget} className="gap-1.5 h-8 text-xs border-border/40"><Printer className="h-3.5 w-3.5" />Print</Button>
              <Button size="sm" onClick={save} disabled={!dirty || upsertMut.isPending} className="gap-1.5 h-8 text-xs" style={{ background:"linear-gradient(135deg,#D4AF37,#b8960c)", color:"#000", opacity: dirty ? 1 : 0.5 }}>
                {upsertMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}Save
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">
          {/* Top Sheet Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label:"Total Estimate", value:fmt(totals.estimate,currency), color:"#D4AF37", icon:BarChart3 },
              { label:"Total Actual",   value:fmt(totals.actual,currency),   color:"#60a5fa", icon:Layers },
              { label:"Variance",       value:(totals.variance>=0?"+":"")+fmt(totals.variance,currency), color: totals.variance>0?"#f87171":totals.variance<0?"#4ade80":"#6b7280", icon: totals.variance>0?TrendingUp:TrendingDown },
              { label:"Departments",    value:String(Object.keys(breakdown).length), color:"#a78bfa", icon:ListCollapse },
            ].map((s,i) => (
              <div key={i} className="rounded-xl border px-4 py-3" style={{ borderColor:"rgba(255,255,255,0.07)", background:"rgba(255,255,255,0.02)" }}>
                <div className="flex items-center gap-2 mb-1">
                  <s.icon style={{ width:14,height:14, color:s.color }} />
                  <span className="text-[9px] text-muted-foreground uppercase tracking-wider">{s.label}</span>
                </div>
                <div className="text-xl font-bold" style={{ color:s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Over-budget alert */}
          {overBudgetDepts.length > 0 && (
            <div className="rounded-xl border px-4 py-3 flex items-center gap-3" style={{ borderColor:"rgba(239,68,68,0.2)", background:"rgba(239,68,68,0.05)" }}>
              <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
              <p className="text-xs text-red-300"><span className="font-semibold">{overBudgetDepts.length} department{overBudgetDepts.length>1?"s":""} over budget:</span>{" "}
                {overBudgetDepts.map(([,c]) => c.label).join(", ")}
              </p>
            </div>
          )}

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="mb-5 border border-border/40 bg-black/40 h-9 gap-0.5">
              <TabsTrigger value="overview"    className="gap-1.5 text-xs h-7 data-[state=active]:text-amber-400"><BarChart3 className="h-3.5 w-3.5" />Overview</TabsTrigger>
              <TabsTrigger value="departments" className="gap-1.5 text-xs h-7 data-[state=active]:text-amber-400"><Layers className="h-3.5 w-3.5" />Departments</TabsTrigger>
            </TabsList>

            {/* ══ OVERVIEW ══ */}
            <TabsContent value="overview">
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-muted-foreground">Budget allocation by department</p>
                  <Button size="sm" variant="ghost" onClick={() => setSeedOpen(s => !s)} className="gap-1.5 h-7 text-xs text-muted-foreground border border-border/30 hover:border-amber-500/30 hover:text-amber-400">
                    <Sparkles className="h-3 w-3" />Seed Template
                  </Button>
                </div>

                {/* Seed form */}
                {seedOpen && (
                  <div className="rounded-xl border p-4 space-y-3" style={{ borderColor:"rgba(212,175,55,0.2)", background:"rgba(212,175,55,0.03)" }}>
                    <p className="text-xs font-semibold">Seed from production format</p>
                    <p className="text-[11px] text-muted-foreground">Choose a format to auto-fill suggested estimates. You can adjust any value after.</p>
                    <Select value={seedFmt} onValueChange={setSeedFmt}>
                      <SelectTrigger className="h-8 text-xs bg-black/30 border-border/40"><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.keys(FORMAT_BUDGETS).map(f => <SelectItem key={f} value={f} className="text-xs">{f}</SelectItem>)}</SelectContent>
                    </Select>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => setSeedOpen(false)} className="text-xs">Cancel</Button>
                      <Button size="sm" onClick={applySeed} className="gap-2 text-xs" style={{ background:"linear-gradient(135deg,#D4AF37,#b8960c)", color:"#000" }}>
                        <Sparkles className="h-3.5 w-3.5" />Apply Template
                      </Button>
                    </div>
                  </div>
                )}

                {/* Allocation bars */}
                <div className="rounded-xl border p-5 space-y-4" style={{ borderColor:"rgba(255,255,255,0.07)", background:"rgba(255,255,255,0.02)" }}>
                  {Object.entries(breakdown).map(([key, cat]) => {
                    const color = DEPT_COLORS[key] || "#D4AF37";
                    const share = pct(cat.estimate, totals.estimate);
                    const over  = (cat.actual||0) > cat.estimate && cat.estimate > 0;
                    return (
                      <div key={key} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div className="h-2.5 w-2.5 rounded-sm" style={{ background:color, opacity:0.8 }} />
                            <span className="text-muted-foreground">{cat.label}</span>
                            {over && <span className="text-[9px] text-red-400 font-semibold">OVER</span>}
                          </div>
                          <div className="flex items-center gap-4 text-[10px]">
                            <span style={{ color }}>{fmt(cat.estimate,currency)}</span>
                            {(cat.actual||0) > 0 && <span className={over?"text-red-400":"text-green-400"}>{fmt(cat.actual||0,currency)}</span>}
                            <span className="text-muted-foreground/40 w-8 text-right">{share}%</span>
                          </div>
                        </div>
                        <div className="relative h-2 rounded-full overflow-hidden bg-white/5">
                          {/* Estimate bar */}
                          <div className="absolute inset-y-0 left-0 rounded-full" style={{ width:`${share}%`, background:color, opacity:0.25 }} />
                          {/* Actual bar */}
                          {(cat.actual||0) > 0 && (
                            <div className="absolute inset-y-0 left-0 rounded-full transition-all"
                              style={{ width:`${Math.min(share, pct(cat.actual||0, totals.estimate))}%`, background: over?"#ef4444":color, opacity:0.8 }} />
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {Object.keys(breakdown).length === 0 && (
                    <p className="text-xs text-muted-foreground/50 text-center py-4">No departments yet — add them in the Departments tab.</p>
                  )}
                </div>

                {/* Spend progress */}
                {totals.estimate > 0 && (
                  <div className="rounded-xl border px-5 py-4" style={{ borderColor:"rgba(255,255,255,0.07)", background:"rgba(255,255,255,0.02)" }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground">Overall spend</span>
                      <span className="text-xs font-semibold" style={{ color: totals.variance>0?"#f87171":"#D4AF37" }}>{pct(totals.actual,totals.estimate)}% of budget</span>
                    </div>
                    <div className="h-3 rounded-full overflow-hidden bg-white/5">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width:`${Math.min(100,pct(totals.actual,totals.estimate))}%`, background: totals.variance>0?"linear-gradient(90deg,#ef4444,#dc2626)":"linear-gradient(90deg,#D4AF37,#b8960c)" }} />
                    </div>
                    <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground/50">
                      <span>{fmt(totals.actual,currency)} spent</span>
                      <span>{fmt(totals.estimate-totals.actual,currency)} remaining</span>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ══ DEPARTMENTS ══ */}
            <TabsContent value="departments">
              <div className="space-y-2.5">
                {isLoading ? (
                  <div className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin inline-block" style={{ color:"#D4AF37" }} /></div>
                ) : (
                  <>
                    {Object.entries(breakdown).map(([key, cat]) => (
                      <DeptRow key={key} deptKey={key} cat={cat} currency={currency}
                        totalEstimate={totals.estimate}
                        onChange={p => patch(key, p)}
                        onRemove={() => removeDept(key)} />
                    ))}
                    <div className="flex items-center gap-3 pt-1">
                      <Button size="sm" variant="ghost" onClick={addDept}
                        className="gap-2 h-8 text-xs border border-border/30 hover:border-amber-500/30 hover:text-amber-400 transition-all text-muted-foreground">
                        <Plus className="h-3.5 w-3.5" />Add Department
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    );
  }
  