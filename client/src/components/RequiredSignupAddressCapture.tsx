import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { MapPin, Save } from "lucide-react";
import { toast } from "sonner";

const STORAGE_KEY = "virelle:signup-delivery-address";

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

function readDraft() {
  try {
    const value = sessionStorage.getItem(STORAGE_KEY);
    return value ? { ...emptyAddress, ...JSON.parse(value) } : emptyAddress;
  } catch {
    return emptyAddress;
  }
}

export default function RequiredSignupAddressCapture() {
  const pathname = typeof window === "undefined" ? "" : window.location.pathname;
  const me = trpc.auth.me.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });
  const portal = trpc.wardrobeMarket.commerce.portal.status.useQuery(undefined, {
    enabled: Boolean(me.data),
    retry: false,
    refetchOnWindowFocus: false,
  });
  const addresses = trpc.wardrobeMarket.commerce.addresses.list.useQuery(undefined, {
    enabled: Boolean(me.data && portal.data?.portal === "studio"),
    retry: false,
    refetchOnWindowFocus: false,
  });
  const utils = trpc.useUtils();
  const [address, setAddress] = useState(readDraft);
  const [capturedForSignup, setCapturedForSignup] = useState(() => {
    try { return Boolean(sessionStorage.getItem(STORAGE_KEY)); } catch { return false; }
  });

  const createAddress = trpc.wardrobeMarket.commerce.addresses.create.useMutation({
    onSuccess: async () => {
      try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* ignored */ }
      await utils.wardrobeMarket.commerce.addresses.list.invalidate();
      toast.success("Delivery address saved.");
    },
    onError: (error) => toast.error(error.message),
  });

  useEffect(() => {
    if (!me.data || portal.data?.portal !== "studio" || createAddress.isPending) return;
    if (!addresses.data || addresses.data.length > 0) return;
    let saved: typeof emptyAddress | null = null;
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      saved = raw ? { ...emptyAddress, ...JSON.parse(raw) } : null;
    } catch {
      saved = null;
    }
    if (saved?.recipientName && saved.addressLine1 && saved.city && saved.stateRegion && saved.postalCode && saved.country) {
      createAddress.mutate(saved);
    }
  }, [addresses.data, createAddress.isPending, me.data, portal.data?.portal]);

  const complete = useMemo(() => Boolean(
    address.recipientName.trim()
    && address.addressLine1.trim()
    && address.city.trim()
    && address.stateRegion.trim()
    && address.postalCode.trim()
    && address.country.trim()
  ), [address]);

  const signupGate = pathname === "/register" && !me.data && !capturedForSignup;
  const accountGate = Boolean(
    me.data
    && portal.data?.portal === "studio"
    && !addresses.isLoading
    && addresses.data
    && addresses.data.length === 0
    && !createAddress.isPending
  );

  if (!signupGate && !accountGate) return null;

  const save = () => {
    if (!complete) {
      toast.error("Complete all required delivery address fields.");
      return;
    }
    if (signupGate) {
      try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(address)); } catch { /* ignored */ }
      setCapturedForSignup(true);
      toast.success("Delivery address captured. Complete your account signup.");
      return;
    }
    createAddress.mutate(address);
  };

  return (
    <div className="fixed inset-0 z-[150] bg-black/90 backdrop-blur-md p-4 flex items-center justify-center">
      <div className="w-full max-w-xl rounded-3xl border border-amber-500/30 bg-[#090909] text-white shadow-2xl p-6 sm:p-8">
        <div className="flex items-start gap-3 mb-6">
          <div className="h-11 w-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
            <MapPin className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-xl font-black gradient-text-gold">Delivery address required</h2>
            <p className="text-sm text-white/45 mt-1">
              Every Virelle production account must keep a delivery address for physical designer-item purchases. It can be edited or deleted later from checkout.
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          {[
            ["recipientName", "Recipient name *", "name"],
            ["phone", "Phone", "tel"],
            ["addressLine1", "Address line 1 *", "address-line1"],
            ["addressLine2", "Address line 2", "address-line2"],
            ["city", "City *", "address-level2"],
            ["stateRegion", "State / region *", "address-level1"],
            ["postalCode", "Postcode *", "postal-code"],
            ["country", "Country *", "country-name"],
          ].map(([key, label, autoComplete]) => (
            <div key={key} className={`space-y-1.5 ${key === "addressLine1" || key === "addressLine2" ? "sm:col-span-2" : ""}`}>
              <Label className="text-xs text-white/60">{label}</Label>
              <Input
                value={(address as any)[key]}
                onChange={(event) => setAddress((current) => ({ ...current, [key]: event.target.value }))}
                autoComplete={autoComplete}
                className="bg-black border-amber-500/20"
              />
            </div>
          ))}
        </div>

        <Button onClick={save} disabled={!complete || createAddress.isPending} className="w-full mt-6 bg-amber-500 hover:bg-amber-400 text-black font-black h-11">
          <Save className="h-4 w-4 mr-2" />
          {signupGate ? "Save address and continue signup" : "Save delivery address"}
        </Button>
      </div>
    </div>
  );
}
