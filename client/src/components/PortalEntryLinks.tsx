import { trpc } from "@/lib/trpc";
import { Store } from "lucide-react";

export default function PortalEntryLinks() {
  const me = trpc.auth.me.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });
  if (typeof window === "undefined" || window.location.pathname !== "/" || me.data) return null;

  return (
    <div className="fixed right-3 sm:right-6 top-[82px] z-40 rounded-2xl border border-amber-500/30 bg-black/90 backdrop-blur-xl shadow-2xl shadow-black/50 p-2 flex items-center gap-2">
      <div className="hidden lg:flex items-center gap-2 px-2 text-[11px] font-semibold text-white/55">
        <Store className="h-3.5 w-3.5 text-amber-400" />
        Designer portal
      </div>
      <a
        href="/login?designer=1"
        className="rounded-lg border border-amber-500/30 px-3 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/10 transition-colors"
      >
        Designer login
      </a>
      <a
        href="/designer-register"
        className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-black text-black hover:bg-amber-400 transition-colors"
      >
        Designer signup
      </a>
    </div>
  );
}
