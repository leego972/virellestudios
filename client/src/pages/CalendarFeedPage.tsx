import { useState } from "react";
import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";

export default function CalendarFeedPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = parseInt(id || "0", 10);
  const { data, isLoading } = trpc.scriptIO.iCalUrl.useQuery({ projectId }, { enabled: projectId > 0 });
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (label: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  };

  const fullUrl = data ? (data.url || `${window.location.origin}${data.path}`) : "";
  const webcalUrl = data ? (data.webcal && data.webcal.startsWith("webcal:") ? data.webcal : fullUrl.replace(/^https?:/, "webcal:")) : "";

  return (
    <div className="min-h-screen" style={{ background:"linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)" }}>
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg,#08070f 0%,#1a0f2b 100%)", color: "#fff", padding: "2rem 1.5rem" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <Link href={`/projects/${projectId}`} style={{ color: "rgba(255,215,140,.8)", textDecoration: "none", fontSize: ".85rem" }}>← Back to project</Link>
        <h1 className="gradient-text-gold" style={{ margin: "1rem 0 .25rem", fontSize: "1.8rem", color: "#FFD78C" }}>Calendar feed</h1>
        <p style={{ color: "rgba(255,255,255,.6)", marginTop: 0, marginBottom: "1.6rem", fontSize: ".95rem" }}>
          Subscribe to your shoot schedule from any calendar app. The feed updates automatically as you adjust shoot days, call times, and locations.
        </p>

        {isLoading ? (
          <div style={{ color: "rgba(255,255,255,.5)" }}>Generating feed URL…</div>
        ) : !data ? (
          <div style={{ color: "#fca5a5" }}>Feed unavailable.</div>
        ) : (
          <>
            <section style={{ background: "rgba(8,12,28,.55)", border: "1px solid rgba(255,215,140,.18)", borderRadius: 14, padding: "1.3rem", marginBottom: "1.2rem" }}>
              <h2 className="gradient-text-gold" style={{ margin: 0, fontSize: ".95rem", color: "#FFD78C", textTransform: "uppercase", letterSpacing: ".05em" }}>Subscribe URL</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: ".5rem", marginTop: ".75rem" }}>
                <code style={{ background: "rgba(0,0,0,.4)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 8, padding: ".55rem .75rem", fontSize: ".8rem", color: "rgba(255,255,255,.9)", overflow: "auto", whiteSpace: "nowrap" }}>{fullUrl}</code>
                <button onClick={() => copy("https", fullUrl)} style={{ background: "linear-gradient(135deg,#FFD78C,#E0B973)", color: "#1a1228", border: "none", borderRadius: 8, padding: ".55rem 1rem", fontSize: ".85rem", fontWeight: 600, cursor: "pointer" }}>
                  {copied === "https" ? "Copied!" : "Copy"}
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: ".5rem", marginTop: ".5rem" }}>
                <code style={{ background: "rgba(0,0,0,.4)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 8, padding: ".55rem .75rem", fontSize: ".8rem", color: "rgba(255,255,255,.9)", overflow: "auto", whiteSpace: "nowrap" }}>{webcalUrl}</code>
                <button onClick={() => copy("webcal", webcalUrl)} style={{ background: "rgba(255,255,255,.08)", color: "#fff", border: "1px solid rgba(255,255,255,.2)", borderRadius: 8, padding: ".55rem 1rem", fontSize: ".85rem", cursor: "pointer" }}>
                  {copied === "webcal" ? "Copied!" : "Copy"}
                </button>
              </div>
              <a href={fullUrl} download style={{ display: "inline-block", marginTop: ".8rem", color: "#FFD78C", fontSize: ".82rem", textDecoration: "underline" }}>
                Or download the .ics file directly
              </a>
            </section>

            <section style={{ background: "rgba(8,12,28,.55)", border: "1px solid rgba(255,215,140,.18)", borderRadius: 14, padding: "1.3rem" }}>
              <h2 className="gradient-text-gold" style={{ margin: 0, fontSize: ".95rem", color: "#FFD78C", textTransform: "uppercase", letterSpacing: ".05em" }}>How to subscribe</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".75rem", marginTop: ".75rem" }}>
                <div style={{ padding: ".7rem .85rem", background: "rgba(255,255,255,.02)", borderRadius: 8 }}>
                  <strong style={{ color: "#fff", fontSize: ".88rem" }}>Apple Calendar</strong>
                  <p style={{ margin: ".3rem 0 0", color: "rgba(255,255,255,.6)", fontSize: ".78rem", lineHeight: 1.45 }}>
                    File → New Calendar Subscription → paste the webcal:// URL above.
                  </p>
                </div>
                <div style={{ padding: ".7rem .85rem", background: "rgba(255,255,255,.02)", borderRadius: 8 }}>
                  <strong style={{ color: "#fff", fontSize: ".88rem" }}>Google Calendar</strong>
                  <p style={{ margin: ".3rem 0 0", color: "rgba(255,255,255,.6)", fontSize: ".78rem", lineHeight: 1.45 }}>
                    Other calendars → + → From URL → paste the https:// URL above.
                  </p>
                </div>
                <div style={{ padding: ".7rem .85rem", background: "rgba(255,255,255,.02)", borderRadius: 8 }}>
                  <strong style={{ color: "#fff", fontSize: ".88rem" }}>Outlook</strong>
                  <p style={{ margin: ".3rem 0 0", color: "rgba(255,255,255,.6)", fontSize: ".78rem", lineHeight: 1.45 }}>
                    Add Calendar → Subscribe from web → paste the https:// URL.
                  </p>
                </div>
                <div style={{ padding: ".7rem .85rem", background: "rgba(255,255,255,.02)", borderRadius: 8 }}>
                  <strong style={{ color: "#fff", fontSize: ".88rem" }}>iPhone (mobile)</strong>
                  <p style={{ margin: ".3rem 0 0", color: "rgba(255,255,255,.6)", fontSize: ".78rem", lineHeight: 1.45 }}>
                    Tap the webcal:// URL on your phone — iOS prompts to subscribe.
                  </p>
                </div>
              </div>
              <p style={{ margin: "1rem 0 0", fontSize: ".75rem", color: "rgba(255,255,255,.45)" }}>
                Treat this URL as a secret — anyone with it can read your shoot days. Re-deploy with a rotated session key to invalidate.
              </p>
            </section>
          </>
        )}
      </div>
    </div>
    </div>
  );
}
