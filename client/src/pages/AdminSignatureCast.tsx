import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Crown, Sparkles, Users, DollarSign, Shield, Eye, EyeOff,
  TrendingUp, BarChart3, Lock, Unlock, AlertTriangle, CheckCircle2,
  Edit, Save, X, RefreshCw,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

// ─── ACTOR REGISTRY (mirrors server signatureCast.ts) ──────────────────────
const ACTOR_REGISTRY = [
  { id: "julian-vance",    name: "Julian Vance",        tier: "flagship", commercialEligible: true,  featured: true,  retired: false, restricted: false },
  { id: "elena-rostova",   name: "Elena Rostova",       tier: "flagship", commercialEligible: true,  featured: true,  retired: false, restricted: false },
  { id: "sofia-reyes",     name: "Sofia Reyes",         tier: "flagship", commercialEligible: true,  featured: false, retired: false, restricted: false },
  { id: "kofi-adebayo",    name: "Kofi Adebayo",        tier: "flagship", commercialEligible: true,  featured: false, retired: false, restricted: false },
  { id: "kenji-sato",      name: "Kenji Sato",          tier: "premium",  commercialEligible: true,  featured: false, retired: false, restricted: false },
  { id: "nina-cross",      name: "Nina Cross",          tier: "premium",  commercialEligible: true,  featured: true,  retired: false, restricted: false },
  { id: "celeste-vale",    name: "Celeste Vale",        tier: "premium",  commercialEligible: true,  featured: true,  retired: false, restricted: false },
  { id: "viktor-saric",    name: "Viktor Saric",        tier: "premium",  commercialEligible: true,  featured: true,  retired: false, restricted: false },
  { id: "camille-dubois",  name: "Camille Dubois",      tier: "premium",  commercialEligible: true,  featured: false, retired: false, restricted: false },
  { id: "marcus-cross",    name: "Marcus Cross",        tier: "standard", commercialEligible: false, featured: false, retired: false, restricted: false },
  { id: "jaden-cross",     name: "Jaden Cross",         tier: "standard", commercialEligible: false, featured: false, retired: false, restricted: false },
  { id: "mavis-whitlock",  name: "Mavis Whitlock",      tier: "standard", commercialEligible: false, featured: false, retired: false, restricted: false },
  { id: "tariq-haddad",    name: "Tariq Haddad",        tier: "standard", commercialEligible: false, featured: false, retired: false, restricted: false },
  { id: "yasmine-haddad",  name: "Yasmine Haddad",      tier: "standard", commercialEligible: false, featured: false, retired: false, restricted: false },
  { id: "zayn-haddad",     name: "Zayn Haddad",         tier: "standard", commercialEligible: false, featured: false, retired: false, restricted: false },
  { id: "big-sasha",       name: "Big Sasha (Petrovic)", tier: "standard", commercialEligible: false, featured: false, retired: false, restricted: false },
];

const TIER_PRICES = {
  standard: { creator: 15,  commercial: 94,  episodic: 60  },
  premium:  { creator: 39,  commercial: 118, episodic: 156 },
  flagship: { creator: 99,  commercial: 178, episodic: 396 },
};

type ActorConfig = typeof ACTOR_REGISTRY[0];

function TierBadge({ tier }: { tier: string }) {
  if (tier === "flagship") return <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs gap-1"><Crown className="w-3 h-3" />Flagship</Badge>;
  if (tier === "premium")  return <Badge className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs gap-1"><Sparkles className="w-3 h-3" />Premium</Badge>;
  return <Badge className="bg-zinc-700/50 text-zinc-400 border border-zinc-600/30 text-xs">Standard</Badge>;
}

export default function AdminSignatureCast() {
  const [actors, setActors] = useState<ActorConfig[]>(ACTOR_REGISTRY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<ActorConfig>>({});
  const [activeTab, setActiveTab] = useState("actors");

   const analyticsQuery = trpc.signatureCast.adminAnalytics.useQuery(undefined, {
    retry: false,
  });
  const entitlementsQuery = trpc.signatureCast.adminEntitlements.useQuery(undefined, {
    retry: false,
  });

  const startEdit = (actor: ActorConfig) => {
    setEditingId(actor.id);
    setEditDraft({ ...actor });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft({});
  };

  const saveEdit = (id: string) => {
    setActors((prev) => prev.map((a) => a.id === id ? { ...a, ...editDraft } : a));
    setEditingId(null);
    setEditDraft({});
    toast.success("Actor config updated (local). Push to server config to persist.");
  };

  const analytics = analyticsQuery.data as any;
  const entitlements = entitlementsQuery.data as any[];

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Crown className="w-6 h-6 text-amber-400" />
              Signature Cast Admin
            </h1>
            <p className="text-sm text-zinc-400 mt-1">Actor tier config, pricing, commercial eligibility, analytics</p>
          </div>
          <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-sm px-3 py-1">
            {actors.filter((a) => !a.retired).length} Active Actors
          </Badge>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total Unlocks", value: analytics?.totalUnlocks ?? "—", icon: Unlock, color: "text-amber-400" },
            { label: "Revenue (AUD)", value: analytics?.totalRevenue ? `A$${(analytics.totalRevenue / 100).toFixed(0)}` : "—", icon: DollarSign, color: "text-emerald-400" },
            { label: "Active Licenses", value: entitlements?.length ?? "—", icon: CheckCircle2, color: "text-blue-400" },
            { label: "Conversion Rate", value: analytics?.conversionRate ? `${analytics.conversionRate}%` : "—", icon: TrendingUp, color: "text-purple-400" },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="border-zinc-800 bg-zinc-900/50">
              <CardContent className="p-4 flex items-center gap-3">
                <Icon className={`w-5 h-5 ${color}`} />
                <div>
                  <p className="text-xs text-zinc-500">{label}</p>
                  <p className="text-lg font-bold text-white">{value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-zinc-900 border border-zinc-800">
            <TabsTrigger value="actors" className="text-sm">Actor Config</TabsTrigger>
            <TabsTrigger value="pricing" className="text-sm">Pricing</TabsTrigger>
            <TabsTrigger value="entitlements" className="text-sm">Active Licenses</TabsTrigger>
            <TabsTrigger value="analytics" className="text-sm">Analytics</TabsTrigger>
          </TabsList>

          {/* ── ACTOR CONFIG TAB ── */}
          <TabsContent value="actors" className="mt-4">
            <Card className="border-zinc-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-zinc-300">Actor Registry — Tier, Commercial Eligibility, Featured, Retired, Restricted</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {actors.map((actor) => (
                    <div key={actor.id} className="flex items-center gap-3 p-3 rounded-lg border border-zinc-800 bg-zinc-900/30">
                      {editingId === actor.id ? (
                        // Edit mode
                        <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div>
                            <Label className="text-xs text-zinc-500">Name</Label>
                            <Input
                              value={editDraft.name ?? actor.name}
                              onChange={(e) => setEditDraft((d) => ({ ...d, name: e.target.value }))}
                              className="h-7 text-xs mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-zinc-500">Tier</Label>
                            <Select
                              value={editDraft.tier ?? actor.tier}
                              onValueChange={(v) => setEditDraft((d) => ({ ...d, tier: v }))}
                            >
                              <SelectTrigger className="h-7 text-xs mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="standard">Standard</SelectItem>
                                <SelectItem value="premium">Premium</SelectItem>
                                <SelectItem value="flagship">Flagship</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={editDraft.commercialEligible ?? actor.commercialEligible}
                                onCheckedChange={(v) => setEditDraft((d) => ({ ...d, commercialEligible: v }))}
                                className="scale-75"
                              />
                              <Label className="text-xs text-zinc-400">Commercial</Label>
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={editDraft.featured ?? actor.featured}
                                onCheckedChange={(v) => setEditDraft((d) => ({ ...d, featured: v }))}
                                className="scale-75"
                              />
                              <Label className="text-xs text-zinc-400">Featured</Label>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={editDraft.retired ?? actor.retired}
                                onCheckedChange={(v) => setEditDraft((d) => ({ ...d, retired: v }))}
                                className="scale-75"
                              />
                              <Label className="text-xs text-zinc-400">Retired</Label>
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={editDraft.restricted ?? actor.restricted}
                                onCheckedChange={(v) => setEditDraft((d) => ({ ...d, restricted: v }))}
                                className="scale-75"
                              />
                              <Label className="text-xs text-zinc-400">Restricted</Label>
                            </div>
                          </div>
                          <div className="col-span-2 md:col-span-4 flex gap-2 justify-end">
                            <Button size="sm" variant="outline" onClick={cancelEdit} className="h-7 text-xs border-zinc-700">
                              <X className="w-3 h-3 mr-1" /> Cancel
                            </Button>
                            <Button size="sm" onClick={() => saveEdit(actor.id)} className="h-7 text-xs bg-amber-500 text-black hover:bg-amber-400">
                              <Save className="w-3 h-3 mr-1" /> Save
                            </Button>
                          </div>
                        </div>
                      ) : (
                        // View mode
                        <>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-white">{actor.name}</span>
                              <TierBadge tier={actor.tier} />
                              {actor.featured && <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs">Featured</Badge>}
                              {actor.retired && <Badge className="bg-zinc-700/50 text-zinc-500 border border-zinc-600/30 text-xs"><EyeOff className="w-2.5 h-2.5 mr-1" />Retired</Badge>}
                              {actor.restricted && <Badge className="bg-red-500/10 text-red-400 border border-red-500/20 text-xs"><AlertTriangle className="w-2.5 h-2.5 mr-1" />Restricted</Badge>}
                            </div>
                            <p className="text-xs text-zinc-500 mt-0.5">
                              {actor.commercialEligible ? "✓ Commercial eligible" : "✗ Non-commercial only"}
                              {" · "}ID: {actor.id}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => startEdit(actor)}
                            className="h-7 text-xs text-zinc-400 hover:text-white"
                          >
                            <Edit className="w-3 h-3 mr-1" /> Edit
                          </Button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── PRICING TAB ── */}
          <TabsContent value="pricing" className="mt-4">
            <Card className="border-zinc-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-zinc-300">License Pricing by Tier (AUD)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-800">
                        <th className="text-left py-2 text-xs text-zinc-500 font-medium">Tier</th>
                        <th className="text-right py-2 text-xs text-zinc-500 font-medium">Creator</th>
                        <th className="text-right py-2 text-xs text-zinc-500 font-medium">Commercial</th>
                        <th className="text-right py-2 text-xs text-zinc-500 font-medium">Episodic</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(["standard", "premium", "flagship"] as const).map((tier) => (
                        <tr key={tier} className="border-b border-zinc-800/50">
                          <td className="py-3"><TierBadge tier={tier} /></td>
                          <td className="text-right py-3 text-white font-mono">A${TIER_PRICES[tier].creator}</td>
                          <td className="text-right py-3 text-white font-mono">A${TIER_PRICES[tier].commercial}</td>
                          <td className="text-right py-3 text-white font-mono">A${TIER_PRICES[tier].episodic}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
                  <p className="text-xs text-zinc-400">
                    <strong className="text-white">Commercial = Creator + A$79 add-on.</strong>{" "}
                    Episodic = Creator × 4. Prices are configured in{" "}
                    <code className="text-amber-400">server/_core/signatureCast.ts</code> and provisioned to Stripe on server boot.
                  </p>
                </div>
                <div className="mt-3 p-3 rounded-lg bg-red-950/20 border border-red-900/30">
                  <div className="flex items-start gap-2">
                    <Shield className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-red-400">
                      <strong>Brand Safety Policy:</strong> All licenses prohibit pornographic use, explicit sexual content, adult-industry use, and sexual exploitation content.
                      Provocative scenes, sensuality, and prestige adult drama are permitted. This restriction is enforced in the unlock flow, terms of service, and server-side content moderation.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── ACTIVE LICENSES TAB ── */}
          <TabsContent value="entitlements" className="mt-4">
            <Card className="border-zinc-800">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-sm text-zinc-300">All Active Actor Licenses</CardTitle>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => entitlementsQuery.refetch()}
                  className="h-7 text-xs text-zinc-400"
                >
                  <RefreshCw className="w-3 h-3 mr-1" /> Refresh
                </Button>
              </CardHeader>
              <CardContent>
                {!entitlements || entitlements.length === 0 ? (
                  <div className="text-center py-8 text-zinc-500">
                    <Lock className="w-8 h-8 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No active licenses yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-zinc-800">
                          <th className="text-left py-2 text-zinc-500 font-medium">User ID</th>
                          <th className="text-left py-2 text-zinc-500 font-medium">Actor</th>
                          <th className="text-left py-2 text-zinc-500 font-medium">License</th>
                          <th className="text-left py-2 text-zinc-500 font-medium">Project</th>
                          <th className="text-right py-2 text-zinc-500 font-medium">Amount</th>
                          <th className="text-right py-2 text-zinc-500 font-medium">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entitlements.map((e: any, i: number) => (
                          <tr key={i} className="border-b border-zinc-800/50">
                            <td className="py-2 text-zinc-400">{e.userId}</td>
                            <td className="py-2 text-white font-medium">{e.actorId}</td>
                            <td className="py-2">
                              <Badge className={`text-xs ${
                                e.licenseType === "commercial" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                                e.licenseType === "episodic"   ? "bg-purple-500/10 text-purple-400 border-purple-500/20" :
                                "bg-zinc-700/50 text-zinc-400 border-zinc-600/30"
                              } border`}>
                                {e.licenseType}
                              </Badge>
                            </td>
                            <td className="py-2 text-zinc-500">{e.projectId ?? "—"}</td>
                            <td className="py-2 text-right text-white font-mono">
                              {e.amountPaidAud ? `A$${(e.amountPaidAud / 100).toFixed(2)}` : "—"}
                            </td>
                            <td className="py-2 text-right text-zinc-500">
                              {e.createdAt ? new Date(e.createdAt).toLocaleDateString() : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── ANALYTICS TAB ── */}
          <TabsContent value="analytics" className="mt-4">
            <Card className="border-zinc-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-zinc-300">Revenue & Conversion Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                {!analytics ? (
                  <div className="text-center py-8 text-zinc-500">
                    <BarChart3 className="w-8 h-8 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Analytics loading…</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {[
                        { label: "Profile Views", value: analytics.profileViews ?? 0 },
                        { label: "Unlock Modal Opens", value: analytics.unlockModalOpens ?? 0 },
                        { label: "Checkouts Started", value: analytics.checkoutsStarted ?? 0 },
                        { label: "Checkouts Completed", value: analytics.checkoutsCompleted ?? 0 },
                        { label: "Total Revenue (AUD)", value: analytics.totalRevenue ? `A$${(analytics.totalRevenue / 100).toFixed(2)}` : "A$0" },
                        { label: "Avg License Value", value: analytics.avgLicenseValue ? `A$${(analytics.avgLicenseValue / 100).toFixed(2)}` : "—" },
                      ].map(({ label, value }) => (
                        <div key={label} className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800">
                          <p className="text-xs text-zinc-500">{label}</p>
                          <p className="text-xl font-bold text-white mt-1">{value}</p>
                        </div>
                      ))}
                    </div>
                    {analytics.byActor && analytics.byActor.length > 0 && (
                      <div>
                        <p className="text-xs text-zinc-500 mb-2 font-medium uppercase tracking-wider">Revenue by Actor</p>
                        <div className="space-y-1.5">
                          {analytics.byActor.map((row: any) => (
                            <div key={row.actorId} className="flex items-center justify-between text-xs">
                              <span className="text-zinc-300">{row.actorId}</span>
                              <div className="flex items-center gap-3">
                                <span className="text-zinc-500">{row.unlocks} unlocks</span>
                                <span className="text-white font-mono">A${(row.revenue / 100).toFixed(2)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
