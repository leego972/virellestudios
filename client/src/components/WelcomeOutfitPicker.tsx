import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  CheckCircle2,
  Gift,
  Loader2,
  PackageOpen,
  RefreshCw,
  Shirt,
} from "lucide-react";

function isStudioOpenerActive(): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  if (new URLSearchParams(window.location.search).get("opener") === "1") return true;

  return Array.from(document.body.children).some(
    node =>
      node instanceof HTMLElement &&
      node.classList.contains("fixed") &&
      node.classList.contains("inset-0") &&
      node.classList.contains("z-[9999]") &&
      node.classList.contains("bg-black"),
  );
}

function OutfitImage({ src, alt }: { src?: string | null; alt: string }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-xl bg-white/5 dark:bg-zinc-100">
        <Shirt className="h-9 w-9 text-[#d8c98f] dark:text-zinc-500" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className="aspect-square w-full rounded-xl object-cover"
      loading="eager"
      onError={() => setFailed(true)}
    />
  );
}

export default function WelcomeOutfitPicker() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const utils = trpc.useUtils();
  const [openerReady, setOpenerReady] = useState(() => !isStudioOpenerActive());
  const [selected, setSelected] = useState<number[]>([]);
  const [open, setOpen] = useState(false);

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
    (trpc as any).lamaloGifts?.hasClaimedGift?.useQuery?.(undefined, {
      enabled: Boolean(isAuthenticated && !authLoading && openerReady),
      retry: 2,
      retryDelay: (attempt: number) => Math.min(500 * 2 ** attempt, 2_000),
    }) ?? {};

  const {
    data: outfits = [],
    isLoading: outfitsLoading,
    isFetching: outfitsFetching,
    error: outfitsError,
    refetch: refetchOutfits,
  } =
    (trpc as any).lamaloGifts?.getStarterOutfits?.useQuery?.(undefined, {
      enabled: Boolean(
        isAuthenticated && openerReady && gift?.eligible && !gift?.claimed,
      ),
      retry: 2,
      retryDelay: (attempt: number) => Math.min(700 * 2 ** attempt, 3_000),
      staleTime: 5 * 60_000,
    }) ?? {};

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
      toast.error(error?.message ?? "The outfits could not be claimed. Please retry."),
  });

  useEffect(() => {
    if (openerReady && gift?.eligible && !gift?.claimed) setOpen(true);
  }, [gift?.claimed, gift?.eligible, openerReady]);

  if (
    authLoading ||
    !isAuthenticated ||
    !openerReady ||
    !gift?.eligible ||
    gift?.claimed
  ) {
    return null;
  }

  const toggle = (id: number) => {
    setSelected(previous =>
      previous.includes(id)
        ? previous.filter(itemId => itemId !== id)
        : previous.length < 2
          ? [...previous, id]
          : previous,
    );
  };

  const retry = () => {
    setSelected([]);
    void refetchOutfits?.();
  };

  const busy = Boolean(outfitsLoading || outfitsFetching);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        data-lamalo-welcome-dialog
        className="flex h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-4xl flex-col gap-0 overflow-hidden rounded-2xl border-amber-500/35 bg-[#0b0b0d] p-0 shadow-2xl shadow-black/60 dark:bg-[#fffaf0] dark:shadow-black/20 sm:h-auto sm:max-h-[88dvh] sm:w-[95vw]"
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
          @supports (-webkit-touch-callout: none) {
            [data-lamalo-welcome-dialog] {
              height: calc(100dvh - 1rem) !important;
              max-height: calc(100dvh - 1rem) !important;
            }
          }
          @media (min-width: 640px) {
            [data-lamalo-welcome-dialog] {
              height: auto !important;
              max-height: 88dvh !important;
            }
          }
        `}</style>

        <DialogHeader className="shrink-0 border-b border-amber-500/25 px-4 pb-3 pt-4 pr-12 text-left sm:px-6 sm:pb-4 sm:pt-5">
          <div className="flex min-w-0 items-center gap-3">
            <img
              src="/lamalo/lamalo-logo.png"
              alt="Lamalo Fashions"
              className="h-11 w-11 shrink-0 rounded-xl border border-amber-500/35 object-cover sm:h-12 sm:w-12"
            />
            <div className="min-w-0">
              <div className="mb-1 flex items-center gap-2 text-amber-300 dark:text-amber-800">
                <Gift className="h-4 w-4 shrink-0" />
                <span className="text-[11px] font-bold uppercase tracking-[0.14em]">
                  Member welcome gift
                </span>
              </div>
              <DialogTitle className="text-lg font-bold leading-tight sm:text-xl">
                Choose 2 Free Lamalo Outfits
              </DialogTitle>
            </div>
          </div>
          <DialogDescription className="pt-2 text-sm leading-5 sm:max-w-3xl">
            Pick any two virtual collection pieces. They stay permanently in your
            Virelle wardrobe inventory at no cost.
          </DialogDescription>
        </DialogHeader>

        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {busy ? (
            <div className="flex min-h-52 flex-col items-center justify-center gap-3 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-amber-300 dark:text-amber-800" />
              <p data-lamalo-copy className="text-sm font-medium">
                Preparing your welcome collection…
              </p>
            </div>
          ) : outfitsError ? (
            <div className="flex min-h-52 flex-col items-center justify-center gap-3 px-3 text-center">
              <AlertTriangle className="h-10 w-10 text-amber-400 dark:text-amber-700" />
              <div>
                <p data-lamalo-copy className="text-base font-semibold">
                  The outfit choices did not load.
                </p>
                <p data-lamalo-copy className="mt-1 max-w-md text-sm leading-5 opacity-80">
                  The gift remains saved to your account. Tap Retry to load the ten
                  choices again.
                </p>
              </div>
              <Button
                data-lamalo-secondary
                variant="outline"
                className="min-h-11 px-5"
                onClick={retry}
              >
                <RefreshCw className="h-4 w-4" />
                Retry
              </Button>
            </div>
          ) : outfits.length === 0 ? (
            <div className="flex min-h-52 flex-col items-center justify-center gap-3 px-3 text-center">
              <PackageOpen className="h-10 w-10 text-[#d8c98f] dark:text-zinc-600" />
              <p data-lamalo-copy className="max-w-md text-sm font-medium leading-5">
                The welcome collection is still being prepared. Retry now; the gift
                remains available until two outfits are claimed.
              </p>
              <Button
                data-lamalo-secondary
                variant="outline"
                className="min-h-11 px-5"
                onClick={retry}
              >
                <RefreshCw className="h-4 w-4" />
                Retry
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {outfits.map((item: any) => {
                const isSelected = selected.includes(item.id);
                const disabled = !isSelected && selected.length >= 2;

                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={disabled}
                    aria-pressed={isSelected}
                    onClick={() => toggle(item.id)}
                    className={`relative min-w-0 rounded-2xl border p-2.5 text-left transition-all focus-visible:ring-2 focus-visible:ring-amber-400 dark:bg-white ${
                      disabled
                        ? "cursor-not-allowed border-amber-500/10 bg-[#141417] opacity-40"
                        : "border-amber-500/25 bg-[#141417] hover:border-amber-400/60"
                    } ${
                      isSelected
                        ? "border-amber-400 ring-2 ring-amber-400 shadow-lg shadow-amber-500/10"
                        : ""
                    }`}
                  >
                    <OutfitImage src={item.primaryImageUrl} alt={item.name} />
                    <div className="min-w-0 pt-2">
                      <p className="line-clamp-2 min-h-8 text-xs font-semibold leading-4 text-[#f8e7a5] dark:text-zinc-950">
                        {item.name}
                      </p>
                      <Badge
                        variant="secondary"
                        className="mt-1 max-w-full text-[10px] capitalize"
                      >
                        {item.category || "outfit"}
                      </Badge>
                    </div>
                    {isSelected && (
                      <span className="absolute right-1.5 top-1.5 rounded-full bg-black/80 p-0.5 text-amber-300 dark:bg-white dark:text-amber-800">
                        <CheckCircle2 className="h-5 w-5" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-amber-500/30 bg-[#0b0b0d] px-4 py-3 dark:bg-[#fffaf0] sm:px-6 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            <p data-lamalo-selection className="min-w-0 text-sm font-semibold">
              {selected.length}/2 selected
              {outfits.length > 0 ? ` · ${outfits.length} available` : ""}
            </p>
            <div className="flex shrink-0 gap-2">
              <Button
                data-lamalo-secondary
                variant="outline"
                className="min-h-11 px-3 sm:px-4"
                onClick={() => setOpen(false)}
              >
                Later
              </Button>
              <Button
                data-lamalo-primary
                className="min-h-11 px-4"
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
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Gift className="h-4 w-4" />
                )}
                Claim
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
