import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Home, Search, ArrowLeft, Compass, Film, DollarSign, Sparkles } from "lucide-react";
import SiteHead from "@/components/SiteHead";

export default function NotFound() {
  const [pathname] = useLocation();
  const suggestions = [
    { to: "/", label: "Dashboard", icon: Home },
    { to: "/projects", label: "My Projects", icon: Film },
    { to: "/funding", label: "Funding Directory", icon: DollarSign },
    { to: "/showcase", label: "Public Showcase", icon: Sparkles },
  ];
  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden" style={{ background:"linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)" }}>
      <SiteHead title="Page not found" description="The page you were looking for can't be found." noindex />
      {/* Subtle film-grain backdrop */}
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 20% 30%, rgba(168,85,247,0.4), transparent 40%), radial-gradient(circle at 80% 70%, rgba(236,72,153,0.3), transparent 40%)" }} />
      <div className="max-w-xl w-full text-center space-y-6 relative z-10">
        <div className="text-[120px] leading-none font-bold bg-gradient-to-br from-violet-400 via-pink-400 to-amber-300 bg-clip-text text-transparent">404</div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight gradient-text-gold">Scene not found</h1>
          <p className="text-muted-foreground text-sm">We couldn't locate <code className="px-1.5 py-0.5 rounded bg-muted text-xs">{pathname}</code>. The page may have moved, been renamed, or never existed.</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button onClick={() => window.history.back()} variant="outline" size="sm"><ArrowLeft className="h-4 w-4 mr-1.5" />Go back</Button>
          <Link href="/"><Button size="sm"><Home className="h-4 w-4 mr-1.5" />Take me home</Button></Link>
          <Button variant="outline" size="sm" onClick={() => { const ev = new KeyboardEvent("keydown", { key: "k", metaKey: true, ctrlKey: true }); window.dispatchEvent(ev); }}><Search className="h-4 w-4 mr-1.5" />Open command palette</Button>
        </div>
        <div className="pt-6 border-t border-border/40">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3 flex items-center justify-center gap-1.5"><Compass className="h-3.5 w-3.5" />Quick destinations</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {suggestions.map(s => {
              const Icon = s.icon;
              return (
                <Link key={s.to} href={s.to}>
                  <button className="w-full px-3 py-3 rounded-lg border border-border/60 hover:border-violet-500/50 hover:bg-violet-500/5 transition-colors flex flex-col items-center gap-1.5">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs">{s.label}</span>
                  </button>
                </Link>
              );
            })}
          </div>
        </div>
        <div className="text-[11px] text-muted-foreground pt-4">Tip: press <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border/50 text-[10px]">⌘ K</kbd> or <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border/50 text-[10px]">/</kbd> anywhere on the site to jump to any page.</div>
      </div>
    </div>
  );
}
