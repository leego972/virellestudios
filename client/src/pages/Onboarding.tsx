import { useState, useEffect } from "react";
  import { useLocation } from "wouter";
  import { Button } from "@/components/ui/button";
  import { Input } from "@/components/ui/input";
  import {
    Film, Clapperboard, Music, Tv, GraduationCap, Sparkles,
    Lightbulb, FileText, Calendar, Target, Video, Scissors,
    BookOpen, Image, Play, Package, ArrowRight, Check, Loader2,
  } from "lucide-react";
  import GoldWatermarkLaunch from "@/components/GoldWatermarkLaunch";
  import { trpc } from "@/lib/trpc";
  import { toast } from "sonner";

  // ─── Constants ────────────────────────────────────────────────────────────────

  const PROJECT_TYPES = [
    { value: "short_film",    label: "Short Film",      icon: Film },
    { value: "feature_film",  label: "Feature Film",    icon: Video },
    { value: "trailer",       label: "Trailer",         icon: Clapperboard },
    { value: "music_video",   label: "Music Video",     icon: Music },
    { value: "commercial",    label: "Commercial / Ad", icon: Tv },
    { value: "student",       label: "Student Project", icon: GraduationCap },
    { value: "other",         label: "Other",           icon: Sparkles },
  ];

  const STAGES = [
    { value: "idea",           label: "Idea",            icon: Lightbulb,  desc: "Just a concept so far" },
    { value: "script",         label: "Script",          icon: FileText,   desc: "Working on or have a script" },
    { value: "pre_production", label: "Pre-Production",  icon: Calendar,   desc: "Planning scenes & shots" },
    { value: "pitching",       label: "Pitching",        icon: Target,     desc: "Seeking funding or partners" },
    { value: "production",     label: "Production",      icon: Video,      desc: "Actively generating content" },
    { value: "post_production",label: "Post-Production", icon: Scissors,   desc: "Editing & finishing" },
  ];

  const GOALS = [
    { value: "build_story",    label: "Build My Story",         icon: BookOpen,  mode: "manual",  desc: "Develop script, scenes & characters" },
    { value: "create_poster",  label: "Create a Poster",        icon: Image,     mode: "quick",   desc: "Generate key art for your project" },
    { value: "generate_scene", label: "Generate a Scene",       icon: Play,      mode: "quick",   desc: "Create a video scene right away" },
    { value: "create_trailer", label: "Create a Trailer",       icon: Clapperboard, mode: "trailer", desc: "Build a short trailer or teaser" },
    { value: "pitch_package",  label: "Build Pitch Package",    icon: Package,   mode: "manual",  desc: "Pitch deck, posters & look book" },
  ];

  // Maps goal → NewProject URL
  function goalToUrl(goal: string, projectType: string): string {
    const modeMap: Record<string, string> = {
      build_story:    "manual",
      create_poster:  "quick",
      generate_scene: "quick",
      create_trailer: "trailer",
      pitch_package:  "manual",
    };
    const mode = modeMap[goal] ?? "quick";
    const typeMap: Record<string, string> = {
      short_film:   "Drama",
      feature_film: "Drama",
      trailer:      "Action",
      music_video:  "Musical",
      commercial:   "Action",
      student:      "Drama",
    };
    const genre = typeMap[projectType] ?? "";
    const params = new URLSearchParams({ mode });
    if (genre) params.set("genre", genre);
    return `/new-project?${params.toString()}`;
  }

  // ─── Step Progress Bar ───────────────────────────────────────────────────────

  const STEP_LABELS = ["Project Type", "Stage", "First Goal", "Name It"];

  function ProgressBar({ step, total }: { step: number; total: number }) {
    return (
      <div className="flex items-center gap-2 mb-8">
        {Array.from({ length: total }).map((_, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
              <div className={`h-1 w-full rounded-full transition-all duration-300 ${done ? "bg-amber-500" : active ? "bg-amber-500/60" : "bg-white/10"}`} />
              <span className={`text-[10px] font-medium transition-colors ${active ? "text-amber-400" : done ? "text-amber-500/70" : "text-foreground/25"}`}>
                {STEP_LABELS[i]}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  // ─── Option Tile ─────────────────────────────────────────────────────────────

  function OptionTile({
    label, icon: Icon, desc, selected, onClick,
  }: {
    label: string; icon: React.ComponentType<{ className?: string }>;
    desc?: string; selected: boolean; onClick: () => void;
  }) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`relative flex flex-col items-start gap-2 p-4 rounded-xl border text-left transition-all duration-150 ${
          selected
            ? "border-amber-500 bg-amber-500/10 shadow-[0_0_16px_rgba(217,167,0,0.12)]"
            : "border-white/10 bg-white/[0.03] hover:border-amber-500/40 hover:bg-amber-500/5"
        }`}
      >
        {selected && (
          <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center shrink-0">
            <Check className="w-3 h-3 text-black" />
          </div>
        )}
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${selected ? "bg-amber-500/20" : "bg-white/5"}`}>
          <Icon className={`w-5 h-5 ${selected ? "text-amber-400" : "text-foreground/50"}`} />
        </div>
        <div>
          <p className={`text-sm font-semibold ${selected ? "text-foreground" : "text-foreground/70"}`}>{label}</p>
          {desc && <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{desc}</p>}
        </div>
      </button>
    );
  }

  // ─── Main Component ───────────────────────────────────────────────────────────

  const STORAGE_KEY = "virelle:onboarding-done";

  export default function Onboarding() {
    const [, navigate] = useLocation();
    const [step, setStep] = useState(0);

    const [projectType, setProjectType] = useState("");
    const [stage, setStage] = useState("");
    const [goal, setGoal] = useState("");
    const [projectName, setProjectName] = useState("");
    const [creating, setCreating] = useState(false);

    // Skip if already onboarded
    useEffect(() => {
      if (localStorage.getItem(STORAGE_KEY)) {
        navigate("/home", { replace: true });
      }
    }, [navigate]);

    const createMutation = trpc.project.create.useMutation({
      onSuccess: (project: any) => {
        localStorage.setItem(STORAGE_KEY, "1");
        navigate(`/projects/${project.id}`);
      },
      onError: (err: any) => {
        toast.error(err.message || "Failed to create project");
        setCreating(false);
      },
    });

    function completeOnboarding() {
      localStorage.setItem(STORAGE_KEY, "1");
      const url = goalToUrl(goal, projectType);
      navigate(url);
    }

    function skipAll() {
      localStorage.setItem(STORAGE_KEY, "1");
      navigate("/home");
    }

    async function handleCreateProject() {
      if (!projectName.trim()) {
        toast.error("Give your project a name first");
        return;
      }
      setCreating(true);
      const modeMap: Record<string, string> = {
        build_story: "manual", create_poster: "quick",
        generate_scene: "quick", create_trailer: "trailer", pitch_package: "manual",
      };
      const mode = (modeMap[goal] ?? "quick") as "quick" | "manual" | "trailer";
      try {
        await createMutation.mutateAsync({
          title: projectName.trim(),
          mode,
          genre: undefined,
          description: `${PROJECT_TYPES.find(t => t.value === projectType)?.label ?? ""} — created via onboarding`,
        });
      } catch {
        // error handled in onError
      }
    }

    const TOTAL_STEPS = 4;

    // ─── Step 0: Project Type ─────────────────────────────────────────────────
    if (step === 0) {
      return (
        <Screen skipAll={skipAll}>
          <ProgressBar step={0} total={TOTAL_STEPS} />
          <StepHeader
            eyebrow="Step 1 of 4"
            title="What are you creating?"
            subtitle="We'll tailor your studio to your project type."
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
            {PROJECT_TYPES.map(({ value, label, icon }) => (
              <OptionTile key={value} label={label} icon={icon}
                selected={projectType === value}
                onClick={() => { setProjectType(value); }}
              />
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <Button
              onClick={() => setStep(1)}
              disabled={!projectType}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-40"
            >
              Continue <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </Screen>
      );
    }

    // ─── Step 1: Production Stage ─────────────────────────────────────────────
    if (step === 1) {
      return (
        <Screen skipAll={skipAll}>
          <ProgressBar step={1} total={TOTAL_STEPS} />
          <StepHeader
            eyebrow="Step 2 of 4"
            title="What stage are you at?"
            subtitle="This helps us point you to the right tools immediately."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
            {STAGES.map(({ value, label, icon, desc }) => (
              <OptionTile key={value} label={label} icon={icon} desc={desc}
                selected={stage === value}
                onClick={() => setStage(value)}
              />
            ))}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(0)} className="border-white/15 hover:border-amber-500/40">
              Back
            </Button>
            <Button
              onClick={() => setStep(2)}
              disabled={!stage}
              className="flex-1 bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-40"
            >
              Continue <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </Screen>
      );
    }

    // ─── Step 2: First Goal ────────────────────────────────────────────────────
    if (step === 2) {
      return (
        <Screen skipAll={skipAll}>
          <ProgressBar step={2} total={TOTAL_STEPS} />
          <StepHeader
            eyebrow="Step 3 of 4"
            title="What do you want to do first?"
            subtitle="We'll drop you right into the right tool."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
            {GOALS.map(({ value, label, icon, desc }) => (
              <OptionTile key={value} label={label} icon={icon} desc={desc}
                selected={goal === value}
                onClick={() => setGoal(value)}
              />
            ))}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(1)} className="border-white/15 hover:border-amber-500/40">
              Back
            </Button>
            <Button
              onClick={() => setStep(3)}
              disabled={!goal}
              className="flex-1 bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-40"
            >
              Continue <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </Screen>
      );
    }

    // ─── Step 3: Name Your Project ─────────────────────────────────────────────
    const selectedType = PROJECT_TYPES.find(t => t.value === projectType);
    const selectedGoal = GOALS.find(g => g.value === goal);
    const selectedStage = STAGES.find(s => s.value === stage);

    return (
      <Screen skipAll={skipAll}>
        <ProgressBar step={3} total={TOTAL_STEPS} />
        <StepHeader
          eyebrow="Step 4 of 4"
          title="Name your first project"
          subtitle="You can always rename it later. Just get started."
        />

        {/* Summary pill */}
        <div className="flex flex-wrap gap-2 mb-6">
          {selectedType && (
            <span className="text-xs px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-400 font-medium">
              {selectedType.label}
            </span>
          )}
          {selectedStage && (
            <span className="text-xs px-3 py-1 rounded-full bg-white/5 border border-white/15 text-foreground/60">
              {selectedStage.label}
            </span>
          )}
          {selectedGoal && (
            <span className="text-xs px-3 py-1 rounded-full bg-white/5 border border-white/15 text-foreground/60">
              {selectedGoal.label}
            </span>
          )}
        </div>

        <div className="mb-6 space-y-2">
          <label className="text-sm font-medium text-foreground/80">Project name</label>
          <Input
            autoFocus
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && projectName.trim()) handleCreateProject(); }}
            placeholder={selectedType ? `Untitled ${selectedType.label}` : "My First Project"}
            className="bg-white/5 border-white/15 focus:border-amber-500/60 text-foreground placeholder:text-muted-foreground/40"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Button
            onClick={handleCreateProject}
            disabled={!projectName.trim() || creating}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-40"
          >
            {creating ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating Project…</>
            ) : (
              <>Create My First Project <ArrowRight className="w-4 h-4 ml-2" /></>
            )}
          </Button>
          <Button
            variant="ghost"
            onClick={completeOnboarding}
            className="w-full text-sm text-muted-foreground hover:text-foreground"
          >
            Skip — take me to the studio
          </Button>
        </div>

        <button
          onClick={() => setStep(2)}
          className="mt-4 text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
        >
          ← Back
        </button>
      </Screen>
    );
  }

  // ─── Sub-components ───────────────────────────────────────────────────────────

  function Screen({ children, skipAll }: { children: React.ReactNode; skipAll: () => void }) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 relative"
        style={{ background: "linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)" }}>
        <GoldWatermarkLaunch />
        <div className="w-full max-w-2xl relative z-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-sm bg-amber-500/90 flex items-center justify-center">
                <Film className="w-3.5 h-3.5 text-black" />
              </div>
              <span className="text-sm font-semibold text-foreground/80 tracking-wide">Virelle Studios</span>
            </div>
            <button
              onClick={skipAll}
              className="text-xs text-foreground/30 hover:text-foreground/60 transition-colors"
            >
              Skip setup →
            </button>
          </div>
          {children}
        </div>
      </div>
    );
  }

  function StepHeader({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
    return (
      <div className="mb-7">
        <p className="text-[11px] uppercase tracking-widest text-amber-500/70 font-semibold mb-2">{eyebrow}</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-gold-shimmer mb-2">{title}</h1>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
    );
  }
  