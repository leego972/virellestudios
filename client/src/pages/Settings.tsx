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
  Briefcase, MapPin, Phone, Mail, Building2, Save, Share2, Trash2, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

function useQueryParam(key: string) {
  const params = new URLSearchParams(window.location.search);
  return params.get(key);
}

const PROVIDER_ICONS: Record<string, string> = {
  runway: "🎬", fal: "⚡", replicate: "🔄", openai: "🤖", luma: "🌙", huggingface: "🤗",
  elevenlabs: "🎙️", suno: "🎵", seedance: "🌊", google: "🍌", veo3: "🎥",
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
  seedance: "from-cyan-500/20 to-cyan-600/10 border-cyan-500/30",
  google: "from-amber-500/20 to-amber-600/10 border-amber-500/30",
  veo3: "from-red-500/20 to-red-600/10 border-red-500/30",
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

const COUNTRIES = [
  { code: "AF", name: "Afghanistan", flag: "🇦🇫" },
  { code: "AL", name: "Albania", flag: "🇦🇱" },
  { code: "DZ", name: "Algeria", flag: "🇩🇿" },
  { code: "AD", name: "Andorra", flag: "🇦🇩" },
  { code: "AO", name: "Angola", flag: "🇦🇴" },
  { code: "AG", name: "Antigua and Barbuda", flag: "🇦🇬" },
  { code: "AR", name: "Argentina", flag: "🇦🇷" },
  { code: "AM", name: "Armenia", flag: "🇦🇲" },
  { code: "AU", name: "Australia", flag: "🇦🇺" },
  { code: "AT", name: "Austria", flag: "🇦🇹" },
  { code: "AZ", name: "Azerbaijan", flag: "🇦🇿" },
  { code: "BS", name: "Bahamas", flag: "🇧🇸" },
  { code: "BH", name: "Bahrain", flag: "🇧🇭" },
  { code: "BD", name: "Bangladesh", flag: "🇧🇩" },
  { code: "BB", name: "Barbados", flag: "🇧🇧" },
  { code: "BY", name: "Belarus", flag: "🇧🇾" },
  { code: "BE", name: "Belgium", flag: "🇧🇪" },
  { code: "BZ", name: "Belize", flag: "🇧🇿" },
  { code: "BJ", name: "Benin", flag: "🇧🇯" },
  { code: "BT", name: "Bhutan", flag: "🇧🇹" },
  { code: "BO", name: "Bolivia", flag: "🇧🇴" },
  { code: "BA", name: "Bosnia and Herzegovina", flag: "🇧🇦" },
  { code: "BW", name: "Botswana", flag: "🇧🇼" },
  { code: "BR", name: "Brazil", flag: "🇧🇷" },
  { code: "BN", name: "Brunei", flag: "🇧🇳" },
  { code: "BG", name: "Bulgaria", flag: "🇧🇬" },
  { code: "BF", name: "Burkina Faso", flag: "🇧🇫" },
  { code: "BI", name: "Burundi", flag: "🇧🇮" },
  { code: "CV", name: "Cabo Verde", flag: "🇨🇻" },
  { code: "KH", name: "Cambodia", flag: "🇰🇭" },
  { code: "CM", name: "Cameroon", flag: "🇨🇲" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "CF", name: "Central African Republic", flag: "🇨🇫" },
  { code: "TD", name: "Chad", flag: "🇹🇩" },
  { code: "CL", name: "Chile", flag: "🇨🇱" },
  { code: "CN", name: "China", flag: "🇨🇳" },
  { code: "CO", name: "Colombia", flag: "🇨🇴" },
  { code: "KM", name: "Comoros", flag: "🇰🇲" },
  { code: "CG", name: "Congo", flag: "🇨🇬" },
  { code: "CR", name: "Costa Rica", flag: "🇨🇷" },
  { code: "HR", name: "Croatia", flag: "🇭🇷" },
  { code: "CU", name: "Cuba", flag: "🇨🇺" },
  { code: "CY", name: "Cyprus", flag: "🇨🇾" },
  { code: "CZ", name: "Czech Republic", flag: "🇨🇿" },
  { code: "DK", name: "Denmark", flag: "🇩🇰" },
  { code: "DJ", name: "Djibouti", flag: "🇩🇯" },
  { code: "DM", name: "Dominica", flag: "🇩🇲" },
  { code: "DO", name: "Dominican Republic", flag: "🇩🇴" },
  { code: "EC", name: "Ecuador", flag: "🇪🇨" },
  { code: "EG", name: "Egypt", flag: "🇪🇬" },
  { code: "SV", name: "El Salvador", flag: "🇸🇻" },
  { code: "GQ", name: "Equatorial Guinea", flag: "🇬🇶" },
  { code: "ER", name: "Eritrea", flag: "🇪🇷" },
  { code: "EE", name: "Estonia", flag: "🇪🇪" },
  { code: "SZ", name: "Eswatini", flag: "🇸🇿" },
  { code: "ET", name: "Ethiopia", flag: "🇪🇹" },
  { code: "FJ", name: "Fiji", flag: "🇫🇯" },
  { code: "FI", name: "Finland", flag: "🇫🇮" },
  { code: "FR", name: "France", flag: "🇫🇷" },
  { code: "GA", name: "Gabon", flag: "🇬🇦" },
  { code: "GM", name: "Gambia", flag: "🇬🇲" },
  { code: "GE", name: "Georgia", flag: "🇬🇪" },
  { code: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "GH", name: "Ghana", flag: "🇬🇭" },
  { code: "GR", name: "Greece", flag: "🇬🇷" },
  { code: "GD", name: "Grenada", flag: "🇬🇩" },
  { code: "GT", name: "Guatemala", flag: "🇬🇹" },
  { code: "GN", name: "Guinea", flag: "🇬🇳" },
  { code: "GW", name: "Guinea-Bissau", flag: "🇬🇼" },
  { code: "GY", name: "Guyana", flag: "🇬🇾" },
  { code: "HT", name: "Haiti", flag: "🇭🇹" },
  { code: "HN", name: "Honduras", flag: "🇭🇳" },
  { code: "HU", name: "Hungary", flag: "🇭🇺" },
  { code: "IS", name: "Iceland", flag: "🇮🇸" },
  { code: "IN", name: "India", flag: "🇮🇳" },
  { code: "ID", name: "Indonesia", flag: "🇮🇩" },
  { code: "IR", name: "Iran", flag: "🇮🇷" },
  { code: "IQ", name: "Iraq", flag: "🇮🇶" },
  { code: "IE", name: "Ireland", flag: "🇮🇪" },
  { code: "IL", name: "Israel", flag: "🇮🇱" },
  { code: "IT", name: "Italy", flag: "🇮🇹" },
  { code: "JM", name: "Jamaica", flag: "🇯🇲" },
  { code: "JP", name: "Japan", flag: "🇯🇵" },
  { code: "JO", name: "Jordan", flag: "🇯🇴" },
  { code: "KZ", name: "Kazakhstan", flag: "🇰🇿" },
  { code: "KE", name: "Kenya", flag: "🇰🇪" },
  { code: "KI", name: "Kiribati", flag: "🇰🇮" },
  { code: "KW", name: "Kuwait", flag: "🇰🇼" },
  { code: "KG", name: "Kyrgyzstan", flag: "🇰🇬" },
  { code: "LA", name: "Laos", flag: "🇱🇦" },
  { code: "LV", name: "Latvia", flag: "🇱🇻" },
  { code: "LB", name: "Lebanon", flag: "🇱🇧" },
  { code: "LS", name: "Lesotho", flag: "🇱🇸" },
  { code: "LR", name: "Liberia", flag: "🇱🇷" },
  { code: "LY", name: "Libya", flag: "🇱🇾" },
  { code: "LI", name: "Liechtenstein", flag: "🇱🇮" },
  { code: "LT", name: "Lithuania", flag: "🇱🇹" },
  { code: "LU", name: "Luxembourg", flag: "🇱🇺" },
  { code: "MG", name: "Madagascar", flag: "🇲🇬" },
  { code: "MW", name: "Malawi", flag: "🇲🇼" },
  { code: "MY", name: "Malaysia", flag: "🇲🇾" },
  { code: "MV", name: "Maldives", flag: "🇲🇻" },
  { code: "ML", name: "Mali", flag: "🇲🇱" },
  { code: "MT", name: "Malta", flag: "🇲🇹" },
  { code: "MH", name: "Marshall Islands", flag: "🇲🇭" },
  { code: "MR", name: "Mauritania", flag: "🇲🇷" },
  { code: "MU", name: "Mauritius", flag: "🇲🇺" },
  { code: "MX", name: "Mexico", flag: "🇲🇽" },
  { code: "FM", name: "Micronesia", flag: "🇫🇲" },
  { code: "MD", name: "Moldova", flag: "🇲🇩" },
  { code: "MC", name: "Monaco", flag: "🇲🇨" },
  { code: "MN", name: "Mongolia", flag: "🇲🇳" },
  { code: "ME", name: "Montenegro", flag: "🇲🇪" },
  { code: "MA", name: "Morocco", flag: "🇲🇦" },
  { code: "MZ", name: "Mozambique", flag: "🇲🇿" },
  { code: "MM", name: "Myanmar", flag: "🇲🇲" },
  { code: "NA", name: "Namibia", flag: "🇳🇦" },
  { code: "NR", name: "Nauru", flag: "🇳🇷" },
  { code: "NP", name: "Nepal", flag: "🇳🇵" },
  { code: "NL", name: "Netherlands", flag: "🇳🇱" },
  { code: "NZ", name: "New Zealand", flag: "🇳🇿" },
  { code: "NI", name: "Nicaragua", flag: "🇳🇮" },
  { code: "NE", name: "Niger", flag: "🇳🇪" },
  { code: "NG", name: "Nigeria", flag: "🇳🇬" },
  { code: "NO", name: "Norway", flag: "🇳🇴" },
  { code: "OM", name: "Oman", flag: "🇴🇲" },
  { code: "PK", name: "Pakistan", flag: "🇵🇰" },
  { code: "PW", name: "Palau", flag: "🇵🇼" },
  { code: "PA", name: "Panama", flag: "🇵🇦" },
  { code: "PG", name: "Papua New Guinea", flag: "🇵🇬" },
  { code: "PY", name: "Paraguay", flag: "🇵🇾" },
  { code: "PE", name: "Peru", flag: "🇵🇪" },
  { code: "PH", name: "Philippines", flag: "🇵🇭" },
  { code: "PL", name: "Poland", flag: "🇵🇱" },
  { code: "PT", name: "Portugal", flag: "🇵🇹" },
  { code: "QA", name: "Qatar", flag: "🇶🇦" },
  { code: "RO", name: "Romania", flag: "🇷🇴" },
  { code: "RU", name: "Russia", flag: "🇷🇺" },
  { code: "RW", name: "Rwanda", flag: "🇷🇼" },
  { code: "KN", name: "Saint Kitts and Nevis", flag: "🇰🇳" },
  { code: "LC", name: "Saint Lucia", flag: "🇱🇨" },
  { code: "VC", name: "Saint Vincent and the Grenadines", flag: "🇻🇨" },
  { code: "WS", name: "Samoa", flag: "🇼🇸" },
  { code: "SM", name: "San Marino", flag: "🇸🇲" },
  { code: "ST", name: "Sao Tome and Principe", flag: "🇸🇹" },
  { code: "SA", name: "Saudi Arabia", flag: "🇸🇦" },
  { code: "SN", name: "Senegal", flag: "🇸🇳" },
  { code: "RS", name: "Serbia", flag: "🇷🇸" },
  { code: "SC", name: "Seychelles", flag: "🇸🇨" },
  { code: "SL", name: "Sierra Leone", flag: "🇸🇱" },
  { code: "SG", name: "Singapore", flag: "🇸🇬" },
  { code: "SK", name: "Slovakia", flag: "🇸🇰" },
  { code: "SI", name: "Slovenia", flag: "🇸🇮" },
  { code: "SB", name: "Solomon Islands", flag: "🇸🇧" },
  { code: "SO", name: "Somalia", flag: "🇸🇴" },
  { code: "ZA", name: "South Africa", flag: "🇿🇦" },
  { code: "SS", name: "South Sudan", flag: "🇸🇸" },
  { code: "ES", name: "Spain", flag: "🇪🇸" },
  { code: "LK", name: "Sri Lanka", flag: "🇱🇰" },
  { code: "SD", name: "Sudan", flag: "🇸🇩" },
  { code: "SR", name: "Suriname", flag: "🇸🇷" },
  { code: "SE", name: "Sweden", flag: "🇸🇪" },
  { code: "CH", name: "Switzerland", flag: "🇨🇭" },
  { code: "SY", name: "Syria", flag: "🇸🇾" },
  { code: "TW", name: "Taiwan", flag: "🇹🇼" },
  { code: "TJ", name: "Tajikistan", flag: "🇹🇯" },
  { code: "TZ", name: "Tanzania", flag: "🇹🇿" },
  { code: "TH", name: "Thailand", flag: "🇹🇭" },
  { code: "TL", name: "Timor-Leste", flag: "🇹🇱" },
  { code: "TG", name: "Togo", flag: "🇹🇬" },
  { code: "TO", name: "Tonga", flag: "🇹🇴" },
  { code: "TT", name: "Trinidad and Tobago", flag: "🇹🇹" },
  { code: "TN", name: "Tunisia", flag: "🇹🇳" },
  { code: "TR", name: "Turkey", flag: "🇹🇷" },
  { code: "TM", name: "Turkmenistan", flag: "🇹🇲" },
  { code: "TV", name: "Tuvalu", flag: "🇹🇻" },
  { code: "UG", name: "Uganda", flag: "🇺🇬" },
  { code: "UA", name: "Ukraine", flag: "🇺🇦" },
  { code: "AE", name: "United Arab Emirates", flag: "🇦🇪" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "US", name: "United States", flag: "🇺🇸" },
  { code: "UY", name: "Uruguay", flag: "🇺🇾" },
  { code: "UZ", name: "Uzbekistan", flag: "🇺🇿" },
  { code: "VU", name: "Vanuatu", flag: "🇻🇺" },
  { code: "VE", name: "Venezuela", flag: "🇻🇪" },
  { code: "VN", name: "Vietnam", flag: "🇻🇳" },
  { code: "YE", name: "Yemen", flag: "🇾🇪" },
  { code: "ZM", name: "Zambia", flag: "🇿🇲" },
  { code: "ZW", name: "Zimbabwe", flag: "🇿🇼" },
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

      <Tabs defaultValue={useQueryParam("tab") || "profile"} className="w-full">
        <TabsList className="flex w-full max-w-2xl overflow-x-auto scrollbar-none sm:grid sm:grid-cols-5 h-auto">
          <TabsTrigger value="profile" className="text-xs gap-1 flex-shrink-0 py-2"><User className="h-3 w-3" />Profile</TabsTrigger>
          <TabsTrigger value="security" className="text-xs gap-1 flex-shrink-0 py-2"><Lock className="h-3 w-3" />Security</TabsTrigger>
          <TabsTrigger value="billing" className="text-xs gap-1 flex-shrink-0 py-2"><Sparkles className="h-3 w-3" />Billing</TabsTrigger>
          <TabsTrigger value="api-keys" className="text-xs gap-1 flex-shrink-0 py-2"><Key className="h-3 w-3" />API Keys</TabsTrigger>
          <TabsTrigger value="connected-platforms" className="text-xs gap-1 flex-shrink-0 py-2"><Share2 className="h-3 w-3" />Platforms</TabsTrigger>
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
                  <Input value={profileForm.name} onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))} placeholder="Your name" className="h-9 text-sm bg-background/50" autoCapitalize="sentences" autoCorrect="on" enterKeyHint="next" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <Input value={profile?.email || ""} disabled className="h-9 text-sm bg-background/30 opacity-60" autoCapitalize="sentences" autoCorrect="on" enterKeyHint="next" />
                  <p className="text-[10px] text-muted-foreground">Email cannot be changed</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" />Phone</Label>
                  <Input value={profileForm.phone} onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))} placeholder="+1 (555) 000-0000" className="h-9 text-sm bg-background/50" autoCapitalize="sentences" autoCorrect="on" enterKeyHint="next" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1"><Globe className="h-3 w-3" />Country</Label>
                  <select
                    value={profileForm.country}
                    onChange={(e) => setProfileForm((p) => ({ ...p, country: e.target.value }))}
                    className="h-9 text-sm bg-background/50 border border-input rounded-md px-3 w-full"
                  >
                    <option value="">Select country...</option>
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.name}>{c.flag} {c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1"><Globe className="h-3 w-3" />Platform Language</Label>
                  <select
                    value={typeof window !== "undefined" ? (localStorage.getItem("virelle_ui_lang") || "en") : "en"}
                    onChange={(e) => {
                      const code = e.target.value;
                      localStorage.setItem("virelle_ui_lang", code);
                      document.documentElement.lang = code;
                      document.documentElement.dir = ["he", "ar"].includes(code) ? "rtl" : "ltr";
                    }}
                    className="h-9 text-sm bg-background/50 border border-input rounded-md px-3 w-full"
                  >
                    <option value="en">🇺🇸 English</option>
                    <option value="he">🇮🇱 עברית (Hebrew)</option>
                    <option value="ar">🇸🇦 العربية (Arabic)</option>
                    <option value="fr">🇫🇷 Français</option>
                    <option value="es">🇪🇸 Español</option>
                    <option value="de">🇩🇪 Deutsch</option>
                    <option value="zh">🇨🇳 中文 (Chinese)</option>
                    <option value="ja">🇯🇵 日本語 (Japanese)</option>
                    <option value="ko">🇰🇷 한국어 (Korean)</option>
                    <option value="pt">🇧🇷 Português</option>
                    <option value="ru">🇷🇺 Русский</option>
                    <option value="hi">🇮🇳 हिन्दी (Hindi)</option>
                    <option value="tr">🇹🇷 Türkçe</option>
                    <option value="it">🇮🇹 Italiano</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Text Direction</Label>
                  <div className="h-9 flex items-center text-sm text-muted-foreground">
                    Auto-detected from language selection
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Bio</Label>
                <Textarea value={profileForm.bio} onChange={(e) => setProfileForm((p) => ({ ...p, bio: e.target.value }))} placeholder="Tell us about yourself..." className="min-h-[80px] text-sm bg-background/50 resize-y" maxLength={1000} autoCapitalize="sentences" autoCorrect="on" enterKeyHint="done" />
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
                  <select
                    value={profileForm.country}
                    onChange={(e) => setProfileForm((p) => ({ ...p, country: e.target.value }))}
                    className="h-9 text-sm bg-background/50 border border-input rounded-md px-3 w-full"
                  >
                    <option value="">Select country...</option>
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.name}>{c.flag} {c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">City</Label>
                  <Input value={profileForm.city} onChange={(e) => setProfileForm((p) => ({ ...p, city: e.target.value }))} placeholder="e.g. Los Angeles" className="h-9 text-sm bg-background/50" autoCapitalize="sentences" autoCorrect="on" enterKeyHint="next" />
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
                  <Input value={profileForm.jobTitle} onChange={(e) => setProfileForm((p) => ({ ...p, jobTitle: e.target.value }))} placeholder="e.g. Film Director" className="h-9 text-sm bg-background/50" autoCapitalize="sentences" autoCorrect="on" enterKeyHint="next" />
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
                  <Input value={profileForm.companyName} onChange={(e) => setProfileForm((p) => ({ ...p, companyName: e.target.value }))} placeholder="Company name" className="h-9 text-sm bg-background/50" autoCapitalize="sentences" autoCorrect="on" enterKeyHint="next" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Company Website</Label>
                  <Input value={profileForm.companyWebsite} onChange={(e) => setProfileForm((p) => ({ ...p, companyWebsite: e.target.value }))} placeholder="https://..." className="h-9 text-sm bg-background/50" autoCapitalize="sentences" autoCorrect="on" enterKeyHint="next" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Portfolio URL</Label>
                  <Input value={profileForm.portfolioUrl} onChange={(e) => setProfileForm((p) => ({ ...p, portfolioUrl: e.target.value }))} placeholder="https://..." className="h-9 text-sm bg-background/50" autoCapitalize="sentences" autoCorrect="on" enterKeyHint="next" />
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

        {/* ─── Billing Tab ─── */}
        <TabsContent value="billing" className="space-y-6 mt-6">
          <BillingTab profile={profile} />
        </TabsContent>

        {/* ─── API Keys Tab ─── */}
        <TabsContent value="api-keys" className="space-y-6 mt-6">
          {/* Getting Started Guide */}
          <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-amber-600/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-400">
                <Sparkles className="w-5 h-5" />
                Bring Your Own Key (BYOK) Platform
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-sm">1</div>
                  <div>
                    <p className="font-medium text-foreground">Get Your Own API Key</p>
                    <p className="text-sm text-muted-foreground">Sign up with a video provider below. Your key is billed directly to you — we never charge for API usage.</p>
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
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 mt-4">
                  <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-400">API key required to generate videos</p>
                    <p className="text-xs text-muted-foreground">
                      Virelle Studios is a <strong>Bring Your Own Key (BYOK)</strong> platform. You must add your own API key from a video provider below before generating any video clips.
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

          {/* Nano Banana Image Generation */}
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span className="text-xl">🍌</span>
              Nano Banana Image Generation
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Google's Nano Banana is the most advanced AI image generation with <strong className="text-foreground">perfect text rendering</strong>. Ideal for logos, titles, posters, and reference frames.
            </p>
            <Card className="border from-amber-500/20 to-amber-600/10 border-amber-500/30 bg-gradient-to-br">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <span className="text-xl">🍌</span>
                    Google Gemini (Nano Banana 2)
                    {configuredKeys['google' as keyof typeof configuredKeys] && <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle2 className="w-3 h-3 mr-1" />Connected</Badge>}
                  </CardTitle>
                  <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                    Get API Key <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <CardDescription>Nano Banana 2 &amp; Nano Banana Pro — Google's native image generation with accurate text rendering, photorealistic quality, and up to 4K resolution.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Info className="w-3 h-3" />
                  <span>Models: Nano Banana 2 (Fast), Nano Banana Pro (Highest Quality)</span>
                  <span className="mx-1">•</span>
                  <span>Pricing: Free tier available</span>
                </div>
                <div className="flex gap-2">
                  <Input type="password" placeholder={configuredKeys['google' as keyof typeof configuredKeys] ? "••••••••••••••••" : "Paste your Google Gemini API key here..."} value={keyInputs['google'] || ''} onChange={(e) => setKeyInputs((prev) => ({ ...prev, google: e.target.value }))} className="font-mono text-sm" />
                  <Button size="sm" onClick={() => { if (!(keyInputs['google'] || '').trim()) return; setSavingProvider('google'); saveKeyMutation.mutate({ provider: 'google', key: (keyInputs['google'] || '').trim() }); }} disabled={!(keyInputs['google'] || '').trim() || savingProvider === 'google'}>
                    {savingProvider === 'google' ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                  </Button>
                </div>
                {configuredKeys['google' as keyof typeof configuredKeys] && (
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" className="text-xs text-red-400 hover:text-red-300 border-red-500/30" onClick={() => removeKeyMutation.mutate({ provider: 'google' as any })}>
                      <XCircle className="w-3 h-3 mr-1" />Remove Key
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
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

        {/* ─── Connected Platforms Tab ─── */}
        <TabsContent value="connected-platforms" className="space-y-6 mt-6">
          <ConnectedPlatformsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Connected Platforms Tab ───
const SOCIAL_PLATFORMS = [
  {
    id: "instagram" as const,
    name: "Instagram",
    icon: "📸",
    color: "from-pink-500/20 to-purple-600/10 border-pink-500/30",
    description: "Publish film posters and Reels directly to your Instagram Business account.",
    docsUrl: "https://developers.facebook.com/docs/instagram-api/",
    fields: [
      { key: "accessToken", label: "User Access Token", placeholder: "EAAxxxxxx...", secret: true },
      { key: "pageId", label: "Instagram Business Account ID", placeholder: "17841400000000000", secret: false },
      { key: "pageAccessToken", label: "Page Access Token (optional)", placeholder: "EAAxxxxxx...", secret: true },
    ],
  },
  {
    id: "tiktok" as const,
    name: "TikTok",
    icon: "🎵",
    color: "from-cyan-500/20 to-teal-600/10 border-cyan-500/30",
    description: "Post short video ads and film trailers to your TikTok creator account.",
    docsUrl: "https://developers.tiktok.com/doc/content-posting-api-get-started/",
    fields: [
      { key: "accessToken", label: "Access Token", placeholder: "act.xxxxxx...", secret: true },
      { key: "openId", label: "Open ID (optional)", placeholder: "xxxxxx", secret: false },
      { key: "refreshToken", label: "Refresh Token (optional)", placeholder: "rft.xxxxxx...", secret: true },
    ],
  },
  {
    id: "facebook" as const,
    name: "Facebook",
    icon: "📱",
    color: "from-blue-500/20 to-blue-700/10 border-blue-500/30",
    description: "Share film posters and video ads to your Facebook Page.",
    docsUrl: "https://developers.facebook.com/docs/pages-api/",
    fields: [
      { key: "pageId", label: "Facebook Page ID", placeholder: "123456789", secret: false },
      { key: "pageAccessToken", label: "Page Access Token", placeholder: "EAAxxxxxx...", secret: true },
    ],
  },
  {
    id: "discord" as const,
    name: "Discord",
    icon: "💬",
    color: "from-indigo-500/20 to-indigo-700/10 border-indigo-500/30",
    description: "Post film announcements and media to your Discord server channel.",
    docsUrl: "https://discord.com/developers/docs/intro",
    fields: [
      { key: "botToken", label: "Bot Token", placeholder: "MTxxxxxx.xxxxxx.xxxxxx", secret: true },
      { key: "guildId", label: "Server (Guild) ID", placeholder: "1234567890", secret: false },
      { key: "channelId", label: "Channel ID", placeholder: "9876543210", secret: false },
    ],
  },
  {
    id: "youtube" as const,
    name: "YouTube",
    icon: "🎥",
    color: "from-red-500/20 to-red-700/10 border-red-500/30",
    description: "Upload film trailers and video ads directly to your YouTube channel.",
    docsUrl: "https://developers.google.com/youtube/v3/guides/uploading_a_video",
    fields: [
      { key: "accessToken", label: "OAuth Access Token", placeholder: "ya29.xxxxxx", secret: true },
      { key: "refreshToken", label: "OAuth Refresh Token (optional)", placeholder: "1//xxxxxx", secret: true },
      { key: "channelId", label: "Channel ID (optional)", placeholder: "UCxxxxxx", secret: false },
    ],
  },
];

// ─── BillingTab Component ─────────────────────────────────────────────────────
function BillingTab({ profile }: { profile: any }) {
  const [loadingPortal, setLoadingPortal] = useState(false);
  const billingPortalMutation = trpc.subscription.createBillingPortal.useMutation({
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: (e) => {
      toast.error(e.message || "Could not open billing portal");
      setLoadingPortal(false);
    },
  });

  const TIER_DISPLAY: Record<string, { label: string; color: string }> = {
    free:        { label: "Free",     color: "bg-muted text-muted-foreground" },
    indie:       { label: "Indie",    color: "bg-sky-500/20 text-sky-400" },
    amateur:     { label: "Amateur",  color: "bg-green-500/20 text-green-400" },
    independent: { label: "Industry", color: "bg-amber-500/20 text-amber-400" },
    creator:     { label: "Creator",  color: "bg-purple-500/20 text-purple-400" },
    studio:      { label: "Studio",   color: "bg-pink-500/20 text-pink-400" },
    industry:    { label: "Industry", color: "bg-amber-500/20 text-amber-400" },
  };

  const tier = profile?.subscriptionTier || "free";
  const tierDisplay = TIER_DISPLAY[tier] ?? TIER_DISPLAY.free;
  const isActive = profile?.subscriptionStatus === "active" || profile?.subscriptionStatus === "trialing";
  const isPaid = tier !== "free" && tier !== "none";

  const handleManageBilling = () => {
    setLoadingPortal(true);
    billingPortalMutation.mutate({ returnUrl: window.location.href });
  };

  return (
    <div className="space-y-6">
      {/* Current Plan Card */}
      <Card className="bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-400" />
            Current Plan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Badge className={tierDisplay.color}>{tierDisplay.label}</Badge>
            {isActive && <Badge className="bg-green-500/20 text-green-400">Active</Badge>}
            {profile?.subscriptionStatus === "past_due" && <Badge className="bg-red-500/20 text-red-400">Past Due</Badge>}
            {profile?.subscriptionStatus === "canceled" && <Badge className="bg-muted text-muted-foreground">Canceled</Badge>}
            {profile?.role === "admin" && <Badge className="bg-red-500/20 text-red-400">Admin</Badge>}
          </div>
          <p className="text-xs text-muted-foreground">
            Member since {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "—"}
          </p>
          {isPaid && (
            <div className="pt-2">
              <Button
                onClick={handleManageBilling}
                disabled={loadingPortal || billingPortalMutation.isPending}
                className="bg-amber-500 hover:bg-amber-600 text-black font-medium"
              >
                {loadingPortal || billingPortalMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" />Opening portal...</>
                ) : (
                  <>Manage Subscription &amp; Billing</>
                )}
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Update payment method, download invoices, or cancel your subscription via the Stripe billing portal.
              </p>
            </div>
          )}
          {!isPaid && (
            <div className="pt-2">
              <a href="/pricing">
                <Button className="bg-amber-500 hover:bg-amber-600 text-black font-medium">
                  <Sparkles className="h-4 w-4 mr-2" />Upgrade Plan
                </Button>
              </a>
              <p className="text-xs text-muted-foreground mt-2">
                Choose a plan to unlock all AI filmmaking tools.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Credits Summary */}
      <Card className="bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-400" />
            Credits
          </CardTitle>
          <CardDescription className="text-xs">
            Credits are used each time you run an AI tool. They accumulate and never expire.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold text-amber-400">
              {profile?.role === "admin" ? "∞" : (profile?.credits ?? 0).toLocaleString()}
            </span>
            <span className="text-sm text-muted-foreground">credits remaining</span>
          </div>
          <div className="mt-4">
            <a href="/pricing?tab=topup">
              <Button variant="outline" size="sm" className="text-xs gap-1">
                <Zap className="h-3 w-3" />Buy Top-Up Pack
              </Button>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ConnectedPlatformsTab() {
  const { data: connectedList, refetch } = trpc.socialCredentials.list.useQuery();
  const saveMutation = trpc.socialCredentials.save.useMutation({
    onSuccess: () => { toast.success("Platform credentials saved"); refetch(); setEditingPlatform(null); },
    onError: (e) => toast.error(e.message),
  });
  const testMutation = trpc.socialCredentials.test.useMutation({
    onSuccess: (data) => {
      if (data.success) toast.success("Connection successful!");
      else toast.error(`Connection failed: ${data.error}`);
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });
  const removeMutation = trpc.socialCredentials.remove.useMutation({
    onSuccess: () => { toast.success("Platform disconnected"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const [editingPlatform, setEditingPlatform] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  const getStatus = (platformId: string) => connectedList?.find((c) => c.platform === platformId);

  const handleSave = (platformId: string) => {
    const platform = SOCIAL_PLATFORMS.find((p) => p.id === platformId);
    if (!platform) return;
    const payload: any = { platform: platformId };
    platform.fields.forEach((f) => { if (formValues[f.key]) payload[f.key] = formValues[f.key]; });
    if (formValues.displayName) payload.displayName = formValues.displayName;
    saveMutation.mutate(payload);
  };

  return (
    <div className="space-y-6">
      <Card className="bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Share2 className="h-4 w-4 text-amber-400" />
            Connected Platforms
          </CardTitle>
          <CardDescription className="text-xs">
            Connect your own social media accounts to publish film posters and video ads directly from the Ad Maker.
            Your credentials are stored securely and are never shared with other users.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {SOCIAL_PLATFORMS.map((platform) => {
            const status = getStatus(platform.id);
            const isConnected = status?.hasCredentials && status?.isActive;
            const isEditing = editingPlatform === platform.id;
            return (
              <div key={platform.id} className={`rounded-lg border bg-gradient-to-r p-4 ${platform.color}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{platform.icon}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{platform.name}</span>
                        {isConnected ? (
                          <Badge className="text-xs bg-green-500/20 text-green-400 border-green-500/30">
                            <CheckCircle2 className="h-3 w-3 mr-1" />Connected
                          </Badge>
                        ) : status?.hasCredentials ? (
                          <Badge className="text-xs bg-red-500/20 text-red-400 border-red-500/30">
                            <XCircle className="h-3 w-3 mr-1" />Disconnected
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-muted-foreground">Not connected</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{platform.description}</p>
                      {status?.lastError && (
                        <p className="text-xs text-red-400 mt-1">⚠️ {status.lastError}</p>
                      )}
                      {status?.lastPublishedAt && (
                        <p className="text-xs text-muted-foreground mt-1">Last published: {new Date(status.lastPublishedAt).toLocaleDateString()}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                    <a href={platform.docsUrl} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                        <ExternalLink className="h-3 w-3" />Docs
                      </Button>
                    </a>
                    {status?.hasCredentials && (
                      <>
                        <Button
                          variant="ghost" size="sm" className="h-7 text-xs gap-1"
                          onClick={() => testMutation.mutate({ platform: platform.id })}
                          disabled={testMutation.isPending}
                        >
                          {testMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                          Test
                        </Button>
                        <Button
                          variant="ghost" size="sm" className="h-7 text-xs gap-1 text-red-400 hover:text-red-300"
                          onClick={() => removeMutation.mutate({ platform: platform.id })}
                          disabled={removeMutation.isPending}
                        >
                          <Trash2 className="h-3 w-3" />Remove
                        </Button>
                      </>
                    )}
                    <Button
                      variant="outline" size="sm" className="h-7 text-xs gap-1"
                      onClick={() => { if (isEditing) { setEditingPlatform(null); setFormValues({}); } else { setEditingPlatform(platform.id); setFormValues({}); } }}
                    >
                      {isEditing ? "Cancel" : status?.hasCredentials ? "Update" : "Connect"}
                    </Button>
                  </div>
                </div>
                {isEditing && (
                  <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
                    <div>
                      <Label className="text-xs">Display Name (optional)</Label>
                      <Input
                        className="mt-1 h-8 text-xs"
                        placeholder={`e.g. @${platform.name.toLowerCase()}page`}
                        value={formValues.displayName || ""}
                        onChange={(e) => setFormValues((v) => ({ ...v, displayName: e.target.value }))} autoCapitalize="sentences" autoCorrect="on" enterKeyHint="next" />
                    </div>
                    {platform.fields.map((field) => (
                      <div key={field.key}>
                        <Label className="text-xs">{field.label}</Label>
                        <Input
                          className="mt-1 h-8 text-xs font-mono"
                          type={field.secret ? "password" : "text"}
                          placeholder={field.placeholder}
                          value={formValues[field.key] || ""}
                          onChange={(e) => setFormValues((v) => ({ ...v, [field.key]: e.target.value }))} autoCapitalize="sentences" autoCorrect="on" enterKeyHint="next" />
                      </div>
                    ))}
                    <Button
                      size="sm" className="h-8 text-xs gap-1 bg-amber-500 hover:bg-amber-600 text-black"
                      onClick={() => handleSave(platform.id)}
                      disabled={saveMutation.isPending}
                    >
                      {saveMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                      Save Credentials
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
