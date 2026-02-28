import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useRoute, useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { Palette, Plus, Trash2, Type, Image, Sparkles, ArrowLeft, Loader2 } from "lucide-react";

const CATEGORIES = ["All", "Colors", "Images", "Typography", "Textures", "References", "Notes"];

export default function MoodBoard() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [, params] = useRoute("/projects/:id/mood-board");
  const [, navigate] = useLocation();
  const projectId = Number(params?.id);

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [itemType, setItemType] = useState<"image" | "color" | "text" | "reference">("text");
  const [text, setText] = useState("");
  const [color, setColor] = useState("#c8a97e");
  const [category, setCategory] = useState("References");
  const [imagePrompt, setImagePrompt] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  const utils = trpc.useUtils();
  const { data: items = [], isLoading } = trpc.moodBoard.listByProject.useQuery(
    { projectId },
    { enabled: !!projectId && isAuthenticated }
  );

  const createMutation = trpc.moodBoard.create.useMutation({
    onSuccess: () => {
      utils.moodBoard.listByProject.invalidate({ projectId });
      setShowAddDialog(false);
      setText(""); setColor("#c8a97e"); setImagePrompt("");
      toast.success("Item added to mood board");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.moodBoard.delete.useMutation({
    onSuccess: () => {
      utils.moodBoard.listByProject.invalidate({ projectId });
      toast.success("Item removed");
    },
  });

  const generateImageMutation = trpc.moodBoard.generateImage.useMutation({
    onSuccess: (data) => {
      createMutation.mutate({
        projectId,
        type: "image",
        imageUrl: data.url,
        text: imagePrompt,
        category: "Images",
      });
    },
    onError: (e) => toast.error(e.message),
  });

  if (authLoading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin h-8 w-8 text-muted-foreground" /></div>;
  if (!isAuthenticated) { window.location.href = getLoginUrl(); return null; }

  const filtered = activeCategory === "All" ? items : items.filter((item: any) => item.category === activeCategory);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="flex items-center gap-2 sm:gap-3 mb-6 sm:mb-8 flex-wrap">
          <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-9 sm:w-9 shrink-0" onClick={() => navigate(`/projects/${projectId}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Mood Board</h1>
            <p className="text-sm text-muted-foreground mt-1 hidden sm:block">Visual inspiration and creative direction for your film</p>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Add Item</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Add to Mood Board</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2">
                <Tabs value={itemType} onValueChange={(v) => setItemType(v as any)}>
                  <TabsList className="w-full">
                    <TabsTrigger value="text" className="flex-1"><Type className="h-3.5 w-3.5 mr-1" /> Note</TabsTrigger>
                    <TabsTrigger value="color" className="flex-1"><Palette className="h-3.5 w-3.5 mr-1" /> Color</TabsTrigger>
                    <TabsTrigger value="image" className="flex-1"><Image className="h-3.5 w-3.5 mr-1" /> AI Image</TabsTrigger>
                    <TabsTrigger value="reference" className="flex-1"><Sparkles className="h-3.5 w-3.5 mr-1" /> Reference</TabsTrigger>
                  </TabsList>

                  <TabsContent value="text" className="space-y-3">
                    <div><Label>Note</Label><Textarea value={text} onChange={e => setText(e.target.value)} placeholder="Style notes, visual direction, typography ideas..." rows={4} /></div>
                    <div><Label>Category</Label>
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{CATEGORIES.filter(c => c !== "All").map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <Button className="w-full" onClick={() => createMutation.mutate({ projectId, type: "text", text, category })} disabled={!text || createMutation.isPending}>Add Note</Button>
                  </TabsContent>

                  <TabsContent value="color" className="space-y-3">
                    <div><Label>Color</Label>
                      <div className="flex gap-3 items-center">
                        <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-16 h-12 rounded border cursor-pointer" />
                        <Input value={color} onChange={e => setColor(e.target.value)} className="flex-1 font-mono" />
                      </div>
                    </div>
                    <div><Label>Description</Label><Input value={text} onChange={e => setText(e.target.value)} placeholder="e.g., Primary accent, warm sunset tone..." /></div>
                    <Button className="w-full" onClick={() => createMutation.mutate({ projectId, type: "color", color, text: text || undefined, category: "Colors" })} disabled={createMutation.isPending}>Add Color</Button>
                  </TabsContent>

                  <TabsContent value="image" className="space-y-3">
                    <div><Label>Describe the image</Label><Textarea value={imagePrompt} onChange={e => setImagePrompt(e.target.value)} placeholder="Moody noir alleyway with rain-slicked streets and neon reflections..." rows={3} /></div>
                    <Button className="w-full" onClick={() => generateImageMutation.mutate({ prompt: imagePrompt })} disabled={!imagePrompt || generateImageMutation.isPending || createMutation.isPending}>
                      {generateImageMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                      Generate & Add
                    </Button>
                  </TabsContent>

                  <TabsContent value="reference" className="space-y-3">
                    <div><Label>Reference URL</Label><Input value={text} onChange={e => setText(e.target.value)} placeholder="https://example.com/reference-image.jpg" /></div>
                    <div><Label>Category</Label>
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{CATEGORIES.filter(c => c !== "All").map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <Button className="w-full" onClick={() => createMutation.mutate({ projectId, type: "reference", imageUrl: text, category })} disabled={!text || createMutation.isPending}>Add Reference</Button>
                  </TabsContent>
                </Tabs>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {CATEGORIES.map(cat => (
            <Button key={cat} variant={activeCategory === cat ? "default" : "outline"} size="sm" onClick={() => setActiveCategory(cat)}>
              {cat}
            </Button>
          ))}
        </div>

        {/* Board Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Palette className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">Empty mood board</h3>
            <p className="text-sm text-muted-foreground/60 mt-1">Add colors, notes, images, and references to set the creative direction</p>
          </div>
        ) : (
          <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
            {filtered.map((item: any) => (
              <Card key={item.id} className="break-inside-avoid group relative overflow-hidden">
                {/* Delete button */}
                <button
                  className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur rounded-full p-1.5"
                  onClick={() => deleteMutation.mutate({ id: item.id })}
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </button>

                {item.type === "color" ? (
                  <div>
                    <div className="h-28 rounded-t-lg" style={{ backgroundColor: item.color || "#888" }} />
                    <CardContent className="pt-3 pb-3">
                      <p className="font-mono text-sm">{item.color}</p>
                      {item.text && <p className="text-xs text-muted-foreground mt-1">{item.text}</p>}
                    </CardContent>
                  </div>
                ) : item.type === "image" || (item.type === "reference" && item.imageUrl) ? (
                  <div>
                    <img src={item.imageUrl} alt="" className="w-full rounded-t-lg" loading="lazy" />
                    {item.text && <CardContent className="pt-3 pb-3"><p className="text-xs text-muted-foreground">{item.text}</p></CardContent>}
                  </div>
                ) : (
                  <CardContent className="pt-4 pb-4">
                    <p className="text-sm whitespace-pre-wrap">{item.text}</p>
                    {item.category && <Badge variant="secondary" className="text-xs mt-2">{item.category}</Badge>}
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
