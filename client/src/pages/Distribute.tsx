import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  ArrowLeft,
  BarChart2,
  CheckCircle2,
  Circle,
  Copy,
  Download,
  ExternalLink,
  Film,
  Globe,
  Instagram,
  Loader2,
  Megaphone,
  RefreshCw,
  Share2,
  Sparkles,
  Star,
  User,
  Youtube,
  Zap,
} from "lucide-react";

// TikTok icon (not in lucide-react)
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.77a4.85 4.85 0 01-1.01-.08z" />
    </svg>
  );
}

const PLATFORM_CONFIGS = [
  {
    key: "tiktok" as const,
    label: "TikTok",
    icon: TikTokIcon,
    description: "Vertical 9:16 · 60s max",
    color: "text-pink-500",
    bg: "bg-pink-500/10 border-pink-500/20",
  },
  {
    key: "instagram" as const,
    label: "Instagram Reels",
    icon: Instagram,
    description: "Vertical 9:16 · 90s max",
    color: "text-purple-500",
    bg: "bg-purple-500/10 border-purple-500/20",
  },
  {
    key: "youtubeShorts" as const,
    label: "YouTube Shorts",
    icon: Youtube,
    description: "Vertical 9:16 · 60s max",
    color: "text-red-500",
    bg: "bg-red-500/10 border-red-500/20",
  },
  {
    key: "square" as const,
    label: "Square Cut",
    icon: Share2,
    description: "Square 1:1 · All platforms",
    color: "text-blue-500",
    bg: "bg-blue-500/10 border-blue-500/20",
  },
];

export default function Distribute() {
  const { id } = useParams<{ id: string }>();
  const projectId = parseInt(id || "0", 10);
  const [slug, setSlug] = useState("");
  const [pageTitle, setPageTitle] = useState("");
  const [pageDescription, setPageDescription] = useState("");
  const [showCreatorName, setShowCreatorName] = useState(true);
  const [allowShowcase, setAllowShowcase] = useState(true);
  const [isPublic, setIsPublic] = useState(false);
  const [slugEdited, setSlugEdited] = useState(false);

  // Queries
  const { data: promoStatus, refetch: refetchStatus, isLoading: statusLoading } =
    trpc.distribute.getPromoStatus.useQuery({ projectId }, { enabled: !!projectId });

  const { data: promoAssets, refetch: refetchAssets } =
    trpc.distribute.getPromoAssets.useQuery({ projectId }, { enabled: !!projectId });

  // Phase 2: analytics for the film page
  const filmPageId = (promoStatus?.filmPage as any)?.id ?? 0;
  const { data: filmPageStats } = trpc.analytics.getStats.useQuery(
    { entityType: "filmPage", entityId: filmPageId },
    { enabled: !!filmPageId && !!promoStatus?.isPublished }
  );

  // Initialise slug and film page fields from server data (only once, on first load)
  useEffect(() => {
    if (!promoStatus || slugEdited) return;
    setSlug(promoStatus.slug || "");
    if (promoStatus.filmPage) {
      const fp = promoStatus.filmPage as any;
      setPageTitle(fp.title || "");
      setPageDescription(fp.description || "");
      setShowCreatorName(fp.showCreatorName ?? true);
      setAllowShowcase(fp.allowShowcase ?? true);
      setIsPublic(fp.isPublic ?? false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promoStatus]);

  // Mutations
  const generateAssets = trpc.distribute.generatePromoAssets.useMutation({
    onSuccess: () => {
      toast.success("Promo assets generated! Captions, hashtags, and hooks are ready.");
      refetchAssets();
    },
    onError: (e) => toast.error(e.message),
  });

  const createPromoExport = trpc.distribute.createPromoExport.useMutation({
    onSuccess: () => {
      toast.success("Export started! Your promo cut is being rendered with the VirElle opener.");
      refetchStatus();
    },
    onError: (e) => toast.error(e.message),
  });

  const publishFilmPage = trpc.distribute.publishFilmPage.useMutation({
    onSuccess: (data) => {
      toast.success(isPublic ? `Film page published! Live at virellestudios.com${data.url}` : "Film page saved as draft.");
      refetchStatus();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSlugChange = (v: string) => {
    setSlugEdited(true);
    setSlug(v.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-"));
  };

  const copySlug = () => {
    navigator.clipboard.writeText(`https://virellestudios.com/films/${slug}`);
    toast.success("Link copied!");
  };

  // Phase 2: Download promo pack (all generated assets as a text file)
  const downloadPromoPack = () => {
    if (!promoAssets || (promoAssets as any[]).length === 0) {
      toast.error("Generate promo assets first.");
      return;
    }
    const content = (promoAssets as any[]).map((a: any) =>
      `=== ${a.type?.toUpperCase()} ${a.variant ? `(${a.variant})` : ""} ===\n${a.content}\n`
    ).join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug || "promo"}-pack.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Promo pack downloaded!");
  };

  // Phase 2: Submit for feature (admin curation)
  const submitForFeatureMutation = trpc.submissions.submit.useMutation({
    onSuccess: () => {
      toast.success("Submitted for editorial review! Our team will review your film within 5–7 business days.");
    },
    onError: (e) => toast.error(e.message),
  });
  const submitForFeature = () => {
    if (!promoStatus?.isPublished) {
      toast.error("Publish your film page first before submitting for feature.");
      return;
    }
    submitForFeatureMutation.mutate({ projectId });
  };

  const exports = (promoStatus?.exports || {}) as Record<string, boolean>;

  const readinessItems = [
    { label: "Trailer exported", done: !!exports.trailer },
    { label: "TikTok cut exported", done: !!exports.tiktok },
    { label: "Instagram Reels cut exported", done: !!exports.instagram },
    { label: "YouTube Shorts cut exported", done: !!exports.youtubeShorts },
    { label: "Promo captions & hashtags generated", done: !!promoStatus?.promoAssetsGenerated },
    { label: "Film page published", done: !!promoStatus?.isPublished },
  ];
  const readinessScore = readinessItems.filter((i) => i.done).length;
  const isFullyReady = readinessScore === readinessItems.length;

  if (statusLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8 space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <Link href={`/projects/${projectId}`}>
          <Button variant="ghost" size="sm" className="gap-2 self-start">
            <ArrowLeft className="w-4 h-4" />
            Back to project
          </Button>
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Megaphone className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" />
            Distribute
          </h1>
          <p className="text-sm text-muted-foreground">Publish your film and create platform-ready promo cuts</p>
        </div>
      </div>

      {/* Phase 2: Analytics Snapshot (only shown when film page is published) */}
      {promoStatus?.isPublished && filmPageStats && (
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-amber-500" />
              <CardTitle className="text-sm">Film Page Analytics</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-amber-500">{filmPageStats.views ?? 0}</div>
                <div className="text-xs text-muted-foreground">Page Views</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-amber-500">{filmPageStats.plays ?? 0}</div>
                <div className="text-xs text-muted-foreground">Video Plays</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-amber-500">{filmPageStats.shares ?? 0}</div>
                <div className="text-xs text-muted-foreground">Shares</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Readiness Checklist */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Distribution Readiness</CardTitle>
            <Badge
              variant={isFullyReady ? "default" : "secondary"}
              className={isFullyReady ? "bg-green-600" : ""}
            >
              {readinessScore}/{readinessItems.length} complete
            </Badge>
          </div>
          <div className="w-full bg-muted rounded-full h-2 mt-2">
            <div
              className="bg-amber-500 h-2 rounded-full transition-all"
              style={{ width: `${(readinessScore / readinessItems.length) * 100}%` }}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
            {readinessItems.map((item) => (
              <div key={item.label} className="flex items-center gap-2 text-sm">
                {item.done ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
                <span className={item.done ? "text-foreground" : "text-muted-foreground"}>{item.label}</span>
              </div>
            ))}
          </div>

          {/* Phase 2: Submit for Feature CTA */}
          {isFullyReady && (
            <div className="mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-amber-500" />
                    Ready for editorial feature
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Your film is fully distributed. Submit it for a chance to be featured on the VirElle Showcase.
                  </p>
                </div>
                <Button
                  size="sm"
                  className="gap-2 bg-amber-500 hover:bg-amber-600 text-black shrink-0"
                  onClick={submitForFeature}
                  disabled={submitForFeatureMutation.isPending}
                >
                  <Star className="w-3.5 h-3.5" />
                  {submitForFeatureMutation.isPending ? "Submitting…" : "Submit for Feature"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="exports">
        <TabsList className="flex w-full overflow-x-auto sm:grid sm:grid-cols-4 sm:max-w-2xl">
          <TabsTrigger value="exports" className="shrink-0 sm:shrink">
            <Film className="w-4 h-4 mr-1" />
            Exports
          </TabsTrigger>
          <TabsTrigger value="assets" className="shrink-0 sm:shrink">
            <Sparkles className="w-4 h-4 mr-1" />
            Promo Copy
          </TabsTrigger>
          <TabsTrigger value="filmpage" className="shrink-0 sm:shrink">
            <Globe className="w-4 h-4 mr-1" />
            Film Page
          </TabsTrigger>
          <TabsTrigger value="profile" className="shrink-0 sm:shrink">
            <User className="w-4 h-4 mr-1" />
            Profile
          </TabsTrigger>
        </TabsList>

        {/* ── Exports Tab ── */}
        <TabsContent value="exports" className="space-y-4 mt-4">
          <p className="text-sm text-muted-foreground">
            Every export automatically prepends the <strong>VirElle Studios opener</strong> as opening credits.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {PLATFORM_CONFIGS.map((platform) => {
              const done = !!(exports as any)[platform.key];
              const exportUrl = (promoStatus as any)?.[`${platform.key}Url`] || null;
              return (
                <Card key={platform.key} className={`border ${platform.bg}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <platform.icon className={`w-5 h-5 ${platform.color}`} />
                        <CardTitle className="text-sm">{platform.label}</CardTitle>
                      </div>
                      {done && <Badge className="bg-green-600 text-xs">Done</Badge>}
                    </div>
                    <CardDescription className="text-xs">{platform.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button
                      size="sm"
                      variant={done ? "outline" : "default"}
                      className="w-full gap-2"
                      disabled={createPromoExport.isPending}
                      onClick={() => createPromoExport.mutate({ projectId, platform: platform.key })}
                    >
                      {createPromoExport.isPending ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : done ? (
                        <RefreshCw className="w-3 h-3" />
                      ) : (
                        <Zap className="w-3 h-3" />
                      )}
                      {done ? "Re-export" : "Export"}
                    </Button>
                    {/* Phase 2: Download link when export is ready */}
                    {done && exportUrl && (
                      <a href={exportUrl} download target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="ghost" className="w-full gap-2 text-xs">
                          <Download className="w-3 h-3" />
                          Download
                        </Button>
                      </a>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Separator />

          {/* Trailer export reminder */}
          <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 border">
            <Film className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Trailer</p>
              <p className="text-xs text-muted-foreground">
                Export a full trailer from the{" "}
                <Link href={`/projects/${projectId}`} className="underline text-amber-500">
                  project Export tab
                </Link>
                . Trailers also include the VirElle opener automatically.
              </p>
              <Badge className={exports.trailer ? "bg-green-600 mt-1" : "mt-1"} variant={exports.trailer ? "default" : "secondary"}>
                {exports.trailer ? "Exported" : "Not yet exported"}
              </Badge>
            </div>
          </div>
        </TabsContent>

        {/* ── Promo Copy Tab ── */}
        <TabsContent value="assets" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              AI-generated captions, hashtags, and hooks for each platform.
            </p>
            <div className="flex items-center gap-2">
              {/* Phase 2: Download promo pack */}
              {promoAssets && (promoAssets as any[]).length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  onClick={downloadPromoPack}
                >
                  <Download className="w-3 h-3" />
                  Download Pack
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                disabled={generateAssets.isPending}
                onClick={() => generateAssets.mutate({ projectId })}
              >
                {generateAssets.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                {promoStatus?.promoAssetsGenerated ? "Regenerate" : "Generate"}
              </Button>
            </div>
          </div>

          {promoAssets && (promoAssets as any[]).length > 0 ? (
            <div className="space-y-3">
              {(promoAssets as any[]).map((asset: any) => (
                <Card key={asset.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs capitalize">
                          {asset.type}
                        </Badge>
                        {asset.variant && (
                          <Badge variant="secondary" className="text-xs capitalize">
                            {asset.variant}
                          </Badge>
                        )}
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => {
                          navigator.clipboard.writeText(asset.content);
                          toast.success("Copied!");
                        }}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{asset.content}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg bg-muted/20">
              <Sparkles className="w-10 h-10 text-muted-foreground mb-3" />
              <p className="text-sm font-medium">No promo assets yet</p>
              <p className="text-xs text-muted-foreground mt-1">Click "Generate" to create AI-powered captions and hashtags.</p>
            </div>
          )}
        </TabsContent>

        {/* ── Film Page Tab ── */}
        <TabsContent value="filmpage" className="space-y-5 mt-4">
          <p className="text-sm text-muted-foreground">
            Create a public landing page for your film at{" "}
            <span className="font-mono text-xs bg-muted px-1 py-0.5 rounded">virellestudios.com/films/your-slug</span>
          </p>

          <div className="space-y-4">
            {/* Slug */}
            <div className="space-y-1.5">
              <Label htmlFor="slug">URL Slug</Label>
              <div className="flex gap-2">
                <div className="flex items-center px-3 bg-muted border rounded-l-md text-sm text-muted-foreground whitespace-nowrap">
                  /films/
                </div>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="my-film-title"
                  className="rounded-l-none"
                />
                <Button size="icon" variant="outline" onClick={copySlug}>
                  <Copy className="w-4 h-4" />
                </Button>
                {promoStatus?.isPublished && (
                  <Button size="icon" variant="outline" asChild>
                    <a href={`/films/${slug}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </Button>
                )}
              </div>
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="page-title">Page Title</Label>
              <Input
                id="page-title"
                value={pageTitle}
                onChange={(e) => setPageTitle(e.target.value)}
                placeholder="My Film Title"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="page-desc">Description / Logline</Label>
              <Textarea
                id="page-desc"
                value={pageDescription}
                onChange={(e) => setPageDescription(e.target.value)}
                placeholder="A brief description of your film..."
                rows={3}
              />
            </div>

            <Separator />

            {/* Toggles */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Show creator name</p>
                  <p className="text-xs text-muted-foreground">Display your name on the public page</p>
                </div>
                <Switch checked={showCreatorName} onCheckedChange={setShowCreatorName} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Include in Showcase</p>
                  <p className="text-xs text-muted-foreground">Allow your film to appear in the community showcase</p>
                </div>
                <Switch checked={allowShowcase} onCheckedChange={setAllowShowcase} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Make page public</p>
                  <p className="text-xs text-muted-foreground">Anyone with the link can view your film page</p>
                </div>
                <Switch checked={isPublic} onCheckedChange={setIsPublic} />
              </div>
            </div>

            <Button
              className="w-full gap-2"
              disabled={publishFilmPage.isPending || !slug}
              onClick={() =>
                publishFilmPage.mutate({
                  projectId,
                  slug,
                  isPublic,
                  title: pageTitle,
                  description: pageDescription,
                  showCreatorName,
                  allowShowcase,
                })
              }
            >
              {publishFilmPage.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Globe className="w-4 h-4" />
              )}
              {isPublic ? "Publish Film Page" : "Save as Draft"}
            </Button>

            {promoStatus?.isPublished && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-sm text-green-600">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                Your film page is live at{" "}
                <a
                  href={`/films/${promoStatus.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline font-medium"
                >
                  /films/{promoStatus.slug}
                </a>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Phase 2: Creator Profile Tab ── */}
        <TabsContent value="profile" className="space-y-5 mt-4">
          <p className="text-sm text-muted-foreground">
            Set up your public creator profile at{" "}
            <span className="font-mono text-xs bg-muted px-1 py-0.5 rounded">virellestudios.com/creators/your-slug</span>
          </p>

          <div className="p-4 rounded-lg border bg-muted/20 space-y-3">
            <div className="flex items-start gap-3">
              <User className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Creator Profile</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Your creator profile is a public page that showcases all your films, collections, and social links.
                  Set it up from your account settings.
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Link href="/settings?tab=profile">
                <Button size="sm" variant="outline" className="gap-2 w-full sm:w-auto">
                  <User className="w-3.5 h-3.5" />
                  Set Up Profile
                </Button>
              </Link>
              {promoStatus?.slug && (
                <a href={`/creators/${promoStatus.slug}`} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="ghost" className="gap-2 w-full sm:w-auto">
                    <ExternalLink className="w-3.5 h-3.5" />
                    View Profile
                  </Button>
                </a>
              )}
            </div>
          </div>

          {/* Showcase status */}
          <div className="p-4 rounded-lg border space-y-2">
            <p className="text-sm font-medium flex items-center gap-2">
              <Globe className="w-4 h-4 text-amber-500" />
              Showcase Status
            </p>
            <p className="text-xs text-muted-foreground">
              {allowShowcase && promoStatus?.isPublished
                ? "Your film is eligible to appear in the VirElle Showcase discovery feed."
                : "Enable 'Include in Showcase' on the Film Page tab and publish to appear in the discovery feed."}
            </p>
            <Badge
              variant={allowShowcase && promoStatus?.isPublished ? "default" : "secondary"}
              className={allowShowcase && promoStatus?.isPublished ? "bg-green-600" : ""}
            >
              {allowShowcase && promoStatus?.isPublished ? "In Showcase" : "Not in Showcase"}
            </Badge>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
