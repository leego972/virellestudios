import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft, Search, Filter, Heart, ShoppingBag, Sparkles, Star,
  ChevronRight, ChevronDown, ShieldCheck, Package, Tag, Shirt,
  Loader2, X, Check, Crown, Gem, Palette, Users, Award, Gift,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Lamalo360Viewer } from "@/components/Lamalo360Viewer";

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { key: "all", label: "All", emoji: "✦" },
  { key: "fashion", label: "Fashion", emoji: "👗" },
  { key: "costume", label: "Costumes", emoji: "🎭" },
  { key: "period_costume", label: "Period", emoji: "🏛️" },
  { key: "uniform", label: "Uniforms", emoji: "🛡️" },
  { key: "fantasy_scifi", label: "Fantasy & Sci-Fi", emoji: "⚡" },
  { key: "signature_look", label: "Signature Looks", emoji: "⭐" },
  { key: "jewellery", label: "Jewellery", emoji: "💎" },
  { key: "bag", label: "Bags", emoji: "👜" },
  { key: "shoes", label: "Shoes", emoji: "👠" },
  { key: "hat", label: "Hats", emoji: "🎩" },
  { key: "textile", label: "Textiles", emoji: "🧵" },
  { key: "shopfront", label: "Shopfront", emoji: "🏪" },
  { key: "set_dressing", label: "Set Dressing", emoji: "🛋️" },
  { key: "background_extra", label: "Background", emoji: "👥" },
];

const PROFILE_TYPE_LABELS: Record<string, string> = {
  fashion_designer: "Fashion Designer",
  costume_designer: "Costume Designer",
  fashion_house: "Fashion House",
  wardrobe_stylist: "Wardrobe Stylist",
  textile_designer: "Textile Designer",
  accessories_designer: "Accessories Designer",
  set_decorator: "Set Decorator",
  production_designer: "Production Designer",
  costume_rental: "Costume Rental",
  vintage_dealer: "Vintage Dealer",
};

const WARDROBE_TYPE_LABELS: Record<string, string> = {
  fashion: "Fashion",
  costume: "Costume",
  period_costume: "Period Costume",
  uniform: "Uniform",
  fantasy_scifi: "Fantasy & Sci-Fi",
  signature_look: "Signature Look",
  jewellery: "Jewellery",
  bag: "Bag",
  shoes: "Shoes",
  hat: "Hat",
  textile: "Textile",
  shopfront: "Shopfront",
  set_dressing: "Set Dressing",
  background_extra: "Background Extra",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(cents: number | null | undefined) {
  if (!cents) return null;
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(cents / 100);
}

function avatarInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

// ─── Item card ────────────────────────────────────────────────────────────────

function MarketplaceItemCard({ item, onPurchase }: { item: any; onPurchase: (item: any) => void }) {
  const [imgErr, setImgErr] = useState(false);
  const price = formatPrice(item.retailPriceAud);
  return (
    <div className="group rounded-xl border border-white/10 bg-white/[0.025] overflow-hidden hover:border-amber-500/30 hover:bg-white/[0.045] transition-all duration-300">
      <div className="relative aspect-[4/5] bg-zinc-900 overflow-hidden">
        {item.primaryImageUrl && !imgErr ? (
          <img
            src={item.primaryImageUrl}
            alt={item.name}
            className="h-full w-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
            onError={() => setImgErr(true)}
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-zinc-900 to-zinc-950">
            <Shirt className="h-12 w-12 text-white/10" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/80 to-transparent" />
        <button className="absolute top-3 right-3 h-8 w-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white/50 hover:text-rose-400 hover:bg-black/70 transition-colors">
          <Heart className="h-4 w-4" />
        </button>
        {item.isFeatured && (
          <Badge className="absolute top-3 left-3 bg-amber-500/90 text-black text-[10px] font-bold border-0">
            <Star className="h-3 w-3 mr-1 fill-current" /> Featured
          </Badge>
        )}
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
          <div className="min-w-0">
            <p className="text-white font-semibold text-sm truncate">{item.name}</p>
            <p className="text-white/50 text-xs truncate">{item.brandName ?? item.designerBrandName ?? "Independent Designer"}</p>
          </div>
          {price && <span className="text-amber-400 font-bold text-sm shrink-0">{price}</span>}
        </div>
      </div>
      <div className="p-3 flex items-center justify-between gap-2">
        <Badge variant="outline" className="text-[10px] border-white/10 text-white/40 capitalize">
          {WARDROBE_TYPE_LABELS[item.wardrobeType] ?? item.wardrobeType ?? item.category ?? "Wardrobe"}
        </Badge>
        <Button
          size="sm"
          onClick={() => onPurchase(item)}
          className="h-7 px-3 text-xs bg-amber-500 hover:bg-amber-400 text-black font-semibold"
        >
          <ShoppingBag className="h-3 w-3 mr-1" /> Buy
        </Button>
      </div>
    </div>
  );
}

// ─── Collection card ──────────────────────────────────────────────────────────

function CollectionCard({ collection, onClick }: { collection: any; onClick: () => void }) {
  const [imgErr, setImgErr] = useState(false);
  return (
    <button
      onClick={onClick}
      className="group text-left rounded-2xl overflow-hidden border border-white/10 hover:border-amber-500/30 bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-300"
    >
      <div className="relative aspect-[16/10] bg-zinc-900 overflow-hidden">
        {collection.coverImageUrl && !imgErr ? (
          <img
            src={collection.coverImageUrl}
            alt={collection.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={() => setImgErr(true)}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-amber-950/30 to-zinc-950 flex items-center justify-center">
            <Palette className="h-10 w-10 text-amber-500/20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4">
          <p className="text-white font-bold text-lg leading-tight">{collection.name}</p>
          <p className="text-white/50 text-xs mt-1 line-clamp-1">{collection.description}</p>
        </div>
      </div>
      <div className="p-3 flex items-center justify-between">
        <span className="text-xs text-white/40">{collection.itemCount ?? collection.items?.length ?? 0} items</span>
        <ChevronRight className="h-4 w-4 text-white/30 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
      </div>
    </button>
  );
}

// ─── Lamalo in-house brand experience ─────────────────────────────────────────

const LAMALO_STATS = [
  { value: "28", label: "Curated Collections" },
  { value: "1,400+", label: "Virtual Items" },
  { value: "A$1–5", label: "Per Item, Forever" },
  { value: "∞", label: "Projects & Scenes" },
];

const LAMALO_HOW = [
  {
    step: "01",
    title: "Browse by collection",
    body: "Explore 28 curated collections across men's, women's, kids', footwear, accessories, swimwear, sport, luxury and more.",
    icon: Search,
  },
  {
    step: "02",
    title: "Buy the exact colour",
    body: "Every colour variant is its own item. Pick the exact shade you need — no AI guesswork, no drift.",
    icon: Palette,
  },
  {
    step: "03",
    title: "Own it forever",
    body: "One small purchase, permanent access. Use the item on any character across unlimited projects and scenes.",
    icon: Crown,
  },
  {
    step: "04",
    title: "Perfect continuity",
    body: "The exact item reference is locked into every scene generation so the garment stays consistent from shot to shot.",
    icon: ShieldCheck,
  },
];

const LAMALO_BENEFITS = [
  {
    title: "A fraction of the usual cost",
    body: "Lamalo items cost roughly 10% of equivalent real-world Kmart prices — from just A$1 per item. Collection bundles save another 10%.",
    icon: Tag,
  },
  {
    title: "Shared 360° master — every colour remains a separate item",
    body: "Each design uses one approved multi-angle construction reference pack, while every colour is still its own catalogue SKU, checkout and permanent inventory item. The chosen colour is hard-locked for every scene.",
    icon: Palette,
  },
  {
    title: "Built into the generation pipeline",
    body: "Purchased Lamalo items are automatically fed into Virelle's cinematic prompt engine. No uploading, no prompt writing, no manual continuity work.",
    icon: Sparkles,
  },
];

function LamaloHero() {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-950/60 via-zinc-950 to-black p-6 sm:p-10 mb-8 shadow-2xl shadow-amber-500/10">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute -top-32 -right-20 w-96 h-96 rounded-full bg-amber-500/30 blur-3xl" />
        <div className="absolute -bottom-24 -left-20 w-80 h-80 rounded-full bg-orange-700/20 blur-3xl" />
      </div>
      <div className="relative flex flex-col lg:flex-row lg:items-center gap-8">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-4">
            <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold">
              <Crown className="h-3.5 w-3.5 mr-1.5" /> Virelle Studios In-House Brand
            </Badge>
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-xs">
              <ShieldCheck className="h-3 w-3 mr-1" /> Continuity-Locked
            </Badge>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white mb-3">
            LAMALO <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-amber-600">FASHION</span>
          </h1>
          <p className="text-lg sm:text-xl text-white/60 max-w-2xl leading-relaxed">
            A complete virtual wardrobe built for filmmakers. Buy once, use forever — with exact colour continuity across every scene.
          </p>
          <div className="flex flex-wrap gap-3 mt-6">
            <Button
              onClick={() => document.getElementById("lamalo-collections")?.scrollIntoView({ behavior: "smooth" })}
              className="bg-amber-500 hover:bg-amber-400 text-black font-bold px-6"
            >
              <ShoppingBag className="h-4 w-4 mr-2" /> Browse Collections
            </Button>
            <Button
              variant="outline"
              onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
              className="border-white/20 text-white/70 hover:bg-white/10 hover:text-white"
            >
              How It Works <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 shrink-0">
          {LAMALO_STATS.map((s) => (
            <div key={s.label} className="rounded-2xl border border-amber-500/20 bg-black/40 backdrop-blur-sm px-5 py-4 text-center min-w-[120px]">
              <div className="text-2xl font-black text-amber-400">{s.value}</div>
              <div className="text-[10px] text-white/40 uppercase tracking-wider mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LamaloHowItWorks() {
  return (
    <section id="how-it-works" className="mb-10">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-black text-white">How Lamalo Works</h2>
        <p className="text-sm text-white/40 mt-1">From catalogue to character in four simple steps</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {LAMALO_HOW.map((step, i) => {
          const Icon = step.icon;
          return (
            <div key={step.step} className="relative rounded-2xl border border-amber-500/15 bg-white/[0.025] p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="h-9 w-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <Icon className="h-4 w-4 text-amber-400" />
                </div>
                <span className="text-3xl font-black text-white/[0.06]">{step.step}</span>
              </div>
              <h3 className="text-sm font-bold text-white mb-1.5">{step.title}</h3>
              <p className="text-xs text-white/40 leading-relaxed">{step.body}</p>
              {i < LAMALO_HOW.length - 1 && (
                <ChevronRight className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-amber-500/30 z-10" />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function LamaloBenefits() {
  return (
    <section className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-10">
      {LAMALO_BENEFITS.map((b) => {
        const Icon = b.icon;
        return (
          <div key={b.title} className="flex gap-4 rounded-2xl border border-white/8 bg-white/[0.02] p-5">
            <div className="h-10 w-10 shrink-0 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Icon className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white mb-1">{b.title}</h3>
              <p className="text-xs text-white/40 leading-relaxed">{b.body}</p>
            </div>
          </div>
        );
      })}
    </section>
  );
}

// ─── Lamalo seed catalogue components ─────────────────────────────────────────

function swatchBackground(colour: string): string {
  const key = colour.toLowerCase();
  const map: Record<string, string> = {
    black: "#111111", white: "#f7f7f2", navy: "#172554", charcoal: "#374151",
    "charcoal grey": "#374151", grey: "#9ca3af", "grey marle": "#9ca3af",
    olive: "#556b2f", "sage green": "#9caf88", burgundy: "#7f1d1d",
    "cobalt blue": "#0047ab", teal: "#0f766e",
    "blush pink": "#efc3c7", "coral pink": "#f88379", "nude beige": "#d8b4a0",
    camel: "#c19a6b", cream: "#fffdd0", stone: "#b7b09c", red: "#b91c1c",
  };
  if (map[key]) return map[key];
  if (key.includes("/") || key.includes("floral") || key.includes("check") || key.includes("stripe")) {
    return "linear-gradient(135deg,#111 0 25%,#d4af37 25% 50%,#f5f5f5 50% 75%,#6b7280 75%)";
  }
  return "linear-gradient(135deg,#d4af37,#6b7280)";
}

function ItemCard({
  variants,
  onBuy,
  isBuying,
}: {
  variants: any[];
  onBuy: (itemId: number) => void;
  isBuying: (itemId: number) => boolean;
}) {
  const [selectedId, setSelectedId] = useState<number>(() => variants[0]?.id);
  useEffect(() => {
    if (!variants.some((variant) => variant.id === selectedId)) setSelectedId(variants[0]?.id);
  }, [variants, selectedId]);
  const item = variants.find((variant) => variant.id === selectedId) ?? variants[0];
  if (!item) return null;
  const color = item.colors?.[0] ?? item.name?.split(" — ").pop() ?? "";
  const baseName = item.name?.split(" — ")[0] ?? item.name;
  const cents = item.retailPriceAud ?? 100;
  const priceLabel = `A$${(cents / 100).toFixed(2)}`;
  const referencePackReady = item.turntableStatus === "ready" && Number(item.turntableFrameCount) === 36 && Array.isArray(item.turntableFrameUrls) && item.turntableFrameUrls.length === 36;

  return (
    <div className="group rounded-xl border border-amber-500/20 hover:border-amber-500/30 glass-card/[0.02] hover:glass-card/[0.04] overflow-hidden transition-all duration-200 flex flex-col hover:shadow-amber-500/20">
      <div className="relative h-36 bg-gradient-to-br from-white/5 to-black overflow-hidden">
        <Lamalo360Viewer
          frames={item.turntableFrameUrls}
          fallback={item.primaryImageUrl}
          alt={`${baseName} — ${color}`}
          ready={referencePackReady}
          className="h-full w-full"
        />
        <div className="absolute top-2 right-2">
          <span className="text-[9px] font-bold uppercase tracking-wider bg-black/75 backdrop-blur-sm border border-amber-500/20 text-white/80 rounded-full px-2 py-0.5">{color}</span>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
      </div>

      <div className="p-3 flex flex-col gap-2 flex-1">
        <div>
          <p className="text-xs font-bold text-white leading-tight line-clamp-2">{baseName}</p>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <Badge className="bg-purple-500/15 text-purple-200 border border-purple-400/30 text-[9px] px-1.5 py-0">Virtual item</Badge>
            <Badge className="bg-amber-500/10 text-amber-300 border border-amber-500/25 text-[9px] px-1.5 py-0">{referencePackReady ? "True 360° ready" : "True 360° queued"}</Badge>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={`Choose colour for ${baseName}`}>
          {variants.map((variant) => {
            const variantColour = variant.colors?.[0] ?? variant.name?.split(" — ").pop() ?? "Colour";
            const selected = variant.id === item.id;
            return (
              <button
                key={variant.id}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={variantColour}
                title={variantColour}
                onClick={() => setSelectedId(variant.id)}
                className={`h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 ${selected ? "border-amber-400 ring-2 ring-amber-400/30" : "border-white/25"}`}
                style={{ background: swatchBackground(variantColour) }}
              />
            );
          })}
        </div>
        <p className="text-[10px] text-white/35"><span className="text-amber-400/80">{color}</span> is a separate purchasable item and permanent inventory entry.</p>

        <div className="flex items-center justify-between mt-auto pt-1">
          <div className="flex items-center gap-1 text-amber-400"><Tag className="h-3 w-3" /><span className="text-xs font-black">{priceLabel}</span></div>
          <Button size="sm" onClick={() => onBuy(item.id)} disabled={isBuying(item.id)} className="h-7 px-3 text-[10px] font-bold bg-amber-500 hover:bg-amber-400 text-black rounded-lg">
            {isBuying(item.id) ? <Loader2 className="h-3 w-3 animate-spin text-amber-400" /> : `Buy ${color}`}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Collection accordion ─────────────────────────────────────────────────────

function CollectionAccordion({ col, onBuyItem, onBuyCollection, leasingId }: {
  col: any;
  onBuyItem: (id: number) => void;
  onBuyCollection: (id: number) => void;
  leasingId: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const items: any[] = col.items ?? [];
  const itemCount = items.length;
  const groupedVariants = new Map<string, any[]>();
  for (const item of items) {
    const baseName = item.name?.split(" — ")[0] ?? item.name;
    const groupKey = item.masterReferenceKey || `${baseName}:${item.genderFit || "unisex"}:${item.category || "garment"}:${item.subcategory || "default"}`;
    const variants = groupedVariants.get(groupKey) ?? [];
    variants.push(item);
    groupedVariants.set(groupKey, variants);
  }
  const variantGroups = Array.from(groupedVariants.values());
  const designCount = variantGroups.length;
  const minItemCents = items.length
    ? Math.min(...items.map((i: any) => i.retailPriceAud ?? 100))
    : 100;
  const bundleCents = col.collectionPriceAud ?? 0;
  const bundleLabel = `A$${(bundleCents / 100).toFixed(2)}`;
  const typeLabel = col.collectionType ? col.collectionType.charAt(0).toUpperCase() + col.collectionType.slice(1) : "Collection";

  return (
    <div className="rounded-2xl border border-amber-500/20 bg-black/30 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-4 p-4 sm:p-5 text-left hover:bg-white/[0.025] transition-colors"
      >
        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-800/10 border border-amber-500/20 flex items-center justify-center shrink-0">
          <Shirt className="h-5 w-5 text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm sm:text-base font-bold text-white">{col.name}</h3>
            <Badge variant="outline" className="text-[9px] border-white/10 text-white/35">{typeLabel}</Badge>
          </div>
          <p className="text-xs text-white/35 mt-0.5 line-clamp-1">{col.description}</p>
          <p className="text-[10px] text-white/25 mt-1">
            {designCount} designs · {itemCount} separate colour SKUs · From A${(minItemCents / 100).toFixed(2)} each
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-black text-amber-400">{bundleLabel}</p>
            <p className="text-[9px] text-white/30">Entire collection · 10% off</p>
          </div>
          {expanded ? <ChevronDown className="h-5 w-5 text-white/40" /> : <ChevronRight className="h-5 w-5 text-white/40" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-amber-500/10 p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[11px] text-white/35">{expanded ? "Hide items" : `Browse ${designCount} designs`}</p>
            <Button
              size="sm"
              onClick={() => onBuyCollection(col.id)}
              disabled={leasingId === `collection-${col.id}`}
              className="h-8 px-4 text-[11px] font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black rounded-lg"
            >
              {leasingId === `collection-${col.id}` ? (
                <Loader2 className="h-3 w-3 animate-spin text-amber-400" />
              ) : (
                <><Package className="h-3 w-3 mr-1.5" />{`Buy all ${itemCount} colour SKUs — ${bundleLabel}`}</>
              )}
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {variantGroups.map((variants: any[]) => (
              <ItemCard
                key={variants[0]?.name?.split(" — ")[0] ?? variants[0]?.id}
                variants={variants}
                onBuy={onBuyItem}
                isBuying={(itemId) => leasingId === `item-${itemId}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LamaloCatalogue() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.wardrobeMarket.lamaloCatalog.useQuery();
  const [leasingId, setLeasingId] = useState<string | null>(null);

  const leaseItem = trpc.wardrobeMarket.leasing.leaseItem.useMutation({
    onSuccess: (result) => {
      toast.success(result.message);
      setLeasingId(null);
      utils.wardrobeMarket.inventory.invalidate();
    },
    onError: (err) => {
      toast.error(err.message);
      setLeasingId(null);
    },
  });
  const leaseCollection = trpc.wardrobeMarket.leasing.leaseCollection.useMutation({
    onSuccess: (result) => {
      toast.success(result.message);
      setLeasingId(null);
      utils.wardrobeMarket.inventory.invalidate();
    },
    onError: (err) => {
      toast.error(err.message);
      setLeasingId(null);
    },
  });

  const handleBuyItem = (itemId: number) => {
    setLeasingId(`item-${itemId}`);
    leaseItem.mutate({ itemId });
  };
  const handleBuyCollection = (collectionId: number) => {
    setLeasingId(`collection-${collectionId}`);
    leaseCollection.mutate({ collectionId });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
      </div>
    );
  }

  const collections: any[] = (data as any)?.collections ?? [];
  const profile = (data as any)?.profile;

  if (!profile || collections.length === 0) {
    return (
      <div className="rounded-2xl border border-amber-500/20 bg-amber-950/10 p-8 text-center">
        <Shirt className="h-12 w-12 text-amber-500/30 mx-auto mb-3" />
        <p className="text-white/60 font-semibold">Lamalo catalogue is being prepared</p>
        <p className="text-white/30 text-sm mt-1">Check back shortly — 28 collections and 1,400+ items are on the way.</p>
      </div>
    );
  }

  return (
    <div id="lamalo-collections" className="space-y-3 scroll-mt-6">
      <div className="flex items-end justify-between mb-5">
        <div>
          <h2 className="text-2xl font-black text-white">The Complete Catalogue</h2>
          <p className="text-sm text-white/40 mt-1">{collections.length} collections · Every colour is a separate item · Buy once, use forever</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs text-amber-400/60">
          <ShieldCheck className="h-4 w-4" /> Continuity-Locked
        </div>
      </div>
      {collections.map((col: any) => (
        <CollectionAccordion
          key={col.id}
          col={col}
          onBuyItem={handleBuyItem}
          onBuyCollection={handleBuyCollection}
          leasingId={leasingId}
        />
      ))}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function WardrobeMarketplacePage() {
  const [, setLocation] = useLocation();
  const [view, setView] = useState<"discover" | "designer" | "collection" | "lamalo">("discover");
  const [selectedDesigner, setSelectedDesigner] = useState<any>(null);
  const [selectedCollection, setSelectedCollection] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [purchaseItem, setPurchaseItem] = useState<any>(null);

  const { data: designers = [], isLoading: loadingDesigners } = trpc.wardrobeMarket.designers.browse.useQuery({
    profileType: undefined,
    country: undefined,
  });

  const { data: featured = [], isLoading: loadingFeatured } = trpc.wardrobeMarket.items.featured.useQuery({ limit: 12 });

  const { data: recent = [], isLoading: loadingRecent } = trpc.wardrobeMarket.items.browse.useQuery({
    wardrobeType: category === "all" ? undefined : category,
    search: search || undefined,
    limit: 24,
  });

  const { data: designerCollections = [] } = trpc.wardrobeMarket.designers.collections.useQuery(
    { designerProfileId: selectedDesigner?.id ?? 0 },
    { enabled: !!selectedDesigner },
  );

  const { data: collectionItems = [] } = trpc.wardrobeMarket.collections.items.useQuery(
    { collectionId: selectedCollection?.id ?? 0 },
    { enabled: !!selectedCollection },
  );

  const isLamalo = selectedDesigner?.brandName === "Lamalo Fashion";

  const filteredDesigners = useMemo(() => {
    if (!search) return designers as any[];
    const q = search.toLowerCase();
    return (designers as any[]).filter((d) =>
      d.brandName?.toLowerCase().includes(q) || d.bio?.toLowerCase().includes(q),
    );
  }, [designers, search]);

  const openDesigner = (profile: any) => {
    setSelectedDesigner(profile);
    if (profile.brandName === "Lamalo Fashion") {
      setView("lamalo");
    } else {
      setView("designer");
    }
  };

  const goBack = () => {
    if (view === "collection") setView("designer");
    else if (view === "designer" || view === "lamalo") {
      setView("discover");
      setSelectedDesigner(null);
    }
    else setLocation("/dashboard");
  };

  const title = view === "lamalo" ? "Lamalo Fashion"
    : view === "designer" ? selectedDesigner?.brandName
    : view === "collection" ? selectedCollection?.name
    : "Designer Wardrobe Marketplace";

  return (
    <div className="min-h-screen bg-[#09090b] text-white">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-white/8 bg-[#09090b]/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto h-16 px-4 sm:px-6 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={goBack} className="text-white/50 hover:text-white">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold truncate">{title}</h1>
            {view === "discover" && <p className="text-[11px] text-white/35">Costumes, fashion & production design assets</p>}
          </div>
          {view === "discover" && (
            <div className="hidden sm:flex items-center gap-2 text-xs text-white/30">
              <ShieldCheck className="h-4 w-4 text-emerald-400/60" />
              License-verified marketplace
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {view === "discover" && (
          <>
            {/* Hero */}
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-violet-950/40 via-zinc-950 to-amber-950/30 p-8 sm:p-12 mb-10">
              <div className="absolute inset-0 opacity-30">
                <div className="absolute -top-32 -right-20 w-96 h-96 rounded-full bg-violet-600/30 blur-3xl" />
                <div className="absolute -bottom-32 -left-20 w-96 h-96 rounded-full bg-amber-600/20 blur-3xl" />
              </div>
              <div className="relative max-w-3xl">
                <Badge className="mb-4 bg-violet-500/15 text-violet-300 border border-violet-500/30">
                  <Sparkles className="h-3 w-3 mr-1.5" /> Virelle Designer Wardrobe
                </Badge>
                <h2 className="text-4xl sm:text-5xl font-black tracking-tight mb-4">
                  Dress every character.<br />Build every world.
                </h2>
                <p className="text-lg text-white/50 leading-relaxed max-w-2xl">
                  Browse licensed costumes, fashion, uniforms, period pieces and production design assets from verified designers worldwide — or explore Lamalo, Virelle's in-house virtual fashion brand.
                </p>
              </div>
            </div>

            {/* Search + filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-8">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search designers, garments, costumes…"
                  className="pl-10 bg-white/[0.04] border-white/10 text-white placeholder:text-white/25 h-11"
                />
              </div>
              <Button variant="outline" className="border-white/10 text-white/50 h-11">
                <Filter className="h-4 w-4 mr-2" /> Filters
              </Button>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 mb-8 scrollbar-none">
              {CATEGORIES.map((c) => (
                <button
                  key={c.key}
                  onClick={() => setCategory(c.key)}
                  className={`shrink-0 px-3.5 py-2 rounded-full text-xs font-medium transition-colors border ${
                    category === c.key
                      ? "bg-amber-500 text-black border-amber-500"
                      : "bg-white/[0.03] text-white/45 border-white/10 hover:text-white/70 hover:border-white/20"
                  }`}
                >
                  <span className="mr-1.5">{c.emoji}</span>{c.label}
                </button>
              ))}
            </div>

            {/* Designer houses */}
            <section className="mb-10">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-xl font-bold">Designer Houses</h2>
                  <p className="text-xs text-white/35 mt-0.5">Verified brands and independent designers</p>
                </div>
              </div>
              {loadingDesigners ? (
                <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-amber-400" /></div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                  {filteredDesigners.map((d: any) => (
                    <DesignerCard key={d.id} profile={d} onClick={() => openDesigner(d)} />
                  ))}
                </div>
              )}
            </section>

            {/* Featured items */}
            <section className="mb-10">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-xl font-bold">Featured Pieces</h2>
                  <p className="text-xs text-white/35 mt-0.5">Standout items selected by our editorial team</p>
                </div>
                <button className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1">
                  View all <ChevronRight className="h-3 w-3" />
                </button>
              </div>
              {loadingFeatured ? (
                <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-amber-400" /></div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                  {(featured as any[]).map((item) => (
                    <MarketplaceItemCard key={item.id} item={item} onPurchase={setPurchaseItem} />
                  ))}
                </div>
              )}
            </section>

            {/* Recently added */}
            <section>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-xl font-bold">Recently Added</h2>
                  <p className="text-xs text-white/35 mt-0.5">Fresh from the world's best designers</p>
                </div>
              </div>
              {loadingRecent ? (
                <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-amber-400" /></div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                  {(recent as any[]).map((item) => (
                    <MarketplaceItemCard key={item.id} item={item} onPurchase={setPurchaseItem} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {view === "lamalo" && (
          <>
            <LamaloHero />
            <LamaloHowItWorks />
            <LamaloBenefits />
            <LamaloCatalogue />
          </>
        )}

        {view === "designer" && selectedDesigner && !isLamalo && (
          <>
            {/* Designer header */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6 mb-8 flex flex-col sm:flex-row gap-5 items-start sm:items-center">
              <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-violet-600 to-amber-500 flex items-center justify-center text-2xl font-black shrink-0 overflow-hidden">
                {selectedDesigner.logoUrl ? (
                  <img src={selectedDesigner.logoUrl} alt="" className="w-full h-full object-cover" />
                ) : avatarInitials(selectedDesigner.brandName)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-2xl font-bold">{selectedDesigner.brandName}</h2>
                  {selectedDesigner.isVerified && <ShieldCheck className="h-5 w-5 text-blue-400" />}
                </div>
                <p className="text-sm text-white/45 max-w-2xl">{selectedDesigner.bio}</p>
                <div className="flex gap-3 mt-3 text-xs text-white/30">
                  <span>{PROFILE_TYPE_LABELS[selectedDesigner.profileType] ?? "Designer"}</span>
                  {selectedDesigner.country && <span>· {selectedDesigner.country}</span>}
                  {selectedDesigner.followerCount != null && <span>· {selectedDesigner.followerCount} followers</span>}
                </div>
              </div>
              <Button className="bg-white/10 hover:bg-white/15 text-white border border-white/10">
                <Heart className="h-4 w-4 mr-2" /> Follow
              </Button>
            </div>

            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold">Collections</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {(designerCollections as any[]).map((c) => (
                <CollectionCard
                  key={c.id}
                  collection={c}
                  onClick={() => { setSelectedCollection(c); setView("collection"); }}
                />
              ))}
            </div>
          </>
        )}

        {view === "collection" && selectedCollection && (
          <>
            <div className="mb-8">
              <Badge variant="outline" className="mb-3 border-white/10 text-white/40">
                {selectedDesigner?.brandName}
              </Badge>
              <h2 className="text-3xl font-black">{selectedCollection.name}</h2>
              <p className="text-white/45 mt-2 max-w-2xl">{selectedCollection.description}</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {(collectionItems as any[]).map((item) => (
                <MarketplaceItemCard key={item.id} item={item} onPurchase={setPurchaseItem} />
              ))}
            </div>
          </>
        )}

        <div className="border-t border-amber-500/20 pt-8 text-center space-y-3">
          <p className="text-xs text-white/30">
            Purchased items appear instantly in your wardrobe inventory — assign to any character across any project.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation("/designer-register")}
            className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
          >
            Are you a designer? Join the marketplace →
          </Button>
        </div>
      </main>
    </div>
  );
}

// ─── Designer grid card ───────────────────────────────────────────────────────

function DesignerCard({ profile, onClick }: { profile: any; onClick: () => void }) {
  const [imgErr, setImgErr] = useState(false);
  const isLamalo = profile.brandName === "Lamalo Fashion";
  return (
    <button
      onClick={onClick}
      className={`group text-left rounded-2xl overflow-hidden transition-all duration-200 border ${
        isLamalo
          ? "border-amber-500/40 hover:border-amber-400 bg-gradient-to-br from-amber-950/30 to-black shadow-lg shadow-amber-500/10"
          : "border-amber-500/20 hover:border-amber-500/30 bg-white/[0.02] hover:bg-white/[0.04]"
      }`}
    >
      <div className="relative h-36 overflow-hidden">
        {profile.logoUrl && !imgErr ? (
          <img
            src={profile.logoUrl}
            alt={profile.brandName}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImgErr(true)}
          />
        ) : (
          <div className="w-full h-full glass-card/5 flex items-center justify-center">
            <Shirt className="h-8 w-8 text-white/20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="absolute bottom-2 left-3 flex gap-1.5">
          <Badge variant="outline" className="text-[10px] border-white/20 text-white/60 bg-black/50">
            {PROFILE_TYPE_LABELS[profile.profileType] ?? "Designer"}
          </Badge>
          {isLamalo && (
            <Badge className="text-[10px] bg-amber-500/20 text-amber-300 border-amber-500/30">
              In-House
            </Badge>
          )}
        </div>
      </div>
      <div className="p-3">
        <div className="flex items-center gap-1.5">
          <h3 className="font-bold text-sm truncate">{profile.brandName}</h3>
          {profile.isVerified && <ShieldCheck className="h-3.5 w-3.5 text-blue-400 shrink-0" />}
        </div>
        <p className="text-[11px] text-white/35 mt-0.5 truncate">{PROFILE_TYPE_LABELS[profile.profileType] ?? "Designer"}</p>
      </div>
    </button>
  );
}
