import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { skipToken } from "@tanstack/react-query";
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
  Copy,
  RefreshCw,
  Settings,
  PhoneCall,
} from "lucide-react";

interface DirectorChatProps {
  projectId?: number;
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
interface ToolBadge {
  toolName: string;
  description: string;
  status: "pending" | "done" | "error";
  data?: any;
  error?: string;
}
interface ChatMessage {
  role: string;
  content: string;
  actions?: ActionBadge[];
  toolBadges?: ToolBadge[];
}

// ─── Preset edit commands ───
const EDIT_PRESETS = [
  { label: "Fix grammar", command: "Fix all grammar and spelling errors", icon: "abc" },
  { label: "Shorter", command: "Make it significantly shorter and more concise", icon: "min" },
  { label: "More dramatic", command: "Rewrite to be more dramatic and cinematic", icon: "dra" },
  { label: "Professional", command: "Rewrite in a more professional and polished tone", icon: "pro" },
  { label: "Simplify", command: "Simplify the language to be clearer and easier to understand", icon: "sim" },
] as const;

// ─── Slash commands ───
const SLASH_COMMANDS = [
  { cmd: "/new", desc: "Start a new conversation" },
  { cmd: "/clear", desc: "Clear chat history" },
  { cmd: "/help", desc: "Show what I can do" },
  { cmd: "/script", desc: "Help me write a script" },
  { cmd: "/scene", desc: "Create or edit a scene" },
  { cmd: "/shot", desc: "Design a shot list" },
  { cmd: "/cast", desc: "Develop characters and casting" },
  { cmd: "/budget", desc: "Estimate production budget" },
];

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
    return [{ type: "removed", text: oldText }, { type: "added", text: newText }];
  }
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = oldWords[i - 1] === newWords[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  const rawSegments: DiffSegment[] = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldWords[i - 1] === newWords[j - 1]) {
      rawSegments.unshift({ type: "equal", text: oldWords[i - 1] }); i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      rawSegments.unshift({ type: "added", text: newWords[j - 1] }); j--;
    } else {
      rawSegments.unshift({ type: "removed", text: oldWords[i - 1] }); i--;
    }
  }
  const segments: DiffSegment[] = [];
  for (const seg of rawSegments) {
    const last = segments[segments.length - 1];
    if (last && last.type === seg.type) last.text += seg.text;
    else segments.push({ ...seg });
  }
  return segments;
}

function DiffView({ oldText, newText }: { oldText: string; newText: string }) {
  const segments = useMemo(() => computeWordDiff(oldText, newText), [oldText, newText]);
  if (!oldText && !newText) return <span className="text-muted-foreground italic">Empty</span>;
  return (
    <span className="text-sm leading-relaxed">
      {segments.map((seg, i) => {
        if (seg.type === "equal") return <span key={i}>{seg.text}</span>;
        if (seg.type === "removed") return (
          <span key={i} className="bg-red-500/20 text-red-400 line-through decoration-red-400/50 rounded-sm px-0.5">{seg.text}</span>
        );
        return <span key={i} className="bg-emerald-500/20 text-emerald-400 rounded-sm px-0.5">{seg.text}</span>;
      })}
    </span>
  );
}

// ─── Animated voice waveform ───
function VoiceWaveform({ active, color = "#f59e0b" }: { active: boolean; color?: string }) {
  return (
    <div className="flex items-center gap-[3px] h-8">
      {[0.4, 0.7, 1.0, 0.7, 0.4, 0.6, 0.9, 0.6, 0.4].map((h, i) => (
        <div
          key={i}
          className="w-[3px] rounded-full transition-all duration-150"
          style={{
            backgroundColor: color,
            height: active ? `${h * 32}px` : "4px",
            animationDelay: `${i * 80}ms`,
            animation: active ? `waveform 0.8s ease-in-out ${i * 80}ms infinite alternate` : "none",
            opacity: active ? 0.9 : 0.3,
          }}
        />
      ))}
      <style>{`
        @keyframes waveform {
          from { transform: scaleY(0.3); }
          to { transform: scaleY(1); }
        }
      `}</style>
    </div>
  );
}

// Voice recording states
type VoiceState = "idle" | "recording" | "recording_edit" | "transcribing" | "applying_edit";
// Voice mode states (full-screen overlay)
type VoiceModeState = "listening" | "thinking" | "speaking" | "inactive";

export default function DirectorChat({ projectId }: DirectorChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<Array<{ url: string; name: string; mimeType: string }>>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  // Voice input state
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Full-screen voice mode (Titan-style)
  const [voiceModeActive, setVoiceModeActive] = useState(false);
  const [voiceModeState, setVoiceModeState] = useState<VoiceModeState>("inactive");
  const [voiceModeTranscript, setVoiceModeTranscript] = useState("");
  const voiceModeStreamRef = useRef<MediaStream | null>(null);
  const voiceModeRecorderRef = useRef<MediaRecorder | null>(null);
  const voiceModeChunksRef = useRef<Blob[]>([]);

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
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  // Preset state
  const [showPresets, setShowPresets] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  // Keyboard shortcut hint
  const [showShortcutHint, setShowShortcutHint] = useState(false);

  // Custom Director Instructions
  const [showInstructions, setShowInstructions] = useState(false);
  const [instructionsText, setInstructionsText] = useState("");
  const [instructionsSaved, setInstructionsSaved] = useState(false);

  // Slash commands
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashFilter, setSlashFilter] = useState("");

  // Streaming animation state
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const streamingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // SSE session for tool-calling
  const [sseSessionId] = useState(() => Math.random().toString(36).slice(2));
  const sseRef = useRef<EventSource | null>(null);
  const [isSending, setIsSending] = useState(false);

  // Scroll state
  const [userScrolledUp, setUserScrolledUp] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const chatPanelRef = useRef<HTMLDivElement>(null);

  // ─── tRPC mutations ───
  const utils = trpc.useUtils();

  const { data: history, isLoading: historyLoading } = trpc.directorChat.history.useQuery(
    projectId ? { projectId } : skipToken,
    { enabled: isOpen && !!projectId }
  );

  const { data: instructionsData } = trpc.directorChat.getInstructions.useQuery(undefined, {
    enabled: isOpen,
  });

  useEffect(() => {
    if (instructionsData?.instructions !== undefined) {
      setInstructionsText(instructionsData.instructions);
    }
  }, [instructionsData]);

  const saveInstructionsMutation = trpc.directorChat.saveInstructions.useMutation({
    onSuccess: () => {
      setInstructionsSaved(true);
      setTimeout(() => setInstructionsSaved(false), 2000);
      toast.success("Director instructions saved");
    },
  });

  // Navigation hook for AI-triggered navigation
  const [, setLocation] = useLocation();

  // ─── SSE-based send with tool-calling ───
  const sendViaSSE = useCallback(async (
    messages: Array<{ role: string; content: string }>,
    projectContext?: string
  ) => {
    if (isSending) return;
    setIsSending(true);

    // Close any existing SSE connection
    if (sseRef.current) { sseRef.current.close(); sseRef.current = null; }

    // Open SSE stream
    const es = new EventSource(`/api/director/stream/${sseSessionId}`, { withCredentials: true });
    sseRef.current = es;

    let fullText = "";
    let currentToolBadges: ToolBadge[] = [];

    const updateLastAssistantMsg = (update: Partial<ChatMessage>) => {
      setLocalMessages((prev) => {
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        if (lastIdx >= 0 && updated[lastIdx].role === "assistant") {
          updated[lastIdx] = { ...updated[lastIdx], ...update };
        }
        return updated;
      });
    };

    es.onopen = async () => {
      // Now POST the message
      try {
        await fetch(`/api/director/stream/${sseSessionId}/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            messages,
            projectContext,
            directorInstructions: instructionsText || undefined,
          }),
        });
      } catch (err) {
        es.close();
        sseRef.current = null;
        setIsSending(false);
        setLocalMessages((prev) => prev.filter((m) => m.content !== "__loading__"));
        toast.error("Failed to send message");
      }
    };

    es.addEventListener("thinking", () => {
      updateLastAssistantMsg({ content: "__loading__", toolBadges: [] });
    });

    es.addEventListener("tool_start", (e: MessageEvent) => {
      try {
        const d = JSON.parse(e.data);
        const badge: ToolBadge = { toolName: d.toolName, description: d.description, status: "pending" };
        currentToolBadges = [...currentToolBadges, badge];
        updateLastAssistantMsg({ content: "__loading__", toolBadges: [...currentToolBadges] });
      } catch {}
    });

    es.addEventListener("tool_done", (e: MessageEvent) => {
      try {
        const d = JSON.parse(e.data);
        currentToolBadges = currentToolBadges.map((b) =>
          b.toolName === d.toolName && b.status === "pending"
            ? { ...b, status: d.success ? "done" : "error", data: d.data, error: d.error }
            : b
        );
        updateLastAssistantMsg({ toolBadges: [...currentToolBadges] });
      } catch {}
    });

    es.addEventListener("action", (e: MessageEvent) => {
      try {
        const d = JSON.parse(e.data);
        if (d.action?.type === "navigate") {
          const pageRoutes: Record<string, string> = {
            dashboard: "/",
            projects: "/projects",
            project_detail: d.action.projectId ? `/projects/${d.action.projectId}` : "/projects",
            scene_editor: d.action.sceneId ? `/scenes/${d.action.sceneId}` : "/",
            script_editor: d.action.scriptId ? `/scripts/${d.action.scriptId}` : "/",
            character_library: "/characters",
            shot_list: d.action.projectId ? `/projects/${d.action.projectId}/shots` : "/",
            mood_board: "/mood-board",
            location_scout: "/locations",
            budget: "/budget",
            subtitles: "/subtitles",
            generation: "/generation",
            settings: "/settings",
            pricing: "/pricing",
          };
          const route = pageRoutes[d.action.page] || "/";
          setTimeout(() => setLocation(route), 1200);
        }
      } catch {}
    });

    es.addEventListener("token", (e: MessageEvent) => {
      try {
        const d = JSON.parse(e.data);
        fullText += d.token;
        updateLastAssistantMsg({ content: fullText });
      } catch {}
    });

    es.addEventListener("done", (e: MessageEvent) => {
      try {
        const d = JSON.parse(e.data);
        const finalText = d.text || fullText;
        updateLastAssistantMsg({ content: finalText, toolBadges: [...currentToolBadges] });
        utils.directorChat.history.invalidate({ projectId });
        setStreamingText(null);
        setIsSending(false);
        es.close();
        sseRef.current = null;
        // In voice mode — auto-speak the response
        if (voiceModeActive) {
          setVoiceModeState("speaking");
          speakTextViaHttp(finalText).then(() => {
            setVoiceModeState("listening");
            startVoiceModeRecording();
          }).catch(() => {
            setVoiceModeState("listening");
            startVoiceModeRecording();
          });
        }
      } catch {}
    });

    es.addEventListener("error", (e: MessageEvent) => {
      try {
        const d = JSON.parse((e as any).data || "{}");
        toast.error(d.message || "Director encountered an error");
      } catch {}
      setLocalMessages((prev) => prev.filter((m) => m.content !== "__loading__"));
      setIsSending(false);
      es.close();
      sseRef.current = null;
      if (voiceModeActive) setVoiceModeState("listening");
    });

    es.onerror = () => {
      setLocalMessages((prev) => prev.filter((m) => m.content !== "__loading__"));
      setIsSending(false);
      es.close();
      sseRef.current = null;
      if (voiceModeActive) setVoiceModeState("listening");
    };
  }, [isSending, sseSessionId, instructionsText, projectId, utils, voiceModeActive, setLocation]);

  const uploadMutation = trpc.directorChat.uploadAttachment.useMutation();

  const transcribeMutation = trpc.directorChat.transcribeVoice.useMutation({
    onSuccess: (data) => {
      if (data.text && data.text.trim()) {
        if (voiceState === "transcribing" && preEditText) {
          setVoiceState("applying_edit");
          voiceEditMutation.mutate({ currentText: preEditText, editCommand: data.text.trim() });
          setLastEditCommand(data.text.trim());
          return;
        }
        setVoiceState("idle");
        setInput((prev) => prev ? prev + " " + data.text.trim() : data.text.trim());
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

  const clearMutation = trpc.directorChat.clear.useMutation({
    onSuccess: () => {
      setLocalMessages([]);
      utils.directorChat.history.invalidate({ projectId });
      toast.success("Chat history cleared");
    },
  });

  // ─── Scroll to bottom with ResizeObserver ───
  const scrollToBottom = useCallback((force = false) => {
    if (!scrollRef.current) return;
    if (force || !userScrolledUp) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [userScrolledUp]);

  useEffect(() => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    const handleScroll = () => {
      const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      setUserScrolledUp(distFromBottom > 80);
    };
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!scrollRef.current) return;
    const ro = new ResizeObserver(() => scrollToBottom());
    ro.observe(scrollRef.current);
    return () => ro.disconnect();
  }, [scrollToBottom]);

  useEffect(() => { scrollToBottom(); }, [localMessages, scrollToBottom]);

  // ─── Sync history to local messages ───
  useEffect(() => {
    if (history && localMessages.length === 0) {
      setLocalMessages(history.map((m) => ({
        role: m.role,
        content: m.content,
        actions: m.actionData ? (m.actionData as ActionBadge[]) : undefined,
      })));
    }
  }, [history]);

  // ─── Cleanup on unmount ───
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      if (voiceModeStreamRef.current) voiceModeStreamRef.current.getTracks().forEach((t) => t.stop());
      if (audioSourceRef.current) { try { audioSourceRef.current.stop(); } catch (_) {} }
      if (audioCtxRef.current) { try { audioCtxRef.current.close(); } catch (_) {} }
      if (streamingIntervalRef.current) clearInterval(streamingIntervalRef.current);
    };
  }, []);

  // ─── AudioContext TTS (Safari iOS safe) ───
  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioCtxRef.current;
  }, []);

  const stopSpeaking = useCallback(() => {
    if (audioSourceRef.current) {
      try { audioSourceRef.current.stop(); } catch (_) {}
      audioSourceRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  /** Fetch audio from /api/voice/tts and play via AudioContext (Safari safe) */
  const speakTextViaHttp = useCallback(async (text: string): Promise<void> => {
    if (!text.trim()) return;
    stopSpeaking();
    setIsSpeaking(true);
    try {
      const resp = await fetch("/api/voice/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text: text.slice(0, 1000) }),
      });
      if (!resp.ok) throw new Error(`TTS HTTP ${resp.status}`);
      const arrayBuf = await resp.arrayBuffer();
      const ctx = getAudioContext();
      if (ctx.state === "suspended") await ctx.resume();
      const audioBuf = await ctx.decodeAudioData(arrayBuf);
      const source = ctx.createBufferSource();
      source.buffer = audioBuf;
      source.connect(ctx.destination);
      audioSourceRef.current = source;
      return new Promise((resolve) => {
        source.onended = () => {
          audioSourceRef.current = null;
          setIsSpeaking(false);
          resolve();
        };
        source.start(0);
      });
    } catch (err) {
      setIsSpeaking(false);
      // Fallback to browser TTS
      if (window.speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance(text.slice(0, 500));
        utterance.rate = 0.9;
        utterance.pitch = 0.9;
        return new Promise((resolve) => {
          utterance.onend = () => resolve();
          utterance.onerror = () => resolve();
          window.speechSynthesis.speak(utterance);
        });
      }
    }
  }, [stopSpeaking, getAudioContext]);

  const speakText = useCallback((text: string) => {
    if (!text.trim()) { toast.info("No text to read back"); return; }
    if (isSpeaking) { stopSpeaking(); return; }
    speakTextViaHttp(text).catch(() => {});
  }, [isSpeaking, stopSpeaking, speakTextViaHttp]);

  // ─── Full-screen Voice Mode (Titan-style) ───
  // Use a ref to allow the function to call itself recursively without circular deps
  const startVoiceModeRecordingRef = useRef<() => Promise<void>>(() => Promise.resolve());
  const startVoiceModeRecording = useCallback(async () => {
    return startVoiceModeRecordingRef.current();
  }, []);

  useEffect(() => {
    startVoiceModeRecordingRef.current = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 44100 },
      });
      voiceModeStreamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      voiceModeRecorderRef.current = recorder;
      voiceModeChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) voiceModeChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        voiceModeStreamRef.current = null;
        const blob = new Blob(voiceModeChunksRef.current, { type: mimeType });
        if (blob.size < 500) { setVoiceModeState("listening"); startVoiceModeRecording(); return; }
        setVoiceModeState("thinking");
        setVoiceModeTranscript("Transcribing...");
        try {
          // Convert to base64 for the tRPC transcription endpoint
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          const baseMime = mimeType.split(";")[0];
          transcribeMutation.mutate(
            { projectId: projectId ?? 0, audioData: base64, mimeType: baseMime },
            {
              onSuccess: (data) => {
                if (data.text?.trim()) {
                  setVoiceModeTranscript(data.text.trim());
                  setVoiceModeState("thinking");
                  // Auto-send via SSE
                  setLocalMessages((prev) => {
                    const newMsgs = [
                      ...prev,
                      { role: "user", content: data.text.trim() },
                      { role: "assistant", content: "__loading__" },
                    ];
                    const allMsgs = newMsgs
                      .filter((m) => m.content !== "__loading__")
                      .map((m) => ({ role: m.role, content: m.content }));
                    void sendViaSSE(allMsgs);
                    return newMsgs;
                  });
                } else {
                  setVoiceModeTranscript("Didn't catch that — try again");
                  setVoiceModeState("listening");
                  startVoiceModeRecording();
                }
              },
              onError: () => {
                setVoiceModeTranscript("Transcription failed — try again");
                setVoiceModeState("listening");
                startVoiceModeRecording();
              },
            }
          );
        } catch {
          setVoiceModeTranscript("Transcription failed — try again");
          setVoiceModeState("listening");
          startVoiceModeRecording();
        }
      };
      recorder.start(250);
      setVoiceModeState("listening");
      // VAD: auto-stop after 4 seconds of silence (simple timeout approach)
      // User can also tap the screen to stop manually
    } catch (err) {
      toast.error("Microphone access denied");
      setVoiceModeActive(false);
      setVoiceModeState("inactive");
    }
  };
  }, [projectId, transcribeMutation, sendViaSSE]);

  const stopVoiceModeRecording = useCallback(() => {
    if (voiceModeRecorderRef.current && voiceModeRecorderRef.current.state === "recording") {
      voiceModeRecorderRef.current.stop();
    }
  }, []);

  const openVoiceMode = useCallback(async () => {
    setVoiceModeActive(true);
    setVoiceModeTranscript("");
    setVoiceModeState("listening");
    await startVoiceModeRecording();
  }, [startVoiceModeRecording]);

  const closeVoiceMode = useCallback(() => {
    if (voiceModeRecorderRef.current && voiceModeRecorderRef.current.state === "recording") {
      voiceModeRecorderRef.current.onstop = null;
      voiceModeRecorderRef.current.stop();
    }
    if (voiceModeStreamRef.current) {
      voiceModeStreamRef.current.getTracks().forEach((t) => t.stop());
      voiceModeStreamRef.current = null;
    }
    stopSpeaking();
    setVoiceModeActive(false);
    setVoiceModeState("inactive");
    setVoiceModeTranscript("");
  }, [stopSpeaking]);

  // ─── Standard voice recording (inline, for dictation/edit) ───
  const startRecordingInternal = useCallback(async (isEditMode: boolean) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 44100 },
      });
      streamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" : "audio/webm";
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        if (audioBlob.size < 1000) { setVoiceState("idle"); toast.error("Recording too short. Hold the mic button longer."); return; }
        if (audioBlob.size > 16 * 1024 * 1024) { setVoiceState("idle"); toast.error("Recording exceeds 16MB limit."); return; }
        if (isEditMode) setPreEditText(input);
        setVoiceState("transcribing");
        const baseMime = mimeType.split(";")[0];
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(",")[1];
          transcribeMutation.mutate({ projectId: projectId ?? 0, audioData: base64, mimeType: baseMime });
        };
        reader.readAsDataURL(audioBlob);
      };
      mediaRecorder.start(250);
      setVoiceState(isEditMode ? "recording_edit" : "recording");
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => setRecordingDuration((prev) => prev + 1), 1000);
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
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
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

  // ─── Copy message ───
  const copyMessage = useCallback((text: string, idx: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 1500);
    }).catch(() => toast.error("Failed to copy"));
  }, []);

  // ─── Regenerate last response ───
  const regenerateLastResponse = useCallback(() => {
    const msgs = localMessages.filter((m) => m.role !== "system");
    const lastUserIdx = [...msgs].reverse().findIndex((m) => m.role === "user");
    if (lastUserIdx === -1) return;
    const lastUser = msgs[msgs.length - 1 - lastUserIdx];
    // Remove the last assistant message
    setLocalMessages((prev) => {
      const filtered = [...prev];
      const lastAssistantIdx = [...filtered].reverse().findIndex((m) => m.role === "assistant");
      if (lastAssistantIdx >= 0) filtered.splice(filtered.length - 1 - lastAssistantIdx, 1);
      return [...filtered, { role: "assistant", content: "__loading__" }];
    });
    const allMsgs = localMessages
      .filter((m) => m.role !== "system" && m.content !== "__loading__")
      .slice(0, -1) // remove last assistant
      .map((m) => ({ role: m.role, content: m.content }));
    void sendViaSSE(allMsgs);
  }, [localMessages, sendViaSSE]);

  // ─── Preset Edit Commands ───
  const applyPreset = useCallback((command: string, label: string) => {
    if (!input.trim()) { toast.info("Type or dictate some text first, then use presets to refine it"); return; }
    setActivePreset(label);
    setPreEditText(input);
    setLastEditCommand(label);
    setVoiceState("applying_edit");
    setShowPresets(false);
    voiceEditMutation.mutate({ currentText: input, editCommand: command });
  }, [input, voiceEditMutation]);

  // ─── Auto-resize textarea ───
  const handleTextareaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val);
    const ta = e.target;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
    // Slash commands
    if (val.startsWith("/")) {
      const filter = val.slice(1).toLowerCase();
      setSlashFilter(filter);
      setShowSlashMenu(true);
    } else {
      setShowSlashMenu(false);
    }
  }, []);

  // ─── File upload ───
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (file.size > 10 * 1024 * 1024) { toast.error(`${file.name} exceeds 10MB limit`); continue; }
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve((reader.result as string).split(",")[1]);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        const result = await uploadMutation.mutateAsync({ projectId: projectId ?? 0, fileName: file.name, fileData: base64, mimeType: file.type });
        setAttachments((prev) => [...prev, { url: result.url, name: result.fileName, mimeType: file.type }]);
        toast.success(`Attached: ${file.name}`);
      }
    } catch { toast.error("Failed to upload file"); }
    finally { setIsUploading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  }, [projectId, uploadMutation]);

  // ─── Send message ───
  const handleSend = useCallback((overrideText?: string) => {
    const trimmed = (overrideText ?? input).trim();
    if (!trimmed && attachments.length === 0) return;
    if (isSpeaking) stopSpeaking();
    setShowSlashMenu(false);

    // Handle slash commands
    if (trimmed === "/new" || trimmed === "/clear") {
      clearMutation.mutate({ projectId: projectId ?? 0 });
      setInput("");
      return;
    }

    const attachNames = attachments.map((a) => a.name).join(", ");
    const messageContent = trimmed
      ? attachments.length > 0 ? `${trimmed}\n\n📎 ${attachNames}` : trimmed
      : `[Shared files: ${attachNames}]`;

    setLocalMessages((prev) => [
      ...prev,
      { role: "user", content: messageContent },
      { role: "assistant", content: "__loading__" },
    ]);
    // Build message history for SSE endpoint
    const allMsgs = localMessages
      .filter((m) => m.content !== "__loading__")
      .map((m) => ({ role: m.role, content: m.content }));
    allMsgs.push({ role: "user", content: messageContent });
    void sendViaSSE(allMsgs);
    setInput("");
    setAttachments([]);
    setEditHistory([]);
    setEditIdCounter(0);
    setShowEditPreview(false);
    setShowHistoryPanel(false);
    setShowPresets(false);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }, [input, attachments, localMessages, sendViaSSE, isSpeaking, stopSpeaking, clearMutation]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
    if (e.key === "Escape") setShowSlashMenu(false);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (showSlashMenu) e.preventDefault();
    }
  }, [handleSend, showSlashMenu]);

  // ─── Keyboard shortcuts ───
  const isRecording = voiceState === "recording" || voiceState === "recording_edit";

  useEffect(() => {
    if (!isOpen) return;
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === "TEXTAREA" || target.tagName === "INPUT" || target.isContentEditable;
      if (e.key === "Escape") {
        if (voiceModeActive) { e.preventDefault(); closeVoiceMode(); return; }
        if (isRecording) { e.preventDefault(); cancelRecording(); return; }
        if (showEditPreview) { e.preventDefault(); rejectEdit(); return; }
        if (isSpeaking) { e.preventDefault(); stopSpeaking(); return; }
      }
      if (isTyping) return;
      if ((e.key === "v" || e.key === "V") && voiceState === "idle" && !showEditPreview && !isSending) {
        e.preventDefault();
        if (input.trim()) startEditRecording(); else startRecording();
        return;
      }
      if ((e.key === "s" || e.key === "S") && isRecording) { e.preventDefault(); stopRecording(); return; }
      if ((e.key === "r" || e.key === "R") && voiceState === "idle" && !showEditPreview) { e.preventDefault(); speakText(input); return; }
      if ((e.key === "a" || e.key === "A") && showEditPreview) { e.preventDefault(); acceptEdit(); return; }
      if ((e.key === "z" || e.key === "Z") && voiceState === "idle" && !showEditPreview && editHistory.length > 0) { e.preventDefault(); undoLastEdit(); return; }
      if (e.key === "?") { e.preventDefault(); setShowShortcutHint((prev) => !prev); return; }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [
    isOpen, voiceState, isRecording, showEditPreview, isSpeaking, input,
    voiceModeActive, cancelRecording, rejectEdit, stopSpeaking, startRecording,
    startEditRecording, stopRecording, speakText, acceptEdit, undoLastEdit,
    editHistory.length, isSending, closeVoiceMode,
  ]);

  // ─── Helpers ───
  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };
  const formatTime = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  const displayMessages = localMessages.filter((m) => m.role !== "system");
  const isBusy = isSending || voiceState !== "idle";
  const hasInputText = input.trim().length > 0;
  const filteredSlashCmds = SLASH_COMMANDS.filter((c) =>
    c.cmd.slice(1).startsWith(slashFilter) || c.desc.toLowerCase().includes(slashFilter)
  );

  const suggestedPrompts = [
    "Generate me a 2 minute film about...",
    "I want a scene where...",
    "Add a fade to black transition to the last scene",
    "Review my project and suggest improvements",
  ];

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

      {/* ─── Full-screen Voice Mode Overlay (Titan-style) ─── */}
      {voiceModeActive && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/95 backdrop-blur-xl">
          {/* Close button */}
          <button
            onClick={closeVoiceMode}
            className="absolute top-6 right-6 size-10 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-all"
          >
            <X className="size-5" />
          </button>

          {/* Virelle branding */}
          <div className="flex flex-col items-center gap-2 mb-10">
            <div className="size-16 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-2xl shadow-amber-500/30">
              <Sparkles className="size-8 text-black" />
            </div>
            <p className="text-white/50 text-sm font-medium tracking-widest uppercase">Director's Assistant</p>
          </div>

          {/* State label */}
          <div className="mb-6 text-center">
            {voiceModeState === "listening" && (
              <p className="text-amber-400 text-lg font-medium animate-pulse">Listening...</p>
            )}
            {voiceModeState === "thinking" && (
              <p className="text-blue-400 text-lg font-medium">Thinking...</p>
            )}
            {voiceModeState === "speaking" && (
              <p className="text-emerald-400 text-lg font-medium">Speaking...</p>
            )}
          </div>

          {/* Waveform */}
          <div className="mb-8">
            <VoiceWaveform
              active={voiceModeState === "listening" || voiceModeState === "speaking"}
              color={voiceModeState === "speaking" ? "#34d399" : voiceModeState === "thinking" ? "#60a5fa" : "#f59e0b"}
            />
          </div>

          {/* Transcript */}
          {voiceModeTranscript && (
            <div className="max-w-sm text-center px-6 mb-8">
              <p className="text-white/70 text-sm leading-relaxed">{voiceModeTranscript}</p>
            </div>
          )}

          {/* Tap to stop / send */}
          {voiceModeState === "listening" && (
            <button
              onClick={stopVoiceModeRecording}
              className="mt-2 px-6 py-3 rounded-full bg-amber-500 text-black font-semibold text-sm hover:bg-amber-400 active:scale-95 transition-all shadow-lg shadow-amber-500/30"
            >
              <Square className="size-4 fill-current inline mr-2" />
              Send
            </button>
          )}

          {/* Loading spinner for thinking */}
          {voiceModeState === "thinking" && (
            <Loader2 className="size-8 animate-spin text-blue-400 mt-2" />
          )}

          <p className="absolute bottom-8 text-white/30 text-xs">Press Esc to exit voice mode</p>
        </div>
      )}

      {/* ─── Chat panel ─── */}
      <div
        ref={chatPanelRef}
        className={cn(
          "fixed z-50 flex flex-col bg-background border border-border shadow-2xl transition-all duration-300 ease-out",
          "inset-0 sm:inset-auto",
          "sm:bottom-6 sm:right-6 sm:w-[420px] sm:h-[600px] sm:max-h-[80dvh] sm:rounded-2xl",
          isOpen
            ? "opacity-100 translate-y-0 scale-100"
            : "opacity-0 translate-y-4 scale-95 pointer-events-none"
        )}
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-amber-500/10 to-amber-600/5 sm:rounded-t-2xl shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
              <Sparkles className="size-4 text-black" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Director's Assistant</h3>
              <p className="text-xs text-muted-foreground">AI co-director for your film</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* Voice Mode button */}
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10"
              onClick={openVoiceMode}
              title="Voice mode — hands-free conversation"
            >
              <PhoneCall className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => setShowInstructions((prev) => !prev)}
              title="Director instructions"
            >
              <Settings className="size-4 text-muted-foreground" />
            </Button>
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
              onClick={() => clearMutation.mutate({ projectId: projectId ?? 0 })}
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

        {/* Director Instructions panel */}
        {showInstructions && (
          <div className="px-4 py-3 border-b bg-muted/20 shrink-0">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-amber-400">My Rules for the Director</p>
              <button onClick={() => setShowInstructions(false)} className="text-muted-foreground hover:text-foreground">
                <X className="size-3" />
              </button>
            </div>
            <Textarea
              value={instructionsText}
              onChange={(e) => setInstructionsText(e.target.value)}
              placeholder="e.g. Always respond in a cinematic, poetic tone. Prefer noir aesthetics. Keep scene descriptions under 3 sentences."
              className="text-xs min-h-[72px] max-h-[120px] resize-none"
              rows={3}
            />
            <div className="flex justify-end mt-2">
              <Button
                size="sm"
                className={cn("text-xs gap-1", instructionsSaved ? "bg-emerald-500 hover:bg-emerald-400 text-white" : "bg-amber-500 hover:bg-amber-400 text-black")}
                onClick={() => saveInstructionsMutation.mutate({ instructions: instructionsText })}
                disabled={saveInstructionsMutation.isPending}
              >
                {instructionsSaved ? <><Check className="size-3" /> Saved</> : "Save"}
              </Button>
            </div>
          </div>
        )}

        {/* Keyboard shortcut hint panel */}
        {showShortcutHint && (
          <div className="px-4 py-2.5 border-b bg-muted/30 text-xs space-y-1 shrink-0">
            <div className="flex items-center justify-between mb-1">
              <p className="font-medium text-foreground">Keyboard Shortcuts</p>
              <button onClick={() => setShowShortcutHint(false)} className="text-muted-foreground hover:text-foreground">
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
              Shortcuts work when text input is not focused. Press <kbd className="px-1 py-0.5 rounded bg-background border border-border text-[10px] font-mono">?</kbd> to toggle.
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
                <p className="font-medium text-sm mb-1">Your AI co-director is ready</p>
                <p className="text-xs text-muted-foreground max-w-[280px]">
                  I can modify scenes, add sound effects, adjust transitions, and help you build a better film.
                  Type, speak, or tap the phone icon for hands-free voice mode.
                </p>
              </div>
              <div className="flex flex-col gap-2 w-full max-w-[300px]">
                {suggestedPrompts.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => { setInput(prompt); textareaRef.current?.focus(); }}
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
                          <span className="text-xs text-muted-foreground">Thinking...</span>
                        </div>
                      </div>
                    </div>
                  );
                }
                return (
                  <div
                    key={i}
                    className={cn(
                      "flex gap-2.5 group",
                      msg.role === "user" ? "justify-end items-start" : "justify-start items-start"
                    )}
                  >
                    {msg.role === "assistant" && (
                      <div className="size-7 shrink-0 mt-0.5 rounded-full bg-gradient-to-br from-amber-500/20 to-amber-600/10 flex items-center justify-center">
                        <Sparkles className="size-3.5 text-amber-500" />
                      </div>
                    )}
                    <div className={cn("max-w-[85%] flex flex-col gap-1")}>
                      <div
                        className={cn(
                          "rounded-xl px-3.5 py-2.5",
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
                          <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                        )}
                        {msg.actions && <ActionBadges actions={msg.actions} />}
                        {msg.toolBadges && msg.toolBadges.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {msg.toolBadges.map((tb, ti) => (
                              <div
                                key={ti}
                                className={cn(
                                  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border",
                                  tb.status === "pending" && "bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse",
                                  tb.status === "done" && "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                                  tb.status === "error" && "bg-red-500/10 text-red-400 border-red-500/20"
                                )}
                              >
                                {tb.status === "pending" && <Loader2 className="size-3 animate-spin" />}
                                {tb.status === "done" && <CheckCircle2 className="size-3" />}
                                {tb.status === "error" && <XCircle className="size-3" />}
                                {tb.description || tb.toolName.replace(/_/g, " ")}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      {/* Message actions */}
                      <div className={cn(
                        "flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity",
                        msg.role === "user" ? "justify-end" : "justify-start"
                      )}>
                        <button
                          onClick={() => copyMessage(msg.content, i)}
                          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          title="Copy"
                        >
                          {copiedIdx === i ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                        </button>
                        {msg.role === "assistant" && i === displayMessages.length - 1 && (
                          <button
                            onClick={regenerateLastResponse}
                            disabled={isSending}
                            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            title="Regenerate response"
                          >
                            <RefreshCw className="size-3" />
                          </button>
                        )}
                        {msg.role === "assistant" && (
                          <button
                            onClick={() => speakText(msg.content)}
                            className={cn(
                              "p-1 rounded transition-colors",
                              isSpeaking ? "text-amber-500 hover:text-amber-400" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                            )}
                            title={isSpeaking ? "Stop" : "Read aloud"}
                          >
                            {isSpeaking ? <VolumeX className="size-3" /> : <Volume2 className="size-3" />}
                          </button>
                        )}
                      </div>
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

        {/* Scroll to bottom button */}
        {userScrolledUp && (
          <button
            onClick={() => { setUserScrolledUp(false); scrollToBottom(true); }}
            className="absolute bottom-[120px] right-4 size-8 rounded-full bg-amber-500 text-black flex items-center justify-center shadow-lg hover:bg-amber-400 transition-all z-10"
          >
            <ChevronDown className="size-4" />
          </button>
        )}

        {/* Voice recording overlay — dictation mode (red) */}
        {voiceState === "recording" && (
          <div className="px-4 py-3 border-t bg-red-500/5 border-red-500/20 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative flex items-center justify-center">
                  <span className="absolute size-5 rounded-full bg-red-500/30 animate-ping" />
                  <span className="relative size-3 rounded-full bg-red-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-red-400">Dictating...</p>
                  <p className="text-xs text-muted-foreground">{formatDuration(recordingDuration)}<span className="ml-2 opacity-60">Press S to stop, Esc to cancel</span></p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground" onClick={cancelRecording}>Cancel</Button>
                <Button size="sm" className="bg-red-500 hover:bg-red-400 text-white gap-1.5" onClick={stopRecording}>
                  <Square className="size-3 fill-current" />Stop
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Voice recording overlay — edit mode (violet) */}
        {voiceState === "recording_edit" && (
          <div className="px-4 py-3 border-t bg-violet-500/5 border-violet-500/20 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative flex items-center justify-center">
                  <span className="absolute size-5 rounded-full bg-violet-500/30 animate-ping" />
                  <span className="relative size-3 rounded-full bg-violet-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-violet-400">Voice editing...</p>
                  <p className="text-xs text-muted-foreground">Chain: "replace X with Y and add Z"<span className="ml-2 opacity-60">S to stop, Esc to cancel</span></p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground" onClick={cancelRecording}>Cancel</Button>
                <Button size="sm" className="bg-violet-500 hover:bg-violet-400 text-white gap-1.5" onClick={stopRecording}>
                  <Square className="size-3 fill-current" />Apply
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Transcribing overlay */}
        {voiceState === "transcribing" && (
          <div className="px-4 py-3 border-t bg-amber-500/5 border-amber-500/20 shrink-0">
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
          <div className="px-4 py-3 border-t bg-violet-500/5 border-violet-500/20 shrink-0">
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
          <div className="px-4 py-3 border-t bg-violet-500/5 border-violet-500/20 shrink-0">
            <div className="mb-2">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-violet-400"><Pencil className="size-3 inline mr-1" />Voice edit preview</p>
                <span className="text-[10px] text-muted-foreground">"{lastEditCommand}"</span>
              </div>
              <div className="bg-background/60 rounded-lg p-2.5 border border-violet-500/10 max-h-[100px] overflow-y-auto">
                {!preEditText && !previewText
                  ? <span className="text-muted-foreground italic text-sm">Empty (text cleared)</span>
                  : <DiffView oldText={preEditText} newText={previewText} />}
              </div>
              <div className="flex items-center gap-3 mt-1">
                <div className="flex items-center gap-1 text-[10px] text-red-400">
                  <span className="inline-block w-2 h-2 rounded-sm bg-red-500/20 border border-red-500/30" />Removed
                </div>
                <div className="flex items-center gap-1 text-[10px] text-emerald-400">
                  <span className="inline-block w-2 h-2 rounded-sm bg-emerald-500/20 border border-emerald-500/30" />Added
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-muted-foreground">
                <kbd className="px-1 py-0.5 rounded bg-background border border-border text-[10px] font-mono">A</kbd> accept{" · "}
                <kbd className="px-1 py-0.5 rounded bg-background border border-border text-[10px] font-mono">Esc</kbd> reject
              </p>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground gap-1" onClick={rejectEdit}>
                  <XCircle className="size-3" />Reject
                </Button>
                <Button size="sm" className="bg-violet-500 hover:bg-violet-400 text-white gap-1" onClick={acceptEdit}>
                  <Check className="size-3" />Accept
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Edit history panel */}
        {editHistory.length > 0 && voiceState === "idle" && !showEditPreview && (
          <div className="border-t border-violet-500/10 shrink-0">
            <button
              onClick={() => setShowHistoryPanel((prev) => !prev)}
              className="w-full px-4 py-2 flex items-center justify-between text-xs hover:bg-violet-500/5 transition-colors"
            >
              <div className="flex items-center gap-1.5 text-violet-400">
                <History className="size-3" />
                <span className="font-medium">Edit history ({editHistory.length})</span>
              </div>
              {showHistoryPanel ? <ChevronDown className="size-3 text-muted-foreground" /> : <ChevronUp className="size-3 text-muted-foreground" />}
            </button>
            {showHistoryPanel && (
              <div className="max-h-[150px] overflow-y-auto px-4 pb-2 space-y-1.5">
                {[...editHistory].reverse().map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between gap-2 rounded-lg bg-background/40 border border-border/50 px-2.5 py-1.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">"{entry.command}"</p>
                      <p className="text-[10px] text-muted-foreground">{formatTime(entry.timestamp)}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="size-6 shrink-0 text-muted-foreground hover:text-violet-400" onClick={() => revertToEdit(entry.id)} title={`Revert to before "${entry.command}"`}>
                      <RotateCcw className="size-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Quick edit presets */}
        {hasInputText && voiceState === "idle" && !showEditPreview && (
          <div className="border-t border-amber-500/10 shrink-0">
            <button
              onClick={() => setShowPresets((prev) => !prev)}
              className="w-full px-4 py-2 flex items-center justify-between text-xs hover:bg-amber-500/5 transition-colors"
            >
              <div className="flex items-center gap-1.5 text-amber-400">
                <Wand2 className="size-3" />
                <span className="font-medium">Quick edits</span>
              </div>
              {showPresets ? <ChevronDown className="size-3 text-muted-foreground" /> : <ChevronUp className="size-3 text-muted-foreground" />}
            </button>
            {showPresets && (
              <div className="px-4 pb-2.5 flex flex-wrap gap-1.5">
                {EDIT_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => applyPreset(preset.command, preset.label)}
                    disabled={voiceState !== "idle" || isSending}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-all",
                      "border border-amber-500/20 bg-amber-500/5 text-amber-400",
                      "hover:bg-amber-500/15 hover:border-amber-500/30",
                      "active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    <Wand2 className="size-3" />{preset.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Attachment preview */}
        {attachments.length > 0 && (
          <div className="px-4 py-2 border-t bg-muted/30 space-y-1.5 shrink-0">
            {attachments.map((att, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                {att.mimeType.startsWith("image/") ? (
                  <img src={att.url} alt={att.name} className="size-8 rounded object-cover" />
                ) : getFileIcon(att.mimeType)}
                <span className="truncate flex-1">{att.name}</span>
                <button onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-foreground">
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Slash command menu */}
        {showSlashMenu && filteredSlashCmds.length > 0 && (
          <div className="absolute bottom-[72px] left-3 right-3 bg-popover border border-border rounded-xl shadow-xl overflow-hidden z-10 shrink-0">
            {filteredSlashCmds.map((cmd) => (
              <button
                key={cmd.cmd}
                onClick={() => { setInput(cmd.cmd + " "); setShowSlashMenu(false); textareaRef.current?.focus(); }}
                className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-accent transition-colors"
              >
                <span className="text-amber-400 font-mono text-xs font-medium w-20 shrink-0">{cmd.cmd}</span>
                <span className="text-xs text-muted-foreground">{cmd.desc}</span>
              </button>
            ))}
          </div>
        )}

        {/* Input area */}
        <div className="border-t bg-background/80 backdrop-blur-sm p-3 sm:rounded-b-2xl shrink-0">
          <div className="flex items-end gap-2">
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
              title="Attach files"
            >
              {isUploading ? <Loader2 className="size-4 animate-spin" /> : <Paperclip className="size-4 text-muted-foreground" />}
            </Button>

            {/* Voice edit button */}
            {hasInputText && voiceState === "idle" ? (
              <Button
                variant="ghost"
                size="icon"
                className="size-9 shrink-0 text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 transition-all"
                onClick={startEditRecording}
                disabled={isSending || showEditPreview}
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
              onClick={voiceState === "idle" ? startRecording : isRecording ? stopRecording : undefined}
              disabled={voiceState === "transcribing" || voiceState === "applying_edit" || isSending || showEditPreview}
              title={voiceState === "idle" ? "Dictate (V)" : isRecording ? "Stop recording (S)" : "Processing..."}
            >
              {voiceState === "transcribing" || voiceState === "applying_edit"
                ? <Loader2 className="size-4 animate-spin" />
                : isRecording
                ? <Square className={cn("size-3.5 fill-current", voiceState === "recording_edit" ? "text-violet-500" : "text-red-500")} />
                : <Mic className="size-4 text-muted-foreground" />}
            </Button>

            {/* Read back button */}
            {hasInputText && voiceState === "idle" && !showEditPreview && (
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "size-9 shrink-0 transition-all",
                  isSpeaking ? "text-amber-500 bg-amber-500/10 hover:bg-amber-500/20" : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => speakText(input)}
                disabled={isSending}
                title={isSpeaking ? "Stop reading (Esc)" : "Read back text (R)"}
              >
                {isSpeaking ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
              </Button>
            )}

            {/* Undo button */}
            {editHistory.length > 0 && voiceState === "idle" && !showEditPreview && (
              <Button
                variant="ghost"
                size="icon"
                className="size-9 shrink-0 text-muted-foreground hover:text-foreground"
                onClick={undoLastEdit}
                disabled={isSending}
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
                voiceState === "transcribing" ? "Transcribing your voice..."
                : voiceState === "applying_edit" ? "Applying your edit..."
                : showEditPreview ? "Review the edit above..."
                : hasInputText ? "Edit text or press V to voice-edit..."
                : "Type, press V to speak, or / for commands..."
              }
              className={cn(
                "flex-1 min-h-[42px] max-h-[160px] resize-none text-sm rounded-xl py-2.5 px-3",
                showEditPreview
                  ? "border-violet-500/30 focus-visible:ring-violet-500/30"
                  : "border-border/50 focus-visible:ring-amber-500/30"
              )}
              rows={1}
              inputMode="text"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="sentences"
              enterKeyHint="send"
              disabled={isSending || voiceState === "transcribing" || voiceState === "applying_edit" || showEditPreview}
            />

            {/* Send button */}
            <Button
              size="icon"
              className="size-9 shrink-0 bg-amber-500 hover:bg-amber-400 text-black"
              onClick={() => handleSend()}
              disabled={(!input.trim() && attachments.length === 0) || isSending || voiceState !== "idle" || showEditPreview}
            >
              {isSending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
            {hasInputText && voiceState === "idle"
              ? "V to voice-edit · R to read back · Quick edits above"
              : "Type, press V to speak, / for commands, or tap the phone icon for voice mode"}
          </p>
        </div>
      </div>
    </>
  );
}
