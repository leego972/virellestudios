import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Plus, Trash2, Sparkles, MessageSquare, User, Loader2, Wand2 } from "lucide-react";
import { useState, useMemo } from "react";
import { useLocation, useParams } from "wouter";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";

const EMOTIONS = [
  "neutral", "happy", "sad", "angry", "fearful", "surprised", "disgusted",
  "contemptuous", "excited", "nervous", "whisper", "shouting", "sarcastic",
  "pleading", "confident", "confused", "loving", "bitter", "resigned", "hopeful",
];

export default function DialogueEditor() {
  const { user, loading: authLoading } = useAuth();
  const params = useParams<{ projectId: string }>();
  const projectId = parseInt(params.projectId || "0");
  const [, navigate] = useLocation();
  const [selectedSceneId, setSelectedSceneId] = useState<number | undefined>(undefined);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showAiSuggest, setShowAiSuggest] = useState(false);
  const [showAiScene, setShowAiScene] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form state
  const [characterName, setCharacterName] = useState("");
  const [line, setLine] = useState("");
  const [emotion, setEmotion] = useState("neutral");
  const [direction, setDirection] = useState("");

  // AI suggest state
  const [aiCharName, setAiCharName] = useState("");
  const [aiCharDesc, setAiCharDesc] = useState("");
  const [aiEmotion, setAiEmotion] = useState("");
  const [aiDirection, setAiDirection] = useState("");
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-muted-foreground" /></div>;
  if (!user) { window.location.href = getLoginUrl(); return null; }

  const project = trpc.project.get.useQuery({ id: projectId });
  const scenes = trpc.scene.listByProject.useQuery({ projectId });
  const characters = trpc.character.listByProject.useQuery({ projectId });
  const dialogues = trpc.dialogue.list.useQuery({ projectId, sceneId: selectedSceneId });
  const utils = trpc.useUtils();

  const createMutation = trpc.dialogue.create.useMutation({
    onSuccess: () => { utils.dialogue.list.invalidate(); setShowAddDialog(false); resetForm(); toast.success("Dialogue line added"); },
  });
  const updateMutation = trpc.dialogue.update.useMutation({
    onSuccess: () => { utils.dialogue.list.invalidate(); setEditingId(null); toast.success("Line updated"); },
  });
  const deleteMutation = trpc.dialogue.delete.useMutation({
    onSuccess: () => { utils.dialogue.list.invalidate(); toast.success("Line deleted"); },
  });
  const aiSuggestMutation = trpc.dialogue.aiSuggest.useMutation({
    onSuccess: (data) => { setAiSuggestions(data.lines || []); },
    onError: () => toast.error("AI suggestion failed"),
  });
  const aiSceneMutation = trpc.dialogue.aiGenerateScene.useMutation({
    onSuccess: async (data) => {
      if (data.dialogues) {
        for (let i = 0; i < data.dialogues.length; i++) {
          const d = data.dialogues[i];
          await createMutation.mutateAsync({
            projectId,
            sceneId: selectedSceneId,
            characterName: d.characterName,
            line: d.line,
            emotion: d.emotion,
            direction: d.direction,
            orderIndex: (dialogues.data?.length || 0) + i,
          });
        }
        toast.success(`Generated ${data.dialogues.length} dialogue lines`);
        setShowAiScene(false);
      }
    },
    onError: () => toast.error("AI scene generation failed"),
  });

  function resetForm() {
    setCharacterName(""); setLine(""); setEmotion("neutral"); setDirection("");
  }

  const dialogueList = dialogues.data || [];
  const sceneList = scenes.data || [];
  const charList = characters.data || [];

  // Group dialogues by character for the conversation view
  const conversationView = dialogueList.sort((a, b) => a.orderIndex - b.orderIndex);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/40 bg-card/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-9 sm:w-9 shrink-0" onClick={() => navigate(`/projects/${projectId}`)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-semibold truncate">Dialogue Editor</h1>
              <p className="text-sm text-muted-foreground truncate">{project.data?.title || "Loading..."}</p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            {selectedSceneId && (
              <Button variant="outline" size="sm" onClick={() => setShowAiScene(true)} disabled={aiSceneMutation.isPending}>
                <Wand2 className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">{aiSceneMutation.isPending ? "Generating..." : "AI Generate"}</span>
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setShowAiSuggest(true)}>
              <Sparkles className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">AI Suggest</span>
            </Button>
            <Button size="sm" onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Add Line</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 sm:gap-6">
          {/* Scene Sidebar */}
          <div className="sm:col-span-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Scenes</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-16rem)]">
                  <button
                    onClick={() => setSelectedSceneId(undefined)}
                    className={`w-full text-left px-4 py-3 text-sm border-b border-border/30 hover:bg-accent/50 transition-colors ${
                      !selectedSceneId ? "bg-accent text-accent-foreground" : ""
                    }`}
                  >
                    All Scenes
                  </button>
                  {sceneList.map((scene: any) => (
                    <button
                      key={scene.id}
                      onClick={() => setSelectedSceneId(scene.id)}
                      className={`w-full text-left px-4 py-3 text-sm border-b border-border/30 hover:bg-accent/50 transition-colors ${
                        selectedSceneId === scene.id ? "bg-accent text-accent-foreground" : ""
                      }`}
                    >
                      <div className="font-medium">{scene.title || `Scene ${scene.orderIndex + 1}`}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{scene.timeOfDay} · {scene.mood || "neutral"}</div>
                    </button>
                  ))}
                  {sceneList.length === 0 && (
                    <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                      No scenes yet. Create scenes in the Scene Editor first.
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Dialogue Conversation View */}
          <div className="sm:col-span-9">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    {selectedSceneId ? `Scene Dialogue` : "All Dialogue"} ({conversationView.length} lines)
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[calc(100vh-18rem)]">
                  {conversationView.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-30" />
                      <p className="text-sm">No dialogue lines yet.</p>
                      <p className="text-xs mt-1">Add lines manually or use AI to generate scene dialogue.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {conversationView.map((d) => (
                        <div key={d.id} className="group relative">
                          {editingId === d.id ? (
                            <EditDialogueLine
                              dialogue={d}
                              onSave={(data) => updateMutation.mutate({ id: d.id, ...data })}
                              onCancel={() => setEditingId(null)}
                            />
                          ) : (
                            <div
                              className="flex gap-4 p-4 rounded-lg border border-border/30 hover:border-border/60 transition-colors cursor-pointer"
                              onClick={() => setEditingId(d.id)}
                            >
                              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="h-4 w-4 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-semibold text-sm">{d.characterName}</span>
                                  {d.emotion && d.emotion !== "neutral" && (
                                    <Badge variant="outline" className="text-xs">{d.emotion}</Badge>
                                  )}
                                </div>
                                {d.direction && (
                                  <p className="text-xs text-muted-foreground italic mb-1">({d.direction})</p>
                                )}
                                <p className="text-sm">{d.line}</p>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                                onClick={(e) => { e.stopPropagation(); deleteMutation.mutate({ id: d.id }); }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Add Dialogue Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Dialogue Line</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Character</Label>
              {charList.length > 0 ? (
                <Select value={characterName} onValueChange={setCharacterName}>
                  <SelectTrigger><SelectValue placeholder="Select character" /></SelectTrigger>
                  <SelectContent>
                    {charList.map((c) => (
                      <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                    ))}
                    <SelectItem value="__custom__">Custom name...</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Input value={characterName} onChange={(e) => setCharacterName(e.target.value)} placeholder="Character name" />
              )}
              {characterName === "__custom__" && (
                <Input className="mt-2" value="" onChange={(e) => setCharacterName(e.target.value)} placeholder="Enter character name" />
              )}
            </div>
            <div>
              <Label>Dialogue Line</Label>
              <Textarea value={line} onChange={(e) => setLine(e.target.value)} placeholder="What does the character say?" rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Emotion</Label>
                <Select value={emotion} onValueChange={setEmotion}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EMOTIONS.map((e) => (
                      <SelectItem key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Direction</Label>
                <Input value={direction} onChange={(e) => setDirection(e.target.value)} placeholder="e.g. turns away slowly" />
              </div>
            </div>
            <Button
              className="w-full"
              disabled={!characterName || characterName === "__custom__" || !line || createMutation.isPending}
              onClick={() => createMutation.mutate({
                projectId,
                sceneId: selectedSceneId,
                characterName,
                line,
                emotion,
                direction: direction || undefined,
                orderIndex: dialogueList.length,
              })}
            >
              {createMutation.isPending ? "Adding..." : "Add Line"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Suggest Dialog */}
      <Dialog open={showAiSuggest} onOpenChange={(open) => { setShowAiSuggest(open); if (!open) setAiSuggestions([]); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> AI Dialogue Suggestions</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Character Name</Label>
              {charList.length > 0 ? (
                <Select value={aiCharName} onValueChange={setAiCharName}>
                  <SelectTrigger><SelectValue placeholder="Select character" /></SelectTrigger>
                  <SelectContent>
                    {charList.map((c) => (
                      <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={aiCharName} onChange={(e) => setAiCharName(e.target.value)} placeholder="Character name" />
              )}
            </div>
            <div>
              <Label>Character Description (optional)</Label>
              <Input value={aiCharDesc} onChange={(e) => setAiCharDesc(e.target.value)} placeholder="e.g. tough detective with a soft side" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Emotion</Label>
                <Select value={aiEmotion} onValueChange={setAiEmotion}>
                  <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                  <SelectContent>
                    {EMOTIONS.map((e) => (
                      <SelectItem key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Direction</Label>
                <Input value={aiDirection} onChange={(e) => setAiDirection(e.target.value)} placeholder="e.g. nervous" />
              </div>
            </div>
            <Button
              className="w-full"
              disabled={!aiCharName || aiSuggestMutation.isPending}
              onClick={() => aiSuggestMutation.mutate({
                projectId,
                sceneId: selectedSceneId,
                characterName: aiCharName,
                characterDescription: aiCharDesc || undefined,
                context: dialogueList.slice(-5).map(d => `${d.characterName}: ${d.line}`).join("\n") || undefined,
                emotion: aiEmotion || undefined,
                direction: aiDirection || undefined,
              })}
            >
              {aiSuggestMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...</> : "Generate Suggestions"}
            </Button>

            {aiSuggestions.length > 0 && (
              <div className="space-y-2 mt-4">
                <Label>Suggestions (click to add)</Label>
                {aiSuggestions.map((s, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-lg border border-border/40 hover:border-primary/50 cursor-pointer transition-colors"
                    onClick={() => {
                      createMutation.mutate({
                        projectId,
                        sceneId: selectedSceneId,
                        characterName: aiCharName,
                        line: s.line,
                        emotion: s.emotion,
                        direction: s.direction,
                        orderIndex: dialogueList.length,
                      });
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">{s.emotion}</Badge>
                    </div>
                    <p className="text-sm">{s.line}</p>
                    {s.direction && <p className="text-xs text-muted-foreground italic mt-1">({s.direction})</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Generate Scene Dialogue Dialog */}
      <Dialog open={showAiScene} onOpenChange={setShowAiScene}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Wand2 className="h-5 w-5 text-primary" /> Generate Scene Dialogue</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            AI will generate a complete dialogue sequence for the selected scene based on the film's plot, characters, and scene parameters.
          </p>
          <Button
            className="w-full"
            disabled={!selectedSceneId || aiSceneMutation.isPending}
            onClick={() => aiSceneMutation.mutate({ projectId, sceneId: selectedSceneId! })}
          >
            {aiSceneMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating dialogue...</> : "Generate Full Scene Dialogue"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EditDialogueLine({ dialogue, onSave, onCancel }: {
  dialogue: any;
  onSave: (data: { characterName?: string; line?: string; emotion?: string; direction?: string }) => void;
  onCancel: () => void;
}) {
  const [charName, setCharName] = useState(dialogue.characterName);
  const [lineText, setLineText] = useState(dialogue.line);
  const [emo, setEmo] = useState(dialogue.emotion || "neutral");
  const [dir, setDir] = useState(dialogue.direction || "");

  return (
    <div className="p-4 rounded-lg border-2 border-primary/50 bg-accent/20 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Character</Label>
          <Input value={charName} onChange={(e) => setCharName(e.target.value)} className="h-8 text-sm" />
        </div>
        <div>
          <Label className="text-xs">Emotion</Label>
          <Select value={emo} onValueChange={setEmo}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {EMOTIONS.map((e) => (
                <SelectItem key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label className="text-xs">Line</Label>
        <Textarea value={lineText} onChange={(e) => setLineText(e.target.value)} rows={2} className="text-sm" />
      </div>
      <div>
        <Label className="text-xs">Direction</Label>
        <Input value={dir} onChange={(e) => setDir(e.target.value)} className="h-8 text-sm" placeholder="Acting direction..." />
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
        <Button size="sm" onClick={() => onSave({ characterName: charName, line: lineText, emotion: emo, direction: dir || undefined })}>Save</Button>
      </div>
    </div>
  );
}
