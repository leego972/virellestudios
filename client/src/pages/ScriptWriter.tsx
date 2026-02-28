import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  Bold,
  Download,
  FileText,
  Loader2,
  MessageSquare,
  Pencil,
  Plus,
  Save,
  Sparkles,
  Trash2,
  Type,
  Wand2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";

// Screenplay element types
type ElementType = "scene-heading" | "action" | "character" | "dialogue" | "parenthetical" | "transition";

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
  "scene-heading": "INT./EXT.",
  action: "Action description",
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

function parseScriptToElements(content: string): ScriptElement[] {
  if (!content || content.trim() === "") return [{ id: crypto.randomUUID(), type: "scene-heading", text: "" }];

  const lines = content.split("\n");
  const elements: ScriptElement[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) { i++; continue; }

    if (/^(INT\.|EXT\.|INT\.\/EXT\.|I\/E\.)/.test(line)) {
      elements.push({ id: crypto.randomUUID(), type: "scene-heading", text: line });
    } else if (/^(FADE IN:|FADE OUT\.|CUT TO:|DISSOLVE TO:|SMASH CUT TO:|MATCH CUT TO:|JUMP CUT TO:|FADE TO BLACK\.)/.test(line)) {
      elements.push({ id: crypto.randomUUID(), type: "transition", text: line });
    } else if (/^\(.*\)$/.test(line)) {
      elements.push({ id: crypto.randomUUID(), type: "parenthetical", text: line });
    } else if (line === line.toUpperCase() && line.length > 1 && line.length < 50 && !/[.!?]$/.test(line)) {
      elements.push({ id: crypto.randomUUID(), type: "character", text: line });
    } else if (elements.length > 0 && (elements[elements.length - 1].type === "character" || elements[elements.length - 1].type === "parenthetical")) {
      elements.push({ id: crypto.randomUUID(), type: "dialogue", text: line });
    } else {
      elements.push({ id: crypto.randomUUID(), type: "action", text: line });
    }
    i++;
  }

  if (elements.length === 0) {
    elements.push({ id: crypto.randomUUID(), type: "scene-heading", text: "" });
  }

  return elements;
}

function elementsToScript(elements: ScriptElement[]): string {
  return elements.map((el) => {
    switch (el.type) {
      case "scene-heading": return `\n${el.text}\n`;
      case "action": return `${el.text}`;
      case "character": return `\n${el.text}`;
      case "dialogue": return `${el.text}`;
      case "parenthetical": return `${el.text}`;
      case "transition": return `\n${el.text}\n`;
      default: return el.text;
    }
  }).join("\n").trim();
}

export default function ScriptWriter() {
  const { projectId, scriptId } = useParams<{ projectId: string; scriptId?: string }>();
  const [, navigate] = useLocation();
  const { user, loading } = useAuth();
  const pid = parseInt(projectId || "0");

  // Auth guard — redirect to login if not authenticated
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

  const [elements, setElements] = useState<ScriptElement[]>([
    { id: crypto.randomUUID(), type: "scene-heading", text: "" },
  ]);
  const [title, setTitle] = useState("Untitled Script");
  const [activeElementId, setActiveElementId] = useState<string | null>(null);
  const [currentType, setCurrentType] = useState<ElementType>("scene-heading");
  const [isDirty, setIsDirty] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      updateMutation.mutate({
        id: parseInt(scriptId),
        title,
        content,
        pageCount,
      });
    } else {
      createMutation.mutate({
        projectId: pid,
        title,
        content,
      });
    }
  }, [elements, title, scriptId, pid]);

  // Auto-save after 3 seconds of inactivity
  useEffect(() => {
    if (!isDirty) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      if (scriptId && scriptId !== "new") {
        handleSave();
      }
    }, 3000);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [isDirty, elements, title]);

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
    setTimeout(() => {
      textareaRefs.current[newEl.id]?.focus();
    }, 50);
  };

  const removeElement = (id: string) => {
    if (elements.length <= 1) return;
    setElements((prev) => prev.filter((el) => el.id !== id));
    setIsDirty(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent, element: ScriptElement) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      // Smart next element type
      let nextType: ElementType = "action";
      if (element.type === "scene-heading") nextType = "action";
      else if (element.type === "action") nextType = "character";
      else if (element.type === "character") nextType = "dialogue";
      else if (element.type === "dialogue") nextType = "action";
      else if (element.type === "parenthetical") nextType = "dialogue";
      else if (element.type === "transition") nextType = "scene-heading";

      setCurrentType(nextType);
      addElement(element.id, nextType);
    } else if (e.key === "Backspace" && element.text === "" && elements.length > 1) {
      e.preventDefault();
      const idx = elements.findIndex((el) => el.id === element.id);
      removeElement(element.id);
      if (idx > 0) {
        const prevId = elements[idx - 1].id;
        setTimeout(() => textareaRefs.current[prevId]?.focus(), 50);
      }
    } else if (e.key === "Tab") {
      e.preventDefault();
      // Cycle through element types
      const types: ElementType[] = ["scene-heading", "action", "character", "dialogue", "parenthetical", "transition"];
      const currentIdx = types.indexOf(element.type);
      const nextIdx = e.shiftKey ? (currentIdx - 1 + types.length) % types.length : (currentIdx + 1) % types.length;
      changeElementType(element.id, types[nextIdx]);
      setCurrentType(types[nextIdx]);
    }
  };

  const handleAiGenerate = () => {
    setAiLoading(true);
    aiGenerateMutation.mutate(
      { projectId: pid },
      { onSettled: () => setAiLoading(false) }
    );
  };

  const handleAiAssist = (action: "continue" | "rewrite" | "dialogue" | "action-line" | "transition") => {
    if (!scriptId || scriptId === "new") {
      toast.error("Save the script first");
      return;
    }
    setAiLoading(true);
    const selectedEl = activeElementId ? elements.find((el) => el.id === activeElementId) : null;
    aiAssistMutation.mutate(
      {
        scriptId: parseInt(scriptId),
        action,
        selectedText: selectedEl?.text || undefined,
      },
      {
        onSuccess: (data) => {
          if (data.text && activeElementId) {
            // Insert AI text as new elements after current
            const newElements = parseScriptToElements(data.text);
            setElements((prev) => {
              const idx = prev.findIndex((el) => el.id === activeElementId);
              const next = [...prev];
              next.splice(idx + 1, 0, ...newElements);
              return next;
            });
            setIsDirty(true);
            toast.success("AI content added");
          }
        },
        onSettled: () => setAiLoading(false),
      }
    );
  };

  const handleExport = () => {
    const content = elementsToScript(elements);
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/[^a-zA-Z0-9]/g, "_")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Script exported");
  };

  const autoResizeTextarea = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = "auto";
    textarea.style.height = textarea.scrollHeight + "px";
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 flex-wrap">
          <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-9 sm:w-9 shrink-0" onClick={() => navigate(`/projects/${pid}`)}>
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
              <span className="text-xs text-muted-foreground mr-2">Unsaved changes</span>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
                  {(createMutation.isPending || updateMutation.isPending) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Save (auto-saves after 3s)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={handleExport}>
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Export as text</TooltipContent>
            </Tooltip>

            {scriptId && scriptId !== "new" && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate({ id: parseInt(scriptId) })}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete script</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Formatting toolbar */}
        <div className="flex items-center gap-1 px-4 py-1.5 border-t border-border/50 overflow-x-auto">
          <span className="text-xs text-muted-foreground mr-2 shrink-0">Element:</span>
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

          <Separator orientation="vertical" className="h-5 mx-2" />

          <span className="text-xs text-muted-foreground mr-2 shrink-0">AI:</span>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" className="text-xs h-7 shrink-0" onClick={handleAiGenerate} disabled={aiLoading}>
                {aiLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
                Generate Full Script
              </Button>
            </TooltipTrigger>
            <TooltipContent>AI generates a complete screenplay from your project details</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="text-xs h-7 shrink-0" onClick={() => handleAiAssist("continue")} disabled={aiLoading}>
                <Wand2 className="h-3 w-3 mr-1" /> Continue
              </Button>
            </TooltipTrigger>
            <TooltipContent>AI continues writing from current position</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="text-xs h-7 shrink-0" onClick={() => handleAiAssist("rewrite")} disabled={aiLoading}>
                <Pencil className="h-3 w-3 mr-1" /> Rewrite
              </Button>
            </TooltipTrigger>
            <TooltipContent>AI rewrites the selected element</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="text-xs h-7 shrink-0" onClick={() => handleAiAssist("dialogue")} disabled={aiLoading}>
                <MessageSquare className="h-3 w-3 mr-1" /> Dialogue
              </Button>
            </TooltipTrigger>
            <TooltipContent>AI generates dialogue</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <div className="flex">
        {/* Script list sidebar */}
        <div className="w-56 shrink-0 border-r border-border p-3 hidden lg:block">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-muted-foreground">Scripts</h3>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => navigate(`/projects/${pid}/script/new`)}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          <div className="space-y-1">
            {scripts?.map((s) => (
              <button
                key={s.id}
                onClick={() => navigate(`/projects/${pid}/script/${s.id}`)}
                className={`w-full text-left px-2 py-1.5 rounded text-sm truncate transition-colors ${
                  scriptId === String(s.id) ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/50"
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
                    className={`group relative ${activeElementId === element.id ? "ring-1 ring-primary/30 rounded" : ""}`}
                  >
                    {/* Element type indicator */}
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
                            <SelectItem key={t} value={t} className="text-xs">{ELEMENT_LABELS[t]}</SelectItem>
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

            {/* Page info */}
            <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground px-2">
              <span>{elements.length} elements</span>
              <span>~{Math.max(1, Math.round(elementsToScript(elements).length / 3000))} pages</span>
              <span className="flex items-center gap-1">
                <Type className="h-3 w-3" />
                Tab to cycle element types | Enter for next line
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
