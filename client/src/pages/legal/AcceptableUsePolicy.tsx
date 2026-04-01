import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertTriangle } from "lucide-react";

export default function AcceptableUsePolicy() {
  const [, setLocation] = useLocation();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/")} className="mb-8 gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Button>
        <div className="flex items-center gap-3 mb-2">
          <AlertTriangle className="h-6 w-6 text-amber-400" />
          <h1 className="text-3xl font-bold tracking-tight">Acceptable Use Policy</h1>
        </div>
        <p className="text-muted-foreground text-sm mb-10">Last updated: March 2026 · Effective immediately</p>

        <div className="prose prose-invert max-w-none space-y-8 text-sm leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">Overview</h2>
            <p className="text-muted-foreground">
              This Acceptable Use Policy ("AUP") governs what you may and may not do with Virelle Studios. By using the Platform, you agree to comply with this AUP. Violations may result in immediate account suspension or termination.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">Permitted Uses</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Creating original fictional films, short films, and video content</li>
              <li>Generating VFX scenes for integration into your own productions</li>
              <li>Creating music videos, commercials, and promotional content</li>
              <li>Educational and research projects involving AI film generation</li>
              <li>Personal creative projects and artistic expression</li>
              <li>Professional film production with proper consents obtained</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">Absolutely Prohibited — Zero Tolerance</h2>
            <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4 mb-4">
              <p className="text-red-400 font-semibold mb-2">The following will result in immediate permanent account termination and reporting to law enforcement:</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><strong className="text-foreground">Child Sexual Abuse Material (CSAM):</strong> Any sexually explicit content involving minors, whether real or AI-generated. This is a criminal offence. We will report all violations to NCMEC and relevant law enforcement immediately.</li>
                <li><strong className="text-foreground">Non-consensual intimate imagery:</strong> Generating sexual content depicting real, identifiable people without their explicit consent ("deepfake pornography").</li>
                <li><strong className="text-foreground">Terrorism and violent extremism:</strong> Content promoting, glorifying, or recruiting for terrorist organisations or violent extremist groups.</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">Prohibited Uses</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Generating content that defames, harasses, or threatens specific individuals</li>
              <li>Creating disinformation or deliberately misleading content presented as factual</li>
              <li>Generating content that infringes third-party intellectual property rights</li>
              <li>Using real persons' likenesses without proper consent (see Terms of Service Section 4)</li>
              <li>Attempting to circumvent content moderation systems</li>
              <li>Using the Platform for any illegal purpose</li>
              <li>Sharing account credentials or reselling access to the Platform</li>
              <li>Automated scraping or bulk generation for resale without a commercial licence</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">Minor Characters in Sensitive Scenes</h2>
            <p className="text-muted-foreground">
              Our AI Minor Protection system automatically applies cinematic modesty directives when minor characters (under 18) appear in potentially sensitive scenes. This is a platform-level protection that cannot be disabled. Any attempt to circumvent this system is a violation of this AUP and will result in immediate account suspension.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">Reporting Violations</h2>
            <p className="text-muted-foreground">
              To report a violation of this AUP, contact <a href="mailto:Studiosvirelle@gmail.com" className="text-primary hover:underline">Studiosvirelle@gmail.com</a>. For urgent child safety concerns, contact NCMEC directly at 1-800-THE-LOST or CyberTipline.org.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
