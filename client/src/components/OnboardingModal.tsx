import { useState, useEffect } from "react";
import { X, ChevronRight, ChevronLeft, CheckCircle2 } from "lucide-react";

const STORAGE_KEY = "virelle_onboarding_dismissed";

const STEPS = [
  {
    icon: "🎬",
    title: "Create Your Project",
    description:
      "Start by creating a new project. Give it a title, genre, and logline. Your project is the container for your entire film — script, storyboard, characters, sound, and more.",
    tip: "Tip: A strong logline (one sentence that captures your story) helps the AI generate better content throughout your project.",
    color: "#b45309",
  },
  {
    icon: "📝",
    title: "Write Your Script",
    description:
      "Use the AI Script Writer to generate a full screenplay from your premise. Choose your genre and tone, then let the AI draft your script — or write it yourself. Edit freely in the built-in editor.",
    tip: "Tip: Script generation costs 10 credits. You can regenerate as many times as you like to find the right voice.",
    color: "#0a7ea4",
  },
  {
    icon: "🎨",
    title: "Build Your Storyboard",
    description:
      "Visualise your film panel by panel. Describe each scene and camera angle, and the AI generates a storyboard description. Add as many panels as you need to map out your entire film.",
    tip: "Tip: Each panel costs 5 credits. Use the Shot List tool to plan camera angles before storyboarding.",
    color: "#7c3aed",
  },
  {
    icon: "🎭",
    title: "Develop Your Characters",
    description:
      "Add your cast with names, roles, and descriptions. The Dialogue Editor lets you write and refine character dialogue scene by scene, with AI assistance to match each character's voice.",
    tip: "Tip: The more detail you give each character, the more consistent the AI-generated dialogue will be.",
    color: "#059669",
  },
  {
    icon: "🎵",
    title: "Post-Production Sound",
    description:
      "Add professional sound to your film. Use the Film Post-Production tool to layer ADR (re-recorded dialogue), Foley (ambient sounds), and a Score (AI-generated music cues). Mix all tracks in the Mix Panel.",
    tip: "Tip: AI suggestions for ADR, Foley, and Score are available — each costs a small number of credits.",
    color: "#dc2626",
  },
  {
    icon: "🌍",
    title: "Subtitles & Funding",
    description:
      "Export your film with subtitles in 130+ languages using the Subtitles tool. When you're ready to fund your project, browse 94 international film funds in the Funding Directory and generate a professional application package.",
    tip: "Tip: The Funding Directory application is a working pack — always verify exact requirements on each fund's live portal before submitting.",
    color: "#d97706",
  },
];

interface OnboardingModalProps {
  /** Force show (e.g. from a Help menu) regardless of localStorage */
  forceShow?: boolean;
  onClose?: () => void;
}

export function OnboardingModal({ forceShow = false, onClose }: OnboardingModalProps) {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [doNotShow, setDoNotShow] = useState(false);

  useEffect(() => {
    if (forceShow) {
      setVisible(true);
      return;
    }
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) setVisible(true);
  }, [forceShow]);

  const handleClose = () => {
    if (doNotShow) {
      localStorage.setItem(STORAGE_KEY, "true");
    }
    setVisible(false);
    onClose?.();
  };

  const handleFinish = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setVisible(false);
    onClose?.();
  };

  if (!visible) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const isFirst = step === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/70 backdrop-blur-sm">
      <div
        className="relative w-full sm:max-w-lg bg-card border border-border sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col"
        style={{ maxHeight: "calc(100dvh - env(safe-area-inset-top, 0px) - 8px)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {/* Coloured top accent bar */}
        <div className="h-1 w-full" style={{ backgroundColor: current.color }} />

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <div className="flex items-center gap-2">
            <img
              src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663418605762/hxRQQgsmyjgcByim.png"
              alt="Virelle Studios"
              className="w-7 h-7 rounded-lg"
            />
            <span className="text-sm font-semibold text-foreground">Virelle Studios — Getting Started</span>
          </div>
          <button
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-1.5 px-6 pb-4">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: i === step ? 24 : 8,
                backgroundColor: i === step ? current.color : i < step ? current.color + "80" : "#334155",
              }}
            />
          ))}
        </div>

        {/* Content — scrollable so all text is reachable on small screens */}
        <div className="px-6 pb-2 overflow-y-auto flex-1" style={{ minHeight: 0 }}>
          <div className="flex flex-col items-center text-center gap-4">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl shadow-lg"
              style={{ backgroundColor: current.color + "20", border: `1px solid ${current.color}40` }}
            >
              {current.icon}
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-widest mb-1" style={{ color: current.color }}>
                Step {step + 1} of {STEPS.length}
              </p>
              <h2 className="text-xl font-bold text-foreground mb-3">{current.title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{current.description}</p>
            </div>
            <div
              className="w-full rounded-xl p-4 text-left"
              style={{ backgroundColor: current.color + "10", border: `1px solid ${current.color}25` }}
            >
              <p className="text-xs text-muted-foreground leading-relaxed">{current.tip}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pt-4 pb-6 space-y-3">
          <div className="flex items-center gap-3">
            {!isFirst && (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="flex items-center gap-1 px-4 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
            )}
            <button
              onClick={isLast ? handleFinish : () => setStep((s) => s + 1)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
              style={{ backgroundColor: current.color }}
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

          {/* Do not show again */}
          <label className="flex items-center gap-2 cursor-pointer justify-center">
            <input
              type="checkbox"
              checked={doNotShow}
              onChange={(e) => setDoNotShow(e.target.checked)}
              className="w-3.5 h-3.5 rounded accent-amber-500"
            />
            <span className="text-xs text-muted-foreground">Do not show again</span>
          </label>
        </div>
      </div>
    </div>
  );
}
