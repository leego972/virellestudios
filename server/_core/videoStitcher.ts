/**
 * Video Stitcher v2.0 — Full Post-Production Pipeline
 *
 * Pipeline:
 * 1. Download all scene video clips + audio assets to temp directory
 * 2. Per-scene processing:
 *    a. Mix voice acting audio into scene video at correct timestamps
 *    b. Mix sound effects into scene audio at correct timestamps
 *    c. Apply subtitle burn-in if enabled
 * 3. Generate title card (opening) and end credits
 * 4. Concatenate all scenes with transitions (fade, dissolve, cut-to-black)
 * 5. Overlay soundtrack at background level
 * 6. Upload final MP4 to S3
 * 7. Clean up temp files
 */

import { execFile } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { storagePut } from "../storage";

const execFileAsync = promisify(execFile);

// ─── Types ───

export interface SceneAudio {
  /** Voice acting audio URL for this scene */
  voiceUrl?: string;
  /** Voice volume 0-1 */
  voiceVolume?: number;
}

export interface SceneSoundEffect {
  /** SFX audio file URL */
  fileUrl: string;
  /** Start time within the scene (seconds) */
  startTime: number;
  /** Volume 0-1 */
  volume: number;
  /** Whether to loop for the duration of the scene */
  loop: boolean;
  /** Name for logging */
  name?: string;
}

export interface SceneSubtitle {
  /** Start time within the scene (seconds) */
  startTime: number;
  /** End time within the scene (seconds) */
  endTime: number;
  /** Subtitle text */
  text: string;
}

export interface SceneInput {
  videoUrl: string;
  title?: string;
  duration?: number;
  orderIndex: number;
  /** Voice acting audio for this scene */
  voiceAudio?: SceneAudio;
  /** Sound effects assigned to this scene */
  soundEffects?: SceneSoundEffect[];
  /** Subtitles for this scene */
  subtitles?: SceneSubtitle[];
  /** Transition to next scene: "cut" | "fade" | "dissolve" | "fade-to-black" */
  transition?: string;
  /** Transition duration in seconds (default 1) */
  transitionDuration?: number;
}

export interface CreditEntry {
  role: string;
  name: string;
}

export interface StitchInput {
  scenes: SceneInput[];
  projectTitle: string;
  userId: number;
  projectId: number;
  /** Optional soundtrack URL to overlay */
  soundtrackUrl?: string;
  /** Soundtrack volume 0-100 (default 20 = background level) */
  soundtrackVolume?: number;
  /** Enable subtitle burn-in */
  burnSubtitles?: boolean;
  /** Generate opening title card */
  showTitleCard?: boolean;
  /** Title card duration in seconds (default 5) */
  titleCardDuration?: number;
  /** Generate end credits roll */
  showCredits?: boolean;
  /** Credits entries */
  credits?: CreditEntry[];
  /** Credits duration in seconds (default 30) */
  creditsDuration?: number;
  /** Film genre (affects title card style) */
  genre?: string;
  /** Director name for title card */
  directorName?: string;
  /** Output resolution: "1080p" | "720p" | "480p" | "4k" */
  resolution?: string;
}

export interface StitchResult {
  fileUrl: string;
  fileKey: string;
  fileSize: number;
  duration: number;
  mimeType: string;
}

// ─── Helpers ───

async function downloadFile(url: string, dest: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download ${url}: ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.promises.writeFile(dest, buffer);
}

async function getVideoDuration(filePath: string): Promise<number> {
  try {
    const { stdout } = await execFileAsync("ffprobe", [
      "-v", "quiet",
      "-print_format", "json",
      "-show_format",
      filePath,
    ], { timeout: 30000 });
    const info = JSON.parse(stdout);
    return parseFloat(info.format?.duration || "0");
  } catch {
    return 0;
  }
}

function getResolution(res?: string): { width: number; height: number } {
  switch (res) {
    case "4k": return { width: 3840, height: 2160 };
    case "1080p": return { width: 1920, height: 1080 };
    case "720p": return { width: 1280, height: 720 };
    case "480p": return { width: 854, height: 480 };
    default: return { width: 1920, height: 1080 };
  }
}

function escapeSubtitleText(text: string): string {
  // Escape special characters for ffmpeg drawtext
  return text
    .replace(/\\/g, "\\\\\\\\")
    .replace(/'/g, "\u2019")
    .replace(/:/g, "\\:")
    .replace(/%/g, "%%");
}

// ─── Title Card Generator ───

async function generateTitleCard(
  tmpDir: string,
  title: string,
  directorName: string | undefined,
  genre: string | undefined,
  duration: number,
  resolution: { width: number; height: number },
): Promise<string> {
  const outputPath = path.join(tmpDir, "title_card.mp4");
  const escapedTitle = escapeSubtitleText(title);
  const escapedDirector = directorName ? escapeSubtitleText(directorName) : "";

  // Build drawtext filters for title card
  const filters: string[] = [];

  // Black background
  filters.push(`color=c=black:s=${resolution.width}x${resolution.height}:d=${duration}:r=24`);

  // Title text — large, centered, fade in
  let drawtext = `drawtext=text='${escapedTitle}':fontsize=${Math.round(resolution.height / 10)}:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2-${Math.round(resolution.height / 15)}:alpha='if(lt(t,1.5),t/1.5,if(gt(t,${duration - 1.5}),( ${duration}-t)/1.5,1))'`;
  filters.push(drawtext);

  // Director credit below title
  if (escapedDirector) {
    const dirText = `drawtext=text='A Film by ${escapedDirector}':fontsize=${Math.round(resolution.height / 20)}:fontcolor=0xCCCCCC:x=(w-text_w)/2:y=(h-text_h)/2+${Math.round(resolution.height / 10)}:alpha='if(lt(t,2),t/2,if(gt(t,${duration - 1.5}),(${duration}-t)/1.5,1))'`;
    filters.push(dirText);
  }

  // Genre tag at bottom
  if (genre) {
    const genreText = `drawtext=text='${escapeSubtitleText(genre)}':fontsize=${Math.round(resolution.height / 30)}:fontcolor=0x888888:x=(w-text_w)/2:y=h-${Math.round(resolution.height / 8)}:alpha='if(lt(t,2.5),t/2.5,if(gt(t,${duration - 1}),(${duration}-t)/1,1))'`;
    filters.push(genreText);
  }

  const filterComplex = filters.join(",");

  await execFileAsync("ffmpeg", [
    "-f", "lavfi",
    "-i", filterComplex,
    "-f", "lavfi",
    "-i", `anullsrc=channel_layout=stereo:sample_rate=44100`,
    "-c:v", "libx264",
    "-preset", "fast",
    "-crf", "23",
    "-c:a", "aac",
    "-b:a", "128k",
    "-t", String(duration),
    "-pix_fmt", "yuv420p",
    "-y",
    outputPath,
  ], { timeout: 60000 });

  console.log(`[VideoStitcher] Title card generated (${duration}s)`);
  return outputPath;
}

// ─── End Credits Generator ───

async function generateEndCredits(
  tmpDir: string,
  title: string,
  credits: CreditEntry[],
  duration: number,
  resolution: { width: number; height: number },
): Promise<string> {
  const outputPath = path.join(tmpDir, "end_credits.mp4");
  const escapedTitle = escapeSubtitleText(title);

  // Build a scrolling credits text
  const creditLines = credits.map(c => `${c.role}\\n${c.name}\\n`).join("\\n");
  const fullText = `${escapedTitle}\\n\\n\\n${creditLines}\\nMade with Virelle Studios\\nwww.virelle.life`;

  // Calculate scroll speed: text needs to scroll from bottom to top over the duration
  const lineCount = credits.length * 3 + 6; // approximate line count
  const textHeight = lineCount * Math.round(resolution.height / 25);
  const totalScroll = resolution.height + textHeight;
  // y position: starts at bottom (h), scrolls up to (-textHeight)
  // y = h - (h + textHeight) * t / duration = h - totalScroll * t / duration

  const filterComplex = [
    `color=c=black:s=${resolution.width}x${resolution.height}:d=${duration}:r=24`,
    `drawtext=text='${fullText}':fontsize=${Math.round(resolution.height / 25)}:fontcolor=white:x=(w-text_w)/2:y=h-${totalScroll}*t/${duration}:line_spacing=${Math.round(resolution.height / 40)}`,
  ].join(",");

  await execFileAsync("ffmpeg", [
    "-f", "lavfi",
    "-i", filterComplex,
    "-f", "lavfi",
    "-i", `anullsrc=channel_layout=stereo:sample_rate=44100`,
    "-c:v", "libx264",
    "-preset", "fast",
    "-crf", "23",
    "-c:a", "aac",
    "-b:a", "128k",
    "-t", String(duration),
    "-pix_fmt", "yuv420p",
    "-y",
    outputPath,
  ], { timeout: 60000 });

  console.log(`[VideoStitcher] End credits generated (${duration}s, ${credits.length} entries)`);
  return outputPath;
}

// ─── Per-Scene Audio Mixing ───

async function processSceneAudio(
  tmpDir: string,
  sceneVideoPath: string,
  sceneIndex: number,
  voiceAudio?: SceneAudio,
  soundEffects?: SceneSoundEffect[],
): Promise<string> {
  const hasSFX = soundEffects && soundEffects.length > 0;
  const hasVoice = voiceAudio?.voiceUrl;

  if (!hasSFX && !hasVoice) {
    return sceneVideoPath; // No audio to mix, return original
  }

  const outputPath = path.join(tmpDir, `scene_mixed_${String(sceneIndex).padStart(3, "0")}.mp4`);
  const inputArgs: string[] = ["-i", sceneVideoPath];
  const filterParts: string[] = [];
  let audioInputIndex = 1;

  // Download and add voice audio
  if (hasVoice) {
    const voicePath = path.join(tmpDir, `voice_${sceneIndex}.mp3`);
    await downloadFile(voiceAudio!.voiceUrl!, voicePath);
    inputArgs.push("-i", voicePath);

    const vol = (voiceAudio!.voiceVolume ?? 0.9).toFixed(2);
    filterParts.push(`[${audioInputIndex}:a]volume=${vol}[voice${sceneIndex}]`);
    audioInputIndex++;
  }

  // Download and add sound effects
  const sfxLabels: string[] = [];
  if (hasSFX) {
    for (let i = 0; i < soundEffects!.length; i++) {
      const sfx = soundEffects![i];
      if (!sfx.fileUrl) continue;

      const sfxPath = path.join(tmpDir, `sfx_${sceneIndex}_${i}.mp3`);
      try {
        await downloadFile(sfx.fileUrl, sfxPath);
      } catch (e) {
        console.log(`[VideoStitcher] Warning: Could not download SFX "${sfx.name}": ${e}`);
        continue;
      }

      inputArgs.push("-i", sfxPath);
      const vol = (sfx.volume ?? 0.5).toFixed(2);
      const delay = Math.round((sfx.startTime || 0) * 1000); // ms
      const label = `sfx${sceneIndex}_${i}`;

      if (sfx.loop) {
        filterParts.push(`[${audioInputIndex}:a]aloop=loop=-1:size=2e+09,volume=${vol},adelay=${delay}|${delay}[${label}]`);
      } else {
        filterParts.push(`[${audioInputIndex}:a]volume=${vol},adelay=${delay}|${delay}[${label}]`);
      }
      sfxLabels.push(`[${label}]`);
      audioInputIndex++;
    }
  }

  // Build the amix filter
  const allAudioLabels: string[] = ["[0:a]"];
  if (hasVoice) allAudioLabels.push(`[voice${sceneIndex}]`);
  allAudioLabels.push(...sfxLabels);

  if (allAudioLabels.length <= 1) {
    return sceneVideoPath; // No valid audio files to mix
  }

  const mixFilter = `${filterParts.join(";")};${allAudioLabels.join("")}amix=inputs=${allAudioLabels.length}:duration=first:dropout_transition=2[aout]`;

  const ffmpegArgs = [
    ...inputArgs,
    "-filter_complex", mixFilter,
    "-map", "0:v",
    "-map", "[aout]",
    "-c:v", "copy",
    "-c:a", "aac",
    "-b:a", "192k",
    "-shortest",
    "-y",
    outputPath,
  ];

  try {
    await execFileAsync("ffmpeg", ffmpegArgs, { timeout: 120000 });
    console.log(`[VideoStitcher] Scene ${sceneIndex}: mixed ${hasVoice ? "voice + " : ""}${sfxLabels.length} SFX`);
    return outputPath;
  } catch (e) {
    console.log(`[VideoStitcher] Warning: Audio mixing failed for scene ${sceneIndex}, using original: ${e}`);
    return sceneVideoPath; // Fallback to original if mixing fails
  }
}

// ─── Subtitle Burn-in ───

async function burnSubtitlesIntoScene(
  tmpDir: string,
  sceneVideoPath: string,
  sceneIndex: number,
  subtitles: SceneSubtitle[],
  resolution: { width: number; height: number },
): Promise<string> {
  if (!subtitles || subtitles.length === 0) return sceneVideoPath;

  // Generate SRT file for this scene
  const srtPath = path.join(tmpDir, `subs_${sceneIndex}.srt`);
  let srtContent = "";
  for (let i = 0; i < subtitles.length; i++) {
    const sub = subtitles[i];
    const startH = Math.floor(sub.startTime / 3600);
    const startM = Math.floor((sub.startTime % 3600) / 60);
    const startS = Math.floor(sub.startTime % 60);
    const startMs = Math.round((sub.startTime % 1) * 1000);
    const endH = Math.floor(sub.endTime / 3600);
    const endM = Math.floor((sub.endTime % 3600) / 60);
    const endS = Math.floor(sub.endTime % 60);
    const endMs = Math.round((sub.endTime % 1) * 1000);

    srtContent += `${i + 1}\n`;
    srtContent += `${String(startH).padStart(2, "0")}:${String(startM).padStart(2, "0")}:${String(startS).padStart(2, "0")},${String(startMs).padStart(3, "0")} --> `;
    srtContent += `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}:${String(endS).padStart(2, "0")},${String(endMs).padStart(3, "0")}\n`;
    srtContent += `${sub.text}\n\n`;
  }

  await fs.promises.writeFile(srtPath, srtContent, "utf-8");

  const outputPath = path.join(tmpDir, `scene_subs_${String(sceneIndex).padStart(3, "0")}.mp4`);
  const fontSize = Math.round(resolution.height / 30);

  // Use subtitles filter to burn in SRT
  // Escape the path for ffmpeg filter (replace backslashes and colons)
  const escapedSrtPath = srtPath.replace(/\\/g, "/").replace(/:/g, "\\:");

  try {
    await execFileAsync("ffmpeg", [
      "-i", sceneVideoPath,
      "-vf", `subtitles='${escapedSrtPath}':force_style='FontSize=${fontSize},PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,Outline=2,Shadow=1,MarginV=40'`,
      "-c:v", "libx264",
      "-preset", "fast",
      "-crf", "23",
      "-c:a", "copy",
      "-y",
      outputPath,
    ], { timeout: 120000 });

    console.log(`[VideoStitcher] Scene ${sceneIndex}: burned ${subtitles.length} subtitles`);
    return outputPath;
  } catch (e) {
    console.log(`[VideoStitcher] Warning: Subtitle burn-in failed for scene ${sceneIndex}: ${e}`);
    return sceneVideoPath;
  }
}

// ─── Scene Transition Handling ───

function buildTransitionFilter(
  transition: string,
  transitionDuration: number,
  sceneDuration: number,
): string | null {
  const td = Math.min(transitionDuration, sceneDuration / 2);

  switch (transition) {
    case "fade":
      // Fade out at end of scene
      return `fade=t=out:st=${(sceneDuration - td).toFixed(2)}:d=${td.toFixed(2)}`;
    case "fade-to-black":
      // Fade in at start, fade out at end
      return `fade=t=in:st=0:d=${td.toFixed(2)},fade=t=out:st=${(sceneDuration - td).toFixed(2)}:d=${td.toFixed(2)}`;
    case "dissolve":
      // Fade out (dissolve is handled by overlapping with next scene's fade-in)
      return `fade=t=out:st=${(sceneDuration - td).toFixed(2)}:d=${td.toFixed(2)}`;
    default:
      return null; // "cut" = no transition filter
  }
}

// ─── Main Stitch Function ───

export async function stitchMovie(input: StitchInput): Promise<StitchResult> {
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "virelle-stitch-"));
  const resolution = getResolution(input.resolution);

  try {
    // Sort scenes by orderIndex
    const sortedScenes = [...input.scenes].sort((a, b) => a.orderIndex - b.orderIndex);
    const scenesWithVideo = sortedScenes.filter((s) => s.videoUrl);

    if (scenesWithVideo.length === 0) {
      throw new Error("No scenes have generated video clips. Generate videos for your scenes first.");
    }

    console.log(`[VideoStitcher] Starting post-production for "${input.projectTitle}" — ${scenesWithVideo.length} scenes`);

    // ═══════════════════════════════════════════════════════
    // PHASE 1: Download all scene videos
    // ═══════════════════════════════════════════════════════
    const localFiles: string[] = [];
    for (let i = 0; i < scenesWithVideo.length; i++) {
      const scene = scenesWithVideo[i];
      const localPath = path.join(tmpDir, `scene_raw_${String(i).padStart(3, "0")}.mp4`);
      console.log(`[VideoStitcher] Downloading scene ${i + 1}/${scenesWithVideo.length}: ${scene.title || "Untitled"}`);
      await downloadFile(scene.videoUrl, localPath);
      localFiles.push(localPath);
    }

    // ═══════════════════════════════════════════════════════
    // PHASE 2: Per-scene audio mixing (voice + SFX)
    // ═══════════════════════════════════════════════════════
    console.log(`[VideoStitcher] Phase 2: Mixing audio per scene...`);
    const audioMixedFiles: string[] = [];
    for (let i = 0; i < localFiles.length; i++) {
      const scene = scenesWithVideo[i];
      const mixed = await processSceneAudio(
        tmpDir,
        localFiles[i],
        i,
        scene.voiceAudio,
        scene.soundEffects,
      );
      audioMixedFiles.push(mixed);
    }

    // ═══════════════════════════════════════════════════════
    // PHASE 3: Subtitle burn-in (if enabled)
    // ═══════════════════════════════════════════════════════
    let subtitledFiles = audioMixedFiles;
    if (input.burnSubtitles) {
      console.log(`[VideoStitcher] Phase 3: Burning subtitles...`);
      subtitledFiles = [];
      for (let i = 0; i < audioMixedFiles.length; i++) {
        const scene = scenesWithVideo[i];
        const subbed = await burnSubtitlesIntoScene(
          tmpDir,
          audioMixedFiles[i],
          i,
          scene.subtitles || [],
          resolution,
        );
        subtitledFiles.push(subbed);
      }
    }

    // ═══════════════════════════════════════════════════════
    // PHASE 4: Normalize all clips to consistent format + apply transitions
    // ═══════════════════════════════════════════════════════
    console.log(`[VideoStitcher] Phase 4: Normalizing clips and applying transitions...`);
    const normalizedFiles: string[] = [];

    // Generate title card if requested
    if (input.showTitleCard) {
      const titleDuration = input.titleCardDuration || 5;
      const titleCard = await generateTitleCard(
        tmpDir,
        input.projectTitle,
        input.directorName,
        input.genre,
        titleDuration,
        resolution,
      );
      const normalizedTitle = path.join(tmpDir, "norm_title.ts");
      await execFileAsync("ffmpeg", [
        "-i", titleCard,
        "-c:v", "libx264", "-preset", "fast", "-crf", "23",
        "-vf", `scale=${resolution.width}:${resolution.height}:force_original_aspect_ratio=decrease,pad=${resolution.width}:${resolution.height}:(ow-iw)/2:(oh-ih)/2,setsar=1,fade=t=in:st=0:d=1.5,fade=t=out:st=${(titleDuration - 1.5).toFixed(1)}:d=1.5`,
        "-r", "24", "-c:a", "aac", "-ar", "44100", "-ac", "2", "-b:a", "128k",
        "-f", "mpegts", "-y", normalizedTitle,
      ], { timeout: 60000 });
      normalizedFiles.push(normalizedTitle);
    }

    // Normalize each scene clip
    for (let i = 0; i < subtitledFiles.length; i++) {
      const normalized = path.join(tmpDir, `norm_${String(i).padStart(3, "0")}.ts`);
      const scene = scenesWithVideo[i];
      const sceneDuration = await getVideoDuration(subtitledFiles[i]);

      // Build video filter with transitions
      let vf = `scale=${resolution.width}:${resolution.height}:force_original_aspect_ratio=decrease,pad=${resolution.width}:${resolution.height}:(ow-iw)/2:(oh-ih)/2,setsar=1`;

      const transition = scene.transition || "fade";
      const transitionDuration = scene.transitionDuration || 0.8;
      const transFilter = buildTransitionFilter(transition, transitionDuration, sceneDuration > 0 ? sceneDuration : 10);
      if (transFilter) {
        vf += `,${transFilter}`;
      }

      // Add fade-in for first scene
      if (i === 0 && !input.showTitleCard) {
        vf += `,fade=t=in:st=0:d=1`;
      }

      await execFileAsync("ffmpeg", [
        "-i", subtitledFiles[i],
        "-c:v", "libx264", "-preset", "fast", "-crf", "23",
        "-vf", vf,
        "-r", "24", "-c:a", "aac", "-ar", "44100", "-ac", "2", "-b:a", "128k",
        "-f", "mpegts", "-y", normalized,
      ], { timeout: 120000 });
      normalizedFiles.push(normalized);
    }

    // Generate end credits if requested
    if (input.showCredits && input.credits && input.credits.length > 0) {
      const creditsDuration = input.creditsDuration || 30;
      const creditsVideo = await generateEndCredits(
        tmpDir,
        input.projectTitle,
        input.credits,
        creditsDuration,
        resolution,
      );
      const normalizedCredits = path.join(tmpDir, "norm_credits.ts");
      await execFileAsync("ffmpeg", [
        "-i", creditsVideo,
        "-c:v", "libx264", "-preset", "fast", "-crf", "23",
        "-vf", `scale=${resolution.width}:${resolution.height}:force_original_aspect_ratio=decrease,pad=${resolution.width}:${resolution.height}:(ow-iw)/2:(oh-ih)/2,setsar=1,fade=t=in:st=0:d=1.5`,
        "-r", "24", "-c:a", "aac", "-ar", "44100", "-ac", "2", "-b:a", "128k",
        "-f", "mpegts", "-y", normalizedCredits,
      ], { timeout: 60000 });
      normalizedFiles.push(normalizedCredits);
    }

    // ═══════════════════════════════════════════════════════
    // PHASE 5: Concatenate all clips
    // ═══════════════════════════════════════════════════════
    console.log(`[VideoStitcher] Phase 5: Concatenating ${normalizedFiles.length} clips...`);
    const concatInput = normalizedFiles.join("|");
    const outputPath = path.join(tmpDir, "final_movie.mp4");

    await execFileAsync("ffmpeg", [
      "-i", `concat:${concatInput}`,
      "-c:v", "libx264", "-preset", "fast", "-crf", "22",
      "-c:a", "aac", "-b:a", "192k",
      "-movflags", "+faststart",
      "-y", outputPath,
    ], { timeout: 600000 }); // 10 min timeout for long films

    // ═══════════════════════════════════════════════════════
    // PHASE 6: Overlay soundtrack
    // ═══════════════════════════════════════════════════════
    if (input.soundtrackUrl) {
      console.log(`[VideoStitcher] Phase 6: Overlaying soundtrack...`);
      const soundtrackPath = path.join(tmpDir, "soundtrack.mp3");
      await downloadFile(input.soundtrackUrl, soundtrackPath);

      const withSoundtrack = path.join(tmpDir, "final_with_soundtrack.mp4");
      const vol = ((input.soundtrackVolume || 20) / 100).toFixed(2);

      await execFileAsync("ffmpeg", [
        "-i", outputPath,
        "-i", soundtrackPath,
        "-filter_complex", `[1:a]volume=${vol},aloop=loop=-1:size=2e+09[bg];[0:a][bg]amix=inputs=2:duration=first:dropout_transition=3[aout]`,
        "-map", "0:v",
        "-map", "[aout]",
        "-c:v", "copy",
        "-c:a", "aac",
        "-b:a", "192k",
        "-movflags", "+faststart",
        "-shortest",
        "-y",
        withSoundtrack,
      ], { timeout: 600000 });

      await fs.promises.rename(withSoundtrack, outputPath);
      console.log(`[VideoStitcher] Soundtrack overlaid at ${vol} volume`);
    }

    // ═══════════════════════════════════════════════════════
    // PHASE 7: Get final info and upload
    // ═══════════════════════════════════════════════════════
    const stats = await fs.promises.stat(outputPath);
    const duration = await getVideoDuration(outputPath);

    const fileKey = `movies/${input.userId}/${input.projectId}/full-film-${Date.now()}.mp4`;
    const fileBuffer = await fs.promises.readFile(outputPath);
    const { url } = await storagePut(fileKey, fileBuffer, "video/mp4");

    console.log(`[VideoStitcher] ✅ Post-production complete: ${url}`);
    console.log(`[VideoStitcher]    Size: ${(stats.size / 1024 / 1024).toFixed(1)} MB`);
    console.log(`[VideoStitcher]    Duration: ${Math.floor(duration / 60)}m ${Math.round(duration % 60)}s`);
    console.log(`[VideoStitcher]    Resolution: ${resolution.width}x${resolution.height}`);
    console.log(`[VideoStitcher]    Scenes: ${scenesWithVideo.length}`);

    return {
      fileUrl: url,
      fileKey,
      fileSize: stats.size,
      duration: Math.round(duration),
      mimeType: "video/mp4",
    };
  } finally {
    try {
      await fs.promises.rm(tmpDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  }
}
