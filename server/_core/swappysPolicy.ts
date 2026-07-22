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
  /rape/i,
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
  /\bchild\b/i,
  /\bpreteen\b/i,
  /\bteen(?:ager)?\b/i,
  /schoolgirl|schoolboy/i,
];

const EXPLICIT_LIKENESS_PATTERNS = [
  /porn(?:ographic)?/i,
  /explicit sex/i,
  /graphic sexual/i,
  /sex act/i,
  /genital/i,
  /penetration/i,
  /oral sex/i,
  /masturbat/i,
];

function combinedText(input: {
  targetPresentation?: string | null;
  directorNotes?: string | null;
  consentNotes?: string | null;
}) {
  return [input.targetPresentation, input.directorNotes, input.consentNotes]
    .filter(Boolean)
    .join(" \n ")
    .slice(0, 12_000);
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
  // Open Adult Creative mode is disabled pending real verification of the
  // *depicted* subject's identity and consent -- a self-reported checkbox
  // ("allSubjectsAdultsConfirmed") does not establish either, regardless of
  // age-verification on the requesting account. The mode, its types, and its
  // guardrail patterns below are intentionally left in place for when a real
  // verification path exists; this gate just makes sure nothing can reach it
  // in the meantime. Do not remove this gate without that verification path
  // actually existing first.
  // Compare against a widened copy rather than input.contentMode directly, so
  // TypeScript's control-flow narrowing from this early return doesn't affect
  // the (intentionally preserved, currently unreachable) checks further down.
  const requestedMode: string = input.contentMode;
  if (requestedMode === "open_adult") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Open Adult Creative mode is not currently enabled.",
    });
  }

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

  if (input.contentMode === "open_adult") {
    if (!input.user?.isAdultVerified) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "AGE_VERIFICATION_REQUIRED: Open Adult Creative mode requires verified 18+ status.",
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
        message: "Child or childhood transformation goals are unavailable in Open Adult Creative mode.",
      });
    }
    if (input.targetAge != null && input.targetAge < 18) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Open Adult Creative mode requires a target age of 18 or older.",
      });
    }
    if (matchesAny(text, MINOR_PATTERNS)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Minor-coded subjects or styling are not permitted in Open Adult Creative mode.",
      });
    }
    if (matchesAny(text, EXPLICIT_LIKENESS_PATTERNS)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Explicit sexualised likeness transformation is not supported. Mature, provocative, glamour and adult-industry styling involving consenting adults is permitted, but explicit sex acts are blocked.",
      });
    }
  }

  if (input.broadcast && input.contentMode === "open_adult" && input.targetAge != null && input.targetAge < 18) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Adult broadcast avatars must depict adults aged 18 or older." });
  }
}

export function swappysCreativePromptDirective(mode: SwappysContentMode) {
  if (mode === "open_adult") {
    return "OPEN ADULT CREATIVE MODE: allow mature, provocative, glamour, body-positive and adult-industry visual styling for verified consenting adults without unnecessary modesty filtering. Preserve professional realism and the director's lawful artistic intent. Do not create minors, minor-coded styling, explicit sex acts, non-consensual sexualisation, coercion, deceptive impersonation, fraud or fake evidence.";
  }
  return "STANDARD CREATIVE MODE: produce a professional, non-explicit film/VFX transformation while preserving consent, identity continuity and lawful use.";
}
