// v6.68 — Project Command Center health utility (Phase 2 + Phase 9).
// Derives a single, opinionated health summary for a project using only the
// existing tables. No new DB writes happen here — this is a pure read aggregator
// the Project Command Center surfaces to give users one clear "what's missing
// and what to do next" view.

import * as db from "../db";

export interface NextBestAction {
  key: string;
  label: string;
  href: string;
  reason: string;
}

export interface ProjectHealthSummary {
  story: {
    hasScript: boolean;
    hasLogline: boolean;
    hasPlotSummary: boolean;
    sceneCount: number;
    shotListCoveragePct: number;
  };
  cast: {
    characterCount: number;
    charactersWithDescription: number;
    charactersWithReferenceImages: number;
    consistencyWarnings: string[];
  };
  production: {
    totalScenes: number;
    generatedScenes: number;
    failedScenes: number;
    pendingScenes: number;
    approvedScenes: number;
    estimatedRuntimeSeconds: number;
  };
  postProduction: {
    subtitlesReady: boolean;
    soundtrackReady: boolean;
    creditsReady: boolean;
    colorGradingChosen: boolean;
    exportReady: boolean;
    exportBlockers: string[];
  };
  monetization: {
    creditBalance: number;
    preferredVideoProvider: string | null;
    preferredLlmProvider: string | null;
    providerMode: "byok" | "credits" | "byok-with-fallback" | "unknown";
  };
  nextBestAction: NextBestAction | null;
  isEpisodic: boolean;
}

export async function getProjectHealthSummary(
  projectId: number,
  userId: number,
): Promise<ProjectHealthSummary | null> {
  const project = await db.getProjectById(projectId, userId);
  if (!project) return null;

  // Pull all sibling resources in parallel — every helper already exists.
  const [
    scripts,
    scenes,
    characters,
    locations,
    moodBoard,
    subtitles,
    soundtracks,
    creditsRows,
    creditBalance,
  ] = await Promise.all([
    db.getProjectScripts(projectId).catch(() => [] as any[]),
    db.getProjectScenes(projectId).catch(() => [] as any[]),
    db.getProjectCharacters(projectId).catch(() => [] as any[]),
    db.getProjectLocations(projectId).catch(() => [] as any[]),
    db.getProjectMoodBoard(projectId).catch(() => [] as any[]),
    db.getProjectSubtitles(projectId).catch(() => [] as any[]),
    db.getProjectSoundtracks(projectId).catch(() => [] as any[]),
    db.getProjectCredits(projectId).catch(() => [] as any[]),
    db.getCreditBalance(userId).catch(() => 0),
  ]);

  // ── Story ───────────────────────────────────────────────────────────────
  const hasScript = (scripts as any[]).length > 0;
  const sceneCount = (scenes as any[]).length;
  const scenesWithShotList = (scenes as any[]).filter((s) => {
    const shotList = (s as any)?.shotList;
    if (!shotList) return false;
    if (Array.isArray(shotList) && shotList.length > 0) return true;
    if (typeof shotList === "string" && shotList.trim().length > 0) return true;
    return false;
  }).length;
  const shotListCoveragePct = sceneCount > 0
    ? Math.round((scenesWithShotList / sceneCount) * 100)
    : 0;

  // ── Cast ────────────────────────────────────────────────────────────────
  const charactersWithDescription = (characters as any[]).filter((c) => {
    const desc = (c as any)?.description;
    return typeof desc === "string" && desc.trim().length > 0;
  }).length;
  const charactersWithReferenceImages = (characters as any[]).filter((c) => {
    const ri = (c as any)?.referenceImages;
    return Array.isArray(ri) && ri.length > 0;
  }).length;
  const consistencyWarnings: string[] = [];
  if (characters.length > 0 && charactersWithReferenceImages === 0) {
    consistencyWarnings.push(
      "No characters have reference images — generated frames will drift between scenes.",
    );
  }
  if (characters.length > 0 && charactersWithDescription < characters.length) {
    consistencyWarnings.push(
      `${characters.length - charactersWithDescription} character(s) are missing a description.`,
    );
  }

  // ── Production ──────────────────────────────────────────────────────────
  const sceneStatus = (s: any) => String(s?.status ?? "").toLowerCase();
  const sceneApproval = (s: any) => String(s?.approvalStatus ?? "").toLowerCase();
  const generatedScenes = (scenes as any[]).filter((s) =>
    !!(s.videoUrl || s.generatedUrl || s.outputUrl) || sceneStatus(s) === "completed",
  ).length;
  const failedScenes = (scenes as any[]).filter((s) => sceneStatus(s) === "failed").length;
  const pendingScenes = (scenes as any[]).filter((s) => {
    const st = sceneStatus(s);
    return !st || st === "pending" || st === "draft" || st === "queued";
  }).length;
  const approvedScenes = (scenes as any[]).filter((s) => sceneApproval(s) === "approved").length;
  const estimatedRuntimeSeconds = (scenes as any[]).reduce((sum, s) => {
    const d = (s as any)?.duration;
    if (typeof d === "number" && Number.isFinite(d)) return sum + d;
    return sum + 8; // fallback per scene
  }, 0);

  // ── Post-production ────────────────────────────────────────────────────
  const subtitlesReady = (subtitles as any[]).length > 0;
  const soundtrackReady = (soundtracks as any[]).length > 0;
  const creditsReady = (creditsRows as any[]).length > 0;
  const colorGradingChosen = !!(project as any).colorGrading
    && String((project as any).colorGrading) !== "natural";
  const exportBlockers: string[] = [];
  if (sceneCount === 0) exportBlockers.push("No scenes have been created yet.");
  if (sceneCount > 0 && generatedScenes < sceneCount) {
    exportBlockers.push(`${sceneCount - generatedScenes} scene(s) still need to be generated.`);
  }
  if (sceneCount > 0 && approvedScenes < sceneCount) {
    exportBlockers.push(
      `${sceneCount - approvedScenes} scene(s) are not yet approved for final cut.`,
    );
  }
  if (failedScenes > 0) {
    exportBlockers.push(`${failedScenes} scene(s) failed to generate and need a retry.`);
  }
  const exportReady = exportBlockers.length === 0;

  // ── Monetization ───────────────────────────────────────────────────────
  const userRow: any = await db.getUserById(userId).catch(() => null);
  const preferredVideoProvider = userRow?.preferredVideoProvider ?? null;
  const preferredLlmProvider = userRow?.preferredLlmProvider ?? null;
  const providerMode: ProjectHealthSummary["monetization"]["providerMode"] =
    preferredVideoProvider ? "byok" : "credits";

  // ── Next best action ──────────────────────────────────────────────────
  let nextBestAction: NextBestAction | null = null;
  if (!hasScript) {
    nextBestAction = {
      key: "finish-script",
      label: "Finish your script",
      href: `/projects/${projectId}/script`,
      reason: "No script is attached to this project yet.",
    };
  } else if (characters.length === 0) {
    nextBestAction = {
      key: "add-characters",
      label: "Add characters",
      href: `/projects/${projectId}/characters`,
      reason: "Generated scenes will be inconsistent without defined characters.",
    };
  } else if (sceneCount === 0) {
    nextBestAction = {
      key: "generate-storyboard",
      label: "Generate storyboard",
      href: `/projects/${projectId}/storyboard`,
      reason: "No scenes exist yet — start with a storyboard breakdown.",
    };
  } else if (failedScenes > 0) {
    nextBestAction = {
      key: "retry-failed-scenes",
      label: "Retry failed scenes",
      href: `/projects/${projectId}`,
      reason: `${failedScenes} scene(s) failed and need a retry.`,
    };
  } else if (generatedScenes < sceneCount) {
    nextBestAction = {
      key: "generate-missing-scenes",
      label: "Generate missing scenes",
      href: `/projects/${projectId}`,
      reason: `${sceneCount - generatedScenes} scene(s) still need video generation.`,
    };
  } else if (approvedScenes < sceneCount) {
    nextBestAction = {
      key: "review-scenes",
      label: "Review generated scenes",
      href: `/projects/${projectId}/cutting-room`,
      reason: `${sceneCount - approvedScenes} scene(s) are awaiting your approval.`,
    };
  } else if (!subtitlesReady) {
    nextBestAction = {
      key: "add-subtitles",
      label: "Add subtitles",
      href: `/projects/${projectId}/subtitles`,
      reason: "Subtitles improve accessibility and discoverability.",
    };
  } else if (!creditsReady) {
    nextBestAction = {
      key: "add-credits",
      label: "Add opening / closing credits",
      href: `/projects/${projectId}/credits`,
      reason: "Credits give your film a finished, professional feel.",
    };
  } else if (exportReady) {
    nextBestAction = {
      key: "export-film",
      label: "Export your film",
      href: `/projects/${projectId}/distribute`,
      reason: "Everything is approved — package the film for distribution.",
    };
  }

  return {
    story: {
      hasScript,
      hasLogline: !!(project as any).description && String((project as any).description).trim().length > 0,
      hasPlotSummary: !!(project as any).plotSummary && String((project as any).plotSummary).trim().length > 0,
      sceneCount,
      shotListCoveragePct,
    },
    cast: {
      characterCount: characters.length,
      charactersWithDescription,
      charactersWithReferenceImages,
      consistencyWarnings,
    },
    production: {
      totalScenes: sceneCount,
      generatedScenes,
      failedScenes,
      pendingScenes,
      approvedScenes,
      estimatedRuntimeSeconds,
    },
    postProduction: {
      subtitlesReady,
      soundtrackReady,
      creditsReady,
      colorGradingChosen,
      exportReady,
      exportBlockers,
    },
    monetization: {
      creditBalance,
      preferredVideoProvider,
      preferredLlmProvider,
      providerMode,
    },
    nextBestAction,
    isEpisodic: String((project as any).actStructure ?? "") === "episodic",
  };
}

// Touch moodBoard so the future expansion path stays explicit.
export function _moodBoardCount(items: unknown): number {
  return Array.isArray(items) ? items.length : 0;
}
