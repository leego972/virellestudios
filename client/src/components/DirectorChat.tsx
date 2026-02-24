import { useState, useEffect, useRef, useCallback } from "react";
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
} from "lucide-react";

interface DirectorChatProps {
  projectId: number;
}

interface ActionBadge {
  type: string;
  success: boolean;
  message: string;
}

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

// Voice recording states
type VoiceState = "idle" | "recording" | "transcribing";

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

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

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
      setVoiceState("idle");
      if (data.text && data.text.trim()) {
        // Auto-populate the input with transcribed text
        setInput((prev) => {
          const newText = prev ? prev + " " + data.text.trim() : data.text.trim();
          return newText;
        });
        toast.success("Voice transcribed — review and send");
        // Focus the textarea so user can review
        setTimeout(() => textareaRef.current?.focus(), 100);
      } else {
        toast.error("No speech detected. Please try again.");
      }
    },
    onError: (error) => {
      setVoiceState("idle");
      toast.error("Transcription failed: " + error.message);
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

  // Cleanup recording on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
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

  // ─── Voice Recording ───
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });
      streamRef.current = stream;

      // Determine best supported mime type
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
        // Stop all tracks
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;

        // Clear timer
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

        // Check minimum size (too short recordings produce empty transcriptions)
        if (audioBlob.size < 1000) {
          setVoiceState("idle");
          toast.error("Recording too short. Hold the mic button longer.");
          return;
        }

        // Check max size (16MB)
        if (audioBlob.size > 16 * 1024 * 1024) {
          setVoiceState("idle");
          toast.error("Recording exceeds 16MB limit. Try a shorter recording.");
          return;
        }

        // Convert to base64
        setVoiceState("transcribing");
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(",")[1];
          const baseMime = mimeType.split(";")[0]; // strip codecs
          transcribeMutation.mutate({
            projectId,
            audioData: base64,
            mimeType: baseMime,
          });
        };
        reader.readAsDataURL(audioBlob);
      };

      // Start recording with 250ms timeslice for smoother data collection
      mediaRecorder.start(250);
      setVoiceState("recording");
      setRecordingDuration(0);

      // Start duration timer
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
  }, [projectId, transcribeMutation]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      // Remove the onstop handler to prevent transcription
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
    toast.info("Recording cancelled");
  }, []);

  // Format seconds to mm:ss
  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Send message
  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed && attachments.length === 0) return;

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
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [input, attachments, projectId, sendMutation]);

  // Handle keyboard
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
                  and help you build a better film. Type or use the mic to speak.
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

        {/* Voice recording overlay */}
        {voiceState === "recording" && (
          <div className="px-4 py-3 border-t bg-red-500/5 border-red-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Pulsing red dot */}
                <div className="relative flex items-center justify-center">
                  <span className="absolute size-5 rounded-full bg-red-500/30 animate-ping" />
                  <span className="relative size-3 rounded-full bg-red-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-red-400">Recording...</p>
                  <p className="text-xs text-muted-foreground">{formatDuration(recordingDuration)}</p>
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
                  Stop & Transcribe
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

            {/* Voice input button */}
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "size-9 shrink-0 transition-all",
                voiceState === "recording" && "text-red-500 bg-red-500/10 hover:bg-red-500/20",
                voiceState === "transcribing" && "text-amber-500 bg-amber-500/10"
              )}
              onClick={voiceState === "idle" ? startRecording : voiceState === "recording" ? stopRecording : undefined}
              disabled={voiceState === "transcribing" || sendMutation.isPending}
              title={
                voiceState === "idle"
                  ? "Voice input — speak your command"
                  : voiceState === "recording"
                  ? "Stop recording"
                  : "Transcribing..."
              }
            >
              {voiceState === "transcribing" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : voiceState === "recording" ? (
                <Square className="size-3.5 fill-current text-red-500" />
              ) : (
                <Mic className="size-4 text-muted-foreground" />
              )}
            </Button>

            {/* Text input */}
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder={
                voiceState === "transcribing"
                  ? "Transcribing your voice..."
                  : "Type or tap the mic to speak..."
              }
              className="flex-1 min-h-[42px] max-h-[160px] resize-none text-sm rounded-xl border-border/50 focus-visible:ring-amber-500/30 py-2.5 px-3"
              rows={1}
              disabled={sendMutation.isPending || voiceState === "transcribing"}
            />

            {/* Send button */}
            <Button
              size="icon"
              className="size-9 shrink-0 bg-amber-500 hover:bg-amber-400 text-black"
              onClick={handleSend}
              disabled={
                (!input.trim() && attachments.length === 0) || sendMutation.isPending || voiceState !== "idle"
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
            Type, speak, or upload — actions execute on your project in real-time
          </p>
        </div>
      </div>
    </>
  );
}
