import { useState } from "react";
  import { trpc } from "@/lib/trpc";
  import { Button } from "@/components/ui/button";
  import { Badge } from "@/components/ui/badge";
  import { Card, CardContent } from "@/components/ui/card";
  import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
  import { toast } from "sonner";
  import { Gift, CheckCircle, Loader2, Shirt } from "lucide-react";

  export default function WelcomeOutfitPicker() {
    const { data: gift } = (trpc as any).lamaloGifts?.hasClaimedGift?.useQuery?.() ?? {};
    const { data: outfits = [] } = (trpc as any).lamaloGifts?.getStarterOutfits?.useQuery?.({ enabled: gift?.eligible && !gift?.claimed }) ?? { data: [] };
    const claimMut = (trpc as any).lamaloGifts?.claimGift?.useMutation?.({
      onSuccess: () => toast.success("Your 2 free Lamalo outfits are now in your wardrobe!"),
      onError: (e: any) => toast.error(e.message),
    });

    const [selected, setSelected] = useState<number[]>([]);
    const [open, setOpen] = useState(true);

    if (!gift?.eligible || gift?.claimed) return null;

    const toggle = (id: number) => {
      setSelected(prev =>
        prev.includes(id) ? prev.filter(x=>x!==id) : prev.length < 2 ? [...prev, id] : prev
      );
    };

    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <Gift className="w-5 h-5 text-yellow-500" />
              <DialogTitle>Welcome Gift — 2 Free Lamalo Outfits</DialogTitle>
            </div>
            <DialogDescription>
              Choose 2 outfits from Lamalo Fashions as a welcome gift for your first 2 characters.
              These are yours permanently at no cost.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
            {outfits.map((item: any) => {
              const isSelected = selected.includes(item.id);
              const disabled = !isSelected && selected.length >= 2;
              return (
                <Card
                  key={item.id}
                  onClick={() => !disabled && toggle(item.id)}
                  className={`cursor-pointer transition-all ${disabled ? 'opacity-40' : ''} ${isSelected ? 'ring-2 ring-primary shadow-md' : 'hover:shadow-sm'}`}
                >
                  <CardContent className="p-3 space-y-2">
                    {item.thumbnailUrl ? (
                      <img src={item.thumbnailUrl} alt={item.name} className="w-full aspect-square object-cover rounded" />
                    ) : (
                      <div className="w-full aspect-square bg-muted rounded flex items-center justify-center">
                        <Shirt className="w-8 h-8 opacity-30" />
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-semibold leading-tight">{item.name}</p>
                      <Badge variant="secondary" className="text-[10px] mt-1">{item.category}</Badge>
                    </div>
                    {isSelected && <CheckCircle className="w-4 h-4 text-primary absolute top-2 right-2" />}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              {selected.length}/2 outfits selected
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={()=>setOpen(false)}>Choose Later</Button>
              <Button
                size="sm"
                disabled={selected.length < 2 || claimMut?.isPending}
                onClick={() => claimMut?.mutate?.({ itemId1: selected[0], itemId2: selected[1] })}
              >
                {claimMut?.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Gift className="w-4 h-4 mr-1" />}
                Claim Free Outfits
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  