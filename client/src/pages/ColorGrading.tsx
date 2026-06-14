import { useAuth } from "@/_core/hooks/useAuth";
  import { Button } from "@/components/ui/button";
  import { Slider } from "@/components/ui/slider";
  import { Label } from "@/components/ui/label";
  import { Badge } from "@/components/ui/badge";
  import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
  import { Separator } from "@/components/ui/separator";
  import { trpc } from "@/lib/trpc";
  import { useParams, useLocation } from "wouter";
  import { Loader2, ArrowLeft, Palette, Check, Eye, EyeOff, Download, RefreshCw, Sparkles, Sun, Contrast, Droplets, Zap, Monitor, BarChart3 } from "lucide-react";
  import { useState, useEffect, useRef } from "react";
  import { getLoginUrl } from "@/const";
  import { toast } from "sonner";
  import { NextStageCTA } from "@/components/NextStageCTA";
  import { SubscriptionGate } from "@/components/SubscriptionGate";

  // ─── LUT Library ──────────────────────────────────────────────────────────────
  const LUT_LIBRARY = [
    { category: "Film Emulation",  luts: [
      { id: "kodak-2383",     name: "Kodak 2383",          desc: "Classic print film warmth",             gradient: "from-amber-400 to-yellow-300" },
      { id: "kodak-5218",     name: "Kodak Vision3 5218",  desc: "Rich midtones, cinematic grain",        gradient: "from-orange-400 to-amber-300" },
      { id: "fuji-3510",      name: "Fuji 3510",           desc: "Cool shadows, warm highlights",         gradient: "from-cyan-400 to-amber-400" },
      { id: "fuji-eterna",    name: "Fuji Eterna 500",     desc: "Desaturated, organic look",             gradient: "from-green-300 to-amber-300" },
      { id: "agfa-scale",     name: "Agfa Positive Scale", desc: "Vintage European cinema",               gradient: "from-yellow-300 to-red-300" },
      { id: "orwo-nc",        name: "ORWO NC 21",          desc: "1970s East German film",                gradient: "from-amber-600 to-yellow-400" },
    ]},
    { category: "Log Transforms", luts: [
      { id: "alexa-709",      name: "ARRI Alexa → Rec.709", desc: "Log C to broadcast standard",          gradient: "from-slate-400 to-slate-200" },
      { id: "slog3-709",      name: "S-Log3 → Rec.709",    desc: "Sony cinema camera conversion",        gradient: "from-gray-400 to-gray-200" },
      { id: "log-c-standard", name: "Log C → Standard",    desc: "ARRI everyday normalisation",          gradient: "from-neutral-400 to-neutral-200" },
      { id: "vlog-709",       name: "V-Log → Rec.709",     desc: "Panasonic VariCam conversion",         gradient: "from-zinc-400 to-zinc-200" },
      { id: "braw-film",      name: "BRAW Film",            desc: "BMPCC cinematic film response",        gradient: "from-stone-400 to-stone-200" },
    ]},
    { category: "Cinematic Looks", luts: [
      { id: "teal-orange",    name: "Teal & Orange",       desc: "Hollywood blockbuster staple",          gradient: "from-teal-500 to-orange-400" },
      { id: "bleach-bypass",  name: "Bleach Bypass",       desc: "Desaturated high-contrast",             gradient: "from-gray-500 to-gray-300" },
      { id: "cross-process",  name: "Cross Process",       desc: "E-6 film in C-41 chemicals",            gradient: "from-green-400 to-purple-400" },
      { id: "cold-thriller",  name: "Cold Thriller",       desc: "Blue-steel desaturated noir",           gradient: "from-blue-500 to-slate-400" },
      { id: "golden-hour",    name: "Golden Hour",         desc: "Warm sunset magic hour",                gradient: "from-yellow-400 to-orange-400" },
      { id: "moonlight",      name: "Moonlight",           desc: "Cool nocturnal blue-green",             gradient: "from-blue-600 to-teal-500" },
      { id: "summer-indie",   name: "Summer Indie",        desc: "Lifted shadows, faded look",            gradient: "from-yellow-300 to-green-300" },
      { id: "neon-noir",      name: "Neon Noir",           desc: "Dark + vibrant neon accents",           gradient: "from-purple-600 to-pink-500" },
    ]},
    { category: "Period & Genre", luts: [
      { id: "silent-era",     name: "Silent Era",          desc: "1920s sepia orthochromatic",            gradient: "from-stone-600 to-stone-400" },
      { id: "technicolor",    name: "Three-Strip Technicolor", desc: "1940s saturated primaries",         gradient: "from-red-500 to-blue-500" },
      { id: "70s-warm",       name: "1970s Warm",          desc: "New Hollywood grain + warmth",          gradient: "from-amber-500 to-orange-400" },
      { id: "vhs-lo-fi",      name: "VHS Lo-Fi",           desc: "Consumer tape degradation",             gradient: "from-purple-400 to-green-300" },
      { id: "horror-tint",    name: "Horror Desaturation", desc: "Dark, green-grey corpse tone",          gradient: "from-green-900 to-gray-700" },
      { id: "sci-fi-cool",    name: "Sci-Fi Future",       desc: "Clean blue-cyan futurism",              gradient: "from-cyan-500 to-blue-600" },
    ]},
  ];

  // ─── Color Wheel component ───────────────────────────────────────────────
function ColorWheel({ label, sublabel, temp, tint, master, onTempChange, onTintChange, onMasterChange, color }: {
      label: string; sublabel: string; temp: number; tint: number; master: number;
      onTempChange: (v: number) => void; onTintChange: (v: number) => void; onMasterChange: (v: number) => void;
      color: string;
    }) {
      const svgRef = useRef<SVGSVGElement>(null);
      const isDragging = useRef(false);

      const angle = Math.atan2(tint - 50, temp - 50) * (180 / Math.PI);
      const dist  = Math.min(Math.sqrt(Math.pow(temp-50,2)+Math.pow(tint-50,2)), 35);
      const dotX  = 50 + (dist/35)*35 * Math.cos(angle * Math.PI/180);
      const dotY  = 50 + (dist/35)*35 * Math.sin(angle * Math.PI/180);
      const isNeutral = Math.abs(temp-50) < 3 && Math.abs(tint-50) < 3;

      function applyDrag(clientX: number, clientY: number) {
        const svg = svgRef.current;
        if (!svg) return;
        const rect = svg.getBoundingClientRect();
        const svgX = (clientX - rect.left) * (100 / rect.width);
        const svgY = (clientY - rect.top)  * (100 / rect.height);
        const dx   = svgX - 50;
        const dy   = svgY - 50;
        const d    = Math.sqrt(dx*dx + dy*dy);
        let newTemp, newTint;
        if (d <= 35) { newTemp = 50 + dx; newTint = 50 + dy; }
        else         { newTemp = 50 + dx * 35/d; newTint = 50 + dy * 35/d; }
        onTempChange(Math.round(Math.max(15, Math.min(85, newTemp))));
        onTintChange(Math.round(Math.max(15, Math.min(85, newTint))));
      }

      function onMouseDown(e: React.MouseEvent<SVGSVGElement>) {
        isDragging.current = true;
        applyDrag(e.clientX, e.clientY);
        e.preventDefault();
      }
      function onMouseMove(e: React.MouseEvent<SVGSVGElement>) {
        if (!isDragging.current) return;
        applyDrag(e.clientX, e.clientY);
      }
      function onMouseUp() { isDragging.current = false; }

      function onTouchStart(e: React.TouchEvent<SVGSVGElement>) {
        isDragging.current = true;
        applyDrag(e.touches[0].clientX, e.touches[0].clientY);
      }
      function onTouchMove(e: React.TouchEvent<SVGSVGElement>) {
        if (!isDragging.current) return;
        applyDrag(e.touches[0].clientX, e.touches[0].clientY);
        e.preventDefault();
      }
      function onTouchEnd() { isDragging.current = false; }

      useEffect(() => {
        const up = () => { isDragging.current = false; };
        window.addEventListener("mouseup",  up);
        window.addEventListener("touchend", up);
        return () => { window.removeEventListener("mouseup", up); window.removeEventListener("touchend", up); };
      }, []);

      return (
        <div className="flex flex-col items-center gap-3">
          <div className="text-center">
            <div className="text-xs font-bold tracking-widest uppercase" style={{ color }}>{label}</div>
            <div className="text-[9px] text-muted-foreground">{sublabel}</div>
          </div>
          {/* Draggable wheel */}
          <div className="relative select-none" style={{ width: 110, height: 110 }}>
            <svg ref={svgRef} viewBox="0 0 100 100" width="110" height="110"
              style={{ cursor: "crosshair", touchAction: "none" }}
              onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
              onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
              <defs>
                <radialGradient id={`wg-${label}`} cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="white" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="white" stopOpacity="0" />
                </radialGradient>
                <linearGradient id={`hg-${label}`} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%"   stopColor="#3b82f6" />
                  <stop offset="25%"  stopColor="#06b6d4" />
                  <stop offset="50%"  stopColor="#a3e635" />
                  <stop offset="75%"  stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#ef4444" />
                </linearGradient>
                <linearGradient id={`vg-${label}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#f0abfc" stopOpacity="0.7" />
                  <stop offset="100%" stopColor="#4ade80" stopOpacity="0.7" />
                </linearGradient>
              </defs>
              <circle cx="50" cy="50" r="46" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
              <circle cx="50" cy="50" r="44" fill={`url(#hg-${label})`} opacity="0.6" />
              <circle cx="50" cy="50" r="44" fill={`url(#vg-${label})`} opacity="0.5" />
              <circle cx="50" cy="50" r="44" fill={`url(#wg-${label})`} />
              <line x1="50" y1="8"  x2="50" y2="92" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
              <line x1="8"  y1="50" x2="92" y2="50" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
              <circle cx="50" cy="50" r="2" fill="rgba(255,255,255,0.3)" />
              {!isNeutral && <circle cx={dotX} cy={dotY} r="5" fill={color} stroke="white" strokeWidth="1.5" style={{ filter:"drop-shadow(0 0 3px " + color + ")" }} />}
              {isNeutral  && <circle cx="50"   cy="50"   r="5" fill="white" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />}
              <circle cx="50" cy="50" r="46" fill="none" stroke={color} strokeWidth="1.5" opacity="0.4" />
            </svg>
            {/* Drag hint */}
            <div className="absolute inset-x-0 bottom-[-18px] text-center text-[8px] text-muted-foreground/30">drag to adjust</div>
          </div>
        {/* Controls */}
        <div className="w-full space-y-2 px-1">
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-[9px] text-muted-foreground">Temp</span>
              <span className="text-[9px] font-mono" style={{ color }}>
                {temp === 50 ? "0" : temp > 50 ? `+${Math.round(temp-50)}` : Math.round(temp-50)}
              </span>
            </div>
            <Slider value={[temp]} onValueChange={([v]) => onTempChange(v)} min={0} max={100} step={1} />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-[9px] text-muted-foreground">Tint</span>
              <span className="text-[9px] font-mono" style={{ color }}>
                {tint === 50 ? "0" : tint > 50 ? `+${Math.round(tint-50)}` : Math.round(tint-50)}
              </span>
            </div>
            <Slider value={[tint]} onValueChange={([v]) => onTintChange(v)} min={0} max={100} step={1} />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-[9px] text-muted-foreground">Master</span>
              <span className="text-[9px] font-mono" style={{ color }}>
                {master === 50 ? "0" : master > 50 ? `+${Math.round(master-50)}` : Math.round(master-50)}
              </span>
            </div>
            <Slider value={[master]} onValueChange={([v]) => onMasterChange(v)} min={0} max={100} step={1} />
          </div>
        </div>
      </div>
    );
  }

  // ─── Scope Components ─────────────────────────────────────────────────────────
  function WaveformScope({ contrast, shadows, highlights }: { contrast: number; shadows: number; highlights: number }) {
    const bars = 40;
    return (
      <div className="flex items-end gap-[1px] h-24 p-2 rounded-lg" style={{ background: "rgba(0,0,0,0.4)" }}>
        {Array.from({ length: bars }).map((_, i) => {
          const base = 0.3 + (shadows/100)*0.2 + (i/bars)*((highlights/100)*0.8 - (shadows/100)*0.2);
          const c = 0.8 + (contrast-50)/200;
          const h = Math.max(0.05, Math.min(0.95, (base - 0.5) * c + 0.5 + Math.sin(i*0.5)*0.05));
          return (
            <div key={i} className="flex-1 rounded-sm" style={{ height: `${h*100}%`, background: `rgba(0,255,0,${0.4+h*0.4})` }} />
          );
        })}
      </div>
    );
  }

  function HistogramScope({ contrast, saturation, temperature }: { contrast: number; saturation: number; temperature: number }) {
    const bins = 32;
    return (
      <div className="flex items-end gap-[1px] h-24 p-2 rounded-lg" style={{ background: "rgba(0,0,0,0.4)" }}>
        {Array.from({ length: bins }).map((_, i) => {
          const x = i / bins;
          const bell = Math.exp(-Math.pow((x - 0.5 + (temperature-50)/200) * 3, 2)) * (0.5 + saturation/200);
          const h = Math.max(0.02, bell * (0.6 + contrast/200));
          const r = Math.min(255, Math.round(180 + (temperature-50)*1.5 + i*(temperature-50)/50));
          const g = 140;
          const b = Math.min(255, Math.round(180 - (temperature-50)*1.5));
          return (
            <div key={i} className="flex-1 rounded-sm" style={{ height: `${h*100}%`, background: `rgba(${r},${g},${b},0.7)` }} />
          );
        })}
      </div>
    );
  }

  function VectorscopeScope({ saturation, tint }: { saturation: number; tint: number }) {
    const points = [
      { angle: 0,   label: "R",  val: 0.7 + (tint-50)/200 },
      { angle: 60,  label: "Yl", val: 0.6 },
      { angle: 120, label: "G",  val: 0.65 - (tint-50)/200 },
      { angle: 180, label: "Cy", val: 0.6 },
      { angle: 240, label: "B",  val: 0.65 },
      { angle: 300, label: "Mg", val: 0.7 + (tint-50)/300 },
    ];
    const cx = 50, cy = 50, r = 38;
    const satScale = saturation / 100;
    return (
      <svg viewBox="0 0 100 100" className="h-24 w-24" style={{ background: "rgba(0,0,0,0.4)", borderRadius: 8 }}>
        {[0.25,0.5,0.75,1].map(s=>(
          <circle key={s} cx={cx} cy={cy} r={r*s} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
        ))}
        <line x1={cx} y1={cy-r-5} x2={cx} y2={cy+r+5} stroke="rgba(255,255,255,0.08)" strokeWidth="0.3"/>
        <line x1={cx-r-5} y1={cy} x2={cx+r+5} y2={cy} stroke="rgba(255,255,255,0.08)" strokeWidth="0.3"/>
        {points.map(p=>{
          const a = (p.angle-90) * Math.PI/180;
          const d = r * p.val * satScale;
          return (
            <g key={p.label}>
              <circle cx={cx+Math.cos(a)*d} cy={cy+Math.sin(a)*d} r="2.5" fill="rgba(255,255,255,0.6)" />
              <text x={cx+Math.cos(a)*(r+6)} y={cy+Math.sin(a)*(r+6)} fontSize="5" fill="rgba(255,255,255,0.3)" textAnchor="middle" dominantBaseline="middle">{p.label}</text>
            </g>
          );
        })}
        <circle cx={cx} cy={cy} r="1.5" fill="white" opacity="0.5" />
      </svg>
    );
  }

  // ─── Types ────────────────────────────────────────────────────────────────────
  type PrimarySettings = {
    temperature: number; tint: number; contrast: number; saturation: number;
    highlights: number; shadows: number; vibrance: number; clarity: number; exposure: number;
  };
  type WheelSettings = {
    liftTemp: number; liftTint: number; liftMaster: number;
    gammaTemp: number; gammaTint: number; gammaMaster: number;
    gainTemp: number;  gainTint: number;  gainMaster: number;
  };
  type GradingSettings = PrimarySettings & WheelSettings & { activeLut: string };

  const DEFAULTS: GradingSettings = {
    temperature: 50, tint: 50, contrast: 50, saturation: 50,
    highlights: 50, shadows: 50, vibrance: 50, clarity: 50, exposure: 50,
    liftTemp: 50, liftTint: 50, liftMaster: 50,
    gammaTemp: 50, gammaTint: 50, gammaMaster: 50,
    gainTemp: 50,  gainTint: 50,  gainMaster: 50,
    activeLut: "",
  };

  const LEGACY_PRESETS = [
    { name: "natural",       label: "Natural",        gradient: "from-green-400 to-blue-400",    settings: { temperature:50,tint:50,contrast:50,saturation:50,highlights:50,shadows:50,vibrance:50,clarity:50,exposure:50 } },
    { name: "warm-vintage",  label: "Warm Vintage",   gradient: "from-amber-400 to-orange-500",  settings: { temperature:70,tint:55,contrast:45,saturation:40,highlights:55,shadows:40,vibrance:35,clarity:45,exposure:52 } },
    { name: "cold-thriller", label: "Cold Thriller",  gradient: "from-blue-500 to-cyan-600",     settings: { temperature:30,tint:45,contrast:65,saturation:35,highlights:40,shadows:60,vibrance:30,clarity:60,exposure:48 } },
    { name: "neon-cyberpunk",label: "Neon Cyberpunk", gradient: "from-pink-500 to-purple-600",   settings: { temperature:45,tint:60,contrast:75,saturation:80,highlights:65,shadows:70,vibrance:85,clarity:70,exposure:50 } },
    { name: "bleach-bypass", label: "Bleach Bypass",  gradient: "from-gray-400 to-gray-600",     settings: { temperature:48,tint:50,contrast:70,saturation:25,highlights:60,shadows:55,vibrance:20,clarity:65,exposure:50 } },
    { name: "golden-hour",   label: "Golden Hour",    gradient: "from-yellow-400 to-red-400",    settings: { temperature:75,tint:55,contrast:45,saturation:60,highlights:65,shadows:35,vibrance:55,clarity:40,exposure:55 } },
    { name: "noir",          label: "Film Noir",      gradient: "from-gray-800 to-gray-400",     settings: { temperature:45,tint:50,contrast:80,saturation:10,highlights:70,shadows:75,vibrance:5, clarity:75,exposure:45 } },
    { name: "horror",        label: "Horror",         gradient: "from-green-800 to-gray-900",    settings: { temperature:40,tint:40,contrast:70,saturation:20,highlights:30,shadows:80,vibrance:15,clarity:60,exposure:42 } },
    { name: "romantic",      label: "Romantic",       gradient: "from-pink-300 to-rose-400",     settings: { temperature:60,tint:60,contrast:35,saturation:55,highlights:60,shadows:30,vibrance:50,clarity:30,exposure:54 } },
    { name: "sci-fi",        label: "Sci-Fi",         gradient: "from-indigo-500 to-violet-600", settings: { temperature:35,tint:55,contrast:60,saturation:55,highlights:50,shadows:65,vibrance:60,clarity:55,exposure:50 } },
  ];

  function ColorGradingInner() {
    const { user, loading: authLoading } = useAuth();
    const params = useParams<{ projectId: string }>();
    const [, navigate] = useLocation();
    const projectId = Number(params.projectId);
    const utils = trpc.useUtils();

    const [activeTab, setActiveTab] = useState("wheels");
    const [beforeAfter, setBeforeAfter] = useState(false);
    const [gs, setGs] = useState<GradingSettings>(DEFAULTS);
    const [selectedLutCat, setSelectedLutCat] = useState("Film Emulation");

    const { data: project, isLoading: projectLoading } = trpc.project.get.useQuery(
      { id: projectId },
      { enabled: !!user && !!projectId }
    );
    const updateProject = trpc.project.update.useMutation({
      onSuccess: () => { utils.project.get.invalidate({ id: projectId }); toast.success("Color grade saved"); },
      onError: (e: any) => toast.error(e.message),
    });

    useEffect(() => {
      if (project) {
        const saved = (project.colorGradingSettings || {}) as Partial<GradingSettings>;
        setGs({ ...DEFAULTS, ...saved });
      }
    }, [project]);

    const save = (overrideGs?: GradingSettings) => {
      const data = overrideGs || gs;
      updateProject.mutate({ id: projectId, colorGrading: data.activeLut || "custom", colorGradingSettings: data as any });
    };

    const applyPreset = (preset: typeof LEGACY_PRESETS[0]) => {
      const next = { ...gs, ...preset.settings, activeLut: preset.name };
      setGs(next); save(next);
    };

    const applyLut = (lutId: string) => {
      const next = { ...gs, activeLut: lutId };
      setGs(next); save(next);
    };

    const reset = () => { setGs(DEFAULTS); save(DEFAULTS); };

    const patch = (p: Partial<GradingSettings>) => {
      setGs(prev => ({ ...prev, ...p }));
    };

    if (authLoading || projectLoading) {
      return <div className="min-h-screen flex items-center justify-center" style={{ background: "#07070e" }}><Loader2 className="h-8 w-8 animate-spin text-amber-400" style={{ color: "#D4AF37" }} /></div>;
    }
    if (!user) { window.location.href = getLoginUrl(); return null; }

    const activeLutName = LUT_LIBRARY.flatMap(c=>c.luts).find(l=>l.id===gs.activeLut)?.name || LEGACY_PRESETS.find(p=>p.name===gs.activeLut)?.label || null;

    return (
        <>
        <div className="border-b sticky top-0 z-20" style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(7,7,14,0.97)", backdropFilter: "blur(24px)" }}>
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => navigate(`/projects/${projectId}`)} className="gap-2 text-muted-foreground h-8"><ArrowLeft className="h-4 w-4 text-amber-400/70" />Back</Button>
              <div className="h-5 w-px bg-border/40" />
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg,#D4AF37,#b8960c)" }}>
                  <Palette className="h-4.5 w-4.5 text-black" style={{ width: 18, height: 18 }} />
                </div>
                <div>
                  <div className="font-bold text-sm">{project?.title} — Color Grading</div>
                  <div className="text-[10px] text-muted-foreground">{activeLutName ? <><span style={{ color: "#D4AF37" }}>{activeLutName}</span> applied</> : "No grade applied"}</div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={() => setBeforeAfter(b => !b)} className={`gap-2 h-8 text-xs ${beforeAfter ? "text-yellow-400" : "text-muted-foreground"}`}>
                {beforeAfter ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {beforeAfter ? "Before" : "After"}
              </Button>
              <Button size="sm" variant="ghost" onClick={reset} className="gap-2 h-8 text-xs text-muted-foreground"><RefreshCw className="h-3.5 w-3.5" />Reset</Button>
              <Button size="sm" onClick={() => save()} disabled={updateProject.isPending} className="gap-2 h-8 text-xs" style={{ background: "linear-gradient(135deg,#D4AF37,#b8960c)", color: "#000" }}>
                {updateProject.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-400" /> : <Check className="h-3.5 w-3.5" />}Save Grade
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Before/After banner */}
          {beforeAfter && (
            <div className="mb-4 rounded-xl border px-4 py-3 flex items-center gap-3" style={{ borderColor: "rgba(212,175,55,0.3)", background: "rgba(212,175,55,0.05)" }}>
              <Eye className="h-4 w-4 shrink-0" style={{ color: "#D4AF37" }} />
              <p className="text-xs text-muted-foreground">Previewing <strong className="text-white">before</strong> state — all grading disabled. Toggle off to see your grade.</p>
            </div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6 border border-border/40 bg-black/40 h-9 gap-0.5">
              <TabsTrigger value="wheels"   className="gap-1.5 text-xs h-7 data-[state=active]:text-amber-400"><Palette className="h-3.5 w-3.5" />Wheels</TabsTrigger>
              <TabsTrigger value="primary"  className="gap-1.5 text-xs h-7 data-[state=active]:text-amber-400"><Sliders className="h-3.5 w-3.5" />Primary</TabsTrigger>
              <TabsTrigger value="luts"     className="gap-1.5 text-xs h-7 data-[state=active]:text-amber-400"><Sparkles className="h-3.5 w-3.5" />LUT Library</TabsTrigger>
              <TabsTrigger value="scopes"   className="gap-1.5 text-xs h-7 data-[state=active]:text-amber-400"><BarChart3 className="h-3.5 w-3.5" />Scopes</TabsTrigger>
            </TabsList>

            {/* ══ WHEELS ══ */}
            <TabsContent value="wheels">
              <div className="space-y-6">
                <div className="rounded-xl border p-2 mb-4 flex items-center gap-3" style={{ borderColor: "rgba(212,175,55,0.15)", background: "rgba(212,175,55,0.03)" }}>
                  <Sparkles className="h-4 w-4 shrink-0" style={{ color: "#D4AF37" }} />
                  <p className="text-xs text-muted-foreground">
                    <span style={{ color: "#D4AF37" }} className="font-semibold">3-Way Color Wheels.</span>{" "}
                    Lift adjusts shadows, Gamma adjusts midtones, Gain adjusts highlights. Temp shifts warm↔cool, Tint shifts green↔magenta. Master controls overall luminance of each range.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                  <ColorWheel label="Lift" sublabel="Shadows" color="#60a5fa"
                    temp={gs.liftTemp} tint={gs.liftTint} master={gs.liftMaster}
                    onTempChange={v => patch({ liftTemp: v })} onTintChange={v => patch({ liftTint: v })} onMasterChange={v => patch({ liftMaster: v })} />
                  <ColorWheel label="Gamma" sublabel="Midtones" color="#D4AF37"
                    temp={gs.gammaTemp} tint={gs.gammaTint} master={gs.gammaMaster}
                    onTempChange={v => patch({ gammaTemp: v })} onTintChange={v => patch({ gammaTint: v })} onMasterChange={v => patch({ gammaMaster: v })} />
                  <ColorWheel label="Gain" sublabel="Highlights" color="#fb7185"
                    temp={gs.gainTemp} tint={gs.gainTint} master={gs.gainMaster}
                    onTempChange={v => patch({ gainTemp: v })} onTintChange={v => patch({ gainTint: v })} onMasterChange={v => patch({ gainMaster: v })} />
                </div>
                <div className="flex justify-center pt-2">
                  <Button onClick={() => save()} disabled={updateProject.isPending} className="gap-2 px-8" style={{ background: "linear-gradient(135deg,#D4AF37,#b8960c)", color: "#000" }}>
                    {updateProject.isPending ? <Loader2 className="h-4 w-4 animate-spin text-amber-400" /> : <Check className="h-4 w-4" />}Apply Wheels
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* ══ PRIMARY ══ */}
            <TabsContent value="primary">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-5">
                  {[
                    { key: "exposure",    label: "Exposure",     icon: Sun,      unit: "EV",  min: 0, max: 100 },
                    { key: "contrast",    label: "Contrast",     icon: Contrast, unit: "",    min: 0, max: 100 },
                    { key: "highlights",  label: "Highlights",   icon: Sun,      unit: "",    min: 0, max: 100 },
                    { key: "shadows",     label: "Shadows",      icon: Monitor,  unit: "",    min: 0, max: 100 },
                  ].map(ctrl => {
                    const Icon = ctrl.icon;
                    const val = gs[ctrl.key as keyof GradingSettings] as number;
                    const display = ctrl.key === "exposure" ? ((val-50)/50).toFixed(2) + " EV" : (val === 50 ? "0" : val > 50 ? `+${Math.round(val-50)}` : `${Math.round(val-50)}`);
                    return (
                      <div key={ctrl.key} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2"><Icon className="h-4 w-4 text-muted-foreground" style={{ width: 14, height: 14 }} /><Label className="text-xs">{ctrl.label}</Label></div>
                          <span className="text-xs font-mono" style={{ color: "#D4AF37" }}>{display}</span>
                        </div>
                        <Slider value={[val]} onValueChange={([v]) => patch({ [ctrl.key]: v } as any)} min={ctrl.min} max={ctrl.max} step={1} />
                      </div>
                    );
                  })}
                </div>
                <div className="space-y-5">
                  {[
                    { key: "temperature", label: "Color Temperature", icon: Sun,      unit: "K" },
                    { key: "tint",        label: "Tint",              icon: Droplets, unit: "" },
                    { key: "saturation",  label: "Saturation",        icon: Palette,  unit: "%" },
                    { key: "vibrance",    label: "Vibrance",          icon: Zap,      unit: "%" },
                    { key: "clarity",     label: "Clarity / Texture", icon: Sparkles, unit: "" },
                  ].map(ctrl => {
                    const Icon = ctrl.icon;
                    const val = gs[ctrl.key as keyof GradingSettings] as number;
                    const display = val === 50 ? "0" : val > 50 ? `+${Math.round(val-50)}` : `${Math.round(val-50)}`;
                    return (
                      <div key={ctrl.key} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2"><Icon className="h-4 w-4 text-muted-foreground" style={{ width: 14, height: 14 }} /><Label className="text-xs">{ctrl.label}</Label></div>
                          <span className="text-xs font-mono" style={{ color: "#D4AF37" }}>{display}</span>
                        </div>
                        <Slider value={[val]} onValueChange={([v]) => patch({ [ctrl.key]: v } as any)} min={0} max={100} step={1} />
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Quick presets */}
              <div className="mt-8">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Cinematic Quick Presets</p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {LEGACY_PRESETS.map(p => (
                    <button key={p.name} onClick={() => applyPreset(p)}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all hover:border-yellow-500/40 ${gs.activeLut === p.name ? "border-yellow-500/60" : "border-border/30"}`}
                      style={{ background: gs.activeLut === p.name ? "rgba(212,175,55,0.08)" : "rgba(255,255,255,0.02)" }}>
                      <div className={`w-full h-8 rounded-lg bg-gradient-to-r ${p.gradient} opacity-80`} />
                      <span className="text-[10px] font-semibold">{p.label}</span>
                      {gs.activeLut === p.name && <Check className="h-3 w-3" style={{ color: "#D4AF37" }} />}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-center mt-6">
                <Button onClick={() => save()} disabled={updateProject.isPending} className="gap-2 px-8" style={{ background: "linear-gradient(135deg,#D4AF37,#b8960c)", color: "#000" }}>
                  {updateProject.isPending ? <Loader2 className="h-4 w-4 animate-spin text-amber-400" /> : <Check className="h-4 w-4" />}Save Primary Grade
                </Button>
              </div>
            </TabsContent>

            {/* ══ LUT LIBRARY ══ */}
            <TabsContent value="luts">
              <div className="space-y-4">
                <div className="flex gap-2 flex-wrap">
                  {LUT_LIBRARY.map(cat => (
                    <button key={cat.category} onClick={() => setSelectedLutCat(cat.category)}
                      className={`text-[11px] px-3 py-1.5 rounded-full border transition-all ${selectedLutCat === cat.category ? "border-yellow-500/50 bg-yellow-500/10 text-yellow-400" : "border-border/40 text-muted-foreground hover:border-border/60"}`}>
                      {cat.category}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {LUT_LIBRARY.find(c=>c.category===selectedLutCat)?.luts.map(lut => (
                    <button key={lut.id} onClick={() => applyLut(lut.id)}
                      className={`flex flex-col gap-2.5 p-3.5 rounded-xl border text-left transition-all hover:border-yellow-500/30 ${gs.activeLut === lut.id ? "border-yellow-500/60" : "border-border/30"}`}
                      style={{ background: gs.activeLut === lut.id ? "rgba(212,175,55,0.06)" : "rgba(255,255,255,0.02)" }}>
                      <div className={`h-12 w-full rounded-lg bg-gradient-to-br ${lut.gradient} opacity-85`} />
                      <div>
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-semibold leading-tight">{lut.name}</p>
                          {gs.activeLut === lut.id && <Check className="h-3.5 w-3.5 shrink-0" style={{ color: "#D4AF37" }} />}
                        </div>
                        <p className="text-[9px] text-muted-foreground mt-0.5 leading-relaxed">{lut.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
                {gs.activeLut && (
                  <div className="flex items-center gap-3 mt-2">
                    <Button variant="outline" size="sm" onClick={() => applyLut("")} className="gap-2 text-xs border-border/40">
                      <RefreshCw className="h-3.5 w-3.5" />Clear LUT
                    </Button>
                    <p className="text-xs text-muted-foreground">Active: <span style={{ color: "#D4AF37" }} className="font-semibold">{activeLutName}</span></p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ══ SCOPES ══ */}
            <TabsContent value="scopes">
              <div className="space-y-4">
                <div className="rounded-xl border px-4 py-3 flex items-center gap-3" style={{ borderColor: "rgba(212,175,55,0.15)", background: "rgba(212,175,55,0.03)" }}>
                  <BarChart3 className="h-4 w-4 shrink-0" style={{ color: "#D4AF37" }} />
                  <p className="text-xs text-muted-foreground">Scope visualization is a preview representation based on your current grade parameters. For pixel-accurate scopes, export to DaVinci Resolve.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
                    <p className="text-xs font-semibold">Waveform Monitor</p>
                    <p className="text-[10px] text-muted-foreground">Luminance distribution left-to-right</p>
                    <WaveformScope contrast={gs.contrast} shadows={gs.shadows} highlights={gs.highlights} />
                    <div className="flex justify-between text-[9px] text-muted-foreground font-mono"><span>0 IRE</span><span>50</span><span>100 IRE</span></div>
                  </div>
                  <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
                    <p className="text-xs font-semibold">Histogram</p>
                    <p className="text-[10px] text-muted-foreground">Tonal frequency distribution</p>
                    <HistogramScope contrast={gs.contrast} saturation={gs.saturation} temperature={gs.temperature} />
                    <div className="flex justify-between text-[9px] text-muted-foreground font-mono"><span>Shadows</span><span>Midtones</span><span>Highlights</span></div>
                  </div>
                  <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
                    <p className="text-xs font-semibold">Vectorscope</p>
                    <p className="text-[10px] text-muted-foreground">Hue and saturation distribution</p>
                    <div className="flex justify-center"><VectorscopeScope saturation={gs.saturation} tint={gs.tint} /></div>
                    <div className="text-center text-[9px] text-muted-foreground font-mono">Saturation {gs.saturation}% · Tint {gs.tint > 50 ? "+Mg" : gs.tint < 50 ? "+G" : "Neutral"}</div>
                  </div>
                </div>
                {/* Grade summary */}
                <div className="rounded-xl border p-4" style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
                  <p className="text-xs font-semibold mb-3">Current Grade Summary</p>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 text-center">
                    {[
                      { label: "Exposure",    val: gs.exposure,    key: "exposure" },
                      { label: "Contrast",    val: gs.contrast,    key: "contrast" },
                      { label: "Saturation",  val: gs.saturation,  key: "saturation" },
                      { label: "Temperature", val: gs.temperature, key: "temperature" },
                      { label: "Active LUT",  val: null,           key: "lut" },
                    ].map(s => (
                      <div key={s.key} className="space-y-1">
                        <div className="text-[9px] text-muted-foreground uppercase tracking-wider">{s.label}</div>
                        {s.val !== null
                          ? <div className="text-sm font-bold" style={{ color: "#D4AF37" }}>{s.val === 50 ? "0" : s.val > 50 ? `+${Math.round(s.val-50)}` : `${Math.round(s.val-50)}`}</div>
                          : <div className="text-sm font-bold" style={{ color: gs.activeLut ? "#D4AF37" : "rgba(255,255,255,0.3)" }}>{activeLutName || "None"}</div>
                        }
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
        <NextStageCTA projectId={projectId} currentStage="colorGrading" />
      </div>
      </>
    );
  }

  // ─── Sliders icon polyfill ────────────────────────────────────────────────────
  function Sliders({ className, style }: { className?: string; style?: React.CSSProperties }) {
    return <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>;
  }
  function Contrast({ className, style }: { className?: string; style?: React.CSSProperties }) {
    return <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 2v20M2 12h20" opacity="0.3"/><path d="M12 2a10 10 0 0 1 0 20V2z" fill="currentColor" stroke="none"/></svg>;
  }

  export default function ColorGrading() {
    return <SubscriptionGate feature="canUseColorGrading"><ColorGradingInner /></SubscriptionGate>;
  }
  