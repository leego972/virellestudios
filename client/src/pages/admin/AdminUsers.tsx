import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Shield, Users, Loader2, Crown, User, Film, Trash2, Search,
  AlertTriangle, CheckCircle2, Clock, XCircle, RefreshCw,
  Zap, Calendar, UserX, UserCheck, Gift,
} from "lucide-react";

// ─── Status badge for project status ───────────────────────────────────────
function ProjectStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string; icon: any }> = {
    draft:       { label: "Draft",      className: "bg-muted text-muted-foreground border-border",          icon: Clock },
    generating:  { label: "Generating", className: "bg-blue-500/10 text-blue-400 border-blue-500/30",       icon: RefreshCw },
    paused:      { label: "Paused",     className: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30", icon: Clock },
    completed:   { label: "Completed",  className: "bg-green-500/10 text-green-400 border-green-500/30",    icon: CheckCircle2 },
    failed:      { label: "Failed",     className: "bg-red-500/10 text-red-400 border-red-500/30",          icon: XCircle },
  };
  const cfg = map[status] ?? map.draft;
  const Icon = cfg.icon;
  return (
    <Badge variant="outline" className={`text-[10px] ${cfg.className}`}>
      <Icon className="w-3 h-3 mr-1" />
      {cfg.label}
    </Badge>
  );
}

export default function AdminUsers() {
    const { user } = useAuth();
    const [, setLocation] = useLocation();
    useEffect(() => {
      if (user !== undefined && user !== null && !user.isAdmin) {
        setLocation("/");
      }
    }, [user, setLocation]);
  
  const { user: currentUser } = useAuth();
  const utils = trpc.useUtils();

  // ─── Users state ───────────────────────────────────────────────────────────
  const usersQuery = trpc.admin.listUsers.useQuery(undefined, { retry: false });

  const updateRoleMutation = trpc.admin.updateUserRole.useMutation({
    onSuccess: () => { utils.admin.listUsers.invalidate(); toast.success("User role updated"); },
    onError: (err) => toast.error(err.message || "Failed to update role"),
  });
  const [betaDays, setBetaDays] = useState<Record<number, number>>({});
  const assignBetaMutation = trpc.admin.assignBetaTier.useMutation({
    onSuccess: (_, vars) => {
      utils.admin.listUsers.invalidate();
      toast.success(`Beta tier assigned — expires in ${betaDays[vars.userId] || 90} days`);
    },
    onError: (err) => toast.error(err.message || "Failed to assign beta tier"),
  });
  const revokeBetaMutation = trpc.admin.revokeBetaTier.useMutation({
    onSuccess: () => { utils.admin.listUsers.invalidate(); toast.success("Beta tier revoked"); },
    onError: (err) => toast.error(err.message || "Failed to revoke beta tier"),
  });
  const grantCreditsMutation = trpc.admin.grantCredits.useMutation({
    onSuccess: () => { utils.admin.listUsers.invalidate(); toast.success("Credits granted"); },
    onError: (err) => toast.error(err.message || "Failed to grant credits"),
  });
  const [grantAmount, setGrantAmount] = useState<Record<number, number>>({});
    const [expandedUser, setExpandedUser] = useState<number | null>(null);

    // ─── Beta tester provisioning ──────────────────────────────────────────────
    const [betaProvisioning, setBetaProvisioning] = useState(false);
    const provisionBetaTesterMutation = trpc.admin.provisionBetaTester.useMutation({
    onSuccess: (data) => {
      setBetaProvisioning(false);
      if (data.created) {
        toast.success(`Beta tester account created! Email: ${data.email} · Password: Hello123`);
      } else {
        toast.success(`API keys synced to existing ${data.email} account`);
      }
      utils.admin.listUsers.invalidate();
    },
    onError: (err) => {
      setBetaProvisioning(false);
      toast.error(err.message || "Failed to provision beta tester");
    },
  });

  // ─── Projects state ────────────────────────────────────────────────────────
  const [projectSearch, setProjectSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; title: string } | null>(null);
  const [deleteReason, setDeleteReason] = useState("");

  const projectsQuery = trpc.project.adminListAll.useQuery(
    { limit: 100, offset: 0, search: projectSearch || undefined },
    { retry: false, enabled: currentUser?.role === "admin" }
  );

  const adminDeleteMutation = trpc.project.adminDelete.useMutation({
    onSuccess: (data) => {
      utils.project.adminListAll.invalidate();
      toast.success(`Project #${data.deletedProjectId} permanently deleted`);
      setDeleteTarget(null);
      setDeleteReason("");
    },
    onError: (err) => toast.error(err.message || "Failed to delete project"),
  });

  // ─── Access guard ──────────────────────────────────────────────────────────
  if (currentUser?.role !== "admin") {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Card className="border-border/50 bg-card/80 max-w-md glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow gold-glow">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-2">
              <Shield className="w-6 h-6 text-red-500" />
            </div>
            <CardTitle className="gradient-text-gold">Access Denied</CardTitle>
            <CardDescription>You need admin privileges to access this page.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const users = usersQuery.data ?? [];
  const projects = projectsQuery.data ?? [];

  return (
    <div className="min-h-screen space-y-6 px-4 py-4" style={{ background:"linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)" }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-gold-shimmer">
            <Shield className="w-6 h-6 text-amber-500" />
            Admin Panel
          </h1>
          <p className="text-muted-foreground mt-1">Manage users, roles, and projects</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="border-border/50 bg-card/80 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold gradient-text-gold">{users.length}</p>
                <p className="text-xs text-muted-foreground">Total Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/80 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Crown className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold gradient-text-gold">{users.filter(u => u.role === "admin").length}</p>
                <p className="text-xs text-muted-foreground">Admins</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/80 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <User className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold gradient-text-gold">{users.filter(u => u.role === "user").length}</p>
                <p className="text-xs text-muted-foreground">Regular Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/80 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Film className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold gradient-text-gold">{projects.length}</p>
                <p className="text-xs text-muted-foreground">Total Projects</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
        <Card className="border-amber-500/20 bg-amber-500/5 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 gradient-text-gold">
              <Gift className="w-4 h-4 text-amber-500" />
              Beta Tester Account
            </CardTitle>
            <CardDescription>
              Creates <strong>tester@virelle.life</strong> / <strong>Hello123</strong> with Studio-tier access and copies your saved API keys to their account. Safe to run multiple times — re-running just syncs your latest API keys.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full sm:w-auto gap-2 bg-amber-600 hover:bg-amber-700 text-white"
              disabled={provisionBetaTesterMutation.isPending || betaProvisioning}
              onClick={() => { setBetaProvisioning(true); provisionBetaTesterMutation.mutate(); }}
            >
              {provisionBetaTesterMutation.isPending || betaProvisioning
                ? <><Loader2 className="w-4 h-4 animate-spin text-amber-400" /> Provisioning…</>
                : <><Zap className="w-4 h-4" /> Provision / Sync Beta Tester</>}
            </Button>
            <p className="text-xs text-muted-foreground mt-2">Studio tier · 50,000 credits · 9,999 bonus generations · all your BYOK keys copied</p>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="users" className="w-full">
        <div className="overflow-x-auto pb-2 -mx-1 px-1 no-scrollbar">
          <TabsList className="bg-muted/50 w-full sm:w-auto inline-flex min-w-full sm:min-w-0">
            <TabsTrigger value="users" className="gap-2 flex-1 sm:flex-none data-[state=active]:text-amber-400">
              <Users className="w-4 h-4" /> Users
            </TabsTrigger>
            <TabsTrigger value="projects" className="gap-2 flex-1 sm:flex-none data-[state=active]:text-amber-400">
              <Film className="w-4 h-4" /> Projects
            </TabsTrigger>
            <TabsTrigger value="beta" className="gap-2 flex-1 sm:flex-none data-[state=active]:text-amber-400">
              <Zap className="w-4 h-4 text-amber-400" /> Beta Testers
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ─── Users Tab ─────────────────────────────────────────────────── */}
        <TabsContent value="users" className="mt-4">
          {usersQuery.isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            </div>
          ) : usersQuery.error ? (
            <Card className="border-border/50 bg-card/80 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
              <CardHeader className="text-center">
                <CardTitle className="gradient-text-gold">Error</CardTitle>
                <CardDescription>{usersQuery.error.message}</CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <Card className="border-border/50 bg-card/80 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg gradient-text-gold">All Users</CardTitle>
                <CardDescription>View and manage registered users</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-amber-500/20">
                        <th className="text-left py-2 px-4 text-[10px] font-semibold text-amber-400/70 border-b border-amber-500/20 uppercase tracking-wide">User</th>
                        <th className="text-left py-2 px-4 text-[10px] font-semibold text-amber-400/70 border-b border-amber-500/20 uppercase tracking-wide">Email / Phone</th>
                        <th className="text-left py-2 px-4 text-[10px] font-semibold text-amber-400/70 border-b border-amber-500/20 uppercase tracking-wide">Company</th>
                        <th className="text-left py-2 px-4 text-[10px] font-semibold text-amber-400/70 border-b border-amber-500/20 uppercase tracking-wide">Role / Industry</th>
                        <th className="text-left py-2 px-4 text-[10px] font-semibold text-amber-400/70 border-b border-amber-500/20 uppercase tracking-wide">Plan</th>
                        <th className="text-left py-2 px-4 text-[10px] font-semibold text-amber-400/70 border-b border-amber-500/20 uppercase tracking-wide">Joined</th>
                        <th className="text-right py-2 px-4 text-[10px] font-semibold text-amber-400/70 border-b border-amber-500/20 uppercase tracking-wide">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                          <>
                            {/* ── Main Row ── */}
                            <tr
                              key={u.id}
                              className="border-b border-border/30 hover:bg-muted/20 transition-colors cursor-pointer"
                              onClick={() => setExpandedUser(expandedUser === u.id ? null : u.id)}
                            >
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500/20 to-amber-700/20 flex items-center justify-center text-sm font-semibold text-amber-500 flex-shrink-0">
                                    {(u.name || "?").charAt(0).toUpperCase()}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="font-medium text-foreground text-sm truncate">
                                      {u.name || "Unnamed"}
                                      {u.id === currentUser?.id && <Badge variant="outline" className="ml-1 text-[10px] py-0">You</Badge>}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground capitalize">{u.loginMethod || "oauth"}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="text-sm text-muted-foreground">{u.email || "—"}</div>
                                {u.phone && <div className="text-[11px] text-muted-foreground/60">{u.phone}</div>}
                              </td>
                              <td className="py-3 px-4">
                                {u.companyName ? (
                                  <div>
                                    <div className="text-sm font-medium text-foreground truncate max-w-[140px]">{u.companyName}</div>
                                    {u.jobTitle && <div className="text-[11px] text-muted-foreground/70">{u.jobTitle}</div>}
                                  </div>
                                ) : <span className="text-xs text-muted-foreground/40">—</span>}
                              </td>
                              <td className="py-3 px-4">
                                <Badge
                                  variant={u.role === "admin" ? "default" : "secondary"}
                                  className={u.role === "admin" ? "bg-purple-500/20 text-purple-400 border-purple-500/30" : ""}
                                >
                                  {u.role === "admin" ? <><Crown className="w-3 h-3 mr-1" />Admin</> : <><User className="w-3 h-3 mr-1" />User</>}
                                </Badge>
                                {u.professionalRole && <div className="text-[11px] text-muted-foreground/70 mt-0.5">{u.professionalRole}</div>}
                              </td>
                              <td className="py-3 px-4">
                                <div className="text-xs text-amber-400 font-semibold capitalize">{u.subscriptionTier || "free"}</div>
                                <div className="text-[11px] text-muted-foreground/60">{(u.creditBalance ?? 0).toLocaleString()} cr</div>
                              </td>
                              <td className="py-3 px-4 text-sm text-muted-foreground whitespace-nowrap">
                                {new Date(u.createdAt).toLocaleDateString()}
                              </td>
                              <td className="py-3 px-4 text-right" onClick={e => e.stopPropagation()}>
                                {u.id === currentUser?.id ? (
                                  <span className="text-xs text-muted-foreground">—</span>
                                ) : (
                                  <Select
                                    value={u.role}
                                    onValueChange={(newRole) => updateRoleMutation.mutate({ userId: u.id, role: newRole as "user" | "admin" })}
                                    disabled={updateRoleMutation.isPending}
                                  >
                                    <SelectTrigger className="w-[100px] h-7 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="user">User</SelectItem>
                                      <SelectItem value="admin">Admin</SelectItem>
                                    </SelectContent>
                                  </Select>
                                )}
                              </td>
                            </tr>

                            {/* ── Expanded Profile Row ── */}
                            {expandedUser === u.id && (
                              <tr className="bg-amber-500/3 border-b border-amber-500/20">
                                <td colSpan={7} className="px-4 py-4">
                                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
                                    {[
                                      { label: "Primary Use Case", value: u.primaryUseCase },
                                      { label: "Industry", value: u.industryType },
                                      { label: "Experience", value: u.experienceLevel },
                                      { label: "Team Size", value: u.teamSize },
                                      { label: "Company Website", value: u.companyWebsite },
                                      { label: "Portfolio URL", value: u.portfolioUrl },
                                      { label: "How They Found Us", value: u.howDidYouHear },
                                      { label: "Subscription Status", value: u.subscriptionStatus },
                                      { label: "Stripe Customer ID", value: u.stripeCustomerId },
                                      { label: "Marketing Opt-In", value: u.marketingOptIn ? "Yes" : "No" },
                                    ].map(({ label, value }) => value ? (
                                      <div key={label} className="space-y-0.5">
                                        <div className="text-[10px] text-amber-400/60 uppercase tracking-wide font-semibold">{label}</div>
                                        <div className="text-muted-foreground break-all">{value}</div>
                                      </div>
                                    ) : null)}
                                    {Array.isArray(u.preferredGenres) && u.preferredGenres.length > 0 && (
                                      <div className="space-y-0.5 col-span-2">
                                        <div className="text-[10px] text-amber-400/60 uppercase tracking-wide font-semibold">Preferred Genres</div>
                                        <div className="flex flex-wrap gap-1">
                                          {(u.preferredGenres as string[]).map((g: string) => (
                                            <Badge key={g} variant="outline" className="text-[10px] py-0 px-1.5">{g}</Badge>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  {/* Credits & billing actions */}
                                  <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border/30" onClick={e => e.stopPropagation()}>
                                    <div className="flex items-center gap-2">
                                      <Input
                                        type="number"
                                        placeholder="Credits to grant"
                                        className="h-7 w-36 text-xs"
                                        value={grantAmount[u.id] ?? ""}
                                        onChange={e => setGrantAmount(prev => ({ ...prev, [u.id]: Number(e.target.value) }))}
                                      />
                                      <Button
                                        size="sm"
                                        className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white"
                                        disabled={grantCreditsMutation.isPending || !grantAmount[u.id]}
                                        onClick={() => grantCreditsMutation.mutate({ userId: u.id, amount: grantAmount[u.id] || 0 })}
                                      >
                                        <Zap className="w-3 h-3 mr-1" /> Grant Credits
                                      </Button>
                                    </div>
                                    <div className="flex items-center gap-2 ml-auto">
                                      <Input
                                        type="number"
                                        placeholder="Beta days"
                                        className="h-7 w-24 text-xs"
                                        value={betaDays[u.id] ?? ""}
                                        onChange={e => setBetaDays(prev => ({ ...prev, [u.id]: Number(e.target.value) }))}
                                      />
                                      {u.subscriptionTier === "studio" ? (
                                        <Button size="sm" variant="outline" className="h-7 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10"
                                          disabled={revokeBetaMutation.isPending}
                                          onClick={() => revokeBetaMutation.mutate({ userId: u.id })}>
                                          <UserX className="w-3 h-3 mr-1" /> Revoke Beta
                                        </Button>
                                      ) : (
                                        <Button size="sm" variant="outline" className="h-7 text-xs border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                                          disabled={assignBetaMutation.isPending}
                                          onClick={() => assignBetaMutation.mutate({ userId: u.id, expiresInDays: betaDays[u.id] || 90 })}>
                                          <UserCheck className="w-3 h-3 mr-1" /> Assign Beta
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>
                        ))}
                      {users.length === 0 && (
                        <tr>
                          <td colSpan={7} className="text-center py-10 text-sm text-muted-foreground">No users match the current filters.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ─── Projects Tab ──────────────────────────────────────────────── */}
        <TabsContent value="projects" className="mt-4 space-y-4">
          {/* Search */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by title or user email…"
              value={projectSearch}
              onChange={(e) => setProjectSearch(e.target.value)}
              className="pl-9 bg-muted/50"
            />
          </div>

          {projectsQuery.isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            </div>
          ) : (
            <Card className="border-border/50 bg-card/80 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 gradient-text-gold">
                  <Film className="w-5 h-5 text-amber-500" />
                  All Projects
                </CardTitle>
                <CardDescription>
                  {projects.length} project{projects.length !== 1 ? "s" : ""} across all users.
                  Only admins can delete projects they do not own.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border/50">
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground border-b border-amber-500/20 text-amber-400/70 font-semibold tracking-wide uppercase text-xs">ID</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground border-b border-amber-500/20 text-amber-400/70 font-semibold tracking-wide uppercase text-xs">Title</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground border-b border-amber-500/20 text-amber-400/70 font-semibold tracking-wide uppercase text-xs">Owner</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground border-b border-amber-500/20 text-amber-400/70 font-semibold tracking-wide uppercase text-xs">Genre</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground border-b border-amber-500/20 text-amber-400/70 font-semibold tracking-wide uppercase text-xs">Status</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground border-b border-amber-500/20 text-amber-400/70 font-semibold tracking-wide uppercase text-xs">Scenes</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground border-b border-amber-500/20 text-amber-400/70 font-semibold tracking-wide uppercase text-xs">Created</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground border-b border-amber-500/20 text-amber-400/70 font-semibold tracking-wide uppercase text-xs">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projects.map((p: any) => (
                        <tr key={p.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-4 text-xs text-muted-foreground font-mono">#{p.id}</td>
                          <td className="py-3 px-4">
                            <span className="font-medium text-foreground text-sm">{p.title || "Untitled"}</span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-sm">
                              <p className="text-foreground">{p.userName || "Unknown"}</p>
                              <p className="text-xs text-muted-foreground">{p.userEmail || "—"}</p>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm text-muted-foreground capitalize">{p.genre || "—"}</td>
                          <td className="py-3 px-4">
                            <ProjectStatusBadge status={p.status || "draft"} />
                          </td>
                          <td className="py-3 px-4 text-sm text-muted-foreground">
                            <span className="text-green-400">{Number(p.completedScenes) || 0}</span>
                            <span className="text-muted-foreground">/{Number(p.sceneCount) || 0}</span>
                          </td>
                          <td className="py-3 px-4 text-sm text-muted-foreground">
                            {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "—"}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                              onClick={() => setDeleteTarget({ id: p.id, title: p.title || "Untitled" })}
                              title="Permanently delete this project"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                      {projects.length === 0 && (
                        <tr>
                          <td colSpan={8} className="text-center py-10 text-sm text-muted-foreground">
                            {projectSearch ? "No projects match your search." : "No projects on the platform yet."}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        {/* ─── Beta Testers Tab ───────────────────────────────────────────── */}
        <TabsContent value="beta" className="mt-4">
          <Card className="border-amber-500/30 bg-card/80 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <CardTitle className="text-lg text-amber-400">Beta Tester Management</CardTitle>
                  <CardDescription>Assign, revoke, and manage temporary beta access. Beta users get full Industry-tier access + 5,000 credits.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Beta stats */}
              <div className="flex items-center gap-4 mb-6 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-sm text-amber-300">
                  <strong>{users.filter((u: any) => u.subscriptionTier === "beta").length}</strong> active beta testers
                </span>
                <span className="text-xs text-muted-foreground ml-auto">Beta tier = full Industry access, temporary, revocable</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground border-b border-amber-500/20 text-amber-400/70 font-semibold tracking-wide uppercase text-xs">User</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground border-b border-amber-500/20 text-amber-400/70 font-semibold tracking-wide uppercase text-xs">Email</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground border-b border-amber-500/20 text-amber-400/70 font-semibold tracking-wide uppercase text-xs">Status</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground border-b border-amber-500/20 text-amber-400/70 font-semibold tracking-wide uppercase text-xs">Beta Expires</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground border-b border-amber-500/20 text-amber-400/70 font-semibold tracking-wide uppercase text-xs">Assign Beta (days)</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground border-b border-amber-500/20 text-amber-400/70 font-semibold tracking-wide uppercase text-xs">Grant Credits</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground border-b border-amber-500/20 text-amber-400/70 font-semibold tracking-wide uppercase text-xs">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u: any) => {
                      const isBeta = u.subscriptionTier === "beta";
                      const expiresAt = u.betaExpiresAt ? new Date(u.betaExpiresAt) : null;
                      const isExpired = expiresAt ? expiresAt < new Date() : false;
                      const daysLeft = expiresAt ? Math.ceil((expiresAt.getTime() - Date.now()) / 86400000) : null;
                      return (
                        <tr key={u.id} className={`border-b border-border/30 hover:bg-muted/30 transition-colors ${isBeta ? "bg-amber-500/5" : ""}`}>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${isBeta ? "bg-amber-500/20 text-amber-400" : "bg-muted text-muted-foreground"}`}>
                                {(u.name || "?").charAt(0).toUpperCase()}
                              </div>
                              <span className="font-medium text-foreground text-sm">{u.name || "Unnamed"}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm text-muted-foreground">{u.email || "—"}</td>
                          <td className="py-3 px-4">
                            {isBeta ? (
                              <Badge variant="outline" className={`text-xs ${isExpired ? "bg-red-500/10 text-red-400 border-red-500/30" : "bg-amber-500/10 text-amber-400 border-amber-500/30"}`}>
                                <Zap className="w-3 h-3 mr-1" />
                                {isExpired ? "Beta Expired" : "Beta Active"}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs text-muted-foreground">
                                <User className="w-3 h-3 mr-1" />
                                {u.subscriptionTier || "independent"}
                              </Badge>
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm">
                            {expiresAt ? (
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-muted-foreground" />
                                <span className={isExpired ? "text-red-400" : daysLeft && daysLeft <= 7 ? "text-amber-400" : "text-muted-foreground"}>
                                  {isExpired ? "Expired" : `${daysLeft}d left`}
                                  <span className="text-xs text-muted-foreground ml-1">({expiresAt.toLocaleDateString()})</span>
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min={1}
                                max={365}
                                value={betaDays[u.id] ?? 90}
                                onChange={(e) => setBetaDays(prev => ({ ...prev, [u.id]: parseInt(e.target.value) || 90 }))}
                                className="w-16 h-8 text-xs px-2 rounded-md border border-border/50 bg-muted/50 text-foreground"
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                                disabled={assignBetaMutation.isPending}
                                onClick={() => assignBetaMutation.mutate({ userId: u.id, expiresInDays: betaDays[u.id] ?? 90 })}
                              >
                                <UserCheck className="w-3 h-3 mr-1" />
                                {isBeta ? "Extend" : "Assign"}
                              </Button>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min={1}
                                max={100000}
                                value={grantAmount[u.id] ?? 1000}
                                onChange={(e) => setGrantAmount(prev => ({ ...prev, [u.id]: parseInt(e.target.value) || 1000 }))}
                                className="w-20 h-8 text-xs px-2 rounded-md border border-border/50 bg-muted/50 text-foreground"
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs border-green-500/30 text-green-400 hover:bg-green-500/10 hover:border-amber-500/50 hover:text-amber-400"
                                disabled={grantCreditsMutation.isPending}
                                onClick={() => grantCreditsMutation.mutate({ userId: u.id, amount: grantAmount[u.id] ?? 1000, reason: "Admin grant" })}
                              >
                                <Gift className="w-3 h-3 mr-1" />
                                Grant
                              </Button>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {isBeta && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                disabled={revokeBetaMutation.isPending}
                                onClick={() => revokeBetaMutation.mutate({ userId: u.id })}
                              >
                                <UserX className="w-3 h-3 mr-1" />
                                Revoke Beta
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center py-10 text-sm text-muted-foreground">No team members match the current filters.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── Delete Confirmation Dialog ──────────────────────────────────── */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) { setDeleteTarget(null); setDeleteReason(""); } }}>
        <DialogContent className="max-w-md glass-dark">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400 gradient-text-gold">
              <AlertTriangle className="w-5 h-5" />
              Permanently Delete Project
            </DialogTitle>
            <DialogDescription>
              This will permanently delete <strong className="text-foreground">"{deleteTarget?.title}"</strong> (ID #{deleteTarget?.id})
              and all its scenes, characters, scripts, and generation jobs. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Reason (optional)</label>
              <Input
                placeholder="e.g. Policy violation, test content, duplicate…"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                className="mt-1 bg-muted/50"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setDeleteTarget(null); setDeleteReason(""); }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={adminDeleteMutation.isPending}
              onClick={() => {
                if (!deleteTarget) return;
                adminDeleteMutation.mutate({ id: deleteTarget.id, reason: deleteReason || undefined });
              }}
            >
              {adminDeleteMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin text-amber-400" /> Deleting…</>
              ) : (
                <><Trash2 className="w-4 h-4 mr-2" /> Delete Permanently</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
