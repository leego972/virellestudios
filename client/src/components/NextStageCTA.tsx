import { Link } from "wouter";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { HollywoodIcon } from "@/components/HollywoodIcon";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  JOURNEY_STAGES,
  getNextStage,
  getStage,
  normaliseLegacyJourneyStage,
} from "@/lib/journeyStages";

/**
 * Linear-flow footer for production feature pages.
 * Numeric values from the former eight-stage journey are normalised into the
 * four-stage model so existing pages do not need fragile one-off rewrites.
 */
export function NextStageCTA({
  projectId,
  currentStage,
}: {
  projectId: number | string;
  currentStage: number;
}) {
  const stageNumber = normaliseLegacyJourneyStage(currentStage);
  const current = getStage(stageNumber);
  const next = getNextStage(stageNumber);

  if (!current) return null;

  if (!next) {
    return (
      <Card className="mt-8 border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 to-amber-500/10 glass-card">
        <CardContent className="flex flex-col items-start justify-between gap-4 p-4 sm:flex-row sm:items-center sm:p-6">
          <div className="flex min-w-0 items-start gap-3">
            <HollywoodIcon tool="reports" size={32} className="shrink-0" alt="Funding" />
            <div className="min-w-0">
              <p className="text-base font-semibold">
                All four stages are available from your project workspace.
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Pre-Production, Production, Post-Production and Funding remain open so you can revisit any stage as the film evolves.
              </p>
            </div>
          </div>
          <Link href={`/projects/${projectId}`}>
            <Button className="min-h-11 gap-2 whitespace-nowrap">
              Back to project home <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className="mt-8 glass-card"
      style={{
        border: "1px solid rgba(212,175,55,0.3)",
        background:
          "linear-gradient(135deg,rgba(212,175,55,0.05) 0%,rgba(255,255,255,0.01) 100%)",
      }}
    >
      <CardContent className="flex flex-col items-start justify-between gap-4 p-4 sm:flex-row sm:items-center sm:p-6">
        <div className="flex min-w-0 items-start gap-3">
          <div className="shrink-0 rounded-full bg-emerald-500/15 p-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Stage {current.number} of {JOURNEY_STAGES.length} · {current.title}
            </p>
            <p className="mt-0.5 text-base font-semibold">
              Next: Stage {next.number} — {next.title}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{next.blurb}</p>
          </div>
        </div>
        <Link href={next.hrefFor(projectId)}>
          <Button className="min-h-11 gap-2 whitespace-nowrap">
            Continue <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

export default NextStageCTA;
