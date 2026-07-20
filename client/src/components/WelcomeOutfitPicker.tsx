import { useState } from "react";
import { trpc } from "@/lib/trpc";
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
  CheckCircle,
  Gift,
  Loader2,
  PackageOpen,
  Shirt,
} from "lucide-react";

export default function WelcomeOutfitPicker() {
  const { data: gift } =
    (trpc as any).lamaloGifts?.hasClaimedGift?.useQuery?.() ?? {};

  const { data: outfits = [], isLoading: outfitsLoading } =
    (trpc as any).lamaloGifts?.getStarterOutfits?.useQuery?.(
      undefined,
      { enabled: Boolean(gift?.eligible && !gift?.claimed) },
    ) ?? {};

  const claimMut = (trpc as any).lamaloGifts?.claimGift?.useMutation?.({
    onSuccess: () => {
      toast.success(
        "Your 2 free Lamalo virtual outfits are now in your wardrobe inventory.",
      );
      setOpen(false);
    },
    onError: (error: any) =>
      toast.error(error?.message ?? "Something went wrong"),
  });

  const [selected, setSelected] = useState<number[]>([]);
  const [open, setOpen] = useState(true);

  if (!gift?.eligible || gift?.claimed) return null;

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
      <DialogContent className="w-[calc(100vw-1rem)] max-w-2xl max-h-[calc(100dvh-1rem)] overflow-y-auto border-amber-500/35 bg-[#0b0b0d] text-[#f8e7a5] shadow-2xl shadow-black/60 dark:bg-[#fffaf0] dark:text-zinc-950 dark:shadow-black/20 sm:w-[95vw] sm:max-h-[85vh]">
        <DialogHeader>
          <div className="mb-1 flex items-center gap-3">
            <img
              src="/lamalo/lamalo-logo.png"
              alt="Lamalo Fashions"
              className="h-10 w-10 shrink-0 rounded-lg border border-amber-500/35 object-cover"
            />
            <div className="flex min-w-0 items-center gap-2">
              <Gift className="h-5 w-5 shrink-0 text-amber-300 dark:text-amber-800" />
              <DialogTitle className="text-base font-bold leading-snug text-amber-300 dark:text-amber-800 sm:text-lg">
                Welcome Gift — 2 Free Lamalo Outfits
              </DialogTitle>
            </div>
          </div>
          <DialogDescription className="text-sm leading-6 text-[#eadcae] dark:text-zinc-700">
            Choose any 2 outfits from Lamalo Fashions as a welcome gift. These
            are yours permanently at no cost.
          </DialogDescription>
        </DialogHeader>

        {outfitsLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-7 w-7 animate-spin text-amber-300 dark:text-amber-800" />
          </div>
        ) : outfits.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
            <PackageOpen className="h-11 w-11 text-[#d8c98f] dark:text-zinc-600" />
            <p className="max-w-md text-sm font-medium leading-6 text-[#eadcae] dark:text-zinc-700">
              The Lamalo collection is being set up.
              <br />
              Check back soon or contact support.
            </p>
          </div>
        ) : (
          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
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
                      <Badge
                        variant="secondary"
                        className="mt-1 text-[10px]"
                      >
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
          <p className="text-sm font-medium text-[#eadcae] dark:text-zinc-700">
            {selected.length}/2 outfits selected
          </p>
          <div className="flex w-full gap-2 sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              className="min-h-11 flex-1 border-amber-500/45 bg-transparent text-[#f8e7a5] hover:bg-amber-500/10 hover:text-white dark:text-zinc-950 dark:hover:text-zinc-950 sm:flex-none"
              onClick={() => setOpen(false)}
            >
              Choose Later
            </Button>
            <Button
              size="sm"
              className="min-h-11 flex-1 bg-amber-500 px-4 text-zinc-950 hover:bg-amber-400 sm:flex-none"
              disabled={
                claimMut?.isPending ||
                (outfits.length > 0 && selected.length < 2)
              }
              onClick={() => {
                if (outfits.length === 0 || selected.length < 2) {
                  setOpen(false);
                  return;
                }
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
