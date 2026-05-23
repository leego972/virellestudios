import React, { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, Loader2, Zap, Users } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function Admin() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [seedStatus, setSeedStatus] = useState<any>(null);

  // Redirect non-admin users
  useEffect(() => {
    if (user && !user.isAdmin) {
      setLocation("/");
    }
  }, [user, setLocation]);

  // Check seeding status on mount
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const result = await (trpc.adminSeeding.getStatus as any).query();
        if (result.success) {
          setSeedStatus(result);
        }
      } catch (error) {
        console.error("Failed to check seeding status:", error);
      }
    };
    checkStatus();
  }, []);

  const handleSeedMarketplace = async () => {
    setStatus("loading");
    setMessage("Seeding marketplace...");
    try {
      const result = await (trpc.adminSeeding.seedMarketplace as any).mutate();
      if (result.success) {
        setStatus("success");
        setMessage(result.message);
        setSeedStatus(null); // Refresh status
        setTimeout(() => setStatus("idle"), 3000);
      } else {
        setStatus("error");
        setMessage(result.error || "Failed to seed marketplace");
      }
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "An error occurred");
    }
  };

  const handleSeedFunding = async () => {
    setStatus("loading");
    setMessage("Seeding funding sources...");
    try {
      const result = await (trpc.adminSeeding.seedFundingSources as any).mutate();
      if (result.success) {
        setStatus("success");
        setMessage(result.message);
        setSeedStatus(null); // Refresh status
        setTimeout(() => setStatus("idle"), 3000);
      } else {
        setStatus("error");
        setMessage(result.error || "Failed to seed funding sources");
      }
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "An error occurred");
    }
  };

  const handleSeedEverything = async () => {
    if (!confirm("Are you sure? This will seed all marketplace items and funding sources.")) {
      return;
    }

    setStatus("loading");
    setMessage("Seeding everything...");
    try {
      const result = await (trpc.adminSeeding.seedEverything as any).mutate();
      if (result.success) {
        setStatus("success");
        setMessage(result.message);
        setSeedStatus(null); // Refresh status
        setTimeout(() => setStatus("idle"), 3000);
      } else {
        setStatus("error");
        setMessage(result.error || "Failed to seed data");
      }
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "An error occurred");
    }
  };

  const handleCreateBetaAccounts = async () => {
    setStatus("loading");
    setMessage("Creating beta tester accounts...");
    try {
      const result = await (trpc.adminSeeding.createBetaAccounts as any).mutate();
      if (result.success) {
        setStatus("success");
        const details = result.results.map((r: any) => 
          `${r.email}: ${r.status}${r.password ? ` (PW: ${r.password})` : ""}`
        ).join("\n");
        setMessage(`Beta accounts processed:\n${details}`);
        setSeedStatus(null); // Refresh status
      } else {
        setStatus("error");
        setMessage(result.error || "Failed to create beta accounts");
      }
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "An error occurred");
    }
  };

  if (!user?.isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-black mb-2 text-amber-400">Admin Power Tools</h1>
          <p className="text-white/60">One-click seeding for marketplace and funding sources</p>
        </div>

        {/* Status Message */}
        {message && (
          <div
            className={`mb-8 p-4 rounded-lg border flex items-start gap-3 ${
              status === "success"
                ? "bg-green-500/10 border-green-500/30 text-green-300"
                : status === "error"
                ? "bg-red-500/10 border-red-500/30 text-red-300"
                : "bg-amber-500/10 border-amber-500/30 text-amber-300"
            }`}
          >
            {status === "success" ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
            ) : status === "error" ? (
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            ) : (
              <Loader2 className="h-5 w-5 shrink-0 mt-0.5 animate-spin" />
            )}
            <span>{message}</span>
          </div>
        )}

        {/* Current Status */}
        {seedStatus && (
          <Card className="mb-8 bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-lg">Current Seeding Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <div className="text-2xl font-bold text-amber-400">{seedStatus.collections || 0}</div>
                  <div className="text-xs text-white/60 mt-1">Wardrobe Collections</div>
                </div>
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <div className="text-2xl font-bold text-amber-400">{seedStatus.items || 0}</div>
                  <div className="text-xs text-white/60 mt-1">Wardrobe Items</div>
                </div>
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <div className="text-2xl font-bold text-amber-400">{seedStatus.fundingSources || 0}</div>
                  <div className="text-xs text-white/60 mt-1">Funding Sources</div>
                </div>
              </div>
              <p className="text-xs text-white/40 italic">{seedStatus.message}</p>
            </CardContent>
          </Card>
        )}

        {/* Seeding Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Marketplace Seeding */}
          <Card className="bg-white/5 border-white/10 hover:border-amber-500/30 transition-colors">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <span className="text-2xl">🛍️</span>
                Seed Marketplace
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-white/60">
                Seed all 28+ Lamalo Fashion collections and wardrobe items into the marketplace.
              </p>
              <Button
                onClick={handleSeedMarketplace}
                disabled={status === "loading"}
                className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold"
              >
                {status === "loading" ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Seeding...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Seed Marketplace
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Funding Seeding */}
          <Card className="bg-white/5 border-white/10 hover:border-amber-500/30 transition-colors">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <span className="text-2xl">💰</span>
                Seed Funding Sources
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-white/60">
                Seed all 30+ funding sources including grants, crowdfunding, and investment options.
              </p>
              <Button
                onClick={handleSeedFunding}
                disabled={status === "loading"}
                className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold"
              >
                {status === "loading" ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Seeding...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Seed Funding
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Seed Everything */}
          <Card className="bg-gradient-to-br from-amber-500/20 to-purple-500/20 border-amber-500/30 hover:border-amber-500/50 transition-colors">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <span className="text-2xl">⚡</span>
                Seed Everything
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-white/60">
                One-click seeding: marketplace + funding sources. Requires confirmation.
              </p>
              <Button
                onClick={handleSeedEverything}
                disabled={status === "loading"}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-bold shadow-lg shadow-amber-500/20"
              >
                {status === "loading" ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Seeding...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Seed Everything
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Beta Tester Accounts */}
        <Card className="mb-8 bg-white/5 border-white/10 hover:border-blue-500/30 transition-colors">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-400" />
              Beta Tester Accounts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-white/60">
              Generate two pre-configured beta tester accounts with full access, unlimited credits, and "Beta" subscription tier.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white/5 p-3 rounded-lg border border-white/10 text-xs">
                <div className="font-bold text-blue-400">Account 1</div>
                <div>Email: beta1@virelle.life</div>
                <div>Tier: Beta (Unlimited)</div>
              </div>
              <div className="bg-white/5 p-3 rounded-lg border border-white/10 text-xs">
                <div className="font-bold text-blue-400">Account 2</div>
                <div>Email: beta2@virelle.life</div>
                <div>Tier: Beta (Unlimited)</div>
              </div>
            </div>
            <Button
              onClick={handleCreateBetaAccounts}
              disabled={status === "loading"}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold"
            >
              {status === "loading" ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Users className="h-4 w-4 mr-2" />
                  Generate Beta Tester Accounts
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Info Section */}
        <Card className="mt-8 bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-base">What This Does</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-white/70">
            <div>
              <h4 className="font-semibold text-white mb-2">🛍️ Marketplace Seeding</h4>
              <p>
                Populates your database with all Lamalo Fashion collections (Men's, Women's, Kids, Accessories, etc.) and 100+ wardrobe items. These will immediately appear in the wardrobe marketplace for all users.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-2">💰 Funding Sources Seeding</h4>
              <p>
                Adds 30+ pre-configured funding sources including government grants, crowdfunding platforms, film festivals, production companies, banks, angel investors, streaming platforms, and international funding options.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-2">⚡ Seed Everything</h4>
              <p>
                Runs both marketplace and funding seeding in a single transaction. Perfect for fresh deployments or complete data refresh.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
