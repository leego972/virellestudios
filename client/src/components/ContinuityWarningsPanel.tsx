import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
  import { AlertTriangle } from "lucide-react";

  interface ContinuityWarningsPanelProps {
    projectId: number | string;
  }

  export default function ContinuityWarningsPanel({ projectId: _projectId }: ContinuityWarningsPanelProps) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-sm gradient-text-gold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            Continuity Warnings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-xs text-center py-4">No continuity issues detected.</p>
        </CardContent>
      </Card>
    );
  }
  