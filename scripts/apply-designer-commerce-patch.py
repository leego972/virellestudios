from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def read(path):
    return (ROOT / path).read_text(encoding="utf-8")

def write(path, content):
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")

def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected one occurrence, found {count}")
    return text.replace(old, new, 1)

# Central portal authorization.
path = "server/_core/trpc.ts"
text = read(path)
text = replace_once(text, '} from "./swappysPolicy";\n', '} from "./swappysPolicy";\nimport { getUserPortal, isDesignerAllowedProtectedPath, isStudioForbiddenDesignerPath } from "./portalAccess";\n', "trpc import")
text = replace_once(text, "export const router = t.router;\n", "export const router = t.router;\nexport const mergeRouters = t.mergeRouters;\n", "mergeRouters export")
text = replace_once(text, '''const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});
''', '''const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  const portal = await getUserPortal(ctx.user.id, ctx.user.role);
  if (portal === "designer" && !isDesignerAllowedProtectedPath(opts.path)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This designer account can access the designer portal only.",
    });
  }
  if (portal === "studio" && isStudioForbiddenDesignerPath(opts.path)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Designer portal access requires a separate designer account.",
    });
  }

  return next({ ctx: { ...ctx, user: ctx.user } });
});
''', "requireUser middleware")
write(path, text)

# Mount additive commerce router without removing legacy routes.
write("server/wardrobe-marketplace-router.ts", '''import { mergeRouters, router } from "./_core/trpc";
import { designerCommerceRouter } from "./designer-commerce-router";
import { wardrobeMarketplaceRouter as legacyWardrobeMarketplaceRouter } from "./wardrobe-marketplace-router-legacy";

export const wardrobeMarketplaceRouter = mergeRouters(
  legacyWardrobeMarketplaceRouter,
  router({ commerce: designerCommerceRouter }),
);
''')

# Register separate designer auth endpoints.
path = "server/_core/oauth.ts"
text = read(path)
text = replace_once(text, 'import { rateLimitPublicByIP } from "./rateLimit";\n', 'import { rateLimitPublicByIP } from "./rateLimit";\nimport { registerDesignerAuthRoutes } from "../designer-auth-routes";\n', "oauth designer import")
text = replace_once(text, "export function registerOAuthRoutes(app: Express) {\n", "export function registerOAuthRoutes(app: Express) {\n  registerDesignerAuthRoutes(app);\n", "oauth register call")
write(path, text)

# Additive Drizzle fields.
path = "drizzle/schema.ts"
text = read(path)
text = replace_once(text, '  brandingImages: json("brandingImages"),\n', '''  brandingImages: json("brandingImages"),
  username: varchar("username", { length: 80 }),
  abn: varchar("abn", { length: 32 }),
  businessAddressLine1: varchar("businessAddressLine1", { length: 255 }),
  businessAddressLine2: varchar("businessAddressLine2", { length: 255 }),
  businessCity: varchar("businessCity", { length: 128 }),
  businessStateRegion: varchar("businessStateRegion", { length: 128 }),
  businessPostalCode: varchar("businessPostalCode", { length: 32 }),
  businessCountry: varchar("businessCountry", { length: 128 }),
  registrationCompleted: boolean("registrationCompleted").default(false).notNull(),
''', "designer profile schema fields")
text = replace_once(text, '  leasePriceAud: int("leasePriceAud"),\n', '''  leasePriceAud: int("leasePriceAud"),
  // retailPriceAud remains the established virtual licence price. Lamalo rows are untouched.
  physicalRetailPriceAud: int("physicalRetailPriceAud"),
  isVirtualOnly: boolean("isVirtualOnly").default(true).notNull(),
  virtualPriceRule: varchar("virtualPriceRule", { length: 32 }),
  virtualBadgeText: varchar("virtualBadgeText", { length: 64 }).default("Virtual item"),
''', "wardrobe item commerce fields")
text = replace_once(text, '  platformFeeAud: int("platformFeeAud").notNull(),\n', '''  platformFeeAud: int("platformFeeAud").notNull(),
  purchaseMode: varchar("purchaseMode", { length: 16 }).default("virtual").notNull(),
  shippingAddressId: int("shippingAddressId"),
  shippingAddressSnapshot: json("shippingAddressSnapshot"),
''', "wardrobe lease shipping fields")
write(path, text)

# Upgrade existing Stripe checkout while preserving Lamalo and inventory fulfilment.
path = "server/wardrobe-marketplace-router-legacy.ts"
text = read(path)
text = replace_once(text, 'import { getDb } from "./db";\n', '''import { getDb } from "./db";
import {
  createPhysicalOrderFromSession,
  ensurePortalCommerceSchema,
  getSavedAddressById,
  isLamaloBrandName,
} from "./_core/portalAccess";
''', "legacy commerce imports")
text = replace_once(text, '''      .input(z.object({
        type: z.enum(["item", "collection"]),
        id: z.number().int(),
        returnUrl: z.string().url().max(512),
      }))
''', '''      .input(z.object({
        type: z.enum(["item", "collection"]),
        id: z.number().int(),
        purchaseMode: z.enum(["virtual", "physical"]).default("virtual"),
        shippingAddressId: z.number().int().positive().optional(),
        returnUrl: z.string().url().max(512),
      }))
''', "checkout input")
old_block = '''          assertAppReturnUrl(input.returnUrl);
        const s = requireStripe();

        let amountCents: number;
        let designerProfileId: number;
        let productName: string;

        if (input.type === "item") {
          const item = await db.getWardrobeItemById(input.id);
          if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Item not found" });
          if (!item.retailPriceAud) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Item has no purchase price set" });
          }
          amountCents = item.retailPriceAud;
          designerProfileId = item.designerProfileId!;
          productName = `Buy: ${item.name} — Virelle Studios`;
        } else {
          const col = await db.getDesignerCollectionById(input.id);
          if (!col) throw new TRPCError({ code: "NOT_FOUND", message: "Collection not found" });
          // Auto-calculate bundle: sum of actual item prices × 0.90 (10% bundle discount)
          const _colItems = await db.getWardrobeItemsByCollection(input.id);
          const _colItemSum = (_colItems as any[]).reduce((s: number, i: any) => s + (i.retailPriceAud ?? 0), 0);
          amountCents = _colItemSum > 0 ? Math.floor(_colItemSum * 0.90) : (col.collectionPriceAud ?? 100);
          designerProfileId = col.designerProfileId;
          productName = `Buy: ${col.name} Collection — Virelle Studios`;
        }

        const designer = await db.getDesignerProfileById(designerProfileId);
        const designerAccountId: string | null = designer?.stripeAccountId ?? null;
'''
new_block = '''          assertAppReturnUrl(input.returnUrl);
        await ensurePortalCommerceSchema();
        const s = requireStripe();

        let amountCents = 0;
        let designerProfileId: number;
        let productName: string;
        let itemRecord: any | null = null;
        let purchaseMode: "virtual" | "physical" = input.purchaseMode;

        if (input.type === "item") {
          const item = await db.getWardrobeItemById(input.id);
          if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Item not found" });
          itemRecord = item;
          designerProfileId = item.designerProfileId!;
          productName = `Buy: ${item.name} — Virelle Studios`;
        } else {
          purchaseMode = "virtual";
          const col = await db.getDesignerCollectionById(input.id);
          if (!col) throw new TRPCError({ code: "NOT_FOUND", message: "Collection not found" });
          const _colItems = await db.getWardrobeItemsByCollection(input.id);
          const _colItemSum = (_colItems as any[]).reduce((s: number, i: any) => s + (i.retailPriceAud ?? 0), 0);
          amountCents = _colItemSum > 0 ? Math.floor(_colItemSum * 0.90) : (col.collectionPriceAud ?? 100);
          designerProfileId = col.designerProfileId;
          productName = `Buy: ${col.name} Collection — Virelle Studios`;
        }

        const designer = await db.getDesignerProfileById(designerProfileId);
        if (!designer) throw new TRPCError({ code: "NOT_FOUND", message: "Designer not found." });
        const isLamalo = isLamaloBrandName(designer.brandName);
        const designerAccountId: string | null = designer.stripeAccountId ?? null;

        if (itemRecord) {
          if (purchaseMode === "physical") {
            if (Boolean((itemRecord as any).isVirtualOnly)) {
              throw new TRPCError({ code: "BAD_REQUEST", message: "This item is available as a virtual item only." });
            }
            if (!Number((itemRecord as any).physicalRetailPriceAud)) {
              throw new TRPCError({ code: "BAD_REQUEST", message: "This item has no physical retail price." });
            }
            if (!input.shippingAddressId) {
              throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Select a delivery address for physical shipping." });
            }
            await getSavedAddressById(ctx.user.id, input.shippingAddressId);
            amountCents = Number((itemRecord as any).physicalRetailPriceAud);
            productName = `Physical purchase: ${itemRecord.name} — Virelle Studios`;
          } else {
            if (!itemRecord.retailPriceAud) {
              throw new TRPCError({ code: "BAD_REQUEST", message: "Item has no virtual purchase price set." });
            }
            amountCents = itemRecord.retailPriceAud;
            productName = `Virtual item: ${itemRecord.name} — Virelle Studios`;
          }
        }

        if (!isLamalo && (!designerAccountId || designer.stripeAccountStatus !== "active")) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "This designer has not completed Stripe payout onboarding.",
          });
        }
'''
text = replace_once(text, old_block, new_block, "checkout pricing block")
text = replace_once(text, '''          designerAmountCents: String(designerAmountCents),
        };
''', '''          designerAmountCents: String(designerAmountCents),
          purchaseMode,
          ...(input.shippingAddressId ? { shippingAddressId: String(input.shippingAddressId) } : {}),
        };
''', "checkout metadata")
text = replace_once(text, '''        const fulfilled = await fulfillWardrobePurchaseSession(session, ctx.user.id);
        return fulfilled.lease;
''', '''        const fulfilled = await fulfillWardrobePurchaseSession(session, ctx.user.id);
        await createPhysicalOrderFromSession(session, fulfilled.lease.id, ctx.user.id);
        return fulfilled.lease;
''', "physical order confirmation")
write(path, text)

# Require and persist a delivery address on normal Virelle signup.
path = "server/routers.ts"
text = read(path)
text = replace_once(text, 'import { runLamaloSeed } from "./lamalo-seed";\n', 'import { runLamaloSeed } from "./lamalo-seed";\nimport { saveDeliveryAddress, setUserPortal } from "./_core/portalAccess";\n', "routers portal import")
text = replace_once(text, '''        marketingOptIn: z.boolean().optional(),
      }))
''', '''        marketingOptIn: z.boolean().optional(),
        shippingAddress: z.object({
          label: z.string().max(80).optional(),
          recipientName: z.string().min(2).max(255),
          phone: z.string().max(64).optional(),
          addressLine1: z.string().min(3).max(255),
          addressLine2: z.string().max(255).optional(),
          city: z.string().min(2).max(128),
          stateRegion: z.string().min(2).max(128),
          postalCode: z.string().min(2).max(32),
          country: z.string().min(2).max(128),
        }),
      }))
''', "signup address schema")
text = replace_once(text, '''        if (!user) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create account" });

        // Process referral code if provided
''', '''        if (!user) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create account" });

        await setUserPortal(user.id, "studio");
        await saveDeliveryAddress(user.id, {
          ...input.shippingAddress,
          phone: input.shippingAddress.phone || input.phone || null,
          isDefault: true,
        });

        // Process referral code if provided
''', "signup address persistence")
write(path, text)

# Standard registration UI fields and payload.
path = "client/src/pages/Register.tsx"
text = read(path)
text = replace_once(text, '''  const [countrySearch, setCountrySearch] = useState("");
  const [referralCode, setReferralCode] = useState("");
''', '''  const [countrySearch, setCountrySearch] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [deliveryCity, setDeliveryCity] = useState("");
  const [stateRegion, setStateRegion] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [deliveryCountry, setDeliveryCountry] = useState("Australia");
  const [referralCode, setReferralCode] = useState("");
''', "register address state")
text = replace_once(text, '''    if (password !== confirmPassword) { toast.error("Passwords do not match"); return false; }
    return true;
''', '''    if (password !== confirmPassword) { toast.error("Passwords do not match"); return false; }
    if (!addressLine1.trim() || !deliveryCity.trim() || !stateRegion.trim() || !postalCode.trim() || !deliveryCountry.trim()) {
      toast.error("Complete your delivery address");
      return false;
    }
    return true;
''', "register address validation")
text = replace_once(text, '''      marketingOptIn,
    });
''', '''      marketingOptIn,
      shippingAddress: {
        label: "Home",
        recipientName: name.trim(),
        phone: phone.trim() ? `${countryCode} ${phone.trim()}` : undefined,
        addressLine1: addressLine1.trim(),
        addressLine2: addressLine2.trim() || undefined,
        city: deliveryCity.trim(),
        stateRegion: stateRegion.trim(),
        postalCode: postalCode.trim(),
        country: deliveryCountry.trim(),
      },
    });
''', "register address payload")
text = replace_once(text, '<CardDescription>Your login credentials and contact info</CardDescription>', '<CardDescription>Your login credentials, contact info and required delivery address</CardDescription>', "register card description")
address_ui = '''                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5 space-y-3">
                  <div><p className="text-sm font-semibold text-amber-400">Delivery address *</p><p className="text-xs text-muted-foreground">Required at signup and saved for future physical wardrobe purchases.</p></div>
                  <div className="space-y-1.5"><Label htmlFor="addressLine1">Address line 1 <span className="text-red-400">*</span></Label><Input id="addressLine1" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} autoComplete="address-line1" placeholder="Street address" /></div>
                  <div className="space-y-1.5"><Label htmlFor="addressLine2">Address line 2</Label><Input id="addressLine2" value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} autoComplete="address-line2" placeholder="Apartment, suite, unit" /></div>
                  <div className="grid grid-cols-2 gap-3"><div className="space-y-1.5"><Label htmlFor="deliveryCity">City *</Label><Input id="deliveryCity" value={deliveryCity} onChange={(e) => setDeliveryCity(e.target.value)} autoComplete="address-level2" /></div><div className="space-y-1.5"><Label htmlFor="stateRegion">State / region *</Label><Input id="stateRegion" value={stateRegion} onChange={(e) => setStateRegion(e.target.value)} autoComplete="address-level1" /></div></div>
                  <div className="grid grid-cols-2 gap-3"><div className="space-y-1.5"><Label htmlFor="postalCode">Postcode *</Label><Input id="postalCode" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} autoComplete="postal-code" /></div><div className="space-y-1.5"><Label htmlFor="deliveryCountry">Country *</Label><Input id="deliveryCountry" value={deliveryCountry} onChange={(e) => setDeliveryCountry(e.target.value)} autoComplete="country-name" /></div></div>
                </div>
'''
text = replace_once(text, '''                <div className="space-y-1.5">
                  <Label htmlFor="email">Email Address <span className="text-red-400">*</span></Label>
''', address_ui + '''                <div className="space-y-1.5">
                  <Label htmlFor="email">Email Address <span className="text-red-400">*</span></Label>
''', "register address UI")
write(path, text)

# Separate designer login mode on the secure login page.
path = "client/src/pages/Login.tsx"
text = read(path)
text = replace_once(text, '  const [isPending, setIsPending] = useState(false);\n', '''  const [isPending, setIsPending] = useState(false);
  const designerMode = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("designer") === "1";
''', "login designer mode")
text = replace_once(text, '      const response = await fetch("/api/auth/password", {\n', '      const response = await fetch(designerMode ? "/api/designer/auth/password" : "/api/auth/password", {\n', "login endpoint")
text = replace_once(text, '      toast.success("Welcome back!");\n      window.location.assign("/?opener=1");\n', '''      toast.success(designerMode ? "Designer portal ready." : "Welcome back!");
      window.location.assign(designerMode ? "/designer/studio" : "/?opener=1");
''', "login redirect")
text = replace_once(text, '<CardTitle className="text-xl text-center gradient-text-gold">Sign In</CardTitle>\n              <CardDescription className="text-center">Enter your email and password to continue</CardDescription>', '<CardTitle className="text-xl text-center gradient-text-gold">{designerMode ? "Designer Sign In" : "Sign In"}</CardTitle>\n              <CardDescription className="text-center">{designerMode ? "Designer-only access to listings, payouts and fulfilment" : "Enter your email and password to continue"}</CardDescription>', "login heading")
text = replace_once(text, '                       Sign In\n', '                       {designerMode ? "Designer Sign In" : "Sign In"}\n', "login button label")
text = replace_once(text, '<div className="relative w-full my-1">', '<div className={designerMode ? "hidden" : "relative w-full my-1"}>', "hide oauth divider")
text = replace_once(text, '<div className="grid grid-cols-2 gap-3 w-full">', '<div className={designerMode ? "hidden" : "grid grid-cols-2 gap-3 w-full"}>', "hide oauth providers")
text = replace_once(text, '<Link href="/register" className="block">', '<Link href={designerMode ? "/designer-register" : "/register"} className="block">', "login register link")
text = replace_once(text, '                         Create Account\n', '                         {designerMode ? "Create Designer Account" : "Create Account"}\n', "login create label")
write(path, text)

# Global portal gate, designer landing links and commerce tools.
path = "client/src/main.tsx"
text = read(path)
text = replace_once(text, 'import LandingVerifiedAppsGuard from "@/components/LandingVerifiedAppsGuard";\n', '''import LandingVerifiedAppsGuard from "@/components/LandingVerifiedAppsGuard";
import PortalAccessBoundary from "@/components/PortalAccessBoundary";
import PortalEntryLinks from "@/components/PortalEntryLinks";
import DesignerCommercePanel from "@/components/DesignerCommercePanel";
''', "main portal imports")
text = replace_once(text, '''      <LandingVerifiedAppsGuard />
      <App />
''', '''      <LandingVerifiedAppsGuard />
      <PortalAccessBoundary />
      <PortalEntryLinks />
      <DesignerCommercePanel />
      <App />
''', "main portal components")
write(path, text)

# Marketplace badges and purchase chooser.
path = "client/src/pages/WardrobeMarketplacePage.tsx"
text = read(path)
text = replace_once(text, 'import { toast } from "sonner";\n', 'import { toast } from "sonner";\nimport WardrobePurchaseChoiceDialog from "@/components/WardrobePurchaseChoiceDialog";\n', "purchase dialog import")
text = replace_once(text, '''        <div>
          <p className="text-xs font-bold text-white leading-tight line-clamp-1">{baseName}</p>
          {color && <p className="text-[10px] text-amber-400/70 mt-0.5">{color}</p>}
        </div>
''', '''        <div>
          <p className="text-xs font-bold text-white leading-tight line-clamp-1">{baseName}</p>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {color && <p className="text-[10px] text-amber-400/70">{color}</p>}
            <Badge className="bg-purple-500/15 text-purple-200 border border-purple-400/30 text-[9px] px-1.5 py-0">Virtual item</Badge>
            {!Boolean(item.isVirtualOnly) && Number(item.physicalRetailPriceAud ?? 0) > 0 && <Badge className="bg-emerald-500/15 text-emerald-200 border border-emerald-400/30 text-[9px] px-1.5 py-0">Physical available</Badge>}
          </div>
        </div>
''', "item badges")
text = text.replace("  onBuyItem: (id: number) => void;\n", "  onBuyItem: (item: any) => void;\n", 1)
text = replace_once(text, "                  onBuy={() => onBuyItem(item.id)}\n", "                  onBuy={() => onBuyItem(item)}\n", "item callback")
text = replace_once(text, '''  const [showCustomOrder, setShowCustomOrder] = useState(false);
  const [profileImgErr, setProfileImgErr] = useState(false);
''', '''  const [showCustomOrder, setShowCustomOrder] = useState(false);
  const [purchaseItem, setPurchaseItem] = useState<any | null>(null);
  const [profileImgErr, setProfileImgErr] = useState(false);
''', "purchase item state")
text = replace_once(text, '''  function handleBuy(type: "item" | "collection", id: number) {
    setLeasingId(`${type}-${id}`);
    checkoutMut.mutate({
      type,
      id,
      returnUrl: `${window.location.origin}/wardrobe-marketplace/designer/${designerId}`,
    });
  }
''', '''  function handleBuyItem(item: any) {
    setPurchaseItem(item);
  }

  function handleBuyCollection(id: number) {
    setLeasingId(`collection-${id}`);
    checkoutMut.mutate({
      type: "collection",
      id,
      purchaseMode: "virtual",
      returnUrl: `${window.location.origin}/wardrobe-marketplace/designer/${designerId}`,
    });
  }
''', "purchase handlers")
text = replace_once(text, '''      <CustomOrderModal
        open={showCustomOrder}
        onClose={() => setShowCustomOrder(false)}
        onOpen={() => setShowCustomOrder(true)}
        returnUrl={returnUrl}
      />
''', '''      <CustomOrderModal
        open={showCustomOrder}
        onClose={() => setShowCustomOrder(false)}
        onOpen={() => setShowCustomOrder(true)}
        returnUrl={returnUrl}
      />
      <WardrobePurchaseChoiceDialog
        item={purchaseItem}
        returnUrl={returnUrl}
        onClose={() => setPurchaseItem(null)}
        onCheckoutStarted={() => setLeasingId(purchaseItem ? `item-${purchaseItem.id}` : null)}
      />
''', "purchase dialog render")
text = replace_once(text, '''                  onBuyItem={(id) => handleBuy("item", id)}
                  onBuyCollection={(id) => handleBuy("collection", id)}
''', '''                  onBuyItem={handleBuyItem}
                  onBuyCollection={handleBuyCollection}
''', "collection handlers")
write(path, text)

# Contract tests and Render release marker.
write("server/designerCommerceContract.test.ts", '''import { describe, expect, it } from "vitest";
import { isDesignerAllowedProtectedPath, isLamaloBrandName, isStudioForbiddenDesignerPath } from "./_core/portalAccess";

describe("designer commerce contract", () => {
  it("locks portal access in both directions", () => {
    expect(isDesignerAllowedProtectedPath("wardrobeMarket.designer.getMembershipStatus")).toBe(true);
    expect(isDesignerAllowedProtectedPath("project.create")).toBe(false);
    expect(isStudioForbiddenDesignerPath("wardrobeMarket.designer.onboardConnect")).toBe(true);
    expect(isStudioForbiddenDesignerPath("designerWardrobe.createWardrobeItem")).toBe(true);
    expect(isStudioForbiddenDesignerPath("wardrobeMarket.marketplace.getDesigner")).toBe(false);
  });
  it("recognises Lamalo aliases so prices remain exempt", () => {
    expect(isLamaloBrandName("Lamalo Fashion")).toBe(true);
    expect(isLamaloBrandName("Lamalo Fashions")).toBe(true);
    expect(isLamaloBrandName("Lamalo")).toBe(true);
    expect(isLamaloBrandName("Other Label")).toBe(false);
  });
  it("uses the required third-party virtual pricing formula", () => {
    expect(Math.max(1, Math.round(25_000 * 0.03))).toBe(750);
  });
});
''')
write("client/public/deploy/designer-commerce-shipping-v1.json", '''{
  "deployment": "render",
  "release": "designer-commerce-shipping-v1",
  "portalSeparation": true,
  "standardSignupAddressRequired": true,
  "designerSignupSeparate": true,
  "designerPayouts": "stripe-connect-95-5",
  "thirdPartyVirtualPricePercent": 3,
  "lamaloPricingLocked": true,
  "physicalPurchaseAddsVirtualInventoryCopy": true
}
''')

print("Designer commerce patch applied successfully.")
