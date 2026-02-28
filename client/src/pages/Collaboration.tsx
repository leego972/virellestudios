import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  UserPlus,
  Users,
  Copy,
  Trash2,
  Loader2,
  Mail,
  Shield,
  CheckCircle,
  Clock,
  XCircle,
  Link as LinkIcon,
  Crown,
  Pencil,
  Eye,
  Clapperboard,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLocation, useParams } from "wouter";
import { useState } from "react";
import { toast } from "sonner";

const ROLE_CONFIG = {
  director: { label: "Director", icon: Crown, color: "text-amber-500", description: "Full creative control and project management" },
  producer: { label: "Producer", icon: Clapperboard, color: "text-blue-500", description: "Oversee production, budgets, and scheduling" },
  editor: { label: "Editor", icon: Pencil, color: "text-green-500", description: "Edit scenes, scripts, and project content" },
  viewer: { label: "Viewer", icon: Eye, color: "text-muted-foreground", description: "View-only access to the project" },
} as const;

const STATUS_CONFIG = {
  pending: { label: "Pending", icon: Clock, color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
  accepted: { label: "Active", icon: CheckCircle, color: "bg-green-500/10 text-green-600 border-green-500/20" },
  declined: { label: "Declined", icon: XCircle, color: "bg-red-500/10 text-red-600 border-red-500/20" },
} as const;

export default function Collaboration() {
  const { user, loading: authLoading } = useAuth();
  const params = useParams<{ id: string }>();
  const projectId = Number(params.id);
  const [, setLocation] = useLocation();

  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"viewer" | "editor" | "producer" | "director">("editor");
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [generatedLink, setGeneratedLink] = useState("");

  const project = trpc.project.get.useQuery({ id: projectId }, { enabled: !!user });
  const collaborators = trpc.collaboration.list.useQuery({ projectId }, { enabled: !!user });

  const inviteMutation = trpc.collaboration.invite.useMutation({
    onSuccess: (data) => {
      collaborators.refetch();
      const link = `${window.location.origin}/invite/${data.inviteToken}`;
      setGeneratedLink(link);
      setShowInviteDialog(false);
      setShowLinkDialog(true);
      setInviteEmail("");
      toast.success("Invitation created");
    },
    onError: () => toast.error("Failed to create invitation"),
  });

  const updateRoleMutation = trpc.collaboration.updateRole.useMutation({
    onSuccess: () => {
      collaborators.refetch();
      toast.success("Role updated");
    },
  });

  const removeMutation = trpc.collaboration.remove.useMutation({
    onSuccess: () => {
      collaborators.refetch();
      toast.success("Team member removed");
    },
  });

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    inviteMutation.mutate({
      projectId,
      email: inviteEmail || undefined,
      role: inviteRole,
    });
  };

  const handleGenerateLink = () => {
    inviteMutation.mutate({
      projectId,
      role: inviteRole,
    });
  };

  const copyLink = () => {
    navigator.clipboard.writeText(generatedLink);
    toast.success("Invite link copied to clipboard");
  };

  const teamMembers = collaborators.data || [];
  const activeMembers = teamMembers.filter((m) => m.status === "accepted");
  const pendingInvites = teamMembers.filter((m) => m.status === "pending");
  const declinedInvites = teamMembers.filter((m) => m.status === "declined");

  if (authLoading || !user) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur sticky top-0 z-30">
        <div className="container py-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-9 sm:w-9 shrink-0" onClick={() => setLocation(`/projects/${projectId}`)}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-semibold truncate">Project Collaboration</h1>
                <p className="text-xs text-muted-foreground truncate">{project.data?.title}</p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={handleGenerateLink}>
                <LinkIcon className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Generate Link</span>
              </Button>
              <Button size="sm" onClick={() => setShowInviteDialog(true)}>
                <UserPlus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Invite Member</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-6 max-w-4xl mx-auto">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{activeMembers.length}</p>
                  <p className="text-xs text-muted-foreground">Active Members</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{pendingInvites.length}</p>
                  <p className="text-xs text-muted-foreground">Pending Invites</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{teamMembers.length}</p>
                  <p className="text-xs text-muted-foreground">Total Invitations</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Roles Guide */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Team Roles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {(Object.entries(ROLE_CONFIG) as [keyof typeof ROLE_CONFIG, typeof ROLE_CONFIG[keyof typeof ROLE_CONFIG]][]).map(([key, config]) => {
                const Icon = config.icon;
                return (
                  <div key={key} className="p-3 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={`h-4 w-4 ${config.color}`} />
                      <span className="text-sm font-medium">{config.label}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-tight">{config.description}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Active Members */}
        {activeMembers.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Active Team Members ({activeMembers.length})
            </h3>
            <div className="space-y-2">
              {activeMembers.map((member) => {
                const roleConfig = ROLE_CONFIG[member.role as keyof typeof ROLE_CONFIG];
                const RoleIcon = roleConfig?.icon || Eye;
                return (
                  <Card key={member.id}>
                    <CardContent className="p-3 sm:p-4 flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <RoleIcon className={`h-4 w-4 ${roleConfig?.color || ""}`} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{member.email || "Team Member"}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="secondary" className="text-[10px]">
                              {roleConfig?.label || member.role}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-600 border-green-500/20">
                              Active
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Select
                          value={member.role}
                          onValueChange={(v) => updateRoleMutation.mutate({ id: member.id, role: v as any })}
                        >
                          <SelectTrigger className="h-8 w-28 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="viewer">Viewer</SelectItem>
                            <SelectItem value="editor">Editor</SelectItem>
                            <SelectItem value="producer">Producer</SelectItem>
                            <SelectItem value="director">Director</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => {
                            if (confirm("Remove this team member?")) {
                              removeMutation.mutate({ id: member.id });
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Pending Invites */}
        {pendingInvites.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              Pending Invitations ({pendingInvites.length})
            </h3>
            <div className="space-y-2">
              {pendingInvites.map((invite) => {
                const roleConfig = ROLE_CONFIG[invite.role as keyof typeof ROLE_CONFIG];
                return (
                  <Card key={invite.id} className="border-dashed">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-yellow-500/10 flex items-center justify-center">
                          <Mail className="h-4 w-4 text-yellow-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{invite.email || "Link Invitation"}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="secondary" className="text-[10px]">
                              {roleConfig?.label || invite.role}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                              Pending
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">
                              Sent {new Date(invite.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => {
                            const link = `${window.location.origin}/invite/${invite.inviteToken}`;
                            navigator.clipboard.writeText(link);
                            toast.success("Invite link copied");
                          }}
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Copy Link
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => removeMutation.mutate({ id: invite.id })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Declined */}
        {declinedInvites.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              Declined ({declinedInvites.length})
            </h3>
            <div className="space-y-2">
              {declinedInvites.map((invite) => (
                <Card key={invite.id} className="opacity-60">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-red-500/10 flex items-center justify-center">
                        <XCircle className="h-4 w-4 text-red-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{invite.email || "Link Invitation"}</p>
                        <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-600 border-red-500/20">
                          Declined
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => removeMutation.mutate({ id: invite.id })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {teamMembers.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="p-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Team Members Yet</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                Invite writers, editors, producers, and other collaborators to work together on this film project.
              </p>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={handleGenerateLink}>
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Generate Invite Link
                </Button>
                <Button onClick={() => setShowInviteDialog(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite by Email
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Invite by Email Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleInvite} className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Email Address (optional)</Label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@example.com"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Leave empty to generate a shareable invite link instead.
              </p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Role</Label>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">Viewer — View-only access</SelectItem>
                  <SelectItem value="editor">Editor — Edit scenes & scripts</SelectItem>
                  <SelectItem value="producer">Producer — Manage production</SelectItem>
                  <SelectItem value="director">Director — Full creative control</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setShowInviteDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={inviteMutation.isPending}>
                {inviteMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <UserPlus className="h-4 w-4 mr-2" />
                )}
                Send Invitation
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Generated Link Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Link Generated</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Share this link with your team member. They can use it to join the project.
            </p>
            <div className="flex gap-2">
              <Input
                value={generatedLink}
                readOnly
                className="text-xs font-mono"
              />
              <Button variant="outline" size="icon" onClick={copyLink}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowLinkDialog(false)}>
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
