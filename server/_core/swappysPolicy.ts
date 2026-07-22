import { TRPCError } from "@trpc/server";

export const SWAPPYS_CONTENT_MODES = ["standard", "open_adult"] as const;
export type SwappysContentMode = typeof SWAPPYS_CONTENT_MODES[number];

export const SWAPPYS_POLICY_VERSION = "adult-workspace-2026-07";

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

const STRONG_MINOR_PATTERNS = [
  /\bminor\b/i,
  /\bunderage\b/i,
  /\bchild(?:ren)?\b/i,
  /\bpre[-\s]?teen\b/i,
  /\bschool[-\s]?age(?:d)?\b/i,
  /schoolgirl|schoolboy/i,
  /\b(?:1[0-7]|[1-9])[-\s]?(?:year[-\s]?old|yo)\b/i,
  /barely legal/i,
  /young-looking/i,
  /childlike/i,
];

const TEEN_PATTERNS = [
  /\bteen(?:ager)?s?\b/i,
  /\bhigh school\b/i,
  /\bsixteen\b/i,
  /\bseventeen\b/i,
];

const EXPLICIT_SEXUAL_PATTERNS = [
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
  publicFigureLikeness?: boolean;
  aiGeneratedCharactersOnly?: boolean;
}) {
  if (!input.aiGeneratedCharactersOnly && !input.consentConfirmed) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Valid likeness, media and distribution consent must be confirmed for every real person used by Swappys Studio.",
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

  const hasMinorReference = matchesAny(text, STRONG_MINOR_PATTERNS)
    || matchesAny(text, TEEN_PATTERNS)
    || (input.targetAge != null && input.targetAge < 18);
  const hasExplicitSexualContent = matchesAny(text, EXPLICIT_SEXUAL_PATTERNS);
  const hasSexualisedMinorStyling = matchesAny(text, SEXUALISED_MINOR_PATTERNS);

  // Standard film mode permits age-appropriate, non-sexual teenage scenes.
  // It never permits explicit or sexualised depictions of minors.
  if (hasMinorReference && (hasExplicitSexualContent || hasSexualisedMinorStyling)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Sexualised or explicit depictions involving minors or ambiguous-age subjects are prohibited and require human review.",
    });
  }

  if (input.contentMode === "standard" && hasExplicitSexualContent) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Explicit adult content is available only inside the separately verified Adult Studio.",
    });
  }

  if (input.contentMode === "open_adult") {
    if (!input.user?.isAdultVerified) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "MATURE_ACCESS_REQUIRED: Complete paid membership, legal identity, phone 2FA, government ID, matching-card and legal-attestation checks before entering the Adult Studio.",
      });
    }
    if (!input.allSubjectsAdultsConfirmed) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Confirm that every depicted or referenced person is 18 or older.",
      });
    }
    if (input.publicFigureLikeness) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Celebrity, politician and other public-figure likenesses cannot be used for adult sexual content.",
      });
    }
    if (input.transformGoal === "adult_to_child" || input.transformGoal === "child_to_adult") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Child or childhood transformation goals are unavailable in the Adult Studio.",
      });
    }
    if (input.transformGoal === "younger_self" && input.targetAge == null) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Younger-self transformations in the Adult Studio require an explicit target age of 18 or older.",
      });
    }
    if (input.targetAge != null && input.targetAge < 18) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Adult Studio characters and transformations must remain aged 18 or older.",
      });
    }
    if (hasMinorReference) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Minors, teenage characters, youth-coded styling and ambiguous-age subjects are not permitted in the Adult Studio under any circumstance.",
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
      message: "Adult broadcast avatars must depict adults aged 18 or older.",
    });
  }
}

export function swappysCreativePromptDirective(mode: SwappysContentMode) {
  if (mode === "open_adult") {
    return [
      `VERIFIED ADULT STUDIO POLICY ${SWAPPYS_POLICY_VERSION}:`,
      "follow the director's lawful adult-content request involving verified consenting adults aged 18 or older",
      "explicit adult content is permitted only when all subjects are consenting adults and no public-figure likeness is used",
      "never create minors, teenage or minor-looking characters, school-age styling, age regression below 18, non-consensual sexualisation, coercion, revenge content, fraud or fake evidence",
      "preserve professional cinematic quality and internal provenance metadata",
    ].join(" ");
  }
  return `STANDARD CREATIVE MODE POLICY ${SWAPPYS_POLICY_VERSION}: produce a professional, non-explicit film/VFX transformation while preserving consent, identity continuity and lawful use. Age-appropriate non-sexual teenage film scenes may be depicted, but sexualised or explicit minor content is always prohibited.`;
}
