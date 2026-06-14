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
  import { Plus, Film, Palette, Edit2, Trash2, Layers, Lock } from "lucide-react";

  function ActForm({ initial, onSave, onClose }: { initial?: any; onSave: (v: any) => void; onClose: () => void }) {
      const [form, setForm] = useState({
        name:              initial?.name              ?? "",
        description:       initial?.description       ?? "",
        orderIndex:        initial?.orderIndex        ?? 1,
        actType:           initial?.actType           ?? "act",
        colorHex:          initial?.colorHex          ?? "#6366f1",
        isEpisodeBoundary: initial?.isEpisodeBoundary ?? false,
        episodeNumber:     initial?.episodeNumber     ?? "",
        episodeTitle:      initial?.episodeTitle      ?? "",
      });
      return (
        <div className="min-h-screen" style={{ background:"linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)" }}>
      <div className="space-y-4 max-w-7xl mx-auto px-4 py-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Act Name</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Act I, Episode 1" />
            </div>
            <div>
              <Label>Order</Label>
              <Input type="number" value={form.orderIndex}
                onChange={e => setForm(f => ({ ...f, orderIndex: parseInt(e.target.value) || 1 }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={form.actType}
                onChange={e => setForm(f => ({ ...f, actType: e.target.value }))}
              >
                <option value="act">Act</option>
                <option value="episode">Episode</option>
                <option value="chapter">Chapter</option>
                <option value="sequence">Sequence</option>
              </select>
            </div>
            <div>
              <Label>Color</Label>
              <div className="flex gap-2 items-center mt-1">
                <input type="color" value={form.colorHex}
                  onChange={e => setForm(f => ({ ...f, colorHex: e.target.value }))}
                  className="h-9 w-12 rounded border border-input cursor-pointer" />
                <span className="text-xs text-muted-foreground">{form.colorHex}</span>
              </div>
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Story beats, themes, arc..." rows={3} />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="episodeBoundary" checked={form.isEpisodeBoundary}
              onChange={e => setForm(f => ({ ...f, isEpisodeBoundary: e.target.checked }))}
              className="rounded border-input" />
            <label htmlFor="episodeBoundary" className="text-sm">Episode boundary</label>
          </div>
          {form.isEpisodeBoundary && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Episode #</Label>
                <Input type="number" value={form.episodeNumber}
                  onChange={e => setForm(f => ({ ...f, episodeNumber: e.target.value }))}
                  placeholder="1" />
              </div>
              <div>
                <Label>Episode Title</Label>
                <Input value={form.episodeTitle}
                  onChange={e => setForm(f => ({ ...f, episodeTitle: e.target.value }))}
                  placeholder="Pilot" />
              </div>
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <Button onClick={() => onSave({
              ...form,
              orderIndex: Number(form.orderIndex),
              episodeNumber: form.episodeNumber ? Number(form.episodeNumber) : undefined,
              episodeTitle: form.episodeTitle || undefined,
            })} className="flex-1">Save</Button>
            <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          </div>
        </div>
      );
    }

  function VisualDNAPanel({ projectId }: { projectId: number }) {
    const { data: vdna, refetch } = (trpc as any).narrative?.getVisualDNA?.useQuery?.({ projectId }) ?? {};
    const upsertMut = (trpc as any).narrative?.upsertVisualDNA?.useMutation?.({
      onSuccess: () => { refetch?.(); toast.success("Visual DNA saved"); },
    });
    const [form, setForm] = useState<any>(null);
    const current = form ?? vdna ?? {};
    const set = (k: string, v: string) => setForm((f: any) => ({ ...(f ?? current), [k]: v }));

    return (
      <Card className="border-primary/30 glass-card shadow-lg shadow-amber-500/5">
        <CardHeader className="pb-3 glass-card shadow-lg shadow-amber-500/5">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-400" />
            <CardTitle className="text-base gradient-text-gold glass-card shadow-lg shadow-amber-500/5">Visual DNA Lock</CardTitle>
            <Badge variant="outline" className="text-xs">Project-wide</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Cinematography style, color palette, and lens choices applied to every scene.
            Once set, this is your film's visual fingerprint.
          </p>
        </CardHeader>
        <CardContent className="space-y-3 glass-card shadow-lg shadow-amber-500/5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Cinematographer / Style Reference</Label>
              <Input value={current.cinematographer ?? ""} onChange={e => set("cinematographer", e.target.value)}
                placeholder="e.g. Handheld docu-noir, Kubrick symmetrical" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Color Palette</Label>
              <Input value={current.colorPalette ?? ""} onChange={e => set("colorPalette", e.target.value)}
                placeholder="e.g. Desaturated teal-orange, warm golden hour" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Lens Profile / Aspect Ratio</Label>
              <Input value={current.lensProfile ?? ""} onChange={e => set("lensProfile", e.target.value)}
                placeholder="e.g. 2.39:1, anamorphic flares, 35mm" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Lighting Style</Label>
              <Input value={current.lightingStyle ?? ""} onChange={e => set("lightingStyle", e.target.value)}
                placeholder="e.g. Rembrandt three-point, natural bounce" className="mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Global Color Grade (injected into every scene)</Label>
            <Input value={current.globalColorGrade ?? ""} onChange={e => set("globalColorGrade", e.target.value)}
              placeholder="e.g. cinematic orange-teal LUT, bleach bypass, warm Kodak Portra 400" />
          </div>
          <div>
            <Label className="text-xs">Visual Notes</Label>
            <Textarea value={current.visualNotes ?? ""} onChange={e => set("visualNotes", e.target.value)}
              placeholder="Any additional visual direction to enforce across all scenesÃ¢ÂÂ¦" rows={2} />
          </div>
          <Button size="sm" onClick={() => upsertMut?.mutate?.({ projectId, ...(form ?? current) })}>
            <Lock className="w-3 h-3 mr-1" />Lock Visual DNA
          </Button>
        </CardContent>
      </Card>
    );
  }

  export default function NarrativeStructurePage() {
    const [, params] = useRoute("/projects/:id/narrative");
    const projectId = parseInt(params?.id ?? "0");
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<"acts" | "dna">("acts");

    const { data: acts = [], refetch } = (trpc as any).narrative?.listActs?.useQuery?.({ projectId }) ?? { data: [], refetch: () => {} };
    const createMut = (trpc as any).narrative?.createAct?.useMutation?.({
      onSuccess: () => { refetch(); setOpen(false); toast.success("Act created"); },
    });
    const updateMut = (trpc as any).narrative?.updateAct?.useMutation?.({
      onSuccess: () => { refetch(); setEditing(null); toast.success("Act updated"); },
    });
    const deleteMut = (trpc as any).narrative?.deleteAct?.useMutation?.({
      onSuccess: () => { refetch(); toast.success("Act removed"); },
    });

    return (
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold gradient-text-gold">Narrative Structure</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Define acts, story beats, and lock your project's Visual DNA for frame-perfect consistency.
            </p>
          </div>
          <div className="flex gap-2">
            {(["acts", "dna"] as const).map(t => (
              <Button key={t} variant={activeTab === t ? "default" : "outline"} size="sm"
                onClick={() => setActiveTab(t)}>
                {t === "acts"
                  ? <><Layers className="w-4 h-4 mr-1" />Acts</>
                  : <><Palette className="w-4 h-4 mr-1" />Visual DNA</>}
              </Button>
            ))}
          </div>
        </div>

        {activeTab === "dna" ? (
          <VisualDNAPanel projectId={projectId} />
        ) : (
          <>
            <div className="flex justify-end">
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button><Plus className="w-4 h-4 mr-2" />Add Act</Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader><DialogTitle className="gradient-text-gold">New Act</DialogTitle></DialogHeader>
                  <ActForm onSave={v => createMut?.mutate?.({ projectId, ...v })} onClose={() => setOpen(false)} />
                </DialogContent>
              </Dialog>
            </div>

            {acts.length === 0 ? (
              <div className="border-2 border-dashed rounded-xl p-12 text-center text-muted-foreground">
                <Film className="text-amber-400/80 w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No acts defined yet</p>
                <p className="text-sm mt-1">Structure your film into acts to organize scenes and story beats.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {[...acts].sort((a: any, b: any) => (a.orderIndex || 0) - (b.orderIndex || 0)).map((act: any) => (
                  <Card key={act.id} className="border-l-4 border-l-primary glass-card shadow-lg shadow-amber-500/5">
                    <CardHeader className="pb-2 glass-card shadow-lg shadow-amber-500/5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="text-xs font-mono">ACT {act.orderIndex}</Badge>
                          <CardTitle className="text-base gradient-text-gold glass-card shadow-lg shadow-amber-500/5">{act.name}</CardTitle>
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="h-7" onClick={() => setEditing(act)}>
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-destructive"
                            onClick={() => deleteMut?.mutate?.({ id: act.id })}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    {act.description && (
                      <CardContent>
                        <p className="text-sm text-muted-foreground">{act.description}</p>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        <Dialog open={!!editing} onOpenChange={v => !v && setEditing(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle className="gradient-text-gold">Edit Act</DialogTitle></DialogHeader>
            {editing && (
              <ActForm
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
