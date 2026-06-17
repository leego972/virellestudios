import VSWatermark from "@/components/VSWatermark";
import { useLocation } from "wouter";
  import { Button } from "@/components/ui/button";
  import { ArrowLeft, Cpu, Eye, Lock, Shield, AlertCircle, CheckCircle2, Users, FileText, Zap } from "lucide-react";
    import LeegoFooterLaunch from "@/components/LeegoFooterLaunch";

  export default function AIUsePolicy() {
    const [, setLocation] = useLocation();

    return (
      <div className="min-h-screen text-foreground relative" style={{ background: "linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)" }}>
        <VSWatermark />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/")} className="mb-8 gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Button>

          <div className="flex items-center gap-4 mb-3">
            <div className="w-12 h-12 rounded-xl bg-amber-600/20 flex items-center justify-center shrink-0">
              <Cpu className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gold-shimmer">AI Use Policy</h1>
              <p className="text-muted-foreground text-sm mt-0.5">Last updated: June 2026 · Effective immediately</p>
            </div>
          </div>

          {/* Disclosure notice */}
          <div className="mt-6 mb-10 p-5 rounded-xl bg-amber-600/10 border border-amber-500/30">
            <div className="flex items-start gap-3">
              <Cpu className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-amber-300 font-bold text-sm uppercase tracking-wider mb-2">AI Generation Disclosure</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Virelle Studios is an AI-assisted production platform. Content generated on this platform — including scripts, images, video scenes, voiceovers, and music — is produced using artificial intelligence. You direct the AI; the AI executes. You are the creative director, and you bear full responsibility for the content you produce and publish.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-10 text-sm leading-relaxed text-muted-foreground">

            {/* 1. What AI Is Used For */}
            <section>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 gradient-text-gold">
                <Cpu className="w-4 h-4 text-amber-400" />
                1. What AI Is Used For on Virelle Studios
              </h2>
              <p>Virelle Studios uses AI to assist with the following production tasks on your behalf:</p>
              <ul className="list-disc pl-6 space-y-2 mt-3">
                <li><strong className="text-foreground">Screenplay development:</strong> AI assists in expanding story ideas into structured scripts with scenes, dialogue, and character voices, based on your inputs and creative direction.</li>
                <li><strong className="text-foreground">Scene and image generation:</strong> AI models generate visual storyboard frames and scene images based on your scene descriptions, mood settings, and art direction.</li>
                <li><strong className="text-foreground">Video generation:</strong> AI video models render short scene clips based on your prompts and visual references.</li>
                <li><strong className="text-foreground">Voice acting:</strong> AI voice synthesis generates character dialogue in the emotion, tone, and language you specify.</li>
                <li><strong className="text-foreground">Music and score:</strong> AI composes background music and score cues based on your selected mood, genre, and duration.</li>
                <li><strong className="text-foreground">Post-production assistance:</strong> AI suggests ADR lines, Foley cues, colour grading styles, and subtitle translations based on your content.</li>
                <li><strong className="text-foreground">Production planning:</strong> AI assists with shot lists, continuity checking, budget estimation, location scouting suggestions, and pitch deck generation.</li>
              </ul>
              <p className="mt-3">AI on Virelle does not make creative decisions on your behalf without your instruction. Every generation is initiated by you and governed by your inputs.</p>
            </section>

            {/* 2. AI Providers */}
            <section>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 gradient-text-gold">
                <Zap className="w-4 h-4 text-amber-400" />
                2. AI Providers We Use
              </h2>
              <p>To fulfil your generation requests, Virelle Studios transmits your prompts, parameters, and reference materials to the following third-party AI providers:</p>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { name: "OpenAI (GPT-4.1)", purpose: "Script writing, dialogue, chat assistant, story development" },
                  { name: "Google Gemini 2.5 Flash", purpose: "Script development, continuity checks, analysis" },
                  { name: "Runway ML", purpose: "Scene video generation" },
                  { name: "fal.ai", purpose: "Image and video generation" },
                  { name: "Google Veo 3", purpose: "Video scene generation" },
                  { name: "ElevenLabs", purpose: "AI voice acting, speech synthesis" },
                  { name: "Suno AI", purpose: "AI film score and music composition" },
                  { name: "DALL-E 3 HD", purpose: "Storyboard frames and image generation" },
                ].map(({ name, purpose }) => (
                  <div key={name} className="rounded-lg border border-amber-500/15 bg-zinc-900/40 p-3">
                    <p className="font-semibold text-foreground text-xs mb-0.5">{name}</p>
                    <p className="text-xs text-muted-foreground">{purpose}</p>
                  </div>
                ))}
              </div>
              <p className="mt-4">Each provider operates under its own terms of service and privacy policy. Virelle Studios is not responsible for how these providers handle your data once it is received. We transmit only what is necessary to fulfil your specific generation request.</p>
            </section>

            {/* 3. Your Content & Ownership */}
            <section>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 gradient-text-gold">
                <CheckCircle2 className="w-4 h-4 text-amber-400" />
                3. Who Owns AI-Generated Content
              </h2>
              <p>
                You own the outputs of every generation you initiate on Virelle Studios. This includes scripts, images, video scenes, voiceovers, music, storyboards, shot lists, pitch decks, and any other content produced by the platform in response to your inputs.
              </p>
              <p className="mt-3">
                Virelle Studios does not claim ownership of, licensing rights to, or royalties from content you generate. We do not use your generated content in our own marketing, training datasets, or third-party services without your explicit written consent.
              </p>
              <p className="mt-3">
                <strong className="text-foreground">Commercial use:</strong> You may use AI-generated content for commercial purposes — including distribution, broadcast, licensing, and monetisation — subject to the terms of your active subscription plan. Commercial rights are included on all self-serve plans (Indie, Creator, Industry). The Industry plan additionally includes an explicit commercial licence for Signature Cast actor likenesses.
              </p>
              <p className="mt-3">
                Ownership of AI-generated content is subject to the laws of your jurisdiction. Copyright law regarding AI-generated works varies by country and is still evolving. Virelle Studios does not provide legal advice and recommends consulting a qualified IP attorney in your jurisdiction if you require certainty about the commercial or legal status of AI-generated content.
              </p>
            </section>

            {/* 4. Project Privacy */}
            <section>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 gradient-text-gold">
                <Lock className="w-4 h-4 text-amber-400" />
                4. Project Privacy
              </h2>
              <p>
                All projects you create on Virelle Studios are <strong className="text-foreground">private by default</strong>. Your project content — including scripts, characters, scenes, uploaded references, and generated outputs — is not visible to other users, the public, or our team, except in the following circumstances:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-3">
                <li>You explicitly choose to publish a project to the public showcase.</li>
                <li>You share a project using a share link, which grants view-only access to the recipient.</li>
                <li>Our safety team reviews content flagged by automated moderation for potential policy violations.</li>
                <li>We are required to disclose content by law, court order, or valid legal process.</li>
              </ul>
              <p className="mt-3">Team collaboration (Industry plan) grants access only to team members you explicitly invite. Collaboration access can be revoked at any time from your project settings.</p>
            </section>

            {/* 5. AI Training */}
            <section>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 gradient-text-gold">
                <Shield className="w-4 h-4 text-amber-400" />
                5. We Do Not Train on Your Content
              </h2>
              <p>
                Virelle Studios does not use your prompts, generated content, uploaded reference images, or project data to train, fine-tune, or improve our own AI models or those of third parties without your explicit written consent.
              </p>
              <p className="mt-3">
                Third-party AI providers (listed in Section 2) may have their own data use policies regarding content transmitted to their APIs. We recommend reviewing the terms of each provider if this is a concern for your production.
              </p>
            </section>

            {/* 6. Content Responsibility */}
            <section>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 gradient-text-gold">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                6. Your Responsibility for AI-Directed Content
              </h2>
              <p>
                You are responsible for the prompts and instructions you provide to AI systems on this platform. You are the director — the AI does not independently choose what to generate. Content that violates our{" "}
                <button onClick={() => setLocation("/acceptable-use")} className="text-amber-400 hover:underline">Acceptable Use Policy</button>{" "}
                or{" "}
                <button onClick={() => setLocation("/terms")} className="text-amber-400 hover:underline">Terms of Service</button>{" "}
                may result in account suspension regardless of whether it was AI-generated or human-created.
              </p>
              <p className="mt-3">
                If AI output is unexpected, harmful, or not what you intended, do not publish or distribute it. Report it to <a href="mailto:studiosvirelle@gmail.com" className="text-amber-400 hover:underline">studiosvirelle@gmail.com</a> so we can investigate and improve our safety systems.
              </p>
            </section>

            {/* 7. Labelling AI Content */}
            <section>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 gradient-text-gold">
                <Eye className="w-4 h-4 text-amber-400" />
                7. Disclosing AI-Generated Content to Audiences
              </h2>
              <p>
                Some jurisdictions and platforms are introducing requirements to label AI-generated content. Virelle Studios encourages responsible disclosure — if you publish AI-generated films, trailers, or images to audiences, consider labelling them as AI-assisted or AI-generated.
              </p>
              <p className="mt-3">
                Virelle Studios is not responsible for ensuring compliance with specific platform rules (e.g. YouTube, Meta, TikTok) regarding AI content disclosure. You are responsible for complying with the terms of any platform where you publish content generated on Virelle Studios.
              </p>
            </section>

            {/* 8. Generation Failures */}
            <section>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 gradient-text-gold">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                8. When AI Generation Fails
              </h2>
              <p>
                AI generation can fail due to provider outages, safety filters triggered by your input, network interruptions, or model limitations. When a generation fails and no output is delivered, your credits are automatically restored within 24 hours.
              </p>
              <p className="mt-3">
                Virelle Studios does not guarantee that any specific AI model will be available at any time or that any specific generation will produce output matching your expectations. AI generation is probabilistic — results vary based on prompt phrasing, model availability, and provider performance.
              </p>
              <p className="mt-3">
                See our <button onClick={() => setLocation("/refund-policy")} className="text-amber-400 hover:underline">Refund & Credit Policy</button> for details on credit restoration for failed generations.
              </p>
            </section>

          </div>

          <div className="mt-12 p-5 rounded-xl bg-zinc-900/50 border border-amber-500/15 text-xs text-muted-foreground">
            <p>Questions? Contact <a href="mailto:studiosvirelle@gmail.com" className="text-amber-400 hover:underline">studiosvirelle@gmail.com</a>. This policy is reviewed periodically. Continued use of the platform after changes constitutes acceptance of the updated policy.</p>
          </div>
        </div>
        <LeegoFooterLaunch />
      </div>
    );
  }
  