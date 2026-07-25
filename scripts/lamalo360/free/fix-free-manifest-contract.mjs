import fs from "node:fs";

// One-time branch migration; removed after the compiler is aligned.
const file = "scripts/lamalo360/catalogue.mjs";
let source = fs.readFileSync(file, "utf8");
const marker = '      purchasePolicy: "every colour remains a separate SKU and permanent inventory item",\n';
const addition = '      generationCostPolicy: "no paid generation API; assets are generated once and retained permanently",\n';
if (!source.includes(marker)) throw new Error("Lamalo catalogue purchase policy marker was not found.");
if (!source.includes(addition.trim())) source = source.replace(marker, marker + addition);
fs.writeFileSync(file, source);
console.log("Aligned Lamalo free manifest compiler metadata.");
