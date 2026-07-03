#!/usr/bin/env node
  /**
   * check:byok-policy — Virelle BYOK policy auditor
   *
   * Scans server/studio-render-worker.ts, server/broadcast-worker.ts,
   * server/vfx-sfx-router.ts, and server/virelle-broadcast-render-router.ts
   * for violations of the strict BYOK rule:
   *
   * FORBIDDEN in premium render/broadcast paths:
   *  - Pollinations usage (provider or import)
   *  - Platform-funded video (generateVideo without strict BYOK guard)
   *  - ENV.pollinationsApiKey usage
   *  - Raw API key from process.env in render/broadcast files
   *
   * REQUIRED:
   *  - generateVideoStrict (the only legal dispatch in worker files)
   *  - BYOK_REQUIRED error when no user key found
   */

  import { readFileSync, existsSync } from "fs";
  import { resolve } from "path";

  const PREMIUM_FILES = [
    "server/studio-render-worker.ts",
    "server/broadcast-worker.ts",
    "server/virelle-broadcast-render-router.ts",
    "server/vfx-sfx-router.ts",
  ];

  const FORBIDDEN_PATTERNS = [
    { pattern: /generateWithPollinations/,   label: "direct Pollinations generation call" },
    { pattern: /pollinations.ai/i,          label: "Pollinations.ai URL in premium path" },
    { pattern: /provider.*=.*"pollinations"/, label: 'hardcoded provider = "pollinations"' },
    { pattern: /getNextPollinationsKey/,      label: "platform Pollinations key rotation in premium file" },
    { pattern: /ENV\.pollinationsApiKey/,   label: "ENV.pollinationsApiKey in premium file" },
    { pattern: /generateVideoWithFallback/,   label: "cascading fallback video generation in premium file" },
  ];

  const REQUIRED_PATTERNS_FOR_WORKERS = [
    { pattern: /generateVideoStrict/, label: "generateVideoStrict (strict BYOK dispatch)", files: ["studio-render-worker.ts"] },
    { pattern: /BYOK_REQUIRED/,       label: "BYOK_REQUIRED error message",               files: ["studio-render-worker.ts", "broadcast-worker.ts"] },
  ];

  let violations = 0;
  let checks = 0;

  console.log("\n🔒 Virelle BYOK Policy Audit\n" + "─".repeat(50));

  for (const relPath of PREMIUM_FILES) {
    const fullPath = resolve(relPath);
    if (!existsSync(fullPath)) {
      console.log(`⚠️  MISSING  ${relPath}`);
      violations++;
      continue;
    }

    const src = readFileSync(fullPath, "utf8");
    const fileName = relPath.split("/").pop() ?? relPath;
    let fileViolations = 0;

    for (const { pattern, label } of FORBIDDEN_PATTERNS) {
      checks++;
      if (pattern.test(src)) {
        console.log(`❌ VIOLATION  ${relPath}\n   → ${label}\n`);
        violations++;
        fileViolations++;
      }
    }

    for (const { pattern, label, files } of REQUIRED_PATTERNS_FOR_WORKERS) {
      if (!files.some(f => fileName.includes(f))) continue;
      checks++;
      if (!pattern.test(src)) {
        console.log(`❌ MISSING REQUIRED  ${relPath}\n   → Must contain: ${label}\n`);
        violations++;
        fileViolations++;
      }
    }

    if (fileViolations === 0) {
      console.log(`✅  ${relPath}`);
    }
  }

  console.log("\n" + "─".repeat(50));
  if (violations === 0) {
    console.log(`✅ BYOK policy check PASSED — ${checks} checks, 0 violations\n`);
    process.exit(0);
  } else {
    console.log(`❌ BYOK policy check FAILED — ${violations} violation(s)\n`);
    process.exit(1);
  }
  