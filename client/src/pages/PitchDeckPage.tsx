import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useParams } from "wouter";
import {
  Download,
  FileDown,
  FilePresentation,
  Loader2,
  Printer,
  Save,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import SiteHead from "@/components/SiteHead";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";

type InvestorFields = {
  fundingAsk: string;
  useOfFunds: string;
  targetAudience: string;
  marketPosition: string;
  distributionStrategy: string;
  contactLine: string;
};

type DeckSlide = {
  title: string;
  subtitle?: string;
  bullets: string[];
  kicker?: string;
};

const DEFAULT_INVESTOR_FIELDS: InvestorFields = {
  fundingAsk: "Funding ask to be confirmed",
  useOfFunds: "Production, post-production, distribution, marketing, contingency",
  targetAudience: "Define the primary audience, secondary audience, and territory focus",
  marketPosition: "State the film's distinctive commercial and creative position",
  distributionStrategy: "Festivals, sales agents, distributors, broadcasters, streaming and direct audience release",
  contactLine: "Virelle Studios project team",
};

const PPTX_WIDTH = 12_192_000;
const PPTX_HEIGHT = 6_858_000;
const encoder = new TextEncoder();

function safeFilename(value: string): string {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9-_]+/g, "_")
    .replace(/^_+|_+$/g, "") || "virelle_pitch_deck";
}

function xmlEscape(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function plainText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(plainText).filter(Boolean).join(", ");
  if (typeof value === "object") {
    const object = value as Record<string, unknown>;
    const total = object.total ?? object.totalEstimate ?? object.amount;
    const currency = object.currency ?? "";
    if (total !== undefined) {
      const numeric = Number(total);
      return Number.isFinite(numeric)
        ? `${currency ? `${currency} ` : ""}${numeric.toLocaleString()}`
        : `${currency ? `${currency} ` : ""}${String(total)}`;
    }
    return Object.entries(object)
      .map(([key, item]) => `${key.replace(/([A-Z])/g, " $1")}: ${plainText(item)}`)
      .filter(item => !item.endsWith(": "))
      .join(" · ");
  }
  return String(value);
}

function compact(value: unknown, fallback = "Not yet specified"): string {
  const text = plainText(value).replace(/\s+/g, " ").trim();
  return text || fallback;
}

function limitText(value: string, maximum: number): string {
  if (value.length <= maximum) return value;
  return `${value.slice(0, Math.max(0, maximum - 1)).trimEnd()}…`;
}

function buildSlides(data: any, investor: InvestorFields): DeckSlide[] {
  const characters = Array.isArray(data?.characters) ? data.characters : [];
  const scenes = Array.isArray(data?.scenes) ? data.scenes : [];
  const moodBoard = Array.isArray(data?.moodBoard) ? data.moodBoard : [];
  const themes = compact(data?.themes);
  const budget = compact(data?.budgetEstimate, "Budget estimate to be finalised");
  const productionPlan = compact(data?.productionPlan, "Production schedule and delivery milestones to be finalised");

  return [
    {
      kicker: "VIRELLE STUDIOS · INVESTOR PITCH",
      title: compact(data?.title, "Untitled Project"),
      subtitle: compact(data?.logline, "A distinctive screen project in development"),
      bullets: [
        [data?.genre, data?.rating, data?.tone].filter(Boolean).join(" · ") || "Genre and tone to be confirmed",
        investor.contactLine,
      ],
    },
    {
      kicker: "THE STORY",
      title: "Synopsis",
      subtitle: limitText(compact(data?.synopsis, data?.description), 900),
      bullets: [
        `Themes: ${themes}`,
        `Tone: ${compact(data?.tone)}`,
        `Genre: ${compact(data?.genre)}`,
      ],
    },
    {
      kicker: "CREATIVE VISION",
      title: "Why this film",
      subtitle: limitText(compact(data?.creativeVision ?? data?.directorVision ?? data?.themes), 700),
      bullets: [
        `Market position: ${compact(investor.marketPosition)}`,
        `Target audience: ${compact(investor.targetAudience)}`,
        `Visual references available: ${moodBoard.length}`,
      ],
    },
    {
      kicker: "CAST AND CHARACTERS",
      title: "Character engine",
      subtitle: `${characters.length} principal character${characters.length === 1 ? "" : "s"} currently defined`,
      bullets:
        characters.length > 0
          ? characters.slice(0, 8).map((character: any) =>
              `${compact(character.name, "Unnamed character")}: ${limitText(compact(character.description ?? character.role), 180)}`,
            )
          : ["Character profiles and casting references are still in development"],
    },
    {
      kicker: "VISUAL WORLD",
      title: "Storyboard and production design",
      subtitle: `${scenes.length} scene${scenes.length === 1 ? "" : "s"} · ${moodBoard.length} mood-board reference${moodBoard.length === 1 ? "" : "s"}`,
      bullets:
        scenes.length > 0
          ? scenes.slice(0, 7).map((scene: any, index: number) =>
              `Scene ${scene.sceneNumber ?? index + 1} — ${compact(scene.title, "Untitled")}: ${limitText(compact(scene.description), 150)}`,
            )
          : ["Storyboard frames will be generated from the approved script breakdown"],
    },
    {
      kicker: "PRODUCTION",
      title: "Plan and delivery",
      subtitle: limitText(productionPlan, 800),
      bullets: [
        "Script → storyboard → production → post-production → release",
        "Persistent scene, continuity, wardrobe, audio, and cut-management workflows",
        "Delivery plan can be aligned to festival, distributor, broadcaster, or platform deadlines",
      ],
    },
    {
      kicker: "FINANCE",
      title: "Budget and funding ask",
      subtitle: `Current budget estimate: ${budget}`,
      bullets: [
        `Funding ask: ${compact(investor.fundingAsk)}`,
        `Use of funds: ${compact(investor.useOfFunds)}`,
        "Detailed category budgets, contingency, incentives, and recoupment structure should accompany investor diligence",
      ],
    },
    {
      kicker: "GO-TO-MARKET",
      title: "Audience and distribution",
      subtitle: limitText(compact(investor.distributionStrategy), 700),
      bullets: [
        `Primary audience: ${compact(investor.targetAudience)}`,
        `Positioning: ${compact(investor.marketPosition)}`,
        "Campaign assets, press kit, festival package, crowdfunding, funding directory, and distribution tools are available within Virelle",
      ],
    },
    {
      kicker: "THE ASK",
      title: "Partner with the project",
      subtitle: compact(investor.fundingAsk),
      bullets: [
        compact(investor.useOfFunds),
        "Next step: review the screenplay, budget, schedule, visual references, and proposed investment terms",
        compact(investor.contactLine),
      ],
    },
  ];
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

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let value = n;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[n] = value >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date = new Date()): { time: number; date: number } {
  const year = Math.max(1980, date.getFullYear());
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

function buildStoredZip(files: Array<{ name: string; content: string | Uint8Array }>): Uint8Array {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let localOffset = 0;
  const stamp = dosDateTime();

  for (const file of files) {
    const name = encoder.encode(file.name);
    const data = typeof file.content === "string" ? encoder.encode(file.content) : file.content;
    const crc = crc32(data);
    const localHeader = concatBytes([
      uint32(0x04034b50),
      uint16(20),
      uint16(0x0800),
      uint16(0),
      uint16(stamp.time),
      uint16(stamp.date),
      uint32(crc),
      uint32(data.length),
      uint32(data.length),
      uint16(name.length),
      uint16(0),
      name,
    ]);
    localParts.push(localHeader, data);

    centralParts.push(
      concatBytes([
        uint32(0x02014b50),
        uint16(20),
        uint16(20),
        uint16(0x0800),
        uint16(0),
        uint16(stamp.time),
        uint16(stamp.date),
        uint32(crc),
        uint32(data.length),
        uint32(data.length),
        uint16(name.length),
        uint16(0),
        uint16(0),
        uint16(0),
        uint16(0),
        uint32(0),
        uint32(localOffset),
        name,
      ]),
    );
    localOffset += localHeader.length + data.length;
  }

  const central = concatBytes(centralParts);
  const end = concatBytes([
    uint32(0x06054b50),
    uint16(0),
    uint16(0),
    uint16(files.length),
    uint16(files.length),
    uint32(central.length),
    uint32(localOffset),
    uint16(0),
  ]);
  return concatBytes([...localParts, central, end]);
}

function pptxParagraph(text: string, size: number, color: string, bold = false, bullet = false): string {
  return `<a:p>${bullet ? '<a:pPr marL="342900" indent="-171450"><a:buChar char="•"/></a:pPr>' : ""}<a:r><a:rPr lang="en-AU" sz="${size * 100}" b="${bold ? 1 : 0}" dirty="0"><a:solidFill><a:srgbClr val="${color}"/></a:solidFill><a:latin typeface="Aptos"/></a:rPr><a:t>${xmlEscape(text)}</a:t></a:r><a:endParaRPr lang="en-AU" sz="${size * 100}"/></a:p>`;
}

function pptxTextBox(
  id: number,
  name: string,
  x: number,
  y: number,
  width: number,
  height: number,
  paragraphs: string,
  fill?: string,
): string {
  return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="${xmlEscape(name)}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${width}" cy="${height}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom>${fill ? `<a:solidFill><a:srgbClr val="${fill}"/></a:solidFill>` : '<a:noFill/>'}<a:ln><a:noFill/></a:ln></p:spPr><p:txBody><a:bodyPr wrap="square" lIns="91440" rIns="91440" tIns="45720" bIns="45720"/><a:lstStyle/>${paragraphs}</p:txBody></p:sp>`;
}

function buildPptxSlide(slide: DeckSlide, index: number): string {
  const body = slide.bullets
    .slice(0, 8)
    .map(item => pptxParagraph(limitText(item, 300), 18, "E7E5E4", false, true))
    .join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld name="Slide ${index + 1}"><p:bg><p:bgPr><a:solidFill><a:srgbClr val="090910"/></a:solidFill><a:effectLst/></p:bgPr></p:bg><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
${pptxTextBox(2, "Accent", 0, 0, 190_500, PPTX_HEIGHT, "", "D4AF37")}
${pptxTextBox(3, "Kicker", 720_000, 450_000, 10_400_000, 450_000, pptxParagraph(slide.kicker || "VIRELLE STUDIOS", 11, "D4AF37", true))}
${pptxTextBox(4, "Title", 720_000, 1_050_000, 10_600_000, 1_100_000, pptxParagraph(limitText(slide.title, 120), 30, "FFFFFF", true))}
${slide.subtitle ? pptxTextBox(5, "Subtitle", 720_000, 2_050_000, 10_500_000, 1_150_000, pptxParagraph(limitText(slide.subtitle, 700), 17, "B8B5AD")) : ""}
${pptxTextBox(6, "Body", 850_000, slide.subtitle ? 3_250_000 : 2_450_000, 10_200_000, slide.subtitle ? 2_650_000 : 3_350_000, body)}
${pptxTextBox(7, "Footer", 720_000, 6_250_000, 10_500_000, 300_000, pptxParagraph(`${index + 1}  ·  Virelle Studios`, 9, "77736B"))}
</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`;
}

function buildPptx(slides: DeckSlide[], title: string): Uint8Array {
  const slideOverrides = slides
    .map((_, index) => `<Override PartName="/ppt/slides/slide${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`)
    .join("");
  const slideIds = slides
    .map((_, index) => `<p:sldId id="${256 + index}" r:id="rId${index + 2}"/>`)
    .join("");
  const slideRels = slides
    .map((_, index) => `<Relationship Id="rId${index + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${index + 1}.xml"/>`)
    .join("");
  const now = new Date().toISOString();

  const files: Array<{ name: string; content: string }> = [
    {
      name: "[Content_Types].xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/><Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/><Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>${slideOverrides}</Types>`,
    },
    {
      name: "_rels/.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`,
    },
    {
      name: "docProps/core.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${xmlEscape(title)}</dc:title><dc:creator>Virelle Studios</dc:creator><cp:lastModifiedBy>Virelle Studios</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified></cp:coreProperties>`,
    },
    {
      name: "docProps/app.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>Virelle Studios</Application><PresentationFormat>Widescreen</PresentationFormat><Slides>${slides.length}</Slides><Notes>0</Notes><HiddenSlides>0</HiddenSlides><Company>Virelle Studios</Company><AppVersion>1.0</AppVersion></Properties>`,
    },
    {
      name: "ppt/presentation.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst>${slideIds}</p:sldIdLst><p:sldSz cx="${PPTX_WIDTH}" cy="${PPTX_HEIGHT}" type="screen16x9"/><p:notesSz cx="6858000" cy="9144000"/><p:defaultTextStyle/></p:presentation>`,
    },
    {
      name: "ppt/_rels/presentation.xml.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>${slideRels}</Relationships>`,
    },
    {
      name: "ppt/slideMasters/slideMaster1.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld><p:clrMap accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" bg1="lt1" bg2="lt2" folHlink="folHlink" hlink="hlink" tx1="dk1" tx2="dk2"/><p:sldLayoutIdLst><p:sldLayoutId id="1" r:id="rId1"/></p:sldLayoutIdLst><p:txStyles><p:titleStyle/><p:bodyStyle/><p:otherStyle/></p:txStyles></p:sldMaster>`,
    },
    {
      name: "ppt/slideMasters/_rels/slideMaster1.xml.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/></Relationships>`,
    },
    {
      name: "ppt/slideLayouts/slideLayout1.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank" preserve="1"><p:cSld name="Blank"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`,
    },
    {
      name: "ppt/slideLayouts/_rels/slideLayout1.xml.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/></Relationships>`,
    },
    {
      name: "ppt/theme/theme1.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Virelle Dark"><a:themeElements><a:clrScheme name="Virelle"><a:dk1><a:srgbClr val="090910"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="262626"/></a:dk2><a:lt2><a:srgbClr val="E7E5E4"/></a:lt2><a:accent1><a:srgbClr val="D4AF37"/></a:accent1><a:accent2><a:srgbClr val="B8960C"/></a:accent2><a:accent3><a:srgbClr val="6366F1"/></a:accent3><a:accent4><a:srgbClr val="10B981"/></a:accent4><a:accent5><a:srgbClr val="EC4899"/></a:accent5><a:accent6><a:srgbClr val="F97316"/></a:accent6><a:hlink><a:srgbClr val="3B82F6"/></a:hlink><a:folHlink><a:srgbClr val="8B5CF6"/></a:folHlink></a:clrScheme><a:fontScheme name="Aptos"><a:majorFont><a:latin typeface="Aptos Display"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont><a:minorFont><a:latin typeface="Aptos"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme><a:fmtScheme name="Virelle"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="6350" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>`,
    },
  ];

  slides.forEach((slide, index) => {
    files.push({ name: `ppt/slides/slide${index + 1}.xml`, content: buildPptxSlide(slide, index) });
  });
  return buildStoredZip(files);
}

function pdfSafe(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/[^\x20-\x7E\n]/g, " ")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function wrapLines(value: string, maximumCharacters: number): string[] {
  const words = value.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maximumCharacters && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function buildPdf(slides: DeckSlide[]): Uint8Array {
  const pageWidth = 842;
  const pageHeight = 595;
  const objects = new Map<number, string>();
  objects.set(1, "<< /Type /Catalog /Pages 2 0 R >>");
  objects.set(3, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  objects.set(4, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  const pageIds: number[] = [];

  slides.forEach((slide, index) => {
    const pageId = 5 + index * 2;
    const contentId = pageId + 1;
    pageIds.push(pageId);
    const commands: string[] = [
      "0.035 0.035 0.063 rg 0 0 842 595 re f",
      "0.831 0.686 0.216 rg 0 0 12 595 re f",
      "0.831 0.686 0.216 rg 46 520 750 2 re f",
    ];

    const addText = (font: "F1" | "F2", size: number, color: [number, number, number], x: number, y: number, text: string) => {
      commands.push(`BT /${font} ${size} Tf ${color.join(" ")} rg 1 0 0 1 ${x} ${y} Tm (${pdfSafe(text)}) Tj ET`);
    };

    addText("F2", 10, [0.831, 0.686, 0.216], 48, 548, slide.kicker || "VIRELLE STUDIOS");
    const titleLines = wrapLines(slide.title, 38).slice(0, 2);
    titleLines.forEach((line, lineIndex) => addText("F2", 29, [1, 1, 1], 48, 492 - lineIndex * 36, line));
    let cursor = 420 - Math.max(0, titleLines.length - 1) * 26;
    if (slide.subtitle) {
      const subtitleLines = wrapLines(slide.subtitle, 80).slice(0, 5);
      subtitleLines.forEach((line, lineIndex) => addText("F1", 15, [0.76, 0.75, 0.71], 48, cursor - lineIndex * 20, line));
      cursor -= subtitleLines.length * 20 + 24;
    }
    slide.bullets.slice(0, 8).forEach(bullet => {
      const lines = wrapLines(bullet, 82).slice(0, 3);
      addText("F2", 12, [0.831, 0.686, 0.216], 55, cursor, "-");
      lines.forEach((line, lineIndex) => addText("F1", 12, [0.91, 0.9, 0.88], 72, cursor - lineIndex * 16, line));
      cursor -= Math.max(1, lines.length) * 16 + 10;
    });
    addText("F1", 8, [0.45, 0.44, 0.42], 48, 28, `${index + 1} / ${slides.length}   Virelle Studios`);

    const stream = commands.join("\n");
    objects.set(contentId, `<< /Length ${encoder.encode(stream).length} >>\nstream\n${stream}\nendstream`);
    objects.set(
      pageId,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`,
    );
  });

  objects.set(2, `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`);
  const maximumId = Math.max(...objects.keys());
  const chunks: Uint8Array[] = [encoder.encode("%PDF-1.4\n%Virelle\n")];
  const offsets = new Array<number>(maximumId + 1).fill(0);
  let byteOffset = chunks[0].length;

  for (let id = 1; id <= maximumId; id += 1) {
    const body = objects.get(id) || "<< >>";
    const chunk = encoder.encode(`${id} 0 obj\n${body}\nendobj\n`);
    offsets[id] = byteOffset;
    chunks.push(chunk);
    byteOffset += chunk.length;
  }

  const xrefOffset = byteOffset;
  let xref = `xref\n0 ${maximumId + 1}\n0000000000 65535 f \n`;
  for (let id = 1; id <= maximumId; id += 1) {
    xref += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  }
  xref += `trailer\n<< /Size ${maximumId + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  chunks.push(encoder.encode(xref));
  return concatBytes(chunks);
}

function downloadBytes(filename: string, mimeType: string, bytes: Uint8Array): void {
  const blobBytes = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const url = URL.createObjectURL(new Blob([blobBytes], { type: mimeType }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function SlideSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="pitch-slide break-after-page overflow-hidden rounded-2xl border border-amber-400/15 bg-[#090910] p-8 shadow-2xl print:min-h-[185mm] print:rounded-none print:border-0 print:shadow-none">
      <div className="mb-6 flex items-center gap-3">
        <div className="h-8 w-1 rounded-full bg-amber-400" />
        <h2 className="text-xs font-bold uppercase tracking-[0.24em] text-amber-300">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export default function PitchDeckPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = Number(params?.projectId);
  const validProjectId = Number.isFinite(projectId) && projectId > 0;
  const deckQ = trpc.pitchDeck.get.useQuery(
    { projectId },
    { enabled: validProjectId },
  );
  const data: any = deckQ.data;
  const storageKey = `virelle:pitch-deck:${projectId}:investor-fields`;
  const [investor, setInvestor] = useState<InvestorFields>(DEFAULT_INVESTOR_FIELDS);
  const [exporting, setExporting] = useState<"pdf" | "pptx" | null>(null);

  useEffect(() => {
    if (!validProjectId) return;
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored) setInvestor({ ...DEFAULT_INVESTOR_FIELDS, ...JSON.parse(stored) });
    } catch {
      // Invalid local data is ignored in favour of safe defaults.
    }
  }, [storageKey, validProjectId]);

  const slides = useMemo(() => (data ? buildSlides(data, investor) : []), [data, investor]);

  const saveInvestorFields = () => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(investor));
      toast.success("Investor fields saved for this project.");
    } catch {
      toast.error("Investor fields could not be saved in this browser.");
    }
  };

  const exportPdf = () => {
    if (!data || slides.length === 0) return;
    setExporting("pdf");
    try {
      downloadBytes(
        `${safeFilename(data.title || "project")}_pitch_deck.pdf`,
        "application/pdf",
        buildPdf(slides),
      );
      toast.success("Pitch deck PDF downloaded.");
    } catch (error: any) {
      toast.error(error?.message || "PDF export failed.");
    } finally {
      setExporting(null);
    }
  };

  const exportPptx = () => {
    if (!data || slides.length === 0) return;
    setExporting("pptx");
    try {
      downloadBytes(
        `${safeFilename(data.title || "project")}_pitch_deck.pptx`,
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        buildPptx(slides, data.title || "Virelle Pitch Deck"),
      );
      toast.success("Editable PowerPoint deck downloaded.");
    } catch (error: any) {
      toast.error(error?.message || "PowerPoint export failed.");
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#07070e_0%,#0c0b18_60%,#07070a_100%)] px-4 py-6 text-zinc-100 print:bg-white print:p-0 print:text-black">
      <SiteHead title={`Pitch Deck — ${data?.title ?? "Project"}`} />
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 0; }
          .pitch-slide { width: 297mm; height: 210mm; padding: 18mm; page-break-after: always; color: white !important; background: #090910 !important; }
          .pitch-slide:last-child { page-break-after: auto; }
        }
      `}</style>

      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link
            href={`/projects/${projectId}`}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-300 hover:bg-white/10"
          >
            ← Back to project
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="gap-2 border-white/10" onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Print
            </Button>
            <Button variant="outline" className="gap-2 border-white/10" onClick={exportPdf} disabled={!data || exporting !== null}>
              {exporting === "pdf" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
              Download PDF
            </Button>
            <Button className="gap-2 bg-amber-500 text-black hover:bg-amber-400" onClick={exportPptx} disabled={!data || exporting !== null}>
              {exporting === "pptx" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FilePresentation className="h-4 w-4" />}
              Download PPTX
            </Button>
          </div>
        </div>

        {deckQ.isLoading && (
          <div className="flex min-h-[400px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
          </div>
        )}

        {deckQ.error && (
          <Card className="border-red-500/30 bg-red-500/5">
            <CardContent className="py-8 text-center text-sm text-red-200">{deckQ.error.message}</CardContent>
          </Card>
        )}

        {data && (
          <>
            <Card className="border-amber-400/20 bg-black/25 print:hidden">
              <CardContent className="space-y-4 pt-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-amber-400" />
                      <h2 className="font-semibold">Investor and market details</h2>
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">
                      Project, character, budget, production, mood-board, and storyboard data are loaded automatically. Complete the commercial fields before exporting.
                    </p>
                  </div>
                  <Button size="sm" variant="outline" className="gap-2 border-white/10" onClick={saveInvestorFields}>
                    <Save className="h-4 w-4" /> Save fields
                  </Button>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Funding ask</Label>
                    <Input value={investor.fundingAsk} onChange={event => setInvestor(current => ({ ...current, fundingAsk: event.target.value }))} placeholder="Example: AUD 750,000 equity and gap finance" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Contact / presenter</Label>
                    <Input value={investor.contactLine} onChange={event => setInvestor(current => ({ ...current, contactLine: event.target.value }))} />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <Label>Use of funds</Label>
                    <Textarea rows={2} value={investor.useOfFunds} onChange={event => setInvestor(current => ({ ...current, useOfFunds: event.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Target audience</Label>
                    <Textarea rows={3} value={investor.targetAudience} onChange={event => setInvestor(current => ({ ...current, targetAudience: event.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Market position</Label>
                    <Textarea rows={3} value={investor.marketPosition} onChange={event => setInvestor(current => ({ ...current, marketPosition: event.target.value }))} />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <Label>Distribution strategy</Label>
                    <Textarea rows={3} value={investor.distributionStrategy} onChange={event => setInvestor(current => ({ ...current, distributionStrategy: event.target.value }))} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <SlideSection title="Virelle Studios · Investor Pitch">
              <div className="flex min-h-[430px] flex-col items-center justify-center text-center">
                <Badge className="bg-amber-400/10 text-amber-300">{[data.genre, data.rating, data.tone].filter(Boolean).join(" · ") || "Screen project"}</Badge>
                <h1 className="mt-6 text-5xl font-semibold text-amber-100 sm:text-7xl">{data.title}</h1>
                <p className="mt-6 max-w-3xl text-xl italic leading-relaxed text-zinc-300">{compact(data.logline, "Logline in development")}</p>
                <p className="mt-10 text-sm text-zinc-500">{investor.contactLine}</p>
              </div>
            </SlideSection>

            <SlideSection title="Story">
              <h2 className="text-3xl font-semibold text-white">Synopsis</h2>
              <p className="mt-6 whitespace-pre-wrap text-lg leading-relaxed text-zinc-300">{compact(data.synopsis, data.description)}</p>
              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {[`Genre: ${compact(data.genre)}`, `Tone: ${compact(data.tone)}`, `Themes: ${compact(data.themes)}`].map(item => (
                  <div key={item} className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-zinc-300">{item}</div>
                ))}
              </div>
            </SlideSection>

            {Array.isArray(data.characters) && data.characters.length > 0 && (
              <SlideSection title="Characters">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {data.characters.slice(0, 8).map((character: any) => (
                    <div key={character.id ?? character.name} className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
                      {character.referenceImages?.[0] && <img src={character.referenceImages[0]} alt={character.name} className="h-40 w-full object-cover" />}
                      <div className="p-4">
                        <h3 className="font-medium text-amber-100">{character.name}</h3>
                        <p className="mt-2 text-xs leading-relaxed text-zinc-400">{compact(character.description ?? character.role)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </SlideSection>
            )}

            {Array.isArray(data.moodBoard) && data.moodBoard.length > 0 && (
              <SlideSection title="Visual World">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {data.moodBoard.slice(0, 12).map((item: any, index: number) => (
                    <img key={index} src={item.imageUrl ?? item} alt="Mood-board reference" className="h-40 w-full rounded-xl object-cover" />
                  ))}
                </div>
              </SlideSection>
            )}

            {Array.isArray(data.scenes) && data.scenes.length > 0 && (
              <SlideSection title="Storyboard">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {data.scenes.slice(0, 8).map((scene: any, index: number) => (
                    <div key={scene.id ?? index} className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
                      {scene.thumbnailUrl ? <img src={scene.thumbnailUrl} alt={scene.title || "Storyboard frame"} className="h-36 w-full object-cover" /> : <div className="flex h-36 items-center justify-center bg-black/25 text-xs text-zinc-600">Frame pending</div>}
                      <div className="p-3">
                        <h3 className="text-sm font-medium text-amber-100">Scene {scene.sceneNumber ?? index + 1}: {scene.title}</h3>
                        <p className="mt-1 line-clamp-3 text-xs text-zinc-500">{scene.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </SlideSection>
            )}

            <SlideSection title="Production and Finance">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                  <h3 className="text-xl font-semibold text-amber-100">Production plan</h3>
                  <p className="mt-4 whitespace-pre-wrap leading-relaxed text-zinc-300">{compact(data.productionPlan)}</p>
                </div>
                <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.05] p-6">
                  <h3 className="text-xl font-semibold text-amber-100">Funding</h3>
                  <p className="mt-4 text-sm text-zinc-400">Current budget estimate</p>
                  <p className="mt-1 text-2xl font-semibold text-white">{compact(data.budgetEstimate, "To be finalised")}</p>
                  <p className="mt-5 text-sm text-zinc-400">Funding ask</p>
                  <p className="mt-1 text-xl font-medium text-amber-200">{investor.fundingAsk}</p>
                  <p className="mt-5 text-sm leading-relaxed text-zinc-300">{investor.useOfFunds}</p>
                </div>
              </div>
            </SlideSection>

            <SlideSection title="Audience and Distribution">
              <div className="grid gap-5 md:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"><h3 className="font-semibold text-amber-100">Audience</h3><p className="mt-3 text-sm leading-relaxed text-zinc-300">{investor.targetAudience}</p></div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"><h3 className="font-semibold text-amber-100">Positioning</h3><p className="mt-3 text-sm leading-relaxed text-zinc-300">{investor.marketPosition}</p></div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"><h3 className="font-semibold text-amber-100">Distribution</h3><p className="mt-3 text-sm leading-relaxed text-zinc-300">{investor.distributionStrategy}</p></div>
              </div>
            </SlideSection>

            <SlideSection title="The Ask">
              <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
                <FilePresentation className="h-12 w-12 text-amber-300" />
                <h2 className="mt-6 text-4xl font-semibold text-white">Partner with {data.title}</h2>
                <p className="mt-5 max-w-3xl text-xl text-amber-200">{investor.fundingAsk}</p>
                <p className="mt-5 max-w-3xl leading-relaxed text-zinc-300">{investor.useOfFunds}</p>
                <p className="mt-10 text-sm text-zinc-500">{investor.contactLine}</p>
              </div>
            </SlideSection>
          </>
        )}
      </div>
    </div>
  );
}
