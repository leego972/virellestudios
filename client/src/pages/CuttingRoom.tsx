import { useEffect, useMemo, useState } from "react";
  import { useLocation, useParams } from "wouter";
  import { NextStageCTA } from "@/components/NextStageCTA";
  import { trpc } from "@/lib/trpc";
  import { Button } from "@/components/ui/button";
  import { Checkbox } from "@/components/ui/checkbox";
  import {
    ArrowLeft, Film, Sparkles, Loader2, Clock, Image as ImageIcon,
    Music, Mic, Video, Subtitles, Palette, CircleCheck, Clapperboard,
    ExternalLink, Check, TrendingUp,
  } from "lucide-react";
  import { toast } from "sonner";

  // ─── Constants ────────────────────────────────────────────────────────────────

  const CHECKLIST_ITEMS: { key: string; label: string; icon: any; color: string }[] = [
    { key: "storyboard",    label: "Storyboard",       icon: ImageIcon,    color: "#818cf8" },
    { key: "takesIngested", label: "Takes ingested",   icon: Video,        color: "#60a5fa" },
    { key: "selectsMarked", label: "Selects marked",   icon: CircleCheck,  color: "#34d399" },
    { key: "dialogueClean", label: "Dialogue cleaned", icon: Mic,          color: "#f472b6" },
    { key: "scoreLocked",   label: "Score locked",     icon: Music,        color: "#a78bfa" },
    { key: "sfxLocked",     label: "SFX locked",       icon: Music,        color: "#fb923c" },
    { key: "colorPass",     label: "Color pass",       icon: Palette,      color: "#D4AF37" },
    { key: "captions",      label: "Captions / subs",  icon: Subtitles,    color: "#22d3ee" },
  ];

  type Checklist = Record<number, Record<string, boolean>>;

  function fmtSecs(secs: number) {
    if (secs < 60) return `${secs}s`;
    const m = Math.floor(secs / 60), s = secs % 60;
    return s ? `${m}m ${s}s` : `${m}m`;
  }

  // ─── MarkdownContent — defined OUTSIDE component to avoid recreation ─────────

  function MarkdownContent({ content }: { content: string }) {
    return (
      <div className="space-y-1 max-h-80 overflow-y-auto text-xs leading-relaxed pr-1">
        {content.split("\n").map((line, i) => {
          if (line.startsWith("### ")) return <p key={i} className="font-bold text-amber-400/90 mt-3 first:mt-0 text-[11px] uppercase tracking-wider">{line.slice(4)}</p>;
          if (line.startsWith("## "))  return <p key={i} className="font-bold mt-3 first:mt-0 text-[11px] uppercase tracking-wider" style={{ color:"#D4AF37" }}>{line.slice(3)}</p>;
          if (line.startsWith("- ") || line.startsWith("* ")) {
            const txt = line.slice(2).replace(/\*\*(.+?)\*\*/g, "$1");
            return <p key={i} className="pl-3 text-[11px] text-foreground/70" style={{ paddingLeft:"16px", textIndent:"-8px" }}>· {txt}</p>;
          }
          if (line.trim() === "") return <div key={i} className="h-1.5" />;
          return <p key={i} className="text-[11px] text-foreground/70">{line.replace(/\*\*(.+?)\*\*/g, "$1")}</p>;
        })}
      </div>
    );
  }

  // ─── Scene Timeline Strip ────────────────────────────────────────────────────

  function SceneStrip({
    scene, idx, totalRuntime, progress, checklist,
    onToggle,
  }: {
    scene: any; idx: number; totalRuntime: number;
    progress: { done: number; total: number; pct: number };
    checklist: Record<string, boolean>;
    onToggle: (key: string) => void;
  }) {
    const widthPct = totalRuntime > 0
      ? Math.max(4, ((scene.duration || 0) / totalRuntime) * 100)
      : 100 / Math.max(1, idx + 1);
    const isComplete = progress.pct === 100;

    return (
      <div className="rounded-xl border overflow-hidden transition-all"
        style={{ borderColor: isComplete ? "rgba(74,222,128,0.2)" : "rgba(255,255,255,0.07)", background: isComplete ? "rgba(74,222,128,0.03)" : "rgba(255,255,255,0.015)" }}>

        {/* Header row */}
        <div className="flex items-center gap-3 px-4 py-2.5">
          <div className="h-7 w-7 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0"
            style={{ background: isComplete ? "rgba(74,222,128,0.1)" : "rgba(212,175,55,0.08)", color: isComplete ? "#4ade80" : "#D4AF37", border: `1px solid ${isComplete ? "rgba(74,222,128,0.2)" : "rgba(212,175,55,0.15)"}` }}>
            {isComplete ? <Check style={{ width:12, height:12 }} /> : scene.orderIndex ?? idx + 1}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold truncate">{scene.title || `Scene ${idx + 1}`}</span>
              <span className="text-[9px] text-muted-foreground/40 flex items-center gap-0.5 shrink-0">
                <Clock style={{ width:9, height:9 }} />{fmtSecs(scene.duration || 0)}
              </span>
              {scene.mood && <span className="text-[9px] text-muted-foreground/30 hidden sm:inline italic">{scene.mood}</span>}
            </div>
            {/* Runtime strip */}
            <div className="mt-1.5 h-1 rounded-full overflow-hidden bg-white/5" style={{ width: `${widthPct}%` }}>
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progress.pct}%`, background: isComplete ? "#4ade80" : "linear-gradient(90deg,#D4AF37,#b8960c)", opacity: 0.8 }} />
            </div>
          </div>
          <div className="shrink-0 text-right">
            <span className="text-[9px] font-bold" style={{ color: isComplete ? "#4ade80" : progress.pct >= 50 ? "#D4AF37" : "rgba(255,255,255,0.3)" }}>
              {progress.done}/{progress.total}
            </span>
          </div>
        </div>

        {/* Checklist grid */}
        <div className="px-4 pb-3 grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {CHECKLIST_ITEMS.map(item => {
            const Icon = item.icon;
            const on = !!checklist[item.key];
            return (
              <label key={item.key} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg cursor-pointer text-[10px] border transition-all"
                style={{ borderColor: on ? `${item.color}33` : "rgba(255,255,255,0.06)", background: on ? `${item.color}10` : "rgba(255,255,255,0.02)" }}>
                <Checkbox checked={on} onCheckedChange={() => onToggle(item.key)}
                  className="h-3.5 w-3.5 shrink-0 rounded-sm data-[state=checked]:bg-transparent data-[state=checked]:border-0" />
                <Icon style={{ width:10, height:10, color: on ? item.color : "rgba(255,255,255,0.25)", flexShrink:0 }} />
                <span className="truncate" style={{ color: on ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.3)" }}>{item.label}</span>
              </label>
            );
          })}
        </div>
      </div>
    );
  }


    // ─── Interactive Timeline Editor ─────────────────────────────────────────────

    function TimelineEditor({
      scenes, projectId, onReordered,
    }: {
      scenes: any[]; projectId: number; onReordered: () => void;
    }) {
      const [order, setOrder]   = useState<number[]>(scenes.map((s: any) => s.id));
      const [dragging, setDragging] = useState<number | null>(null);
      const [dragOver, setDragOver] = useState<number | null>(null);
      const [saved, setSaved]   = useState(false);
      const reorder = trpc.scene.reorder.useMutation();
      const utils   = trpc.useUtils();
      const totalDur = scenes.reduce((a: number, s: any) => a + (s.duration || 0), 0);

      useEffect(() => { setOrder(scenes.map((s: any) => s.id)); }, [scenes.length]);

      const ordered = order.map(id => scenes.find((s: any) => s.id === id)).filter(Boolean) as any[];

      function startDrag(id: number) { setDragging(id); }
      function onDragOver(id: number, e: React.DragEvent) { e.preventDefault(); setDragOver(id); }
      function onDrop(targetId: number) {
        if (dragging === null || dragging === targetId) { setDragging(null); setDragOver(null); return; }
        const next = [...order];
        const fromIdx = next.indexOf(dragging);
        const toIdx   = next.indexOf(targetId);
        next.splice(fromIdx, 1);
        next.splice(toIdx, 0, dragging);
        setOrder(next);
        setDragging(null);
        setDragOver(null);
        setSaved(false);
      }
      function onDragEnd() { setDragging(null); setDragOver(null); }

      async function handleSave() {
        try {
          await reorder.mutateAsync({ projectId, sceneIds: order });
          await utils.scene.listByProject.invalidate({ projectId });
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
          onReordered();
          toast.success("Scene order saved");
        } catch (e: any) { toast.error(e.message || "Reorder failed"); }
      }

      const minWidth = 40;
      const maxWidth = 240;

      return (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor:"rgba(255,255,255,0.07)", background:"rgba(255,255,255,0.02)" }}>
          <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor:"rgba(255,255,255,0.07)" }}>
            <div>
              <p className="text-xs font-semibold">Visual Timeline — drag to reorder</p>
              <p className="text-[10px] text-muted-foreground">{ordered.length} scenes · {fmtSecs(totalDur)} total</p>
            </div>
            <Button size="sm" onClick={handleSave} disabled={reorder.isPending || saved} className="gap-2 h-7 text-xs"
              style={{ background: saved ? "rgba(74,222,128,0.15)" : "linear-gradient(135deg,#D4AF37,#b8960c)", color: saved ? "#4ade80" : "#000" }}>
              {reorder.isPending ? <Loader2 className="h-3 w-3 animate-spin text-amber-400" /> : <Check className="h-3 w-3" />}
              {saved ? "Saved!" : "Save Order"}
            </Button>
          </div>
          {/* Timeline scroll */}
          <div className="px-4 py-4 overflow-x-auto">
            <div className="flex items-end gap-1.5 min-w-max pb-1">
              {ordered.map((s: any, i: number) => {
                const dur   = s.duration || 5;
                const frac  = totalDur > 0 ? dur / totalDur : 1 / ordered.length;
                const w     = Math.max(minWidth, Math.min(maxWidth, Math.round(frac * 900)));
                const isDragging = dragging === s.id;
                const isOver     = dragOver  === s.id;
                return (
                  <div key={s.id}
                    draggable
                    onDragStart={() => startDrag(s.id)}
                    onDragOver={e  => onDragOver(s.id, e)}
                    onDrop={()     => onDrop(s.id)}
                    onDragEnd={onDragEnd}
                    className="flex flex-col items-center cursor-grab active:cursor-grabbing select-none transition-all"
                    style={{ opacity: isDragging ? 0.3 : 1, transform: isOver ? "scaleY(1.04)" : "none" }}>
                    {/* Clip block */}
                    <div className="relative rounded-lg overflow-hidden border-2 transition-colors"
                      style={{
                        width: w, height: 54,
                        borderColor: isOver ? "#D4AF37" : "rgba(255,255,255,0.08)",
                        background: s.thumbnailUrl ? "transparent" : "rgba(212,175,55,0.06)",
                      }}>
                      {s.thumbnailUrl && (
                        <img src={s.thumbnailUrl} alt="" className="w-full h-full object-cover opacity-70" />
                      )}
                      <div className="absolute inset-0 flex flex-col items-center justify-center px-1">
                        {!s.thumbnailUrl && (
                          <Clapperboard style={{ width:14, height:14, color:"rgba(212,175,55,0.4)" }} />
                        )}
                        <span className="text-[9px] font-bold text-center leading-tight mt-0.5 drop-shadow-sm"
                          style={{ color: s.thumbnailUrl ? "#fff" : "rgba(255,255,255,0.6)" }}>
                          {i + 1}
                        </span>
                      </div>
                      {/* Has video badge */}
                      {s.videoUrl && (
                        <div className="absolute top-1 right-1 h-2 w-2 rounded-full" style={{ background:"#4ade80" }} title="Video ready" />
                      )}
                      {/* Drop indicator */}
                      {isOver && (
                        <div className="absolute left-0 top-0 bottom-0 w-0.5" style={{ background:"#D4AF37" }} />
                      )}
                    </div>
                    {/* Label */}
                    <div className="mt-1 text-center" style={{ width: w }}>
                      <p className="text-[9px] text-muted-foreground truncate px-1">{s.title || "Scene"}</p>
                      <p className="text-[8px] text-muted-foreground/50">{fmtSecs(dur)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          {/* Timecode ruler */}
          <div className="px-4 pb-2">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {ordered.map((s: any, i: number) => {
                const cum = ordered.slice(0, i).reduce((a: number, x: any) => a + (x.duration || 0), 0);
                return (
                  <span key={s.id} className="text-[9px] text-muted-foreground/40 whitespace-nowrap">
                    {fmtSecs(cum)}
                  </span>
                );
              })}
              <span className="text-[9px] text-muted-foreground/40 ml-auto">{fmtSecs(totalDur)}</span>
            </div>
          </div>
        </div>
      );
    }

    // ─── Main component ───────────────────────────────────────────────────────────

  export default function CuttingRoom() {
    const params = useParams<{ projectId: string }>();
    const [, navigate] = useLocation();
    const projectId  = parseInt(params.projectId || "0");
    const hasProject = !!projectId;
    const storageKey = `virelle.cuttingRoom.${projectId}`;

    const { data: project    } = trpc.project.get.useQuery({ id: projectId }, { enabled: hasProject });
    const { data: scenes     } = trpc.scene.listByProject.useQuery({ projectId }, { enabled: hasProject });

    const sortedScenes  = useMemo(() => (scenes ?? []).slice().sort((a: any, b: any) => (a.orderIndex||0)-(b.orderIndex||0)), [scenes]);
    const totalRuntime  = useMemo(() => sortedScenes.reduce((acc: number, s: any) => acc + (s.duration||0), 0), [sortedScenes]);

    const [checklist, setChecklist] = useState<Checklist>({});
    useEffect(() => { try { const r = localStorage.getItem(storageKey); if (r) setChecklist(JSON.parse(r)); } catch {} }, [storageKey]);
    useEffect(() => { try { localStorage.setItem(storageKey, JSON.stringify(checklist)); } catch {} }, [storageKey, checklist]);

    const toggle = (sceneId: number, key: string) =>
      setChecklist(prev => ({ ...prev, [sceneId]: { ...(prev[sceneId]||{}), [key]: !(prev[sceneId]?.[key]) } }));

    const sceneProgress = (sceneId: number) => {
      const c = checklist[sceneId] || {};
      const done = CHECKLIST_ITEMS.filter(i => c[i.key]).length;
      return { done, total: CHECKLIST_ITEMS.length, pct: Math.round(done/CHECKLIST_ITEMS.length*100) };
    };

    const overall = useMemo(() => {
      if (!sortedScenes.length) return { done:0, total:0, pct:0 };
      let done=0, total=0;
      for (const s of sortedScenes) {
        const c = checklist[s.id] || {};
        total += CHECKLIST_ITEMS.length;
        done  += CHECKLIST_ITEMS.filter(i => c[i.key]).length;
      }
      return { done, total, pct: Math.round(done/total*100) };
    }, [sortedScenes, checklist]);

    const completedScenes = sortedScenes.filter((s: any) => sceneProgress(s.id).pct === 100).length;

    // AI mastering notes
    const sendMessage = trpc.directorChat.send.useMutation();
    const exportMovie = trpc.movie.exportFromProject.useMutation();
    const { data: history, refetch: refetchHistory } = trpc.directorChat.history.useQuery({ projectId }, { enabled: hasProject, refetchInterval: 4000 });
    const [generating,       setGenerating]       = useState<"masteringNotes" | null>(null);
    const [exportingTrailer, setExportingTrailer] = useState(false);
    const [trailerMovieId,   setTrailerMovieId]   = useState<number | null>(null);

    function lastByTag(tag: string): string | null {
      const arr = (history ?? []) as any[];
      for (let i = arr.length-1; i >= 0; i--) {
        const m = arr[i];
        if (m.role !== "assistant") continue;
        const prev = arr[i-1];
        if (prev?.role === "user" && (prev.content||"").startsWith(`[CuttingRoom:${tag}]`)) return m.content as string;
      }
      return null;
    }

    async function generateMasteringNotes() {
      if (!hasProject || sortedScenes.length === 0) { toast.error("Add scenes first."); return; }
      setGenerating("masteringNotes");
      try {
        const summary = (sortedScenes as any[]).map((s: any, i: number) =>
          `${s.orderIndex ?? i+1}. ${s.title||"Untitled"} — ${fmtSecs(s.duration||0)} — ${s.mood||"?"} — ${s.locationType||"?"}`
        ).join("\n");
        await sendMessage.mutateAsync({
          projectId,
          message: `[CuttingRoom:masteringNotes]\n\nWrite a final-mastering punch list for "${project?.title||"Untitled"}" (total runtime ${fmtSecs(totalRuntime)}).\nScene list:\n${summary}\n\nOutput a clean checklist grouped under: Picture, Sound (dialogue/music/SFX), Color, Captions, Deliverables (DCP, ProRes, h264, audio stems). Keep each item terse and specific.`,
        });
        await refetchHistory();
        toast.success("Mastering notes ready.");
      } catch (e: any) { toast.error(e?.message||"Generation failed."); }
      finally { setGenerating(null); }
    }

    async function generateTrailer() {
      if (!hasProject) return;
      const videoScenes = (sortedScenes as any[]).filter((s: any) => s.videoUrl);
      if (videoScenes.length === 0) { toast.error("No scene videos yet — generate at least one first."); return; }
      setExportingTrailer(true);
      try {
        const result = await exportMovie.mutateAsync({ projectId, exportType: "trailer" });
        setTrailerMovieId((result as any).movieIds?.[0] ?? null);
        toast.success("Trailer compiled! Opening My Movies…");
      } catch (e: any) { toast.error(e?.message||"Trailer failed — make sure your scenes have videos."); }
      finally { setExportingTrailer(false); }
    }

    return (
      <div className="min-h-screen" style={{ background:"linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)" }}>
        {/* Header */}
        <div className="border-b sticky top-0 z-20" style={{ borderColor:"rgba(255,255,255,0.07)", background:"rgba(7,7,14,0.97)", backdropFilter:"blur(24px)" }}>
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => navigate(`/projects/${projectId}`)} className="gap-2 text-muted-foreground h-8"><ArrowLeft className="h-4 w-4" />Back</Button>
              <div className="h-5 w-px bg-border/40" />
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0" style={{ background:"linear-gradient(135deg,#f59e0b,#d97706)" }}>
                  <Film className="text-black" style={{ width:18, height:18 }} />
                </div>
                <div>
                  <div className="font-bold text-sm">{project?.title} — Cutting Room</div>
                  <div className="text-[10px] text-muted-foreground">
                    {sortedScenes.length} scenes · {fmtSecs(totalRuntime)} · {overall.pct}% post-ready · {completedScenes} scene{completedScenes!==1?"s":""} complete
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              { label:"Scenes",    val:String(sortedScenes.length),                          color:"#D4AF37" },
              { label:"Runtime",   val:fmtSecs(totalRuntime),                                color:"#60a5fa" },
              { label:"Complete",  val:`${completedScenes}/${sortedScenes.length}`,           color:"#4ade80" },
              { label:"Progress",  val:`${overall.pct}%`,                                   color: overall.pct===100?"#4ade80":overall.pct>=50?"#D4AF37":"rgba(255,255,255,0.4)" },
            ].map((s,i) => (
              <div key={i} className="rounded-xl border px-4 py-3" style={{ borderColor:"rgba(255,255,255,0.07)", background:"rgba(255,255,255,0.02)" }}>
                <div className="text-[9px] text-muted-foreground uppercase tracking-wider">{s.label}</div>
                <div className="text-xl font-bold mt-0.5" style={{ color:s.color }}>{s.val}</div>
              </div>
            ))}
          </div>

          {/* Overall progress bar */}
          <div className="rounded-xl border px-5 py-4" style={{ borderColor:"rgba(255,255,255,0.07)", background:"rgba(255,255,255,0.02)" }}>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-semibold">Post-Production Progress</span>
              <span className="text-xs font-bold" style={{ color: overall.pct===100?"#4ade80":"#D4AF37" }}>{overall.done} / {overall.total} items</span>
            </div>
            <div className="h-3 rounded-full overflow-hidden bg-white/5">
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width:`${overall.pct}%`, background: overall.pct===100?"linear-gradient(90deg,#4ade80,#22c55e)":"linear-gradient(90deg,#D4AF37,#b8960c)" }} />
            </div>
            {/* Per-item legend */}
            <div className="flex flex-wrap gap-3 mt-3">
              {CHECKLIST_ITEMS.map(item => {
                const doneCount = sortedScenes.filter((s: any) => checklist[s.id]?.[item.key]).length;
                return (
                  <div key={item.key} className="flex items-center gap-1.5 text-[9px] text-muted-foreground/50">
                    <div className="h-1.5 w-1.5 rounded-full" style={{ background: item.color, opacity: doneCount>0?0.8:0.2 }} />
                    <span>{item.label}</span>
                    <span className="font-semibold" style={{ color: doneCount===sortedScenes.length&&doneCount>0?"#4ade80":"rgba(255,255,255,0.3)" }}>{doneCount}/{sortedScenes.length}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Interactive Timeline Editor */}
            {sortedScenes.length > 0 && (
              <TimelineEditor scenes={sortedScenes} projectId={projectId} onReordered={() => {}} />
            )}

            {/* Scene timeline */}
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold">Scene Timeline</p>
              <p className="text-[10px] text-muted-foreground">Tick items as post advances — saved locally</p>
            </div>
            {sortedScenes.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed flex flex-col items-center py-20 gap-3" style={{ borderColor:"rgba(255,255,255,0.07)" }}>
                <Clapperboard className="h-12 w-12 opacity-20" />
                <p className="text-sm">No scenes yet</p>
                <p className="text-xs text-muted-foreground text-center max-w-xs">Add scenes in the Scene Editor — the post-production checklist will appear here.</p>
              </div>
            ) : (
              sortedScenes.map((s: any, i: number) => (
                <SceneStrip
                  key={s.id} scene={s} idx={i} totalRuntime={totalRuntime}
                  progress={sceneProgress(s.id)}
                  checklist={checklist[s.id] || {}}
                  onToggle={key => toggle(s.id, key)}
                />
              ))
            )}
          </div>

          {/* AI mastering notes */}
          <div className="rounded-xl border overflow-hidden" style={{ borderColor:"rgba(212,175,55,0.15)", background:"rgba(212,175,55,0.02)" }}>
            <div className="px-5 py-4 border-b" style={{ borderColor:"rgba(212,175,55,0.1)" }}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background:"rgba(212,175,55,0.12)", border:"1px solid rgba(212,175,55,0.2)" }}>
                    <Sparkles style={{ width:16, height:16, color:"#D4AF37" }} />
                  </div>
                  <div>
                    <div className="text-xs font-semibold">AI Mastering Punch List</div>
                    <div className="text-[10px] text-muted-foreground">AI-generated final-delivery checklist for picture, sound, color, captions & deliverables</div>
                  </div>
                </div>
                <Button size="sm" onClick={generateMasteringNotes} disabled={!!generating} className="gap-2 h-8 text-xs" style={{ background:"linear-gradient(135deg,#D4AF37,#b8960c)", color:"#000" }}>
                  {generating==="masteringNotes" ? <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-400" /> : <Sparkles className="h-3.5 w-3.5" />}
                  {lastByTag("masteringNotes") ? "Regenerate" : "Generate"}
                </Button>
              </div>
            </div>
            {lastByTag("masteringNotes") && (
              <div className="px-5 py-4">
                <MarkdownContent content={lastByTag("masteringNotes")!} />
              </div>
            )}
          </div>

          {/* Trailer export */}
          <div className="rounded-xl border overflow-hidden" style={{ borderColor:"rgba(99,102,241,0.15)", background:"rgba(99,102,241,0.02)" }}>
            <div className="px-5 py-4 border-b" style={{ borderColor:"rgba(99,102,241,0.1)" }}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background:"rgba(99,102,241,0.12)", border:"1px solid rgba(99,102,241,0.2)" }}>
                    <Clapperboard style={{ width:16, height:16, color:"#818cf8" }} />
                  </div>
                  <div>
                    <div className="text-xs font-semibold">90-Second Trailer</div>
                    <div className="text-[10px] text-muted-foreground">Stitch your scene videos into a real MP4 trailer with the Virelle Studios intro</div>
                  </div>
                </div>
                <Button size="sm" onClick={generateTrailer} disabled={exportingTrailer} className="gap-2 h-8 text-xs border-border/40" variant="outline">
                  {exportingTrailer ? <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-400" /> : <TrendingUp className="h-3.5 w-3.5" />}
                  Compile Trailer
                </Button>
              </div>
            </div>
            <div className="px-5 py-3 flex flex-wrap gap-1.5">
              {sortedScenes.length === 0 ? (
                <p className="text-[10px] text-muted-foreground/50">No scenes yet</p>
              ) : (sortedScenes as any[]).map((s: any, i: number) => (
                <div key={s.id} className={`flex items-center gap-1 px-2 py-0.5 rounded text-[9px] border ${s.videoUrl ? "border-emerald-500/30 text-emerald-400" : "border-border/20 text-muted-foreground/30"}`}
                  style={{ background: s.videoUrl ? "rgba(74,222,128,0.05)" : "transparent" }}>
                  {s.videoUrl ? <Check style={{ width:8, height:8 }} /> : "○"} S{s.orderIndex ?? i+1}
                </div>
              ))}
            </div>
            {trailerMovieId && (
              <div className="px-5 pb-4">
                <a href="/movies" className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                  <ExternalLink style={{ width:12, height:12 }} />Open in My Movies
                </a>
              </div>
            )}
          </div>
        </div>
        <NextStageCTA projectId={projectId} currentStage={8} />
      </div>
    );
  }
  