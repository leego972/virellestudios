import { useEffect, useMemo, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
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

const SCENE_ROUTE = /^\/projects\/(\d+)\/scenes\/?$/;

function normaliseUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value, window.location.href).href;
  } catch {
    return value;
  }
}

function findPlayerRoot(): HTMLElement | null {
  return (
    Array.from(document.querySelectorAll<HTMLElement>("div.fixed.inset-0")).find(
      candidate =>
        candidate.isConnected &&
        !!candidate.querySelector<HTMLVideoElement>("video") &&
        !!candidate.querySelector<HTMLButtonElement>(
          'button[aria-label="Close player"]',
        ),
    ) ?? null
  );
}

export default function SceneVideoDeleteControl() {
  const routeMatch =
    typeof window !== "undefined"
      ? window.location.pathname.match(SCENE_ROUTE)
      : null;
  const projectId = routeMatch ? Number(routeMatch[1]) : null;
  const utils = trpc.useUtils();
  const [playerRoot, setPlayerRoot] = useState<HTMLElement | null>(null);
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: scenes = [] } = trpc.scene.listByProject.useQuery(
    { projectId: projectId || 0 },
    {
      enabled: !!projectId && !!playerRoot,
      staleTime: 30_000,
    },
  );

  useEffect(() => {
    if (!projectId) {
      setPlayerRoot(null);
      setVideo(null);
      return;
    }

    const refresh = () => {
      const nextRoot = findPlayerRoot();
      const nextVideo =
        nextRoot?.querySelector<HTMLVideoElement>("video") ?? null;
      setPlayerRoot(previous => (previous === nextRoot ? previous : nextRoot));
      setVideo(previous => (previous === nextVideo ? previous : nextVideo));
    };

    refresh();
    const observer = new MutationObserver(refresh);
    observer.observe(document.body, { childList: true, subtree: true });
    const interval = window.setInterval(refresh, 1000);
    return () => {
      observer.disconnect();
      window.clearInterval(interval);
    };
  }, [projectId]);

  const activeScene = useMemo(() => {
    if (!video) return null;
    const activeUrl = normaliseUrl(video.currentSrc || video.src);
    return (
      scenes.find(
        (scene: any) => normaliseUrl(scene.videoUrl) === activeUrl,
      ) ?? null
    );
  }, [scenes, video]);

  const deleteMutation = trpc.scene.update.useMutation({
    onSuccess: async () => {
      if (projectId) {
        await utils.scene.listByProject.invalidate({ projectId });
      }
      setConfirmOpen(false);
      toast.success("Scene video deleted");
      playerRoot
        ?.querySelector<HTMLButtonElement>('button[aria-label="Close player"]')
        ?.click();
    },
    onError: error =>
      toast.error(error.message || "Scene video could not be deleted."),
  });

  if (!projectId || !playerRoot || !activeScene) return null;

  return (
    <>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="fixed right-[142px] z-[82] h-11 w-11 rounded-none bg-black/70 text-white/70 shadow-xl backdrop-blur-md hover:bg-red-500/15 hover:text-red-300"
        style={{ top: "max(0.75rem, env(safe-area-inset-top))" }}
        onClick={() => setConfirmOpen(true)}
        aria-label="Delete scene video"
        title="Delete video"
      >
        <Trash2 className="h-5 w-5" />
      </Button>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this scene video?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes “{activeScene.title || "Untitled scene"}” video media
              from the project scene. Closing or minimising the player never
              deletes media.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              onClick={event => {
                event.preventDefault();
                deleteMutation.mutate({
                  id: activeScene.id,
                  videoUrl: "",
                  videoJobId: "",
                  status: "draft",
                });
              }}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting…
                </>
              ) : (
                "Delete video"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
