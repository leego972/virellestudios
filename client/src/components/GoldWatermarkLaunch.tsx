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
              "radial-gradient(circle at 50% 18%, rgba(212,175,55,0.32) 0%, rgba(212,175,55,0.15) 26%, rgba(9,7,3,0.00) 58%), linear-gradient(135deg, rgba(212,175,55,0.14) 0%, rgba(0,0,0,0.00) 38%, rgba(212,175,55,0.10) 100%)",
          }}
        />
        <div
          className="absolute inset-0 hidden dark:block"
          style={{
            background:
              "radial-gradient(circle at 50% 18%, rgba(212,175,55,0.22) 0%, rgba(212,175,55,0.10) 30%, rgba(255,255,255,0.00) 62%), linear-gradient(135deg, rgba(255,255,255,0.96) 0%, rgba(255,250,235,0.90) 48%, rgba(212,175,55,0.14) 100%)",
          }}
        />

        {/* Center watermark — bold golden VS logo */}
        <div className="absolute inset-0 flex items-center justify-center">
          <img
            src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663418605762/hxRQQgsmyjgcByim.png"
            alt=""
            className="hidden dark:block object-contain"
            style={{
              width: "clamp(360px, 48vw, 680px)",
              height: "clamp(360px, 48vw, 680px)",
              opacity: 0.22,
              filter:
                "sepia(1) saturate(4.5) brightness(1.12) hue-rotate(6deg) drop-shadow(0 0 28px rgba(212,175,55,0.30))",
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
              opacity: 0.20,
              filter:
                "sepia(1) saturate(4.8) brightness(1.30) hue-rotate(6deg) drop-shadow(0 0 32px rgba(212,175,55,0.35))",
            }}
            draggable={false}
          />
        </div>
      </div>
    );
  }
  