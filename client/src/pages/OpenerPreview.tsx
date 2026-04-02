import { useState } from "react";
import StudioOpener from "@/components/StudioOpener";

/**
 * Standalone preview page for the Virelle Studios opener animation.
 * Route: /opener-preview
 * This page is for internal review only.
 */
export default function OpenerPreview() {
  const [key, setKey] = useState(0);
  const [playing, setPlaying] = useState(true);

  const handleComplete = () => setPlaying(false);
  const handleReplay = () => { setKey(k => k + 1); setPlaying(true); };

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center">
      {playing && (
        <StudioOpener
          key={key}
          onComplete={handleComplete}
          mode="login"
          skippable={true}
        />
      )}
      {!playing && (
        <div className="text-center">
          <p style={{ color: "rgba(212,175,55,0.7)", letterSpacing: "0.3em", fontSize: "0.8rem", marginBottom: "24px" }}>
            OPENER COMPLETE
          </p>
          <button
            onClick={handleReplay}
            style={{
              background: "none",
              border: "1px solid rgba(212,175,55,0.5)",
              color: "#D4AF37",
              padding: "12px 32px",
              letterSpacing: "0.3em",
              fontSize: "0.8rem",
              cursor: "pointer",
              fontFamily: "'Playfair Display','Georgia',serif",
            }}
          >
            REPLAY
          </button>
        </div>
      )}
    </div>
  );
}
