import { useEffect } from "react";
import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Film, Globe, Instagram, Youtube, Twitter, Linkedin, ExternalLink, Play, Layers, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * CreatorProfile — Public page for a Virelle Studios creator or studio.
 * Route: /creators/:slug
 */
export default function CreatorProfile() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug ?? "";

  const { data: profile, isLoading, error } = trpc.creatorProfile.getProfile.useQuery(
    { slug },
    { enabled: !!slug }
  );

  // Phase 2: Analytics tracking
  const trackEvent = trpc.analytics.trackEvent.useMutation();
  const profileId = (profile as any)?.id ?? 0;
  const profileOwner = (profile as any)?.userId ?? 0;
  useEffect(() => {
    if (!profile || !profileId || !profileOwner) return;
    trackEvent.mutate({ entityType: "creatorProfile", entityId: profileId, ownerId: profileOwner, eventType: "page_view" });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  // Set OG meta tags
  useEffect(() => {
    if (!profile) return;
    document.title = `${profile.displayName} — VirElle Studios`;
    const setMeta = (name: string, content: string, prop = false) => {
      const attr = prop ? "property" : "name";
      let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
      if (!el) { el = document.createElement("meta"); el.setAttribute(attr, name); document.head.appendChild(el); }
      el.setAttribute("content", content);
    };
    setMeta("description", profile.bio || `${profile.displayName}'s creator profile on VirElle Studios`);
    setMeta("og:title", `${profile.displayName} — VirElle Studios`, true);
    setMeta("og:description", profile.bio || `${profile.displayName}'s creator profile on VirElle Studios`, true);
    if (profile.avatarUrl) setMeta("og:image", profile.avatarUrl, true);
    setMeta("og:url", `${window.location.origin}/creators/${slug}`, true);
    setMeta("og:type", "profile", true);
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", `${profile.displayName} — VirElle Studios`);
    setMeta("twitter:description", profile.bio || `${profile.displayName}'s creator profile on VirElle Studios`);
  }, [profile, slug]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-neutral-400 text-sm animate-pulse">Loading profile…</div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
        <div className="text-white text-xl font-semibold">Profile not found</div>
        <p className="text-neutral-400 text-sm">This creator profile doesn't exist or is private.</p>
        <Link href="/showcase">
          <Button variant="outline" className="border-neutral-700 text-neutral-300">Browse Showcase</Button>
        </Link>
      </div>
    );
  }

  const socialLinks = (profile.socialLinks as any) || {};
  const focusTags: string[] = Array.isArray(profile.focusTags) ? profile.focusTags : [];
  const films: any[] = Array.isArray(profile.films) ? profile.films : [];
  const collections: any[] = Array.isArray(profile.collections) ? profile.collections : [];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Cinematic grain overlay */}
      <div className="fixed inset-0 pointer-events-none z-[1] opacity-[0.025]"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")` }}
      />

      {/* Header / Nav */}
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

      {/* Profile Hero */}
      <section className="relative z-10 px-4 pt-12 pb-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Avatar */}
            <div className="flex-shrink-0">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.displayName}
                  className="w-24 h-24 rounded-full object-cover border-2"
                  style={{ borderColor: "#d4af37" }}
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-neutral-800 flex items-center justify-center border-2" style={{ borderColor: "#d4af37" }}>
                  <User className="w-10 h-10 text-neutral-500" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-white">{profile.displayName}</h1>
                <Badge
                  variant="outline"
                  className="text-xs border-yellow-600/50 text-yellow-500"
                >
                  {profile.profileType === "studio" ? "Studio" : "Creator"}
                </Badge>
              </div>

              {profile.bio && (
                <p className="text-neutral-400 text-sm leading-relaxed max-w-2xl mb-3">{profile.bio}</p>
              )}

              {/* Focus Tags */}
              {focusTags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {focusTags.map((tag, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 border border-neutral-700">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Social Links */}
              <div className="flex flex-wrap items-center gap-3">
                {socialLinks.instagram && (
                  <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="text-neutral-400 hover:text-white transition-colors">
                    <Instagram className="w-4 h-4" />
                  </a>
                )}
                {socialLinks.youtube && (
                  <a href={socialLinks.youtube} target="_blank" rel="noopener noreferrer" className="text-neutral-400 hover:text-white transition-colors">
                    <Youtube className="w-4 h-4" />
                  </a>
                )}
                {socialLinks.twitter && (
                  <a href={socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="text-neutral-400 hover:text-white transition-colors">
                    <Twitter className="w-4 h-4" />
                  </a>
                )}
                {socialLinks.linkedin && (
                  <a href={socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="text-neutral-400 hover:text-white transition-colors">
                    <Linkedin className="w-4 h-4" />
                  </a>
                )}
                {socialLinks.website && (
                  <a href={socialLinks.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-neutral-400 hover:text-white transition-colors">
                    <Globe className="w-4 h-4" />
                    <span className="hidden sm:inline">Website</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="relative z-10 max-w-5xl mx-auto px-4">
        <div className="h-px bg-neutral-800" />
      </div>

      {/* Films Section */}
      <section className="relative z-10 px-4 py-10">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-2 mb-6">
            <Film className="w-5 h-5" style={{ color: "#d4af37" }} />
            <h2 className="text-lg font-semibold text-white">Films</h2>
            <span className="text-xs text-neutral-500">({films.length})</span>
          </div>

          {films.length === 0 ? (
            <p className="text-neutral-500 text-sm">No public films yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {films.map((film: any) => (
                <Link key={film.id} href={`/films/${film.slug}`}>
                  <div className="group relative rounded-lg overflow-hidden bg-neutral-900 border border-neutral-800 hover:border-yellow-600/50 transition-all cursor-pointer">
                    {/* Thumbnail */}
                    <div className="aspect-video bg-neutral-800 relative overflow-hidden">
                      {film.thumbnailUrl ? (
                        <img src={film.thumbnailUrl} alt={film.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
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
                    {/* Info */}
                    <div className="p-3">
                      <h3 className="text-sm font-semibold text-white truncate">{film.title}</h3>
                      {film.description && (
                        <p className="text-xs text-neutral-400 mt-1 line-clamp-2">{film.description}</p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Collections Section */}
      {collections.length > 0 && (
        <section className="relative z-10 px-4 pb-10">
          <div className="max-w-5xl mx-auto">
            <div className="h-px bg-neutral-800 mb-8" />
            <div className="flex items-center gap-2 mb-6">
              <Layers className="w-5 h-5" style={{ color: "#d4af37" }} />
              <h2 className="text-lg font-semibold text-white">Collections</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {collections.map((col: any) => (
                <Link key={col.id} href={`/collections/${col.slug}`}>
                  <div className="group rounded-lg overflow-hidden bg-neutral-900 border border-neutral-800 hover:border-yellow-600/50 transition-all cursor-pointer p-4">
                    <h3 className="text-sm font-semibold text-white mb-1">{col.title}</h3>
                    {col.description && (
                      <p className="text-xs text-neutral-400 line-clamp-2">{col.description}</p>
                    )}
                    <div className="flex items-center gap-1 mt-2 text-xs text-yellow-600">
                      <ExternalLink className="w-3 h-3" />
                      <span>View collection</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="relative z-10 border-t border-neutral-800/60 px-4 py-6 mt-8">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
          <span>Powered by <span style={{ color: "#d4af37" }}>VirElle Studios</span> — AI Cinema Platform</span>
          <div className="flex items-center gap-4">
            <Link href="/showcase" className="hover:text-neutral-300 transition-colors">Showcase</Link>
            <Link href="/privacy" className="hover:text-neutral-300 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-neutral-300 transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
