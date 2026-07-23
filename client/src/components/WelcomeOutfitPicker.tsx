import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { CheckCircle2, Gift, Loader2, RefreshCw } from "lucide-react";

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

export default function WelcomeOutfitPicker() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { theme } = useTheme();
  const utils = trpc.useUtils();
  const [openerReady, setOpenerReady] = useState(() => !isStudioOpenerActive());
  const [selected, setSelected] = useState<number[]>([]);
  const [open, setOpen] = useState(false);
  const [imagesReady, setImagesReady] = useState(false);
  const [imageAttempt, setImageAttempt] = useState(0);
  const [imageAssetError, setImageAssetError] = useState(false);

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
      retryDelay: (attempt: number) => Math.min(500 * 2 ** attempt, 2_000),
      staleTime: 60 * 60_000,
    }) ?? {};

  const outfitImageKey = outfits
    .map((item: any) => String(item.primaryImageUrl || ""))
    .join("|");

  useEffect(() => {
    let cancelled = false;
    let retryTimer: number | undefined;

    setImagesReady(false);
    setImageAssetError(false);

    if (!outfitImageKey || outfits.length !== 10) {
      return () => {
        cancelled = true;
      };
    }

    const preload = outfits.map(
      (item: any) =>
        new Promise<void>((resolve, reject) => {
          const image = new Image();
          image.decoding = "async";
          image.onload = () => resolve();
          image.onerror = () => reject(new Error(`Failed to load ${item.primaryImageUrl}`));
          image.src = item.primaryImageUrl;

          if (image.complete && image.naturalWidth > 0) resolve();
        }),
    );

    void Promise.all(preload)
      .then(() => {
        if (!cancelled) setImagesReady(true);
      })
      .catch(() => {
        if (cancelled) return;
        if (imageAttempt < 2) {
          retryTimer = window.setTimeout(
            () => setImageAttempt(attempt => attempt + 1),
            300 * (imageAttempt + 1),
          );
          return;
        }
        setImageAssetError(true);
      });

    return () => {
      cancelled = true;
      if (retryTimer) window.clearTimeout(retryTimer);
    };
  }, [imageAttempt, outfitImageKey, outfits]);

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

  const retryAssets = () => {
    setImageAttempt(0);
    setImageAssetError(false);
    setImagesReady(false);
    void refetchOutfits?.();
  };

  const busy = Boolean(
    outfitsLoading ||
      outfitsFetching ||
      (outfits.length === 10 && !imagesReady && !imageAssetError),
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        data-lamalo-welcome-dialog
        data-theme-mode={theme}
        data-contrast-ignore="true"
        className="flex h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-4xl flex-col gap-0 overflow-hidden rounded-2xl border p-0 shadow-2xl sm:h-auto sm:max-h-[88dvh] sm:w-[95vw]"
      >
        <style>{`
          [data-lamalo-welcome-dialog] {
            --lw-bg: #0b0b0d;
            --lw-panel: #141417;
            --lw-card: #18181b;
            --lw-card-hover: #222226;
            --lw-border: #d6a32d;
            --lw-border-soft: rgba(214, 163, 45, 0.34);
            --lw-title: #ffd76a;
            --lw-text: #fff4c2;
            --lw-muted: #d8c98f;
            --lw-badge-bg: #302817;
            --lw-badge-text: #f6d675;
            --lw-shadow: rgba(0, 0, 0, 0.65);
            background: var(--lw-bg) !important;
            border-color: var(--lw-border-soft) !important;
            color: var(--lw-text) !important;
            box-shadow: 0 28px 80px var(--lw-shadow) !important;
          }
          [data-lamalo-welcome-dialog][data-theme-mode="light"] {
            --lw-bg: #fffaf0;
            --lw-panel: #f4ead7;
            --lw-card: #ffffff;
            --lw-card-hover: #fff7e8;
            --lw-border: #8a5700;
            --lw-border-soft: rgba(138, 87, 0, 0.38);
            --lw-title: #5f3700;
            --lw-text: #251b10;
            --lw-muted: #5d5143;
            --lw-badge-bg: #ead9b6;
            --lw-badge-text: #4a2c00;
            --lw-shadow: rgba(66, 44, 15, 0.28);
          }
          [data-lamalo-welcome-dialog] [data-lw-title] {
            color: var(--lw-title) !important;
            -webkit-text-fill-color: var(--lw-title) !important;
            opacity: 1 !important;
          }
          [data-lamalo-welcome-dialog] [data-lw-text] {
            color: var(--lw-text) !important;
            -webkit-text-fill-color: var(--lw-text) !important;
            opacity: 1 !important;
          }
          [data-lamalo-welcome-dialog] [data-lw-muted] {
            color: var(--lw-muted) !important;
            -webkit-text-fill-color: var(--lw-muted) !important;
            opacity: 1 !important;
          }
          [data-lamalo-welcome-dialog] [data-lw-panel] {
            background: var(--lw-panel) !important;
            border-color: var(--lw-border-soft) !important;
          }
          [data-lamalo-welcome-dialog] [data-lw-card] {
            background: var(--lw-card) !important;
            border-color: var(--lw-border-soft) !important;
            color: var(--lw-text) !important;
          }
          [data-lamalo-welcome-dialog] [data-lw-card]:not(:disabled):hover {
            background: var(--lw-card-hover) !important;
            border-color: var(--lw-border) !important;
          }
          [data-lamalo-welcome-dialog] [data-lw-card][aria-pressed="true"] {
            border-color: var(--lw-border) !important;
            box-shadow: 0 0 0 2px var(--lw-border) !important;
          }
          [data-lamalo-welcome-dialog] [data-lw-badge] {
            background: var(--lw-badge-bg) !important;
            color: var(--lw-badge-text) !important;
            -webkit-text-fill-color: var(--lw-badge-text) !important;
            border-color: var(--lw-border-soft) !important;
          }
          [data-lamalo-welcome-dialog] [data-lw-secondary] {
            background: transparent !important;
            color: var(--lw-text) !important;
            -webkit-text-fill-color: var(--lw-text) !important;
            border-color: var(--lw-border) !important;
          }
          [data-lamalo-welcome-dialog] [data-lw-primary] {
            background: #f4a62f !important;
            color: #111111 !important;
            -webkit-text-fill-color: #111111 !important;
            border-color: #f4a62f !important;
          }
          [data-lamalo-welcome-dialog] [data-slot="dialog-close"] {
            color: var(--lw-text) !important;
            opacity: 0.85 !important;
          }
          [data-lamalo-welcome-dialog] img {
            background: #d8c7a7 !important;
            image-rendering: auto;
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

        <DialogHeader
          data-lw-panel
          className="shrink-0 border-b px-4 pb-3 pt-4 pr-12 text-left sm:px-6 sm:pb-4 sm:pt-5"
        >
          <div className="flex min-w-0 items-center gap-3">
            <img
              src="/lamalo/lamalo-logo.png"
              alt="Lamalo Fashions"
              className="h-11 w-11 shrink-0 rounded-xl border object-cover sm:h-12 sm:w-12"
              style={{ borderColor: "var(--lw-border-soft)" }}
              width={48}
              height={48}
              decoding="sync"
            />
            <div className="min-w-0">
              <div data-lw-title className="mb-1 flex items-center gap-2">
                <Gift className="h-4 w-4 shrink-0" />
                <span className="text-[11px] font-extrabold uppercase tracking-[0.14em]">
                  Member welcome gift
                </span>
              </div>
              <DialogTitle data-lw-title className="text-lg font-bold leading-tight sm:text-xl">
                Choose 2 Free Lamalo Outfits
              </DialogTitle>
            </div>
          </div>
          <DialogDescription data-lw-text className="pt-2 text-sm font-medium leading-5 sm:max-w-3xl">
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
              <Loader2 data-lw-title className="h-8 w-8 animate-spin" />
              <p data-lw-text className="text-sm font-semibold">
                Loading all ten high-quality Lamalo images…
              </p>
            </div>
          ) : outfitsError ? (
            <div className="flex min-h-52 flex-col items-center justify-center gap-4 text-center">
              <p data-lw-text className="max-w-md text-sm font-semibold leading-5">
                The server connection failed before the outfit list arrived.
              </p>
              <Button
                data-lw-secondary
                variant="outline"
                className="min-h-11 px-5"
                onClick={() => void refetchOutfits?.()}
              >
                <RefreshCw className="h-4 w-4" />
                Retry connection
              </Button>
            </div>
          ) : imageAssetError ? (
            <div className="flex min-h-52 flex-col items-center justify-center gap-4 text-center">
              <p data-lw-text className="max-w-md text-sm font-semibold leading-5">
                The deployed build is missing one or more Lamalo image assets.
              </p>
              <Button
                data-lw-secondary
                variant="outline"
                className="min-h-11 px-5"
                onClick={retryAssets}
              >
                <RefreshCw className="h-4 w-4" />
                Reload all images
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {outfits.map((item: any, index: number) => {
                const isSelected = selected.includes(item.id);
                const disabled = !isSelected && selected.length >= 2;

                return (
                  <button
                    data-lw-card
                    key={item.id}
                    type="button"
                    disabled={disabled}
                    aria-pressed={isSelected}
                    onClick={() => toggle(item.id)}
                    className={`relative min-w-0 rounded-2xl border p-2.5 text-left transition-all focus-visible:outline-none ${
                      disabled ? "cursor-not-allowed opacity-45" : ""
                    }`}
                  >
                    <img
                      src={item.primaryImageUrl}
                      alt={item.name}
                      className="aspect-square w-full rounded-xl object-contain"
                      loading="eager"
                      decoding="sync"
                      fetchPriority={index < 4 ? "high" : "auto"}
                      width={480}
                      height={480}
                      draggable={false}
                    />
                    <div className="min-w-0 pt-2">
                      <p data-lw-text className="line-clamp-2 min-h-8 text-xs font-bold leading-4">
                        {item.name}
                      </p>
                      <span
                        data-lw-badge
                        className="mt-1 inline-flex max-w-full rounded-md border px-2 py-0.5 text-[10px] font-bold capitalize"
                      >
                        {item.category || "outfit"}
                      </span>
                    </div>
                    {isSelected && (
                      <span className="absolute right-1.5 top-1.5 rounded-full bg-black/85 p-0.5 text-amber-300">
                        <CheckCircle2 className="h-5 w-5" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div data-lw-panel className="shrink-0 border-t px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            <p data-lw-text className="min-w-0 text-sm font-bold">
              {selected.length}/2 selected
              {outfits.length > 0 ? ` · ${outfits.length} available` : ""}
            </p>
            <div className="flex shrink-0 gap-2">
              <Button
                data-lw-secondary
                variant="outline"
                className="min-h-11 px-3 sm:px-4"
                onClick={() => setOpen(false)}
              >
                Later
              </Button>
              <Button
                data-lw-primary
                className="min-h-11 px-4 font-bold"
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
