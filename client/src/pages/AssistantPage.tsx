import { useState, useEffect } from "react";
import { Mic, X } from "lucide-react";
import DirectorChat from "@/components/DirectorChat";

export default function AssistantPage() {
  const [showVoiceHint, setShowVoiceHint] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem("virelle.voiceHintDismissed");
    if (!dismissed) setShowVoiceHint(true);
  }, []);

  const dismiss = () => {
    localStorage.setItem("virelle.voiceHintDismissed", "1");
    setShowVoiceHint(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      {showVoiceHint && (
        <div className="mx-3 mt-2 mb-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 flex items-start gap-2">
          <Mic className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
          <div className="flex-1 text-xs leading-relaxed">
            <span className="text-amber-300 font-semibold">Voice mode is on.</span>{" "}
            <span className="text-amber-200/90">
              Tap the gold <strong>Talk</strong> button below the message box to speak.
              The assistant will listen, reply out loud, and can navigate Virelle, create projects,
              generate scenes, and more on your behalf.
            </span>
          </div>
          <button
            onClick={dismiss}
            className="text-amber-300/70 hover:text-amber-200 shrink-0"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      <DirectorChat defaultOpen={true} />
    </div>
  );
}
