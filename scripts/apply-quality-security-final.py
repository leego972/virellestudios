from pathlib import Path
import re


def read(path: str) -> str:
    return Path(path).read_text()


def write(path: str, content: str) -> None:
    Path(path).write_text(content)


def replace_once(path: str, old: str, new: str) -> None:
    content = read(path)
    if new in content:
        return
    count = content.count(old)
    if count != 1:
        raise RuntimeError(f"{path}: expected one replacement anchor, found {count}")
    write(path, content.replace(old, new, 1))


# Pin validated DNS results into the actual HTTPS socket so a hostname cannot
# resolve publicly during validation and then rebind to an internal address.
write(
    "server/_core/remoteUrlSecurity.ts",
    r'''import { lookup } from "node:dns/promises";
import https from "node:https";
import type { IncomingMessage } from "node:http";
import { isIP } from "node:net";

export interface DownloadPublicFileOptions {
  maxBytes: number;
  allowedContentTypePrefixes?: string[];
  timeoutMs?: number;
  maxRedirects?: number;
}

type PublicTarget = {
  url: URL;
  address: string;
  family: 4 | 6;
};

function normalizedHostname(url: URL): string {
  return url.hostname.toLowerCase().replace(/^\[/, "").replace(/\]$/, "").replace(/\.$/, "");
}

function isPrivateIpv4(address: string): boolean {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some(part => !Number.isInteger(part) || part < 0 || part > 255)) return true;
  const [a, b, c] = parts;
  return a === 0 || a === 10 || a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && c === 0) ||
    (a === 192 && b === 0 && c === 2) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    a >= 224;
}

function isPrivateIpv6(address: string): boolean {
  const normalized = address.toLowerCase().split("%")[0];
  if (normalized.startsWith("::ffff:")) {
    const mapped = normalized.slice("::ffff:".length);
    return isIP(mapped) !== 4 || isPrivateIpv4(mapped);
  }
  const firstHextet = Number.parseInt(normalized.split(":", 1)[0] || "0", 16);
  return normalized === "::" || normalized === "::1" ||
    normalized.startsWith("fc") || normalized.startsWith("fd") ||
    (Number.isFinite(firstHextet) && (firstHextet & 0xffc0) === 0xfe80) ||
    normalized.startsWith("ff") || normalized.startsWith("2001:db8:");
}

function isPrivateAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) return isPrivateIpv4(address);
  if (version === 6) return isPrivateIpv6(address);
  return true;
}

export function hasExactHttpsHostname(rawUrl: string, allowedHostnames: readonly string[]): boolean {
  try {
    const url = new URL(rawUrl);
    const hostname = normalizedHostname(url);
    return url.protocol === "https:" && !url.username && !url.password &&
      allowedHostnames.some(host => hostname === host.toLowerCase().replace(/\.$/, ""));
  } catch {
    return false;
  }
}

async function resolvePublicTarget(rawUrl: string): Promise<PublicTarget> {
  const url = new URL(rawUrl);
  if (url.protocol !== "https:" || url.username || url.password) {
    throw new Error("Only credential-free HTTPS URLs are permitted.");
  }

  const hostname = normalizedHostname(url);
  if (!hostname || hostname === "localhost" || hostname.endsWith(".localhost") ||
      hostname.endsWith(".local") || hostname.endsWith(".internal")) {
    throw new Error("Local and internal hosts are not permitted.");
  }

  const literalFamily = isIP(hostname);
  if (literalFamily) {
    if (isPrivateAddress(hostname)) throw new Error("Private or reserved network addresses are not permitted.");
    return { url, address: hostname, family: literalFamily as 4 | 6 };
  }

  const addresses = await lookup(hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new Error("The URL resolves to a private, reserved or invalid network address.");
  }
  const selected = addresses[0];
  return { url, address: selected.address, family: selected.family as 4 | 6 };
}

export async function validatePublicHttpsUrl(rawUrl: string): Promise<URL> {
  return (await resolvePublicTarget(rawUrl)).url;
}

function requestPinned(target: PublicTarget, timeoutMs: number): Promise<IncomingMessage> {
  return new Promise((resolve, reject) => {
    const hostname = normalizedHostname(target.url);
    const request = https.request({
      protocol: "https:",
      hostname,
      port: target.url.port ? Number(target.url.port) : 443,
      path: `${target.url.pathname}${target.url.search}`,
      method: "GET",
      headers: {
        Accept: "audio/*,video/*,image/*,application/octet-stream;q=0.8,*/*;q=0.1",
        "User-Agent": "Virelle-Remote-Media/1.0",
      },
      ...(isIP(hostname) ? {} : { servername: hostname }),
      lookup: ((_host: string, _options: unknown, callback: (error: NodeJS.ErrnoException | null, address: string, family: number) => void) => {
        callback(null, target.address, target.family);
      }) as any,
      rejectUnauthorized: true,
    }, resolve);
    request.setTimeout(timeoutMs, () => request.destroy(new Error("Remote file request timed out.")));
    request.once("error", reject);
    request.end();
  });
}

function headerValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export async function downloadPublicFile(
  rawUrl: string,
  options: DownloadPublicFileOptions,
): Promise<{ buffer: Buffer; contentType: string; finalUrl: string }> {
  const maxRedirects = Math.max(0, Math.min(5, options.maxRedirects ?? 3));
  const timeoutMs = Math.max(1_000, Math.min(120_000, options.timeoutMs ?? 30_000));
  let current = rawUrl;

  for (let redirect = 0; redirect <= maxRedirects; redirect++) {
    const target = await resolvePublicTarget(current);
    const response = await requestPinned(target, timeoutMs);
    const status = response.statusCode ?? 0;

    if ([301, 302, 303, 307, 308].includes(status)) {
      const location = headerValue(response.headers.location);
      response.resume();
      if (!location || redirect === maxRedirects) throw new Error("Too many or invalid redirects.");
      current = new URL(location, target.url).toString();
      continue;
    }
    if (status < 200 || status >= 300) {
      response.resume();
      throw new Error(`Remote file request failed with HTTP ${status}.`);
    }

    const contentType = (headerValue(response.headers["content-type"]) || "application/octet-stream")
      .split(";")[0].trim().toLowerCase();
    const prefixes = options.allowedContentTypePrefixes ?? [];
    if (prefixes.length && !prefixes.some(prefix => contentType.startsWith(prefix))) {
      response.resume();
      throw new Error(`Remote file type ${contentType} is not permitted.`);
    }

    const declaredLength = Number(headerValue(response.headers["content-length"]) || 0);
    if (Number.isFinite(declaredLength) && declaredLength > options.maxBytes) {
      response.resume();
      throw new Error("Remote file exceeds the maximum permitted size.");
    }

    const chunks: Buffer[] = [];
    let total = 0;
    for await (const chunk of response) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      total += buffer.length;
      if (total > options.maxBytes) {
        response.destroy();
        throw new Error("Remote file exceeds the maximum permitted size.");
      }
      chunks.push(buffer);
    }
    return { buffer: Buffer.concat(chunks), contentType, finalUrl: target.url.toString() };
  }
  throw new Error("Remote file download failed.");
}
''',
)


video_path = "server/_core/videoStitcher.ts"
video = read(video_path)
if 'from "./remoteUrlSecurity"' not in video:
    video = video.replace(
        'import { logger } from "./logger";',
        'import { logger } from "./logger";\nimport { downloadPublicFile } from "./remoteUrlSecurity";',
        1,
    )

video = re.sub(
    r'async function downloadFile\(url: string, dest: string\): Promise<void> \{[\s\S]*?\n\}',
    '''async function downloadFile(url: string, dest: string): Promise<void> {
  const downloaded = await downloadPublicFile(url, {
    maxBytes: 512 * 1024 * 1024,
    timeoutMs: 120_000,
    maxRedirects: 3,
    allowedContentTypePrefixes: ["video/", "audio/", "application/octet-stream"],
  });
  await fs.promises.writeFile(dest, downloaded.buffer);
}''',
    video,
    count=1,
)

video = re.sub(
    r'function escapeSubtitleText\(text: string\): string \{[\s\S]*?\n\}',
    '''function normaliseMediaText(text: string, maxLength = 8_000): string {
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
    video,
    count=1,
)

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
    const directorFile = path.join(tmpDir, "title-card-director.txt");
    await fs.promises.writeFile(directorFile, `A Film by ${normaliseMediaText(directorName, 300)}`, "utf8");
    filters.push(`drawtext=textfile='${escapeFilterPath(directorFile)}':fontsize=${Math.round(resolution.height / 20)}:fontcolor=0xCCCCCC:x=(w-text_w)/2:y=(h-text_h)/2+${Math.round(resolution.height / 10)}:alpha='if(lt(t,2),t/2,if(gt(t,${duration - 1.5}),(${duration}-t)/1.5,1))'`);
  }

  if (genre) {
    const genreFile = path.join(tmpDir, "title-card-genre.txt");
    await fs.promises.writeFile(genreFile, normaliseMediaText(genre, 200), "utf8");
    filters.push(`drawtext=textfile='${escapeFilterPath(genreFile)}':fontsize=${Math.round(resolution.height / 30)}:fontcolor=0x888888:x=(w-text_w)/2:y=h-${Math.round(resolution.height / 8)}:alpha='if(lt(t,2.5),t/2.5,if(gt(t,${duration - 1}),(${duration}-t),1))'`);
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
video, count = re.subn(
    r'async function generateTitleCard\([\s\S]*?\n\}\n\n// [^\n]*End Credits Generator[^\n]*',
    new_title + '\n\n// End Credits Generator',
    video,
    count=1,
)
if count != 1:
    raise RuntimeError("videoStitcher: title-card function anchor not found")

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
  const textHeight = lineCount * Math.round(resolution.height / 25);
  const totalScroll = resolution.height + textHeight;
  const filterComplex = [
    `color=c=black:s=${resolution.width}x${resolution.height}:d=${duration}:r=24`,
    `drawtext=textfile='${escapeFilterPath(creditsFile)}':fontsize=${Math.round(resolution.height / 25)}:fontcolor=white:x=(w-text_w)/2:y=h-${totalScroll}*t/${duration}:line_spacing=${Math.round(resolution.height / 40)}`,
  ].join(",");

  await execFileAsync("ffmpeg", [
    "-f", "lavfi", "-i", filterComplex,
    "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
    "-c:v", "libx264", "-preset", "slow", "-crf", "18",
    "-c:a", "aac", "-b:a", "320k", "-t", String(duration),
    "-pix_fmt", "yuv420p", "-y", outputPath,
  ], { timeout: 60_000 });

  logger.info(`[VideoStitcher] End credits generated (${duration}s, ${credits.length} entries)`);
  return outputPath;
}'''
video, count = re.subn(
    r'async function generateEndCredits\([\s\S]*?\n\}\n\n// [^\n]*Per-Scene Audio Mixing[^\n]*',
    new_credits + '\n\n// Per-Scene Audio Mixing',
    video,
    count=1,
)
if count != 1:
    raise RuntimeError("videoStitcher: end-credits function anchor not found")

new_subtitles = '''async function burnSubtitlesIntoScene(
  tmpDir: string,
  sceneVideoPath: string,
  sceneIndex: number,
  subtitles: SceneSubtitle[],
  resolution: { width: number; height: number },
): Promise<string> {
  if (!subtitles?.length) return sceneVideoPath;

  const formatTimestamp = (seconds: number): string => {
    const safe = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
    const hours = Math.floor(safe / 3600);
    const minutes = Math.floor((safe % 3600) / 60);
    const wholeSeconds = Math.floor(safe % 60);
    const milliseconds = Math.min(999, Math.round((safe % 1) * 1000));
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(wholeSeconds).padStart(2, "0")},${String(milliseconds).padStart(3, "0")}`;
  };

  const srtPath = path.join(tmpDir, `subs_${sceneIndex}.srt`);
  const entries: string[] = [];
  for (const [index, subtitle] of subtitles.slice(0, 2_000).entries()) {
    const start = Math.max(0, Number.isFinite(subtitle.startTime) ? subtitle.startTime : 0);
    const endCandidate = Number.isFinite(subtitle.endTime) ? subtitle.endTime : start + 0.5;
    const end = Math.max(start + 0.05, endCandidate);
    const text = safeSubtitleText(subtitle.text);
    if (!text) continue;
    entries.push(`${index + 1}\\n${formatTimestamp(start)} --> ${formatTimestamp(end)}\\n${text}\\n`);
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
video, count = re.subn(
    r'async function burnSubtitlesIntoScene\([\s\S]*?\n\}\n\n// [^\n]*Scene Transition Handling[^\n]*',
    new_subtitles + '\n\n// Scene Transition Handling',
    video,
    count=1,
)
if count != 1:
    raise RuntimeError("videoStitcher: subtitle function anchor not found")
write(video_path, video)


# Prevent nested entity decoding from turning harmless text into markup.
formats_path = "server/_core/scriptFormats.ts"
formats = read(formats_path)
formats = formats.replace(
    'return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, \'"\').replace(/&apos;/g, "\'");',
    'return s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, \'"\').replace(/&apos;/g, "\'").replace(/&amp;/g, "&");',
    1,
)
write(formats_path, formats)


# Use the central HTML-to-text boundary for SEO excerpts and Wikimedia snippets.
seo_path = "server/seo-engine.ts"
seo = read(seo_path)
if 'from "./_core/sanitize"' not in seo:
    seo = seo.replace('import { logger as log } from "./_core/logger";', 'import { logger as log } from "./_core/logger";\nimport { stripHtml } from "./_core/sanitize";', 1)
seo = seo.replace('const cleanContent = content.replace(/<[^>]+>/g, "").replace(/[#*_`]/g, "").trim();', 'const cleanContent = stripHtml(content).replace(/[#*_`]/g, "").trim();', 1)
write(seo_path, seo)

routers_path = "server/routers.ts"
routers = read(routers_path)
routers = routers.replace('import { sanitizeText } from "./_core/sanitize";', 'import { sanitizeText, stripHtml } from "./_core/sanitize";', 1)
routers = routers.replace('snippet: r.snippet?.replace(/<[^>]+>/g, "") ?? "",', 'snippet: stripHtml(r.snippet ?? ""),', 1)
write(routers_path, routers)

community_path = "client/src/pages/Community.tsx"
community = read(community_path).replace('if (!user || (!isPaid && user)) return <MembersOnlyWall />;', 'if (!user || !isPaid) return <MembersOnlyWall />;', 1)
write(community_path, community)


# Port the still-valid portions of PR #84 without merging its stale branch.
css_path = "client/src/index.css"
css = read(css_path)
css = css.replace(
    '''  /* Smooth momentum scrolling on iOS */
  * {
    -webkit-overflow-scrolling: touch;
  }''',
    '''  /* Smooth momentum scrolling only on actual scroll containers. A global
     wildcard creates unnecessary Safari compositing layers and scroll drift. */
  [class*="overflow-y-auto"],
  [class*="overflow-x-auto"],
  [class*="overflow-auto"],
  [class*="overflow-scroll"] {
    -webkit-overflow-scrolling: touch;
  }''',
    1,
)
css = css.replace(
    '''  .glass-dark {
    background: oklch(0.08 0.005 260 / 0.85);
    backdrop-filter: blur(20px) saturate(1.4);
    -webkit-backdrop-filter: blur(20px) saturate(1.4);
    border: 1px solid oklch(0.78 0.18 85 / 0.1);
  }''',
    '''  .glass-dark {
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
  }''',
    1,
)
write(css_path, css)
