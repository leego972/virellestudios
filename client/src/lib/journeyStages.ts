export type JourneyStageMeta = {
  key: string;
  number: number;
  title: string;
  blurb: string;
  hrefFor: (projectId: number | string) => string;
};

export const JOURNEY_STAGES: JourneyStageMeta[] = [
  {
    key: "idea",
    number: 1,
    title: "Idea & Pitch",
    blurb: "Logline, treatment, lookbook, pitch deck",
    hrefFor: (id) => `/projects/${id}/pitch-lab`,
  },
  {
    key: "characters",
    number: 2,
    title: "Casting Studio",
    blurb: "Photo or description → consistent screen-ready actor",
    hrefFor: (id) => `/projects/${id}/casting-board`,
  },
  {
    key: "script",
    number: 3,
    title: "Writer's Room",
    blurb: "Script, scene cards, dialogue, beat sheet",
    hrefFor: (id) => `/projects/${id}/script`,
  },
  {
    key: "preprod",
    number: 4,
    title: "Production Office",
    blurb: "Breakdown, schedule, budget, locations, call sheet",
    hrefFor: (id) => `/projects/${id}/production-office`,
  },
  {
    key: "funding",
    number: 5,
    title: "Funding Office",
    blurb: "Apply to 130+ funders worldwide, track decisions",
    hrefFor: (id) => `/projects/${id}/crowdfunding`,
  },
  {
    key: "production",
    number: 6,
    title: "Soundstage",
    blurb: "Generate scenes with continuity locked across shots",
    hrefFor: (id) => `/projects/${id}/multi-shot`,
  },
  {
    key: "post",
    number: 7,
    title: "Cutting Room",
    blurb: "Edit, color, sound, captions, master export",
    hrefFor: (id) => `/projects/${id}/cutting-room`,
  },
  {
    key: "release",
    number: 8,
    title: "Release & Promote",
    blurb: "Trailer, social cuts, festivals, paid campaigns",
    hrefFor: (id) => `/projects/${id}/press-kit`,
  },
];

export function getStage(n: number): JourneyStageMeta | undefined {
  return JOURNEY_STAGES.find((s) => s.number === n);
}

export function getNextStage(n: number): JourneyStageMeta | undefined {
  return JOURNEY_STAGES.find((s) => s.number === n + 1);
}

/**
 * Heuristic current-stage detector based on lightweight project signals.
 * Used in dashboard tiles where we don't want to fetch full per-project
 * signals (characters list, scene list, etc.) just to render a badge.
 */
export function computeProjectStage(p: {
  status?: string | null;
  logline?: string | null;
}): number {
  if (!p) return 1;
  if (p.status === "completed") return 8;
  if (p.status === "generating") return 6;
  if ((p.logline ?? "").toString().trim()) return 2;
  return 1;
}
