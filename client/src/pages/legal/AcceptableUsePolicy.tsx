import { useLocation } from "wouter";
  import { Button } from "@/components/ui/button";
  import { ArrowLeft, AlertTriangle, Shield, CheckCircle2 } from "lucide-react";

  export default function AcceptableUsePolicy() {
    const [, setLocation] = useLocation();
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#07070e] via-[#0c0b18] to-[#07070a]  bg-background text-foreground" style={{ background: 'linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/")} className="mb-8 gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Button>
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="h-6 w-6 text-amber-400" />
            <h1 className="text-3xl font-bold tracking-tight text-gold-shimmer">Acceptable Use Policy</h1>
          </div>
          <p className="text-muted-foreground text-sm mb-10">Last updated: June 2026 · Effective immediately</p>

          <div className="prose prose-invert max-w-none space-y-8 text-sm leading-relaxed">

            {/* Platform as Tool Notice */}
            <div className="p-5 rounded-xl bg-amber-600/10 border border-amber-500/30 mb-8">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-amber-300 font-bold text-sm uppercase tracking-wider mb-2">Director's Responsibility</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Virelle Studios is a creative production tool — not a publisher, broadcaster, or content owner. You are the Director. You bear <strong className="text-foreground">full, sole, and exclusive legal responsibility</strong> for every piece of content you create, direct, or generate using this Platform. This responsibility cannot be transferred to Virelle Studios on the basis that content was AI-generated. You directed the AI; you own the legal outcome.
                  </p>
                </div>
              </div>
            </div>

            <section>
              <h2 className="text-lg font-semibold mb-3 gradient-text-gold">1. Overview</h2>
              <p className="text-muted-foreground">
                This Acceptable Use Policy ("AUP") governs what you may and may not do with Virelle Studios (the "Platform"). By creating an account and using the Platform, you agree to comply with this AUP in full. Violations may result in immediate account suspension or permanent termination, and may be referred to law enforcement where required by law or where we determine it is appropriate to do so.
              </p>
              <p className="text-muted-foreground mt-3">
                This AUP is incorporated into and must be read alongside our <button onClick={() => setLocation("/terms")} className="text-amber-400 hover:underline">Terms of Service</button>, <button onClick={() => setLocation("/ai-content-policy")} className="text-amber-400 hover:underline">AI Content Policy</button>, and <button onClick={() => setLocation("/ip-policy")} className="text-amber-400 hover:underline">IP &amp; DMCA Policy</button>.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3 gradient-text-gold">2. Permitted Uses</h2>
              <p className="text-muted-foreground mb-3">The Platform is provided for legitimate creative and professional production purposes, including:</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" /><span>Creating original fictional films, short films, and episodic video content</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" /><span>Generating AI-assisted VFX scenes for integration into live-action productions</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" /><span>Creating music videos, commercials, branded content, and promotional materials</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" /><span>Educational, research, and academic projects involving AI-assisted film production</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" /><span>Personal creative projects and artistic expression within the bounds of this AUP</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" /><span>Professional film production where all required consents, licences, and permissions have been obtained by you</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" /><span>Prototyping, pre-visualisation, and concept development for larger productions</span></li>
              </ul>
              <p className="text-muted-foreground mt-3 font-medium">All permitted uses remain subject to your sole legal responsibility for the content produced and its downstream use.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3 gradient-text-gold">3. Zero-Tolerance Prohibitions</h2>
              <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4 mb-4">
                <p className="text-red-400 font-semibold mb-2 text-xs uppercase tracking-wider">Immediate Permanent Termination — No Appeal</p>
                <p className="text-muted-foreground">The following violations will result in immediate permanent account termination, IP ban, and mandatory reporting to NCMEC and/or relevant law enforcement without prior notice:</p>
              </div>
              <ul className="list-disc pl-6 space-y-3 text-muted-foreground">
                <li>
                  <strong className="text-foreground">Child Sexual Abuse Material (CSAM):</strong> The generation, attempted generation, solicitation, or facilitation of any sexually explicit content depicting minors — whether real or fictitious, AI-generated or otherwise — is a criminal offence in most jurisdictions. We report all violations immediately to NCMEC and relevant law enforcement. There is no appeal process for this category of violation.
                </li>
                <li>
                  <strong className="text-foreground">Non-consensual intimate imagery ("deepfake pornography"):</strong> Generating sexually explicit content depicting real, identifiable individuals without their explicit, documented written consent is strictly prohibited, regardless of whether the output is presented as fictional.
                </li>
                <li>
                  <strong className="text-foreground">Terrorism and violent extremist propaganda:</strong> Content that constitutes terrorism propaganda, radicalisation material, or recruitment content as defined under applicable law. This prohibition does not restrict fictional action films, thriller narratives featuring terrorist antagonists, or dramatic re-enactments of historical events — only material that meets the legal definition of propaganda or recruitment content.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3 gradient-text-gold">4. General Prohibitions</h2>
              <p className="text-muted-foreground mb-3">The following uses are prohibited and may result in suspension, termination, and/or legal action:</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Generating content that defames, harasses, or threatens specific individuals or groups</li>
                <li>Creating disinformation, deliberately misleading content, or synthetic media designed to deceive the public when presented as factual</li>
                <li>Generating content that infringes third-party intellectual property rights, including copyright, trade mark, and rights of publicity</li>
                <li>Using real persons' faces, names, likenesses, or voices without obtaining all required written consents (see Terms of Service Section 4)</li>
                <li>Attempting to circumvent, disable, or bypass content moderation systems, safety filters, or the AI Minor Protection system</li>
                <li>Using the Platform for any purpose that is unlawful in your jurisdiction or the jurisdiction of Virelle Studios</li>
                <li>Sharing account credentials, reselling access, or granting Platform access to third parties outside your authorised subscription</li>
                <li>Automated scraping, bulk generation, or programmatic use of the Platform without a commercial API licence</li>
                <li>Uploading malware, scripts, or code intended to harm the Platform or its infrastructure</li>
                <li>Impersonating any person, company, or organisation in a misleading or harmful manner</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3 gradient-text-gold">5. AI Minor Protection System</h2>
              <p className="text-muted-foreground">
                Our platform operates a mandatory AI Minor Protection system. When a character is identified as a minor (under 18 years of age) and the scene context involves potentially sensitive situations, the system automatically applies cinematic modesty directives, restricts camera angles, and enforces protective generation parameters. This system operates at the platform level and cannot be disabled, bypassed, or overridden by any user. Any attempt to circumvent the AI Minor Protection system is a violation of this AUP and will result in immediate account suspension pending safety review.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3 gradient-text-gold">6. No Liability for User Misuse</h2>
              <p className="text-muted-foreground">
                Virelle Studios expressly disclaims all liability for any misuse of the Platform by users. Virelle Studios is not responsible for, and shall not be held liable in connection with, any content generated, distributed, or published by users — including content that infringes third-party rights, violates applicable law, or causes harm to any person or entity. All such liability rests entirely and exclusively with the Director who created, directed, or published the content in question.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3 gradient-text-gold">7. Reporting Violations</h2>
              <p className="text-muted-foreground">
                To report a violation of this AUP, contact us at <a href="mailto:studiosvirelle@gmail.com" className="text-amber-400 hover:underline">studiosvirelle@gmail.com</a> with as much detail as possible, including any supporting evidence. For urgent child safety concerns, contact NCMEC directly at 1-800-THE-LOST or <a href="https://www.cybertipline.org" className="text-amber-400 hover:underline" target="_blank" rel="noopener noreferrer">CyberTipline.org</a>. All reports are treated confidentially.
              </p>
            </section>

          </div>
        </div>
      </div>
    );
  }
  