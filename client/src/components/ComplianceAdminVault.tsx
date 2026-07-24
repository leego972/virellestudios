import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SwappysRetentionAdminPanel from "@/components/SwappysRetentionAdminPanel";
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
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

type VaultTab = "archive" | "swappys" | "review" | "blacklist" | "access";

function formatDate(value: unknown): string {
  if (!value) return "—";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("en-AU");
}

function badgeVariant(status: string) {
  if (["failed", "rejected", "confirmed_violation", "active"].includes(status)) {
    return "destructive" as const;
  }
  if (["completed", "archived", "dismissed"].includes(status)) {
    return "default" as const;
  }
  return "outline" as const;
}

function EmptyState({ children }: { children: string }) {
  return (
    <div className="rounded-xl border border-dashed border-white/10 p-10 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

export default function ComplianceAdminVault() {
  const auth = (trpc as any).auth.me.useQuery();
  const isAdmin = Boolean(auth.data?.role === "admin" || auth.data?.isAdmin);
  const [tab, setTab] = useState<VaultTab>("archive");

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

  const downloadArchive = (trpc as any).virelleBroadcastRender.adminCompliance.getArchiveDownloadUrl.useMutation();
  const setLegalHold = (trpc as any).virelleBroadcastRender.adminCompliance.setLegalHold.useMutation();
  const dismissIncident = (trpc as any).virelleBroadcastRender.adminCompliance.dismissIncident.useMutation();
  const confirmViolation = (trpc as any).virelleBroadcastRender.adminCompliance.confirmViolation.useMutation();
  const runArchiveCycle = (trpc as any).virelleBroadcastRender.adminCompliance.runArchiveCycle.useMutation();

  const refresh = () => {
    archive.refetch();
    incidents.refetch();
    blacklist.refetch();
    accessLog.refetch();
  };

  const openArchive = async (archiveId: number) => {
    try {
      const result = await downloadArchive.mutateAsync({ archiveId });
      window.open(result.url, "_blank", "noopener,noreferrer");
    } catch (error: any) {
      toast.error(error?.message || "Private archive copy is unavailable.");
    }
  };

  const toggleHold = async (record: any) => {
    const placing = !Boolean(record.legalHold);
    const reason = placing
      ? window.prompt("Legal-hold reason:", "Potential legal or law-enforcement preservation requirement")
      : null;
    if (placing && !reason?.trim()) return;
    try {
      await setLegalHold.mutateAsync({
        archiveId: Number(record.id),
        legalHold: placing,
        reason: reason?.trim() || null,
      });
      toast.success(placing ? "Legal hold applied." : "Legal hold removed.");
      archive.refetch();
    } catch (error: any) {
      toast.error(error?.message || "Could not update the legal hold.");
    }
  };

  const dismiss = async (incidentId: number) => {
    const notes = window.prompt("Record why this request is lawful or was misclassified:");
    if (!notes || notes.trim().length < 3) return;
    try {
      await dismissIncident.mutateAsync({ incidentId, notes: notes.trim() });
      toast.success("Incident dismissed. No account action was taken.");
      incidents.refetch();
      accessLog.refetch();
    } catch (error: any) {
      toast.error(error?.message || "Could not dismiss the incident.");
    }
  };

  const confirm = async (incidentId: number) => {
    const notes = window.prompt(
      "Describe the reviewed evidence proving the serious violation. A prompt alone is not sufficient:",
    );
    if (!notes || notes.trim().length < 10) return;
    const phrase = window.prompt('Type exactly: CONFIRM PERMANENT DEACTIVATION');
    if (phrase !== "CONFIRM PERMANENT DEACTIVATION") {
      toast.error("Confirmation did not match. No account action was taken.");
      return;
    }
    try {
      await confirmViolation.mutateAsync({
        incidentId,
        notes: notes.trim(),
        confirmation: "CONFIRM PERMANENT DEACTIVATION",
      });
      toast.success("Violation confirmed. Account deactivated and related evidence placed on legal hold.");
      refresh();
    } catch (error: any) {
      toast.error(error?.message || "Could not confirm the violation.");
    }
  };

  const runCycle = async () => {
    try {
      await runArchiveCycle.mutateAsync();
      toast.success("Archive scan completed.");
      archive.refetch();
    } catch (error: any) {
      toast.error(error?.message || "Archive scan failed.");
    }
  };

  if (auth.isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-300" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-xl p-8">
        <Card className="border-red-500/20 bg-red-500/[0.04]">
          <CardContent className="p-8 text-center">
            <ShieldCheck className="mx-auto mb-3 h-9 w-9 text-red-300" />
            <h1 className="text-lg font-semibold">Administrator access required</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Evidence records and private retention copies are not available to ordinary users.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tabs: Array<{ key: VaultTab; label: string; icon: typeof Archive }> = [
    { key: "archive", label: "Retention Archive", icon: Archive },
    { key: "swappys", label: "Swappys Results", icon: Sparkles },
    { key: "review", label: "Review Queue", icon: FileWarning },
    { key: "blacklist", label: "Blacklisted Users", icon: Ban },
    { key: "access", label: "Access Audit", icon: Gavel },
  ];

  return (
    <div className="min-h-screen bg-[#090a0d] p-4 text-white md:p-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <header className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.055] to-white/[0.018] p-5 shadow-2xl shadow-black/20 md:p-7">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-amber-300/70">
                <ShieldCheck className="h-4 w-4" />
                Restricted administration
              </div>
              <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
                Compliance & Evidence Vault
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/55">
                Private retention copies, legal holds, moderation adjudication and confirmed account restrictions. Every evidence access is recorded.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="border-white/15 bg-white/[0.03]"
                onClick={runCycle}
                disabled={runArchiveCycle.isPending}
              >
                {runArchiveCycle.isPending
                  ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  : <Archive className="mr-2 h-4 w-4" />}
                Run archive scan
              </Button>
              <Button
                variant="outline"
                className="border-white/15 bg-white/[0.03]"
                onClick={refresh}
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              <Button
                variant="outline"
                className="border-white/15 bg-white/[0.03]"
                onClick={() => { window.location.href = "/admin"; }}
              >
                Admin dashboard
              </Button>
            </div>
          </div>
        </header>

        <nav className="flex flex-wrap gap-2 rounded-xl border border-white/10 bg-white/[0.025] p-2">
          {tabs.map(({ key, label, icon: Icon }) => (
            <Button
              key={key}
              variant="ghost"
              className={tab === key
                ? "bg-white/10 text-white hover:bg-white/10"
                : "text-white/55 hover:bg-white/[0.06] hover:text-white"}
              onClick={() => setTab(key)}
            >
              <Icon className="mr-2 h-4 w-4" />
              {label}
            </Button>
          ))}
        </nav>

        {tab === "swappys" && <SwappysRetentionAdminPanel />}

        {tab === "archive" && (
          <Card className="border-white/10 bg-white/[0.025] text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Archive className="h-5 w-5 text-amber-300/80" />
                Private Retention Archive
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(archive.data || []).map((record: any) => (
                <article key={record.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <h3 className="font-medium">Archive #{record.id} · {record.accountName}</h3>
                      <p className="mt-1 text-xs text-white/45">
                        Account #{record.userId} · {record.email} · {record.workspace} workspace · {record.mediaKind}
                      </p>
                      <p className="mt-1 text-xs text-white/45">
                        {record.sourceType} #{record.sourceId} · commenced {formatDate(record.startedAt)} · retain until {formatDate(record.retainedUntil)}
                      </p>
                      {record.archiveError && (
                        <p className="mt-2 rounded-md border border-red-500/20 bg-red-500/[0.05] p-2 text-xs text-red-200">
                          {record.archiveError}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={badgeVariant(record.archiveStatus)}>{record.archiveStatus}</Badge>
                      {record.legalHold && <Badge variant="destructive">Legal hold</Badge>}
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-white/15 bg-white/[0.03]"
                      disabled={record.archiveStatus !== "archived"}
                      onClick={() => openArchive(Number(record.id))}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Admin download
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-white/15 bg-white/[0.03]"
                      onClick={() => toggleHold(record)}
                    >
                      <Gavel className="mr-2 h-4 w-4" />
                      {record.legalHold ? "Remove hold" : "Apply legal hold"}
                    </Button>
                  </div>
                </article>
              ))}
              {!archive.isLoading && !(archive.data || []).length && (
                <EmptyState>No retained media records were found.</EmptyState>
              )}
            </CardContent>
          </Card>
        )}

        {tab === "review" && (
          <Card className="border-white/10 bg-white/[0.025] text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileWarning className="h-5 w-5 text-amber-300/80" />
                Human Review Queue
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-xl border border-amber-300/15 bg-amber-300/[0.035] p-4 text-sm leading-relaxed text-white/65">
                A blocked request does not deactivate an account. Permanent action requires reviewed evidence proving a serious violation; a prompt or classifier result alone is insufficient.
              </div>
              {(incidents.data || []).map((incident: any) => (
                <article key={incident.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="font-medium">Incident #{incident.id} · {String(incident.category).replaceAll("_", " ")}</h3>
                      <p className="mt-1 text-xs text-white/45">
                        {incident.accountName || incident.email} · Account #{incident.userId} · {incident.workspace} workspace · {formatDate(incident.createdAt)}
                      </p>
                    </div>
                    <Badge variant={badgeVariant(incident.status)}>{String(incident.status).replaceAll("_", " ")}</Badge>
                  </div>
                  {incident.requestSummary && (
                    <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap rounded-lg border border-white/10 bg-black/30 p-3 font-sans text-xs leading-relaxed text-white/65">
                      {incident.requestSummary}
                    </pre>
                  )}
                  {incident.reviewNotes && (
                    <p className="mt-3 rounded-lg border border-white/10 p-3 text-sm text-white/60">
                      Review notes: {incident.reviewNotes}
                    </p>
                  )}
                  {incident.status === "blocked_pending_review" && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" className="border-white/15 bg-white/[0.03]" onClick={() => dismiss(Number(incident.id))}>
                        <CheckCircle2 className="mr-2 h-4 w-4" /> Dismiss / allow
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => confirm(Number(incident.id))}>
                        <Ban className="mr-2 h-4 w-4" /> Confirm serious violation
                      </Button>
                    </div>
                  )}
                </article>
              ))}
              {!incidents.isLoading && !(incidents.data || []).length && (
                <EmptyState>No moderation incidents were found.</EmptyState>
              )}
            </CardContent>
          </Card>
        )}

        {tab === "blacklist" && (
          <Card className="border-red-500/15 bg-red-500/[0.025] text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ban className="h-5 w-5 text-red-300" />
                Confirmed Blacklisted Users
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(blacklist.data || []).map((record: any) => (
                <article key={record.id} className="rounded-xl border border-red-500/15 bg-black/20 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="font-medium">{record.verifiedLegalName || record.accountName || record.email}</h3>
                      <p className="mt-1 text-xs text-white/45">
                        Account #{record.userId} · {record.email} · {record.verifiedPhone || record.phone || "phone unavailable"}
                      </p>
                      <p className="mt-1 text-xs text-white/45">
                        {record.addressLine1 || ""} {record.addressLine2 || ""} {record.verifiedCity || record.city || ""} {record.stateRegion || ""} {record.postcode || ""} {record.verifiedCountry || record.country || ""}
                      </p>
                    </div>
                    <Badge variant="destructive">Deactivated</Badge>
                  </div>
                  <div className="mt-3 grid gap-2 rounded-lg border border-white/10 bg-black/25 p-3 text-xs text-white/60 md:grid-cols-2">
                    <span>Reason: {record.reasonCode}</span>
                    <span>Incident: #{record.incidentId}</span>
                    <span>Evidence source: {record.sourceType} #{record.sourceId || "—"}</span>
                    <span>Blacklisted: {formatDate(record.blacklistedAt)}</span>
                  </div>
                  {record.reviewNotes && <p className="mt-3 text-sm leading-relaxed text-white/65">{record.reviewNotes}</p>}
                  {record.archiveId && (
                    <Button className="mt-4" size="sm" variant="outline" onClick={() => openArchive(Number(record.archiveId))}>
                      <Download className="mr-2 h-4 w-4" /> Open retained evidence
                    </Button>
                  )}
                </article>
              ))}
              {!blacklist.isLoading && !(blacklist.data || []).length && (
                <EmptyState>No confirmed blacklisted users.</EmptyState>
              )}
            </CardContent>
          </Card>
        )}

        {tab === "access" && (
          <Card className="border-white/10 bg-white/[0.025] text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gavel className="h-5 w-5 text-amber-300/80" />
                Evidence Access Audit
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(accessLog.data || []).map((entry: any) => (
                <div key={entry.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
                  <div className="font-medium">{String(entry.action).replaceAll("_", " ")}</div>
                  <p className="mt-1 text-xs text-white/45">
                    {entry.adminEmail || entry.adminName} · {formatDate(entry.createdAt)} · archive {entry.archiveId || "—"} · incident {entry.incidentId || "—"} · target account {entry.targetUserId || "—"}
                  </p>
                </div>
              ))}
              {!accessLog.isLoading && !(accessLog.data || []).length && (
                <EmptyState>No evidence-access events were found.</EmptyState>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
