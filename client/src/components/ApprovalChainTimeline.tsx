import { useMemo } from "react";
import { trpc } from "@/lib/trpc";

interface Props {
  projectId: number;
  kind?: "scene" | "movie";
  entityId?: number;
  className?: string;
}

const STATUS_COLOR: Record<string, string> = {
  pending: "rgba(245, 158, 11, 0.85)",
  approved: "rgba(34, 197, 94, 0.85)",
  changes_requested: "rgba(239, 68, 68, 0.85)",
};

function statusLabel(s: string | null | undefined) {
  if (!s) return "—";
  if (s === "changes_requested") return "Changes requested";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function ApprovalChainTimeline({ projectId, kind, entityId, className }: Props) {
  const { data: entries, isLoading } = trpc.approvalChain.list.useQuery({ projectId, kind, entityId });
  const { data: verifyResult } = trpc.approvalChain.verify.useQuery(
    { projectId, kind: kind!, entityId: entityId! },
    { enabled: !!kind && !!entityId },
  );
  const sorted = useMemo(() => (entries ? [...entries].reverse() : []), [entries]);

  return (
    <div
      className={className}
      style={{
        background: "rgba(8,12,28,0.55)",
        border: "1px solid rgba(255,215,140,0.18)",
        borderRadius: 14,
        padding: "1.1rem 1.2rem",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: ".75rem" }}>
        <h3 style={{ margin: 0, fontSize: "1rem", color: "#FFD78C", letterSpacing: ".04em", textTransform: "uppercase" }}>
          Signed approval chain
        </h3>
        {verifyResult ? (
          <span
            style={{
              fontSize: ".7rem",
              padding: ".2rem .55rem",
              borderRadius: 999,
              background: verifyResult.valid ? "rgba(34,197,94,0.18)" : "rgba(239,68,68,0.22)",
              color: verifyResult.valid ? "#86efac" : "#fca5a5",
              border: `1px solid ${verifyResult.valid ? "rgba(34,197,94,0.45)" : "rgba(239,68,68,0.55)"}`,
              letterSpacing: ".05em",
              textTransform: "uppercase",
            }}
            title={verifyResult.valid ? "All entries hash-linked end-to-end" : `Chain broken at entry #${verifyResult.brokenAt}`}
          >
            {verifyResult.valid ? `Verified · ${verifyResult.entries}` : "Tampered"}
          </span>
        ) : null}
      </div>

      {isLoading ? (
        <div style={{ color: "rgba(255,255,255,.5)", fontSize: ".85rem" }}>Loading chain…</div>
      ) : sorted.length === 0 ? (
        <div style={{ color: "rgba(255,255,255,.5)", fontSize: ".85rem" }}>No approval activity yet.</div>
      ) : (
        <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: ".55rem" }}>
          {sorted.map((e: any) => (
            <li
              key={e.id}
              style={{
                display: "grid",
                gridTemplateColumns: "auto 1fr",
                gap: ".75rem",
                padding: ".55rem .65rem",
                background: "rgba(255,255,255,0.02)",
                borderRadius: 8,
                borderLeft: `3px solid ${STATUS_COLOR[e.toStatus] || "rgba(255,215,140,0.45)"}`,
              }}
            >
              <div style={{ fontSize: ".7rem", color: "rgba(255,255,255,.45)", whiteSpace: "nowrap", paddingTop: 2 }}>
                {new Date(e.createdAt).toLocaleString()}
              </div>
              <div>
                <div style={{ fontSize: ".82rem", color: "#fff" }}>
                  <strong>{e.actorName || `User #${e.actor}`}</strong>{" "}
                  <span style={{ color: "rgba(255,255,255,.5)" }}>marked</span>{" "}
                  <span style={{ color: "#FFD78C", textTransform: "capitalize" }}>{e.kind} #{e.entityId}</span>{" "}
                  <span style={{ color: "rgba(255,255,255,.5)" }}>as</span>{" "}
                  <span style={{ color: STATUS_COLOR[e.toStatus] || "#fff" }}>{statusLabel(e.toStatus)}</span>
                  {e.fromStatus ? (
                    <span style={{ color: "rgba(255,255,255,.4)", fontSize: ".75rem" }}>
                      {" "}(was {statusLabel(e.fromStatus)})
                    </span>
                  ) : null}
                </div>
                {e.note ? (
                  <div style={{ fontSize: ".78rem", color: "rgba(255,255,255,.7)", marginTop: ".25rem", whiteSpace: "pre-wrap" }}>
                    “{e.note}”
                  </div>
                ) : null}
                <div style={{ fontFamily: "ui-monospace, monospace", fontSize: ".62rem", color: "rgba(255,255,255,.32)", marginTop: ".3rem" }}>
                  sig: {String(e.signature).slice(0, 16)}…
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
