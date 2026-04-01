import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Cpu } from "lucide-react";

export default function AIContentPolicy() {
  const [, setLocation] = useLocation();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/")} className="mb-8 gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Button>
        <div className="flex items-center gap-3 mb-2">
          <Cpu className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">AI Content Policy</h1>
        </div>
        <p className="text-muted-foreground text-sm mb-10">Last updated: March 2026 · Effective immediately</p>

        <div className="prose prose-invert max-w-none space-y-8 text-sm leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">1. Ownership of AI-Generated Content</h2>
            <p className="text-muted-foreground">
              Content generated through Virelle Studios is produced by third-party AI models. The copyright status of AI-generated content varies by jurisdiction and is an evolving area of law. Subject to your subscription plan, Virelle Studios grants you a licence to use generated content for your stated purposes. You are responsible for understanding the copyright implications in your jurisdiction before commercialising AI-generated content.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">2. AI Minor Protection System</h2>
            <p className="text-muted-foreground mb-3">
              Virelle Studios operates an automatic AI Minor Protection system. When a character is identified as a minor (under 18 years of age) based on their age range setting, and the scene context involves potentially sensitive situations, the system automatically:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Injects cinematic modesty directives into the AI generation prompt</li>
              <li>Applies context-appropriate visual protections (steam/fog for shower scenes, appropriate swimwear framing for beach scenes, robes/towels for changing scenes)</li>
              <li>Enforces above-shoulder camera angles and wide establishing shots in sensitive contexts</li>
              <li>Adds negative prompt directives to prevent any exposure of minor characters</li>
            </ul>
            <p className="text-muted-foreground mt-3">
              This system is mandatory and cannot be disabled or circumvented. It applies to all AI generation pipelines on the Platform.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">3. Character Consistency and Face DNA</h2>
            <p className="text-muted-foreground">
              When you upload a reference photograph to create a character, the Platform uses that image to maintain visual consistency across scenes. By uploading a photograph, you confirm you have the right to use that image and the likeness it depicts for this purpose. The Platform does not store face recognition data or biometric templates — reference images are used solely for visual consistency in AI generation prompts.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">4. Content Moderation</h2>
            <p className="text-muted-foreground mb-3">
              All inputs and generated content are subject to automated moderation. The moderation system scans for:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Child sexual abuse material (CSAM) — zero tolerance, immediate reporting</li>
              <li>Non-consensual intimate imagery</li>
              <li>Violent extremist content</li>
              <li>Targeted harassment and threats</li>
            </ul>
            <p className="text-muted-foreground mt-3">
              Detected violations trigger immediate account freezing and safety team review. False positives can be appealed by contacting <a href="mailto:Studiosvirelle@gmail.com" className="text-primary hover:underline">Studiosvirelle@gmail.com</a>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">5. Third-Party AI Provider Policies</h2>
            <p className="text-muted-foreground">
              Generated content is subject to the content policies of the underlying AI providers (OpenAI, Runway ML, ElevenLabs, fal.ai, etc.). These providers may independently refuse to generate certain content. Virelle Studios is not responsible for content refused or filtered by third-party providers.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">6. Disclosure of AI-Generated Content</h2>
            <p className="text-muted-foreground">
              When distributing or publishing AI-generated content produced on Virelle Studios, you are responsible for complying with any applicable disclosure requirements in your jurisdiction. Some jurisdictions require disclosure that content is AI-generated, particularly for political advertising or content designed to deceive.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3 text-foreground">7. Contact</h2>
            <p className="text-muted-foreground">
              For AI content policy questions: <a href="mailto:Studiosvirelle@gmail.com" className="text-primary hover:underline">Studiosvirelle@gmail.com</a>
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
