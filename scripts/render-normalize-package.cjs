const fs = require("node:fs");

const path = "package.json";
const pkg = JSON.parse(fs.readFileSync(path, "utf8"));
pkg.dependencies = pkg.dependencies || {};

// Normalize dependency ranges that do not resolve reliably from npm mirrors.
const safeVersions = {
  lodash: "^4.17.21",
  "lodash-es": "^4.17.21",
};

for (const [name, version] of Object.entries(safeVersions)) {
  if (pkg.dependencies[name]) pkg.dependencies[name] = version;
}

pkg.pnpm = pkg.pnpm || {};
pkg.pnpm.overrides = {
  ...(pkg.pnpm.overrides || {}),
  ...safeVersions,
};

fs.writeFileSync(path, `${JSON.stringify(pkg, null, 2)}\n`);
console.log("Render package dependency ranges normalized.");
