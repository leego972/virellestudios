import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Lock } from "lucide-react";

export default function PrivacyPolicy() {
  const [, setLocation] = useLocation();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/")} className="mb-8 gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Button>
        <div className="flex items-center gap-3 mb-2">
          <Lock className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
        </div>
        <p className="text-muted-foreground text-sm mb-10">Last updated: March 2026 · Effective immediately</p>

        <div className="prose prose-invert max-w-none space-y-8 text-sm leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">1. Information We Collect</h2>
            <p className="text-muted-foreground mb-3">We collect the following categories of information:</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong className="text-foreground">Account information:</strong> Name, email address, password (hashed), professional role, company name.</li>
              <li><strong className="text-foreground">Usage data:</strong> Projects, scenes, characters, generated content, generation history.</li>
              <li><strong className="text-foreground">Uploaded content:</strong> Reference photos, character images, wardrobe photos you upload to the Platform.</li>
              <li><strong className="text-foreground">Payment information:</strong> Processed securely by Stripe. We do not store card numbers.</li>
              <li><strong className="text-foreground">Technical data:</strong> IP address, browser type, device information, session tokens.</li>
              <li><strong className="text-foreground">API keys:</strong> Third-party API keys you provide are encrypted at rest using AES-256 encryption.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">2. How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>To provide, maintain, and improve the Platform</li>
              <li>To process payments and manage subscriptions</li>
              <li>To send service notifications and account alerts</li>
              <li>To detect and prevent fraud, abuse, and policy violations</li>
              <li>To comply with legal obligations including mandatory reporting requirements</li>
              <li>To send marketing communications (only with your explicit consent)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">3. Content Moderation and Safety</h2>
            <p className="text-muted-foreground">
              We operate automated content moderation systems that analyse inputs and generated content for policy violations. In cases of suspected violations, content and associated user data may be reviewed by our safety team. In cases of CSAM or serious illegal content, we are legally obligated to report to relevant authorities including NCMEC and law enforcement, and will share necessary user data to comply with these obligations.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">4. Data Sharing</h2>
            <p className="text-muted-foreground mb-3">We do not sell your personal data. We share data only with:</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong className="text-foreground">AI providers:</strong> Your prompts and reference images are sent to third-party AI services (OpenAI, Runway ML, ElevenLabs, etc.) to generate content. These providers have their own privacy policies.</li>
              <li><strong className="text-foreground">Payment processors:</strong> Stripe processes payments. We share only necessary billing information.</li>
              <li><strong className="text-foreground">Law enforcement:</strong> When legally required or in response to valid legal process.</li>
              <li><strong className="text-foreground">Child protection authorities:</strong> NCMEC and relevant authorities in cases of suspected CSAM.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">5. Data Retention</h2>
            <p className="text-muted-foreground">
              We retain your account data for as long as your account is active. Generated content is retained according to your subscription plan. You may request deletion of your account and associated data by contacting <a href="mailto:privacy@virelle.life" className="text-primary hover:underline">privacy@virelle.life</a>. Note that we may retain certain data as required by law or for legitimate safety purposes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">6. Security</h2>
            <p className="text-muted-foreground">
              We implement industry-standard security measures including encrypted connections (TLS), hashed passwords (bcrypt), encrypted API key storage (AES-256), rate limiting, and fraud detection. However, no system is completely secure and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">7. Your Rights</h2>
            <p className="text-muted-foreground mb-3">Depending on your jurisdiction, you may have the right to:</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Object to or restrict processing of your data</li>
              <li>Data portability</li>
            </ul>
            <p className="text-muted-foreground mt-3">
              To exercise these rights, contact <a href="mailto:privacy@virelle.life" className="text-primary hover:underline">privacy@virelle.life</a>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">8. Contact</h2>
            <p className="text-muted-foreground">
              For privacy-related inquiries: <a href="mailto:privacy@virelle.life" className="text-primary hover:underline">privacy@virelle.life</a><br />For legal matters: <a href="mailto:legal@virelle.life" className="text-primary hover:underline">legal@virelle.life</a><br />For support: <a href="mailto:support@virelle.life" className="text-primary hover:underline">support@virelle.life</a>
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
