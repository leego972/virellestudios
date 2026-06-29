export default function GoldWatermarkLaunch({ className = "" }: { className?: string }) {
    return (
      <div
        className={`fixed inset-0 pointer-events-none select-none overflow-hidden ${className}`}
        style={{ zIndex: 0 }}
        aria-hidden="true"
      >
        {/* Ambient gold background glow */}
        <div
          className="absolute inset-0 dark:hidden"
          style={{
            background:
              "radial-gradient(circle at 50% 50%, rgba(212,175,55,0.22) 0%, rgba(212,175,55,0.10) 40%, transparent 70%)",
          }}
        />
        <div
          className="absolute inset-0 hidden dark:block"
          style={{
            background:
              "radial-gradient(circle at 50% 50%, rgba(212,175,55,0.18) 0%, rgba(212,175,55,0.08) 40%, transparent 70%), linear-gradient(135deg, rgba(255,255,255,0.96) 0%, rgba(255,250,235,0.90) 50%, rgba(212,175,55,0.12) 100%)",
          }}
        />

        {/* Full-page centered watermark logo */}
        <div className="absolute inset-0 flex items-center justify-center">
          <img
            src="/virelle-logo-square.png"
            alt=""
            className="hidden dark:block object-contain"
            style={{
              width: "min(80vw, 80vh)",
              height: "min(80vw, 80vh)",
              opacity: 0.45,
              filter:
                "sepia(1) saturate(5.5) brightness(1.15) hue-rotate(6deg) drop-shadow(0 0 60px rgba(212,175,55,0.45))",
            }}
            draggable={false}
          />
          <img
            src="/virelle-logo-square.png"
            alt=""
            className="block dark:hidden object-contain"
            style={{
              width: "min(80vw, 80vh)",
              height: "min(80vw, 80vh)",
              opacity: 0.38,
              filter:
                "sepia(1) saturate(6.0) brightness(1.35) hue-rotate(6deg) drop-shadow(0 0 70px rgba(212,175,55,0.55))",
            }}
            draggable={false}
          />
        </div>
      </div>
    );
  }
  