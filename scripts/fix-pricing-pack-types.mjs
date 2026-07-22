import fs from "node:fs";

const path = "client/src/pages/Pricing.tsx";
let content = fs.readFileSync(path, "utf8");

const replacements = [
  ['{ id: "topup_10", label: "Starter", credits: 200, price: 19 }', '{ id: "topup_10", label: "Starter", credits: 200, price: 19, popular: false }'],
  ['{ id: "topup_50", label: "Producer", credits: 600, price: 49 }', '{ id: "topup_50", label: "Producer", credits: 600, price: 49, popular: false }'],
  ['{ id: "topup_100", label: "Director", credits: 1400, price: 99 }', '{ id: "topup_100", label: "Director", credits: 1400, price: 99, popular: false }'],
  ['{ id: "topup_500", label: "Blockbuster", credits: 9000, price: 399 }', '{ id: "topup_500", label: "Blockbuster", credits: 9000, price: 399, popular: false }'],
  ['{ id: "topup_1000", label: "Mogul", credits: 22000, price: 799 }', '{ id: "topup_1000", label: "Mogul", credits: 22000, price: 799, popular: false }'],
  ['{ id: "relay_120", label: "Live Starter", minutes: 120, price: 9, rate: "A$4.50/hour" }', '{ id: "relay_120", label: "Live Starter", minutes: 120, price: 9, rate: "A$4.50/hour", popular: false }'],
  ['{ id: "relay_1500", label: "Live Producer", minutes: 1500, price: 59, rate: "A$2.36/hour" }', '{ id: "relay_1500", label: "Live Producer", minutes: 1500, price: 59, rate: "A$2.36/hour", popular: false }'],
  ['{ id: "relay_3600", label: "Live Studio", minutes: 3600, price: 119, rate: "A$1.98/hour" }', '{ id: "relay_3600", label: "Live Studio", minutes: 3600, price: 119, rate: "A$1.98/hour", popular: false }'],
];

for (const [from, to] of replacements) {
  const matches = content.split(from).length - 1;
  if (matches !== 1) throw new Error(`Expected one pricing shape match, found ${matches}: ${from}`);
  content = content.replace(from, to);
}

fs.writeFileSync(path, content);
console.log("Pricing pack union shapes normalized.");
