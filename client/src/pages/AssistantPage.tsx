import { useState, useEffect } from "react";
  import { Mic, X } from "lucide-react";
  import DirectorChat from "@/components/DirectorChat";
  import { VirelleFace } from "@/components/VirelleFace";

  type VoiceState = 'idle' | 'inactive' | 'listening' | 'thinking' | 'speaking';

  export default function AssistantPage() {
    const [showVoiceHint, setShowVoiceHint] = useState(false);
    const [voiceState, setVoiceState] = useState<VoiceState>('idle');

    useEffect(() => {
      const dismissed = localStorage.getItem("virelle.voiceHintDismissed");
      if (!dismissed) setShowVoiceHint(true);
    }, []);

    // Mirror DirectorChat voice state so the ambient face reacts
    useEffect(() => {
      const handler = (e: Event) => {
        setVoiceState((e as CustomEvent<VoiceState>).detail ?? 'idle');
      };
      window.addEventListener('virelle-voice-state', handler);
      return () => window.removeEventListener('virelle-voice-state', handler);
    }, []);

    const dismiss = () => {
      localStorage.setItem("virelle.voiceHintDismissed", "1");
      setShowVoiceHint(false);
    };

    return (
      <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden relative">

        {/* ── White mask face — large ambient background, eyes react to voice state ── */}
        <div
          className="fixed inset-0 pointer-events-none select-none"
          style={{ zIndex: 0 }}
          aria-hidden="true"
        >
          {/* Outer bloom behind the mask */}
          <div
            className="absolute top-[40%] left-[40%] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              width: "min(70vh, 70vw)",
              height: "min(70vh, 70vw)",
              background: "radial-gradient(circle, rgba(160,180,255,0.15) 0%, rgba(100,130,255,0.08) 40%, transparent 72%)",
              filter: "blur(32px)",
            }}
          />
          {/* Face container */}
          <div
            className="absolute top-[40%] left-[40%] -translate-x-1/2 -translate-y-1/2"
            style={{ width: "min(62vh, 62vw)", height: "min(62vh, 62vw)" }}
          >
            <VirelleFace volume={0} speaking={voiceState === 'speaking'} state={voiceState} />
          </div>
        </div>

        {/* Voice hint banner */}
        {showVoiceHint && (
          <div
            className="mx-3 mt-2 mb-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 flex items-start gap-2"
            style={{ position: "relative", zIndex: 1 }}
          >
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

        <DirectorChat defaultOpen={true} hideVoiceOverlay />
      </div>
    );
  }
  