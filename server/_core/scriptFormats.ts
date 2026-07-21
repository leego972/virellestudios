/**
 * v6.64 — Fountain / FDX script format support.
 *
 * Fountain: plain text screenplay format (https://fountain.io). Scene headings
 * detected by lines starting with INT./EXT./EST./I/E etc. or a "." prefix.
 * Character names: ALL CAPS lines followed by dialogue.
 *
 * FDX: Final Draft's XML format. We support a minimal parser/exporter that
 * round-trips paragraphs of type "Scene Heading", "Action", "Character",
 * "Dialogue", "Parenthetical", "Transition".
 */

export interface ParsedScene {
  sceneNumber: number;
  heading: string;
  intExt?: string;
  location?: string;
  timeOfDay?: string;
  description: string;
  characters: string[];
}

const SCENE_RE = /^(INT\.?|EXT\.?|EST\.?|I\/E\.?|INT\/EXT\.?)\s*(.+?)(?:\s*[-–—]\s*(.+))?$/i;

/** Parse a Fountain script string into structured scenes. */
export function parseFountain(text: string): ParsedScene[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const scenes: ParsedScene[] = [];
  let current: ParsedScene | null = null;
  let blank = true;
  let lastWasBlank = true;
  const charSet = new Set<string>();

  function pushIfActive() {
    if (current) {
      current.characters = Array.from(charSet);
      scenes.push(current);
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();
    blank = line === "";
    let isScene = false;
    let m = line.match(SCENE_RE);
    if (m && lastWasBlank) isScene = true;
    if (line.startsWith(".") && !line.startsWith("..") && lastWasBlank) {
      isScene = true;
      m = line.slice(1).match(SCENE_RE) || (["", "", line.slice(1), ""] as any);
    }
    if (isScene) {
      pushIfActive();
      charSet.clear();
      const intExt = (m?.[1] || "").toUpperCase().replace(/\.$/, "");
      const loc = (m?.[2] || line).trim();
      const tod = (m?.[3] || "").trim();
      current = {
        sceneNumber: scenes.length + 1,
        heading: line,
        intExt: intExt || undefined,
        location: loc || undefined,
        timeOfDay: tod || undefined,
        description: "",
        characters: [],
      };
    } else if (current) {
      if (lastWasBlank && /^[A-Z][A-Z0-9 .'\-()]+$/.test(line) && line.length <= 60 && i + 1 < lines.length && lines[i + 1].trim() !== "") {
        const name = line.replace(/\(.*?\)/g, "").trim();
        if (name) charSet.add(name);
      }
      current.description += (current.description ? "\n" : "") + raw;
    }
    lastWasBlank = blank;
  }
  pushIfActive();
  return scenes;
}

/** Serialize scenes back to Fountain text. */
export function exportFountain(
  scenes: Array<{
    sceneNumber?: number;
    intExt?: string | null;
    location?: string | null;
    timeOfDay?: string | null;
    title?: string | null;
    description?: string | null;
  }>,
  projectTitle?: string,
): string {
  let out = "";
  if (projectTitle) out += `Title: ${projectTitle}\n\n`;
  for (const s of scenes) {
    const ie = (s.intExt || "INT").toUpperCase();
    const loc = (s.location || s.title || "LOCATION").toUpperCase();
    const tod = s.timeOfDay ? ` - ${s.timeOfDay.toUpperCase()}` : "";
    out += `\n${ie}. ${loc}${tod}\n\n`;
    if (s.description) out += `${s.description.trim()}\n\n`;
  }
  return out.trimStart();
}

/**
 * Minimal FDX parser. FDX is XML with <Paragraph Type="..."><Text>...</Text></Paragraph>.
 * We extract Scene Heading paragraphs and bundle subsequent paragraphs as the
 * scene body until the next Scene Heading.
 */
export function parseFDX(xml: string): ParsedScene[] {
  const scenes: ParsedScene[] = [];
  const paragraphRe = /<Paragraph[^>]*Type="([^"]+)"[^>]*>([\s\S]*?)<\/Paragraph>/g;
  const textRe = /<Text[^>]*>([\s\S]*?)<\/Text>/g;
  let m: RegExpExecArray | null;
  let current: ParsedScene | null = null;
  const charSet = new Set<string>();

  // Decode exactly one XML entity layer. A single replacement pass prevents
  // attacker-controlled `&amp;lt;script&amp;gt;` from becoming executable markup.
  function decode(s: string): string {
    const entities: Record<string, string> = {
      "&amp;": "&",
      "&lt;": "<",
      "&gt;": ">",
      "&quot;": '"',
      "&apos;": "'",
    };
    return s.replace(/&(?:amp|lt|gt|quot|apos);/g, entity => entities[entity] ?? entity);
  }

  while ((m = paragraphRe.exec(xml)) !== null) {
    const type = m[1];
    const inner = m[2];
    let txt = "";
    let tm: RegExpExecArray | null;
    while ((tm = textRe.exec(inner)) !== null) txt += decode(tm[1]);
    txt = txt.trim();
    if (!txt) continue;

    if (type === "Scene Heading") {
      if (current) {
        current.characters = Array.from(charSet);
        scenes.push(current);
        charSet.clear();
      }
      const sceneM = txt.match(SCENE_RE);
      current = {
        sceneNumber: scenes.length + 1,
        heading: txt,
        intExt: sceneM?.[1]?.toUpperCase().replace(/\.$/, "") || undefined,
        location: sceneM?.[2]?.trim() || txt,
        timeOfDay: sceneM?.[3]?.trim() || undefined,
        description: "",
        characters: [],
      };
    } else if (current) {
      if (type === "Character") {
        const name = txt.replace(/\(.*?\)/g, "").trim();
        if (name) charSet.add(name);
      }
      current.description += (current.description ? "\n" : "") + (type === "Action" ? txt : `${type}: ${txt}`);
    }
  }
  if (current) {
    current.characters = Array.from(charSet);
    scenes.push(current);
  }
  return scenes;
}

/** Serialize scenes to a minimal FDX (Final Draft) document. */
export function exportFDX(
  scenes: Array<{
    sceneNumber?: number;
    intExt?: string | null;
    location?: string | null;
    timeOfDay?: string | null;
    title?: string | null;
    description?: string | null;
  }>,
  projectTitle = "Untitled",
): string {
  const esc = (s: string) => s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
  let out = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n<FinalDraft DocumentType="Script" Template="No" Version="5">\n  <Content>\n`;
  for (const s of scenes) {
    const ie = (s.intExt || "INT").toUpperCase();
    const loc = (s.location || s.title || "LOCATION").toUpperCase();
    const tod = s.timeOfDay ? ` - ${s.timeOfDay.toUpperCase()}` : "";
    out += `    <Paragraph Type="Scene Heading"><Text>${esc(`${ie}. ${loc}${tod}`)}</Text></Paragraph>\n`;
    if (s.description) {
      const safe = s.description.replace(/\r\n/g, "\n").split("\n");
      for (const line of safe) {
        if (line.trim()) out += `    <Paragraph Type="Action"><Text>${esc(line)}</Text></Paragraph>\n`;
      }
    }
  }
  out += `  </Content>\n  <TitlePage>\n    <Content>\n      <Paragraph Alignment="Center"><Text>${esc(projectTitle)}</Text></Paragraph>\n    </Content>\n  </TitlePage>\n</FinalDraft>\n`;
  return out;
}

/** Build an iCal (.ics) document from shoot-day rows. RFC 5545 minimal. */
export function exportICal(
  projectTitle: string,
  days: Array<{
    id: number;
    dayNumber: number;
    shootDate?: Date | string | null;
    callTime?: string | null;
    wrapTime?: string | null;
    locationName?: string | null;
    generalNotes?: string | null;
  }>,
  baseUrl?: string,
): string {
  function fmtDate(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
  }
  function escText(s: string): string {
    return s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
  }
  let out = "";
  out += "BEGIN:VCALENDAR\r\n";
  out += "VERSION:2.0\r\n";
  out += `PRODID:-//Virelle Studios//${escText(projectTitle)}//EN\r\n`;
  out += "CALSCALE:GREGORIAN\r\n";
  out += "METHOD:PUBLISH\r\n";
  out += `X-WR-CALNAME:${escText(projectTitle)} — Shoot Schedule\r\n`;
  for (const d of days) {
    if (!d.shootDate) continue;
    const dateOnly = typeof d.shootDate === "string"
      ? d.shootDate.slice(0, 10)
      : (d.shootDate as Date).toISOString().slice(0, 10);
    const [y, mo, da] = dateOnly.split("-").map(x => parseInt(x));
    const [ch = 8, cm = 0] = (d.callTime || "08:00").split(":").map(x => parseInt(x));
    const [wh = 18, wm = 0] = (d.wrapTime || "18:00").split(":").map(x => parseInt(x));
    const start = new Date(Date.UTC(y, mo - 1, da, ch, cm, 0));
    const end = new Date(Date.UTC(y, mo - 1, da, wh, wm, 0));
    out += "BEGIN:VEVENT\r\n";
    out += `UID:virelle-shoot-day-${d.id}@virellestudios\r\n`;
    out += `DTSTAMP:${fmtDate(new Date())}\r\n`;
    out += `DTSTART:${fmtDate(start)}\r\n`;
    out += `DTEND:${fmtDate(end)}\r\n`;
    out += `SUMMARY:${escText(`${projectTitle} — Day ${d.dayNumber}`)}\r\n`;
    if (d.locationName) out += `LOCATION:${escText(d.locationName)}\r\n`;
    const desc = [
      `Day ${d.dayNumber}`,
      d.callTime ? `Call ${d.callTime}` : "",
      d.wrapTime ? `Wrap ${d.wrapTime}` : "",
      d.generalNotes || "",
    ].filter(Boolean).join(" — ");
    out += `DESCRIPTION:${escText(desc)}\r\n`;
    if (baseUrl) out += `URL:${baseUrl}\r\n`;
    out += "END:VEVENT\r\n";
  }
  out += "END:VCALENDAR\r\n";
  return out;
}
