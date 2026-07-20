import { trpc } from "@/lib/trpc";
import { useState } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Coins,
  CreditCard,
  Gift,
  RefreshCw,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { HollywoodBadge, HollywoodIcon } from "@/components/HollywoodIcon";
import { PRICING_TIER_BADGE, TierBadgeKey } from "@/constants/hollywoodIcons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

function formatCompactCredits(value: number) {
  const absolute = Math.abs(value);
  if (absolute >= 1_000_000) {
    const amount = value / 1_000_000;
    return `${Number.isInteger(amount) ? amount.toFixed(0) : amount.toFixed(1)}M`;
  }
  if (absolute >= 10_000) {
    const amount = value / 1_000;
    return `${Number.isInteger(amount) ? amount.toFixed(0) : amount.toFixed(1)}K`;
  }
  return value.toLocaleString();
}

function formatExactCredits(value: number) {
  return Math.max(0, Math.trunc(value)).toLocaleString();
}

function formatDate(value: string | Date) {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatTime(value: string | Date) {
  return new Date(value).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getActionMeta(action: string): {
  label: string;
  color: string;
  icon: React.ReactNode;
} {
  const value = action.toLowerCase();
  if (
    value.includes("subscription_activated") ||
    value.includes("subscription_renewal")
  ) {
    return {
      label: "Subscription Renewal",
      color: "text-green-400",
      icon: <CreditCard className="h-4 w-4" />,
    };
  }
  if (value.includes("referral_reward") || value.includes("referral")) {
    return {
      label: "Referral Reward",
      color: "text-purple-400",
      icon: <Gift className="h-4 w-4" />,
    };
  }
  if (value.includes("beta_welcome") || value.includes("welcome")) {
    return {
      label: "Welcome Bonus",
      color: "text-amber-400",
      icon: <Zap className="h-4 w-4" />,
    };
  }
  if (
    value.includes("topup") ||
    value.includes("top_up") ||
    value.includes("purchase")
  ) {
    return {
      label: "Credit Top-Up",
      color: "text-blue-400",
      icon: <ArrowUpCircle className="h-4 w-4" />,
    };
  }
  if (value.includes("refund")) {
    return {
      label: "Refund",
      color: "text-teal-400",
      icon: <RefreshCw className="h-4 w-4" />,
    };
  }
  if (value.includes("admin") || value.includes("manual")) {
    return {
      label: "Admin Adjustment",
      color: "text-orange-400",
      icon: <Zap className="h-4 w-4" />,
    };
  }
  if (
    value.includes("generate") ||
    value.includes("deduct") ||
    value.includes("film") ||
    value.includes("video") ||
    value.includes("image") ||
    value.includes("voice") ||
    value.includes("script")
  ) {
    return {
      label: "Generation Used",
      color: "text-red-400",
      icon: <ArrowDownCircle className="h-4 w-4" />,
    };
  }
  return {
    label: action
      .replace(/_/g, " ")
      .replace(/\b\w/g, character => character.toUpperCase()),
    color: "text-muted-foreground",
    icon: <Coins className="h-4 w-4" />,
  };
}

const TIER_LABELS: Record<string, string> = {
  indie: "Indie",
  amateur: "Creator",
  independent: "Industry",
  creator: "Industry",
  studio: "Industry",
  industry: "Industry",
  free: "Free",
};

const PAGE_SIZE = 25;

export default function Credits() {
  const [page, setPage] = useState(0);
  const [, setLocation] = useLocation();
  const { data: user } = trpc.auth.me.useQuery();
  const { data: summary, isLoading: summaryLoading } =
    trpc.credits.getSummary.useQuery();
  const { data: history, isLoading: historyLoading } =
    trpc.credits.getHistory.useQuery({
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    });

  const isAdmin =
    (user as any)?.role === "admin" || Boolean((user as any)?.isAdmin);
  const displayedBalance = isAdmin ? 1_000 : Number(summary?.balance || 0);
  const displayedAllocation = Number(summary?.monthlyAllocation || 0);
  const total = history?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const transactions = history?.transactions || [];
  const earned = transactions
    .filter((transaction: any) => transaction.amount > 0)
    .reduce(
      (sum: number, transaction: any) => sum + transaction.amount,
      0,
    );
  const spent = transactions
    .filter((transaction: any) => transaction.amount < 0)
    .reduce(
      (sum: number, transaction: any) =>
        sum + Math.abs(transaction.amount),
      0,
    );

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 px-0 py-1 sm:space-y-6 sm:px-1">
      <header className="min-w-0">
        <h1 className="flex min-w-0 items-center gap-3 text-2xl font-bold text-gold-shimmer sm:text-3xl">
          <HollywoodIcon tool="credits" size={36} />
          <span className="min-w-0">Credits &amp; History</span>
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
          Your current balance, account access and complete credit transaction
          history.
        </p>
      </header>

      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <Card className="min-w-0 border-amber-500/25 bg-gradient-to-br from-amber-600/15 to-orange-600/5 shadow-lg shadow-amber-500/5">
          <CardContent className="px-4 pt-5 sm:px-6 sm:pt-6">
            {summaryLoading ? (
              <div className="h-24 animate-pulse rounded-lg bg-muted/30" />
            ) : (
              <div className="text-center">
                <div className="text-4xl font-black leading-none text-amber-400 sm:text-5xl">
                  {formatExactCredits(displayedBalance)}
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  credits available
                </div>
                <Button
                  size="sm"
                  className="mt-4 min-h-10 bg-amber-600 px-5 text-sm text-black hover:bg-amber-700"
                  onClick={() =>
                    setLocation(isAdmin ? "/admin" : "/pricing")
                  }
                >
                  {isAdmin ? "Admin Panel" : "Top Up"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0 border-amber-500/15 shadow-lg shadow-amber-500/5">
          <CardContent className="px-4 pt-5 sm:px-6 sm:pt-6">
            {summaryLoading ? (
              <div className="h-24 animate-pulse rounded-lg bg-muted/30" />
            ) : isAdmin ? (
              <div className="flex min-w-0 items-start gap-3">
                <div className="shrink-0 rounded-lg bg-amber-500/12 p-2.5">
                  <ShieldCheck className="h-5 w-5 text-amber-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-black text-foreground">ADMIN</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Full platform access
                  </p>
                  <Badge className="mt-2 border-amber-500/35 bg-amber-500/12 text-xs font-bold text-amber-400">
                    Administrator
                  </Badge>
                </div>
              </div>
            ) : (
              <div className="flex min-w-0 items-start gap-3">
                <div className="shrink-0 rounded-lg bg-blue-500/10 p-2.5">
                  <CreditCard className="h-5 w-5 text-blue-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold gradient-text-gold">
                    {formatCompactCredits(displayedAllocation)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    monthly allocation
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {summary?.tier && PRICING_TIER_BADGE[summary.tier] && (
                      <HollywoodBadge
                        tier={
                          PRICING_TIER_BADGE[summary.tier] as TierBadgeKey
                        }
                        size={20}
                      />
                    )}
                    <Badge className="border-blue-500/30 bg-blue-600/15 text-xs text-blue-400">
                      {TIER_LABELS[summary?.tier ?? "free"] ??
                        summary?.tier} Plan
                    </Badge>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0 border-amber-500/15 shadow-lg shadow-amber-500/5">
          <CardContent className="px-4 pt-5 sm:px-6 sm:pt-6">
            {summaryLoading ? (
              <div className="h-24 animate-pulse rounded-lg bg-muted/30" />
            ) : (
              <div className="flex min-w-0 items-start gap-3">
                <div className="shrink-0 rounded-lg bg-green-500/10 p-2.5">
                  {isAdmin ? (
                    <ShieldCheck className="h-5 w-5 text-green-400" />
                  ) : (
                    <Calendar className="h-5 w-5 text-green-400" />
                  )}
                </div>
                <div className="min-w-0">
                  {isAdmin ? (
                    <>
                      <p className="text-lg font-bold text-foreground">
                        Administrator access
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        No paid plan or renewal required
                      </p>
                      <p className="mt-1 text-xs font-medium text-green-400">
                        Account is active
                      </p>
                    </>
                  ) : summary?.subscriptionCurrentPeriodEnd ? (
                    <>
                      <p className="text-lg font-bold text-foreground">
                        {formatDate(summary.subscriptionCurrentPeriodEnd)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        next renewal
                      </p>
                      <p className="mt-1 text-xs text-green-400">
                        Credits refresh automatically
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-lg font-bold text-foreground">
                        No active plan
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Subscribe to receive monthly credits
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {!historyLoading && transactions.length > 0 && (
        <div className="grid min-w-0 grid-cols-2 gap-3">
          <div className="flex min-w-0 items-center gap-3 rounded-xl border border-green-500/25 bg-green-600/5 p-3 sm:p-4">
            <TrendingUp className="h-5 w-5 shrink-0 text-green-400" />
            <div className="min-w-0">
              <p className="text-lg font-bold text-green-400">
                +{formatCompactCredits(earned)}
              </p>
              <p className="text-xs leading-5 text-muted-foreground">
                earned on this page
              </p>
            </div>
          </div>
          <div className="flex min-w-0 items-center gap-3 rounded-xl border border-red-500/25 bg-red-600/5 p-3 sm:p-4">
            <TrendingDown className="h-5 w-5 shrink-0 text-red-400" />
            <div className="min-w-0">
              <p className="text-lg font-bold text-red-400">
                -{formatCompactCredits(spent)}
              </p>
              <p className="text-xs leading-5 text-muted-foreground">
                spent on this page
              </p>
            </div>
          </div>
        </div>
      )}

      <Card className="min-w-0 border-amber-500/15 shadow-lg shadow-amber-500/5">
        <CardHeader className="flex flex-row items-center justify-between gap-3 px-4 pb-3 sm:px-6">
          <CardTitle className="min-w-0 text-lg text-foreground">
            Transaction History
          </CardTitle>
          {total > 0 && (
            <span className="shrink-0 text-sm text-muted-foreground">
              {total.toLocaleString()} total
            </span>
          )}
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          {historyLoading ? (
            <div className="space-y-3">
              {[...Array(6)].map((_, index) => (
                <div
                  key={index}
                  className="h-14 animate-pulse rounded-lg bg-muted/20"
                />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground sm:py-12">
              <Coins className="mx-auto mb-3 h-10 w-10 opacity-40" />
              <p className="font-medium text-foreground">No transactions yet</p>
              <p className="mt-1 text-sm">
                Your credit history appears here when credits are added or used.
              </p>
            </div>
          ) : (
            <>
              <div className="hidden grid-cols-[1fr_auto_auto_auto] gap-4 border-b border-amber-500/20 px-3 pb-2 text-xs font-medium text-muted-foreground sm:grid">
                <span>Action</span>
                <span className="w-24 text-right">Amount</span>
                <span className="w-28 text-right">Balance After</span>
                <span className="w-32 text-right">Date</span>
              </div>

              <div className="mt-2 space-y-1">
                {transactions.map((transaction: any) => {
                  const { label, color, icon } = getActionMeta(
                    transaction.action,
                  );
                  const isCredit = transaction.amount > 0;
                  return (
                    <div
                      key={transaction.id}
                      className="grid min-w-0 grid-cols-1 items-start gap-1 rounded-lg border border-transparent px-2 py-3 transition-colors hover:border-amber-500/20 hover:bg-amber-500/5 sm:grid-cols-[1fr_auto_auto_auto] sm:items-center sm:gap-4 sm:px-3"
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <div className={`shrink-0 ${color}`}>{icon}</div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">
                            {label}
                          </p>
                          {transaction.description && (
                            <p className="max-w-xs truncate text-xs text-muted-foreground">
                              {transaction.description}
                            </p>
                          )}
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 sm:hidden">
                            <span
                              className={`text-xs font-bold ${
                                isCredit ? "text-green-400" : "text-red-400"
                              }`}
                            >
                              {isCredit ? "+" : ""}
                              {transaction.amount.toLocaleString()}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(transaction.createdAt)} ·{" "}
                              {formatTime(transaction.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div
                        className={`hidden w-24 text-right text-sm font-bold sm:block ${
                          isCredit ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {isCredit ? "+" : ""}
                        {transaction.amount.toLocaleString()}
                      </div>
                      <div className="hidden w-28 text-right text-sm text-muted-foreground sm:block">
                        {(transaction.balanceAfter ?? 0).toLocaleString()}
                      </div>
                      <div className="hidden w-32 text-right text-xs text-muted-foreground sm:block">
                        <div>{formatDate(transaction.createdAt)}</div>
                        <div className="opacity-75">
                          {formatTime(transaction.createdAt)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between gap-3 border-t border-amber-500/20 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPage(current => Math.max(0, current - 1))
                    }
                    disabled={page === 0}
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Previous
                  </Button>
                  <span className="text-center text-xs text-muted-foreground sm:text-sm">
                    Page {page + 1} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPage(current =>
                        Math.min(totalPages - 1, current + 1),
                      )
                    }
                    disabled={page >= totalPages - 1}
                  >
                    Next
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card className="min-w-0">
        <CardHeader className="px-4 sm:px-6">
          <CardTitle className="text-base text-foreground">
            How Credits Work
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
            <div className="flex gap-3">
              <ArrowUpCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-400" />
              <div>
                <p className="font-semibold text-foreground">Earned</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Added through renewals, referrals, bonuses and top-ups.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <ArrowDownCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
              <div>
                <p className="font-semibold text-foreground">Spent</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Deducted when generation and production tools are used.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <RefreshCw className="mt-0.5 h-5 w-5 shrink-0 text-blue-400" />
              <div>
                <p className="font-semibold text-foreground">Auto-Refresh</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Paid-plan allocations refresh on each billing cycle.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
