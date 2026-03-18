import { useState, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { useRoute, useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { Languages, Plus, Sparkles, Trash2, Download, ArrowLeft, Loader2, Globe, Copy } from "lucide-react";

const LANGUAGES = [
  // ── English ────────────────────────────────────────────────────────────────
  { code: "en", name: "English" },
  { code: "en-AU", name: "English — Australian" },
  { code: "en-GB", name: "English — British" },
  // ── South Asian Cinema ─────────────────────────────────────────────────────
  { code: "hi", name: "Hindi (हिन्दी)" },
  { code: "ta", name: "Tamil (தமிழ்)" },
  { code: "te", name: "Telugu (తెలుగు)" },
  { code: "bn", name: "Bengali (বাংলা)" },
  { code: "ml", name: "Malayalam (മലയാളം)" },
  { code: "mr", name: "Marathi (मराठी)" },
  { code: "pa", name: "Punjabi (ਪੰਜਾਬੀ)" },
  { code: "gu", name: "Gujarati (ગુજરાતી)" },
  { code: "ur", name: "Urdu (اردو)" },
  { code: "si", name: "Sinhala (සිංහල)" },
  { code: "ne", name: "Nepali (नेपाली)" },
  { code: "kn", name: "Kannada (ಕನ್ನಡ)" },
  { code: "or", name: "Odia (ଓଡ଼ିଆ)" },
  { code: "as", name: "Assamese (অসমীয়া)" },
  // ── East Asian Cinema ──────────────────────────────────────────────────────
  { code: "ko", name: "Korean (한국어)" },
  { code: "ja", name: "Japanese (日本語)" },
  { code: "zh", name: "Chinese — Mandarin Simplified (普通话)" },
  { code: "zh-TW", name: "Chinese — Traditional / Cantonese (繁體中文)" },
  { code: "mn", name: "Mongolian (Монгол)" },
  // ── Middle Eastern & North African ────────────────────────────────────────
  { code: "ar", name: "Arabic — Modern Standard (العربية)" },
  { code: "ar-EG", name: "Arabic — Egyptian (عربي مصري)" },
  { code: "ar-MA", name: "Arabic — Moroccan Darija (الدارجة)" },
  { code: "ar-SA", name: "Arabic — Gulf / Saudi (عربي خليجي)" },
  { code: "he", name: "Hebrew (עברית)" },
  { code: "fa", name: "Persian / Farsi (فارسی)" },
  { code: "tr", name: "Turkish (Türkçe)" },
  { code: "ku", name: "Kurdish (Kurdî)" },
  { code: "ps", name: "Pashto (پښتو)" },
  // ── European Cinema ────────────────────────────────────────────────────────
  { code: "fr", name: "French (Français)" },
  { code: "fr-CA", name: "French — Canadian (Français canadien)" },
  { code: "es", name: "Spanish (Español)" },
  { code: "es-MX", name: "Spanish — Mexican (Español MX)" },
  { code: "es-AR", name: "Spanish — Argentine (Español AR)" },
  { code: "it", name: "Italian (Italiano)" },
  { code: "de", name: "German (Deutsch)" },
  { code: "de-AT", name: "German — Austrian (Österreichisches Deutsch)" },
  { code: "pt-BR", name: "Portuguese — Brazilian (Português BR)" },
  { code: "pt-PT", name: "Portuguese — European (Português PT)" },
  { code: "ru", name: "Russian (Русский)" },
  { code: "pl", name: "Polish (Polski)" },
  { code: "nl", name: "Dutch (Nederlands)" },
  { code: "sv", name: "Swedish (Svenska)" },
  { code: "da", name: "Danish (Dansk)" },
  { code: "no", name: "Norwegian (Norsk)" },
  { code: "fi", name: "Finnish (Suomi)" },
  { code: "el", name: "Greek (Ελληνικά)" },
  { code: "cs", name: "Czech (Čeština)" },
  { code: "sk", name: "Slovak (Slovenčina)" },
  { code: "hu", name: "Hungarian (Magyar)" },
  { code: "ro", name: "Romanian (Română)" },
  { code: "uk", name: "Ukrainian (Українська)" },
  { code: "bg", name: "Bulgarian (Български)" },
  { code: "hr", name: "Croatian (Hrvatski)" },
  { code: "sr", name: "Serbian (Српски)" },
  { code: "bs", name: "Bosnian (Bosanski)" },
  { code: "sl", name: "Slovenian (Slovenščina)" },
  { code: "mk", name: "Macedonian (Македонски)" },
  { code: "sq", name: "Albanian (Shqip)" },
  { code: "lt", name: "Lithuanian (Lietuvių)" },
  { code: "lv", name: "Latvian (Latviešu)" },
  { code: "et", name: "Estonian (Eesti)" },
  { code: "is", name: "Icelandic (Íslenska)" },
  { code: "ga", name: "Irish (Gaeilge)" },
  { code: "cy", name: "Welsh (Cymraeg)" },
  { code: "eu", name: "Basque (Euskara)" },
  { code: "ca", name: "Catalan (Català)" },
  { code: "gl", name: "Galician (Galego)" },
  { code: "be", name: "Belarusian (Беларуская)" },
  // ── African Cinema ─────────────────────────────────────────────────────────
  { code: "yo", name: "Yorùbá (Nigeria)" },
  { code: "ig", name: "Igbo (Nigeria)" },
  { code: "ha", name: "Hausa (Nigeria / Niger)" },
  { code: "sw", name: "Swahili (Kiswahili)" },
  { code: "am", name: "Amharic (አማርኛ)" },
  { code: "zu", name: "Zulu (isiZulu)" },
  { code: "xh", name: "Xhosa (isiXhosa)" },
  { code: "af", name: "Afrikaans" },
  { code: "so", name: "Somali (Soomaali)" },
  { code: "om", name: "Oromo (Afaan Oromoo)" },
  { code: "ti", name: "Tigrinya (ትግርኛ)" },
  { code: "rw", name: "Kinyarwanda (Rwanda)" },
  { code: "ln", name: "Lingala (DRC / Congo)" },
  { code: "wo", name: "Wolof (Senegal)" },
  { code: "ff", name: "Fula / Fulani (West Africa)" },
  { code: "tw", name: "Twi / Akan (Ghana)" },
  { code: "ee", name: "Ewe (Ghana / Togo)" },
  { code: "ny", name: "Chichewa (Malawi / Zambia)" },
  { code: "sn", name: "Shona (Zimbabwe)" },
  { code: "st", name: "Sesotho (Lesotho / South Africa)" },
  { code: "tn", name: "Setswana (Botswana)" },
  { code: "mg", name: "Malagasy (Madagascar)" },
  // ── Southeast Asian Cinema ─────────────────────────────────────────────────
  { code: "th", name: "Thai (ภาษาไทย)" },
  { code: "vi", name: "Vietnamese (Tiếng Việt)" },
  { code: "id", name: "Indonesian (Bahasa Indonesia)" },
  { code: "ms", name: "Malay (Bahasa Melayu)" },
  { code: "tl", name: "Filipino / Tagalog" },
  { code: "km", name: "Khmer (ខ្មែរ)" },
  { code: "lo", name: "Lao (ພາສາລາວ)" },
  { code: "my", name: "Burmese (မြန်မာဘာသာ)" },
  { code: "jv", name: "Javanese (Basa Jawa)" },
  { code: "su", name: "Sundanese (Basa Sunda)" },
  { code: "ceb", name: "Cebuano (Philippines)" },
  // ── Central Asian ──────────────────────────────────────────────────────────
  { code: "kk", name: "Kazakh (Қазақша)" },
  { code: "uz", name: "Uzbek (O'zbek)" },
  { code: "ky", name: "Kyrgyz (Кыргызча)" },
  { code: "tg", name: "Tajik (Тоҷикӣ)" },
  { code: "tk", name: "Turkmen (Türkmen)" },
  { code: "az", name: "Azerbaijani (Azərbaycan)" },
  { code: "hy", name: "Armenian (Հայերեն)" },
  { code: "ka", name: "Georgian (ქართული)" },
  // ── Americas ───────────────────────────────────────────────────────────────
  { code: "qu", name: "Quechua (Andes / Peru / Bolivia)" },
  { code: "gn", name: "Guaraní (Paraguay)" },
  { code: "ht", name: "Haitian Creole (Kreyòl ayisyen)" },
  // ── Pacific ────────────────────────────────────────────────────────────────
  { code: "mi", name: "Māori (New Zealand)" },
  { code: "haw", name: "Hawaiian" },
  { code: "sm", name: "Samoan" },
  { code: "to", name: "Tongan" },
  { code: "fj", name: "Fijian" },
];

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
}

function exportSRT(entries: any[], languageName: string): string {
  return entries.map((e: any, i: number) =>
    `${i + 1}\n${formatTime(e.startTime)} --> ${formatTime(e.endTime)}\n${e.text}\n`
  ).join("\n");
}

function exportVTT(entries: any[], languageName: string): string {
  return `WEBVTT - ${languageName}\n\n` + entries.map((e: any, i: number) =>
    `${i + 1}\n${formatTime(e.startTime).replace(",", ".")} --> ${formatTime(e.endTime).replace(",", ".")}\n${e.text}\n`
  ).join("\n");
}

export default function Subtitles() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [, params] = useRoute("/projects/:id/subtitles");
  const [, navigate] = useLocation();
  const projectId = Number(params?.id);

  const [selectedSubId, setSelectedSubId] = useState<number | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showTranslateDialog, setShowTranslateDialog] = useState(false);
  const [newLang, setNewLang] = useState("en");
  const [translateTarget, setTranslateTarget] = useState("es");
  const [editingEntry, setEditingEntry] = useState<number | null>(null);
  const [editText, setEditText] = useState("");

  const utils = trpc.useUtils();
  const { data: subtitleList = [], isLoading } = trpc.subtitle.listByProject.useQuery(
    { projectId },
    { enabled: !!projectId && isAuthenticated }
  );

  const selectedSub = useMemo(() => subtitleList.find((s: any) => s.id === selectedSubId), [subtitleList, selectedSubId]);
  const entries = (selectedSub?.entries as any[]) || [];

  const generateMutation = trpc.subtitle.aiGenerate.useMutation({
    onSuccess: (data) => {
      utils.subtitle.listByProject.invalidate({ projectId });
      setSelectedSubId(data.id);
      toast.success("Subtitles generated");
    },
    onError: (e) => toast.error(e.message),
  });

  const translateMutation = trpc.subtitle.aiTranslate.useMutation({
    onSuccess: (data) => {
      utils.subtitle.listByProject.invalidate({ projectId });
      setSelectedSubId(data.id);
      setShowTranslateDialog(false);
      toast.success("Translation complete");
    },
    onError: (e) => toast.error(e.message),
  });

  const createMutation = trpc.subtitle.create.useMutation({
    onSuccess: (data) => {
      utils.subtitle.listByProject.invalidate({ projectId });
      setSelectedSubId(data.id);
      setShowAddDialog(false);
      toast.success("Subtitle track created");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.subtitle.update.useMutation({
    onSuccess: () => {
      utils.subtitle.listByProject.invalidate({ projectId });
      setEditingEntry(null);
      toast.success("Entry updated");
    },
  });

  const deleteMutation = trpc.subtitle.delete.useMutation({
    onSuccess: () => {
      utils.subtitle.listByProject.invalidate({ projectId });
      if (selectedSubId) setSelectedSubId(null);
      toast.success("Subtitle track deleted");
    },
  });

  function handleExport(format: "srt" | "vtt") {
    if (!selectedSub) return;
    const content = format === "srt" ? exportSRT(entries, selectedSub.languageName) : exportVTT(entries, selectedSub.languageName);
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `subtitles_${selectedSub.language}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported as ${format.toUpperCase()}`);
  }

  function handleSaveEntry(index: number) {
    if (!selectedSub) return;
    const updated = [...entries];
    updated[index] = { ...updated[index], text: editText };
    updateMutation.mutate({ id: selectedSub.id, entries: updated });
  }

  if (authLoading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin h-8 w-8 text-muted-foreground" /></div>;
  if (!isAuthenticated) { window.location.href = getLoginUrl(); return null; }

  const selectedLangObj = LANGUAGES.find(l => l.code === newLang);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="flex items-center gap-2 sm:gap-3 mb-6 sm:mb-8">
          <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-9 sm:w-9 shrink-0" onClick={() => navigate(`/projects/${projectId}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Subtitles</h1>
            <p className="text-sm text-muted-foreground mt-1 hidden sm:block">Multi-language subtitle management with AI generation and translation</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Language List Sidebar */}
          <div className="space-y-4">
            <div className="flex gap-2">
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" className="flex-1"><Plus className="h-3.5 w-3.5 mr-1" /> Manual</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Subtitle Track</DialogTitle></DialogHeader>
                  <div className="space-y-4 mt-2">
                    <div><Label>Language</Label>
                      <Select value={newLang} onValueChange={setNewLang}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{LANGUAGES.map(l => <SelectItem key={l.code} value={l.code}>{l.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <Button className="w-full" onClick={() => createMutation.mutate({ projectId, language: newLang, languageName: selectedLangObj?.name || newLang })} disabled={createMutation.isPending}>
                      Create Empty Track
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Button size="sm" variant="outline" className="flex-1" onClick={() => {
                const lang = LANGUAGES.find(l => l.code === newLang);
                generateMutation.mutate({ projectId, language: newLang, languageName: lang?.name || "English" });
              }} disabled={generateMutation.isPending}>
                {generateMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
                AI Generate
              </Button>
            </div>

            {/* Language selector for AI generate */}
            <Select value={newLang} onValueChange={setNewLang}>
              <SelectTrigger className="text-xs"><SelectValue placeholder="Language for AI" /></SelectTrigger>
              <SelectContent>{LANGUAGES.map(l => <SelectItem key={l.code} value={l.code}>{l.name}</SelectItem>)}</SelectContent>
            </Select>

            <Separator />

            {isLoading ? (
              <div className="py-8 text-center"><Loader2 className="animate-spin h-5 w-5 mx-auto text-muted-foreground" /></div>
            ) : subtitleList.length === 0 ? (
              <div className="text-center py-8">
                <Languages className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No subtitles yet</p>
              </div>
            ) : (
              <div className="space-y-1">
                {subtitleList.map((sub: any) => (
                  <button
                    key={sub.id}
                    className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors text-sm flex items-center justify-between group ${selectedSubId === sub.id ? "bg-primary/10 text-primary" : "hover:bg-muted/50"}`}
                    onClick={() => setSelectedSubId(sub.id)}
                  >
                    <div className="flex items-center gap-2">
                      <Globe className="h-3.5 w-3.5" />
                      <span>{sub.languageName}</span>
                      {sub.isGenerated === 1 && <Badge variant="secondary" className="text-[10px] px-1">AI</Badge>}
                      {sub.isTranslation === 1 && <Badge variant="outline" className="text-[10px] px-1">Translated</Badge>}
                    </div>
                    <span className="text-xs text-muted-foreground">{(sub.entries as any[] || []).length}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Subtitle Editor */}
          <div className="lg:col-span-3">
            {!selectedSub ? (
              <div className="text-center py-20">
                <Languages className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground">Select a subtitle track</h3>
                <p className="text-sm text-muted-foreground/60 mt-1">Choose a language from the sidebar or generate new subtitles</p>
              </div>
            ) : (
              <div>
                {/* Track Header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-medium">{selectedSub.languageName} Subtitles</h2>
                    <p className="text-xs text-muted-foreground">{entries.length} entries</p>
                  </div>
                  <div className="flex gap-2">
                    <Dialog open={showTranslateDialog} onOpenChange={setShowTranslateDialog}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline"><Copy className="h-3.5 w-3.5 mr-1" /> Translate</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Translate to Another Language</DialogTitle></DialogHeader>
                        <div className="space-y-4 mt-2">
                          <p className="text-sm text-muted-foreground">Translate {selectedSub.languageName} subtitles using AI</p>
                          <div><Label>Target Language</Label>
                            <Select value={translateTarget} onValueChange={setTranslateTarget}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>{LANGUAGES.filter(l => l.code !== selectedSub.language).map(l => <SelectItem key={l.code} value={l.code}>{l.name}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                          <Button className="w-full" onClick={() => translateMutation.mutate({ subtitleId: selectedSub.id, targetLanguage: translateTarget, targetLanguageName: LANGUAGES.find(l => l.code === translateTarget)?.name || translateTarget })} disabled={translateMutation.isPending}>
                            {translateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                            Translate
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Button size="sm" variant="outline" onClick={() => handleExport("srt")}><Download className="h-3.5 w-3.5 mr-1" /> SRT</Button>
                    <Button size="sm" variant="outline" onClick={() => handleExport("vtt")}><Download className="h-3.5 w-3.5 mr-1" /> VTT</Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate({ id: selectedSub.id })}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                </div>

                {/* Visual Timeline */}
                {entries.length > 0 && (
                  <div className="mb-4 p-3 rounded-lg bg-muted/30 border">
                    <div className="text-xs font-medium text-muted-foreground mb-2">Timeline</div>
                    <div className="relative h-10 bg-muted/50 rounded overflow-hidden">
                      {(() => {
                        const maxTime = Math.max(...entries.map((e: any) => e.endTime), 1);
                        return entries.map((entry: any, i: number) => {
                          const left = (entry.startTime / maxTime) * 100;
                          const width = Math.max(((entry.endTime - entry.startTime) / maxTime) * 100, 0.5);
                          return (
                            <div
                              key={i}
                              className="absolute top-1 h-8 rounded-sm bg-primary/60 hover:bg-primary/80 transition-colors cursor-pointer flex items-center justify-center overflow-hidden"
                              style={{ left: `${left}%`, width: `${width}%`, minWidth: "2px" }}
                              title={`${formatTime(entry.startTime)} → ${formatTime(entry.endTime)}\n${entry.text}`}
                              onClick={() => { setEditingEntry(i); setEditText(entry.text); }}
                            >
                              {width > 3 && <span className="text-[8px] text-white truncate px-0.5">{i + 1}</span>}
                            </div>
                          );
                        });
                      })()}
                      {/* Time markers */}
                      <div className="absolute bottom-0 left-0 right-0 flex justify-between px-1">
                        <span className="text-[8px] text-muted-foreground">0:00</span>
                        <span className="text-[8px] text-muted-foreground">{formatTime(Math.max(...entries.map((e: any) => e.endTime), 0))}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Entries Table */}
                <ScrollArea className="h-[500px]">
                  {entries.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-sm text-muted-foreground">No subtitle entries yet. Use AI to generate them.</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs font-medium text-muted-foreground border-b">
                        <div className="col-span-1">#</div>
                        <div className="col-span-2">Start</div>
                        <div className="col-span-2">End</div>
                        <div className="col-span-7">Text</div>
                      </div>
                      {entries.map((entry: any, i: number) => (
                        <div key={i} className="grid grid-cols-12 gap-2 px-3 py-2 text-sm hover:bg-muted/30 rounded items-center">
                          <div className="col-span-1 text-xs text-muted-foreground">{i + 1}</div>
                          <div className="col-span-2 font-mono text-xs">{formatTime(entry.startTime)}</div>
                          <div className="col-span-2 font-mono text-xs">{formatTime(entry.endTime)}</div>
                          <div className="col-span-7">
                            {editingEntry === i ? (
                              <div className="flex gap-2">
                                <Input value={editText} onChange={e => setEditText(e.target.value)} className="text-sm h-8" autoFocus />
                                <Button size="sm" variant="outline" className="h-8" onClick={() => handleSaveEntry(i)}>Save</Button>
                                <Button size="sm" variant="ghost" className="h-8" onClick={() => setEditingEntry(null)}>Cancel</Button>
                              </div>
                            ) : (
                              <span className="cursor-pointer hover:text-primary transition-colors" onClick={() => { setEditingEntry(i); setEditText(entry.text); }}>
                                {entry.text}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
