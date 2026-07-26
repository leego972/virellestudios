from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def write(path: str, content: str) -> None:
    (ROOT / path).write_text(content, encoding="utf-8")


def replace_once(path: str, old: str, new: str) -> None:
    text = read(path)
    if old not in text:
        raise RuntimeError(f"Expected text not found in {path}: {old[:140]!r}")
    write(path, text.replace(old, new, 1))


def regex_once(path: str, pattern: str, replacement: str, flags: int = 0) -> None:
    text = read(path)
    updated, count = re.subn(pattern, replacement, text, count=1, flags=flags)
    if count != 1:
        raise RuntimeError(f"Expected one regex match in {path}, found {count}: {pattern[:140]!r}")
    write(path, updated)


# Landing icon typing, valid cinema mappings and a clear free Swappys download section.
landing_path = "client/src/pages/Landing.tsx"
landing = read(landing_path)
landing = landing.replace('import type { ToolIconKey } from "@/constants/hollywoodIcons";\n', '')
landing = landing.replace('import { useEffect, useState } from "react";', 'import { type ComponentProps, useEffect, useState } from "react";')
landing = landing.replace('const LOGO_URL = "/virelle-logo-square.png";\n', 'const LOGO_URL = "/virelle-logo-square.png";\ntype BrandIconKey = ComponentProps<typeof HollywoodIcon>["tool"];\n')
landing = landing.replace('  icon: ToolIconKey;', '  icon: BrandIconKey;')
landing = landing.replace('    icon: "funding",', '    icon: "budget_estimator",')
landing = landing.replace('icon as ToolIconKey', 'icon as BrandIconKey')
landing = landing.replace('bg-amber-400/8', 'bg-amber-400/[0.08]')

swappys_section = '''
        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-6xl gap-8 rounded-3xl border border-violet-300/15 bg-[#09090d]/94 p-7 shadow-2xl backdrop-blur-xl lg:grid-cols-[0.7fr_1.3fr] lg:items-center lg:p-10">
            <div className="flex items-center justify-center">
              <HollywoodIcon tool="video_generation" size={190} className="max-w-full" alt="Swappys free short-video app" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[.2em] text-amber-300">Free Swappys app</p>
              <h2 className="mt-3 text-3xl font-black sm:text-4xl">Fast transformations for short video clips.</h2>
              <p className="mt-5 text-sm leading-7 text-white/72">
                Download Swappys for quick short-form clip creation. Free-app outputs remain visibly watermarked and censored, and the app contains no broadcasting controls. Professional advertising and film workflows remain inside Virelle Studios.
              </p>
              <Button className="mt-6 bg-amber-400 font-black text-black hover:bg-amber-300" onClick={() => navigate("/download")}>Download Swappys free <ArrowRight className="ml-2 h-4 w-4" /></Button>
            </div>
          </div>
        </section>

'''
adult_section_marker = '        <section className="px-4 py-20 sm:px-6 lg:px-8">\n          <div className="mx-auto flex max-w-5xl flex-col items-center gap-5 rounded-3xl border border-rose-300/15'
if adult_section_marker not in landing:
    raise RuntimeError("Adult landing section marker not found")
landing = landing.replace(adult_section_marker, swappys_section + adult_section_marker, 1)
write(landing_path, landing)

# Standard Virelle VFX stays for professional film/advertising work only.
vfx_path = "client/src/pages/VFXSuite.tsx"
vfx = read(vfx_path)
vfx = vfx.replace('Rating-aware Swappys, digital doubles, compositing, restoration, finishing and standard broadcast handoff.', 'Professional Swappys, digital doubles, compositing, restoration and finishing for film and advertising projects.')
vfx = vfx.replace('Required for digital-double, age, presentation, stunt, pickup, render and broadcast usage.', 'Required for digital-double, age, presentation, stunt, pickup and professional render usage.')
vfx = vfx.replace('placeholder="Describe the exact lawful transformation, continuity target and broadcast intent."', 'placeholder="Describe the exact lawful transformation, continuity target and production intent."')
adult_card = '''          <Card className="border-fuchsia-500/25 bg-fuchsia-500/5">
            <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm text-fuchsia-200"><LockKeyhole className="h-4 w-4" />Verified 18+ Studio</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-[11px] leading-relaxed text-muted-foreground">Mature styling and adult-platform broadcast are kept outside the main VFX Suite. Paid identity, phone and matching-card verification is required before entry.</p>
              <Button variant="outline" className="w-full border-fuchsia-500/30 text-fuchsia-200 hover:bg-fuchsia-500/10" onClick={() => navigate("/virelle-broadcast-render?adult=1")}><ShieldCheck className="mr-2 h-4 w-4" />Open 18+ registration</Button>
              <div className="flex gap-2 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-[11px] text-muted-foreground"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" /><span>Minors, CSAM, youth-coded subjects, explicit sex acts, genital-focused output and non-consensual use remain prohibited.</span></div>
            </CardContent>
          </Card>

'''
if adult_card not in vfx:
    raise RuntimeError("Old VFX Adult Studio card not found")
vfx = vfx.replace(adult_card, '', 1)
old_output = '''              {lastJob ? <><div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2 text-[11px] text-muted-foreground">Job #{lastJob.swappysJobId || "VFX"} · {lastJob.creditCost} credits · {lastJob.watermarkMode || "default"}</div>{lastJob.enhancedImageUrl && <img src={lastJob.enhancedImageUrl} alt="Swappys output" className="w-full rounded-lg border border-border/50" />}<Button className="w-full bg-blue-600 text-white hover:bg-blue-700" disabled={!lastJob.swappysJobId} onClick={() => navigate(`/virelle-broadcast-render?swappysJobId=${lastJob.swappysJobId}`)}><RadioTower className="mr-2 h-4 w-4" />Send Exact Job to Standard Broadcast</Button></> : <p className="text-xs text-muted-foreground">Create a Swappys job to unlock exact Studio Render and standard Broadcast handoff.</p>}'''
new_output = '''              {lastJob ? <><div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2 text-[11px] text-muted-foreground">Job #{lastJob.swappysJobId || "VFX"} · {lastJob.creditCost} credits · {lastJob.watermarkMode || "default"}</div>{lastJob.enhancedImageUrl && <img src={lastJob.enhancedImageUrl} alt="Swappys output" className="w-full rounded-lg border border-border/50" />}</> : <p className="text-xs text-muted-foreground">Create a Swappys or VFX job to produce a professional project output.</p>}'''
if old_output not in vfx:
    raise RuntimeError("Old VFX broadcast output block not found")
vfx = vfx.replace(old_output, new_output, 1)
for name in ["AlertTriangle", "LockKeyhole", "RadioTower", "ShieldCheck"]:
    if vfx.count(name) == 1:
        vfx = vfx.replace(f"  {name},\n", "")
write(vfx_path, vfx)

# Project tool hub must not present broadcasting as a standard production tool.
hub_path = "client/src/components/ProjectToolHub.tsx"
hub = read(hub_path)
hub = hub.replace('  RadioTower,\n', '')
hub = hub.replace('Edit, transform, mix, dub, grade, caption and prepare the final master or broadcast output.', 'Edit, transform, mix, dub, grade, caption and prepare the final professional master and delivery package.')
hub = hub.replace('        { title: "Swappys & Broadcast", description: "Load approved Swappys output, use Open Adult Creative mode where eligible, and route it to Studio Render or broadcast destinations.", href: "/virelle-broadcast-render", icon: RadioTower, badge: "Output" },\n', '')
write(hub_path, hub)

# Remove all non-logo Adult Studio shortcuts from the authenticated shell.
notification_path = "client/src/components/NotificationBell.tsx"
notification = read(notification_path)
notification = notification.replace('  ShieldCheck,\n', '')
notification = re.sub(
    r'\n      <a\n        href="/virelle-broadcast-render\?adult=1".*?\n      </a>\n',
    '\n',
    notification,
    count=1,
    flags=re.S,
)
write(notification_path, notification)

watermark_path = "client/src/components/GoldWatermarkLaunch.tsx"
watermark = read(watermark_path)
watermark = watermark.replace('const ADULT_ACCESS_HREF = "/virelle-broadcast-render?adult=1";\n', '')
watermark, count = re.subn(r'\nfunction adultStudioActive\(\): boolean \{.*?\n\}\n\nfunction ensureAdultAccessShortcut\(\) \{.*?\n\}\n', '\n', watermark, count=1, flags=re.S)
if count != 1:
    raise RuntimeError("Could not remove injected Adult Studio shortcut")
watermark = watermark.replace('  ensureAdultAccessShortcut();\n', '')
watermark = watermark.replace('''  document
    .querySelectorAll<HTMLElement>("[data-virelle-adult-access]")
    .forEach(shortcut => shortcut.remove());
''', '')
write(watermark_path, watermark)

# Update remaining internal routes to the dedicated Adult Studio path.
replace_once("client/src/pages/Admin.tsx", '"/virelle-broadcast-render?adminVault=1"', '"/adult-studio?adminVault=1"')
replace_once("client/src/pages/Admin.tsx", '"/virelle-broadcast-render?adminVault=1"', '"/adult-studio?adminVault=1"')

apps_guard_path = "client/src/components/LandingVerifiedAppsGuard.tsx"
apps_guard = read(apps_guard_path)
apps_guard = apps_guard.replace('studio provenance and secured broadcast outputs.', 'studio provenance and professional project outputs.')
apps_guard = apps_guard.replace('window.location.assign("/swappys-broadcast")', 'window.location.assign("/download")')
apps_guard = apps_guard.replace('Open Swappys &amp; Broadcast', 'Download Swappys Free')
write(apps_guard_path, apps_guard)

# Free Swappys/mobile manifest explicitly contains no broadcasting capability.
security_path = "server/_core/securityHeaders.ts"
security = read(security_path)
for key in ["broadcastMode", "rtmpBroadcast", "webRtcBroadcast", "obsBridge"]:
    security = security.replace(f"  {key}: true,", f"  {key}: false,")
security = security.replace('"frame-src \'self\' https://js.stripe.com https://checkout.stripe.com https://hooks.stripe.com"', '"frame-src \'self\' https:"')
security = security.replace('version: "2026.07.swappys-byok-broadcast-v2"', 'version: "2026.07.swappys-short-clips-no-broadcast-v3"')
security = security.replace('Professional video transforms, BYOK broadcast sessions, studio rendering, project workflows, credit-based orchestration and advanced watermark controls.', 'Professional video transforms, studio rendering, project workflows, credit-based orchestration and advanced watermark controls.')
security = security.replace('video generation, transformation, provider rendering and broadcast transform compute', 'video generation, transformation and provider rendering')
security = security.replace('intendedUse: "byok_broadcast_and_professional_studio_render"', 'intendedUse: "professional_studio_render"')
write(security_path, security)

# Adult broadcast wallet and policy are available only after complete access.
router_path = "server/virelle-broadcast-render-router.ts"
router = read(router_path)
old_wallet = '''  getBroadcastMinuteWallet: protectedProcedure.query(async ({ ctx }) => {
    requireVfxStudioTier(ctx.user as any, "indie", "Virelle Broadcast");
    const dbConn = await db.getDb();
    if (!dbConn) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    }
    return getBroadcastMinuteWallet(dbConn, ctx.user as any);
  }),'''
new_wallet = '''  getBroadcastMinuteWallet: protectedProcedure.query(async ({ ctx }) => {
    requireVfxStudioTier(ctx.user as any, "indie", "Adult Studio broadcast");
    const dbConn = await db.getDb();
    if (!dbConn) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    }
    const matureStatus = await getMatureAccessStatus(dbConn, ctx.user as any);
    if (!matureStatus.accessGranted) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Verified and activated Adult Studio access is required.",
      });
    }
    return getBroadcastMinuteWallet(dbConn, ctx.user as any);
  }),'''
if old_wallet not in router:
    raise RuntimeError("Broadcast wallet block not found")
router = router.replace(old_wallet, new_wallet, 1)
router = router.replace('"Virelle Broadcast / Studio Render",', '"Adult Studio / Studio Render",')
router = router.replace('policy: "Plain direct or managed broadcasting does not require BYOK. Studio Render and AI-assisted live transformations use the user\'s funded provider key."', 'policy: "Adult Studio managed relay does not require BYOK unless an AI-assisted live transformation is selected. Video generation and AI-assisted processing use the user\'s funded provider key."')
router = router.replace('"Virelle Broadcast Mode",', '"Adult Studio Broadcast",')
write(router_path, router)

# Robust activation price configuration fallback.
mature_path = "server/_core/matureAccess.ts"
mature = read(mature_path)
mature = mature.replace(
    'export const ADULT_STUDIO_ACTIVATION_FEE_AUD = Math.max(1, Number(process.env.ADULT_STUDIO_ACTIVATION_FEE_AUD || "99"));\nexport const ADULT_STUDIO_ACTIVATION_FEE_CENTS = Math.round(ADULT_STUDIO_ACTIVATION_FEE_AUD * 100);',
    'const configuredAdultStudioActivationFee = Number(process.env.ADULT_STUDIO_ACTIVATION_FEE_AUD || "99");\nexport const ADULT_STUDIO_ACTIVATION_FEE_AUD = Number.isFinite(configuredAdultStudioActivationFee) && configuredAdultStudioActivationFee > 0\n  ? configuredAdultStudioActivationFee\n  : 99;\nexport const ADULT_STUDIO_ACTIVATION_FEE_CENTS = Math.round(ADULT_STUDIO_ACTIVATION_FEE_AUD * 100);',
)
write(mature_path, mature)

# Remove the stale navigation-label mapping.
map_path = "client/src/constants/virelleCinemaIconMap.ts"
icon_map = read(map_path).replace('  "Swappys & Broadcast": "distribution",\n', '')
write(map_path, icon_map)

# Update previous regression tests to the exact uploaded-logo access model.
test_path = "server/adult-access-visibility-pricing.test.ts"
test = read(test_path)
test = re.sub(
    r'  it\("exposes a clearly labelled 18\+ verification link in the shared sidebar shell", \(\) => \{.*?\n  \}\);',
    '''  it("uses the exact supplied Adult Studio logo as the authenticated access point", () => {
    const button = source("client/src/components/AdultStudioAccessButton.tsx");
    expect(button).toContain('const ADULT_STUDIO_LOGO = "/adult-studio-access-logo.png"');
    expect(button).toContain('setLocation("/adult-studio")');
    expect(button).not.toContain("Adult Studio · 18+");
    expect(button).not.toContain("rounded-");
  });''',
    test,
    count=1,
    flags=re.S,
)
test = test.replace('      "archiveRetentionAccepted",\n', '      "archiveRetentionAccepted",\n      "activationPaid",\n')
write(test_path, test)

# Strengthen final boundary checks.
boundary_path = "server/adult-studio-product-boundaries.test.ts"
boundary = read(boundary_path)
boundary = boundary.replace('    expect(layout).not.toContain(\'/virelle-broadcast-render\');', '    expect(layout).not.toContain(\'/virelle-broadcast-render\');\n    expect(source("client/src/components/ProjectToolHub.tsx")).not.toContain("Swappys & Broadcast");\n    expect(source("client/src/pages/VFXSuite.tsx")).not.toContain("Standard Broadcast");')
boundary = boundary.replace('  it("leaves only the supplied Adult Studio logo asset pending", () => {', '  it("keeps free Swappys short-form, watermarked and without broadcasting", () => {\n    const landing = source("client/src/pages/Landing.tsx");\n    const mobile = source("server/_core/securityHeaders.ts");\n    expect(landing).toContain("Free Swappys app");\n    expect(landing).toContain("visibly watermarked and censored");\n    expect(landing).toContain("no broadcasting controls");\n    expect(mobile).toContain("broadcastMode: false");\n    expect(mobile).toContain("rtmpBroadcast: false");\n  });\n\n  it("leaves only the supplied Adult Studio logo asset pending", () => {')
write(boundary_path, boundary)

# Pricing cleanup after public broadcast section removal.
pricing_path = "client/src/pages/Pricing.tsx"
pricing = read(pricing_path).replace('  Sparkles,\n', '')
write(pricing_path, pricing)

print("Final Adult Studio product-boundary cleanup applied.")
