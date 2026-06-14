import { Link } from "wouter";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { JOURNEY_STAGES, getNextStage, getStage } from "@/lib/journeyStages";

/**
 * Linear-flow footer for any stage page in the 8-stage filmmaker journey.
 * Shows "Stage N done — next up: Stage N+1: <title>" with a single big CTA.
 * On stage 8 it loops back to the project home and congratulates the user.
 */
export function NextStageCTA({
  projectId,
  currentStage,
}: {
  projectId: number | string;
  currentStage: number; // 1..8
}) {
  const cur = getStage(currentStage);
  const next = getNextStage(currentStage);

  if (!cur) return null;

  if (!next) {
    return (
      <Card className="mt-8 border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 to-amber-500/10 glass-card">
        <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-6 w-6 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-base">All 8 stages complete — congratulations.</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Your film has cleared idea, casting, script, pre-prod, funding, soundstage, post and release.
              </p>
            </div>
          </div>
          <Link href={`/projects/${projectId}`}>
            <Button className="min-h-[44px] gap-2">
              Back to project home <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-8 glass-card" style={{ border:"1px solid rgba(212,175,55,0.3)", background:"linear-gradient(135deg,rgba(212,175,55,0.05) 0%,rgba(255,255,255,0.01) 100%)" }}>
      <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-emerald-500/15 p-2 shrink-0">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Stage {cur.number} of {JOURNEY_STAGES.length} · {cur.title}
            </p>
            <p className="font-semibold text-base mt-0.5">
              Next up: Stage {next.number} — {next.title}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{next.blurb}</p>
          </div>
        </div>
        <Link href={next.hrefFor(projectId)}>
          <Button className="min-h-[44px] gap-2 whitespace-nowrap">
            Continue <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

export default NextStageCTA;
