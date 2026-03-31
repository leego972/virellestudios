import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, AlertTriangle, FileText, Scale, User, MapPin, Film, Copyright, CreditCard, Mail } from "lucide-react";
import GoldWatermarkLaunch from "@/components/GoldWatermarkLaunch";
import LeegoFooterLaunch from "@/components/LeegoFooterLaunch";

export default function TermsOfService() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      <GoldWatermarkLaunch />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 relative z-10">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/")} className="mb-8 gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Button>

        <div className="flex items-center gap-4 mb-3">
          <div className="w-12 h-12 rounded-xl bg-amber-600/20 flex items-center justify-center shrink-0">
            <Shield className="h-6 w-6 text-amber-500" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Terms of Service</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Last updated: March 2026 &mdash; Effective immediately upon account creation
            </p>
          </div>
        </div>

        {/* Director Liability Banner */}
        <div className="mt-6 mb-10 p-5 rounded-xl bg-amber-600/10 border-2 border-amber-500/40">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-amber-300 font-bold text-sm uppercase tracking-wider mb-2">
                Director Responsibility Notice
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                By creating an account and using Virelle Studios, you accept full and sole legal
                responsibility for every piece of content you create, direct, generate, or publish
                through this platform. <strong className="text-foreground">Virelle Studios is a
                creative tool — not a publisher, broadcaster, or content owner.</strong> We provide
                the facility; you are the director. All liability for the use of that facility rests
                entirely with you.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-10 text-sm leading-relaxed text-muted-foreground">

          {/* 1. Acceptance */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-400" />
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing, registering for, or using Virelle Studios (&ldquo;the Platform&rdquo;,
              &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) at virelle.life or any
              associated services, you (&ldquo;User&rdquo;, &ldquo;Director&rdquo;, &ldquo;you&rdquo;)
              agree to be bound by these Terms of Service (&ldquo;Terms&rdquo;) in their entirety.
              If you do not agree to all of these Terms, you must not access or use the Platform.
            </p>
            <p className="mt-3">
              These Terms constitute a legally binding agreement between you and Virelle Studios.
              By ticking the agreement checkbox at registration, you confirm that you have read,
              understood, and accepted these Terms, our{" "}
              <button onClick={() => setLocation("/privacy")} className="text-amber-400 hover:text-amber-300 underline">Privacy Policy</button>,{" "}
              <button onClick={() => setLocation("/acceptable-use")} className="text-amber-400 hover:text-amber-300 underline">Acceptable Use Policy</button>,{" "}
              <button onClick={() => setLocation("/ai-content-policy")} className="text-amber-400 hover:text-amber-300 underline">AI Content Policy</button>, and{" "}
              <button onClick={() => setLocation("/ip-policy")} className="text-amber-400 hover:text-amber-300 underline">IP &amp; Copyright Policy</button>.
            </p>
          </section>

          {/* 2. Description of Service */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground flex items-center gap-2">
              <Film className="w-4 h-4 text-amber-400" />
              2. Description of Service
            </h2>
            <p>
              Virelle Studios is an AI-powered film production platform that enables users to generate
              cinematic content including images, video scenes, scripts, voice acting, and soundtracks
              using artificial intelligence. The Platform acts as an orchestration layer connecting
              user inputs to third-party AI generation services.
            </p>
            <p className="mt-3">
              <strong className="text-foreground">Virelle Studios is a creative facility, not a
              content creator.</strong> We do not direct, approve, review, or endorse any content
              created by users. All creative decisions — including the choice of subject matter,
              characters, locations, narratives, and presentation — are made solely by you, the Director.
            </p>
          </section>

          {/* 3. Director Responsibility — THE KEY SECTION */}
          <section>
            <div className="p-5 rounded-xl bg-red-500/5 border border-red-500/20 mb-4">
              <p className="text-red-400 text-xs font-bold uppercase tracking-wider mb-1">
                Core Legal Principle
              </p>
              <p className="text-foreground font-semibold">
                You are the Director. You bear full, sole, and exclusive legal responsibility for
                everything you create on this platform.
              </p>
            </div>
            <h2 className="text-lg font-semibold mb-3 text-foreground flex items-center gap-2">
              <User className="w-4 h-4 text-amber-400" />
              3. Director Responsibility &amp; Content Liability
            </h2>
            <p>
              You are <strong className="text-foreground">solely and entirely responsible</strong> for
              all content you create, upload, input, direct, or generate using the Platform. This
              responsibility is absolute, non-transferable, and cannot be diminished by any claim that
              the content was &ldquo;AI-generated&rdquo;. You directed the AI; you own the outcome.
            </p>
            <p className="mt-3">Your responsibility includes, without limitation:</p>
            <ul className="list-disc pl-6 mt-3 space-y-2">
              <li>All scripts, story concepts, character descriptions, and creative inputs you provide</li>
              <li>All AI-generated content produced as a result of your prompts and instructions</li>
              <li>Any downstream use, distribution, publication, broadcast, or monetisation of generated content</li>
              <li>Ensuring all content complies with applicable laws in your jurisdiction and all jurisdictions in which the content may be viewed</li>
              <li>Any harm — financial, reputational, emotional, or physical — caused to any person or entity by your content</li>
              <li>Any legal claims, regulatory actions, or enforcement proceedings arising from your content</li>
            </ul>
            <p className="mt-4 font-medium text-foreground">
              Virelle Studios is not liable, under any circumstances, for any content generated by
              users, including content that infringes third-party rights, violates laws, or causes
              harm to any person or entity.
            </p>
          </section>

          {/* 4. Identity & Likeness */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground flex items-center gap-2">
              <User className="w-4 h-4 text-amber-400" />
              4. Identity, Likeness &amp; Biometric Data — Director&rsquo;s Sole Responsibility
            </h2>
            <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/20 mb-4">
              <p className="text-amber-300 text-xs font-semibold uppercase tracking-wider mb-2">
                Important Legal Notice
              </p>
              <p>
                The use of any real person&rsquo;s face, name, likeness, voice, or biometric data
                without their explicit written consent may constitute a violation of privacy laws,
                personality rights, right of publicity statutes, defamation law, and data protection
                regulations in many jurisdictions. <strong className="text-foreground">You, as the
                Director, bear sole and exclusive responsibility for obtaining all necessary consents
                and permissions before using any real person&rsquo;s identity on this platform.</strong>
              </p>
            </div>
            <p className="mb-3">By using any real person&rsquo;s identity, name, face, or likeness on the Platform, you represent, warrant, and agree that:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong className="text-foreground">Living persons:</strong> You have obtained explicit,
                informed, written consent from the individual, covering the specific use you intend on
                this Platform and any downstream publication or distribution.
              </li>
              <li>
                <strong className="text-foreground">Recently deceased persons (within 70 years of death):</strong>{" "}
                You have obtained written permission from the legal next of kin, estate, or authorised
                representative of the deceased.
              </li>
              <li>
                <strong className="text-foreground">Historical public figures (deceased more than 70 years ago):</strong>{" "}
                You may use publicly available images of historical public figures provided the use does
                not defame, misrepresent, or create false impressions about the individual.
              </li>
              <li>
                You accept full legal liability for any claim arising from your use of any person&rsquo;s
                identity, name, likeness, or biometric data on the Platform.
              </li>
              <li>
                You agree to fully indemnify and hold harmless Virelle Studios against any and all
                claims, damages, costs, and legal fees arising from your use of any person&rsquo;s
                identity on the Platform.
              </li>
            </ul>
            <p className="mt-4 font-medium text-foreground">
              Virelle Studios bears no responsibility whatsoever for any right of publicity violation,
              defamation, privacy breach, or identity misuse arising from a user&rsquo;s content.
              All such liability rests entirely and exclusively with the Director.
            </p>
          </section>

          {/* 5. Location & Place */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground flex items-center gap-2">
              <MapPin className="w-4 h-4 text-amber-400" />
              5. Locations, Places &amp; Real-World Depictions — Director&rsquo;s Sole Responsibility
            </h2>
            <p>
              You are solely responsible for any depiction of real-world locations, landmarks, businesses,
              institutions, or places in your content. This includes, without limitation:
            </p>
            <ul className="list-disc pl-6 mt-3 space-y-2">
              <li>
                <strong className="text-foreground">Private property:</strong> Depicting private
                residences, businesses, or restricted locations without the owner&rsquo;s consent may
                constitute trespass, harassment, or defamation.
              </li>
              <li>
                <strong className="text-foreground">Businesses and brands:</strong> Depicting real
                businesses, brands, or organisations in a false, defamatory, or misleading manner may
                constitute defamation or trade libel.
              </li>
              <li>
                <strong className="text-foreground">Religious and cultural sites:</strong> Depicting
                religious, cultural, or heritage sites in a manner that is disrespectful, offensive,
                or sacrilegious may violate local laws and community standards.
              </li>
              <li>
                <strong className="text-foreground">Geopolitically sensitive locations:</strong> Depicting
                disputed territories, conflict zones, or politically sensitive locations may have legal
                implications in certain jurisdictions.
              </li>
            </ul>
            <p className="mt-4 font-medium text-foreground">
              Virelle Studios accepts no liability whatsoever for any legal, regulatory, or reputational
              consequences arising from your depiction of any real-world location or place. All such
              responsibility rests entirely with you, the Director.
            </p>
          </section>

          {/* 6. Prohibited Content */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              6. Prohibited Content — Zero Tolerance
            </h2>
            <div className="p-4 rounded-lg bg-red-500/5 border border-red-500/20 mb-4">
              <p className="text-red-400 text-xs font-semibold uppercase tracking-wider mb-2">
                Zero Tolerance Policy
              </p>
              <p>
                The following categories of content are absolutely prohibited. Violations will result
                in immediate permanent account termination, IP ban, and mandatory reporting to relevant
                law enforcement authorities.
              </p>
            </div>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong className="text-foreground">Child Sexual Abuse Material (CSAM):</strong> Any
                generation, attempted generation, or facilitation of sexually explicit content involving
                minors is strictly prohibited and will result in immediate permanent account termination
                and mandatory reporting to NCMEC and relevant law enforcement.
              </li>
              <li>
                <strong className="text-foreground">Non-consensual intimate imagery:</strong> Generating
                sexually explicit content depicting real, identifiable individuals without their explicit
                written consent.
              </li>
              <li>
                <strong className="text-foreground">Defamatory content:</strong> Content designed to
                defame, harass, or cause reputational harm to specific individuals, businesses, or
                organisations.
              </li>
              <li>
                <strong className="text-foreground">Incitement to violence or terrorism:</strong> Content
                that promotes, glorifies, or incites violence, terrorism, or hate crimes.
              </li>
              <li>
                <strong className="text-foreground">Illegal content:</strong> Any content that violates
                applicable laws in your jurisdiction or the jurisdiction of Virelle Studios.
              </li>
            </ul>
          </section>

          {/* 7. Copyright & IP */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground flex items-center gap-2">
              <Copyright className="w-4 h-4 text-amber-400" />
              7. Copyright &amp; Intellectual Property
            </h2>
            <p>
              You are solely responsible for ensuring that all content you input into the Platform does
              not infringe any third-party intellectual property rights. Virelle Studios is not liable
              for any copyright infringement committed by users.
            </p>
            <p className="mt-3">
              Subject to your subscription plan, you retain ownership of the creative output generated
              through your use of the Platform, subject to the underlying rights of third-party AI
              providers and these Terms. See our{" "}
              <button onClick={() => setLocation("/ip-policy")} className="text-amber-400 hover:text-amber-300 underline">
                IP &amp; Copyright Policy
              </button>{" "}
              for full details.
            </p>
          </section>

          {/* 8. Limitation of Liability */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground flex items-center gap-2">
              <Scale className="w-4 h-4 text-amber-400" />
              8. Limitation of Liability
            </h2>
            <div className="p-4 rounded-lg bg-card/50 border border-border/50">
              <p className="font-semibold text-foreground mb-3">
                TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW:
              </p>
              <ul className="space-y-3">
                <li>
                  VIRELLE STUDIOS, ITS OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, AND LICENSORS SHALL
                  NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE
                  DAMAGES ARISING FROM YOUR USE OF THE PLATFORM OR ANY CONTENT GENERATED THROUGH IT.
                </li>
                <li>
                  VIRELLE STUDIOS IS NOT LIABLE FOR ANY MISUSE OF THE PLATFORM BY USERS, INCLUDING
                  BUT NOT LIMITED TO: MISUSE OF ANOTHER PERSON&rsquo;S IDENTITY OR LIKENESS, MISUSE
                  OF REAL-WORLD LOCATIONS OR PLACES, COPYRIGHT INFRINGEMENT, DEFAMATION, PRIVACY
                  VIOLATIONS, OR ANY OTHER HARM CAUSED BY USER-GENERATED CONTENT.
                </li>
                <li>
                  VIRELLE STUDIOS PROVIDES A CREATIVE FACILITY. THE DIRECTOR USING THAT FACILITY
                  IS SOLELY AND EXCLUSIVELY RESPONSIBLE FOR ALL CONTENT CREATED WITHIN IT AND ALL
                  CONSEQUENCES ARISING FROM THAT CONTENT.
                </li>
                <li>
                  IN NO EVENT SHALL VIRELLE STUDIOS&rsquo; TOTAL LIABILITY TO YOU FOR ALL CLAIMS
                  EXCEED THE AMOUNT YOU PAID TO VIRELLE STUDIOS IN THE THREE (3) MONTHS PRECEDING
                  THE CLAIM.
                </li>
              </ul>
            </div>
          </section>

          {/* 9. Indemnification */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-400" />
              9. Indemnification
            </h2>
            <p>
              You agree to defend, indemnify, and hold harmless Virelle Studios and its officers,
              directors, employees, and agents from and against any claims, liabilities, damages,
              judgments, awards, losses, costs, expenses, or fees (including reasonable legal fees)
              arising out of or relating to:
            </p>
            <ul className="list-disc pl-6 mt-3 space-y-2">
              <li>Your violation of these Terms</li>
              <li>Your use of the Platform and any content you create</li>
              <li>Your use of any person&rsquo;s identity, likeness, name, or biometric data</li>
              <li>Your depiction of any real-world location, business, or organisation</li>
              <li>Your violation of any third-party rights, including intellectual property rights, privacy rights, and rights of publicity</li>
              <li>Any claim by a third party that your content caused them harm</li>
            </ul>
          </section>

          {/* 10. Content Moderation */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              10. Content Moderation &amp; Account Suspension
            </h2>
            <p>
              Virelle Studios operates an automated content moderation system. When a potential policy
              violation is detected, the user&rsquo;s account will be immediately frozen pending review.
              For CSAM violations, accounts will be permanently terminated without possibility of
              reinstatement and the matter will be reported to law enforcement. Virelle Studios reserves
              the right to suspend or terminate any account at any time, for any reason, at its sole
              discretion.
            </p>
          </section>

          {/* 11. Credits & Refunds */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-amber-400" />
              11. Credits, Subscriptions &amp; Refunds
            </h2>
            <div className="p-4 rounded-lg bg-card/50 border border-border/50 mb-3">
              <p className="font-medium text-foreground">
                No credits, compensation, or refunds of any kind will be issued without express written
                approval from a Virelle Studios administrator.
              </p>
            </div>
            <p>
              Any request for a credit, generation credit top-up, monetary compensation, or subscription
              refund must be submitted via email to{" "}
              <a href="mailto:studiosvirelle@gmail.com" className="text-amber-400 hover:text-amber-300 underline">
                studiosvirelle@gmail.com
              </a>{" "}
              with clear screenshots evidencing the issue. All such requests are subject to administrator
              review and approval, which may take up to 24 hours. Credits are non-transferable, have no
              monetary value, and cannot be exchanged for cash.
            </p>
          </section>

          {/* 12. Error Reporting */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-400" />
              12. Error Reporting &amp; Technical Support
            </h2>
            <p>
              In the event of a technical error, generation failure, or malfunction, submit a clear,
              descriptive email to{" "}
              <a href="mailto:studiosvirelle@gmail.com" className="text-amber-400 hover:text-amber-300 underline">
                studiosvirelle@gmail.com
              </a>{" "}
              with one or more clear screenshots documenting the issue. Reports without supporting
              screenshots may not be actioned. Virelle Studios will endeavour to respond within 24 hours
              but does not guarantee this timeframe. The Platform is provided on an &ldquo;as is&rdquo;
              and &ldquo;as available&rdquo; basis.
            </p>
          </section>

          {/* 13. Governing Law */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground flex items-center gap-2">
              <Scale className="w-4 h-4 text-amber-400" />
              13. Governing Law
            </h2>
            <p>
              These Terms shall be governed by and construed in accordance with applicable law. Any
              disputes arising under these Terms shall be subject to the exclusive jurisdiction of the
              competent courts. If any provision of these Terms is found to be unenforceable, the
              remaining provisions shall remain in full force and effect.
            </p>
          </section>

          {/* 14. Changes */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-400" />
              14. Changes to Terms
            </h2>
            <p>
              Virelle Studios reserves the right to modify these Terms at any time. Continued use of
              the Platform after changes constitutes acceptance of the updated Terms. We will notify
              users of material changes via email or platform notification.
            </p>
          </section>

          {/* 15. Contact */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground flex items-center gap-2">
              <Mail className="w-4 h-4 text-amber-400" />
              15. Contact
            </h2>
            <p>
              For legal enquiries and content moderation appeals:{" "}
              <a href="mailto:legal@virellestudios.com" className="text-amber-400 hover:text-amber-300 underline">
                legal@virellestudios.com
              </a>
              <br />
              For technical support and error reporting:{" "}
              <a href="mailto:studiosvirelle@gmail.com" className="text-amber-400 hover:text-amber-300 underline">
                studiosvirelle@gmail.com
              </a>
              <br />
              For DMCA takedown notices:{" "}
              <a href="mailto:dmca@virellestudios.com" className="text-amber-400 hover:text-amber-300 underline">
                dmca@virellestudios.com
              </a>
            </p>
          </section>

        </div>
      </div>
      <LeegoFooterLaunch />
    </div>
  );
}
