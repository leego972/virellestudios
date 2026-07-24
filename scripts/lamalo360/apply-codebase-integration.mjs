import fs from "node:fs";

function patch(path, replacements) {
  let source = fs.readFileSync(path, "utf8");
  for (const replacement of replacements) {
    const { before, after, label } = replacement;
    if (after && source.includes(after)) continue;
    if (!source.includes(before)) {
      if (!after) continue;
      throw new Error(`Could not find ${label} in ${path}`);
    }
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
]);

patch("scripts/lamalo360/blender/render_turntable.py", [
  {
    label: "texture argument",
    before: '    parser.add_argument("--colour", default=None, help="Optional #RRGGBB material tint")\n',
    after: '    parser.add_argument("--colour", default=None, help="Optional #RRGGBB material tint")\n    parser.add_argument("--texture", default=None, help="Optional seamless albedo texture")\n',
  },
  {
    label: "texture material function",
    before: '\ndef create_material(name, colour, roughness=0.65):\n',
    after: '\ndef apply_texture_materials(meshes, texture_path):\n    image = bpy.data.images.load(str(texture_path), check_existing=True)\n    for obj in meshes:\n        for material in obj.data.materials:\n            if not material:\n                continue\n            material.use_nodes = True\n            nodes = material.node_tree.nodes\n            links = material.node_tree.links\n            principled = next((node for node in nodes if node.type == "BSDF_PRINCIPLED"), None)\n            if principled is None:\n                principled = nodes.new("ShaderNodeBsdfPrincipled")\n                output = next((node for node in nodes if node.type == "OUTPUT_MATERIAL"), None) or nodes.new("ShaderNodeOutputMaterial")\n                links.new(principled.outputs["BSDF"], output.inputs["Surface"])\n            texture = nodes.new("ShaderNodeTexImage")\n            texture.image = image\n            texture.interpolation = "Linear"\n            texture.extension = "REPEAT"\n            mapping = nodes.new("ShaderNodeMapping")\n            texcoord = nodes.new("ShaderNodeTexCoord")\n            mapping.inputs["Scale"].default_value = (3.0, 3.0, 3.0)\n            links.new(texcoord.outputs["UV"], mapping.inputs["Vector"])\n            links.new(mapping.outputs["Vector"], texture.inputs["Vector"])\n            base = principled.inputs.get("Base Color")\n            if base.is_linked:\n                links.remove(base.links[0])\n            links.new(texture.outputs["Color"], base)\n            roughness = principled.inputs.get("Roughness")\n            if roughness and not roughness.is_linked:\n                roughness.default_value = 0.58\n\n\ndef create_material(name, colour, roughness=0.65):\n',
  },
  {
    label: "texture application",
    before: '    if args.colour:\n        tint_materials(meshes, args.colour)\n',
    after: '    if args.texture:\n        apply_texture_materials(meshes, Path(args.texture).resolve())\n    elif args.colour:\n        tint_materials(meshes, args.colour)\n',
  },
  {
    label: "texture metadata",
    before: '        "colourHex": args.colour,\n',
    after: '        "colourHex": args.colour,\n        "texture": str(Path(args.texture).resolve()) if args.texture else None,\n',
  },
]);

patch("scripts/lamalo360/catalogue.mjs", [
  {
    label: "commercial geometry provider",
    before: '      geometry: "Hunyuan3D 2.1 image-to-shape or an approved artist-authored replacement mesh",\n',
    after: '      geometry: "Meshy 6 commercial image-to-3D PBR generation or an approved artist-authored replacement mesh",\n',
  },
  {
    label: "resumable manifest merge",
    before: 'function parseArgs(argv) {\n',
    after: 'const PRODUCTION_STATE_FIELDS = [\n  "status",\n  "sourceReferenceStatus",\n  "geometryStatus",\n  "pbrStatus",\n  "turntableStatus",\n  "qualityStatus",\n  "publishedAt",\n  "model3dUrl",\n  "publishedColourSkus",\n  "updatedVariants",\n  "failedAt",\n  "lastError",\n];\n\nfunction mergeProductionState(next, existing) {\n  const previousByKey = new Map((existing?.masters ?? []).map((master) => [master.masterKey, master]));\n  next.generatedAt = existing?.generatedAt || next.generatedAt;\n  if (existing?.updatedAt) next.updatedAt = existing.updatedAt;\n  next.masters = next.masters.map((master) => {\n    const previous = previousByKey.get(master.masterKey);\n    if (!previous) return master;\n    const state = {};\n    for (const field of PRODUCTION_STATE_FIELDS) {\n      if (Object.prototype.hasOwnProperty.call(previous, field)) state[field] = previous[field];\n    }\n    return { ...master, ...state };\n  });\n  next.summary.completedBaseDesigns = next.masters.filter((master) => master.status === "published").length;\n  next.summary.failedBaseDesigns = next.masters.filter((master) => master.status === "failed").length;\n  return next;\n}\n\nfunction parseArgs(argv) {\n',
  },
  {
    label: "state-preserving catalogue CLI",
    before: '  const args = parseArgs(process.argv);\n  const catalogue = compileLamaloClothingCatalogue();\n  const serialized = `${JSON.stringify(catalogue, null, 2)}\\n`;\n  if (args.check) {\n    if (!fs.existsSync(args.output)) throw new Error(`Missing generated manifest: ${args.output}`);\n    const current = JSON.parse(fs.readFileSync(args.output, "utf8"));\n    const comparable = { ...catalogue, generatedAt: current.generatedAt };\n    if (`${JSON.stringify(comparable, null, 2)}\\n` !== `${JSON.stringify(current, null, 2)}\\n`) {\n      throw new Error("Lamalo clothing manifest is stale. Run pnpm lamalo360:catalogue.");\n    }\n    console.log(`Lamalo clothing manifest is current: ${catalogue.summary.clothingBaseDesigns} masters, ${catalogue.summary.separateColourSkus} colour SKUs.`);\n  } else {\n    fs.mkdirSync(path.dirname(args.output), { recursive: true });\n    fs.writeFileSync(args.output, serialized);\n    console.log(`Wrote ${args.output}: ${catalogue.summary.clothingBaseDesigns} masters, ${catalogue.summary.separateColourSkus} colour SKUs.`);\n  }\n',
    after: '  const args = parseArgs(process.argv);\n  const current = fs.existsSync(args.output) ? JSON.parse(fs.readFileSync(args.output, "utf8")) : null;\n  const catalogue = mergeProductionState(compileLamaloClothingCatalogue(), current);\n  const serialized = `${JSON.stringify(catalogue, null, 2)}\\n`;\n  if (args.check) {\n    if (!current) throw new Error(`Missing generated manifest: ${args.output}`);\n    if (serialized !== `${JSON.stringify(current, null, 2)}\\n`) {\n      throw new Error("Lamalo clothing manifest is stale. Run pnpm lamalo360:catalogue.");\n    }\n    console.log(`Lamalo clothing manifest is current: ${catalogue.summary.clothingBaseDesigns} masters, ${catalogue.summary.separateColourSkus} colour SKUs.`);\n  } else {\n    fs.mkdirSync(path.dirname(args.output), { recursive: true });\n    fs.writeFileSync(args.output, serialized);\n    console.log(`Wrote ${args.output}: ${catalogue.summary.clothingBaseDesigns} masters, ${catalogue.summary.separateColourSkus} colour SKUs.`);\n  }\n',
  },
]);

patch("scripts/lamalo360/generate-source-reference.mjs", [{
  label: "highest quality GPT image default",
  before: '  const model = process.env.LAMALO_SOURCE_IMAGE_MODEL ?? "gpt-image-1";\n',
  after: '  const model = process.env.LAMALO_SOURCE_IMAGE_MODEL ?? "gpt-image-1.5";\n',
}]);

patch("scripts/lamalo360/generate-pattern-texture.mjs", [{
  label: "highest quality texture image default",
  before: '  const model = process.env.LAMALO_TEXTURE_IMAGE_MODEL ?? "gpt-image-1";\n',
  after: '  const model = process.env.LAMALO_TEXTURE_IMAGE_MODEL ?? "gpt-image-1.5";\n',
}]);

patch("scripts/lamalo360/README.md", [
  {
    label: "commercial Meshy geometry description",
    before: '- One Hunyuan3D 2.1 textured GLB generation.\n',
    after: '- One paid Meshy 6 PBR GLB generation with commercial output ownership, or an approved artist-authored replacement mesh.\n',
  },
  {
    label: "worker Meshy requirement",
    before: '- Hunyuan3D 2.1 API server available at `HUNYUAN3D_URL` and healthy at `/health`.\n',
    after: '- Paid Meshy API access through `MESHY_API_KEY`; generated assets are downloaded immediately and stored in Virelle-owned object storage.\n',
  },
  {
    label: "environment Meshy key",
    before: 'HUNYUAN3D_URL=http://127.0.0.1:8081\n',
    after: 'MESHY_API_KEY=...\nMESHY_IMAGE_TO_3D_MODEL=meshy-6\n',
  },
]);

console.log("Lamalo true 360 codebase integration applied.");
