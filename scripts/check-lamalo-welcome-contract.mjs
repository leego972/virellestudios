import fs from "node:fs";
import assert from "node:assert/strict";

const gifts = fs.readFileSync("server/lamalo-gifts-router.ts", "utf8");
const seed = fs.readFileSync("server/lamalo-seed.ts", "utf8");
const picker = fs.readFileSync("client/src/components/WelcomeOutfitPicker.tsx", "utf8");
const home = fs.readFileSync("client/src/pages/Home.tsx", "utf8");

const compact = (source) => source.replace(/\s+/g, " ");
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const compactGifts = compact(gifts);
const compactSeed = compact(seed);
const compactPicker = compact(picker);
const compactHome = compact(home);

const picksBlock = gifts.match(/const STARTER_PICKS\s*=\s*\[([\s\S]*?)\]\s*as const;/)?.[1] ?? "";
const picks = [...picksBlock.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
assert.equal(picks.length, 10, "welcome gift must expose exactly ten curated picks");
assert.equal(new Set(picks).size, 10, "welcome gift picks must be unique");

for (const pick of picks) {
  const [base, colour] = pick.split(" — ");
  assert.ok(base && colour, `invalid colour-qualified starter pick: ${pick}`);
  assert.match(
    seed,
    new RegExp(`name\\s*:\\s*"${escapeRegExp(base)}"`),
    `starter base item is missing from Lamalo seed: ${base}`,
  );
  assert.ok(seed.includes(`"${colour}"`), `starter colour is missing from Lamalo seed palettes: ${colour}`);
}

assert.ok(compactGifts.includes("db.transaction"), "welcome claim must be transactional");
const canonicalLookup = compactGifts.indexOf("eq(designerProfiles.brandName, LAMALO_BRAND_NAME)");
const aliasLookup = compactGifts.indexOf("[...LAMALO_BRAND_ALIASES]");
assert.ok(canonicalLookup >= 0 && aliasLookup > canonicalLookup, "canonical Lamalo brand must be checked before legacy aliases");
assert.ok(compactGifts.includes("existingNames.has(item.name)"), "fallback welcome choices must deduplicate catalogue names");
assert.ok(compactGifts.includes(".groupBy(wardrobeItems.name)"), "starter inventory readiness must count distinct catalogue names in SQL");
assert.ok(compactGifts.includes(".limit(2000)"), "fallback must scan at least one complete Lamalo catalogue");
assert.ok(compactGifts.includes("FOR UPDATE"), "welcome claim must serialize concurrent requests");
assert.ok(compactGifts.includes('eq(wardrobeLeases.status, "active")'), "claim checks must ignore inactive leases");
assert.ok(compactPicker.includes("isStudioOpenerActive"), "picker must wait for the studio opener");
assert.ok(compactHome.includes("const [showOpener, setShowOpener] = useState(() =>"), "home must latch the opener request before the first render");
assert.ok(compactPicker.includes("isAuthenticated && !authLoading && openerReady"), "picker must not call protected APIs while logged out");
assert.ok(!compactSeed.includes("INSERT IGNORE INTO wardrobeItems"), "Lamalo item seeding must use an explicit idempotent upsert");
assert.ok(!/WHERE collectionId IS NOT NULL\s+AND \(retailPriceAud/.test(seed), "price repair must not alter other designers' rows");
assert.ok(compactSeed.includes("WHERE designerProfileId = ${designerProfileId}"), "catalogue repair SQL must be scoped to Lamalo");

console.log("Lamalo welcome contract verified: 10 picks, gated UI, atomic claim, scoped idempotent seed.");
