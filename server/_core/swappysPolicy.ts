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
  /\bteen(?:ager)?s?\b/i,
  /\bhigh school\b/i,
  /\bschool[-\s]?age(?:d)?\b/i,
  /schoolgirl|schoolboy/i,
  /\b(?:1[0-7]|[1-9])[-\s]?(?:year[-\s]?old|yo)\b/i,
  /barely legal/i,
  /young-looking/i,
  /childlike/i,
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
  /cunnilingus/i,
  /masturbat/i,
  /ejaculat/i,
  /cumshot/i,
];

const SEXUALISED_MINOR_PATTERNS = [
  /\berotic\b/i,
  /\bsexuali[sz](?:e|ed|ation)\b/i,
  /\bseductive\b/i,
  /\bnude\b/i,
  /\bnaked\b/i,
  /\blingerie\b/i,
  /\bstrip(?:ping|tease)?\b/i,
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
    .replace(/\b18\+ only\b/gi, "")
    .replace(/\ball (?:subjects|characters|people) (?:are|must be) 18\+?\b/gi, "")
    .replace(/\bdo not (?:create|depict|include) minors?\b/gi, "");
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

  const hasMinorReference = matchesAny(text, MINOR_PATTERNS)
    || (input.targetAge != null && input.targetAge < 18);
  const hasExplicitContent = matchesAny(text, EXPLICIT_PATTERNS);
  const hasSexualisedMinorContext = matchesAny(text, SEXUALISED_MINOR_PATTERNS);

  // Age-appropriate, non-sexual teenage film scenes are not automatically
  // prohibited. Sexualised or explicit depictions involving minors always are.
  if (hasMinorReference && (hasExplicitContent || hasSexualisedMinorContext)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Sexualised or explicit depictions involving minors are prohibited under every film rating and creative mode.",
    });
  }

  if (input.contentMode === "standard" && hasExplicitContent) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Explicit sexual acts and genital-focused output are not available in Standard Studio. Use film-rating-appropriate, non-explicit direction.",
    });
  }

  if (input.contentMode === "open_adult") {
    if (!input.user?.isAdultVerified) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "MATURE_ACCESS_REQUIRED: Complete paid membership, identity, phone 2FA and matching-card verification before entering the 18+ Studio.",
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
        message: "Child or childhood transformation goals are unavailable in the 18+ Studio.",
      });
    }
    if (input.targetAge != null && input.targetAge < 18) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "The 18+ Studio requires a target age of 18 or older.",
      });
    }
    if (hasMinorReference) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Minor-coded subjects, youth-coded styling or ambiguous-age presentation are not permitted in the 18+ Studio.",
      });
    }
    if (hasExplicitContent) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Explicit sexual acts or genital-focused content are not supported. Verified adult editorial, glamour and mature production styling may be directed, but pornographic output remains blocked.",
      });
    }
  }

  if (
    input.broadcast
    && input.contentMode === "open_adult"
    && input.targetAge != null
    && input.targetAge < 18
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "18+ broadcast avatars must depict adults aged 18 or older.",
    });
  }
}

export function swappysCreativePromptDirective(mode: SwappysContentMode) {
  if (mode === "open_adult") {
    return "VERIFIED 18+ PRODUCTION MODE: support lawful mature editorial, glamour, body-positive and adult-industry production styling involving verified consenting adults. Preserve professional realism and the director's lawful artistic intent. Do not create explicit sexual acts, genital-focused imagery, pornography, minors, minor-coded styling, age regression below 18, non-consensual sexualisation, coercion, deceptive impersonation, fraud or fake evidence.";
  }
  return "STANDARD CREATIVE MODE: produce a professional, film-rating-appropriate, non-explicit film/VFX transformation while preserving consent, identity continuity and lawful use. Age-appropriate, non-sexual teenage story scenes may be depicted, but sexualised or explicit minor content is always prohibited.";
}
