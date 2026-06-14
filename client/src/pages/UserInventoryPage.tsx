/**
   * UserInventoryPage.tsx
   * Shows all active wardrobe leases for the signed-in user.
   * Items / collections appear here after a successful Stripe Checkout on the Wardrobe Marketplace.
   * v2 — Added "Assign to Character" dialog so directors can pin leased items to characters
   *       in a specific project and scene range directly from their inventory.
   */
  import { useState } from "react";
  import { useLocation } from "wouter";
  import { trpc } from "@/lib/trpc";
  import { Button } from "@/components/ui/button";
  import { Badge } from "@/components/ui/badge";
  import { Skeleton } from "@/components/ui/skeleton";
  import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
  } from "@/components/ui/dialog";
  import { Label } from "@/components/ui/label";
  import { Input } from "@/components/ui/input";
  import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select";
  import { toast } from "sonner";
  import {
    Package,
    Shirt,
    ArrowRight,
    ShoppingBag,
    Calendar,
    CheckCircle2,
    UserPlus,
  } from "lucide-react";

  function timeAgo(date: string | Date | null) {
    if (!date) return "";
    const now = new Date();
    const d = new Date(date);
    const days = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (days === 0) return "today";
    if (days === 1) return "yesterday";
    if (days < 30) return `${days}d ago`;
    return d.toLocaleDateString();
  }

  type AssignTarget = {
    wardrobeItemId: number;
    label: string;
  };

  export default function UserInventoryPage() {
    const [, setLocation] = useLocation();

    // ── Assign dialog state ─────────────────────────────────────────────────────
    const [assignTarget, setAssignTarget] = useState<AssignTarget | null>(null);
    const [assignProjectId, setAssignProjectId] = useState<string>("");
    const [assignCharacterId, setAssignCharacterId] = useState<string>("");
    const [fromScene, setFromScene] = useState<string>("1");
    const [toScene, setToScene] = useState<string>("999");
    const [notes, setNotes] = useState<string>("");

    const resetAssign = () => {
      setAssignTarget(null);
      setAssignProjectId("");
      setAssignCharacterId("");
      setFromScene("1");
      setToScene("999");
      setNotes("");
    };

    // ── Queries ─────────────────────────────────────────────────────────────────
    const { data: leases, isLoading } = trpc.wardrobeMarket.leasing.myInventory.useQuery();
    const { data: projects } = trpc.project.list.useQuery(undefined, { enabled: !!assignTarget });
    const { data: characters } = trpc.character.listByProject.useQuery(
      { projectId: Number(assignProjectId) },
      { enabled: !!assignProjectId && Number(assignProjectId) > 0 }
    );

    // ── Assign mutation ──────────────────────────────────────────────────────────
    const assignMutation = trpc.wardrobeMarket.director.assign.useMutation({
      onSuccess: () => {
        toast.success("Wardrobe item assigned to character — it will appear in every scene generation for the selected range.");
        resetAssign();
      },
      onError: (err: { message: string }) => toast.error(err.message || "Failed to assign item"),
    });

    const handleAssign = () => {
      if (!assignTarget || !assignProjectId || !assignCharacterId) {
        toast.error("Please select a project and character.");
        return;
      }
      assignMutation.mutate({
        wardrobeItemId: assignTarget.wardrobeItemId,
        projectId: Number(assignProjectId),
        characterId: Number(assignCharacterId),
        fromSceneOrder: Number(fromScene) || 1,
        toSceneOrder: Number(toScene) || 999,
        notes: notes.trim() || undefined,
      });
    };

    const active = (leases ?? []).filter((l: any) => l.status === "active");
    const collections = active.filter((l: any) => l.leaseType === "collection");
    const items       = active.filter((l: any) => l.leaseType === "item");

    return (
      <div className="min-h-screen" style={{ background:"linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)" }}>
        <div className="border-b border-border px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shirt className="h-5 w-5 text-amber-500" />
            <div>
              <h1 className="text-base font-bold gradient-text-gold">My Wardrobe Inventory</h1>
              <p className="text-xs text-muted-foreground">Leased items and collections available for your productions</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setLocation("/wardrobe-marketplace")}
            className="gap-1.5"
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            Browse More
          </Button>
        </div>

        <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">
          {isLoading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
            </div>
          )}

          {!isLoading && active.length === 0 && (
            <div className="text-center py-16 space-y-4">
              <Shirt className="h-12 w-12 text-muted-foreground/20 mx-auto" />
              <p className="font-semibold text-muted-foreground">No leased items yet</p>
              <p className="text-xs text-muted-foreground/60">Browse the marketplace to lease designer costumes for your productions.</p>
              <Button onClick={() => setLocation("/wardrobe-marketplace")} className="bg-amber-500 hover:bg-amber-600 text-black font-bold gap-1.5">
                <ShoppingBag className="h-4 w-4" />
                Browse Wardrobe Marketplace
              </Button>
            </div>
          )}

          {/* Collections */}
          {collections.length > 0 && (
            <section>
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2 gradient-text-gold">
                <Package className="h-4 w-4" />
                Leased Collections ({collections.length})
              </h2>
              <div className="space-y-3">
                {collections.map((lease: any) => (
                  <div
                    key={lease.id}
                    className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card/60 hover:border-amber-500/20 transition-colors glass-card"
                  >
                    <div className="h-14 w-20 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                      <Package className="h-6 w-6 text-muted-foreground/30" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">Collection #{lease.collectionId}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px] border-green-500/30 text-green-500 gap-1 px-1.5">
                          <CheckCircle2 className="h-2.5 w-2.5" /> Active
                        </Badge>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-2.5 w-2.5" />
                          Leased {timeAgo(lease.createdAt)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0 flex flex-col items-end gap-1">
                      <p className="text-xs font-bold text-amber-400">
                        A${((lease.amountPaidAud ?? 0) / 100).toFixed(2)}
                      </p>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => lease.designerProfileId && setLocation(`/wardrobe-marketplace/designer/${lease.designerProfileId}`)}
                      >
                        View <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Individual Items */}
          {items.length > 0 && (
            <section>
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2 gradient-text-gold">
                <Shirt className="h-4 w-4" />
                Leased Items ({items.length})
              </h2>
              <div className="space-y-3">
                {items.map((lease: any) => (
                  <div
                    key={lease.id}
                    className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card/60 hover:border-amber-500/20 transition-colors glass-card"
                  >
                    <div className="h-14 w-14 rounded-lg bg-muted/50 flex items-center justify-center shrink-0 overflow-hidden">
                      {lease.imageUrl ? (
                        <img src={lease.imageUrl} alt="item" className="w-full h-full object-cover" />
                      ) : (
                        <Shirt className="h-6 w-6 text-muted-foreground/30" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{lease.itemName ?? `Item #${lease.wardrobeItemId}`}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px] border-green-500/30 text-green-500 gap-1 px-1.5">
                          <CheckCircle2 className="h-2.5 w-2.5" /> Active
                        </Badge>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-2.5 w-2.5" />
                          Leased {timeAgo(lease.createdAt)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0 flex flex-col items-end gap-1">
                      <p className="text-xs font-bold text-amber-400">
                        A${((lease.amountPaidAud ?? 0) / 100).toFixed(2)}
                      </p>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                          onClick={() => setAssignTarget({ wardrobeItemId: lease.wardrobeItemId, label: lease.itemName ?? `Item #${lease.wardrobeItemId}` })}
                        >
                          <UserPlus className="h-3 w-3 mr-1" />
                          Assign
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => lease.designerProfileId && setLocation(`/wardrobe-marketplace/designer/${lease.designerProfileId}`)}
                        >
                          View <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Footer hint */}
          {active.length > 0 && (
            <p className="text-center text-xs text-muted-foreground/50 pb-4">
              Use the <strong>Assign</strong> button to pin items to characters — the AI locks that costume into every scene generation for the selected range.
            </p>
          )}
        </div>

        {/* ── Assign to Character Dialog ─────────────────────────────────────── */}
        <Dialog open={!!assignTarget} onOpenChange={(open) => !open && resetAssign()}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 gradient-text-gold">
                <UserPlus className="h-4 w-4 text-amber-500" />
                Assign to Character
              </DialogTitle>
            </DialogHeader>

            {assignTarget && (
              <div className="space-y-4 py-2">
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">{assignTarget.label}</span> will be locked into every AI generation for the selected character and scene range.
                </p>

                {/* Project */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Project</Label>
                  <Select value={assignProjectId} onValueChange={(v) => { setAssignProjectId(v); setAssignCharacterId(""); }}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Select a project…" />
                    </SelectTrigger>
                    <SelectContent>
                      {(projects ?? []).map((p: any) => (
                        <SelectItem key={p.id} value={String(p.id)}>{p.title || `Project #${p.id}`}</SelectItem>
                      ))}
                      {(projects ?? []).length === 0 && (
                        <div className="px-3 py-2 text-xs text-muted-foreground">No projects found</div>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Character */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Character</Label>
                  <Select value={assignCharacterId} onValueChange={setAssignCharacterId} disabled={!assignProjectId}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder={assignProjectId ? "Select a character…" : "Select a project first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {(characters ?? []).map((c: any) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.name || `Character #${c.id}`}</SelectItem>
                      ))}
                      {assignProjectId && (characters ?? []).length === 0 && (
                        <div className="px-3 py-2 text-xs text-muted-foreground">No characters in this project</div>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Scene range */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">From Scene</Label>
                    <Input
                      type="number"
                      min={1}
                      value={fromScene}
                      onChange={(e) => setFromScene(e.target.value)}
                      className="h-9 text-sm"
                      placeholder="1"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">To Scene</Label>
                    <Input
                      type="number"
                      min={1}
                      value={toScene}
                      onChange={(e) => setToScene(e.target.value)}
                      className="h-9 text-sm"
                      placeholder="999"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground">Use 1–999 to cover the entire film. Adjust to target specific acts.</p>

                {/* Notes */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Styling Notes <span className="font-normal text-muted-foreground">(optional)</span></Label>
                  <Input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="h-9 text-sm"
                    placeholder="e.g. worn open over a white tee, sleeves rolled up"
                    maxLength={500}
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="ghost" size="sm" onClick={resetAssign}>Cancel</Button>
              <Button
                size="sm"
                className="bg-amber-500 hover:bg-amber-600 text-black font-bold"
                onClick={handleAssign}
                disabled={assignMutation.isPending || !assignProjectId || !assignCharacterId}
              >
                {assignMutation.isPending ? "Assigning…" : "Assign to Character"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }
  