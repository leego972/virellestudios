/**
   * Music Artists & Visual Artists — Virelle Studios segment landing page
   * Route: /artists
   * CTA: See a 60-second demo → fires demo_request event → studiosvirelle@gmail.com fallback
   */
  import { useState, useEffect } from "react";
  import { trpc } from "@/lib/trpc";
  import { Button } from "@/components/ui/button";
  import { Input } from "@/components/ui/input";
  import { Badge } from "@/components/ui/badge";
  import { toast } from "sonner";
  import { ArrowRight, CheckCircle2, Sparkles, Film, Zap, Star, Mail } from "lucide-react";

  const SEGMENT = "artists";

  function useUtm() {
    if (typeof window === "undefined") return {} as Record<string, string | undefined>;
    const p = new URLSearchParams(window.location.search);
    return {
      source:      p.get("utm_source")   ?? undefined,
      utmMedium:   p.get("utm_medium")   ?? undefined,
      utmCampaign: p.get("utm_campaign") ?? undefined,
      utmContent:  p.get("utm_content")  ?? undefined,
      utmTerm:     p.get("utm_term")     ?? undefined,
    };
  }

  export default function MusicArtistsVisualArtistsPage() {
    const utm = useUtm();
    const logEvent = trpc.growth.logGrowthEvent.useMutation();
    const [email, setEmail] = useState("");
    const [submitted, setSubmitted] = useState(false);

    useEffect(() => {
      logEvent.mutate({
        eventType: "landing_page_view",
        segment: SEGMENT,
        page: "/artists",
        referrer: typeof document !== "undefined" ? document.referrer || undefined : undefined,
        ...utm,
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleDemo = () => {
      logEvent.mutate({ eventType: "demo_request", segment: SEGMENT, page: "/artists", ...utm });
      // Primary: go to demo page or booking link
      const demoUrl = `/register?${new URLSearchParams({ utm_source: utm.source ?? "artists", utm_medium: utm.utmMedium ?? "landing", utm_campaign: utm.utmCampaign ?? "artists-demo", utm_content: "demo_cta" }).toString()}`;
      window.location.href = demoUrl;
    };

    const handleEmailSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!email) return;
      logEvent.mutate({ eventType: "email_capture", segment: SEGMENT, page: "/artists", metadata: { email }, ...utm });
      // Fallback: mailto if form submission fails
      setSubmitted(true);
      toast.success("You're on the list! We'll be in touch soon.");
    };

    const handleSignupClick = () => {
      logEvent.mutate({ eventType: "signup_click", segment: SEGMENT, page: "/artists", ...utm });
      window.location.href = `/register?${new URLSearchParams({ utm_source: utm.source ?? "artists", utm_medium: "landing", utm_campaign: "artists-beta" }).toString()}`;
    };

    return (
      <div className="min-h-screen bg-neutral-950 text-white">
        {/* Nav */}
        <nav className="border-b border-neutral-800 px-6 py-4 flex items-center justify-between">
          <a href="/" className="text-amber-500 font-bold text-lg tracking-tight">Virelle Studios</a>
          <div className="flex items-center gap-3">
            <a href="/blog" className="text-sm text-neutral-400 hover:text-white transition-colors hidden sm:block">Blog</a>
            <Button size="sm" variant="outline" className="border-neutral-700 text-neutral-300 hover:bg-neutral-800"
              onClick={handleSignupClick}>
              Sign Up Free
            </Button>
            <Button size="sm" className="bg-amber-600 hover:bg-amber-500 text-white" onClick={handleDemo}>
              See a 60-second demo
            </Button>
          </div>
        </nav>

        {/* Hero */}
        <section className="px-6 py-24 max-w-5xl mx-auto text-center">
          <Badge className="mb-6 bg-amber-900/40 text-amber-400 border-amber-800/50 text-xs px-3 py-1">
            <Sparkles className="w-3 h-3 mr-1.5 inline" /> Free Beta · No credit card required
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6 whitespace-pre-line">Turn your art into
cinematic films — instantly</h1>
          <p className="text-xl text-neutral-400 max-w-2xl mx-auto mb-10">Virelle Studios gives artists a full AI film studio. Create music video concepts, animate illustrations, and produce cinematic promos — without a production crew.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
            <Button size="lg" className="bg-amber-600 hover:bg-amber-500 text-white font-semibold px-8 py-6 text-lg"
              onClick={handleDemo}>
              See a 60-second demo <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button size="lg" variant="outline" className="border-neutral-700 text-neutral-300 hover:bg-neutral-800 px-8 py-6 text-lg"
              onClick={handleSignupClick}>
              Start Free
            </Button>
          </div>
          <div className="flex items-center justify-center gap-6 text-sm text-neutral-500 flex-wrap">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-green-500" /> $0 to start</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-green-500" /> No watermarks</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-green-500" /> Cinema-grade AI</span>
          </div>
        </section>

        {/* Capabilities */}
        <section className="px-6 py-16 max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-12">Built for Music Artists & Visual Artists</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 hover:border-neutral-700 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-amber-900/40 flex items-center justify-center mb-4">
                <Film className="w-5 h-5 text-amber-500" />
              </div>
              <h3 className="font-semibold text-white mb-2">Music Video Concepts</h3>
              <p className="text-sm text-neutral-400">Generate cinematic music video concepts from your song brief. Pitch visuals to directors and labels before spending on production.</p>
            </div>
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 hover:border-neutral-700 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-amber-900/40 flex items-center justify-center mb-4">
                <Zap className="w-5 h-5 text-amber-500" />
              </div>
              <h3 className="font-semibold text-white mb-2">Animated Portfolio Reels</h3>
              <p className="text-sm text-neutral-400">Transform static artwork into stunning cinematic sequences that win clients and stop thumbs on social media.</p>
            </div>
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 hover:border-neutral-700 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-amber-900/40 flex items-center justify-center mb-4">
                <Star className="w-5 h-5 text-amber-500" />
              </div>
              <h3 className="font-semibold text-white mb-2">Album & Release Promos</h3>
              <p className="text-sm text-neutral-400">Create teaser clips, lyric visuals, and social content for releases — all from one browser workflow.</p>
            </div>
          </div>
        </section>

        {/* Cost saving */}
        <section className="px-6 py-16 bg-neutral-900/50">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl font-bold mb-4">The maths is simple</h2>
            <p className="text-5xl font-bold text-amber-500 my-6">60–90% less spend</p>
            <p className="text-lg text-neutral-400">Virelle helps artists avoid thousands in early-stage production costs before they know whether a visual concept works.</p>
            <p className="text-sm text-neutral-600 mt-3">Based on estimated early-stage concepting costs. Individual results vary.</p>
          </div>
        </section>

        {/* Email capture */}
        <section className="px-6 py-20 max-w-xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-3">Get notified when your spot opens</h2>
          <p className="text-neutral-400 mb-8 text-sm">Rolling beta access. Drop your email and we'll reach out directly.</p>
          {submitted ? (
            <div className="flex items-center justify-center gap-2 text-green-400 font-semibold">
              <CheckCircle2 className="w-5 h-5" /> You're on the list!
            </div>
          ) : (
            <>
              <form onSubmit={handleEmailSubmit} className="flex flex-col sm:flex-row gap-2 mb-3">
                <Input type="email" required placeholder="your@email.com" value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="bg-neutral-900 border-neutral-700 text-white flex-1" />
                <Button type="submit" className="bg-amber-600 hover:bg-amber-500 text-white font-semibold shrink-0">
                  Join Waitlist
                </Button>
              </form>
              {/* Fallback contact */}
              <p className="text-xs text-neutral-600">
                Or email us directly:{" "}
                <a href="mailto:studiosvirelle@gmail.com" className="text-amber-500 hover:underline">
                  studiosvirelle@gmail.com
                </a>
              </p>
            </>
          )}
          <p className="text-xs text-neutral-600 mt-4">No spam. Unsubscribe any time.</p>
        </section>

        {/* Demo CTA bar */}
        <section className="px-6 py-12 bg-amber-950/30 border-t border-amber-900/30">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-lg font-semibold text-white mb-4">Ready to see Virelle in action?</p>
            <Button size="lg" className="bg-amber-600 hover:bg-amber-500 text-white font-semibold px-10" onClick={handleDemo}>
              See a 60-second demo <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-neutral-800 px-6 py-8 text-center text-neutral-500 text-sm">
          <a href="/" className="text-amber-500 font-semibold">Virelle Studios</a> · AI-powered film production ·{" "}
          <a href="mailto:studiosvirelle@gmail.com" className="hover:text-neutral-300">studiosvirelle@gmail.com</a> ·{" "}
          <a href="/privacy" className="hover:text-neutral-300">Privacy</a> ·{" "}
          <a href="/terms" className="hover:text-neutral-300">Terms</a>
        </footer>
      </div>
    );
  }
  