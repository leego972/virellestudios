import { useState } from "react";
import { trpc } from "@/lib/trpc";

interface Props {
  projectId: number;
  ownerKind: string;
  ownerId: number;
  fieldName: string;
  currentUrl?: string | null;
  onRestore?: (url: string) => void;
  className?: string;
}

function fmtBytes(n?: number | null) {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export default function AssetVersionStack({ projectId, ownerKind, ownerId, fieldName, currentUrl, onRestore, className }: Props) {
  const utils = trpc.useUtils();
  const { data: versions, isLoading } = trpc.assetVersion.list.useQuery({ projectId, ownerKind, ownerId, fieldName });
  const recordMut = trpc.assetVersion.record.useMutation({
    onSuccess: () => { utils.assetVersion.list.invalidate({ projectId, ownerKind, ownerId, fieldName }); setLabel(""); setNotes(""); },
  });
  const deleteMut = trpc.assetVersion.delete.useMutation({
    onSuccess: () => utils.assetVersion.list.invalidate({ projectId, ownerKind, ownerId, fieldName }),
  });
  const [label, setLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const saveCurrent = () => {
    if (!currentUrl) return;
    recordMut.mutate({
      projectId, ownerKind, ownerId, fieldName,
      url: currentUrl,
      label: label || `v${(versions?.length || 0) + 1}`,
      notes: notes || undefined,
    });
  };

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
          Version stack
        </h3>
        {currentUrl ? (
          <button
            onClick={() => setShowAdd((s) => !s)}
            style={{
              background: showAdd ? "rgba(255,255,255,.06)" : "rgba(255,215,140,0.16)",
              color: showAdd ? "rgba(255,255,255,.7)" : "#FFD78C",
              border: "1px solid rgba(255,215,140,0.35)",
              borderRadius: 999,
              padding: ".3rem .8rem",
              fontSize: ".75rem",
              cursor: "pointer",
            }}
          >
            {showAdd ? "Cancel" : "Snapshot current →"}
          </button>
        ) : null}
      </div>

      {showAdd && currentUrl ? (
        <div style={{ marginBottom: ".75rem", padding: ".6rem .7rem", background: "rgba(255,255,255,0.03)", borderRadius: 8 }}>
          <input
            placeholder="Version label (e.g. ‘director cut v2’)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            style={{ width: "100%", background: "rgba(0,0,0,.35)", border: "1px solid rgba(255,255,255,.15)", borderRadius: 6, color: "#fff", padding: ".4rem .55rem", fontSize: ".82rem", marginBottom: ".4rem" }}
          />
          <textarea
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            style={{ width: "100%", background: "rgba(0,0,0,.35)", border: "1px solid rgba(255,255,255,.15)", borderRadius: 6, color: "#fff", padding: ".4rem .55rem", fontSize: ".82rem", resize: "vertical" }}
          />
          <button
            onClick={saveCurrent}
            disabled={recordMut.isPending}
            style={{ marginTop: ".4rem", background: "linear-gradient(135deg,#FFD78C,#E0B973)", color: "#1a1228", border: "none", borderRadius: 6, padding: ".4rem .9rem", fontSize: ".8rem", fontWeight: 600, cursor: "pointer" }}
          >
            {recordMut.isPending ? "Saving…" : "Save snapshot"}
          </button>
        </div>
      ) : null}

      {isLoading ? (
        <div style={{ color: "rgba(255,255,255,.5)", fontSize: ".85rem" }}>Loading versions…</div>
      ) : !versions || versions.length === 0 ? (
        <div style={{ color: "rgba(255,255,255,.5)", fontSize: ".85rem" }}>No versions saved yet. Snapshot the current asset to start a history.</div>
      ) : (
        <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: ".5rem" }}>
          {versions.map((v: any) => (
            <li
              key={v.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: ".5rem",
                alignItems: "center",
                padding: ".5rem .65rem",
                background: "rgba(255,255,255,0.02)",
                borderRadius: 8,
                border: v.url === currentUrl ? "1px solid rgba(255,215,140,0.45)" : "1px solid transparent",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: ".82rem", color: "#fff", fontWeight: 500 }}>
                  {v.label || `Version #${v.id}`}
                  {v.url === currentUrl ? <span style={{ marginLeft: ".5rem", fontSize: ".65rem", color: "#FFD78C" }}>(current)</span> : null}
                </div>
                <div style={{ fontSize: ".7rem", color: "rgba(255,255,255,.5)" }}>
                  {new Date(v.createdAt).toLocaleString()} · {v.createdByName || `User #${v.createdBy}`} {v.sizeBytes ? `· ${fmtBytes(v.sizeBytes)}` : ""}
                </div>
                {v.notes ? <div style={{ fontSize: ".75rem", color: "rgba(255,255,255,.7)", marginTop: ".2rem" }}>{v.notes}</div> : null}
              </div>
              <div style={{ display: "flex", gap: ".3rem", flexShrink: 0 }}>
                <a
                  href={v.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ background: "rgba(255,255,255,.06)", color: "rgba(255,255,255,.85)", borderRadius: 6, padding: ".25rem .55rem", fontSize: ".7rem", textDecoration: "none" }}
                >
                  Open
                </a>
                {onRestore && v.url !== currentUrl ? (
                  <button onClick={() => onRestore(v.url)} style={{ background: "rgba(255,215,140,0.18)", color: "#FFD78C", border: "1px solid rgba(255,215,140,0.4)", borderRadius: 6, padding: ".25rem .55rem", fontSize: ".7rem", cursor: "pointer" }}>
                    Restore
                  </button>
                ) : null}
                <button
                  onClick={() => { if (confirm("Delete this version?")) deleteMut.mutate({ projectId, id: v.id }); }}
                  style={{ background: "rgba(239,68,68,0.15)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.4)", borderRadius: 6, padding: ".25rem .5rem", fontSize: ".7rem", cursor: "pointer" }}
                >
                  ×
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
