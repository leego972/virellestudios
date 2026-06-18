/**
   * UserInventoryPage.tsx
   * Shows all active wardrobe leases for the signed-in user.
   * v3 — Multi-character assignment: each item shows its active assignments inline
   *       with a Remove button per assignment and an "＋ Assign" button to add more.
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
    Trash2,
    Film,
    Clapperboard,
    ChevronDown,
    ChevronUp,
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

  type AssignTarget = { wardrobeItemId: number; label: string };

  // ─── Per-item assignments panel ───────────────────────────────────────────────

  function ItemAssignmentsSection({
    wardrobeItemId,
    itemLabel,
    onAddAssignment,
  }: {
    wardrobeItemId: number;
    itemLabel: string;
    onAddAssignment: () => void;
  }) {
    const utils = trpc.useUtils();
    const [expanded, setExpanded] = useState(false);

    const { data: assignments, isLoading } =
      trpc.wardrobeMarket.director.listByItem.useQuery(
        { wardrobeItemId },
        { enabled: expanded },
      );

    const removeMut = trpc.wardrobeMarket.director.remove.useMutation({
      onSuccess: () => {
        toast.success("Assignment removed.");
        utils.wardrobeMarket.director.listByItem.invalidate({ wardrobeItemId });
      },
      onError: (e: { message: string }) => toast.error(e.message || "Failed to remove"),
    });

    return (
      <div className="border-t border-amber-500/10 mt-2 pt-2">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1.5 text-[11px] text-white/40 hover:text-amber-400 transition-colors"
          >
            {expanded ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
            {expanded ? "Hide assignments" : "Show assignments"}
          </button>
          <Button
            size="sm"
            variant="outline"
            className="h-6 px-2 text-[10px] border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
            onClick={onAddAssignment}
          >
            <UserPlus className="h-2.5 w-2.5 mr-1" />
            Assign to character
          </Button>
        </div>

        {expanded && (
          <div className="mt-2 space-y-1.5">
            {isLoading && (
              <div className="space-y-1">
                <Skeleton className="h-7 rounded-lg" />
                <Skeleton className="h-7 rounded-lg" />
              </div>
            )}
            {!isLoading && (!assignments || assignments.length === 0) && (
              <p className="text-[11px] text-white/25 py-1 text-center">
                Not assigned to any character yet.
              </p>
            )}
            {(assignments ?? []).map((a: any) => (
              <div
                key={a.id}
                className="flex items-center gap-2 rounded-lg bg-white/[0.03] border border-amber-500/10 px-3 py-1.5"
              >
                <Clapperboard className="h-3 w-3 text-amber-400/60 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-semibold text-white/80 truncate">
                    {a.characterName ?? `Character #${a.characterId}`}
                  </span>
                  <span className="text-[10px] text-white/35 ml-2">
                    {a.projectTitle ?? `Project #${a.projectId}`}
                  </span>
                  <span className="text-[10px] text-white/25 ml-2">
                    Scenes {a.fromSceneOrder}–{a.toSceneOrder}
                  </span>
                </div>
                <button
                  onClick={() => removeMut.mutate({ assignmentId: a.id })}
                  disabled={removeMut.isPending}
                  className="h-6 w-6 flex items-center justify-center rounded-md text-white/25 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
                  title="Remove assignment"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ─── Main page ────────────────────────────────────────────────────────────────

  export default function UserInventoryPage() {
    const [, setLocation] = useLocation();
    const utils = trpc.useUtils();

    // ── Assign dialog state ────────────────────────────────────────────────────
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

    // ── Queries ────────────────────────────────────────────────────────────────
    const { data: leases, isLoading } =
      trpc.wardrobeMarket.leasing.myInventory.useQuery();
    const { data: projects } = trpc.project.list.useQuery(undefined, {
      enabled: !!assignTarget,
    });
    const { data: characters } = trpc.character.listByProject.useQuery(
      { projectId: Number(assignProjectId) },
      { enabled: !!assignProjectId && Number(assignProjectId) > 0 },
    );

    // ── Assign mutation ────────────────────────────────────────────────────────
    const assignMutation = trpc.wardrobeMarket.director.assign.useMutation({
      onSuccess: () => {
        toast.success(
          "Assigned — costume will be locked into every AI generation for the selected character and scene range.",
        );
        // Refresh the assignments panel for this item
        if (assignTarget) {
          utils.wardrobeMarket.director.listByItem.invalidate({
            wardrobeItemId: assignTarget.wardrobeItemId,
          });
        }
        resetAssign();
      },
      onError: (err: { message: string }) =>
        toast.error(err.message || "Failed to assign item"),
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
    const items = active.filter((l: any) => l.leaseType === "item");

    return (
      <div
        className="min-h-screen"
        style={{
          background:
            "linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)",
        }}
      >
        {/* Header */}
        <div className="border-b border-border px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shirt className="h-5 w-5 text-amber-500" />
            <div>
              <h1 className="text-base font-bold text-gold-shimmer">
                My Wardrobe Inventory
              </h1>
              <p className="text-xs text-muted-foreground">
                Leased items and collections — assign to any character across any project
              </p>
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
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
          )}

          {!isLoading && active.length === 0 && (
            <div className="text-center py-16 space-y-4">
              <Shirt className="h-12 w-12 text-muted-foreground/20 mx-auto" />
              <p className="font-semibold text-muted-foreground">
                No leased items yet
              </p>
              <p className="text-xs text-muted-foreground/60">
                Browse the marketplace to lease designer costumes for your
                productions.
              </p>
              <Button
                onClick={() => setLocation("/wardrobe-marketplace")}
                className="bg-amber-500 hover:bg-amber-600 text-black font-bold gap-1.5"
              >
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
                    className="p-4 rounded-xl border border-border bg-card/60 hover:border-amber-500/20 transition-colors glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 gold-glow"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-20 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                        <Package className="h-6 w-6 text-muted-foreground/30" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">
                          {lease.collectionName ?? `Collection #${lease.collectionId}`}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            variant="outline"
                            className="text-[10px] border-green-500/30 text-green-500 gap-1 px-1.5"
                          >
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
                          onClick={() =>
                            lease.designerProfileId &&
                            setLocation(
                              `/wardrobe-marketplace/designer/${lease.designerProfileId}`,
                            )
                          }
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
                    className="p-4 rounded-xl border border-border bg-card/60 hover:border-amber-500/20 transition-colors glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20"
                  >
                    {/* Item row */}
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 rounded-lg bg-muted/50 flex items-center justify-center shrink-0 overflow-hidden">
                        {lease.imageUrl ? (
                          <img
                            src={lease.imageUrl}
                            alt="item"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Shirt className="h-6 w-6 text-muted-foreground/30" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">
                          {lease.itemName ?? `Item #${lease.wardrobeItemId}`}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            variant="outline"
                            className="text-[10px] border-green-500/30 text-green-500 gap-1 px-1.5"
                          >
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
                          onClick={() =>
                            lease.designerProfileId &&
                            setLocation(
                              `/wardrobe-marketplace/designer/${lease.designerProfileId}`,
                            )
                          }
                        >
                          View <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                      </div>
                    </div>

                    {/* Assignments section — expand/collapse + add */}
                    <ItemAssignmentsSection
                      wardrobeItemId={lease.wardrobeItemId}
                      itemLabel={lease.itemName ?? `Item #${lease.wardrobeItemId}`}
                      onAddAssignment={() =>
                        setAssignTarget({
                          wardrobeItemId: lease.wardrobeItemId,
                          label: lease.itemName ?? `Item #${lease.wardrobeItemId}`,
                        })
                      }
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          {active.length > 0 && (
            <p className="text-center text-xs text-muted-foreground/50 pb-4">
              Assign the same item to as many characters as you need — one purchase, unlimited use across all your productions.
            </p>
          )}
        </div>

        {/* ── Assign to Character Dialog ──────────────────────────────────────── */}
        <Dialog open={!!assignTarget} onOpenChange={(open) => !open && resetAssign()}>
          <DialogContent className="max-w-md glass-dark">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 gradient-text-gold">
                <UserPlus className="h-4 w-4 text-amber-500" />
                Assign to Character
              </DialogTitle>
            </DialogHeader>

            {assignTarget && (
              <div className="space-y-4 py-2">
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    {assignTarget.label}
                  </span>{" "}
                  will be locked into every AI generation for the selected
                  character and scene range. You can assign this item to as many
                  characters as you need.
                </p>

                {/* Project */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Project</Label>
                  <Select
                    value={assignProjectId}
                    onValueChange={(v) => {
                      setAssignProjectId(v);
                      setAssignCharacterId("");
                    }}
                  >
                    <SelectTrigger className="h-9 text-sm focus:ring-amber-500/30 focus:border-amber-500/50 hover:border-amber-500/40">
                      <SelectValue placeholder="Select a project…" />
                    </SelectTrigger>
                    <SelectContent>
                      {(projects ?? []).map((p: any) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          <span className="flex items-center gap-2">
                            <Film className="h-3.5 w-3.5 text-amber-400/70" />
                            {p.title}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Character */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Character</Label>
                  <Select
                    value={assignCharacterId}
                    onValueChange={setAssignCharacterId}
                    disabled={!assignProjectId}
                  >
                    <SelectTrigger className="h-9 text-sm focus:ring-amber-500/30 focus:border-amber-500/50 hover:border-amber-500/40">
                      <SelectValue
                        placeholder={
                          assignProjectId
                            ? "Select a character…"
                            : "Pick a project first"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {(characters ?? []).map((c: any) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Scene range */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">From scene</Label>
                    <Input
                      type="number"
                      min={1}
                      value={fromScene}
                      onChange={(e) => setFromScene(e.target.value)}
                      className="h-9 text-sm focus:ring-amber-500/30 focus:border-amber-500/50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">To scene</Label>
                    <Input
                      type="number"
                      min={1}
                      value={toScene}
                      onChange={(e) => setToScene(e.target.value)}
                      className="h-9 text-sm focus:ring-amber-500/30 focus:border-amber-500/50"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    Notes{" "}
                    <span className="text-muted-foreground font-normal">
                      (optional)
                    </span>
                  </Label>
                  <Input
                    placeholder="e.g. evening gown for gala scenes only"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="h-9 text-sm focus:ring-amber-500/30 focus:border-amber-500/50"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetAssign}
                    className="h-9"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleAssign}
                    disabled={
                      assignMutation.isPending ||
                      !assignProjectId ||
                      !assignCharacterId
                    }
                    className="h-9 bg-amber-500 hover:bg-amber-400 text-black font-bold"
                  >
                    {assignMutation.isPending ? "Assigning…" : "Assign"}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }
  