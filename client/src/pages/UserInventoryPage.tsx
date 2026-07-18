import { useEffect, useMemo, useState } from "react";
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
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clapperboard,
  Film,
  Layers3,
  Search,
  Shirt,
  ShoppingBag,
  Trash2,
  UserPlus,
} from "lucide-react";

type InventoryRow = {
  inventoryKey: string;
  accessSource: "item_purchase" | "collection_purchase" | "designer_owned";
  leaseId?: number;
  collectionId?: number | null;
  collectionName?: string | null;
  item: {
    id: number;
    name: string;
    description?: string | null;
    category?: string | null;
    primaryImageUrl?: string | null;
    imageUrls?: unknown;
    referencePrompt?: string | null;
  };
  assignable: boolean;
  validationErrors: string[];
};

type AssignTarget = { wardrobeItemId: number; label: string };

function itemImage(row: InventoryRow): string | undefined {
  if (row.item.primaryImageUrl) return row.item.primaryImageUrl;
  if (Array.isArray(row.item.imageUrls)) {
    const first = row.item.imageUrls.find((value): value is string => typeof value === "string" && value.length > 0);
    return first;
  }
  return undefined;
}

function ItemAssignmentsSection({
  wardrobeItemId,
  onAddAssignment,
  disabled,
}: {
  wardrobeItemId: number;
  onAddAssignment: () => void;
  disabled: boolean;
}) {
  const utils = trpc.useUtils();
  const [expanded, setExpanded] = useState(false);
  const { data: assignments, isLoading } = trpc.wardrobeMarket.director.listByItem.useQuery(
    { wardrobeItemId },
    { enabled: expanded },
  );
  const removeMutation = trpc.wardrobeMarket.director.remove.useMutation({
    onSuccess: () => {
      toast.success("Assignment removed.");
      utils.wardrobeMarket.director.listByItem.invalidate({ wardrobeItemId });
    },
    onError: (error: { message: string }) => toast.error(error.message || "Assignment could not be removed."),
  });

  return (
    <div className="mt-3 border-t border-border/60 pt-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="flex min-h-11 items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {expanded ? "Hide character assignments" : "Show character assignments"}
        </button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={onAddAssignment}
          className="min-h-11 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
        >
          <UserPlus className="mr-1.5 h-3.5 w-3.5" />
          Assign to character
        </Button>
      </div>

      {expanded && (
        <div className="mt-2 space-y-2">
          {isLoading && <Skeleton className="h-12 rounded-lg" />}
          {!isLoading && (!assignments || assignments.length === 0) && (
            <p className="rounded-lg bg-muted/30 px-3 py-3 text-xs text-muted-foreground">
              This item is not assigned to a character yet.
            </p>
          )}
          {(assignments ?? []).map((assignment: any) => (
            <div key={assignment.id} className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/30 px-3 py-2">
              <Clapperboard className="h-3.5 w-3.5 shrink-0 text-amber-400" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold">{assignment.characterName ?? `Character #${assignment.characterId}`}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {assignment.projectTitle ?? `Project #${assignment.projectId}`} · scenes {assignment.fromSceneOrder}–{assignment.toSceneOrder}
                </p>
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                disabled={removeMutation.isPending}
                onClick={() => removeMutation.mutate({ assignmentId: assignment.id })}
                className="h-11 w-11 shrink-0 text-muted-foreground hover:bg-red-500/10 hover:text-red-400"
                aria-label="Remove assignment"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function UserInventoryPage() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [query, setQuery] = useState("");
  const [assignTarget, setAssignTarget] = useState<AssignTarget | null>(null);
  const [assignProjectId, setAssignProjectId] = useState("");
  const [assignCharacterId, setAssignCharacterId] = useState("");
  const [fromScene, setFromScene] = useState("0");
  const [toScene, setToScene] = useState("0");
  const [notes, setNotes] = useState("");

  const { data: inventory, isLoading } = trpc.wardrobeMarket.leasing.myInventory.useQuery();
  const { data: projects } = trpc.project.list.useQuery(undefined, { enabled: Boolean(assignTarget) });
  const projectId = Number(assignProjectId);
  const { data: characters } = trpc.character.listByProject.useQuery(
    { projectId },
    { enabled: projectId > 0 },
  );
  const { data: projectScenes } = trpc.scene.listByProject.useQuery(
    { projectId },
    { enabled: projectId > 0 },
  );

  const sceneBounds = useMemo(() => {
    const orders = (projectScenes ?? []).map((scene: any) => Number(scene.orderIndex)).filter(Number.isFinite);
    return orders.length ? { min: Math.min(...orders), max: Math.max(...orders) } : { min: 0, max: 0 };
  }, [projectScenes]);

  useEffect(() => {
    if (!assignProjectId) return;
    setFromScene(String(sceneBounds.min));
    setToScene(String(sceneBounds.max));
  }, [assignProjectId, sceneBounds.min, sceneBounds.max]);

  const resetAssign = () => {
    setAssignTarget(null);
    setAssignProjectId("");
    setAssignCharacterId("");
    setFromScene("0");
    setToScene("0");
    setNotes("");
  };

  const assignMutation = trpc.wardrobeMarket.director.assign.useMutation({
    onSuccess: () => {
      toast.success("Wardrobe locked to the selected character and scene range.");
      if (assignTarget) utils.wardrobeMarket.director.listByItem.invalidate({ wardrobeItemId: assignTarget.wardrobeItemId });
      resetAssign();
    },
    onError: (error: { message: string }) => toast.error(error.message || "Item could not be assigned."),
  });

  const rows = (inventory ?? []) as InventoryRow[];
  const filtered = rows.filter((row) => {
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    return [row.item.name, row.item.description, row.item.category, row.collectionName].some((value) => value?.toLowerCase().includes(needle));
  });
  const grouped = filtered.reduce<Record<string, InventoryRow[]>>((result, row) => {
    const key = row.collectionName || (row.accessSource === "designer_owned" ? "My uploaded designs" : "Individual purchases");
    (result[key] ||= []).push(row);
    return result;
  }, {});

  const submitAssignment = () => {
    if (!assignTarget || !projectId || !assignCharacterId) {
      toast.error("Select a project and character.");
      return;
    }
    const start = Number(fromScene);
    const end = Number(toScene);
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < sceneBounds.min || end > sceneBounds.max || end < start) {
      toast.error(`Choose a valid scene range between ${sceneBounds.min} and ${sceneBounds.max}.`);
      return;
    }
    assignMutation.mutate({
      wardrobeItemId: assignTarget.wardrobeItemId,
      projectId,
      characterId: Number(assignCharacterId),
      fromSceneOrder: start,
      toSceneOrder: end,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/70 bg-card/50 px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Shirt className="h-5 w-5 text-amber-500" />
            <div>
              <h1 className="text-lg font-bold">Wardrobe inventory</h1>
              <p className="text-xs text-muted-foreground">Every purchased item is available individually for character assignment.</p>
            </div>
          </div>
          <Button type="button" variant="outline" onClick={() => setLocation("/wardrobe-marketplace")} className="min-h-11">
            <ShoppingBag className="mr-2 h-4 w-4" /> Browse marketplace
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search garments, collections or categories" className="h-11 pl-9" />
        </div>

        {isLoading && <div className="grid gap-4 md:grid-cols-2">{[1, 2, 3, 4].map((value) => <Skeleton key={value} className="h-56 rounded-xl" />)}</div>}

        {!isLoading && rows.length === 0 && (
          <div className="rounded-xl border border-dashed border-border px-6 py-16 text-center">
            <Shirt className="mx-auto h-12 w-12 text-muted-foreground/30" />
            <h2 className="mt-4 font-semibold">No wardrobe items yet</h2>
            <p className="mt-1 text-sm text-muted-foreground">Purchased items and every item inside a purchased collection will appear here.</p>
            <Button type="button" onClick={() => setLocation("/wardrobe-marketplace")} className="mt-5 min-h-11 bg-amber-500 text-black hover:bg-amber-400">
              Browse wardrobe
            </Button>
          </div>
        )}

        {Object.entries(grouped).map(([group, groupRows]) => (
          <section key={group} className="space-y-3">
            <div className="flex items-center gap-2">
              <Layers3 className="h-4 w-4 text-amber-500" />
              <h2 className="text-sm font-bold">{group}</h2>
              <Badge variant="secondary">{groupRows.length}</Badge>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {groupRows.map((row) => {
                const image = itemImage(row);
                return (
                  <article key={row.inventoryKey} className="rounded-xl border border-border/70 bg-card/60 p-4 shadow-sm transition-colors hover:border-amber-500/30">
                    <div className="flex gap-4">
                      <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-border bg-muted/40">
                        {image ? <img src={image} alt={row.item.name} className="h-full w-full object-cover" loading="lazy" /> : <div className="flex h-full items-center justify-center"><Shirt className="h-7 w-7 text-muted-foreground/30" /></div>}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 font-semibold">{row.item.name}</p>
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{row.item.description || row.item.referencePrompt || "Production wardrobe item"}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {row.item.category && <Badge variant="outline" className="text-[10px]">{row.item.category}</Badge>}
                          {row.accessSource === "collection_purchase" && <Badge variant="outline" className="border-amber-500/30 text-[10px] text-amber-400">Collection purchase</Badge>}
                          {row.assignable ? (
                            <Badge variant="outline" className="border-green-500/30 text-[10px] text-green-500"><CheckCircle2 className="mr-1 h-3 w-3" />Ready</Badge>
                          ) : (
                            <Badge variant="outline" className="border-red-500/30 text-[10px] text-red-400"><AlertTriangle className="mr-1 h-3 w-3" />Needs attention</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    {!row.assignable && <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-300">{row.validationErrors.join(" ")}</p>}
                    <ItemAssignmentsSection
                      wardrobeItemId={row.item.id}
                      disabled={!row.assignable}
                      onAddAssignment={() => setAssignTarget({ wardrobeItemId: row.item.id, label: row.item.name })}
                    />
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </main>

      <Dialog open={Boolean(assignTarget)} onOpenChange={(open) => !open && resetAssign()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><UserPlus className="h-4 w-4 text-amber-500" />Assign wardrobe</DialogTitle>
          </DialogHeader>
          {assignTarget && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground"><strong className="text-foreground">{assignTarget.label}</strong> will be hard-locked to this character for the selected scene range.</p>
              <div className="space-y-1.5">
                <Label>Project</Label>
                <Select value={assignProjectId} onValueChange={(value) => { setAssignProjectId(value); setAssignCharacterId(""); }}>
                  <SelectTrigger className="h-11"><SelectValue placeholder="Select a project" /></SelectTrigger>
                  <SelectContent>{(projects ?? []).map((project: any) => <SelectItem key={project.id} value={String(project.id)}><span className="flex items-center gap-2"><Film className="h-4 w-4 text-amber-400" />{project.title}</span></SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Character</Label>
                <Select value={assignCharacterId} onValueChange={setAssignCharacterId} disabled={!projectId}>
                  <SelectTrigger className="h-11"><SelectValue placeholder={projectId ? "Select a character" : "Select a project first"} /></SelectTrigger>
                  <SelectContent>{(characters ?? []).map((character: any) => <SelectItem key={character.id} value={String(character.id)}>{character.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>From scene</Label><Input type="number" min={sceneBounds.min} max={sceneBounds.max} value={fromScene} onChange={(event) => setFromScene(event.target.value)} className="h-11" /></div>
                <div className="space-y-1.5"><Label>To scene</Label><Input type="number" min={sceneBounds.min} max={sceneBounds.max} value={toScene} onChange={(event) => setToScene(event.target.value)} className="h-11" /></div>
              </div>
              {projectId > 0 && <p className="text-xs text-muted-foreground">Available range: {sceneBounds.min}–{sceneBounds.max}</p>}
              <div className="space-y-1.5"><Label>Continuity notes</Label><Input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Fit, damage, accessories or when the coat is buttoned" className="h-11" /></div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={resetAssign} className="min-h-11">Cancel</Button>
                <Button type="button" onClick={submitAssignment} disabled={assignMutation.isPending || !projectId || !assignCharacterId || !projectScenes?.length} className="min-h-11 bg-amber-500 font-bold text-black hover:bg-amber-400">
                  {assignMutation.isPending ? "Assigning…" : "Assign and lock"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
