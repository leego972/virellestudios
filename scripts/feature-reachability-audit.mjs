#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const ROOT = process.cwd();
const APP_FILE = path.join(ROOT, "client", "src", "App.tsx");
const CLIENT_ROOT = path.join(ROOT, "client", "src");
const REPORT_DIR = path.join(ROOT, "audit-results");
const extensions = new Set([".ts", ".tsx", ".js", ".jsx"]);

function walk(directory) {
  const output = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (["node_modules", "dist", "build", "coverage"].includes(entry.name)) continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...walk(full));
    else if (extensions.has(path.extname(entry.name))) output.push(full);
  }
  return output;
}

const rel = (file) => path.relative(ROOT, file).replaceAll(path.sep, "/");
const source = (file) => ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
const lineOf = (sf, node) => sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;

function visit(node, callback) {
  callback(node);
  ts.forEachChild(node, (child) => visit(child, callback));
}

function pageModule(moduleName) {
  const match = moduleName.match(/(?:^\.\/pages\/|^@\/pages\/)(.+)$/);
  return match?.[1];
}

function literal(expression) {
  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) return expression.text;
  return undefined;
}

function auditAppReachability() {
  const sf = source(APP_FILE);
  const pageBindings = new Map();
  const identifierCounts = new Map();

  visit(sf, (node) => {
    if (ts.isIdentifier(node)) identifierCounts.set(node.text, (identifierCounts.get(node.text) || 0) + 1);

    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const moduleName = pageModule(node.moduleSpecifier.text);
      const local = node.importClause?.name?.text;
      if (moduleName && local) pageBindings.set(local, { moduleName, line: lineOf(sf, node) });
    }

    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer && ts.isCallExpression(node.initializer)) {
      const outerCall = node.initializer;
      if (outerCall.expression.getText(sf) !== "lazy") return;
      const loader = outerCall.arguments[0];
      if (!loader || !ts.isArrowFunction(loader)) return;
      let importCall;
      if (ts.isCallExpression(loader.body) && loader.body.expression.kind === ts.SyntaxKind.ImportKeyword) importCall = loader.body;
      if (!importCall) return;
      const moduleName = importCall.arguments[0] ? pageModule(literal(importCall.arguments[0]) || "") : undefined;
      if (moduleName) pageBindings.set(node.name.text, { moduleName, line: lineOf(sf, node) });
    }
  });

  const unreachable = [];
  for (const [localName, details] of pageBindings) {
    const count = identifierCounts.get(localName) || 0;
    if (count <= 1) unreachable.push({ localName, ...details, count });
  }
  return unreachable.sort((a, b) => a.moduleName.localeCompare(b.moduleName));
}

function auditMediaFactories() {
  const findings = [];
  for (const file of walk(CLIENT_ROOT)) {
    if (rel(file).includes("/components/ui/")) continue;
    const sf = source(file);
    visit(sf, (node) => {
      if (!ts.isFunctionDeclaration(node) || !node.name || !node.body) return;
      if (!/(?:image|thumbnail|poster|cover|asset).*url|url.*(?:image|thumbnail|poster|cover|asset)/i.test(node.name.text)) return;
      const returns = [];
      visit(node.body, (child) => {
        if (ts.isReturnStatement(child)) returns.push(child);
      });
      if (returns.length > 0 && returns.every((statement) => statement.expression && ts.isStringLiteral(statement.expression) && statement.expression.text === "")) {
        findings.push({ file: rel(file), line: lineOf(sf, node), functionName: node.name.text, message: "Media URL factory always returns an empty string." });
      }
    });
  }
  return findings;
}

const unreachablePages = auditAppReachability();
const emptyMediaFactories = auditMediaFactories();
const report = {
  generatedAt: new Date().toISOString(),
  unreachablePages,
  emptyMediaFactories,
  errors: unreachablePages.length + emptyMediaFactories.length,
};

fs.mkdirSync(REPORT_DIR, { recursive: true });
fs.writeFileSync(path.join(REPORT_DIR, "feature-reachability-audit.json"), JSON.stringify(report, null, 2));
fs.writeFileSync(path.join(REPORT_DIR, "feature-reachability-audit.md"), [
  "# Feature Reachability Audit",
  "",
  `Generated: ${report.generatedAt}`,
  "",
  "## Imported page components never mounted",
  "",
  ...(unreachablePages.length ? unreachablePages.map((item) => `- \`${item.localName}\` → \`${item.moduleName}\` (App.tsx:${item.line})`) : ["- None"]),
  "",
  "## Empty media URL factories",
  "",
  ...(emptyMediaFactories.length ? emptyMediaFactories.map((item) => `- \`${item.file}:${item.line}\` — \`${item.functionName}\`: ${item.message}`) : ["- None"]),
  "",
].join("\n"));

console.log(JSON.stringify({ unreachablePages: unreachablePages.length, emptyMediaFactories: emptyMediaFactories.length }, null, 2));
if (report.errors > 0) process.exitCode = 2;
