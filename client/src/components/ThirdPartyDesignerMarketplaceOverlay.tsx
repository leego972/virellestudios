import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import WardrobePurchaseChoiceDialog from "@/components/WardrobePurchaseChoiceDialog";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, CheckCircle2, Loader2, Package, Shirt, Store } from "lucide-react";
import { toast } from "sonner";

function money(cents: number | null | undefined) {
  return `A$${(Number(cents ?? 0) / 100).toFixed(2)}`;
}

export default function ThirdPartyDesignerMarketplaceOverlay() {
  const path = typeof window === "undefined" ? "" : window.location.pathname;
  const match = path.match(/^\/wardrobe-marketplace\/designer\/(\d+)\/?$/);
  const designerId = match ? Number(match[1]) : 0;
  const [purchaseItem, setPurchaseItem] = useState<any | null>(null);

  const designerQ = trpc.wardrobeMarket.marketplace.getDesigner.useQuery(
    { id: designerId },
    { enabled: designerId > 0, retry: false },
  );
  const confirmPurchase = trpc.wardrobeMarket.commercePurchase.confirm.useMutation({
    onSuccess: (result) => {
      const physical = result.purchaseMode === "physical";
      toast.success(physical
        ? "Physical order confirmed. A virtual copy is also in your Virelle inventory."
        : "Virtual item added permanently to your Virelle inventory.");
      window.history.replaceState({}, "", path);
    },
    onError: (error) => toast.error(error.message),
  });

  useEffect(() => {
    if (!designerId) return;
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("purchase_session");
    const cancelled = params.get("purchase_cancelled");
    if (sessionId) confirmPurchase.mutate({ sessionId });
    else if (cancelled) {
      toast.info("Checkout cancelled — no charge was made.");
      window.history.replaceState({}, "", path);
    }
  }, [designerId]);

  const data = designerQ.data as any;
  const brandName = String(data?.profile?.brandName ?? "").trim().toLowerCase();
  const isLamalo = brandName === "lamalo fashion" || brandName === "lamalo fashions" || brandName === "lamalo";
  const items = useMemo(() => (data?.collections ?? []).flatMap((collection: any) =>
    (collection.items ?? []).map((item: any) => ({ ...item, collectionName: collection.name }))), [data]);

  if (!designerId || isLamalo) return null;

  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-black text-white">
      <WardrobePurchaseChoiceDialog
        item={purchaseItem}
        returnUrl={`${window.location.origin}${path}`}
        onClose={() => setPurchaseItem(null)}
      />

      <header className="sticky top-0 z-20 border-b border-amber-500/20 bg-black/95 backdrop-blur-xl px-4 sm:px-6 py-4 flex items-center gap-3">
        <button onClick={() => { window.location.href = "/wardrobe-marketplace"; }} className="text-white/45 hover:text-white">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <img src="/virelle-logo-square.png" alt="Virelle Studios" className="h-8 w-8 rounded-lg" />
        <div><p className="text-sm font-black gradient-text-gold">Designer item listings</p><p className="text-[10px] text-white/35">Virtual licensing and live-item delivery</p></div>
        <div className="ml-auto hidden sm:flex items-center gap-2 text-[11px] text-white/40">
          <Store className="h-3.5 w-3.5 text-amber-400" /> 95% designer payout · 5% Virelle commission
        </div>
      </header>

      {designerQ.isLoading ? (
        <div className="min-h-[70vh] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-amber-400" /></div>
      ) : !data ? (
        <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3"><Store className="h-12 w-12 text-white/15" /><p className="text-white/45">Designer not found or not publicly listed.</p></div>
      ) : (
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
          <section className="rounded-3xl border border-amber-500/25 bg-gradient-to-br from-amber-950/25 to-white/[0.02] p-6 sm:p-8 flex flex-col sm:flex-row gap-5 mb-10">
            {data.profile.logoUrl ? <img src={data.profile.logoUrl} alt={data.profile.brandName} className="h-24 w-24 rounded-2xl object-cover border border-amber-500/25" /> : <div className="h-24 w-24 rounded-2xl border border-amber-500/25 bg-white/5 flex items-center justify-center"><Shirt className="h-10 w-10 text-white/20" /></div>}
            <div className="flex-1"><div className="flex items-center gap-2 flex-wrap"><h1 className="text-3xl font-black text-gold-shimmer">{data.profile.brandName}</h1>{Boolean(data.profile.verified) && <Badge className="bg-emerald-500/15 text-emerald-200 border border-emerald-400/30"><CheckCircle2 className="h-3 w-3 mr-1" />Verified</Badge>}</div><p className="text-sm text-white/50 mt-3 max-w-2xl">{data.profile.bio || "Independent designer marketplace collection."}</p><p className="text-xs text-white/30 mt-3">Virtual purchases are copied permanently into the buyer's Virelle wardrobe inventory. Physical purchases also include the same virtual copy.</p></div>
          </section>

          <div className="flex items-end justify-between gap-3 mb-5"><div><h2 className="text-xl font-black gradient-text-gold">Available items</h2><p className="text-xs text-white/35 mt-1">Prices shown in Australian dollars.</p></div><Badge variant="outline" className="border-amber-500/30 text-amber-300">{items.length} items</Badge></div>

          {items.length === 0 ? (
            <div className="rounded-2xl border border-white/10 p-12 text-center"><Package className="h-10 w-10 text-white/15 mx-auto mb-3" /><p className="text-white/40">No purchasable items are currently published.</p></div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {items.map((item: any) => (
                <article key={item.id} className="rounded-2xl overflow-hidden border border-amber-500/20 bg-white/[0.025] flex flex-col">
                  <div className="aspect-[4/5] bg-black overflow-hidden">{item.primaryImageUrl ? <img src={item.primaryImageUrl} alt={item.name} className="h-full w-full object-cover" /> : <div className="h-full flex items-center justify-center"><Shirt className="h-12 w-12 text-white/10" /></div>}</div>
                  <div className="p-4 flex flex-col flex-1">
                    <p className="font-bold text-sm line-clamp-1">{item.name}</p>
                    <p className="text-[11px] text-white/35 mt-1 line-clamp-2">{item.description}</p>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      <Badge className="bg-purple-500/15 text-purple-200 border border-purple-400/30 text-[9px]">Virtual item · {money(item.retailPriceAud)}</Badge>
                      {!Boolean(item.isVirtualOnly) && Number(item.physicalRetailPriceAud ?? 0) > 0 && <Badge className="bg-emerald-500/15 text-emerald-200 border border-emerald-400/30 text-[9px]">Live item · {money(item.physicalRetailPriceAud)}</Badge>}
                    </div>
                    <Button onClick={() => setPurchaseItem(item)} className="mt-4 bg-amber-500 hover:bg-amber-400 text-black font-black">Purchase</Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </main>
      )}
    </div>
  );
}
