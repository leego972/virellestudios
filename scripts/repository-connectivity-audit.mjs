#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CLIENT = path.join(ROOT, "client", "src");
const SERVER = path.join(ROOT, "server");
const REPORT_DIR = path.join(ROOT, "audit-results");

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const IGNORE_DIRS = new Set(["node_modules", ".git", "dist", "build", "coverage", "audit-results"]);

function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  const results = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) results.push(...walk(fullPath));
    else if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) results.push(fullPath);
  }
  return results;
}

function rel(file) {
  return path.relative(ROOT, file).replaceAll(path.sep, "/");
}

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function lineOf(text, index) {
  return text.slice(0, Math.max(0, index)).split("\n").length;
}

function pushFinding(list, severity, category, file, line, message, evidence = undefined) {
  list.push({ severity, category, file, line, message, evidence });
}

function unique(values) {
  return [...new Set(values)];
}

function normalizeRoute(route) {
  if (!route) return route;
  const withoutQuery = route.split("?")[0].split("#")[0];
  const normalized = withoutQuery
    .replace(/\$\{[^}]+\}/g, ":dynamic")
    .replace(/\/\d+(?=\/|$)/g, "/:id")
    .replace(/\/+/g, "/");
  return normalized.length > 1 ? normalized.replace(/\/$/, "") : normalized;
}

function routePatternMatches(target, registered) {
  const targetParts = normalizeRoute(target).split("/").filter(Boolean);
  const routeParts = normalizeRoute(registered).split("/").filter(Boolean);
  if (targetParts.length !== routeParts.length) return false;
  return routeParts.every((part, index) => part.startsWith(":") || part === "*" || part === targetParts[index] || targetParts[index] === ":dynamic");
}

function extractRoutes(appText) {
  const routes = [];
  const regex = /<Route\b[^>]*\bpath=["']([^"']+)["'][^>]*>/g;
  for (const match of appText.matchAll(regex)) {
    routes.push({ path: normalizeRoute(match[1]), line: lineOf(appText, match.index) });
  }
  return routes;
}

function extractNavigationTargets(files) {
  const targets = [];
  const patterns = [
    /\b(?:href|to)=\{?["'`]([^"'`]+)["'`]\}?/g,
    /\b(?:setLocation|navigate|location\.assign|location\.replace)\(\s*["'`]([^"'`]+)["'`]/g,
    /<Link\b[^>]*\bhref=["']([^"']+)["']/g,
  ];
  for (const file of files) {
    const text = read(file);
    for (const pattern of patterns) {
      for (const match of text.matchAll(pattern)) {
        const raw = match[1];
        if (!raw.startsWith("/") || raw.startsWith("//")) continue;
        targets.push({ path: normalizeRoute(raw), raw, file: rel(file), line: lineOf(text, match.index) });
      }
    }
  }
  return targets;
}

function extractPageImports(appText) {
  const imported = new Set();
  const regex = /(?:import\([^)]*|from\s+)["']\.\/pages\/([^"']+)["']/g;
  for (const match of appText.matchAll(regex)) imported.add(match[1].replace(/\.(tsx?|jsx?)$/, ""));
  return imported;
}

function pageKey(file) {
  return rel(file)
    .replace(/^client\/src\/pages\//, "")
    .replace(/\.(tsx?|jsx?)$/, "");
}

function extractClientTrpcRoots(clientFiles) {
  const usages = [];
  const regex = /\btrpc\.([A-Za-z_$][\w$]*)/g;
  for (const file of clientFiles) {
    const text = read(file);
    for (const match of text.matchAll(regex)) {
      usages.push({ root: match[1], file: rel(file), line: lineOf(text, match.index) });
    }
  }
  return usages;
}

function extractAppRouterRoots(routerText) {
  const startToken = "export const appRouter = router({";
  const start = routerText.indexOf(startToken);
  if (start < 0) return [];
  const roots = [];
  const bodyStart = start + startToken.length;
  let depth = 1;
  let inString = null;
  let escaped = false;
  let lineStart = bodyStart;
  for (let index = bodyStart; index < routerText.length && depth > 0; index++) {
    const char = routerText[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === inString) inString = null;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      inString = char;
      continue;
    }
    if (char === "{") depth++;
    else if (char === "}") depth--;
    if (char === "\n" || depth === 0) {
      if (depth === 1) {
        const line = routerText.slice(lineStart, index).trim();
        const match = line.match(/^([A-Za-z_$][\w$]*)\s*:/);
        if (match) roots.push({ root: match[1], line: lineOf(routerText, lineStart) });
      }
      lineStart = index + 1;
    }
  }
  return roots;
}

function extractExportedRouters(serverFiles) {
  const exports = [];
  const regex = /export\s+const\s+([A-Za-z_$][\w$]*Router)\s*=/g;
  for (const file of serverFiles) {
    const text = read(file);
    for (const match of text.matchAll(regex)) {
      exports.push({ symbol: match[1], file: rel(file), line: lineOf(text, match.index) });
    }
  }
  return exports;
}

function countSymbolReferences(symbol, files, definingFile) {
  const escaped = symbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`\\b${escaped}\\b`, "g");
  let count = 0;
  for (const file of files) {
    if (rel(file) === definingFile) continue;
    count += [...read(file).matchAll(regex)].length;
  }
  return count;
}

function auditUi(files, findings) {
  for (const file of files.filter((candidate) => [".tsx", ".jsx"].includes(path.extname(candidate)))) {
    const text = read(file);
    const fileName = rel(file);

    const buttonRegex = /<(Button|button)\b([^>]*)>([\s\S]*?)<\/\1>/g;
    for (const match of text.matchAll(buttonRegex)) {
      const attrs = match[2];
      const body = match[3].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 100);
      const actionable = /\bonClick\s*=|\btype=["']submit["']|\basChild\b|\bhref\s*=|\bform\s*=/.test(attrs);
      const intentionallyNonAction = /\bdisabled(?:=|\s|$)|aria-hidden/.test(attrs);
      if (!actionable && !intentionallyNonAction) {
        pushFinding(findings, "warning", "ui-button", fileName, lineOf(text, match.index), `Button appears to have no action: ${body || "unnamed button"}`);
      }
    }

    for (const match of text.matchAll(/onClick=\{\s*\(?.*?\)?\s*=>\s*\{\s*\}\s*\}/g)) {
      pushFinding(findings, "error", "ui-button", fileName, lineOf(text, match.index), "Button has an empty onClick handler.");
    }
    for (const match of text.matchAll(/(?:alert|toast\.(?:info|message))\(\s*["'`](?:coming soon|not implemented|todo)/gi)) {
      pushFinding(findings, "error", "placeholder-action", fileName, lineOf(text, match.index), "UI action is still implemented as a placeholder notification.", match[0]);
    }

    for (const match of text.matchAll(/<form\b([^>]*)>/g)) {
      const attrs = match[1];
      if (!/\bonSubmit\s*=|\baction\s*=/.test(attrs)) {
        pushFinding(findings, "warning", "ui-form", fileName, lineOf(text, match.index), "Form has no onSubmit or action handler.");
      }
    }

    for (const match of text.matchAll(/<img\b([^>]*)>/g)) {
      const attrs = match[1];
      if (!/\balt\s*=/.test(attrs)) {
        pushFinding(findings, "warning", "ui-image", fileName, lineOf(text, match.index), "Image is missing alt text.");
      }
      if (/placeholder|example\.com|placehold\.co|TODO|FIXME/i.test(attrs)) {
        pushFinding(findings, "error", "ui-image", fileName, lineOf(text, match.index), "Image uses a placeholder or example source.", attrs.slice(0, 180));
      }
    }

    for (const match of text.matchAll(/\b(?:TODO|FIXME|HACK|COMING SOON|NOT IMPLEMENTED)\b/gi)) {
      pushFinding(findings, "info", "source-marker", fileName, lineOf(text, match.index), `Source marker found: ${match[0]}`);
    }
  }
}

function auditSwappys(allFiles, routes, mountedRoots, findings) {
  const swappysFiles = allFiles.filter((file) => /swapp/i.test(rel(file)) || /swapp/i.test(read(file)));
  const combined = swappysFiles.map((file) => read(file)).join("\n");
  const evidence = {
    files: swappysFiles.map(rel),
    route: routes.some((route) => /swapp/i.test(route.path)),
    consent: /consent|permission|authori[sz]e/i.test(combined),
    captureOrUpload: /getUserMedia|camera|capture|upload|input[^>]+type=["']file/i.test(combined),
    providerMutation: /trpc\.[\w.]+\.(?:useMutation|mutate)|generate.*(?:swap|double)|createSwappys/i.test(combined),
    resultHandling: /result|outputUrl|download|save.*(?:project|scene|library)/i.test(combined),
    parentBridge: /postMessage|WebView|parent|virelle|save.*scene|save.*project/i.test(combined),
    manifest: /manifest|feature.*registry|capabilit/i.test(combined),
    serverMounted: [...mountedRoots].some((root) => /vfx|swapp/i.test(root)),
  };

  const checks = [
    ["route", "Swappys has no registered frontend route."],
    ["consent", "Swappys consent/authorisation flow was not detected."],
    ["captureOrUpload", "Swappys capture or upload input was not detected."],
    ["providerMutation", "Swappys has no detected provider mutation/generation call."],
    ["resultHandling", "Swappys result handling or save workflow was not detected."],
    ["parentBridge", "Swappys daughter-app bridge back to Virelle was not detected."],
    ["manifest", "Swappys feature manifest/capability declaration was not detected."],
    ["serverMounted", "Swappys transformation backend does not appear to be mounted."],
  ];
  for (const [key, message] of checks) {
    if (!evidence[key]) pushFinding(findings, "error", "swappys", "repository", 1, message);
  }
  return evidence;
}

function main() {
  const allFiles = walk(ROOT);
  const clientFiles = allFiles.filter((file) => file.startsWith(CLIENT));
  const serverFiles = allFiles.filter((file) => file.startsWith(SERVER));
  const findings = [];

  const appPath = path.join(CLIENT, "App.tsx");
  if (!fs.existsSync(appPath)) throw new Error("client/src/App.tsx was not found.");
  const appText = read(appPath);
  const routes = extractRoutes(appText);
  const routeSet = new Set(routes.map((route) => route.path));

  const navigationTargets = extractNavigationTargets(clientFiles);
  for (const target of navigationTargets) {
    const matched = [...routeSet].some((registered) => routePatternMatches(target.path, registered));
    if (!matched) pushFinding(findings, "error", "navigation", target.file, target.line, `Navigation target has no registered route: ${target.raw}`);
  }

  const importedPages = extractPageImports(appText);
  const pageFiles = clientFiles.filter((file) => rel(file).startsWith("client/src/pages/") && !/\.(?:test|spec)\./.test(file));
  for (const file of pageFiles) {
    const key = pageKey(file);
    if (key === "NotFound" || key.startsWith("legal/")) continue;
    if (!importedPages.has(key)) {
      const references = countSymbolReferences(path.basename(key), clientFiles, rel(file));
      pushFinding(findings, references === 0 ? "error" : "warning", "page-connectivity", rel(file), 1, `Page file is not imported by client/src/App.tsx: ${key}`);
    }
  }

  const routerText = read(path.join(SERVER, "routers.ts"));
  const mountedRoots = new Set(extractAppRouterRoots(routerText).map((entry) => entry.root));
  const trpcUsages = extractClientTrpcRoots(clientFiles);
  for (const usage of trpcUsages) {
    if (!mountedRoots.has(usage.root)) {
      pushFinding(findings, "error", "trpc-connectivity", usage.file, usage.line, `Client calls unmounted tRPC root: trpc.${usage.root}`);
    }
  }

  const exportedRouters = extractExportedRouters(serverFiles);
  for (const exported of exportedRouters) {
    if (["appRouter", "systemRouter"].includes(exported.symbol)) continue;
    const references = countSymbolReferences(exported.symbol, serverFiles, exported.file);
    if (references === 0) {
      pushFinding(findings, "error", "router-connectivity", exported.file, exported.line, `Exported router is never imported or mounted: ${exported.symbol}`);
    }
  }

  auditUi(clientFiles, findings);
  const swappys = auditSwappys(allFiles, routes, mountedRoots, findings);

  const placeholderRegex = /\b(?:throw new Error\(["'`](?:Not implemented|TODO)|return\s+null\s*;\s*\/\/\s*(?:TODO|placeholder)|mock data|dummy data|fake data)\b/gi;
  for (const file of allFiles) {
    const text = read(file);
    for (const match of text.matchAll(placeholderRegex)) {
      pushFinding(findings, "error", "placeholder-implementation", rel(file), lineOf(text, match.index), "Placeholder implementation remains in executable source.", match[0]);
    }
  }

  findings.sort((a, b) => {
    const weight = { error: 0, warning: 1, info: 2 };
    return weight[a.severity] - weight[b.severity] || a.category.localeCompare(b.category) || a.file.localeCompare(b.file) || a.line - b.line;
  });

  const summary = {
    generatedAt: new Date().toISOString(),
    sourceFiles: allFiles.length,
    clientFiles: clientFiles.length,
    serverFiles: serverFiles.length,
    registeredRoutes: routes.length,
    navigationTargets: navigationTargets.length,
    pageFiles: pageFiles.length,
    mountedTrpcRoots: mountedRoots.size,
    clientTrpcRoots: unique(trpcUsages.map((usage) => usage.root)).length,
    exportedRouters: exportedRouters.length,
    errors: findings.filter((finding) => finding.severity === "error").length,
    warnings: findings.filter((finding) => finding.severity === "warning").length,
    info: findings.filter((finding) => finding.severity === "info").length,
  };

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(path.join(REPORT_DIR, "repository-connectivity-audit.json"), JSON.stringify({ summary, routes, mountedRoots: [...mountedRoots].sort(), swappys, findings }, null, 2));

  const lines = [
    "# Repository Connectivity and UI Debug Audit",
    "",
    `Generated: ${summary.generatedAt}`,
    "",
    "## Summary",
    "",
    `- Source files scanned: ${summary.sourceFiles}`,
    `- Registered routes: ${summary.registeredRoutes}`,
    `- Navigation targets: ${summary.navigationTargets}`,
    `- Page files: ${summary.pageFiles}`,
    `- Mounted tRPC roots: ${summary.mountedTrpcRoots}`,
    `- Client tRPC roots: ${summary.clientTrpcRoots}`,
    `- Exported routers: ${summary.exportedRouters}`,
    `- Errors: ${summary.errors}`,
    `- Warnings: ${summary.warnings}`,
    `- Informational markers: ${summary.info}`,
    "",
    "## Swappys daughter-app connectivity",
    "",
    ...Object.entries(swappys).filter(([key]) => key !== "files").map(([key, value]) => `- ${key}: ${value ? "PASS" : "FAIL"}`),
    `- files detected: ${swappys.files.length}`,
    "",
    "## Findings",
    "",
  ];
  for (const finding of findings) {
    lines.push(`### ${finding.severity.toUpperCase()} — ${finding.category}`);
    lines.push("");
    lines.push(`- Location: \`${finding.file}:${finding.line}\``);
    lines.push(`- ${finding.message}`);
    if (finding.evidence) lines.push(`- Evidence: \`${String(finding.evidence).replaceAll("`", "'")}\``);
    lines.push("");
  }
  fs.writeFileSync(path.join(REPORT_DIR, "repository-connectivity-audit.md"), lines.join("\n"));

  console.log(JSON.stringify(summary, null, 2));
  if (summary.errors > 0) process.exitCode = 2;
}

main();
