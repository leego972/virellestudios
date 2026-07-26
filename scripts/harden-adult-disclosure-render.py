from pathlib import Path

root = Path(__file__).resolve().parents[1]
path = root / "server/_core/adultMediaCompliance.ts"
text = path.read_text(encoding="utf-8")

text = text.replace(
'''export const ADULT_AI_DISCLOSURE_TEXT =
  "This production contains or may contain artificial-intelligence-assisted facial replacement, body transformation, age progression or regression, voice synthesis, compositing, or other synthetic-media techniques. The creator represents and warrants that all required rights, permissions, releases, and legally valid consents have been obtained for every identifiable person's likeness, voice, image, and personal attributes. The creator is solely responsible for the submitted media and resulting content. Virelle Studios supplies production technology and does not create, direct, sponsor, approve, or endorse user-generated content. Virelle Studios applies automated safety screening, provenance controls, audit logging, and human review where content is flagged. Unauthorised impersonation, non-consensual intimate imagery, exploitation of minors, deceptive identity misuse, and other unlawful use are prohibited.";''',
'''export const ADULT_AI_DISCLOSURE_LINES = [
  "This production contains or may contain AI-assisted facial replacement, body transformation,",
  "age progression or regression, voice synthesis, compositing, or other synthetic-media techniques.",
  "The creator represents and warrants that all required rights, permissions, releases, and legally",
  "valid consents have been obtained for every identifiable person's likeness, voice, image, and attributes.",
  "The creator is solely responsible for submitted media and resulting content. Virelle Studios supplies",
  "production technology and does not create, direct, sponsor, approve, or endorse user-generated content.",
  "Automated safety screening, provenance controls, audit logging, and human review apply where flagged.",
  "Unauthorised impersonation, non-consensual intimate imagery, exploitation of minors, deceptive identity",
  "misuse, and other unlawful use are strictly prohibited.",
] as const;
export const ADULT_AI_DISCLOSURE_TEXT = ADULT_AI_DISCLOSURE_LINES.join(" ");''')

text = text.replace(
'''  const sourcePath = path.join(tempDir, "source.mp4");
  const cardPath = path.join(tempDir, "notice.mp4");
  const outputPath = path.join(tempDir, "output.mp4");
  const listPath = path.join(tempDir, "concat.txt");''',
'''  const sourcePath = path.join(tempDir, "source.mp4");
  const normalisedPath = path.join(tempDir, "source-normalised.mp4");
  const cardPath = path.join(tempDir, "notice.mp4");
  const outputPath = path.join(tempDir, "output.mp4");
  const listPath = path.join(tempDir, "concat.txt");''')

text = text.replace(
'''    const title = escapeDrawtext(ADULT_AI_DISCLOSURE_TITLE);
    const body = escapeDrawtext(ADULT_AI_DISCLOSURE_TEXT);
    await execFileAsync("ffmpeg", [
      "-y", "-f", "lavfi", "-i", "color=c=0x070708:s=1920x1080:d=5:r=30",
      "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=48000",
      "-vf", `drawtext=text='${title}':fontcolor=0xE6C866:fontsize=54:x=(w-text_w)/2:y=130,drawtext=text='${body}':fontcolor=white:fontsize=31:line_spacing=12:x=140:y=260:box=1:boxcolor=black@0.42:boxborderw=24`,
      "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", cardPath,
    ], { maxBuffer: 8 * 1024 * 1024 });
    await writeFile(listPath, `file '${cardPath.replace(/'/g, "'\\''")}'\nfile '${sourcePath.replace(/'/g, "'\\''")}'\n`);
    await execFileAsync("ffmpeg", [
      "-y", "-f", "concat", "-safe", "0", "-i", listPath,
      "-metadata", `virelle_provenance=${JSON.stringify(provenance)}`,
      "-metadata", "comment=AI-assisted synthetic media; creator responsible for likeness rights and consent.",
      "-c", "copy", outputPath,
    ], { maxBuffer: 8 * 1024 * 1024 });''',
'''    const title = escapeDrawtext(ADULT_AI_DISCLOSURE_TITLE);
    const lineFilters = ADULT_AI_DISCLOSURE_LINES.map((line, index) =>
      `drawtext=text='${escapeDrawtext(line)}':fontcolor=white:fontsize=30:x=(w-text_w)/2:y=${260 + index * 62}`,
    );
    await execFileAsync("ffmpeg", [
      "-y", "-f", "lavfi", "-i", "color=c=0x070708:s=1920x1080:d=5:r=30",
      "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=48000",
      "-vf", [`drawtext=text='${title}':fontcolor=0xE6C866:fontsize=54:x=(w-text_w)/2:y=120`, ...lineFilters].join(","),
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p",
      "-c:a", "aac", "-ar", "48000", "-ac", "2", "-shortest", cardPath,
    ], { maxBuffer: 8 * 1024 * 1024 });
    await execFileAsync("ffmpeg", [
      "-y", "-i", sourcePath,
      "-vf", "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black,fps=30",
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p",
      "-c:a", "aac", "-ar", "48000", "-ac", "2", normalisedPath,
    ], { maxBuffer: 8 * 1024 * 1024 });
    await writeFile(listPath, `file '${cardPath.replace(/'/g, "'\\''")}'\nfile '${normalisedPath.replace(/'/g, "'\\''")}'\n`);
    await execFileAsync("ffmpeg", [
      "-y", "-f", "concat", "-safe", "0", "-i", listPath,
      "-metadata", `virelle_provenance=${JSON.stringify(provenance)}`,
      "-metadata", "comment=AI-assisted synthetic media; creator responsible for likeness rights and consent.",
      "-c", "copy", "-movflags", "+faststart", outputPath,
    ], { maxBuffer: 8 * 1024 * 1024 });''')

text = text.replace('{ public: false },', '{ public: true },')

path.write_text(text, encoding="utf-8")
print("Hardened Adult Studio disclosure rendering.")
