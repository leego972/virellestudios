import { useParams, Link } from "wouter";
import ApprovalChainTimeline from "../components/ApprovalChainTimeline";

export default function ApprovalChainPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = parseInt(id || "0", 10);
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg,#08070f 0%,#1a0f2b 100%)", color: "#fff", padding: "2rem 1.5rem" }}>
      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        <Link href={`/projects/${projectId}`} style={{ color: "rgba(255,215,140,.8)", textDecoration: "none", fontSize: ".85rem" }}>← Back to project</Link>
        <h1 style={{ margin: "1rem 0 .25rem", fontSize: "1.8rem", color: "#FFD78C" }}>Approval audit log</h1>
        <p style={{ color: "rgba(255,255,255,.6)", marginTop: 0, marginBottom: "1.6rem", fontSize: ".95rem" }}>
          Every approval and change request is hash-linked to the previous entry. If anyone tampered with history, the chain would break and we'd flag it.
        </p>
        <ApprovalChainTimeline projectId={projectId} />
      </div>
    </div>
  );
}
