import { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  Film,
  Layers,
  Loader2,
  Play,
  Share2,
  Sparkles,
  Star,
  Tag,
  User,
} from "lucide-react";
import { toast } from "sonner";
import MediaPlayer from "@/components/MediaPlayer";

/** Upsert a <meta> tag by name or property attribute */
function setMeta(attr: "name" | "property", key: string, value: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", value);
}

/** Format seconds to "Xm Ys" */
function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function FilmPage() {
  const { slug } = useParams<{ slug: string }>();
  const [showBehindFilm, setShowBehindFilm] = useState(false);
  const [activeMediaId, setActiveMediaId] = useState<number | null>(null);

  const { data: filmPage, isLoading, error } = trpc.distribute.getFilmPage.useQuery(
    { slug: slug || "" },
    { enabled: !!slug }
  );

  // Phase 2: Related films from the showcase (no input — slice client-side)
  const { data: relatedFilmsRaw } = trpc.distribute.getShowcase.useQuery(
    undefined,
    { enabled: !!filmPage }
  );
  const relatedFilms = relatedFilmsRaw?.slice(0, 4) ?? [];

  // Phase 2: Analytics tracking
  const trackEvent = trpc.analytics.trackEvent.useMutation();
  const fp_id = (filmPage as any)?.id ?? 0;
  const fp_owner = (filmPage as any)?.userId ?? 0;

  // Fire page_view once when film page loads
  useEffect(() => {
    if (!filmPage || !fp_id || !fp_owner) return;
    trackEvent.mutate({ entityType: "filmPage", entityId: fp_id, ownerId: fp_owner, eventType: "page_view" });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fp_id]);

  // Inject Open Graph / Twitter Card metadata for social sharing
  useEffect(() => {
    if (!filmPage) return;
    const fp = filmPage as any;
    const title = fp.title || "Film — VirElle Studios";
    const description = fp.description || `Watch "${title}" on VirElle Studios`;
    const image = fp.thumbnailUrl || "https://virellestudios.com/og-default.jpg";
    const url = window.location.href;

    document.title = `${title} — VirElle Studios`;
    setMeta("name", "description", description);

    // Open Graph
    setMeta("property", "og:type", "video.movie");
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);
    setMeta("property", "og:image", image);
    setMeta("property", "og:url", url);
    setMeta("property", "og:site_name", "VirElle Studios");

    // Twitter Card
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", title);
    setMeta("name", "twitter:description", description);
    setMeta("name", "twitter:image", image);

    return () => {
      document.title = "VirElle Studios";
    };
  }, [filmPage]);

  const handleShare = () => {
    const url = window.location.href;
    if (fp_id && fp_owner) {
      trackEvent.mutate({ entityType: "filmPage", entityId: fp_id, ownerId: fp_owner, eventType: "share_click" });
    }
    if (navigator.share) {
      navigator.share({ title: (filmPage as any)?.title || "Film", url });
    } else {
      navigator.clipboard.writeText(url);
      toast.success("Link copied!");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (error || !filmPage) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white gap-4 px-4">
        <Film className="w-16 h-16 text-zinc-700" />
        <h1 className="text-2xl font-bold">Film Not Found</h1>
        <p className="text-zinc-500 text-sm text-center">This film page doesn't exist or hasn't been published yet.</p>
        <Link href="/showcase">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Browse Showcase
          </Button>
        </Link>
      </div>
    );
  }

  const fp = filmPage as any;
  const genres: string[] = fp.genres || [];
  const scenes: any[] = fp.scenes || [];
  const credits: Record<string, string> = fp.credits || {};
  const behindTheFilm: string = fp.behindTheFilm || "";

  // Build MediaPlayer playlist from movieUrl (full film) + scene videos
  const playlist = useMemo(() => {
    const items: any[] = [];
    if (fp.movieUrl) {
      items.push({
        id: 0,
        title: fp.title || "Full Film",
        description: fp.description || null,
        type: "movie" as const,
        fileUrl: fp.movieUrl,
        thumbnailUrl: fp.thumbnailUrl || null,
        duration: fp.movieDuration || null,
        fileSize: null,
        mimeType: "video/mp4",
        movieTitle: fp.title || null,
        sceneNumber: null,
      });
    }
    scenes.forEach((s: any, idx: number) => {
      if (s.videoUrl) {
        items.push({
          id: s.id || idx + 1,
          title: s.title || `Scene ${idx + 1}`,
          description: s.description || null,
          type: "scene" as const,
          fileUrl: s.videoUrl,
          thumbnailUrl: s.thumbnailUrl || null,
          duration: s.duration || null,
          fileSize: null,
          mimeType: "video/mp4",
          movieTitle: fp.title || null,
          sceneNumber: idx + 1,
        });
      }
    });
    return items;
  }, [fp, scenes]);

  const activeMedia = playlist.find((m) => m.id === activeMediaId) || null;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Draft preview banner */}
      {!fp.isPublic && (
        <div className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-amber-500 text-black text-sm font-semibold py-2 px-4">
          <span>Preview Mode</span>
          <Badge className="bg-black text-amber-400 text-xs">Draft — not yet public</Badge>
          <Link href={`/projects/${fp.projectId}/distribute`}>
            <Button size="sm" variant="ghost" className="h-6 text-xs text-black hover:bg-amber-600">
              Edit Page
            </Button>
          </Link>
        </div>
      )}

      {/* ── HERO ── */}
      <div className="relative w-full min-h-[55vh] md:min-h-[70vh] overflow-hidden bg-zinc-950">
        {/* Background image with parallax-style blur */}
        {fp.thumbnailUrl && (
          <img
            src={fp.thumbnailUrl}
            alt={fp.title}
            className="absolute inset-0 w-full h-full object-cover opacity-40 scale-105"
            style={{ filter: "blur(2px)" }}
          />
        )}
        {/* Cinematic grain overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
          }}
        />
        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />

        {/* VirElle branding badge */}
        <div className="absolute top-4 left-4 sm:top-6 sm:left-6">
          <Badge className="bg-amber-500/90 text-black font-bold text-xs px-2 py-1 tracking-wide">
            VirElle Studios
          </Badge>
        </div>

        {/* Hero content */}
        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10 md:p-14 max-w-5xl">
          {/* Genre chips */}
          {genres.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {genres.map((g) => (
                <Badge key={g} variant="outline" className="text-xs border-zinc-600 text-zinc-300 bg-black/40">
                  <Tag className="w-2.5 h-2.5 mr-1" />
                  {g}
                </Badge>
              ))}
            </div>
          )}
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold drop-shadow-2xl leading-tight">
            {fp.title}
          </h1>
          {fp.showCreatorName && fp.creatorName && (
            <p className="text-sm sm:text-base text-zinc-300 mt-2 drop-shadow">
              Directed by{" "}
              <span className="text-amber-400 font-medium">{fp.creatorName}</span>
            </p>
          )}
          {fp.movieDuration && (
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 mt-1.5">
              <Clock className="w-3 h-3" />
              {formatDuration(fp.movieDuration)}
              <span className="mx-1">·</span>
              <Sparkles className="w-3 h-3" />
              AI-Generated
            </div>
          )}

          {/* Primary CTAs */}
          <div className="flex flex-wrap items-center gap-3 mt-5">
            {fp.movieUrl && (
              <Button
                size="lg"
                className="gap-2 bg-amber-500 hover:bg-amber-600 text-black font-bold shadow-lg shadow-amber-500/30"
                onClick={() => {
                  setActiveMediaId(0);
                  if (fp_id && fp_owner) {
                    trackEvent.mutate({ entityType: "filmPage", entityId: fp_id, ownerId: fp_owner, eventType: "video_play" });
                  }
                }}
              >
                <Play className="w-5 h-5" fill="black" />
                Watch Film
              </Button>
            )}
            {fp.trailerUrl && (
              <Button
                asChild
                size="lg"
                variant="outline"
                className="gap-2 border-zinc-500 text-white hover:bg-zinc-800 backdrop-blur-sm bg-black/30"
              >
                <a href={fp.trailerUrl} target="_blank" rel="noopener noreferrer">
                  <Film className="w-4 h-4" />
                  Watch Trailer
                </a>
              </Button>
            )}
            <Button
              size="lg"
              variant="ghost"
              className="gap-2 text-zinc-300 hover:text-white hover:bg-white/10 backdrop-blur-sm"
              onClick={handleShare}
            >
              <Share2 className="w-4 h-4" />
              Share
            </Button>
          </div>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12 space-y-10">

        {/* Description */}
        {fp.description && (
          <div>
            <h2 className="text-lg font-semibold mb-3 text-amber-400">About this film</h2>
            <p className="text-zinc-300 leading-relaxed text-base">{fp.description}</p>
          </div>
        )}

        {/* Creator card with profile link */}
        {fp.showCreatorName && fp.creatorName && (
          <div className="flex items-center gap-4 p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800">
            <Avatar className="w-14 h-14 shrink-0">
              <AvatarImage src={fp.creatorAvatar} />
              <AvatarFallback className="bg-amber-500 text-black font-bold text-lg">
                {fp.creatorName?.[0]?.toUpperCase() || "V"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-base">{fp.creatorName}</p>
              <p className="text-xs text-zinc-500">Filmmaker · VirElle Studios</p>
            </div>
            {fp.creatorSlug && (
              <Link href={`/creators/${fp.creatorSlug}`}>
                <Button size="sm" variant="outline" className="gap-1.5 border-zinc-700 text-zinc-300 hover:text-white shrink-0">
                  <User className="w-3.5 h-3.5" />
                  View Profile
                </Button>
              </Link>
            )}
          </div>
        )}

        {/* Credits table */}
        {Object.keys(credits).length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3 text-amber-400">Credits</h2>
            <div className="rounded-xl border border-zinc-800 overflow-hidden">
              {Object.entries(credits).map(([role, name], i) => (
                <div
                  key={role}
                  className={`flex items-center justify-between px-4 py-3 text-sm ${
                    i % 2 === 0 ? "bg-zinc-900/60" : "bg-zinc-900/30"
                  }`}
                >
                  <span className="text-zinc-500 capitalize">{role}</span>
                  <span className="font-medium">{name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Scenes / Episode list */}
        {scenes.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 text-amber-400">
              <Layers className="w-4 h-4" />
              Scenes
              <Badge variant="secondary" className="text-xs">{scenes.length}</Badge>
            </h2>
            <div className="space-y-2">
              {scenes.map((scene: any, i: number) => (
                <div
                  key={scene.id || i}
                  className="flex items-center gap-3 p-3 rounded-lg bg-zinc-900/60 border border-zinc-800 hover:border-zinc-600 transition-colors"
                >
                  <div className="w-8 h-8 rounded-md bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400 shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{scene.title || `Scene ${i + 1}`}</p>
                    {scene.mood && (
                      <p className="text-xs text-zinc-500">{scene.mood}</p>
                    )}
                  </div>
                  {scene.duration && (
                    <span className="text-xs text-zinc-600 shrink-0">{formatDuration(scene.duration)}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Behind the Film (collapsible) */}
        {behindTheFilm && (
          <div className="rounded-xl border border-zinc-800 overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-5 py-4 bg-zinc-900/60 hover:bg-zinc-900 transition-colors text-left"
              onClick={() => setShowBehindFilm((v) => !v)}
            >
              <span className="font-semibold flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500" />
                Behind the Film
              </span>
              {showBehindFilm ? (
                <ChevronUp className="w-4 h-4 text-zinc-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-zinc-500" />
              )}
            </button>
            {showBehindFilm && (
              <div className="px-5 py-4 bg-zinc-950/60 text-sm text-zinc-300 leading-relaxed">
                {behindTheFilm}
              </div>
            )}
          </div>
        )}

        <Separator className="bg-zinc-800" />

        {/* ── Traffic Loop: Related Films ── */}
        {relatedFilms.filter((f: any) => f.slug !== slug).length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-4 text-amber-400">More Films</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {relatedFilms
                .filter((f: any) => f.slug !== slug)
                .slice(0, 3)
                .map((f: any) => (
                  <Link key={f.slug} href={`/films/${f.slug}`}>
                    <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-600 transition-all hover:-translate-y-0.5 cursor-pointer overflow-hidden">
                      <div className="aspect-video bg-zinc-800 relative overflow-hidden">
                        {f.thumbnailUrl ? (
                          <img
                            src={f.thumbnailUrl}
                            alt={f.title}
                            className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Film className="w-8 h-8 text-zinc-700" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      </div>
                      <CardContent className="p-3">
                        <p className="text-sm font-medium truncate">{f.title}</p>
                        {f.creatorName && (
                          <p className="text-xs text-zinc-500 mt-0.5">{f.creatorName}</p>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                ))}
            </div>
          </div>
        )}

        {/* ── Traffic Loop: Create your own CTA ── */}
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 sm:p-8 text-center space-y-4">
          <div className="flex items-center justify-center gap-2 text-amber-400 font-semibold">
            <Sparkles className="w-5 h-5" />
            Create your own AI film
          </div>
          <p className="text-zinc-400 text-sm max-w-md mx-auto">
            This film was made entirely with VirElle Studios — AI-powered filmmaking from script to screen.
            Start your own project today.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="https://virellestudios.com/signup"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                if (fp_id && fp_owner) {
                  trackEvent.mutate({ entityType: "filmPage", entityId: fp_id, ownerId: fp_owner, eventType: "link_click", metadata: { label: "signup_cta" } });
                }
              }}
            >
              <Button className="gap-2 bg-amber-500 hover:bg-amber-600 text-black font-bold w-full sm:w-auto">
                <Sparkles className="w-4 h-4" />
                Start Free
              </Button>
            </a>
            <Link href="/showcase">
              <Button variant="outline" className="gap-2 border-zinc-700 text-zinc-300 hover:text-white w-full sm:w-auto">
                <Film className="w-4 h-4" />
                Browse Showcase
              </Button>
            </Link>
          </div>
        </div>

        {/* Footer branding */}
        <div className="flex items-center justify-between text-xs text-zinc-700 pt-2">
          <span>Made with VirElle Studios · AI-Generated Cinema</span>
          <a
            href="https://virellestudios.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-amber-500 transition-colors flex items-center gap-1"
          >
            virellestudios.com
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* MediaPlayer — opens when Watch Film or a scene video is clicked */}
      {activeMedia && (
        <MediaPlayer
          movie={activeMedia}
          playlist={playlist}
          onClose={() => setActiveMediaId(null)}
          onNavigate={(id) => setActiveMediaId(id)}
        />
      )}
    </div>
  );
}
