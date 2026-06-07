import { Router, type Request, type Response } from "express";

/**
 * Director's Assistant → TitanAI proxy route
 * Keeps TitanAI URL server-side; browser never calls TitanAI directly.
 *
 * POST /api/director-assistant/chat
 * Body: { messages: [{role, content}], max_tokens?, temperature? }
 */

const router = Router();
const TITAN_URL = process.env.TITAN_INFERENCE_URL || "http://localhost:8080";

const DIRECTOR_SYSTEM_PROMPT =
  "You are the Virelle Studios Director's Assistant. Help plan, budget, structure, " +
  "troubleshoot, and improve film-production projects. Keep answers practical, " +
  "production-grade, and focused on the user's current project.";

// GET /api/director-assistant/health — check TitanAI connectivity
router.get("/health", async (_req: Request, res: Response) => {
  try {
    const r = await fetch(`${TITAN_URL}/health`, {
      signal: AbortSignal.timeout(4000),
    });
    const data = (await r.json()) as Record<string, unknown>;
    res.json({ status: "ok", titan: data });
  } catch {
    res.status(503).json({ status: "offline", message: "Titan inference server unreachable" });
  }
});

// POST /api/director-assistant/chat — proxy to TitanAI with film-production system prompt
router.post("/chat", async (req: Request, res: Response) => {
  const { messages = [], max_tokens = 700, temperature = 0.6 } = req.body ?? {};

  if (!Array.isArray(messages)) {
    res.status(400).json({ error: "messages must be an array" });
    return;
  }

  // Cap history at last 10 messages (avoids context overflow)
  const capped = messages.slice(-10);

  // Prepend system prompt if not already present
  const payload = {
    messages: [
      { role: "system", content: DIRECTOR_SYSTEM_PROMPT },
      ...capped.filter((m: { role?: string }) => m.role !== "system"),
    ],
    max_tokens,
    temperature,
  };

  try {
    const r = await fetch(`${TITAN_URL}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(60_000),
    });

    if (!r.ok) {
      const errText = await r.text();
      res.status(502).json({ error: "TitanAI error", detail: errText.slice(0, 200) });
      return;
    }

    const data = await r.json();
    res.json(data);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    res.status(500).json({ error: "Director assistant proxy error", detail: msg });
  }
});

export { router as directorAssistantTitanRouter };
