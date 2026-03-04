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
  User, Building2, Palette, ChevronDown,
} from "lucide-react";
import LeegoFooter from "@/components/LeegoFooter";

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
  const [referralCode, setReferralCode] = useState("");

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

  // Extract referral code from URL query params
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const ref = params.get("ref");
    if (ref) setReferralCode(ref);
  }, [searchString]);

  const utils = trpc.useUtils();
  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: () => {
      utils.auth.me.invalidate();
      toast.success("Welcome to Virelle Studios! Your account is ready.");
      navigate("/");
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
      phone: phone.trim() || undefined,
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

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-5">
        {/* Virelle Studios Logo */}
        <div className="flex flex-col items-center gap-3">
          <img
            src="/apple-touch-icon.png"
            alt="Virelle Studios"
            className="w-20 h-20 rounded-2xl shadow-lg shadow-amber-500/20"
            draggable={false}
          />
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Join Virelle Studios</h1>
            <p className="text-sm text-muted-foreground mt-1">Create AI-powered films in minutes</p>
          </div>
        </div>

        {/* Referral Banner */}
        {referralCode && step === 1 && (
          <div className="flex items-center gap-2 bg-amber-600/10 border border-amber-500/20 rounded-lg px-4 py-3 text-sm">
            <Gift className="h-4 w-4 text-amber-400 shrink-0" />
            <span className="text-amber-400">
              You've been referred! Sign up to get <strong>3 bonus AI generations</strong> free.
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
                      autoFocus
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      autoComplete="tel"
                    />
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
                  />
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-xs text-red-400">Passwords do not match</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="referralCode" className="flex items-center gap-1.5">
                    <Gift className="h-3.5 w-3.5 text-amber-400" />
                    Referral Code
                    <span className="text-muted-foreground font-normal">(optional)</span>
                  </Label>
                  <Input
                    id="referralCode"
                    type="text"
                    placeholder="Enter referral code"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value)}
                  />
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
                    onClick={handleSubmit}
                    disabled={registerMutation.isPending}
                    className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
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
                <Button variant="ghost" onClick={skipToEnd} className="w-full text-muted-foreground hover:text-foreground text-sm">
                  Skip for now — complete profile later
                </Button>
              </CardFooter>
            </>
          )}
        </Card>

        {/* Terms */}
        <p className="text-xs text-muted-foreground text-center px-4">
          By creating an account, you agree to our{" "}
          <a href="/terms" className="text-amber-500 hover:text-amber-400">Terms of Service</a>{" "}
          and{" "}
          <a href="/privacy" className="text-amber-500 hover:text-amber-400">Privacy Policy</a>.
        </p>
      </div>

      {/* Leego Footer */}
      <div className="mt-6">
        <LeegoFooter />
      </div>
    </div>
  );
}
