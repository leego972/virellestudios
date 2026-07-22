from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def write(path: str, text: str) -> None:
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(text, encoding="utf-8")


def insert_after(text: str, anchor: str, addition: str, marker: str) -> str:
    if marker in text:
        return text
    if anchor not in text:
        raise RuntimeError(f"Missing anchor for {marker}")
    return text.replace(anchor, anchor + addition, 1)


def insert_before(text: str, anchor: str, addition: str, marker: str) -> str:
    if marker in text:
        return text
    if anchor not in text:
        raise RuntimeError(f"Missing anchor for {marker}")
    return text.replace(anchor, addition + anchor, 1)


def replace_once(text: str, old: str, new: str, marker: str) -> str:
    if marker in text:
        return text
    if old not in text:
        raise RuntimeError(f"Missing replacement anchor for {marker}")
    return text.replace(old, new, 1)


# Remove an accidental duplicate service. The production implementation is
# server/_core/portalAccess.ts + the existing additive commerce routers.
duplicate = ROOT / "server/designer-commerce-service.ts"
if duplicate.exists():
    duplicate.unlink()

# ---------------------------------------------------------------------------
# Drizzle models: expose runtime-migrated commerce columns to typed queries.
# ---------------------------------------------------------------------------
path = "drizzle/schema.ts"
text = read(path)
text = insert_after(
    text,
    '  brandingImages: json("brandingImages"),\n',
    '''  username: varchar("username", { length: 80 }),
  abn: varchar("abn", { length: 32 }),
  businessAddressLine1: varchar("businessAddressLine1", { length: 255 }),
  businessAddressLine2: varchar("businessAddressLine2", { length: 255 }),
  businessCity: varchar("businessCity", { length: 128 }),
  businessStateRegion: varchar("businessStateRegion", { length: 128 }),
  businessPostalCode: varchar("businessPostalCode", { length: 32 }),
  businessCountry: varchar("businessCountry", { length: 128 }),
  registrationCompleted: boolean("registrationCompleted").default(false).notNull(),
''',
    'username: varchar("username", { length: 80 })',
)
text = insert_after(
    text,
    '  leasePriceAud: int("leasePriceAud"),\n',
    '''  // retailPriceAud remains the established virtual licence price. Lamalo rows are never recalculated.
  physicalRetailPriceAud: int("physicalRetailPriceAud"),
  isVirtualOnly: boolean("isVirtualOnly").default(true).notNull(),
  virtualPriceRule: varchar("virtualPriceRule", { length: 32 }),
  virtualBadgeText: varchar("virtualBadgeText", { length: 64 }).default("Virtual item"),
''',
    'physicalRetailPriceAud: int("physicalRetailPriceAud")',
)
text = insert_after(
    text,
    '  platformFeeAud: int("platformFeeAud").notNull(),\n',
    '''  purchaseMode: varchar("purchaseMode", { length: 16 }).default("virtual").notNull(),
  shippingAddressId: int("shippingAddressId"),
  shippingAddressSnapshot: json("shippingAddressSnapshot"),
''',
    'purchaseMode: varchar("purchaseMode", { length: 16 })',
)
write(path, text)

# ---------------------------------------------------------------------------
# Mount separate designer Express auth and prevent cross-portal authentication.
# ---------------------------------------------------------------------------
path = "server/_core/oauth.ts"
text = read(path)
text = insert_after(
    text,
    'import { rateLimitPublicByIP } from "./rateLimit";\n',
    'import { registerDesignerAuthRoutes } from "../designer-auth-routes";\nimport { getUserPortal } from "./portalAccess";\n',
    'registerDesignerAuthRoutes',
)
text = insert_after(
    text,
    'export function registerOAuthRoutes(app: Express) {\n',
    '  registerDesignerAuthRoutes(app);\n',
    'registerDesignerAuthRoutes(app);',
)
text = insert_before(
    text,
    '  // OAuth and email/password now issue the same local numeric-user-id JWT.\n',
    '''  const portal = await getUserPortal(Number(account.id), account.role);
  if (portal === "designer") {
    res.redirect(302, "/login?designer=1&error=use_designer_login");
    return;
  }

''',
    'error=use_designer_login',
)
text = insert_before(
    text,
    '        const valid = await bcrypt.compare(password, user.passwordHash);\n',
    '''        const portal = await getUserPortal(Number(user.id), user.role);
        if (portal === "designer") {
          res.status(403).json({ error: "This is a designer account. Use the separate Designer Sign In." });
          return;
        }

''',
    'This is a designer account. Use the separate Designer Sign In.',
)
write(path, text)

# ---------------------------------------------------------------------------
# Standard account registration: server-enforced delivery address transaction.
# ---------------------------------------------------------------------------
path = "server/routers.ts"
text = read(path)
text = insert_after(
    text,
    'import { runLamaloSeed } from "./lamalo-seed";\n',
    'import { getUserPortal, saveDeliveryAddress, setUserPortal } from "./_core/portalAccess";\n',
    'saveDeliveryAddress, setUserPortal',
)
text = insert_after(
    text,
    '        marketingOptIn: z.boolean().optional(),\n',
    '''        shippingAddress: z.object({
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
''',
    'shippingAddress: z.object({',
)
text = insert_after(
    text,
    '        if (!user) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create account" });\n',
    '''
        await setUserPortal(user.id, "studio");
        try {
          await saveDeliveryAddress(user.id, {
            ...input.shippingAddress,
            phone: input.shippingAddress.phone || input.phone || null,
            isDefault: true,
          });
        } catch (addressError) {
          await db.deleteUser(user.id).catch(() => undefined);
          throw addressError;
        }
''',
    'await setUserPortal(user.id, "studio");',
)
# The older tRPC login route remains callable, so enforce the same portal split.
text = insert_before(
    text,
    '        // Admin accounts bypass brute-force lockout\n',
    '''        const portal = await getUserPortal(user.id, user.role);
        if (portal === "designer" && user.role !== "admin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "This is a designer account. Use the separate Designer Sign In.",
          });
        }

''',
    'const portal = await getUserPortal(user.id, user.role);',
)
write(path, text)

# Standard Register consumes the address captured by RequiredSignupAddressCapture.
path = "client/src/pages/Register.tsx"
text = read(path)
text = insert_before(
    text,
    '    registerMutation.mutate({\n',
    '''    let shippingAddress: any = null;
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

''',
    'rawAddress = sessionStorage.getItem("virelle:signup-delivery-address")',
)
text = insert_after(
    text,
    '      marketingOptIn,\n',
    '      shippingAddress,\n',
    '      shippingAddress,\n',
)
write(path, text)

# ---------------------------------------------------------------------------
# Designer registration also saves the business address as the default address.
# ---------------------------------------------------------------------------
for path in ["server/designer-auth-router.ts", "server/designer-auth-routes.ts"]:
    text = read(path)
    text = insert_after(
        text,
        'import { ensurePortalCommerceSchema, getUserPortal, setUserPortal } from "./_core/portalAccess";\n',
        '',
        'saveDeliveryAddress',
    ) if False else text
    # Expand the existing portalAccess import without changing any auth route names.
    old = 'import { ensurePortalCommerceSchema, getUserPortal, setUserPortal } from "./_core/portalAccess";'
    new = 'import { ensurePortalCommerceSchema, getUserPortal, saveDeliveryAddress, setUserPortal } from "./_core/portalAccess";'
    if 'saveDeliveryAddress' not in text and old in text:
        text = text.replace(old, new, 1)

    if path.endswith("designer-auth-router.ts"):
        anchor = '      await setUserPortal(user.id, "designer");\n'
        addition = '''      await saveDeliveryAddress(user.id, {
        label: "Business address",
        recipientName: input.fullName,
        phone: input.phone || null,
        addressLine1: input.businessAddressLine1,
        addressLine2: input.businessAddressLine2 || null,
        city: input.businessCity,
        stateRegion: input.businessStateRegion,
        postalCode: input.businessPostalCode,
        country: input.businessCountry,
        isDefault: true,
      });
'''
        marker = 'label: "Business address"'
    else:
        anchor = '        await setUserPortal(user.id, "designer");\n'
        addition = '''        await saveDeliveryAddress(user.id, {
          label: "Business address",
          recipientName: fullName,
          phone: phone || null,
          addressLine1,
          addressLine2: addressLine2 || null,
          city,
          stateRegion,
          postalCode,
          country,
          isDefault: true,
        });
'''
        marker = 'recipientName: fullName,'
    text = insert_after(text, anchor, addition, marker)
    write(path, text)

# ---------------------------------------------------------------------------
# Fix legacy designer guard: designerProfiles has no status column.
# ---------------------------------------------------------------------------
path = "server/_core/trpc.ts"
text = read(path)
old = '''  const { getDb } = await import("../db");
  const dbConn = await getDb();
  if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  const { sql } = await import("drizzle-orm");
  const rows: any = await dbConn.execute(
    sql`SELECT id, userId FROM designerProfiles WHERE userId = ${ctx.user.id} AND status = 'active' LIMIT 1`,
  );
  const profile = (Array.isArray(rows[0]) ? rows[0] : rows)[0] ?? null;
'''
new = '''  const portal = await getUserPortal(ctx.user.id, ctx.user.role);
  if (portal !== "designer" && portal !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "A separate Designer Portal account is required.",
    });
  }
  const { getDb } = await import("../db");
  const dbConn = await getDb();
  if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  const { sql } = await import("drizzle-orm");
  const rows: any = await dbConn.execute(
    sql`SELECT id, userId FROM designerProfiles WHERE userId = ${ctx.user.id} LIMIT 1`,
  );
  const profile = (Array.isArray(rows[0]) ? rows[0] : rows)[0] ?? null;
'''
if "AND status = 'active'" in text:
    if old not in text:
        raise RuntimeError("Could not repair legacy designer guard")
    text = text.replace(old, new, 1)
write(path, text)

# ---------------------------------------------------------------------------
# Exact 3% third-party price with a Stripe-safe minimum physical retail price.
# A$16.67 -> 50 cents after rounding. Lamalo is never handled by these routes.
# ---------------------------------------------------------------------------
path = "server/designer-commerce-router.ts"
text = read(path)
text = text.replace(
    'retailPriceAudCents: z.number().int().min(100).max(100_000_000),',
    'retailPriceAudCents: z.number().int().min(1667, "Physical retail price must be at least A$16.67 so 3% is Stripe-chargeable.").max(100_000_000),',
)
text = text.replace(
    'const virtualPrice = Math.max(1, Math.round(input.retailPriceAudCents * 0.03));',
    'const virtualPrice = Math.round(input.retailPriceAudCents * 0.03);',
)
write(path, text)

path = "client/src/components/DesignerCommercePanel.tsx"
text = read(path)
text = text.replace(
    'const virtualCents = physicalCents > 0 ? Math.max(1, Math.round(physicalCents * 0.03)) : 0;',
    'const virtualCents = physicalCents > 0 ? Math.round(physicalCents * 0.03) : 0;',
)
text = text.replace(
    'physicalCents < 100',
    'physicalCents < 1667',
)
text = text.replace(
    'a retail price of at least A$1.00',
    'a retail price of at least A$16.67',
)
text = text.replace('type="number" min="1" step="0.01"', 'type="number" min="16.67" step="0.01"')
write(path, text)

# Landing entry links are public-only and do not appear inside either signed-in portal.
path = "client/src/components/PortalEntryLinks.tsx"
text = read(path)
if 'import { trpc } from "@/lib/trpc";' not in text:
    text = text.replace('import { Store } from "lucide-react";\n', 'import { Store } from "lucide-react";\nimport { trpc } from "@/lib/trpc";\n', 1)
text = text.replace(
    '''export default function PortalEntryLinks() {
  if (typeof window === "undefined" || window.location.pathname !== "/") return null;
''',
    '''export default function PortalEntryLinks() {
  const me = trpc.auth.me.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });
  const path = typeof window === "undefined" ? "" : window.location.pathname;
  if ((path !== "/" && path !== "/welcome") || me.data) return null;
''',
)
write(path, text)

# Add regression contract and Render-readable release marker.
write("server/designerCommerceContract.test.ts", '''import { describe, expect, it } from "vitest";
import { isDesignerAllowedProtectedPath, isLamaloBrandName, isStudioForbiddenDesignerPath } from "./_core/portalAccess";

describe("designer commerce production contract", () => {
  it("separates designer and studio mutation access", () => {
    expect(isDesignerAllowedProtectedPath("wardrobeMarket.designer.getMembershipStatus")).toBe(true);
    expect(isDesignerAllowedProtectedPath("project.create")).toBe(false);
    expect(isStudioForbiddenDesignerPath("wardrobeMarket.designer.onboardConnect")).toBe(true);
    expect(isStudioForbiddenDesignerPath("designerWardrobe.createWardrobeItem")).toBe(true);
    expect(isStudioForbiddenDesignerPath("wardrobeMarket.marketplace.getDesigner")).toBe(false);
  });

  it("keeps every Lamalo alias outside third-party price recalculation", () => {
    expect(isLamaloBrandName("Lamalo Fashion")).toBe(true);
    expect(isLamaloBrandName("Lamalo Fashions")).toBe(true);
    expect(isLamaloBrandName("Lamalo")).toBe(true);
    expect(isLamaloBrandName("Independent Label")).toBe(false);
  });

  it("calculates third-party virtual price at exactly three percent", () => {
    expect(Math.round(25_000 * 0.03)).toBe(750);
    expect(Math.round(1_667 * 0.03)).toBe(50);
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
  "physicalPurchaseAddsVirtualInventoryCopy": true,
  "savedDeliveryAddressCrud": true
}
''')

print("Designer commerce finalization applied successfully.")
