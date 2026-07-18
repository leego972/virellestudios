#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const ROOT = process.cwd();
const PAGE_ROOT = path.join(ROOT, "client", "src", "pages");
const REPORT_DIR = path.join(ROOT, "audit-results");
const ACTION_LABEL = /\b(save|export|download|generate|create|submit|publish|send|delete|remove|apply|upload|render|run|launch|process|sync|import|checkout|purchase|pay|translate|dub|mix|share|invite|approve|reject|start)\b/i;
const NON_PERSISTENT_CALLS = /^(?:set[A-Z]|toast|console\.|Math\.|Date\.|Object\.|Array\.|String\.|Number\.|URL\.revokeObjectURL|URL\.createObjectURL)$/;
const PERSISTENCE_CALL = /(?:\.mutate(?:Async)?$|\.refetch$|\.invalidate$|fetch$|axios\.|downloadFile$|storagePut$|localStorage\.|sessionStorage\.|indexedDB\.|window\.open$|location\.(?:assign|replace)$|setLocation$|navigate$|navigator\.(?:share|clipboard)|document\.createElement$|\.click$|FileSystem\.|MediaLibrary\.|Linking\.|WebBrowser\.)/;

function walk(directory) {
  const output = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (["node_modules", "dist", "build"].includes(entry.name)) continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...walk(full));
    else if (/\.(tsx|jsx)$/.test(entry.name) && !/\.(test|spec)\./.test(entry.name)) output.push(full);
  }
  return output;
}

const rel = (file) => path.relative(ROOT, file).replaceAll(path.sep, "/");
const source = (file) => ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const lineOf = (sf, node) => sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;

function visit(node, callback) {
  callback(node);
  ts.forEachChild(node, (child) => visit(child, callback));
}

function jsxName(tag, sf) {
  return tag.getText(sf).replace(/^.*\./, "");
}

function textLabel(node, sf) {
  const raw = node.getText(sf)
    .replace(/<[^>]+>/g, " ")
    .replace(/\{[^{}]*\}/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
  return raw.slice(0, 140);
}

function opening(node) {
  if (ts.isJsxElement(node)) return node.openingElement;
  if (ts.isJsxSelfClosingElement(node)) return node;
  return undefined;
}

function attribute(openingElement, name) {
  return openingElement.attributes.properties.find((property) => ts.isJsxAttribute(property) && property.name.text === name);
}

function handlerNameFromAttribute(attributeNode) {
  if (!attributeNode?.initializer || !ts.isJsxExpression(attributeNode.initializer) || !attributeNode.initializer.expression) return undefined;
  const expression = attributeNode.initializer.expression;
  if (ts.isIdentifier(expression)) return expression.text;
  if (ts.isArrowFunction(expression)) return { inline: expression };
  if (ts.isCallExpression(expression) && ts.isIdentifier(expression.expression)) return expression.expression.text;
  return undefined;
}

function collectFunctions(sf) {
  const functions = new Map();
  visit(sf, (node) => {
    if (ts.isFunctionDeclaration(node) && node.name && node.body) functions.set(node.name.text, node.body);
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer && (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))) {
      functions.set(node.name.text, node.initializer.body);
    }
  });
  return functions;
}

function analyzeBody(body, sf) {
  let persistent = false;
  let providerOrMutation = false;
  let stateOnly = false;
  const calls = [];
  visit(body, (node) => {
    if (!ts.isCallExpression(node)) return;
    const callee = node.expression.getText(sf);
    calls.push(callee);
    if (PERSISTENCE_CALL.test(callee)) {
      persistent = true;
      if (/\.mutate(?:Async)?$|fetch$|axios\./.test(callee)) providerOrMutation = true;
    }
    if (/^set[A-Z]/.test(callee) || /^toast(?:\.|$)/.test(callee)) stateOnly = true;
  });
  return { persistent, providerOrMutation, stateOnly, calls: [...new Set(calls)].slice(0, 30) };
}

const findings = [];
for (const file of walk(PAGE_ROOT)) {
  const sf = source(file);
  const functions = collectFunctions(sf);
  visit(sf, (node) => {
    const open = opening(node);
    if (!open) return;
    const tag = jsxName(open.tagName, sf);
    if (tag !== "Button" && tag !== "button") return;
    const label = textLabel(node, sf);
    if (!ACTION_LABEL.test(label)) return;
    const handler = handlerNameFromAttribute(attribute(open, "onClick"));
    if (!handler) return;
    const body = typeof handler === "object" ? handler.inline.body : functions.get(handler);
    if (!body) return;
    const analysis = analyzeBody(body, sf);
    if (!analysis.persistent && analysis.stateOnly) {
      findings.push({
        severity: "warning",
        file: rel(file),
        line: lineOf(sf, open),
        label,
        handler: typeof handler === "string" ? handler : "inline",
        message: "Primary action appears to update local state/show a toast without a server mutation, provider call, file operation or durable persistence.",
        calls: analysis.calls,
      });
    }
  });
}

const report = {
  generatedAt: new Date().toISOString(),
  suspiciousActions: findings.length,
  findings,
};
fs.mkdirSync(REPORT_DIR, { recursive: true });
fs.writeFileSync(path.join(REPORT_DIR, "action-implementation-audit.json"), JSON.stringify(report, null, 2));
fs.writeFileSync(path.join(REPORT_DIR, "action-implementation-audit.md"), [
  "# Primary Action Implementation Audit",
  "",
  `Generated: ${report.generatedAt}`,
  "",
  `Suspicious primary actions: ${findings.length}`,
  "",
  ...findings.flatMap((item) => [
    `## ${item.file}:${item.line}`,
    "",
    `- Label: ${item.label}`,
    `- Handler: \`${item.handler}\``,
    `- ${item.message}`,
    `- Calls: ${item.calls.map((call) => `\`${call}\``).join(", ") || "none"}`,
    "",
  ]),
].join("\n"));
console.log(JSON.stringify({ suspiciousActions: findings.length }, null, 2));
