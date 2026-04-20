import { useMemo, useState } from "react";
import { Link, useParams } from "wouter";
import { NextStageCTA } from "@/components/NextStageCTA";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  ExternalLink,
  Sparkles,
  Loader2,
  Copy,
  Mail,
  Building2,
  Send,
} from "lucide-react";
import { toast } from "sonner";

const BRAND_KEYWORDS = [
  "brand",
  "product placement",
  "sponsorship",
  "co-marketing",
  "co-branded",
  "advertis",
  "integration",
];

function isBrandSource(s: any): boolean {
  const pack = (s.packType || "").toLowerCase();
  if (pack.includes("brand") || pack.includes("sponsor")) return true;
  const haystack = `${s.organization || ""} ${s.type || ""} ${s.supports || ""}`.toLowerCase();
  return BRAND_KEYWORDS.some((k) => haystack.includes(k));
}

interface BriefState {
  contactName: string;
  contactRole: string;
  brandFit: string;
  integrationIdea: string;
  ask: string;
  audience: string;
  format: string;
  genre: string;
}

function buildPrompt(b: BriefState, projectTitle: string, brand: any) {
  return `Write a personalized cold-outreach email to a brand partnerships contact about an integration in our project.

Project: "${projectTitle}"
Format: ${b.format} · Genre: ${b.genre}
Audience: ${b.audience}

Brand: ${brand?.organization || "[brand]"}
Brand notes: ${brand?.supports || "n/a"}
Contact: ${b.contactName || "[Name]"} (${b.contactRole || "Brand Partnerships"})
Why this brand fits the story: ${b.brandFit}
Integration idea: ${b.integrationIdea}
The ask (e.g. $25k cash + product, or in-kind only): ${b.ask}

Constraints: ≤180 words, conversational but precise, lead with the brand-relevant story beat (not us), include 1 specific integration moment, end with a clear next step (15-min call). No emojis, no buzzwords. Subject line on the first line.`;
}

export default function BrandOutreach() {
  const params = useParams<{ projectId?: string }>();
  const projectId = parseInt(params.projectId || "0");
  const hasProject = !!projectId;

  const { data: sources } = trpc.funding.list.useQuery({});
  const { data: project } = trpc.project.get.useQuery(
    { id: projectId },
    { enabled: hasProject }
  );

  const brands = useMemo(
    () => (sources ?? []).filter(isBrandSource),
    [sources]
  );

  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return brands;
    return brands.filter(
      (p: any) =>
        (p.organization || "").toLowerCase().includes(s) ||
        (p.country || "").toLowerCase().includes(s) ||
        (p.supports || "").toLowerCase().includes(s)
    );
  }, [brands, search]);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = useMemo(
    () => brands.find((b: any) => b.id === selectedId) || null,
    [brands, selectedId]
  );

  const [brief, setBrief] = useState<BriefState>({
    contactName: "",
    contactRole: "Brand Partnerships",
    brandFit: "",
    integrationIdea: "",
    ask: "",
    audience: "",
    format: "Feature",
    genre: "",
  });
  const [generating, setGenerating] = useState(false);
  const [draft, setDraft] = useState("");

  const sendMessage = trpc.directorChat.send.useMutation();
  const { data: history, refetch: refetchHistory } = trpc.directorChat.history.useQuery(
    { projectId },
    { enabled: hasProject, refetchInterval: 4000 }
  );

  async function generate() {
    if (!hasProject) {
      toast.error("Open this from a project to generate copy.");
      return;
    }
    if (!selected) {
      toast.error("Pick a brand on the left first.");
      return;
    }
    if (!brief.brandFit.trim() || !brief.integrationIdea.trim()) {
      toast.error("Fill in brand fit + integration idea.");
      return;
    }
    setGenerating(true);
    try {
      const tag = `brandOutreach:${selected.id}`;
      await sendMessage.mutateAsync({
        projectId,
        message: `[BrandOutreach:${selected.id}]\n\n${buildPrompt(brief, project?.title || "Untitled", selected)}`,
      });
      const fresh = await refetchHistory();
      const latest = (fresh.data ?? [])
        .slice()
        .reverse()
        .find(
          (m: any) =>
            m.role === "assistant" &&
            (m.content || "").toString().includes(""),
        );
      if (latest) setDraft((latest as any).content as string);
      toast.success("Draft ready.");
    } catch (e: any) {
      toast.error(e?.message || "Generation failed.");
    } finally {
      setGenerating(false);
    }
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("Copied.");
  }

  function mailto() {
    if (!draft || !selected) return;
    const lines = draft.split("\n").filter((l) => l.trim());
    const subject = (lines[0] || "Partnership inquiry").replace(/^subject:\s*/i, "");
    const body = lines.slice(1).join("\n").trim();
    const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = url;
  }

  return (
    <div className="container max-w-6xl py-6 space-y-6">
      <div className="flex items-center justify-between">
        <Link href={hasProject ? `/projects/${projectId}` : "/funding"}>
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        </Link>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Building2 className="h-4 w-4" /> Brand Outreach Desk
        </div>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Brand Outreach Desk</h1>
        <p className="text-muted-foreground mt-1">
          {brands.length} brand & sponsor desks · pitch tailored cold emails for product placement, integrations, and co-marketing.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Brands */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Brands & Sponsor Desks</CardTitle>
            <CardDescription>Pick one to draft outreach.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Search brands…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
              {filtered.map((p: any) => {
                const active = p.id === selectedId;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedId(p.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      active
                        ? "border-primary bg-accent/60"
                        : "hover:border-primary/50 hover:bg-accent/30"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{p.organization}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {p.country}{p.type ? ` · ${p.type}` : ""}
                        </div>
                      </div>
                      {p.website && (
                        <a
                          href={p.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="shrink-0"
                        >
                          <ExternalLink className="h-3 w-3 text-muted-foreground mt-0.5" />
                        </a>
                      )}
                    </div>
                    {p.supports && (
                      <div className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
                        {p.supports}
                      </div>
                    )}
                  </button>
                );
              })}
              {filtered.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No brand desks match.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* AI outreach drafter */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> Outreach Drafter
            </CardTitle>
            <CardDescription>
              {selected
                ? `Drafting for ${selected.organization}.`
                : "Pick a brand on the left to start."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Contact name (optional)</Label>
                <Input value={brief.contactName} onChange={(e) => setBrief({ ...brief, contactName: e.target.value })} placeholder="Jordan Lee" />
              </div>
              <div>
                <Label className="text-xs">Contact role</Label>
                <Input value={brief.contactRole} onChange={(e) => setBrief({ ...brief, contactRole: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Format</Label>
                <Input value={brief.format} onChange={(e) => setBrief({ ...brief, format: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Genre</Label>
                <Input value={brief.genre} onChange={(e) => setBrief({ ...brief, genre: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs">Audience</Label>
                <Input value={brief.audience} onChange={(e) => setBrief({ ...brief, audience: e.target.value })} placeholder="Urban 25-44, eco-curious" />
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs">Why this brand fits the story *</Label>
                <Textarea
                  rows={2}
                  value={brief.brandFit}
                  onChange={(e) => setBrief({ ...brief, brandFit: e.target.value })}
                  placeholder="The protagonist's lifestyle / setting overlaps with this brand's customer."
                />
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs">Integration idea *</Label>
                <Textarea
                  rows={2}
                  value={brief.integrationIdea}
                  onChange={(e) => setBrief({ ...brief, integrationIdea: e.target.value })}
                  placeholder="A specific scene, prop, or co-marketing moment."
                />
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs">The ask</Label>
                <Input
                  value={brief.ask}
                  onChange={(e) => setBrief({ ...brief, ask: e.target.value })}
                  placeholder="$25k + product, or in-kind only"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={generate} disabled={generating || !selected || !hasProject} className="gap-2" size="sm">
                {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Mail className="h-3 w-3" />}
                Draft email
              </Button>
              {draft && (
                <>
                  <Button onClick={() => copy(draft)} variant="secondary" size="sm" className="gap-2">
                    <Copy className="h-3 w-3" /> Copy
                  </Button>
                  <Button onClick={mailto} variant="secondary" size="sm" className="gap-2">
                    <Send className="h-3 w-3" /> Open in mail
                  </Button>
                </>
              )}
            </div>

            {draft && (
              <div className="border rounded-lg p-3 bg-muted/30">
                <Badge variant="outline" className="text-[10px] uppercase mb-2">
                  Draft for {selected?.organization}
                </Badge>
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{draft}</pre>
              </div>
            )}

            {!draft && history && hasProject && (
              <p className="text-xs text-muted-foreground">
                {history.length} message{history.length === 1 ? "" : "s"} in director chat history.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
  {!!projectId && <NextStageCTA projectId={projectId} currentStage={5} />}
    </div>
  );
}
