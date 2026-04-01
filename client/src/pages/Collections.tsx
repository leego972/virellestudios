import { useEffect } from "react";
import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Film, Layers, Play, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Collections — Public page for a creator's film collection/slate.
 * Route: /collections/:slug
 */
export default function Collections() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug ?? "";

  const { data: collection, isLoading, error } = trpc.collections.getCollection.useQuery(
    { slug },
    { enabled: !!slug }
  );

  useEffect(() => {
    if (!collection) return;
    document.title = `${collection.title} — VirElle Studios`;
    const setMeta = (name: string, content: string, prop = false) => {
      const attr = prop ? "property" : "name";
      let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
      if (!el) { el = document.createElement("meta"); el.setAttribute(attr, name); document.head.appendChild(el); }
      el.setAttribute("content", content);
    };
    setMeta("description", collection.description || `${collection.title} — a film collection on VirElle Studios`);
    setMeta("og:title", `${collection.title} — VirElle Studios`, true);
    setMeta("og:description", collection.description || `${collection.title} — a film collection on VirElle Studios`, true);
    if (collection.coverImageUrl) setMeta("og:image", collection.coverImageUrl, true);
    setMeta("og:url", `${window.location.origin}/collections/${slug}`, true);
    setMeta("og:type", "website", true);
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", `${collection.title} — VirElle Studios`);
  }, [collection, slug]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-neutral-400 text-sm animate-pulse">Loading collection…</div>
      </div>
    );
  }

  if (error || !collection) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
        <div className="text-white text-xl font-semibold">Collection not found</div>
        <p className="text-neutral-400 text-sm">This collection doesn't exist or is private.</p>
        <Link href="/showcase">
          <Button variant="outline" className="border-neutral-700 text-neutral-300">Browse Showcase</Button>
        </Link>
      </div>
    );
  }

  const items: any[] = Array.isArray(collection.items) ? collection.items : [];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Grain overlay */}
      <div className="fixed inset-0 pointer-events-none z-[1] opacity-[0.025]"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")` }}
      />

      {/* Header */}
      <header className="relative z-10 border-b border-neutral-800/60 px-4 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/">
            <img
              src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663418605762/hxRQQgsmyjgcByim.png"
              alt="VirElle Studios"
              className="h-8 object-contain"
              style={{ filter: "sepia(1) saturate(3) brightness(1.3) hue-rotate(10deg)" }}
            />
          </Link>
          <Link href="/showcase">
            <Button variant="ghost" size="sm" className="text-neutral-400 hover:text-white text-xs">
              Browse Showcase
            </Button>
          </Link>
        </div>
      </header>

      {/* Collection Hero */}
      <section className="relative z-10 px-4 pt-10 pb-6">
        <div className="max-w-5xl mx-auto">
          {/* Back link to creator */}
          {collection.creatorSlug && (
            <Link href={`/creators/${collection.creatorSlug}`}>
              <button className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors mb-6">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{collection.creatorName || "Creator"}</span>
              </button>
            </Link>
          )}

          <div className="flex items-start gap-4">
            {collection.coverImageUrl ? (
              <img src={collection.coverImageUrl} alt={collection.title} className="w-20 h-20 rounded-lg object-cover border border-neutral-700 flex-shrink-0" />
            ) : (
              <div className="w-20 h-20 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center flex-shrink-0">
                <Layers className="w-8 h-8 text-neutral-600" />
              </div>
            )}
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">{collection.title}</h1>
              {collection.description && (
                <p className="text-neutral-400 text-sm leading-relaxed max-w-2xl">{collection.description}</p>
              )}
              <p className="text-xs text-neutral-500 mt-2">{items.length} film{items.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="relative z-10 max-w-5xl mx-auto px-4">
        <div className="h-px bg-neutral-800" />
      </div>

      {/* Films Grid */}
      <section className="relative z-10 px-4 py-8">
        <div className="max-w-5xl mx-auto">
          {items.length === 0 ? (
            <p className="text-neutral-500 text-sm">No films in this collection yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((item: any, idx: number) => (
                <Link key={item.id} href={`/films/${item.filmSlug}`}>
                  <div className="group relative rounded-lg overflow-hidden bg-neutral-900 border border-neutral-800 hover:border-yellow-600/50 transition-all cursor-pointer">
                    {/* Sequence number */}
                    <div className="absolute top-2 left-2 z-10 w-6 h-6 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-xs font-bold" style={{ color: "#d4af37" }}>
                      {idx + 1}
                    </div>
                    {/* Thumbnail */}
                    <div className="aspect-video bg-neutral-800 relative overflow-hidden">
                      {item.filmThumbnail ? (
                        <img src={item.filmThumbnail} alt={item.filmTitle} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Film className="w-8 h-8 text-neutral-600" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                          <Play className="w-5 h-5 text-white ml-0.5" />
                        </div>
                      </div>
                    </div>
                    <div className="p-3">
                      <h3 className="text-sm font-semibold text-white truncate">{item.filmTitle}</h3>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-neutral-800/60 px-4 py-6 mt-8">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
          <span>Powered by <span style={{ color: "#d4af37" }}>VirElle Studios</span> — AI Cinema Platform</span>
          <div className="flex items-center gap-4">
            <Link href="/showcase" className="hover:text-neutral-300 transition-colors">Showcase</Link>
            <Link href="/privacy" className="hover:text-neutral-300 transition-colors">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
