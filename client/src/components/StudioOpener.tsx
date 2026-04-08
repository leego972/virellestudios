import { useState, useEffect, useRef, useCallback } from "react";

// Default export alias so both import styles work
export default function StudioOpenerDefault(props: Parameters<typeof StudioOpener>[0]) {
  return StudioOpener(props);
}

/**
 * StudioOpener — Virelle Studios cinematic opener
 *
 * Sequence:
 *  0.0s  — Black screen, letterbox bars slide in
 *  0.5s  — Atmospheric fog builds
 *  0.8s  — White dove descends from above, wings beating (realistic flap physics)
 *  2.8s  — Dove perches on shield top, wings fold with elastic settle
 *  3.0s  — Angelic choir "Ahhh" sounds (synthesised formant choir)
 *  3.2s  — Heraldic metal shield reveals with VS monogram
 *  3.8s  — Olive branches unfurl left and right, leaves and berries
 *  4.5s  — Gold transformation wave sweeps from dove outward
 *  5.8s  — "VIRELLE STUDIOS" rises in gold with glow
 *  6.5s  — "WHERE VISION BECOMES FILM" fades in
 *  8.5s  — Fade to black, onComplete fires
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

function playBoom(ctx: AudioContext, time: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 140;
  osc.type = "sine";
  osc.frequency.setValueAtTime(70, time);
  osc.frequency.exponentialRampToValueAtTime(22, time + 1.8);
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(0.8, time + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 2.2);
  osc.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
  osc.start(time); osc.stop(time + 2.2);
}

function playWhoosh(ctx: AudioContext, time: number) {
  const bufferSize = Math.floor(ctx.sampleRate * 1.0);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(1200, time);
  filter.frequency.exponentialRampToValueAtTime(180, time + 1.0);
  filter.Q.value = 0.6;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(0.18, time + 0.12);
  gain.gain.linearRampToValueAtTime(0, time + 1.0);
  source.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
  source.start(time);
}

function playWingFlap(ctx: AudioContext, time: number) {
  const bufferSize = Math.floor(ctx.sampleRate * 0.12);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 700;
  filter.Q.value = 1.0;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(0.07, time + 0.02);
  gain.gain.linearRampToValueAtTime(0, time + 0.12);
  source.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
  source.start(time);
}

/** Angelic choir "Ahhh" — synthesised formant vowel choir on C major */
function playAngelicChoir(ctx: AudioContext, time: number) {
  const fundamentals = [261.63, 329.63, 392.00, 523.25, 659.25];
  const formants = [800, 1200, 2500];
  fundamentals.forEach((freq, vi) => {
    const vt = time + vi * 0.055;
    [1, 2, 3, 4, 5, 6].forEach((harmonic, hi) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const baseGain = [0.5, 0.28, 0.18, 0.11, 0.07, 0.04][hi] || 0.02;
      const hFreq = freq * harmonic;
      let boost = 1.0;
      formants.forEach(f => {
        const d = Math.abs(hFreq - f) / f;
        if (d < 0.28) boost += (1 - d / 0.28) * 1.6;
      });
      osc.type = "sine";
      osc.frequency.value = hFreq;
      const fg = baseGain * boost * (0.055 / fundamentals.length);
      gain.gain.setValueAtTime(0, vt);
      gain.gain.linearRampToValueAtTime(fg, vt + 0.45);
      gain.gain.setValueAtTime(fg, vt + 1.8);
      gain.gain.linearRampToValueAtTime(fg * 0.65, vt + 3.2);
      gain.gain.linearRampToValueAtTime(0, vt + 4.8);
      const vib = ctx.createOscillator();
      const vibG = ctx.createGain();
      vib.frequency.value = 5.2 + vi * 0.25;
      vibG.gain.value = hFreq * 0.003;
      vib.connect(vibG); vibG.connect(osc.frequency);
      vib.start(vt + 0.5); vib.stop(vt + 4.8);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(vt); osc.stop(vt + 4.8);
    });
  });
}

function playMetalReveal(ctx: AudioContext, time: number) {
  [196, 294, 392, 588, 784, 1176].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = i < 2 ? "triangle" : "sine";
    osc.frequency.value = freq;
    const t0 = time + i * 0.008;
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(0.18 / (i + 1), t0 + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 2.2 - i * 0.1);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(t0); osc.stop(t0 + 2.2);
  });
}

function playGoldShimmer(ctx: AudioContext, time: number) {
  [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98, 2093.0, 2637.0].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    const t = time + i * 0.07;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.10, t + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.4);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(t); osc.stop(t + 1.4);
  });
}

function playSustain(ctx: AudioContext, time: number) {
  [110, 138.59, 164.81, 220, 277.18, 329.63].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.06 / (i + 1), time + 0.6);
    gain.gain.setValueAtTime(0.06 / (i + 1), time + 2.0);
    gain.gain.linearRampToValueAtTime(0, time + 4.2);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(time); osc.stop(time + 4.2);
  });
}

// ─── Easing ───────────────────────────────────────────────────────────────────
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOutCubic = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeOutElastic = (t: number) => {
  if (t === 0 || t === 1) return t;
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1;
};
const easeOutBack = (t: number) => {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

// ─── Component ─────────────────────────────────────────────────────────────
export function StudioOpener({ onComplete, mode = "login", skippable = true }: StudioOpenerProps) {
  const [videoError, setVideoError] = useState(false);
  const [isSkipped, setIsSkipped] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [phase, setPhase] = useState<"playing" | "fadeout">("playing");
  const [videoPhase, setVideoPhase] = useState<"playing" | "hold" | "fadeout">("playing");
  const [showSkip, setShowSkip] = useState(false);
  const [t, setT] = useState(0);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioFiredRef = useRef({ whoosh: false, flaps: false, choir: false, metal: false, boom: false, shimmer: false, sustain: false });
  const TOTAL = 8500;

  useEffect(() => {
    if (!skippable) return;
    const timer = setTimeout(() => setShowSkip(true), 2500);
    return () => clearTimeout(timer);
  }, [skippable]);

  const handleSkip = useCallback(() => {
    setPhase("fadeout");
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setTimeout(onComplete, 600);
  }, [onComplete]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === " " || e.key === "Enter") { e.preventDefault(); handleSkip(); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleSkip]);

  useEffect(() => {
    startTimeRef.current = performance.now();
    audioCtxRef.current = createAudioContext();
    const tick = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const tSec = elapsed / 1000;
      setT(tSec);
      const ctx = audioCtxRef.current;
      if (ctx) {
        const ct = ctx.currentTime;
        if (!audioFiredRef.current.whoosh && tSec >= 0.7) { audioFiredRef.current.whoosh = true; playWhoosh(ctx, ct); }
        if (!audioFiredRef.current.flaps && tSec >= 1.0) {
          audioFiredRef.current.flaps = true;
          [0, 0.22, 0.44, 0.66, 0.88, 1.1, 1.32, 1.54].forEach(d => playWingFlap(ctx, ct + d));
        }
        if (!audioFiredRef.current.choir && tSec >= 3.0) { audioFiredRef.current.choir = true; playAngelicChoir(ctx, ct); }
        if (!audioFiredRef.current.metal && tSec >= 3.2) { audioFiredRef.current.metal = true; playMetalReveal(ctx, ct); playBoom(ctx, ct); }
        if (!audioFiredRef.current.shimmer && tSec >= 4.5) { audioFiredRef.current.shimmer = true; playGoldShimmer(ctx, ct); }
        if (!audioFiredRef.current.sustain && tSec >= 5.8) { audioFiredRef.current.sustain = true; playSustain(ctx, ct); }
      }
      if (elapsed < TOTAL) { rafRef.current = requestAnimationFrame(tick); }
      else { setPhase("fadeout"); setTimeout(onComplete, 800); }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [onComplete]);

  // ── Animation values ──────────────────────────────────────────────────────
  const letterboxOpacity = t < 0.3 ? easeOutCubic(t / 0.3) : t < 8.0 ? 1 : Math.max(0, 1 - (t - 8.0) / 0.5);
  const fogOpacity = t < 0.3 ? 0 : Math.min(easeOutCubic((t - 0.3) / 1.4) * 0.42, 0.42);
  const doveFlightP = t < 0.8 ? 0 : t < 2.8 ? easeOutCubic((t - 0.8) / 2.0) : 1;
  const doveY = -185 + doveFlightP * 42;
  const doveOpacity = t < 0.8 ? 0 : Math.min((t - 0.8) / 0.3, 1);
  const isPerched = t >= 2.8;
  // Asymmetric wing beat: fast down (30%), slow up (70%)
  const rawBeat = (t * 5.5) % 1;
  const wingBeat = isPerched ? 0 : (rawBeat < 0.3 ? rawBeat / 0.3 : 1 - (rawBeat - 0.3) / 0.7);
  const wingFoldP = t < 2.8 ? 0 : Math.min(easeOutElastic((t - 2.8) / 0.9), 1);
  const shieldP = t < 3.2 ? 0 : Math.min(easeOutBack((t - 3.2) / 1.0), 1);
  const branchP = t < 3.8 ? 0 : Math.min(easeOutCubic((t - 3.8) / 1.2), 1);
  const goldWave = t < 4.5 ? 0 : Math.min(easeInOutCubic((t - 4.5) / 1.7), 1);
  const shimmerX = t < 4.5 ? -200 : Math.min(((t - 4.5) / 1.7) * 400, 400);
  const textOpacity = t < 5.8 ? 0 : Math.min(easeOutCubic((t - 5.8) / 0.8), 1);
  const textY = t < 5.8 ? 20 : Math.max(0, 20 - easeOutCubic((t - 5.8) / 0.8) * 20);
  const taglineOpacity = t < 6.6 ? 0 : Math.min(easeOutCubic((t - 6.6) / 0.6), 1);

  const goldColor = (a = 1) => `rgba(212,175,55,${a})`;
  const goldGlow = (i: number) =>
    `drop-shadow(0 0 ${10*i}px rgba(212,175,55,${0.95*i})) drop-shadow(0 0 ${28*i}px rgba(212,175,55,${0.55*i})) drop-shadow(0 0 ${56*i}px rgba(212,175,55,${0.28*i}))`;
  // Per-element gold wave (0=dove, 0.35=shield, 0.65=branches)
  const gw = (dist: number) => Math.max(0, Math.min((goldWave - dist * 0.4) / 0.6, 1));
  const dc = (d: number) => gw(d) > 0.5 ? "url(#vsDoveGold)" : "url(#vsDoveWhite)";
  const lc = (d: number, t1: number, c1: string, c2: string) => gw(d) > t1 ? c1 : c2;

  // 120 gold dust particles
  const particles = Array.from({ length: 120 }, (_, i) => ({
    x: 15 + ((i * 137.508) % 1) * 70,
    y: 10 + ((i * 97.31) % 1) * 75,
    size: 0.8 + ((i * 53.71) % 1) * 3.2,
    delay: ((i * 71.23) % 1) * 1.8,
    speed: 0.6 + ((i * 97.31) % 1) * 1.6,
    drift: (((i * 137.508) % 1) - 0.5) * 0.4,
  }));

  // If video hasn't errored, show video player
  if (!videoError) {
    return (
      <div
        className="fixed inset-0 z-[9999] bg-black flex items-center justify-center transition-opacity duration-700"
        style={{ opacity: videoPhase === "fadeout" ? 0 : 1 }}
        onClick={() => skippable && setIsSkipped(true)}
      >
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          preload="auto"
          className="w-full h-full object-contain"
          onEnded={() => {
            // Hold on the final golden logo frame for 2 full seconds, then fade out
            setVideoPhase("hold");
            setTimeout(() => {
              setVideoPhase("fadeout");
              setTimeout(onComplete, 700);
            }, 2000);
          }}
          onError={() => setVideoError(true)}
        >
          {/* Primary: self-hosted on Railway for reliable delivery */}
          <source src="/virelle-opener.mp4" type="video/mp4" />
          {/* Fallback: CDN */}
          <source src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663497651330/KKNwAtyzOOzGlBLQ.mp4" type="video/mp4" />
        </video>
        {skippable && (
          <button
            className="absolute bottom-8 right-8 px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg backdrop-blur-sm transition-colors"
            onClick={() => setIsSkipped(true)}
          >
            SKIP
          </button>
        )}
      </div>
    );
  }

  // Fallback SVG animation if video fails
  return (
    <div
      className={`fixed inset-0 z-[9999] bg-black flex items-center justify-center overflow-hidden transition-opacity duration-700 ${phase === "fadeout" ? "opacity-0" : "opacity-100"}`}
      onClick={skippable ? handleSkip : undefined}
      style={{ cursor: skippable ? "pointer" : "default" }}
    >
      {/* Letterbox */}
      <div className="absolute top-0 left-0 right-0 h-[8vh] bg-black z-10 pointer-events-none" style={{ opacity: letterboxOpacity }} />
      <div className="absolute bottom-0 left-0 right-0 h-[8vh] bg-black z-10 pointer-events-none" style={{ opacity: letterboxOpacity }} />

      {/* Atmospheric fog */}
      <div className="absolute inset-0 pointer-events-none" style={{
        opacity: fogOpacity,
        background: `radial-gradient(ellipse 90% 70% at 50% 55%, rgba(40,50,110,0.6) 0%, transparent 65%),radial-gradient(ellipse 55% 45% at 25% 42%, rgba(30,40,90,0.35) 0%, transparent 55%),radial-gradient(ellipse 55% 45% at 75% 42%, rgba(30,40,90,0.35) 0%, transparent 55%)`,
      }} />

      {/* Gold ambient glow */}
      {goldWave > 0 && (
        <div className="absolute inset-0 pointer-events-none" style={{
          opacity: goldWave * 0.65,
          background: `radial-gradient(ellipse 55% 65% at 50% 42%, rgba(212,175,55,0.3) 0%, transparent 65%),radial-gradient(ellipse 28% 28% at 50% 26%, rgba(255,220,80,0.2) 0%, transparent 50%)`,
        }} />
      )}

      {/* Gold dust particles */}
      {goldWave > 0.05 && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {particles.map((p, i) => {
            const age = Math.max(0, goldWave - p.delay / 5);
            if (age <= 0) return null;
            const py = p.y - age * p.speed * 30;
            const px = p.x + age * p.drift * 15;
            const op = Math.min(age * 4, 1) * Math.max(0, 1 - age * 0.85);
            if (op <= 0) return null;
            return (
              <div key={i} className="absolute rounded-full" style={{
                left: `${px}%`, top: `${py}%`,
                width: `${p.size}px`, height: `${p.size}px`,
                backgroundColor: goldColor(op),
                boxShadow: `0 0 ${p.size * 4}px ${goldColor(op * 0.7)},0 0 ${p.size * 8}px ${goldColor(op * 0.3)}`,
              }} />
            );
          })}
        </div>
      )}

      {/* ── Main logo composition ── */}
      {/* Padding keeps content inside the letterbox safe area on all screen sizes */}
      <div className="relative flex flex-col items-center" style={{ paddingTop: "9vh", paddingBottom: "9vh", width: "100%", maxWidth: "420px" }}>

        {/* SVG gradient/filter defs */}
        <svg width="0" height="0" style={{ position: "absolute" }}>
          <defs>
            <linearGradient id="vsGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7a5200" /><stop offset="20%" stopColor="#c8960c" />
              <stop offset="42%" stopColor="#f5e070" /><stop offset="58%" stopColor="#ffd700" />
              <stop offset="78%" stopColor="#d4af37" /><stop offset="100%" stopColor="#5a3a00" />
            </linearGradient>
            <linearGradient id="vsGoldShield" x1="5%" y1="0%" x2="95%" y2="100%">
              <stop offset="0%" stopColor="#3a2400" /><stop offset="18%" stopColor="#b08000" />
              <stop offset="38%" stopColor="#f0d050" /><stop offset="52%" stopColor="#fff0a0" />
              <stop offset="68%" stopColor="#d4af37" /><stop offset="88%" stopColor="#8b6000" />
              <stop offset="100%" stopColor="#2a1800" />
            </linearGradient>
            <linearGradient id="vsSilver" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6a6a7a" /><stop offset="30%" stopColor="#c0c0d8" />
              <stop offset="55%" stopColor="#eeeef8" /><stop offset="80%" stopColor="#b0b0c8" />
              <stop offset="100%" stopColor="#6a6a7a" />
            </linearGradient>
            <linearGradient id="vsShieldMetal" x1="8%" y1="0%" x2="92%" y2="100%">
              <stop offset="0%" stopColor="#2a2a38" /><stop offset="20%" stopColor="#7a7a92" />
              <stop offset="42%" stopColor="#d0d0e8" /><stop offset="58%" stopColor="#e8e8f8" />
              <stop offset="78%" stopColor="#9090a8" /><stop offset="100%" stopColor="#1a1a28" />
            </linearGradient>
            <linearGradient id="vsDoveWhite" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" /><stop offset="55%" stopColor="#eeeef8" />
              <stop offset="100%" stopColor="#d8d8e8" />
            </linearGradient>
            <linearGradient id="vsDoveGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fff0a0" /><stop offset="42%" stopColor="#f5d76e" />
              <stop offset="78%" stopColor="#d4af37" /><stop offset="100%" stopColor="#8b6000" />
            </linearGradient>
            <linearGradient id="vsShimmer" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(255,255,255,0)" />
              <stop offset="44%" stopColor="rgba(255,255,255,0)" />
              <stop offset="50%" stopColor="rgba(255,255,255,0.55)" />
              <stop offset="56%" stopColor="rgba(255,255,255,0)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>
            <radialGradient id="vsRivet" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#f0f0f8" /><stop offset="60%" stopColor="#8a8aaa" />
              <stop offset="100%" stopColor="#3a3a50" />
            </radialGradient>
            <radialGradient id="vsRivetGold" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#fff0a0" /><stop offset="60%" stopColor="#c8960c" />
              <stop offset="100%" stopColor="#5a3a00" />
            </radialGradient>
            <filter id="vsShadow" x="-25%" y="-25%" width="150%" height="150%">
              <feDropShadow dx="0" dy="5" stdDeviation="8" floodColor="rgba(0,0,0,0.75)" />
            </filter>
            <filter id="vsGoldGlow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feFlood floodColor="rgba(212,175,55,0.75)" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="glow" />
              <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
        </svg>

        {/* ══════════════════════════════════════════════════════════════════
            DOVE
        ══════════════════════════════════════════════════════════════════ */}
        <div className="absolute pointer-events-none" style={{
          top: 0, left: "50%",
          transform: `translateX(-50%) translateY(${doveY}px)`,
          opacity: doveOpacity, zIndex: 10,
          filter: gw(0) > 0.4
            ? goldGlow(Math.min((gw(0) - 0.4) / 0.6, 1) * 1.2)
            : "drop-shadow(0 3px 14px rgba(255,255,255,0.4)) drop-shadow(0 0 28px rgba(255,255,255,0.18))",
        }}>
          <svg viewBox="0 0 160 120" style={{ width: "min(152px, 40vw)", height: "auto" }}>

            {/* LEFT WING */}
            <g style={{
              transformOrigin: "80px 65px",
              transform: isPerched
                ? `rotate(${-20 + wingFoldP * 20}deg) scaleY(${1 - wingFoldP * 0.38})`
                : `rotate(${-24 - wingBeat * 30}deg)`,
            }}>
              {/* 10 primary feathers */}
              {[0,1,2,3,4,5,6,7,8,9].map(i => {
                const f = i / 9;
                const tx = 14 + f * 16, ty = 40 + f * 12;
                const mx = 44 + f * 10, my = 47 + f * 7;
                return (
                  <path key={i}
                    d={`M80 65 C${mx} ${my-5},${tx+2} ${ty-7},${tx} ${ty} C${tx-2} ${ty+3},${mx-3} ${my+4},80 67Z`}
                    fill={dc(0)} opacity={0.96 - f * 0.08}
                    style={{ transition: "fill 0.6s" }}
                  />
                );
              })}
              {/* 8 secondary feathers */}
              {[0,1,2,3,4,5,6,7].map(i => {
                const f = i / 7;
                const tx = 22 + f * 18, ty = 34 + f * 10;
                return (
                  <path key={i}
                    d={`M80 63 C${52+f*10} 48,${tx+3} ${ty-5},${tx} ${ty} C${tx-2} ${ty+3},${50+f*8} 52,80 65Z`}
                    fill={dc(0)} opacity={0.78 - f * 0.05}
                    style={{ transition: "fill 0.6s" }}
                  />
                );
              })}
              {/* Coverts */}
              <path d="M80 63 C64 54,50 49,40 47 C36 46,34 48,36 51 C40 55,55 59,72 63Z"
                fill={dc(0)} opacity="0.62" style={{ transition: "fill 0.6s" }} />
              {/* Quill lines */}
              {[0,1,2,3,4].map(i => (
                <line key={i} x1={80-i*2} y1={65+i*0.5} x2={18+i*9} y2={42+i*3}
                  stroke={gw(0)>0.4?"rgba(155,115,8,0.32)":"rgba(155,155,180,0.32)"} strokeWidth="0.4" />
              ))}
            </g>

            {/* RIGHT WING (mirror) */}
            <g style={{
              transformOrigin: "80px 65px",
              transform: isPerched
                ? `rotate(${20 - wingFoldP * 20}deg) scaleY(${1 - wingFoldP * 0.38})`
                : `rotate(${24 + wingBeat * 30}deg)`,
            }}>
              {[0,1,2,3,4,5,6,7,8,9].map(i => {
                const f = i / 9;
                const tx = 146 - f * 16, ty = 40 + f * 12;
                const mx = 116 - f * 10, my = 47 + f * 7;
                return (
                  <path key={i}
                    d={`M80 65 C${mx} ${my-5},${tx-2} ${ty-7},${tx} ${ty} C${tx+2} ${ty+3},${mx+3} ${my+4},80 67Z`}
                    fill={dc(0)} opacity={0.96 - f * 0.08}
                    style={{ transition: "fill 0.6s" }}
                  />
                );
              })}
              {[0,1,2,3,4,5,6,7].map(i => {
                const f = i / 7;
                const tx = 138 - f * 18, ty = 34 + f * 10;
                return (
                  <path key={i}
                    d={`M80 63 C${108-f*10} 48,${tx-3} ${ty-5},${tx} ${ty} C${tx+2} ${ty+3},${110-f*8} 52,80 65Z`}
                    fill={dc(0)} opacity={0.78 - f * 0.05}
                    style={{ transition: "fill 0.6s" }}
                  />
                );
              })}
              <path d="M80 63 C96 54,110 49,120 47 C124 46,126 48,124 51 C120 55,105 59,88 63Z"
                fill={dc(0)} opacity="0.62" style={{ transition: "fill 0.6s" }} />
              {[0,1,2,3,4].map(i => (
                <line key={i} x1={80+i*2} y1={65+i*0.5} x2={142-i*9} y2={42+i*3}
                  stroke={gw(0)>0.4?"rgba(155,115,8,0.32)":"rgba(155,155,180,0.32)"} strokeWidth="0.4" />
              ))}
            </g>

            {/* TAIL FEATHERS */}
            {[-14,-7,0,7,14].map((angle, i) => (
              <path key={i}
                d={`M${79+i*0.4} 78 C${77+i} 89,${75+i} 97,${77+i} 102 C${78+i} 104,${81+i} 102,${81+i} 97 L${82+i*0.4} 78Z`}
                fill={dc(0)} opacity={0.9 - Math.abs(i-2) * 0.1}
                style={{ transformOrigin:"80px 78px", transform:`rotate(${angle}deg)`, transition:"fill 0.6s" }}
              />
            ))}

            {/* BODY */}
            <ellipse cx="80" cy="68" rx="16" ry="11"
              fill={dc(0)} filter="url(#vsShadow)" style={{ transition:"fill 0.6s" }} />
            {/* Breast */}
            <ellipse cx="80" cy="73" rx="11" ry="8"
              fill={gw(0)>0.5?"#D4AF37":"#f0f0f8"} opacity="0.9" style={{ transition:"fill 0.6s" }} />
            {/* Wing coverts overlap on body */}
            <ellipse cx="80" cy="66" rx="14" ry="6"
              fill={dc(0)} opacity="0.55" style={{ transition:"fill 0.6s" }} />

            {/* NECK */}
            <ellipse cx="80" cy="56" rx="8" ry="7"
              fill={dc(0)} style={{ transition:"fill 0.6s" }} />

            {/* HEAD */}
            <circle cx="80" cy="46" r="11"
              fill={dc(0)} filter="url(#vsShadow)" style={{ transition:"fill 0.6s" }} />
            {/* Head highlight */}
            <ellipse cx="77" cy="43" rx="5" ry="3.5"
              fill={gw(0)>0.5?"rgba(255,240,160,0.25)":"rgba(255,255,255,0.3)"} />

            {/* EYE */}
            <circle cx="84" cy="44" r="3.2" fill={gw(0)>0.7?"#7a5000":"#0a0a18"} style={{ transition:"fill 0.5s" }} />
            <circle cx="84" cy="44" r="1.8" fill={gw(0)>0.7?"#3a2000":"#050510"} />
            <circle cx="85.2" cy="43" r="0.9" fill="white" opacity="0.95" />
            <circle cx="83.2" cy="45" r="0.4" fill="white" opacity="0.6" />

            {/* BEAK */}
            <path d="M89 45 L97 43.5 L89 47.5Z"
              fill={gw(0)>0.6?"#c8960c":"#e8c080"} style={{ transition:"fill 0.5s" }} />
            <line x1="89" y1="45" x2="97" y2="43.5"
              stroke={gw(0)>0.6?"#8B6914":"#c0a060"} strokeWidth="0.6" />
            {/* Nostril */}
            <ellipse cx="91" cy="44.8" rx="1.2" ry="0.7"
              fill={gw(0)>0.6?"#a07000":"#c0a060"} opacity="0.7" />

            {/* FEET (visible when perched) */}
            {isPerched && (
              <g opacity={Math.min(wingFoldP * 2, 1)}>
                {/* Left leg */}
                <line x1="74" y1="78" x2="70" y2="88" stroke={gw(0)>0.7?"#c8960c":"#e8c080"} strokeWidth="1.8" strokeLinecap="round" />
                <line x1="70" y1="88" x2="65" y2="91" stroke={gw(0)>0.7?"#c8960c":"#e8c080"} strokeWidth="1.2" strokeLinecap="round" />
                <line x1="70" y1="88" x2="70" y2="94" stroke={gw(0)>0.7?"#c8960c":"#e8c080"} strokeWidth="1.2" strokeLinecap="round" />
                <line x1="70" y1="88" x2="75" y2="92" stroke={gw(0)>0.7?"#c8960c":"#e8c080"} strokeWidth="1.2" strokeLinecap="round" />
                <line x1="70" y1="88" x2="66" y2="94" stroke={gw(0)>0.7?"#c8960c":"#e8c080"} strokeWidth="1" strokeLinecap="round" />
                {/* Right leg */}
                <line x1="86" y1="78" x2="90" y2="88" stroke={gw(0)>0.7?"#c8960c":"#e8c080"} strokeWidth="1.8" strokeLinecap="round" />
                <line x1="90" y1="88" x2="95" y2="91" stroke={gw(0)>0.7?"#c8960c":"#e8c080"} strokeWidth="1.2" strokeLinecap="round" />
                <line x1="90" y1="88" x2="90" y2="94" stroke={gw(0)>0.7?"#c8960c":"#e8c080"} strokeWidth="1.2" strokeLinecap="round" />
                <line x1="90" y1="88" x2="85" y2="92" stroke={gw(0)>0.7?"#c8960c":"#e8c080"} strokeWidth="1.2" strokeLinecap="round" />
                <line x1="90" y1="88" x2="94" y2="94" stroke={gw(0)>0.7?"#c8960c":"#e8c080"} strokeWidth="1" strokeLinecap="round" />
              </g>
            )}
          </svg>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            SHIELD + OLIVE BRANCHES
        ══════════════════════════════════════════════════════════════════ */}
        <div style={{
          opacity: shieldP,
          transform: `scale(${0.82 + shieldP * 0.18})`,
          filter: gw(0.35) > 0.2
            ? goldGlow(Math.min((gw(0.35) - 0.2) / 0.8, 1) * 0.9)
            : "drop-shadow(0 5px 20px rgba(0,0,0,0.85))",
          marginTop: "62px",
        }}>
          <svg viewBox="0 0 300 320" style={{ width: "min(272px, 72vw)", height: "auto" }}>

            {/* ── OLIVE BRANCH LEFT ── */}
            <g opacity={branchP} style={{ transformOrigin: "108px 228px", transform: `scale(${branchP})` }}>
              {/* Main stem */}
              <path d="M108 228 C92 212,78 194,66 174 C54 154,47 132,45 110 C43 92,47 78,54 66"
                fill="none" stroke={gw(0.65)>0.7?"#8B6914":"#3a5e1a"}
                strokeWidth="3.8" strokeLinecap="round" style={{ transition:"stroke 0.5s" }} />
              {/* Sub-stems */}
              {[
                "M66 174 C58 168,48 165,39 167",
                "M76 152 C67 144,57 141,47 143",
                "M84 130 C75 121,66 117,56 119",
                "M90 108 C83 99,74 95,64 97",
                "M94 88 C88 79,80 75,70 77",
              ].map((d, i) => (
                <path key={i} d={d} fill="none"
                  stroke={gw(0.65)>0.7?"#8B6914":"#3a5e1a"}
                  strokeWidth={i < 3 ? 2.2 : 1.8} strokeLinecap="round"
                  style={{ transition:"stroke 0.5s" }} />
              ))}
              {/* Leaves — 14 leaves with midrib veins */}
              {[
                { cx:35, cy:165, rx:13, ry:5.5, rot:-38 },
                { cx:43, cy:141, rx:14, ry:5.5, rot:-45 },
                { cx:52, cy:117, rx:14, ry:5.5, rot:-50 },
                { cx:60, cy:95, rx:13, ry:5, rot:-54 },
                { cx:66, cy:75, rx:12, ry:4.5, rot:-57 },
                { cx:72, cy:160, rx:11, ry:4.5, rot:-22 },
                { cx:80, cy:138, rx:12, ry:4.5, rot:-27 },
                { cx:86, cy:116, rx:12, ry:4.5, rot:-30 },
                { cx:92, cy:94, rx:11, ry:4, rot:-33 },
                { cx:96, cy:74, rx:10, ry:3.8, rot:-35 },
              ].map((leaf, i) => (
                <g key={i} transform={`rotate(${leaf.rot} ${leaf.cx} ${leaf.cy})`}>
                  <ellipse cx={leaf.cx} cy={leaf.cy} rx={leaf.rx} ry={leaf.ry}
                    fill={gw(0.65)>0.65+i*0.01?"#b8860a":"#2e6a14"}
                    style={{ transition:"fill 0.5s" }} />
                  {/* Midrib */}
                  <line x1={leaf.cx-leaf.rx*0.85} y1={leaf.cy}
                    x2={leaf.cx+leaf.rx*0.85} y2={leaf.cy}
                    stroke={gw(0.65)>0.7?"rgba(170,120,8,0.5)":"rgba(15,50,8,0.45)"}
                    strokeWidth="0.8" />
                  {/* Side veins */}
                  {[-1,1].map(s => (
                    <line key={s}
                      x1={leaf.cx} y1={leaf.cy}
                      x2={leaf.cx + s * leaf.rx * 0.5} y2={leaf.cy - leaf.ry * 0.7}
                      stroke={gw(0.65)>0.7?"rgba(170,120,8,0.3)":"rgba(15,50,8,0.3)"}
                      strokeWidth="0.5" />
                  ))}
                </g>
              ))}
              {/* Berries */}
              {[{cx:58,cy:100,r:4},{cx:66,cy:80,r:3.5},{cx:74,cy:142,r:4},{cx:82,cy:120,r:3.5},{cx:88,cy:98,r:3}].map((b,i) => (
                <g key={i}>
                  <circle cx={b.cx} cy={b.cy} r={b.r}
                    fill={gw(0.65)>0.7?"#D4AF37":"#1e5010"} style={{ transition:"fill 0.5s" }} />
                  <circle cx={b.cx-b.r*0.3} cy={b.cy-b.r*0.3} r={b.r*0.35}
                    fill={gw(0.65)>0.7?"rgba(255,240,160,0.6)":"rgba(80,160,40,0.5)"} />
                </g>
              ))}
            </g>

            {/* ── OLIVE BRANCH RIGHT (mirrored) ── */}
            <g opacity={branchP} style={{ transformOrigin: "192px 228px", transform: `scale(${branchP})` }}>
              <path d="M192 228 C208 212,222 194,234 174 C246 154,253 132,255 110 C257 92,253 78,246 66"
                fill="none" stroke={gw(0.65)>0.7?"#8B6914":"#3a5e1a"}
                strokeWidth="3.8" strokeLinecap="round" style={{ transition:"stroke 0.5s" }} />
              {[
                "M234 174 C242 168,252 165,261 167",
                "M224 152 C233 144,243 141,253 143",
                "M216 130 C225 121,234 117,244 119",
                "M210 108 C217 99,226 95,236 97",
                "M206 88 C212 79,220 75,230 77",
              ].map((d, i) => (
                <path key={i} d={d} fill="none"
                  stroke={gw(0.65)>0.7?"#8B6914":"#3a5e1a"}
                  strokeWidth={i < 3 ? 2.2 : 1.8} strokeLinecap="round"
                  style={{ transition:"stroke 0.5s" }} />
              ))}
              {[
                { cx:265, cy:165, rx:13, ry:5.5, rot:38 },
                { cx:257, cy:141, rx:14, ry:5.5, rot:45 },
                { cx:248, cy:117, rx:14, ry:5.5, rot:50 },
                { cx:240, cy:95, rx:13, ry:5, rot:54 },
                { cx:234, cy:75, rx:12, ry:4.5, rot:57 },
                { cx:228, cy:160, rx:11, ry:4.5, rot:22 },
                { cx:220, cy:138, rx:12, ry:4.5, rot:27 },
                { cx:214, cy:116, rx:12, ry:4.5, rot:30 },
                { cx:208, cy:94, rx:11, ry:4, rot:33 },
                { cx:204, cy:74, rx:10, ry:3.8, rot:35 },
              ].map((leaf, i) => (
                <g key={i} transform={`rotate(${leaf.rot} ${leaf.cx} ${leaf.cy})`}>
                  <ellipse cx={leaf.cx} cy={leaf.cy} rx={leaf.rx} ry={leaf.ry}
                    fill={gw(0.65)>0.65+i*0.01?"#b8860a":"#2e6a14"}
                    style={{ transition:"fill 0.5s" }} />
                  <line x1={leaf.cx-leaf.rx*0.85} y1={leaf.cy}
                    x2={leaf.cx+leaf.rx*0.85} y2={leaf.cy}
                    stroke={gw(0.65)>0.7?"rgba(170,120,8,0.5)":"rgba(15,50,8,0.45)"}
                    strokeWidth="0.8" />
                  {[-1,1].map(s => (
                    <line key={s} x1={leaf.cx} y1={leaf.cy}
                      x2={leaf.cx + s * leaf.rx * 0.5} y2={leaf.cy - leaf.ry * 0.7}
                      stroke={gw(0.65)>0.7?"rgba(170,120,8,0.3)":"rgba(15,50,8,0.3)"}
                      strokeWidth="0.5" />
                  ))}
                </g>
              ))}
              {[{cx:242,cy:100,r:4},{cx:234,cy:80,r:3.5},{cx:226,cy:142,r:4},{cx:218,cy:120,r:3.5},{cx:212,cy:98,r:3}].map((b,i) => (
                <g key={i}>
                  <circle cx={b.cx} cy={b.cy} r={b.r}
                    fill={gw(0.65)>0.7?"#D4AF37":"#1e5010"} style={{ transition:"fill 0.5s" }} />
                  <circle cx={b.cx-b.r*0.3} cy={b.cy-b.r*0.3} r={b.r*0.35}
                    fill={gw(0.65)>0.7?"rgba(255,240,160,0.6)":"rgba(80,160,40,0.5)"} />
                </g>
              ))}
            </g>

            {/* Bottom branch connection */}
            <path d="M108 228 C130 242,150 248,150 252 C150 248,170 242,192 228"
              fill="none" stroke={gw(0.65)>0.7?"#8B6914":"#3a5e1a"}
              strokeWidth="3.2" strokeLinecap="round" opacity={branchP}
              style={{ transition:"stroke 0.5s" }} />

            {/* ── SHIELD ── */}
            {/* Drop shadow */}
            <path d="M150 22 L232 58 L232 148 C232 196,196 226,150 242 C104 226,68 196,68 148 L68 58 Z"
              fill="rgba(0,0,0,0.45)" transform="translate(5,7)" />
            {/* Outer border */}
            <path d="M150 22 L232 58 L232 148 C232 196,196 226,150 242 C104 226,68 196,68 148 L68 58 Z"
              fill={gw(0.35)>0.3?"url(#vsGoldShield)":"url(#vsShieldMetal)"}
              style={{ transition:"fill 0.9s" }} />
            {/* Inner bevel ring */}
            <path d="M150 30 L226 64 L226 146 C226 190,192 218,150 232 C108 218,74 190,74 146 L74 64 Z"
              fill={gw(0.35)>0.35?"rgba(212,175,55,0.18)":"rgba(200,210,245,0.14)"}
              style={{ transition:"fill 0.9s" }} />
            {/* Shield face */}
            <path d="M150 36 L220 68 L220 144 C220 184,188 210,150 224 C112 210,80 184,80 144 L80 68 Z"
              fill={gw(0.35)>0.4?"rgba(80,52,0,0.88)":"rgba(16,18,36,0.88)"}
              style={{ transition:"fill 0.9s" }} />
            {/* Top specular highlight */}
            <path d="M150 36 L220 68 L220 96 C192 80,168 70,150 67 C132 70,108 80,80 96 L80 68 Z"
              fill={gw(0.35)>0.4?"rgba(255,220,100,0.1)":"rgba(255,255,255,0.07)"}
              style={{ transition:"fill 0.9s" }} />
            {/* Decorative inner frame */}
            <path d="M150 48 L210 76 L210 142 C210 178,182 202,150 214 C118 202,90 178,90 142 L90 76 Z"
              fill="none"
              stroke={gw(0.35)>0.4?"rgba(212,175,55,0.35)":"rgba(180,180,220,0.2)"}
              strokeWidth="1.5" style={{ transition:"stroke 0.9s" }} />
            {/* Horizontal divider */}
            <line x1="90" y1="120" x2="210" y2="120"
              stroke={gw(0.35)>0.4?"rgba(212,175,55,0.3)":"rgba(180,180,220,0.18)"}
              strokeWidth="1" style={{ transition:"stroke 0.9s" }} />

            {/* Rivets — 6 */}
            {[
              {cx:82,cy:72},{cx:218,cy:72},
              {cx:78,cy:128},{cx:222,cy:128},
              {cx:92,cy:178},{cx:208,cy:178},
            ].map((r,i) => (
              <circle key={i} cx={r.cx} cy={r.cy} r="4.5"
                fill={gw(0.35)>0.4?"url(#vsRivetGold)":"url(#vsRivet)"}
                style={{ transition:"fill 0.6s" }} />
            ))}

            {/* ── VS MONOGRAM ── */}
            <text x="150" y="158" textAnchor="middle" dominantBaseline="middle"
              style={{
                fontSize: "74px",
                fontFamily: "'Playfair Display','Trajan Pro','Georgia',serif",
                fontWeight: 700,
                letterSpacing: "8px",
                fill: gw(0.35)>0.5?"url(#vsGold)":"url(#vsSilver)",
                filter: gw(0.35)>0.5?"drop-shadow(0 0 10px rgba(212,175,55,0.7)) drop-shadow(0 0 24px rgba(212,175,55,0.4))":"none",
                transition: "filter 0.6s",
              }}>VS</text>

            {/* Shimmer sweep */}
            {goldWave > 0 && goldWave < 1 && (
              <path d="M150 36 L220 68 L220 144 C220 184,188 210,150 224 C112 210,80 184,80 144 L80 68 Z"
                fill="url(#vsShimmer)"
                style={{ transform: `translateX(${shimmerX - 150}px)` }} />
            )}
          </svg>
        </div>

        {/* ── VIRELLE STUDIOS text ── */}
        <div className="text-center mt-5" style={{ opacity: textOpacity, transform: `translateY(${textY}px)` }}>
          <h1 style={{
            fontFamily: "'Playfair Display','Trajan Pro','Georgia',serif",
            fontSize: "clamp(1.7rem, 4.2vw, 2.6rem)",
            fontWeight: 700,
            letterSpacing: "0.38em",
            color: "#D4AF37",
            textShadow: `0 0 22px rgba(212,175,55,0.7),0 0 44px rgba(212,175,55,0.35),0 0 88px rgba(212,175,55,0.18),0 2px 6px rgba(0,0,0,0.9)`,
            margin: 0, lineHeight: 1,
          }}>VIRELLE STUDIOS</h1>
          <div style={{ opacity: taglineOpacity, marginTop: "12px" }}>
            <p style={{
              fontFamily: "'Playfair Display','Georgia',serif",
              fontSize: "clamp(0.52rem, 1.3vw, 0.72rem)",
              letterSpacing: "0.6em",
              color: "rgba(212,175,55,0.62)",
              margin: 0, textTransform: "uppercase",
            }}>WHERE VISION BECOMES FILM</p>
          </div>
        </div>

      </div>{/* end logo composition */}

      {/* Skip button */}
      {showSkip && skippable && phase === "playing" && (
        <button
          onClick={(e) => { e.stopPropagation(); handleSkip(); }}
          className="absolute bottom-8 right-8 flex items-center gap-2"
          style={{
            color: "rgba(212,175,55,0.38)", fontSize: "0.72rem", letterSpacing: "0.22em",
            background: "none", border: "none", cursor: "pointer", transition: "color 0.3s",
          }}
          onMouseEnter={e => (e.currentTarget.style.color = "rgba(212,175,55,0.9)")}
          onMouseLeave={e => (e.currentTarget.style.color = "rgba(212,175,55,0.38)")}
        >
          <span>SKIP</span>
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>
      )}
    </div>
  );
}
