import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Film,
  Plus,
  Zap,
  Layers,
  Users,
  ArrowRight,
  Clock,
  CheckCircle2,
  Loader2,
  Sparkles,
  Music,
  Wand2,
  MessageSquare,
} from "lucide-react";
import { useLocation } from "wouter";

function timeAgo(date: string | Date) {
  const now = new Date();
  const d = new Date(date);
  const seconds = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

export default function Home() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { data: projects, isLoading } = trpc.project.list.useQuery();
  const { data: characters } = trpc.character.list.useQuery();

  const recentProjects = projects?.slice(0, 4) || [];
  const stats = {
    total: projects?.length || 0,
    generating: projects?.filter((p) => p.status === "generating").length || 0,
    completed: projects?.filter((p) => p.status === "completed").length || 0,
    draft: projects?.filter((p) => p.status === "draft").length || 0,
    characters: characters?.length || 0,
  };

  // Build activity feed from projects sorted by updatedAt
  const activityItems = (projects || [])
    .map((p) => ({
      id: p.id,
      title: p.title,
      status: p.status,
      updatedAt: p.updatedAt || p.createdAt,
      icon: p.status === "completed" ? CheckCircle2 : p.status === "generating" ? Loader2 : Clock,
      action:
        p.status === "completed"
          ? "Production completed"
          : p.status === "generating"
          ? "Currently generating"
          : "Updated draft",
    }))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 6);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome back{user?.name ? `, ${user.name}` : ""}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Your AI-powered film production studio
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card
          className="group cursor-pointer border-dashed hover:border-primary/40 transition-colors bg-card/50"
          onClick={() => setLocation("/projects/new?mode=quick")}
        >
          <CardContent className="p-5 flex items-start gap-4">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="font-medium text-sm">Quick Generate</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Upload characters, describe your plot, and let AI create your entire film with scenes, images, and effects
              </p>
            </div>
          </CardContent>
        </Card>

        <Card
          className="group cursor-pointer border-dashed hover:border-primary/40 transition-colors bg-card/50"
          onClick={() => setLocation("/projects/new?mode=manual")}
        >
          <CardContent className="p-5 flex items-start gap-4">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Layers className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="font-medium text-sm">Scene-by-Scene</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Craft each scene manually with full creative control over every detail
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Total Projects", value: stats.total, icon: Film },
          { label: "In Production", value: stats.generating, icon: Loader2 },
          { label: "Completed", value: stats.completed, icon: CheckCircle2 },
          { label: "Drafts", value: stats.draft, icon: Clock },
          { label: "Characters", value: stats.characters, icon: Users },
        ].map((stat) => (
          <Card key={stat.label} className="bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <stat.icon className="h-3.5 w-3.5" />
                <span className="text-xs">{stat.label}</span>
              </div>
              {isLoading ? (
                <Skeleton className="h-7 w-12" />
              ) : (
                <p className="text-2xl font-semibold">{stat.value}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Projects — 2/3 width */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium">Recent Projects</h2>
            {(projects?.length || 0) > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={() => setLocation("/projects")}
              >
                View all
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="bg-card/50">
                  <CardContent className="p-4">
                    <Skeleton className="h-32 w-full rounded-md mb-3" />
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-3 w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : recentProjects.length === 0 ? (
            <Card className="bg-card/50 border-dashed">
              <CardContent className="p-12 flex flex-col items-center text-center">
                <Film className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground mb-4">
                  No projects yet. Start your first production.
                </p>
                <Button size="sm" onClick={() => setLocation("/projects/new")}>
                  <Plus className="h-4 w-4 mr-1" />
                  New Project
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {recentProjects.map((project) => (
                <Card
                  key={project.id}
                  className="bg-card/50 cursor-pointer hover:border-primary/30 transition-colors"
                  onClick={() => setLocation(`/projects/${project.id}`)}
                >
                  <CardContent className="p-4">
                    {project.thumbnailUrl ? (
                      <div className="aspect-video rounded-md overflow-hidden mb-3 bg-muted">
                        <img
                          src={project.thumbnailUrl}
                          alt={project.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="aspect-video rounded-md mb-3 bg-muted/50 flex items-center justify-center">
                        <Film className="h-8 w-8 text-muted-foreground/30" />
                      </div>
                    )}
                    <h3 className="font-medium text-sm truncate">{project.title}</h3>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="capitalize">{project.genre || project.mode}</span>
                      {project.rating && <span>{project.rating}</span>}
                      <span
                        className={`inline-flex items-center gap-1 ${
                          project.status === "completed"
                            ? "text-green-400"
                            : project.status === "generating"
                            ? "text-primary"
                            : ""
                        }`}
                      >
                        {project.status === "generating" && (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        )}
                        {project.status}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Activity Feed — 1/3 width */}
        <div>
          <h2 className="text-lg font-medium mb-4">Activity</h2>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 w-full rounded-md" />
              ))}
            </div>
          ) : activityItems.length === 0 ? (
            <Card className="bg-card/50 border-dashed">
              <CardContent className="p-6 text-center">
                <p className="text-xs text-muted-foreground">No recent activity</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {activityItems.map((item) => (
                <Card
                  key={`${item.id}-${item.status}`}
                  className="bg-card/50 cursor-pointer hover:border-primary/30 transition-colors"
                  onClick={() => setLocation(`/projects/${item.id}`)}
                >
                  <CardContent className="p-3 flex items-center gap-3">
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                        item.status === "completed"
                          ? "bg-green-500/10"
                          : item.status === "generating"
                          ? "bg-primary/10"
                          : "bg-muted"
                      }`}
                    >
                      <item.icon
                        className={`h-3.5 w-3.5 ${
                          item.status === "completed"
                            ? "text-green-400"
                            : item.status === "generating"
                            ? "text-primary animate-spin"
                            : "text-muted-foreground"
                        }`}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{item.title}</p>
                      <p className="text-[10px] text-muted-foreground">{item.action}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {timeAgo(item.updatedAt)}
                    </span>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Quick Links */}
          <div className="mt-6 space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Quick Links</h3>
            {[
              { label: "Characters", icon: Users, path: "/characters" },
              { label: "My Movies", icon: Film, path: "/movies" },
            ].map((link) => (
              <Button
                key={link.path}
                variant="ghost"
                size="sm"
                className="w-full justify-start text-xs text-muted-foreground"
                onClick={() => setLocation(link.path)}
              >
                <link.icon className="h-3.5 w-3.5 mr-2" />
                {link.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
