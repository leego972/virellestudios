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
  CheckCircle2,
  ExternalLink,
  Share2,
  Paintbrush,
  Award,
  QrCode,
  Layers2,
  ChevronDown,
  ChevronUp,
  Star,
  Zap,
  Globe,
  LayoutTemplate,
  Swatch,
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

type BadgeOverlay = {
  id: string;
  type: "now-streaming" | "award-winner" | "official-selection" | "coming-soon" | "limited-release" | "watch-now" | "custom";
  label: string;
  x: number;
  y: number;
  color: string;
  bgColor: string;
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
  badgeOverlays: BadgeOverlay[];
  selectedElementId: string | null;
  filters: ImageFilters;
  gradient: GradientOverlay;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const TEMPLATE_CONFIG: Record<TemplateType, { label: string; icon: React.ElementType; width: number; height: number; description: string; category: string; emoji: string }> = {
  "poster":             { label: "Movie Poster",      icon: RectangleHorizontal, width: 675,  height: 1000, description: "Classic 27×40 portrait poster",            category: "Film",        emoji: "🎬" },
  "trailer-card":       { label: "Trailer Card",       icon: Clapperboard,        width: 1280, height: 720,  description: "YouTube/Vimeo trailer thumbnail",          category: "Film",        emoji: "🎞️" },
  "dvd-cover":          { label: "DVD/Blu-ray",        icon: Disc3,               width: 780,  height: 1050, description: "Front cover with spine area",              category: "Film",        emoji: "💿" },
  "letterbox":          { label: "Letterbox",          icon: Film,                width: 1200, height: 500,  description: "Cinematic widescreen banner",              category: "Film",        emoji: "📽️" },
  "press-kit":          { label: "Press Kit",          icon: FileText,            width: 900,  height: 1200, description: "Professional media press layout",          category: "Film",        emoji: "📋" },
  "withoutabox-poster": { label: "Festival Poster",    icon: Ticket,              width: 675,  height: 1000, description: "FilmFreeway / WithoutABox submission",     category: "Film",        emoji: "🏆" },
  "ig-feed":            { label: "IG Feed (4:5)",      icon: Square,              width: 1080, height: 1350, description: "Instagram feed post — optimal 4:5 ratio",   category: "Instagram",   emoji: "📸" },
  "ig-square":          { label: "IG Square (1:1)",    icon: Square,              width: 1080, height: 1080, description: "Instagram square post",                   category: "Instagram",   emoji: "⬛" },
  "ig-story":           { label: "IG Story",           icon: Smartphone,          width: 1080, height: 1920, description: "Instagram Story — 9:16 vertical",           category: "Instagram",   emoji: "📱" },
  "ig-reels":           { label: "IG Reels Cover",     icon: Smartphone,          width: 1080, height: 1920, description: "Reels cover thumbnail — 9:16",            category: "Instagram",   emoji: "🎵" },
  "tiktok-vertical":    { label: "TikTok Video",       icon: Smartphone,          width: 1080, height: 1920, description: "TikTok video ad — 9:16 vertical",         category: "TikTok",      emoji: "🎵" },
  "tiktok-thumbnail":   { label: "TikTok Thumbnail",   icon: Square,              width: 1080, height: 1080, description: "TikTok profile/cover thumbnail",           category: "TikTok",      emoji: "🖼️" },
  "fb-feed":            { label: "FB Feed Ad",         icon: Monitor,             width: 1200, height: 628,  description: "Facebook feed image ad — 1.91:1",        category: "Facebook",    emoji: "📘" },
  "fb-story":           { label: "FB Story",           icon: Smartphone,          width: 1080, height: 1920, description: "Facebook Story — 9:16 vertical",          category: "Facebook",    emoji: "📱" },
  "fb-cover":           { label: "FB Page Cover",      icon: Monitor,             width: 1640, height: 624,  description: "Facebook Page cover photo",               category: "Facebook",    emoji: "🖼️" },
  "discord-banner":     { label: "Discord Banner",     icon: Monitor,             width: 960,  height: 540,  description: "Discord server banner — 16:9",           category: "Discord",     emoji: "💬" },
  "discord-card":       { label: "Discord Card",       icon: Square,              width: 800,  height: 450,  description: "Discord announcement embed card",         category: "Discord",     emoji: "📢" },
  "yt-thumbnail":       { label: "YT Thumbnail",       icon: Monitor,             width: 1280, height: 720,  description: "YouTube video thumbnail — 16:9",         category: "YouTube",     emoji: "▶️" },
  "yt-shorts":          { label: "YT Shorts",          icon: Smartphone,          width: 1080, height: 1920, description: "YouTube Shorts — 9:16 vertical",          category: "YouTube",     emoji: "📲" },
  "yt-channel-art":     { label: "YT Channel Art",     icon: Monitor,             width: 2560, height: 1440, description: "YouTube channel banner art",               category: "YouTube",     emoji: "🎨" },
  "social-square":      { label: "Social Square",      icon: Square,              width: 800,  height: 800,  description: "Generic square social post",              category: "Marketing",   emoji: "📣" },
  "social-story":       { label: "Social Story",       icon: Smartphone,          width: 540,  height: 960,  description: "Generic story format",                   category: "Marketing",   emoji: "📱" },
  "social-ad":          { label: "Social Ad",          icon: Megaphone,           width: 1080, height: 1080, description: "High-res social media ad",                category: "Marketing",   emoji: "📢" },
  "banner":             { label: "Banner",             icon: Monitor,             width: 1280, height: 720,  description: "YouTube thumbnail, website header",       category: "Marketing",   emoji: "🖥️" },
  "billboard":          { label: "Billboard",          icon: Megaphone,           width: 1200, height: 400,  description: "Ultra-wide outdoor advertising",          category: "Marketing",   emoji: "🗺️" },
  "event-flyer":        { label: "Event Flyer",        icon: Ticket,              width: 600,  height: 900,  description: "Premiere, screening, festival",           category: "Marketing",   emoji: "🎟️" },
  "influencer-kit":     { label: "Influencer Kit",     icon: Sparkles,            width: 1080, height: 1080, description: "Influencer outreach square card",         category: "Marketing",   emoji: "✨" },
  "album-art":          { label: "Soundtrack Art",     icon: Music,               width: 800,  height: 800,  description: "Soundtrack or score album cover",         category: "Other",       emoji: "🎵" },
};

const FONT_FAMILIES = [
  "Inter", "Georgia", "Courier New", "Impact", "Arial Black",
  "Trebuchet MS", "Palatino", "Garamond", "Verdana", "Tahoma",
  "Times New Roman", "Lucida Console",
  "Playfair Display", "Oswald", "Raleway", "Montserrat",
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

const BADGE_PRESETS: { type: BadgeOverlay["type"]; label: string; color: string; bgColor: string; emoji: string }[] = [
  { type: "now-streaming",    label: "NOW STREAMING",     color: "#ffffff", bgColor: "#e50914", emoji: "▶️" },
  { type: "award-winner",     label: "AWARD WINNER",      color: "#000000", bgColor: "#ffd700", emoji: "🏆" },
  { type: "official-selection", label: "OFFICIAL SELECTION", color: "#ffffff", bgColor: "#1a1a2e", emoji: "🎬" },
  { type: "coming-soon",      label: "COMING SOON",       color: "#ffffff", bgColor: "#0a0a0a", emoji: "📅" },
  { type: "limited-release",  label: "LIMITED RELEASE",   color: "#ffffff", bgColor: "#7c3aed", emoji: "💎" },
  { type: "watch-now",        label: "WATCH NOW",         color: "#000000", bgColor: "#f59e0b", emoji: "🎥" },
];

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
        id: generateId(), text: "Directed by • Produced by • Starring", x: w / 2, y: h * 0.93,
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
      if (newH.length > 50) newH.shift();
      return newH;
    });
    setIndex((i) => Math.min(i + 1, 49));
  }, [index]);

  const undo = useCallback(() => { setIndex((i) => Math.max(0, i - 1)); }, []);
  const redo = useCallback(() => { setIndex((i) => Math.min(history.length - 1, i + 1)); }, [history.length]);
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
  const { current: poster, push: pushPoster, undo, redo, canUndo, canRedo } = useHistory<PosterState>({
    templateType: "poster",
    backgroundImageUrl: null,
    backgroundColor: "#000000",
    overlayColor: "rgba(0,0,0,0.6)",
    overlayOpacity: 0.6,
    textElements: getDefaultTextElements("poster"),
    badgeOverlays: [],
    selectedElementId: null,
    filters: { ...DEFAULT_FILTERS },
    gradient: { ...DEFAULT_GRADIENT },
  });

  // UI state
  const [activeTab, setActiveTab] = useState("design");
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isGeneratingCopy, setIsGeneratingCopy] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [isGeneratingTaglines, setIsGeneratingTaglines] = useState(false);
  const [isGeneratingBrandKit, setIsGeneratingBrandKit] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showQrDialog, setShowQrDialog] = useState(false);
  const [showTaglinesDialog, setShowTaglinesDialog] = useState(false);
  const [showBrandKitDialog, setShowBrandKitDialog] = useState(false);
  const [exportScale, setExportScale] = useState(2);
  const [zoom, setZoom] = useState(1);
  const [draggingElement, setDraggingElement] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [videoAdUrl, setVideoAdUrl] = useState<string | null>(null);
  const [templateFilter, setTemplateFilter] = useState<string>("All");
  const [taglineVariants, setTaglineVariants] = useState<string[]>([]);
  const [brandKit, setBrandKit] = useState<any>(null);
  const [qrUrl, setQrUrl] = useState("");
  const [mockupMode, setMockupMode] = useState<"none" | "phone" | "laptop" | "billboard">("none");

  // AI mutations
  const generateImageMutation = trpc.poster.generateImage.useMutation({
    onSuccess: (data) => {
      if (data.url) { pushPoster({ ...poster, backgroundImageUrl: data.url }); toast.success("AI artwork generated!"); }
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
      if (data.videoUrl) { setVideoAdUrl(data.videoUrl); toast.success("Video ad generated!"); }
    },
    onError: (err) => toast.error(`Video generation failed: ${err.message}`),
    onSettled: () => setIsGeneratingVideo(false),
  });

  const generateTaglinesMutation = trpc.poster.generateTaglineVariants.useMutation({
    onSuccess: (data) => {
      if (data.taglines?.length) {
        setTaglineVariants(data.taglines);
        setShowTaglinesDialog(true);
        toast.success("5 tagline variants ready!");
      }
    },
    onError: (err) => toast.error(`Tagline generation failed: ${err.message}`),
    onSettled: () => setIsGeneratingTaglines(false),
  });

  const generateBrandKitMutation = trpc.poster.generateBrandKit.useMutation({
    onSuccess: (data) => {
      if (data) {
        setBrandKit(data);
        setShowBrandKitDialog(true);
        toast.success("Brand kit generated!");
      }
    },
    onError: (err) => toast.error(`Brand kit generation failed: ${err.message}`),
    onSettled: () => setIsGeneratingBrandKit(false),
  });

  // Template change
  const handleTemplateChange = (type: TemplateType) => {
    pushPoster({ ...poster, templateType: type, textElements: getDefaultTextElements(type), selectedElementId: null });
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
    pushPoster({ ...poster, textElements: poster.textElements.map((el) => (el.id === id ? { ...el, ...updates } : el)) });
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

  // Badge operations
  const addBadge = (preset: typeof BADGE_PRESETS[0]) => {
    const config = TEMPLATE_CONFIG[poster.templateType];
    const newBadge: BadgeOverlay = {
      id: generateId(),
      type: preset.type,
      label: preset.label,
      x: config.width * 0.15,
      y: config.height * 0.08,
      color: preset.color,
      bgColor: preset.bgColor,
    };
    pushPoster({ ...poster, badgeOverlays: [...poster.badgeOverlays, newBadge] });
    toast.success(`Added "${preset.label}" badge`);
  };

  const removeBadge = (id: string) => {
    pushPoster({ ...poster, badgeOverlays: poster.badgeOverlays.filter((b) => b.id !== id) });
  };

  // AI generation handlers
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

  const handleGenerateTaglines = () => {
    const title = projectDetail?.title || poster.textElements[0]?.text || "";
    if (!title || title === "MOVIE TITLE") { toast.error("Please enter a film title or link a project first"); return; }
    setIsGeneratingTaglines(true);
    generateTaglinesMutation.mutate({
      title,
      genre: projectDetail?.genre || "drama",
      description: projectDetail?.plotSummary || projectDetail?.description || "",
    });
  };

  const handleGenerateBrandKit = () => {
    const title = projectDetail?.title || poster.textElements[0]?.text || "";
    if (!title || title === "MOVIE TITLE") { toast.error("Please enter a film title or link a project first"); return; }
    setIsGeneratingBrandKit(true);
    generateBrandKitMutation.mutate({
      title,
      genre: projectDetail?.genre || "drama",
      description: projectDetail?.plotSummary || projectDetail?.description || "",
      mood: projectDetail?.genre || "",
    });
  };

  const applyBrandKit = () => {
    if (!brandKit) return;
    const elements = poster.textElements.map((el, i) => ({
      ...el,
      color: i === 0 ? brandKit.textColor : i === 1 ? brandKit.primaryColor : brandKit.accentColor,
      fontFamily: i === 0 ? brandKit.titleFont : brandKit.bodyFont,
    }));
    pushPoster({
      ...poster,
      backgroundColor: brandKit.backgroundColor,
      overlayColor: "rgba(0,0,0,0.4)",
      textElements: elements,
    });
    toast.success("Brand kit applied to canvas!");
    setShowBrandKitDialog(false);
  };

  const applyTagline = (tagline: string) => {
    const elements = [...poster.textElements];
    if (elements[1]) elements[1] = { ...elements[1], text: tagline };
    pushPoster({ ...poster, textElements: elements });
    toast.success("Tagline applied!");
    setShowTaglinesDialog(false);
  };

  // Apply genre preset
  const applyGenrePreset = (genreName: string) => {
    const preset = GENRE_PRESETS[genreName];
    if (!preset) return;
    const elements = poster.textElements.map((el, i) => ({
      ...el,
      color: i === 0 ? preset.text : i === 1 ? preset.text + "cc" : preset.text + "88",
    }));
    pushPoster({ ...poster, backgroundColor: preset.bg, overlayColor: preset.overlay, gradient: preset.gradient, textElements: elements });
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

  // Build CSS filter string
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
        const f = poster.filters;
        ctx.filter = `brightness(${f.brightness}%) contrast(${f.contrast}%) saturate(${f.saturation}%) blur(${f.blur * scale}px) hue-rotate(${f.hueRotate}deg)`;
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
        ctx.filter = "none";
      } catch { /* continue */ }
    }

    ctx.fillStyle = poster.overlayColor;
    ctx.globalAlpha = poster.overlayOpacity;
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;

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

    // Badge overlays
    for (const badge of poster.badgeOverlays) {
      ctx.save();
      const bx = badge.x * scale;
      const by = badge.y * scale;
      const bw = 180 * scale;
      const bh = 32 * scale;
      ctx.fillStyle = badge.bgColor;
      ctx.beginPath();
      ctx.roundRect(bx - bw / 2, by - bh / 2, bw, bh, 4 * scale);
      ctx.fill();
      ctx.fillStyle = badge.color;
      ctx.font = `bold ${11 * scale}px Inter, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.letterSpacing = `${2 * scale}px`;
      ctx.fillText(badge.label, bx, by);
      ctx.restore();
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
    toast.success("Exported successfully!");
    setShowExportDialog(false);
  }, [poster, exportScale]);

  const selectedElement = poster.textElements.find((el) => el.id === poster.selectedElementId);
  const config = TEMPLATE_CONFIG[poster.templateType];

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
    <div className="min-h-screen bg-background">
      {/* ── Hero Header ── */}
      <div className="border-b border-border/50 bg-gradient-to-r from-background via-primary/5 to-background px-4 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Button variant="ghost" size="sm" className="gap-1 -ml-2 text-muted-foreground hover:text-foreground" onClick={() => setLocation("/")}>
                <ChevronLeft className="h-4 w-4" /> Dashboard
              </Button>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
                <Megaphone className="h-6 w-6 text-primary" />
              </div>
              Ad & Poster Maker
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Professional film marketing assets — posters, ads, video content & brand kits
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-0.5 bg-muted/50 rounded-lg p-0.5">
              <Button size="icon" variant="ghost" className="h-8 w-8 rounded-md" onClick={undo} disabled={!canUndo} title="Undo">
                <Undo2 className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8 rounded-md" onClick={redo} disabled={!canRedo} title="Redo">
                <Redo2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="w-px h-6 bg-border" />
            <Button variant="outline" size="sm" className="gap-1.5 h-9" onClick={handleGenerateImage} disabled={isGeneratingImage}>
              {isGeneratingImage ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">AI Artwork</span>
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 h-9" onClick={handleGenerateCopy} disabled={isGeneratingCopy}>
              {isGeneratingCopy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">AI Copy</span>
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 h-9" onClick={handleGenerateVideoAd} disabled={isGeneratingVideo}>
              {isGeneratingVideo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Video className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">Video Ad</span>
            </Button>
            <Button size="sm" className="gap-1.5 h-9 bg-primary hover:bg-primary/90" onClick={() => setShowExportDialog(true)}>
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          </div>
        </div>

        {/* Quick AI Feature Strip */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <span className="text-xs text-muted-foreground font-medium">Quick AI:</span>
          <Button
            variant="ghost" size="sm"
            className="h-7 text-xs gap-1.5 border border-dashed border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
            onClick={handleGenerateTaglines}
            disabled={isGeneratingTaglines}
          >
            {isGeneratingTaglines ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
            5 Tagline Variants
          </Button>
          <Button
            variant="ghost" size="sm"
            className="h-7 text-xs gap-1.5 border border-dashed border-purple-500/40 text-purple-400 hover:bg-purple-500/10"
            onClick={handleGenerateBrandKit}
            disabled={isGeneratingBrandKit}
          >
            {isGeneratingBrandKit ? <Loader2 className="h-3 w-3 animate-spin" /> : <Paintbrush className="h-3 w-3" />}
            Brand Kit
          </Button>
          <Button
            variant="ghost" size="sm"
            className="h-7 text-xs gap-1.5 border border-dashed border-blue-500/40 text-blue-400 hover:bg-blue-500/10"
            onClick={() => setShowQrDialog(true)}
          >
            <QrCode className="h-3 w-3" />
            QR Code
          </Button>
          {/* Mockup toggle */}
          <div className="flex items-center gap-1 ml-auto">
            <span className="text-xs text-muted-foreground">Mockup:</span>
            {(["none", "phone", "laptop", "billboard"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMockupMode(m)}
                className={`text-[10px] px-2 py-0.5 rounded-full border transition-all ${mockupMode === m ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/30"}`}
              >
                {m === "none" ? "Off" : m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main Layout ── */}
      <div className="flex flex-col lg:flex-row gap-0 h-[calc(100vh-180px)] overflow-hidden">

        {/* ── Canvas Area ── */}
        <div className="flex-1 flex flex-col bg-[#0a0a0a] overflow-hidden">
          {/* Canvas toolbar */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs border-white/10 text-white/60">{config.label} — {config.width}×{config.height}</Badge>
              {selectedProjectId && projectDetail && (
                <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">
                  <Film className="h-3 w-3 mr-1" />{projectDetail.title}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button size="icon" variant="ghost" className="h-7 w-7 text-white/40 hover:text-white" onClick={() => setZoom((z) => Math.max(0.2, z - 0.1))}>
                <ZoomOut className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs text-white/40 w-10 text-center">{Math.round(zoom * 100)}%</span>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-white/40 hover:text-white" onClick={() => setZoom((z) => Math.min(2, z + 0.1))}>
                <ZoomIn className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-white/40 hover:text-white" onClick={() => setZoom(1)}>
                <RotateCcw className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Canvas */}
          <div className="flex-1 overflow-auto flex items-center justify-center p-6">
            <div className={mockupMode !== "none" ? getMockupWrapper(mockupMode) : ""}>
              <div
                ref={previewRef}
                className="relative shadow-2xl cursor-crosshair select-none overflow-hidden"
                style={{
                  width: config.width * zoom,
                  height: config.height * zoom,
                  backgroundColor: poster.backgroundColor,
                  borderRadius: mockupMode === "phone" ? `${16 * zoom}px` : "2px",
                }}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
              >
                {/* Background image */}
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
                {/* Badge overlays */}
                {poster.badgeOverlays.map((badge) => (
                  <div
                    key={badge.id}
                    className="absolute pointer-events-none flex items-center justify-center"
                    style={{
                      left: (badge.x / config.width) * 100 + "%",
                      top: (badge.y / config.height) * 100 + "%",
                      transform: "translate(-50%, -50%)",
                      backgroundColor: badge.bgColor,
                      color: badge.color,
                      padding: `${3 * zoom}px ${12 * zoom}px`,
                      borderRadius: `${4 * zoom}px`,
                      fontSize: `${11 * zoom}px`,
                      fontWeight: "bold",
                      letterSpacing: `${2 * zoom}px`,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {badge.label}
                  </div>
                ))}
                {/* Text elements */}
                {poster.textElements.map((el) => {
                  let displayText = el.text;
                  if (el.textTransform === "uppercase") displayText = displayText.toUpperCase();
                  if (el.textTransform === "lowercase") displayText = displayText.toLowerCase();
                  return (
                    <div
                      key={el.id}
                      className={`absolute pointer-events-none ${poster.selectedElementId === el.id ? "ring-1 ring-primary/60 ring-offset-0" : ""}`}
                      style={{
                        left: (el.x / config.width) * 100 + "%",
                        top: (el.y / config.height) * 100 + "%",
                        transform: "translate(-50%, -50%)",
                        width: (el.maxWidth / config.width) * 100 + "%",
                        textAlign: el.textAlign,
                        fontSize: el.fontSize * zoom,
                        fontFamily: el.fontFamily,
                        fontWeight: el.fontWeight,
                        fontStyle: el.fontStyle,
                        color: el.color,
                        opacity: el.opacity,
                        letterSpacing: el.letterSpacing * zoom,
                        lineHeight: 1.3,
                        textShadow: el.shadowBlur ? `0 0 ${el.shadowBlur * zoom}px ${el.shadowColor || "#000"}` : undefined,
                        wordBreak: "break-word",
                        overflowWrap: "break-word",
                      }}
                    >
                      {displayText}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Video Ad Preview */}
          {videoAdUrl && (
            <div className="border-t border-white/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Video className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-white">Video Ad Generated</span>
              </div>
              <video src={videoAdUrl} controls className="w-full max-h-40 rounded-lg" />
            </div>
          )}
        </div>

        {/* ── Sidebar ── */}
        <div className="w-full lg:w-[380px] border-l border-border/50 bg-card overflow-y-auto flex-shrink-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
            <TabsList className="w-full grid grid-cols-5 h-auto rounded-none border-b border-border/50 bg-muted/30 p-1 gap-0.5">
              <TabsTrigger value="design" className="flex-col gap-0.5 h-14 text-[10px] rounded-md data-[state=active]:bg-background">
                <LayoutTemplate className="h-4 w-4" />
                Design
              </TabsTrigger>
              <TabsTrigger value="text" className="flex-col gap-0.5 h-14 text-[10px] rounded-md data-[state=active]:bg-background">
                <Type className="h-4 w-4" />
                Text
              </TabsTrigger>
              <TabsTrigger value="style" className="flex-col gap-0.5 h-14 text-[10px] rounded-md data-[state=active]:bg-background">
                <Palette className="h-4 w-4" />
                Style
              </TabsTrigger>
              <TabsTrigger value="publish" className="flex-col gap-0.5 h-14 text-[10px] rounded-md data-[state=active]:bg-background">
                <Megaphone className="h-4 w-4" />
                Publish
              </TabsTrigger>
              <TabsTrigger value="more" className="flex-col gap-0.5 h-14 text-[10px] rounded-md data-[state=active]:bg-background">
                <Sparkles className="h-4 w-4" />
                More
              </TabsTrigger>
            </TabsList>

            {/* ── Design Tab ── */}
            <TabsContent value="design" className="p-4 space-y-5 mt-0">

              {/* Project Link */}
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Link Project</Label>
                <Select value={selectedProjectId?.toString() || "none"} onValueChange={(v) => setSelectedProjectId(v === "none" ? null : Number(v))}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select a project..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No project</SelectItem>
                    {projects?.map((p) => (<SelectItem key={p.id} value={p.id.toString()}>{p.title}</SelectItem>))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground mt-1">Auto-fills title, genre & description</p>
              </div>

              {/* Template Category Filter */}
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Template</Label>
                <div className="flex gap-1 mt-1.5 flex-wrap">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      className={`text-[10px] px-2.5 py-1 rounded-full border transition-all font-medium ${templateFilter === cat ? "bg-primary text-primary-foreground border-primary shadow-sm" : "border-border hover:border-primary/40 text-muted-foreground"}`}
                      onClick={() => setTemplateFilter(cat)}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-1 gap-1.5 mt-2 max-h-[260px] overflow-y-auto pr-0.5">
                  {filteredTemplates.map(([type, cfg]) => (
                    <button
                      key={type}
                      className={`flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all ${poster.templateType === type ? "border-primary bg-primary/8 ring-1 ring-primary/20" : "border-border/50 hover:border-primary/30 hover:bg-muted/40"}`}
                      onClick={() => handleTemplateChange(type)}
                    >
                      <span className="text-lg shrink-0">{cfg.emoji}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{cfg.label}</p>
                        <p className="text-[11px] text-muted-foreground">{cfg.description}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0 border-border/50">{cfg.width}×{cfg.height}</Badge>
                    </button>
                  ))}
                </div>
              </div>

              {/* Genre Presets */}
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Genre Presets</Label>
                <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                  {Object.entries(GENRE_PRESETS).map(([genre, preset]) => (
                    <button
                      key={genre}
                      className="flex items-center gap-2 p-2.5 rounded-xl border border-border/50 hover:border-primary/30 hover:bg-muted/40 transition-all text-left"
                      onClick={() => applyGenrePreset(genre)}
                    >
                      <div className="w-5 h-5 rounded-full border-2 shrink-0" style={{ backgroundColor: preset.bg, borderColor: preset.text + "60" }} />
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{genre}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{preset.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Badge Overlays */}
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Badge Overlays</Label>
                <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                  {BADGE_PRESETS.map((badge) => (
                    <button
                      key={badge.type}
                      className="flex items-center gap-2 p-2 rounded-xl border border-border/50 hover:border-primary/30 transition-all text-left"
                      onClick={() => addBadge(badge)}
                    >
                      <div className="w-6 h-6 rounded flex items-center justify-center text-xs shrink-0" style={{ backgroundColor: badge.bgColor, color: badge.color }}>
                        {badge.emoji}
                      </div>
                      <span className="text-[10px] font-medium leading-tight">{badge.label}</span>
                    </button>
                  ))}
                </div>
                {poster.badgeOverlays.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="text-[10px] text-muted-foreground">Active badges:</p>
                    {poster.badgeOverlays.map((b) => (
                      <div key={b.id} className="flex items-center justify-between bg-muted/30 rounded-lg px-2 py-1">
                        <span className="text-xs" style={{ color: b.bgColor }}>{b.label}</span>
                        <Button size="icon" variant="ghost" className="h-5 w-5 text-destructive/60 hover:text-destructive" onClick={() => removeBadge(b.id)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Background Image */}
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Background Image</Label>
                <div className="mt-1.5 space-y-2">
                  <Input
                    value={poster.backgroundImageUrl || ""}
                    onChange={(e) => pushPoster({ ...poster, backgroundImageUrl: e.target.value || null })}
                    placeholder="Paste image URL..."
                    className="text-xs" autoCapitalize="sentences" autoCorrect="on" enterKeyHint="next" />
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="gap-1.5 text-xs flex-1" onClick={handleGenerateImage} disabled={isGeneratingImage}>
                      {isGeneratingImage ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                      Generate with AI
                    </Button>
                    {poster.backgroundImageUrl && (
                      <Button size="sm" variant="ghost" className="text-xs text-destructive hover:text-destructive" onClick={() => pushPoster({ ...poster, backgroundImageUrl: null })}>
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ── Text Tab ── */}
            <TabsContent value="text" className="p-4 space-y-4 mt-0">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Text Layers</Label>
                <Button size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={addTextElement}>
                  <Plus className="h-3 w-3" /> Add Layer
                </Button>
              </div>

              <div className="space-y-1.5">
                {poster.textElements.map((el) => (
                  <button
                    key={el.id}
                    className={`w-full flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${poster.selectedElementId === el.id ? "border-primary bg-primary/8 ring-1 ring-primary/20" : "border-border/50 hover:border-primary/30 hover:bg-muted/40"}`}
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
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader className="pb-2 pt-3 px-3">
                    <CardTitle className="text-xs font-semibold text-primary uppercase tracking-wider">Edit Selected Layer</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 px-3 pb-3">
                    <div>
                      <Label className="text-xs">Content</Label>
                      <Textarea value={selectedElement.text} onChange={(e) => updateTextElement(selectedElement.id, { text: e.target.value })} rows={2} className="text-sm mt-1" autoCapitalize="sentences" autoCorrect="on" enterKeyHint="done" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Font Family</Label>
                        <Select value={selectedElement.fontFamily} onValueChange={(v) => updateTextElement(selectedElement.id, { fontFamily: v })}>
                          <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>{FONT_FAMILIES.map((f) => (<SelectItem key={f} value={f} className="text-xs">{f}</SelectItem>))}</SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Size (px)</Label>
                        <Input type="number" value={selectedElement.fontSize} onChange={(e) => updateTextElement(selectedElement.id, { fontSize: Number(e.target.value) })} className="h-8 text-xs mt-1" min={8} max={200} inputMode="numeric" enterKeyHint="done" />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Color</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <input type="color" value={selectedElement.color} onChange={(e) => updateTextElement(selectedElement.id, { color: e.target.value })} className="h-8 w-8 rounded-lg border cursor-pointer" />
                        <Input value={selectedElement.color} onChange={(e) => updateTextElement(selectedElement.id, { color: e.target.value })} className="h-8 text-xs flex-1" autoCapitalize="sentences" autoCorrect="on" enterKeyHint="next" />
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-wrap">
                      <Button size="icon" variant={selectedElement.fontWeight === "bold" ? "secondary" : "ghost"} className="h-7 w-7" onClick={() => updateTextElement(selectedElement.id, { fontWeight: selectedElement.fontWeight === "bold" ? "normal" : "bold" })}>
                        <Bold className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant={selectedElement.fontStyle === "italic" ? "secondary" : "ghost"} className="h-7 w-7" onClick={() => updateTextElement(selectedElement.id, { fontStyle: selectedElement.fontStyle === "italic" ? "normal" : "italic" })}>
                        <Italic className="h-3.5 w-3.5" />
                      </Button>
                      <div className="w-px h-5 bg-border mx-0.5" />
                      <Button size="icon" variant={selectedElement.textAlign === "left" ? "secondary" : "ghost"} className="h-7 w-7" onClick={() => updateTextElement(selectedElement.id, { textAlign: "left" })}>
                        <AlignLeft className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant={selectedElement.textAlign === "center" ? "secondary" : "ghost"} className="h-7 w-7" onClick={() => updateTextElement(selectedElement.id, { textAlign: "center" })}>
                        <AlignCenter className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant={selectedElement.textAlign === "right" ? "secondary" : "ghost"} className="h-7 w-7" onClick={() => updateTextElement(selectedElement.id, { textAlign: "right" })}>
                        <AlignRight className="h-3.5 w-3.5" />
                      </Button>
                      <div className="w-px h-5 bg-border mx-0.5" />
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
                      <Slider className="mt-1" value={[selectedElement.letterSpacing]} min={0} max={20} step={0.5} onValueChange={([v]) => updateTextElement(selectedElement.id, { letterSpacing: v })} />
                    </div>
                    <div>
                      <Label className="text-xs">Opacity: {Math.round(selectedElement.opacity * 100)}%</Label>
                      <Slider className="mt-1" value={[selectedElement.opacity]} min={0} max={1} step={0.05} onValueChange={([v]) => updateTextElement(selectedElement.id, { opacity: v })} />
                    </div>
                    <div>
                      <Label className="text-xs">Text Shadow</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <input type="color" value={selectedElement.shadowColor || "#000000"} onChange={(e) => updateTextElement(selectedElement.id, { shadowColor: e.target.value })} className="h-7 w-7 rounded-lg border cursor-pointer" />
                        <div className="flex-1">
                          <Slider value={[selectedElement.shadowBlur || 0]} min={0} max={30} step={1} onValueChange={([v]) => updateTextElement(selectedElement.id, { shadowBlur: v })} />
                        </div>
                        <span className="text-[10px] text-muted-foreground w-8">{selectedElement.shadowBlur || 0}px</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">X Position</Label>
                        <Input type="number" value={Math.round(selectedElement.x)} onChange={(e) => updateTextElement(selectedElement.id, { x: Number(e.target.value) })} className="h-8 text-xs mt-1" inputMode="numeric" enterKeyHint="done" />
                      </div>
                      <div>
                        <Label className="text-xs">Y Position</Label>
                        <Input type="number" value={Math.round(selectedElement.y)} onChange={(e) => updateTextElement(selectedElement.id, { y: Number(e.target.value) })} className="h-8 text-xs mt-1" inputMode="numeric" enterKeyHint="done" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* ── Style Tab ── */}
            <TabsContent value="style" className="p-4 space-y-5 mt-0">

              {/* Color Themes */}
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Color Themes</Label>
                <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                  {COLOR_PRESETS.map((preset) => {
                    const elements = poster.textElements.map((el, i) => ({
                      ...el, color: i === 0 ? preset.text : i === 1 ? preset.text + "cc" : preset.text + "88",
                    }));
                    return (
                      <button
                        key={preset.name}
                        className="flex items-center gap-2 p-2.5 rounded-xl border border-border/50 hover:border-primary/30 transition-all text-left"
                        onClick={() => pushPoster({ ...poster, backgroundColor: preset.bg, overlayColor: preset.overlay, textElements: elements })}
                      >
                        <div className="w-6 h-6 rounded-full border shrink-0" style={{ backgroundColor: preset.bg, boxShadow: `inset 0 0 0 2px ${preset.text}40` }} />
                        <span className="text-xs truncate">{preset.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Colors */}
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Custom Colors</Label>
                <div className="space-y-3 mt-1.5">
                  <div>
                    <Label className="text-xs">Background</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <input type="color" value={poster.backgroundColor} onChange={(e) => pushPoster({ ...poster, backgroundColor: e.target.value })} className="h-8 w-8 rounded-lg border cursor-pointer" />
                      <Input value={poster.backgroundColor} onChange={(e) => pushPoster({ ...poster, backgroundColor: e.target.value })} className="h-8 text-xs flex-1" autoCapitalize="sentences" autoCorrect="on" enterKeyHint="next" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Overlay Opacity: {Math.round(poster.overlayOpacity * 100)}%</Label>
                    <Slider className="mt-1" value={[poster.overlayOpacity]} min={0} max={1} step={0.05} onValueChange={([v]) => pushPoster({ ...poster, overlayOpacity: v })} />
                  </div>
                </div>
              </div>

              {/* Gradient Overlay */}
              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Gradient Overlay</Label>
                  <button
                    className={`text-xs px-2.5 py-0.5 rounded-full border transition-all font-medium ${poster.gradient.enabled ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}
                    onClick={() => pushPoster({ ...poster, gradient: { ...poster.gradient, enabled: !poster.gradient.enabled } })}
                  >
                    {poster.gradient.enabled ? "ON" : "OFF"}
                  </button>
                </div>
                {poster.gradient.enabled && (
                  <div className="space-y-3 mt-2">
                    <div className="flex gap-2">
                      <Button size="sm" variant={poster.gradient.type === "linear" ? "secondary" : "outline"} className="flex-1 text-xs h-8" onClick={() => pushPoster({ ...poster, gradient: { ...poster.gradient, type: "linear" } })}>Linear</Button>
                      <Button size="sm" variant={poster.gradient.type === "radial" ? "secondary" : "outline"} className="flex-1 text-xs h-8" onClick={() => pushPoster({ ...poster, gradient: { ...poster.gradient, type: "radial" } })}>Radial</Button>
                    </div>
                    {poster.gradient.type === "linear" && (
                      <div>
                        <Label className="text-xs">Angle: {poster.gradient.angle}°</Label>
                        <Slider className="mt-1" value={[poster.gradient.angle]} min={0} max={360} step={15} onValueChange={([v]) => pushPoster({ ...poster, gradient: { ...poster.gradient, angle: v } })} />
                      </div>
                    )}
                    {poster.gradient.colors.map((c, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input type="color" value={c.color} onChange={(e) => {
                          const colors = [...poster.gradient.colors];
                          colors[i] = { ...colors[i], color: e.target.value };
                          pushPoster({ ...poster, gradient: { ...poster.gradient, colors } });
                        }} className="h-7 w-7 rounded-lg border cursor-pointer" />
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
                  </div>
                )}
              </div>

              {/* Image Filters */}
              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Image Filters</Label>
                  <Button size="sm" variant="ghost" className="text-xs h-6 gap-1" onClick={() => pushPoster({ ...poster, filters: { ...DEFAULT_FILTERS } })}>
                    <RotateCcw className="h-3 w-3" /> Reset
                  </Button>
                </div>
                <div className="space-y-3 mt-1.5">
                  {[
                    { key: "brightness" as const, label: "Brightness", icon: SunMedium, min: 0, max: 200 },
                    { key: "contrast" as const, label: "Contrast", icon: Contrast, min: 0, max: 200 },
                    { key: "saturation" as const, label: "Saturation", icon: Droplets, min: 0, max: 200 },
                    { key: "blur" as const, label: "Blur", icon: Eye, min: 0, max: 20 },
                    { key: "hueRotate" as const, label: "Hue Rotate", icon: Palette, min: 0, max: 360 },
                  ].map(({ key, label, icon: Icon, min, max }) => (
                    <div key={key}>
                      <Label className="text-xs flex items-center gap-1">
                        <Icon className="h-3 w-3" /> {label}: {poster.filters[key]}{key === "blur" ? "px" : key === "hueRotate" ? "°" : "%"}
                      </Label>
                      <Slider className="mt-1" value={[poster.filters[key]]} min={min} max={max} step={key === "blur" ? 0.5 : key === "hueRotate" ? 15 : 5} onValueChange={([v]) => pushPoster({ ...poster, filters: { ...poster.filters, [key]: v } })} />
                    </div>
                  ))}
                </div>

                {/* Filter Presets */}
                <div className="grid grid-cols-3 gap-1.5 mt-3">
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
                      className="p-2 rounded-xl border border-border/50 hover:border-primary/30 transition-all text-[10px] font-medium text-center"
                      onClick={() => pushPoster({ ...poster, filters: preset.filters })}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* ── Publish Tab ── */}
            <TabsContent value="publish" className="p-4 mt-0">
              <PublishTab currentTemplate={poster.templateType} />
            </TabsContent>

            {/* ── More Tab ── */}
            <TabsContent value="more" className="p-4 space-y-4 mt-0">
              <FestivalTab />
              <InfluencerKitTab projectTitle={projectDetail?.title} projectGenre={projectDetail?.genre} projectLogline={projectDetail?.plotSummary} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* ── Export Dialog ── */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Download className="h-5 w-5 text-primary" /> Export Asset</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Export Scale</Label>
              <Select value={exportScale.toString()} onValueChange={(v) => setExportScale(Number(v))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1× — {config.width}×{config.height}px (Preview)</SelectItem>
                  <SelectItem value="2">2× — {config.width * 2}×{config.height * 2}px (Recommended)</SelectItem>
                  <SelectItem value="3">3× — {config.width * 3}×{config.height * 3}px (Print Quality)</SelectItem>
                  <SelectItem value="4">4× — {config.width * 4}×{config.height * 4}px (Ultra HD)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="bg-muted/40 rounded-xl p-3 text-sm">
              <p className="font-medium">Output: <span className="text-primary">{config.width * exportScale}×{config.height * exportScale}px PNG</span></p>
              <p className="text-xs text-muted-foreground mt-1">Template: {config.label} — {config.description}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExportDialog(false)}>Cancel</Button>
            <Button className="gap-2" onClick={handleExport}><Download className="h-4 w-4" /> Download PNG</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── QR Code Dialog ── */}
      <Dialog open={showQrDialog} onOpenChange={setShowQrDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><QrCode className="h-5 w-5 text-primary" /> QR Code Overlay</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>URL to encode</Label>
              <Input className="mt-1" placeholder="https://yourfilm.com" value={qrUrl} onChange={(e) => setQrUrl(e.target.value)} autoCapitalize="sentences" autoCorrect="on" enterKeyHint="next" />
            </div>
            {qrUrl && (
              <div className="flex flex-col items-center gap-3">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}&bgcolor=000000&color=ffffff&format=png`}
                  alt="QR Code"
                  className="w-40 h-40 rounded-xl border border-border"
                />
                <p className="text-xs text-muted-foreground text-center">Right-click the QR code to save it, then paste the URL in the Background Image field to overlay it on your poster.</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQrDialog(false)}>Close</Button>
            {qrUrl && (
              <Button onClick={() => {
                const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qrUrl)}&bgcolor=000000&color=ffffff&format=png`;
                const link = document.createElement("a");
                link.href = qrSrc;
                link.download = "qr-code.png";
                link.click();
                toast.success("QR code downloaded!");
              }}>
                <Download className="h-4 w-4 mr-1" /> Download QR
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Tagline Variants Dialog ── */}
      <Dialog open={showTaglinesDialog} onOpenChange={setShowTaglinesDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Zap className="h-5 w-5 text-amber-400" /> 5 AI Tagline Variants</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {taglineVariants.map((tagline, i) => (
              <button
                key={i}
                className="w-full text-left p-3 rounded-xl border border-border/50 hover:border-primary/40 hover:bg-primary/5 transition-all group"
                onClick={() => applyTagline(tagline)}
              >
                <div className="flex items-start gap-2">
                  <span className="text-xs font-bold text-primary/60 mt-0.5 shrink-0">{i + 1}</span>
                  <p className="text-sm italic text-muted-foreground group-hover:text-foreground transition-colors">"{tagline}"</p>
                </div>
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground text-center">Click any tagline to apply it to your poster</p>
        </DialogContent>
      </Dialog>

      {/* ── Brand Kit Dialog ── */}
      <Dialog open={showBrandKitDialog} onOpenChange={setShowBrandKitDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Paintbrush className="h-5 w-5 text-purple-400" /> AI Brand Kit</DialogTitle>
          </DialogHeader>
          {brandKit && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold">{brandKit.colorPaletteName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{brandKit.moodDescription}</p>
              </div>
              <div className="flex gap-2">
                {[brandKit.backgroundColor, brandKit.primaryColor, brandKit.secondaryColor, brandKit.textColor, brandKit.accentColor].map((color: string, i: number) => (
                  <div key={i} className="flex-1 h-10 rounded-lg border border-border/50" style={{ backgroundColor: color }} title={color} />
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-muted/30 rounded-xl p-3">
                  <p className="text-muted-foreground">Title Font</p>
                  <p className="font-semibold mt-0.5" style={{ fontFamily: brandKit.titleFont }}>{brandKit.titleFont}</p>
                </div>
                <div className="bg-muted/30 rounded-xl p-3">
                  <p className="text-muted-foreground">Body Font</p>
                  <p className="font-semibold mt-0.5" style={{ fontFamily: brandKit.bodyFont }}>{brandKit.bodyFont}</p>
                </div>
              </div>
              <div className="bg-muted/30 rounded-xl p-3 text-xs">
                <p className="text-muted-foreground">Logo Concept</p>
                <p className="mt-0.5">{brandKit.logoConceptDescription}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBrandKitDialog(false)}>Close</Button>
            <Button className="gap-2 bg-purple-600 hover:bg-purple-700" onClick={applyBrandKit}>
              <Paintbrush className="h-4 w-4" /> Apply to Canvas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function getMockupWrapper(mode: "phone" | "laptop" | "billboard") {
  if (mode === "phone") return "relative p-4 bg-[#1a1a1a] rounded-[40px] border-4 border-[#333] shadow-2xl";
  if (mode === "laptop") return "relative p-6 pb-2 bg-[#2a2a2a] rounded-t-2xl border-4 border-[#444] shadow-2xl";
  return "relative p-8 bg-[#1a1a1a] rounded-sm border-8 border-[#555] shadow-2xl";
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
  instagram: { name: "Instagram", icon: "📸", color: "border-pink-500/30 bg-pink-500/5",    maxFileSizeMB: 8,   formats: "JPG, PNG", notes: "Max 8 MB. 1080px wide. Ratios: 1:1, 4:5, 9:16." },
  tiktok:    { name: "TikTok",    icon: "🎵", color: "border-cyan-500/30 bg-cyan-500/5",    maxFileSizeMB: 20,  formats: "JPG, PNG, MP4", notes: "Max 20 MB. Videos: 9:16, up to 60s. Min 720p." },
  facebook:  { name: "Facebook",  icon: "📘", color: "border-blue-500/30 bg-blue-500/5",    maxFileSizeMB: 30,  formats: "JPG, PNG", notes: "Max 30 MB. Feed: 1.91:1. Stories: 9:16." },
  discord:   { name: "Discord",   icon: "💬", color: "border-indigo-500/30 bg-indigo-500/5", maxFileSizeMB: 8,   formats: "JPG, PNG, GIF", notes: "Max 8 MB. Banner: 960×540. Embeds: 16:9." },
  youtube:   { name: "YouTube",   icon: "▶️", color: "border-red-500/30 bg-red-500/5",      maxFileSizeMB: 2,   formats: "JPG, PNG", notes: "Thumbnails: max 2 MB, 1280×720." },
};

function PublishTab({ currentTemplate }: { currentTemplate: TemplateType }) {
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
      const canvas = document.querySelector("canvas") as HTMLCanvasElement | null;
      let mediaUrl: string;
      if (canvas) {
        const dataUrl = canvas.toDataURL("image/png");
        const base64 = dataUrl.split(",")[1];
        const uploaded = await uploadMutation.mutateAsync({ base64, filename: `ad-${Date.now()}.png`, contentType: "image/png" });
        mediaUrl = uploaded.url;
      } else {
        toast.error("Could not capture canvas. Export the image first.");
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
      <div>
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Caption / Post Text</Label>
        <Textarea
          className="mt-1.5 text-xs resize-none"
          rows={3}
          placeholder="Write your post caption here..."
          value={publishCaption}
          onChange={(e) => setPublishCaption(e.target.value)} autoCapitalize="sentences" autoCorrect="on" enterKeyHint="done" />
      </div>
      <div className="space-y-2">
        {Object.entries(PLATFORM_META).map(([platformId, meta]) => {
          const connected = getConnected(platformId);
          const suggestedTemplates = PLATFORM_TEMPLATES[platformId] || [];
          const isCurrentOptimal = suggestedTemplates.includes(currentTemplate);
          return (
            <div key={platformId} className={`rounded-xl border p-3 ${meta.color}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-lg shrink-0">{meta.icon}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-medium text-sm">{meta.name}</span>
                      {connected ? (
                        <Badge className="text-[10px] bg-green-500/20 text-green-400 border-green-500/30 h-4">
                          <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />Connected
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground h-4">Not connected</Badge>
                      )}
                      {isCurrentOptimal && (
                        <Badge className="text-[10px] bg-amber-500/20 text-amber-400 border-amber-500/30 h-4">✓ Optimal</Badge>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{meta.notes}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
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
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Festival & Distribution Tab ─────────────────────────────────────────────

const FESTIVAL_PLATFORMS = [
  { name: "FilmFreeway",     icon: "🏆", description: "World's leading festival submission platform. 10,000+ festivals.", url: "https://filmfreeway.com",      type: "submission" },
  { name: "Festhome",        icon: "🌟", description: "5,000+ festivals worldwide with easy online submissions.",         url: "https://festhome.com",         type: "submission" },
  { name: "Vimeo On Demand", icon: "📡", description: "Self-distribute directly to audiences. Set your own price.",       url: "https://vimeo.com/ondemand",   type: "distribution" },
  { name: "Reelport",        icon: "📦", description: "European film distribution and festival submission platform.",     url: "https://www.reelport.com",     type: "distribution" },
];

function FestivalTab() {
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Festival & Distribution</Label>
        <div className="space-y-2 mt-2">
          {["submission", "distribution"].map((type) => (
            <div key={type}>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                {type === "submission" ? "🏆 Festival Submissions" : "📡 Self-Distribution"}
              </p>
              <div className="space-y-1.5">
                {FESTIVAL_PLATFORMS.filter((p) => p.type === type).map((platform) => (
                  <div key={platform.name} className="flex items-start justify-between gap-3 rounded-xl border border-border/50 bg-muted/20 p-3">
                    <div className="flex items-start gap-2">
                      <span className="text-lg mt-0.5">{platform.icon}</span>
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
        </div>
      </div>

      <div>
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Press Kit Checklist</Label>
        <div className="space-y-1.5 mt-2">
          {[
            { item: "Movie Poster (27×40)", template: "poster" },
            { item: "Festival Submission Poster", template: "withoutabox-poster" },
            { item: "Press Kit Layout", template: "press-kit" },
            { item: "Trailer Card / Thumbnail", template: "trailer-card" },
            { item: "Event Flyer (Premiere)", template: "event-flyer" },
            { item: "Letterbox Banner", template: "letterbox" },
          ].map((row) => (
            <div key={row.item} className="flex items-center justify-between text-xs bg-muted/20 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500/60" />
                <span>{row.item}</span>
              </div>
              <Badge variant="outline" className="text-[10px]">{TEMPLATE_CONFIG[row.template as TemplateType]?.label}</Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Influencer Kit Tab ───────────────────────────────────────────────────────

function InfluencerKitTab({ projectTitle, projectGenre, projectLogline }: { projectTitle?: string; projectGenre?: string; projectLogline?: string }) {
  const [filmTitle, setFilmTitle] = useState(projectTitle || "");
  const [genre, setGenre] = useState(projectGenre || "");
  const [logline, setLogline] = useState(projectLogline || "");
  const [generatedKit, setGeneratedKit] = useState<{ caption: string; hashtags: string; emailPitch: string; linkedinPost: string; pressRelease?: string } | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>("caption");

  useEffect(() => {
    if (projectTitle) setFilmTitle(projectTitle);
    if (projectGenre) setGenre(projectGenre);
    if (projectLogline) setLogline(projectLogline.substring(0, 100));
  }, [projectTitle, projectGenre, projectLogline]);

  const generateKitMutation = trpc.poster.generateInfluencerKit.useMutation({
    onSuccess: (data) => {
      if (data) { setGeneratedKit(data); toast.success("Influencer kit generated!"); }
    },
    onError: () => toast.error("Generation failed. Please try again."),
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success(`${label} copied!`));
  };

  const kitSections = generatedKit ? [
    { label: "Social Caption", key: "caption" as const, icon: "📸" },
    { label: "Hashtags", key: "hashtags" as const, icon: "#️⃣" },
    { label: "Email Pitch", key: "emailPitch" as const, icon: "✉️" },
    { label: "LinkedIn Post", key: "linkedinPost" as const, icon: "💼" },
    ...(generatedKit.pressRelease ? [{ label: "Press Release", key: "pressRelease" as const, icon: "📰" }] : []),
  ] : [];

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Influencer Outreach Kit</Label>
        <p className="text-[11px] text-muted-foreground mt-0.5">Generate professional outreach copy for critics, influencers & industry contacts.</p>
      </div>

      <div className="space-y-2">
        <div>
          <Label className="text-xs">Film Title</Label>
          <Input className="mt-1 h-8 text-xs" placeholder="e.g. The Last Signal" value={filmTitle} onChange={(e) => setFilmTitle(e.target.value)} autoCapitalize="sentences" autoCorrect="on" enterKeyHint="next" />
        </div>
        <div>
          <Label className="text-xs">Genre</Label>
          <Input className="mt-1 h-8 text-xs" placeholder="e.g. Sci-Fi Thriller" value={genre} onChange={(e) => setGenre(e.target.value)} autoCapitalize="sentences" autoCorrect="on" enterKeyHint="next" />
        </div>
        <div>
          <Label className="text-xs">Logline (optional)</Label>
          <Textarea className="mt-1 text-xs resize-none" rows={2} placeholder="One-sentence pitch..." value={logline} onChange={(e) => setLogline(e.target.value)} autoCapitalize="sentences" autoCorrect="on" enterKeyHint="done" />
        </div>
        <Button
          size="sm"
          className="gap-1.5 w-full bg-amber-500 hover:bg-amber-600 text-black text-xs h-9"
          onClick={() => { if (!filmTitle) { toast.error("Please enter a film title"); return; } generateKitMutation.mutate({ title: filmTitle, genre, logline }); }}
          disabled={generateKitMutation.isPending}
        >
          {generateKitMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          Generate Full Kit
        </Button>
      </div>

      {generatedKit && (
        <div className="space-y-2">
          {kitSections.map(({ label, key, icon }) => (
            <div key={key} className="border border-border/50 rounded-xl overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-muted/40 transition-colors"
                onClick={() => setExpandedSection(expandedSection === key ? null : key)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">{icon}</span>
                  <span className="text-xs font-medium">{label}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost" size="icon" className="h-6 w-6"
                    onClick={(e) => { e.stopPropagation(); copyToClipboard(generatedKit[key as keyof typeof generatedKit] || "", label); }}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  {expandedSection === key ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                </div>
              </button>
              {expandedSection === key && (
                <div className="px-3 pb-3 border-t border-border/30">
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed pt-2">{generatedKit[key as keyof typeof generatedKit]}</p>
                </div>
              )}
            </div>
          ))}
        </div>
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
