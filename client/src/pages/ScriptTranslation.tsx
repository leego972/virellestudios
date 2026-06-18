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
  { code: "auto", label: "Auto-detect", native: "Auto" },
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

const EXAMPLE_PROMPT =
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
  const [charCount, setCharCount] = useState(0);

  const translateMutation = trpc.auth.translateScript.useMutation({
    onSuccess: (data) => {
      setOutput(data.translated ?? "");
      toast.success("Translation complete");
    },
    onError: (err) => {
      toast.error(err.message ?? "Translation failed — try again");
    },
  });

  const handleInput = (val: string) => {
    setInput(val);
    setCharCount(val.length);
    if (output) setOutput("");
  };

  const handleTranslate = () => {
    const text = input.trim();
    if (!text) {
      toast.error("Paste your screenplay first");
      return;
    }
    if (target === "auto" || target === source) {
      toast.error("Choose a different target language");
      return;
    }
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

  const loadExample = () => {
    handleInput(EXAMPLE_PROMPT);
  };

  const targetIsRtl = langMeta(target)?.rtl ?? false;
  const isEmpty = input.trim().length === 0;
  const isTranslating = translateMutation.isPending;

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(projectId ? `/projects/${projectId}` : "/")}
            className="h-8 px-2 text-zinc-400 hover:text-white gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/30 to-amber-600/10 border border-amber-500/30 flex items-center justify-center">
            <Globe className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Script Translation</h1>
            <p className="text-sm text-zinc-400">Cinematic-quality screenplay translation — preserves format, voice, and character names</p>
          </div>
        </div>

        <div className="rounded-xl bg-amber-500/5 border border-amber-500/15 px-4 py-3 flex gap-3">
          <Info className="h-4 w-4 text-amber-400/80 mt-0.5 flex-shrink-0" />
          <ul className="text-xs text-zinc-400 space-y-0.5">
            <li>• Character names stay in <span className="text-zinc-200 font-mono">ALL CAPS</span> and are never translated</li>
            <li>• Scene headings (INT./EXT.), transitions (FADE IN, CUT TO) are preserved exactly</li>
            <li>• Hebrew and Arabic output is rendered right-to-left</li>
          </ul>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">From:</span>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger className="h-8 w-40 text-xs border-zinc-700 bg-zinc-900 text-zinc-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                {LANGUAGES.map((l) => (
                  <SelectItem key={l.code} value={l.code} className="text-xs text-zinc-200 focus:bg-amber-500/10">
                    {l.native} {l.code !== "auto" ? `— ${l.label}` : "(detect)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <ArrowRight className="h-4 w-4 text-zinc-600 flex-shrink-0" />

          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">To:</span>
            <Select value={target} onValueChange={setTarget}>
              <SelectTrigger className="h-8 w-44 text-xs border-amber-500/30 bg-zinc-900 text-zinc-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-amber-500/20">
                {LANGUAGES.filter((l) => l.code !== "auto").map((l) => (
                  <SelectItem key={l.code} value={l.code} className="text-xs text-zinc-200 focus:bg-amber-500/10">
                    {l.native} — {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleTranslate}
            disabled={isTranslating || isEmpty}
            className="h-8 bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs gap-1.5 px-4 disabled:opacity-40"
          >
            {isTranslating ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Translating…</>
            ) : (
              <><Wand2 className="h-3.5 w-3.5" /> Translate</>
            )}
          </Button>

          {output && (
            <div className="flex items-center gap-1.5 ml-auto">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopy}
                    className="h-8 px-2 gap-1 text-zinc-400 hover:text-white"
                  >
                    {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <ClipboardCopy className="h-4 w-4" />}
                    <span className="text-xs">{copied ? "Copied" : "Copy"}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copy translation to clipboard</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDownload}
                    className="h-8 px-2 gap-1 text-zinc-400 hover:text-white"
                  >
                    <Download className="h-4 w-4" />
                    <span className="text-xs">Download</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Download as .txt</TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          <Card className="bg-black/60 border-zinc-800 rounded-xl">
            <CardContent className="p-0">
              <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800">
                <span className="text-xs font-medium text-zinc-400">
                  Original {source !== "auto" ? `· ${langMeta(source)?.native ?? source}` : ""}
                </span>
                <div className="flex items-center gap-2">
                  <Badge className="bg-zinc-800 text-zinc-500 border-zinc-700 text-xs">
                    {charCount.toLocaleString()} chars
                  </Badge>
                  {isEmpty && (
                    <button
                      onClick={loadExample}
                      className="text-xs text-amber-400/70 hover:text-amber-400 flex items-center gap-1 transition-colors"
                    >
                      <Sparkles className="h-3 w-3" /> Try example
                    </button>
                  )}
                </div>
              </div>
              <textarea
                value={input}
                onChange={(e) => handleInput(e.target.value)}
                placeholder={"Paste your screenplay here…\n\nINT. LOCATION - DAY\n\nAction description.\n\nCHARACTER NAME\n(parenthetical)\nDialogue line."}
                className="w-full h-[480px] bg-transparent text-sm text-zinc-200 placeholder:text-zinc-600 resize-none outline-none p-4 font-mono leading-relaxed"
                spellCheck={false}
              />
            </CardContent>
          </Card>

          <Card className={`bg-black/60 border-zinc-800 rounded-xl ${output ? "border-amber-500/20" : ""}`}>
            <CardContent className="p-0">
              <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800">
                <span className="text-xs font-medium text-zinc-400">
                  {langMeta(target)?.native ?? target} · {langMeta(target)?.label}
                  {targetIsRtl && <Badge className="ml-2 bg-blue-500/10 text-blue-400 border-blue-500/20 text-xs">RTL</Badge>}
                </span>
                {output && (
                  <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Done
                  </Badge>
                )}
              </div>
              {isTranslating ? (
                <div className="h-[480px] flex flex-col items-center justify-center gap-3 text-zinc-500">
                  <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
                  <p className="text-sm">Translating to {langMeta(target)?.label}…</p>
                  <p className="text-xs text-zinc-600">Preserving format, character voices, and cinematic style</p>
                </div>
              ) : (
                <textarea
                  value={output}
                  readOnly
                  dir={targetIsRtl ? "rtl" : "ltr"}
                  placeholder="Translation will appear here…"
                  className={`w-full h-[480px] bg-transparent text-sm text-zinc-200 placeholder:text-zinc-600 resize-none outline-none p-4 font-mono leading-relaxed ${targetIsRtl ? "text-right" : ""}`}
                  spellCheck={false}
                />
              )}
            </CardContent>
          </Card>
        </div>

        <div className="rounded-xl bg-zinc-900/40 border border-zinc-800 px-5 py-4 space-y-2">
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Supported languages</h3>
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.filter((l) => l.code !== "auto").map((l) => (
              <button
                key={l.code}
                onClick={() => setTarget(l.code)}
                className={`px-2.5 py-1 rounded-full text-xs transition-all ${
                  target === l.code
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    : "bg-zinc-800/60 text-zinc-400 border border-zinc-700/50 hover:border-amber-500/20 hover:text-zinc-200"
                }`}
              >
                {l.native} {l.rtl && "↩"}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
