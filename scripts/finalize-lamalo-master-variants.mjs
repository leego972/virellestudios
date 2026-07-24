import fs from "node:fs";

function patch(path, replacements) {
  let source = fs.readFileSync(path, "utf8");
  for (const [before, after, label] of replacements) {
    if (!source.includes(before)) throw new Error(`Could not find ${label} in ${path}`);
    source = source.replace(before, after);
  }
  fs.writeFileSync(path, source);
}

patch("client/src/pages/WardrobeMarketplacePage.tsx", [
  [
    '  const priceLabel = `A${(cents / 100).toFixed(2)}`;',
    '  const priceLabel = `A$${(cents / 100).toFixed(2)}`;\n  const referencePackReady = Array.isArray(item.styleTags) && item.styleTags.includes("reference-pack:360-ready");',
    "price label",
  ],
  [
    '<Badge className="bg-amber-500/10 text-amber-300 border border-amber-500/25 text-[9px] px-1.5 py-0">Shared 360° master</Badge>',
    '<Badge className="bg-amber-500/10 text-amber-300 border border-amber-500/25 text-[9px] px-1.5 py-0">{referencePackReady ? "360° master ready" : "360° master queued"}</Badge>',
    "reference pack badge",
  ],
]);

patch("server/lamalo-seed.ts", [
  ['].join(";  ").replace(";   ", ";  ");', '].join("; ");', "seed prompt separator"],
]);

patch("server/_core/wardrobeContinuity.ts", [
  ['].filter(Boolean).join(";  ").replace(/;  /g, ";  ");', '].filter(Boolean).join("; ");', "wardrobe prompt separator"],
]);
