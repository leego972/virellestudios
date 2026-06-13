import React, { useEffect, useState } from 'react';

  // Eye socket positions — calibrated to virelle-face.png (0-100 viewBox)
  const GEO = {
    leftEye:  { cx: 34, cy: 40, rx: 6,   ry: 4.5 },
    rightEye: { cx: 66, cy: 40, rx: 6,   ry: 4.5 },
  };

  type VoiceState = 'idle' | 'inactive' | 'listening' | 'thinking' | 'speaking';

  // Eye colour per state
  const EYE_COLOR: Record<VoiceState, { core: string; mid: string; outer: string }> = {
    idle:      { core: '#fff8e0', mid: '#ffd700', outer: '#cc8800' },
    inactive:  { core: '#fff8e0', mid: '#ffd700', outer: '#cc8800' },
    listening: { core: '#fffde7', mid: '#ffd700', outer: '#ffaa00' }, // yellow
    thinking:  { core: '#ddeeff', mid: '#7ab0ff', outer: '#3060e0' }, // blue
    speaking:  { core: '#e0fff0', mid: '#44ff88', outer: '#00cc55' }, // green
  };

  let _vfCount = 0;

  export const VirelleFace = ({
    volume = 0,
    speaking = false,
    state = 'idle',
  }: {
    volume?: number;
    speaking?: boolean;
    state?: VoiceState;
  }) => {
    // Stable unique ID per mount — prevents SVG gradient collision when two instances render
    const [uid] = React.useState(() => `vf${++_vfCount}`);
    const v = Math.min(Math.max(volume, 0), 1);

    // Derive effective state from props
    const effectiveState: VoiceState =
      state !== 'idle' && state !== 'inactive' ? state :
      speaking ? 'speaking' : 'idle';

    const isActive = effectiveState === 'listening' || effectiveState === 'thinking' || effectiveState === 'speaking';
    const color = EYE_COLOR[effectiveState];

    // Opacity + scale pulse with volume when speaking
    const eyeOpacity = isActive ? Math.min(0.70 + v * 0.30, 1.0) : 0.55;
    const eyeScale   = isActive ? 1 + v * 0.15 : 0.82;

    const mkGrad = (id: string, cx: number, cy: number, rx: number) => (
      <radialGradient
        key={id}
        id={id}
        cx={cx}
        cy={cy}
        r={rx * 1.35}
        gradientUnits="userSpaceOnUse"
      >
        <stop offset="0%"   stopColor={color.core}  stopOpacity={eyeOpacity} />
        <stop offset="30%"  stopColor={color.mid}   stopOpacity={eyeOpacity * 0.80} />
        <stop offset="65%"  stopColor={color.outer} stopOpacity={eyeOpacity * 0.35} />
        <stop offset="100%" stopColor={color.outer} stopOpacity="0" />
      </radialGradient>
    );

    return (
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          position: 'relative',
          width: '72%',
          aspectRatio: '1 / 1',
          animation: 'virelle-float 4.2s ease-in-out infinite',
          filter: isActive
            ? `drop-shadow(0 0 28px ${color.outer}55) drop-shadow(0 8px 44px ${color.outer}33)`
            : 'drop-shadow(0 8px 38px rgba(180,180,255,0.10))',
          transition: 'filter 0.6s ease',
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
              {mkGrad(`${uid}-l`, GEO.leftEye.cx,  GEO.leftEye.cy,  GEO.leftEye.rx)}
              {mkGrad(`${uid}-r`, GEO.rightEye.cx, GEO.rightEye.cy, GEO.rightEye.rx)}
            </defs>

            {/* Left eye — glow locked to socket centre */}
            <ellipse
              cx={GEO.leftEye.cx}
              cy={GEO.leftEye.cy}
              rx={GEO.leftEye.rx  * eyeScale}
              ry={GEO.leftEye.ry  * eyeScale}
              fill={`url(#${uid}-l)`}
              style={{
                transition: 'rx 0.12s ease-out, ry 0.12s ease-out',
                animation: effectiveState === 'speaking' ? 'eye-flicker 0.18s linear infinite' : 'none',
              }}
            />

            {/* Right eye — glow locked to socket centre */}
            <ellipse
              cx={GEO.rightEye.cx}
              cy={GEO.rightEye.cy}
              rx={GEO.rightEye.rx * eyeScale}
              ry={GEO.rightEye.ry * eyeScale}
              fill={`url(#${uid}-r)`}
              style={{
                transition: 'rx 0.12s ease-out, ry 0.12s ease-out',
                animation: effectiveState === 'speaking' ? 'eye-flicker 0.18s linear infinite 0.09s' : 'none',
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
  