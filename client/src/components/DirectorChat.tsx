import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import {
  MessageSquare,
  Send,
  Loader2,
  Sparkles,
  User,
  X,
  Paperclip,
  Trash2,
  CheckCircle2,
  XCircle,
  FileText,
  Image as ImageIcon,
  Film,
  Music,
  Mic,
  Square,
  Pencil,
  Undo2,
  Check,
  History,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Volume2,
  VolumeX,
  Wand2,
  Keyboard,
} from "lucide-react";

interface DirectorChatProps {
  projectId: number;
}

interface ActionBadge {
  type: string;
  success: boolean;
  message: string;
}

interface EditHistoryEntry {
  id: number;
  command: string;
  beforeText: string;
  afterText: string;
  timestamp: number;
}

// ─── Preset edit commands ───
const EDIT_PRESETS = [
  { label: "Fix grammar", command: "Fix all grammar and spelling errors", icon: "abc" },
  { label: "Shorter", command: "Make it significantly shorter and more concise", icon: "min" },
  { label: "More dramatic", command: "Rewrite to be more dramatic and cinematic", icon: "dra" },
  { label: "Professional", command: "Rewrite in a more professional and polished tone", icon: "pro" },
  { label: "Simplify", command: "Simplify the language to be clearer and easier to understand", icon: "sim" },
] as const;

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return <ImageIcon className="size-4" />;
  if (mimeType.startsWith("video/")) return <Film className="size-4" />;
  if (mimeType.startsWith("audio/")) return <Music className="size-4" />;
  return <FileText className="size-4" />;
}

function ActionBadges({ actions }: { actions: ActionBadge[] }) {
  if (!actions.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {actions.map((action, i) => (
        <div
          key={i}
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
            action.success
              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
              : "bg-red-500/15 text-red-400 border border-red-500/20"
          )}
        >
          {action.success ? (
            <CheckCircle2 className="size-3" />
          ) : (
            <XCircle className="size-3" />
          )}
          {action.type.replace(/_/g, " ")}
        </div>
      ))}
    </div>
  );
}

// ─── Word-level diff ───
interface DiffSegment {
  type: "equal" | "added" | "removed";
  text: string;
}

function computeWordDiff(oldText: string, newText: string): DiffSegment[] {
  if (!oldText && !newText) return [];
  if (!oldText) return [{ type: "added", text: newText }];
  if (!newText) return [{ type: "removed", text: oldText }];

  const oldWords = oldText.split(/(\s+)/);
  const newWords = newText.split(/(\s+)/);

  const m = oldWords.length;
  const n = newWords.length;

  if (m * n > 50000) {
    if (oldText === newText) return [{ type: "equal", text: oldText }];
    return [
      { type: "removed", text: oldText },
      { type: "added", text: newText },
    ];
  }

  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldWords[i - 1] === newWords[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const segments: DiffSegment[] = [];
  let i = m, j = n;

  const rawSegments: DiffSegment[] = [];
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldWords[i - 1] === newWords[j - 1]) {
      rawSegments.unshift({ type: "equal", text: oldWords[i - 1] });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      rawSegments.unshift({ type: "added", text: newWords[j - 1] });
      j--;
    } else {
      rawSegments.unshift({ type: "removed", text: oldWords[i - 1] });
      i--;
    }
  }

  for (const seg of rawSegments) {
    const last = segments[segments.length - 1];
    if (last && last.type === seg.type) {
      last.text += seg.text;
    } else {
      segments.push({ ...seg });
    }
  }

  return segments;
}

function DiffView({ oldText, newText }: { oldText: string; newText: string }) {
  const segments = useMemo(() => computeWordDiff(oldText, newText), [oldText, newText]);

  if (!oldText && !newText) {
    return <span className="text-muted-foreground italic">Empty</span>;
  }

  return (
    <span className="text-sm leading-relaxed">
      {segments.map((seg, i) => {
        if (seg.type === "equal") {
          return <span key={i}>{seg.text}</span>;
        }
        if (seg.type === "removed") {
          return (
            <span
              key={i}
              className="bg-red-500/20 text-red-400 line-through decoration-red-400/50 rounded-sm px-0.5"
            >
              {seg.text}
            </span>
          );
        }
        return (
          <span
            key={i}
            className="bg-emerald-500/20 text-emerald-400 rounded-sm px-0.5"
          >
            {seg.text}
          </span>
        );
      })}
    </span>
  );
}

// Voice recording states
type VoiceState = "idle" | "recording" | "recording_edit" | "transcribing" | "applying_edit";

export default function DirectorChat({ projectId }: DirectorChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<Array<{
    url: string;
    name: string;
    mimeType: string;
  }>>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [localMessages, setLocalMessages] = useState<
    Array<{ role: string; content: string; actions?: ActionBadge[] }>
  >([]);

  // Voice input state
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Voice edit state
  const [editHistory, setEditHistory] = useState<EditHistoryEntry[]>([]);
  const [editIdCounter, setEditIdCounter] = useState(0);
  const [lastEditCommand, setLastEditCommand] = useState<string>("");
  const [showEditPreview, setShowEditPreview] = useState(false);
  const [previewText, setPreviewText] = useState("");
  const [preEditText, setPreEditText] = useState("");
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);

  // TTS state
  const [isSpeaking, setIsSpeaking] = useState(false);
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);  // For ElevenLabs audio playback

  // Preset state
  const [showPresets, setShowPresets] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  // Keyboard shortcut hint
  const [showShortcutHint, setShowShortcutHint] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const chatPanelRef = useRef<HTMLDivElement>(null);

  // Fetch chat history
  const { data: history, isLoading: historyLoading } =
    trpc.directorChat.history.useQuery(
      { projectId },
      { enabled: isOpen }
    );

  // Send message mutation
  const sendMutation = trpc.directorChat.send.useMutation({
    onSuccess: (data) => {
      setLocalMessages((prev) => {
        const withoutLoading = prev.filter((m) => m.content !== "__loading__");
        return [
          ...withoutLoading,
          {
            role: "assistant",
            content: data.response,
            actions: data.actions,
          },
        ];
      });
      utils.directorChat.history.invalidate({ projectId });
    },
    onError: (error) => {
      setLocalMessages((prev) =>
        prev.filter((m) => m.content !== "__loading__")
      );
      toast.error("Failed to send message: " + error.message);
    },
  });

  // Upload mutation
  const uploadMutation = trpc.directorChat.uploadAttachment.useMutation();

  // Transcribe voice mutation
  const transcribeMutation = trpc.directorChat.transcribeVoice.useMutation({
    onSuccess: (data) => {
      if (data.text && data.text.trim()) {
        if (voiceState === "transcribing" && preEditText) {
          setVoiceState("applying_edit");
          voiceEditMutation.mutate({
            currentText: preEditText,
            editCommand: data.text.trim(),
          });
          setLastEditCommand(data.text.trim());
          return;
        }

        setVoiceState("idle");
        setInput((prev) => {
          const newText = prev ? prev + " " + data.text.trim() : data.text.trim();
          return newText;
        });
        toast.success("Voice transcribed — review and send");
        setTimeout(() => textareaRef.current?.focus(), 100);
      } else {
        setVoiceState("idle");
        toast.error("No speech detected. Please try again.");
      }
    },
    onError: (error) => {
      setVoiceState("idle");
      toast.error("Transcription failed: " + error.message);
    },
  });

  // Voice edit mutation
  const voiceEditMutation = trpc.directorChat.voiceEditText.useMutation({
    onSuccess: (data) => {
      setVoiceState("idle");
      setActivePreset(null);
      if (data.applied) {
        setPreviewText(data.editedText);
        setShowEditPreview(true);
        toast.success(`Edit applied: "${data.command}"`);
      } else {
        toast.info("No changes detected from that command. Try again.");
      }
    },
    onError: (error) => {
      setVoiceState("idle");
      setActivePreset(null);
      toast.error("Edit failed: " + error.message);
    },
  });

  // Clear chat mutation
  const clearMutation = trpc.directorChat.clear.useMutation({
    onSuccess: () => {
      setLocalMessages([]);
      utils.directorChat.history.invalidate({ projectId });
      toast.success("Chat history cleared");
    },
  });

  const utils = trpc.useUtils();

  // Scroll to bottom when messages change
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [localMessages, history]);

  // Sync history to local messages when loaded
  useEffect(() => {
    if (history && localMessages.length === 0) {
      setLocalMessages(
        history.map((m) => ({
          role: m.role,
          content: m.content,
          actions: m.actionData
            ? (m.actionData as ActionBadge[])
            : undefined,
        }))
      );
    }
  }, [history]);

  // Cleanup recording and TTS on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      // Stop ElevenLabs audio on unmount
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
      }
    };
  }, []);

  // Auto-resize textarea
  const handleTextareaChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInput(e.target.value);
      const ta = e.target;
      ta.style.height = "auto";
      ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
    },
    []
  );

  // Handle file upload (supports multiple)
  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      setIsUploading(true);
      try {
        for (const file of Array.from(files)) {
          if (file.size > 10 * 1024 * 1024) {
            toast.error(`${file.name} exceeds 10MB limit`);
            continue;
          }

          const reader = new FileReader();
          const base64 = await new Promise<string>((resolve, reject) => {
            reader.onload = () => {
              const result = reader.result as string;
              resolve(result.split(",")[1]);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });

          const result = await uploadMutation.mutateAsync({
            projectId,
            fileName: file.name,
            fileData: base64,
            mimeType: file.type,
          });

          setAttachments((prev) => [
            ...prev,
            { url: result.url, name: result.fileName, mimeType: file.type },
          ]);
          toast.success(`Attached: ${file.name}`);
        }
      } catch {
        toast.error("Failed to upload file");
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [projectId, uploadMutation]
  );

  // ─── Voice Recording (shared logic) ───
  const startRecordingInternal = useCallback(async (isEditMode: boolean) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : "audio/webm";

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;

        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

        if (audioBlob.size < 1000) {
          setVoiceState("idle");
          toast.error("Recording too short. Hold the mic button longer.");
          return;
        }

        if (audioBlob.size > 16 * 1024 * 1024) {
          setVoiceState("idle");
          toast.error("Recording exceeds 16MB limit. Try a shorter recording.");
          return;
        }

        if (isEditMode) {
          setPreEditText(input);
        }

        setVoiceState("transcribing");
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(",")[1];
          const baseMime = mimeType.split(";")[0];
          transcribeMutation.mutate({
            projectId,
            audioData: base64,
            mimeType: baseMime,
          });
        };
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorder.start(250);
      setVoiceState(isEditMode ? "recording_edit" : "recording");
      setRecordingDuration(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      if (errorMessage.includes("Permission denied") || errorMessage.includes("NotAllowedError")) {
        toast.error("Microphone access denied. Please allow microphone access in your browser settings.");
      } else {
        toast.error("Could not access microphone: " + errorMessage);
      }
    }
  }, [projectId, transcribeMutation, input]);

  const startRecording = useCallback(() => startRecordingInternal(false), [startRecordingInternal]);
  const startEditRecording = useCallback(() => startRecordingInternal(true), [startRecordingInternal]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    audioChunksRef.current = [];
    setVoiceState("idle");
    setRecordingDuration(0);
    setPreEditText("");
    toast.info("Recording cancelled");
  }, []);

  // ─── Edit Preview Actions ───
  const acceptEdit = useCallback(() => {
    const newEntry: EditHistoryEntry = {
      id: editIdCounter + 1,
      command: lastEditCommand,
      beforeText: input,
      afterText: previewText,
      timestamp: Date.now(),
    };
    setEditIdCounter((prev) => prev + 1);
    setEditHistory((prev) => [...prev, newEntry]);
    setInput(previewText);
    setShowEditPreview(false);
    setPreviewText("");
    setPreEditText("");
    toast.success("Edit accepted");
    setTimeout(() => textareaRef.current?.focus(), 100);
  }, [input, previewText, lastEditCommand, editIdCounter]);

  const rejectEdit = useCallback(() => {
    setShowEditPreview(false);
    setPreviewText("");
    setPreEditText("");
    toast.info("Edit rejected — original text kept");
  }, []);

  const undoLastEdit = useCallback(() => {
    if (editHistory.length > 0) {
      const lastEntry = editHistory[editHistory.length - 1];
      setEditHistory((prev) => prev.slice(0, -1));
      setInput(lastEntry.beforeText);
      toast.success("Undo successful");
      setTimeout(() => textareaRef.current?.focus(), 100);
    } else {
      toast.info("Nothing to undo");
    }
  }, [editHistory]);

  const revertToEdit = useCallback((entryId: number) => {
    const idx = editHistory.findIndex((e) => e.id === entryId);
    if (idx >= 0) {
      const targetEntry = editHistory[idx];
      setInput(targetEntry.beforeText);
      setEditHistory((prev) => prev.slice(0, idx));
      toast.success(`Reverted to before: "${targetEntry.command}"`);
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [editHistory]);

  // ─── Archibald Titan: ElevenLabs TTS with browser fallback ───
  const speakResponseMutation = trpc.directorChat.speakResponse.useMutation();

  /** Play audio from base64 MP3 data (ElevenLabs response) */
  const playAudioBase64 = useCallback((base64: string) => {
    // Stop any existing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    const audio = new Audio(`data:audio/mpeg;base64,${base64}`);
    audio.volume = 1.0;
    audio.onplay = () => setIsSpeaking(true);
    audio.onended = () => {
      setIsSpeaking(false);
      audioRef.current = null;
    };
    audio.onerror = () => {
      setIsSpeaking(false);
      audioRef.current = null;
    };
    audioRef.current = audio;
    audio.play().catch(() => {
      setIsSpeaking(false);
      audioRef.current = null;
    });
  }, []);

  /** Browser TTS fallback with deep male voice preference */
  const speakWithBrowser = useCallback((text: string) => {
    if (!window.speechSynthesis) {
      toast.error("Text-to-speech is not supported in this browser");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 0.85;  // Lower pitch for deeper voice
    utterance.volume = 1;
    // Prefer deep male voices
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(
      (v) => v.name.includes("Daniel") || v.name.includes("Google UK English Male") ||
             v.name.includes("Alex") || v.name.includes("Google") ||
             v.name.includes("Samantha") || v.name.includes("Natural")
    );
    if (preferred) utterance.voice = preferred;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => { setIsSpeaking(false); speechSynthRef.current = null; };
    utterance.onerror = () => { setIsSpeaking(false); speechSynthRef.current = null; };
    speechSynthRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, []);

  // ─── Text-to-Speech (Read Back) ───
  const speakText = useCallback((text: string) => {
    if (!text.trim()) {
      toast.info("No text to read back");
      return;
    }
    // Stop any current speech
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);

    // Try ElevenLabs first (Archibald Titan deep male voice)
    speakResponseMutation.mutate(
      { text },
      {
        onSuccess: (data) => {
          if (data.audioBase64) {
            playAudioBase64(data.audioBase64);
          } else {
            // Fallback to browser TTS
            speakWithBrowser(text);
          }
        },
        onError: () => {
          // Fallback to browser TTS on error
          speakWithBrowser(text);
        },
      }
    );
  }, [speakResponseMutation, playAudioBase64, speakWithBrowser]);

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
    speechSynthRef.current = null;
  }, []);

  const toggleReadBack = useCallback(() => {
    if (isSpeaking) {
      stopSpeaking();
    } else {
      speakText(input);
    }
  }, [isSpeaking, stopSpeaking, speakText, input]);

  // ─── Preset Edit Commands ───
  const applyPreset = useCallback((command: string, label: string) => {
    if (!input.trim()) {
      toast.info("Type or dictate some text first, then use presets to refine it");
      return;
    }

    setActivePreset(label);
    setPreEditText(input);
    setLastEditCommand(label);
    setVoiceState("applying_edit");
    setShowPresets(false);

    voiceEditMutation.mutate({
      currentText: input,
      editCommand: command,
    });
  }, [input, voiceEditMutation]);

  // Derived state
  const isRecording = voiceState === "recording" || voiceState === "recording_edit";

  // ─── Keyboard Shortcuts ───
  useEffect(() => {
    if (!isOpen) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === "TEXTAREA" || target.tagName === "INPUT" || target.isContentEditable;

      // Escape — cancel recording or close edit preview
      if (e.key === "Escape") {
        if (isRecording) {
          e.preventDefault();
          cancelRecording();
          return;
        }
        if (showEditPreview) {
          e.preventDefault();
          rejectEdit();
          return;
        }
        if (isSpeaking) {
          e.preventDefault();
          stopSpeaking();
          return;
        }
      }

      // Don't trigger shortcuts while typing in textarea
      if (isTyping) return;

      // V — start voice recording (dictation or edit depending on context)
      if (e.key === "v" || e.key === "V") {
        if (voiceState === "idle" && !showEditPreview && !sendMutation.isPending) {
          e.preventDefault();
          if (input.trim()) {
            startEditRecording();
          } else {
            startRecording();
          }
          return;
        }
      }

      // S — stop recording
      if ((e.key === "s" || e.key === "S") && isRecording) {
        e.preventDefault();
        stopRecording();
        return;
      }

      // R — read back text
      if ((e.key === "r" || e.key === "R") && voiceState === "idle" && !showEditPreview) {
        e.preventDefault();
        toggleReadBack();
        return;
      }

      // A — accept edit preview
      if ((e.key === "a" || e.key === "A") && showEditPreview) {
        e.preventDefault();
        acceptEdit();
        return;
      }

      // Z — undo last edit
      if ((e.key === "z" || e.key === "Z") && voiceState === "idle" && !showEditPreview && editHistory.length > 0) {
        e.preventDefault();
        undoLastEdit();
        return;
      }

      // ? — toggle shortcut hints
      if (e.key === "?") {
        e.preventDefault();
        setShowShortcutHint((prev) => !prev);
        return;
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [
    isOpen, voiceState, isRecording, showEditPreview, isSpeaking, input,
    cancelRecording, rejectEdit, stopSpeaking, startRecording, startEditRecording,
    stopRecording, toggleReadBack, acceptEdit, undoLastEdit, editHistory.length,
    sendMutation.isPending,
  ]);

  // Format seconds to mm:ss
  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Format timestamp
  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  // Send message
  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed && attachments.length === 0) return;

    // Stop any TTS
    if (isSpeaking) stopSpeaking();

    const attachNames = attachments.map((a) => a.name).join(", ");
    const messageContent = trimmed
      ? attachments.length > 0
        ? `${trimmed}\n\n📎 ${attachNames}`
        : trimmed
      : `[Shared files: ${attachNames}]`;

    setLocalMessages((prev) => [
      ...prev,
      { role: "user", content: messageContent },
      { role: "assistant", content: "__loading__" },
    ]);

    const imageUrls = attachments.filter((a) => a.mimeType.startsWith("image/")).map((a) => a.url);
    sendMutation.mutate({
      projectId,
      message: trimmed || "Please review the attached files.",
      attachmentUrl: attachments[0]?.url,
      attachmentName: attachments[0]?.name,
      imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
    });

    setInput("");
    setAttachments([]);
    setEditHistory([]);
    setEditIdCounter(0);
    setShowEditPreview(false);
    setShowHistoryPanel(false);
    setShowPresets(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [input, attachments, projectId, sendMutation, isSpeaking, stopSpeaking]);

  // Handle keyboard in textarea
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  // All messages to display
  const displayMessages = localMessages.filter(
    (m) => m.role !== "system"
  );

  const suggestedPrompts = [
    "Generate me a 2 minute film about...",
    "I want a scene where...",
    "Add a fade to black transition to the last scene",
    "Review my project and suggest improvements",
  ];

  const isBusy = sendMutation.isPending || voiceState !== "idle";
  const hasInputText = input.trim().length > 0;

  return (
    <>
      {/* Floating chat button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full px-4 py-3 shadow-2xl transition-all duration-300",
          "bg-gradient-to-r from-amber-500 to-amber-600 text-black hover:from-amber-400 hover:to-amber-500",
          "hover:scale-105 active:scale-95",
          isOpen && "scale-0 opacity-0 pointer-events-none"
        )}
      >
        <Sparkles className="size-5" />
        <span className="font-semibold text-sm hidden sm:inline">Director's Assistant</span>
        <span className="font-semibold text-sm sm:hidden">Assistant</span>
      </button>

      {/* Chat panel */}
      <div
        ref={chatPanelRef}
        className={cn(
          "fixed z-50 flex flex-col bg-background border border-border shadow-2xl transition-all duration-300 ease-out",
          "inset-0 sm:inset-auto",
          "sm:bottom-6 sm:right-6 sm:w-[420px] sm:h-[600px] sm:max-h-[80vh] sm:rounded-2xl",
          isOpen
            ? "opacity-100 translate-y-0 scale-100"
            : "opacity-0 translate-y-4 scale-95 pointer-events-none"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-amber-500/10 to-amber-600/5 sm:rounded-t-2xl">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
              <Sparkles className="size-4 text-black" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Director's Assistant</h3>
              <p className="text-xs text-muted-foreground">
                AI co-director for your film
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => setShowShortcutHint((prev) => !prev)}
              title="Keyboard shortcuts (?)"
            >
              <Keyboard className="size-4 text-muted-foreground" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => clearMutation.mutate({ projectId })}
              title="Clear chat"
            >
              <Trash2 className="size-4 text-muted-foreground" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => setIsOpen(false)}
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        {/* Keyboard shortcut hint panel */}
        {showShortcutHint && (
          <div className="px-4 py-2.5 border-b bg-muted/30 text-xs space-y-1">
            <div className="flex items-center justify-between mb-1">
              <p className="font-medium text-foreground">Keyboard Shortcuts</p>
              <button
                onClick={() => setShowShortcutHint(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-muted-foreground">
              <span><kbd className="px-1 py-0.5 rounded bg-background border border-border text-[10px] font-mono">V</kbd> Start recording</span>
              <span><kbd className="px-1 py-0.5 rounded bg-background border border-border text-[10px] font-mono">S</kbd> Stop recording</span>
              <span><kbd className="px-1 py-0.5 rounded bg-background border border-border text-[10px] font-mono">Esc</kbd> Cancel / Reject</span>
              <span><kbd className="px-1 py-0.5 rounded bg-background border border-border text-[10px] font-mono">R</kbd> Read back text</span>
              <span><kbd className="px-1 py-0.5 rounded bg-background border border-border text-[10px] font-mono">A</kbd> Accept edit</span>
              <span><kbd className="px-1 py-0.5 rounded bg-background border border-border text-[10px] font-mono">Z</kbd> Undo last edit</span>
            </div>
            <p className="text-[10px] text-muted-foreground/60 mt-1">
              Shortcuts work when the text input is not focused. Press <kbd className="px-1 py-0.5 rounded bg-background border border-border text-[10px] font-mono">?</kbd> to toggle.
            </p>
          </div>
        )}

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto min-h-0" ref={scrollRef}>
          {displayMessages.length === 0 && !historyLoading ? (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center gap-4">
              <div className="size-16 rounded-full bg-gradient-to-br from-amber-500/20 to-amber-600/10 flex items-center justify-center">
                <MessageSquare className="size-8 text-amber-500/60" />
              </div>
              <div>
                <p className="font-medium text-sm mb-1">
                  Your AI co-director is ready
                </p>
                <p className="text-xs text-muted-foreground max-w-[280px]">
                  I can modify scenes, add sound effects, adjust transitions,
                  and help you build a better film. Type, speak, or use voice
                  editing to refine your commands.
                </p>
              </div>
              <div className="flex flex-col gap-2 w-full max-w-[300px]">
                {suggestedPrompts.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setInput(prompt);
                      textareaRef.current?.focus();
                    }}
                    className="text-left text-xs px-3 py-2 rounded-lg border border-border bg-card hover:bg-accent transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3 p-4">
              {historyLoading && (
                <div className="flex justify-center py-4">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              )}
              {displayMessages.map((msg, i) => {
                if (msg.content === "__loading__") {
                  return (
                    <div key={i} className="flex items-start gap-2.5">
                      <div className="size-7 shrink-0 rounded-full bg-gradient-to-br from-amber-500/20 to-amber-600/10 flex items-center justify-center">
                        <Sparkles className="size-3.5 text-amber-500" />
                      </div>
                      <div className="rounded-xl bg-muted px-3.5 py-2.5">
                        <div className="flex items-center gap-2">
                          <Loader2 className="size-3.5 animate-spin text-amber-500" />
                          <span className="text-xs text-muted-foreground">
                            Thinking...
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={i}
                    className={cn(
                      "flex gap-2.5",
                      msg.role === "user"
                        ? "justify-end items-start"
                        : "justify-start items-start"
                    )}
                  >
                    {msg.role === "assistant" && (
                      <div className="size-7 shrink-0 mt-0.5 rounded-full bg-gradient-to-br from-amber-500/20 to-amber-600/10 flex items-center justify-center">
                        <Sparkles className="size-3.5 text-amber-500" />
                      </div>
                    )}
                    <div
                      className={cn(
                        "max-w-[85%] rounded-xl px-3.5 py-2.5",
                        msg.role === "user"
                          ? "bg-amber-500 text-black"
                          : "bg-muted text-foreground"
                      )}
                    >
                      {msg.role === "assistant" ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
                          <Streamdown>{msg.content}</Streamdown>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap text-sm">
                          {msg.content}
                        </p>
                      )}
                      {msg.actions && (
                        <ActionBadges actions={msg.actions} />
                      )}
                    </div>
                    {msg.role === "user" && (
                      <div className="size-7 shrink-0 mt-0.5 rounded-full bg-secondary flex items-center justify-center">
                        <User className="size-3.5 text-secondary-foreground" />
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Voice recording overlay — dictation mode (red) */}
        {voiceState === "recording" && (
          <div className="px-4 py-3 border-t bg-red-500/5 border-red-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative flex items-center justify-center">
                  <span className="absolute size-5 rounded-full bg-red-500/30 animate-ping" />
                  <span className="relative size-3 rounded-full bg-red-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-red-400">Dictating...</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDuration(recordingDuration)}
                    <span className="ml-2 opacity-60">Press S to stop, Esc to cancel</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={cancelRecording}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="bg-red-500 hover:bg-red-400 text-white gap-1.5"
                  onClick={stopRecording}
                >
                  <Square className="size-3 fill-current" />
                  Stop
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Voice recording overlay — edit mode (violet) */}
        {voiceState === "recording_edit" && (
          <div className="px-4 py-3 border-t bg-violet-500/5 border-violet-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative flex items-center justify-center">
                  <span className="absolute size-5 rounded-full bg-violet-500/30 animate-ping" />
                  <span className="relative size-3 rounded-full bg-violet-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-violet-400">Voice editing...</p>
                  <p className="text-xs text-muted-foreground">
                    Chain: "replace X with Y and add Z"
                    <span className="ml-2 opacity-60">S to stop, Esc to cancel</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={cancelRecording}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="bg-violet-500 hover:bg-violet-400 text-white gap-1.5"
                  onClick={stopRecording}
                >
                  <Square className="size-3 fill-current" />
                  Apply
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Transcribing overlay */}
        {voiceState === "transcribing" && (
          <div className="px-4 py-3 border-t bg-amber-500/5 border-amber-500/20">
            <div className="flex items-center gap-3">
              <Loader2 className="size-4 animate-spin text-amber-500" />
              <div>
                <p className="text-sm font-medium text-amber-400">Transcribing your voice...</p>
                <p className="text-xs text-muted-foreground">This may take a few seconds</p>
              </div>
            </div>
          </div>
        )}

        {/* Applying edit overlay */}
        {voiceState === "applying_edit" && (
          <div className="px-4 py-3 border-t bg-violet-500/5 border-violet-500/20">
            <div className="flex items-center gap-3">
              <Loader2 className="size-4 animate-spin text-violet-500" />
              <div>
                <p className="text-sm font-medium text-violet-400">
                  {activePreset ? `Applying preset: ${activePreset}` : "Applying your edit..."}
                </p>
                <p className="text-xs text-muted-foreground">"{lastEditCommand}"</p>
              </div>
            </div>
          </div>
        )}

        {/* Edit preview with diff view */}
        {showEditPreview && (
          <div className="px-4 py-3 border-t bg-violet-500/5 border-violet-500/20">
            <div className="mb-2">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-violet-400">
                  <Pencil className="size-3 inline mr-1" />
                  Voice edit preview
                </p>
                <span className="text-[10px] text-muted-foreground">
                  "{lastEditCommand}"
                </span>
              </div>
              <div className="bg-background/60 rounded-lg p-2.5 border border-violet-500/10 max-h-[100px] overflow-y-auto">
                {!preEditText && !previewText ? (
                  <span className="text-muted-foreground italic text-sm">Empty (text cleared)</span>
                ) : (
                  <DiffView oldText={preEditText} newText={previewText} />
                )}
              </div>
              <div className="flex items-center gap-3 mt-1">
                <div className="flex items-center gap-1 text-[10px] text-red-400">
                  <span className="inline-block w-2 h-2 rounded-sm bg-red-500/20 border border-red-500/30" />
                  Removed
                </div>
                <div className="flex items-center gap-1 text-[10px] text-emerald-400">
                  <span className="inline-block w-2 h-2 rounded-sm bg-emerald-500/20 border border-emerald-500/30" />
                  Added
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-muted-foreground">
                <kbd className="px-1 py-0.5 rounded bg-background border border-border text-[10px] font-mono">A</kbd> accept
                {" · "}
                <kbd className="px-1 py-0.5 rounded bg-background border border-border text-[10px] font-mono">Esc</kbd> reject
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground hover:text-foreground gap-1"
                  onClick={rejectEdit}
                >
                  <XCircle className="size-3" />
                  Reject
                </Button>
                <Button
                  size="sm"
                  className="bg-violet-500 hover:bg-violet-400 text-white gap-1"
                  onClick={acceptEdit}
                >
                  <Check className="size-3" />
                  Accept
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Edit history panel */}
        {editHistory.length > 0 && voiceState === "idle" && !showEditPreview && (
          <div className="border-t border-violet-500/10">
            <button
              onClick={() => setShowHistoryPanel((prev) => !prev)}
              className="w-full px-4 py-2 flex items-center justify-between text-xs hover:bg-violet-500/5 transition-colors"
            >
              <div className="flex items-center gap-1.5 text-violet-400">
                <History className="size-3" />
                <span className="font-medium">Edit history ({editHistory.length})</span>
              </div>
              {showHistoryPanel ? (
                <ChevronDown className="size-3 text-muted-foreground" />
              ) : (
                <ChevronUp className="size-3 text-muted-foreground" />
              )}
            </button>
            {showHistoryPanel && (
              <div className="max-h-[150px] overflow-y-auto px-4 pb-2 space-y-1.5">
                {[...editHistory].reverse().map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between gap-2 rounded-lg bg-background/40 border border-border/50 px-2.5 py-1.5"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">
                        "{entry.command}"
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatTime(entry.timestamp)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6 shrink-0 text-muted-foreground hover:text-violet-400"
                      onClick={() => revertToEdit(entry.id)}
                      title={`Revert to before "${entry.command}"`}
                    >
                      <RotateCcw className="size-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Quick edit presets — shown when text exists and idle */}
        {hasInputText && voiceState === "idle" && !showEditPreview && (
          <div className="border-t border-amber-500/10">
            <button
              onClick={() => setShowPresets((prev) => !prev)}
              className="w-full px-4 py-2 flex items-center justify-between text-xs hover:bg-amber-500/5 transition-colors"
            >
              <div className="flex items-center gap-1.5 text-amber-400">
                <Wand2 className="size-3" />
                <span className="font-medium">Quick edits</span>
              </div>
              {showPresets ? (
                <ChevronDown className="size-3 text-muted-foreground" />
              ) : (
                <ChevronUp className="size-3 text-muted-foreground" />
              )}
            </button>
            {showPresets && (
              <div className="px-4 pb-2.5 flex flex-wrap gap-1.5">
                {EDIT_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => applyPreset(preset.command, preset.label)}
                    disabled={voiceState !== "idle" || sendMutation.isPending}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-all",
                      "border border-amber-500/20 bg-amber-500/5 text-amber-400",
                      "hover:bg-amber-500/15 hover:border-amber-500/30",
                      "active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    <Wand2 className="size-3" />
                    {preset.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Attachment preview */}
        {attachments.length > 0 && (
          <div className="px-4 py-2 border-t bg-muted/30 space-y-1.5">
            {attachments.map((att, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                {att.mimeType.startsWith("image/") ? (
                  <img src={att.url} alt={att.name} className="size-8 rounded object-cover" />
                ) : (
                  getFileIcon(att.mimeType)
                )}
                <span className="truncate flex-1">{att.name}</span>
                <button
                  onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input area */}
        <div className="border-t bg-background/80 backdrop-blur-sm p-3 sm:rounded-b-2xl">
          <div className="flex items-end gap-2">
            {/* Upload button */}
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.csv,.json"
              multiple
              onChange={handleFileSelect}
            />
            <Button
              variant="ghost"
              size="icon"
              className="size-9 shrink-0"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || isBusy}
              title="Attach files (photos, videos, documents)"
            >
              {isUploading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Paperclip className="size-4 text-muted-foreground" />
              )}
            </Button>

            {/* Voice edit button — shown when there's text to edit */}
            {hasInputText && voiceState === "idle" ? (
              <Button
                variant="ghost"
                size="icon"
                className="size-9 shrink-0 text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 transition-all"
                onClick={startEditRecording}
                disabled={sendMutation.isPending || showEditPreview}
                title="Voice edit — speak commands to edit your text (V)"
              >
                <Pencil className="size-4" />
              </Button>
            ) : null}

            {/* Mic button */}
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "size-9 shrink-0 transition-all",
                isRecording && voiceState === "recording" && "text-red-500 bg-red-500/10 hover:bg-red-500/20",
                isRecording && voiceState === "recording_edit" && "text-violet-500 bg-violet-500/10 hover:bg-violet-500/20",
                voiceState === "transcribing" && "text-amber-500 bg-amber-500/10",
                voiceState === "applying_edit" && "text-violet-500 bg-violet-500/10",
              )}
              onClick={
                voiceState === "idle" ? startRecording
                : isRecording ? stopRecording
                : undefined
              }
              disabled={voiceState === "transcribing" || voiceState === "applying_edit" || sendMutation.isPending || showEditPreview}
              title={
                voiceState === "idle"
                  ? "Dictate — speak your command (V)"
                  : isRecording
                  ? "Stop recording (S)"
                  : "Processing..."
              }
            >
              {voiceState === "transcribing" || voiceState === "applying_edit" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : isRecording ? (
                <Square className={cn("size-3.5 fill-current", voiceState === "recording_edit" ? "text-violet-500" : "text-red-500")} />
              ) : (
                <Mic className="size-4 text-muted-foreground" />
              )}
            </Button>

            {/* Read back button — shown when there's text */}
            {hasInputText && voiceState === "idle" && !showEditPreview && (
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "size-9 shrink-0 transition-all",
                  isSpeaking
                    ? "text-amber-500 bg-amber-500/10 hover:bg-amber-500/20"
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={toggleReadBack}
                disabled={sendMutation.isPending}
                title={isSpeaking ? "Stop reading (Esc)" : "Read back text (R)"}
              >
                {isSpeaking ? (
                  <VolumeX className="size-4" />
                ) : (
                  <Volume2 className="size-4" />
                )}
              </Button>
            )}

            {/* Undo button — shown when edit history exists */}
            {editHistory.length > 0 && voiceState === "idle" && !showEditPreview && (
              <Button
                variant="ghost"
                size="icon"
                className="size-9 shrink-0 text-muted-foreground hover:text-foreground"
                onClick={undoLastEdit}
                disabled={sendMutation.isPending}
                title="Undo last voice edit (Z)"
              >
                <Undo2 className="size-4" />
              </Button>
            )}

            {/* Text input */}
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder={
                voiceState === "transcribing"
                  ? "Transcribing your voice..."
                  : voiceState === "applying_edit"
                  ? "Applying your edit..."
                  : showEditPreview
                  ? "Review the edit above..."
                  : hasInputText
                  ? "Edit text or press V to voice-edit..."
                  : "Type, press V to speak, or tap the mic..."
              }
              className={cn(
                "flex-1 min-h-[42px] max-h-[160px] resize-none text-sm rounded-xl py-2.5 px-3",
                showEditPreview
                  ? "border-violet-500/30 focus-visible:ring-violet-500/30"
                  : "border-border/50 focus-visible:ring-amber-500/30"
              )}
              rows={1}
              disabled={sendMutation.isPending || voiceState === "transcribing" || voiceState === "applying_edit" || showEditPreview}
            />

            {/* Send button */}
            <Button
              size="icon"
              className="size-9 shrink-0 bg-amber-500 hover:bg-amber-400 text-black"
              onClick={handleSend}
              disabled={
                (!input.trim() && attachments.length === 0) || sendMutation.isPending || voiceState !== "idle" || showEditPreview
              }
            >
              {sendMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
            {hasInputText && voiceState === "idle"
              ? "V to voice-edit · R to read back · Quick edits above"
              : "Type, press V to speak, or upload — actions execute in real-time"}
          </p>
        </div>
      </div>
    </>
  );
}
