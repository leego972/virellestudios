import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sparkles,
  Plus,
  Search,
  Flame,
  Cloud,
  Zap,
  Wand2,
  Droplets,
  Monitor,
  Bomb,
  Layers,
  Filter,
  Trash2,
  Pencil,
  Eye,
  X,
} from "lucide-react";
import { useState, useMemo } from "react";
import { useParams } from "wouter";
import { toast } from "sonner";

const CATEGORY_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  explosions: { label: "Explosions & Fire", icon: Flame, color: "text-orange-400 bg-orange-500/10" },
  weather: { label: "Weather", icon: Cloud, color: "text-blue-400 bg-blue-500/10" },
  "sci-fi": { label: "Sci-Fi", icon: Zap, color: "text-cyan-400 bg-cyan-500/10" },
  magic: { label: "Magic & Fantasy", icon: Wand2, color: "text-purple-400 bg-purple-500/10" },
  particles: { label: "Particles & Atmosphere", icon: Sparkles, color: "text-yellow-400 bg-yellow-500/10" },
  water: { label: "Water Effects", icon: Droplets, color: "text-blue-300 bg-blue-400/10" },
  screen: { label: "Screen Effects", icon: Monitor, color: "text-green-400 bg-green-500/10" },
  destruction: { label: "Destruction", icon: Bomb, color: "text-red-400 bg-red-500/10" },
};

type VFXForm = {
  name: string;
  category: string;
  subcategory: string;
  description: string;
  intensity: number;
  duration: string;
  layer: string;
  blendMode: string;
  colorTint: string;
  notes: string;
  tags: string;
};

const emptyForm: VFXForm = {
  name: "",
  category: "",
  subcategory: "",
  description: "",
  intensity: 0.8,
  duration: "",
  layer: "overlay",
  blendMode: "normal",
  colorTint: "",
  notes: "",
  tags: "",
};

export default function VisualEffects() {
  const { id: projectIdStr } = useParams<{ id: string }>();
  const projectId = projectIdStr ? parseInt(projectIdStr) : null;

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [detailEffect, setDetailEffect] = useState<any>(null);
  const [form, setForm] = useState<VFXForm>(emptyForm);
  const [showPresets, setShowPresets] = useState(true);

  const { data: effects, isLoading } = trpc.visualEffect.listByProject.useQuery(
    { projectId: projectId! },
    { enabled: !!projectId }
  );
  const { data: presets } = trpc.visualEffect.presets.useQuery();
  const utils = trpc.useUtils();

  const createMutation = trpc.visualEffect.create.useMutation({
    onSuccess: () => {
      utils.visualEffect.listByProject.invalidate();
      toast.success(editingId ? "Effect updated" : "Effect added to project");
      closeDialog();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.visualEffect.update.useMutation({
    onSuccess: () => {
      utils.visualEffect.listByProject.invalidate();
      toast.success("Effect updated");
      closeDialog();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.visualEffect.delete.useMutation({
    onSuccess: () => {
      utils.visualEffect.listByProject.invalidate();
      toast.success("Effect removed");
      setDeleteId(null);
    },
    onError: () => toast.error("Failed to delete effect"),
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setDialogOpen(true);
  };

  const openEdit = (effect: any) => {
    setForm({
      name: effect.name || "",
      category: effect.category || "",
      subcategory: effect.subcategory || "",
      description: effect.description || "",
      intensity: effect.intensity ?? 0.8,
      duration: effect.duration?.toString() || "",
      layer: effect.layer || "overlay",
      blendMode: effect.blendMode || "normal",
      colorTint: effect.colorTint || "",
      notes: effect.notes || "",
      tags: Array.isArray(effect.tags) ? effect.tags.join(", ") : "",
    });
    setEditingId(effect.id);
    setDialogOpen(true);
  };

  const addPresetToProject = (preset: any) => {
    if (!projectId) {
      toast.error("No project selected");
      return;
    }
    createMutation.mutate({
      projectId,
      name: preset.name,
      category: preset.category,
      subcategory: preset.subcategory || undefined,
      description: preset.description || undefined,
      intensity: 0.8,
      layer: "overlay",
      blendMode: "normal",
      isCustom: 0,
      tags: preset.tags || [],
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Effect name is required"); return; }
    if (!form.category) { toast.error("Category is required"); return; }
    if (!projectId) { toast.error("No project selected"); return; }

    const data = {
      name: form.name.trim(),
      category: form.category,
      subcategory: form.subcategory || undefined,
      description: form.description || undefined,
      intensity: form.intensity,
      duration: form.duration ? parseFloat(form.duration) : undefined,
      layer: form.layer as any,
      blendMode: form.blendMode || undefined,
      colorTint: form.colorTint || undefined,
      notes: form.notes || undefined,
      tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : undefined,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, ...data });
    } else {
      createMutation.mutate({ projectId, isCustom: 1, ...data });
    }
  };

  const filteredPresets = useMemo(() => {
    if (!presets) return [];
    return presets.filter((p) => {
      const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.description?.toLowerCase().includes(search.toLowerCase()) ||
        p.tags?.some((t: string) => t.toLowerCase().includes(search.toLowerCase()));
      const matchCategory = categoryFilter === "all" || p.category === categoryFilter;
      return matchSearch && matchCategory;
    });
  }, [presets, search, categoryFilter]);

  const filteredEffects = useMemo(() => {
    if (!effects) return [];
    return effects.filter((e) => {
      const matchSearch = !search || e.name.toLowerCase().includes(search.toLowerCase());
      const matchCategory = categoryFilter === "all" || e.category === categoryFilter;
      return matchSearch && matchCategory;
    });
  }, [effects, search, categoryFilter]);

  const groupedPresets = useMemo(() => {
    const groups: Record<string, typeof filteredPresets> = {};
    filteredPresets.forEach((p) => {
      if (!groups[p.category]) groups[p.category] = [];
      groups[p.category].push(p);
    });
    return groups;
  }, [filteredPresets]);

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (!projectId) {
    return (
      <div className="max-w-5xl mx-auto p-8 text-center">
        <Sparkles className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
        <h2 className="text-lg font-medium mb-2">Visual Effects Database</h2>
        <p className="text-sm text-muted-foreground">Open a project to manage its visual effects.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-purple-400" />
            Visual Effects
          </h1>
          <p className="text-muted-foreground text-sm mt-1 hidden sm:block">
            Browse the VFX library or create custom effects for your scenes
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" variant={showPresets ? "default" : "outline"} onClick={() => setShowPresets(true)}>
            <Layers className="h-4 w-4 mr-1" />Presets
          </Button>
          <Button size="sm" variant={!showPresets ? "default" : "outline"} onClick={() => setShowPresets(false)}>
            <Filter className="h-4 w-4 mr-1" />Project ({effects?.length || 0})
          </Button>
          <Button size="sm" variant="outline" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" />Custom
          </Button>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search effects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-9 bg-background/50"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[200px] h-9 bg-background/50">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Preset Library View */}
      {showPresets ? (
        <div className="space-y-6">
          {Object.entries(groupedPresets).map(([category, items]) => {
            const cfg = CATEGORY_CONFIG[category] || { label: category, icon: Sparkles, color: "text-gray-400 bg-gray-500/10" };
            const Icon = cfg.icon;
            return (
              <div key={category}>
                <div className="flex items-center gap-2 mb-3">
                  <div className={`h-7 w-7 rounded-md flex items-center justify-center ${cfg.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <h2 className="text-sm font-semibold uppercase tracking-wider">{cfg.label}</h2>
                  <Badge variant="secondary" className="text-[10px]">{items.length}</Badge>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {items.map((preset, idx) => (
                    <Card key={idx} className="bg-card/50 hover:ring-1 hover:ring-primary/20 transition-all group">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-medium truncate">{preset.name}</h3>
                            {preset.subcategory && (
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">{preset.subcategory}</p>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{preset.description}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {preset.tags?.slice(0, 3).map((tag: string) => (
                            <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">{tag}</Badge>
                          ))}
                        </div>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="w-full mt-3 h-7 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => addPresetToProject(preset)}
                          disabled={createMutation.isPending}
                        >
                          <Plus className="h-3 w-3 mr-1" />Add to Project
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
          {filteredPresets.length === 0 && (
            <div className="text-center py-12">
              <Sparkles className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No effects match your search.</p>
            </div>
          )}
        </div>
      ) : (
        /* Project Effects View */
        <div>
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="bg-card/50">
                  <CardContent className="p-4">
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-3 w-1/2 mb-3" />
                    <Skeleton className="h-3 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : !filteredEffects.length ? (
            <Card className="bg-card/50 border-dashed">
              <CardContent className="p-12 flex flex-col items-center text-center">
                <Sparkles className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground mb-4">
                  No effects added to this project yet. Browse the preset library or create a custom effect.
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setShowPresets(true)}>
                    <Layers className="h-4 w-4 mr-1" />Browse Presets
                  </Button>
                  <Button size="sm" onClick={openCreate}>
                    <Plus className="h-4 w-4 mr-1" />Custom Effect
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredEffects.map((effect) => {
                const cfg = CATEGORY_CONFIG[effect.category] || { label: effect.category, icon: Sparkles, color: "text-gray-400 bg-gray-500/10" };
                const Icon = cfg.icon;
                const tags = Array.isArray(effect.tags) ? effect.tags : [];
                return (
                  <Card key={effect.id} className="bg-card/50 group hover:ring-1 hover:ring-primary/20 transition-all">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`h-6 w-6 rounded flex items-center justify-center ${cfg.color}`}>
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-sm font-medium truncate">{effect.name}</h3>
                            <p className="text-[10px] text-muted-foreground">{cfg.label}</p>
                          </div>
                        </div>
                      </div>
                      {effect.description && (
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{effect.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex-1">
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className="h-full bg-primary/60 rounded-full" style={{ width: `${(effect.intensity ?? 0.8) * 100}%` }} />
                          </div>
                        </div>
                        <span className="text-[10px] text-muted-foreground">{Math.round((effect.intensity ?? 0.8) * 100)}%</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">{effect.layer || "overlay"}</Badge>
                        {tags.slice(0, 2).map((tag: string) => (
                          <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">{tag}</Badge>
                        ))}
                      </div>
                      <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={() => openEdit(effect)}>
                          <Pencil className="h-3 w-3 mr-0.5" />Edit
                        </Button>
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-destructive hover:text-destructive" onClick={() => setDeleteId(effect.id)}>
                          <Trash2 className="h-3 w-3 mr-0.5" />Remove
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">
              {editingId ? "Edit Visual Effect" : "Custom Visual Effect"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {editingId ? "Update the effect properties" : "Define a custom VFX for your scene"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Effect Name <span className="text-destructive">*</span></Label>
              <Input placeholder="e.g. Magical Portal Swirl" value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} className="h-9 text-sm bg-background/50" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Category <span className="text-destructive">*</span></Label>
                <Select value={form.category} onValueChange={(v) => setForm(p => ({ ...p, category: v }))}>
                  <SelectTrigger className="h-9 text-sm bg-background/50"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Subcategory</Label>
                <Input placeholder="e.g. elemental, ambient" value={form.subcategory} onChange={(e) => setForm(p => ({ ...p, subcategory: e.target.value }))} className="h-9 text-sm bg-background/50" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Description</Label>
              <Textarea placeholder="Describe the visual effect..." value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} className="min-h-[60px] text-sm bg-background/50 resize-y" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Intensity: {Math.round(form.intensity * 100)}%</Label>
              <Slider value={[form.intensity]} onValueChange={([v]) => setForm(p => ({ ...p, intensity: v }))} min={0} max={1} step={0.05} className="py-2" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Duration (sec)</Label>
                <Input placeholder="e.g. 3.5" value={form.duration} onChange={(e) => setForm(p => ({ ...p, duration: e.target.value }))} className="h-9 text-sm bg-background/50" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Layer</Label>
                <Select value={form.layer} onValueChange={(v) => setForm(p => ({ ...p, layer: v }))}>
                  <SelectTrigger className="h-9 text-sm bg-background/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="background">Background</SelectItem>
                    <SelectItem value="midground">Midground</SelectItem>
                    <SelectItem value="foreground">Foreground</SelectItem>
                    <SelectItem value="overlay">Overlay</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Blend Mode</Label>
                <Select value={form.blendMode} onValueChange={(v) => setForm(p => ({ ...p, blendMode: v }))}>
                  <SelectTrigger className="h-9 text-sm bg-background/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="screen">Screen</SelectItem>
                    <SelectItem value="multiply">Multiply</SelectItem>
                    <SelectItem value="overlay">Overlay</SelectItem>
                    <SelectItem value="add">Additive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Color Tint</Label>
                <Input type="color" value={form.colorTint || "#ffffff"} onChange={(e) => setForm(p => ({ ...p, colorTint: e.target.value }))} className="h-9 bg-background/50" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Tags (comma-separated)</Label>
                <Input placeholder="e.g. fire, magic, glow" value={form.tags} onChange={(e) => setForm(p => ({ ...p, tags: e.target.value }))} className="h-9 text-sm bg-background/50" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Notes</Label>
              <Textarea placeholder="Production notes..." value={form.notes} onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))} className="min-h-[50px] text-sm bg-background/50 resize-y" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={closeDialog}>Cancel</Button>
              <Button type="submit" size="sm" disabled={isSaving}>
                {isSaving ? "Saving..." : editingId ? "Save Changes" : "Add Effect"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove visual effect?</AlertDialogTitle>
            <AlertDialogDescription>This effect will be removed from your project.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
