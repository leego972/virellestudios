import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowRight,
  Accessibility,
  Check,
  ExternalLink,
  Film,
  KeyRound,
  Landmark,
  Shirt,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const POSITIONING_HOST_ID = "virelle-strategic-positioning";
const PROVIDER_HOST_ID = "virelle-verified-provider-list";
const ORIGINAL_TEXT_ATTR = "data-virelle-original-text";
const HIDDEN_PROVIDER_ATTR = "data-virelle-hidden-provider-row";
const PROVIDERS = [
  "OpenAI",
  "Anthropic",
  "Google AI",
  "ElevenLabs",
  "Replicate",
  "fal.ai",
  "Runway",
  "Luma",
  "Hugging Face",
  "Venice",
  "BytePlus",
  "Suno",
];

function isLandingPath() {
  return window.location.pathname === "/" || window.location.pathname === "/welcome";
}

function isSoraPath() {
  return window.location.pathname === "/sora-migration";
}

function replaceText(element: HTMLElement, nextText: string) {
  if (!element.hasAttribute(ORIGINAL_TEXT_ATTR)) {
    element.setAttribute(ORIGINAL_TEXT_ATTR, element.textContent || "");
  }
  element.textContent = nextText;
}

function restoreText() {
  document.querySelectorAll<HTMLElement>(`[${ORIGINAL_TEXT_ATTR}]`).forEach(element => {
    element.textContent = element.getAttribute(ORIGINAL_TEXT_ATTR) || "";
    element.removeAttribute(ORIGINAL_TEXT_ATTR);
  });
}

function findHeroSection(): HTMLElement | null {
  return Array.from(document.querySelectorAll<HTMLElement>("main > section, main section")).find(section => {
    const text = section.textContent || "";
    return text.includes("CONCEPT TO") && text.includes("CINEMATIC REALITY");
  }) || null;
}

function correctProviderClaims() {
  const elements = Array.from(document.querySelectorAll<HTMLElement>("span, div, p"));
  for (const element of elements) {
    const text = (element.textContent || "").trim();
    if (text === "5+" && element.parentElement?.textContent?.match(/AI video providers/i)) {
      replaceText(element, "12");
    }
    if (text === "AI Video Providers" || text === "AI video providers") {
      replaceText(element, "BYOK providers");
    }
    if (text === "Runway · Sora · Veo3 · Kling · fal.ai") {
      replaceText(element, "OpenAI · Google AI · Runway · fal.ai + 8 more");
    }
    if (text === "Built on the world's leading AI video infrastructure") {
      replaceText(element, "Connect 12 BYOK providers across writing, image, video, voice, music and inference");
    }
  }

  for (const container of Array.from(document.querySelectorAll<HTMLElement>("div"))) {
    const text = (container.textContent || "").trim();
    if (!text.includes("OpenAI Sora") || !text.includes("Runway Gen-4.5") || !text.includes("Suno v4")) continue;
    if (container.children.length < 4) continue;
    container.hidden = true;
    container.setAttribute("aria-hidden", "true");
    container.setAttribute(HIDDEN_PROVIDER_ATTR, "true");
    let target = document.getElementById(PROVIDER_HOST_ID);
    if (!target) {
      target = document.createElement("div");
      target.id = PROVIDER_HOST_ID;
      container.insertAdjacentElement("afterend", target);
    }
  }
}

function restoreProviderClaims() {
  restoreText();
  document.querySelectorAll<HTMLElement>(`[${HIDDEN_PROVIDER_ATTR}]`).forEach(element => {
    element.hidden = false;
    element.removeAttribute("aria-hidden");
    element.removeAttribute(HIDDEN_PROVIDER_ATTR);
  });
  document.getElementById(PROVIDER_HOST_ID)?.remove();
}

function ProviderList() {
  return (
    <div className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2" data-testid="verified-provider-list">
      {PROVIDERS.map(provider => (
        <span key={provider} className="text-[11px] font-semibold text-white/35">{provider}</span>
      ))}
    </div>
  );
}

function DifferentiatorCard({ icon, title, description, href, action }: { icon: React.ReactNode; title: string; description: string; href: string; action: string }) {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/[0.025] p-5 text-left transition hover:border-amber-400/25 hover:bg-amber-400/[0.035]">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-300 ring-1 ring-amber-400/20">{icon}</div>
      <h3 className="text-base font-semibold text-white">{title}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-white/45">{description}</p>
      <a href={href} className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-300 hover:text-amber-200">{action}<ArrowRight className="h-3.5 w-3.5" /></a>
    </article>
  );
}

function StrategicPositioningSection() {
  return (
    <section className="border-y border-amber-500/20 bg-[#08080d] px-4 py-20 sm:px-6 lg:px-8" data-testid="strategic-positioning-section">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 rounded-2xl border border-amber-400/25 bg-gradient-to-r from-amber-500/10 via-white/[0.025] to-amber-500/5 p-5 sm:flex sm:items-center sm:justify-between sm:gap-6">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-black/25 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-amber-300"><Film className="h-3.5 w-3.5" /> Sora migration path</div>
            <h2 className="text-xl font-bold text-white sm:text-2xl">Sora web and app ended April 26, 2026. Move the production workflow, not just the clips.</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/45">Export your Sora assets, bring them into a persistent Virelle project, rebuild continuity and story structure, then edit and hand off through standard NLE formats.</p>
          </div>
          <Button type="button" onClick={() => window.location.assign("/sora-migration")} className="mt-4 shrink-0 gap-2 bg-amber-500 font-bold text-black hover:bg-amber-400 sm:mt-0">See migration workflow <ArrowRight className="h-4 w-4" /></Button>
        </div>

        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400"><Sparkles className="h-3.5 w-3.5" /> Capabilities competitors do not combine</div>
          <h2 className="mt-5 text-3xl font-bold tracking-tight text-gold-shimmer sm:text-4xl">More than generation: the commercial and inclusive production system</h2>
          <p className="mx-auto mt-4 max-w-3xl text-sm leading-relaxed text-white/50">Virelle connects production tools with wardrobe commerce, project financing, accessibility delivery and a broad provider-control layer.</p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <DifferentiatorCard icon={<Shirt className="h-5 w-5" />} title="Designer wardrobe marketplace" description="Source, license and assign designer garments and virtual costume references directly to characters and scenes, preserving commercial-use and brand-placement rules." href="/wardrobe-marketplace" action="Explore wardrobe" />
          <DifferentiatorCard icon={<Landmark className="h-5 w-5" />} title="Funding & crowdfunding" description="Move from production budget to funding directories, project matching, investor materials and campaign tools without leaving the project workflow." href="/funding" action="Open funding tools" />
          <DifferentiatorCard icon={<Accessibility className="h-5 w-5" />} title="Accessibility studio" description="Prepare subtitles, captions, audio-description and accessible delivery assets as part of production rather than treating accessibility as a late add-on." href="/accessibility-studio" action="View accessibility" />
          <DifferentiatorCard icon={<KeyRound className="h-5 w-5" />} title="12 BYOK providers" description="Connect OpenAI, Anthropic, Google AI, ElevenLabs, Replicate, fal.ai, Runway, Luma, Hugging Face, Venice, BytePlus and Suno under one encrypted control centre." href="/settings/byok" action="Manage providers" />
        </div>
      </div>
    </section>
  );
}

function SoraMigrationPage() {
  return (
    <div className="fixed inset-0 z-[200] overflow-y-auto bg-[#07070e] text-white">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-[#07070e]/95 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <a href="/" className="flex items-center gap-2 font-black uppercase tracking-tight text-amber-300"><Film className="h-5 w-5" /> Virelle Studios</a>
          <a href="/" className="rounded-lg p-2 text-white/60 hover:bg-white/5 hover:text-white" aria-label="Close migration page"><X className="h-5 w-5" /></a>
        </div>
      </header>

      <main>
        <section className="border-b border-amber-500/20 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/25 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300"><Upload className="h-3.5 w-3.5" /> Direct migration workflow for former Sora users</div>
            <h1 className="mt-7 text-4xl font-black tracking-tight text-gold-shimmer sm:text-6xl">Your Sora workspace ended. Your production does not have to.</h1>
            <p className="mx-auto mt-6 max-w-3xl text-lg leading-relaxed text-white/55">OpenAI discontinued the Sora web and app experiences on April 26, 2026. The Sora API is scheduled to end on September 24, 2026. Virelle provides a persistent route from exported clips and references into storyboard, continuity, timeline, funding and delivery workflows.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button type="button" onClick={() => window.location.assign("/register?source=sora-migration")} className="gap-2 bg-amber-500 px-7 font-bold text-black hover:bg-amber-400">Start migration project <ArrowRight className="h-4 w-4" /></Button>
              <Button asChild variant="outline" className="gap-2 border-white/15 text-white"><a href="https://sora.chatgpt.com/sunset" target="_blank" rel="noopener noreferrer">Open official Sora export <ExternalLink className="h-4 w-4" /></a></Button>
            </div>
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-white/35">What the Sora product provided</p>
                <ul className="mt-5 space-y-3 text-sm text-white/55">
                  {["Prompt and reference driven video creation", "A dedicated web/app creation workspace", "Downloadable generated clips and project content", "Sora API access until the announced retirement date"].map(item => <li key={item} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />{item}</li>)}
                </ul>
              </div>
              <div className="rounded-2xl border border-amber-400/25 bg-amber-500/[0.05] p-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-300">What Virelle adds around your assets</p>
                <ul className="mt-5 space-y-3 text-sm text-white/65">
                  {["Script-to-storyboard planning before video credits", "Persistent characters, wardrobe, locations and continuity", "Versioned timeline with trims, transitions and audio mix", "EDL and FCPXML handoff for DaVinci Resolve and Premiere", "PDF/PPTX pitch decks, funding and crowdfunding tools", "Accessibility studio and 12-provider BYOK orchestration"].map(item => <li key={item} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />{item}</li>)}
                </ul>
              </div>
            </div>

            <div className="mt-14">
              <h2 className="text-center text-3xl font-bold text-gold-shimmer">Migration in four controlled steps</h2>
              <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {[
                  ["01", "Export", "Use OpenAI's official sunset export to retrieve your Sora content as soon as possible."],
                  ["02", "Import", "Create a Virelle project and upload exported clips, stills and reference assets into scenes and project libraries."],
                  ["03", "Rebuild the production spine", "Apply script breakdown, shot boards, cast, wardrobe, location and continuity controls around the imported material."],
                  ["04", "Edit and deliver", "Assemble versioned cuts, trim and transition clips, save an audio mix, then export EDL/FCPXML or compile in Virelle."],
                ].map(([number, title, description]) => <article key={number} className="rounded-2xl border border-white/10 bg-white/[0.025] p-5"><span className="text-sm font-black text-amber-300">{number}</span><h3 className="mt-3 font-semibold">{title}</h3><p className="mt-2 text-sm leading-relaxed text-white/45">{description}</p></article>)}
              </div>
            </div>

            <div className="mt-14 rounded-2xl border border-white/10 bg-black/25 p-6 text-center">
              <p className="text-sm text-white/45">Virelle Studios is independent from OpenAI. Sora and OpenAI are trademarks of their respective owner. Dates above reflect OpenAI's published discontinuation notice.</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default function LandingStrategicPositioningGuard() {
  const [positioningTarget, setPositioningTarget] = useState<HTMLElement | null>(null);
  const [providerTarget, setProviderTarget] = useState<HTMLElement | null>(null);
  const [showSoraPage, setShowSoraPage] = useState(() => isSoraPath());

  useEffect(() => {
    let disposed = false;

    const cleanup = () => {
      document.getElementById(POSITIONING_HOST_ID)?.remove();
      restoreProviderClaims();
      if (!disposed) {
        setPositioningTarget(null);
        setProviderTarget(null);
      }
    };

    const sync = () => {
      const sora = isSoraPath();
      setShowSoraPage(sora);
      if (!isLandingPath()) {
        cleanup();
        return;
      }
      const hero = findHeroSection();
      if (!hero) return;
      let target = document.getElementById(POSITIONING_HOST_ID);
      if (!target) {
        target = document.createElement("div");
        target.id = POSITIONING_HOST_ID;
        hero.insertAdjacentElement("afterend", target);
      }
      correctProviderClaims();
      const verifiedProviderTarget = document.getElementById(PROVIDER_HOST_ID);
      if (!disposed) {
        setPositioningTarget(current => current === target ? current : target);
        setProviderTarget(current => current === verifiedProviderTarget ? current : verifiedProviderTarget);
      }
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("popstate", sync);
    return () => {
      disposed = true;
      observer.disconnect();
      window.removeEventListener("popstate", sync);
      cleanup();
    };
  }, []);

  return (
    <>
      {positioningTarget ? createPortal(<StrategicPositioningSection />, positioningTarget) : null}
      {providerTarget ? createPortal(<ProviderList />, providerTarget) : null}
      {showSoraPage ? <SoraMigrationPage /> : null}
    </>
  );
}
