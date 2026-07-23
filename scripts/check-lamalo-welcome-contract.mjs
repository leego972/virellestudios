import fs from "node:fs";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

const gifts = fs.readFileSync("server/lamalo-gifts-router.ts", "utf8");
const welcomeInventory = fs.readFileSync("server/_core/lamaloWelcomeInventory.ts", "utf8");
const seed = fs.readFileSync("server/lamalo-seed.ts", "utf8");
const picker = fs.readFileSync("client/src/components/WelcomeOutfitPicker.tsx", "utf8");
const themeContext = fs.readFileSync("client/src/contexts/ThemeContext.tsx", "utf8");
const home = fs.readFileSync("client/src/pages/Home.tsx", "utf8");

const squash = source => source.replace(/\s+/g, "");
const escapeRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const squashedGifts = squash(gifts);
const squashedInventory = squash(welcomeInventory);
const squashedSeed = squash(seed);
const squashedPicker = squash(picker);
const squashedTheme = squash(themeContext);
const squashedHome = squash(home);

const picksBlock = welcomeInventory.match(
  /export const LAMALO_WELCOME_ITEM_NAMES\s*=\s*\[([\s\S]*?)\]\s*as const;/,
)?.[1] ?? "";
const picks = [...picksBlock.matchAll(/"([^"]+)"/g)].map(match => match[1]);
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
  assert.ok(welcomeInventory.includes(`name: "${pick}"`), `welcome inventory is missing: ${pick}`);
}

const imagePaths = [
  ...welcomeInventory.matchAll(/imagePath:\s*"(\/lamalo\/welcome\/[^"]+\.svg)"/g),
].map(match => match[1]);
assert.equal(imagePaths.length, 10, "every welcome choice must have one bundled SVG image");
assert.equal(new Set(imagePaths).size, 10, "welcome images must be unique");

const artworkHashes = new Set();
for (const imagePath of imagePaths) {
  const diskPath = `client/public${imagePath}`;
  assert.ok(fs.existsSync(diskPath), `missing bundled welcome image: ${diskPath}`);
  const svg = fs.readFileSync(diskPath, "utf8");
  const hash = createHash("sha256").update(svg).digest("hex");

  assert.ok(svg.length >= 1_000, `welcome artwork is too simple to qualify as catalogue art: ${diskPath}`);
  assert.match(svg, /<svg\b[^>]*viewBox="0 0 480 480"/, `welcome artwork must use a precise square vector canvas: ${diskPath}`);
  assert.match(svg, /role="img"/, `welcome artwork must expose an image role: ${diskPath}`);
  assert.match(svg, /aria-labelledby="title desc"/, `welcome artwork must connect title and description: ${diskPath}`);
  assert.match(svg, /<title\b/, `welcome artwork needs an accessible title: ${diskPath}`);
  assert.match(svg, /<desc\b/, `welcome artwork needs an accessible description: ${diskPath}`);
  assert.match(svg, /<defs\b/, `welcome artwork must contain reusable vector definitions: ${diskPath}`);
  assert.ok((svg.match(/<linearGradient\b/g) ?? []).length >= 2, `welcome artwork must use layered garment and studio gradients: ${diskPath}`);
  assert.match(svg, /<filter\b/, `welcome artwork must contain a depth filter: ${diskPath}`);
  assert.match(svg, /<feDropShadow\b/, `welcome artwork must contain a catalogue shadow: ${diskPath}`);
  assert.ok((svg.match(/<(?:path|ellipse|circle)\b/g) ?? []).length >= 5, `welcome artwork needs sufficient garment detail: ${diskPath}`);
  assert.ok(!artworkHashes.has(hash), `welcome artwork must not duplicate another garment: ${diskPath}`);
  artworkHashes.add(hash);
}

assert.ok(!welcomeInventory.includes("image.pollinations.ai"), "welcome images must not rely on a remote generator");
assert.ok(squashedInventory.includes("primaryImageUrl:item.imagePath"), "picker and claimed inventory must use bundled image paths");
assert.ok(squashedInventory.includes("imageUrls:[item.imagePath]"), "database rows must retain the bundled image path");
assert.ok(squashedPicker.includes("Promise.all(preload)"), "all ten item images must preload before the grid is displayed");
assert.ok(squashedPicker.includes("outfits.length!==10"), "preloading must require the complete ten-item set");
assert.ok(squashedPicker.includes('fetchPriority={index<4?"high":"auto"}'), "above-the-fold garment images must receive high fetch priority");
assert.ok(squashedPicker.includes("width={480}") && squashedPicker.includes("height={480}"), "item images must reserve a stable high-quality square canvas");
assert.ok(squashedPicker.includes('decoding="sync"'), "bundled vectors must decode before reveal");
assert.ok(!squashedPicker.includes("onError={() => setFailed"), "item artwork must not silently collapse into a placeholder");

function rgb(hex) {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}
function luminance(hex) {
  return rgb(hex)
    .map(channel => channel / 255)
    .map(channel => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4))
    .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
}
function contrast(first, second) {
  const one = luminance(first);
  const two = luminance(second);
  return (Math.max(one, two) + 0.05) / (Math.min(one, two) + 0.05);
}

const contrastPairs = [
  ["day body", "#251b10", "#fffaf0"],
  ["day title", "#5f3700", "#fffaf0"],
  ["day muted", "#5d5143", "#fffaf0"],
  ["day card", "#251b10", "#ffffff"],
  ["night body", "#fff4c2", "#0b0b0d"],
  ["night title", "#ffd76a", "#0b0b0d"],
  ["night muted", "#d8c98f", "#0b0b0d"],
  ["night card", "#fff4c2", "#18181b"],
];
for (const [label, foreground, background] of contrastPairs) {
  assert.ok(
    contrast(foreground, background) >= 4.5,
    `${label} contrast must meet WCAG AA`,
  );
}

assert.ok(squashedTheme.includes('constisNightMode=theme==="dark"'), "dark must mean night mode");
assert.ok(squashedTheme.includes('root.classList.toggle("dark",!isNightMode)'), "light must activate the existing cream day palette");
assert.ok(squashedTheme.includes("root.dataset.theme=theme"), "the canonical theme must be exposed on the root element");
assert.ok(squashedTheme.includes('root.style.colorScheme=isNightMode?"dark":"light"'), "browser controls must match the selected theme");
assert.ok(squashedTheme.includes('isNightMode?"#09090b":"#f5efe2"'), "Safari chrome must match night and day surfaces");
assert.ok(squashedPicker.includes("data-theme-mode={theme}"), "welcome picker must bind to the canonical theme");
assert.ok(squashedPicker.includes('data-contrast-ignore="true"'), "global contrast correction must not override verified modal colours");
assert.ok(squashedPicker.includes('data-theme-mode="light"'), "welcome picker must define an explicit day palette");
assert.ok(squashedPicker.includes("--lw-bg:#0b0b0d"), "welcome picker must define an explicit night palette");

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

assert.ok(squashedInventory.includes("exportconstLAMALO_WELCOME_CHOICES"), "welcome choices must be exported");
assert.ok(squashedInventory.includes("id:index+1"), "welcome choices must have stable application IDs");
assert.ok(squashedGifts.includes("getStarterOutfits:protectedProcedure.query(()=>{returnLAMALO_WELCOME_CHOICES;})"), "load endpoint must remain database-independent");
assert.ok(squashedGifts.includes("LAMALO_WELCOME_CHOICES.find(choice=>choice.id===id)"), "claim must resolve stable choice IDs");
assert.ok(squashedGifts.includes("inArray(wardrobeItems.name,selectedNames)"), "claim must resolve names to real wardrobe item IDs");
assert.ok(squashedGifts.includes("db.transaction"), "welcome claim must be transactional");
assert.ok(squashedGifts.includes("ensureLamaloWelcomeInventory(db,ownerUserId)"), "claim must use the lightweight ten-item repair");
assert.ok(!squashedGifts.includes("runLamaloSeed"), "welcome requests must not run the full Lamalo seed");
assert.ok(squashedInventory.includes('"LamaloFashion","LamaloFashions","Lamalo"'), "canonical Lamalo brand must precede legacy aliases");
assert.ok(squashedInventory.includes(".groupBy(wardrobeItems.name)"), "starter readiness must count distinct catalogue names");
assert.match(gifts, /FOR\s+UPDATE/, "welcome claim must serialize concurrent requests");
assert.ok(squashedGifts.includes('eq(wardrobeLeases.status,"active")'), "claim checks must ignore inactive leases");
assert.ok(squashedPicker.includes("isStudioOpenerActive"), "picker must wait for the studio opener");
assert.ok(squashedHome.includes("const[showOpener,setShowOpener]=useState(()=>"), "home must latch the opener request before first render");
assert.ok(squashedPicker.includes("isAuthenticated&&!authLoading&&openerReady"), "picker must not call protected APIs while logged out");
assert.ok(squashedPicker.includes("h-[calc(100dvh-1rem)]"), "mobile gift dialog must fit the dynamic viewport");
assert.ok(squashedPicker.includes("min-h-0flex-1overflow-y-auto"), "outfit choices must scroll inside the dialog");
assert.ok(!squashedSeed.includes("INSERTIGNOREINTOwardrobeItems"), "Lamalo seeding must use an explicit idempotent upsert");
assert.ok(!/WHERE\s+collectionId\s+IS\s+NOT\s+NULL\s+AND\s*\(retailPriceAud/.test(seed), "price repair must not alter other designers' rows");
assert.ok(squashedSeed.includes("WHEREdesignerProfileId=${designerProfileId}"), "catalogue repair SQL must be scoped to Lamalo");

console.log("Lamalo welcome contract verified: correct day/night semantics, AA contrast, ten detailed preloaded vector images, atomic claim.");
