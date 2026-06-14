import { useState } from "react";
  import { Button } from "@/components/ui/button";
  import { Badge } from "@/components/ui/badge";
  import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
  import { Textarea } from "@/components/ui/textarea";
  import {
    ArrowLeft, MapPin, Wand2, Download, Crown, Loader2,
    CheckCircle2, Star, Clock, DollarSign, Search, X, Image
  } from "lucide-react";
  import { useLocation } from "wouter";
  import { trpc } from "@/lib/trpc";
  import { toast } from "sonner";

  const CREDIT_COST = 15;

  type GeneratedLocation = {
    imageUrl: string;
    description: string;
    id: string;
  };

  export default function LocationStudio() {
    const [, setLocation] = useLocation();
    const [description, setDescription] = useState("");
    const [generated, setGenerated] = useState<GeneratedLocation[]>([]);
    const [activeImage, setActiveImage] = useState<GeneratedLocation | null>(null);

    const { data: curated = [], isLoading: loadingCurated } = trpc.locationStudio.listLocations.useQuery();

    const generate = trpc.locationStudio.generateLocation.useMutation({
      onSuccess(data) {
        const entry: GeneratedLocation = {
          imageUrl: data.imageUrl,
          description: data.description,
          id: Date.now().toString(),
        };
        setGenerated(prev => [entry, ...prev]);
        setActiveImage(entry);
        toast.success("Location generated!", {
          description: `${CREDIT_COST} credits used · Based on your exact description`,
        });
      },
      onError(err) {
        toast.error(err.message || "Generation failed. Please try again.");
      },
    });

    const handleGenerate = () => {
      if (!description.trim()) return;
      generate.mutate({ description: description.trim() });
    };

    return (
      <div className="min-h-screen text-white pb-24" style={{ background: "linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)" }}>
        {/* Header */}
        <div className="border-b border-amber-500/20 bg-black/60 backdrop-blur-xl sticky top-0 z-30">
          <div className="max-w-6xl mx-auto px-4 h-16 flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/")} className="text-white/60 hover:text-white shrink-0">
              <ArrowLeft className="w-5 h-5 text-amber-400/70" />
            </Button>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-gradient-to-br from-amber-500 to-amber-700 rounded-lg flex items-center justify-center shadow-lg shadow-amber-500/30">
                <MapPin className="w-5 h-5 text-black" />
              </div>
              <div>
                <h1 className="text-lg font-black tracking-tight uppercase italic gradient-text-gold">Location Studio</h1>
                <p className="text-[10px] text-white/40 uppercase tracking-widest">AI Scene Generation · Location Scouting</p>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <Badge variant="outline" className="border-amber-500/30 text-amber-500 bg-amber-500/5 hidden sm:flex">
                <Crown className="w-3 h-3 mr-1.5" /> Pro
              </Badge>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-8">
          <Tabs defaultValue="generate">
            <TabsList className="bg-black/40 border border-amber-500/20 mb-8 p-1 rounded-xl">
              <TabsTrigger value="generate" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black font-bold rounded-lg px-5 flex items-center gap-2">
                <Wand2 className="w-4 h-4" /> Generate Location
              </TabsTrigger>
              <TabsTrigger value="browse" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black font-bold rounded-lg px-5 flex items-center gap-2">
                <Search className="w-4 h-4" /> Browse Locations
              </TabsTrigger>
              {generated.length > 0 && (
                <TabsTrigger value="library" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black font-bold rounded-lg px-5 flex items-center gap-2">
                  <Image className="w-4 h-4" /> My Generations ({generated.length})
                </TabsTrigger>
              )}
            </TabsList>

            {/* ── GENERATE TAB ── */}
            <TabsContent value="generate">
              <div className="grid lg:grid-cols-2 gap-8">
                {/* Input panel */}
                <div className="space-y-5">
                  <div>
                    <h2 className="text-xl font-black text-white mb-1">Describe your scene location</h2>
                    <p className="text-sm text-white/50">Write exactly what you want — the AI generates based on your words only, nothing is added or changed.</p>
                  </div>

                  {/* The main input */}
                  <div className="relative">
                    <Textarea
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder={"Example: a Paris street with the Eiffel Tower in the background, nice sunny day, around midday, not too crowded but not completely empty"}
                      className="min-h-[180px] bg-white/5 border-amber-500/30 text-white placeholder:text-white/25 text-sm leading-relaxed resize-none focus:border-amber-500 rounded-xl p-4"
                      maxLength={1000}
                      disabled={generate.isPending}
                    />
                    {description && (
                      <button onClick={() => setDescription("")} className="absolute top-3 right-3 text-white/30 hover:text-white/60">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                    <p className="text-[10px] text-white/25 text-right mt-1">{description.length}/1000</p>
                  </div>

                  {/* Credit cost notice */}
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                      <Star className="w-4 h-4 text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-amber-400">{CREDIT_COST} credits per generation</p>
                      <p className="text-[10px] text-white/40">AI generates exactly what you describe · High-resolution cinematic output</p>
                    </div>
                  </div>

                  <Button
                    onClick={handleGenerate}
                    disabled={!description.trim() || generate.isPending}
                    className="w-full h-12 font-black text-base bg-amber-500 hover:bg-amber-400 text-black disabled:opacity-40 rounded-xl"
                  >
                    {generate.isPending
                      ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Generating your location…</>
                      : <><Wand2 className="w-5 h-5 mr-2" />Generate Location ({CREDIT_COST} credits)</>
                    }
                  </Button>

                  {/* Quick examples */}
                  <div>
                    <p className="text-[10px] text-white/30 uppercase tracking-widest mb-2">Quick examples</p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        "a Paris street with the Eiffel Tower in the background, nice sunny day, around midday, not too crowded but not completely empty",
                        "an abandoned warehouse in Detroit at night, rain outside, single flickering light bulb, moody and dark",
                        "a crowded Tokyo crossing at rush hour, neon signs everywhere, slight rain, dusk",
                        "a remote Scottish highland village in winter, snow on the ground, overcast sky, no people visible",
                      ].map(ex => (
                        <button key={ex}
                          onClick={() => setDescription(ex)}
                          className="text-[11px] text-amber-400/60 hover:text-amber-400 border border-amber-500/10 hover:border-amber-500/30 px-3 py-1.5 rounded-lg bg-white/[0.02] transition-all text-left">
                          {ex.slice(0, 55)}…
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Result panel */}
                <div className="flex flex-col">
                  {activeImage ? (
                    <div className="space-y-3">
                      <div className="rounded-xl overflow-hidden border border-amber-500/20 aspect-video bg-black">
                        <img src={activeImage.imageUrl} alt={activeImage.description}
                          className="w-full h-full object-cover" />
                      </div>
                      <div className="p-3 rounded-xl bg-white/[0.03] border border-amber-500/10">
                        <p className="text-xs text-white/50 leading-relaxed italic">"{activeImage.description}"</p>
                      </div>
                      <div className="flex gap-2">
                        <a href={activeImage.imageUrl} download target="_blank" rel="noopener noreferrer" className="flex-1">
                          <Button className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold">
                            <Download className="w-4 h-4 mr-2" /> Download
                          </Button>
                        </a>
                        <Button variant="outline" className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                          onClick={() => { setDescription(activeImage.description); setActiveImage(null); }}>
                          Edit prompt
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 rounded-xl border border-amber-500/10 border-dashed bg-white/[0.01] flex flex-col items-center justify-center gap-3 min-h-[300px]">
                      {generate.isPending ? (
                        <>
                          <Loader2 className="w-10 h-10 text-amber-400/60 animate-spin" />
                          <p className="text-sm text-white/40">Generating your location…</p>
                          <p className="text-xs text-white/25 max-w-xs text-center italic">"{description.slice(0,80)}{description.length > 80 ? '…' : ''}"</p>
                        </>
                      ) : (
                        <>
                          <MapPin className="w-10 h-10 text-amber-500/20" />
                          <p className="text-sm text-white/30">Your generated location will appear here</p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* ── BROWSE TAB ── */}
            <TabsContent value="browse">
              {loadingCurated ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {curated.map((loc: any) => (
                    <div key={loc.id} className="rounded-xl border border-amber-500/10 bg-white/[0.02] overflow-hidden hover:border-amber-500/30 transition-all group">
                      <div className="aspect-video bg-gradient-to-br from-amber-900/20 to-black flex items-center justify-center">
                        <MapPin className="w-8 h-8 text-amber-500/30" />
                      </div>
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="font-black text-sm text-white">{loc.name}</h3>
                          {loc.featured && <Badge className="bg-amber-500 text-black text-[9px] border-none px-1.5 shrink-0">★</Badge>}
                        </div>
                        <p className="text-xs text-amber-400/70 mb-1">{loc.country} · {loc.type}</p>
                        <p className="text-xs text-white/40 leading-relaxed mb-3">{loc.description}</p>
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="border-amber-500/20 text-amber-400/60 text-[10px]">{loc.mood}</Badge>
                          <div className="flex items-center gap-1 text-xs text-white/30">
                            <DollarSign className="w-3 h-3" />{loc.dailyRateUsd.toLocaleString()}/day
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-3">
                          {loc.tags.slice(0,3).map((t: string) => (
                            <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-white/30">{t}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ── MY GENERATIONS TAB ── */}
            <TabsContent value="library">
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {generated.map(g => (
                  <div key={g.id} className="rounded-xl border border-amber-500/10 bg-white/[0.02] overflow-hidden hover:border-amber-500/30 transition-all cursor-pointer"
                    onClick={() => { setActiveImage(g); }}>
                    <div className="aspect-video bg-black overflow-hidden">
                      <img src={g.imageUrl} alt={g.description} className="w-full h-full object-cover" />
                    </div>
                    <div className="p-4">
                      <p className="text-xs text-white/50 leading-relaxed italic line-clamp-2">"{g.description}"</p>
                      <div className="flex gap-2 mt-3">
                        <a href={g.imageUrl} download target="_blank" rel="noopener noreferrer" className="flex-1" onClick={e => e.stopPropagation()}>
                          <Button size="sm" className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs h-8">
                            <Download className="w-3 h-3 mr-1.5" /> Download
                          </Button>
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    );
  }
  