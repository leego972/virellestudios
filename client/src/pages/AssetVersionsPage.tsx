import { useState } from "react";
import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import AssetVersionStack from "../components/AssetVersionStack";

export default function AssetVersionsPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = parseInt(id || "0", 10);
  const { data: scenes } = trpc.scene.listByProject.useQuery({ projectId }, { enabled: projectId > 0 });
  const [selectedSceneId, setSelectedSceneId] = useState<number | null>(null);

  const selected = scenes?.find((s: any) => s.id === selectedSceneId) as any;

  return (
    <div className="min-h-screen" style={{ background:"linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)" }}>
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg,#08070f 0%,#1a0f2b 100%)", color: "#fff", padding: "2rem 1.5rem" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <Link href={`/projects/${projectId}`} style={{ color: "rgba(255,215,140,.8)", textDecoration: "none", fontSize: ".85rem" }}>← Back to project</Link>
        <h1 className="text-gold-shimmer" style={{ margin: "1rem 0 .25rem", fontSize: "1.8rem", color: "#FFD78C" }}>Asset versions</h1>
        <p style={{ color: "rgba(255,255,255,.6)", marginTop: 0, marginBottom: "1.6rem", fontSize: ".95rem" }}>
          Snapshot scene videos before regenerating so you can compare takes and roll back at any time.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: "1.2rem" }}>
          <aside style={{ background: "rgba(8,12,28,.55)", border: "1px solid rgba(255,215,140,.18)", borderRadius: 14, padding: ".9rem", maxHeight: "70vh", overflow: "auto" }}>
            <h3 style={{ margin: "0 0 .5rem", fontSize: ".85rem", color: "#FFD78C", textTransform: "uppercase", letterSpacing: ".05em" }}>Scenes</h3>
            {!scenes || scenes.length === 0 ? (
              <div style={{ color: "rgba(255,255,255,.5)", fontSize: ".82rem" }}>No scenes yet.</div>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: ".25rem" }}>
                {scenes.map((s: any) => (
                  <li key={s.id}>
                    <button
                      onClick={() => setSelectedSceneId(s.id)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        background: selectedSceneId === s.id ? "rgba(255,215,140,.15)" : "transparent",
                        color: selectedSceneId === s.id ? "#FFD78C" : "rgba(255,255,255,.85)",
                        border: "1px solid " + (selectedSceneId === s.id ? "rgba(255,215,140,.4)" : "transparent"),
                        borderRadius: 6,
                        padding: ".4rem .55rem",
                        fontSize: ".82rem",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>#{s.sceneNumber || s.id} · {s.title || "Untitled scene"}</div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </aside>

          <main>
            {!selected ? (
              <div style={{ padding: "2rem", color: "rgba(255,255,255,.5)", textAlign: "center", background: "rgba(8,12,28,.4)", borderRadius: 14 }}>
                Select a scene from the list to view its version stack.
              </div>
            ) : (
              <>
                <div style={{ background: "rgba(8,12,28,.55)", border: "1px solid rgba(255,215,140,.18)", borderRadius: 14, padding: "1rem 1.2rem", marginBottom: "1rem" }}>
                  <h3 style={{ margin: 0, fontSize: "1rem", color: "#FFD78C" }}>#{selected.sceneNumber || selected.id} · {selected.title || "Untitled"}</h3>
                  {selected.videoUrl ? (
                    <video controls src={selected.videoUrl} style={{ marginTop: ".7rem", width: "100%", maxHeight: 280, borderRadius: 8, background: "#000" }} />
                  ) : (
                    <div style={{ marginTop: ".7rem", padding: "1rem", color: "rgba(255,255,255,.5)", background: "rgba(0,0,0,.3)", borderRadius: 8, textAlign: "center" }}>
                      No video on this scene yet.
                    </div>
                  )}
                </div>
                <AssetVersionStack
                  projectId={projectId}
                  ownerKind="scene"
                  ownerId={selected.id}
                  fieldName="videoUrl"
                  currentUrl={selected.videoUrl}
                />
              </>
            )}
          </main>
        </div>
      </div>
    </div>
    </div>
  );
}
