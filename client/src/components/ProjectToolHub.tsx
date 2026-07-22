import { useState } from "react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  BookOpen,
  Briefcase,
  Calendar,
  Camera,
  ChevronDown,
  Clapperboard,
  Download,
  FileText,
  Film,
  Globe,
  Megaphone,
  Mic2,
  Music,
  Palette,
  RadioTower,
  ScrollText,
  Scissors,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Type,
  Users,
  Volume2,
  Wallet,
  Wand2,
  type LucideIcon,
} from "lucide-react";

type Tool = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
};

type Stage = {
  key: string;
  title: string;
  shortTitle: string;
  description: string;
  icon: LucideIcon;
  primaryCount: number;
  tools: Tool[];
};

function ToolCard({ tool }: { tool: Tool }) {
  const Icon = tool.icon;
  return (
    <Link href={tool.href}>
      <Card
        className="h-full cursor-pointer border-border/60 bg-card/35 transition-all hover:-translate-y-0.5 hover:border-amber-500/35 hover:bg-amber-500/[0.04] active:translate-y-0 active:scale-[0.99]"
      >
        <CardContent className="flex items-start gap-3 p-3.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-500">
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <div className="truncate text-sm font-medium leading-tight">
                {tool.title}
              </div>
              {tool.badge && (
                <Badge className="h-5 shrink-0 bg-amber-500/15 text-[10px] text-amber-500 hover:bg-amber-500/15">
                  {tool.badge}
                </Badge>
              )}
            </div>
            <div className="mt-1 line-clamp-2 text-xs leading-snug text-muted-foreground">
              {tool.description}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function ProjectToolHub({
  projectId,
}: {
  projectId: number | string;
}) {
  const stages: Stage[] = [
    {
      key: "plan",
      title: "1. Plan the Story",
      shortTitle: "Plan",
      description:
        "Develop the idea, story, pitch, script, cast and creative structure before production starts.",
      icon: BookOpen,
      primaryCount: 5,
      tools: [
        { title: "Pitch Lab", description: "Logline, treatment, pitch materials and creative positioning.", href: `/projects/${projectId}/pitch-lab`, icon: Briefcase },
        { title: "Script Writer", description: "Write, revise and structure the screenplay.", href: `/projects/${projectId}/script`, icon: ScrollText },
        { title: "Casting Board", description: "Cast characters and organise talent decisions.", href: `/projects/${projectId}/casting-board`, icon: Users },
        { title: "Mood Board", description: "Visual tone, references, color mood and atmosphere.", href: `/projects/${projectId}/mood-board`, icon: Palette },
        { title: "Pitch Deck", description: "Investor-ready deck for financing and partnerships.", href: `/projects/${projectId}/pitch-deck`, icon: FileText },
        { title: "Narrative Structure", description: "Story architecture, act structure and dramatic logic.", href: `/projects/${projectId}/narrative`, icon: BookOpen },
        { title: "Script Breakdown", description: "Break down scenes, locations, cast, props and production needs.", href: `/projects/${projectId}/script-breakdown`, icon: FileText },
        { title: "Script Coverage", description: "Professional coverage, notes and story assessment.", href: `/projects/${projectId}/coverage`, icon: FileText },
        { title: "Table Read", description: "AI table read and dialogue performance review.", href: `/projects/${projectId}/table-read`, icon: Users },
        { title: "Series Bible", description: "World, characters, episodes and continuity bible.", href: "/series", icon: BookOpen },
        { title: "Voice Studio", description: "Record, upload or ElevenLabs-clone voices for every character.", href: `/projects/${projectId}/voice-studio`, icon: Mic2, badge: "AI" },
        { title: "Script Translation", description: "Translate the screenplay while preserving format, names and style.", href: `/projects/${projectId}/script-translation`, icon: Globe, badge: "AI" },
      ],
    },
    {
      key: "prepare",
      title: "2. Prepare the Production",
      shortTitle: "Prepare",
      description:
        "Build the shoot package: budget, locations, wardrobe, props, documents, contacts and schedule.",
      icon: Briefcase,
      primaryCount: 6,
      tools: [
        { title: "Production Office", description: "Central operating room for the project.", href: `/projects/${projectId}/production-office`, icon: Briefcase },
        { title: "Command Center", description: "Cross-department status, blockers and progress at a glance.", href: `/projects/${projectId}/command-center`, icon: SlidersHorizontal },
        { title: "Budget Tracker", description: "Estimate, track and organise film budget items.", href: `/projects/${projectId}/budget-tracker`, icon: Wallet },
        { title: "Schedule", description: "Strip board, shoot days and scene scheduling.", href: `/projects/${projectId}/schedule`, icon: Calendar },
        { title: "Location Scout", description: "Find and manage shooting locations.", href: `/projects/${projectId}/locations`, icon: Globe },
        { title: "Wardrobe", description: "Costume and wardrobe planning for characters and scenes.", href: `/projects/${projectId}/wardrobe`, icon: Users },
        { title: "Pre-Production Panel", description: "Director vision, vehicles, locations, atmosphere and visual rules.", href: `/projects/${projectId}/pre-production`, icon: Clapperboard },
        { title: "Day Out of Days", description: "Cast and resource schedule across the shoot.", href: `/projects/${projectId}/day-out-of-days`, icon: Calendar },
        { title: "Call Sheets", description: "Daily printable call sheets for production.", href: `/projects/${projectId}/call-sheets`, icon: FileText },
        { title: "Contacts", description: "Production contacts, crew, vendors and stakeholders.", href: `/projects/${projectId}/contacts`, icon: Users },
        { title: "Budget Fringes", description: "Payroll, fringes, loading and production cost adjustments.", href: `/projects/${projectId}/budget-fringes`, icon: Wallet },
        { title: "Props Library", description: "Scene props, hero props and production assets.", href: `/projects/${projectId}/props`, icon: Clapperboard },
        { title: "Backgrounds", description: "Background plates, environments and set references.", href: `/projects/${projectId}/backgrounds`, icon: Film },
        { title: "Equipment & Props", description: "Equipment, props and practical production requirements.", href: `/projects/${projectId}/equipment`, icon: Camera },
        { title: "Calendar Feed", description: "Calendar export and scheduling integration.", href: `/projects/${projectId}/calendar-feed`, icon: Calendar },
        { title: "Legal Docs", description: "Releases, agreements and legal production paperwork.", href: "/legal-docs", icon: ShieldCheck },
      ],
    },
    {
      key: "create",
      title: "3. Create the Footage",
      shortTitle: "Create",
      description:
        "Generate scenes, shots, performances and production assets with continuity control.",
      icon: Clapperboard,
      primaryCount: 6,
      tools: [
        { title: "Scene Editor", description: "Create, edit and regenerate individual scenes.", href: `/projects/${projectId}/scenes`, icon: Clapperboard },
        { title: "Storyboard", description: "Visual storyboard and scene composition.", href: `/projects/${projectId}/storyboard`, icon: Camera },
        { title: "Multi-Shot Sequencer", description: "Build multi-shot sequences with continuity.", href: `/projects/${projectId}/multi-shot`, icon: Camera },
        { title: "Shot List", description: "Shot breakdown and production coverage.", href: `/projects/${projectId}/shot-list`, icon: Film },
        { title: "Continuity Check", description: "Check consistency across characters, wardrobe, props and scenes.", href: `/projects/${projectId}/continuity`, icon: ShieldCheck },
        { title: "AI Casting", description: "AI-assisted casting and character performance workflow.", href: `/projects/${projectId}/ai-casting`, icon: Users },
        { title: "Dialogue Editor", description: "Dialogue, voice direction and scene performance.", href: `/projects/${projectId}/dialogue`, icon: Type },
        { title: "Live Action Plate", description: "Plate and live-action compositing workflow.", href: `/projects/${projectId}/live-action-plate`, icon: Film },
        { title: "Collaboration", description: "Project collaboration room and team workflow.", href: `/projects/${projectId}/collaboration`, icon: Users },
        { title: "Collaborators", description: "Manage project collaborators and roles.", href: `/projects/${projectId}/collaborators`, icon: Users },
        { title: "Approval Chain", description: "Approvals, sign-offs and review flow.", href: `/projects/${projectId}/approval-chain`, icon: ShieldCheck },
        { title: "Daily Report", description: "Production daily report and progress record.", href: `/projects/${projectId}/daily-report`, icon: FileText },
        { title: "Activity Timeline", description: "Timeline of project activity and decisions.", href: `/projects/${projectId}/activity`, icon: Calendar },
      ],
    },
    {
      key: "finish",
      title: "4. Finish and Output",
      shortTitle: "Finish",
      description:
        "Edit, transform, mix, dub, grade, caption and prepare the final master or broadcast output.",
      icon: Scissors,
      primaryCount: 6,
      tools: [
        { title: "Cutting Room", description: "Edit, assemble and review the final cut.", href: `/projects/${projectId}/cutting-room`, icon: Scissors, badge: "Post" },
        { title: "Swappys & Broadcast", description: "Load approved Swappys output, use Open Adult Creative mode where eligible, and route it to Studio Render or broadcast destinations.", href: "/virelle-broadcast-render", icon: RadioTower, badge: "Output" },
        { title: "Visual Effects", description: "Shot-level VFX generation and repair.", href: `/projects/${projectId}/visual-effects`, icon: Sparkles, badge: "VFX" },
        { title: "Audio Mixer", description: "Per-scene volume, pan, fades and mix presets.", href: `/projects/${projectId}/audio-mixer`, icon: SlidersHorizontal, badge: "Mix" },
        { title: "Color Grading", description: "Look, tone, palette and cinematic grade.", href: `/projects/${projectId}/color-grading`, icon: Palette, badge: "Grade" },
        { title: "Dubbing Studio", description: "AI multilingual dubbing with supported voice providers.", href: "/dubbing-studio", icon: Mic2, badge: "AI" },
        { title: "Director's Cut", description: "Creative review, selects, notes and final decisions.", href: `/projects/${projectId}/director-cut`, icon: Film, badge: "Post" },
        { title: "VFX Suite", description: "Advanced compositing and effects workflow.", href: `/projects/${projectId}/vfx-suite`, icon: Wand2, badge: "VFX" },
        { title: "Sound Effects", description: "Foley, impact sounds, ambience and sound design.", href: `/projects/${projectId}/sound-effects`, icon: Volume2, badge: "Sound" },
        { title: "Music Score", description: "Compose and organise the cinematic score.", href: `/projects/${projectId}/music-score`, icon: Music, badge: "Sound" },
        { title: "Subtitles", description: "Captions, accessibility and language tracks.", href: `/projects/${projectId}/subtitles`, icon: Type, badge: "Access" },
        { title: "Credits Editor", description: "Opening and end credits sequence.", href: `/projects/${projectId}/credits`, icon: FileText },
        { title: "Asset Versions", description: "Version control for generated and edited assets.", href: `/projects/${projectId}/asset-versions`, icon: FileText },
        { title: "Auto Recap", description: "Automatic recap of progress and post-production state.", href: `/projects/${projectId}/auto-recap`, icon: Sparkles },
        { title: "NLE Export", description: "Export for professional editing timelines.", href: `/projects/${projectId}/nle-export`, icon: Download },
      ],
    },
    {
      key: "release",
      title: "5. Fund, Release and Promote",
      shortTitle: "Release",
      description:
        "Find funding, package the project, create campaign assets and distribute the finished work.",
      icon: Megaphone,
      primaryCount: 6,
      tools: [
        { title: "Funding Directory", description: "Search available film and screen funding opportunities.", href: "/funding", icon: Wallet, badge: "Funding" },
        { title: "Funding Pro Match", description: "Match the project to relevant funding opportunities.", href: "/funding-pro", icon: Sparkles, badge: "Funding" },
        { title: "Crowdfunding", description: "Prepare campaign materials and funding links.", href: `/projects/${projectId}/crowdfunding`, icon: Wallet },
        { title: "Press Kit", description: "Build professional press assets.", href: `/projects/${projectId}/press-kit`, icon: Briefcase },
        { title: "Trailer Studio", description: "Create a trailer from project assets.", href: `/projects/${projectId}/trailer-studio`, icon: Film },
        { title: "Distribution", description: "Prepare platform-ready distribution exports.", href: `/projects/${projectId}/distribute`, icon: Globe },
        { title: "Social Cuts", description: "Short-form clips for TikTok, Reels and Shorts.", href: `/projects/${projectId}/social-cuts`, icon: Megaphone },
        { title: "Festival Tracker", description: "Track festival submissions and deadlines.", href: "/festivals", icon: Calendar },
      ],
    },
  ];

  const [activeStageKey, setActiveStageKey] = useState(stages[0].key);
  const [showAll, setShowAll] = useState(false);
  const activeStage = stages.find(stage => stage.key === activeStageKey) ?? stages[0];
  const visibleTools = showAll
    ? activeStage.tools
    : activeStage.tools.slice(0, activeStage.primaryCount);
  const hiddenCount = Math.max(0, activeStage.tools.length - activeStage.primaryCount);
  const ActiveIcon = activeStage.icon;

  return (
    <Card className="border-amber-500/20 bg-card/20 shadow-lg">
      <CardContent className="space-y-5 p-4 sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-1 text-[10px] uppercase tracking-widest text-amber-500/80">
              Complete production toolkit
            </div>
            <h3 className="font-serif text-xl leading-tight text-foreground">
              Work through one stage at a time
            </h3>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Every existing project tool remains available. Choose the production stage you are working on instead of scanning one long catalogue.
            </p>
          </div>
          <Link href="/virelle-broadcast-render">
            <Button variant="outline" className="whitespace-nowrap border-amber-500/30 hover:bg-amber-500/10">
              <RadioTower className="mr-2 h-4 w-4" />
              Swappys & Broadcast
            </Button>
          </Link>
        </div>

        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {stages.map(stage => {
            const Icon = stage.icon;
            const active = stage.key === activeStage.key;
            return (
              <button
                key={stage.key}
                type="button"
                onClick={() => {
                  setActiveStageKey(stage.key);
                  setShowAll(false);
                }}
                className={`flex min-h-11 min-w-[116px] items-center gap-2 rounded-xl border px-3 py-2 text-left transition-colors sm:min-w-0 sm:flex-1 ${
                  active
                    ? "border-amber-500/50 bg-amber-500/10 text-foreground"
                    : "border-border/60 bg-background/30 text-muted-foreground hover:border-amber-500/25 hover:text-foreground"
                }`}
                aria-pressed={active}
              >
                <Icon className={`h-4 w-4 shrink-0 ${active ? "text-amber-400" : ""}`} />
                <span className="truncate text-xs font-medium">{stage.shortTitle}</span>
              </button>
            );
          })}
        </div>

        <section className="rounded-xl border border-border/60 bg-background/30 p-3 sm:p-4">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-400">
                <ActiveIcon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h4 className="font-semibold">{activeStage.title}</h4>
                <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                  {activeStage.description}
                </p>
              </div>
            </div>
            <Badge variant="outline" className="w-fit shrink-0">
              {activeStage.tools.length} tools
            </Badge>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {visibleTools.map(tool => (
              <ToolCard key={`${activeStage.key}-${tool.title}`} tool={tool} />
            ))}
          </div>

          {hiddenCount > 0 && (
            <div className="mt-4 flex justify-center border-t border-border/50 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowAll(current => !current)}
                className="min-h-11 gap-2"
              >
                {showAll ? "Show essentials only" : `Show ${hiddenCount} more ${activeStage.shortTitle.toLowerCase()} tools`}
                <ChevronDown className={`h-4 w-4 transition-transform ${showAll ? "rotate-180" : ""}`} />
              </Button>
            </div>
          )}
        </section>
      </CardContent>
    </Card>
  );
}
