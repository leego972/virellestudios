import { useState } from "react";
import { useParams, Link } from "wouter";
import { NextStageCTA } from "@/components/NextStageCTA";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Printer, Download, FileText, Copy, Mail, Link as LinkIcon, Loader2 } from "lucide-react";
import SiteHead from "@/components/SiteHead";
import { toast } from "sonner";

interface KitState {
  tagline: string;
  synopsisShort: string;
  synopsisLong: string;
  directorBio: string;
  productionCompany: string;
  contactEmail: string;
  technicalSpecs: string;
  festivals: string;
  awards: string;
  pressQuotes: string;
}

export default function PressKit() {
  const { projectId } = useParams<{ projectId: string }>();
  const id = parseInt(projectId || "0");
  const { data: project } = trpc.project.get.useQuery({ id }, { enabled: !!id });
  const { data: characters } = trpc.character.listByProject.useQuery({ projectId: id }, { enabled: !!id });

  const [kit, setKit] = useState<KitState>({
    tagline: "",
    synopsisShort: "",
    synopsisLong: "",
    directorBio: "",
    productionCompany: "Virelle Studios",
    contactEmail: "",
    technicalSpecs: "",
    festivals: "",
    awards: "",
    pressQuotes: "",
  });

  const [emailDialog, setEmailDialog] = useState<{ open: boolean; recipients: string }>({ open: false, recipients: "" });

  function update<K extends keyof KitState>(k: K, v: KitState[K]) {
    setKit((prev) => ({ ...prev, [k]: v }));
  }

  const submitEmailDialog = () => {
    const list = emailDialog.recipients.split(/[,;\s]+/).map((s) => s.trim()).filter((s) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s));
    if (list.length === 0) { toast.error("No valid email addresses"); return; }
    emailKit.mutate({ projectId: id, recipients: list, kit });
    setEmailDialog({ open: false, recipients: "" });
  };

  const emailKit = trpc.featureFilm.emailPressKit.useMutation({
    onSuccess: (r: any) => toast.success(r?.message || "Press kit sent"),
    onError: (e: any) => toast.error(e?.message || "Failed to send press kit"),
  });

  function exportMarkdown() {
    const md = buildMarkdown(project?.title || "Untitled", kit, characters ?? []);
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project?.title || "press-kit"}-EPK.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function copyAll() {
    const md = buildMarkdown(project?.title || "Untitled", kit, characters ?? []);
    navigator.clipboard.writeText(md).then(() => toast.success("EPK copied to clipboard."));
  }

  return (
    <div className="min-h-screen pb-10" style={{ background:"linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)" }}>
    <div className="container mx-auto p-4 max-w-6xl space-y-6">
      <SiteHead title={`Press Kit Ã¢ÂÂ ${project?.title || "Project"}`} description={`Electronic Press Kit for ${project?.title || "your film"} Ã¢ÂÂ synopsis, technical specs, festival selections and press quotes.`} />
      <div className="flex items-center gap-3 print:hidden">
        <Link href={`/projects/${id}`}>
          <Button variant="ghost" size="sm" className="min-h-[44px]"><ArrowLeft className="h-4 w-4 mr-2" />Back to project</Button>
        </Link>
        <div>
          <div className="text-xs uppercase tracking-widest text-amber-500/80">Stage 8 ÃÂ· Release & Promote</div>
          <h1 className="font-serif text-3xl flex items-center gap-2 gradient-text-gold"><FileText className="h-6 w-6 text-amber-400" /> Press Kit Builder</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:grid-cols-1">
        <Card className="print:hidden glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
          <CardHeader>
            <CardTitle className="gradient-text-gold glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">EPK Inputs</CardTitle>
            <CardDescription>Fill in the fields. Preview updates live. Export, print, or paste into your distribution emails.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
            <div className="space-y-1.5"><Label>Tagline</Label><Input value={kit.tagline} onChange={(e) => update("tagline", e.target.value)} placeholder='"In a city of glass, the truth has cracks."' /></div>
            <div className="space-y-1.5"><Label>Short Synopsis (50-100 words)</Label><Textarea rows={3} value={kit.synopsisShort} onChange={(e) => update("synopsisShort", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Long Synopsis (250-400 words)</Label><Textarea rows={6} value={kit.synopsisLong} onChange={(e) => update("synopsisLong", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Director Bio</Label><Textarea rows={3} value={kit.directorBio} onChange={(e) => update("directorBio", e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Production Company</Label><Input value={kit.productionCompany} onChange={(e) => update("productionCompany", e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Contact Email</Label><Input type="email" value={kit.contactEmail} onChange={(e) => update("contactEmail", e.target.value)} /></div>
            </div>
            <div className="space-y-1.5"><Label>Technical Specs</Label><Textarea rows={2} value={kit.technicalSpecs} onChange={(e) => update("technicalSpecs", e.target.value)} placeholder="Runtime, format (DCP, ProRes 422 HQ), aspect ratio, audio mix, language(s), captions" /></div>
            <div className="space-y-1.5"><Label>Festivals & Selections</Label><Textarea rows={2} value={kit.festivals} onChange={(e) => update("festivals", e.target.value)} placeholder="One per line: 2026 Tribeca Film Festival Ã¢ÂÂ Official Selection" /></div>
            <div className="space-y-1.5"><Label>Awards</Label><Textarea rows={2} value={kit.awards} onChange={(e) => update("awards", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Press Quotes</Label><Textarea rows={3} value={kit.pressQuotes} onChange={(e) => update("pressQuotes", e.target.value)} placeholder='"A genuine knockout." Ã¢ÂÂ IndieWire' /></div>

            <div className="flex flex-wrap gap-2 pt-2">
              <Button onClick={() => window.print()} className="min-h-[44px] bg-amber-600 hover:bg-amber-500 text-black"><Printer className="h-4 w-4 mr-2" />Print / Save as PDF</Button>
              <Button variant="outline" onClick={exportMarkdown} className="min-h-[44px] hover:border-amber-500/50 hover:text-amber-400"><Download className="h-4 w-4 mr-2" />Export .md</Button>
              <Button variant="outline" onClick={copyAll} className="min-h-[44px] hover:border-amber-500/50 hover:text-amber-400"><Copy className="h-4 w-4 mr-2" />Copy all</Button>
              <Button variant="outline" onClick={() => setEmailDialog({ open: true, recipients: "" })} disabled={emailKit.isPending} className="min-h-[44px]" aria-label="Email press pack">
                {emailKit.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin text-amber-400" /> : <Mail className="h-4 w-4 mr-2" />}Email Press Pack
              </Button>
              <Button variant="outline" onClick={() => {
                const url = `${window.location.origin}/projects/${id}/press-kit`;
                navigator.clipboard.writeText(url).then(() => toast.success("Share link copied")).catch(() => toast.error("Could not copy"));
              }} className="min-h-[44px]"><LinkIcon className="h-4 w-4 mr-2" />Copy share link</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border border-white/10 text-foreground print:bg-white print:text-black print:shadow-none print:border-none lg:col-span-1 print:col-span-1 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
          <CardContent className="p-8 prose max-w-none glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
            <div className="space-y-1 mb-6">
              <div className="text-xs uppercase tracking-widest text-amber-700">Electronic Press Kit</div>
              <h1 className="text-3xl font-serif !mb-1 gradient-text-gold">{project?.title || "Untitled Project"}</h1>
              {kit.tagline && <p className="text-lg italic !mt-0">{kit.tagline}</p>}
            </div>
            {kit.synopsisShort && (
              <section className="mb-4">
                <h2 className="text-sm uppercase tracking-widest border-b pb-1 gradient-text-gold">Logline / Short Synopsis</h2>
                <p className="text-sm leading-relaxed">{kit.synopsisShort}</p>
              </section>
            )}
            {kit.synopsisLong && (
              <section className="mb-4">
                <h2 className="text-sm uppercase tracking-widest border-b pb-1 gradient-text-gold">Synopsis</h2>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{kit.synopsisLong}</p>
              </section>
            )}
            {(characters?.length ?? 0) > 0 && (
              <section className="mb-4">
                <h2 className="text-sm uppercase tracking-widest border-b pb-1 gradient-text-gold">Characters</h2>
                <ul className="text-sm pl-5 list-disc">
                  {(characters ?? []).slice(0, 8).map((c: any) => (<li key={c.id}><strong>{c.name}</strong>{c.description ? ` Ã¢ÂÂ ${c.description}` : ""}</li>))}
                </ul>
              </section>
            )}
            {kit.directorBio && (
              <section className="mb-4"><h2 className="text-sm uppercase tracking-widest border-b pb-1 gradient-text-gold">Director's Bio</h2><p className="text-sm leading-relaxed whitespace-pre-wrap">{kit.directorBio}</p></section>
            )}
            {kit.technicalSpecs && (
              <section className="mb-4"><h2 className="text-sm uppercase tracking-widest border-b pb-1 gradient-text-gold">Technical Specs</h2><p className="text-sm whitespace-pre-wrap">{kit.technicalSpecs}</p></section>
            )}
            {kit.festivals && (
              <section className="mb-4"><h2 className="text-sm uppercase tracking-widest border-b pb-1 gradient-text-gold">Festivals & Selections</h2><p className="text-sm whitespace-pre-wrap">{kit.festivals}</p></section>
            )}
            {kit.awards && (
              <section className="mb-4"><h2 className="text-sm uppercase tracking-widest border-b pb-1 gradient-text-gold">Awards</h2><p className="text-sm whitespace-pre-wrap">{kit.awards}</p></section>
            )}
            {kit.pressQuotes && (
              <section className="mb-4"><h2 className="text-sm uppercase tracking-widest border-b pb-1 gradient-text-gold">Press</h2><p className="text-sm italic whitespace-pre-wrap">{kit.pressQuotes}</p></section>
            )}
            <section className="border-t pt-3 mt-6 text-xs">
              <strong>{kit.productionCompany}</strong> {kit.contactEmail && <>ÃÂ· <a href={`mailto:${kit.contactEmail}`}>{kit.contactEmail}</a></>}
            </section>
          </CardContent>
        </Card>
      </div>
  {!!id && <NextStageCTA projectId={id} currentStage={8} />}

      <Dialog open={emailDialog.open} onOpenChange={(o) => setEmailDialog((s) => ({ ...s, open: o }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="gradient-text-gold">Email Press Pack</DialogTitle>
            <DialogDescription>Enter one or more email addresses, separated by commas.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="press-email-recipients">Recipients</Label>
            <Input
              id="press-email-recipients"
              value={emailDialog.recipients}
              onChange={(e) => setEmailDialog((s) => ({ ...s, recipients: e.target.value }))}
              placeholder="alice@example.com, bob@example.com"
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submitEmailDialog(); } }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailDialog({ open: false, recipients: "" })}>Cancel</Button>
            <Button onClick={submitEmailDialog} disabled={emailKit.isPending}>
              {emailKit.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin text-amber-400" aria-hidden="true" /> : <Mail className="h-4 w-4 mr-2" aria-hidden="true" />}
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function buildMarkdown(title: string, kit: KitState, characters: any[]): string {
  const lines: string[] = [];
  lines.push(`# ${title} Ã¢ÂÂ Electronic Press Kit\n`);
  if (kit.tagline) lines.push(`> _${kit.tagline}_\n`);
  if (kit.synopsisShort) lines.push(`## Logline / Short Synopsis\n\n${kit.synopsisShort}\n`);
  if (kit.synopsisLong) lines.push(`## Synopsis\n\n${kit.synopsisLong}\n`);
  if (characters.length) {
    lines.push(`## Characters\n`);
    for (const c of characters.slice(0, 8)) lines.push(`- **${c.name}**${c.description ? ` Ã¢ÂÂ ${c.description}` : ""}`);
    lines.push("");
  }
  if (kit.directorBio) lines.push(`## Director's Bio\n\n${kit.directorBio}\n`);
  if (kit.technicalSpecs) lines.push(`## Technical Specs\n\n${kit.technicalSpecs}\n`);
  if (kit.festivals) lines.push(`## Festivals & Selections\n\n${kit.festivals}\n`);
  if (kit.awards) lines.push(`## Awards\n\n${kit.awards}\n`);
  if (kit.pressQuotes) lines.push(`## Press\n\n${kit.pressQuotes}\n`);
  lines.push(`---\n**${kit.productionCompany}**${kit.contactEmail ? ` ÃÂ· ${kit.contactEmail}` : ""}`);
  return lines.join("\n");
}
