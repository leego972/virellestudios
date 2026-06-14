import { useState } from "react";
  import { useRoute } from "wouter";
  import { trpc } from "@/lib/trpc";
  import { Button } from "@/components/ui/button";
  import { Input } from "@/components/ui/input";
  import { Textarea } from "@/components/ui/textarea";
  import { Badge } from "@/components/ui/badge";
  import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
  import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
  import { Label } from "@/components/ui/label";
  import { toast } from "sonner";
  import { Plus, Lock, MapPin, Car, Ship, Plane, Edit2, Trash2 } from "lucide-react";

  type BgType = "location" | "vehicle" | "vessel" | "aircraft";

  const TYPE_ICONS: Record<BgType, React.ReactNode> = {
    location: <MapPin className="w-4 h-4" />,
    vehicle:  <Car className="w-4 h-4" />,
    vessel:   <Ship className="w-4 h-4" />,
    aircraft: <Plane className="w-4 h-4" />,
  };
  const TYPE_LABELS: Record<BgType, string> = {
    location: "Location", vehicle: "Vehicle", vessel: "Vessel", aircraft: "Aircraft",
  };

  function BgForm({ initial, onSave, onClose }: { initial?: any; onSave: (v: any) => void; onClose: () => void }) {
    const [form, setForm] = useState({
      name:           initial?.name           ?? "",
      backgroundType: initial?.backgroundType ?? "location",
      description:    initial?.description    ?? "",
      styleNotes:     initial?.styleNotes     ?? "",
      vehicleMake:    initial?.vehicleMake    ?? "",
      vehicleModel:   initial?.vehicleModel   ?? "",
      vehicleColor:   initial?.vehicleColor   ?? "",
    });
    const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
    const isVehicle = form.backgroundType !== "location";

    return (
      <div className="min-h-screen space-y-4 px-4 py-4" style={{ background:"linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)" }}>
        <div>
          <Label>Name</Label>
          <Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Jerry's Apartment, Black Hilux" />
        </div>
        <div>
          <Label>Type</Label>
          <Select value={form.backgroundType} onValueChange={v => set("backgroundType", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="location">Location / Set</SelectItem>
              <SelectItem value="vehicle">Vehicle</SelectItem>
              <SelectItem value="vessel">Vessel / Boat</SelectItem>
              <SelectItem value="aircraft">Aircraft</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Description / Visual Lock</Label>
          <Textarea value={form.description} onChange={e => set("description", e.target.value)}
            placeholder="Describe exactly how this must look every time it appears…" rows={3} />
        </div>
        {isVehicle && (
          <>
            <div><Label>Make / Brand</Label><Input value={form.vehicleMake} onChange={e => set("vehicleMake", e.target.value)} placeholder="e.g. Toyota, Boeing, Sunseeker" /></div>
            <div><Label>Model / Spec</Label><Input value={form.vehicleModel} onChange={e => set("vehicleModel", e.target.value)} placeholder="e.g. Hilux 2019, 737 MAX" /></div>
            <div><Label>Color</Label><Input value={form.vehicleColor} onChange={e => set("vehicleColor", e.target.value)} placeholder="e.g. Matte black" /></div>
          </>
        )}
        <div>
          <Label>AI Style Notes (injected into every scene)</Label>
          <Textarea value={form.styleNotes} onChange={e => set("styleNotes", e.target.value)}
            placeholder="Prompt fragment to inject so this background looks identical every time…" rows={2} />
        </div>
        <div className="flex gap-2 pt-2">
          <Button onClick={() => onSave(form)} className="flex-1">Save</Button>
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
        </div>
      </div>
    );
  }

  export default function BackgroundLibraryPage() {
    const [, params] = useRoute("/projects/:id/backgrounds");
    const projectId = parseInt(params?.id ?? "0");
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [filter, setFilter] = useState<string>("all");

    const { data: bgs = [], refetch } = (trpc as any).backgrounds?.listByProject?.useQuery?.({ projectId }) ?? { data: [], refetch: () => {} };
    const createMut = (trpc as any).backgrounds?.create?.useMutation?.({
      onSuccess: () => { refetch(); setOpen(false); toast.success("Background added"); },
    });
    const updateMut = (trpc as any).backgrounds?.update?.useMutation?.({
      onSuccess: () => { refetch(); setEditing(null); toast.success("Updated"); },
    });
    const deleteMut = (trpc as any).backgrounds?.delete?.useMutation?.({
      onSuccess: () => { refetch(); toast.success("Removed"); },
    });

    const filtered = filter === "all" ? bgs : bgs.filter((b: any) => b.backgroundType === filter);

    return (
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold gradient-text-gold">Background Library</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Lock recurring locations, vehicles, vessels and aircraft so AI renders them identically every scene.
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />Add Background</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>New Background Lock</DialogTitle></DialogHeader>
              <BgForm onSave={v => createMut?.mutate?.({ projectId, ...v })} onClose={() => setOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex gap-2 flex-wrap">
          {(["all", "location", "vehicle", "vessel", "aircraft"] as const).map(t => (
            <Button key={t} variant={filter === t ? "default" : "outline"} size="sm" onClick={() => setFilter(t)}>
              {t === "all" ? "All" : TYPE_LABELS[t as BgType]}
            </Button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="border-2 border-dashed rounded-xl p-12 text-center text-muted-foreground">
            <Lock className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No backgrounds locked yet</p>
            <p className="text-sm mt-1">Add locations, vehicles or vessels that recur in your film.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((bg: any) => (
              <Card key={bg.id} className="relative group">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">
                        {TYPE_ICONS[bg.backgroundType as BgType] ?? <MapPin className="w-4 h-4" />}
                      </span>
                      <CardTitle className="text-base">{bg.name}</CardTitle>
                    </div>
                    <Badge variant="secondary">{TYPE_LABELS[bg.backgroundType as BgType] ?? bg.backgroundType}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {bg.description && <p className="text-sm text-muted-foreground line-clamp-3">{bg.description}</p>}
                  {(bg.vehicleMake || bg.vehicleModel || bg.vehicleColor) && (
                    <p className="text-xs font-mono bg-muted px-2 py-1 rounded">
                      {[bg.vehicleMake, bg.vehicleModel, bg.vehicleColor].filter(Boolean).join(" ")}
                    </p>
                  )}
                  {bg.styleNotes && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 line-clamp-2 italic">"{bg.styleNotes}"</p>
                  )}
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="ghost" className="h-7" onClick={() => setEditing(bg)}>
                      <Edit2 className="w-3 h-3 mr-1" />Edit
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-destructive"
                      onClick={() => deleteMut?.mutate?.({ id: bg.id })}>
                      <Trash2 className="w-3 h-3 mr-1" />Remove
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={!!editing} onOpenChange={v => !v && setEditing(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Edit Background</DialogTitle></DialogHeader>
            {editing && (
              <BgForm
                initial={editing}
                onSave={v => updateMut?.mutate?.({ id: editing.id, ...v })}
                onClose={() => setEditing(null)}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }
  