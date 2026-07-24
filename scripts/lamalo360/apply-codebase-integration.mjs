import fs from "node:fs";

function patch(path, replacements) {
  let source = fs.readFileSync(path, "utf8");
  for (const replacement of replacements) {
    const { before, after, label } = replacement;
    if (source.includes(after)) continue;
    if (!source.includes(before)) throw new Error(`Could not find ${label} in ${path}`);
    source = source.replace(before, after);
  }
  fs.writeFileSync(path, source);
}

patch("drizzle/schema.ts", [{
  label: "wardrobe 360 schema fields",
  before: '  referencePrompt: text("referencePrompt"),\n',
  after: '  referencePrompt: text("referencePrompt"),\n  // Lamalo production-grade 3D master and deterministic turntable assets.\n  masterReferenceKey: varchar("masterReferenceKey", { length: 255 }),\n  model3dUrl: text("model3dUrl"),\n  turntableFrameUrls: json("turntableFrameUrls"),\n  turntableFrameCount: int("turntableFrameCount").default(0).notNull(),\n  // pending | processing | machine_validated | ready | failed\n  turntableStatus: varchar("turntableStatus", { length: 32 }).default("pending").notNull(),\n  turntableUpdatedAt: timestamp("turntableUpdatedAt"),\n  renderPipelineVersion: int("renderPipelineVersion").default(0).notNull(),\n  selectedColourKey: varchar("selectedColourKey", { length: 160 }),\n  solidColourHex: varchar("solidColourHex", { length: 16 }),\n',
}]);

patch("server/lamalo-seed.ts", [{
  label: "runtime 360 columns",
  before: '        ["referencePrompt",          "TEXT NULL"],\n',
  after: '        ["referencePrompt",          "TEXT NULL"],\n        ["masterReferenceKey",        "VARCHAR(255) NULL"],\n        ["model3dUrl",                "TEXT NULL"],\n        ["turntableFrameUrls",        "JSON NULL"],\n        ["turntableFrameCount",       "INT NOT NULL DEFAULT 0"],\n        ["turntableStatus",           "VARCHAR(32) NOT NULL DEFAULT \'pending\'"],\n        ["turntableUpdatedAt",        "TIMESTAMP NULL"],\n        ["renderPipelineVersion",     "INT NOT NULL DEFAULT 0"],\n        ["selectedColourKey",         "VARCHAR(160) NULL"],\n        ["solidColourHex",            "VARCHAR(16) NULL"],\n',
}]);

patch("server/_core/wardrobePurchaseInventory.ts", [{
  label: "purchase snapshot 360 fields",
  before: '    referencePrompt: source.referencePrompt,\n',
  after: '    referencePrompt: source.referencePrompt,\n    masterReferenceKey: source.masterReferenceKey,\n    model3dUrl: source.model3dUrl,\n    turntableFrameUrls: source.turntableFrameUrls,\n    turntableFrameCount: source.turntableFrameCount,\n    turntableStatus: source.turntableStatus,\n    turntableUpdatedAt: source.turntableUpdatedAt,\n    renderPipelineVersion: source.renderPipelineVersion,\n    selectedColourKey: source.selectedColourKey,\n    solidColourHex: source.solidColourHex,\n',
}]);

patch("client/src/pages/WardrobeMarketplacePage.tsx", [
  {
    label: "360 viewer import",
    before: 'import { toast } from "sonner";\n',
    after: 'import { toast } from "sonner";\nimport { Lamalo360Viewer } from "@/components/Lamalo360Viewer";\n',
  },
  {
    label: "remove legacy image error state",
    before: '  const [imgErr, setImgErr] = useState(false);\n',
    after: '',
  },
  {
    label: "strict turntable readiness",
    before: '  const referencePackReady = Array.isArray(item.styleTags) && item.styleTags.includes("reference-pack:360-ready");\n',
    after: '  const referencePackReady = item.turntableStatus === "ready" && Number(item.turntableFrameCount) === 36 && Array.isArray(item.turntableFrameUrls) && item.turntableFrameUrls.length === 36;\n',
  },
  {
    label: "interactive turntable viewer",
    before: '        {item.primaryImageUrl && !imgErr ? (\n          <img src={item.primaryImageUrl} alt={baseName} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" onError={() => setImgErr(true)} />\n        ) : (\n          <div className="w-full h-full flex items-center justify-center"><Shirt className="h-10 w-10 text-white/10" /></div>\n        )}\n',
    after: '        <Lamalo360Viewer\n          frames={item.turntableFrameUrls}\n          fallback={item.primaryImageUrl}\n          alt={`${baseName} — ${color}`}\n          ready={referencePackReady}\n          className="h-full w-full"\n        />\n',
  },
  {
    label: "turntable badge wording",
    before: '{referencePackReady ? "360° master ready" : "360° master queued"}',
    after: '{referencePackReady ? "True 360° ready" : "True 360° queued"}',
  },
  {
    label: "colour selection reset",
    before: '                onClick={() => { setSelectedId(variant.id); setImgErr(false); }}\n',
    after: '                onClick={() => setSelectedId(variant.id)}\n',
  },
  {
    label: "master-safe grouping",
    before: '    const baseName = item.name?.split(" — ")[0] ?? item.name;\n    const variants = groupedVariants.get(baseName) ?? [];\n    variants.push(item);\n    groupedVariants.set(baseName, variants);\n',
    after: '    const baseName = item.name?.split(" — ")[0] ?? item.name;\n    const groupKey = item.masterReferenceKey || `${baseName}:${item.genderFit || "unisex"}:${item.category || "garment"}:${item.subcategory || "default"}`;\n    const variants = groupedVariants.get(groupKey) ?? [];\n    variants.push(item);\n    groupedVariants.set(groupKey, variants);\n',
  },
  {
    label: "Australian price label",
    before: '{designCount} designs · {itemCount} separate colour SKUs · From A${(minItemCents / 100).toFixed(2)} each',
    after: '{designCount} designs · {itemCount} separate colour SKUs · From A${(minItemCents / 100).toFixed(2)} each',
  },
]);

console.log("Lamalo true 360 codebase integration applied.");
