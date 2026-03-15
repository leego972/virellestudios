import { trpc } from "@/lib/trpc";
import {
  Copy, Gift, Users, TrendingUp, Share2, Check,
  Trophy, Zap, ChevronRight, Linkedin, MessageCircle, Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useState } from "react";

const MILESTONES = [
  { count: 3,  bonus: 25000,   label: "Rising Star",  icon: "STAR" },
  { count: 5,  bonus: 50000,   label: "Connector",    icon: "LINK" },
  { count: 10, bonus: 150000,  label: "Ambassador",   icon: "TROPHY" },
  { count: 25, bonus: 500000,  label: "Legend",       icon: "CROWN" },
];

function formatCredits(n: number) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(0) + "K";
  return n.toLocaleString();
}

function MilestoneIcon({ icon }: { icon: string }) {
  if (icon === "STAR") return <span className="text-2xl">&#11088;</span>;
  if (icon === "LINK") return <span className="text-2xl">&#128279;</span>;
  if (icon === "TROPHY") return <span className="text-2xl">&#127942;</span>;
  if (icon === "CROWN") return <span className="text-2xl">&#128081;</span>;
  return null;
}

export default function Referrals() {
  const [copied, setCopied] = useState<"link" | "code" | null>(null);
  const { data: code, isLoading: codeLoading } = trpc.referral.getMyCode.useQuery();
  const { data: stats, isLoading: statsLoading } = trpc.referral.myStats.useQuery();
  const { data: promoStatus } = trpc.promo.myStatus.useQuery();

  const referralLink = code ? window.location.origin + "/register?ref=" + code.code : "";
  const isLoading = codeLoading || statsLoading;

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied("link");
    setTimeout(() => setCopied(null), 2500);
  };

  const copyCode = () => {
    if (code) {
      navigator.clipboard.writeText(code.code);
      setCopied("code");
      setTimeout(() => setCopied(null), 2500);
    }
  };

  const shareNative = () => {
    if (navigator.share) {
      navigator.share({
        title: "Join Virelle Studios — AI Film Production",
        text: "I've been using Virelle Studios to create Hollywood-quality AI films. Sign up with my link and we both get 7,000 bonus credits!",
        url: referralLink,
      }).catch(() => {});
    } else {
      copyLink();
    }
  };

  const shareLinkedIn = () => {
    const url = encodeURIComponent(referralLink);
    const summary = encodeURIComponent(
      "I've been using Virelle Studios to create Hollywood-quality AI films. Join with my referral link and we both get 7,000 bonus credits."
    );
    window.open(
      "https://www.linkedin.com/sharing/share-offsite/?url=" + url + "&summary=" + summary,
      "_blank"
    );
  };

  const shareWhatsApp = () => {
    const text = encodeURIComponent(
      `🎬 Join me on Virelle Studios — the AI film production platform.\n\nSign up with my link and we both get 7,000 bonus credits:\n${referralLink}`
    );
    window.open("https://wa.me/?text=" + text, "_blank");
  };

  const successful = stats?.successfulReferrals || 0;
  const nextMilestone = MILESTONES.find(m => m.count > successful) || MILESTONES[MILESTONES.length - 1];
  const prevMilestoneCount = (() => {
    const idx = MILESTONES.findIndex(m => m.count > successful);
    return idx > 0 ? MILESTONES[idx - 1].count : 0;
  })();
  const milestoneProgress = nextMilestone
    ? Math.min(100, Math.round(((successful - prevMilestoneCount) / (nextMilestone.count - prevMilestoneCount)) * 100))
    : 100;

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
          <Gift className="h-7 w-7 text-amber-400" />
          Refer &amp; Earn
        </h1>
        <p className="text-muted-foreground mt-1">
          Share your link. When a filmmaker signs up, <strong className="text-foreground">you both get 7,000 credits</strong> &mdash; automatically, no action needed.
        </p>
      </div>

      {/* Reward Banner */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-gradient-to-br from-amber-600/20 to-orange-600/10 border border-amber-500/20 p-4 text-center">
          <div className="text-3xl font-black text-amber-400">+7,000</div>
          <div className="text-sm text-muted-foreground mt-1">credits you earn</div>
          <div className="text-xs text-amber-400/60 mt-0.5">per successful signup</div>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-purple-600/20 to-violet-600/10 border border-purple-500/20 p-4 text-center">
          <div className="text-3xl font-black text-purple-400">+7,000</div>
          <div className="text-sm text-muted-foreground mt-1">credits they get</div>
          <div className="text-xs text-purple-400/60 mt-0.5">instant on signup</div>
        </div>
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
                <Button onClick={copyLink} variant="outline" className="border-amber-500/30 hover:bg-amber-600/20 shrink-0">
                  {copied === "link" ? <Check className="h-4 w-4 mr-1 text-green-400" /> : <Copy className="h-4 w-4 mr-1" />}
                  {copied === "link" ? "Copied!" : "Copy Link"}
                </Button>
              </div>

              {/* Code row */}
              <div className="flex items-center gap-3 text-sm flex-wrap">
                <span className="text-muted-foreground">Your code:</span>
                <button
                  onClick={copyCode}
                  className="font-mono font-bold text-amber-400 bg-amber-600/10 px-3 py-1 rounded-lg hover:bg-amber-600/20 transition-colors flex items-center gap-1.5"
                >
                  {code?.code}
                  {copied === "code" ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5 opacity-60" />}
                </button>
                <span className="text-xs text-muted-foreground">(friends can enter this at signup)</span>
              </div>

              {/* Share buttons */}
              <div className="pt-1">
                <p className="text-xs text-muted-foreground mb-2">Share via:</p>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={shareNative} size="sm" className="bg-amber-600 hover:bg-amber-700">
                    <Share2 className="h-3.5 w-3.5 mr-1.5" />
                    Share
                  </Button>
                  <Button onClick={shareLinkedIn} size="sm" variant="outline" className="border-blue-500/30 hover:bg-blue-600/20 text-blue-400">
                    <Linkedin className="h-3.5 w-3.5 mr-1.5" />
                    LinkedIn
                  </Button>
                  <Button onClick={shareWhatsApp} size="sm" variant="outline" className="border-green-500/30 hover:bg-green-600/20 text-green-400">
                    <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
                    WhatsApp
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Promo Code Status */}
      {promoStatus && (
        <Card className={promoStatus.appliedPromoCode && !promoStatus.promoDiscountUsed
          ? "border-green-500/20 bg-green-600/5"
          : "border-border/50"
        }>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Tag className="h-4 w-4 text-green-400" />
              Your Promo Code
            </CardTitle>
          </CardHeader>
          <CardContent>
            {promoStatus.appliedPromoCode ? (
              promoStatus.promoDiscountUsed ? (
                <div className="flex items-center gap-3 text-sm">
                  <Check className="h-4 w-4 text-green-400 shrink-0" />
                  <div>
                    <span className="font-semibold text-foreground">{promoStatus.appliedPromoCode}</span>
                    <span className="text-muted-foreground ml-2">&mdash; discount applied to your first payment</span>
                    <Badge className="ml-2 bg-green-600/20 text-green-400 border-green-500/30 text-xs">Used</Badge>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse shrink-0" />
                  <div>
                    <span className="font-semibold text-green-400">{promoStatus.appliedPromoCode}</span>
                    <span className="text-muted-foreground ml-2">&mdash; 50% off your first subscription payment</span>
                    <Badge className="ml-2 bg-amber-600/20 text-amber-400 border-amber-500/30 text-xs">Ready to use</Badge>
                  </div>
                </div>
              )
            ) : (
              <p className="text-sm text-muted-foreground">
                No promo code applied. Promo codes can be entered during signup for 50% off your first payment.
              </p>
            )}
          </CardContent>
        </Card>
      )}

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
                <p className="text-2xl font-bold">{successful}</p>
                <p className="text-sm text-muted-foreground">Successful Signups</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Zap className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCredits(stats?.bonusCreditsEarned || 0)}</p>
                <p className="text-sm text-muted-foreground">Credits Earned</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Milestone Progress */}
      <Card className="border-amber-500/20">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-400" />
            Milestone Rewards
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {successful < MILESTONES[MILESTONES.length - 1].count && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Progress to <strong className="text-foreground">{nextMilestone.label}</strong>
                </span>
                <span className="text-amber-400 font-semibold">{successful} / {nextMilestone.count} referrals</span>
              </div>
              <Progress value={milestoneProgress} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {nextMilestone.count - successful} more signup{nextMilestone.count - successful !== 1 ? "s" : ""} to unlock{" "}
                <span className="text-amber-400 font-semibold">{formatCredits(nextMilestone.bonus)} bonus credits</span>
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {MILESTONES.map((m) => {
              const isCompleted = successful >= m.count;
              const isNext = !isCompleted && nextMilestone?.count === m.count;
              return (
                <div
                  key={m.count}
                  className={
                    "rounded-xl p-4 border flex items-center gap-3 transition-all " +
                    (isCompleted
                      ? "border-amber-500/40 bg-amber-500/10"
                      : isNext
                      ? "border-amber-500/20 ring-1 ring-amber-500/30"
                      : "border-white/5 opacity-50")
                  }
                >
                  <MilestoneIcon icon={m.icon} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{m.label}</span>
                      {isCompleted && (
                        <Badge className="bg-green-600/20 text-green-400 border-green-500/30 text-xs">Earned</Badge>
                      )}
                      {isNext && (
                        <Badge className="bg-amber-600/20 text-amber-400 border-amber-500/30 text-xs">Next</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {m.count} referrals &rarr;{" "}
                      <span className="text-amber-400 font-semibold">{formatCredits(m.bonus)} bonus credits</span>
                    </p>
                  </div>
                  {isCompleted && <Check className="h-4 w-4 text-green-400 shrink-0" />}
                  {isNext && <ChevronRight className="h-4 w-4 text-amber-400 shrink-0" />}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">How It Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-amber-600/20 text-amber-400 font-bold flex items-center justify-center mx-auto mb-3 text-lg">1</div>
              <h4 className="font-semibold mb-1">Copy Your Link</h4>
              <p className="text-sm text-muted-foreground">
                Tap &ldquo;Copy Link&rdquo; above and send it to any filmmaker, studio, or content creator.
              </p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-amber-600/20 text-amber-400 font-bold flex items-center justify-center mx-auto mb-3 text-lg">2</div>
              <h4 className="font-semibold mb-1">They Sign Up</h4>
              <p className="text-sm text-muted-foreground">
                When they register using your link, they automatically receive{" "}
                <span className="text-purple-400 font-semibold">7,000 bonus credits</span>.
              </p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-amber-600/20 text-amber-400 font-bold flex items-center justify-center mx-auto mb-3 text-lg">3</div>
              <h4 className="font-semibold mb-1">You Earn Credits</h4>
              <p className="text-sm text-muted-foreground">
                You get <span className="text-amber-400 font-semibold">7,000 credits</span> per signup, plus milestone bonuses up to{" "}
                <span className="text-amber-400 font-semibold">500K credits</span>.
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
            <div className="space-y-2">
              {stats.referrals.map((ref: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-white/3 border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className={
                      "w-2 h-2 rounded-full shrink-0 " +
                      (ref.status === "rewarded" ? "bg-green-400" :
                      ref.status === "registered" ? "bg-blue-400" : "bg-white/30")
                    } />
                    <span className="text-sm capitalize font-medium">{ref.status}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    {ref.rewardAmount && (
                      <span className="text-amber-400 font-semibold">+{ref.rewardAmount.toLocaleString()} credits</span>
                    )}
                    <span className="text-muted-foreground">{new Date(ref.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
