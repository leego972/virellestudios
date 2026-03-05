/**
 * Minor Protection Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * Automatically detects when a scene involves a minor character and injects
 * cinematic modesty directives into the AI image/video generation prompt.
 *
 * The system works in two layers:
 *
 * Layer 1 — Character Age Detection
 *   Reads the character's ageRange field and classifies them as a minor
 *   (under 18) if any minor-indicating age descriptor is found.
 *
 * Layer 2 — Scene Context Analysis
 *   Analyses the scene description, location type, and action description
 *   for sensitive contexts (shower, bath, beach, changing, swimming, etc.)
 *   and applies the appropriate cinematic modesty treatment.
 *
 * Modesty Treatments (all cinematically elegant, never crude):
 *   - Shower/Bath     → Dense steam, heavy fog, frosted glass, above-shoulder
 *   - Beach/Pool/Swim → Age-appropriate swimwear, wide establishing shots,
 *                       waist-up framing, focus on faces and environment
 *   - Changing/Dress  → Towel/robe coverage, back-turned framing, room divider,
 *                       camera focused on face/reaction
 *   - Sleeping        → Fully covered in bedding, modest nightwear
 *   - Medical/Sport   → Appropriate coverage, clinical/athletic framing
 *   - General         → Conservative wardrobe enforcement, no suggestive framing
 *
 * This engine NEVER blocks a scene — it only modifies the prompt to ensure
 * the output is appropriate. Directors can still film any story involving
 * minors (coming-of-age, family drama, etc.) with full cinematic quality.
 */

// ─── Age Classification ───────────────────────────────────────────────────────

/**
 * Minor age descriptors — any character whose ageRange contains one of these
 * terms is classified as a minor and receives automatic protection.
 */
const MINOR_AGE_INDICATORS = [
  "baby", "infant", "toddler", "child", "kid", "children",
  "pre-teen", "preteen", "tween",
  "teen", "teenager", "teenage", "adolescent",
  "young adult", // treat as borderline — apply soft protection
  "12", "13", "14", "15", "16", "17",
  "years old", // catches "15 years old" etc.
  "year old",
  "juvenile", "youth", "minor",
  "boy", "girl", // only when combined with young context
  "elementary", "middle school", "high school",
];

const STRICT_MINOR_INDICATORS = [
  "baby", "infant", "toddler", "child", "kid", "children",
  "pre-teen", "preteen", "tween",
  "12", "13", "14", "15",
  "juvenile", "youth", "minor",
  "elementary", "middle school",
];

export type AgeClassification = "minor" | "borderline_minor" | "adult" | "unknown";

export function classifyAge(ageRange: string | null | undefined): AgeClassification {
  if (!ageRange) return "unknown";
  const lower = ageRange.toLowerCase();

  // Strict minors (under 16)
  if (STRICT_MINOR_INDICATORS.some(ind => lower.includes(ind))) {
    return "minor";
  }

  // Teens 16-17 or borderline
  if (
    lower.includes("teen") || lower.includes("teenager") || lower.includes("teenage") ||
    lower.includes("adolescent") || lower.includes("16") || lower.includes("17") ||
    lower.includes("high school")
  ) {
    return "minor";
  }

  // Young adult — borderline, apply soft protection
  if (lower.includes("young adult") || lower.includes("18") || lower.includes("19")) {
    return "borderline_minor";
  }

  return "adult";
}

// ─── Sensitive Scene Context Detection ───────────────────────────────────────

type SensitiveContext =
  | "shower_bath"
  | "beach_pool_swim"
  | "changing_dressing"
  | "sleeping"
  | "medical_exam"
  | "sports_locker"
  | "intimate_scene"
  | "none";

const CONTEXT_KEYWORDS: Record<SensitiveContext, string[]> = {
  shower_bath: [
    "shower", "bath", "bathtub", "bathing", "washing", "soap", "shampoo",
    "steam room", "sauna", "hot tub", "jacuzzi", "washing hair",
  ],
  beach_pool_swim: [
    "beach", "pool", "swimming", "swim", "swimwear", "bikini", "swimsuit",
    "ocean", "lake", "river", "waterpark", "water park", "surfing",
    "diving", "snorkeling", "sunbathing", "poolside",
  ],
  changing_dressing: [
    "changing", "getting dressed", "undressing", "changing room", "locker room",
    "dressing room", "putting on clothes", "taking off", "wardrobe change",
    "getting undressed", "changing clothes",
  ],
  sleeping: [
    "sleeping", "asleep", "waking up", "bedroom", "in bed", "nighttime",
    "pajamas", "nightgown", "sleepwear",
  ],
  medical_exam: [
    "medical exam", "doctor", "hospital", "examination", "physical exam",
    "checkup", "check-up", "clinic",
  ],
  sports_locker: [
    "locker room", "changing room", "gym", "after game", "after practice",
    "sports changing",
  ],
  intimate_scene: [
    "romantic", "kissing", "intimate", "love scene", "romance", "date",
    "cuddle", "embrace", "hug",
  ],
  none: [],
};

function detectSensitiveContext(
  sceneText: string,
  locationType?: string | null,
  actionDescription?: string | null
): SensitiveContext {
  const combined = [sceneText, locationType, actionDescription]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  for (const [context, keywords] of Object.entries(CONTEXT_KEYWORDS)) {
    if (context === "none") continue;
    if (keywords.some(kw => combined.includes(kw))) {
      return context as SensitiveContext;
    }
  }
  return "none";
}

// ─── Modesty Directive Builder ────────────────────────────────────────────────

/**
 * Returns an array of prompt directives to inject into the scene prompt
 * to ensure the minor character is depicted with full cinematic modesty.
 */
function buildModestyDirectives(
  context: SensitiveContext,
  characterName: string,
  ageClassification: AgeClassification
): string[] {
  const directives: string[] = [];
  const isStrict = ageClassification === "minor";

  switch (context) {
    case "shower_bath":
      directives.push(
        `MINOR PROTECTION ACTIVE for ${characterName}: Dense billowing steam fills the bathroom completely obscuring the body, heavy fog effect, frosted glass shower screen, camera framed exclusively above the shoulders showing only face and upper neck, thick steam clouds creating an ethereal soft-focus atmosphere, warm golden steam light, cinematic and elegant — absolutely no body visible below the neck`
      );
      if (isStrict) {
        directives.push(
          `[MANDATORY] Camera angle: extreme close-up on face only OR wide shot of steam-filled room with silhouette completely obscured by fog. No body outline visible whatsoever.`
        );
      }
      break;

    case "beach_pool_swim":
      directives.push(
        `MINOR PROTECTION ACTIVE for ${characterName}: ${characterName} is wearing age-appropriate full-coverage swimwear (one-piece swimsuit or board shorts and rash guard), camera framed from waist-up or as a wide establishing shot showing the full beach/pool environment, focus on the character's face and expression, joyful and innocent summer atmosphere`
      );
      if (isStrict) {
        directives.push(
          `[MANDATORY] Wide shot only — character shown as part of the environment, not the subject of a close-up. Full coverage swimwear visible. No suggestive framing.`
        );
      }
      break;

    case "changing_dressing":
      directives.push(
        `MINOR PROTECTION ACTIVE for ${characterName}: Camera positioned behind ${characterName} showing only their back, OR ${characterName} is fully wrapped in a large towel or robe, OR camera focused on ${characterName}'s face/expression in a mirror reflection while the body is off-frame, room divider or curtain providing coverage, tasteful and modest framing at all times`
      );
      if (isStrict) {
        directives.push(
          `[MANDATORY] Character must be fully covered at all times. Use towel, robe, or back-to-camera framing. No skin visible below the collarbone.`
        );
      }
      break;

    case "sleeping":
      directives.push(
        `MINOR PROTECTION ACTIVE for ${characterName}: ${characterName} is fully covered by bedding/blankets up to the shoulders, wearing modest age-appropriate sleepwear (pajamas, t-shirt), camera framed on face and upper body only, peaceful and innocent atmosphere`
      );
      break;

    case "medical_exam":
      directives.push(
        `MINOR PROTECTION ACTIVE for ${characterName}: ${characterName} is wearing a full medical gown providing complete coverage, clinical and professional medical setting, camera focused on the doctor-patient interaction and facial expressions, no exposure of skin beyond hands and face`
      );
      break;

    case "sports_locker":
      directives.push(
        `MINOR PROTECTION ACTIVE for ${characterName}: Camera shows ${characterName} already fully dressed in sports uniform or street clothes, locker room shown as a social environment with conversation, no changing in progress, focus on team camaraderie and dialogue`
      );
      break;

    case "intimate_scene":
      directives.push(
        `MINOR PROTECTION ACTIVE for ${characterName}: All romantic or intimate content involving ${characterName} is depicted in a completely age-appropriate manner — hand-holding, innocent smiles, playful interaction only. No kissing, no physical intimacy. Camera maintains respectful distance. Scene depicts innocent youthful connection.`
      );
      break;

    case "none":
    default:
      // General protection — enforce conservative framing
      directives.push(
        `MINOR PROTECTION ACTIVE for ${characterName}: ${characterName} is depicted in age-appropriate clothing with conservative framing. Camera maintains respectful distance appropriate for a minor character. No suggestive angles or framing.`
      );
      break;
  }

  return directives;
}

// ─── Main Export: Apply Minor Protection to a Scene Prompt ───────────────────

export interface MinorProtectionResult {
  promptAdditions: string[];
  negativePromptAdditions: string[];
  minorsDetected: Array<{
    name: string;
    ageRange: string;
    classification: AgeClassification;
    context: SensitiveContext;
  }>;
  hasMinors: boolean;
}

export function applyMinorProtection(
  sceneDescription: string,
  locationType: string | null | undefined,
  actionDescription: string | null | undefined,
  characters: Array<{
    name: string;
    ageRange?: string | null;
  }>
): MinorProtectionResult {
  const promptAdditions: string[] = [];
  const negativePromptAdditions: string[] = [];
  const minorsDetected: MinorProtectionResult["minorsDetected"] = [];

  for (const character of characters) {
    const classification = classifyAge(character.ageRange);

    if (classification === "adult" || classification === "unknown") {
      continue; // No protection needed
    }

    const context = detectSensitiveContext(
      sceneDescription,
      locationType,
      actionDescription
    );

    minorsDetected.push({
      name: character.name,
      ageRange: character.ageRange || "unknown",
      classification,
      context,
    });

    const directives = buildModestyDirectives(context, character.name, classification);
    promptAdditions.push(...directives);
  }

  // Build negative prompt additions for all minor scenes
  if (minorsDetected.length > 0) {
    negativePromptAdditions.push(
      "nudity, partial nudity, exposed skin, revealing clothing, suggestive pose, suggestive framing, sexual content, inappropriate content involving minors, bikini on minor, underwear on minor"
    );
  }

  return {
    promptAdditions,
    negativePromptAdditions,
    minorsDetected,
    hasMinors: minorsDetected.length > 0,
  };
}

// ─── Utility: Check if any character in a scene is a minor ───────────────────
export function sceneHasMinors(characters: Array<{ ageRange?: string | null }>): boolean {
  return characters.some(c => {
    const cls = classifyAge(c.ageRange);
    return cls === "minor" || cls === "borderline_minor";
  });
}
