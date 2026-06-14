/**
 * Extended Scene Generator — Clip Chaining for Industry-Standard Scene Lengths
 * 
 * The core problem: AI video models generate 5-20 second clips per API call.
 * Industry-standard scenes run 30 seconds to 3+ minutes.
 * 
 * Solution: Chain multiple clips per scene with continuity:
 * 1. Break each scene into sub-shots (each ~15s, matching provider maximums)
 * 2. Use the last frame of clip N as the first frame reference for clip N+1
 * 3. Vary camera angles and movements within the scene for cinematic feel
 * 4. Stitch sub-clips into a single scene video
 * 
 * Architecture for a 90-minute film:
 * - 60-90 scenes (avg 60-90 seconds each)
 * - Each scene = 4-6 sub-clips of 15 seconds (provider-capped to 10-20s)
 * - Total clips: ~300-540 clips
 * - Generation time: depends on provider speed
 * 
 * Scene duration is fully user-controlled with no artificial cap.
 * Providers internally cap each clip to their own maximum (10-20s).
 */

import { generateVideo as generateBYOKVideo, selectProvider, type UserApiKeys, type VideoGenerationRequest, type VideoGenerationResult } from "./byokVideoEngine";
import { buildNegativePrompt } from "./cinematicPromptEngine";
import { storagePut } from "../storage";
import { execFile } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const execFileAsync = promisify(execFile);

// ─── Sentinel Resolution Helpers ───
// Runway and Veo 3 return async sentinels that need polling to get the real video URL.

async function pollRunwaySentinel(apiKey: string, taskId: string): Promise<string> {
  const RunwayML = (await import("@runwayml/sdk")).default;
  const client = new RunwayML({ apiKey });
  const MAX_WAIT_MS = 15 * 60 * 1000; // 15 minutes
  const POLL_INTERVAL_MS = 10_000;    // 10 seconds
  const startTime = Date.now();
  console.log(`[ExtendedScene] Polling Runway task ${taskId}...`);
  while (Date.now() - startTime < MAX_WAIT_MS) {
    // Wrap each SDK call in a race against a 30s timeout to prevent hung connections
    const task = await Promise.race([
      (client as any).tasks.retrieve(taskId),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Runway tasks.retrieve timed out after 30s")), 30_000)
      ),
    ]);
    const status = task.status as string;
    if (status === "SUCCEEDED" || status === "succeeded") {
      const videoUrl = task.output?.[0] || task.output?.video || task.output;
      if (videoUrl && typeof videoUrl === "string") {
        // Download and re-upload to S3 for permanent storage
        const resp = await fetch(videoUrl, { signal: AbortSignal.timeout(120_000) });
        if (!resp.ok) throw new Error(`Failed to download Runway video: ${resp.status}`);
        const buffer = Buffer.from(await resp.arrayBuffer());
        const key = `scenes/runway-${taskId}-${Date.now()}.mp4`;
        let url: string;
        try {
          const result = await storagePut(key, buffer, "video/mp4");
          url = result.url;
        } catch (storageErr: any) {
          console.warn(`[ExtendedScene] Storage unavailable for Runway video (${storageErr.message}), using raw CDN URL`);
          url = videoUrl;
        }
        console.log(`[ExtendedScene] Runway task ${taskId} completed: ${url}`);
        return url;
      }
      throw new Error(`Runway task succeeded but no video URL in output: ${JSON.stringify(task).substring(0, 200)}`);
    }
    if (status === "FAILED" || status === "failed") {
      throw new Error(`Runway task ${taskId} failed: ${JSON.stringify(task.failure || task.error || task).substring(0, 200)}`);
    }
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  throw new Error(`Runway task ${taskId} timed out after 15 minutes`);
}

async function pollVeo3Sentinel(apiKey: string, operationName: string): Promise<string> {
  const MAX_WAIT_MS = 20 * 60 * 1000; // 20 minutes
  const POLL_INTERVAL_MS = 15_000;    // 15 seconds
  const startTime = Date.now();
  console.log(`[ExtendedScene] Polling Veo 3 operation ${operationName}...`);
  while (Date.now() - startTime < MAX_WAIT_MS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/${operationName}?key=${apiKey}`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (resp.ok) {
      const data = await resp.json() as any;
      if (data.done) {
        if (data.error) throw new Error(`Veo 3 operation failed: ${data.error?.message || JSON.stringify(data.error)}`);
        const generatedVideos = data.response?.generateVideoResponse?.generatedSamples
          || data.response?.videos || data.response?.generatedVideos || [];
        const videoUri = generatedVideos[0]?.video?.uri || generatedVideos[0]?.uri || generatedVideos[0]?.videoUri;
        if (!videoUri) throw new Error(`Veo 3 operation succeeded but no video URI: ${JSON.stringify(data.response).substring(0, 300)}`);
        // Download and re-upload to S3
        const downloadUrl = videoUri.includes("?") ? `${videoUri}&key=${apiKey}` : `${videoUri}?key=${apiKey}`;
        const dlResp = await fetch(downloadUrl, { signal: AbortSignal.timeout(120000) });
        if (!dlResp.ok) throw new Error(`Failed to download Veo 3 video: ${dlResp.status}`);
        const buffer = Buffer.from(await dlResp.arrayBuffer());
        const s3Key = `scenes/veo3-${Date.now()}.mp4`;
        let s3Url: string;
        try {
          const result = await storagePut(s3Key, buffer, "video/mp4");
          s3Url = result.url;
        } catch (storageErr: any) {
          console.warn(`[ExtendedScene] Storage unavailable for Veo3 video (${storageErr.message}), using raw CDN URL`);
          s3Url = downloadUrl;
        }
        console.log(`[ExtendedScene] Veo 3 operation ${operationName} completed: ${s3Url}`);
        return s3Url;
      }
    }
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  throw new Error(`Veo 3 operation ${operationName} timed out after 20 minutes`);
}

// ─── Types ───


// ─── Sub-clip retry helper ──────────────────────────────────────────────────
async function generateSubClipWithRetry(
  fn: () => Promise<VideoGenerationResult>,
  maxRetries = 2,
  baseDelayMs = 3000
): Promise<VideoGenerationResult> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try { return await fn(); } catch (err: any) {
      lastError = err;
      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        console.warn(`[ExtendedScene] Sub-clip attempt ${attempt + 1} failed (${err.message}). Retrying in ${delay}ms...`);
        await new Promise(res => setTimeout(res, delay));
      }
    }
  }
  throw lastError ?? new Error("Sub-clip generation failed after retries");
}

export interface SubShot {
  index: number;
  prompt: string;
  cameraAngle: string;
  cameraMovement: string;
  durationSeconds: number;
  /** URL of the last frame from the previous sub-shot (for continuity) */
  referenceFrameUrl?: string;
}

export interface ExtendedSceneRequest {
  sceneId: number;
  projectId: number;
  /** Full scene description */
  description: string;
  /** Target duration for this scene in seconds */
  targetDurationSeconds: number;
  /** Scene metadata */
  mood?: string;
  lighting?: string;
  timeOfDay?: string;
  weather?: string;
  genre?: string;
  /** Character descriptions for consistency */
  characterDescriptions?: string[];
  /** Location description */
  locationDescription?: string;
  /** Previous scene's last frame URL for scene-to-scene continuity */
  previousSceneLastFrameUrl?: string;
  /** Dialogue audio URL to sync video duration with */
  dialogueAudioUrl?: string;
  dialogueAudioDuration?: number;
  /** Reference images from the scene editor — first image used as Runway promptImage */
  referenceImages?: string[];
  /** Director's exact AI prompt override — replaces the auto-generated prompt when set */
  aiPromptOverride?: string;
  /** Negative prompt — what NOT to generate (no CGI, no cartoon, etc.) */
  negativePrompt?: string;
  /** Seed for reproducible generations */
  seed?: number;
  /** Explicit scene type — overrides genre/mood auto-detection for Hollywood shot grammar selection */
  sceneType?: "action" | "dialogue" | "emotional" | "horror" | "reveal" | "default";
  /** Wardrobe context block — injected into every sub-shot prompt so characters wear correct outfits */
  wardrobeContext?: string;
}

export interface ExtendedSceneResult {
  videoUrl: string;           // S3 URL of the stitched scene video
  thumbnailUrl?: string;      // First frame thumbnail
  totalDuration: number;      // Actual duration in seconds
  subClipCount: number;       // Number of sub-clips generated
  lastFrameUrl?: string;      // Last frame URL for next scene continuity
  clipsRequested: number;     // Number of sub-clips originally planned
  provider: string;
}

// ─── Camera Angle Variations ───
// Cycle through these to create cinematic variety within a single scene

const CAMERA_VARIATIONS = [
  { angle: "wide establishing", movement: "slow dolly forward", description: "Wide establishing shot slowly pushing in, revealing environment and context" },
  { angle: "medium two-shot", movement: "subtle steady push", description: "Medium two-shot framing both subjects, gentle push toward emotional center" },
  { angle: "close-up", movement: "imperceptible handheld breathing", description: "Close-up with organic handheld micro-movement, actor fills frame" },
  { angle: "over-shoulder", movement: "slow push in", description: "Over-the-shoulder shot establishing eyeline and spatial relationship" },
  { angle: "low angle", movement: "slow tilt up revealing subject", description: "Low angle heroic frame, slow tilt up to full reveal" },
  { angle: "wide", movement: "slow pan left to right following action", description: "Wide master shot panning with the scene" },
  { angle: "medium close-up", movement: "slow orbit revealing depth", description: "Medium close-up slowly orbiting subject, revealing background depth" },
  { angle: "birds eye overhead", movement: "descending crane into scene", description: "Bird's-eye crane descending into the scene, god's perspective narrowing to human scale" },
  { angle: "extreme close-up", movement: "locked off held tension", description: "Extreme close-up on eyes, hands, or key detail — locked off to create tension" },
  { angle: "POV first-person", movement: "naturalistic handheld", description: "First-person POV with naturalistic handheld sway, viewer inhabits character" },
  { angle: "Dutch angle tilt", movement: "slow creep forward", description: "Dutch angle creating psychological unease, slow creep amplifies dread" },
  { angle: "insert detail shot", movement: "locked macro", description: "Macro insert on critical story detail — hand, object, wound, text" },
  { angle: "wide high angle", movement: "slow push down", description: "High wide angle looking down, characters small in environment, push slowly down" },
  { angle: "tracking medium", movement: "lateral tracking shot", description: "Medium lateral tracking shot moving parallel to action, cinéma vérité energy" },
  { angle: "reverse angle", movement: "static cut-in", description: "Reverse angle cut-in, flipping spatial orientation for dramatic counter-point" },
  { angle: "aerial drone", movement: "sweeping reveal arc", description: "Sweeping aerial drone arc revealing landscape scale and geographic context" },
];

// ─── Hollywood Shot Grammar Sequences ───
// Each genre/scene-type uses a deliberate shot progression, not random cycling.
// Modeled on real Hollywood editing conventions.

type ShotBeat = {
  angle: string;
  movement: string;
  description: string;
  dramaticPurpose: string;
  filmStock: string;
};

function buildShotGrammar(
  genre: string,
  mood: string,
  numClips: number,
  sceneType: "action" | "dialogue" | "emotional" | "horror" | "reveal" | "default"
): ShotBeat[] {
  // Film stock selection based on scene mood — real Hollywood stock choices
  const getFilmStock = (beatType: string): string => {
    const dark = ["horror", "noir", "thriller", "tension", "night", "fear", "dread"];
    const warm = ["romance", "golden", "warm", "nostalgic", "sunset", "hope"];
    const cold = ["sci-fi", "dystopian", "clinical", "sterile", "interrogation"];
    const m = mood.toLowerCase();
    const g = genre.toLowerCase();
    if (dark.some(d => m.includes(d) || g.includes(d))) return "Kodak Vision3 500T 5219, pushed one stop, crushed blacks";
    if (warm.some(w => m.includes(w) || g.includes(w))) return "Kodak Vision3 250D 5207, warm golden LUT, gentle highlight rolloff";
    if (cold.some(c => m.includes(c) || g.includes(c))) return "Fuji Eterna 500T 8573, desaturated teal shift, clinical whites";
    if (beatType === "day exterior") return "Kodak Vision3 200T 5213, natural daylight balanced, vivid color rendition";
    return "Kodak Vision3 500T 5219, ACES color science, cinematic DI finish";
  };

  // Genre-specific shot sequence templates
  // Each sequence has 16 entries — we'll slice to numClips
  const sequences: Record<string, ShotBeat[]> = {
    action: [
      { angle: "wide establishing", movement: "rapid push-in", description: "Wide master establishing danger zone", dramaticPurpose: "Establish scale and threat", filmStock: getFilmStock("exterior") },
      { angle: "low angle", movement: "explosive tilt up", description: "Low heroic frame on protagonist, explosive tilt up", dramaticPurpose: "Hero power reveal", filmStock: getFilmStock("day") },
      { angle: "medium tracking", movement: "kinetic run-alongside", description: "Medium shot tracking alongside sprinting action", dramaticPurpose: "Keep pace with physical action", filmStock: getFilmStock("action") },
      { angle: "extreme close-up", movement: "locked off held", description: "Extreme close-up on face — determination, adrenaline", dramaticPurpose: "Emotional stakes", filmStock: getFilmStock("intensity") },
      { angle: "POV first-person", movement: "aggressive handheld rush", description: "First-person rush through environment, visceral and disorienting", dramaticPurpose: "Put viewer inside action", filmStock: getFilmStock("adrenaline") },
      { angle: "wide chaos", movement: "whip pan", description: "Wide shot capturing full chaos of confrontation with whip pan", dramaticPurpose: "Convey scale of conflict", filmStock: getFilmStock("action") },
      { angle: "insert detail", movement: "locked macro", description: "Macro insert on hands, weapon, wound — critical story beat", dramaticPurpose: "Consequence and stakes", filmStock: getFilmStock("intensity") },
      { angle: "medium slow-motion", movement: "ultra-slow tracking", description: "Phantom slow-motion at 1000fps — key impact moment suspended in time", dramaticPurpose: "Grace and brutality of action", filmStock: getFilmStock("film") },
      { angle: "over-shoulder reaction", movement: "push in", description: "Over-shoulder on opponent's reaction to hero's action", dramaticPurpose: "Power dynamic reversal", filmStock: getFilmStock("close") },
      { angle: "low angle chase", movement: "ground-level tracking", description: "Ground-level low angle tracking chase — feet, dust, momentum", dramaticPurpose: "Physicality and desperation", filmStock: getFilmStock("action") },
      { angle: "birds eye overhead", movement: "rapid descending crane", description: "Birds-eye tactical overhead showing spatial relationship of combatants", dramaticPurpose: "Geographic clarity in chaos", filmStock: getFilmStock("film") },
      { angle: "wide resolution", movement: "slow dolly out", description: "Wide shot pulling out from resolution moment", dramaticPurpose: "Scale of aftermath", filmStock: getFilmStock("day") },
      { angle: "close-up aftermath", movement: "slow push in", description: "Close-up on protagonist face in aftermath — exhaustion, survival, cost", dramaticPurpose: "Emotional aftermath", filmStock: getFilmStock("quiet") },
      { angle: "medium", movement: "static locked", description: "Static medium shot — silence after the storm", dramaticPurpose: "Let the beat breathe", filmStock: getFilmStock("film") },
      { angle: "wide", movement: "slow pan reveal", description: "Wide pan revealing full aftermath of action", dramaticPurpose: "World changed forever", filmStock: getFilmStock("aftermath") },
      { angle: "aerial drone", movement: "sweeping arc away", description: "Aerial sweeping arc pulling back from scene — distance and consequence", dramaticPurpose: "Godlike perspective on consequences", filmStock: getFilmStock("film") },
    ],
    dialogue: [
      { angle: "wide two-shot", movement: "subtle push toward conversation", description: "Wide two-shot establishing both characters in space, slowly pushing into their world", dramaticPurpose: "Establish spatial relationship and power dynamic", filmStock: getFilmStock("interior") },
      { angle: "medium over-shoulder A", movement: "slow push toward B", description: "Over character A's shoulder looking at character B, gentle push in", dramaticPurpose: "Introduce first perspective", filmStock: getFilmStock("dialogue") },
      { angle: "medium close-up B", movement: "imperceptible handheld", description: "Medium close-up on character B listening, micro-expression visible", dramaticPurpose: "Character's internal reaction", filmStock: getFilmStock("close") },
      { angle: "medium over-shoulder B", movement: "slow push toward A", description: "Reverse — over character B's shoulder looking at A responding", dramaticPurpose: "Counter perspective, power shift", filmStock: getFilmStock("dialogue") },
      { angle: "medium close-up A", movement: "slight orbit", description: "Medium close-up on A responding, slight orbit revealing emotional state", dramaticPurpose: "Escalation — stakes rising in dialogue", filmStock: getFilmStock("close") },
      { angle: "insert detail", movement: "locked macro", description: "Insert on hands, glass, object being held — physical expression of emotion", dramaticPurpose: "Physical manifestation of tension", filmStock: getFilmStock("detail") },
      { angle: "close-up A", movement: "ultra-slow push in", description: "Close-up on A — key line or emotional turn, ultra-slow push amplifying weight", dramaticPurpose: "The turning point of the scene", filmStock: getFilmStock("emotion") },
      { angle: "close-up B", movement: "subtle pull back shock", description: "Close-up on B — reaction to turning point, subtle pull back on impact", dramaticPurpose: "Reaction — the scene changes here", filmStock: getFilmStock("reaction") },
      { angle: "wide two-shot new dynamic", movement: "slow reframe", description: "Wide two-shot again but relationship has shifted — visual reframe shows new dynamic", dramaticPurpose: "Show how power balance changed", filmStock: getFilmStock("dialogue") },
      { angle: "medium walking", movement: "tracking with character", description: "Medium tracking shot — character crosses room, physical movement expressing emotion", dramaticPurpose: "Physical punctuation to emotional beat", filmStock: getFilmStock("movement") },
      { angle: "extreme close-up eyes", movement: "locked held", description: "Extreme close-up on eyes — tears, realization, suppressed anger", dramaticPurpose: "The truth in the eyes", filmStock: getFilmStock("truth") },
      { angle: "wide lonely", movement: "slow pull back", description: "Wide shot — character alone in frame, space pressing in, slow pull back", dramaticPurpose: "Isolation and consequence", filmStock: getFilmStock("emotion") },
      { angle: "medium profile", movement: "locked profile", description: "Static profile — character looking away, processing what happened", dramaticPurpose: "Introspection, scene closes", filmStock: getFilmStock("quiet") },
      { angle: "over-shoulder out window", movement: "slow push toward glass", description: "Over shoulder looking out window — character's gaze at the world outside", dramaticPurpose: "Yearning, escape, hope or dread", filmStock: getFilmStock("mood") },
      { angle: "wide two-shot departure", movement: "static as one character leaves", description: "Wide two-shot — one character exits frame, leaving the other alone", dramaticPurpose: "Visual statement of separation", filmStock: getFilmStock("end") },
      { angle: "close-up remaining", movement: "slow push in resolution", description: "Close-up on remaining character — final expression that carries into next scene", dramaticPurpose: "Bridge to what comes next", filmStock: getFilmStock("quiet") },
    ],
    horror: [
      { angle: "wide deceptively serene", movement: "slow dolly forward into false peace", description: "Wide shot — everything looks normal, too normal. Slow creep forward.", dramaticPurpose: "Establish false safety before violation", filmStock: getFilmStock("horror") },
      { angle: "medium POV", movement: "naturalistic nervous handheld", description: "Medium POV — character moving through space, looking around, nervous energy", dramaticPurpose: "Put viewer in danger alongside protagonist", filmStock: getFilmStock("horror") },
      { angle: "over-shoulder into darkness", movement: "push toward the dark", description: "Over shoulder looking into darkness or around a corner — push slowly toward unknown", dramaticPurpose: "The approach — anticipation of threat", filmStock: getFilmStock("horror") },
      { angle: "low Dutch angle", movement: "slow creep", description: "Dutch angle low frame — spatial wrongness, creeping forward", dramaticPurpose: "Reality distortion — something is wrong", filmStock: getFilmStock("horror") },
      { angle: "extreme close-up eyes", movement: "locked — dilation visible", description: "Extreme close-up on protagonist eyes — pupils dilate in fear, locked still", dramaticPurpose: "Fear registering in body", filmStock: getFilmStock("horror") },
      { angle: "wide reveal", movement: "rapid push-in on reveal", description: "Wide shot with sudden push-in on the threat revealed in frame", dramaticPurpose: "The reveal — sudden confrontation with dread", filmStock: getFilmStock("horror") },
      { angle: "medium chaos handheld", movement: "violent unstabilized", description: "Medium violent handheld — world destabilized by threat, camera struggling", dramaticPurpose: "Chaos and loss of control", filmStock: getFilmStock("horror") },
      { angle: "insert graphic detail", movement: "locked macro", description: "Insert on disturbing detail — blood, wound, wrong shape in shadow", dramaticPurpose: "The cost made visceral and specific", filmStock: getFilmStock("horror") },
      { angle: "wide aftermath silence", movement: "completely static", description: "Wide completely static shot of aftermath — silence is the horror", dramaticPurpose: "The silence after is more terrifying", filmStock: getFilmStock("horror") },
      { angle: "close-up survivor", movement: "slow push in", description: "Close-up on survivor's face — trauma, disbelief, survival guilt", dramaticPurpose: "Human cost of horror", filmStock: getFilmStock("horror") },
      { angle: "birds eye looking down", movement: "slow descend", description: "Birds-eye looking down at lone survivor in vast dark space — vulnerability", dramaticPurpose: "Smallness, isolation, continued threat", filmStock: getFilmStock("horror") },
      { angle: "background threat", movement: "locked as background shifts", description: "Focus on foreground character while threat appears out of focus in background", dramaticPurpose: "Viewer sees danger character cannot", filmStock: getFilmStock("horror") },
      { angle: "POV retreat", movement: "backing away handheld", description: "POV backing away from threat — claustrophobic, trapped", dramaticPurpose: "Viewer retreating with protagonist", filmStock: getFilmStock("horror") },
      { angle: "medium reaction", movement: "locked", description: "Medium locked shot — character freezes, processing, deciding", dramaticPurpose: "Decision point — fight or flight", filmStock: getFilmStock("horror") },
      { angle: "wide threat looming", movement: "locked with threat in frame", description: "Wide shot — threat visible and growing in frame, protagonist unaware", dramaticPurpose: "Dramatic irony — audience knows", filmStock: getFilmStock("horror") },
      { angle: "close-up door/barrier", movement: "push toward", description: "Close-up push toward last barrier between character and safety", dramaticPurpose: "Final hope and its fragility", filmStock: getFilmStock("horror") },
    ],
    emotional: [
      { angle: "wide isolating", movement: "slow pull back to emphasize loneliness", description: "Wide shot pulling back — character small, world large and indifferent", dramaticPurpose: "Establish emotional isolation", filmStock: getFilmStock("emotion") },
      { angle: "medium approaching", movement: "slow dolly in as emotion builds", description: "Medium shot slowly moving in as emotional moment builds — camera drawn to subject", dramaticPurpose: "Gravity of the emotional moment", filmStock: getFilmStock("emotion") },
      { angle: "close-up face", movement: "imperceptible handheld breath", description: "Close-up on face — every micro-expression visible, organic breathing of camera", dramaticPurpose: "Intimacy — we are with this person", filmStock: getFilmStock("emotion") },
      { angle: "insert hands", movement: "locked macro", description: "Macro insert on hands — trembling, clasped, letting go", dramaticPurpose: "Emotion in the body, not just the face", filmStock: getFilmStock("detail") },
      { angle: "extreme close-up tears", movement: "locked held on tears forming", description: "ECU on eye — tear forms, runs, falls. Locked held.", dramaticPurpose: "The moment of release", filmStock: getFilmStock("emotion") },
      { angle: "wide two-shot embrace", movement: "slow orbit", description: "Wide slowly orbiting two-shot of physical comfort or confrontation", dramaticPurpose: "The physical expression of the emotional truth", filmStock: getFilmStock("connection") },
      { angle: "medium pull back", movement: "slow pull back leaving space", description: "Medium pulling back — creating space between characters or around subject", dramaticPurpose: "The beginning of separation or acceptance", filmStock: getFilmStock("emotion") },
      { angle: "window reflection", movement: "slow push toward glass", description: "Character reflected in glass while real world visible beyond — duality", dramaticPurpose: "Inner vs outer world", filmStock: getFilmStock("introspection") },
      { angle: "profile locked", movement: "static profile contemplation", description: "Static profile shot — character looking at something only they can see", dramaticPurpose: "The weight of memory, regret, or hope", filmStock: getFilmStock("quiet") },
      { angle: "close-up smile/break", movement: "ultra-slow push", description: "ECU ultra-slow push — the face breaking into release whether tears or joy", dramaticPurpose: "Catharsis", filmStock: getFilmStock("emotion") },
      { angle: "medium departing", movement: "static as character moves away", description: "Static medium — character walks away into distance, we watch them go", dramaticPurpose: "Departure and loss", filmStock: getFilmStock("end") },
      { angle: "wide final", movement: "slow crane rise", description: "Wide crane rising above scene — giving scale and perspective to emotion", dramaticPurpose: "Transcendence of the moment", filmStock: getFilmStock("resolution") },
    ],
    reveal: [
      { angle: "tight on concealing element", movement: "locked hiding truth", description: "Tight shot on what conceals the truth — door, box, face, shadow", dramaticPurpose: "Build anticipation for what will be revealed", filmStock: getFilmStock("tension") },
      { angle: "POV approach", movement: "slow inexorable push toward reveal", description: "POV slowly approaching the thing about to be revealed — inexorable", dramaticPurpose: "Participate in the discovery", filmStock: getFilmStock("tension") },
      { angle: "wide reveal moment", movement: "rapid push-in on reveal or pull-back wide", description: "The reveal — either rapid push-in (shock) or rapid pull-back wide (context)", dramaticPurpose: "The reveal itself — maximum impact", filmStock: getFilmStock("shock") },
      { angle: "close-up reaction", movement: "push in on reaction face", description: "Immediate close-up on the face reacting to the reveal — nothing hidden", dramaticPurpose: "Audience proxy reaction", filmStock: getFilmStock("reaction") },
      { angle: "wide context", movement: "slow pull back showing full picture", description: "Wide pull back showing what the reveal means in full context", dramaticPurpose: "Let the stakes register fully", filmStock: getFilmStock("film") },
      { angle: "insert detail", movement: "macro on critical detail", description: "Macro insert on the specific detail that makes the reveal undeniable", dramaticPurpose: "The inescapable proof", filmStock: getFilmStock("detail") },
      { angle: "medium aftermath", movement: "slow push in on processing", description: "Medium shot of character processing — the reveal sinking in", dramaticPurpose: "The reveal's aftermath — what it means", filmStock: getFilmStock("aftermath") },
      { angle: "wide consequence", movement: "static held", description: "Wide static shot — the world as it now must be understood", dramaticPurpose: "The new reality established", filmStock: getFilmStock("resolution") },
    ],
    default: [
      { angle: "wide establishing", movement: "slow dolly forward", description: "Wide establishing shot slowly pushing in, grounding scene in space and time", dramaticPurpose: "Orient viewer to location and emotional context", filmStock: getFilmStock("exterior") },
      { angle: "medium", movement: "steady tracking", description: "Medium shot tracking with primary subject through the scene", dramaticPurpose: "Follow the action at human scale", filmStock: getFilmStock("film") },
      { angle: "close-up", movement: "subtle handheld", description: "Close-up with subtle organic handheld breathing — actor in sharp focus", dramaticPurpose: "Intimacy with character's inner life", filmStock: getFilmStock("close") },
      { angle: "over-shoulder", movement: "push in", description: "Over-the-shoulder shot establishing spatial and emotional relationship", dramaticPurpose: "Interpersonal dynamics made visible", filmStock: getFilmStock("dialogue") },
      { angle: "wide", movement: "slow pan", description: "Wide panning shot — environment active and expressive", dramaticPurpose: "World as character — environment shapes mood", filmStock: getFilmStock("film") },
      { angle: "low angle", movement: "tilt up", description: "Low angle tilt up — stature, power, heroism, or threat", dramaticPurpose: "Scale and status communicated through geometry", filmStock: getFilmStock("power") },
      { angle: "medium close-up", movement: "slow orbit", description: "Medium close-up slowly orbiting — all angles of the emotional moment", dramaticPurpose: "Full roundedness of the character beat", filmStock: getFilmStock("close") },
      { angle: "birds eye", movement: "descending crane", description: "Bird's-eye crane descending into scene — world to human scale", dramaticPurpose: "Context and consequence from above", filmStock: getFilmStock("film") },
      { angle: "extreme close-up", movement: "locked held", description: "ECU locked — the essential detail that carries the scene's meaning", dramaticPurpose: "The irreducible truth of the moment", filmStock: getFilmStock("detail") },
      { angle: "tracking medium", movement: "lateral movement", description: "Lateral tracking medium shot — parallel to action, journalistic energy", dramaticPurpose: "Movement as life — kinetic honesty", filmStock: getFilmStock("movement") },
      { angle: "wide aerial", movement: "sweeping arc", description: "Sweeping aerial arc — geographic and emotional scale", dramaticPurpose: "Transcendence — the scene in its full world context", filmStock: getFilmStock("film") },
      { angle: "close profile", movement: "static profile", description: "Static profile close-up — character looking off toward what matters to them", dramaticPurpose: "Interior life made exterior", filmStock: getFilmStock("quiet") },
    ],
  };

  // Select the appropriate sequence based on genre and mood keywords
  let sequenceKey: keyof typeof sequences = "default";
  const g = genre.toLowerCase();
  const m = mood.toLowerCase();
  const actionKeywords = ["action", "fight", "chase", "battle", "explosion", "combat", "war", "heist", "escape", "crash"];
  const horrorKeywords = ["horror", "terror", "dread", "fear", "monster", "threat", "danger", "creature", "supernatural", "dark"];
  const dialogueKeywords = ["dialogue", "conversation", "confrontation", "negotiation", "reunion", "meeting", "argument", "debate"];
  const emotionalKeywords = ["emotional", "sad", "grief", "joy", "love", "loss", "crying", "tears", "heartbreak", "reunion", "tender", "romance"];
  const revealKeywords = ["reveal", "discovery", "twist", "uncover", "shock", "surprise", "confession"];

  if (actionKeywords.some(k => g.includes(k) || m.includes(k)) || g === "action" || g === "war") {
    sequenceKey = "action";
  } else if (horrorKeywords.some(k => g.includes(k) || m.includes(k)) || g === "horror") {
    sequenceKey = "horror";
  } else if (revealKeywords.some(k => m.includes(k))) {
    sequenceKey = "reveal";
  } else if (emotionalKeywords.some(k => m.includes(k)) || g === "romance") {
    sequenceKey = "emotional";
  } else if (dialogueKeywords.some(k => m.includes(k)) || g === "drama" || g === "film noir" || g === "crime") {
    sequenceKey = "dialogue";
  } else if (sceneType !== "default") {
    sequenceKey = sceneType;
  }

  const sequence = sequences[sequenceKey];
  // Slice to numClips — take the most dramatically appropriate beats from the front
  return sequence.slice(0, Math.min(numClips, sequence.length));
}

// ─── Sub-Shot Planning ───

/**
 * Break a scene into cinematically intelligent sub-shots based on target duration.
 * Uses genre-aware Hollywood shot grammar — not random camera cycling.
 * 
 * Shot sequencing follows real Hollywood editing conventions:
 * - Action: wide→low→tracking→ECU→POV→chaos→insert→slo-mo→aftermath
 * - Dialogue: two-shot→OS-A→CU-B→OS-B→CU-A→insert→turn→reaction→resolution
 * - Horror: serene→POV→approach→Dutch→ECU→reveal→chaos→insert→silence
 * - Emotional: wide-isolating→approach→close→hands→tears→embrace→departure
 * 
 * Provider clip durations:
 * - Runway / SeedDance: 10s (API only accepts 5 or 10)
 * - Pollinations / HuggingFace: 8s (model limitation)
 * - fal.ai (Kling v2.6 Pro): 10s (supports 3–15s; 10s chosen for reliable chaining)
 * - Sora / Replicate: 15s (supports up to 20s)
 */
export function planSubShots(
  sceneDescription: string,
  targetDurationSeconds: number,
  options?: {
    mood?: string;
    lighting?: string;
    timeOfDay?: string;
    weather?: string;
    genre?: string;
    characterDescriptions?: string[];
    locationDescription?: string;
    /** Active provider — used to select the correct clip duration */
    provider?: string;
    /** Hint about the type of scene for shot grammar selection */
    sceneType?: "action" | "dialogue" | "emotional" | "horror" | "reveal" | "default";
    /** Wardrobe context block to append to every sub-shot prompt */
    wardrobeContext?: string;
  }
): SubShot[] {
  const provider = options?.provider || "pollinations";
  const clipDuration =
    provider === "runway" || provider === "seedance" || provider === "fal" ? 10 :
    provider === "pollinations" || provider === "huggingface" ? 8 :
    15; // Sora, Replicate — up to 20s per clip

  const numClips = Math.max(1, Math.ceil(targetDurationSeconds / clipDuration));
  const genre = options?.genre || "Drama";
  const mood = options?.mood || "cinematic";
  const sceneType = options?.sceneType || "default";

  // Get genre-aware shot grammar sequence
  const shotGrammar = buildShotGrammar(genre, mood, numClips, sceneType);

  const subShots: SubShot[] = [];

  for (let i = 0; i < numClips; i++) {
    // Use shot grammar when available, fall back to camera variations array for overflow
    const grammarBeat = shotGrammar[i];
    const fallbackVar = CAMERA_VARIATIONS[i % CAMERA_VARIATIONS.length];
    
    const angle = grammarBeat?.angle || fallbackVar.angle;
    const movement = grammarBeat?.movement || fallbackVar.movement;
    const description = grammarBeat?.description || fallbackVar.description;
    const dramaticPurpose = grammarBeat?.dramaticPurpose || "";
    const filmStock = grammarBeat?.filmStock || "Kodak Vision3 500T 5219, ACES color science";

    const isFirst = i === 0;
    const isLast = i === numClips - 1;

    // Build a deeply cinematic prompt for this specific sub-shot
    const promptParts: string[] = [];

    // Camera & technical anchor — specific enough for Hollywood-grade output
    promptParts.push(`Photorealistic cinematic footage, ARRI ALEXA 65 with ${angle === "aerial drone" ? "aerial gimbal" : "Leica Summicron-C prime lens"}, 24fps, 2.39:1 anamorphic CinemaScope, ${filmStock}`);

    // Character descriptions — injected early for maximum model weight
    if (options?.characterDescriptions && options.characterDescriptions.length > 0) {
      promptParts.push(`Cast in frame: ${options.characterDescriptions.join("; ")}`);
    }

    if (options?.genre) promptParts.push(`${options.genre} feature film`);

    // Dramatic context
    if (dramaticPurpose) promptParts.push(`Scene intention: ${dramaticPurpose}`);

    // Scene description with shot-specific framing directive
    if (isFirst) {
      promptParts.push(`Scene opening — ${description}: ${sceneDescription}`);
    } else if (isLast) {
      promptParts.push(`Scene closing — ${description}: ${sceneDescription}`);
    } else {
      promptParts.push(`${description}: ${sceneDescription}`);
    }

    // Camera specifics
    promptParts.push(`Shot: ${angle}, camera movement: ${movement}`);
    // Location grounding
    if (options?.locationDescription) {
      promptParts.push(`Setting: ${options.locationDescription}`);
    }

    // Atmosphere and lighting
    if (options?.timeOfDay) promptParts.push(`${options.timeOfDay} natural light`);
    if (options?.weather && options.weather !== "clear") promptParts.push(`${options.weather} weather conditions`);
    if (options?.lighting) promptParts.push(`Lighting: ${options.lighting}`);
    if (options?.mood) promptParts.push(`Atmosphere: ${options.mood}`);

    // Technical quality standards — Hollywood DI finish requirements
    promptParts.push("subsurface skin scattering, micro-pore skin texture, photorealistic eye reflections, natural depth of field bokeh, subtle lens breathing, optical vignetting, anamorphic lens flare characteristics, cinematic color timing");

    const thisDuration = isLast
      ? Math.max(5, targetDurationSeconds - (numClips - 1) * clipDuration)
      : clipDuration;

    subShots.push({
      index: i,
      prompt: promptParts.join(". "),
      cameraAngle: angle,
      cameraMovement: movement,
      durationSeconds: Math.min(20, Math.max(2, thisDuration)),
    });
  }

  // Append wardrobeContext to every sub-shot prompt for costume consistency
  if (options && options.wardrobeContext && options.wardrobeContext.trim()) {
    const wc = options.wardrobeContext.trim();
    for (const shot of subShots) {
      shot.prompt = shot.prompt + " WARDROBE & COSTUME: " + wc;
    }
  }
  return subShots;
}

// ─── Camera Angle Variations ───

/**
 * Extract the last frame from a video file and upload to S3.
 * This frame is used as the reference image for the next clip's generation.
 */
async function extractLastFrame(videoUrl: string, projectId: number, sceneId: number): Promise<string | undefined> {
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "virelle-frame-"));

  try {
    // Download video
    const videoPath = path.join(tmpDir, "video.mp4");
    const resp = await fetch(videoUrl);
    if (!resp.ok) return undefined;
    const buffer = Buffer.from(await resp.arrayBuffer());
    await fs.promises.writeFile(videoPath, buffer);

    // Extract last frame
    const framePath = path.join(tmpDir, "last_frame.jpg");

    // First get duration
    const { stdout: probeOut } = await execFileAsync("ffprobe", [
      "-v", "quiet",
      "-print_format", "json",
      "-show_format",
      videoPath,
    ], { timeout: 15000 });
    const info = JSON.parse(probeOut);
    const duration = parseFloat(info.format?.duration || "0");

    if (duration <= 0) return undefined;

    // Extract frame at duration - 0.1s
    const seekTime = Math.max(0, duration - 0.1);
    await execFileAsync("ffmpeg", [
      "-ss", String(seekTime),
      "-i", videoPath,
      "-vframes", "1",
      "-q:v", "2",
      "-y",
      framePath,
    ], { timeout: 15000 });

    // Upload to S3
    const frameBuffer = await fs.promises.readFile(framePath);
    const key = `frames/${projectId}/scene-${sceneId}-lastframe-${Date.now()}.jpg`;
    try {
      const { url } = await storagePut(key, frameBuffer, "image/jpeg");
      return url;
    } catch (storageErr: any) {
      console.warn(`[ExtendedScene] Storage unavailable for last frame (${storageErr.message}), skipping frame upload`);
      return undefined;
    }
  } catch (err) {
    console.warn("[ExtendedScene] Failed to extract last frame:", err);
    return undefined;
  } finally {
    try {
      await fs.promises.rm(tmpDir, { recursive: true, force: true });
    } catch { /* ignore */ }
  }
}

/**
 * Extract the first frame from a video for use as thumbnail.
 */
async function extractFirstFrame(videoUrl: string, projectId: number, sceneId: number): Promise<string | undefined> {
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "virelle-thumb-"));

  try {
    const videoPath = path.join(tmpDir, "video.mp4");
    const resp = await fetch(videoUrl);
    if (!resp.ok) return undefined;
    const buffer = Buffer.from(await resp.arrayBuffer());
    await fs.promises.writeFile(videoPath, buffer);

    const framePath = path.join(tmpDir, "first_frame.jpg");
    await execFileAsync("ffmpeg", [
      "-i", videoPath,
      "-vframes", "1",
      "-q:v", "2",
      "-y",
      framePath,
    ], { timeout: 15000 });

    const frameBuffer = await fs.promises.readFile(framePath);
    const key = `thumbnails/${projectId}/scene-${sceneId}-thumb-${Date.now()}.jpg`;
    try {
      const { url } = await storagePut(key, frameBuffer, "image/jpeg");
      return url;
    } catch (storageErr: any) {
      console.warn(`[ExtendedScene] Storage unavailable for thumbnail (${storageErr.message}), skipping thumbnail upload`);
      return undefined;
    }
  } catch {
    return undefined;
  } finally {
    try {
      await fs.promises.rm(tmpDir, { recursive: true, force: true });
    } catch { /* ignore */ }
  }
}

// ─── Sub-Clip Stitching ───

/**
 * Stitch multiple sub-clips into a single scene video with crossfade transitions.
 */
async function stitchSubClips(
  clipUrls: string[],
  projectId: number,
  sceneId: number
): Promise<{ videoUrl: string; duration: number }> {
  if (clipUrls.length === 0) throw new Error("No clips to stitch");
  if (clipUrls.length === 1) {
    // Single clip — download and upload to S3 for a permanent URL
    // (Runway/other CDN URLs expire after 24-72 hours)
    try {
      const resp = await fetch(clipUrls[0], { signal: AbortSignal.timeout(60_000) });
      if (resp.ok) {
        const buffer = Buffer.from(await resp.arrayBuffer());
        const key = `scenes/${projectId}/scene-${sceneId}-clip-${Date.now()}.mp4`;
        const { url: permanentUrl } = await storagePut(key, buffer, "video/mp4");
        return { videoUrl: permanentUrl, duration: 10 };
      }
    } catch (uploadErr: any) {
      console.warn(`[ExtendedScene] Failed to re-upload single clip to S3, using CDN URL as fallback: ${uploadErr.message}`);
    }
    // Fallback: return raw URL if S3 upload fails
    return { videoUrl: clipUrls[0], duration: 10 };
  }

  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "virelle-stitch-sub-"));

  try {
    // Download all clips (60s timeout per clip to prevent hung downloads)
    const localFiles: string[] = [];
    for (let i = 0; i < clipUrls.length; i++) {
      const localPath = path.join(tmpDir, `clip_${String(i).padStart(3, "0")}.mp4`);
      try {
        const resp = await fetch(clipUrls[i], { signal: AbortSignal.timeout(60_000) });
        if (!resp.ok) continue;
        const buffer = Buffer.from(await resp.arrayBuffer());
        await fs.promises.writeFile(localPath, buffer);
        localFiles.push(localPath);
      } catch (dlErr: any) {
        console.warn(`[ExtendedScene] Failed to download clip ${i + 1} for stitching: ${dlErr.message}`);
      }
    }

    if (localFiles.length === 0) throw new Error("Failed to download any clips");

    // Normalize all clips to same format
    const normalizedFiles: string[] = [];
    for (let i = 0; i < localFiles.length; i++) {
      const normalized = path.join(tmpDir, `norm_${String(i).padStart(3, "0")}.ts`);
      await execFileAsync("ffmpeg", [
        "-i", localFiles[i],
        "-c:v", "libx264",
        "-preset", "slow",
        "-crf", "18",
        "-vf", "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1",
        "-r", "24",
        "-c:a", "aac",
        "-ar", "44100",
        "-ac", "2",
        "-b:a", "320k",
        "-f", "mpegts",
        "-y",
        normalized,
      ], { timeout: 60000 });
      normalizedFiles.push(normalized);
    }

    // Concatenate
    const concatInput = normalizedFiles.join("|");
    const outputPath = path.join(tmpDir, "scene_stitched.mp4");

    await execFileAsync("ffmpeg", [
      "-i", `concat:${concatInput}`,
      "-c:v", "libx264",
      "-preset", "slow",
      "-crf", "18",
      "-c:a", "aac",
      "-b:a", "320k",
      "-movflags", "+faststart",
      "-y",
      outputPath,
    ], { timeout: 600000 }); // 10-minute timeout for long scenes with many clips

    // Get duration
    let duration = 0;
    try {
      const { stdout } = await execFileAsync("ffprobe", [
        "-v", "quiet",
        "-print_format", "json",
        "-show_format",
        outputPath,
      ], { timeout: 10000 });
      const info = JSON.parse(stdout);
      duration = parseFloat(info.format?.duration || "0");
    } catch { /* ignore */ }

    // Upload to S3
    const fileBuffer = await fs.promises.readFile(outputPath);
    const key = `scenes/${projectId}/scene-${sceneId}-extended-${Date.now()}.mp4`;
    let videoUrl: string;
    try {
      const { url } = await storagePut(key, fileBuffer, "video/mp4");
      videoUrl = url;
    } catch (storageErr: any) {
      // No storage configured — use the first raw clip URL as fallback
      console.warn(`[ExtendedScene] Storage unavailable for stitched video (${storageErr.message}), using first clip URL as fallback`);
      videoUrl = clipUrls[0];
    }

    return { videoUrl, duration };
  } finally {
    try {
      await fs.promises.rm(tmpDir, { recursive: true, force: true });
    } catch { /* ignore */ }
  }
}

// ─── Main Entry Point ───

/**
 * Generate an extended scene video by chaining multiple sub-clips.
 * Supports industry-standard scene lengths: 30 seconds to 3+ minutes.
 * Each sub-clip is ~15s (capped by provider to 10-20s).
 * Clips are stitched together with ffmpeg for seamless playback.
 */
export async function generateExtendedScene(
  keys: UserApiKeys,
  request: ExtendedSceneRequest,
  onProgress?: (clipIndex: number, totalClips: number, clipUrl?: string) => void
): Promise<ExtendedSceneResult> {
  // Detect the active provider so planSubShots uses the correct clip duration
  const activeProvider = selectProvider(keys);
  console.log(`[ExtendedScene] Active provider: ${activeProvider}`);

  // If dialogue audio exists, match video duration to it (with buffer)
  let targetDuration = request.targetDurationSeconds;
  if (request.dialogueAudioDuration && request.dialogueAudioDuration > 0) {
    targetDuration = Math.max(targetDuration, request.dialogueAudioDuration + 2);
  }

  // Plan sub-shots with provider-aware clip durations
  const subShots = planSubShots(
    request.description,
    targetDuration,
    {
      mood: request.mood,
      lighting: request.lighting,
      timeOfDay: request.timeOfDay,
      weather: request.weather,
      genre: request.genre,
      characterDescriptions: request.characterDescriptions,
      locationDescription: request.locationDescription,
      provider: activeProvider,
      sceneType: (request.sceneType as any) || "default",
      wardrobeContext: request.wardrobeContext,
    }
  );

  console.log(`[ExtendedScene] Scene ${request.sceneId}: ${subShots.length} sub-clips planned for ${targetDuration}s target`);

  // Generate sub-clips sequentially (each uses previous clip's last frame)
  const generatedClipUrls: string[] = [];
  let lastFrameUrl = request.previousSceneLastFrameUrl;

  for (let i = 0; i < subShots.length; i++) {
    const subShot = subShots[i];

    // Use last frame from previous clip as reference for continuity
    if (lastFrameUrl) {
      subShot.referenceFrameUrl = lastFrameUrl;
    }

    try {
      console.log(`[ExtendedScene] Generating sub-clip ${i + 1}/${subShots.length} (${subShot.durationSeconds}s, ${subShot.cameraAngle})`);

      // Use director's prompt override for first sub-shot if set; otherwise use auto-generated prompt
      const effectivePrompt = (i === 0 && request.aiPromptOverride) ? request.aiPromptOverride : subShot.prompt;
      // Use first reference image as promptImage for first sub-shot (image-to-video); subsequent clips use last frame
      let effectiveImageUrl: string | undefined = subShot.referenceFrameUrl ||
        (i === 0 && request.referenceImages && request.referenceImages.length > 0 ? request.referenceImages[0] : undefined);

      // Runway Gen-4 Turbo requires a reference image. Auto-generate a Pollinations keyframe
      // if none is available so Runway always has a visual anchor for the scene.
      if (!effectiveImageUrl && activeProvider === "runway") {
        try {
          const kfPrompt = encodeURIComponent(
            `${effectivePrompt}, photorealistic, cinematic still frame, 8K, ARRI ALEXA, film grain, professional lighting`
              .replace(/[^\x20-\x7E]/g, "").substring(0, 500)
          );
          const kfUrl = `https://image.pollinations.ai/prompt/${kfPrompt}?width=1280&height=720&nologo=true&enhance=true&model=flux`;
          const kfCheck = await fetch(kfUrl, { method: "HEAD", signal: AbortSignal.timeout(15000) });
          if (kfCheck.ok) {
            effectiveImageUrl = kfUrl;
            console.log(`[ExtendedScene] Auto-generated Pollinations keyframe for Runway sub-clip ${i + 1}`);
          }
        } catch (kfErr: any) {
          console.warn(`[ExtendedScene] Keyframe auto-gen failed for sub-clip ${i + 1}: ${kfErr.message}`);
        }
      }

      // Wrap the entire sub-clip generation (including sentinel polling) in a 20-minute timeout.
      // This prevents a single hung Runway/Veo3 task from blocking all subsequent scenes.
      const SUB_CLIP_TIMEOUT_MS = 20 * 60 * 1000;
      const videoResult = await generateSubClipWithRetry(() => Promise.race([
        generateBYOKVideo(keys, {
          prompt: effectivePrompt,
          imageUrl: effectiveImageUrl,
          duration: subShot.durationSeconds,
          aspectRatio: "16:9",
          resolution: "1080p",
          negativePrompt: request.negativePrompt,
          seed: request.seed,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Sub-clip ${i + 1} timed out after 20 minutes`)), SUB_CLIP_TIMEOUT_MS)
        ),
      ]));

      // Resolve async sentinel URLs (Runway, Veo 3, and fal.ai return pending sentinels that need polling)
      let resolvedVideoUrl = videoResult.videoUrl;
      if (resolvedVideoUrl.startsWith("runway-pending:")) {
        const taskId = resolvedVideoUrl.replace("runway-pending:", "");
        resolvedVideoUrl = await Promise.race([
          pollRunwaySentinel(keys.runwayKey!, taskId),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`Runway sentinel poll for task ${taskId} timed out after 18 minutes`)), 18 * 60 * 1000)
          ),
        ]);
      } else if (resolvedVideoUrl.startsWith("veo3-pending:")) {
        const operationName = resolvedVideoUrl.replace("veo3-pending:", "");
        resolvedVideoUrl = await Promise.race([
          pollVeo3Sentinel(keys.googleAiKey!, operationName),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`Veo3 sentinel poll for ${operationName} timed out after 22 minutes`)), 22 * 60 * 1000)
          ),
        ]);
      } else if (resolvedVideoUrl.startsWith("fal-pending|")) {
        // fal-pending|{requestId}|{model}
        const parts = resolvedVideoUrl.replace("fal-pending|", "").split("|");
        const falRequestId = parts[0];
        const falModel = parts.slice(1).join("|");
        resolvedVideoUrl = await Promise.race([
          (async () => {
            const { pollFalRequest } = await import("./byokVideoEngine");
            const MAX_WAIT_MS = 20 * 60 * 1000;
            const startTime = Date.now();
            while (Date.now() - startTime < MAX_WAIT_MS) {
              await new Promise(r => setTimeout(r, 8000));
              const result = await pollFalRequest(keys.falKey!, falRequestId, falModel);
              if (result.status === "succeeded" && result.videoUrl) return result.videoUrl;
              if (result.status === "failed") throw new Error(`fal.ai sub-clip failed: ${result.error}`);
            }
            throw new Error(`fal.ai sub-clip timed out after 20 minutes`);
          })(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`fal.ai sentinel poll for ${falRequestId} timed out after 22 minutes`)), 22 * 60 * 1000)
          ),
        ]);
      }

      generatedClipUrls.push(resolvedVideoUrl);

      // Extract last frame for next clip's continuity
      lastFrameUrl = await extractLastFrame(resolvedVideoUrl, request.projectId, request.sceneId);

      onProgress?.(i + 1, subShots.length, videoResult.videoUrl);
    } catch (err: any) {
      console.error(`[ExtendedScene] Sub-clip ${i + 1} failed:`, err.message);
      // When the user has configured a paid API key, propagate the error immediately
      // so the scene is marked failed with a clear, actionable message (e.g. "Invalid API key",
      // "Quota exceeded"). Silently substituting a Pollinations still-frame would hide the
      // failure and give the user Pollinations content they didn't ask for.
      if (activeProvider !== "pollinations") {
        throw new Error(`[${activeProvider}] Sub-clip ${i + 1}/${subShots.length} failed: ${err.message}`);
      }
      // Pollinations free-tier only: replace failed clip with a still-frame so the
      // scene is not entirely empty (a static frame is better than a hard gap).
      try {
        const fbPrompt = encodeURIComponent(
          `${subShot.prompt.replace(/[^\x20-\x7E]/g, "").substring(0, 500)}, cinematic film still, professional lighting`
        );
        const fbUrl = `https://image.pollinations.ai/prompt/${fbPrompt}?width=1280&height=720&nologo=true&enhance=true&model=flux&seed=${Date.now()}`;
        const fbCheck = await fetch(fbUrl, { method: "HEAD", signal: AbortSignal.timeout(10000) });
        if (fbCheck.ok) {
          generatedClipUrls.push(fbUrl);
          console.warn(`[ExtendedScene] Sub-clip ${i + 1} replaced with Pollinations still-frame fallback`);
        }
      } catch {
        // Fallback also failed — continue with fewer clips
      }
      onProgress?.(i + 1, subShots.length, undefined);
    }
  }

  if (generatedClipUrls.length > 0 && generatedClipUrls.length < subShots.length) {
    console.warn(`[ExtendedScene] Scene ${request.sceneId}: partial render — ${generatedClipUrls.length}/${subShots.length} clips succeeded`);
  }

  if (generatedClipUrls.length === 0) {
    throw new Error("Failed to generate any sub-clips for this scene");
  }

  // Stitch sub-clips into a single scene video
  console.log(`[ExtendedScene] Stitching ${generatedClipUrls.length} sub-clips...`);
  const { videoUrl, duration } = await stitchSubClips(generatedClipUrls, request.projectId, request.sceneId);

  // Extract thumbnail from first clip
  const thumbnailUrl = await extractFirstFrame(generatedClipUrls[0], request.projectId, request.sceneId);

  console.log(`[ExtendedScene] Scene ${request.sceneId} complete: ${duration.toFixed(1)}s from ${generatedClipUrls.length} clips`);

  return {
    videoUrl,
    thumbnailUrl,
    totalDuration: duration,
    subClipCount: generatedClipUrls.length,
    clipsRequested: subShots.length,
    lastFrameUrl,
    provider: "byok",
  };
}

/**
 * Calculate the total number of API calls needed for a full film.
 * Useful for cost estimation and progress tracking.
 */
export function estimateFilmGenerationCalls(
  totalDurationMinutes: number,
  avgSceneDurationSeconds: number = 60,
  clipDurationSeconds: number = 15
): {
  totalScenes: number;
  clipsPerScene: number;
  totalClips: number;
  estimatedMinutes: number;
} {
  const totalSeconds = totalDurationMinutes * 60;
  const totalScenes = Math.ceil(totalSeconds / avgSceneDurationSeconds);
  const clipsPerScene = Math.ceil(avgSceneDurationSeconds / clipDurationSeconds);
  const totalClips = totalScenes * clipsPerScene;
  // Estimate ~30 seconds per clip generation on average
  const estimatedMinutes = Math.ceil((totalClips * 30) / 60);

  return { totalScenes, clipsPerScene, totalClips, estimatedMinutes };
}
