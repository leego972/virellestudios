import { useState } from "react";
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
  const { user: currentUser } = useAuth();
  const utils = trpc.useUtils();

  // ─── Users state ───────────────────────────────────────────────────────────
  const usersQuery = trpc.admin.listUsers.useQuery(undefined, { retry: false });

  const updateRoleMutation = trpc.admin.updateUserRole.useMutation({
    onSuccess: () => { utils.admin.listUsers.invalidate(); toast.success("User role updated"); },
    onError: (err) => toast.error(err.message || "Failed to update role"),
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
        <Card className="border-border/50 bg-card/80 max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-2">
              <Shield className="w-6 h-6 text-red-500" />
            </div>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You need admin privileges to access this page.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const users = usersQuery.data ?? [];
  const projects = projectsQuery.data ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="w-6 h-6 text-amber-500" />
            Admin Panel
          </h1>
          <p className="text-muted-foreground mt-1">Manage users, roles, and projects</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="border-border/50 bg-card/80">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{users.length}</p>
                <p className="text-xs text-muted-foreground">Total Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/80">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Crown className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{users.filter(u => u.role === "admin").length}</p>
                <p className="text-xs text-muted-foreground">Admins</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/80">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <User className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{users.filter(u => u.role === "user").length}</p>
                <p className="text-xs text-muted-foreground">Regular Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/80">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Film className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{projects.length}</p>
                <p className="text-xs text-muted-foreground">Total Projects</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="users">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="users" className="gap-2">
            <Users className="w-4 h-4" /> Users
          </TabsTrigger>
          <TabsTrigger value="projects" className="gap-2">
            <Film className="w-4 h-4" /> Projects
          </TabsTrigger>
        </TabsList>

        {/* ─── Users Tab ─────────────────────────────────────────────────── */}
        <TabsContent value="users" className="mt-4">
          {usersQuery.isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            </div>
          ) : usersQuery.error ? (
            <Card className="border-border/50 bg-card/80">
              <CardHeader className="text-center">
                <CardTitle>Error</CardTitle>
                <CardDescription>{usersQuery.error.message}</CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <Card className="border-border/50 bg-card/80">
              <CardHeader>
                <CardTitle className="text-lg">All Users</CardTitle>
                <CardDescription>View and manage registered users</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border/50">
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">User</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Email</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Role</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Login Method</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Joined</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Last Active</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500/20 to-amber-700/20 flex items-center justify-center text-sm font-medium text-amber-500">
                                {(u.name || "?").charAt(0).toUpperCase()}
                              </div>
                              <span className="font-medium text-foreground text-sm">
                                {u.name || "Unnamed"}
                                {u.id === currentUser?.id && (
                                  <Badge variant="outline" className="ml-2 text-[10px] py-0">You</Badge>
                                )}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm text-muted-foreground">{u.email || "—"}</td>
                          <td className="py-3 px-4">
                            <Badge
                              variant={u.role === "admin" ? "default" : "secondary"}
                              className={u.role === "admin" ? "bg-purple-500/20 text-purple-400 border-purple-500/30" : ""}
                            >
                              {u.role === "admin" ? (
                                <><Crown className="w-3 h-3 mr-1" /> Admin</>
                              ) : (
                                <><User className="w-3 h-3 mr-1" /> User</>
                              )}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-sm text-muted-foreground capitalize">{u.loginMethod || "oauth"}</td>
                          <td className="py-3 px-4 text-sm text-muted-foreground">
                            {new Date(u.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 text-sm text-muted-foreground">
                            {new Date(u.lastSignedIn).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {u.id === currentUser?.id ? (
                              <span className="text-xs text-muted-foreground">—</span>
                            ) : (
                              <Select
                                value={u.role}
                                onValueChange={(newRole) => {
                                  updateRoleMutation.mutate({ userId: u.id, role: newRole as "user" | "admin" });
                                }}
                                disabled={updateRoleMutation.isPending}
                              >
                                <SelectTrigger className="w-[110px] h-8 text-xs">
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
                      ))}
                      {users.length === 0 && (
                        <tr>
                          <td colSpan={7} className="text-center py-8 text-muted-foreground">No users found</td>
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
            <Card className="border-border/50 bg-card/80">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
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
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">ID</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Title</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Owner</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Genre</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Scenes</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Created</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Actions</th>
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
                          <td colSpan={8} className="text-center py-8 text-muted-foreground">
                            {projectSearch ? "No projects match your search." : "No projects found."}
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
      </Tabs>

      {/* ─── Delete Confirmation Dialog ──────────────────────────────────── */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) { setDeleteTarget(null); setDeleteReason(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
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
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Deleting…</>
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
