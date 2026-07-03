import { useLocation } from "wouter";
  import { Button } from "@/components/ui/button";
  import { ArrowLeft, Cpu, AlertTriangle, Shield } from "lucide-react";

  export default function AIContentPolicy() {
    const [, setLocation] = useLocation();
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#07070e] via-[#0c0b18] to-[#07070a]  bg-background text-foreground" style={{ background: 'linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/")} className="mb-8 gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Button>
          <div className="flex items-center gap-3 mb-2">
            <Cpu className="h-6 w-6 text-amber-400" />
            <h1 className="text-3xl font-bold tracking-tight text-gold-shimmer">AI Content Policy</h1>
          </div>
          <p className="text-muted-foreground text-sm mb-10">Last updated: June 2026 · Effective immediately</p>

          {/* Key disclaimer */}
          <div className="p-5 rounded-xl bg-amber-600/10 border border-amber-500/30 mb-10">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-amber-300 font-bold text-xs uppercase tracking-wider mb-2">Platform Disclaimer</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Virelle Studios provides access to third-party AI generation services as a production orchestration layer. We do not generate content ourselves. <strong className="text-foreground">You, the Director, are solely and exclusively responsible for all content you create, direct, publish, or distribute using this Platform.</strong> No aspect of AI involvement in content creation transfers, reduces, or diminishes your legal responsibility for that content.
                </p>
              </div>
            </div>
          </div>

          <div className="prose prose-invert max-w-none space-y-8 text-sm leading-relaxed">

            <section>
              <h2 className="text-lg font-semibold mb-3 gradient-text-gold">1. Ownership and Copyright of AI-Generated Content</h2>
              <p className="text-muted-foreground">
                Content generated through Virelle Studios is produced by third-party AI models (including but not limited to Runway, fal.ai, Google, OpenAI, and ElevenLabs). The copyright status of AI-generated content is an evolving and unsettled area of law that varies significantly by jurisdiction. Virelle Studios makes no representation or warranty regarding the copyright ownership, registrability, or enforceability of any AI-generated output.
              </p>
              <p className="text-muted-foreground mt-3">
                Subject to your active subscription plan and compliance with these Terms, Virelle Studios grants you a licence to use generated outputs for your stated purposes. <strong className="text-foreground">You are solely responsible for</strong> understanding the copyright implications of AI-generated content in your jurisdiction before commercialising, distributing, broadcasting, or otherwise exploiting any output.
              </p>
              <p className="text-muted-foreground mt-3">
                Virelle Studios expressly disclaims all liability arising from any copyright claim, challenge, or dispute relating to AI-generated content produced on the Platform. All such liability rests entirely with you.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3 gradient-text-gold">2. No Guarantee of Output Quality or Availability</h2>
              <p className="text-muted-foreground">
                AI generation outputs are produced by third-party services and are inherently variable. Virelle Studios makes no warranty — express, implied, or otherwise — regarding the quality, accuracy, consistency, resolution, aesthetic standard, or fitness for purpose of any AI-generated content. Generation results may vary between runs using identical prompts. Third-party providers may independently restrict, modify, or refuse to generate certain content at any time without notice.
              </p>
              <p className="text-muted-foreground mt-3">
                Virelle Studios is not liable for generation failures, degraded output quality, provider outages, or changes to third-party AI model capabilities. Credits consumed in failed or unsatisfactory generations are subject to our Credits and Refunds policy as outlined in the Terms of Service.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3 gradient-text-gold">3. AI Minor Protection System</h2>
              <p className="text-muted-foreground mb-3">
                Virelle Studios operates a mandatory AI Minor Protection system. When a character is identified as a minor (under 18 years of age) based on their age range setting, and the scene context involves potentially sensitive situations, the system automatically:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Injects cinematic modesty directives into the AI generation prompt</li>
                <li>Applies context-appropriate visual protections (e.g. appropriate swimwear framing for beach scenes, robes for changing scenes)</li>
                <li>Enforces above-shoulder camera angles and wide establishing shots in sensitive contexts</li>
                <li>Adds explicit negative prompt directives to prevent any exposure of minor characters</li>
              </ul>
              <p className="text-muted-foreground mt-3">
                This system is mandatory and cannot be disabled, bypassed, or circumvented by any user, regardless of subscription tier. Any attempt to circumvent this system constitutes a serious violation of our Acceptable Use Policy and will result in immediate account suspension and safety review.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3 gradient-text-gold">4. Character Reference Images and Face DNA</h2>
              <p className="text-muted-foreground">
                When you upload a reference photograph to create a character, the Platform transmits that image to third-party AI providers to maintain visual consistency across generated scenes. By uploading any photograph, you confirm that:
              </p>
              <ul className="list-disc pl-6 mt-3 space-y-2 text-muted-foreground">
                <li>You own the photograph or have been granted explicit permission to use it for this purpose by the image owner</li>
                <li>You have obtained written consent from the person depicted to use their likeness on this Platform and in any content you generate and distribute</li>
                <li>You accept full legal responsibility for any right of publicity, privacy, or intellectual property claim arising from your use of that image</li>
              </ul>
              <p className="text-muted-foreground mt-3">
                The Platform does not store biometric templates or face recognition data. Reference images are used solely to guide visual consistency in AI generation prompts and are not used for any other purpose.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3 gradient-text-gold">5. Automated Content Moderation</h2>
              <p className="text-muted-foreground mb-3">
                All generation inputs and outputs are subject to automated moderation. The moderation system scans for policy violations including:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Child sexual abuse material (CSAM) — zero tolerance, immediate account termination and mandatory reporting</li>
                <li>Non-consensual intimate imagery</li>
                <li>Violent extremist and terrorism content</li>
                <li>Targeted harassment and credible threats</li>
              </ul>
              <p className="text-muted-foreground mt-3">
                Detected violations trigger immediate account freezing and escalation to our safety team. In cases involving CSAM, accounts are permanently terminated without appeal and the matter is reported to NCMEC and relevant law enforcement without delay. False positives may be appealed by contacting <a href="mailto:studiosvirelle@gmail.com" className="text-amber-400 hover:underline">studiosvirelle@gmail.com</a>. We aim to respond to appeals within 3 business days.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3 gradient-text-gold">6. Third-Party AI Provider Policies</h2>
              <p className="text-muted-foreground">
                All content generated through Virelle Studios is also subject to the content policies of the underlying AI providers (including OpenAI, Runway ML, ElevenLabs, fal.ai, Google, and others). These providers may independently refuse to generate certain content, apply their own safety filters, or modify their policies at any time without notice to Virelle Studios or to you. Virelle Studios has no control over, and accepts no liability for, content refused, filtered, or modified by third-party AI providers.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3 gradient-text-gold">7. Disclosure Obligations</h2>
              <p className="text-muted-foreground">
                When distributing, publishing, or broadcasting AI-generated content produced on Virelle Studios, you are solely responsible for complying with all applicable AI content disclosure requirements in the jurisdictions in which the content is distributed. Some jurisdictions require disclosure that content is AI-generated, particularly for political advertising, news media, or content specifically designed to deceive. Virelle Studios is not responsible for your compliance with such requirements.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3 gradient-text-gold">8. Contact</h2>
              <p className="text-muted-foreground">
                For AI content policy questions or to appeal a moderation decision: <a href="mailto:studiosvirelle@gmail.com" className="text-amber-400 hover:underline">studiosvirelle@gmail.com</a>
              </p>
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
        </div>
      </div>
    );
  }
  