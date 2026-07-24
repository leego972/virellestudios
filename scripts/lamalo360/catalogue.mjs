import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const ROOT = process.cwd();
const SEED_PATH = path.join(ROOT, "server/lamalo-seed.ts");
const DEFAULT_OUTPUT = path.join(ROOT, "docs/lamalo-clothing-360-production.json");

const CLOTHING_CATEGORIES = new Set([
  "tops",
  "bottoms",
  "outerwear",
  "dresses",
  "swimwear",
  "lingerie",
  "sleepwear",
  "uniforms",
  "uniform",
  "suits",
  "knitwear",
  "sportswear",
]);

const EXCLUDED_COLLECTION_TYPES = new Set([
  "accessories",
  "footwear",
]);

function slug(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160);
}

function propertyName(node) {
  if (!node) return undefined;
  if (ts.isIdentifier(node) || ts.isStringLiteralLike(node) || ts.isNumericLiteral(node)) {
    return node.text;
  }
  return undefined;
}

function evaluate(node, env) {
  if (!node) return undefined;
  if (ts.isParenthesizedExpression(node)) return evaluate(node.expression, env);
  if (ts.isStringLiteralLike(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (node.kind === ts.SyntaxKind.NullKeyword) return null;
  if (ts.isIdentifier(node)) {
    if (!env.has(node.text)) throw new Error(`Unknown static identifier: ${node.text}`);
    return env.get(node.text);
  }
  if (ts.isPrefixUnaryExpression(node) && node.operator === ts.SyntaxKind.MinusToken) {
    return -Number(evaluate(node.operand, env));
  }
  if (ts.isArrayLiteralExpression(node)) {
    return node.elements.map((element) => evaluate(element, env));
  }
  if (ts.isObjectLiteralExpression(node)) {
    const value = {};
    for (const property of node.properties) {
      if (ts.isPropertyAssignment(property)) {
        const name = propertyName(property.name);
        if (name) value[name] = evaluate(property.initializer, env);
      } else if (ts.isShorthandPropertyAssignment(property)) {
        value[property.name.text] = evaluate(property.name, env);
      }
    }
    return value;
  }
  if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
    const receiver = evaluate(node.expression.expression, env);
    const method = node.expression.name.text;
    if (method === "slice" && Array.isArray(receiver)) {
      const start = node.arguments[0] ? Number(evaluate(node.arguments[0], env)) : 0;
      const end = node.arguments[1] ? Number(evaluate(node.arguments[1], env)) : undefined;
      return receiver.slice(start, end);
    }
  }
  throw new Error(`Unsupported static syntax: ${ts.SyntaxKind[node.kind]}`);
}

function variableDeclarations(sourceFile) {
  const declarations = [];
  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) declarations.push(declaration);
  }
  return declarations;
}

function templateFor(item, collection) {
  const text = `${item.name} ${item.category} ${item.subcategory} ${(item.styleTags ?? []).join(" ")}`.toLowerCase();
  if (collection.collectionType === "uniform" || /uniform|scrub|paramedic|firefighter|security|chef/.test(text)) return "uniform";
  if (/bikini top|sport bra|bra/.test(text)) return "bra-top";
  if (/bikini bottom|brief|thong|panty|trunk|boxer/.test(text)) return "underwear";
  if (/one-piece|swimsuit|rashguard|swim tunic/.test(text)) return "swimsuit";
  if (/dress|jumpsuit|nightgown/.test(text)) return "dress";
  if (/skirt|skort/.test(text)) return "skirt";
  if (/short/.test(text)) return "shorts";
  if (/trouser|pant|jean|chino|jogger|tight|legging|cargo/.test(text)) return "trousers";
  if (/coat|jacket|blazer|bomber|gilet|vest|windbreaker/.test(text)) return "outerwear";
  if (/hoodie|sweater|cardigan|fleece|knit/.test(text)) return "knit-top";
  if (/shirt|polo|jersey|guernsey|henley|blouse/.test(text)) return "structured-top";
  if (/tee|tank|crop top/.test(text)) return "simple-top";
  return "garment";
}

function isComplex(item, collection) {
  if (collection.collectionType === "uniform") return true;
  if (["outerwear", "dresses"].includes(String(item.category).toLowerCase())) return true;
  return /set|tracksuit|jumpsuit|coat|jacket|blazer|uniform|scrub|dress|pyjama/.test(
    `${item.name} ${item.subcategory}`.toLowerCase(),
  );
}

function requiresTextureVariant(colour) {
  return /[/]|floral|check|stripe|print|two-tone|gold|silver|dial|herringbone|cork/i.test(String(colour));
}

export function compileLamaloClothingCatalogue(seedSource = fs.readFileSync(SEED_PATH, "utf8")) {
  const sourceFile = ts.createSourceFile(
    SEED_PATH,
    seedSource,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const declarations = variableDeclarations(sourceFile);
  const env = new Map();

  // Resolve static palettes first. Repeat until no additional constants resolve.
  let changed = true;
  while (changed) {
    changed = false;
    for (const declaration of declarations) {
      if (!ts.isIdentifier(declaration.name) || !declaration.initializer || env.has(declaration.name.text)) continue;
      try {
        const value = evaluate(declaration.initializer, env);
        if (Array.isArray(value) && value.every((entry) => typeof entry === "string")) {
          env.set(declaration.name.text, value);
          changed = true;
        }
      } catch {
        // Collections and item arrays depend on runtime helpers; they are parsed below.
      }
    }
  }

  const itemArrays = new Map();
  for (const declaration of declarations) {
    if (!ts.isIdentifier(declaration.name) || !ts.isArrayLiteralExpression(declaration.initializer)) continue;
    const baseItems = [];
    for (const element of declaration.initializer.elements) {
      if (!ts.isSpreadElement(element) || !ts.isCallExpression(element.expression)) continue;
      const call = element.expression;
      if (!ts.isIdentifier(call.expression) || call.expression.text !== "cc" || call.arguments.length < 2) continue;
      const item = evaluate(call.arguments[0], env);
      const colours = evaluate(call.arguments[1], env);
      if (!item?.name || !Array.isArray(colours)) throw new Error(`Invalid cc() entry in ${declaration.name.text}`);
      baseItems.push({ ...item, colours: [...new Set(colours.map(String))] });
    }
    if (baseItems.length) itemArrays.set(declaration.name.text, baseItems);
  }

  const collections = new Map();
  let orderedCollectionIds = [];
  for (const declaration of declarations) {
    if (!ts.isIdentifier(declaration.name) || !declaration.initializer) continue;
    if (declaration.name.text === "ALL_COLLECTIONS" && ts.isArrayLiteralExpression(declaration.initializer)) {
      orderedCollectionIds = declaration.initializer.elements
        .filter(ts.isIdentifier)
        .map((identifier) => identifier.text);
      continue;
    }
    if (!ts.isObjectLiteralExpression(declaration.initializer)) continue;
    const properties = new Map();
    for (const property of declaration.initializer.properties) {
      if (!ts.isPropertyAssignment(property)) continue;
      const name = propertyName(property.name);
      if (name) properties.set(name, property.initializer);
    }
    const itemsNode = properties.get("items");
    if (!itemsNode || !ts.isIdentifier(itemsNode) || !itemArrays.has(itemsNode.text)) continue;
    const read = (name) => {
      const node = properties.get(name);
      return node ? evaluate(node, env) : undefined;
    };
    collections.set(declaration.name.text, {
      id: declaration.name.text,
      name: read("name"),
      description: read("description"),
      collectionType: read("collectionType"),
      season: read("season"),
      year: read("year"),
      styleTags: read("styleTags") ?? [],
      items: itemArrays.get(itemsNode.text),
    });
  }

  if (!orderedCollectionIds.length) throw new Error("ALL_COLLECTIONS order could not be read.");

  const masters = [];
  const seen = new Set();
  let colourSkuCount = 0;
  const excludedCollections = [];

  for (const collectionId of orderedCollectionIds) {
    const collection = collections.get(collectionId);
    if (!collection) throw new Error(`Collection ${collectionId} could not be resolved.`);
    if (EXCLUDED_COLLECTION_TYPES.has(String(collection.collectionType).toLowerCase())) {
      excludedCollections.push(collection.name);
      continue;
    }
    for (const item of collection.items) {
      const category = String(item.category ?? "").toLowerCase();
      if (!CLOTHING_CATEGORIES.has(category)) continue;
      const baseName = String(item.name).split(" — ")[0].trim();
      const masterKey = [baseName, item.genderFit, item.category, item.subcategory].map(slug).join(":");
      if (seen.has(masterKey)) continue;
      seen.add(masterKey);
      colourSkuCount += item.colours.length;
      const complex = isComplex(item, collection);
      masters.push({
        ordinal: masters.length + 1,
        masterKey: `lamalo-clothing:${masterKey}`,
        baseName,
        collectionId,
        collectionName: collection.name,
        collectionType: collection.collectionType,
        category: item.category,
        subcategory: item.subcategory,
        genderFit: item.genderFit,
        sizeRange: item.sizeRange ?? "XS-XXL",
        description: item.description,
        materials: item.materials ?? [],
        styleTags: item.styleTags ?? [],
        referencePrompt: item.referencePrompt,
        sourceImageUrl: item.primaryImageUrl ?? null,
        template: templateFor(item, collection),
        complex,
        turntableFrames: 36,
        continuityReferenceFrames: complex ? 24 : 12,
        renderResolution: 2048,
        viewerResolution: 1024,
        colours: item.colours.map((name) => ({
          name,
          key: slug(name),
          requiresTextureVariant: requiresTextureVariant(name),
        })),
        status: "queued",
        sourceReferenceStatus: "pending",
        geometryStatus: "pending",
        pbrStatus: "pending",
        turntableStatus: "pending",
        qualityStatus: "pending",
        publishedAt: null,
      });
    }
  }

  return {
    version: 2,
    generatedAt: new Date().toISOString(),
    sourceOfTruth: "server/lamalo-seed.ts",
    scope: "current Lamalo clothing only; missing designs and non-clothing assets are deferred",
    pipeline: {
      sourceReference: "approved high-resolution isolated garment image",
      geometry: "Meshy 6 commercial image-to-3D PBR generation or an approved artist-authored replacement mesh",
      material: "PBR material generation with physically based maps",
      cleanupAndRender: "Blender 4.5 LTS deterministic GPU turntable",
      interchange: "validated glTF 2.0 binary (.glb)",
      turntableFrames: 36,
      angleStepDegrees: 10,
      masterRenderResolution: 2048,
      viewerRenderResolution: 1024,
      colourPolicy: "solid colours are deterministic material variants; patterns and multi-tone options require dedicated texture variants",
      purchasePolicy: "every colour remains a separate SKU and permanent inventory item",
    },
    qualityGate: {
      minimumFrames: 36,
      requiredCanonicalAngles: [45, 0, 180, 90],
      requireSingleGlbMaster: true,
      requirePbrMaterial: true,
      requireGltfValidation: true,
      requireVisualApproval: true,
      allowAiMultiAngleSubstitution: false,
    },
    summary: {
      clothingBaseDesigns: masters.length,
      separateColourSkus: colourSkuCount,
      excludedCollections,
      completedBaseDesigns: 0,
      failedBaseDesigns: 0,
    },
    masters,
  };
}

const PRODUCTION_STATE_FIELDS = [
  "status",
  "sourceReferenceStatus",
  "geometryStatus",
  "pbrStatus",
  "turntableStatus",
  "qualityStatus",
  "publishedAt",
  "model3dUrl",
  "publishedColourSkus",
  "updatedVariants",
  "failedAt",
  "lastError",
];

function mergeProductionState(next, existing) {
  const previousByKey = new Map((existing?.masters ?? []).map((master) => [master.masterKey, master]));
  next.generatedAt = existing?.generatedAt || next.generatedAt;
  if (existing?.updatedAt) next.updatedAt = existing.updatedAt;
  next.masters = next.masters.map((master) => {
    const previous = previousByKey.get(master.masterKey);
    if (!previous) return master;
    const state = {};
    for (const field of PRODUCTION_STATE_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(previous, field)) state[field] = previous[field];
    }
    return { ...master, ...state };
  });
  next.summary.completedBaseDesigns = next.masters.filter((master) => master.status === "published").length;
  next.summary.failedBaseDesigns = next.masters.filter((master) => master.status === "failed").length;
  return next;
}

function parseArgs(argv) {
  const args = { output: DEFAULT_OUTPUT, check: false };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--check") args.check = true;
    else if (argv[i] === "--output") args.output = path.resolve(argv[++i]);
    else throw new Error(`Unknown argument: ${argv[i]}`);
  }
  return args;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = parseArgs(process.argv);
  const current = fs.existsSync(args.output) ? JSON.parse(fs.readFileSync(args.output, "utf8")) : null;
  const catalogue = mergeProductionState(compileLamaloClothingCatalogue(), current);
  const serialized = `${JSON.stringify(catalogue, null, 2)}\n`;
  if (args.check) {
    if (!current) throw new Error(`Missing generated manifest: ${args.output}`);
    if (serialized !== `${JSON.stringify(current, null, 2)}\n`) {
      throw new Error("Lamalo clothing manifest is stale. Run pnpm lamalo360:catalogue.");
    }
    console.log(`Lamalo clothing manifest is current: ${catalogue.summary.clothingBaseDesigns} masters, ${catalogue.summary.separateColourSkus} colour SKUs.`);
  } else {
    fs.mkdirSync(path.dirname(args.output), { recursive: true });
    fs.writeFileSync(args.output, serialized);
    console.log(`Wrote ${args.output}: ${catalogue.summary.clothingBaseDesigns} masters, ${catalogue.summary.separateColourSkus} colour SKUs.`);
  }
}
