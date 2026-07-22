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
import "@/styles/mature-studio.css";

type TransformGoal =
  | "appearance_reference"
  | "boy_to_girl"
  | "girl_to_boy"
  | "younger_self"
  | "older_self"
  | "adult_to_child"
  | "child_to_adult"
  | "custom_prompt";
type Provider =
  | "runway"
  | "openai"
  | "replicate"
  | "fal"
  | "luma"
  | "huggingface"
  | "seedance"
  | "veo3";
type Workspace = "standard" | "adult";
type BroadcastDestination =
  | "rtmp"
  | "rtmp_onlyfans"
  | "rtmp_fansly"
  | "rtmp_chaturbate"
  | "webrtc"
  | "obs"
  | "custom";
type BroadcastChannel = {
  destination: BroadcastDestination;
  ingestUrl: string;
  streamKey: string;
};

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

const PROVIDERS: Provider[] = [
  "runway",
  "openai",
  "replicate",
  "fal",
  "luma",
  "huggingface",
  "seedance",
  "veo3",
];
const STANDARD_DESTINATIONS: BroadcastDestination[] = [
  "rtmp",
  "webrtc",
  "obs",
  "custom",
];
const ADULT_DESTINATIONS: BroadcastDestination[] = [
  "rtmp",
  "rtmp_onlyfans",
  "rtmp_fansly",
  "rtmp_chaturbate",
  "webrtc",
  "obs",
  "custom",
];
const API_KEY_SETTINGS_URL = "/settings?tab=api-keys&source=virelle-broadcast-render";

function parseUrls(value: string) {
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatDate(value: unknown) {
  if (!value) return "—";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

function copyText(value: string, label = "Copied") {
  navigator.clipboard?.writeText(value)
    .then(() => toast.success(label))
    .catch(() => toast.error("Could not copy"));
}

function statusVariant(status: string) {
  if (["failed", "cancelled"].includes(status)) return "destructive" as const;
  if (["completed", "broadcast_ready"].includes(status)) return "default" as const;
  return "outline" as const;
}

function jobInstructions(job: any) {
  if (job.mode === "broadcast") {
    if (job.status === "waiting_for_provider") {
      return "The session is encrypted and waiting for the configured broadcast bridge.";
    }
    if (job.status === "processing") {
      return "The bridge accepted the session and secured a mandatory recording URL.";
    }
    if (job.status === "broadcast_ready") {
      return "Outputs are configured and waiting for bridge submission.";
    }
    if (job.status === "completed") {
      return "Broadcast completed. The user copy is downloadable and the private compliance copy is queued.";
    }
  }
  if (job.status === "completed") {
    return "Studio render completed. Preview or download the user copy below.";
  }
  if (job.status === "failed") {
    return "The job failed. Review the error and provider configuration.";
  }
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

function VerificationItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {ok
        ? <CheckCircle2 className="h-4 w-4 text-emerald-400" />
        : <XCircle className="h-4 w-4 text-muted-foreground" />}
      <span className={ok ? "text-foreground" : "text-muted-foreground"}>{label}</span>
    </div>
  );
}

function Attestation({
  checked,
  onCheckedChange,
  children,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-white/10 bg-black/10 p-3">
      <Checkbox checked={checked} onCheckedChange={(value) => onCheckedChange(Boolean(value))} />
      <p className="text-xs leading-relaxed text-muted-foreground">{children}</p>
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
      setForm((previous) => ({
        ...previous,
        email: user?.email || previous.email,
      }));
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
  }, [
    status?.profile,
    status?.responsibilityAccepted,
    status?.consentPolicyAccepted,
    user?.email,
  ]);

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
        window.history.replaceState(
          {},
          "",
          `${window.location.pathname}?${params.toString()}`,
        );
      })
      .catch((error: any) => {
        toast.error(error?.message || "Card verification failed.");
      });
  }, [statusQuery, verifyCardSession]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (
      params.get("adult") !== "1"
      || params.get("adult_card_session")
      || identityReturnHandled.current
    ) return;
    if (!status?.profileComplete || status?.identityVerified) return;
    identityReturnHandled.current = true;
    refreshIdentity.mutateAsync()
      .then((result: any) => {
        if (result?.verificationStatus === "verified") {
          toast.success("Government identity verified against the registered name and date of birth.");
        }
        statusQuery.refetch();
      })
      .catch(() => undefined);
  }, [
    refreshIdentity,
    status?.identityVerified,
    status?.profileComplete,
    statusQuery,
  ]);

  const patch = <K extends keyof MatureProfileForm>(
    key: K,
    value: MatureProfileForm[K],
  ) => {
    setForm((previous) => ({ ...previous, [key]: value }));
  };

  const save = async () => {
    try {
      await saveProfile.mutateAsync({
        ...form,
        addressLine2: form.addressLine2 || null,
      });
      toast.success("Legal profile saved. Identity checks reset when personal details change.");
      await statusQuery.refetch();
    } catch (error: any) {
      toast.error(error?.message || "Could not save the verification profile.");
    }
  };

  const sendCode = async () => {
    try {
      await sendPhoneCode.mutateAsync();
      toast.success("Verification code sent to the registered phone.");
    } catch (error: any) {
      toast.error(error?.message || "Could not send the phone verification code.");
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
      const result = await createIdentitySession.mutateAsync({
        returnUrl: window.location.href,
      });
      window.location.href = result.url;
    } catch (error: any) {
      toast.error(error?.message || "Could not start identity verification.");
    }
  };

  const startCard = async () => {
    try {
      const result = await createCardVerification.mutateAsync({
        returnUrl: window.location.href,
      });
      window.location.href = result.url;
    } catch (error: any) {
      toast.error(error?.message || "Could not start cardholder verification.");
    }
  };

  if (statusQuery.isLoading) {
    return (
      <Card id="mature-access" className="border-amber-500/20">
        <CardContent className="p-12 text-center">
          <Loader2 className="mx-auto h-7 w-7 animate-spin text-amber-300" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card id="mature-access" className="border-amber-500/25">
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <LockKeyhole className="h-5 w-5 text-amber-300" />
              Verified 18+ Production Studio
            </CardTitle>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              A separate professional workspace for verified adult productions and authorised adult-platform broadcasting. Access is tied to the individual operating the account, not merely the company or business name.
            </p>
          </div>
          <Badge variant={status?.accessGranted ? "default" : "outline"} className="w-fit">
            {status?.accessGranted ? "Identity verified" : "Verification required"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 rounded-xl border border-white/10 bg-black/15 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <VerificationItem ok={Boolean(status?.paidMembership)} label="Active paid membership" />
          <VerificationItem ok={Boolean(status?.adultAgeConfirmed)} label="Verified age 18+" />
          <VerificationItem ok={Boolean(status?.phoneVerified)} label="Phone 2FA verified" />
          <VerificationItem ok={Boolean(status?.identityVerified)} label="ID name and DOB matched" />
          <VerificationItem ok={Boolean(status?.cardNameMatched)} label="Cardholder name matched" />
          <VerificationItem ok={Boolean(status?.responsibilityAccepted)} label="Responsibility accepted" />
          <VerificationItem ok={Boolean(status?.consentPolicyAccepted)} label="Consent and retention accepted" />
          <VerificationItem ok={Boolean(status?.accessGranted)} label="18+ Studio unlocked" />
        </div>

        {!status?.paidMembership && (
          <div className="flex flex-col gap-3 rounded-lg border border-amber-500/25 bg-amber-500/[0.06] p-4 text-sm md:flex-row md:items-center md:justify-between">
            <span>An active paid Virelle membership is required. Free and beta access cannot unlock this workspace.</span>
            <Button variant="outline" onClick={() => { window.location.href = "/pricing"; }}>
              View memberships
            </Button>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="space-y-3 rounded-xl border border-white/10 bg-black/10 p-4">
            <div className="flex items-center gap-2 font-medium">
              <UserCheck className="h-4 w-4 text-amber-300" />
              1. Individual legal profile
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Full legal name</Label>
                <Input value={form.fullName} onChange={(event) => patch("fullName", event.target.value)} autoComplete="name" />
              </div>
              <div className="sm:col-span-2">
                <Label>Account email</Label>
                <Input value={form.email} disabled autoComplete="email" />
              </div>
              <div>
                <Label>Personal phone — international format</Label>
                <Input value={form.phone} onChange={(event) => patch("phone", event.target.value)} placeholder="+61412345678" autoComplete="tel" />
              </div>
              <div>
                <Label>Date of birth</Label>
                <Input type="date" value={form.dateOfBirth} onChange={(event) => patch("dateOfBirth", event.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <Label>Residential address</Label>
                <Input value={form.addressLine1} onChange={(event) => patch("addressLine1", event.target.value)} autoComplete="address-line1" />
              </div>
              <div className="sm:col-span-2">
                <Label>Address line 2</Label>
                <Input value={form.addressLine2} onChange={(event) => patch("addressLine2", event.target.value)} autoComplete="address-line2" />
              </div>
              <div>
                <Label>City</Label>
                <Input value={form.city} onChange={(event) => patch("city", event.target.value)} autoComplete="address-level2" />
              </div>
              <div>
                <Label>State / region</Label>
                <Input value={form.stateRegion} onChange={(event) => patch("stateRegion", event.target.value)} autoComplete="address-level1" />
              </div>
              <div>
                <Label>Postcode</Label>
                <Input value={form.postcode} onChange={(event) => patch("postcode", event.target.value)} autoComplete="postal-code" />
              </div>
              <div>
                <Label>Country code</Label>
                <Input value={form.country} onChange={(event) => patch("country", event.target.value.toUpperCase())} placeholder="AU" autoComplete="country" />
              </div>
            </div>

            <Attestation
              checked={form.responsibilityAccepted}
              onCheckedChange={(checked) => patch("responsibilityAccepted", checked)}
            >
              I confirm that I am 18 or older and accept sole responsibility for images, videos and broadcasts created or transmitted through my account.
            </Attestation>
            <Attestation
              checked={form.consentPolicyAccepted}
              onCheckedChange={(checked) => patch("consentPolicyAccepted", checked)}
            >
              I confirm that I have valid consent and lawful media rights for every real adult person used. I understand Virelle keeps a private compliance copy of generated videos and recorded broadcasts for at least 90 days, or longer under legal hold, and may comply with lawful requests from authorities.
            </Attestation>

            <Button
              className="w-full bg-amber-500 text-black hover:bg-amber-400"
              onClick={save}
              disabled={saveProfile.isPending || !status?.paidMembership}
            >
              {saveProfile.isPending
                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                : <UserCheck className="mr-2 h-4 w-4" />}
              Save individual profile
            </Button>
            <p className="text-[11px] text-muted-foreground">
              Changing legal name, phone, address or date of birth resets identity, phone and card verification.
            </p>
          </section>

          <section className="space-y-3 rounded-xl border border-white/10 bg-black/10 p-4">
            <div className="flex items-center gap-2 font-medium">
              <ShieldCheck className="h-4 w-4 text-amber-300" />
              2. Independent verification
            </div>

            <div className="space-y-3 rounded-lg border border-white/10 p-3">
              <div className="flex items-start gap-3">
                <Phone className="mt-0.5 h-5 w-5 text-amber-300" />
                <div className="flex-1">
                  <div className="text-sm font-medium">Phone two-factor verification</div>
                  <p className="text-xs text-muted-foreground">A one-time code is sent to the registered personal phone.</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={sendCode} disabled={sendPhoneCode.isPending || !status?.profileComplete || status?.phoneVerified}>
                  {sendPhoneCode.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send code"}
                </Button>
                <Input className="max-w-40" inputMode="numeric" value={phoneCode} onChange={(event) => setPhoneCode(event.target.value.replace(/\D/g, ""))} placeholder="Code" />
                <Button onClick={verifyCode} disabled={verifyPhoneCode.isPending || phoneCode.length < 4 || status?.phoneVerified}>
                  {verifyPhoneCode.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
                </Button>
              </div>
              {!status?.phoneProviderConfigured && (
                <p className="text-xs text-amber-300">Twilio Verify must be configured before phone verification can complete.</p>
              )}
            </div>

            <div className="space-y-3 rounded-lg border border-white/10 p-3">
              <div className="flex items-start gap-3">
                <UserCheck className="mt-0.5 h-5 w-5 text-amber-300" />
                <div className="flex-1">
                  <div className="text-sm font-medium">Government identity and selfie</div>
                  <p className="text-xs text-muted-foreground">The verified document name and date of birth must match this profile and prove the individual is at least 18.</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={startIdentity} disabled={createIdentitySession.isPending || !status?.profileComplete || status?.identityVerified}>
                  {createIdentitySession.isPending
                    ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    : <ShieldCheck className="mr-2 h-4 w-4" />}
                  Start identity check
                </Button>
                <Button
                  variant="ghost"
                  onClick={async () => {
                    try {
                      await refreshIdentity.mutateAsync();
                      await statusQuery.refetch();
                      toast.success("Identity status refreshed.");
                    } catch (error: any) {
                      toast.error(error?.message || "Could not refresh identity status.");
                    }
                  }}
                  disabled={refreshIdentity.isPending}
                >
                  {refreshIdentity.isPending
                    ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    : <RefreshCcw className="mr-2 h-4 w-4" />}
                  Refresh
                </Button>
              </div>
            </div>

            <div className="space-y-3 rounded-lg border border-white/10 p-3">
              <div className="flex items-start gap-3">
                <CreditCard className="mt-0.5 h-5 w-5 text-amber-300" />
                <div className="flex-1">
                  <div className="text-sm font-medium">Matching cardholder name</div>
                  <p className="text-xs text-muted-foreground">Stripe collects the card details. Virelle records only whether the cardholder name matches the registered legal name.</p>
                </div>
              </div>
              <Button variant="outline" onClick={startCard} disabled={createCardVerification.isPending || !status?.profileComplete || status?.cardNameMatched}>
                {createCardVerification.isPending
                  ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  : <CreditCard className="mr-2 h-4 w-4" />}
                Verify cardholder name
              </Button>
            </div>

            {status?.profile?.rejectionReason && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
                {status.profile.rejectionReason}
              </div>
            )}
            {status?.missing?.length > 0 && (
              <div className="rounded-lg border border-white/10 p-3">
                <p className="mb-2 text-xs font-medium">Still required</p>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {status.missing.map((item: string) => <li key={item}>• {item}</li>)}
                </ul>
              </div>
            )}
          </section>
        </div>

        <div className="rounded-xl border border-red-500/25 bg-red-500/[0.05] p-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
            <div>
              <div className="font-medium text-red-200">Absolute restrictions</div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                No minors, youth-coded or ambiguous-age subjects; no age regression below 18; no CSAM; no coercion, revenge content, public-figure sexualisation or non-consensual likeness use. These restrictions apply to uploaded, generated and fully synthetic subjects without exception.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => { window.location.href = "/virelle-broadcast-render"; }}>
            Return to Standard Studio
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ProductionWorkspace({ workspace }: { workspace: Workspace }) {
  const adult = workspace === "adult";
  const byokStatus = (trpc as any).virelleBroadcastRender.getByokStatus.useQuery(undefined, { retry: false });
  const jobs = (trpc as any).virelleBroadcastRender.listJobs.useQuery(
    { workspace, limit: 25 },
    { retry: false, refetchInterval: 10_000 },
  );
  const createRender = (trpc as any).virelleBroadcastRender.createStudioRenderJob.useMutation();
  const createBroadcast = (trpc as any).virelleBroadcastRender.createBroadcastSession.useMutation();
  const completeBroadcast = (trpc as any).virelleBroadcastRender.completeBroadcastSession.useMutation();
  const cancelJob = (trpc as any).virelleBroadcastRender.cancelJob.useMutation();
  const uploadRefImageMutation = (trpc as any).upload.referenceImage.useMutation();

  const queryParams = new URLSearchParams(window.location.search);
  const initialSwappysJobId = Number(queryParams.get("swappysJobId") || "0") || null;
  const initialSceneId = Number(queryParams.get("sceneId") || "0") || null;
  const handoff = (trpc as any).virelleBroadcastRender.getSwappysHandoff.useQuery(
    initialSwappysJobId
      ? { swappysJobId: initialSwappysJobId }
      : { sceneId: initialSceneId || undefined },
    {
      enabled: Boolean(initialSwappysJobId || initialSceneId),
      retry: false,
    },
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
  const [targetAge, setTargetAge] = useState(adult ? "18" : "");
  const [targetPresentation, setTargetPresentation] = useState("");
  const [requestedProvider, setRequestedProvider] = useState<Provider | "">("");
  const [directorNotes, setDirectorNotes] = useState("");
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [aiGeneratedCharactersOnly, setAiGeneratedCharactersOnly] = useState(false);
  const [allSubjectsAdultsConfirmed, setAllSubjectsAdultsConfirmed] = useState(false);
  const [noPublicFiguresConfirmed, setNoPublicFiguresConfirmed] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [channels, setChannels] = useState<BroadcastChannel[]>([
    { destination: "rtmp", ingestUrl: "", streamKey: "" },
  ]);
  const [recordingUrls, setRecordingUrls] = useState<Record<number, string>>({});

  useEffect(() => {
    const data = handoff.data;
    if (!data) return;
    const handoffAdult = data.contentMode === "open_adult";
    if (handoffAdult !== adult) {
      toast.error(
        `This Swappys job belongs to the ${handoffAdult ? "Verified 18+" : "Standard"} workspace.`,
      );
      return;
    }
    setSourceSwappysJobId(Number(data.id));
    setProjectId(String(data.projectId || ""));
    setSceneId(String(data.sceneId || ""));
    if (data.sourcePlateUrl) setSourceImageUrls(String(data.sourcePlateUrl));
    const references = [data.enhancedImageUrl, data.actorReferenceUrl].filter(Boolean);
    if (references.length) setReferenceImageUrls(references.join("\n"));
    setTransformGoal(data.transformGoal || "appearance_reference");
    setTargetAge(data.targetAge ? String(data.targetAge) : adult ? "18" : "");
    setTargetPresentation(data.targetPresentation || "");
    setConsentConfirmed(Boolean(data.consentConfirmed));
    if (adult) setAllSubjectsAdultsConfirmed(true);
    toast.success(`Swappys job #${data.id} loaded into this workspace.`);
  }, [adult, handoff.data]);

  const providerStatus = byokStatus.data?.providers || {};
  const hasAnyProvider = Boolean(byokStatus.data?.hasAnyProvider);
  const bridgeConfigured = Boolean(byokStatus.data?.bridgeConfigured);
  const destinations = adult ? ADULT_DESTINATIONS : STANDARD_DESTINATIONS;
  const contentMode = adult ? "open_adult" : "standard";

  const basePayload = useMemo(() => ({
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
    consentConfirmed: consentConfirmed || aiGeneratedCharactersOnly,
    contentMode,
    allSubjectsAdultsConfirmed: adult ? allSubjectsAdultsConfirmed : false,
    publicFigureLikeness: adult ? !noPublicFiguresConfirmed : false,
    aiGeneratedCharactersOnly,
    hideVisibleWatermark: true,
  }), [
    adult,
    aiGeneratedCharactersOnly,
    allSubjectsAdultsConfirmed,
    consentConfirmed,
    contentMode,
    directorNotes,
    noPublicFiguresConfirmed,
    projectId,
    referenceImageUrls,
    referenceVideoUrl,
    requestedProvider,
    sceneId,
    sourceImageUrls,
    sourceSwappysJobId,
    sourceVideoUrl,
    targetAge,
    targetPresentation,
    transformGoal,
  ]);

  const validatePolicy = (broadcast: boolean) => {
    if (!aiGeneratedCharactersOnly && !consentConfirmed) {
      toast.error("Confirm likeness, media and distribution rights before continuing.");
      return false;
    }
    if (adult) {
      if (!allSubjectsAdultsConfirmed) {
        toast.error("Confirm that every depicted and referenced person is 18 or older.");
        return false;
      }
      if (!noPublicFiguresConfirmed) {
        toast.error("Confirm that no public-figure likeness is used in this production.");
        return false;
      }
      if (["adult_to_child", "child_to_adult"].includes(transformGoal)) {
        toast.error("Child or childhood transforms are unavailable in the Verified 18+ Studio.");
        return false;
      }
      if (!targetAge.trim() || Number(targetAge) < 18) {
        toast.error("The Verified 18+ Studio requires a target age of 18 or older.");
        return false;
      }
    }
    if (broadcast) {
      const minimum = adult ? 18 : 16;
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
      toast.error(error?.message || "Could not create the Studio Render job.");
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
      setChannels((previous) => previous.map((channel) => ({
        ...channel,
        streamKey: "",
      })));
      toast.success(
        result.bridgeConfigured
          ? `Recorded broadcast session #${result.sessionId} submitted.`
          : `Session #${result.sessionId} saved securely; the broadcast bridge still requires configuration.`,
      );
      jobs.refetch();
    } catch (error: any) {
      toast.error(error?.message || "Could not create the Broadcast session.");
    }
  };

  const completeSession = async (id: number) => {
    const recordingUrl = recordingUrls[id]?.trim();
    if (!recordingUrl) {
      toast.error("Provide the completed recording URL.");
      return;
    }
    try {
      await completeBroadcast.mutateAsync({ id, recordingUrl });
      toast.success("Broadcast completed. The user download and private compliance archive are queued.");
      jobs.refetch();
    } catch (error: any) {
      toast.error(error?.message || "Could not complete the Broadcast session.");
    }
  };

  const cancel = async (id: number) => {
    try {
      await cancelJob.mutateAsync({ id });
      toast.success("Job cancelled.");
      jobs.refetch();
    } catch (error: any) {
      toast.error(error?.message || "Could not cancel the job.");
    }
  };

  const uploadMedia = async (
    files: FileList | null,
    kind: "sourceImage" | "referenceImage" | "sourceVideo" | "referenceVideo",
  ) => {
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
      if (kind === "sourceImage") {
        setSourceImageUrls((previous) => previous
          ? `${previous}\n${urls.join("\n")}`
          : urls.join("\n"));
      }
      if (kind === "referenceImage") {
        setReferenceImageUrls((previous) => previous
          ? `${previous}\n${urls.join("\n")}`
          : urls.join("\n"));
      }
      if (kind === "sourceVideo") setSourceVideoUrl(urls[0] || "");
      if (kind === "referenceVideo") setReferenceVideoUrl(urls[0] || "");
      toast.success(`${urls.length} file${urls.length === 1 ? "" : "s"} uploaded.`);
    } catch (error: any) {
      toast.error(error?.message || "Upload failed. A secure media URL can be supplied instead.");
    } finally {
      setUploading(null);
    }
  };

  const refresh = () => {
    byokStatus.refetch();
    jobs.refetch();
    handoff.refetch();
  };

  const transformOptions: Array<[TransformGoal, string]> = adult
    ? [
        ["appearance_reference", "Appearance reference"],
        ["boy_to_girl", "Feminine presentation"],
        ["girl_to_boy", "Masculine presentation"],
        ["younger_self", "Younger adult self — 18+ only"],
        ["older_self", "Older self"],
        ["custom_prompt", "Custom production direction"],
      ]
    : [
        ["appearance_reference", "Appearance reference"],
        ["boy_to_girl", "Feminine presentation"],
        ["girl_to_boy", "Masculine presentation"],
        ["younger_self", "Younger self"],
        ["older_self", "Older self"],
        ["adult_to_child", "Childhood self"],
        ["child_to_adult", "Child-to-adult progression"],
        ["custom_prompt", "Custom prompt"],
      ];

  return (
    <div className={`min-h-screen p-4 md:p-6 ${adult ? "bg-[#09090b]" : "bg-background"}`}>
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold">
              {adult
                ? <LockKeyhole className="h-6 w-6 text-amber-300" />
                : <RadioTower className="h-6 w-6 text-amber-400" />}
              {adult ? "Verified 18+ Production Studio" : "Virelle Broadcast & Studio Render"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {adult
                ? "A discreet, identity-verified workspace for authorised adult productions and recorded broadcasting."
                : "Standard film/VFX rendering and recorded broadcasting, isolated from verified adult production tools."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{adult ? "Verified 18+" : "Standard"}</Badge>
            <Button variant="outline" onClick={refresh}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                window.location.href = adult
                  ? "/virelle-broadcast-render"
                  : "/virelle-broadcast-render?adult=1";
              }}
            >
              {adult ? "Standard Studio" : "Verified 18+ Studio"}
            </Button>
          </div>
        </header>

        {sourceSwappysJobId && (
          <Card className="border-amber-500/20 bg-amber-500/[0.035]">
            <CardContent className="flex flex-col gap-2 p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="font-medium text-amber-200">Swappys job #{sourceSwappysJobId} loaded</div>
                <p className="text-xs text-muted-foreground">Ownership, project, scene, reference media and workspace are verified by the server.</p>
              </div>
              <Badge variant="outline">{adult ? "Verified 18+" : "Standard"}</Badge>
            </CardContent>
          </Card>
        )}

        <Card className="border-amber-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound className="h-4 w-4 text-amber-400" />
              Provider, Recording & Archive Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {PROVIDERS.map((provider) => (
                <Badge key={provider} variant={providerStatus[provider] ? "default" : "outline"}>
                  {provider}: {providerStatus[provider] ? "ready" : "missing"}
                </Badge>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant={bridgeConfigured ? "default" : "destructive"}>
                Broadcast bridge: {bridgeConfigured ? "configured" : "not configured"}
              </Badge>
              <Badge variant="outline">Recording required</Badge>
              <Badge variant="outline">Private archive: {byokStatus.data?.complianceRetentionDays || 90}+ days</Badge>
            </div>
            {!hasAnyProvider && (
              <div className="flex flex-col gap-3 rounded-lg border border-amber-500/25 bg-amber-500/[0.06] p-3 text-sm md:flex-row md:items-center md:justify-between">
                <span>BYOK is required. Add a supported video-provider key before creating a render or broadcast.</span>
                <Button size="sm" onClick={() => { window.location.href = API_KEY_SETTINGS_URL; }}>
                  <KeyRound className="mr-2 h-4 w-4" />
                  Add provider key
                </Button>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Your completed output remains downloadable by you. A separate private compliance copy is retained for authorised administrators and cannot be removed by the user during the retention period.
            </p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Video className="h-4 w-4 text-amber-400" />
                Source & Reference Media
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Project ID</Label>
                  <Input value={projectId} onChange={(event) => setProjectId(event.target.value.replace(/[^0-9]/g, ""))} />
                </div>
                <div>
                  <Label>Scene ID</Label>
                  <Input value={sceneId} onChange={(event) => setSceneId(event.target.value.replace(/[^0-9]/g, ""))} />
                </div>
              </div>

              {([
                ["Source video URL", sourceVideoUrl, setSourceVideoUrl, sourceVideoRef, "sourceVideo"],
                ["Reference video URL", referenceVideoUrl, setReferenceVideoUrl, referenceVideoRef, "referenceVideo"],
              ] as const).map(([label, value, setter, reference, kind]) => (
                <div key={label}>
                  <Label>{label}</Label>
                  <div className="flex gap-2">
                    <Input className="flex-1" placeholder="https://..." value={value} onChange={(event) => setter(event.target.value)} />
                    <Button type="button" size="sm" variant="outline" disabled={uploading === kind} onClick={() => reference.current?.click()}>
                      {uploading === kind
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Upload className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              ))}

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <Label>Source image URLs</Label>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => sourceImageRef.current?.click()}>
                    <Upload className="mr-1 h-3 w-3" />Upload
                  </Button>
                </div>
                <Textarea className="min-h-20 text-xs" value={sourceImageUrls} onChange={(event) => setSourceImageUrls(event.target.value)} />
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <Label>Reference image URLs</Label>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => referenceImageRef.current?.click()}>
                    <Upload className="mr-1 h-3 w-3" />Upload
                  </Button>
                </div>
                <Textarea className="min-h-20 text-xs" value={referenceImageUrls} onChange={(event) => setReferenceImageUrls(event.target.value)} />
              </div>

              <input ref={sourceImageRef} type="file" accept="image/*" multiple className="hidden" onChange={(event) => uploadMedia(event.target.files, "sourceImage")} />
              <input ref={referenceImageRef} type="file" accept="image/*" multiple className="hidden" onChange={(event) => uploadMedia(event.target.files, "referenceImage")} />
              <input ref={sourceVideoRef} type="file" accept="video/*" className="hidden" onChange={(event) => uploadMedia(event.target.files, "sourceVideo")} />
              <input ref={referenceVideoRef} type="file" accept="video/*" className="hidden" onChange={(event) => uploadMedia(event.target.files, "referenceVideo")} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="h-4 w-4 text-amber-400" />
                Transform & Rights Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Transform goal</Label>
                <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={transformGoal} onChange={(event) => setTransformGoal(event.target.value as TransformGoal)}>
                  {transformOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Target age</Label>
                  <Input min={adult ? 18 : 1} value={targetAge} onChange={(event) => setTargetAge(event.target.value.replace(/[^0-9]/g, ""))} />
                </div>
                <div>
                  <Label>BYOK provider</Label>
                  <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={requestedProvider} onChange={(event) => setRequestedProvider(event.target.value as Provider | "")}>
                    <option value="">Auto</option>
                    {PROVIDERS.map((provider) => <option key={provider} value={provider}>{provider}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <Label>Target presentation / style</Label>
                <Input value={targetPresentation} onChange={(event) => setTargetPresentation(event.target.value)} />
              </div>
              <div>
                <Label>Director / VFX notes</Label>
                <Textarea className="min-h-28 text-xs" value={directorNotes} onChange={(event) => setDirectorNotes(event.target.value)} />
              </div>

              <Attestation checked={aiGeneratedCharactersOnly} onCheckedChange={setAiGeneratedCharactersOnly}>
                Every depicted person is an original AI-generated character and is not based on a real person's likeness.
              </Attestation>
              {!aiGeneratedCharactersOnly && (
                <Attestation checked={consentConfirmed} onCheckedChange={setConsentConfirmed}>
                  I possess valid likeness, media, distribution and broadcast consent for every real person shown or referenced.
                </Attestation>
              )}
              {adult && (
                <>
                  <Attestation checked={allSubjectsAdultsConfirmed} onCheckedChange={setAllSubjectsAdultsConfirmed}>
                    Every depicted and referenced person is 18 or older. No minor, youth-coded or ambiguous-age subject is included.
                  </Attestation>
                  <Attestation checked={noPublicFiguresConfirmed} onCheckedChange={setNoPublicFiguresConfirmed}>
                    No celebrity, politician or other public-figure likeness is used in this adult production.
                  </Attestation>
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.035] p-3 text-[11px] leading-relaxed text-muted-foreground">
                    Adult production tools remain subject to consent, identity and minor-safety enforcement. Age regression below 18, CSAM, coercion, revenge content and non-consensual sexualisation are prohibited without exception.
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card className="border-blue-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Radio className="h-4 w-4 text-blue-400" />
                Recorded Broadcast Outputs
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {channels.map((channel, index) => (
                <div key={index} className="space-y-2 rounded-md border p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Output {index + 1}</span>
                    {channels.length > 1 && (
                      <button className="text-xs text-muted-foreground hover:text-red-400" onClick={() => setChannels((previous) => previous.filter((_, itemIndex) => itemIndex !== index))}>
                        Remove
                      </button>
                    )}
                  </div>
                  <div>
                    <Label>Destination</Label>
                    <select
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      value={channel.destination}
                      onChange={(event) => {
                        const destination = event.target.value as BroadcastDestination;
                        setChannels((previous) => previous.map((item, itemIndex) => itemIndex === index
                          ? { ...item, destination, ingestUrl: destinationDefaultUrl(destination) }
                          : item));
                      }}
                    >
                      {destinations.map((destination) => (
                        <option key={destination} value={destination}>{destinationLabel(destination)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Ingest URL</Label>
                    <Input value={channel.ingestUrl} onChange={(event) => setChannels((previous) => previous.map((item, itemIndex) => itemIndex === index ? { ...item, ingestUrl: event.target.value } : item))} />
                  </div>
                  <div>
                    <Label>Stream key</Label>
                    <Input type="password" autoComplete="off" value={channel.streamKey} onChange={(event) => setChannels((previous) => previous.map((item, itemIndex) => itemIndex === index ? { ...item, streamKey: event.target.value } : item))} />
                  </div>
                </div>
              ))}
              {channels.length < 5 && (
                <Button size="sm" variant="outline" className="w-full" onClick={() => setChannels((previous) => [...previous, { destination: "rtmp", ingestUrl: "", streamKey: "" }])}>
                  + Add output
                </Button>
              )}
              <Button className="w-full" onClick={submitBroadcast} disabled={createBroadcast.isPending || !hasAnyProvider}>
                {createBroadcast.isPending
                  ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  : <Radio className="mr-2 h-4 w-4" />}
                Configure recorded broadcast
              </Button>
              <p className="text-xs text-muted-foreground">
                Virelle will not start transmission unless the bridge supplies a stable recording/download URL. Stream credentials are encrypted and never returned by the API.
              </p>
            </CardContent>
          </Card>

          <Card className="border-amber-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Video className="h-4 w-4 text-amber-400" />
                {adult ? "Verified Adult Video Pipeline" : "Studio Video Render"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm leading-relaxed text-muted-foreground">
                Create a high-quality BYOK video render from the selected Swappys identity and scene media. Completed outputs are downloadable by the user and copied into the private compliance archive.
              </p>
              <Button className="w-full bg-amber-500 text-black hover:bg-amber-400" onClick={submitStudioRender} disabled={createRender.isPending || !hasAnyProvider}>
                {createRender.isPending
                  ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  : <Video className="mr-2 h-4 w-4" />}
                Create video render
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent {adult ? "Verified 18+" : "Standard"} Jobs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {jobs.isLoading && <p className="text-sm text-muted-foreground">Loading jobs…</p>}
            {(jobs.data || []).map((job: any) => (
              <div key={job.id} className="space-y-3 rounded-lg border p-3 text-sm">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="font-medium">#{job.id} · {job.mode} · {job.transformGoal}</div>
                    <div className="text-xs text-muted-foreground">
                      Provider: {job.provider} · Commenced: {formatDate(job.broadcastStartedAt || job.createdAt)} · Recording: {job.recordingRequired ? "required" : "n/a"}
                    </div>
                  </div>
                  <Badge variant={statusVariant(job.status)}>{job.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{jobInstructions(job)}</p>
                {job.errorMessage && (
                  <div className="flex gap-2 rounded-md border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-200">
                    <XCircle className="h-4 w-4 shrink-0" />
                    <span>{job.errorMessage}</span>
                  </div>
                )}
                {job.outputVideoUrl && (
                  <div className="space-y-2">
                    <video src={job.outputVideoUrl} controls className="w-full rounded-lg border" />
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => copyText(job.outputVideoUrl, "Output URL copied")}>
                        <Copy className="mr-1 h-3 w-3" />Copy URL
                      </Button>
                      <Button size="sm" variant="outline" asChild>
                        <a href={job.outputVideoUrl} target="_blank" rel="noreferrer">
                          <ExternalLink className="mr-1 h-3 w-3" />Open
                        </a>
                      </Button>
                      <Button size="sm" variant="outline" asChild>
                        <a href={job.outputVideoUrl} download>
                          <Download className="mr-1 h-3 w-3" />Download
                        </a>
                      </Button>
                    </div>
                  </div>
                )}
                {job.mode === "broadcast"
                  && ["broadcast_ready", "processing"].includes(job.status)
                  && !job.broadcastCompletedAt && (
                    <div className="rounded-lg border border-blue-500/20 bg-blue-500/[0.04] p-3">
                      <Label>Completed recording URL</Label>
                      <div className="mt-2 flex flex-col gap-2 md:flex-row">
                        <Input
                          placeholder="https://.../recording.mp4"
                          value={recordingUrls[job.id] || ""}
                          onChange={(event) => setRecordingUrls((previous) => ({
                            ...previous,
                            [job.id]: event.target.value,
                          }))}
                        />
                        <Button onClick={() => completeSession(Number(job.id))} disabled={completeBroadcast.isPending}>
                          Finish & save recording
                        </Button>
                      </div>
                    </div>
                  )}
                {[
                  "queued",
                  "waiting_for_provider",
                  "processing",
                  "broadcast_ready",
                ].includes(job.status) && (
                  <Button size="sm" variant="destructive" onClick={() => cancel(Number(job.id))}>
                    Cancel
                  </Button>
                )}
              </div>
            ))}
            {!jobs.isLoading && !(jobs.data || []).length && (
              <p className="text-sm text-muted-foreground">No jobs in this workspace.</p>
            )}
          </CardContent>
        </Card>

        <div className="flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/[0.035] p-4 text-xs text-muted-foreground">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <p>
            Standard and Verified 18+ jobs, media records and broadcast destinations are separated by server-side workspace rules. Minor-safety, consent, exploitation and evidence-preservation controls apply across both workspaces.
          </p>
        </div>
      </div>
    </div>
  );
}

function Inner() {
  const user = (trpc as any).auth.me.useQuery();
  const matureStatus = (trpc as any).virelleBroadcastRender.getMatureAccessStatus.useQuery(undefined, { retry: false });
  const adultRequested = new URLSearchParams(window.location.search).get("adult") === "1";

  if (user.isLoading || matureStatus.isLoading) {
    return (
      <div className="min-h-screen bg-background p-12 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-amber-300" />
      </div>
    );
  }

  if (adultRequested && !matureStatus.data?.accessGranted) {
    return (
      <div className="min-h-screen bg-[#09090b] p-4 md:p-8">
        <div className="mx-auto max-w-5xl space-y-5">
          <MatureAccessPanel user={user.data} statusQuery={matureStatus} />
        </div>
      </div>
    );
  }

  return <ProductionWorkspace workspace={adultRequested ? "adult" : "standard"} />;
}

export default function VirelleBroadcastRender() {
  return (
    <SubscriptionGate feature="Virelle Broadcast & Studio Render" requiredTier="creator">
      <Inner />
    </SubscriptionGate>
  );
}
