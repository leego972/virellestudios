export default function GoldWatermarkLaunch({ className = "" }: { className?: string }) {
  return (
    <div
      className={`fixed inset-0 flex items-center justify-center pointer-events-none select-none ${className}`}
      style={{ zIndex: 0 }}
      aria-hidden="true"
    >
      {/* Dark mode — rich gold */}
      <img
        src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663418605762/hxRQQgsmyjgcByim.png"
        alt=""
        className="hidden dark:block object-contain"
        style={{
          width: "clamp(340px, 45vw, 620px)",
          height: "clamp(340px, 45vw, 620px)",
          opacity: 0.07,
          filter: "sepia(1) saturate(3.5) brightness(1.25) hue-rotate(5deg)",
        }}
        draggable={false}
      />
      {/* Light mode — warm gold with subtle shadow */}
      <img
        src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663418605762/hxRQQgsmyjgcByim.png"
        alt=""
        className="block dark:hidden object-contain"
        style={{
          width: "clamp(340px, 45vw, 620px)",
          height: "clamp(340px, 45vw, 620px)",
          opacity: 0.06,
          filter: "sepia(1) saturate(3.0) brightness(1.1) hue-rotate(5deg) drop-shadow(0 0 2px rgba(0,0,0,0.12))",
        }}
        draggable={false}
      />
    </div>
  );
}
