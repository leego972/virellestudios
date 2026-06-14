import { useState, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Save, Download, Plus, Trash2, Star, Mic, ShieldCheck, Palette, History, FileJson } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

export default function ProStudio() {
  const { projectId: pidParam } = useParams<{ projectId: string }>();
  const projectId = Number(pidParam);
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    if (typeof window !== "undefined") window.location.href = "/login";
    return null;
  }
  if (!projectId) return <div className="p-8 text-sm text-muted-foreground">Invalid project.</div>;

  return (
    <div className="min-h-screen" style={{ background:"linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)" }}>
      <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/projects/${projectId}`)} aria-label="Back to project">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gold-shimmer">Pro Studio</h1>
          <p className="text-xs text-muted-foreground">Studio-grade controls: visual identity, version control, AI rights, provenance, render economics.</p>
        </div>
      </div>

      <Tabs defaultValue="style">
        <TabsList className="flex w-full max-w-3xl overflow-x-auto scrollbar-none sm:grid sm:grid-cols-5 h-auto mb-4 [&>*]:shrink-0 [&>*]:whitespace-nowrap">
          <TabsTrigger value="style"><Palette className="h-3.5 w-3.5 mr-1.5" />Style Bible</TabsTrigger>
          <TabsTrigger value="versions"><Star className="h-3.5 w-3.5 mr-1.5" />Versions</TabsTrigger>
          <TabsTrigger value="voice"><Mic className="h-3.5 w-3.5 mr-1.5" />Voice Rights</TabsTrigger>
          <TabsTrigger value="provenance"><ShieldCheck className="h-3.5 w-3.5 mr-1.5" />Provenance</TabsTrigger>
          <TabsTrigger value="renders"><History className="h-3.5 w-3.5 mr-1.5" />Renders</TabsTrigger>
        </TabsList>

        <TabsContent value="style"><StyleBibleTab projectId={projectId} /></TabsContent>
        <TabsContent value="versions"><ShotVersionsTab projectId={projectId} /></TabsContent>
        <TabsContent value="voice"><VoiceConsentTab projectId={projectId} /></TabsContent>
        <TabsContent value="provenance"><ProvenanceTab projectId={projectId} /></TabsContent>
        <TabsContent value="renders"><RenderHistoryTab /></TabsContent>
      </Tabs>
    </div>
  );
}

/* Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ Style Bible Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ */
function StyleBibleTab({ projectId }: { projectId: number }) {
  const q = trpc.styleBible.get.useQuery({ projectId });
  const save = trpc.styleBible.save.useMutation({ onSuccess: () => { toast.success("Style bible saved"); q.refetch(); } });

  const [data, setData] = useState<any>(null);
  const current = data ?? q.data?.data ?? {};
  const update = (k: string, v: any) => setData({ ...(data ?? q.data?.data ?? {}), [k]: v });
  const referenceUrlsText = (current.referenceUrls || []).join("\n");

  return (
    <CardclassName="glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow" >
      <CardclassName="glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow" Header>
        <CardTitle className="text-base gradient-text-gold">Project Visual Identity</CardTitle>
        <p className="text-xs text-muted-foreground">Locked guidelines that every generated asset should respect. Useful for handing off to AI prompts and human collaborators alike.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Tone & Mood</Label>
            <Textarea rows={3} value={current.tone || ""} onChange={e => update("tone", e.target.value)} placeholder="Melancholic, sun-drenched, slow-burn..." />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Color Palette</Label>
            <Textarea rows={3} value={current.colorPalette || ""} onChange={e => update("colorPalette", e.target.value)} placeholder="Teal/orange split, desaturated greens, ember warmth..." />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Lighting</Label>
            <Textarea rows={3} value={current.lighting || ""} onChange={e => update("lighting", e.target.value)} placeholder="Hard sidelight, practical sources only, never overhead..." />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Lens & Camera</Label>
            <Textarea rows={3} value={current.lensStyle || ""} onChange={e => update("lensStyle", e.target.value)} placeholder="Anamorphic 2.39:1, 40mm primes, handheld for intimacy..." />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Era & Setting</Label>
            <Textarea rows={2} value={current.era || ""} onChange={e => update("era", e.target.value)} placeholder="Late 1970s, suburban America, post-Vietnam unease..." />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Reference URLs (one per line)</Label>
            <Textarea rows={2} value={referenceUrlsText} onChange={e => update("referenceUrls", e.target.value.split("\n").map(s => s.trim()).filter(Boolean))} placeholder="https://..." />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Banned Terms / Visual Don'ts</Label>
          <Textarea rows={2} value={current.bannedTerms || ""} onChange={e => update("bannedTerms", e.target.value)} placeholder="No drone shots, no slow-motion, no neon blue..." />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Director Notes</Label>
          <Textarea rows={3} value={current.notes || ""} onChange={e => update("notes", e.target.value)} placeholder="Anything else generators or collaborators must respect..." />
        </div>
        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-muted-foreground">{q.data?.updatedAt ? `Last saved ${new Date(q.data.updatedAt).toLocaleString()}` : "Not yet saved"}</div>
          <Button size="sm" onClick={() => save.mutate({ projectId, data: current })} disabled={save.isPending}>
            <Save className="h-3.5 w-3.5 mr-1.5" />Save Style Bible
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ Shot Versions Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ */
function ShotVersionsTab({ projectId }: { projectId: number }) {
  const scenes = trpc.scene.listByProject.useQuery({ projectId });
  const versionsAll = trpc.shotVersions.list.useQuery({ projectId });
  const save = trpc.shotVersions.save.useMutation({ onSuccess: () => { toast.success("Versions updated"); versionsAll.refetch(); } });

  const [selectedSceneId, setSelectedSceneId] = useState<number | null>(null);
  const sceneList = (scenes.data || []) as any[];
  const sceneId = selectedSceneId ?? sceneList[0]?.id ?? null;

  const versionMap = useMemo(() => {
    const m = new Map<number, any[]>();
    for (const v of (versionsAll.data || [])) m.set(v.sceneId, v.versions);
    return m;
  }, [versionsAll.data]);

  const scene = sceneList.find(s => s.id === sceneId);
  const versions = (sceneId != null ? versionMap.get(sceneId) : []) || [];

  // Auto-seed the live videoUrl as v1 if nothing saved yet
  const [draft, setDraft] = useState<any[] | null>(null);
  const live: any[] = draft ?? (versions.length ? versions : (scene?.videoUrl ? [{ label: "v1 (current)", url: scene.videoUrl, model: scene.videoProvider || "", isFinal: true, createdAt: new Date().toISOString() }] : []));

  const updateRow = (i: number, patch: any) => {
    const next = [...live]; next[i] = { ...next[i], ...patch };
    if (patch.isFinal) next.forEach((v, j) => { if (j !== i) v.isFinal = false; });
    setDraft(next);
  };
  const addRow = () => setDraft([...live, { label: `v${live.length + 1}`, url: "", model: "", prompt: "", notes: "", isFinal: false, createdAt: new Date().toISOString() }]);
  const removeRow = (i: number) => setDraft(live.filter((_, j) => j !== i));
  const persist = () => { if (sceneId == null) return; save.mutate({ projectId, sceneId, versions: live }); setDraft(null); };

  return (
    <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-4">
      <CardclassName="glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow" >
        <CardclassName="glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow" Header><CardTitle className="text-sm gradient-text-gold">Scenes</CardTitle></CardHeader>
        <CardContent className="p-2 max-h-[60vh] overflow-y-auto">
          {sceneList.length === 0 ? (
            <p className="text-xs text-muted-foreground p-3 leading-relaxed">No scenes loaded Ã¢ÂÂ open a project with scenes to begin a Pro Studio session.</p>
          ) : sceneList.map(s => (
            <button key={s.id} onClick={() => { setSelectedSceneId(s.id); setDraft(null); }} className={`w-full text-left p-2 rounded text-xs hover:bg-muted/50 ${sceneId === s.id ? "bg-muted/70 ring-1 ring-primary/30" : ""}`}>
              <div className="font-medium truncate">{s.title || s.name || `Scene ${s.id}`}</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Badge variant="outline" className="text-[9px] h-4 px-1">{(versionMap.get(s.id) || []).length || (s.videoUrl ? 1 : 0)} ver</Badge>
                {s.videoUrl && <Badge variant="outline" className="text-[9px] h-4 px-1 text-amber-400 border-amber-500/30">video</Badge>}
              </div>
            </button>
          ))}
        </CardContent>
      </Card>

      <CardclassName="glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow" >
        <CardclassName="glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow" Header>
          <CardTitle className="text-sm gradient-text-gold">{scene ? `Versions Ã¢ÂÂ ${scene.title || scene.name || `Scene ${scene.id}`}` : "Select a scene"}</CardTitle>
          <p className="text-xs text-muted-foreground">Track every render of this shot. Mark one as final so editors and reviewers know what to use.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {sceneId == null ? null : (
            <>
              {live.map((v, i) => (
                <div key={i} className="border rounded p-3 space-y-2 bg-card/30">
                  <div className="flex items-center gap-2">
                    <Input value={v.label || ""} onChange={e => updateRow(i, { label: e.target.value })} placeholder={`v${i + 1}`} className="h-8 text-xs max-w-[140px]" />
                    <Input value={v.model || ""} onChange={e => updateRow(i, { model: e.target.value })} placeholder="model (sora-2-pro, runway, veo3...)" className="h-8 text-xs" />
                    <div className="flex items-center gap-1.5">
                      <Switch checked={!!v.isFinal} onCheckedChange={c => updateRow(i, { isFinal: c })} />
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Final</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeRow(i)} aria-label="Remove version"><Trash2 className="h-3.5 w-3.5 text-destructive" aria-hidden="true" /></Button>
                  </div>
                  <Input value={v.url || ""} onChange={e => updateRow(i, { url: e.target.value })} placeholder="https://...mp4 / .png Ã¢ÂÂ paste render URL" className="h-8 text-xs" />
                  <Textarea rows={2} value={v.prompt || ""} onChange={e => updateRow(i, { prompt: e.target.value })} placeholder="Prompt used for this version" className="text-xs" />
                  <Textarea rows={1} value={v.notes || ""} onChange={e => updateRow(i, { notes: e.target.value })} placeholder="Director notes Ã¢ÂÂ what's good/bad about this version" className="text-xs" />
                  {v.url && (v.url.endsWith(".mp4") || v.url.endsWith(".webm") ? (
                    <video src={v.url} controls className="w-full max-w-md rounded" />
                  ) : (
                    <img src={v.url} alt={v.label} className="max-w-xs rounded" />
                  ))}
                </div>
              ))}
              <div className="flex justify-between">
                <Button variant="outline" size="sm" onClick={addRow}><Plus className="h-3.5 w-3.5 mr-1" />Add Version</Button>
                <Button size="sm" onClick={persist} disabled={save.isPending || !draft}><Save className="h-3.5 w-3.5 mr-1.5" />Save</Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ Voice Consent Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ */
function VoiceConsentTab({ projectId }: { projectId: number }) {
  const characters = trpc.character.listByProject.useQuery({ projectId });
  const consents = trpc.voiceConsent.list.useQuery({ projectId });
  const upsert = trpc.voiceConsent.upsert.useMutation({ onSuccess: () => { toast.success("Consent recorded"); consents.refetch(); setOpen(false); } });
  const remove = trpc.voiceConsent.remove.useMutation({ onSuccess: () => { toast.success("Consent removed"); consents.refetch(); } });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ characterKey: "", signedBy: "", signedDate: new Date().toISOString().slice(0, 10), allowedUses: "Promotional and final film use only", sampleUrl: "", notes: "", ipConfirmed: false });

  const consentByKey = useMemo(() => {
    const m = new Map<string, any>();
    for (const c of (consents.data || [])) m.set(c.key, c);
    return m;
  }, [consents.data]);

  return (
    <CardclassName="glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow" >
      <CardclassName="glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow" Header>
        <CardTitle className="text-base gradient-text-gold">AI Voice & Likeness Consent</CardTitle>
        <p className="text-xs text-muted-foreground">Required when cloning a real person's voice or using a likeness that resembles a real performer. Distributors and platforms require this paper trail before accepting AI content.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {(characters.data || []).length === 0 ? (
          <p className="text-xs text-muted-foreground">No characters yet. Create characters in the Characters page first.</p>
        ) : (
          <div className="space-y-2">
            {((characters.data || []) as any[]).map(c => {
              const consent = consentByKey.get(String(c.id));
              return (
                <div key={c.id} className="flex items-center gap-3 p-3 border rounded">
                  {c.thumbnailUrl ? <img src={c.thumbnailUrl} className="h-10 w-10 rounded object-cover" alt={c.name} /> : <div className="h-10 w-10 rounded bg-muted" />}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{c.name}</div>
                    {consent ? (
                      <div className="text-xs text-emerald-400">Ã¢ÂÂ Signed by {consent.data.signedBy} on {consent.data.signedDate}</div>
                    ) : (
                      <div className="text-xs text-amber-400">Ã¢ÂÂ  No consent on file Ã¢ÂÂ only synthetic / fictional voices allowed</div>
                    )}
                  </div>
                  <Button size="sm" variant={consent ? "outline" : "default"} onClick={() => {
                    setForm({
                      characterKey: String(c.id),
                      signedBy: consent?.data.signedBy || "",
                      signedDate: consent?.data.signedDate || new Date().toISOString().slice(0, 10),
                      allowedUses: consent?.data.allowedUses || "Promotional and final film use only",
                      sampleUrl: consent?.data.sampleUrl || "",
                      notes: consent?.data.notes || "",
                      ipConfirmed: consent?.data.ipConfirmed || false,
                    });
                    setOpen(true);
                  }}>{consent ? "View / Edit" : "Add Consent"}</Button>
                  {consent && <Button size="icon" variant="ghost" onClick={() => remove.mutate({ projectId, characterKey: String(c.id) })} aria-label={`Remove consent for ${c.name || c.id}`}><Trash2 className="h-3.5 w-3.5 text-destructive" aria-hidden="true" /></Button>}
                </div>
              );
            })}
          </div>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle className="gradient-text-gold">Voice / Likeness Consent</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Signed By (full legal name)</Label>
                <Input value={form.signedBy} onChange={e => setForm({ ...form, signedBy: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Date Signed</Label>
                <Input type="date" value={form.signedDate} onChange={e => setForm({ ...form, signedDate: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Allowed Uses</Label>
                <Textarea rows={2} value={form.allowedUses} onChange={e => setForm({ ...form, allowedUses: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Voice Sample URL (reference)</Label>
                <Input value={form.sampleUrl} onChange={e => setForm({ ...form, sampleUrl: e.target.value })} placeholder="https://...mp3" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Notes</Label>
                <Textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Restrictions, expiration date, royalty terms..." />
              </div>
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={form.ipConfirmed} onChange={e => setForm({ ...form, ipConfirmed: e.target.checked })} />
                I confirm the signer owns or controls the rights to this voice/likeness and grants the above usage.
              </label>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={() => upsert.mutate({ projectId, characterKey: form.characterKey, data: { signedBy: form.signedBy, signedDate: form.signedDate, allowedUses: form.allowedUses, sampleUrl: form.sampleUrl || undefined, notes: form.notes || undefined, ipConfirmed: form.ipConfirmed } })} disabled={!form.signedBy || !form.ipConfirmed || upsert.isPending}>Save Consent</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

/* Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ Provenance Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ */
function ProvenanceTab({ projectId }: { projectId: number }) {
  const q = trpc.provenance.export.useQuery({ projectId });

  const download = () => {
    if (!q.data) return;
    const blob = new Blob([JSON.stringify(q.data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `virelle-provenance-${q.data.project.id}.c2pa.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <CardclassName="glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow" >
      <CardclassName="glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow" Header>
        <CardTitle className="text-base flex items-center gap-2 gradient-text-gold"><FileJson className="h-4 w-4" />Content Provenance Manifest</CardTitle>
        <p className="text-xs text-muted-foreground">C2PA-compatible JSON listing every AI-generated asset in this project, the model used, and required disclosure language. Submit alongside YouTube, Meta, TikTok, and broadcast deliverables.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {q.isLoading && <p className="text-xs text-muted-foreground">Building manifest...</p>}
        {q.data && (
          <>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="border rounded p-3"><div className="text-muted-foreground">Spec</div><div className="font-mono">{q.data.spec}</div></div>
              <div className="border rounded p-3"><div className="text-muted-foreground">Assertions</div><div className="text-lg font-bold">{q.data.assertionCount}</div></div>
              <div className="border rounded p-3"><div className="text-muted-foreground">Generated</div><div>{new Date(q.data.generatedAt).toLocaleString()}</div></div>
            </div>
            <div className="border rounded p-3 bg-amber-500/5 border-amber-500/30 text-xs">
              <div className="font-medium text-amber-400 mb-1">AI Disclosure Statement</div>
              <p>{q.data.aiDisclosure.statement}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {q.data.aiDisclosure.standards.map((s: string) => <Badge key={s} variant="outline" className="text-[9px]">{s}</Badge>)}
              </div>
            </div>
            <Button size="sm" onClick={download}><Download className="h-3.5 w-3.5 mr-1.5" />Download .c2pa.json</Button>
            <details>
              <summary className="cursor-pointer text-xs text-muted-foreground">Preview manifest ({q.data.assertionCount} assertions)</summary>
              <pre className="mt-2 p-3 bg-muted rounded text-[10px] overflow-x-auto max-h-96">{JSON.stringify(q.data, null, 2)}</pre>
            </details>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/* Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ Render History Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ */
function RenderHistoryTab() {
  const summary = trpc.renderHistory.summary.useQuery();
  const list = trpc.renderHistory.list.useQuery({ limit: 100 });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <CardclassName="glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow" ><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total credits spent</div><div className="text-2xl font-bold gradient-text-gold">{summary.data?.totalSpent ?? 0}</div></CardContent></Card>
        <CardclassName="glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow" ><CardContent className="p-4"><div className="text-xs text-muted-foreground">Last 30 days</div><div className="text-2xl font-bold gradient-text-gold">{summary.data?.last30Days ?? 0}</div></CardContent></Card>
        <CardclassName="glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow" ><CardContent className="p-4"><div className="text-xs text-muted-foreground">Distinct actions</div><div className="text-2xl font-bold gradient-text-gold">{summary.data?.byAction.length ?? 0}</div></CardContent></Card>
      </div>

      <CardclassName="glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow" >
        <CardclassName="glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow" Header><CardTitle className="text-sm gradient-text-gold">Top Cost Drivers</CardTitle></CardHeader>
        <CardclassName="glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow" Content>
          <div className="space-y-1.5">
            {(summary.data?.byAction || []).slice(0, 12).map(a => (
              <div key={a.action} className="flex items-center justify-between text-xs border-b py-1.5">
                <div className="font-mono">{a.action}</div>
                <div className="flex items-center gap-3 text-muted-foreground"><span>{a.count}ÃÂ</span><span className="font-bold text-foreground">{a.total} cr</span></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <CardclassName="glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow" >
        <CardclassName="glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow" Header><CardTitle className="text-sm gradient-text-gold">Recent Render Activity</CardTitle></CardHeader>
        <CardclassName="glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow" Content>
          <div className="space-y-1 max-h-[60vh] overflow-y-auto">
            {(list.data || []).map(r => (
              <div key={r.id} className="flex items-center justify-between text-xs py-1.5 border-b">
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-[10px] text-muted-foreground">{r.action}</div>
                  <div className="truncate">{r.description}</div>
                </div>
                <div className="text-right">
                  <div className={`font-bold ${r.amount < 0 ? "text-rose-400" : "text-emerald-400"}`}>{r.amount > 0 ? "+" : ""}{r.amount} cr</div>
                  <div className="text-[10px] text-muted-foreground">{new Date(r.createdAt).toLocaleString()}</div>
                </div>
              </div>
            ))}
            {(list.data || []).length === 0 && <p className="text-xs text-muted-foreground p-2">No render activity yet.</p>}
          </div>
        </CardContent>
      </Card>
        </div>
  );
}
