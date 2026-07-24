import fs from "node:fs";

const path = "client/src/pages/WardrobeMarketplacePage.tsx";
let source = fs.readFileSync(path, "utf8");
const before = '    "cobalt blue": "#0047ab", teal: "#0f766e", white: "#f8fafc",';
const after = '    "cobalt blue": "#0047ab", teal: "#0f766e",';
if (!source.includes(before)) throw new Error("Duplicate white swatch entry was not found.");
source = source.replace(before, after);
fs.writeFileSync(path, source);
