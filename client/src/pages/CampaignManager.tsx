import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Megaphone, Plus, Rocket, Globe, Users, Sparkles, Copy, ExternalLink,
  Trash2, Play, Pause, CheckCircle, Clock, AlertCircle, RefreshCw,
  Target, TrendingUp, Zap, Film, Palette, Monitor, MessageSquare,
  BarChart3, Share2, Twitter, Linkedin, Facebook, Code2, Calendar,
  Award, Handshake, BookOpen, Star, Briefcase,
} from "lucide-react";

const CONTENT_TYPES = [
  { value: "launch_announcement", label: "Launch Announcement", icon: Rocket, description: "Announce Virelle Studios to a new audience" },
  { value: "feature_showcase", label: "Feature Showcase", icon: Sparkles, description: "Highlight a specific feature" },
  { value: "behind_the_scenes", label: "Behind the Scenes", icon: Film, description: "Share how the AI pipeline works" },
  { value: "user_testimonial", label: "User Testimonial", icon: Users, description: "Share a user experience story" },
  { value: "comparison", label: "Comparison", icon: TrendingUp, description: "Traditional vs AI filmmaking" },
  { value: "tutorial_teaser", label: "Tutorial Teaser", icon: Monitor, description: "Tease a how-to guide" },
  { value: "milestone", label: "Milestone Update", icon: Target, description: "Share growth and achievements" },
  { value: "pitch_deck_teaser", label: "Pitch Deck Teaser", icon: Briefcase, description: "Tease your film pitch to investors" },
  { value: "industry_insight", label: "Industry Insight", icon: BookOpen, description: "Share AI filmmaking industry trends" },
  { value: "case_study", label: "Case Study", icon: Star, description: "Deep dive into a project success" },
  { value: "event_promotion", label: "Event Promotion", icon: Calendar, description: "Promote a screening or event" },
  { value: "award_submission", label: "Award Submission", icon: Award, description: "Announce festival or award entries" },
  { value: "collaboration_call", label: "Collaboration Call", icon: Handshake, description: "Find collaborators and partners" },
] as const;

const SCHEDULES = [
  { value: "once", label: "One-time" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Bi-weekly" },
  { value: "monthly", label: "Monthly" },
] as const;

const CATEGORY_ICONS: Record<string, any> = {
  film: Film, art: Palette, tech: Monitor, general: Globe,
};

const CATEGORY_LABELS: Record<string, string> = {
  film: "Film & Filmmaking", art: "Art & Creative", tech: "Tech & Startups", general: "Social Media",
};

const PLATFORM_SHARE_IDS: Record<string, string> = {
  twitter: "twitter", linkedin: "linkedin", reddit: "reddit", facebook: "facebook", tiktok: "tiktok",
};

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { color: string; icon: any }> = {
    draft: { color: "bg-muted text-muted-foreground", icon: Clock },
    active: { color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: Play },
    paused: { color: "bg-amber-500/10 text-amber-400 border-amber-500/20", icon: Pause },
    completed: { color: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: CheckCircle },
    success: { color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: CheckCircle },
    failed: { color: "bg-red-500/10 text-red-400 border-red-500/20", icon: AlertCircle },
    pending: { color: "bg-amber-500/10 text-amber-400 border-amber-500/20", icon: Clock },
    scheduled: { color: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: Clock },
  };
  const v = variants[status] || variants.draft;
  const Icon = v.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${v.color}`}>
      <Icon className="h-3 w-3" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function SocialShareButtons({ content, platforms }: { content: any; platforms: any[] }) {
  const platform = platforms.find((p: any) => p.id === content.platformId);
  const fullText = `${content.title}\n\n${content.body}\n\n${content.hashtags?.map((h: string) => `#${h}`).join(" ")}\n\n${content.callToAction}`;
  const encodedText = encodeURIComponent(fullText.slice(0, 280));
  const encodedUrl = encodeURIComponent("https://virelle.life");
  const encodedTitle = encodeURIComponent(content.title || "Virelle Studios");

  const shareLinks = [
    { label: "Twitter/X", icon: Twitter, url: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`, color: "hover:text-sky-400" },
    { label: "LinkedIn", icon: Linkedin, url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}&summary=${encodedText}`, color: "hover:text-blue-500" },
    { label: "Reddit", icon: Globe, url: `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`, color: "hover:text-orange-500" },
    { label: "Facebook", icon: Facebook, url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`, color: "hover:text-blue-600" },
  ];

  return (
    <div className="flex items-center gap-1 flex-wrap">
      <span className="text-xs text-muted-foreground mr-1">Share:</span>
      {shareLinks.map(({ label, icon: Icon, url, color }) => (
        <Button
          key={label}
          size="sm"
          variant="ghost"
          className={`h-7 px-2 text-muted-foreground ${color} transition-colors`}
          onClick={() => window.open(url, "_blank", "width=600,height=400")}
          title={`Share on ${label}`}
        >
          <Icon className="h-3 w-3 mr-1" />
          <span className="text-xs">{label}</span>
        </Button>
      ))}
      {platform?.url && (
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-muted-foreground hover:text-primary"
          onClick={() => window.open(platform.url, "_blank")}
          title={`Open ${platform.name}`}
        >
          <ExternalLink className="h-3 w-3 mr-1" />
          <span className="text-xs">{platform.name}</span>
        </Button>
      )}
    </div>
  );
}

function EmbedWidget({ title }: { title: string }) {
  const [showEmbed, setShowEmbed] = useState(false);
  const embedCode = `<iframe src="https://virelle.life/embed/ad?title=${encodeURIComponent(title)}" width="400" height="300" frameborder="0" style="border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,0.15)"></iframe>`;

  return (
    <>
      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setShowEmbed(true)}>
        <Code2 className="h-3 w-3 mr-1" />
        <span className="text-xs">Embed</span>
      </Button>
      <Dialog open={showEmbed} onOpenChange={setShowEmbed}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Embeddable Ad Widget</DialogTitle>
            <DialogDescription>Copy this code to embed this ad on any website</DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-3">
            <div className="p-3 bg-muted rounded-lg font-mono text-xs break-all">{embedCode}</div>
            <Button className="w-full" onClick={() => { navigator.clipboard.writeText(embedCode); toast.success("Embed code copied!"); }}>
              <Copy className="h-4 w-4 mr-2" /> Copy Embed Code
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function CampaignManager() {
  const [activeTab, setActiveTab] = useState("campaigns");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showContentDialog, setShowContentDialog] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [previewContent, setPreviewContent] = useState<any>(null);

  // Form state
  const [campaignName, setCampaignName] = useState("");
  const [contentType, setContentType] = useState<string>("launch_announcement");
  const [schedule, setSchedule] = useState<string>("once");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [customContext, setCustomContext] = useState("");

  // Quick generate state
  const [quickPlatform, setQuickPlatform] = useState<string>("");
  const [quickContentType, setQuickContentType] = useState<string>("feature_showcase");
  const [quickContext, setQuickContext] = useState("");

  // Queries
  const platformsQuery = trpc.advertising.platforms.useQuery();
  const campaignsQuery = trpc.advertising.listCampaigns.useQuery();
  const analyticsQuery = trpc.advertising.analytics.useQuery();

  // Mutations
  const createCampaignMut = trpc.advertising.createCampaign.useMutation({
    onSuccess: (campaign) => {
      toast.success("Campaign created!");
      setShowCreateDialog(false);
      setCampaignName("");
      setSelectedPlatforms([]);
      campaignsQuery.refetch();
      setSelectedCampaignId(campaign.id);
    },
    onError: (err) => toast.error(err.message),
  });

  const generateContentMut = trpc.advertising.generateContent.useMutation({
    onSuccess: (contents) => {
      toast.success(`Generated ${contents.length} ad variations!`);
      campaignsQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const generateSingleMut = trpc.advertising.generateSingleContent.useMutation({
    onSuccess: (content) => {
      setPreviewContent(content);
      setShowContentDialog(true);
      toast.success("Content generated!");
    },
    onError: (err) => toast.error(err.message),
  });

  const updateStatusMut = trpc.advertising.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Campaign status updated");
      campaignsQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const recordPostMut = trpc.advertising.recordPost.useMutation({
    onSuccess: () => {
      toast.success("Post recorded!");
      campaignsQuery.refetch();
      analyticsQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteCampaignMut = trpc.advertising.deleteCampaign.useMutation({
    onSuccess: () => {
      toast.success("Campaign deleted");
      setSelectedCampaignId(null);
      campaignsQuery.refetch();
      analyticsQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const togglePlatform = (id: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const platforms = platformsQuery.data?.platforms || [];
  const platformsByCategory = platformsQuery.data?.byCategory || {};
  const campaigns = campaignsQuery.data || [];
  const selectedCampaign = campaigns.find(c => c.id === selectedCampaignId);
  const analytics = analyticsQuery.data;

  // Select all platforms in a category
  const selectAllInCategory = (catPlatforms: any[]) => {
    const ids = catPlatforms.map((p: any) => p.id);
    const allSelected = ids.every(id => selectedPlatforms.includes(id));
    if (allSelected) {
      setSelectedPlatforms(prev => prev.filter(id => !ids.includes(id)));
    } else {
      setSelectedPlatforms(prev => [...new Set([...prev, ...ids])]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-primary" />
            Campaign Manager
          </h1>
          <p className="text-muted-foreground mt-1">
            Automated advertising across free film & art platforms
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Campaign
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Advertising Campaign</DialogTitle>
                <DialogDescription>
                  Set up an automated ad campaign across free film & art platforms
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 mt-4">
                {/* Campaign Name */}
                <div className="space-y-2">
                  <Label>Campaign Name</Label>
                  <Input
                    value={campaignName}
                    onChange={e => setCampaignName(e.target.value)}
                    placeholder="e.g., Launch Week Campaign"
                  />
                </div>

                {/* Content Type */}
                <div className="space-y-2">
                  <Label>Content Type</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                    {CONTENT_TYPES.map(ct => {
                      const Icon = ct.icon;
                      return (
                        <button
                          key={ct.value}
                          onClick={() => setContentType(ct.value)}
                          className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${
                            contentType === ct.value
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-muted-foreground/30"
                          }`}
                        >
                          <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${contentType === ct.value ? "text-primary" : "text-muted-foreground"}`} />
                          <div>
                            <p className="text-sm font-medium">{ct.label}</p>
                            <p className="text-xs text-muted-foreground">{ct.description}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Schedule */}
                <div className="space-y-2">
                  <Label>Schedule</Label>
                  <Select value={schedule} onValueChange={setSchedule}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SCHEDULES.map(s => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Platform Selection */}
                <div className="space-y-3">
                  <Label>Select Platforms ({selectedPlatforms.length} selected)</Label>
                  {Object.entries(platformsByCategory).map(([category, catPlatforms]) => {
                    const CategoryIcon = CATEGORY_ICONS[category] || Globe;
                    const catIds = (catPlatforms as any[]).map((p: any) => p.id);
                    const allSelected = catIds.every(id => selectedPlatforms.includes(id));
                    return (
                      <div key={category} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CategoryIcon className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{CATEGORY_LABELS[category] || category}</span>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 text-xs"
                            onClick={() => selectAllInCategory(catPlatforms as any[])}
                          >
                            {allSelected ? "Deselect All" : "Select All"}
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 ml-6">
                          {(catPlatforms as any[]).map((p: any) => (
                            <button
                              key={p.id}
                              onClick={() => togglePlatform(p.id)}
                              className={`flex items-center gap-2 p-2 rounded-lg border text-left text-sm transition-all ${
                                selectedPlatforms.includes(p.id)
                                  ? "border-primary bg-primary/5"
                                  : "border-border hover:border-muted-foreground/30"
                              }`}
                            >
                              <div className={`h-2 w-2 rounded-full shrink-0 ${selectedPlatforms.includes(p.id) ? "bg-primary" : "bg-muted"}`} />
                              <div className="min-w-0">
                                <p className="font-medium truncate">{p.name}</p>
                                <p className="text-xs text-muted-foreground truncate">{p.audienceType}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Custom Context */}
                <div className="space-y-2">
                  <Label>Custom Context (optional)</Label>
                  <Textarea
                    value={customContext}
                    onChange={e => setCustomContext(e.target.value)}
                    placeholder="Any additional context for the AI to use when generating ad copy..."
                    rows={3}
                  />
                </div>

                <Button
                  onClick={() => createCampaignMut.mutate({
                    name: campaignName,
                    platforms: selectedPlatforms,
                    contentType: contentType as any,
                    schedule: schedule as any,
                    customContext: customContext || undefined,
                  })}
                  disabled={!campaignName || selectedPlatforms.length === 0 || createCampaignMut.isPending}
                  className="w-full"
                >
                  {createCampaignMut.isPending ? (
                    <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Creating...</>
                  ) : (
                    <><Plus className="h-4 w-4 mr-2" /> Create Campaign</>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="quick-generate">Quick Generate</TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-1">
            <BarChart3 className="h-3 w-3" /> Analytics
          </TabsTrigger>
          <TabsTrigger value="platforms">Platforms</TabsTrigger>
        </TabsList>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="space-y-4 mt-4">
          {campaigns.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Megaphone className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-medium">No campaigns yet</h3>
                <p className="text-muted-foreground text-sm mt-1">Create your first advertising campaign to get started</p>
                <Button className="mt-4" onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" /> Create Campaign
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Campaign List */}
              <div className="space-y-2">
                {campaigns.map((campaign: any) => (
                  <button
                    key={campaign.id}
                    onClick={() => setSelectedCampaignId(campaign.id)}
                    className={`w-full text-left p-4 rounded-lg border transition-all ${
                      selectedCampaignId === campaign.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground/30"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-medium text-sm truncate">{campaign.name}</h3>
                      <StatusBadge status={campaign.status} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {campaign.platforms.length} platforms · {campaign.contentType.replace(/_/g, " ")}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {(campaign.postHistory || []).length} posts · {campaign.schedule}
                    </p>
                  </button>
                ))}
              </div>

              {/* Campaign Detail */}
              <div className="lg:col-span-2">
                {selectedCampaign ? (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <CardTitle>{selectedCampaign.name}</CardTitle>
                          <CardDescription>
                            {selectedCampaign.contentType.replace(/_/g, " ")} · {selectedCampaign.schedule}
                          </CardDescription>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {selectedCampaign.status === "draft" && (
                            <Button
                              size="sm"
                              onClick={() => updateStatusMut.mutate({ id: selectedCampaign.id, status: "active" })}
                            >
                              <Play className="h-3 w-3 mr-1" /> Activate
                            </Button>
                          )}
                          {selectedCampaign.status === "active" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateStatusMut.mutate({ id: selectedCampaign.id, status: "paused" })}
                            >
                              <Pause className="h-3 w-3 mr-1" /> Pause
                            </Button>
                          )}
                          {selectedCampaign.status === "paused" && (
                            <Button
                              size="sm"
                              onClick={() => updateStatusMut.mutate({ id: selectedCampaign.id, status: "active" })}
                            >
                              <Play className="h-3 w-3 mr-1" /> Resume
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => generateContentMut.mutate({ campaignId: selectedCampaign.id, customContext: customContext || undefined })}
                            disabled={generateContentMut.isPending}
                          >
                            {generateContentMut.isPending ? (
                              <><RefreshCw className="h-3 w-3 mr-1 animate-spin" /> Generating...</>
                            ) : (
                              <><Sparkles className="h-3 w-3 mr-1" /> Generate Content</>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteCampaignMut.mutate({ id: selectedCampaign.id })}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Stats Row */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="p-3 bg-muted/50 rounded-lg text-center">
                          <p className="text-2xl font-bold">{selectedCampaign.platforms.length}</p>
                          <p className="text-xs text-muted-foreground">Platforms</p>
                        </div>
                        <div className="p-3 bg-muted/50 rounded-lg text-center">
                          <p className="text-2xl font-bold">{(selectedCampaign.generatedContent || []).length}</p>
                          <p className="text-xs text-muted-foreground">Variations</p>
                        </div>
                        <div className="p-3 bg-muted/50 rounded-lg text-center">
                          <p className="text-2xl font-bold">{(selectedCampaign.postHistory || []).length}</p>
                          <p className="text-xs text-muted-foreground">Posts</p>
                        </div>
                      </div>

                      {/* Platforms */}
                      <div>
                        <h4 className="text-sm font-medium mb-2">Target Platforms</h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedCampaign.platforms.map((pId: string) => {
                            const p = platforms.find((pl: any) => pl.id === pId);
                            return (
                              <Badge key={pId} variant="secondary" className="gap-1 cursor-pointer" onClick={() => p?.url && window.open(p.url, "_blank")}>
                                <Globe className="h-3 w-3" />
                                {p?.name || pId}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>

                      {/* Generated Content */}
                      {(selectedCampaign.generatedContent || []).length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2">Generated Content ({(selectedCampaign.generatedContent || []).length})</h4>
                          <div className="space-y-3">
                            {(selectedCampaign.generatedContent || []).map((content: any, idx: number) => {
                              const p = platforms.find((pl: any) => pl.id === content.platformId);
                              return (
                                <div key={idx} className="border rounded-lg p-4 space-y-3">
                                  <div className="flex items-center justify-between flex-wrap gap-2">
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline">{p?.name || content.platformId}</Badge>
                                      <Badge variant="secondary" className="text-xs">{content.tone}</Badge>
                                    </div>
                                    <div className="flex gap-1 flex-wrap">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 px-2"
                                        onClick={() => copyToClipboard(`${content.title}\n\n${content.body}\n\n${content.hashtags?.map((h: string) => `#${h}`).join(" ")}\n\n${content.callToAction}`)}
                                      >
                                        <Copy className="h-3 w-3 mr-1" /> Copy
                                      </Button>
                                      <EmbedWidget title={content.title} />
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 px-2"
                                        onClick={() => recordPostMut.mutate({
                                          campaignId: selectedCampaign.id,
                                          platformId: content.platformId,
                                          status: "success",
                                          contentPreview: content.title,
                                        })}
                                      >
                                        <CheckCircle className="h-3 w-3 mr-1" /> Mark Posted
                                      </Button>
                                    </div>
                                  </div>
                                  <h5 className="font-medium">{content.title}</h5>
                                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{content.body}</p>
                                  {content.hashtags?.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                      {content.hashtags.map((tag: string, i: number) => (
                                        <span key={i} className="text-xs text-primary cursor-pointer" onClick={() => copyToClipboard(`#${tag}`)}>#{tag}</span>
                                      ))}
                                    </div>
                                  )}
                                  <p className="text-sm font-medium text-primary">{content.callToAction}</p>
                                  {/* Social Share Buttons */}
                                  <div className="pt-2 border-t">
                                    <SocialShareButtons content={content} platforms={platforms} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Post History */}
                      {(selectedCampaign.postHistory || []).length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2">Post History</h4>
                          <div className="space-y-2">
                            {(selectedCampaign.postHistory || []).map((post: any, idx: number) => (
                              <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                                <div className="flex items-center gap-3">
                                  <StatusBadge status={post.status} />
                                  <div>
                                    <p className="text-sm font-medium">{post.platformName}</p>
                                    <p className="text-xs text-muted-foreground">{post.contentPreview}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(post.postedAt).toLocaleDateString()}
                                  </span>
                                  {post.postUrl && (
                                    <Button size="sm" variant="ghost" onClick={() => window.open(post.postUrl, "_blank")}>
                                      <ExternalLink className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <MessageSquare className="h-8 w-8 text-muted-foreground/30 mb-3" />
                      <p className="text-muted-foreground text-sm">Select a campaign to view details</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Quick Generate Tab */}
        <TabsContent value="quick-generate" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Quick Content Generator
              </CardTitle>
              <CardDescription>
                Generate ad copy for a single platform instantly — no campaign needed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Platform</Label>
                  <Select value={quickPlatform} onValueChange={setQuickPlatform}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a platform" />
                    </SelectTrigger>
                    <SelectContent>
                      {platforms.map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Content Type</Label>
                  <Select value={quickContentType} onValueChange={setQuickContentType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTENT_TYPES.map(ct => (
                        <SelectItem key={ct.value} value={ct.value}>{ct.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Custom Context (optional)</Label>
                <Textarea
                  value={quickContext}
                  onChange={e => setQuickContext(e.target.value)}
                  placeholder="Any specific angle, feature, or message to focus on..."
                  rows={2}
                />
              </div>
              <Button
                onClick={() => generateSingleMut.mutate({
                  platformId: quickPlatform,
                  contentType: quickContentType as any,
                  customContext: quickContext || undefined,
                })}
                disabled={!quickPlatform || generateSingleMut.isPending}
              >
                {generateSingleMut.isPending ? (
                  <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Generating...</>
                ) : (
                  <><Sparkles className="h-4 w-4 mr-2" /> Generate Content</>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Preview Dialog */}
          <Dialog open={showContentDialog} onOpenChange={setShowContentDialog}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Generated Ad Content</DialogTitle>
                <DialogDescription>
                  {previewContent && `For ${platforms.find((p: any) => p.id === previewContent.platformId)?.name || previewContent.platformId}`}
                </DialogDescription>
              </DialogHeader>
              {previewContent && (
                <div className="space-y-4 mt-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline">{previewContent.contentType?.replace(/_/g, " ")}</Badge>
                    <Badge variant="secondary">{previewContent.tone}</Badge>
                  </div>
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <div className="p-3 bg-muted rounded-lg flex items-center justify-between">
                      <span className="font-medium">{previewContent.title}</span>
                      <Button size="sm" variant="ghost" onClick={() => copyToClipboard(previewContent.title)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Body</Label>
                    <div className="p-3 bg-muted rounded-lg relative">
                      <p className="text-sm whitespace-pre-wrap pr-8">{previewContent.body}</p>
                      <Button size="sm" variant="ghost" className="absolute top-2 right-2" onClick={() => copyToClipboard(previewContent.body)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Hashtags</Label>
                    <div className="flex flex-wrap gap-2">
                      {previewContent.hashtags?.map((tag: string, i: number) => (
                        <Badge key={i} variant="secondary" className="cursor-pointer" onClick={() => copyToClipboard(`#${tag}`)}>
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Call to Action</Label>
                    <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg flex items-center justify-between">
                      <span className="text-sm font-medium text-primary">{previewContent.callToAction}</span>
                      <Button size="sm" variant="ghost" onClick={() => copyToClipboard(previewContent.callToAction)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      className="flex-1"
                      onClick={() => {
                        const full = `${previewContent.title}\n\n${previewContent.body}\n\n${previewContent.hashtags?.map((h: string) => `#${h}`).join(" ")}\n\n${previewContent.callToAction}`;
                        copyToClipboard(full);
                      }}
                    >
                      <Copy className="h-4 w-4 mr-2" /> Copy Full Post
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        const p = platforms.find((pl: any) => pl.id === previewContent.platformId);
                        if (p?.url) window.open(p.url, "_blank");
                      }}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" /> Open Platform
                    </Button>
                  </div>
                  {/* Social Share Buttons in dialog */}
                  <div className="pt-3 border-t">
                    <p className="text-xs text-muted-foreground mb-2 font-medium flex items-center gap-1">
                      <Share2 className="h-3 w-3" /> Share directly:
                    </p>
                    <SocialShareButtons content={previewContent} platforms={platforms} />
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4 mt-4">
          {analyticsQuery.isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-3xl font-bold text-primary">{analytics?.totalCampaigns || 0}</p>
                    <p className="text-xs text-muted-foreground mt-1">Total Campaigns</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-3xl font-bold text-primary">{analytics?.totalPosts || 0}</p>
                    <p className="text-xs text-muted-foreground mt-1">Total Posts</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-3xl font-bold text-emerald-400">{analytics?.successRate || 0}%</p>
                    <p className="text-xs text-muted-foreground mt-1">Success Rate</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-3xl font-bold text-blue-400">{platforms.length}</p>
                    <p className="text-xs text-muted-foreground mt-1">Available Platforms</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Platform Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Globe className="h-4 w-4 text-primary" />
                      Platform Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(analytics?.platformBreakdown || []).length === 0 ? (
                      <div className="text-center py-8">
                        <BarChart3 className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">No data yet — create campaigns to see analytics</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {(analytics?.platformBreakdown || []).map((item: any) => {
                          const maxCount = Math.max(...(analytics?.platformBreakdown || []).map((i: any) => i.count));
                          return (
                            <div key={item.platform} className="space-y-1">
                              <div className="flex items-center justify-between text-sm">
                                <span className="font-medium capitalize">{item.platform.replace(/_/g, " ")}</span>
                                <span className="text-muted-foreground">{item.count} campaigns</span>
                              </div>
                              <Progress value={(item.count / maxCount) * 100} className="h-2" />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Content Type Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Content Type Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(analytics?.contentTypeBreakdown || []).length === 0 ? (
                      <div className="text-center py-8">
                        <BarChart3 className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">No data yet — create campaigns to see analytics</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {(analytics?.contentTypeBreakdown || []).map((item: any) => {
                          const maxCount = Math.max(...(analytics?.contentTypeBreakdown || []).map((i: any) => i.count));
                          const ct = CONTENT_TYPES.find(c => c.value === item.type);
                          return (
                            <div key={item.type} className="space-y-1">
                              <div className="flex items-center justify-between text-sm">
                                <span className="font-medium">{ct?.label || item.type.replace(/_/g, " ")}</span>
                                <span className="text-muted-foreground">{item.count}</span>
                              </div>
                              <Progress value={(item.count / maxCount) * 100} className="h-2" />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(analytics?.recentActivity || []).length === 0 ? (
                    <div className="text-center py-8">
                      <MessageSquare className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No recent activity — start posting to see your history here</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(analytics?.recentActivity || []).map((activity: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <StatusBadge status={activity.status} />
                            <div>
                              <p className="text-sm font-medium">{activity.campaign}</p>
                              <p className="text-xs text-muted-foreground">{activity.platformName} · {activity.contentPreview}</p>
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(activity.postedAt).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Advertising Tips */}
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Free Advertising Tips
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    {[
                      { tip: "Post on Reddit film communities during weekday evenings (6-9pm EST) for maximum engagement" },
                      { tip: "LinkedIn posts with industry insights get 3x more reach than promotional content" },
                      { tip: "Use 3-5 hashtags on Instagram — more than 10 actually reduces reach" },
                      { tip: "Twitter/X threads about AI filmmaking consistently outperform single tweets" },
                      { tip: "Engage with comments within the first hour of posting to boost algorithm ranking" },
                      { tip: "Cross-post to multiple subreddits but customize the title for each community" },
                    ].map((item, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <p className="text-muted-foreground">{item.tip}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Platforms Tab */}
        <TabsContent value="platforms" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{platforms.length} free platforms available for advertising</p>
          </div>
          {Object.entries(platformsByCategory).map(([category, catPlatforms]) => {
            const CategoryIcon = CATEGORY_ICONS[category] || Globe;
            return (
              <div key={category}>
                <h3 className="text-lg font-medium flex items-center gap-2 mb-3">
                  <CategoryIcon className="h-5 w-5 text-primary" />
                  {CATEGORY_LABELS[category] || category}
                  <Badge variant="secondary" className="text-xs">{(catPlatforms as any[]).length}</Badge>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(catPlatforms as any[]).map((p: any) => (
                    <Card key={p.id} className="overflow-hidden hover:border-primary/30 transition-colors">
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-sm">{p.name}</h4>
                          <Badge variant="outline" className="text-[10px]">{p.type}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{p.description}</p>
                        <div className="space-y-1 text-xs">
                          <p><span className="text-muted-foreground">Audience:</span> {p.audienceType}</p>
                          <p><span className="text-muted-foreground">Best time:</span> {p.bestTimeToPost}</p>
                          <p><span className="text-muted-foreground">Cooldown:</span> {p.cooldownHours < 24 ? `${p.cooldownHours}h` : `${Math.round(p.cooldownHours / 24)}d`}</p>
                        </div>
                        <div className="flex gap-1 pt-1 flex-wrap">
                          {p.supportsImages && <Badge variant="secondary" className="text-[10px]">Images</Badge>}
                          {p.supportsLinks && <Badge variant="secondary" className="text-[10px]">Links</Badge>}
                          {p.maxPostLength && <Badge variant="secondary" className="text-[10px]">{p.maxPostLength} chars</Badge>}
                        </div>
                        <div className="flex gap-2 pt-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => window.open(p.url, "_blank")}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" /> Visit
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="flex-1"
                            onClick={() => {
                              setQuickPlatform(p.id);
                              setActiveTab("quick-generate");
                            }}
                          >
                            <Zap className="h-3 w-3 mr-1" /> Generate
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
}
