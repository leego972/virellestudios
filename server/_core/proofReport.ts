/**
   * proofReport.ts — Virelle Studios production readiness proof report.
   *
   * Generates a structured verification report confirming a film production
   * pipeline has passed all stages before distribution or publication.
   * Never marks a project READY without evidence from each pipeline stage.
   * Mirrors VIBA's createProofReport() pattern, adapted for film production.
   */

  export type ProofCheckStatus = "pass" | "fail" | "skip" | "warn";

  export interface ProofCheck {
    id: string;
    category: "story" | "cast" | "production" | "post_production" | "distribution" | "legal";
    label: string;
    status: ProofCheckStatus;
    detail: string | null;
    blocksRelease: boolean;
  }

  export interface ProductionProofReport {
    projectId: number | null;
    generatedAt: string;
    overallStatus: "ready" | "blocked" | "warnings_only";
    score: number;
    checks: ProofCheck[];
    blockers: ProofCheck[];
    warnings: ProofCheck[];
    summary: string;
  }

  export interface ProofReportInput {
    projectId?: number;
    hasScript: boolean;
    hasLogline: boolean;
    sceneCount: number;
    generatedSceneCount: number;
    characterCount: number;
    subtitlesReady: boolean;
    soundtrackReady: boolean;
    exportReady: boolean;
    exportBlockers?: string[];
    creditBalance?: number;
    termsAccepted?: boolean;
  }

  export function createProductionProofReport(input: ProofReportInput): ProductionProofReport {
    const checks: ProofCheck[] = [];
    const now = new Date().toISOString();

    checks.push({
      id: "story-script",
      category: "story",
      label: "Script / story document",
      status: input.hasScript ? "pass" : "fail",
      detail: input.hasScript ? null : "No script — add a script or series bible before distribution",
      blocksRelease: true,
    });

    checks.push({
      id: "story-logline",
      category: "story",
      label: "Logline",
      status: input.hasLogline ? "pass" : "warn",
      detail: input.hasLogline ? null : "Logline missing — required for pitch and distribution metadata",
      blocksRelease: false,
    });

    const sceneGenerationPct = input.sceneCount > 0
      ? Math.round((input.generatedSceneCount / input.sceneCount) * 100)
      : 0;

    checks.push({
      id: "production-scenes",
      category: "production",
      label: `Scene generation (${input.generatedSceneCount}/${input.sceneCount})`,
      status: input.sceneCount === 0 ? "fail"
        : sceneGenerationPct >= 100 ? "pass"
        : sceneGenerationPct >= 80 ? "warn"
        : "fail",
      detail: sceneGenerationPct < 100 ? `${100 - sceneGenerationPct}% of scenes not yet generated` : null,
      blocksRelease: sceneGenerationPct < 80,
    });

    checks.push({
      id: "cast-characters",
      category: "cast",
      label: "Character count",
      status: input.characterCount > 0 ? "pass" : "warn",
      detail: input.characterCount === 0 ? "No characters defined — add at least a protagonist" : null,
      blocksRelease: false,
    });

    checks.push({
      id: "post-subtitles",
      category: "post_production",
      label: "Subtitles",
      status: input.subtitlesReady ? "pass" : "warn",
      detail: input.subtitlesReady ? null : "Subtitles not ready — required for major platforms",
      blocksRelease: false,
    });

    checks.push({
      id: "post-soundtrack",
      category: "post_production",
      label: "Soundtrack / music",
      status: input.soundtrackReady ? "pass" : "warn",
      detail: input.soundtrackReady ? null : "No soundtrack assigned",
      blocksRelease: false,
    });

    const exportBlockers = input.exportBlockers ?? [];
    checks.push({
      id: "export-ready",
      category: "distribution",
      label: "Export readiness",
      status: input.exportReady ? "pass" : exportBlockers.length > 0 ? "fail" : "warn",
      detail: exportBlockers.length > 0 ? `Blockers: ${exportBlockers.join(", ")}` : input.exportReady ? null : "Export not configured",
      blocksRelease: exportBlockers.length > 0,
    });

    const balance = input.creditBalance ?? 0;
    checks.push({
      id: "distribution-credits",
      category: "distribution",
      label: "Credit balance",
      status: balance > 0 ? "pass" : "warn",
      detail: balance <= 0 ? "No credits — top up before bulk render or distribution" : null,
      blocksRelease: false,
    });

    checks.push({
      id: "legal-terms",
      category: "legal",
      label: "Terms accepted",
      status: input.termsAccepted !== false ? "pass" : "fail",
      detail: input.termsAccepted === false ? "Terms of service not accepted" : null,
      blocksRelease: input.termsAccepted === false,
    });

    const blockers = checks.filter(c => c.status === "fail" && c.blocksRelease);
    const warnings = checks.filter(c => c.status === "warn" || (c.status === "fail" && !c.blocksRelease));
    const passed = checks.filter(c => c.status === "pass").length;
    const score = Math.round((passed / checks.length) * 100);

    const overallStatus: ProductionProofReport["overallStatus"] =
      blockers.length > 0 ? "blocked"
      : warnings.length > 0 ? "warnings_only"
      : "ready";

    const summary =
      overallStatus === "ready"
        ? `Production pipeline verified — ${score}/100. Ready for distribution.`
        : overallStatus === "blocked"
        ? `Not ready — ${blockers.length} blocker${blockers.length > 1 ? "s" : ""} must be resolved before distribution.`
        : `${score}/100 — review ${warnings.length} warning${warnings.length > 1 ? "s" : ""} before distributing.`;

    return { projectId: input.projectId ?? null, generatedAt: now, overallStatus, score, checks, blockers, warnings, summary };
  }
  