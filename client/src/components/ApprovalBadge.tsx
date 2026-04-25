import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, AlertTriangle } from "lucide-react";

export type ApprovalStatus = "pending" | "approved" | "changes_requested";

interface Props {
  status: ApprovalStatus | string | null | undefined;
  size?: "sm" | "md";
  className?: string;
}

/**
 * v6.63 — Compact approval badge. Reused on scenes, movies, tables, and the
 * project rollup card. Color follows StudioBinder/Frame.io conventions:
 * green = approved, amber = changes requested, neutral = pending.
 */
export default function ApprovalBadge({ status, size = "sm", className = "" }: Props) {
  const s = (status || "pending") as ApprovalStatus;
  const cfg = {
    pending: { label: "Pending", icon: Clock, color: "bg-zinc-700/60 text-zinc-200 border-zinc-600" },
    approved: { label: "Approved", icon: CheckCircle2, color: "bg-emerald-700/30 text-emerald-200 border-emerald-600/60" },
    changes_requested: { label: "Changes requested", icon: AlertTriangle, color: "bg-amber-700/30 text-amber-200 border-amber-600/60" },
  } as const;
  const c = cfg[s] || cfg.pending;
  const Icon = c.icon;
  return (
    <Badge
      variant="outline"
      className={`inline-flex items-center gap-1 ${c.color} ${size === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1"} ${className}`}
    >
      <Icon className={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />
      {c.label}
    </Badge>
  );
}
