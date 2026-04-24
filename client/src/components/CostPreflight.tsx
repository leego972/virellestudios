import { trpc } from "@/lib/trpc";
import { Coins, AlertTriangle } from "lucide-react";

interface CostPreflightProps {
  /** Action key from CREDIT_COSTS (e.g. "generate_film", "generate_scene_video"). */
  action: string;
  /** Multiplier — for bulk actions (defaults to 1). */
  multiplier?: number;
  /** Scene duration — only for video gen actions, applies per-second scaling. */
  sceneDurationSeconds?: number;
  /** Optional verb shown in the chip ("Generate", "Render", "Export"). */
  verb?: string;
  /** Compact = inline chip, full = card. */
  variant?: "chip" | "card";
  className?: string;
}

/**
 * v6.62 — Inline cost preflight.
 *
 * Fetches the exact credit cost for an action (matching server-side scaling),
 * shows it next to the action button, and warns when the user can't afford it.
 *
 * Usage:
 *   <CostPreflight action="generate_film" />
 *   <CostPreflight action="generate_scene_video" sceneDurationSeconds={60} />
 *   <CostPreflight action="bulk_generate_videos" multiplier={5} sceneDurationSeconds={45} />
 */
export default function CostPreflight({
  action,
  multiplier = 1,
  sceneDurationSeconds,
  verb,
  variant = "chip",
  className = "",
}: CostPreflightProps) {
  const { data, isLoading } = trpc.subscription.estimateCost.useQuery(
    { action, multiplier, sceneDurationSeconds },
    { staleTime: 10_000, refetchOnWindowFocus: false }
  );

  if (isLoading || !data) {
    return (
      <span className={`inline-flex items-center gap-1 text-[11px] text-white/40 ${className}`}>
        <Coins className="h-3 w-3 animate-pulse" />
        …
      </span>
    );
  }

  // Unknown action — silent (don't block the UI).
  if (data.unknown) return null;

  const insufficient = !data.sufficient;
  const cost = data.cost;
  const balance = data.balance;
  const balanceAfter = data.balanceAfter;

  if (variant === "card") {
    return (
      <div
        className={`flex items-start gap-2 px-3 py-2 rounded-lg border text-xs ${
          insufficient
            ? "border-red-500/40 bg-red-500/5 text-red-300"
            : "border-amber-500/30 bg-amber-500/5 text-white/80"
        } ${className}`}
        role={insufficient ? "alert" : undefined}
      >
        {insufficient ? (
          <AlertTriangle className="h-4 w-4 mt-0.5 text-red-400 shrink-0" />
        ) : (
          <Coins className="h-4 w-4 mt-0.5 text-amber-400 shrink-0" />
        )}
        <div className="min-w-0">
          <div className="font-medium">
            {verb ? `${verb} cost: ` : "Cost: "}
            <span className={insufficient ? "text-red-300" : "text-amber-300"}>
              {cost} credit{cost === 1 ? "" : "s"}
            </span>
          </div>
          <div className="text-[11px] text-white/50 mt-0.5">
            Balance: {balance.toLocaleString()} ·{" "}
            {insufficient ? (
              <span className="text-red-400">Need {(cost - balance).toLocaleString()} more</span>
            ) : (
              <span>After: {balanceAfter.toLocaleString()}</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // chip variant
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
        insufficient
          ? "bg-red-500/15 text-red-300 border border-red-500/30"
          : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
      } ${className}`}
      title={
        insufficient
          ? `Need ${cost} credits — you have ${balance}`
          : `Costs ${cost} credit${cost === 1 ? "" : "s"} · ${balanceAfter.toLocaleString()} after`
      }
    >
      {insufficient ? (
        <AlertTriangle className="h-3 w-3" />
      ) : (
        <Coins className="h-3 w-3" />
      )}
      {cost} cr
    </span>
  );
}
