import { trpc } from "@/lib/trpc";
import { useState } from "react";
import {
  Coins, TrendingUp, TrendingDown, Zap, RefreshCw,
  ChevronLeft, ChevronRight, ArrowUpCircle, ArrowDownCircle,
  Calendar, CreditCard, Gift,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCredits(n: number) {
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

function formatDate(d: string | Date) {
  const date = new Date(d);
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function formatTime(d: string | Date) {
  return new Date(d).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

// Map action keys to human-readable labels and icons
function getActionMeta(action: string): { label: string; color: string; icon: React.ReactNode } {
  const a = action.toLowerCase();
  if (a.includes("subscription_activated") || a.includes("subscription_renewal")) {
    return { label: "Subscription Renewal", color: "text-green-400", icon: <CreditCard className="h-4 w-4" /> };
  }
  if (a.includes("referral_reward") || a.includes("referral")) {
    return { label: "Referral Reward", color: "text-purple-400", icon: <Gift className="h-4 w-4" /> };
  }
  if (a.includes("beta_welcome") || a.includes("welcome")) {
    return { label: "Welcome Bonus", color: "text-amber-400", icon: <Zap className="h-4 w-4" /> };
  }
  if (a.includes("topup") || a.includes("top_up") || a.includes("purchase")) {
    return { label: "Credit Top-Up", color: "text-blue-400", icon: <ArrowUpCircle className="h-4 w-4" /> };
  }
  if (a.includes("refund")) {
    return { label: "Refund", color: "text-teal-400", icon: <RefreshCw className="h-4 w-4" /> };
  }
  if (a.includes("admin") || a.includes("manual")) {
    return { label: "Admin Adjustment", color: "text-orange-400", icon: <Zap className="h-4 w-4" /> };
  }
  if (a.includes("generate") || a.includes("deduct") || a.includes("film") || a.includes("video") || a.includes("image") || a.includes("voice") || a.includes("script")) {
    return { label: "Generation Used", color: "text-red-400", icon: <ArrowDownCircle className="h-4 w-4" /> };
  }
  return { label: action.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()), color: "text-muted-foreground", icon: <Coins className="h-4 w-4" /> };
}

const TIER_LABELS: Record<string, string> = {
  indie:       "Indie",
  amateur:     "Creator",
  independent: "Industry",
  creator:     "Industry",  // alias
  studio:      "Industry",  // alias
  industry:    "Industry",
  free:        "Free",
};

const PAGE_SIZE = 25;

// ─── Component ────────────────────────────────────────────────────────────────

export default function Credits() {
  const [page, setPage] = useState(0);
  const [, setLocation] = useLocation();

  const { data: summary, isLoading: summaryLoading } = trpc.credits.getSummary.useQuery();
  const { data: history, isLoading: historyLoading } = trpc.credits.getHistory.useQuery({
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  });

  const total = history?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const transactions = history?.transactions || [];

  // Derived stats from current page (all-time stats would need a separate query)
  const earned = transactions.filter((t: any) => t.amount > 0).reduce((s: number, t: any) => s + t.amount, 0);
  const spent = transactions.filter((t: any) => t.amount < 0).reduce((s: number, t: any) => s + Math.abs(t.amount), 0);

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">

      {/* ─── Header ─── */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
          <Coins className="h-7 w-7 text-amber-400" />
          Credits &amp; History
        </h1>
        <p className="text-muted-foreground mt-1">
          Your current balance, monthly allocation, and a full record of every credit transaction.
        </p>
      </div>

      {/* ─── Balance Summary Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Current Balance */}
        <Card className="bg-gradient-to-br from-amber-600/15 to-orange-600/5 border-amber-500/20 sm:col-span-1">
          <CardContent className="pt-6">
            {summaryLoading ? (
              <div className="h-16 bg-white/5 rounded-lg animate-pulse" />
            ) : (
              <div className="text-center">
                <div className="text-4xl font-black text-amber-400">
                  {formatCredits(summary?.balance || 0)}
                </div>
                <div className="text-sm text-muted-foreground mt-1">credits available</div>
                <Button
                  size="sm"
                  className="mt-3 bg-amber-600 hover:bg-amber-700 text-xs"
                  onClick={() => setLocation("/pricing")}
                >
                  Top Up
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Monthly Allocation */}
        <Card>
          <CardContent className="pt-6">
            {summaryLoading ? (
              <div className="h-16 bg-white/5 rounded-lg animate-pulse" />
            ) : (
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10 shrink-0">
                  <CreditCard className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatCredits(summary?.monthlyAllocation || 0)}</p>
                  <p className="text-sm text-muted-foreground">monthly allocation</p>
                  <Badge className="mt-1 bg-blue-600/20 text-blue-400 border-blue-500/30 text-xs capitalize">
                    {TIER_LABELS[summary?.tier ?? "free"] ?? summary?.tier} Plan
                  </Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Next Renewal */}
        <Card>
          <CardContent className="pt-6">
            {summaryLoading ? (
              <div className="h-16 bg-white/5 rounded-lg animate-pulse" />
            ) : (
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-green-500/10 shrink-0">
                  <Calendar className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  {summary?.subscriptionCurrentPeriodEnd ? (
                    <>
                      <p className="text-lg font-bold">
                        {formatDate(summary.subscriptionCurrentPeriodEnd)}
                      </p>
                      <p className="text-sm text-muted-foreground">next renewal</p>
                      <p className="text-xs text-green-400 mt-0.5">
                        Credits auto-refresh on renewal
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-lg font-bold text-muted-foreground">No active plan</p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Subscribe to get monthly credits
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── This Page Stats ─── */}
      {!historyLoading && transactions.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-green-500/20 bg-green-600/5 p-4 flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-green-400 shrink-0" />
            <div>
              <p className="text-lg font-bold text-green-400">+{formatCredits(earned)}</p>
              <p className="text-xs text-muted-foreground">earned (this page)</p>
            </div>
          </div>
          <div className="rounded-xl border border-red-500/20 bg-red-600/5 p-4 flex items-center gap-3">
            <TrendingDown className="h-5 w-5 text-red-400 shrink-0" />
            <div>
              <p className="text-lg font-bold text-red-400">-{formatCredits(spent)}</p>
              <p className="text-xs text-muted-foreground">spent (this page)</p>
            </div>
          </div>
        </div>
      )}

      {/* ─── Transaction History ─── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-lg">Transaction History</CardTitle>
          {total > 0 && (
            <span className="text-sm text-muted-foreground">
              {total.toLocaleString()} total
            </span>
          )}
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-14 bg-white/5 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Coins className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No transactions yet</p>
              <p className="text-sm mt-1">Your credit history will appear here once you start using the platform.</p>
            </div>
          ) : (
            <>
              {/* Table header — desktop only */}
              <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto] gap-4 px-3 pb-2 text-xs text-muted-foreground font-medium border-b border-white/5">
                <span>Action</span>
                <span className="text-right w-24">Amount</span>
                <span className="text-right w-28">Balance After</span>
                <span className="text-right w-32">Date</span>
              </div>

              {/* Rows */}
              <div className="space-y-1 mt-2">
                {transactions.map((tx: any) => {
                  const { label, color, icon } = getActionMeta(tx.action);
                  const isCredit = tx.amount > 0;
                  return (
                    <div
                      key={tx.id}
                      className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-1 sm:gap-4 items-start sm:items-center px-3 py-3 rounded-lg hover:bg-white/3 transition-colors border border-transparent hover:border-white/5"
                    >
                      {/* Action */}
                      <div className="flex items-center gap-2.5">
                        <div className={`shrink-0 ${color}`}>{icon}</div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{label}</p>
                          {tx.description && (
                            <p className="text-xs text-muted-foreground truncate max-w-xs">{tx.description}</p>
                          )}
                          {/* Mobile: show amount + date inline */}
                          <div className="flex items-center gap-3 mt-0.5 sm:hidden">
                            <span className={`text-xs font-bold ${isCredit ? "text-green-400" : "text-red-400"}`}>
                              {isCredit ? "+" : ""}{tx.amount.toLocaleString()}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(tx.createdAt)} {formatTime(tx.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Amount — desktop */}
                      <div className={`hidden sm:block text-right w-24 font-bold text-sm ${isCredit ? "text-green-400" : "text-red-400"}`}>
                        {isCredit ? "+" : ""}{tx.amount.toLocaleString()}
                      </div>

                      {/* Balance After — desktop */}
                      <div className="hidden sm:block text-right w-28 text-sm text-muted-foreground">
                        {(tx.balanceAfter ?? 0).toLocaleString()}
                      </div>

                      {/* Date — desktop */}
                      <div className="hidden sm:block text-right w-32 text-xs text-muted-foreground">
                        <div>{formatDate(tx.createdAt)}</div>
                        <div className="opacity-60">{formatTime(tx.createdAt)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {page + 1} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* ─── How Credits Work ─── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">How Credits Work</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div className="flex gap-3">
              <ArrowUpCircle className="h-5 w-5 text-green-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Earned</p>
                <p className="text-muted-foreground text-xs mt-0.5">Credits are added on subscription renewal, referrals, welcome bonuses, and top-up purchases.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <ArrowDownCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Spent</p>
                <p className="text-muted-foreground text-xs mt-0.5">Credits are deducted each time you generate a video, image, voice track, or use AI tools.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <RefreshCw className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Auto-Refresh</p>
                <p className="text-muted-foreground text-xs mt-0.5">Your monthly allocation is automatically topped up on each billing cycle renewal — no action needed.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
