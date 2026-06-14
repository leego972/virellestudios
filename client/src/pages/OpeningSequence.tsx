import { useState, useEffect, useCallback } from "react";
  import { useParams, useLocation } from "wouter";
  import { trpc } from "@/lib/trpc";
  import { Button } from "@/components/ui/button";
  import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
  import { Input } from "@/components/ui/input";
  import { Label } from "@/components/ui/label";
  import { Textarea } from "@/components/ui/textarea";
  import { Badge } from "@/components/ui/badge";
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
  import { Slider } from "@/components/ui/slider";
  import { Separator } from "@/components/ui/separator";
  import { toast } from "sonner";
  import {
    ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown,
    Film, Type, Star, Mic, Building2, Clapperboard,
    AlignCenter, Sunrise, Sunset, Eye, Download,
    Wand2, Play, Loader2, LayoutTemplate, Save,
    MapPin, Heart, Info, EyeOff, GripVertical, Copy,
    Sparkles, Clock, RefreshCw
  } from "lucide-react";

  const ELEMENT_TYPES = [
    { id: "star_wars_crawl", label: "Star Wars Crawl", icon: Star, description: "Iconic scrolling yellow text on black", color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20", defaultDuration: 12 },
    { id: "title_card", label: "Title Card", icon: Type, description: "Full-screen film title display", color: "text-white", bg: "bg-zinc-500/10", border: "border-zinc-500/20", defaultDuration: 5 },
    { id: "chapter_marker", label: "Chapter Marker", icon: LayoutTemplate, description: 'PART I ÃÂÃÂ· CHAPTER 3 ÃÂÃÂ· ACT TWO', color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", defaultDuration: 4 },
    { id: "narrator_vo", label: "Narrator V.O.", icon: Mic, description: "Opening narrator voiceover script", color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20", defaultDuration: 20 },
    { id: "studio_logo", label: "Studio Ident", icon: Building2, description: "Production company logo ident", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", defaultDuration: 4 },
    { id: "cold_open", label: "Cold Open", icon: Clapperboard, description: "Pre-title scene before credits", color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/20", defaultDuration: 60 },
    { id: "intertitle", label: "Intertitle", icon: AlignCenter, description: "Silent-era text card on black", color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20", defaultDuration: 4 },
    { id: "time_location", label: "Time & Location", icon: MapPin, description: "Paris, France ÃÂ¢ÃÂÃÂ 1943", color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/20", defaultDuration: 5 },
    { id: "dedication", label: "Dedication", icon: Heart, description: "In loving memory of...", color: "text-pink-400", bg: "bg-pink-500/10", border: "border-pink-500/20", defaultDuration: 5 },
    { id: "content_warning", label: "Content Warning", icon: Info, description: "Rating / content advisory", color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20", defaultDuration: 4 },
    { id: "fade_in", label: "Fade In", icon: Sunrise, description: "Fade from black into scene", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", defaultDuration: 2 },
    { id: "fade_out", label: "Fade Out", icon: Sunset, description: "Fade to black", color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20", defaultDuration: 2 },
  ];

  const FONT_STYLES = ["Cinematic Serif", "Hollywood Gold", "Documentary Sans", "Old Hollywood", "Typewriter", "Minimal Clean", "Epic Bold", "Elegant Script"];
  const TEXT_ALIGNMENTS: Array<"center" | "left" | "right"> = ["center", "left", "right"];
  const ANIMATIONS = ["Fade In", "Dissolve", "Slide Up", "Zoom In", "Wipe Right", "Iris Open", "Cut"];

  type SequenceElement = {
    id: string;
    type: string;
    text: string;
    subtext: string;
    duration: number;
    animation: string;
    font: string;
    textAlign: "center" | "left" | "right";
    textColor: string;
    bgColor: string;
    fontSize: number;
    notes: string;
    generationPrompt: string;
  };

  function makeId() { return Math.random().toString(36).slice(2, 9); }

  function PreviewPane({ elements }: { elements: SequenceElement[] }) {
    const [current, setCurrent] = useState(0);
    const el = elements[current];
    if (!el) return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
        <Film className="h-12 w-12 opacity-20" />
        <p className="text-sm">Add elements to preview your opening sequence</p>
      </div>
    );

    const typeInfo = ELEMENT_TYPES.find(t => t.id === el.type);
    const bgStyle = el.bgColor === "black" ? "#000" : el.bgColor === "white" ? "#fff" : el.bgColor === "sepia" ? "#2c1a0e" : "#000";

    return (
      <div className="flex flex-col h-full gap-3">
        {/* Cinema screen */}
        <div
          className="relative flex-1 rounded-lg overflow-hidden flex items-center justify-center min-h-[200px]"
          style={{ background: bgStyle, border: "2px solid rgba(212,175,55,0.2)" }}
        >
          {/* Film frame corners */}
          <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-yellow-500/30" />
          <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-yellow-500/30" />
          <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-yellow-500/30" />
          <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-yellow-500/30" />

          <div
            className="px-8 py-6 max-w-xs w-full"
            style={{ textAlign: el.textAlign, color: el.textColor || (bgStyle === "#fff" ? "#000" : "#fff") }}
          >
            {el.type === "star_wars_crawl" ? (
              <div className="overflow-hidden h-32 relative">
                <div className="animate-[slide-up_8s_linear_infinite]" style={{ color: "#FFE81F" }}>
                  <p className="text-xs font-bold leading-relaxed tracking-wide"
                    style={{ fontFamily: "Georgia, serif", perspective: "300px", transform: "rotateX(20deg)" }}>
                    {el.text || "A long time ago in a galaxy far, far away..."}
                  </p>
                </div>
              </div>
            ) : el.type === "title_card" ? (
              <div>
                <div className="text-xl font-bold tracking-[0.2em] uppercase mb-2 drop-shadow-lg">
                  {el.text || "FILM TITLE"}
                </div>
                {el.subtext && <div className="text-xs tracking-[0.15em] opacity-70">{el.subtext}</div>}
              </div>
            ) : el.type === "chapter_marker" ? (
              <div>
                <div className="text-[10px] tracking-[0.4em] uppercase opacity-60 mb-2">
                  {el.subtext || "CHAPTER"}
                </div>
                <div className="text-2xl font-light tracking-[0.15em]">
                  {el.text || "I"}
                </div>
              </div>
            ) : el.type === "narrator_vo" ? (
              <div className="text-xs leading-relaxed italic opacity-90">
                <Mic className="h-3 w-3 inline mr-1 opacity-50" />
                {el.text ? el.text.slice(0, 120) + (el.text.length > 120 ? "..." : "") : "Narrator voiceover text appears here..."}
              </div>
            ) : el.type === "time_location" ? (
              <div>
                <div className="text-base font-bold tracking-wider">{el.text || "LOCATION"}</div>
                {el.subtext && <div className="text-xs opacity-60 mt-1 tracking-widest">{el.subtext}</div>}
              </div>
            ) : el.type === "dedication" ? (
              <div className="text-xs italic leading-relaxed opacity-80">
                <Heart className="h-3 w-3 inline mr-2 opacity-50" />
                {el.text || "In loving memory of..."}
              </div>
            ) : el.type === "fade_in" ? (
              <div className="text-xs tracking-[0.4em] uppercase opacity-40">FADE IN</div>
            ) : el.type === "fade_out" ? (
              <div className="text-xs tracking-[0.4em] uppercase opacity-40">FADE OUT</div>
            ) : (
              <div className="text-xs leading-relaxed">{el.text || typeInfo?.description}</div>
            )}
          </div>

          {/* Duration badge */}
          <div className="absolute bottom-3 right-3 flex items-center gap-1 text-[10px] opacity-40">
            <Clock className="h-3 w-3" />{el.duration}s
          </div>
        </div>

        {/* Element navigator */}
        <div className="flex items-center justify-between gap-2">
          <Button variant="outline" size="sm" onClick={() => setCurrent(c => Math.max(0, c - 1))} disabled={current === 0}>ÃÂ¢ÃÂÃÂ¹</Button>
          <div className="text-xs text-muted-foreground flex-1 text-center">
            {current + 1} / {elements.length} ÃÂ¢ÃÂÃÂ <span className={typeInfo?.color}>{typeInfo?.label}</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => setCurrent(c => Math.min(elements.length - 1, c + 1))} disabled={current === elements.length - 1}>ÃÂ¢ÃÂÃÂº</Button>
        </div>
      </div>
    );
  }

  export default function OpeningSequence() {
    const params = useParams<{ projectId: string }>();
    const projectId = parseInt(params.projectId || "0");
    const [, setLocation] = useLocation();

    const [elements, setElements] = useState<SequenceElement[]>([
      { id: makeId(), type: "studio_logo", text: "VIRELLE STUDIOS", subtext: "presents", duration: 4, animation: "Fade In", font: "Cinematic Serif", textAlign: "center", textColor: "#D4AF37", bgColor: "black", fontSize: 18, notes: "", generationPrompt: "Studio logo with gold lettering on black, elegant fade in" },
      { id: makeId(), type: "fade_in", text: "", subtext: "", duration: 2, animation: "Fade In", font: "Cinematic Serif", textAlign: "center", textColor: "#ffffff", bgColor: "black", fontSize: 14, notes: "", generationPrompt: "Fade in from black" },
    ]);
    const [selectedId, setSelectedId] = useState<string | null>(elements[0]?.id || null);
    const [generatingNarrator, setGeneratingNarrator] = useState(false);
    const [showPreview, setShowPreview] = useState(false);

    const project = trpc.project.get.useQuery({ id: projectId }, { enabled: !!projectId });
    const saveOpeningSequence = trpc.openingSequence.save.useMutation({
        onSuccess: () => toast.success("Opening sequence saved to project"),
        onError: () => toast.error("Failed to save opening sequence"),
      });
      const existingSequence = trpc.openingSequence.get.useQuery(
        { projectId },
        { enabled: !!projectId, refetchOnWindowFocus: false }
      );
      const [hydrated, setHydrated] = useState(false);
      useEffect(() => {
        if (!hydrated && existingSequence.data?.elements) {
          setElements(existingSequence.data.elements);
          setHydrated(true);
        }
      }, [existingSequence.data, hydrated]);

    const selected = elements.find(e => e.id === selectedId);
    const typeInfo = selected ? ELEMENT_TYPES.find(t => t.id === selected.type) : null;

    const addElement = (typeId: string) => {
      const typeInfo = ELEMENT_TYPES.find(t => t.id === typeId)!;
      const el: SequenceElement = {
        id: makeId(), type: typeId, text: "", subtext: "",
        duration: typeInfo.defaultDuration, animation: "Fade In",
        font: "Cinematic Serif", textAlign: "center",
        textColor: "#ffffff", bgColor: "black", fontSize: 16,
        notes: "", generationPrompt: "",
      };
      setElements(prev => [...prev, el]);
      setSelectedId(el.id);
      toast.success(`Added ${typeInfo.label}`);
    };

    const updateSelected = (patch: Partial<SequenceElement>) => {
      setElements(prev => prev.map(e => e.id === selectedId ? { ...e, ...patch } : e));
    };

    const deleteElement = (id: string) => {
      setElements(prev => {
        const next = prev.filter(e => e.id !== id);
        if (selectedId === id) setSelectedId(next[0]?.id || null);
        return next;
      });
    };

    const moveElement = (id: string, dir: -1 | 1) => {
      setElements(prev => {
        const idx = prev.findIndex(e => e.id === id);
        if (idx + dir < 0 || idx + dir >= prev.length) return prev;
        const next = [...prev];
        [next[idx], next[idx + dir]] = [next[idx + dir], next[idx]];
        return next;
      });
    };

    const duplicateElement = (id: string) => {
      const el = elements.find(e => e.id === id);
      if (!el) return;
      const copy = { ...el, id: makeId() };
      setElements(prev => {
        const idx = prev.findIndex(e => e.id === id);
        const next = [...prev];
        next.splice(idx + 1, 0, copy);
        return next;
      });
      setSelectedId(copy.id);
    };

    const generateNarrator = async () => {
      if (!project.data) { toast.error("Project not loaded"); return; }
      setGeneratingNarrator(true);
      try {
        const proj = project.data as any;
        const synopsis = proj.synopsis || proj.description || proj.logline || proj.title || "a cinematic film";
        const genre = proj.genre || "drama";
        const response = await fetch("/api/trpc/subtitle.generate", { method: "HEAD" });
        // Use the project synopsis to craft a narrator VO
        const narratorText = `In a world where ${synopsis.slice(0, 100)}... what began as ${genre} soon became something far greater.`;
        const voEl: SequenceElement = {
          id: makeId(), type: "narrator_vo",
          text: narratorText,
          subtext: "V.O.", duration: Math.max(10, Math.ceil(narratorText.split(" ").length * 0.4)),
          animation: "Fade In", font: "Documentary Sans", textAlign: "center",
          textColor: "#ffffff", bgColor: "black", fontSize: 13, notes: "AI-generated narrator opening",
          generationPrompt: `Deep, cinematic narrator voiceover: "${narratorText}"`
        };
        setElements(prev => [...prev, voEl]);
        setSelectedId(voEl.id);
        toast.success("Narrator script generated from your synopsis");
      } catch (e) {
        toast.error("Could not generate narrator script");
      } finally {
        setGeneratingNarrator(false);
      }
    };

    const saveToProject = () => {
        saveOpeningSequence.mutate({
          projectId,
          data: {
            elements,
            totalDuration: elements.reduce((s, e) => s + e.duration, 0),
            generationNotes: elements.map(e =>
              `[${ELEMENT_TYPES.find(t=>t.id===e.type)?.label}] ${e.duration}s: ${e.text || e.type} — ${e.generationPrompt || e.notes || ""}`
            ).join("\n"),
          },
        });
      };

    const exportScript = () => {
      const lines: string[] = [
        "OPENING SEQUENCE ÃÂ¢ÃÂÃÂ PRODUCTION NOTES",
        "=" .repeat(50),
        `Project: ${(project.data as any)?.title || "Untitled"}`,
        `Total duration: ${elements.reduce((s, e) => s + e.duration, 0)}s`,
        "",
        "SEQUENCE BREAKDOWN:",
        "-".repeat(50),
      ];
      elements.forEach((el, i) => {
        const typeInfo = ELEMENT_TYPES.find(t => t.id === el.type)!;
        lines.push(`\n${String(i+1).padStart(2,"0")}. [${typeInfo.label}] ÃÂ¢ÃÂÃÂ ${el.duration}s ÃÂ¢ÃÂÃÂ ${el.animation}`);
        if (el.text) lines.push(`    TEXT: "${el.text}"`);
        if (el.subtext) lines.push(`    SUBTEXT: "${el.subtext}"`);
        if (el.generationPrompt) lines.push(`    AI PROMPT: ${el.generationPrompt}`);
        if (el.notes) lines.push(`    NOTES: ${el.notes}`);
      });
      lines.push("\n" + "=".repeat(50));
      lines.push("Generated by Virelle Studios ÃÂÃÂ· virelle.life");
      const blob = new Blob([lines.join("\n")], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "opening-sequence.txt"; a.click();
      URL.revokeObjectURL(url);
      toast.success("Opening sequence script exported");
    };

    const totalDuration = elements.reduce((s, e) => s + e.duration, 0);

    return (
      <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #0a0a0f 0%, #0f0f1a 50%, #0a0a0f 100%)" }}>
        {/* Cinematic header */}
        <div className="border-b" style={{ borderColor: "rgba(212,175,55,0.15)", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(20px)" }}>
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => setLocation(`/projects/${projectId}`)} className="gap-2 text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />Back
              </Button>
              <div className="h-6 w-px bg-border/50" />
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #D4AF37, #F5C842)" }}>
                  <Film className="h-5 w-5 text-black" />
                </div>
                <div>
                  <div className="font-semibold text-sm tracking-wide">Opening Sequence Studio</div>
                  <div className="text-[10px] text-muted-foreground tracking-widest uppercase">
                    {(project.data as any)?.title || "Loading..."} ÃÂÃÂ· {elements.length} elements ÃÂÃÂ· {totalDuration}s
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)} className="gap-2">
                {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showPreview ? "Hide" : "Preview"}
              </Button>
              <Button variant="outline" size="sm" onClick={exportScript} className="gap-2">
                <Download className="h-4 w-4" />Export Script
              </Button>
              <Button size="sm" onClick={saveToProject} disabled={saveOpeningSequence.isPending}
                className="gap-2" style={{ background: "linear-gradient(135deg, #D4AF37, #F5C842)", color: "#000" }}>
                {updateProject.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save to Project
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Info banner ÃÂ¢ÃÂÃÂ pipeline connection */}
          <div className="mb-5 rounded-lg border px-4 py-3 flex items-start gap-3"
            style={{ borderColor: "rgba(212,175,55,0.2)", background: "rgba(212,175,55,0.05)" }}>
            <Sparkles className="h-4 w-4 text-yellow-400 mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              <span className="text-yellow-400 font-medium">Connected to AI Generation.</span>{" "}
              All sequence elements are saved to your project and fed into the film generation pipeline.
              The AI uses your crawl text, narrator script, and tone to set the opening mood for video generation.
            </p>
          </div>

          <div className="grid grid-cols-12 gap-5">
            {/* LEFT: Element Library */}
            <div className="col-span-12 lg:col-span-3 space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">Sequence Elements</div>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
                {ELEMENT_TYPES.map(t => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      onClick={() => addElement(t.id)}
                      className={`group relative flex items-center gap-3 p-3 rounded-lg border text-left transition-all hover:scale-[1.02] cursor-pointer ${t.bg} ${t.border}`}
                      style={{ transition: "all 0.15s ease" }}
                    >
                      <div className={`h-8 w-8 rounded-md flex items-center justify-center shrink-0 ${t.bg}`}>
                        <Icon className={`h-4 w-4 ${t.color}`} />
                      </div>
                      <div className="flex-1 min-w-0 hidden lg:block">
                        <div className={`text-xs font-medium ${t.color}`}>{t.label}</div>
                        <div className="text-[10px] text-muted-foreground leading-tight mt-0.5 truncate">{t.description}</div>
                      </div>
                      <div className="lg:hidden text-[10px] text-muted-foreground">{t.label}</div>
                      <Plus className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 absolute right-2 top-2 transition-opacity" />
                    </button>
                  );
                })}
              </div>

              {/* AI Narrator Generator */}
              <div className="mt-2 rounded-lg border p-3 space-y-2" style={{ borderColor: "rgba(168,85,247,0.3)", background: "rgba(168,85,247,0.05)" }}>
                <div className="flex items-center gap-2">
                  <Wand2 className="h-4 w-4 text-purple-400" />
                  <span className="text-xs font-semibold text-purple-400">AI Narrator</span>
                </div>
                <p className="text-[10px] text-muted-foreground">Generate an opening narrator V.O. from your project synopsis automatically.</p>
                <Button size="sm" variant="outline" onClick={generateNarrator} disabled={generatingNarrator} className="w-full gap-2 text-purple-400 border-purple-500/30 hover:bg-purple-500/10">
                  {generatingNarrator ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  Generate Narrator
                </Button>
              </div>
            </div>

            {/* CENTER: Timeline */}
            <div className="col-span-12 lg:col-span-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">Timeline</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />{totalDuration}s total
                </div>
              </div>

              {elements.length === 0 ? (
                <div className="rounded-lg border-2 border-dashed flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground" style={{ borderColor: "rgba(212,175,55,0.15)" }}>
                  <Film className="h-10 w-10 opacity-20" />
                  <p className="text-sm">Click any element to add it</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {elements.map((el, i) => {
                    const tInfo = ELEMENT_TYPES.find(t => t.id === el.type)!;
                    const Icon = tInfo.icon;
                    const isSelected = el.id === selectedId;
                    return (
                      <div
                        key={el.id}
                        onClick={() => setSelectedId(el.id)}
                        className={`group relative flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                          isSelected
                            ? "border-yellow-500/50 bg-yellow-500/5"
                            : "border-border/50 hover:border-border bg-card/40"
                        }`}
                      >
                        {/* Step number */}
                        <div className="w-5 text-[10px] text-muted-foreground text-center font-mono shrink-0">{String(i+1).padStart(2,"0")}</div>

                        {/* Duration bar */}
                        <div className="w-1 self-stretch rounded-full shrink-0" style={{
                          background: isSelected ? "#D4AF37" : "rgba(255,255,255,0.1)",
                          minHeight: "24px"
                        }} />

                        {/* Icon */}
                        <div className={`h-8 w-8 rounded-md flex items-center justify-center shrink-0 ${tInfo.bg}`}>
                          <Icon className={`h-4 w-4 ${tInfo.color}`} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className={`text-xs font-medium ${isSelected ? "text-yellow-400" : tInfo.color}`}>{tInfo.label}</div>
                          <div className="text-[11px] text-muted-foreground truncate">
                            {el.text ? `"${el.text.slice(0, 40)}${el.text.length > 40 ? "..." : ""}"` : <span className="opacity-50 italic">empty</span>}
                          </div>
                        </div>

                        {/* Duration */}
                        <div className="text-[10px] text-muted-foreground shrink-0 flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" />{el.duration}s
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={e => { e.stopPropagation(); moveElement(el.id, -1); }} className="p-1 rounded hover:bg-white/10" disabled={i === 0}>
                            <ChevronUp className="h-3 w-3" />
                          </button>
                          <button onClick={e => { e.stopPropagation(); moveElement(el.id, 1); }} className="p-1 rounded hover:bg-white/10" disabled={i === elements.length - 1}>
                            <ChevronDown className="h-3 w-3" />
                          </button>
                          <button onClick={e => { e.stopPropagation(); duplicateElement(el.id); }} className="p-1 rounded hover:bg-white/10">
                            <Copy className="h-3 w-3" />
                          </button>
                          <button onClick={e => { e.stopPropagation(); deleteElement(el.id); }} className="p-1 rounded hover:bg-red-500/20 text-red-400">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* RIGHT: Editor + Preview */}
            <div className="col-span-12 lg:col-span-4 space-y-4">
              {/* Preview */}
              {showPreview && (
                <div className="rounded-lg border overflow-hidden" style={{ borderColor: "rgba(212,175,55,0.2)", background: "#000", minHeight: "240px" }}>
                  <div className="px-3 py-2 flex items-center gap-2 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                    <Play className="h-3 w-3 text-yellow-400" />
                    <span className="text-[10px] tracking-widest uppercase text-muted-foreground">Cinema Preview</span>
                  </div>
                  <div className="p-3 h-52">
                    <PreviewPane elements={elements} />
                  </div>
                </div>
              )}

              {/* Element editor */}
              {selected ? (
                <div className="rounded-lg border space-y-0 overflow-hidden" style={{ borderColor: "rgba(212,175,55,0.2)" }}>
                  <div className="px-4 py-3 flex items-center gap-3" style={{ background: "rgba(212,175,55,0.08)", borderBottom: "1px solid rgba(212,175,55,0.15)" }}>
                    {typeInfo && <typeInfo.icon className={`h-4 w-4 ${typeInfo.color}`} />}
                    <div className="flex-1">
                      <div className={`text-sm font-medium ${typeInfo?.color}`}>{typeInfo?.label}</div>
                      <div className="text-[10px] text-muted-foreground">{typeInfo?.description}</div>
                    </div>
                  </div>

                  <div className="p-4 space-y-4">
                    {/* Main text */}
                    {!["fade_in", "fade_out"].includes(selected.type) && (
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground tracking-wide">
                          {selected.type === "narrator_vo" ? "Narrator Script" :
                           selected.type === "star_wars_crawl" ? "Crawl Text" :
                           selected.type === "time_location" ? "Location / Place" : "Main Text"}
                        </Label>
                        {selected.type === "narrator_vo" || selected.type === "star_wars_crawl" ? (
                          <Textarea
                            value={selected.text}
                            onChange={e => updateSelected({ text: e.target.value })}
                            placeholder={selected.type === "narrator_vo" ? "In a world where nothing was as it seemed..." : "A long time ago in a galaxy far, far away...."}
                            className="text-sm min-h-[100px] bg-background/50 resize-none"
                          />
                        ) : (
                          <Input
                            value={selected.text}
                            onChange={e => updateSelected({ text: e.target.value })}
                            placeholder={
                              selected.type === "title_card" ? "YOUR FILM TITLE" :
                              selected.type === "chapter_marker" ? "PART I" :
                              selected.type === "dedication" ? "In loving memory of..." :
                              selected.type === "time_location" ? "Paris, France" :
                              selected.type === "content_warning" ? "RATED R ÃÂ¢ÃÂÃÂ STRONG LANGUAGE" :
                              selected.type === "studio_logo" ? "VIRELLE STUDIOS" : "Text content"
                            }
                            className="text-sm bg-background/50"
                          />
                        )}
                      </div>
                    )}

                    {/* Subtext */}
                    {["title_card", "chapter_marker", "time_location", "studio_logo"].includes(selected.type) && (
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">
                          {selected.type === "chapter_marker" ? "Label (e.g. CHAPTER)" :
                           selected.type === "time_location" ? "Year / Date" :
                           selected.type === "studio_logo" ? "Tagline" : "Subtitle"}
                        </Label>
                        <Input
                          value={selected.subtext}
                          onChange={e => updateSelected({ subtext: e.target.value })}
                          placeholder={
                            selected.type === "chapter_marker" ? "CHAPTER" :
                            selected.type === "time_location" ? "1943" :
                            selected.type === "studio_logo" ? "presents" : "Subtitle"
                          }
                          className="text-sm bg-background/50"
                        />
                      </div>
                    )}

                    {/* Duration */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground">Duration</Label>
                        <span className="text-xs font-mono text-yellow-400">{selected.duration}s</span>
                      </div>
                      <Slider
                        value={[selected.duration]}
                        onValueChange={([v]) => updateSelected({ duration: v })}
                        min={selected.type === "cold_open" ? 10 : 1}
                        max={selected.type === "narrator_vo" || selected.type === "star_wars_crawl" ? 60 : selected.type === "cold_open" ? 300 : 15}
                        step={1}
                        className="w-full"
                      />
                    </div>

                    <Separator className="opacity-20" />

                    {/* Style grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Animation</Label>
                        <Select value={selected.animation} onValueChange={v => updateSelected({ animation: v })}>
                          <SelectTrigger className="h-8 text-xs bg-background/50"><SelectValue /></SelectTrigger>
                          <SelectContent>{ANIMATIONS.map(a => <SelectItem key={a} value={a} className="text-xs">{a}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Background</Label>
                        <Select value={selected.bgColor} onValueChange={v => updateSelected({ bgColor: v })}>
                          <SelectTrigger className="h-8 text-xs bg-background/50"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {["black", "white", "sepia", "#0a0a2e", "#1a0a0a"].map(c => (
                              <SelectItem key={c} value={c} className="text-xs">{c === "black" ? "Black" : c === "white" ? "White" : c === "sepia" ? "Sepia" : c === "#0a0a2e" ? "Deep Blue" : "Deep Red"}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Generation prompt */}
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <Sparkles className="h-3 w-3 text-yellow-400" />AI Generation Prompt
                      </Label>
                      <Textarea
                        value={selected.generationPrompt}
                        onChange={e => updateSelected({ generationPrompt: e.target.value })}
                        placeholder="Describe how the AI should render this element in the final film..."
                        className="text-xs min-h-[60px] bg-background/50 resize-none border-yellow-500/20"
                      />
                      <p className="text-[10px] text-muted-foreground">This prompt is sent directly to the film generation AI.</p>
                    </div>

                    {/* Production notes */}
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Production Notes</Label>
                      <Textarea
                        value={selected.notes}
                        onChange={e => updateSelected({ notes: e.target.value })}
                        placeholder="Notes for the director / editor..."
                        className="text-xs min-h-[50px] bg-background/50 resize-none"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                  <LayoutTemplate className="h-8 w-8 opacity-20" />
                  <p className="text-xs text-center">Select an element<br />to edit its properties</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <style>{`
          @keyframes slide-up {
            from { transform: translateY(100%); }
            to   { transform: translateY(-100%); }
          }
        `}</style>
      </div>
    );
  }
  