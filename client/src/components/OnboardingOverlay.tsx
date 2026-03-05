import { useState, useEffect } from "react";
import { X, ArrowRight, Film, Zap, Users, Clapperboard, Sparkles, Key, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

const ONBOARDING_KEY = "virelle-onboarding-v2-completed";

interface OnboardingStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  action?: { label: string; path: string };
  badge?: string;
  tip?: string;
}

const STEPS: OnboardingStep[] = [
  {
    title: "Welcome to Virelle Studios",
    description: "The world's first AI film production platform. Generate complete feature-length films from a concept — or create individual VFX scenes for your live-action production.",
    icon: <Sparkles className="h-8 w-8 text-amber-400" />,
    tip: "This quick tour takes about 60 seconds.",
  },
  {
    title: "Step 1 — Add Your API Key",
    description: "Virelle uses your own AI provider keys (Runway ML, fal.ai, OpenAI Sora, etc.) to generate video. You only pay for what you use — no hidden costs. Add your first key in Settings to unlock video generation.",
    icon: <Key className="h-8 w-8 text-amber-400" />,
    action: { label: "Add API Key Now →", path: "/settings" },
    badge: "Required for video generation",
    tip: "Don't have a key yet? Pollinations.ai is completely free — no key needed to get started.",
  },
  {
    title: "Step 2 — Create Your First Project",
    description: "Use Quick Generate — describe your film idea in a few sentences and our AI Director builds the entire screenplay, scenes, characters, and cinematography automatically.",
    icon: <Zap className="h-8 w-8 text-amber-400" />,
    action: { label: "Create Your First Project →", path: "/projects/new?mode=quick" },
    tip: "Or use Scene-by-Scene mode for full creative control over every shot.",
  },
  {
    title: "Step 3 — Build Your Cast",
    description: "Upload a photo of a real person, generate a character with AI, or describe one from scratch. Characters are locked to their DNA — they look identical in every scene across your entire film.",
    icon: <Users className="h-8 w-8 text-amber-400" />,
    action: { label: "Create Characters →", path: "/characters" },
    tip: "You can add characters before or after creating a project.",
  },
  {
    title: "Step 4 — Generate & Export",
    description: "Once your scenes are ready, generate preview images, then export your full film as MP4, ProRes, or individual scenes for compositing in Premiere Pro or DaVinci Resolve.",
    icon: <Clapperboard className="h-8 w-8 text-amber-400" />,
    action: { label: "View My Movies →", path: "/movies" },
    tip: "My Movies is where all your completed and exported productions live.",
  },
];

export default function OnboardingOverlay() {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const completed = localStorage.getItem(ONBOARDING_KEY);
    if (!completed) {
      // Small delay so the dashboard renders first
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(ONBOARDING_KEY, "true");
  };

  const next = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      dismiss();
    }
  };

  const goToAction = (path: string) => {
    dismiss();
    setLocation(path);
  };

  if (!visible) return null;

  const current = STEPS[step];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-white/5">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8">
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-amber-500/10 shrink-0">
                {current.icon}
              </div>
              {current.badge && (
                <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-1 rounded-full">
                  {current.badge}
                </span>
              )}
            </div>
            <button
              onClick={dismiss}
              className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Skip tour"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <h2 className="text-xl font-bold text-white mb-2">{current.title}</h2>
          <p className="text-white/60 text-sm leading-relaxed mb-4">{current.description}</p>

          {current.tip && (
            <div className="flex items-start gap-2 bg-white/5 rounded-lg px-3 py-2.5 mb-5">
              <CheckCircle2 className="h-3.5 w-3.5 text-amber-400 mt-0.5 shrink-0" />
              <p className="text-xs text-white/50 leading-relaxed">{current.tip}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/30">
              {step + 1} of {STEPS.length}
            </span>
            <div className="flex items-center gap-2">
              {current.action && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-amber-400 hover:text-amber-300"
                  onClick={() => goToAction(current.action!.path)}
                >
                  {current.action.label}
                </Button>
              )}
              <Button
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white"
                onClick={next}
              >
                {step < STEPS.length - 1 ? (
                  <>
                    Next
                    <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </>
                ) : (
                  "Start Creating"
                )}
              </Button>
            </div>
          </div>

          {/* Step dots */}
          <div className="flex justify-center gap-1.5 mt-6">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? "w-6 bg-amber-500" : "w-1.5 bg-white/20 hover:bg-white/40"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
