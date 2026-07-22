import { useEffect, useMemo, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { SubscriptionGate } from "@/components/SubscriptionGate";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  CreditCard,
  Download,
  ExternalLink,
  KeyRound,
  Loader2,
  LockKeyhole,
  Phone,
  Radio,
  RadioTower,
  RefreshCcw,
  ShieldAlert,
  ShieldCheck,
  Upload,
  UserCheck,
  Video,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

type TransformGoal =
  | "appearance_reference"
  | "boy_to_girl"
  | "girl_to_boy"
  | "younger_self"
  | "older_self"
  | "adult_to_child"
  | "child_to_adult"
  | "custom_prompt";
type Provider = "runway" | "openai" | "replicate" | "fal" | "luma" | "huggingface" | "seedance" | "veo3";
type ContentMode = "standard" | "open_adult";
type BroadcastDestination = "rtmp" | "rtmp_onlyfans" | "rtmp_fansly" | "rtmp_chaturbate" | "webrtc" | "obs" | "custom";
type BroadcastChannel = { destination: BroadcastDestination; ingestUrl: string; streamKey: string };

type MatureProfileForm = {
  fullName: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  stateRegion: string;
  postcode: string;
  country: string;
  dateOfBirth: string;
  responsibilityAccepted: boolean;
  consentPolicyAccepted: boolean;
};

const PROVIDERS: Provider[] = ["runway", "openai", "replicate", "fal", "luma", "huggingface", "seedance", "veo3"];
const STANDARD_DESTINATIONS: BroadcastDestination[] = ["rtmp", "webrtc", "obs", "custom"];
const MATURE_DESTINATIONS: BroadcastDestination[] = ["rtmp", "rtmp_onlyfans", "rtmp_fansly", "rtmp_chaturbate", "webrtc", "obs", "custom"];
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

function destinationLabel(destination: BroadcastDestination) {
  const labels: Record<BroadcastDestination, string> = {
    rtmp: "RTMP custom",
    rtmp_onlyfans: "OnlyFans",
    rtmp_fansly: "Fansly",
    rtmp_chaturbate: "Chaturbate",
    webrtc: "WebRTC",
    obs: "OBS bridge",
    custom: "Custom engine",
  };
  return labels[destination];
}

function verificationItem(ok: boolean, label: string) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {ok ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <XCircle className="h-4 w-4 text-muted-foreground" />}
      <span className={ok ? "text-foreground" : "text-muted-foreground"}>{label}</span>
    </div>
  );
}

function MatureAccessPanel({ user, statusQuery }: { user: any; statusQuery: any }) {
  const status = statusQuery.data;
  const saveProfile = (trpc as any).virelleBroadcastRender.saveMatureAccessProfile.useMutation();
  const sendPhoneCode = (trpc as any).virelleBroadcastRender.sendMaturePhoneCode.useMutation();
  const verifyPhoneCode = (trpc as any).virelleBroadcastRender.verifyMaturePhoneCode.useMutation();
  const createIdentitySession = (trpc as any).virelleBroadcastRender.createMatureIdentitySession.useMutation();
  const refreshIdentity = (trpc as any).virelleBroadcastRender.refreshMatureIdentityStatus.useMutation();
  const createCardVerification = (trpc as any).virelleBroadcastRender.createMatureCardVerification.useMutation();
  const verifyCardSession = (trpc as any).virelleBroadcastRender.verifyMatureCardSession.useMutation();
  const [phoneCode, setPhoneCode] = useState("");
  const cardReturnHandled = useRef(false);
  const identityReturnHandled = useRef(false);
  const [form, setForm] = useState<MatureProfileForm>({
    fullName: "",
    email: user?.email || "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    stateRegion: "",
    postcode: "",
    country: "AU",
    dateOfBirth: "",
    responsibilityAccepted: false,
    consentPolicyAccepted: false,
  });

  useEffect(() => {
    if (!status?.profile) {
      setForm((previous) => ({ ...previous, email: user?.email || previous.email }));
      return;
    }
    const profile = status.profile;
    setForm({
      fullName: profile.fullName || "",
      email: profile.email || user?.email || "",
      phone: profile.phone || "",
      addressLine1: profile.addressLine1 || "",
      addressLine2: profile.addressLine2 || "",
      city: profile.city || "",
      stateRegion: profile.stateRegion || "",
      postcode: profile.postcode || "",
      country: profile.country || "AU",
      dateOfBirth: profile.dateOfBirth || "",
      responsibilityAccepted: Boolean(status.responsibilityAccepted),
      consentPolicyAccepted: Boolean(status.consentPolicyAccepted),
    });
  }, [status?.profile, status?.responsibilityAccepted, status?.consentPolicyAccepted, user?.email]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("adult_card_session");
    if (!sessionId || cardReturnHandled.current) return;
    cardReturnHandled.current = true;
    verifyCardSession.mutateAsync({ sessionId })
      .then(() => {
        toast.success("Cardholder name verified.");
        statusQuery.refetch();
        params.delete("adult_card_session");
        window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
      })
      .catch((error: any) => toast.error(error?.message || "Card verification failed."));
  }, [statusQuery, verifyCardSession]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("adult") !== "1" || params.get("adult_card_session") || identityReturnHandled.current) return;
    if (!status?.profileComplete || status?.identityVerified) return;
    identityReturnHandled.current = true;
    refreshIdentity.mutateAsync()
      .then((result: any) => {
        if (result?.verificationStatus === "verified") toast.success("Government identity verified.");
        statusQuery.refetch();
      })
      .catch(() => undefined);
  }, [refreshIdentity, status?.identityVerified, status?.profileComplete, statusQuery]);

  const patch = <K extends keyof MatureProfileForm>(key: K, value: MatureProfileForm[K]) => {
    setForm((previous) => ({ ...previous, [key]: value }));
  };

  const save = async () => {
    try {
      await saveProfile.mutateAsync({ ...form, addressLine2: form.addressLine2 || null });
      toast.success("Legal profile saved. Verification resets whenever identity details change.");
      await statusQuery.refetch();
    } catch (error: any) {
      toast.error(error?.message || "Could not save mature-access profile.");
    }
  };

  const sendCode = async () => {
    try {
      await sendPhoneCode.mutateAsync();
      toast.success("Verification code sent to the registered phone.");
    } catch (error: any) {
      toast.error(error?.message || "Could not send phone verification code.");
    }
  };

  const verifyCode = async () => {
    try {
      await verifyPhoneCode.mutateAsync({ code: phoneCode });
      setPhoneCode("");
      toast.success("Phone two-factor verification completed.");
      await statusQuery.refetch();
    } catch (error: any) {
      toast.error(error?.message || "Phone verification failed.");
    }
  };

  const startIdentity = async () => {
    try {
      const result = await createIdentitySession.mutateAsync({ returnUrl: window.location.href });
      window.location.href = result.url;
    } catch (error: any) {
      toast.error(error?.message || "Could not start identity verification.");
    }
  };

  const startCard = async () => {
    try {
      const result = await createCardVerification.mutateAsync({ returnUrl: window.location.href });
      window.location.href = result.url;
    } catch (error: any) {
      toast.error(error?.message || "Could not start cardholder verification.");
    }
  };

  return (
    <Card id="mature-access" className="border-fuchsia-500/30 bg-fuchsia-500/[0.04]">
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <LockKeyhole className="h-5 w-5 text-fuchsia-400" />
              Verified 18+ Mature Studio
            </CardTitle>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Separate paid access for mature, provocative and adult-industry styling, Swappys transformation and adult-platform broadcast. Pornographic acts, genital-focused output, minors, youth-coded subjects and age regression below 18 remain prohibited.
            </p>
          </div>
          <Badge variant={status?.accessGranted ? "default" : "outline"} className="w-fit">
            {status?.accessGranted ? "Access verified" : "Verification required"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 rounded-xl border border-border/60 bg-background/40 p-4 sm:grid-cols-2 lg:grid-cols-4">
          {verificationItem(Boolean(status?.paidMembership), "Active paid membership")}
          {verificationItem(Boolean(status?.adultAgeConfirmed), "18+ legal date of birth")}
          {verificationItem(Boolean(status?.phoneVerified), "Phone 2FA verified")}
          {verificationItem(Boolean(status?.identityVerified), "Government ID verified")}
          {verificationItem(Boolean(status?.cardNameMatched), "Cardholder name matched")}
          {verificationItem(Boolean(status?.responsibilityAccepted), "Account responsibility accepted")}
          {verificationItem(Boolean(status?.consentPolicyAccepted), "Consent policy accepted")}
          {verificationItem(Boolean(status?.accessGranted), "Mature Studio unlocked")}
        </div>

        {!status?.paidMembership && (
          <div className="flex flex-col gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm md:flex-row md:items-center md:justify-between">
            <span>An active paid Virelle membership is required. Free and beta access do not unlock the mature section.</span>
            <Button variant="outline" onClick={() => { window.location.href = "/pricing"; }}>View memberships</Button>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3 rounded-xl border p-4">
            <div className="flex items-center gap-2 font-medium"><UserCheck className="h-4 w-4 text-fuchsia-400" />1. Legal identity and address</div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2"><Label>Full legal name</Label><Input value={form.fullName} onChange={(event) => patch("fullName", event.target.value)} autoComplete="name" /></div>
              <div className="sm:col-span-2"><Label>Account email</Label><Input value={form.email} disabled autoComplete="email" /></div>
              <div><Label>Phone in international format</Label><Input value={form.phone} onChange={(event) => patch("phone", event.target.value)} placeholder="+61412345678" autoComplete="tel" /></div>
              <div><Label>Date of birth</Label><Input type="date" value={form.dateOfBirth} onChange={(event) => patch("dateOfBirth", event.target.value)} /></div>
              <div className="sm:col-span-2"><Label>Street address</Label><Input value={form.addressLine1} onChange={(event) => patch("addressLine1", event.target.value)} autoComplete="address-line1" /></div>
              <div className="sm:col-span-2"><Label>Address line 2</Label><Input value={form.addressLine2} onChange={(event) => patch("addressLine2", event.target.value)} autoComplete="address-line2" /></div>
              <div><Label>City</Label><Input value={form.city} onChange={(event) => patch("city", event.target.value)} autoComplete="address-level2" /></div>
              <div><Label>State / region</Label><Input value={form.stateRegion} onChange={(event) => patch("stateRegion", event.target.value)} autoComplete="address-level1" /></div>
              <div><Label>Postcode</Label><Input value={form.postcode} onChange={(event) => patch("postcode", event.target.value)} autoComplete="postal-code" /></div>
              <div><Label>Country code</Label><Input value={form.country} onChange={(event) => patch("country", event.target.value.toUpperCase())} placeholder="AU" autoComplete="country" /></div>
            </div>
            <div className="flex items-start gap-2 rounded-lg border p-3">
              <Checkbox checked={form.responsibilityAccepted} onCheckedChange={(value) => patch("responsibilityAccepted", Boolean(value))} />
              <p className="text-xs text-muted-foreground">I am solely responsible for content created, transmitted or broadcast through my account and for compliance with applicable law and platform rules.</p>
            </div>
            <div className="flex items-start gap-2 rounded-lg border p-3">
              <Checkbox checked={form.consentPolicyAccepted} onCheckedChange={(value) => patch("consentPolicyAccepted", Boolean(value))} />
              <p className="text-xs text-muted-foreground">I confirm that I have obtained valid consent and lawful likeness/media rights for every real adult person I upload, reference, transform or broadcast.</p>
            </div>
            <Button className="w-full" onClick={save} disabled={saveProfile.isPending || !status?.paidMembership}>
              {saveProfile.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserCheck className="mr-2 h-4 w-4" />}
              Save legal profile
            </Button>
            <p className="text-[11px] text-muted-foreground">Changing legal name, phone, address or date of birth resets identity, phone and card verification.</p>
          </div>

          <div className="space-y-3 rounded-xl border p-4">
            <div className="flex items-center gap-2 font-medium"><ShieldCheck className="h-4 w-4 text-fuchsia-400" />2. Complete independent checks</div>
            <div className="space-y-3 rounded-lg border p-3">
              <div className="flex items-start gap-3"><Phone className="mt-0.5 h-5 w-5 text-fuchsia-400" /><div className="flex-1"><div className="text-sm font-medium">Phone two-factor check</div><p className="text-xs text-muted-foreground">A one-time SMS code is sent to the registered phone. Codes and phone verification are handled through Twilio Verify.</p></div></div>
              <div className="flex gap-2"><Button variant="outline" onClick={sendCode} disabled={sendPhoneCode.isPending || !status?.profileComplete || status?.phoneVerified}>{sendPhoneCode.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send code"}</Button><Input className="max-w-40" inputMode="numeric" value={phoneCode} onChange={(event) => setPhoneCode(event.target.value.replace(/\D/g, ""))} placeholder="Code" /><Button onClick={verifyCode} disabled={verifyPhoneCode.isPending || phoneCode.length < 4 || status?.phoneVerified}>{verifyPhoneCode.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}</Button></div>
              {!status?.phoneProviderConfigured && <p className="text-xs text-amber-300">Twilio Verify environment variables must be configured before phone 2FA can complete.</p>}
            </div>

            <div className="space-y-3 rounded-lg border p-3">
              <div className="flex items-start gap-3"><UserCheck className="mt-0.5 h-5 w-5 text-fuchsia-400" /><div className="flex-1"><div className="text-sm font-medium">Government identity and selfie check</div><p className="text-xs text-muted-foreground">Stripe Identity verifies an official identity document and matching selfie. Virelle stores only verification status and session reference.</p></div></div>
              <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={startIdentity} disabled={createIdentitySession.isPending || !status?.profileComplete || status?.identityVerified}>{createIdentitySession.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}Start identity check</Button><Button variant="ghost" onClick={async () => { try { await refreshIdentity.mutateAsync(); await statusQuery.refetch(); toast.success("Identity status refreshed."); } catch (error: any) { toast.error(error?.message || "Could not refresh identity status."); } }} disabled={refreshIdentity.isPending}>{refreshIdentity.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}Refresh</Button></div>
            </div>

            <div className="space-y-3 rounded-lg border p-3">
              <div className="flex items-start gap-3"><CreditCard className="mt-0.5 h-5 w-5 text-fuchsia-400" /><div className="flex-1"><div className="text-sm font-medium">Matching cardholder name</div><p className="text-xs text-muted-foreground">Stripe collects the card and billing details. Virelle never receives or stores the card number, expiry date or CVC; only the verified cardholder name match is recorded.</p></div></div>
              <Button variant="outline" onClick={startCard} disabled={createCardVerification.isPending || !status?.profileComplete || status?.cardNameMatched}>{createCardVerification.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}Verify payment card name</Button>
            </div>

            {status?.profile?.rejectionReason && <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">{status.profile.rejectionReason}</div>}
            {status?.missing?.length > 0 && <div className="rounded-lg border border-border/60 p-3"><p className="mb-2 text-xs font-medium">Still required</p><ul className="space-y-1 text-xs text-muted-foreground">{status.missing.map((item: string) => <li key={item}>• {item}</li>)}</ul></div>}
          </div>
        </div>

        <div className="rounded-xl border border-red-500/30 bg-red-500/[0.06] p-4">
          <div className="flex items-start gap-3"><ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-400" /><div><div className="font-medium text-red-200">Absolute content restrictions</div><p className="mt-1 text-xs leading-relaxed text-muted-foreground">No minor, underage, teen, childlike or ambiguous-age depictions; no age regression below 18; no CSAM; no coercion, revenge content or non-consensual use; no pornographic sex acts or genital-focused output. These restrictions apply to real, uploaded, generated and fully synthetic subjects without exception.</p></div></div>
        </div>
      </CardContent>
    </Card>
  );
}

function Inner() {
  const user = (trpc as any).auth.me.useQuery();
  const byokStatus = (trpc as any).virelleBroadcastRender.getByokStatus.useQuery(undefined, { retry: false });
  const matureStatus = (trpc as any).virelleBroadcastRender.getMatureAccessStatus.useQuery(undefined, { retry: false });
  const jobs = (trpc as any).virelleBroadcastRender.listJobs.useQuery({ limit: 25 }, { retry: false, refetchInterval: 10_000 });
  const createRender = (trpc as any).virelleBroadcastRender.createStudioRenderJob.useMutation();
  const createBroadcast = (trpc as any).virelleBroadcastRender.createBroadcastSession.useMutation();
  const cancelJob = (trpc as any).virelleBroadcastRender.cancelJob.useMutation();
  const uploadRefImageMutation = (trpc as any).upload.referenceImage.useMutation();

  const queryParams = new URLSearchParams(window.location.search);
  const adultRequested = queryParams.get("adult") === "1";
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
    if (data.contentMode === "open_adult" && matureStatus.data?.accessGranted) setContentMode("open_adult");
    setConsentConfirmed(Boolean(data.consentConfirmed));
    setAllSubjectsAdultsConfirmed(data.contentMode === "open_adult");
    toast.success(`Swappys job #${data.id} loaded into Broadcast & Studio Render.`);
  }, [handoff.data, matureStatus.data?.accessGranted]);

  useEffect(() => {
    if (adultRequested && matureStatus.data?.accessGranted) {
      setContentMode("open_adult");
      setAllSubjectsAdultsConfirmed(true);
    }
  }, [adultRequested, matureStatus.data?.accessGranted]);

  useEffect(() => {
    if (contentMode === "standard") {
      setAllSubjectsAdultsConfirmed(false);
      setChannels((previous) => previous.map((channel) => (
        MATURE_DESTINATIONS.includes(channel.destination) && !STANDARD_DESTINATIONS.includes(channel.destination)
          ? { destination: "rtmp", ingestUrl: "", streamKey: "" }
          : channel
      )));
    }
  }, [contentMode]);

  const providerStatus = byokStatus.data?.providers || {};
  const hasAnyProvider = Boolean(byokStatus.data?.hasAnyProvider);
  const bridgeConfigured = Boolean(byokStatus.data?.bridgeConfigured);
  const matureAccessGranted = Boolean(matureStatus.data?.accessGranted);
  const availableDestinations = contentMode === "open_adult" ? MATURE_DESTINATIONS : STANDARD_DESTINATIONS;

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

  const chooseMatureMode = () => {
    if (!matureAccessGranted) {
      toast.error("Complete the paid 18+ verification process before entering the Mature Studio.");
      document.getElementById("mature-access")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    setContentMode("open_adult");
    setAllSubjectsAdultsConfirmed(true);
  };

  const validatePolicy = (broadcast: boolean) => {
    if (!consentConfirmed) {
      toast.error("Confirm likeness, media and distribution rights before continuing.");
      return false;
    }
    if (contentMode === "open_adult") {
      if (!matureAccessGranted) {
        toast.error("Verified Mature Studio access is required.");
        return false;
      }
      if (!allSubjectsAdultsConfirmed) {
        toast.error("Confirm that every depicted or referenced person is 18 or older.");
        return false;
      }
      if (["adult_to_child", "child_to_adult"].includes(transformGoal)) {
        toast.error("Child or childhood transforms are unavailable in the Mature Studio.");
        return false;
      }
      if (targetAge.trim() && Number(targetAge) < 18) {
        toast.error("The Mature Studio requires a target age of 18 or older.");
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

  const pageModeLabel = contentMode === "open_adult" ? "Verified Mature Studio" : "Standard Studio";
  const refreshAll = () => {
    byokStatus.refetch();
    matureStatus.refetch();
    jobs.refetch();
    handoff.refetch();
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold"><RadioTower className="h-6 w-6 text-amber-400" />Virelle Broadcast & Studio Render</h1>
            <p className="text-sm text-muted-foreground">Standard production remains available normally. Mature tools are isolated behind paid identity, phone and cardholder verification.</p>
          </div>
          <div className="flex flex-wrap gap-2"><Badge variant="outline">{pageModeLabel}</Badge><Button variant="outline" onClick={refreshAll}><RefreshCcw className="mr-2 h-4 w-4" />Refresh</Button></div>
        </div>

        {(adultRequested || !matureAccessGranted) && <MatureAccessPanel user={user.data} statusQuery={matureStatus} />}

        {sourceSwappysJobId && <Card className="border-fuchsia-500/30 bg-fuchsia-500/5"><CardContent className="flex flex-col gap-2 p-4 md:flex-row md:items-center md:justify-between"><div><div className="font-medium text-fuchsia-200">Swappys job #{sourceSwappysJobId} loaded</div><p className="text-xs text-muted-foreground">Project, scene, avatar output, reference media, transform goal and creative mode are connected by server-side ownership checks.</p></div><Badge variant="outline">{contentMode === "open_adult" ? "Verified Mature" : "Standard"}</Badge></CardContent></Card>}

        <Card className="border-amber-500/20"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><KeyRound className="h-4 w-4 text-amber-400" />Provider & Bridge Status</CardTitle></CardHeader><CardContent className="space-y-3"><div className="flex flex-wrap gap-2">{PROVIDERS.map((provider) => <Badge key={provider} variant={providerStatus[provider] ? "default" : "outline"}>{provider}: {providerStatus[provider] ? "ready" : "missing"}</Badge>)}</div><Badge variant={bridgeConfigured ? "default" : "destructive"}>Broadcast bridge: {bridgeConfigured ? "configured" : "not configured"}</Badge>{!hasAnyProvider && <div className="flex flex-col gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100"><span>BYOK required. Add your own video provider key before creating a render or broadcast session.</span><Button size="sm" className="w-fit" onClick={() => { window.location.href = API_KEY_SETTINGS_URL; }}><KeyRound className="mr-2 h-4 w-4" />Add Provider Key</Button></div>}{!bridgeConfigured && <p className="text-xs text-amber-200">Sessions can be configured and credentials encrypted now, but live submission remains in “waiting for provider” until `BROADCAST_BRIDGE_URL` and `BROADCAST_BRIDGE_TOKEN` are configured.</p>}</CardContent></Card>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Video className="h-4 w-4 text-amber-400" />Source & Reference Media</CardTitle></CardHeader><CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3"><div><Label>Project ID</Label><Input value={projectId} onChange={(event) => setProjectId(event.target.value.replace(/[^0-9]/g, ""))} /></div><div><Label>Scene ID</Label><Input value={sceneId} onChange={(event) => setSceneId(event.target.value.replace(/[^0-9]/g, ""))} /></div></div>
            {([["Source video URL", sourceVideoUrl, setSourceVideoUrl, sourceVideoRef, "sourceVideo"], ["Reference video URL", referenceVideoUrl, setReferenceVideoUrl, referenceVideoRef, "referenceVideo"]] as const).map(([label, value, setter, reference, kind]) => <div key={label}><Label>{label}</Label><div className="flex gap-2"><Input className="flex-1" placeholder="https://..." value={value} onChange={(event) => setter(event.target.value)} /><Button type="button" size="sm" variant="outline" disabled={uploading === kind} onClick={() => reference.current?.click()}>{uploading === kind ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}</Button></div></div>)}
            <div><div className="mb-1 flex items-center justify-between"><Label>Source image URLs</Label><Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => sourceImageRef.current?.click()}><Upload className="mr-1 h-3 w-3" />Upload</Button></div><Textarea className="min-h-20 text-xs" value={sourceImageUrls} onChange={(event) => setSourceImageUrls(event.target.value)} /></div>
            <div><div className="mb-1 flex items-center justify-between"><Label>Reference/output image URLs</Label><Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => referenceImageRef.current?.click()}><Upload className="mr-1 h-3 w-3" />Upload</Button></div><Textarea className="min-h-20 text-xs" value={referenceImageUrls} onChange={(event) => setReferenceImageUrls(event.target.value)} /></div>
            <input ref={sourceImageRef} type="file" accept="image/*" multiple className="hidden" onChange={(event) => uploadMedia(event.target.files, "sourceImage")} /><input ref={referenceImageRef} type="file" accept="image/*" multiple className="hidden" onChange={(event) => uploadMedia(event.target.files, "referenceImage")} /><input ref={sourceVideoRef} type="file" accept="video/*" className="hidden" onChange={(event) => uploadMedia(event.target.files, "sourceVideo")} /><input ref={referenceVideoRef} type="file" accept="video/*" className="hidden" onChange={(event) => uploadMedia(event.target.files, "referenceVideo")} />
          </CardContent></Card>

          <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-4 w-4 text-amber-400" />Transform & Creative Controls</CardTitle></CardHeader><CardContent className="space-y-3">
            <div><Label>Transform goal</Label><select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={transformGoal} onChange={(event) => setTransformGoal(event.target.value as TransformGoal)}><option value="appearance_reference">Appearance reference</option><option value="boy_to_girl">Feminine presentation</option><option value="girl_to_boy">Masculine presentation</option><option value="younger_self">Younger self</option><option value="older_self">Older self</option>{contentMode === "standard" && <><option value="adult_to_child">Childhood self</option><option value="child_to_adult">Child to adult</option></>}<option value="custom_prompt">Custom prompt</option></select></div>
            <div className="grid grid-cols-2 gap-3"><div><Label>Target age</Label><Input value={targetAge} onChange={(event) => setTargetAge(event.target.value.replace(/[^0-9]/g, ""))} /></div><div><Label>BYOK provider</Label><select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={requestedProvider} onChange={(event) => setRequestedProvider(event.target.value as Provider | "")}><option value="">Auto</option>{PROVIDERS.map((provider) => <option key={provider} value={provider}>{provider}</option>)}</select></div></div>
            <div><Label>Target presentation/style</Label><Input value={targetPresentation} onChange={(event) => setTargetPresentation(event.target.value)} /></div>
            <div><Label>Creative section</Label><div className="mt-1 grid grid-cols-2 gap-2"><button onClick={() => setContentMode("standard")} className={`rounded-md border px-2 py-3 text-xs ${contentMode === "standard" ? "border-amber-500 bg-amber-500/10" : ""}`}>Standard film/VFX</button><button onClick={chooseMatureMode} className={`rounded-md border px-2 py-3 text-xs ${contentMode === "open_adult" ? "border-fuchsia-500 bg-fuchsia-500/10" : ""}`}>Verified 18+ Mature</button></div></div>
            <div><Label>Director / VFX notes</Label><Textarea className="min-h-28 text-xs" value={directorNotes} onChange={(event) => setDirectorNotes(event.target.value)} /></div>
            <div className="flex items-start gap-2 rounded-lg border p-3"><Checkbox checked={consentConfirmed} onCheckedChange={(value) => setConsentConfirmed(Boolean(value))} /><p className="text-xs text-muted-foreground">I confirm that I am solely responsible for this account’s output and possess all required likeness, media, distribution and broadcast rights.</p></div>
            {contentMode === "open_adult" && <div className="space-y-2 rounded-lg border border-fuchsia-500/30 bg-fuchsia-500/5 p-3"><div className="flex items-start gap-2"><Checkbox checked={allSubjectsAdultsConfirmed} onCheckedChange={(value) => setAllSubjectsAdultsConfirmed(Boolean(value))} /><p className="text-xs text-muted-foreground">Every depicted and referenced person is an adult aged 18 or older. No minor, youth-coded or ambiguous-age person appears anywhere in the media or request.</p></div><p className="text-[11px] text-fuchsia-200">Mature glamour and provocative styling are supported. Explicit sex acts, genital-focused imagery, pornography, CSAM and non-consensual sexualisation remain blocked.</p></div>}
          </CardContent></Card>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card className="border-blue-500/20"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Radio className="h-4 w-4 text-blue-400" />Broadcast Outputs</CardTitle></CardHeader><CardContent className="space-y-3">{channels.map((channel, index) => <div key={index} className="space-y-2 rounded-md border p-3"><div className="flex items-center justify-between"><span className="text-xs font-medium text-muted-foreground">Output {index + 1}</span>{channels.length > 1 && <button className="text-xs text-muted-foreground hover:text-red-400" onClick={() => setChannels((previous) => previous.filter((_, itemIndex) => itemIndex !== index))}>Remove</button>}</div><div><Label>Destination</Label><select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={channel.destination} onChange={(event) => { const destination = event.target.value as BroadcastDestination; setChannels((previous) => previous.map((item, itemIndex) => itemIndex === index ? { ...item, destination, ingestUrl: destinationDefaultUrl(destination) } : item)); }}>{availableDestinations.map((destination) => <option key={destination} value={destination}>{destinationLabel(destination)}</option>)}</select></div><div><Label>Ingest URL</Label><Input value={channel.ingestUrl} onChange={(event) => setChannels((previous) => previous.map((item, itemIndex) => itemIndex === index ? { ...item, ingestUrl: event.target.value } : item))} /></div><div><Label>Stream key</Label><Input type="password" autoComplete="off" value={channel.streamKey} onChange={(event) => setChannels((previous) => previous.map((item, itemIndex) => itemIndex === index ? { ...item, streamKey: event.target.value } : item))} /></div></div>)}{channels.length < 5 && <Button size="sm" variant="outline" className="w-full" onClick={() => setChannels((previous) => [...previous, { destination: "rtmp", ingestUrl: "", streamKey: "" }])}>+ Add Output</Button>}<Button className="w-full" onClick={submitBroadcast} disabled={createBroadcast.isPending || !hasAnyProvider}>{createBroadcast.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Radio className="mr-2 h-4 w-4" />}Configure {contentMode === "open_adult" ? "Mature" : "Standard"} Broadcast</Button><p className="text-xs text-muted-foreground">Keys are encrypted before storage, never returned by the API, and cleared from this form after submission.</p></CardContent></Card>

          <Card className="border-amber-500/20"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Video className="h-4 w-4 text-amber-400" />Studio Render</CardTitle></CardHeader><CardContent className="space-y-3"><p className="text-sm text-muted-foreground">Create a high-quality BYOK video render from the exact Swappys avatar and scene media before broadcasting or editorial export. The same continuity-aware media handoff is used in both standard and verified mature modes.</p><Button className="w-full bg-amber-500 text-black hover:bg-amber-600" onClick={submitStudioRender} disabled={createRender.isPending || !hasAnyProvider}>{createRender.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Video className="mr-2 h-4 w-4" />}Create {contentMode === "open_adult" ? "Mature" : "Standard"} Studio Render</Button></CardContent></Card>
        </div>

        <Card><CardHeader><CardTitle className="text-base">Recent Broadcast / Render Jobs</CardTitle></CardHeader><CardContent className="space-y-3">{jobs.isLoading && <p className="text-sm text-muted-foreground">Loading jobs…</p>}{(jobs.data || []).map((job: any) => <div key={job.id} className="space-y-3 rounded-lg border p-3 text-sm"><div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between"><div><div className="font-medium">#{job.id} · {job.mode} · {job.transformGoal}</div><div className="text-xs text-muted-foreground">Provider: {job.provider} · Swappys: {job.sourceSwappysJobId || "none"} · Mode: {job.contentMode || "standard"} · Watermark: {job.visibleWatermarkMode || "default"}</div></div><Badge variant={statusVariant(job.status)}>{job.status}</Badge></div><p className="text-xs text-muted-foreground">{jobInstructions(job)}</p>{job.errorMessage && <div className="flex gap-2 rounded-md border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-200"><XCircle className="h-4 w-4 shrink-0" /><span>{job.errorMessage}</span></div>}{job.outputVideoUrl && <div className="space-y-2"><video src={job.outputVideoUrl} controls className="w-full rounded-lg border" /><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => copyText(job.outputVideoUrl, "Output URL copied")}><Copy className="mr-1 h-3 w-3" />Copy URL</Button><Button size="sm" variant="outline" asChild><a href={job.outputVideoUrl} target="_blank" rel="noreferrer"><ExternalLink className="mr-1 h-3 w-3" />Open</a></Button><Button size="sm" variant="outline" asChild><a href={job.outputVideoUrl} download><Download className="mr-1 h-3 w-3" />Download</a></Button></div></div>}{["queued", "waiting_for_provider", "processing", "broadcast_ready"].includes(job.status) && <Button size="sm" variant="destructive" onClick={() => cancel(job.id)}>Cancel</Button>}</div>)}{!jobs.isLoading && !(jobs.data || []).length && <p className="text-sm text-muted-foreground">No jobs yet.</p>}</CardContent></Card>

        <div className="flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/[0.04] p-4 text-xs text-muted-foreground"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" /><p>Standard R/MA-rated film tools remain in the main VFX workflow subject to project rating and non-explicit presentation. The verified Mature Studio is a separate access layer and does not weaken Virelle’s absolute minor, consent, exploitation or explicit-sex safeguards.</p></div>
      </div>
    </div>
  );
}

export default function VirelleBroadcastRender() {
  return <SubscriptionGate feature="Virelle Broadcast & Studio Render" requiredTier="creator"><Inner /></SubscriptionGate>;
}
