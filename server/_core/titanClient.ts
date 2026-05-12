/**
   * TitanAI Client
   * ==============
   * Calls your self-hosted TitanAI laptop server when TITAN_API_URL is set.
   * Falls back silently when Titan is offline — Virelle keeps working normally.
   *
   * Setup:
   *   1. Run `bash start.sh` in your titanai/ folder (synced from Dropbox)
   *   2. Copy the cloudflare tunnel URL it prints
   *   3. Set TITAN_API_URL=https://xxxx.trycloudflare.com in Railway env vars
   */

  const TITAN_URL = process.env.TITAN_API_URL?.replace(/\/$/, "");
  const TITAN_TIMEOUT_MS = 60_000; // CPU inference can be slow

  export type TitanMessage = {
    role: "system" | "user" | "assistant";
    content: string;
  };

  export type TitanResponse = {
    text: string;
    source: "titan" | "unavailable";
    latencyMs: number;
  };

  /**
   * Returns true when TITAN_API_URL is configured.
   * Does NOT guarantee the server is reachable — use isTitanReady() for that.
   */
  export function isTitanConfigured(): boolean {
    return Boolean(TITAN_URL);
  }

  /**
   * Quick health check — resolves true if Titan is up and model is loaded.
   */
  export async function isTitanReady(): Promise<boolean> {
    if (!TITAN_URL) return false;
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 5_000);
      const res = await fetch(`${TITAN_URL}/health`, { signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) return false;
      const body = await res.json() as Record<string, unknown>;
      return body.model_loaded === true || body.status === "ready";
    } catch {
      return false;
    }
  }

  /**
   * Send a chat conversation to Titan and return the generated text.
   * Always resolves — never throws. Returns source:"unavailable" on any failure.
   */
  export async function callTitan(
    messages: TitanMessage[],
    opts: {
      maxTokens?: number;
      temperature?: number;
      systemPrompt?: string;
    } = {}
  ): Promise<TitanResponse> {
    const t0 = Date.now();

    if (!TITAN_URL) {
      return { text: "", source: "unavailable", latencyMs: 0 };
    }

    const allMessages: TitanMessage[] = [
      {
        role: "system",
        content:
          opts.systemPrompt ??
          "You are Titan, a film and cinema specialist AI built by Virelle Studios. " +
          "You help directors, screenwriters, and filmmakers with creative decisions, " +
          "storytelling, scene breakdowns, cinematography advice, and production guidance. " +
          "Be concise, creative, and speak like a seasoned industry professional.",
      },
      ...messages,
    ];

    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), TITAN_TIMEOUT_MS);

      const res = await fetch(`${TITAN_URL}/v1/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "titan",
          messages: allMessages,
          max_tokens: opts.maxTokens ?? 512,
          temperature: opts.temperature ?? 0.8,
          stream: false,
        }),
        signal: ctrl.signal,
      });

      clearTimeout(timer);

      if (!res.ok) {
        return { text: "", source: "unavailable", latencyMs: Date.now() - t0 };
      }

      const data = await res.json() as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const text = data.choices?.[0]?.message?.content?.trim() ?? "";
      return { text, source: "titan", latencyMs: Date.now() - t0 };
    } catch {
      return { text: "", source: "unavailable", latencyMs: Date.now() - t0 };
    }
  }
  