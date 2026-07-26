from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def write(path: str, content: str) -> None:
    (ROOT / path).write_text(content, encoding="utf-8")


# Correct the last invalid icon key and use explicit opacity values so every
# reading surface is generated reliably by Tailwind.
landing_path = "client/src/pages/Landing.tsx"
landing = read(landing_path)
landing = landing.replace('<HollywoodIcon tool="funding" size={230}', '<HollywoodIcon tool="budget_estimator" size={230}')
opacity_replacements = {
    "bg-black/58": "bg-black/[0.58]",
    "bg-black/78": "bg-black/[0.78]",
    "border-amber-400/22": "border-amber-400/[0.22]",
    "bg-[#09090c]/92": "bg-[#09090c]/[0.92]",
    "border-white/8": "border-white/[0.08]",
    "text-white/72": "text-white/[0.72]",
    "bg-[#08080b]/92": "bg-[#08080b]/[0.92]",
    "border-amber-400/18": "border-amber-400/[0.18]",
    "text-white/82": "text-white/[0.82]",
    "bg-[#09090d]/94": "bg-[#09090d]/[0.94]",
    "bg-[#0a090c]/94": "bg-[#0a090c]/[0.94]",
    "bg-black/62": "bg-black/[0.62]",
    "bg-[#09090c]/94": "bg-[#09090c]/[0.94]",
}
for old, new in opacity_replacements.items():
    landing = landing.replace(old, new)
write(landing_path, landing)

# Delete the obsolete, unrouted standard Swappys/Broadcast hub rather than
# leaving dormant broadcasting UI in the client source.
obsolete_hub = ROOT / "client/src/pages/SwappysBroadcastHub.tsx"
if obsolete_hub.exists():
    obsolete_hub.unlink()

# The Adult Studio BYOK status and minute wallet are both access-gated. Direct,
# unrecorded broadcasting is rejected even when called outside the UI.
router_path = "server/virelle-broadcast-render-router.ts"
router = read(router_path)
old_byok = '''  getByokStatus: protectedProcedure.query(async ({ ctx }) => {
    requireVfxStudioTier(
      ctx.user as any,
      "indie",
      "Adult Studio / Studio Render",
    );
    const keys = await db.getUserApiKeys(ctx.user.id);'''
new_byok = '''  getByokStatus: protectedProcedure.query(async ({ ctx }) => {
    requireVfxStudioTier(
      ctx.user as any,
      "indie",
      "Adult Studio / Studio Render",
    );
    const statusDb = await db.getDb();
    if (!statusDb) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    }
    const matureStatus = await getMatureAccessStatus(statusDb, ctx.user as any);
    if (!matureStatus.accessGranted) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Verified and activated Adult Studio access is required.",
      });
    }
    const keys = await db.getUserApiKeys(ctx.user.id);'''
if old_byok not in router:
    raise RuntimeError("Adult BYOK status block not found")
router = router.replace(old_byok, new_byok, 1)
router = router.replace('requireVfxStudioTier(ctx.user as any, "indie", "Virelle Broadcast");', 'requireVfxStudioTier(ctx.user as any, "indie", "Adult Studio broadcast");')
router, direct_count = re.subn(
    r'\n    if \(input\.serviceMode === "direct"\) \{.*?\n    \}\n\n    const provider = aiAssisted',
    '''
    if (input.serviceMode === "direct") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Adult Studio broadcasts must use the managed recording route.",
      });
    }

    const provider = aiAssisted''',
    router,
    count=1,
    flags=re.S,
)
if direct_count != 1:
    raise RuntimeError(f"Expected one direct broadcast branch, found {direct_count}")
write(router_path, router)

# Activation becomes visually available only when every server-required
# verification condition is complete.
page_path = "client/src/pages/VirelleBroadcastRender.tsx"
page = read(page_path)
old_disabled = 'disabled={!status?.cardNameMatched || !status?.identityVerified || !status?.phoneVerified || status?.activationPaid || createActivation.isPending}'
new_disabled = 'disabled={!status?.paidMembership || !status?.profileComplete || !status?.adultAgeConfirmed || !status?.adultAttestationAccepted || !status?.phoneVerified || !status?.identityVerified || !status?.cardNameMatched || !status?.responsibilityAccepted || !status?.consentPolicyAccepted || !status?.archiveRetentionAccepted || status?.activationPaid || createActivation.isPending}'
if old_disabled not in page:
    raise RuntimeError("Activation button condition not found")
page = page.replace(old_disabled, new_disabled, 1)
page = page.replace('{status?.accessGranted ? "Verified" : "Verification required"}', '{status?.accessGranted ? "Access active" : status?.activationPaid ? "Verification required" : "Verification and activation required"}')
write(page_path, page)

# Strengthen regression coverage for dormant UI and managed-recording policy.
test_path = "server/adult-studio-product-boundaries.test.ts"
test = read(test_path)
test = test.replace(
    '    expect(source("client/src/pages/VFXSuite.tsx")).not.toContain("Standard Broadcast");\n    expect(app).toContain(\'path="/adult-studio"\');',
    '    expect(source("client/src/pages/VFXSuite.tsx")).not.toContain("Standard Broadcast");\n    expect(source("client/src/components/NotificationBell.tsx")).not.toContain("18+ Studio");\n    expect(source("client/src/components/GoldWatermarkLaunch.tsx")).not.toContain("data-virelle-adult-access");\n    expect(fs.existsSync(path.join(root, "client/src/pages/SwappysBroadcastHub.tsx"))).toBe(false);\n    expect(app).toContain(\'path="/adult-studio"\');',
)
test = test.replace(
    '    expect(router).toContain("Broadcasting is available only inside the verified Adult Studio portal.");',
    '    expect(router).toContain("Broadcasting is available only inside the verified Adult Studio portal.");\n    expect(router).toContain("Adult Studio broadcasts must use the managed recording route.");',
)
write(test_path, test)

print("Final Adult Studio and landing audit fixes applied.")
