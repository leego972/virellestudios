import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, Zap, Layers, Loader2, BookOpen, Film, Sparkles, Lock } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { useLocation, useSearch } from "wouter";
import { useState } from "react";
import { toast } from "sonner";
import {
  RATING_OPTIONS,
  QUALITY_OPTIONS,
  GENRE_OPTIONS,
  ACT_STRUCTURE_OPTIONS,
  ACT_STRUCTURE_LABELS,
  TONE_OPTIONS,
  TARGET_AUDIENCE_OPTIONS,
  CINEMA_INDUSTRY_OPTIONS,
  CINEMA_INDUSTRY_PROFILES,
} from "@shared/types";

export default function NewProject() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const initialMode = params.get("mode") === "manual" ? "manual" : "quick";

  const { limits, tier } = useSubscription();
  const maxDuration = (limits as any)?.maxDurationMinutes || 180;
  const [mode, setMode] = useState<"quick" | "manual">(initialMode as "quick" | "manual");
  // Basic Info
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [genre, setGenre] = useState("");
  const [cinemaIndustry, setCinemaIndustry] = useState("Hollywood");
  const [rating, setRating] = useState<string>("PG-13");
  const [duration, setDuration] = useState<number>(Math.min(90, maxDuration));
  const [plotSummary, setPlotSummary] = useState("");
  const [resolution, setResolution] = useState("1920x1080");
  const [quality, setQuality] = useState<string>("high");
  // Story & Narrative
  const [mainPlot, setMainPlot] = useState("");
  const [sidePlots, setSidePlots] = useState("");
  const [plotTwists, setPlotTwists] = useState("");
  const [characterArcs, setCharacterArcs] = useState("");
  const [themes, setThemes] = useState("");
  const [setting, setSetting] = useState("");
  const [actStructure, setActStructure] = useState("three-act");
  const [tone, setTone] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [openingScene, setOpeningScene] = useState("");
  const [climax, setClimax] = useState("");
  const [storyResolution, setStoryResolution] = useState("");

  const createMutation = trpc.project.create.useMutation({
    onSuccess: (project) => {
      toast.success("Project created");
      if (mode === "manual") {
        setLocation(`/projects/${project.id}/scenes`);
      } else {
        setLocation(`/projects/${project.id}`);
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Please enter a project title");
      return;
    }
    createMutation.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      mode,
      genre: genre || undefined,
      cinemaIndustry: cinemaIndustry || undefined,
      rating: rating as any,
      duration: duration || undefined,
      plotSummary: plotSummary.trim() || undefined,
      resolution,
      quality: quality as any,
      mainPlot: mainPlot.trim() || undefined,
      sidePlots: sidePlots.trim() || undefined,
      plotTwists: plotTwists.trim() || undefined,
      characterArcs: characterArcs.trim() || undefined,
      themes: themes.trim() || undefined,
      setting: setting.trim() || undefined,
      actStructure: actStructure || undefined,
      tone: tone || undefined,
      targetAudience: targetAudience || undefined,
      openingScene: openingScene.trim() || undefined,
      climax: climax.trim() || undefined,
      storyResolution: storyResolution.trim() || undefined,
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="h-10 w-10 sm:h-8 sm:w-8 p-0"
          onClick={() => setLocation("/projects")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">New Project</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Set up your film production
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Production Mode */}
        <div className="space-y-2">
          <Label className="text-sm">Production Mode</Label>
          <div className="grid grid-cols-2 gap-3">
            <Card
              className={`cursor-pointer transition-colors ${
                mode === "quick"
                  ? "border-primary bg-primary/5"
                  : "bg-card/50 hover:border-muted-foreground/30"
              }`}
              onClick={() => setMode("quick")}
            >
              <CardContent className="p-4 flex items-start gap-3">
                <Zap className={`h-5 w-5 mt-0.5 shrink-0 ${mode === "quick" ? "text-primary" : "text-muted-foreground"}`} />
                <div>
                  <p className="text-sm font-medium">Quick Generate</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    AI creates your entire film from your story details
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card
              className={`cursor-pointer transition-colors ${
                mode === "manual"
                  ? "border-primary bg-primary/5"
                  : "bg-card/50 hover:border-muted-foreground/30"
              }`}
              onClick={() => setMode("manual")}
            >
              <CardContent className="p-4 flex items-start gap-3">
                <Layers className={`h-5 w-5 mt-0.5 shrink-0 ${mode === "manual" ? "text-primary" : "text-muted-foreground"}`} />
                <div>
                  <p className="text-sm font-medium">Scene-by-Scene</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Craft each scene with full creative control
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Quick Generate simplified form — only show when mode is quick */}
        {mode === "quick" && (
          <Card className="bg-card/50 border-primary/20">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-medium">Quick Generate — Just the Essentials</CardTitle>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Fill in a title and describe your film. Our AI Director handles the rest — screenplay, scenes, characters, and cinematography.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="title-quick" className="text-xs text-muted-foreground">
                  Project Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title-quick"
                  placeholder="e.g. The Last Horizon"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="bg-background/50 h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="plotSummary-quick" className="text-xs text-muted-foreground">
                  Describe your film <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="plotSummary-quick"
                  placeholder="e.g. A retired detective is pulled back into a case from 20 years ago when a copycat killer resurfaces in Los Angeles. Noir thriller, gritty and tense, set in 1990s LA."
                  value={plotSummary}
                  onChange={(e) => setPlotSummary(e.target.value)}
                  className="bg-background/50 min-h-[110px] text-sm resize-y"
                />
                <p className="text-[10px] text-muted-foreground/60">Include genre, tone, setting, and key characters for the best results.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Genre</Label>
                  <Select value={genre} onValueChange={setGenre}>
                    <SelectTrigger className="bg-background/50 h-9 text-sm">
                      <SelectValue placeholder="Select genre" />
                    </SelectTrigger>
                    <SelectContent>
                      {GENRE_OPTIONS.map((g) => (
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Rating</Label>
                  <Select value={rating} onValueChange={setRating}>
                    <SelectTrigger className="bg-background/50 h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RATING_OPTIONS.map((r) => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground/40 flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                Want full creative control? Switch to Scene-by-Scene mode above.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Tabbed sections — only show in manual/scene-by-scene mode */}
        {mode === "manual" && <Tabs defaultValue="basics" className="w-full">
          <TabsList className="flex flex-wrap w-full h-auto gap-1">
            <TabsTrigger value="basics" className="gap-1.5">
              <Film className="h-3.5 w-3.5" />
              Basics
            </TabsTrigger>
            <TabsTrigger value="story" className="gap-1.5">
              <BookOpen className="h-3.5 w-3.5" />
              Story & Plot
            </TabsTrigger>
            <TabsTrigger value="narrative" className="gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              Narrative Details
            </TabsTrigger>
          </TabsList>

          {/* ─── Tab 1: Basics ─── */}
          <TabsContent value="basics" className="space-y-4 mt-4">
            <Card className="bg-card/50">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-medium">Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="title" className="text-xs text-muted-foreground">
                    Project Title <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="title"
                    placeholder="e.g. The Last Horizon"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="bg-background/50 h-9 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="description" className="text-xs text-muted-foreground">
                    Tagline / Logline
                  </Label>
                  <Input
                    id="description"
                    placeholder="A one-sentence hook that captures the essence of your film"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="bg-background/50 h-9 text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Genre</Label>
                    <Select value={genre} onValueChange={setGenre}>
                      <SelectTrigger className="bg-background/50 h-9 text-sm">
                        <SelectValue placeholder="Select genre" />
                      </SelectTrigger>
                      <SelectContent>
                        {GENRE_OPTIONS.map((g) => (
                          <SelectItem key={g} value={g}>{g}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Rating</Label>
                    <Select value={rating} onValueChange={setRating}>
                      <SelectTrigger className="bg-background/50 h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RATING_OPTIONS.map((r) => (
                          <SelectItem key={r} value={r}>{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5 sm:col-span-1 col-span-full">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="duration" className="text-xs text-muted-foreground">
                        Duration
                      </Label>
                      <span className="text-xs font-medium text-foreground">
                        {duration >= 60 ? `${Math.floor(duration / 60)}h ${duration % 60 > 0 ? `${duration % 60}m` : ''}` : `${duration}m`}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Slider
                        value={[duration]}
                        onValueChange={(v) => setDuration(v[0])}
                        min={1}
                        max={maxDuration}
                        step={1}
                        className="flex-1"
                      />
                      <Input
                        id="duration"
                        type="number"
                        min={1}
                        max={maxDuration}
                        value={duration}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          if (!isNaN(val) && val >= 1 && val <= maxDuration) setDuration(val);
                        }}
                        className="bg-background/50 h-9 text-sm w-16 text-center"
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground/60">
                      <span>1 min</span>
                      <span>{maxDuration >= 60 ? `${Math.floor(maxDuration / 60)}h${maxDuration % 60 > 0 ? ` ${maxDuration % 60}m` : ''}` : `${maxDuration}m`}</span>
                    </div>
                    {maxDuration < 180 && (
                      <p className="text-[10px] text-amber-500 flex items-center gap-1 mt-1">
                        <Lock className="h-3 w-3" />
                        Upgrade to unlock up to 3 hours
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Resolution</Label>
                    <Select value={resolution} onValueChange={setResolution}>
                      <SelectTrigger className="bg-background/50 h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1280x720">720p (HD)</SelectItem>
                        <SelectItem value="1920x1080">1080p (Full HD)</SelectItem>
                        <SelectItem value="2560x1440">1440p (2K)</SelectItem>
                        <SelectItem value="3840x2160">2160p (4K)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Quality</Label>
                    <Select value={quality} onValueChange={setQuality}>
                      <SelectTrigger className="bg-background/50 h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {QUALITY_OPTIONS.map((q) => (
                          <SelectItem key={q} value={q}>
                            {q.charAt(0).toUpperCase() + q.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Cinema Industry Selector */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Film className="h-3 w-3" />
                    Cinema Industry
                  </Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {CINEMA_INDUSTRY_OPTIONS.map((opt) => {
                      const profile = CINEMA_INDUSTRY_PROFILES[opt.value];
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setCinemaIndustry(opt.value)}
                          className={`flex flex-col items-start gap-0.5 p-2.5 rounded-lg border text-left transition-all ${
                            cinemaIndustry === opt.value
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border/50 bg-background/30 hover:border-border hover:bg-background/50 text-muted-foreground'
                          }`}
                        >
                          <span className="text-sm font-medium">{profile?.flag ?? ''} {opt.label}</span>
                          {profile && <span className="text-[10px] opacity-70 leading-tight">{profile.primaryLanguages[0]}</span>}
                        </button>
                      );
                    })}
                  </div>
                  {cinemaIndustry && CINEMA_INDUSTRY_PROFILES[cinemaIndustry] && (
                    <p className="text-[10px] text-muted-foreground/60">
                      {CINEMA_INDUSTRY_PROFILES[cinemaIndustry].description}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Tone / Style</Label>
                    <Select value={tone} onValueChange={setTone}>
                      <SelectTrigger className="bg-background/50 h-9 text-sm">
                        <SelectValue placeholder="Select tone" />
                      </SelectTrigger>
                      <SelectContent>
                        {TONE_OPTIONS.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Target Audience</Label>
                    <Select value={targetAudience} onValueChange={setTargetAudience}>
                      <SelectTrigger className="bg-background/50 h-9 text-sm">
                        <SelectValue placeholder="Select audience" />
                      </SelectTrigger>
                      <SelectContent>
                        {TARGET_AUDIENCE_OPTIONS.map((a) => (
                          <SelectItem key={a} value={a}>{a}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="plot" className="text-xs text-muted-foreground">
                    Plot Summary
                  </Label>
                  <Textarea
                    id="plot"
                    placeholder="A high-level summary of your entire film's plot — the who, what, where, when, and why..."
                    value={plotSummary}
                    onChange={(e) => setPlotSummary(e.target.value)}
                    className="bg-background/50 min-h-[120px] text-sm resize-y"
                  />
                  <p className="text-xs text-muted-foreground">
                    {mode === "quick"
                      ? "AI will use all your story details to automatically generate scenes."
                      : "This provides context for AI-assisted scene generation."}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Tab 2: Story & Plot ─── */}
          <TabsContent value="story" className="space-y-4 mt-4">
            <Card className="bg-card/50">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-medium">Main Storyline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="mainPlot" className="text-xs text-muted-foreground">
                    Main Plot
                  </Label>
                  <Textarea
                    id="mainPlot"
                    placeholder="Describe the main storyline in detail. What is the central conflict? Who is the protagonist and what do they want? What stands in their way? How does the story unfold from beginning to end?"
                    value={mainPlot}
                    onChange={(e) => setMainPlot(e.target.value)}
                    className="bg-background/50 min-h-[140px] text-sm resize-y"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="sidePlots" className="text-xs text-muted-foreground">
                    Side Plots / Subplots
                  </Label>
                  <Textarea
                    id="sidePlots"
                    placeholder="Describe any secondary storylines. Romance between supporting characters? A mentor's hidden past? A parallel investigation? Each subplot should complement or contrast the main plot..."
                    value={sidePlots}
                    onChange={(e) => setSidePlots(e.target.value)}
                    className="bg-background/50 min-h-[120px] text-sm resize-y"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="plotTwists" className="text-xs text-muted-foreground">
                    Plot Twists & Surprises
                  </Label>
                  <Textarea
                    id="plotTwists"
                    placeholder="What are the key twists? Betrayals, revelations, unexpected turns? Describe each twist and when it occurs in the story. These will be carefully handled to maximize impact..."
                    value={plotTwists}
                    onChange={(e) => setPlotTwists(e.target.value)}
                    className="bg-background/50 min-h-[120px] text-sm resize-y"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="characterArcs" className="text-xs text-muted-foreground">
                    Character Arcs & Development
                  </Label>
                  <Textarea
                    id="characterArcs"
                    placeholder="How do your main characters change throughout the film? What lessons do they learn? What flaws do they overcome? Describe the emotional journey for each key character..."
                    value={characterArcs}
                    onChange={(e) => setCharacterArcs(e.target.value)}
                    className="bg-background/50 min-h-[120px] text-sm resize-y"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Tab 3: Narrative Details ─── */}
          <TabsContent value="narrative" className="space-y-4 mt-4">
            <Card className="bg-card/50">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-medium">Narrative Structure</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Act Structure</Label>
                    <Select value={actStructure} onValueChange={setActStructure}>
                      <SelectTrigger className="bg-background/50 h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ACT_STRUCTURE_OPTIONS.map((a) => (
                          <SelectItem key={a} value={a}>
                            {ACT_STRUCTURE_LABELS[a]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="themes" className="text-xs text-muted-foreground">
                      Central Themes
                    </Label>
                    <Input
                      id="themes"
                      placeholder="e.g. Redemption, Love, Betrayal, Identity"
                      value={themes}
                      onChange={(e) => setThemes(e.target.value)}
                      className="bg-background/50 h-9 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="setting" className="text-xs text-muted-foreground">
                    Setting / World-Building
                  </Label>
                  <Textarea
                    id="setting"
                    placeholder="Describe the world of your film. Time period, location, culture, technology level, rules of the universe. Is it set in modern-day New York? A dystopian future? Medieval Europe? The more detail, the more immersive the result..."
                    value={setting}
                    onChange={(e) => setSetting(e.target.value)}
                    className="bg-background/50 min-h-[100px] text-sm resize-y"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-medium">Key Story Moments</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="openingScene" className="text-xs text-muted-foreground">
                    Opening Scene
                  </Label>
                  <Textarea
                    id="openingScene"
                    placeholder="How does the film begin? Describe the opening scene — the first thing the audience sees. Set the tone, introduce the world, hook the viewer..."
                    value={openingScene}
                    onChange={(e) => setOpeningScene(e.target.value)}
                    className="bg-background/50 min-h-[100px] text-sm resize-y"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="climax" className="text-xs text-muted-foreground">
                    Climax
                  </Label>
                  <Textarea
                    id="climax"
                    placeholder="Describe the climactic moment — the peak of tension where the central conflict comes to a head. What happens? Who is involved? What's at stake?"
                    value={climax}
                    onChange={(e) => setClimax(e.target.value)}
                    className="bg-background/50 min-h-[100px] text-sm resize-y"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="storyResolution" className="text-xs text-muted-foreground">
                    Resolution / Ending
                  </Label>
                  <Textarea
                    id="storyResolution"
                    placeholder="How does the story end? Is it a happy ending, bittersweet, tragic, open-ended? Describe the final moments and what the audience is left feeling..."
                    value={storyResolution}
                    onChange={(e) => setStoryResolution(e.target.value)}
                    className="bg-background/50 min-h-[100px] text-sm resize-y"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>}

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/projects")}
          >
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={createMutation.isPending}>
            {createMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                Creating...
              </>
            ) : (
              <>Create Project</>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
