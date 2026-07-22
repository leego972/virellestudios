export type PitchDeckData = {
  title?: string;
  logline?: string;
  synopsis?: string;
  description?: string;
  themes?: unknown;
  genre?: string;
  rating?: string;
  tone?: string;
  characters?: Array<{
    id?: number | string;
    name?: string;
    role?: string;
    description?: string;
  }>;
  moodBoard?: unknown[];
  scenes?: Array<{
    id?: number | string;
    sceneNumber?: number;
    title?: string;
    description?: string;
    thumbnailUrl?: string;
  }>;
  budgetEstimate?: unknown;
  productionPlan?: unknown;
};

export type InvestorFields = {
  fundingAsk: string;
  useOfFunds: string;
  targetAudience: string;
  marketPosition: string;
  distributionStrategy: string;
  contactLine: string;
};

type DeckSlide = {
  kicker: string;
  title: string;
  subtitle?: string;
  bullets: string[];
};

const ENCODER = new TextEncoder();
const PPT_WIDTH = 12_192_000;
const PPT_HEIGHT = 6_858_000;

function text(value: unknown, fallback = "Not yet specified"): string {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") return value.trim() || fallback;
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    const result = value.map(item => text(item, "")).filter(Boolean).join(", ");
    return result || fallback;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const total = record.total ?? record.totalEstimate ?? record.amount;
    if (total !== undefined) {
      const currency = text(record.currency, "");
      const numeric = Number(total);
      return `${currency ? `${currency} ` : ""}${Number.isFinite(numeric) ? numeric.toLocaleString() : String(total)}`;
    }
    const result = Object.entries(record)
      .map(([key, item]) => `${key.replace(/([A-Z])/g, " $1")}: ${text(item, "")}`)
      .filter(item => !item.endsWith(": "))
      .join(" · ");
    return result || fallback;
  }
  return String(value);
}

function shorten(value: string, maximum: number): string {
  const normalised = value.replace(/\s+/g, " ").trim();
  if (normalised.length <= maximum) return normalised;
  return `${normalised.slice(0, Math.max(0, maximum - 1)).trimEnd()}…`;
}

function safeFilename(value: string): string {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9-_]+/g, "_")
    .replace(/^_+|_+$/g, "") || "Virelle_Pitch_Deck";
}

function xmlEscape(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function pdfEscape(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function wrap(value: string, maximum: number): string[] {
  const words = value.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maximum && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const result = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function uint16(value: number): Uint8Array {
  const bytes = new Uint8Array(2);
  new DataView(bytes.buffer).setUint16(0, value, true);
  return bytes;
}

function uint32(value: number): Uint8Array {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value >>> 0, true);
  return bytes;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date = new Date()): { date: number; time: number } {
  const year = Math.max(1980, date.getFullYear());
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

function createStoredZip(files: Array<{ name: string; data: Uint8Array }>): Uint8Array {
  const local: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  const stamp = dosDateTime();
  let offset = 0;

  for (const file of files) {
    const name = ENCODER.encode(file.name);
    const checksum = crc32(file.data);
    const localHeader = concat([
      uint32(0x04034b50), uint16(20), uint16(0x0800), uint16(0),
      uint16(stamp.time), uint16(stamp.date), uint32(checksum),
      uint32(file.data.length), uint32(file.data.length), uint16(name.length), uint16(0), name,
    ]);
    local.push(localHeader, file.data);

    central.push(concat([
      uint32(0x02014b50), uint16(20), uint16(20), uint16(0x0800), uint16(0),
      uint16(stamp.time), uint16(stamp.date), uint32(checksum),
      uint32(file.data.length), uint32(file.data.length), uint16(name.length),
      uint16(0), uint16(0), uint16(0), uint16(0), uint32(0), uint32(offset), name,
    ]));
    offset += localHeader.length + file.data.length;
  }

  const centralBytes = concat(central);
  return concat([
    ...local,
    centralBytes,
    uint32(0x06054b50), uint16(0), uint16(0), uint16(files.length), uint16(files.length),
    uint32(centralBytes.length), uint32(offset), uint16(0),
  ]);
}

export function buildPitchDeckSlides(data: PitchDeckData, investor: InvestorFields): DeckSlide[] {
  const characters = data.characters ?? [];
  const scenes = data.scenes ?? [];
  const budget = text(data.budgetEstimate, "Budget estimate to be finalised");
  const production = text(data.productionPlan, "Production schedule and delivery milestones to be finalised");

  return [
    {
      kicker: "VIRELLE STUDIOS · INVESTOR PITCH",
      title: text(data.title, "Untitled Project"),
      subtitle: text(data.logline, "A distinctive screen project in development"),
      bullets: [
        [data.genre, data.rating, data.tone].filter(Boolean).join(" · ") || "Genre and tone to be confirmed",
        investor.contactLine,
      ],
    },
    {
      kicker: "THE STORY",
      title: "Synopsis",
      subtitle: shorten(text(data.synopsis ?? data.description), 900),
      bullets: [
        `Themes: ${text(data.themes)}`,
        `Genre: ${text(data.genre)}`,
        `Tone: ${text(data.tone)}`,
      ],
    },
    {
      kicker: "CREATIVE AND COMMERCIAL POSITION",
      title: "Why this project",
      subtitle: shorten(text(data.themes, "A clear creative proposition supported by a persistent production workflow"), 700),
      bullets: [
        `Market position: ${investor.marketPosition}`,
        `Target audience: ${investor.targetAudience}`,
        `${data.moodBoard?.length ?? 0} visual reference${data.moodBoard?.length === 1 ? "" : "s"} currently attached`,
      ],
    },
    {
      kicker: "CAST AND CHARACTERS",
      title: "Character engine",
      subtitle: `${characters.length} principal character${characters.length === 1 ? "" : "s"} currently defined`,
      bullets: characters.length
        ? characters.slice(0, 8).map(character => `${text(character.name, "Unnamed character")}: ${shorten(text(character.description ?? character.role), 190)}`)
        : ["Character profiles and casting references are still in development"],
    },
    {
      kicker: "VISUAL DEVELOPMENT",
      title: "Storyboard and production design",
      subtitle: `${scenes.length} scene${scenes.length === 1 ? "" : "s"} currently structured`,
      bullets: scenes.length
        ? scenes.slice(0, 8).map((scene, index) => `Scene ${scene.sceneNumber ?? index + 1} — ${text(scene.title, "Untitled")}: ${shorten(text(scene.description), 170)}`)
        : ["Storyboard frames will be generated from the approved script breakdown"],
    },
    {
      kicker: "PRODUCTION",
      title: "Plan and delivery",
      subtitle: shorten(production, 850),
      bullets: [
        "Script → storyboard → production → post-production → release",
        "Persistent continuity, wardrobe, audio, edit, approval and delivery records",
        "Schedule can be aligned to festival, distributor, broadcaster or platform deadlines",
      ],
    },
    {
      kicker: "FINANCE",
      title: "Budget and funding ask",
      subtitle: `Current budget estimate: ${budget}`,
      bullets: [
        `Funding ask: ${investor.fundingAsk}`,
        `Use of funds: ${investor.useOfFunds}`,
        "Detailed category budgets, contingency, incentives and recoupment terms should accompany diligence",
      ],
    },
    {
      kicker: "GO-TO-MARKET",
      title: "Audience and distribution",
      subtitle: shorten(investor.distributionStrategy, 750),
      bullets: [
        `Primary audience: ${investor.targetAudience}`,
        `Positioning: ${investor.marketPosition}`,
        "Festival, press-kit, crowdfunding, funding and distribution workflows are available within Virelle",
      ],
    },
    {
      kicker: "THE ASK",
      title: `Partner with ${text(data.title, "the project")}`,
      subtitle: investor.fundingAsk,
      bullets: [
        investor.useOfFunds,
        "Next step: review the screenplay, budget, schedule, visual references and proposed investment terms",
        investor.contactLine,
      ],
    },
  ];
}

function pdfLine(font: "F1" | "F2", size: number, colour: string, x: number, y: number, value: string): string {
  return `BT /${font} ${size} Tf ${colour} rg 1 0 0 1 ${x} ${y} Tm (${pdfEscape(value)}) Tj ET`;
}

export function createPitchDeckPdf(data: PitchDeckData, investor: InvestorFields): { blob: Blob; filename: string } {
  const slides = buildPitchDeckSlides(data, investor);
  const objects = new Map<number, string>();
  objects.set(1, "<< /Type /Catalog /Pages 2 0 R >>");
  objects.set(3, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  objects.set(4, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  const pageIds: number[] = [];

  slides.forEach((slide, index) => {
    const pageId = 5 + index * 2;
    const contentId = pageId + 1;
    pageIds.push(pageId);
    const commands = [
      "0.035 0.035 0.063 rg 0 0 842 595 re f",
      "0.831 0.686 0.216 rg 0 0 12 595 re f",
      pdfLine("F2", 10, "0.831 0.686 0.216", 48, 548, slide.kicker),
    ];
    const titleLines = wrap(slide.title, 38).slice(0, 2);
    titleLines.forEach((line, lineIndex) => commands.push(pdfLine("F2", 29, "1 1 1", 48, 492 - lineIndex * 36, line)));
    let cursor = 420 - Math.max(0, titleLines.length - 1) * 26;
    if (slide.subtitle) {
      const subtitleLines = wrap(slide.subtitle, 80).slice(0, 5);
      subtitleLines.forEach((line, lineIndex) => commands.push(pdfLine("F1", 15, "0.76 0.75 0.71", 48, cursor - lineIndex * 20, line)));
      cursor -= subtitleLines.length * 20 + 24;
    }
    slide.bullets.slice(0, 8).forEach(bullet => {
      const bulletLines = wrap(bullet, 82).slice(0, 3);
      commands.push(pdfLine("F2", 12, "0.831 0.686 0.216", 55, cursor, "-"));
      bulletLines.forEach((line, lineIndex) => commands.push(pdfLine("F1", 12, "0.91 0.9 0.88", 72, cursor - lineIndex * 16, line)));
      cursor -= Math.max(1, bulletLines.length) * 16 + 10;
    });
    commands.push(pdfLine("F1", 8, "0.45 0.44 0.42", 48, 28, `${index + 1} / ${slides.length}   Virelle Studios`));
    const stream = commands.join("\n");
    objects.set(contentId, `<< /Length ${ENCODER.encode(stream).length} >>\nstream\n${stream}\nendstream`);
    objects.set(pageId, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`);
  });

  objects.set(2, `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`);
  const maximum = Math.max(...objects.keys());
  const parts = [ENCODER.encode("%PDF-1.4\n%VIRELLE\n")];
  const offsets = new Array<number>(maximum + 1).fill(0);
  let offset = parts[0].length;
  for (let id = 1; id <= maximum; id += 1) {
    const part = ENCODER.encode(`${id} 0 obj\n${objects.get(id) ?? "<< >>"}\nendobj\n`);
    offsets[id] = offset;
    parts.push(part);
    offset += part.length;
  }
  const xrefOffset = offset;
  let xref = `xref\n0 ${maximum + 1}\n0000000000 65535 f \n`;
  for (let id = 1; id <= maximum; id += 1) xref += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  xref += `trailer\n<< /Size ${maximum + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  parts.push(ENCODER.encode(xref));
  const bytes = concat(parts);
  return {
    blob: new Blob([toArrayBuffer(bytes)], { type: "application/pdf" }),
    filename: `${safeFilename(text(data.title, "Virelle_Pitch_Deck"))}_pitch_deck.pdf`,
  };
}

function pptParagraph(value: string, size: number, colour: string, bold = false, bullet = false): string {
  return `<a:p>${bullet ? '<a:pPr marL="342900" indent="-171450"><a:buChar char="•"/></a:pPr>' : ""}<a:r><a:rPr lang="en-AU" sz="${size * 100}" b="${bold ? 1 : 0}"><a:solidFill><a:srgbClr val="${colour}"/></a:solidFill><a:latin typeface="Aptos"/></a:rPr><a:t>${xmlEscape(value)}</a:t></a:r><a:endParaRPr lang="en-AU" sz="${size * 100}"/></a:p>`;
}

function pptText(id: number, name: string, x: number, y: number, width: number, height: number, paragraphs: string, fill?: string): string {
  return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="${xmlEscape(name)}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${width}" cy="${height}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom>${fill ? `<a:solidFill><a:srgbClr val="${fill}"/></a:solidFill>` : "<a:noFill/>"}<a:ln><a:noFill/></a:ln></p:spPr><p:txBody><a:bodyPr wrap="square" lIns="91440" rIns="91440" tIns="45720" bIns="45720"/><a:lstStyle/>${paragraphs}</p:txBody></p:sp>`;
}

function slideXml(slide: DeckSlide, index: number): string {
  const bullets = slide.bullets.slice(0, 8).map(item => pptParagraph(shorten(item, 300), 18, "E7E5E4", false, true)).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld name="Slide ${index + 1}"><p:bg><p:bgPr><a:solidFill><a:srgbClr val="090910"/></a:solidFill><a:effectLst/></p:bgPr></p:bg><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>${pptText(2, "Accent", 0, 0, 190500, PPT_HEIGHT, "", "D4AF37")}${pptText(3, "Kicker", 720000, 450000, 10400000, 450000, pptParagraph(slide.kicker, 11, "D4AF37", true))}${pptText(4, "Title", 720000, 1050000, 10600000, 1100000, pptParagraph(shorten(slide.title, 120), 30, "FFFFFF", true))}${slide.subtitle ? pptText(5, "Subtitle", 720000, 2050000, 10500000, 1150000, pptParagraph(shorten(slide.subtitle, 700), 17, "B8B5AD")) : ""}${pptText(6, "Body", 850000, slide.subtitle ? 3250000 : 2450000, 10200000, slide.subtitle ? 2650000 : 3350000, bullets)}${pptText(7, "Footer", 720000, 6250000, 10500000, 300000, pptParagraph(`${index + 1} · Virelle Studios`, 9, "77736B"))}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`;
}

export function createPitchDeckPptx(data: PitchDeckData, investor: InvestorFields): { blob: Blob; filename: string } {
  const slides = buildPitchDeckSlides(data, investor);
  const slideOverrides = slides.map((_, index) => `<Override PartName="/ppt/slides/slide${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join("");
  const slideIds = slides.map((_, index) => `<p:sldId id="${256 + index}" r:id="rId${index + 2}"/>`).join("");
  const slideRelations = slides.map((_, index) => `<Relationship Id="rId${index + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${index + 1}.xml"/>`).join("");
  const now = new Date().toISOString();
  const files: Array<{ name: string; data: Uint8Array }> = [
    { name: "[Content_Types].xml", data: ENCODER.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/><Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/><Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>${slideOverrides}</Types>`) },
    { name: "_rels/.rels", data: ENCODER.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`) },
    { name: "docProps/core.xml", data: ENCODER.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${xmlEscape(text(data.title, "Virelle Pitch Deck"))}</dc:title><dc:creator>Virelle Studios</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified></cp:coreProperties>`) },
    { name: "docProps/app.xml", data: ENCODER.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Virelle Studios</Application><PresentationFormat>Widescreen</PresentationFormat><Slides>${slides.length}</Slides><Company>Virelle Studios</Company></Properties>`) },
    { name: "ppt/presentation.xml", data: ENCODER.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst>${slideIds}</p:sldIdLst><p:sldSz cx="${PPT_WIDTH}" cy="${PPT_HEIGHT}" type="screen16x9"/><p:notesSz cx="6858000" cy="9144000"/><p:defaultTextStyle/></p:presentation>`) },
    { name: "ppt/_rels/presentation.xml.rels", data: ENCODER.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>${slideRelations}</Relationships>`) },
    { name: "ppt/slideMasters/slideMaster1.xml", data: ENCODER.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld><p:clrMap accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" bg1="lt1" bg2="lt2" folHlink="folHlink" hlink="hlink" tx1="dk1" tx2="dk2"/><p:sldLayoutIdLst><p:sldLayoutId id="1" r:id="rId1"/></p:sldLayoutIdLst><p:txStyles><p:titleStyle/><p:bodyStyle/><p:otherStyle/></p:txStyles></p:sldMaster>`) },
    { name: "ppt/slideMasters/_rels/slideMaster1.xml.rels", data: ENCODER.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/></Relationships>`) },
    { name: "ppt/slideLayouts/slideLayout1.xml", data: ENCODER.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank" preserve="1"><p:cSld name="Blank"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`) },
    { name: "ppt/slideLayouts/_rels/slideLayout1.xml.rels", data: ENCODER.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/></Relationships>`) },
    { name: "ppt/theme/theme1.xml", data: ENCODER.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Virelle"><a:themeElements><a:clrScheme name="Virelle"><a:dk1><a:srgbClr val="090910"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="262626"/></a:dk2><a:lt2><a:srgbClr val="E7E5E4"/></a:lt2><a:accent1><a:srgbClr val="D4AF37"/></a:accent1><a:accent2><a:srgbClr val="B8960C"/></a:accent2><a:accent3><a:srgbClr val="6366F1"/></a:accent3><a:accent4><a:srgbClr val="10B981"/></a:accent4><a:accent5><a:srgbClr val="EC4899"/></a:accent5><a:accent6><a:srgbClr val="F97316"/></a:accent6><a:hlink><a:srgbClr val="3B82F6"/></a:hlink><a:folHlink><a:srgbClr val="8B5CF6"/></a:folHlink></a:clrScheme><a:fontScheme name="Aptos"><a:majorFont><a:latin typeface="Aptos Display"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont><a:minorFont><a:latin typeface="Aptos"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme><a:fmtScheme name="Virelle"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="6350"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>`) },
  ];
  slides.forEach((slide, index) => files.push({ name: `ppt/slides/slide${index + 1}.xml`, data: ENCODER.encode(slideXml(slide, index)) }));
  const bytes = createStoredZip(files);
  return {
    blob: new Blob([toArrayBuffer(bytes)], { type: "application/vnd.openxmlformats-officedocument.presentationml.presentation" }),
    filename: `${safeFilename(text(data.title, "Virelle_Pitch_Deck"))}_pitch_deck.pptx`,
  };
}

export function downloadPitchDeckFile(file: { blob: Blob; filename: string }): void {
  const url = URL.createObjectURL(file.blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
