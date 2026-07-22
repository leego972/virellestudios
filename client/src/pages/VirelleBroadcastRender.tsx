import { useEffect, useMemo, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { SubscriptionGate } from "@/components/SubscriptionGate";
import {
  AlertTriangle,
  Archive,
  Ban,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  FileWarning,
  Gavel,
  KeyRound,
  Loader2,
  LockKeyhole,
  Radio,
  RadioTower,
  RefreshCcw,
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
type AdminTab = "profiles" | "archive" | "incidents" | "blacklist" | "access";

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
const API_KEY_SETTINGS_URL = "/settings?tab=api-keys&source=virelle-broadcast-render";

function parseUrls(value: string) {
  return value.split(/\n|,/).map((item) => item.trim()).filter(Boolean);
}

function copyText(value: string, label = "Copied") {
  navigator.clipboard?.writeText(value)
    .then(() => toast.success(label))
    .catch(() => toast.error("Could not copy"));
}

function statusVariant(status: string) {
  if (["failed", "cancelled", "rejected"].includes(status)) return "destructive" as const;
  if (["completed", "broadcast_ready", "approved", "archived"].includes(status)) return "default" as const;
  return "outline" as const;
}

function destinationDefaultUrl(destination: BroadcastDestination) {
  if (destination === "rtmp_onlyfans") return "rtmps://live.onlyfans.com/app/";
  if (destination === "rtmp_fansly") return "rtmps://live.fansly.com/live/";
  if (destination === "rtmp_chaturbate") return "rtmp://broadcast.chaturbate.com/live/";
  return "";
}

function formatDate(value: unknown) {
  if (!value) return "—";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

function AdultRegistration({ onSubmitted }: { onSubmitted: () => void }) {
  const submitProfile = (trpc as any).virelleBroadcastRender.adultProfile.submit.useMutation();
  const [form, setForm] = useState({
    legalFirstName: "",
    legalLastName: "",
    dateOfBirth: "",
    residentialAddress1: "",
    residentialAddress2: "",
    city: "",
    stateRegion: "",
    postalCode: "",
    country: "Australia",
    phone: "",
  });
  const [adultAttestationAccepted, setAdultAttestationAccepted] = useState(false);
  const [soleResponsibilityAccepted, setSoleResponsibilityAccepted] = useState(false);
  const [consentPolicyAccepted, setConsentPolicyAccepted] = useState(false);
  const [retentionPolicyAccepted, setRetentionPolicyAccepted] = useState(false);

  const update = (key: keyof typeof form, value: string) => {
    setForm((previous) => ({ ...previous, [key]: value }));
  };

  const submit = async () => {
    try {
      await submitProfile.mutateAsync({
        ...form,
        residentialAddress2: form.residentialAddress2 || null,
        adultAttestationAccepted,
        soleResponsibilityAccepted,
        consentPolicyAccepted,
        retentionPolicyAccepted,
      });
      toast.success("Adult Workspace profile submitted for administrator review.");
      onSubmitted();
    } catch (error: any) {
      toast.error(error?.message || "Could not submit Adult Workspace profile.");
    }
  };

  const allAccepted = adultAttestationAccepted
    && soleResponsibilityAccepted
    && consentPolicyAccepted
    && retentionPolicyAccepted;

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4 md:p-8">
      <Card className="border-fuchsia-500/30 bg-fuchsia-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LockKeyhole className="h-5 w-5 text-fuchsia-400" />
            Adult Workspace — Individual Registration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
            This profile must identify the individual operating the account, not a company.
            Adult tools remain locked until an administrator approves the profile.
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div><Label>Legal first name</Label><Input value={form.legalFirstName} onChange={(event) => update("legalFirstName", event.target.value)} /></div>
            <div><Label>Legal last name</Label><Input value={form.legalLastName} onChange={(event) => update("legalLastName", event.target.value)} /></div>
            <div><Label>Date of birth</Label><Input type="date" value={form.dateOfBirth} onChange={(event) => update("dateOfBirth", event.target.value)} /></div>
            <div><Label>Personal phone</Label><Input value={form.phone} onChange={(event) => update("phone", event.target.value)} /></div>
            <div className="md:col-span-2"><Label>Residential address</Label><Input value={form.residentialAddress1} onChange={(event) => update("residentialAddress1", event.target.value)} /></div>
            <div className="md:col-span-2"><Label>Address line 2</Label><Input value={form.residentialAddress2} onChange={(event) => update("residentialAddress2", event.target.value)} /></div>
            <div><Label>City</Label><Input value={form.city} onChange={(event) => update("city", event.target.value)} /></div>
            <div><Label>State / region</Label><Input value={form.stateRegion} onChange={(event) => update("stateRegion", event.target.value)} /></div>
            <div><Label>Postcode</Label><Input value={form.postalCode} onChange={(event) => update("postalCode", event.target.value)} /></div>
            <div><Label>Country</Label><Input value={form.country} onChange={(event) => update("country", event.target.value)} /></div>
          </div>

          <div className="space-y-3">
            <Attestation checked={adultAttestationAccepted} setChecked={setAdultAttestationAccepted}>
              I am at least 18 years old and the personal details above are accurate.
            </Attestation>
            <Attestation checked={soleResponsibilityAccepted} setChecked={setSoleResponsibilityAccepted}>
              I accept sole responsibility for images, videos and broadcasts generated or transmitted from my account.
            </Attestation>
            <Attestation checked={consentPolicyAccepted} setChecked={setConsentPolicyAccepted}>
              I will use real-person media only when every depicted person has provided valid consent and is an adult. I will not use public-figure likenesses for adult content.
            </Attestation>
            <Attestation checked={retentionPolicyAccepted} setChecked={setRetentionPolicyAccepted}>
              I understand Virelle keeps a private compliance copy of generated videos and recorded broadcasts for at least 90 days, or longer under lawful legal hold. The private copy is accessible only to authorised administrators.
            </Attestation>
          </div>

          <Button className="w-full bg-fuchsia-600 hover:bg-fuchsia-700" disabled={!allAccepted || submitProfile.isPending} onClick={submit}>
            {submitProfile.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserCheck className="mr-2 h-4 w-4" />}
            Submit for Approval
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Attestation({
  checked,
  setChecked,
  children,
}: {
  checked: boolean;
  setChecked: (value: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border p-3">
      <Checkbox checked={checked} onCheckedChange={(value) => setChecked(Boolean(value))} />
      <p className="text-sm text-muted-foreground">{children}</p>
    </div>
  );
}

function PendingAdultProfile({ profile }: { profile: any }) {
  return (
    <div className="mx-auto max-w-xl p-6 md:p-12">
      <Card className="border-amber-500/30 bg-amber-500/5 text-center">
        <CardHeader>
          <CardTitle className="flex items-center justify-center gap-2">
            <ShieldCheck className="h-6 w-6 text-amber-400" />
            Adult Workspace Review
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Badge variant={statusVariant(profile?.verificationStatus || "pending_review")}>
            {String(profile?.verificationStatus || "pending_review").replaceAll("_", " ")}
          </Badge>
          <p className="text-sm text-muted-foreground">
            Your individual profile was submitted on {formatDate(profile?.submittedAt)}.
            Adult generation and adult broadcasting remain locked until an administrator approves it.
          </p>
          {profile?.reviewNotes && <p className="rounded border p-3 text-sm">{profile.reviewNotes}</p>}
          <Button variant="outline" onClick={() => { window.location.href = "/projects"; }}>Return to Standard Studio</Button>
        </CardContent>
      </Card>
    </div>
  );
}

function AdminComplianceVault() {
  const user = (trpc as any).auth.me.useQuery();
  const isAdmin = Boolean(user.data?.role === "admin" || user.data?.isAdmin);
  const [tab, setTab] = useState<AdminTab>("profiles");
  const [reviewNotes, setReviewNotes] = useState<Record<number, string>>({});

  const profiles = (trpc as any).virelleBroadcastRender.adminCompliance.listAdultProfiles.useQuery(
    { limit: 200 },
    { enabled: isAdmin, retry: false },
  );
  const archive = (trpc as any).virelleBroadcastRender.adminCompliance.listArchive.useQuery(
    { workspace: "all", status: null, userId: null, limit: 250 },
    { enabled: isAdmin, retry: false },
  );
  const incidents = (trpc as any).virelleBroadcastRender.adminCompliance.listIncidents.useQuery(
    { status: "all", limit: 250 },
    { enabled: isAdmin, retry: false },
  );
  const blacklist = (trpc as any).virelleBroadcastRender.adminCompliance.listBlacklistedUsers.useQuery(
    { limit: 250 },
    { enabled: isAdmin, retry: false },
  );
  const accessLog = (trpc as any).virelleBroadcastRender.adminCompliance.listAccessLog.useQuery(
    { limit: 250 },
    { enabled: isAdmin, retry: false },
  );

  const reviewProfile = (trpc as any).virelleBroadcastRender.adminCompliance.reviewAdultProfile.useMutation();
  const getDownload = (trpc as any).virelleBroadcastRender.adminCompliance.getArchiveDownloadUrl.useMutation();
  const setHold = (trpc as any).virelleBroadcastRender.adminCompliance.setLegalHold.useMutation();
  const dismissIncident = (trpc as any).virelleBroadcastRender.adminCompliance.dismissIncident.useMutation();
  const confirmViolation = (trpc as any).virelleBroadcastRender.adminCompliance.confirmViolation.useMutation();

  const refreshAll = () => {
    profiles.refetch();
    archive.refetch();
    incidents.refetch();
    blacklist.refetch();
    accessLog.refetch();
  };

  if (user.isLoading) return <div className="p-10 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin" /></div>;
  if (!isAdmin) return <div className="p-10 text-center text-red-400">Administrator access required.</div>;

  const approveProfile = async (userId: number, decision: "approved" | "rejected") => {
    try {
      await reviewProfile.mutateAsync({
        userId,
        decision,
        notes: reviewNotes[userId] || null,
      });
      toast.success(`Profile ${decision}.`);
      profiles.refetch();
    } catch (error: any) {
      toast.error(error?.message || "Profile review failed.");
    }
  };

  const openPrivateArchive = async (archiveId: number) => {
    try {
      const result = await getDownload.mutateAsync({ archiveId });
      window.open(result.url, "_blank", "noopener,noreferrer");
    } catch (error: any) {
      toast.error(error?.message || "Private archive is unavailable.");
    }
  };

  const holdArchive = async (record: any) => {
    try {
      await setHold.mutateAsync({
        archiveId: Number(record.id),
        legalHold: !Boolean(record.legalHold),
        reason: record.legalHold ? null : "Administrator legal hold",
      });
      archive.refetch();
    } catch (error: any) {
      toast.error(error?.message || "Could not change legal hold.");
    }
  };

  const dismiss = async (incidentId: number) => {
    const notes = window.prompt("Reason for dismissing this incident:");
    if (!notes || notes.trim().length < 3) return;
    try {
      await dismissIncident.mutateAsync({ incidentId, notes });
      toast.success("Incident dismissed. No account action taken.");
      incidents.refetch();
    } catch (error: any) {
      toast.error(error?.message || "Could not dismiss incident.");
    }
  };

  const confirm = async (incidentId: number) => {
    const notes = window.prompt(
      "Describe the evidence establishing the confirmed serious violation. A request alone is not sufficient:",
    );
    if (!notes || notes.trim().length < 10) return;
    const phrase = window.prompt(
      'Type exactly: CONFIRM PERMANENT DEACTIVATION',
    );
    if (phrase !== "CONFIRM PERMANENT DEACTIVATION") {
      toast.error("Confirmation phrase did not match. No account action was taken.");
      return;
    }
    try {
      await confirmViolation.mutateAsync({
        incidentId,
        notes,
        confirmation: "CONFIRM PERMANENT DEACTIVATION",
      });
      toast.success("Violation confirmed. Account deactivated and evidence placed on legal hold.");
      incidents.refetch();
      blacklist.refetch();
      archive.refetch();
    } catch (error: any) {
      toast.error(error?.message || "Could not confirm violation.");
    }
  };

  const tabs: Array<[AdminTab, string, React.ReactNode]> = [
    ["profiles", "Adult Profiles", <UserCheck className="h-4 w-4" />],
    ["archive", "Compliance Archive", <Archive className="h-4 w-4" />],
    ["incidents", "Review Queue", <FileWarning className="h-4 w-4" />],
    ["blacklist", "Blacklisted Users", <Ban className="h-4 w-4" />],
    ["access", "Access Log", <Gavel className="h-4 w-4" />],
  ];

  return (
    <div className="min-h-screen bg-background p-4 md:p-7">
      <div className="mx-auto max-w-[1500px] space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold"><ShieldCheck className="h-6 w-6 text-amber-400" />Compliance & Evidence Vault</h1>
            <p className="text-sm text-muted-foreground">Administrator-only archive, review queue, legal holds and confirmed blacklisted users.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={refreshAll}><RefreshCcw className="mr-2 h-4 w-4" />Refresh</Button>
            <Button variant="outline" onClick={() => { window.location.href = "/admin"; }}>Admin Dashboard</Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {tabs.map(([key, label, icon]) => (
            <Button key={key} variant={tab === key ? "default" : "outline"} onClick={() => setTab(key)}>{icon}<span className="ml-2">{label}</span></Button>
          ))}
        </div>

        {tab === "profiles" && (
          <Card><CardHeader><CardTitle>Adult Workspace Profile Reviews</CardTitle></CardHeader><CardContent className="space-y-3">
            {(profiles.data || []).map((profile: any) => (
              <div key={profile.userId} className="rounded-lg border p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="font-medium">{profile.legalFirstName} {profile.legalLastName} · Account #{profile.userId}</div>
                    <div className="text-xs text-muted-foreground">{profile.email} · DOB {String(profile.dateOfBirth).slice(0, 10)} · {profile.phone}</div>
                    <div className="text-xs text-muted-foreground">{profile.residentialAddress1}{profile.residentialAddress2 ? `, ${profile.residentialAddress2}` : ""}, {profile.city}, {profile.stateRegion} {profile.postalCode}, {profile.country}</div>
                  </div>
                  <Badge variant={statusVariant(profile.verificationStatus)}>{String(profile.verificationStatus).replaceAll("_", " ")}</Badge>
                </div>
                <Textarea className="mt-3" placeholder="Review notes" value={reviewNotes[profile.userId] || ""} onChange={(event) => setReviewNotes((previous) => ({ ...previous, [profile.userId]: event.target.value }))} />
                <div className="mt-3 flex gap-2">
                  <Button size="sm" onClick={() => approveProfile(Number(profile.userId), "approved")}><CheckCircle2 className="mr-1 h-4 w-4" />Approve</Button>
                  <Button size="sm" variant="destructive" onClick={() => approveProfile(Number(profile.userId), "rejected")}><XCircle className="mr-1 h-4 w-4" />Reject</Button>
                </div>
              </div>
            ))}
            {!profiles.isLoading && !(profiles.data || []).length && <p className="text-sm text-muted-foreground">No profiles found.</p>}
          </CardContent></Card>
        )}

        {tab === "archive" && (
          <Card><CardHeader><CardTitle>Private 90-Day Compliance Archive</CardTitle></CardHeader><CardContent className="space-y-3">
            {(archive.data || []).map((record: any) => (
              <div key={record.id} className="rounded-lg border p-4">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="font-medium">#{record.id} · {record.accountName} · {record.mediaKind}</div>
                    <div className="text-xs text-muted-foreground">Account #{record.userId} · {record.email} · {record.workspace} · {record.sourceType} #{record.sourceId}</div>
                    <div className="text-xs text-muted-foreground">Commenced: {formatDate(record.startedAt)} · Retain until: {formatDate(record.retainedUntil)}</div>
                    {record.archiveError && <p className="mt-2 text-xs text-red-400">{record.archiveError}</p>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={statusVariant(record.archiveStatus)}>{record.archiveStatus}</Badge>
                    {record.legalHold && <Badge variant="destructive">legal hold</Badge>}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" disabled={record.archiveStatus !== "archived"} onClick={() => openPrivateArchive(Number(record.id))}><Download className="mr-1 h-4 w-4" />Admin Download</Button>
                  <Button size="sm" variant="outline" onClick={() => holdArchive(record)}><Gavel className="mr-1 h-4 w-4" />{record.legalHold ? "Remove Hold" : "Legal Hold"}</Button>
                </div>
              </div>
            ))}
          </CardContent></Card>
        )}

        {tab === "incidents" && (
          <Card><CardHeader><CardTitle>Blocked Requests Pending Human Review</CardTitle></CardHeader><CardContent className="space-y-3">
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">A blocked request does not deactivate an account. Confirm permanent action only when the evidence proves a serious violation.</div>
            {(incidents.data || []).map((incident: any) => (
              <div key={incident.id} className="rounded-lg border p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="font-medium">Incident #{incident.id} · {incident.category}</div>
                    <div className="text-xs text-muted-foreground">{incident.accountName || incident.email} · Account #{incident.userId} · {incident.workspace} · {formatDate(incident.createdAt)}</div>
                  </div>
                  <Badge variant={statusVariant(incident.status)}>{String(incident.status).replaceAll("_", " ")}</Badge>
                </div>
                {incident.requestSummary && <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap rounded border bg-muted/20 p-3 text-xs">{incident.requestSummary}</pre>}
                {incident.status === "blocked_pending_review" && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => dismiss(Number(incident.id))}><CheckCircle2 className="mr-1 h-4 w-4" />Dismiss / Allow</Button>
                    <Button size="sm" variant="destructive" onClick={() => confirm(Number(incident.id))}><Ban className="mr-1 h-4 w-4" />Confirm Serious Violation</Button>
                  </div>
                )}
              </div>
            ))}
          </CardContent></Card>
        )}

        {tab === "blacklist" && (
          <Card className="border-red-500/25"><CardHeader><CardTitle className="flex items-center gap-2 text-red-300"><Ban className="h-5 w-5" />Blacklisted Users</CardTitle></CardHeader><CardContent className="space-y-3">
            {(blacklist.data || []).map((record: any) => (
              <div key={record.id} className="rounded-lg border border-red-500/25 bg-red-500/5 p-4">
                <div className="font-medium">{record.accountName || record.email} · Account #{record.userId}</div>
                <div className="text-xs text-muted-foreground">{record.email} · {record.phone || "no phone"} · {record.city || ""} {record.country || ""}</div>
                <div className="mt-2 text-sm text-red-300">{record.reasonCode} · Incident #{record.incidentId}</div>
                <div className="text-xs text-muted-foreground">Deactivated: {formatDate(record.blacklistedAt)} · Evidence source: {record.sourceType} #{record.sourceId || "—"}</div>
                {record.reviewNotes && <p className="mt-2 rounded border p-3 text-sm">{record.reviewNotes}</p>}
              </div>
            ))}
            {!blacklist.isLoading && !(blacklist.data || []).length && <p className="text-sm text-muted-foreground">No confirmed blacklisted users.</p>}
          </CardContent></Card>
        )}

        {tab === "access" && (
          <Card><CardHeader><CardTitle>Administrator Evidence Access Log</CardTitle></CardHeader><CardContent className="space-y-2">
            {(accessLog.data || []).map((entry: any) => (
              <div key={entry.id} className="rounded border p-3 text-sm">
                <div className="font-medium">{entry.action}</div>
                <div className="text-xs text-muted-foreground">{entry.adminEmail || entry.adminName} · {formatDate(entry.createdAt)} · Archive {entry.archiveId || "—"} · Incident {entry.incidentId || "—"}</div>
              </div>
            ))}
          </CardContent></Card>
        )}
      </div>
    </div>
  );
}

function WorkspaceTool({ workspace }: { workspace: Workspace }) {
  const isAdult = workspace === "adult";
  const user = (trpc as any).auth.me.useQuery();
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
  const handoff = (trpc as any).virelleBroadcastRender.getSwappysHandoff.useQuery(
    initialSwappysJobId
      ? { swappysJobId: initialSwappysJobId }
      : { sceneId: Number(queryParams.get("sceneId") || "0") || undefined },
    { enabled: Boolean(initialSwappysJobId || queryParams.get("sceneId")), retry: false },
  );

  const sourceImageRef = useRef<HTMLInputElement>(null);
  const referenceImageRef = useRef<HTMLInputElement>(null);
  const [sourceSwappysJobId, setSourceSwappysJobId] = useState<number | null>(initialSwappysJobId);
  const [projectId, setProjectId] = useState("");
  const [sceneId, setSceneId] = useState("");
  const [sourceVideoUrl, setSourceVideoUrl] = useState("");
  const [referenceVideoUrl, setReferenceVideoUrl] = useState("");
  const [sourceImageUrls, setSourceImageUrls] = useState("");
  const [referenceImageUrls, setReferenceImageUrls] = useState("");
  const [transformGoal, setTransformGoal] = useState<TransformGoal>("appearance_reference");
  const [targetAge, setTargetAge] = useState(isAdult ? "18" : "");
  const [targetPresentation, setTargetPresentation] = useState("");
  const [requestedProvider, setRequestedProvider] = useState<Provider | "">("");
  const [directorNotes, setDirectorNotes] = useState("");
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [allSubjectsAdultsConfirmed, setAllSubjectsAdultsConfirmed] = useState(false);
  const [noPublicFigureConfirmed, setNoPublicFigureConfirmed] = useState(false);
  const [aiGeneratedCharactersOnly, setAiGeneratedCharactersOnly] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [channels, setChannels] = useState<BroadcastChannel[]>([
    { destination: "rtmp", ingestUrl: "", streamKey: "" },
  ]);
  const [recordingUrls, setRecordingUrls] = useState<Record<number, string>>({});

  useEffect(() => {
    const data = handoff.data;
    if (!data) return;
    const handoffAdult = data.contentMode === "open_adult";
    if (handoffAdult !== isAdult) {
      toast.error(`This Swappys job belongs to the ${handoffAdult ? "Adult" : "Standard"} workspace.`);
      return;
    }
    setSourceSwappysJobId(Number(data.id));
    setProjectId(String(data.projectId || ""));
    setSceneId(String(data.sceneId || ""));
    if (data.sourcePlateUrl) setSourceImageUrls(String(data.sourcePlateUrl));
    const references = [data.enhancedImageUrl, data.actorReferenceUrl].filter(Boolean);
    if (references.length) setReferenceImageUrls(references.join("\n"));
    setTransformGoal(data.transformGoal || "appearance_reference");
    setTargetAge(data.targetAge ? String(data.targetAge) : isAdult ? "18" : "");
    setTargetPresentation(data.targetPresentation || "");
    setConsentConfirmed(Boolean(data.consentConfirmed));
    setAllSubjectsAdultsConfirmed(isAdult);
    toast.success(`Swappys job #${data.id} loaded.`);
  }, [handoff.data, isAdult]);

  const providerStatus = byokStatus.data?.providers || {};
  const hasAnyProvider = Boolean(byokStatus.data?.hasAnyProvider);
  const bridgeConfigured = Boolean(byokStatus.data?.bridgeConfigured);

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
    consentConfirmed,
    contentMode: isAdult ? "open_adult" : "standard",
    allSubjectsAdultsConfirmed: isAdult ? allSubjectsAdultsConfirmed : false,
    publicFigureLikeness: false,
    aiGeneratedCharactersOnly,
    hideVisibleWatermark: true,
  }), [
    projectId, sceneId, sourceSwappysJobId, sourceVideoUrl, referenceVideoUrl,
    sourceImageUrls, referenceImageUrls, transformGoal, targetAge,
    targetPresentation, requestedProvider, directorNotes, consentConfirmed,
    isAdult, allSubjectsAdultsConfirmed, aiGeneratedCharactersOnly,
  ]);

  const validatePolicy = (broadcast: boolean) => {
    if (!consentConfirmed && !aiGeneratedCharactersOnly) {
      toast.error("Confirm likeness, media and distribution rights, or confirm that all characters are AI-generated.");
      return false;
    }
    if (isAdult) {
      if (!allSubjectsAdultsConfirmed) {
        toast.error("Confirm that every depicted and referenced person is 18 or older.");
        return false;
      }
      if (!noPublicFigureConfirmed) {
        toast.error("Confirm that no public-figure likeness is being used.");
        return false;
      }
      if (["adult_to_child", "child_to_adult"].includes(transformGoal)) {
        toast.error("Child or age-crossing transforms are unavailable in the Adult Workspace.");
        return false;
      }
      if (!targetAge.trim() || Number(targetAge) < 18) {
        toast.error("Adult Workspace target age must be 18 or older.");
        return false;
      }
    }
    if (broadcast) {
      const minimum = isAdult ? 18 : 16;
      if (transformGoal === "adult_to_child") {
        toast.error("Child-transform avatars are not permitted in live Broadcast.");
        return false;
      }
      if (targetAge.trim() && Number(targetAge) < minimum) {
        toast.error(`Broadcast avatar target age must be ${minimum} or older.`);
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
      toast.success(
        result.bridgeConfigured
          ? `Broadcast session #${result.sessionId} submitted. Recording is mandatory.`
          : `Broadcast session #${result.sessionId} saved; bridge configuration is still required.`,
      );
      jobs.refetch();
    } catch (error: any) {
      toast.error(error?.message || "Could not create Broadcast session");
    }
  };

  const finishBroadcast = async (id: number) => {
    const recordingUrl = recordingUrls[id]?.trim();
    if (!recordingUrl) return toast.error("Paste the completed recording URL.");
    try {
      await completeBroadcast.mutateAsync({ id, recordingUrl });
      toast.success("Broadcast completed. Recording is available to you and queued for private compliance archiving.");
      jobs.refetch();
    } catch (error: any) {
      toast.error(error?.message || "Could not complete broadcast session.");
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

  const uploadImages = async (files: FileList | null, kind: "source" | "reference") => {
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
      if (kind === "source") setSourceImageUrls((previous) => previous ? `${previous}\n${urls.join("\n")}` : urls.join("\n"));
      else setReferenceImageUrls((previous) => previous ? `${previous}\n${urls.join("\n")}` : urls.join("\n"));
    } catch (error: any) {
      toast.error(error?.message || "Image upload failed.");
    } finally {
      setUploading(null);
    }
  };

  const transformOptions: Array<[TransformGoal, string]> = isAdult
    ? [
        ["appearance_reference", "Appearance reference"],
        ["boy_to_girl", "Feminine presentation"],
        ["girl_to_boy", "Masculine presentation"],
        ["younger_self", "Younger adult self (18+ only)"],
        ["older_self", "Older self"],
        ["custom_prompt", "Custom adult-film direction"],
      ]
    : [
        ["appearance_reference", "Appearance reference"],
        ["boy_to_girl", "Feminine presentation"],
        ["girl_to_boy", "Masculine presentation"],
        ["younger_self", "Younger self"],
        ["older_self", "Older self"],
        ["adult_to_child", "Childhood self"],
        ["child_to_adult", "Child to adult progression"],
        ["custom_prompt", "Custom prompt"],
      ];

  return (
    <div className={`min-h-screen p-4 md:p-6 ${isAdult ? "bg-gradient-to-br from-black via-fuchsia-950/30 to-black" : "bg-background"}`}>
      <div className="mx-auto max-w-6xl space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold">
              {isAdult ? <LockKeyhole className="h-6 w-6 text-fuchsia-400" /> : <RadioTower className="h-6 w-6 text-amber-400" />}
              {isAdult ? "Virelle Adult Workspace" : "Virelle Broadcast & Studio Render"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isAdult
                ? "Approved 18+ workspace. Minors, minor-looking characters, public-figure sexualisation and non-consensual use are prohibited."
                : "Standard non-explicit Swappys, video rendering and recorded broadcasting."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => { window.location.href = isAdult ? "/projects" : "/virelle-broadcast-render?workspace=adult"; }}>
              {isAdult ? "Standard Studio" : "Adult 18+"}
            </Button>
            <Button variant="outline" onClick={() => { byokStatus.refetch(); jobs.refetch(); handoff.refetch(); }}><RefreshCcw className="mr-2 h-4 w-4" />Refresh</Button>
          </div>
        </div>

        <Card className={isAdult ? "border-fuchsia-500/30 bg-fuchsia-500/5" : "border-amber-500/20"}>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><KeyRound className="h-4 w-4" />Provider, Recording & Archive Status</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">{PROVIDERS.map((provider) => <Badge key={provider} variant={providerStatus[provider] ? "default" : "outline"}>{provider}: {providerStatus[provider] ? "ready" : "missing"}</Badge>)}</div>
            <div className="flex flex-wrap gap-2"><Badge variant={bridgeConfigured ? "default" : "destructive"}>Broadcast bridge: {bridgeConfigured ? "configured" : "not configured"}</Badge><Badge variant="outline">Recording: mandatory</Badge><Badge variant="outline">Private archive: 90+ days</Badge></div>
            {!hasAnyProvider && <Button size="sm" onClick={() => { window.location.href = API_KEY_SETTINGS_URL; }}><KeyRound className="mr-2 h-4 w-4" />Add Provider Key</Button>}
            <p className="text-xs text-muted-foreground">Your output remains downloadable by you. A separate private compliance copy is created for authorised administrators and cannot be deleted by the user during retention.</p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Video className="h-4 w-4" />Source & Reference Media</CardTitle></CardHeader><CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3"><div><Label>Project ID</Label><Input value={projectId} onChange={(event) => setProjectId(event.target.value.replace(/[^0-9]/g, ""))} /></div><div><Label>Scene ID</Label><Input value={sceneId} onChange={(event) => setSceneId(event.target.value.replace(/[^0-9]/g, ""))} /></div></div>
            <div><Label>Source video URL</Label><Input placeholder="https://..." value={sourceVideoUrl} onChange={(event) => setSourceVideoUrl(event.target.value)} /></div>
            <div><Label>Reference video URL</Label><Input placeholder="https://..." value={referenceVideoUrl} onChange={(event) => setReferenceVideoUrl(event.target.value)} /></div>
            <div><div className="mb-1 flex items-center justify-between"><Label>Source image URLs</Label><Button size="sm" variant="outline" onClick={() => sourceImageRef.current?.click()}><Upload className="mr-1 h-3 w-3" />Upload</Button></div><Textarea className="min-h-20 text-xs" value={sourceImageUrls} onChange={(event) => setSourceImageUrls(event.target.value)} /></div>
            <div><div className="mb-1 flex items-center justify-between"><Label>Reference image URLs</Label><Button size="sm" variant="outline" onClick={() => referenceImageRef.current?.click()}><Upload className="mr-1 h-3 w-3" />Upload</Button></div><Textarea className="min-h-20 text-xs" value={referenceImageUrls} onChange={(event) => setReferenceImageUrls(event.target.value)} /></div>
            <input ref={sourceImageRef} type="file" accept="image/*" multiple className="hidden" onChange={(event) => uploadImages(event.target.files, "source")} />
            <input ref={referenceImageRef} type="file" accept="image/*" multiple className="hidden" onChange={(event) => uploadImages(event.target.files, "reference")} />
            {uploading && <p className="text-xs text-muted-foreground"><Loader2 className="mr-1 inline h-3 w-3 animate-spin" />Uploading images…</p>}
          </CardContent></Card>

          <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-4 w-4" />Transform & Consent Controls</CardTitle></CardHeader><CardContent className="space-y-3">
            <div><Label>Transform goal</Label><select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={transformGoal} onChange={(event) => setTransformGoal(event.target.value as TransformGoal)}>{transformOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
            <div className="grid grid-cols-2 gap-3"><div><Label>Target age</Label><Input min={isAdult ? 18 : 1} value={targetAge} onChange={(event) => setTargetAge(event.target.value.replace(/[^0-9]/g, ""))} /></div><div><Label>BYOK provider</Label><select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={requestedProvider} onChange={(event) => setRequestedProvider(event.target.value as Provider | "")}><option value="">Auto</option>{PROVIDERS.map((provider) => <option key={provider} value={provider}>{provider}</option>)}</select></div></div>
            <div><Label>Target presentation / style</Label><Input value={targetPresentation} onChange={(event) => setTargetPresentation(event.target.value)} /></div>
            <div><Label>Director notes</Label><Textarea className="min-h-28" value={directorNotes} onChange={(event) => setDirectorNotes(event.target.value)} /></div>
            <Attestation checked={aiGeneratedCharactersOnly} setChecked={setAiGeneratedCharactersOnly}>All depicted people are original AI-generated characters and are not based on a real person's likeness.</Attestation>
            {!aiGeneratedCharactersOnly && <Attestation checked={consentConfirmed} setChecked={setConsentConfirmed}>I obtained valid likeness, media, distribution and broadcast consent from every real person shown.</Attestation>}
            {isAdult && <>
              <Attestation checked={allSubjectsAdultsConfirmed} setChecked={setAllSubjectsAdultsConfirmed}>Every depicted or referenced person is 18 or older. No minor or minor-looking character is included.</Attestation>
              <Attestation checked={noPublicFigureConfirmed} setChecked={setNoPublicFigureConfirmed}>No celebrity, politician or other public-figure likeness is being used for adult content.</Attestation>
            </>}
          </CardContent></Card>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card className="border-blue-500/20"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Radio className="h-4 w-4 text-blue-400" />Recorded Broadcast Outputs</CardTitle></CardHeader><CardContent className="space-y-3">
            {channels.map((channel, index) => <div key={index} className="space-y-2 rounded-md border p-3"><div className="flex items-center justify-between"><span className="text-xs font-medium">Output {index + 1}</span>{channels.length > 1 && <button className="text-xs text-red-400" onClick={() => setChannels((previous) => previous.filter((_, itemIndex) => itemIndex !== index))}>Remove</button>}</div><div><Label>Destination</Label><select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={channel.destination} onChange={(event) => { const destination = event.target.value as BroadcastDestination; setChannels((previous) => previous.map((item, itemIndex) => itemIndex === index ? { ...item, destination, ingestUrl: destinationDefaultUrl(destination) } : item)); }}><option value="rtmp">RTMP custom</option><option value="rtmp_onlyfans">OnlyFans</option><option value="rtmp_fansly">Fansly</option><option value="rtmp_chaturbate">Chaturbate</option><option value="webrtc">WebRTC</option><option value="obs">OBS bridge</option><option value="custom">Custom engine</option></select></div><div><Label>Ingest URL</Label><Input value={channel.ingestUrl} onChange={(event) => setChannels((previous) => previous.map((item, itemIndex) => itemIndex === index ? { ...item, ingestUrl: event.target.value } : item))} /></div><div><Label>Stream key</Label><Input type="password" autoComplete="off" value={channel.streamKey} onChange={(event) => setChannels((previous) => previous.map((item, itemIndex) => itemIndex === index ? { ...item, streamKey: event.target.value } : item))} /></div></div>)}
            {channels.length < 5 && <Button size="sm" variant="outline" className="w-full" onClick={() => setChannels((previous) => [...previous, { destination: "rtmp", ingestUrl: "", streamKey: "" }])}>+ Add Output</Button>}
            <Button className="w-full" onClick={submitBroadcast} disabled={createBroadcast.isPending || !hasAnyProvider}>{createBroadcast.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Radio className="mr-2 h-4 w-4" />}Configure Recorded Broadcast</Button>
            <p className="text-xs text-muted-foreground">The broadcast bridge must record the session. When finished, the recording is downloadable by you and copied to the private compliance archive.</p>
          </CardContent></Card>

          <Card className={isAdult ? "border-fuchsia-500/25" : "border-amber-500/20"}><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Video className="h-4 w-4" />{isAdult ? "Adult Video Generation Pipeline" : "Studio Video Render"}</CardTitle></CardHeader><CardContent className="space-y-3"><p className="text-sm text-muted-foreground">Create a downloadable BYOK video render. Completed outputs are automatically registered for private 90-day compliance archiving.</p><Button className={`w-full ${isAdult ? "bg-fuchsia-600 hover:bg-fuchsia-700" : "bg-amber-500 text-black hover:bg-amber-600"}`} onClick={submitStudioRender} disabled={createRender.isPending || !hasAnyProvider}>{createRender.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Video className="mr-2 h-4 w-4" />}Generate Video</Button></CardContent></Card>
        </div>

        <Card><CardHeader><CardTitle className="text-base">Recent {isAdult ? "Adult" : "Standard"} Jobs</CardTitle></CardHeader><CardContent className="space-y-3">
          {jobs.isLoading && <p className="text-sm text-muted-foreground">Loading jobs…</p>}
          {(jobs.data || []).map((job: any) => <div key={job.id} className="space-y-3 rounded-lg border p-3 text-sm"><div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between"><div><div className="font-medium">#{job.id} · {job.mode} · {job.transformGoal}</div><div className="text-xs text-muted-foreground">Provider: {job.provider} · Commenced: {formatDate(job.broadcastStartedAt || job.createdAt)} · Recording: {job.recordingRequired ? "required" : "n/a"}</div></div><Badge variant={statusVariant(job.status)}>{job.status}</Badge></div>{job.errorMessage && <div className="flex gap-2 rounded-md border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-200"><XCircle className="h-4 w-4 shrink-0" /><span>{job.errorMessage}</span></div>}{job.outputVideoUrl && <div className="space-y-2"><video src={job.outputVideoUrl} controls className="w-full rounded-lg border" /><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => copyText(job.outputVideoUrl, "Output URL copied")}><Copy className="mr-1 h-3 w-3" />Copy URL</Button><Button size="sm" variant="outline" asChild><a href={job.outputVideoUrl} target="_blank" rel="noreferrer"><ExternalLink className="mr-1 h-3 w-3" />Open</a></Button><Button size="sm" variant="outline" asChild><a href={job.outputVideoUrl} download><Download className="mr-1 h-3 w-3" />Download</a></Button></div></div>}{job.mode === "broadcast" && ["processing", "broadcast_ready"].includes(job.status) && !job.broadcastCompletedAt && <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3"><Label>Completed recording URL</Label><div className="mt-2 flex flex-col gap-2 md:flex-row"><Input placeholder="https://.../recording.mp4" value={recordingUrls[job.id] || ""} onChange={(event) => setRecordingUrls((previous) => ({ ...previous, [job.id]: event.target.value }))} /><Button onClick={() => finishBroadcast(Number(job.id))}>Finish & Save Recording</Button></div></div>}{["queued", "waiting_for_provider", "processing", "broadcast_ready"].includes(job.status) && <Button size="sm" variant="destructive" onClick={() => cancel(Number(job.id))}>Cancel</Button>}</div>)}
          {!jobs.isLoading && !(jobs.data || []).length && <p className="text-sm text-muted-foreground">No jobs in this workspace.</p>}
        </CardContent></Card>
      </div>
    </div>
  );
}

function Inner() {
  const params = new URLSearchParams(window.location.search);
  const adminVault = params.get("adminVault") === "1";
  const workspace: Workspace = params.get("workspace") === "adult" ? "adult" : "standard";
  const adultProfile = (trpc as any).virelleBroadcastRender.adultProfile.get.useQuery(undefined, {
    enabled: workspace === "adult" && !adminVault,
    retry: false,
  });

  if (adminVault) return <AdminComplianceVault />;
  if (workspace === "adult") {
    if (adultProfile.isLoading) return <div className="p-12 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin" /></div>;
    if (!adultProfile.data?.profile || adultProfile.data?.profile?.verificationStatus === "rejected") {
      return <AdultRegistration onSubmitted={() => adultProfile.refetch()} />;
    }
    if (!adultProfile.data?.approved) {
      return <PendingAdultProfile profile={adultProfile.data.profile} />;
    }
  }

  return <WorkspaceTool workspace={workspace} />;
}

export default function VirelleBroadcastRender() {
  return (
    <SubscriptionGate
      feature="Virelle Broadcast & Studio Render"
      featureKey="canUseVisualEffects"
      requiredTier="amateur"
    >
      <Inner />
    </SubscriptionGate>
  );
}
