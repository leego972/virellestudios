/**
 * DeepCharacterProfile — Full Hollywood-grade character profile editor
 * Tabs: Identity · Appearance · Personality · Speech · Environment · Wardrobe · Relationships
 */
import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  User, Palette, Brain, MessageSquare, Cloud, Shirt, Users,
  Plus, Trash2, Upload, X, ImageIcon, Loader2, Lock,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { SEASON_OPTIONS, SEASON_LABELS, WEATHER_LABELS, WEATHER_OPTIONS } from "../../../shared/types";

export type WardrobeItem = {
  id: string;
  category: string;
  label: string;
  description: string;
  photoUrl?: string;
  notes?: string;
  season?: string;
  colorPalette?: string;
};

export type RelationshipEntry = {
  id: string;
  characterName: string;
  relationshipType: string;
  description?: string;
};

export type DeepProfile = {
  // Identity
  nationality?: string;
  countryOfOrigin?: string;
  cityOfOrigin?: string;
  dateOfBirth?: string;
  zodiacSign?: string;
  religion?: string;
  language?: string;
  accent?: string;
  occupation?: string;
  education?: string;
  socioeconomicStatus?: string;
  // Personality
  personalityType?: string;
  temperament?: string;
  coreTraits?: string;
  fears?: string;
  desires?: string;
  flaws?: string;
  strengths?: string;
  motivation?: string;
  backstory?: string;
  familyBackground?: string;
  traumaHistory?: string;
  // Speech
  speechPattern?: string;
  vocabulary?: string;
  catchphrase?: string;
  mannerisms?: string;
  // Environment
  preferredWeather?: string;
  preferredSeason?: string;
  preferredTimeOfDay?: string;
  preferredLocation?: string;
  // DNA / Consistency
  faceDnaPrompt?: string;
  bodyDnaPrompt?: string;
  consistencyNotes?: string;
  // Wardrobe
  wardrobe?: WardrobeItem[];
  // Relationships
  relationships?: RelationshipEntry[];
};

const WARDROBE_CATEGORIES = [
  { value: "signature", label: "Signature / Hero Outfit" },
  { value: "formal", label: "Formal / Black Tie" },
  { value: "casual", label: "Casual / Everyday" },
  { value: "action", label: "Action / Combat" },
  { value: "uniform", label: "Uniform / Professional" },
  { value: "period", label: "Period / Historical" },
  { value: "fantasy", label: "Fantasy / Sci-Fi" },
  { value: "sportswear", label: "Sportswear / Athletic" },
  { value: "swimwear", label: "Swimwear / Beach" },
  { value: "sleepwear", label: "Sleepwear / Intimate" },
  { value: "custom", label: "Custom / Other" },
];

const RELATIONSHIP_TYPES = [
  "Protagonist", "Antagonist", "Love Interest", "Best Friend", "Rival",
  "Mentor", "Protege", "Family - Parent", "Family - Sibling", "Family - Child",
  "Ally", "Enemy", "Neutral", "Colleague", "Boss", "Employee",
  "Ex-Partner", "Secret Admirer", "Nemesis", "Informant",
];

const PERSONALITY_TYPES = [
  "INTJ - Architect", "INTP - Logician", "ENTJ - Commander", "ENTP - Debater",
  "INFJ - Advocate", "INFP - Mediator", "ENFJ - Protagonist", "ENFP - Campaigner",
  "ISTJ - Logistician", "ISFJ - Defender", "ESTJ - Executive", "ESFJ - Consul",
  "ISTP - Virtuoso", "ISFP - Adventurer", "ESTP - Entrepreneur", "ESFP - Entertainer",
];

const TEMPERAMENTS = [
  "Choleric (Dominant, Ambitious)", "Sanguine (Optimistic, Social)",
  "Melancholic (Analytical, Perfectionist)", "Phlegmatic (Calm, Reliable)",
];

const SOCIOECONOMIC = [
  "Extreme Poverty", "Working Poor", "Lower Middle Class", "Middle Class",
  "Upper Middle Class", "Wealthy", "Ultra-High Net Worth", "Royalty / Nobility",
];

const EDUCATION_LEVELS = [
  "No Formal Education", "Primary School", "High School", "Vocational / Trade",
  "Some College", "Bachelor's Degree", "Master's Degree", "Doctorate / PhD",
  "Military Academy", "Street Smart / Self-Taught",
];

const SPEECH_PATTERNS = [
  "Eloquent & Formal", "Casual & Relaxed", "Terse & Minimal", "Verbose & Elaborate",
  "Poetic & Metaphorical", "Blunt & Direct", "Sarcastic & Witty", "Nervous & Hesitant",
  "Commanding & Authoritative", "Soft-spoken & Gentle", "Aggressive & Loud",
  "Whisper-quiet & Mysterious",
];

const VOCABULARY_LEVELS = [
  "Simple / Uneducated", "Average / Everyday", "Educated / Professional",
  "Academic / Intellectual", "Technical / Jargon-heavy", "Street Slang",
  "Archaic / Old-fashioned", "Foreign Phrases Mixed In",
];

const TIME_OF_DAY_PREFS = [
  "Dawn / Early Riser", "Morning", "Midday", "Afternoon", "Evening",
  "Night Owl", "Midnight", "No Preference",
];

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

interface Props {
  profile: DeepProfile;
  onChange: (profile: DeepProfile) => void;
  characterName?: string;
}

export function DeepCharacterProfile({ profile, onChange, characterName }: Props) {
  const uploadMutation = trpc.upload.image.useMutation();
  const [uploadingWardrobeId, setUploadingWardrobeId] = useState<string | null>(null);
  const wardrobeFileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const set = (key: keyof DeepProfile, value: any) =>
    onChange({ ...profile, [key]: value });

  // ── Wardrobe helpers ────────────────────────────────────────────────────────
  const addWardrobeItem = () => {
    const newItem: WardrobeItem = {
      id: uid(),
      category: "signature",
      label: "",
      description: "",
    };
    onChange({ ...profile, wardrobe: [...(profile.wardrobe || []), newItem] });
  };

  const updateWardrobeItem = (id: string, updates: Partial<WardrobeItem>) => {
    onChange({
      ...profile,
      wardrobe: (profile.wardrobe || []).map(w => w.id === id ? { ...w, ...updates } : w),
    });
  };

  const removeWardrobeItem = (id: string) => {
    onChange({ ...profile, wardrobe: (profile.wardrobe || []).filter(w => w.id !== id) });
  };

  const handleWardrobePhotoUpload = useCallback(async (
    wardrobeId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Photo must be under 10MB");
      return;
    }
    setUploadingWardrobeId(wardrobeId);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        const result = await uploadMutation.mutateAsync({
          base64,
          filename: file.name,
          contentType: file.type,
        });
        updateWardrobeItem(wardrobeId, { photoUrl: result.url });
        setUploadingWardrobeId(null);
        toast.success("Costume photo uploaded");
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error("Upload failed");
      setUploadingWardrobeId(null);
    }
  }, [uploadMutation]);

  // ── Relationship helpers ────────────────────────────────────────────────────
  const addRelationship = () => {
    const newRel: RelationshipEntry = {
      id: uid(),
      characterName: "",
      relationshipType: "Ally",
    };
    onChange({ ...profile, relationships: [...(profile.relationships || []), newRel] });
  };

  const updateRelationship = (id: string, updates: Partial<RelationshipEntry>) => {
    onChange({
      ...profile,
      relationships: (profile.relationships || []).map(r => r.id === id ? { ...r, ...updates } : r),
    });
  };

  const removeRelationship = (id: string) => {
    onChange({ ...profile, relationships: (profile.relationships || []).filter(r => r.id !== id) });
  };

  return (
    <Tabs defaultValue="identity" className="w-full">
      <TabsList className="grid grid-cols-4 sm:grid-cols-7 h-auto gap-0.5 p-1 mb-4">
        <TabsTrigger value="identity" className="text-xs px-2 py-1.5 flex items-center gap-1">
          <User className="h-3 w-3" /><span className="hidden sm:inline">Identity</span>
        </TabsTrigger>
        <TabsTrigger value="personality" className="text-xs px-2 py-1.5 flex items-center gap-1">
          <Brain className="h-3 w-3" /><span className="hidden sm:inline">Personality</span>
        </TabsTrigger>
        <TabsTrigger value="speech" className="text-xs px-2 py-1.5 flex items-center gap-1">
          <MessageSquare className="h-3 w-3" /><span className="hidden sm:inline">Speech</span>
        </TabsTrigger>
        <TabsTrigger value="environment" className="text-xs px-2 py-1.5 flex items-center gap-1">
          <Cloud className="h-3 w-3" /><span className="hidden sm:inline">Environment</span>
        </TabsTrigger>
        <TabsTrigger value="wardrobe" className="text-xs px-2 py-1.5 flex items-center gap-1">
          <Shirt className="h-3 w-3" /><span className="hidden sm:inline">Wardrobe</span>
        </TabsTrigger>
        <TabsTrigger value="relationships" className="text-xs px-2 py-1.5 flex items-center gap-1">
          <Users className="h-3 w-3" /><span className="hidden sm:inline">Relations</span>
        </TabsTrigger>
        <TabsTrigger value="dna" className="text-xs px-2 py-1.5 flex items-center gap-1">
          <Lock className="h-3 w-3" /><span className="hidden sm:inline">DNA Lock</span>
        </TabsTrigger>
      </TabsList>

      {/* ── IDENTITY TAB ─────────────────────────────────────────────────────── */}
      <TabsContent value="identity" className="space-y-4 mt-0">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Nationality</Label>
            <Input placeholder="e.g. American, French, Nigerian" value={profile.nationality || ""} onChange={e => set("nationality", e.target.value)} className="h-9 text-sm bg-background/50" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Country of Origin</Label>
            <Input placeholder="e.g. United States, France" value={profile.countryOfOrigin || ""} onChange={e => set("countryOfOrigin", e.target.value)} className="h-9 text-sm bg-background/50" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">City of Origin</Label>
            <Input placeholder="e.g. New York, Paris, Lagos" value={profile.cityOfOrigin || ""} onChange={e => set("cityOfOrigin", e.target.value)} className="h-9 text-sm bg-background/50" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Date of Birth</Label>
            <Input placeholder="e.g. March 15, 1985" value={profile.dateOfBirth || ""} onChange={e => set("dateOfBirth", e.target.value)} className="h-9 text-sm bg-background/50" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Zodiac Sign</Label>
            <Select value={profile.zodiacSign || ""} onValueChange={v => set("zodiacSign", v)}>
              <SelectTrigger className="h-9 text-sm bg-background/50"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"].map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Religion / Belief System</Label>
            <Input placeholder="e.g. Catholic, Atheist, Buddhist" value={profile.religion || ""} onChange={e => set("religion", e.target.value)} className="h-9 text-sm bg-background/50" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Primary Language</Label>
            <Input placeholder="e.g. English, Spanish, Mandarin" value={profile.language || ""} onChange={e => set("language", e.target.value)} className="h-9 text-sm bg-background/50" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Accent</Label>
            <Input placeholder="e.g. Southern American, British RP, French" value={profile.accent || ""} onChange={e => set("accent", e.target.value)} className="h-9 text-sm bg-background/50" />
          </div>
        </div>
        <Separator />
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Occupation / Career</Label>
            <Input placeholder="e.g. Detective, CEO, Street Artist" value={profile.occupation || ""} onChange={e => set("occupation", e.target.value)} className="h-9 text-sm bg-background/50" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Education Level</Label>
            <Select value={profile.education || ""} onValueChange={v => set("education", v)}>
              <SelectTrigger className="h-9 text-sm bg-background/50"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {EDUCATION_LEVELS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Socioeconomic Status</Label>
          <Select value={profile.socioeconomicStatus || ""} onValueChange={v => set("socioeconomicStatus", v)}>
            <SelectTrigger className="h-9 text-sm bg-background/50"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              {SOCIOECONOMIC.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </TabsContent>

      {/* ── PERSONALITY TAB ──────────────────────────────────────────────────── */}
      <TabsContent value="personality" className="space-y-4 mt-0">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Personality Type (MBTI)</Label>
            <Select value={profile.personalityType || ""} onValueChange={v => set("personalityType", v)}>
              <SelectTrigger className="h-9 text-sm bg-background/50"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {PERSONALITY_TYPES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Temperament</Label>
            <Select value={profile.temperament || ""} onValueChange={v => set("temperament", v)}>
              <SelectTrigger className="h-9 text-sm bg-background/50"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {TEMPERAMENTS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Core Personality Traits</Label>
          <Input placeholder="e.g. Ruthless, Loyal, Compassionate, Paranoid" value={profile.coreTraits || ""} onChange={e => set("coreTraits", e.target.value)} className="h-9 text-sm bg-background/50" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Greatest Fears</Label>
            <Textarea placeholder="e.g. Abandonment, failure, losing control..." value={profile.fears || ""} onChange={e => set("fears", e.target.value)} className="min-h-[80px] text-sm bg-background/50 resize-y" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Deepest Desires</Label>
            <Textarea placeholder="e.g. Power, love, redemption, freedom..." value={profile.desires || ""} onChange={e => set("desires", e.target.value)} className="min-h-[80px] text-sm bg-background/50 resize-y" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Fatal Flaws</Label>
            <Textarea placeholder="e.g. Pride, jealousy, impulsiveness..." value={profile.flaws || ""} onChange={e => set("flaws", e.target.value)} className="min-h-[80px] text-sm bg-background/50 resize-y" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Key Strengths</Label>
            <Textarea placeholder="e.g. Intelligence, courage, empathy..." value={profile.strengths || ""} onChange={e => set("strengths", e.target.value)} className="min-h-[80px] text-sm bg-background/50 resize-y" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Core Motivation / Goal</Label>
          <Input placeholder="e.g. Avenge their family, prove their worth, find belonging" value={profile.motivation || ""} onChange={e => set("motivation", e.target.value)} className="h-9 text-sm bg-background/50" />
        </div>
        <Separator />
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Backstory</Label>
          <Textarea placeholder="Full character backstory — where they came from, what shaped them, key life events..." value={profile.backstory || ""} onChange={e => set("backstory", e.target.value)} className="min-h-[120px] text-sm bg-background/50 resize-y" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Family Background</Label>
            <Textarea placeholder="Parents, siblings, upbringing..." value={profile.familyBackground || ""} onChange={e => set("familyBackground", e.target.value)} className="min-h-[80px] text-sm bg-background/50 resize-y" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Trauma / Defining Moments</Label>
            <Textarea placeholder="Key traumas or pivotal events that changed them..." value={profile.traumaHistory || ""} onChange={e => set("traumaHistory", e.target.value)} className="min-h-[80px] text-sm bg-background/50 resize-y" />
          </div>
        </div>
      </TabsContent>

      {/* ── SPEECH TAB ───────────────────────────────────────────────────────── */}
      <TabsContent value="speech" className="space-y-4 mt-0">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Speech Pattern</Label>
            <Select value={profile.speechPattern || ""} onValueChange={v => set("speechPattern", v)}>
              <SelectTrigger className="h-9 text-sm bg-background/50"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {SPEECH_PATTERNS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Vocabulary Level</Label>
            <Select value={profile.vocabulary || ""} onValueChange={v => set("vocabulary", v)}>
              <SelectTrigger className="h-9 text-sm bg-background/50"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {VOCABULARY_LEVELS.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Signature Catchphrase / Saying</Label>
          <Input placeholder="e.g. I don't make promises. I make plans." value={profile.catchphrase || ""} onChange={e => set("catchphrase", e.target.value)} className="h-9 text-sm bg-background/50" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Physical Mannerisms & Habits</Label>
          <Textarea placeholder="e.g. Taps fingers when thinking, never makes eye contact, always adjusts collar when nervous, cracks knuckles before a fight..." value={profile.mannerisms || ""} onChange={e => set("mannerisms", e.target.value)} className="min-h-[100px] text-sm bg-background/50 resize-y" />
        </div>
        <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong className="text-foreground">AI Script Note:</strong> Speech pattern and mannerisms are injected into the AI script generator to ensure {characterName || "this character"} speaks and behaves consistently across all scenes.
          </p>
        </div>
      </TabsContent>

      {/* ── ENVIRONMENT TAB ──────────────────────────────────────────────────── */}
      <TabsContent value="environment" className="space-y-4 mt-0">
        <p className="text-xs text-muted-foreground">
          Define where this character naturally belongs. The AI uses these preferences when placing them in scenes to ensure environmental authenticity.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Preferred Weather</Label>
            <Select value={profile.preferredWeather || ""} onValueChange={v => set("preferredWeather", v)}>
              <SelectTrigger className="h-9 text-sm bg-background/50"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {WEATHER_OPTIONS.map(w => (
                  <SelectItem key={w} value={w}>{WEATHER_LABELS[w] || w}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Preferred Season</Label>
            <Select value={profile.preferredSeason || ""} onValueChange={v => set("preferredSeason", v)}>
              <SelectTrigger className="h-9 text-sm bg-background/50"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {SEASON_OPTIONS.map(s => (
                  <SelectItem key={s} value={s}>{SEASON_LABELS[s] || s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Preferred Time of Day</Label>
            <Select value={profile.preferredTimeOfDay || ""} onValueChange={v => set("preferredTimeOfDay", v)}>
              <SelectTrigger className="h-9 text-sm bg-background/50"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {TIME_OF_DAY_PREFS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Preferred Environment / Location</Label>
            <Input placeholder="e.g. Urban rooftops, deep forest, underground clubs" value={profile.preferredLocation || ""} onChange={e => set("preferredLocation", e.target.value)} className="h-9 text-sm bg-background/50" />
          </div>
        </div>
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <p className="text-xs text-amber-600 dark:text-amber-400 leading-relaxed">
            <strong>Director's Note:</strong> These preferences inform the AI when generating scenes featuring this character — the environment will feel natural to who they are.
          </p>
        </div>
      </TabsContent>

      {/* ── WARDROBE TAB ─────────────────────────────────────────────────────── */}
      <TabsContent value="wardrobe" className="space-y-4 mt-0">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Costume & Wardrobe Gallery</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Upload reference photos for each outfit. The AI uses these to dress {characterName || "the character"} consistently in every scene.
            </p>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={addWardrobeItem}>
            <Plus className="h-3.5 w-3.5 mr-1" />Add Outfit
          </Button>
        </div>

        {(!profile.wardrobe || profile.wardrobe.length === 0) ? (
          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
            <Shirt className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No wardrobe items yet</p>
            <p className="text-xs text-muted-foreground mt-1">Add outfits to build the costume gallery</p>
            <Button type="button" size="sm" variant="outline" className="mt-3" onClick={addWardrobeItem}>
              <Plus className="h-3.5 w-3.5 mr-1" />Add First Outfit
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {(profile.wardrobe || []).map((item) => (
              <div key={item.id} className="border border-border rounded-lg p-4 space-y-3 bg-muted/20">
                <div className="flex items-start gap-3">
                  {/* Costume Photo Upload */}
                  <div className="shrink-0">
                    {item.photoUrl ? (
                      <div className="relative w-20 h-24 rounded-md overflow-hidden bg-muted border border-border group">
                        <img src={item.photoUrl} alt={item.label || "Costume"} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                          <button
                            type="button"
                            className="h-6 w-6 bg-white/20 hover:bg-white/40 rounded-full flex items-center justify-center"
                            onClick={() => wardrobeFileRefs.current[item.id]?.click()}
                          >
                            <Upload className="h-3 w-3 text-white" />
                          </button>
                          <button
                            type="button"
                            className="h-6 w-6 bg-red-500/60 hover:bg-red-500/80 rounded-full flex items-center justify-center"
                            onClick={() => updateWardrobeItem(item.id, { photoUrl: undefined })}
                          >
                            <X className="h-3 w-3 text-white" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="w-20 h-24 rounded-md border-2 border-dashed border-border hover:border-primary/50 bg-muted/30 hover:bg-muted/50 flex flex-col items-center justify-center gap-1 transition-colors"
                        onClick={() => wardrobeFileRefs.current[item.id]?.click()}
                        disabled={uploadingWardrobeId === item.id}
                      >
                        {uploadingWardrobeId === item.id ? (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        ) : (
                          <>
                            <ImageIcon className="h-4 w-4 text-muted-foreground/50" />
                            <span className="text-[9px] text-muted-foreground text-center leading-tight">Upload<br/>Photo</span>
                          </>
                        )}
                      </button>
                    )}
                    <input
                      ref={el => { wardrobeFileRefs.current[item.id] = el; }}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleWardrobePhotoUpload(item.id, e)}
                    />
                  </div>

                  {/* Outfit Details */}
                  <div className="flex-1 space-y-2 min-w-0">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Outfit Label</Label>
                        <Input
                          placeholder='e.g. "The Heist Suit", "Beach Scene Look"'
                          value={item.label}
                          onChange={e => updateWardrobeItem(item.id, { label: e.target.value })}
                          className="h-8 text-sm bg-background/50"
                        />
                      </div>
                      <div className="w-40 space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Category</Label>
                        <Select value={item.category} onValueChange={v => updateWardrobeItem(item.id, { category: v })}>
                          <SelectTrigger className="h-8 text-xs bg-background/50"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {WARDROBE_CATEGORIES.map(c => (
                              <SelectItem key={c.value} value={c.value} className="text-xs">{c.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <button
                        type="button"
                        className="mt-5 h-8 w-8 shrink-0 flex items-center justify-center rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        onClick={() => removeWardrobeItem(item.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Outfit Description</Label>
                      <Textarea
                        placeholder="Describe the outfit in detail — fabrics, colors, fit, style, accessories, shoes, jewelry..."
                        value={item.description}
                        onChange={e => updateWardrobeItem(item.id, { description: e.target.value })}
                        className="min-h-[60px] text-sm bg-background/50 resize-y"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Color Palette</Label>
                        <Input placeholder="e.g. Navy, gold, cream" value={item.colorPalette || ""} onChange={e => updateWardrobeItem(item.id, { colorPalette: e.target.value })} className="h-8 text-sm bg-background/50" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Season / Context</Label>
                        <Select value={item.season || ""} onValueChange={v => updateWardrobeItem(item.id, { season: v })}>
                          <SelectTrigger className="h-8 text-xs bg-background/50"><SelectValue placeholder="Any" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="any">Any Season</SelectItem>
                            {SEASON_OPTIONS.map(s => (
                              <SelectItem key={s} value={s} className="text-xs">{SEASON_LABELS[s] || s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {item.photoUrl && (
                      <div className="flex items-center gap-1.5">
                        <Badge variant="secondary" className="text-[10px] bg-green-500/10 text-green-600 border-green-500/20">
                          <ImageIcon className="h-2.5 w-2.5 mr-1" />Photo Reference Locked
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="p-3 bg-violet-500/10 border border-violet-500/20 rounded-lg">
          <p className="text-xs text-violet-600 dark:text-violet-400 leading-relaxed">
            <strong>AI Wardrobe System:</strong> When a scene specifies a wardrobe category, the AI references the uploaded costume photo and description to dress {characterName || "this character"} in that exact outfit — maintaining visual consistency across every scene.
          </p>
        </div>
      </TabsContent>

      {/* ── RELATIONSHIPS TAB ────────────────────────────────────────────────── */}
      <TabsContent value="relationships" className="space-y-4 mt-0">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Character Relationships</p>
            <p className="text-xs text-muted-foreground mt-0.5">Define how {characterName || "this character"} relates to others in the film.</p>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={addRelationship}>
            <Plus className="h-3.5 w-3.5 mr-1" />Add Relationship
          </Button>
        </div>

        {(!profile.relationships || profile.relationships.length === 0) ? (
          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
            <Users className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No relationships defined yet</p>
            <Button type="button" size="sm" variant="outline" className="mt-3" onClick={addRelationship}>
              <Plus className="h-3.5 w-3.5 mr-1" />Add Relationship
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {(profile.relationships || []).map((rel) => (
              <div key={rel.id} className="border border-border rounded-lg p-3 space-y-2 bg-muted/20">
                <div className="flex items-start gap-2">
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Character Name</Label>
                      <Input
                        placeholder="Other character's name"
                        value={rel.characterName}
                        onChange={e => updateRelationship(rel.id, { characterName: e.target.value })}
                        className="h-8 text-sm bg-background/50"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Relationship Type</Label>
                      <Select value={rel.relationshipType} onValueChange={v => updateRelationship(rel.id, { relationshipType: v })}>
                        <SelectTrigger className="h-8 text-xs bg-background/50"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {RELATIONSHIP_TYPES.map(r => <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="mt-5 h-8 w-8 shrink-0 flex items-center justify-center rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    onClick={() => removeRelationship(rel.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Relationship Description</Label>
                  <Textarea
                    placeholder="Describe the dynamic — history, tension, love, betrayal, loyalty..."
                    value={rel.description || ""}
                    onChange={e => updateRelationship(rel.id, { description: e.target.value })}
                    className="min-h-[60px] text-sm bg-background/50 resize-y"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </TabsContent>

      {/* ── DNA LOCK TAB ─────────────────────────────────────────────────────── */}
      <TabsContent value="dna" className="space-y-4 mt-0">
        <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Lock className="h-4 w-4 text-green-600" />
            <p className="text-sm font-medium text-green-700 dark:text-green-400">Character DNA Lock System</p>
          </div>
          <p className="text-xs text-green-600 dark:text-green-500 leading-relaxed">
            These prompts are injected into every single AI generation call for this character — locking their face, body, and appearance permanently. Only wardrobe and makeup change between scenes.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Face DNA Prompt</Label>
          <p className="text-xs text-muted-foreground">Exact facial description used in every generation. Be as specific as possible.</p>
          <Textarea
            placeholder="e.g. A 35-year-old African-American man with a strong square jaw, high cheekbones, deep-set dark brown eyes with heavy brows, a broad nose, full lips, smooth dark brown skin, short natural hair with a slight fade, a faint scar above the left eyebrow — same face every time, photorealistic, hyperdetailed..."
            value={profile.faceDnaPrompt || ""}
            onChange={e => set("faceDnaPrompt", e.target.value)}
            className="min-h-[120px] text-sm bg-background/50 resize-y font-mono text-xs"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Body DNA Prompt</Label>
          <p className="text-xs text-muted-foreground">Body type, posture, and physical presence — locked across all scenes.</p>
          <Textarea
            placeholder="e.g. 6'2 athletic muscular build, broad shoulders, long legs, upright commanding posture, moves with deliberate controlled precision — same body every time..."
            value={profile.bodyDnaPrompt || ""}
            onChange={e => set("bodyDnaPrompt", e.target.value)}
            className="min-h-[80px] text-sm bg-background/50 resize-y font-mono text-xs"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Consistency Notes for AI</Label>
          <p className="text-xs text-muted-foreground">Any additional notes to ensure the AI keeps this character consistent.</p>
          <Textarea
            placeholder="e.g. Always has a slight stubble, never fully clean-shaven. The scar above the left eyebrow must always be visible. Eyes are always intense and focused..."
            value={profile.consistencyNotes || ""}
            onChange={e => set("consistencyNotes", e.target.value)}
            className="min-h-[80px] text-sm bg-background/50 resize-y"
          />
        </div>

        <div className="p-3 bg-muted/30 rounded-lg border border-border/50 space-y-2">
          <p className="text-xs font-medium">How Character DNA Works</p>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>Face DNA + Body DNA are prepended to every scene image generation prompt</li>
            <li>The AI reference photo (uploaded on the main character card) is used as an image reference</li>
            <li>Wardrobe category selected per-scene tells the AI which outfit to dress them in</li>
            <li>Result: the same person, different clothes, every single scene</li>
          </ul>
        </div>
      </TabsContent>
    </Tabs>
  );
}
