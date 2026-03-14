/**
 * Gold VS Logo Watermark — Virelle Studios brand signature
 * Place this component inside any page wrapper for consistent branding.
 * It renders a large, faint gold-tinted VS logo centered in the background.
 * - Dark mode (dark backgrounds): golden logo, naturally visible
 * - Light mode (white backgrounds): golden logo with thin black outline for visibility
 */
export default function GoldWatermark({ className = "" }: { className?: string }) {
  return (
    <div className={`fixed inset-0 flex items-center justify-center pointer-events-none z-0 ${className}`}>
      {/* Dark mode: golden logo on dark background — no outline needed */}
      <img
        src="/virelle-logo-square.png"
        alt=""
        className="hidden dark:block w-[400px] h-[400px] sm:w-[500px] sm:h-[500px] lg:w-[600px] lg:h-[600px] object-contain opacity-[0.07]"
        style={{
          filter: "sepia(1) saturate(4) brightness(1.3) hue-rotate(10deg)",
        }}
        draggable={false}
      />
      {/* Light mode: golden logo with thin black outline for visibility on white */}
      <img
        src="/virelle-logo-square.png"
        alt=""
        className="block dark:hidden w-[400px] h-[400px] sm:w-[500px] sm:h-[500px] lg:w-[600px] lg:h-[600px] object-contain opacity-[0.08]"
        style={{
          filter: "sepia(1) saturate(3) brightness(1.1) hue-rotate(10deg) drop-shadow(0 0 1px rgba(0,0,0,0.6)) drop-shadow(0 0 2px rgba(0,0,0,0.3))",
        }}
        draggable={false}
      />
    </div>
  );
}
