import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function write(path, value) {
  fs.writeFileSync(path, value);
}

function replaceOnce(source, search, replacement, label) {
  if (!source.includes(search)) throw new Error(`Could not find ${label}`);
  return source.replace(search, replacement);
}

function replaceRegex(source, pattern, replacement, label) {
  if (!pattern.test(source)) throw new Error(`Could not find ${label}`);
  pattern.lastIndex = 0;
  return source.replace(pattern, replacement);
}

function patchLamaloSeed() {
  const path = "server/lamalo-seed.ts";
  let source = read(path);
  if (source.includes("Lamalo Women's Lingerie Essentials") && source.includes("buildLamaloVariantTags")) return;

  source = source
    .replace("26 collections · 1 400+ items", "28 collections · separate colour SKUs with shared master reference geometry")
    .replace(" - Every base item has ≥ 7 color options", " - Every colour choice remains a separate purchasable SKU and permanent inventory item")
    .replace("import { logger } from \"./_core/logger\";", "import { logger } from \"./_core/logger\";\nimport { buildLamaloVariantTags } from \"./_core/lamaloMasterReferences\";");

  source = replaceOnce(
    source,
    "  primaryImageUrl?: string | null;\n  sizeRange?: string;\n}",
    "  primaryImageUrl?: string | null;\n  imageUrls?: string[];\n  sizeRange?: string;\n}",
    "SeedItem imageUrls field",
  );

  source = replaceRegex(
    source,
    /\/\/ ─── Helper: expand one base item into one item per color ─+[\s\S]*?\n\s*function cc\(base: BaseItem, colors: string\[\]\): SeedItem\[\] \{[\s\S]*?\n\s*\}\n\n\/\/ ─── Standard colour palettes/,
    `// ─── Helper: expand one base item into separately purchasable colour SKUs ───\n// Every SKU shares one master geometry reference. The selected colour remains\n// locked in its own database row, checkout, inventory snapshot and scene prompt.\n\nfunction pollinationsUrl(prompt: string): string {\n  const encoded = prompt\n    .replace(/ /g, \"%20\").replace(/,/g, \"%2C\").replace(/\\//g, \"%2F\")\n    .replace(/\\(/g, \"%28\").replace(/\\)/g, \"%29\").replace(/&/g, \"%26\");\n  return \`https://image.pollinations.ai/prompt/\${encoded}%2C%20product%20photo%2C%20plain%20white%20background%2C%20studio%20lighting%2C%20fashion%20photography?width=512&height=512&nologo=true&model=flux\`;\n}\n\nfunction cc(base: BaseItem, colors: string[]): SeedItem[] {\n  const price = itemPrice(base.category);\n  const uniqueColours = Array.from(new Set(colors.map((colour) => colour.trim()).filter(Boolean)));\n  const masterPrompt = \`\${base.referencePrompt}, neutral mid-grey master garment reference, front three-quarter product view, exact construction and proportions, isolated complete item, no person, no mannequin, no text, no logo\`;\n  const sharedMasterThumbnail = pollinationsUrl(masterPrompt);\n  return uniqueColours.map((color) => {\n    const prompt = [\n      base.referencePrompt,\n      \`SELECTED COLOUR HARD-LOCK: \${color}\`,\n      \"Use the shared Lamalo master reference geometry for exact cut, construction, seams, proportions, hardware, fabric behaviour and silhouette\",\n      \"Never copy the neutral master colour into the final scene; render only the selected colour SKU\",\n    ].join(\"; \ ").replace(\";  \ ", \"; \ ");\n    return {\n      ...base,\n      name: \`\${base.name} — \${color}\`,\n      colors: [color],\n      styleTags: buildLamaloVariantTags({\n        baseDesignName: base.name,\n        selectedColour: color,\n        category: base.category,\n        subcategory: base.subcategory,\n        existingTags: base.styleTags,\n        referencePackReady: false,\n      }),\n      retailPriceAud: price,\n      referencePrompt: prompt,\n      primaryImageUrl: sharedMasterThumbnail,\n      imageUrls: [sharedMasterThumbnail],\n    };\n  });\n}\n\n// ─── Standard colour palettes`,
    "colour SKU helper",
  );

  source = replaceOnce(
    source,
    "const SHORTS   = [\"Black\",\"Navy\",\"Khaki\",\"Olive\",\"Charcoal\",\"Cobalt Blue\",\"Forest Green\",\"Burgundy\"];",
    `const SHORTS   = [\"Black\",\"Navy\",\"Khaki\",\"Olive\",\"Charcoal\",\"Cobalt Blue\",\"Forest Green\",\"Burgundy\"];\nconst LINGERIE_F = [\"Black\",\"White\",\"Nude Beige\",\"Blush Pink\",\"Burgundy\",\"Navy\",\"Sage Green\",\"Cobalt Blue\"];\nconst UNDERWEAR_M = [\"Black\",\"White\",\"Navy\",\"Charcoal\",\"Grey Marle\",\"Olive\",\"Burgundy\",\"Cobalt Blue\"];`,
    "underwear palettes",
  );

  source = replaceRegex(
    source,
    /(const womensSwimwearItems: SeedItem\[\] = \[[\s\S]*?)(\n\];\n\nconst womensSwimwear: SeedCollection)/,
    `$1\n  ...cc({ name:\"Lamalo Triangle Bikini Top\", description:\"Adjustable triangle bikini top sold separately for mix-and-match styling.\", category:\"swimwear\", subcategory:\"bikini-tops\", genderFit:\"female\", materials:[\"82% Nylon\",\"18% Elastane\",\"Swim Lining\"], styleTags:[\"bikini\",\"triangle\",\"separate\",\"mix-and-match\"], referencePrompt:\"Women's adjustable triangle bikini top, clean luxury swimwear construction\", primaryImageUrl:\"/lamalo/swimwear-women-onepiece.jpg\" }, SWIM_F),\n  ...cc({ name:\"Lamalo Classic Bikini Bottom\", description:\"Classic bikini bottom sold separately with moderate coverage and a clean leg line.\", category:\"swimwear\", subcategory:\"bikini-bottoms\", genderFit:\"female\", materials:[\"82% Nylon\",\"18% Elastane\",\"Swim Lining\"], styleTags:[\"bikini\",\"bottom\",\"separate\",\"mix-and-match\"], referencePrompt:\"Women's classic bikini bottom, moderate coverage, clean luxury swimwear construction\", primaryImageUrl:\"/lamalo/swimwear-women-onepiece.jpg\" }, SWIM_F),\n  ...cc({ name:\"Lamalo Bandeau Bikini Top\", description:\"Structured bandeau bikini top sold separately with removable straps.\", category:\"swimwear\", subcategory:\"bikini-tops\", genderFit:\"female\", materials:[\"82% Nylon\",\"18% Elastane\",\"Swim Lining\"], styleTags:[\"bikini\",\"bandeau\",\"separate\",\"structured\"], referencePrompt:\"Women's structured bandeau bikini top with removable straps, luxury swimwear\", primaryImageUrl:\"/lamalo/swimwear-women-onepiece.jpg\" }, SWIM_F),\n  ...cc({ name:\"Lamalo High-Waist Bikini Bottom\", description:\"High-waist bikini bottom sold separately with sculpted coverage.\", category:\"swimwear\", subcategory:\"bikini-bottoms\", genderFit:\"female\", materials:[\"82% Nylon\",\"18% Elastane\",\"Swim Lining\"], styleTags:[\"bikini\",\"high-waist\",\"separate\",\"sculpted\"], referencePrompt:\"Women's high-waist bikini bottom, sculpted coverage, luxury swimwear\", primaryImageUrl:\"/lamalo/swimwear-women-onepiece.jpg\" }, SWIM_F),\n  ...cc({ name:\"Lamalo Halter Bikini Top\", description:\"Supportive halter bikini top sold separately with adjustable neck and back ties.\", category:\"swimwear\", subcategory:\"bikini-tops\", genderFit:\"female\", materials:[\"82% Nylon\",\"18% Elastane\",\"Swim Lining\"], styleTags:[\"bikini\",\"halter\",\"separate\",\"supportive\"], referencePrompt:\"Women's supportive halter bikini top with adjustable neck and back ties\", primaryImageUrl:\"/lamalo/swimwear-women-onepiece.jpg\" }, SWIM_F),\n  ...cc({ name:\"Lamalo Cheeky Bikini Bottom\", description:\"Cheeky-cut bikini bottom sold separately with a smooth seamless edge.\", category:\"swimwear\", subcategory:\"bikini-bottoms\", genderFit:\"female\", materials:[\"82% Nylon\",\"18% Elastane\",\"Swim Lining\"], styleTags:[\"bikini\",\"cheeky\",\"separate\",\"seamless\"], referencePrompt:\"Women's cheeky-cut bikini bottom with smooth seamless edge, luxury swimwear\", primaryImageUrl:\"/lamalo/swimwear-women-onepiece.jpg\" }, SWIM_F),$2`,
    "separate bikini additions",
  );

  const newCollections = `\n// ─────────────────────────────────────────────────────────────────────────────\n// COLLECTION 27 — Women's Lingerie Essentials\n// ─────────────────────────────────────────────────────────────────────────────\n\nconst womensLingerieItems: SeedItem[] = [\n  ...cc({ name:\"Lamalo Classic Brief\", description:\"Soft everyday panty brief with smooth waistband and balanced coverage.\", category:\"lingerie\", subcategory:\"panties\", genderFit:\"female\", materials:[\"92% Modal\",\"8% Elastane\"], styleTags:[\"panties\",\"brief\",\"everyday\",\"soft\"], referencePrompt:\"Women's classic everyday panty brief, smooth waistband, accurate garment-only construction\", primaryImageUrl:null }, LINGERIE_F),\n  ...cc({ name:\"Lamalo Bikini Brief\", description:\"Low-rise bikini brief with soft stretch fabric and clean bonded edges.\", category:\"lingerie\", subcategory:\"panties\", genderFit:\"female\", materials:[\"90% Nylon\",\"10% Elastane\"], styleTags:[\"panties\",\"bikini-brief\",\"low-rise\"], referencePrompt:\"Women's low-rise bikini brief panty, clean bonded edges, accurate garment-only construction\", primaryImageUrl:null }, LINGERIE_F),\n  ...cc({ name:\"Lamalo High-Waist Brief\", description:\"High-waist panty brief with smooth supportive fit and full coverage.\", category:\"lingerie\", subcategory:\"panties\", genderFit:\"female\", materials:[\"88% Nylon\",\"12% Elastane\"], styleTags:[\"panties\",\"high-waist\",\"supportive\"], referencePrompt:\"Women's high-waist panty brief, smooth supportive fit, full coverage, garment only\", primaryImageUrl:null }, LINGERIE_F),\n  ...cc({ name:\"Lamalo Seamless Brief\", description:\"Laser-cut seamless panty brief designed for invisible wear under costumes.\", category:\"lingerie\", subcategory:\"panties\", genderFit:\"female\", materials:[\"Polyamide Microfibre\",\"Elastane\"], styleTags:[\"panties\",\"seamless\",\"invisible\"], referencePrompt:\"Women's laser-cut seamless panty brief, invisible bonded edges, garment only\", primaryImageUrl:null }, LINGERIE_F),\n  ...cc({ name:\"Lamalo Thong\", description:\"Minimal thong panty in ultra-soft stretch fabric with a clean waistband.\", category:\"lingerie\", subcategory:\"panties\", genderFit:\"female\", materials:[\"90% Nylon\",\"10% Elastane\"], styleTags:[\"panties\",\"thong\",\"minimal\"], referencePrompt:\"Women's minimal thong panty, clean waistband, accurate garment-only construction\", primaryImageUrl:null }, LINGERIE_F),\n  ...cc({ name:\"Lamalo Boyshort Panty\", description:\"Comfortable boyshort panty with fuller coverage and a smooth leg line.\", category:\"lingerie\", subcategory:\"panties\", genderFit:\"female\", materials:[\"92% Modal\",\"8% Elastane\"], styleTags:[\"panties\",\"boyshort\",\"comfort\"], referencePrompt:\"Women's boyshort panty, fuller coverage, smooth leg line, garment only\", primaryImageUrl:null }, LINGERIE_F),\n  ...cc({ name:\"Lamalo Lace Brief\", description:\"Soft lace panty brief with lined front panel and scalloped edge.\", category:\"lingerie\", subcategory:\"panties\", genderFit:\"female\", materials:[\"Stretch Lace\",\"Cotton Gusset\"], styleTags:[\"panties\",\"lace\",\"scalloped\"], referencePrompt:\"Women's soft lace panty brief with lined front panel and scalloped edge, garment only\", primaryImageUrl:null }, LINGERIE_F),\n];\n\nconst womensLingerie: SeedCollection = { name:\"Lamalo Women's Lingerie Essentials\", description:\"Separately purchasable panty styles for wardrobe continuity, from seamless briefs to lace and high-waist cuts.\", collectionType:\"lingerie\", season:\"All-Season\", year:2026, styleTags:[\"lingerie\",\"panties\",\"underwear\",\"women\"], collectionPriceAud:cp(womensLingerieItems), items:womensLingerieItems };\n\n// ─────────────────────────────────────────────────────────────────────────────\n// COLLECTION 28 — Men's Underwear Essentials\n// ─────────────────────────────────────────────────────────────────────────────\n\nconst mensUnderwearItems: SeedItem[] = [\n  ...cc({ name:\"Lamalo Woven Boxer Short\", description:\"Classic woven boxer short with relaxed fit and covered elastic waistband.\", category:\"lingerie\", subcategory:\"boxer-shorts\", genderFit:\"male\", materials:[\"100% Cotton Poplin\"], styleTags:[\"boxer-shorts\",\"woven\",\"relaxed\"], referencePrompt:\"Men's classic woven boxer shorts, relaxed fit, covered elastic waistband, garment only\", primaryImageUrl:null }, UNDERWEAR_M),\n  ...cc({ name:\"Lamalo Boxer Brief\", description:\"Supportive boxer brief with longer leg and soft stretch recovery.\", category:\"lingerie\", subcategory:\"boxer-briefs\", genderFit:\"male\", materials:[\"95% Cotton\",\"5% Elastane\"], styleTags:[\"boxer-briefs\",\"supportive\",\"everyday\"], referencePrompt:\"Men's supportive boxer brief, longer leg, soft stretch recovery, garment only\", primaryImageUrl:null }, UNDERWEAR_M),\n  ...cc({ name:\"Lamalo Trunk\", description:\"Short-leg trunk underwear with a modern close fit and clean waistband.\", category:\"lingerie\", subcategory:\"trunks\", genderFit:\"male\", materials:[\"95% Cotton\",\"5% Elastane\"], styleTags:[\"trunks\",\"underwear\",\"modern\"], referencePrompt:\"Men's short-leg trunk underwear, modern close fit, clean waistband, garment only\", primaryImageUrl:null }, UNDERWEAR_M),\n  ...cc({ name:\"Lamalo Lounge Boxer\", description:\"Comfort-first lounge boxer in breathable cotton jersey.\", category:\"lingerie\", subcategory:\"boxer-shorts\", genderFit:\"male\", materials:[\"100% Cotton Jersey\"], styleTags:[\"boxer-shorts\",\"lounge\",\"comfort\"], referencePrompt:\"Men's lounge boxer shorts, breathable cotton jersey, relaxed garment-only construction\", primaryImageUrl:null }, UNDERWEAR_M),\n  ...cc({ name:\"Lamalo Long-Leg Boxer Brief\", description:\"Long-leg boxer brief designed to remain stable under fitted costumes.\", category:\"lingerie\", subcategory:\"boxer-briefs\", genderFit:\"male\", materials:[\"88% Modal\",\"12% Elastane\"], styleTags:[\"boxer-briefs\",\"long-leg\",\"costume-base\"], referencePrompt:\"Men's long-leg boxer brief, stable close fit for costumes, garment only\", primaryImageUrl:null }, UNDERWEAR_M),\n];\n\nconst mensUnderwear: SeedCollection = { name:\"Lamalo Men's Underwear Essentials\", description:\"Separately purchasable boxer shorts, boxer briefs and trunks for exact costume and scene continuity.\", collectionType:\"lingerie\", season:\"All-Season\", year:2026, styleTags:[\"underwear\",\"boxer-shorts\",\"boxer-briefs\",\"men\"], collectionPriceAud:cp(mensUnderwearItems), items:mensUnderwearItems };\n`;

  source = replaceOnce(source, "\n// ALL COLLECTIONS", `${newCollections}\n// ALL COLLECTIONS`, "new underwear collections insertion");
  source = replaceOnce(source, "  mensComfort,\n  womensEveryday,", "  mensComfort,\n  mensUnderwear,\n  womensEveryday,", "mens underwear collection list");
  source = replaceOnce(source, "  womensComfort,\n  kidsEveryday,", "  womensComfort,\n  womensLingerie,\n  kidsEveryday,", "womens lingerie collection list");
  source = source
    .replace("Twenty-six curated collections", "Twenty-eight curated collections")
    .replace("seniors, swimwear, footwear", "seniors, lingerie, underwear, swimwear, footwear");
  source = replaceOnce(
    source,
    "      const imgUrlsJson = JSON.stringify([imgUrl]);",
    "      const imgUrlsJson = JSON.stringify(item.imageUrls?.length ? item.imageUrls : [imgUrl]);",
    "master image URL persistence",
  );

  write(path, source);
}

function patchCatalogIntegrity() {
  const path = "server/_core/lamaloCatalogIntegrity.ts";
  let source = read(path);
  source = source.replace("EXPECTED_LAMALO_COLLECTION_COUNT = 26", "EXPECTED_LAMALO_COLLECTION_COUNT = 28");
  source = source.replace("[primaryImageUrl, ...existingImages].slice(0, 4)", "[primaryImageUrl, ...existingImages].slice(0, 24)");
  write(path, source);
}

function patchWardrobeContinuity() {
  const path = "server/_core/wardrobeContinuity.ts";
  let source = read(path);
  if (!source.includes("lamaloMasterReferences")) {
    source = `import { lamaloVariantMetadata, wardrobeReferenceImages } from \"./lamaloMasterReferences\";\n\n${source}`;
  }
  source = source.replace("  category?: string | null;\n", "  category?: string | null;\n  subcategory?: string | null;\n  styleTags?: unknown;\n");
  source = replaceRegex(
    source,
    /export function buildWardrobePromptAnchor\(item: WardrobeItemRecord, notes\?: string \| null\): string \{[\s\S]*?\n\}/,
    `export function buildWardrobePromptAnchor(item: WardrobeItemRecord, notes?: string | null): string {\n  const colors = renderJsonList(item.colors);\n  const materials = renderJsonList(item.materials);\n  const styleTags = Array.isArray(item.styleTags) ? item.styleTags.filter((tag): tag is string => typeof tag === \"string\") : [];\n  const isLamaloColourSku = styleTags.includes(\"lamalo-colour-sku\");\n  const lamalo = isLamaloColourSku ? lamaloVariantMetadata(item) : undefined;\n  const referenceImages = wardrobeReferenceImages(item, 24);\n  return [\n    \`WARDROBE ID \${item.id} — \${item.name}\`,\n    item.category && \`category: \${item.category}\`,\n    colors && \`exact colours: \${colors}\`,\n    materials && \`exact materials: \${materials}\`,\n    lamalo && \`LAMALO MASTER DESIGN: \${lamalo.baseDesignName}; master reference key: \${lamalo.masterReferenceKey}\`,\n    lamalo?.selectedColour && \`SEPARATE PURCHASED COLOUR SKU: \${lamalo.selectedColour}; this exact colour is mandatory and must override any neutral colour visible in the shared geometry references\`,\n    referenceImages.length > 1 && \`MULTI-ANGLE CONSTRUCTION LOCK: \${referenceImages.length} approved reference views are attached; reconcile all views as one immutable garment identity\`,\n    lamalo?.referencePackReady && \`360 REFERENCE PACK VERIFIED: preserve construction and proportions from the full approved master pack\`,\n    lamalo && !lamalo.referencePackReady && \`360 REFERENCE PACK PENDING: use the current master view and hard-lock the selected colour; do not claim full multi-angle verification\`,\n    item.referencePrompt && \`visual reference: \${item.referencePrompt.trim()}\`,\n    \"COVERAGE HARD-LOCK: every garment physically replaces and occludes the body region it covers. Gloves cover hands and fingers; hats, hoods and helmets cover the hair they enclose; clothing and armour cover the torso and limbs beneath them; masks and cowls cover the face area shown in the reference. Never render covered skin, hair or anatomy through the costume.\",\n    item.faceCoverage === \"full\" && \"FULL FACE COVERAGE: the costume mask/cowl/helmet completely replaces the visible actor face; no facial skin, hairline, eyes, mouth or uncovered identity may appear\",\n    item.faceCoverage === \"partial\" && \"PARTIAL FACE COVERAGE: preserve the exact mask/helmet coverage shown in the costume reference\",\n    item.primaryImageUrl && \`primary reference image: \${item.primaryImageUrl}\`,\n    notes?.trim() && \`placement and fit notes: \${notes.trim()}\`,\n    \"LOCK: preserve the same garment design, cut, selected colour, material, fit, logos, damage and accessories in every assigned scene until the assignment range ends.\",\n  ].filter(Boolean).join(\"; \ ").replace(/;  /g, \"; \ ");\n}`,
    "wardrobe prompt anchor",
  );
  write(path, source);
}

function patchSceneGenerationContext() {
  const path = "server/_core/sceneGenerationContext.ts";
  let source = read(path);
  if (!source.includes("lamaloMasterReferences")) {
    source = source.replace(
      'import { buildCharacterDNA } from "./characterConsistency";',
      'import { buildCharacterDNA } from "./characterConsistency";\nimport { wardrobeReferenceImages } from "./lamaloMasterReferences";',
    );
  }
  source = source.replace(
    "  wardrobeReferenceImageUrl?: string;\n",
    "  wardrobeReferenceImageUrl?: string;\n  wardrobeReferenceImageUrls?: string[];\n",
  );
  source = replaceRegex(
    source,
    /function imageFromItem\(item: any\): string \| undefined \{[\s\S]*?\n\}/,
    `function imagesFromItem(item: any): string[] {\n  return wardrobeReferenceImages(item, 24);\n}`,
    "scene item image resolver",
  );
  source = source.replace(
    "    let wardrobeReferenceImageUrl: string | undefined;",
    "    let wardrobeReferenceImageUrl: string | undefined;\n    let wardrobeReferenceImageUrls: string[] = [];",
  );
  source = source.replace(
    "      wardrobeReferenceImageUrl = imageFromItem(selectedItem);\n      wardrobeLines.push(`CHARACTER ${character.id} — ${character.name} MUST WEAR ONLY: ${wardrobeAnchor}`);\n      if (wardrobeReferenceImageUrl) wardrobeImages.push(wardrobeReferenceImageUrl);",
    "      wardrobeReferenceImageUrls = imagesFromItem(selectedItem);\n      wardrobeReferenceImageUrl = wardrobeReferenceImageUrls[0];\n      wardrobeLines.push(`CHARACTER ${character.id} — ${character.name} MUST WEAR ONLY: ${wardrobeAnchor}`);\n      wardrobeImages.push(...wardrobeReferenceImageUrls);",
  );
  source = source.replace(
    "      wardrobeReferenceImageUrl,\n      faceCoverage,",
    "      wardrobeReferenceImageUrl,\n      wardrobeReferenceImageUrls,\n      faceCoverage,",
  );
  source = source.replace(
    "    const image = imageFromItem(item);\n    if (image) wardrobeImages.push(image);",
    "    const images = imagesFromItem(item);\n    wardrobeImages.push(...images);",
  );
  source = source.replace(
    "    ...wardrobeBindings.flatMap((binding) => [binding.characterReferenceImageUrl, binding.wardrobeReferenceImageUrl]),",
    "    ...wardrobeBindings.flatMap((binding) => [binding.characterReferenceImageUrl, binding.wardrobeReferenceImageUrl, ...(binding.wardrobeReferenceImageUrls || [])]),",
  );
  write(path, source);
}

function patchMarketplace() {
  const path = "client/src/pages/WardrobeMarketplacePage.tsx";
  let source = read(path);
  source = source.replace(
    'title: "Zero colour drift — each shade is a separate item",\n      body: "Generic AI treats \\"red jacket\\" as open to interpretation — and it drifts. Every Lamalo colour variant is a distinct catalogue entry with its own locked reference prompt, so the model renders exactly what you chose.",',
    'title: "Shared 360° master — every colour remains a separate item",\n      body: "Each design uses one approved multi-angle construction reference pack, while every colour is still its own catalogue SKU, checkout and permanent inventory item. The chosen colour is hard-locked for every scene.",',
  );

  source = replaceRegex(
    source,
    /function ItemCard\([\s\S]*?\n\}\n\n\/\/ ─── Collection accordion/,
    `function swatchBackground(colour: string): string {\n  const key = colour.toLowerCase();\n  const map: Record<string, string> = {\n    black: \"#111111\", white: \"#f7f7f2\", navy: \"#172554\", charcoal: \"#374151\",\n    \"charcoal grey\": \"#374151\", grey: \"#9ca3af\", \"grey marle\": \"#9ca3af\",\n    olive: \"#556b2f\", \"sage green\": \"#9caf88\", burgundy: \"#7f1d1d\",\n    \"cobalt blue\": \"#0047ab\", teal: \"#0f766e\", white: \"#f8fafc\",\n    \"blush pink\": \"#efc3c7\", \"coral pink\": \"#f88379\", \"nude beige\": \"#d8b4a0\",\n    camel: \"#c19a6b\", cream: \"#fffdd0\", stone: \"#b7b09c\", red: \"#b91c1c\",\n  };\n  if (map[key]) return map[key];\n  if (key.includes(\"/\") || key.includes(\"floral\") || key.includes(\"check\") || key.includes(\"stripe\")) {\n    return \"linear-gradient(135deg,#111 0 25%,#d4af37 25% 50%,#f5f5f5 50% 75%,#6b7280 75%)\";\n  }\n  return \"linear-gradient(135deg,#d4af37,#6b7280)\";\n}\n\nfunction ItemCard({\n  variants,\n  onBuy,\n  isBuying,\n}: {\n  variants: any[];\n  onBuy: (itemId: number) => void;\n  isBuying: (itemId: number) => boolean;\n}) {\n  const [imgErr, setImgErr] = useState(false);\n  const [selectedId, setSelectedId] = useState<number>(() => variants[0]?.id);\n  useEffect(() => {\n    if (!variants.some((variant) => variant.id === selectedId)) setSelectedId(variants[0]?.id);\n  }, [variants, selectedId]);\n  const item = variants.find((variant) => variant.id === selectedId) ?? variants[0];\n  if (!item) return null;\n  const color = item.colors?.[0] ?? item.name?.split(\" — \").pop() ?? \"\";\n  const baseName = item.name?.split(\" — \")[0] ?? item.name;\n  const cents = item.retailPriceAud ?? 100;\n  const priceLabel = \`A$\${(cents / 100).toFixed(2)}\`;\n\n  return (\n    <div className=\"group rounded-xl border border-amber-500/20 hover:border-amber-500/30 glass-card/[0.02] hover:glass-card/[0.04] overflow-hidden transition-all duration-200 flex flex-col hover:shadow-amber-500/20\">\n      <div className=\"relative h-36 bg-gradient-to-br from-white/5 to-black overflow-hidden\">\n        {item.primaryImageUrl && !imgErr ? (\n          <img src={item.primaryImageUrl} alt={baseName} className=\"w-full h-full object-cover group-hover:scale-105 transition-transform duration-300\" onError={() => setImgErr(true)} />\n        ) : (\n          <div className=\"w-full h-full flex items-center justify-center\"><Shirt className=\"h-10 w-10 text-white/10\" /></div>\n        )}\n        <div className=\"absolute top-2 right-2\">\n          <span className=\"text-[9px] font-bold uppercase tracking-wider bg-black/75 backdrop-blur-sm border border-amber-500/20 text-white/80 rounded-full px-2 py-0.5\">{color}</span>\n        </div>\n        <div className=\"absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none\" />\n      </div>\n\n      <div className=\"p-3 flex flex-col gap-2 flex-1\">\n        <div>\n          <p className=\"text-xs font-bold text-white leading-tight line-clamp-2\">{baseName}</p>\n          <div className=\"flex items-center gap-1.5 mt-1 flex-wrap\">\n            <Badge className=\"bg-purple-500/15 text-purple-200 border border-purple-400/30 text-[9px] px-1.5 py-0\">Virtual item</Badge>\n            <Badge className=\"bg-amber-500/10 text-amber-300 border border-amber-500/25 text-[9px] px-1.5 py-0\">Shared 360° master</Badge>\n          </div>\n        </div>\n\n        <div className=\"flex flex-wrap gap-1.5\" role=\"radiogroup\" aria-label={\`Choose colour for \${baseName}\`}>\n          {variants.map((variant) => {\n            const variantColour = variant.colors?.[0] ?? variant.name?.split(\" — \").pop() ?? \"Colour\";\n            const selected = variant.id === item.id;\n            return (\n              <button\n                key={variant.id}\n                type=\"button\"\n                role=\"radio\"\n                aria-checked={selected}\n                aria-label={variantColour}\n                title={variantColour}\n                onClick={() => { setSelectedId(variant.id); setImgErr(false); }}\n                className={\`h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 \${selected ? \"border-amber-400 ring-2 ring-amber-400/30\" : \"border-white/25\"}\`}\n                style={{ background: swatchBackground(variantColour) }}\n              />\n            );\n          })}\n        </div>\n        <p className=\"text-[10px] text-white/35\"><span className=\"text-amber-400/80\">{color}</span> is a separate purchasable item and permanent inventory entry.</p>\n\n        <div className=\"flex items-center justify-between mt-auto pt-1\">\n          <div className=\"flex items-center gap-1 text-amber-400\"><Tag className=\"h-3 w-3\" /><span className=\"text-xs font-black\">{priceLabel}</span></div>\n          <Button size=\"sm\" onClick={() => onBuy(item.id)} disabled={isBuying(item.id)} className=\"h-7 px-3 text-[10px] font-bold bg-amber-500 hover:bg-amber-400 text-black rounded-lg\">\n            {isBuying(item.id) ? <Loader2 className=\"h-3 w-3 animate-spin text-amber-400\" /> : \`Buy \${color}\`}\n          </Button>\n        </div>\n      </div>\n    </div>\n  );\n}\n\n// ─── Collection accordion`,
    "marketplace item card",
  );

  source = source.replace(
    "  const items: any[] = col.items ?? [];\n  const itemCount = items.length;",
    `  const items: any[] = col.items ?? [];\n  const itemCount = items.length;\n  const groupedVariants = new Map<string, any[]>();\n  for (const item of items) {\n    const baseName = item.name?.split(\" — \")[0] ?? item.name;\n    const variants = groupedVariants.get(baseName) ?? [];\n    variants.push(item);\n    groupedVariants.set(baseName, variants);\n  }\n  const variantGroups = Array.from(groupedVariants.values());\n  const designCount = variantGroups.length;`,
  );
  source = source.replace(
    "            {itemCount} items · From A${(minItemCents / 100).toFixed(2)} each · Bundle saves 10%",
    "            {designCount} designs · {itemCount} separate colour SKUs · From A${(minItemCents / 100).toFixed(2)} each",
  );
  source = source.replace("`Buy all ${itemCount} — ${bundleLabel}`", "`Buy all ${itemCount} colour SKUs — ${bundleLabel}`");
  source = source.replace("{expanded ? \"Hide items\" : `Browse ${itemCount} items`}", "{expanded ? \"Hide items\" : `Browse ${designCount} designs`}");
  source = replaceOnce(
    source,
    `              {items.map((item: any) => (\n                <ItemCard\n                  key={item.id}\n                  item={item}\n                  onBuy={() => onBuyItem(item.id)}\n                  isBuying={leasingId === \`item-\${item.id}\`}\n                />\n              ))}`,
    `              {variantGroups.map((variants: any[]) => (\n                <ItemCard\n                  key={variants[0]?.name?.split(\" — \")[0] ?? variants[0]?.id}\n                  variants={variants}\n                  onBuy={onBuyItem}\n                  isBuying={(itemId) => leasingId === \`item-\${itemId}\`}\n                />\n              ))}`,
    "variant grouped item grid",
  );
  write(path, source);
}

function patchManifests() {
  for (const path of [
    "docs/lamalo-image-production.json",
    "docs/lamalo-image-production-worker-a.json",
    "docs/lamalo-image-production-worker-b.json",
  ]) {
    if (!fs.existsSync(path)) continue;
    const data = JSON.parse(read(path));
    data.status = "legacy_per_colour_records_preserved";
    data.supersededBy = "docs/lamalo-master-reference-production.json";
    data.supersededReason = "Lamalo now produces one approved multi-angle master reference pack per base design while retaining every colour as a separate purchasable SKU.";
    write(path, `${JSON.stringify(data, null, 2)}\n`);
  }
  const handoffPath = "docs/LAMALO_SECOND_ACCOUNT_HANDOFF.md";
  if (fs.existsSync(handoffPath)) {
    let handoff = read(handoffPath);
    const notice = `> **WORKFLOW SUPERSEDED — 24 July 2026:** Do not continue generating one full image per colourway. Read \`docs/lamalo-master-reference-production.json\`. Generate one approved 12- or 24-angle master reference pack per base design. Every colour remains a separate purchasable SKU and uses the shared geometry pack with its own selected-colour hard lock. Existing verified Adobe assets and ordinal records remain preserved as legacy evidence.\n\n`;
    if (!handoff.includes("WORKFLOW SUPERSEDED — 24 July 2026")) handoff = notice + handoff;
    write(handoffPath, handoff);
  }
}

function cleanupBootstrap() {
  for (const path of [
    "scripts/apply-lamalo-master-360-variants.mjs",
    ".github/workflows/apply-lamalo-master-360-variants.yml",
  ]) {
    if (fs.existsSync(path)) fs.unlinkSync(path);
  }
}

patchLamaloSeed();
patchCatalogIntegrity();
patchWardrobeContinuity();
patchSceneGenerationContext();
patchMarketplace();
patchManifests();
cleanupBootstrap();
console.log("Lamalo master 360° variant architecture applied.");
