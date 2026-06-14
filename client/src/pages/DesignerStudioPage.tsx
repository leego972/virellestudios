/**
 * DesignerStudioPage.tsx — v7.0
 *
 * Designer dashboard: membership status, Stripe Connect payouts,
 * collection management (publish/unpublish, pricing), and earnings overview.
 */
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Store,
  Wallet,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Package,
  Tag,
  Eye,
  EyeOff,
  Pencil,
  ArrowRight,
  TrendingUp,
  Loader2,
  ChevronLeft,
  Shirt,
} from "lucide-react";
import { toast } from "sonner";

const LOGO_URL = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663418605762/hxRQQgsmyjgcByim.png";

function StatusBadge({ status }: { status: string }) {
  if (status === "active") {
    return (
      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
        <CheckCircle2 className="h-3 w-3 mr-1" /> Active
      </Badge>
    );
  }
  if (status === "pending") {
    return (
      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
        <AlertCircle className="h-3 w-3 mr-1" /> Pending
      </Badge>
    );
  }
  return (
    <Badge className="bg-white/5 text-white/40 border-amber-500/20">
      <XCircle className="h-3 w-3 mr-1" /> Inactive
    </Badge>
  );
}
const ITEM_TIERS = [
    { label: "Accessories", min: 8, max: 20 },
    { label: "Garments", min: 15, max: 40 },
    { label: "Hero / Costume", min: 35, max: 80 },
  ];
  const COLLECTION_PRESETS = [
    { label: "Starter", desc: "5–10 items", price: 60 },
    { label: "Standard", desc: "10–20 items", price: 100 },
    { label: "Signature", desc: "20+ items", price: 180 },
    { label: "Luxury", desc: "20+ premium", price: 300 },
  ];
  const MEMBERSHIP_FEE_AUD = 299;

  function PriceDialog({
    open,
    onClose,
    title,
    retailPrice,
    leasePrice,
    onSave,
    isCollection,
  }: {
    open: boolean;
    onClose: () => void;
    title: string;
    retailPrice?: number;
    leasePrice?: number;
    onSave: (retail: number, lease: number) => void;
    isCollection?: boolean;
  }) {
    const [retail, setRetail] = useState(String((retailPrice ?? 0) / 100));
    const [lease, setLease] = useState(String((leasePrice ?? 0) / 100));
    const leaseNum = parseFloat(lease || "0");
    const youEarn = leaseNum * 0.95;
    const suggestedLease = parseFloat(retail) * 0.02;
    const leasesNeeded = youEarn > 0 ? Math.ceil(MEMBERSHIP_FEE_AUD / youEarn) : null;

    return (
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="bg-zinc-900 border-amber-500/20 text-white max-w-md glass-dark">
          <DialogHeader>
            <DialogTitle className="text-base font-bold gradient-text-gold">Set Pricing</DialogTitle>
            <p className="text-xs text-white/50 mt-0.5 truncate">{title}</p>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Pricing guidance panel */}
            <div className="rounded-xl bg-amber-500/8 border border-amber-500/20 p-3 space-y-2">
              <p className="text-[11px] font-bold text-amber-400/80 uppercase tracking-wider">
                {isCollection ? "Recommended collection prices — tap to apply" : "Recommended item prices — tap to apply"}
              </p>
              {isCollection ? (
                <div className="grid grid-cols-2 gap-1.5">
                  {COLLECTION_PRESETS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => setLease(String(p.price))}
                      className={`text-left rounded-lg px-2.5 py-1.5 border transition-all ${
                        leaseNum === p.price
                          ? "bg-amber-500/20 border-amber-500/50 text-amber-300"
                          : "bg-white/3 border-amber-500/20 text-white/70 hover:border-amber-500/30 hover:text-white"
                      }`}
                    >
                      <span className="text-xs font-bold block">A${p.price} · {p.label}</span>
                      <span className="text-[10px] text-white/40">{p.desc}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {ITEM_TIERS.map((t) => (
                    <div key={t.label} className="flex items-center justify-between">
                      <span className="text-[11px] text-white/60 w-28">{t.label}</span>
                      <div className="flex gap-1">
                        {[t.min, Math.round((t.min + t.max) / 2), t.max].map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setLease(String(v))}
                            className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                              leaseNum === v
                                ? "bg-amber-500/20 border-amber-500/50 text-amber-300"
                                : "bg-white/5 border-amber-500/20 hover:border-amber-500/30 hover:text-amber-400"
                            }`}
                          >
                            A${v}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {!isCollection && (
              <div>
                <Label className="text-xs text-white/70 mb-1 block">Real-world Retail Value (A$) — optional</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">$</span>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={retail}
                    onChange={(e) => setRetail(e.target.value)}
                    className="pl-7 bg-white/5 border-amber-500/20 text-white"
                    placeholder="e.g. 800"
                  />
                </div>
                {suggestedLease > 0 && (
                  <button
                    type="button"
                    onClick={() => setLease(suggestedLease.toFixed(2))}
                    className="text-xs text-amber-400/70 hover:text-amber-400 mt-1 transition-colors"
                  >
                    Use 2% of retail → A${suggestedLease.toFixed(2)}
                  </button>
                )}
              </div>
            )}

            <div>
              <Label className="text-xs text-white/70 mb-1 block">
                {isCollection ? "Your asking price (A$)" : "Lease price per item (A$)"}
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">$</span>
                <Input
                  type="number"
                  min="0.50"
                  step="0.50"
                  value={lease}
                  onChange={(e) => setLease(e.target.value)}
                  className="pl-7 bg-white/5 border-amber-500/20 text-white text-base font-bold"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Live earnings + breakeven */}
            {leaseNum > 0 && (
              <div className="rounded-xl glass-card/3 border border-amber-500/20 p-3 space-y-1.5 hover:shadow-amber-500/20 transition-shadow">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/50">You earn per lease</span>
                  <span className="text-sm font-bold text-green-400">A${youEarn.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/40">Platform fee (5%)</span>
                  <span className="text-xs text-white/30">−A${(leaseNum * 0.05).toFixed(2)}</span>
                </div>
                {leasesNeeded !== null && (
                  <div className="pt-1.5 border-t border-amber-500/20 flex items-center justify-between">
                    <span className="text-xs text-white/50">Leases to cover A$299 membership</span>
                    <span className={`text-sm font-black ${leasesNeeded <= 6 ? "text-amber-400" : leasesNeeded <= 12 ? "text-amber-300/60" : "text-white/40"}`}>
                      {leasesNeeded}×
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose} className="border-amber-500/20 text-white/70 hover:bg-white/5 hover:border-amber-500/50 hover:text-amber-400">
              Cancel
            </Button>
            <Button
              onClick={() => {
                const r = Math.round(parseFloat(retail || "0") * 100);
                const l = Math.round(parseFloat(lease || "0") * 100);
                if (l < 50) {
                  toast.error("Lease price must be at least A$0.50");
                  return;
                }
                onSave(r, l);
              }}
              className="bg-amber-500 hover:bg-amber-600 text-black font-bold"
            >
              Save Pricing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

export default function DesignerStudioPage() {
  const [, setLocation] = useLocation();
  const [pricingDialog, setPricingDialog] = useState<{
    open: boolean;
    type: "item" | "collection";
    id: number;
    title: string;
    retail?: number;
    lease?: number;
  } | null>(null);

  const utils = trpc.useUtils();

  const { data: membership, isLoading: memberLoading } = trpc.wardrobeMarket.designer.getMembershipStatus.useQuery();
  const { data: connectStatus, isLoading: connectLoading } = trpc.wardrobeMarket.designer.getConnectStatus.useQuery();
  const { data: earnings } = trpc.wardrobeMarket.designer.getEarnings.useQuery();

  const setItemPricingMut = trpc.wardrobeMarket.designer.setItemPricing.useMutation({
    onSuccess: () => {
      toast.success("Pricing updated");
      setPricingDialog(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const setColPricingMut = trpc.wardrobeMarket.designer.setCollectionPricing.useMutation({
    onSuccess: () => {
      toast.success("Collection pricing updated");
      setPricingDialog(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const publishMut = trpc.wardrobeMarket.designer.publishCollection.useMutation({
    onSuccess: () => {
      toast.success("Collection updated");
      utils.designerWardrobe.listCollections.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const onboardMut = trpc.wardrobeMarket.designer.onboardConnect.useMutation({
    onSuccess: (data) => {
      if (data.onboardingUrl) window.location.href = data.onboardingUrl;
    },
    onError: (e) => toast.error(e.message),
  });

  const { isAdmin } = useSubscription();
  const isMember = membership?.status === "active" || isAdmin;
  const isConnected = connectStatus?.chargesEnabled && connectStatus?.payoutsEnabled;

  const profile = membership?.profile as any;

  const { data: collectionsRaw } = trpc.designerWardrobe.listCollections.useQuery(
    { scope: "mine" },
    { enabled: isMember },
  );

  const collections: any[] = collectionsRaw ?? [];

  // Handle return from Stripe Connect onboarding
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connectParam = params.get("connect");
    if (connectParam === "done") {
      toast.success("Payout setup complete! You're ready to receive lease payments.");
      window.history.replaceState({}, "", "/designer/studio");
    }
  }, []);

  if (memberLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
      </div>
    );
  }

  // Public items browse — non-members see Lamalo items directly
    const { data: publicItems } = trpc.wardrobeMarket.marketplace.searchItems.useQuery({ limit: 60, offset: 0 });

    if (!isMember) {
      return (
        <div className="min-h-screen text-white" style={{ background:"linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)" }}>
          <header className="border-b border-amber-500/20 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img src={LOGO_URL} alt="Virelle Studios" className="h-7 w-7 rounded object-contain" onError={(e) => (e.currentTarget.style.display = "none")} />
              <span className="text-sm font-black tracking-tighter uppercase italic">
                Virelle <span className="text-amber-400">Studios</span>
              </span>
            </div>
            <Button onClick={() => setLocation("/designer-register")} className="bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs">
              <Store className="h-3.5 w-3.5 mr-1.5" />
              Join as Designer — A$299/yr
            </Button>
          </header>
          <div className="max-w-6xl mx-auto px-6 py-8">
            <div className="flex items-end justify-between mb-6">
              <div>
                <h1 className="text-3xl font-black mb-1 text-gold-shimmer">Lamalo Fashion</h1>
                <p className="text-white/40 text-sm">Browse the full wardrobe catalogue and lease items for your production.</p>
              </div>
              <span className="text-white/30 text-xs">{publicItems?.length ?? 0} items</span>
            </div>
            {(!publicItems || publicItems.length === 0) ? (
              <div className="flex flex-col items-center justify-center py-24 text-white/30">
                <Shirt className="h-10 w-10 mb-3" />
                <p className="text-sm mb-1">No items yet.</p>
                <p className="text-xs">Go to <strong className="text-amber-400">/admin</strong> → Seed Marketplace to load the catalogue.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {(publicItems as any[]).map((item) => (
                  <div key={item.id} className="rounded-xl border border-amber-500/20 glass-card/[0.03] hover:glass-card/[0.06] hover:border-amber-500/25 transition-all overflow-hidden group cursor-pointer hover:shadow-amber-500/20 transition-shadow">
                    <div className="aspect-square bg-white/5 overflow-hidden">
                      {item.primaryImageUrl ? (
                        <img src={item.primaryImageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><Shirt className="h-8 w-8 text-white/20" /></div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-xs font-semibold line-clamp-2 leading-snug mb-1">{item.name}</p>
                      <p className="text-[10px] text-white/40 capitalize mb-2">{item.subcategory || item.category}</p>
                      {item.retailPriceAud && (
                        <p className="text-amber-400 text-xs font-bold">A${(item.retailPriceAud / 100).toFixed(2)}<span className="text-white/30 font-normal ml-1">/ day</span></p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-amber-500/20 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLocation("/designer-wardrobe")}
            className="text-white/40 hover:text-white transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2.5">
            <img src={LOGO_URL} alt="Virelle Studios" className="h-7 w-7 rounded object-contain" onError={(e) => (e.currentTarget.style.display = "none")} />
            <span className="text-sm font-black tracking-tighter uppercase italic">
              Virelle <span className="text-amber-400">Studios</span>
            </span>
          </div>
          <span className="text-white/30 text-sm hidden sm:block">/ Designer Studio</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setLocation("/wardrobe-marketplace")}
          className="border-amber-500/20 text-white/70 hover:bg-white/5"
        >
          <Store className="h-3.5 w-3.5 mr-1.5" />
          Marketplace
        </Button>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Brand Header */}
        <div className="gold-glow glass-card/3 border border-amber-500/20 rounded-2xl p-6 flex items-center gap-4 hover:shadow-amber-500/20 transition-shadow">
          {profile?.logoUrl ? (
            <img src={profile.logoUrl} alt={profile.brandName} className="w-14 h-14 rounded-full object-cover border border-amber-500/20" />
          ) : (
            <div className="w-14 h-14 rounded-full glass-card/10 flex items-center justify-center border border-amber-500/20 hover:shadow-amber-500/20 transition-shadow">
              <Shirt className="h-7 w-7 text-white/30" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-black tracking-tight truncate text-gold-shimmer">{profile?.brandName ?? "My Brand"}</h1>
            {profile?.displayName && <p className="text-sm text-white/50">{profile.displayName}</p>}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation("/designer-wardrobe")}
            className="border-amber-500/20 text-white/70 hover:glass-card/5 hidden sm:flex hover:shadow-amber-500/20 transition-shadow"
          >
            <Pencil className="h-3.5 w-3.5 mr-1.5" />
            Edit Profile
          </Button>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Membership */}
          <div className="glass-card/3 border border-amber-500/20 rounded-2xl p-4 space-y-2 hover:shadow-amber-500/20 transition-shadow">
            <p className="text-xs text-white/40 font-medium uppercase tracking-wider">Membership</p>
            <StatusBadge status={membership?.status ?? "none"} />
            {membership?.expiresAt && (
              <p className="text-xs text-white/30">
                Renews {new Date(membership.expiresAt).toLocaleDateString("en-AU", { month: "short", day: "numeric", year: "numeric" })}
              </p>
            )}
          </div>

          {/* Payouts */}
          <div className="glass-card/3 border border-amber-500/20 rounded-2xl p-4 space-y-2 hover:shadow-amber-500/20 transition-shadow">
            <p className="text-xs text-white/40 font-medium uppercase tracking-wider">Payouts</p>
            {connectLoading ? (
              <Skeleton className="h-5 w-24 bg-white/5" />
            ) : isConnected ? (
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Connected
              </Badge>
            ) : (
              <div className="space-y-2">
                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                  <AlertCircle className="h-3 w-3 mr-1" /> Not set up
                </Badge>
                <Button
                  size="sm"
                  onClick={() =>
                    onboardMut.mutate({
                      returnUrl: `${window.location.origin}/designer/studio?connect=done`,
                      refreshUrl: `${window.location.origin}/designer/studio?connect=refresh`,
                    })
                  }
                  disabled={onboardMut.isPending}
                  className="w-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 text-xs h-7"
                >
                  {onboardMut.isPending ? <Loader2 className="h-3 w-3 animate-spin text-amber-400" /> : <><Wallet className="h-3 w-3 mr-1" />Set up</>}
                </Button>
              </div>
            )}
          </div>

          {/* Earnings */}
          <div className="glass-card/3 border border-amber-500/20 rounded-2xl p-4 space-y-2 hover:shadow-amber-500/20 transition-shadow">
            <p className="text-xs text-white/40 font-medium uppercase tracking-wider">Your Earnings</p>
            <p className="text-2xl font-black text-amber-400">
              A${earnings?.totalEarnedDisplay ?? "0.00"}
            </p>
            <p className="text-xs text-white/30">{earnings?.leaseCount ?? 0} active leases</p>
          </div>
        </div>

        {/* Collections */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black tracking-tight flex items-center gap-2 gradient-text-gold">
              <Package className="h-5 w-5 text-amber-400" />
              Your Collections
            </h2>
            <Button
              size="sm"
              onClick={() => setLocation("/designer-wardrobe")}
              variant="outline"
              className="border-amber-500/20 text-white/70 hover:bg-white/5"
            >
              Manage in Wardrobe
            </Button>
          </div>

          {collections.length === 0 ? (
            <div className="glass-card/3 border border-amber-500/20 rounded-2xl p-10 text-center hover:shadow-amber-500/20 transition-shadow">
              <Package className="h-10 w-10 text-white/20 mx-auto mb-3" />
              <p className="text-white/40 text-sm mb-3">No collections yet.</p>
              <Button
                size="sm"
                onClick={() => setLocation("/designer-wardrobe")}
                className="bg-amber-500 hover:bg-amber-600 text-black font-bold"
              >
                Create a Collection
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {collections.map((col: any) => (
                <div
                  key={col.id}
                  className="glass-card/3 border border-amber-500/20 rounded-xl p-4 flex items-center gap-3 hover:shadow-amber-500/20 transition-shadow"
                >
                  {col.coverImageUrl ? (
                    <img src={col.coverImageUrl} alt={col.name} className="w-12 h-12 rounded-lg object-cover shrink-0 border border-amber-500/20" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg glass-card/5 flex items-center justify-center shrink-0">
                      <Package className="h-5 w-5 text-white/20" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{col.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {col.published ? (
                        <Badge className="bg-green-500/15 text-green-400 border-green-500/25 text-[10px] py-0 px-1.5">
                          <Eye className="h-2.5 w-2.5 mr-1" /> Live
                        </Badge>
                      ) : (
                        <Badge className="bg-white/5 text-white/40 border-amber-500/20 text-[10px] py-0 px-1.5">
                          <EyeOff className="h-2.5 w-2.5 mr-1" /> Draft
                        </Badge>
                      )}
                      {col.collectionPriceAud ? (
                        <span className="text-[10px] text-amber-400/70">
                          Bundle: A${(col.collectionPriceAud / 100).toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-[10px] text-white/30">No bundle price</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Pricing button */}
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-amber-500/20 text-white/60 hover:bg-white/5 text-xs h-7 px-2 hover:border-amber-500/50 hover:text-amber-400"
                      onClick={() =>
                        setPricingDialog({
                          open: true,
                          type: "collection",
                          id: col.id,
                          title: col.name,
                          lease: col.collectionPriceAud,
                        })
                      }
                    >
                      <Tag className="h-3 w-3 mr-1" />
                      Price
                    </Button>

                    {/* Publish toggle */}
                    <div className="flex items-center gap-1.5">
                      <Switch
                        checked={!!col.published}
                        onCheckedChange={(v) =>
                          publishMut.mutate({ collectionId: col.id, published: v })
                        }
                        disabled={publishMut.isPending}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tips */}
        <div className="bg-amber-500/5 border border-amber-500/15 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-amber-400 mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Tips to maximise earnings
          </h3>
          <ul className="space-y-1.5 text-xs text-white/60">
            <li>• Set retail prices on individual items — we'll suggest a lease price at ~2% of retail.</li>
            <li>• Offer a bundle price on full collections to attract productions leasing entire looks.</li>
            <li>• Set up your Stripe Connect account so you receive payouts instantly.</li>
            <li>• Add high-quality photos and detailed descriptions to each item.</li>
            <li>• Keep collections organised by era, style, or genre for easier discovery.</li>
          </ul>
        </div>
      </main>

      {/* Pricing Dialog */}
      {pricingDialog && (
        <PriceDialog
          open={pricingDialog.open}
          onClose={() => setPricingDialog(null)}
          title={pricingDialog.title}
          retailPrice={pricingDialog.retail}
          leasePrice={pricingDialog.lease}
          isCollection={pricingDialog.type === "collection"}
          onSave={(retail, lease) => {
            if (pricingDialog.type === "collection") {
              setColPricingMut.mutate({ collectionId: pricingDialog.id, collectionPriceAud: lease });
            } else {
              setItemPricingMut.mutate({ itemId: pricingDialog.id, retailPriceAud: retail, leasePriceAud: lease });
            }
          }}
        />
      )}
    </div>
  );
}
