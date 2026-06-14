import { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";

interface Fringe { label: string; pct: number; appliesTo: string[]; }

const DEFAULT_FRINGES: Fringe[] = [
  { label: "Payroll taxes (FICA + state)", pct: 8.5, appliesTo: ["cast", "crew"] },
  { label: "Workers comp", pct: 3.2, appliesTo: ["cast", "crew"] },
  { label: "Health & welfare", pct: 6.0, appliesTo: ["crew"] },
  { label: "Pension & vacation", pct: 8.0, appliesTo: ["crew"] },
  { label: "Equipment rental tax", pct: 8.875, appliesTo: ["equipment"] },
];

function categoryMatches(catKey: string, label: string, appliesTo: string[]): boolean {
  const k = (catKey + " " + label).toLowerCase();
  return appliesTo.some((tag) => k.includes(tag));
}

export default function BudgetFringesPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = parseInt(id || "0", 10);
  const utils = trpc.useUtils();
  const { data: budgets, isLoading } = trpc.budget.list.useQuery({ projectId }, { enabled: projectId > 0 });
  const upsertMut = trpc.budgetManual.upsert.useMutation({
    onSuccess: () => { utils.budget.list.invalidate({ projectId }); setSaved(true); setTimeout(() => setSaved(false), 1500); },
  });

  const budget = budgets && budgets.length > 0 ? (budgets[0] as any) : null;
  const breakdown = useMemo(() => {
    try { return budget?.breakdown ? (typeof budget.breakdown === "string" ? JSON.parse(budget.breakdown) : budget.breakdown) : {}; }
    catch { return {}; }
  }, [budget]);

  const [fringes, setFringes] = useState<Fringe[]>(DEFAULT_FRINGES);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (breakdown && breakdown._fringes && Array.isArray(breakdown._fringes)) {
      setFringes(breakdown._fringes as Fringe[]);
    }
  }, [breakdown]);

  // Compute fringed totals
  const computed = useMemo(() => {
    const rows: Array<{ key: string; label: string; estimate: number; fringe: number; fringedTotal: number; matched: string[] }> = [];
    let grandBase = 0, grandFringe = 0;
    for (const [key, val] of Object.entries(breakdown || {})) {
      if (key.startsWith("_")) continue;
      const v: any = val;
      if (typeof v?.estimate !== "number") continue;
      let totalPct = 0;
      const matched: string[] = [];
      for (const f of fringes) {
        if (categoryMatches(key, v.label || "", f.appliesTo)) {
          totalPct += f.pct;
          matched.push(`${f.label} (${f.pct}%)`);
        }
      }
      const fringeAmt = v.estimate * (totalPct / 100);
      rows.push({ key, label: v.label || key, estimate: v.estimate, fringe: fringeAmt, fringedTotal: v.estimate + fringeAmt, matched });
      grandBase += v.estimate;
      grandFringe += fringeAmt;
    }
    return { rows, grandBase, grandFringe, grandTotal: grandBase + grandFringe };
  }, [breakdown, fringes]);

  const currency = budget?.currency || "USD";
  const fmt = (n: number) => new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(n);

  const updateFringe = (i: number, patch: Partial<Fringe>) => {
    setFringes((arr) => arr.map((f, idx) => idx === i ? { ...f, ...patch } : f));
  };
  const removeFringe = (i: number) => setFringes((arr) => arr.filter((_, idx) => idx !== i));
  const addFringe = () => setFringes((arr) => [...arr, { label: "Custom fringe", pct: 5, appliesTo: ["crew"] }]);

  const saveFringes = () => {
    const next = { ...breakdown, _fringes: fringes };
    upsertMut.mutate({ projectId, currency, breakdown: next as any });
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)", color: "#fff", padding: "2rem 1.5rem" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <Link href={`/projects/${projectId}`} style={{ color: "rgba(255,215,140,.8)", textDecoration: "none", fontSize: ".85rem" }}>← Back to project</Link>
        <h1 className="gradient-text-gold" style={{ margin: "1rem 0 .25rem", fontSize: "1.8rem", color: "#FFD78C" }}>Fringes & loaded labor</h1>
        <p style={{ color: "rgba(255,255,255,.6)", marginTop: 0, marginBottom: "1.6rem", fontSize: ".95rem" }}>
          Layer payroll taxes, union benefits, and rental taxes on top of your budget categories. Categories are matched by tag (cast, crew, equipment).
        </p>

        {isLoading ? (
          <div style={{ color: "rgba(255,255,255,.5)" }}>Loading budget…</div>
        ) : !budget ? (
          <div style={{ background: "rgba(245,158,11,.1)", border: "1px solid rgba(245,158,11,.3)", borderRadius: 10, padding: "1rem 1.2rem", color: "#fde68a" }}>
            No budget yet for this project. Create or generate a budget first to apply fringes.
          </div>
        ) : (
          <>
            <section style={{ background: "rgba(8,12,28,.55)", border: "1px solid rgba(255,215,140,.18)", borderRadius: 14, padding: "1.3rem", marginBottom: "1.4rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: ".7rem" }}>
                <h2 className="gradient-text-gold" style={{ margin: 0, fontSize: "1rem", color: "#FFD78C" }}>Fringe rates</h2>
                <div style={{ display: "flex", gap: ".4rem" }}>
                  <button onClick={addFringe} style={{ background: "rgba(255,255,255,.06)", color: "#fff", border: "1px solid rgba(255,255,255,.18)", borderRadius: 6, padding: ".3rem .7rem", fontSize: ".78rem", cursor: "pointer" }}>+ Add fringe</button>
                  <button onClick={saveFringes} disabled={upsertMut.isPending} style={{ background: "linear-gradient(135deg,#FFD78C,#E0B973)", color: "#1a1228", border: "none", borderRadius: 6, padding: ".3rem .9rem", fontSize: ".78rem", fontWeight: 600, cursor: "pointer" }}>
                    {upsertMut.isPending ? "Saving…" : saved ? "Saved ✓" : "Save fringes"}
                  </button>
                </div>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".82rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,.1)", color: "rgba(255,255,255,.55)" }}>
                    <th style={{ textAlign: "left", padding: ".5rem .4rem", fontWeight: 500 }}>Label</th>
                    <th style={{ textAlign: "left", padding: ".5rem .4rem", fontWeight: 500 }}>%</th>
                    <th style={{ textAlign: "left", padding: ".5rem .4rem", fontWeight: 500 }}>Applies to (tags, comma-separated)</th>
                    <th style={{ width: 32 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {fringes.map((f, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,.05)" }}>
                      <td style={{ padding: ".4rem .4rem" }}>
                        <input value={f.label} onChange={(e) => updateFringe(i, { label: e.target.value })} style={{ width: "100%", background: "transparent", border: "1px solid rgba(255,255,255,.1)", borderRadius: 4, color: "#fff", padding: ".3rem .4rem", fontSize: ".8rem" }} />
                      </td>
                      <td style={{ padding: ".4rem .4rem", width: 80 }}>
                        <input type="number" step="0.01" value={f.pct} onChange={(e) => updateFringe(i, { pct: parseFloat(e.target.value) || 0 })} style={{ width: "100%", background: "transparent", border: "1px solid rgba(255,255,255,.1)", borderRadius: 4, color: "#fff", padding: ".3rem .4rem", fontSize: ".8rem" }} />
                      </td>
                      <td style={{ padding: ".4rem .4rem" }}>
                        <input value={f.appliesTo.join(", ")} onChange={(e) => updateFringe(i, { appliesTo: e.target.value.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean) })} style={{ width: "100%", background: "transparent", border: "1px solid rgba(255,255,255,.1)", borderRadius: 4, color: "#fff", padding: ".3rem .4rem", fontSize: ".8rem" }} placeholder="cast, crew, equipment" />
                      </td>
                      <td>
                        <button onClick={() => removeFringe(i)} style={{ background: "transparent", color: "rgba(239,68,68,.7)", border: "none", cursor: "pointer", fontSize: "1rem" }} title="Remove">×</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section style={{ background: "rgba(8,12,28,.55)", border: "1px solid rgba(255,215,140,.18)", borderRadius: 14, padding: "1.3rem" }}>
              <h2 className="gradient-text-gold" style={{ margin: 0, fontSize: "1rem", color: "#FFD78C" }}>Loaded budget preview</h2>
              <div style={{ fontSize: ".78rem", color: "rgba(255,255,255,.5)", marginTop: ".15rem", marginBottom: ".7rem" }}>Currency: {currency}</div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".83rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,.1)", color: "rgba(255,255,255,.55)" }}>
                    <th style={{ textAlign: "left", padding: ".5rem .4rem", fontWeight: 500 }}>Category</th>
                    <th style={{ textAlign: "right", padding: ".5rem .4rem", fontWeight: 500 }}>Base</th>
                    <th style={{ textAlign: "right", padding: ".5rem .4rem", fontWeight: 500 }}>Fringe</th>
                    <th style={{ textAlign: "right", padding: ".5rem .4rem", fontWeight: 500 }}>Loaded total</th>
                    <th style={{ textAlign: "left", padding: ".5rem .4rem", fontWeight: 500, color: "rgba(255,255,255,.4)" }}>Applied</th>
                  </tr>
                </thead>
                <tbody>
                  {computed.rows.length === 0 ? (
                    <tr><td colSpan={5} style={{ padding: "1rem .4rem", color: "rgba(255,255,255,.5)" }}>No spendable categories in this budget yet.</td></tr>
                  ) : computed.rows.map((r) => (
                    <tr key={r.key} style={{ borderBottom: "1px solid rgba(255,255,255,.05)" }}>
                      <td style={{ padding: ".5rem .4rem", color: "#fff" }}>{r.label}</td>
                      <td style={{ padding: ".5rem .4rem", textAlign: "right", color: "rgba(255,255,255,.85)" }}>{fmt(r.estimate)}</td>
                      <td style={{ padding: ".5rem .4rem", textAlign: "right", color: r.fringe > 0 ? "#FFD78C" : "rgba(255,255,255,.4)" }}>{fmt(r.fringe)}</td>
                      <td style={{ padding: ".5rem .4rem", textAlign: "right", color: "#fff", fontWeight: 600 }}>{fmt(r.fringedTotal)}</td>
                      <td style={{ padding: ".5rem .4rem", color: "rgba(255,255,255,.45)", fontSize: ".72rem" }}>{r.matched.join(" + ") || "—"}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: "2px solid rgba(255,215,140,.3)" }}>
                    <td style={{ padding: ".7rem .4rem", color: "#FFD78C", fontWeight: 600 }}>Grand total</td>
                    <td style={{ padding: ".7rem .4rem", textAlign: "right", color: "#fff" }}>{fmt(computed.grandBase)}</td>
                    <td style={{ padding: ".7rem .4rem", textAlign: "right", color: "#FFD78C" }}>{fmt(computed.grandFringe)}</td>
                    <td style={{ padding: ".7rem .4rem", textAlign: "right", color: "#FFD78C", fontWeight: 700, fontSize: ".95rem" }}>{fmt(computed.grandTotal)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
