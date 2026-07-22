import React from 'react';

// Eye socket positions — calibrated to virelle-face.png (viewBox 0 0 100 133)
// Glows sit BEHIND the mask at z:1; mask PNG is z:2 on top.
// The transparent eye sockets let the light bleed through from behind.
const GEO = {
  leftEye:  { cx: 46, cy: 69, rx: 7.0, ry: 5.0 },
  rightEye: { cx: 60, cy: 69, rx: 7.0, ry: 5.0 },
};

type VoiceState = 'idle' | 'inactive' | 'listening' | 'thinking' | 'speaking';

const EYE_COLOR: Record<VoiceState, { core: string; mid: string; outer: string }> = {
  idle:      { core: '#fff8e0', mid: '#ffd700', outer: '#cc8800' },
  inactive:  { core: '#fff8e0', mid: '#ffd700', outer: '#cc8800' },
  listening: { core: '#fffde7', mid: '#ffd700', outer: '#ffaa00' },
  thinking:  { core: '#ddeeff', mid: '#7ab0ff', outer: '#3060e0' },
  speaking:  { core: '#e0fff0', mid: '#44ff88', outer: '#00cc55' },
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
  const [uid] = React.useState(() => `vf${++_vfCount}`);
  const v = Math.min(Math.max(volume, 0), 1);

  const effectiveState: VoiceState =
    state !== 'idle' && state !== 'inactive' ? state :
    speaking ? 'speaking' : 'idle';

  const isActive = effectiveState === 'listening' || effectiveState === 'thinking' || effectiveState === 'speaking';
  const color = EYE_COLOR[effectiveState];

  const eyeOpacity = isActive ? Math.min(0.92 + v * 0.08, 1.0) : 0.82;
  const eyeScale   = isActive ? 1 + v * 0.12 : 1.0;

  const mkGrad = (id: string, cx: number, cy: number, rx: number) => (
    <radialGradient key={id} id={id} cx={cx} cy={cy} r={rx * 2.6} gradientUnits="userSpaceOnUse">
      <stop offset="0%"   stopColor={color.core}  stopOpacity={eyeOpacity} />
      <stop offset="30%"  stopColor={color.mid}   stopOpacity={eyeOpacity * 0.85} />
      <stop offset="65%"  stopColor={color.outer} stopOpacity={eyeOpacity * 0.35} />
      <stop offset="100%" stopColor={color.outer} stopOpacity="0" />
    </radialGradient>
  );

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{
        position: 'relative',
        width: '90%',
        aspectRatio: '3 / 4',
        animation: 'virelle-float 4.2s ease-in-out infinite',
        filter: isActive
          ? `drop-shadow(0 0 40px ${color.outer}88) drop-shadow(0 0 70px ${color.outer}44)`
          : 'drop-shadow(0 0 30px rgba(201,168,76,0.22)) drop-shadow(0 0 50px rgba(201,168,76,0.10))',
        transition: 'filter 0.6s ease',
      }}>

        {/* z:0 — Gold ambient glow behind everything */}
        <div style={{
          position: 'absolute',
          inset: '-15%',
          background: 'radial-gradient(ellipse 60% 50% at 50% 52%, rgba(201,168,76,0.28) 0%, rgba(180,130,40,0.12) 45%, transparent 70%)',
          filter: 'blur(20px)',
          zIndex: 0,
          pointerEvents: 'none',
        }} />

        {/* z:1 — Eye glows BEHIND the mask, shine through the transparent sockets */}
        <svg
          viewBox="0 0 100 133"
          preserveAspectRatio="xMidYMid meet"
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 1,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            overflow: 'visible',
          }}
        >
          <defs>
            {mkGrad(`${uid}-l`, GEO.leftEye.cx,  GEO.leftEye.cy,  GEO.leftEye.rx)}
            {mkGrad(`${uid}-r`, GEO.rightEye.cx, GEO.rightEye.cy, GEO.rightEye.rx)}
          </defs>
          <ellipse
            cx={GEO.leftEye.cx}
            cy={GEO.leftEye.cy}
            rx={GEO.leftEye.rx  * eyeScale}
            ry={GEO.leftEye.ry  * eyeScale}
            fill={`url(#${uid}-l)`}
            style={{ transition: 'rx 0.14s ease-out, ry 0.14s ease-out' }}
          />
          <ellipse
            cx={GEO.rightEye.cx}
            cy={GEO.rightEye.cy}
            rx={GEO.rightEye.rx * eyeScale}
            ry={GEO.rightEye.ry * eyeScale}
            fill={`url(#${uid}-r)`}
            style={{ transition: 'rx 0.14s ease-out, ry 0.14s ease-out' }}
          />
        </svg>

        {/* z:2 — Director Assistant porcelain mask on top */}
        <img
          src="/virelle-face.png"
          alt=""
          draggable={false}
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 2,
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            objectPosition: 'center',
            userSelect: 'none',
            pointerEvents: 'none',
            display: 'block',
          }}
        />

        <style>{`
          @keyframes virelle-float {
            0%,100% { transform: translateY(0px) rotate(-0.4deg); }
            50%      { transform: translateY(-12px) rotate(0.4deg); }
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
        border: `1.5px solid ${speaking ? 'rgba(201,168,76,0.75)' : 'rgba(201,168,76,0.35)'}`,
        boxShadow: speaking ? '0 0 10px 2px rgba(201,168,76,0.55)' : '0 0 4px 1px rgba(201,168,76,0.18)',
        transition: 'all 0.3s ease',
      }}
    />
  </div>
);

export default VirelleFace;
