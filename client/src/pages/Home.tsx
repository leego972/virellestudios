import { useAuth } from "@/_core/hooks/useAuth";
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import OnboardingOverlay from "@/components/OnboardingOverlay";
import StudioOpener from "@/components/StudioOpener";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Film,
  Plus,
  Zap,
  Users,
  ArrowRight,
  Clock,
  CheckCircle2,
  Loader2,
  Key,
  Clapperboard,
  BookOpen,
  Sparkles,
  ChevronRight,
  PlayCircle,
  Layers,
  Download,
  Mic2,
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

const WORKFLOW_STEPS = [
  {
    step: 1,
    icon: Sparkles,
    label: "Create Project",
    description: "Name your film, choose genre, rating & mode",
    path: "/projects",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
  },
  {
    step: 2,
    icon: BookOpen,
    label: "Write Your Story",
    description: "Generate or write your script and storyboard",
    path: "/projects",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
  },
  {
    step: 3,
    icon: Users,
    label: "Cast Characters",
    description: "Create or import your cast with AI portraits",
    path: "/characters",
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
  },
  {
    step: 4,
    icon: Layers,
    label: "Build Scenes",
    description: "Craft each scene with prompts, shots & effects",
    path: "/projects",
    color: "text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/20",
  },
  {
    step: 5,
    icon: Mic2,
    label: "Add Soundtrack",
    description: "Score your film with AI-generated music & SFX",
    path: "/projects",
    color: "text-pink-400",
    bg: "bg-pink-500/10",
    border: "border-pink-500/20",
  },
  {
    step: 6,
    icon: Download,
    label: "Generate & Export",
    description: "Render your film in 4K and export to My Movies",
    path: "/movies",
    color: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/20",
  },
];

export default function Home() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [showOpener, setShowOpener] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("opener") === "1") {
      setShowOpener(true);
      window.history.replaceState({}, "", "/");
    }
  }, []);

  const { data: projects, isLoading } = trpc.project.list.useQuery();
  const { data: characters } = trpc.character.list.useQuery();
  const { data: providers } = trpc.settings.getProviders.useQuery();
  const hasApiKey = providers && (providers as any[]).some((p: any) => p.isConfigured);

  const stats = {
    total: projects?.length || 0,
    generating: projects?.filter((p) => p.status === "generating").length || 0,
    completed: projects?.filter((p) => p.status === "completed").length || 0,
    draft: projects?.filter((p) => p.status === "draft").length || 0,
    characters: characters?.length || 0,
  };

  const inProgressProjects = (projects || [])
    .filter((p) => p.status === "draft" || p.status === "generating")
    .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
    .slice(0, 3);

  const recentCompleted = (projects || [])
    .filter((p) => p.status === "completed")
    .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
    .slice(0, 3);

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
    .slice(0, 5);

  if (showOpener) {
    return <StudioOpener onComplete={() => setShowOpener(false)} mode="login" skippable />;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <OnboardingOverlay />

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome back{user?.name ? `, ${user.name}` : ""}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Your AI film production studio — let's make something great.
          </p>
        </div>
        <Button
          onClick={() => setLocation("/projects")}
          className="shrink-0 gap-2"
          size="sm"
        >
          <Plus className="h-4 w-4" />
          New Film
        </Button>
      </div>

      {/* API Key Setup Banner */}
      {providers !== undefined && !hasApiKey && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3.5">
          <div className="h-8 w-8 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
            <Key className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
              Add an API key to unlock video generation
            </p>
            <p className="text-xs text-gray-700 dark:text-amber-200/70 mt-0.5 leading-relaxed">
              Virelle uses your own AI provider keys (Runway ML, fal.ai, Sora, etc.) — you only pay for what you generate. Without a key, scenes will only produce preview images.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              className="border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 text-xs"
              onClick={() => setLocation("/settings?tab=api-keys")}
            >
              <Key className="h-3 w-3 mr-1.5" />
              Add API Key
            </Button>
            <span className="text-xs text-amber-600/70 dark:text-amber-400/60 hidden sm:block">
              Pollinations.ai is free — no key needed to start
            </span>
          </div>
        </div>
      )}

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Total Projects", value: stats.total, icon: Film, color: "text-muted-foreground" },
          { label: "In Production", value: stats.generating, icon: Loader2, color: "text-primary", spin: stats.generating > 0 },
          { label: "Completed", value: stats.completed, icon: CheckCircle2, color: "text-green-400" },
          { label: "Drafts", value: stats.draft, icon: Clock, color: "text-amber-400" },
          { label: "Characters", value: stats.characters, icon: Users, color: "text-purple-400" },
        ].map((stat) => (
          <Card key={stat.label} className="bg-card/60 border-border/50">
            <CardContent className="p-4 flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <stat.icon className={`h-3.5 w-3.5 ${stat.color} ${"spin" in stat && stat.spin ? "animate-spin" : ""}`} />
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
              {isLoading ? <Skeleton className="h-7 w-10" /> : <span className="text-2xl font-bold">{stat.value}</span>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Production Workflow Guide */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold">Film Production Pipeline</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Follow these steps to create your film from concept to screen</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1.5"
            onClick={() => setLocation("/projects")}
          >
            <Zap className="h-3.5 w-3.5 text-primary" />
            Quick Generate
          </Button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {WORKFLOW_STEPS.map((step) => (
            <button
              key={step.step}
              onClick={() => setLocation(step.path)}
              className={`group relative flex flex-col items-start gap-2 rounded-xl border ${step.border} ${step.bg} p-3.5 text-left hover:scale-[1.02] transition-all duration-200 hover:shadow-md`}
            >
              <div className="flex items-center justify-between w-full">
                <div className={`h-8 w-8 rounded-lg ${step.bg} border ${step.border} flex items-center justify-center`}>
                  <step.icon className={`h-4 w-4 ${step.color}`} />
                </div>
                <span className={`text-[10px] font-bold ${step.color} opacity-60`}>0{step.step}</span>
              </div>
              <div>
                <p className="text-xs font-semibold leading-tight">{step.label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{step.description}</p>
              </div>
              <ChevronRight className={`h-3 w-3 ${step.color} opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-3 right-3`} />
            </button>
          ))}
        </div>
      </div>

      {/* Continue Filming + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* In-Progress Projects */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold">Continue Filming</h2>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground gap-1"
              onClick={() => setLocation("/projects")}
            >
              View all <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
            </div>
          ) : inProgressProjects.length === 0 ? (
            <Card className="border-dashed bg-card/40">
              <CardContent className="p-8 flex flex-col items-center text-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Film className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">No films in progress</p>
                  <p className="text-xs text-muted-foreground mt-1">Start your first film — it only takes a few minutes</p>
                </div>
                <Button size="sm" onClick={() => setLocation("/projects")} className="gap-1.5 mt-1">
                  <Plus className="h-3.5 w-3.5" />
                  Start a New Film
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {inProgressProjects.map((project) => (
                <Card
                  key={project.id}
                  className="cursor-pointer hover:border-primary/40 transition-all hover:shadow-sm bg-card/60"
                  onClick={() => setLocation(`/projects/${project.id}`)}
                >
                  <CardContent className="p-3 flex items-center gap-3">
                    {(project as any).posterUrl ? (
                      <div className="h-14 w-24 rounded-lg overflow-hidden shrink-0 bg-muted">
                        <img src={(project as any).posterUrl} alt={project.title} className="h-full w-full object-cover" />
                      </div>
                    ) : (
                      <div className="h-14 w-24 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
                        <Film className="h-5 w-5 text-muted-foreground/40" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{project.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 h-4 ${
                            project.status === "generating"
                              ? "border-primary/40 text-primary"
                              : "border-amber-500/30 text-amber-500"
                          }`}
                        >
                          {project.status === "generating" && <Loader2 className="h-2.5 w-2.5 mr-1 animate-spin" />}
                          {project.status === "generating" ? "Generating" : "Draft"}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground capitalize">{project.genre || project.mode}</span>
                        <span className="text-[10px] text-muted-foreground">{timeAgo(project.updatedAt || project.createdAt)}</span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Activity + Completed */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold">Recent Activity</h2>
          </div>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
            </div>
          ) : activityItems.length === 0 ? (
            <Card className="bg-card/40 border-dashed">
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
                      className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${
                        item.status === "completed"
                          ? "bg-green-500/10"
                          : item.status === "generating"
                          ? "bg-primary/10"
                          : "bg-muted"
                      }`}
                    >
                      <item.icon
                        className={`h-3 w-3 ${
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

          {recentCompleted.length > 0 && (
            <div className="mt-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium">Recently Completed</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground gap-1 h-6 px-2"
                  onClick={() => setLocation("/movies")}
                >
                  My Movies <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
              <div className="space-y-2">
                {recentCompleted.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => setLocation(`/projects/${project.id}`)}
                    className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-accent/50 transition-colors text-left"
                  >
                    {(project as any).posterUrl ? (
                      <img src={(project as any).posterUrl} alt={project.title} className="h-8 w-12 rounded object-cover shrink-0" />
                    ) : (
                      <div className="h-8 w-12 rounded bg-muted/60 flex items-center justify-center shrink-0">
                        <Clapperboard className="h-3.5 w-3.5 text-muted-foreground/40" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{project.title}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <CheckCircle2 className="h-2.5 w-2.5 text-green-400" />
                        <span className="text-[10px] text-green-400">Completed</span>
                      </div>
                    </div>
                    <PlayCircle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
