import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ArrowLeft, Plus, DollarSign, Trash2, Save, Loader2, Sparkles } from "lucide-react";

interface Item { name: string; cost: number; notes?: string; }
interface Category { label: string; estimate: number; actual?: number; items?: Item[]; }
type Breakdown = Record<string, Category>;

const DEFAULT_CATEGORIES: { key: string; label: string }[] = [
  { key: "above_the_line", label: "Above the line (cast/director/writer)" },
  { key: "production", label: "Production crew" },
  { key: "equipment", label: "Camera & equipment" },
  { key: "locations", label: "Locations & permits" },
  { key: "art_dept", label: "Art / wardrobe / props" },
  { key: "post", label: "Post-production" },
  { key: "marketing", label: "Marketing & deliverables" },
  { key: "contingency", label: "Contingency (10%)" },
];

/** v6.63 — Manual budget editor on top of existing budgets table. */
export default function Budget() {
  const { id } = useParams<{ id: string }>();
  const projectId = parseInt(id || "0");
  const utils = trpc.useUtils();
  const { data: project } = trpc.project.get.useQuery({ id: projectId }, { enabled: !!projectId });
  const { data: budgets = [], isLoading } = trpc.budget.list.useQuery({ projectId }, { enabled: !!projectId });
  const upsertMut = trpc.budgetManual.upsert.useMutation();

  const [breakdown, setBreakdown] = useState<Breakdown>({});
  const [currency, setCurrency] = useState("USD");
  const [dirty, setDirty] = useState(false);

  // Load from existing budget row if present
  useEffect(() => {
    const b: any = (budgets as any[])[0];
    if (b) {
      setCurrency(b.currency || "USD");
      const bd = (b.breakdown as Breakdown) || {};
      if (Object.keys(bd).length > 0) { setBreakdown(bd); return; }
    }
    if (Object.keys(breakdown).length === 0) {
      const seed: Breakdown = {};
      for (const c of DEFAULT_CATEGORIES) seed[c.key] = { label: c.label, estimate: 0, actual: 0, items: [] };
      setBreakdown(seed);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [budgets]);

  const totals = useMemo(() => {
    let estimate = 0, actual = 0;
    for (const c of Object.values(breakdown)) {
      estimate += Number(c.estimate || 0);
      actual += Number(c.actual || 0);
    }
    return { estimate, actual, variance: actual - estimate };
  }, [breakdown]);

  function setCat(key: string, patch: Partial<Category>) {
    setBreakdown((b) => ({ ...b, [key]: { ...b[key], ...patch } }));
    setDirty(true);
  }
  function addCustomCategory() {
    const key = `custom_${Date.now()}`;
    setBreakdown((b) => ({ ...b, [key]: { label: "New category", estimate: 0, actual: 0, items: [] } }));
    setDirty(true);
  }
  function removeCategory(key: string) {
    setBreakdown((b) => { const next = { ...b }; delete next[key]; return next; });
    setDirty(true);
  }
  function addItem(catKey: string) {
    setBreakdown((b) => {
      const c = b[catKey];
      const items = [...(c.items || []), { name: "New line", cost: 0 }];
      const estimate = items.reduce((s, it) => s + (it.cost || 0), 0);
      return { ...b, [catKey]: { ...c, items, estimate } };
    });
    setDirty(true);
  }
  function updateItem(catKey: string, idx: number, patch: Partial<Item>) {
    setBreakdown((b) => {
      const c = b[catKey];
      const items = (c.items || []).map((it, i) => i === idx ? { ...it, ...patch } : it);
      const estimate = items.reduce((s, it) => s + (it.cost || 0), 0);
      return { ...b, [catKey]: { ...c, items, estimate } };
    });
    setDirty(true);
  }
  function removeItem(catKey: string, idx: number) {
    setBreakdown((b) => {
      const c = b[catKey];
      const items = (c.items || []).filter((_, i) => i !== idx);
      const estimate = items.reduce((s, it) => s + (it.cost || 0), 0);
      return { ...b, [catKey]: { ...c, items, estimate } };
    });
    setDirty(true);
  }

  async function save() {
    try {
      // Strip empty optional fields before sending
      const clean: Breakdown = {};
      for (const [k, c] of Object.entries(breakdown)) {
        clean[k] = {
          label: c.label || k,
          estimate: Number(c.estimate || 0),
          actual: Number(c.actual || 0),
          items: (c.items || []).map((it) => ({ name: it.name || "Item", cost: Number(it.cost || 0), notes: it.notes || undefined })),
        };
      }
      await upsertMut.mutateAsync({ projectId, currency, breakdown: clean });
      await utils.budget.list.invalidate();
      toast.success("Budget saved");
      setDirty(false);
    } catch (e: any) { toast.error(e?.message || "Failed to save"); }
  }

  function fmt(n: number) {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(n);
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <Link href={`/projects/${projectId}`}>
              <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-zinc-100">
                <ArrowLeft className="w-4 h-4 mr-1" /> Back to project
              </Button>
            </Link>
            <h1 className="text-2xl font-bold flex items-center gap-2 mt-1">
              <DollarSign className="w-6 h-6 text-amber-500" /> Budget
            </h1>
            <p className="text-sm text-zinc-400">{project?.title || "—"} · estimate vs actual tracking</p>
          </div>
          <div className="flex items-center gap-2">
            <select value={currency} onChange={(e) => { setCurrency(e.target.value); setDirty(true); }} className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-sm">
              {["USD", "EUR", "GBP", "CAD", "AUD", "JPY"].map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <Button size="sm" disabled={!dirty || upsertMut.isPending} onClick={save} className="bg-amber-600 hover:bg-amber-500 text-zinc-950">
              {upsertMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Save className="w-3.5 h-3.5 mr-1" />}
              Save
            </Button>
          </div>
        </div>

        {/* Totals strip */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-zinc-950 border-zinc-800"><CardContent className="p-4"><div className="text-xs text-zinc-400 uppercase">Estimate</div><div className="text-2xl font-bold mt-1">{fmt(totals.estimate)}</div></CardContent></Card>
          <Card className="bg-zinc-950 border-zinc-800"><CardContent className="p-4"><div className="text-xs text-zinc-400 uppercase">Actual</div><div className="text-2xl font-bold mt-1">{fmt(totals.actual)}</div></CardContent></Card>
          <Card className={`bg-zinc-950 border ${totals.variance > 0 ? "border-rose-700" : "border-emerald-700"}`}><CardContent className="p-4"><div className="text-xs text-zinc-400 uppercase">Variance</div><div className={`text-2xl font-bold mt-1 ${totals.variance > 0 ? "text-rose-400" : "text-emerald-400"}`}>{totals.variance >= 0 ? "+" : ""}{fmt(totals.variance)}</div></CardContent></Card>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-zinc-500"><Loader2 className="w-5 h-5 animate-spin inline mr-2" />Loading…</div>
        ) : (
          <div className="space-y-3">
            {Object.entries(breakdown).map(([key, cat]) => {
              const overBy = (cat.actual || 0) > (cat.estimate || 0);
              return (
                <Card key={key} className={`bg-zinc-950 border ${overBy ? "border-rose-700/60" : "border-zinc-800"}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-3">
                      <Input value={cat.label} onChange={(e) => setCat(key, { label: e.target.value })} className="bg-zinc-900 border-zinc-800 text-sm font-semibold flex-1 max-w-md" />
                      <div className="flex items-center gap-2">
                        <div className="text-xs text-zinc-400">Est:</div>
                        <Input type="number" min={0} value={cat.estimate || 0} onChange={(e) => setCat(key, { estimate: Number(e.target.value) || 0 })} className="bg-zinc-900 border-zinc-800 w-28 h-8 text-sm" />
                        <div className="text-xs text-zinc-400">Actual:</div>
                        <Input type="number" min={0} value={cat.actual || 0} onChange={(e) => setCat(key, { actual: Number(e.target.value) || 0 })} className="bg-zinc-900 border-zinc-800 w-28 h-8 text-sm" />
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-400" onClick={() => removeCategory(key)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {(cat.items || []).map((it, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Input value={it.name} onChange={(e) => updateItem(key, idx, { name: e.target.value })} placeholder="Line item" className="bg-zinc-900 border-zinc-800 h-8 text-sm flex-1" />
                        <Input type="number" min={0} value={it.cost} onChange={(e) => updateItem(key, idx, { cost: Number(e.target.value) || 0 })} className="bg-zinc-900 border-zinc-800 w-28 h-8 text-sm" />
                        <Input value={it.notes || ""} onChange={(e) => updateItem(key, idx, { notes: e.target.value })} placeholder="Notes" className="bg-zinc-900 border-zinc-800 h-8 text-sm flex-1" />
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-400" onClick={() => removeItem(key, idx)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    ))}
                    <Button size="sm" variant="outline" onClick={() => addItem(key)} className="text-xs h-7"><Plus className="w-3 h-3 mr-1" />Add line</Button>
                    {overBy && (
                      <div className="text-xs text-rose-400 bg-rose-950/40 border border-rose-900/60 rounded px-2 py-1">
                        Over budget by {fmt((cat.actual || 0) - (cat.estimate || 0))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
            <Button size="sm" variant="outline" onClick={addCustomCategory}><Plus className="w-3.5 h-3.5 mr-1" />Add category</Button>
          </div>
        )}
      </div>
    </div>
  );
}
