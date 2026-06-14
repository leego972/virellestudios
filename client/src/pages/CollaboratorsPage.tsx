import { useState } from "react";
import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";

const ROLE_BADGE: Record<string, string> = {
  owner: "rgba(255,215,140,.2)",
  editor: "rgba(99,102,241,.2)",
  viewer: "rgba(148,163,184,.2)",
};

export default function CollaboratorsPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = parseInt(id || "0", 10);
  const utils = trpc.useUtils();
  const { data: collaborators, isLoading } = trpc.collaboratorView.list.useQuery({ projectId }, { enabled: projectId > 0 });
  const inviteMut = trpc.collaboration.invite.useMutation({
    onSuccess: () => { utils.collaboratorView.list.invalidate({ projectId }); setEmail(""); setInvited(true); setTimeout(() => setInvited(false), 2500); },
  });

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"viewer" | "editor">("viewer");
  const [invited, setInvited] = useState(false);

  return (
    <div className="min-h-screen" style={{ background:"linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)" }}>
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg,#08070f 0%,#1a0f2b 100%)", color: "#fff", padding: "2rem 1.5rem" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <Link href={`/projects/${projectId}`} style={{ color: "rgba(255,215,140,.8)", textDecoration: "none", fontSize: ".85rem" }}>← Back to project</Link>
        <h1 className="text-gold-shimmer" style={{ margin: "1rem 0 .25rem", fontSize: "1.8rem", color: "#FFD78C", letterSpacing: ".02em" }}>Collaborators</h1>
        <p style={{ color: "rgba(255,255,255,.6)", marginTop: 0, marginBottom: "1.6rem", fontSize: ".95rem" }}>
          Invite teammates by email. They'll receive an invite link to join this project.
        </p>

        <section style={{ background: "rgba(8,12,28,.55)", border: "1px solid rgba(255,215,140,.18)", borderRadius: 14, padding: "1.2rem 1.3rem", marginBottom: "1.4rem" }}>
          <h2 className="gradient-text-gold" style={{ margin: 0, fontSize: ".95rem", color: "#FFD78C", textTransform: "uppercase", letterSpacing: ".05em" }}>Invite by email</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 130px auto", gap: ".5rem", marginTop: ".75rem" }}>
            <input
              type="email"
              placeholder="teammate@studio.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ background: "rgba(0,0,0,.35)", border: "1px solid rgba(255,255,255,.15)", borderRadius: 8, color: "#fff", padding: ".55rem .7rem", fontSize: ".9rem" }}
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              style={{ background: "rgba(0,0,0,.35)", border: "1px solid rgba(255,255,255,.15)", borderRadius: 8, color: "#fff", padding: ".55rem .7rem", fontSize: ".9rem" }}
            >
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
            </select>
            <button
              onClick={() => email && inviteMut.mutate({ projectId, email, role })}
              disabled={!email || inviteMut.isPending}
              style={{ background: "linear-gradient(135deg,#FFD78C,#E0B973)", color: "#1a1228", border: "none", borderRadius: 8, padding: ".55rem 1.2rem", fontSize: ".9rem", fontWeight: 600, cursor: "pointer" }}
            >
              {inviteMut.isPending ? "…" : "Invite"}
            </button>
          </div>
          {invited ? <div style={{ marginTop: ".7rem", color: "#86efac", fontSize: ".82rem" }}>✓ Invitation sent. Share the invite link from the team list below if needed.</div> : null}
          {inviteMut.error ? <div style={{ marginTop: ".7rem", color: "#fca5a5", fontSize: ".82rem" }}>{inviteMut.error.message}</div> : null}
        </section>

        <section style={{ background: "rgba(8,12,28,.55)", border: "1px solid rgba(255,215,140,.18)", borderRadius: 14, padding: "1.2rem 1.3rem" }}>
          <h2 className="gradient-text-gold" style={{ margin: 0, fontSize: ".95rem", color: "#FFD78C", textTransform: "uppercase", letterSpacing: ".05em" }}>Team</h2>
          {isLoading ? (
            <div style={{ marginTop: ".8rem", color: "rgba(255,255,255,.5)", fontSize: ".9rem" }}>Loading…</div>
          ) : !collaborators || collaborators.length === 0 ? (
            <div style={{ marginTop: ".8rem", color: "rgba(255,255,255,.5)", fontSize: ".9rem" }}>No collaborators yet — invite someone above to get started.</div>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: ".8rem 0 0", display: "flex", flexDirection: "column", gap: ".5rem" }}>
              {collaborators.map((c: any) => (
                <li key={c.id} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: ".7rem", alignItems: "center", padding: ".65rem .8rem", background: "rgba(255,255,255,.02)", borderRadius: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: ".9rem", color: "#fff" }}>{c.email || `User #${c.userId || c.id}`}</div>
                    <div style={{ fontSize: ".72rem", color: "rgba(255,255,255,.5)", marginTop: ".15rem" }}>
                      Status: {c.status || "pending"} · Added {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "—"}
                    </div>
                  </div>
                  <span style={{ background: ROLE_BADGE[c.role] || "rgba(148,163,184,.2)", color: "#fff", borderRadius: 999, padding: ".15rem .65rem", fontSize: ".7rem", textTransform: "capitalize" }}>{c.role || "viewer"}</span>
                  {c.inviteToken && c.status !== "accepted" ? (
                    <button
                      onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/invite/${c.inviteToken}`); }}
                      style={{ background: "rgba(255,255,255,.06)", color: "rgba(255,255,255,.85)", border: "1px solid rgba(255,255,255,.15)", borderRadius: 6, padding: ".3rem .6rem", fontSize: ".72rem", cursor: "pointer" }}
                      title="Copy invite link"
                    >
                      Copy link
                    </button>
                  ) : <span />}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
    </div>
  );
}
