import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useParams, useLocation } from "wouter";
import { Loader2, ArrowLeft, ShieldCheck, AlertTriangle, AlertCircle, Info, Sparkles } from "lucide-react";
import { useState } from "react";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";

type Issue = {
  severity: string;
  category: string;
  scenes: string;
  description: string;
  suggestion: string;
};

type ContinuityReport = {
  issues: Issue[];
  summary: string;
};

const SEVERITY_CONFIG: Record<string, { icon: typeof AlertCircle; color: string; bg: string }> = {
  high: { icon: AlertCircle, color: "text-red-500", bg: "bg-red-500/10 border-red-500/20" },
  medium: { icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/20" },
  low: { icon: Info, color: "text-blue-500", bg: "bg-blue-500/10 border-blue-500/20" },
};

export default function ContinuityCheck() {
  const { user, loading: authLoading } = useAuth();
  const params = useParams<{ projectId: string }>();
  const [, navigate] = useLocation();
  const projectId = Number(params.projectId);

  const [report, setReport] = useState<ContinuityReport | null>(null);

  const { data: project, isLoading: projectLoading } = trpc.project.get.useQuery(
    { id: projectId },
    { enabled: !!user && !!projectId }
  );

  const checkContinuity = trpc.continuity.check.useMutation({
    onSuccess: (data: ContinuityReport) => {
      setReport(data);
      toast.success(`Found ${data.issues?.length || 0} issues`);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to check continuity");
    },
  });

  if (authLoading || projectLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    window.location.href = getLoginUrl();
    return null;
  }

  const highCount = report?.issues?.filter(i => i.severity === "high").length || 0;
  const medCount = report?.issues?.filter(i => i.severity === "medium").length || 0;
  const lowCount = report?.issues?.filter(i => i.severity === "low").length || 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-9 sm:w-9 shrink-0" onClick={() => navigate(`/projects/${projectId}`)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-semibold truncate">{project?.title} — Continuity Check</h1>
              <p className="text-xs text-muted-foreground">AI-powered script supervision</p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => checkContinuity.mutate({ projectId })}
            disabled={checkContinuity.isPending}
          >
            {checkContinuity.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Sparkles className="h-4 w-4 mr-1" />
            )}
            {report ? "Re-check" : "Run Check"}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {!report ? (
          <div className="flex flex-col items-center py-20 text-center">
            <ShieldCheck className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground mb-1">No continuity check run yet</p>
            <p className="text-xs text-muted-foreground mb-4">
              AI will analyze your scenes for wardrobe, time, weather, character, and prop continuity errors
            </p>
            <Button
              onClick={() => checkContinuity.mutate({ projectId })}
              disabled={checkContinuity.isPending}
            >
              {checkContinuity.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Sparkles className="h-4 w-4 mr-1" />
              )}
              Run Continuity Check
            </Button>
          </div>
        ) : (
          <>
            {/* Summary */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-4 mb-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive" className="text-xs">{highCount} High</Badge>
                    <Badge className="text-xs bg-amber-500/20 text-amber-500 border-amber-500/30">{medCount} Medium</Badge>
                    <Badge className="text-xs bg-blue-500/20 text-blue-500 border-blue-500/30">{lowCount} Low</Badge>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{report.summary}</p>
              </CardContent>
            </Card>

            {/* Issues */}
            {report.issues.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <ShieldCheck className="h-10 w-10 text-green-500 mx-auto mb-2" />
                  <p className="text-sm font-medium">No continuity issues found</p>
                  <p className="text-xs text-muted-foreground">Your scenes are consistent</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {report.issues.map((issue, idx) => {
                  const config = SEVERITY_CONFIG[issue.severity] || SEVERITY_CONFIG.low;
                  const Icon = config.icon;
                  return (
                    <Card key={idx} className={`border ${config.bg}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${config.color}`} />
                          <div className="flex-1 space-y-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="text-[10px]">{issue.category}</Badge>
                              <span className="text-xs text-muted-foreground">{issue.scenes}</span>
                            </div>
                            <p className="text-sm">{issue.description}</p>
                            <p className="text-xs text-muted-foreground">
                              <span className="font-medium">Suggestion:</span> {issue.suggestion}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
