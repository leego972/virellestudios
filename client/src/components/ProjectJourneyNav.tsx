import { useMemo } from "react";
import { Link } from "wouter";
import { ArrowRight, CheckCircle2, Circle } from "lucide-react";
import { HollywoodIcon } from "@/components/HollywoodIcon";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import ProjectToolHub from "./ProjectToolHub";

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

type StageStatus = "done" | "active" | "todo";

type Stage = {
  key: "preproduction" | "production" | "postproduction" | "funding";
  number: number;
  title: string;
  blurb: string;
  icon: "preproduction" | "production" | "post" | "reports";
  hrefFor: (projectId: number | string) => string;
  isDone: (signals: ProjectSignals) => boolean;
  ctaLabel: string;
  surfaces: string[];
};

export const PROJECT_JOURNEY_STAGES: Stage[] = [
  {
    key: "preproduction",
    number: 1,
    title: "Pre-Production",
    blurb: "Develop the concept, script, cast, visual plan, locations, budget and schedule.",
    icon: "preproduction",
    hrefFor: (id) => `/projects/${id}/pre-production`,
    isDone: (signals) =>
      signals.hasLogline &&
      (signals.hasScript || signals.sceneCount > 0) &&
      signals.characterCount > 0,
    ctaLabel: "Open Pre-Production",
    surfaces: [
      "Pitch Lab",
      "Script",
      "Casting",
      "Storyboards",
      "Locations",
      "Wardrobe",
      "Budget",
      "Schedule",
    ],
  },
  {
    key: "production",
    number: 2,
    title: "Production",
    blurb: "Generate, review and lock shots, performances, sound and scene continuity.",
    icon: "production",
    hrefFor: (id) => `/projects/${id}/multi-shot`,
    isDone: (signals) => signals.hasShotsGenerated || signals.hasLockedShots,
    ctaLabel: "Open Production",
    surfaces: [
      "Scene Editor",
      "Multi-Shot Sequencer",
      "Voice Studio",
      "Continuity",
      "Daily Reports",
      "Broadcast Render",
    ],
  },
  {
    key: "postproduction",
    number: 3,
    title: "Post-Production",
    blurb: "Edit, finish picture and sound, add accessibility, export and prepare promotion.",
    icon: "post",
    hrefFor: (id) => `/projects/${id}/cutting-room`,
    isDone: (signals) => signals.hasExport,
    ctaLabel: "Open Post-Production",
    surfaces: [
      "Cutting Room",
      "VFX",
      "Colour",
      "Sound",
      "Dubbing",
      "Subtitles",
      "Trailer",
      "Press Kit",
      "Export",
    ],
  },
  {
    key: "funding",
    number: 4,
    title: "Funding",
    blurb: "Prepare the finance case, find funders, apply, crowdfund and track results.",
    icon: "reports",
    hrefFor: () => "/funding",
    isDone: (signals) => signals.hasFundingApplication || signals.hasCampaign,
    ctaLabel: "Open Funding",
    surfaces: [
      "Funding Command Centre",
      "Pitch Deck",
      "Crowdfunding",
      "Tax Incentives",
      "Legal Documents",
      "Campaign Tracking",
    ],
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

    for (const stage of PROJECT_JOURNEY_STAGES) {
      const completed = stage.isDone(signals);
      let status: StageStatus;
      if (completed) {
        status = "done";
        done += 1;
      } else if (!foundCurrent) {
        status = "active";
        foundCurrent = true;
      } else {
        status = "todo";
      }
      enriched.push({ ...stage, status });
    }

    const current =
      enriched.find((stage) => stage.status === "active") ??
      enriched[enriched.length - 1];

    return {
      stagesWithStatus: enriched,
      currentStage: current,
      completedCount: done,
      percent: Math.round((done / PROJECT_JOURNEY_STAGES.length) * 100),
    };
  }, [signals]);

  return (
    <div className="space-y-6">
      <Card
        className="glass-card shadow-lg"
        style={{
          border: "1px solid rgba(212,175,55,0.2)",
          background:
            "linear-gradient(135deg,rgba(212,175,55,0.04) 0%,rgba(255,255,255,0.015) 100%)",
        }}
      >
        <CardContent className="p-4 sm:p-6">
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="mb-1 text-xs uppercase tracking-widest text-amber-500/80">
                The Filmmaker&apos;s Journey
              </div>
              <h3 className="font-serif text-2xl gradient-text-gold">
                {currentStage.status === "active" ? "Next: " : "Complete: "}
                <span className="text-amber-400">{currentStage.title}</span>
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {currentStage.blurb}
              </p>
            </div>
            <Link href={currentStage.hrefFor(projectId)}>
              <Button
                size="lg"
                className="min-h-11 whitespace-nowrap bg-amber-600 font-medium text-black hover:bg-amber-500"
              >
                {currentStage.ctaLabel}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
              <span>
                Stage {currentStage.number} of {PROJECT_JOURNEY_STAGES.length} · {completedCount} complete
              </span>
              <span>{percent}%</span>
            </div>
            <Progress value={percent} className="h-2 [&>div]:bg-amber-500" />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stagesWithStatus.map((stage) => {
          const active = stage.status === "active";
          const done = stage.status === "done";
          return (
            <Link key={stage.key} href={stage.hrefFor(projectId)}>
              <Card
                className={[
                  "min-h-[196px] cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-500/40 hover:shadow-md active:translate-y-0 active:scale-[0.99]",
                  active
                    ? "border-amber-500/60 bg-amber-500/5 shadow-[0_0_0_1px_rgba(245,158,11,0.3)]"
                    : done
                      ? "border-emerald-500/30 bg-emerald-500/5"
                      : "border-border/40 bg-card/30",
                ].join(" ")}
              >
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className={[
                        "flex h-12 w-12 items-center justify-center rounded-xl",
                        active
                          ? "bg-amber-500/15"
                          : done
                            ? "bg-emerald-500/10"
                            : "bg-muted/40",
                      ].join(" ")}
                    >
                      <HollywoodIcon
                        tool={stage.icon}
                        size={34}
                        className={active || done ? "opacity-100" : "opacity-60"}
                        alt={stage.title}
                      />
                    </div>
                    {done ? (
                      <CheckCircle2
                        className="h-4 w-4 text-emerald-400"
                        aria-label="Complete"
                      />
                    ) : active ? (
                      <Badge className="bg-amber-500/20 text-[10px] text-amber-400 hover:bg-amber-500/20">
                        Now
                      </Badge>
                    ) : (
                      <Circle
                        className="h-4 w-4 text-muted-foreground/40"
                        aria-label="Upcoming"
                      />
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Stage {stage.number}
                    </div>
                    <div className="text-base font-semibold leading-tight">
                      {stage.title}
                    </div>
                    <div className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                      {stage.blurb}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {stage.surfaces.slice(0, 4).map((surface) => (
                      <span
                        key={surface}
                        className="rounded-full border border-border/50 bg-background/30 px-2 py-0.5 text-[9px] text-muted-foreground"
                      >
                        {surface}
                      </span>
                    ))}
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
