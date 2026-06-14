import { useState } from "react";
import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Plus, Pencil, Trash2, Tag, ShieldCheck, ShieldAlert, ShieldX } from "lucide-react";
import { toast } from "sonner";

type Policy = "allowed" | "required" | "forbidden";

type FormState = {
  name: string;
  category: string;
  policy: Policy;
  notes: string;
};

const empty: FormState = { name: "", category: "", policy: "allowed", notes: "" };

const policyMeta: Record<Policy, { label: string; tone: string; icon: typeof ShieldCheck; blurb: string }> = {
  allowed: {
    label: "Allowed",
    tone: "bg-emerald-900/40 text-emerald-300 border-emerald-700/60",
    icon: ShieldCheck,
    blurb: "AI may include this brand naturally where it fits the scene.",
  },
  required: {
    label: "Required",
    tone: "bg-amber-900/40 text-amber-300 border-amber-700/60",
    icon: ShieldAlert,
    blurb: "AI should actively place this brand somewhere visible in the film.",
  },
  forbidden: {
    label: "Forbidden",
    tone: "bg-rose-900/40 text-rose-300 border-rose-700/60",
    icon: ShieldX,
    blurb: "AI must NEVER show, name, or hint at this brand in any shot.",
  },
};

export default function ProjectBrands() {
  const params = useParams<{ projectId: string }>();
  const projectId = Number(params.projectId);

  const utils = trpc.useUtils();
  const projectQ = trpc.project.get.useQuery({ id: projectId }, { enabled: !!projectId });
  const brandsQ = trpc.brand.listByProject.useQuery({ projectId }, { enabled: !!projectId });

  const create = trpc.brand.create.useMutation({
    onSuccess: () => {
      utils.brand.listByProject.invalidate({ projectId });
      toast.success("Brand added");
      closeDialog();
    },
    onError: (e) => toast.error(e.message),
  });
  const update = trpc.brand.update.useMutation({
    onSuccess: () => {
      utils.brand.listByProject.invalidate({ projectId });
      toast.success("Brand updated");
      closeDialog();
    },
    onError: (e) => toast.error(e.message),
  });
  const remove = trpc.brand.delete.useMutation({
    onSuccess: () => {
      utils.brand.listByProject.invalidate({ projectId });
      toast.success("Brand removed");
    },
    onError: (e) => toast.error(e.message),
  });

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(empty);

  const openNew = () => {
    setEditingId(null);
    setForm(empty);
    setOpen(true);
  };
  const openEdit = (b: any) => {
    setEditingId(b.id);
    setForm({
      name: b.name ?? "",
      category: b.category ?? "",
      policy: (b.policy ?? "allowed") as Policy,
      notes: b.notes ?? "",
    });
    setOpen(true);
  };
  const closeDialog = () => {
    setOpen(false);
    setEditingId(null);
    setForm(empty);
  };

  const submit = () => {
    const name = form.name.trim();
    if (!name) {
      toast.error("Brand name is required");
      return;
    }
    const payload = {
      projectId,
      name,
      category: form.category.trim() || undefined,
      policy: form.policy,
      notes: form.notes.trim() || undefined,
    };
    if (editingId) {
      update.mutate({ id: editingId, ...payload });
    } else {
      create.mutate(payload);
    }
  };

  const brands = brandsQ.data ?? [];
  const counts = {
    allowed: brands.filter((b: any) => b.policy === "allowed").length,
    required: brands.filter((b: any) => b.policy === "required").length,
    forbidden: brands.filter((b: any) => b.policy === "forbidden").length,
  };

  return (
    <div className="min-h-screen text-zinc-100" style={{ background:"linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)" }}>
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-6">
          <Link
            href={`/projects/${projectId}`}
            className="inline-flex items-center text-sm text-zinc-400 hover:text-amber-300"
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Back to project
          </Link>
        </div>

        <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-2 gradient-text-gold">
              <Tag className="w-7 h-7 text-amber-400" />
              Brands
              {projectQ.data?.title ? (
                <span className="text-zinc-500 font-normal">ÃÂ¢ÃÂÃÂ {projectQ.data.title}</span>
              ) : null}
            </h1>
            <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
              Tell the AI which real-world brands may, must, or must never appear
              in this film. Storefronts, billboards, signage, vehicles, drinks,
              clothing ÃÂ¢ÃÂÃÂ every shot generator (scenes, trailers, posters,
              storyboards) reads this list before drawing.
            </p>
            <p className="text-xs text-zinc-500 mt-1">Free to manage ÃÂ¢ÃÂÃÂ costs no credits.</p>
          </div>
          <Button onClick={openNew} className="bg-amber-500 hover:bg-amber-400 text-black">
            <Plus className="w-4 h-4 mr-1" /> Add brand
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          {(Object.keys(policyMeta) as Policy[]).map((p) => {
            const m = policyMeta[p];
            const Icon = m.icon;
            return (
              <Card key={p} className="bg-zinc-900/40 border-zinc-800 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
                <CardContent className="p-4 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="w-4 h-4 text-zinc-300" />
                    <span className="text-xs uppercase tracking-wider text-zinc-400">{m.label}</span>
                  </div>
                  <div className="text-2xl font-semibold">{counts[p]}</div>
                  <div className="text-xs text-zinc-500 mt-1">{m.blurb}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {brandsQ.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 bg-zinc-900" />
            <Skeleton className="h-16 bg-zinc-900" />
            <Skeleton className="h-16 bg-zinc-900" />
          </div>
        ) : brands.length === 0 ? (
          <Card className="bg-zinc-900/40 border-zinc-800 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
            <CardContent className="p-10 text-center glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
              <Tag className="w-10 h-10 mx-auto text-zinc-600 mb-3" />
              <h3 className="text-lg font-medium mb-1 gradient-text-gold">No brands defined</h3>
              <p className="text-sm text-zinc-400 mb-4 max-w-md mx-auto">
                Without a list, the AI invents generic signage. Add the brands
                your story needs (or wants to keep out) to lock in continuity.
              </p>
              <Button onClick={openNew} className="bg-amber-500 hover:bg-amber-400 text-black">
                <Plus className="w-4 h-4 mr-1" /> Add your first brand
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {brands.map((b: any) => {
              const m = policyMeta[(b.policy ?? "allowed") as Policy];
              return (
                <Card key={b.id} className="bg-zinc-900/40 border-zinc-800 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
                  <CardContent className="p-4 flex items-center gap-3 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium truncate">{b.name}</span>
                        <Badge variant="outline" className={m.tone}>
                          {m.label}
                        </Badge>
                        {b.category ? (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/20">
                            {b.category}
                          </Badge>
                        ) : null}
                      </div>
                      {b.notes ? (
                        <div className="text-xs text-zinc-400 mt-1 line-clamp-2">{b.notes}</div>
                      ) : null}
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(b)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-rose-400 hover:text-rose-300"
                      onClick={() => {
                        if (confirm(`Remove "${b.name}" from this project?`)) {
                          remove.mutate({ id: b.id });
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={(o) => (o ? setOpen(o) : closeDialog())}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
          <DialogHeader>
            <DialogTitle className="gradient-text-gold">{editingId ? "Edit brand" : "Add brand"}</DialogTitle>
            <DialogDescription className="text-zinc-400">
              The AI reads this list whenever it draws a scene, trailer frame,
              poster, or storyboard panel for this project.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-zinc-300">Brand name *</Label>
              <Input
                placeholder="Nike, Pepsi, Shell, In-N-OutÃÂ¢ÃÂÃÂ¦"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="bg-zinc-950 border-zinc-800 mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-zinc-300">Category</Label>
                <Input
                  placeholder="apparel, beverage, vehicle, signageÃÂ¢ÃÂÃÂ¦"
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className="bg-zinc-950 border-zinc-800 mt-1"
                />
              </div>
              <div>
                <Label className="text-zinc-300">Policy</Label>
                <Select
                  value={form.policy}
                  onValueChange={(v) => setForm((f) => ({ ...f, policy: v as Policy }))}
                >
                  <SelectTrigger className="bg-zinc-950 border-zinc-800 mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 text-zinc-100 border-zinc-800">
                    <SelectItem value="allowed">Allowed ÃÂ¢ÃÂÃÂ may appear</SelectItem>
                    <SelectItem value="required">Required ÃÂ¢ÃÂÃÂ must appear</SelectItem>
                    <SelectItem value="forbidden">Forbidden ÃÂ¢ÃÂÃÂ never show</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-zinc-300">Director notes (optional)</Label>
              <Textarea
                placeholder="e.g. only on background billboards, not in close-ups; the hero never drinks it."
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="bg-zinc-950 border-zinc-800 mt-1 min-h-[80px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={closeDialog}>Cancel</Button>
            <Button
              className="bg-amber-500 hover:bg-amber-400 text-black"
              disabled={create.isPending || update.isPending}
              onClick={submit}
            >
              {editingId ? "Save changes" : "Add brand"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
