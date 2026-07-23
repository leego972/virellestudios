import { useEffect, useRef } from "react";

function suppressDuplicateWatermarks() {
  const watermarks = Array.from(
    document.querySelectorAll<HTMLElement>("[data-virelle-watermark]"),
  );

  watermarks.forEach((watermark, index) => {
    watermark.style.display = index === 0 ? "" : "none";
  });
}

export default function GoldWatermarkLaunch({ className = "" }: { className?: string }) {
  const watermarkRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    suppressDuplicateWatermarks();

    return () => {
      if (watermarkRef.current) watermarkRef.current.style.display = "";
      window.requestAnimationFrame(suppressDuplicateWatermarks);
    };
  }, []);

  return (
    <div
      ref={watermarkRef}
      data-virelle-watermark
      className={`fixed inset-0 pointer-events-none select-none overflow-hidden ${className}`}
      style={{ zIndex: 0 }}
      aria-hidden="true"
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 48%, rgba(212,175,55,0.045) 0%, rgba(212,175,55,0.018) 38%, transparent 68%)",
        }}
      />

      <div className="absolute inset-0 flex items-center justify-center">
        <img
          src="/virelle-logo-square.png"
          alt=""
          className="object-contain"
          style={{
            width: "min(68vw, 68vh)",
            height: "min(68vw, 68vh)",
            opacity: 0.055,
            filter: "sepia(1) saturate(4.5) brightness(1.05) hue-rotate(6deg)",
          }}
          draggable={false}
        />
      </div>
    </div>
  );
}
