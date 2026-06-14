import { useState, useRef } from "react";
import { SubscriptionGate } from "@/components/SubscriptionGate";
  import { useParams, useLocation } from "wouter";
  import { ArrowLeft, Mic, Play, Pause, RotateCcw, Users, Wand2, Loader2, Volume2, Plus, Trash2, ChevronDown } from "lucide-react";
  import { Button } from "@/components/ui/button";
  import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
  import { Textarea } from "@/components/ui/textarea";
  import { Label } from "@/components/ui/label";
  import { Input } from "@/components/ui/input";
  import { Badge } from "@/components/ui/badge";
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
  import { Separator } from "@/components/ui/separator";
  import { toast } from "sonner";

  interface Character {
    name: string;
    voice: SpeechSynthesisVoice | null;
    voiceName: string;
    color: string;
  }

  interface ScriptLine {
    type: "action" | "dialogue" | "header";
    character?: string;
    text: string;
  }

  const CHAR_COLORS = ["#d4af37","#60a5fa","#f87171","#34d399","#a78bfa","#fb923c","#f472b6","#94a3b8"];

  function parseScript(raw: string): ScriptLine[] {
    const lines: ScriptLine[] = [];
    const rows = raw.split("\n");
    let i = 0;
    while (i < rows.length) {
      const line = rows[i].trim();
      if (!line) { i++; continue; }
      // Character cue: ALL CAPS, short, no special chars
      if (/^[A-Z][A-Z\s\'\-]{1,30}$/.test(line) && rows[i + 1]?.trim()) {
        const next = rows[i + 1]?.trim() ?? "";
        if (next && !next.match(/^[A-Z\s]{3,}$/) && !next.startsWith("INT") && !next.startsWith("EXT")) {
          lines.push({ type: "dialogue", character: line, text: next });
          i += 2; continue;
        }
      }
      // Scene header
      if (/^(INT\.|EXT\.|INT\/EXT\.)/.test(line)) { lines.push({ type: "header", text: line }); i++; continue; }
      lines.push({ type: "action", text: line }); i++;
    }
    return lines;
  }

  const SAMPLE_SCRIPT = `INT. DETECTIVE'S OFFICE - NIGHT

  The room smells of old coffee. DETECTIVE MORGAN sits across from SUSPECT HAYES.

  MORGAN
  You were there. I have three witnesses.

  HAYES
  Three witnesses who all owe you favours.

  MORGAN
  (leaning forward)
  Tell me what you saw, and this stays between us.

  HAYES
  There's nothing to tell.

  The clock ticks. Morgan stands, moves to the window.

  MORGAN
  Then why are your hands shaking?`;

  function TableReadInner() {
    const params = useParams<{ id: string }>();
    const projectId = params.id;
    const [, setLocation] = useLocation();
    const [scriptText, setScriptText] = useState(SAMPLE_SCRIPT);
    const [characters, setCharacters] = useState<Character[]>([]);
    const [parsed, setParsed] = useState<ScriptLine[]>([]);
    const [reading, setReading] = useState(false);
    const [currentLine, setCurrentLine] = useState(-1);
    const [step, setStep] = useState<"input" | "voices" | "reading">("input");
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const synthRef = useRef<SpeechSynthesis | null>(null);
    const readingRef = useRef(false);

    const loadVoices = () => {
      if (typeof speechSynthesis === "undefined") return;
      const v = speechSynthesis.getVoices();
      setVoices(v.length ? v : []);
      if (!v.length) speechSynthesis.onvoiceschanged = () => setVoices(speechSynthesis.getVoices());
    };

    const parseAndProceed = () => {
      if (!scriptText.trim()) { toast.error("Paste a script first"); return; }
      const lines = parseScript(scriptText);
      setParsed(lines);
      const charNames = Array.from(new Set(lines.filter(l => l.type === "dialogue" && l.character).map(l => l.character!)));
      loadVoices();
      const allVoices = typeof speechSynthesis !== "undefined" ? speechSynthesis.getVoices() : [];
      setCharacters(charNames.map((name, i) => ({ name, voice: allVoices[i % allVoices.length] ?? null, voiceName: allVoices[i % allVoices.length]?.name ?? "", color: CHAR_COLORS[i % CHAR_COLORS.length] })));
      setStep("voices");
      toast.success(`Found ${charNames.length} character${charNames.length !== 1 ? "s" : ""} ÃÂ¢ÃÂÃÂ assign voices to start`);
    };

    const startRead = async () => {
      if (typeof speechSynthesis === "undefined") { toast.error("Text-to-speech is not supported in this browser"); return; }
      speechSynthesis.cancel();
      setStep("reading");
      setReading(true);
      readingRef.current = true;
      for (let i = 0; i < parsed.length && readingRef.current; i++) {
        const line = parsed[i];
        if (line.type === "header") continue;
        setCurrentLine(i);
        await new Promise<void>(resolve => {
          const utt = new SpeechSynthesisUtterance(line.text);
          if (line.type === "dialogue" && line.character) {
            const char = characters.find(c => c.name === line.character);
            if (char?.voice) utt.voice = char.voice;
          } else {
            utt.rate = 0.85; utt.pitch = 0.9;
          }
          utt.onend = () => resolve();
          utt.onerror = () => resolve();
          speechSynthesis.speak(utt);
        });
        await new Promise(r => setTimeout(r, 150));
      }
      setReading(false); setCurrentLine(-1);
      if (readingRef.current) toast.success("Table read complete");
      readingRef.current = false;
    };

    const stopRead = () => {
      readingRef.current = false;
      if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
      setReading(false); setCurrentLine(-1);
    };

    const updateCharVoice = (name: string, voiceName: string) => {
      const v = voices.find(x => x.name === voiceName) ?? null;
      setCharacters(prev => prev.map(c => c.name === name ? { ...c, voice: v, voiceName } : c));
    };

    return (
        <div className="min-h-screen px-4 py-6" style={{ background:"linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)" }}>
        <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setLocation(`/projects/${projectId}`)} className="gap-2 text-muted-foreground h-8"><ArrowLeft className="h-4 w-4" />Back</Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-gold-shimmer"><Mic className="h-6 w-6" style={{ color:"#D4AF37" }} />AI Table Read</h1>
            <p className="text-sm text-muted-foreground">Listen to your script performed by text-to-speech voices assigned to each character</p>
          </div>
        </div>

        {step === "input" && (
          <div className="space-y-4">
            <Card className="border-border/40 bg-black/20 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow gold-glow">
              <CardHeader><CardTitle className="text-base gradient-text-gold glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">Paste Your Script</CardTitle></CardHeader>
              <CardContent className="space-y-4 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
                <p className="text-xs text-muted-foreground">Use standard screenplay format: character names in ALL CAPS on their own line, followed by dialogue on the next line. Scene headings start with INT. or EXT.</p>
                <Textarea className="h-72 font-mono text-xs focus:ring-amber-500/30 focus:border-amber-500/50" value={scriptText} onChange={e => setScriptText(e.target.value)} placeholder="INT. LOCATION - TIME\n\nACTION DESCRIPTION\n\nCHARACTER NAME\nDialogue text here." />
                <Button onClick={parseAndProceed} className="w-full"><Wand2 className="h-4 w-4 mr-2" />Parse Script & Assign Voices</Button>
              </CardContent>
            </Card>
          </div>
        )}

        {step === "voices" && (
          <div className="space-y-4">
            <Card className="border-border/40 bg-black/20 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
              <CardHeader><CardTitle className="text-base flex items-center gap-2 gradient-text-gold glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow"><Users className="h-5 w-5 text-amber-400" />Assign Voices to Characters</CardTitle></CardHeader>
              <CardContent className="space-y-3 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
                {characters.map(char => (
                  <div key={char.name} className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-black shrink-0" style={{ background: char.color }}>{char.name.charAt(0)}</div>
                    <span className="font-medium text-sm w-32 truncate shrink-0">{char.name}</span>
                    <Select value={char.voiceName} onValueChange={v => updateCharVoice(char.name, v)}>
                      <SelectTrigger className="flex-1 text-xs h-8"><SelectValue placeholder="Select voiceÃÂ¢ÃÂÃÂ¦" /></SelectTrigger>
                      <SelectContent className="max-h-48">{voices.map(v => <SelectItem key={v.name} value={v.name} className="text-xs">{v.name} ({v.lang})</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                ))}
                {voices.length === 0 && <p className="text-xs text-amber-500 text-center py-2">No voices loaded. Your browser may not support text-to-speech. Try Chrome or Safari.</p>}
                <Separator />
                <div className="flex gap-3">
                  <Button className="flex-1" onClick={startRead} disabled={voices.length === 0}><Play className="h-4 w-4 mr-2" />Start Table Read</Button>
                  <Button variant="outline" onClick={() => setStep("input")}>Back</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {step === "reading" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              {reading ? (
                <Button variant="destructive" onClick={stopRead}><Pause className="h-4 w-4 mr-2" />Stop Read</Button>
              ) : (
                <Button onClick={startRead}><Play className="h-4 w-4 mr-2" />Restart</Button>
              )}
              <Button variant="outline" onClick={() => { stopRead(); setStep("voices"); }}>ÃÂ¢ÃÂÃÂ Edit Voices</Button>
              {reading && <span className="text-xs text-muted-foreground animate-pulse">ReadingÃÂ¢ÃÂÃÂ¦</span>}
            </div>
            <div className="space-y-1 max-h-[60vh] overflow-y-auto pr-1">
              {parsed.map((line, i) => {
                const char = line.character ? characters.find(c => c.name === line.character) : null;
                const isActive = i === currentLine;
                return (
                  <div key={i} className={`px-3 py-2 rounded-lg transition-all ${isActive ? "bg-amber-500/15 border border-primary/30" : "opacity-60"}`}>
                    {line.type === "header" && <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-amber-400/60">{line.text}</p>}
                    {line.type === "action" && <p className="text-sm text-muted-foreground italic">{line.text}</p>}
                    {line.type === "dialogue" && (
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider mb-0.5" style={{ color: char?.color ?? "#d4af37" }}>{line.character}</p>
                        <p className="text-sm">{line.text}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      </div>
    );
  }

export default function TableRead() {
  return (
    <SubscriptionGate
      feature="Table Read (AI Voice)"
      featureKey="canUseAIVoiceActing"
      requiredTier="independent"
    >
      <TableReadInner />
    </SubscriptionGate>
  );
}
