import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Sparkles, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "vs_whatsnew_dismissed_v5";

const HIGHLIGHTS = [
  { tag: "v5", title: "Press ⌘K anywhere to jump to any page", body: "A unified search palette across all 100+ pages with grouped commands and recent items.", to: null as string | null },
  { tag: "v4", title: "AI Funding Match & Application Tracker", body: "Score every funder against your project, shortlist favorites, and track applications across all your projects.", to: "/funding-pro" },
  { tag: "v3", title: "Studio approvals + budget tracker + Director Savings", body: "3-tier sign-off chain (director → producer → exec), 5-stage budget allocation, and a hero card showing $ saved vs traditional production.", to: "/pro-studio-ops" },
  { tag: "v2", title: "Scene locks, render cost forecasting, Run Now per job", body: "Lock scenes from edits during sign-off, see cost forecast before you generate, and re-run any queued job on demand.", to: "/pro-studio-ops" },
  { tag: "v1", title: "Render Queue, Live Presence, Studio Dashboard", body: "Server-enforced render queue, live presence indicators, bulk operations, and an NLE-style keyboard shortcut layer.", to: "/pro-studio-ops" },
];

export default function WhatsNewPanel() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    try { setOpen(!localStorage.getItem(STORAGE_KEY)); } catch { setOpen(true); }
  }, []);
  const dismiss = () => { try { localStorage.setItem(STORAGE_KEY, String(Date.now())); } catch {} setOpen(false); };
  if (!open) return null;
  return (
    <div className="rounded-xl" style={{ border:"1px solid rgba(212,175,55,0.25)", background:"linear-gradient(135deg,rgba(212,175,55,0.06) 0%,rgba(255,255,255,0.01) 100%)" }}>
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-violet-500/20 blur-3xl pointer-events-none" />
      <button onClick={dismiss} className="absolute top-2 right-2 h-7 w-7 rounded-md hover:bg-white/10 flex items-center justify-center text-muted-foreground" aria-label="Dismiss">
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-violet-400" />
        <h3 className="text-sm font-semibold tracking-tight gradient-text-gold">What's new in Virelle Studios</h3>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {HIGHLIGHTS.map((h, i) => (
          <div key={i} className="rounded-lg bg-background/40 border border-border/40 p-3 text-xs space-y-1.5 hover:border-violet-500/40 transition-colors">
            <div className="flex items-center gap-2">
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300 font-mono uppercase tracking-wider">{h.tag}</span>
              <div className="font-semibold leading-tight flex-1">{h.title}</div>
            </div>
            <div className="text-muted-foreground leading-relaxed">{h.body}</div>
            {h.to && <Link href={h.to}><Button size="sm" variant="ghost" className="h-6 text-[10px] px-2 -ml-2 text-violet-300 hover:text-violet-200 hover:bg-violet-500/10">Try it<ArrowRight className="h-3 w-3 ml-1" /></Button></Link>}
          </div>
        ))}
      </div>
      <div className="mt-3 text-[10px] text-muted-foreground">Tip: press <kbd className="px-1 py-0.5 rounded bg-muted border border-border/50 text-[9px]">⌘K</kbd> to open the command palette and jump anywhere.</div>
    </div>
  );
}
