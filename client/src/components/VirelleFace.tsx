import React from 'react';

// ── Geometry calibrated to the theatrical mask image (1024x1024) ──────────
// All values in SVG viewBox units 0-100.
// Left  eye socket: cx=33, cy=39, rx=8,  ry=3.8
// Right eye socket: cx=67, cy=39, rx=8,  ry=3.8
// Mouth slit base:  cx=50, cy=74.5, halfW=9.5
const GEO = {
  leftEye:  { cx: 33,  cy: 39,   rx: 8,   ry: 3.8 },
  rightEye: { cx: 67,  cy: 39,   rx: 8,   ry: 3.8 },
  mouth:    { cx: 50,  cy: 74.5, halfW: 9.5 },
};

export const VirelleFace = ({
  volume = 0,
  speaking = false,
}: {
  volume?: number;
  speaking?: boolean;
}) => {
  const v = Math.min(Math.max(volume, 0), 1);

  // Mouth kinematics: upper lip barely moves, lower jaw drops up to 5.5 units
  const upperLipY = GEO.mouth.cy - v * 0.6;
  const lowerLipY = GEO.mouth.cy + 0.8 + v * 5.5;
  const midY      = (upperLipY + lowerLipY) / 2;
  const mouthHW   = GEO.mouth.halfW + v * 1.0;
  const openH     = (lowerLipY - upperLipY) / 2;
  const lipArch   = v * 1.4;

  // Eye glow: bright white core, blue halo, pulses with speech
  const eyeOpacity = speaking ? Math.min(0.65 + v * 0.35, 1) : 0.30;
  const eyeScale   = speaking ? 1 + v * 0.20 : 0.82;

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{
        position: 'relative',
        width: '72%',
        aspectRatio: '1 / 1',
        animation: 'virelle-float 4.2s ease-in-out infinite',
        filter: speaking
          ? 'drop-shadow(0 0 28px rgba(120,160,255,0.35)) drop-shadow(0 8px 44px rgba(60,100,255,0.22))'
          : 'drop-shadow(0 8px 38px rgba(180,180,255,0.12))',
        transition: 'filter 0.7s ease',
      }}>

        <img
          src="/virelle-face.png"
          alt=""
          draggable={false}
          style={{ width: '100%', height: '100%', objectFit: 'contain', userSelect: 'none', pointerEvents: 'none', display: 'block' }}
        />

        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid meet"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}
        >
          <defs>
            <radialGradient id="vf-eye-l" cx="50%" cy="42%" r="52%">
              <stop offset="0%"   stopColor="#ffffff" stopOpacity={eyeOpacity} />
              <stop offset="30%"  stopColor="#d0e8ff" stopOpacity={eyeOpacity * 0.90} />
              <stop offset="65%"  stopColor="#7ab0ff" stopOpacity={eyeOpacity * 0.45} />
              <stop offset="100%" stopColor="#3060e0" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="vf-eye-r" cx="50%" cy="42%" r="52%">
              <stop offset="0%"   stopColor="#ffffff" stopOpacity={eyeOpacity} />
              <stop offset="30%"  stopColor="#d0e8ff" stopOpacity={eyeOpacity * 0.90} />
              <stop offset="65%"  stopColor="#7ab0ff" stopOpacity={eyeOpacity * 0.45} />
              <stop offset="100%" stopColor="#3060e0" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="vf-cavity" cx="50%" cy="58%" r="50%">
              <stop offset="0%"   stopColor="#060203" />
              <stop offset="75%"  stopColor="#100608" />
              <stop offset="100%" stopColor="#180b0c" />
            </radialGradient>
          </defs>

          {/* Left eye glow — sits precisely inside the socket hole */}
          <ellipse
            cx={GEO.leftEye.cx}
            cy={GEO.leftEye.cy}
            rx={GEO.leftEye.rx  * eyeScale}
            ry={GEO.leftEye.ry  * eyeScale}
            fill="url(#vf-eye-l)"
            style={{ transition: 'all 0.14s ease-out' }}
          />

          {/* Right eye glow — sits precisely inside the socket hole */}
          <ellipse
            cx={GEO.rightEye.cx}
            cy={GEO.rightEye.cy}
            rx={GEO.rightEye.rx * eyeScale}
            ry={GEO.rightEye.ry * eyeScale}
            fill="url(#vf-eye-r)"
            style={{ transition: 'all 0.14s ease-out' }}
          />

          {/* Dark mouth cavity revealed as lips part */}
          {openH > 0.4 && (
            <ellipse
              cx={GEO.mouth.cx}
              cy={midY}
              rx={mouthHW - 0.8}
              ry={openH}
              fill="url(#vf-cavity)"
            />
          )}

          {/* Upper lip — bows upward as mouth opens */}
          <path
            d={`M ${GEO.mouth.cx - mouthHW} ${upperLipY + v * 0.5} Q ${GEO.mouth.cx} ${upperLipY - lipArch} ${GEO.mouth.cx + mouthHW} ${upperLipY + v * 0.5}`}
            fill="none"
            stroke="rgba(238,232,225,0.80)"
            strokeWidth="0.65"
            strokeLinecap="round"
          />

          {/* Lower lip — drops with the jaw */}
          <path
            d={`M ${GEO.mouth.cx - mouthHW + 0.6} ${lowerLipY - v * 0.4} Q ${GEO.mouth.cx} ${lowerLipY + lipArch * 0.75} ${GEO.mouth.cx + mouthHW - 0.6} ${lowerLipY - v * 0.4}`}
            fill="none"
            stroke="rgba(195,188,182,0.58)"
            strokeWidth="0.55"
            strokeLinecap="round"
          />
        </svg>

        <style>{`
          @keyframes virelle-float {
            0%,100% { transform: translateY(0px) rotate(-0.4deg); }
            50%      { transform: translateY(-10px) rotate(0.4deg); }
          }
        `}</style>
      </div>
    </div>
  );
};

export const VirelleFaceAvatar = ({ speaking = false }: { speaking?: boolean }) => (
  <div style={{ position: 'relative', width: 28, height: 28, flexShrink: 0 }}>
    <img
      src="/virelle-face.png"
      alt="Virelle"
      style={{
        width: '100%', height: '100%',
        objectFit: 'cover',
        borderRadius: '50%',
        border: `1.5px solid ${speaking ? 'rgba(130,175,255,0.75)' : 'rgba(170,170,255,0.35)'}`,
        boxShadow: speaking ? '0 0 10px 2px rgba(130,175,255,0.55)' : '0 0 4px 1px rgba(130,175,255,0.18)',
        transition: 'all 0.3s ease',
      }}
    />
  </div>
);

export default VirelleFace;
