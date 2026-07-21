from pathlib import Path
import re


def read(path: str) -> str:
    return Path(path).read_text()


def write(path: str, value: str) -> None:
    Path(path).write_text(value)


def patch(path: str, old: str, new: str) -> None:
    value = read(path)
    if new in value:
        return
    if old not in value:
        raise RuntimeError(f"missing anchor: {path}")
    write(path, value.replace(old, new, 1))


path = "server/_core/videoStitcher.ts"
value = read(path)
if 'from "./remoteUrlSecurity"' not in value:
    value = value.replace(
        'import { logger } from "./logger";',
        'import { logger } from "./logger";\nimport { downloadPublicFile } from "./remoteUrlSecurity";',
        1,
    )
value, count = re.subn(
    r'async function downloadFile\(url: string, dest: string\): Promise<void> \{[\s\S]*?\n\}',
    lambda _: '''async function downloadFile(url: string, dest: string): Promise<void> {
  const downloaded = await downloadPublicFile(url, {
    maxBytes: 512 * 1024 * 1024,
    timeoutMs: 120_000,
    maxRedirects: 3,
    allowedContentTypePrefixes: ["video/", "audio/", "application/octet-stream"],
  });
  await fs.promises.writeFile(dest, downloaded.buffer);
}''',
    value,
    count=1,
)
if count != 1 and "downloadPublicFile(url" not in value:
    raise RuntimeError("video download helper")

value, count = re.subn(
    r'function escapeSubtitleText\(text: string\): string \{[\s\S]*?\n\}',
    lambda _: '''function normaliseMediaText(text: string, maxLength = 8_000): string {
  return String(text ?? "")
    .normalize("NFKC")
    .replace(/\\u0000/g, "")
    .replace(/[\\u0001-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F]/g, " ")
    .slice(0, maxLength);
}

function escapeFilterPath(filePath: string): string {
  return filePath
    .replace(/\\\\/g, "/")
    .replace(/'/g, "\\\\'")
    .replace(/:/g, "\\\\:")
    .replace(/,/g, "\\\\,")
    .replace(/;/g, "\\\\;")
    .replace(/\\[/g, "\\\\[")
    .replace(/\\]/g, "\\\\]");
}

function safeSubtitleText(text: string): string {
  return normaliseMediaText(text, 4_000)
    .replace(/<[^>]*>/g, "")
    .replace(/\\{[^}]*\\}/g, "")
    .replace(/\\r\\n?/g, "\\n")
    .split("\\n")
    .map(line => line.trim())
    .filter(Boolean)
    .join("\\n");
}''',
    value,
    count=1,
)
if count != 1 and "function normaliseMediaText" not in value:
    raise RuntimeError("video text helper")

new_title = '''async function generateTitleCard(
  tmpDir: string,
  title: string,
  directorName: string | undefined,
  genre: string | undefined,
  duration: number,
  resolution: { width: number; height: number },
): Promise<string> {
  const outputPath = path.join(tmpDir, "title_card.mp4");
  const titleFile = path.join(tmpDir, "title-card-title.txt");
  await fs.promises.writeFile(titleFile, normaliseMediaText(title, 500), "utf8");
  const filters: string[] = [
    `color=c=black:s=${resolution.width}x${resolution.height}:d=${duration}:r=24`,
    `drawtext=textfile='${escapeFilterPath(titleFile)}':fontsize=${Math.round(resolution.height / 10)}:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2-${Math.round(resolution.height / 15)}:alpha='if(lt(t,1.5),t/1.5,if(gt(t,${duration - 1.5}),(${duration}-t)/1.5,1))'`,
  ];
  if (directorName) {
    const file = path.join(tmpDir, "title-card-director.txt");
    await fs.promises.writeFile(file, `A Film by ${normaliseMediaText(directorName, 300)}`, "utf8");
    filters.push(`drawtext=textfile='${escapeFilterPath(file)}':fontsize=${Math.round(resolution.height / 20)}:fontcolor=0xCCCCCC:x=(w-text_w)/2:y=(h-text_h)/2+${Math.round(resolution.height / 10)}:alpha='if(lt(t,2),t/2,if(gt(t,${duration - 1.5}),(${duration}-t)/1.5,1))'`);
  }
  if (genre) {
    const file = path.join(tmpDir, "title-card-genre.txt");
    await fs.promises.writeFile(file, normaliseMediaText(genre, 200), "utf8");
    filters.push(`drawtext=textfile='${escapeFilterPath(file)}':fontsize=${Math.round(resolution.height / 30)}:fontcolor=0x888888:x=(w-text_w)/2:y=h-${Math.round(resolution.height / 8)}:alpha='if(lt(t,2.5),t/2.5,if(gt(t,${duration - 1}),(${duration}-t),1))'`);
  }
  await execFileAsync("ffmpeg", [
    "-f", "lavfi", "-i", filters.join(","),
    "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
    "-c:v", "libx264", "-preset", "slow", "-crf", "18",
    "-c:a", "aac", "-b:a", "320k", "-t", String(duration),
    "-pix_fmt", "yuv420p", "-y", outputPath,
  ], { timeout: 60_000 });
  logger.info(`[VideoStitcher] Title card generated (${duration}s)`);
  return outputPath;
}'''
value, count = re.subn(
    r'async function generateTitleCard\([\s\S]*?\n\}\n\n(?=// [^\n]*End Credits Generator)',
    lambda _: new_title + "\n\n",
    value,
    count=1,
)
if count != 1 and "title-card-title.txt" not in value:
    raise RuntimeError("title card")

new_credits = '''async function generateEndCredits(
  tmpDir: string,
  title: string,
  credits: CreditEntry[],
  duration: number,
  resolution: { width: number; height: number },
): Promise<string> {
  const outputPath = path.join(tmpDir, "end_credits.mp4");
  const creditsFile = path.join(tmpDir, "end-credits.txt");
  const safeCredits = credits.slice(0, 500).flatMap(entry => [
    normaliseMediaText(entry.role, 300),
    normaliseMediaText(entry.name, 300),
    "",
  ]);
  const fullText = [normaliseMediaText(title, 500), "", "", ...safeCredits, "Made with Virelle Studios", "www.virelle.life"].join("\\n");
  await fs.promises.writeFile(creditsFile, fullText, "utf8");
  const lineCount = safeCredits.length + 6;
  const totalScroll = resolution.height + lineCount * Math.round(resolution.height / 25);
  const filter = [
    `color=c=black:s=${resolution.width}x${resolution.height}:d=${duration}:r=24`,
    `drawtext=textfile='${escapeFilterPath(creditsFile)}':fontsize=${Math.round(resolution.height / 25)}:fontcolor=white:x=(w-text_w)/2:y=h-${totalScroll}*t/${duration}:line_spacing=${Math.round(resolution.height / 40)}`,
  ].join(",");
  await execFileAsync("ffmpeg", [
    "-f", "lavfi", "-i", filter,
    "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
    "-c:v", "libx264", "-preset", "slow", "-crf", "18",
    "-c:a", "aac", "-b:a", "320k", "-t", String(duration),
    "-pix_fmt", "yuv420p", "-y", outputPath,
  ], { timeout: 60_000 });
  logger.info(`[VideoStitcher] End credits generated (${duration}s, ${credits.length} entries)`);
  return outputPath;
}'''
value, count = re.subn(
    r'async function generateEndCredits\([\s\S]*?\n\}\n\n(?=// [^\n]*Per-Scene Audio Mixing)',
    lambda _: new_credits + "\n\n",
    value,
    count=1,
)
if count != 1 and "end-credits.txt" not in value:
    raise RuntimeError("end credits")

new_subtitles = '''async function burnSubtitlesIntoScene(
  tmpDir: string,
  sceneVideoPath: string,
  sceneIndex: number,
  subtitles: SceneSubtitle[],
  resolution: { width: number; height: number },
): Promise<string> {
  if (!subtitles?.length) return sceneVideoPath;
  const stamp = (seconds: number): string => {
    const safe = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
    const h = Math.floor(safe / 3600);
    const m = Math.floor((safe % 3600) / 60);
    const s = Math.floor(safe % 60);
    const ms = Math.min(999, Math.round((safe % 1) * 1000));
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
  };
  const srtPath = path.join(tmpDir, `subs_${sceneIndex}.srt`);
  const entries: string[] = [];
  for (const [index, subtitle] of subtitles.slice(0, 2_000).entries()) {
    const start = Math.max(0, Number.isFinite(subtitle.startTime) ? subtitle.startTime : 0);
    const candidate = Number.isFinite(subtitle.endTime) ? subtitle.endTime : start + 0.5;
    const end = Math.max(start + 0.05, candidate);
    const text = safeSubtitleText(subtitle.text);
    if (text) entries.push(`${index + 1}\\n${stamp(start)} --> ${stamp(end)}\\n${text}\\n`);
  }
  if (!entries.length) return sceneVideoPath;
  await fs.promises.writeFile(srtPath, `${entries.join("\\n")}\\n`, "utf8");
  const outputPath = path.join(tmpDir, `scene_subs_${String(sceneIndex).padStart(3, "0")}.mp4`);
  const fontSize = Math.round(resolution.height / 30);
  try {
    await execFileAsync("ffmpeg", [
      "-i", sceneVideoPath,
      "-vf", `subtitles='${escapeFilterPath(srtPath)}':force_style='FontSize=${fontSize},PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,Outline=2,Shadow=1,MarginV=40'`,
      "-c:v", "libx264", "-preset", "slow", "-crf", "18",
      "-c:a", "copy", "-y", outputPath,
    ], { timeout: 120_000 });
    logger.info(`[VideoStitcher] Scene ${sceneIndex}: burned ${entries.length} subtitles`);
    return outputPath;
  } catch (error) {
    logger.warn(`[VideoStitcher] Subtitle burn-in failed for scene ${sceneIndex}; using original.`, { error: String(error) });
    return sceneVideoPath;
  }
}'''
value, count = re.subn(
    r'async function burnSubtitlesIntoScene\([\s\S]*?\n\}\n\n(?=// [^\n]*Scene Transition Handling)',
    lambda _: new_subtitles + "\n\n",
    value,
    count=1,
)
if count != 1 and "entries.length} subtitles" not in value:
    raise RuntimeError("subtitles")
write(path, value)


path = "server/seo-engine.ts"
value = read(path)
if 'from "./_core/sanitize"' not in value:
    value = value.replace(
        'import { logger as log } from "./_core/logger";',
        'import { logger as log } from "./_core/logger";\nimport { stripHtml } from "./_core/sanitize";',
        1,
    )
value = value.replace(
    'const cleanContent = content.replace(/<[^>]+>/g, "").replace(/[#*_`]/g, "").trim();',
    'const cleanContent = stripHtml(content).replace(/[#*_`]/g, "").trim();',
    1,
)
write(path, value)

path = "server/routers.ts"
value = read(path)
value = value.replace(
    'import { sanitizeText } from "./_core/sanitize";',
    'import { sanitizeText, stripHtml } from "./_core/sanitize";',
    1,
)
value = value.replace(
    'snippet: r.snippet?.replace(/<[^>]+>/g, "") ?? "",',
    'snippet: stripHtml(r.snippet ?? ""),',
    1,
)
write(path, value)

path = "client/src/pages/Community.tsx"
write(path, read(path).replace(
    'if (!user || (!isPaid && user)) return <MembersOnlyWall />;',
    'if (!user || !isPaid) return <MembersOnlyWall />;',
    1,
))

path = "client/src/index.css"
value = read(path)
old = '''  /* Smooth momentum scrolling on iOS */
  * {
    -webkit-overflow-scrolling: touch;
  }'''
new = '''  /* Smooth momentum scrolling only on actual scroll containers. */
  [class*="overflow-y-auto"],
  [class*="overflow-x-auto"],
  [class*="overflow-auto"],
  [class*="overflow-scroll"] {
    -webkit-overflow-scrolling: touch;
  }'''
if old in value:
    value = value.replace(old, new, 1)
elif new not in value:
    raise RuntimeError("Safari scroll")
old = '''  .glass-dark {
    background: oklch(0.08 0.005 260 / 0.85);
    backdrop-filter: blur(20px) saturate(1.4);
    -webkit-backdrop-filter: blur(20px) saturate(1.4);
    border: 1px solid oklch(0.78 0.18 85 / 0.1);
  }'''
new = '''  .glass-dark {
    background: oklch(0.08 0.005 260 / 0.85);
    backdrop-filter: blur(20px) saturate(1.4);
    -webkit-backdrop-filter: blur(20px) saturate(1.4);
    border: 1px solid oklch(0.78 0.18 85 / 0.1);
    color: oklch(0.92 0.02 85);
    --foreground: oklch(0.92 0.02 85);
    --popover-foreground: oklch(0.92 0.02 85);
    --card-foreground: oklch(0.92 0.02 85);
    --muted-foreground: oklch(0.68 0.10 85);
    --accent-foreground: oklch(0.92 0.02 85);
    --border: oklch(0.4 0.03 85 / 0.4);
    --input: oklch(0.28 0.02 85 / 0.6);
  }'''
if old in value:
    value = value.replace(old, new, 1)
elif new not in value:
    raise RuntimeError("glass dark")
write(path, value)

patch(
    "client/src/components/DashboardLayout.tsx",
    "  BarChart3,\n  Camera,\n  ChevronDown,",
    "  BarChart3,\n  Camera,\n  Clapperboard,\n  ChevronDown,",
)
patch(
    "client/src/components/DashboardLayout.tsx",
    "  TrendingUp,\n  Users,\n  Wand2,",
    "  TrendingUp,\n  Users,\n  Users2,\n  Wand2,",
)
patch(
    "client/src/components/DashboardLayout.tsx",
    '      { icon: Globe, label: "Film Showcase", path: "/showcase" },\n      { icon: DollarSign, label: "Funding", path: "/funding" },',
    '      { icon: Globe, label: "Film Showcase", path: "/showcase" },\n      { icon: Clapperboard, label: "Project Samples", path: "/samples" },\n      { icon: DollarSign, label: "Funding", path: "/funding" },',
)
patch(
    "client/src/components/DashboardLayout.tsx",
    '      { icon: Wand2, label: "Campaigns", path: "/campaigns" },\n    ],',
    '      { icon: Wand2, label: "Campaigns", path: "/campaigns" },\n      { icon: Users2, label: "Community", path: "/community" },\n    ],',
)
patch(
    "client/src/components/ProjectToolHub.tsx",
    '        { title: "Production Office", description: "Central operating room for the project.", href: `/projects/${projectId}/production-office`, icon: Briefcase },\n        { title: "Pre-Production Panel",',
    '        { title: "Production Office", description: "Central operating room for the project.", href: `/projects/${projectId}/production-office`, icon: Briefcase },\n        { title: "Command Center", description: "Cross-department status, blockers and progress at a glance.", href: `/projects/${projectId}/command-center`, icon: SlidersHorizontal },\n        { title: "Pre-Production Panel",',
)
patch(
    "client/src/pages/Budget.tsx",
    '              <Button size="sm" variant="ghost" onClick={exportCSV} className="gap-1.5 h-8 text-xs text-muted-foreground"><Download className="h-3.5 w-3.5" />CSV</Button>',
    '              <Button size="sm" variant="ghost" onClick={() => navigate("/film-comps")} className="gap-1.5 h-8 text-xs text-muted-foreground">Film Comps</Button>\n              <Button size="sm" variant="ghost" onClick={() => navigate("/tax-incentives")} className="gap-1.5 h-8 text-xs text-muted-foreground">Tax Incentives</Button>\n              <Button size="sm" variant="ghost" onClick={exportCSV} className="gap-1.5 h-8 text-xs text-muted-foreground"><Download className="h-3.5 w-3.5" />CSV</Button>',
)
