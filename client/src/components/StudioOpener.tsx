import { useState, useEffect, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";

/**
 * StudioOpener — VirElle Studios cinematic opener
 *
 * Sequence:
 *  0.0s  — Black screen, letterbox bars slide in
 *  0.5s  — Fog / atmosphere builds
 *  1.0s  — Realistic dove flies in from above, wings beating
 *  2.8s  — Dove perches on top of shield, wings fold
 *  3.2s  — Metal shield reveals with VS monogram
 *  3.8s  — Olive branches unfurl left and right
 *  4.5s  — Gold transformation wave sweeps from dove → shield → branches
 *  5.8s  — "VIRELLE STUDIOS" fades in gold
 *  6.5s  — "WHERE VISION BECOMES FILM" appears
 *  8.0s  — Fade to black, onComplete fires
 */

type StudioOpenerProps = {
  onComplete: () => void;
  mode?: "login" | "film";
  skippable?: boolean;
};

// ─── Web Audio helpers ────────────────────────────────────────────────────────

function createAudioContext(): AudioContext | null {
  try {
    return new (window.AudioContext || (window as any).webkitAudioContext)();
  } catch {
    return null;
  }
}

/** Deep cinematic boom — low-frequency impact */
function playBoom(ctx: AudioContext, time: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 120;
  osc.type = "sine";
  osc.frequency.setValueAtTime(60, time);
  osc.frequency.exponentialRampToValueAtTime(20, time + 1.5);
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(0.7, time + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 2.0);
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  osc.start(time);
  osc.stop(time + 2.0);
}

/** Soft whoosh — dove descending */
function playWhoosh(ctx: AudioContext, time: number) {
  const bufferSize = ctx.sampleRate * 0.8;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(800, time);
  filter.frequency.exponentialRampToValueAtTime(200, time + 0.8);
  filter.Q.value = 0.8;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(0.25, time + 0.15);
  gain.gain.linearRampToValueAtTime(0, time + 0.8);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start(time);
}

/** Metallic shield reveal — resonant clang */
function playMetalReveal(ctx: AudioContext, time: number) {
  [220, 330, 440, 660].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.15 / (i + 1), time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 1.8);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(time);
    osc.stop(time + 1.8);
  });
}

/** Gold shimmer sweep — ascending harmonic chimes */
function playGoldShimmer(ctx: AudioContext, time: number) {
  const notes = [523, 659, 784, 1047, 1319, 1568, 2093];
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    const t = time + i * 0.09;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.12, t + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 1.2);
  });
}

/** Sustain resonance — final golden glow tone */
function playSustain(ctx: AudioContext, time: number) {
  [110, 165, 220].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.08 / (i + 1), time + 0.5);
    gain.gain.linearRampToValueAtTime(0.05 / (i + 1), time + 2.0);
    gain.gain.linearRampToValueAtTime(0, time + 3.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(time);
    osc.stop(time + 3.5);
  });
}

// ─── Easing functions ─────────────────────────────────────────────────────────
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOutCubic = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeOutElastic = (t: number) => {
  if (t === 0 || t === 1) return t;
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function StudioOpener({ onComplete, mode = "login", skippable = true }: StudioOpenerProps) {
  const [phase, setPhase] = useState<"loading" | "playing" | "fadeout">("loading");
  const [currentSceneIdx, setCurrentSceneIdx] = useState(0);
  const [showSkip, setShowSkip] = useState(false);

  // Animation state (driven by rAF)
  const [t, setT] = useState(0); // 0–8 seconds elapsed
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioFiredRef = useRef({ whoosh: false, metal: false, boom: false, shimmer: false, sustain: false });
  const videoRef = useRef<HTMLVideoElement>(null);

   const { data: opener, isLoading } = trpc.showcase.opener.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });
  const hasVideoScenes = opener?.scenes && opener.scenes.length > 0;

  // ── Official opener video state ──────────────────────────────────────────
  const [openerVideoReady, setOpenerVideoReady] = useState(false);
  const [openerVideoFailed, setOpenerVideoFailed] = useState(false);
  const openerVideoRef = useRef<HTMLVideoElement>(null);

  const handleOpenerVideoCanPlay = useCallback(() => {
    setOpenerVideoReady(true);
    setPhase("playing");
    openerVideoRef.current?.play().catch(() => {});
  }, []);

  const handleOpenerVideoEnded = useCallback(() => {
    setPhase("fadeout");
    setTimeout(onComplete, 800);
  }, [onComplete]);

  const handleOpenerVideoError = useCallback(() => {
    setOpenerVideoFailed(true);
  }, []);

  // Use official video unless it fails to load
  const useOfficialVideo = !openerVideoFailed;
  // Only fall through to SVG animation if official video failed AND no showcase scenes
  const useSVGAnimation = openerVideoFailed && !hasVideoScenes;

  useEffect(() => {
    if (!skippable) return;
    const timer = setTimeout(() => setShowSkip(true), 2000);
    return () => clearTimeout(timer);
  }, [skippable]);

  const handleSkip = useCallback(() => {
    setPhase("fadeout");
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setTimeout(onComplete, 600);
  }, [onComplete]);

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

  // rAF animation loop
  useEffect(() => {
    // Only run SVG animation if official video failed AND no showcase scenes
    if (!openerVideoFailed || isLoading || hasVideoScenes) return;
    setPhase("playing");
    startTimeRef.current = performance.now();
    audioCtxRef.current = createAudioContext();

    const TOTAL = 8000; // ms

    const tick = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const tSec = elapsed / 1000;
      setT(tSec);

      // Fire audio cues
      const ctx = audioCtxRef.current;
      if (ctx) {
        const ct = ctx.currentTime;
        if (!audioFiredRef.current.whoosh && tSec >= 0.8) {
          audioFiredRef.current.whoosh = true;
          playWhoosh(ctx, ct);
        }
        if (!audioFiredRef.current.metal && tSec >= 3.2) {
          audioFiredRef.current.metal = true;
          playMetalReveal(ctx, ct);
          playBoom(ctx, ct);
        }
        if (!audioFiredRef.current.shimmer && tSec >= 4.5) {
          audioFiredRef.current.shimmer = true;
          playGoldShimmer(ctx, ct);
        }
        if (!audioFiredRef.current.sustain && tSec >= 5.8) {
          audioFiredRef.current.sustain = true;
          playSustain(ctx, ct);
        }
      }

      if (elapsed < TOTAL) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setPhase("fadeout");
        setTimeout(onComplete, 800);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isLoading, hasVideoScenes, onComplete]);

  // Video scene playback
  const handleVideoEnd = useCallback(() => {
    if (!opener?.scenes) return;
    const nextIdx = currentSceneIdx + 1;
    if (nextIdx < opener.scenes.length) {
      setCurrentSceneIdx(nextIdx);
    } else {
      setPhase("fadeout");
      setTimeout(onComplete, 600);
    }
  }, [currentSceneIdx, opener, onComplete]);

  useEffect(() => {
    if (videoRef.current && hasVideoScenes) {
      videoRef.current.play().catch(() => {});
    }
  }, [currentSceneIdx, hasVideoScenes]);

  const currentScene = hasVideoScenes ? opener.scenes[currentSceneIdx] : null;

  // ── Derived animation values from t (seconds) ──────────────────────────────

  // Letterbox bars: slide in 0→0.4s, stay, slide out 0.4→0.8s
  const letterboxOpacity = t < 0.3 ? easeOutCubic(t / 0.3) : t < 7.5 ? 1 : Math.max(0, 1 - (t - 7.5) / 0.5);

  // Fog atmosphere: fades in 0.3→1.5s
  const fogOpacity = t < 0.3 ? 0 : Math.min(easeOutCubic((t - 0.3) / 1.2) * 0.35, 0.35);

  // Dove flight: enters from top at t=0.8, arrives at perch at t=2.8
  const doveFlightProgress = t < 0.8 ? 0 : t < 2.8 ? easeOutCubic((t - 0.8) / 2.0) : 1;
  // Dove Y: starts at -160px (above), ends at -130px (perched on shield top)
  const doveY = -160 + doveFlightProgress * 30; // -160 → -130
  const doveOpacity = t < 0.8 ? 0 : Math.min((t - 0.8) / 0.4, 1);
  // Wing beat: flap while flying, fold when perched
  const isPerched = t >= 2.8;
  const wingBeat = isPerched ? 0 : Math.sin(t * 8) * 0.3 + 0.3; // 0=folded, 0.6=spread
  const wingFoldProgress = t < 2.8 ? 0 : Math.min(easeOutElastic((t - 2.8) / 0.8), 1);

  // Shield reveal: t=3.2→4.0
  const shieldProgress = t < 3.2 ? 0 : Math.min(easeOutCubic((t - 3.2) / 0.8), 1);

  // Olive branches unfurl: t=3.8→4.8
  const branchProgress = t < 3.8 ? 0 : Math.min(easeOutCubic((t - 3.8) / 1.0), 1);

  // Gold transformation wave: t=4.5→6.0
  const goldWave = t < 4.5 ? 0 : Math.min(easeInOutCubic((t - 4.5) / 1.5), 1);

  // Gold shimmer sweep (horizontal)
  const shimmerX = t < 4.5 ? -100 : Math.min(((t - 4.5) / 1.5) * 300, 300);

  // Text reveal: t=5.8→6.5
  const textOpacity = t < 5.8 ? 0 : Math.min(easeOutCubic((t - 5.8) / 0.7), 1);
  const taglineOpacity = t < 6.5 ? 0 : Math.min(easeOutCubic((t - 6.5) / 0.5), 1);

  // Gold colours
  const goldColor = (opacity = 1) => `rgba(212, 175, 55, ${opacity})`;
  const goldGlow = (intensity: number) =>
    `drop-shadow(0 0 ${8 * intensity}px rgba(212,175,55,${0.9 * intensity})) drop-shadow(0 0 ${24 * intensity}px rgba(212,175,55,${0.5 * intensity})) drop-shadow(0 0 ${48 * intensity}px rgba(212,175,55,${0.25 * intensity}))`;

  // Interpolate colour: silver → gold
  const lerpColor = (progress: number, silverAlpha = 1) => {
    const g = Math.min(progress, 1);
    if (g >= 1) return `rgba(212, 175, 55, ${silverAlpha})`;
    // Silver: rgb(192,192,200) → Gold: rgb(212,175,55)
    const r = Math.round(192 + (212 - 192) * g);
    const gr = Math.round(192 + (175 - 192) * g);
    const b = Math.round(200 + (55 - 200) * g);
    return `rgba(${r},${gr},${b},${silverAlpha})`;
  };

  // Particle system (gold dust)
  const particles = Array.from({ length: 40 }, (_, i) => {
    const seed = (i * 137.508) % 1;
    const seed2 = (i * 97.3) % 1;
    const seed3 = (i * 53.7) % 1;
    return {
      x: 30 + seed * 40,
      y: 20 + seed2 * 60,
      size: 1 + seed3 * 2.5,
      delay: seed * 1.5,
      speed: 0.8 + seed2 * 1.2,
    };
  });

  return (
    <div
      className={`fixed inset-0 z-[9999] bg-black flex items-center justify-center overflow-hidden transition-opacity duration-700 ${
        phase === "fadeout" ? "opacity-0" : "opacity-100"
      }`}
      onClick={skippable ? handleSkip : undefined}
      style={{ cursor: skippable ? "pointer" : "default" }}
    >
      {/* ── Official opener video (primary) ── */}
      {useOfficialVideo && (
        <video
          ref={openerVideoRef}
          src="/virelle-opener.mp4"
          className="w-full h-full object-cover"
          playsInline
          preload="auto"
          muted={false}
          onCanPlay={handleOpenerVideoCanPlay}
          onEnded={handleOpenerVideoEnded}
          onError={handleOpenerVideoError}
          style={{ display: openerVideoReady ? "block" : "none" }}
        />
      )}
      {/* ── Showcase scene video mode (secondary) ── */}
      {openerVideoFailed && hasVideoScenes && currentScene && (
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
      {/* ── SVG animated fallback (tertiary — only if both videos fail) ── */}
      {useSVGAnimation && phase === "playing" && ((
        <div className="relative w-full h-full flex items-center justify-center select-none">

          {/* Letterbox bars */}
          <div
            className="absolute top-0 left-0 right-0 h-[8vh] bg-black z-10 pointer-events-none"
            style={{ opacity: letterboxOpacity }}
          />
          <div
            className="absolute bottom-0 left-0 right-0 h-[8vh] bg-black z-10 pointer-events-none"
            style={{ opacity: letterboxOpacity }}
          />

          {/* Atmospheric fog */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              opacity: fogOpacity,
              background: `
                radial-gradient(ellipse 80% 60% at 50% 60%, rgba(60,70,120,0.5) 0%, transparent 70%),
                radial-gradient(ellipse 50% 40% at 30% 40%, rgba(40,50,100,0.3) 0%, transparent 60%),
                radial-gradient(ellipse 50% 40% at 70% 45%, rgba(40,50,100,0.3) 0%, transparent 60%)
              `,
            }}
          />

          {/* Gold radial glow (appears with gold wave) */}
          {goldWave > 0 && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                opacity: goldWave * 0.5,
                background: `radial-gradient(ellipse 60% 70% at 50% 45%, rgba(212,175,55,0.25) 0%, transparent 70%)`,
              }}
            />
          )}

          {/* Gold dust particles */}
          {goldWave > 0.1 && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {particles.map((p, i) => {
                const pAge = Math.max(0, goldWave - p.delay / 4);
                if (pAge <= 0) return null;
                const py = p.y - pAge * p.speed * 25;
                const opacity = Math.min(pAge * 3, 1) * Math.max(0, 1 - pAge * 0.8);
                return (
                  <div
                    key={i}
                    className="absolute rounded-full"
                    style={{
                      left: `${p.x}%`,
                      top: `${py}%`,
                      width: `${p.size}px`,
                      height: `${p.size}px`,
                      backgroundColor: goldColor(opacity),
                      boxShadow: `0 0 ${p.size * 3}px ${goldColor(opacity * 0.6)}`,
                    }}
                  />
                );
              })}
            </div>
          )}

          {/* ── Main logo composition ── */}
          <div className="relative flex flex-col items-center" style={{ marginTop: "-20px" }}>

            {/* SVG defs (gradients, filters) */}
            <svg width="0" height="0" style={{ position: "absolute" }}>
              <defs>
                {/* Gold gradient */}
                <linearGradient id="vsGold" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#B8860B" />
                  <stop offset="25%" stopColor="#D4AF37" />
                  <stop offset="50%" stopColor="#F5E070" />
                  <stop offset="75%" stopColor="#D4AF37" />
                  <stop offset="100%" stopColor="#8B6914" />
                </linearGradient>
                {/* Silver/steel gradient */}
                <linearGradient id="vsSilver" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#8a8a9a" />
                  <stop offset="30%" stopColor="#d0d0e0" />
                  <stop offset="50%" stopColor="#f0f0f8" />
                  <stop offset="70%" stopColor="#c0c0d0" />
                  <stop offset="100%" stopColor="#7a7a8a" />
                </linearGradient>
                {/* Metal shield gradient */}
                <linearGradient id="vsShieldMetal" x1="10%" y1="0%" x2="90%" y2="100%">
                  <stop offset="0%" stopColor="#4a4a5a" />
                  <stop offset="20%" stopColor="#9a9ab0" />
                  <stop offset="40%" stopColor="#d8d8f0" />
                  <stop offset="60%" stopColor="#a0a0b8" />
                  <stop offset="80%" stopColor="#606070" />
                  <stop offset="100%" stopColor="#303040" />
                </linearGradient>
                {/* Gold shield gradient */}
                <linearGradient id="vsShieldGold" x1="10%" y1="0%" x2="90%" y2="100%">
                  <stop offset="0%" stopColor="#5a3e00" />
                  <stop offset="20%" stopColor="#c8960c" />
                  <stop offset="40%" stopColor="#f5d76e" />
                  <stop offset="60%" stopColor="#d4af37" />
                  <stop offset="80%" stopColor="#8b6914" />
                  <stop offset="100%" stopColor="#3a2800" />
                </linearGradient>
                {/* Shimmer sweep */}
                <linearGradient id="vsShimmer" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgba(255,255,255,0)" />
                  <stop offset="45%" stopColor="rgba(255,255,255,0)" />
                  <stop offset="50%" stopColor="rgba(255,255,255,0.35)" />
                  <stop offset="55%" stopColor="rgba(255,255,255,0)" />
                  <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                </linearGradient>
                {/* Dove feather gradient */}
                <linearGradient id="vsDoveWhite" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="60%" stopColor="#e8e8f0" />
                  <stop offset="100%" stopColor="#c8c8d8" />
                </linearGradient>
                <linearGradient id="vsDoveGold" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#F5E070" />
                  <stop offset="50%" stopColor="#D4AF37" />
                  <stop offset="100%" stopColor="#8B6914" />
                </linearGradient>
                {/* Drop shadow filter */}
                <filter id="vsShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="rgba(0,0,0,0.6)" />
                </filter>
                <filter id="vsGoldGlow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feFlood floodColor="rgba(212,175,55,0.6)" result="color" />
                  <feComposite in="color" in2="blur" operator="in" result="glow" />
                  <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
            </svg>

            {/* ── DOVE ── */}
            <div
              className="absolute pointer-events-none"
              style={{
                top: 0,
                left: "50%",
                transform: `translateX(-50%) translateY(${doveY}px)`,
                opacity: doveOpacity,
                zIndex: 10,
                filter: goldWave > 0.6 ? goldGlow(Math.min((goldWave - 0.6) / 0.4, 1)) : "drop-shadow(0 2px 8px rgba(255,255,255,0.3))",
              }}
            >
              <svg viewBox="0 0 120 90" width="110" height="82">
                {/* ── Left wing ── */}
                <g
                  style={{
                    transformOrigin: "60px 50px",
                    transform: isPerched
                      ? `rotate(${-15 + wingFoldProgress * 15}deg) scaleY(${1 - wingFoldProgress * 0.3})`
                      : `rotate(${-20 - wingBeat * 25}deg)`,
                    transition: isPerched ? "transform 0.4s ease-out" : "none",
                  }}
                >
                  {/* Primary flight feathers */}
                  <path d="M60 50 C45 42, 28 35, 12 32 C8 31, 5 33, 7 36 C10 40, 22 44, 38 48 C48 51, 56 52, 60 52Z"
                    fill={goldWave > 0.3 ? "url(#vsDoveGold)" : "url(#vsDoveWhite)"}
                    style={{ transition: "fill 0.5s" }}
                  />
                  {/* Secondary feathers */}
                  <path d="M60 50 C50 40, 36 30, 22 24 C16 21, 12 23, 14 27 C17 32, 30 38, 46 45Z"
                    fill={goldWave > 0.35 ? "url(#vsDoveGold)" : "url(#vsDoveWhite)"}
                    opacity="0.85"
                    style={{ transition: "fill 0.5s" }}
                  />
                  {/* Tertiary / coverts */}
                  <path d="M60 50 C52 44, 42 38, 32 34 C26 31, 22 33, 24 37 C27 41, 38 45, 52 49Z"
                    fill={goldWave > 0.4 ? "url(#vsDoveGold)" : "url(#vsDoveWhite)"}
                    opacity="0.7"
                    style={{ transition: "fill 0.5s" }}
                  />
                  {/* Feather detail lines */}
                  {[0, 1, 2, 3].map(i => (
                    <line key={i}
                      x1={60 - i * 3} y1={50 + i * 0.5}
                      x2={14 + i * 8} y2={34 + i * 3}
                      stroke={goldWave > 0.4 ? "rgba(180,140,20,0.4)" : "rgba(180,180,200,0.4)"}
                      strokeWidth="0.5"
                    />
                  ))}
                </g>

                {/* ── Right wing ── */}
                <g
                  style={{
                    transformOrigin: "60px 50px",
                    transform: isPerched
                      ? `rotate(${15 - wingFoldProgress * 15}deg) scaleY(${1 - wingFoldProgress * 0.3})`
                      : `rotate(${20 + wingBeat * 25}deg)`,
                    transition: isPerched ? "transform 0.4s ease-out" : "none",
                  }}
                >
                  <path d="M60 50 C75 42, 92 35, 108 32 C112 31, 115 33, 113 36 C110 40, 98 44, 82 48 C72 51, 64 52, 60 52Z"
                    fill={goldWave > 0.3 ? "url(#vsDoveGold)" : "url(#vsDoveWhite)"}
                    style={{ transition: "fill 0.5s" }}
                  />
                  <path d="M60 50 C70 40, 84 30, 98 24 C104 21, 108 23, 106 27 C103 32, 90 38, 74 45Z"
                    fill={goldWave > 0.35 ? "url(#vsDoveGold)" : "url(#vsDoveWhite)"}
                    opacity="0.85"
                    style={{ transition: "fill 0.5s" }}
                  />
                  <path d="M60 50 C68 44, 78 38, 88 34 C94 31, 98 33, 96 37 C93 41, 82 45, 68 49Z"
                    fill={goldWave > 0.4 ? "url(#vsDoveGold)" : "url(#vsDoveWhite)"}
                    opacity="0.7"
                    style={{ transition: "fill 0.5s" }}
                  />
                  {[0, 1, 2, 3].map(i => (
                    <line key={i}
                      x1={60 + i * 3} y1={50 + i * 0.5}
                      x2={106 - i * 8} y2={34 + i * 3}
                      stroke={goldWave > 0.4 ? "rgba(180,140,20,0.4)" : "rgba(180,180,200,0.4)"}
                      strokeWidth="0.5"
                    />
                  ))}
                </g>

                {/* ── Body ── */}
                <ellipse cx="60" cy="52" rx="14" ry="10"
                  fill={goldWave > 0.5 ? "url(#vsDoveGold)" : "url(#vsDoveWhite)"}
                  filter="url(#vsShadow)"
                  style={{ transition: "fill 0.5s" }}
                />
                {/* Breast */}
                <ellipse cx="60" cy="56" rx="10" ry="7"
                  fill={goldWave > 0.5 ? "#D4AF37" : "#f0f0f8"}
                  opacity="0.9"
                  style={{ transition: "fill 0.5s" }}
                />

                {/* ── Head ── */}
                <circle cx="60" cy="38" r="9"
                  fill={goldWave > 0.5 ? "url(#vsDoveGold)" : "url(#vsDoveWhite)"}
                  filter="url(#vsShadow)"
                  style={{ transition: "fill 0.5s" }}
                />
                {/* Neck */}
                <ellipse cx="60" cy="46" rx="7" ry="6"
                  fill={goldWave > 0.5 ? "url(#vsDoveGold)" : "url(#vsDoveWhite)"}
                  style={{ transition: "fill 0.5s" }}
                />
                {/* Eye */}
                <circle cx="63" cy="36" r="2.5" fill={goldWave > 0.7 ? "#8B6914" : "#1a1a2e"} style={{ transition: "fill 0.5s" }} />
                <circle cx="63.5" cy="35.5" r="0.8" fill="white" opacity="0.9" />
                {/* Beak */}
                <path d="M68 38 L74 37 L68 40Z"
                  fill={goldWave > 0.6 ? "#c8960c" : "#e8c080"}
                  style={{ transition: "fill 0.5s" }}
                />
                {/* Beak ridge */}
                <line x1="68" y1="38" x2="74" y2="37" stroke={goldWave > 0.6 ? "#8B6914" : "#c0a060"} strokeWidth="0.5" />

                {/* ── Tail feathers ── */}
                <path d="M52 60 C46 68, 42 74, 44 78 C46 80, 50 76, 54 70 L60 62Z"
                  fill={goldWave > 0.45 ? "url(#vsDoveGold)" : "url(#vsDoveWhite)"}
                  opacity="0.85"
                  style={{ transition: "fill 0.5s" }}
                />
                <path d="M60 62 L60 78 C60 81, 62 81, 62 78 L62 62Z"
                  fill={goldWave > 0.45 ? "url(#vsDoveGold)" : "url(#vsDoveWhite)"}
                  style={{ transition: "fill 0.5s" }}
                />
                <path d="M68 60 C74 68, 78 74, 76 78 C74 80, 70 76, 66 70 L60 62Z"
                  fill={goldWave > 0.45 ? "url(#vsDoveGold)" : "url(#vsDoveWhite)"}
                  opacity="0.85"
                  style={{ transition: "fill 0.5s" }}
                />

                {/* ── Feet / talons (visible when perched) ── */}
                {isPerched && (
                  <g opacity={Math.min(wingFoldProgress * 2, 1)}>
                    <line x1="56" y1="62" x2="52" y2="70" stroke={goldWave > 0.7 ? "#c8960c" : "#e8c080"} strokeWidth="1.5" strokeLinecap="round" />
                    <line x1="52" y1="70" x2="48" y2="73" stroke={goldWave > 0.7 ? "#c8960c" : "#e8c080"} strokeWidth="1" strokeLinecap="round" />
                    <line x1="52" y1="70" x2="52" y2="75" stroke={goldWave > 0.7 ? "#c8960c" : "#e8c080"} strokeWidth="1" strokeLinecap="round" />
                    <line x1="52" y1="70" x2="56" y2="74" stroke={goldWave > 0.7 ? "#c8960c" : "#e8c080"} strokeWidth="1" strokeLinecap="round" />
                    <line x1="64" y1="62" x2="68" y2="70" stroke={goldWave > 0.7 ? "#c8960c" : "#e8c080"} strokeWidth="1.5" strokeLinecap="round" />
                    <line x1="68" y1="70" x2="72" y2="73" stroke={goldWave > 0.7 ? "#c8960c" : "#e8c080"} strokeWidth="1" strokeLinecap="round" />
                    <line x1="68" y1="70" x2="68" y2="75" stroke={goldWave > 0.7 ? "#c8960c" : "#e8c080"} strokeWidth="1" strokeLinecap="round" />
                    <line x1="68" y1="70" x2="64" y2="74" stroke={goldWave > 0.7 ? "#c8960c" : "#e8c080"} strokeWidth="1" strokeLinecap="round" />
                  </g>
                )}
              </svg>
            </div>

            {/* ── SHIELD + OLIVE BRANCHES ── */}
            <div
              style={{
                opacity: shieldProgress,
                transform: `scale(${0.85 + shieldProgress * 0.15})`,
                filter: goldWave > 0.2 ? goldGlow(Math.min((goldWave - 0.2) / 0.8, 1) * 0.8) : "drop-shadow(0 4px 16px rgba(0,0,0,0.8))",
                marginTop: "60px",
              }}
            >
              <svg viewBox="0 0 280 300" width="260" height="278">

                {/* ── Olive branch LEFT ── */}
                <g opacity={branchProgress} style={{ transformOrigin: "100px 220px", transform: `scale(${branchProgress})` }}>
                  {/* Main stem */}
                  <path
                    d="M100 220 C85 205, 72 188, 62 170 C52 152, 46 132, 44 112 C42 95, 46 82, 52 72"
                    fill="none"
                    stroke={goldWave > 0.7 ? "#8B6914" : "#4a6a2a"}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    style={{ transition: "stroke 0.5s" }}
                  />
                  {/* Sub-stems */}
                  <path d="M62 170 C55 165, 46 162, 38 164" fill="none" stroke={goldWave > 0.7 ? "#8B6914" : "#4a6a2a"} strokeWidth="2" strokeLinecap="round" style={{ transition: "stroke 0.5s" }} />
                  <path d="M72 150 C64 143, 55 140, 46 142" fill="none" stroke={goldWave > 0.7 ? "#8B6914" : "#4a6a2a"} strokeWidth="2" strokeLinecap="round" style={{ transition: "stroke 0.5s" }} />
                  <path d="M80 130 C72 122, 64 118, 55 120" fill="none" stroke={goldWave > 0.7 ? "#8B6914" : "#4a6a2a"} strokeWidth="2" strokeLinecap="round" style={{ transition: "stroke 0.5s" }} />
                  <path d="M86 110 C80 102, 72 98, 64 100" fill="none" stroke={goldWave > 0.7 ? "#8B6914" : "#4a6a2a"} strokeWidth="2" strokeLinecap="round" style={{ transition: "stroke 0.5s" }} />
                  <path d="M90 90 C84 82, 76 78, 68 80" fill="none" stroke={goldWave > 0.7 ? "#8B6914" : "#4a6a2a"} strokeWidth="1.5" strokeLinecap="round" style={{ transition: "stroke 0.5s" }} />

                  {/* Leaves — each is a realistic ellipse with midrib */}
                  {[
                    { cx: 34, cy: 162, rx: 11, ry: 5, rot: -35 },
                    { cx: 42, cy: 140, rx: 12, ry: 5, rot: -42 },
                    { cx: 50, cy: 118, rx: 12, ry: 5, rot: -48 },
                    { cx: 58, cy: 98, rx: 11, ry: 5, rot: -52 },
                    { cx: 64, cy: 78, rx: 10, ry: 4, rot: -55 },
                    // upper side leaves
                    { cx: 68, cy: 158, rx: 9, ry: 4, rot: -20 },
                    { cx: 76, cy: 138, rx: 10, ry: 4, rot: -25 },
                    { cx: 82, cy: 118, rx: 10, ry: 4, rot: -28 },
                    { cx: 88, cy: 98, rx: 9, ry: 4, rot: -30 },
                  ].map((leaf, i) => (
                    <g key={i} transform={`rotate(${leaf.rot} ${leaf.cx} ${leaf.cy})`}>
                      <ellipse
                        cx={leaf.cx} cy={leaf.cy}
                        rx={leaf.rx} ry={leaf.ry}
                        fill={goldWave > 0.65 + i * 0.01 ? "#c8960c" : "#3a7a20"}
                        style={{ transition: "fill 0.5s" }}
                      />
                      <line
                        x1={leaf.cx - leaf.rx * 0.8} y1={leaf.cy}
                        x2={leaf.cx + leaf.rx * 0.8} y2={leaf.cy}
                        stroke={goldWave > 0.7 ? "rgba(180,130,10,0.5)" : "rgba(20,60,10,0.4)"}
                        strokeWidth="0.7"
                      />
                    </g>
                  ))}

                  {/* Olive berries */}
                  {[
                    { cx: 56, cy: 104, r: 3.5 },
                    { cx: 64, cy: 84, r: 3 },
                    { cx: 72, cy: 126, r: 3.5 },
                    { cx: 80, cy: 106, r: 3 },
                  ].map((berry, i) => (
                    <circle key={i}
                      cx={berry.cx} cy={berry.cy} r={berry.r}
                      fill={goldWave > 0.7 ? "#D4AF37" : "#2a5a18"}
                      style={{ transition: "fill 0.5s" }}
                    />
                  ))}
                </g>

                {/* ── Olive branch RIGHT (mirrored) ── */}
                <g opacity={branchProgress} style={{ transformOrigin: "180px 220px", transform: `scale(${branchProgress})` }}>
                  <path
                    d="M180 220 C195 205, 208 188, 218 170 C228 152, 234 132, 236 112 C238 95, 234 82, 228 72"
                    fill="none"
                    stroke={goldWave > 0.7 ? "#8B6914" : "#4a6a2a"}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    style={{ transition: "stroke 0.5s" }}
                  />
                  <path d="M218 170 C225 165, 234 162, 242 164" fill="none" stroke={goldWave > 0.7 ? "#8B6914" : "#4a6a2a"} strokeWidth="2" strokeLinecap="round" style={{ transition: "stroke 0.5s" }} />
                  <path d="M208 150 C216 143, 225 140, 234 142" fill="none" stroke={goldWave > 0.7 ? "#8B6914" : "#4a6a2a"} strokeWidth="2" strokeLinecap="round" style={{ transition: "stroke 0.5s" }} />
                  <path d="M200 130 C208 122, 216 118, 225 120" fill="none" stroke={goldWave > 0.7 ? "#8B6914" : "#4a6a2a"} strokeWidth="2" strokeLinecap="round" style={{ transition: "stroke 0.5s" }} />
                  <path d="M194 110 C200 102, 208 98, 216 100" fill="none" stroke={goldWave > 0.7 ? "#8B6914" : "#4a6a2a"} strokeWidth="2" strokeLinecap="round" style={{ transition: "stroke 0.5s" }} />
                  <path d="M190 90 C196 82, 204 78, 212 80" fill="none" stroke={goldWave > 0.7 ? "#8B6914" : "#4a6a2a"} strokeWidth="1.5" strokeLinecap="round" style={{ transition: "stroke 0.5s" }} />

                  {[
                    { cx: 246, cy: 162, rx: 11, ry: 5, rot: 35 },
                    { cx: 238, cy: 140, rx: 12, ry: 5, rot: 42 },
                    { cx: 230, cy: 118, rx: 12, ry: 5, rot: 48 },
                    { cx: 222, cy: 98, rx: 11, ry: 5, rot: 52 },
                    { cx: 216, cy: 78, rx: 10, ry: 4, rot: 55 },
                    { cx: 212, cy: 158, rx: 9, ry: 4, rot: 20 },
                    { cx: 204, cy: 138, rx: 10, ry: 4, rot: 25 },
                    { cx: 198, cy: 118, rx: 10, ry: 4, rot: 28 },
                    { cx: 192, cy: 98, rx: 9, ry: 4, rot: 30 },
                  ].map((leaf, i) => (
                    <g key={i} transform={`rotate(${leaf.rot} ${leaf.cx} ${leaf.cy})`}>
                      <ellipse
                        cx={leaf.cx} cy={leaf.cy}
                        rx={leaf.rx} ry={leaf.ry}
                        fill={goldWave > 0.65 + i * 0.01 ? "#c8960c" : "#3a7a20"}
                        style={{ transition: "fill 0.5s" }}
                      />
                      <line
                        x1={leaf.cx - leaf.rx * 0.8} y1={leaf.cy}
                        x2={leaf.cx + leaf.rx * 0.8} y2={leaf.cy}
                        stroke={goldWave > 0.7 ? "rgba(180,130,10,0.5)" : "rgba(20,60,10,0.4)"}
                        strokeWidth="0.7"
                      />
                    </g>
                  ))}

                  {[
                    { cx: 224, cy: 104, r: 3.5 },
                    { cx: 216, cy: 84, r: 3 },
                    { cx: 208, cy: 126, r: 3.5 },
                    { cx: 200, cy: 106, r: 3 },
                  ].map((berry, i) => (
                    <circle key={i}
                      cx={berry.cx} cy={berry.cy} r={berry.r}
                      fill={goldWave > 0.7 ? "#D4AF37" : "#2a5a18"}
                      style={{ transition: "fill 0.5s" }}
                    />
                  ))}
                </g>

                {/* ── Bottom branch connection ── */}
                <path
                  d="M100 220 C120 232, 140 237, 140 240 C140 237, 160 232, 180 220"
                  fill="none"
                  stroke={goldWave > 0.7 ? "#8B6914" : "#4a6a2a"}
                  strokeWidth="3"
                  strokeLinecap="round"
                  opacity={branchProgress}
                  style={{ transition: "stroke 0.5s" }}
                />

                {/* ── SHIELD ── */}
                {/* Outer shield shadow */}
                <path
                  d="M140 18 L218 52 L218 138 C218 182, 184 210, 140 224 C96 210, 62 182, 62 138 L62 52 Z"
                  fill="rgba(0,0,0,0.4)"
                  transform="translate(4,6)"
                />
                {/* Shield outer border */}
                <path
                  d="M140 18 L218 52 L218 138 C218 182, 184 210, 140 224 C96 210, 62 182, 62 138 L62 52 Z"
                  fill={goldWave > 0.3 ? "url(#vsShieldGold)" : "url(#vsShieldMetal)"}
                  style={{ transition: "fill 0.8s" }}
                />
                {/* Shield inner bevel (lighter) */}
                <path
                  d="M140 26 L212 57 L212 136 C212 176, 180 202, 140 215 C100 202, 68 176, 68 136 L68 57 Z"
                  fill={goldWave > 0.35 ? "rgba(212,175,55,0.15)" : "rgba(200,210,240,0.12)"}
                  style={{ transition: "fill 0.8s" }}
                />
                {/* Shield inner face */}
                <path
                  d="M140 30 L208 60 L208 135 C208 173, 178 198, 140 210 C102 198, 72 173, 72 135 L72 60 Z"
                  fill={goldWave > 0.4 ? "rgba(90,60,0,0.85)" : "rgba(20,22,40,0.85)"}
                  style={{ transition: "fill 0.8s" }}
                />

                {/* Shield highlight (top-left specular) */}
                <path
                  d="M140 30 L208 60 L208 90 C180 75, 155 65, 140 62 C125 65, 100 75, 72 90 L72 60 Z"
                  fill={goldWave > 0.4 ? "rgba(255,220,100,0.08)" : "rgba(255,255,255,0.06)"}
                  style={{ transition: "fill 0.8s" }}
                />

                {/* Shield rivets */}
                {[
                  { cx: 75, cy: 65 }, { cx: 205, cy: 65 },
                  { cx: 70, cy: 120 }, { cx: 210, cy: 120 },
                ].map((rivet, i) => (
                  <circle key={i}
                    cx={rivet.cx} cy={rivet.cy} r="4"
                    fill={goldWave > 0.4 ? "#c8960c" : "#8a8aaa"}
                    style={{ transition: "fill 0.5s" }}
                  />
                ))}

                {/* ── VS Monogram ── */}
                <text
                  x="140"
                  y="148"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  style={{
                    fontSize: "68px",
                    fontFamily: "'Playfair Display', 'Trajan Pro', 'Georgia', serif",
                    fontWeight: 700,
                    letterSpacing: "6px",
                    fill: goldWave > 0.5 ? "url(#vsGold)" : "url(#vsSilver)",
                    filter: goldWave > 0.5 ? "drop-shadow(0 0 8px rgba(212,175,55,0.6))" : "none",
                    transition: "filter 0.5s",
                  }}
                >
                  VS
                </text>

                {/* Shimmer sweep over shield */}
                {goldWave > 0 && goldWave < 1 && (
                  <path
                    d="M140 30 L208 60 L208 135 C208 173, 178 198, 140 210 C102 198, 72 173, 72 135 L72 60 Z"
                    fill="url(#vsShimmer)"
                    style={{
                      transform: `translateX(${shimmerX - 140}px)`,
                    }}
                  />
                )}
              </svg>
            </div>

            {/* ── VIRELLE STUDIOS text ── */}
            <div
              className="text-center mt-6"
              style={{ opacity: textOpacity }}
            >
              <h1
                style={{
                  fontFamily: "'Playfair Display', 'Trajan Pro', 'Georgia', serif",
                  fontSize: "clamp(1.6rem, 4vw, 2.4rem)",
                  fontWeight: 700,
                  letterSpacing: "0.35em",
                  color: "#D4AF37",
                  textShadow: `0 0 20px rgba(212,175,55,0.6), 0 0 40px rgba(212,175,55,0.3), 0 2px 4px rgba(0,0,0,0.8)`,
                  margin: 0,
                  lineHeight: 1,
                }}
              >
                VIRELLE STUDIOS
              </h1>
              <div
                style={{
                  opacity: taglineOpacity,
                  marginTop: "10px",
                }}
              >
                <p
                  style={{
                    fontFamily: "'Playfair Display', 'Georgia', serif",
                    fontSize: "clamp(0.55rem, 1.4vw, 0.75rem)",
                    letterSpacing: "0.55em",
                    color: "rgba(212,175,55,0.65)",
                    margin: 0,
                    textTransform: "uppercase",
                  }}
                >
                  WHERE VISION BECOMES FILM
                </p>
              </div>
            </div>

          </div>{/* end logo composition */}
        </div>
      )}

      {/* ── Skip button ── */}
      {showSkip && skippable && phase === "playing" && (
        <button
          onClick={(e) => { e.stopPropagation(); handleSkip(); }}
          className="absolute bottom-8 right-8 flex items-center gap-2 group"
          style={{
            color: "rgba(212,175,55,0.4)",
            fontSize: "0.75rem",
            letterSpacing: "0.2em",
            background: "none",
            border: "none",
            cursor: "pointer",
            transition: "color 0.3s",
          }}
          onMouseEnter={e => (e.currentTarget.style.color = "rgba(212,175,55,0.9)")}
          onMouseLeave={e => (e.currentTarget.style.color = "rgba(212,175,55,0.4)")}
        >
          <span>SKIP</span>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* ── Loading spinner ── */}
      {phase === "loading" && (
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-8 h-8 rounded-full border-2 animate-spin"
            style={{ borderColor: "rgba(212,175,55,0.2)", borderTopColor: "rgba(212,175,55,0.8)" }}
          />
        </div>
      )}
    </div>
  );
}
