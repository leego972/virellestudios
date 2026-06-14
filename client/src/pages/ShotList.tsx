import { useAuth } from "@/_core/hooks/useAuth";
  import { Button } from "@/components/ui/button";
  import { Input } from "@/components/ui/input";
  import { Label } from "@/components/ui/label";
  import { Textarea } from "@/components/ui/textarea";
  import { Badge } from "@/components/ui/badge";
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
  import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
  import { trpc } from "@/lib/trpc";
  import { useParams, useLocation } from "wouter";
  import { Loader2, ArrowLeft, Film, Plus, Trash2, Download, Sparkles, ChevronDown, ChevronUp, Printer, X, Copy, Search, SlidersHorizontal, Camera, Target, Layers } from "lucide-react";
  import { useState, useEffect, useCallback } from "react";
  import { getLoginUrl } from "@/const";
  import { toast } from "sonner";
  import { NextStageCTA } from "@/components/NextStageCTA";
  import { SubscriptionGate } from "@/components/SubscriptionGate";

  // ─── Types ────────────────────────────────────────────────────────────────────
  export type ShotType = "Extreme Wide" | "Wide" | "Medium Wide" | "Medium" | "Medium Close-Up" | "Close-Up" | "Extreme Close-Up" | "Insert" | "POV" | "Over-the-Shoulder" | "Two-Shot" | "Aerial" | "Dutch Angle" | "Low Angle" | "High Angle";
  export type MoveType = "Static" | "Pan Left" | "Pan Right" | "Tilt Up" | "Tilt Down" | "Dolly In" | "Dolly Out" | "Track Left" | "Track Right" | "Crane Up" | "Crane Down" | "Handheld" | "Steadicam" | "Jib" | "Drone" | "Zoom In" | "Zoom Out";
  export type ShotStatus = "not-started" | "on-schedule" | "in-progress" | "complete" | "cut";

  interface ShotRecord {
    id: string;
    shotNumber: string;
    sceneTitle: string;
    shotType: string;
    cameraMovement: string;
    camera: string;
    lens: string;
    focalLength: string;
    aperture: string;
    ndFilter: string;
    frameRate: string;
    format: string;
    action: string;
    dialogue: string;
    props: string;
    wardrobe: string;
    vfx: string;
    sfxNotes: string;
    estimatedDuration: string;
    status: ShotStatus;
    notes: string;
  }

  // ─── Constants ────────────────────────────────────────────────────────────────
  const SHOT_TYPES: ShotType[] = ["Extreme Wide","Wide","Medium Wide","Medium","Medium Close-Up","Close-Up","Extreme Close-Up","Insert","POV","Over-the-Shoulder","Two-Shot","Aerial","Dutch Angle","Low Angle","High Angle"];
  const MOVE_TYPES: MoveType[] = ["Static","Pan Left","Pan Right","Tilt Up","Tilt Down","Dolly In","Dolly Out","Track Left","Track Right","Crane Up","Crane Down","Handheld","Steadicam","Jib","Drone","Zoom In","Zoom Out"];
  const CAMERAS  = ["ARRI Alexa 35","ARRI Alexa LF","Sony VENICE 2","Sony FX9","RED V-RAPTOR","RED Komodo","Blackmagic Ursa Mini Pro","Canon EOS C70","Panasonic AU-EVA1","BMPCC 6K Pro","GoPro HERO12","iPhone 15 Pro","Other"];
  const LENSES   = ["ARRI Master Prime","ZEISS Supreme Prime","Cooke S7/i","Leica Summilux-C","Tokina Vista Prime","Canon CN-E","Sigma Cine Prime","ARRI Signature Zoom","Angénieux EZ Zoom","Tokina Vista Zoom","Vintage Leica R","Vintage PL Cooke Speed Panchro","Smartphone Lens","Other"];
  const FOCAL_LENGTHS = ["14mm","18mm","21mm","24mm","25mm","28mm","32mm","35mm","40mm","50mm","58mm","65mm","75mm","85mm","90mm","100mm","105mm","135mm","150mm","180mm","200mm","300mm","400mm","600mm","16-35mm zoom","24-70mm zoom","70-200mm zoom","24-290mm zoom"];
  const APERTURES = ["T1.3","T1.5","T1.8","T2","T2.3","T2.8","T3.2","T4","T4.5","T5.6","T6.3","T8","T11","T16","T22"];
  const ND_FILTERS = ["None","ND 0.3 (1-stop)","ND 0.6 (2-stop)","ND 0.9 (3-stop)","ND 1.2 (4-stop)","ND 1.5 (5-stop)","ND 1.8 (6-stop)","ND 2.1 (7-stop)","ND 3.0 (10-stop)","Variable ND"];
  const FRAME_RATES = ["23.98 fps","24 fps","25 fps","29.97 fps","30 fps","48 fps","50 fps","60 fps","90 fps","120 fps","240 fps"];
  const FORMATS = ["4K DCI (4096×2160)","4K UHD (3840×2160)","6K (6144×3456)","8K (8192×4320)","2K (2048×1080)","1080p","S35 4K ARRIRAW","LF ARRIRAW","BRAW 6K","XAVC-I","ProRes 4444","ProRes 422 HQ","H.265 4K"];

  const STATUS_CONFIG: Record<ShotStatus, { label: string; color: string; bg: string; dot: string }> = {
    "not-started":  { label: "Not Started", color: "text-zinc-400",   bg: "bg-gray-500/10",   dot: "#9ca3af" },
    "on-schedule":  { label: "On Schedule", color: "text-blue-400",   bg: "bg-blue-500/10",   dot: "#60a5fa" },
    "in-progress":  { label: "In Progress", color: "text-amber-400",  bg: "bg-amber-500/10",  dot: "#fbbf24" },
    "complete":     { label: "Complete",    color: "text-green-400",  bg: "bg-green-500/10",  dot: "#4ade80" },
    "cut":          { label: "Cut",         color: "text-red-400/60", bg: "bg-red-500/10",    dot: "#f87171" },
  };

  const SHOT_TYPE_ABBR: Record<string, string> = {
    "Extreme Wide":"EWS","Wide":"WS","Medium Wide":"MWS","Medium":"MS","Medium Close-Up":"MCU","Close-Up":"CU","Extreme Close-Up":"ECU","Insert":"INS","POV":"POV","Over-the-Shoulder":"OTS","Two-Shot":"2S","Aerial":"AER","Dutch Angle":"DA","Low Angle":"LA","High Angle":"HA"
  };

  function blankShot(count: number): ShotRecord {
    const scene = Math.floor(count / 5) + 1;
    const shot  = (count % 5) + 1;
    return {
      id: Date.now().toString(),
      shotNumber: `${scene}A${shot}`,
      sceneTitle: "", shotType: "Medium", cameraMovement: "Static",
      camera: "ARRI Alexa 35", lens: "ZEISS Supreme Prime", focalLength: "35mm",
      aperture: "T2.8", ndFilter: "None", frameRate: "24 fps", format: "4K DCI (4096×2160)",
      action: "", dialogue: "", props: "", wardrobe: "", vfx: "", sfxNotes: "",
      estimatedDuration: "0:05", status: "not-started", notes: "",
    };
  }

  // ─── Storage helpers ──────────────────────────────────────────────────────────
  function loadShots(projectId: number): ShotRecord[] {
    try { const s = localStorage.getItem(`shots-${projectId}`); return s ? JSON.parse(s) : []; } catch { return []; }
  }
  function saveShots(projectId: number, shots: ShotRecord[]) {
    localStorage.setItem(`shots-${projectId}`, JSON.stringify(shots));
  }

  // ─── Sub-components ───────────────────────────────────────────────────────────
  function StatusBadge({ status }: { status: ShotStatus }) {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG["not-started"];
    return (
      <div className={`inline-flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${cfg.bg}`}>
        <div className="h-1.5 w-1.5 rounded-full" style={{ background: cfg.dot }} />
        <span className={cfg.color}>{cfg.label}</span>
      </div>
    );
  }

  function ShotTypeTag({ type }: { type: string }) {
    const abbr = SHOT_TYPE_ABBR[type] || type.split(" ").map(w=>w[0]).join("").slice(0,3).toUpperCase();
    return (
      <div className="flex flex-col items-center justify-center h-10 w-10 rounded-lg shrink-0 font-bold text-[10px] tracking-wider" style={{ background: "rgba(212,175,55,0.08)", color: "#D4AF37", border: "1px solid rgba(212,175,55,0.2)" }}>
        {abbr}
      </div>
    );
  }

  // ─── Form component ───────────────────────────────────────────────────────────
  function ShotForm({ initial, onSave, onCancel }: { initial: Partial<ShotRecord>; onSave: (s: ShotRecord) => void; onCancel: () => void }) {
    const [s, setS] = useState<ShotRecord>({ ...blankShot(0), ...initial } as ShotRecord);
    const p = (patch: Partial<ShotRecord>) => setS(prev => ({ ...prev, ...patch }));

    const Label2 = ({ children }: { children: React.ReactNode }) => <label className="text-[10px] text-muted-foreground uppercase tracking-wider">{children}</label>;
    const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
      <div className="space-y-1.5"><Label2>{label}</Label2>{children}</div>
    );

    return (
      <div className="rounded-xl border p-5 space-y-5" style={{ borderColor: "rgba(212,175,55,0.25)", background: "rgba(212,175,55,0.03)" }}>
        <div className="flex items-center justify-between"><p className="text-sm font-semibold">Shot Details</p><button onClick={onCancel} className="text-muted-foreground hover:text-white"><X className="h-4 w-4" /></button></div>

        {/* Identity */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Field label="Shot #"><Input value={s.shotNumber} onChange={e=>p({shotNumber:e.target.value})} className="h-8 text-xs bg-black/30 font-mono border-border/40" /></Field>
          <Field label="Scene"><Input value={s.sceneTitle} onChange={e=>p({sceneTitle:e.target.value})} placeholder="Scene title or description" className="h-8 text-xs bg-black/30 border-border/40 col-span-2" /></Field>
          <Field label="Status"><Select value={s.status} onValueChange={v=>p({status:v as ShotStatus})}><SelectTrigger className="h-8 text-xs bg-black/30 border-border/40 focus:ring-amber-500/30 focus:border-amber-500/50 hover:border-amber-500/40"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(STATUS_CONFIG).map(([k,v])=><SelectItem key={k} value={k} className="text-xs"><span className={v.color}>{v.label}</span></SelectItem>)}</SelectContent></Select></Field>
        </div>

        {/* Shot type and movement */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Field label="Shot Type"><Select value={s.shotType} onValueChange={v=>p({shotType:v})}><SelectTrigger className="h-8 text-xs bg-black/30 border-border/40 focus:ring-amber-500/30 focus:border-amber-500/50 hover:border-amber-500/40"><SelectValue /></SelectTrigger><SelectContent>{SHOT_TYPES.map(t=><SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="Camera Movement"><Select value={s.cameraMovement} onValueChange={v=>p({cameraMovement:v})}><SelectTrigger className="h-8 text-xs bg-black/30 border-border/40 focus:ring-amber-500/30 focus:border-amber-500/50 hover:border-amber-500/40"><SelectValue /></SelectTrigger><SelectContent>{MOVE_TYPES.map(m=><SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="Est. Duration"><Input value={s.estimatedDuration} onChange={e=>p({estimatedDuration:e.target.value})} placeholder="0:15" className="h-8 text-xs bg-black/30 font-mono border-border/40" /></Field>
        </div>

        {/* Camera specs */}
        <div className="rounded-xl border p-4 space-y-4" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.2)" }}>
          <div className="flex items-center gap-2"><Camera className="h-4 w-4 text-muted-foreground" style={{width:14,height:14}} /><p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Camera Package</p></div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Field label="Camera"><Select value={s.camera} onValueChange={v=>p({camera:v})}><SelectTrigger className="h-8 text-xs bg-black/30 border-border/40 focus:ring-amber-500/30 focus:border-amber-500/50 hover:border-amber-500/40"><SelectValue /></SelectTrigger><SelectContent>{CAMERAS.map(c=><SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent></Select></Field>
            <Field label="Lens"><Select value={s.lens} onValueChange={v=>p({lens:v})}><SelectTrigger className="h-8 text-xs bg-black/30 border-border/40 focus:ring-amber-500/30 focus:border-amber-500/50 hover:border-amber-500/40"><SelectValue /></SelectTrigger><SelectContent>{LENSES.map(l=><SelectItem key={l} value={l} className="text-xs">{l}</SelectItem>)}</SelectContent></Select></Field>
            <Field label="Focal Length"><Select value={s.focalLength} onValueChange={v=>p({focalLength:v})}><SelectTrigger className="h-8 text-xs bg-black/30 border-border/40 focus:ring-amber-500/30 focus:border-amber-500/50 hover:border-amber-500/40"><SelectValue /></SelectTrigger><SelectContent>{FOCAL_LENGTHS.map(f=><SelectItem key={f} value={f} className="text-xs">{f}</SelectItem>)}</SelectContent></Select></Field>
            <Field label="Aperture"><Select value={s.aperture} onValueChange={v=>p({aperture:v})}><SelectTrigger className="h-8 text-xs bg-black/30 border-border/40 focus:ring-amber-500/30 focus:border-amber-500/50 hover:border-amber-500/40"><SelectValue /></SelectTrigger><SelectContent>{APERTURES.map(a=><SelectItem key={a} value={a} className="text-xs">{a}</SelectItem>)}</SelectContent></Select></Field>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Field label="ND Filter"><Select value={s.ndFilter} onValueChange={v=>p({ndFilter:v})}><SelectTrigger className="h-8 text-xs bg-black/30 border-border/40 focus:ring-amber-500/30 focus:border-amber-500/50 hover:border-amber-500/40"><SelectValue /></SelectTrigger><SelectContent>{ND_FILTERS.map(n=><SelectItem key={n} value={n} className="text-xs">{n}</SelectItem>)}</SelectContent></Select></Field>
            <Field label="Frame Rate"><Select value={s.frameRate} onValueChange={v=>p({frameRate:v})}><SelectTrigger className="h-8 text-xs bg-black/30 border-border/40 focus:ring-amber-500/30 focus:border-amber-500/50 hover:border-amber-500/40"><SelectValue /></SelectTrigger><SelectContent>{FRAME_RATES.map(r=><SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>)}</SelectContent></Select></Field>
            <Field label="Format / Codec"><Select value={s.format} onValueChange={v=>p({format:v})}><SelectTrigger className="h-8 text-xs bg-black/30 border-border/40 focus:ring-amber-500/30 focus:border-amber-500/50 hover:border-amber-500/40"><SelectValue /></SelectTrigger><SelectContent>{FORMATS.map(f=><SelectItem key={f} value={f} className="text-xs">{f}</SelectItem>)}</SelectContent></Select></Field>
          </div>
        </div>

        {/* Content fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label2>Action</Label2><Textarea value={s.action} onChange={e=>p({action:e.target.value})} placeholder="What happens in frame…" className="text-xs bg-black/30 resize-none min-h-[60px] border-border/40" /></div>
          <div className="space-y-1.5"><Label2>Dialogue</Label2><Textarea value={s.dialogue} onChange={e=>p({dialogue:e.target.value})} placeholder="Any spoken dialogue…" className="text-xs bg-black/30 resize-none min-h-[60px] border-border/40" /></div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Field label="Props"><Input value={s.props} onChange={e=>p({props:e.target.value})} placeholder="Key props…" className="h-8 text-xs bg-black/30 border-border/40" /></Field>
          <Field label="Wardrobe"><Input value={s.wardrobe} onChange={e=>p({wardrobe:e.target.value})} placeholder="Wardrobe notes…" className="h-8 text-xs bg-black/30 border-border/40" /></Field>
          <Field label="VFX"><Input value={s.vfx} onChange={e=>p({vfx:e.target.value})} placeholder="VFX requirements…" className="h-8 text-xs bg-black/30 border-border/40" /></Field>
          <Field label="SFX Notes"><Input value={s.sfxNotes} onChange={e=>p({sfxNotes:e.target.value})} placeholder="Sound / SFX…" className="h-8 text-xs bg-black/30 border-border/40" /></Field>
        </div>
        <div className="space-y-1.5"><Label2>Director's Notes</Label2><Textarea value={s.notes} onChange={e=>p({notes:e.target.value})} placeholder="Lighting direction, actor blocking, special requirements, safety considerations…" className="text-xs bg-black/30 resize-none min-h-[60px] border-border/40" /></div>

        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={onCancel} className="text-xs">Cancel</Button>
          <Button size="sm" onClick={() => onSave(s)} className="gap-2 text-xs" style={{ background: "linear-gradient(135deg,#D4AF37,#b8960c)", color: "#000" }}><Plus className="h-3.5 w-3.5" />Save Shot</Button>
        </div>
      </div>
    );
  }

  // ─── Main ─────────────────────────────────────────────────────────────────────
  function ShotListInner() {
    const { user, loading: authLoading } = useAuth();
    const params = useParams<{ projectId: string }>();
    const [, navigate] = useLocation();
    const projectId = Number(params.projectId);

    const [shots, setShots]             = useState<ShotRecord[]>([]);
    const [showForm, setShowForm]       = useState(false);
    const [editingShot, setEditingShot] = useState<ShotRecord | null>(null);
    const [expandedId, setExpandedId]   = useState<string | null>(null);
    const [filterType, setFilterType]   = useState("all");
    const [filterStatus, setFilterStatus] = useState("all");
    const [search, setSearch]           = useState("");
    const [activeTab, setActiveTab]     = useState("list");

    const { data: project, isLoading: projectLoading } = trpc.project.get.useQuery(
      { id: projectId }, { enabled: !!user && !!projectId }
    );
    const generateMutation = trpc.shotList.generate.useMutation({
      onSuccess: (data: { shots: any[] }) => {
        const incoming: ShotRecord[] = (data.shots || []).map((s: any, i: number) => ({
          id: Date.now().toString() + i,
          shotNumber: s.shotNumber || `${Math.floor(i/5)+1}A${i%5+1}`,
          sceneTitle: s.sceneTitle || "", shotType: s.shotType || "Medium",
          cameraMovement: s.cameraMovement || "Static",
          camera: "ARRI Alexa 35", lens: s.lens || "ZEISS Supreme Prime",
          focalLength: s.lens?.match(/\d+mm/)?.[0] || "35mm",
          aperture: "T2.8", ndFilter: "None", frameRate: "24 fps",
          format: "4K DCI (4096×2160)",
          action: s.action || "", dialogue: s.dialogue || "",
          props: s.props || "", wardrobe: s.wardrobe || "",
          vfx: s.vfx || "", sfxNotes: "",
          estimatedDuration: s.framing || "0:10",
          status: "not-started" as ShotStatus,
          notes: s.notes || "",
        }));
        const merged = [...shots, ...incoming];
        setShots(merged); saveShots(projectId, merged);
        toast.success(`Generated ${incoming.length} shots`);
      },
      onError: (e: any) => toast.error(e.message || "Failed to generate"),
    });

    useEffect(() => { if (projectId) setShots(loadShots(projectId)); }, [projectId]);

    const persistShots = useCallback((next: ShotRecord[]) => { setShots(next); saveShots(projectId, next); }, [projectId]);

    const addShot = (s: ShotRecord) => { persistShots([...shots, s]); setShowForm(false); toast.success("Shot added"); };
    const updateShot = (s: ShotRecord) => { persistShots(shots.map(x => x.id === s.id ? s : x)); setEditingShot(null); toast.success("Shot updated"); };
    const deleteShot = (id: string) => { persistShots(shots.filter(s => s.id !== id)); setExpandedId(null); };
    const duplicateShot = (shot: ShotRecord) => {
      const copy = { ...shot, id: Date.now().toString(), shotNumber: shot.shotNumber + "A" };
      persistShots([...shots, copy]); toast.success("Shot duplicated");
    };
    const updateShotStatus = (id: string, status: ShotStatus) => persistShots(shots.map(s => s.id === id ? { ...s, status } : s));

    const exportCSV = () => {
      const hdr = ["Shot #","Scene","Type","Movement","Camera","Lens","Focal Length","Aperture","ND","FPS","Format","Action","Dialogue","Props","Wardrobe","VFX","SFX","Duration","Status","Notes"];
      const rows = shots.map(s => [
        s.shotNumber,s.sceneTitle,s.shotType,s.cameraMovement,s.camera,s.lens,s.focalLength,
        s.aperture,s.ndFilter,s.frameRate,s.format,
        `"${s.action}"`,`"${s.dialogue}"`,`"${s.props}"`,`"${s.wardrobe}"`,`"${s.vfx}"`,`"${s.sfxNotes}"`,
        s.estimatedDuration,s.status,`"${s.notes}"`
      ].join(","));
      const blob = new Blob([[hdr.join(","), ...rows].join("\n")], { type: "text/csv" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `shot-list-${projectId}.csv`; a.click();
      toast.success("Shot list exported as CSV");
    };

    const filteredShots = shots.filter(s => {
      if (filterType !== "all" && s.shotType !== filterType) return false;
      if (filterStatus !== "all" && s.status !== filterStatus) return false;
      if (search) {
        const q = search.toLowerCase();
        return s.shotNumber.toLowerCase().includes(q) || s.sceneTitle.toLowerCase().includes(q) || s.action.toLowerCase().includes(q);
      }
      return true;
    });

    const statsByStatus = Object.keys(STATUS_CONFIG).reduce((acc, k) => ({ ...acc, [k]: shots.filter(s=>s.status===k).length }), {} as Record<string, number>);

    if (authLoading || projectLoading) {
      return <div className="min-h-screen flex items-center justify-center" style={{ background: "#07070e" }}><Loader2 className="h-8 w-8 animate-spin text-amber-400" style={{ color: "#D4AF37" }} /></div>;
    }
    if (!user) { window.location.href = getLoginUrl(); return null; }

    return (
      <div className="min-h-screen" style={{ background: "linear-gradient(135deg,#07070e 0%,#0c0b14 60%,#07070a 100%)" }}>
        {/* Header */}
        <div className="border-b sticky top-0 z-20" style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(7,7,14,0.97)", backdropFilter: "blur(24px)" }}>
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => navigate(`/projects/${projectId}`)} className="gap-2 text-muted-foreground h-8"><ArrowLeft className="h-4 w-4" />Back</Button>
              <div className="h-5 w-px bg-border/40" />
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg,#D4AF37,#b8960c)" }}>
                  <Film className="text-black" style={{ width: 18, height: 18 }} />
                </div>
                <div>
                  <div className="font-bold text-sm">{project?.title} — Shot List</div>
                  <div className="text-[10px] text-muted-foreground">{shots.length} shots total · {filteredShots.length} shown</div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={exportCSV} disabled={shots.length===0} className="gap-2 h-8 text-xs border-border/50 hover:border-amber-500/50 hover:text-amber-400"><Download className="h-3.5 w-3.5" />CSV</Button>
              <Button size="sm" variant="outline" onClick={() => generateMutation.mutate({ projectId })} disabled={generateMutation.isPending} className="gap-2 h-8 text-xs border-border/50">
                {generateMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-400" /> : <Sparkles className="h-3.5 w-3.5" />}AI Generate
              </Button>
              <Button size="sm" onClick={() => { setEditingShot(null); setShowForm(true); }} className="gap-2 h-8 text-xs" style={{ background: "linear-gradient(135deg,#D4AF37,#b8960c)", color: "#000" }}>
                <Plus className="h-3.5 w-3.5" />Add Shot
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: "Total Shots", val: shots.length, color: "text-white" },
              ...Object.entries(STATUS_CONFIG).map(([k,v]) => ({ label: v.label, val: statsByStatus[k]||0, color: v.color })),
            ].map((s,i) => (
              <div key={i} className="rounded-xl border px-3 py-2.5" style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
                <div className="text-[9px] text-muted-foreground uppercase tracking-wider">{s.label}</div>
                <div className={`text-xl font-bold mt-0.5 ${s.color}`}>{s.val}</div>
              </div>
            ))}
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4 border border-border/40 bg-black/40 h-9 gap-0.5">
              <TabsTrigger value="list"   className="gap-1.5 text-xs h-7 data-[state=active]:text-amber-400"><Layers className="h-3.5 w-3.5" />Shot List</TabsTrigger>
              <TabsTrigger value="camera" className="gap-1.5 text-xs h-7 data-[state=active]:text-amber-400"><Camera className="h-3.5 w-3.5" />Camera Sheet</TabsTrigger>
              <TabsTrigger value="print"  className="gap-1.5 text-xs h-7 data-[state=active]:text-amber-400"><Printer className="h-3.5 w-3.5" />Print View</TabsTrigger>
            </TabsList>

            {/* ══ SHOT LIST ══ */}
            <TabsContent value="list">
              {/* Filters */}
              <div className="flex items-center gap-3 flex-wrap mb-4">
                <div className="relative flex-1 min-w-48">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
                  <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search shots…" className="pl-9 h-8 text-xs bg-black/30 border-border/40" />
                </div>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="h-8 text-xs w-40 bg-black/30 border-border/40 focus:ring-amber-500/30 focus:border-amber-500/50 hover:border-amber-500/40"><SelectValue placeholder="Shot Type" /></SelectTrigger>
                  <SelectContent><SelectItem value="all" className="text-xs">All Types</SelectItem>{SHOT_TYPES.map(t=><SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="h-8 text-xs w-40 bg-black/30 border-border/40 focus:ring-amber-500/30 focus:border-amber-500/50 hover:border-amber-500/40"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent><SelectItem value="all" className="text-xs">All Statuses</SelectItem>{Object.entries(STATUS_CONFIG).map(([k,v])=><SelectItem key={k} value={k} className="text-xs"><span className={v.color}>{v.label}</span></SelectItem>)}</SelectContent>
                </Select>
              </div>

              {/* New/Edit form */}
              {(showForm || editingShot) && (
                <div className="mb-4">
                  <ShotForm initial={editingShot || blankShot(shots.length)} onSave={editingShot ? updateShot : addShot} onCancel={() => { setShowForm(false); setEditingShot(null); }} />
                </div>
              )}

              {/* List */}
              {filteredShots.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed flex flex-col items-center py-20 gap-4" style={{ borderColor: "rgba(212,175,55,0.12)" }}>
                  <Film className="h-12 w-12 opacity-20" style={{ color: "#D4AF37" }} />
                  <div className="text-center"><p className="text-sm font-semibold">{shots.length === 0 ? "No shots yet" : "No shots match the filter"}</p><p className="text-xs text-muted-foreground mt-1">Add shots manually or let AI generate your shot list</p></div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => { setShowForm(true); setEditingShot(null); }} className="gap-2 text-xs border-border/40"><Plus className="h-3.5 w-3.5" />Add Shot</Button>
                    <Button size="sm" onClick={() => generateMutation.mutate({ projectId })} disabled={generateMutation.isPending} className="gap-2 text-xs" style={{ background: "linear-gradient(135deg,#D4AF37,#b8960c)", color: "#000" }}>
                      <Sparkles className="h-3.5 w-3.5" />AI Generate
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Column headers */}
                  <div className="hidden sm:grid px-4 py-1.5 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/50" style={{ gridTemplateColumns: "52px 56px 1fr 140px 120px 80px 90px 28px" }}>
                    <div>Shot</div><div>Type</div><div>Scene / Action</div><div>Shot / Move</div><div>Camera</div><div>Lens</div><div>Status</div><div />
                  </div>
                  {filteredShots.map(shot => {
                    const isExpanded = expandedId === shot.id;
                    return (
                      <div key={shot.id} className="rounded-xl border overflow-hidden transition-all" style={{ borderColor: isExpanded ? "rgba(212,175,55,0.35)" : "rgba(255,255,255,0.07)", background: isExpanded ? "rgba(212,175,55,0.04)" : "rgba(255,255,255,0.02)" }}>
                        <div className="hidden sm:grid items-center px-4 py-3 gap-3 cursor-pointer" style={{ gridTemplateColumns: "52px 56px 1fr 140px 120px 80px 90px 28px" }} onClick={() => setExpandedId(isExpanded ? null : shot.id)}>
                          <span className="text-xs font-mono font-bold" style={{ color: "#D4AF37" }}>{shot.shotNumber}</span>
                          <ShotTypeTag type={shot.shotType} />
                          <div><p className="text-xs font-semibold truncate">{shot.sceneTitle || "—"}</p><p className="text-[10px] text-muted-foreground truncate">{shot.action?.slice(0,60) || "—"}</p></div>
                          <div className="text-[10px] text-muted-foreground space-y-0.5"><div className="font-medium">{shot.shotType}</div><div>{shot.cameraMovement}</div></div>
                          <div className="text-[10px] text-muted-foreground truncate">{shot.camera?.split(" ").slice(-2).join(" ") || "—"}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">{shot.focalLength}</div>
                          <StatusBadge status={shot.status} />
                          <div>{isExpanded ? <ChevronUp className="h-4 w-4 text-yellow-400" /> : <ChevronDown className="h-4 w-4 text-muted-foreground/50" />}</div>
                        </div>
                        {/* Mobile row */}
                        <div className="flex sm:hidden items-center gap-3 px-4 py-3 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : shot.id)}>
                          <ShotTypeTag type={shot.shotType} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2"><span className="text-xs font-mono font-bold" style={{ color: "#D4AF37" }}>{shot.shotNumber}</span><StatusBadge status={shot.status} /></div>
                            <p className="text-xs truncate">{shot.sceneTitle || shot.action?.slice(0,50) || "—"}</p>
                          </div>
                          {isExpanded ? <ChevronUp className="h-4 w-4 text-yellow-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground/50 shrink-0" />}
                        </div>
                        {isExpanded && (
                          <div className="border-t px-4 py-5 space-y-4" style={{ borderColor: "rgba(212,175,55,0.1)", background: "rgba(0,0,0,0.2)" }}>
                            {/* Status quick-change */}
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Status:</span>
                              {Object.entries(STATUS_CONFIG).map(([k,v]) => (
                                <button key={k} onClick={() => updateShotStatus(shot.id, k as ShotStatus)}
                                  className={`text-[9px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full border transition-all ${shot.status === k ? `${v.bg} ${v.color} border-transparent` : "border-border/30 text-muted-foreground/50 hover:border-border/50"}`}>
                                  {v.label}
                                </button>
                              ))}
                            </div>
                            {/* Details grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                              {[
                                { label: "Camera", val: shot.camera },
                                { label: "Lens", val: shot.lens },
                                { label: "Focal Length", val: shot.focalLength },
                                { label: "Aperture", val: shot.aperture },
                                { label: "ND Filter", val: shot.ndFilter },
                                { label: "Frame Rate", val: shot.frameRate },
                                { label: "Format", val: shot.format },
                                { label: "Duration", val: shot.estimatedDuration },
                              ].map(d => (
                                <div key={d.label} className="space-y-0.5">
                                  <div className="text-[9px] text-muted-foreground uppercase tracking-wider">{d.label}</div>
                                  <div className="font-mono text-[11px]">{d.val || "—"}</div>
                                </div>
                              ))}
                            </div>
                            {shot.action && <div><div className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">Action</div><p className="text-xs leading-relaxed">{shot.action}</p></div>}
                            {(shot.props || shot.wardrobe || shot.vfx || shot.sfxNotes) && (
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {[["Props",shot.props],["Wardrobe",shot.wardrobe],["VFX",shot.vfx],["SFX",shot.sfxNotes]].filter(([,v])=>v).map(([l,v]) => (
                                  <div key={l as string}><div className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">{l}</div><p className="text-[11px] leading-relaxed">{v}</p></div>
                                ))}
                              </div>
                            )}
                            {shot.notes && <div><div className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">Director's Notes</div><p className="text-xs leading-relaxed text-muted-foreground">{shot.notes}</p></div>}
                            <div className="flex gap-2 pt-1">
                              <button onClick={() => { setEditingShot(shot); setShowForm(false); setExpandedId(null); }} className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg border border-border/30 hover:border-yellow-500/30 hover:bg-yellow-500/5 text-muted-foreground hover:text-yellow-400 transition-all">Edit Shot</button>
                              <button onClick={() => duplicateShot(shot)} className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg border border-border/30 hover:border-border/50 text-muted-foreground transition-all"><Copy className="h-3.5 w-3.5" />Duplicate</button>
                              <button onClick={() => deleteShot(shot.id)} className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg border border-transparent hover:border-red-500/20 hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-all ml-auto"><Trash2 className="h-3.5 w-3.5" />Delete</button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* ══ CAMERA SHEET ══ */}
            <TabsContent value="camera">
              {shots.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed flex items-center justify-center py-20" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                  <p className="text-sm text-muted-foreground">Add shots to see camera specs</p>
                </div>
              ) : (
                <div className="rounded-xl border overflow-x-auto" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                  <table className="w-full text-xs whitespace-nowrap">
                    <thead><tr style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                      {["Shot #","Scene","Type","Move","Camera","Lens","FL","Aperture","ND","FPS","Format"].map(h =>
                        <th key={h} className="text-left px-3 py-2.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground text-amber-400/70 border-b border-amber-500/20">{h}</th>
                      )}
                    </tr></thead>
                    <tbody className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                      {shots.map(s => (
                        <tr key={s.id} className="hover:bg-white/[0.015]">
                          <td className="px-3 py-2 font-mono font-bold" style={{ color: "#D4AF37" }}>{s.shotNumber}</td>
                          <td className="px-3 py-2 max-w-[120px] truncate text-muted-foreground">{s.sceneTitle || "—"}</td>
                          <td className="px-3 py-2">{SHOT_TYPE_ABBR[s.shotType] || s.shotType}</td>
                          <td className="px-3 py-2 text-muted-foreground">{s.cameraMovement}</td>
                          <td className="px-3 py-2 max-w-[120px] truncate">{s.camera?.split(" ").slice(-2).join(" ")}</td>
                          <td className="px-3 py-2 max-w-[130px] truncate">{s.lens?.split(" ").slice(-2).join(" ")}</td>
                          <td className="px-3 py-2 font-mono">{s.focalLength}</td>
                          <td className="px-3 py-2 font-mono">{s.aperture}</td>
                          <td className="px-3 py-2">{s.ndFilter === "None" ? "—" : s.ndFilter.split("(")[0].trim()}</td>
                          <td className="px-3 py-2 font-mono">{s.frameRate.split(" ")[0]}</td>
                          <td className="px-3 py-2 text-muted-foreground">{s.format?.split(" ")[0]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            {/* ══ PRINT VIEW ══ */}
            <TabsContent value="print">
              <div className="rounded-xl border p-6 space-y-5" style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
                <div className="flex items-center justify-between">
                  <div><h2 className="text-lg font-bold gradient-text-gold">{project?.title}</h2><p className="text-xs text-muted-foreground">Shot List · {shots.length} Shots · Generated {new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})}</p></div>
                  <Button size="sm" variant="outline" onClick={() => window.print()} className="gap-2 text-xs border-border/40"><Printer className="h-3.5 w-3.5" />Print</Button>
                </div>
                <div className="space-y-3">
                  {shots.map((shot, i) => (
                    <div key={shot.id} className="rounded-lg border p-4 grid grid-cols-12 gap-4" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                      <div className="col-span-1 text-center">
                        <div className="text-[10px] text-muted-foreground">SHOT</div>
                        <div className="text-lg font-bold font-mono" style={{ color: "#D4AF37" }}>{shot.shotNumber}</div>
                        <div className="text-[9px] font-bold" style={{ color: "#D4AF37" }}>{SHOT_TYPE_ABBR[shot.shotType]}</div>
                      </div>
                      <div className="col-span-5 space-y-1">
                        <p className="text-xs font-semibold">{shot.sceneTitle || "Untitled Scene"}</p>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">{shot.action || "—"}</p>
                        {shot.dialogue && <p className="text-[11px] italic text-muted-foreground/70">"{shot.dialogue}"</p>}
                      </div>
                      <div className="col-span-3 space-y-1.5 text-[10px]">
                        <div><span className="text-muted-foreground">Camera: </span>{shot.camera?.split(" ").slice(-2).join(" ")}</div>
                        <div><span className="text-muted-foreground">Lens: </span>{shot.focalLength} {shot.aperture}</div>
                        <div><span className="text-muted-foreground">Move: </span>{shot.cameraMovement}</div>
                      </div>
                      <div className="col-span-3 space-y-1.5 text-[10px]">
                        <div><span className="text-muted-foreground">VFX: </span>{shot.vfx || "—"}</div>
                        <div><span className="text-muted-foreground">Props: </span>{shot.props || "—"}</div>
                        <StatusBadge status={shot.status} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
        <NextStageCTA projectId={projectId} currentStage="shotList" />
      </div>
    );
  }

  export default function ShotList() {
    return <SubscriptionGate feature="canUseShotList"><ShotListInner /></SubscriptionGate>;
  }
  