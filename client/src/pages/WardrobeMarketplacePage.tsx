/**
 * WardrobeMarketplacePage.tsx — v8.1  "Lamalo Fashions by Virelle Studios"
 *
 * Routes:
 *   /wardrobe-marketplace              → hero + designer grid
 *   /wardrobe-marketplace/designer/:id → designer profile + collections + items
 *
 * v8.1 adds: "Order Custom Item" flow (describe → A$4.99 → AI generation → inventory)
 */
import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Store, Search, Shirt, Sparkles, ArrowRight, Package,
  Users, Building2, ChevronLeft, Tag, CheckCircle2,
  Loader2, ShieldCheck, Zap, Film, Lock, Wand2, X,
  ImagePlus, ClipboardList, Clock, CheckCheck, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

const LOGO_URL =
  "https://files.manuscdn.com/user_upload_by_module/session_file/310519663418605762/hxRQQgsmyjgcByim.png";

const PROFILE_TYPE_LABELS: Record<string, string> = {
  designer: "Fashion Designer",
  costume_designer: "Costume Designer",
  stylist: "Stylist",
  wardrobe_department: "Wardrobe Dept",
  brand: "Brand",
  production_designer: "Production Designer",
  other: "Designer",
};

// ─── Shared page header ───────────────────────────────────────────────────────

function PageHeader({ onBack, crumb }: { onBack?: () => void; crumb?: string }) {
  const [, setLocation] = useLocation();
  return (
    <header className="border-b border-white/10 px-4 sm:px-6 py-4 flex items-center gap-3 sticky top-0 bg-black/95 backdrop-blur-md z-20">
      {onBack && (
        <button onClick={onBack} className="text-white/40 hover:text-white transition-colors">
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}
      <button onClick={() => setLocation("/")} className="flex items-center gap-2.5">
        <img src={LOGO_URL} alt="Virelle Studios" className="h-7 w-7 rounded object-contain" />
        <span className="text-sm font-black tracking-tighter uppercase italic text-white">
          Virelle <span className="text-amber-400">Studios</span>
        </span>
      </button>
      <span className="text-white/25 text-xs hidden sm:block">
        {crumb ? `/ Lamalo Fashions / ${crumb}` : "/ Lamalo Fashions"}
      </span>
      <div className="ml-auto flex items-center gap-2">
        <Button
          variant="outline" size="sm"
          onClick={() => setLocation("/designer-register")}
          className="border-amber-500/40 text-amber-400 hover:bg-amber-500/10 hidden sm:flex text-xs h-8"
        >
          <Store className="h-3.5 w-3.5 mr-1.5" /> List Your Designs
        </Button>

      </div>
    </header>
  );
}

// ─── Why Lamalo? value props ──────────────────────────────────────────────────

function ValueProps() {
  const cards = [
    {
      icon: Lock,
      title: "Costume Lock — outfit stays locked across every scene",
      body: "Assign an item to a character and our pipeline embeds a Costume Lock into every generation call. Scene 1 to scene 90 — same jacket, same colour, same fit. No drift. No re-prompting.",
      border: "border-amber-500/20",
      iconBg: "bg-amber-500/10 text-amber-400",
    },
    {
      icon: Film,
      title: "Zero colour drift — each shade is a separate item",
      body: "Generic AI treats \"red jacket\" as open to interpretation — and it drifts. Every Lamalo colour variant is a distinct catalogue entry with its own locked reference prompt, so the model renders exactly what you chose.",
      border: "border-purple-500/20",
      iconBg: "bg-purple-500/10 text-purple-400",
    },
    {
      icon: Zap,
      title: "Buy once, use across every project forever",
      body: "Purchase an item for 30¢ and it lives in your wardrobe inventory permanently. Assign it to characters in any current or future project without ever repurchasing.",
      border: "border-blue-500/20",
      iconBg: "bg-blue-500/10 text-blue-400",
    },
    {
      icon: ShieldCheck,
      title: "Every designer goes through the same pipeline",
      body: "Third-party collections on this marketplace are run through the same Costume Lock optimisation — reference prompt calibration, colour separation, continuity integration. Premium results regardless of whose label it is.",
      border: "border-emerald-500/20",
      iconBg: "bg-emerald-500/10 text-emerald-400",
    },
  ];

  return (
    <section className="border-b border-white/10 bg-black py-14 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <p className="text-center text-[11px] font-black uppercase tracking-widest text-amber-500/60 mb-8">
          Why Lamalo beats describing clothes in your prompt
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <div key={c.title} className={`rounded-2xl border ${c.border} bg-white/[0.02] p-5`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-4 ${c.iconBg}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-bold text-white mb-2">{c.title}</h3>
                <p className="text-xs text-white/45 leading-relaxed">{c.body}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── Custom Order Modal ───────────────────────────────────────────────────────

type OrderTab = "order" | "orders";

function CustomOrderModal({
  open,
  onClose,
  onOpen,
  returnUrl,
}: {
  open: boolean;
  onClose: () => void;
  onOpen?: () => void;
  returnUrl: string;
}) {
  const [tab, setTab] = useState<OrderTab>("order");
  const [description, setDescription] = useState("");
  const [refImageUrl, setRefImageUrl] = useState("");
  const [characterId, setCharacterId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const checkoutMut = trpc.wardrobeMarket.customItem.checkout.useMutation({
    onSuccess: (res) => {
      if (res.checkoutUrl) window.location.href = res.checkoutUrl;
    },
    onError: (e) => {
      toast.error(e.message || "Could not start checkout. Please sign in first.");
      setIsSubmitting(false);
    },
  });

  const { data: myOrders, isLoading: ordersLoading, refetch: refetchOrders } =
    trpc.wardrobeMarket.customItem.getMyOrders.useQuery(undefined, {
      enabled: open && tab === "orders",
    });
  const { data: myCharacters } =
    trpc.wardrobeMarket.customItem.getMyCharacters.useQuery(undefined, {
      enabled: open,
    });

  // Reset form when modal is closed
  useEffect(() => {
    if (!open) {
      setDescription("");
      setRefImageUrl("");
      setCharacterId(null);
      setIsSubmitting(false);
    }
  }, [open]);


  function handleSubmit() {
    if (description.trim().length < 5) {
      toast.error("Please describe the item in at least a few words.");
      return;
    }
    setIsSubmitting(true);
    checkoutMut.mutate({
      description: description.trim(),
      referenceImageUrl: refImageUrl.trim() || undefined,
      characterId: characterId ?? undefined,
      returnUrl,
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[#0a0a0a] border border-white/15 rounded-3xl overflow-hidden shadow-2xl shadow-black/60 flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
              <Wand2 className="h-4.5 w-4.5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-black text-white gradient-text-gold">Order Custom Item</h2>
              <p className="text-[11px] text-white/35">AI-generated · Permanently yours · A$4.99</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10 shrink-0">
          {[
            { key: "order" as OrderTab,  label: "New Order",   icon: Wand2        },
            { key: "orders" as OrderTab, label: "My Orders",   icon: ClipboardList },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold transition-colors ${
                tab === key
                  ? "text-amber-400 border-b-2 border-amber-400"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1">

          {/* ─ New Order tab ─ */}
          {tab === "order" && (
            <div className="p-6 space-y-5">

              {/* What you get */}
              <div className="rounded-2xl bg-amber-500/[0.06] border border-amber-500/20 p-4 space-y-2">
                <p className="text-xs font-black text-amber-400 uppercase tracking-widest mb-1">What you get for A$4.99</p>
                {[
                  "AI generates a professional fashion reference image from your description",
                  "Costume Lock calibrated — item stays consistent across every scene",
                  "Added permanently to your wardrobe inventory — use across all projects",
                  "Yours exclusively — not listed in any public marketplace",
                ].map((pt) => (
                  <div key={pt} className="flex items-start gap-2">
                    <CheckCheck className="h-3.5 w-3.5 text-amber-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-white/65 leading-relaxed">{pt}</p>
                  </div>
                ))}
                <p className="text-[10px] text-white/25 pt-1 border-t border-white/10 mt-2">
                  vs Adobe Firefly ~A$35/mo · Midjourney ~A$15/mo · Human illustrator A$50–200+ per drawing
                </p>
              </div>

              {/* Character picker */}
                {myCharacters && myCharacters.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/60 uppercase tracking-widest">
                      Who wears this? <span className="text-white/30 font-normal normal-case">(optional — guides the AI)</span>
                    </label>
                    <select
                      value={characterId ?? ""}
                      onChange={e => setCharacterId(e.target.value ? Number(e.target.value) : null)}
                      className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/50 appearance-none"
                    >
                      <option value="">No specific character — standalone item</option>
                      {(myCharacters ?? []).map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    {characterId && (() => {
                      const ch = myCharacters.find(c => c.id === characterId);
                      return ch?.description ? (
                        <p className="text-[11px] text-white/35 leading-relaxed pl-1 truncate">
                          {ch.description.slice(0, 120)}
                        </p>
                      ) : null;
                    })()}
                  </div>
                )}

                {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-white/70">
                  Describe your item <span className="text-amber-400">*</span>
                </label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. A fitted black leather biker jacket with silver zips, moto collar, and quilted shoulder panels. Slim cut, waist length."
                  className="bg-white/5 border-white/15 text-white placeholder-white/25 text-sm resize-none h-28 focus:border-amber-500/50"
                  maxLength={1000}
                />
                <p className="text-[10px] text-white/25 text-right">{description.length}/1000</p>
              </div>

              {/* Reference image */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-white/70 flex items-center gap-1.5">
                  <ImagePlus className="h-3.5 w-3.5" />
                  Reference image URL <span className="text-white/30 font-normal">(optional)</span>
                </label>
                <Input
                  value={refImageUrl}
                  onChange={(e) => setRefImageUrl(e.target.value)}
                  placeholder="https://example.com/jacket-reference.jpg"
                  className="bg-white/5 border-white/15 text-white placeholder-white/25 text-sm h-10 focus:border-amber-500/50"
                />
                <p className="text-[10px] text-white/30 leading-relaxed">
                  Paste a direct image URL of a similar garment for visual reference. The AI will use it to anchor colours, silhouette, and style.
                </p>
              </div>

              {/* CTA */}
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || description.trim().length < 5}
                className="w-full h-12 bg-amber-500 hover:bg-amber-400 text-black font-black text-sm rounded-xl"
              >
                {isSubmitting ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Redirecting to checkout…</>
                ) : (
                  <><Wand2 className="h-4 w-4 mr-2" /> Order for A$4.99 → Checkout</>
                )}
              </Button>

              <p className="text-[10px] text-white/25 text-center">
                Secured by Stripe · No subscription · One-time charge · Generation begins after payment confirmation
              </p>
            </div>
          )}

          {/* ─ My Orders tab ─ */}
          {tab === "orders" && (
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-white/50">Your custom item history</p>
                <button onClick={() => refetchOrders()} className="text-[10px] text-amber-400 hover:text-amber-300">
                  Refresh
                </button>
              </div>

              {ordersLoading && (
                <div className="space-y-3">
                  {[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-xl bg-white/5" />)}
                </div>
              )}

              {!ordersLoading && (!myOrders || myOrders.length === 0) && (
                <div className="text-center py-10">
                  <ClipboardList className="h-10 w-10 text-white/15 mx-auto mb-3" />
                  <p className="text-sm text-white/30">No custom orders yet.</p>
                  <button onClick={() => setTab("order")} className="text-xs text-amber-400 mt-2 hover:underline">
                    Place your first order →
                  </button>
                </div>
              )}

              {!ordersLoading && myOrders && myOrders.length > 0 && (
                <div className="space-y-3">
                  {myOrders.map((order: any) => {
                    const statusIcon =
                      order.status === "completed"         ? <CheckCheck className="h-3.5 w-3.5 text-emerald-400" /> :
                      order.status === "pending_generation" ? <Loader2 className="h-3.5 w-3.5 text-amber-400 animate-spin" /> :
                      order.status === "failed"             ? <AlertCircle className="h-3.5 w-3.5 text-red-400" /> :
                                                              <Clock className="h-3.5 w-3.5 text-white/40" />;
                    const statusLabel =
                      order.status === "completed"          ? "Completed"         :
                      order.status === "pending_generation" ? "Generating…"       :
                      order.status === "pending_payment"    ? "Awaiting payment"  :
                                                              "Failed";
                    return (
                      <div key={order.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-4 flex gap-3">
                        {order.generatedImageUrl ? (
                          <img
                            src={order.generatedImageUrl}
                            alt="Generated"
                            className="w-16 h-16 rounded-lg object-cover border border-white/10 shrink-0"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                            <Shirt className="h-7 w-7 text-white/15" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-white line-clamp-2 leading-snug">
                            {order.description}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1.5">
                            {statusIcon}
                            <span className="text-[10px] text-white/40">{statusLabel}</span>
                          </div>
                          <p className="text-[10px] text-white/25 mt-1">
                            {new Date(order.createdAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                            {" · "}A${((order.priceAud ?? 499) / 100).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Single item card ─────────────────────────────────────────────────────────

function ItemCard({
  item,
  onBuy,
  isBuying,
}: {
  item: any;
  onBuy: () => void;
  isBuying: boolean;
}) {
  const [imgErr, setImgErr] = useState(false);
  const color = item.colors?.[0] ?? "";
  const baseName = item.name?.split(" — ")[0] ?? item.name;
  const cents = item.retailPriceAud ?? 30;
  const priceLabel = `A$${(cents / 100).toFixed(2)}`;

  return (
    <div className="group rounded-xl border border-white/8 hover:border-amber-500/30 bg-white/[0.02] hover:bg-white/[0.04] overflow-hidden transition-all duration-200 flex flex-col">
      <div className="relative h-36 bg-gradient-to-br from-white/5 to-black overflow-hidden">
        {item.primaryImageUrl && !imgErr ? (
          <img
            src={item.primaryImageUrl}
            alt={item.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImgErr(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Shirt className="h-10 w-10 text-white/10" />
          </div>
        )}
        {color && (
          <div className="absolute top-2 right-2">
            <span className="text-[9px] font-bold uppercase tracking-wider bg-black/70 backdrop-blur-sm border border-white/10 text-white/70 rounded-full px-2 py-0.5">
              {color}
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      </div>

      <div className="p-3 flex flex-col gap-2 flex-1">
        <div>
          <p className="text-xs font-bold text-white leading-tight line-clamp-1">{baseName}</p>
          {color && <p className="text-[10px] text-amber-400/70 mt-0.5">{color}</p>}
        </div>
        <div className="flex items-center justify-between mt-auto pt-1">
          <div className="flex items-center gap-1 text-amber-400">
            <Tag className="h-3 w-3" />
            <span className="text-xs font-black">{priceLabel}</span>
          </div>
          <Button
            size="sm"
            onClick={onBuy}
            disabled={isBuying}
            className="h-7 px-3 text-[10px] font-bold bg-amber-500 hover:bg-amber-400 text-black rounded-lg"
          >
            {isBuying ? <Loader2 className="h-3 w-3 animate-spin" /> : "Buy"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Collection accordion ─────────────────────────────────────────────────────

function CollectionBlock({
  col,
  onBuyItem,
  onBuyCollection,
  leasingId,
}: {
  col: any;
  onBuyItem: (id: number) => void;
  onBuyCollection: (id: number) => void;
  leasingId: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const items: any[] = col.items ?? [];
  const itemCount = items.length;
  const bundleCents = col.collectionPriceAud ?? Math.floor(itemCount * 30 * 0.85);
  const bundleLabel = `A$${(bundleCents / 100).toFixed(2)}`;
  const isBuyingCol = leasingId === `collection-${col.id}`;

  return (
    <div className="rounded-2xl border border-white/10 overflow-hidden">
      <div className="bg-white/[0.03] p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="text-base font-bold text-white">{col.name}</h3>
            {col.season && (
              <Badge variant="outline" className="border-white/15 text-white/40 text-[10px]">
                {col.season}
              </Badge>
            )}
          </div>
          {col.description && (
            <p className="text-xs text-white/45 line-clamp-2 leading-relaxed">{col.description}</p>
          )}
          <p className="text-[11px] text-white/30 mt-2">
            {itemCount} items · A$0.30 each · Bundle saves 15%
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <Button
            size="sm"
            onClick={() => onBuyCollection(col.id)}
            disabled={isBuyingCol}
            className="bg-amber-500 hover:bg-amber-400 text-black font-bold h-9 px-4 text-xs"
          >
            {isBuyingCol ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              `Buy all ${itemCount} — ${bundleLabel}`
            )}
          </Button>
          <button
            onClick={() => setExpanded((e) => !e)}
            className="h-9 px-3 rounded-lg border border-white/15 text-white/50 hover:text-white hover:border-white/30 text-xs font-semibold transition-all"
          >
            {expanded ? "Hide items" : `Browse ${itemCount} items`}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-white/8 p-4 bg-black">
          {items.length === 0 ? (
            <p className="text-xs text-white/30 text-center py-6">No items in this collection yet.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {items.map((item: any) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  onBuy={() => onBuyItem(item.id)}
                  isBuying={leasingId === `item-${item.id}`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Designer detail ──────────────────────────────────────────────────────────

function DesignerDetailView({ designerId }: { designerId: number }) {
  const [, setLocation] = useLocation();
  const [leasingId, setLeasingId] = useState<string | null>(null);
  const [showCustomOrder, setShowCustomOrder] = useState(false);

  const { data, isLoading } = trpc.wardrobeMarket.marketplace.getDesigner.useQuery(
    { id: designerId },
    { enabled: !!designerId },
  );

  const checkoutMut = trpc.wardrobeMarket.leasing.checkout.useMutation({
    onSuccess: (res) => {
      if (res.checkoutUrl) window.location.href = res.checkoutUrl;
    },
    onError: (e) => {
      toast.error(e.message || "Could not start checkout. Please sign in first.");
      setLeasingId(null);
    },
  });

  const confirmPurchase = trpc.wardrobeMarket.leasing.confirmLease.useMutation({
    onSuccess: () => {
      toast.success("Purchase complete! Items are now in your wardrobe inventory.");
      window.history.replaceState({}, "", window.location.pathname);
    },
    onError: (e) => toast.error(e.message),
  });

  const utils = trpc.useUtils();
  const confirmCustom = trpc.wardrobeMarket.customItem.confirmAndGenerate.useMutation({
    onSuccess: (res) => {
      if (res.alreadyProcessed) {
        toast.info("This item was already generated and is in your inventory.");
      } else {
        toast.success("Custom item generated and added to your wardrobe inventory!");
        utils.wardrobeMarket.customItem.getMyOrders.invalidate();
      }
      window.history.replaceState({}, "", window.location.pathname);
    },
    onError: (e) => toast.error(e.message),
  });

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const sid = p.get("purchase_session") ?? p.get("lease_session");
    const customSid = p.get("custom_session");
    const cancelled = p.get("purchase_cancelled") ?? p.get("lease_cancelled");
    const customCancelled = p.get("custom_cancelled");

    if (customSid) {
      toast.loading("Generating your custom item…", { id: "custom-gen" });
      confirmCustom.mutate(
        { sessionId: customSid },
        { onSettled: () => toast.dismiss("custom-gen") }
      );
    } else if (sid) {
      confirmPurchase.mutate({ sessionId: sid });
    } else if (cancelled || customCancelled) {
      toast.info("Checkout cancelled — no charge was made.");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  function handleBuy(type: "item" | "collection", id: number) {
    setLeasingId(`${type}-${id}`);
    checkoutMut.mutate({
      type,
      id,
      returnUrl: `${window.location.origin}/wardrobe-marketplace/designer/${designerId}`,
    });
  }

  const returnUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/wardrobe-marketplace/designer/${designerId}`;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4">
        <Store className="h-12 w-12 text-white/20" />
        <p className="text-white/50">Designer not found or profile is private.</p>
        <Button
          onClick={() => setLocation("/wardrobe-marketplace")}
          variant="outline"
          className="border-white/15 text-white/70"
        >
          Back to Lamalo Fashions
        </Button>
      </div>
    );
  }

  const { profile, collections } = data;
  const isLamalo = (profile as any).brandName === "Lamalo Fashion";

  return (
    <div className="min-h-screen bg-black text-white">
      <PageHeader
        onBack={() => setLocation("/wardrobe-marketplace")}
        crumb={(profile as any).brandName}
      />

      <CustomOrderModal
        open={showCustomOrder}
        onClose={() => setShowCustomOrder(false)}
        onOpen={() => setShowCustomOrder(true)}
        returnUrl={returnUrl}
      />

      <main className="max-w-5xl mx-auto px-4 py-10 space-y-8">

        {/* Profile hero */}
        <div className="flex items-start gap-5 p-6 rounded-2xl border border-white/8 bg-white/[0.02]">
          {(profile as any).logoUrl ? (
            <img
              src={(profile as any).logoUrl}
              alt={(profile as any).brandName}
              className="w-20 h-20 rounded-2xl object-cover border border-white/15 shrink-0"
            />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
              <Shirt className="h-9 w-9 text-white/25" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-2xl font-black tracking-tight gradient-text-gold">{(profile as any).brandName}</h1>
              {(profile as any).verified && (
                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Verified
                </Badge>
              )}
              {isLamalo && (
                <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs">
                  <Sparkles className="h-3 w-3 mr-1" /> In-House Label
                </Badge>
              )}
            </div>
            <Badge variant="outline" className="border-white/20 text-white/50 text-xs mb-2">
              {PROFILE_TYPE_LABELS[(profile as any).profileType] ?? "Designer"}
            </Badge>
            {(profile as any).bio && (
              <p className="text-sm text-white/55 leading-relaxed max-w-xl">{(profile as any).bio}</p>
            )}
            {isLamalo && (
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  "Costume Lock enabled",
                  "Zero colour drift",
                  "30¢ per item",
                  "Scene continuity built-in",
                ].map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-400/80 bg-amber-500/[0.08] border border-amber-500/20 rounded-full px-2.5 py-0.5"
                  >
                    <Sparkles className="h-2.5 w-2.5" /> {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ─── Custom Order CTA ─── */}
        <div className="rounded-2xl border border-amber-500/25 bg-gradient-to-r from-amber-950/30 to-black p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
            <Wand2 className="h-6 w-6 text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-black text-white mb-1">Can't find what you need?</h3>
            <p className="text-xs text-white/50 leading-relaxed max-w-lg">
              Order a custom AI-generated item — describe any garment or accessory, optionally add a reference photo, and our AI
              builds it to spec with Costume Lock applied. Permanently yours for <strong className="text-amber-400">A$4.99</strong>.
            </p>
            <p className="text-[10px] text-white/30 mt-1.5">
              vs Adobe Firefly A$35/mo · Midjourney A$15/mo · Human illustrator A$50–200+
            </p>
          </div>
          <Button
            onClick={() => setShowCustomOrder(true)}
            className="bg-amber-500 hover:bg-amber-400 text-black font-black h-11 px-6 shrink-0"
          >
            <Wand2 className="h-4 w-4 mr-2" /> Order Custom Item
          </Button>
        </div>

        {/* Value props strip — only for the in-house Lamalo label */}
        {isLamalo && <ValueProps />}

        {/* Collections */}
        <div>
          <h2 className="text-lg font-black tracking-tight mb-5 flex items-center gap-2 gradient-text-gold">
            <Package className="h-5 w-5 text-amber-400" />
            Collections
            <span className="text-sm font-normal text-white/30 ml-1">({collections.length})</span>
          </h2>

          {collections.length === 0 ? (
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-12 text-center">
              <Package className="h-10 w-10 text-white/20 mx-auto mb-3" />
              <p className="text-white/40 text-sm">No published collections yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {collections.map((col: any) => (
                <CollectionBlock
                  key={col.id}
                  col={col}
                  onBuyItem={(id) => handleBuy("item", id)}
                  onBuyCollection={(id) => handleBuy("collection", id)}
                  leasingId={leasingId}
                />
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-white/10 pt-8 text-center space-y-3">
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
  const isLamalo = profile.brandName === "Lamalo Fashion";
  return (
    <button
      onClick={onClick}
      className={`group text-left rounded-2xl overflow-hidden transition-all duration-200 border ${
        isLamalo
          ? "border-amber-500/40 hover:border-amber-400 bg-gradient-to-br from-amber-950/30 to-black shadow-lg shadow-amber-500/10"
          : "border-white/10 hover:border-amber-500/30 bg-white/[0.02] hover:bg-white/[0.04]"
      }`}
    >
      <div className="relative h-36 overflow-hidden">
        {profile.logoUrl ? (
          <img
            src={profile.logoUrl}
            alt={profile.brandName}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-white/5 flex items-center justify-center">
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
      <div className="p-4">
        <h3
          className={`font-bold text-sm truncate transition-colors ${
            isLamalo ? "text-amber-400" : "text-white group-hover:text-amber-400"
          }`}
        >
          {profile.brandName}
        </h3>
        {profile.bio && (
          <p className="text-xs text-white/40 mt-1.5 line-clamp-2 leading-relaxed">{profile.bio}</p>
        )}
        <div className="flex items-center gap-1 mt-3 text-xs text-amber-400/70">
          <Package className="h-3 w-3" />
          <span>Browse collections</span>
          <ArrowRight className="h-3 w-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
    </button>
  );
}

// ─── Marketplace grid ─────────────────────────────────────────────────────────

function MarketplaceGrid({
  search,
  setSearch,
  setLocation,
}: {
  search: string;
  setSearch: (s: string) => void;
  setLocation: (p: string) => void;
}) {
  const [showCustomOrder, setShowCustomOrder] = useState(false);
  const returnUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/wardrobe-marketplace`;

  const { data: designers, isLoading } =
    trpc.wardrobeMarket.marketplace.browseDesigners.useQuery({ limit: 48, offset: 0 });

  const filtered = search
    ? (designers ?? []).filter(
        (d: any) =>
          d.brandName?.toLowerCase().includes(search.toLowerCase()) ||
          d.bio?.toLowerCase().includes(search.toLowerCase()) ||
          d.displayName?.toLowerCase().includes(search.toLowerCase()),
      )
    : (designers ?? []);

  const sorted = [...filtered].sort((a: any, b: any) =>
    a.brandName === "Lamalo Fashion" ? -1 : b.brandName === "Lamalo Fashion" ? 1 : 0,
  );

  // Handle return from custom item checkout on the grid page
  const confirmCustom = trpc.wardrobeMarket.customItem.confirmAndGenerate.useMutation({
    onSuccess: (res) => {
      if (res.alreadyProcessed) {
        toast.info("This item was already generated and is in your inventory.");
      } else {
        toast.success("Custom item generated and added to your wardrobe inventory!");
      }
      window.history.replaceState({}, "", window.location.pathname);
    },
    onError: (e) => toast.error(e.message),
  });

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const customSid = p.get("custom_session");
    const customCancelled = p.get("custom_cancelled");
    if (customSid) {
      toast.loading("Generating your custom item…", { id: "custom-gen" });
      confirmCustom.mutate(
        { sessionId: customSid },
        { onSettled: () => toast.dismiss("custom-gen") }
      );
    } else if (customCancelled) {
      toast.info("Checkout cancelled — no charge was made.");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      <PageHeader />

      <CustomOrderModal
        open={showCustomOrder}
        onClose={() => setShowCustomOrder(false)}
        returnUrl={returnUrl}
      />

      {/* Hero */}
      <section
        className="relative py-20 px-4 overflow-hidden border-b border-white/10"
        style={{ background: "linear-gradient(180deg,#000 0%,#0c0800 60%,#000 100%)" }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_40%,rgba(212,175,55,0.06)_0%,transparent_70%)] pointer-events-none" />
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-full px-4 py-1.5 text-amber-400 text-xs font-black mb-6 uppercase tracking-widest">
            <Sparkles className="h-3.5 w-3.5" />
            Virelle Studios · In-House Virtual Fashion Label
          </div>

          <h1 className="text-5xl sm:text-7xl font-black tracking-tighter leading-none mb-3 gradient-text-gold">
            LAMALO
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-orange-400">
              FASHIONS
            </span>
          </h1>
          <p className="text-sm font-bold text-white/30 uppercase tracking-widest mb-8">
            by Virelle Studios
          </p>

          <p className="text-base sm:text-lg text-white/55 mb-3 max-w-2xl mx-auto leading-relaxed">
            Virtual clothing engineered for AI film generation. Every colour and every cut is
            pre-optimised so your characters wear the <em>same</em> outfit in scene 1 and scene 90 —
            no drift, no guesswork, no re-prompting.
          </p>
          <p className="text-sm text-amber-400/80 font-semibold mb-10">
            1,400+ items across 23 collections · From A$0.30 per item · Custom AI items from A$4.99
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3 justify-center mb-8">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/35" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search designers, styles, collections…"
                className="pl-10 bg-white/5 border-white/15 text-white placeholder-white/30 h-12 text-sm"
              />
            </div>
            <Button
              onClick={() => setShowCustomOrder(true)}
              className="bg-amber-500 hover:bg-amber-400 text-black font-black h-12 px-6 shrink-0 w-full sm:w-auto"
            >
              <Wand2 className="h-4 w-4 mr-2" /> Order Custom Item — A$4.99
            </Button>
          </div>
        </div>
      </section>

      {/* Why Lamalo? */}
      <ValueProps />

      {/* ─── Custom Item Feature Strip ─── */}
      <section className="border-b border-white/10 bg-gradient-to-r from-amber-950/20 to-black py-10 px-4">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
            <Wand2 className="h-8 w-8 text-amber-400" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-lg font-black text-white mb-1 gradient-text-gold">
              Order Custom AI Items — A$4.99 each
            </h2>
            <p className="text-sm text-white/50 leading-relaxed max-w-2xl">
              Can't find your exact garment in the catalogue? Describe any fashion item or paste a reference image URL — our AI generates a professional reference sheet and adds it to your wardrobe inventory with Costume Lock already applied.
              One-time charge, permanent ownership, exclusively yours.
            </p>
            <div className="flex flex-wrap gap-2 mt-3 justify-center sm:justify-start">
              {[
                "AI-generated to your spec",
                "Costume Lock included",
                "Permanent inventory slot",
                "Exclusively yours",
                "No subscription needed",
              ].map(t => (
                <span key={t} className="text-[10px] font-semibold text-amber-400/80 bg-amber-500/[0.08] border border-amber-500/20 rounded-full px-2.5 py-0.5">
                  {t}
                </span>
              ))}
            </div>
          </div>
          <Button
            onClick={() => setShowCustomOrder(true)}
            className="bg-amber-500 hover:bg-amber-400 text-black font-black h-11 px-6 shrink-0"
          >
            <Wand2 className="h-4 w-4 mr-2" /> Get Started
          </Button>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-b border-white/10 py-6 px-4 bg-white/[0.01]">
        <div className="max-w-4xl mx-auto flex flex-wrap justify-center gap-10">
          {[
            { icon: Users,   label: "Designers",    value: designers?.length ?? "—" },
            { icon: Package, label: "Collections",  value: "23+"    },
            { icon: Shirt,   label: "Items",        value: "1,400+" },
            { icon: Tag,     label: "From",         value: "A$0.30" },
            { icon: Wand2,   label: "Custom items", value: "A$4.99" },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="text-center">
              <div className="flex items-center justify-center gap-2 text-amber-400 mb-1">
                <Icon className="h-4 w-4" />
                <span className="text-2xl font-black">{value}</span>
              </div>
              <p className="text-xs text-white/35">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Designer grid */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-black tracking-tight text-white gradient-text-gold">
            {search ? `Results for "${search}"` : "All Designers"}
          </h2>
          <span className="text-xs text-white/30">{sorted.length} designers</span>
        </div>

        {isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
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

        {!isLoading && sorted.length === 0 && (
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

        {!isLoading && sorted.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {sorted.map((profile: any) => (
              <DesignerCard
                key={profile.id}
                profile={profile}
                onClick={() =>
                  setLocation(`/wardrobe-marketplace/designer/${profile.id}`)
                }
              />
            ))}
          </div>
        )}
      </section>

      {/* Designer CTA */}
      <section className="border-t border-white/10 bg-white/[0.01] py-16 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <Building2 className="h-10 w-10 text-amber-400 mx-auto mb-4" />
          <h2 className="text-2xl font-black tracking-tight mb-3 text-white gradient-text-gold">List your designs here.</h2>
          <p className="text-white/50 text-sm mb-2 leading-relaxed">
            Upload your collection and every item goes through Costume Lock optimisation — reference
            prompt calibration, colour separation, and scene continuity integration. Your customers
            get professional, drift-free results from day one.
          </p>
          <p className="text-white/35 text-xs mb-6">
            A$299/year · Unlimited collections · 95% of every sale · Direct Stripe payouts.
          </p>
          <Button
            onClick={() => setLocation("/designer-register")}
            className="bg-amber-500 hover:bg-amber-600 text-black font-bold px-8 h-11"
          >
            Join as Designer <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </section>

      <footer className="border-t border-white/10 py-8 px-4 text-center">
        <p className="text-xs text-white/20">
          © 2026 Virelle Studios · Lamalo Fashions ·{" "}
          <button
            onClick={() => setLocation("/terms")}
            className="hover:text-white/40 transition-colors"
          >
            Terms
          </button>
          {" · "}
          <button
            onClick={() => setLocation("/privacy")}
            className="hover:text-white/40 transition-colors"
          >
            Privacy
          </button>
        </p>
      </footer>
    </div>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────

export default function WardrobeMarketplacePage() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [isDetailRoute, detailParams] = useRoute("/wardrobe-marketplace/designer/:id");
  const designerId = isDetailRoute
    ? parseInt((detailParams as any)?.id ?? "0", 10)
    : 0;

  if (isDetailRoute && designerId) {
    return <DesignerDetailView designerId={designerId} />;
  }
  return (
    <div className="min-h-screen" style={{ background:"linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)" }}>
    <MarketplaceGrid search={search} setSearch={setSearch} setLocation={setLocation}
    </div>
  );
}
