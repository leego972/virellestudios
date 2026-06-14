/**
 * DesignerRegisterPage.tsx — v7.0
 *
 * Step-by-step wizard to join the Virelle Studios wardrobe marketplace as a designer.
 *
 * Steps:
 *  1 — Brand info (name, type, bio)
 *  2 — Membership payment (A$150/year Founding Partner price via Stripe Checkout redirect)
 *  3 — Stripe Connect onboarding (to receive payouts from leases)
 *  4 — Done + CTA to Designer Studio
 */
import { useEffect, useState } from "react";
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
  CheckCircle2,
  CreditCard,
  Store,
  Sparkles,
  ArrowRight,
  Loader2,
  ChevronRight,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

const LOGO_URL = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663418605762/hxRQQgsmyjgcByim.png";

const STEPS = [
  { id: 1, label: "Brand Profile" },
  { id: 2, label: "Membership" },
  { id: 3, label: "Set Up Payouts" },
  { id: 4, label: "All Set" },
];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {STEPS.map((step, i) => (
        <div key={step.id} className="flex items-center gap-2">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold transition-all ${
            current > step.id
              ? "bg-amber-500 text-black"
              : current === step.id
              ? "bg-amber-500/20 border-2 border-amber-500 text-amber-400"
              : "bg-white/5 border border-white/20 text-white/30"
          }`}>
            {current > step.id ? <CheckCircle2 className="h-4 w-4 text-amber-400" /> : step.id}
          </div>
          <span className={`text-xs font-medium hidden sm:block ${
            current >= step.id ? "text-white/70" : "text-white/20"
          }`}>{step.label}</span>
          {i < STEPS.length - 1 && (
            <ChevronRight className="h-4 w-4 text-white/20 mx-1" />
          )}
        </div>
      ))}
    </div>
  );
}

export default function DesignerRegisterPage() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [brandName, setBrandName] = useState("");
  const [profileType, setProfileType] = useState("designer");
  const [bio, setBio] = useState("");

  const subscribeMutation = trpc.wardrobeMarket.designer.subscribeMembership.useMutation();
  const subscribeBundleMutation = trpc.wardrobeMarket.designer.subscribeBundleMembership.useMutation();
  const { data: foundingStatus } = trpc.wardrobeMarket.marketplace.foundingStatus.useQuery();
  const activateMutation = trpc.wardrobeMarket.designer.activateMembership.useMutation();
  const onboardMutation = trpc.wardrobeMarket.designer.onboardConnect.useMutation();
  const updateBrandMutation = trpc.wardrobeMarket.designer.updateBrandProfile.useMutation();
  const { data: membershipData } = trpc.wardrobeMarket.designer.getMembershipStatus.useQuery();
  const { data: connectData } = trpc.wardrobeMarket.designer.getConnectStatus.useQuery();

  const BRAND_STORAGE_KEY = "virelle_designer_brand_draft";

  const returnUrl = `${window.location.origin}/designer-register`;

  // Handle return from Stripe Checkout
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkoutStatus = params.get("checkout");
    const sessionId = params.get("session_id");

    if (checkoutStatus === "success" && sessionId) {
      setLoading(true);
      activateMutation.mutate(
        { sessionId },
        {
          onSuccess: () => {
            // Restore brand info saved before the Stripe redirect and persist it
            try {
              const saved = localStorage.getItem(BRAND_STORAGE_KEY);
              if (saved) {
                const draft = JSON.parse(saved) as { brandName: string; profileType: string; bio: string };
                setBrandName(draft.brandName);
                setProfileType(draft.profileType);
                setBio(draft.bio);
                updateBrandMutation.mutate({
                  brandName: draft.brandName,
                  profileType: draft.profileType,
                  bio: draft.bio || null,
                });
                localStorage.removeItem(BRAND_STORAGE_KEY);
              }
            } catch {
              // ignore storage errors
            }
            toast.success("Designer membership activated!");
            window.history.replaceState({}, "", "/designer-register");
            setStep(3);
            setLoading(false);
          },
          onError: (err) => {
            toast.error(err.message);
            setLoading(false);
          },
        },
      );
    } else if (checkoutStatus === "cancelled") {
      toast.info("Checkout cancelled — you can try again whenever you're ready.");
      window.history.replaceState({}, "", "/designer-register");
    }
  }, []);

  // If already has active membership, skip to step 3 or 4
  useEffect(() => {
    if (!membershipData) return;
    if (membershipData.status === "active") {
      if (connectData?.chargesEnabled && connectData?.payoutsEnabled) {
        setStep(4);
      } else {
        setStep(3);
      }
    }
  }, [membershipData, connectData]);

  // Step 1 → save brand info locally + move to step 2
  function handleBrandInfoSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!brandName.trim()) {
      toast.error("Please enter your brand name.");
      return;
    }
    setStep(2);
  }

  // Step 2 → save brand info to localStorage then redirect to Stripe Checkout
  async function handleSubscribe() {
    setLoading(true);
    try {
      // Persist brand data so it survives the Stripe redirect
      localStorage.setItem(BRAND_STORAGE_KEY, JSON.stringify({ brandName, profileType, bio }));
      const result = await subscribeMutation.mutateAsync({ returnUrl });
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      }

    } catch (err: any) {
      toast.error(err.message || "Could not start checkout");
      setLoading(false);
    }
  }

  // Step 2 bundle — Designer membership + Virelle Indie, 20% off
  async function handleSubscribeBundle() {
    setLoading(true);
    try {
      localStorage.setItem(BRAND_STORAGE_KEY, JSON.stringify({ brandName, profileType, bio }));
      const result = await subscribeBundleMutation.mutateAsync({ returnUrl });
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      }
    } catch (err: any) {
      toast.error(err.message || "Could not start checkout");
      setLoading(false);
    }
  }

  // Step 3 → open Stripe Connect onboarding
  async function handleConnectOnboard() {
    setLoading(true);
    try {
      const result = await onboardMutation.mutateAsync({
        returnUrl: `${window.location.origin}/designer-register?connect=done`,
        refreshUrl: `${window.location.origin}/designer-register?connect=refresh`,
      });
      if (result.onboardingUrl) {
        window.location.href = result.onboardingUrl;
      }
    } catch (err: any) {
      toast.error(err.message || "Could not start payout setup");
      setLoading(false);
    }
  }

  // Handle return from Stripe Connect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connectStatus = params.get("connect");
    if (connectStatus === "done") {
      toast.success("Payout setup complete! You can now start listing collections.");
      window.history.replaceState({}, "", "/designer-register");
      setStep(4);
    }
  }, []);

  return (
    <div className="min-h-screen text-white flex flex-col" style={{ background:"linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)" }}>
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-4 flex items-center gap-3">
        <button onClick={() => setLocation("/")} className="flex items-center gap-2.5">
          <img src={LOGO_URL} alt="Virelle Studios" className="h-7 w-7 rounded object-contain" onError={(e) => (e.currentTarget.style.display = "none")} />
          <span className="text-sm font-black tracking-tighter uppercase italic">
            Virelle <span className="text-amber-400">Studios</span>
          </span>
        </button>
        <span className="text-white/30 text-sm">/ Join as Designer</span>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">
          {/* Hero */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-full px-4 py-1.5 text-amber-400 text-xs font-bold mb-4">
              <Store className="h-3.5 w-3.5" />
              Designer Marketplace
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tighter mb-3 text-gold-shimmer">
              List Your Collections
            </h1>
            <p className="text-white/50 text-sm leading-relaxed max-w-sm mx-auto">
              Fashion and costume designers earn recurring income by licensing their
              work to film productions worldwide. A$150/year founding price — 95% of every lease goes to you.
            </p>
          </div>

          <StepIndicator current={step} />

          {loading && (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
            </div>
          )}

          {/* ── Step 1: Brand Info ── */}
          {!loading && step === 1 && (
            <form onSubmit={handleBrandInfoSubmit} className="space-y-5 bg-white/3 border border-white/10 rounded-2xl p-6">
              <div>
                <Label className="text-white/80 text-sm mb-1.5 block">Brand / Studio Name *</Label>
                <Input
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="e.g. Cassidy Couture"
                  className="bg-white/5 border-white/15 text-white placeholder-white/30"
                  maxLength={255}
                  required
                />
              </div>

              <div>
                <Label className="text-white/80 text-sm mb-1.5 block">Designer Type</Label>
                <Select value={profileType} onValueChange={setProfileType}>
                  <SelectTrigger className="bg-white/5 border-white/15 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/20">
                    <SelectItem value="designer">Fashion Designer</SelectItem>
                    <SelectItem value="costume_designer">Costume Designer</SelectItem>
                    <SelectItem value="stylist">Stylist</SelectItem>
                    <SelectItem value="wardrobe_department">Wardrobe Department</SelectItem>
                    <SelectItem value="brand">Fashion Brand</SelectItem>
                    <SelectItem value="production_designer">Production Designer</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-white/80 text-sm mb-1.5 block">Bio / Description</Label>
                <Textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell productions about your style and specialty..."
                  rows={3}
                  className="bg-white/5 border-white/15 text-white placeholder-white/30 resize-none"
                  maxLength={2000}
                />
              </div>

              <Button type="submit" className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold h-11">
                Continue <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </form>
          )}

          {/* ── Step 2: Membership Payment ── */}
            {!loading && step === 2 && (
              <div className="space-y-4">
                <div className="text-center mb-2">
                  <CreditCard className="h-9 w-9 text-amber-400 mx-auto mb-3" />
                  <h2 className="text-xl font-black mb-1 gradient-text-gold">Choose Your Plan</h2>
                  <p className="text-white/50 text-sm">Unlock the marketplace, or bundle with Virelle filmmaker tools.</p>
                </div>

                {/* Card 1 — Designer Membership Only */}
                <div className="bg-white/3 border border-white/10 rounded-2xl p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-white">Designer Membership</p>
                      <p className="text-white/40 text-xs mt-0.5">Marketplace access only</p>
                    </div>
                    <div className="text-right shrink-0">
                      {foundingStatus?.foundingActive === false ? (
                        <p className="text-lg font-black text-white">A$299<span className="text-xs font-normal text-white/40">/yr</span></p>
                      ) : (
                        <>
                          <p className="text-lg font-black text-amber-400">A$150<span className="text-xs font-normal text-white/40">/yr</span></p>
                          <p className="text-[10px] text-white/30 line-through">A$299/yr</p>
                        </>
                      )}
                    </div>
                  </div>
                  <ul className="space-y-1.5 text-xs text-white/60">
                    {["List unlimited collections & items", "Get discovered by film productions", "95% of every lease via Stripe"].map(f => (
                      <li key={f} className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-amber-400 shrink-0" />{f}</li>
                    ))}
                  </ul>
                  <Button onClick={handleSubscribe} variant="outline" className="w-full border-white/20 text-white hover:bg-white/5 font-semibold hover:border-amber-500/50 hover:text-amber-400">
                    {foundingStatus?.foundingActive === false ? "Subscribe — A$299/yr" : "Join as Founding Partner — A$150/yr"}
                  </Button>
                </div>

                {/* Card 2 — Bundle Deal (highlighted) */}
                <div className="relative bg-amber-500/5 border-2 border-amber-500/40 rounded-2xl p-5 space-y-3">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-amber-500 text-black text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wide">
                      Best Value — 20% Off
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-2 pt-1">
                    <div>
                      <p className="font-bold text-white">Designer + Filmmaker Bundle</p>
                      <p className="text-white/40 text-xs mt-0.5">Marketplace + Virelle Indie plan</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-black text-amber-400">A$1,431<span className="text-xs font-normal text-white/40">/yr</span></p>
                      <p className="text-[10px] text-white/30 line-through">A$1,789/yr</p>
                    </div>
                  </div>
                  <ul className="space-y-1.5 text-xs text-white/60">
                    {[
                      "Everything in Designer Membership",
                      "Virelle Indie — filmmaker tools & AI scene generation",
                      "500 generation credits/month",
                      "Create & publish your own film projects",
                    ].map(f => (
                      <li key={f} className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-amber-400 shrink-0" />{f}</li>
                    ))}
                  </ul>
                  <Button onClick={handleSubscribeBundle} className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold">
                    Get the Bundle — A$1,431/yr <ArrowRight className="h-4 w-4 ml-1.5" />
                  </Button>
                </div>

                <button onClick={() => setStep(1)} className="w-full text-xs text-white/30 hover:text-white/60 transition-colors pt-1">
                  ← Back to brand profile
                </button>
                <p className="text-center text-xs text-white/30">Secured by Stripe. Renews automatically each year.</p>
              </div>
            )}

          {/* ── Step 3: Connect Onboarding ── */}
          {!loading && step === 3 && (
            <div className="bg-white/3 border border-white/10 rounded-2xl p-6 space-y-5 text-center">
              <Wallet className="h-10 w-10 text-amber-400 mx-auto" />
              <div>
                <h2 className="text-xl font-black mb-2 gradient-text-gold">Set Up Your Payouts</h2>
                <p className="text-white/50 text-sm leading-relaxed">
                  Connect a bank account via Stripe so lease payments land directly in your account.
                  This takes about 3 minutes.
                </p>
              </div>
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3 flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
                <span className="text-green-300">Membership active — you can now publish collections</span>
              </div>
              <Button onClick={handleConnectOnboard} className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold h-11">
                Set Up Payouts via Stripe
              </Button>
              <button
                onClick={() => setStep(4)}
                className="text-xs text-white/30 hover:text-white/60 transition-colors"
              >
                Skip for now — do this later in Designer Studio
              </button>
            </div>
          )}

          {/* ── Step 4: Done ── */}
          {!loading && step === 4 && (
            <div className="bg-white/3 border border-white/10 rounded-2xl p-8 text-center space-y-5">
              <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto">
                <Sparkles className="h-8 w-8 text-amber-400" />
              </div>
              <div>
                <h2 className="text-2xl font-black mb-2 gradient-text-gold">You're a Virelle Designer!</h2>
                <p className="text-white/50 text-sm">
                  Your designer studio is ready. Start adding items, pricing collections,
                  and publishing to the marketplace.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <Button
                  onClick={() => setLocation("/designer/studio")}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold h-11"
                >
                  Open Designer Studio <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setLocation("/wardrobe-marketplace")}
                  className="w-full border-white/15 text-white/70 hover:bg-white/5"
                >
                  Browse the Marketplace
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
