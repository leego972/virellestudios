#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const filesToCheck = [
  "server/virelle-broadcast-render-router.ts",
  "client/src/pages/VirelleBroadcastRender.tsx",
  "server/_core/securityHeaders.ts",
];

const requiredStrings = [
  { file: "server/virelle-broadcast-render-router.ts", text: "BYOK_REQUIRED" },
  { file: "server/virelle-broadcast-render-router.ts", text: "byokRequired" },
  { file: "server/virelle-broadcast-render-router.ts", text: "provider_cost_paid_by_user_key" },
  { file: "server/_core/securityHeaders.ts", text: "byokVideoRequired" },
  { file: "server/_core/securityHeaders.ts", text: "noPlatformFundedUserVideo" },
  { file: "client/src/pages/VirelleBroadcastRender.tsx", text: "no platform-funded" },
];

const forbiddenInPremiumPath = [
  { file: "server/virelle-broadcast-render-router.ts", text: "pollinations" },
  { file: "server/virelle-broadcast-render-router.ts", text: "POLLINATIONS" },
  { file: "server/virelle-broadcast-render-router.ts", text: "generateVideo(" },
  { file: "server/virelle-broadcast-render-router.ts", text: "platform key" },
  { file: "server/virelle-broadcast-render-router.ts", text: "platform-funded fallback" },
];

function read(file) {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) throw new Error(`Missing file: ${file}`);
  return fs.readFileSync(full, "utf8");
}

try {
  for (const file of filesToCheck) read(file);

  for (const rule of requiredStrings) {
    const content = read(rule.file);
    if (!content.includes(rule.text)) {
      throw new Error(`Required BYOK policy marker missing: ${rule.file} -> ${rule.text}`);
    }
  }

  for (const rule of forbiddenInPremiumPath) {
    const content = read(rule.file);
    if (content.includes(rule.text)) {
      throw new Error(`Forbidden premium-path fallback marker found: ${rule.file} -> ${rule.text}`);
    }
  }

  console.log("PASS: Virelle premium Broadcast/Studio Render path is marked BYOK-only and has no obvious provider fallback markers.");
  process.exit(0);
} catch (err) {
  console.error("FAIL:", err?.message || err);
  process.exit(1);
}
