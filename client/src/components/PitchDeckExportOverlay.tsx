import { useEffect, useState } from "react";
import { Download, FileText, Loader2, Presentation, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createPitchDeckPdf,
  createPitchDeckPptx,
  downloadPitchDeckFile,
  type PitchDeckData,
} from "@/lib/pitchDeckExport";

const PITCH_DECK_PATH = /^\/projects\/(\d+)\/pitch-deck\/?$/;

function routeProjectId(): number | null {
  if (typeof window === "undefined") return null;
  const match = window.location.pathname.match(PITCH_DECK_PATH);
  if (!match) return null;
  const projectId = Number(match[1]);
  return Number.isFinite(projectId) && projectId > 0 ? projectId : null;
}

export default function PitchDeckExportOverlay() {
  const [projectId, setProjectId] = useState<number | null>(() => routeProjectId());
  const [open, setOpen] = useState(false);
  const [fundingAsk, setFundingAsk] = useState("");
  const [fundingUse, setFundingUse] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [exporting, setExporting] = useState<"pdf" | "pptx" | null>(null);
  const [progress, setProgress] = useState("");

  useEffect(() => {
    const syncRoute = () => {
      const next = routeProjectId();
      setProjectId(next);
      if (!next) setOpen(false);
    };
    syncRoute();
    const interval = window.setInterval(syncRoute, 750);
    window.addEventListener("popstate", syncRoute);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("popstate", syncRoute);
    };
  }, []);

  const deckQuery = trpc.pitchDeck.get.useQuery(
    { projectId: projectId! },
    { enabled: !!projectId },
  );

  if (!projectId) return null;

  const options = { fundingAsk, fundingUse, contactName, contactEmail };

  const runExport = async (format: "pdf" | "pptx") => {
    if (!deckQuery.data) {
      toast.error("Pitch deck data is still loading.");
      return;
    }
    setExporting(format);
    setProgress("Preparing deck");
    try {
      const progressCallback = (stage: string, done: number, total: number) => {
        setProgress(`${stage} ${done}/${total}`);
      };
      const result = format === "pdf"
        ? await createPitchDeckPdf(deckQuery.data as PitchDeckData, options, progressCallback)
        : await createPitchDeckPptx(deckQuery.data as PitchDeckData, options, progressCallback);
      downloadPitchDeckFile(result.blob, result.filename);
      toast.success(`${format === "pdf" ? "PDF" : "PowerPoint"} pitch deck exported`);
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Pitch deck export failed.");
    } finally {
      setExporting(null);
      setProgress("");
    }
  };

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-[70] h-12 gap-2 rounded-full border border-amber-300/30 bg-[#15130d] px-5 text-amber-100 shadow-2xl shadow-black/50 hover:bg-[#211d10]"
      >
        <Download className="h-4 w-4 text-amber-300" />
        Export pitch deck
      </Button>

      <Dialog open={open} onOpenChange={nextOpen => !exporting && setOpen(nextOpen)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Presentation className="h-5 w-5 text-amber-500" /> Professional pitch deck export</DialogTitle>
            <DialogDescription>
              Virelle will assemble the project logline, synopsis, character sheets, key art, storyboard frames, production plan and funding ask into shareable 16:9 files.
            </DialogDescription>
          </DialogHeader>

          {deckQuery.isLoading ? (
            <div className="flex min-h-40 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-amber-500" /></div>
          ) : deckQuery.error ? (
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300">{deckQuery.error.message}</div>
          ) : (
            <div className="grid gap-4 py-2 sm:grid-cols-2">
              <div className="space-y-1.5"><Label htmlFor="pitch-funding-ask">Funding ask</Label><Input id="pitch-funding-ask" value={fundingAsk} onChange={event => setFundingAsk(event.target.value)} placeholder="e.g. AUD $750,000 equity and gap financing" maxLength={300} /></div>
              <div className="space-y-1.5"><Label htmlFor="pitch-contact-name">Contact name</Label><Input id="pitch-contact-name" value={contactName} onChange={event => setContactName(event.target.value)} placeholder="Producer / project owner" maxLength={200} /></div>
              <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="pitch-funding-use">Use of funds</Label><Textarea id="pitch-funding-use" value={fundingUse} onChange={event => setFundingUse(event.target.value)} rows={4} maxLength={2000} placeholder="Production, post, accessibility, marketing, festival and distribution allocation" /></div>
              <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="pitch-contact-email">Contact email</Label><Input id="pitch-contact-email" type="email" value={contactEmail} onChange={event => setContactEmail(event.target.value)} placeholder="producer@example.com" maxLength={320} /></div>
              <div className="sm:col-span-2 rounded-xl border border-amber-500/15 bg-amber-500/[0.04] p-3 text-xs leading-relaxed text-zinc-500">
                <Settings2 className="mr-2 inline h-4 w-4 text-amber-400" />
                Images are embedded when the storage host permits browser access. If an image cannot be downloaded, the export remains valid and uses the project text and remaining artwork.
              </div>
            </div>
          )}

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={!!exporting}>Cancel</Button>
            <Button variant="outline" className="gap-2" disabled={!!exporting || !deckQuery.data} onClick={() => void runExport("pdf")}>
              {exporting === "pdf" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              {exporting === "pdf" ? progress || "Exporting PDF" : "Download PDF"}
            </Button>
            <Button className="gap-2 bg-amber-500 text-black hover:bg-amber-400" disabled={!!exporting || !deckQuery.data} onClick={() => void runExport("pptx")}>
              {exporting === "pptx" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Presentation className="h-4 w-4" />}
              {exporting === "pptx" ? progress || "Exporting PowerPoint" : "Download PPTX"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
