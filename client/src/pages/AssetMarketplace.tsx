import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft, Search, Star, Download, ShoppingCart,
  Music, Palette, Users, MapPin, Shirt, Sparkles, Lock, CheckCircle2, Loader2,
  Camera, Film, Mic, Clapperboard, Layers, Zap, Crown, ExternalLink, Info, DollarSign, Package,
} from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

type AssetCategory = "all" | "wardrobes" | "funding" | "locations" | "music" | "vfx-packs" | "color-grades" | "cinematography" | "prompt-packs" | "sfx" | "dialogue-packs";

export default function AssetMarketplace() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<AssetCategory>("all");

  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Real Data Fetching ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
  const { data: wardrobeItems = [], isLoading: loadingWardrobe } = trpc.wardrobeMarket.marketplace.searchItems.useQuery(
    { limit: 100 },
    { enabled: category === "all" || category === "wardrobes" }
  );

  const { data: fundingSources = [], isLoading: loadingFunding } = trpc.funding.list.useQuery(
    {},
    { enabled: category === "all" || category === "funding" }
  );

  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Unified Data Mapping ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
  const allAssets = useMemo(() => {
    const assets: any[] = [];

    // Map Wardrobe Items
    wardrobeItems.forEach((item: any) => {
      assets.push({
        id: `wardrobe-${item.id}`,
        realId: item.id,
        name: item.name,
        category: "wardrobes",
        price: (item.retailPriceAud || 0) / 100,
        isPremium: (item.retailPriceAud || 0) > 0,
        rating: 4.9,
        downloads: 120,
        tags: [...(item.styleTags || []), item.category, item.genderFit].filter(Boolean),
        author: "Lamalo Designer",
        description: item.description || "High-quality production-ready wardrobe item.",
        imageUrl: item.primaryImageUrl,
        type: "wardrobe"
      });
    });

    // Map Funding Sources
    fundingSources.forEach((src: any) => {
      assets.push({
        id: `funding-${src.id}`,
        realId: src.id,
        name: src.organization,
        category: "funding",
        price: 0,
        isPremium: false,
        rating: 4.8,
        downloads: 450,
        tags: [src.type, src.country, "grant"].filter(Boolean),
        author: src.country,
        description: src.supports || "Funding opportunity for film and media projects.",
        imageUrl: null,
        type: "funding"
      });
    });

    return assets;
  }, [wardrobeItems, fundingSources]);

  const filteredAssets = allAssets.filter(a => {
    const matchesSearch = a.name.toLowerCase().includes(search.toLowerCase()) || 
                          a.description.toLowerCase().includes(search.toLowerCase()) ||
                          a.tags.some((t: string) => t.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = category === "all" || a.category === category;
    return matchesSearch && matchesCategory;
  });

  const isLoading = (category === "wardrobes" && loadingWardrobe) || 
                    (category === "funding" && loadingFunding) ||
                    (category === "all" && (loadingWardrobe || loadingFunding));

  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Handlers ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
  const handleBuyWardrobe = () => {
    setLocation(`/wardrobe-marketplace`);
    toast.info("Redirecting to Lamalo Fashions...");
  };

  const handleViewFunding = () => {
    setLocation("/funding-pro");
  };

  return (
    <div className="min-h-screen text-white pb-20" style={{ background:"linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)" }}>
      {/* Header */}
      <div className="border-b border-white/5 bg-black/40 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/")} className="text-white/60 hover:text-white">
              <ArrowLeft className="w-5 h-5 text-amber-400/70" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-amber-500 rounded flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-black" />
              </div>
              <h1 className="text-lg font-bold tracking-tight uppercase italic text-gold-shimmer">
                Asset <span className="text-amber-500">Marketplace</span>
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="border-amber-500/20 text-amber-500 bg-amber-500/5 px-3 py-1">
              <Crown className="w-3 h-3 mr-1.5" /> Pro Member
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Search & Filter */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search wardrobes, funding, music, locations..." 
              className="pl-10 bg-white/5 border-white/10 h-11 focus:ring-amber-500/20 text-white"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={category} onValueChange={(v) => setCategory(v as AssetCategory)}>
            <SelectTrigger className="w-full md:w-[200px] bg-white/5 border-white/10 h-11 text-white">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-white/10 text-white">
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="wardrobes">Wardrobes (Real)</SelectItem>
              <SelectItem value="funding">Funding (Real)</SelectItem>
              <SelectItem value="locations">Locations (Soon)</SelectItem>
              <SelectItem value="music">Music (Soon)</SelectItem>
              <SelectItem value="vfx-packs">VFX Packs (Soon)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 no-scrollbar">
          {[
            { id: "all", label: "All", icon: Sparkles },
            { id: "wardrobes", label: "Wardrobes", icon: Shirt },
            { id: "funding", label: "Funding", icon: DollarSign },
            { id: "locations", label: "Locations", icon: MapPin },
            { id: "music", label: "Music", icon: Music },
            { id: "vfx-packs", label: "VFX", icon: Zap },
          ].map((cat) => (
            <Button
              key={cat.id}
              variant={category === cat.id ? "default" : "outline"}
              size="sm"
              onClick={() => setCategory(cat.id as AssetCategory)}
              className={`rounded-full px-4 h-9 whitespace-nowrap ${
                category === cat.id ? "bg-amber-500 text-black hover:bg-amber-600" : "border-white/10 hover:bg-white/5 text-white"
              }`}
            >
              <cat.icon className="w-3.5 h-3.5 mr-2" />
              {cat.label}
            </Button>
          ))}
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="aspect-[4/5] rounded-xl bg-white/5 animate-pulse border border-white/5" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredAssets.map((asset) => (
              <Card key={asset.id} className="border-white/5 bg-white/[0.02] hover:border-amber-500/40 transition-all overflow-hidden group glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20">
                <div className="aspect-square bg-zinc-900 relative overflow-hidden">
                  {asset.imageUrl ? (
                    <img src={asset.imageUrl} alt={asset.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center opacity-20">
                      {asset.category === "funding" ? <DollarSign className="w-12 h-12" /> : <Package className="w-12 h-12" />}
                    </div>
                  )}
                  <div className="absolute top-3 right-3 flex flex-col gap-2">
                    {asset.isPremium ? (
                      <Badge className="bg-amber-500 text-black font-bold border-none">
                        A${asset.price}
                      </Badge>
                    ) : (
                      <Badge className="bg-green-500 text-white font-bold border-none">
                        FREE
                      </Badge>
                    )}
                  </div>
                </div>
                <CardContent className="p-4 space-y-3 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
                  <div>
                    <h3 className="font-bold text-sm line-clamp-1 gradient-text-gold">{asset.name}</h3>
                    <p className="text-[10px] text-white/40 uppercase tracking-wider mt-0.5">{asset.author}</p>
                  </div>
                  
                  <p className="text-xs text-white/60 line-clamp-2 h-8">
                    {asset.description}
                  </p>

                  <div className="flex flex-wrap gap-1.5">
                    {asset.tags.slice(0, 3).map((tag: string) => (
                      <Badge key={tag} variant="secondary" className="bg-white/5 text-[10px] font-normal text-white/60 hover:bg-white/10">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  <div className="pt-2 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 text-[10px] text-white/40 font-medium">
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                        {asset.rating}
                      </div>
                      <div className="flex items-center gap-1">
                        <Download className="w-3 h-3" />
                        {asset.downloads}
                      </div>
                    </div>
                    
                    {asset.type === "wardrobe" ? (
                      <Button 
                        size="sm" 
                        className="h-8 bg-amber-500 hover:bg-amber-600 text-black font-bold text-[10px] px-4"
                        onClick={() => handleBuyWardrobe()}
                      >
                        <Shirt className="w-3 h-3 mr-1.5" /> VIEW ITEM
                      </Button>
                    ) : (
                      <Button 
                        size="sm" 
                        className="h-8 bg-white/10 hover:bg-white/20 text-white font-bold text-[10px] px-4"
                        onClick={() => handleViewFunding()}
                      >
                        <ExternalLink className="w-3 h-3 mr-1.5" /> APPLY
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Coming Soon Section */}
        {category !== "wardrobes" && category !== "funding" && category !== "all" && (
          <div className="text-center py-20 border border-dashed border-white/10 rounded-3xl bg-white/[0.01]">
            <Lock className="w-12 h-12 mx-auto mb-4 text-white/20" />
            <h2 className="text-xl font-bold mb-2 gradient-text-gold">Marketplace Expansion</h2>
            <p className="text-white/40 max-w-md mx-auto text-sm">
              We're currently seeding the {category} marketplace. These professional assets will be available for production soon.
            </p>
            <Button 
              variant="link" 
              className="mt-4 text-amber-500"
              onClick={() => setCategory("all")}
            >
              Back to available assets
            </Button>
          </div>
        )}

        {filteredAssets.length === 0 && !isLoading && (category === "all" || category === "wardrobes" || category === "funding") && (
          <div className="text-center py-20">
            <Search className="w-12 h-12 mx-auto mb-4 text-white/10" />
            <h2 className="text-lg font-medium /40 gradient-text-gold">No items found</h2>
            <p className="text-sm text-white/20">Try adjusting your search or category filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
