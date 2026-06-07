const fs = require('node:fs');

const path = 'package.json';
const pkg = JSON.parse(fs.readFileSync(path, 'utf8'));

pkg.dependencies = pkg.dependencies || {};

const safeVersions = {
  lodash: '^4.17.21',
  'lodash-es': '^4.17.21',
  'lucide-react': '^0.468.0',
  uuid: '^11.0.5',
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
console.log('Railway/package install dependency ranges normalized.');
