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
  Store,
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
      <Card className="h-full cursor-pointer border-border/45 bg-card/45 hover:border-amber-500/45 hover:bg-amber-500/[0.045] hover:shadow-sm transition-all active:scale-[0.99]">
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
      description: "Develop the idea, story, pitch, script, cast and creative structure before production starts.",
      tools: [
        { title: "Pitch Lab", description: "Logline, treatment, pitch materials and creative positioning.", href: `/projects/${projectId}/pitch-lab`, icon: Briefcase },
        { title: "Pitch Deck", description: "Investor-ready deck for financing and partnerships.", href: `/projects/${projectId}/pitch-deck`, icon: FileText },
        { title: "Narrative Structure", description: "Story architecture, act structure and dramatic logic.", href: `/projects/${projectId}/narrative`, icon: BookOpen },
        { title: "Mood Board", description: "Visual tone, references, color mood and atmosphere.", href: `/projects/${projectId}/mood-board`, icon: Palette },
        { title: "Script Writer", description: "Write, revise and structure the screenplay.", href: `/projects/${projectId}/script`, icon: ScrollText },
        { title: "Script Breakdown", description: "Break down scenes, locations, cast, props and production needs.", href: `/projects/${projectId}/script-breakdown`, icon: FileText },
        { title: "Script Coverage", description: "Professional coverage, notes and story assessment.", href: `/projects/${projectId}/coverage`, icon: FileText },
        { title: "Table Read", description: "AI table read and dialogue performance review.", href: `/projects/${projectId}/table-read`, icon: Users },
        { title: "Series Bible", description: "World, characters, episodes and continuity bible.", href: `/series`, icon: BookOpen },
        { title: "Casting Board", description: "Cast characters and organise talent decisions.", href: `/projects/${projectId}/casting-board`, icon: Users },
      ],
    },
    {
      title: "2. Prepare",
      description: "Build the professional shoot package: budget, locations, clothing, accessories, props, documents and schedule.",
      tools: [
        { title: "Production Office", description: "Central operating room for the project.", href: `/projects/${projectId}/production-office`, icon: Briefcase },
        { title: "Pre-Production Panel", description: "Director vision, vehicles, locations, atmosphere and visual rules.", href: `/projects/${projectId}/pre-production`, icon: Clapperboard },
        { title: "Schedule", description: "Strip board, shoot days and scene scheduling.", href: `/projects/${projectId}/schedule`, icon: Calendar },
        { title: "Day Out of Days", description: "Cast and resource schedule across the shoot.", href: `/projects/${projectId}/day-out-of-days`, icon: Calendar },
        { title: "Call Sheets", description: "Daily printable call sheets for production.", href: `/projects/${projectId}/call-sheets`, icon: FileText },
        { title: "Contacts", description: "Production contacts, crew, vendors and stakeholders.", href: `/projects/${projectId}/contacts`, icon: Users },
        { title: "Budget Tracker", description: "Estimate, track and organise film budget items.", href: `/projects/${projectId}/budget-tracker`, icon: Wallet },
        { title: "Budget Fringes", description: "Payroll, fringes, loading and production cost adjustments.", href: `/projects/${projectId}/budget-fringes`, icon: Wallet },
        { title: "Location Scout", description: "Find and manage shooting locations.", href: `/projects/${projectId}/locations`, icon: Globe },
        { title: "Project Wardrobe", description: "Attach clothing, costumes, shoes, hats, bags, jewellery and accessories to characters or scenes.", href: `/projects/${projectId}/wardrobe`, icon: Users, badge: "Clothes" },
        { title: "Wardrobe Marketplace", description: "Browse designer clothes/accessories: virtual AI-use, physical sale, physical rental and hybrid listings.", href: `/wardrobe-marketplace`, icon: Store, badge: "Market" },
        { title: "Designer Studio", description: "Designer dashboard for collections, item uploads, pricing, publishing, memberships and Stripe payouts.", href: `/designer/studio`, icon: Store, badge: "Designer" },
        { title: "Join as Designer", description: "Registration point for designers to list virtual garments, physical items, rentals or hybrid items.", href: `/designer-register`, icon: Sparkles, badge: "Signup" },
        { title: "Props Library", description: "Scene props, hero props and production assets. Separate from clothing/accessories.", href: `/projects/${projectId}/props`, icon: Clapperboard },
        { title: "Backgrounds", description: "Background plates, environments and set references. Separate from wardrobe.", href: `/projects/${projectId}/backgrounds`, icon: Film },
        { title: "Equipment & Props", description: "Equipment, props and practical production requirements.", href: `/projects/${projectId}/equipment`, icon: Camera },
        { title: "Calendar Feed", description: "Calendar export and scheduling integration.", href: `/projects/${projectId}/calendar-feed`, icon: Calendar },
        { title: "Legal Docs", description: "Releases, agreements and legal production paperwork.", href: `/legal-docs`, icon: ShieldCheck },
      ],
    },
    {
      title: "3. Create",
      description: "Generate scenes, shots, performance material and production assets with continuity control.",
      tools: [
        { title: "Scene Editor", description: "Create, edit and regenerate individual scenes.", href: `/projects/${projectId}/scenes`, icon: Clapperboard },
        { title: "Storyboard", description: "Visual storyboard and scene composition.", href: `/projects/${projectId}/storyboard`, icon: Camera },
        { title: "Shot List", description: "Shot breakdown and production coverage.", href: `/projects/${projectId}/shot-list`, icon: Film },
        { title: "Multi-Shot Sequencer", description: "Build multi-shot sequences with continuity.", href: `/projects/${projectId}/multi-shot`, icon: Camera },
        { title: "Continuity Check", description: "Check consistency across characters, wardrobe, props and scenes.", href: `/projects/${projectId}/continuity`, icon: ShieldCheck },
        { title: "Dialogue Editor", description: "Dialogue, voice direction and scene performance.", href: `/projects/${projectId}/dialogue`, icon: Type },
        { title: "AI Casting", description: "AI-assisted casting and character performance workflow.", href: `/projects/${projectId}/ai-casting`, icon: Users },
        { title: "Live Action Plate", description: "Plate and live-action compositing workflow.", href: `/projects/${projectId}/live-action-plate`, icon: Film },
        { title: "Collaboration", description: "Project collaboration room and team workflow.", href: `/projects/${projectId}/collaboration`, icon: Users },
        { title: "Collaborators", description: "Manage project collaborators and roles.", href: `/projects/${projectId}/collaborators`, icon: Users },
        { title: "Approval Chain", description: "Approvals, sign-offs and review flow.", href: `/projects/${projectId}/approval-chain`, icon: ShieldCheck },
        { title: "Daily Report", description: "Production daily report and progress record.", href: `/projects/${projectId}/daily-report`, icon: FileText },
        { title: "Activity Timeline", description: "Timeline of project activity and decisions.", href: `/projects/${projectId}/activity`, icon: Calendar },
      ],
    },
    {
      title: "4. Finish",
      description: "Post-production: edit, VFX, sound, score, subtitles, grading, credits and export.",
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
        { title: "Asset Versions", description: "Version control for generated and edited assets.", href: `/projects/${projectId}/asset-versions`, icon: FileText },
        { title: "Auto Recap", description: "Automatic recap of progress and post-production state.", href: `/projects/${projectId}/auto-recap`, icon: Sparkles },
        { title: "NLE Export", description: "Export for professional editing timelines.", href: `/projects/${projectId}/nle-export`, icon: Download },
      ],
    },
    {
      title: "5. Release",
      description: "Package, fund, promote, advertise and distribute the finished project.",
      tools: [
        { title: "Trailer Studio", description: "Create a trailer from your project assets.", href: `/projects/${projectId}/trailer-studio`, icon: Film },
        { title: "Social Cuts", description: "Short-form clips for TikTok, Reels and Shorts.", href: `/projects/${projectId}/social-cuts`, icon: Megaphone },
        { title: "TV Commercial", description: "Create ad spots and promotional commercials.", href: `/projects/${projectId}/tv-commercial`, icon: Megaphone },
        { title: "Press Kit", description: "Build professional press assets.", href: `/projects/${projectId}/press-kit`, icon: Briefcase },
        { title: "Brand Outreach", description: "Sponsorships, placements and partner outreach.", href: `/projects/${projectId}/brand-outreach`, icon: Megaphone },
        { title: "Film Comps", description: "Comparable films for positioning, budget and pitching.", href: `/film-comps`, icon: Film },
        { title: "Tax Incentives", description: "Find film tax incentives and production rebates.", href: `/tax-incentives`, icon: Wallet },
        { title: "Festival Tracker", description: "Track festival submissions and deadlines.", href: `/festivals`, icon: Calendar },
        { title: "Distribution", description: "Prepare platform-ready distribution exports.", href: `/projects/${projectId}/distribute`, icon: Globe },
        { title: "Crowdfunding", description: "Prepare campaign materials and funding links.", href: `/projects/${projectId}/crowdfunding`, icon: Wallet },
      ],
    },
  ];

  return (
    <Card className="border-amber-500/20 bg-card/45 shadow-sm">
      <CardContent className="p-5 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-amber-500/80 mb-1">Complete workflow</div>
            <h3 className="font-serif text-xl leading-tight">Plan → Prepare → Create → Finish → Release</h3>
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
                <div className="h-px flex-1 bg-border/50" />
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
