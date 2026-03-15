import { useState, useRef, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  MessageCircle, X, Send, Loader2, Sparkles, CheckCircle2,
  Bot, User, ChevronDown, Settings2, Minimize2, Volume2, VolumeX,
} from "lucide-react";
import { toast } from "sonner";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  appliedUpdates?: Record<string, any>;
  provider?: string;
};

export default function VirelleChatBubble({
  sceneId,
  sceneTitle,
  onSceneUpdated,
}: {
  sceneId: number;
  sceneTitle: string;
  onSceneUpdated?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true); // Auto-speak AI responses
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Archibald Titan: ElevenLabs TTS mutation
  const speakResponseMutation = trpc.directorChat.speakResponse.useMutation();

  /** Play ElevenLabs audio from base64 */
  const playAudioBase64 = useCallback((base64: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    const audio = new Audio(`data:audio/mpeg;base64,${base64}`);
    audio.volume = 1.0;
    audio.onplay = () => setIsSpeaking(true);
    audio.onended = () => { setIsSpeaking(false); audioRef.current = null; };
    audio.onerror = () => { setIsSpeaking(false); audioRef.current = null; };
    audioRef.current = audio;
    audio.play().catch(() => { setIsSpeaking(false); audioRef.current = null; });
  }, []);

  /** Browser TTS fallback with deep male voice */
  const speakWithBrowser = useCallback((text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 0.85;
    utterance.volume = 1;
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(
      (v) => v.name.includes("Daniel") || v.name.includes("Google UK English Male") ||
             v.name.includes("Alex") || v.name.includes("Google")
    );
    if (preferred) utterance.voice = preferred;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, []);

  /** Speak AI response using ElevenLabs (Archibald Titan) with browser fallback */
  const speakResponse = useCallback((text: string) => {
    if (!voiceEnabled || !text.trim()) return;
    // Strip JSON code blocks before speaking
    const cleanText = text.replace(/```json[\s\S]*?```/g, "").trim();
    if (!cleanText) return;
    speakResponseMutation.mutate(
      { text: cleanText.substring(0, 1000) }, // Limit to 1000 chars for TTS
      {
        onSuccess: (data) => {
          if (data.audioBase64) {
            playAudioBase64(data.audioBase64);
          } else {
            speakWithBrowser(cleanText);
          }
        },
        onError: () => speakWithBrowser(cleanText),
      }
    );
  }, [voiceEnabled, speakResponseMutation, playAudioBase64, speakWithBrowser]);

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  }, []);

  const chatMutation = trpc.scene.virelleChat.useMutation({
    onSuccess: (data) => {
      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: data.response,
        appliedUpdates: data.appliedUpdates,
        provider: data.provider,
      };
      setChatHistory((prev) => [...prev, assistantMsg]);
      setIsTyping(false);

      // Auto-speak the AI response (Archibald Titan voice)
      speakResponse(data.response);

      if (data.updatedFieldCount > 0) {
        toast.success(`Virelle updated ${data.updatedFieldCount} scene field${data.updatedFieldCount > 1 ? "s" : ""}`);
        onSceneUpdated?.();
      }
    },
    onError: (err) => {
      setIsTyping(false);
      const errorMsg: ChatMessage = {
        role: "assistant",
        content: `I encountered an error: ${err.message}. Please check your API key in Settings.`,
      };
      setChatHistory((prev) => [...prev, errorMsg]);
      toast.error(err.message);
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, isTyping]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, isMinimized]);

  // Reset chat when scene changes
  useEffect(() => {
    setChatHistory([]);
  }, [sceneId]);

  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed || isTyping) return;

    const userMsg: ChatMessage = { role: "user", content: trimmed };
    setChatHistory((prev) => [...prev, userMsg]);
    setMessage("");
    setIsTyping(true);

    // Build chat history for context (exclude the current message, it's in the input)
    const history = chatHistory.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    chatMutation.mutate({
      sceneId,
      message: trimmed,
      chatHistory: history,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Strip JSON code blocks from display text
  const formatDisplayText = (text: string) => {
    return text.replace(/```json[\s\S]*?```/g, "").trim();
  };

  // Floating bubble button
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 group"
        title="Open Virelle AI Director Chat"
      >
        <div className="relative">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg shadow-amber-500/30 flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-amber-500/40">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-background flex items-center justify-center">
            <span className="text-[8px] text-white font-bold">AI</span>
          </div>
          {/* Pulse animation */}
          <div className="absolute inset-0 rounded-full bg-amber-500/30 animate-ping" style={{ animationDuration: "3s" }} />
        </div>
        <div className="absolute bottom-full right-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
          <div className="bg-card border border-border rounded-lg px-3 py-1.5 shadow-lg whitespace-nowrap">
            <p className="text-xs font-medium text-foreground">Virelle AI</p>
            <p className="text-[10px] text-muted-foreground">Scene editing assistant</p>
          </div>
        </div>
      </button>
    );
  }

  // Minimized state
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50">
        <button
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-full px-4 py-2.5 shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 transition-all"
        >
          <Sparkles className="w-4 h-4" />
          <span className="text-sm font-medium">Virelle</span>
          {chatHistory.length > 0 && (
            <Badge className="bg-white/20 text-white border-0 text-[10px] h-4 px-1.5">
              {chatHistory.length}
            </Badge>
          )}
          <ChevronDown className="w-3 h-3 rotate-180" />
        </button>
      </div>
    );
  }

  // Full chat panel
  return (
    <div className="fixed bottom-0 right-0 sm:bottom-6 sm:right-6 z-50 w-full sm:w-[380px] sm:max-w-[calc(100vw-2rem)]">
      <div className="bg-card border border-border sm:rounded-xl shadow-2xl shadow-black/20 overflow-hidden flex flex-col" style={{ maxHeight: "min(600px, calc(100dvh - env(safe-area-inset-top, 0px) - 1rem))" }}>
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500/15 to-amber-600/10 border-b border-border px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                Virelle
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[9px] h-4 px-1">ONLINE</Badge>
              </h3>
              <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                Editing: {sceneTitle || "Scene"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className={`h-7 w-7 p-0 ${isSpeaking ? "text-amber-400" : ""}`}
              onClick={() => {
                if (isSpeaking) {
                  stopSpeaking();
                } else {
                  setVoiceEnabled((v) => !v);
                }
              }}
              title={isSpeaking ? "Stop speaking" : voiceEnabled ? "Voice on (click to mute)" : "Voice off (click to unmute)"}
            >
              {isSpeaking ? (
                <VolumeX className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
              ) : voiceEnabled ? (
                <Volume2 className="h-3.5 w-3.5" />
              ) : (
                <VolumeX className="h-3.5 w-3.5 text-muted-foreground/50" />
              )}
            </Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setIsMinimized(true)} title="Minimize">
              <Minimize2 className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { stopSpeaking(); setIsOpen(false); setIsMinimized(false); }} title="Close">
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[200px]" style={{ maxHeight: "400px" }}>
          {/* Welcome message */}
          {chatHistory.length === 0 && (
            <div className="flex gap-2.5">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="bg-muted/50 rounded-lg rounded-tl-none px-3 py-2 max-w-[85%]">
                <p className="text-sm text-foreground">
                  Hey Director! I'm <strong>Virelle</strong>, your AI scene editing assistant.
                </p>
                <p className="text-xs text-muted-foreground mt-1.5">
                  Tell me what you'd like to change about this scene. For example:
                </p>
                <div className="mt-2 space-y-1">
                  {[
                    '"Make the lighting more dramatic and moody"',
                    '"Change the time to golden hour sunset"',
                    '"Add more tension to the description"',
                    '"Make the kiss scene longer and more passionate"',
                  ].map((suggestion, i) => (
                    <button
                      key={i}
                      className="block w-full text-left text-[11px] text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 rounded px-2 py-1 transition-colors"
                      onClick={() => {
                        setMessage(suggestion.replace(/"/g, ""));
                        inputRef.current?.focus();
                      }}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Chat messages */}
          {chatHistory.map((msg, idx) => (
            <div key={idx} className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                msg.role === "user"
                  ? "bg-primary/20"
                  : "bg-gradient-to-br from-amber-500 to-amber-600"
              }`}>
                {msg.role === "user" ? (
                  <User className="w-3.5 h-3.5 text-primary" />
                ) : (
                  <Bot className="w-3.5 h-3.5 text-white" />
                )}
              </div>
              <div className={`rounded-lg px-3 py-2 max-w-[85%] ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-tr-none"
                  : "bg-muted/50 rounded-tl-none"
              }`}>
                <p className="text-sm whitespace-pre-wrap">{formatDisplayText(msg.content)}</p>
                {msg.appliedUpdates && Object.keys(msg.appliedUpdates).length > 0 && (
                  <div className="mt-2 pt-2 border-t border-border/50">
                    <div className="flex items-center gap-1 text-[10px] text-green-400 mb-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span className="font-medium">Scene Updated</span>
                    </div>
                    <div className="space-y-0.5">
                      {Object.entries(msg.appliedUpdates).map(([key, value]) => (
                        <p key={key} className="text-[10px] text-muted-foreground">
                          <span className="text-foreground font-medium">{key}</span>: {String(value).substring(0, 60)}{String(value).length > 60 ? "..." : ""}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
                {msg.provider && msg.role === "assistant" && (
                  <p className="text-[9px] text-muted-foreground/60 mt-1 flex items-center gap-1">
                    via {msg.provider === "openai" ? "GPT-4.1" : msg.provider === "anthropic" ? "Claude" : "Gemini"}
                  </p>
                )}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex gap-2.5">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="bg-muted/50 rounded-lg rounded-tl-none px-3 py-2">
                <div className="flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
                  <span className="text-xs text-muted-foreground">Virelle is thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-border px-3 py-2.5 shrink-0">
          <div className="flex items-center gap-2">
            <Input
              ref={inputRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tell Virelle what to change..."
              className="h-9 text-sm bg-background/50 border-muted-foreground/20 focus:border-amber-500/50"
              disabled={isTyping}
              inputMode="text"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="sentences"
              enterKeyHint="send"
            />
            <Button
              size="sm"
              className="h-9 w-9 p-0 bg-gradient-to-br from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shrink-0"
              onClick={handleSend}
              disabled={!message.trim() || isTyping}
            >
              {isTyping ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-[9px] text-muted-foreground/50 mt-1 text-center">
            Powered by OpenAI / Claude / Gemini
          </p>
        </div>
      </div>
    </div>
  );
}
