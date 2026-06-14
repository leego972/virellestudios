import { useState } from "react";
  import { useAuth } from "@/_core/hooks/useAuth";
  import { trpc } from "@/lib/trpc";
  import { Button } from "@/components/ui/button";
  import { Input } from "@/components/ui/input";
  import { Textarea } from "@/components/ui/textarea";
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
  import { toast } from "sonner";
  import { useRoute, useLocation } from "wouter";
  import { getLoginUrl } from "@/const";
  import {
    Palette, Plus, Trash2, Type, Image, Sparkles, ArrowLeft,
    Loader2, X, ChevronRight, Hash, Grid3x3,
  } from "lucide-react";
  import { NextStageCTA } from "@/components/NextStageCTA";

  const GOLD = "#D4AF37";

  const CATEGORIES = ["All", "Colors", "Images", "Typography", "Textures", "References", "Notes"];

  const CAT_COLORS: Record<string, string> = {
    "All":        GOLD,
    "Colors":     "#f472b6",
    "Images":     "#60a5fa",
    "Typography": "#a78bfa",
    "Textures":   "#fb923c",
    "References": "#34d399",
    "Notes":      "#94a3b8",
  };

  function ColorSwatch({ hex }: { hex: string }) {
    const isLight = (h: string) => {
      const c = parseInt(h.slice(1), 16);
      const r=(c>>16)&255, g=(c>>8)&255, b=c&255;
      return (r*299+g*587+b*114)/1000 > 128;
    };
    return (
      <div className="relative aspect-square rounded-2xl overflow-hidden group" style={{ background:hex }}>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background:"rgba(0,0,0,0.5)" }}>
          <Hash style={{ width:20, height:20, color:"white" }} />
          <span className="text-xs font-mono font-bold text-white">{hex}</span>
        </div>
        <div className="absolute bottom-2 left-2 right-2">
          <div className="text-[10px] font-mono font-bold" style={{ color: isLight(hex) ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.5)" }}>{hex}</div>
        </div>
      </div>
    );
  }

  function ImageCard({ item, onDelete }: { item: any; onDelete: () => void }) {
    return (
      <div className="relative rounded-2xl overflow-hidden group aspect-video bg-black/30 border" style={{ borderColor:"rgba(255,255,255,0.07)" }}>
        {item.imageUrl
          ? <img src={item.imageUrl} alt={item.text||"Mood"} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center"><Image style={{ width:32,height:32,color:"rgba(255,255,255,0.1)" }} /></div>
        }
        {item.text && (
          <div className="absolute bottom-0 inset-x-0 px-3 py-2" style={{ background:"linear-gradient(to top,rgba(0,0,0,0.9),transparent)" }}>
            <p className="text-xs text-white/80 line-clamp-2">{item.text}</p>
          </div>
        )}
        <button onClick={onDelete} className="absolute top-2 right-2 h-7 w-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background:"rgba(0,0,0,0.7)", border:"1px solid rgba(255,255,255,0.1)" }}>
          <X style={{ width:12, height:12, color:"white" }} />
        </button>
      </div>
    );
  }

  function TextCard({ item, onDelete }: { item: any; onDelete: () => void }) {
    const catColor = CAT_COLORS[item.category] || "rgba(255,255,255,0.5)";
    return (
      <div className="relative rounded-2xl border p-4 group" style={{ borderColor:"rgba(255,255,255,0.07)", background:"rgba(255,255,255,0.02)" }}>
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color:catColor }}>{item.category}</span>
          <button onClick={onDelete} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/30 hover:text-red-400">
            <Trash2 style={{ width:12, height:12 }} />
          </button>
        </div>
        <p className="text-xs text-foreground/80 leading-relaxed">{item.text}</p>
      </div>
    );
  }

  export default function MoodBoard() {
    const { user, loading: authLoading, isAuthenticated } = useAuth();
    const [, params] = useRoute("/projects/:id/mood-board");
    const [, navigate] = useLocation();
    const projectId = Number(params?.id);

    const [showAdd,      setShowAdd     ] = useState(false);
    const [itemType,     setItemType    ] = useState<"image"|"color"|"text"|"reference">("text");
    const [text,         setText        ] = useState("");
    const [color,        setColor       ] = useState("#c8a97e");
    const [category,     setCategory    ] = useState("References");
    const [imagePrompt,  setImagePrompt ] = useState("");
    const [activeFilter, setActiveFilter] = useState("All");

    const utils = trpc.useUtils();
    const { data: items = [], isLoading } = trpc.moodBoard.listByProject.useQuery(
      { projectId }, { enabled: !!projectId && isAuthenticated }
    );
    const createMut = trpc.moodBoard.create.useMutation({
      onSuccess: () => {
        utils.moodBoard.listByProject.invalidate({ projectId });
        setShowAdd(false); setText(""); setColor("#c8a97e"); setImagePrompt("");
        toast.success("Added to mood board");
      },
      onError: e => toast.error(e.message),
    });
    const deleteMut = trpc.moodBoard.delete.useMutation({
      onSuccess: () => { utils.moodBoard.listByProject.invalidate({ projectId }); toast.success("Removed"); },
    });
    const genImageMut = trpc.moodBoard.generateImage.useMutation({
      onSuccess: (data) => createMut.mutate({ projectId, type:"image", imageUrl:data.url, text:imagePrompt, category:"Images" }),
      onError: e => toast.error(e.message),
    });

    if (authLoading) return <div className="flex items-center justify-center h-screen" style={{ background:"#07070e" }}><Loader2 className="animate-spin h-8 w-8 text-amber-400" style={{ color:GOLD }} /></div>;
    if (!isAuthenticated) { window.location.href = getLoginUrl(); return null; }

    const filtered = activeFilter === "All" ? items as any[] : (items as any[]).filter(i => i.category === activeFilter);
    const colorItems = filtered.filter(i => i.type === "color");
    const imageItems = filtered.filter(i => i.type === "image");
    const textItems  = filtered.filter(i => i.type !== "color" && i.type !== "image");

    const categoryCounts = CATEGORIES.reduce((acc, cat) => {
      acc[cat] = cat === "All" ? (items as any[]).length : (items as any[]).filter(i => i.category === cat).length;
      return acc;
    }, {} as Record<string,number>);

    return (
      <div className="min-h-screen" style={{ background:"linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)" }}>
        {/* Sticky header */}
        <div className="border-b sticky top-0 z-20" style={{ borderColor:"rgba(255,255,255,0.07)", background:"rgba(7,7,14,0.97)", backdropFilter:"blur(24px)" }}>
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => navigate(`/projects/${projectId}`)} className="gap-2 text-muted-foreground h-8"><ArrowLeft className="h-4 w-4 text-amber-400/70" />Back</Button>
              <div className="h-5 w-px bg-border/40" />
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0" style={{ background:"linear-gradient(135deg,#f472b6,#a855f7)" }}>
                  <Palette className="text-white" style={{ width:18, height:18 }} />
                </div>
                <div>
                  <div className="font-bold text-sm">Mood Board</div>
                  <div className="text-[10px] text-muted-foreground">{(items as any[]).length} item{(items as any[]).length !== 1 ? "s" : ""} · visual inspiration & creative direction</div>
                </div>
              </div>
            </div>
            <Button size="sm" onClick={() => setShowAdd(true)} className="h-8 text-xs gap-1.5" style={{ background:"linear-gradient(135deg,#D4AF37,#b8960c)", color:"#000" }}>
              <Plus className="h-3.5 w-3.5" />Add Item
            </Button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-5 space-y-5">

          {/* Category filter pills */}
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map(cat => {
              const active = cat === activeFilter;
              const cc = CAT_COLORS[cat];
              return (
                <button key={cat} onClick={() => setActiveFilter(cat)}
                  className="px-3 py-1 rounded-full text-[11px] font-medium border transition-all"
                  style={{ borderColor: active ? cc : "rgba(255,255,255,0.07)", background: active ? `${cc}18` : "rgba(255,255,255,0.02)", color: active ? cc : "rgba(255,255,255,0.4)" }}>
                  {cat} {categoryCounts[cat] > 0 && <span className="opacity-60 ml-0.5">{categoryCounts[cat]}</span>}
                </button>
              );
            })}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-24"><Loader2 className="animate-spin h-8 w-8 text-amber-400" style={{ color:GOLD }} /></div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed flex flex-col items-center py-24 gap-3" style={{ borderColor:"rgba(255,255,255,0.06)" }}>
              <Grid3x3 className="h-12 w-12 opacity-20" />
              <p className="text-sm font-medium">No items yet</p>
              <p className="text-xs text-muted-foreground text-center max-w-xs">Add colors, AI images, typography notes, or references to build your visual language.</p>
              <Button size="sm" onClick={() => setShowAdd(true)} className="mt-2 gap-1.5 text-xs" style={{ background:"linear-gradient(135deg,#D4AF37,#b8960c)", color:"#000" }}>
                <Plus className="h-3 w-3" />Add first item
              </Button>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Color palette section */}
              {colorItems.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-px flex-1" style={{ background:"linear-gradient(90deg,rgba(244,114,182,0.3),transparent)" }} />
                    <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color:"#f472b6" }}>Color Palette</span>
                    <span className="text-[10px] text-muted-foreground/30">{colorItems.length}</span>
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
                    {colorItems.map((item: any) => (
                      <div key={item.id} className="relative group">
                        <ColorSwatch hex={item.colorHex || item.text || "#888"} />
                        <button onClick={() => deleteMut.mutate({ id: item.id })} className="absolute top-1 right-1 h-5 w-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background:"rgba(0,0,0,0.8)" }}>
                          <X style={{ width:8, height:8, color:"white" }} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Image section */}
              {imageItems.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-px flex-1" style={{ background:"linear-gradient(90deg,rgba(96,165,250,0.3),transparent)" }} />
                    <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color:"#60a5fa" }}>Visual References</span>
                    <span className="text-[10px] text-muted-foreground/30">{imageItems.length}</span>
                  </div>
                  <div className="columns-2 sm:columns-3 lg:columns-4 gap-3 space-y-3">
                    {imageItems.map((item: any) => (
                      <div key={item.id} className="break-inside-avoid">
                        <ImageCard item={item} onDelete={() => deleteMut.mutate({ id: item.id })} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Text / notes section */}
              {textItems.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-px flex-1" style={{ background:"linear-gradient(90deg,rgba(148,163,184,0.3),transparent)" }} />
                    <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color:"rgba(148,163,184,0.7)" }}>Notes & References</span>
                    <span className="text-[10px] text-muted-foreground/30">{textItems.length}</span>
                  </div>
                  <div className="columns-1 sm:columns-2 lg:columns-3 gap-3 space-y-3">
                    {textItems.map((item: any) => (
                      <div key={item.id} className="break-inside-avoid">
                        <TextCard item={item} onDelete={() => deleteMut.mutate({ id: item.id })} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Add item slide-in panel */}
        {showAdd && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background:"rgba(0,0,0,0.8)", backdropFilter:"blur(8px)" }}>
            <div className="w-full max-w-md rounded-2xl border overflow-hidden" style={{ borderColor:"rgba(255,255,255,0.1)", background:"#0c0b18" }}>
              {/* Panel header */}
              <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor:"rgba(255,255,255,0.07)" }}>
                <span className="font-semibold text-sm">Add to Mood Board</span>
                <button onClick={() => setShowAdd(false)} className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors" style={{ background:"rgba(255,255,255,0.05)" }}>
                  <X style={{ width:14, height:14 }} />
                </button>
              </div>
              {/* Type selector */}
              <div className="px-5 pt-4 pb-0 grid grid-cols-4 gap-1.5">
                {([["text","Note",Type],["color","Color",Palette],["image","AI Image",Image],["reference","Reference",Sparkles]] as [string,string,any][]).map(([val,lbl,Icon]) => (
                  <button key={val} onClick={() => setItemType(val as any)}
                    className="flex flex-col items-center gap-1 py-2 rounded-xl border text-[10px] font-medium transition-all"
                    style={{ borderColor: itemType===val ? "rgba(212,175,55,0.4)" : "rgba(255,255,255,0.07)", background: itemType===val ? "rgba(212,175,55,0.08)" : "rgba(255,255,255,0.02)", color: itemType===val ? GOLD : "rgba(255,255,255,0.4)" }}>
                    <Icon style={{ width:16, height:16 }} />{lbl}
                  </button>
                ))}
              </div>
              {/* Form body */}
              <div className="px-5 py-4 space-y-3">
                {itemType === "text" && (
                  <>
                    <Textarea value={text} onChange={e => setText(e.target.value)} placeholder="Style notes, visual direction, typography ideas…" rows={4} className="text-xs bg-black/30 border-border/40 resize-none" autoCapitalize="sentences" />
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="h-8 text-xs bg-black/30 border-border/40"><SelectValue /></SelectTrigger>
                      <SelectContent>{CATEGORIES.filter(c=>c!=="All").map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                    <Button className="w-full h-8 text-xs gap-1.5" onClick={() => createMut.mutate({ projectId, type:"text", text, category })} disabled={!text||createMut.isPending} style={{ background:"linear-gradient(135deg,#D4AF37,#b8960c)", color:"#000" }}>
                      {createMut.isPending&&<Loader2 className="h-3 w-3 animate-spin text-amber-400" />} Add Note
                    </Button>
                  </>
                )}
                {itemType === "color" && (
                  <div className="flex flex-col items-center gap-4 py-2">
                    <div className="h-24 w-24 rounded-2xl border-2 border-white/10" style={{ background:color }} />
                    <div className="flex items-center gap-2">
                      <input type="color" value={color} onChange={e => setColor(e.target.value)} className="h-8 w-14 rounded cursor-pointer bg-transparent border-0" />
                      <Input value={color} onChange={e => setColor(e.target.value)} className="h-8 text-xs font-mono w-28 bg-black/30 border-border/40" placeholder="#c8a97e" />
                    </div>
                    <Button className="w-full h-8 text-xs gap-1.5" onClick={() => createMut.mutate({ projectId, type:"color", colorHex:color, text:color, category:"Colors" })} disabled={createMut.isPending} style={{ background:"linear-gradient(135deg,#D4AF37,#b8960c)", color:"#000" }}>
                      {createMut.isPending&&<Loader2 className="h-3 w-3 animate-spin text-amber-400" />} Add Color
                    </Button>
                  </div>
                )}
                {itemType === "image" && (
                  <>
                    <Textarea value={imagePrompt} onChange={e => setImagePrompt(e.target.value)} placeholder="Describe the visual reference… e.g. 'Golden hour on a Brooklyn rooftop, cinematic wide shot'" rows={3} className="text-xs bg-black/30 border-border/40 resize-none" autoCapitalize="sentences" />
                    <Button className="w-full h-8 text-xs gap-1.5" onClick={() => genImageMut.mutate({ prompt:imagePrompt, projectId })} disabled={!imagePrompt||genImageMut.isPending||createMut.isPending} style={{ background:"linear-gradient(135deg,#D4AF37,#b8960c)", color:"#000" }}>
                      {(genImageMut.isPending||createMut.isPending)?<Loader2 className="h-3 w-3 animate-spin text-amber-400" />:<Sparkles className="h-3 w-3" />} Generate Image
                    </Button>
                  </>
                )}
                {itemType === "reference" && (
                  <>
                    <Input value={text} onChange={e => setText(e.target.value)} placeholder="Film title, director, scene reference…" className="h-8 text-xs bg-black/30 border-border/40" />
                    <Textarea value={imagePrompt} onChange={e => setImagePrompt(e.target.value)} placeholder="What visual element inspires you about this reference?" rows={3} className="text-xs bg-black/30 border-border/40 resize-none" autoCapitalize="sentences" />
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="h-8 text-xs bg-black/30 border-border/40"><SelectValue /></SelectTrigger>
                      <SelectContent>{CATEGORIES.filter(c=>c!=="All").map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                    <Button className="w-full h-8 text-xs gap-1.5" onClick={() => createMut.mutate({ projectId, type:"reference", text:`${text}: ${imagePrompt}`, category })} disabled={!text||createMut.isPending} style={{ background:"linear-gradient(135deg,#D4AF37,#b8960c)", color:"#000" }}>
                      {createMut.isPending&&<Loader2 className="h-3 w-3 animate-spin text-amber-400" />} Add Reference
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        <NextStageCTA projectId={projectId} currentStage={3} />
      </div>
    );
  }
  