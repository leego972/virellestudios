import { useState } from "react";
  import { useParams, useLocation } from "wouter";
  import { Button } from "@/components/ui/button";
  import { Input } from "@/components/ui/input";
  import { Textarea } from "@/components/ui/textarea";
  import { trpc } from "@/lib/trpc";
  import { toast } from "sonner";
  import {
    ArrowLeft, Plus, Calendar, Trash2, Loader2, Clock,
    MapPin, Cloud, ChevronDown, ChevronUp, X, Film,
    Sunrise, Sunset, Clapperboard,
  } from "lucide-react";
  import StripBoard from "@/components/StripBoard";

  const GOLD = "#D4AF37";

  function fmt(date: string) {
    if (!date) return null;
    return new Date(date).toLocaleDateString("en-US", { weekday:"short", month:"short", day:"numeric" });
  }

  export default function Schedule() {
    const { id } = useParams<{ id: string }>();
    const projectId = parseInt(id || "0");
    const [, navigate] = useLocation();
    const utils = trpc.useUtils();

    const { data: project   } = trpc.project.get.useQuery({ id: projectId }, { enabled: !!projectId });
    const { data: days  = [] } = trpc.shootDay.list.useQuery({ projectId }, { enabled: !!projectId });
    const { data: scenes= [] } = trpc.scene.listByProject.useQuery({ projectId }, { enabled: !!projectId });
    const { data: locs  = [] } = trpc.location.listByProject.useQuery({ projectId }, { enabled: !!projectId });

    const createMut = trpc.shootDay.create.useMutation();
    const updateMut = trpc.shootDay.update.useMutation();
    const deleteMut = trpc.shootDay.delete.useMutation();

    const [formOpen,  setFormOpen ] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const emptyForm = () => ({
      dayNumber: (days as any[]).length + 1,
      shootDate: "", callTime: "", wrapTime: "",
      locationId: "", weatherNote: "", hospitalInfo: "",
      parkingInfo: "", generalNotes: "",
    });
    const [form, setForm] = useState(emptyForm);
    const fp = (p: Partial<typeof form>) => setForm(f => ({ ...f, ...p }));

    const scheduledScenes = (scenes as any[]).filter((s: any) => s.shootDayId);
    const totalDays = (days as any[]).length;

    async function handleSave() {
      const payload = {
        projectId,
        dayNumber:   form.dayNumber,
        shootDate:   form.shootDate   || null,
        callTime:    form.callTime    || null,
        wrapTime:    form.wrapTime    || null,
        locationId:  form.locationId  ? Number(form.locationId) : null,
        weatherNote: form.weatherNote || null,
        hospitalInfo: form.hospitalInfo || null,
        parkingInfo: form.parkingInfo  || null,
        generalNotes: form.generalNotes || null,
      };
      try {
        if (editingId) {
          await updateMut.mutateAsync({ id: editingId, ...payload });
          toast.success("Day updated");
          setEditingId(null);
        } else {
          await createMut.mutateAsync(payload);
          toast.success("Shoot day added");
        }
        await utils.shootDay.list.invalidate();
        setFormOpen(false);
        setForm(emptyForm());
      } catch(e: any) { toast.error(e?.message || "Failed"); }
    }

    async function handleDelete(dayId: number) {
      if (!confirm("Delete this shoot day? Assigned scenes will be unscheduled.")) return;
      try {
        await deleteMut.mutateAsync({ id: dayId });
        await Promise.all([utils.shootDay.list.invalidate(), utils.scene.listByProject.invalidate()]);
        toast.success("Deleted");
      } catch(e: any) { toast.error(e?.message || "Failed"); }
    }

    function startEdit(d: any) {
      setEditingId(d.id); setFormOpen(true);
      setForm({
        dayNumber: d.dayNumber || 1,
        shootDate: d.shootDate ? new Date(d.shootDate).toISOString().slice(0,10) : "",
        callTime:  d.callTime  || "", wrapTime: d.wrapTime || "",
        locationId: d.locationId ? String(d.locationId) : "",
        weatherNote: d.weatherNote || "", hospitalInfo: d.hospitalInfo || "",
        parkingInfo: d.parkingInfo || "", generalNotes: d.generalNotes || "",
      });
    }

    function cancelForm() { setFormOpen(false); setEditingId(null); setForm(emptyForm()); }

    return (
      <div className="min-h-screen" style={{ background:"linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)" }}>
        {/* Header */}
        <div className="border-b sticky top-0 z-20" style={{ borderColor:"rgba(255,255,255,0.07)", background:"rgba(7,7,14,0.97)", backdropFilter:"blur(24px)" }}>
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => navigate(`/projects/${projectId}`)} className="gap-2 text-muted-foreground h-8"><ArrowLeft className="h-4 w-4" />Back</Button>
              <div className="h-5 w-px bg-border/40" />
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0" style={{ background:"linear-gradient(135deg,#D4AF37,#b8960c)" }}>
                  <Calendar className="text-black" style={{ width:18, height:18 }} />
                </div>
                <div>
                  <div className="font-bold text-sm">{project?.title} — Production Schedule</div>
                  <div className="text-[10px] text-muted-foreground">
                    {totalDays} shoot day{totalDays !== 1 ? "s" : ""} · {(scenes as any[]).length} scenes · {scheduledScenes.length} scheduled
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="h-8 text-xs border-border/40" onClick={() => navigate(`/projects/${projectId}/day-out-of-days`)}>Day-Out-of-Days</Button>
              <Button size="sm" variant="outline" className="h-8 text-xs border-border/40" onClick={() => navigate(`/projects/${projectId}/call-sheets`)}>Call Sheets</Button>
              <Button size="sm" onClick={() => { cancelForm(); setFormOpen(true); }} className="h-8 text-xs gap-1.5" style={{ background:"linear-gradient(135deg,#D4AF37,#b8960c)", color:"#000" }}>
                <Plus className="h-3.5 w-3.5" />Add Day
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-5 space-y-4">

          {/* Stats */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
            {[
              { label:"Shoot Days",      val:String(totalDays),                      color:GOLD        },
              { label:"Total Scenes",    val:String((scenes as any[]).length),       color:"#60a5fa"   },
              { label:"Scheduled",       val:String(scheduledScenes.length),         color:"#4ade80"   },
              { label:"Unscheduled",     val:String((scenes as any[]).length - scheduledScenes.length), color:"#f87171" },
              { label:"Locations",       val:String((locs as any[]).length),         color:"#a78bfa"   },
              { label:"Sched %",         val:`${(scenes as any[]).length ? Math.round(scheduledScenes.length/(scenes as any[]).length*100) : 0}%`, color:scheduledScenes.length===(scenes as any[]).length&&(scenes as any[]).length>0?"#4ade80":GOLD },
            ].map((s,i) => (
              <div key={i} className="rounded-xl border px-3 py-2.5" style={{ borderColor:"rgba(255,255,255,0.07)", background:"rgba(255,255,255,0.02)" }}>
                <div className="text-[9px] text-muted-foreground uppercase tracking-wider truncate">{s.label}</div>
                <div className="text-xl font-bold mt-0.5" style={{ color:s.color }}>{s.val}</div>
              </div>
            ))}
          </div>

          {/* Add / Edit form */}
          {formOpen && (
            <div className="rounded-2xl border overflow-hidden" style={{ borderColor:"rgba(212,175,55,0.2)", background:"rgba(212,175,55,0.03)" }}>
              <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor:"rgba(212,175,55,0.1)" }}>
                <div className="flex items-center gap-2">
                  <Clapperboard style={{ width:16, height:16, color:GOLD }} />
                  <span className="text-sm font-semibold">{editingId ? `Edit Day ${form.dayNumber}` : "New Shoot Day"}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={cancelForm} className="h-7 w-7 p-0 text-muted-foreground"><X className="h-4 w-4" /></Button>
              </div>
              <div className="px-5 py-4 space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label:"Day #", key:"dayNumber", type:"number", min:1, placeholder:"1" },
                    { label:"Date",  key:"shootDate", type:"date",   placeholder:""  },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="text-[11px] text-muted-foreground mb-1.5 block">{f.label}</label>
                      <Input type={f.type as any} min={(f as any).min} placeholder={f.placeholder} value={(form as any)[f.key]}
                        onChange={e => fp({ [f.key]: f.type==="number" ? Number(e.target.value)||1 : e.target.value } as any)}
                        className="h-8 text-xs bg-black/30 border-border/40" />
                    </div>
                  ))}
                  <div>
                    <label className="text-[11px] text-muted-foreground mb-1.5 flex items-center gap-1"><Sunrise style={{ width:10, height:10 }} />Call time</label>
                    <Input type="time" value={form.callTime} onChange={e => fp({ callTime:e.target.value })} className="h-8 text-xs bg-black/30 border-border/40" />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground mb-1.5 flex items-center gap-1"><Sunset style={{ width:10, height:10 }} />Wrap time</label>
                    <Input type="time" value={form.wrapTime} onChange={e => fp({ wrapTime:e.target.value })} className="h-8 text-xs bg-black/30 border-border/40" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-muted-foreground mb-1.5 flex items-center gap-1"><MapPin style={{ width:10, height:10 }} />Location</label>
                    <select value={form.locationId} onChange={e => fp({ locationId:e.target.value })}
                      className="w-full h-8 rounded-md border border-border/40 bg-black/30 px-2.5 text-xs text-foreground">
                      <option value="">— None —</option>
                      {(locs as any[]).map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground mb-1.5 flex items-center gap-1"><Cloud style={{ width:10, height:10 }} />Weather note</label>
                    <Input value={form.weatherNote} onChange={e => fp({ weatherNote:e.target.value })} placeholder="Sunny, 72°F, light breeze" className="h-8 text-xs bg-black/30 border-border/40" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-muted-foreground mb-1.5 block">Hospital / emergency info</label>
                    <Textarea value={form.hospitalInfo} onChange={e => fp({ hospitalInfo:e.target.value })} rows={2} placeholder="Mercy Memorial · 4210 N Main · 555-0100" className="text-xs bg-black/30 border-border/40 resize-none" />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground mb-1.5 block">Parking & access</label>
                    <Textarea value={form.parkingInfo} onChange={e => fp({ parkingInfo:e.target.value })} rows={2} placeholder="Crew parking on 5th St lot…" className="text-xs bg-black/30 border-border/40 resize-none" />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground mb-1.5 block">General notes</label>
                  <Textarea value={form.generalNotes} onChange={e => fp({ generalNotes:e.target.value })} rows={2} className="text-xs bg-black/30 border-border/40 resize-none" />
                </div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" onClick={handleSave} disabled={createMut.isPending||updateMut.isPending} className="h-8 text-xs gap-1.5" style={{ background:"linear-gradient(135deg,#D4AF37,#b8960c)", color:"#000" }}>
                    {(createMut.isPending||updateMut.isPending) && <Loader2 className="h-3 w-3 animate-spin text-amber-400" />}
                    {editingId ? "Save changes" : "Create day"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={cancelForm} className="h-8 text-xs">Cancel</Button>
                </div>
              </div>
            </div>
          )}

          {/* Day chips row */}
          {totalDays > 0 && (
            <div className="rounded-xl border p-3.5" style={{ borderColor:"rgba(255,255,255,0.07)", background:"rgba(255,255,255,0.015)" }}>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground/50 mb-2.5">Shoot Days — click to edit</div>
              <div className="flex flex-wrap gap-1.5">
                {(days as any[]).map((d: any) => {
                  const loc = (locs as any[]).find((l: any) => l.id === d.locationId);
                  const isEditing = editingId === d.id;
                  return (
                    <div key={d.id} className="flex items-center rounded-lg border transition-all overflow-hidden"
                      style={{ borderColor: isEditing ? "rgba(212,175,55,0.4)" : "rgba(255,255,255,0.08)", background: isEditing ? "rgba(212,175,55,0.08)" : "rgba(255,255,255,0.03)" }}>
                      <button onClick={() => startEdit(d)} className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs">
                        <span className="font-bold" style={{ color: isEditing ? GOLD : "rgba(255,255,255,0.8)" }}>D{d.dayNumber}</span>
                        {d.shootDate && <span className="text-muted-foreground/60">{fmt(d.shootDate)}</span>}
                        {d.callTime  && <span className="text-muted-foreground/40 flex items-center gap-0.5"><Clock style={{ width:9, height:9 }} />{d.callTime}</span>}
                        {loc && <span className="text-muted-foreground/40 flex items-center gap-0.5 hidden sm:flex"><MapPin style={{ width:9, height:9 }} />{loc.name}</span>}
                      </button>
                      <button onClick={() => handleDelete(d.id)} className="px-1.5 h-full flex items-center text-muted-foreground/30 hover:text-red-400 transition-colors">
                        <Trash2 style={{ width:10, height:10 }} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Strip board */}
          <div className="rounded-2xl border overflow-hidden" style={{ borderColor:"rgba(255,255,255,0.07)" }}>
            <div className="px-5 py-3 border-b flex items-center gap-2" style={{ borderColor:"rgba(255,255,255,0.07)", background:"rgba(255,255,255,0.01)" }}>
              <Film style={{ width:15, height:15, color:GOLD }} />
              <span className="text-xs font-semibold">Strip Board</span>
              <span className="text-[10px] text-muted-foreground/50 ml-1">Drag scenes onto days · mirrors Movie Magic Scheduling</span>
            </div>
            <div className="p-0">
              <StripBoard projectId={projectId} scenes={scenes as any} days={days as any} locations={locs as any} />
            </div>
          </div>
        </div>
      </div>
    );
  }
  