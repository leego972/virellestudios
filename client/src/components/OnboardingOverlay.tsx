import { useState, useEffect } from "react";
import {
  X, ChevronRight, ChevronLeft, CheckCircle2,
  Key, Film, Star, Rocket, Globe, Mic2, Sparkles
} from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

const ONBOARDING_KEY = "virelle-onboarding-v4-completed";
const CHECKLIST_KEY = "virelle-checklist-v4";

export type ChecklistItem = {
  id: string;
  label: string;
  done: boolean;
};

const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { id: "api_key", label: "Add a video API key (Veo3, Runway, or Replicate)", done: false },
  { id: "first_project", label: "Create your first project", done: false },
  { id: "first_scene", label: "Generate your first scene", done: false },
  { id: "add_character", label: "Add a character to your film", done: false },
  { id: "add_sound", label: "Add sound or score to a scene", done: false },
  { id: "browse_funding", label: "Browse the Funding Directory", done: false },
];

export function useOnboardingChecklist() {
  const [items, setItems] = useState<ChecklistItem[]>(() => {
    try {
      const stored = localStorage.getItem(CHECKLIST_KEY);
      return stored ? JSON.parse(stored) : DEFAULT_CHECKLIST;
    } catch {
      return DEFAULT_CHECKLIST;
    }
  });

  const markDone = (id: string) => {
    setItems(prev => {
      const next = prev.map(i => i.id === id ? { ...i, done: true } : i);
      localStorage.setItem(CHECKLIST_KEY, JSON.stringify(next));
      return next;
    });
  };

  const completedCount = items.filter(i => i.done).length;
  const allDone = completedCount === items.length;

  return { items, markDone, completedCount, allDone };
}

const STEPS = [
  {
    id: "welcome",
    icon: <img src="/virelle-logo-square.png" alt="Virelle Studios" className="h-16 w-16 object-contain" />,
    bg: "from-amber-950/60 to-black",
    accent: "#b45309",
    title: "Welcome to Virelle Studios",
    subtitle: "Your AI-powered film production studio",
    description:
      "Virelle Studios gives you everything you need to write, produce, and distribute a professional film — powered by AI. From script to screen in one place.",
    tip: null,
    action: null,
  },
  {
    id: "api_key",
    icon: <Key className="h-10 w-10 text-sky-400" />,
    bg: "from-sky-950/60 to-black",
    accent: "#0a7ea4",
    title: "Connect Your Video API",
    subtitle: "Required to generate video scenes",
    description:
      "To generate video, you need at least one API key. Virelle supports Google Veo3 (best quality), Runway, Replicate, and Pollinations (free). Add your key in Settings → API Keys.",
    tip: "Veo3 is recommended for cinematic quality. If you don't have a key yet, Pollinations is free and requires no sign-up.",
    action: { label: "Go to Settings → API Keys", path: "/settings" },
  },
  {
    id: "project",
    icon: <Film className="h-10 w-10 text-violet-400" />,
    bg: "from-violet-950/60 to-black",
    accent: "#7c3aed",
    title: "Create Your First Project",
    subtitle: "Your film starts here",
    description:
      "Every film starts with a project. Give it a title, genre, and a one-sentence logline. The AI uses your logline to generate better scripts, scenes, and characters throughout production.",
    tip: "A strong logline: 'A [protagonist] must [goal] before [stakes].' The more specific, the better the AI output.",
    action: { label: "Create a Project →", path: "/projects/new" },
  },
  {
    id: "generate",
    icon: <Sparkles className="h-10 w-10 text-emerald-400" />,
    bg: "from-emerald-950/60 to-black",
    accent: "#059669",
    title: "Generate Scenes & Script",
    subtitle: "Let the AI write your film",
    description:
      "Inside your project, use the AI Script Writer to generate a full screenplay. Then use the Scene Editor to generate video clips for each scene. The Director's Assistant can help you refine everything with voice or text.",
    tip: "Script generation costs 10 credits. Scene video generation costs vary by provider — Pollinations is free.",
    action: null,
  },
  {
    id: "sound",
    icon: <Mic2 className="h-10 w-10 text-rose-400" />,
    bg: "from-rose-950/60 to-black",
    accent: "#dc2626",
    title: "Add Sound & Score",
    subtitle: "Professional post-production",
    description:
      "Use the Post-Production tools to add ADR (re-recorded dialogue), Foley (ambient sounds), and an AI-generated musical score. Mix all tracks in the Mix Panel for a cinema-quality result.",
    tip: "AI score suggestions are available inside each project. You can also upload your own music files.",
    action: null,
  },
  {
    id: "distribute",
    icon: <Globe className="h-10 w-10 text-amber-400" />,
    bg: "from-amber-950/60 to-black",
    accent: "#d97706",
    title: "Fund & Distribute",
    subtitle: "Get your film seen",
    description:
      "Browse 94 international film funds in the Funding Directory and generate a professional application package. When your film is ready, use the Distribute tool to publish to streaming platforms.",
    tip: "Always verify exact requirements on each fund's live portal before submitting your application.",
    action: { label: "Browse Funding Directory →", path: "/funding" },
  },
  {
    id: "assets",
    icon: <Star className="h-10 w-10 text-yellow-400" />,
    bg: "from-yellow-950/60 to-black",
    accent: "#ca8a04",
    title: "Explore the Asset Marketplace",
    subtitle: "Premium packs for your production",
    description:
      "The Asset Marketplace has premium cinematography packs, character bundles, score libraries, VFX packs, and professional prompt libraries — all designed to elevate your film's quality.",
    tip: "Admins have free access to all assets. Free assets are available to all users with no purchase required.",
    action: { label: "Browse Asset Marketplace →", path: "/marketplace" },
  },
  {
    id: "ready",
    icon: <Rocket className="h-10 w-10 text-amber-400" />,
    bg: "from-amber-950/60 to-black",
    accent: "#b45309",
    title: "You're Ready to Create",
    subtitle: "Lights. Camera. Action.",
    description:
      "That's everything you need to know. Your dashboard has a Getting Started checklist to track your progress. The Director's Assistant is always available to help — just tap the Assistant button.",
    tip: null,
    action: null,
  },
];

interface OnboardingOverlayProps {
  forceShow?: boolean;
  onClose?: () => void;
}

export default function OnboardingOverlay({ forceShow = false, onClose }: OnboardingOverlayProps = {}) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const [doNotShow, setDoNotShow] = useState(false);
  const [, setLocation] = useLocation();
  const { data: user } = trpc.auth.me.useQuery();

  useEffect(() => {
    if (forceShow) { setVisible(true); return; }
    const completed = localStorage.getItem(ONBOARDING_KEY);
    if (!completed) {
      const timer = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(timer);
    }
  }, [forceShow]);

  const handleClose = () => {
    if (doNotShow) localStorage.setItem(ONBOARDING_KEY, "true");
    setVisible(false);
    onClose?.();
  };

  const handleFinish = () => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    setVisible(false);
    onClose?.();
  };

  const goToAction = (path: string) => {
    handleFinish();
    setLocation(path);
  };

  if (!visible) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const isFirst = step === 0;
  const progress = ((step) / (STEPS.length - 1)) * 100;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div
        className="relative w-full max-w-md bg-card border border-border/60 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: "calc(100dvh - 32px)" }}
      >
        {/* Gradient top accent */}
        <div
          className="h-1 w-full transition-all duration-500"
          style={{
            background: `linear-gradient(90deg, ${current.accent}, ${current.accent}88)`,
            width: `${progress + (100 / STEPS.length)}%`,
          }}
        />

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2 shrink-0">
          <div className="flex items-center gap-2">
            <img
              src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663418605762/hxRQQgsmyjgcByim.png"
              alt="Virelle Studios"
              className="w-6 h-6 rounded-md"
            />
            <span className="text-xs font-semibold text-foreground/80">
              {user?.name ? `Welcome, ${user.name.split(" ")[0]}` : "Virelle Studios"} — Getting Started
            </span>
          </div>
          <button
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-surface"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Step dots */}
        <div className="flex items-center gap-1 px-5 pb-3 shrink-0">
          {STEPS.map((s, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className="h-1 rounded-full transition-all duration-300"
              style={{
                width: i === step ? 20 : 6,
                backgroundColor: i === step ? current.accent : i < step ? current.accent + "60" : "#334155",
              }}
              aria-label={`Go to step ${i + 1}`}
            />
          ))}
          <span className="ml-auto text-[10px] text-muted-foreground font-medium">
            {step + 1} / {STEPS.length}
          </span>
        </div>

        {/* Content — scrollable */}
        <div className="overflow-y-auto flex-1 px-5 pb-2" style={{ minHeight: 0 }}>
          {/* Hero icon */}
          <div
            className="w-full rounded-xl flex items-center justify-center py-8 mb-4"
            style={{ background: `linear-gradient(135deg, ${current.accent}18, ${current.accent}06)`, border: `1px solid ${current.accent}22` }}
          >
            {current.icon}
          </div>

          {/* Text */}
          <div className="space-y-1 mb-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: current.accent }}>
              {current.subtitle}
            </p>
            <h2 className="text-lg font-bold text-foreground leading-tight">{current.title}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed pt-1">{current.description}</p>
          </div>

          {/* Tip */}
          {current.tip && (
            <div
              className="rounded-xl p-3 mb-3"
              style={{ backgroundColor: current.accent + "0d", border: `1px solid ${current.accent}22` }}
            >
              <p className="text-xs text-muted-foreground leading-relaxed">
                <span className="font-semibold" style={{ color: current.accent }}>Tip: </span>
                {current.tip}
              </p>
            </div>
          )}

          {/* Action link */}
          {current.action && (
            <button
              onClick={() => goToAction(current.action!.path)}
              className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all mb-2"
              style={{ backgroundColor: current.accent + "22", color: current.accent, border: `1px solid ${current.accent}44` }}
            >
              {current.action.label}
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pt-3 pb-5 space-y-3 shrink-0 border-t border-border/40">
          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="flex items-center gap-1 px-4 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
            )}
            <button
              onClick={isLast ? handleFinish : () => setStep(s => s + 1)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
              style={{ backgroundColor: current.accent }}
            >
              {isLast ? (
                <><CheckCircle2 className="h-4 w-4" />Start Creating</>
              ) : (
                <>Next<ChevronRight className="h-4 w-4" /></>
              )}
            </button>
          </div>
          <label className="flex items-center justify-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={doNotShow}
              onChange={e => setDoNotShow(e.target.checked)}
              className="w-3.5 h-3.5 rounded accent-amber-500 cursor-pointer"
            />
            <span className="text-xs text-muted-foreground">Do not show this again</span>
          </label>
        </div>
      </div>
    </div>
  );
}
