import { useRoute, useLocation } from "wouter";
  import { trpc } from "@/lib/trpc";
  import { useEffect } from "react";
  import { Badge } from "@/components/ui/badge";
  import { Button } from "@/components/ui/button";
  import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
  import { Progress } from "@/components/ui/progress";
  import { Separator } from "@/components/ui/separator";
  import { Skeleton } from "@/components/ui/skeleton";
  import { CalendarDays, Users, Target, Zap, Heart, Film, CheckCircle2, Clock, ExternalLink } from "lucide-react";
  import { useState } from "react";
  import { toast } from "sonner";
  import { useAuth } from "../_core/hooks/useAuth";

  function fmtAud(cents: number) {
    return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", minimumFractionDigits: 0 }).format(cents / 100);
  }

  function daysLeft(deadline: Date | string | null): number {
    if (!deadline) return 0;
    const ms = new Date(deadline).getTime() - Date.now();
    return Math.max(0, Math.ceil(ms / 86400000));
  }

  export default function CampaignPage() {
    const [, params] = useRoute("/crowdfund/c/:slug");
    const [, navigate] = useLocation();
    const { user } = useAuth();
    const slug = params?.slug ?? "";
    const [selectedReward, setSelectedReward] = useState<number | null>(null);
    const [customAmount, setCustomAmount] = useState("");
    const [backing, setBacking] = useState(false);

    const { data, isLoading, error, refetch } = trpc.crowdfund.campaign.get.useQuery({ slug }, { enabled: !!slug });

    // Handle return from Stripe
    const [loc] = useLocation();
    const query = new URLSearchParams(loc.split("?")[1]);
    const status = query.get("status");
    const sessionId = query.get("session_id");
    const [confirming, setConfirming] = useState(false);

    const confirm = trpc.crowdfund.confirmContribution.useMutation({
      onSuccess: (res) => {
        if (res.success) {
          toast.success(res.alreadyConfirmed ? "Contribution already confirmed" : "Thank you for backing this project!");
          refetch();
          // Clean URL
          navigate(`/crowdfund/c/${slug}`, { replace: true });
        }
        setConfirming(false);
      },
      onError: (err) => {
        toast.error(err.message);
        setConfirming(false);
      }
    });

    useEffect(() => {
      if (status === "success" && sessionId && !confirming) {
        setConfirming(true);
        confirm.mutate({ sessionId, contributionId: 0 }); // contributionId is found by sessionId on server
      } else if (status === "cancelled") {
        toast.error("Contribution cancelled");
        navigate(`/crowdfund/c/${slug}`, { replace: true });
      }
    }, [status, sessionId]);

    const contribute = trpc.crowdfund.contribute.useMutation({
      onSuccess: ({ checkoutUrl }) => {
        window.location.href = checkoutUrl;
      },
      onError: (err) => {
        toast.error(err.message);
        setBacking(false);
      },
    });

    if (isLoading) return (
      <div className="min-h-screen p-6 max-w-5xl mx-auto" style={{background:"linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)"}}>
        <Skeleton className="h-64 w-full rounded-2xl mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    );

    if (error || !data) return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <Film className="w-12 h-12 text-muted-foreground mx-auto" />
          <h2 className="text-xl font-semibold gradient-text-gold">Campaign not found</h2>
          <Button variant="outline" onClick={() => navigate("/crowdfund/browse")}>Browse Campaigns</Button>
        </div>
      </div>
    );

    const { campaign, rewards } = data;
    const progress = Math.min(100, Math.round((campaign.raisedAmountCents / campaign.goalAmountCents) * 100));
    const days = daysLeft(campaign.deadline);
    const isActive = campaign.status === "active";
    const isClosed = ["funded", "failed", "paid_out", "cancelled"].includes(campaign.status);

    const selectedRewardData = rewards.find(r => r.id === selectedReward);
    const backAmount = selectedRewardData
      ? selectedRewardData.amountCents
      : customAmount ? Math.round(parseFloat(customAmount) * 100) : 0;

    async function handleBack() {
      if (!user) { navigate("/login"); return; }
      if (backAmount < 100) { toast.error("Minimum contribution is \$1.00"); return; }
      setBacking(true);
      const origin = window.location.origin;
      contribute.mutate({
        campaignSlug: slug,
        amountCents: backAmount,
        rewardId: selectedReward ?? undefined,
        successUrl: `${origin}/crowdfund/c/${slug}?status=success&session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${origin}/crowdfund/c/${slug}?status=cancelled`,
      });
    }

    return (
      <div className="min-h-screen" style={{ background:"linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)" }}>
        {/* Hero */}
        {campaign.posterUrl ? (
          <div className="relative h-56 sm:h-80 w-full overflow-hidden">
            <img src={campaign.posterUrl} alt={campaign.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/30 to-transparent" />
          </div>
        ) : (
          <div className="h-32 bg-gradient-to-br from-amber-900/40 via-background to-background" />
        )}

        <div className="max-w-5xl mx-auto px-4 pb-16">
          {/* Breadcrumb */}
          <div className="py-4 flex items-center gap-2 text-sm text-muted-foreground">
            <button onClick={() => navigate("/crowdfund/browse")} className="hover:text-foreground transition-colors">Campaigns</button>
            <span>/</span>
            <span className="text-foreground truncate max-w-xs">{campaign.title}</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main */}
            <div className="lg:col-span-2 space-y-6">
              {/* Title + badges */}
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {campaign.genre && <Badge variant="secondary">{campaign.genre}</Badge>}
                  {campaign.format && <Badge variant="outline">{campaign.format}</Badge>}
                  <Badge
                    variant={campaign.fundingModel === "all_or_nothing" ? "destructive" : "default"}
                    className={campaign.fundingModel === "keep_it_all" ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                  >
                    {campaign.fundingModel === "all_or_nothing" ? "All-or-Nothing" : "Keep-it-All"}
                  </Badge>
                  {isClosed && (
                    <Badge variant={campaign.status === "funded" ? "default" : "secondary"} className={campaign.status === "funded" ? "bg-amber-500" : ""}>
                      {campaign.status === "funded" ? "Funded!" : campaign.status === "failed" ? "Ended" : campaign.status}
                    </Badge>
                  )}
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-gold-shimmer">{campaign.title}</h1>
                {campaign.tagline && <p className="text-lg text-muted-foreground">{campaign.tagline}</p>}
              </div>

              {/* Stats bar */}
              <div className="space-y-2">
                <Progress value={progress} className="h-3 rounded-full [&>div]:bg-amber-500" />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground font-semibold">{progress}% funded</span>
                  <span className="text-muted-foreground">{fmtAud(campaign.raisedAmountCents)} raised of {fmtAud(campaign.goalAmountCents)}</span>
                </div>
                <div className="flex gap-6 pt-1">
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Users className="w-4 h-4" />{campaign.backerCount} backers
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <CalendarDays className="w-4 h-4" />
                    {isActive ? `${days} days left` : campaign.status === "funded" ? "Goal reached" : "Ended"}
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Target className="w-4 h-4" />Goal: {fmtAud(campaign.goalAmountCents)}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Description */}
              {campaign.description && (
                <div className="prose prose-invert prose-sm max-w-none">
                  <p className="whitespace-pre-wrap text-sm text-foreground/80">{campaign.description}</p>
                </div>
              )}

              {/* About the model */}
              <Card className="border-amber-500/20 bg-amber-500/5 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow gold-glow">
                <CardContent className="pt-4 pb-4 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
                  <div className="flex gap-3">
                    {campaign.fundingModel === "all_or_nothing" ? (
                      <Target className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                    ) : (
                      <Zap className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
                    )}
                    <div>
                      <p className="font-semibold text-sm mb-1">
                        {campaign.fundingModel === "all_or_nothing" ? "All-or-Nothing" : "Keep-it-All"} Campaign
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {campaign.fundingModel === "all_or_nothing"
                          ? "Your card is authorised now, but only charged if the campaign reaches its goal. If the goal is not met by the deadline, you pay nothing."
                          : "The creator receives all funds raised, regardless of whether the goal is reached. Your card is charged immediately."}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Video */}
              {campaign.videoUrl && (
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-3 gradient-text-gold">Pitch Video</h3>
                  <div className="aspect-video rounded-xl overflow-hidden bg-black/40">
                    <iframe src={campaign.videoUrl} className="w-full h-full" allowFullScreen title="Campaign pitch video" />
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar — Rewards + Back */}
            <div className="space-y-4">
              {/* Reward tiers */}
              {rewards.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider gradient-text-gold">Choose a Reward</h3>
                  {rewards.map((reward) => {
                    const isFull = reward.limitCount !== null && reward.claimedCount >= reward.limitCount;
                    const isSelected = selectedReward === reward.id;
                    return (
                      <Card
                        key={reward.id}
                        onClick={() => !isFull && setSelectedReward(isSelected ? null : reward.id)}
                        className={`cursor-pointer transition-all ${isFull ? "opacity-50 cursor-not-allowed" : ""} ${isSelected ? "border-amber-500 bg-amber-500/10 ring-1 ring-amber-500/50" : "hover:border-amber-500/40"}`}
                      >
                        <CardContent className="pt-4 pb-4 space-y-2 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-amber-400">{fmtAud(reward.amountCents)}</span>
                            {isSelected && <CheckCircle2 className="w-4 h-4 text-amber-400" />}
                          </div>
                          <p className="font-semibold text-sm">{reward.title}</p>
                          {reward.description && <p className="text-xs text-muted-foreground">{reward.description}</p>}
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            {reward.estimatedDelivery && (
                              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{reward.estimatedDelivery}</span>
                            )}
                            {reward.limitCount !== null && (
                              <span>{reward.claimedCount}/{reward.limitCount} claimed</span>
                            )}
                          </div>
                          {isFull && <Badge variant="secondary" className="text-xs">Sold out</Badge>}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              {/* Custom amount */}
              <Card>
                <CardContent className="pt-4 pb-4 space-y-3 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
                  <p className="text-sm font-semibold">{selectedReward ? "Or enter a different amount" : "Back this project"}</p>
                  <div className="flex items-center gap-2 rounded-md border px-3 py-1.5 bg-background focus-within:ring-1 ring-amber-500">
                    <span className="text-muted-foreground text-sm">A$</span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      placeholder={selectedRewardData ? String(selectedRewardData.amountCents / 100) : "10"}
                      value={customAmount}
                      onChange={e => { setCustomAmount(e.target.value); setSelectedReward(null); }}
                      className="flex-1 bg-transparent text-sm outline-none"
                    />
                  </div>

                  {isActive ? (
                    <Button
                      className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold"
                      size="lg"
                      disabled={backing || backAmount < 100}
                      onClick={handleBack}
                    >
                      {backing ? (
                        <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-black/40 border-t-black rounded-full animate-spin" />Processing…</span>
                      ) : (
                        <span className="flex items-center gap-2"><Heart className="w-4 h-4" />Back this project</span>
                      )}
                    </Button>
                  ) : (
                    <Button className="w-full hover:border-amber-500/50 hover:text-amber-400" variant="outline" disabled>
                      {campaign.status === "funded" ? "🎉 Funded — Campaign Closed" : "Campaign Ended"}
                    </Button>
                  )}

                  {isActive && (
                    <p className="text-xs text-center text-muted-foreground">
                      Virelle charges a 7% platform fee · Powered by Stripe
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Share */}
              <Button
                variant="outline"
                className="w-full hover:border-amber-500/50 hover:text-amber-400"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  toast.success("Link copied!");
                }}
              >
                <ExternalLink className="w-4 h-4 mr-2" />Share Campaign
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  