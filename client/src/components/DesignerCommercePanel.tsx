import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { ImagePlus, Loader2, Package, Pencil, Shirt, Store, Truck, X } from "lucide-react";
import { toast } from "sonner";

type Tab = "profile" | "new-item" | "listings" | "orders";

function imageFileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.match(/^image\/(png|jpeg|webp)$/)) {
      reject(new Error("Upload a PNG, JPEG or WebP image."));
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      reject(new Error("Image must be smaller than 8 MB."));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read the image."));
    reader.readAsDataURL(file);
  });
}

function money(cents: number | null | undefined): string {
  return `A$${(Number(cents ?? 0) / 100).toFixed(2)}`;
}

export default function DesignerCommercePanel() {
  const path = typeof window === "undefined" ? "" : window.location.pathname;
  const routeEligible = path.startsWith("/designer/") || path === "/designer-wardrobe" || path === "/designer-register";
  const portal = trpc.wardrobeMarket.commerce.portal.status.useQuery(undefined, { enabled: routeEligible, retry: false });
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("new-item");
  const utils = trpc.useUtils();

  const profileQ = trpc.wardrobeMarket.commerce.designer.profile.useQuery(undefined, {
    enabled: open && portal.data?.portal === "designer",
  });
  const collectionsQ = trpc.wardrobeMarket.commerce.designer.listCollections.useQuery(undefined, {
    enabled: open && portal.data?.portal === "designer",
  });
  const itemsQ = trpc.wardrobeMarket.commerce.designer.listItems.useQuery(undefined, {
    enabled: open && portal.data?.portal === "designer",
  });
  const ordersQ = trpc.wardrobeMarket.commerce.orders.list.useQuery(undefined, {
    enabled: open && portal.data?.portal === "designer",
  });

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("fashion");
  const [retailDollars, setRetailDollars] = useState("");
  const [virtualOnly, setVirtualOnly] = useState(false);
  const [imageDataUrl, setImageDataUrl] = useState("");
  const [collectionId, setCollectionId] = useState("");
  const [publish, setPublish] = useState(true);

  const physicalCents = Math.max(0, Math.round(Number(retailDollars || 0) * 100));
  const virtualCents = physicalCents > 0 ? Math.round(physicalCents * 0.03) : 0;

  const createItem = trpc.wardrobeMarket.commerce.designer.createItem.useMutation({
    onSuccess: (result) => {
      toast.success(`Item saved. Virtual price: ${money(result.virtualPriceAudCents)}.`);
      setName(""); setDescription(""); setRetailDollars(""); setImageDataUrl(""); setVirtualOnly(false);
      utils.wardrobeMarket.commerce.designer.listItems.invalidate();
      setTab("listings");
    },
    onError: (error) => toast.error(error.message),
  });

  const updateOrder = trpc.wardrobeMarket.commerce.orders.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Order status updated.");
      utils.wardrobeMarket.commerce.orders.list.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const profile = profileQ.data as any;
  const [profileDraft, setProfileDraft] = useState<Record<string, string> | null>(null);
  const profileForm: Record<string, string> = profileDraft ?? {
    brandName: profile?.brandName ?? "",
    username: profile?.username ?? "",
    abn: profile?.abn ?? "",
    profileType: profile?.profileType ?? "designer",
    bio: profile?.bio ?? "",
    contactEmail: profile?.contactEmail ?? "",
    website: profile?.website ?? "",
    instagram: profile?.instagram ?? "",
    logoUrl: profile?.logoUrl ?? "",
    businessAddressLine1: profile?.businessAddressLine1 ?? "",
    businessAddressLine2: profile?.businessAddressLine2 ?? "",
    businessCity: profile?.businessCity ?? "",
    businessStateRegion: profile?.businessStateRegion ?? "",
    businessPostalCode: profile?.businessPostalCode ?? "",
    businessCountry: profile?.businessCountry ?? "Australia",
  };

  const saveProfile = trpc.wardrobeMarket.commerce.designer.saveProfile.useMutation({
    onSuccess: () => {
      toast.success("Designer profile saved.");
      setProfileDraft(null);
      utils.wardrobeMarket.commerce.designer.profile.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const setProfileField = (key: string, value: string) => setProfileDraft({ ...profileForm, [key]: value });
  const collections = (collectionsQ.data ?? []) as any[];
  const items = (itemsQ.data ?? []) as any[];
  const orders = (ordersQ.data ?? []) as any[];

  const profileReady = useMemo(() => Boolean(profile?.registrationCompleted), [profile]);

  if (!routeEligible || portal.data?.portal !== "designer") return null;

  const submitItem = () => {
    if (!name.trim() || description.trim().length < 10 || physicalCents < 1667 || !imageDataUrl) {
      toast.error("Item name, description, image and a retail price of at least A$16.67 are required.");
      return;
    }
    createItem.mutate({
      name: name.trim(), description: description.trim(), category, wardrobeType: category,
      primaryImageUrl: imageDataUrl, retailPriceAudCents: physicalCents, virtualOnly,
      collectionId: collectionId ? Number(collectionId) : undefined, publish,
    });
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 rounded-full bg-amber-500 hover:bg-amber-400 text-black font-black shadow-2xl shadow-black/60 px-5"
      >
        <Store className="h-4 w-4 mr-2" /> Designer commerce
      </Button>

      {open && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm p-3 sm:p-6 flex items-center justify-center">
          <div className="w-full max-w-5xl max-h-[94vh] overflow-hidden rounded-3xl border border-amber-500/25 bg-[#090909] text-white shadow-2xl flex flex-col">
            <div className="flex items-center gap-3 border-b border-amber-500/20 px-5 py-4">
              <Store className="h-5 w-5 text-amber-400" />
              <div className="min-w-0">
                <h2 className="font-black gradient-text-gold">Designer commerce workspace</h2>
                <p className="text-xs text-white/40">Listings, automatic virtual pricing, shipping and fulfilment</p>
              </div>
              <button onClick={() => setOpen(false)} className="ml-auto text-white/40 hover:text-white"><X className="h-5 w-5" /></button>
            </div>

            <div className="flex overflow-x-auto border-b border-amber-500/20 px-3">
              {([
                ["profile", "Brand profile", Pencil], ["new-item", "Add item", ImagePlus],
                ["listings", "Listings", Shirt], ["orders", "Physical orders", Truck],
              ] as const).map(([key, label, Icon]) => (
                <button key={key} onClick={() => setTab(key)} className={`flex items-center gap-2 px-4 py-3 text-xs font-bold whitespace-nowrap border-b-2 ${tab === key ? "border-amber-400 text-amber-300" : "border-transparent text-white/45 hover:text-white"}`}>
                  <Icon className="h-3.5 w-3.5" /> {label}
                </button>
              ))}
            </div>

            <div className="overflow-y-auto p-5 sm:p-7 flex-1">
              {tab === "profile" && (
                <div className="max-w-3xl space-y-4">
                  <div className={`rounded-xl border p-3 text-xs ${profileReady ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-amber-500/30 bg-amber-500/10 text-amber-200"}`}>
                    {profileReady ? "Registration details complete." : "Complete all business details before publishing."}
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {[
                      ["brandName", "Brand name"], ["username", "Designer username"], ["abn", "ABN"],
                      ["contactEmail", "Business email"], ["website", "Website"], ["instagram", "Instagram"],
                      ["businessAddressLine1", "Business address"], ["businessAddressLine2", "Address line 2"],
                      ["businessCity", "City"], ["businessStateRegion", "State / region"],
                      ["businessPostalCode", "Postcode"], ["businessCountry", "Country"],
                    ].map(([key, label]) => (
                      <div key={key} className="space-y-1.5">
                        <Label className="text-white/60">{label}</Label>
                        <Input value={(profileForm as Record<string, string>)[key] ?? ""} onChange={(e) => setProfileField(key, e.target.value)} className="bg-white/5 border-amber-500/20" />
                      </div>
                    ))}
                  </div>
                  <div className="space-y-1.5"><Label className="text-white/60">Bio</Label><Textarea value={profileForm.bio ?? ""} onChange={(e) => setProfileField("bio", e.target.value)} className="bg-white/5 border-amber-500/20 min-h-24" /></div>
                  <div className="space-y-1.5">
                    <Label className="text-white/60">Brand logo</Label>
                    <Input type="file" accept="image/png,image/jpeg,image/webp" onChange={async (e) => {
                      const file = e.target.files?.[0]; if (!file) return;
                      try { setProfileField("logoUrl", await imageFileToDataUrl(file)); } catch (error) { toast.error(error instanceof Error ? error.message : "Invalid image"); }
                    }} className="bg-white/5 border-amber-500/20" />
                  </div>
                  <Button onClick={() => saveProfile.mutate({ ...profileForm, profileType: profileForm.profileType || "designer" } as any)} disabled={saveProfile.isPending} className="bg-amber-500 hover:bg-amber-400 text-black font-black">
                    {saveProfile.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Save profile
                  </Button>
                </div>
              )}

              {tab === "new-item" && (
                <div className="max-w-3xl space-y-5">
                  <div className="rounded-xl border border-blue-500/25 bg-blue-500/10 p-3 text-xs text-blue-200">
                    Third-party virtual pricing is generated automatically at 3% of the physical retail price. Lamalo prices are not changed by this system.
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5"><Label>Item name</Label><Input value={name} onChange={(e) => setName(e.target.value)} className="bg-white/5 border-amber-500/20" /></div>
                    <div className="space-y-1.5"><Label>Category</Label><select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full h-10 rounded-md bg-black border border-amber-500/20 px-3 text-sm"><option value="fashion">Fashion</option><option value="costume">Costume</option><option value="shoes">Shoes</option><option value="accessory">Accessory</option><option value="jewellery">Jewellery</option><option value="bag">Bag</option><option value="hat">Hat</option><option value="other">Other</option></select></div>
                  </div>
                  <div className="space-y-1.5"><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="bg-white/5 border-amber-500/20 min-h-28" /></div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5"><Label>Physical retail price (AUD)</Label><Input type="number" min="16.67" step="0.01" value={retailDollars} onChange={(e) => setRetailDollars(e.target.value)} className="bg-white/5 border-amber-500/20" /></div>
                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3"><p className="text-[10px] uppercase tracking-wider text-white/40">Automatic virtual price</p><p className="text-xl font-black text-amber-400 mt-1">{money(virtualCents)}</p><p className="text-[10px] text-white/30">3% of {money(physicalCents)}</p></div>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-amber-500/20 bg-white/[0.02] p-4"><div><p className="text-sm font-bold">Virtual-only item</p><p className="text-xs text-white/40">No physical shipping option will be offered.</p></div><Switch checked={virtualOnly} onCheckedChange={setVirtualOnly} /></div>
                  <div className="flex items-center justify-between rounded-xl border border-amber-500/20 bg-white/[0.02] p-4"><div><p className="text-sm font-bold">Publish immediately</p><p className="text-xs text-white/40">Requires active membership and completed Stripe payouts.</p></div><Switch checked={publish} onCheckedChange={setPublish} /></div>
                  {collections.length > 0 && <div className="space-y-1.5"><Label>Collection</Label><select value={collectionId} onChange={(e) => setCollectionId(e.target.value)} className="w-full h-10 rounded-md bg-black border border-amber-500/20 px-3 text-sm"><option value="">Designer Store (automatic)</option>{collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>}
                  <div className="space-y-1.5"><Label>Item image</Label><Input type="file" accept="image/png,image/jpeg,image/webp" onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; try { setImageDataUrl(await imageFileToDataUrl(file)); } catch (error) { toast.error(error instanceof Error ? error.message : "Invalid image"); } }} className="bg-white/5 border-amber-500/20" />{imageDataUrl && <img src={imageDataUrl} alt="Preview" className="h-40 w-32 object-cover rounded-xl border border-amber-500/20" />}</div>
                  <Button onClick={submitItem} disabled={createItem.isPending} className="bg-amber-500 hover:bg-amber-400 text-black font-black"><Package className="h-4 w-4 mr-2" />{createItem.isPending ? "Saving…" : "Save item"}</Button>
                </div>
              )}

              {tab === "listings" && (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {itemsQ.isLoading ? <Loader2 className="h-6 w-6 animate-spin text-amber-400" /> : items.length === 0 ? <p className="text-sm text-white/40">No designer items yet.</p> : items.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-amber-500/20 overflow-hidden bg-white/[0.02]">
                      <div className="relative h-44 bg-black"><img src={item.primaryImageUrl} alt={item.name} className="h-full w-full object-cover" />
                        {Boolean(item.isVirtualOnly) && <Badge className="absolute bottom-2 left-2 bg-black/85 border border-purple-400/40 text-purple-200 text-[10px]">Virtual item</Badge>}
                      </div>
                      <div className="p-4"><p className="font-bold text-sm">{item.name}</p><p className="text-xs text-white/40 mt-1 line-clamp-2">{item.description}</p><div className="flex flex-wrap gap-2 mt-3"><Badge variant="outline" className="text-amber-300 border-amber-500/30">Virtual {money(item.retailPriceAud)}</Badge>{!Boolean(item.isVirtualOnly) && <Badge variant="outline" className="text-emerald-300 border-emerald-500/30">Physical {money(item.physicalRetailPriceAud)}</Badge>}</div></div>
                    </div>
                  ))}
                </div>
              )}

              {tab === "orders" && (
                <div className="space-y-4">
                  {ordersQ.isLoading ? <Loader2 className="h-6 w-6 animate-spin text-amber-400" /> : orders.length === 0 ? <p className="text-sm text-white/40">No physical orders yet.</p> : orders.map((order) => {
                    const address = typeof order.shippingAddressSnapshot === "string" ? JSON.parse(order.shippingAddressSnapshot) : order.shippingAddressSnapshot;
                    return <div key={order.id} className="rounded-2xl border border-amber-500/20 p-4 flex flex-col lg:flex-row gap-4"><img src={order.primaryImageUrl} alt="" className="h-20 w-16 object-cover rounded-lg" /><div className="flex-1"><p className="font-bold">{order.itemName}</p><p className="text-xs text-white/45 mt-1">{address?.recipientName} · {address?.addressLine1}, {address?.city}, {address?.stateRegion} {address?.postalCode}, {address?.country}</p><p className="text-xs text-amber-300 mt-2">Paid {money(order.amountPaidAud)}</p></div><select value={order.status} onChange={(e) => updateOrder.mutate({ id: order.id, status: e.target.value as any })} className="h-10 rounded-lg bg-black border border-amber-500/20 px-3 text-sm"><option value="paid">Paid</option><option value="processing">Processing</option><option value="shipped">Shipped</option><option value="delivered">Delivered</option><option value="cancelled">Cancelled</option></select></div>;
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
