import { useState, useEffect } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Eye, EyeOff, Loader2, Gift, ArrowRight, ArrowLeft, Check,
  User, Building2, Palette, ChevronDown, Phone,
} from "lucide-react";
import LeegoFooter from "@/components/LeegoFooter";
import GoldWatermark from "@/components/GoldWatermark";

// ─── Country Codes ───

const COUNTRY_CODES = [
  { code: "+972", country: "IL", flag: "🇮🇱", label: "Israel" },
  { code: "+1", country: "US", flag: "🇺🇸", label: "United States" },
  { code: "+1", country: "CA", flag: "🇨🇦", label: "Canada" },
  { code: "+44", country: "GB", flag: "🇬🇧", label: "United Kingdom" },
  { code: "+33", country: "FR", flag: "🇫🇷", label: "France" },
  { code: "+49", country: "DE", flag: "🇩🇪", label: "Germany" },
  { code: "+61", country: "AU", flag: "🇦🇺", label: "Australia" },
  { code: "+81", country: "JP", flag: "🇯🇵", label: "Japan" },
  { code: "+82", country: "KR", flag: "🇰🇷", label: "South Korea" },
  { code: "+86", country: "CN", flag: "🇨🇳", label: "China" },
  { code: "+91", country: "IN", flag: "🇮🇳", label: "India" },
  { code: "+55", country: "BR", flag: "🇧🇷", label: "Brazil" },
  { code: "+52", country: "MX", flag: "🇲🇽", label: "Mexico" },
  { code: "+34", country: "ES", flag: "🇪🇸", label: "Spain" },
  { code: "+39", country: "IT", flag: "🇮🇹", label: "Italy" },
  { code: "+31", country: "NL", flag: "🇳🇱", label: "Netherlands" },
  { code: "+46", country: "SE", flag: "🇸🇪", label: "Sweden" },
  { code: "+47", country: "NO", flag: "🇳🇴", label: "Norway" },
  { code: "+45", country: "DK", flag: "🇩🇰", label: "Denmark" },
  { code: "+41", country: "CH", flag: "🇨🇭", label: "Switzerland" },
  { code: "+43", country: "AT", flag: "🇦🇹", label: "Austria" },
  { code: "+48", country: "PL", flag: "🇵🇱", label: "Poland" },
  { code: "+351", country: "PT", flag: "🇵🇹", label: "Portugal" },
  { code: "+353", country: "IE", flag: "🇮🇪", label: "Ireland" },
  { code: "+32", country: "BE", flag: "🇧🇪", label: "Belgium" },
  { code: "+7", country: "RU", flag: "🇷🇺", label: "Russia" },
  { code: "+90", country: "TR", flag: "🇹🇷", label: "Turkey" },
  { code: "+966", country: "SA", flag: "🇸🇦", label: "Saudi Arabia" },
  { code: "+971", country: "AE", flag: "🇦🇪", label: "UAE" },
  { code: "+27", country: "ZA", flag: "🇿🇦", label: "South Africa" },
  { code: "+234", country: "NG", flag: "🇳🇬", label: "Nigeria" },
  { code: "+254", country: "KE", flag: "🇰🇪", label: "Kenya" },
  { code: "+20", country: "EG", flag: "🇪🇬", label: "Egypt" },
  { code: "+62", country: "ID", flag: "🇮🇩", label: "Indonesia" },
  { code: "+60", country: "MY", flag: "🇲🇾", label: "Malaysia" },
  { code: "+65", country: "SG", flag: "🇸🇬", label: "Singapore" },
  { code: "+66", country: "TH", flag: "🇹🇭", label: "Thailand" },
  { code: "+63", country: "PH", flag: "🇵🇭", label: "Philippines" },
  { code: "+84", country: "VN", flag: "🇻🇳", label: "Vietnam" },
  { code: "+64", country: "NZ", flag: "🇳🇿", label: "New Zealand" },
  { code: "+54", country: "AR", flag: "🇦🇷", label: "Argentina" },
  { code: "+56", country: "CL", flag: "🇨🇱", label: "Chile" },
  { code: "+57", country: "CO", flag: "🇨🇴", label: "Colombia" },
  { code: "+51", country: "PE", flag: "🇵🇪", label: "Peru" },
  { code: "+380", country: "UA", flag: "🇺🇦", label: "Ukraine" },
  { code: "+40", country: "RO", flag: "🇷🇴", label: "Romania" },
  { code: "+30", country: "GR", flag: "🇬🇷", label: "Greece" },
  { code: "+36", country: "HU", flag: "🇭🇺", label: "Hungary" },
  { code: "+420", country: "CZ", flag: "🇨🇿", label: "Czech Republic" },
  { code: "+358", country: "FI", flag: "🇫🇮", label: "Finland" },
];

// ─── Constants ───

const PROFESSIONAL_ROLES = [
  { value: "director", label: "Director" },
  { value: "producer", label: "Producer" },
  { value: "writer", label: "Screenwriter / Writer" },
  { value: "cinematographer", label: "Cinematographer / DP" },
  { value: "editor", label: "Editor" },
  { value: "vfx_artist", label: "VFX / Visual Effects Artist" },
  { value: "animator", label: "Animator" },
  { value: "actor", label: "Actor / Performer" },
  { value: "sound_designer", label: "Sound Designer" },
  { value: "composer", label: "Composer / Music" },
  { value: "content_creator", label: "Content Creator" },
  { value: "student", label: "Student" },
  { value: "hobbyist", label: "Hobbyist / Enthusiast" },
  { value: "other", label: "Other" },
];

const EXPERIENCE_LEVELS = [
  { value: "beginner", label: "Beginner", desc: "Just getting started" },
  { value: "intermediate", label: "Intermediate", desc: "Some projects under my belt" },
  { value: "advanced", label: "Advanced", desc: "Years of experience" },
  { value: "professional", label: "Professional", desc: "Full-time in the industry" },
  { value: "studio", label: "Studio / Agency", desc: "Running a production company" },
];

const INDUSTRY_TYPES = [
  { value: "film", label: "Film / Cinema" },
  { value: "tv", label: "Television / Streaming" },
  { value: "advertising", label: "Advertising / Commercials" },
  { value: "music_video", label: "Music Videos" },
  { value: "social_media", label: "Social Media / YouTube" },
  { value: "education", label: "Education / Training" },
  { value: "corporate", label: "Corporate / Business" },
  { value: "gaming", label: "Gaming / Interactive" },
  { value: "documentary", label: "Documentary" },
  { value: "animation", label: "Animation" },
  { value: "other", label: "Other" },
];

const TEAM_SIZES = [
  { value: "solo", label: "Solo Creator" },
  { value: "2-5", label: "Small Team (2–5)" },
  { value: "6-20", label: "Medium Team (6–20)" },
  { value: "21-50", label: "Large Team (21–50)" },
  { value: "50+", label: "Enterprise (50+)" },
];

const GENRES = [
  "Action", "Comedy", "Drama", "Horror", "Sci-Fi", "Thriller",
  "Romance", "Fantasy", "Documentary", "Animation", "Mystery",
  "Adventure", "Crime", "Musical", "Western", "War",
];

const USE_CASES = [
  { value: "full_films", label: "Full Film Production" },
  { value: "pre_production", label: "Pre-Production / Planning" },
  { value: "storyboarding", label: "Storyboarding / Visualization" },
  { value: "trailers", label: "Trailers & Teasers" },
  { value: "music_videos", label: "Music Videos" },
  { value: "social_content", label: "Social Media Content" },
  { value: "education", label: "Educational Content" },
  { value: "pitching", label: "Pitching / Investor Decks" },
  { value: "other", label: "Other" },
];

const HOW_HEARD = [
  { value: "google", label: "Google Search" },
  { value: "social_media", label: "Social Media" },
  { value: "friend", label: "Friend / Colleague" },
  { value: "blog", label: "Blog / Article" },
  { value: "producthunt", label: "Product Hunt" },
  { value: "reddit", label: "Reddit" },
  { value: "youtube", label: "YouTube" },
  { value: "twitter", label: "X (Twitter)" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "other", label: "Other" },
];

// ─── Step Indicator ───

function StepIndicator({ current, total }: { current: number; total: number }) {
  const steps = [
    { num: 1, label: "Account", icon: User },
    { num: 2, label: "Professional", icon: Building2 },
    { num: 3, label: "Creative", icon: Palette },
  ];
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {steps.slice(0, total).map((step, i) => {
        const Icon = step.icon;
        const isActive = step.num === current;
        const isCompleted = step.num < current;
        return (
          <div key={step.num} className="flex items-center gap-2">
            {i > 0 && (
              <div className={`w-8 h-0.5 ${isCompleted ? "bg-amber-500" : "bg-border"}`} />
            )}
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-amber-600 text-white ring-2 ring-amber-500/30 ring-offset-2 ring-offset-background"
                    : isCompleted
                    ? "bg-amber-600/80 text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </div>
              <span className={`text-[10px] font-medium ${isActive ? "text-amber-500" : "text-muted-foreground"}`}>
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Select Component ───

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none pr-8"
        >
          <option value="">{placeholder || "Select..."}</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      </div>
    </div>
  );
}

// ─── Main Component ───

export default function Register() {
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const [step, setStep] = useState(1);
  const totalSteps = 3;

  // Step 1: Account
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+1");
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [promoStatus, setPromoStatus] = useState<{ valid?: boolean; message?: string; discountPercent?: number } | null>(null);

  // Step 2: Professional
  const [companyName, setCompanyName] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [professionalRole, setProfessionalRole] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("");
  const [industryType, setIndustryType] = useState("");
  const [teamSize, setTeamSize] = useState("");

  // Step 3: Creative
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [primaryUseCase, setPrimaryUseCase] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [howDidYouHear, setHowDidYouHear] = useState("");
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Extract referral code and promo code from URL query params
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const ref = params.get("ref");
    if (ref) setReferralCode(ref);
    const promo = params.get("promo");
    if (promo) setPromoCodeInput(promo.toUpperCase());
  }, [searchString]);

  // Live promo code validation (debounced via react-query staleTime)
  const promoValidateQuery = trpc.promo.validate.useQuery(
    { code: promoCodeInput.trim().toUpperCase() },
    { enabled: promoCodeInput.trim().length >= 4, staleTime: 3000 }
  );
  useEffect(() => {
    if (!promoCodeInput.trim() || promoCodeInput.trim().length < 4) {
      setPromoStatus(null);
      setPromoCode("");
      return;
    }
    if (promoValidateQuery.data) {
      setPromoStatus(promoValidateQuery.data);
      if (promoValidateQuery.data.valid) setPromoCode(promoCodeInput.trim().toUpperCase());
      else setPromoCode("");
    }
  }, [promoValidateQuery.data, promoCodeInput]);

  const utils = trpc.useUtils();
  const [showWelcome, setShowWelcome] = useState(false);

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: () => {
      utils.auth.me.invalidate();
      setShowWelcome(true);
    },
    onError: (err) => {
      toast.error(err.message || "Registration failed");
      // If it's an email conflict, go back to step 1
      if (err.message?.includes("already exists")) setStep(1);
    },
  });

  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  // ─── Validation ───

  const validateStep1 = (): boolean => {
    if (!name.trim()) { toast.error("Please enter your name"); return false; }
    if (!email.trim()) { toast.error("Please enter your email"); return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast.error("Please enter a valid email"); return false; }
    if (!password) { toast.error("Please enter a password"); return false; }
    if (password.length < 8) { toast.error("Password must be at least 8 characters"); return false; }
    if (password !== confirmPassword) { toast.error("Passwords do not match"); return false; }
    return true;
  };

  const validateStep2 = (): boolean => {
    if (!professionalRole) { toast.error("Please select your professional role"); return false; }
    if (!experienceLevel) { toast.error("Please select your experience level"); return false; }
    return true;
  };

  // ─── Navigation ───

  const nextStep = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    if (step < totalSteps) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const skipToEnd = () => {
    // Skip directly to final step and submit with minimal info
    if (step === 2) {
      setStep(3);
    } else if (step === 3) {
      handleSubmit();
    }
  };

  // ─── Submit ───

  const handleSubmit = () => {
    registerMutation.mutate({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      referralCode: referralCode.trim() || undefined,
      promoCode: promoCode.trim() || undefined,
      phone: phone.trim() ? `${countryCode} ${phone.trim()}` : undefined,
      companyName: companyName.trim() || undefined,
      companyWebsite: companyWebsite.trim() || undefined,
      jobTitle: jobTitle.trim() || undefined,
      professionalRole: professionalRole || undefined,
      experienceLevel: experienceLevel || undefined,
      industryType: industryType || undefined,
      teamSize: teamSize || undefined,
      preferredGenres: selectedGenres.length > 0 ? selectedGenres : undefined,
      primaryUseCase: primaryUseCase || undefined,
      portfolioUrl: portfolioUrl.trim() || undefined,
      howDidYouHear: howDidYouHear || undefined,
      marketingOptIn,
    });
  };

  if (showWelcome) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative">
        <GoldWatermark />
        <div className="w-full max-w-md relative z-10">
          <Card className="border-amber-500/30 bg-card/80 backdrop-blur-sm shadow-2xl shadow-amber-500/10">
            <CardContent className="pt-8 pb-8 flex flex-col items-center text-center space-y-6">
              <div className="w-20 h-20 rounded-full bg-amber-600/20 flex items-center justify-center">
                <Check className="w-10 h-10 text-amber-500" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-foreground">Welcome to Virelle Studios!</h2>
                <p className="text-muted-foreground">
                  Your account has been created successfully. You're now part of the future of AI filmmaking.
                </p>
              </div>
              <div className="w-full space-y-3 pt-2">
                <div className="flex items-center gap-3 text-left p-3 rounded-lg bg-amber-600/5 border border-amber-500/10">
                  <div className="w-8 h-8 rounded-full bg-amber-600/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-amber-500 text-sm font-bold">1</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Create your first project and describe your film concept</p>
                </div>
                <div className="flex items-center gap-3 text-left p-3 rounded-lg bg-amber-600/5 border border-amber-500/10">
                  <div className="w-8 h-8 rounded-full bg-amber-600/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-amber-500 text-sm font-bold">2</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Add your API keys in Settings to unlock AI video, voice, and music</p>
                </div>
                <div className="flex items-center gap-3 text-left p-3 rounded-lg bg-amber-600/5 border border-amber-500/10">
                  <div className="w-8 h-8 rounded-full bg-amber-600/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-amber-500 text-sm font-bold">3</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Let the AI Director generate your screenplay, scenes, and full film</p>
                </div>
              </div>
              <Button
                onClick={() => navigate("/")}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white text-lg py-6 mt-4"
              >
                Enter Your Studio
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative">
      <GoldWatermark />
      <div className="w-full max-w-md space-y-5 relative z-10">
        {/* Virelle Studios Logo */}
        <div className="flex flex-col items-center gap-3">
          {/* Radial glow wrapper — extends the logo's warm amber light into the page */}
          <div className="relative flex items-center justify-center">
            {/* Outer ambient glow — large, very soft */}
            <div
              className="absolute rounded-full pointer-events-none"
              style={{
                width: 280,
                height: 280,
                background: "radial-gradient(ellipse at center, rgba(180,100,10,0.35) 0%, rgba(120,60,5,0.18) 35%, transparent 70%)",
              }}
            />
            {/* Inner glow ring — tighter, warmer */}
            <div
              className="absolute rounded-full pointer-events-none"
              style={{
                width: 160,
                height: 160,
                background: "radial-gradient(ellipse at center, rgba(210,130,20,0.28) 0%, transparent 70%)",
              }}
            />
            <img
              src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663418605762/hxRQQgsmyjgcByim.png"
              alt="Virelle Studios"
              className="relative z-10 w-28 h-28 rounded-2xl"
              style={{ boxShadow: "0 0 40px 8px rgba(180,100,10,0.45), 0 0 80px 20px rgba(120,60,5,0.25)" }}
              draggable={false}
            />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Join Virelle Studios</h1>
            <p className="text-sm text-muted-foreground mt-1">Create Hollywood grade productions with AI</p>
          </div>
        </div>

        {/* Referral Banner */}
        {referralCode && step === 1 && (
          <div className="flex items-center gap-2 bg-amber-600/10 border border-amber-500/20 rounded-lg px-4 py-3 text-sm">
            <Gift className="h-4 w-4 text-amber-400 shrink-0" />
            <span className="text-amber-400">
              You've been referred! Sign up to receive <strong>7,000 bonus credits</strong> — both you and your referrer get rewarded.
            </span>
          </div>
        )}
        {/* Promo Code Banner (when valid promo in URL) */}
        {promoStatus?.valid && step === 1 && (
          <div className="flex items-center gap-2 bg-green-600/10 border border-green-500/20 rounded-lg px-4 py-3 text-sm">
            <Check className="h-4 w-4 text-green-400 shrink-0" />
            <span className="text-green-400">
              Promo code <strong>{promoCode}</strong> applied — you'll get <strong>50% off your first payment</strong>.
            </span>
          </div>
        )}

        {/* Step Indicator */}
        <StepIndicator current={step} total={totalSteps} />

        {/* Registration Card */}
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-xl">
          {/* ─── STEP 1: Account Details ─── */}
          {step === 1 && (
            <>
              <CardHeader className="space-y-1 pb-3">
                <CardTitle className="text-lg">Account Details</CardTitle>
                <CardDescription>Your login credentials and contact info</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Full Name <span className="text-red-400">*</span></Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoComplete="name"
                      autoCapitalize="words"
                      enterKeyHint="next"
                      autoFocus
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="flex gap-1.5">
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setCountryDropdownOpen(!countryDropdownOpen)}
                          className="h-10 px-2.5 rounded-md border border-input bg-background text-sm flex items-center gap-1.5 hover:bg-accent transition-colors min-w-[90px]"
                        >
                          <span className="text-base leading-none">{COUNTRY_CODES.find(c => c.code === countryCode && c.country === (countryCode === "+1" ? "US" : COUNTRY_CODES.find(cc => cc.code === countryCode)?.country))?.flag || COUNTRY_CODES.find(c => c.code === countryCode)?.flag || "\ud83c\uddfa\ud83c\uddf8"}</span>
                          <span className="text-xs text-muted-foreground">{countryCode}</span>
                          <ChevronDown className="w-3 h-3 text-muted-foreground" />
                        </button>
                        {countryDropdownOpen && (
                          <div className="absolute top-full left-0 mt-1 w-72 rounded-md border border-input bg-background shadow-lg z-50">
                            <div className="p-2 border-b border-input">
                              <input
                                autoFocus
                                type="text"
                                placeholder="Search country..."
                                value={countrySearch}
                                onChange={(e) => setCountrySearch(e.target.value)}
                                className="w-full px-2 py-1.5 text-sm bg-background border border-input rounded outline-none focus:border-amber-500/50"
                              />
                            </div>
                            <div className="max-h-56 overflow-y-auto">
                              {COUNTRY_CODES.filter(c =>
                                c.label.toLowerCase().includes(countrySearch.toLowerCase()) ||
                                c.code.includes(countrySearch)
                              ).map((c) => (
                                <button
                                  key={`${c.country}-${c.code}`}
                                  type="button"
                                  onClick={() => { setCountryCode(c.code); setCountryDropdownOpen(false); setCountrySearch(""); }}
                                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent transition-colors text-left ${
                                    countryCode === c.code && c.country === "IL" ? "bg-amber-500/10 text-amber-400" :
                                    countryCode === c.code ? "bg-amber-500/10 text-amber-400" : "text-foreground"
                                  }`}
                                >
                                  <span className="text-base leading-none">{c.flag}</span>
                                  <span className="flex-1 truncate">{c.label}</span>
                                  <span className="text-xs text-muted-foreground">{c.code}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="(555) 000-0000"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        autoComplete="tel"
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email Address <span className="text-red-400">*</span></Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    inputMode="email"
                    enterKeyHint="next"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password <span className="text-red-400">*</span></Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Min. 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                      enterKeyHint="next"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {password && (
                    <div className="flex gap-1 mt-1">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-colors ${
                            password.length >= i * 3
                              ? password.length >= 12
                                ? "bg-green-500"
                                : password.length >= 8
                                ? "bg-amber-500"
                                : "bg-red-500"
                              : "bg-muted"
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword">Confirm Password <span className="text-red-400">*</span></Label>
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="Repeat your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    enterKeyHint="done"
                  />
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-xs text-red-400">Passwords do not match</p>
                  )}
                </div>
                {/* Referral Code */}
                <div className="space-y-1.5">
                  <Label htmlFor="referralCode" className="flex items-center gap-1.5">
                    <Gift className="h-3.5 w-3.5 text-amber-400" />
                    Referral Code
                    <span className="text-muted-foreground font-normal">(optional)</span>
                  </Label>
                  <Input
                    id="referralCode"
                    type="text"
                    placeholder="Enter a friend's referral code"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  />
                  {referralCode && (
                    <p className="text-xs text-amber-400">You and your referrer will each receive 7,000 bonus credits when you sign up.</p>
                  )}
                </div>
                {/* Promo Code — 50% off first payment */}
                <div className="space-y-1.5">
                  <Label htmlFor="promoCode" className="flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-green-400" />
                    Promo Code
                    <span className="text-muted-foreground font-normal">(optional — 50% off first payment)</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="promoCode"
                      type="text"
                      placeholder="e.g. VIRELLE50"
                      value={promoCodeInput}
                      onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                      className={promoStatus?.valid ? "border-green-500/50 pr-8" : promoStatus?.valid === false ? "border-red-500/50 pr-8" : ""}
                    />
                    {promoValidateQuery.isFetching && (
                      <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                    )}
                    {!promoValidateQuery.isFetching && promoStatus?.valid === true && (
                      <Check className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-green-400" />
                    )}
                  </div>
                  {promoStatus && (
                    <p className={`text-xs ${promoStatus.valid ? "text-green-400" : "text-red-400"}`}>
                      {promoStatus.valid ? `Valid! 50% off your first subscription payment.` : promoStatus.message}
                    </p>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-3 pt-2">
                <Button onClick={nextStep} className="w-full bg-amber-600 hover:bg-amber-700 text-white">
                  Continue <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <p className="text-sm text-muted-foreground text-center">
                  Already have an account?{" "}
                  <Link href="/login" className="text-amber-500 hover:text-amber-400 font-medium">
                    Sign in
                  </Link>
                </p>
              </CardFooter>
            </>
          )}

          {/* ─── STEP 2: Professional Details ─── */}
          {step === 2 && (
            <>
              <CardHeader className="space-y-1 pb-3">
                <CardTitle className="text-lg">Professional Profile</CardTitle>
                <CardDescription>Tell us about your work so we can personalize your experience</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3.5">
                <SelectField
                  label="Professional Role *"
                  value={professionalRole}
                  onChange={setProfessionalRole}
                  options={PROFESSIONAL_ROLES}
                  placeholder="What best describes you?"
                />
                <div className="space-y-2">
                  <Label>Experience Level <span className="text-red-400">*</span></Label>
                  <div className="grid grid-cols-1 gap-2">
                    {EXPERIENCE_LEVELS.map((level) => (
                      <button
                        key={level.value}
                        type="button"
                        onClick={() => setExperienceLevel(level.value)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left text-sm transition-all ${
                          experienceLevel === level.value
                            ? "border-amber-500 bg-amber-500/10 text-foreground"
                            : "border-border hover:border-amber-500/40 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          experienceLevel === level.value ? "border-amber-500" : "border-muted-foreground/40"
                        }`}>
                          {experienceLevel === level.value && <div className="w-2 h-2 rounded-full bg-amber-500" />}
                        </div>
                        <div>
                          <div className="font-medium">{level.label}</div>
                          <div className="text-xs text-muted-foreground">{level.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                <SelectField
                  label="Industry"
                  value={industryType}
                  onChange={setIndustryType}
                  options={INDUSTRY_TYPES}
                  placeholder="What industry are you in?"
                />
                <SelectField
                  label="Team Size"
                  value={teamSize}
                  onChange={setTeamSize}
                  options={TEAM_SIZES}
                  placeholder="How big is your team?"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <Label htmlFor="companyName">Company / Studio Name</Label>
                    <Input
                      id="companyName"
                      type="text"
                      placeholder="Acme Studios"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="jobTitle">Job Title</Label>
                    <Input
                      id="jobTitle"
                      type="text"
                      placeholder="Creative Director"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="companyWebsite">Company Website</Label>
                  <Input
                    id="companyWebsite"
                    type="url"
                    placeholder="https://yourstudio.com"
                    value={companyWebsite}
                    onChange={(e) => setCompanyWebsite(e.target.value)}
                  />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-2 pt-2">
                <div className="flex gap-3 w-full">
                  <Button variant="outline" onClick={prevStep} className="flex-1">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                  </Button>
                  <Button onClick={nextStep} className="flex-1 bg-amber-600 hover:bg-amber-700 text-white">
                    Continue <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
                <Button variant="ghost" onClick={skipToEnd} className="w-full text-muted-foreground hover:text-foreground text-sm">
                  Skip for now
                </Button>
              </CardFooter>
            </>
          )}

          {/* ─── STEP 3: Creative Profile ─── */}
          {step === 3 && (
            <>
              <CardHeader className="space-y-1 pb-3">
                <CardTitle className="text-lg">Creative Preferences</CardTitle>
                <CardDescription>Help us tailor your studio experience</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3.5">
                <div className="space-y-2">
                  <Label>Preferred Genres <span className="text-muted-foreground font-normal">(select all that apply)</span></Label>
                  <div className="flex flex-wrap gap-2">
                    {GENRES.map((genre) => (
                      <button
                        key={genre}
                        type="button"
                        onClick={() => toggleGenre(genre.toLowerCase())}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                          selectedGenres.includes(genre.toLowerCase())
                            ? "bg-amber-600 text-white border-amber-600"
                            : "bg-background text-muted-foreground border-border hover:border-amber-500/40 hover:text-foreground"
                        }`}
                      >
                        {genre}
                      </button>
                    ))}
                  </div>
                </div>
                <SelectField
                  label="Primary Use Case"
                  value={primaryUseCase}
                  onChange={setPrimaryUseCase}
                  options={USE_CASES}
                  placeholder="What will you mainly use Virelle for?"
                />
                <div className="space-y-1.5">
                  <Label htmlFor="portfolioUrl">Portfolio / Showreel URL</Label>
                  <Input
                    id="portfolioUrl"
                    type="url"
                    placeholder="https://vimeo.com/yourwork"
                    value={portfolioUrl}
                    onChange={(e) => setPortfolioUrl(e.target.value)}
                  />
                </div>
                <SelectField
                  label="How did you hear about us?"
                  value={howDidYouHear}
                  onChange={setHowDidYouHear}
                  options={HOW_HEARD}
                  placeholder="Select..."
                />
                {/* Mandatory Terms Agreement */}
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-amber-500 text-amber-600 focus:ring-amber-500"
                    required
                  />
                  <span className={`text-sm transition-colors ${agreedToTerms ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"}`}>
                    <span className="text-red-400 font-semibold">*</span>{" "}
                    I have read and agree to the{" "}
                    <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300 underline font-medium" onClick={(e) => e.stopPropagation()}>Terms of Service</a>,{" "}
                    <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300 underline font-medium" onClick={(e) => e.stopPropagation()}>Privacy Policy</a>, and{" "}
                    <a href="/ip-policy" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300 underline font-medium" onClick={(e) => e.stopPropagation()}>IP &amp; Copyright Policy</a>.
                    I understand that I, as Director, bear full legal responsibility for all content I create on this platform.
                  </span>
                </label>

                {/* Optional Marketing Opt-In */}
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={marketingOptIn}
                    onChange={(e) => setMarketingOptIn(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-border text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                    Send me updates about new features, filmmaking tips, and exclusive offers. You can unsubscribe anytime.
                  </span>
                </label>
              </CardContent>
              <CardFooter className="flex flex-col gap-2 pt-2">
                <div className="flex gap-3 w-full">
                  <Button variant="outline" onClick={prevStep} className="flex-1">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                  </Button>
                  <Button
                    onClick={() => {
                      if (!agreedToTerms) {
                        toast.error("You must agree to the Terms of Service before creating an account.");
                        return;
                      }
                      handleSubmit();
                    }}
                    disabled={registerMutation.isPending || !agreedToTerms}
                    className="flex-1 bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50"
                    title={!agreedToTerms ? "Please agree to the Terms of Service to continue" : undefined}
                  >
                    {registerMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        Create Account <Check className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
                {agreedToTerms && (
                  <Button variant="ghost" onClick={skipToEnd} className="w-full text-muted-foreground hover:text-foreground text-sm">
                    Skip for now — complete profile later
                  </Button>
                )}
              </CardFooter>
            </>
          )}
        </Card>

        {/* Terms */}
        <p className="text-xs text-muted-foreground text-center px-4">
          By creating an account you confirm you have read and agreed to our{" "}
          <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-amber-500 hover:text-amber-400">Terms of Service</a>,{" "}
          <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-amber-500 hover:text-amber-400">Privacy Policy</a>, and{" "}
          <a href="/ip-policy" target="_blank" rel="noopener noreferrer" className="text-amber-500 hover:text-amber-400">IP &amp; Copyright Policy</a>.
          You accept full responsibility as Director for all content you create.
        </p>
      </div>

      {/* Leego Footer */}
      <div className="mt-6">
        <LeegoFooter />
      </div>
    </div>
  );
}
