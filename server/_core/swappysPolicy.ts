import { TRPCError } from "@trpc/server";

export const SWAPPYS_CONTENT_MODES = ["standard", "open_adult"] as const;
export type SwappysContentMode = typeof SWAPPYS_CONTENT_MODES[number];

export type SwappysCreativePolicyInput = {
  user: {
    isAdultVerified?: boolean | null;
    isFrozen?: boolean | null;
    frozenReason?: string | null;
  } | null;
  contentMode: SwappysContentMode;
  consentConfirmed: boolean;
  aiGeneratedCharactersOnly?: boolean;
  allSubjectsAdultsConfirmed?: boolean;
  publicFigureLikeness?: boolean;
  transformGoal?: string | null;
  targetAge?: number | null;
  targetPresentation?: string | null;
  directorNotes?: string | null;
  consentNotes?: string | null;
  broadcast?: boolean;
};

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

const PUBLIC_FIGURE_PATTERNS = [
  /\bcelebrity\b/i,
  /\bpolitician\b/i,
  /\bpublic figure\b/i,
  /\bfamous (?:actor|actress|singer|athlete|person)\b/i,
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

function policyText(input: SwappysCreativePolicyInput): string {
  return [input.targetPresentation, input.directorNotes, input.consentNotes]
    .filter(Boolean)
    .join(" \n ")
    .slice(0, 12_000)
    // Remove affirmative safety declarations before keyword classification so
    // wording such as "no minors" does not create a false positive.
    .replace(/\bno minors?\b/gi, "")
    .replace(/\bno children\b/gi, "")
    .replace(/\bno public figures?\b/gi, "")
    .replace(/\badults? only\b/gi, "")
    .replace(/\b18\+ only\b/gi, "")
    .replace(/\ball (?:subjects|characters|people) (?:are|must be) 18\+?\b/gi, "")
    .replace(/\bdo not (?:create|depict|include) minors?\b/gi, "")
    .replace(/\bdo not (?:create|depict|include) public figures?\b/gi, "");
}

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

function reject(code: "BAD_REQUEST" | "FORBIDDEN", message: string): never {
  throw new TRPCError({ code, message });
}

/**
 * Canonical server-side Swappys policy gate.
 *
 * This function is intentionally independent of the UI and must be called both
 * when a job is created and immediately before a worker submits it to a provider.
 */
export function assertSwappysCreativePolicy(
  input: SwappysCreativePolicyInput,
): void {
  if (!SWAPPYS_CONTENT_MODES.includes(input.contentMode)) {
    reject("FORBIDDEN", "Unsupported Swappys creative workspace.");
  }

  if (input.user?.isFrozen) {
    reject(
      "FORBIDDEN",
      input.user.frozenReason || "This account is not permitted to create or broadcast media.",
    );
  }

  if (!input.aiGeneratedCharactersOnly && !input.consentConfirmed) {
    reject(
      "BAD_REQUEST",
      "Actor likeness, media and distribution consent must be confirmed before using Swappys Studio.",
    );
  }

  const text = policyText(input);
  const hasNonConsensualContent = matchesAny(text, NON_CONSENSUAL_PATTERNS);
  const hasDeceptiveContent = matchesAny(text, DECEPTION_PATTERNS);
  const hasMinorReference = matchesAny(text, MINOR_PATTERNS)
    || (input.targetAge != null && input.targetAge < 18);
  const hasExplicitContent = matchesAny(text, EXPLICIT_PATTERNS);
  const hasSexualisedMinorContext = matchesAny(text, SEXUALISED_MINOR_PATTERNS);
  const hasPublicFigureReference = Boolean(input.publicFigureLikeness)
    || matchesAny(text, PUBLIC_FIGURE_PATTERNS);

  if (hasNonConsensualContent) {
    reject(
      "FORBIDDEN",
      "Swappys does not permit non-consensual sexualisation, covert recording, coercion, blackmail or revenge content.",
    );
  }

  if (hasDeceptiveContent) {
    reject(
      "FORBIDDEN",
      "Swappys cannot be used for fraud, deceptive impersonation, fake evidence or verification bypass.",
    );
  }

  // Age-appropriate, non-sexual teenage film scenes are not automatically
  // prohibited. Sexualised or explicit depictions involving minors always are.
  if (hasMinorReference && (hasExplicitContent || hasSexualisedMinorContext)) {
    reject(
      "FORBIDDEN",
      "Sexualised or explicit depictions involving minors are prohibited under every film rating and creative mode.",
    );
  }

  if (input.contentMode === "standard") {
    if (hasExplicitContent) {
      reject(
        "FORBIDDEN",
        "Explicit sexual acts and genital-focused output are not available in Standard Studio. Use film-rating-appropriate, non-explicit direction.",
      );
    }

    if (input.broadcast) {
      const minimumBroadcastAge = 16;
      if (input.transformGoal === "adult_to_child") {
        reject(
          "FORBIDDEN",
          "Child-transform avatars are not permitted in live Broadcast.",
        );
      }
      if (input.targetAge != null && input.targetAge < minimumBroadcastAge) {
        reject(
          "FORBIDDEN",
          `Standard broadcast avatars must depict a person aged ${minimumBroadcastAge} or older.`,
        );
      }
      if (input.transformGoal === "younger_self" && input.targetAge == null) {
        reject(
          "BAD_REQUEST",
          `Younger-self broadcasts require an explicit target age of ${minimumBroadcastAge} or older.`,
        );
      }
    }
    return;
  }

  // Verified 18+ Production Studio.
  if (!input.user?.isAdultVerified) {
    reject(
      "FORBIDDEN",
      "MATURE_ACCESS_REQUIRED: Complete paid membership, verified government identity, phone 2FA and matching-card verification before entering the Verified 18+ Studio.",
    );
  }

  if (!input.allSubjectsAdultsConfirmed) {
    reject(
      "BAD_REQUEST",
      "Confirm that every depicted and referenced person is 18 or older.",
    );
  }

  if (hasPublicFigureReference) {
    reject(
      "FORBIDDEN",
      "Celebrity, politician and other public-figure likenesses are not permitted in the Verified 18+ Studio.",
    );
  }

  if (
    input.transformGoal === "adult_to_child"
    || input.transformGoal === "child_to_adult"
  ) {
    reject(
      "FORBIDDEN",
      "Child or childhood transformation goals are unavailable in the Verified 18+ Studio.",
    );
  }

  if (input.targetAge == null || input.targetAge < 18) {
    reject(
      "FORBIDDEN",
      "The Verified 18+ Studio requires an explicit target age of 18 or older.",
    );
  }

  if (hasMinorReference) {
    reject(
      "FORBIDDEN",
      "Minor-coded subjects, youth-coded styling or ambiguous-age presentation are not permitted in the Verified 18+ Studio.",
    );
  }

  if (hasExplicitContent) {
    reject(
      "FORBIDDEN",
      "Explicit sexual acts or genital-focused content are not supported. Verified adult editorial, glamour and mature production styling may be directed, but pornographic output remains blocked.",
    );
  }

  if (input.broadcast && input.targetAge < 18) {
    reject(
      "FORBIDDEN",
      "Verified 18+ broadcast avatars must depict adults aged 18 or older.",
    );
  }
}

export function swappysCreativePromptDirective(
  mode: SwappysContentMode,
): string {
  if (mode === "open_adult") {
    return "VERIFIED 18+ PRODUCTION MODE: support lawful mature editorial, glamour, body-positive and adult-industry production styling involving verified consenting adults. Preserve professional realism and the director's lawful artistic intent. Do not create explicit sexual acts, genital-focused imagery, pornography, minors, minor-coded styling, age regression below 18, public-figure sexualisation, non-consensual sexualisation, coercion, deceptive impersonation, fraud or fake evidence.";
  }

  return "STANDARD CREATIVE MODE: produce a professional, film-rating-appropriate, non-explicit film/VFX transformation while preserving consent, identity continuity and lawful use. Age-appropriate, non-sexual teenage story scenes may be depicted, but sexualised or explicit minor content is always prohibited.";
}
