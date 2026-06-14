import { useState } from "react";
import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";

export default function ScriptExportPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = parseInt(id || "0", 10);
  const fountainQ = trpc.scriptIO.exportFountain.useQuery({ projectId }, { enabled: projectId > 0 });
  const fdxQ = trpc.scriptIO.exportFDX.useQuery({ projectId }, { enabled: projectId > 0 });
  const [copied, setCopied] = useState<string | null>(null);

  const download = (filename: string, content: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const copy = async (label: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="min-h-screen" style={{ background:"linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)" }}>
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg,#08070f 0%,#1a0f2b 100%)", color: "#fff", padding: "2rem 1.5rem" }}>
      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        <Link href={`/projects/${projectId}`} style={{ color: "rgba(255,215,140,.8)", textDecoration: "none", fontSize: ".85rem" }}>← Back to project</Link>
        <h1 className="gradient-text-gold" style={{ margin: "1rem 0 .25rem", fontSize: "1.8rem", color: "#FFD78C" }}>Export script</h1>
        <p style={{ color: "rgba(255,255,255,.6)", marginTop: 0, marginBottom: "1.6rem", fontSize: ".95rem" }}>
          Send your scenes to industry-standard formats. Fountain works in any text editor; FDX opens directly in Final Draft.
        </p>

        <section style={{ background: "rgba(8,12,28,.55)", border: "1px solid rgba(255,215,140,.18)", borderRadius: 14, padding: "1.3rem", marginBottom: "1.4rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: ".7rem" }}>
            <h2 className="gradient-text-gold" style={{ margin: 0, fontSize: "1rem", color: "#FFD78C" }}>Fountain (.fountain)</h2>
            <div style={{ display: "flex", gap: ".4rem" }}>
              <button onClick={() => fountainQ.data && copy("fountain", fountainQ.data.text)} disabled={!fountainQ.data} style={{ background: "rgba(255,255,255,.06)", color: "#fff", border: "1px solid rgba(255,255,255,.18)", borderRadius: 6, padding: ".4rem .8rem", fontSize: ".8rem", cursor: "pointer" }}>
                {copied === "fountain" ? "Copied!" : "Copy"}
              </button>
              <button onClick={() => fountainQ.data && download(`project-${projectId}.fountain`, fountainQ.data.text, "text/plain")} disabled={!fountainQ.data} style={{ background: "linear-gradient(135deg,#FFD78C,#E0B973)", color: "#1a1228", border: "none", borderRadius: 6, padding: ".4rem .9rem", fontSize: ".8rem", fontWeight: 600, cursor: "pointer" }}>
                Download
              </button>
            </div>
          </div>
          <div style={{ fontSize: ".78rem", color: "rgba(255,255,255,.5)", marginBottom: ".5rem" }}>{fountainQ.data ? `${fountainQ.data.count} scenes` : "Loading…"}</div>
          <pre style={{ background: "rgba(0,0,0,.35)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 8, padding: ".7rem .85rem", maxHeight: 260, overflow: "auto", fontSize: ".75rem", color: "rgba(255,255,255,.85)", whiteSpace: "pre-wrap" }}>
            {fountainQ.data ? fountainQ.data.text.slice(0, 4000) || "(empty)" : "…"}
          </pre>
        </section>

        <section style={{ background: "rgba(8,12,28,.55)", border: "1px solid rgba(255,215,140,.18)", borderRadius: 14, padding: "1.3rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: ".7rem" }}>
            <h2 className="gradient-text-gold" style={{ margin: 0, fontSize: "1rem", color: "#FFD78C" }}>Final Draft (.fdx)</h2>
            <div style={{ display: "flex", gap: ".4rem" }}>
              <button onClick={() => fdxQ.data && copy("fdx", fdxQ.data.xml)} disabled={!fdxQ.data} style={{ background: "rgba(255,255,255,.06)", color: "#fff", border: "1px solid rgba(255,255,255,.18)", borderRadius: 6, padding: ".4rem .8rem", fontSize: ".8rem", cursor: "pointer" }}>
                {copied === "fdx" ? "Copied!" : "Copy"}
              </button>
              <button onClick={() => fdxQ.data && download(`project-${projectId}.fdx`, fdxQ.data.xml, "application/xml")} disabled={!fdxQ.data} style={{ background: "linear-gradient(135deg,#FFD78C,#E0B973)", color: "#1a1228", border: "none", borderRadius: 6, padding: ".4rem .9rem", fontSize: ".8rem", fontWeight: 600, cursor: "pointer" }}>
                Download
              </button>
            </div>
          </div>
          <div style={{ fontSize: ".78rem", color: "rgba(255,255,255,.5)", marginBottom: ".5rem" }}>{fdxQ.data ? `${fdxQ.data.count} scenes` : "Loading…"}</div>
          <pre style={{ background: "rgba(0,0,0,.35)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 8, padding: ".7rem .85rem", maxHeight: 260, overflow: "auto", fontSize: ".75rem", color: "rgba(255,255,255,.85)", whiteSpace: "pre-wrap" }}>
            {fdxQ.data ? fdxQ.data.xml.slice(0, 4000) || "(empty)" : "…"}
          </pre>
        </section>
      </div>
    </div>
    </div>
  );
}
