import React, { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertCircle,
  Archive,
  Ban,
  CheckCircle2,
  DollarSign,
  Loader2,
  Rocket,
  Shield,
  Shirt,
  Star,
  Trash2,
  Users,
  Zap,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function Admin() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [lastMsg, setLastMsg] = useState<{
    text: string;
    ok: boolean;
  } | null>(null);

  const statusQuery = trpc.adminSeeding.getStatus.useQuery(undefined, {
    enabled: Boolean((user as any)?.isAdmin),
    refetchInterval: false,
  });

  const mutationOptions = (label: string) => ({
    onSuccess: (result: any) => setLastMsg({
      text: result.message || `${label} completed`,
      ok: result.success !== false,
    }),
    onError: (error: any) => setLastMsg({
      text: error?.message || `${label} failed`,
      ok: false,
    }),
  });

  const seedMarketplace = trpc.adminSeeding.seedMarketplace.useMutation(
    mutationOptions("Seed Marketplace"),
  );
  const patchLamaloImages = (trpc.adminSeeding as any).patchLamaloImages.useMutation(
    mutationOptions("Patch Lamalo Images"),
  );
  const seedFunding = trpc.adminSeeding.seedFundingSources.useMutation(
    mutationOptions("Seed Funding"),
  );
  const seedCrowdfunding = (trpc.adminSeeding as any).seedCrowdfunding.useMutation(
    mutationOptions("Seed Crowdfunding"),
  );
  const seedExecutive = trpc.adminSeeding.seedExecutive.useMutation(
    mutationOptions("Seed Executive"),
  );
  const seedMaster = trpc.adminSeeding.seedMaster.useMutation(
    mutationOptions("Seed Master"),
  );
  const seedSignatureCast = trpc.adminSeeding.seedSignatureCast.useMutation(
    mutationOptions("Seed Cast"),
  );
  const seedUniforms = trpc.adminSeeding.seedUniforms.useMutation(
    mutationOptions("Seed Uniforms"),
  );
  const seedEverything = trpc.adminSeeding.seedEverything.useMutation(
    mutationOptions("Seed Everything"),
  );
  const cleanupEmpty = (trpc.adminSeeding as any).cleanupEmptyCollections.useMutation(
    mutationOptions("Cleanup Empty Collections"),
  );
  const createBeta = trpc.adminSeeding.createBetaAccounts.useMutation(
    mutationOptions("Create Beta Accounts"),
  );

  const isAnyLoading = [
    seedMarketplace,
    seedFunding,
    seedCrowdfunding,
    seedExecutive,
    seedMaster,
    seedSignatureCast,
    seedUniforms,
    seedEverything,
    createBeta,
    cleanupEmpty,
  ].some((mutation) => mutation.isPending);

  if (!user || !(user as any).isAdmin) return null;

  const status = statusQuery.data;

  return (
    <div className="min-h-screen bg-[#090a0d] p-5 text-white md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.055] to-white/[0.018] p-6 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-amber-300/70">
              Restricted administration
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Virelle Admin Dashboard
            </h1>
            <p className="mt-2 text-sm text-white/50">
              Compliance operations, evidence controls and platform maintenance.
            </p>
          </div>
          <Button
            variant="outline"
            className="border-white/15 bg-white/[0.03]"
            onClick={() => setLocation("/")}
          >
            Back to app
          </Button>
        </header>

        <Card className="border-amber-300/15 bg-amber-300/[0.025] text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Archive className="h-5 w-5 text-amber-300/80" />
              Compliance & Evidence Vault
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 max-w-3xl text-sm leading-relaxed text-white/55">
              Review blocked requests, manage private retention copies and legal holds, inspect evidence-access logs, and view users deactivated only after a confirmed serious violation.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                className="bg-amber-300 text-black hover:bg-amber-200"
                onClick={() => {
                  window.location.href =
                    "/virelle-broadcast-render?adminVault=1";
                }}
              >
                <Shield className="mr-2 h-4 w-4" />
                Open compliance vault
              </Button>
              <Button
                variant="outline"
                className="border-white/15 bg-white/[0.03]"
                onClick={() => {
                  window.location.href =
                    "/virelle-broadcast-render?adminVault=1";
                }}
              >
                <Ban className="mr-2 h-4 w-4" />
                Blacklisted users
              </Button>
            </div>
          </CardContent>
        </Card>

        {lastMsg && (
          <div className={`flex items-center gap-3 rounded-lg border p-4 ${
            lastMsg.ok
              ? "border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-300"
              : "border-red-500/20 bg-red-500/[0.06] text-red-300"
          }`}>
            {lastMsg.ok
              ? <CheckCircle2 className="h-5 w-5" />
              : <AlertCircle className="h-5 w-5" />}
            <p className="font-medium">{lastMsg.text}</p>
          </div>
        )}

        {isAnyLoading && (
          <div className="flex items-center gap-3 rounded-lg border border-blue-500/20 bg-blue-500/[0.06] p-4 text-blue-300">
            <Loader2 className="h-5 w-5 animate-spin" />
            <p className="font-medium">Working…</p>
          </div>
        )}

        {status && (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              ["Collections", status.collections],
              ["Items", status.items],
              ["Funding Sources", status.fundingSources],
              ["Campaigns", status.campaigns],
            ].map(([label, value]) => (
              <div
                key={label as string}
                className="rounded-xl border border-white/10 bg-white/[0.025] p-4 text-center"
              >
                <div className="text-2xl font-semibold text-amber-300">
                  {value ?? 0}
                </div>
                <div className="mt-1 text-xs text-white/45">{label}</div>
              </div>
            ))}
          </div>
        )}

        <div className="grid gap-5 md:grid-cols-2">
          <SeedCard
            title="Seed Marketplace"
            description="Seed Lamalo Fashion collections and wardrobe items."
            icon={<Shirt className="h-5 w-5 text-amber-300" />}
          >
            <Button
              onClick={() => seedMarketplace.mutate()}
              disabled={isAnyLoading}
              className="w-full bg-white/10 text-white hover:bg-white/15"
            >
              <Zap className="mr-2 h-4 w-4" />
              Seed marketplace
            </Button>
            <Button
              onClick={() => patchLamaloImages.mutate()}
              disabled={isAnyLoading}
              variant="outline"
              className="mt-2 w-full border-white/15 bg-white/[0.03]"
            >
              Patch item images
            </Button>
          </SeedCard>

          <SeedCard
            title="Seed Funding Sources"
            description="Seed grants and investment sources."
            icon={<DollarSign className="h-5 w-5 text-amber-300" />}
          >
            <Button
              onClick={() => seedFunding.mutate()}
              disabled={isAnyLoading}
              className="w-full bg-white/10 text-white hover:bg-white/15"
            >
              <Zap className="mr-2 h-4 w-4" />
              Seed funding
            </Button>
          </SeedCard>

          <SeedCard
            title="Seed Crowdfunding"
            description="Seed sample active crowdfunding campaigns."
            icon={<Rocket className="h-5 w-5 text-amber-300" />}
          >
            <Button
              onClick={() => seedCrowdfunding.mutate()}
              disabled={isAnyLoading}
              className="w-full bg-white/10 text-white hover:bg-white/15"
            >
              <Zap className="mr-2 h-4 w-4" />
              Seed crowdfunding
            </Button>
          </SeedCard>

          <SeedCard
            title="Seed Executive Wardrobe"
            description="Seed premium executive and luxury collections."
            icon={<Shirt className="h-5 w-5 text-amber-300" />}
          >
            <Button
              onClick={() => seedExecutive.mutate()}
              disabled={isAnyLoading}
              className="w-full bg-white/10 text-white hover:bg-white/15"
            >
              <Zap className="mr-2 h-4 w-4" />
              Seed executive
            </Button>
          </SeedCard>

          <SeedCard
            title="Seed Master Collections"
            description="Seed master wardrobe collections."
            icon={<Star className="h-5 w-5 text-amber-300" />}
          >
            <Button
              onClick={() => seedMaster.mutate()}
              disabled={isAnyLoading}
              className="w-full bg-white/10 text-white hover:bg-white/15"
            >
              <Zap className="mr-2 h-4 w-4" />
              Seed master collections
            </Button>
          </SeedCard>

          <SeedCard
            title="Seed Signature Cast"
            description="Seed signature and diverse cast profiles."
            icon={<Users className="h-5 w-5 text-amber-300" />}
          >
            <Button
              onClick={() => seedSignatureCast.mutate()}
              disabled={isAnyLoading}
              className="w-full bg-white/10 text-white hover:bg-white/15"
            >
              <Zap className="mr-2 h-4 w-4" />
              Seed cast
            </Button>
          </SeedCard>

          <SeedCard
            title="Seed Uniforms"
            description="Seed professional uniform collections."
            icon={<Shield className="h-5 w-5 text-amber-300" />}
          >
            <Button
              onClick={() => seedUniforms.mutate()}
              disabled={isAnyLoading}
              className="w-full bg-white/10 text-white hover:bg-white/15"
            >
              <Zap className="mr-2 h-4 w-4" />
              Seed uniforms
            </Button>
          </SeedCard>

          <SeedCard
            title="Beta Accounts"
            description="Create beta tester accounts."
            icon={<Users className="h-5 w-5 text-amber-300" />}
          >
            <Button
              onClick={() => createBeta.mutate()}
              disabled={isAnyLoading}
              className="w-full bg-white/10 text-white hover:bg-white/15"
            >
              <Zap className="mr-2 h-4 w-4" />
              Create beta accounts
            </Button>
          </SeedCard>
        </div>

        <Card className="border-red-500/15 bg-red-500/[0.025] text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-red-300">
              <Trash2 className="h-5 w-5" />
              Clean Up Empty Collections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-white/55">
              Deletes duplicate empty collections from repeated seed runs. Collections containing items are retained.
            </p>
            <Button
              onClick={() => {
                if (confirm("Delete all empty collections? This cannot be undone.")) {
                  cleanupEmpty.mutate();
                }
              }}
              disabled={isAnyLoading}
              variant="destructive"
              className="w-full"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete empty collections
            </Button>
          </CardContent>
        </Card>

        <Button
          onClick={() => {
            if (confirm("Seed marketplace, funding and campaigns now?")) {
              seedEverything.mutate();
            }
          }}
          disabled={isAnyLoading}
          className="w-full bg-amber-300 py-3 font-semibold text-black hover:bg-amber-200"
        >
          <Zap className="mr-2 h-5 w-5" />
          Seed everything
        </Button>
      </div>
    </div>
  );
}

function SeedCard({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-white/10 bg-white/[0.025] text-white transition-colors hover:border-white/15">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-white/50">{description}</p>
        {children}
      </CardContent>
    </Card>
  );
}
