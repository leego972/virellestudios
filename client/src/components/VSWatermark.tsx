export default function VSWatermark({ className = "" }: { className?: string }) {
    return (
      <div
        className={`fixed inset-0 flex items-center justify-center pointer-events-none select-none ${className}`}
        style={{ zIndex: 0 }}
        aria-hidden="true"
      >
        <img
          src="/vs-wm-dark.png"
          alt=""
          className="hidden dark:block w-[320px] h-[320px] sm:w-[440px] sm:h-[440px] lg:w-[560px] lg:h-[560px] object-contain opacity-[0.18]"
          draggable={false}
        />
        <img
          src="/vs-wm-light.png"
          alt=""
          className="block dark:hidden w-[320px] h-[320px] sm:w-[440px] sm:h-[440px] lg:w-[560px] lg:h-[560px] object-contain opacity-[0.16]"
          draggable={false}
        />
      </div>
    );
  }
  