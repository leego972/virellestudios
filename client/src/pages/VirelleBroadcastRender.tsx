import {
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubscriptionGate } from "@/components/SubscriptionGate";
import ComplianceAdminVault from "@/components/ComplianceAdminVault";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Copy,
  CreditCard,
  Download,
  ExternalLink,
  Fingerprint,
  KeyRound,
  Loader2,
  LockKeyhole,
  Phone,
  Radio,
  RadioTower,
  RefreshCcw,
  ShieldCheck,
  ShoppingCart,
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

type Provider =
  | "runway"
  | "openai"
  | "replicate"
  | "fal"
  | "luma"
  | "huggingface"
  | "seedance"
  | "veo3";

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

type Workspace = "standard" | "adult";
type BroadcastServiceMode = "direct" | "managed" | "ai_assisted";

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

const API_KEY_SETTINGS_URL =
  "/settings?tab=api-keys&source=virelle-broadcast-render";

function formatDate(value: unknown): string {
  if (!value) return "—";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString("en-AU");
}

function parseUrls(value: string): string[] {
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function copyText(value: string, message = "Copied") {
  navigator.clipboard?.writeText(value)
    .then(() => toast.success(message))
    .catch(() => toast.error("Could not copy to clipboard."));
}

function jobBadgeVariant(status: string) {
  if (["failed", "cancelled"].includes(status)) return "destructive" as const;
  if (["completed", "broadcast_ready"].includes(status)) return "default" as const;
  return "outline" as const;
}

function destinationLabel(destination: BroadcastDestination): string {
  const labels: Record<BroadcastDestination, string> = {
    rtmp: "Custom RTMP",
    rtmp_onlyfans: "OnlyFans Live",
    rtmp_fansly: "Fansly Live",
    rtmp_chaturbate: "Chaturbate Live",
    webrtc: "WebRTC",
    obs: "OBS bridge",
    custom: "Custom broadcast engine",
  };
  return labels[destination];
}

function destinationDefaultUrl(destination: BroadcastDestination): string {
  if (destination === "rtmp_onlyfans") return "rtmps://live.onlyfans.com/app/";
  if (destination === "rtmp_fansly") return "rtmps://live.fansly.com/live/";
  if (destination === "rtmp_chaturbate") {
    return "rtmp://broadcast.chaturbate.com/live/";
  }
  return "";
}

function Attestation({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-white/10 bg-black/10 p-3 text-sm leading-relaxed text-white/65 transition-colors hover:border-white/15">
      <Checkbox
        checked={checked}
        onCheckedChange={(value) => onChange(Boolean(value))}
        className="mt-0.5"
      />
      <span>{children}</span>
    </label>
  );
}

function VerificationItem({
  complete,
  label,
}: {
  complete: boolean;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/15 px-3 py-2 text-sm">
      {complete
        ? <CheckCircle2 className="h-4 w-4 text-emerald-400" />
        : <AlertTriangle className="h-4 w-4 text-amber-300" />}
      <span className={complete ? "text-white/75" : "text-white/55"}>
        {label}
      </span>
    </div>
  );
}

function MatureAccessPanel({
  user,
  statusQuery,
}: {
  user: any;
  statusQuery: any;
}) {
  const status = statusQuery.data;
  const profile = status?.profile;
  const [form, setForm] = useState({
    fullName: profile?.fullName || user?.name || "",
    email: profile?.email || user?.email || "",
    phone: profile?.phone || "",
    addressLine1: profile?.addressLine1 || "",
    addressLine2: profile?.addressLine2 || "",
    city: profile?.city || "",
    stateRegion: profile?.stateRegion || "",
    postcode: profile?.postcode || "",
    country: profile?.country || "Australia",
    dateOfBirth: profile?.dateOfBirth || "",
  });
  const [adultAttestationAccepted, setAdultAttestationAccepted] = useState(
    Boolean(status?.adultAttestationAccepted),
  );
  const [responsibilityAccepted, setResponsibilityAccepted] = useState(
    Boolean(status?.responsibilityAccepted),
  );
  const [consentPolicyAccepted, setConsentPolicyAccepted] = useState(
    Boolean(status?.consentPolicyAccepted),
  );
  const [archiveRetentionAccepted, setArchiveRetentionAccepted] = useState(
    Boolean(status?.archiveRetentionAccepted),
  );
  const [phoneCode, setPhoneCode] = useState("");

  const saveProfile = (trpc as any).virelleBroadcastRender.saveMatureAccessProfile.useMutation();
  const sendCode = (trpc as any).virelleBroadcastRender.sendMaturePhoneCode.useMutation();
  const verifyCode = (trpc as any).virelleBroadcastRender.verifyMaturePhoneCode.useMutation();
  const createIdentity = (trpc as any).virelleBroadcastRender.createMatureIdentitySession.useMutation();
  const refreshIdentity = (trpc as any).virelleBroadcastRender.refreshMatureIdentityStatus.useMutation();
  const createCard = (trpc as any).virelleBroadcastRender.createMatureCardVerification.useMutation();
  const verifyCard = (trpc as any).virelleBroadcastRender.verifyMatureCardSession.useMutation();

  useEffect(() => {
    if (!profile) return;
    setForm({
      fullName: profile.fullName || "",
      email: profile.email || user?.email || "",
      phone: profile.phone || "",
      addressLine1: profile.addressLine1 || "",
      addressLine2: profile.addressLine2 || "",
      city: profile.city || "",
      stateRegion: profile.stateRegion || "",
      postcode: profile.postcode || "",
      country: profile.country || "Australia",
      dateOfBirth: profile.dateOfBirth || "",
    });
  }, [profile, user?.email]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cardSession = params.get("adult_card_session");
    if (!cardSession || verifyCard.isPending) return;
    verifyCard.mutateAsync({ sessionId: cardSession })
      .then(() => {
        toast.success("Cardholder name verified.");
        params.delete("adult_card_session");
        params.delete("adult_card_cancelled");
        window.history.replaceState(
          {},
          "",
          `${window.location.pathname}?${params.toString()}`,
        );
        statusQuery.refetch();
      })
      .catch((error: any) => {
        toast.error(error?.message || "Cardholder verification failed.");
      });
  // Run only when a returned Stripe session appears in the URL.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateForm = (key: keyof typeof form, value: string) => {
    setForm((previous) => ({ ...previous, [key]: value }));
  };

  const submitProfile = async () => {
    try {
      await saveProfile.mutateAsync({
        ...form,
        addressLine2: form.addressLine2 || null,
        adultAttestationAccepted,
        responsibilityAccepted,
        consentPolicyAccepted,
        archiveRetentionAccepted,
      });
      toast.success("Individual verification profile saved.");
      statusQuery.refetch();
    } catch (error: any) {
      toast.error(error?.message || "Could not save the verification profile.");
    }
  };

  const sendPhoneCode = async () => {
    try {
      await sendCode.mutateAsync();
      toast.success("Verification code sent.");
    } catch (error: any) {
      toast.error(error?.message || "Could not send the phone code.");
    }
  };

  const verifyPhoneCode = async () => {
    try {
      await verifyCode.mutateAsync({ code: phoneCode });
      setPhoneCode("");
      toast.success("Phone number verified.");
      statusQuery.refetch();
    } catch (error: any) {
      toast.error(error?.message || "Phone verification failed.");
    }
  };

  const beginIdentityCheck = async () => {
    try {
      const result = await createIdentity.mutateAsync({
        returnUrl: window.location.href,
      });
      window.location.assign(result.url);
    } catch (error: any) {
      toast.error(error?.message || "Could not start identity verification.");
    }
  };

  const refreshIdentityCheck = async () => {
    try {
      const result = await refreshIdentity.mutateAsync();
      if (result.verificationStatus === "verified") {
        toast.success("Government identity verified.");
      } else {
        toast.info(`Identity status: ${result.verificationStatus}`);
      }
      statusQuery.refetch();
    } catch (error: any) {
      toast.error(error?.message || "Could not refresh identity verification.");
    }
  };

  const beginCardCheck = async () => {
    try {
      const result = await createCard.mutateAsync({
        returnUrl: window.location.href,
      });
      window.location.assign(result.url);
    } catch (error: any) {
      toast.error(error?.message || "Could not start cardholder verification.");
    }
  };

  const declarationsAccepted = adultAttestationAccepted
    && responsibilityAccepted
    && consentPolicyAccepted
    && archiveRetentionAccepted;

  if (statusQuery.isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-300" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Card className="border-white/10 bg-white/[0.025] text-white shadow-xl shadow-black/15">
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-amber-300/70">
                Individual verification
              </div>
              <CardTitle className="text-xl">Adult Studio Access</CardTitle>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/55">
                This workspace is attached to the individual operating the account, not a company. Access requires a paid membership, 18+ declaration, phone verification, government ID, matching cardholder name and acceptance of the consent and retention terms.
              </p>
            </div>
            <Badge variant={status?.accessGranted ? "default" : "outline"}>
              {status?.accessGranted ? "Verified" : "Verification required"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            <VerificationItem complete={Boolean(status?.paidMembership)} label="Active paid membership" />
            <VerificationItem complete={Boolean(status?.profileComplete)} label="Individual legal profile" />
            <VerificationItem complete={Boolean(status?.adultAgeConfirmed && status?.adultAttestationAccepted)} label="18+ age and declaration" />
            <VerificationItem complete={Boolean(status?.phoneVerified)} label="Phone two-factor verification" />
            <VerificationItem complete={Boolean(status?.identityVerified)} label="Government ID and selfie" />
            <VerificationItem complete={Boolean(status?.cardNameMatched)} label="Matching cardholder name" />
            <VerificationItem complete={Boolean(status?.responsibilityAccepted)} label="Account responsibility" />
            <VerificationItem complete={Boolean(status?.consentPolicyAccepted)} label="Likeness and consent policy" />
            <VerificationItem complete={Boolean(status?.archiveRetentionAccepted)} label="Private retention acknowledgement" />
          </div>
          {status?.missing?.length > 0 && (
            <p className="mt-4 rounded-lg border border-amber-300/15 bg-amber-300/[0.035] p-3 text-sm text-white/60">
              Remaining: {status.missing.join(", ")}.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <Card className="border-white/10 bg-white/[0.025] text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserCheck className="h-5 w-5 text-amber-300/80" />
              Personal legal profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Full legal name</Label>
                <Input value={form.fullName} onChange={(event) => updateForm("fullName", event.target.value)} />
              </div>
              <div>
                <Label>Account email</Label>
                <Input value={form.email} readOnly className="opacity-70" />
              </div>
              <div>
                <Label>Personal phone in international format</Label>
                <Input placeholder="+61412345678" value={form.phone} onChange={(event) => updateForm("phone", event.target.value)} />
              </div>
              <div>
                <Label>Date of birth</Label>
                <Input type="date" value={form.dateOfBirth} onChange={(event) => updateForm("dateOfBirth", event.target.value)} />
              </div>
              <div className="md:col-span-2">
                <Label>Residential address</Label>
                <Input value={form.addressLine1} onChange={(event) => updateForm("addressLine1", event.target.value)} />
              </div>
              <div className="md:col-span-2">
                <Label>Address line 2</Label>
                <Input value={form.addressLine2} onChange={(event) => updateForm("addressLine2", event.target.value)} />
              </div>
              <div>
                <Label>City</Label>
                <Input value={form.city} onChange={(event) => updateForm("city", event.target.value)} />
              </div>
              <div>
                <Label>State / region</Label>
                <Input value={form.stateRegion} onChange={(event) => updateForm("stateRegion", event.target.value)} />
              </div>
              <div>
                <Label>Postcode</Label>
                <Input value={form.postcode} onChange={(event) => updateForm("postcode", event.target.value)} />
              </div>
              <div>
                <Label>Country</Label>
                <Input value={form.country} onChange={(event) => updateForm("country", event.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Attestation checked={adultAttestationAccepted} onChange={setAdultAttestationAccepted}>
                I confirm that I am at least 18 years old and that the individual details above are accurate.
              </Attestation>
              <Attestation checked={responsibilityAccepted} onChange={setResponsibilityAccepted}>
                I accept sole responsibility for media and broadcasts generated, transformed or transmitted from this account.
              </Attestation>
              <Attestation checked={consentPolicyAccepted} onChange={setConsentPolicyAccepted}>
                I will use real-person media only when every depicted person is an adult and has provided valid likeness, media, distribution and broadcast consent. I will not use a public-figure likeness for adult content.
              </Attestation>
              <Attestation checked={archiveRetentionAccepted} onChange={setArchiveRetentionAccepted}>
                I understand that Virelle keeps a separate private compliance copy of generated videos and completed broadcast recordings for at least 90 days, or longer when preservation is legally required. Ordinary users cannot access or delete that private copy.
              </Attestation>
            </div>

            <Button
              className="w-full bg-amber-300 text-black hover:bg-amber-200"
              disabled={!declarationsAccepted || saveProfile.isPending}
              onClick={submitProfile}
            >
              {saveProfile.isPending
                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                : <ShieldCheck className="mr-2 h-4 w-4" />}
              Save verification profile
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card className="border-white/10 bg-white/[0.025] text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Phone className="h-5 w-5 text-amber-300/80" />
                Phone verification
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full border-white/15 bg-white/[0.03]"
                disabled={!status?.profileComplete || sendCode.isPending || status?.phoneVerified}
                onClick={sendPhoneCode}
              >
                {status?.phoneVerified ? "Phone verified" : "Send verification code"}
              </Button>
              {!status?.phoneVerified && (
                <div className="flex gap-2">
                  <Input
                    inputMode="numeric"
                    placeholder="SMS code"
                    value={phoneCode}
                    onChange={(event) => setPhoneCode(event.target.value.replace(/[^0-9]/g, ""))}
                  />
                  <Button
                    disabled={phoneCode.length < 4 || verifyCode.isPending}
                    onClick={verifyPhoneCode}
                  >
                    Verify
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/[0.025] text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Fingerprint className="h-5 w-5 text-amber-300/80" />
                Government identity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full border-white/15 bg-white/[0.03]"
                disabled={!status?.profileComplete || createIdentity.isPending || status?.identityVerified}
                onClick={beginIdentityCheck}
              >
                {status?.identityVerified ? "Identity verified" : "Start ID and selfie check"}
              </Button>
              {!status?.identityVerified && (
                <Button
                  variant="ghost"
                  className="w-full text-white/60"
                  disabled={refreshIdentity.isPending}
                  onClick={refreshIdentityCheck}
                >
                  Refresh identity status
                </Button>
              )}
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/[0.025] text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="h-5 w-5 text-amber-300/80" />
                Cardholder-name match
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="w-full border-white/15 bg-white/[0.03]"
                disabled={!status?.profileComplete || createCard.isPending || status?.cardNameMatched}
                onClick={beginCardCheck}
              >
                {status?.cardNameMatched ? "Cardholder name matched" : "Verify cardholder name"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StudioWorkspace({ workspace }: { workspace: Workspace }) {
  const isAdult = workspace === "adult";
  const auth = (trpc as any).auth.me.useQuery();
  const matureStatus = (trpc as any).virelleBroadcastRender.getMatureAccessStatus.useQuery(
    undefined,
    { enabled: isAdult, retry: false },
  );
  const accessReady = !isAdult || Boolean(matureStatus.data?.accessGranted);
  const byokStatus = (trpc as any).virelleBroadcastRender.getByokStatus.useQuery(
    undefined,
    { enabled: accessReady, retry: false },
  );
  const minuteWallet = (trpc as any).virelleBroadcastRender.getBroadcastMinuteWallet.useQuery(
    undefined,
    { enabled: accessReady, retry: false },
  );
  const createMinuteCheckout = (trpc as any).virelleBroadcastRender.createBroadcastMinuteCheckout.useMutation();
  const jobs = (trpc as any).virelleBroadcastRender.listJobs.useQuery(
    { workspace, limit: 25 },
    { enabled: accessReady, retry: false, refetchInterval: 10_000 },
  );
  const createRender = (trpc as any).virelleBroadcastRender.createStudioRenderJob.useMutation();
  const createBroadcast = (trpc as any).virelleBroadcastRender.createBroadcastSession.useMutation();
  const cancelJob = (trpc as any).virelleBroadcastRender.cancelJob.useMutation();
  const uploadMediaMutation = (trpc as any).upload.referenceImage.useMutation();

  const queryParams = new URLSearchParams(window.location.search);
  const initialSwappysJobId = Number(queryParams.get("swappysJobId") || "0") || null;
  const initialSceneId = Number(queryParams.get("sceneId") || "0") || null;
  const handoff = (trpc as any).virelleBroadcastRender.getSwappysHandoff.useQuery(
    initialSwappysJobId
      ? { swappysJobId: initialSwappysJobId }
      : { sceneId: initialSceneId || undefined },
    {
      enabled: accessReady && Boolean(initialSwappysJobId || initialSceneId),
      retry: false,
    },
  );

  const sourceImageRef = useRef<HTMLInputElement>(null);
  const referenceImageRef = useRef<HTMLInputElement>(null);
  const sourceVideoRef = useRef<HTMLInputElement>(null);
  const referenceVideoRef = useRef<HTMLInputElement>(null);

  const [sourceSwappysJobId, setSourceSwappysJobId] = useState<number | null>(
    initialSwappysJobId,
  );
  const [projectId, setProjectId] = useState("");
  const [sceneId, setSceneId] = useState("");
  const [sourceVideoUrl, setSourceVideoUrl] = useState("");
  const [referenceVideoUrl, setReferenceVideoUrl] = useState("");
  const [sourceImageUrls, setSourceImageUrls] = useState("");
  const [referenceImageUrls, setReferenceImageUrls] = useState("");
  const [transformGoal, setTransformGoal] = useState<TransformGoal>(
    "appearance_reference",
  );
  const [targetAge, setTargetAge] = useState(isAdult ? "21" : "");
  const [targetPresentation, setTargetPresentation] = useState("");
  const [requestedProvider, setRequestedProvider] = useState<Provider | "">("");
  const [directorNotes, setDirectorNotes] = useState("");
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [aiGeneratedCharactersOnly, setAiGeneratedCharactersOnly] = useState(false);
  const [allSubjectsAdultsConfirmed, setAllSubjectsAdultsConfirmed] = useState(false);
  const [noPublicFigureConfirmed, setNoPublicFigureConfirmed] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [serviceMode, setServiceMode] = useState<BroadcastServiceMode>("managed");
  const [durationMinutes, setDurationMinutes] = useState<30 | 60 | 120>(60);
  const [channels, setChannels] = useState<BroadcastChannel[]>([
    { destination: "rtmp", ingestUrl: "", streamKey: "" },
  ]);

  useEffect(() => {
    const data = handoff.data;
    if (!data) return;
    const handoffWorkspace: Workspace = data.contentMode === "open_adult"
      ? "adult"
      : "standard";
    if (handoffWorkspace !== workspace) {
      toast.error(
        `This Swappys job belongs to the ${handoffWorkspace === "adult" ? "Adult" : "Standard"} Studio.`,
      );
      return;
    }
    setSourceSwappysJobId(Number(data.id));
    setProjectId(String(data.projectId || ""));
    setSceneId(String(data.sceneId || ""));
    if (data.sourcePlateUrl) setSourceImageUrls(String(data.sourcePlateUrl));
    const references = [data.enhancedImageUrl, data.actorReferenceUrl]
      .filter(Boolean);
    if (references.length) setReferenceImageUrls(references.join("\n"));
    setTransformGoal(data.transformGoal || "appearance_reference");
    setTargetAge(data.targetAge ? String(data.targetAge) : isAdult ? "21" : "");
    setTargetPresentation(data.targetPresentation || "");
    setConsentConfirmed(Boolean(data.consentConfirmed));
    if (isAdult) setAllSubjectsAdultsConfirmed(true);
    toast.success(`Swappys job #${data.id} loaded into this workspace.`);
  }, [handoff.data, isAdult, workspace]);

  const providerStatus = byokStatus.data?.providers || {};
  const hasAnyProvider = Boolean(byokStatus.data?.hasAnyProvider);
  const bridgeConfigured = Boolean(byokStatus.data?.bridgeConfigured);
  const destinations = isAdult ? ADULT_DESTINATIONS : STANDARD_DESTINATIONS;
  const minuteBalance = Number(minuteWallet.data?.availableMinutes || 0);
  const unlimitedMinutes = Boolean(minuteWallet.data?.unlimited);
  const minutePackages = minuteWallet.data?.packages || [];
  const needsByokForBroadcast = serviceMode === "ai_assisted";

  const transformOptions: Array<[TransformGoal, string]> = isAdult
    ? [
        ["appearance_reference", "Appearance reference"],
        ["boy_to_girl", "Feminine presentation"],
        ["girl_to_boy", "Masculine presentation"],
        ["younger_self", "Younger adult self — 18+ only"],
        ["older_self", "Older self"],
        ["custom_prompt", "Custom adult production direction"],
      ]
    : [
        ["appearance_reference", "Appearance reference"],
        ["boy_to_girl", "Feminine presentation"],
        ["girl_to_boy", "Masculine presentation"],
        ["younger_self", "Younger self"],
        ["older_self", "Older self"],
        ["adult_to_child", "Childhood self"],
        ["child_to_adult", "Child-to-adult progression"],
        ["custom_prompt", "Custom film direction"],
      ];

  const payload = useMemo(() => ({
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
    contentMode: isAdult ? "open_adult" : "standard",
    allSubjectsAdultsConfirmed: isAdult
      ? allSubjectsAdultsConfirmed
      : false,
    publicFigureLikeness: false,
    aiGeneratedCharactersOnly,
    hideVisibleWatermark: true,
  }), [
    projectId,
    sceneId,
    sourceSwappysJobId,
    sourceVideoUrl,
    referenceVideoUrl,
    sourceImageUrls,
    referenceImageUrls,
    transformGoal,
    targetAge,
    targetPresentation,
    requestedProvider,
    directorNotes,
    consentConfirmed,
    isAdult,
    allSubjectsAdultsConfirmed,
    aiGeneratedCharactersOnly,
  ]);

  const validateRequest = (broadcast: boolean): boolean => {
    const aiBroadcast = broadcast && serviceMode === "ai_assisted";
    const requiresCreativeMedia = !broadcast || aiBroadcast;

    if (requiresCreativeMedia && !aiGeneratedCharactersOnly && !consentConfirmed) {
      toast.error(
        "Confirm valid likeness, media, distribution and broadcast consent for every real person used.",
      );
      return false;
    }
    if (
      requiresCreativeMedia
      && !sourceVideoUrl.trim()
      && parseUrls(sourceImageUrls).length === 0
      && !sourceSwappysJobId
    ) {
      toast.error("Add source media or load a Swappys job first.");
      return false;
    }
    if (isAdult) {
      if (!consentConfirmed && !aiGeneratedCharactersOnly) {
        toast.error("Confirm valid consent for every real person appearing in the adult broadcast.");
        return false;
      }
      if (!allSubjectsAdultsConfirmed) {
        toast.error("Confirm that every depicted and referenced person is 18 or older.");
        return false;
      }
      if (!noPublicFigureConfirmed) {
        toast.error("Confirm that no celebrity, politician or other public-figure likeness is used.");
        return false;
      }
      if (aiBroadcast && (!targetAge.trim() || Number(targetAge) < 18)) {
        toast.error("Adult Studio AI target age must be 18 or older.");
        return false;
      }
      if (aiBroadcast && ["adult_to_child", "child_to_adult"].includes(transformGoal)) {
        toast.error("Child and age-crossing transforms are unavailable in the Adult Studio.");
        return false;
      }
    }
    if (aiBroadcast) {
      if (!hasAnyProvider) {
        toast.error("Add and fund a supported BYOK provider before using AI-assisted Broadcast.");
        return false;
      }
      const minimumAge = isAdult ? 18 : 16;
      if (transformGoal === "adult_to_child") {
        toast.error("Child-transform avatars are not permitted in live Broadcast.");
        return false;
      }
      if (targetAge.trim() && Number(targetAge) < minimumAge) {
        toast.error(`Broadcast avatar target age must be ${minimumAge} or older.`);
        return false;
      }
      if (transformGoal === "younger_self" && !targetAge.trim()) {
        toast.error(
          `Younger-self broadcasts require an explicit target age of ${minimumAge} or older.`,
        );
        return false;
      }
    }
    if (
      broadcast
      && serviceMode !== "direct"
      && !unlimitedMinutes
      && minuteBalance < durationMinutes
    ) {
      toast.error(`This broadcast needs ${durationMinutes} managed minutes; ${minuteBalance} remain.`);
      return false;
    }
    return true;
  };

  const submitRender = async () => {
    if (!validateRequest(false)) return;
    try {
      const result = await createRender.mutateAsync(payload);
      toast.success(
        `Video job #${result.jobId} queued with ${result.provider}.`,
      );
      jobs.refetch();
    } catch (error: any) {
      toast.error(error?.message || "Could not create the video job.");
    }
  };

  const submitBroadcast = async () => {
    if (!validateRequest(true)) return;
    try {
      const result = await createBroadcast.mutateAsync({
        ...payload,
        serviceMode,
        durationMinutes,
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
      if (result.serviceMode === "direct") {
        toast.success("Direct OBS configuration saved. No Virelle minutes or BYOK were used.");
      } else {
        toast.success(
          result.bridgeConfigured
            ? `Broadcast session #${result.sessionId} submitted; ${result.managedMinutesReserved} managed minutes reserved.`
            : `Broadcast session #${result.sessionId} saved. The managed bridge still requires platform configuration.`,
        );
      }
      jobs.refetch();
      minuteWallet.refetch();
    } catch (error: any) {
      toast.error(error?.message || "Could not create the broadcast session.");
      minuteWallet.refetch();
    }
  };

  const purchaseMinutePack = async (packId: string) => {
    try {
      const result = await createMinuteCheckout.mutateAsync({
        packId,
        returnUrl: window.location.href,
      });
      window.location.assign(result.url);
    } catch (error: any) {
      toast.error(error?.message || "Could not open broadcast-minute checkout.");
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
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result).split(",")[1]);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        const result = await uploadMediaMutation.mutateAsync({
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
      toast.error(
        error?.message
        || "Upload failed. Paste a secure media URL if direct video upload is unavailable.",
      );
    } finally {
      setUploading(null);
    }
  };

  if (isAdult && !matureStatus.data?.accessGranted) {
    return (
      <div className="min-h-screen bg-[#090a0d] p-4 text-white md:p-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <header className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.055] to-white/[0.018] p-6 shadow-2xl shadow-black/20 md:p-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-amber-300/70">
                  <LockKeyhole className="h-4 w-4" />
                  Compliance-managed workspace
                </div>
                <h1 className="text-3xl font-semibold tracking-tight">
                  Virelle Adult Studio
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/55">
                  A separate professional production environment for verified adults. Adult tools, assets, jobs and broadcast destinations remain isolated from the Standard Studio.
                </p>
              </div>
              <Button
                variant="outline"
                className="border-white/15 bg-white/[0.03]"
                onClick={() => { window.location.href = "/virelle-broadcast-render"; }}
              >
                Return to Standard Studio
              </Button>
            </div>
          </header>
          <MatureAccessPanel user={auth.data} statusQuery={matureStatus} />
        </div>
      </div>
    );
  }

  const pageBackground = isAdult ? "bg-[#090a0d] text-white" : "bg-background";
  const subtleCard = isAdult
    ? "border-white/10 bg-white/[0.025] text-white"
    : "border-border/60";

  return (
    <div className={`min-h-screen p-4 md:p-6 ${pageBackground}`}>
      <div className="mx-auto max-w-6xl space-y-5">
        <header className={isAdult
          ? "rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.055] to-white/[0.018] p-6 shadow-2xl shadow-black/20"
          : "rounded-2xl border border-border/60 bg-card/50 p-6"}
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className={`mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] ${
                isAdult ? "text-amber-300/70" : "text-amber-600 dark:text-amber-400"
              }`}>
                {isAdult
                  ? <LockKeyhole className="h-4 w-4" />
                  : <RadioTower className="h-4 w-4" />}
                {isAdult ? "Verified adult production" : "Standard film production"}
              </div>
              <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
                {isAdult
                  ? "Virelle Adult Studio"
                  : "Virelle Broadcast & Studio Render"}
              </h1>
              <p className={`mt-2 max-w-3xl text-sm leading-relaxed ${
                isAdult ? "text-white/55" : "text-muted-foreground"
              }`}>
                {isAdult
                  ? "Adult-only video generation, Swappys transformations and recorded broadcasting for verified consenting adults. Minors, minor-looking characters, public-figure sexualisation and non-consensual use are prohibited."
                  : "Professional non-explicit video rendering, Swappys special effects and recorded broadcasting. Age-appropriate non-sexual teen film scenes remain available; sexualised minor content is never permitted."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className={isAdult ? "border-white/15 bg-white/[0.03]" : ""}
                onClick={() => {
                  window.location.href = isAdult
                    ? "/virelle-broadcast-render"
                    : "/virelle-broadcast-render?adult=1";
                }}
              >
                {isAdult ? "Standard Studio" : "Verified 18+ Studio"}
              </Button>
              <Button
                variant="outline"
                className={isAdult ? "border-white/15 bg-white/[0.03]" : ""}
                onClick={() => {
                  byokStatus.refetch();
                  jobs.refetch();
                  handoff.refetch();
                  if (isAdult) matureStatus.refetch();
                }}
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>
        </header>

        {sourceSwappysJobId && (
          <Card className={subtleCard}>
            <CardContent className="flex flex-col gap-2 p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="font-medium">
                  Swappys job #{sourceSwappysJobId} connected
                </div>
                <p className={isAdult ? "text-xs text-white/45" : "text-xs text-muted-foreground"}>
                  Project, scene, reference media and transform settings were loaded through server-side ownership checks.
                </p>
              </div>
              <Badge variant="outline">
                {isAdult ? "Adult workspace" : "Standard workspace"}
              </Badge>
            </CardContent>
          </Card>
        )}

        <Card className={subtleCard}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound className="h-4 w-4 text-amber-400" />
              Provider, recording and retention status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {PROVIDERS.map((provider) => (
                <Badge
                  key={provider}
                  variant={providerStatus[provider] ? "default" : "outline"}
                >
                  {provider}: {providerStatus[provider] ? "ready" : "missing"}
                </Badge>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant={bridgeConfigured ? "default" : "destructive"}>
                Broadcast bridge: {bridgeConfigured ? "configured" : "not configured"}
              </Badge>
              <Badge variant="outline">Recording required</Badge>
              <Badge variant="outline">Private archive: minimum 90 days</Badge>
            </div>
            {!hasAnyProvider && (
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.05] p-3 text-sm">
                <p className={isAdult ? "text-white/60" : "text-muted-foreground"}>
                  Add your own funded video-provider key before Studio Render or AI-assisted Broadcast. Plain broadcasting does not need one.
                </p>
                <Button
                  className="mt-3"
                  size="sm"
                  onClick={() => { window.location.href = API_KEY_SETTINGS_URL; }}
                >
                  <KeyRound className="mr-2 h-4 w-4" />
                  Add provider key
                </Button>
              </div>
            )}
            <p className={isAdult ? "text-xs leading-relaxed text-white/45" : "text-xs leading-relaxed text-muted-foreground"}>
              Completed outputs remain downloadable by the account owner. Virelle separately maintains a private compliance copy that ordinary users cannot access or delete during the retention period.
            </p>
          </CardContent>
        </Card>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card className={subtleCard}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Video className="h-4 w-4 text-amber-400" />
                Source and reference media
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Project ID</Label>
                  <Input
                    value={projectId}
                    onChange={(event) => setProjectId(
                      event.target.value.replace(/[^0-9]/g, ""),
                    )}
                  />
                </div>
                <div>
                  <Label>Scene ID</Label>
                  <Input
                    value={sceneId}
                    onChange={(event) => setSceneId(
                      event.target.value.replace(/[^0-9]/g, ""),
                    )}
                  />
                </div>
              </div>

              <div>
                <Label>Source video URL</Label>
                <div className="flex gap-2">
                  <Input
                    className="flex-1"
                    placeholder="https://..."
                    value={sourceVideoUrl}
                    onChange={(event) => setSourceVideoUrl(event.target.value)}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={uploading === "sourceVideo"}
                    onClick={() => sourceVideoRef.current?.click()}
                  >
                    {uploading === "sourceVideo"
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Upload className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div>
                <Label>Reference video URL</Label>
                <div className="flex gap-2">
                  <Input
                    className="flex-1"
                    placeholder="https://..."
                    value={referenceVideoUrl}
                    onChange={(event) => setReferenceVideoUrl(event.target.value)}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={uploading === "referenceVideo"}
                    onClick={() => referenceVideoRef.current?.click()}
                  >
                    {uploading === "referenceVideo"
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Upload className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <Label>Source image URLs</Label>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => sourceImageRef.current?.click()}
                  >
                    <Upload className="mr-1 h-3 w-3" />
                    Upload
                  </Button>
                </div>
                <Textarea
                  className="min-h-20 text-xs"
                  value={sourceImageUrls}
                  onChange={(event) => setSourceImageUrls(event.target.value)}
                />
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <Label>Reference / output image URLs</Label>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => referenceImageRef.current?.click()}
                  >
                    <Upload className="mr-1 h-3 w-3" />
                    Upload
                  </Button>
                </div>
                <Textarea
                  className="min-h-20 text-xs"
                  value={referenceImageUrls}
                  onChange={(event) => setReferenceImageUrls(event.target.value)}
                />
              </div>

              <input
                ref={sourceImageRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(event) => uploadMedia(event.target.files, "sourceImage")}
              />
              <input
                ref={referenceImageRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(event) => uploadMedia(event.target.files, "referenceImage")}
              />
              <input
                ref={sourceVideoRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(event) => uploadMedia(event.target.files, "sourceVideo")}
              />
              <input
                ref={referenceVideoRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(event) => uploadMedia(event.target.files, "referenceVideo")}
              />
            </CardContent>
          </Card>

          <Card className={subtleCard}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="h-4 w-4 text-amber-400" />
                Transform and consent controls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Transform goal</Label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                  value={transformGoal}
                  onChange={(event) => setTransformGoal(
                    event.target.value as TransformGoal,
                  )}
                >
                  {transformOptions.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Target age</Label>
                  <Input
                    inputMode="numeric"
                    min={isAdult ? 18 : 1}
                    value={targetAge}
                    onChange={(event) => setTargetAge(
                      event.target.value.replace(/[^0-9]/g, ""),
                    )}
                  />
                </div>
                <div>
                  <Label>BYOK provider</Label>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                    value={requestedProvider}
                    onChange={(event) => setRequestedProvider(
                      event.target.value as Provider | "",
                    )}
                  >
                    <option value="">Auto-select</option>
                    {PROVIDERS.map((provider) => (
                      <option key={provider} value={provider}>{provider}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <Label>Target presentation / style</Label>
                <Input
                  value={targetPresentation}
                  onChange={(event) => setTargetPresentation(event.target.value)}
                />
              </div>

              <div>
                <Label>Director notes</Label>
                <Textarea
                  className="min-h-28"
                  value={directorNotes}
                  onChange={(event) => setDirectorNotes(event.target.value)}
                  placeholder="Describe the exact lawful transformation and production intent."
                />
              </div>

              <Attestation
                checked={aiGeneratedCharactersOnly}
                onChange={setAiGeneratedCharactersOnly}
              >
                Every depicted person is an original AI-generated character and is not based on a real person's likeness.
              </Attestation>

              {!aiGeneratedCharactersOnly && (
                <Attestation
                  checked={consentConfirmed}
                  onChange={setConsentConfirmed}
                >
                  I have valid likeness, media, distribution and broadcast consent from every real person shown in the uploaded or generated media.
                </Attestation>
              )}

              {isAdult && (
                <>
                  <Attestation
                    checked={allSubjectsAdultsConfirmed}
                    onChange={setAllSubjectsAdultsConfirmed}
                  >
                    Every depicted and referenced person is at least 18 years old. No minor, teenage or minor-looking character is included.
                  </Attestation>
                  <Attestation
                    checked={noPublicFigureConfirmed}
                    onChange={setNoPublicFigureConfirmed}
                  >
                    No celebrity, politician or other public-figure likeness is being used for adult content.
                  </Attestation>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card className={subtleCard}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Video className="h-4 w-4 text-amber-400" />
                {isAdult ? "Adult video generation" : "Studio video render"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className={isAdult ? "text-sm leading-relaxed text-white/55" : "text-sm leading-relaxed text-muted-foreground"}>
                Generate a downloadable video using your selected provider. A separate private compliance copy is registered automatically after completion.
              </p>
              <Button
                className="w-full bg-amber-300 text-black hover:bg-amber-200"
                disabled={!hasAnyProvider || createRender.isPending}
                onClick={submitRender}
              >
                {createRender.isPending
                  ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  : <Video className="mr-2 h-4 w-4" />}
                Generate video
              </Button>
            </CardContent>
          </Card>

          <Card className={subtleCard}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Radio className="h-4 w-4 text-amber-400" />
                Broadcast setup
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.05] p-4">
                <Label>Broadcast route</Label>
                <select
                  className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                  value={serviceMode}
                  onChange={(event) => setServiceMode(event.target.value as BroadcastServiceMode)}
                >
                  {!isAdult && <option value="direct">Direct OBS — free, no BYOK</option>}
                  <option value="managed">Managed relay — broadcast minutes, no BYOK</option>
                  <option value="ai_assisted">AI-assisted relay — broadcast minutes + BYOK</option>
                </select>
                <div className="mt-3 space-y-1 text-xs leading-relaxed text-white/50">
                  {serviceMode === "direct" && <p>OBS sends directly to the destination. Virelle does not receive, record or charge for the stream.</p>}
                  {serviceMode === "managed" && <p>Virelle relays and records the broadcast. No video generation occurs and no provider key is required.</p>}
                  {serviceMode === "ai_assisted" && <p>Virelle relays and records the broadcast while Swappys or another selected AI transformation runs through your funded provider key.</p>}
                </div>
              </div>

              {serviceMode !== "direct" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Reserved duration</Label>
                    <select
                      className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                      value={durationMinutes}
                      onChange={(event) => setDurationMinutes(Number(event.target.value) as 30 | 60 | 120)}
                    >
                      <option value={30}>30 minutes</option>
                      <option value={60}>60 minutes</option>
                      <option value={120}>120 minutes</option>
                    </select>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-black/10 p-3">
                    <div className="flex items-center gap-2 text-xs text-white/45"><Clock3 className="h-4 w-4" /> Minute balance</div>
                    <p className="mt-2 text-xl font-bold text-amber-300">
                      {unlimitedMinutes ? "Unlimited" : minuteBalance.toLocaleString()}
                    </p>
                    <p className="text-[11px] text-white/35">Managed minutes do not expire.</p>
                  </div>
                </div>
              )}

              {isAdult && serviceMode !== "direct" && (
                <div className="rounded-lg border border-white/10 bg-black/10 p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">Buy broadcast minutes</p>
                      <p className="text-xs text-white/40">One-time prepaid packs added immediately after Stripe confirms payment.</p>
                    </div>
                    <ShoppingCart className="h-4 w-4 text-amber-400" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {minutePackages.map((pack: any) => (
                      <Button
                        key={pack.id}
                        size="sm"
                        variant="outline"
                        disabled={createMinuteCheckout.isPending}
                        onClick={() => purchaseMinutePack(pack.id)}
                      >
                        {pack.minutes.toLocaleString()} min · A${pack.priceAud}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-lg border border-white/10 bg-black/10 p-3 text-xs leading-relaxed text-white/50">
                <p className="mb-2 font-semibold text-white/70">How to connect</p>
                <ol className="list-decimal space-y-1 pl-4">
                  <li>Open the destination's live or creator dashboard and copy its ingest URL and stream key.</li>
                  <li>Select the route above. Choose AI-assisted only when live Swappys or another transformation is required.</li>
                  <li>Add the output below, choose the planned duration and configure the session.</li>
                  <li>For direct mode, paste the same URL and key into OBS. Managed modes are recorded automatically.</li>
                </ol>
              </div>

              {channels.map((channel, index) => (
                <div key={`${channel.destination}-${index}`} className="space-y-2 rounded-lg border border-white/10 bg-black/10 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">Output {index + 1}</span>
                    {channels.length > 1 && (
                      <button type="button" className="text-xs text-red-400" onClick={() => setChannels((previous) => previous.filter((_, itemIndex) => itemIndex !== index))}>Remove</button>
                    )}
                  </div>
                  <div>
                    <Label>Destination</Label>
                    <select
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                      value={channel.destination}
                      onChange={(event) => {
                        const destination = event.target.value as BroadcastDestination;
                        setChannels((previous) => previous.map((item, itemIndex) => itemIndex === index ? { ...item, destination, ingestUrl: destinationDefaultUrl(destination) } : item));
                      }}
                    >
                      {destinations.map((destination) => <option key={destination} value={destination}>{destinationLabel(destination)}</option>)}
                    </select>
                  </div>
                  <div><Label>Ingest URL</Label><Input value={channel.ingestUrl} onChange={(event) => setChannels((previous) => previous.map((item, itemIndex) => itemIndex === index ? { ...item, ingestUrl: event.target.value } : item))} /></div>
                  <div><Label>Stream key</Label><Input type="password" autoComplete="off" value={channel.streamKey} onChange={(event) => setChannels((previous) => previous.map((item, itemIndex) => itemIndex === index ? { ...item, streamKey: event.target.value } : item))} /></div>
                </div>
              ))}

              {channels.length < 5 && (
                <Button size="sm" variant="outline" className="w-full" onClick={() => setChannels((previous) => [...previous, { destination: "rtmp", ingestUrl: "", streamKey: "" }])}>Add output</Button>
              )}

              <Button
                className="w-full"
                disabled={(needsByokForBroadcast && !hasAnyProvider) || createBroadcast.isPending || (serviceMode !== "direct" && !unlimitedMinutes && minuteBalance < durationMinutes)}
                onClick={submitBroadcast}
              >
                {createBroadcast.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Radio className="mr-2 h-4 w-4" />}
                {serviceMode === "direct" ? "Save direct OBS setup" : `Configure ${durationMinutes}-minute broadcast`}
              </Button>
              <p className={isAdult ? "text-xs leading-relaxed text-white/45" : "text-xs leading-relaxed text-muted-foreground"}>
                Adult Studio always uses the managed recording route. Standard direct OBS broadcasts bypass Virelle media infrastructure and do not consume minutes.
              </p>
            </CardContent>
          </Card>
        </div>


        <Card className={subtleCard}>
          <CardHeader>
            <CardTitle className="text-base">
              Recent {isAdult ? "Adult Studio" : "Standard Studio"} jobs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {jobs.isLoading && (
              <p className={isAdult ? "text-sm text-white/45" : "text-sm text-muted-foreground"}>
                Loading jobs…
              </p>
            )}
            {(jobs.data || []).map((job: any) => (
              <article
                key={job.id}
                className="rounded-xl border border-white/10 bg-black/10 p-4"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h3 className="font-medium">
                      #{job.id} · {String(job.mode).replaceAll("_", " ")} · {String(job.transformGoal).replaceAll("_", " ")}
                    </h3>
                    <p className={isAdult ? "mt-1 text-xs text-white/45" : "mt-1 text-xs text-muted-foreground"}>
                      Provider: {job.provider} · commenced {formatDate(job.broadcastStartedAt || job.createdAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={jobBadgeVariant(job.status)}>
                      {String(job.status).replaceAll("_", " ")}
                    </Badge>
                    {job.mode === "broadcast" && (
                      <Badge variant="outline">
                        {job.broadcastCompletedAt
                          ? "Recording completed"
                          : "Recording pending"}
                      </Badge>
                    )}
                  </div>
                </div>

                {job.errorMessage && (
                  <div className="mt-3 flex gap-2 rounded-lg border border-red-500/20 bg-red-500/[0.05] p-3 text-xs text-red-200">
                    <XCircle className="h-4 w-4 shrink-0" />
                    <span>{job.errorMessage}</span>
                  </div>
                )}

                {job.outputVideoUrl && (
                  <div className="mt-4 space-y-3">
                    <video
                      src={job.outputVideoUrl}
                      controls
                      className="w-full rounded-xl border border-white/10 bg-black"
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyText(
                          job.outputVideoUrl,
                          "Output URL copied.",
                        )}
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        Copy URL
                      </Button>
                      <Button size="sm" variant="outline" asChild>
                        <a
                          href={job.outputVideoUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Open
                        </a>
                      </Button>
                      <Button size="sm" variant="outline" asChild>
                        <a href={job.outputVideoUrl} download>
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </a>
                      </Button>
                    </div>
                  </div>
                )}

                {job.mode === "broadcast"
                  && job.status === "processing"
                  && !job.outputVideoUrl && (
                    <div className="mt-3 rounded-lg border border-amber-300/15 bg-amber-300/[0.035] p-3 text-sm text-white/55">
                      Broadcast active. The recording will appear automatically after the bridge sends the verified completion callback.
                    </div>
                  )}

                {["queued", "waiting_for_provider", "processing", "broadcast_ready"]
                  .includes(job.status) && (
                  <Button
                    className="mt-4"
                    size="sm"
                    variant="destructive"
                    onClick={() => cancel(Number(job.id))}
                  >
                    Cancel job
                  </Button>
                )}
              </article>
            ))}
            {!jobs.isLoading && !(jobs.data || []).length && (
              <div className="rounded-xl border border-dashed border-white/10 p-10 text-center text-sm text-muted-foreground">
                No jobs have been created in this workspace.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StudioPage() {
  const params = new URLSearchParams(window.location.search);
  const workspace: Workspace = params.get("adult") === "1"
    ? "adult"
    : "standard";
  return <StudioWorkspace workspace={workspace} />;
}

export default function VirelleBroadcastRender() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("adminVault") === "1") {
    return <ComplianceAdminVault />;
  }

  return (
    <SubscriptionGate
      feature="Virelle Broadcast & Studio Render"
      requiredTier="indie"
    >
      <StudioPage />
    </SubscriptionGate>
  );
}
