/**
   * UserInventoryPage.tsx
   * Shows all active wardrobe leases for the signed-in user.
   * Items / collections appear here after a successful Stripe Checkout on the Wardrobe Marketplace.
   */
  import { useLocation } from "wouter";
  import { trpc } from "@/lib/trpc";
  import { Button } from "@/components/ui/button";
  import { Badge } from "@/components/ui/badge";
  import { Skeleton } from "@/components/ui/skeleton";
  import {
    Package,
    Shirt,
    ArrowRight,
    ShoppingBag,
    Calendar,
    CheckCircle2,
  } from "lucide-react";

  function timeAgo(date: string | Date | null) {
    if (!date) return "";
    const now = new Date();
    const d = new Date(date);
    const days = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (days === 0) return "today";
    if (days === 1) return "yesterday";
    if (days < 30) return `${days}d ago`;
    return d.toLocaleDateString();
  }

  export default function UserInventoryPage() {
    const [, setLocation] = useLocation();

    const { data: leases, isLoading } = trpc.wardrobeMarket.leasing.myInventory.useQuery();

    const active = (leases ?? []).filter((l: any) => l.status === "active");
    const items   = active.filter((l: any) => l.leaseType === "item");
    const collections = active.filter((l: any) => l.leaseType === "collection");

    return (
      <div className="min-h-screen bg-background text-foreground">
        {/* Header */}
        <div className="border-b border-border px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package className="h-5 w-5 text-amber-400" />
            <div>
              <h1 className="text-base font-bold">My Wardrobe Inventory</h1>
              <p className="text-xs text-muted-foreground">Leased items and collections available for your productions</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setLocation("/wardrobe-marketplace")}
            className="border-amber-500/30 text-amber-500 hover:bg-amber-500/10 gap-1.5"
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            Browse Marketplace
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-8 space-y-10">

          {isLoading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          )}

          {!isLoading && active.length === 0 && (
            <div className="text-center py-24 space-y-4">
              <Package className="h-12 w-12 text-muted-foreground/20 mx-auto" />
              <div>
                <p className="font-semibold text-muted-foreground">No leased items yet</p>
                <p className="text-sm text-muted-foreground/60 mt-1 max-w-xs mx-auto">
                  Browse the marketplace and lease fashion or costume collections — they'll appear here instantly after payment.
                </p>
              </div>
              <Button onClick={() => setLocation("/wardrobe-marketplace")} className="bg-amber-500 hover:bg-amber-600 text-black font-bold gap-1.5">
                <ShoppingBag className="h-4 w-4" />
                Browse Wardrobe Marketplace
              </Button>
            </div>
          )}

          {/* Collections */}
          {collections.length > 0 && (
            <section>
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                <Package className="h-4 w-4" />
                Leased Collections ({collections.length})
              </h2>
              <div className="space-y-3">
                {collections.map((lease: any) => (
                  <div
                    key={lease.id}
                    className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card/60 hover:border-amber-500/20 transition-colors"
                  >
                    <div className="h-14 w-20 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                      <Package className="h-6 w-6 text-muted-foreground/30" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">Collection #{lease.collectionId}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px] border-green-500/30 text-green-500 gap-1 px-1.5">
                          <CheckCircle2 className="h-2.5 w-2.5" /> Active
                        </Badge>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-2.5 w-2.5" />
                          Leased {timeAgo(lease.createdAt)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-amber-400">
                        A${((lease.amountPaidAud ?? 0) / 100).toFixed(2)}
                      </p>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs mt-1 text-muted-foreground hover:text-foreground"
                        onClick={() => lease.designerProfileId && setLocation(`/wardrobe-marketplace/designer/${lease.designerProfileId}`)}
                      >
                        View <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Individual Items */}
          {items.length > 0 && (
            <section>
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                <Shirt className="h-4 w-4" />
                Leased Items ({items.length})
              </h2>
              <div className="space-y-3">
                {items.map((lease: any) => (
                  <div
                    key={lease.id}
                    className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card/60 hover:border-amber-500/20 transition-colors"
                  >
                    <div className="h-14 w-14 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                      <Shirt className="h-6 w-6 text-muted-foreground/30" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">Item #{lease.wardrobeItemId}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px] border-green-500/30 text-green-500 gap-1 px-1.5">
                          <CheckCircle2 className="h-2.5 w-2.5" /> Active
                        </Badge>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-2.5 w-2.5" />
                          Leased {timeAgo(lease.createdAt)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-amber-400">
                        A${((lease.amountPaidAud ?? 0) / 100).toFixed(2)}
                      </p>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs mt-1 text-muted-foreground hover:text-foreground"
                        onClick={() => lease.designerProfileId && setLocation(`/wardrobe-marketplace/designer/${lease.designerProfileId}`)}
                      >
                        View <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Footer hint */}
          {active.length > 0 && (
            <p className="text-center text-xs text-muted-foreground/50 pb-4">
              Leased items are automatically available for character wardrobe assignment in your productions.
            </p>
          )}
        </div>
      </div>
    );
  }
  