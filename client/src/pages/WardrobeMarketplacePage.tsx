/**
 * WardrobeMarketplacePage.tsx — v7.0
 *
 * Public-facing browse page for the Virelle wardrobe marketplace.
 * Productions discover designer collections and lease items for their films.
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Store,
  Search,
  Shirt,
  Sparkles,
  ArrowRight,
  Package,
  Users,
  Building2,
} from "lucide-react";

const LOGO_URL = "https://storage.googleapis.com/virelle-assets/virelle-logo.png";

const PROFILE_TYPE_LABELS: Record<string, string> = {
  designer: "Fashion Designer",
  costume_designer: "Costume Designer",
  stylist: "Stylist",
  wardrobe_department: "Wardrobe Dept",
  brand: "Brand",
  production_designer: "Production Designer",
  other: "Designer",
};

function DesignerCard({
  profile,
  onClick,
}: {
  profile: any;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group text-left bg-white/3 hover:bg-white/6 border border-white/10 hover:border-amber-500/30 rounded-2xl overflow-hidden transition-all duration-200"
    >
      {/* Cover / Logo area */}
      <div className="relative h-36 bg-gradient-to-br from-white/5 to-white/2 flex items-center justify-center overflow-hidden">
        {profile.logoUrl ? (
          <img
            src={profile.logoUrl}
            alt={profile.brandName}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
            <Shirt className="h-8 w-8 text-white/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-2 left-3">
          <Badge variant="outline" className="text-[10px] border-white/20 text-white/60 bg-black/40">
            {PROFILE_TYPE_LABELS[profile.profileType] ?? "Designer"}
          </Badge>
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-bold text-sm text-white truncate group-hover:text-amber-400 transition-colors">
          {profile.brandName}
        </h3>
        {profile.displayName && (
          <p className="text-xs text-white/40 truncate mt-0.5">{profile.displayName}</p>
        )}
        {profile.bio && (
          <p className="text-xs text-white/50 mt-2 line-clamp-2 leading-relaxed">{profile.bio}</p>
        )}
        <div className="flex items-center gap-1 mt-3 text-xs text-amber-400/70">
          <Package className="h-3 w-3" />
          <span>View collections</span>
          <ArrowRight className="h-3 w-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
    </button>
  );
}

export default function WardrobeMarketplacePage() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");

  const { data: designers, isLoading } = trpc.wardrobeMarket.marketplace.browseDesigners.useQuery({
    limit: 48,
    offset: 0,
  });

  const filtered = search
    ? (designers ?? []).filter(
        (d: any) =>
          d.brandName?.toLowerCase().includes(search.toLowerCase()) ||
          d.bio?.toLowerCase().includes(search.toLowerCase()) ||
          d.displayName?.toLowerCase().includes(search.toLowerCase()),
      )
    : (designers ?? []);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navigation */}
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between sticky top-0 z-10 bg-black/90 backdrop-blur-sm">
        <button onClick={() => setLocation("/")} className="flex items-center gap-2.5">
          <img
            src={LOGO_URL}
            alt="Virelle Studios"
            className="h-7 w-7 rounded object-contain"
            onError={(e) => (e.currentTarget.style.display = "none")}
          />
          <span className="text-sm font-black tracking-tighter uppercase italic">
            Virelle <span className="text-amber-400">Studios</span>
          </span>
        </button>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation("/designer-register")}
            className="border-amber-500/40 text-amber-400 hover:bg-amber-500/10 hidden sm:flex"
          >
            <Store className="h-3.5 w-3.5 mr-1.5" />
            List Your Collections
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation("/login")}
            className="border-white/15 text-white/70 hover:bg-white/5"
          >
            Sign In
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative py-20 px-4 overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_60%_40%,rgba(212,175,55,0.05)_0%,transparent_70%)] pointer-events-none" />
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-full px-4 py-1.5 text-amber-400 text-xs font-bold mb-6">
            <Sparkles className="h-3.5 w-3.5" />
            Fashion & Costume Marketplace
          </div>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tighter mb-4 text-white">
            DRESS YOUR <span className="text-amber-400">CHARACTERS</span>
          </h1>
          <p className="text-lg text-white/50 mb-8 max-w-2xl mx-auto leading-relaxed">
            Browse verified fashion and costume designers. Lease collections for your productions
            — items appear directly in your character's wardrobe inventory.
          </p>

          {/* Search */}
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search designers, styles, collections..."
              className="pl-10 bg-white/5 border-white/15 text-white placeholder-white/30 h-12 text-base"
            />
          </div>
        </div>
      </section>

      {/* Stats banner */}
      <section className="border-b border-white/10 py-6 px-4">
        <div className="max-w-4xl mx-auto flex flex-wrap justify-center gap-8">
          {[
            { icon: Users, label: "Active Designers", value: designers?.length ?? "—" },
            { icon: Package, label: "Leasable Collections", value: "Growing" },
            { icon: Shirt, label: "Commission to Platform", value: "5% only" },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="text-center">
              <div className="flex items-center justify-center gap-2 text-amber-400 mb-1">
                <Icon className="h-4 w-4" />
                <span className="text-2xl font-black">{value}</span>
              </div>
              <p className="text-xs text-white/40">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Designer Grid */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-black tracking-tight text-white">
            {search ? `Results for "${search}"` : "All Designers"}
          </h2>
          <span className="text-xs text-white/30">{filtered.length} designers</span>
        </div>

        {isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="rounded-2xl overflow-hidden">
                <Skeleton className="h-36 w-full bg-white/5" />
                <div className="p-4 space-y-2">
                  <Skeleton className="h-3 w-3/4 bg-white/5" />
                  <Skeleton className="h-2 w-1/2 bg-white/5" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-24">
            <Store className="h-12 w-12 text-white/20 mx-auto mb-4" />
            <p className="text-white/40 font-medium">
              {search ? "No designers match your search." : "No designers yet — be the first!"}
            </p>
            <Button
              onClick={() => setLocation("/designer-register")}
              className="mt-4 bg-amber-500 hover:bg-amber-600 text-black font-bold"
            >
              Join as Designer
            </Button>
          </div>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filtered.map((profile: any) => (
              <DesignerCard
                key={profile.id}
                profile={profile}
                onClick={() => {
                  setLocation(`/wardrobe-marketplace/designer/${profile.id}`);
                }}
              />
            ))}
          </div>
        )}
      </section>

      {/* CTA for designers */}
      <section className="border-t border-white/10 bg-white/2 py-16 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <Building2 className="h-10 w-10 text-amber-400 mx-auto mb-4" />
          <h2 className="text-2xl font-black tracking-tight mb-3">Are you a designer?</h2>
          <p className="text-white/50 text-sm mb-6 leading-relaxed">
            List your fashion or costume collections and earn 95% of every lease.
            A$299/year — unlimited collections, direct payouts via Stripe.
          </p>
          <Button
            onClick={() => setLocation("/designer-register")}
            className="bg-amber-500 hover:bg-amber-600 text-black font-bold px-8 h-11"
          >
            Join as Designer <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 px-4 text-center">
        <p className="text-xs text-white/20">
          © 2026 Virelle Studios. All rights reserved.
          {" · "}
          <button onClick={() => setLocation("/terms")} className="hover:text-white/50 transition-colors">Terms</button>
          {" · "}
          <button onClick={() => setLocation("/privacy")} className="hover:text-white/50 transition-colors">Privacy</button>
        </p>
      </footer>
    </div>
  );
}
