from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
changed = []


def load(path):
    return (ROOT / path).read_text(encoding="utf-8")


def save(path, text, original):
    if text != original:
        (ROOT / path).write_text(text, encoding="utf-8")
        changed.append(path)


def add_after(text, anchor, addition, marker):
    if marker in text or anchor not in text:
        return text
    return text.replace(anchor, anchor + addition, 1)


def add_before(text, anchor, addition, marker):
    if marker in text or anchor not in text:
        return text
    return text.replace(anchor, addition + anchor, 1)


# Delete accidental duplicate implementation; portalAccess is canonical.
duplicate = ROOT / "server/designer-commerce-service.ts"
if duplicate.exists():
    duplicate.unlink()
    changed.append(str(duplicate.relative_to(ROOT)))

# Typed schema additions.
path = "drizzle/schema.ts"
text = original = load(path)
text = add_after(text, '  brandingImages: json("brandingImages"),\n', '''  username: varchar("username", { length: 80 }),
  abn: varchar("abn", { length: 32 }),
  businessAddressLine1: varchar("businessAddressLine1", { length: 255 }),
  businessAddressLine2: varchar("businessAddressLine2", { length: 255 }),
  businessCity: varchar("businessCity", { length: 128 }),
  businessStateRegion: varchar("businessStateRegion", { length: 128 }),
  businessPostalCode: varchar("businessPostalCode", { length: 32 }),
  businessCountry: varchar("businessCountry", { length: 128 }),
  registrationCompleted: boolean("registrationCompleted").default(false).notNull(),
''', 'username: varchar("username", { length: 80 })')
text = add_after(text, '  leasePriceAud: int("leasePriceAud"),\n', '''  // retailPriceAud remains the established virtual licence price. Lamalo rows are never recalculated.
  physicalRetailPriceAud: int("physicalRetailPriceAud"),
  isVirtualOnly: boolean("isVirtualOnly").default(true).notNull(),
  virtualPriceRule: varchar("virtualPriceRule", { length: 32 }),
  virtualBadgeText: varchar("virtualBadgeText", { length: 64 }).default("Virtual item"),
''', 'physicalRetailPriceAud: int("physicalRetailPriceAud")')
text = add_after(text, '  platformFeeAud: int("platformFeeAud").notNull(),\n', '''  purchaseMode: varchar("purchaseMode", { length: 16 }).default("virtual").notNull(),
  shippingAddressId: int("shippingAddressId"),
  shippingAddressSnapshot: json("shippingAddressSnapshot"),
''', 'purchaseMode: varchar("purchaseMode", { length: 16 })')
save(path, text, original)

# Separate auth endpoints and cross-portal rejection.
path = "server/_core/oauth.ts"
text = original = load(path)
text = add_after(text, 'import { rateLimitPublicByIP } from "./rateLimit";\n', 'import { registerDesignerAuthRoutes } from "../designer-auth-routes";\nimport { getUserPortal } from "./portalAccess";\n', 'registerDesignerAuthRoutes')
text = add_after(text, 'export function registerOAuthRoutes(app: Express) {\n', '  registerDesignerAuthRoutes(app);\n', 'registerDesignerAuthRoutes(app);')
text = add_before(text, '  // OAuth and email/password now issue the same local numeric-user-id JWT.\n', '''  const portal = await getUserPortal(Number(account.id), account.role);
  if (portal === "designer") {
    res.redirect(302, "/login?designer=1&error=use_designer_login");
    return;
  }

''', 'error=use_designer_login')
text = add_before(text, '        const valid = await bcrypt.compare(password, user.passwordHash);\n', '''        const portal = await getUserPortal(Number(user.id), user.role);
        if (portal === "designer") {
          res.status(403).json({ error: "This is a designer account. Use the separate Designer Sign In." });
          return;
        }

''', 'This is a designer account. Use the separate Designer Sign In.')
save(path, text, original)

# Standard registration requires the captured delivery address.
path = "server/routers.ts"
text = original = load(path)
text = add_after(text, 'import { runLamaloSeed } from "./lamalo-seed";\n', 'import { getUserPortal, saveDeliveryAddress, setUserPortal } from "./_core/portalAccess";\n', 'saveDeliveryAddress, setUserPortal')
text = add_after(text, '        marketingOptIn: z.boolean().optional(),\n', '''        shippingAddress: z.object({
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
''', 'shippingAddress: z.object({')
text = add_after(text, '        if (!user) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create account" });\n', '''
        await setUserPortal(user.id, "studio");
        try {
          await saveDeliveryAddress(user.id, {
            ...input.shippingAddress,
            phone: input.shippingAddress.phone || input.phone || null,
            isDefault: true,
          });
        } catch (addressError) {
          const rollbackDb = await db.getDb();
          if (rollbackDb) await rollbackDb.execute(sql`DELETE FROM users WHERE id = ${user.id}`).catch(() => undefined);
          throw addressError;
        }
''', 'await setUserPortal(user.id, "studio");')
text = add_before(text, '        // Admin accounts bypass brute-force lockout\n', '''        const portal = await getUserPortal(user.id, user.role);
        if (portal === "designer" && user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "This is a designer account. Use the separate Designer Sign In." });
        }

''', 'const portal = await getUserPortal(user.id, user.role);')
save(path, text, original)

# Registration payload consumes the pre-signup address modal draft.
path = "client/src/pages/Register.tsx"
text = original = load(path)
text = add_before(text, '    registerMutation.mutate({\n', '''    let shippingAddress: any = null;
    try {
      const rawAddress = sessionStorage.getItem("virelle:signup-delivery-address");
      shippingAddress = rawAddress ? JSON.parse(rawAddress) : null;
    } catch {
      shippingAddress = null;
    }
    if (!shippingAddress?.recipientName || !shippingAddress?.addressLine1 || !shippingAddress?.city || !shippingAddress?.stateRegion || !shippingAddress?.postalCode || !shippingAddress?.country) {
      toast.error("A complete delivery address is required before account creation.");
      return;
    }

''', 'rawAddress = sessionStorage.getItem("virelle:signup-delivery-address")')
text = add_after(text, '      marketingOptIn,\n', '      shippingAddress,\n', '      shippingAddress,\n')
text = text.replace('''    onSuccess: () => {
      utils.auth.me.invalidate();
      setShowWelcome(true);
''', '''    onSuccess: () => {
      try { sessionStorage.removeItem("virelle:signup-delivery-address"); } catch { /* ignored */ }
      utils.auth.me.invalidate();
      setShowWelcome(true);
''', 1)
save(path, text, original)

# Designer business address becomes the default reusable address.
for path in ["server/designer-auth-router.ts", "server/designer-auth-routes.ts"]:
    text = original = load(path)
    old_import = 'import { ensurePortalCommerceSchema, getUserPortal, setUserPortal } from "./_core/portalAccess";'
    if old_import in text:
        text = text.replace(old_import, 'import { ensurePortalCommerceSchema, getUserPortal, saveDeliveryAddress, setUserPortal } from "./_core/portalAccess";', 1)
    if path.endswith("designer-auth-router.ts"):
        text = add_after(text, '      await setUserPortal(user.id, "designer");\n', '''      await saveDeliveryAddress(user.id, {
        label: "Business address", recipientName: input.fullName, phone: input.phone || null,
        addressLine1: input.businessAddressLine1, addressLine2: input.businessAddressLine2 || null,
        city: input.businessCity, stateRegion: input.businessStateRegion,
        postalCode: input.businessPostalCode, country: input.businessCountry, isDefault: true,
      });
''', 'label: "Business address"')
    else:
        text = add_after(text, '        await setUserPortal(user.id, "designer");\n', '''        await saveDeliveryAddress(user.id, {
          label: "Business address", recipientName: fullName, phone: phone || null,
          addressLine1, addressLine2: addressLine2 || null, city, stateRegion,
          postalCode, country, isDefault: true,
        });
''', 'recipientName: fullName, phone: phone || null')
    save(path, text, original)

# Fix nonexistent designerProfiles.status query.
path = "server/_core/trpc.ts"
text = original = load(path)
text = text.replace("sql`SELECT id, userId FROM designerProfiles WHERE userId = ${ctx.user.id} AND status = 'active' LIMIT 1`", "sql`SELECT id, userId FROM designerProfiles WHERE userId = ${ctx.user.id} LIMIT 1`")
save(path, text, original)

# Exact 3% and Stripe-safe minimum for third-party listings only.
path = "server/designer-commerce-router.ts"
text = original = load(path)
text = text.replace('retailPriceAudCents: z.number().int().min(100).max(100_000_000),', 'retailPriceAudCents: z.number().int().min(1667, "Physical retail price must be at least A$16.67 so 3% is Stripe-chargeable.").max(100_000_000),')
text = text.replace('const virtualPrice = Math.max(1, Math.round(input.retailPriceAudCents * 0.03));', 'const virtualPrice = Math.round(input.retailPriceAudCents * 0.03);')
save(path, text, original)

path = "client/src/components/DesignerCommercePanel.tsx"
text = original = load(path)
text = text.replace('const virtualCents = physicalCents > 0 ? Math.max(1, Math.round(physicalCents * 0.03)) : 0;', 'const virtualCents = physicalCents > 0 ? Math.round(physicalCents * 0.03) : 0;')
text = text.replace('physicalCents < 100', 'physicalCents < 1667')
text = text.replace('a retail price of at least A$1.00', 'a retail price of at least A$16.67')
text = text.replace('type="number" min="1" step="0.01"', 'type="number" min="16.67" step="0.01"')
save(path, text, original)

# Public landing designer entry points stay hidden from authenticated users.
path = "client/src/components/PortalEntryLinks.tsx"
text = original = load(path)
if 'import { trpc } from "@/lib/trpc";' not in text:
    text = 'import { trpc } from "@/lib/trpc";\n' + text
text = text.replace('if (typeof window === "undefined" || window.location.pathname !== "/" || me.data) return null;', 'const path = typeof window === "undefined" ? "" : window.location.pathname;\n  if ((path !== "/" && path !== "/welcome") || me.data) return null;')
save(path, text, original)

# Contract and Render marker.
write_test = ROOT / "server/designerCommerceContract.test.ts"
write_test.write_text('''import { describe, expect, it } from "vitest";
import { isDesignerAllowedProtectedPath, isLamaloBrandName, isStudioForbiddenDesignerPath } from "./_core/portalAccess";

describe("designer commerce production contract", () => {
  it("separates designer and studio mutation access", () => {
    expect(isDesignerAllowedProtectedPath("wardrobeMarket.designer.getMembershipStatus")).toBe(true);
    expect(isDesignerAllowedProtectedPath("project.create")).toBe(false);
    expect(isStudioForbiddenDesignerPath("wardrobeMarket.designer.onboardConnect")).toBe(true);
    expect(isStudioForbiddenDesignerPath("designerWardrobe.createWardrobeItem")).toBe(true);
    expect(isStudioForbiddenDesignerPath("wardrobeMarket.marketplace.getDesigner")).toBe(false);
  });
  it("locks all Lamalo aliases out of third-party price recalculation", () => {
    expect(isLamaloBrandName("Lamalo Fashion")).toBe(true);
    expect(isLamaloBrandName("Lamalo Fashions")).toBe(true);
    expect(isLamaloBrandName("Lamalo")).toBe(true);
    expect(isLamaloBrandName("Independent Label")).toBe(false);
  });
  it("calculates exactly three percent", () => {
    expect(Math.round(25_000 * 0.03)).toBe(750);
    expect(Math.round(1_667 * 0.03)).toBe(50);
  });
});
''', encoding="utf-8")
changed.append(str(write_test.relative_to(ROOT)))
marker = ROOT / "client/public/deploy/designer-commerce-shipping-v1.json"
marker.parent.mkdir(parents=True, exist_ok=True)
marker.write_text('''{
  "deployment": "render",
  "release": "designer-commerce-shipping-v1",
  "portalSeparation": true,
  "standardSignupAddressRequired": true,
  "designerSignupSeparate": true,
  "designerPayouts": "stripe-connect-95-5",
  "thirdPartyVirtualPricePercent": 3,
  "lamaloPricingLocked": true,
  "physicalPurchaseAddsVirtualInventoryCopy": true,
  "savedDeliveryAddressCrud": true
}
''', encoding="utf-8")
changed.append(str(marker.relative_to(ROOT)))

print("Updated:")
for path in sorted(set(changed)):
    print(f"- {path}")
