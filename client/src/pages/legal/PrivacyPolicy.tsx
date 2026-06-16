import { useLocation } from "wouter";
  import { Button } from "@/components/ui/button";
  import { ArrowLeft, Lock } from "lucide-react";

  export default function PrivacyPolicy() {
    const [, setLocation] = useLocation();
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#07070e] via-[#0c0b18] to-[#07070a]  bg-background text-foreground" style={{ background: 'linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/")} className="mb-8 gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Button>
          <div className="flex items-center gap-3 mb-2">
            <Lock className="h-6 w-6 text-amber-400" />
            <h1 className="text-3xl font-bold tracking-tight text-gold-shimmer">Privacy Policy</h1>
          </div>
          <p className="text-muted-foreground text-sm mb-10">Last updated: June 2026 · Effective immediately</p>

          <div className="prose prose-invert max-w-none space-y-8 text-sm leading-relaxed">

            <section>
              <h2 className="text-lg font-semibold mb-3 gradient-text-gold">1. Information We Collect</h2>
              <p className="text-muted-foreground mb-3">We collect the following categories of information when you use Virelle Studios:</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><strong className="text-foreground">Account information:</strong> Name, email address, password (stored as a bcrypt hash — never in plain text), professional role, and company name where provided.</li>
                <li><strong className="text-foreground">Usage data:</strong> Projects, scenes, characters, generated content, generation history, and in-app actions taken on the Platform.</li>
                <li><strong className="text-foreground">Uploaded content:</strong> Reference photographs, character images, and wardrobe assets you voluntarily upload to the Platform for use in content generation.</li>
                <li><strong className="text-foreground">Payment information:</strong> Processed securely by Stripe. We do not store, access, or retain card numbers, CVV codes, or full payment credentials. We retain only non-sensitive billing metadata (last 4 digits, card type, billing country) as provided by Stripe.</li>
                <li><strong className="text-foreground">Technical data:</strong> IP address, browser type and version, device type, operating system, session tokens, and access timestamps.</li>
                <li><strong className="text-foreground">API credentials:</strong> Third-party API keys you provide (e.g. Runway, ElevenLabs, fal.ai) are encrypted at rest using AES-256 encryption and are never transmitted to or stored on third-party infrastructure beyond the target API service.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3 gradient-text-gold">2. How We Use Your Information</h2>
              <p className="text-muted-foreground mb-3">Your information is used solely for the following purposes:</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>To provide, operate, maintain, and improve the Platform and its features</li>
                <li>To process payments, manage subscriptions, and issue generation credits</li>
                <li>To send transactional communications: account alerts, billing receipts, and service notifications</li>
                <li>To detect, investigate, and prevent fraud, abuse, and policy violations</li>
                <li>To comply with legal obligations, including mandatory reporting requirements under applicable law</li>
                <li>To send marketing communications, <strong className="text-foreground">only with your explicit prior consent</strong>, which you may withdraw at any time</li>
              </ul>
              <p className="text-muted-foreground mt-3">We do not use your content or prompts to train our own AI models without your explicit consent. Your creative inputs are forwarded to third-party AI providers solely to fulfil your generation request.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3 gradient-text-gold">3. Content Moderation and Safety</h2>
              <p className="text-muted-foreground">
                We operate automated content moderation systems that analyse generation inputs and outputs for policy violations. In cases of suspected violations, content and associated account data may be reviewed by our safety team. In cases of Child Sexual Abuse Material (CSAM) or other serious illegal content, we are legally obligated to report to relevant authorities — including the National Center for Missing and Exploited Children (NCMEC) and applicable law enforcement — and will share necessary user data as required to fulfil those obligations. We will not notify the account holder prior to such reports where doing so could compromise a law enforcement investigation.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3 gradient-text-gold">4. Data Sharing</h2>
              <p className="text-muted-foreground mb-3">We do not sell your personal data to third parties. We share data only as follows:</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><strong className="text-foreground">AI generation providers:</strong> Your prompts, reference images, and generation parameters are transmitted to third-party AI services (including OpenAI, Runway ML, ElevenLabs, fal.ai, Google, and others) to fulfil your generation requests. Each provider operates under its own privacy policy and terms of service. We are not responsible for how these providers handle your data once received.</li>
                <li><strong className="text-foreground">Payment processor (Stripe):</strong> Stripe processes all payment transactions. We share only the billing information necessary to complete your transaction. Stripe's privacy policy governs their handling of your payment data.</li>
                <li><strong className="text-foreground">Law enforcement and regulators:</strong> When required by law, court order, or valid legal process, or where we reasonably believe disclosure is necessary to protect the rights, safety, or property of Virelle Studios, its users, or the public.</li>
                <li><strong className="text-foreground">Child protection authorities:</strong> NCMEC and relevant national authorities in cases of suspected CSAM, as required by law.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3 gradient-text-gold">5. Data Retention</h2>
              <p className="text-muted-foreground mb-3">We retain your data for the following periods:</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><strong className="text-foreground">Account data:</strong> Retained for as long as your account is active. Upon account deletion, personal data is removed within 30 days, subject to legal hold obligations.</li>
                <li><strong className="text-foreground">Generated content:</strong> Retained according to your active subscription plan. Content may be deleted upon account cancellation after a 30-day grace period.</li>
                <li><strong className="text-foreground">Payment records:</strong> Retained for 7 years in compliance with applicable financial recordkeeping requirements.</li>
                <li><strong className="text-foreground">Safety and moderation records:</strong> Retained indefinitely where required for legal compliance, law enforcement cooperation, or the protection of minors.</li>
                <li><strong className="text-foreground">Technical logs:</strong> Retained for up to 90 days for security and debugging purposes.</li>
              </ul>
              <p className="text-muted-foreground mt-3">To request deletion of your account and associated personal data, contact <a href="mailto:studiosvirelle@gmail.com" className="text-amber-400 hover:underline">studiosvirelle@gmail.com</a>. We will acknowledge your request within 5 business days.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3 gradient-text-gold">6. Security</h2>
              <p className="text-muted-foreground">
                We implement industry-standard security measures to protect your data, including: encrypted connections (TLS 1.2+), hashed passwords (bcrypt with salt), encrypted API key storage (AES-256), rate limiting, brute-force protection, and automated fraud detection. However, no information system is completely secure and we cannot guarantee the absolute security of your data. In the event of a data breach affecting your personal information, we will notify you in accordance with applicable law.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3 gradient-text-gold">7. Your Rights</h2>
              <p className="text-muted-foreground mb-3">Depending on your jurisdiction, you may have the following rights regarding your personal data:</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><strong className="text-foreground">Access:</strong> Request a copy of the personal data we hold about you.</li>
                <li><strong className="text-foreground">Correction:</strong> Request correction of inaccurate or incomplete data.</li>
                <li><strong className="text-foreground">Deletion:</strong> Request deletion of your personal data, subject to legal retention obligations.</li>
                <li><strong className="text-foreground">Portability:</strong> Request your data in a structured, machine-readable format.</li>
                <li><strong className="text-foreground">Objection / Restriction:</strong> Object to or restrict certain processing of your data.</li>
                <li><strong className="text-foreground">Withdraw consent:</strong> Withdraw consent for marketing communications at any time.</li>
              </ul>
              <p className="text-muted-foreground mt-3">
                Australian users: We comply with the <strong className="text-foreground">Privacy Act 1988 (Cth)</strong> and the Australian Privacy Principles (APPs). European users: We comply with the <strong className="text-foreground">General Data Protection Regulation (GDPR)</strong> to the extent it applies. To exercise any of the above rights, contact <a href="mailto:studiosvirelle@gmail.com" className="text-amber-400 hover:underline">studiosvirelle@gmail.com</a>. We will respond within 30 days.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3 gradient-text-gold">8. Cookies and Tracking Technologies</h2>
              <p className="text-muted-foreground mb-3">We use the following types of cookies and similar technologies:</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><strong className="text-foreground">Essential cookies:</strong> Required for the Platform to function. These include session authentication tokens and security cookies. You cannot opt out of these without ceasing to use the Platform.</li>
                <li><strong className="text-foreground">Functional cookies:</strong> Used to remember your preferences (e.g. language settings, sidebar width, theme). These are stored locally on your device.</li>
                <li><strong className="text-foreground">Analytics cookies:</strong> Used to understand how users interact with the Platform, helping us improve the user experience. Analytics data is aggregated and does not identify individual users.</li>
              </ul>
              <p className="text-muted-foreground mt-3">You may control cookies through your browser settings. Disabling essential cookies will prevent you from using the Platform. We do not use third-party advertising or tracking cookies.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3 gradient-text-gold">9. International Data Transfers</h2>
              <p className="text-muted-foreground">
                Virelle Studios is operated from Australia. When you use the Platform, your data may be transferred to and processed in countries other than your own, including the United States and other jurisdictions where our AI generation providers (such as OpenAI, Runway ML, and ElevenLabs) operate their infrastructure. These transfers are made solely to fulfil your generation requests. We take reasonable steps to ensure that any such transfers are carried out in accordance with applicable privacy law. By using the Platform, you acknowledge and consent to these transfers.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3 gradient-text-gold">10. Children's Privacy</h2>
              <p className="text-muted-foreground">
                Virelle Studios is not directed at children under the age of 13, and we do not knowingly collect personal data from anyone under 13 years of age. Users under 18 must have the consent of a parent or legal guardian before creating an account and must not use the Platform to generate adult-rated or sexually explicit content. If we become aware that we have inadvertently collected personal data from a child under 13, we will delete that data promptly. If you believe we hold data about a minor, please contact <a href="mailto:studiosvirelle@gmail.com" className="text-amber-400 hover:underline">studiosvirelle@gmail.com</a> immediately.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3 gradient-text-gold">11. Changes to This Policy</h2>
              <p className="text-muted-foreground">
                We may update this Privacy Policy from time to time. When we do, we will revise the "Last updated" date at the top of this page and, where the changes are material, we will notify you by email or by a prominent notice on the Platform. Your continued use of the Platform after any changes constitutes your acceptance of the updated policy. We encourage you to review this page periodically.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3 gradient-text-gold">12. Contact</h2>
              <p className="text-muted-foreground">
                For privacy enquiries, data access requests, or to exercise your rights:<br />
                <a href="mailto:studiosvirelle@gmail.com" className="text-amber-400 hover:underline">studiosvirelle@gmail.com</a>
              </p>
              <p className="text-muted-foreground mt-3">
                For legal matters and law enforcement enquiries:<br />
                <a href="mailto:studiosvirelle@gmail.com" className="text-amber-400 hover:underline">studiosvirelle@gmail.com</a>
              </p>
            </section>

          </div>
        </div>
      </div>
    );
  }
  