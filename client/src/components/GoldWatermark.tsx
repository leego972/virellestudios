/**
 * Gold VS Logo Watermark — Virelle Studios brand signature
 * Place this component inside any page wrapper for consistent branding.
 * It renders a large, faint gold-tinted VS logo centered in the background.
 */
export default function GoldWatermark({ className = "" }: { className?: string }) {
  return (
    <div className={`fixed inset-0 flex items-center justify-center pointer-events-none z-0 ${className}`}>
      <img
        src="/vs-watermark.png"
        alt=""
        className="w-[400px] h-[400px] sm:w-[500px] sm:h-[500px] lg:w-[600px] lg:h-[600px] object-contain opacity-[0.04]"
        style={{ filter: "sepia(1) saturate(3) brightness(1.1) hue-rotate(10deg)" }}
        draggable={false}
      />
    </div>
  );
}
