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
      className="group w-full overflow-hidden rounded-2xl border border-amber-500/15 bg-black/20 p-4 text-left transition-all hover:border-amber-500/30 hover:bg-amber-500/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 sm:p-5"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 items-start gap-3 sm:flex-1 sm:items-center">
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
            <div className="flex flex-col items-start gap-2 min-[430px]:flex-row min-[430px]:items-center">
              <span className="text-base font-semibold leading-tight text-foreground">
                Adult Studio
              </span>
              <span className="max-w-full rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[10px] font-semibold uppercase leading-none tracking-wide text-amber-400">
                18+ verified access
              </span>
            </div>
            <p className="mt-2 break-words text-xs leading-5 text-muted-foreground">
              Complete age, identity, eligibility, terms and membership verification before access is activated.
            </p>
          </div>
        </div>

        <div className="flex w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-400 transition-colors group-hover:bg-amber-500/15 group-hover:text-amber-300 sm:w-auto sm:justify-start">
          <ShieldCheck className="h-4 w-4 shrink-0" />
          <span className="whitespace-nowrap">Begin verification</span>
        </div>
      </div>
    </button>
  );
}
