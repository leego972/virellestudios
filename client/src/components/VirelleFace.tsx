import React from 'react';

  // ── Geometry calibrated to the theatrical mask image (1024x1024) ──────────
  // All values in SVG viewBox units 0-100.
  // Left  eye socket: cx=34, cy=40, rx=6, ry=4.5  ← pixel-measured from 1254×1254 mask
  // Right eye socket: cx=66, cy=40, rx=6, ry=4.5
  const GEO = {
    leftEye:  { cx: 34, cy: 40, rx: 6,   ry: 4.5 },
    rightEye: { cx: 66, cy: 40, rx: 6,   ry: 4.5 },
  };

  export const VirelleFace = ({
    volume = 0,
    speaking = false,
  }: {
    volume?: number;
    speaking?: boolean;
  }) => {
    const v = Math.min(Math.max(volume, 0), 1);

    // Eye glow: bright white core, blue halo — pulses with speech intensity
    const eyeOpacity = speaking ? Math.min(0.65 + v * 0.35, 1) : 0.28;
    const eyeScale   = speaking ? 1 + v * 0.18 : 0.80;

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
                <stop offset="28%"  stopColor="#d8eeff" stopOpacity={eyeOpacity * 0.88} />
                <stop offset="62%"  stopColor="#7ab0ff" stopOpacity={eyeOpacity * 0.42} />
                <stop offset="100%" stopColor="#3060e0" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="vf-eye-r" cx="50%" cy="42%" r="52%">
                <stop offset="0%"   stopColor="#ffffff" stopOpacity={eyeOpacity} />
                <stop offset="28%"  stopColor="#d8eeff" stopOpacity={eyeOpacity * 0.88} />
                <stop offset="62%"  stopColor="#7ab0ff" stopOpacity={eyeOpacity * 0.42} />
                <stop offset="100%" stopColor="#3060e0" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Left eye glow — sits precisely inside the socket hole */}
            <ellipse
              cx={GEO.leftEye.cx}
              cy={GEO.leftEye.cy}
              rx={GEO.leftEye.rx  * eyeScale}
              ry={GEO.leftEye.ry  * eyeScale}
              fill="url(#vf-eye-l)"
              style={{
                transition: 'rx 0.12s ease-out, ry 0.12s ease-out',
                animation: speaking ? 'eye-flicker 0.18s linear infinite' : 'none',
              }}
            />

            {/* Right eye glow — sits precisely inside the socket hole */}
            <ellipse
              cx={GEO.rightEye.cx}
              cy={GEO.rightEye.cy}
              rx={GEO.rightEye.rx * eyeScale}
              ry={GEO.rightEye.ry * eyeScale}
              fill="url(#vf-eye-r)"
              style={{
                transition: 'rx 0.12s ease-out, ry 0.12s ease-out',
                animation: speaking ? 'eye-flicker 0.18s linear infinite 0.09s' : 'none',
              }}
            />
          </svg>

          <style>{`
            @keyframes virelle-float {
              0%,100% { transform: translateY(0px) rotate(-0.4deg); }
              50%      { transform: translateY(-10px) rotate(0.4deg); }
            }
            @keyframes eye-flicker {
              0%   { opacity: 1;    }
              15%  { opacity: 0.72; }
              30%  { opacity: 0.95; }
              45%  { opacity: 0.60; }
              55%  { opacity: 1;    }
              70%  { opacity: 0.80; }
              85%  { opacity: 0.68; }
              100% { opacity: 1;    }
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
  