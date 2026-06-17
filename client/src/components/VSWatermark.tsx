export default function VSWatermark({ className = "" }: { className?: string }) {
    return (
      <div
        className={`fixed inset-0 flex items-center justify-center pointer-events-none select-none ${className}`}
        style={{ zIndex: 0 }}
        aria-hidden="true"
      >
        <img
          src="/virelle-logo-square.png"
          alt=""
          className="w-[320px] h-[320px] sm:w-[440px] sm:h-[440px] lg:w-[560px] lg:h-[560px] object-contain opacity-[0.18]"
          draggable={false}
        />
      </div>
    );
  }
  