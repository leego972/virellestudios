import React, { useEffect, useState } from 'react';

    // Eye socket positions — calibrated to virelle-face.png (portrait, 3:4 viewBox)
    // cx/cy are in 0-100 percentage of the portrait face image
    const GEO = {
      leftEye:  { cx: 36, cy: 44, rx: 5.5, ry: 4.2 },
      rightEye: { cx: 64, cy: 44, rx: 5.5, ry: 4.2 },
    };

    type VoiceState = 'idle' | 'inactive' | 'listening' | 'thinking' | 'speaking';

    // Eye colour per state
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

      const eyeOpacity = isActive ? Math.min(0.75 + v * 0.25, 1.0) : 0.60;
      const eyeScale   = isActive ? 1 + v * 0.12 : 0.90;

      const mkGrad = (id: string, cx: number, cy: number, rx: number) => (
        <radialGradient
          key={id}
          id={id}
          cx={cx}
          cy={cy}
          r={rx * 1.6}
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%"   stopColor={color.core}  stopOpacity={eyeOpacity} />
          <stop offset="25%"  stopColor={color.mid}   stopOpacity={eyeOpacity * 0.85} />
          <stop offset="60%"  stopColor={color.outer} stopOpacity={eyeOpacity * 0.40} />
          <stop offset="100%" stopColor={color.outer} stopOpacity="0" />
        </radialGradient>
      );

      return (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{
            position: 'relative',
            width: '72%',
            aspectRatio: '3 / 4',
            animation: 'virelle-float 4.2s ease-in-out infinite',
            filter: isActive
              ? `drop-shadow(0 0 32px ${color.outer}66) drop-shadow(0 8px 48px ${color.outer}44)`
              : 'drop-shadow(0 0 24px rgba(201,168,76,0.18)) drop-shadow(0 8px 40px rgba(201,168,76,0.10))',
            transition: 'filter 0.6s ease',
          }}>

            {/* Gold ambient glow behind mask */}
            <div style={{
              position: 'absolute',
              inset: '-15%',
              background: 'radial-gradient(ellipse 70% 55% at 50% 48%, rgba(201,168,76,0.28) 0%, rgba(180,130,40,0.12) 50%, transparent 75%)',
              filter: 'blur(18px)',
              zIndex: 0,
            }} />

            {/* Mask image — mix-blend-mode:screen cuts the black background out */}
            <img
              src="/virelle-face.png"
              alt=""
              draggable={false}
              style={{
                position: 'relative',
                zIndex: 1,
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                objectPosition: 'center',
                userSelect: 'none',
                pointerEvents: 'none',
                display: 'block',
                mixBlendMode: 'screen',
              }}
            />

            {/* Eye glows — SVG matches the portrait 3:4 aspect ratio of the image */}
            <svg
              viewBox="0 0 100 133"
              preserveAspectRatio="xMidYMid meet"
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 2,
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

              {/* Left eye glow — seated inside the socket */}
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

              {/* Right eye glow — seated inside the socket */}
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
            border: `1.5px solid ${speaking ? 'rgba(201,168,76,0.75)' : 'rgba(201,168,76,0.35)'}`,
            boxShadow: speaking ? '0 0 10px 2px rgba(201,168,76,0.55)' : '0 0 4px 1px rgba(201,168,76,0.18)',
            transition: 'all 0.3s ease',
          }}
        />
      </div>
    );

    export default VirelleFace;
  