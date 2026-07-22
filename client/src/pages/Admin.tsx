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
import AdminComplianceVault from "./AdminComplianceVault";

export default function Admin() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [lastMsg, setLastMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const complianceMode = new URLSearchParams(window.location.search).get("compliance") === "1";

  const statusQuery = trpc.adminSeeding.getStatus.useQuery(undefined, {
    enabled: !!(user as any)?.isAdmin && !complianceMode,
    refetchInterval: false,
  });

  const mkOpts = (label: string) => ({
    onSuccess: (result: any) => setLastMsg({
      text: result.message || `${label} done`,
      ok: result.success !== false,
    }),
    onError: (error: any) => setLastMsg({
      text: error?.message || `${label} failed`,
      ok: false,
    }),
  });

  const seedMarketplace = trpc.adminSeeding.seedMarketplace.useMutation(mkOpts("Seed Marketplace"));
  const patchLamaloImages = (trpc.adminSeeding as any).patchLamaloImages.useMutation(mkOpts("Patch Lamalo Images"));
  const seedFunding = trpc.adminSeeding.seedFundingSources.useMutation(mkOpts("Seed Funding"));
  const seedCrowdfunding = (trpc.adminSeeding as any).seedCrowdfunding.useMutation(mkOpts("Seed Crowdfunding"));
  const seedExecutive = trpc.adminSeeding.seedExecutive.useMutation(mkOpts("Seed Executive"));
  const seedMaster = trpc.adminSeeding.seedMaster.useMutation(mkOpts("Seed Master"));
  const seedSignatureCast = trpc.adminSeeding.seedSignatureCast.useMutation(mkOpts("Seed Cast"));
  const seedUniforms = trpc.adminSeeding.seedUniforms.useMutation(mkOpts("Seed Uniforms"));
  const seedEverything = trpc.adminSeeding.seedEverything.useMutation(mkOpts("Seed Everything"));
  const cleanupEmpty = (trpc.adminSeeding as any).cleanupEmptyCollections.useMutation(mkOpts("Cleanup Empty Collections"));
  const createBeta = trpc.adminSeeding.createBetaAccounts.useMutation(mkOpts("Create Beta Accounts"));

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
  if (complianceMode) return <AdminComplianceVault />;

  const status = statusQuery.data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#07070e] via-[#0c0b18] to-[#07070a]">
      <div className="min-h-screen bg-black p-8 text-white">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gold-shimmer">Admin Dashboard</h1>
              <p className="text-white/60">Compliance, evidence controls and platform seeding</p>
            </div>
            <Button variant="outline" onClick={() => setLocation("/")}>Back to App</Button>
          </div>

          <Card className="mb-6 border-red-500/30 bg-red-500/5 shadow-lg shadow-red-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-red-200">
                <Archive className="h-5 w-5" />
                Compliance & Evidence Vault
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-white/60">
                Review verified 18+ profiles, download private 90-day archive copies,
                apply legal holds, adjudicate blocked requests and manage confirmed blacklisted users.
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Button
                  onClick={() => { window.location.href = "/admin?compliance=1"; }}
                  className="bg-red-500/20 text-red-200 hover:bg-red-500/30"
                >
                  <Shield className="mr-2 h-4 w-4" />Open Compliance Vault
                </Button>
                <Button
                  variant="outline"
                  onClick={() => { window.location.href = "/admin?compliance=1"; }}
                >
                  <Ban className="mr-2 h-4 w-4" />Blacklisted Users
                </Button>
              </div>
            </CardContent>
          </Card>

          {lastMsg && (
            <div className={`mb-6 flex items-center gap-3 rounded-lg border p-4 ${
              lastMsg.ok
                ? "border-green-500/20 bg-green-500/10 text-green-400"
                : "border-red-500/20 bg-red-500/10 text-red-400"
            }`}>
              {lastMsg.ok
                ? <CheckCircle2 className="h-5 w-5 text-amber-400" />
                : <AlertCircle className="h-5 w-5" />}
              <p className="font-medium">{lastMsg.text}</p>
            </div>
          )}

          {isAnyLoading && (
            <div className="mb-6 flex items-center gap-3 rounded-lg border border-blue-500/20 bg-blue-500/10 p-4 text-blue-400">
              <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
              <p className="font-medium">Working...</p>
            </div>
          )}

          {status && (
            <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
              {[
                ["Collections", status.collections],
                ["Items", status.items],
                ["Funding Sources", status.fundingSources],
                ["Campaigns", status.campaigns],
              ].map(([label, value]) => (
                <div key={label as string} className="rounded-lg border border-amber-500/20 p-4 text-center">
                  <div className="text-2xl font-bold text-amber-400">{value ?? 0}</div>
                  <div className="mt-1 text-xs text-white/60">{label}</div>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <SeedCard title="Seed Marketplace" description="Seed all Lamalo Fashion collections and wardrobe items." icon={<Shirt className="h-5 w-5 text-amber-400" />}>
              <Button onClick={() => seedMarketplace.mutate()} disabled={isAnyLoading} className="w-full bg-white/10 text-white hover:bg-white/20"><Zap className="mr-2 h-4 w-4" />Seed Marketplace</Button>
              <Button onClick={() => patchLamaloImages.mutate()} disabled={isAnyLoading} className="mt-2 w-full border border-amber-500/30 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"><Zap className="mr-2 h-4 w-4" />Patch Item Images</Button>
            </SeedCard>

            <SeedCard title="Seed Funding Sources" description="Seed funding sources including grants and investment options." icon={<DollarSign className="h-5 w-5 text-amber-400" />}>
              <Button onClick={() => seedFunding.mutate()} disabled={isAnyLoading} className="w-full bg-white/10 text-white hover:bg-white/20"><Zap className="mr-2 h-4 w-4" />Seed Funding</Button>
            </SeedCard>

            <SeedCard title="Seed Crowdfunding" description="Seed sample active crowdfunding campaigns." icon={<Rocket className="h-5 w-5 text-amber-400" />}>
              <Button onClick={() => seedCrowdfunding.mutate()} disabled={isAnyLoading} className="w-full bg-white/10 text-white hover:bg-white/20"><Zap className="mr-2 h-4 w-4" />Seed Crowdfunding</Button>
            </SeedCard>

            <SeedCard title="Seed Executive Wardrobe" description="Seed premium executive and luxury fashion collections." icon={<Shirt className="h-5 w-5 text-purple-400" />}>
              <Button onClick={() => seedExecutive.mutate()} disabled={isAnyLoading} className="w-full bg-white/10 text-white hover:bg-white/20"><Zap className="mr-2 h-4 w-4" />Seed Executive</Button>
            </SeedCard>

            <SeedCard title="Seed Master Collections" description="Seed master wardrobe collections." icon={<Star className="h-5 w-5 text-amber-400" />}>
              <Button onClick={() => seedMaster.mutate()} disabled={isAnyLoading} className="w-full bg-white/10 text-white hover:bg-white/20"><Zap className="mr-2 h-4 w-4" />Seed Master</Button>
            </SeedCard>

            <SeedCard title="Seed Signature Cast" description="Seed signature and diverse cast profiles." icon={<Users className="h-5 w-5 text-blue-400" />}>
              <Button onClick={() => seedSignatureCast.mutate()} disabled={isAnyLoading} className="w-full bg-white/10 text-white hover:bg-white/20"><Zap className="mr-2 h-4 w-4" />Seed Cast</Button>
            </SeedCard>

            <SeedCard title="Seed Uniforms" description="Seed uniform collections." icon={<Shield className="h-5 w-5 text-green-400" />}>
              <Button onClick={() => seedUniforms.mutate()} disabled={isAnyLoading} className="w-full bg-white/10 text-white hover:bg-white/20"><Zap className="mr-2 h-4 w-4" />Seed Uniforms</Button>
            </SeedCard>

            <SeedCard title="Beta Accounts" description="Create beta tester accounts." icon={<Users className="h-5 w-5 text-amber-400" />}>
              <Button onClick={() => createBeta.mutate()} disabled={isAnyLoading} className="w-full bg-white/10 text-white hover:bg-white/20"><Zap className="mr-2 h-4 w-4" />Create Beta Accounts</Button>
            </SeedCard>
          </div>

          <Card className="mt-4 border-red-500/20 bg-red-500/5 shadow-lg">
            <CardHeader><CardTitle className="flex items-center gap-2 text-base text-red-400"><Trash2 className="h-5 w-5" />Clean Up Empty Collections</CardTitle></CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-white/60">Deletes duplicate empty collections from repeated seed runs. Only collections with items are kept.</p>
              <Button onClick={() => { if (confirm("Delete all empty collections? Cannot be undone.")) cleanupEmpty.mutate(); }} disabled={isAnyLoading} className="w-full border border-red-500/30 bg-red-500/20 text-red-300 hover:bg-red-500/30"><Trash2 className="mr-2 h-4 w-4" />Delete Empty Collections</Button>
            </CardContent>
          </Card>

          <div className="mt-6">
            <Button onClick={() => { if (confirm("Seed everything — marketplace, funding, and campaigns?")) seedEverything.mutate(); }} disabled={isAnyLoading} className="w-full bg-amber-500 py-3 font-bold text-black hover:bg-amber-600"><Zap className="mr-2 h-5 w-5" />Seed Everything at Once</Button>
          </div>
        </div>
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
    <Card className="border-amber-500/20 bg-white/5 shadow-lg shadow-amber-500/5 transition-shadow hover:shadow-amber-500/20">
      <CardHeader><CardTitle className="flex items-center gap-2 text-base gradient-text-gold">{icon}{title}</CardTitle></CardHeader>
      <CardContent><p className="mb-4 text-sm text-white/60">{description}</p>{children}</CardContent>
    </Card>
  );
}
