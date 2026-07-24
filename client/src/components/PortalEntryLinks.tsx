import { trpc } from "@/lib/trpc";
import { LogIn, UserPlus } from "lucide-react";

export default function PortalEntryLinks() {
  const me = trpc.auth.me.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });
  const path = typeof window === "undefined" ? "" : window.location.pathname;
  if ((path !== "/" && path !== "/welcome") || me.data) return null;

  return (
    <div
      className="fixed right-3 top-[82px] z-40 flex max-w-[calc(100vw-1.5rem)] items-center gap-1 rounded-full border border-amber-400/25 bg-black/80 p-1 shadow-lg shadow-black/35 backdrop-blur-xl sm:right-6 sm:top-[86px]"
      aria-label="Designer access"
    >
      <a
        href="/login?designer=1"
        className="inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-amber-400/30 px-2.5 text-[11px] font-bold tracking-wide text-amber-200 transition-all hover:border-amber-300/60 hover:bg-amber-400/10 hover:text-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70 sm:px-3"
      >
        <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="sm:hidden">Login</span>
        <span className="hidden sm:inline">Designer login</span>
      </a>

      <a
        href="/designer-register"
        className="inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-2.5 text-[11px] font-black tracking-wide text-black shadow-sm shadow-amber-500/20 transition-all hover:from-amber-400 hover:to-orange-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 sm:px-3"
      >
        <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="sm:hidden">Join</span>
        <span className="hidden sm:inline">Designer signup</span>
      </a>
    </div>
  );
}
