import React from 'react';

export type VState = 'idle' | 'thinking' | 'speaking';

export const VirelleFace = ({
  state = 'idle',
  volume = 0,
}: {
  state?: VState;
  volume?: number;
}) => {
  const jaw = Math.min(Math.max(volume, 0), 1) * 16;
  const HEAD = 'M 200 178 C 250 178 298 198 320 238 C 338 270 342 308 336 348 C 326 398 302 440 274 468 C 252 490 228 502 200 506 C 172 502 148 490 126 468 C 98 440 74 398 64 348 C 58 308 62 270 80 238 C 102 198 150 178 200 178 Z';

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg
        viewBox="0 0 400 540"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          width: '80%',
          maxHeight: '92%',
          animation: 'virelle-float 4.4s ease-in-out infinite',
          filter: 'drop-shadow(0 10px 36px rgba(10,6,4,0.75))',
        }}
      >
        <defs>
          {/* Porcelain face — warm ivory */}
          <radialGradient id="vf-face" cx="40%" cy="28%" r="68%">
            <stop offset="0%"   stopColor="#ffffff" />
            <stop offset="18%"  stopColor="#f4f1ea" />
            <stop offset="52%"  stopColor="#e2ddd4" />
            <stop offset="82%"  stopColor="#c8c2b6" />
            <stop offset="100%" stopColor="#b0a898" />
          </radialGradient>

          {/* Specular highlight — porcelain sheen */}
          <radialGradient id="vf-spec" cx="34%" cy="20%" r="28%">
            <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.90" />
            <stop offset="65%"  stopColor="#ffffff" stopOpacity="0.10" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.00" />
          </radialGradient>

          {/* Beret felt texture gradient */}
          <radialGradient id="vf-beret" cx="45%" cy="35%" r="65%">
            <stop offset="0%"   stopColor="#2a2826" />
            <stop offset="55%"  stopColor="#1a1816" />
            <stop offset="100%" stopColor="#0e0c0b" />
          </radialGradient>

          {/* Beret highlight */}
          <radialGradient id="vf-beret-hi" cx="38%" cy="30%" r="40%">
            <stop offset="0%"   stopColor="#484440" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#484440" stopOpacity="0.00" />
          </radialGradient>

          {/* Leather band */}
          <linearGradient id="vf-band" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%"   stopColor="#2e2a26" />
            <stop offset="50%"  stopColor="#1a1612" />
            <stop offset="100%" stopColor="#2a2620" />
          </linearGradient>

          {/* Rose petal red */}
          <radialGradient id="vf-rose" cx="40%" cy="35%" r="60%">
            <stop offset="0%"   stopColor="#cc2020" />
            <stop offset="60%"  stopColor="#9a1010" />
            <stop offset="100%" stopColor="#6a0808" />
          </radialGradient>

          {/* Raised face surface (nose, lips) */}
          <linearGradient id="vf-raise" x1="0%" y1="0%" x2="10%" y2="100%">
            <stop offset="0%"   stopColor="#eeebe4" />
            <stop offset="100%" stopColor="#c8c2b4" />
          </linearGradient>
        </defs>

        {/* ── BERET DOME ───────────────────────────── */}
        <path
          d="M 34 170
             C 38 102 85 34 200 22
             C 315 34 362 102 366 170
             Z"
          fill="url(#vf-beret)"
        />
        {/* Felt sheen */}
        <path
          d="M 34 170 C 38 102 85 34 200 22 C 315 34 362 102 366 170 Z"
          fill="url(#vf-beret-hi)"
        />
        {/* Button stem at very top */}
        <ellipse cx="200" cy="24" rx="5" ry="4" fill="#1a1614" />
        <line x1="200" y1="20" x2="200" y2="12" stroke="#1a1614" strokeWidth="3" strokeLinecap="round" />
        <circle cx="200" cy="10" r="4" fill="#252220" />

        {/* ── LEATHER BAND ─────────────────────────── */}
        <path
          d="M 30 162
             C 50 178 130 190 200 190
             C 270 190 350 178 370 162
             L 366 170
             C 346 186 268 198 200 198
             C 132 198 54 186 34 170
             Z"
          fill="url(#vf-band)"
        />
        {/* Band top edge highlight */}
        <path
          d="M 32 163 C 52 176 132 188 200 188 C 268 188 348 176 368 163"
          fill="none" stroke="#4a4540" strokeWidth="1.2" opacity="0.7"
        />

        {/* ── VIRELLE STUDIOS GOLD TEXT ─────────────── */}
        <text
          x="178" y="180"
          textAnchor="middle"
          fill="#b8920a"
          fontSize="19"
          fontFamily="Georgia, 'Times New Roman', serif"
          fontWeight="700"
          letterSpacing="2.5"
          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
        >
          VIRELLE STUDIOS
        </text>

        {/* ── RED ROSE (right side of beret) ───────── */}
        <g transform="translate(308, 138)">
          {/* Outer petals — 7 petals */}
          {[0, 51, 103, 154, 206, 257, 309].map((deg, i) => (
            <path
              key={i}
              d="M 0,-36 C -16,-40 -26,-26 -22,-10 C -18,4 -7,13 0,14 C 7,13 18,4 22,-10 C 26,-26 16,-40 0,-36 Z"
              fill={i < 4 ? '#c82222' : '#b01c1c'}
              transform={`rotate(${deg})`}
            />
          ))}
          {/* Mid petals — 5 petals */}
          {[20, 92, 164, 236, 308].map((deg, i) => (
            <path
              key={i}
              d="M 0,-22 C -10,-26 -17,-16 -13,-5 C -9,5 -3,11 0,12 C 3,11 9,5 13,-5 C 17,-16 10,-26 0,-22 Z"
              fill="#9a1616"
              transform={`rotate(${deg})`}
            />
          ))}
          {/* Inner core */}
          <circle r="10" fill="#6e0e0e" />
          <circle r="5"  fill="#3d0606" />
          {/* Rose highlight */}
          <ellipse cx="-3" cy="-5" rx="5" ry="4" fill="#e03030" fillOpacity="0.45" transform="rotate(-20)" />
        </g>

        {/* ── FACE BASE ────────────────────────────── */}
        <path d={HEAD} fill="url(#vf-face)" />
        <path d={HEAD} fill="url(#vf-spec)" />

        {/* ── EYE SOCKETS — graceful almond ────────── */}
        {/* Left socket */}
        <path
          d="M 112 308 C 124 290 144 282 164 290 C 180 296 188 310 178 322 C 164 332 128 330 116 320 Z"
          fill="#08080c"
          stroke="#c8c0b0" strokeWidth="1.8"
        />
        {/* Right socket */}
        <path
          d="M 288 308 C 276 290 256 282 236 290 C 220 296 212 310 222 322 C 236 332 272 330 284 320 Z"
          fill="#08080c"
          stroke="#c8c0b0" strokeWidth="1.8"
        />

        {/* ── NOSE — subtle, feminine ───────────────── */}
        <path
          d="M 193 292 C 190 316 188 340 190 358 C 191 366 196 372 200 374"
          fill="none" stroke="#b8b2a8" strokeWidth="1.3" strokeLinecap="round"
        />
        <path
          d="M 207 292 C 210 316 212 340 210 358 C 209 366 204 372 200 374"
          fill="none" stroke="#b8b2a8" strokeWidth="1.3" strokeLinecap="round"
        />
        {/* Nose tip */}
        <path
          d="M 184 368 C 184 378 190 384 200 386 C 210 384 216 378 216 368 C 213 365 210 367 208 372 C 205 377 200 378 200 378 C 200 378 195 377 192 372 C 190 367 187 365 184 368 Z"
          fill="url(#vf-raise)" stroke="#b0a898" strokeWidth="0.7"
        />
        {/* Nostrils — very subtle */}
        <ellipse cx="191" cy="374" rx="4.2" ry="3.2" fill="#0e0e14" fillOpacity="0.55" transform="rotate(-10,191,374)" />
        <ellipse cx="209" cy="374" rx="4.2" ry="3.2" fill="#0e0e14" fillOpacity="0.55" transform="rotate(10,209,374)" />

        {/* ── NASOLABIAL FOLDS (gentle) ─────────────── */}
        <path d="M 184 370 C 176 388 174 406 176 420" fill="none" stroke="#b0a898" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
        <path d="M 216 370 C 224 388 226 406 224 420" fill="none" stroke="#b0a898" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />

        {/* ── SMILE LINE / UPPER LIP ───────────────── */}
        {/* Gentle upward smile — the signature expression */}
        <path
          d="M 170 424 C 180 418 190 414 200 416 C 210 414 220 418 230 424 C 220 428 210 430 200 430 C 190 430 180 428 170 424 Z"
          fill="url(#vf-raise)" stroke="#a8a098" strokeWidth="0.8"
        />
        {/* Philtrum */}
        <path d="M 197 416 C 199 412 201 412 203 416" fill="none" stroke="#b0a898" strokeWidth="1.1" strokeLinecap="round" />
        {/* Smile corners — the subtle upward curve */}
        <path d="M 170 424 C 165 420 163 416 166 414" fill="none" stroke="#a8a098" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M 230 424 C 235 420 237 416 234 414" fill="none" stroke="#a8a098" strokeWidth="1.2" strokeLinecap="round" />

        {/* Mouth gap — opens with volume */}
        <ellipse
          cx="200" cy="431"
          rx={6 + jaw * 0.7}
          ry={1.2 + jaw * 0.42}
          fill="#08080c"
        />

        {/* ── JAW GROUP — drops with volume ────────── */}
        <g transform={`translate(0,${jaw})`} style={{ transition: 'transform 0.04s linear' }}>
          {/* Lower lip */}
          <path
            d="M 172 436 C 182 444 190 448 200 450 C 210 448 218 444 228 436 C 220 446 210 452 200 454 C 190 452 180 446 172 436 Z"
            fill="url(#vf-raise)" stroke="#a8a098" strokeWidth="0.8"
          />
          {/* Chin */}
          <path
            d="M 168 460 C 170 480 180 498 200 506 C 220 498 230 480 232 460 C 222 470 212 476 200 476 C 188 476 178 470 168 460 Z"
            fill="url(#vf-raise)"
          />
          {/* Chin highlight */}
          <ellipse cx="200" cy="492" rx="20" ry="9" fill="#ffffff" fillOpacity="0.16" />
        </g>

        {/* ── PORCELAIN SPECULAR HIGHLIGHTS ────────── */}
        {/* Main forehead sheen */}
        <ellipse cx="172" cy="224" rx="52" ry="38" fill="#ffffff" fillOpacity="0.28" transform="rotate(-8,172,224)" />
        {/* Left cheek shine */}
        <ellipse cx="116" cy="350" rx="28" ry="18" fill="#ffffff" fillOpacity="0.16" transform="rotate(-22,116,350)" />
        {/* Right cheek shine */}
        <ellipse cx="284" cy="350" rx="28" ry="18" fill="#ffffff" fillOpacity="0.16" transform="rotate(22,284,350)" />
        {/* Nose bridge glint */}
        <rect x="197" y="300" width="6" height="58" rx="3" fill="#ffffff" fillOpacity="0.14" />
        {/* Small highlight clusters (porcelain facets) */}
        <ellipse cx="155" cy="255" rx="7" ry="5" fill="#ffffff" fillOpacity="0.32" transform="rotate(-15,155,255)" />
        <ellipse cx="230" cy="242" rx="6" ry="4" fill="#ffffff" fillOpacity="0.25" transform="rotate(10,230,242)" />
        <ellipse cx="196" cy="208" rx="8" ry="5" fill="#ffffff" fillOpacity="0.22" transform="rotate(-5,196,208)" />

        <style>{`
          @keyframes virelle-float {
            0%,100% { transform: translateY(0px)  rotate(0deg);   }
            38%     { transform: translateY(-9px)  rotate(-0.25deg); }
            68%     { transform: translateY(-4px)  rotate(0.18deg); }
          }
        `}</style>
      </svg>
    </div>
  );
};

/* ── Compact avatar for chat bubbles ──────────────── */
export const VirelleFaceAvatar = ({ speaking = false }: { speaking?: boolean }) => (
  <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
    <defs>
      <radialGradient id="va-face" cx="40%" cy="35%" r="60%">
        <stop offset="0%"   stopColor="#ffffff" />
        <stop offset="55%"  stopColor="#e4e0d8" />
        <stop offset="100%" stopColor="#c0bab0" />
      </radialGradient>
      <radialGradient id="va-beret" cx="42%" cy="38%" r="60%">
        <stop offset="0%"   stopColor="#2a2826" />
        <stop offset="100%" stopColor="#0e0c0a" />
      </radialGradient>
    </defs>
    {/* Beret dome */}
    <path d="M 8 46 C 10 22 36 6 50 5 C 64 6 90 22 92 46 Z" fill="url(#va-beret)" />
    {/* Band */}
    <path d="M 6 43 C 20 52 38 55 50 55 C 62 55 80 52 94 43 L 92 46 C 78 56 62 59 50 59 C 38 59 22 56 8 46 Z" fill="#141210" />
    {/* Gold text — simplified */}
    <text x="50" y="51" textAnchor="middle" fill="#b8900a" fontSize="5.5" fontFamily="Georgia, serif" fontWeight="700" letterSpacing="0.5">VIRELLE STUDIOS</text>
    {/* Rose — right side */}
    <circle cx="80" cy="34" r="9" fill="#8a1010" />
    <circle cx="80" cy="34" r="6" fill="#b01818" />
    <circle cx="80" cy="34" r="3" fill="#6a0808" />
    <ellipse cx="78" cy="31" rx="3" ry="2" fill="#e03030" fillOpacity="0.4" />
    {/* Face */}
    <ellipse cx="50" cy="76" rx="28" ry="30" fill="url(#va-face)" />
    {/* Eyes */}
    <path d="M 33 70 C 37 65 43 63 48 66 C 51 68 52 72 48 75 C 43 78 34 77 33 73 Z" fill="#08080c" />
    <path d="M 67 70 C 63 65 57 63 52 66 C 49 68 48 72 52 75 C 57 78 66 77 67 73 Z" fill="#08080c" />
    {/* Smile */}
    <path d="M 40 90 Q 50 97 60 90" fill="none" stroke="#b0a898" strokeWidth="1.8" strokeLinecap="round" />
    {/* Speaking pulse */}
    {speaking && <ellipse cx="50" cy="92" rx="7" ry="2" fill="#c8a050" fillOpacity="0.45"><animate attributeName="rx" values="5;9;5" dur="0.5s" repeatCount="indefinite" /><animate attributeName="fillOpacity" values="0.45;0.1;0.45" dur="0.5s" repeatCount="indefinite" /></ellipse>}
    {/* Forehead highlight */}
    <ellipse cx="44" cy="64" rx="10" ry="7" fill="#ffffff" fillOpacity="0.30" transform="rotate(-10,44,64)" />
  </svg>
);
