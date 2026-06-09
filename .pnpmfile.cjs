function readPackage(pkg) {
  const deps = pkg.dependencies || {};

  // lodash published '^4.18.1' which doesn't exist; pin to last real release
  if (deps.lodash === '^4.18.1') deps.lodash = '^4.17.21';
  if (deps['lodash-es'] === '^4.18.1') deps['lodash-es'] = '^4.17.21';
  // lucide-react@^1.x and uuid@^14.x are valid published versions — do NOT downgrade

  pkg.dependencies = deps;
  return pkg;
}

module.exports = { hooks: { readPackage } };
