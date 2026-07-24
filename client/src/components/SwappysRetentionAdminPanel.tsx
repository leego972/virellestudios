import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArchiveRestore, Clock3, Loader2, RefreshCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";

function formatDate(value: unknown): string {
  if (!value) return "—";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("en-AU");
}

function formatBytes(value: unknown): string {
  const bytes = Number(value || 0);
  if (!Number.isFinite(bytes) || bytes <= 0) return "—";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function SwappysRetentionAdminPanel() {
  const [keptOnly, setKeptOnly] = useState(false);
  const outputs = (trpc as any).vfxSfx.adminListSwappysRetainedOutputs.useQuery(
    { limit: 100, keptOnly },
    { retry: false },
  );
  const setKeep = (trpc as any).vfxSfx.adminSetSwappysOutputKeep.useMutation();
  const cleanup = (trpc as any).vfxSfx.adminCleanupSwappysExpiredOutputs.useMutation();

  const toggleKeep = async (record: any) => {
    const applying = !Boolean(record.keepFlag);
    const reason = applying
      ? window.prompt("Reason for keeping this result:", "Support, safety review or authorised preservation")
      : null;
    if (applying && !reason?.trim()) return;
    const keepReason = applying ? reason?.trim() || null : null;

    try {
      await setKeep.mutateAsync({
        outputId: Number(record.id),
        keep: applying,
        reason: keepReason,
      });
      toast.success(applying ? "Result marked Keep." : "Keep removed. Normal expiry restored.");
      outputs.refetch();
    } catch (error: any) {
      toast.error(error?.message || "Could not update this result.");
    }
  };

  const runCleanup = async () => {
    try {
      const result = await cleanup.mutateAsync();
      toast.success(`Cleanup complete: ${result.deleted || 0} expired result${result.deleted === 1 ? "" : "s"} removed.`);
      outputs.refetch();
    } catch (error: any) {
      toast.error(error?.message || "Could not run the expiry cleanup.");
    }
  };

  const records = outputs.data || [];

  return (
    <Card className="border-fuchsia-400/15 bg-fuchsia-400/[0.025] text-white">
      <CardHeader>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-fuchsia-300" />
              Swappys 30-day results
            </CardTitle>
            <CardDescription className="mt-2 max-w-3xl text-white/50">
              Private server copies expire automatically after 30 days. Mark a result Keep only when an authorised support, safety or preservation need requires it.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              className="border-white/15 bg-white/[0.03]"
              onClick={() => setKeptOnly((value) => !value)}
            >
              <ArchiveRestore className="mr-2 h-4 w-4" />
              {keptOnly ? "Show all" : "Kept only"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-white/15 bg-white/[0.03]"
              onClick={() => outputs.refetch()}
              disabled={outputs.isFetching}
            >
              <RefreshCcw className={`mr-2 h-4 w-4 ${outputs.isFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-white/15 bg-white/[0.03]"
              onClick={runCleanup}
              disabled={cleanup.isPending}
            >
              {cleanup.isPending
                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                : <Clock3 className="mr-2 h-4 w-4" />}
              Remove expired
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {outputs.isLoading && (
          <div className="flex items-center justify-center py-12 text-white/50">
            <Loader2 className="mr-3 h-5 w-5 animate-spin" /> Loading private results…
          </div>
        )}

        {!outputs.isLoading && records.map((record: any) => (
          <article key={record.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-medium">Result #{record.id}</h3>
                  <Badge variant={record.keepFlag ? "default" : "outline"}>
                    {record.keepFlag ? "Keep" : record.status}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-white/45">
                  {record.ownerUserId ? `Account #${record.ownerUserId}` : "Anonymous session"} · {String(record.product).replaceAll("_", " ")} · {formatBytes(record.byteSize)}
                </p>
                <p className="mt-1 text-xs text-white/45">
                  Created {formatDate(record.createdAt)} · {record.keepFlag ? `Kept since ${formatDate(record.keptAt)}` : `Expires ${formatDate(record.expiresAt)}`}
                </p>
                {record.keepReason && (
                  <p className="mt-3 rounded-lg border border-fuchsia-300/15 bg-fuchsia-300/[0.04] p-3 text-sm text-white/60">
                    Keep reason: {record.keepReason}
                  </p>
                )}
              </div>
              {record.status === "active" && (
                <Button
                  size="sm"
                  variant={record.keepFlag ? "outline" : "default"}
                  className={record.keepFlag ? "border-white/15 bg-white/[0.03]" : "bg-fuchsia-500 text-white hover:bg-fuchsia-400"}
                  onClick={() => toggleKeep(record)}
                  disabled={setKeep.isPending}
                >
                  <ArchiveRestore className="mr-2 h-4 w-4" />
                  {record.keepFlag ? "Remove Keep" : "Keep"}
                </Button>
              )}
            </div>
          </article>
        ))}

        {!outputs.isLoading && records.length === 0 && (
          <div className="rounded-xl border border-dashed border-white/10 p-10 text-center text-sm text-white/45">
            {keptOnly ? "No results are marked Keep." : "No Swappys results have been retained yet."}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
