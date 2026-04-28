import { useState, useEffect } from "react";
  import { trpc } from "@/lib/trpc";
  import { Button } from "@/components/ui/button";
  import { Input } from "@/components/ui/input";
  import { Badge } from "@/components/ui/badge";
  import { toast } from "sonner";
  import { ArrowRight, CheckCircle2, Sparkles, Film, Zap, Star } from "lucide-react";

  const SEGMENT = "filmmakers";

  function useUtm() {
    const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    return {
      utmSource:   params.get("utm_source")   ?? undefined,
      utmMedium:   params.get("utm_medium")   ?? undefined,
      utmCampaign: params.get("utm_campaign") ?? undefined,
      utmContent:  params.get("utm_content")  ?? undefined,
      utmTerm:     params.get("utm_term")     ?? undefined,
    };
  }

  export default function FilmmakersPage() {
    const utm = useUtm();
    const logEvent = trpc.growth.logGrowthEvent.useMutation();
    const [email, setEmail] = useState("");
    const [submitted, setSubmitted] = useState(false);

    useEffect(() => {
      logEvent.mutate({
        eventType: "page_view",
        segment:   SEGMENT,
        page:      "/filmmakers",
        referrer:  document.referrer || undefined,
        ...utm,
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleCta = () => {
      logEvent.mutate({ eventType: "cta_click", segment: SEGMENT, page: "/filmmakers", ...utm });
      const dest = `/register?utm_source=${utm.utmSource ?? "filmmakers"}&utm_medium=${utm.utmMedium ?? "landing"}&utm_campaign=${utm.utmCampaign ?? "filmmakers-beta"}&utm_content=hero_cta`;
      window.location.href = dest;
    };

    const handleEmailSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!email) return;
      logEvent.mutate({ eventType: "signup", segment: SEGMENT, page: "/filmmakers", metadata: { email }, ...utm });
      setSubmitted(true);
      toast.success("You're on the list! We'll be in touch soon.");
    };

    return (
      <div className="min-h-screen bg-neutral-950 text-white">
        {/* Nav */}
        <nav className="border-b border-neutral-800 px-6 py-4 flex items-center justify-between">
          <a href="/" className="text-amber-500 font-bold text-lg tracking-tight">VirÉlle Studios</a>
          <div className="flex items-center gap-3">
            <a href="/blog" className="text-sm text-neutral-400 hover:text-white transition-colors">Blog</a>
            <Button size="sm" className="bg-amber-600 hover:bg-amber-500 text-white" onClick={handleCta}>
              Get Beta Access
            </Button>
          </div>
        </nav>

        {/* Hero */}
        <section className="px-6 py-24 max-w-5xl mx-auto text-center">
          <Badge className="mb-6 bg-amber-900/40 text-amber-400 border-amber-800/50 text-xs px-3 py-1">
            <Sparkles className="w-3 h-3 mr-1.5" /> Free Beta · No credit card required
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
            A full film studio in
your browser — $0/month
          </h1>
          <p className="text-xl text-neutral-400 max-w-2xl mx-auto mb-10">
            From screenplay to final cut. VirÉlle Studios gives independent filmmakers AI storyboarding, scene generation, trailer creation, and festival-ready pitch decks — without the production budget.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
            <Button size="lg" className="bg-amber-600 hover:bg-amber-500 text-white font-semibold px-8 py-6 text-lg" onClick={handleCta}>
              Start Free <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <p className="text-sm text-neutral-500">or join the waitlist below</p>
          </div>
          <div className="flex items-center justify-center gap-6 text-sm text-neutral-500">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-green-500" /> $0 to start</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-green-500" /> No watermarks</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-green-500" /> Storyboard to screen</span>
          </div>
        </section>

        {/* Use cases */}
        <section className="px-6 py-16 max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-12 text-neutral-100">Built for Filmmakers</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div key={0} className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 hover:border-neutral-700 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-amber-900/40 flex items-center justify-center mb-4">
                <Film className="w-5 h-5 text-amber-500" />
              </div>
              <h3 className="font-semibold text-white mb-2">AI Storyboarding</h3>
              <p className="text-sm text-neutral-400">Visualize every scene before you shoot. Generate storyboard frames from your script in seconds.</p>
            </div>
          
            <div key={1} className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 hover:border-neutral-700 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-amber-900/40 flex items-center justify-center mb-4">
                <Zap className="w-5 h-5 text-amber-500" />
              </div>
              <h3 className="font-semibold text-white mb-2">Trailer Studio</h3>
              <p className="text-sm text-neutral-400">Produce professional festival trailers and pitch teasers without hiring an editor or VFX house.</p>
            </div>
          
            <div key={2} className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 hover:border-neutral-700 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-amber-900/40 flex items-center justify-center mb-4">
                <Star className="w-5 h-5 text-amber-500" />
              </div>
              <h3 className="font-semibold text-white mb-2">Pitch Deck Generator</h3>
              <p className="text-sm text-neutral-400">Auto-generate investor-ready pitch decks with your characters, scenes, and vision document.</p>
            </div>
          </div>
        </section>

        {/* Saving */}
        <section className="px-6 py-16 bg-neutral-900/50">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl font-bold mb-4">The math is obvious</h2>
            <p className="text-5xl font-bold text-amber-500 my-6">$40,000+ saved</p>
            <p className="text-lg text-neutral-400">vs. traditional pre-production costs for storyboarding, VFX tests, and pitch material.</p>
          </div>
        </section>

        {/* Email capture */}
        <section className="px-6 py-20 max-w-xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-3">Join the beta waitlist</h2>
          <p className="text-neutral-400 mb-8 text-sm">We're rolling out access in waves. Drop your email and we'll notify you the moment a spot opens.</p>
          {submitted ? (
            <div className="flex items-center justify-center gap-2 text-green-400 font-semibold">
              <CheckCircle2 className="w-5 h-5" /> You're on the list — we'll be in touch!
            </div>
          ) : (
            <form onSubmit={handleEmailSubmit} className="flex flex-col sm:flex-row gap-2">
              <Input
                type="email" required placeholder="your@email.com" value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-neutral-900 border-neutral-700 text-white flex-1"
              />
              <Button type="submit" className="bg-amber-600 hover:bg-amber-500 text-white font-semibold shrink-0">
                Join Waitlist
              </Button>
            </form>
          )}
          <p className="text-xs text-neutral-600 mt-4">No spam. Unsubscribe any time.</p>
        </section>

        {/* Footer */}
        <footer className="border-t border-neutral-800 px-6 py-8 text-center text-neutral-500 text-sm">
          <a href="/" className="text-amber-500 font-semibold">VirÉlle Studios</a> · AI-powered movie production ·{" "}
          <a href="/privacy" className="hover:text-neutral-300 transition-colors">Privacy</a> ·{" "}
          <a href="/terms" className="hover:text-neutral-300 transition-colors">Terms</a>
        </footer>
      </div>
    );
  }
  