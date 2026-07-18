#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const ROOT = process.cwd();
const CLIENT = path.join(ROOT, "client", "src");
const SERVER = path.join(ROOT, "server");
const SWAPPYS = path.join(ROOT, "apps", "swappys-mobile");
const REPORT_DIR = path.join(ROOT, "audit-results");
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const IGNORE_DIRS = new Set(["node_modules", ".git", "dist", "build", "coverage", "audit-results"]);

function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  const output = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...walk(full));
    else if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) output.push(full);
  }
  return output;
}

const rel = (file) => path.relative(ROOT, file).replaceAll(path.sep, "/");
const read = (file) => fs.readFileSync(file, "utf8");
const unique = (values) => [...new Set(values)];

function scriptKind(file) {
  switch (path.extname(file)) {
    case ".tsx": return ts.ScriptKind.TSX;
    case ".jsx": return ts.ScriptKind.JSX;
    case ".js": case ".mjs": case ".cjs": return ts.ScriptKind.JS;
    default: return ts.ScriptKind.TS;
  }
}

const sourceCache = new Map();
function source(file) {
  if (!sourceCache.has(file)) {
    sourceCache.set(file, ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true, scriptKind(file)));
  }
  return sourceCache.get(file);
}

function lineOf(file, nodeOrPosition) {
  const sf = source(file);
  const position = typeof nodeOrPosition === "number" ? nodeOrPosition : nodeOrPosition.getStart(sf);
  return sf.getLineAndCharacterOfPosition(position).line + 1;
}

function finding(list, severity, category, file, line, message, evidence) {
  list.push({ severity, category, file, line, message, ...(evidence ? { evidence } : {}) });
}

function visit(node, callback) {
  callback(node);
  ts.forEachChild(node, (child) => visit(child, callback));
}

function jsxTagName(tagName, sf) {
  return tagName.getText(sf).replace(/^.*\./, "");
}

function attr(opening, name) {
  for (const property of opening.attributes.properties) {
    if (ts.isJsxAttribute(property) && property.name.text === name) return property;
  }
  return undefined;
}

function hasAttr(opening, name) {
  return Boolean(attr(opening, name));
}

function literalFromExpression(expression, sf) {
  if (!expression) return undefined;
  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) return expression.text;
  if (ts.isTemplateExpression(expression)) {
    let value = expression.head.text;
    for (const span of expression.templateSpans) value += `:dynamic${span.literal.text}`;
    return value;
  }
  if (ts.isBinaryExpression(expression) && expression.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    const left = literalFromExpression(expression.left, sf);
    const right = literalFromExpression(expression.right, sf);
    if (left !== undefined && right !== undefined) return left + right;
  }
  return undefined;
}

function attrValue(attribute, sf) {
  if (!attribute?.initializer) return attribute ? "true" : undefined;
  if (ts.isStringLiteral(attribute.initializer)) return attribute.initializer.text;
  if (ts.isJsxExpression(attribute.initializer)) return literalFromExpression(attribute.initializer.expression, sf);
  return undefined;
}

function callArgumentValue(call, sf) {
  return literalFromExpression(call.arguments[0], sf);
}

function normalizeRoute(value) {
  if (!value) return value;
  const route = value.split("?")[0].split("#")[0]
    .replace(/\$\{[^}]+\}/g, ":dynamic")
    .replace(/\/\d+(?=\/|$)/g, "/:id")
    .replace(/\/+/g, "/");
  return route.length > 1 ? route.replace(/\/$/, "") : route;
}

function routeMatches(target, registered) {
  const targetParts = normalizeRoute(target).split("/").filter(Boolean);
  const routeParts = normalizeRoute(registered).split("/").filter(Boolean);
  if (targetParts.length !== routeParts.length) return false;
  return routeParts.every((part, index) => part.startsWith(":") || part === "*" || targetParts[index] === ":dynamic" || part === targetParts[index]);
}

function extractRoutes(appFile) {
  const sf = source(appFile);
  const routes = [];
  visit(sf, (node) => {
    const opening = ts.isJsxSelfClosingElement(node) ? node : ts.isJsxOpeningElement(node) ? node : undefined;
    if (!opening || jsxTagName(opening.tagName, sf) !== "Route") return;
    const value = attrValue(attr(opening, "path"), sf);
    if (value) routes.push({ path: normalizeRoute(value), line: lineOf(appFile, opening) });
  });
  return routes;
}

function pageModuleKey(moduleName) {
  const match = moduleName.match(/(?:^\.\/pages\/|^@\/pages\/)(.+)$/);
  return match ? match[1].replace(/\.(tsx?|jsx?)$/, "") : undefined;
}

function extractAppPageImports(appFile) {
  const sf = source(appFile);
  const imports = new Set();
  visit(sf, (node) => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const key = pageModuleKey(node.moduleSpecifier.text);
      if (key) imports.add(key);
    }
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const value = literalFromExpression(node.arguments[0], sf);
      const key = value ? pageModuleKey(value) : undefined;
      if (key) imports.add(key);
    }
  });
  return imports;
}

function pageKey(file) {
  return rel(file).replace(/^client\/src\/pages\//, "").replace(/\.(tsx?|jsx?)$/, "");
}

function extractNavigationTargets(files) {
  const targets = [];
  for (const file of files) {
    const sf = source(file);
    visit(sf, (node) => {
      if (ts.isJsxAttribute(node) && ["href", "to"].includes(String(node.name.text))) {
        const value = attrValue(node, sf);
        if (value?.startsWith("/") && !value.startsWith("/api/")) {
          targets.push({ path: normalizeRoute(value), raw: value, file: rel(file), line: lineOf(file, node) });
        }
      }
      if (ts.isCallExpression(node)) {
        const callee = node.expression.getText(sf);
        const allowed = /^(?:setLocation|navigate|router\.(?:push|replace)|(?:window\.)?location\.(?:assign|replace))$/.test(callee);
        if (!allowed) return;
        const value = callArgumentValue(node, sf);
        if (value?.startsWith("/") && !value.startsWith("/api/")) {
          targets.push({ path: normalizeRoute(value), raw: value, file: rel(file), line: lineOf(file, node) });
        }
      }
    });
  }
  return targets;
}

function propertyName(property, sf) {
  if (!property.name) return undefined;
  if (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name) || ts.isNumericLiteral(property.name)) return property.name.text;
  return property.name.getText(sf);
}

function extractAppRouterRoots(routerFile) {
  const sf = source(routerFile);
  const roots = [];
  visit(sf, (node) => {
    if (!ts.isVariableDeclaration(node) || !ts.isIdentifier(node.name) || node.name.text !== "appRouter") return;
    const initializer = node.initializer;
    if (!initializer || !ts.isCallExpression(initializer)) return;
    const object = initializer.arguments[0];
    if (!object || !ts.isObjectLiteralExpression(object)) return;
    for (const property of object.properties) {
      if (ts.isSpreadAssignment(property)) continue;
      const name = propertyName(property, sf);
      if (name) roots.push({ root: name, line: lineOf(routerFile, property) });
    }
  });
  return roots;
}

function propertyChain(node, sf) {
  const names = [];
  let current = node;
  while (ts.isPropertyAccessExpression(current)) {
    names.unshift(current.name.text);
    current = current.expression;
  }
  if (ts.isIdentifier(current)) names.unshift(current.text);
  return names;
}

function extractClientTrpcRoots(files) {
  const usages = [];
  const seen = new Set();
  for (const file of files) {
    const sf = source(file);
    visit(sf, (node) => {
      if (!ts.isPropertyAccessExpression(node)) return;
      const chain = propertyChain(node, sf);
      if (chain[0] !== "trpc" || !chain[1]) return;
      const key = `${rel(file)}:${lineOf(file, node)}:${chain[1]}`;
      if (seen.has(key)) return;
      seen.add(key);
      usages.push({ root: chain[1], file: rel(file), line: lineOf(file, node) });
    });
  }
  return usages;
}

function exportedRouters(serverFiles) {
  const output = [];
  const importedNames = new Set();
  for (const file of serverFiles) {
    const sf = source(file);
    for (const statement of sf.statements) {
      if (ts.isImportDeclaration(statement) && statement.importClause?.namedBindings && ts.isNamedImports(statement.importClause.namedBindings)) {
        for (const element of statement.importClause.namedBindings.elements) importedNames.add(element.name.text);
      }
    }
  }
  for (const file of serverFiles) {
    const sf = source(file);
    for (const statement of sf.statements) {
      if (!ts.isVariableStatement(statement)) continue;
      const exported = statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword);
      if (!exported) continue;
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name) && /Router$/.test(declaration.name.text)) {
          output.push({ symbol: declaration.name.text, file: rel(file), line: lineOf(file, declaration), imported: importedNames.has(declaration.name.text) });
        }
      }
    }
  }
  return output;
}

function openingFor(node) {
  if (ts.isJsxElement(node)) return node.openingElement;
  if (ts.isJsxSelfClosingElement(node)) return node;
  return undefined;
}

function isActionable(opening, sf) {
  if (["onClick", "href", "to", "form"].some((name) => hasAttr(opening, name))) return true;
  if (hasAttr(opening, "asChild")) return true;
  if (opening.attributes.properties.some(ts.isJsxSpreadAttribute)) return true;
  return attrValue(attr(opening, "type"), sf) === "submit";
}

function hasActionableAncestor(node, sf) {
  let parent = node.parent;
  let depth = 0;
  while (parent && depth < 8) {
    if (ts.isJsxElement(parent)) {
      const opening = parent.openingElement;
      const tag = jsxTagName(opening.tagName, sf);
      if (tag === "a" || tag === "Link" || /Trigger$/.test(tag) || isActionable(opening, sf)) return true;
    }
    parent = parent.parent;
    depth++;
  }
  return false;
}

function uiAudit(clientFiles, findings) {
  for (const file of clientFiles.filter((candidate) => [".tsx", ".jsx"].includes(path.extname(candidate)))) {
    const fileName = rel(file);
    if (fileName.includes("/components/ui/") || fileName.endsWith("/ComponentShowcase.tsx")) continue;
    const sf = source(file);
    visit(sf, (node) => {
      const opening = openingFor(node);
      if (!opening) return;
      const tag = jsxTagName(opening.tagName, sf);
      if (tag === "Button" || tag === "button") {
        const disabled = hasAttr(opening, "disabled") || hasAttr(opening, "aria-hidden");
        if (!disabled && !isActionable(opening, sf) && !hasActionableAncestor(node, sf)) {
          const text = node.getText(sf).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 120);
          finding(findings, "warning", "ui-button", fileName, lineOf(file, opening), `Button has no detected action: ${text}`);
        }
      }
      if (tag === "form" && !hasAttr(opening, "onSubmit") && !hasAttr(opening, "action")) {
        finding(findings, "warning", "ui-form", fileName, lineOf(file, opening), "Form has no onSubmit or action handler.");
      }
      if (tag === "img") {
        if (!hasAttr(opening, "alt")) finding(findings, "warning", "ui-image", fileName, lineOf(file, opening), "Image is missing alt text.");
        const src = attrValue(attr(opening, "src"), sf);
        if (src && /placeholder|example\.com|placehold\.co|dummy/i.test(src)) {
          finding(findings, "error", "ui-image", fileName, lineOf(file, opening), `Image uses a placeholder source: ${src}`);
        }
      }
    });
  }
}

function sourceMarkerAudit(allFiles, findings) {
  const marker = /\b(?:TODO|FIXME|HACK|COMING SOON|NOT IMPLEMENTED)\b/gi;
  const executablePlaceholder = /throw\s+new\s+Error\(\s*["'`](?:not implemented|todo)|\bmock data\b|\bdummy data\b|\bfake data\b/gi;
  for (const file of allFiles) {
    const fileName = rel(file);
    if (fileName.startsWith("docs/") || fileName.includes(".test.") || fileName.includes(".spec.") || fileName === "scripts/repository-connectivity-audit.mjs") continue;
    const text = read(file);
    for (const match of text.matchAll(marker)) finding(findings, "info", "source-marker", fileName, text.slice(0, match.index).split("\n").length, `Source marker found: ${match[0]}`);
    for (const match of text.matchAll(executablePlaceholder)) finding(findings, "error", "placeholder-implementation", fileName, text.slice(0, match.index).split("\n").length, "Placeholder implementation remains in executable source.", match[0]);
  }
}

function swappysAudit(allFiles, routes, mountedRoots, findings) {
  const appFile = path.join(SWAPPYS, "App.tsx");
  const webFile = path.join(SWAPPYS, "src", "SwappysWebApp.ts");
  const serverFile = path.join(SERVER, "vfx-sfx-router.ts");
  const dashboardFile = path.join(CLIENT, "components", "DashboardLayout.tsx");
  const featureRegistryFile = path.join(ROOT, "shared", "feature-registry.ts");
  const appText = fs.existsSync(appFile) ? read(appFile) : "";
  const webText = fs.existsSync(webFile) ? read(webFile) : "";
  const serverText = fs.existsSync(serverFile) ? read(serverFile) : "";
  const dashboardText = fs.existsSync(dashboardFile) ? read(dashboardFile) : "";
  const registryText = fs.existsSync(featureRegistryFile) ? read(featureRegistryFile) : "";
  const procedureStart = serverText.indexOf("swappysMobileSwap:");
  const procedureText = procedureStart >= 0 ? serverText.slice(procedureStart, procedureStart + 5000) : "";
  const menuMatch = dashboardText.match(/label:\s*["']Swappys[^"']*["'][\s\S]{0,180}?path:\s*["']([^"']+)["']/i);
  const menuPath = menuMatch?.[1] || null;
  const directParentRoute = Boolean(menuPath && menuPath !== "/projects" && routes.some((route) => routeMatches(menuPath, route.path)));
  const recordingFunction = webText.match(/async function doSwap\(\)[\s\S]*?\nfunction clearResult/)?.[0] || "";

  const result = {
    appEntry: fs.existsSync(appFile),
    embeddedUi: fs.existsSync(webFile),
    parentMenuEntry: Boolean(menuMatch),
    parentMenuPath: menuPath,
    directParentFeatureRoute: directParentRoute,
    serverRootMounted: mountedRoots.has("vfxSfx"),
    serverProcedure: procedureStart >= 0,
    explicitConsent: /consentConfirmed|I confirm that I own/i.test(webText + procedureText),
    imageValidation: /validateImage\(|image\/jpeg|image\/png|image\/webp/i.test(webText),
    serverMimeValidation: /data:image\/(?:jpeg|png|webp)|mime/i.test(procedureText),
    moderation: /scanContent|moderation|handleModeration/i.test(procedureText),
    anonymousRateLimit: /rateLimit|throttle|quota/i.test(procedureText),
    anonymousCostControl: /deductCredits|userApiKeys|BYOK|rateLimit|quota/i.test(procedureText),
    authBridge: /SecureStore|openAuthSession|AuthSession|accessToken|authToken|Linking\.addEventListener|deep link/i.test(appText + webText),
    externalLoginOnly: /Linking\.openURL|openUrl/i.test(appText) && /login/i.test(appText),
    captureOrUpload: /getUserMedia|type="file"|type='file'/i.test(webText),
    recordingConnectedToGeneration: /recordingUrl|MediaRecorder/i.test(recordingFunction),
    providerCall: /vfxSfx\.swappysMobileSwap|swappysMobileSwap/i.test(webText + procedureText),
    localSave: /saveResult|MediaLibrary\.createAssetAsync/i.test(appText + webText),
    saveBackToVirelle: /saveToVirelle|saveToProject|projectAsset|sceneAsset|productionAssets/i.test(appText + webText),
    featureManifest: /swappys/i.test(registryText),
    resultHandling: /resultImage|imageUrl|clearResult/i.test(webText),
  };

  const required = [
    ["appEntry", "Swappys mobile app entry is missing."],
    ["embeddedUi", "Swappys embedded UI is missing."],
    ["parentMenuEntry", "Virelle has no discoverable Swappys navigation entry."],
    ["serverRootMounted", "The VFX/Swappys router is not mounted in appRouter."],
    ["serverProcedure", "The Swappys transformation procedure is missing."],
    ["explicitConsent", "Explicit likeness consent is not enforced end to end."],
    ["providerCall", "Swappys UI is not connected to a server transformation procedure."],
    ["resultHandling", "Swappys has no completed-result workflow."],
    ["featureManifest", "Swappys is absent from the shared feature registry."],
  ];
  for (const [key, message] of required) if (!result[key]) finding(findings, "error", "swappys", "apps/swappys-mobile", 1, message);
  if (!result.directParentFeatureRoute) finding(findings, "error", "swappys", "client/src/components/DashboardLayout.tsx", 1, `Swappys navigation does not open a dedicated daughter-app or VFX workflow; current target is ${menuPath || "missing"}.`);
  if (!result.serverMimeValidation) finding(findings, "error", "swappys-security", "server/vfx-sfx-router.ts", 1, "The public Swappys endpoint accepts base64 strings without server-side MIME/signature validation.");
  if (!result.moderation) finding(findings, "error", "swappys-security", "server/vfx-sfx-router.ts", 1, "The public Swappys transformation path does not run content moderation before generation.");
  if (!result.anonymousRateLimit) finding(findings, "error", "swappys-security", "server/vfx-sfx-router.ts", 1, "The anonymous Swappys AI endpoint has no detected per-IP rate limit.");
  if (!result.anonymousCostControl) finding(findings, "error", "swappys-cost", "server/vfx-sfx-router.ts", 1, "Anonymous Swappys requests can reach a paid AI provider without credits, BYOK or quota enforcement.");
  if (!result.authBridge) finding(findings, "error", "swappys-auth", "apps/swappys-mobile/App.tsx", 1, "External Virelle login is not bridged back into the standalone app, so paid entitlement may never reach the WebView request.");
  if (!result.recordingConnectedToGeneration) finding(findings, "error", "swappys-ui", "apps/swappys-mobile/src/SwappysWebApp.ts", 1, "The Record control captures local video but the recording is never included in the generation request.");
  if (!result.saveBackToVirelle) finding(findings, "warning", "swappys-integration", "apps/swappys-mobile/App.tsx", 1, "Results can save locally but cannot be returned to a Virelle project, scene or asset library.");
  return result;
}

function main() {
  const allFiles = walk(ROOT);
  const clientFiles = allFiles.filter((file) => file.startsWith(CLIENT));
  const serverFiles = allFiles.filter((file) => file.startsWith(SERVER));
  const findings = [];
  const appFile = path.join(CLIENT, "App.tsx");
  const routerFile = path.join(SERVER, "routers.ts");
  const routes = extractRoutes(appFile);
  const routeSet = new Set(routes.map((route) => route.path));
  const navigation = extractNavigationTargets(clientFiles);
  for (const target of navigation) {
    if (![...routeSet].some((registered) => routeMatches(target.path, registered))) {
      finding(findings, "error", "navigation", target.file, target.line, `Navigation target has no registered frontend route: ${target.raw}`);
    }
  }

  const importedPages = extractAppPageImports(appFile);
  const pageFiles = clientFiles.filter((file) => rel(file).startsWith("client/src/pages/") && !/\.(?:test|spec)\./.test(file));
  for (const file of pageFiles) {
    const key = pageKey(file);
    if (key === "NotFound" || key.startsWith("legal/") || key === "ComponentShowcase") continue;
    if (!importedPages.has(key)) finding(findings, "warning", "page-connectivity", rel(file), 1, `Page file is not routed by client/src/App.tsx: ${key}`);
  }

  const appRouterRoots = extractAppRouterRoots(routerFile);
  const mountedRoots = new Set(appRouterRoots.map((entry) => entry.root));
  const trpcUsages = extractClientTrpcRoots(clientFiles);
  const clientHelperRoots = new Set(["Provider", "createClient", "useContext", "useUtils"]);
  for (const usage of trpcUsages) {
    if (clientHelperRoots.has(usage.root)) continue;
    if (!mountedRoots.has(usage.root)) finding(findings, "error", "trpc-connectivity", usage.file, usage.line, `Client calls unmounted tRPC root: trpc.${usage.root}`);
  }

  const routers = exportedRouters(serverFiles);
  for (const router of routers) {
    if (["appRouter", "systemRouter"].includes(router.symbol)) continue;
    if (!router.imported) finding(findings, "warning", "router-connectivity", router.file, router.line, `Exported router is never imported by another server module: ${router.symbol}`);
  }

  uiAudit(clientFiles, findings);
  sourceMarkerAudit(allFiles, findings);
  const swappys = swappysAudit(allFiles, routes, mountedRoots, findings);

  const weight = { error: 0, warning: 1, info: 2 };
  findings.sort((a, b) => weight[a.severity] - weight[b.severity] || a.category.localeCompare(b.category) || a.file.localeCompare(b.file) || a.line - b.line);
  const summary = {
    generatedAt: new Date().toISOString(),
    sourceFiles: allFiles.length,
    registeredRoutes: routes.length,
    navigationTargets: navigation.length,
    pageFiles: pageFiles.length,
    mountedTrpcRoots: mountedRoots.size,
    clientTrpcRoots: unique(trpcUsages.map((usage) => usage.root)).length,
    exportedRouters: routers.length,
    errors: findings.filter((item) => item.severity === "error").length,
    warnings: findings.filter((item) => item.severity === "warning").length,
    info: findings.filter((item) => item.severity === "info").length,
  };

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(path.join(REPORT_DIR, "repository-connectivity-audit.json"), JSON.stringify({ summary, routes, mountedRoots: [...mountedRoots].sort(), swappys, findings }, null, 2));
  const markdown = [
    "# Repository Connectivity and UI Debug Audit",
    "",
    `Generated: ${summary.generatedAt}`,
    "",
    "## Summary",
    "",
    ...Object.entries(summary).filter(([key]) => key !== "generatedAt").map(([key, value]) => `- ${key}: ${value}`),
    "",
    "## Swappys daughter-app audit",
    "",
    ...Object.entries(swappys).map(([key, value]) => `- ${key}: ${typeof value === "boolean" ? (value ? "PASS" : "FAIL") : value ?? "missing"}`),
    "",
    "## Findings",
    "",
    ...findings.flatMap((item) => [
      `### ${item.severity.toUpperCase()} — ${item.category}`,
      "",
      `- Location: \`${item.file}:${item.line}\``,
      `- ${item.message}`,
      ...(item.evidence ? [`- Evidence: \`${String(item.evidence).replaceAll("`", "'")}\``] : []),
      "",
    ]),
  ].join("\n");
  fs.writeFileSync(path.join(REPORT_DIR, "repository-connectivity-audit.md"), markdown);
  console.log(JSON.stringify(summary, null, 2));
  if (summary.errors > 0) process.exitCode = 2;
}

main();
