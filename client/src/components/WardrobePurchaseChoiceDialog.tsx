import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { Loader2, MapPin, PackageCheck, Pencil, Save, Shirt, Trash2, X } from "lucide-react";
import { toast } from "sonner";

interface Props {
  item: any | null;
  returnUrl: string;
  onClose: () => void;
  onCheckoutStarted?: () => void;
}

const emptyAddress = {
  label: "Home",
  recipientName: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  stateRegion: "",
  postalCode: "",
  country: "Australia",
  isDefault: true,
};

function money(cents: number | null | undefined) {
  return `A$${(Number(cents ?? 0) / 100).toFixed(2)}`;
}

export default function WardrobePurchaseChoiceDialog({ item, returnUrl, onClose, onCheckoutStarted }: Props) {
  const utils = trpc.useUtils();
  const [mode, setMode] = useState<"virtual" | "physical">("virtual");
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [address, setAddress] = useState(emptyAddress);

  const optionsQ = trpc.wardrobeMarket.commerce.purchase.options.useQuery(
    { itemId: Number(item?.id ?? 0) },
    { enabled: Boolean(item?.id), retry: false },
  );
  const addressesQ = trpc.wardrobeMarket.commerce.addresses.list.useQuery(undefined, {
    enabled: Boolean(item?.id), retry: false,
  });

  const checkout = trpc.wardrobeMarket.commercePurchase.checkout.useMutation({
    onSuccess: (result) => {
      onCheckoutStarted?.();
      if (result.checkoutUrl) window.location.href = result.checkoutUrl;
    },
    onError: (error) => toast.error(error.message || "Could not start checkout."),
  });

  const createAddress = trpc.wardrobeMarket.commerce.addresses.create.useMutation({
    onSuccess: async (result) => {
      await utils.wardrobeMarket.commerce.addresses.list.invalidate();
      setSelectedAddressId(result.id);
      setShowAddressForm(false);
      setAddress(emptyAddress);
      toast.success("Delivery address saved.");
    },
    onError: (error) => toast.error(error.message),
  });
  const updateAddress = trpc.wardrobeMarket.commerce.addresses.update.useMutation({
    onSuccess: async (result) => {
      await utils.wardrobeMarket.commerce.addresses.list.invalidate();
      setSelectedAddressId(result.id);
      setEditingId(null);
      setShowAddressForm(false);
      setAddress(emptyAddress);
      toast.success("Delivery address updated.");
    },
    onError: (error) => toast.error(error.message),
  });
  const removeAddress = trpc.wardrobeMarket.commerce.addresses.remove.useMutation({
    onSuccess: async () => {
      await utils.wardrobeMarket.commerce.addresses.list.invalidate();
      setSelectedAddressId(null);
      toast.success("Delivery address removed.");
    },
    onError: (error) => toast.error(error.message),
  });

  const addresses = (addressesQ.data ?? []) as any[];
  useEffect(() => {
    if (!selectedAddressId && addresses.length) {
      setSelectedAddressId(Number(addresses.find((row) => Boolean(row.isDefault))?.id ?? addresses[0].id));
    }
  }, [addresses, selectedAddressId]);

  useEffect(() => {
    setMode("virtual");
    setShowAddressForm(false);
    setEditingId(null);
  }, [item?.id]);

  if (!item) return null;
  const options = optionsQ.data as any;
  const physicalAllowed = Boolean(options?.canBuyPhysical);

  const edit = (row: any) => {
    setEditingId(Number(row.id));
    setAddress({
      label: row.label ?? "Delivery address",
      recipientName: row.recipientName ?? "",
      phone: row.phone ?? "",
      addressLine1: row.addressLine1 ?? "",
      addressLine2: row.addressLine2 ?? "",
      city: row.city ?? "",
      stateRegion: row.stateRegion ?? "",
      postalCode: row.postalCode ?? "",
      country: row.country ?? "Australia",
      isDefault: Boolean(row.isDefault),
    });
    setShowAddressForm(true);
  };

  const saveAddress = () => {
    if (!address.recipientName.trim() || !address.addressLine1.trim() || !address.city.trim() || !address.stateRegion.trim() || !address.postalCode.trim() || !address.country.trim()) {
      toast.error("Complete all required delivery address fields.");
      return;
    }
    if (editingId) updateAddress.mutate({ id: editingId, ...address });
    else createAddress.mutate(address);
  };

  const startCheckout = () => {
    if (mode === "physical" && !selectedAddressId) {
      toast.error("Select or add a delivery address for physical shipping.");
      return;
    }
    checkout.mutate({
      itemId: Number(item.id),
      purchaseMode: mode,
      shippingAddressId: mode === "physical" ? selectedAddressId ?? undefined : undefined,
      returnUrl,
    });
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm p-4 flex items-center justify-center">
      <div className="w-full max-w-2xl max-h-[92vh] overflow-hidden rounded-3xl border border-amber-500/25 bg-[#090909] text-white shadow-2xl flex flex-col">
        <div className="flex items-center gap-3 border-b border-amber-500/20 px-5 py-4">
          <Shirt className="h-5 w-5 text-amber-400" />
          <div className="min-w-0"><h2 className="font-black gradient-text-gold truncate">Purchase {item.name}</h2><p className="text-xs text-white/40">Choose the virtual licence or a shipped physical item.</p></div>
          <button onClick={onClose} className="ml-auto text-white/40 hover:text-white"><X className="h-5 w-5" /></button>
        </div>

        <div className="overflow-y-auto p-5 space-y-5">
          <div className="grid sm:grid-cols-2 gap-3">
            <button onClick={() => setMode("virtual")} className={`rounded-2xl border p-4 text-left transition-all ${mode === "virtual" ? "border-purple-400 bg-purple-500/10" : "border-white/15 bg-white/[0.02]"}`}>
              <div className="flex items-center justify-between"><Badge className="bg-purple-500/20 text-purple-200 border-purple-400/30">Virtual item</Badge><span className="font-black text-amber-400">{money(options?.retailPriceAud ?? item.retailPriceAud)}</span></div>
              <p className="text-xs text-white/55 mt-3">Permanent digital wardrobe copy for character and scene use, identical to the Lamalo inventory workflow.</p>
            </button>
            <button disabled={!physicalAllowed} onClick={() => physicalAllowed && setMode("physical")} className={`rounded-2xl border p-4 text-left transition-all disabled:opacity-40 ${mode === "physical" ? "border-emerald-400 bg-emerald-500/10" : "border-white/15 bg-white/[0.02]"}`}>
              <div className="flex items-center justify-between"><Badge className="bg-emerald-500/20 text-emerald-200 border-emerald-400/30">Physical delivery</Badge><span className="font-black text-amber-400">{physicalAllowed ? money(options?.physicalRetailPriceAud) : "Unavailable"}</span></div>
              <p className="text-xs text-white/55 mt-3">Purchase the live item for shipping. A virtual copy is also placed into your Virelle inventory after payment.</p>
            </button>
          </div>

          {mode === "physical" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between"><div><h3 className="text-sm font-black flex items-center gap-2"><MapPin className="h-4 w-4 text-amber-400" /> Delivery address</h3><p className="text-xs text-white/40">Saved addresses can be reused, edited or deleted.</p></div><Button size="sm" variant="outline" onClick={() => { setEditingId(null); setAddress(emptyAddress); setShowAddressForm(true); }} className="border-amber-500/30 text-amber-300">Add address</Button></div>

              {addressesQ.isLoading && <Loader2 className="h-5 w-5 animate-spin text-amber-400" />}
              <div className="space-y-2">
                {addresses.map((row) => (
                  <div key={row.id} className={`rounded-xl border p-3 flex gap-3 ${selectedAddressId === Number(row.id) ? "border-amber-400 bg-amber-500/10" : "border-white/15"}`}>
                    <button onClick={() => setSelectedAddressId(Number(row.id))} className="flex-1 text-left"><p className="text-sm font-bold">{row.label || "Delivery address"}{Boolean(row.isDefault) && <span className="text-[10px] text-amber-300 ml-2">Default</span>}</p><p className="text-xs text-white/45 mt-1">{row.recipientName} · {row.addressLine1}{row.addressLine2 ? `, ${row.addressLine2}` : ""}, {row.city}, {row.stateRegion} {row.postalCode}, {row.country}</p></button>
                    <button onClick={() => edit(row)} className="text-white/40 hover:text-white"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => confirm("Delete this delivery address?") && removeAddress.mutate({ id: Number(row.id) })} className="text-rose-400 hover:text-rose-300"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>

              {showAddressForm && (
                <div className="rounded-2xl border border-amber-500/25 bg-white/[0.02] p-4 space-y-3">
                  <div className="grid sm:grid-cols-2 gap-3">
                    {[
                      ["label", "Address label"], ["recipientName", "Recipient name *"], ["phone", "Phone"],
                      ["addressLine1", "Address line 1 *"], ["addressLine2", "Address line 2"], ["city", "City *"],
                      ["stateRegion", "State / region *"], ["postalCode", "Postcode *"], ["country", "Country *"],
                    ].map(([key, label]) => <div key={key} className="space-y-1"><Label className="text-xs text-white/55">{label}</Label><Input value={(address as any)[key]} onChange={(e) => setAddress((current) => ({ ...current, [key]: e.target.value }))} className="bg-black border-amber-500/20" /></div>)}
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-white/10 p-3"><span className="text-xs text-white/60">Save as default delivery address</span><Switch checked={address.isDefault} onCheckedChange={(value) => setAddress((current) => ({ ...current, isDefault: value }))} /></div>
                  <div className="flex gap-2"><Button onClick={saveAddress} disabled={createAddress.isPending || updateAddress.isPending} className="bg-amber-500 hover:bg-amber-400 text-black font-bold"><Save className="h-4 w-4 mr-2" />Save address</Button><Button variant="ghost" onClick={() => setShowAddressForm(false)}>Cancel</Button></div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-amber-500/20 p-4 flex items-center justify-between gap-3"><p className="text-[11px] text-white/35">Stripe securely processes payment. Designer payouts are routed automatically through Stripe Connect.</p><Button onClick={startCheckout} disabled={checkout.isPending || optionsQ.isLoading} className="bg-amber-500 hover:bg-amber-400 text-black font-black shrink-0"><PackageCheck className="h-4 w-4 mr-2" />{checkout.isPending ? "Opening Stripe…" : `Continue — ${mode === "physical" ? money(options?.physicalRetailPriceAud) : money(options?.retailPriceAud ?? item.retailPriceAud)}`}</Button></div>
      </div>
    </div>
  );
}
