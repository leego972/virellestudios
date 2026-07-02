import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { SubscriptionGate } from "@/components/SubscriptionGate";
import { Radio, RadioTower, Video, KeyRound, Loader2, RefreshCcw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

type TransformGoal = "appearance_reference" | "boy_to_girl" | "girl_to_boy" | "younger_self" | "older_self" | "adult_to_child" | "child_to_adult" | "custom_prompt";
type Provider = "runway" | "openai" | "replicate" | "fal" | "luma" | "huggingface" | "seedance" | "veo3";

const PROVIDERS: Provider[] = ["runway", "openai", "replicate", "fal", "luma", "huggingface", "seedance", "veo3"];

function parseUrls(value: string) {
  return value.split(/\n|,/).map((v) => v.trim()).filter(Boolean);
}

function Inner() {
  const byokStatus = (trpc as any).virelleBroadcastRender.getByokStatus.useQuery(undefined, { retry: false });
  const jobs = (trpc as any).virelleBroadcastRender.listJobs.useQuery({ limit: 25 }, { retry: false });
  const createRender = (trpc as any).virelleBroadcastRender.createStudioRenderJob.useMutation();
  const createBroadcast = (trpc as any).virelleBroadcastRender.createBroadcastSession.useMutation();

  const [projectId, setProjectId] = useState("");
  const [sceneId, setSceneId] = useState("");
  const [sourceVideoUrl, setSourceVideoUrl] = useState("");
  const [referenceVideoUrl, setReferenceVideoUrl] = useState("");
  const [sourceImageUrls, setSourceImageUrls] = useState("");
  const [referenceImageUrls, setReferenceImageUrls] = useState("");
  const [transformGoal, setTransformGoal] = useState<TransformGoal>("appearance_reference");
  const [targetAge, setTargetAge] = useState("");
  const [targetPresentation, setTargetPresentation] = useState("");
  const [requestedProvider, setRequestedProvider] = useState<Provider | "">("");
  const [directorNotes, setDirectorNotes] = useState("");
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [destination, setDestination] = useState<"rtmp" | "webrtc" | "obs" | "custom">("rtmp");
  const [ingestUrl, setIngestUrl] = useState("");
  const [streamKey, setStreamKey] = useState("");

  const basePayload = {
    projectId: projectId.trim() ? Number(projectId) : null,
    sceneId: sceneId.trim() ? Number(sceneId) : null,
    sourceVideoUrl: sourceVideoUrl.trim() || null,
    referenceVideoUrl: referenceVideoUrl.trim() || null,
    sourceImageUrls: parseUrls(sourceImageUrls),
    referenceImageUrls: parseUrls(referenceImageUrls),
    transformGoal,
    targetAge: targetAge.trim() ? Number(targetAge) : null,
    targetPresentation: targetPresentation.trim() || null,
    requestedProvider: requestedProvider || null,
    directorNotes: directorNotes.trim() || null,
    consentConfirmed,
    hideVisibleWatermark: true,
  };

  const submitStudioRender = async () => {
    try {
      const result = await createRender.mutateAsync(basePayload);
      toast.success(`Studio render queued with ${result.provider}. Job #${result.jobId}`);
      jobs.refetch();
    } catch (err: any) {
      toast.error(err?.message || "Could not create Studio Render job");
    }
  };

  const submitBroadcast = async () => {
    try {
      const result = await createBroadcast.mutateAsync({ ...basePayload, destination, ingestUrl: ingestUrl.trim() || null, streamKey: streamKey.trim() || null });
      toast.success(`Broadcast session ready with ${result.provider}. Session #${result.sessionId}`);
      jobs.refetch();
    } catch (err: any) {
      toast.error(err?.message || "Could not create Broadcast session");
    }
  };

  const providerStatus = byokStatus.data?.providers || {};
  const hasAnyProvider = Boolean(byokStatus.data?.hasAnyProvider);

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2"><RadioTower className="h-6 w-6 text-amber-400" /> Virelle Broadcast & Studio Render</h1>
            <p className="text-sm text-muted-foreground">Creator+ BYOK video transformation. Virelle unlocks workflow/orchestration; users pay provider rendering with their own API keys.</p>
          </div>
          <Button variant="outline" onClick={() => { byokStatus.refetch(); jobs.refetch(); }}><RefreshCcw className="mr-2 h-4 w-4" /> Refresh</Button>
        </div>

        <Card className="border-amber-500/20">
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><KeyRound className="h-4 w-4 text-amber-400" /> BYOK Provider Status</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {PROVIDERS.map((p) => <Badge key={p} variant={providerStatus[p] ? "default" : "outline"}>{p}: {providerStatus[p] ? "ready" : "missing"}</Badge>)}
            </div>
            {!hasAnyProvider && <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">BYOK required. Add your own Runway, OpenAI/Sora, Replicate, fal.ai, Luma, Hugging Face, SeedDance or Veo key in Virelle settings before creating premium video jobs.</div>}
            <p className="text-xs text-muted-foreground">Policy: no platform-funded user video. Membership covers access/orchestration only.</p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Video className="h-4 w-4 text-amber-400" /> Source & Reference Media</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3"><div><Label>Project ID</Label><input className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={projectId} onChange={(e) => setProjectId(e.target.value.replace(/[^0-9]/g, ""))} /></div><div><Label>Scene ID</Label><input className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={sceneId} onChange={(e) => setSceneId(e.target.value.replace(/[^0-9]/g, ""))} /></div></div>
              <div><Label>Source video URL</Label><input className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="https://...source.mp4" value={sourceVideoUrl} onChange={(e) => setSourceVideoUrl(e.target.value)} /></div>
              <div><Label>Reference video URL</Label><input className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="https://...reference.mp4" value={referenceVideoUrl} onChange={(e) => setReferenceVideoUrl(e.target.value)} /></div>
              <div><Label>Source image URLs</Label><Textarea className="min-h-20 text-xs" placeholder="One URL per line" value={sourceImageUrls} onChange={(e) => setSourceImageUrls(e.target.value)} /></div>
              <div><Label>Reference image URLs</Label><Textarea className="min-h-20 text-xs" placeholder="One URL per line" value={referenceImageUrls} onChange={(e) => setReferenceImageUrls(e.target.value)} /></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-4 w-4 text-amber-400" /> Transform Controls</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div><Label>Transform goal</Label><select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={transformGoal} onChange={(e) => setTransformGoal(e.target.value as TransformGoal)}><option value="appearance_reference">Appearance reference</option><option value="boy_to_girl">Boy → Girl</option><option value="girl_to_boy">Girl → Boy</option><option value="younger_self">Younger self</option><option value="older_self">Older self</option><option value="adult_to_child">Adult → child / childhood self</option><option value="child_to_adult">Child → adult</option><option value="custom_prompt">Custom prompt</option></select></div>
              <div className="grid grid-cols-2 gap-3"><div><Label>Target age</Label><input className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={targetAge} onChange={(e) => setTargetAge(e.target.value.replace(/[^0-9]/g, ""))} /></div><div><Label>Preferred BYOK provider</Label><select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={requestedProvider} onChange={(e) => setRequestedProvider(e.target.value as Provider | "")}><option value="">Auto from my keys</option>{PROVIDERS.map((p) => <option key={p} value={p}>{p}</option>)}</select></div></div>
              <div><Label>Target presentation/style</Label><input className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="cinematic, 10-year-old self, masculine, feminine..." value={targetPresentation} onChange={(e) => setTargetPresentation(e.target.value)} /></div>
              <div><Label>Director / VFX notes</Label><Textarea className="min-h-28 text-xs" value={directorNotes} onChange={(e) => setDirectorNotes(e.target.value)} /></div>
              <div className="flex items-start gap-2 rounded-lg border p-3"><Checkbox checked={consentConfirmed} onCheckedChange={(v) => setConsentConfirmed(Boolean(v))} /><p className="text-xs text-muted-foreground">I confirm consent and rights clearance for likeness, age, gender/presentation, digital-double, broadcast and render usage.</p></div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card className="border-blue-500/20">
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Radio className="h-4 w-4 text-blue-400" /> Broadcast Mode</CardTitle></CardHeader>
            <CardContent className="space-y-3"><div><Label>Destination</Label><select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={destination} onChange={(e) => setDestination(e.target.value as any)}><option value="rtmp">RTMP</option><option value="webrtc">WebRTC</option><option value="obs">OBS bridge</option><option value="custom">Custom</option></select></div><div><Label>Ingest URL</Label><input className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="rtmp://..." value={ingestUrl} onChange={(e) => setIngestUrl(e.target.value)} /></div><div><Label>Stream key</Label><input className="w-full rounded-md border bg-background px-3 py-2 text-sm" type="password" value={streamKey} onChange={(e) => setStreamKey(e.target.value)} /></div><Button className="w-full" onClick={submitBroadcast} disabled={createBroadcast.isPending || !hasAnyProvider}>{createBroadcast.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Radio className="mr-2 h-4 w-4" />} Create BYOK Broadcast Session</Button></CardContent>
          </Card>

          <Card className="border-amber-500/20">
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Video className="h-4 w-4 text-amber-400" /> Studio Render Mode</CardTitle></CardHeader>
            <CardContent className="space-y-3"><p className="text-sm text-muted-foreground">Upload footage/reference media, queue a high-quality video transformation job, then the worker submits it to the user's own BYOK provider.</p><Button className="w-full bg-amber-500 text-black hover:bg-amber-600" onClick={submitStudioRender} disabled={createRender.isPending || !hasAnyProvider}>{createRender.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Video className="mr-2 h-4 w-4" />} Create BYOK Studio Render Job</Button></CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Recent Broadcast / Render Jobs</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {jobs.isLoading && <p className="text-sm text-muted-foreground">Loading jobs...</p>}
            {(jobs.data || []).map((job: any) => <div key={job.id} className="rounded-lg border p-3 text-sm flex flex-col md:flex-row md:items-center md:justify-between gap-2"><div><div className="font-medium">#{job.id} · {job.mode} · {job.transformGoal}</div><div className="text-xs text-muted-foreground">Provider: {job.provider} · Status: {job.status} · BYOK: {job.byokRequired ? "yes" : "no"}</div></div><Badge variant={job.status === "failed" ? "destructive" : "outline"}>{job.status}</Badge></div>)}
            {!jobs.isLoading && (!jobs.data || jobs.data.length === 0) && <p className="text-sm text-muted-foreground">No jobs yet.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function VirelleBroadcastRender() {
  return <SubscriptionGate feature="Virelle Broadcast & Studio Render" featureKey="canUseVisualEffects" requiredTier="creator"><Inner /></SubscriptionGate>;
}
