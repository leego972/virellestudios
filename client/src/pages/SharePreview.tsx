import { useParams, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Film, AlertCircle, CheckCircle2, Clock, Play } from "lucide-react";
import { useState, useMemo } from "react";

/**
 * Reviewer-name watermark overlay.
 * Pro studios send screeners watermarked with the recipient's name +
 * timestamp so leaks can be traced. Diagonal text, low opacity,
 * impossible to crop without destroying the frame.
 */
function ReviewerCommentBox({
  projectId,
  token,
  sceneId,
  sceneTitle,
  defaultName,
}: {
  projectId: number;
  token: string;
  sceneId: number;
  sceneTitle: string;
  defaultName: string;
}) {
  const [name, setName] = useState(defaultName);
  const [tc, setTc] = useState("");
  const [comment, setComment] = useState("");
  const [sent, setSent] = useState(false);
  const add = trpc.review.add.useMutation({
    onSuccess: () => {
      setSent(true);
      setComment("");
      setTimeout(() => setSent(false), 3500);
    },
  });
  const submit = () => {
    if (!name.trim() || !comment.trim()) return;
    add.mutate({ projectId, token, sceneId, reviewerName: name.trim(), comment: comment.trim(), timecode: tc.trim() || undefined });
  };
  return (
    <div className="px-4 py-3 border-b bg-muted/20">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Leave a note on "{sceneTitle}"
        </p>
        {sent && <span className="text-[11px] text-green-500 font-medium">✓ Sent to filmmaker</span>}
      </div>
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 60))}
          className="flex-1 h-8 px-2 rounded-md border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <input
          type="text"
          placeholder="Timecode (e.g. 00:42)"
          value={tc}
          onChange={(e) => setTc(e.target.value.slice(0, 24))}
          className="w-32 h-8 px-2 rounded-md border border-border bg-background text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>
      <textarea
        placeholder="Your note for the filmmaker — pacing, performance, sound, story…"
        value={comment}
        onChange={(e) => setComment(e.target.value.slice(0, 2000))}
        rows={2}
        className="w-full px-2 py-1.5 rounded-md border border-border bg-background text-xs resize-y min-h-[60px] focus:outline-none focus:ring-1 focus:ring-primary"
      />
      <div className="flex justify-end mt-2">
        <button
          onClick={submit}
          disabled={!name.trim() || !comment.trim() || add.isPending}
          className="h-7 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium disabled:opacity-50 hover:opacity-90"
        >
          {add.isPending ? "Sending…" : "Send note"}
        </button>
      </div>
      {add.error && <p className="mt-1 text-[11px] text-red-500">{add.error.message}</p>}
    </div>
  );
}

function ScreenerWatermark({ name }: { name: string }) {
  if (!name) return null;
  const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
  const label = `${name} · ${stamp} UTC · CONFIDENTIAL`;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden select-none">
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className="text-white/25 text-2xl sm:text-3xl font-bold tracking-wider whitespace-nowrap"
          style={{ transform: "rotate(-22deg)", textShadow: "0 1px 2px rgba(0,0,0,.6)" }}
        >
          {label}
        </span>
      </div>
      <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/60 text-white/90 text-[10px] font-mono">
        {label}
      </div>
      <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/60 text-white/90 text-[10px] font-mono">
        {label}
      </div>
    </div>
  );
}

/**
 * Public, token-gated, read-only project preview.
 *
 * Producers, friends, or collaborators receive a /share/:projectId/:token
 * URL from the project owner and can review the film without signing up.
 * No comments / approvals yet — that's stage 2 of the review system.
 */
export default function SharePreview() {
  const params = useParams<{ projectId: string; token: string }>();
  const projectId = parseInt(params.projectId || "0");
  const token = params.token || "";
  const search = useSearch();
  const reviewerName = useMemo(() => {
    const sp = new URLSearchParams(search);
    return (sp.get("as") || "").slice(0, 60).trim();
  }, [search]);
  const [activeScene, setActiveScene] = useState<number | null>(null);

  const { data, isLoading, error } = trpc.project.getPublicById.useQuery(
    { id: projectId, token },
    { enabled: !!projectId && !!token, retry: false }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen p-6 max-w-5xl mx-auto" style={{background:"linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)"}}>
        <Skeleton className="h-12 w-1/2 mb-3" />
        <Skeleton className="h-5 w-1/3 mb-8" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-video rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{background:"linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)"}}>
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Link expired or invalid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This review link is no longer valid. Ask the project owner for a fresh link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { project, scenes } = data;
  const completed = scenes.filter((s: any) => s.status === "completed" && s.videoUrl).length;
  const active = activeScene != null ? scenes.find((s: any) => s.id === activeScene) : null;

  return (
    <div className="min-h-screen" style={{ background:"linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)" }}>
      <header className="border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Film className="h-5 w-5 text-primary" />
            <span className="font-semibold">VirElle Studios</span>
            <Badge variant="outline" className="ml-2 text-[10px]">Review preview</Badge>
          </div>
          <a href="/" className="text-xs text-muted-foreground hover:text-foreground">
            Powered by virelle.life
          </a>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3 gradient-text-gold">{project.title}</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mb-4">
            {project.directorName && <span>Directed by {project.directorName}</span>}
            {project.genre && (<><span>·</span><span>{project.genre}</span></>)}
            {project.mode && (<><span>·</span><span className="capitalize">{project.mode}</span></>)}
            {project.duration && (<><span>·</span><span>{project.duration}s</span></>)}
            {project.resolution && (<><span>·</span><span>{project.resolution}</span></>)}
          </div>
          {project.logline && (
            <p className="text-base text-foreground/90 italic mb-2">"{project.logline}"</p>
          )}
          {(project.plotSummary || project.description) && (
            <p className="text-sm text-muted-foreground max-w-3xl">
              {project.plotSummary || project.description}
            </p>
          )}
        </div>

        {reviewerName && (
          <div className="mb-4 px-3 py-2 rounded-md border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs flex items-center gap-2">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>
              Confidential screener watermarked for <strong>{reviewerName}</strong>. Do not redistribute or screen-record.
            </span>
          </div>
        )}

        {active && (
          <Card className="mb-6 overflow-hidden">
            <ReviewerCommentBox
              projectId={projectId}
              token={token}
              sceneId={active.id}
              sceneTitle={active.title}
              defaultName={reviewerName}
            />
            <div className="aspect-video bg-black relative">
              {active.videoUrl ? (
                <video
                  src={active.videoUrl}
                  poster={active.thumbnailUrl || undefined}
                  controls
                  autoPlay
                  controlsList="nodownload"
                  onContextMenu={(e) => e.preventDefault()}
                  className="w-full h-full"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <Film className="h-12 w-12 opacity-30" />
                </div>
              )}
              <ScreenerWatermark name={reviewerName} />
            </div>
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold">Scene {active.sceneNumber} — {active.title}</h3>
                  {active.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{active.description}</p>
                  )}
                </div>
                <button
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setActiveScene(null)}
                >
                  Close
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold gradient-text-gold">Scenes</h2>
          <span className="text-xs text-muted-foreground">
            {completed} of {scenes.length} ready
          </span>
        </div>

        {scenes.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              No scenes generated yet. Check back soon.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {scenes.map((s: any) => (
              <Card
                key={s.id}
                className={`overflow-hidden cursor-pointer hover:border-primary/40 transition-colors ${activeScene === s.id ? "border-primary" : ""}`}
                onClick={() => s.videoUrl && setActiveScene(s.id)}
              >
                <div className="aspect-video bg-muted relative group">
                  {s.thumbnailUrl ? (
                    <img src={s.thumbnailUrl} alt={s.title} className="w-full h-full object-cover" onContextMenu={(e) => e.preventDefault()} draggable={false} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Film className="h-8 w-8 text-muted-foreground/30" />
                    </div>
                  )}
                  {s.videoUrl && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="h-10 w-10 text-white" />
                    </div>
                  )}
                  <ScreenerWatermark name={reviewerName} />
                  <div className="absolute top-2 right-2">
                    {s.status === "completed" ? (
                      <Badge className="bg-green-500/90 text-white border-0 text-[10px]">
                        <CheckCircle2 className="h-3 w-3 mr-1" />Ready
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-background/80 text-[10px]">
                        <Clock className="h-3 w-3 mr-1" />{s.status}
                      </Badge>
                    )}
                  </div>
                </div>
                <CardContent className="p-3">
                  <div className="text-xs text-muted-foreground mb-1">Scene {s.sceneNumber}</div>
                  <h3 className="font-medium text-sm truncate">{s.title}</h3>
                  {s.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{s.description}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="mt-12 pt-6 border-t text-center">
          <p className="text-xs text-muted-foreground mb-2">
            Want to make your own AI-powered film? Idea to release in 8 stages.
          </p>
          <a
            href="/"
            className="inline-block px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
          >
            Try VirElle Studios free
          </a>
        </div>
      </div>
    </div>
  );
}
