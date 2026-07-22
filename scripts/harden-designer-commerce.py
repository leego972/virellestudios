from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def write(path: str, content: str) -> None:
    (ROOT / path).write_text(content, encoding="utf-8")


# 1. All creationProcedure routes must pass through the same portal guard as
# protectedProcedure; otherwise designer-only accounts could call studio create APIs.
path = "server/_core/trpc.ts"
text = read(path)
text = text.replace(
    'export const creationProcedure = t.procedure.use(blockExpiredTester);',
    'export const creationProcedure = protectedProcedure.use(blockExpiredTester);',
)
if 'export const creationProcedure = protectedProcedure.use(blockExpiredTester);' not in text:
    raise RuntimeError("Could not harden creationProcedure")
write(path, text)


# 2. Add commerce columns to the startup auto-migration. This runs before the
# server accepts traffic and prevents typed Drizzle queries from selecting
# columns that do not exist yet on the first Render boot.
path = "server/_core/autoMigrate.ts"
text = read(path)
profile_marker = '{ table: "designerProfiles", column: "username", definition: "VARCHAR(80) NULL" }'
if profile_marker not in text:
    anchor = '    { table: "designerProfiles", column: "brandingImages", definition: "JSON NULL" },\n'
    addition = '''    // Designer commerce identity and registered business details
    { table: "designerProfiles", column: "username", definition: "VARCHAR(80) NULL" },
    { table: "designerProfiles", column: "abn", definition: "VARCHAR(32) NULL" },
    { table: "designerProfiles", column: "businessAddressLine1", definition: "VARCHAR(255) NULL" },
    { table: "designerProfiles", column: "businessAddressLine2", definition: "VARCHAR(255) NULL" },
    { table: "designerProfiles", column: "businessCity", definition: "VARCHAR(128) NULL" },
    { table: "designerProfiles", column: "businessStateRegion", definition: "VARCHAR(128) NULL" },
    { table: "designerProfiles", column: "businessPostalCode", definition: "VARCHAR(32) NULL" },
    { table: "designerProfiles", column: "businessCountry", definition: "VARCHAR(128) NULL" },
    { table: "designerProfiles", column: "registrationCompleted", definition: "TINYINT(1) NOT NULL DEFAULT 0" },
'''
    if anchor not in text:
        raise RuntimeError("Missing designer profile migration anchor")
    text = text.replace(anchor, anchor + addition, 1)

item_marker = '{ table: "wardrobeItems", column: "physicalRetailPriceAud", definition: "INT NULL" }'
if item_marker not in text:
    anchor = '    { table: "wardrobeItems", column: "leasePriceAud", definition: "INT NULL" },\n'
    addition = '''    // Third-party physical and virtual item commerce. Existing Lamalo values are not updated.
    { table: "wardrobeItems", column: "physicalRetailPriceAud", definition: "INT NULL" },
    { table: "wardrobeItems", column: "isVirtualOnly", definition: "TINYINT(1) NOT NULL DEFAULT 1" },
    { table: "wardrobeItems", column: "virtualPriceRule", definition: "VARCHAR(32) NULL" },
    { table: "wardrobeItems", column: "virtualBadgeText", definition: "VARCHAR(64) NULL DEFAULT 'Virtual item'" },
    { table: "wardrobeLeases", column: "purchaseMode", definition: "VARCHAR(16) NOT NULL DEFAULT 'virtual'" },
    { table: "wardrobeLeases", column: "shippingAddressId", definition: "INT NULL" },
    { table: "wardrobeLeases", column: "shippingAddressSnapshot", definition: "JSON NULL" },
'''
    if anchor not in text:
        raise RuntimeError("Missing wardrobe item migration anchor")
    text = text.replace(anchor, anchor + addition, 1)
write(path, text)


# 3. Display the virtual badge in the existing marketplace cards below the
# image, beside textual metadata, so it cannot obstruct the product photo.
path = "client/src/pages/WardrobeMarketplacePage.tsx"
text = read(path)
if 'Virtual item</Badge>' not in text:
    old = '''        <div>
          <p className="text-xs font-bold text-white leading-tight line-clamp-1">{baseName}</p>
          {color && <p className="text-[10px] text-amber-400/70 mt-0.5">{color}</p>}
        </div>
'''
    new = '''        <div>
          <p className="text-xs font-bold text-white leading-tight line-clamp-1">{baseName}</p>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {color && <p className="text-[10px] text-amber-400/70">{color}</p>}
            <Badge className="bg-purple-500/15 text-purple-200 border border-purple-400/30 text-[9px] px-1.5 py-0">Virtual item</Badge>
            {!Boolean(item.isVirtualOnly) && Number(item.physicalRetailPriceAud ?? 0) > 0 && (
              <Badge className="bg-emerald-500/15 text-emerald-200 border border-emerald-400/30 text-[9px] px-1.5 py-0">Physical available</Badge>
            )}
          </div>
        </div>
'''
    if old not in text:
        raise RuntimeError("Missing marketplace badge anchor")
    text = text.replace(old, new, 1)
write(path, text)


# 4. The existing bundle endpoint remains intact for legacy subscriptions, but
# new designer-only accounts cannot use studio tools on the same login. Remove
# misleading new-account bundle sales copy while preserving the backend feature.
path = "client/src/pages/DesignerRegisterPage.tsx"
text = read(path)
text = text.replace(
    '<p className="text-sm text-white/45 mt-1">Existing Virelle membership options are preserved.</p>',
    '<p className="text-sm text-white/45 mt-1">Designer accounts use the dedicated marketplace membership to preserve strict portal separation.</p>',
)
# Keep the second card visible as legacy information but do not sell an unusable
# same-login studio entitlement to a newly separated designer account.
text = text.replace(
    '<Button onClick={() => startMembership(true)} className="w-full bg-amber-500 hover:bg-amber-400 text-black font-black">Get Bundle — A$1,431/yr</Button>',
    '<Button disabled variant="outline" className="w-full border-white/15 text-white/35">Legacy bundle retained for existing subscriptions</Button>',
)
write(path, text)

print("Designer commerce hardening applied.")
