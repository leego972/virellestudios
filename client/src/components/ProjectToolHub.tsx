import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Briefcase,
  Calendar,
  Camera,
  Clapperboard,
  Download,
  FileText,
  Film,
  Globe,
  Megaphone,
  Music,
  Palette,
  ScrollText,
  Scissors,
  ShieldCheck,
  Sparkles,
  Type,
  Users,
  Volume2,
  Wand2,
  Wallet,
} from "lucide-react";

type Tool = {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
};

type Group = {
  title: string;
  description: string;
  tools: Tool[];
};

function ToolCard({ tool }: { tool: Tool }) {
  const Icon = tool.icon;
  return (
    <Link href={tool.href}>
      <Card className="h-full cursor-pointer transition-all active:scale-[0.99] glass-card" style={{ border:"1px solid rgba(255,255,255,0.06)", background:"rgba(255,255,255,0.02)" }} onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor="rgba(212,175,55,0.35)";(e.currentTarget as HTMLElement).style.background="rgba(212,175,55,0.04)"}} onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor="rgba(255,255,255,0.06)";(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.02)"}}>
        <CardContent className="p-3.5 flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 text-amber-500">
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 min-w-0">
              <div className="text-sm font-medium leading-tight truncate">{tool.title}</div>
              {tool.badge && (
                <Badge className="h-5 text-[10px] bg-amber-500/15 text-amber-500 hover:bg-amber-500/15 shrink-0">
                  {tool.badge}
                </Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground leading-snug mt-1 line-clamp-2">{tool.description}</div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function ProjectToolHub({ projectId }: { projectId: number | string }) {
  const groups: Group[] = [
    {
      title: "1. Plan",
      description: "Develop the concept, pitch, script, cast and production plan.",
      tools: [
        { title: "Pitch Lab", description: "Logline, treatment, pitch materials and creative positioning.", href: `/projects/${projectId}/pitch-lab`, icon: Briefcase },
        { title: "Script Writer", description: "Write, revise and structure the screenplay.", href: `/projects/${projectId}/script`, icon: ScrollText },
        { title: "Script Breakdown", description: "Break down scenes, locations, cast, props and production needs.", href: `/projects/${projectId}/script-breakdown`, icon: FileText },
        { title: "Series Bible", description: "World, characters, episodes and continuity bible.", href: `/series`, icon: BookOpen },
        { title: "Casting Board", description: "Cast characters and organise talent decisions.", href: `/projects/${projectId}/casting-board`, icon: Users },
        { title: "Pre-Production Panel", description: "Director vision, vehicles, locations, atmosphere and visual rules.", href: `/projects/${projectId}/pre-production`, icon: Clapperboard },
      ],
    },
    {
      title: "2. Prepare",
      description: "Build the shoot plan, budget, locations, schedule and legal package.",
      tools: [
        { title: "Production Office", description: "Central operating room for the project.", href: `/projects/${projectId}/production-office`, icon: Briefcase },
        { title: "Schedule", description: "Strip board, shoot days and scene scheduling.", href: `/projects/${projectId}/schedule`, icon: Calendar },
        { title: "Call Sheets", description: "Daily printable call sheets for production.", href: `/projects/${projectId}/call-sheets`, icon: FileText },
        { title: "Budget Tracker", description: "Estimate, track and organise film budget items.", href: `/projects/${projectId}/budget-tracker`, icon: Wallet },
        { title: "Location Scout", description: "Find and manage shooting locations.", href: `/projects/${projectId}/locations`, icon: Globe },
        { title: "Legal Docs", description: "Releases, agreements and legal production paperwork.", href: `/legal-docs`, icon: ShieldCheck },
      ],
    },
    {
      title: "3. Create",
      description: "Generate shots, scenes, dialogue, imagery and production assets.",
      tools: [
        { title: "Scene Editor", description: "Create, edit and regenerate individual scenes.", href: `/projects/${projectId}/scenes`, icon: Clapperboard },
        { title: "Storyboard", description: "Visual storyboard and scene composition.", href: `/projects/${projectId}/storyboard`, icon: Camera },
        { title: "Shot List", description: "Shot breakdown and production coverage.", href: `/projects/${projectId}/shot-list`, icon: Film },
        { title: "Multi-Shot Sequencer", description: "Build multi-shot sequences with continuity.", href: `/projects/${projectId}/multi-shot`, icon: Camera },
        { title: "Dialogue Editor", description: "Dialogue, voice direction and scene performance.", href: `/projects/${projectId}/dialogue`, icon: Type },
        { title: "Live Action Plate", description: "Plate and live-action compositing workflow.", href: `/projects/${projectId}/live-action-plate`, icon: Film },
      ],
    },
    {
      title: "4. Finish",
      description: "Post-production: edit, VFX, sound, score, subtitles, grading and export.",
      tools: [
        { title: "Cutting Room", description: "Edit, assemble and review the final cut.", href: `/projects/${projectId}/cutting-room`, icon: Scissors, badge: "Post" },
        { title: "Director's Cut", description: "Creative review, selects, notes and final decisions.", href: `/projects/${projectId}/director-cut`, icon: Film, badge: "Post" },
        { title: "Visual Effects", description: "Shot-level VFX generation and repair.", href: `/projects/${projectId}/visual-effects`, icon: Sparkles, badge: "VFX" },
        { title: "VFX Suite", description: "Advanced compositing and effects workflow.", href: `/projects/${projectId}/vfx-suite`, icon: Wand2, badge: "VFX" },
        { title: "Color Grading", description: "Look, tone, palette and cinematic grade.", href: `/projects/${projectId}/color-grading`, icon: Palette, badge: "Grade" },
        { title: "Sound Effects", description: "Foley, impact sounds, ambience and sound design.", href: `/projects/${projectId}/sound-effects`, icon: Volume2, badge: "Sound" },
        { title: "Music Score", description: "Compose and organise the cinematic score.", href: `/projects/${projectId}/music-score`, icon: Music, badge: "Sound" },
        { title: "Subtitles", description: "Captions, accessibility and language tracks.", href: `/projects/${projectId}/subtitles`, icon: Type, badge: "Access" },
        { title: "Credits Editor", description: "Opening and end credits sequence.", href: `/projects/${projectId}/credits`, icon: FileText },
        { title: "NLE Export", description: "Export for professional editing timelines.", href: `/projects/${projectId}/nle-export`, icon: Download },
      ],
    },
    {
      title: "5. Release",
      description: "Package, fund, promote and distribute the finished project.",
      tools: [
        { title: "Trailer Studio", description: "Create a trailer from your project assets.", href: `/projects/${projectId}/trailer-studio`, icon: Film },
        { title: "Social Cuts", description: "Short-form clips for TikTok, Reels and Shorts.", href: `/projects/${projectId}/social-cuts`, icon: Megaphone },
        { title: "Press Kit", description: "Build professional press assets.", href: `/projects/${projectId}/press-kit`, icon: Briefcase },
        { title: "Festival Tracker", description: "Track festival submissions and deadlines.", href: `/festivals`, icon: Calendar },
        { title: "Distribution", description: "Prepare platform-ready distribution exports.", href: `/projects/${projectId}/distribute`, icon: Globe },
        { title: "Crowdfunding", description: "Prepare campaign materials and funding links.", href: `/projects/${projectId}/crowdfunding`, icon: Wallet },
      ],
    },
  ];

  return (
    <Card className="shadow-lg glass-card" style={{ border:"1px solid rgba(212,175,55,0.2)", background:"rgba(255,255,255,0.015)", backdropFilter:"blur(8px)" }}>
      <CardContent className="p-5 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-amber-500/80 mb-1">Complete workflow</div>
            <h3 className="font-serif text-xl leading-tight gradient-text-gold">Plan Ã¢ÂÂ Create Ã¢ÂÂ Produce Ã¢ÂÂ Finish Ã¢ÂÂ Release</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
              All major tools are grouped by the real film-production process. Nothing is removed; this hub makes hidden features easier to find.
            </p>
          </div>
          <Link href={`/projects/${projectId}/cutting-room`}>
            <Button variant="outline" className="border-amber-500/30 hover:bg-amber-500/10 whitespace-nowrap">
              Open Post-Production
            </Button>
          </Link>
        </div>

        <div className="space-y-5">
          {groups.map((group) => (
            <section key={group.title} className="space-y-2.5">
              <div className="flex items-center gap-3">
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold tracking-wide">{group.title}</h4>
                  <p className="text-xs text-muted-foreground">{group.description}</p>
                </div>
                <div className="h-px flex-1" style={{ background:"linear-gradient(90deg,rgba(212,175,55,0.3),transparent)" }} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 gap-2.5">
                {group.tools.map((tool) => (
                  <ToolCard key={`${group.title}-${tool.title}`} tool={tool} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
