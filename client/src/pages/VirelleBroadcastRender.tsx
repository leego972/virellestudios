import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { SubscriptionGate } from "@/components/SubscriptionGate";
import { AlertTriangle, Copy, Download, ExternalLink, KeyRound, Loader2, Radio, RadioTower, RefreshCcw, ShieldCheck, Upload, Video, XCircle } from "lucide-react";
import { toast } from "sonner";

type TransformGoal = "appearance_reference" | "boy_to_girl" | "girl_to_boy" | "younger_self" | "older_self" | "adult_to_child" | "child_to_adult" | "custom_prompt";
type Provider = "runway" | "openai" | "replicate" | "fal" | "luma" | "huggingface" | "seedance" | "veo3";

const PROVIDERS: Provider[] = ["runway", "openai", "replicate", "fal", "luma", "huggingface", "seedance", "veo3"];
const API_KEY_SETTINGS_URL = "/settings?tab=api-keys&source=virelle-broadcast-render";

function parseUrls(value: string) {
  return value.split(/\n|,/).map((v) => v.trim()).filter(Boolean);
}

function copyText(value: string, label = "Copied") {
  navigator.clipboard?.writeText(value).then(() => toast.success(label)).catch(() => toast.error("Could not copy"));
}

const STATUS_COPY: Record<string, string> = {
    queued: "Job accepted. Waiting for render worker.",
    waiting_for_provider: "Ready/submitted to BYOK provider.",
    processing: "Provider is processing.",
    broadcast_ready: "Broadcast session configured.",
    completed: "Output ready.",
    failed: "Failed. Review error.",
    cancelled: "Cancelled.",
  };

  function statusVariant(status: string) {
  if (status === "failed" || status === "cancelled") return "destructive" as const;
  if (status === "completed" || status === "broadcast_ready") return "default" as const;
  return "outline" as const;
}

function jobInstructions(job: any) {
  if (job.mode === "broadcast") {
    if (job.broadcastDestination === "rtmp") return "Use the configured ingest destination in your streaming platform. Raw stream keys are never displayed or stored here.";
    if (job.broadcastDestination === "webrtc") return "Use WebRTC bridge mode when the live bridge worker is connected.";
    if (job.broadcastDestination === "obs") return "Use OBS bridge mode once the desktop/OBS bridge is connected.";
    return "Custom broadcast destination. Confirm setup details with your destination provider.";
  }
  if (job.status === "completed") return "Studio render completed. Preview, download, or copy the output video URL.";
  if (job.status === "failed") return "Studio render failed. Review the error, fix BYOK/provider/media issues, then create a new job.";
  return "Studio render is queued or waiting for the BYOK provider worker.";
}

function Inner() {
  const user = (trpc as any).auth.me.useQuery();
  const byokStatus = (trpc as any).virelleBroadcastRender.getByokStatus.useQuery(undefined, { retry: false });
  const jobs = (trpc as any).virelleBroadcastRender.listJobs.useQuery({ limit: 25 }, { retry: false, refetchInterval: 10_000 });
  const createRender = (trpc as any).virelleBroadcastRender.createStudioRenderJob.useMutation();
  const createBroadcast = (trpc as any).virelleBroadcastRender.createBroadcastSession.useMutation();
  const cancelJob = (trpc as any).virelleBroadcastRender.cancelJob.useMutation();
    const uploadRefImageMutation = (trpc as any).upload.referenceImage.useMutation();

    const sourceImageRef = useRef<HTMLInputElement>(null);
    const referenceImageRef = useRef<HTMLInputElement>(null);
    const sourceVideoRef = useRef<HTMLInputElement>(null);
    const referenceVideoRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState<string | null>(null);

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
  type BroadcastDestination = "rtmp" | "rtmp_onlyfans" | "rtmp_fansly" | "rtmp_chaturbate" | "webrtc" | "obs" | "custom";
  type BroadcastChannel = { destination: BroadcastDestination; ingestUrl: string; streamKey: string };
  const [channels, setChannels] = useState<BroadcastChannel[]>([{ destination: "rtmp", ingestUrl: "", streamKey: "" }]);

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

  function destDefaultUrl(dest: string) {
    if (dest === "rtmp_onlyfans") return "rtmps://live.onlyfans.com/app/";
    if (dest === "rtmp_fansly") return "rtmps://live.fansly.com/live/";
    if (dest === "rtmp_chaturbate") return "rtmp://broadcast.chaturbate.com/live/";
    return "";
  }

  // v7.3 — "Go Live as Avatar": prefill avatar media handed off from Swappys / VFX Suite
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const avatarRef = params.get("avatarRef");
    const avatarSource = params.get("avatarSource");
    const goal = params.get("goal");
    const fromProject = params.get("projectId");
    const fromScene = params.get("sceneId");
    if (avatarRef) setReferenceImageUrls((prev) => prev || decodeURIComponent(avatarRef));
    if (avatarSource) setSourceImageUrls((prev) => prev || decodeURIComponent(avatarSource));
    if (goal) setTransformGoal(goal as TransformGoal);
    if (fromProject) setProjectId(fromProject);
    if (fromScene) setSceneId(fromScene);
    if (avatarRef || avatarSource) toast.success("Swappys avatar loaded — ready to go live!");
  }, []);

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
    // v7.3 — Broadcast avatar age floor (mirrors server enforcement)
    const ageNum = targetAge.trim() ? Number(targetAge) : null;
    if (transformGoal === "adult_to_child") {
      toast.error("Child-transform avatars are not permitted in live Broadcast. Broadcast avatars must be 16 or older.");
      return;
    }
    if (ageNum != null && ageNum < 16) {
      toast.error("Broadcast avatar target age must be 16 or older.");
      return;
    }
    if (transformGoal === "younger_self" && ageNum == null) {
      toast.error("\"Younger self\" broadcasts require an explicit target age of 16 or older.");
      return;
    }
    try {
      const result = await createBroadcast.mutateAsync({
        ...basePayload,
        channels: channels.map((ch) => ({
          destination: ch.destination,
          ingestUrl: ch.ingestUrl.trim() || null,
          streamKey: ch.streamKey.trim() || null,
        })),
      });
      toast.success(`Broadcast session ready with ${result.provider}. Session #${result.sessionId} · ${channels.length} channel${channels.length > 1 ? "s" : ""}`);
      jobs.refetch();
    } catch (err: any) {
      toast.error(err?.message || "Could not create Broadcast session");
    }
  };

  const doCancelJob = async (id: number) => {
    try {
      await cancelJob.mutateAsync({ id });
      toast.success("Job cancelled");
      jobs.refetch();
    } catch (err: any) {
      toast.error(err?.message || "Could not cancel job");
    }
  };

  const uploadMedia = async (files: FileList | null, kind: "sourceImage" | "referenceImage" | "sourceVideo" | "referenceVideo") => {
      if (!files || files.length === 0) return;
      const sceneIdNum = sceneId.trim() ? Number(sceneId) : undefined;
      setUploading(kind);
      try {
        const urls: string[] = [];
        for (const file of Array.from(files)) {
          if ((kind === "sourceVideo" || kind === "referenceVideo") && !file.type.startsWith("video/")) {
            toast.error("Please select a video file.");
            continue;
          }
          const reader = new FileReader();
          const base64 = await new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve(String(reader.result).split(",")[1]);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          try {
            const result = await uploadRefImageMutation.mutateAsync({ base64, filename: file.name, contentType: file.type as any, sceneId: sceneIdNum });
            urls.push(result.url);
          } catch (uploadErr: any) {
            if (kind === "sourceVideo" || kind === "referenceVideo") {
              toast.error("Video upload endpoint not ready. Paste a video URL instead.");
            } else {
              throw uploadErr;
            }
            return;
          }
        }
        if (urls.length === 0) return;
        if (kind === "sourceImage") setSourceImageUrls((prev) => prev ? prev + "\n" + urls.join("\n") : urls.join("\n"));
        if (kind === "referenceImage") setReferenceImageUrls((prev) => prev ? prev + "\n" + urls.join("\n") : urls.join("\n"));
        if (kind === "sourceVideo") setSourceVideoUrl(urls[0]);
        if (kind === "referenceVideo") setReferenceVideoUrl(urls[0]);
        toast.success(`${urls.length} file${urls.length === 1 ? "" : "s"} uploaded`);
      } catch (err: any) {
        toast.error(err?.message || "Upload failed");
      } finally {
        setUploading(null);
      }
    };

    const providerStatus = byokStatus.data?.providers || {};
  const hasAnyProvider = Boolean(byokStatus.data?.hasAnyProvider);
  const isAdultVerified = user.data?.isAdultVerified;

  if (user.data && !isAdultVerified) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6 flex items-center justify-center">
        <Card className="max-w-md border-red-500/30 bg-red-500/5">
          <CardHeader className="text-center">
            <ShieldCheck className="mx-auto h-12 w-12 text-red-500 mb-2" />
            <CardTitle className="text-xl">Age Verification Required</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              Virelle Broadcast features (including live cam presets) are strictly for users aged 18 and over. 
              Please verify your age in your profile settings to unlock this feature.
            </p>
            <Button className="w-full" onClick={() => window.location.href = "/settings?tab=profile"}>
              Verify My Age in Settings
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2"><RadioTower className="h-6 w-6 text-amber-400" /> Virelle Broadcast & Studio Render</h1>
            <p className="text-sm text-muted-foreground">Creator+ BYOK video workflow. Virelle unlocks orchestration and audit/provenance; users pay provider rendering with their own API keys.</p>
          </div>
          <Button variant="outline" onClick={() => { byokStatus.refetch(); jobs.refetch(); }}><RefreshCcw className="mr-2 h-4 w-4" /> Refresh</Button>
        </div>

        <Card className="border-amber-500/20">
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><KeyRound className="h-4 w-4 text-amber-400" /> BYOK Provider Status</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {PROVIDERS.map((p) => <Badge key={p} variant={providerStatus[p] ? "default" : "outline"}>{p}: {providerStatus[p] ? "ready" : "missing"}</Badge>)}
            </div>
            {!hasAnyProvider && <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100 flex flex-col gap-3"><div className="flex gap-2"><AlertTriangle className="h-4 w-4 mt-0.5" /><span>BYOK required. Add your own video provider key before creating Broadcast or Studio Render jobs. Virelle will not pay provider costs for user projects.</span></div><Button size="sm" className="w-fit" onClick={() => { window.location.href = API_KEY_SETTINGS_URL; }}><KeyRound className="mr-2 h-4 w-4" /> Add Provider Key</Button></div>}
            <p className="text-xs text-muted-foreground">Policy: no platform-funded user video. Membership covers access, orchestration, workflow, audit/provenance and watermark controls only.</p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Video className="h-4 w-4 text-amber-400" /> Source & Reference Media</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3"><div><Label>Project ID</Label><input className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={projectId} onChange={(e) => setProjectId(e.target.value.replace(/[^0-9]/g, ""))} /></div><div><Label>Scene ID</Label><input className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={sceneId} onChange={(e) => setSceneId(e.target.value.replace(/[^0-9]/g, ""))} /></div></div>
              <div>
                  <Label>Source video URL</Label>
                  <div className="flex gap-2">
                    <input className="flex-1 rounded-md border bg-background px-3 py-2 text-sm" placeholder="https://...source.mp4" value={sourceVideoUrl} onChange={(e) => setSourceVideoUrl(e.target.value)} />
                    <Button type="button" size="sm" variant="outline" disabled={uploading === "sourceVideo"} onClick={() => sourceVideoRef.current?.click()}>
                      {uploading === "sourceVideo" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              <div>
                  <Label>Reference video URL</Label>
                  <div className="flex gap-2">
                    <input className="flex-1 rounded-md border bg-background px-3 py-2 text-sm" placeholder="https://...reference.mp4" value={referenceVideoUrl} onChange={(e) => setReferenceVideoUrl(e.target.value)} />
                    <Button type="button" size="sm" variant="outline" disabled={uploading === "referenceVideo"} onClick={() => referenceVideoRef.current?.click()}>
                      {uploading === "referenceVideo" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label>Source image URLs</Label>
                    <Button type="button" size="sm" variant="outline" className="h-7 text-xs" disabled={uploading === "sourceImage"} onClick={() => sourceImageRef.current?.click()}>
                      {uploading === "sourceImage" ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Upload className="h-3 w-3 mr-1" />} Upload images
                    </Button>
                  </div>
                  <Textarea className="min-h-20 text-xs" placeholder="One URL per line (or upload above)" value={sourceImageUrls} onChange={(e) => setSourceImageUrls(e.target.value)} />
                </div>
              <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label>Reference image URLs</Label>
                    <Button type="button" size="sm" variant="outline" className="h-7 text-xs" disabled={uploading === "referenceImage"} onClick={() => referenceImageRef.current?.click()}>
                      {uploading === "referenceImage" ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Upload className="h-3 w-3 mr-1" />} Upload images
                    </Button>
                  </div>
                  <Textarea className="min-h-20 text-xs" placeholder="One URL per line (or upload above)" value={referenceImageUrls} onChange={(e) => setReferenceImageUrls(e.target.value)} />
                </div>
              <input ref={sourceImageRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => uploadMedia(e.target.files, "sourceImage")} />
              <input ref={referenceImageRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => uploadMedia(e.target.files, "referenceImage")} />
              <input ref={sourceVideoRef} type="file" accept="video/*" className="hidden" onChange={(e) => uploadMedia(e.target.files, "sourceVideo")} />
              <input ref={referenceVideoRef} type="file" accept="video/*" className="hidden" onChange={(e) => uploadMedia(e.target.files, "referenceVideo")} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-4 w-4 text-amber-400" /> Transform Controls</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div><Label>Transform goal</Label><select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={transformGoal} onChange={(e) => setTransformGoal(e.target.value as TransformGoal)}><option value="appearance_reference">Appearance reference</option><option value="boy_to_girl">Boy → Girl</option><option value="girl_to_boy">Girl → Boy</option><option value="younger_self">Younger self</option><option value="older_self">Older self</option><option value="adult_to_child">Adult → child / childhood self</option><option value="child_to_adult">Child → adult</option><option value="custom_prompt">Custom prompt</option></select></div>
              <div className="grid grid-cols-2 gap-3"><div><Label>Target age</Label><input className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={targetAge} onChange={(e) => setTargetAge(e.target.value.replace(/[^0-9]/g, ""))} /></div><div><Label>Preferred BYOK provider</Label><select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={requestedProvider} onChange={(e) => setRequestedProvider(e.target.value as Provider | "")}><option value="">Auto from my keys</option>{PROVIDERS.map((p) => <option key={p} value={p}>{p}</option>)}</select></div></div>
              <div><Label>Target presentation/style</Label><input className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="cinematic, younger self, masculine, feminine..." value={targetPresentation} onChange={(e) => setTargetPresentation(e.target.value)} /></div>
              <div><Label>Director / VFX notes</Label><Textarea className="min-h-28 text-xs" value={directorNotes} onChange={(e) => setDirectorNotes(e.target.value)} /></div>
              <div className="flex items-start gap-2 rounded-lg border p-3"><Checkbox checked={consentConfirmed} onCheckedChange={(v) => setConsentConfirmed(Boolean(v))} /><p className="text-xs text-muted-foreground">I confirm consent and rights clearance for likeness, age, gender/presentation, digital-double, broadcast and render usage.</p></div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card className="border-blue-500/20">
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Radio className="h-4 w-4 text-blue-400" /> Broadcast Mode</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {channels.map((ch, i) => (
                <div key={i} className="rounded-md border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Channel {i + 1}</span>
                    {channels.length > 1 && (
                      <button type="button" className="text-xs text-muted-foreground hover:text-red-400" onClick={() => setChannels((prev) => prev.filter((_, j) => j !== i))}>Remove</button>
                    )}
                  </div>
                  <div>
                    <Label>Destination</Label>
                    <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={ch.destination} onChange={(e) => { const dest = e.target.value as BroadcastDestination; setChannels((prev) => prev.map((c, j) => j === i ? { ...c, destination: dest, ingestUrl: destDefaultUrl(dest) } : c)); }}>
                      <option value="rtmp">RTMP (Custom)</option>
                      <option value="rtmp_onlyfans">OnlyFans</option>
                      <option value="rtmp_fansly">Fansly</option>
                      <option value="rtmp_chaturbate">Chaturbate</option>
                      <option value="webrtc">WebRTC</option>
                      <option value="obs">OBS bridge</option>
                      <option value="custom">Custom Engine</option>
                    </select>
                  </div>
                  <div>
                    <Label>Ingest URL</Label>
                    <input className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="rtmp://..." value={ch.ingestUrl} onChange={(e) => setChannels((prev) => prev.map((c, j) => j === i ? { ...c, ingestUrl: e.target.value } : c))} />
                  </div>
                  <div>
                    <Label>Stream key</Label>
                    <input className="w-full rounded-md border bg-background px-3 py-2 text-sm" type="password" value={ch.streamKey} onChange={(e) => setChannels((prev) => prev.map((c, j) => j === i ? { ...c, streamKey: e.target.value } : c))} />
                  </div>
                </div>
              ))}
              {channels.length < 5 && (
                <Button type="button" size="sm" variant="outline" className="w-full" onClick={() => setChannels((prev) => [...prev, { destination: "rtmp" as BroadcastDestination, ingestUrl: "", streamKey: "" }])}>+ Add Channel</Button>
              )}
              <Button className="w-full" onClick={submitBroadcast} disabled={createBroadcast.isPending || !hasAnyProvider}>
                {createBroadcast.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Radio className="mr-2 h-4 w-4" />} Go Live as Swappys Avatar
              </Button>
              <p className="text-xs text-muted-foreground">Raw stream keys are sent only for session setup and should not be displayed back to the user.</p>
              <p className="text-xs text-amber-200/80 flex items-start gap-1"><ShieldCheck className="h-3.5 w-3.5 mt-0.5 shrink-0" /> Broadcast avatars must depict a person aged 16+. Child-transform goals are blocked in live Broadcast mode.</p>
            </CardContent>
          </Card>

          <Card className="border-amber-500/20">
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Video className="h-4 w-4 text-amber-400" /> Studio Render Mode</CardTitle></CardHeader>
            <CardContent className="space-y-3"><p className="text-sm text-muted-foreground">Queue a high-quality video transformation job. The render worker must submit it to the user's own BYOK provider; no platform-funded fallback is allowed.</p><Button className="w-full bg-amber-500 text-black hover:bg-amber-600" onClick={submitStudioRender} disabled={createRender.isPending || !hasAnyProvider}>{createRender.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Video className="mr-2 h-4 w-4" />} Create BYOK Studio Render Job</Button></CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Recent Broadcast / Render Jobs</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {jobs.isLoading && <p className="text-sm text-muted-foreground">Loading jobs...</p>}
            {(jobs.data || []).map((job: any) => <div key={job.id} className="rounded-lg border p-3 text-sm space-y-3"><div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2"><div><div className="font-medium">#{job.id} · {job.mode} · {job.transformGoal}</div><div className="text-xs text-muted-foreground">Provider: {job.provider} · BYOK: {job.byokRequired ? "yes" : "no"} · Watermark: {job.visibleWatermarkMode || "default"}</div></div><Badge variant={statusVariant(job.status)}>{job.status}</Badge></div><p className="text-xs text-muted-foreground">{jobInstructions(job)}</p>{job.errorMessage && <div className="rounded-md border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-200 flex gap-2"><XCircle className="h-4 w-4 shrink-0" /> <span>{job.errorMessage}</span></div>}{job.outputVideoUrl && <div className="space-y-2"><video src={job.outputVideoUrl} controls className="w-full rounded-md border bg-black max-h-80" /><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => window.open(job.outputVideoUrl, "_blank")}><ExternalLink className="mr-2 h-4 w-4" /> Open</Button><Button size="sm" variant="outline" onClick={() => copyText(job.outputVideoUrl, "Output URL copied")}><Copy className="mr-2 h-4 w-4" /> Copy URL</Button><Button size="sm" variant="outline" onClick={() => window.open(job.outputVideoUrl, "_blank")}><Download className="mr-2 h-4 w-4" /> Download</Button></div></div>}{job.mode === "broadcast" && <div className="rounded-md border p-2 text-xs text-muted-foreground"><div>Destination: {job.broadcastDestination || "not set"}</div>{job.ingestUrl && <div className="truncate">Ingest: {job.ingestUrl}</div>}{job.streamKeyMasked && <div>Stream key: {job.streamKeyMasked}</div>}</div>}{["queued", "waiting_for_provider", "processing", "broadcast_ready"].includes(job.status) && <Button size="sm" variant="destructive" onClick={() => doCancelJob(job.id)} disabled={cancelJob.isPending}>Cancel Job</Button>}</div>)}
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
