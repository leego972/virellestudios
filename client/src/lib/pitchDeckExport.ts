export type PitchDeckCharacter = {
  id?: number | string;
  name?: string;
  description?: string;
  referenceImages?: string[];
};

export type PitchDeckScene = {
  id?: number | string;
  sceneNumber?: number;
  title?: string;
  description?: string;
  thumbnailUrl?: string;
};

export type PitchDeckData = {
  title?: string;
  logline?: string;
  genre?: string;
  rating?: string;
  tone?: string;
  synopsis?: string;
  themes?: string;
  characters?: PitchDeckCharacter[];
  moodBoard?: Array<{ imageUrl?: string } | string>;
  scenes?: PitchDeckScene[];
  budgetEstimate?: string;
  productionPlan?: string;
};

export type PitchDeckExportOptions = {
  fundingAsk?: string;
  fundingUse?: string;
  contactName?: string;
  contactEmail?: string;
};

type DeckSlide = {
  title: string;
  subtitle?: string;
  body?: string;
  bullets?: string[];
  imageUrl?: string;
  imageCaption?: string;
};

type JpegAsset = {
  bytes: Uint8Array;
  width: number;
  height: number;
};

const PDF_WIDTH = 960;
const PDF_HEIGHT = 540;
const PPT_WIDTH = 12_192_000;
const PPT_HEIGHT = 6_858_000;
const EMU = 914_400;
const UTF8 = new TextEncoder();

function cleanText(value: unknown): string {
  return String(value ?? "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function xmlEscape(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function pdfEscape(value: unknown): string {
  return cleanText(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function safeFilename(value: string): string {
  return value.trim().replace(/[^a-zA-Z0-9-_]+/g, "_").replace(/^_+|_+$/g, "") || "Virelle_Pitch_Deck";
}

function moodImage(item: { imageUrl?: string } | string | undefined): string | undefined {
  if (!item) return undefined;
  return typeof item === "string" ? item : item.imageUrl;
}

export function buildPitchDeckSlides(data: PitchDeckData, options: PitchDeckExportOptions): DeckSlide[] {
  const title = cleanText(data.title || "Untitled Project");
  const slides: DeckSlide[] = [];
  const keyArt = moodImage(data.moodBoard?.[0]) || data.scenes?.find(scene => scene.thumbnailUrl)?.thumbnailUrl;

  slides.push({
    title,
    subtitle: cleanText(data.logline || [data.genre, data.tone].filter(Boolean).join(" | ") || "A Virelle Studios production"),
    body: [data.genre, data.rating, data.tone].filter(Boolean).map(cleanText).join("  |  "),
    imageUrl: keyArt,
    imageCaption: "Key art / visual reference",
  });

  if (data.synopsis || data.themes) {
    slides.push({
      title: "Story & audience",
      subtitle: data.themes ? `Themes: ${cleanText(data.themes)}` : undefined,
      body: cleanText(data.synopsis || "Synopsis not yet supplied."),
      imageUrl: moodImage(data.moodBoard?.[1]) || data.scenes?.[0]?.thumbnailUrl,
    });
  }

  const characters = data.characters || [];
  for (let index = 0; index < characters.length; index += 2) {
    const group = characters.slice(index, index + 2);
    slides.push({
      title: characters.length > 2 ? `Character sheets ${index + 1}-${Math.min(index + 2, characters.length)}` : "Character sheets",
      bullets: group.map(character => `${cleanText(character.name || "Unnamed character")}: ${cleanText(character.description || "Character description pending.")}`),
      imageUrl: group[0]?.referenceImages?.[0],
      imageCaption: group[0]?.name,
    });
  }

  const moodImages = (data.moodBoard || []).map(moodImage).filter((value): value is string => !!value);
  if (moodImages.length > 0 || keyArt) {
    slides.push({
      title: "Visual world & key art",
      subtitle: cleanText([data.genre, data.tone].filter(Boolean).join(" | ")),
      body: "Reference imagery establishes the project palette, production design, wardrobe, lighting and cinematic tone.",
      imageUrl: moodImages[0] || keyArt,
      imageCaption: "Primary visual reference",
    });
  }

  const scenes = (data.scenes || []).slice(0, 8);
  for (let index = 0; index < scenes.length; index += 2) {
    const group = scenes.slice(index, index + 2);
    slides.push({
      title: `Storyboard beats ${index + 1}-${Math.min(index + 2, scenes.length)}`,
      bullets: group.map(scene => `Scene ${scene.sceneNumber ?? index + 1}: ${cleanText(scene.title || "Untitled")} - ${cleanText(scene.description || "Visual beat")}`),
      imageUrl: group[0]?.thumbnailUrl,
      imageCaption: group[0]?.title,
    });
  }

  slides.push({
    title: "Budget & funding ask",
    subtitle: cleanText(options.fundingAsk || data.budgetEstimate || "Funding amount to be confirmed"),
    body: cleanText(options.fundingUse || data.budgetEstimate || "Funding will support production, post-production, accessibility, marketing and distribution."),
    imageUrl: moodImage(data.moodBoard?.[2]) || data.scenes?.[1]?.thumbnailUrl,
  });

  if (data.productionPlan) {
    slides.push({
      title: "Production plan",
      body: cleanText(data.productionPlan),
      imageUrl: data.scenes?.[2]?.thumbnailUrl,
    });
  }

  slides.push({
    title: "Partnership opportunity",
    subtitle: cleanText(options.contactName || "Virelle Studios production team"),
    body: cleanText(options.contactEmail ? `Contact: ${options.contactEmail}` : "Contact details available from the project owner."),
    imageUrl: keyArt,
  });

  return slides;
}

async function imageToJpeg(url: string | undefined): Promise<JpegAsset | null> {
  if (!url || typeof document === "undefined") return null;
  try {
    const response = await fetch(url, { credentials: "omit", mode: "cors" });
    if (!response.ok) return null;
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const element = new Image();
        element.onload = () => resolve(element);
        element.onerror = () => reject(new Error("Image decode failed"));
        element.src = objectUrl;
      });
      const maxDimension = 1800;
      const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
      const width = Math.max(1, Math.round(image.naturalWidth * scale));
      const height = Math.max(1, Math.round(image.naturalHeight * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) return null;
      context.fillStyle = "#09090f";
      context.fillRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);
      const jpegBlob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", 0.88));
      if (!jpegBlob) return null;
      return { bytes: new Uint8Array(await jpegBlob.arrayBuffer()), width, height };
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch {
    return null;
  }
}

async function loadSlideImages(slides: DeckSlide[], onProgress?: (done: number, total: number) => void): Promise<Array<JpegAsset | null>> {
  const assets: Array<JpegAsset | null> = [];
  for (let index = 0; index < slides.length; index += 1) {
    assets.push(await imageToJpeg(slides[index].imageUrl));
    onProgress?.(index + 1, slides.length);
  }
  return assets;
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

function wrapText(text: string, maxCharacters: number): string[] {
  const words = cleanText(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > maxCharacters && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function pdfText(x: number, y: number, size: number, text: string, color = "1 1 1"): string {
  return `BT /F1 ${size} Tf ${color} rg 1 0 0 1 ${x} ${y} Tm (${pdfEscape(text)}) Tj ET\n`;
}

function pdfSlideStream(slide: DeckSlide, slideNumber: number, hasImage: boolean): string {
  const parts: string[] = [];
  parts.push("0.025 0.025 0.055 rg 0 0 960 540 re f\n");
  parts.push("0.82 0.66 0.20 rg 54 486 110 4 re f\n");
  parts.push(pdfText(54, 448, 28, slide.title, "0.98 0.98 0.98"));
  if (slide.subtitle) {
    const subtitleLines = wrapText(slide.subtitle, hasImage ? 50 : 86).slice(0, 3);
    subtitleLines.forEach((line, index) => parts.push(pdfText(54, 414 - index * 23, 15, line, "0.85 0.69 0.27")));
  }
  const bodyWidth = hasImage ? 52 : 96;
  let y = slide.subtitle ? 330 : 390;
  if (slide.body) {
    const bodyLines = wrapText(slide.body, bodyWidth).slice(0, hasImage ? 12 : 16);
    bodyLines.forEach(line => {
      parts.push(pdfText(54, y, 12, line, "0.78 0.78 0.82"));
      y -= 18;
    });
  }
  if (slide.bullets) {
    for (const bullet of slide.bullets.slice(0, 8)) {
      const lines = wrapText(bullet, bodyWidth - 4).slice(0, 3);
      lines.forEach((line, lineIndex) => {
        parts.push(pdfText(lineIndex === 0 ? 68 : 82, y, 11.5, `${lineIndex === 0 ? "- " : ""}${line}`, "0.80 0.80 0.84"));
        y -= 17;
      });
      y -= 5;
    }
  }
  if (hasImage) {
    parts.push("q 390 0 0 292 530 152 cm /Im1 Do Q\n");
    parts.push("0.82 0.66 0.20 RG 1 w 530 152 390 292 re S\n");
    if (slide.imageCaption) parts.push(pdfText(530, 130, 9, slide.imageCaption, "0.56 0.56 0.61"));
  }
  parts.push(pdfText(54, 34, 9, `Virelle Studios | ${slideNumber}`, "0.42 0.42 0.48"));
  return parts.join("");
}

function asciiObject(value: string): Uint8Array {
  return UTF8.encode(value);
}

export async function createPitchDeckPdf(
  data: PitchDeckData,
  options: PitchDeckExportOptions,
  onProgress?: (stage: string, done: number, total: number) => void,
): Promise<{ blob: Blob; filename: string }> {
  const slides = buildPitchDeckSlides(data, options);
  const images = await loadSlideImages(slides, (done, total) => onProgress?.("Preparing images", done, total));
  const objectBodies = new Map<number, Uint8Array>();
  const pageNumbers: number[] = [];
  let nextObject = 4;
  const slideObjects = slides.map((slide, index) => {
    const page = nextObject++;
    const content = nextObject++;
    const image = images[index] ? nextObject++ : null;
    pageNumbers.push(page);
    return { page, content, image, slide, asset: images[index] };
  });

  objectBodies.set(1, asciiObject("<< /Type /Catalog /Pages 2 0 R >>"));
  objectBodies.set(2, asciiObject(`<< /Type /Pages /Count ${pageNumbers.length} /Kids [${pageNumbers.map(number => `${number} 0 R`).join(" ")}] >>`));
  objectBodies.set(3, asciiObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"));

  slideObjects.forEach((entry, index) => {
    const stream = asciiObject(pdfSlideStream(entry.slide, index + 1, !!entry.asset));
    objectBodies.set(entry.content, concatBytes([
      asciiObject(`<< /Length ${stream.length} >>\nstream\n`),
      stream,
      asciiObject("endstream"),
    ]));
    const imageResource = entry.image ? ` /XObject << /Im1 ${entry.image} 0 R >>` : "";
    objectBodies.set(entry.page, asciiObject(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PDF_WIDTH} ${PDF_HEIGHT}] /Resources << /Font << /F1 3 0 R >>${imageResource} >> /Contents ${entry.content} 0 R >>`));
    if (entry.image && entry.asset) {
      objectBodies.set(entry.image, concatBytes([
        asciiObject(`<< /Type /XObject /Subtype /Image /Width ${entry.asset.width} /Height ${entry.asset.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${entry.asset.bytes.length} >>\nstream\n`),
        entry.asset.bytes,
        asciiObject("\nendstream"),
      ]));
    }
    onProgress?.("Building PDF", index + 1, slides.length);
  });

  const header = asciiObject("%PDF-1.4\n%VIRELLE\n");
  const parts: Uint8Array[] = [header];
  const offsets: number[] = [0];
  let cursor = header.length;
  const objectCount = nextObject - 1;
  for (let objectNumber = 1; objectNumber <= objectCount; objectNumber += 1) {
    offsets[objectNumber] = cursor;
    const body = objectBodies.get(objectNumber) || asciiObject("<< >>");
    const objectBytes = concatBytes([
      asciiObject(`${objectNumber} 0 obj\n`),
      body,
      asciiObject("\nendobj\n"),
    ]);
    parts.push(objectBytes);
    cursor += objectBytes.length;
  }
  const xrefOffset = cursor;
  const xrefLines = [`xref`, `0 ${objectCount + 1}`, "0000000000 65535 f "];
  for (let objectNumber = 1; objectNumber <= objectCount; objectNumber += 1) {
    xrefLines.push(`${String(offsets[objectNumber]).padStart(10, "0")} 00000 n `);
  }
  const trailer = `${xrefLines.join("\n")}\ntrailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  parts.push(asciiObject(trailer));
  const pdfBytes = concatBytes(parts);
  return {
    blob: new Blob([pdfBytes], { type: "application/pdf" }),
    filename: `${safeFilename(data.title || "Virelle_Pitch_Deck")}.pdf`,
  };
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    table[index] = value >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function littleEndian(values: Array<[number, number]>): Uint8Array {
  const length = values.reduce((sum, [, size]) => sum + size, 0);
  const bytes = new Uint8Array(length);
  const view = new DataView(bytes.buffer);
  let offset = 0;
  for (const [value, size] of values) {
    if (size === 2) view.setUint16(offset, value, true);
    else view.setUint32(offset, value >>> 0, true);
    offset += size;
  }
  return bytes;
}

function dosDateTime(date = new Date()): { date: number; time: number } {
  const year = Math.max(1980, date.getFullYear());
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

function createZip(files: Array<{ name: string; data: Uint8Array }>): Uint8Array {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  const { date, time } = dosDateTime();
  let offset = 0;

  for (const file of files) {
    const name = UTF8.encode(file.name);
    const checksum = crc32(file.data);
    const localHeader = littleEndian([
      [0x04034b50, 4], [20, 2], [0, 2], [0, 2], [time, 2], [date, 2],
      [checksum, 4], [file.data.length, 4], [file.data.length, 4], [name.length, 2], [0, 2],
    ]);
    const local = concatBytes([localHeader, name, file.data]);
    localParts.push(local);

    const centralHeader = littleEndian([
      [0x02014b50, 4], [20, 2], [20, 2], [0, 2], [0, 2], [time, 2], [date, 2],
      [checksum, 4], [file.data.length, 4], [file.data.length, 4], [name.length, 2],
      [0, 2], [0, 2], [0, 2], [0, 2], [0, 4], [offset, 4],
    ]);
    centralParts.push(concatBytes([centralHeader, name]));
    offset += local.length;
  }

  const localBytes = concatBytes(localParts);
  const centralBytes = concatBytes(centralParts);
  const end = littleEndian([
    [0x06054b50, 4], [0, 2], [0, 2], [files.length, 2], [files.length, 2],
    [centralBytes.length, 4], [localBytes.length, 4], [0, 2],
  ]);
  return concatBytes([localBytes, centralBytes, end]);
}

function pptTextShape(id: number, name: string, x: number, y: number, width: number, height: number, text: string, fontSize: number, color: string, bold = false): string {
  const paragraphs = cleanText(text).split(/\n+/).filter(Boolean).map(line => `<a:p><a:r><a:rPr lang="en-AU" sz="${Math.round(fontSize * 100)}"${bold ? ' b="1"' : ""}><a:solidFill><a:srgbClr val="${color}"/></a:solidFill><a:latin typeface="Aptos"/></a:rPr><a:t>${xmlEscape(line)}</a:t></a:r><a:endParaRPr lang="en-AU" sz="${Math.round(fontSize * 100)}"/></a:p>`).join("");
  return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="${xmlEscape(name)}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${width}" cy="${height}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></p:spPr><p:txBody><a:bodyPr wrap="square" lIns="0" rIns="0" tIns="0" bIns="0"/><a:lstStyle/>${paragraphs || '<a:p><a:endParaRPr lang="en-AU"/></a:p>'}</p:txBody></p:sp>`;
}

function pptRectShape(id: number, name: string, x: number, y: number, width: number, height: number, color: string): string {
  return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="${xmlEscape(name)}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${width}" cy="${height}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="${color}"/></a:solidFill><a:ln><a:noFill/></a:ln></p:spPr></p:sp>`;
}

function pptImageShape(id: number, relationId: string, x: number, y: number, width: number, height: number): string {
  return `<p:pic><p:nvPicPr><p:cNvPr id="${id}" name="Image ${id}"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="${relationId}"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${width}" cy="${height}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:ln><a:solidFill><a:srgbClr val="D4AF37"/></a:solidFill><a:prstDash val="solid"/></a:ln></p:spPr></p:pic>`;
}

function slideXml(slide: DeckSlide, hasImage: boolean): string {
  const textWidth = hasImage ? Math.round(PPT_WIDTH * 0.48) : Math.round(PPT_WIDTH * 0.84);
  const title = pptTextShape(3, "Title", Math.round(0.72 * EMU), Math.round(0.72 * EMU), textWidth, Math.round(0.7 * EMU), slide.title, 25, "F7F7FA", true);
  const accent = pptRectShape(2, "Gold accent", Math.round(0.72 * EMU), Math.round(0.55 * EMU), Math.round(1.5 * EMU), Math.round(0.05 * EMU), "D4AF37");
  let y = 1.55;
  const shapes: string[] = [pptRectShape(1, "Background", 0, 0, PPT_WIDTH, PPT_HEIGHT, "09090F"), accent, title];
  if (slide.subtitle) {
    shapes.push(pptTextShape(4, "Subtitle", Math.round(0.72 * EMU), Math.round(y * EMU), textWidth, Math.round(0.9 * EMU), slide.subtitle, 14, "D4AF37", false));
    y += 0.9;
  }
  if (slide.body) {
    shapes.push(pptTextShape(5, "Body", Math.round(0.72 * EMU), Math.round(y * EMU), textWidth, Math.round(2.5 * EMU), wrapText(slide.body, hasImage ? 58 : 96).slice(0, 12).join("\n"), 11.5, "C6C6CF", false));
    y += 2.2;
  }
  if (slide.bullets) {
    const bulletText = slide.bullets.slice(0, 8).map(item => `- ${cleanText(item)}`).join("\n");
    shapes.push(pptTextShape(6, "Bullets", Math.round(0.85 * EMU), Math.round(y * EMU), textWidth, Math.round(3.2 * EMU), bulletText, 11, "D0D0D8", false));
  }
  if (hasImage) shapes.push(pptImageShape(7, "rId2", Math.round(7.25 * EMU), Math.round(1.55 * EMU), Math.round(5.35 * EMU), Math.round(4.65 * EMU)));
  shapes.push(pptTextShape(8, "Footer", Math.round(0.72 * EMU), Math.round(7.02 * EMU), Math.round(4.5 * EMU), Math.round(0.25 * EMU), "Virelle Studios", 8, "6F6F79", false));
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="0" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>${shapes.join("")}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`;
}

function basePresentationFiles(slideCount: number): Array<{ name: string; data: Uint8Array }> {
  const slideOverrides = Array.from({ length: slideCount }, (_, index) => `<Override PartName="/ppt/slides/slide${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join("");
  const slideIds = Array.from({ length: slideCount }, (_, index) => `<p:sldId id="${256 + index}" r:id="rId${index + 2}"/>`).join("");
  const presentationRelationships = [`<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>`, ...Array.from({ length: slideCount }, (_, index) => `<Relationship Id="rId${index + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${index + 1}.xml"/>`)].join("");
  const now = new Date().toISOString();
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="jpg" ContentType="image/jpeg"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/><Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/><Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>${slideOverrides}</Types>`;
  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`;
  const presentation = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst>${slideIds}</p:sldIdLst><p:sldSz cx="${PPT_WIDTH}" cy="${PPT_HEIGHT}" type="screen16x9"/><p:notesSz cx="6858000" cy="9144000"/><p:defaultTextStyle/></p:presentation>`;
  const presentationRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${presentationRelationships}</Relationships>`;
  const master = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld><p:clrMap accent1="D4AF37" accent2="8B7A3A" accent3="6B7280" accent4="4B5563" accent5="9CA3AF" accent6="F5F5F5" bg1="09090F" bg2="15151F" folHlink="954F72" hlink="0563C1" tx1="F7F7FA" tx2="C6C6CF"/><p:sldLayoutIdLst><p:sldLayoutId id="1" r:id="rId2"/></p:sldLayoutIdLst><p:txStyles><p:titleStyle/><p:bodyStyle/><p:otherStyle/></p:txStyles></p:sldMaster>`;
  const masterRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/></Relationships>`;
  const layout = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank" preserve="1"><p:cSld name="Blank"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`;
  const layoutRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/></Relationships>`;
  const theme = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Virelle"><a:themeElements><a:clrScheme name="Virelle"><a:dk1><a:srgbClr val="09090F"/></a:dk1><a:lt1><a:srgbClr val="F7F7FA"/></a:lt1><a:dk2><a:srgbClr val="15151F"/></a:dk2><a:lt2><a:srgbClr val="C6C6CF"/></a:lt2><a:accent1><a:srgbClr val="D4AF37"/></a:accent1><a:accent2><a:srgbClr val="8B7A3A"/></a:accent2><a:accent3><a:srgbClr val="6B7280"/></a:accent3><a:accent4><a:srgbClr val="4B5563"/></a:accent4><a:accent5><a:srgbClr val="9CA3AF"/></a:accent5><a:accent6><a:srgbClr val="F5F5F5"/></a:accent6><a:hlink><a:srgbClr val="0563C1"/></a:hlink><a:folHlink><a:srgbClr val="954F72"/></a:folHlink></a:clrScheme><a:fontScheme name="Aptos"><a:majorFont><a:latin typeface="Aptos Display"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont><a:minorFont><a:latin typeface="Aptos"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme><a:fmtScheme name="Virelle"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="12700"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>`;
  const core = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>Virelle Pitch Deck</dc:title><dc:creator>Virelle Studios</dc:creator><cp:lastModifiedBy>Virelle Studios</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified></cp:coreProperties>`;
  const app = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>Virelle Studios</Application><PresentationFormat>On-screen Show (16:9)</PresentationFormat><Slides>${slideCount}</Slides><Company>Virelle Studios</Company><AppVersion>1.0</AppVersion></Properties>`;
  return [
    ["[Content_Types].xml", contentTypes], ["_rels/.rels", rootRels], ["ppt/presentation.xml", presentation], ["ppt/_rels/presentation.xml.rels", presentationRels],
    ["ppt/slideMasters/slideMaster1.xml", master], ["ppt/slideMasters/_rels/slideMaster1.xml.rels", masterRels], ["ppt/slideLayouts/slideLayout1.xml", layout],
    ["ppt/slideLayouts/_rels/slideLayout1.xml.rels", layoutRels], ["ppt/theme/theme1.xml", theme], ["docProps/core.xml", core], ["docProps/app.xml", app],
  ].map(([name, value]) => ({ name, data: UTF8.encode(value) }));
}

export async function createPitchDeckPptx(
  data: PitchDeckData,
  options: PitchDeckExportOptions,
  onProgress?: (stage: string, done: number, total: number) => void,
): Promise<{ blob: Blob; filename: string }> {
  const slides = buildPitchDeckSlides(data, options);
  const images = await loadSlideImages(slides, (done, total) => onProgress?.("Preparing images", done, total));
  const files = basePresentationFiles(slides.length);
  let mediaIndex = 0;
  slides.forEach((slide, index) => {
    const image = images[index];
    let relations = `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>`;
    if (image) {
      mediaIndex += 1;
      files.push({ name: `ppt/media/image${mediaIndex}.jpg`, data: image.bytes });
      relations += `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image${mediaIndex}.jpg"/>`;
    }
    files.push({ name: `ppt/slides/slide${index + 1}.xml`, data: UTF8.encode(slideXml(slide, !!image)) });
    files.push({ name: `ppt/slides/_rels/slide${index + 1}.xml.rels`, data: UTF8.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${relations}</Relationships>`) });
    onProgress?.("Building PowerPoint", index + 1, slides.length);
  });
  const zip = createZip(files);
  return {
    blob: new Blob([zip], { type: "application/vnd.openxmlformats-officedocument.presentationml.presentation" }),
    filename: `${safeFilename(data.title || "Virelle_Pitch_Deck")}.pptx`,
  };
}

export function downloadPitchDeckFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
