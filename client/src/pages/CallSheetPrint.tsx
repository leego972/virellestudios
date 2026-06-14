import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Printer, Loader2 } from "lucide-react";
import CallSheetView from "@/components/CallSheetView";

/** v6.63 — Printable call sheet page. window.print() outputs a clean PDF. */
export default function CallSheetPrint() {
  const { id, dayId } = useParams<{ id: string; dayId: string }>();
  const projectId = parseInt(id || "0");
  const shootDayId = parseInt(dayId || "0");
  const { data, isLoading } = trpc.callSheet.get.useQuery({ shootDayId }, { enabled: !!shootDayId });

  return (
    <div className="min-h-screen print:bg-white" style={{ background:"#07070e" }}>
      <div className="bg-zinc-900 text-zinc-100 px-4 py-3 print:hidden">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <Link href={`/projects/${projectId}/call-sheets`}>
            <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-zinc-100">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          </Link>
          <Button size="sm" onClick={() => window.print()} className="bg-amber-600 hover:bg-amber-500 text-zinc-950">
            <Printer className="w-4 h-4 mr-1" /> Print / Save PDF
          </Button>
        </div>
      </div>
      {isLoading ? (
        <div className="text-center py-16 text-zinc-500"><Loader2 className="w-6 h-6 animate-spin inline mr-2 text-amber-400" />Loading call sheet…</div>
      ) : !data ? (
        <div className="text-center py-16 text-zinc-500">Shoot day not found.</div>
      ) : (
        <div className="py-6 print:py-0">
          <CallSheetView data={data} printMode />
        </div>
      )}
    </div>
  );
}
