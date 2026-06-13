import React, { useState } from "react";
  import { useAuth } from "@/_core/hooks/useAuth";
  import { useLocation } from "wouter";
  import { Button } from "@/components/ui/button";
  import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
  import { AlertCircle, CheckCircle2, Loader2, Zap, Rocket, Shirt, DollarSign, Users, Star, Shield } from "lucide-react";
  import { trpc } from "@/lib/trpc";

  export default function Admin() {
    const { user } = useAuth();
    const [, setLocation] = useLocation();
    const [lastMsg, setLastMsg] = useState<{ text: string; ok: boolean } | null>(null);

    const statusQuery = trpc.adminSeeding.getStatus.useQuery(undefined, {
      enabled: !!(user as any)?.isAdmin,
      refetchInterval: false,
    });

    const mkOpts = (label: string) => ({
      onSuccess: (r: any) => setLastMsg({ text: r.message || label + " done", ok: r.success !== false }),
      onError: (e: any) => setLastMsg({ text: e?.message || label + " failed", ok: false }),
    });

    const seedMarketplace   = trpc.adminSeeding.seedMarketplace.useMutation(mkOpts("Seed Marketplace"));
    const seedFunding       = trpc.adminSeeding.seedFundingSources.useMutation(mkOpts("Seed Funding"));
    const seedCrowdfunding  = (trpc.adminSeeding as any).seedCrowdfunding.useMutation(mkOpts("Seed Crowdfunding"));
    const seedExecutive     = trpc.adminSeeding.seedExecutive.useMutation(mkOpts("Seed Executive"));
    const seedMaster        = trpc.adminSeeding.seedMaster.useMutation(mkOpts("Seed Master"));
    const seedSignatureCast = trpc.adminSeeding.seedSignatureCast.useMutation(mkOpts("Seed Cast"));
    const seedUniforms      = trpc.adminSeeding.seedUniforms.useMutation(mkOpts("Seed Uniforms"));
    const seedEverything    = trpc.adminSeeding.seedEverything.useMutation(mkOpts("Seed Everything"));
    const createBeta        = trpc.adminSeeding.createBetaAccounts.useMutation(mkOpts("Create Beta Accounts"));

    const isAnyLoading = [seedMarketplace, seedFunding, seedCrowdfunding, seedExecutive,
      seedMaster, seedSignatureCast, seedUniforms, seedEverything, createBeta].some(m => m.isPending);

    if (!user || !(user as any).isAdmin) return null;

    const s = statusQuery.data;

    return (
      <div className="min-h-screen bg-black text-white p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold">Admin Dashboard</h1>
              <p className="text-white/60">One-click seeding for marketplace, funding, and crowdfunding</p>
            </div>
            <Button variant="outline" onClick={() => setLocation("/")}>Back to App</Button>
          </div>

          {lastMsg && (
            <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${lastMsg.ok
              ? "bg-green-500/10 text-green-400 border border-green-500/20"
              : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
              {lastMsg.ok ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
              <p className="font-medium">{lastMsg.text}</p>
            </div>
          )}

          {isAnyLoading && (
            <div className="mb-6 p-4 rounded-lg flex items-center gap-3 bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Loader2 className="h-5 w-5 animate-spin" />
              <p className="font-medium">Working...</p>
            </div>
          )}

          {s && (
            <div className="grid grid-cols-4 gap-4 mb-8">
              {[["Collections", s.collections], ["Items", s.items], ["Funding Sources", s.fundingSources], ["Campaigns", s.campaigns]].map(([label, val]) => (
                <div key={label as string} className="bg-white/5 rounded-lg p-4 border border-white/10 text-center">
                  <div className="text-2xl font-bold text-amber-400">{val ?? 0}</div>
                  <div className="text-xs text-white/60 mt-1">{label}</div>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-white/5 border-white/10">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Shirt className="h-5 w-5 text-amber-400" />Seed Marketplace</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-white/60 mb-4">Seed all 28+ Lamalo Fashion collections and wardrobe items.</p>
                <Button onClick={() => seedMarketplace.mutate()} disabled={isAnyLoading} className="w-full bg-white/10 hover:bg-white/20 text-white">
                  <Zap className="h-4 w-4 mr-2" />Seed Marketplace
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><DollarSign className="h-5 w-5 text-amber-400" />Seed Funding Sources</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-white/60 mb-4">Seed all 30+ funding sources including grants and investment options.</p>
                <Button onClick={() => seedFunding.mutate()} disabled={isAnyLoading} className="w-full bg-white/10 hover:bg-white/20 text-white">
                  <Zap className="h-4 w-4 mr-2" />Seed Funding
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Rocket className="h-5 w-5 text-amber-400" />Seed Crowdfunding</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-white/60 mb-4">Seed sample active crowdfunding campaigns.</p>
                <Button onClick={() => seedCrowdfunding.mutate()} disabled={isAnyLoading} className="w-full bg-white/10 hover:bg-white/20 text-white">
                  <Zap className="h-4 w-4 mr-2" />Seed Crowdfunding
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Shirt className="h-5 w-5 text-purple-400" />Seed Executive Wardrobe</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-white/60 mb-4">Seed premium executive & luxury fashion collections.</p>
                <Button onClick={() => seedExecutive.mutate()} disabled={isAnyLoading} className="w-full bg-white/10 hover:bg-white/20 text-white">
                  <Zap className="h-4 w-4 mr-2" />Seed Executive
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Star className="h-5 w-5 text-amber-400" />Seed Master Collections</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-white/60 mb-4">Seed master wardrobe collections.</p>
                <Button onClick={() => seedMaster.mutate()} disabled={isAnyLoading} className="w-full bg-white/10 hover:bg-white/20 text-white">
                  <Zap className="h-4 w-4 mr-2" />Seed Master
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="h-5 w-5 text-blue-400" />Seed Signature Cast</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-white/60 mb-4">Seed signature & diverse cast profiles.</p>
                <Button onClick={() => seedSignatureCast.mutate()} disabled={isAnyLoading} className="w-full bg-white/10 hover:bg-white/20 text-white">
                  <Zap className="h-4 w-4 mr-2" />Seed Cast
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Shield className="h-5 w-5 text-green-400" />Seed Uniforms</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-white/60 mb-4">Seed uniform collections.</p>
                <Button onClick={() => seedUniforms.mutate()} disabled={isAnyLoading} className="w-full bg-white/10 hover:bg-white/20 text-white">
                  <Zap className="h-4 w-4 mr-2" />Seed Uniforms
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="h-5 w-5 text-amber-400" />Beta Accounts</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-white/60 mb-4">Create beta tester accounts.</p>
                <Button onClick={() => createBeta.mutate()} disabled={isAnyLoading} className="w-full bg-white/10 hover:bg-white/20 text-white">
                  <Zap className="h-4 w-4 mr-2" />Create Beta Accounts
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6">
            <Button
              onClick={() => { if (confirm("Seed everything — marketplace, funding, and campaigns?")) seedEverything.mutate(); }}
              disabled={isAnyLoading}
              className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold py-3"
            >
              <Zap className="h-5 w-5 mr-2" />Seed Everything at Once
            </Button>
          </div>
        </div>
      </div>
    );
  }
  