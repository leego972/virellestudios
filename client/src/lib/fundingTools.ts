export type FundingProfile = {
  applicantLegalName?: string;
  tradingName?: string;
  companyCountry?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  projectTitle?: string;
  workingTitle?: string;
  format?: string;
  stage?: string;
  productionCountries?: string;
  coProductionTerritories?: string;
  genre?: string;
  targetAudience?: string;
  logline?: string;
  shortSynopsis?: string;
  longSynopsis?: string;
  directorStatement?: string;
  producerStatement?: string;
  creativeApproach?: string;
  rightsPosition?: string;
  teamSummary?: string;
  totalBudget?: string;
  currency?: string;
  fundingRequested?: string;
  securedFinance?: string;
  pendingFinance?: string;
  taxIncentives?: string;
  producerContribution?: string;
  gap?: string;
  distributionStrategy?: string;
  audienceStrategy?: string;
  festivalStrategy?: string;
  productionSchedule?: string;
  productionRisks?: string;
  sustainabilityAccessibility?: string;
  whyNow?: string;
  whyTeam?: string;
  milestoneUnlocked?: string;
  attachmentChecklist?: Record<string, boolean>;
  budgetLines?: Record<string, string>;
  [key: string]: unknown;
};

export const FUNDING_ATTACHMENTS: Array<[string, string]> = [
  ["script", "Script or sample scenes"],
  ["synopsisTreatment", "Synopsis and treatment"],
  ["directorStatement", "Director statement"],
  ["producerStatement", "Producer statement"],
  ["budgetTopSheet", "Budget top sheet"],
  ["detailedBudget", "Detailed budget"],
  ["financePlan", "Finance plan"],
  ["productionSchedule", "Production schedule"],
  ["chainOfTitle", "Chain of title and rights documents"],
  ["cvsBios", "CVs, bios and company profile"],
  ["visualMaterials", "Lookbook or visual materials"],
  ["marketAttachments", "Letters of intent or market attachments"],
  ["sampleFootage", "Sample footage, teaser or rough cut"],
  ["consentLetters", "Consent, release or access letters"],
];

export const BUDGET_CATEGORIES: Array<[string, string]> = [
  ["development", "Development"],
  ["aboveTheLine", "Above the line"],
  ["cast", "Cast and contributors"],
  ["productionCrew", "Production crew"],
  ["equipment", "Equipment and rentals"],
  ["locations", "Locations and permits"],
  ["travel", "Travel and accommodation"],
  ["postProduction", "Post-production"],
  ["musicRights", "Music, archive and rights"],
  ["insuranceLegal", "Insurance, legal and accounting"],
  ["marketing", "Marketing, markets and festivals"],
  ["accessibility", "Accessibility and sustainability"],
  ["contingency", "Contingency"],
];

export function parseMoney(value: unknown): number {
  const amount = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(amount) ? amount : 0;
}

export function formatMoney(value: number, currency = "AUD") {
  try {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value || 0);
  } catch {
    return `${currency} ${Math.round(value || 0).toLocaleString("en-AU")}`;
  }
}

export function wordCount(value: unknown): number {
  return String(value ?? "").trim().split(/\s+/).filter(Boolean).length;
}

export function localBudgetReview(profile: FundingProfile) {
  const total = parseMoney(profile.totalBudget);
  const requested = parseMoney(profile.fundingRequested);
  const lineTotal = Object.values(profile.budgetLines || {}).reduce((sum, value) => sum + parseMoney(value), 0);
  const financeTotal = requested
    + parseMoney(profile.securedFinance)
    + parseMoney(profile.pendingFinance)
    + parseMoney(profile.taxIncentives)
    + parseMoney(profile.producerContribution);
  const calculatedGap = Math.max(0, total - financeTotal);
  const warnings: string[] = [];
  if (requested > total && total > 0) warnings.push("Funding requested exceeds the total project budget.");
  if (lineTotal > 0 && total > 0 && Math.abs(lineTotal - total) > Math.max(1, total * 0.01)) {
    warnings.push("Budget categories do not reconcile with the total budget.");
  }
  if (profile.gap && Math.abs(parseMoney(profile.gap) - calculatedGap) > Math.max(1, total * 0.01)) {
    warnings.push("The entered finance gap does not match the calculated shortfall.");
  }
  return {
    total,
    requested,
    requestedPercent: total > 0 ? Math.round((requested / total) * 1000) / 10 : 0,
    lineTotal,
    calculatedGap,
    warnings,
  };
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadHtml(html: string, fileBase: string) {
  downloadBlob(new Blob([html], { type: "text/html;charset=utf-8" }), `${fileBase}.html`);
}

function xmlEscape(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function plainTextSections(profile: FundingProfile, source: any): Array<[string, string[]]> {
  const line = (label: string, value: unknown) => String(value ?? "").trim() ? `${label}: ${String(value).trim()}` : "";
  const sections: Array<[string, string[]]> = [
    ["Funding target", [
      line("Organisation", source?.organization),
      line("Country", source?.country),
      line("Programme type", source?.type),
      line("Official site", source?.officialGuidelinesUrl || source?.officialSite),
    ]],
    ["Applicant and project", [
      line("Legal applicant", profile.applicantLegalName),
      line("Trading name", profile.tradingName),
      line("Applicant country", profile.companyCountry),
      line("Contact", profile.contactName),
      line("Email", profile.contactEmail),
      line("Project title", profile.projectTitle),
      line("Format", profile.format),
      line("Stage", profile.stage),
      line("Production countries", profile.productionCountries),
      line("Genre", profile.genre),
      line("Target audience", profile.targetAudience),
    ]],
    ["Story and creative case", [
      line("Logline", profile.logline),
      line("Short synopsis", profile.shortSynopsis),
      line("Long synopsis", profile.longSynopsis),
      line("Director statement", profile.directorStatement),
      line("Producer statement", profile.producerStatement),
      line("Creative approach", profile.creativeApproach),
    ]],
    ["Rights and team", [line("Rights position", profile.rightsPosition), line("Team", profile.teamSummary)]],
    ["Budget and finance", [
      line("Currency", profile.currency || "AUD"),
      line("Total budget", profile.totalBudget),
      line("Funding requested", profile.fundingRequested),
      line("Secured finance", profile.securedFinance),
      line("Pending finance", profile.pendingFinance),
      line("Tax incentives", profile.taxIncentives),
      line("Producer contribution", profile.producerContribution),
      line("Gap", profile.gap),
    ]],
    ["Market and readiness", [
      line("Distribution strategy", profile.distributionStrategy),
      line("Audience strategy", profile.audienceStrategy),
      line("Festival strategy", profile.festivalStrategy),
      line("Production schedule", profile.productionSchedule),
      line("Production risks", profile.productionRisks),
      line("Sustainability and accessibility", profile.sustainabilityAccessibility),
      line("Why now", profile.whyNow),
      line("Why this team", profile.whyTeam),
      line("Milestone unlocked", profile.milestoneUnlocked),
    ]],
  ];
  return sections.map(([title, lines]) => [title, lines.filter(Boolean)] as [string, string[]]);
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function u16(value: number): Uint8Array {
  return new Uint8Array([value & 0xff, (value >>> 8) & 0xff]);
}

function u32(value: number): Uint8Array {
  return new Uint8Array([
    value & 0xff,
    (value >>> 8) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 24) & 0xff,
  ]);
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const length = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

function createStoredZip(files: Array<{ name: string; content: string }>): Uint8Array {
  const encoder = new TextEncoder();
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const name = encoder.encode(file.name);
    const data = encoder.encode(file.content);
    const checksum = crc32(data);
    const local = concatBytes([
      u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0),
      u32(checksum), u32(data.length), u32(data.length), u16(name.length), u16(0), name, data,
    ]);
    locals.push(local);
    const central = concatBytes([
      u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0),
      u32(checksum), u32(data.length), u32(data.length), u16(name.length), u16(0), u16(0),
      u16(0), u16(0), u32(0), u32(offset), name,
    ]);
    centrals.push(central);
    offset += local.length;
  }

  const centralDirectory = concatBytes(centrals);
  const end = concatBytes([
    u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length),
    u32(centralDirectory.length), u32(offset), u16(0),
  ]);
  return concatBytes([...locals, centralDirectory, end]);
}

export function createFundingDocx(profile: FundingProfile, source: any): Blob {
  const paragraphs: string[] = [];
  paragraphs.push(`<w:p><w:pPr><w:pStyle w:val="Title"/></w:pPr><w:r><w:t>${xmlEscape(profile.projectTitle || "Funding application")}</w:t></w:r></w:p>`);
  paragraphs.push(`<w:p><w:r><w:t>Prepared for ${xmlEscape(source?.organization || "Funding organisation")}</w:t></w:r></w:p>`);

  for (const [title, lines] of plainTextSections(profile, source)) {
    paragraphs.push(`<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>${xmlEscape(title)}</w:t></w:r></w:p>`);
    for (const text of lines) {
      const split = text.split("\n");
      split.forEach((value, index) => {
        paragraphs.push(`<w:p><w:r><w:t xml:space="preserve">${xmlEscape(value)}</w:t>${index < split.length - 1 ? "<w:br/>" : ""}</w:r></w:p>`);
      });
    }
  }

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraphs.join("")}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr></w:body></w:document>`;
  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="22"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:color w:val="9A6A00"/><w:sz w:val="38"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:color w:val="9A6A00"/><w:sz w:val="28"/></w:rPr></w:style></w:styles>`;

  const zip = createStoredZip([
    { name: "[Content_Types].xml", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>` },
    { name: "_rels/.rels", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>` },
    { name: "word/_rels/document.xml.rels", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
    { name: "word/document.xml", content: documentXml },
    { name: "word/styles.xml", content: stylesXml },
  ]);
  return new Blob([zip], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
}

function pdfEscape(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)").replace(/[^\x20-\x7E]/g, "?");
}

function wrapText(value: string, width = 92): string[] {
  const lines: string[] = [];
  for (const paragraph of value.split("\n")) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (candidate.length > width && line) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    lines.push(line);
  }
  return lines;
}

export function createFundingPdf(profile: FundingProfile, source: any): Blob {
  const allLines: Array<{ text: string; heading?: boolean }> = [
    { text: profile.projectTitle || "Funding application", heading: true },
    { text: `Prepared for ${source?.organization || "Funding organisation"}` },
    { text: "" },
  ];
  for (const [title, lines] of plainTextSections(profile, source)) {
    allLines.push({ text: title, heading: true });
    for (const line of lines) wrapText(line).forEach((text) => allLines.push({ text }));
    allLines.push({ text: "" });
  }

  const pages: Array<Array<{ text: string; heading?: boolean }>> = [];
  for (let index = 0; index < allLines.length; index += 48) pages.push(allLines.slice(index, index + 48));
  const objects: string[] = [];
  const pageObjectIds: number[] = [];
  const contentObjectIds: number[] = [];
  const fontId = 3;
  let nextId = 4;
  for (let index = 0; index < pages.length; index += 1) {
    pageObjectIds.push(nextId++);
    contentObjectIds.push(nextId++);
  }
  objects[1] = `<< /Type /Catalog /Pages 2 0 R >>`;
  objects[2] = `<< /Type /Pages /Count ${pages.length} /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] >>`;
  objects[fontId] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`;

  pages.forEach((page, pageIndex) => {
    const commands: string[] = ["BT", "/F1 11 Tf", "50 790 Td"];
    page.forEach((line, index) => {
      if (index > 0) commands.push("0 -15 Td");
      commands.push(line.heading ? "/F1 15 Tf" : "/F1 10 Tf");
      commands.push(`(${pdfEscape(line.text)}) Tj`);
    });
    commands.push("ET");
    const stream = commands.join("\n");
    const pageId = pageObjectIds[pageIndex];
    const contentId = contentObjectIds[pageIndex];
    objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`;
    objects[contentId] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  });

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (let id = 1; id < objects.length; id += 1) {
    offsets[id] = pdf.length;
    pdf += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let id = 1; id < objects.length; id += 1) pdf += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([pdf], { type: "application/pdf" });
}

export function createBudgetCsv(profile: FundingProfile): Blob {
  const rows: string[][] = [["Category", `Amount (${profile.currency || "AUD"})`]];
  for (const [key, label] of BUDGET_CATEGORIES) rows.push([label, String(profile.budgetLines?.[key] || "")]);
  rows.push(["Total budget", String(profile.totalBudget || "")]);
  rows.push(["Funding requested", String(profile.fundingRequested || "")]);
  rows.push(["Calculated finance gap", String(localBudgetReview(profile).calculatedGap)]);
  const csv = rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\r\n");
  return new Blob([csv], { type: "text/csv;charset=utf-8" });
}

export type IncentiveInput = {
  totalBudget: number;
  qualifyingLocalSpend: number;
  qualifyingLabourSpend: number;
  headlineRate: number;
  labourRate?: number;
  minimumSpend?: number;
  projectCap?: number;
};

export function estimateIncentive(input: IncentiveInput) {
  const warnings: string[] = [];
  const localSpend = Math.max(0, Math.min(input.qualifyingLocalSpend, input.totalBudget));
  const labourSpend = Math.max(0, Math.min(input.qualifyingLabourSpend, localSpend));
  if (input.minimumSpend && localSpend < input.minimumSpend) warnings.push("The entered qualifying spend is below the programme minimum.");
  if (input.qualifyingLocalSpend > input.totalBudget) warnings.push("Qualifying local spend cannot exceed the total budget.");
  const nonLabour = Math.max(0, localSpend - labourSpend);
  const gross = nonLabour * (input.headlineRate / 100) + labourSpend * ((input.labourRate ?? input.headlineRate) / 100);
  const estimated = input.projectCap ? Math.min(gross, input.projectCap) : gross;
  if (input.projectCap && gross > input.projectCap) warnings.push("The estimate was limited by the stated project cap.");
  return { estimated, gross, localSpend, labourSpend, warnings };
}
