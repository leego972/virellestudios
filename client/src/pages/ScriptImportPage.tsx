import { useRef, useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

type Format = "fountain" | "fdx";

export default function ScriptImportPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const projectId = parseInt(id || "0", 10);
  const fileRef = useRef<HTMLInputElement>(null);
  const [format, setFormat] = useState<Format>("fountain");
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<any[] | null>(null);
  const [previewTotal, setPreviewTotal] = useState(0);
  const [committed, setCommitted] = useState<{ count: number } | null>(null);

  const importFountain = trpc.scriptIO.importFountain.useMutation();
  const importFDX = trpc.scriptIO.importFDX.useMutation();

  const onFile = (f: File | null) => {
    if (!f) return;
    if (f.name.toLowerCase().endsWith(".fdx") || f.type.includes("xml")) setFormat("fdx");
    else setFormat("fountain");
    const reader = new FileReader();
    reader.onload = () => setText(String(reader.result || ""));
    reader.readAsText(f);
  };

  const runPreview = async () => {
    setCommitted(null);
    if (format === "fountain") {
      const r = await importFountain.mutateAsync({ projectId, text, commit: false });
      setPreview((r as any).preview);
      setPreviewTotal((r as any).total);
    } else {
      const r = await importFDX.mutateAsync({ projectId, xml: text, commit: false });
      setPreview((r as any).preview);
      setPreviewTotal((r as any).total);
    }
  };

  const runCommit = async () => {
    if (format === "fountain") {
      const r = await importFountain.mutateAsync({ projectId, text, commit: true });
      setCommitted({ count: (r as any).created });
    } else {
      const r = await importFDX.mutateAsync({ projectId, xml: text, commit: true });
      setCommitted({ count: (r as any).created });
    }
  };

  const isLoading = importFountain.isPending || importFDX.isPending;
  const error = importFountain.error?.message || importFDX.error?.message;

  return (
    <div className="min-h-screen" style={{ background:"linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)" }}>
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg,#08070f 0%,#1a0f2b 100%)", color: "#fff", padding: "2rem 1.5rem" }}>
      <div style={{ maxWidth: 920, margin: "0 auto" }}>
        <Link href={`/projects/${projectId}`} style={{ color: "rgba(255,215,140,.8)", textDecoration: "none", fontSize: ".85rem" }}>← Back to project</Link>
        <h1 className="gradient-text-gold" style={{ margin: "1rem 0 .25rem", fontSize: "1.8rem", color: "#FFD78C" }}>Import script</h1>
        <p style={{ color: "rgba(255,255,255,.6)", marginTop: 0, marginBottom: "1.6rem", fontSize: ".95rem" }}>
          Drop in a Fountain (.fountain) or Final Draft (.fdx) script and we'll parse the scenes for review before committing.
        </p>

        <section style={{ background: "rgba(8,12,28,.55)", border: "1px solid rgba(255,215,140,.18)", borderRadius: 14, padding: "1.2rem 1.3rem", marginBottom: "1.4rem" }}>
          <div style={{ display: "flex", gap: ".75rem", flexWrap: "wrap", alignItems: "center", marginBottom: ".8rem" }}>
            <select value={format} onChange={(e) => setFormat(e.target.value as Format)} style={{ background: "rgba(0,0,0,.35)", border: "1px solid rgba(255,255,255,.15)", borderRadius: 8, color: "#fff", padding: ".5rem .7rem", fontSize: ".9rem" }}>
              <option value="fountain">Fountain (.fountain)</option>
              <option value="fdx">Final Draft (.fdx)</option>
            </select>
            <button onClick={() => fileRef.current?.click()} style={{ background: "rgba(255,255,255,.06)", color: "#fff", border: "1px solid rgba(255,255,255,.18)", borderRadius: 8, padding: ".5rem 1rem", fontSize: ".88rem", cursor: "pointer" }}>
              Choose file…
            </button>
            <input ref={fileRef} type="file" accept=".fountain,.fdx,.txt,.xml" onChange={(e) => onFile(e.target.files?.[0] || null)} style={{ display: "none" }} />
            <span style={{ fontSize: ".8rem", color: "rgba(255,255,255,.5)" }}>or paste below</span>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={14}
            placeholder={format === "fountain" ? "Title: My Project\n\nINT. COFFEE SHOP - DAY\n\nA quiet morning. JANE enters.\n\nJANE\nIs this seat taken?\n" : "<?xml version='1.0'?>\n<FinalDraft Version='5'>...</FinalDraft>"}
            style={{ width: "100%", background: "rgba(0,0,0,.35)", border: "1px solid rgba(255,255,255,.15)", borderRadius: 8, color: "#fff", padding: ".7rem .85rem", fontSize: ".82rem", fontFamily: "ui-monospace, monospace", resize: "vertical" }}
          />
          <div style={{ display: "flex", gap: ".5rem", marginTop: ".8rem" }}>
            <button onClick={runPreview} disabled={!text || isLoading} style={{ background: "rgba(255,255,255,.08)", color: "#fff", border: "1px solid rgba(255,255,255,.2)", borderRadius: 8, padding: ".55rem 1.1rem", fontSize: ".88rem", cursor: "pointer" }}>
              {isLoading ? "Parsing…" : "Preview scenes"}
            </button>
            <button onClick={runCommit} disabled={!text || isLoading} style={{ background: "linear-gradient(135deg,#FFD78C,#E0B973)", color: "#1a1228", border: "none", borderRadius: 8, padding: ".55rem 1.1rem", fontSize: ".88rem", fontWeight: 600, cursor: "pointer" }}>
              {isLoading ? "Importing…" : "Import & create scenes"}
            </button>
          </div>
          {error ? <div style={{ marginTop: ".7rem", color: "#fca5a5", fontSize: ".82rem" }}>{error}</div> : null}
          {committed ? (
            <div style={{ marginTop: ".7rem", padding: ".6rem .8rem", background: "rgba(34,197,94,.15)", borderRadius: 8, color: "#86efac", fontSize: ".88rem" }}>
              ✓ Created {committed.count} scenes. <button onClick={() => navigate(`/projects/${projectId}`)} style={{ background: "transparent", color: "#86efac", border: "none", textDecoration: "underline", cursor: "pointer", padding: 0 }}>Open project →</button>
            </div>
          ) : null}
        </section>

        {preview ? (
          <section style={{ background: "rgba(8,12,28,.55)", border: "1px solid rgba(255,215,140,.18)", borderRadius: 14, padding: "1.2rem 1.3rem" }}>
            <h2 className="gradient-text-gold" style={{ margin: 0, fontSize: ".95rem", color: "#FFD78C", textTransform: "uppercase", letterSpacing: ".05em" }}>
              Parsed {previewTotal} scene{previewTotal === 1 ? "" : "s"}{preview.length < previewTotal ? ` · showing first ${preview.length}` : ""}
            </h2>
            <ol style={{ listStyle: "none", padding: 0, margin: ".75rem 0 0", display: "flex", flexDirection: "column", gap: ".5rem" }}>
              {preview.map((s: any) => (
                <li key={s.sceneNumber} style={{ padding: ".55rem .7rem", background: "rgba(255,255,255,.02)", borderRadius: 8, borderLeft: "3px solid rgba(255,215,140,.5)" }}>
                  <div style={{ fontSize: ".82rem", color: "#FFD78C", fontWeight: 600 }}>#{s.sceneNumber} · {s.heading}</div>
                  {s.characters?.length ? <div style={{ fontSize: ".72rem", color: "rgba(255,255,255,.55)", marginTop: ".2rem" }}>Characters: {s.characters.join(", ")}</div> : null}
                  {s.description ? <div style={{ fontSize: ".78rem", color: "rgba(255,255,255,.7)", marginTop: ".2rem", whiteSpace: "pre-wrap", maxHeight: 80, overflow: "hidden" }}>{s.description.slice(0, 220)}{s.description.length > 220 ? "…" : ""}</div> : null}
                </li>
              ))}
            </ol>
          </section>
        ) : null}
      </div>
    </div>
    </div>
  );
}
