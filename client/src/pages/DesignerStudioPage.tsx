/**
 * DesignerStudioPage.tsx — v7.0
 *
 * Designer dashboard: membership status, Stripe Connect payouts,
 * collection management (publish/unpublish, pricing), and earnings overview.
 */
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
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

const LOGO_URL = "https://storage.googleapis.com/virelle-assets/virelle-logo.png";

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
    <Badge className="bg-white/5 text-white/40 border-white/15">
      <XCircle className="h-3 w-3 mr-1" /> Inactive
    </Badge>
  );
}

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
  const suggestedLease = parseFloat(retail) * 0.02;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-zinc-900 border-white/15 text-white max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">Set Pricing</DialogTitle>
          <p className="text-xs text-white/50 mt-0.5 truncate">{title}</p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {!isCollection && (
            <div>
              <Label className="text-xs text-white/70 mb-1 block">Real-world Retail Value (A$)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">$</span>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={retail}
                  onChange={(e) => setRetail(e.target.value)}
                  className="pl-7 bg-white/5 border-white/15 text-white"
                  placeholder="0.00"
                />
              </div>
              <p className="text-xs text-white/30 mt-1">Used to suggest a lease price (~2% of retail)</p>
            </div>
          )}

          <div>
            <Label className="text-xs text-white/70 mb-1 block">
              {isCollection ? "Collection Bundle Price (A$)" : "Lease Price per Item (A$)"}
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">$</span>
              <Input
                type="number"
                min="0.50"
                step="0.50"
                value={lease}
                onChange={(e) => setLease(e.target.value)}
                className="pl-7 bg-white/5 border-white/15 text-white"
                placeholder="0.00"
              />
            </div>
            {!isCollection && suggestedLease > 0 && (
              <button
                type="button"
                onClick={() => setLease(suggestedLease.toFixed(2))}
                className="text-xs text-amber-400/70 hover:text-amber-400 mt-1 transition-colors"
              >
                Use suggested: A${suggestedLease.toFixed(2)} (2% of retail)
              </button>
            )}
            <p className="text-xs text-white/30 mt-1">
              You receive {isCollection ? "95% = A$" : "95% = A$"}
              {((parseFloat(lease || "0") * 0.95) || 0).toFixed(2)} per lease
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-white/15 text-white/70 hover:bg-white/5">
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

  const isMember = membership?.status === "active";
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

  if (!isMember) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-4">
        <Store className="h-12 w-12 text-amber-400 mb-4" />
        <h1 className="text-2xl font-black mb-2">Designer Studio</h1>
        <p className="text-white/50 text-sm mb-6 text-center max-w-sm">
          You need an active designer membership to access this page.
        </p>
        <Button
          onClick={() => setLocation("/designer-register")}
          className="bg-amber-500 hover:bg-amber-600 text-black font-bold"
        >
          Join as Designer — A$299/yr
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
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
          className="border-white/15 text-white/70 hover:bg-white/5"
        >
          <Store className="h-3.5 w-3.5 mr-1.5" />
          Marketplace
        </Button>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Brand Header */}
        <div className="bg-white/3 border border-white/10 rounded-2xl p-6 flex items-center gap-4">
          {profile?.logoUrl ? (
            <img src={profile.logoUrl} alt={profile.brandName} className="w-14 h-14 rounded-full object-cover border border-white/15" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center border border-white/15">
              <Shirt className="h-7 w-7 text-white/30" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-black tracking-tight truncate">{profile?.brandName ?? "My Brand"}</h1>
            {profile?.displayName && <p className="text-sm text-white/50">{profile.displayName}</p>}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation("/designer-wardrobe")}
            className="border-white/15 text-white/70 hover:bg-white/5 hidden sm:flex"
          >
            <Pencil className="h-3.5 w-3.5 mr-1.5" />
            Edit Profile
          </Button>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Membership */}
          <div className="bg-white/3 border border-white/10 rounded-2xl p-4 space-y-2">
            <p className="text-xs text-white/40 font-medium uppercase tracking-wider">Membership</p>
            <StatusBadge status={membership?.status ?? "none"} />
            {membership?.expiresAt && (
              <p className="text-xs text-white/30">
                Renews {new Date(membership.expiresAt).toLocaleDateString("en-AU", { month: "short", day: "numeric", year: "numeric" })}
              </p>
            )}
          </div>

          {/* Payouts */}
          <div className="bg-white/3 border border-white/10 rounded-2xl p-4 space-y-2">
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
                  {onboardMut.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Wallet className="h-3 w-3 mr-1" />Set up</>}
                </Button>
              </div>
            )}
          </div>

          {/* Earnings */}
          <div className="bg-white/3 border border-white/10 rounded-2xl p-4 space-y-2">
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
            <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
              <Package className="h-5 w-5 text-amber-400" />
              Your Collections
            </h2>
            <Button
              size="sm"
              onClick={() => setLocation("/designer-wardrobe")}
              variant="outline"
              className="border-white/15 text-white/70 hover:bg-white/5"
            >
              Manage in Wardrobe
            </Button>
          </div>

          {collections.length === 0 ? (
            <div className="bg-white/3 border border-white/10 rounded-2xl p-10 text-center">
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
                  className="bg-white/3 border border-white/10 rounded-xl p-4 flex items-center gap-3"
                >
                  {col.coverImageUrl ? (
                    <img src={col.coverImageUrl} alt={col.name} className="w-12 h-12 rounded-lg object-cover shrink-0 border border-white/10" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
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
                        <Badge className="bg-white/5 text-white/40 border-white/10 text-[10px] py-0 px-1.5">
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
                      className="border-white/15 text-white/60 hover:bg-white/5 text-xs h-7 px-2"
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
