const EXACT = new Map(Object.entries({
  black: "#111111",
  white: "#f4f3ee",
  navy: "#172554",
  charcoal: "#374151",
  "charcoal grey": "#374151",
  "dark grey": "#4b5563",
  grey: "#9ca3af",
  "grey marle": "#a7a7a7",
  "mid-grey": "#85878a",
  "light grey": "#c5c7c9",
  cream: "#fff4d6",
  camel: "#c19a6b",
  tan: "#b98255",
  cognac: "#9a4f21",
  chestnut: "#7b3f22",
  brown: "#6b4423",
  "dark brown": "#3f2818",
  stone: "#b7b09c",
  sand: "#cbb994",
  khaki: "#a39264",
  olive: "#556b2f",
  "forest green": "#14532d",
  "hunter green": "#1f5a3c",
  "sage green": "#9caf88",
  sage: "#9caf88",
  green: "#2f6b3b",
  teal: "#0f766e",
  "cobalt blue": "#0047ab",
  "royal blue": "#1d4ed8",
  blue: "#2563eb",
  "dark blue": "#1e3a5f",
  "pale blue": "#b9d9eb",
  "ceil blue": "#7aa7c7",
  "sky blue": "#87ceeb",
  indigo: "#264b96",
  "mid-wash blue": "#5f82aa",
  "light blue": "#9bbce0",
  "dark rinse": "#1f3552",
  "raw denim": "#1e3150",
  "stone wash": "#8095a9",
  red: "#b91c1c",
  "coral red": "#d94b4b",
  orange: "#e36c21",
  yellow: "#e4b72f",
  gold: "#c7a13d",
  burgundy: "#7f1d1d",
  pink: "#dc8da4",
  "blush pink": "#efc3c7",
  "coral pink": "#f88379",
  coral: "#f17f70",
  "dusty rose": "#c98f9a",
  lavender: "#a78bca",
  purple: "#7e57a8",
  "pale pink": "#f2c6cf",
  "nude beige": "#d8b4a0",
  "pale gold": "#d8bd75",
  champagne: "#dbc89a",
  silver: "#bfc3c7",
  "natural straw": "#d8c28c",
}));

export function colourKey(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160);
}

export function requiresGeneratedTexture(value) {
  return /[/]|floral|check|stripe|herringbone|print|two-tone|layered|matte gold|dial|cork/i.test(String(value));
}

export function colourHex(value) {
  const raw = String(value ?? "").trim();
  const key = raw.toLowerCase();
  if (EXACT.has(key)) return EXACT.get(key);
  for (const [name, hex] of EXACT) {
    if (key.startsWith(name) || key.endsWith(name) || key.includes(` ${name} `)) return hex;
  }
  if (/white/.test(key)) return "#f4f3ee";
  if (/black/.test(key)) return "#111111";
  if (/navy/.test(key)) return "#172554";
  if (/blue/.test(key)) return "#2563eb";
  if (/green/.test(key)) return "#2f6b3b";
  if (/pink|rose/.test(key)) return "#d99aaa";
  if (/red|burgundy/.test(key)) return "#9f2525";
  if (/camel|tan|brown|cognac/.test(key)) return "#a16f45";
  if (/grey|gray|charcoal|gunmetal/.test(key)) return "#6b7280";
  if (/cream|beige|nude|sand|stone/.test(key)) return "#d9ccb0";
  if (/gold|champagne/.test(key)) return "#c8aa62";
  if (/silver/.test(key)) return "#bfc3c7";
  return "#77736b";
}

export function patternPrompt(colourName, master) {
  return [
    `Create a seamless tileable PBR-ready fabric albedo texture for ${master.baseName}.`,
    `Colour or pattern specification: ${colourName}.`,
    `Material context: ${(master.materials ?? []).join(", ") || "apparel fabric"}.`,
    "Flat orthographic fabric texture only, perfectly seamless on every edge, uniform scale, no folds, no lighting, no shadows, no garment, no object, no text, no logo and no border.",
    "Use refined production-fashion colour balance and realistic woven or knitted surface detail appropriate to the named material.",
  ].join(" ");
}
