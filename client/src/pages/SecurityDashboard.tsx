import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useState } from "react";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Lock,
  Unlock,
  Activity,
  Users,
  Eye,
  Loader2,
  RefreshCw,
  Search,
  Clock,
  XCircle,
  CheckCircle,
  AlertOctagon,
} from "lucide-react";

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    critical: "bg-red-500/20 text-red-400 border-red-500/30",
    high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    low: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  };
  return (
    <Badge variant="outline" className={colors[severity] || ""}>
      {severity}
    </Badge>
  );
}

function formatTimestamp(ts: number) {
  return new Date(ts).toLocaleString();
}

function formatTimeAgo(ts: number) {
  const diff = Date.now() - ts;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

export default function SecurityDashboard() {
  const { user: currentUser } = useAuth();
  const utils = trpc.useUtils();
  const [severityFilter, setSeverityFilter] = useState<string>("");
  const [auditUserFilter, setAuditUserFilter] = useState<string>("");
  const [lockUserId, setLockUserId] = useState("");
  const [lockDuration, setLockDuration] = useState("30");
  const [lockReason, setLockReason] = useState("");

  // Queries
  const statsQuery = trpc.security.stats.useQuery(undefined, { retry: false, refetchInterval: 30000 });
  const eventsQuery = trpc.security.events.useQuery(
    { limit: 100, severity: (severityFilter || undefined) as any },
    { retry: false, refetchInterval: 15000 }
  );
  const flaggedQuery = trpc.security.flaggedUsers.useQuery(undefined, { retry: false, refetchInterval: 15000 });
  const auditQuery = trpc.security.auditLog.useQuery(
    { limit: 100, userId: auditUserFilter ? parseInt(auditUserFilter) : undefined },
    { retry: false, refetchInterval: 30000 }
  );

  // Mutations
  const unflagMutation = trpc.security.unflagUser.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      utils.security.flaggedUsers.invalidate();
      utils.security.stats.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const lockMutation = trpc.security.lockUser.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      utils.security.flaggedUsers.invalidate();
      utils.security.stats.invalidate();
      setLockUserId("");
      setLockReason("");
    },
    onError: (err) => toast.error(err.message),
  });

  if (currentUser?.role !== "admin") {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Card className="border-border/50 bg-card/80 max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-2">
              <Shield className="w-6 h-6 text-red-500" />
            </div>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You need admin privileges to access the Security Dashboard.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const stats = statsQuery.data;

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-red-500" />
            Security Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor fraud detection, audit trails, and user security
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            utils.security.stats.invalidate();
            utils.security.events.invalidate();
            utils.security.flaggedUsers.invalidate();
            utils.security.auditLog.invalidate();
            toast.success("Refreshed all security data");
          }}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      {statsQuery.isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <Card className="border-border/50 bg-card/80">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalEvents}</p>
                  <p className="text-xs text-muted-foreground">Total Events</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-card/80">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <AlertOctagon className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.criticalEvents}</p>
                  <p className="text-xs text-muted-foreground">Critical</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-card/80">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.highEvents}</p>
                  <p className="text-xs text-muted-foreground">High Severity</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-card/80">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.flaggedUsers}</p>
                  <p className="text-xs text-muted-foreground">Flagged Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-card/80">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.lockedOutUsers}</p>
                  <p className="text-xs text-muted-foreground">Locked Out</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-card/80">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Eye className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalAuditEntries}</p>
                  <p className="text-xs text-muted-foreground">Audit Entries</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-card/80 col-span-2">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.registrationAttempts24h}</p>
                  <p className="text-xs text-muted-foreground">Registration Attempts (24h)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Flagged Users */}
      <Card className="border-border/50 bg-card/80">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Flagged Users
          </CardTitle>
          <CardDescription>Users flagged for suspicious activity</CardDescription>
        </CardHeader>
        <CardContent>
          {flaggedQuery.isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
            </div>
          ) : (flaggedQuery.data?.length ?? 0) === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-green-500" />
              <p>No flagged users. All clear.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">User ID</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Reason</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Gen/1h</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Gen/24h</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">IPs</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {flaggedQuery.data?.map((u) => (
                    <tr key={u.userId} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 text-sm font-mono">#{u.userId}</td>
                      <td className="py-3 px-4 text-sm text-orange-400">{u.flagReason}</td>
                      <td className="py-3 px-4 text-sm">{u.generationCount1h}</td>
                      <td className="py-3 px-4 text-sm">{u.generationCount24h}</td>
                      <td className="py-3 px-4 text-sm">{u.uniqueIPs}</td>
                      <td className="py-3 px-4">
                        {u.lockedOut ? (
                          <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/30">
                            <Lock className="w-3 h-3 mr-1" /> Locked
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                            <AlertTriangle className="w-3 h-3 mr-1" /> Flagged
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => unflagMutation.mutate({ userId: u.userId })}
                          disabled={unflagMutation.isPending}
                          className="text-green-400 border-green-500/30 hover:bg-green-500/10"
                        >
                          <Unlock className="w-3 h-3 mr-1" />
                          Unflag
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lock User Action */}
      <Card className="border-border/50 bg-card/80">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Lock className="w-5 h-5 text-red-500" />
            Lock User Account
          </CardTitle>
          <CardDescription>Manually lock a user account for a specified duration</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[100px]">
              <label className="text-xs text-muted-foreground mb-1 block">User ID</label>
              <Input
                type="number"
                placeholder="User ID"
                value={lockUserId}
                onChange={(e) => setLockUserId(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="flex-1 min-w-[100px]">
              <label className="text-xs text-muted-foreground mb-1 block">Duration (minutes)</label>
              <Input
                type="number"
                placeholder="30"
                value={lockDuration}
                onChange={(e) => setLockDuration(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="flex-[2] min-w-[200px]">
              <label className="text-xs text-muted-foreground mb-1 block">Reason</label>
              <Input
                placeholder="Reason for locking..."
                value={lockReason}
                onChange={(e) => setLockReason(e.target.value)}
                className="h-9"
              />
            </div>
            <Button
              variant="destructive"
              size="sm"
              disabled={!lockUserId || !lockReason || lockMutation.isPending}
              onClick={() => {
                lockMutation.mutate({
                  userId: parseInt(lockUserId),
                  durationMinutes: parseInt(lockDuration) || 30,
                  reason: lockReason,
                });
              }}
            >
              <Lock className="w-3 h-3 mr-1" />
              Lock Account
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Security Events */}
      <Card className="border-border/50 bg-card/80">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-500" />
                Security Events
              </CardTitle>
              <CardDescription>Recent fraud detection and security alerts</CardDescription>
            </div>
            <div className="flex gap-2">
              {["", "critical", "high", "medium", "low"].map((sev) => (
                <Button
                  key={sev}
                  variant={severityFilter === sev ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSeverityFilter(sev)}
                  className="text-xs h-7"
                >
                  {sev || "All"}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {eventsQuery.isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
            </div>
          ) : (eventsQuery.data?.length ?? 0) === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-green-500" />
              <p>No security events recorded.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {eventsQuery.data?.map((event, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/30"
                >
                  <div className="mt-0.5">
                    {event.severity === "critical" ? (
                      <AlertOctagon className="w-4 h-4 text-red-500" />
                    ) : event.severity === "high" ? (
                      <AlertTriangle className="w-4 h-4 text-orange-500" />
                    ) : (
                      <Activity className="w-4 h-4 text-blue-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <SeverityBadge severity={event.severity} />
                      <Badge variant="outline" className="text-xs">
                        {event.type.replace(/_/g, " ")}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTimeAgo(event.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-foreground/80 mt-1 break-words">{event.description}</p>
                    {event.ip && (
                      <span className="text-xs text-muted-foreground font-mono">IP: {event.ip}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Audit Log */}
      <Card className="border-border/50 bg-card/80">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Eye className="w-5 h-5 text-green-500" />
                Audit Log
              </CardTitle>
              <CardDescription>Complete trail of user actions</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input
                type="number"
                placeholder="Filter by User ID"
                value={auditUserFilter}
                onChange={(e) => setAuditUserFilter(e.target.value)}
                className="h-8 w-[150px] text-xs"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {auditQuery.isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
            </div>
          ) : (auditQuery.data?.length ?? 0) === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <p>No audit entries found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b border-border/50">
                    <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Time</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">User</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Action</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">IP</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {auditQuery.data?.map((entry, i) => (
                    <tr key={i} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                      <td className="py-2 px-3 text-xs text-muted-foreground whitespace-nowrap">
                        {formatTimestamp(entry.timestamp)}
                      </td>
                      <td className="py-2 px-3 text-xs font-mono">
                        {entry.userId === 0 ? "system" : `#${entry.userId}`}
                      </td>
                      <td className="py-2 px-3 text-xs">
                        <Badge variant="outline" className="text-[10px]">
                          {entry.action.replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 text-xs font-mono text-muted-foreground">{entry.ip}</td>
                      <td className="py-2 px-3">
                        {entry.success ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                      </td>
                      <td className="py-2 px-3 text-xs text-muted-foreground max-w-[200px] truncate">
                        {entry.details ? JSON.stringify(entry.details) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
