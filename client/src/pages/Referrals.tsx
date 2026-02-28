import { trpc } from "@/lib/trpc";
import { Copy, Gift, Users, TrendingUp, Share2, Check, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import LeegoFooter from "@/components/LeegoFooter";

export default function Referrals() {
  const [copied, setCopied] = useState(false);
  const { data: code, isLoading: codeLoading } = trpc.referral.getMyCode.useQuery();
  const { data: stats, isLoading: statsLoading } = trpc.referral.myStats.useQuery();

  const referralLink = code ? `${window.location.origin}/register?ref=${code.code}` : "";

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyCode = () => {
    if (code) {
      navigator.clipboard.writeText(code.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareReferral = () => {
    if (navigator.share) {
      navigator.share({
        title: "Join VirÉlle Studios",
        text: "Create Hollywood-quality AI films for free! Use my referral link to get 3 bonus generations.",
        url: referralLink,
      }).catch(() => {});
    } else {
      copyLink();
    }
  };

  const isLoading = codeLoading || statsLoading;

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
          <Gift className="h-7 w-7 text-amber-400" />
          Referral Program
        </h1>
        <p className="text-muted-foreground mt-1">
          Invite friends and earn bonus AI generations. They get 3 free generations too!
        </p>
      </div>

      {/* Referral Link Card */}
      <Card className="bg-gradient-to-br from-amber-600/10 to-orange-600/5 border-amber-500/20">
        <CardHeader>
          <CardTitle className="text-lg">Your Referral Link</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="h-12 bg-white/5 rounded-lg animate-pulse" />
          ) : (
            <>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1 bg-black/30 rounded-lg px-4 py-3 text-sm font-mono text-white/80 truncate border border-white/10">
                  {referralLink}
                </div>
                <div className="flex gap-2">
                  <Button onClick={copyLink} variant="outline" className="border-amber-500/30 hover:bg-amber-600/20">
                    {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                    {copied ? "Copied!" : "Copy"}
                  </Button>
                  <Button onClick={shareReferral} className="bg-amber-600 hover:bg-amber-700">
                    <Share2 className="h-4 w-4 mr-1" />
                    Share
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Your code:</span>
                <button
                  onClick={copyCode}
                  className="font-mono font-bold text-amber-400 bg-amber-600/10 px-2 py-0.5 rounded hover:bg-amber-600/20 transition-colors"
                >
                  {code?.code}
                </button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Users className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.totalReferrals || 0}</p>
                <p className="text-sm text-muted-foreground">Link Clicks</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <TrendingUp className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.successfulReferrals || 0}</p>
                <p className="text-sm text-muted-foreground">Successful Signups</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Gift className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.bonusGenerationsEarned || 0}</p>
                <p className="text-sm text-muted-foreground">Bonus Generations</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">How It Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-amber-600/20 text-amber-400 font-bold flex items-center justify-center mx-auto mb-3">
                1
              </div>
              <h4 className="font-semibold mb-1">Share Your Link</h4>
              <p className="text-sm text-muted-foreground">
                Send your unique referral link to friends, post it on social media, or share it in communities.
              </p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-amber-600/20 text-amber-400 font-bold flex items-center justify-center mx-auto mb-3">
                2
              </div>
              <h4 className="font-semibold mb-1">They Sign Up</h4>
              <p className="text-sm text-muted-foreground">
                When someone registers using your link, they automatically get 3 bonus AI generations as a welcome gift.
              </p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-amber-600/20 text-amber-400 font-bold flex items-center justify-center mx-auto mb-3">
                3
              </div>
              <h4 className="font-semibold mb-1">You Earn Rewards</h4>
              <p className="text-sm text-muted-foreground">
                You receive 5 bonus AI generations for every successful referral. No limits — keep referring!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Referral History */}
      {stats?.referrals && stats.referrals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Referral History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.referrals.map((ref, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      ref.status === "rewarded" ? "bg-green-400" :
                      ref.status === "registered" ? "bg-blue-400" : "bg-white/30"
                    }`} />
                    <span className="text-sm capitalize">{ref.status}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {ref.rewardAmount && (
                      <span className="text-amber-400">+{ref.rewardAmount} generations</span>
                    )}
                    <span>{new Date(ref.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <LeegoFooter />
    </div>
  );
}
