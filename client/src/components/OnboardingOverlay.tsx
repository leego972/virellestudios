import { useEffect, useState } from "react";
import {
  X,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Key,
  Film,
  Star,
  Rocket,
  Globe,
  Mic2,
  Sparkles,
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
    setItems(previous => {
      const next = previous.map(item =>
        item.id === id ? { ...item, done: true } : item,
      );
      localStorage.setItem(CHECKLIST_KEY, JSON.stringify(next));
      return next;
    });
  };

  const completedCount = items.filter(item => item.done).length;
  const allDone = completedCount === items.length;

  return { items, markDone, completedCount, allDone };
}

const STEPS = [
  {
    id: "welcome",
    icon: (
      <img
        src="/virelle-logo-square.png"
        alt="Virelle Studios"
        className="h-16 w-16 object-contain"
      />
    ),
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
    accent: "#0a7ea4",
    title: "Connect Your Video API",
    subtitle: "Required to generate video scenes",
    description:
      "To generate video, you need at least one API key. Virelle supports Google Veo3, Runway, Replicate, and Pollinations. Add your key in Settings → API Keys.",
    tip: "Veo3 is recommended for cinematic quality. Pollinations can be used without a separate account.",
    action: { label: "Go to Settings → API Keys", path: "/settings" },
  },
  {
    id: "project",
    icon: <Film className="h-10 w-10 text-violet-400" />,
    accent: "#7c3aed",
    title: "Create Your First Project",
    subtitle: "Your film starts here",
    description:
      "Every film starts with a project. Give it a title, genre, and a one-sentence logline. The AI uses your logline to generate better scripts, scenes, and characters throughout production.",
    tip: "A strong logline identifies the protagonist, goal, and stakes. The more specific it is, the better the AI output.",
    action: { label: "Create a Project →", path: "/projects/new" },
  },
  {
    id: "generate",
    icon: <Sparkles className="h-10 w-10 text-emerald-400" />,
    accent: "#059669",
    title: "Generate Scenes & Script",
    subtitle: "Let the AI write your film",
    description:
      "Inside your project, use the AI Script Writer to generate a screenplay. Then use the Scene Editor to generate clips. The Director's Assistant can help refine the production with voice or text.",
    tip: "Generation costs vary by provider and selected quality.",
    action: null,
  },
  {
    id: "sound",
    icon: <Mic2 className="h-10 w-10 text-rose-400" />,
    accent: "#dc2626",
    title: "Add Sound & Score",
    subtitle: "Professional post-production",
    description:
      "Use the post-production tools to add ADR, Foley, and an AI-generated score. Mix all tracks in the Mix Panel for a finished production.",
    tip: "AI score suggestions are available inside each project. You can also upload your own music files.",
    action: null,
  },
  {
    id: "distribute",
    icon: <Globe className="h-10 w-10 text-amber-400" />,
    accent: "#d97706",
    title: "Fund & Distribute",
    subtitle: "Get your film seen",
    description:
      "Browse international film funds in the Funding Directory and generate a professional application package. When your film is ready, use the distribution tools to prepare it for release.",
    tip: "Always verify exact requirements on each fund's live portal before submitting your application.",
    action: { label: "Browse Funding Directory →", path: "/funding" },
  },
  {
    id: "assets",
    icon: <Star className="h-10 w-10 text-yellow-400" />,
    accent: "#ca8a04",
    title: "Explore the Asset Marketplace",
    subtitle: "Production assets in one place",
    description:
      "The marketplace includes cinematography packs, character bundles, score libraries, VFX packs, and prompt libraries for your productions.",
    tip: "Free and premium assets are clearly identified in the marketplace.",
    action: { label: "Browse Asset Marketplace →", path: "/marketplace" },
  },
  {
    id: "ready",
    icon: <Rocket className="h-10 w-10 text-amber-400" />,
    accent: "#b45309",
    title: "You're Ready to Create",
    subtitle: "Lights. Camera. Action.",
    description:
      "Your dashboard includes a Getting Started checklist to track progress. The Director's Assistant is available whenever you need guidance.",
    tip: null,
    action: null,
  },
] as const;

interface OnboardingOverlayProps {
  forceShow?: boolean;
  onClose?: () => void;
}

export default function OnboardingOverlay({
  forceShow = false,
  onClose,
}: OnboardingOverlayProps = {}) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const [doNotShow, setDoNotShow] = useState(false);
  const [, setLocation] = useLocation();
  const { data: user } = trpc.auth.me.useQuery();

  // The welcome-gift picker is the first-login action. Keep onboarding manual
  // so two full-screen surfaces can never cover each other on mobile.
  useEffect(() => {
    setVisible(forceShow);
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
  const progress = (step / (STEPS.length - 1)) * 100;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div
        className="relative flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border/60 bg-[#0c0b18] shadow-2xl"
        style={{ maxHeight: "calc(100dvh - 32px)" }}
      >
        <div
          className="h-1 w-full transition-all duration-500"
          style={{
            background: `linear-gradient(90deg, ${current.accent}, ${current.accent}88)`,
            width: `${progress + 100 / STEPS.length}%`,
          }}
        />

        <div className="flex shrink-0 items-center justify-between px-5 pb-2 pt-4">
          <div className="flex min-w-0 items-center gap-2">
            <img
              src="/virelle-logo-square.png"
              alt="Virelle Studios"
              className="h-6 w-6 shrink-0 rounded-md"
            />
            <span className="truncate text-xs font-semibold text-foreground/80">
              {user?.name
                ? `Welcome, ${user.name.split(" ")[0]} — Getting Started`
                : "Virelle Studios — Getting Started"}
            </span>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-1 px-5 pb-3">
          {STEPS.map((item, index) => (
            <button
              type="button"
              key={item.id}
              onClick={() => setStep(index)}
              className="h-1 rounded-full transition-all duration-300"
              style={{
                width: index === step ? 20 : 6,
                backgroundColor:
                  index === step
                    ? current.accent
                    : index < step
                      ? `${current.accent}60`
                      : "#334155",
              }}
              aria-label={`Go to step ${index + 1}`}
            />
          ))}
          <span className="ml-auto text-[10px] font-medium text-muted-foreground">
            {step + 1} / {STEPS.length}
          </span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-2">
          <div
            className="mb-4 flex w-full items-center justify-center rounded-xl py-8"
            style={{
              background: `linear-gradient(135deg, ${current.accent}18, ${current.accent}06)`,
              border: `1px solid ${current.accent}22`,
            }}
          >
            {current.icon}
          </div>

          <div className="mb-3 space-y-1">
            <p
              className="text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: current.accent }}
            >
              {current.subtitle}
            </p>
            <h2 className="gradient-text-gold text-lg font-bold leading-tight">
              {current.title}
            </h2>
            <p className="pt-1 text-sm leading-relaxed text-muted-foreground">
              {current.description}
            </p>
          </div>

          {current.tip && (
            <div
              className="mb-3 rounded-xl p-3"
              style={{
                backgroundColor: `${current.accent}0d`,
                border: `1px solid ${current.accent}22`,
              }}
            >
              <p className="text-xs leading-relaxed text-muted-foreground">
                <span className="font-semibold" style={{ color: current.accent }}>
                  Tip:{" "}
                </span>
                {current.tip}
              </p>
            </div>
          )}

          {current.action && (
            <button
              type="button"
              onClick={() => goToAction(current.action.path)}
              className="mb-2 w-full rounded-xl py-2.5 text-sm font-semibold transition-all"
              style={{
                backgroundColor: `${current.accent}22`,
                color: current.accent,
                border: `1px solid ${current.accent}44`,
              }}
            >
              {current.action.label}
            </button>
          )}
        </div>

        <div className="shrink-0 space-y-3 border-t border-border/40 px-5 pb-5 pt-3">
          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                type="button"
                onClick={() => setStep(value => value - 1)}
                className="flex items-center gap-1 rounded-xl border border-border px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
            )}
            <button
              type="button"
              onClick={isLast ? handleFinish : () => setStep(value => value + 1)}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-white transition-all"
              style={{ backgroundColor: current.accent }}
            >
              {isLast ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Start Creating
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
          <label className="flex cursor-pointer select-none items-center justify-center gap-2">
            <input
              type="checkbox"
              checked={doNotShow}
              onChange={event => setDoNotShow(event.target.checked)}
              className="h-3.5 w-3.5 cursor-pointer rounded accent-amber-500"
            />
            <span className="text-xs text-muted-foreground">Do not show this again</span>
          </label>
        </div>
      </div>
    </div>
  );
}
