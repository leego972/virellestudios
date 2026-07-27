from pathlib import Path

root = Path(__file__).resolve().parents[1]
path = root / "server/_core/adultMediaCompliance.ts"
text = path.read_text(encoding="utf-8")

anchor = '''function escapeDrawtext(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/:/g, "\\:").replace(/'/g, "\\'").replace(/%/g, "\\%");
}
'''
helper = '''function escapeDrawtext(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/:/g, "\\:").replace(/'/g, "\\'").replace(/%/g, "\\%");
}

async function hasAudioTrack(filePath: string): Promise<boolean> {
  try {
    const { stdout } = await execFileAsync("ffprobe", [
      "-v", "error", "-select_streams", "a:0", "-show_entries", "stream=index",
      "-of", "csv=p=0", filePath,
    ]);
    return Boolean(String(stdout || "").trim());
  } catch {
    return false;
  }
}
'''
if anchor not in text:
    raise RuntimeError("escapeDrawtext anchor not found")
text = text.replace(anchor, helper, 1)

old = '''    await execFileAsync("ffmpeg", [
      "-y", "-i", sourcePath,
      "-vf", "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black,fps=30",
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p",
      "-c:a", "aac", "-ar", "48000", "-ac", "2", normalisedPath,
    ], { maxBuffer: 8 * 1024 * 1024 });'''
new = '''    const sourceHasAudio = await hasAudioTrack(sourcePath);
    const normaliseArgs = sourceHasAudio
      ? [
          "-y", "-i", sourcePath,
          "-vf", "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black,fps=30",
          "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p",
          "-c:a", "aac", "-ar", "48000", "-ac", "2", normalisedPath,
        ]
      : [
          "-y", "-i", sourcePath,
          "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=48000",
          "-map", "0:v:0", "-map", "1:a:0",
          "-vf", "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black,fps=30",
          "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p",
          "-c:a", "aac", "-ar", "48000", "-ac", "2", "-shortest", normalisedPath,
        ];
    await execFileAsync("ffmpeg", normaliseArgs, { maxBuffer: 8 * 1024 * 1024 });'''
if old not in text:
    raise RuntimeError("normalisation block not found")
text = text.replace(old, new, 1)
path.write_text(text, encoding="utf-8")
print("Adult Studio silent-video guard added.")
