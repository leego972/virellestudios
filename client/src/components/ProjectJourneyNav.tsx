import { useMemo } from "react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import ProjectToolHub from "./ProjectToolHub";
import {
  Lightbulb,
  Users,
  ScrollText,
  ClipboardList,
  Wallet,
  Clapperboard,
  Scissors,
  Megaphone,
  ArrowRight,
  CheckCircle2,
  Circle,
} from "lucide-react";

type StageStatus = "done" | "active" | "todo";

type Stage = {
  key: string;
  number: number;
  title: string;
  blurb: string;
  icon: React.ComponentType<{ className?: string }>;
  hrefFor: (projectId: number | string) => string;
  isDone: (signals: ProjectSignals) => boolean;
  ctaLabel: string;
  surfaces: string[];
};

export type ProjectSignals = {
  hasLogline: boolean;
  characterCount: number;
  sceneCount: number;
  hasScript: boolean;
  hasBudget: boolean;
  hasFundingApplication: boolean;
  hasShotsGenerated: boolean;
  hasLockedShots: boolean;
  hasExport: boolean;
  hasCampaign: boolean;
};

const STAGES: Stage[] = [
  {
    key: "idea",
    number: 1,
    title: "Idea & Pitch",
    blurb: "Logline, treatment, lookbook, pitch deck",
    icon: Lightbulb,
    hrefFor: (id) => `/projects/${id}/pitch-lab`,
    isDone: (s) => s.hasLogline,
    ctaLabel: "Open Pitch Lab",
    surfaces: ["Pitch Lab", "Mood Board"],
  },
  {
    key: "characters",
    number: 2,
    title: "Casting Studio",
    blurb: "Photo or description â consistent screen-ready actor",
    icon: Users,
    hrefFor: (id) => `/projects/${id}/casting-board`,
    isDone: (s) => s.characterCount >= 1,
    ctaLabel: "Cast your first actor",
    surfaces: ["Characters", "Talent Search", "Signature Cast"],
  },
  {
    key: "script",
    number: 3,
    title: "Writer's Room",
    blurb: "Script, scene cards, dialogue, beat sheet",
    icon: ScrollText,
    hrefFor: (id) => `/projects/${id}/script`,
    isDone: (s) => s.hasScript || s.sceneCount >= 1,
    ctaLabel: "Open the script",
    surfaces: ["Script Writer", "Dialogue Editor", "Scene Editor"],
  },
  {
    key: "preprod",
    number: 4,
    title: "Production Office",
    blurb: "Breakdown, schedule, budget, locations, call sheet",
    icon: ClipboardList,
    hrefFor: (id) => `/projects/${id}/production-office`,
    isDone: (s) => s.hasBudget,
    ctaLabel: "Plan the shoot",
    surfaces: ["Budget Estimator", "Location Scout", "Pre-Production Panel"],
  },
  {
    key: "funding",
    number: 5,
    title: "Funding Office",
    blurb: "Apply to 130+ funders worldwide, track decisions",
    icon: Wallet,
    hrefFor: (id) => `/projects/${id}/crowdfunding`,
    isDone: (s) => s.hasFundingApplication,
    ctaLabel: "Find your funders",
    surfaces: ["Funding Directory", "Pitch Deck", "Crowdfunding"],
  },
  {
    key: "production",
    number: 6,
    title: "Soundstage",
    blurb: "Generate scenes with continuity locked across shots",
    icon: Clapperboard,
    hrefFor: (id) => `/projects/${id}/multi-shot`,
    isDone: (s) => s.hasShotsGenerated,
    ctaLabel: "Roll camera",
    surfaces: ["Multi-Shot Sequencer", "Scene Editor", "Continuity Check"],
  },
  {
    key: "post",
    number: 7,
    title: "Post-Production",
    blurb: "Edit, VFX, color, sound, captions, credits, and master export",
    icon: Scissors,
    hrefFor: (id) => `/projects/${id}/cutting-room`,
    isDone: (s) => s.hasExport,
    ctaLabel: "Open Post-Production",
    surfaces: ["Cutting Room", "VFX", "Color", "Sound", "Export"],
  },
  {
    key: "release",
    number: 8,
    title: "Release & Promote",
    blurb: "Trailer, social cuts, festivals, paid campaigns",
    icon: Megaphone,
    hrefFor: (id) => `/projects/${id}/press-kit`,
    isDone: (s) => s.hasCampaign,
    ctaLabel: "Build Press Kit",
    surfaces: ["Press Kit", "Festival Tracker", "Distribute", "Trailer Studio", "Campaign Manager"],
  },
];

export function ProjectJourneyNav({
  projectId,
  signals,
}: {
  projectId: number | string;
  signals: ProjectSignals;
}) {
  const { stagesWithStatus, currentStage, completedCount, percent } = useMemo(() => {
    const enriched: Array<Stage & { status: StageStatus }> = [];
    let foundCurrent = false;
    let done = 0;

    for (const stage of STAGES) {
      const isDone = stage.isDone(signals);
      let status: StageStatus;
      if (isDone) {
        status = "done";
        done++;
      } else if (!foundCurrent) {
        status = "active";
        foundCurrent = true;
      } else {
        status = "todo";
      }
      enriched.push({ ...stage, status });
    }

    const current = enriched.find((s) => s.status === "active") ?? enriched[enriched.length - 1];
    return {
      stagesWithStatus: enriched,
      currentStage: current,
      completedCount: done,
      percent: Math.round((done / STAGES.length) * 100),
    };
  }, [signals]);

  return (
    <div className="space-y-6">
      <Card className="shadow-lg glass-card" style={{ border:"1px solid rgba(212,175,55,0.2)", background:"linear-gradient(135deg,rgba(212,175,55,0.04) 0%,rgba(255,255,255,0.015) 100%)" }}>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <div className="text-xs uppercase tracking-widest text-amber-500/80 mb-1">
                The Filmmaker's Journey
              </div>
              <h3 className="font-serif text-2xl">
                {currentStage.status === "active" ? "Next: " : "Complete: "}
                <span className="text-amber-400">{currentStage.title}</span>
              </h3>
              <p className="text-sm text-muted-foreground mt-1">{currentStage.blurb}</p>
            </div>
            <Link href={currentStage.hrefFor(projectId)}>
              <Button size="lg" className="bg-amber-600 hover:bg-amber-500 text-black font-medium whitespace-nowrap">
                {currentStage.ctaLabel}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Stage {currentStage.number} of {STAGES.length} Â· {completedCount} complete
              </span>
              <span>{percent}%</span>
            </div>
            <Progress value={percent} className="h-2" />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {stagesWithStatus.map((stage) => {
          const Icon = stage.icon;
          const isActive = stage.status === "active";
          const isDone = stage.status === "done";
          return (
            <Link key={stage.key} href={stage.hrefFor(projectId)}>
              <Card
                className={[
                  "cursor-pointer transition-all duration-200 hover:border-amber-500/40 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] min-h-[44px]",
                  isActive
                    ? "border-amber-500/60 bg-amber-500/5 shadow-[0_0_0_1px_rgba(245,158,11,0.3)]"
                    : isDone
                      ? "border-emerald-500/30 bg-emerald-500/5"
                      : "border-border/40 bg-card/30",
                ].join(" ")}
              >
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div
                      className={[
                        "h-9 w-9 rounded-md flex items-center justify-center",
                        isActive
                          ? "bg-amber-500/20 text-amber-400"
                          : isDone
                            ? "bg-emerald-500/15 text-emerald-400"
                            : "bg-muted text-muted-foreground",
                      ].join(" ")}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    {isDone ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" aria-label="Complete" />
                    ) : isActive ? (
                      <Badge className="bg-amber-500/20 text-amber-400 hover:bg-amber-500/20 text-[10px]">
                        Now
                      </Badge>
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground/40" aria-label="Upcoming" />
                    )}
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Stage {stage.number}
                    </div>
                    <div className="font-medium text-sm leading-tight">{stage.title}</div>
                    <div className="text-xs text-muted-foreground line-clamp-2">{stage.blurb}</div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <ProjectToolHub projectId={projectId} />
    </div>
  );
}

export default ProjectJourneyNav;
