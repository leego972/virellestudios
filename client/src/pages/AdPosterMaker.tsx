import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import {
  Image,
  Wand2,
  Download,
  Palette,
  Type,
  Film,
  Sparkles,
  RotateCcw,
  Eye,
  ChevronLeft,
  Layers,
  RectangleHorizontal,
  Square,
  Smartphone,
  Monitor,
  Megaphone,
  Disc3,
  FileText,
  Loader2,
  Plus,
  X,
  ZoomIn,
  ZoomOut,
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  Undo2,
  Redo2,
  Video,
  Clapperboard,
  Ticket,
  Music,
  SunMedium,
  Contrast,
  Droplets,
  Copy,
  Trash2,
  GripVertical,
  CheckCircle2,
  ExternalLink,
  Share2,
} from "lucide-react";
import { useLocation } from "wouter";
import { useSubscription } from "@/hooks/useSubscription";
import { FeatureGate } from "@/components/UpgradePrompt";

// ─── Types ───────────────────────────────────────────────────────────────────

type TemplateType =
  | "poster" | "social-square" | "social-story" | "banner" | "billboard"
  | "dvd-cover" | "press-kit" | "trailer-card" | "event-flyer" | "album-art"
  | "social-ad" | "letterbox"
  | "ig-feed" | "ig-square" | "ig-story" | "ig-reels"
  | "tiktok-vertical" | "tiktok-thumbnail"
  | "fb-feed" | "fb-story" | "fb-cover"
  | "discord-banner" | "discord-card"
  | "yt-thumbnail" | "yt-shorts" | "yt-channel-art"
  | "withoutabox-poster" | "influencer-kit";

type TextElement = {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  fontWeight: "normal" | "bold";
  fontStyle: "normal" | "italic";
  color: string;
  textAlign: "left" | "center" | "right";
  maxWidth: number;
  opacity: number;
  textTransform: "none" | "uppercase" | "lowercase";
  letterSpacing: number;
  shadowColor?: string;
  shadowBlur?: number;
};

type ImageFilters = {
  brightness: number;
  contrast: number;
  saturation: number;
  blur: number;
  hueRotate: number;
};

type GradientOverlay = {
  enabled: boolean;
  type: "linear" | "radial";
  angle: number;
  colors: { color: string; opacity: number }[];
};

type PosterState = {
  templateType: TemplateType;
  backgroundImageUrl: string | null;
  backgroundColor: string;
  overlayColor: string;
  overlayOpacity: number;
  textElements: TextElement[];
  selectedElementId: string | null;
  filters: ImageFilters;
  gradient: GradientOverlay;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const TEMPLATE_CONFIG: Record<TemplateType, { label: string; icon: React.ElementType; width: number; height: number; description: string; category: string }> = {
  // ─ Film
  "poster":             { label: "Movie Poster",      icon: RectangleHorizontal, width: 675,  height: 1000, description: "Classic 27×40 portrait poster",            category: "Film" },
  "trailer-card":       { label: "Trailer Card",       icon: Clapperboard,        width: 1280, height: 720,  description: "YouTube/Vimeo trailer thumbnail",          category: "Film" },
  "dvd-cover":          { label: "DVD/Blu-ray",        icon: Disc3,               width: 780,  height: 1050, description: "Front cover with spine area",              category: "Film" },
  "letterbox":          { label: "Letterbox",          icon: Film,                width: 1200, height: 500,  description: "Cinematic widescreen banner",              category: "Film" },
  "press-kit":          { label: "Press Kit",          icon: FileText,            width: 900,  height: 1200, description: "Professional media press layout",          category: "Film" },
  "withoutabox-poster": { label: "Festival Poster",    icon: Ticket,              width: 675,  height: 1000, description: "FilmFreeway / WithoutABox submission",     category: "Film" },
  // ─ Instagram
  "ig-feed":            { label: "IG Feed (4:5)",      icon: Square,              width: 1080, height: 1350, description: "Instagram feed post — optimal 4:5 ratio",   category: "Instagram" },
  "ig-square":          { label: "IG Square (1:1)",    icon: Square,              width: 1080, height: 1080, description: "Instagram square post",                   category: "Instagram" },
  "ig-story":           { label: "IG Story",           icon: Smartphone,          width: 1080, height: 1920, description: "Instagram Story — 9:16 vertical",           category: "Instagram" },
  "ig-reels":           { label: "IG Reels Cover",     icon: Smartphone,          width: 1080, height: 1920, description: "Reels cover thumbnail — 9:16",            category: "Instagram" },
  // ─ TikTok
  "tiktok-vertical":    { label: "TikTok Video",       icon: Smartphone,          width: 1080, height: 1920, description: "TikTok video ad — 9:16 vertical",         category: "TikTok" },
  "tiktok-thumbnail":   { label: "TikTok Thumbnail",   icon: Square,              width: 1080, height: 1080, description: "TikTok profile/cover thumbnail",           category: "TikTok" },
  // ─ Facebook
  "fb-feed":            { label: "FB Feed Ad",         icon: Monitor,             width: 1200, height: 628,  description: "Facebook feed image ad — 1.91:1",        category: "Facebook" },
  "fb-story":           { label: "FB Story",           icon: Smartphone,          width: 1080, height: 1920, description: "Facebook Story — 9:16 vertical",          category: "Facebook" },
  "fb-cover":           { label: "FB Page Cover",      icon: Monitor,             width: 1640, height: 624,  description: "Facebook Page cover photo",               category: "Facebook" },
  // ─ Discord
  "discord-banner":     { label: "Discord Banner",     icon: Monitor,             width: 960,  height: 540,  description: "Discord server banner — 16:9",           category: "Discord" },
  "discord-card":       { label: "Discord Card",       icon: Square,              width: 800,  height: 450,  description: "Discord announcement embed card",         category: "Discord" },
  // ─ YouTube
  "yt-thumbnail":       { label: "YT Thumbnail",       icon: Monitor,             width: 1280, height: 720,  description: "YouTube video thumbnail — 16:9",         category: "YouTube" },
  "yt-shorts":          { label: "YT Shorts",          icon: Smartphone,          width: 1080, height: 1920, description: "YouTube Shorts — 9:16 vertical",          category: "YouTube" },
  "yt-channel-art":     { label: "YT Channel Art",     icon: Monitor,             width: 2560, height: 1440, description: "YouTube channel banner art",               category: "YouTube" },
  // ─ Marketing
  "social-square":      { label: "Social Square",      icon: Square,              width: 800,  height: 800,  description: "Generic square social post",              category: "Marketing" },
  "social-story":       { label: "Social Story",       icon: Smartphone,          width: 540,  height: 960,  description: "Generic story format",                   category: "Marketing" },
  "social-ad":          { label: "Social Ad",          icon: Megaphone,           width: 1080, height: 1080, description: "High-res social media ad",                category: "Marketing" },
  "banner":             { label: "Banner",             icon: Monitor,             width: 1280, height: 720,  description: "YouTube thumbnail, website header",       category: "Marketing" },
  "billboard":          { label: "Billboard",          icon: Megaphone,           width: 1200, height: 400,  description: "Ultra-wide outdoor advertising",          category: "Marketing" },
  "event-flyer":        { label: "Event Flyer",        icon: Ticket,              width: 600,  height: 900,  description: "Premiere, screening, festival",           category: "Marketing" },
  "influencer-kit":     { label: "Influencer Kit",     icon: Sparkles,            width: 1080, height: 1080, description: "Influencer outreach square card",         category: "Marketing" },
  // ─ Other
  "album-art":          { label: "Soundtrack Art",     icon: Music,               width: 800,  height: 800,  description: "Soundtrack or score album cover",         category: "Other" },
};

const FONT_FAMILIES = [
  "Inter", "Georgia", "Courier New", "Impact", "Arial Black",
  "Trebuchet MS", "Palatino", "Garamond", "Verdana", "Tahoma",
  "Times New Roman", "Lucida Console",
];

const COLOR_PRESETS = [
  { name: "Classic Black",  bg: "#000000", overlay: "rgba(0,0,0,0.6)",       text: "#ffffff" },
  { name: "Midnight Blue",  bg: "#0a1628", overlay: "rgba(10,22,40,0.7)",    text: "#e0e8f0" },
  { name: "Crimson Dark",   bg: "#1a0000", overlay: "rgba(139,0,0,0.5)",     text: "#ff4444" },
  { name: "Golden Hour",    bg: "#1a1000", overlay: "rgba(180,120,0,0.4)",   text: "#ffd700" },
  { name: "Emerald Night",  bg: "#001a0a", overlay: "rgba(0,100,50,0.5)",    text: "#00ff88" },
  { name: "Royal Purple",   bg: "#0f001a", overlay: "rgba(80,0,120,0.5)",    text: "#bb88ff" },
  { name: "Arctic White",   bg: "#f0f4f8", overlay: "rgba(255,255,255,0.7)", text: "#111827" },
  { name: "Sunset",         bg: "#1a0a00", overlay: "rgba(200,80,0,0.4)",    text: "#ff8844" },
  { name: "Neon Cyan",      bg: "#001a1a", overlay: "rgba(0,80,80,0.4)",     text: "#00ffff" },
  { name: "Rose Gold",      bg: "#1a0f0f", overlay: "rgba(180,100,80,0.3)",  text: "#f4a6a0" },
];

const GENRE_PRESETS: Record<string, { bg: string; overlay: string; text: string; gradient: GradientOverlay; description: string }> = {
  "Horror": {
    bg: "#0a0000", overlay: "rgba(80,0,0,0.6)", text: "#cc0000",
    gradient: { enabled: true, type: "radial", angle: 0, colors: [{ color: "#000000", opacity: 0 }, { color: "#330000", opacity: 0.8 }] },
    description: "Dark red, menacing atmosphere",
  },
  "Sci-Fi": {
    bg: "#000a1a", overlay: "rgba(0,40,100,0.5)", text: "#00ccff",
    gradient: { enabled: true, type: "linear", angle: 180, colors: [{ color: "#000022", opacity: 0.3 }, { color: "#001144", opacity: 0.8 }] },
    description: "Cool blue, futuristic feel",
  },
  "Romance": {
    bg: "#1a0010", overlay: "rgba(120,20,60,0.4)", text: "#ff6699",
    gradient: { enabled: true, type: "radial", angle: 0, colors: [{ color: "#220011", opacity: 0 }, { color: "#110008", opacity: 0.6 }] },
    description: "Warm pink, soft and dreamy",
  },
  "Action": {
    bg: "#0f0800", overlay: "rgba(200,100,0,0.4)", text: "#ff8800",
    gradient: { enabled: true, type: "linear", angle: 135, colors: [{ color: "#1a0a00", opacity: 0.2 }, { color: "#0a0500", opacity: 0.8 }] },
    description: "Orange fire, explosive energy",
  },
  "Thriller": {
    bg: "#0a0a0a", overlay: "rgba(40,40,40,0.6)", text: "#cccccc",
    gradient: { enabled: true, type: "linear", angle: 180, colors: [{ color: "#111111", opacity: 0.3 }, { color: "#000000", opacity: 0.9 }] },
    description: "Monochrome, tense and gritty",
  },
  "Comedy": {
    bg: "#1a1800", overlay: "rgba(200,180,0,0.3)", text: "#ffdd00",
    gradient: { enabled: true, type: "radial", angle: 0, colors: [{ color: "#1a1500", opacity: 0 }, { color: "#0a0800", opacity: 0.5 }] },
    description: "Bright yellow, playful vibe",
  },
  "Drama": {
    bg: "#0a0a10", overlay: "rgba(30,30,60,0.5)", text: "#aabbdd",
    gradient: { enabled: true, type: "linear", angle: 180, colors: [{ color: "#0a0a15", opacity: 0.2 }, { color: "#050510", opacity: 0.7 }] },
    description: "Deep blue-grey, emotional depth",
  },
  "Fantasy": {
    bg: "#0a001a", overlay: "rgba(60,0,120,0.4)", text: "#cc88ff",
    gradient: { enabled: true, type: "radial", angle: 0, colors: [{ color: "#0f0020", opacity: 0 }, { color: "#050010", opacity: 0.7 }] },
    description: "Purple magic, enchanted world",
  },
};

const DEFAULT_FILTERS: ImageFilters = { brightness: 100, contrast: 100, saturation: 100, blur: 0, hueRotate: 0 };
const DEFAULT_GRADIENT: GradientOverlay = { enabled: false, type: "linear", angle: 180, colors: [{ color: "#000000", opacity: 0 }, { color: "#000000", opacity: 0.7 }] };

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

function getDefaultTextElements(templateType: TemplateType): TextElement[] {
  const config = TEMPLATE_CONFIG[templateType];
  const w = config.width;
  const h = config.height;

  const base: TextElement[] = [
    {
      id: generateId(), text: "MOVIE TITLE", x: w / 2, y: h * 0.45,
      fontSize: templateType === "billboard" || templateType === "letterbox" ? 48 : 42,
      fontFamily: "Inter", fontWeight: "bold", fontStyle: "normal", color: "#ffffff",
      textAlign: "center", maxWidth: w * 0.85, opacity: 1, textTransform: "uppercase",
      letterSpacing: 4, shadowColor: "#000000", shadowBlur: 8,
    },
    {
      id: generateId(), text: "A story that will change everything", x: w / 2, y: h * 0.55,
      fontSize: templateType === "billboard" || templateType === "letterbox" ? 20 : 18,
      fontFamily: "Georgia", fontWeight: "normal", fontStyle: "italic", color: "#cccccc",
      textAlign: "center", maxWidth: w * 0.75, opacity: 0.9, textTransform: "none",
      letterSpacing: 1, shadowColor: "#000000", shadowBlur: 4,
    },
  ];

  if (["poster", "dvd-cover", "press-kit", "event-flyer"].includes(templateType)) {
    base.push(
      {
        id: generateId(), text: "COMING SOON", x: w / 2, y: h * 0.88,
        fontSize: 14, fontFamily: "Inter", fontWeight: "bold", fontStyle: "normal",
        color: "#888888", textAlign: "center", maxWidth: w * 0.8, opacity: 0.8,
        textTransform: "uppercase", letterSpacing: 6, shadowColor: "#000000", shadowBlur: 2,
      },
      {
        id: generateId(), text: "Directed by \u2022 Produced by \u2022 Starring", x: w / 2, y: h * 0.93,
        fontSize: 10, fontFamily: "Inter", fontWeight: "normal", fontStyle: "normal",
        color: "#666666", textAlign: "center", maxWidth: w * 0.9, opacity: 0.7,
        textTransform: "none", letterSpacing: 1, shadowColor: "#000000", shadowBlur: 0,
      }
    );
  }

  if (templateType === "banner" || templateType === "trailer-card") {
    base[0].x = w * 0.35; base[0].y = h * 0.4;
    base[1].x = w * 0.35; base[1].y = h * 0.55;
  }

  if (templateType === "letterbox") {
    base[0].y = h * 0.4; base[1].y = h * 0.6;
  }

  return base;
}

// ─── History Hook ────────────────────────────────────────────────────────────

function useHistory<T>(initial: T) {
  const [history, setHistory] = useState<T[]>([initial]);
  const [index, setIndex] = useState(0);

  const current = history[index];

  const push = useCallback((state: T) => {
    setHistory((h) => {
      const newH = h.slice(0, index + 1);
      newH.push(state);
      if (newH.length > 50) newH.shift(); // cap at 50
      return newH;
    });
    setIndex((i) => Math.min(i + 1, 49));
  }, [index]);

  const undo = useCallback(() => {
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  const redo = useCallback(() => {
    setIndex((i) => Math.min(history.length - 1, i + 1));
  }, [history.length]);

  const canUndo = index > 0;
  const canRedo = index < history.length - 1;

  return { current, push, undo, redo, canUndo, canRedo };
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AdPosterMaker() {
  const [, setLocation] = useLocation();
  const previewRef = useRef<HTMLDivElement>(null);
  const { canUseFeature, tier, isLoading: subLoading } = useSubscription();

  // Project selection
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const { data: projects } = trpc.project.list.useQuery();
  const { data: projectDetail } = trpc.project.get.useQuery(
    { id: selectedProjectId! },
    { enabled: !!selectedProjectId }
  );

  // Poster state with undo/redo
  const {
    current: poster,
    push: pushPoster,
    undo, redo, canUndo, canRedo,
  } = useHistory<PosterState>({
    templateType: "poster",
    backgroundImageUrl: null,
    backgroundColor: "#000000",
    overlayColor: "rgba(0,0,0,0.6)",
    overlayOpacity: 0.6,
    textElements: getDefaultTextElements("poster"),
    selectedElementId: null,
    filters: { ...DEFAULT_FILTERS },
    gradient: { ...DEFAULT_GRADIENT },
  });

  // UI state
  const [activeTab, setActiveTab] = useState("template");
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isGeneratingCopy, setIsGeneratingCopy] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportScale, setExportScale] = useState(2);
  const [zoom, setZoom] = useState(1);
  const [draggingElement, setDraggingElement] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [videoAdUrl, setVideoAdUrl] = useState<string | null>(null);
  const [templateFilter, setTemplateFilter] = useState<string>("All");

  // AI mutations
  const generateImageMutation = trpc.poster.generateImage.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        const next = { ...poster, backgroundImageUrl: data.url };
        pushPoster(next);
        toast.success("Poster artwork generated!");
      }
    },
    onError: (err) => toast.error(`Image generation failed: ${err.message}`),
    onSettled: () => setIsGeneratingImage(false),
  });

  const generateCopyMutation = trpc.poster.generateCopy.useMutation({
    onSuccess: (data) => {
      if (data.title || data.tagline || data.credits) {
        const elements = [...poster.textElements];
        if (data.title && elements[0]) elements[0] = { ...elements[0], text: data.title };
        if (data.tagline && elements[1]) elements[1] = { ...elements[1], text: data.tagline };
        if (data.credits && elements[3]) elements[3] = { ...elements[3], text: data.credits };
        pushPoster({ ...poster, textElements: elements });
        toast.success("Marketing copy generated!");
      }
    },
    onError: (err) => toast.error(`Copy generation failed: ${err.message}`),
    onSettled: () => setIsGeneratingCopy(false),
  });

  const generateVideoMutation = trpc.poster.generateVideoAd.useMutation({
    onSuccess: (data) => {
      if (data.videoUrl) {
        setVideoAdUrl(data.videoUrl);
        toast.success("Video ad generated!");
      }
    },
    onError: (err) => toast.error(`Video generation failed: ${err.message}`),
    onSettled: () => setIsGeneratingVideo(false),
  });

  // Helpers
  const setPoster = useCallback((updater: (prev: PosterState) => PosterState) => {
    pushPoster(updater(poster));
  }, [poster, pushPoster]);

  // Template change
  const handleTemplateChange = (type: TemplateType) => {
    pushPoster({
      ...poster,
      templateType: type,
      textElements: getDefaultTextElements(type),
      selectedElementId: null,
    });
  };

  // Apply project data
  useEffect(() => {
    if (projectDetail) {
      const elements = [...poster.textElements];
      if (elements[0]) elements[0] = { ...elements[0], text: projectDetail.title.toUpperCase() };
      if (projectDetail.plotSummary && elements[1]) {
        const tagline = projectDetail.plotSummary.length > 60
          ? projectDetail.plotSummary.substring(0, 57) + "..."
          : projectDetail.plotSummary;
        elements[1] = { ...elements[1], text: tagline };
      }
      pushPoster({ ...poster, textElements: elements });
    }
  }, [projectDetail]);

  // Text element operations
  const updateTextElement = (id: string, updates: Partial<TextElement>) => {
    pushPoster({
      ...poster,
      textElements: poster.textElements.map((el) => (el.id === id ? { ...el, ...updates } : el)),
    });
  };

  const addTextElement = () => {
    const config = TEMPLATE_CONFIG[poster.templateType];
    const newEl: TextElement = {
      id: generateId(), text: "New Text", x: config.width / 2, y: config.height / 2,
      fontSize: 20, fontFamily: "Inter", fontWeight: "normal", fontStyle: "normal",
      color: "#ffffff", textAlign: "center", maxWidth: config.width * 0.6, opacity: 1,
      textTransform: "none", letterSpacing: 0, shadowColor: "#000000", shadowBlur: 4,
    };
    pushPoster({ ...poster, textElements: [...poster.textElements, newEl], selectedElementId: newEl.id });
  };

  const duplicateTextElement = (id: string) => {
    const el = poster.textElements.find((e) => e.id === id);
    if (!el) return;
    const newEl = { ...el, id: generateId(), y: el.y + 40 };
    pushPoster({ ...poster, textElements: [...poster.textElements, newEl], selectedElementId: newEl.id });
  };

  const removeTextElement = (id: string) => {
    pushPoster({
      ...poster,
      textElements: poster.textElements.filter((el) => el.id !== id),
      selectedElementId: poster.selectedElementId === id ? null : poster.selectedElementId,
    });
  };

  // AI generation
  const handleGenerateImage = () => {
    setIsGeneratingImage(true);
    const title = poster.textElements[0]?.text || "Movie";
    const tagline = poster.textElements[1]?.text || "";
    const genre = projectDetail?.genre || "drama";
    const description = projectDetail?.plotSummary || projectDetail?.description || "";
    const templateLabel = TEMPLATE_CONFIG[poster.templateType].label;
    generateImageMutation.mutate({
      prompt: `Create a cinematic ${templateLabel.toLowerCase()} background image for a ${genre} film called "${title}". ${tagline}. ${description}. Professional movie poster photography, dramatic lighting, high quality, no text or lettering.`,
      templateType: poster.templateType,
    });
  };

  const handleGenerateCopy = () => {
    setIsGeneratingCopy(true);
    const genre = projectDetail?.genre || "drama";
    const description = projectDetail?.plotSummary || projectDetail?.description || "";
    const title = projectDetail?.title || poster.textElements[0]?.text || "";
    generateCopyMutation.mutate({ title, genre, description, templateType: poster.templateType });
  };

  const handleGenerateVideoAd = () => {
    setIsGeneratingVideo(true);
    const title = poster.textElements[0]?.text || "Movie";
    const tagline = poster.textElements[1]?.text || "";
    const genre = projectDetail?.genre || "drama";
    generateVideoMutation.mutate({
      prompt: `Cinematic ${genre} film trailer for "${title}". ${tagline}. Dramatic, professional, high production value.`,
      platform: poster.templateType === "social-story" ? "tiktok" : "youtube",
    });
  };

  // Apply genre preset
  const applyGenrePreset = (genreName: string) => {
    const preset = GENRE_PRESETS[genreName];
    if (!preset) return;
    const elements = poster.textElements.map((el, i) => ({
      ...el,
      color: i === 0 ? preset.text : i === 1 ? preset.text + "cc" : preset.text + "88",
    }));
    pushPoster({
      ...poster,
      backgroundColor: preset.bg,
      overlayColor: preset.overlay,
      gradient: preset.gradient,
      textElements: elements,
    });
    toast.success(`Applied ${genreName} style`);
  };

  // Canvas drag handlers
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const config = TEMPLATE_CONFIG[poster.templateType];
    const scaleX = config.width / rect.width;
    const scaleY = config.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;
    for (let i = poster.textElements.length - 1; i >= 0; i--) {
      const el = poster.textElements[i];
      const halfW = el.maxWidth / 2;
      const halfH = el.fontSize * 2;
      if (mx >= el.x - halfW && mx <= el.x + halfW && my >= el.y - halfH && my <= el.y + halfH) {
        pushPoster({ ...poster, selectedElementId: el.id });
        setDraggingElement(el.id);
        setDragOffset({ x: mx - el.x, y: my - el.y });
        return;
      }
    }
    pushPoster({ ...poster, selectedElementId: null });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!draggingElement) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const config = TEMPLATE_CONFIG[poster.templateType];
    const scaleX = config.width / rect.width;
    const scaleY = config.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;
    updateTextElement(draggingElement, { x: mx - dragOffset.x, y: my - dragOffset.y });
  };

  const handleCanvasMouseUp = () => setDraggingElement(null);

  // Build CSS filter string for background image
  const filterCSS = useMemo(() => {
    const f = poster.filters;
    const parts: string[] = [];
    if (f.brightness !== 100) parts.push(`brightness(${f.brightness}%)`);
    if (f.contrast !== 100) parts.push(`contrast(${f.contrast}%)`);
    if (f.saturation !== 100) parts.push(`saturate(${f.saturation}%)`);
    if (f.blur > 0) parts.push(`blur(${f.blur}px)`);
    if (f.hueRotate > 0) parts.push(`hue-rotate(${f.hueRotate}deg)`);
    return parts.length > 0 ? parts.join(" ") : "none";
  }, [poster.filters]);

  // Build gradient CSS
  const gradientCSS = useMemo(() => {
    const g = poster.gradient;
    if (!g.enabled || g.colors.length < 2) return "none";
    const stops = g.colors.map((c, i) => {
      const pct = (i / (g.colors.length - 1)) * 100;
      const rgba = hexToRgba(c.color, c.opacity);
      return `${rgba} ${pct}%`;
    }).join(", ");
    return g.type === "radial"
      ? `radial-gradient(ellipse at center, ${stops})`
      : `linear-gradient(${g.angle}deg, ${stops})`;
  }, [poster.gradient]);

  // Export
  const handleExport = useCallback(async () => {
    const config = TEMPLATE_CONFIG[poster.templateType];
    const canvas = document.createElement("canvas");
    const w = config.width * exportScale;
    const h = config.height * exportScale;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    const scale = exportScale;

    ctx.fillStyle = poster.backgroundColor;
    ctx.fillRect(0, 0, w, h);

    if (poster.backgroundImageUrl) {
      try {
        const img = new window.Image();
        img.crossOrigin = "anonymous";
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = reject;
          img.src = poster.backgroundImageUrl!;
        });
        const imgRatio = img.width / img.height;
        const canvasRatio = w / h;
        let sw = img.width, sh = img.height, sx = 0, sy = 0;
        if (imgRatio > canvasRatio) { sw = img.height * canvasRatio; sx = (img.width - sw) / 2; }
        else { sh = img.width / canvasRatio; sy = (img.height - sh) / 2; }
        // Apply filters via a temp canvas
        const f = poster.filters;
        ctx.filter = `brightness(${f.brightness}%) contrast(${f.contrast}%) saturate(${f.saturation}%) blur(${f.blur * scale}px) hue-rotate(${f.hueRotate}deg)`;
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
        ctx.filter = "none";
      } catch { /* continue */ }
    }

    // Overlay
    ctx.fillStyle = poster.overlayColor;
    ctx.globalAlpha = poster.overlayOpacity;
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;

    // Gradient overlay
    if (poster.gradient.enabled && poster.gradient.colors.length >= 2) {
      const g = poster.gradient;
      let grad: CanvasGradient;
      if (g.type === "radial") {
        grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) / 2);
      } else {
        const rad = (g.angle * Math.PI) / 180;
        const x1 = w / 2 - Math.cos(rad) * w / 2;
        const y1 = h / 2 - Math.sin(rad) * h / 2;
        const x2 = w / 2 + Math.cos(rad) * w / 2;
        const y2 = h / 2 + Math.sin(rad) * h / 2;
        grad = ctx.createLinearGradient(x1, y1, x2, y2);
      }
      g.colors.forEach((c, i) => {
        const stop = i / (g.colors.length - 1);
        grad.addColorStop(stop, hexToRgba(c.color, c.opacity));
      });
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }

    // Text elements
    for (const el of poster.textElements) {
      ctx.save();
      ctx.globalAlpha = el.opacity;
      if (el.shadowColor && el.shadowBlur) {
        ctx.shadowColor = el.shadowColor;
        ctx.shadowBlur = (el.shadowBlur || 0) * scale;
      }
      ctx.fillStyle = el.color;
      const fontStyle = el.fontStyle === "italic" ? "italic " : "";
      const fontWeight = el.fontWeight === "bold" ? "bold " : "";
      ctx.font = `${fontStyle}${fontWeight}${el.fontSize * scale}px ${el.fontFamily}`;
      ctx.textAlign = el.textAlign;
      ctx.textBaseline = "middle";
      let displayText = el.text;
      if (el.textTransform === "uppercase") displayText = displayText.toUpperCase();
      if (el.textTransform === "lowercase") displayText = displayText.toLowerCase();
      if (el.letterSpacing > 0) ctx.letterSpacing = `${el.letterSpacing * scale}px`;
      const maxW = el.maxWidth * scale;
      const words = displayText.split(" ");
      const lines: string[] = [];
      let currentLine = "";
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        if (ctx.measureText(testLine).width > maxW && currentLine) { lines.push(currentLine); currentLine = word; }
        else currentLine = testLine;
      }
      if (currentLine) lines.push(currentLine);
      const lineHeight = el.fontSize * scale * 1.3;
      const totalHeight = lines.length * lineHeight;
      const startY = el.y * scale - totalHeight / 2 + lineHeight / 2;
      for (let i = 0; i < lines.length; i++) ctx.fillText(lines[i], el.x * scale, startY + i * lineHeight);
      ctx.restore();
    }

    const link = document.createElement("a");
    link.download = `${poster.textElements[0]?.text || "poster"}_${poster.templateType}_${w}x${h}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    toast.success("Poster exported!");
    setShowExportDialog(false);
  }, [poster, exportScale]);

  const selectedElement = poster.textElements.find((el) => el.id === poster.selectedElementId);
  const config = TEMPLATE_CONFIG[poster.templateType];

  // Template categories
  const categories = useMemo(() => {
    const cats = new Set(Object.values(TEMPLATE_CONFIG).map((c) => c.category));
    return ["All", ...Array.from(cats)];
  }, []);

  const filteredTemplates = useMemo(() => {
    return (Object.entries(TEMPLATE_CONFIG) as [TemplateType, typeof TEMPLATE_CONFIG[TemplateType]][]).filter(
      ([, cfg]) => templateFilter === "All" || cfg.category === templateFilter
    );
  }, [templateFilter]);

  if (!canUseFeature("canUseAdPosterMaker")) {
    return (
      <div className="p-4 sm:p-6">
        <FeatureGate feature="Ad & Poster Maker" requiredTier="industry" currentTier={tier} hasAccess={false}>
          <div />
        </FeatureGate>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Button variant="ghost" size="sm" className="gap-1 -ml-2 text-muted-foreground hover:text-foreground" onClick={() => setLocation("/")}>
              <ChevronLeft className="h-4 w-4" /> Dashboard
            </Button>
          </div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-primary" />
            Ad & Poster Maker
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create professional posters, ads, and video content for your films
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Undo/Redo */}
          <div className="flex items-center gap-0.5 mr-1">
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={undo} disabled={!canUndo} title="Undo">
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={redo} disabled={!canRedo} title="Redo">
              <Redo2 className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" className="gap-2" onClick={handleGenerateImage} disabled={isGeneratingImage}>
            {isGeneratingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            <span className="hidden sm:inline">AI Artwork</span>
          </Button>
          <Button variant="outline" className="gap-2" onClick={handleGenerateCopy} disabled={isGeneratingCopy}>
            {isGeneratingCopy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            <span className="hidden sm:inline">AI Copy</span>
          </Button>
          <Button variant="outline" className="gap-2" onClick={handleGenerateVideoAd} disabled={isGeneratingVideo}>
            {isGeneratingVideo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
            <span className="hidden sm:inline">AI Video Ad</span>
          </Button>
          <Button className="gap-2" onClick={() => setShowExportDialog(true)}>
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
        </div>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        {/* Canvas Preview */}
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">{config.label} \u2014 {config.width}\u00d7{config.height}</Badge>
              {selectedProjectId && projectDetail && (
                <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
                  <Film className="h-3 w-3 mr-1" />{projectDetail.title}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))}>
                <ZoomOut className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs text-muted-foreground w-12 text-center">{Math.round(zoom * 100)}%</span>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setZoom((z) => Math.min(2, z + 0.25))}>
                <ZoomIn className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setZoom(1)}>
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Canvas */}
          <div className="border rounded-lg bg-muted/30 overflow-auto flex items-center justify-center p-4" style={{ minHeight: "500px" }}>
            <div
              ref={previewRef}
              className="relative shadow-2xl cursor-crosshair select-none overflow-hidden"
              style={{
                width: config.width * zoom,
                height: config.height * zoom,
                backgroundColor: poster.backgroundColor,
              }}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
            >
              {/* Background image with filters */}
              {poster.backgroundImageUrl && (
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage: `url(${poster.backgroundImageUrl})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    filter: filterCSS,
                  }}
                />
              )}
              {/* Color overlay */}
              <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: poster.overlayColor, opacity: poster.overlayOpacity }} />
              {/* Gradient overlay */}
              {poster.gradient.enabled && (
                <div className="absolute inset-0 pointer-events-none" style={{ background: gradientCSS }} />
              )}
              {/* Text Elements */}
              {poster.textElements.map((el) => {
                const isSelected = el.id === poster.selectedElementId;
                let displayText = el.text;
                if (el.textTransform === "uppercase") displayText = displayText.toUpperCase();
                if (el.textTransform === "lowercase") displayText = displayText.toLowerCase();
                return (
                  <div
                    key={el.id}
                    className={`absolute pointer-events-none ${isSelected ? "ring-2 ring-primary ring-offset-1" : ""}`}
                    style={{
                      left: el.x * zoom, top: el.y * zoom, transform: "translate(-50%, -50%)",
                      maxWidth: el.maxWidth * zoom, fontSize: el.fontSize * zoom,
                      fontFamily: el.fontFamily, fontWeight: el.fontWeight, fontStyle: el.fontStyle,
                      color: el.color, textAlign: el.textAlign, opacity: el.opacity,
                      letterSpacing: el.letterSpacing * zoom, lineHeight: 1.3,
                      whiteSpace: "pre-wrap", wordBreak: "break-word",
                      textShadow: el.shadowBlur ? `0 0 ${(el.shadowBlur || 0) * zoom}px ${el.shadowColor || "#000"}` : undefined,
                    }}
                  >
                    {displayText}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Video Ad Preview */}
          {videoAdUrl && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Video className="h-4 w-4 text-primary" /> Generated Video Ad
                </CardTitle>
              </CardHeader>
              <CardContent>
                <video src={videoAdUrl} controls className="w-full rounded-lg max-h-[300px]" />
                <div className="flex gap-2 mt-2">
                  <Button size="sm" variant="outline" className="gap-1 text-xs" asChild>
                    <a href={videoAdUrl} download target="_blank" rel="noopener noreferrer">
                      <Download className="h-3 w-3" /> Download Video
                    </a>
                  </Button>
                  <Button size="sm" variant="ghost" className="text-xs text-destructive" onClick={() => setVideoAdUrl(null)}>
                    Dismiss
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Controls Panel */}
        <div className="space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full flex flex-wrap h-auto">
              <TabsTrigger value="template" className="flex-1 text-xs gap-1"><Layers className="h-3 w-3" /> Template</TabsTrigger>
              <TabsTrigger value="text" className="flex-1 text-xs gap-1"><Type className="h-3 w-3" /> Text</TabsTrigger>
              <TabsTrigger value="style" className="flex-1 text-xs gap-1"><Palette className="h-3 w-3" /> Style</TabsTrigger>
              <TabsTrigger value="filters" className="flex-1 text-xs gap-1"><SunMedium className="h-3 w-3" /> Filters</TabsTrigger>
              <TabsTrigger value="publish" className="flex-1 text-xs gap-1"><Megaphone className="h-3 w-3" /> Publish</TabsTrigger>
              <TabsTrigger value="festival" className="flex-1 text-xs gap-1"><Ticket className="h-3 w-3" /> Festival</TabsTrigger>
              <TabsTrigger value="influencer" className="flex-1 text-xs gap-1"><Sparkles className="h-3 w-3" /> Influencer</TabsTrigger>
            </TabsList>

            {/* Template Tab */}
            <TabsContent value="template" className="space-y-4 mt-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Link to Project</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Select value={selectedProjectId?.toString() || "none"} onValueChange={(v) => setSelectedProjectId(v === "none" ? null : Number(v))}>
                    <SelectTrigger><SelectValue placeholder="Select a project..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No project</SelectItem>
                      {projects?.map((p) => (<SelectItem key={p.id} value={p.id.toString()}>{p.title}</SelectItem>))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Link a project to auto-fill title, genre, and description</p>
                </CardContent>
              </Card>

              {/* Genre Quick Presets */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Genre Presets</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-1.5">
                    {Object.entries(GENRE_PRESETS).map(([genre, preset]) => (
                      <button
                        key={genre}
                        className="flex items-center gap-2 p-2 rounded-lg border hover:border-primary/30 transition-all text-left"
                        onClick={() => applyGenrePreset(genre)}
                      >
                        <div className="w-5 h-5 rounded-full border shrink-0" style={{ backgroundColor: preset.bg, boxShadow: `inset 0 0 0 2px ${preset.text}60` }} />
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">{genre}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{preset.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Template Types with category filter */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Template Type</CardTitle>
                    <div className="flex gap-1">
                      {categories.map((cat) => (
                        <button
                          key={cat}
                          className={`text-[10px] px-2 py-0.5 rounded-full border transition-all ${templateFilter === cat ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/30"}`}
                          onClick={() => setTemplateFilter(cat)}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-1">
                    {filteredTemplates.map(([type, cfg]) => (
                      <button
                        key={type}
                        className={`flex items-center gap-3 p-2.5 rounded-lg border text-left transition-all ${poster.templateType === type ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border hover:border-primary/30 hover:bg-muted/50"}`}
                        onClick={() => handleTemplateChange(type)}
                      >
                        <cfg.icon className={`h-4 w-4 shrink-0 ${poster.templateType === type ? "text-primary" : "text-muted-foreground"}`} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{cfg.label}</p>
                          <p className="text-xs text-muted-foreground">{cfg.description}</p>
                        </div>
                        <Badge variant="outline" className="text-[10px] shrink-0 ml-auto">{cfg.width}\u00d7{cfg.height}</Badge>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Text Tab */}
            <TabsContent value="text" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Text Layers</h3>
                <Button size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={addTextElement}>
                  <Plus className="h-3 w-3" /> Add Text
                </Button>
              </div>
              <div className="space-y-2">
                {poster.textElements.map((el) => (
                  <button
                    key={el.id}
                    className={`w-full flex items-center gap-2 p-2 rounded-lg border text-left transition-all ${poster.selectedElementId === el.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}
                    onClick={() => pushPoster({ ...poster, selectedElementId: el.id })}
                  >
                    <Type className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-xs truncate flex-1">{el.text}</span>
                    <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={(e) => { e.stopPropagation(); duplicateTextElement(el.id); }}>
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0 text-destructive/60 hover:text-destructive" onClick={(e) => { e.stopPropagation(); removeTextElement(el.id); }}>
                      <X className="h-3 w-3" />
                    </Button>
                  </button>
                ))}
              </div>

              {selectedElement && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Edit Text</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-xs">Content</Label>
                      <Textarea value={selectedElement.text} onChange={(e) => updateTextElement(selectedElement.id, { text: e.target.value })} rows={2} className="text-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Font</Label>
                        <Select value={selectedElement.fontFamily} onValueChange={(v) => updateTextElement(selectedElement.id, { fontFamily: v })}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>{FONT_FAMILIES.map((f) => (<SelectItem key={f} value={f} className="text-xs">{f}</SelectItem>))}</SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Size</Label>
                        <Input type="number" value={selectedElement.fontSize} onChange={(e) => updateTextElement(selectedElement.id, { fontSize: Number(e.target.value) })} className="h-8 text-xs" min={8} max={120} />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Color</Label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={selectedElement.color} onChange={(e) => updateTextElement(selectedElement.id, { color: e.target.value })} className="h-8 w-8 rounded border cursor-pointer" />
                        <Input value={selectedElement.color} onChange={(e) => updateTextElement(selectedElement.id, { color: e.target.value })} className="h-8 text-xs flex-1" />
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-wrap">
                      <Button size="icon" variant={selectedElement.fontWeight === "bold" ? "secondary" : "ghost"} className="h-7 w-7" onClick={() => updateTextElement(selectedElement.id, { fontWeight: selectedElement.fontWeight === "bold" ? "normal" : "bold" })}>
                        <Bold className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant={selectedElement.fontStyle === "italic" ? "secondary" : "ghost"} className="h-7 w-7" onClick={() => updateTextElement(selectedElement.id, { fontStyle: selectedElement.fontStyle === "italic" ? "normal" : "italic" })}>
                        <Italic className="h-3.5 w-3.5" />
                      </Button>
                      <div className="w-px h-5 bg-border mx-1" />
                      <Button size="icon" variant={selectedElement.textAlign === "left" ? "secondary" : "ghost"} className="h-7 w-7" onClick={() => updateTextElement(selectedElement.id, { textAlign: "left" })}>
                        <AlignLeft className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant={selectedElement.textAlign === "center" ? "secondary" : "ghost"} className="h-7 w-7" onClick={() => updateTextElement(selectedElement.id, { textAlign: "center" })}>
                        <AlignCenter className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant={selectedElement.textAlign === "right" ? "secondary" : "ghost"} className="h-7 w-7" onClick={() => updateTextElement(selectedElement.id, { textAlign: "right" })}>
                        <AlignRight className="h-3.5 w-3.5" />
                      </Button>
                      <div className="w-px h-5 bg-border mx-1" />
                      <Select value={selectedElement.textTransform} onValueChange={(v) => updateTextElement(selectedElement.id, { textTransform: v as TextElement["textTransform"] })}>
                        <SelectTrigger className="h-7 text-xs w-20"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none" className="text-xs">Normal</SelectItem>
                          <SelectItem value="uppercase" className="text-xs">UPPER</SelectItem>
                          <SelectItem value="lowercase" className="text-xs">lower</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Letter Spacing: {selectedElement.letterSpacing}px</Label>
                      <Slider value={[selectedElement.letterSpacing]} min={0} max={20} step={0.5} onValueChange={([v]) => updateTextElement(selectedElement.id, { letterSpacing: v })} />
                    </div>
                    <div>
                      <Label className="text-xs">Opacity: {Math.round(selectedElement.opacity * 100)}%</Label>
                      <Slider value={[selectedElement.opacity]} min={0} max={1} step={0.05} onValueChange={([v]) => updateTextElement(selectedElement.id, { opacity: v })} />
                    </div>
                    <div>
                      <Label className="text-xs">Text Shadow</Label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={selectedElement.shadowColor || "#000000"} onChange={(e) => updateTextElement(selectedElement.id, { shadowColor: e.target.value })} className="h-7 w-7 rounded border cursor-pointer" />
                        <div className="flex-1">
                          <Slider value={[selectedElement.shadowBlur || 0]} min={0} max={30} step={1} onValueChange={([v]) => updateTextElement(selectedElement.id, { shadowBlur: v })} />
                        </div>
                        <span className="text-[10px] text-muted-foreground w-8">{selectedElement.shadowBlur || 0}px</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">X Position</Label>
                        <Input type="number" value={Math.round(selectedElement.x)} onChange={(e) => updateTextElement(selectedElement.id, { x: Number(e.target.value) })} className="h-8 text-xs" />
                      </div>
                      <div>
                        <Label className="text-xs">Y Position</Label>
                        <Input type="number" value={Math.round(selectedElement.y)} onChange={(e) => updateTextElement(selectedElement.id, { y: Number(e.target.value) })} className="h-8 text-xs" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Style Tab */}
            <TabsContent value="style" className="space-y-4 mt-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Color Themes</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    {COLOR_PRESETS.map((preset) => (
                      <button
                        key={preset.name}
                        className="flex items-center gap-2 p-2 rounded-lg border hover:border-primary/30 transition-all text-left"
                        onClick={() => {
                          const elements = poster.textElements.map((el, i) => ({
                            ...el, color: i === 0 ? preset.text : i === 1 ? preset.text + "cc" : preset.text + "88",
                          }));
                          pushPoster({ ...poster, backgroundColor: preset.bg, overlayColor: preset.overlay, textElements: elements });
                        }}
                      >
                        <div className="w-6 h-6 rounded-full border shrink-0" style={{ backgroundColor: preset.bg, boxShadow: `inset 0 0 0 2px ${preset.text}40` }} />
                        <span className="text-xs truncate">{preset.name}</span>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Custom Colors</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs">Background Color</Label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={poster.backgroundColor} onChange={(e) => pushPoster({ ...poster, backgroundColor: e.target.value })} className="h-8 w-8 rounded border cursor-pointer" />
                      <Input value={poster.backgroundColor} onChange={(e) => pushPoster({ ...poster, backgroundColor: e.target.value })} className="h-8 text-xs flex-1" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Overlay Opacity: {Math.round(poster.overlayOpacity * 100)}%</Label>
                    <Slider value={[poster.overlayOpacity]} min={0} max={1} step={0.05} onValueChange={([v]) => pushPoster({ ...poster, overlayOpacity: v })} />
                  </div>
                </CardContent>
              </Card>

              {/* Gradient Overlay */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Gradient Overlay</CardTitle>
                    <button
                      className={`text-xs px-2 py-0.5 rounded-full border transition-all ${poster.gradient.enabled ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}
                      onClick={() => pushPoster({ ...poster, gradient: { ...poster.gradient, enabled: !poster.gradient.enabled } })}
                    >
                      {poster.gradient.enabled ? "ON" : "OFF"}
                    </button>
                  </div>
                </CardHeader>
                {poster.gradient.enabled && (
                  <CardContent className="space-y-3">
                    <div className="flex gap-2">
                      <Button size="sm" variant={poster.gradient.type === "linear" ? "secondary" : "outline"} className="flex-1 text-xs" onClick={() => pushPoster({ ...poster, gradient: { ...poster.gradient, type: "linear" } })}>Linear</Button>
                      <Button size="sm" variant={poster.gradient.type === "radial" ? "secondary" : "outline"} className="flex-1 text-xs" onClick={() => pushPoster({ ...poster, gradient: { ...poster.gradient, type: "radial" } })}>Radial</Button>
                    </div>
                    {poster.gradient.type === "linear" && (
                      <div>
                        <Label className="text-xs">Angle: {poster.gradient.angle}\u00b0</Label>
                        <Slider value={[poster.gradient.angle]} min={0} max={360} step={15} onValueChange={([v]) => pushPoster({ ...poster, gradient: { ...poster.gradient, angle: v } })} />
                      </div>
                    )}
                    {poster.gradient.colors.map((c, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input type="color" value={c.color} onChange={(e) => {
                          const colors = [...poster.gradient.colors];
                          colors[i] = { ...colors[i], color: e.target.value };
                          pushPoster({ ...poster, gradient: { ...poster.gradient, colors } });
                        }} className="h-7 w-7 rounded border cursor-pointer" />
                        <div className="flex-1">
                          <Slider value={[c.opacity]} min={0} max={1} step={0.05} onValueChange={([v]) => {
                            const colors = [...poster.gradient.colors];
                            colors[i] = { ...colors[i], opacity: v };
                            pushPoster({ ...poster, gradient: { ...poster.gradient, colors } });
                          }} />
                        </div>
                        <span className="text-[10px] text-muted-foreground w-8">{Math.round(c.opacity * 100)}%</span>
                      </div>
                    ))}
                  </CardContent>
                )}
              </Card>

              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Background Image</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <Label className="text-xs">Image URL</Label>
                    <Input value={poster.backgroundImageUrl || ""} onChange={(e) => pushPoster({ ...poster, backgroundImageUrl: e.target.value || null })} placeholder="Paste image URL or use AI Artwork..." className="text-xs" />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="gap-1 text-xs flex-1" onClick={handleGenerateImage} disabled={isGeneratingImage}>
                      {isGeneratingImage ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />} Generate with AI
                    </Button>
                    {poster.backgroundImageUrl && (
                      <Button size="sm" variant="ghost" className="text-xs text-destructive" onClick={() => pushPoster({ ...poster, backgroundImageUrl: null })}>Remove</Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Filters Tab */}
            <TabsContent value="filters" className="space-y-4 mt-4">
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Image Filters</CardTitle>
                    <Button size="sm" variant="ghost" className="text-xs h-6" onClick={() => pushPoster({ ...poster, filters: { ...DEFAULT_FILTERS } })}>
                      <RotateCcw className="h-3 w-3 mr-1" /> Reset
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-xs flex items-center gap-1"><SunMedium className="h-3 w-3" /> Brightness: {poster.filters.brightness}%</Label>
                    <Slider value={[poster.filters.brightness]} min={0} max={200} step={5} onValueChange={([v]) => pushPoster({ ...poster, filters: { ...poster.filters, brightness: v } })} />
                  </div>
                  <div>
                    <Label className="text-xs flex items-center gap-1"><Contrast className="h-3 w-3" /> Contrast: {poster.filters.contrast}%</Label>
                    <Slider value={[poster.filters.contrast]} min={0} max={200} step={5} onValueChange={([v]) => pushPoster({ ...poster, filters: { ...poster.filters, contrast: v } })} />
                  </div>
                  <div>
                    <Label className="text-xs flex items-center gap-1"><Droplets className="h-3 w-3" /> Saturation: {poster.filters.saturation}%</Label>
                    <Slider value={[poster.filters.saturation]} min={0} max={200} step={5} onValueChange={([v]) => pushPoster({ ...poster, filters: { ...poster.filters, saturation: v } })} />
                  </div>
                  <div>
                    <Label className="text-xs flex items-center gap-1"><Eye className="h-3 w-3" /> Blur: {poster.filters.blur}px</Label>
                    <Slider value={[poster.filters.blur]} min={0} max={20} step={0.5} onValueChange={([v]) => pushPoster({ ...poster, filters: { ...poster.filters, blur: v } })} />
                  </div>
                  <div>
                    <Label className="text-xs flex items-center gap-1"><Palette className="h-3 w-3" /> Hue Rotate: {poster.filters.hueRotate}\u00b0</Label>
                    <Slider value={[poster.filters.hueRotate]} min={0} max={360} step={15} onValueChange={([v]) => pushPoster({ ...poster, filters: { ...poster.filters, hueRotate: v } })} />
                  </div>
                </CardContent>
              </Card>

              {/* Quick filter presets */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Quick Presets</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { name: "Cinematic", filters: { brightness: 90, contrast: 120, saturation: 80, blur: 0, hueRotate: 0 } },
                      { name: "Vintage", filters: { brightness: 95, contrast: 90, saturation: 60, blur: 0, hueRotate: 15 } },
                      { name: "High Contrast", filters: { brightness: 100, contrast: 150, saturation: 110, blur: 0, hueRotate: 0 } },
                      { name: "Desaturated", filters: { brightness: 100, contrast: 110, saturation: 30, blur: 0, hueRotate: 0 } },
                      { name: "Warm Glow", filters: { brightness: 105, contrast: 100, saturation: 120, blur: 0, hueRotate: 340 } },
                      { name: "Cool Tone", filters: { brightness: 95, contrast: 105, saturation: 90, blur: 0, hueRotate: 200 } },
                    ].map((preset) => (
                      <button
                        key={preset.name}
                        className="p-2 rounded-lg border hover:border-primary/30 transition-all text-xs font-medium text-left"
                        onClick={() => pushPoster({ ...poster, filters: preset.filters })}
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Publish Tab */}
            <TabsContent value="publish" className="space-y-4 mt-4">
              <PublishTab currentTemplate={poster.templateType} />
            </TabsContent>

            {/* Festival & Distribution Tab */}
            <TabsContent value="festival" className="space-y-4 mt-4">
              <FestivalTab />
            </TabsContent>

            {/* Influencer Kit Tab */}
            <TabsContent value="influencer" className="space-y-4 mt-4">
              <InfluencerKitTab />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Export Poster</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Export Scale</Label>
              <Select value={exportScale.toString()} onValueChange={(v) => setExportScale(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1x ({config.width}\u00d7{config.height})</SelectItem>
                  <SelectItem value="2">2x ({config.width * 2}\u00d7{config.height * 2}) \u2014 Recommended</SelectItem>
                  <SelectItem value="3">3x ({config.width * 3}\u00d7{config.height * 3}) \u2014 Print Quality</SelectItem>
                  <SelectItem value="4">4x ({config.width * 4}\u00d7{config.height * 4}) \u2014 Ultra HD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-muted-foreground">
              Output: <strong>{config.width * exportScale}\u00d7{config.height * exportScale}px</strong> PNG
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExportDialog(false)}>Cancel</Button>
            <Button className="gap-2" onClick={handleExport}><Download className="h-4 w-4" /> Download PNG</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Publish Tab ─────────────────────────────────────────────────────────────

const PLATFORM_TEMPLATES: Record<string, TemplateType[]> = {
  instagram: ["ig-feed", "ig-square", "ig-story", "ig-reels"],
  tiktok:    ["tiktok-vertical", "tiktok-thumbnail"],
  facebook:  ["fb-feed", "fb-story", "fb-cover"],
  discord:   ["discord-banner", "discord-card"],
  youtube:   ["yt-thumbnail", "yt-shorts", "yt-channel-art"],
};

const PLATFORM_META: Record<string, { name: string; icon: string; color: string; maxFileSizeMB: number; formats: string; notes: string }> = {
  instagram: { name: "Instagram", icon: "📸", color: "border-pink-500/40 bg-pink-500/5",    maxFileSizeMB: 8,   formats: "JPG, PNG", notes: "Max 8 MB. Recommended: 1080px wide. Aspect ratios: 1:1, 4:5, 9:16." },
  tiktok:    { name: "TikTok",    icon: "🎵", color: "border-cyan-500/40 bg-cyan-500/5",    maxFileSizeMB: 20,  formats: "JPG, PNG, MP4", notes: "Max 20 MB for images. Videos: 9:16, up to 60s. Min 720p." },
  facebook:  { name: "Facebook",  icon: "📱", color: "border-blue-500/40 bg-blue-500/5",    maxFileSizeMB: 30,  formats: "JPG, PNG", notes: "Max 30 MB. Feed ads: 1.91:1. Stories: 9:16. Cover: 820×312 min." },
  discord:   { name: "Discord",   icon: "💬", color: "border-indigo-500/40 bg-indigo-500/5", maxFileSizeMB: 8,   formats: "JPG, PNG, GIF", notes: "Max 8 MB. Server banner: 960×540. Embed images: 16:9 preferred." },
  youtube:   { name: "YouTube",   icon: "🎥", color: "border-red-500/40 bg-red-500/5",      maxFileSizeMB: 2,   formats: "JPG, PNG", notes: "Thumbnails: max 2 MB, 1280×720. Channel art: 2560×1440." },
};

function PublishTab({ currentTemplate, posterRef }: { currentTemplate: TemplateType; posterRef?: React.RefObject<HTMLDivElement> }) {
  const { data: connectedList } = trpc.socialCredentials.list.useQuery();
  const uploadMutation = trpc.upload.image.useMutation();
  const publishMutation = trpc.socialCredentials.publish.useMutation({
    onSuccess: (data) => {
      if (data.success) toast.success(`Published to ${data.platform} successfully!`);
      else toast.error(`Publish failed: ${data.error}`);
      setPublishingPlatform(null);
    },
    onError: (e) => { toast.error(e.message); setPublishingPlatform(null); },
  });

  const [publishCaption, setPublishCaption] = useState("");
  const [publishingPlatform, setPublishingPlatform] = useState<string | null>(null);

  const getConnected = (platformId: string) => connectedList?.find((c) => c.platform === platformId && c.hasCredentials && c.isActive);

  const handlePublish = async (platformId: string) => {
    setPublishingPlatform(platformId);
    try {
      // Export the canvas to a PNG data URL, then upload to S3
      const canvas = document.querySelector("canvas") as HTMLCanvasElement | null;
      let mediaUrl: string;
      if (canvas) {
        const dataUrl = canvas.toDataURL("image/png");
        const base64 = dataUrl.split(",")[1];
        const uploaded = await uploadMutation.mutateAsync({ base64, filename: `ad-${Date.now()}.png`, contentType: "image/png" });
        mediaUrl = uploaded.url;
      } else {
        // Fallback: use a screenshot of the preview div
        toast.error("Could not capture canvas. Please export the image first and use the URL.");
        setPublishingPlatform(null);
        return;
      }
      publishMutation.mutate({ platform: platformId as any, mediaUrl, mediaType: "image", caption: publishCaption });
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
      setPublishingPlatform(null);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><Megaphone className="h-4 w-4 text-amber-400" /> Publish to Platform</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs">Caption / Post Text</Label>
            <Textarea
              className="mt-1 text-xs resize-none"
              rows={3}
              placeholder="Write your post caption here..."
              value={publishCaption}
              onChange={(e) => setPublishCaption(e.target.value)}
            />
          </div>
          <div className="space-y-3">
            {Object.entries(PLATFORM_META).map(([platformId, meta]) => {
              const connected = getConnected(platformId);
              const suggestedTemplates = PLATFORM_TEMPLATES[platformId] || [];
              const isCurrentOptimal = suggestedTemplates.includes(currentTemplate);
              return (
                <div key={platformId} className={`rounded-lg border p-3 ${meta.color}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{meta.icon}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{meta.name}</span>
                          {connected ? (
                            <Badge className="text-xs bg-green-500/20 text-green-400 border-green-500/30">
                              <CheckCircle2 className="h-3 w-3 mr-1" />Connected
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs text-muted-foreground">Not connected</Badge>
                          )}
                          {isCurrentOptimal && (
                            <Badge className="text-xs bg-amber-500/20 text-amber-400 border-amber-500/30">Optimal size</Badge>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{meta.notes}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {!connected && (
                        <a href="/settings?tab=connected-platforms">
                          <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                            <ExternalLink className="h-3 w-3" />Connect
                          </Button>
                        </a>
                      )}
                      {connected && (
                        <Button
                          size="sm" className="h-7 text-xs gap-1 bg-amber-500 hover:bg-amber-600 text-black"
                          onClick={() => handlePublish(platformId)}
                          disabled={publishMutation.isPending}
                        >
                          {publishMutation.isPending && publishingPlatform === platformId ? <Loader2 className="h-3 w-3 animate-spin" /> : <Megaphone className="h-3 w-3" />}
                          Publish
                        </Button>
                      )}
                    </div>
                  </div>
                  {!isCurrentOptimal && suggestedTemplates.length > 0 && (
                    <p className="text-[10px] text-amber-400/80 mt-2">
                      ⚠️ Recommended templates for {meta.name}: {suggestedTemplates.map((t) => TEMPLATE_CONFIG[t]?.label).join(", ")}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Festival & Distribution Tab ─────────────────────────────────────────────

const FESTIVAL_PLATFORMS = [
  {
    name: "FilmFreeway",
    icon: "🏆",
    description: "The world’s leading film festival submission platform. Submit to 10,000+ festivals.",
    url: "https://filmfreeway.com",
    type: "submission",
  },
  {
    name: "WithoutABox",
    icon: "🎥",
    description: "IMDb’s festival submission service. Reach Academy Award-qualifying festivals.",
    url: "https://www.withoutabox.com",
    type: "submission",
  },
  {
    name: "Short-Filmz.com",
    icon: "📽️",
    description: "Showcase your short film to a global audience. Easy submission and viewer engagement.",
    url: "https://www.short-filmz.com",
    type: "distribution",
  },
  {
    name: "Vimeo On Demand",
    icon: "📡",
    description: "Self-distribute your film directly to audiences. Set your own price.",
    url: "https://vimeo.com/ondemand",
    type: "distribution",
  },
  {
    name: "Festhome",
    icon: "🌟",
    description: "Festival submission platform with 5,000+ festivals worldwide.",
    url: "https://festhome.com",
    type: "submission",
  },
  {
    name: "Reelport",
    icon: "📦",
    description: "European film distribution and festival submission platform.",
    url: "https://www.reelport.com",
    type: "distribution",
  },
];

function FestivalTab() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><Ticket className="h-4 w-4 text-amber-400" /> Festival & Distribution Platforms</CardTitle>
          <p className="text-xs text-muted-foreground">Submit your film to festivals and self-distribution platforms. Use the Festival Poster template for optimal submission assets.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {["submission", "distribution"].map((type) => (
            <div key={type}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{type === "submission" ? "🏆 Festival Submissions" : "📡 Self-Distribution"}</p>
              <div className="space-y-2">
                {FESTIVAL_PLATFORMS.filter((p) => p.type === type).map((platform) => (
                  <div key={platform.name} className="flex items-start justify-between gap-3 rounded-lg border border-border/50 bg-card/30 p-3">
                    <div className="flex items-start gap-2">
                      <span className="text-xl mt-0.5">{platform.icon}</span>
                      <div>
                        <p className="font-medium text-sm">{platform.name}</p>
                        <p className="text-xs text-muted-foreground">{platform.description}</p>
                      </div>
                    </div>
                    <a href={platform.url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                      <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                        <ExternalLink className="h-3 w-3" />Visit
                      </Button>
                    </a>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4 text-amber-400" /> Press Kit Checklist</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              { item: "Movie Poster (27×40)", template: "poster", done: true },
              { item: "Festival Submission Poster", template: "withoutabox-poster", done: true },
              { item: "Press Kit Layout", template: "press-kit", done: true },
              { item: "Trailer Card / Thumbnail", template: "trailer-card", done: true },
              { item: "Event Flyer (Premiere)", template: "event-flyer", done: true },
              { item: "Letterbox Banner", template: "letterbox", done: true },
            ].map((row) => (
              <div key={row.item} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                  <span>{row.item}</span>
                </div>
                <Badge variant="outline" className="text-[10px]">{TEMPLATE_CONFIG[row.template as TemplateType]?.label}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Influencer Kit Tab ───────────────────────────────────────────────────────

function InfluencerKitTab() {
  const [filmTitle, setFilmTitle] = useState("");
  const [genre, setGenre] = useState("");
  const [logline, setLogline] = useState("");
  const [generatedKit, setGeneratedKit] = useState<{ caption: string; hashtags: string; emailPitch: string; linkedinPost: string } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateKit = async () => {
    if (!filmTitle) { toast.error("Please enter a film title"); return; }
    setIsGenerating(true);
    try {
      const res = await fetch("/api/trpc/poster.generateInfluencerKit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ json: { title: filmTitle, genre, logline } }),
      });
      const data = await res.json();
      if (data?.result?.data?.json) {
        setGeneratedKit(data.result.data.json);
        toast.success("Influencer kit generated!");
      } else {
        // Fallback: generate locally
        const hashtags = `#${filmTitle.replace(/\s+/g, "")} #IndieFilm #${genre || "Film"} #FilmMaker #NewFilm #CinematicStorytelling #FilmProduction #WatchNow`;
        setGeneratedKit({
          caption: `🎥 Introducing ${filmTitle}${genre ? ` — a ${genre} film` : ""}.${logline ? " " + logline : ""} Now available. Link in bio.`,
          hashtags,
          emailPitch: `Hi [Name],\n\nI’m reaching out about ${filmTitle}${genre ? `, a ${genre} film` : ""} that I think your audience would love.${logline ? " " + logline : ""}\n\nI’d love to explore a collaboration — whether that’s a review, a feature post, or a behind-the-scenes exclusive.\n\nWould you be open to a quick call?\n\nBest,\n[Your Name]`,
          linkedinPost: `Excited to announce ${filmTitle}${genre ? ` — a ${genre} film` : ""}.${logline ? " " + logline : ""} We’re now seeking distribution partners, press coverage, and influencer collaborations. Reach out if you’d like to be part of this journey. #FilmIndustry #IndieFilm #${genre || "Cinema"}`,
        });
        toast.success("Influencer kit generated!");
      }
    } catch {
      toast.error("Generation failed. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success(`${label} copied to clipboard`));
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><Sparkles className="h-4 w-4 text-amber-400" /> Influencer Outreach Kit</CardTitle>
          <p className="text-xs text-muted-foreground">Generate professional outreach copy for LinkedIn influencers, film critics, and industry contacts.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs">Film Title</Label>
            <Input className="mt-1 h-8 text-xs" placeholder="e.g. The Last Signal" value={filmTitle} onChange={(e) => setFilmTitle(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Genre</Label>
            <Input className="mt-1 h-8 text-xs" placeholder="e.g. Sci-Fi Thriller" value={genre} onChange={(e) => setGenre(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Logline (optional)</Label>
            <Textarea className="mt-1 text-xs resize-none" rows={2} placeholder="One-sentence pitch..." value={logline} onChange={(e) => setLogline(e.target.value)} />
          </div>
          <Button size="sm" className="gap-1 bg-amber-500 hover:bg-amber-600 text-black text-xs" onClick={generateKit} disabled={isGenerating}>
            {isGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            Generate Kit
          </Button>
        </CardContent>
      </Card>

      {generatedKit && (
        <>
          {([
            { label: "Social Caption", key: "caption" as const, icon: "📸" },
            { label: "Hashtags", key: "hashtags" as const, icon: "#" },
            { label: "Email Pitch", key: "emailPitch" as const, icon: "✉️" },
            { label: "LinkedIn Post", key: "linkedinPost" as const, icon: "💼" },
          ] as { label: string; key: keyof typeof generatedKit; icon: string }[]).map(({ label, key, icon }) => (
            <Card key={key}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{icon} {label}</CardTitle>
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => copyToClipboard(generatedKit[key], label)}>
                    <Copy className="h-3 w-3" />Copy
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">{generatedKit[key]}</p>
              </CardContent>
            </Card>
          ))}
        </>
      )}
    </div>
  );
}

// ─── Utility ─────────────────────────────────────────────────────────────────

function hexToRgba(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
