import { TRPCError } from "@trpc/server";

export const SWAPPYS_CONTENT_MODES = ["standard", "open_adult"] as const;
export type SwappysContentMode = typeof SWAPPYS_CONTENT_MODES[number];

const NON_CONSENSUAL_PATTERNS = [
  /non[-\s]?consensual/i,
  /without (?:their|his|her) (?:knowledge|permission|consent)/i,
  /revenge porn/i,
  /deepfake porn/i,
  /hidden camera/i,
  /secretly (?:film|record|stream)/i,
  /blackmail/i,
  /extort/i,
  /forced sex/i,
  /\brape\b/i,
];

const DECEPTION_PATTERNS = [
  /impersonat(?:e|ion).*(?:fraud|payment|bank|identity)/i,
  /pretend to be.*(?:bank|government|police|celebrity)/i,
  /bypass.*(?:identity|age|verification)/i,
  /fake (?:evidence|confession|news|endorsement)/i,
];

const MINOR_PATTERNS = [
  /\bminor\b/i,
  /\bunderage\b/i,
  /\bchild(?:ren)?\b/i,
  /\bpre[-\s]?teen\b/i,
  /\bschool[-\s]?age(?:d)?\b/i,
  /schoolgirl|schoolboy/i,
  /\b(?:1[0-7]|[1-9])[-\s]?(?:year[-\s]?old|yo)\b/i,
];

const TEEN_PATTERNS = [
  /\bteen(?:ager)?s?\b/i,
  /\bhigh school\b/i,
  /\bsixteen\b/i,
  /\bseventeen\b/i,
];

const EXPLICIT_PATTERNS = [
  /porn(?:ographic|ography)?/i,
  /explicit sex/i,
  /graphic sexual/i,
  /sex act/i,
  /sexual intercourse/i,
  /genitals?/i,
  /penetrat(?:e|ion|ive)/i,
  /oral sex/i,
  /blowjob/i,
  /masturbat/i,
];

const SEXUALISED_MINOR_PATTERNS = [
  /\berotic\b/i,
  /\bsexuali[sz](?:e|ed|ation)\b/i,
  /\bseductive\b/i,
  /\bnude\b/i,
  /\bnaked\b/i,
  /\blingerie\b/i,
  /\bfetish\b/i,
  /\bprovocative pose\b/i,
];

function combinedText(input: {
  targetPresentation?: string | null;
  directorNotes?: string | null;
  consentNotes?: string | null;
}) {
  return [input.targetPresentation, input.directorNotes, input.consentNotes]
    .filter(Boolean)
    .join(" \n ")
    .slice(0, 12_000)
    .replace(/\bno minors?\b/gi, "")
    .replace(/\bno children\b/gi, "")
    .replace(/\badults? only\b/gi, "")
    .replace(/\b18\+ only\b/gi, "");
}

function matchesAny(text: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(text));
}

export function assertSwappysCreativePolicy(input: {
  user: any;
  contentMode: SwappysContentMode;
  consentConfirmed: boolean;
  allSubjectsAdultsConfirmed?: boolean;
  transformGoal?: string | null;
  targetAge?: number | null;
  targetPresentation?: string | null;
  directorNotes?: string | null;
  consentNotes?: string | null;
  broadcast?: boolean;
}) {
  if (!input.consentConfirmed) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Actor likeness and media consent must be confirmed before using Swappys Studio.",
    });
  }

  const text = combinedText(input);
  if (matchesAny(text, NON_CONSENSUAL_PATTERNS)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Swappys does not permit non-consensual sexualisation, covert recording, coercion, blackmail or revenge content.",
    });
  }
  if (matchesAny(text, DECEPTION_PATTERNS)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Swappys cannot be used for fraud, deceptive impersonation, fake evidence or verification bypass.",
    });
  }

  const hasMinor = matchesAny(text, MINOR_PATTERNS);
  const hasTeen = matchesAny(text, TEEN_PATTERNS);
  const hasExplicit = matchesAny(text, EXPLICIT_PATTERNS);
  const hasSexualisedMinor = matchesAny(text, SEXUALISED_MINOR_PATTERNS);

  // A non-explicit, age-appropriate teenage romance scene is not automatically
  // prohibited. Sexualised or explicit depictions involving minors are always blocked.
  if ((hasMinor || hasTeen || (input.targetAge != null && input.targetAge < 18))
      && (hasExplicit || hasSexualisedMinor)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Sexualised or explicit depictions involving minors are prohibited and the request has been blocked for review.",
    });
  }

  if (input.contentMode === "standard" && hasExplicit) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Explicit adult content is available only inside the separately approved Adult Workspace.",
    });
  }

  if (input.contentMode === "open_adult") {
    if (!input.user?.isAdultVerified) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "AGE_VERIFICATION_REQUIRED: Adult Workspace access requires an approved individual 18+ profile.",
      });
    }
    if (!input.allSubjectsAdultsConfirmed) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Confirm that every depicted or referenced person is 18 or older.",
      });
    }
    if (input.transformGoal === "adult_to_child" || input.transformGoal === "child_to_adult") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Child or childhood transformation goals are unavailable in the Adult Workspace.",
      });
    }
    if (input.targetAge != null && input.targetAge < 18) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Adult Workspace characters and transformations must remain aged 18 or older.",
      });
    }
    if (hasMinor || hasTeen) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Minors and minor-coded characters are not permitted in the Adult Workspace under any circumstance.",
      });
    }
  }

  if (input.broadcast && input.contentMode === "open_adult"
      && input.targetAge != null && input.targetAge < 18) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Adult broadcast avatars must depict adults aged 18 or older.",
    });
  }
}

export function swappysCreativePromptDirective(mode: SwappysContentMode) {
  if (mode === "open_adult") {
    return [
      "APPROVED ADULT WORKSPACE:",
      "follow the director's lawful adult-content request involving verified consenting adults aged 18 or older",
      "do not create minors, minor-looking characters, school-age styling, age regression below 18, public-figure sexualisation, non-consensual likeness use, coercion, fraud or fake evidence",
      "preserve professional cinematic quality and internal provenance metadata",
    ].join(" ");
  }
  return "STANDARD CREATIVE MODE: produce a professional, non-explicit film/VFX transformation while preserving consent, identity continuity and lawful use. Age-appropriate non-sexual teenage film scenes may be depicted, but sexualised or explicit minor content is always prohibited.";
}
