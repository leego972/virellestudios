import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, DollarSign, Loader2, Sparkles, Trash2, TrendingUp, ChevronDown, ChevronUp, Download, FileText } from "lucide-react";
import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";
import { NextStageCTA } from "@/components/NextStageCTA";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);
}

function ActualsRow({
  budgetId,
  categoryKey,
  estimate,
  initialActual,
  onSaved,
}: {
  budgetId: number;
  categoryKey: string;
  estimate: number;
  initialActual: number | null;
  onSaved: () => void;
}) {
  const [val, setVal] = useState<string>(initialActual != null ? String(initialActual) : "");
  const setActuals = trpc.budget.setActuals.useMutation({
    onSuccess: () => {
      toast.success("Actuals updated");
      onSaved();
    },
    onError: (e) => toast.error(e.message),
  });
  const actualNum = parseFloat(val);
  const valid = !isNaN(actualNum) && actualNum >= 0;
  const variance = valid ? actualNum - estimate : 0;
  const pctOver = estimate > 0 && valid ? (variance / estimate) * 100 : 0;
  const hot = pctOver > 5;
  const cold = pctOver < -5;
  return (
    <div className="px-4 py-3 bg-muted/30 border-t border-border/40">
      <div className="flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <DollarSign className="h-3 w-3 text-muted-foreground" />
          <span className="font-medium">Actual spend</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            step={100}
            value={val}
            onChange={(e) => setVal(e.target.value)}
            placeholder="0"
            className="w-28 h-7 px-2 rounded-md border border-border bg-background text-right text-xs focus:outline-none focus:ring-1 focus:ring-amber-400"
          />
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            disabled={!valid || setActuals.isPending}
            onClick={() => setActuals.mutate({ budgetId, category: categoryKey, actual: actualNum })}
          >
            {setActuals.isPending ? <Loader2 className="h-3 w-3 animate-spin text-amber-400" /> : "Save"}
          </Button>
        </div>
      </div>
      {valid && (
        <div className="flex items-center justify-between gap-3 mt-1.5 text-[11px]">
          <span className="text-muted-foreground">vs estimate {formatCurrency(estimate)}</span>
          <span
            className={`font-semibold ${hot ? "text-red-500" : cold ? "text-amber-500" : "text-green-500"}`}
            title={hot ? "Over budget ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ hot cost" : cold ? "Underspend ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ review estimate" : "On budget"}
          >
            {variance >= 0 ? "+" : ""}{formatCurrency(variance)} ({pctOver >= 0 ? "+" : ""}{pctOver.toFixed(1)}%)
          </span>
        </div>
      )}
    </div>
  );
}

function TotalActualsRow({ budget }: { budget: any }) {
  const breakdown = budget?.breakdown || {};
  const totalActual = Object.values(breakdown).reduce(
    (sum: number, c: any) => sum + (typeof c?.actual === "number" ? c.actual : 0),
    0,
  ) as number;
  if (totalActual <= 0) return null;
  const variance = totalActual - (budget.totalEstimate || 0);
  const pct = budget.totalEstimate > 0 ? (variance / budget.totalEstimate) * 100 : 0;
  const hot = pct > 5;
  const cold = pct < -5;
  return (
    <Card className="bg-muted/40 border-2 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
      <CardContent className="p-4 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Hot-cost roll-up</p>
            <p className="text-xs text-muted-foreground">Total actuals tracked across all categories</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold gradient-text-gold">{formatCurrency(totalActual)}</p>
            <p className={`text-sm font-medium ${hot ? "text-red-500" : cold ? "text-amber-500" : "text-green-500"}`}>
              {variance >= 0 ? "+" : ""}{formatCurrency(variance)} ({pct >= 0 ? "+" : ""}{pct.toFixed(1)}%) vs estimate
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const CATEGORY_COLORS: Record<string, string> = {
  preProduction: "bg-blue-500",
  cast: "bg-amber-500",
  crew: "bg-green-500",
  locations: "bg-purple-500",
  equipment: "bg-cyan-500",
  vfx: "bg-red-500",
  music: "bg-pink-500",
  postProduction: "bg-indigo-500",
  marketing: "bg-orange-500",
  contingency: "bg-gray-500",
};

export default function BudgetEstimator() {
  const { user, loading: authLoading } = useAuth();
  const params = useParams<{ projectId: string }>();
  const projectId = parseInt(params.projectId || "0");
  const [, navigate] = useLocation();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [selectedBudgetId, setSelectedBudgetId] = useState<number | null>(null);

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-muted-foreground text-amber-400" /></div>;
  if (!user) { window.location.href = getLoginUrl(); return null; }

  const project = trpc.project.get.useQuery({ id: projectId });
  const utils = trpc.useUtils();
  const budgetsList = trpc.budget.list.useQuery({ projectId });

  const generateMutation = trpc.budget.generate.useMutation({
    onSuccess: (data) => {
      utils.budget.list.invalidate();
      setSelectedBudgetId(data.id);
      toast.success("Budget estimate generated");
    },
    onError: () => toast.error("Couldn't run the budget estimate this time ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ please try again in a moment."),
  });

  const deleteMutation = trpc.budget.delete.useMutation({
    onSuccess: () => {
      utils.budget.list.invalidate();
      setSelectedBudgetId(null);
      toast.success("Budget deleted");
    },
  });

  const budgets = budgetsList.data || [];
  const activeBudget = selectedBudgetId
    ? budgets.find((b) => b.id === selectedBudgetId)
    : budgets[0];

  const breakdown = activeBudget?.breakdown as Record<string, { label: string; estimate: number; items: { name: string; cost: number; notes: string }[] }> | undefined;

  function exportCSV() {
    if (!activeBudget || !breakdown) return;
    const rows = ["Category,Item,Cost,Notes"];
    Object.entries(breakdown).forEach(([, cat]) => {
      cat.items.forEach((item) => {
        rows.push(`"${cat.label}","${item.name}",${item.cost},"${item.notes || ""}"`);
      });
      rows.push(`"${cat.label} ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ Subtotal",,${cat.estimate},`);
    });
    rows.push(`"TOTAL",,${activeBudget.totalEstimate},`);
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `budget_${projectId}_${activeBudget.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Budget exported as CSV");
  }

  function exportPDF() {
    if (!activeBudget || !breakdown) return;
    const lines = [
      `PRODUCTION BUDGET ESTIMATE`,
      `Project: ${project.data?.title || "Untitled"}`,
      `Generated: ${new Date(activeBudget.createdAt).toLocaleDateString()}`,
      `Total Estimate: ${formatCurrency(activeBudget.totalEstimate ?? 0)}`,
      `Confidence: ${(activeBudget as any).confidence ?? "N/A"}%`,
      ``,
      `${"-".repeat(60)}`,
    ];
    Object.entries(breakdown).forEach(([, cat]) => {
      lines.push(`\n${cat.label.toUpperCase()} ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ ${formatCurrency(cat.estimate)}`);
      lines.push(`${"-".repeat(40)}`);
      cat.items.forEach((item) => {
        lines.push(`  ${item.name.padEnd(30)} ${formatCurrency(item.cost)}`);
        if (item.notes) lines.push(`    ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ ${item.notes}`);
      });
    });
    lines.push(`\n${"-".repeat(60)}`);
    lines.push(`GRAND TOTAL: ${formatCurrency(activeBudget.totalEstimate ?? 0)}`);
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `budget_${projectId}_${activeBudget.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Budget exported");
  }

  function toggleCategory(key: string) {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="min-h-screen" style={{ background:"linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)" }}>
      {/* Header */}
      <div className="border-b sticky top-0 z-20" style={{ borderColor:"rgba(255,255,255,0.07)", background:"rgba(7,7,14,0.97)", backdropFilter:"blur(24px)" }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-9 sm:w-9 shrink-0" onClick={() => navigate(`/projects/${projectId}`)} aria-label="Back to project">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-semibold truncate gradient-text-gold">Production Budget</h1>
              <p className="text-sm text-muted-foreground truncate">{project.data?.title || "Loading..."}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {activeBudget && (
              <>
                <Button variant="outline" size="sm" onClick={exportCSV}>
                  <Download className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline"> CSV</span>
                </Button>
                <Button variant="outline" size="sm" onClick={exportPDF}>
                  <FileText className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline"> Export</span>
                </Button>
              </>
            )}
            <Button size="sm" onClick={() => generateMutation.mutate({ projectId })} disabled={generateMutation.isPending}>
              {generateMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-1 sm:mr-2 animate-spin text-amber-400" /><span className="hidden sm:inline">Analyzing...</span></>
              ) : (
                <><Sparkles className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Generate Budget</span></>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {!activeBudget && !generateMutation.isPending ? (
          <div className="text-center py-24">
            <DollarSign className="h-16 w-16 mx-auto mb-6 text-muted-foreground/30" />
            <h2 className="text-xl font-semibold mb-2 gradient-text-gold">No Budget Estimates Yet</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              AI will analyze your scenes, characters, locations, and effects to generate a realistic Hollywood production budget breakdown.
            </p>
            <Button onClick={() => generateMutation.mutate({ projectId })} disabled={generateMutation.isPending}>
              <Sparkles className="h-4 w-4 mr-2" /> Generate First Estimate
            </Button>
          </div>
        ) : generateMutation.isPending && !activeBudget ? (
          <div className="text-center py-24">
            <Loader2 className="h-12 w-12 mx-auto mb-6 animate-spin text-amber-400 text-amber-400" />
            <h2 className="text-lg font-semibold mb-2 gradient-text-gold">Analyzing Your Production</h2>
            <p className="text-sm text-muted-foreground">Evaluating scenes, locations, cast, VFX requirements...</p>
          </div>
        ) : activeBudget && breakdown ? (
          <div className="space-y-6">
            {/* Budget History Selector */}
            {budgets.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {budgets.map((b) => (
                  <Button
                    key={b.id}
                    variant={b.id === activeBudget.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedBudgetId(b.id)}
                  >
                    {formatCurrency(b.totalEstimate || 0)} ÃÂÃÂÃÂÃÂ· {new Date(b.createdAt).toLocaleDateString()}
                  </Button>
                ))}
              </div>
            )}

            {/* Total Summary */}
            <Card>
              <CardContent className="p-6 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Estimated Budget</p>
                    <p className="text-4xl font-bold mt-1 gradient-text-gold">{formatCurrency(activeBudget.totalEstimate || 0)}</p>
                    <p className="text-sm text-muted-foreground mt-1">{activeBudget.currency || "USD"}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate({ id: activeBudget.id })}
                      aria-label="Delete budget"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Visual Breakdown Bar */}
            <Card>
              <CardHeader className="pb-3 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
                <CardTitle className="text-sm font-medium gradient-text-gold glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">Budget Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex h-8 rounded-lg overflow-hidden">
                  {Object.entries(breakdown).map(([key, cat]) => {
                    const pct = activeBudget.totalEstimate ? (cat.estimate / activeBudget.totalEstimate) * 100 : 0;
                    if (pct < 1) return null;
                    return (
                      <div
                        key={key}
                        className={`${CATEGORY_COLORS[key] || "bg-gray-400"} transition-all hover:opacity-80`}
                        style={{ width: `${pct}%` }}
                        title={`${cat.label}: ${formatCurrency(cat.estimate)} (${pct.toFixed(1)}%)`}
                      />
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-3 mt-4">
                  {Object.entries(breakdown).map(([key, cat]) => (
                    <div key={key} className="flex items-center gap-1.5 text-xs">
                      <div className={`w-2.5 h-2.5 rounded-full ${CATEGORY_COLORS[key] || "bg-gray-400"}`} />
                      <span className="text-muted-foreground">{cat.label}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Category Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(breakdown).map(([key, cat]) => {
                const isExpanded = expandedCategories.has(key);
                const pct = activeBudget.totalEstimate ? (cat.estimate / activeBudget.totalEstimate) * 100 : 0;
                return (
                  <Card key={key} className="overflow-hidden glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
                    <button
                      className="w-full text-left p-4 flex items-center justify-between hover:bg-accent/30 transition-colors"
                      onClick={() => toggleCategory(key)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${CATEGORY_COLORS[key] || "bg-gray-400"}`} />
                        <div>
                          <p className="font-medium text-sm">{cat.label}</p>
                          <p className="text-xs text-muted-foreground">{pct.toFixed(1)}% of total</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold">{formatCurrency(cat.estimate)}</span>
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="border-t border-border/30">
                        {cat.items && cat.items.length > 0 && cat.items.map((item: any, i: number) => (
                          <div key={i} className="px-4 py-2.5 flex items-center justify-between text-sm border-b border-border/20 last:border-0">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm">{item.name}</p>
                              {item.notes && <p className="text-xs text-muted-foreground mt-0.5">{item.notes}</p>}
                            </div>
                            <span className="text-sm font-medium ml-4 flex-shrink-0">{formatCurrency(item.cost)}</span>
                          </div>
                        ))}
                        {/* ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ Hot-cost tracker: estimate vs actual ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ */}
                        <ActualsRow
                          budgetId={activeBudget.id}
                          categoryKey={key}
                          estimate={cat.estimate}
                          initialActual={typeof (cat as any).actual === "number" ? (cat as any).actual : null}
                          onSaved={() => utils.budget.list.invalidate()}
                        />
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>

            {/* Total actuals roll-up */}
            <TotalActualsRow budget={activeBudget} />

            {/* AI Analysis */}
            {activeBudget.aiAnalysis && (
              <Card>
                <CardHeader className="pb-3 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
                  <CardTitle className="text-sm font-medium flex items-center gap-2 gradient-text-gold glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
                    <TrendingUp className="h-4 w-4" /> Budget Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">{activeBudget.aiAnalysis}</p>
                </CardContent>
              </Card>
            )}
          </div>
        ) : null}
      </div>
      {!!projectId && <NextStageCTA projectId={projectId} currentStage={4} />}
    </div>
  );
}
