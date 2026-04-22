const API_BASE =
  (import.meta as any).env?.VITE_TITAN_API_URL ??
  process.env["TITAN_API_URL"] ??
  "https://archibaldtitan.replit.app/api";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface TitanChatResponse {
  reply: string;
  persona: string;
  personaName: string;
  model: string;
  tokens: number;
}

export interface TitanChatOptions {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}

export interface TitanStatusResult {
  status: string;
  training: boolean;
  modelEndpoint: boolean;
  personas: string[];
  version: string;
}

export interface TitanPersonaResult {
  id: string;
  name: string;
  domain: string;
  greeting: string;
  ready: boolean;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "unknown");
    throw new Error(`TitanAI API error ${res.status}: ${err}`);
  }
  return res.json() as Promise<T>;
}

export async function titanChat(
  options: TitanChatOptions
): Promise<TitanChatResponse> {
  return request<TitanChatResponse>("/titan/chat", {
    method: "POST",
    body: JSON.stringify({
      messages: options.messages,
      persona: "virelle",
      temperature: options.temperature ?? 0.8,
      maxTokens: options.maxTokens ?? 2048,
    }),
  });
}

export async function titanStatus(): Promise<TitanStatusResult> {
  return request<TitanStatusResult>("/titan/status");
}

export async function titanPersona(): Promise<TitanPersonaResult> {
  return request<TitanPersonaResult>("/titan/persona?id=virelle");
}

export const TITAN_PERSONA = "virelle" as const;
