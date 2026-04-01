import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Film, ArrowLeft, Share2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export default function FilmPage() {
  const { slug } = useParams<{ slug: string }>();

  const { data: filmPage, isLoading, error } = trpc.distribute.getFilmPage.useQuery(
    { slug: slug || "" },
    { enabled: !!slug }
  );

  const handleShare = () => {
    const url = window.location.href;
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
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white gap-4">
        <Film className="w-16 h-16 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Film Not Found</h1>
        <p className="text-muted-foreground text-sm">This film page doesn't exist or hasn't been published yet.</p>
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

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero / Thumbnail */}
      <div className="relative w-full aspect-video max-h-[70vh] overflow-hidden bg-zinc-900">
        {fp.thumbnailUrl ? (
          <img
            src={fp.thumbnailUrl}
            alt={fp.title}
            className="w-full h-full object-cover opacity-80"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Film className="w-24 h-24 text-zinc-700" />
          </div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

        {/* VirElle branding badge */}
        {fp.showVirelleBranding !== false && (
          <div className="absolute top-4 left-4">
            <Badge className="bg-amber-500/90 text-black font-semibold text-xs px-2 py-1">
              VirElle Studios
            </Badge>
          </div>
        )}

        {/* Title overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
          <h1 className="text-3xl md:text-5xl font-bold drop-shadow-lg">{fp.title}</h1>
          {fp.showCreatorName && fp.creatorName && (
            <p className="text-sm text-zinc-300 mt-1">Directed by {fp.creatorName}</p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Actions */}
        <div className="flex items-center gap-3 flex-wrap">
          {fp.movieUrl && (
            <Button asChild className="gap-2 bg-amber-500 hover:bg-amber-600 text-black font-semibold">
              <a href={fp.movieUrl} target="_blank" rel="noopener noreferrer">
                <Film className="w-4 h-4" />
                Watch Film
              </a>
            </Button>
          )}
          <Button variant="outline" className="gap-2" onClick={handleShare}>
            <Share2 className="w-4 h-4" />
            Share
          </Button>
          <Link href="/showcase">
            <Button variant="ghost" className="gap-2 text-zinc-400">
              <ExternalLink className="w-4 h-4" />
              Browse Showcase
            </Button>
          </Link>
        </div>

        {/* Description */}
        {fp.description && (
          <div>
            <h2 className="text-lg font-semibold mb-2">About this film</h2>
            <p className="text-zinc-300 leading-relaxed">{fp.description}</p>
          </div>
        )}

        {/* Creator */}
        {fp.showCreatorName && fp.creatorName && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-zinc-900 border border-zinc-800">
            <Avatar className="w-12 h-12">
              <AvatarImage src={fp.creatorAvatar} />
              <AvatarFallback className="bg-amber-500 text-black font-bold">
                {fp.creatorName?.[0]?.toUpperCase() || "V"}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{fp.creatorName}</p>
              <p className="text-xs text-zinc-400">Filmmaker · VirElle Studios</p>
            </div>
          </div>
        )}

        {/* Duration */}
        {fp.movieDuration && (
          <div className="text-sm text-zinc-500">
            Runtime: {Math.floor(fp.movieDuration / 60)}m {fp.movieDuration % 60}s
          </div>
        )}

        {/* Footer branding */}
        <div className="pt-8 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-600">
          <span>Made with VirElle Studios</span>
          <a
            href="https://virellestudios.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-amber-500 transition-colors"
          >
            virellestudios.com
          </a>
        </div>
      </div>
    </div>
  );
}
