import React, { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, Loader2, Zap, Users, Rocket } from "lucide-react";
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
    setMessage("Seeding marketplace...");
    try {
      setStatus("loading");
      const result = await (trpc.adminSeeding.seedMarketplace as any).mutate();
      if (result.success) {
        setSeedStatus(null); // Refresh status
        setMessage(result.message);
        setStatus("success");
      } else {
        setMessage(result.error || "Failed to seed marketplace");
        setStatus("error");
      }
    } catch (error) {
      console.error(error);
      setMessage("An unexpected error occurred");
      setStatus("error");
    }
  };

  const handleSeedFunding = async () => {
    setMessage("Seeding funding sources...");
    try {
      setStatus("loading");
      const result = await (trpc.adminSeeding.seedFundingSources as any).mutate();
      if (result.success) {
        setSeedStatus(null); // Refresh status
        setMessage(result.message);
        setStatus("success");
      } else {
        setMessage(result.error || "Failed to seed funding sources");
        setStatus("error");
      }
    } catch (error) {
      console.error(error);
      setMessage("An unexpected error occurred");
      setStatus("error");
    }
  };

  const handleSeedCrowdfunding = async () => {
    setMessage("Seeding crowdfunding...");
    try {
      setStatus("loading");
      const result = await (trpc.adminSeeding as any).seedCrowdfunding.mutate();
      if (result.success) {
        setSeedStatus(null);
        setMessage(result.message);
        setStatus("success");
      } else {
        setMessage(result.message || "Failed to seed crowdfunding");
        setStatus("error");
      }
    } catch (error) {
      console.error(error);
      setMessage("An unexpected error occurred");
      setStatus("error");
    }
  };

  const handleSeedEverything = async () => {
    if (!confirm("Are you sure? This will seed all marketplace items, funding sources, and sample campaigns.")) {
      return;
    }
    setMessage("Seeding everything...");
    try {
      setStatus("loading");
      const result = await (trpc.adminSeeding.seedEverything as any).mutate();
      if (result.success) {
        setSeedStatus(null); // Refresh status
        setMessage(result.message);
        setStatus("success");
      } else {
        setMessage(result.error || "Failed to seed data");
        setStatus("error");
      }
    } catch (error) {
      console.error(error);
      setMessage("An unexpected error occurred");
      setStatus("error");
    }
  };

  const handleCreateBetaAccounts = async () => {
    setMessage("Creating beta tester accounts...");
    try {
      setStatus("loading");
      const result = await (trpc.adminSeeding.createBetaAccounts as any).mutate();
      if (result.success) {
        setSeedStatus(null); // Refresh status
        setMessage(result.message);
        setStatus("success");
      } else {
        setMessage(result.error || "Failed to create beta accounts");
        setStatus("error");
      }
    } catch (error) {
      console.error(error);
      setMessage("An unexpected error occurred");
      setStatus("error");
    }
  };

  if (!user || !user.isAdmin) {
    return null;
  }

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

        {status !== "idle" && (
          <div className={`mb-8 p-4 rounded-lg flex items-center gap-3 ${
            status === "loading" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
            status === "success" ? "bg-green-500/10 text-green-400 border border-green-500/20" :
            "bg-red-500/10 text-red-400 border border-red-500/20"
          }`}>
            {status === "loading" ? <Loader2 className="h-5 w-5 animate-spin" /> :
             status === "success" ? <CheckCircle2 className="h-5 w-5" /> :
             <AlertCircle className="h-5 w-5" />}
            <p className="font-medium">{message}</p>
          </div>
        )}

        {seedStatus && (
          <Card className="mb-8 bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-lg">Current Seeding Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <div className="text-2xl font-bold text-amber-400">{seedStatus.collections || 0}</div>
                  <div className="text-xs text-white/60 mt-1">Collections</div>
                </div>
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <div className="text-2xl font-bold text-amber-400">{seedStatus.items || 0}</div>
                  <div className="text-xs text-white/60 mt-1">Wardrobe Items</div>
                </div>
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <div className="text-2xl font-bold text-amber-400">{seedStatus.fundingSources || 0}</div>
                  <div className="text-xs text-white/60 mt-1">Funding Sources</div>
                </div>
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <div className="text-2xl font-bold text-amber-400">{seedStatus.campaigns || 0}</div>
                  <div className="text-xs text-white/60 mt-1">Sample Campaigns</div>
                </div>
              </div>
              <p className="text-xs text-white/40 italic mt-4">{seedStatus.message}</p>
            </CardContent>
          </Card>
        )}

        {/* Seeding Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Marketplace Seeding */}
          <Card className="bg-white/5 border-white/10 hover:border-amber-500/30 transition-colors">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shirt className="h-5 w-5 text-amber-400" />
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
                className="w-full bg-white/10 hover:bg-white/20 text-white"
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
                <DollarSign className="h-5 w-5 text-amber-400" />
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
                className="w-full bg-white/10 hover:bg-white/20 text-white"
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

          {/* Crowdfunding Seeding */}
          <Card className="bg-white/5 border-white/10 hover:border-amber-500/30 transition-colors">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Rocket className="h-5 w-5 text-amber-400" />
                Seed Crowdfunding
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-white/60">
                Seed sample active crowdfunding campaigns to populate the hub for demonstration.
              </p>
              <Button
                onClick={handleSeedCrowdfunding}
                disabled={status === "loading"}
                className="w-full bg-white/10 hover:bg-white/20 text-white"
              >
                {status === "loading" ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Seeding...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Seed Crowdfunding
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
                One-click seeding: marketplace + funding sources + crowdfunding. Requires confirmation.
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
              <h4 className="font-semibold text-white mb-2">🚀 Crowdfunding Seeding</h4>
              <p>
                Creates sample active crowdfunding campaigns with rewards and backers to demonstrate the Crowdfunding Hub's features.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-2">⚡ Seed Everything</h4>
              <p>
                Runs all seeding tasks in a single transaction. Perfect for fresh deployments or complete data refresh.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Mock components to satisfy imports if needed
function Shirt(props: any) { return <Users {...props} /> }
function DollarSign(props: any) { return <Zap {...props} /> }
