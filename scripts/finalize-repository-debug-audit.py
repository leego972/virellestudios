from pathlib import Path
import re


def patch_file(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    if new in text:
        return
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected one match for {old[:120]!r}, found {count}")
    file.write_text(text.replace(old, new, 1))


# Keep one authoritative health route. /api/healthz remains the lightweight liveness probe.
index_path = Path("server/_core/index.ts")
index_text = index_path.read_text()
health_pattern = re.compile(
    r'\n  // v6\.6 — Lightweight health endpoint for the native wrapper and load balancers\.[\s\S]*?\n  app\.get\("/api/health", async \(_req, res\) => \{[\s\S]*?\n  \}\);\n',
    re.MULTILINE,
)
index_text, health_count = health_pattern.subn("\n", index_text, count=1)
if health_count not in (0, 1):
    raise SystemExit(f"server/_core/index.ts: health route removal count={health_count}")
if index_text.count('app.get("/api/health"') != 1:
    raise SystemExit(f"server/_core/index.ts: expected exactly one /api/health route after cleanup, found {index_text.count('app.get(\"/api/health\"')}")
index_path.write_text(index_text)

# Make the Swappys download card match the actual daughter-app product and distribution status.
patch_file(
    "client/src/pages/DownloadApp.tsx",
    '<p className="text-zinc-400 text-sm">Free AI filmmaking app</p>',
    '<p className="text-zinc-400 text-sm">Free image transformation companion</p>',
)
patch_file(
    "client/src/pages/DownloadApp.tsx",
    '''                Script, storyboard, and generate AI video clips — no subscription needed.
                Upgrade to Virelle Studios from inside the app to unlock BYOK, unlimited exports and watermark removal.''',
    '''                Capture or choose two authorised images, create a consent-controlled transformation, save it locally, or attach it to a selected Virelle production scene.
                Anonymous previews are quota-limited and watermarked. Connected eligible Virelle accounts can apply subscription and BYOK entitlements. Swappys is currently distributed through the Virelle Studios iOS listing.''',
)
patch_file(
    "client/src/pages/DownloadApp.tsx",
    '🍎 Download on iOS — Free',
    '🍎 Open Virelle iOS Listing',
)

# Correct audit heuristics so they inspect the extracted security/persistence services
# and treat the deliberately removed Record control as a pass rather than a missing pipeline.
audit_path = Path("scripts/repository-connectivity-audit.mjs")
audit_text = audit_path.read_text()
patches = [
    (
        '  const featureRegistryFile = path.join(ROOT, "shared", "feature-registry.ts");',
        '  const featureRegistryFile = path.join(ROOT, "shared", "feature-registry.ts");\n  const securityFile = path.join(SERVER, "_core", "swappysSecurity.ts");\n  const assetsFile = path.join(SERVER, "_core", "swappysMobileAssets.ts");',
    ),
    (
        '  const registryText = fs.existsSync(featureRegistryFile) ? read(featureRegistryFile) : "";',
        '  const registryText = fs.existsSync(featureRegistryFile) ? read(featureRegistryFile) : "";\n  const securityText = fs.existsSync(securityFile) ? read(securityFile) : "";\n  const assetsText = fs.existsSync(assetsFile) ? read(assetsFile) : "";',
    ),
    (
        '  const recordingFunction = webText.match(/async function doSwap\\(\\)[\\s\\S]*?\\nfunction clearResult/)?.[0] || "";',
        '  const recordingFunction = webText.match(/async function doSwap\\(\\)[\\s\\S]*?\\nfunction clearResult/)?.[0] || "";\n  const recordingControlPresent = /MediaRecorder|recordingUrl|id=["\\\']record|>Record</i.test(webText);',
    ),
    (
        '    imageValidation: /validateImage\\(|image\\/jpeg|image\\/png|image\\/webp/i.test(webText),',
        '    imageValidation: /prepareImage\\(|validateSwappysDataImage|image\\/jpeg|image\\/png|image\\/webp/i.test(webText + securityText),',
    ),
    (
        '    serverMimeValidation: /data:image\\/(?:jpeg|png|webp)|mime/i.test(procedureText),',
        '    serverMimeValidation: /data:image\\/(?:jpeg|png|webp)|signatureMatches|sharp\\(/i.test(procedureText + securityText),',
    ),
    (
        '    moderation: /scanContent|moderation|handleModeration/i.test(procedureText),',
        '    moderation: /moderateSwappysImages|omni-moderation|moderation/i.test(procedureText + securityText),',
    ),
    (
        '    anonymousRateLimit: /rateLimit|throttle|quota/i.test(procedureText),',
        '    anonymousRateLimit: /rateLimitPublicByIP|swappys-minute|swappys-daily-preview/i.test(procedureText + securityText),',
    ),
    (
        '    anonymousCostControl: /deductCredits|userApiKeys|BYOK|rateLimit|quota/i.test(procedureText),',
        '    anonymousCostControl: /userApiKeys|openaiKey|rateLimitPublicByIP|anonymous_preview/i.test(procedureText + securityText),',
    ),
    (
        '    recordingConnectedToGeneration: /recordingUrl|MediaRecorder/i.test(recordingFunction),',
        '    recordingConnectedToGeneration: !recordingControlPresent || /recordingUrl|MediaRecorder/i.test(recordingFunction),',
    ),
    (
        '    saveBackToVirelle: /saveToVirelle|saveToProject|projectAsset|sceneAsset|productionAssets/i.test(appText + webText),',
        '    saveBackToVirelle: /saveToVirelle|swappysMobileSaveResult|saveSwappysMobileResult|scene_vfx_data/i.test(appText + webText + serverText + assetsText),',
    ),
    (
        '  if (!result.recordingConnectedToGeneration) finding(findings, "error", "swappys-ui", "apps/swappys-mobile/src/SwappysWebApp.ts", 1, "The Record control captures local video but the recording is never included in the generation request.");',
        '  if (recordingControlPresent && !result.recordingConnectedToGeneration) finding(findings, "error", "swappys-ui", "apps/swappys-mobile/src/SwappysWebApp.ts", 1, "The Record control captures local video but the recording is never included in the generation request.");',
    ),
]
for old, new in patches:
    if new in audit_text:
        continue
    if audit_text.count(old) != 1:
        raise SystemExit(f"repository-connectivity-audit.mjs: expected one match for {old[:100]!r}, found {audit_text.count(old)}")
    audit_text = audit_text.replace(old, new, 1)
audit_path.write_text(audit_text)

# Action-depth audit becomes an enforced gate, not an informational script.
action_path = Path("scripts/action-implementation-audit.mjs")
action_text = action_path.read_text()
exit_line = 'if (report.suspiciousActions > 0) process.exitCode = 2;\n'
if exit_line not in action_text:
    action_text = action_text.rstrip() + "\n" + exit_line
action_path.write_text(action_text)

# Make the daughter app reproducible and include action-depth output in the permanent audit workflow.
workflow_path = Path(".github/workflows/repository-debug-audit.yml")
workflow = workflow_path.read_text()
workflow = workflow.replace(
    'pnpm --dir apps/swappys-mobile install --no-frozen-lockfile 2>&1 | tee audit-swappys-install.log',
    'pnpm --dir apps/swappys-mobile install --frozen-lockfile 2>&1 | tee audit-swappys-install.log',
)
action_step = '''
      - name: Primary action implementation-depth audit
        id: action_depth
        shell: bash
        run: |
          set +e
          node scripts/action-implementation-audit.mjs 2>&1 | tee audit-action-depth.log
          code=${PIPESTATUS[0]}
          echo "exit_code=$code" >> "$GITHUB_OUTPUT"
          exit 0
'''
if "id: action_depth" not in workflow:
    marker = "      - name: Secret-pattern scan\n"
    if workflow.count(marker) != 1:
        raise SystemExit("repository-debug-audit.yml: secret scan insertion marker missing")
    workflow = workflow.replace(marker, action_step + "\n" + marker, 1)
if "- Primary action implementation depth:" not in workflow:
    workflow = workflow.replace(
        '          - Feature reachability/media audit: ${{ steps.feature_reachability.outputs.exit_code }}\n',
        '          - Feature reachability/media audit: ${{ steps.feature_reachability.outputs.exit_code }}\n          - Primary action implementation depth: ${{ steps.action_depth.outputs.exit_code }}\n',
        1,
    )
if "audit-action-depth.log" not in workflow:
    workflow = workflow.replace(
        '            audit-feature-reachability.log\n',
        '            audit-feature-reachability.log\n            audit-action-depth.log\n',
        1,
    )
if '"${{ steps.action_depth.outputs.exit_code }}"' not in workflow:
    workflow = workflow.replace(
        '            "${{ steps.feature_reachability.outputs.exit_code }}" \\\n',
        '            "${{ steps.feature_reachability.outputs.exit_code }}" \\\n            "${{ steps.action_depth.outputs.exit_code }}" \\\n',
        1,
    )
workflow_path.write_text(workflow)
