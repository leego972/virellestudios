import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
} from "lucide-react";
import { useLocation } from "wouter";
import { useState, useMemo } from "react";
import { toast } from "sonner";

export default function Projects() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const { data: projects, isLoading } = trpc.project.list.useQuery();
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
    if (!search.trim()) return projects;
    const q = search.toLowerCase();
    return projects.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.genre?.toLowerCase().includes(q) ||
        p.status.toLowerCase().includes(q)
    );
  }, [projects, search]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="text-muted-foreground text-sm mt-1">
            All your film productions
          </p>
        </div>
        <Button size="sm" onClick={() => setLocation("/projects/new")}>
          <Plus className="h-4 w-4 mr-1" />
          New Project
        </Button>
      </div>

      {(projects?.length || 0) > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm bg-card/50"
          />
        </div>
      )}

      {isLoading ? (
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
              {search ? "No projects match your search" : "No projects yet"}
            </p>
            {!search && (
              <Button size="sm" onClick={() => setLocation("/projects/new")}>
                <Plus className="h-4 w-4 mr-1" />
                Create your first project
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
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
                    <div className="mt-1.5">
                      <span
                        className={`text-xs ${
                          project.status === "completed"
                            ? "text-green-400"
                            : project.status === "generating"
                            ? "text-primary"
                            : "text-muted-foreground"
                        }`}
                      >
                        {project.status === "generating" && (
                          <Loader2 className="h-3 w-3 animate-spin inline mr-1" />
                        )}
                        {project.status}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteId(project.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
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
