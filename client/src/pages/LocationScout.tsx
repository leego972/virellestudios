import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useRoute, useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { MapPin, Plus, Sparkles, Trash2, Image, ArrowLeft, Loader2, PenLine } from "lucide-react";
import { NextStageCTA } from "@/components/NextStageCTA";

const LOCATION_TYPES = [
  "Written Background", "Iconic Landmark", "City Street", "Suburban Home", "Mansion", "Apartment", "Office Building",
  "Warehouse", "Forest", "Beach", "Desert", "Snowy Mountain", "Mountain", "Lake", "River",
  "Restaurant", "Bar", "Hospital Exterior", "Hospital Interior", "School", "Church", "Airport", "Train Station",
  "Rooftop", "Underground", "Castle", "Farm", "Island", "Bridge", "Tunnel", "Custom Reference",
];

const ICONIC_LOCATION_PRESETS = [
  { name: "Eiffel Tower — Paris", locationType: "Iconic Landmark", description: "Parisian landmark setting with Eiffel Tower silhouette, elegant city lights, stone streets and cinematic French atmosphere.", notes: "Use as a legal/transformative AI reference. Avoid claiming official endorsement. AI can generate nearby streets, rooftops, cafes or interiors unless the scene specifies otherwise.", tags: ["Paris", "landmark", "romantic", "city", "Europe"] },
  { name: "Venice Canals", locationType: "Iconic Landmark", description: "Venetian canal setting with water reflections, arched bridges, aged facades, narrow alleys and gondola-like movement.", notes: "Can expand into palazzo interiors, canal-side cafes, bridges or moonlit water approaches.", tags: ["Venice", "canals", "water", "European", "romantic"] },
  { name: "Open Desert", locationType: "Desert", description: "Wide cinematic desert with dunes, hard sunlight, heat haze, distant ridges and survival-film scale.", notes: "Can generate camp sites, roads, abandoned outposts, caves, vehicles or oasis interiors when needed.", tags: ["desert", "dunes", "survival", "wide", "sunlight"] },
  { name: "Snowy Mountains", locationType: "Snowy Mountain", description: "High alpine snow environment with icy peaks, pine lines, fog, cliff edges and cold blue-white atmosphere.", notes: "Can expand into cabins, mountain roads, ski-lodge interiors, rescue bases or caves.", tags: ["snow", "mountains", "alpine", "winter", "cold"] },
  { name: "Cinematic Beach", locationType: "Beach", description: "Open coastal beach with surf, sand, cliffs or palm silhouettes, sunrise/sunset options and clean cinematic horizons.", notes: "Can expand into beach houses, piers, lifeguard stations, boats, hotels or underwater-adjacent scenes.", tags: ["beach", "coast", "ocean", "sunset", "wide"] },
  { name: "Hospital Exterior → AI Interior", locationType: "Hospital Exterior", description: "Hospital exterior reference workflow. User can upload or link an outside image; AI can infer emergency rooms, corridors, wards, operating rooms or reception interiors unless specified.", notes: "Use the reference image for exterior continuity, then specify which interior the AI should create or leave it open for AI expansion.", tags: ["hospital", "exterior", "interior expansion", "medical", "reference"] },
  { name: "Airport Terminal", locationType: "Airport", description: "Modern international airport with departures hall, glass walls, runways, security lanes and travel atmosphere.", notes: "Can expand into airplane cabins, lounges, baggage areas, hangars or runway exterior scenes.", tags: ["airport", "travel", "terminal", "runway", "modern"] },
  { name: "Courtroom / Civic Building", locationType: "Office Building", description: "Formal civic architecture suitable for courthouse, council chamber, legal office or institutional drama scenes.", notes: "Can expand into courtroom interiors, holding rooms, marble corridors or exterior steps.", tags: ["courtroom", "civic", "legal", "institutional", "drama"] },
];

export default function LocationScout() {
  const { loading: authLoading, isAuthenticated } = useAuth();
  const [, params] = useRoute("/projects/:id/locations");
  const [, navigate] = useLocation();
  const projectId = Number(params?.id);

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [locationType, setLocationType] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [referenceImageUrl, setReferenceImageUrl] = useState("");
  const [expansionInstructions, setExpansionInstructions] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [filterType, setFilterType] = useState("all");

  const utils = trpc.useUtils();
  const { data: locations = [], isLoading } = trpc.location.listByProject.useQuery(
    { projectId },
    { enabled: !!projectId && isAuthenticated }
  );

  const createMutation = trpc.location.create.useMutation({
    onSuccess: () => {
      utils.location.listByProject.invalidate({ projectId });
      setShowAddDialog(false);
      resetForm();
      toast.success("Location added", { action: { label: "Generate Release Form", onClick: () => navigate(`/legal-docs`) } });
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.location.delete.useMutation({
    onSuccess: () => {
      utils.location.listByProject.invalidate({ projectId });
      toast.success("Location removed");
    },
  });

  const suggestMutation = trpc.location.aiSuggest.useMutation({
    onSuccess: (data) => { if (data?.locations) toast.success(`${data.locations.length} locations suggested`); },
    onError: (e) => toast.error(e.message),
  });

  const generateImageMutation = trpc.location.generateImage.useMutation({ onError: (e) => toast.error(e.message) });

  function resetForm() {
    setName(""); setAddress(""); setLocationType(""); setDescription(""); setNotes(""); setReferenceImageUrl(""); setExpansionInstructions(""); setTags([]); setTagInput("");
  }

  function addTag() {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) { setTags([...tags, tagInput.trim()]); setTagInput(""); }
  }

  function applyPreset(preset: typeof ICONIC_LOCATION_PRESETS[number]) {
    setName(preset.name);
    setLocationType(preset.locationType);
    setDescription(preset.description);
    setNotes(preset.notes);
    setTags(preset.tags);
    setExpansionInstructions("AI may expand this location into nearby interiors, exteriors, alternate angles and production-ready set extensions unless the scene gives stricter instructions.");
    setShowAddDialog(true);
  }

  function startWrittenBackground() {
    setName("Written Background Concept");
    setLocationType("Written Background");
    setDescription("");
    setNotes("No real-world photo required. This location is generated from the written description to avoid copyright, privacy, security or access issues.");
    setReferenceImageUrl("");
    setExpansionInstructions("Generate the location from the written description only. Do not copy a real private or restricted place. Use the description as the creative source of truth.");
    setTags(["written description", "no photo", "AI generated"]);
    setShowAddDialog(true);
  }

  function buildNotes() {
    const parts = [notes.trim()];
    if (referenceImageUrl.trim()) parts.push(`Reference image URL: ${referenceImageUrl.trim()}`);
    if (expansionInstructions.trim()) parts.push(`AI expansion instructions: ${expansionInstructions.trim()}`);
    return parts.filter(Boolean).join("\n\n") || undefined;
  }

  if (authLoading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin h-8 w-8 text-muted-foreground" /></div>;
  if (!isAuthenticated) { window.location.href = getLoginUrl(); return null; }

  const filtered = filterType === "all" ? locations : locations.filter((l: any) => l.locationType === filterType);
  const uniqueTypes = Array.from(new Set(locations.map((l: any) => l.locationType).filter(Boolean)));

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex items-center gap-2 sm:gap-3 mb-6 sm:mb-8 flex-wrap">
          <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-9 sm:w-9 shrink-0" onClick={() => navigate(`/projects/${projectId}`)} aria-label="Back to project"><ArrowLeft className="h-5 w-5" aria-hidden="true" /></Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Location Scout</h1>
            <p className="text-sm text-muted-foreground mt-1 hidden sm:block">Iconic presets, manual reference images, written-only backgrounds, AI expansion and consistent scene settings.</p>
          </div>
          <Button variant="outline" className="shrink-0" onClick={() => suggestMutation.mutate({ projectId })} disabled={suggestMutation.isPending}>{suggestMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}AI Suggest</Button>
          <Button variant="outline" className="shrink-0" onClick={startWrittenBackground}><PenLine className="h-4 w-4 mr-2" /> Written Background</Button>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Add Location</Button></DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Add Location</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2">
                <div><Label>Name</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Eiffel Tower, Venice canals, hospital exterior, invented neon alley..." autoCapitalize="sentences" autoCorrect="on" enterKeyHint="next" /></div>
                <div><Label>Input type / location type</Label><Select value={locationType} onValueChange={setLocationType}><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger><SelectContent>{LOCATION_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
                <div><Label>Address / real-world note</Label><Input value={address} onChange={e => setAddress(e.target.value)} placeholder="Optional address, country, landmark note, fictional location, or leave blank" autoCapitalize="sentences" autoCorrect="on" enterKeyHint="next" /></div>
                <div><Label>Written background description</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe the background/location AI should create. Example: a private hospital-inspired lobby with marble floors, green emergency signage, glass doors and cold fluorescent light, but not copied from any real hospital." rows={4} autoCapitalize="sentences" autoCorrect="on" enterKeyHint="done" /><p className="text-xs text-muted-foreground mt-1">Use this when you do not have a photo, cannot access the real place, or want to avoid copyright, privacy or security issues.</p></div>
                <div><Label>Manual reference image URL</Label><Input value={referenceImageUrl} onChange={e => setReferenceImageUrl(e.target.value)} placeholder="Optional: paste a background/reference image URL for AI to render from" autoCapitalize="none" autoCorrect="off" enterKeyHint="next" /><p className="text-xs text-muted-foreground mt-1">Optional. Example: upload/link a hospital exterior. AI can keep the outside consistent and generate interiors unless specified.</p></div>
                <div><Label>AI expansion instructions</Label><Textarea value={expansionInstructions} onChange={e => setExpansionInstructions(e.target.value)} placeholder="Tell AI how far it may expand: exterior only, generate interior, create nearby streets, extend beach, infer hospital reception, avoid copying a real place, etc." rows={3} autoCapitalize="sentences" autoCorrect="on" enterKeyHint="done" /></div>
                <div><Label>Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Filming notes, access info, permits, continuity rules, privacy/security restrictions..." rows={2} autoCapitalize="sentences" autoCorrect="on" enterKeyHint="done" /></div>
                <div><Label>Tags</Label><div className="flex gap-2"><Input value={tagInput} onChange={e => setTagInput(e.target.value)} placeholder="Add tag" onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addTag())} autoCapitalize="sentences" autoCorrect="on" enterKeyHint="next" /><Button variant="outline" size="sm" onClick={addTag}>Add</Button></div>{tags.length > 0 && <div className="flex flex-wrap gap-1 mt-2">{tags.map(t => <Badge key={t} variant="secondary" className="cursor-pointer" onClick={() => setTags(tags.filter(x => x !== t))}>{t} ×</Badge>)}</div>}</div>
                <Button className="w-full" onClick={() => createMutation.mutate({ projectId, name, address: address || undefined, locationType: locationType || undefined, description: description || undefined, notes: buildNotes(), tags })} disabled={!name || createMutation.isPending}>{createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Add Location</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <section className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card className="border-amber-500/20 bg-amber-500/[0.03]"><CardHeader className="pb-2"><CardTitle className="text-sm">1. Iconic Preset</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">Start from Eiffel Tower, Venice canals, desert, beach, snow, hospital, airport or courtroom-style presets.</CardContent></Card>
          <Card className="border-amber-500/20 bg-amber-500/[0.03]"><CardHeader className="pb-2"><CardTitle className="text-sm">2. Reference Image</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">Paste a user-supplied image URL and let AI expand interiors, exteriors, alternate angles and set extensions.</CardContent></Card>
          <Card className="border-amber-500/20 bg-amber-500/[0.03]"><CardHeader className="pb-2"><CardTitle className="text-sm">3. Written Description</CardTitle></CardHeader><CardContent className="space-y-2"><p className="text-xs text-muted-foreground">Describe the background in writing when no photo is available or real locations cannot be used.</p><Button size="sm" variant="outline" className="w-full" onClick={startWrittenBackground}><PenLine className="h-3 w-3 mr-1" /> Write Background</Button></CardContent></Card>
        </section>

        <section className="mb-8"><div className="flex items-center justify-between gap-3 mb-3"><div><h2 className="text-lg font-medium">Iconic Location Presets</h2><p className="text-sm text-muted-foreground">Start with globally recognisable cinematic locations, then let AI expand interiors, exteriors and alternate angles.</p></div></div><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">{ICONIC_LOCATION_PRESETS.map((preset) => (<Card key={preset.name} className="border-amber-500/20 bg-amber-500/[0.03] hover:border-amber-500/40 transition-colors"><CardHeader className="pb-2"><CardTitle className="text-sm">{preset.name}</CardTitle><Badge variant="outline" className="text-[10px] w-fit">{preset.locationType}</Badge></CardHeader><CardContent className="space-y-2"><p className="text-xs text-muted-foreground line-clamp-3">{preset.description}</p><Button size="sm" variant="outline" className="w-full" onClick={() => applyPreset(preset)}><Plus className="h-3 w-3 mr-1" /> Use Preset</Button></CardContent></Card>))}</div></section>

        {suggestMutation.data?.locations && (<div className="mb-8"><h2 className="text-lg font-medium mb-4 flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> AI Suggested Locations</h2><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{suggestMutation.data.locations.map((loc: any, i: number) => (<Card key={i} className="border-primary/20 bg-primary/5"><CardHeader className="pb-2"><div className="flex items-start justify-between"><CardTitle className="text-base">{loc.name}</CardTitle><Badge variant="outline" className="text-xs">{loc.locationType}</Badge></div></CardHeader><CardContent className="space-y-2"><p className="text-sm text-muted-foreground">{loc.description}</p><p className="text-xs text-muted-foreground"><span className="font-medium">Visual:</span> {loc.visualStyle}</p><p className="text-xs text-muted-foreground"><span className="font-medium">Notes:</span> {loc.practicalNotes}</p><div className="flex flex-wrap gap-1">{loc.tags?.map((t: string) => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}</div><Button size="sm" variant="outline" className="w-full mt-2" onClick={() => createMutation.mutate({ projectId, name: loc.name, locationType: loc.locationType, description: loc.description, notes: loc.practicalNotes, tags: loc.tags })}><Plus className="h-3 w-3 mr-1" /> Save to Project</Button></CardContent></Card>))}</div><Separator className="mt-6" /></div>)}

        {uniqueTypes.length > 0 && (<div className="flex gap-2 mb-6 flex-wrap"><Button variant={filterType === "all" ? "default" : "outline"} size="sm" onClick={() => setFilterType("all")}>All</Button>{uniqueTypes.map((t: any) => (<Button key={t} variant={filterType === t ? "default" : "outline"} size="sm" onClick={() => setFilterType(t)}>{t}</Button>))}</div>)}

        {isLoading ? (<div className="flex items-center justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-muted-foreground" /></div>) : filtered.length === 0 ? (<div className="text-center py-20"><MapPin className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" /><h3 className="text-lg font-medium text-muted-foreground">No locations yet</h3><p className="text-sm text-muted-foreground/60 mt-1">Use an iconic preset, paste a reference image, write a background description, or let AI suggest locations.</p></div>) : (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{filtered.map((loc: any) => (<Card key={loc.id} className="group">{(loc.referenceImages as string[] || []).length > 0 ? (<div className="h-40 overflow-hidden rounded-t-lg"><img src={(loc.referenceImages as string[])[0]} alt={loc.name} className="w-full h-full object-cover" /></div>) : (<div className="h-32 bg-muted/30 rounded-t-lg flex items-center justify-center"><MapPin className="h-8 w-8 text-muted-foreground/20" /></div>)}<CardHeader className="pb-2"><div className="flex items-start justify-between"><CardTitle className="text-base">{loc.name}</CardTitle><Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => deleteMutation.mutate({ id: loc.id })} aria-label={`Delete location ${loc.name}`}><Trash2 className="h-3.5 w-3.5 text-destructive" aria-hidden="true" /></Button></div>{loc.locationType && <Badge variant="outline" className="text-xs w-fit">{loc.locationType}</Badge>}</CardHeader><CardContent className="space-y-2">{loc.address && <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{loc.address}</p>}{loc.description && <p className="text-sm text-muted-foreground line-clamp-2">{loc.description}</p>}{loc.notes && <p className="text-xs text-muted-foreground/70 italic whitespace-pre-line line-clamp-4">{loc.notes}</p>}{(loc.tags as string[] || []).length > 0 && (<div className="flex flex-wrap gap-1">{(loc.tags as string[]).map((t: string) => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}</div>)}<Button size="sm" variant="outline" className="w-full" onClick={() => { generateImageMutation.mutate({ description: `${loc.name}: ${loc.description || loc.locationType || ''}. ${loc.notes || ''}` }, { onSuccess: () => { toast.success("Reference image generated"); utils.location.listByProject.invalidate({ projectId }); } }); }} disabled={generateImageMutation.isPending}>{generateImageMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Image className="h-3 w-3 mr-1" />}Generate Reference</Button></CardContent></Card>))}</div>)}
      </div>
      {!!projectId && <NextStageCTA projectId={projectId} currentStage={4} />}
    </div>
  );
}
