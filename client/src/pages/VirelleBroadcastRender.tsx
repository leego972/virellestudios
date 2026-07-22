import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { SubscriptionGate } from "@/components/SubscriptionGate";
import {
  AlertTriangle,
  Copy,
  Download,
  ExternalLink,
  KeyRound,
  Loader2,
  Radio,
  RadioTower,
  RefreshCcw,
  ShieldCheck,
  Upload,
  Video,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

type TransformGoal = "appearance_reference" | "boy_to_girl" | "girl_to_boy" | "younger_self" | "older_self" | "adult_to_child" | "child_to_adult" | "custom_prompt";
type Provider = "runway" | "openai" | "replicate" | "fal" | "luma" | "huggingface" | "seedance" | "veo3";
type ContentMode = "standard" | "open_adult";
type BroadcastDestination = "rtmp" | "rtmp_onlyfans" | "rtmp_fansly" | "rtmp_chaturbate" | "webrtc" | "obs" | "custom";
type BroadcastChannel = { destination: BroadcastDestination; ingestUrl: string; streamKey: string };

const PROVIDERS: Provider[] = ["runway", "openai", "replicate", "fal", "luma", "huggingface", "seedance", "veo3"];
const API_KEY_SETTINGS_URL = "/settings?tab=api-keys&source=virelle-broadcast-render";

function parseUrls(value: string) {
  return value.split(/\n|,/).map((item) => item.trim()).filter(Boolean);
}

function copyText(value: string, label = "Copied") {
  navigator.clipboard?.writeText(value).then(() => toast.success(label)).catch(() => toast.error("Could not copy"));
}

function statusVariant(status: string) {
  if (status === "failed" || status === "cancelled") return "destructive" as const;
  if (status === "completed" || status === "broadcast_ready") return "default" as const;
  return "outline" as const;
}

function jobInstructions(job: any) {
  if (job.mode === "broadcast") {
    if (job.status === "waiting_for_provider") return "Outputs are securely stored and waiting for the Virelle broadcast bridge or BYOK provider worker.";
    if (job.status === "processing") return "The configured bridge accepted this session and is processing the Swappys avatar feed.";
    if (job.status === "broadcast_ready") return "Output channels are configured and encrypted; the worker will submit them to the bridge.";
    if (job.status === "completed") return "Broadcast session completed.";
  }
  if (job.status === "completed") return "Studio render completed. Preview, download, or copy the output URL.";
  if (job.status === "failed") return "The job failed. Review the error and provider configuration.";
  return "The job is queued or waiting for its BYOK provider worker.";
}

function destinationDefaultUrl(destination: BroadcastDestination) {
  if (destination === "rtmp_onlyfans") return "rtmps://live.onlyfans.com/app/";
  if (destination === "rtmp_fansly") return "rtmps://live.fansly.com/live/";
  if (destination === "rtmp_chaturbate") return "rtmp://broadcast.chaturbate.com/live/";
  return "";
}

function Inner() {
  const user = (trpc as any).auth.me.useQuery();
  const byokStatus = (trpc as any).virelleBroadcastRender.getByokStatus.useQuery(undefined, { retry: false });
  const jobs = (trpc as any).virelleBroadcastRender.listJobs.useQuery({ limit: 25 }, { retry: false, refetchInterval: 10_000 });
  const createRender = (trpc as any).virelleBroadcastRender.createStudioRenderJob.useMutation();
  const createBroadcast = (trpc as any).virelleBroadcastRender.createBroadcastSession.useMutation();
  const cancelJob = (trpc as any).virelleBroadcastRender.cancelJob.useMutation();
  const uploadRefImageMutation = (trpc as any).upload.referenceImage.useMutation();

  const queryParams = new URLSearchParams(window.location.search);
  const initialSwappysJobId = Number(queryParams.get("swappysJobId") || "0") || null;
  const handoff = (trpc as any).virelleBroadcastRender.getSwappysHandoff.useQuery(
    initialSwappysJobId ? { swappysJobId: initialSwappysJobId } : { sceneId: Number(queryParams.get("sceneId") || "0") || undefined },
    { enabled: Boolean(initialSwappysJobId || queryParams.get("sceneId")), retry: false },
  );

  const sourceImageRef = useRef<HTMLInputElement>(null);
  const referenceImageRef = useRef<HTMLInputElement>(null);
  const sourceVideoRef = useRef<HTMLInputElement>(null);
  const referenceVideoRef = useRef<HTMLInputElement>(null);

  const [sourceSwappysJobId, setSourceSwappysJobId] = useState<number | null>(initialSwappysJobId);
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
  const [contentMode, setContentMode] = useState<ContentMode>("standard");
  const [allSubjectsAdultsConfirmed, setAllSubjectsAdultsConfirmed] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [channels, setChannels] = useState<BroadcastChannel[]>([{ destination: "rtmp", ingestUrl: "", streamKey: "" }]);

  useEffect(() => {
    const data = handoff.data;
    if (!data) return;
    setSourceSwappysJobId(Number(data.id));
    setProjectId(String(data.projectId || ""));
    setSceneId(String(data.sceneId || ""));
    if (data.sourcePlateUrl) setSourceImageUrls(String(data.sourcePlateUrl));
    const references = [data.enhancedImageUrl, data.actorReferenceUrl].filter(Boolean);
    if (references.length) setReferenceImageUrls(references.join("\n"));
    setTransformGoal(data.transformGoal || "appearance_reference");
    setTargetAge(data.targetAge ? String(data.targetAge) : "");
    setTargetPresentation(data.targetPresentation || "");
    setContentMode(data.contentMode || "standard");
    setConsentConfirmed(Boolean(data.consentConfirmed));
    setAllSubjectsAdultsConfirmed(data.contentMode === "open_adult");
    toast.success(`Swappys job #${data.id} loaded into Broadcast & Studio Render.`);
  }, [handoff.data]);

  const providerStatus = byokStatus.data?.providers || {};
  const hasAnyProvider = Boolean(byokStatus.data?.hasAnyProvider);
  const bridgeConfigured = Boolean(byokStatus.data?.bridgeConfigured);
  const isAdultVerified = Boolean(user.data?.isAdultVerified);

  const basePayload = {
    projectId: projectId.trim() ? Number(projectId) : null,
    sceneId: sceneId.trim() ? Number(sceneId) : null,
    sourceSwappysJobId,
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
    contentMode,
    allSubjectsAdultsConfirmed,
    hideVisibleWatermark: true,
  };

  const validatePolicy = (broadcast: boolean) => {
    if (!consentConfirmed) {
      toast.error("Confirm likeness, media and distribution rights before continuing.");
      return false;
    }
    if (contentMode === "open_adult") {
      if (!isAdultVerified) {
        toast.error("Open Adult Creative mode requires verified 18+ status.");
        return false;
      }
      if (!allSubjectsAdultsConfirmed) {
        toast.error("Confirm that every depicted or referenced person is 18 or older.");
        return false;
      }
      if (["adult_to_child", "child_to_adult"].includes(transformGoal)) {
        toast.error("Child or childhood transforms are unavailable in Open Adult Creative mode.");
        return false;
      }
      if (targetAge.trim() && Number(targetAge) < 18) {
        toast.error("Open Adult Creative mode requires a target age of 18 or older.");
        return false;
      }
    }
    if (broadcast) {
      const minimum = contentMode === "open_adult" ? 18 : 16;
      if (transformGoal === "adult_to_child") {
        toast.error("Child-transform avatars are not permitted in live Broadcast.");
        return false;
      }
      if (targetAge.trim() && Number(targetAge) < minimum) {
        toast.error(`Broadcast avatar target age must be ${minimum} or older.`);
        return false;
      }
      if (transformGoal === "younger_self" && !targetAge.trim()) {
        toast.error(`Younger-self broadcasts require an explicit target age of ${minimum} or older.`);
        return false;
      }
    }
    return true;
  };

  const submitStudioRender = async () => {
    if (!validatePolicy(false)) return;
    try {
      const result = await createRender.mutateAsync(basePayload);
      toast.success(`Studio render queued with ${result.provider}. Job #${result.jobId}`);
      jobs.refetch();
    } catch (error: any) {
      toast.error(error?.message || "Could not create Studio Render job");
    }
  };

  const submitBroadcast = async () => {
    if (!validatePolicy(true)) return;
    try {
      const result = await createBroadcast.mutateAsync({
        ...basePayload,
        channels: channels.map((channel) => ({
          destination: channel.destination,
          ingestUrl: channel.ingestUrl.trim() || null,
          streamKey: channel.streamKey.trim() || null,
        })),
      });
      setChannels((previous) => previous.map((channel) => ({ ...channel, streamKey: "" })));
      toast.success(result.bridgeConfigured
        ? `Broadcast session #${result.sessionId} submitted to the configured bridge.`
        : `Broadcast outputs saved securely for session #${result.sessionId}; bridge configuration is still required.`);
      jobs.refetch();
    } catch (error: any) {
      toast.error(error?.message || "Could not create Broadcast session");
    }
  };

  const cancel = async (id: number) => {
    try {
      await cancelJob.mutateAsync({ id });
      toast.success("Job cancelled");
      jobs.refetch();
    } catch (error: any) {
      toast.error(error?.message || "Could not cancel job");
    }
  };

  const uploadMedia = async (files: FileList | null, kind: "sourceImage" | "referenceImage" | "sourceVideo" | "referenceVideo") => {
    if (!files?.length) return;
    setUploading(kind);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(String(reader.result).split(",")[1]);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        const result = await uploadRefImageMutation.mutateAsync({
          base64,
          filename: file.name,
          contentType: file.type as any,
          sceneId: sceneId.trim() ? Number(sceneId) : undefined,
        });
        urls.push(result.url);
      }
      if (kind === "sourceImage") setSourceImageUrls((previous) => previous ? `${previous}\n${urls.join("\n")}` : urls.join("\n"));
      if (kind === "referenceImage") setReferenceImageUrls((previous) => previous ? `${previous}\n${urls.join("\n")}` : urls.join("\n"));
      if (kind === "sourceVideo") setSourceVideoUrl(urls[0] || "");
      if (kind === "referenceVideo") setReferenceVideoUrl(urls[0] || "");
      toast.success(`${urls.length} file${urls.length === 1 ? "" : "s"} uploaded`);
    } catch (error: any) {
      toast.error(error?.message || "Upload failed. Paste a secure media URL if video upload is unavailable.");
    } finally {
      setUploading(null);
    }
  };

  if (user.data && !isAdultVerified) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="max-w-md border-red-500/30 bg-red-500/5"><CardHeader className="text-center"><ShieldCheck className="mx-auto mb-2 h-12 w-12 text-red-500" /><CardTitle>Age Verification Required</CardTitle></CardHeader><CardContent className="space-y-4 text-center"><p className="text-sm text-muted-foreground">Virelle Broadcast is restricted to verified users aged 18 or over.</p><Button className="w-full" onClick={() => { window.location.href = "/settings?tab=profile"; }}>Verify 18+ Status</Button></CardContent></Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div><h1 className="flex items-center gap-2 text-2xl font-semibold"><RadioTower className="h-6 w-6 text-amber-400" />Virelle Broadcast & Studio Render</h1><p className="text-sm text-muted-foreground">Exact Swappys-job handoff, strict BYOK rendering and encrypted multi-output broadcast credentials.</p></div>
          <Button variant="outline" onClick={() => { byokStatus.refetch(); jobs.refetch(); handoff.refetch(); }}><RefreshCcw className="mr-2 h-4 w-4" />Refresh</Button>
        </div>

        {sourceSwappysJobId && <Card className="border-fuchsia-500/30 bg-fuchsia-500/5"><CardContent className="flex flex-col gap-2 p-4 md:flex-row md:items-center md:justify-between"><div><div className="font-medium text-fuchsia-200">Swappys job #{sourceSwappysJobId} loaded</div><p className="text-xs text-muted-foreground">Project, scene, avatar output, reference media, transform goal and creative mode are connected by server-side ownership checks.</p></div><Badge variant="outline">{contentMode === "open_adult" ? "Open Adult Creative" : "Standard"}</Badge></CardContent></Card>}

        <Card className="border-amber-500/20"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><KeyRound className="h-4 w-4 text-amber-400" />Provider & Bridge Status</CardTitle></CardHeader><CardContent className="space-y-3"><div className="flex flex-wrap gap-2">{PROVIDERS.map((provider) => <Badge key={provider} variant={providerStatus[provider] ? "default" : "outline"}>{provider}: {providerStatus[provider] ? "ready" : "missing"}</Badge>)}</div><Badge variant={bridgeConfigured ? "default" : "destructive"}>Broadcast bridge: {bridgeConfigured ? "configured" : "not configured"}</Badge>{!hasAnyProvider && <div className="flex flex-col gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100"><span>BYOK required. Add your own video provider key before creating a render or broadcast session.</span><Button size="sm" className="w-fit" onClick={() => { window.location.href = API_KEY_SETTINGS_URL; }}><KeyRound className="mr-2 h-4 w-4" />Add Provider Key</Button></div>}{!bridgeConfigured && <p className="text-xs text-amber-200">Sessions can be configured and credentials encrypted now, but live submission remains in “waiting for provider” until `BROADCAST_BRIDGE_URL` and `BROADCAST_BRIDGE_TOKEN` are configured.</p>}</CardContent></Card>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Video className="h-4 w-4 text-amber-400" />Source & Reference Media</CardTitle></CardHeader><CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3"><div><Label>Project ID</Label><input className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={projectId} onChange={(event) => setProjectId(event.target.value.replace(/[^0-9]/g, ""))} /></div><div><Label>Scene ID</Label><input className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={sceneId} onChange={(event) => setSceneId(event.target.value.replace(/[^0-9]/g, ""))} /></div></div>
            {([[
              "Source video URL", sourceVideoUrl, setSourceVideoUrl, sourceVideoRef, "sourceVideo",
            ], [
              "Reference video URL", referenceVideoUrl, setReferenceVideoUrl, referenceVideoRef, "referenceVideo",
            ]] as const).map(([label, value, setter, reference, kind]) => <div key={label}><Label>{label}</Label><div className="flex gap-2"><input className="flex-1 rounded-md border bg-background px-3 py-2 text-sm" placeholder="https://..." value={value} onChange={(event) => setter(event.target.value)} /><Button type="button" size="sm" variant="outline" disabled={uploading === kind} onClick={() => reference.current?.click()}>{uploading === kind ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}</Button></div></div>)}
            <div><div className="mb-1 flex items-center justify-between"><Label>Source image URLs</Label><Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => sourceImageRef.current?.click()}><Upload className="mr-1 h-3 w-3" />Upload</Button></div><Textarea className="min-h-20 text-xs" value={sourceImageUrls} onChange={(event) => setSourceImageUrls(event.target.value)} /></div>
            <div><div className="mb-1 flex items-center justify-between"><Label>Reference/output image URLs</Label><Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => referenceImageRef.current?.click()}><Upload className="mr-1 h-3 w-3" />Upload</Button></div><Textarea className="min-h-20 text-xs" value={referenceImageUrls} onChange={(event) => setReferenceImageUrls(event.target.value)} /></div>
            <input ref={sourceImageRef} type="file" accept="image/*" multiple className="hidden" onChange={(event) => uploadMedia(event.target.files, "sourceImage")} /><input ref={referenceImageRef} type="file" accept="image/*" multiple className="hidden" onChange={(event) => uploadMedia(event.target.files, "referenceImage")} /><input ref={sourceVideoRef} type="file" accept="video/*" className="hidden" onChange={(event) => uploadMedia(event.target.files, "sourceVideo")} /><input ref={referenceVideoRef} type="file" accept="video/*" className="hidden" onChange={(event) => uploadMedia(event.target.files, "referenceVideo")} />
          </CardContent></Card>

          <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-4 w-4 text-amber-400" />Transform & Creative Controls</CardTitle></CardHeader><CardContent className="space-y-3">
            <div><Label>Transform goal</Label><select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={transformGoal} onChange={(event) => setTransformGoal(event.target.value as TransformGoal)}><option value="appearance_reference">Appearance reference</option><option value="boy_to_girl">Feminine presentation</option><option value="girl_to_boy">Masculine presentation</option><option value="younger_self">Younger self</option><option value="older_self">Older self</option><option value="adult_to_child">Childhood self</option><option value="child_to_adult">Child to adult</option><option value="custom_prompt">Custom prompt</option></select></div>
            <div className="grid grid-cols-2 gap-3"><div><Label>Target age</Label><input className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={targetAge} onChange={(event) => setTargetAge(event.target.value.replace(/[^0-9]/g, ""))} /></div><div><Label>BYOK provider</Label><select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={requestedProvider} onChange={(event) => setRequestedProvider(event.target.value as Provider | "")}><option value="">Auto</option>{PROVIDERS.map((provider) => <option key={provider} value={provider}>{provider}</option>)}</select></div></div>
            <div><Label>Target presentation/style</Label><input className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={targetPresentation} onChange={(event) => setTargetPresentation(event.target.value)} /></div>
            <div><Label>Creative mode</Label><div className="mt-1 grid grid-cols-2 gap-2"><button onClick={() => setContentMode("standard")} className={`rounded-md border px-2 py-2 text-xs ${contentMode === "standard" ? "border-amber-500 bg-amber-500/10" : ""}`}>Standard</button><button onClick={() => setContentMode("open_adult")} className={`rounded-md border px-2 py-2 text-xs ${contentMode === "open_adult" ? "border-fuchsia-500 bg-fuchsia-500/10" : ""}`}>Open Adult Creative</button></div></div>
            <div><Label>Director / VFX notes</Label><Textarea className="min-h-28 text-xs" value={directorNotes} onChange={(event) => setDirectorNotes(event.target.value)} /></div>
            <div className="flex items-start gap-2 rounded-lg border p-3"><Checkbox checked={consentConfirmed} onCheckedChange={(value) => setConsentConfirmed(Boolean(value))} /><p className="text-xs text-muted-foreground">I confirm likeness, media, distribution and broadcast rights.</p></div>
            {contentMode === "open_adult" && <div className="flex items-start gap-2 rounded-lg border border-fuchsia-500/30 bg-fuchsia-500/5 p-3"><Checkbox checked={allSubjectsAdultsConfirmed} onCheckedChange={(value) => setAllSubjectsAdultsConfirmed(Boolean(value))} /><p className="text-xs text-muted-foreground">Every depicted and referenced person is 18 or older. Mature/glamour styling is allowed; explicit sexualised likeness, minors, coercion, fraud and non-consensual use remain blocked.</p></div>}
          </CardContent></Card>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card className="border-blue-500/20"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Radio className="h-4 w-4 text-blue-400" />Broadcast Outputs</CardTitle></CardHeader><CardContent className="space-y-3">{channels.map((channel, index) => <div key={index} className="space-y-2 rounded-md border p-3"><div className="flex items-center justify-between"><span className="text-xs font-medium text-muted-foreground">Output {index + 1}</span>{channels.length > 1 && <button className="text-xs text-muted-foreground hover:text-red-400" onClick={() => setChannels((previous) => previous.filter((_, itemIndex) => itemIndex !== index))}>Remove</button>}</div><div><Label>Destination</Label><select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={channel.destination} onChange={(event) => { const destination = event.target.value as BroadcastDestination; setChannels((previous) => previous.map((item, itemIndex) => itemIndex === index ? { ...item, destination, ingestUrl: destinationDefaultUrl(destination) } : item)); }}><option value="rtmp">RTMP custom</option><option value="rtmp_onlyfans">OnlyFans</option><option value="rtmp_fansly">Fansly</option><option value="rtmp_chaturbate">Chaturbate</option><option value="webrtc">WebRTC</option><option value="obs">OBS bridge</option><option value="custom">Custom engine</option></select></div><div><Label>Ingest URL</Label><input className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={channel.ingestUrl} onChange={(event) => setChannels((previous) => previous.map((item, itemIndex) => itemIndex === index ? { ...item, ingestUrl: event.target.value } : item))} /></div><div><Label>Stream key</Label><input type="password" autoComplete="off" className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={channel.streamKey} onChange={(event) => setChannels((previous) => previous.map((item, itemIndex) => itemIndex === index ? { ...item, streamKey: event.target.value } : item))} /></div></div>)}{channels.length < 5 && <Button size="sm" variant="outline" className="w-full" onClick={() => setChannels((previous) => [...previous, { destination: "rtmp", ingestUrl: "", streamKey: "" }])}>+ Add Output</Button>}<Button className="w-full" onClick={submitBroadcast} disabled={createBroadcast.isPending || !hasAnyProvider}>{createBroadcast.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Radio className="mr-2 h-4 w-4" />}Configure Swappys Broadcast</Button><p className="text-xs text-muted-foreground">Keys are encrypted before storage, never returned by the API, and cleared from this form after submission.</p></CardContent></Card>

          <Card className="border-amber-500/20"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Video className="h-4 w-4 text-amber-400" />Studio Render</CardTitle></CardHeader><CardContent className="space-y-3"><p className="text-sm text-muted-foreground">Create a high-quality BYOK video render from the exact Swappys avatar and scene media before broadcasting or editorial export.</p><Button className="w-full bg-amber-500 text-black hover:bg-amber-600" onClick={submitStudioRender} disabled={createRender.isPending || !hasAnyProvider}>{createRender.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Video className="mr-2 h-4 w-4" />}Create Studio Render</Button></CardContent></Card>
        </div>

        <Card><CardHeader><CardTitle className="text-base">Recent Broadcast / Render Jobs</CardTitle></CardHeader><CardContent className="space-y-3">{jobs.isLoading && <p className="text-sm text-muted-foreground">Loading jobs…</p>}{(jobs.data || []).map((job: any) => <div key={job.id} className="space-y-3 rounded-lg border p-3 text-sm"><div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between"><div><div className="font-medium">#{job.id} · {job.mode} · {job.transformGoal}</div><div className="text-xs text-muted-foreground">Provider: {job.provider} · Swappys: {job.sourceSwappysJobId || "none"} · Mode: {job.contentMode || "standard"} · Watermark: {job.visibleWatermarkMode || "default"}</div></div><Badge variant={statusVariant(job.status)}>{job.status}</Badge></div><p className="text-xs text-muted-foreground">{jobInstructions(job)}</p>{job.errorMessage && <div className="flex gap-2 rounded-md border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-200"><XCircle className="h-4 w-4 shrink-0" /><span>{job.errorMessage}</span></div>}{job.outputVideoUrl && <div className="space-y-2"><video src={job.outputVideoUrl} controls className="w-full rounded-lg border" /><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => copyText(job.outputVideoUrl, "Output URL copied")}><Copy className="mr-1 h-3 w-3" />Copy URL</Button><Button size="sm" variant="outline" asChild><a href={job.outputVideoUrl} target="_blank" rel="noreferrer"><ExternalLink className="mr-1 h-3 w-3" />Open</a></Button><Button size="sm" variant="outline" asChild><a href={job.outputVideoUrl} download><Download className="mr-1 h-3 w-3" />Download</a></Button></div></div>}{["queued", "waiting_for_provider", "processing", "broadcast_ready"].includes(job.status) && <Button size="sm" variant="destructive" onClick={() => cancel(job.id)}>Cancel</Button>}</div>)}{!jobs.isLoading && !(jobs.data || []).length && <p className="text-sm text-muted-foreground">No jobs yet.</p>}</CardContent></Card>
      </div>
    </div>
  );
}

export default function VirelleBroadcastRender() {
  return <SubscriptionGate feature="Virelle Broadcast & Studio Render" requiredTier="creator"><Inner /></SubscriptionGate>;
}
