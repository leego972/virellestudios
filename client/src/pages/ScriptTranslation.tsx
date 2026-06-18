import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardCopy,
  Download,
  Globe,
  Info,
  Loader2,
  Sparkles,
  Wand2,
} from "lucide-react";

const LANGUAGES = [
  { code: "auto", label: "Auto-detect", native: "Auto", rtl: false },
  { code: "en", label: "English", native: "English", rtl: false },
  { code: "he", label: "Hebrew", native: "עברית", rtl: true },
  { code: "ar", label: "Arabic", native: "العربية", rtl: true },
  { code: "es", label: "Spanish", native: "Español", rtl: false },
  { code: "fr", label: "French", native: "Français", rtl: false },
  { code: "de", label: "German", native: "Deutsch", rtl: false },
  { code: "it", label: "Italian", native: "Italiano", rtl: false },
  { code: "pt", label: "Portuguese", native: "Português", rtl: false },
  { code: "ru", label: "Russian", native: "Русский", rtl: false },
  { code: "ja", label: "Japanese", native: "日本語", rtl: false },
  { code: "ko", label: "Korean", native: "한국어", rtl: false },
  { code: "zh", label: "Mandarin", native: "中文", rtl: false },
  { code: "hi", label: "Hindi", native: "हिन्दी", rtl: false },
];

const EXAMPLE_SCRIPT =
  "INT. ROOFTOP - NIGHT\n\nThe city shimmers forty floors below. MAYA (30s, intense, scarf billowing) stands at the ledge.\n\nDANIEL (O.S.)\nMaya -- don't.\n\nMaya turns slowly, eyes calm.\n\nMAYA\n(quietly)\nI'm not jumping. I'm just thinking.";

function langMeta(code: string) {
  return LANGUAGES.find((l) => l.code === code);
}

export default function ScriptTranslation() {
  const { projectId } = useParams<{ projectId: string }>();
  const [, navigate] = useLocation();

  const [source, setSource] = useState("auto");
  const [target, setTarget] = useState("he");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [copied, setCopied] = useState(false);

  const translateMutation = trpc.auth.translateScript.useMutation({
    onSuccess: (data) => {
      setOutput(data.translated ?? "");
      toast.success("Translation complete");
    },
    onError: (err) => {
      toast.error(err.message ?? "Translation failed — try again");
    },
  });

  const handleTranslate = () => {
    const text = input.trim();
    if (!text) { toast.error("Paste your screenplay first"); return; }
    if (target === "auto" || target === source) { toast.error("Choose a different target language"); return; }
    translateMutation.mutate({
      scriptContent: text,
      targetLanguage: langMeta(target)?.label ?? target,
      sourceLanguage: source === "auto" ? undefined : (langMeta(source)?.label ?? source),
    });
  };

  const handleCopy = async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!output) return;
    const blob = new Blob([output], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `script-${target}-translation.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const targetMeta = langMeta(target);
  const targetIsRtl = targetMeta?.rtl ?? false;
  const isEmpty = input.trim().length === 0;
  const isTranslating = translateMutation.isPending;
  const hasOutput = output.length > 0;

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Sticky header */}
      <div
        className="sticky top-0 z-10 border-b border-zinc-800/60 bg-zinc-950/95 backdrop-blur-sm flex-shrink-0"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))", paddingBottom: "0.75rem" }}
      >
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(projectId ? `/projects/${projectId}` : "/")}
            className="h-9 w-9 p-0 text-zinc-400 hover:text-white flex-shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500/30 to-amber-600/10 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
              <Globe className="h-3.5 w-3.5 text-amber-400" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-white truncate">Script Translation</h1>
              <p className="text-xs text-zinc-500 hidden sm:block">
                Cinematic quality — format, names and style preserved
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4 sm:py-6 space-y-4 flex-1 flex flex-col">
        {/* Rules notice */}
        <div className="rounded-xl bg-amber-500/5 border border-amber-500/15 px-4 py-2.5 flex gap-3">
          <Info className="h-4 w-4 text-amber-400/80 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-zinc-400 leading-relaxed">
            Character names stay in{" "}
            <span className="text-zinc-200 font-mono">ALL CAPS</span> and are never translated ·
            INT./EXT. headings and transitions (FADE IN, CUT TO) are preserved ·
            Hebrew and Arabic output is right-to-left
          </p>
        </div>

        {/* Controls row */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 sm:gap-3">
          {/* From */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500 w-8 flex-shrink-0">From</span>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger className="h-10 flex-1 sm:w-44 text-sm border-zinc-700 bg-zinc-900 text-zinc-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                {LANGUAGES.map((l) => (
                  <SelectItem key={l.code} value={l.code} className="text-sm text-zinc-200 focus:bg-amber-500/10">
                    {l.native} {l.code === "auto" ? "(detect)" : `— ${l.label}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <ArrowRight className="h-4 w-4 text-zinc-600 flex-shrink-0 hidden sm:block" />

          {/* To */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500 w-8 flex-shrink-0">To</span>
            <Select value={target} onValueChange={(v) => { setTarget(v); if (hasOutput) setOutput(""); }}>
              <SelectTrigger className="h-10 flex-1 sm:w-48 text-sm border-amber-500/30 bg-zinc-900 text-zinc-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-amber-500/20">
                {LANGUAGES.filter((l) => l.code !== "auto").map((l) => (
                  <SelectItem key={l.code} value={l.code} className="text-sm text-zinc-200 focus:bg-amber-500/10">
                    {l.native} — {l.label}
                    {l.rtl && " ↩"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Translate button */}
          <Button
            onClick={handleTranslate}
            disabled={isTranslating || isEmpty}
            className="h-10 bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm gap-2 sm:ml-auto disabled:opacity-40 w-full sm:w-auto"
          >
            {isTranslating ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Translating…</>
            ) : (
              <><Wand2 className="h-4 w-4" /> Translate</>
            )}
          </Button>
        </div>

        {/* Editor panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 flex-1">
          {/* Input panel */}
          <Card className="bg-black/60 border-zinc-800 rounded-xl flex flex-col">
            <CardContent className="p-0 flex flex-col flex-1">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800 flex-shrink-0">
                <span className="text-xs font-medium text-zinc-400">
                  Original {source !== "auto" ? `· ${langMeta(source)?.native}` : ""}
                </span>
                <div className="flex items-center gap-2">
                  <Badge className="bg-zinc-800 text-zinc-500 border-zinc-700 text-xs">
                    {input.length.toLocaleString()} chars
                  </Badge>
                  {isEmpty && (
                    <button
                      onClick={() => setInput(EXAMPLE_SCRIPT)}
                      className="text-xs text-amber-400/70 hover:text-amber-400 flex items-center gap-1 transition-colors"
                    >
                      <Sparkles className="h-3 w-3" /> Example
                    </button>
                  )}
                </div>
              </div>
              <textarea
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  if (hasOutput) setOutput("");
                }}
                placeholder={"Paste your screenplay…\n\nINT. LOCATION - DAY\n\nAction line.\n\nCHARACTER\n(parenthetical)\nDialogue."}
                className="flex-1 min-h-[280px] sm:min-h-0 bg-transparent text-sm text-zinc-200 placeholder:text-zinc-600 resize-none outline-none p-4 font-mono leading-relaxed w-full"
                spellCheck={false}
              />
            </CardContent>
          </Card>

          {/* Output panel */}
          <Card className={`bg-black/60 rounded-xl flex flex-col border ${hasOutput ? "border-amber-500/20" : "border-zinc-800"}`}>
            <CardContent className="p-0 flex flex-col flex-1">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-zinc-400">
                    {targetMeta?.native ?? target} · {targetMeta?.label}
                  </span>
                  {targetIsRtl && (
                    <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-xs">RTL</Badge>
                  )}
                </div>
                {hasOutput && (
                  <div className="flex items-center gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={handleCopy}
                          className="h-8 w-8 flex items-center justify-center rounded text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                        >
                          {copied ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          ) : (
                            <ClipboardCopy className="h-4 w-4" />
                          )}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Copy to clipboard</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={handleDownload}
                          className="h-8 w-8 flex items-center justify-center rounded text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Download .txt</TooltipContent>
                    </Tooltip>
                  </div>
                )}
              </div>

              {isTranslating ? (
                <div className="flex-1 min-h-[280px] sm:min-h-0 flex flex-col items-center justify-center gap-3 text-zinc-500">
                  <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
                  <p className="text-sm">Translating to {targetMeta?.label}…</p>
                  <p className="text-xs text-zinc-600 text-center px-4">
                    Preserving format, character voices, and cinematic style
                  </p>
                </div>
              ) : (
                <textarea
                  value={output}
                  readOnly
                  dir={targetIsRtl ? "rtl" : "ltr"}
                  placeholder="Translation appears here…"
                  className={`flex-1 min-h-[280px] sm:min-h-0 bg-transparent text-sm text-zinc-200 placeholder:text-zinc-600 resize-none outline-none p-4 font-mono leading-relaxed w-full ${targetIsRtl ? "text-right" : ""}`}
                  spellCheck={false}
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Mobile copy/download row (shown below output on small screens when output exists) */}
        {hasOutput && (
          <div className="flex gap-2 sm:hidden">
            <Button
              onClick={handleCopy}
              variant="outline"
              className="flex-1 h-11 border-zinc-700 text-zinc-300 gap-2"
            >
              {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <ClipboardCopy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy translation"}
            </Button>
            <Button
              onClick={handleDownload}
              variant="outline"
              className="flex-1 h-11 border-zinc-700 text-zinc-300 gap-2"
            >
              <Download className="h-4 w-4" /> Download
            </Button>
          </div>
        )}

        {/* Language quick-select pills */}
        <div className="space-y-2 pb-4">
          <p className="text-xs text-zinc-600 uppercase tracking-widest">Quick select target</p>
          <div className="flex flex-wrap gap-1.5">
            {LANGUAGES.filter((l) => l.code !== "auto").map((l) => (
              <button
                key={l.code}
                onClick={() => { setTarget(l.code); if (hasOutput) setOutput(""); }}
                className={`px-3 py-1.5 rounded-full text-xs transition-all touch-manipulation ${
                  target === l.code
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    : "bg-zinc-800/60 text-zinc-400 border border-zinc-700/50 hover:border-amber-500/20 hover:text-zinc-200"
                }`}
              >
                {l.native}{l.rtl ? " ↩" : ""}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
