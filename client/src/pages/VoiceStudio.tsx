import { useCallback, useRef, useState } from "react";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Globe,
  Headphones,
  Info,
  Loader2,
  Mic,
  Mic2,
  Square,
  Upload,
  Wand2,
} from "lucide-react";

const LANGUAGES = [
  { code: "en", label: "English", native: "English" },
  { code: "he", label: "Hebrew", native: "עברית" },
  { code: "ar", label: "Arabic", native: "العربية" },
  { code: "es", label: "Spanish", native: "Español" },
  { code: "fr", label: "French", native: "Français" },
  { code: "de", label: "German", native: "Deutsch" },
  { code: "it", label: "Italian", native: "Italiano" },
  { code: "pt", label: "Portuguese", native: "Português" },
  { code: "ru", label: "Russian", native: "Русский" },
  { code: "ja", label: "Japanese", native: "日本語" },
  { code: "ko", label: "Korean", native: "한국어" },
  { code: "zh", label: "Mandarin", native: "中文" },
  { code: "hi", label: "Hindi", native: "हिन्दी" },
];

const RECORDING_INSTRUCTIONS = [
  "Quiet room — no echo, AC hum, or background noise",
  "Mouth 15–20 cm from the microphone",
  "Speak at your character's natural pace and tone — not slow or exaggerated",
  "At least 30 seconds; 1–2 minutes gives better cloning results",
  "Read dialogue naturally — avoid hard pops on P/B sounds",
  "Avoid clearing your throat or rustling during the sample",
];

type CharEntry = {
  id: number;
  name: string;
  voiceId?: string | null;
  voiceType?: string | null;
  voiceSampleUrl?: string | null;
  voiceLanguage?: string | null;
};

type RecordingState = "idle" | "recording" | "recorded" | "uploading" | "done";

function CharacterVoiceCard({
  char,
  projectId,
  elevenlabsAvailable,
}: {
  char: CharEntry;
  projectId: number;
  elevenlabsAvailable: boolean;
}) {
  const [language, setLanguage] = useState(char.voiceLanguage ?? "en");
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [cloneMode, setCloneMode] = useState<"upload" | "record">("record");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();

  const invalidateChars = useCallback(() => {
    utils.character.listByProject.invalidate({ projectId });
  }, [utils, projectId]);

  const uploadMutation = trpc.auth.uploadVoiceSample.useMutation({
    onSuccess: () => {
      setRecordingState("done");
      toast.success(`Voice sample saved for ${char.name}`);
      invalidateChars();
    },
    onError: (err) => {
      setRecordingState("recorded");
      toast.error(err.message ?? "Upload failed");
    },
  });

  const cloneMutation = trpc.auth.cloneVoice.useMutation({
    onSuccess: () => {
      toast.success(`ElevenLabs voice cloned for ${char.name}!`);
      invalidateChars();
    },
    onError: (err) => {
      toast.error(err.message ?? "Clone failed — check your ElevenLabs key");
    },
  });

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        setRecordingState("recorded");
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecordingState("recording");
    } catch {
      toast.error("Microphone access denied — allow mic permissions and try again");
    }
  }, []);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAudioBlob(file);
    setAudioUrl(URL.createObjectURL(file));
    setRecordingState("recorded");
  };

  const submitSample = useCallback(async () => {
    if (!audioBlob) return;
    setRecordingState("uploading");
    const arrayBuffer = await audioBlob.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);
    let binary = "";
    for (let i = 0; i < uint8.length; i++) binary += String.fromCharCode(uint8[i]);
    const base64 = btoa(binary);
    const isWebm = audioBlob.type.includes("webm");
    uploadMutation.mutate({
      characterId: char.id,
      audioBase64: base64,
      contentType: audioBlob.type || (isWebm ? "audio/webm" : "audio/mpeg"),
      filename: isWebm ? "sample.webm" : "sample.mp3",
      language,
    });
  }, [audioBlob, char.id, language, uploadMutation]);

  const handleClone = useCallback(() => {
    if (!audioBlob) return;
    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(",")[1];
      cloneMutation.mutate({
        characterId: char.id,
        name: char.name,
        audioBase64: base64,
        description: `${char.name} — Virelle Studios voice`,
      });
    };
  }, [audioBlob, char.id, char.name, cloneMutation]);

  const discard = () => {
    setRecordingState("idle");
    setAudioBlob(null);
    setAudioUrl(null);
  };

  const hasVoice = Boolean(char.voiceId);
  const hasSample = Boolean(char.voiceSampleUrl);

  return (
    <Card className="bg-black/60 border-amber-500/20 rounded-xl overflow-hidden">
      <CardHeader className="pb-2 pt-4 px-4 sm:px-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500/30 to-amber-600/10 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
              <Mic2 className="h-4 w-4 text-amber-400" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base text-white font-semibold truncate">{char.name}</CardTitle>
              {char.voiceType && (
                <p className="text-xs text-zinc-500 mt-0.5 truncate">{char.voiceType}</p>
              )}
            </div>
          </div>
          <div className="flex-shrink-0">
            {hasVoice ? (
              <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/25 text-xs gap-1 whitespace-nowrap">
                <CheckCircle2 className="h-3 w-3" /> Cloned
              </Badge>
            ) : hasSample ? (
              <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/25 text-xs gap-1 whitespace-nowrap">
                <Headphones className="h-3 w-3" /> Sampled
              </Badge>
            ) : (
              <Badge className="bg-zinc-800 text-zinc-500 border-zinc-700 text-xs gap-1 whitespace-nowrap">
                <Circle className="h-3 w-3" /> No voice
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-4 sm:px-5 pb-5 space-y-4">
        {/* Language */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-xs text-zinc-400">
            <Globe className="h-3.5 w-3.5 text-amber-400/60" />
            Performance language
          </label>
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="h-10 text-sm border-amber-500/20 bg-black/40 text-white w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-amber-500/20">
              {LANGUAGES.map((l) => (
                <SelectItem key={l.code} value={l.code} className="text-sm text-zinc-200 focus:bg-amber-500/10">
                  {l.native} — {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Mode toggle */}
        <div className="grid grid-cols-2 gap-1 p-0.5 bg-zinc-900/60 rounded-lg border border-zinc-800">
          {(["record", "upload"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => {
                setCloneMode(mode);
                setRecordingState("idle");
                setAudioBlob(null);
                setAudioUrl(null);
              }}
              className={`py-2 text-sm rounded-md transition-all font-medium ${
                cloneMode === mode
                  ? "bg-amber-500/20 text-amber-400"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {mode === "record" ? "🎙 Record" : "📁 Upload file"}
            </button>
          ))}
        </div>

        {/* Instructions toggle */}
        <button
          onClick={() => setShowInstructions((v) => !v)}
          className="flex items-center gap-2 text-xs text-amber-400/70 hover:text-amber-400 transition-colors w-full text-left py-1"
        >
          <Info className="h-3.5 w-3.5 flex-shrink-0" />
          <span>What makes a good voice sample?</span>
          {showInstructions ? (
            <ChevronUp className="h-3 w-3 ml-auto flex-shrink-0" />
          ) : (
            <ChevronDown className="h-3 w-3 ml-auto flex-shrink-0" />
          )}
        </button>

        {showInstructions && (
          <ul className="space-y-1.5 pl-2 border-l-2 border-amber-500/20">
            {RECORDING_INSTRUCTIONS.map((tip, i) => (
              <li key={i} className="text-xs text-zinc-400 flex gap-2">
                <span className="text-amber-500/60 font-mono flex-shrink-0">{i + 1}.</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        )}

        {/* Record controls */}
        {cloneMode === "record" && (
          <div className="space-y-2">
            {recordingState === "idle" && (
              <Button
                onClick={startRecording}
                className="w-full h-12 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 gap-2 text-sm font-medium"
              >
                <Mic className="h-4 w-4" /> Start recording
              </Button>
            )}
            {recordingState === "recording" && (
              <Button
                onClick={stopRecording}
                className="w-full h-12 bg-red-600 hover:bg-red-700 text-white gap-2 text-sm font-medium animate-pulse"
              >
                <Square className="h-4 w-4 fill-current" /> Stop recording
              </Button>
            )}
          </div>
        )}

        {/* Upload controls */}
        {cloneMode === "upload" && recordingState === "idle" && (
          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="w-full h-12 border-amber-500/30 text-amber-400/80 hover:text-amber-400 hover:bg-amber-500/10 gap-2 text-sm"
            >
              <Upload className="h-4 w-4" /> Choose audio file
            </Button>
            <p className="text-xs text-zinc-600 text-center">MP3, WAV, M4A, WebM — max 25 MB</p>
          </div>
        )}

        {/* Recorded / uploading / done state */}
        {(recordingState === "recorded" ||
          recordingState === "uploading" ||
          recordingState === "done") &&
          audioUrl && (
            <div className="space-y-3">
              <audio controls src={audioUrl} className="w-full h-10 rounded" />

              {recordingState === "recorded" && (
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    onClick={submitSample}
                    disabled={uploadMutation.isPending}
                    className="flex-1 h-11 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 gap-2 text-sm"
                  >
                    <Upload className="h-4 w-4" /> Save sample
                  </Button>
                  {elevenlabsAvailable && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={handleClone}
                          disabled={cloneMutation.isPending}
                          className="flex-1 h-11 bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 border border-violet-500/30 gap-2 text-sm"
                        >
                          {cloneMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Wand2 className="h-4 w-4" />
                          )}
                          Clone voice
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Creates an AI voice clone via ElevenLabs</TooltipContent>
                    </Tooltip>
                  )}
                  <Button
                    onClick={discard}
                    variant="ghost"
                    className="h-11 px-3 text-zinc-500 hover:text-zinc-300 text-sm sm:w-auto w-full"
                  >
                    Discard
                  </Button>
                </div>
              )}

              {recordingState === "uploading" && (
                <div className="flex items-center justify-center gap-2 text-sm text-zinc-400 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
                  Uploading sample…
                </div>
              )}

              {recordingState === "done" && (
                <div className="flex items-center gap-2 text-sm text-emerald-400 py-1">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                  Sample saved — pipeline will use this voice
                </div>
              )}
            </div>
          )}

        {/* ElevenLabs voice ID badge */}
        {char.voiceId && (
          <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/15 px-3 py-2">
            <p className="text-xs text-emerald-400/80 font-mono truncate">
              ElevenLabs ID: {char.voiceId}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function VoiceStudio() {
  const { projectId } = useParams<{ projectId: string }>();
  const [, navigate] = useLocation();
  const pid = parseInt(projectId ?? "0");

  const { data: characters, isLoading } = trpc.character.listByProject.useQuery(
    { projectId: pid },
    { enabled: pid > 0 }
  );

  const { data: apiKeyStatus } = trpc.auth.getApiKeyStatus.useQuery();
  const elevenlabsAvailable = Boolean(apiKeyStatus?.hasElevenLabs);

  const chars = (characters ?? []) as CharEntry[];

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Sticky header */}
      <div
        className="sticky top-0 z-10 border-b border-zinc-800/60 bg-zinc-950/95 backdrop-blur-sm"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))", paddingBottom: "0.75rem" }}
      >
        <div className="max-w-4xl mx-auto px-4 flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/projects/${projectId}`)}
            className="h-9 w-9 p-0 text-zinc-400 hover:text-white flex-shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500/30 to-amber-600/10 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
              <Mic2 className="h-3.5 w-3.5 text-amber-400" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-white truncate">Voice Studio</h1>
              <p className="text-xs text-zinc-500 hidden sm:block truncate">
                Record, upload or ElevenLabs-clone voices for your cast
              </p>
            </div>
          </div>
          <div className="ml-auto flex-shrink-0">
            <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 text-xs">
              {chars.filter((c) => c.voiceId).length}/{chars.length} voiced
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* ElevenLabs warning */}
        {!elevenlabsAvailable && (
          <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 px-4 py-3 flex gap-3">
            <Info className="h-4 w-4 text-amber-400/80 mt-0.5 flex-shrink-0" />
            <div className="space-y-0.5 min-w-0">
              <p className="text-sm text-amber-300/90 font-medium">ElevenLabs not configured</p>
              <p className="text-xs text-zinc-400">
                Add your ElevenLabs API key in{" "}
                <button
                  onClick={() => navigate("/settings")}
                  className="text-amber-400 underline underline-offset-2"
                >
                  Settings → API Keys
                </button>{" "}
                to unlock voice cloning. You can still save raw samples.
              </p>
            </div>
          </div>
        )}

        {/* Cast list */}
        {isLoading && (
          <div className="flex items-center justify-center py-16 text-zinc-500 gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading cast…</span>
          </div>
        )}

        {!isLoading && chars.length === 0 && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 px-6 py-12 text-center space-y-3">
            <Mic2 className="h-10 w-10 text-zinc-600 mx-auto" />
            <div>
              <p className="text-sm font-medium text-zinc-300">No characters yet</p>
              <p className="text-xs text-zinc-500 mt-1">
                Add characters in the Cast tab, then return here to assign voices.
              </p>
            </div>
            <Button
              onClick={() => navigate(`/projects/${projectId}`)}
              variant="outline"
              size="sm"
              className="border-amber-500/30 text-amber-400/80 hover:text-amber-400 hover:bg-amber-500/10"
            >
              Go to Cast
            </Button>
          </div>
        )}

        {chars.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {chars.map((c) => (
              <CharacterVoiceCard
                key={c.id}
                char={c}
                projectId={pid}
                elevenlabsAvailable={elevenlabsAvailable}
              />
            ))}
          </div>
        )}

        {/* Pipeline info */}
        {chars.length > 0 && (
          <div className="rounded-xl bg-zinc-900/40 border border-zinc-800 px-4 sm:px-5 py-4 space-y-3">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
              <Info className="h-3.5 w-3.5 text-amber-400/60" />
              How voices connect to film generation
            </h3>
            <ul className="space-y-2 text-xs text-zinc-500">
              <li className="flex gap-2">
                <span className="text-emerald-400 flex-shrink-0">●</span>
                <span>
                  <span className="text-zinc-300">ElevenLabs cloned</span> — used directly in the AI
                  voice pipeline (highest quality, character-consistent across scenes)
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-blue-400 flex-shrink-0">●</span>
                <span>
                  <span className="text-zinc-300">Raw sample saved</span> — pipeline uses ElevenLabs
                  Multilingual v2 with the saved voiceId; sample stored for reference
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-zinc-500 flex-shrink-0">●</span>
                <span>
                  <span className="text-zinc-300">No voice set</span> — pipeline picks a matching
                  voice type from the ElevenLabs library automatically
                </span>
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
