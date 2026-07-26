export type JourneyStageMeta = {
  key: "preproduction" | "production" | "postproduction" | "funding";
  number: number;
  title: string;
  blurb: string;
  hrefFor: (projectId: number | string) => string;
};

export const JOURNEY_STAGES: JourneyStageMeta[] = [
  {
    key: "preproduction",
    number: 1,
    title: "Pre-Production",
    blurb: "Concept, script, casting, locations, budget, schedule and production planning",
    hrefFor: (id) => `/projects/${id}/pre-production`,
  },
  {
    key: "production",
    number: 2,
    title: "Production",
    blurb: "Generate, review and lock scenes, performances, sound and continuity",
    hrefFor: (id) => `/projects/${id}/multi-shot`,
  },
  {
    key: "postproduction",
    number: 3,
    title: "Post-Production",
    blurb: "Edit, VFX, colour, sound, dubbing, accessibility, masters and promotion",
    hrefFor: (id) => `/projects/${id}/cutting-room`,
  },
  {
    key: "funding",
    number: 4,
    title: "Funding",
    blurb: "Funding matches, applications, pitch materials, crowdfunding and incentives",
    hrefFor: () => "/funding",
  },
];

export function getStage(n: number): JourneyStageMeta | undefined {
  return JOURNEY_STAGES.find((stage) => stage.number === n);
}

export function getNextStage(n: number): JourneyStageMeta | undefined {
  return JOURNEY_STAGES.find((stage) => stage.number === n + 1);
}

/**
 * Maps legacy eight-stage page markers into the four-stage production model.
 * Existing feature pages can continue passing their old stage number while the
 * user-facing journey remains Pre-Production, Production, Post-Production and Funding.
 */
export function normaliseLegacyJourneyStage(n: number): number {
  if (n >= 1 && n <= 4) return 1;
  if (n === 5) return 4;
  if (n === 6) return 2;
  if (n === 7 || n === 8) return 3;
  return Math.min(4, Math.max(1, n));
}

/**
 * Lightweight project-stage detector for project cards. Funding completion is
 * not available in the project-list payload, so completed projects stop at
 * Post-Production rather than falsely claiming that funding is complete.
 */
export function computeProjectStage(project: {
  status?: string | null;
  logline?: string | null;
}): number {
  if (!project) return 1;
  if (project.status === "completed") return 3;
  if (project.status === "generating") return 2;
  return 1;
}
