/**
 * GoldWatermark — production / launch version.
 * Subtle, toned-down VS logo background branding.
 * Replaces the old louder version; all existing imports automatically
 * inherit the cleaner, more premium treatment.
 */
export default function GoldWatermark({ className = "" }: { className?: string }) {
  return (
    <div className={`fixed inset-0 flex items-center justify-center pointer-events-none z-0 ${className}`}>
      {/* Dark mode: soft golden logo on dark background */}
      <img
        src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663418605762/hxRQQgsmyjgcByim.png"
        alt=""
        className="hidden dark:block w-[320px] h-[320px] sm:w-[420px] sm:h-[420px] lg:w-[520px] lg:h-[520px] object-contain opacity-[0.045]"
        style={{ filter: "sepia(1) saturate(2.6) brightness(1.1) hue-rotate(8deg)" }}
        draggable={false}
      />
      {/* Light mode: very faint golden logo on white */}
      <img
        src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663418605762/hxRQQgsmyjgcByim.png"
        alt=""
        className="block dark:hidden w-[320px] h-[320px] sm:w-[420px] sm:h-[420px] lg:w-[520px] lg:h-[520px] object-contain opacity-[0.05]"
        style={{ filter: "sepia(1) saturate(2.1) brightness(1.02) hue-rotate(8deg) drop-shadow(0 0 1px rgba(0,0,0,0.18))" }}
        draggable={false}
      />
    </div>
  );
}
