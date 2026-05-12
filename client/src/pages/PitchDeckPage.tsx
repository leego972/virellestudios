// v6.68 Phase 10 — Pitch Deck (print-friendly).
// Renders all the data needed to pitch a project on a single page. Print to PDF
// from the browser; no heavy PDF dependency added.

import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import SiteHead from "@/components/SiteHead";

export default function PitchDeckPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = Number(params?.projectId);
  const deckQ = trpc.pitchDeck.get.useQuery(
    { projectId },
    { enabled: Number.isFinite(projectId) },
  );
  const d: any = deckQ.data;

  return (
    <div className="min-h-screen bg-white text-zinc-900 px-8 py-10 print:py-4">
      <SiteHead title={`Pitch Deck — ${d?.title ?? "Project"}`} />
      <div className="max-w-4xl mx-auto space-y-10">
        <div className="flex items-center justify-between print:hidden">
          <Link
            href={`/projects/${projectId}`}
            className="text-xs bg-zinc-200 hover:bg-zinc-300 px-3 py-1.5 rounded text-zinc-700"
          >
            ← Back
          </Link>
          <button
            onClick={() => window.print()}
            className="bg-amber-500 hover:bg-amber-400 text-black px-4 py-2 rounded text-sm font-medium"
          >
            Print / save as PDF
          </button>
        </div>

        {deckQ.isLoading && (
          <div className="text-sm text-zinc-500">Building pitch deck…</div>
        )}

        {d && (
          <>
            <header className="text-center border-b border-zinc-200 pb-8">
              <div className="text-xs uppercase tracking-[0.3em] text-amber-700">
                Virelle Studios
              </div>
              <h1 className="text-5xl font-semibold mt-3">{d.title}</h1>
              {d.logline && (
                <p className="mt-4 text-lg text-zinc-600 italic max-w-2xl mx-auto">
                  {d.logline}
                </p>
              )}
              <div className="mt-4 text-xs text-zinc-500">
                {[d.genre, d.rating, d.tone].filter(Boolean).join(" · ")}
              </div>
            </header>

            {d.synopsis && (
              <Section title="Synopsis">
                <p className="text-zinc-700 whitespace-pre-wrap">{d.synopsis}</p>
              </Section>
            )}

            {d.themes && (
              <Section title="Themes">
                <p className="text-zinc-700 whitespace-pre-wrap">{d.themes}</p>
              </Section>
            )}

            {d.characters && d.characters.length > 0 && (
              <Section title="Characters">
                <div className="grid grid-cols-2 gap-4">
                  {d.characters.map((c: any) => (
                    <div key={c.id} className="border border-zinc-200 rounded p-3">
                      {c.referenceImages?.[0] && (
                        <img
                          src={c.referenceImages[0]}
                          alt={c.name}
                          className="w-full h-40 object-cover rounded mb-2"
                        />
                      )}
                      <div className="font-medium">{c.name}</div>
                      {c.description && (
                        <div className="text-xs text-zinc-500 mt-1">{c.description}</div>
                      )}
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {d.moodBoard && d.moodBoard.length > 0 && (
              <Section title="Mood board">
                <div className="grid grid-cols-3 gap-2">
                  {d.moodBoard.slice(0, 12).map((m: any, i: number) => (
                    <img
                      key={i}
                      src={m.imageUrl ?? m}
                      alt=""
                      className="w-full h-32 object-cover rounded"
                    />
                  ))}
                </div>
              </Section>
            )}

            {d.scenes && d.scenes.length > 0 && (
              <Section title="Storyboard frames">
                <div className="grid grid-cols-2 gap-3">
                  {d.scenes.slice(0, 8).map((s: any) => (
                    <div key={s.id} className="border border-zinc-200 rounded overflow-hidden">
                      {s.thumbnailUrl && (
                        <img
                          src={s.thumbnailUrl}
                          alt={s.title ?? ""}
                          className="w-full h-44 object-cover"
                        />
                      )}
                      <div className="p-2 text-xs">
                        <div className="font-medium">
                          Scene {s.sceneNumber}: {s.title}
                        </div>
                        {s.description && (
                          <div className="text-zinc-500 line-clamp-2 mt-1">
                            {s.description}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {d.budgetEstimate && (
              <Section title="Budget estimate">
                <p className="text-zinc-700">{d.budgetEstimate}</p>
              </Section>
            )}

            {d.productionPlan && (
                <Section title="Production plan">
                  <p className="text-zinc-700 whitespace-pre-wrap">
                    {typeof d.productionPlan === "string"
                      ? d.productionPlan
                      : d.productionPlan?.shootDays != null
                      ? `${d.productionPlan.shootDays} shoot day${d.productionPlan.shootDays !== 1 ? "s" : ""}.`
                      : "See project for details."}
                  </p>
                </Section>
              )}

              {d.budget && (
                <Section title="Budget estimate">
                  <p className="font-semibold text-zinc-700 mb-2">
                    Total: {new Intl.NumberFormat("en-US", { style: "currency", currency: d.budget.currency ?? "USD" }).format(Number(d.budget.total ?? 0))}
                  </p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-zinc-500">
                    {Object.entries(d.budget.byCategory ?? {}).map(([k, v]: any) => (
                      <div key={k} className="flex justify-between">
                        <span className="capitalize">{k}</span>
                        <span>{new Intl.NumberFormat("en-US", { style: "currency", currency: d.budget.currency ?? "USD" }).format(Number(v))}</span>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {d.providerStack && (
                <Section title="AI Provider Stack">
                  <div className="grid grid-cols-2 gap-3 text-sm text-zinc-700">
                    <div><span className="text-zinc-400">Video: </span>{d.providerStack.video ?? "Platform default"}</div>
                    <div><span className="text-zinc-400">LLM: </span>{d.providerStack.llm ?? "Platform default"}</div>
                    <div><span className="text-zinc-400">Fallback: </span>{d.providerStack.fallbackMode ?? "byok_with_consent"}</div>
                    <div><span className="text-zinc-400">Keys: </span>{d.providerStack.configuredCount ?? 0} configured</div>
                  </div>
                </Section>
              )}

              <footer className="text-center text-xs text-zinc-400 pt-8 border-t border-zinc-200">
              Generated with Virelle Studios — virelle.studio
            </footer>
          </>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xs uppercase tracking-wider text-amber-700 mb-3">{title}</h2>
      {children}
    </section>
  );
}
