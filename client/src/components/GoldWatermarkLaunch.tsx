import { useEffect } from "react";
import "@/sitewide-visibility.css";

let watermarkObserver: MutationObserver | null = null;
let mountedWatermarkCount = 0;

function synchroniseWatermarks() {
  const watermarks = Array.from(
    document.querySelectorAll<HTMLElement>("[data-virelle-watermark]"),
  );

  watermarks.forEach((watermark, index) => {
    if (index === 0) {
      watermark.removeAttribute("data-virelle-watermark-duplicate");
    } else {
      watermark.setAttribute("data-virelle-watermark-duplicate", "true");
    }
  });
}

export default function GoldWatermarkLaunch({ className = "" }: { className?: string }) {
  useEffect(() => {
    mountedWatermarkCount += 1;
    synchroniseWatermarks();

    if (!watermarkObserver) {
      watermarkObserver = new MutationObserver(synchroniseWatermarks);
      watermarkObserver.observe(document.getElementById("root") ?? document.body, {
        childList: true,
        subtree: true,
      });
    }

    return () => {
      mountedWatermarkCount = Math.max(0, mountedWatermarkCount - 1);
      window.requestAnimationFrame(synchroniseWatermarks);

      if (mountedWatermarkCount === 0) {
        watermarkObserver?.disconnect();
        watermarkObserver = null;
      }
    };
  }, []);

  return (
    <div
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
