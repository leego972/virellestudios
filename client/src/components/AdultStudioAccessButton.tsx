import { ShieldCheck } from "lucide-react";
import { useLocation } from "wouter";

const ADULT_STUDIO_ICON = "/icons/tools/visual_effects.svg";

export default function AdultStudioAccessButton() {
  const [, setLocation] = useLocation();

  return (
    <button
      type="button"
      onClick={() => setLocation("/adult-studio")}
      aria-label="Begin Adult Studio verification"
      className="group w-full rounded-2xl border border-amber-500/15 bg-black/20 p-4 text-left transition-all hover:border-amber-500/30 hover:bg-amber-500/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-500/20 bg-black/40">
          <img
            src={ADULT_STUDIO_ICON}
            alt=""
            className="h-7 w-7 object-contain opacity-80"
            draggable={false}
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-foreground">Adult Studio</span>
            <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-400">
              18+ verified access
            </span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Complete age, identity, eligibility, terms and membership verification before access is activated.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-amber-400 transition-colors group-hover:text-amber-300">
          <ShieldCheck className="h-4 w-4" />
          Begin verification
        </div>
      </div>
    </button>
  );
}
