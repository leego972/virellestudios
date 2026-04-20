import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  Home, FolderOpen, Plus, Users, Film, Mic2, Sparkles, Wand2, Megaphone, DollarSign,
  Image as ImageIcon, Trophy, BarChart3, Settings, CreditCard, FileText, Music, Camera,
  Clapperboard, Layers, ScrollText, Award, Globe, Briefcase, Target, ListChecks, ShieldCheck,
  Calendar, MessageSquare, Bell, LogOut, Tv, Newspaper, BookOpen, Building2, PaintBucket,
  Headphones, Scissors, Subtitles as SubsIcon, GitBranch, BadgeDollarSign, Bot, ShoppingBag, LineChart,
} from "lucide-react";

type Cmd = { id: string; label: string; group: string; path?: string; icon?: any; action?: () => void; keywords?: string };

const RECENTS_KEY = "vs_cmdpal_recents";
const MAX_RECENTS = 6;

const COMMANDS: Cmd[] = [
  // Core
  { id: "home",        label: "Home / Dashboard",          group: "Core",      path: "/",                     icon: Home, keywords: "dashboard start" },
  { id: "projects",    label: "All Projects",              group: "Core",      path: "/projects",             icon: FolderOpen },
  { id: "newproject",  label: "Create New Project",        group: "Core",      path: "/projects/new",         icon: Plus, keywords: "start new film" },
  { id: "movies",      label: "My Movies",                 group: "Core",      path: "/movies",               icon: Film },
  { id: "showcase",    label: "Public Showcase",           group: "Core",      path: "/showcase",             icon: Award },

  // Production
  { id: "scenes",       label: "Scene Editor (last project)", group: "Production", path: "/scenes",          icon: Clapperboard },
  { id: "characters",   label: "Characters & Cast",         group: "Production", path: "/characters",         icon: Users },
  { id: "talent",       label: "Talent Search",             group: "Production", path: "/talent-search",      icon: Users },
  { id: "casting",      label: "AI Casting Director",       group: "Production", path: "/ai-casting",         icon: Bot },
  { id: "preprod",      label: "Pre-Production Panel",      group: "Production", path: "/pre-production",     icon: ListChecks },
  { id: "timeline",     label: "Feature Timeline",          group: "Production", path: "/feature-timeline",   icon: GitBranch },
  { id: "directorcut",  label: "Director's Cut Suite",      group: "Production", path: "/director-cut",       icon: Scissors },
  { id: "script",       label: "Script Writer",             group: "Production", path: "/script",             icon: ScrollText },
  { id: "dialogue",     label: "Dialogue Editor",           group: "Production", path: "/dialogue-editor",    icon: MessageSquare },
  { id: "sequencer",    label: "Multi-Shot Sequencer",      group: "Production", path: "/multi-shot",         icon: Layers },
  { id: "vfx",          label: "Visual Effects",            group: "Production", path: "/vfx",                icon: Sparkles },
  { id: "sfx",          label: "Sound Effects",             group: "Production", path: "/sound-effects",      icon: Headphones },
  { id: "subs",         label: "Subtitles",                 group: "Production", path: "/subtitles",          icon: SubsIcon },
  { id: "office",       label: "Production Office",         group: "Production", path: "/production-office",  icon: Building2 },
  { id: "studioops",    label: "Pro Studio Ops (queue, locks, approvals)", group: "Production", path: "/pro-studio-ops", icon: ShieldCheck, keywords: "render queue locks approvals budget" },

  // Marketing
  { id: "ads",          label: "Advertising Dashboard",     group: "Marketing",  path: "/advertising",        icon: Megaphone },
  { id: "adposters",    label: "Ad/Poster Maker",           group: "Marketing",  path: "/ad-poster-maker",    icon: ImageIcon },
  { id: "campaigns",    label: "Campaign Manager",          group: "Marketing",  path: "/campaigns",          icon: Target },
  { id: "trailers",     label: "Trailer Studio",            group: "Marketing",  path: "/trailer-studio",     icon: Tv },
  { id: "tvc",          label: "TV Commercial Creator",     group: "Marketing",  path: "/tv-commercial",      icon: Tv },
  { id: "press",        label: "Press Kit Builder",         group: "Marketing",  path: "/press-kit",          icon: Newspaper },
  { id: "pitch",        label: "Pitch Lab",                 group: "Marketing",  path: "/pitch-lab",          icon: BarChart3 },
  { id: "content",      label: "Content Creator (social)",  group: "Marketing",  path: "/content-creator",    icon: PaintBucket },

  // Business
  { id: "funding",      label: "Funding Directory",         group: "Business",   path: "/funding",            icon: DollarSign },
  { id: "fundingpro",   label: "Funding — AI Match & Tracker", group: "Business", path: "/funding-pro",       icon: Sparkles, keywords: "match score apply grant" },
  { id: "festivals",    label: "Festival Tracker",          group: "Business",   path: "/festivals",          icon: Trophy },
  { id: "distribute",   label: "Distribute (last project)", group: "Business",   path: "/distribute",         icon: Globe },
  { id: "marketplace",  label: "Asset Marketplace",         group: "Business",   path: "/marketplace",        icon: ShoppingBag },
  { id: "credits",      label: "Buy Credits",               group: "Business",   path: "/credits",            icon: BadgeDollarSign },
  { id: "pricing",      label: "Plans & Pricing",           group: "Business",   path: "/pricing",            icon: CreditCard },

  // Insights
  { id: "seo",          label: "SEO Dashboard",             group: "Insights",   path: "/seo-dashboard",      icon: LineChart },
  { id: "blog",         label: "Blog",                      group: "Insights",   path: "/blog",               icon: BookOpen },

  // Account
  { id: "settings",     label: "Settings",                  group: "Account",    path: "/settings",           icon: Settings },
  { id: "billing",      label: "Billing Portal",            group: "Account",    path: "/billing/portal",     icon: CreditCard },
  { id: "referrals",    label: "Referrals",                 group: "Account",    path: "/referrals",          icon: Users },
  { id: "contact",      label: "Contact Support",           group: "Account",    path: "/contact",            icon: MessageSquare },
];

function loadRecents(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENTS_KEY) || "[]"); } catch { return []; }
}
function pushRecent(id: string) {
  try {
    const cur = loadRecents().filter(x => x !== id);
    cur.unshift(id);
    localStorage.setItem(RECENTS_KEY, JSON.stringify(cur.slice(0, MAX_RECENTS)));
  } catch {}
}

export default function CommandPaletteGlobal() {
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(o => !o);
      }
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag !== "INPUT" && tag !== "TEXTAREA" && !(e.target as HTMLElement)?.isContentEditable) {
          e.preventDefault();
          setOpen(o => !o);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const run = (c: Cmd) => {
    setOpen(false);
    pushRecent(c.id);
    if (c.action) c.action();
    else if (c.path) setLocation(c.path);
  };

  const recentIds = loadRecents();
  const recentCmds = recentIds.map(id => COMMANDS.find(c => c.id === id)).filter(Boolean) as Cmd[];
  const groups = COMMANDS.reduce((acc, c) => { (acc[c.group] ||= []).push(c); return acc; }, {} as Record<string, Cmd[]>);

  return (
    <CommandDialog open={open} onOpenChange={setOpen} title="Search & jump anywhere" description="Type to search every page. Press Esc to close.">
      <CommandInput placeholder="Search pages, tools, actions… (Cmd/Ctrl+K)" />
      <CommandList>
        <CommandEmpty>No matches. Try "funding", "trailer", "scene"…</CommandEmpty>
        {recentCmds.length > 0 && (
          <>
            <CommandGroup heading="Recent">
              {recentCmds.map(c => {
                const Icon = c.icon || Sparkles;
                return <CommandItem key={`r-${c.id}`} value={`recent ${c.label} ${c.keywords || ""}`} onSelect={() => run(c)}><Icon className="h-4 w-4 mr-2 opacity-70" />{c.label}</CommandItem>;
              })}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}
        {Object.entries(groups).map(([heading, items]) => (
          <CommandGroup key={heading} heading={heading}>
            {items.map(c => {
              const Icon = c.icon || Sparkles;
              return (
                <CommandItem key={c.id} value={`${c.label} ${c.keywords || ""} ${c.group}`} onSelect={() => run(c)}>
                  <Icon className="h-4 w-4 mr-2 opacity-70" />{c.label}
                </CommandItem>
              );
            })}
          </CommandGroup>
        ))}
        <CommandSeparator />
        <CommandGroup heading="Tips">
          <CommandItem value="tip-shortcut" disabled><CommandShortcut>⌘ K</CommandShortcut>Open this palette anywhere</CommandItem>
          <CommandItem value="tip-slash" disabled><CommandShortcut>/</CommandShortcut>Quick-open without modifiers</CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
