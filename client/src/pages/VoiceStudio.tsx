import { useCallback, useEffect, useRef, useState } from "react";
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
  Play,
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
  "Use a quiet room — no echo, AC hum, or background noise",
  "Keep your mouth 6–8 inches from the microphone",
  "Speak at your character's natural pace and tone — not slow or exaggerated",
  "Record at least 30 seconds; 1–2 minutes gives better cloning results",
  "Read dialogue naturally — avoid loud pops on P/B sounds",
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

function CharacterVoiceCard({ char, elevenlabsAvailable }: { char: CharEntry; elevenlabsAvailable: boolean }) {
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

  const uploadMutation = trpc.auth.uploadVoiceSample.useMutation({
    onSuccess: () => {
      setRecordingState("done");
      toast.success(`Voice sample saved for ${char.name}`);
      utils.character.listByProject.invalidate();
    },
    onError: (err) => {
      setRecordingState("recorded");
      toast.error(err.message ?? "Upload failed");
    },
  });

  const cloneMutation = trpc.auth.cloneVoice.useMutation({
    onSuccess: () => {
      toast.success(`ElevenLabs voice cloned for ${char.name}!`);
      utils.character.listByProject.invalidate();
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
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
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
      toast.error("Microphone access denied — please allow mic permissions and try again");
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
        description: `${char.name} — Virelle Studios character voice`,
      });
    };
  }, [audioBlob, char.id, char.name, cloneMutation]);

  const hasVoice = Boolean(char.voiceId);
  const hasSample = Boolean(char.voiceSampleUrl);

  return (
    <Card className="bg-black/60 border-amber-500/20 rounded-xl overflow-hidden">
      <CardHeader className="pb-2 pt-4 px-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500/30 to-amber-600/10 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
              <Mic2 className="h-4 w-4 text-amber-400" />
            </div>
            <div>
              <CardTitle className="text-base text-white font-semibold">{char.name}</CardTitle>
              {char.voiceType && <p className="text-xs text-zinc-500 mt-0.5">{char.voiceType}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasVoice && (
              <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/25 text-xs gap-1">
                <CheckCircle2 className="h-3 w-3" /> ElevenLabs
              </Badge>
            )}
            {hasSample && !hasVoice && (
              <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/25 text-xs gap-1">
                <Headphones className="h-3 w-3" /> Sample saved
              </Badge>
            )}
            {!hasVoice && !hasSample && (
              <Badge className="bg-zinc-800 text-zinc-500 border-zinc-700 text-xs gap-1">
                <Circle className="h-3 w-3" /> No voice yet
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-5 pb-5 space-y-4">
        <div className="flex items-center gap-2">
          <Globe className="h-3.5 w-3.5 text-amber-400/60 flex-shrink-0" />
          <span className="text-xs text-zinc-400">Performance language:</span>
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="h-7 text-xs border-amber-500/20 bg-black/40 text-white w-44 flex-shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-amber-500/20">
              {LANGUAGES.map((l) => (
                <SelectItem key={l.code} value={l.code} className="text-xs text-zinc-200 focus:bg-amber-500/10">
                  {l.native} — {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-1 p-0.5 bg-zinc-900/60 rounded-lg border border-zinc-800 w-fit">
          {(["record", "upload"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => { setCloneMode(mode); setRecordingState("idle"); setAudioBlob(null); setAudioUrl(null); }}
              className={`px-3 py-1.5 text-xs rounded-md transition-all ${
                cloneMode === mode
                  ? "bg-amber-500/20 text-amber-400 font-medium"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {mode === "record" ? "Record" : "Upload file"}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowInstructions((v) => !v)}
          className="flex items-center gap-1.5 text-xs text-amber-400/70 hover:text-amber-400 transition-colors"
        >
          <Info className="h-3.5 w-3.5" />
          What makes a good voice sample?
          {showInstructions ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>

        {showInstructions && (
          <ul className="space-y-1 pl-2 border-l-2 border-amber-500/20">
            {RECORDING_INSTRUCTIONS.map((tip, i) => (
              <li key={i} className="text-xs text-zinc-400 flex gap-2">
                <span className="text-amber-500/60 font-mono">{i + 1}.</span>
                {tip}
              </li>
            ))}
          </ul>
        )}

        {cloneMode === "record" && (
          <div className="space-y-2">
            {recordingState === "idle" && (
              <Button
                onClick={startRecording}
                size="sm"
                className="h-8 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 gap-1.5"
              >
                <Mic className="h-3.5 w-3.5" /> Start recording
              </Button>
            )}
            {recordingState === "recording" && (
              <Button
                onClick={stopRecording}
                size="sm"
                className="h-8 bg-red-600 hover:bg-red-700 text-white gap-1.5 animate-pulse"
              >
                <Square className="h-3.5 w-3.5 fill-current" /> Stop recording
              </Button>
            )}
          </div>
        )}

        {cloneMode === "upload" && recordingState === "idle" && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              size="sm"
              variant="outline"
              className="h-8 border-amber-500/30 text-amber-400/80 hover:text-amber-400 hover:bg-amber-500/10 gap-1.5"
            >
              <Upload className="h-3.5 w-3.5" /> Choose audio file
            </Button>
            <p className="text-xs text-zinc-500">Accepted: MP3, WAV, M4A, WebM — max 25 MB</p>
          </>
        )}

        {(recordingState === "recorded" || recordingState === "uploading" || recordingState === "done") && audioUrl && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Play className="h-3.5 w-3.5 text-amber-400/60" />
              <audio controls src={audioUrl} className="h-8 w-full opacity-80" />
            </div>

            {recordingState === "recorded" && (
              <div className="flex gap-2 flex-wrap">
                <Button
                  onClick={submitSample}
                  size="sm"
                  className="h-8 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 gap-1.5"
                >
                  <Upload className="h-3.5 w-3.5" /> Save sample
                </Button>
                {elevenlabsAvailable && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={handleClone}
                        size="sm"
                        disabled={cloneMutation.isPending}
                        className="h-8 bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 border border-violet-500/30 gap-1.5"
                      >
                        {cloneMutation.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Wand2 className="h-3.5 w-3.5" />
                        )}
                        Clone with ElevenLabs
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Creates a studio-quality AI voice clone via ElevenLabs</TooltipContent>
                  </Tooltip>
                )}
                <Button
                  onClick={() => { setRecordingState("idle"); setAudioBlob(null); setAudioUrl(null); }}
                  size="sm"
                  variant="ghost"
                  className="h-8 text-zinc-500 hover:text-zinc-300 text-xs"
                >
                  Discard
                </Button>
              </div>
            )}

            {recordingState === "uploading" && (
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-400" /> Uploading sample…
              </div>
            )}

            {recordingState === "done" && (
              <div className="flex items-center gap-2 text-xs text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" /> Sample saved — pipeline will use this voice
              </div>
            )}
          </div>
        )}

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
  const elevenlabsAvailable = Boolean((apiKeyStatus as { hasElevenLabs?: boolean } | undefined)?.hasElevenLabs);

  const chars: CharEntry[] = (characters ?? []) as CharEntry[];

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/projects/${projectId}`)}
            className="h-8 px-2 text-zinc-400 hover:text-white gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to project
          </Button>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/30 to-amber-600/10 border border-amber-500/30 flex items-center justify-center">
              <Mic2 className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Voice Studio</h1>
              <p className="text-sm text-zinc-400">Cast voices for every character — record, upload, or clone with ElevenLabs</p>
            </div>
          </div>
        </div>

        {!elevenlabsAvailable && (
          <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 px-4 py-3 flex gap-3">
            <Info className="h-4 w-4 text-amber-400/80 mt-0.5 flex-shrink-0" />
            <div className="space-y-0.5">
              <p className="text-sm text-amber-300/90 font-medium">ElevenLabs not configured</p>
              <p className="text-xs text-zinc-400">
                Add your ElevenLabs API key in Settings → API Keys to unlock voice cloning.
                You can still save raw samples for the pipeline.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-widest">
              Cast ({chars.length})
            </h2>
            <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 text-xs">
              {chars.filter((c) => c.voiceId).length} voiced · {chars.filter((c) => !c.voiceId && c.voiceSampleUrl).length} sampled
            </Badge>
          </div>

          {isLoading && (
            <div className="flex items-center justify-center py-16 text-zinc-500 gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Loading cast…</span>
            </div>
          )}

          {!isLoading && chars.length === 0 && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 px-6 py-12 text-center space-y-2">
              <Mic2 className="h-8 w-8 text-zinc-600 mx-auto" />
              <p className="text-sm text-zinc-400">No characters in this project yet.</p>
              <p className="text-xs text-zinc-600">Add characters in the Cast tab first, then return here to assign voices.</p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
            {chars.map((c) => (
              <CharacterVoiceCard
                key={c.id}
                char={c}
                elevenlabsAvailable={elevenlabsAvailable}
              />
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-zinc-900/40 border border-zinc-800 px-5 py-4 space-y-2">
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
            <Info className="h-3.5 w-3.5 text-amber-400/60" />
            How voices connect to generation
          </h3>
          <ul className="space-y-1.5 text-xs text-zinc-500">
            <li>• <span className="text-zinc-300">ElevenLabs cloned voice</span> — used directly in the AI voice pipeline (highest quality, character-consistent)</li>
            <li>• <span className="text-zinc-300">Raw sample uploaded</span> — stored for reference; pipeline uses ElevenLabs Multilingual v2 with the saved voiceId</li>
            <li>• <span className="text-zinc-300">Language setting</span> — tells ElevenLabs which language model optimisation to apply, including Hebrew, Arabic, and 11 others</li>
            <li>• <span className="text-zinc-300">No voice set</span> — pipeline defaults to a matching voice type from the ElevenLabs library</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
