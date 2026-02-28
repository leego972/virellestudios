import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Key,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Loader2,
  Shield,
  Video,
  Sparkles,
  AlertTriangle,
  Info,
  Star,
  Zap,
  Film,
} from "lucide-react";
import { toast } from "sonner";

const PROVIDER_ICONS: Record<string, string> = {
  runway: "🎬",
  fal: "⚡",
  replicate: "🔄",
  openai: "🤖",
  luma: "🌙",
  huggingface: "🤗",
};

const PROVIDER_COLORS: Record<string, string> = {
  runway: "from-purple-500/20 to-purple-600/10 border-purple-500/30",
  fal: "from-blue-500/20 to-blue-600/10 border-blue-500/30",
  replicate: "from-green-500/20 to-green-600/10 border-green-500/30",
  openai: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/30",
  luma: "from-indigo-500/20 to-indigo-600/10 border-indigo-500/30",
  huggingface: "from-yellow-500/20 to-yellow-600/10 border-yellow-500/30",
};

export default function Settings() {
  const [keyInputs, setKeyInputs] = useState<Record<string, string>>({});
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [savingProvider, setSavingProvider] = useState<string | null>(null);

  const profileQuery = trpc.settings.getProfile.useQuery();
  const providersQuery = trpc.settings.getProviders.useQuery();

  const saveKeyMutation = trpc.settings.saveApiKey.useMutation({
    onSuccess: (data) => {
      toast.success(data.message || "API Key Saved");
      profileQuery.refetch();
      setKeyInputs((prev) => ({ ...prev, [data.provider]: "" }));
      setSavingProvider(null);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to save key");
      setSavingProvider(null);
    },
  });

  const removeKeyMutation = trpc.settings.removeApiKey.useMutation({
    onSuccess: (data) => {
      toast.success(data.message || "API Key Removed");
      profileQuery.refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to remove key");
    },
  });

  const testKeyMutation = trpc.settings.testApiKey.useMutation({
    onSuccess: (data) => {
      if (data.valid) {
        toast.success(data.message || "Key is valid!");
      } else {
        toast.error(data.message || "Key is invalid");
      }
      setTestingProvider(null);
    },
    onError: (err) => {
      toast.error(err.message || "Test failed");
      setTestingProvider(null);
    },
  });

  const setPreferredMutation = trpc.settings.setPreferredProvider.useMutation({
    onSuccess: () => {
      toast.success("Preferred provider updated");
      profileQuery.refetch();
    },
  });

  const profile = profileQuery.data;
  const providers = providersQuery.data || [];
  const configuredKeys = profile?.apiKeys || {};
  const hasAnyKey = Object.values(configuredKeys).some(Boolean);

  return (
    <div className="max-w-5xl mx-auto space-y-8 p-4 md:p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <Key className="w-8 h-8 text-amber-500" />
          Settings & API Keys
        </h1>
        <p className="text-muted-foreground mt-2">
          Configure your video generation API keys to create real AI-generated movie clips.
        </p>
      </div>

      {/* Getting Started Guide */}
      <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-amber-600/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-400">
            <Sparkles className="w-5 h-5" />
            How to Generate Videos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-sm">1</div>
              <div>
                <p className="font-medium text-foreground">Get an API Key</p>
                <p className="text-sm text-muted-foreground">Sign up with one of the video providers below and get your API key.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-sm">2</div>
              <div>
                <p className="font-medium text-foreground">Paste It Here</p>
                <p className="text-sm text-muted-foreground">Enter your API key below and click Save. We encrypt and store it securely.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-sm">3</div>
              <div>
                <p className="font-medium text-foreground">Generate Movies</p>
                <p className="text-sm text-muted-foreground">Create a project, hit Quick Generate, and watch your scenes come to life as real videos.</p>
              </div>
            </div>
          </div>

          {!hasAnyKey && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 mt-4">
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-400">No API keys configured yet</p>
                <p className="text-xs text-muted-foreground">
                  You need at least one video provider API key to generate video clips. Without a key, scenes will only have thumbnail images.
                  We recommend <strong>Runway ML</strong> for the best quality, or <strong>fal.ai</strong> for the best value.
                </p>
              </div>
            </div>
          )}

          {hasAnyKey && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20 mt-4">
              <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-400">Ready to generate videos!</p>
                <p className="text-xs text-muted-foreground">
                  You have at least one API key configured. Create a project and use Quick Generate to produce real video clips.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recommended Provider */}
      <Card className="border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-purple-600/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-400">
            <Star className="w-5 h-5" />
            Recommended Providers
          </CardTitle>
          <CardDescription>Our top picks for the best video generation experience</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 rounded-lg border border-purple-500/20 bg-purple-500/5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🎬</span>
                <div>
                  <p className="font-bold text-foreground">Runway ML</p>
                  <Badge variant="outline" className="text-xs border-purple-500/30 text-purple-400">Best Quality</Badge>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                Industry-leading video generation. Gen-4 Turbo produces the most realistic, cinematic footage.
                Used by Hollywood studios and professional filmmakers.
              </p>
              <p className="text-xs text-muted-foreground">From $12/mo. ~$0.05-0.10 per second of video.</p>
            </div>
            <div className="p-4 rounded-lg border border-blue-500/20 bg-blue-500/5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">⚡</span>
                <div>
                  <p className="font-bold text-foreground">fal.ai</p>
                  <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-400">Best Value</Badge>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                Fast and affordable. Supports HunyuanVideo, Google Veo 3, and LTX-Video models.
                Great balance of quality and cost.
              </p>
              <p className="text-xs text-muted-foreground">Pay-per-use. ~$0.40 per video clip.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Key Cards */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Video className="w-5 h-5 text-amber-500" />
          Video Provider API Keys
        </h2>
        <div className="grid gap-4">
          {providers.map((provider: any) => {
            const isConfigured = configuredKeys[provider.id as keyof typeof configuredKeys];
            const isPreferred = profile?.preferredVideoProvider === provider.id;
            const inputValue = keyInputs[provider.id] || "";
            const colorClass = PROVIDER_COLORS[provider.id] || "from-gray-500/20 to-gray-600/10 border-gray-500/30";

            return (
              <Card key={provider.id} className={`border ${colorClass} bg-gradient-to-br`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <span className="text-xl">{PROVIDER_ICONS[provider.id] || "🔑"}</span>
                      {provider.name}
                      {isConfigured && (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Connected
                        </Badge>
                      )}
                      {isPreferred && (
                        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                          <Zap className="w-3 h-3 mr-1" />
                          Preferred
                        </Badge>
                      )}
                    </CardTitle>
                    <a
                      href={provider.signupUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                      Get API Key <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <CardDescription>{provider.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Info className="w-3 h-3" />
                    <span>Models: {provider.models}</span>
                    <span className="mx-1">•</span>
                    <span>Pricing: {provider.pricing}</span>
                  </div>

                  <div className="flex gap-2">
                    <Input
                      type="password"
                      placeholder={isConfigured ? "••••••••••••••••" : `Paste your ${provider.name} API key here...`}
                      value={inputValue}
                      onChange={(e) => setKeyInputs((prev) => ({ ...prev, [provider.id]: e.target.value }))}
                      className="font-mono text-sm"
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        if (!inputValue.trim()) return;
                        setSavingProvider(provider.id);
                        saveKeyMutation.mutate({ provider: provider.id, key: inputValue.trim() });
                      }}
                      disabled={!inputValue.trim() || savingProvider === provider.id}
                    >
                      {savingProvider === provider.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Save"
                      )}
                    </Button>
                    {inputValue.trim() && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setTestingProvider(provider.id);
                          testKeyMutation.mutate({ provider: provider.id, key: inputValue.trim() });
                        }}
                        disabled={testingProvider === provider.id}
                      >
                        {testingProvider === provider.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "Test"
                        )}
                      </Button>
                    )}
                  </div>

                  {isConfigured && (
                    <div className="flex gap-2 pt-1">
                      {!isPreferred && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs"
                          onClick={() => setPreferredMutation.mutate({ provider: provider.id as any })}
                        >
                          <Star className="w-3 h-3 mr-1" />
                          Set as Preferred
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs text-red-400 hover:text-red-300 border-red-500/30"
                        onClick={() => removeKeyMutation.mutate({ provider: provider.id as any })}
                      >
                        <XCircle className="w-3 h-3 mr-1" />
                        Remove Key
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Security Notice */}
      <Card className="border-muted">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">Security</p>
              <p className="text-xs text-muted-foreground">
                Your API keys are encoded and stored securely. They are never exposed in the frontend — only
                the server uses them to make video generation requests on your behalf. You can remove any key at any time.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Film className="w-5 h-5 text-amber-500" />
            How Video Generation Works
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex gap-3 items-start">
              <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-xs flex-shrink-0">1</div>
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">You create a project</strong> — enter your movie concept, genre, characters, and duration.
              </p>
            </div>
            <div className="flex gap-3 items-start">
              <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-xs flex-shrink-0">2</div>
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">AI writes the screenplay</strong> — GPT-4 generates a professional Hollywood-format script with scene breakdowns.
              </p>
            </div>
            <div className="flex gap-3 items-start">
              <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-xs flex-shrink-0">3</div>
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">Photorealistic images are generated</strong> — each scene gets a cinematic thumbnail using DALL-E 3 with film-quality prompts.
              </p>
            </div>
            <div className="flex gap-3 items-start">
              <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-xs flex-shrink-0">4</div>
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">Videos are generated from each scene</strong> — your configured video API (Runway, fal.ai, etc.) creates 5-10 second video clips per scene.
              </p>
            </div>
            <div className="flex gap-3 items-start">
              <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-xs flex-shrink-0">5</div>
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">Export to My Movies</strong> — combine all scene videos into your movie library for playback and sharing.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-muted/50 border border-muted mt-4">
            <p className="text-xs text-muted-foreground">
              <strong className="text-foreground">Note:</strong> Video generation takes 1-5 minutes per scene depending on the provider.
              A 10-scene movie may take 10-50 minutes total. The system processes scenes sequentially for best quality.
              If no video API key is configured, scenes will still have AI-generated thumbnail images.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
