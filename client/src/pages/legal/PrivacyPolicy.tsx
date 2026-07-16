import VSWatermark from "@/components/VSWatermark";
import { useLocation } from "wouter";
  import { Button } from "@/components/ui/button";
  import { ArrowLeft, Lock, Eye, Shield, Trash2, Database, Mail, Globe, CheckCircle2, AlertCircle } from "lucide-react";
    import LeegoFooterLaunch from "@/components/LeegoFooterLaunch";

  export default function PrivacyPolicy() {
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
              <Lock className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gold-shimmer">Privacy Policy</h1>
              <p className="text-muted-foreground text-sm mt-0.5">Last updated: July 17, 2026 · Effective immediately upon account creation</p>
            </div>
          </div>

          {/* Quick answers to common questions */}
          <div className="mt-6 mb-10 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { q: "Are my projects private?", a: "Yes — private by default. Only you can see your projects unless you publish them." },
              { q: "Who owns what I create?", a: "You do. We claim no rights over your content." },
              { q: "Do you sell my data?", a: "No. We never sell personal data to third parties." },
              { q: "Can I delete my account?", a: "Yes. Email us and we'll remove your data within 30 days." },
            ].map(({ q, a }) => (
              <div key={q} className="rounded-lg border border-amber-500/15 bg-zinc-900/40 p-4">
                <p className="font-semibold text-foreground text-xs mb-1 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3 w-3 text-amber-400 shrink-0" />{q}
                </p>
                <p className="text-xs text-muted-foreground">{a}</p>
              </div>
            ))}
          </div>

          <div className="space-y-10 text-sm leading-relaxed text-muted-foreground">

            <section>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 gradient-text-gold">
                <Database className="w-4 h-4 text-amber-400" />
                1. Information We Collect
              </h2>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong className="text-foreground">Account information:</strong> Name, email address, password (stored as a bcrypt hash — never in plain text), professional role, and company name where provided.</li>
                <li><strong className="text-foreground">Usage data:</strong> Projects, scenes, characters, generated content, generation history, and in-app actions you take on the platform.</li>
                <li><strong className="text-foreground">Uploaded content:</strong> Reference photographs, character images, and wardrobe assets you voluntarily upload for use in content generation.</li>
                <li><strong className="text-foreground">Payment information:</strong> Processed securely by Stripe. We do not store, access, or retain card numbers, CVV codes, or full payment credentials. We retain only non-sensitive billing metadata (last 4 digits, card type, billing country) as provided by Stripe.</li>
                <li><strong className="text-foreground">Technical data:</strong> IP address, browser type and version, device type, operating system, session tokens, and access timestamps.</li>
                <li><strong className="text-foreground">API credentials (BYOK):</strong> Third-party API keys you provide (e.g. Runway, ElevenLabs, fal.ai) are encrypted at rest using AES-256 encryption and are never transmitted to or stored on third-party infrastructure beyond the target API service.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 gradient-text-gold">
                <Lock className="w-4 h-4 text-amber-400" />
                2. Project Privacy
              </h2>
              <p>
                All projects you create on Virelle Studios are <strong className="text-foreground">private by default</strong>. Your scripts, scenes, characters, uploaded references, and generated outputs are not accessible to other users or the public unless you take one of the following actions:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-3">
                <li>You publish a project to the public showcase — this makes the title, genre, and public thumbnail visible to other users.</li>
                <li>You generate a share link — this grants view-only access to anyone with the link until the link is revoked.</li>
                <li>You invite team collaborators (Industry plan) — collaborators have access only to the specific project you invite them to.</li>
              </ul>
              <p className="mt-3">Our team does not access your project content for any purpose other than automated safety checks (described in Section 5) or when required by law.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 gradient-text-gold">
                <Eye className="w-4 h-4 text-amber-400" />
                3. How We Use Your Information
              </h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>To provide, operate, maintain, and improve the platform and its features.</li>
                <li>To process payments, manage subscriptions, and issue generation credits.</li>
                <li>To send transactional communications: account alerts, billing receipts, and service notifications.</li>
                <li>To detect, investigate, and prevent fraud, abuse, and policy violations.</li>
                <li>To comply with legal obligations, including mandatory reporting requirements under applicable law.</li>
                <li>To send marketing communications, <strong className="text-foreground">only with your explicit prior consent</strong>, which you may withdraw at any time.</li>
              </ul>
              <p className="mt-3">
                <strong className="text-foreground">We do not use your content or prompts to train our own AI models</strong> without your explicit written consent. Your creative inputs are forwarded to third-party AI providers solely to fulfil your specific generation request.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 gradient-text-gold">
                <Globe className="w-4 h-4 text-amber-400" />
                4. Data Sharing
              </h2>
              <p className="mb-3">We do not sell your personal data to third parties. We share data only as follows:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong className="text-foreground">AI generation providers:</strong> Your prompts, reference images, and generation parameters are transmitted to third-party AI services (including OpenAI, Google, Pollinations, Runway ML, ElevenLabs, and fal.ai) to fulfil your generation requests. Each provider operates under its own privacy policy. We are not responsible for how these providers handle your data once received.</li>
                <li><strong className="text-foreground">TitanAI (self-hosted):</strong> Some requests may be routed to TitanAI, a model we operate ourselves rather than a third-party AI service. TitanAI runs on GPU infrastructure we rent from providers such as Vast.ai — your prompt is processed on that rented hardware under our control, not sent to Vast.ai as a data recipient in its own right.</li>
                <li><strong className="text-foreground">Payment processor (Stripe):</strong> Stripe processes all payment transactions. Stripe's privacy policy governs their handling of your payment data.</li>
                <li><strong className="text-foreground">Law enforcement and regulators:</strong> When required by law, court order, or valid legal process.</li>
                <li><strong className="text-foreground">Child protection authorities:</strong> NCMEC and relevant national authorities in cases of suspected CSAM, as required by law.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 gradient-text-gold">
                <Shield className="w-4 h-4 text-amber-400" />
                4a. Mobile App Permissions
              </h2>
              <p className="mb-3">Our Android and iOS apps (Virelle Studios and Swappys) may request the following device permissions, used only for the features described:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong className="text-foreground">Camera</strong> — for live preview and recording when creating content.</li>
                <li><strong className="text-foreground">Microphone</strong> — for recording audio clips you choose to include.</li>
                <li><strong className="text-foreground">Photos/media library</strong> — to let you select source or reference media, and to save content you choose to export.</li>
              </ul>
              <p className="mt-3">We do not request access to your contacts, SMS messages, call log, or precise or approximate device location.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 gradient-text-gold">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                5. Content Moderation
              </h2>
              <p>
                We operate automated content moderation systems that analyse generation inputs and outputs for policy violations. In cases of suspected violations, content and associated account data may be reviewed by our safety team. In cases of Child Sexual Abuse Material (CSAM) or other serious illegal content, we are legally obligated to report to relevant authorities — including the National Center for Missing and Exploited Children (NCMEC) and applicable law enforcement — and will share necessary user data as required by law.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 gradient-text-gold">
                <Database className="w-4 h-4 text-amber-400" />
                6. Data Retention
              </h2>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong className="text-foreground">Account data:</strong> Retained for as long as your account is active. Upon deletion, personal data is removed within 30 days, subject to legal hold obligations.</li>
                <li><strong className="text-foreground">Generated content:</strong> Retained according to your active subscription plan. Content may be deleted after a 30-day grace period following account cancellation.</li>
                <li><strong className="text-foreground">Payment records:</strong> Retained for 7 years in compliance with applicable financial recordkeeping requirements.</li>
                <li><strong className="text-foreground">Safety and moderation records:</strong> Retained indefinitely where required for legal compliance or the protection of minors.</li>
                <li><strong className="text-foreground">Technical logs:</strong> Retained for up to 90 days for security and debugging purposes.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 gradient-text-gold">
                <Trash2 className="w-4 h-4 text-amber-400" />
                7. Your Rights — Account & Data Deletion
              </h2>
              <p>You have the right to:</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li><strong className="text-foreground">Access your data:</strong> Request a copy of the personal data we hold about you.</li>
                <li><strong className="text-foreground">Correct your data:</strong> Update or correct inaccurate information from your account settings or by contacting us.</li>
                <li><strong className="text-foreground">Delete your account:</strong> Request full deletion of your account and associated personal data. We will acknowledge within 5 business days and complete deletion within 30 days, except where retention is required by law or to resolve an open dispute.</li>
                <li><strong className="text-foreground">Withdraw consent:</strong> Withdraw consent for marketing communications at any time using the unsubscribe link in any email, or by contacting us.</li>
                <li><strong className="text-foreground">Portability:</strong> Request your project data in a portable format where technically feasible.</li>
              </ul>
              <p className="mt-3">
                To exercise any of these rights, email <a href="mailto:studiosvirelle@gmail.com" className="text-amber-400 hover:underline">studiosvirelle@gmail.com</a> from the email address associated with your account.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 gradient-text-gold">
                <Shield className="w-4 h-4 text-amber-400" />
                8. Security
              </h2>
              <p>
                We use industry-standard security measures including TLS encryption for all data in transit, AES-256 encryption for API credentials at rest, bcrypt password hashing, and session token rotation on login. Access to production systems is restricted to authorised personnel and protected by multi-factor authentication.
              </p>
              <p className="mt-3">No system is completely secure. If you believe your account has been compromised, contact us immediately at <a href="mailto:studiosvirelle@gmail.com" className="text-amber-400 hover:underline">studiosvirelle@gmail.com</a>.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 gradient-text-gold">
                <Globe className="w-4 h-4 text-amber-400" />
                9. International Data Transfers
              </h2>
              <p>
                Virelle Studios operates internationally. Your data may be stored and processed in Australia, the United States, or other countries where our service providers operate. By using the platform, you consent to these transfers. We take reasonable steps to ensure that any international transfers comply with applicable data protection law.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 gradient-text-gold">
                <Mail className="w-4 h-4 text-amber-400" />
                10. Contact & Privacy Questions
              </h2>
              <p>For all privacy-related questions, requests, or concerns, contact:</p>
              <div className="mt-3 rounded-lg border border-amber-500/15 bg-zinc-900/40 p-4">
                <p className="text-foreground font-semibold">Virelle Studios — Privacy</p>
                <a href="mailto:studiosvirelle@gmail.com" className="text-amber-400 hover:underline">studiosvirelle@gmail.com</a>
              </div>
              <p className="mt-3">We will respond to all privacy requests within 5 business days.</p>
            </section>

              <section>
                <h2 className="text-lg font-semibold mb-3 gradient-text-gold">Governing Law &amp; Jurisdiction</h2>
                <p className="text-muted-foreground">
                  These terms are governed by and construed in accordance with the laws of{" "}
                  <strong className="text-foreground">Victoria, Australia</strong>, and the
                  Commonwealth of Australia. Virelle Studios is established in Melbourne, Australia.
                  Any dispute arising under this policy shall be subject to the non-exclusive
                  jurisdiction of the courts of Victoria, Australia.
                </p>
                <p className="text-muted-foreground mt-3">
                  These terms are subject to the{" "}
                  <strong className="text-foreground">Australian Consumer Law</strong>{" "}
                  (Schedule&nbsp;2, Competition and Consumer Act 2010 (Cth)). Nothing herein
                  excludes, restricts, or modifies any right or remedy you may have under the
                  Australian Consumer Law or other mandatory consumer protection laws applicable
                  to you. Where both parties are located outside Australia, the laws of England
                  and Wales apply as a secondary governing law.
                </p>
              </section>

  
          </div>

          <div className="mt-12 p-5 rounded-xl bg-zinc-900/50 border border-amber-500/15 text-xs text-muted-foreground">
            <p>This Privacy Policy may be updated from time to time. We will notify registered users of material changes by email or in-app notification. Continued use of the platform after changes constitutes acceptance of the updated policy.</p>
          </div>
        </div>
        <LeegoFooterLaunch />
      </div>
    );
  }
  