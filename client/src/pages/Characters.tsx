import { useRef, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { NextStageCTA } from "@/components/NextStageCTA";
import { SubscriptionGate } from "@/components/SubscriptionGate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  ChevronRight,
  Copy,
  Edit3,
  Film,
  Info,
  Loader2,
  Mic,
  Plus,
  Search,
  Sparkles,
  Star,
  Trash2,
  Upload,
  User,
  Volume2,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";

const VOICE_PRESETS = [
  { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel", desc: "Young, calm", gender: "F" },
  { id: "AZnzlk1XvdvUeBnXmlld", name: "Domi", desc: "Confident", gender: "F" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Bella", desc: "Warm storyteller", gender: "F" },
  { id: "XrExE9yKIg1WjnnlVkGX", name: "Matilda", desc: "Cozy, friendly", gender: "F" },
  { id: "ErXwobaYiN019PkySvjV", name: "Antoni", desc: "Smooth", gender: "M" },
  { id: "TxGEqnHWrfWFTfGW9XjX", name: "Josh", desc: "Deep, narrative", gender: "M" },
  { id: "onwK4e9ZLuTAKqWW03F9", name: "Daniel", desc: "British, deep", gender: "M" },
  { id: "pNInz6obpgDQGcFmaJgB", name: "Adam", desc: "Authoritative", gender: "M" },
  { id: "VR6AewLTigWG4xSOukaG", name: "Arnold", desc: "Crisp, strong", gender: "M" },
  { id: "2EiwWnXFnvU5JabPnv8n", name: "Clyde", desc: "Gravelly veteran", gender: "M" },
];

const ROLES = [
  "Lead",
  "Supporting",
  "Featured Extra",
  "Extra",
  "Narrator",
  "Voice-Only",
  "Antagonist",
  "Mentor",
  "Comic Relief",
  "Love Interest",
];
const ARC_TYPES = [
  "Hero",
  "Anti-Hero",
  "Villain",
  "Mentor",
  "Trickster",
  "Shapeshifter",
  "Threshold Guardian",
  "Herald",
  "Shadow",
];
const MORAL_ALIGNMENTS = [
  "Lawful Good",
  "Neutral Good",
  "Chaotic Good",
  "Lawful Neutral",
  "True Neutral",
  "Chaotic Neutral",
  "Lawful Evil",
  "Neutral Evil",
  "Chaotic Evil",
];
const PHOTO_STYLES = [
  { value: "cinematic", label: "Cinematic" },
  { value: "noir", label: "Film Noir" },
  { value: "sci-fi", label: "Science Fiction" },
  { value: "fantasy", label: "Fantasy" },
  { value: "horror", label: "Horror" },
  { value: "comedy", label: "Comedy" },
  { value: "period", label: "Period Film" },
  { value: "action", label: "Action" },
];

function getAttributes(character: any): Record<string, any> {
  if (!character?.attributes) return {};
  if (typeof character.attributes === "object") return character.attributes;
  try {
    const parsed = JSON.parse(character.attributes);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function CharacterAvatar({ character, size = "small" }: { character: any; size?: "small" | "large" }) {
  const className = size === "large" ? "h-20 w-20 rounded-2xl" : "h-14 w-14 rounded-xl";
  return (
    <div
      className={`${className} flex shrink-0 items-center justify-center overflow-hidden`}
      style={{
        background: "linear-gradient(135deg,rgba(212,175,55,0.15),rgba(99,102,241,0.15))",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      {character.photoUrl ? (
        <img src={character.photoUrl} alt={character.name} className="h-full w-full object-cover" />
      ) : (
        <User className={size === "large" ? "h-8 w-8 opacity-20" : "h-6 w-6 opacity-20"} />
      )}
    </div>
  );
}

function CharacterCard({
  character,
  selected,
  onClick,
  onEdit,
  onDelete,
}: {
  character: any;
  selected: boolean;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const attributes = getAttributes(character);
  const generatedFromPhoto = Boolean(attributes.generatedFromPhoto);
  return (
    <div
      onClick={onClick}
      className="group cursor-pointer rounded-xl border transition-all"
      style={{
        borderColor: selected ? "rgba(212,175,55,0.4)" : "rgba(255,255,255,0.07)",
        background: selected ? "rgba(212,175,55,0.05)" : "rgba(255,255,255,0.02)",
      }}
    >
      <div className="flex items-center gap-3 p-3">
        <CharacterAvatar character={character} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-semibold">{character.name}</span>
            {character.isAiActor && <Star className="h-3 w-3 shrink-0 text-amber-400" />}
          </div>
          <div className="truncate text-[10px] text-muted-foreground">{character.role || "Character"}</div>
          <div className="mt-1 flex items-center gap-1.5">
            {character.voiceId && (
              <Badge className="border-0 bg-indigo-500/15 px-1.5 py-0 text-[9px] text-indigo-300">
                <Mic className="mr-1 h-2.5 w-2.5" />Voice
              </Badge>
            )}
            {(attributes.aiGenerated || generatedFromPhoto) && (
              <Badge className="border-0 bg-amber-500/15 px-1.5 py-0 text-[9px] text-amber-300">
                {generatedFromPhoto ? <Camera className="mr-1 h-2.5 w-2.5" /> : <Sparkles className="mr-1 h-2.5 w-2.5" />}
                {generatedFromPhoto ? "Photo" : "AI"}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={event => {
              event.stopPropagation();
              onEdit();
            }}
            className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-white/10"
            aria-label={`Edit ${character.name}`}
          >
            <Edit3 className="h-3 w-3" />
          </button>
          <button
            onClick={event => {
              event.stopPropagation();
              onDelete();
            }}
            className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-red-500/10"
            aria-label={`Delete ${character.name}`}
          >
            <Trash2 className="h-3 w-3 text-red-400" />
          </button>
        </div>
      </div>
    </div>
  );
}

function VoiceCloneSection({
  characterId,
  characterName,
  currentVoiceId,
  onVoiceSet,
}: {
  characterId: number;
  characterName: string;
  currentVoiceId?: string;
  onVoiceSet: (voiceId: string) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [cloning, setCloning] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const cloneVoice = trpc.auth.cloneVoice.useMutation();

  async function handleClone() {
    if (!file) {
      toast.error("Upload a voice sample first (30+ seconds)");
      return;
    }
    setCloning(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      const response = await cloneVoice.mutateAsync({
        characterId,
        name: `${characterName} — Virelle`,
        audioBase64: dataUrl.split(",")[1] || "",
        description: `Voice clone for character ${characterName}`,
      });
      onVoiceSet(response.voiceId);
      toast.success("Voice cloned and saved to character");
    } catch (error: any) {
      toast.error(error?.message || "Voice cloning failed");
    } finally {
      setCloning(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-xl border border-indigo-500/20 bg-indigo-500/[0.04] px-4 py-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-indigo-300" />
        <p className="text-xs text-muted-foreground">
          Upload 30–120 seconds of clean audio to clone a custom ElevenLabs voice for this character.
        </p>
      </div>
      {currentVoiceId && (
        <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] px-4 py-2.5">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <div>
            <div className="text-xs font-semibold text-emerald-400">Voice assigned</div>
            <div className="mt-0.5 text-[10px] text-muted-foreground">ID: {currentVoiceId.slice(0, 16)}…</div>
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(currentVoiceId);
              toast.success("Voice ID copied");
            }}
            className="ml-auto rounded p-1.5 hover:bg-white/5"
            aria-label="Copy voice ID"
          >
            <Copy className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
      )}
      <button
        type="button"
        className="w-full rounded-xl border-2 border-dashed border-white/10 p-6 text-center transition-colors hover:bg-white/5"
        onClick={() => fileRef.current?.click()}
      >
        <Upload className="mx-auto mb-2 h-8 w-8 opacity-30" />
        <p className="text-sm font-medium">{file ? file.name : "Upload voice sample"}</p>
        <p className="mt-1 text-xs text-muted-foreground">MP3, WAV, M4A · 30s–5min · clear audio</p>
      </button>
      <input ref={fileRef} type="file" accept="audio/*" className="hidden" onChange={event => setFile(event.target.files?.[0] || null)} />
      <Button className="h-10 w-full gap-2 bg-indigo-600 text-white hover:bg-indigo-500" onClick={handleClone} disabled={cloning || !file}>
        {cloning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
        {cloning ? "Cloning voice…" : "Clone Voice"}
      </Button>
    </div>
  );
}

function CharacterDialog({
  character,
  projectId,
  onClose,
  onSaved,
}: {
  character?: any;
  projectId?: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [tab, setTab] = useState("profile");
  const [form, setForm] = useState({
    name: character?.name || "",
    role: character?.role || "",
    description: character?.description || "",
    backstory: character?.backstory || "",
    motivations: character?.motivations || "",
    arcType: character?.arcType || "",
    moralAlignment: character?.moralAlignment || "",
    speechPattern: character?.speechPattern || "",
    voiceId: character?.voiceId || "",
    voiceType: character?.voiceType || "",
    nationality: character?.nationality || "",
  });
  const [saving, setSaving] = useState(false);
  const createCharacter = trpc.character.create.useMutation();
  const updateCharacter = trpc.character.update.useMutation();
  const patch = (key: keyof typeof form, value: string) => setForm(current => ({ ...current, [key]: value }));

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      if (character) {
        await updateCharacter.mutateAsync({ id: character.id, ...form });
        toast.success("Character updated");
      } else {
        await createCharacter.mutateAsync({ projectId: projectId || null, ...form });
        toast.success("Character created");
      }
      onSaved();
      onClose();
    } catch (error: any) {
      toast.error(error?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto border-white/10 bg-[#0c0b18]">
      <DialogHeader>
        <DialogTitle className="font-serif text-lg text-amber-400">
          {character ? "Edit Character" : "New Character Profile"}
        </DialogTitle>
      </DialogHeader>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="border border-white/10 bg-white/5">
          <TabsTrigger value="profile" className="text-xs data-[state=active]:bg-white/10">Profile</TabsTrigger>
          <TabsTrigger value="voice" className="text-xs data-[state=active]:bg-white/10">Voice</TabsTrigger>
          <TabsTrigger value="story" className="text-xs data-[state=active]:bg-white/10">Story</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Name *</label>
              <Input value={form.name} onChange={event => patch("name", event.target.value)} placeholder="Character name" className="h-9 border-white/10 bg-white/5 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Role</label>
              <Select value={form.role} onValueChange={value => patch("role", value)}>
                <SelectTrigger className="h-9 border-white/10 bg-white/5 text-xs"><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>{ROLES.map(role => <SelectItem key={role} value={role} className="text-xs">{role}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Nationality</label>
              <Input value={form.nationality} onChange={event => patch("nationality", event.target.value)} placeholder="e.g. Australian" className="h-9 border-white/10 bg-white/5 text-xs" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Character Arc</label>
              <Select value={form.arcType} onValueChange={value => patch("arcType", value)}>
                <SelectTrigger className="h-9 border-white/10 bg-white/5 text-xs"><SelectValue placeholder="Arc type" /></SelectTrigger>
                <SelectContent>{ARC_TYPES.map(arc => <SelectItem key={arc} value={arc} className="text-xs">{arc}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Moral Alignment</label>
              <Select value={form.moralAlignment} onValueChange={value => patch("moralAlignment", value)}>
                <SelectTrigger className="h-9 border-white/10 bg-white/5 text-xs"><SelectValue placeholder="Alignment" /></SelectTrigger>
                <SelectContent>{MORAL_ALIGNMENTS.map(alignment => <SelectItem key={alignment} value={alignment} className="text-xs">{alignment}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Description</label>
              <Textarea value={form.description} onChange={event => patch("description", event.target.value)} placeholder="Physical appearance, personality and defining details…" className="min-h-24 resize-none border-white/10 bg-white/5 text-xs" />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="voice" className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground">ElevenLabs Preset Voice</label>
            <Select value={form.voiceId} onValueChange={value => patch("voiceId", value)}>
              <SelectTrigger className="h-9 border-white/10 bg-white/5 text-xs"><Mic className="mr-2 h-3.5 w-3.5" /><SelectValue placeholder="Choose a preset voice" /></SelectTrigger>
              <SelectContent>{VOICE_PRESETS.map(voice => <SelectItem key={voice.id} value={voice.id} className="text-xs">{voice.name} ({voice.gender}) — {voice.desc}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Voice Description</label>
            <Input value={form.voiceType} onChange={event => patch("voiceType", event.target.value)} placeholder="Deep baritone, slight rasp, measured delivery" className="h-9 border-white/10 bg-white/5 text-xs" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Speech Pattern</label>
            <Input value={form.speechPattern} onChange={event => patch("speechPattern", event.target.value)} placeholder="Short sentences, formal, never uses contractions" className="h-9 border-white/10 bg-white/5 text-xs" />
          </div>
          {character && (
            <div className="border-t border-white/10 pt-4">
              <VoiceCloneSection characterId={character.id} characterName={character.name} currentVoiceId={form.voiceId} onVoiceSet={value => patch("voiceId", value)} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="story" className="mt-4 space-y-3">
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Backstory</label>
            <Textarea value={form.backstory} onChange={event => patch("backstory", event.target.value)} placeholder="Where did this character come from? What shaped them?" className="min-h-28 resize-none border-white/10 bg-white/5 text-xs" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Motivations</label>
            <Textarea value={form.motivations} onChange={event => patch("motivations", event.target.value)} placeholder="What do they want? What are they afraid to lose?" className="min-h-24 resize-none border-white/10 bg-white/5 text-xs" />
          </div>
        </TabsContent>
      </Tabs>
      <div className="mt-2 flex gap-2 border-t border-white/10 pt-3">
        <Button variant="outline" className="h-9 flex-1 border-white/10 text-xs" onClick={onClose}>Cancel</Button>
        <Button className="h-9 flex-1 gap-2 bg-amber-500 text-xs text-black hover:bg-amber-400" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
          {saving ? "Saving…" : character ? "Save Changes" : "Create Character"}
        </Button>
      </div>
    </DialogContent>
  );
}

function CharacterGeneratorDialog({
  projectId,
  onClose,
  onGenerated,
}: {
  projectId?: number;
  onClose: () => void;
  onGenerated: (character: any) => void;
}) {
  const [mode, setMode] = useState<"description" | "photo">("description");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [role, setRole] = useState("");
  const [style, setStyle] = useState("cinematic");
  const [notes, setNotes] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>();
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const generateFromDescription = trpc.character.aiGenerate.useMutation();
  const generateFromPhoto = trpc.character.aiGenerateFromPhoto.useMutation();
  const pending = generateFromDescription.isPending || generateFromPhoto.isPending;

  function choosePhoto(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Photo must be under 10MB");
      return;
    }
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function submit() {
    if (!name.trim()) {
      toast.error("Character name is required");
      return;
    }
    try {
      let character: any;
      if (mode === "description") {
        if (description.trim().length < 5) {
          toast.error("Describe the character in at least a few words");
          return;
        }
        const completeDescription = [
          description.trim(),
          role.trim() ? `Character role: ${role.trim()}.` : "",
          notes.trim() ? `Director requirements: ${notes.trim()}` : "",
        ].filter(Boolean).join(" ");
        character = await generateFromDescription.mutateAsync({
          name: name.trim(),
          projectId: projectId || null,
          freeDescription: completeDescription,
        });
      } else {
        if (!photo) {
          toast.error("Upload a reference photo");
          return;
        }
        if (!rightsConfirmed) {
          toast.error("Confirm that you have permission to use the photo and likeness");
          return;
        }
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(photo);
        });
        character = await generateFromPhoto.mutateAsync({
          name: name.trim(),
          projectId: projectId || null,
          photoBase64: dataUrl.split(",")[1] || "",
          photoMimeType: photo.type || "image/jpeg",
          characterRole: role.trim() || undefined,
          style,
          additionalNotes: notes.trim() || undefined,
        });
      }
      toast.success(mode === "photo" ? "Character generated from photo" : "Character generated from description");
      onGenerated(character);
      onClose();
    } catch (error: any) {
      toast.error(error?.message || "Character generation failed");
    }
  }

  return (
    <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto border-white/10 bg-[#0c0b18]">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 font-serif text-xl text-amber-400">
          <Sparkles className="h-5 w-5" />AI Character Generator
        </DialogTitle>
      </DialogHeader>
      <p className="text-sm text-muted-foreground">
        Use the existing Virelle character pipeline to generate a portrait from a complete written brief or a supplied reference photo. All entered details are retained for later scene consistency.
      </p>

      <Tabs value={mode} onValueChange={value => setMode(value as "description" | "photo")}>
        <TabsList className="grid w-full grid-cols-2 border border-white/10 bg-white/5">
          <TabsTrigger value="description"><Wand2 className="mr-2 h-4 w-4" />From Description</TabsTrigger>
          <TabsTrigger value="photo"><Camera className="mr-2 h-4 w-4" />From Photo</TabsTrigger>
        </TabsList>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Character Name *</label>
            <Input value={name} onChange={event => setName(event.target.value)} placeholder="Name" className="border-white/10 bg-white/5" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Role</label>
            <Input value={role} onChange={event => setRole(event.target.value)} placeholder="Lead, antagonist, mentor…" className="border-white/10 bg-white/5" />
          </div>
          {mode === "photo" && (
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Portrait Style</label>
              <Select value={style} onValueChange={setStyle}>
                <SelectTrigger className="border-white/10 bg-white/5"><SelectValue /></SelectTrigger>
                <SelectContent>{PHOTO_STYLES.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
        </div>

        <TabsContent value="description" className="mt-4 space-y-2">
          <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Complete Character Brief *</label>
          <Textarea
            value={description}
            onChange={event => setDescription(event.target.value)}
            placeholder="Describe age, presentation, face, skin, hair, eyes, build, clothing, marks, expression, personality and any detail that must remain consistent. Virelle uses your wording directly."
            className="min-h-48 resize-y border-white/10 bg-white/5"
          />
        </TabsContent>

        <TabsContent value="photo" className="mt-4 space-y-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex min-h-52 w-full flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-white/10 bg-white/[0.02] transition-colors hover:bg-white/[0.04]"
          >
            {photoPreview ? (
              <img src={photoPreview} alt="Reference preview" className="max-h-80 w-full object-contain" />
            ) : (
              <>
                <Camera className="mb-3 h-10 w-10 text-amber-400/50" />
                <span className="text-sm font-medium">Upload reference photo</span>
                <span className="mt-1 text-xs text-muted-foreground">JPEG, PNG or WebP · maximum 10MB</span>
              </>
            )}
          </button>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={event => choosePhoto(event.target.files?.[0] || null)} />
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs text-muted-foreground">
            <input type="checkbox" checked={rightsConfirmed} onChange={event => setRightsConfirmed(event.target.checked)} className="mt-0.5" />
            <span>I confirm that I have permission to use this image and the depicted person’s likeness for this production.</span>
          </label>
        </TabsContent>
      </Tabs>

      <div className="space-y-1.5">
        <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Additional Director Requirements</label>
        <Textarea
          value={notes}
          onChange={event => setNotes(event.target.value)}
          placeholder="Exact details, changes, performance direction, clothing, marks or constraints the AI must follow. These are added to the character identity anchor."
          className="min-h-28 resize-y border-white/10 bg-white/5"
        />
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-white/10 pt-4 sm:flex-row">
        <Button variant="outline" className="flex-1 border-white/10" onClick={onClose}>Cancel</Button>
        <Button className="flex-1 gap-2 bg-amber-500 text-black hover:bg-amber-400" onClick={submit} disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "photo" ? <Camera className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
          {pending ? "Generating…" : mode === "photo" ? "Generate from Photo" : "Generate Character"}
        </Button>
      </div>
    </DialogContent>
  );
}

function CharactersInner() {
  const { user, loading: authLoading } = useAuth();
  const params = useParams<{ projectId: string }>();
  const [, navigate] = useLocation();
  const projectId = Number(params.projectId) || 0;
  const hasProject = Boolean(projectId && user);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editCharacter, setEditCharacter] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data: project } = trpc.project.get.useQuery({ id: projectId }, { enabled: hasProject });
  const projectCharacters = trpc.character.listByProject.useQuery({ projectId }, { enabled: hasProject });
  const libraryCharacters = trpc.character.list.useQuery(undefined, { enabled: Boolean(user) && !hasProject });
  const characters = hasProject ? projectCharacters.data : libraryCharacters.data;
  const refetch = hasProject ? projectCharacters.refetch : libraryCharacters.refetch;
  const deleteCharacter = trpc.character.delete.useMutation();
  const utils = trpc.useUtils();

  if (!user && !authLoading) {
    window.location.href = getLoginUrl();
    return null;
  }

  const filtered = (characters ?? []).filter((character: any) => {
    const query = search.trim().toLowerCase();
    return !query
      || String(character.name || "").toLowerCase().includes(query)
      || String(character.role || "").toLowerCase().includes(query)
      || String(character.description || "").toLowerCase().includes(query);
  });
  const selected = (characters ?? []).find((character: any) => character.id === selectedId) as any;

  async function refreshCharacters() {
    await refetch();
    if (hasProject) await utils.character.listByProject.invalidate({ projectId });
    else {
      await utils.character.list.invalidate();
      await utils.character.listLibrary.invalidate();
    }
  }

  async function handleDelete(id: number) {
    setDeleting(true);
    try {
      await deleteCharacter.mutateAsync({ id });
      if (selectedId === id) setSelectedId(null);
      await refreshCharacters();
      toast.success("Character deleted");
    } catch (error: any) {
      toast.error(error?.message || "Delete failed");
    } finally {
      setDeleting(false);
      setDeleteConfirm(null);
    }
  }

  async function handleGenerated(character: any) {
    setSelectedId(character.id);
    await refreshCharacters();
  }

  const selectedAttributes = getAttributes(selected);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#07070e] via-[#0c0b18] to-[#07070a]">
      <div className="sticky top-0 z-20 border-b border-white/[0.07] bg-[#07070e]/95 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(hasProject ? `/projects/${projectId}` : "/dashboard")} className="h-9 gap-2 text-muted-foreground">
              <ArrowLeft className="h-4 w-4" />Back
            </Button>
            <div className="h-5 w-px bg-border/40" />
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600">
                <User className="h-[18px] w-[18px] text-black" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-bold">Characters</div>
                <div className="truncate text-[10px] text-muted-foreground">
                  {project ? `${project.title} · ` : ""}{filtered.length} character{filtered.length !== 1 ? "s" : ""}
                </div>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowCreate(true)} className="h-9 gap-2 border-white/10 text-xs">
              <Plus className="h-3.5 w-3.5" /><span className="hidden sm:inline">New Profile</span>
            </Button>
            <Button size="sm" onClick={() => setShowGenerator(true)} className="h-9 gap-2 bg-amber-500 text-xs text-black hover:bg-amber-400">
              <Sparkles className="h-3.5 w-3.5" />AI Character
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-6 lg:grid-cols-[288px_minmax(0,1fr)]">
        <aside className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search characters…" className="h-10 border-white/10 bg-white/5 pl-9 text-xs" />
          </div>
          {!filtered.length ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-white/[0.07] py-14 text-center">
              <User className="h-10 w-10 opacity-20" />
              <p className="text-sm">{search ? "No matches" : "No characters yet"}</p>
              {!search && (
                <div className="flex flex-col gap-2">
                  <Button size="sm" onClick={() => setShowGenerator(true)} className="gap-2 bg-amber-500 text-black hover:bg-amber-400"><Sparkles className="h-3.5 w-3.5" />Generate Character</Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowCreate(true)}><Plus className="mr-2 h-3.5 w-3.5" />Create Profile Manually</Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              {filtered.map((character: any) => (
                <CharacterCard
                  key={character.id}
                  character={character}
                  selected={selectedId === character.id}
                  onClick={() => setSelectedId(character.id)}
                  onEdit={() => setEditCharacter(character)}
                  onDelete={() => setDeleteConfirm(character.id)}
                />
              ))}
            </div>
          )}
        </aside>

        <main className="min-w-0">
          {!selected ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-white/[0.07] py-24 text-center">
              <Film className="h-12 w-12 opacity-20" />
              <p className="text-sm">Select a character to view their complete profile</p>
              <p className="max-w-md text-xs text-muted-foreground">Generated portraits, photo identity anchors and all supplied character direction are retained for later scene generation.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <section className="flex flex-col gap-5 rounded-2xl border border-white/[0.07] bg-white/[0.02] px-5 py-5 sm:flex-row sm:items-start">
                <CharacterAvatar character={selected} size="large" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h2 className="font-serif text-2xl">{selected.name}</h2>
                    {selected.isAiActor && <Badge className="border-0 bg-amber-500/15 text-amber-300"><Star className="mr-1 h-3 w-3" />AI Actor</Badge>}
                    {selectedAttributes.generatedFromPhoto && <Badge className="border-0 bg-blue-500/15 text-blue-300"><Camera className="mr-1 h-3 w-3" />Photo Identity</Badge>}
                    {selectedAttributes.aiGenerated && !selectedAttributes.generatedFromPhoto && <Badge className="border-0 bg-purple-500/15 text-purple-300"><Sparkles className="mr-1 h-3 w-3" />AI Generated</Badge>}
                  </div>
                  <div className="text-sm text-muted-foreground">{selected.role || selectedAttributes.characterRole || "Character"}{selected.nationality ? ` · ${selected.nationality}` : ""}</div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {selected.arcType && <Badge className="border-0 bg-indigo-500/10 text-[10px] text-indigo-300">{selected.arcType}</Badge>}
                    {selected.moralAlignment && <Badge className="border-0 bg-white/[0.07] text-[10px] text-white/60">{selected.moralAlignment}</Badge>}
                    {selected.voiceId && <Badge className="border-0 bg-emerald-500/10 text-[10px] text-emerald-300"><Mic className="mr-1 h-2.5 w-2.5" />Voice set</Badge>}
                  </div>
                </div>
                <Button size="sm" variant="outline" className="h-9 shrink-0 gap-2 border-white/10 text-xs" onClick={() => setEditCharacter(selected)}><Edit3 className="h-3.5 w-3.5" />Edit Profile</Button>
              </section>

              <div className="grid gap-4 md:grid-cols-2">
                {selected.description && (
                  <section className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Description</p>
                    <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed">{selected.description}</p>
                  </section>
                )}
                {(selectedAttributes.faceDnaPrompt || selectedAttributes.detailedDescription) && (
                  <section className="rounded-xl border border-amber-500/15 bg-amber-500/[0.03] px-4 py-3">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Visual Identity Anchor</p>
                    <p className="mt-1.5 line-clamp-6 text-sm leading-relaxed">{selectedAttributes.faceDnaPrompt || selectedAttributes.detailedDescription}</p>
                  </section>
                )}
                {selected.backstory && (
                  <section className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Backstory</p>
                    <p className="mt-1.5 line-clamp-6 text-sm leading-relaxed">{selected.backstory}</p>
                  </section>
                )}
                {selected.motivations && (
                  <section className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Motivations</p>
                    <p className="mt-1.5 text-sm leading-relaxed">{selected.motivations}</p>
                  </section>
                )}
                <section className="rounded-xl border border-indigo-500/15 bg-indigo-500/[0.03] px-4 py-3">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Voice Profile</p>
                  {selected.voiceId ? (
                    <div className="mt-2 flex items-center gap-2">
                      <Volume2 className="h-4 w-4 text-indigo-300" />
                      <div>
                        <div className="text-xs font-semibold">Custom voice assigned</div>
                        <div className="text-[10px] text-muted-foreground">{selected.voiceType || "ElevenLabs voice"}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2">
                      <p className="text-xs text-muted-foreground">{selected.voiceType || "No voice assigned"}</p>
                      <Button size="sm" variant="ghost" className="mt-1 h-7 gap-2 text-xs text-indigo-300" onClick={() => setEditCharacter(selected)}><Mic className="h-3 w-3" />Assign voice</Button>
                    </div>
                  )}
                  {selected.speechPattern && <p className="mt-2 text-xs italic text-muted-foreground">“{selected.speechPattern}”</p>}
                </section>
              </div>

              {hasProject && (
                <Link href="/dubbing-studio">
                  <div className="flex cursor-pointer items-center gap-3 rounded-xl border border-amber-500/15 px-4 py-3 transition-colors hover:bg-white/5">
                    <Mic className="h-5 w-5 shrink-0 text-amber-400" />
                    <div className="flex-1">
                      <div className="text-sm font-semibold">Dub this character’s dialogue</div>
                      <div className="text-xs text-muted-foreground">Open Dubbing Studio</div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              )}
            </div>
          )}
        </main>
      </div>

      {hasProject && <NextStageCTA projectId={projectId} currentStage={2} />}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <CharacterDialog projectId={projectId || undefined} onClose={() => setShowCreate(false)} onSaved={refreshCharacters} />
      </Dialog>
      <Dialog open={showGenerator} onOpenChange={setShowGenerator}>
        <CharacterGeneratorDialog projectId={projectId || undefined} onClose={() => setShowGenerator(false)} onGenerated={handleGenerated} />
      </Dialog>
      <Dialog open={Boolean(editCharacter)} onOpenChange={open => !open && setEditCharacter(null)}>
        {editCharacter && <CharacterDialog character={editCharacter} projectId={projectId || undefined} onClose={() => setEditCharacter(null)} onSaved={refreshCharacters} />}
      </Dialog>
      <Dialog open={deleteConfirm !== null} onOpenChange={open => !open && setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm border-white/10 bg-[#0c0b18]">
          <DialogHeader><DialogTitle>Delete character?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This cannot be undone. Scene references to this character will be unlinked.</p>
          <div className="mt-2 flex gap-2">
            <Button variant="outline" className="flex-1 border-white/10" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button className="flex-1 bg-red-500/80 text-white hover:bg-red-500" onClick={() => deleteConfirm && handleDelete(deleteConfirm)} disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Characters() {
  return (
    <SubscriptionGate feature="Characters" featureKey="canUseCharacters" requiredTier="indie">
      <CharactersInner />
    </SubscriptionGate>
  );
}
