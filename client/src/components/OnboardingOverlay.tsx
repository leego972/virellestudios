import { useState, useEffect } from "react";
import { X, ArrowRight, Film, Zap, Users, Clapperboard, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

const ONBOARDING_KEY = "virelle-onboarding-completed";

interface OnboardingStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  action?: { label: string; path: string };
}

const STEPS: OnboardingStep[] = [
  {
    title: "Welcome to VirÉlle Studios",
    description: "Your AI-powered film production studio. Let's take a quick tour of what you can do here.",
    icon: <Sparkles className="h-8 w-8 text-amber-400" />,
  },
  {
    title: "Quick Generate",
    description: "Describe your film idea and our AI will generate a complete movie with scenes, characters, and cinematography — all in minutes.",
    icon: <Zap className="h-8 w-8 text-amber-400" />,
    action: { label: "Try Quick Generate", path: "/projects" },
  },
  {
    title: "Scene-by-Scene Mode",
    description: "For full creative control, build your film scene by scene. Set camera angles, lighting, weather, characters, and dialogue for each shot.",
    icon: <Film className="h-8 w-8 text-amber-400" />,
    action: { label: "Create a Project", path: "/projects" },
  },
  {
    title: "Character Library",
    description: "Create characters from photos, generate them with AI, or build them manually. Reuse them across all your projects.",
    icon: <Users className="h-8 w-8 text-amber-400" />,
    action: { label: "View Characters", path: "/characters" },
  },
  {
    title: "My Movies",
    description: "Export your projects as full films, individual scenes, or trailers. All your creations are stored in My Movies.",
    icon: <Clapperboard className="h-8 w-8 text-amber-400" />,
    action: { label: "Go to My Movies", path: "/movies" },
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
          <div className="flex items-start justify-between mb-6">
            <div className="p-3 rounded-xl bg-amber-500/10">
              {current.icon}
            </div>
            <button
              onClick={dismiss}
              className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <h2 className="text-xl font-bold text-white mb-2">{current.title}</h2>
          <p className="text-white/60 text-sm leading-relaxed mb-6">{current.description}</p>

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
                  "Get Started"
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
