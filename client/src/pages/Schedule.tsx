import { useState } from "react";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ArrowLeft, Plus, Calendar, Trash2, Loader2, Clock, MapPin, Cloud } from "lucide-react";
import StripBoard from "@/components/StripBoard";

/**
 * v6.63 — Schedule page. Top bar to add/edit shoot days, then the Strip
 * Board below for assigning scenes to days. Mirrors StudioBinder's
 * stripboard / Movie Magic Scheduling layout.
 */
export default function Schedule() {
  const { id } = useParams<{ id: string }>();
  const projectId = parseInt(id || "0");
  const utils = trpc.useUtils();
  const { data: project } = trpc.project.get.useQuery({ id: projectId }, { enabled: !!projectId });
  const { data: days = [] } = trpc.shootDay.list.useQuery({ projectId }, { enabled: !!projectId });
  const { data: scenes = [] } = trpc.scene.list.useQuery({ projectId }, { enabled: !!projectId });
  const { data: locations = [] } = trpc.location.list.useQuery({ projectId }, { enabled: !!projectId });

  const createMut = trpc.shootDay.create.useMutation();
  const updateMut = trpc.shootDay.update.useMutation();
  const deleteMut = trpc.shootDay.delete.useMutation();

  const [addOpen, setAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ dayNumber: 1, shootDate: "", callTime: "", wrapTime: "", locationId: "", weatherNote: "", hospitalInfo: "", parkingInfo: "", generalNotes: "" });

  function resetForm() {
    setForm({ dayNumber: (days as any[]).length + 1, shootDate: "", callTime: "", wrapTime: "", locationId: "", weatherNote: "", hospitalInfo: "", parkingInfo: "", generalNotes: "" });
  }

  async function handleCreate() {
    try {
      await createMut.mutateAsync({
        projectId,
        dayNumber: form.dayNumber,
        shootDate: form.shootDate || null,
        callTime: form.callTime || null,
        wrapTime: form.wrapTime || null,
        locationId: form.locationId ? Number(form.locationId) : null,
        weatherNote: form.weatherNote || null,
        hospitalInfo: form.hospitalInfo || null,
        parkingInfo: form.parkingInfo || null,
        generalNotes: form.generalNotes || null,
      });
      await utils.shootDay.list.invalidate();
      toast.success("Shoot day added");
      setAddOpen(false);
      resetForm();
    } catch (e: any) { toast.error(e?.message || "Failed"); }
  }

  async function handleSaveEdit() {
    if (!editingId) return;
    try {
      await updateMut.mutateAsync({
        id: editingId,
        dayNumber: form.dayNumber,
        shootDate: form.shootDate || null,
        callTime: form.callTime || null,
        wrapTime: form.wrapTime || null,
        locationId: form.locationId ? Number(form.locationId) : null,
        weatherNote: form.weatherNote || null,
        hospitalInfo: form.hospitalInfo || null,
        parkingInfo: form.parkingInfo || null,
        generalNotes: form.generalNotes || null,
      });
      await utils.shootDay.list.invalidate();
      toast.success("Updated");
      setEditingId(null);
      resetForm();
    } catch (e: any) { toast.error(e?.message || "Failed"); }
  }

  async function handleDelete(dayId: number) {
    if (!confirm("Delete this shoot day? Any assigned scenes will be unscheduled.")) return;
    try {
      await deleteMut.mutateAsync({ id: dayId });
      await Promise.all([utils.shootDay.list.invalidate(), utils.scene.list.invalidate()]);
      toast.success("Deleted");
    } catch (e: any) { toast.error(e?.message || "Failed"); }
  }

  function startEdit(d: any) {
    setEditingId(d.id);
    setAddOpen(false);
    setForm({
      dayNumber: d.dayNumber || 1,
      shootDate: d.shootDate ? new Date(d.shootDate).toISOString().slice(0, 10) : "",
      callTime: d.callTime || "",
      wrapTime: d.wrapTime || "",
      locationId: d.locationId ? String(d.locationId) : "",
      weatherNote: d.weatherNote || "",
      hospitalInfo: d.hospitalInfo || "",
      parkingInfo: d.parkingInfo || "",
      generalNotes: d.generalNotes || "",
    });
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <Link href={`/projects/${projectId}`}>
              <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-zinc-100">
                <ArrowLeft className="w-4 h-4 mr-1" /> Back to project
              </Button>
            </Link>
            <h1 className="text-2xl font-bold flex items-center gap-2 mt-1">
              <Calendar className="w-6 h-6 text-amber-500" />
              Production Schedule
            </h1>
            <div className="text-sm text-zinc-400">{project?.title || "—"} · {(days as any[]).length} day{(days as any[]).length === 1 ? "" : "s"} · {(scenes as any[]).length} scene{(scenes as any[]).length === 1 ? "" : "s"}</div>
          </div>
          <div className="flex gap-2">
            <Link href={`/projects/${projectId}/day-out-of-days`}>
              <Button variant="outline" size="sm">Day-Out-of-Days</Button>
            </Link>
            <Link href={`/projects/${projectId}/call-sheets`}>
              <Button variant="outline" size="sm">Call Sheets</Button>
            </Link>
            <Button size="sm" onClick={() => { setAddOpen(true); setEditingId(null); resetForm(); }} className="bg-amber-600 hover:bg-amber-500 text-zinc-950">
              <Plus className="w-4 h-4 mr-1" /> Add day
            </Button>
          </div>
        </div>

        {(addOpen || editingId !== null) && (
          <Card className="bg-zinc-950 border-zinc-800">
            <CardHeader><CardTitle className="text-base">{editingId ? `Edit Day ${form.dayNumber}` : "New shoot day"}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div><label className="text-xs text-zinc-400">Day #</label><Input type="number" min={1} value={form.dayNumber} onChange={(e) => setForm((f) => ({ ...f, dayNumber: Number(e.target.value) || 1 }))} className="bg-zinc-900 border-zinc-800" /></div>
                <div><label className="text-xs text-zinc-400">Date</label><Input type="date" value={form.shootDate} onChange={(e) => setForm((f) => ({ ...f, shootDate: e.target.value }))} className="bg-zinc-900 border-zinc-800" /></div>
                <div><label className="text-xs text-zinc-400 flex items-center gap-1"><Clock className="w-3 h-3" /> Call</label><Input type="time" value={form.callTime} onChange={(e) => setForm((f) => ({ ...f, callTime: e.target.value }))} className="bg-zinc-900 border-zinc-800" /></div>
                <div><label className="text-xs text-zinc-400 flex items-center gap-1"><Clock className="w-3 h-3" /> Wrap</label><Input type="time" value={form.wrapTime} onChange={(e) => setForm((f) => ({ ...f, wrapTime: e.target.value }))} className="bg-zinc-900 border-zinc-800" /></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 flex items-center gap-1"><MapPin className="w-3 h-3" /> Location</label>
                  <select value={form.locationId} onChange={(e) => setForm((f) => ({ ...f, locationId: e.target.value }))} className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-sm">
                    <option value="">— None —</option>
                    {(locations as any[]).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
                <div><label className="text-xs text-zinc-400 flex items-center gap-1"><Cloud className="w-3 h-3" /> Weather note</label><Input value={form.weatherNote} onChange={(e) => setForm((f) => ({ ...f, weatherNote: e.target.value }))} placeholder="Sunny, 72°F, light breeze" className="bg-zinc-900 border-zinc-800" /></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><label className="text-xs text-zinc-400">Hospital info</label><Textarea value={form.hospitalInfo} onChange={(e) => setForm((f) => ({ ...f, hospitalInfo: e.target.value }))} rows={2} placeholder="Mercy Memorial · 4210 N Main · 555-0100" className="bg-zinc-900 border-zinc-800 text-sm" /></div>
                <div><label className="text-xs text-zinc-400">Parking & access</label><Textarea value={form.parkingInfo} onChange={(e) => setForm((f) => ({ ...f, parkingInfo: e.target.value }))} rows={2} placeholder="Crew parking on 5th St lot. Cast holding in basement." className="bg-zinc-900 border-zinc-800 text-sm" /></div>
              </div>
              <div><label className="text-xs text-zinc-400">General notes</label><Textarea value={form.generalNotes} onChange={(e) => setForm((f) => ({ ...f, generalNotes: e.target.value }))} rows={2} className="bg-zinc-900 border-zinc-800 text-sm" /></div>
              <div className="flex gap-2 pt-2">
                <Button size="sm" disabled={createMut.isPending || updateMut.isPending} onClick={editingId ? handleSaveEdit : handleCreate} className="bg-amber-600 hover:bg-amber-500 text-zinc-950">
                  {(createMut.isPending || updateMut.isPending) && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
                  {editingId ? "Save changes" : "Create day"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setAddOpen(false); setEditingId(null); }}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Day list quick-edit row */}
        {(days as any[]).length > 0 && (
          <Card className="bg-zinc-950 border-zinc-800">
            <CardContent className="p-3">
              <div className="text-xs uppercase tracking-wide text-zinc-400 mb-2">Days · click to edit</div>
              <div className="flex flex-wrap gap-2">
                {(days as any[]).map((d) => (
                  <div key={d.id} className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded pl-2">
                    <button onClick={() => startEdit(d)} className="text-xs text-zinc-200 hover:text-amber-400 py-1">
                      D{d.dayNumber}{d.shootDate ? ` · ${new Date(d.shootDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}` : ""}
                    </button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(d.id)} className="h-6 w-6 p-0 text-red-400 hover:text-red-300"><Trash2 className="w-3 h-3" /></Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <StripBoard projectId={projectId} scenes={scenes as any} days={days as any} locations={locations as any} />
      </div>
    </div>
  );
}
