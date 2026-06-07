function readPackage(pkg) {
  const deps = pkg.dependencies || {};

  if (deps.lodash === '^4.18.1') deps.lodash = '^4.17.21';
  if (deps['lodash-es'] === '^4.18.1') deps['lodash-es'] = '^4.17.21';
  if (deps['lucide-react'] === '^1.14.0') deps['lucide-react'] = '^0.468.0';
  if (deps.uuid === '^14.0.0') deps.uuid = '^11.0.5';

  pkg.dependencies = deps;
  return pkg;
}

module.exports = { hooks: { readPackage } };
