import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Search,
  Globe,
  ExternalLink,
  DollarSign,
  Filter,
  X,
  Send,
  Loader2,
  ChevronRight,
  Building2,
  MapPin,
  Layers,
  FileText,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import type { FundingSource } from "../../../drizzle/schema";

// ─── Application Form Modal ────────────────────────────────────────────────────

interface ApplicationModalProps {
  source: FundingSource;
  onClose: () => void;
  userEmail?: string;
  userName?: string;
}

function ApplicationModal({ source, onClose, userEmail, userName }: ApplicationModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    // Applicant
    applicantName: userName || "",
    applicantEmail: userEmail || "",
    applicantPhone: "",
    applicantCountry: "",
    companyName: "",
    companyWebsite: "",
    // Project
    projectTitle: "",
    projectType: "Feature Film",
    genre: "",
    logline: "",
    synopsis: "",
    budget: "",
    fundingRequested: "",
    productionStage: "Development",
    expectedDelivery: "",
    // Team
    directorName: "",
    producerName: "",
    writerName: "",
    // Additional
    previousWork: "",
    whyThisFund: "",
    additionalNotes: "",
  });

  const submitMutation = trpc.funding.submitApplication.useMutation({
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: (err) => {
      toast.error("Failed to submit application: " + err.message);
    },
  });

  const set = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = () => {
    submitMutation.mutate({
      fundingSourceId: source.id,
      fundingOrganization: source.organization,
      fundingCountry: source.country,
      officialSite: source.officialSite || undefined,
      applicantName: form.applicantName,
      applicantEmail: form.applicantEmail,
      applicantPhone: form.applicantPhone || undefined,
      applicantCountry: form.applicantCountry,
      companyName: form.companyName || undefined,
      companyWebsite: form.companyWebsite || undefined,
      projectTitle: form.projectTitle,
      projectType: form.projectType,
      genre: form.genre,
      logline: form.logline,
      synopsis: form.synopsis,
      budget: form.budget,
      fundingRequested: form.fundingRequested,
      productionStage: form.productionStage,
      expectedDelivery: form.expectedDelivery,
      directorName: form.directorName || undefined,
      producerName: form.producerName || undefined,
      writerName: form.writerName || undefined,
      previousWork: form.previousWork || undefined,
      whyThisFund: form.whyThisFund,
      additionalNotes: form.additionalNotes || undefined,
    });
  };

  const canProceedStep1 =
    form.applicantName.trim() &&
    form.applicantEmail.trim() &&
    form.applicantCountry.trim();

  const canProceedStep2 =
    form.projectTitle.trim() &&
    form.genre.trim() &&
    form.logline.trim().length >= 10 &&
    form.synopsis.trim().length >= 50 &&
    form.budget.trim() &&
    form.fundingRequested.trim() &&
    form.expectedDelivery.trim();

  const canSubmit = form.whyThisFund.trim().length >= 20;

  if (submitted) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <div className="flex flex-col items-center text-center gap-4 py-6">
            <div className="h-16 w-16 rounded-full bg-green-500/15 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Application Submitted!</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Your application for <strong>{source.organization}</strong> has been compiled and sent to{" "}
                <strong>{form.applicantEmail}</strong>. Review it and submit directly to the funder.
              </p>
            </div>
            {source.officialSite && (
              <a
                href={source.officialSite}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <ExternalLink className="h-4 w-4" />
                Visit {source.organization} official site
              </a>
            )}
            <Button onClick={onClose} className="w-full mt-2">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-amber-500" />
            Funding Application
          </DialogTitle>
          <DialogDescription>
            Applying to <strong>{source.organization}</strong> — {source.country}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 py-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div
                className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                  step === s
                    ? "bg-primary text-primary-foreground"
                    : step > s
                    ? "bg-green-500 text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {step > s ? <CheckCircle2 className="h-4 w-4" /> : s}
              </div>
              <span className={`text-xs ${step === s ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                {s === 1 ? "Applicant" : s === 2 ? "Project" : "Statement"}
              </span>
              {s < 3 && <div className="flex-1 h-px bg-border" />}
            </div>
          ))}
        </div>

        {/* Step 1: Applicant */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
              <strong>Applying to:</strong> {source.organization} ({source.country})
              {source.supports && <> · <strong>Supports:</strong> {source.supports}</>}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Full Name *</Label>
                <Input value={form.applicantName} onChange={(e) => set("applicantName", e.target.value)} placeholder="Your full name" className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Email Address *</Label>
                <Input type="email" value={form.applicantEmail} onChange={(e) => set("applicantEmail", e.target.value)} placeholder="you@example.com" className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Phone (optional)</Label>
                <Input value={form.applicantPhone} onChange={(e) => set("applicantPhone", e.target.value)} placeholder="+1 555 000 0000" className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Your Country *</Label>
                <Input value={form.applicantCountry} onChange={(e) => set("applicantCountry", e.target.value)} placeholder="e.g. France" className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Company / Production House</Label>
                <Input value={form.companyName} onChange={(e) => set("companyName", e.target.value)} placeholder="Studio name (optional)" className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Company Website</Label>
                <Input value={form.companyWebsite} onChange={(e) => set("companyWebsite", e.target.value)} placeholder="https://yourstudio.com" className="h-9 text-sm" />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={() => setStep(2)} disabled={!canProceedStep1} className="gap-2">
                Next: Project Details <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Project */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs">Project Title *</Label>
                <Input value={form.projectTitle} onChange={(e) => set("projectTitle", e.target.value)} placeholder="Your film's title" className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Project Type *</Label>
                <Select value={form.projectType} onValueChange={(v) => set("projectType", v)}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Feature Film", "Documentary", "Short Film", "TV Series", "Web Series", "Animation", "Experimental"].map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Genre *</Label>
                <Input value={form.genre} onChange={(e) => set("genre", e.target.value)} placeholder="e.g. Drama, Thriller, Comedy" className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Production Stage *</Label>
                <Select value={form.productionStage} onValueChange={(v) => set("productionStage", v)}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Development", "Pre-Production", "Production", "Post-Production", "Distribution"].map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Total Budget *</Label>
                <Input value={form.budget} onChange={(e) => set("budget", e.target.value)} placeholder="e.g. $500,000" className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Funding Requested *</Label>
                <Input value={form.fundingRequested} onChange={(e) => set("fundingRequested", e.target.value)} placeholder="e.g. $150,000" className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Expected Delivery *</Label>
                <Input value={form.expectedDelivery} onChange={(e) => set("expectedDelivery", e.target.value)} placeholder="e.g. Q4 2026" className="h-9 text-sm" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs">Logline * <span className="text-muted-foreground">(one compelling sentence)</span></Label>
                <Input value={form.logline} onChange={(e) => set("logline", e.target.value)} placeholder="A one-sentence hook that captures your film's essence" className="h-9 text-sm" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs">Synopsis * <span className="text-muted-foreground">(min. 50 characters)</span></Label>
                <Textarea value={form.synopsis} onChange={(e) => set("synopsis", e.target.value)} placeholder="Describe your film's story, themes, and vision in 2–4 paragraphs..." rows={4} className="text-sm resize-none" />
                <p className="text-[10px] text-muted-foreground text-right">{form.synopsis.length} chars</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Director</Label>
                <Input value={form.directorName} onChange={(e) => set("directorName", e.target.value)} placeholder="Director's name" className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Producer</Label>
                <Input value={form.producerName} onChange={(e) => set("producerName", e.target.value)} placeholder="Producer's name" className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Writer</Label>
                <Input value={form.writerName} onChange={(e) => set("writerName", e.target.value)} placeholder="Writer's name" className="h-9 text-sm" />
              </div>
            </div>
            <div className="flex justify-between pt-2">
              <Button variant="ghost" onClick={() => setStep(1)} className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button onClick={() => setStep(3)} disabled={!canProceedStep2} className="gap-2">
                Next: Statement <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Statement */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Why This Fund? * <span className="text-muted-foreground">(min. 20 characters)</span></Label>
              <Textarea
                value={form.whyThisFund}
                onChange={(e) => set("whyThisFund", e.target.value)}
                placeholder={`Explain why ${source.organization} is the right fit for your project. Mention alignment with their mission, your connection to their region or focus area, and how the funding will be used...`}
                rows={5}
                className="text-sm resize-none"
              />
              <p className="text-[10px] text-muted-foreground text-right">{form.whyThisFund.length} chars</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Previous Work / Credits <span className="text-muted-foreground">(optional)</span></Label>
              <Textarea
                value={form.previousWork}
                onChange={(e) => set("previousWork", e.target.value)}
                placeholder="List relevant films, awards, festival selections, or productions you've been part of..."
                rows={3}
                className="text-sm resize-none"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Additional Notes <span className="text-muted-foreground">(optional)</span></Label>
              <Textarea
                value={form.additionalNotes}
                onChange={(e) => set("additionalNotes", e.target.value)}
                placeholder="Any other information relevant to your application..."
                rows={2}
                className="text-sm resize-none"
              />
            </div>
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2.5 text-xs text-blue-300 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                Your completed application will be sent to <strong>{form.applicantEmail}</strong>. You will then need to submit it directly to {source.organization}{source.officialSite ? ` at ${source.officialSite}` : ""}. This tool compiles and delivers your application — it does not submit on your behalf.
              </span>
            </div>
            <div className="flex justify-between pt-2">
              <Button variant="ghost" onClick={() => setStep(2)} className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit || submitMutation.isPending}
                className="gap-2 bg-amber-600 hover:bg-amber-700 text-white"
              >
                {submitMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</>
                ) : (
                  <><Send className="h-4 w-4" /> Send Application to My Email</>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Funding Source Card ───────────────────────────────────────────────────────

function FundingCard({ source, onApply }: { source: FundingSource; onApply: () => void }) {
  const typeColors: Record<string, string> = {
    "National public agency": "bg-blue-500/15 text-blue-400 border-blue-500/20",
    "Regional public agency": "bg-purple-500/15 text-purple-400 border-purple-500/20",
    "Private/nonprofit fund": "bg-green-500/15 text-green-400 border-green-500/20",
    "International fund": "bg-amber-500/15 text-amber-400 border-amber-500/20",
    "National incentive": "bg-orange-500/15 text-orange-400 border-orange-500/20",
    "Regional incentive fund": "bg-pink-500/15 text-pink-400 border-pink-500/20",
    "Public/nonprofit fund": "bg-teal-500/15 text-teal-400 border-teal-500/20",
    "Broadcaster-backed fund": "bg-indigo-500/15 text-indigo-400 border-indigo-500/20",
    "Public arts fund": "bg-rose-500/15 text-rose-400 border-rose-500/20",
  };
  const typeClass = (source.type && typeColors[source.type]) || "bg-muted/40 text-muted-foreground border-border";

  return (
    <div className="group rounded-xl border border-border bg-card/60 hover:border-amber-500/30 hover:bg-card/80 transition-all duration-200 p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold leading-tight truncate">{source.organization}</h3>
          <div className="flex items-center gap-1.5 mt-1">
            <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground truncate">{source.country}</span>
          </div>
        </div>
        {source.type && (
          <Badge variant="outline" className={`text-[10px] shrink-0 border ${typeClass}`}>
            {source.type.replace("National public agency", "National").replace("Regional public agency", "Regional").replace("Private/nonprofit fund", "Nonprofit").replace("International fund", "International")}
          </Badge>
        )}
      </div>

      {/* Details */}
      <div className="space-y-1.5 flex-1">
        {source.supports && (
          <div className="flex items-start gap-1.5">
            <Layers className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{source.supports}</p>
          </div>
        )}
        {source.stage && (
          <div className="flex items-center gap-1.5">
            <Building2 className="h-3 w-3 text-muted-foreground shrink-0" />
            <p className="text-xs text-muted-foreground">{source.stage}</p>
          </div>
        )}
        {source.fundingForm && (
          <div className="flex items-center gap-1.5">
            <DollarSign className="h-3 w-3 text-amber-500 shrink-0" />
            <p className="text-xs text-amber-400/80">{source.fundingForm}</p>
          </div>
        )}
        {source.eligibility && (
          <div className="flex items-center gap-1.5">
            <Globe className="h-3 w-3 text-muted-foreground shrink-0" />
            <p className="text-xs text-muted-foreground">Eligible: {source.eligibility}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1 border-t border-border/50">
        <Button
          size="sm"
          className="flex-1 h-8 text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
          onClick={onApply}
        >
          <FileText className="h-3.5 w-3.5" />
          Apply Now
        </Button>
        {source.officialSite && (
          <a
            href={source.officialSite}
            target="_blank"
            rel="noopener noreferrer"
            className="h-8 w-8 rounded-md border border-border flex items-center justify-center hover:bg-accent transition-colors shrink-0"
            title="Visit official site"
          >
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
          </a>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function FundingDirectory() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [applyingTo, setApplyingTo] = useState<FundingSource | null>(null);

  const { data: sources = [], isLoading } = trpc.funding.list.useQuery({});
  const { data: countries = [] } = trpc.funding.countries.useQuery();

  const PAID_TIERS = ["independent", "creator", "studio", "pro", "industry", "beta"];
  const isPaidUser = user && PAID_TIERS.includes((user as any).subscriptionTier || "");

  // Redirect non-paid users
  if (user && !isPaidUser && (user as any).role !== "admin") {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center space-y-4">
        <div className="h-16 w-16 rounded-full bg-amber-500/15 flex items-center justify-center mx-auto">
          <DollarSign className="h-8 w-8 text-amber-500" />
        </div>
        <h2 className="text-xl font-semibold">Funding Directory</h2>
        <p className="text-muted-foreground text-sm">
          Access to the global film funding directory is available to paid subscribers. Upgrade your plan to discover 101 funding sources across 73 countries and submit professional applications.
        </p>
        <Button onClick={() => setLocation("/pricing")} className="bg-amber-600 hover:bg-amber-700 text-white">
          View Plans
        </Button>
      </div>
    );
  }

  // Unique types for filter
  const allTypes = useMemo(() => {
    const types = [...new Set(sources.map((s) => s.type).filter(Boolean))].sort();
    return types as string[];
  }, [sources]);

  const filtered = useMemo(() => {
    let result = sources;
    if (selectedCountry !== "all") {
      result = result.filter((s) => s.country === selectedCountry);
    }
    if (selectedType !== "all") {
      result = result.filter((s) => s.type === selectedType);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.organization.toLowerCase().includes(q) ||
          s.country.toLowerCase().includes(q) ||
          (s.supports && s.supports.toLowerCase().includes(q)) ||
          (s.type && s.type.toLowerCase().includes(q)) ||
          (s.eligibility && s.eligibility.toLowerCase().includes(q))
      );
    }
    return result;
  }, [sources, selectedCountry, selectedType, search]);

  const clearFilters = () => {
    setSearch("");
    setSelectedCountry("all");
    setSelectedType("all");
  };

  const hasFilters = search || selectedCountry !== "all" || selectedType !== "all";

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <button
              onClick={() => setLocation("/")}
              className="text-muted-foreground hover:text-foreground transition-colors text-sm flex items-center gap-1"
            >
              <ArrowLeft className="h-4 w-4" />
              Home
            </button>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-amber-500" />
            Global Film Funding Directory
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {sources.length} funding sources across {countries.length} countries — discover grants, incentives, and co-production funds worldwide.
          </p>
        </div>
        <Badge variant="outline" className="border-amber-500/30 text-amber-400 bg-amber-500/10 text-xs">
          Paid Members Only
        </Badge>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search funds, countries, types..."
            className="pl-9 h-9 text-sm"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>

        <Select value={selectedCountry} onValueChange={setSelectedCountry}>
          <SelectTrigger className="h-9 text-sm w-[180px]">
            <Globe className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="All Countries" />
          </SelectTrigger>
          <SelectContent className="max-h-64">
            <SelectItem value="all">All Countries</SelectItem>
            {countries.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="h-9 text-sm w-[200px]">
            <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent className="max-h-64">
            <SelectItem value="all">All Types</SelectItem>
            {allTypes.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 gap-1.5 text-xs text-muted-foreground">
            <X className="h-3.5 w-3.5" />
            Clear filters
          </Button>
        )}

        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.length} result{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="h-48 rounded-xl bg-muted/30 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <div className="h-12 w-12 rounded-full bg-muted/40 flex items-center justify-center mx-auto">
            <Search className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">No funding sources found</p>
          <p className="text-xs text-muted-foreground">Try adjusting your filters or search terms</p>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>Clear all filters</Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((source) => (
            <FundingCard
              key={source.id}
              source={source}
              onApply={() => setApplyingTo(source)}
            />
          ))}
        </div>
      )}

      {/* Application Modal */}
      {applyingTo && (
        <ApplicationModal
          source={applyingTo}
          onClose={() => setApplyingTo(null)}
          userEmail={user?.email || ""}
          userName={user?.name || ""}
        />
      )}
    </div>
  );
}
