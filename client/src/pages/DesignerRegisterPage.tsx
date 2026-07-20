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
  CheckCircle2,
  CreditCard,
  Loader2,
  ShieldCheck,
  Store,
  Wallet,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const DRAFT_KEY = "virelle_designer_registration_draft";

const INTENDED_USES = [
  ["film", "Film production"],
  ["television", "Television"],
  ["live_broadcast", "Live broadcast"],
  ["commercials", "Commercials"],
  ["advertising", "Advertising"],
  ["theatre", "Theatre / stage"],
  ["music_video", "Music videos"],
  ["editorial", "Editorial / fashion"],
  ["social_media", "Social media"],
  ["corporate", "Corporate production"],
  ["other", "Other"],
] as const;

const PROFILE_TYPES = [
  ["designer", "Fashion designer"],
  ["costume_designer", "Costume designer"],
  ["stylist", "Stylist"],
  ["wardrobe_department", "Wardrobe department"],
  ["brand", "Fashion brand"],
  ["production_designer", "Production designer"],
  ["other", "Other"],
] as const;

type RegistrationForm = {
  legalName: string;
  dateOfBirth: string;
  companyName: string;
  companyAddress: string;
  brandName: string;
  displayName: string;
  profileType: string;
  intendedUses: string[];
  bio: string;
  website: string;
  instagram: string;
  contactEmail: string;
  logoUrl: string;
  accessMode: "designer_only" | "hybrid";
};

const emptyForm: RegistrationForm = {
  legalName: "",
  dateOfBirth: "",
  companyName: "",
  companyAddress: "",
  brandName: "",
  displayName: "",
  profileType: "designer",
  intendedUses: [],
  bio: "",
  website: "",
  instagram: "",
  contactEmail: "",
  logoUrl: "",
  accessMode: "designer_only",
};

function readDraft(): RegistrationForm {
  try {
    return {
      ...emptyForm,
      ...JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}"),
    };
  } catch {
    return emptyForm;
  }
}

function FormField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">
        {label}
        {required && <span className="ml-1 text-amber-400">*</span>}
      </Label>
      {children}
    </div>
  );
}

export default function DesignerRegisterPage() {
  const [form, setForm] = useState<RegistrationForm>(readDraft);
  const [step, setStep] = useState<"profile" | "membership" | "activating">(
    "profile",
  );
  const { data: user, isLoading: userLoading } = trpc.auth.me.useQuery();
  const { data: access, refetch: refetchAccess } =
    trpc.wardrobeMarket.portal.getAccessStatus.useQuery(undefined, {
      enabled: Boolean(user),
    });
  const { data: founding } =
    trpc.wardrobeMarket.marketplace.foundingStatus.useQuery();

  const saveProfile = trpc.wardrobeMarket.portal.saveProfile.useMutation({
    onError: error => toast.error(error.message),
  });
  const subscribeDesigner =
    trpc.wardrobeMarket.designer.subscribeMembership.useMutation({
      onSuccess: data => {
        if (data.checkoutUrl) window.location.href = data.checkoutUrl;
      },
      onError: error => toast.error(error.message),
    });
  const subscribeBundle =
    trpc.wardrobeMarket.designer.subscribeBundleMembership.useMutation({
      onSuccess: data => {
        if (data.checkoutUrl) window.location.href = data.checkoutUrl;
      },
      onError: error => toast.error(error.message),
    });
  const activateMembership =
    trpc.wardrobeMarket.designer.activateMembership.useMutation({
      onError: error => {
        toast.error(error.message);
        setStep("membership");
      },
    });

  const profileValid = useMemo(
    () =>
      form.legalName.trim().length >= 2 &&
      Boolean(form.dateOfBirth) &&
      form.companyName.trim().length > 0 &&
      form.companyAddress.trim().length >= 5 &&
      form.brandName.trim().length > 0 &&
      form.intendedUses.length > 0,
    [form],
  );

  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
  }, [form]);

  useEffect(() => {
    if (!access?.active) return;
    localStorage.removeItem(DRAFT_KEY);
    window.location.replace("/designer/studio");
  }, [access?.active]);

  useEffect(() => {
    if (!user) return;
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout");
    const sessionId = params.get("session_id");
    if (checkout !== "success" || !sessionId) return;

    let cancelled = false;
    const activate = async () => {
      setStep("activating");
      try {
        await activateMembership.mutateAsync({ sessionId });
        const draft = readDraft();
        await saveProfile.mutateAsync(draft);
        await refetchAccess();
        if (!cancelled) {
          localStorage.removeItem(DRAFT_KEY);
          window.location.replace("/designer/studio");
        }
      } catch {
        if (!cancelled) setStep("membership");
      }
    };
    void activate();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const update = <K extends keyof RegistrationForm>(
    key: K,
    value: RegistrationForm[K],
  ) => setForm(current => ({ ...current, [key]: value }));

  const toggleUse = (value: string) => {
    update(
      "intendedUses",
      form.intendedUses.includes(value)
        ? form.intendedUses.filter(item => item !== value)
        : [...form.intendedUses, value],
    );
  };

  const continueToMembership = async () => {
    if (!profileValid) {
      toast.error("Complete every required Designer profile field.");
      return;
    }
    try {
      await saveProfile.mutateAsync(form);
      setStep("membership");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      // Mutation error handler shows the exact error.
    }
  };

  const startCheckout = async (mode: "designer_only" | "hybrid") => {
    const nextForm = { ...form, accessMode: mode };
    setForm(nextForm);
    try {
      await saveProfile.mutateAsync(nextForm);
      const returnUrl = `${window.location.origin}/designer-register`;
      if (mode === "hybrid") {
        await subscribeBundle.mutateAsync({ returnUrl });
      } else {
        await subscribeDesigner.mutateAsync({ returnUrl });
      }
    } catch {
      // Individual mutation handlers show errors.
    }
  };

  if (userLoading || step === "activating") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="text-center">
          <Loader2 className="mx-auto h-9 w-9 animate-spin text-amber-400" />
          <p className="mt-4 text-sm text-muted-foreground">
            {step === "activating"
              ? "Confirming your Designer membership…"
              : "Loading Designer registration…"}
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="w-full max-w-lg rounded-2xl border border-amber-500/20 bg-card p-7 text-center shadow-xl">
          <img
            src="/virelle-logo-square.png"
            alt="Virelle Studios"
            className="mx-auto h-16 w-16 rounded-xl"
          />
          <h1 className="mt-5 text-2xl font-bold">Create a Designer account</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Designer registration is attached to a secure Virelle account so your
            listings, payments and profile stay under your control.
          </p>
          <Button
            className="mt-6 w-full bg-amber-500 font-bold text-black hover:bg-amber-400"
            onClick={() =>
              (window.location.href =
                "/register?account=designer&return=%2Fdesigner-register")
            }
          >
            Create Designer login
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <button
            onClick={() =>
              (window.location.href =
                "/login?return=%2Fdesigner-register")
            }
            className="mt-4 text-sm text-amber-400 hover:underline"
          >
            Already have an account? Sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-7 flex items-center gap-3">
          <img
            src="/virelle-logo-square.png"
            alt="Virelle Studios"
            className="h-11 w-11 rounded-lg"
          />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">
              Virelle Wardrobe Marketplace
            </p>
            <h1 className="text-2xl font-bold">Designer registration</h1>
          </div>
        </div>

        <div className="mb-7 grid grid-cols-3 gap-2">
          {[
            ["1", "Profile"],
            ["2", "Membership"],
            ["3", "Payouts"],
          ].map(([number, label], index) => {
            const activeIndex = step === "profile" ? 0 : 1;
            return (
              <div
                key={label}
                className={`rounded-xl border p-3 ${
                  index <= activeIndex
                    ? "border-amber-500/40 bg-amber-500/10"
                    : "border-border bg-card"
                }`}
              >
                <p className="text-xs text-muted-foreground">Step {number}</p>
                <p className="text-sm font-semibold">{label}</p>
              </div>
            );
          })}
        </div>

        {step === "profile" ? (
          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7">
            <div className="mb-6">
              <h2 className="text-xl font-bold">Designer and company details</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                These details identify the account holder and describe how your
                work may be used across Virelle productions.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <FormField label="Full legal name" required>
                <Input
                  value={form.legalName}
                  onChange={event => update("legalName", event.target.value)}
                  placeholder="Account holder name"
                />
              </FormField>
              <FormField label="Date of birth" required>
                <Input
                  type="date"
                  value={form.dateOfBirth}
                  onChange={event => update("dateOfBirth", event.target.value)}
                />
              </FormField>
              <FormField label="Company / trading name" required>
                <Input
                  value={form.companyName}
                  onChange={event => update("companyName", event.target.value)}
                  placeholder="Company or sole-trader name"
                />
              </FormField>
              <FormField label="Public brand name" required>
                <Input
                  value={form.brandName}
                  onChange={event => update("brandName", event.target.value)}
                  placeholder="Name shown in the marketplace"
                />
              </FormField>
              <div className="sm:col-span-2">
                <FormField label="Company address" required>
                  <Textarea
                    value={form.companyAddress}
                    onChange={event =>
                      update("companyAddress", event.target.value)
                    }
                    placeholder="Street, suburb/city, state, postcode and country"
                    rows={3}
                  />
                </FormField>
              </div>
              <FormField label="Designer type" required>
                <Select
                  value={form.profileType}
                  onValueChange={value => update("profileType", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROFILE_TYPES.map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Display name">
                <Input
                  value={form.displayName}
                  onChange={event => update("displayName", event.target.value)}
                  placeholder="Optional contact or creative name"
                />
              </FormField>

              <div className="sm:col-span-2">
                <Label className="text-sm">
                  Intended use <span className="text-amber-400">*</span>
                </Label>
                <p className="mb-3 mt-1 text-xs text-muted-foreground">
                  Select every production category your designs may support.
                </p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {INTENDED_USES.map(([value, label]) => {
                    const selected = form.intendedUses.includes(value);
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => toggleUse(value)}
                        className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
                          selected
                            ? "border-amber-500/50 bg-amber-500/10 text-amber-400"
                            : "border-border hover:bg-accent"
                        }`}
                      >
                        <span
                          className={`flex h-4 w-4 items-center justify-center rounded border ${
                            selected
                              ? "border-amber-400 bg-amber-400 text-black"
                              : "border-muted-foreground/40"
                          }`}
                        >
                          {selected && <CheckCircle2 className="h-3 w-3" />}
                        </span>
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="sm:col-span-2">
                <FormField label="Company / designer bio">
                  <Textarea
                    value={form.bio}
                    onChange={event => update("bio", event.target.value)}
                    placeholder="Describe your label, collections, specialties and production experience"
                    rows={4}
                  />
                </FormField>
              </div>
              <FormField label="Contact email">
                <Input
                  type="email"
                  value={form.contactEmail}
                  onChange={event => update("contactEmail", event.target.value)}
                  placeholder={user.email || "designer@company.com"}
                />
              </FormField>
              <FormField label="Website">
                <Input
                  type="url"
                  value={form.website}
                  onChange={event => update("website", event.target.value)}
                  placeholder="https://"
                />
              </FormField>
              <FormField label="Instagram">
                <Input
                  value={form.instagram}
                  onChange={event => update("instagram", event.target.value)}
                  placeholder="@label"
                />
              </FormField>
              <FormField label="Logo URL">
                <Input
                  type="url"
                  value={form.logoUrl}
                  onChange={event => update("logoUrl", event.target.value)}
                  placeholder="Optional public logo URL"
                />
              </FormField>
            </div>

            <div className="mt-7 flex justify-end">
              <Button
                onClick={continueToMembership}
                disabled={!profileValid || saveProfile.isPending}
                className="bg-amber-500 font-bold text-black hover:bg-amber-400"
              >
                {saveProfile.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save and continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </section>
        ) : (
          <section className="space-y-5">
            <div className="rounded-2xl border border-border bg-card p-5 sm:p-7">
              <h2 className="text-xl font-bold">Choose account access</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                The Designer plan is restricted to Designer Studio and the
                Wardrobe Marketplace. The bundle also unlocks filmmaker tools.
              </p>

              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Store className="h-6 w-6 text-amber-400" />
                      <h3 className="font-bold">Designer only</h3>
                    </div>
                    {founding?.foundingActive && (
                      <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-400">
                        {founding.spotsRemaining} founding spots
                      </span>
                    )}
                  </div>
                  <p className="mt-4 text-3xl font-black">
                    A${founding?.foundingActive ? "150" : "299"}
                    <span className="text-sm font-normal text-muted-foreground">
                      /year
                    </span>
                  </p>
                  <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                    <li>Designer Studio and listing manager</li>
                    <li>Wardrobe Marketplace access</li>
                    <li>Stripe Connect payouts</li>
                    <li>95% of each lease payment</li>
                    <li>No access to filmmaking production tools</li>
                  </ul>
                  <Button
                    onClick={() => startCheckout("designer_only")}
                    disabled={
                      saveProfile.isPending || subscribeDesigner.isPending
                    }
                    className="mt-6 w-full bg-amber-500 font-bold text-black hover:bg-amber-400"
                  >
                    {(saveProfile.isPending ||
                      subscribeDesigner.isPending) && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Continue to secure payment
                  </Button>
                </div>

                <div className="rounded-2xl border border-border bg-card p-5">
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-6 w-6 text-violet-400" />
                    <h3 className="font-bold">Designer + Filmmaker</h3>
                  </div>
                  <p className="mt-4 text-3xl font-black">
                    A$1,431.20
                    <span className="text-sm font-normal text-muted-foreground">
                      /year
                    </span>
                  </p>
                  <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                    <li>Every Designer feature</li>
                    <li>Virelle Indie filmmaker plan</li>
                    <li>Film-production workspace and AI tools</li>
                    <li>20% bundle discount</li>
                    <li>Hybrid access to both workspaces</li>
                  </ul>
                  <Button
                    variant="outline"
                    onClick={() => startCheckout("hybrid")}
                    disabled={saveProfile.isPending || subscribeBundle.isPending}
                    className="mt-6 w-full"
                  >
                    {(saveProfile.isPending || subscribeBundle.isPending) && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Choose bundle
                  </Button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setStep("profile")}
                className="mt-5 text-sm text-muted-foreground hover:text-foreground"
              >
                ← Edit Designer details
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                [ShieldCheck, "Secure checkout", "Stripe-hosted payment"],
                [Wallet, "Direct payouts", "Connect your bank after payment"],
                [CheckCircle2, "Connected listings", "Saved into the live marketplace"],
              ].map(([Icon, title, description]) => {
                const FeatureIcon = Icon as typeof ShieldCheck;
                return (
                  <div
                    key={String(title)}
                    className="rounded-xl border border-border bg-card p-4"
                  >
                    <FeatureIcon className="h-5 w-5 text-amber-400" />
                    <p className="mt-2 text-sm font-semibold">{String(title)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {String(description)}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
