import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useParams } from "wouter";
import {
  FileDown,
  Loader2,
  Presentation,
  Printer,
  Save,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import SiteHead from "@/components/SiteHead";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  buildPitchDeckSlides,
  createPitchDeckPdf,
  createPitchDeckPptx,
  downloadPitchDeckFile,
  type InvestorFields,
  type PitchDeckData,
} from "@/lib/pitchDeckFileExport";
import { trpc } from "@/lib/trpc";

const DEFAULT_INVESTOR_FIELDS: InvestorFields = {
  fundingAsk: "Funding ask to be confirmed",
  useOfFunds: "Production, post-production, accessibility, distribution, marketing and contingency",
  targetAudience: "Define the primary audience, secondary audience and territory focus",
  marketPosition: "State the project's distinctive commercial and creative position",
  distributionStrategy: "Festivals, sales agents, distributors, broadcasters, streaming and direct audience release",
  contactLine: "Virelle Studios project team",
};

function display(value: unknown, fallback = "Not yet specified"): string {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") return value.trim() || fallback;
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    const result = value.map(item => display(item, "")).filter(Boolean).join(", ");
    return result || fallback;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const total = record.total ?? record.totalEstimate ?? record.amount;
    if (total !== undefined) {
      const currency = typeof record.currency === "string" ? record.currency : "";
      const numeric = Number(total);
      return `${currency ? `${currency} ` : ""}${Number.isFinite(numeric) ? numeric.toLocaleString() : String(total)}`;
    }
    const result = Object.entries(record)
      .map(([key, item]) => `${key.replace(/([A-Z])/g, " $1")}: ${display(item, "")}`)
      .filter(item => !item.endsWith(": "))
      .join(" · ");
    return result || fallback;
  }
  return String(value);
}

function PitchSlide({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="pitch-slide break-after-page overflow-hidden rounded-2xl border border-amber-400/15 bg-[#090910] p-8 shadow-2xl print:min-h-[185mm] print:rounded-none print:border-0 print:shadow-none">
      <div className="mb-6 flex items-center gap-3">
        <div className="h-8 w-1 rounded-full bg-amber-400" />
        <h2 className="text-xs font-bold uppercase tracking-[0.24em] text-amber-300">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

export default function PitchDeckPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = Number(params.projectId);
  const validProjectId = Number.isFinite(projectId) && projectId > 0;
  const storageKey = `virelle:pitch-deck:${projectId}:investor-fields`;
  const [investor, setInvestor] = useState<InvestorFields>(DEFAULT_INVESTOR_FIELDS);
  const [exporting, setExporting] = useState<"pdf" | "pptx" | null>(null);

  const deckQuery = trpc.pitchDeck.get.useQuery(
    { projectId },
    { enabled: validProjectId },
  );
  const data = deckQuery.data as PitchDeckData | undefined;

  useEffect(() => {
    if (!validProjectId) return;
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) {
        setInvestor({
          ...DEFAULT_INVESTOR_FIELDS,
          ...(JSON.parse(saved) as Partial<InvestorFields>),
        });
      }
    } catch {
      // Invalid browser data is ignored in favour of safe defaults.
    }
  }, [storageKey, validProjectId]);

  const slides = useMemo(
    () => (data ? buildPitchDeckSlides(data, investor) : []),
    [data, investor],
  );

  const saveFields = () => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(investor));
      toast.success("Investor fields saved for this project.");
    } catch {
      toast.error("Investor fields could not be saved in this browser.");
    }
  };

  const exportDeck = (format: "pdf" | "pptx") => {
    if (!data) return;
    setExporting(format);
    try {
      const file =
        format === "pdf"
          ? createPitchDeckPdf(data, investor)
          : createPitchDeckPptx(data, investor);
      downloadPitchDeckFile(file);
      toast.success(
        format === "pdf"
          ? "Pitch deck PDF downloaded."
          : "Editable PowerPoint deck downloaded.",
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Pitch deck export failed.",
      );
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#07070e_0%,#0c0b18_60%,#07070a_100%)] px-4 py-6 text-zinc-100 print:bg-white print:p-0 print:text-black">
      <SiteHead title={`Pitch Deck — ${data?.title ?? "Project"}`} />
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 0; }
          .pitch-slide {
            width: 297mm;
            min-height: 210mm;
            padding: 18mm;
            page-break-after: always;
            color: white !important;
            background: #090910 !important;
          }
          .pitch-slide:last-child { page-break-after: auto; }
        }
      `}</style>

      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link
            href={`/projects/${projectId}`}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-300 hover:bg-white/10"
          >
            ← Back to project
          </Link>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="gap-2 border-white/10"
              onClick={() => window.print()}
            >
              <Printer className="h-4 w-4" />
              Print
            </Button>
            <Button
              variant="outline"
              className="gap-2 border-white/10"
              onClick={() => exportDeck("pdf")}
              disabled={!data || exporting !== null}
            >
              {exporting === "pdf" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="h-4 w-4" />
              )}
              Download PDF
            </Button>
            <Button
              className="gap-2 bg-amber-500 text-black hover:bg-amber-400"
              onClick={() => exportDeck("pptx")}
              disabled={!data || exporting !== null}
            >
              {exporting === "pptx" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Presentation className="h-4 w-4" />
              )}
              Download PPTX
            </Button>
          </div>
        </div>

        {deckQuery.isLoading && (
          <div className="flex min-h-[400px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
          </div>
        )}

        {deckQuery.error && (
          <Card className="border-red-500/30 bg-red-500/5">
            <CardContent className="py-8 text-center text-sm text-red-200">
              {deckQuery.error.message}
            </CardContent>
          </Card>
        )}

        {data && (
          <>
            <Card className="border-amber-400/20 bg-black/25 print:hidden">
              <CardContent className="space-y-4 pt-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-amber-400" />
                      <h2 className="font-semibold">
                        Investor and market details
                      </h2>
                    </div>
                    <p className="mt-1 max-w-3xl text-xs text-zinc-500">
                      Project, character, storyboard, budget and production data
                      load automatically. Complete the commercial fields before
                      exporting.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2 border-white/10"
                    onClick={saveFields}
                  >
                    <Save className="h-4 w-4" />
                    Save fields
                  </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Funding ask</Label>
                    <Input
                      value={investor.fundingAsk}
                      onChange={event =>
                        setInvestor(current => ({
                          ...current,
                          fundingAsk: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Contact / presenter</Label>
                    <Input
                      value={investor.contactLine}
                      onChange={event =>
                        setInvestor(current => ({
                          ...current,
                          contactLine: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <Label>Use of funds</Label>
                    <Textarea
                      rows={2}
                      value={investor.useOfFunds}
                      onChange={event =>
                        setInvestor(current => ({
                          ...current,
                          useOfFunds: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Target audience</Label>
                    <Textarea
                      rows={3}
                      value={investor.targetAudience}
                      onChange={event =>
                        setInvestor(current => ({
                          ...current,
                          targetAudience: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Market position</Label>
                    <Textarea
                      rows={3}
                      value={investor.marketPosition}
                      onChange={event =>
                        setInvestor(current => ({
                          ...current,
                          marketPosition: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <Label>Distribution strategy</Label>
                    <Textarea
                      rows={3}
                      value={investor.distributionStrategy}
                      onChange={event =>
                        setInvestor(current => ({
                          ...current,
                          distributionStrategy: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <PitchSlide title="Virelle Studios · Investor Pitch">
              <div className="flex min-h-[430px] flex-col items-center justify-center text-center">
                <Badge className="bg-amber-400/10 text-amber-300">
                  {[data.genre, data.rating, data.tone]
                    .filter(Boolean)
                    .join(" · ") || "Screen project"}
                </Badge>
                <h1 className="mt-6 text-5xl font-semibold text-amber-100 sm:text-7xl">
                  {data.title}
                </h1>
                <p className="mt-6 max-w-3xl text-xl italic leading-relaxed text-zinc-300">
                  {display(data.logline, "Logline in development")}
                </p>
                <p className="mt-10 text-sm text-zinc-500">
                  {investor.contactLine}
                </p>
              </div>
            </PitchSlide>

            <PitchSlide title="Story">
              <h2 className="text-3xl font-semibold text-white">Synopsis</h2>
              <p className="mt-6 whitespace-pre-wrap text-lg leading-relaxed text-zinc-300">
                {display(data.synopsis ?? data.description)}
              </p>
              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {[
                  `Genre: ${display(data.genre)}`,
                  `Tone: ${display(data.tone)}`,
                  `Themes: ${display(data.themes)}`,
                ].map(item => (
                  <div
                    key={item}
                    className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-zinc-300"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </PitchSlide>

            {data.characters && data.characters.length > 0 && (
              <PitchSlide title="Characters">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {data.characters.slice(0, 8).map(character => (
                    <div
                      key={character.id ?? character.name}
                      className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
                    >
                      <h3 className="font-medium text-amber-100">
                        {character.name}
                      </h3>
                      <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                        {display(character.description ?? character.role)}
                      </p>
                    </div>
                  ))}
                </div>
              </PitchSlide>
            )}

            {data.scenes && data.scenes.length > 0 && (
              <PitchSlide title="Storyboard">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {data.scenes.slice(0, 8).map((scene, index) => (
                    <div
                      key={scene.id ?? index}
                      className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]"
                    >
                      {scene.thumbnailUrl ? (
                        <img
                          src={scene.thumbnailUrl}
                          alt={scene.title || "Storyboard frame"}
                          className="h-36 w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-36 items-center justify-center bg-black/25 text-xs text-zinc-600">
                          Frame pending
                        </div>
                      )}
                      <div className="p-3">
                        <h3 className="text-sm font-medium text-amber-100">
                          Scene {scene.sceneNumber ?? index + 1}: {scene.title}
                        </h3>
                        <p className="mt-1 line-clamp-3 text-xs text-zinc-500">
                          {scene.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </PitchSlide>
            )}

            <PitchSlide title="Production and Finance">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                  <h3 className="text-xl font-semibold text-amber-100">
                    Production plan
                  </h3>
                  <p className="mt-4 whitespace-pre-wrap leading-relaxed text-zinc-300">
                    {display(data.productionPlan)}
                  </p>
                </div>
                <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.05] p-6">
                  <h3 className="text-xl font-semibold text-amber-100">
                    Funding
                  </h3>
                  <p className="mt-4 text-sm text-zinc-400">
                    Current budget estimate
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-white">
                    {display(data.budgetEstimate, "To be finalised")}
                  </p>
                  <p className="mt-5 text-sm text-zinc-400">Funding ask</p>
                  <p className="mt-1 text-xl font-medium text-amber-200">
                    {investor.fundingAsk}
                  </p>
                  <p className="mt-5 text-sm leading-relaxed text-zinc-300">
                    {investor.useOfFunds}
                  </p>
                </div>
              </div>
            </PitchSlide>

            <PitchSlide title="Audience and Distribution">
              <div className="grid gap-5 md:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <h3 className="font-semibold text-amber-100">Audience</h3>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-300">
                    {investor.targetAudience}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <h3 className="font-semibold text-amber-100">Positioning</h3>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-300">
                    {investor.marketPosition}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <h3 className="font-semibold text-amber-100">Distribution</h3>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-300">
                    {investor.distributionStrategy}
                  </p>
                </div>
              </div>
            </PitchSlide>

            <PitchSlide title="The Ask">
              <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
                <Presentation className="h-12 w-12 text-amber-300" />
                <h2 className="mt-6 text-4xl font-semibold text-white">
                  Partner with {data.title}
                </h2>
                <p className="mt-5 max-w-3xl text-xl text-amber-200">
                  {investor.fundingAsk}
                </p>
                <p className="mt-5 max-w-3xl leading-relaxed text-zinc-300">
                  {investor.useOfFunds}
                </p>
                <p className="mt-10 text-sm text-zinc-500">
                  {investor.contactLine}
                </p>
              </div>
            </PitchSlide>

            <div className="print:hidden rounded-xl border border-white/10 bg-black/20 p-4 text-xs text-zinc-500">
              The downloadable deck contains {slides.length} structured 16:9
              slides generated from the same project and investor data shown
              above.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
