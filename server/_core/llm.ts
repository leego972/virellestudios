import { ENV } from "./env";
import { AsyncLocalStorage } from "async_hooks";
import { logger } from "./logger";

/**
 * Request-scoped LLM key context. Lets a top-level handler (e.g. quickGenerate's
 * background pipeline) inject the user's BYOK OpenAI/Anthropic key once, and have
 * EVERY nested invokeLLM call automatically prefer that key over the shared
 * platform key â without threading `userApiKey` through 80+ callsites.
 *
 * Use:
 *   await withUserLlmKey({ openaiKey, anthropicKey }, async () => {
 *     // any code in here â including code in helper modules â that calls
 *     // invokeLLM() will use the user's key first, falling back to the
 *     // platform key only if the user's key is missing or fails.
 *   });
 */
type UserLlmCtx = {
  openaiKey?: string | null;
  anthropicKey?: string | null;
  veniceKey?: string | null;
};
const userLlmKeyStore = new AsyncLocalStorage<UserLlmCtx>();
export function withUserLlmKey<T>(ctx: UserLlmCtx, fn: () => Promise<T>): Promise<T> {
  const clean: UserLlmCtx = {
    openaiKey: ctx?.openaiKey || null,
    anthropicKey: ctx?.anthropicKey || null,
    veniceKey: ctx?.veniceKey || null,
  };
  return userLlmKeyStore.run(clean, fn);
}
function getUserLlmCtx(): UserLlmCtx {
  return userLlmKeyStore.getStore() || {};
}

/** Venice AI is OpenAI-compatible at api.venice.ai. Default to a strong general model. */
const VENICE_URL = "https://api.venice.ai/api/v1/chat/completions";
const VENICE_DEFAULT_MODEL = "llama-3.3-70b";

export type Role = "system" | "user" | "assistant" | "tool" | "function";

export type TextContent = {
  type: "text";
  text: string;
};

export type ImageContent = {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
};

export type FileContent = {
  type: "file_url";
  file_url: {
    url: string;
    mime_type?: "audio/mpeg" | "audio/wav" | "application/pdf" | "audio/mp4" | "video/mp4" ;
  };
};

export type MessageContent = string | TextContent | ImageContent | FileContent;

export type Message = {
  role: Role;
  content: MessageContent | MessageContent[];
  name?: string;
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
};

export type Tool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export type ToolChoicePrimitive = "none" | "auto" | "required";
export type ToolChoiceByName = { name: string };
export type ToolChoiceExplicit = {
  type: "function";
  function: {
    name: string;
  };
};

export type ToolChoice =
  | ToolChoicePrimitive
  | ToolChoiceByName
  | ToolChoiceExplicit;

export type InvokeParams = {
  messages: Message[];
  tools?: Tool[];
  toolChoice?: ToolChoice;
  tool_choice?: ToolChoice;
  maxTokens?: number;
  max_tokens?: number;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  systemTag?: string;
  model?: string;
  /** Per-request user API key â takes priority over the platform key */
  userApiKey?: string | null;
  /** Preferred model to use with userApiKey (defaults to gpt-4.1) */
  userModel?: string;
};

export type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

export type InvokeResult = {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: Role;
      content: string | Array<TextContent | ImageContent | FileContent>;
      tool_calls?: ToolCall[];
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

export type JsonSchema = {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
};

export type OutputSchema = JsonSchema;

export type ResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | { type: "json_schema"; json_schema: JsonSchema };

const ensureArray = (
  value: MessageContent | MessageContent[]
): MessageContent[] => (Array.isArray(value) ? value : [value]);

const normalizeContentPart = (
  part: MessageContent
): TextContent | ImageContent | FileContent => {
  if (typeof part === "string") {
    return { type: "text", text: part };
  }

  if (part.type === "text") {
    return part;
  }

  if (part.type === "image_url") {
    return part;
  }

  if (part.type === "file_url") {
    return part;
  }

  throw new Error("Unsupported message content part");
};

const normalizeMessage = (message: Message) => {
  const { role, name, tool_call_id } = message;
  const msgAny = message as any;

  // Preserve tool_calls on assistant messages â required for multi-turn tool conversations
  if (role === "assistant" && msgAny.tool_calls?.length) {
    return {
      role,
      name,
      content: typeof message.content === "string" ? message.content : "",
      tool_calls: msgAny.tool_calls,
    };
  }

  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content)
      .map(part => (typeof part === "string" ? part : JSON.stringify(part)))
      .join("\n");

    return {
      role,
      name,
      tool_call_id,
      content,
    };
  }

  const contentParts = ensureArray(message.content).map(normalizeContentPart);

  // If there's only text content, collapse to a single string for compatibility
  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return {
      role,
      name,
      content: contentParts[0].text,
    };
  }

  return {
    role,
    name,
    content: contentParts,
  };
};

const normalizeToolChoice = (
  toolChoice: ToolChoice | undefined,
  tools: Tool[] | undefined
): "none" | "auto" | ToolChoiceExplicit | undefined => {
  if (!toolChoice) return undefined;

  if (toolChoice === "none" || toolChoice === "auto") {
    return toolChoice;
  }

  if (toolChoice === "required") {
    if (!tools || tools.length === 0) {
      throw new Error(
        "tool_choice 'required' was provided but no tools were configured"
      );
    }

    if (tools.length > 1) {
      throw new Error(
        "tool_choice 'required' needs a single tool or specify the tool name explicitly"
      );
    }

    return {
      type: "function",
      function: { name: tools[0].function.name },
    };
  }

  if ("name" in toolChoice) {
    return {
      type: "function",
      function: { name: toolChoice.name },
    };
  }

  return toolChoice;
};

/**
 * Resolve the API URL and key.
 * Priority: Venice (permanent platform LLM) > OpenAI > Forge.
 * Venice is the permanent default LLM for all users â set VENICE_API_KEY in env.
 */
const resolveProvider = (): { url: string; apiKey: string; model: string } => {
  // Primary: Permanent platform Venice LLM (used by all users when no BYOK LLM is set)
  if (ENV.veniceApiKey) {
    return {
      url: VENICE_URL,
      apiKey: ENV.veniceApiKey,
      model: ENV.veniceModel || VENICE_DEFAULT_MODEL,
    };
  }

  // Secondary: Platform OpenAI key (legacy fallback)
  if (ENV.openaiApiKey) {
    return {
      url: "https://api.openai.com/v1/chat/completions",
      apiKey: ENV.openaiApiKey,
      model: "gpt-4.1",
    };
  }

  // Groq free tier â Llama 3.3 70B with tool calling (free at console.groq.com)
  if (ENV.groqApiKey) {
    return {
      url: "https://api.groq.com/openai/v1/chat/completions",
      apiKey: ENV.groqApiKey,
      model: "llama-3.3-70b-versatile",
    };
  }
  // Final fallback: Forge API (built-in)
  if (ENV.forgeApiKey) {
    const baseUrl = ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0
      ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions`
      : "https://forge.manus.im/v1/chat/completions";
    return {
      url: baseUrl,
      apiKey: ENV.forgeApiKey,
      model: "gemini-2.5-flash",
    };
  }


  // Final free fallback: Pollinations (no key needed, no tool support)
  return {
    url: "https://text.pollinations.ai/openai",
    apiKey: "",
    model: "openai-large",
  };
};

const normalizeResponseFormat = ({
  responseFormat,
  response_format,
  outputSchema,
  output_schema,
}: {
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
}):
  | { type: "json_schema"; json_schema: JsonSchema }
  | { type: "text" }
  | { type: "json_object" }
  | undefined => {
  const explicitFormat = responseFormat || response_format;
  if (explicitFormat) {
    if (
      explicitFormat.type === "json_schema" &&
      !explicitFormat.json_schema?.schema
    ) {
      throw new Error(
        "responseFormat json_schema requires a defined schema object"
      );
    }
    return explicitFormat;
  }

  const schema = outputSchema || output_schema;
  if (!schema) return undefined;

  if (!schema.name || !schema.schema) {
    throw new Error("outputSchema requires both name and schema");
  }

  return {
    type: "json_schema",
    json_schema: {
      name: schema.name,
      schema: schema.schema,
      ...(typeof schema.strict === "boolean" ? { strict: schema.strict } : {}),
    },
  };
};

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  // ââ TitanAI fast-path âââââââââââââââââââââââââââââââââââââââââââââââââââ
  // If TITAN_API_URL is set AND the caller requests a titan-* model, route
  // directly to the self-hosted TitanAI API server (OpenAI-compatible).
  // Falls back to standard OpenAI/Forge routing if TitanAI API is unavailable.
  const requestedModel = typeof params.model === "string" ? params.model : "";
  if (ENV.titanApiUrl && requestedModel.startsWith("titan-")) {
    logger.info(`[LLM] Routing to TitanAI API: ${requestedModel}`);
    try {
      return await invokeLLMWithProvider(params, {
        url: `${ENV.titanApiUrl}/v1/chat/completions`,
        apiKey: ENV.titanApiKey || "",
        model: requestedModel,
      });
    } catch (titanErr: unknown) {
      logger.warn(`[LLM] TitanAI API failed, falling back to platform provider: ${(titanErr as Error).message}`);
    }
  }

    // BYOK priority chain: TitanAI (above) â Venice â OpenAI â platform Forge fallback.
  // Venice and OpenAI keys come from either explicit params.userApiKey OR the request-
  // scoped withUserLlmKey() context (set once at the top of background pipelines).
  const userCtx = getUserLlmCtx();
  const veniceKey: string | null = userCtx.veniceKey || null;
  const openaiKey: string | null = params.userApiKey || userCtx.openaiKey || null;

  // 1) Venice AI (OpenAI-compatible) â preferred user provider
  if (veniceKey) {
    try {
      return await invokeLLMWithProvider(params, {
        url: VENICE_URL,
        apiKey: veniceKey,
        model: params.userModel || VENICE_DEFAULT_MODEL,
      });
    } catch (e: any) {
      logger.warn(`[LLM] Venice key failed (${e.message?.slice(0, 80)}), trying next provider...`);
    }
  }

  // 2) User's OpenAI key
  if (openaiKey) {
    try {
      return await invokeLLMWithProvider(params, {
        url: "https://api.openai.com/v1/chat/completions",
        apiKey: openaiKey,
        model: params.userModel || "gpt-4.1",
      });
    } catch (e: any) {
      logger.warn(`[LLM] OpenAI BYOK key failed (${e.message?.slice(0, 80)}), falling back to platform provider...`);
    }
  }
  const provider = resolveProvider();

  const {
    messages,
    tools,
    toolChoice,
    tool_choice,
    outputSchema,
    output_schema,
    responseFormat,
    response_format,
  } = params;

  const payload: Record<string, unknown> = {
    model: provider.model,
    messages: messages.map(normalizeMessage),
  };

  if (tools && tools.length > 0) {
    payload.tools = tools;
  }

  const normalizedToolChoice = normalizeToolChoice(
    toolChoice || tool_choice,
    tools
  );
  if (normalizedToolChoice) {
    payload.tool_choice = normalizedToolChoice;
  }

  payload.max_tokens = 32768;

  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat,
    response_format,
    outputSchema,
    output_schema,
  });

  const supportsJsonSchema = provider.model.includes("gpt-4") || provider.model.includes("gpt-3.5") || provider.model.includes("gemini");
  if (normalizedResponseFormat) {
    if (normalizedResponseFormat.type === "json_schema" && !supportsJsonSchema) {
      payload.response_format = { type: "json_object" };
      // Inject schema into system prompt as fallback
      const systemMsg = messages.find(m => m.role === "system");
      if (systemMsg && typeof systemMsg.content === "string") {
        systemMsg.content += `\n\nReturn JSON matching this schema: ${JSON.stringify(normalizedResponseFormat.json_schema.schema)}`;
      }
    } else {
      payload.response_format = normalizedResponseFormat;
    }
  } else if (provider.model.startsWith("gemini")) {
    // Only enable thinking when not using structured output (json_schema)
    // as they are incompatible with the Gemini model
    payload.thinking = {
      budget_tokens: 2048,
    };
  }

  logger.info(`[LLM] Using provider: ${provider.model} at ${provider.url.substring(0, 40)}...`);

  const response = await fetch(provider.url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${provider.apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    const isQuotaError = response.status === 429 || errorText.includes("insufficient_quota") || errorText.includes("quota");
    const isOpenAI = provider.url.includes("openai.com");

    // OpenAI failed â if it's a quota/rate error, skip to Forge immediately.
    // For other errors, try gpt-4.1-mini first, then Forge.
    if (isOpenAI) {
      if (!isQuotaError && ENV.openaiApiKey) {
        // Transient error â try cheaper model on same account first
        logger.warn(`[LLM] OpenAI gpt-4.1 failed (${response.status}), trying gpt-4.1-mini...`);
        try {
          return await invokeLLMWithProvider(params, {
            url: "https://api.openai.com/v1/chat/completions",
            apiKey: ENV.openaiApiKey,
            model: "gpt-4.1-mini",
          });
        } catch {
          // Fall through to Forge
        }
      }
      // Quota exhausted or mini also failed â use Forge/Gemini (free)
      if (ENV.forgeApiKey) {
        const forgeUrl = ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0
          ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions`
          : "https://forge.manus.im/v1/chat/completions";
        logger.warn(`[LLM] OpenAI quota/error (${response.status}) â falling back to Forge/Gemini...`);
        return invokeLLMWithProvider(params, {
          url: forgeUrl,
          apiKey: ENV.forgeApiKey,
          model: "gemini-2.5-flash",
        });
      }
    }

    // Forge/non-OpenAI failed â try OpenAI as fallback (only if not a quota situation)
    if (!isOpenAI && ENV.openaiApiKey && !isQuotaError) {
      logger.warn(`[LLM] Forge failed (${response.status}), trying OpenAI fallback...`);
      return invokeLLMWithProvider(params, {
        url: "https://api.openai.com/v1/chat/completions",
        apiKey: ENV.openaiApiKey,
        model: "gpt-4.1",
      });
    }

    throw new Error(
      `LLM invoke failed: ${response.status} ${response.statusText} â ${errorText}`
    );
  }

  return (await response.json()) as InvokeResult;
}

/**
 * Internal: invoke LLM with a specific provider (used for fallback).
 */
async function invokeLLMWithProvider(
  params: InvokeParams,
  provider: { url: string; apiKey: string; model: string }
): Promise<InvokeResult> {
  const {
    messages,
    tools,
    toolChoice,
    tool_choice,
    outputSchema,
    output_schema,
    responseFormat,
    response_format,
  } = params;

  const payload: Record<string, unknown> = {
    model: provider.model,
    messages: messages.map(normalizeMessage),
  };

  if (tools && tools.length > 0) {
    payload.tools = tools;
  }

  const normalizedToolChoice = normalizeToolChoice(
    toolChoice || tool_choice,
    tools
  );
  if (normalizedToolChoice) {
    payload.tool_choice = normalizedToolChoice;
  }

  payload.max_tokens = 32768;

  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat,
    response_format,
    outputSchema,
    output_schema,
  });

  const supportsJsonSchema = provider.model.includes("gpt-4") || provider.model.includes("gpt-3.5") || provider.model.includes("gemini");
  if (normalizedResponseFormat) {
    if (normalizedResponseFormat.type === "json_schema" && !supportsJsonSchema) {
      payload.response_format = { type: "json_object" };
      // Inject schema into system prompt as fallback
      const systemMsg = messages.find(m => m.role === "system");
      if (systemMsg && typeof systemMsg.content === "string") {
        systemMsg.content += `\n\nReturn JSON matching this schema: ${JSON.stringify(normalizedResponseFormat.json_schema.schema)}`;
      }
    } else {
      payload.response_format = normalizedResponseFormat;
    }
  } else if (provider.model.startsWith("gemini")) {
    payload.thinking = {
      budget_tokens: 2048,
    };
  }

  logger.info(`[LLM] Fallback provider: ${provider.model} at ${provider.url.substring(0, 40)}...`);

  const response = await fetch(provider.url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${provider.apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    const isQuotaError = response.status === 429 || errorText.includes("insufficient_quota") || errorText.includes("quota");
    const isOpenAI = provider.url.includes("openai.com");
    // If this fallback provider is OpenAI and it's also quota-exhausted, try Forge
    if (isOpenAI && isQuotaError && ENV.forgeApiKey) {
      const forgeUrl = ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0
        ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions`
        : "https://forge.manus.im/v1/chat/completions";
      logger.warn(`[LLM] Fallback OpenAI also quota-exhausted â using Forge/Gemini as final fallback...`);
      return invokeLLMWithProvider(params, {
        url: forgeUrl,
        apiKey: ENV.forgeApiKey,
        model: "gemini-2.5-flash",
      });
    }
    throw new Error(
      `LLM fallback invoke failed: ${response.status} ${response.statusText} â ${errorText}`
    );
  }

  return (await response.json()) as InvokeResult;
}

/**
 * Streaming LLM invocation â yields tokens via onToken callback, calls onDone with full text.
 * Uses the same provider resolution as invokeLLM.
 */
export async function invokeLLMStream(
  params: { messages: Array<{ role: "system" | "user" | "assistant"; content: string }>; maxTokens?: number },
  onToken: (token: string) => void,
  onDone: (fullText: string) => void,
  onError: (err: Error) => void
): Promise<void> {
  const provider = resolveProvider();
  const payload = {
    model: provider.model,
    messages: params.messages,
    max_tokens: params.maxTokens ?? 800,
    stream: true,
  };

  try {
    const response = await fetch(provider.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok || !response.body) {
      const errText = await response.text().catch(() => response.statusText);
      throw new Error(`LLM stream failed: ${response.status} â ${errText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = "";
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === "data: [DONE]") continue;
        if (!trimmed.startsWith("data: ")) continue;
        try {
          const json = JSON.parse(trimmed.slice(6));
          const token: string = json?.choices?.[0]?.delta?.content ?? "";
          if (token) {
            fullText += token;
            onToken(token);
          }
        } catch {
          // ignore malformed SSE lines
        }
      }
    }
    onDone(fullText);
  } catch (err) {
    onError(err instanceof Error ? err : new Error(String(err)));
  }
}
