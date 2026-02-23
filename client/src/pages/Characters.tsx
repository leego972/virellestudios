import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Plus,
  Upload,
  Loader2,
  Pencil,
  Trash2,
  X,
  User,
  Wand2,
} from "lucide-react";
import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";

type CharacterForm = {
  name: string;
  description: string;
  photoUrl: string;
  age: string;
  gender: string;
  ethnicity: string;
  build: string;
  hairColor: string;
  role: string;
};

const emptyForm: CharacterForm = {
  name: "",
  description: "",
  photoUrl: "",
  age: "",
  gender: "",
  ethnicity: "",
  build: "",
  hairColor: "",
  role: "",
};

const emptyAiForm = {
  name: "", ageRange: "", gender: "", ethnicity: "", skinTone: "", build: "", height: "",
  hairColor: "", hairStyle: "", eyeColor: "", facialFeatures: "", facialHair: "",
  distinguishingMarks: "", clothingStyle: "", expression: "", additionalNotes: "",
};

export default function Characters() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState<CharacterForm>(emptyForm);
  const [aiForm, setAiForm] = useState(emptyAiForm);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: characters, isLoading } = trpc.character.listLibrary.useQuery();
  const utils = trpc.useUtils();

  const uploadMutation = trpc.upload.image.useMutation();

  const createMutation = trpc.character.create.useMutation({
    onSuccess: () => {
      utils.character.listLibrary.invalidate();
      toast.success(editingId ? "Character updated" : "Character created");
      closeDialog();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.character.update.useMutation({
    onSuccess: () => {
      utils.character.listLibrary.invalidate();
      toast.success("Character updated");
      closeDialog();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.character.delete.useMutation({
    onSuccess: () => {
      utils.character.listLibrary.invalidate();
      toast.success("Character deleted");
      setDeleteId(null);
    },
    onError: () => toast.error("Failed to delete character"),
  });

  const aiGenMutation = trpc.character.aiGenerate.useMutation({
    onSuccess: () => {
      utils.character.listLibrary.invalidate();
      toast.success("AI character generated");
      setAiDialogOpen(false);
      setAiForm(emptyAiForm);
    },
    onError: (err) => toast.error(err.message),
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

  const openEdit = (char: any) => {
    const attrs = (char.attributes || {}) as any;
    setForm({
      name: char.name || "",
      description: char.description || "",
      photoUrl: char.photoUrl || "",
      age: attrs.age || "",
      gender: attrs.gender || "",
      ethnicity: attrs.ethnicity || "",
      build: attrs.build || "",
      hairColor: attrs.hairColor || "",
      role: attrs.role || "",
    });
    setEditingId(char.id);
    setDialogOpen(true);
  };

  const handlePhotoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File must be under 10MB");
      return;
    }
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        const result = await uploadMutation.mutateAsync({
          base64,
          filename: file.name,
          contentType: file.type,
        });
        setForm((prev) => ({ ...prev, photoUrl: result.url }));
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error("Upload failed");
      setUploading(false);
    }
  }, [uploadMutation]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Character name is required");
      return;
    }
    const attributes = {
      age: form.age || undefined,
      gender: form.gender || undefined,
      ethnicity: form.ethnicity || undefined,
      build: form.build || undefined,
      hairColor: form.hairColor || undefined,
      role: form.role || undefined,
    };

    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        photoUrl: form.photoUrl || undefined,
        attributes,
      });
    } else {
      createMutation.mutate({
        projectId: null,
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        photoUrl: form.photoUrl || undefined,
        attributes,
      });
    }
  };

  const setField = (key: keyof CharacterForm, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Character Library</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Reusable characters across all your projects
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setAiDialogOpen(true)}>
            <Wand2 className="h-4 w-4 mr-1" />
            AI Generate
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" />
            Upload Photo
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="bg-card/50">
              <CardContent className="p-4">
                <Skeleton className="aspect-square w-full rounded-md mb-3" />
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !characters?.length ? (
        <Card className="bg-card/50 border-dashed">
          <CardContent className="p-12 flex flex-col items-center text-center">
            <Users className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              No characters yet. Build your cast.
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setAiDialogOpen(true)}>
                <Wand2 className="h-4 w-4 mr-1" />AI Generate
              </Button>
              <Button size="sm" onClick={openCreate}>
                <Plus className="h-4 w-4 mr-1" />Upload Photo
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {characters.map((char) => {
            const attrs = (char.attributes || {}) as any;
            return (
              <Card key={char.id} className="bg-card/50 group">
                <CardContent className="p-4">
                  {char.photoUrl ? (
                    <div className="aspect-square rounded-md overflow-hidden mb-3 bg-muted">
                      <img
                        src={char.photoUrl}
                        alt={char.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="aspect-square rounded-md mb-3 bg-muted/50 flex items-center justify-center">
                      <User className="h-10 w-10 text-muted-foreground/30" />
                    </div>
                  )}
                  <h3 className="font-medium text-sm truncate">{char.name}</h3>
                  <div className="flex items-center gap-1 mt-1">
                    {attrs.aiGenerated && <Badge variant="secondary" className="text-[10px] px-1 py-0">AI</Badge>}
                    {(attrs.role || attrs.age || attrs.gender) && (
                      <p className="text-xs text-muted-foreground truncate">
                        {[attrs.role, attrs.age || attrs.ageRange, attrs.gender].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => openEdit(char)}
                    >
                      <Pencil className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(char.id)}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Character Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">
              {editingId ? "Edit Character" : "New Character"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            {/* Photo Upload */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Character Photo</Label>
              <div className="flex items-center gap-4">
                {form.photoUrl ? (
                  <div className="relative h-20 w-20 rounded-md overflow-hidden bg-muted shrink-0">
                    <img src={form.photoUrl} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      className="absolute top-1 right-1 h-5 w-5 bg-black/60 rounded-full flex items-center justify-center"
                      onClick={() => setField("photoUrl", "")}
                    >
                      <X className="h-3 w-3 text-white" />
                    </button>
                  </div>
                ) : (
                  <div
                    className="h-20 w-20 rounded-md border border-dashed flex items-center justify-center cursor-pointer hover:border-primary/40 transition-colors shrink-0"
                    onClick={() => fileRef.current?.click()}
                  >
                    {uploading ? (
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    ) : (
                      <Upload className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                )}
                <div className="text-xs text-muted-foreground">
                  <p>Upload a reference photo for this character.</p>
                  <p className="mt-0.5">JPG, PNG up to 10MB</p>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
              </div>
            </div>

            {/* Name */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                placeholder="Character name"
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                className="h-9 text-sm bg-background/50"
              />
            </div>

            {/* Role */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Role in Story</Label>
              <Select value={form.role} onValueChange={(v) => setField("role", v)}>
                <SelectTrigger className="h-9 text-sm bg-background/50">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="protagonist">Protagonist</SelectItem>
                  <SelectItem value="antagonist">Antagonist</SelectItem>
                  <SelectItem value="supporting">Supporting</SelectItem>
                  <SelectItem value="minor">Minor</SelectItem>
                  <SelectItem value="extra">Extra</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Demographics Row 1 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Age</Label>
                <Input
                  placeholder="e.g. 35"
                  value={form.age}
                  onChange={(e) => setField("age", e.target.value)}
                  className="h-9 text-sm bg-background/50"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Gender</Label>
                <Select value={form.gender} onValueChange={(v) => setField("gender", v)}>
                  <SelectTrigger className="h-9 text-sm bg-background/50">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="non-binary">Non-binary</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Demographics Row 2 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Ethnicity</Label>
                <Input
                  placeholder="e.g. Caucasian, Asian, etc."
                  value={form.ethnicity}
                  onChange={(e) => setField("ethnicity", e.target.value)}
                  className="h-9 text-sm bg-background/50"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Build</Label>
                <Select value={form.build} onValueChange={(v) => setField("build", v)}>
                  <SelectTrigger className="h-9 text-sm bg-background/50">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="slim">Slim</SelectItem>
                    <SelectItem value="average">Average</SelectItem>
                    <SelectItem value="athletic">Athletic</SelectItem>
                    <SelectItem value="muscular">Muscular</SelectItem>
                    <SelectItem value="heavy">Heavy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Hair Color */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Hair Color</Label>
              <Input
                placeholder="e.g. Black, Blonde, Red"
                value={form.hairColor}
                onChange={(e) => setField("hairColor", e.target.value)}
                className="h-9 text-sm bg-background/50"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Full Description</Label>
              <Textarea
                placeholder="Describe this character's personality, background, motivations, distinctive features, wardrobe style, mannerisms..."
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                className="min-h-[100px] text-sm bg-background/50 resize-y"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={closeDialog}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : null}
                {editingId ? "Save Changes" : "Create Character"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* AI Character Generator Dialog */}
      <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-primary" />
              AI Character Generator
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Select features and AI will generate a Hollywood-quality photorealistic portrait
            </p>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!aiForm.name.trim()) { toast.error("Name is required"); return; }
              if (!aiForm.gender) { toast.error("Gender is required"); return; }
              if (!aiForm.ageRange) { toast.error("Age range is required"); return; }
              if (!aiForm.ethnicity) { toast.error("Ethnicity is required"); return; }
              if (!aiForm.hairColor) { toast.error("Hair color is required"); return; }
              if (!aiForm.hairStyle) { toast.error("Hair style is required"); return; }
              if (!aiForm.eyeColor) { toast.error("Eye color is required"); return; }
              aiGenMutation.mutate({
                name: aiForm.name.trim(),
                projectId: null,
                features: {
                  ageRange: aiForm.ageRange,
                  gender: aiForm.gender,
                  ethnicity: aiForm.ethnicity,
                  skinTone: aiForm.skinTone || undefined,
                  build: aiForm.build || undefined,
                  height: aiForm.height || undefined,
                  hairColor: aiForm.hairColor,
                  hairStyle: aiForm.hairStyle,
                  eyeColor: aiForm.eyeColor,
                  facialFeatures: aiForm.facialFeatures || undefined,
                  facialHair: aiForm.facialHair || undefined,
                  distinguishingMarks: aiForm.distinguishingMarks || undefined,
                  clothingStyle: aiForm.clothingStyle || undefined,
                  expression: aiForm.expression || undefined,
                  additionalNotes: aiForm.additionalNotes || undefined,
                },
              });
            }}
            className="space-y-4 mt-2"
          >
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Character Name <span className="text-destructive">*</span></Label>
              <Input placeholder="e.g. Detective Marcus Cole" value={aiForm.name} onChange={e => setAiForm(p => ({ ...p, name: e.target.value }))} className="h-9 text-sm bg-background/50" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Gender <span className="text-destructive">*</span></Label>
                <Select value={aiForm.gender} onValueChange={v => setAiForm(p => ({ ...p, gender: v }))}>
                  <SelectTrigger className="h-9 text-sm bg-background/50"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="non-binary">Non-binary</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Age Range <span className="text-destructive">*</span></Label>
                <Select value={aiForm.ageRange} onValueChange={v => setAiForm(p => ({ ...p, ageRange: v }))}>
                  <SelectTrigger className="h-9 text-sm bg-background/50"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="teens">Teens (13-19)</SelectItem>
                    <SelectItem value="20s">20s</SelectItem>
                    <SelectItem value="30s">30s</SelectItem>
                    <SelectItem value="40s">40s</SelectItem>
                    <SelectItem value="50s">50s</SelectItem>
                    <SelectItem value="60s">60s</SelectItem>
                    <SelectItem value="70s+">70s+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Ethnicity <span className="text-destructive">*</span></Label>
                <Select value={aiForm.ethnicity} onValueChange={v => setAiForm(p => ({ ...p, ethnicity: v }))}>
                  <SelectTrigger className="h-9 text-sm bg-background/50"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Caucasian">Caucasian</SelectItem>
                    <SelectItem value="African">African</SelectItem>
                    <SelectItem value="African American">African American</SelectItem>
                    <SelectItem value="East Asian">East Asian</SelectItem>
                    <SelectItem value="South Asian">South Asian</SelectItem>
                    <SelectItem value="Southeast Asian">Southeast Asian</SelectItem>
                    <SelectItem value="Middle Eastern">Middle Eastern</SelectItem>
                    <SelectItem value="Latino/Hispanic">Latino/Hispanic</SelectItem>
                    <SelectItem value="Native American">Native American</SelectItem>
                    <SelectItem value="Pacific Islander">Pacific Islander</SelectItem>
                    <SelectItem value="Mixed">Mixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Skin Tone</Label>
                <Select value={aiForm.skinTone} onValueChange={v => setAiForm(p => ({ ...p, skinTone: v }))}>
                  <SelectTrigger className="h-9 text-sm bg-background/50"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="very fair">Very Fair</SelectItem>
                    <SelectItem value="fair">Fair</SelectItem>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="olive">Olive</SelectItem>
                    <SelectItem value="tan">Tan</SelectItem>
                    <SelectItem value="brown">Brown</SelectItem>
                    <SelectItem value="dark brown">Dark Brown</SelectItem>
                    <SelectItem value="deep">Deep</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Build</Label>
                <Select value={aiForm.build} onValueChange={v => setAiForm(p => ({ ...p, build: v }))}>
                  <SelectTrigger className="h-9 text-sm bg-background/50"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="petite">Petite</SelectItem>
                    <SelectItem value="slim">Slim</SelectItem>
                    <SelectItem value="average">Average</SelectItem>
                    <SelectItem value="athletic">Athletic</SelectItem>
                    <SelectItem value="muscular">Muscular</SelectItem>
                    <SelectItem value="stocky">Stocky</SelectItem>
                    <SelectItem value="heavy">Heavy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Height</Label>
                <Select value={aiForm.height} onValueChange={v => setAiForm(p => ({ ...p, height: v }))}>
                  <SelectTrigger className="h-9 text-sm bg-background/50"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short">Short</SelectItem>
                    <SelectItem value="below average">Below Average</SelectItem>
                    <SelectItem value="average">Average</SelectItem>
                    <SelectItem value="above average">Above Average</SelectItem>
                    <SelectItem value="tall">Tall</SelectItem>
                    <SelectItem value="very tall">Very Tall</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Hair Color <span className="text-destructive">*</span></Label>
                <Select value={aiForm.hairColor} onValueChange={v => setAiForm(p => ({ ...p, hairColor: v }))}>
                  <SelectTrigger className="h-9 text-sm bg-background/50"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="black">Black</SelectItem>
                    <SelectItem value="dark brown">Dark Brown</SelectItem>
                    <SelectItem value="brown">Brown</SelectItem>
                    <SelectItem value="light brown">Light Brown</SelectItem>
                    <SelectItem value="blonde">Blonde</SelectItem>
                    <SelectItem value="platinum blonde">Platinum Blonde</SelectItem>
                    <SelectItem value="red">Red</SelectItem>
                    <SelectItem value="auburn">Auburn</SelectItem>
                    <SelectItem value="gray">Gray</SelectItem>
                    <SelectItem value="white">White</SelectItem>
                    <SelectItem value="bald">Bald</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Hair Style <span className="text-destructive">*</span></Label>
                <Select value={aiForm.hairStyle} onValueChange={v => setAiForm(p => ({ ...p, hairStyle: v }))}>
                  <SelectTrigger className="h-9 text-sm bg-background/50"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short cropped">Short Cropped</SelectItem>
                    <SelectItem value="buzz cut">Buzz Cut</SelectItem>
                    <SelectItem value="slicked back">Slicked Back</SelectItem>
                    <SelectItem value="wavy medium-length">Wavy Medium</SelectItem>
                    <SelectItem value="long straight">Long Straight</SelectItem>
                    <SelectItem value="long wavy">Long Wavy</SelectItem>
                    <SelectItem value="curly">Curly</SelectItem>
                    <SelectItem value="afro">Afro</SelectItem>
                    <SelectItem value="braided">Braided</SelectItem>
                    <SelectItem value="ponytail">Ponytail</SelectItem>
                    <SelectItem value="bob">Bob</SelectItem>
                    <SelectItem value="pixie cut">Pixie Cut</SelectItem>
                    <SelectItem value="dreadlocks">Dreadlocks</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Eye Color <span className="text-destructive">*</span></Label>
                <Select value={aiForm.eyeColor} onValueChange={v => setAiForm(p => ({ ...p, eyeColor: v }))}>
                  <SelectTrigger className="h-9 text-sm bg-background/50"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="brown">Brown</SelectItem>
                    <SelectItem value="dark brown">Dark Brown</SelectItem>
                    <SelectItem value="hazel">Hazel</SelectItem>
                    <SelectItem value="green">Green</SelectItem>
                    <SelectItem value="blue">Blue</SelectItem>
                    <SelectItem value="gray">Gray</SelectItem>
                    <SelectItem value="amber">Amber</SelectItem>
                    <SelectItem value="black">Black</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Facial Features</Label>
                <Input placeholder="e.g. sharp jawline, high cheekbones" value={aiForm.facialFeatures} onChange={e => setAiForm(p => ({ ...p, facialFeatures: e.target.value }))} className="h-9 text-sm bg-background/50" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Facial Hair</Label>
                <Select value={aiForm.facialHair} onValueChange={v => setAiForm(p => ({ ...p, facialHair: v }))}>
                  <SelectTrigger className="h-9 text-sm bg-background/50"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None / Clean-shaven</SelectItem>
                    <SelectItem value="light stubble">Light Stubble</SelectItem>
                    <SelectItem value="heavy stubble">Heavy Stubble</SelectItem>
                    <SelectItem value="short beard">Short Beard</SelectItem>
                    <SelectItem value="full beard">Full Beard</SelectItem>
                    <SelectItem value="goatee">Goatee</SelectItem>
                    <SelectItem value="mustache">Mustache</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Distinguishing Marks</Label>
                <Input placeholder="e.g. scar, freckles, tattoo" value={aiForm.distinguishingMarks} onChange={e => setAiForm(p => ({ ...p, distinguishingMarks: e.target.value }))} className="h-9 text-sm bg-background/50" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Expression</Label>
                <Select value={aiForm.expression} onValueChange={v => setAiForm(p => ({ ...p, expression: v }))}>
                  <SelectTrigger className="h-9 text-sm bg-background/50"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="neutral">Neutral</SelectItem>
                    <SelectItem value="confident">Confident</SelectItem>
                    <SelectItem value="serious">Serious</SelectItem>
                    <SelectItem value="warm and friendly">Warm & Friendly</SelectItem>
                    <SelectItem value="mysterious">Mysterious</SelectItem>
                    <SelectItem value="intense">Intense</SelectItem>
                    <SelectItem value="determined">Determined</SelectItem>
                    <SelectItem value="menacing">Menacing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Clothing Style</Label>
              <Input placeholder="e.g. tailored suit, leather jacket" value={aiForm.clothingStyle} onChange={e => setAiForm(p => ({ ...p, clothingStyle: e.target.value }))} className="h-9 text-sm bg-background/50" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Additional Notes</Label>
              <Textarea placeholder="Any other details..." value={aiForm.additionalNotes} onChange={e => setAiForm(p => ({ ...p, additionalNotes: e.target.value }))} className="min-h-[60px] text-sm bg-background/50 resize-y" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setAiDialogOpen(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={aiGenMutation.isPending}>
                {aiGenMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />Generating...</> : <><Wand2 className="h-4 w-4 mr-1" />Generate Character</>}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete character?</AlertDialogTitle>
            <AlertDialogDescription>
              This character will be permanently removed from your library.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
