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
import { MapPin, Plus, Sparkles, Trash2, Image, Tag, ArrowLeft, Loader2 } from "lucide-react";

const LOCATION_TYPES = [
  "City Street", "Suburban Home", "Mansion", "Apartment", "Office Building",
  "Warehouse", "Forest", "Beach", "Desert", "Mountain", "Lake", "River",
  "Restaurant", "Bar", "Hospital", "School", "Church", "Airport", "Train Station",
  "Rooftop", "Underground", "Castle", "Farm", "Island", "Bridge", "Tunnel",
];

export default function LocationScout() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [, params] = useRoute("/projects/:id/locations");
  const [, navigate] = useLocation();
  const projectId = Number(params?.id);

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [locationType, setLocationType] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
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
      toast.success("Location added");
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
    onSuccess: (data) => {
      if (data?.locations) {
        toast.success(`${data.locations.length} locations suggested`);
      }
    },
    onError: (e) => toast.error(e.message),
  });

  const generateImageMutation = trpc.location.generateImage.useMutation({
    onError: (e) => toast.error(e.message),
  });

  function resetForm() {
    setName(""); setAddress(""); setLocationType(""); setDescription(""); setNotes(""); setTags([]); setTagInput("");
  }

  function addTag() {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  }

  if (authLoading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin h-8 w-8 text-muted-foreground" /></div>;
  if (!isAuthenticated) { window.location.href = getLoginUrl(); return null; }

  const filtered = filterType === "all" ? locations : locations.filter((l: any) => l.locationType === filterType);
  const uniqueTypes = Array.from(new Set(locations.map((l: any) => l.locationType).filter(Boolean)));

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="flex items-center gap-2 sm:gap-3 mb-6 sm:mb-8 flex-wrap">
          <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-9 sm:w-9 shrink-0" onClick={() => navigate(`/projects/${projectId}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Location Scout</h1>
            <p className="text-sm text-muted-foreground mt-1 hidden sm:block">Find and manage filming locations for your production</p>
          </div>
          <Button variant="outline" className="shrink-0" onClick={() => suggestMutation.mutate({ projectId })} disabled={suggestMutation.isPending}>
            {suggestMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
            AI Suggest
          </Button>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Add Location</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Add Location</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2">
                <div><Label>Name</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Central Park, NYC" /></div>
                <div><Label>Type</Label>
                  <Select value={locationType} onValueChange={setLocationType}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>{LOCATION_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Address</Label><Input value={address} onChange={e => setAddress(e.target.value)} placeholder="Optional address" /></div>
                <div><Label>Description</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe the location and its visual characteristics..." rows={3} /></div>
                <div><Label>Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Filming notes, access info, permits needed..." rows={2} /></div>
                <div>
                  <Label>Tags</Label>
                  <div className="flex gap-2">
                    <Input value={tagInput} onChange={e => setTagInput(e.target.value)} placeholder="Add tag" onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addTag())} />
                    <Button variant="outline" size="sm" onClick={addTag}>Add</Button>
                  </div>
                  {tags.length > 0 && <div className="flex flex-wrap gap-1 mt-2">{tags.map(t => <Badge key={t} variant="secondary" className="cursor-pointer" onClick={() => setTags(tags.filter(x => x !== t))}>{t} ×</Badge>)}</div>}
                </div>
                <Button className="w-full" onClick={() => createMutation.mutate({ projectId, name, address: address || undefined, locationType: locationType || undefined, description: description || undefined, notes: notes || undefined, tags })} disabled={!name || createMutation.isPending}>
                  {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Add Location
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* AI Suggestions */}
        {suggestMutation.data?.locations && (
          <div className="mb-8">
            <h2 className="text-lg font-medium mb-4 flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> AI Suggested Locations</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {suggestMutation.data.locations.map((loc: any, i: number) => (
                <Card key={i} className="border-primary/20 bg-primary/5">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">{loc.name}</CardTitle>
                      <Badge variant="outline" className="text-xs">{loc.locationType}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm text-muted-foreground">{loc.description}</p>
                    <p className="text-xs text-muted-foreground"><span className="font-medium">Visual:</span> {loc.visualStyle}</p>
                    <p className="text-xs text-muted-foreground"><span className="font-medium">Notes:</span> {loc.practicalNotes}</p>
                    <div className="flex flex-wrap gap-1">{loc.tags?.map((t: string) => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}</div>
                    <Button size="sm" variant="outline" className="w-full mt-2" onClick={() => createMutation.mutate({ projectId, name: loc.name, locationType: loc.locationType, description: loc.description, notes: loc.practicalNotes, tags: loc.tags })}>
                      <Plus className="h-3 w-3 mr-1" /> Save to Project
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Separator className="mt-6" />
          </div>
        )}

        {/* Filter */}
        {uniqueTypes.length > 0 && (
          <div className="flex gap-2 mb-6 flex-wrap">
            <Button variant={filterType === "all" ? "default" : "outline"} size="sm" onClick={() => setFilterType("all")}>All</Button>
            {uniqueTypes.map((t: any) => (
              <Button key={t} variant={filterType === t ? "default" : "outline"} size="sm" onClick={() => setFilterType(t)}>{t}</Button>
            ))}
          </div>
        )}

        {/* Location Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <MapPin className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">No locations yet</h3>
            <p className="text-sm text-muted-foreground/60 mt-1">Add locations manually or let AI suggest them</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((loc: any) => (
              <Card key={loc.id} className="group">
                {/* Reference image area */}
                {(loc.referenceImages as string[] || []).length > 0 ? (
                  <div className="h-40 overflow-hidden rounded-t-lg">
                    <img src={(loc.referenceImages as string[])[0]} alt={loc.name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="h-32 bg-muted/30 rounded-t-lg flex items-center justify-center">
                    <MapPin className="h-8 w-8 text-muted-foreground/20" />
                  </div>
                )}
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{loc.name}</CardTitle>
                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => deleteMutation.mutate({ id: loc.id })}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                  {loc.locationType && <Badge variant="outline" className="text-xs w-fit">{loc.locationType}</Badge>}
                </CardHeader>
                <CardContent className="space-y-2">
                  {loc.address && <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{loc.address}</p>}
                  {loc.description && <p className="text-sm text-muted-foreground line-clamp-2">{loc.description}</p>}
                  {loc.notes && <p className="text-xs text-muted-foreground/70 italic">{loc.notes}</p>}
                  {(loc.tags as string[] || []).length > 0 && (
                    <div className="flex flex-wrap gap-1">{(loc.tags as string[]).map((t: string) => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}</div>
                  )}
                  <Button size="sm" variant="outline" className="w-full" onClick={() => {
                    generateImageMutation.mutate({ description: `${loc.name}: ${loc.description || loc.locationType || ''}` }, {
                      onSuccess: (data) => {
                        toast.success("Reference image generated");
                        // Update location with the generated image
                        const currentImages = (loc.referenceImages as string[]) || [];
                        trpc.useUtils().location.listByProject.invalidate({ projectId });
                      }
                    });
                  }} disabled={generateImageMutation.isPending}>
                    {generateImageMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Image className="h-3 w-3 mr-1" />}
                    Generate Reference
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
