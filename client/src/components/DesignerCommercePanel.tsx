import { useMemo, useState } from "react";
import DesignerGarmentUploadForm from "@/components/DesignerGarmentUploadForm";
import { HollywoodIcon } from "@/components/HollywoodIcon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
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

function statusTone(status: string): string {
  if (status === "approved" || status === "ready") return "border-emerald-400/35 bg-emerald-500/10 text-emerald-200";
  if (status === "needs_more_input") return "border-rose-400/35 bg-rose-500/10 text-rose-200";
  if (status === "processing") return "border-blue-400/35 bg-blue-500/10 text-blue-200";
  return "border-amber-400/35 bg-amber-500/10 text-amber-200";
}

function statusLabel(status: string): string {
  if (status === "approved" || status === "ready") return "Video-ready pack approved";
  if (status === "needs_more_input") return "Another capture is needed";
  if (status === "processing") return "Building hidden generation pack";
  if (status === "queued") return "Queued for processing";
  return "Private draft";
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
  const jobsQ = trpc.wardrobeMarket.commerce.garmentIngestion.listMine.useQuery(undefined, {
    enabled: open && portal.data?.portal === "designer",
  });
  const ordersQ = trpc.wardrobeMarket.commerce.orders.list.useQuery(undefined, {
    enabled: open && portal.data?.portal === "designer",
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
  const jobs = (jobsQ.data ?? []) as any[];
  const orders = (ordersQ.data ?? []) as any[];
  const profileReady = useMemo(() => Boolean(profile?.registrationCompleted), [profile]);
  const latestJobByItem = useMemo(() => {
    const map = new Map<number, any>();
    for (const job of jobs) if (!map.has(Number(job.wardrobeItemId))) map.set(Number(job.wardrobeItemId), job);
    return map;
  }, [jobs]);

  if (!routeEligible || portal.data?.portal !== "designer") return null;

  const tabs: Array<{ key: Tab; label: string; tool: "settings" | "asset_marketplace" | "continuity_checker" | "distribution" }> = [
    { key: "profile", label: "Brand profile", tool: "settings" },
    { key: "new-item", label: "Upload garment", tool: "asset_marketplace" },
    { key: "listings", label: "Listings", tool: "continuity_checker" },
    { key: "orders", label: "Physical orders", tool: "distribution" },
  ];

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 rounded-full bg-amber-500 px-5 font-black text-black shadow-2xl shadow-black/60 hover:bg-amber-400 btn-gold"
      >
        <HollywoodIcon tool="asset_marketplace" size={27} className="mr-2" /> Designer workspace
      </Button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-3 backdrop-blur-md sm:p-6">
          <div className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-amber-500/25 bg-[#080808] text-white shadow-2xl shadow-black/80">
            <div className="flex items-center gap-4 border-b border-amber-500/20 bg-gradient-to-r from-amber-500/[0.08] via-black to-black px-5 py-4">
              <HollywoodIcon tool="asset_marketplace" size={44} className="rounded-xl" />
              <div className="min-w-0">
                <h2 className="font-serif text-xl font-black gradient-text-gold">Designer commerce workspace</h2>
                <p className="text-xs text-white/45">Upload, video-readiness processing, listings and fulfilment</p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close designer workspace" className="ml-auto grid h-10 w-10 place-items-center rounded-full border border-amber-500/20 bg-black/50 text-2xl text-white/55 hover:border-amber-400/50 hover:text-amber-300">×</button>
            </div>

            <div className="flex overflow-x-auto border-b border-amber-500/20 bg-black/70 px-3">
              {tabs.map(({ key, label, tool }) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-xs font-bold transition-colors ${tab === key ? "border-amber-400 text-amber-300" : "border-transparent text-white/45 hover:text-white"}`}
                >
                  <HollywoodIcon tool={tool} size={25} /> {label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-5 sm:p-7">
              {tab === "profile" && (
                <div className="max-w-4xl space-y-5">
                  <div className={`rounded-2xl border p-4 text-sm ${profileReady ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" : "border-amber-500/30 bg-amber-500/10 text-amber-200"}`}>
                    <div className="flex items-center gap-3">
                      <HollywoodIcon tool={profileReady ? "continuity_checker" : "settings"} size={38} />
                      <span>{profileReady ? "Registration details complete." : "Complete the business details before publishing."}</span>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    {[
                      ["brandName", "Brand name"], ["username", "Designer username"], ["abn", "ABN"],
                      ["contactEmail", "Business email"], ["website", "Website"], ["instagram", "Instagram"],
                      ["businessAddressLine1", "Business address"], ["businessAddressLine2", "Address line 2"],
                      ["businessCity", "City"], ["businessStateRegion", "State / region"],
                      ["businessPostalCode", "Postcode"], ["businessCountry", "Country"],
                    ].map(([key, label]) => (
                      <div key={key} className="space-y-1.5">
                        <Label className="text-white/60">{label}</Label>
                        <Input value={profileForm[key] ?? ""} onChange={(event) => setProfileField(key, event.target.value)} className="border-amber-500/20 bg-white/5" />
                      </div>
                    ))}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-white/60">Bio</Label>
                    <Textarea value={profileForm.bio ?? ""} onChange={(event) => setProfileField("bio", event.target.value)} className="min-h-24 border-amber-500/20 bg-white/5" />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-white/60">Brand logo</Label>
                    <p className="text-xs text-white/35">Uploading here changes only this designer account’s own brand logo. Virelle and Lamalo logos are not modified.</p>
                    <Input type="file" accept="image/png,image/jpeg,image/webp" onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      try { setProfileField("logoUrl", await imageFileToDataUrl(file)); }
                      catch (error) { toast.error(error instanceof Error ? error.message : "Invalid image"); }
                    }} className="border-amber-500/20 bg-white/5" />
                  </div>

                  <Button onClick={() => saveProfile.mutate({ ...profileForm, profileType: profileForm.profileType || "designer" } as any)} disabled={saveProfile.isPending} className="bg-amber-500 font-black text-black hover:bg-amber-400 btn-gold">
                    {saveProfile.isPending ? <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-black/25 border-t-black" /> : <HollywoodIcon tool="settings" size={27} className="mr-2" />}
                    Save profile
                  </Button>
                </div>
              )}

              {tab === "new-item" && (
                <DesignerGarmentUploadForm
                  collections={collections.map((collection) => ({ id: Number(collection.id), name: String(collection.name) }))}
                  onComplete={() => setTab("listings")}
                />
              )}

              {tab === "listings" && (
                <div className="space-y-5">
                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.05] p-4">
                    <div className="flex items-center gap-3">
                      <HollywoodIcon tool="continuity_checker" size={40} />
                      <div>
                        <h3 className="font-serif font-black gradient-text-gold">Customer shop image and hidden generation status</h3>
                        <p className="mt-1 text-xs text-white/45">Each card shows the same single image customers see. The technical asset pack remains private.</p>
                      </div>
                    </div>
                  </div>

                  {itemsQ.isLoading || jobsQ.isLoading ? (
                    <div className="flex items-center gap-3 text-sm text-amber-300"><span className="h-5 w-5 animate-spin rounded-full border-2 border-amber-400/20 border-t-amber-400" /> Loading listings…</div>
                  ) : items.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-amber-500/25 bg-black/30 p-10 text-center">
                      <HollywoodIcon tool="asset_marketplace" size={64} className="mx-auto" />
                      <p className="mt-4 font-serif text-lg font-black gradient-text-gold">No designer items yet</p>
                      <button onClick={() => setTab("new-item")} className="mt-2 text-sm font-semibold text-amber-300 hover:text-amber-200">Upload the first garment</button>
                    </div>
                  ) : (
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                      {items.map((item) => {
                        const job = latestJobByItem.get(Number(item.id));
                        const status = String(job?.status || item.generationReadinessStatus || "not_requested");
                        return (
                          <article key={item.id} className="overflow-hidden rounded-2xl border border-amber-500/20 bg-white/[0.025] shadow-lg shadow-black/30">
                            <div className="relative h-52 bg-black">
                              <img src={item.primaryImageUrl} alt={item.name} className="h-full w-full object-cover" />
                              {Boolean(item.isVirtualOnly) && <Badge className="absolute bottom-3 left-3 border border-purple-400/40 bg-black/85 text-[10px] text-purple-200">Virtual item</Badge>}
                            </div>
                            <div className="space-y-3 p-4">
                              <div>
                                <p className="font-serif text-base font-black gradient-text-gold">{item.name}</p>
                                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-white/45">{item.description}</p>
                              </div>
                              <Badge variant="outline" className={statusTone(status)}>{statusLabel(status)}</Badge>
                              {job?.failureReason && <p className="rounded-xl border border-rose-500/20 bg-rose-500/[0.06] p-3 text-xs leading-relaxed text-rose-200">{job.failureReason}</p>}
                              <div className="flex flex-wrap gap-2">
                                <Badge variant="outline" className="border-amber-500/30 text-amber-300">Virtual {money(item.retailPriceAud)}</Badge>
                                {!Boolean(item.isVirtualOnly) && <Badge variant="outline" className="border-emerald-500/30 text-emerald-300">Physical {money(item.physicalRetailPriceAud)}</Badge>}
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {tab === "orders" && (
                <div className="space-y-4">
                  {ordersQ.isLoading ? (
                    <div className="flex items-center gap-3 text-sm text-amber-300"><span className="h-5 w-5 animate-spin rounded-full border-2 border-amber-400/20 border-t-amber-400" /> Loading orders…</div>
                  ) : orders.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-amber-500/25 bg-black/30 p-10 text-center">
                      <HollywoodIcon tool="distribution" size={64} className="mx-auto" />
                      <p className="mt-4 font-serif text-lg font-black gradient-text-gold">No physical orders yet</p>
                    </div>
                  ) : orders.map((order) => {
                    const address = typeof order.shippingAddressSnapshot === "string" ? JSON.parse(order.shippingAddressSnapshot) : order.shippingAddressSnapshot;
                    return (
                      <div key={order.id} className="flex flex-col gap-4 rounded-2xl border border-amber-500/20 bg-white/[0.025] p-4 lg:flex-row">
                        <img src={order.primaryImageUrl} alt="" className="h-24 w-20 rounded-xl object-cover" />
                        <div className="flex-1">
                          <p className="font-serif font-black gradient-text-gold">{order.itemName}</p>
                          <p className="mt-1 text-xs leading-relaxed text-white/45">{address?.recipientName} · {address?.addressLine1}, {address?.city}, {address?.stateRegion} {address?.postalCode}, {address?.country}</p>
                          <p className="mt-2 text-xs font-semibold text-amber-300">Paid {money(order.amountPaidAud)}</p>
                        </div>
                        <select value={order.status} onChange={(event) => updateOrder.mutate({ id: order.id, status: event.target.value as any })} className="h-10 rounded-lg border border-amber-500/20 bg-black px-3 text-sm">
                          <option value="paid">Paid</option>
                          <option value="processing">Processing</option>
                          <option value="shipped">Shipped</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>
                    );
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
