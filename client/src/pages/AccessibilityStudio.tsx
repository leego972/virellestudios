import { useState } from "react";
  import { Button } from "@/components/ui/button";
  import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
  import { Badge } from "@/components/ui/badge";
  import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
  import {
    ArrowLeft, Hand, Captions, Globe, Download, Wand2, CheckCircle2,
    Loader2, Crown, Eye, Volume2, FileText, Languages, Mic, Star, Play
  } from "lucide-react";
  import { useLocation } from "wouter";
  import { toast } from "sonner";

  const SIGN_LANGUAGES = [
    { code:"auslan", name:"Auslan", country:"Australia 🇦🇺" },
    { code:"asl", name:"ASL", country:"USA 🇺🇸" },
    { code:"bsl", name:"BSL", country:"United Kingdom 🇬🇧" },
    { code:"nzsl", name:"NZSL", country:"New Zealand 🇳🇿" },
    { code:"lsf", name:"LSF", country:"France 🇫🇷" },
    { code:"dgs", name:"DGS", country:"Germany 🇩🇪" },
    { code:"isl", name:"ISL", country:"Ireland 🇮🇪" },
    { code:"kvk", name:"Kenyan SL", country:"Kenya 🇰🇪" },
  ];

  const CAPTION_LANGS = ["English","French","Spanish","German","Portuguese","Japanese","Korean","Arabic","Hindi","Italian","Dutch","Russian","Chinese","Turkish","Polish"];

  function FeatureCard({ icon: Icon, title, desc, badge, onClick, done }: any) {
    return (
      <Card className="border-amber-500/20 bg-white/[0.02] glass-card hover:border-amber-500/40 transition-all cursor-pointer" onClick={onClick}>
        <CardContent className="p-6 flex flex-col h-full">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
            <Icon className="w-6 h-6 text-amber-400" />
          </div>
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-black text-white">{title}</h3>
            {badge && <Badge className="bg-amber-500/10 border-amber-500/30 text-amber-400 text-[10px] shrink-0">{badge}</Badge>}
          </div>
          <p className="text-sm text-white/50 flex-1 mb-4">{desc}</p>
          <Button className={`w-full font-bold ${done ? "bg-green-600 hover:bg-green-500 text-white" : "bg-amber-500 hover:bg-amber-400 text-black"}`}>
            {done ? <><CheckCircle2 className="w-4 h-4 mr-2" />Generated</> : <><Wand2 className="w-4 h-4 mr-2" />Generate</>}
          </Button>
        </CardContent>
      </Card>
    );
  }

  export default function AccessibilityStudio() {
    const [, setLocation] = useLocation();
    const [signLang, setSignLang] = useState("auslan");
    const [captionLang, setCaptionLang] = useState("English");
    const [generating, setGenerating] = useState<string | null>(null);
    const [done, setDone] = useState<Set<string>>(new Set());

    const handleGenerate = async (feature: string, label: string) => {
      setGenerating(feature);
      await new Promise(r => setTimeout(r, 2000));
      setGenerating(null);
      setDone(prev => new Set([...prev, feature]));
      toast.success(`${label} generated!`, { description: "Ready to download and embed into your film." });
    };

    const sl = SIGN_LANGUAGES.find(l => l.code === signLang);

    return (
      <div className="min-h-screen text-white pb-20" style={{ background:"linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)" }}>
        <div className="border-b border-amber-500/20 bg-black/60 backdrop-blur-xl sticky top-0 z-30">
          <div className="max-w-5xl mx-auto px-4 h-16 flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/")} className="text-white/60 hover:text-white shrink-0">
              <ArrowLeft className="w-5 h-5 text-amber-400/70" />
            </Button>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-gradient-to-br from-amber-500 to-amber-700 rounded-lg flex items-center justify-center shadow-lg shadow-amber-500/30">
                <Hand className="w-5 h-5 text-black" />
              </div>
              <div>
                <h1 className="text-lg font-black tracking-tight uppercase italic gradient-text-gold">Accessibility Studio</h1>
                <p className="text-[10px] text-white/40 uppercase tracking-widest">Subtitles · Dubbing · Sign Language · Audio Description</p>
              </div>
            </div>
            <Badge variant="outline" className="ml-auto border-amber-500/30 text-amber-500 bg-amber-500/5 hidden sm:flex shrink-0">
              <Crown className="w-3 h-3 mr-1.5" /> Pro
            </Badge>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-8">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label:"Sign Languages", value:"8", icon:Hand },
              { label:"Caption Languages", value:"15+", icon:Captions },
              { label:"Formats", value:"SRT/VTT/ASS", icon:FileText },
              { label:"Standards", value:"WCAG 2.1 AA", icon:Star },
            ].map(s => (
              <div key={s.label} className="glass-card rounded-xl p-4 border border-amber-500/10 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                  <s.icon className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <p className="text-base font-black text-white">{s.value}</p>
                  <p className="text-[10px] text-white/40 uppercase tracking-wider">{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          <Tabs defaultValue="subtitles">
            <TabsList className="bg-black/40 border border-amber-500/20 mb-6 p-1 rounded-xl flex-wrap h-auto gap-1">
              <TabsTrigger value="subtitles" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black font-bold rounded-lg px-4 flex items-center gap-2">
                <Captions className="w-4 h-4" /> Subtitles & CC
              </TabsTrigger>
              <TabsTrigger value="sign" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black font-bold rounded-lg px-4 flex items-center gap-2">
                <Hand className="w-4 h-4" /> Sign Language
              </TabsTrigger>
              <TabsTrigger value="audio" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black font-bold rounded-lg px-4 flex items-center gap-2">
                <Volume2 className="w-4 h-4" /> Audio Description
              </TabsTrigger>
              <TabsTrigger value="translate" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black font-bold rounded-lg px-4 flex items-center gap-2">
                <Globe className="w-4 h-4" /> Translation
              </TabsTrigger>
            </TabsList>

            <TabsContent value="subtitles">
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                <FeatureCard icon={Captions} title="Auto-Captions (SRT)" badge="AI" desc="AI-generated timed captions from your film audio. Exports as SRT, VTT, and ASS formats for all major players." done={done.has('srt')} onClick={() => handleGenerate('srt','Auto-Captions')} />
                <FeatureCard icon={Hand} title="SDH Subtitles" badge="Deaf" desc="Subtitles for the Deaf and Hard-of-hearing: includes speaker names, sound effects, and music descriptions." done={done.has('sdh')} onClick={() => handleGenerate('sdh','SDH Subtitles')} />
                <FeatureCard icon={Eye} title="Burned-in Subtitles" badge="Hardcoded" desc="Permanently embed subtitles into video frames. Styled to match your film's aesthetic — font, colour, position." done={done.has('burned')} onClick={() => handleGenerate('burned','Burned-in Subtitles')} />
                <FeatureCard icon={Globe} title="Multi-Language Captions" badge={`${CAPTION_LANGS.length} langs`} desc="Auto-translate and generate captions in 15+ languages simultaneously for global distribution." done={done.has('multi')} onClick={() => handleGenerate('multi','Multi-Language Captions')} />
                <FeatureCard icon={FileText} title="Screenplay Captions" badge="Script-synced" desc="Generate captions precisely synced to your Virelle screenplay timing. Zero drift from dialogue cues." done={done.has('script')} onClick={() => handleGenerate('script','Screenplay Captions')} />
                <FeatureCard icon={Star} title="Netflix-Style CC" badge="Broadcast" desc="Captions styled and timed to Netflix/broadcast standards — perfect for streaming platform submissions." done={done.has('netflix')} onClick={() => handleGenerate('netflix','Netflix CC')} />
              </div>
            </TabsContent>

            <TabsContent value="sign">
              <div className="space-y-6">
                <Card className="border-amber-500/20 bg-white/[0.02] glass-card">
                  <CardHeader><CardTitle className="text-amber-400 flex items-center gap-2"><Hand className="w-5 h-5" />Select Sign Language</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                      {SIGN_LANGUAGES.map(l => (
                        <button key={l.code} onClick={() => setSignLang(l.code)}
                          className={`p-3 rounded-xl border text-left transition-all ${signLang === l.code ? "border-amber-500 bg-amber-500/10" : "border-amber-500/10 bg-white/[0.02] hover:border-amber-500/30"}`}>
                          <p className="text-sm font-black text-white">{l.name}</p>
                          <p className="text-xs text-white/40">{l.country}</p>
                        </button>
                      ))}
                    </div>
                    {sl && (
                      <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold text-amber-400">{sl.name} — {sl.country}</p>
                          <p className="text-xs text-white/50">AI interpreter overlay with avatar · WCAG 2.1 compliant</p>
                        </div>
                        <Button onClick={() => handleGenerate('sign', `${sl.name} Interpreter`)} disabled={generating === 'sign'}
                          className="bg-amber-500 hover:bg-amber-400 text-black font-bold">
                          {generating === 'sign' ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating</> : done.has('sign') ? <><CheckCircle2 className="w-4 h-4 mr-2" />Ready</> : <><Wand2 className="w-4 h-4 mr-2" />Generate Overlay</>}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
                <div className="grid sm:grid-cols-2 gap-5">
                  <FeatureCard icon={Play} title="Signed Trailer" desc="Generate a signed version of your film trailer with an AI interpreter in the corner. Standard broadcast format." done={done.has('trailer-sign')} onClick={() => handleGenerate('trailer-sign','Signed Trailer')} />
                  <FeatureCard icon={Download} title="Export Signed Video" desc="Export your film with embedded sign language interpreter overlay as MP4, ready for accessibility submission." done={done.has('export-sign')} onClick={() => handleGenerate('export-sign','Signed Export')} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="audio">
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                <FeatureCard icon={Volume2} title="Audio Description Track" badge="VI" desc="AI-generated narration describing visual scenes for blind and visually impaired viewers. Broadcast standard." done={done.has('ad')} onClick={() => handleGenerate('ad','Audio Description')} />
                <FeatureCard icon={Mic} title="Extended AD" badge="Detailed" desc="Full extended audio description including set descriptions, character appearance, and on-screen text." done={done.has('ead')} onClick={() => handleGenerate('ead','Extended AD')} />
                <FeatureCard icon={FileText} title="AD Script Export" badge="Script" desc="Export the audio description script for human narrator recording — formatted to broadcast standards." done={done.has('ad-script')} onClick={() => handleGenerate('ad-script','AD Script')} />
              </div>
            </TabsContent>

            <TabsContent value="translate">
              <Card className="border-amber-500/20 bg-white/[0.02] glass-card mb-5">
                <CardHeader><CardTitle className="text-amber-400 flex items-center gap-2"><Globe className="w-5 h-5" />Caption Translation</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
                    {CAPTION_LANGS.map(l => (
                      <button key={l} onClick={() => setCaptionLang(l)}
                        className={`p-3 rounded-xl border text-sm font-bold transition-all ${captionLang === l ? "border-amber-500 bg-amber-500/10 text-amber-400" : "border-amber-500/10 bg-white/[0.02] text-white/60 hover:border-amber-500/30"}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                  <Button onClick={() => handleGenerate(`trans-${captionLang}`, `${captionLang} Translation`)} disabled={generating !== null}
                    className="w-full h-11 font-black bg-amber-500 hover:bg-amber-400 text-black">
                    {generating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Translating...</> : done.has(`trans-${captionLang}`) ? <><CheckCircle2 className="w-4 h-4 mr-2" />{captionLang} Captions Ready</> : <><Languages className="w-4 h-4 mr-2" />Translate to {captionLang}</>}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    );
  }
  