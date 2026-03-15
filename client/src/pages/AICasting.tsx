import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft, Users, Search, Star, CheckCircle2,
  Loader2, Mic, Sparkles, Filter,
} from "lucide-react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { AI_PERFORMANCE_STYLE_OPTIONS, AI_PERFORMANCE_STYLE_LABELS } from "@shared/types";

// AI Actor archetype templates — each creates a real character in the project when cast
const AI_ACTOR_LIBRARY = [
  { id: "actor-001", name: "Marcus Vane", archetype: "Brooding Anti-Hero", age: "35-45", ethnicity: "Mixed", specialty: "Drama / Thriller", rating: 4.9, uses: 12840, description: "A morally conflicted man driven by past trauma. Intense, guarded, and capable of both great violence and unexpected tenderness." },
  { id: "actor-002", name: "Elara Solis", archetype: "Fierce Protagonist", age: "25-35", ethnicity: "Latina", specialty: "Action / Sci-Fi", rating: 4.8, uses: 9320, description: "Relentlessly determined and physically formidable. Leads from the front, earns loyalty through action, not words." },
  { id: "actor-003", name: "Jin Harlow", archetype: "Charming Rogue", age: "28-38", ethnicity: "East Asian", specialty: "Comedy / Romance", rating: 4.7, uses: 7650, description: "Disarmingly charismatic with a quick wit and flexible moral compass. Hides real depth behind a mask of levity." },
  { id: "actor-004", name: "Nadia Voss", archetype: "Cold Intellectual", age: "30-40", ethnicity: "Eastern European", specialty: "Thriller / Sci-Fi", rating: 4.9, uses: 11200, description: "Brilliant, precise, and emotionally detached. Every action is calculated. Vulnerability is a liability she refuses to show." },
  { id: "actor-005", name: "Darius Cole", archetype: "Charismatic Leader", age: "40-55", ethnicity: "African American", specialty: "Drama / Action", rating: 4.8, uses: 8900, description: "Commands rooms without raising his voice. Inspires fierce loyalty. Carries the weight of others' lives with quiet dignity." },
  { id: "actor-006", name: "Yuki Tanaka", archetype: "Quiet Intensity", age: "20-30", ethnicity: "Japanese", specialty: "Drama / Horror", rating: 4.6, uses: 5430, description: "Says little but observes everything. Still waters run deep — when she acts, it is decisive and irreversible." },
  { id: "actor-007", name: "Sofia Reyes", archetype: "Warm Matriarch", age: "45-60", ethnicity: "Hispanic", specialty: "Drama / Family", rating: 4.7, uses: 6780, description: "The emotional anchor of every scene she inhabits. Fierce protector, patient listener, and the moral compass of her world." },
  { id: "actor-008", name: "Aleksei Morin", archetype: "Menacing Villain", age: "38-55", ethnicity: "Russian", specialty: "Thriller / Action", rating: 4.9, uses: 14200, description: "Calm, methodical, and utterly without remorse. His politeness is the most frightening thing about him." },
  { id: "actor-009", name: "Priya Anand", archetype: "Idealistic Rebel", age: "22-32", ethnicity: "South Asian", specialty: "Drama / Sci-Fi", rating: 4.7, uses: 6100, description: "Passionate about justice, impatient with compromise. Her idealism is both her greatest strength and her fatal flaw." },
  { id: "actor-010", name: "Tobias Wren", archetype: "Reluctant Hero", age: "30-42", ethnicity: "British", specialty: "Action / Drama", rating: 4.8, uses: 7800, description: "Never wanted to be the one who had to save anything. Does it anyway, every time, because no one else will." },
  { id: "actor-011", name: "Camille Dubois", archetype: "Femme Fatale", age: "28-40", ethnicity: "French", specialty: "Thriller / Romance", rating: 4.9, uses: 10500, description: "Devastatingly beautiful and twice as dangerous. Every interaction is a performance, every smile a calculation." },
  { id: "actor-012", name: "Omar Khalil", archetype: "Wise Mentor", age: "55-70", ethnicity: "Middle Eastern", specialty: "Drama / Fantasy", rating: 4.8, uses: 9200, description: "Has seen enough of the world to know its patterns. Teaches through questions, not answers. His silence carries more weight than most people's speeches." },
];

export default function AICasting() {
  const [, navigate] = useLocation();
  const params = useParams<{ projectId: string }>();
  const projectId = parseInt(params.projectId || "0");

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedActors, setSelectedActors] = useState<string[]>([]);
  const [performanceStyle, setPerformanceStyle] = useState("method-naturalistic");
  const [castingNotes, setCastingNotes] = useState("");
  const [voiceDescription, setVoiceDescription] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [filterSpecialty, setFilterSpecialty] = useState("all");
  const [castSuccess, setCastSuccess] = useState(false);

  const createCharacterMutation = trpc.character.create.useMutation();

  const specialties = ["all", "Drama", "Action", "Thriller", "Sci-Fi", "Comedy", "Romance", "Horror", "Family"];

  const filteredActors = AI_ACTOR_LIBRARY.filter((actor) => {
    const matchesSearch =
      !searchQuery ||
      actor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      actor.archetype.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSpecialty =
      filterSpecialty === "all" || actor.specialty.includes(filterSpecialty);
    return matchesSearch && matchesSpecialty;
  });

  const toggleActor = (id: string) => {
    setSelectedActors((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const handleCast = async () => {
    if (selectedActors.length === 0) {
      toast.error("Select at least one AI actor to cast");
      return;
    }
    setIsGenerating(true);
    setCastSuccess(false);
    try {
      const selectedActorData = AI_ACTOR_LIBRARY.filter((a) => selectedActors.includes(a.id));
      // Create a real character record in the project for each selected actor
      const results = await Promise.allSettled(
        selectedActorData.map((actor) =>
          createCharacterMutation.mutateAsync({
            projectId,
            name: actor.name,
            description: actor.description,
            role: actor.archetype,
            arcType: actor.archetype,
            performanceStyle,
            castingNotes: castingNotes
              ? `${castingNotes}\n\n[Cast from AI Actor Library — Archetype: ${actor.archetype}, Specialty: ${actor.specialty}]`
              : `Cast from AI Actor Library. Archetype: ${actor.archetype}. Specialty: ${actor.specialty}. Age range: ${actor.age}. Ethnicity: ${actor.ethnicity}.`,
            voiceDescription: voiceDescription || undefined,
            isAiActor: true,
            aiActorId: actor.id,
          })
        )
      );
      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected").length;
      if (succeeded > 0) {
        setCastSuccess(true);
        toast.success(
          `${succeeded} AI actor${succeeded > 1 ? "s" : ""} added to your project as characters. You can now view and edit them in the Characters tab.`
        );
        setSelectedActors([]);
        setCastingNotes("");
        setVoiceDescription("");
      }
      if (failed > 0) {
        toast.error(`${failed} actor${failed > 1 ? "s" : ""} could not be cast. Please try again.`);
      }
    } catch (err: any) {
      toast.error(err?.message || "Casting failed. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border/40 bg-black/20 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/projects/${projectId}`)}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-400" />
                AI Casting System
              </h1>
              <p className="text-xs text-muted-foreground">
                {selectedActors.length > 0
                  ? `${selectedActors.length} actor${selectedActors.length > 1 ? "s" : ""} selected — set performance direction, then cast`
                  : "Browse archetypes and cast them as characters in your project"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {castSuccess && (
              <Button
                size="sm"
                variant="outline"
                className="border-amber-500/40 text-amber-400 text-xs"
                onClick={() => navigate(`/projects/${projectId}`)}
              >
                View Characters
              </Button>
            )}
            <Button
              size="sm"
              className="bg-amber-500 hover:bg-amber-600 text-black"
              onClick={handleCast}
              disabled={isGenerating || selectedActors.length === 0}
            >
              {isGenerating ? (
                <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Casting...</>
              ) : (
                <><CheckCircle2 className="w-4 h-4 mr-1" /> Cast to Project ({selectedActors.length})</>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-3 md:p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Actor Library */}
        <div className="col-span-2 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search actors by name or archetype..."
                className="pl-8 h-9 text-sm" inputMode="search" autoCapitalize="off" enterKeyHint="search" />
            </div>
            <Select value={filterSpecialty} onValueChange={setFilterSpecialty}>
              <SelectTrigger className="w-40 h-9 text-sm">
                <Filter className="w-3 h-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {specialties.map((s) => (
                  <SelectItem key={s} value={s} className="text-sm">
                    {s === "all" ? "All Genres" : s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <ScrollArea className="h-[calc(100vh-220px)]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pr-2">
              {filteredActors.map((actor) => (
                <button
                  key={actor.id}
                  onClick={() => toggleActor(actor.id)}
                  className={`text-left p-4 rounded-lg border transition-all ${
                    selectedActors.includes(actor.id)
                      ? "border-amber-500 bg-amber-500/10"
                      : "border-border/40 bg-black/20 hover:border-amber-500/40"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium">{actor.name}</p>
                      <p className="text-xs text-amber-400">{actor.archetype}</p>
                    </div>
                    {selectedActors.includes(actor.id) && (
                      <CheckCircle2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{actor.description}</p>
                  <div className="flex flex-wrap gap-1 mb-2">
                    <Badge variant="outline" className="text-xs h-4 border-border/40">
                      {actor.age}
                    </Badge>
                    <Badge variant="outline" className="text-xs h-4 border-border/40">
                      {actor.ethnicity}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{actor.specialty}</span>
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                      <span className="text-xs text-amber-400">{actor.rating}</span>
                      <span className="text-xs text-muted-foreground">({(actor.uses / 1000).toFixed(1)}k uses)</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Performance Settings */}
        <div className="space-y-4">
          <Card className="border-amber-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Performance Direction
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Performance Style</Label>
                <Select value={performanceStyle} onValueChange={setPerformanceStyle}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AI_PERFORMANCE_STYLE_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt} className="text-xs">
                        {AI_PERFORMANCE_STYLE_LABELS[opt] || opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Casting Notes</Label>
                <Textarea
                  value={castingNotes}
                  onChange={(e) => setCastingNotes(e.target.value)}
                  placeholder="Director's notes for this actor's performance (e.g., 'Plays a corrupt detective who hides his guilt behind charm and authority')..."
                  className="text-xs min-h-[80px] resize-none" autoCapitalize="sentences" autoCorrect="on" enterKeyHint="done" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1">
                  <Mic className="w-3 h-3" /> Voice Description
                </Label>
                <Textarea
                  value={voiceDescription}
                  onChange={(e) => setVoiceDescription(e.target.value)}
                  placeholder="Describe the character's voice (e.g., 'Deep, gravelly baritone with a slight Southern drawl. Speaks slowly and deliberately')..."
                  className="text-xs min-h-[60px] resize-none" autoCapitalize="sentences" autoCorrect="on" enterKeyHint="done" />
              </div>
              <p className="text-xs text-muted-foreground pt-1">
                These settings apply to all selected actors when cast. You can edit each character individually after casting.
              </p>
            </CardContent>
          </Card>

          {selectedActors.length > 0 && (
            <Card className="border-amber-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Selected Cast ({selectedActors.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {selectedActors.map((id) => {
                    const actor = AI_ACTOR_LIBRARY.find((a) => a.id === id);
                    return actor ? (
                      <div key={id} className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium">{actor.name}</p>
                          <p className="text-xs text-muted-foreground">{actor.archetype}</p>
                        </div>
                        <button onClick={() => toggleActor(id)}>
                          <Badge variant="outline" className="text-xs border-amber-500/40 text-amber-400 cursor-pointer hover:bg-red-500/10 hover:border-red-500/40 hover:text-red-400">
                            Remove
                          </Badge>
                        </button>
                      </div>
                    ) : null;
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
