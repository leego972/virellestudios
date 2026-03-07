/**
 * Voice transcription helper using internal Speech-to-Text service
 *
 * Frontend implementation guide:
 * 1. Capture audio using MediaRecorder API
 * 2. Upload audio to storage (e.g., S3) to get URL
 * 3. Call transcription with the URL
 * 
 * Example usage:
 * ```tsx
 * // Frontend component
 * const transcribeMutation = trpc.voice.transcribe.useMutation({
 *   onSuccess: (data) => {
 *     console.log(data.text); // Full transcription
 *     console.log(data.language); // Detected language
 *     console.log(data.segments); // Timestamped segments
 *   }
 * });
 * 
 * // After uploading audio to storage
 * transcribeMutation.mutate({
 *   audioUrl: uploadedAudioUrl,
 *   language: 'en', // optional
 *   prompt: 'Transcribe the meeting' // optional
 * });
 * ```
 */
import { ENV } from "./env";

export type TranscribeOptions = {
  audioUrl: string; // URL to the audio file (e.g., S3 URL)
  language?: string; // Optional: specify language code (e.g., "en", "es", "zh")
  prompt?: string; // Optional: custom prompt for the transcription
};

// Native Whisper API segment format
export type WhisperSegment = {
  id: number;
  seek: number;
  start: number;
  end: number;
  text: string;
  tokens: number[];
  temperature: number;
  avg_logprob: number;
  compression_ratio: number;
  no_speech_prob: number;
};

// Native Whisper API response format
export type WhisperResponse = {
  task: "transcribe";
  language: string;
  duration: number;
  text: string;
  segments: WhisperSegment[];
};

export type TranscriptionResponse = WhisperResponse; // Return native Whisper API response directly

export type TranscriptionError = {
  error: string;
  code: "FILE_TOO_LARGE" | "INVALID_FORMAT" | "TRANSCRIPTION_FAILED" | "UPLOAD_FAILED" | "SERVICE_ERROR";
  details?: string;
};

/**
 * Transcribe audio to text using the internal Speech-to-Text service
 * 
 * @param options - Audio data and metadata
 * @returns Transcription result or error
 */
export async function transcribeAudio(
  options: TranscribeOptions
): Promise<TranscriptionResponse | TranscriptionError> {
  try {
    // Step 1: Validate environment configuration
    if (!ENV.openaiApiKey && !ENV.forgeApiUrl) {
      return {
        error: "Voice transcription service is not configured",
        code: "SERVICE_ERROR",
        details: "Neither OPENAI_API_KEY nor BUILT_IN_FORGE_API_URL is set"
      };
    }
    if (!ENV.openaiApiKey && !ENV.forgeApiKey) {
      return {
        error: "Voice transcription service authentication is missing",
        code: "SERVICE_ERROR",
        details: "Neither OPENAI_API_KEY nor BUILT_IN_FORGE_API_KEY is set"
      };
    }

    // Step 2: Download audio from URL
    let audioBuffer: Buffer;
    let mimeType: string;
    try {
      const response = await fetch(options.audioUrl);
      if (!response.ok) {
        return {
          error: "Failed to download audio file",
          code: "INVALID_FORMAT",
          details: `HTTP ${response.status}: ${response.statusText}`
        };
      }
      
      audioBuffer = Buffer.from(await response.arrayBuffer());
      mimeType = response.headers.get('content-type') || 'audio/mpeg';
      
      // Check file size (16MB limit)
      const sizeMB = audioBuffer.length / (1024 * 1024);
      if (sizeMB > 16) {
        return {
          error: "Audio file exceeds maximum size limit",
          code: "FILE_TOO_LARGE",
          details: `File size is ${sizeMB.toFixed(2)}MB, maximum allowed is 16MB`
        };
      }
    } catch (error) {
      return {
        error: "Failed to fetch audio file",
        code: "SERVICE_ERROR",
        details: error instanceof Error ? error.message : "Unknown error"
      };
    }

    // Step 3: Create FormData for multipart upload to Whisper API
    const formData = new FormData();
    
    // Create a Blob from the buffer and append to form
    const filename = `audio.${getFileExtension(mimeType)}`;
    const audioBlob = new Blob([new Uint8Array(audioBuffer)], { type: mimeType });
    formData.append("file", audioBlob, filename);
    
    formData.append("model", "whisper-1");
    formData.append("response_format", "verbose_json");
    
    // Add prompt - use custom prompt if provided, otherwise generate based on language
    const prompt = options.prompt || (
      options.language 
        ? `Transcribe the user's voice to text, the user's working language is ${getLanguageName(options.language)}`
        : "Transcribe the user's voice to text"
    );
    formData.append("prompt", prompt);

    // Step 4: Call the transcription service
    // Priority: OpenAI Whisper API > Forge API
    let transcriptionUrl: string;
    let transcriptionKey: string;

    if (ENV.openaiApiKey) {
      transcriptionUrl = "https://api.openai.com/v1/audio/transcriptions";
      transcriptionKey = ENV.openaiApiKey;
    } else if (ENV.forgeApiUrl && ENV.forgeApiKey) {
      const baseUrl = ENV.forgeApiUrl.endsWith("/")
        ? ENV.forgeApiUrl
        : `${ENV.forgeApiUrl}/`;
      transcriptionUrl = new URL("v1/audio/transcriptions", baseUrl).toString();
      transcriptionKey = ENV.forgeApiKey;
    } else {
      return {
        error: "No transcription service configured",
        code: "SERVICE_ERROR" as const,
        details: "Neither OPENAI_API_KEY nor BUILT_IN_FORGE_API_KEY is set"
      };
    }

    console.log(`[Transcription] Using: ${transcriptionUrl.substring(0, 40)}...`);

    let response = await fetch(transcriptionUrl, {
      method: "POST",
      headers: {
        authorization: `Bearer ${transcriptionKey}`,
        "Accept-Encoding": "identity",
      },
      body: formData,
    });

    // Fallback: if OpenAI fails and Forge is available, try Forge
    if (!response.ok && transcriptionUrl.includes("openai.com") && ENV.forgeApiUrl && ENV.forgeApiKey) {
      console.warn(`[Transcription] OpenAI failed (${response.status}), trying Forge fallback...`);
      const forgeBase = ENV.forgeApiUrl.endsWith("/") ? ENV.forgeApiUrl : `${ENV.forgeApiUrl}/`;
      const forgeUrl = new URL("v1/audio/transcriptions", forgeBase).toString();
      const forgeFormData = new FormData();
      const audioBlob2 = new Blob([new Uint8Array(audioBuffer)], { type: mimeType });
      forgeFormData.append("file", audioBlob2, filename);
      forgeFormData.append("model", "whisper-1");
      forgeFormData.append("response_format", "verbose_json");
      forgeFormData.append("prompt", prompt);
      response = await fetch(forgeUrl, {
        method: "POST",
        headers: {
          authorization: `Bearer ${ENV.forgeApiKey}`,
          "Accept-Encoding": "identity",
        },
        body: forgeFormData,
      });
    }

    // Fallback: if Forge fails and OpenAI is available, try OpenAI
    if (!response.ok && !transcriptionUrl.includes("openai.com") && ENV.openaiApiKey) {
      console.warn(`[Transcription] Forge failed (${response.status}), trying OpenAI fallback...`);
      const oaiFormData = new FormData();
      const audioBlob3 = new Blob([new Uint8Array(audioBuffer)], { type: mimeType });
      oaiFormData.append("file", audioBlob3, filename);
      oaiFormData.append("model", "whisper-1");
      oaiFormData.append("response_format", "verbose_json");
      oaiFormData.append("prompt", prompt);
      response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          authorization: `Bearer ${ENV.openaiApiKey}`,
          "Accept-Encoding": "identity",
        },
        body: oaiFormData,
      });
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      return {
        error: "Transcription service request failed",
        code: "TRANSCRIPTION_FAILED",
        details: `${response.status} ${response.statusText}${errorText ? `: ${errorText}` : ""}`
      };
    }

    // Step 5: Parse and return the transcription result
    const whisperResponse = await response.json() as WhisperResponse;
    
    // Validate response structure
    if (!whisperResponse.text || typeof whisperResponse.text !== 'string') {
      return {
        error: "Invalid transcription response",
        code: "SERVICE_ERROR",
        details: "Transcription service returned an invalid response format"
      };
    }

    return whisperResponse; // Return native Whisper API response directly

  } catch (error) {
    // Handle unexpected errors
    return {
      error: "Voice transcription failed",
      code: "SERVICE_ERROR",
      details: error instanceof Error ? error.message : "An unexpected error occurred"
    };
  }
}

/**
 * Helper function to get file extension from MIME type
 */
function getFileExtension(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    'audio/webm': 'webm',
    'audio/mp3': 'mp3',
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
    'audio/wave': 'wav',
    'audio/ogg': 'ogg',
    'audio/m4a': 'm4a',
    'audio/mp4': 'm4a',
  };
  
  return mimeToExt[mimeType] || 'audio';
}

/**
 * Helper function to get full language name from ISO code
 */
function getLanguageName(langCode: string): string {
  const langMap: Record<string, string> = {
    'en': 'English',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'ja': 'Japanese',
    'ko': 'Korean',
    'zh': 'Chinese',
    'ar': 'Arabic',
    'hi': 'Hindi',
    'nl': 'Dutch',
    'pl': 'Polish',
    'tr': 'Turkish',
    'sv': 'Swedish',
    'da': 'Danish',
    'no': 'Norwegian',
    'fi': 'Finnish',
  };
  
  return langMap[langCode] || langCode;
}

/**
 * Example tRPC procedure implementation:
 * 
 * ```ts
 * // In server/routers.ts
 * import { transcribeAudio } from "./_core/voiceTranscription";
 * 
 * export const voiceRouter = router({
 *   transcribe: protectedProcedure
 *     .input(z.object({
 *       audioUrl: z.string(),
 *       language: z.string().optional(),
 *       prompt: z.string().optional(),
 *     }))
 *     .mutation(async ({ input, ctx }) => {
 *       const result = await transcribeAudio(input);
 *       
 *       // Check if it's an error
 *       if ('error' in result) {
 *         throw new TRPCError({
 *           code: 'BAD_REQUEST',
 *           message: result.error,
 *           cause: result,
 *         });
 *       }
 *       
 *       // Optionally save transcription to database
 *       await db.insert(transcriptions).values({
 *         userId: ctx.user.id,
 *         text: result.text,
 *         duration: result.duration,
 *         language: result.language,
 *         audioUrl: input.audioUrl,
 *         createdAt: new Date(),
 *       });
 *       
 *       return result;
 *     }),
 * });
 * ```
 */
