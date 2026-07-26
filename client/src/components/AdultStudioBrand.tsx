import { cn } from "@/lib/utils";

export default function AdultStudioBrand({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("inline-flex items-center gap-3", className)} aria-label="Virelle Studios Adult">
      <img
        src="/virelle-logo-square.png"
        alt="Virelle Studios"
        className={cn(
          "shrink-0 rounded-xl object-contain shadow-[0_0_28px_rgba(212,175,55,0.22)]",
          compact ? "h-11 w-11" : "h-16 w-16 sm:h-20 sm:w-20",
        )}
        draggable={false}
      />
      <div className="min-w-0 leading-none">
        <div
          className={cn(
            "whitespace-nowrap font-black uppercase italic tracking-[-0.055em] text-white",
            compact ? "text-lg" : "text-2xl sm:text-3xl",
          )}
        >
          Virelle <span className="text-amber-300">Studios</span>
        </div>
        <div
          className={cn(
            "-mt-0.5 bg-gradient-to-r from-rose-300 via-red-300 to-amber-300 bg-clip-text pr-3 text-transparent drop-shadow-[0_4px_18px_rgba(239,68,68,0.28)]",
            compact ? "text-2xl" : "text-4xl sm:text-5xl",
          )}
          style={{
            fontFamily:
              '"Brush Script MT", "Segoe Script", "Snell Roundhand", cursive',
            transform: "rotate(-3deg)",
            transformOrigin: "left center",
          }}
        >
          Adult
        </div>
      </div>
    </div>
  );
}
