import React from 'react';

  const JAW_CUT = 74;

  export const VirelleFace = ({
    volume = 0,
    speaking = false,
  }: {
    volume?: number;
    speaking?: boolean;
  }) => {
    const jawDrop = Math.min(Math.max(volume, 0), 1) * 18;
    const eyeOpacity = speaking ? 0.65 : 0.45;

    return (
      <div
        style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <div
          style={{
            position: 'relative',
            width: '72%',
            aspectRatio: '1 / 1',
            animation: 'virelle-float 4.2s ease-in-out infinite',
            filter: 'drop-shadow(0 8px 36px rgba(200,180,160,0.35))',
          }}
        >
          {/* Dark mouth gap backing */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(ellipse 50% 30% at 50% 78%, #1a0808 0%, #0a0808 100%)',
            borderRadius: '50%',
          }} />

          {/* Upper face */}
          <img
            src="/virelle-face.png"
            alt=""
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%',
              objectFit: 'cover',
              clipPath: `inset(0 0 ${100 - JAW_CUT}% 0)`,
              userSelect: 'none', pointerEvents: 'none',
            }}
          />

          {/* Lower jaw */}
          <img
            src="/virelle-face.png"
            alt=""
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%',
              objectFit: 'cover',
              clipPath: `inset(${JAW_CUT}% 0 0 0)`,
              transform: `translateY(${jawDrop}px)`,
              transition: 'transform 0.07s ease-out',
              userSelect: 'none', pointerEvents: 'none',
            }}
          />

          {/* LEFT eye glow — soft rose-gold */}
          <div style={{
            position: 'absolute',
            top: '38%', left: '24%',
            width: '20%', height: '9%',
            background: 'radial-gradient(ellipse, #fff8f0 0%, #e8c8a055 30%, transparent 75%)',
            opacity: eyeOpacity,
            mixBlendMode: 'screen',
            pointerEvents: 'none',
            transition: 'opacity 0.5s ease',
            filter: 'blur(4px)',
          }} />

          {/* RIGHT eye glow */}
          <div style={{
            position: 'absolute',
            top: '38%', right: '24%',
            width: '20%', height: '9%',
            background: 'radial-gradient(ellipse, #fff8f0 0%, #e8c8a055 30%, transparent 75%)',
            opacity: eyeOpacity,
            mixBlendMode: 'screen',
            pointerEvents: 'none',
            transition: 'opacity 0.5s ease',
            filter: 'blur(4px)',
          }} />

          {/* Soft ivory rim */}
          <div style={{
            position: 'absolute', inset: 0,
            borderRadius: '50%',
            boxShadow: 'inset 0 0 30px 6px rgba(255,248,240,0.10), 0 0 50px 10px rgba(212,180,150,0.18)',
            pointerEvents: 'none',
          }} />
        </div>
      </div>
    );
  };

  // Compact 28px avatar for chat bubbles
  export const VirelleFaceAvatar = ({ speaking = false }: { speaking?: boolean }) => (
    <div style={{ position: 'relative', width: 28, height: 28, flexShrink: 0 }}>
      <img
        src="/virelle-face.png"
        alt="Virelle"
        style={{
          width: '100%', height: '100%',
          objectFit: 'cover',
          borderRadius: '50%',
          border: '1.5px solid rgba(212,180,150,0.50)',
          boxShadow: speaking ? '0 0 8px 2px rgba(212,180,150,0.55)' : '0 0 4px 1px rgba(212,180,150,0.25)',
          transition: 'box-shadow 0.3s ease',
        }}
      />
    </div>
  );

  export default VirelleFace;
  