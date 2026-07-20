import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertCircle,
  CheckCircle2,
  DollarSign,
  Edit3,
  ExternalLink,
  ImagePlus,
  Loader2,
  Package,
  Plus,
  Save,
  Store,
  Trash2,
  UploadCloud,
  UserRound,
  Wallet,
} from "lucide-react";
import {
  DragEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

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

const CATEGORIES = [
  "outerwear",
  "top",
  "bottom",
  "dress",
  "suit",
  "shoes",
  "accessory",
  "jewellery",
  "bag",
  "hat",
  "uniform",
  "costume",
  "armour",
  "robe",
  "fabric",
  "set_dressing",
  "shopfront_display",
  "other",
];

const WARDROBE_TYPES = [
  "fashion",
  "costume",
  "period_costume",
  "uniform",
  "fantasy_sci_fi",
  "character_signature",
  "background_extra",
  "accessory",
  "textile",
  "shopfront_display",
  "set_dressing",
  "other",
];

type Tab = "overview" | "listings" | "profile" | "payouts";

type ProfileForm = {
  legalName: string;
  dateOfBirth: string;
  companyName: string;
  companyAddress: string;
  brandName: string;
  displayName: string;
  profileType: string;
  intendedUses: string[];
  accessMode: "designer_only" | "hybrid";
  bio: string;
  website: string;
  instagram: string;
  contactEmail: string;
  logoUrl: string;
};

type ListingForm = {
  id?: number;
  name: string;
  description: string;
  category: string;
  subcategory: string;
  wardrobeType: string;
  genderFit: string;
  sizeRange: string;
  era: string;
  colors: string;
  materials: string;
  styleTags: string;
  imageUrls: string[];
  retailPrice: string;
  leasePrice: string;
  collectionId: string;
  publish: boolean;
  commercialUseAllowed: boolean;
  brandPlacementAllowed: boolean;
  shopfrontPlacementAllowed: boolean;
  characterWardrobeAllowed: boolean;
  costumeUseAllowed: boolean;
  licenseType: string;
  licenseNotes: string;
};

const emptyProfile: ProfileForm = {
  legalName: "",
  dateOfBirth: "",
  companyName: "",
  companyAddress: "",
  brandName: "",
  displayName: "",
  profileType: "designer",
  intendedUses: [],
  accessMode: "designer_only",
  bio: "",
  website: "",
  instagram: "",
  contactEmail: "",
  logoUrl: "",
};

const emptyListing: ListingForm = {
  name: "",
  description: "",
  category: "costume",
  subcategory: "",
  wardrobeType: "costume",
  genderFit: "",
  sizeRange: "",
  era: "",
  colors: "",
  materials: "",
  styleTags: "",
  imageUrls: [],
  retailPrice: "",
  leasePrice: "",
  collectionId: "",
  publish: true,
  commercialUseAllowed: true,
  brandPlacementAllowed: true,
  shopfrontPlacementAllowed: true,
  characterWardrobeAllowed: true,
  costumeUseAllowed: true,
  licenseType: "full_license",
  licenseNotes: "",
};

function money(cents: number | null | undefined) {
  return `A$${((cents ?? 0) / 100).toFixed(2)}`;
}

function splitValues(value: string) {
  return value
    .split(",")
    .map(item => item.trim())
    .filter(Boolean);
}

function jsonStrings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter(item => typeof item === "string")
    : [];
}

function SectionTitle({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="text-xl font-bold">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

function Field({
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
      <Label>
        {label}
        {required && <span className="ml-1 text-amber-400">*</span>}
      </Label>
      {children}
    </div>
  );
}

export default function DesignerStudioPage() {
  const initialTab = (() => {
    const value = new URLSearchParams(window.location.search).get("tab");
    return ["overview", "listings", "profile", "payouts"].includes(
      value || "",
    )
      ? (value as Tab)
      : "overview";
  })();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [profileForm, setProfileForm] = useState<ProfileForm>(emptyProfile);
  const [listingForm, setListingForm] = useState<ListingForm>(emptyListing);
  const [showListingEditor, setShowListingEditor] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  const {
    data: access,
    isLoading: accessLoading,
    refetch: refetchAccess,
  } = trpc.wardrobeMarket.portal.getAccessStatus.useQuery();
  const { data: listings = [], isLoading: listingsLoading } =
    trpc.wardrobeMarket.portal.listMyListings.useQuery(undefined, {
      enabled: Boolean(access?.active),
    });
  const { data: collections = [] } =
    trpc.wardrobeMarket.portal.listMyCollections.useQuery(undefined, {
      enabled: Boolean(access?.active),
    });
  const { data: connectStatus, refetch: refetchConnect } =
    trpc.wardrobeMarket.designer.getConnectStatus.useQuery(undefined, {
      enabled: Boolean(access?.active),
    });
  const { data: earnings } =
    trpc.wardrobeMarket.designer.getEarnings.useQuery(undefined, {
      enabled: Boolean(access?.active),
    });

  const saveProfile = trpc.wardrobeMarket.portal.saveProfile.useMutation({
    onSuccess: async () => {
      toast.success("Designer profile saved");
      await refetchAccess();
    },
    onError: error => toast.error(error.message),
  });
  const uploadImage =
    trpc.wardrobeMarket.portal.uploadListingImage.useMutation();
  const createListing =
    trpc.wardrobeMarket.portal.createListing.useMutation({
      onSuccess: async () => {
        toast.success("Designer listing saved");
        setListingForm(emptyListing);
        setShowListingEditor(false);
        await utils.wardrobeMarket.portal.listMyListings.invalidate();
        await utils.wardrobeMarket.marketplace.searchItems.invalidate();
      },
      onError: error => toast.error(error.message),
    });
  const updateListing =
    trpc.wardrobeMarket.portal.updateListing.useMutation({
      onSuccess: async () => {
        toast.success("Designer listing updated");
        setListingForm(emptyListing);
        setShowListingEditor(false);
        await utils.wardrobeMarket.portal.listMyListings.invalidate();
        await utils.wardrobeMarket.marketplace.searchItems.invalidate();
      },
      onError: error => toast.error(error.message),
    });
  const retireListing =
    trpc.wardrobeMarket.portal.retireListing.useMutation({
      onSuccess: async () => {
        toast.success("Listing retired");
        await utils.wardrobeMarket.portal.listMyListings.invalidate();
        await utils.wardrobeMarket.marketplace.searchItems.invalidate();
      },
      onError: error => toast.error(error.message),
    });
  const onboardConnect =
    trpc.wardrobeMarket.designer.onboardConnect.useMutation({
      onSuccess: result => {
        if (result.onboardingUrl) window.location.href = result.onboardingUrl;
      },
      onError: error => toast.error(error.message),
    });

  useEffect(() => {
    if (!access) return;
    const details = access.details || {};
    const profile = access.profile as any;
    setProfileForm({
      legalName: String(details.legalName || ""),
      dateOfBirth: String(details.dateOfBirth || ""),
      companyName: String(details.companyName || ""),
      companyAddress: String(details.companyAddress || ""),
      brandName: String(profile?.brandName || ""),
      displayName: String(profile?.displayName || ""),
      profileType: String(profile?.profileType || "designer"),
      intendedUses: Array.isArray(details.intendedUses)
        ? details.intendedUses.map(String)
        : [],
      accessMode:
        details.accessMode === "hybrid" ? "hybrid" : "designer_only",
      bio: String(profile?.bio || ""),
      website: String(profile?.website || ""),
      instagram: String(profile?.instagram || ""),
      contactEmail: String(profile?.contactEmail || ""),
      logoUrl: String(profile?.logoUrl || ""),
    });
  }, [access]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("connect") === "done") {
      toast.success("Stripe payout onboarding returned successfully");
      void refetchConnect();
      window.history.replaceState({}, "", "/designer/studio?tab=payouts");
      setTab("payouts");
    }
  }, []);

  const setActiveTab = (next: Tab) => {
    setTab(next);
    const url =
      next === "overview"
        ? "/designer/studio"
        : `/designer/studio?tab=${next}`;
    window.history.replaceState({}, "", url);
  };

  const updateProfile = <K extends keyof ProfileForm>(
    key: K,
    value: ProfileForm[K],
  ) => setProfileForm(current => ({ ...current, [key]: value }));

  const updateListingField = <K extends keyof ListingForm>(
    key: K,
    value: ListingForm[K],
  ) => setListingForm(current => ({ ...current, [key]: value }));

  const profileValid = useMemo(
    () =>
      profileForm.legalName.trim().length >= 2 &&
      Boolean(profileForm.dateOfBirth) &&
      profileForm.companyName.trim().length > 0 &&
      profileForm.companyAddress.trim().length >= 5 &&
      profileForm.brandName.trim().length > 0 &&
      profileForm.intendedUses.length > 0,
    [profileForm],
  );

  const saveProfileForm = () => {
    if (!profileValid) {
      toast.error("Complete every required profile field.");
      return;
    }
    saveProfile.mutate(profileForm);
  };

  const uploadFiles = async (files: File[]) => {
    const images = files.filter(file => file.type.startsWith("image/")).slice(0, 12);
    if (images.length === 0) {
      toast.error("Drop JPG, PNG or WebP image files.");
      return;
    }
    const remaining = Math.max(0, 12 - listingForm.imageUrls.length);
    for (const file of images.slice(0, remaining)) {
      if (file.size > 8 * 1024 * 1024) {
        toast.error(`${file.name} is larger than 8 MB.`);
        continue;
      }
      try {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(file);
        });
        const result = await uploadImage.mutateAsync({
          dataUrl,
          fileName: file.name,
        });
        setListingForm(current => ({
          ...current,
          imageUrls: [...current.imageUrls, result.url].slice(0, 12),
        }));
      } catch (error: any) {
        toast.error(error?.message || `Could not upload ${file.name}`);
      }
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    void uploadFiles(Array.from(event.dataTransfer.files));
  };

  const saveListing = () => {
    const retail = Number.parseFloat(listingForm.retailPrice);
    const lease = Number.parseFloat(listingForm.leasePrice);
    if (
      !listingForm.name.trim() ||
      listingForm.description.trim().length < 5 ||
      listingForm.imageUrls.length === 0 ||
      !Number.isFinite(retail) ||
      retail < 1 ||
      !Number.isFinite(lease) ||
      lease < 0.5
    ) {
      toast.error(
        "Add a name, description, image, retail price and lease price.",
      );
      return;
    }
    const payload = {
      name: listingForm.name.trim(),
      description: listingForm.description.trim(),
      category: listingForm.category,
      subcategory: listingForm.subcategory.trim() || null,
      wardrobeType: listingForm.wardrobeType,
      genderFit: listingForm.genderFit.trim() || null,
      sizeRange: listingForm.sizeRange.trim() || null,
      era: listingForm.era.trim() || null,
      colors: splitValues(listingForm.colors),
      materials: splitValues(listingForm.materials),
      styleTags: splitValues(listingForm.styleTags),
      primaryImageUrl: listingForm.imageUrls[0],
      imageUrls: listingForm.imageUrls,
      retailPriceCents: Math.round(retail * 100),
      leasePriceCents: Math.round(lease * 100),
      collectionId: listingForm.collectionId
        ? Number(listingForm.collectionId)
        : null,
      publish: listingForm.publish,
      commercialUseAllowed: listingForm.commercialUseAllowed,
      brandPlacementAllowed: listingForm.brandPlacementAllowed,
      shopfrontPlacementAllowed: listingForm.shopfrontPlacementAllowed,
      characterWardrobeAllowed: listingForm.characterWardrobeAllowed,
      costumeUseAllowed: listingForm.costumeUseAllowed,
      licenseType: listingForm.licenseType,
      licenseNotes: listingForm.licenseNotes.trim() || null,
    };
    if (listingForm.id) {
      updateListing.mutate({ id: listingForm.id, ...payload });
    } else {
      createListing.mutate(payload);
    }
  };

  const editListing = (listing: any) => {
    setListingForm({
      id: listing.id,
      name: String(listing.name || ""),
      description: String(listing.description || ""),
      category: String(listing.category || "other"),
      subcategory: String(listing.subcategory || ""),
      wardrobeType: String(listing.wardrobeType || "fashion"),
      genderFit: String(listing.genderFit || ""),
      sizeRange: String(listing.sizeRange || ""),
      era: String(listing.era || ""),
      colors: jsonStrings(listing.colors).join(", "),
      materials: jsonStrings(listing.materials).join(", "),
      styleTags: jsonStrings(listing.styleTags).join(", "),
      imageUrls:
        jsonStrings(listing.imageUrls).length > 0
          ? jsonStrings(listing.imageUrls)
          : listing.primaryImageUrl
            ? [String(listing.primaryImageUrl)]
            : [],
      retailPrice: ((Number(listing.retailPriceAud) || 0) / 100).toFixed(2),
      leasePrice: ((Number(listing.leasePriceAud) || 0) / 100).toFixed(2),
      collectionId: listing.collectionId ? String(listing.collectionId) : "",
      publish:
        listing.visibility === "public" && listing.status === "active",
      commercialUseAllowed: Boolean(listing.commercialUseAllowed),
      brandPlacementAllowed: Boolean(listing.brandPlacementAllowed),
      shopfrontPlacementAllowed: Boolean(listing.shopfrontPlacementAllowed),
      characterWardrobeAllowed: Boolean(listing.characterWardrobeAllowed),
      costumeUseAllowed: Boolean(listing.costumeUseAllowed),
      licenseType: String(listing.licenseType || "full_license"),
      licenseNotes: String(listing.licenseNotes || ""),
    });
    setShowListingEditor(true);
    setActiveTab("listings");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const startNewListing = () => {
    setListingForm(emptyListing);
    setShowListingEditor(true);
    setActiveTab("listings");
  };

  const startPayoutOnboarding = () => {
    onboardConnect.mutate({
      returnUrl: `${window.location.origin}/designer/studio?connect=done`,
      refreshUrl: `${window.location.origin}/designer/studio?tab=payouts`,
    });
  };

  if (accessLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
      </div>
    );
  }

  if (!access?.active) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <Store className="mx-auto h-12 w-12 text-amber-400" />
        <h1 className="mt-5 text-2xl font-bold">Designer membership required</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Complete Designer registration before opening the Designer Studio,
          publishing listings or connecting payouts.
        </p>
        <Button
          className="mt-6 bg-amber-500 font-bold text-black hover:bg-amber-400"
          onClick={() => (window.location.href = "/designer-register")}
        >
          Continue Designer registration
        </Button>
      </div>
    );
  }

  const activeListings = listings.filter(
    (listing: any) =>
      listing.status === "active" && listing.visibility === "public",
  ).length;
  const connected = Boolean(
    connectStatus?.chargesEnabled && connectStatus?.payoutsEnabled,
  );

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <header className="rounded-2xl border border-amber-500/20 bg-card p-5 sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10">
              <Store className="h-6 w-6 text-amber-400" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold">
                  {(access.profile as any)?.brandName || "Designer Studio"}
                </h1>
                <Badge className="border-green-500/30 bg-green-500/10 text-green-400">
                  Active Designer
                </Badge>
                {access.accessMode === "designer_only" && (
                  <Badge variant="outline">Designer-only account</Badge>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Manage your profile, uploaded items, marketplace pricing and
                payouts.
              </p>
            </div>
          </div>
          <Button variant="outline" asChild>
            <a href="/wardrobe-marketplace">
              View marketplace
              <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </div>
      </header>

      {!access.profileCompleted && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
          <div className="flex-1">
            <p className="font-semibold">Complete your Designer profile</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Listings cannot be published until the required identity, company,
              address and intended-use fields are saved.
            </p>
          </div>
          <Button size="sm" onClick={() => setActiveTab("profile")}>
            Complete profile
          </Button>
        </div>
      )}

      <div className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1">
        {[
          ["overview", "Overview"],
          ["listings", "Listings"],
          ["profile", "Profile"],
          ["payouts", "Payouts"],
        ].map(([value, label]) => (
          <button
            key={value}
            onClick={() => setActiveTab(value as Tab)}
            className={`min-w-fit rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === value
                ? "bg-amber-500 text-black"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              [Package, "Total listings", listings.length],
              [CheckCircle2, "Published", activeListings],
              [DollarSign, "Lease earnings", money(earnings?.totalEarned)],
              [Wallet, "Payouts", connected ? "Connected" : "Action needed"],
            ].map(([Icon, label, value]) => {
              const CardIcon = Icon as typeof Package;
              return (
                <div key={String(label)} className="rounded-xl border border-border bg-card p-5">
                  <CardIcon className="h-5 w-5 text-amber-400" />
                  <p className="mt-4 text-2xl font-bold">{String(value)}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{String(label)}</p>
                </div>
              );
            })}
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-5">
              <SectionTitle
                title="Recent listings"
                description="Items saved into your connected wardrobe catalogue."
                action={
                  <Button size="sm" onClick={startNewListing}>
                    <Plus className="mr-2 h-4 w-4" /> New listing
                  </Button>
                }
              />
              <div className="mt-5 space-y-3">
                {listings.slice(0, 4).map((listing: any) => (
                  <button
                    key={listing.id}
                    onClick={() => editListing(listing)}
                    className="flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:bg-accent/50"
                  >
                    <img
                      src={listing.primaryImageUrl || "/virelle-logo-square.png"}
                      alt=""
                      className="h-12 w-12 rounded-lg object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{listing.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {money(listing.leasePriceAud)} lease · {money(listing.retailPriceAud)} retail
                      </p>
                    </div>
                    <Badge variant="outline">
                      {listing.visibility === "public" && listing.status === "active"
                        ? "Published"
                        : "Draft"}
                    </Badge>
                  </button>
                ))}
                {listings.length === 0 && (
                  <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                    No listings yet. Upload your first item.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <SectionTitle
                title="Account readiness"
                description="Everything required for live marketplace trading."
              />
              <div className="mt-5 space-y-3">
                {[
                  [access.profileCompleted, "Designer profile completed", "profile"],
                  [listings.length > 0, "At least one item uploaded", "listings"],
                  [connected, "Stripe payouts connected", "payouts"],
                ].map(([ready, label, target]) => (
                  <button
                    key={String(label)}
                    onClick={() => setActiveTab(target as Tab)}
                    className="flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left"
                  >
                    {ready ? (
                      <CheckCircle2 className="h-5 w-5 text-green-400" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-amber-400" />
                    )}
                    <span className="text-sm font-medium">{String(label)}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {ready ? "Complete" : "Open"}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "listings" && (
        <section className="space-y-5">
          <SectionTitle
            title="Designer listings"
            description="Uploaded items feed the Wardrobe Marketplace and Virelle wardrobe-reference systems."
            action={
              <Button onClick={startNewListing}>
                <Plus className="mr-2 h-4 w-4" /> Add item
              </Button>
            }
          />

          {showListingEditor && (
            <div className="rounded-2xl border border-amber-500/25 bg-card p-5 sm:p-7">
              <SectionTitle
                title={listingForm.id ? "Edit listing" : "New designer listing"}
                description="Upload item images, set pricing and save directly to your marketplace catalogue."
                action={
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setShowListingEditor(false);
                      setListingForm(emptyListing);
                    }}
                  >
                    Cancel
                  </Button>
                }
              />

              <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
                <div className="space-y-4">
                  <div
                    onDragOver={event => {
                      event.preventDefault();
                      setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex min-h-52 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-5 text-center transition-colors ${
                      dragging
                        ? "border-amber-400 bg-amber-500/10"
                        : "border-border hover:border-amber-500/50 hover:bg-accent/30"
                    }`}
                  >
                    {uploadImage.isPending ? (
                      <Loader2 className="h-9 w-9 animate-spin text-amber-400" />
                    ) : (
                      <UploadCloud className="h-9 w-9 text-amber-400" />
                    )}
                    <p className="mt-3 font-semibold">Drag and drop item images</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      JPG, PNG or WebP · 8 MB maximum each · up to 12 images
                    </p>
                    <Button type="button" variant="outline" size="sm" className="mt-4">
                      <ImagePlus className="mr-2 h-4 w-4" /> Select images
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      className="hidden"
                      onChange={event => {
                        void uploadFiles(Array.from(event.target.files || []));
                        event.target.value = "";
                      }}
                    />
                  </div>

                  {listingForm.imageUrls.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {listingForm.imageUrls.map((url, index) => (
                        <div key={url} className="group relative aspect-square overflow-hidden rounded-lg border border-border">
                          <img src={url} alt="" className="h-full w-full object-cover" />
                          {index === 0 && (
                            <span className="absolute left-1 top-1 rounded bg-black/70 px-1.5 py-0.5 text-[9px] text-white">
                              Cover
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={event => {
                              event.stopPropagation();
                              updateListingField(
                                "imageUrls",
                                listingForm.imageUrls.filter(item => item !== url),
                              );
                            }}
                            className="absolute right-1 top-1 rounded bg-black/70 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Field label="Item name" required>
                      <Input
                        value={listingForm.name}
                        onChange={event => updateListingField("name", event.target.value)}
                        placeholder="e.g. Hand-tailored emerald evening gown"
                      />
                    </Field>
                  </div>
                  <div className="sm:col-span-2">
                    <Field label="Description" required>
                      <Textarea
                        value={listingForm.description}
                        onChange={event => updateListingField("description", event.target.value)}
                        rows={4}
                        placeholder="Describe the item, cut, construction, visual details and suitable production use"
                      />
                    </Field>
                  </div>
                  <Field label="Category" required>
                    <Select
                      value={listingForm.category}
                      onValueChange={value => updateListingField("category", value)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(value => (
                          <SelectItem key={value} value={value}>
                            {value.replaceAll("_", " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Wardrobe type" required>
                    <Select
                      value={listingForm.wardrobeType}
                      onValueChange={value => updateListingField("wardrobeType", value)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {WARDROBE_TYPES.map(value => (
                          <SelectItem key={value} value={value}>
                            {value.replaceAll("_", " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Subcategory">
                    <Input value={listingForm.subcategory} onChange={event => updateListingField("subcategory", event.target.value)} />
                  </Field>
                  <Field label="Size range">
                    <Input value={listingForm.sizeRange} onChange={event => updateListingField("sizeRange", event.target.value)} placeholder="XS–XL or measurements" />
                  </Field>
                  <Field label="Gender / fit">
                    <Input value={listingForm.genderFit} onChange={event => updateListingField("genderFit", event.target.value)} placeholder="Unisex, womenswear, menswear" />
                  </Field>
                  <Field label="Era / period">
                    <Input value={listingForm.era} onChange={event => updateListingField("era", event.target.value)} placeholder="Contemporary, 1920s, medieval" />
                  </Field>
                  <Field label="Colours">
                    <Input value={listingForm.colors} onChange={event => updateListingField("colors", event.target.value)} placeholder="Emerald, gold, black" />
                  </Field>
                  <Field label="Materials">
                    <Input value={listingForm.materials} onChange={event => updateListingField("materials", event.target.value)} placeholder="Silk, wool, leather" />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="Style tags">
                      <Input value={listingForm.styleTags} onChange={event => updateListingField("styleTags", event.target.value)} placeholder="Luxury, noir, formal, cinematic" />
                    </Field>
                  </div>
                  <Field label="Retail item price (A$)" required>
                    <Input type="number" min="1" step="0.01" value={listingForm.retailPrice} onChange={event => updateListingField("retailPrice", event.target.value)} placeholder="800.00" />
                  </Field>
                  <Field label="Lease price (A$)" required>
                    <Input type="number" min="0.50" step="0.50" value={listingForm.leasePrice} onChange={event => updateListingField("leasePrice", event.target.value)} placeholder="25.00" />
                  </Field>
                  {collections.length > 0 && (
                    <div className="sm:col-span-2">
                      <Field label="Collection">
                        <Select value={listingForm.collectionId || "none"} onValueChange={value => updateListingField("collectionId", value === "none" ? "" : value)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No collection</SelectItem>
                            {collections.map((collection: any) => (
                              <SelectItem key={collection.id} value={String(collection.id)}>{collection.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                    </div>
                  )}
                  <div className="sm:col-span-2 space-y-3 rounded-xl border border-border p-4">
                    {[
                      ["commercialUseAllowed", "Commercial and advertising use"],
                      ["brandPlacementAllowed", "Visible brand placement"],
                      ["shopfrontPlacementAllowed", "Shopfront and set placement"],
                      ["characterWardrobeAllowed", "Character wardrobe use"],
                      ["costumeUseAllowed", "Costume production use"],
                      ["publish", "Publish immediately in marketplace"],
                    ].map(([key, label]) => (
                      <div key={key} className="flex items-center justify-between gap-4">
                        <Label>{label}</Label>
                        <Switch checked={Boolean(listingForm[key as keyof ListingForm])} onCheckedChange={checked => updateListingField(key as any, checked as any)} />
                      </div>
                    ))}
                  </div>
                  <div className="sm:col-span-2">
                    <Field label="License notes">
                      <Textarea value={listingForm.licenseNotes} onChange={event => updateListingField("licenseNotes", event.target.value)} rows={3} placeholder="Usage limits, attribution, exclusions or custom terms" />
                    </Field>
                  </div>
                  <div className="sm:col-span-2 flex justify-end">
                    <Button
                      onClick={saveListing}
                      disabled={createListing.isPending || updateListing.isPending || uploadImage.isPending}
                      className="bg-amber-500 font-bold text-black hover:bg-amber-400"
                    >
                      {(createListing.isPending || updateListing.isPending) ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      {listingForm.id ? "Save changes" : "Save listing"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {listings.map((listing: any) => (
              <article key={listing.id} className="overflow-hidden rounded-xl border border-border bg-card">
                <div className="aspect-[4/3] bg-muted">
                  <img src={listing.primaryImageUrl || "/virelle-logo-square.png"} alt={listing.name} className="h-full w-full object-cover" />
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold">{listing.name}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">{String(listing.category || "item").replaceAll("_", " ")}</p>
                    </div>
                    <Badge variant="outline">{listing.visibility === "public" && listing.status === "active" ? "Published" : listing.status === "retired" ? "Retired" : "Draft"}</Badge>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg bg-muted/40 p-3 text-sm">
                    <div><p className="text-xs text-muted-foreground">Retail</p><p className="font-semibold">{money(listing.retailPriceAud)}</p></div>
                    <div><p className="text-xs text-muted-foreground">Lease</p><p className="font-semibold text-amber-400">{money(listing.leasePriceAud)}</p></div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => editListing(listing)}>
                      <Edit3 className="mr-2 h-4 w-4" /> Edit
                    </Button>
                    {listing.status !== "retired" && (
                      <Button variant="ghost" size="sm" onClick={() => retireListing.mutate({ id: listing.id })} disabled={retireListing.isPending}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
          {!listingsLoading && listings.length === 0 && !showListingEditor && (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center">
              <Package className="mx-auto h-10 w-10 text-muted-foreground" />
              <h3 className="mt-4 font-semibold">No designer listings yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">Upload an item, enter its price and save it to your marketplace catalogue.</p>
              <Button className="mt-5" onClick={startNewListing}><Plus className="mr-2 h-4 w-4" /> Add first item</Button>
            </div>
          )}
        </section>
      )}

      {tab === "profile" && (
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-7">
          <SectionTitle title="Designer profile" description="Identity, company and intended-use information connected to your membership and listings." />
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <Field label="Full legal name" required><Input value={profileForm.legalName} onChange={event => updateProfile("legalName", event.target.value)} /></Field>
            <Field label="Date of birth" required><Input type="date" value={profileForm.dateOfBirth} onChange={event => updateProfile("dateOfBirth", event.target.value)} /></Field>
            <Field label="Company / trading name" required><Input value={profileForm.companyName} onChange={event => updateProfile("companyName", event.target.value)} /></Field>
            <Field label="Marketplace brand name" required><Input value={profileForm.brandName} onChange={event => updateProfile("brandName", event.target.value)} /></Field>
            <div className="sm:col-span-2"><Field label="Company address" required><Textarea rows={3} value={profileForm.companyAddress} onChange={event => updateProfile("companyAddress", event.target.value)} /></Field></div>
            <Field label="Display name"><Input value={profileForm.displayName} onChange={event => updateProfile("displayName", event.target.value)} /></Field>
            <Field label="Contact email"><Input type="email" value={profileForm.contactEmail} onChange={event => updateProfile("contactEmail", event.target.value)} /></Field>
            <Field label="Website"><Input type="url" value={profileForm.website} onChange={event => updateProfile("website", event.target.value)} /></Field>
            <Field label="Instagram"><Input value={profileForm.instagram} onChange={event => updateProfile("instagram", event.target.value)} /></Field>
            <div className="sm:col-span-2"><Field label="Bio"><Textarea rows={4} value={profileForm.bio} onChange={event => updateProfile("bio", event.target.value)} /></Field></div>
            <div className="sm:col-span-2">
              <Label>Intended use <span className="text-amber-400">*</span></Label>
              <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {INTENDED_USES.map(([value, label]) => {
                  const checked = profileForm.intendedUses.includes(value);
                  return (
                    <button key={value} type="button" onClick={() => updateProfile("intendedUses", checked ? profileForm.intendedUses.filter(item => item !== value) : [...profileForm.intendedUses, value])} className={`flex items-center gap-2 rounded-lg border p-3 text-left text-sm ${checked ? "border-amber-500/50 bg-amber-500/10 text-amber-400" : "border-border"}`}>
                      {checked ? <CheckCircle2 className="h-4 w-4" /> : <span className="h-4 w-4 rounded border border-muted-foreground/40" />}
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <Button onClick={saveProfileForm} disabled={!profileValid || saveProfile.isPending} className="bg-amber-500 font-bold text-black hover:bg-amber-400">
                {saveProfile.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save profile
              </Button>
            </div>
          </div>
        </section>
      )}

      {tab === "payouts" && (
        <section className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5 sm:p-7">
            <SectionTitle title="Stripe payouts" description="Lease payments are processed through Stripe Connect. Virelle retains 5%; 95% is allocated to the designer." />
            <div className="mt-6 flex flex-col gap-5 rounded-xl border border-border p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className={`flex h-11 w-11 items-center justify-center rounded-full ${connected ? "bg-green-500/10" : "bg-amber-500/10"}`}>
                  {connected ? <CheckCircle2 className="h-6 w-6 text-green-400" /> : <Wallet className="h-6 w-6 text-amber-400" />}
                </div>
                <div>
                  <p className="font-semibold">{connected ? "Payout account connected" : connectStatus?.connected ? "Payout verification incomplete" : "Connect a payout account"}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{connected ? "Your account can receive marketplace lease payouts." : "Complete Stripe identity and bank-account onboarding."}</p>
                </div>
              </div>
              <Button onClick={startPayoutOnboarding} disabled={onboardConnect.isPending}>
                {onboardConnect.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {connected ? "Review Stripe account" : "Set up payouts"}
              </Button>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-5"><p className="text-sm text-muted-foreground">Total earned</p><p className="mt-2 text-2xl font-bold">{money(earnings?.totalEarned)}</p></div>
            <div className="rounded-xl border border-border bg-card p-5"><p className="text-sm text-muted-foreground">Active leases</p><p className="mt-2 text-2xl font-bold">{earnings?.leaseCount ?? 0}</p></div>
            <div className="rounded-xl border border-border bg-card p-5"><p className="text-sm text-muted-foreground">Designer share</p><p className="mt-2 text-2xl font-bold text-green-400">95%</p></div>
          </div>
        </section>
      )}
    </div>
  );
}
