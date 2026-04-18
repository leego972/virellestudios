import { Film } from "lucide-react";

/**
 * Cinematic loading states, used in place of generic spinners.
 * All variants share the same gold-on-black aesthetic of the brand.
 */

export function ClapperboardLoader({ label = "Loading scene…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16" role="status" aria-live="polite">
      <div className="relative w-20 h-16">
        {/* Clapper top stick */}
        <div
          className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-r from-primary via-amber-500 to-primary rounded-sm origin-left animate-[clapper_1.4s_ease-in-out_infinite]"
          style={{ transformOrigin: "left center" }}
        />
        {/* Clapper bottom (board) */}
        <div className="absolute bottom-0 left-0 right-0 h-10 bg-zinc-900 border border-primary/40 rounded-sm flex items-center justify-center">
          <Film className="h-5 w-5 text-primary/60" />
        </div>
      </div>
      <p className="text-sm font-serif italic text-primary/70 tracking-wide">{label}</p>
      <style>{`
        @keyframes clapper {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(-22deg); }
        }
      `}</style>
    </div>
  );
}

export function LetterboxedSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3 py-2" role="status" aria-live="polite" aria-label="Loading content">
      <div className="h-1 bg-black -mx-4 sm:-mx-6 lg:-mx-8" />
      <div className="space-y-3 px-1">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div
              className="h-3 rounded bg-gradient-to-r from-primary/5 via-primary/15 to-primary/5 bg-[length:200%_100%] animate-[shimmer_1.6s_ease-in-out_infinite]"
              style={{ width: `${60 + ((i * 17) % 35)}%` }}
            />
            <div
              className="h-3 rounded bg-gradient-to-r from-primary/5 via-primary/15 to-primary/5 bg-[length:200%_100%] animate-[shimmer_1.6s_ease-in-out_infinite]"
              style={{ width: `${40 + ((i * 23) % 40)}%`, animationDelay: `${i * 0.15}s` }}
            />
          </div>
        ))}
      </div>
      <div className="h-1 bg-black -mx-4 sm:-mx-6 lg:-mx-8" />
      <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
    </div>
  );
}

export function ScenePosterSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3" role="status" aria-label="Loading posters">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="aspect-[2/3] rounded-lg overflow-hidden border border-primary/10 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 relative"
          style={{ animationDelay: `${i * 0.08}s` }}
        >
          <div
            className="absolute inset-0 bg-[linear-gradient(110deg,transparent_30%,rgba(212,168,67,0.08)_50%,transparent_70%)] bg-[length:200%_100%] animate-[shimmer_1.6s_ease-in-out_infinite]"
          />
          <div className="absolute bottom-2 left-2 right-2 space-y-1.5">
            <div className="h-2 rounded bg-primary/10" style={{ width: "75%" }} />
            <div className="h-2 rounded bg-primary/5" style={{ width: "50%" }} />
          </div>
        </div>
      ))}
      <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
    </div>
  );
}
