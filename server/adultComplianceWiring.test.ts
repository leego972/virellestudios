import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("verified 18+ workspace and compliance archive wiring", () => {
  it("keeps the mature workspace behind multi-factor individual verification", () => {
    const matureAccess = source("server/_core/matureAccess.ts");
    const router = source("server/virelle-broadcast-render-router.ts");

    expect(matureAccess).toContain("paidMembership");
    expect(matureAccess).toContain("phoneVerified");
    expect(matureAccess).toContain("identityVerified");
    expect(matureAccess).toContain("cardNameMatched");
    expect(matureAccess).toContain("adultAgeConfirmed");
    expect(matureAccess).toContain("verifiedIdentityMatchesProfile");
    expect(matureAccess).toContain('expand: ["verified_outputs"]');
    expect(router).toContain("createMatureIdentitySession");
    expect(router).toContain("verifyMatureCardSession");
    expect(router).toContain("TWILIO_VERIFY_SERVICE_SID");
  });

  it("separates standard and adult jobs, destinations, routes and archive records", () => {
    const router = source("server/virelle-broadcast-render-router.ts");
    const archive = source("server/_core/complianceEvidence.ts");
    const page = source("client/src/pages/VirelleBroadcastRender.tsx");

    expect(router).toContain('workspace: z.enum(["standard", "adult"])');
    expect(router).toContain('contentMode === "open_adult"');
    expect(router).toContain("ADULT_BROADCAST_DESTINATIONS");
    expect(router).toContain("Adult-platform broadcast destinations are available only inside the verified 18+ Studio");
    expect(archive).toContain("idx_compliance_workspace");
    expect(page).toContain('adultRequested ? "adult" : "standard"');
    expect(page).toContain("if (adultRequested && !matureStatus.data?.accessGranted)");
    expect(page).not.toContain("adultRequested || !matureAccessGranted");
    expect(page).not.toContain("chooseMatureMode");
  });

  it("never deactivates an account from a request or automated classification alone", () => {
    const archive = source("server/_core/complianceEvidence.ts");
    const guard = source("server/_core/complianceEvidenceGuards.ts");
    const adminPage = source("client/src/pages/AdminComplianceVault.tsx");

    const screenStart = archive.indexOf("export async function screenContentForReview");
    const registerStart = archive.indexOf("export async function registerComplianceArchive");
    const screeningSection = archive.slice(screenStart, registerStart);

    expect(screeningSection).toContain("No account action has been taken");
    expect(screeningSection).not.toContain("isFrozen=1");
    expect(screeningSection).not.toContain("blacklisted_users");
    expect(archive).toContain("export async function confirmViolation");
    expect(archive).toContain("status='confirmed_violation'");
    expect(archive).toContain("isFrozen=1");
    expect(guard).toContain("MEDIA_EVIDENCE_REQUIRED");
    expect(guard).toContain("NEW.archiveId IS NULL");
    expect(adminPage).toContain("A request alone is not sufficient");
    expect(adminPage).toContain("CONFIRM PERMANENT DEACTIVATION");
  });

  it("allows age-appropriate non-explicit teenage film context while blocking sexualised minor content", () => {
    const archive = source("server/_core/complianceEvidence.ts");
    const policy = source("server/_core/swappysPolicy.ts");

    expect(archive).toContain("A non-explicit, age-appropriate teenage romance scene");
    expect(archive).toContain("suspected_csam_request");
    expect(archive).toContain("suspected_minor_sexualisation");
    expect(policy).toContain("Age-appropriate, non-sexual teenage film scenes");
    expect(policy).toContain("Sexualised or explicit depictions involving minors");
    expect(policy).toContain("input.targetAge < 18");
  });

  it("requires a downloadable recording before a broadcast can start", () => {
    const worker = source("server/broadcast-worker.ts");
    const router = source("server/virelle-broadcast-render-router.ts");
    const page = source("client/src/pages/VirelleBroadcastRender.tsx");

    expect(worker).toContain("BROADCAST_RECORDING_URL_REQUIRED");
    expect(worker).toContain("bridge.recordingUrl || bridge.outputUrl");
    expect(worker).toContain("userDownloadRequired: true");
    expect(worker).toContain("complianceArchiveRequired: true");
    expect(worker).toContain("assertComplianceArchiveConfiguration");
    expect(router).toContain("completeBroadcastSession");
    expect(router).toContain("downloadUrl: recordingUrl");
    expect(router).toContain("recordingRequired: true");
    expect(page).toContain("Finish & save recording");
  });

  it("archives only completed outputs and validates every remote host and redirect", () => {
    const transport = source("server/_core/complianceArchiveTransport.ts");
    const worker = source("server/compliance-evidence-worker.ts");

    expect(transport).toContain("scanCompletedVideoOutputs");
    expect(transport).toContain("WHERE v.status='completed'");
    expect(transport).not.toContain("v.status IN ('processing','completed')");
    expect(transport).toContain("assertSafeRemoteMediaUrl");
    expect(transport).toContain("COMPLIANCE_ALLOWED_MEDIA_HOSTS");
    expect(transport).toContain('redirect: "manual"');
    expect(transport).toContain("privateAddress");
    expect(transport).toContain("nextAttemptAt");
    expect(worker).toContain("processSecureArchiveQueue");
    expect(worker).not.toContain("scanVideoOutputs");
  });

  it("keeps private archive access admin-only with minimum retention and legal holds", () => {
    const archive = source("server/_core/complianceEvidence.ts");
    const guard = source("server/_core/complianceEvidenceGuards.ts");
    const router = source("server/virelle-broadcast-render-router.ts");
    const adminPage = source("client/src/pages/AdminComplianceVault.tsx");
    const environment = source(".env.example");

    expect(archive).toContain("Math.max(\n  90,");
    expect(archive).toContain("legalHold=0 AND retainedUntil<NOW()");
    expect(archive).toContain("getSignedUrl");
    expect(archive).toContain("archive_download_url_created");
    expect(guard).toContain("PRIVATE_ARCHIVE_BUCKET_REQUIRED");
    expect(guard).toContain("COMPLIANCE_ALLOW_SHARED_BUCKET");
    expect(environment).toContain("COMPLIANCE_ARCHIVE_BUCKET=virelle-compliance-private");
    expect(environment).toContain("COMPLIANCE_ALLOW_SHARED_BUCKET=false");
    expect(router).toContain("const adminComplianceRouter = router");
    expect(router).toContain("getArchiveDownloadUrl: adminProcedure");
    expect(router).toContain("setLegalHold: adminProcedure");
    expect(adminPage).toContain("Admin Download");
    expect(adminPage).toContain("Blacklisted Users");
  });

  it("uses a restrained Virelle visual treatment rather than adult-site styling", () => {
    const topBar = source("client/src/components/NotificationBell.tsx");
    const stylesheet = source("client/src/styles/mature-studio.css");
    const page = source("client/src/pages/VirelleBroadcastRender.tsx");

    expect(topBar).toContain("Verified 18+");
    expect(topBar).toContain("mature-studio.css");
    expect(topBar).not.toContain("text-fuchsia");
    expect(topBar).not.toContain("bg-fuchsia");
    expect(stylesheet).toContain("graphite surfaces");
    expect(stylesheet).toContain("Virelle gold accents");
    expect(stylesheet).toContain("no adult-site visual language");
    expect(page).toContain("Verified 18+ Production Studio");
    expect(page).not.toContain("border-fuchsia");
    expect(page).not.toContain("bg-fuchsia");
  });
});
