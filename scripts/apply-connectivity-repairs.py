from pathlib import Path
import re


def patch(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    if new in text:
        print(f"{path}: already patched")
        return
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected one match for {old[:80]!r}, found {count}")
    file.write_text(text.replace(old, new, 1))
    print(f"{path}: patched")


def insert_after(path: str, needle: str, addition: str) -> None:
    file = Path(path)
    text = file.read_text()
    if addition.strip() in text:
        print(f"{path}: insertion already present")
        return
    if text.count(needle) != 1:
        raise SystemExit(f"{path}: expected one insertion point {needle!r}, found {text.count(needle)}")
    file.write_text(text.replace(needle, needle + addition, 1))
    print(f"{path}: inserted")


app = "client/src/App.tsx"
insert_after(app, 'const DubbingStudio = lazy(() => import("./pages/DubbingStudio"));', '\n  const DubbingHub = lazy(() => import("./pages/DubbingHub"));')
insert_after(app, 'const LocationStudio = lazy(() => import("./pages/LocationStudio"));', '\n  const SwappysHub = lazy(() => import("./pages/SwappysHub"));')
insert_after(app, '      <Route path="/projects/:projectId/vfx-suite" component={GatedVFXSuite} />', '\n      <Route path="/projects/:projectId/dubbing" component={DubbingStudio} />\n      <Route path="/projects/:projectId/audio-mixer" component={AudioMixer} />')
insert_after(app, '              <Route path="/poster-maker">{() => <AdPosterMaker />}</Route>', '\n              <Route path="/swappys">{() => <LazyPage><SwappysHub /></LazyPage>}</Route>\n              <Route path="/vfx-studio">{() => <LazyPage><VFXStudio /></LazyPage>}</Route>\n              <Route path="/music-studio">{() => <LazyPage><MusicStudio /></LazyPage>}</Route>\n              <Route path="/dubbing-studio">{() => <LazyPage><DubbingHub /></LazyPage>}</Route>\n              <Route path="/accessibility-studio">{() => <LazyPage><AccessibilityStudio /></LazyPage>}</Route>\n              <Route path="/location-studio">{() => <LazyPage><LocationStudio /></LazyPage>}</Route>\n              <Route path="/projects/:projectId/characters">{() => <Characters />}</Route>')

patch("client/src/components/DashboardLayout.tsx", '{ icon: Smartphone, label: "Swappys (Face Swap)", path: "/projects" }, // Swappys is integrated into the VFX Suite per-project', '{ icon: Smartphone, label: "Swappys (Face Swap)", path: "/swappys" },')
patch("client/src/pages/SwappysHub.tsx", 'setLocation(`/projects/${projectId}/scenes/${sceneId}/vfx-suite`);', 'setLocation(`/projects/${projectId}/vfx-suite/${sceneId}`);')
patch("client/src/pages/CuttingRoom.tsx", '<a href={`/movies/${trailerMovieId}`} className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">', '<a href="/movies" className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">')
patch("client/src/pages/ProjectDetail.tsx", 'setLocation(`/projects/${projectId}/approvals`)', 'setLocation(`/projects/${projectId}/approval-chain`)')
patch("client/src/pages/VFXStudio.tsx", 'setLocation("/settings/api-keys")', 'setLocation("/settings/byok")')

vfx = Path("client/src/pages/VFXStudio.tsx")
vfx_text = vfx.read_text()
if "image.pollinations.ai/prompt" not in vfx_text:
    vfx_text, count = re.subn(
        r'function packImageUrl\(_id: number\): string \{\s*return "";\s*\}',
        '''function packImageUrl(id: number): string {
  const prompt = PACK_IMAGE_PROMPTS[id];
  if (!prompt) return "";
  const seed = id * 7919 + 2026;
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=768&height=512&nologo=true&enhance=true&model=flux&seed=${seed}`;
}''',
        vfx_text,
        count=1,
    )
    if count != 1:
        raise SystemExit(f"VFXStudio packImageUrl replacement count={count}")
    vfx.write_text(vfx_text)

showcase = Path("client/src/pages/Showcase.tsx")
showcase_text = showcase.read_text()
if not re.search(r'<div[^>]+role="status"[\s\S]*?Ready for Generation', showcase_text):
    pattern = re.compile(r'<button\s+type="button"\s+className="flex items-center gap-2 px-6 py-3\.5 rounded-xl border border-amber-500/30 text-amber-400 text-sm font-semibold cursor-pointer hover:bg-amber-500/10 transition-all active:scale-95"\s*>\s*<Sparkles className="w-4 h-4" />\s*Ready for Generation\s*</button>', re.S)
    replacement = '<div role="status" className="flex items-center gap-2 px-6 py-3.5 rounded-xl border border-amber-500/30 text-amber-400 text-sm font-semibold">\n  <Sparkles className="w-4 h-4" />\n  Ready for Generation\n</div>'
    showcase_text, count = pattern.subn(replacement, showcase_text, count=1)
    if count != 1:
        raise SystemExit(f"Showcase status replacement count={count}")
    showcase.write_text(showcase_text)

subtitles = Path("client/src/pages/Subtitles.tsx")
subtitles_text = subtitles.read_text()
if 'Record<"ASL" | "BSL", string>' not in subtitles_text:
    old = 'const [signNotes, setSignNotes] = useState<Array<{ sceneId: string; notes: string }>>([]);'
    if subtitles_text.count(old) != 1:
        raise SystemExit("Subtitles signNotes state not found")
    subtitles_text = subtitles_text.replace(old, 'const [signNotes, setSignNotes] = useState<Record<"ASL" | "BSL", string>>({ ASL: "", BSL: "" });', 1)
if "const exportSignBrief" not in subtitles_text:
    marker = '\n\n    return ('
    addition = '''

    const exportSignBrief = (language: "ASL" | "BSL") => {
      const notes = signNotes[language].trim();
      if (!notes) { toast.error(`Add ${language} interpreter guidance before exporting.`); return; }
      const projectName = `project-${projectId || "untitled"}`;
      const brief = [
        `${language} INTERPRETER PRODUCTION BRIEF`,
        `Project: ${projectName}`,
        `Generated: ${new Date().toISOString()}`,
        "",
        notes,
        "",
        "Production note: confirm framing, eyelines, safe title area and interpreter visibility before final delivery.",
      ].join("\\n");
      downloadFile(brief, `${projectName}-${language.toLowerCase()}-interpreter-brief.txt`, "text/plain;charset=utf-8");
      toast.success(`${language} production brief exported.`);
    };
'''
    if marker not in subtitles_text:
        raise SystemExit("Subtitles component return marker not found")
    subtitles_text = subtitles_text.replace(marker, addition + marker, 1)
placeholder = 'placeholder={`Scene-by-scene ${lang} interpreter guidance...\\n\\nScene 1: Establish interpreter frame, bottom-right\\nScene 2: Close-up on emotional dialogue — interpreter prominent\\nScene 3: Action sequence — maintain corner frame...`}'
if 'value={signNotes[lang as "ASL" | "BSL"]}' not in subtitles_text:
    if placeholder not in subtitles_text:
        raise SystemExit("Subtitles sign-language textarea not found")
    subtitles_text = subtitles_text.replace(placeholder, 'value={signNotes[lang as "ASL" | "BSL"]}\n                        onChange={(event) => setSignNotes((current) => ({ ...current, [lang]: event.target.value }))}\n                        ' + placeholder, 1)
old_button = '<Button size="sm" variant="outline" className="w-full gap-2 hover:border-amber-500/50 hover:text-amber-400">'
new_button = '<Button type="button" size="sm" variant="outline" className="w-full gap-2 hover:border-amber-500/50 hover:text-amber-400" onClick={() => exportSignBrief(lang as "ASL" | "BSL")}>'
if new_button not in subtitles_text:
    if subtitles_text.count(old_button) != 1:
        raise SystemExit(f"Subtitles export button count={subtitles_text.count(old_button)}")
    subtitles_text = subtitles_text.replace(old_button, new_button, 1)
subtitles.write_text(subtitles_text)

registry = Path("shared/feature-registry.ts")
registry_text = registry.read_text()
if 'id: "swappys"' not in registry_text:
    marker = '  // ── AI VIDEO ─────────────────────────────────────────────────────────────\n'
    entry = '''  // ── AI VIDEO ─────────────────────────────────────────────────────────────
  {
    id: "swappys",
    label: "Swappys Transform Studio",
    icon: "🎭",
    category: "AI Video",
    webPath: "/swappys",
    description: "Consent-controlled still-image transformation and production VFX handoff",
    minTier: "free",
    hasNative: true,
    isNew: true,
  },
'''
    if marker not in registry_text:
        raise SystemExit("Feature registry AI Video marker not found")
    registry.write_text(registry_text.replace(marker, entry, 1))

audit = Path("scripts/repository-connectivity-audit.mjs")
audit_text = audit.read_text()
old = '''  for (const usage of trpcUsages) {
    if (!mountedRoots.has(usage.root)) finding(findings, "error", "trpc-connectivity", usage.file, usage.line, `Client calls unmounted tRPC root: trpc.${usage.root}`);
  }'''
new = '''  const clientHelperRoots = new Set(["Provider", "createClient", "useContext", "useUtils"]);
  for (const usage of trpcUsages) {
    if (clientHelperRoots.has(usage.root)) continue;
    if (!mountedRoots.has(usage.root)) finding(findings, "error", "trpc-connectivity", usage.file, usage.line, `Client calls unmounted tRPC root: trpc.${usage.root}`);
  }'''
if new not in audit_text:
    if old not in audit_text:
        raise SystemExit("Audit tRPC root loop not found")
    audit.write_text(audit_text.replace(old, new, 1))
