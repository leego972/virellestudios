import { useState } from "react";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ArrowLeft, Plus, Users, Trash2, Loader2, Mail, Phone, Edit2 } from "lucide-react";

const DEPARTMENTS = ["Camera", "Sound", "Grip", "Electric", "Art", "Wardrobe", "Hair/Makeup", "Production", "Stunts", "VFX", "Post", "Other"];

/** v6.63 ÃÂ¢ÃÂÃÂ Crew & contacts directory page. */
export default function Contacts() {
  const { id } = useParams<{ id: string }>();
  const projectId = parseInt(id || "0");
  const utils = trpc.useUtils();
  const { data: contacts = [], isLoading } = trpc.crewContact.list.useQuery({ projectId }, { enabled: !!projectId });
  const createMut = trpc.crewContact.create.useMutation();
  const updateMut = trpc.crewContact.update.useMutation();
  const deleteMut = trpc.crewContact.delete.useMutation();

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const empty = { name: "", role: "", department: "", email: "", phone: "", callTimeOverride: "", notes: "" };
  const [form, setForm] = useState(empty);

  function startNew() { setEditingId(null); setForm(empty); setOpen(true); }
  function startEdit(c: any) {
    setEditingId(c.id);
    setForm({ name: c.name || "", role: c.role || "", department: c.department || "", email: c.email || "", phone: c.phone || "", callTimeOverride: c.callTimeOverride || "", notes: c.notes || "" });
    setOpen(true);
  }

  async function save() {
    try {
      if (!form.name.trim()) { toast.error("Name is required"); return; }
      if (editingId) {
        await updateMut.mutateAsync({ id: editingId, projectId, ...form });
      } else {
        await createMut.mutateAsync({ projectId, ...form });
      }
      await utils.crewContact.list.invalidate();
      toast.success(editingId ? "Contact updated" : "Contact added");
      setOpen(false);
      setForm(empty);
      setEditingId(null);
    } catch (e: any) { toast.error(e?.message || "Failed"); }
  }

  async function handleDelete(cid: number) {
    if (!confirm("Delete this contact?")) return;
    try { await deleteMut.mutateAsync({ id: cid, projectId }); await utils.crewContact.list.invalidate(); toast.success("Deleted"); }
    catch (e: any) { toast.error(e?.message || "Failed"); }
  }

  // Group by department for display
  const grouped: Record<string, any[]> = {};
  for (const c of (contacts as any[])) {
    const k = c.department || "Other";
    (grouped[k] = grouped[k] || []).push(c);
  }

  return (
    <div className="min-h-screen text-zinc-100 p-4 md:p-6" style={{ background:"linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)" }}>
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <Link href={`/projects/${projectId}`}>
              <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-zinc-100">
                <ArrowLeft className="w-4 h-4 mr-1" /> Back to project
              </Button>
            </Link>
            <h1 className="text-2xl font-bold flex items-center gap-2 mt-1 gradient-text-gold">
              <Users className="w-6 h-6 text-amber-500" /> Crew & Contacts
            </h1>
            <p className="text-sm text-zinc-400">{(contacts as any[]).length} contact{(contacts as any[]).length === 1 ? "" : "s"}</p>
          </div>
          <Button size="sm" onClick={startNew} className="bg-amber-600 hover:bg-amber-500 text-zinc-950">
            <Plus className="w-4 h-4 mr-1" /> Add contact
          </Button>
        </div>

        {open && (
          <Card className="bg-zinc-950 border-zinc-800 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
            <CardHeader><CardTitle className="text-base gradient-text-gold glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">{editingId ? "Edit contact" : "New contact"}</CardTitle></CardHeader>
            <CardContent className="space-y-3 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><label className="text-xs text-zinc-400">Name *</label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="bg-zinc-900 border-zinc-800" /></div>
                <div><label className="text-xs text-zinc-400">Role / Title</label><Input value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} placeholder="DP, Boom op, 1st ADÃÂ¢ÃÂÃÂ¦" className="bg-zinc-900 border-zinc-800" /></div>
                <div>
                  <label className="text-xs text-zinc-400">Department</label>
                  <select value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))} className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-sm">
                    <option value="">ÃÂ¢ÃÂÃÂ</option>
                    {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div><label className="text-xs text-zinc-400">Call time override</label><Input type="time" value={form.callTimeOverride} onChange={(e) => setForm((f) => ({ ...f, callTimeOverride: e.target.value }))} className="bg-zinc-900 border-zinc-800" /></div>
                <div><label className="text-xs text-zinc-400">Email</label><Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="bg-zinc-900 border-zinc-800" /></div>
                <div><label className="text-xs text-zinc-400">Phone</label><Input type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className="bg-zinc-900 border-zinc-800" /></div>
              </div>
              <div><label className="text-xs text-zinc-400">Notes</label><Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} className="bg-zinc-900 border-zinc-800 text-sm" /></div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" disabled={createMut.isPending || updateMut.isPending} onClick={save} className="bg-amber-600 hover:bg-amber-500 text-zinc-950">
                  {(createMut.isPending || updateMut.isPending) && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1 text-amber-400" />}
                  {editingId ? "Save" : "Create"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setOpen(false); setEditingId(null); }}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="text-center py-12 text-zinc-500"><Loader2 className="w-5 h-5 animate-spin inline mr-2 text-amber-400" />LoadingÃÂ¢ÃÂÃÂ¦</div>
        ) : (contacts as any[]).length === 0 ? (
          <Card className="bg-zinc-950 border-zinc-800 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
            <CardContent className="p-8 text-center text-sm text-zinc-500 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">No contacts yet. Add your first crew member above.</CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {Object.entries(grouped).map(([dept, list]) => (
              <Card key={dept} className="bg-zinc-950 border-zinc-800 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
                <CardHeader className="pb-2 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow"><CardTitle className="text-sm uppercase tracking-wide text-amber-500 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">{dept}</CardTitle></CardHeader>
                <CardContent className="p-0 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
                  <table className="w-full text-sm">
                    <thead className="text-xs text-zinc-400 bg-zinc-900/40">
                      <tr><th className="px-3 py-2 text-left">Name</th><th className="px-3 py-2 text-left">Role</th><th className="px-3 py-2 text-left">Call</th><th className="px-3 py-2 text-left">Contact</th><th className="px-3 py-2"></th></tr>
                    </thead>
                    <tbody>
                      {list.map((c) => (
                        <tr key={c.id} className="border-t border-zinc-800 hover:bg-amber-500/10/40">
                          <td className="px-3 py-2 font-medium">{c.name}</td>
                          <td className="px-3 py-2 text-zinc-300">{c.role || "ÃÂ¢ÃÂÃÂ"}</td>
                          <td className="px-3 py-2 font-mono text-xs">{c.callTimeOverride || "ÃÂ¢ÃÂÃÂ"}</td>
                          <td className="px-3 py-2 text-xs space-y-0.5">
                            {c.email && <div className="flex items-center gap-1 text-zinc-300"><Mail className="w-3 h-3" /><a href={`mailto:${c.email}`} className="hover:text-amber-400">{c.email}</a></div>}
                            {c.phone && <div className="flex items-center gap-1 text-zinc-300"><Phone className="w-3 h-3" /><a href={`tel:${c.phone}`} className="hover:text-amber-400">{c.phone}</a></div>}
                          </td>
                          <td className="px-3 py-2 text-right whitespace-nowrap">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => startEdit(c)}><Edit2 className="w-3.5 h-3.5" /></Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400 hover:text-red-300" onClick={() => handleDelete(c.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
