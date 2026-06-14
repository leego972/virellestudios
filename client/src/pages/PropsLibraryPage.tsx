import { useState } from "react";
  import { useRoute } from "wouter";
  import { trpc } from "@/lib/trpc";
  import { Button } from "@/components/ui/button";
  import { Input } from "@/components/ui/input";
  import { Textarea } from "@/components/ui/textarea";
  import { Badge } from "@/components/ui/badge";
  import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
  import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
  import { Label } from "@/components/ui/label";
  import { toast } from "sonner";
  import { Plus, Package, Edit2, Trash2 } from "lucide-react";

  const CATEGORIES = ["weapon","vehicle","furniture","document","food","technology","clothing","jewellery","animal","other"];

  function PropForm({ initial, onSave, onClose }: { initial?: any; onSave: (v: any) => void; onClose: () => void }) {
    const [form, setForm] = useState({
      name:        initial?.name        ?? "",
      category:    initial?.category    ?? "other",
      description: initial?.description ?? "",
      era:         initial?.era         ?? "",
    });
    const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

    return (
      <div className="min-h-screen space-y-4 px-4 py-4" style={{ background:"linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)" }}>
        <div>
          <Label>Prop Name</Label>
          <Input value={form.name} onChange={e => set("name", e.target.value)}
            placeholder="e.g. Excalibur (sword), Black briefcase #7" />
        </div>
        <div>
          <Label>Category</Label>
          <select className="w-full border rounded-md px-3 py-2 text-sm bg-[#0c0b18]"
            value={form.category} onChange={e => set("category", e.target.value)}>
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
            ))}
          </select>
        </div>
        <div>
          <Label>Description / AI Reference Prompt</Label>
          <Textarea value={form.description} onChange={e => set("description", e.target.value)}
            placeholder="Detailed physical description and prompt fragment injected so this prop looks identical every time…" rows={4} />
        </div>
        <div>
          <Label>Era / Period</Label>
          <Input value={form.era} onChange={e => set("era", e.target.value)}
            placeholder="e.g. 1940s WWII, near-future 2045" />
        </div>
        <div className="flex gap-2 pt-2">
          <Button onClick={() => onSave(form)} className="flex-1">Save</Button>
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
        </div>
      </div>
    );
  }

  export default function PropsLibraryPage() {
    const [, params] = useRoute("/projects/:id/props");
    const projectId = parseInt(params?.id ?? "0");
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [filterCat, setFilterCat] = useState("all");

    const { data: props = [], refetch } = (trpc as any).props?.listByProject?.useQuery?.({ projectId }) ?? { data: [], refetch: () => {} };
    const createMut = (trpc as any).props?.create?.useMutation?.({
      onSuccess: () => { refetch(); setOpen(false); toast.success("Prop added to library"); },
    });
    const updateMut = (trpc as any).props?.update?.useMutation?.({
      onSuccess: () => { refetch(); setEditing(null); toast.success("Prop updated"); },
    });
    const deleteMut = (trpc as any).props?.delete?.useMutation?.({
      onSuccess: () => { refetch(); toast.success("Prop removed"); },
    });

    const filtered = filterCat === "all" ? props : props.filter((p: any) => p.category === filterCat);
    const usedCats = [...new Set<string>(props.map((p: any) => p.category as string))];

    return (
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold gradient-text-gold">Props Library</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Lock hero props so AI renders them identically in every scene they appear.
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />Add Prop</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle className="gradient-text-gold">New Hero Prop</DialogTitle></DialogHeader>
              <PropForm onSave={v => createMut?.mutate?.({ projectId, ...v })} onClose={() => setOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex gap-2 flex-wrap">
          {(["all", ...usedCats]).map(c => (
            <Button key={c} variant={filterCat === c ? "default" : "outline"} size="sm" onClick={() => setFilterCat(c)}>
              {c === "all" ? "All" : c.charAt(0).toUpperCase() + c.slice(1)}
            </Button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="border-2 border-dashed rounded-xl p-12 text-center text-muted-foreground">
            <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No props locked yet</p>
            <p className="text-sm mt-1">Add hero props that must look identical every time they appear on screen.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((prop: any) => (
              <Card key={prop.id}>
                <CardHeader className="pb-2 glass-card">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-muted-foreground" />
                      <CardTitle className="text-base gradient-text-gold glass-card">{prop.name}</CardTitle>
                    </div>
                    <Badge variant="outline">{prop.category}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 glass-card">
                  {prop.description && (
                    <p className="text-sm text-muted-foreground line-clamp-3">{prop.description}</p>
                  )}
                  {prop.era && (
                    <p className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 px-2 py-1 rounded">
                      Era: {prop.era}
                    </p>
                  )}
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="ghost" className="h-7" onClick={() => setEditing(prop)}>
                      <Edit2 className="w-3 h-3 mr-1" />Edit
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-destructive"
                      onClick={() => deleteMut?.mutate?.({ id: prop.id })}>
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
            <DialogHeader><DialogTitle className="gradient-text-gold">Edit Prop</DialogTitle></DialogHeader>
            {editing && (
              <PropForm
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
  