import { useState } from "react";
  import { trpc } from "@/lib/trpc";
  import { Button } from "@/components/ui/button";
  import { Badge } from "@/components/ui/badge";
  import { Card, CardContent } from "@/components/ui/card";
  import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
  import { toast } from "sonner";
  import { Gift, CheckCircle, Loader2, Shirt, PackageOpen } from "lucide-react";

  export default function WelcomeOutfitPicker() {
    const { data: gift } = (trpc as any).lamaloGifts?.hasClaimedGift?.useQuery?.() ?? {};

    // ✅ Fix: enabled passed as OPTIONS (2nd arg), not input (1st arg)
    const { data: outfits = [], isLoading: outfitsLoading } = (trpc as any).lamaloGifts?.getStarterOutfits?.useQuery?.(
      undefined,
      { enabled: !!(gift?.eligible && !gift?.claimed) }
    ) ?? {};

    const claimMut = (trpc as any).lamaloGifts?.claimGift?.useMutation?.({
      onSuccess: () => {
        toast.success("Your 2 free Lamalo outfits are now in your wardrobe!");
        setOpen(false);
      },
      onError: (e: any) => toast.error(e?.message ?? "Something went wrong"),
    });

    const [selected, setSelected] = useState<number[]>([]);
    const [open, setOpen] = useState(true);

    if (!gift?.eligible || gift?.claimed) return null;

    const toggle = (id: number) => {
      setSelected(prev =>
        prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 2 ? [...prev, id] : prev
      );
    };

    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <img
                src="/lamalo/lamalo-logo.png"
                alt="Lamalo Fashions"
                className="h-9 w-9 rounded-lg object-cover border border-amber-500/20 shrink-0"
              />
              <div className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-yellow-500 shrink-0" />
                <DialogTitle className="text-base leading-snug gradient-text-gold">Welcome Gift — 2 Free Lamalo Outfits</DialogTitle>
              </div>
            </div>
            <DialogDescription className="text-sm">
              Choose any 2 outfits from Lamalo Fashions as a welcome gift. These are yours permanently at no cost.
            </DialogDescription>
          </DialogHeader>

          {outfitsLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground text-amber-400" />
            </div>
          ) : outfits.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
              <PackageOpen className="w-10 h-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">The Lamalo collection is being set up.<br />Check back soon or contact support.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
              {outfits.map((item: any) => {
                const isSelected = selected.includes(item.id);
                const disabled = !isSelected && selected.length >= 2;
                return (
                  <Card
                    key={item.id}
                    onClick={() => !disabled && toggle(item.id)}
                    className={`relative cursor-pointer transition-all ${disabled ? "opacity-40 cursor-not-allowed" : ""} ${isSelected ? "ring-2 ring-primary shadow-md" : "hover:shadow-sm"}`}
                  >
                    <CardContent className="p-3 space-y-2">
                      {item.primaryImageUrl ? (
                        <img src={item.primaryImageUrl} alt={item.name} className="w-full aspect-square object-cover rounded" />
                      ) : (
                        <div className="w-full aspect-square bg-muted rounded flex items-center justify-center">
                          <Shirt className="w-8 h-8 opacity-30" />
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-semibold leading-tight">{item.name}</p>
                        <Badge variant="secondary" className="text-[10px] mt-1">{item.category}</Badge>
                      </div>
                      {isSelected && <CheckCircle className="w-4 h-4 text-amber-400 absolute top-2 right-2" />}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-4 pt-4 border-t">
            <p className="text-sm text-muted-foreground">{selected.length}/2 outfits selected</p>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="ghost" size="sm" className="flex-1 sm:flex-none" onClick={() => setOpen(false)}>
                Choose Later
              </Button>
              <Button
                size="sm"
                className="flex-1 sm:flex-none"
                disabled={claimMut?.isPending || (outfits.length > 0 && selected.length < 2)}
                onClick={() => {
                    if (outfits.length === 0 || selected.length < 2) { setOpen(false); return; }
                    claimMut?.mutate?.({ itemId1: selected[0], itemId2: selected[1] });
                  }}
              >
                {claimMut?.isPending
                  ? <Loader2 className="w-4 h-4 animate-spin mr-1 text-amber-400" />
                  : <Gift className="w-4 h-4 mr-1" />}
                Claim Free
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  