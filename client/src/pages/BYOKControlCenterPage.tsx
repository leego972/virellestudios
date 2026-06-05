// v6.68 Phase 5 — BYOK Provider Control Center.
// Lets users see which providers they've configured, validate keys, and pick
// their preferred video / LLM provider plus how aggressively to fall back to
// platform credits. The page never displays raw key strings — only masked
// "configured / not configured / valid / invalid" status from the server.

import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import SiteHead from "@/components/SiteHead";

const VIDEO_PROVIDERS = [
  "runway",
  "openai",
  "replicate",
  "fal",
  "luma",
  "byteplus",
  "huggingface",
] as const;

const LLM_PROVIDERS = ["openai", "anthropic", "google", "venice"] as const;

const ALL_PROVIDERS: { id: string; label: string; capability: string }[] = [
  { id: "openai", label: "OpenAI", capability: "LLM • image • video • voice" },
  { id: "anthropic", label: "Anthropic Claude", capability: "LLM" },
  { id: "google", label: "Google Gemini", capability: "LLM" },
  { id: "venice", label: "Venice", capability: "LLM" },
  { id: "runway", label: "Runway", capability: "Video" },
  { id: "replicate", label: "Replicate", capability: "Video • image" },
  { id: "fal", label: "fal.ai", capability: "Video • image" },
  { id: "luma", label: "Luma Dream Machine", capability: "Video" },
  { id: "byteplus", label: "BytePlus SeedDance", capability: "Video" },
  { id: "huggingface", label: "Hugging Face", capability: "Video • image" },
  { id: "elevenlabs", label: "ElevenLabs", capability: "Voice" },
  { id: "suno", label: "Suno", capability: "Music" },
  { id: "did", label: "D-ID", capability: "Accessibility • Auslan sign-language interpreter overlay" },
];

export default function BYOKControlCenterPage() {
  const statusQ = trpc.byok.getProviderStatus.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const updateMut = trpc.byok.updateProviderPreferences.useMutation({
    onSuccess: () => statusQ.refetch(),
  });
  const testMut = trpc.byok.testProviderKey.useMutation();

  const [preferredVideo, setPreferredVideo] = useState<string>("");
  const [preferredLlm, setPreferredLlm] = useState<string>("");
  // v6.69 repair — values match the persisted spec
  // (credits_only | byok_only | byok_with_consent | byok_with_auto_fallback).
  type FallbackMode = "credits_only" | "byok_only" | "byok_with_consent" | "byok_with_auto_fallback";
  const [fallbackMode, setFallbackMode] = useState<FallbackMode>("byok_with_consent");

  const status: any = statusQ.data ?? {};
  // v6.69 repair — hydrate the saved fallback mode once it loads.
  useEffect(() => {
    const saved = (status?.byokFallbackMode ?? null) as FallbackMode | null;
    if (saved && saved !== fallbackMode) setFallbackMode(saved);
  }, [status?.byokFallbackMode]);
  const providers: any = status.providers ?? {};

  return (
    <div className="min-h-screen bg-black text-zinc-100 px-6 py-8">
      <SiteHead title="BYOK Provider Control Center" />
      <div className="max-w-3xl mx-auto space-y-6">
        <header>
          <div className="text-xs uppercase tracking-wider text-amber-400/80">
            Provider control
          </div>
          <h1 className="text-3xl font-semibold mt-1">BYOK Control Center</h1>
          <p className="text-zinc-400 text-sm mt-1">
            See which AI providers you have configured and choose how Virelle
            generates your scenes. Your keys are never shown back to your
            browser — only their status.
          </p>
        </header>

        <section className="border border-zinc-800 bg-zinc-900/40 rounded-lg p-5">
          <h2 className="text-sm uppercase tracking-wider text-zinc-400 mb-3">
            Configured providers
          </h2>
          {statusQ.isLoading && <div className="text-sm text-zinc-500">Loading…</div>}
          <ul className="space-y-2">
            {ALL_PROVIDERS.map((p) => {
              const s = providers[p.id] ?? "not_configured";
              return (
                <li
                  key={p.id}
                  className="flex items-center justify-between text-sm py-2 border-b border-zinc-800/60 last:border-b-0"
                >
                  <div>
                    <div className="text-zinc-100">{p.label}</div>
                    <div className="text-xs text-zinc-500">{p.capability}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={s} />
                    {s !== "not_configured" && (
                      <button
                        onClick={() => testMut.mutate({ provider: p.id })}
                        className="text-xs bg-zinc-800 hover:bg-zinc-700 px-2.5 py-1 rounded"
                        disabled={testMut.isPending}
                      >
                        Test
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          {testMut.data && (
            <div className="mt-3 text-xs text-zinc-300">
              Test result for {testMut.data.provider}:{" "}
              <StatusBadge status={testMut.data.status} />
            </div>
          )}
          <p className="mt-4 text-xs text-zinc-500">
            To add or change a key, open the Settings page → API keys. Keys are
            stored encrypted at rest and never returned to the browser.
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            The D-ID key powers the optional circular Auslan sign-language interpreter overlay on exported films.
          </p>
        </section>

        <section className="border border-zinc-800 bg-zinc-900/40 rounded-lg p-5">
          <h2 className="text-sm uppercase tracking-wider text-zinc-400 mb-3">
            Preferences
          </h2>

          <label className="block text-sm text-zinc-300 mb-1">
            Preferred video provider
          </label>
          <select
            value={preferredVideo || (status.preferredVideoProvider ?? "")}
            onChange={(e) => setPreferredVideo(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm mb-4"
          >
            <option value="">Auto (let Virelle choose)</option>
            {VIDEO_PROVIDERS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          <label className="block text-sm text-zinc-300 mb-1">
            Preferred LLM provider (script & dialogue)
          </label>
          <select
            value={preferredLlm || (status.preferredLlmProvider ?? "")}
            onChange={(e) => setPreferredLlm(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm mb-4"
          >
            <option value="">Auto (let Virelle choose)</option>
            {LLM_PROVIDERS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          <label className="block text-sm text-zinc-300 mb-1">Fallback policy</label>
          <select
            value={fallbackMode}
            onChange={(e) => setFallbackMode(e.target.value as FallbackMode)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm mb-4"
          >
            <option value="byok_only">Use my key only — never fall back</option>
            <option value="byok_with_consent">
              Try my key first, then ask before using Virelle credits
            </option>
            <option value="byok_with_auto_fallback">
              Try my key first, silently fall back to Virelle credits
            </option>
            <option value="credits_only">Always use Virelle credits</option>
          </select>

          <button
            onClick={() =>
              updateMut.mutate({
                preferredVideoProvider: preferredVideo || null,
                preferredLlmProvider: preferredLlm || null,
                fallbackMode,
              })
            }
            disabled={updateMut.isPending}
            className="bg-amber-500 hover:bg-amber-400 text-black px-4 py-2 rounded text-sm font-medium disabled:opacity-50"
          >
            {updateMut.isPending ? "Saving…" : "Save preferences"}
          </button>
          {updateMut.isSuccess && (
            <div className="text-xs text-emerald-300 mt-2">Preferences saved.</div>
          )}
        </section>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    not_configured: { label: "Not configured", cls: "bg-zinc-800 text-zinc-400" },
    configured: { label: "Configured", cls: "bg-zinc-700 text-zinc-200" },
    valid: { label: "Valid", cls: "bg-emerald-700/40 text-emerald-200" },
    invalid: { label: "Invalid", cls: "bg-red-700/40 text-red-200" },
    rate_limited: { label: "Rate limited", cls: "bg-amber-700/40 text-amber-200" },
    unsupported: { label: "Unsupported", cls: "bg-zinc-800 text-zinc-400" },
    unknown_error: { label: "Error", cls: "bg-red-700/40 text-red-200" },
  };
  const m = map[status] ?? map.not_configured;
  return (
    <span className={`text-[11px] px-2 py-0.5 rounded ${m.cls}`}>{m.label}</span>
  );
}
