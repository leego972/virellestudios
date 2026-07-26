from pathlib import Path

root = Path(__file__).resolve().parents[1]
path = root / "client/src/pages/Settings.tsx"
text = path.read_text(encoding="utf-8")

text = text.replace(
'''const VOICE_MUSIC_PROVIDERS = [
  {
    id: "elevenlabs",
    name: "ElevenLabs",
    description: "Industry-leading AI voice acting. Natural, expressive dialogue for every character.",
    signupUrl: "https://elevenlabs.io/sign-up",
    pricing: "Starter: $5/mo (30K chars). Creator: $22/mo (100K chars).",
    models: "Multilingual v2, Turbo v2.5, Voice Cloning",
  },
  {
    id: "suno",
    name: "Suno AI",
    description: "AI-composed original soundtracks and music scores for your films.",
    signupUrl: "https://suno.com",
    pricing: "Pro: $10/mo (500 songs). Premier: $30/mo (2000 songs).",
    models: "Suno v4, Chirp v3.5",
  },
];''',
'''const VOICE_MUSIC_PROVIDERS = [
  {
    id: "elevenlabs",
    name: "ElevenLabs",
    description: "Voice acting, voice synthesis, sound effects and automatic soundtrack completion for silent Adult Studio renders.",
    signupUrl: "https://elevenlabs.io/sign-up",
    pricing: "Provider billing applies directly to your ElevenLabs account.",
    models: "Multilingual v2, Turbo v2.5, Voice Cloning, Sound Generation",
    capabilities: ["Dialogue", "Voice", "Sound effects", "Silent-render completion"],
  },
  {
    id: "suno",
    name: "Suno AI",
    description: "Original instrumental soundtracks and cinematic music scores, including automatic completion when a rendered video has no audio stream.",
    signupUrl: "https://suno.com",
    pricing: "Provider billing applies directly to your Suno account.",
    models: "Suno v4, Chirp v3.5",
    capabilities: ["Soundtracks", "Film scores", "Ambient music", "Silent-render completion"],
  },
];

const VIDEO_PROVIDER_IDS = new Set([
  "runway", "fal", "replicate", "openai", "luma", "huggingface", "seedance", "veo3",
]);

const AUDIO_PROVIDER_IDS = ["elevenlabs", "suno", "replicate", "openai"] as const;''')

text = text.replace(
'''  const configuredKeys = profile?.apiKeys || {};
  const hasAnyKey = Object.values(configuredKeys).some(Boolean);''',
'''  const configuredKeys = profile?.apiKeys || {};
  const hasAnyVideoKey = Object.entries(configuredKeys).some(
    ([provider, configured]) => VIDEO_PROVIDER_IDS.has(provider) && Boolean(configured),
  );
  const hasAnyAudioKey = AUDIO_PROVIDER_IDS.some(
    (provider) => Boolean(configuredKeys[provider as keyof typeof configuredKeys]),
  );''')

text = text.replace("{!hasAnyKey && (", "{!hasAnyVideoKey && (")
text = text.replace("{hasAnyKey && (", "{hasAnyVideoKey && (")

old_age = '''          {/* Age Verification (18+) — required for Virelle Broadcast */}
          <Card className="bg-card/50 glass-card shadow-lg shadow-red-500/5 hover:shadow-red-500/20 transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2 gradient-text-gold">
                <Shield className="h-4 w-4 text-red-400" />
                Age Verification (18+)
              </CardTitle>
              <CardDescription className="text-xs">Required to access Virelle Broadcast and mature content features</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {profile?.isAdultVerified ? (
                <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-300">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Your account is verified as 18+. Broadcast features are unlocked.</span>
                </div>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">
                    By confirming below, you legally declare that you are at least 18 years of age. This unlocks
                    Virelle Broadcast (including live streaming destinations). Providing false information may result
                    in account termination.
                  </p>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => updateProfileMutation.mutate({ isAdultVerified: true } as any)}
                    disabled={updateProfileMutation.isPending}
                  >
                    {updateProfileMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Shield className="h-4 w-4 mr-2" />}
                    I confirm I am 18 or older
                  </Button>
                </>
              )}
            </CardContent>
          </Card>'''
new_age = '''          {/* Adult Studio verification is handled only by the dedicated identity gate. */}
          <Card className="bg-card/50 glass-card shadow-lg shadow-red-500/5 hover:shadow-red-500/20 transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2 gradient-text-gold">
                <Shield className="h-4 w-4 text-red-400" />
                Adult Studio verification
              </CardTitle>
              <CardDescription className="text-xs">Age, identity, phone, card-name, consent and activation checks are completed in the dedicated Adult Studio gate.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs leading-relaxed text-muted-foreground">
                A profile checkbox cannot unlock Adult Studio. Open the verified portal to view or complete the required individual checks.
              </p>
              <Button size="sm" variant="outline" onClick={() => window.location.assign("/adult-studio")}>
                <Shield className="mr-2 h-4 w-4" />Open Adult Studio verification
              </Button>
            </CardContent>
          </Card>'''
if old_age not in text:
    raise RuntimeError("Obsolete one-click age verification block not found")
text = text.replace(old_age, new_age, 1)

text = text.replace(
'''            <p className="text-sm text-muted-foreground mb-4">
              Add ElevenLabs for AI voice acting and Suno for AI soundtrack generation. These bring your films to life with professional dialogue and original music.
            </p>''',
'''            <p className="text-sm text-muted-foreground mb-4">
              Configure voice, sound-effect and soundtrack providers. Existing video audio is always preserved. When an Adult Studio render has no audio stream, Virelle can create a matching track from your saved ElevenLabs, Suno or Replicate key.
            </p>
            <Card className="mb-4 border-amber-500/25 bg-amber-500/[0.06]">
              <CardContent className="p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-amber-200">Audio completion readiness</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      ElevenLabs is tried first for generated sound, followed by Suno or Replicate MusicGen. OpenAI remains available for dialogue and voice workflows.
                    </p>
                  </div>
                  <Badge className={hasAnyAudioKey ? "bg-green-500/20 text-green-300" : "bg-red-500/15 text-red-300"}>
                    {hasAnyAudioKey ? "Audio provider connected" : "No audio provider connected"}
                  </Badge>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    ["ElevenLabs", "elevenlabs"],
                    ["Suno", "suno"],
                    ["Replicate / MusicGen", "replicate"],
                    ["OpenAI voice", "openai"],
                  ].map(([label, provider]) => {
                    const connected = Boolean(configuredKeys[provider as keyof typeof configuredKeys]);
                    return <div key={provider} className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs">
                      {connected ? <CheckCircle2 className="h-3.5 w-3.5 text-green-400" /> : <XCircle className="h-3.5 w-3.5 text-white/30" />}
                      <span className={connected ? "text-white/85" : "text-white/45"}>{label}</span>
                    </div>;
                  })}
                </div>
              </CardContent>
            </Card>''')

text = text.replace(
'''                      <div className="flex gap-2">
                        <Input type="password" placeholder={isConfigured ? "••••••••••••••••" : `Paste your ${provider.name} API key here...`} value={inputValue} onChange={(e) => setKeyInputs((prev) => ({ ...prev, [provider.id]: e.target.value }))} className="font-mono text-sm" />''',
'''                      <div className="space-y-2">
                        <Label htmlFor={`media-key-${provider.id}`} className="text-xs text-muted-foreground">{provider.name} API key</Label>
                        {"capabilities" in provider && Array.isArray(provider.capabilities) && (
                          <div className="flex flex-wrap gap-1.5">{provider.capabilities.map((capability: string) => <Badge key={capability} variant="outline" className="text-[10px]">{capability}</Badge>)}</div>
                        )}
                        <div className="flex flex-col gap-2 sm:flex-row">
                        <Input id={`media-key-${provider.id}`} type="password" autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder={isConfigured ? "••••••••••••••••" : `Paste your ${provider.name} API key here...`} value={inputValue} onChange={(e) => setKeyInputs((prev) => ({ ...prev, [provider.id]: e.target.value }))} className="min-w-0 flex-1 font-mono text-sm" />''')

# The replacement occurs in both video and voice/music loops. Close the extra wrapper after action buttons.
text = text.replace(
'''                        )}
                      </div>
                      {isConfigured && (''',
'''                        )}
                        </div>
                      </div>
                      {isConfigured && (''')

# Replicate is already in the video provider list; make its dual audio role explicit.
text = text.replace(
'''                          {isPreferred && <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30"><Zap className="w-3 h-3 mr-1" />Preferred</Badge>}''',
'''                          {isPreferred && <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30"><Zap className="w-3 h-3 mr-1" />Preferred</Badge>}
                          {provider.id === "replicate" && <Badge variant="outline" className="border-pink-500/30 text-pink-300">Video + MusicGen audio</Badge>}
                          {provider.id === "openai" && <Badge variant="outline" className="border-emerald-500/30 text-emerald-300">Video/LLM + voice</Badge>}''')

text = text.replace(
'''          {/* How It Works */}''',
'''          <Card className="border-blue-500/20 bg-blue-500/[0.05]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Info className="h-4 w-4 text-blue-300" />Media API routing</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-xs text-muted-foreground sm:grid-cols-2">
              <div className="rounded-lg border border-white/10 bg-black/20 p-3"><strong className="text-white">Video:</strong> the selected video provider creates the visual render. A connected badge means the encrypted key is stored; Test verifies a newly entered key before saving.</div>
              <div className="rounded-lg border border-white/10 bg-black/20 p-3"><strong className="text-white">Audio:</strong> existing dialogue, ambience, music and soundtrack are preserved. Automatic audio generation runs only when the output contains no audio stream.</div>
              <div className="rounded-lg border border-white/10 bg-black/20 p-3"><strong className="text-white">Replicate:</strong> one saved Replicate key can support both compatible video models and MusicGen soundtrack completion.</div>
              <div className="rounded-lg border border-white/10 bg-black/20 p-3"><strong className="text-white">Privacy:</strong> key inputs are password fields, browser autofill is disabled and keys are encrypted by the server before storage.</div>
            </CardContent>
          </Card>

          {/* How It Works */}''')

path.write_text(text, encoding="utf-8")
print("Completed sound and video API settings UI.")
