import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Archive,
  Ban,
  CheckCircle2,
  Download,
  FileWarning,
  Gavel,
  Loader2,
  RefreshCcw,
  ShieldCheck,
  UserCheck,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

type Tab = "profiles" | "archive" | "incidents" | "blacklist" | "access";

function formatDate(value: unknown) {
  if (!value) return "—";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

function statusVariant(status: string) {
  if (["failed", "copy_failed", "rejected", "confirmed_violation"].includes(status)) {
    return "destructive" as const;
  }
  if (["archived", "verified", "approved", "dismissed"].includes(status)) {
    return "default" as const;
  }
  return "outline" as const;
}

export default function AdminComplianceVault() {
  const user = (trpc as any).auth.me.useQuery();
  const isAdmin = Boolean(user.data?.role === "admin" || user.data?.isAdmin);
  const [tab, setTab] = useState<Tab>("archive");

  const profiles = (trpc as any).virelleBroadcastRender.adminCompliance.listMatureProfiles.useQuery(
    { limit: 250 },
    { enabled: isAdmin, retry: false },
  );
  const archive = (trpc as any).virelleBroadcastRender.adminCompliance.listArchive.useQuery(
    { workspace: "all", status: null, userId: null, limit: 300 },
    { enabled: isAdmin, retry: false },
  );
  const incidents = (trpc as any).virelleBroadcastRender.adminCompliance.listIncidents.useQuery(
    { status: "all", limit: 300 },
    { enabled: isAdmin, retry: false },
  );
  const blacklist = (trpc as any).virelleBroadcastRender.adminCompliance.listBlacklistedUsers.useQuery(
    { limit: 300 },
    { enabled: isAdmin, retry: false },
  );
  const access = (trpc as any).virelleBroadcastRender.adminCompliance.listAccessLog.useQuery(
    { limit: 300 },
    { enabled: isAdmin, retry: false },
  );

  const getDownload = (trpc as any).virelleBroadcastRender.adminCompliance.getArchiveDownloadUrl.useMutation();
  const setHold = (trpc as any).virelleBroadcastRender.adminCompliance.setLegalHold.useMutation();
  const dismissIncident = (trpc as any).virelleBroadcastRender.adminCompliance.dismissIncident.useMutation();
  const confirmViolation = (trpc as any).virelleBroadcastRender.adminCompliance.confirmViolation.useMutation();

  if (user.isLoading) {
    return <div className="p-12 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin" /></div>;
  }
  if (!isAdmin) {
    return <div className="p-12 text-center text-red-400">Administrator access required.</div>;
  }

  const refresh = () => {
    profiles.refetch();
    archive.refetch();
    incidents.refetch();
    blacklist.refetch();
    access.refetch();
  };

  const openArchive = async (archiveId: number) => {
    try {
      const result = await getDownload.mutateAsync({ archiveId });
      window.open(result.url, "_blank", "noopener,noreferrer");
    } catch (error: any) {
      toast.error(error?.message || "Private archive copy is unavailable.");
    }
  };

  const toggleHold = async (record: any) => {
    try {
      await setHold.mutateAsync({
        archiveId: Number(record.id),
        legalHold: !Boolean(record.legalHold),
        reason: record.legalHold ? null : "Administrator legal hold",
      });
      archive.refetch();
    } catch (error: any) {
      toast.error(error?.message || "Could not update legal hold.");
    }
  };

  const dismiss = async (incidentId: number) => {
    const notes = window.prompt("Reason for dismissing this incident:");
    if (!notes || notes.trim().length < 3) return;
    try {
      await dismissIncident.mutateAsync({ incidentId, notes });
      toast.success("Incident dismissed. No account action was taken.");
      incidents.refetch();
    } catch (error: any) {
      toast.error(error?.message || "Could not dismiss incident.");
    }
  };

  const confirm = async (incidentId: number) => {
    const notes = window.prompt(
      "Describe the evidence proving the serious violation. A request alone is not sufficient:",
    );
    if (!notes || notes.trim().length < 10) return;
    const phrase = window.prompt("Type exactly: CONFIRM PERMANENT DEACTIVATION");
    if (phrase !== "CONFIRM PERMANENT DEACTIVATION") {
      toast.error("Confirmation did not match. No account action was taken.");
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
      toast.error(error?.message || "Could not confirm the violation.");
    }
  };

  const tabs: Array<[Tab, string, React.ReactNode]> = [
    ["profiles", "Verified 18+ Profiles", <UserCheck className="h-4 w-4" />],
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
            <h1 className="flex items-center gap-2 text-2xl font-semibold">
              <ShieldCheck className="h-6 w-6 text-amber-400" />
              Compliance & Evidence Vault
            </h1>
            <p className="text-sm text-muted-foreground">
              Administrator-only private archives, human review, legal holds and confirmed blacklisted users.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={refresh}><RefreshCcw className="mr-2 h-4 w-4" />Refresh</Button>
            <Button variant="outline" onClick={() => { window.location.href = "/admin"; }}>Admin Dashboard</Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {tabs.map(([key, label, icon]) => (
            <Button key={key} variant={tab === key ? "default" : "outline"} onClick={() => setTab(key)}>
              {icon}<span className="ml-2">{label}</span>
            </Button>
          ))}
        </div>

        {tab === "profiles" && (
          <Card>
            <CardHeader><CardTitle>Paid Mature-Access Verification Records</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {(profiles.data || []).map((profile: any) => (
                <div key={profile.userId} className="rounded-lg border p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="font-medium">{profile.fullName} · Account #{profile.userId}</div>
                      <div className="text-xs text-muted-foreground">{profile.accountEmail} · {profile.phone} · DOB {String(profile.dateOfBirth || "").slice(0, 10)}</div>
                      <div className="text-xs text-muted-foreground">{profile.addressLine1}, {profile.city}, {profile.stateRegion} {profile.postcode}, {profile.country}</div>
                      <div className="mt-1 text-xs text-muted-foreground">Phone 2FA: {profile.phoneVerifiedAt ? "verified" : "pending"} · ID: {profile.identityVerifiedAt ? "verified" : "pending"} · Card name: {profile.cardNameMatched ? "matched" : "pending"}</div>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={profile.isAdultVerified ? "default" : "outline"}>{profile.isAdultVerified ? "18+ access active" : profile.accessStatus || "pending"}</Badge>
                      {profile.isFrozen && <Badge variant="destructive">deactivated</Badge>}
                    </div>
                  </div>
                </div>
              ))}
              {!profiles.isLoading && !(profiles.data || []).length && <p className="text-sm text-muted-foreground">No mature-access profiles found.</p>}
            </CardContent>
          </Card>
        )}

        {tab === "archive" && (
          <Card>
            <CardHeader><CardTitle>Private 90-Day Compliance Archive</CardTitle></CardHeader>
            <CardContent className="space-y-3">
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
                    <Button size="sm" variant="outline" disabled={record.archiveStatus !== "archived"} onClick={() => openArchive(Number(record.id))}>
                      <Download className="mr-1 h-4 w-4" />Admin Download
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => toggleHold(record)}>
                      <Gavel className="mr-1 h-4 w-4" />{record.legalHold ? "Remove Hold" : "Legal Hold"}
                    </Button>
                  </div>
                </div>
              ))}
              {!archive.isLoading && !(archive.data || []).length && <p className="text-sm text-muted-foreground">No archived video records found yet.</p>}
            </CardContent>
          </Card>
        )}

        {tab === "incidents" && (
          <Card>
            <CardHeader><CardTitle>Blocked Requests Pending Human Review</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
                A blocked request does not deactivate an account. Confirm permanent action only when the evidence proves a serious violation. Age-appropriate, non-sexual teenage film scenes are not violations.
              </div>
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
                      <Button size="sm" variant="outline" onClick={() => dismiss(Number(incident.id))}>
                        <CheckCircle2 className="mr-1 h-4 w-4" />Dismiss / Allow
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => confirm(Number(incident.id))}>
                        <Ban className="mr-1 h-4 w-4" />Confirm Serious Violation
                      </Button>
                    </div>
                  )}
                </div>
              ))}
              {!incidents.isLoading && !(incidents.data || []).length && <p className="text-sm text-muted-foreground">No moderation incidents.</p>}
            </CardContent>
          </Card>
        )}

        {tab === "blacklist" && (
          <Card className="border-red-500/25">
            <CardHeader><CardTitle className="flex items-center gap-2 text-red-300"><Ban className="h-5 w-5" />Blacklisted Users</CardTitle></CardHeader>
            <CardContent className="space-y-3">
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
            </CardContent>
          </Card>
        )}

        {tab === "access" && (
          <Card>
            <CardHeader><CardTitle>Administrator Evidence Access Log</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {(access.data || []).map((entry: any) => (
                <div key={entry.id} className="rounded border p-3 text-sm">
                  <div className="font-medium">{entry.action}</div>
                  <div className="text-xs text-muted-foreground">{entry.adminEmail || entry.adminName} · {formatDate(entry.createdAt)} · Archive {entry.archiveId || "—"} · Incident {entry.incidentId || "—"}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
