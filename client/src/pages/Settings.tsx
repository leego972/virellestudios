import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Key, CheckCircle2, XCircle, ExternalLink, Loader2, Shield, Video,
  Sparkles, AlertTriangle, Info, Star, Zap, Film, User, Lock, Globe,
  Briefcase, MapPin, Phone, Mail, Building2, Save,
} from "lucide-react";
import { toast } from "sonner";

const PROVIDER_ICONS: Record<string, string> = {
  runway: "🎬", fal: "⚡", replicate: "🔄", openai: "🤖", luma: "🌙", huggingface: "🤗",
  elevenlabs: "🎙️", suno: "🎵",
};
const PROVIDER_COLORS: Record<string, string> = {
  runway: "from-purple-500/20 to-purple-600/10 border-purple-500/30",
  fal: "from-blue-500/20 to-blue-600/10 border-blue-500/30",
  replicate: "from-green-500/20 to-green-600/10 border-green-500/30",
  openai: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/30",
  luma: "from-indigo-500/20 to-indigo-600/10 border-indigo-500/30",
  huggingface: "from-yellow-500/20 to-yellow-600/10 border-yellow-500/30",
  elevenlabs: "from-pink-500/20 to-pink-600/10 border-pink-500/30",
  suno: "from-orange-500/20 to-orange-600/10 border-orange-500/30",
};

const VOICE_MUSIC_PROVIDERS = [
  {
    id: "elevenlabs",
    name: "ElevenLabs",
    description: "Industry-leading AI voice acting. Natural, expressive dialogue for every character.",
    signupUrl: "https://elevenlabs.io/app/settings/api-keys",
    pricing: "Starter: $5/mo (30K chars). Creator: $22/mo (100K chars).",
    models: "Multilingual v2, Turbo v2.5, Voice Cloning",
  },
  {
    id: "suno",
    name: "Suno AI",
    description: "AI-composed original soundtracks and music scores for your films.",
    signupUrl: "https://suno.com",
    pricing: "Pro: $10/mo (500 songs). Premier: $30/mo (2000 songs).",
    models: "Suno v4, Chirp v3.5",
  },
];

export default function Settings() {
  const [keyInputs, setKeyInputs] = useState<Record<string, string>>({});
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [savingProvider, setSavingProvider] = useState<string | null>(null);

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    name: "", phone: "", bio: "", country: "", city: "", timezone: "",
    companyName: "", companyWebsite: "", jobTitle: "", professionalRole: "",
    experienceLevel: "", portfolioUrl: "",
  });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });

  const profileQuery = trpc.settings.getProfile.useQuery();
  const providersQuery = trpc.settings.getProviders.useQuery();

  // Populate profile form when data loads
  useEffect(() => {
    if (profileQuery.data) {
      const p = profileQuery.data;
      setProfileForm({
        name: p.name || "", phone: p.phone || "", bio: p.bio || "",
        country: p.country || "", city: p.city || "", timezone: p.timezone || "",
        companyName: p.companyName || "", companyWebsite: p.companyWebsite || "",
        jobTitle: p.jobTitle || "", professionalRole: p.professionalRole || "",
        experienceLevel: p.experienceLevel || "", portfolioUrl: p.portfolioUrl || "",
      });
    }
  }, [profileQuery.data]);

  const updateProfileMutation = trpc.settings.updateProfile.useMutation({
    onSuccess: () => { toast.success("Profile updated"); profileQuery.refetch(); },
    onError: (err) => toast.error(err.message || "Failed to update profile"),
  });

  const changePasswordMutation = trpc.settings.changePassword.useMutation({
    onSuccess: () => {
      toast.success("Password changed successfully");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    },
    onError: (err) => toast.error(err.message || "Failed to change password"),
  });

  const saveKeyMutation = trpc.settings.saveApiKey.useMutation({
    onSuccess: (data) => {
      toast.success(data.message || "API Key Saved");
      profileQuery.refetch();
      setKeyInputs((prev) => ({ ...prev, [data.provider]: "" }));
      setSavingProvider(null);
    },
    onError: (err) => { toast.error(err.message || "Failed to save key"); setSavingProvider(null); },
  });

  const removeKeyMutation = trpc.settings.removeApiKey.useMutation({
    onSuccess: (data) => { toast.success(data.message || "API Key Removed"); profileQuery.refetch(); },
    onError: (err) => toast.error(err.message || "Failed to remove key"),
  });

  const testKeyMutation = trpc.settings.testApiKey.useMutation({
    onSuccess: (data) => {
      if (data.valid) toast.success(data.message || "Key is valid!");
      else toast.error(data.message || "Key is invalid");
      setTestingProvider(null);
    },
    onError: (err) => { toast.error(err.message || "Test failed"); setTestingProvider(null); },
  });

  const setPreferredMutation = trpc.settings.setPreferredProvider.useMutation({
    onSuccess: () => { toast.success("Preferred provider updated"); profileQuery.refetch(); },
  });

  const profile = profileQuery.data;
  const providers = providersQuery.data || [];
  const configuredKeys = profile?.apiKeys || {};
  const hasAnyKey = Object.values(configuredKeys).some(Boolean);

  const handleSaveProfile = () => {
    const data: any = {};
    if (profileForm.name.trim()) data.name = profileForm.name.trim();
    data.phone = profileForm.phone.trim() || null;
    data.bio = profileForm.bio.trim() || null;
    data.country = profileForm.country.trim() || null;
    data.city = profileForm.city.trim() || null;
    data.timezone = profileForm.timezone.trim() || null;
    data.companyName = profileForm.companyName.trim() || null;
    data.companyWebsite = profileForm.companyWebsite.trim() || null;
    data.jobTitle = profileForm.jobTitle.trim() || null;
    data.professionalRole = profileForm.professionalRole || null;
    data.experienceLevel = profileForm.experienceLevel || null;
    data.portfolioUrl = profileForm.portfolioUrl.trim() || null;
    updateProfileMutation.mutate(data);
  };

  const handleChangePassword = () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }
    changePasswordMutation.mutate({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-4 md:p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <User className="w-8 h-8 text-amber-500" />
          Settings
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage your profile, security, and video generation API keys.
        </p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="profile" className="text-xs gap-1"><User className="h-3 w-3" />Profile</TabsTrigger>
          <TabsTrigger value="security" className="text-xs gap-1"><Lock className="h-3 w-3" />Security</TabsTrigger>
          <TabsTrigger value="api-keys" className="text-xs gap-1"><Key className="h-3 w-3" />API Keys</TabsTrigger>
        </TabsList>

        {/* ─── Profile Tab ─── */}
        <TabsContent value="profile" className="space-y-6 mt-6">
          {/* Account Info */}
          <Card className="bg-card/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4 text-amber-400" />
                Account Information
              </CardTitle>
              <CardDescription className="text-xs">Your basic account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Display Name</Label>
                  <Input value={profileForm.name} onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))} placeholder="Your name" className="h-9 text-sm bg-background/50" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <Input value={profile?.email || ""} disabled className="h-9 text-sm bg-background/30 opacity-60" />
                  <p className="text-[10px] text-muted-foreground">Email cannot be changed</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" />Phone</Label>
                  <Input value={profileForm.phone} onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))} placeholder="+1 (555) 000-0000" className="h-9 text-sm bg-background/50" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1"><Globe className="h-3 w-3" />Timezone</Label>
                  <Input value={profileForm.timezone} onChange={(e) => setProfileForm((p) => ({ ...p, timezone: e.target.value }))} placeholder="e.g. America/New_York" className="h-9 text-sm bg-background/50" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Bio</Label>
                <Textarea value={profileForm.bio} onChange={(e) => setProfileForm((p) => ({ ...p, bio: e.target.value }))} placeholder="Tell us about yourself..." className="min-h-[80px] text-sm bg-background/50 resize-y" maxLength={1000} />
              </div>
            </CardContent>
          </Card>

          {/* Location */}
          <Card className="bg-card/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4 text-blue-400" />
                Location
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Country</Label>
                  <Input value={profileForm.country} onChange={(e) => setProfileForm((p) => ({ ...p, country: e.target.value }))} placeholder="e.g. United States" className="h-9 text-sm bg-background/50" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">City</Label>
                  <Input value={profileForm.city} onChange={(e) => setProfileForm((p) => ({ ...p, city: e.target.value }))} placeholder="e.g. Los Angeles" className="h-9 text-sm bg-background/50" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Professional */}
          <Card className="bg-card/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-purple-400" />
                Professional Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Job Title</Label>
                  <Input value={profileForm.jobTitle} onChange={(e) => setProfileForm((p) => ({ ...p, jobTitle: e.target.value }))} placeholder="e.g. Film Director" className="h-9 text-sm bg-background/50" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Professional Role</Label>
                  <Select value={profileForm.professionalRole} onValueChange={(v) => setProfileForm((p) => ({ ...p, professionalRole: v }))}>
                    <SelectTrigger className="h-9 text-sm bg-background/50"><SelectValue placeholder="Select role" /></SelectTrigger>
                    <SelectContent>
                      {["director", "producer", "writer", "cinematographer", "editor", "vfx_artist", "animator", "student", "hobbyist", "other"].map((r) => (
                        <SelectItem key={r} value={r}>{r.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Experience Level</Label>
                  <Select value={profileForm.experienceLevel} onValueChange={(v) => setProfileForm((p) => ({ ...p, experienceLevel: v }))}>
                    <SelectTrigger className="h-9 text-sm bg-background/50"><SelectValue placeholder="Select level" /></SelectTrigger>
                    <SelectContent>
                      {["beginner", "intermediate", "advanced", "professional", "studio"].map((l) => (
                        <SelectItem key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1"><Building2 className="h-3 w-3" />Company</Label>
                  <Input value={profileForm.companyName} onChange={(e) => setProfileForm((p) => ({ ...p, companyName: e.target.value }))} placeholder="Company name" className="h-9 text-sm bg-background/50" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Company Website</Label>
                  <Input value={profileForm.companyWebsite} onChange={(e) => setProfileForm((p) => ({ ...p, companyWebsite: e.target.value }))} placeholder="https://..." className="h-9 text-sm bg-background/50" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Portfolio URL</Label>
                  <Input value={profileForm.portfolioUrl} onChange={(e) => setProfileForm((p) => ({ ...p, portfolioUrl: e.target.value }))} placeholder="https://..." className="h-9 text-sm bg-background/50" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Subscription Info */}
          <Card className="bg-card/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-400" />
                Subscription
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Badge className={`${profile?.subscriptionTier === "industry" ? "bg-amber-500/20 text-amber-400" : profile?.subscriptionTier === "pro" ? "bg-purple-500/20 text-purple-400" : "bg-muted text-muted-foreground"}`}>
                  {(profile?.subscriptionTier || "creator").toUpperCase()}
                </Badge>
                {profile?.role === "admin" && <Badge className="bg-red-500/20 text-red-400">Admin</Badge>}
                <span className="text-xs text-muted-foreground">
                  Member since {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "—"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSaveProfile} disabled={updateProfileMutation.isPending} className="bg-amber-500 hover:bg-amber-600 text-black font-medium">
              {updateProfileMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save Profile
            </Button>
          </div>
        </TabsContent>

        {/* ─── Security Tab ─── */}
        <TabsContent value="security" className="space-y-6 mt-6">
          <Card className="bg-card/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Lock className="h-4 w-4 text-amber-400" />
                Change Password
              </CardTitle>
              <CardDescription className="text-xs">Update your account password</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Current Password</Label>
                <Input type="password" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))} placeholder="Enter current password" className="h-9 text-sm bg-background/50 max-w-md" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">New Password</Label>
                  <Input type="password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))} placeholder="Min 8 characters" className="h-9 text-sm bg-background/50" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Confirm New Password</Label>
                  <Input type="password" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))} placeholder="Repeat new password" className="h-9 text-sm bg-background/50" />
                </div>
              </div>
              <Button onClick={handleChangePassword} disabled={changePasswordMutation.isPending || !passwordForm.currentPassword || !passwordForm.newPassword} size="sm">
                {changePasswordMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
                Change Password
              </Button>
            </CardContent>
          </Card>

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
        </TabsContent>

        {/* ─── API Keys Tab ─── */}
        <TabsContent value="api-keys" className="space-y-6 mt-6">
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

          {/* Recommended Providers */}
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
                          {isConfigured && <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle2 className="w-3 h-3 mr-1" />Connected</Badge>}
                          {isPreferred && <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30"><Zap className="w-3 h-3 mr-1" />Preferred</Badge>}
                        </CardTitle>
                        <a href={provider.signupUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
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
                        <Input type="password" placeholder={isConfigured ? "••••••••••••••••" : `Paste your ${provider.name} API key here...`} value={inputValue} onChange={(e) => setKeyInputs((prev) => ({ ...prev, [provider.id]: e.target.value }))} className="font-mono text-sm" />
                        <Button size="sm" onClick={() => { if (!inputValue.trim()) return; setSavingProvider(provider.id); saveKeyMutation.mutate({ provider: provider.id, key: inputValue.trim() }); }} disabled={!inputValue.trim() || savingProvider === provider.id}>
                          {savingProvider === provider.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                        </Button>
                        {inputValue.trim() && (
                          <Button size="sm" variant="outline" onClick={() => { setTestingProvider(provider.id); testKeyMutation.mutate({ provider: provider.id, key: inputValue.trim() }); }} disabled={testingProvider === provider.id}>
                            {testingProvider === provider.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Test"}
                          </Button>
                        )}
                      </div>
                      {isConfigured && (
                        <div className="flex gap-2 pt-1">
                          {!isPreferred && (
                            <Button size="sm" variant="outline" className="text-xs" onClick={() => setPreferredMutation.mutate({ provider: provider.id as any })}>
                              <Star className="w-3 h-3 mr-1" />Set as Preferred
                            </Button>
                          )}
                          <Button size="sm" variant="outline" className="text-xs text-red-400 hover:text-red-300 border-red-500/30" onClick={() => removeKeyMutation.mutate({ provider: provider.id as any })}>
                            <XCircle className="w-3 h-3 mr-1" />Remove Key
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Voice & Music API Keys */}
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-pink-500" />
              Voice & Music API Keys
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Add ElevenLabs for AI voice acting and Suno for AI soundtrack generation. These bring your films to life with professional dialogue and original music.
            </p>
            <div className="grid gap-4">
              {VOICE_MUSIC_PROVIDERS.map((provider) => {
                const isConfigured = configuredKeys[provider.id as keyof typeof configuredKeys];
                const inputValue = keyInputs[provider.id] || "";
                const colorClass = PROVIDER_COLORS[provider.id] || "from-gray-500/20 to-gray-600/10 border-gray-500/30";
                return (
                  <Card key={provider.id} className={`border ${colorClass} bg-gradient-to-br`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <span className="text-xl">{PROVIDER_ICONS[provider.id] || "🔑"}</span>
                          {provider.name}
                          {isConfigured && <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle2 className="w-3 h-3 mr-1" />Connected</Badge>}
                        </CardTitle>
                        <a href={provider.signupUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
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
                        <Input type="password" placeholder={isConfigured ? "••••••••••••••••" : `Paste your ${provider.name} API key here...`} value={inputValue} onChange={(e) => setKeyInputs((prev) => ({ ...prev, [provider.id]: e.target.value }))} className="font-mono text-sm" />
                        <Button size="sm" onClick={() => { if (!inputValue.trim()) return; setSavingProvider(provider.id); saveKeyMutation.mutate({ provider: provider.id as any, key: inputValue.trim() }); }} disabled={!inputValue.trim() || savingProvider === provider.id}>
                          {savingProvider === provider.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                        </Button>
                        {inputValue.trim() && (
                          <Button size="sm" variant="outline" onClick={() => { setTestingProvider(provider.id); testKeyMutation.mutate({ provider: provider.id as any, key: inputValue.trim() }); }} disabled={testingProvider === provider.id}>
                            {testingProvider === provider.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Test"}
                          </Button>
                        )}
                      </div>
                      {isConfigured && (
                        <div className="flex gap-2 pt-1">
                          <Button size="sm" variant="outline" className="text-xs text-red-400 hover:text-red-300 border-red-500/30" onClick={() => removeKeyMutation.mutate({ provider: provider.id as any })}>
                            <XCircle className="w-3 h-3 mr-1" />Remove Key
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

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
                {[
                  { n: "1", t: "You create a project", d: "enter your movie concept, genre, characters, and duration." },
                  { n: "2", t: "AI writes the screenplay", d: "GPT-4 generates a professional Hollywood-format script with scene breakdowns." },
                  { n: "3", t: "Photorealistic images are generated", d: "each scene gets a cinematic thumbnail using DALL-E 3 with film-quality prompts." },
                  { n: "4", t: "Videos are generated from each scene", d: "your configured video API creates 5-10 second video clips per scene." },
                  { n: "5", t: "Export to My Movies", d: "combine all scene videos into your movie library for playback and sharing." },
                ].map((s) => (
                  <div key={s.n} className="flex gap-3 items-start">
                    <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-xs flex-shrink-0">{s.n}</div>
                    <p className="text-sm text-muted-foreground"><strong className="text-foreground">{s.t}</strong> — {s.d}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
