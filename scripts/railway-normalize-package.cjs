const fs = require('node:fs');

const path = 'package.json';
const pkg = JSON.parse(fs.readFileSync(path, 'utf8'));

pkg.dependencies = pkg.dependencies || {};

// Only downgrade versions that are genuinely broken on npm.
// lodash@^4.18.1 resolves to nothing (latest real publish is 4.17.21).
// lucide-react and uuid are valid published versions — leave them as-is.
const safeVersions = {
  lodash: '^4.17.21',
  'lodash-es': '^4.17.21',
};

for (const [name, version] of Object.entries(safeVersions)) {
  if (pkg.dependencies[name]) {
    pkg.dependencies[name] = version;
  }
}

pkg.pnpm = pkg.pnpm || {};
pkg.pnpm.overrides = {
  ...(pkg.pnpm.overrides || {}),
  ...safeVersions,
};

fs.writeFileSync(path, `${JSON.stringify(pkg, null, 2)}\n`);
console.log('Railway/package dependency ranges normalized (lodash only).');
