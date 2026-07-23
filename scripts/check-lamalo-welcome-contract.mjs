import fs from "node:fs";
import assert from "node:assert/strict";

const gifts = fs.readFileSync("server/lamalo-gifts-router.ts", "utf8");
const welcomeInventory = fs.readFileSync("server/_core/lamaloWelcomeInventory.ts", "utf8");
const seed = fs.readFileSync("server/lamalo-seed.ts", "utf8");
const picker = fs.readFileSync("client/src/components/WelcomeOutfitPicker.tsx", "utf8");
const home = fs.readFileSync("client/src/pages/Home.tsx", "utf8");

const squash = (source) => source.replace(/\s+/g, "");
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const squashedGifts = squash(gifts);
const squashedInventory = squash(welcomeInventory);
const squashedSeed = squash(seed);
const squashedPicker = squash(picker);
const squashedHome = squash(home);

const picksBlock = welcomeInventory.match(
  /export const LAMALO_WELCOME_ITEM_NAMES\s*=\s*\[([\s\S]*?)\]\s*as const;/,
)?.[1] ?? "";
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
  assert.ok(welcomeInventory.includes(`name: "${pick}"`), `lightweight inventory is missing: ${pick}`);
}

for (const productionRiskColumn of [
  "membershipStatus:",
  "collectionPriceAud:",
  "published:",
  "publishedAt:",
  "retailPriceAud:",
  "leasePriceAud:",
  "isVirtualOnly:",
  "virtualPriceRule:",
  "virtualBadgeText:",
]) {
  assert.ok(
    !welcomeInventory.includes(productionRiskColumn),
    `welcome repair must not require optional production column ${productionRiskColumn}`,
  );
}

assert.ok(
  squashedInventory.includes("exportconstLAMALO_WELCOME_CHOICES") &&
    squashedInventory.includes("id:index+1"),
  "welcome choices must have stable application IDs",
);
assert.ok(
  squashedGifts.includes(
    "getStarterOutfits:protectedProcedure.query(()=>{returnLAMALO_WELCOME_CHOICES;})",
  ),
  "the picker load endpoint must return static choices without database work",
);
assert.ok(
  squashedGifts.includes("LAMALO_WELCOME_CHOICES.find(choice=>choice.id===id)"),
  "claim must resolve stable choice IDs through the welcome contract",
);
assert.ok(
  squashedGifts.includes("inArray(wardrobeItems.name,selectedNames)"),
  "claim must resolve selected names to real wardrobe item IDs",
);
assert.ok(squashedGifts.includes("db.transaction"), "welcome claim must be transactional");
assert.ok(squashedGifts.includes("ensureLamaloWelcomeInventory(db,ownerUserId)"), "claim must use the lightweight ten-item repair");
assert.ok(!squashedGifts.includes("runLamaloSeed"), "welcome requests must not run the full Lamalo seed");
assert.ok(squashedInventory.includes('"LamaloFashion","LamaloFashions","Lamalo"'), "canonical Lamalo brand must precede legacy aliases");
assert.ok(squashedInventory.includes(".groupBy(wardrobeItems.name)"), "starter readiness must count distinct catalogue names");
assert.match(gifts, /FOR\s+UPDATE/, "welcome claim must serialize concurrent requests");
assert.ok(squashedGifts.includes('eq(wardrobeLeases.status,"active")'), "claim checks must ignore inactive leases");
assert.ok(squashedPicker.includes("isStudioOpenerActive"), "picker must wait for the studio opener");
assert.ok(squashedHome.includes("const[showOpener,setShowOpener]=useState(()=>"), "home must latch the opener request before the first render");
assert.ok(squashedPicker.includes("isAuthenticated&&!authLoading&&openerReady"), "picker must not call protected APIs while logged out");
assert.ok(squashedPicker.includes("h-[calc(100dvh-1rem)]"), "mobile gift dialog must fit the dynamic viewport");
assert.ok(squashedPicker.includes("min-h-0flex-1overflow-y-auto"), "outfit choices must scroll inside the dialog");
assert.ok(!squashedSeed.includes("INSERTIGNOREINTOwardrobeItems"), "Lamalo item seeding must use an explicit idempotent upsert");
assert.ok(!/WHERE\s+collectionId\s+IS\s+NOT\s+NULL\s+AND\s*\(retailPriceAud/.test(seed), "price repair must not alter other designers' rows");
assert.ok(squashedSeed.includes("WHEREdesignerProfileId=${designerProfileId}"), "catalogue repair SQL must be scoped to Lamalo");

console.log("Lamalo welcome contract verified: database-independent loading, stable ten-item choices, atomic claim.");
