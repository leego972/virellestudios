/**
   * Virelle BYOK Provider Adapter — stub functions, safe no-ops.
   * Extend each function per provider once API integrations are wired.
   */
  export type JobStatus = "queued" | "submitted" | "processing" | "completed" | "failed";
  export type ProviderJobResult = { externalJobId: string | null; status: JobStatus; outputUrl: string | null; estimatedCost: number | null; message: string; };

  const stub = (provider: string, task: string): ProviderJobResult => ({
    externalJobId: null, status: "queued", outputUrl: null, estimatedCost: null,
    message: `${task} job ready for ${provider}. Add your API key in Settings → Providers.`,
  });

  export async function submitLLMJob(p: { provider: string; apiKey: string; prompt: string; projectId: number }): Promise<ProviderJobResult> {
    return stub(p.provider, "LLM");
  }
  export async function submitImageJob(p: { provider: string; apiKey: string; prompt: string; negativePrompt?: string; sceneId: number }): Promise<ProviderJobResult> {
    return stub(p.provider, "Image");
  }
  export async function submitVideoJob(p: { provider: string; apiKey: string; prompt: string; negativePrompt?: string; sceneId: number; duration?: number }): Promise<ProviderJobResult> {
    return stub(p.provider, "Video");
  }
  export async function submitVoiceJob(p: { provider: string; apiKey: string; text: string; voiceId?: string; sceneId: number }): Promise<ProviderJobResult> {
    return stub(p.provider, "Voice");
  }
  export async function submitMusicJob(p: { provider: string; apiKey: string; prompt: string; duration?: number; projectId: number }): Promise<ProviderJobResult> {
    return stub(p.provider, "Music");
  }
  export async function checkJobStatus(p: { provider: string; apiKey: string; externalJobId: string }): Promise<{ status: JobStatus; outputUrl: string | null; progress: number }> {
    return { status: "queued", outputUrl: null, progress: 0 };
  }
  