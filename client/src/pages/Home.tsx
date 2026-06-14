import { useAuth } from "@/_core/hooks/useAuth";
  import { useState, useEffect } from "react";
  import { trpc } from "@/lib/trpc";
  import OnboardingOverlay, { useOnboardingChecklist } from "@/components/OnboardingOverlay";
  import WhatsNewPanel from "@/components/WhatsNewPanel";
  import SiteHead from "@/components/SiteHead";
  import StudioOpener from "@/components/StudioOpener";
  import { Button } from "@/components/ui/button";
  import { Card, CardContent } from "@/components/ui/card";
  import { Skeleton } from "@/components/ui/skeleton";
  import { Badge } from "@/components/ui/badge";
  import {
    Film, Plus, Zap, Users, ArrowRight, Clock, CheckCircle2, Loader2, Key,
    Clapperboard, BookOpen, Sparkles, ChevronRight, Trash2, Play, Square,
    PlayCircle, Layers, Download, Mic2, DollarSign, FileText, LayoutGrid,
    List, Palette, MapPin, ClipboardList, Wand2, Star, MessageSquare, Eye,
    Scissors, Music, AlignCenter, Share2, Newspaper, BarChart, Tv, Globe,
    Trophy, ChevronDown, ChevronUp, Image, Shirt, FileSearch, Captions,
  } from "lucide-react";
  import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
  import { useLocation, Link } from "wouter";
  import { toast } from "sonner";
  import { JOURNEY_STAGES } from "@/lib/journeyStages";

  function GettingStartedChecklist({ onShowGuide }: { onShowGuide: () => void }) {
    const { allDone: isDone } = useOnboardingChecklist();
    if (isDone) return null;
    return (
      <div className="rounded-xl border border-primary/20 bg-amber-400/5 px-4 py-3 flex items-center justify-between gap-4 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow gold-glow">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-amber-400/10 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-medium">Getting started checklist</p>
            <p className="text-xs text-muted-foreground">A few steps to set up your studio</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onShowGuide} className="text-xs shrink-0 hover:border-amber-500/50 hover:text-amber-400">View checklist</Button>
      </div>
    );
  }

  function timeAgo(date: string | Date) {
    const now = new Date(); const d = new Date(date);
    const seconds = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60); if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60); if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24); if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  }

  type PhaseTool = {
    label: string;
    description: string;
    icon: React.ElementType;
    path: string | ((id: number) => string);
    needsProject?: boolean;
    badge?: string | null;
  };

  const PRODUCTION_PHASES = [
    {
      id: "development", phase: "01", label: "Development", emoji: "ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ°ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ",
      color: "amber", border: "border-amber-500/25", bg: "bg-amber-400/5", head: "text-amber-400", glow: "rgba(245,196,66,0.08)",
      tools: [
        { label: "New Project", description: "Create your film project", icon: Sparkles, path: "/projects/new" },
        { label: "Script Writer", description: "AI screenplay & story", icon: BookOpen, path: (id: number) => `/projects/${id}/script`, needsProject: true },
        { label: "Script Breakdown", description: "Scene-by-scene analysis", icon: FileText, path: (id: number) => `/projects/${id}/script-breakdown`, needsProject: true },
        { label: "Script Coverage", description: "AI development notes", icon: FileSearch, path: (id: number) => `/projects/${id}/script-coverage`, needsProject: true, badge: "AI" },
      ] as PhaseTool[],
    },
    {
      id: "preproduction", phase: "02", label: "Pre-Production", emoji: "ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ°ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¬",
      color: "blue", border: "border-blue-500/25", bg: "bg-blue-500/5", head: "text-blue-400", glow: "rgba(59,130,246,0.08)",
      tools: [
        { label: "Storyboard", description: "Visual shot planning", icon: LayoutGrid, path: (id: number) => `/projects/${id}/storyboard`, needsProject: true },
        { label: "Shot List", description: "Camera & framing guide", icon: List, path: (id: number) => `/projects/${id}/shot-list`, needsProject: true },
        { label: "Mood Board", description: "Visual reference palette", icon: Palette, path: (id: number) => `/projects/${id}/mood-board`, needsProject: true },
        { label: "Location Scout", description: "Set & location planning", icon: MapPin, path: (id: number) => `/projects/${id}/locations`, needsProject: true },
        { label: "Pre-Production", description: "Production overview", icon: ClipboardList, path: (id: number) => `/projects/${id}/pre-production`, needsProject: true },
        { label: "Budget", description: "Cost estimator", icon: DollarSign, path: (id: number) => `/projects/${id}/budget`, needsProject: true },
      ] as PhaseTool[],
    },
    {
      id: "casting", phase: "03", label: "Casting & Crew", emoji: "ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ°ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ­",
      color: "purple", border: "border-purple-500/25", bg: "bg-purple-500/5", head: "text-purple-400", glow: "rgba(168,85,247,0.08)",
      tools: [
        { label: "Characters", description: "Build your cast roster", icon: Users, path: "/characters" },
        { label: "AI Casting", description: "AI-matched talent", icon: Wand2, path: (id: number) => `/projects/${id}/ai-casting`, needsProject: true, badge: "AI" },
        { label: "Casting Board", description: "Visual casting wall", icon: Clapperboard, path: (id: number) => `/projects/${id}/casting-board`, needsProject: true },
        { label: "Wardrobe", description: "Costumes & styling", icon: Shirt, path: (id: number) => `/projects/${id}/wardrobe`, needsProject: true },
        { label: "Signature Cast", description: "Premium digital talent", icon: Star, path: "/signature-cast", badge: "PRO" },
      ] as PhaseTool[],
    },
    {
      id: "production", phase: "04", label: "Production", emoji: "ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ°ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¥",
      color: "green", border: "border-green-500/25", bg: "bg-green-500/5", head: "text-green-400", glow: "rgba(34,197,94,0.08)",
      tools: [
        { label: "Scene Builder", description: "Build scenes with AI", icon: Layers, path: (id: number) => `/projects/${id}/scenes`, needsProject: true },
        { label: "Multi-Shot", description: "Sequence multiple shots", icon: Film, path: (id: number) => `/projects/${id}/multi-shot`, needsProject: true },
        { label: "Dialogue Editor", description: "Polish script dialogue", icon: MessageSquare, path: (id: number) => `/projects/${id}/dialogue`, needsProject: true },
        { label: "Director's Cut", description: "Director tools", icon: Eye, path: (id: number) => `/projects/${id}/director-cut`, needsProject: true },
        { label: "Feature Timeline", description: "Full film timeline", icon: Clock, path: (id: number) => `/projects/${id}/feature-timeline`, needsProject: true },
        { label: "Cutting Room", description: "Assembly & editing", icon: Scissors, path: (id: number) => `/projects/${id}/cutting-room`, needsProject: true },
      ] as PhaseTool[],
    },
    {
      id: "postproduction", phase: "05", label: "Post-Production", emoji: "ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¨",
      color: "rose", border: "border-rose-500/25", bg: "bg-rose-500/5", head: "text-rose-400", glow: "rgba(244,63,94,0.08)",
      tools: [
        { label: "Visual Effects", description: "VFX & CGI library", icon: Zap, path: (id: number) => `/projects/${id}/visual-effects`, needsProject: true },
        { label: "VFX Suite", description: "Per-shot compositing", icon: Layers, path: (id: number) => `/projects/${id}/vfx-suite`, needsProject: true, badge: "PRO" },
        { label: "Color Grading", description: "Cinematic color science", icon: Palette, path: (id: number) => `/projects/${id}/color-grading`, needsProject: true },
        { label: "Sound Effects", description: "SFX mixing studio", icon: Music, path: (id: number) => `/projects/${id}/sound-effects`, needsProject: true },
        { label: "Music Score", description: "Original score & sync", icon: Mic2, path: (id: number) => `/projects/${id}/music-score`, needsProject: true },
        { label: "Opening Sequence", description: "Crawl ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ· Narrator ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ· Titles", icon: Film, path: (id: number) => `/projects/${id}/opening-sequence`, needsProject: true, badge: "NEW" },
      ] as PhaseTool[],
    },
    {
      id: "finishing", phase: "06", label: "Finishing", emoji: "ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ°ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¯ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¸ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ",
      color: "cyan", border: "border-cyan-500/25", bg: "bg-cyan-500/5", head: "text-cyan-400", glow: "rgba(6,182,212,0.08)",
      tools: [
        { label: "Subtitles & Access.", description: "Subtitles + D/deaf track", icon: Captions, path: (id: number) => `/projects/${id}/subtitles`, needsProject: true },
        { label: "Credits Editor", description: "Opening & closing credits", icon: AlignCenter, path: (id: number) => `/projects/${id}/credits`, needsProject: true },
        { label: "Continuity Check", description: "Scene continuity", icon: CheckCircle2, path: (id: number) => `/projects/${id}/continuity`, needsProject: true },
        { label: "NLE Export", description: "Export to Premiere/DaVinci", icon: Download, path: (id: number) => `/projects/${id}/nle-export`, needsProject: true },
      ] as PhaseTool[],
    },
    {
      id: "marketing", phase: "07", label: "Marketing", emoji: "ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ°ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ£",
      color: "orange", border: "border-orange-500/25", bg: "bg-orange-500/5", head: "text-orange-400", glow: "rgba(249,115,22,0.08)",
      tools: [
        { label: "Trailer Studio", description: "AI trailer generator", icon: PlayCircle, path: (id: number) => `/projects/${id}/trailer-studio`, needsProject: true, badge: "AI" },
        { label: "Social Cuts", description: "Reels ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ· TikTok ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ· YouTube", icon: Share2, path: (id: number) => `/projects/${id}/social-cuts`, needsProject: true },
        { label: "Poster Maker", description: "Key art & poster", icon: Image, path: "/poster-maker" },
        { label: "Press Kit", description: "EPK for media outlets", icon: Newspaper, path: (id: number) => `/projects/${id}/press-kit`, needsProject: true },
        { label: "Pitch Deck", description: "Investor pitch deck", icon: BarChart, path: (id: number) => `/projects/${id}/pitch-deck`, needsProject: true },
        { label: "TV Commercial", description: "30s & 60s spot creator", icon: Tv, path: (id: number) => `/projects/${id}/tv-commercial`, needsProject: true },
      ] as PhaseTool[],
    },
    {
      id: "distribution", phase: "08", label: "Distribution", emoji: "ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ°ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ",
      color: "emerald", border: "border-emerald-500/25", bg: "bg-emerald-500/5", head: "text-emerald-400", glow: "rgba(16,185,129,0.08)",
      tools: [
        { label: "Generate & Export", description: "Render your final film", icon: Download, path: "/movies" },
        { label: "Distribute", description: "Stream & platform deliver", icon: Globe, path: (id: number) => `/projects/${id}/distribute`, needsProject: true },
        { label: "Film Festivals", description: "Festival submissions", icon: Trophy, path: "/festivals" },
        { label: "Crowdfunding", description: "Raise production budget", icon: DollarSign, path: (id: number) => `/projects/${id}/crowdfunding`, needsProject: true },
      ] as PhaseTool[],
    },
  ];

  function PipelinePhase({
    phase, activeProjectId, onNeedsProject,
  }: {
    phase: typeof PRODUCTION_PHASES[0];
    activeProjectId: number | null;
    onNeedsProject: () => void;
  }) {
    const [expanded, setExpanded] = useState(true);
    const [, setLocation] = useLocation();

    const handleTool = (tool: PhaseTool) => {
      if (tool.needsProject && !activeProjectId) { onNeedsProject(); return; }
      const path = typeof tool.path === "function" ? tool.path(activeProjectId!) : tool.path;
      setLocation(path);
    };

    return (
      <div
        className={`rounded-2xl border overflow-hidden transition-all duration-200 ${phase.border}`}
        style={{ background: `linear-gradient(135deg, ${phase.glow} 0%, transparent 60%)` }}
      >
        {/* Phase header */}
        <button
          onClick={() => setExpanded(e => !e)}
          className="w-full flex items-center justify-between px-5 py-4 hover: glass-card/[0.02] transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl leading-none">{phase.emoji}</span>
            <div className="text-left">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold tracking-[0.25em] uppercase ${phase.head} opacity-60`}>
                  PHASE {phase.phase}
                </span>
              </div>
              <div className="text-sm font-semibold mt-0.5">{phase.label}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-muted-foreground">{phase.tools.length} tools</span>
            {expanded
              ? <ChevronUp className={`h-4 w-4 ${phase.head} opacity-50`} />
              : <ChevronDown className={`h-4 w-4 ${phase.head} opacity-50`} />
            }
          </div>
        </button>

        {/* Tools grid */}
        {expanded && (
          <div className="px-4 pb-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-2">
            {phase.tools.map((tool) => {
              const Icon = tool.icon;
              const isDisabled = tool.needsProject && !activeProjectId;
              return (
                <button
                  key={tool.label}
                  onClick={() => handleTool(tool)}
                  className={`group relative flex flex-col items-start gap-2 rounded-xl border p-3 text-left transition-all duration-150 ${
                    isDisabled
                      ? "border-border/30 bg-background/20 opacity-50 cursor-not-allowed"
                      : `${phase.border} ${phase.bg} hover:border-opacity-60 hover:scale-[1.03] hover:shadow-lg cursor-pointer`
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className={`h-7 w-7 rounded-lg ${phase.bg} flex items-center justify-center`}>
                      <Icon className={`h-3.5 w-3.5 ${phase.head}`} />
                    </div>
                    {tool.badge && (
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${
                        tool.badge === "NEW" ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" :
                        tool.badge === "AI" ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" :
                        tool.badge === "PRO" ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" :
                        "bg-muted text-muted-foreground"
                      }`}>{tool.badge}</span>
                    )}
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold leading-tight">{tool.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{tool.description}</p>
                  </div>
                  {!isDisabled && (
                    <ChevronRight className={`h-2.5 w-2.5 ${phase.head} opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-2.5 right-2.5`} />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  export default function Home() {
    const { user } = useAuth();
    const [, setLocation] = useLocation();
    const [showOpener, setShowOpener] = useState(false);
    const [forceOnboarding, setForceOnboarding] = useState(false);
    const [showNeedsProjectAlert, setShowNeedsProjectAlert] = useState(false);
    const [activePipelineProjectId, setActivePipelineProjectId] = useState<number | null>(null);

    useEffect(() => {
      const params = new URLSearchParams(window.location.search);
      if (params.get("opener") === "1") { setShowOpener(true); window.history.replaceState({}, "", "/"); }
      if (params.get("subscription") === "success") { toast.success("ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ°ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¬ Welcome to Virelle Studios! Your membership is now active."); window.history.replaceState({}, "", "/"); }
    }, []);

    const { data: projects, isLoading } = trpc.project.list.useQuery(undefined, { enabled: !showOpener });
    const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
    const utils = trpc.useUtils();
    const deleteMutation = trpc.project.delete.useMutation({
      onSuccess: () => { toast.success("Project deleted"); setDeleteConfirmId(null); utils.project.list.invalidate(); },
      onError: () => toast.error("Failed to delete project"),
    });
    const cancelMutation = trpc.project.cancelGeneration.useMutation({
      onSuccess: () => { toast.success("Generation stopped"); utils.project.list.invalidate(); },
      onError: () => toast.error("Couldn't stop generation"),
    });
    const { data: characters } = trpc.character.list.useQuery(undefined, { enabled: !showOpener });
    const { data: providers } = trpc.settings.getProviders.useQuery(undefined, { enabled: !showOpener });
    const hasApiKey = providers && (providers as any[]).some((p: any) => p.isConfigured);

    const stats = {
      total: projects?.length || 0,
      generating: projects?.filter((p) => p.status === "generating").length || 0,
      completed: projects?.filter((p) => p.status === "completed").length || 0,
      draft: projects?.filter((p) => p.status === "draft").length || 0,
      characters: characters?.length || 0,
    };

    const inProgressProjects = (projects || [])
      .filter((p) => p.status === "draft" || p.status === "generating")
      .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
      .slice(0, 3);

    const recentCompleted = (projects || [])
      .filter((p) => p.status === "completed")
      .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
      .slice(0, 3);

    const activityItems = (projects || [])
      .map((p) => ({
        id: p.id, title: p.title, status: p.status, updatedAt: p.updatedAt || p.createdAt,
        icon: p.status === "completed" ? CheckCircle2 : p.status === "generating" ? Loader2 : Clock,
        action: p.status === "completed" ? "Production completed" : p.status === "generating" ? "Currently generating" : "Updated draft",
      }))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5);

    // Auto-select the most recently updated in-progress project
    useEffect(() => {
      if (inProgressProjects[0] && !activePipelineProjectId) {
        setActivePipelineProjectId(inProgressProjects[0].id);
      }
    }, [inProgressProjects]);

    if (showOpener) return <StudioOpener onComplete={() => setShowOpener(false)} mode="login" skippable />;

    return (
      <div className="max-w-7xl mx-auto space-y-8 pb-12">
        <SiteHead title="Dashboard" description="Your AI film production studio dashboard." />
        <OnboardingOverlay forceShow={forceOnboarding} onClose={() => setForceOnboarding(false)} />

        {/* Studio Status Bar */}
        {user && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" aria-label="Studio status overview">
            <Card style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)"}}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-amber-400/10 flex items-center justify-center shrink-0">
                  <Sparkles className="h-5 w-5 text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Credits</div>
                  <div className="text-lg font-semibold tabular-nums gradient-text-gold">
                    {(user as any).isAdmin || (user as any).creditBalance === -1 ? "Unlimited" : ((user as any).creditBalance ?? 0).toLocaleString()}
                  </div>
                </div>
                {!(user as any).isAdmin && ((user as any).creditBalance ?? 0) < 50 && (
                  <button onClick={() => setLocation("/pricing?tab=topup")} className="text-xs text-amber-400 hover:text-amber-300 underline shrink-0">Top up</button>
                )}
              </CardContent>
            </Card>
            <Card style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)"}}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                  <Loader2 className={`h-5 w-5 text-blue-400 ${stats.generating > 0 ? "animate-spin" : ""}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Active Renders</div>
                  <div className="text-lg font-semibold tabular-nums gradient-text-gold">{stats.generating}{stats.generating > 0 ? <span className="text-xs text-muted-foreground font-normal ml-1">in progress</span> : <span className="text-xs text-muted-foreground font-normal ml-1">idle</span>}</div>
                </div>
              </CardContent>
            </Card>
            <Card style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)"}}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${hasApiKey ? "bg-emerald-500/10" : "bg-zinc-500/10"}`}>
                  <CheckCircle2 className={`h-5 w-5 ${hasApiKey ? "text-emerald-400" : "text-zinc-500"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Studio</div>
                  <div className="text-sm font-semibold capitalize">{(user as any).subscriptionTier || "free"}{hasApiKey ? <span className="text-emerald-400 text-xs font-normal ml-1">ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ ready</span> : <button onClick={() => setLocation("/settings?tab=api-keys")} className="text-amber-400 text-xs font-normal ml-1 underline hover:text-amber-300">add API key</button>}</div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <WhatsNewPanel />

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-gold-shimmer">
              Welcome back{user?.name ? `, ${user.name}` : ""}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">Your AI film production studio ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ let's make something great.</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {user && ["indie","amateur","independent","creator","studio","industry","beta"].includes((user as any).subscriptionTier || "") && (
              <Button variant="outline" onClick={() => setLocation("/funding")} className="gap-2 border-amber-500/40 text-amber-500 hover:bg-amber-400/10 hover:text-amber-400" size="sm">
                <DollarSign className="h-4 w-4" />Funding
              </Button>
            )}
            {user && (user as any).role === "admin" && (
              <Button variant="outline" onClick={() => setLocation("/funding")} className="gap-2 border-amber-500/40 text-amber-500 hover:bg-amber-400/10 hover:text-amber-400" size="sm">
                <DollarSign className="h-4 w-4" />Funding
              </Button>
            )}
            <Button variant="ghost" onClick={() => setForceOnboarding(true)} className="gap-2 text-muted-foreground hover:text-foreground" size="sm">
              <PlayCircle className="h-4 w-4" /><span className="hidden sm:inline">Getting Started</span>
            </Button>
            <a href="https://d2xsxph8kpxj0f.cloudfront.net/310519663524747580/RcWVgE53GVrjFSCRF9TVPg/Virelle_User_Manual_v1.0_f850d2ee.pdf" target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" className="gap-2 text-muted-foreground hover:text-foreground" size="sm">
                <BookOpen className="h-4 w-4" /><span className="hidden sm:inline">User Manual</span>
              </Button>
            </a>
            <Button onClick={() => setLocation("/projects")} className="gap-2" size="sm">
              <Plus className="h-4 w-4" />New Film
            </Button>
          </div>
        </div>

        {/* API Key Banner */}
        {providers !== undefined && !hasApiKey && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-400/10 px-4 py-3.5">
            <div className="h-8 w-8 rounded-lg bg-amber-400/20 flex items-center justify-center shrink-0 mt-0.5">
              <Key className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-amber-700 dark:text-amber-300">Add an API key to unlock video generation</p>
              <p className="text-xs text-gray-700 dark:text-amber-200/70 mt-0.5 leading-relaxed">
                Virelle uses your own AI provider keys (Runway ML, fal.ai, Sora, etc.) ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ you only pay for what you generate.
              </p>
            </div>
            <Button size="sm" variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-400/10 text-xs shrink-0" onClick={() => setLocation("/settings?tab=api-keys")}>
              <Key className="h-3 w-3 mr-1.5" />Add API Key
            </Button>
          </div>
        )}

        {/* Journey progress */}
        {inProgressProjects[0] && (() => {
          const p = inProgressProjects[0] as any;
          const projChars = (characters || []).filter((c: any) => c.projectId === p.id).length;
          let currentStage = 1;
          if (p.status === "completed") currentStage = 8;
          else if (p.status === "generating") currentStage = 6;
          else if (projChars >= 1) currentStage = 3;
          else if ((p.logline ?? "").toString().trim()) currentStage = 2;
          const cur = JOURNEY_STAGES.find((s) => s.number === currentStage)!;
          const next = JOURNEY_STAGES.find((s) => s.number === currentStage + 1) ?? cur;
          return (
            <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/5 to-primary/0 p-4 sm:p-5 space-y-4 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Continue your film</p>
                  <h2 className="text-lg font-semibold truncate mt-0.5 gradient-text-gold">{p.title}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Stage {currentStage} of 8 ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ {cur.title}</p>
                </div>
                <Link href={next.hrefFor(p.id)}><Button className="min-h-[40px] gap-2 whitespace-nowrap">{currentStage === 8 ? "Plan release" : `Continue ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ Stage ${next.number}`}</Button></Link>
              </div>
              <div className="flex items-center gap-1 overflow-x-auto pb-1 -mx-1 px-1">
                {JOURNEY_STAGES.map((s) => {
                  const status: "done" | "active" | "todo" = s.number < currentStage ? "done" : s.number === currentStage ? "active" : "todo";
                  return (
                    <Link key={s.key} href={s.hrefFor(p.id)} className="shrink-0">
                      <div className={`h-9 px-2.5 rounded-lg flex items-center gap-1.5 text-xs font-medium border transition-colors ${
                        status === "done" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                        : status === "active" ? "border-primary/60 bg-amber-500/15 text-amber-400"
                        : "border-border bg-muted/20 text-muted-foreground hover:bg-muted"
                      }`} title={s.blurb}>
                        <span className="font-bold">{s.number}</span>
                        <span className="hidden sm:inline">{s.title}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: "Total Projects", value: stats.total, icon: Film, color: "text-muted-foreground" },
            { label: "In Production", value: stats.generating, icon: Loader2, color: "text-amber-400", spin: stats.generating > 0 },
            { label: "Completed", value: stats.completed, icon: CheckCircle2, color: "text-green-400" },
            { label: "Drafts", value: stats.draft, icon: Clock, color: "text-amber-400" },
            { label: "Characters", value: stats.characters, icon: Users, color: "text-purple-400" },
          ].map((stat) => (
            <Card key={stat.label} style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)"}}>
              <CardContent className="p-4 flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <stat.icon className={`h-3.5 w-3.5 ${stat.color} ${"spin" in stat && stat.spin ? "animate-spin" : ""}`} />
                  <span className="text-xs text-muted-foreground">{stat.label}</span>
                </div>
                {isLoading ? <Skeleton className="h-7 w-10" /> : <span className="stat-number">{stat.value}</span>}
              </CardContent>
            </Card>
          ))}
        </div>

        <GettingStartedChecklist onShowGuide={() => setForceOnboarding(true)} />

        {/* ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ
            FULL PRODUCTION PIPELINE
        ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
            <div>
              <h2 className="text-lg font-semibold tracking-tight gradient-text-gold">Film Production Pipeline</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Every tool in your studio ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ from concept to distribution</p>
            </div>
            <div className="flex items-center gap-3">
              {/* Active project selector */}
              {projects && projects.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground hidden sm:block">Active project:</span>
                  <select
                    value={activePipelineProjectId ?? ""}
                    onChange={e => setActivePipelineProjectId(Number(e.target.value) || null)}
                    className="text-xs border border-border/50 rounded-lg px-2 py-1.5 bg-background text-foreground max-w-[180px] truncate"
                  >
                    <option value="">ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ select project ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </select>
                </div>
              )}
              <Button variant="outline" size="sm" className="text-xs gap-1.5 hover:border-amber-500/50 hover:text-amber-400" onClick={() => setLocation("/projects")}>
                <Zap className="h-3.5 w-3.5 text-amber-400" />Quick Generate
              </Button>
            </div>
          </div>

          {/* Phase grid */}
          <div className="space-y-3">
            {PRODUCTION_PHASES.map(phase => (
              <PipelinePhase
                key={phase.id}
                phase={phase as any}
                activeProjectId={activePipelineProjectId}
                onNeedsProject={() => setShowNeedsProjectAlert(true)}
              />
            ))}
          </div>
        </div>

        {/* Signature Cast Banner */}
        <div
          className="rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-950/30 via-zinc-900/60 to-zinc-900/60 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer hover:border-amber-500/40 transition-colors"
          onClick={() => setLocation("/signature-cast")}
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-500/20 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-white">Virelle Signature Cast</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-400 border border-amber-500/20 font-medium">New</span>
              </div>
              <p className="text-xs text-zinc-400 max-w-lg">Cast premium digital talent directly into your project. Continuity-tuned, screen-tested, and promo-ready.</p>
            </div>
          </div>
          <Button size="sm" className="bg-amber-500 hover:bg-amber-400 text-black font-semibold shrink-0" onClick={(e) => { e.stopPropagation(); setLocation("/talent-search"); }}>
            Browse the Cast <ArrowRight className="ml-2 w-3 h-3" />
          </Button>
        </div>

        {/* Projects + Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold gradient-text-gold">Continue Filming</h2>
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1" onClick={() => setLocation("/projects")}>View all <ArrowRight className="h-3 w-3" /></Button>
            </div>
            {isLoading ? (
              <div className="space-y-3">{[1,2].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>
            ) : inProgressProjects.length === 0 ? (
              <Card className="border-dashed bg-card/40 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20 transition-shadow">
                <CardContent className="p-6 flex flex-col items-center text-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-amber-400/10 flex items-center justify-center">
                    <Clapperboard className="h-6 w-6 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Your first film starts here</p>
                    <p className="text-xs text-muted-foreground mt-1.5 max-w-xs mx-auto leading-relaxed">
                      Name your project, choose a genre, build characters, write scenes ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ Virelle's pipeline guides you from concept to screen.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center gap-2">
                    <Button size="sm" onClick={() => setLocation("/projects/new")} className="gap-1.5" style={{background:"linear-gradient(135deg,#D4AF37,#b8960c)",color:"#000",fontWeight:600}}><Plus className="h-3.5 w-3.5" />Create Your First Film</Button>
                    <Button size="sm" variant="ghost" onClick={() => setLocation("/showcase")} className="gap-1.5 text-muted-foreground"><PlayCircle className="h-3.5 w-3.5" />Watch the Showrunner</Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {inProgressProjects.map((project) => (
                  <Card key={project.id} className="cursor-pointer hover:border-amber-400/40 transition-all hover:shadow-sm bg-card/60 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20" onClick={() => setLocation(`/projects/${project.id}`)}>
                    <CardContent className="p-3 flex items-center gap-3">
                      {(project as any).posterUrl ? (
                        <div className="h-14 w-24 rounded-lg overflow-hidden shrink-0 bg-muted">
                          <img src={(project as any).posterUrl} alt={project.title} className="h-full w-full object-cover" />
                        </div>
                      ) : (
                        <div className="h-14 w-24 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
                          <Film className="h-5 w-5 text-muted-foreground/40" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{project.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{timeAgo(project.updatedAt || project.createdAt)}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {project.status === "generating" && (
                          <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-red-400 border-red-500/30 hover:bg-red-500/10 hover:border-amber-500/50 hover:text-amber-400" onClick={(e) => { e.stopPropagation(); cancelMutation.mutate({ id: project.id }); }}>
                            <Square className="h-3 w-3 mr-1" />Stop
                          </Button>
                        )}
                        <Button size="sm" variant="outline" className="h-7 px-2 text-xs hover:border-amber-500/50 hover:text-amber-400" onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(project.id); }}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Completed films */}
            {recentCompleted.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide gradient-text-gold">Recent Completions</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {recentCompleted.map((p) => (
                    <Card key={p.id} className="cursor-pointer hover:border-primary/30 transition-all bg-card/40 glass-card shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20" onClick={() => setLocation(`/projects/${p.id}`)}>
                      <CardContent className="p-3">
                        {(p as any).posterUrl ? (
                          <div className="h-20 w-full rounded-lg overflow-hidden bg-muted mb-2">
                            <img src={(p as any).posterUrl} alt={p.title} className="h-full w-full object-cover" />
                          </div>
                        ) : (
                          <div className="h-20 rounded-lg bg-muted/40 flex items-center justify-center mb-2">
                            <Play className="h-6 w-6 text-muted-foreground/30" />
                          </div>
                        )}
                        <p className="text-xs font-medium truncate">{p.title}</p>
                        <p className="text-[10px] text-green-400 mt-0.5 flex items-center gap-1"><CheckCircle2 className="h-2.5 w-2.5" />Completed</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Activity Feed */}
          <div>
            <h2 className="text-base font-semibold mb-4 gradient-text-gold">Recent Activity</h2>
            {activityItems.length === 0 ? (
              <p className="text-xs text-muted-foreground">No recent activity</p>
            ) : (
              <div className="space-y-2">
                {activityItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div className="min-h-screen" style={{ background:"linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)" }}>
                    <div key={item.id} className="flex items-start gap-3 py-2.5 px-3 rounded-lg hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => setLocation(`/projects/${item.id}`)}>
                      <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${item.status === "completed" ? "bg-green-500/10" : item.status === "generating" ? "bg-blue-500/10" : "bg-muted"}`}>
                        <Icon className={`h-3.5 w-3.5 ${item.status === "completed" ? "text-green-400" : item.status === "generating" ? "text-blue-400 animate-spin" : "text-muted-foreground"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{item.title}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{item.action} ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ· {timeAgo(item.updatedAt)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Quick links */}
            <div className="mt-6 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Quick Access</p>
              {[
                { label: "My Movies", icon: Play, path: "/movies", color: "text-amber-400" },
                { label: "Characters", icon: Users, path: "/characters", color: "text-purple-400" },
                { label: "Film Festivals", icon: Trophy, path: "/festivals", color: "text-amber-400" },
                { label: "Marketplace", icon: Sparkles, path: "/marketplace", color: "text-rose-400" },
                { label: "Funding Directory", icon: DollarSign, path: "/funding", color: "text-green-400" },
              ].map(item => (
                <button key={item.label} onClick={() => setLocation(item.path)} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-muted/30 transition-colors text-left">
                  <item.icon className={`h-3.5 w-3.5 ${item.color}`} />
                  <span className="text-xs">{item.label}</span>
                  <ChevronRight className="h-3 w-3 text-muted-foreground ml-auto" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Delete confirm */}
        <AlertDialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
          <AlertDialogContent className="glass-dark">
            <AlertDialogHeader>
              <AlertDialogTitle className="gradient-text-gold">Delete project?</AlertDialogTitle>
              <AlertDialogDescription>This will permanently delete the project and all its scenes. This action cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteConfirmId && deleteMutation.mutate({ id: deleteConfirmId })} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Needs project alert */}
        <AlertDialog open={showNeedsProjectAlert} onOpenChange={setShowNeedsProjectAlert}>
          <AlertDialogContent className="glass-dark">
            <AlertDialogHeader>
              <AlertDialogTitle className="gradient-text-gold">Select a project first</AlertDialogTitle>
              <AlertDialogDescription>This tool requires an active project. Select a project from the dropdown in the pipeline header, or create a new one.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => { setShowNeedsProjectAlert(false); setLocation("/projects/new"); }}>Create New Project</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
                    </div>
    );
  }
  