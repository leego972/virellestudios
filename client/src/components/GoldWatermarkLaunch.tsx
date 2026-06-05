export default function GoldWatermarkLaunch({ className = "" }: { className?: string }) {
  return (
    <div
      className={`fixed inset-0 pointer-events-none select-none overflow-hidden ${className}`}
      style={{ zIndex: 0 }}
      aria-hidden="true"
    >
      {/* Global cinematic background wash. In this codebase `.dark` is currently the white/light visual mode. */}
      <div
        className="absolute inset-0 dark:hidden"
        style={{
          background:
            "radial-gradient(circle at 50% 18%, rgba(212,175,55,0.24) 0%, rgba(212,175,55,0.11) 26%, rgba(9,7,3,0.00) 58%), linear-gradient(135deg, rgba(212,175,55,0.10) 0%, rgba(0,0,0,0.00) 38%, rgba(212,175,55,0.075) 100%)",
        }}
      />
      <div
        className="absolute inset-0 hidden dark:block"
        style={{
          background:
            "radial-gradient(circle at 50% 18%, rgba(212,175,55,0.18) 0%, rgba(212,175,55,0.075) 30%, rgba(255,255,255,0.00) 62%), linear-gradient(135deg, rgba(255,255,255,0.96) 0%, rgba(255,250,235,0.90) 48%, rgba(212,175,55,0.105) 100%)",
        }}
      />

      {/* Center watermark — intentionally visible in both modes without blocking UI. */}
      <div className="absolute inset-0 flex items-center justify-center">
        <img
          src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663418605762/hxRQQgsmyjgcByim.png"
          alt=""
          className="hidden dark:block object-contain"
          style={{
            width: "clamp(360px, 48vw, 680px)",
            height: "clamp(360px, 48vw, 680px)",
            opacity: 0.12,
            filter:
              "sepia(1) saturate(3.2) brightness(1.08) hue-rotate(4deg) drop-shadow(0 0 18px rgba(212,175,55,0.18))",
          }}
          draggable={false}
        />
        <img
          src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663418605762/hxRQQgsmyjgcByim.png"
          alt=""
          className="block dark:hidden object-contain"
          style={{
            width: "clamp(360px, 48vw, 680px)",
            height: "clamp(360px, 48vw, 680px)",
            opacity: 0.105,
            filter:
              "sepia(1) saturate(3.8) brightness(1.35) hue-rotate(4deg) drop-shadow(0 0 22px rgba(212,175,55,0.22))",
          }}
          draggable={false}
        />
      </div>
    </div>
  );
}
