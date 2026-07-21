import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  ImagePlus,
  Loader2,
  LockKeyhole,
  LogIn,
  Sparkles,
  Store,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

const LOGO_URL = "/virelle-logo-square.png";

type Stage = "account" | "membership" | "payouts" | "done";

const STAGES: Array<{ id: Stage; label: string }> = [
  { id: "account", label: "Designer Account" },
  { id: "membership", label: "Membership" },
  { id: "payouts", label: "Stripe Payouts" },
  { id: "done", label: "Designer Portal" },
];

function imageFileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.match(/^image\/(png|jpeg|webp)$/)) {
      reject(new Error("Upload a PNG, JPEG or WebP logo."));
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      reject(new Error("Brand logo must be smaller than 8 MB."));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read the brand logo."));
    reader.readAsDataURL(file);
  });
}

function StageIndicator({ current }: { current: Stage }) {
  const currentIndex = STAGES.findIndex((stage) => stage.id === current);
  return (
    <div className="flex items-center justify-center gap-2 mb-8 overflow-x-auto pb-1">
      {STAGES.map((stage, index) => (
        <div key={stage.id} className="flex items-center gap-2 shrink-0">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold transition-all ${
            currentIndex > index
              ? "bg-amber-500 text-black"
              : currentIndex === index
                ? "bg-amber-500/20 border-2 border-amber-500 text-amber-400"
                : "bg-white/5 border border-white/20 text-white/30"
          }`}>
            {currentIndex > index ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
          </div>
          <span className={`text-xs font-medium hidden sm:block ${currentIndex >= index ? "text-white/70" : "text-white/20"}`}>
            {stage.label}
          </span>
          {index < STAGES.length - 1 && <ChevronRight className="h-4 w-4 text-white/20 mx-1" />}
        </div>
      ))}
    </div>
  );
}

export default function DesignerRegisterPage() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const me = trpc.auth.me.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });
  const portal = trpc.wardrobeMarket.commerce.portal.status.useQuery(undefined, {
    enabled: Boolean(me.data),
    retry: false,
  });
  const isDesigner = portal.data?.portal === "designer" || portal.data?.portal === "admin";

  const membership = trpc.wardrobeMarket.designer.getMembershipStatus.useQuery(undefined, {
    enabled: Boolean(me.data && isDesigner),
    retry: false,
  });
  const connect = trpc.wardrobeMarket.designer.getConnectStatus.useQuery(undefined, {
    enabled: Boolean(me.data && isDesigner),
    retry: false,
  });
  const founding = trpc.wardrobeMarket.marketplace.foundingStatus.useQuery(undefined, { retry: false });

  const registerDesigner = trpc.wardrobeMarket.designerAuth.register.useMutation();
  const subscribe = trpc.wardrobeMarket.designer.subscribeMembership.useMutation();
  const subscribeBundle = trpc.wardrobeMarket.designer.subscribeBundleMembership.useMutation();
  const activate = trpc.wardrobeMarket.designer.activateMembership.useMutation();
  const onboard = trpc.wardrobeMarket.designer.onboardConnect.useMutation();

  const [manualStage, setManualStage] = useState<Stage | null>(null);
  const [busy, setBusy] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [brandName, setBrandName] = useState("");
  const [username, setUsername] = useState("");
  const [abn, setAbn] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [profileType, setProfileType] = useState("designer");
  const [bio, setBio] = useState("");
  const [website, setWebsite] = useState("");
  const [instagram, setInstagram] = useState("");
  const [logoDataUrl, setLogoDataUrl] = useState("");
  const [businessAddressLine1, setBusinessAddressLine1] = useState("");
  const [businessAddressLine2, setBusinessAddressLine2] = useState("");
  const [businessCity, setBusinessCity] = useState("");
  const [businessStateRegion, setBusinessStateRegion] = useState("");
  const [businessPostalCode, setBusinessPostalCode] = useState("");
  const [businessCountry, setBusinessCountry] = useState("Australia");

  const derivedStage: Stage = useMemo(() => {
    if (!me.data || !isDesigner) return "account";
    if (membership.data?.status !== "active") return "membership";
    if (!connect.data?.chargesEnabled || !connect.data?.payoutsEnabled) return "payouts";
    return "done";
  }, [connect.data?.chargesEnabled, connect.data?.payoutsEnabled, isDesigner, me.data, membership.data?.status]);
  const stage = manualStage ?? derivedStage;

  const returnUrl = `${window.location.origin}/designer-register`;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkoutStatus = params.get("checkout");
    const sessionId = params.get("session_id");
    if (checkoutStatus === "success" && sessionId && me.data && isDesigner && !activate.isPending) {
      setBusy(true);
      activate.mutate(
        { sessionId },
        {
          onSuccess: async () => {
            toast.success("Designer membership activated.");
            window.history.replaceState({}, "", "/designer-register");
            await Promise.all([
              utils.wardrobeMarket.designer.getMembershipStatus.invalidate(),
              utils.wardrobeMarket.commerce.designer.profile.invalidate(),
            ]);
            setManualStage("payouts");
            setBusy(false);
          },
          onError: (error) => {
            toast.error(error.message);
            setBusy(false);
          },
        },
      );
    } else if (checkoutStatus === "cancelled") {
      toast.info("Checkout cancelled — no charge was made.");
      window.history.replaceState({}, "", "/designer-register");
    }
  }, [isDesigner, me.data]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("connect") === "done") {
      toast.success("Stripe payout setup returned successfully. Verifying account status.");
      window.history.replaceState({}, "", "/designer-register");
      connect.refetch();
      setManualStage(null);
    }
  }, []);

  const validateRegistration = () => {
    if (!fullName.trim() || !email.trim() || !brandName.trim() || !username.trim()) return "Full name, email, brand name and username are required.";
    if (password.length < 8 || password !== confirmPassword) return "Passwords must match and contain at least 8 characters.";
    if (!/^\d{11}$/.test(abn.replace(/\s+/g, ""))) return "Enter a valid 11-digit ABN.";
    if (!contactEmail.trim()) return "Business contact email is required.";
    if (!logoDataUrl) return "Upload your brand logo.";
    if (!businessAddressLine1.trim() || !businessCity.trim() || !businessStateRegion.trim() || !businessPostalCode.trim() || !businessCountry.trim()) {
      return "Complete the business address.";
    }
    return null;
  };

  const handleDesignerRegistration = async (event: React.FormEvent) => {
    event.preventDefault();
    const error = validateRegistration();
    if (error) {
      toast.error(error);
      return;
    }
    setBusy(true);
    try {
      const result = await registerDesigner.mutateAsync({
        email: email.trim().toLowerCase(),
        password,
        fullName: fullName.trim(),
        phone: phone.trim() || undefined,
        brandName: brandName.trim(),
        username: username.trim(),
        abn: abn.replace(/\s+/g, ""),
        contactEmail: contactEmail.trim().toLowerCase(),
        profileType,
        bio: bio.trim() || undefined,
        website: website.trim() || undefined,
        instagram: instagram.trim() || undefined,
        logoDataUrl,
        businessAddressLine1: businessAddressLine1.trim(),
        businessAddressLine2: businessAddressLine2.trim() || undefined,
        businessCity: businessCity.trim(),
        businessStateRegion: businessStateRegion.trim(),
        businessPostalCode: businessPostalCode.trim(),
        businessCountry: businessCountry.trim(),
      });
      await utils.auth.me.invalidate();
      toast.success("Designer account created. Choose your marketplace membership.");
      window.location.assign(result.redirect || "/designer-register?account=created");
    } catch (registrationError) {
      toast.error(registrationError instanceof Error ? registrationError.message : "Designer registration failed.");
      setBusy(false);
    }
  };

  const startMembership = async (bundle: boolean) => {
    setBusy(true);
    try {
      const result = bundle
        ? await subscribeBundle.mutateAsync({ returnUrl })
        : await subscribe.mutateAsync({ returnUrl });
      if (!result.checkoutUrl) throw new Error("Stripe checkout URL was not returned.");
      window.location.href = result.checkoutUrl;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not start membership checkout.");
      setBusy(false);
    }
  };

  const startPayoutOnboarding = async () => {
    setBusy(true);
    try {
      const result = await onboard.mutateAsync({
        returnUrl: `${window.location.origin}/designer-register?connect=done`,
        refreshUrl: `${window.location.origin}/designer-register?connect=refresh`,
      });
      if (!result.onboardingUrl) throw new Error("Stripe onboarding URL was not returned.");
      window.location.href = result.onboardingUrl;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not start Stripe payout setup.");
      setBusy(false);
    }
  };

  if (me.isLoading || portal.isLoading || busy) {
    return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="h-9 w-9 animate-spin text-amber-400" /></div>;
  }

  return (
    <div className="min-h-screen text-white flex flex-col" style={{ background:"linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)" }}>
      <header className="border-b border-amber-500/20 px-6 py-4 flex items-center gap-3">
        <button onClick={() => setLocation("/")} className="flex items-center gap-2.5">
          <img src={LOGO_URL} alt="Virelle Studios" className="h-8 w-8 rounded object-contain" />
          <span className="text-sm font-black tracking-tighter uppercase italic">Virelle <span className="text-amber-400">Studios</span></span>
        </button>
        <span className="text-white/30 text-sm">/ Separate Designer Portal</span>
        {!me.data && <Button variant="outline" size="sm" onClick={() => setLocation("/login?designer=1")} className="ml-auto border-amber-500/30 text-amber-300"><LogIn className="h-4 w-4 mr-2" />Designer login</Button>}
      </header>

      <main className="flex-1 px-4 py-10 sm:py-14">
        <div className="w-full max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-full px-4 py-1.5 text-amber-400 text-xs font-bold mb-4"><Store className="h-3.5 w-3.5" />Designer Marketplace</div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tighter mb-3 text-gold-shimmer">Build Your Designer Store</h1>
            <p className="text-white/50 text-sm leading-relaxed max-w-xl mx-auto">Designer accounts are separate from Virelle production accounts. Designers access only listings, payouts, orders and fulfilment; production users cannot access this portal.</p>
          </div>

          <StageIndicator current={stage} />

          {stage === "account" && (
            <form onSubmit={handleDesignerRegistration} className="rounded-3xl border border-amber-500/25 bg-white/[0.025] p-5 sm:p-7 space-y-5">
              {me.data && !isDesigner ? (
                <div className="text-center py-10"><LockKeyhole className="h-10 w-10 text-amber-400 mx-auto mb-3" /><h2 className="font-black text-xl gradient-text-gold">Separate designer account required</h2><p className="text-sm text-white/45 mt-2">This signed-in account is a production-studio account. Sign out and create a separate designer account with a different email address.</p></div>
              ) : (
                <>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5"><Label>Full name *</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" className="bg-black/50 border-amber-500/20" /></div>
                    <div className="space-y-1.5"><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" className="bg-black/50 border-amber-500/20" /></div>
                    <div className="space-y-1.5"><Label>Login email *</Label><Input type="email" value={email} onChange={(e) => { setEmail(e.target.value); if (!contactEmail) setContactEmail(e.target.value); }} autoComplete="email" className="bg-black/50 border-amber-500/20" /></div>
                    <div className="space-y-1.5"><Label>Business contact email *</Label><Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="bg-black/50 border-amber-500/20" /></div>
                    <div className="space-y-1.5"><Label>Password *</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" className="bg-black/50 border-amber-500/20" /></div>
                    <div className="space-y-1.5"><Label>Confirm password *</Label><Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" className="bg-black/50 border-amber-500/20" /></div>
                  </div>

                  <div className="border-t border-amber-500/15 pt-5">
                    <h2 className="font-black flex items-center gap-2 gradient-text-gold"><Building2 className="h-4 w-4 text-amber-400" />Brand and business details</h2>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5"><Label>Brand name *</Label><Input value={brandName} onChange={(e) => setBrandName(e.target.value)} className="bg-black/50 border-amber-500/20" /></div>
                    <div className="space-y-1.5"><Label>Designer username *</Label><Input value={username} onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9._-]/g, ""))} placeholder="brand.username" className="bg-black/50 border-amber-500/20" /></div>
                    <div className="space-y-1.5"><Label>ABN *</Label><Input value={abn} onChange={(e) => setAbn(e.target.value.replace(/[^0-9 ]/g, ""))} inputMode="numeric" placeholder="11 digits" className="bg-black/50 border-amber-500/20" /></div>
                    <div className="space-y-1.5"><Label>Designer type</Label><Select value={profileType} onValueChange={setProfileType}><SelectTrigger className="bg-black/50 border-amber-500/20"><SelectValue /></SelectTrigger><SelectContent className="bg-zinc-950 border-amber-500/20"><SelectItem value="designer">Fashion Designer</SelectItem><SelectItem value="costume_designer">Costume Designer</SelectItem><SelectItem value="brand">Fashion Brand</SelectItem><SelectItem value="stylist">Stylist</SelectItem><SelectItem value="wardrobe_department">Wardrobe Department</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select></div>
                    <div className="space-y-1.5"><Label>Website</Label><Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" className="bg-black/50 border-amber-500/20" /></div>
                    <div className="space-y-1.5"><Label>Instagram</Label><Input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@brand" className="bg-black/50 border-amber-500/20" /></div>
                  </div>
                  <div className="space-y-1.5"><Label>Brand description</Label><Textarea value={bio} onChange={(e) => setBio(e.target.value)} className="bg-black/50 border-amber-500/20 min-h-24" /></div>
                  <div className="space-y-1.5"><Label>Brand logo *</Label><Input type="file" accept="image/png,image/jpeg,image/webp" onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; try { setLogoDataUrl(await imageFileToDataUrl(file)); } catch (error) { toast.error(error instanceof Error ? error.message : "Invalid logo"); } }} className="bg-black/50 border-amber-500/20" />{logoDataUrl && <div className="flex items-center gap-3 mt-2"><img src={logoDataUrl} alt="Brand logo preview" className="h-16 w-16 rounded-xl object-cover border border-amber-500/25" /><span className="text-xs text-emerald-300 flex items-center gap-1"><ImagePlus className="h-3.5 w-3.5" />Logo ready</span></div>}</div>

                  <div className="border-t border-amber-500/15 pt-5"><h2 className="font-black gradient-text-gold">Registered business address</h2></div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5 sm:col-span-2"><Label>Address line 1 *</Label><Input value={businessAddressLine1} onChange={(e) => setBusinessAddressLine1(e.target.value)} autoComplete="address-line1" className="bg-black/50 border-amber-500/20" /></div>
                    <div className="space-y-1.5 sm:col-span-2"><Label>Address line 2</Label><Input value={businessAddressLine2} onChange={(e) => setBusinessAddressLine2(e.target.value)} autoComplete="address-line2" className="bg-black/50 border-amber-500/20" /></div>
                    <div className="space-y-1.5"><Label>City *</Label><Input value={businessCity} onChange={(e) => setBusinessCity(e.target.value)} autoComplete="address-level2" className="bg-black/50 border-amber-500/20" /></div>
                    <div className="space-y-1.5"><Label>State / region *</Label><Input value={businessStateRegion} onChange={(e) => setBusinessStateRegion(e.target.value)} autoComplete="address-level1" className="bg-black/50 border-amber-500/20" /></div>
                    <div className="space-y-1.5"><Label>Postcode *</Label><Input value={businessPostalCode} onChange={(e) => setBusinessPostalCode(e.target.value)} autoComplete="postal-code" className="bg-black/50 border-amber-500/20" /></div>
                    <div className="space-y-1.5"><Label>Country *</Label><Input value={businessCountry} onChange={(e) => setBusinessCountry(e.target.value)} autoComplete="country-name" className="bg-black/50 border-amber-500/20" /></div>
                  </div>

                  <Button type="submit" disabled={registerDesigner.isPending} className="w-full h-11 bg-amber-500 hover:bg-amber-400 text-black font-black">Create separate designer account <ArrowRight className="h-4 w-4 ml-2" /></Button>
                  <p className="text-center text-xs text-white/35">Already registered? <button type="button" onClick={() => setLocation("/login?designer=1")} className="text-amber-400 hover:underline">Designer login</button></p>
                </>
              )}
            </form>
          )}

          {stage === "membership" && (
            <div className="space-y-4">
              <div className="text-center mb-4"><CreditCard className="h-10 w-10 text-amber-400 mx-auto mb-3" /><h2 className="text-2xl font-black gradient-text-gold">Choose Your Designer Plan</h2><p className="text-sm text-white/45 mt-1">Existing Virelle membership options are preserved.</p></div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-amber-500/25 bg-white/[0.025] p-5 space-y-4"><div className="flex justify-between gap-3"><div><p className="font-black">Designer Membership</p><p className="text-xs text-white/40">Marketplace portal only</p></div><div className="text-right">{founding.data?.foundingActive === false ? <p className="text-xl font-black">A$299<span className="text-xs text-white/40">/yr</span></p> : <><p className="text-xl font-black text-amber-400">A$150<span className="text-xs text-white/40">/yr</span></p><p className="text-[10px] text-white/30 line-through">A$299/yr</p></>}</div></div><ul className="space-y-2 text-xs text-white/55">{["Unlimited item and collection listings", "Physical and virtual product support", "95% of each sale paid through Stripe Connect", "Order and fulfilment workspace"].map((item) => <li key={item} className="flex gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-amber-400 shrink-0" />{item}</li>)}</ul><Button onClick={() => startMembership(false)} className="w-full bg-amber-500 hover:bg-amber-400 text-black font-black">{founding.data?.foundingActive === false ? "Subscribe — A$299/yr" : "Join Founding Plan — A$150/yr"}</Button></div>
                <div className="rounded-2xl border-2 border-amber-500/40 bg-amber-500/5 p-5 space-y-4"><div className="flex justify-between gap-3"><div><p className="font-black">Designer + Filmmaker Bundle</p><p className="text-xs text-white/40">Designer portal plus Virelle Indie</p></div><div className="text-right"><p className="text-xl font-black text-amber-400">A$1,431<span className="text-xs text-white/40">/yr</span></p><p className="text-[10px] text-white/30 line-through">A$1,789/yr</p></div></div><ul className="space-y-2 text-xs text-white/55">{["Everything in Designer Membership", "Separate filmmaker access through the bundle", "Virelle Indie production tools", "20% combined-plan discount"].map((item) => <li key={item} className="flex gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-amber-400 shrink-0" />{item}</li>)}</ul><Button onClick={() => startMembership(true)} className="w-full bg-amber-500 hover:bg-amber-400 text-black font-black">Get Bundle — A$1,431/yr</Button></div>
              </div>
              <p className="text-center text-xs text-white/30">Stripe secures membership payments. No listing can be published until membership and payout setup are active.</p>
            </div>
          )}

          {stage === "payouts" && (
            <div className="rounded-3xl border border-amber-500/25 bg-white/[0.025] p-7 text-center space-y-5 max-w-xl mx-auto"><Wallet className="h-12 w-12 text-amber-400 mx-auto" /><div><h2 className="text-2xl font-black gradient-text-gold">Connect Your Payout Account</h2><p className="text-sm text-white/50 mt-2 leading-relaxed">Enter your bank and account details directly inside Stripe Connect. Virelle does not store your banking credentials.</p></div><div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-left text-sm text-emerald-200"><p className="font-bold">Automatic payment split</p><p className="text-xs mt-1 text-emerald-200/70">Stripe sends 95% of each purchase directly to your connected Stripe account and retains Virelle's 5% commission in the Virelle Stripe account.</p></div><Button onClick={startPayoutOnboarding} className="w-full h-11 bg-amber-500 hover:bg-amber-400 text-black font-black">Set up bank payouts in Stripe <ArrowRight className="h-4 w-4 ml-2" /></Button><p className="text-[11px] text-white/30">Listings remain private until Stripe confirms that charges and payouts are enabled.</p></div>
          )}

          {stage === "done" && (
            <div className="rounded-3xl border border-amber-500/25 bg-white/[0.025] p-8 text-center space-y-5 max-w-xl mx-auto"><div className="w-16 h-16 rounded-full bg-amber-500/15 flex items-center justify-center mx-auto"><Sparkles className="h-8 w-8 text-amber-400" /></div><div><h2 className="text-2xl font-black gradient-text-gold">Designer Portal Ready</h2><p className="text-sm text-white/50 mt-2">Your account is separated from the production studio. You can manage your brand, upload products, publish virtual or live items, and fulfil physical orders.</p></div><div className="flex flex-col gap-3"><Button onClick={() => setLocation("/designer/studio")} className="w-full h-11 bg-amber-500 hover:bg-amber-400 text-black font-black">Open Designer Portal <ArrowRight className="h-4 w-4 ml-2" /></Button><Button variant="outline" onClick={() => setLocation("/designer-wardrobe")} className="w-full border-amber-500/25 text-amber-300">Manage Designer Items</Button></div></div>
          )}
        </div>
      </main>
    </div>
  );
}
