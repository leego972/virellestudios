import { useState, useEffect } from "react";
import { Mic, X, PhoneCall } from "lucide-react";
import DirectorChat from "@/components/DirectorChat";
import { VirelleFace } from "@/components/VirelleFace";

type VoiceState = 'idle' | 'inactive' | 'listening' | 'thinking' | 'speaking';

export default function AssistantPage() {
  const [showVoiceHint, setShowVoiceHint] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [voiceTranscript, setVoiceTranscript] = useState('');

  useEffect(() => {
    const dismissed = localStorage.getItem("virelle.voiceHintDismissed");
    if (!dismissed) setShowVoiceHint(true);
  }, []);

  useEffect(() => {
    const stateHandler = (e: Event) =>
      setVoiceState((e as CustomEvent<VoiceState>).detail ?? 'idle');
    const transcriptHandler = (e: Event) =>
      setVoiceTranscript((e as CustomEvent<string>).detail ?? '');
    window.addEventListener('virelle-voice-state', stateHandler);
    window.addEventListener('virelle-voice-transcript', transcriptHandler);
    return () => {
      window.removeEventListener('virelle-voice-state', stateHandler);
      window.removeEventListener('virelle-voice-transcript', transcriptHandler);
    };
  }, []);

  const dismiss = () => {
    localStorage.setItem("virelle.voiceHintDismissed", "1");
    setShowVoiceHint(false);
  };

  const endVoiceCall = () => {
    window.dispatchEvent(new CustomEvent('virelle-close-voice-mode'));
  };

  const isVoiceActive = voiceState !== 'idle' && voiceState !== 'inactive';

  return (
    <div
      className="relative flex-1 min-h-0 overflow-hidden"
      style={{ background: "linear-gradient(135deg, #080600 0%, #0c0900 50%, #080600 100%)" }}
    >
      {/* VirelleFace mask — full-screen ambient background, eyes react to voice state */}
      <div
        className="fixed inset-0 pointer-events-none select-none"
        style={{ zIndex: 0 }}
        aria-hidden="true"
      >
        <div
          className="absolute top-[40%] left-[40%] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            width: "min(88vh, 88vw)",
            height: "min(88vh, 88vw)",
            background:
              "radial-gradient(circle, rgba(201,168,76,0.18) 0%, rgba(180,130,40,0.09) 40%, transparent 72%)",
            filter: "blur(32px)",
          }}
        />
        <div
          className="absolute top-[40%] left-[40%] -translate-x-1/2 -translate-y-1/2"
          style={{ width: "min(80vh, 80vw)", height: "min(80vh, 80vw)" }}
        >
          <VirelleFace volume={0} speaking={voiceState === 'speaking'} state={voiceState} />
        </div>
      </div>

      {/* ── Voice mode overlay: speech bubble + end-call ── */}
      {isVoiceActive && (
        <div
          className="fixed inset-x-0 bottom-28 flex flex-col items-center gap-4 px-6 pointer-events-none select-none"
          style={{ zIndex: 55 }}
        >
          {/* Speech bubble */}
          <div
            className="max-w-sm w-full rounded-2xl px-4 py-3 text-center"
            style={{
              background: "rgba(8,6,0,0.88)",
              border: "1px solid rgba(212,175,55,0.3)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
            }}
          >
            <p
              className={`text-xs font-semibold mb-1.5 ${
                voiceState === 'listening'
                  ? 'text-amber-400'
                  : voiceState === 'thinking'
                  ? 'text-blue-400'
                  : 'text-emerald-400'
              }`}
            >
              {voiceState === 'listening'
                ? 'Listening…'
                : voiceState === 'thinking'
                ? 'Thinking…'
                : 'Speaking…'}
            </p>
            {voiceTranscript && voiceTranscript !== 'Transcribing...' ? (
              <p className="text-sm text-white/80 leading-relaxed italic">
                "{voiceTranscript}"
              </p>
            ) : (
              <p className="text-sm text-white/35 leading-relaxed">
                {voiceState === 'listening'
                  ? 'Say something…'
                  : voiceState === 'speaking'
                  ? 'Virelle is speaking…'
                  : '…'}
              </p>
            )}
          </div>

          {/* End call button */}
          <button
            className="pointer-events-auto flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-red-400 transition-all active:scale-95"
            style={{
              background: "rgba(239,68,68,0.12)",
              border: "1px solid rgba(239,68,68,0.3)",
              touchAction: 'manipulation',
            }}
            onClick={endVoiceCall}
            aria-label="End voice call"
          >
            <PhoneCall className="size-4" />
            End call
          </button>
        </div>
      )}

      {/* Voice hint banner — shown once, hidden during active voice */}
      {showVoiceHint && !isVoiceActive && (
        <div
          className="mx-3 mt-2 mb-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 flex items-start gap-2"
          style={{ position: "relative", zIndex: 1 }}
        >
          <Mic className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
          <div className="flex-1 text-xs leading-relaxed">
            <span className="text-amber-300 font-semibold">Voice mode available.</span>{" "}
            <span className="text-amber-200/90">
              Tap the gold <strong>Talk</strong> button below the message box to speak.
              Virelle listens, replies out loud, and can navigate the platform on your behalf.
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

      {/* Director Chat — pageEmbed hides panel during voice, shows bottom-sheet when empty */}
      <DirectorChat defaultOpen={true} hideVoiceOverlay pageEmbed />
    </div>
  );
}
