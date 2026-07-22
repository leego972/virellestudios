import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Award,
  BadgeDollarSign,
  BarChart3,
  BookOpen,
  Bot,
  Briefcase,
  Building2,
  Clapperboard,
  CreditCard,
  DollarSign,
  Film,
  FolderOpen,
  GitBranch,
  Globe,
  Headphones,
  Home,
  Image as ImageIcon,
  Layers,
  LineChart,
  ListChecks,
  Megaphone,
  MessageSquare,
  Newspaper,
  PaintBucket,
  Plus,
  Scissors,
  ScrollText,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Subtitles as SubsIcon,
  Target,
  Trophy,
  Tv,
  Users,
} from "lucide-react";

type Cmd = {
  id: string;
  label: string;
  group: string;
  path?: string;
  icon?: any;
  action?: () => void;
  keywords?: string;
};

const RECENTS_KEY = "vs_cmdpal_recents";
const MAX_RECENTS = 6;
const QUICK_ACCESS_IDS = [
  "projects",
  "newproject",
  "characters",
  "preprod",
  "vfx",
  "funding",
  "marketplace",
  "settings",
];

const COMMANDS: Cmd[] = [
  { id: "home", label: "Home / Dashboard", group: "Core", path: "/", icon: Home, keywords: "dashboard start" },
  { id: "projects", label: "All Projects", group: "Core", path: "/projects", icon: FolderOpen },
  { id: "newproject", label: "Create New Project", group: "Core", path: "/projects/new", icon: Plus, keywords: "start new film" },
  { id: "movies", label: "My Movies", group: "Core", path: "/movies", icon: Film },
  { id: "showcase", label: "Public Showcase", group: "Core", path: "/showcase", icon: Award },
  { id: "scenes", label: "Scene Editor (last project)", group: "Production", path: "/scenes", icon: Clapperboard },
  { id: "characters", label: "Characters & Cast", group: "Production", path: "/characters", icon: Users },
  { id: "talent", label: "Talent Search", group: "Production", path: "/talent-search", icon: Users },
  { id: "casting", label: "AI Casting Director", group: "Production", path: "/ai-casting", icon: Bot },
  { id: "preprod", label: "Pre-Production Panel", group: "Production", path: "/pre-production", icon: ListChecks },
  { id: "timeline", label: "Feature Timeline", group: "Production", path: "/feature-timeline", icon: GitBranch },
  { id: "directorcut", label: "Director's Cut Suite", group: "Production", path: "/director-cut", icon: Scissors },
  { id: "script", label: "Script Writer", group: "Production", path: "/script", icon: ScrollText },
  { id: "dialogue", label: "Dialogue Editor", group: "Production", path: "/dialogue-editor", icon: MessageSquare },
  { id: "sequencer", label: "Multi-Shot Sequencer", group: "Production", path: "/multi-shot", icon: Layers },
  { id: "vfx", label: "Visual Effects", group: "Production", path: "/vfx", icon: Sparkles },
  { id: "sfx", label: "Sound Effects", group: "Production", path: "/sound-effects", icon: Headphones },
  { id: "subs", label: "Subtitles", group: "Production", path: "/subtitles", icon: SubsIcon },
  { id: "office", label: "Production Office", group: "Production", path: "/production-office", icon: Building2 },
  { id: "studioops", label: "Pro Studio Ops", group: "Production", path: "/pro-studio-ops", icon: ShieldCheck, keywords: "render queue locks approvals budget" },
  { id: "ads", label: "Advertising Dashboard", group: "Marketing", path: "/advertising", icon: Megaphone },
  { id: "adposters", label: "Ad/Poster Maker", group: "Marketing", path: "/ad-poster-maker", icon: ImageIcon },
  { id: "campaigns", label: "Campaign Manager", group: "Marketing", path: "/campaigns", icon: Target },
  { id: "trailers", label: "Trailer Studio", group: "Marketing", path: "/trailer-studio", icon: Tv },
  { id: "tvc", label: "TV Commercial Creator", group: "Marketing", path: "/tv-commercial", icon: Tv },
  { id: "press", label: "Press Kit Builder", group: "Marketing", path: "/press-kit", icon: Newspaper },
  { id: "pitch", label: "Pitch Lab", group: "Marketing", path: "/pitch-lab", icon: BarChart3 },
  { id: "content", label: "Content Creator (social)", group: "Marketing", path: "/content-creator", icon: PaintBucket },
  { id: "funding", label: "Funding Directory", group: "Business", path: "/funding", icon: DollarSign },
  { id: "fundingpro", label: "Funding — AI Match & Tracker", group: "Business", path: "/funding-pro", icon: Sparkles, keywords: "match score apply grant" },
  { id: "festivals", label: "Festival Tracker", group: "Business", path: "/festivals", icon: Trophy },
  { id: "distribute", label: "Distribute (last project)", group: "Business", path: "/distribute", icon: Globe },
  { id: "marketplace", label: "Asset Marketplace", group: "Business", path: "/marketplace", icon: ShoppingBag },
  { id: "credits", label: "Buy Credits", group: "Business", path: "/credits", icon: BadgeDollarSign },
  { id: "pricing", label: "Plans & Pricing", group: "Business", path: "/pricing", icon: CreditCard },
  { id: "seo", label: "SEO Dashboard", group: "Insights", path: "/seo-dashboard", icon: LineChart },
  { id: "blog", label: "Blog", group: "Insights", path: "/blog", icon: BookOpen },
  { id: "settings", label: "Settings", group: "Account", path: "/settings", icon: Settings },
  { id: "billing", label: "Billing Portal", group: "Account", path: "/billing/portal", icon: CreditCard },
  { id: "referrals", label: "Referrals", group: "Account", path: "/referrals", icon: Users },
  { id: "contact", label: "Contact Support", group: "Account", path: "/contact", icon: MessageSquare },
];

function loadRecents(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENTS_KEY) || "[]");
  } catch {
    return [];
  }
}

function pushRecent(id: string) {
  try {
    const current = loadRecents().filter(item => item !== id);
    current.unshift(id);
    localStorage.setItem(
      RECENTS_KEY,
      JSON.stringify(current.slice(0, MAX_RECENTS)),
    );
  } catch {
    // Local storage is optional; navigation must still work.
  }
}

function CommandRow({ command, onRun }: { command: Cmd; onRun: (command: Cmd) => void }) {
  const Icon = command.icon || Sparkles;
  return (
    <CommandItem
      value={`${command.label} ${command.keywords || ""} ${command.group}`}
      onSelect={() => onRun(command)}
      className="min-h-10 rounded-lg"
    >
      <Icon className="mr-2 h-4 w-4 shrink-0 opacity-70" />
      <span className="truncate">{command.label}</span>
      <span className="ml-auto hidden text-[10px] text-muted-foreground sm:block">
        {command.group}
      </span>
    </CommandItem>
  );
}

export default function CommandPaletteGlobal() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [, setLocation] = useLocation();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        (event.key === "k" || event.key === "K") &&
        (event.metaKey || event.ctrlKey)
      ) {
        event.preventDefault();
        setOpen(value => !value);
      }
      if (
        event.key === "/" &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey
      ) {
        const target = event.target as HTMLElement;
        if (
          target?.tagName !== "INPUT" &&
          target?.tagName !== "TEXTAREA" &&
          !target?.isContentEditable
        ) {
          event.preventDefault();
          setOpen(value => !value);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const run = (command: Cmd) => {
    setOpen(false);
    setQuery("");
    pushRecent(command.id);
    if (command.action) command.action();
    else if (command.path) setLocation(command.path);
  };

  const recentCommands = useMemo(
    () =>
      loadRecents()
        .map(id => COMMANDS.find(command => command.id === id))
        .filter(Boolean) as Cmd[],
    [open],
  );
  const quickAccess = QUICK_ACCESS_IDS.map(id =>
    COMMANDS.find(command => command.id === id),
  ).filter(Boolean) as Cmd[];
  const groups = COMMANDS.reduce((result, command) => {
    (result[command.group] ||= []).push(command);
    return result;
  }, {} as Record<string, Cmd[]>);
  const searching = query.trim().length > 0;

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) setQuery("");
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Search Virelle"
      description="Search every page and production tool. Press Escape to close."
      className="[&_[cmdk-root]]:bg-background [&_[cmdk-input-wrapper]]:border-b [&_[cmdk-input-wrapper]]:border-border/60"
    >
      <CommandInput
        value={query}
        onValueChange={setQuery}
        placeholder="Search pages and tools…"
      />
      <CommandList className="max-h-[min(70vh,520px)] p-1">
        <CommandEmpty>No matching page or tool.</CommandEmpty>

        {!searching && recentCommands.length > 0 && (
          <>
            <CommandGroup heading="Recent">
              {recentCommands.map(command => (
                <CommandRow key={`recent-${command.id}`} command={command} onRun={run} />
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {!searching && (
          <CommandGroup heading="Quick access">
            {quickAccess.map(command => (
              <CommandRow key={command.id} command={command} onRun={run} />
            ))}
          </CommandGroup>
        )}

        {searching &&
          Object.entries(groups).map(([heading, commands], index) => (
            <div key={heading}>
              {index > 0 && <CommandSeparator />}
              <CommandGroup heading={heading}>
                {commands.map(command => (
                  <CommandRow key={command.id} command={command} onRun={run} />
                ))}
              </CommandGroup>
            </div>
          ))}
      </CommandList>
    </CommandDialog>
  );
}
