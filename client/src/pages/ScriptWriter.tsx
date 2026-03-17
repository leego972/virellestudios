import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { SCRIPT_TEMPLATES, buildBeatSheetPrompt, type ScriptTemplate } from "@shared/scriptTemplates";
import {
  ArrowLeft,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  FileText,
  FilePlus,
  Loader2,
  MessageSquare,
  Pencil,
  Plus,
  Save,
  Sparkles,
  Star,
  Trash2,
  Type,
  Upload,
  Wand2,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";

// ─── Screenplay element types ─────────────────────────────────────────────────

type ElementType =
  | "scene-heading"
  | "action"
  | "character"
  | "dialogue"
  | "parenthetical"
  | "transition";

interface ScriptElement {
  id: string;
  type: ElementType;
  text: string;
}

const ELEMENT_LABELS: Record<ElementType, string> = {
  "scene-heading": "Scene Heading",
  action: "Action",
  character: "Character",
  dialogue: "Dialogue",
  parenthetical: "Parenthetical",
  transition: "Transition",
};

const ELEMENT_SHORTCUTS: Record<ElementType, string> = {
  "scene-heading": "INT./EXT. LOCATION - DAY",
  action: "Action description...",
  character: "CHARACTER NAME",
  dialogue: "Dialogue text...",
  parenthetical: "(direction)",
  transition: "CUT TO:",
};

const ELEMENT_STYLES: Record<ElementType, string> = {
  "scene-heading": "font-bold uppercase tracking-wide",
  action: "",
  character: "uppercase text-center",
  dialogue: "mx-auto max-w-[70%] text-center",
  parenthetical: "mx-auto max-w-[50%] text-center italic text-muted-foreground",
  transition: "text-right uppercase",
};

// ─── AI Assist button definitions ────────────────────────────────────────────

type AssistAction =
  | "continue"
  | "rewrite"
  | "dialogue"
  | "action-line"
  | "transition"
  | "scene-expand"
  | "polish"
  | "character-voice"
  | "scene-beat";

interface AssistButton {
  action: AssistAction;
  label: string;
  icon: React.ReactNode;
  tooltip: string;
}

const ASSIST_BUTTONS: AssistButton[] = [
  { action: "continue", label: "Continue", icon: <Wand2 className="h-3 w-3 mr-1" />, tooltip: "Write the next 3-4 scenes continuing from current position" },
  { action: "rewrite", label: "Rewrite", icon: <Pencil className="h-3 w-3 mr-1" />, tooltip: "Rewrite the selected element with sharper dialogue and tighter action" },
  { action: "dialogue", label: "Dialogue", icon: <MessageSquare className="h-3 w-3 mr-1" />, tooltip: "Generate a full dialogue exchange with distinct character voices and subtext" },
  { action: "action-line", label: "Action Line", icon: <Zap className="h-3 w-3 mr-1" />, tooltip: "Write cinematic action lines — present tense, active verbs, visual detail" },
  { action: "transition", label: "Transition", icon: <ArrowLeft className="h-3 w-3 mr-1 rotate-180" />, tooltip: "Add a scene transition (CUT TO, SMASH CUT, DISSOLVE, MATCH CUT...)" },
  { action: "scene-expand", label: "Expand Scene", icon: <Plus className="h-3 w-3 mr-1" />, tooltip: "Expand a brief outline into a fully written scene" },
  { action: "polish", label: "Polish", icon: <Star className="h-3 w-3 mr-1" />, tooltip: "Polish to production-ready quality — sharpen dialogue, tighten action, fix format" },
  { action: "character-voice", label: "Character Voice", icon: <Type className="h-3 w-3 mr-1" />, tooltip: "Rewrite dialogue so each character has a distinct, authentic voice" },
  { action: "scene-beat", label: "Scene Beat", icon: <BookOpen className="h-3 w-3 mr-1" />, tooltip: "Break down a scene into beats, then write the full scene from them" },
];

// ─── Parsing utilities ────────────────────────────────────────────────────────

function parseScriptToElements(content: string): ScriptElement[] {
  if (!content || content.trim() === "")
    return [{ id: crypto.randomUUID(), type: "scene-heading", text: "" }];

  const lines = content.split("\n");
  const elements: ScriptElement[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (/^(INT\.|EXT\.|INT\.\/EXT\.|I\/E\.)/.test(line)) {
      elements.push({ id: crypto.randomUUID(), type: "scene-heading", text: line });
    } else if (
      /^(FADE IN:|FADE OUT\.|CUT TO:|DISSOLVE TO:|SMASH CUT TO:|MATCH CUT TO:|JUMP CUT TO:|FADE TO BLACK\.|INTERCUT WITH:|CONTINUOUS)/.test(line)
    ) {
      elements.push({ id: crypto.randomUUID(), type: "transition", text: line });
    } else if (/^\(.*\)$/.test(line)) {
      elements.push({ id: crypto.randomUUID(), type: "parenthetical", text: line });
    } else if (
      line === line.toUpperCase() &&
      line.length > 1 &&
      line.length < 50 &&
      !/[.!?]$/.test(line)
    ) {
      elements.push({ id: crypto.randomUUID(), type: "character", text: line });
    } else if (
      elements.length > 0 &&
      (elements[elements.length - 1].type === "character" ||
        elements[elements.length - 1].type === "parenthetical")
    ) {
      elements.push({ id: crypto.randomUUID(), type: "dialogue", text: line });
    } else {
      elements.push({ id: crypto.randomUUID(), type: "action", text: line });
    }
  }

  if (elements.length === 0)
    elements.push({ id: crypto.randomUUID(), type: "scene-heading", text: "" });

  return elements;
}

function elementsToScript(elements: ScriptElement[]): string {
  return elements
    .map((el) => {
      switch (el.type) {
        case "scene-heading": return `\n${el.text}\n`;
        case "action": return `${el.text}`;
        case "character": return `\n${el.text}`;
        case "dialogue": return `${el.text}`;
        case "parenthetical": return `${el.text}`;
        case "transition": return `\n${el.text}\n`;
        default: return el.text;
      }
    })
    .join("\n")
    .trim();
}

function elementsToFountain(els: ScriptElement[]): string {
  return els
    .map((el) => {
      switch (el.type) {
        case "scene-heading": return `\n.${el.text}\n`;
        case "action": return `${el.text}`;
        case "character": return `\n@${el.text}`;
        case "dialogue": return `${el.text}`;
        case "parenthetical": return `(${el.text.replace(/^\(|\)$/g, "")})`;
        case "transition": return `\n> ${el.text}`;
        default: return el.text;
      }
    })
    .join("\n")
    .trim();
}

function elementsToScreenplayFormat(els: ScriptElement[], title: string, authorName: string): string {
  const lines: string[] = [
    title.toUpperCase(),
    "",
    `Written by ${authorName}`,
    "",
    `${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
    "",
    "=".repeat(60),
    "",
  ];
  for (const el of els) {
    switch (el.type) {
      case "scene-heading":
        lines.push("", el.text.toUpperCase(), "");
        break;
      case "action":
        lines.push(el.text);
        break;
      case "character":
        lines.push("", " ".repeat(20) + el.text.toUpperCase());
        break;
      case "dialogue":
        lines.push(" ".repeat(10) + el.text);
        break;
      case "parenthetical":
        lines.push(" ".repeat(15) + el.text);
        break;
      case "transition":
        lines.push("", " ".repeat(40) + el.text.toUpperCase(), "");
        break;
    }
  }
  return lines.join("\n");
}

function countWords(elements: ScriptElement[]): number {
  return elements.reduce((acc, el) => acc + el.text.split(/\s+/).filter(Boolean).length, 0);
}

function estimateScreenTime(elements: ScriptElement[]): string {
  // Industry standard: 1 page ≈ 1 minute. ~3000 chars per page.
  const content = elementsToScript(elements);
  const pages = Math.max(1, content.length / 3000);
  const minutes = Math.round(pages);
  if (minutes < 60) return `~${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `~${h}h ${m}m`;
}

// ─── Template Picker Modal ────────────────────────────────────────────────────

function TemplatePicker({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (template: ScriptTemplate, instructions: string) => void;
}) {
  const [selected, setSelected] = useState<ScriptTemplate | null>(null);
  const [instructions, setInstructions] = useState("");
  const [expandedBeat, setExpandedBeat] = useState<string | null>(null);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Hollywood Script Templates
          </DialogTitle>
          <DialogDescription>
            Choose a genre template with a full three-act beat sheet. The AI will use it as the structural backbone for your screenplay.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-2">
          {SCRIPT_TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelected(selected?.id === t.id ? null : t)}
              className={`text-left p-3 rounded-lg border transition-all ${
                selected?.id === t.id
                  ? "border-primary bg-primary/10 ring-1 ring-primary"
                  : "border-border hover:border-primary/50 hover:bg-accent/50"
              }`}
            >
              <div className="font-semibold text-sm">{t.genre}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{t.targetRuntime}</div>
              <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.toneDescription.slice(0, 80)}...</div>
            </button>
          ))}
        </div>

        {selected && (
          <div className="mt-4 space-y-4 border-t border-border pt-4">
            <div>
              <h3 className="font-semibold text-sm mb-1">{selected.genre} — Beat Sheet</h3>
              <p className="text-xs text-muted-foreground mb-3">{selected.toneDescription}</p>

              <div className="space-y-2">
                {selected.acts.map((act) => (
                  <div key={act.number} className="border border-border rounded-lg overflow-hidden">
                    <button
                      className="w-full flex items-center justify-between px-3 py-2 bg-accent/30 hover:bg-accent/50 text-sm font-medium"
                      onClick={() => setExpandedBeat(expandedBeat === `act-${act.number}` ? null : `act-${act.number}`)}
                    >
                      <span>Act {act.number}: {act.title} <span className="text-muted-foreground font-normal">(pp. {act.pageRange})</span></span>
                      {expandedBeat === `act-${act.number}` ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </button>
                    {expandedBeat === `act-${act.number}` && (
                      <div className="px-3 py-2 space-y-2">
                        <p className="text-xs text-muted-foreground">{act.purpose}</p>
                        {act.beats.map((beat) => (
                          <div key={beat.name} className="flex gap-2 text-xs">
                            <Badge variant="outline" className="shrink-0 text-[10px] h-5">{beat.pageRange}</Badge>
                            <div>
                              <span className="font-medium">{beat.name}</span>
                              <span className="text-muted-foreground"> — {beat.description}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-sm mb-1">Character Slots</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {selected.characterSlots.map((cs) => (
                  <div key={cs.role} className="border border-border rounded p-2 text-xs">
                    <div className="font-medium">{cs.role}</div>
                    <div className="text-muted-foreground mt-0.5">{cs.description}</div>
                    <div className="text-muted-foreground mt-0.5 italic">Arc: {cs.arcSummary}</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-sm mb-1">Cinematic References</h3>
              <div className="flex flex-wrap gap-1">
                {selected.cinematicReferences.map((ref) => (
                  <Badge key={ref} variant="secondary" className="text-xs">{ref}</Badge>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Director's Notes (optional)</Label>
              <p className="text-xs text-muted-foreground mb-1.5">
                Add your story's specific details — protagonist name, setting, central conflict, tone notes. The AI will use these alongside the template structure.
              </p>
              <Textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder={`e.g. "Protagonist: MAYA, 30s, forensic accountant. Setting: 1990s Hong Kong. Central conflict: she discovers her firm is laundering money for the Triads. Tone: paranoid, claustrophobic, inspired by The Conversation."`}
                rows={4}
                className="text-sm"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button
                onClick={() => {
                  onSelect(selected, instructions);
                  onClose();
                }}
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Generate with {selected.genre} Template
              </Button>
            </div>
          </div>
        )}

        {!selected && (
          <div className="flex justify-end mt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Import Scene Modal ───────────────────────────────────────────────────────

function ImportSceneModal({
  open,
  onClose,
  onImport,
}: {
  open: boolean;
  onClose: () => void;
  onImport: (text: string, position: "append" | "prepend" | "replace") => void;
}) {
  const [text, setText] = useState("");
  const [position, setPosition] = useState<"append" | "prepend" | "replace">("append");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setText(ev.target?.result as string || "");
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    if (!text.trim()) {
      toast.error("No content to import");
      return;
    }
    onImport(text, position);
    setText("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FilePlus className="h-5 w-5 text-primary" />
            Import External Scene
          </DialogTitle>
          <DialogDescription>
            Import a scene from a .fountain, .txt, or .fdx file — or paste screenplay text directly. The imported content will be parsed and connected to your script.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div>
            <Label className="text-sm font-medium mb-1.5 block">Upload file (.fountain / .txt / .fdx)</Label>
            <div
              className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-accent/30 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Click to upload or drag and drop</p>
              <p className="text-xs text-muted-foreground mt-1">Supports .fountain, .txt, .fdx, .pdf (text)</p>
              <input
                ref={fileRef}
                type="file"
                accept=".fountain,.txt,.fdx,.pdf"
                className="hidden"
                onChange={handleFile}
              />
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or paste directly</span>
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium mb-1.5 block">Paste screenplay text</Label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={`INT. COFFEE SHOP - DAY\n\nMAYA sits alone, watching the door.\n\nMAYA\nHe's late.\n\nCUT TO:`}
              rows={10}
              className="font-mono text-sm"
            />
            {text && (
              <p className="text-xs text-muted-foreground mt-1">
                {text.split("\n").filter(Boolean).length} lines detected
              </p>
            )}
          </div>

          <div>
            <Label className="text-sm font-medium mb-1.5 block">Connect to script</Label>
            <div className="grid grid-cols-3 gap-2">
              {(["append", "prepend", "replace"] as const).map((pos) => (
                <button
                  key={pos}
                  onClick={() => setPosition(pos)}
                  className={`p-3 rounded-lg border text-sm transition-all ${
                    position === pos
                      ? "border-primary bg-primary/10 ring-1 ring-primary"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="font-medium capitalize">{pos}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {pos === "append" && "Add after current content"}
                    {pos === "prepend" && "Add before current content"}
                    {pos === "replace" && "Replace all content"}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleImport} disabled={!text.trim()} className="gap-2">
              <FilePlus className="h-4 w-4" />
              Import Scene
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── AI Assist Instructions Modal ────────────────────────────────────────────

function AssistInstructionsModal({
  open,
  action,
  onClose,
  onConfirm,
}: {
  open: boolean;
  action: AssistAction | null;
  onClose: () => void;
  onConfirm: (action: AssistAction, instructions: string) => void;
}) {
  const [instructions, setInstructions] = useState("");
  const btn = ASSIST_BUTTONS.find((b) => b.action === action);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {btn?.icon}
            {btn?.label}
          </DialogTitle>
          <DialogDescription>{btn?.tooltip}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div>
            <Label className="text-sm font-medium mb-1.5 block">Director's Notes (optional)</Label>
            <Textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Add specific direction for this AI action — character notes, tone, what should happen next, etc."
              rows={3}
              className="text-sm"
              autoFocus
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              onClick={() => {
                if (action) onConfirm(action, instructions);
                setInstructions("");
                onClose();
              }}
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Run {btn?.label}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main ScriptWriter Component ──────────────────────────────────────────────

export default function ScriptWriter() {
  const { projectId, scriptId } = useParams<{ projectId: string; scriptId?: string }>();
  const [, navigate] = useLocation();
  const { user, loading } = useAuth();
  const pid = parseInt(projectId || "0");

  // Editor state
  const [elements, setElements] = useState<ScriptElement[]>([
    { id: crypto.randomUUID(), type: "scene-heading", text: "" },
  ]);
  const [title, setTitle] = useState("Untitled Script");
  const [activeElementId, setActiveElementId] = useState<string | null>(null);
  const [currentType, setCurrentType] = useState<ElementType>("scene-heading");
  const [isDirty, setIsDirty] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  // Modal state
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [assistModalOpen, setAssistModalOpen] = useState(false);
  const [pendingAssistAction, setPendingAssistAction] = useState<AssistAction | null>(null);

  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // tRPC queries
  const { data: project } = trpc.project.get.useQuery({ id: pid }, { enabled: pid > 0 });
  const { data: scripts } = trpc.script.listByProject.useQuery({ projectId: pid }, { enabled: pid > 0 });
  const { data: existingScript } = trpc.script.get.useQuery(
    { id: parseInt(scriptId || "0") },
    { enabled: !!scriptId && scriptId !== "new" }
  );

  const utils = trpc.useUtils();

  const createMutation = trpc.script.create.useMutation({
    onSuccess: (data) => {
      if (data) {
        utils.script.listByProject.invalidate({ projectId: pid });
        navigate(`/projects/${pid}/script/${data.id}`, { replace: true });
        toast.success("Script created");
        setIsDirty(false);
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.script.update.useMutation({
    onSuccess: () => {
      utils.script.listByProject.invalidate({ projectId: pid });
      setIsDirty(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.script.delete.useMutation({
    onSuccess: () => {
      utils.script.listByProject.invalidate({ projectId: pid });
      navigate(`/projects/${pid}/script/new`);
      toast.success("Script deleted");
    },
  });

  const aiGenerateMutation = trpc.script.aiGenerate.useMutation({
    onSuccess: (data) => {
      if (data) {
        utils.script.listByProject.invalidate({ projectId: pid });
        navigate(`/projects/${pid}/script/${data.id}`);
        toast.success("AI screenplay generated");
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const aiAssistMutation = trpc.script.aiAssist.useMutation({
    onError: (err) => toast.error(err.message),
  });

  // Load existing script
  useEffect(() => {
    if (existingScript) {
      setTitle(existingScript.title);
      setElements(parseScriptToElements(existingScript.content || ""));
    }
  }, [existingScript]);

  const handleSave = useCallback(() => {
    const content = elementsToScript(elements);
    const pageCount = Math.max(1, Math.round(content.length / 3000));
    if (scriptId && scriptId !== "new") {
      updateMutation.mutate({ id: parseInt(scriptId), title, content, pageCount });
    } else {
      createMutation.mutate({ projectId: pid, title, content });
    }
  }, [elements, title, scriptId, pid]);

  // Auto-save after 3s inactivity
  useEffect(() => {
    if (!isDirty) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      if (scriptId && scriptId !== "new") handleSave();
    }, 3000);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [isDirty, elements, title]);

  // Auth guard — after all hooks
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Please sign in to access the Script Writer.</p>
        <Button onClick={() => navigate("/")}>Go to Login</Button>
      </div>
    );
  }

  // ─── Element operations ───────────────────────────────────────────────────

  const updateElement = (id: string, text: string) => {
    setElements((prev) => prev.map((el) => (el.id === id ? { ...el, text } : el)));
    setIsDirty(true);
  };

  const changeElementType = (id: string, type: ElementType) => {
    setElements((prev) => prev.map((el) => (el.id === id ? { ...el, type } : el)));
    setIsDirty(true);
  };

  const addElement = (afterId: string, type: ElementType) => {
    const newEl: ScriptElement = { id: crypto.randomUUID(), type, text: "" };
    setElements((prev) => {
      const idx = prev.findIndex((el) => el.id === afterId);
      const next = [...prev];
      next.splice(idx + 1, 0, newEl);
      return next;
    });
    setActiveElementId(newEl.id);
    setIsDirty(true);
    setTimeout(() => textareaRefs.current[newEl.id]?.focus(), 50);
  };

  const removeElement = (id: string) => {
    if (elements.length <= 1) return;
    setElements((prev) => prev.filter((el) => el.id !== id));
    setIsDirty(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent, element: ScriptElement) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const nextTypeMap: Record<ElementType, ElementType> = {
        "scene-heading": "action",
        action: "character",
        character: "dialogue",
        dialogue: "action",
        parenthetical: "dialogue",
        transition: "scene-heading",
      };
      const nextType = nextTypeMap[element.type] ?? "action";
      setCurrentType(nextType);
      addElement(element.id, nextType);
    } else if (e.key === "Tab") {
      e.preventDefault();
      const types: ElementType[] = ["scene-heading", "action", "character", "dialogue", "parenthetical", "transition"];
      const currentIdx = types.indexOf(element.type);
      const nextIdx = e.shiftKey
        ? (currentIdx - 1 + types.length) % types.length
        : (currentIdx + 1) % types.length;
      changeElementType(element.id, types[nextIdx]);
      setCurrentType(types[nextIdx]);
    } else if (e.key === "Backspace" && element.text === "" && elements.length > 1) {
      e.preventDefault();
      const idx = elements.findIndex((el) => el.id === element.id);
      removeElement(element.id);
      if (idx > 0) {
        const prevId = elements[idx - 1].id;
        setTimeout(() => textareaRefs.current[prevId]?.focus(), 50);
      }
    }
  };

  // ─── AI handlers ──────────────────────────────────────────────────────────

  const handleAiGenerateWithTemplate = (template: ScriptTemplate, instructions: string) => {
    setAiLoading(true);
    const beatSheet = buildBeatSheetPrompt(template.id);
    const fullInstructions = [
      beatSheet,
      instructions ? `\n\nDIRECTOR'S NOTES:\n${instructions}` : "",
    ].join("");
    aiGenerateMutation.mutate(
      { projectId: pid, instructions: fullInstructions },
      { onSettled: () => setAiLoading(false) }
    );
  };

  const handleAiGenerateDirect = () => {
    setAiLoading(true);
    aiGenerateMutation.mutate(
      { projectId: pid },
      { onSettled: () => setAiLoading(false) }
    );
  };

  const handleAiAssist = (action: AssistAction, instructions?: string) => {
    if (!scriptId || scriptId === "new") {
      toast.error("Save the script first before using AI assist");
      return;
    }
    setAiLoading(true);
    const selectedEl = activeElementId ? elements.find((el) => el.id === activeElementId) : null;
    aiAssistMutation.mutate(
      {
        scriptId: parseInt(scriptId),
        action,
        selectedText: selectedEl?.text || undefined,
        instructions: instructions || undefined,
      },
      {
        onSuccess: (data) => {
          if (data.text && activeElementId) {
            const newElements = parseScriptToElements(data.text);
            setElements((prev) => {
              const idx = prev.findIndex((el) => el.id === activeElementId);
              const next = [...prev];
              next.splice(idx + 1, 0, ...newElements);
              return next;
            });
            setIsDirty(true);
            toast.success(`${ASSIST_BUTTONS.find((b) => b.action === action)?.label || "AI"} content added`);
          }
        },
        onSettled: () => setAiLoading(false),
      }
    );
  };

  const openAssistModal = (action: AssistAction) => {
    setPendingAssistAction(action);
    setAssistModalOpen(true);
  };

  // ─── Import handler ───────────────────────────────────────────────────────

  const handleImport = (text: string, position: "append" | "prepend" | "replace") => {
    const imported = parseScriptToElements(text);
    if (position === "replace") {
      setElements(imported);
    } else if (position === "prepend") {
      setElements((prev) => [...imported, ...prev]);
    } else {
      setElements((prev) => [...prev, ...imported]);
    }
    setIsDirty(true);
    toast.success(`${imported.length} elements imported and connected`);
  };

  // ─── Export handler ───────────────────────────────────────────────────────

  const handleExport = (format: "txt" | "fountain" | "screenplay") => {
    const safeName = title.replace(/[^a-zA-Z0-9]/g, "_");
    let content: string;
    let ext: string;
    switch (format) {
      case "fountain":
        content = elementsToFountain(elements);
        ext = "fountain";
        break;
      case "screenplay":
        content = elementsToScreenplayFormat(elements, title, user?.name || "Director");
        ext = "txt";
        break;
      default:
        content = elementsToScript(elements);
        ext = "txt";
    }
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safeName}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported as .${ext}`);
  };

  const autoResizeTextarea = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = "auto";
    textarea.style.height = textarea.scrollHeight + "px";
  };

  // ─── Stats ────────────────────────────────────────────────────────────────

  const wordCount = countWords(elements);
  const pageCount = Math.max(1, Math.round(elementsToScript(elements).length / 3000));
  const screenTime = estimateScreenTime(elements);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      {/* Modals */}
      <TemplatePicker
        open={templatePickerOpen}
        onClose={() => setTemplatePickerOpen(false)}
        onSelect={handleAiGenerateWithTemplate}
      />
      <ImportSceneModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImport={handleImport}
      />
      <AssistInstructionsModal
        open={assistModalOpen}
        action={pendingAssistAction}
        onClose={() => { setAssistModalOpen(false); setPendingAssistAction(null); }}
        onConfirm={(action, instructions) => handleAiAssist(action, instructions)}
      />

      {/* Top bar */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 flex-wrap">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 sm:h-9 sm:w-9 shrink-0"
            onClick={() => navigate(`/projects/${pid}`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <Input
            value={title}
            onChange={(e) => { setTitle(e.target.value); setIsDirty(true); }}
            className="max-w-[200px] sm:max-w-xs bg-transparent border-none text-base sm:text-lg font-semibold focus-visible:ring-0 px-2 flex-1 min-w-0"
            placeholder="Script title..."
          />

          <div className="flex items-center gap-1 ml-auto shrink-0">
            {isDirty && (
              <span className="text-xs text-muted-foreground mr-2 hidden sm:inline">Unsaved changes</span>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleSave}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {(createMutation.isPending || updateMutation.isPending) ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Save (auto-saves after 3s)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setImportModalOpen(true)}
                >
                  <FilePlus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Import external scene (.fountain / .txt / paste)</TooltipContent>
            </Tooltip>

            <Select onValueChange={(v) => handleExport(v as "txt" | "fountain" | "screenplay")}>
              <SelectTrigger className="w-auto h-8 px-2 gap-1 border-none bg-transparent hover:bg-accent">
                <Download className="h-4 w-4" />
                <span className="text-xs hidden sm:inline">Export</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="txt">Plain Text (.txt)</SelectItem>
                <SelectItem value="fountain">Fountain (.fountain)</SelectItem>
                <SelectItem value="screenplay">Screenplay Format (.txt)</SelectItem>
              </SelectContent>
            </Select>

            {scriptId && scriptId !== "new" && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMutation.mutate({ id: parseInt(scriptId) })}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete script</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Formatting + AI toolbar */}
        <div className="flex items-center gap-1 px-4 py-1.5 border-t border-border/50 overflow-x-auto scrollbar-none">
          {/* Element type buttons */}
          <span className="text-xs text-muted-foreground mr-1 shrink-0">Element:</span>
          {(Object.keys(ELEMENT_LABELS) as ElementType[]).map((type) => (
            <Button
              key={type}
              variant={currentType === type ? "default" : "ghost"}
              size="sm"
              className="text-xs h-7 shrink-0"
              onClick={() => {
                setCurrentType(type);
                if (activeElementId) changeElementType(activeElementId, type);
              }}
            >
              {ELEMENT_LABELS[type]}
            </Button>
          ))}

          <Separator orientation="vertical" className="h-5 mx-2 shrink-0" />

          {/* AI section */}
          <span className="text-xs text-muted-foreground mr-1 shrink-0">AI:</span>

          {/* Template generate */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7 shrink-0 border-primary/40 text-primary hover:bg-primary/10"
                onClick={() => setTemplatePickerOpen(true)}
                disabled={aiLoading}
              >
                {aiLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <BookOpen className="h-3 w-3 mr-1" />
                )}
                Template
              </Button>
            </TooltipTrigger>
            <TooltipContent>Generate from a Hollywood genre template with full beat sheet</TooltipContent>
          </Tooltip>

          {/* Quick generate */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7 shrink-0"
                onClick={handleAiGenerateDirect}
                disabled={aiLoading}
              >
                {aiLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <Sparkles className="h-3 w-3 mr-1" />
                )}
                Generate
              </Button>
            </TooltipTrigger>
            <TooltipContent>AI generates a complete screenplay from your project details</TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="h-5 mx-1 shrink-0" />

          {/* All 9 AI assist buttons */}
          {ASSIST_BUTTONS.map((btn) => (
            <Tooltip key={btn.action}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 shrink-0"
                  onClick={() => openAssistModal(btn.action)}
                  disabled={aiLoading}
                >
                  {btn.icon}
                  {btn.label}
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-[200px]">{btn.tooltip}</TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>

      <div className="flex">
        {/* Script list sidebar */}
        <div className="w-56 shrink-0 border-r border-border p-3 hidden lg:block">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-muted-foreground">Scripts</h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => navigate(`/projects/${pid}/script/new`)}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          <div className="space-y-1">
            {scripts?.map((s) => (
              <button
                key={s.id}
                onClick={() => navigate(`/projects/${pid}/script/${s.id}`)}
                className={`w-full text-left px-2 py-1.5 rounded text-sm truncate transition-colors ${
                  scriptId === String(s.id)
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/50"
                }`}
              >
                <FileText className="h-3 w-3 inline mr-1.5" />
                {s.title}
              </button>
            ))}
            {(!scripts || scripts.length === 0) && (
              <p className="text-xs text-muted-foreground px-2">No scripts yet</p>
            )}
          </div>
        </div>

        {/* Main editor — screenplay page */}
        <div className="flex-1 flex justify-center py-8 px-4">
          <div className="w-full max-w-[700px]">
            {/* Screenplay page */}
            <Card className="bg-card border border-border shadow-lg min-h-[800px] p-8 md:p-12 font-mono text-sm leading-relaxed">
              {/* Title page header */}
              <div className="text-center mb-8 pb-6 border-b border-border/50">
                <h1 className="text-xl font-bold uppercase tracking-widest">{title || "Untitled"}</h1>
                {project && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {project.genre} | {project.rating} | {project.duration || 90} min
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-0.5">by {user?.name || "Director"}</p>
              </div>

              {/* Script elements */}
              <div className="space-y-1">
                {elements.map((element) => (
                  <div
                    key={element.id}
                    className={`group relative ${
                      activeElementId === element.id ? "ring-1 ring-primary/30 rounded" : ""
                    }`}
                  >
                    {/* Element type indicator (hover) */}
                    <div className="absolute -left-20 top-1 hidden group-hover:flex items-center">
                      <Select
                        value={element.type}
                        onValueChange={(val) => {
                          changeElementType(element.id, val as ElementType);
                          setCurrentType(val as ElementType);
                        }}
                      >
                        <SelectTrigger className="h-6 w-16 text-[10px] border-none bg-transparent">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(ELEMENT_LABELS) as ElementType[]).map((t) => (
                            <SelectItem key={t} value={t} className="text-xs">
                              {ELEMENT_LABELS[t]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <textarea
                      ref={(el) => {
                        textareaRefs.current[element.id] = el;
                        if (el) autoResizeTextarea(el);
                      }}
                      value={element.text}
                      onChange={(e) => {
                        updateElement(element.id, e.target.value);
                        autoResizeTextarea(e.target);
                      }}
                      onFocus={() => {
                        setActiveElementId(element.id);
                        setCurrentType(element.type);
                      }}
                      onKeyDown={(e) => handleKeyDown(e, element)}
                      placeholder={ELEMENT_SHORTCUTS[element.type]}
                      rows={1}
                      className={`w-full bg-transparent border-none resize-none focus:outline-none focus:ring-0 py-0.5 px-1 placeholder:text-muted-foreground/30 ${ELEMENT_STYLES[element.type]}`}
                      style={{ overflow: "hidden" }}
                      inputMode="text"
                      autoCapitalize="sentences"
                      autoCorrect="on"
                      enterKeyHint="done"
                    />
                  </div>
                ))}
              </div>

              {/* Add element button */}
              <div className="mt-4 flex justify-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground"
                  onClick={() => {
                    const lastId = elements[elements.length - 1]?.id;
                    if (lastId) addElement(lastId, currentType);
                  }}
                >
                  <Plus className="h-3 w-3 mr-1" /> Add element
                </Button>
              </div>
            </Card>

            {/* Footer stats */}
            <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground px-2 flex-wrap gap-2">
              <span>{elements.length} elements · {wordCount.toLocaleString()} words</span>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  {pageCount} {pageCount === 1 ? "page" : "pages"}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {screenTime}
                </span>
              </div>
              <span className="flex items-center gap-1">
                <Type className="h-3 w-3" />
                Tab cycles type · Enter next line
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
