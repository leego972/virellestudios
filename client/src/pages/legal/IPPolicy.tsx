import GoldWatermarkLaunch from "@/components/GoldWatermarkLaunch";
import LeegoFooterLaunch from "@/components/LeegoFooterLaunch";
import { Shield, Mail, AlertTriangle, Copyright, Lock, FileText, ArrowLeft } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";

export default function IPPolicy() {
  const EFFECTIVE_DATE = "1 January 2025";
  const CONTACT_EMAIL = "Studiosvirelle@gmail.com";
  const DMCA_EMAIL = "Studiosvirelle@gmail.com";
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background relative">
      <GoldWatermarkLaunch />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-20 relative z-10">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/")} className="mb-8 gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Button>
        {/* Header */}
        <div className="flex items-center gap-4 mb-10">
          <div className="w-14 h-14 rounded-2xl bg-amber-600/20 flex items-center justify-center shrink-0">
            <Shield className="w-7 h-7 text-amber-500" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
              Intellectual Property &amp; DMCA Policy
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Effective: {EFFECTIVE_DATE} &mdash; Virelle Studios, operated by Leego972
            </p>
          </div>
        </div>

        <div className="prose prose-invert max-w-none space-y-10 text-muted-foreground leading-relaxed">

          {/* 1. Ownership of Platform Content */}
          <section>
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2 mb-3">
              <Copyright className="w-5 h-5 text-amber-400" />
              1. Ownership of Platform &amp; Generated Content
            </h2>
            <p>
              All software, interfaces, design systems, brand assets, proprietary AI models, training
              pipelines, and underlying infrastructure of Virelle Studios are the exclusive intellectual
              property of Virelle Studios and its licensors. These materials are protected by copyright,
              trade secret, and other applicable intellectual property laws worldwide.
            </p>
            <p className="mt-3">
              <strong className="text-foreground">User-Generated Content:</strong> When you use Virelle
              Studios to generate films, scripts, storyboards, images, audio, or other creative works
              (&ldquo;Output&rdquo;), you retain ownership of the creative expression you contribute
              (your prompts, story concepts, character designs, and original creative direction).
              However, Virelle Studios retains a non-exclusive, worldwide, royalty-free licence to use
              anonymised Output for platform improvement, safety research, and promotional purposes,
              unless you have opted out in your account settings.
            </p>
            <p className="mt-3">
              <strong className="text-foreground">AI-Generated Assets:</strong> AI-generated video,
              audio, and image assets produced through the platform are subject to the terms of the
              underlying third-party AI providers (e.g. Runway, ElevenLabs, Kling). You are responsible
              for ensuring your use of Output complies with those providers&apos; terms of service.
            </p>
          </section>

          {/* 2. Content Watermarking */}
          <section>
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2 mb-3">
              <Lock className="w-5 h-5 text-amber-400" />
              2. Content Watermarking &amp; Provenance Metadata
            </h2>
            <p>
              All media generated through Virelle Studios is embedded with invisible provenance metadata
              (including your user ID, project ID, generation timestamp, and platform identifier) at the
              point of creation. This metadata persists through standard export formats and is used to
              verify the origin of content in the event of a copyright dispute.
            </p>
            <p className="mt-3">
              Visible Virelle Studios watermarks may appear on content generated under free or trial
              tiers. Removing, obscuring, or altering any watermark or provenance metadata — visible or
              invisible — is a violation of these terms and may constitute a breach of applicable
              copyright law.
            </p>
          </section>

          {/* 3. Prohibited Uses */}
          <section>
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              3. Prohibited Uses &amp; Content Theft
            </h2>
            <p>The following activities are strictly prohibited and may result in immediate account
              termination, legal action, and referral to relevant law enforcement authorities:</p>
            <ul className="list-disc list-inside mt-3 space-y-2 text-sm">
              <li>Scraping, crawling, or systematically downloading platform content without written authorisation</li>
              <li>Circumventing, disabling, or bypassing any technical protection measure (TPM) on the platform</li>
              <li>Removing, altering, or obscuring any copyright notice, watermark, or provenance metadata</li>
              <li>Reproducing, distributing, or publicly displaying another user&apos;s content without their consent</li>
              <li>Using Output to train competing AI models without express written permission</li>
              <li>Reverse-engineering, decompiling, or disassembling any part of the platform software</li>
              <li>Selling, sublicensing, or commercially exploiting platform assets beyond the scope of your subscription</li>
            </ul>
          </section>

          {/* 4. DMCA Takedown */}
          <section>
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2 mb-3">
              <FileText className="w-5 h-5 text-amber-400" />
              4. DMCA Takedown Procedure
            </h2>
            <p>
              Virelle Studios respects the intellectual property rights of others and complies with the
              Digital Millennium Copyright Act (DMCA), 17 U.S.C. § 512, and equivalent legislation in
              other jurisdictions. If you believe that content available on or through the platform
              infringes your copyright, you may submit a written takedown notice to our designated
              DMCA agent.
            </p>
            <h3 className="text-base font-semibold text-foreground mt-5 mb-2">
              Required Elements of a DMCA Notice
            </h3>
            <p>Your notice must include all of the following:</p>
            <ol className="list-decimal list-inside mt-3 space-y-2 text-sm">
              <li>
                <strong className="text-foreground">Identification of the copyrighted work</strong> —
                a description of the work you claim has been infringed, or a representative list if
                multiple works are involved.
              </li>
              <li>
                <strong className="text-foreground">Identification of the infringing material</strong> —
                sufficient information to locate the infringing content on the platform (e.g. URL,
                project ID, or screenshot).
              </li>
              <li>
                <strong className="text-foreground">Your contact information</strong> — name, address,
                telephone number, and email address.
              </li>
              <li>
                <strong className="text-foreground">Good faith statement</strong> — a statement that
                you have a good faith belief that the use of the material is not authorised by the
                copyright owner, its agent, or the law.
              </li>
              <li>
                <strong className="text-foreground">Accuracy statement</strong> — a statement that the
                information in your notice is accurate, and under penalty of perjury, that you are the
                copyright owner or authorised to act on their behalf.
              </li>
              <li>
                <strong className="text-foreground">Physical or electronic signature</strong> of the
                copyright owner or authorised representative.
              </li>
            </ol>
            <div className="mt-5 p-4 rounded-lg bg-amber-600/10 border border-amber-500/20">
              <p className="text-sm font-semibold text-amber-400">Submit DMCA Notices To:</p>
              <p className="text-sm mt-1">
                Email:{" "}
                <a href={`mailto:${DMCA_EMAIL}`} className="text-amber-400 hover:text-amber-300 underline">
                  {DMCA_EMAIL}
                </a>
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                We aim to respond to valid DMCA notices within 3 business days.
              </p>
            </div>
            <h3 className="text-base font-semibold text-foreground mt-6 mb-2">Counter-Notice</h3>
            <p>
              If you believe your content was removed in error, you may submit a counter-notice to{" "}
              <a href={`mailto:${DMCA_EMAIL}`} className="text-amber-400 hover:text-amber-300 underline">
                {DMCA_EMAIL}
              </a>{" "}
              containing the information required under 17 U.S.C. § 512(g)(3). Upon receipt of a valid
              counter-notice, we will forward it to the original complainant and may restore the content
              after 10–14 business days unless the complainant files a court action.
            </p>
            <p className="mt-3 text-sm">
              <strong className="text-foreground">Warning:</strong> Submitting a false DMCA notice or
              counter-notice is a serious legal matter. Misrepresentations may expose you to liability
              for damages, including legal costs.
            </p>
          </section>

          {/* 5. Repeat Infringers */}
          <section>
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              5. Repeat Infringer Policy
            </h2>
            <p>
              In accordance with the DMCA and our commitment to protecting creators, Virelle Studios
              maintains a repeat infringer policy. Accounts that are the subject of multiple valid
              copyright complaints will be suspended or permanently terminated at our sole discretion.
              We reserve the right to take action against repeat infringers without prior notice.
            </p>
          </section>

          {/* 6. Trade Marks */}
          <section>
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2 mb-3">
              <Shield className="w-5 h-5 text-amber-400" />
              6. Trade Marks
            </h2>
            <p>
              &ldquo;Virelle Studios&rdquo;, the Virelle Studios logo, &ldquo;Virelle&rdquo;, and all
              related marks, logos, and trade names are trade marks or registered trade marks of
              Virelle Studios. You may not use these marks without our prior written consent. Unauthorised
              use may constitute trade mark infringement and unfair competition under applicable law.
            </p>
          </section>

          {/* 7. Enforcement */}
          <section>
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2 mb-3">
              <Lock className="w-5 h-5 text-amber-400" />
              7. Enforcement &amp; Legal Action
            </h2>
            <p>
              Virelle Studios actively monitors for unauthorised use of its platform, brand, and user
              content. We reserve the right to pursue all available legal remedies — including injunctive
              relief, damages, and recovery of legal fees — against individuals or entities that infringe
              our intellectual property or facilitate the infringement of our users&apos; rights.
            </p>
            <p className="mt-3">
              We cooperate fully with law enforcement agencies and rights-holders in investigating
              intellectual property violations. We may disclose user information to the extent required
              by law or court order in connection with such investigations.
            </p>
          </section>

          {/* 8. Contact */}
          <section>
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2 mb-3">
              <Mail className="w-5 h-5 text-amber-400" />
              8. Contact
            </h2>
            <p>
              For general intellectual property enquiries (not DMCA notices), please contact us at:{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-amber-400 hover:text-amber-300 underline">
                {CONTACT_EMAIL}
              </a>
            </p>
            <p className="mt-3 text-sm">
              This policy is incorporated into and governed by our{" "}
              <Link href="/terms" className="text-amber-400 hover:text-amber-300 underline">
                Terms of Service
              </Link>
              . In the event of any conflict, the Terms of Service shall prevail.
            </p>
          </section>

        </div>
      </div>
      <LeegoFooterLaunch />
    </div>
  );
}
