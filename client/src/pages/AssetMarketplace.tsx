import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft, Search, Star, Download, ShoppingCart, Filter,
  Music, Palette, Users, MapPin, Shirt, Sparkles, Lock, CheckCircle2,
} from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

type AssetCategory = "all" | "characters" | "locations" | "music" | "vfx-packs" | "wardrobes" | "color-grades";

const ASSETS = [
  { id: "a001", name: "Neo-Tokyo Street Market", category: "locations", price: 0, isPremium: false, rating: 4.9, downloads: 8420, tags: ["sci-fi", "night", "urban", "neon"], author: "Virelle Studios" },
  { id: "a002", name: "Orchestral Drama Suite Vol. 1", category: "music", price: 0, isPremium: false, rating: 4.8, downloads: 12300, tags: ["drama", "emotional", "strings", "orchestral"], author: "Virelle Studios" },
  { id: "a003", name: "Blade Runner Color Grade Pack", category: "color-grades", price: 4.99, isPremium: true, rating: 4.9, downloads: 6780, tags: ["sci-fi", "neon", "noir", "cyberpunk"], author: "CinematicLUTs" },
  { id: "a004", name: "Victorian London Mansion", category: "locations", price: 0, isPremium: false, rating: 4.7, downloads: 5230, tags: ["period", "gothic", "interior", "drama"], author: "Virelle Studios" },
  { id: "a005", name: "Action Hero Wardrobe Pack", category: "wardrobes", price: 2.99, isPremium: true, rating: 4.6, downloads: 3890, tags: ["action", "tactical", "military", "modern"], author: "CostumePro" },
  { id: "a006", name: "Horror Atmosphere SFX Pack", category: "vfx-packs", price: 0, isPremium: false, rating: 4.8, downloads: 9100, tags: ["horror", "suspense", "atmosphere", "sound"], author: "Virelle Studios" },
  { id: "a007", name: "Deakins Desert Landscape", category: "locations", price: 0, isPremium: false, rating: 4.9, downloads: 7650, tags: ["western", "epic", "outdoor", "golden-hour"], author: "Virelle Studios" },
  { id: "a008", name: "Noir Detective Wardrobe Pack", category: "wardrobes", price: 0, isPremium: false, rating: 4.7, downloads: 4320, tags: ["noir", "1940s", "detective", "period"], author: "Virelle Studios" },
  { id: "a009", name: "Sci-Fi VFX Particle Pack", category: "vfx-packs", price: 7.99, isPremium: true, rating: 4.9, downloads: 5670, tags: ["sci-fi", "particles", "energy", "hologram"], author: "VFXPro" },
  { id: "a010", name: "Romance Drama Color Grades", category: "color-grades", price: 0, isPremium: false, rating: 4.6, downloads: 3210, tags: ["romance", "warm", "soft", "golden"], author: "Virelle Studios" },
  { id: "a011", name: "Jazz Club Interior — 1950s", category: "locations", price: 0, isPremium: false, rating: 4.8, downloads: 6890, tags: ["jazz", "1950s", "interior", "night"], author: "Virelle Studios" },
  { id: "a012", name: "Epic Action Score Vol. 2", category: "music", price: 3.99, isPremium: true, rating: 4.9, downloads: 8900, tags: ["action", "epic", "percussion", "orchestral"], author: "FilmScore Pro" },
];

const CATEGORY_ICONS: Record<AssetCategory, React.ReactNode> = {
  "all": <Sparkles className="w-4 h-4" />,
  "characters": <Users className="w-4 h-4" />,
  "locations": <MapPin className="w-4 h-4" />,
  "music": <Music className="w-4 h-4" />,
  "vfx-packs": <Sparkles className="w-4 h-4" />,
  "wardrobes": <Shirt className="w-4 h-4" />,
  "color-grades": <Palette className="w-4 h-4" />,
};

const CATEGORY_LABELS: Record<AssetCategory, string> = {
  "all": "All Assets",
  "characters": "Characters",
  "locations": "Locations",
  "music": "Music & Score",
  "vfx-packs": "VFX Packs",
  "wardrobes": "Wardrobes",
  "color-grades": "Color Grades",
};

export default function AssetMarketplace() {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState<AssetCategory>("all");
  const [sortBy, setSortBy] = useState("popular");
  const [cart, setCart] = useState<string[]>([]);

  const filteredAssets = ASSETS.filter((asset) => {
    const matchesSearch =
      !searchQuery ||
      asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = category === "all" || asset.category === category;
    return matchesSearch && matchesCategory;
  }).sort((a, b) => {
    if (sortBy === "popular") return b.downloads - a.downloads;
    if (sortBy === "rating") return b.rating - a.rating;
    if (sortBy === "free") return (a.price === 0 ? -1 : 1);
    return 0;
  });

  const toggleCart = (id: string) => {
    setCart((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
  };

  const handleDownload = (asset: typeof ASSETS[0]) => {
    if (asset.isPremium && !cart.includes(asset.id)) {
      toast.info("Add to cart to purchase this premium asset");
      return;
    }
    toast.success(`"${asset.name}" added to your project library`);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border/40 bg-black/20 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/app")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-amber-400" />
                Asset Marketplace
              </h1>
              <p className="text-xs text-muted-foreground">
                {ASSETS.length} assets available · {ASSETS.filter((a) => !a.isPremium).length} free
              </p>
            </div>
          </div>
          {cart.length > 0 && (
            <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-black">
              <ShoppingCart className="w-4 h-4 mr-1" />
              Cart ({cart.length})
            </Button>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4">
        {/* Filters */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search assets..."
              className="pl-8 h-9 text-sm"
            />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-36 h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="popular">Most Popular</SelectItem>
              <SelectItem value="rating">Highest Rated</SelectItem>
              <SelectItem value="free">Free First</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {(Object.keys(CATEGORY_LABELS) as AssetCategory[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-all ${
                category === cat
                  ? "bg-amber-500 text-black font-medium"
                  : "border border-border/40 text-muted-foreground hover:border-amber-500/40 hover:text-amber-400"
              }`}
            >
              {CATEGORY_ICONS[cat]}
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        {/* Asset Grid */}
        <div className="grid grid-cols-3 gap-3">
          {filteredAssets.map((asset) => (
            <Card key={asset.id} className="border-border/40 bg-black/20 hover:border-amber-500/40 transition-all">
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium leading-tight">{asset.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{asset.author}</p>
                  </div>
                  {asset.isPremium ? (
                    <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/40 text-xs ml-2 flex-shrink-0">
                      ${asset.price}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-green-400 border-green-500/40 text-xs ml-2 flex-shrink-0">
                      Free
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  {asset.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="text-xs bg-muted/40 px-1.5 py-0.5 rounded text-muted-foreground">
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5">
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                      <span className="text-xs text-amber-400">{asset.rating}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {(asset.downloads / 1000).toFixed(1)}k
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {asset.isPremium && (
                      <Button
                        variant="outline" size="sm"
                        className={`h-7 text-xs ${cart.includes(asset.id) ? "border-amber-500 text-amber-400" : "border-border/40"}`}
                        onClick={() => toggleCart(asset.id)}
                      >
                        {cart.includes(asset.id) ? <CheckCircle2 className="w-3 h-3" /> : <ShoppingCart className="w-3 h-3" />}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      className="h-7 text-xs bg-amber-500 hover:bg-amber-600 text-black"
                      onClick={() => handleDownload(asset)}
                    >
                      {asset.isPremium && !cart.includes(asset.id) ? (
                        <Lock className="w-3 h-3" />
                      ) : (
                        <Download className="w-3 h-3" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
