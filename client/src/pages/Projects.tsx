import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Film,
  Plus,
  Search,
  Loader2,
  Trash2,
  ArrowUpDown,
  Calendar,
  LayoutGrid,
  List,
  Globe,
} from "lucide-react";
import { useLocation } from "wouter";
import { useState, useMemo } from "react";
import { toast } from "sonner";

function timeAgo(date: string | Date) {
  const now = new Date();
  const d = new Date(date);
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function Projects() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name" | "status">("newest");
  const [filterStatus, setFilterStatus] = useState<"all" | "draft" | "generating" | "completed" | "failed">("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const { data: projects, isLoading, isError } = trpc.project.list.useQuery(
    undefined,
    {
      // Poll every 10 seconds while any project is still generating
      refetchInterval: (query) =>
        Array.isArray((query.state.data as any)) && (query.state.data as any[]).some((p: any) => p.status === "generating") ? 10000 : false,
    }
  );
  const utils = trpc.useUtils();

  const deleteMutation = trpc.project.delete.useMutation({
    onSuccess: () => {
      utils.project.list.invalidate();
      toast.success("Project deleted");
      setDeleteId(null);
    },
    onError: () => toast.error("Failed to delete project"),
  });

  const filtered = useMemo(() => {
    if (!projects) return [];
    let result = [...projects];

    // Filter by status
    if (filterStatus !== "all") {
      result = result.filter(p => p.status === filterStatus);
    }

    // Filter by search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.genre?.toLowerCase().includes(q) ||
          p.status.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q)
      );
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case "newest": return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        case "oldest": return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
        case "name": return a.title.localeCompare(b.title);
        case "status": return a.status.localeCompare(b.status);
        default: return 0;
      }
    });

    return result;
  }, [projects, search, sortBy, filterStatus]);

  const statusCounts = useMemo(() => {
    if (!projects) return { all: 0, draft: 0, generating: 0, completed: 0, failed: 0 };
    return {
      all: projects.length,
      draft: projects.filter(p => p.status === "draft").length,
      generating: projects.filter(p => p.status === "generating").length,
      completed: projects.filter(p => p.status === "completed").length,
      failed: projects.filter(p => p.status === "failed").length,
    };
  }, [projects]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {projects ? `${projects.length} project${projects.length !== 1 ? "s" : ""}` : "All your film productions"}
          </p>
        </div>
        <Button size="sm" onClick={() => setLocation("/projects/new")}>
          <Plus className="h-4 w-4 mr-1" />
          New Project
        </Button>
      </div>

      {/* Filters & Search */}
      {(projects?.length || 0) > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm bg-card/50"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Status filter pills */}
            <div className="flex gap-1">
              {(["all", "draft", "generating", "completed", "failed"] as const).map(status => {
                const count = statusCounts[status];
                if (status !== "all" && count === 0) return null;
                return (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      filterStatus === status
                        ? "bg-primary text-primary-foreground"
                        : "bg-card/50 text-muted-foreground hover:bg-card hover:text-foreground"
                    }`}
                  >
                    {status === "all" ? "All" : status.charAt(0).toUpperCase() + status.slice(1)}
                    {count > 0 && <span className="ml-1 opacity-70">({count})</span>}
                  </button>
                );
              })}
            </div>

            {/* Sort */}
            <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
              <SelectTrigger className="w-[130px] h-8 text-xs bg-card/50">
                <ArrowUpDown className="h-3 w-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="name">Name A-Z</SelectItem>
                <SelectItem value="status">By Status</SelectItem>
              </SelectContent>
            </Select>

            {/* View toggle */}
            <div className="flex border rounded-md bg-card/50 overflow-hidden">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 ${viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <List className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {isError ? (
        <Card className="bg-card/50 border-destructive/30">
          <CardContent className="p-12 flex flex-col items-center text-center">
            <Film className="h-10 w-10 text-destructive/40 mb-3" />
            <p className="text-sm text-muted-foreground mb-4">Failed to load projects. Please refresh the page.</p>
            <Button size="sm" variant="outline" onClick={() => window.location.reload()}>Retry</Button>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="bg-card/50">
              <CardContent className="p-4">
                <Skeleton className="aspect-video w-full rounded-md mb-3" />
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="bg-card/50 border-dashed">
          <CardContent className="p-12 flex flex-col items-center text-center">
            <Film className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              {search || filterStatus !== "all" ? "No projects match your filters" : "No projects yet"}
            </p>
            {!search && filterStatus === "all" && (
              <Button size="sm" onClick={() => setLocation("/projects/new")}>
                <Plus className="h-4 w-4 mr-1" />
                Create your first project
              </Button>
            )}
            {(search || filterStatus !== "all") && (
              <Button size="sm" variant="outline" onClick={() => { setSearch(""); setFilterStatus("all"); }}>
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((project) => (
            <Card
              key={project.id}
              className="bg-card/50 group cursor-pointer hover:border-primary/30 transition-colors relative"
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
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-medium text-sm truncate">{project.title}</h3>
                    <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                      <span className="capitalize">{project.mode}</span>
                      {project.rating && (
                        <>
                          <span className="text-border">·</span>
                          <span>{project.rating}</span>
                        </>
                      )}
                      {project.genre && (
                        <>
                          <span className="text-border">·</span>
                          <span>{project.genre}</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span
                        className={`text-xs ${
                          project.status === "completed"
                            ? "text-green-400"
                            : project.status === "generating"
                            ? "text-primary"
                            : project.status === "failed"
                            ? "text-destructive"
                            : "text-muted-foreground"
                        }`}
                      >
                        {project.status === "generating" && (
                          <Loader2 className="h-3 w-3 animate-spin inline mr-1" />
                        )}
                        {project.status}
                      </span>
                      {project.createdAt && (
                        <>
                          <span className="text-border text-xs">·</span>
                          <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                            <Calendar className="h-2.5 w-2.5" />
                            {timeAgo(project.createdAt)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {project.status === "completed" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary"
                        title="Distribute"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLocation(`/projects/${project.id}/distribute`);
                        }}
                      >
                        <Globe className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteId(project.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* List view */
        <div className="space-y-2">
          {filtered.map((project) => (
            <Card
              key={project.id}
              className="bg-card/50 group cursor-pointer hover:border-primary/30 transition-colors"
              onClick={() => setLocation(`/projects/${project.id}`)}
            >
              <CardContent className="p-3 flex items-center gap-3">
                {project.thumbnailUrl ? (
                  <div className="w-20 h-12 rounded overflow-hidden bg-muted shrink-0">
                    <img src={project.thumbnailUrl} alt={project.title} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-20 h-12 rounded bg-muted/50 flex items-center justify-center shrink-0">
                    <Film className="h-5 w-5 text-muted-foreground/30" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm truncate">{project.title}</h3>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                    <span className="capitalize">{project.mode}</span>
                    {project.genre && <><span className="text-border">·</span><span>{project.genre}</span></>}
                    {project.createdAt && <><span className="text-border">·</span><span>{timeAgo(project.createdAt)}</span></>}
                  </div>
                </div>
                <Badge
                  variant="secondary"
                  className={`text-[10px] shrink-0 ${
                    project.status === "completed" ? "bg-green-500/10 text-green-400" :
                    project.status === "generating" ? "bg-primary/10 text-primary" :
                    project.status === "failed" ? "bg-destructive/10 text-destructive" :
                    ""
                  }`}
                >
                  {project.status === "generating" && <Loader2 className="h-2.5 w-2.5 animate-spin mr-1" />}
                  {project.status}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteId(project.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this project and all its scenes, characters, and generated content.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
