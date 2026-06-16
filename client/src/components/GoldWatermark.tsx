/**
   * GoldWatermark — bold golden VS logo background branding.
   */
  export default function GoldWatermark({ className = "" }: { className?: string }) {
    return (
      <div className={`fixed inset-0 flex items-center justify-center pointer-events-none z-0 ${className}`}>
        {/* Dark mode */}
        <img
          src="https://image.pollinations.ai/prompt/Virelle%20Studios%20luxury%20gold%20film%20logo%20icon%2C%20minimalist%20V%20monogram%2C%20black%20background%2C%20ultra-sharp?width=256&height=256&nologo=true&seed=42&model=flux"
          alt=""
          className="hidden dark:block w-[320px] h-[320px] sm:w-[420px] sm:h-[420px] lg:w-[520px] lg:h-[520px] object-contain opacity-[0.18]"
          style={{ filter: "sepia(1) saturate(4.5) brightness(1.15) hue-rotate(6deg) drop-shadow(0 0 24px rgba(212,175,55,0.30))" }}
          draggable={false}
        />
        {/* Light mode */}
        <img
          src="https://image.pollinations.ai/prompt/Virelle%20Studios%20luxury%20gold%20film%20logo%20icon%2C%20minimalist%20V%20monogram%2C%20black%20background%2C%20ultra-sharp?width=256&height=256&nologo=true&seed=42&model=flux"
          alt=""
          className="block dark:hidden w-[320px] h-[320px] sm:w-[420px] sm:h-[420px] lg:w-[520px] lg:h-[520px] object-contain opacity-[0.16]"
          style={{ filter: "sepia(1) saturate(4.0) brightness(1.08) hue-rotate(6deg) drop-shadow(0 0 20px rgba(212,175,55,0.28))" }}
          draggable={false}
        />
      </div>
    );
  }
  