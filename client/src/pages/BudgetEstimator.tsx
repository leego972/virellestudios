import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, DollarSign, Loader2, Sparkles, Trash2, TrendingUp, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);
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

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-muted-foreground" /></div>;
  if (!user) { window.location.href = getLoginUrl(); return null; }

  const project = trpc.project.get.useQuery({ id: projectId });
  const budgetsList = trpc.budget.list.useQuery({ projectId });
  const utils = trpc.useUtils();

  const generateMutation = trpc.budget.generate.useMutation({
    onSuccess: (data) => {
      utils.budget.list.invalidate();
      setSelectedBudgetId(data.id);
      toast.success("Budget estimate generated");
    },
    onError: () => toast.error("Failed to generate budget estimate"),
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

  function toggleCategory(key: string) {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/40 bg-card/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/project/${projectId}`)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold">Production Budget</h1>
              <p className="text-sm text-muted-foreground">{project.data?.title || "Loading..."}</p>
            </div>
          </div>
          <Button onClick={() => generateMutation.mutate({ projectId })} disabled={generateMutation.isPending}>
            {generateMutation.isPending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analyzing project...</>
            ) : (
              <><Sparkles className="h-4 w-4 mr-2" /> Generate Budget Estimate</>
            )}
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">
        {!activeBudget && !generateMutation.isPending ? (
          <div className="text-center py-24">
            <DollarSign className="h-16 w-16 mx-auto mb-6 text-muted-foreground/30" />
            <h2 className="text-xl font-semibold mb-2">No Budget Estimates Yet</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              AI will analyze your scenes, characters, locations, and effects to generate a realistic Hollywood production budget breakdown.
            </p>
            <Button onClick={() => generateMutation.mutate({ projectId })} disabled={generateMutation.isPending}>
              <Sparkles className="h-4 w-4 mr-2" /> Generate First Estimate
            </Button>
          </div>
        ) : generateMutation.isPending && !activeBudget ? (
          <div className="text-center py-24">
            <Loader2 className="h-12 w-12 mx-auto mb-6 animate-spin text-primary" />
            <h2 className="text-lg font-semibold mb-2">Analyzing Your Production</h2>
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
                    {formatCurrency(b.totalEstimate || 0)} · {new Date(b.createdAt).toLocaleDateString()}
                  </Button>
                ))}
              </div>
            )}

            {/* Total Summary */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Estimated Budget</p>
                    <p className="text-4xl font-bold mt-1">{formatCurrency(activeBudget.totalEstimate || 0)}</p>
                    <p className="text-sm text-muted-foreground mt-1">{activeBudget.currency || "USD"}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate({ id: activeBudget.id })}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Visual Breakdown Bar */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Budget Distribution</CardTitle>
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
                  <Card key={key} className="overflow-hidden">
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
                    {isExpanded && cat.items && cat.items.length > 0 && (
                      <div className="border-t border-border/30">
                        {cat.items.map((item, i) => (
                          <div key={i} className="px-4 py-2.5 flex items-center justify-between text-sm border-b border-border/20 last:border-0">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm">{item.name}</p>
                              {item.notes && <p className="text-xs text-muted-foreground mt-0.5">{item.notes}</p>}
                            </div>
                            <span className="text-sm font-medium ml-4 flex-shrink-0">{formatCurrency(item.cost)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>

            {/* AI Analysis */}
            {activeBudget.aiAnalysis && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
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
    </div>
  );
}
