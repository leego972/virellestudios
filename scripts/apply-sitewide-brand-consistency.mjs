import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relative) {
  return fs.readFileSync(path.join(root, relative), "utf8");
}

function write(relative, content) {
  fs.writeFileSync(path.join(root, relative), content, "utf8");
}

function replaceRequired(content, before, after, label) {
  if (content.includes(after)) return content;
  if (!content.includes(before)) throw new Error(`Could not find ${label}`);
  return content.replace(before, after);
}

function patchDashboardLayout() {
  const file = "client/src/components/DashboardLayout.tsx";
  let content = read(file);

  content = replaceRequired(
    content,
    'import { ToolIconKey } from "@/constants/hollywoodIcons";\n',
    'import { ToolIconKey } from "@/constants/hollywoodIcons";\nimport { brandGroupForRoute, brandIconForRoute } from "@/constants/siteBranding";\n',
    "site branding import",
  );

  content = replaceRequired(
    content,
    `  }, [location]);\n\n  useEffect(() => {\n    const lang = SUPPORTED_LANGUAGES.find(item => item.code === uiLang);`,
    `  }, [location]);\n\n  const pageBrandIcon = useMemo(\n    () => brandIconForRoute(location, pageTitle),\n    [location, pageTitle],\n  );\n  const pageBrandGroup = useMemo(\n    () => brandGroupForRoute(location, pageTitle),\n    [location, pageTitle],\n  );\n\n  useEffect(() => {\n    const lang = SUPPORTED_LANGUAGES.find(item => item.code === uiLang);`,
    "page brand resolution",
  );

  content = replaceRequired(
    content,
    `            {item.hollywoodKey ? (\n              <HollywoodIcon\n                tool={item.hollywoodKey}\n                size={18}\n                className={\`shrink-0 \${active ? "opacity-100" : "opacity-65"}\`}\n              />\n            ) : (\n              <item.icon\n                className={\`h-4 w-4 \${active ? "text-amber-400" : ""}\`}\n              />\n            )}`,
    `            <HollywoodIcon\n              tool={item.hollywoodKey ?? brandIconForRoute(item.path, item.label)}\n              size={18}\n              className={\`shrink-0 \${active ? "opacity-100" : "opacity-65"}\`}\n              alt={item.label}\n            />`,
    "sidebar branded icon rendering",
  );

  content = replaceRequired(
    content,
    `                          <item.icon className="h-4 w-4" />\n                          <span>{item.label}</span>`,
    `                          <HollywoodIcon\n                            tool={item.hollywoodKey ?? brandIconForRoute(item.path, item.label)}\n                            size={18}\n                            alt={item.label}\n                          />\n                          <span className="min-w-0 truncate">{item.label}</span>`,
    "more tools branded icons",
  );

  content = replaceRequired(
    content,
    `<SidebarTrigger className="h-10 w-10 shrink-0 rounded-lg" />\n            <div className="min-w-0 flex-1 px-2">`,
    `<SidebarTrigger className="h-10 w-10 shrink-0 rounded-lg" />\n            <HollywoodIcon tool={pageBrandIcon} size={28} className="shrink-0" alt={pageTitle} />\n            <div className="min-w-0 flex-1 px-2">`,
    "mobile page brand icon",
  );

  content = replaceRequired(
    content,
    `{activeGroupLabel || "Virelle Studios"}`,
    `{pageBrandGroup}`,
    "mobile brand group label",
  );

  content = replaceRequired(
    content,
    `<SidebarTrigger className="h-9 w-9 rounded-lg" />\n              <div className="min-w-0">`,
    `<SidebarTrigger className="h-9 w-9 rounded-lg" />\n              <HollywoodIcon tool={pageBrandIcon} size={28} className="shrink-0" alt={pageTitle} />\n              <div className="min-w-0">`,
    "desktop page brand icon",
  );

  content = replaceRequired(
    content,
    `{activeGroupLabel\n                    ? \`${activeGroupLabel} workspace\`\n                    : "Production workspace"}`,
    `{\`${pageBrandGroup} workspace\`}`,
    "desktop brand group label",
  );

  content = content.replace(
    /<Sparkles className="h-5 w-5 text-amber-400" \/>/g,
    '<HollywoodIcon tool="ai_tools" size={24} alt="Director\'s Assistant" />',
  );
  content = content.replace(
    /<Sparkles className="h-4 w-4 text-amber-400" \/>/g,
    '<HollywoodIcon tool="ai_tools" size={20} alt="Director\'s Assistant" />',
  );

  content = replaceRequired(
    content,
    `<main\n          className={\`relative z-10 flex min-h-0 flex-1 flex-col overscroll-contain p-3 sm:p-5 lg:p-6 \${location === "/assistant" ? "overflow-hidden" : ""}\`}`,
    `<main\n          data-virelle-page-shell\n          data-virelle-page-icon={pageBrandIcon}\n          className={\`relative z-10 flex min-h-0 min-w-0 flex-1 flex-col overscroll-contain p-3 sm:p-5 lg:p-6 \${location === "/assistant" ? "overflow-hidden" : ""}\`}`,
    "responsive page shell attributes",
  );

  content = replaceRequired(
    content,
    `className={\`relative z-10 flex-1 \${location === "/assistant" ? "w-full" : "mx-auto w-full max-w-[1600px]"}\`}`,
    `className={\`relative z-10 min-w-0 flex-1 \${location === "/assistant" ? "w-full" : "mx-auto w-full max-w-[1600px]"}\`}`,
    "responsive content width",
  );

  write(file, content);
}

function patchFunding() {
  const file = "client/src/pages/FundingCommandCentre.tsx";
  let content = read(file);
  content = replaceRequired(
    content,
    'import SiteHead from "@/components/SiteHead";\n',
    'import SiteHead from "@/components/SiteHead";\nimport { HollywoodIcon } from "@/components/HollywoodIcon";\n',
    "funding HollywoodIcon import",
  );

  const replacements = [
    ['<WalletCards className="mx-auto h-10 w-10 text-amber-400" />', '<HollywoodIcon tool="reports" size={52} className="mx-auto" alt="Global film funding" />'],
    ['<WalletCards className="h-6 w-6 text-amber-400" />', '<HollywoodIcon tool="reports" size={32} alt="Funding Command Centre" />'],
    ['<LayoutDashboard className="mr-1.5 h-3.5 w-3.5" />', '<HollywoodIcon tool="dashboard" size={17} className="mr-1.5" />'],
    ['<Target className="mr-1.5 h-3.5 w-3.5" />', '<HollywoodIcon tool="reports" size={17} className="mr-1.5" />'],
    ['<Bookmark className="mr-1.5 h-3.5 w-3.5" />', '<HollywoodIcon tool="reports" size={17} className="mr-1.5" />'],
    ['<Users className="mr-1.5 h-3.5 w-3.5" />', '<HollywoodIcon tool="team" size={17} className="mr-1.5" />'],
    ['<FolderOpen className="mr-1.5 h-3.5 w-3.5" />', '<HollywoodIcon tool="projects" size={17} className="mr-1.5" />'],
    ['<Calculator className="mr-1.5 h-3.5 w-3.5" />', '<HollywoodIcon tool="reports" size={17} className="mr-1.5" />'],
    ['<Sparkles className="mr-1.5 h-3.5 w-3.5" />', '<HollywoodIcon tool="distribution" size={17} className="mr-1.5" />'],
    ['<Globe className="mr-1.5 h-3.5 w-3.5" />', '<HollywoodIcon tool="distribution" size={17} className="mr-1.5" />'],
    ['<Presentation className="mr-1.5 h-4 w-4" />', '<HollywoodIcon tool="reports" size={19} className="mr-1.5" />'],
  ];
  for (const [before, after] of replacements) {
    content = replaceRequired(content, before, after, `funding brand icon ${before}`);
  }

  content = content.replace(
    /\n\s{2}(Bookmark|Calculator|FolderOpen|Globe|LayoutDashboard|Presentation|Sparkles|Target|Users|WalletCards),/g,
    "",
  );

  content = content.replace(
    /<TabsList className="flex h-auto flex-wrap justify-start">/g,
    '<TabsList className="flex h-auto max-w-full flex-wrap justify-start gap-1 overflow-x-auto">',
  );
  content = content.replace(
    /<div className="flex flex-wrap gap-2">/g,
    '<div className="flex min-w-0 flex-wrap gap-2">',
  );

  write(file, content);
}

function patchGlobalCss() {
  const file = "client/src/index.css";
  let content = read(file);
  const marker = "/* Virelle site-wide responsive layout integrity guards */";
  if (!content.includes(marker)) {
    content += `\n\n${marker}\n[data-virelle-page-shell] {\n  min-width: 0;\n  overflow-x: clip;\n}\n\n[data-virelle-page-shell] :where(.flex, .grid) > * {\n  min-width: 0;\n}\n\n[data-virelle-page-shell] :where(h1, h2, h3, p, label, button, a, [role="tab"]) {\n  min-width: 0;\n  overflow-wrap: anywhere;\n}\n\n[data-virelle-page-shell] :where(button, a, [role="button"], [role="tab"]) {\n  max-width: 100%;\n}\n\n[data-virelle-page-shell] :where(img, video, canvas) {\n  max-width: 100%;\n}\n\n[data-virelle-page-shell] [role="tablist"] {\n  max-width: 100%;\n  flex-wrap: wrap;\n}\n\n[data-virelle-page-shell] [role="dialog"] {\n  max-width: calc(100vw - 1rem);\n  max-height: calc(100dvh - 1rem);\n  overflow-y: auto;\n}\n\n@media (max-width: 640px) {\n  [data-virelle-page-shell] :where(.sm\\:flex-row, .md\\:flex-row, .lg\\:flex-row) {\n    min-width: 0;\n  }\n\n  [data-virelle-page-shell] :where(button, a[role="button"]) {\n    white-space: normal;\n  }\n}\n`;
  }
  write(file, content);
}

function patchPackage() {
  const file = "package.json";
  const pkg = JSON.parse(read(file));
  pkg.devDependencies ||= {};
  pkg.devDependencies["@playwright/test"] ||= "latest";
  pkg.scripts["test:layout"] ||= "playwright test e2e/layout-integrity.spec.ts";
  const sorted = Object.fromEntries(Object.entries(pkg.devDependencies).sort(([a], [b]) => a.localeCompare(b)));
  pkg.devDependencies = sorted;
  write(file, `${JSON.stringify(pkg, null, 2)}\n`);
}

function patchCi() {
  const file = ".github/workflows/ci.yml";
  let content = read(file);
  content = content.replace("    if: vars.E2E_BASE_URL != ''\n", "");
  content = replaceRequired(
    content,
    `      - name: Run E2E smoke tests\n        run: pnpm exec playwright test\n        env:\n          E2E_BASE_URL: \${{ vars.E2E_BASE_URL }}`,
    `      - name: Build local UI for layout audit\n        if: vars.E2E_BASE_URL == ''\n        run: pnpm build\n        env:\n          NODE_ENV: production\n          VITE_APP_ID: ci-layout-audit\n          VITE_SENTRY_DSN: ""\n      - name: Start local UI preview\n        if: vars.E2E_BASE_URL == ''\n        shell: bash\n        run: |\n          pnpm exec vite preview --host 127.0.0.1 --port 4173 > /tmp/virelle-preview.log 2>&1 &\n          for attempt in {1..40}; do\n            if curl --fail --silent http://127.0.0.1:4173/welcome > /dev/null; then exit 0; fi\n            sleep 1\n          done\n          cat /tmp/virelle-preview.log\n          exit 1\n      - name: Run responsive layout and smoke tests\n        shell: bash\n        run: |\n          export E2E_BASE_URL="\${E2E_BASE_URL_OVERRIDE:-http://127.0.0.1:4173}"\n          pnpm exec playwright test e2e/layout-integrity.spec.ts e2e/smoke.spec.ts\n        env:\n          E2E_BASE_URL_OVERRIDE: \${{ vars.E2E_BASE_URL }}\n          E2E_EMAIL: \${{ secrets.E2E_EMAIL }}\n          E2E_PASSWORD: \${{ secrets.E2E_PASSWORD }}`,
    "CI responsive E2E job",
  );
  write(file, content);
}

patchDashboardLayout();
patchFunding();
patchGlobalCss();
patchPackage();
patchCi();
console.log("Site-wide brand consistency and responsive layout patches applied.");
