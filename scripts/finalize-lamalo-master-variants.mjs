import fs from "node:fs";

function update(path, transform) {
  const source = fs.readFileSync(path, "utf8");
  const updated = transform(source);
  if (updated !== source) fs.writeFileSync(path, updated);
}

update("client/src/pages/WardrobeMarketplacePage.tsx", (source) => {
  let updated = source;
  const badPrice = '  const priceLabel = `A${(cents / 100).toFixed(2)}`;';
  const goodPrice = '  const priceLabel = `A$${(cents / 100).toFixed(2)}`;';
  if (updated.includes(badPrice)) updated = updated.replace(badPrice, () => goodPrice);

  if (!updated.includes("const referencePackReady =")) {
    updated = updated.replace(
      goodPrice,
      `${goodPrice}\n  const referencePackReady = Array.isArray(item.styleTags) && item.styleTags.includes("reference-pack:360-ready");`,
    );
  }

  updated = updated.replace(
    '<Badge className="bg-amber-500/10 text-amber-300 border border-amber-500/25 text-[9px] px-1.5 py-0">Shared 360° master</Badge>',
    '<Badge className="bg-amber-500/10 text-amber-300 border border-amber-500/25 text-[9px] px-1.5 py-0">{referencePackReady ? "360° master ready" : "360° master queued"}</Badge>',
  );
  return updated;
});

update("server/lamalo-seed.ts", (source) =>
  source.replace('].join(";  ").replace(";   ", ";  ");', '].join("; ");'),
);

update("server/_core/wardrobeContinuity.ts", (source) =>
  source.replace('].filter(Boolean).join(";  ").replace(/;  /g, ";  ");', '].filter(Boolean).join("; ");'),
);
