import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle,
  Gift,
  Loader2,
  PackageOpen,
  RefreshCw,
  Shirt,
} from "lucide-react";

function isStudioOpenerActive(): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  if (new URLSearchParams(window.location.search).get("opener") === "1") return true;

  return Array.from(document.body.children).some(node => {
    if (!(node instanceof HTMLElement)) return false;
    const style = window.getComputedStyle(node);
    const zIndex = Number.parseInt(style.zIndex || "0", 10);
    return style.position === "fixed" && zIndex >= 9000;
  });
}

export default function WelcomeOutfitPicker() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const utils = trpc.useUtils();
  const [openerReady, setOpenerReady] = useState(() => !isStudioOpenerActive());

  useEffect(() => {
    if (!isAuthenticated) {
      setOpenerReady(false);
      return;
    }

    let sawOpener = isStudioOpenerActive();
    if (!sawOpener) {
      setOpenerReady(true);
      return;
    }

    setOpenerReady(false);
    const timer = window.setInterval(() => {
      const active = isStudioOpenerActive();
      sawOpener ||= active;
      if (sawOpener && !active) {
        window.clearInterval(timer);
        window.setTimeout(() => setOpenerReady(true), 150);
      }
    }, 100);

    return () => window.clearInterval(timer);
  }, [isAuthenticated]);
  const { data: gift } =
    (trpc as any).lamaloGifts?.hasClaimedGift?.useQuery?.(
      undefined,
      { enabled: Boolean(isAuthenticated && !authLoading && openerReady) },
    ) ?? {};

  const {
    data: outfits = [],
    isLoading: outfitsLoading,
    error: outfitsError,
    refetch: refetchOutfits,
  } =
    (trpc as any).lamaloGifts?.getStarterOutfits?.useQuery?.(
      undefined,
      { enabled: Boolean(isAuthenticated && openerReady && gift?.eligible && !gift?.claimed) },
    ) ?? {};

  const claimMut = (trpc as any).lamaloGifts?.claimGift?.useMutation?.({
    onSuccess: async () => {
      toast.success(
        "Your 2 free Lamalo virtual outfits are now in your wardrobe inventory.",
      );
      setSelected([]);
      setOpen(false);
      await Promise.allSettled([
        (utils as any).lamaloGifts?.hasClaimedGift?.invalidate?.(),
        (utils as any).wardrobeMarket?.leasing?.myInventory?.invalidate?.(),
      ]);
    },
    onError: (error: any) =>
      toast.error(error?.message ?? "Something went wrong"),
  });

  const [selected, setSelected] = useState<number[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (openerReady && gift?.eligible && !gift?.claimed) setOpen(true);
  }, [gift?.claimed, gift?.eligible, openerReady]);

  if (authLoading || !isAuthenticated || !openerReady || !gift?.eligible || gift?.claimed) return null;

  const toggle = (id: number) => {
    setSelected(previous =>
      previous.includes(id)
        ? previous.filter(itemId => itemId !== id)
        : previous.length < 2
          ? [...previous, id]
          : previous,
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        data-lamalo-welcome-dialog
        className="w-[calc(100vw-1rem)] max-w-4xl max-h-[calc(100dvh-1rem)] overflow-y-auto border-amber-500/35 bg-[#0b0b0d] shadow-2xl shadow-black/60 dark:bg-[#fffaf0] dark:shadow-black/20 sm:w-[95vw] sm:max-h-[88vh]"
      >
        <style>{`
          :root:not(.dark) [data-lamalo-welcome-dialog] {
            background: #0b0b0d !important;
            color: #fff4c2 !important;
          }
          :root:not(.dark) [data-lamalo-welcome-dialog] [data-slot="dialog-title"] {
            color: #ffd76a !important;
            -webkit-text-fill-color: #ffd76a !important;
          }
          :root:not(.dark) [data-lamalo-welcome-dialog] [data-slot="dialog-description"],
          :root:not(.dark) [data-lamalo-welcome-dialog] [data-lamalo-copy],
          :root:not(.dark) [data-lamalo-welcome-dialog] [data-lamalo-selection] {
            color: #fff4c2 !important;
            -webkit-text-fill-color: #fff4c2 !important;
            opacity: 1 !important;
          }
          :root:not(.dark) [data-lamalo-welcome-dialog] [data-lamalo-secondary] {
            color: #fff4c2 !important;
            -webkit-text-fill-color: #fff4c2 !important;
            border-color: #d9a62e !important;
            background: #141417 !important;
            opacity: 1 !important;
          }
          :root:not(.dark) [data-lamalo-welcome-dialog] [data-lamalo-primary] {
            color: #111111 !important;
            -webkit-text-fill-color: #111111 !important;
            background: #f6a533 !important;
            opacity: 1 !important;
          }
          .dark [data-lamalo-welcome-dialog] {
            background: #fffaf0 !important;
            color: #18181b !important;
          }
          .dark [data-lamalo-welcome-dialog] [data-slot="dialog-title"] {
            color: #7c4700 !important;
            -webkit-text-fill-color: #7c4700 !important;
          }
          .dark [data-lamalo-welcome-dialog] [data-slot="dialog-description"],
          .dark [data-lamalo-welcome-dialog] [data-lamalo-copy],
          .dark [data-lamalo-welcome-dialog] [data-lamalo-selection] {
            color: #3f3f46 !important;
            -webkit-text-fill-color: #3f3f46 !important;
            opacity: 1 !important;
          }
          .dark [data-lamalo-welcome-dialog] [data-lamalo-secondary] {
            color: #18181b !important;
            -webkit-text-fill-color: #18181b !important;
            border-color: #9a6500 !important;
            background: #fffaf0 !important;
            opacity: 1 !important;
          }
          .dark [data-lamalo-welcome-dialog] [data-lamalo-primary] {
            color: #111111 !important;
            -webkit-text-fill-color: #111111 !important;
            background: #f6a533 !important;
            opacity: 1 !important;
          }
        `}</style>

        <DialogHeader>
          <div className="mb-1 flex items-center gap-3">
            <img
              src="/lamalo/lamalo-logo.png"
              alt="Lamalo Fashions"
              className="h-10 w-10 shrink-0 rounded-lg border border-amber-500/35 object-cover"
            />
            <div className="flex min-w-0 items-center gap-2">
              <Gift className="h-5 w-5 shrink-0 text-amber-300 dark:text-amber-800" />
              <DialogTitle className="text-base font-bold leading-snug sm:text-lg">
                Welcome Gift — 2 Free Lamalo Outfits
              </DialogTitle>
            </div>
          </div>
          <DialogDescription className="text-sm leading-6">
            Choose any 2 from these 10 real Lamalo collection pieces. They are
            permanently added to your wardrobe inventory at no cost.
          </DialogDescription>
        </DialogHeader>

        {outfitsLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-7 w-7 animate-spin text-amber-300 dark:text-amber-800" />
          </div>
        ) : outfitsError ? (
          <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
            <AlertTriangle className="h-11 w-11 text-amber-400 dark:text-amber-700" />
            <p data-lamalo-copy className="max-w-lg text-sm font-medium leading-6">
              {outfitsError?.message ?? "The Lamalo choices could not be loaded."}
            </p>
            <Button
              data-lamalo-secondary
              variant="outline"
              size="sm"
              onClick={() => refetchOutfits?.()}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        ) : outfits.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
            <PackageOpen className="h-11 w-11 text-[#d8c98f] dark:text-zinc-600" />
            <p
              data-lamalo-copy
              className="max-w-md text-sm font-medium leading-6"
            >
              No eligible Lamalo outfits were returned. Retry or contact support;
              the gift will remain available until two outfits are claimed.
            </p>
            <Button
              data-lamalo-secondary
              variant="outline"
              size="sm"
              onClick={() => refetchOutfits?.()}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        ) : (
          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {outfits.map((item: any) => {
              const isSelected = selected.includes(item.id);
              const disabled = !isSelected && selected.length >= 2;
              return (
                <Card
                  key={item.id}
                  onClick={() => !disabled && toggle(item.id)}
                  className={`relative cursor-pointer border-amber-500/20 bg-[#141417] text-[#f8e7a5] transition-all dark:bg-white dark:text-zinc-950 ${
                    disabled ? "cursor-not-allowed opacity-40" : ""
                  } ${
                    isSelected
                      ? "ring-2 ring-amber-400 shadow-md"
                      : "hover:border-amber-500/45 hover:shadow-sm"
                  }`}
                >
                  <CardContent className="space-y-2 p-3">
                    {item.primaryImageUrl ? (
                      <img
                        src={item.primaryImageUrl}
                        alt={item.name}
                        className="aspect-square w-full rounded object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex aspect-square w-full items-center justify-center rounded bg-white/5 dark:bg-zinc-100">
                        <Shirt className="h-8 w-8 text-[#d8c98f] dark:text-zinc-500" />
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-semibold leading-tight text-[#f8e7a5] dark:text-zinc-950">
                        {item.name}
                      </p>
                      <Badge variant="secondary" className="mt-1 text-[10px]">
                        {item.category}
                      </Badge>
                    </div>
                    {isSelected && (
                      <CheckCircle className="absolute right-2 top-2 h-4 w-4 text-amber-300 dark:text-amber-800" />
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <div className="mt-4 flex flex-col items-stretch justify-between gap-3 border-t border-amber-500/30 pt-4 sm:flex-row sm:items-center">
          <p data-lamalo-selection className="text-sm font-medium">
            {selected.length}/2 outfits selected
            {outfits.length > 0 ? ` · ${outfits.length} choices available` : ""}
          </p>
          <div className="flex w-full gap-2 sm:w-auto">
            <Button
              data-lamalo-secondary
              variant="outline"
              size="sm"
              className="min-h-11 flex-1 sm:flex-none"
              onClick={() => setOpen(false)}
            >
              Choose Later
            </Button>
            <Button
              data-lamalo-primary
              size="sm"
              className="min-h-11 flex-1 px-4 sm:flex-none"
              disabled={claimMut?.isPending || selected.length !== 2}
              onClick={() => {
                if (selected.length !== 2) return;
                claimMut?.mutate?.({
                  itemId1: selected[0],
                  itemId2: selected[1],
                });
              }}
            >
              {claimMut?.isPending ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Gift className="mr-1 h-4 w-4" />
              )}
              Claim Free
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
