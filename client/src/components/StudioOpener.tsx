import { useState, useEffect, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";

/**
 * StudioOpener — VirElle Studios cinematic opener that plays:
 * 1. On every login (fullscreen splash before dashboard)
 * 2. As opening credits prepended to every user film
 *
 * If actual video scenes are available from the opener project, it plays those.
 * Otherwise, it plays a beautiful CSS/canvas animated version of the logo reveal.
 */

type StudioOpenerProps = {
  /** Called when the opener finishes or is skipped */
  onComplete: () => void;
  /** Whether this is the login splash (fullscreen) or film opener (inline) */
  mode?: "login" | "film";
  /** Allow skipping */
  skippable?: boolean;
};

export default function StudioOpener({ onComplete, mode = "login", skippable = true }: StudioOpenerProps) {
  const [phase, setPhase] = useState<"loading" | "playing" | "fadeout">("loading");
  const [currentSceneIdx, setCurrentSceneIdx] = useState(0);
  const [showSkip, setShowSkip] = useState(false);
  const [goldProgress, setGoldProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch opener scenes from the API
  const { data: opener, isLoading } = trpc.showcase.opener.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const hasVideoScenes = opener?.scenes && opener.scenes.length > 0;

  // Show skip button after 2 seconds
  useEffect(() => {
    if (!skippable) return;
    const timer = setTimeout(() => setShowSkip(true), 2000);
    return () => clearTimeout(timer);
  }, [skippable]);

  // Handle skip
  const handleSkip = useCallback(() => {
    setPhase("fadeout");
    setTimeout(onComplete, 600);
  }, [onComplete]);

  // Handle keyboard skip (Escape or Space)
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === " " || e.key === "Enter") {
        e.preventDefault();
        handleSkip();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleSkip]);

  // If no video scenes, run the animated version
  useEffect(() => {
    if (isLoading) return;
    setPhase("playing");

    if (!hasVideoScenes) {
      // Run animated opener: 8 seconds total
      const goldInterval = setInterval(() => {
        setGoldProgress((prev) => {
          if (prev >= 100) {
            clearInterval(goldInterval);
            return 100;
          }
          return prev + 2;
        });
      }, 100); // 5 seconds for gold transformation

      const completeTimer = setTimeout(() => {
        setPhase("fadeout");
        setTimeout(onComplete, 800);
      }, 8000);

      return () => {
        clearInterval(goldInterval);
        clearTimeout(completeTimer);
      };
    }
  }, [isLoading, hasVideoScenes, onComplete]);

  // Handle video scene playback
  const handleVideoEnd = useCallback(() => {
    if (!opener?.scenes) return;
    const nextIdx = currentSceneIdx + 1;
    if (nextIdx < opener.scenes.length) {
      setCurrentSceneIdx(nextIdx);
    } else {
      // All scenes played
      setPhase("fadeout");
      setTimeout(onComplete, 600);
    }
  }, [currentSceneIdx, opener, onComplete]);

  // Auto-play next video when scene index changes
  useEffect(() => {
    if (videoRef.current && hasVideoScenes) {
      videoRef.current.play().catch(() => {});
    }
  }, [currentSceneIdx, hasVideoScenes]);

  const currentScene = hasVideoScenes ? opener.scenes[currentSceneIdx] : null;

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 z-[9999] bg-black flex items-center justify-center overflow-hidden transition-opacity duration-700 ${
        phase === "fadeout" ? "opacity-0" : "opacity-100"
      }`}
      onClick={skippable ? handleSkip : undefined}
      style={{ cursor: skippable ? "pointer" : "default" }}
    >
      {/* Video playback mode */}
      {hasVideoScenes && currentScene && (
        <video
          ref={videoRef}
          key={currentScene.id}
          src={currentScene.videoUrl}
          className="w-full h-full object-contain"
          autoPlay
          playsInline
          muted={false}
          onEnded={handleVideoEnd}
          onError={handleSkip}
        />
      )}

      {/* Animated fallback mode */}
      {!hasVideoScenes && phase === "playing" && (
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Volumetric fog background */}
          <div className="absolute inset-0 overflow-hidden">
            <div
              className="absolute inset-0 opacity-20"
              style={{
                background: `
                  radial-gradient(ellipse at 30% 50%, rgba(100, 130, 180, 0.3) 0%, transparent 60%),
                  radial-gradient(ellipse at 70% 40%, rgba(80, 100, 160, 0.2) 0%, transparent 50%),
                  radial-gradient(ellipse at 50% 60%, rgba(60, 80, 140, 0.15) 0%, transparent 70%)
                `,
                animation: "fogDrift 8s ease-in-out infinite",
              }}
            />
          </div>

          {/* Golden light rays (appear during gold transformation) */}
          {goldProgress > 30 && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                opacity: Math.min((goldProgress - 30) / 70, 0.6),
                background: `radial-gradient(ellipse at center, rgba(212, 175, 55, ${
                  0.3 * Math.min((goldProgress - 30) / 50, 1)
                }) 0%, transparent 70%)`,
              }}
            />
          )}

          {/* Golden sparkles */}
          {goldProgress > 20 && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute w-1 h-1 rounded-full"
                  style={{
                    left: `${30 + Math.random() * 40}%`,
                    top: `${30 + Math.random() * 40}%`,
                    backgroundColor: `rgba(212, 175, 55, ${0.3 + Math.random() * 0.7})`,
                    boxShadow: "0 0 6px 2px rgba(212, 175, 55, 0.5)",
                    animation: `sparkle ${1 + Math.random() * 2}s ease-in-out ${Math.random() * 2}s infinite`,
                    opacity: Math.min((goldProgress - 20) / 30, 1),
                  }}
                />
              ))}
            </div>
          )}

          {/* Main logo composition */}
          <div className="relative flex flex-col items-center">
            {/* Dove (appears at start, descends) */}
            <div
              className="relative mb-4 transition-all"
              style={{
                transform: `translateY(${Math.max(0, 100 - goldProgress * 3)}px)`,
                opacity: Math.min(goldProgress / 20, 1),
              }}
            >
              <svg
                viewBox="0 0 80 60"
                className="w-20 h-16"
                style={{
                  filter: goldProgress > 80
                    ? "drop-shadow(0 0 12px rgba(212, 175, 55, 0.8))"
                    : "drop-shadow(0 0 8px rgba(255, 255, 255, 0.4))",
                }}
              >
                {/* Dove body */}
                <path
                  d="M40 45 C30 40, 15 30, 10 20 C8 15, 12 10, 18 12 C22 14, 25 18, 30 25 L40 35 L50 25 C55 18, 58 14, 62 12 C68 10, 72 15, 70 20 C65 30, 50 40, 40 45Z"
                  fill={goldProgress > 80 ? "url(#goldGradient)" : "white"}
                  className="transition-all duration-1000"
                />
                {/* Dove head */}
                <circle
                  cx="40"
                  cy="30"
                  r="5"
                  fill={goldProgress > 80 ? "url(#goldGradient)" : "white"}
                  className="transition-all duration-1000"
                />
                {/* Wing spread */}
                <path
                  d="M25 25 C15 15, 5 12, 2 15 C0 18, 8 22, 20 28Z"
                  fill={goldProgress > 80 ? "url(#goldGradient)" : "rgba(255,255,255,0.8)"}
                  className="transition-all duration-1000"
                  style={{
                    transform: goldProgress < 30 ? "rotate(-5deg)" : "rotate(0deg)",
                    transformOrigin: "25px 25px",
                  }}
                />
                <path
                  d="M55 25 C65 15, 75 12, 78 15 C80 18, 72 22, 60 28Z"
                  fill={goldProgress > 80 ? "url(#goldGradient)" : "rgba(255,255,255,0.8)"}
                  className="transition-all duration-1000"
                  style={{
                    transform: goldProgress < 30 ? "rotate(5deg)" : "rotate(0deg)",
                    transformOrigin: "55px 25px",
                  }}
                />
                <defs>
                  <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#D4AF37" />
                    <stop offset="50%" stopColor="#F5D76E" />
                    <stop offset="100%" stopColor="#B8860B" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            {/* Shield / VS Logo */}
            <div
              className="relative"
              style={{
                filter: goldProgress > 40
                  ? `drop-shadow(0 0 ${Math.min((goldProgress - 40) / 3, 20)}px rgba(212, 175, 55, ${
                      Math.min((goldProgress - 40) / 60, 0.8)
                    }))`
                  : "drop-shadow(0 0 4px rgba(200, 200, 220, 0.3))",
              }}
            >
              <svg viewBox="0 0 200 240" className="w-48 h-56">
                {/* Olive branches left */}
                <path
                  d="M30 180 C20 160, 15 140, 20 120 C25 100, 35 90, 45 85"
                  fill="none"
                  stroke={goldProgress > 55 ? "#D4AF37" : "#C0C0C8"}
                  strokeWidth="3"
                  className="transition-all duration-700"
                />
                {/* Left leaves */}
                {[120, 140, 160].map((y, i) => (
                  <ellipse
                    key={`ll${i}`}
                    cx={22 - i * 2}
                    cy={y}
                    rx="8"
                    ry="4"
                    fill={goldProgress > 55 + i * 5 ? "#D4AF37" : "#C0C0C8"}
                    transform={`rotate(-30 ${22 - i * 2} ${y})`}
                    className="transition-all duration-700"
                  />
                ))}

                {/* Olive branches right */}
                <path
                  d="M170 180 C180 160, 185 140, 180 120 C175 100, 165 90, 155 85"
                  fill="none"
                  stroke={goldProgress > 55 ? "#D4AF37" : "#C0C0C8"}
                  strokeWidth="3"
                  className="transition-all duration-700"
                />
                {/* Right leaves */}
                {[120, 140, 160].map((y, i) => (
                  <ellipse
                    key={`rl${i}`}
                    cx={178 + i * 2}
                    cy={y}
                    rx="8"
                    ry="4"
                    fill={goldProgress > 55 + i * 5 ? "#D4AF37" : "#C0C0C8"}
                    transform={`rotate(30 ${178 + i * 2} ${y})`}
                    className="transition-all duration-700"
                  />
                ))}

                {/* Bottom connection of branches */}
                <path
                  d="M30 180 C60 200, 80 210, 100 215 C120 210, 140 200, 170 180"
                  fill="none"
                  stroke={goldProgress > 65 ? "#D4AF37" : "#C0C0C8"}
                  strokeWidth="3"
                  className="transition-all duration-700"
                />

                {/* Shield crest */}
                <path
                  d="M100 20 L160 50 L160 120 C160 160, 130 185, 100 195 C70 185, 40 160, 40 120 L40 50 Z"
                  fill="none"
                  stroke={goldProgress > 40 ? "#D4AF37" : "#C0C0C8"}
                  strokeWidth="3"
                  className="transition-all duration-700"
                />
                <path
                  d="M100 25 L155 52 L155 118 C155 155, 128 180, 100 190 C72 180, 45 155, 45 118 L45 52 Z"
                  fill={goldProgress > 40 ? "rgba(212, 175, 55, 0.08)" : "rgba(192, 192, 200, 0.05)"}
                  className="transition-all duration-700"
                />

                {/* VS Monogram */}
                <text
                  x="100"
                  y="125"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="transition-all duration-700"
                  style={{
                    fontSize: "52px",
                    fontFamily: "'Playfair Display', 'Georgia', serif",
                    fontWeight: 700,
                    letterSpacing: "4px",
                    fill: goldProgress > 45 ? "#D4AF37" : "#C0C0C8",
                  }}
                >
                  VS
                </text>
              </svg>
            </div>

            {/* VIRELLE STUDIOS text */}
            <div
              className="mt-4 text-center transition-all duration-700"
              style={{
                opacity: Math.min(goldProgress / 30, 1),
              }}
            >
              <h1
                className="text-3xl md:text-4xl font-bold tracking-[0.3em] transition-all duration-700"
                style={{
                  fontFamily: "'Playfair Display', 'Georgia', serif",
                  color: goldProgress > 70 ? "#D4AF37" : "#C0C0C8",
                  textShadow: goldProgress > 70
                    ? "0 0 20px rgba(212, 175, 55, 0.5), 0 0 40px rgba(212, 175, 55, 0.2)"
                    : "none",
                }}
              >
                VIRELLE STUDIOS
              </h1>
              {goldProgress > 85 && (
                <p
                  className="text-sm tracking-[0.5em] mt-2 text-amber-400/60 animate-fade-in"
                  style={{ fontFamily: "'Playfair Display', 'Georgia', serif" }}
                >
                  WHERE VISION BECOMES FILM
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Skip button */}
      {showSkip && skippable && phase === "playing" && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleSkip();
          }}
          className="absolute bottom-8 right-8 text-white/40 hover:text-white/80 text-sm tracking-wider transition-all duration-300 flex items-center gap-2 group"
        >
          <span className="opacity-0 group-hover:opacity-100 transition-opacity">SKIP</span>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Loading state */}
      {phase === "loading" && (
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
        </div>
      )}

      {/* CSS Animations */}
      <style>{`
        @keyframes fogDrift {
          0%, 100% { transform: translateX(0) scale(1); }
          50% { transform: translateX(20px) scale(1.05); }
        }
        @keyframes sparkle {
          0%, 100% { opacity: 0; transform: scale(0); }
          50% { opacity: 1; transform: scale(1); }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 1s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
