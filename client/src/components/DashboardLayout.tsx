import { useAuth } from "@/_core/hooks/useAuth";
import LeegoFooter from "@/components/LeegoFooterLaunch";
import LeegoLogo from "@/components/LeegoLogo";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/useMobile";
import { useSubscription } from "@/hooks/useSubscription";
import { useTheme } from "@/contexts/ThemeContext";
import {
  LayoutDashboard,
  Film,
  Users,
  LogOut,
  PanelLeft,
  Sun,
  Moon,
  Clapperboard,
  Shield,
  ShieldAlert,
  Megaphone,
  CreditCard,
  Gift,
  BookOpen,
  Settings,
  ShoppingBag,
  Wand2,
  Globe,
  Key,
  PlaySquare,
  Zap,
  PenTool,
  BarChart3,
  Search,
  Coins,
  Smartphone,
  Mail,
  DollarSign,
  Headphones,
  Languages,
  MessageSquare,
  TrendingUp,
  Star,
  Rocket,
  Building2,
  Calendar,
  ClipboardList,
  Scissors,
  Tv,
  FileText,
  Calculator,
  Shirt,
  Store,
  Camera,
  Package,
  Settings2,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import NotificationBell from "./NotificationBell";
import RenderQueueTray from "./RenderQueueTray";
import { HollywoodIcon } from "./HollywoodIcon";
import { ToolIconKey } from "@/constants/hollywoodIcons";
import GoldWatermarkLaunch from "@/components/GoldWatermarkLaunch";

// Navigation grouped by production pipeline logic
const menuGroups = [
    {
      label: "My Films",
      items: [
        { icon: Film, label: "Projects", path: "/projects" },
        { icon: Clapperboard, label: "My Movies", path: "/movies" },
        { icon: Tv, label: "Series", path: "/series" },
        { icon: MessageSquare, label: "Director's AI", path: "/assistant", hollywoodKey: "director_chat" as ToolIconKey },
      ],
    },
    {
      label: "Cast & Talent",
      items: [
        { icon: Users, label: "Characters", path: "/characters", hollywoodKey: "characters" as ToolIconKey },
        { icon: Star, label: "Signature Cast", path: "/signature-cast" },
        { icon: Search, label: "Talent Search", path: "/talent-search" },
      ],
    },
    {
      label: "Marketing & Release",
      items: [
        { icon: Megaphone, label: "Poster Maker", path: "/poster-maker", hollywoodKey: "poster_maker" as ToolIconKey },
        { icon: PenTool, label: "Content Creator", path: "/content-creator" },
        { icon: Globe, label: "Film Showcase", path: "/showcase" },
        { icon: Calendar, label: "Festival Tracker", path: "/festivals" },
        { icon: Wand2, label: "Campaigns", path: "/campaigns" },
      ],
    },
    {
      label: "Funding",
      items: [
        { icon: DollarSign, label: "Funding Directory", path: "/funding" },
        { icon: Rocket, label: "Crowdfunding", path: "/crowdfunding" },
        { icon: Building2, label: "Brand Outreach", path: "/brand-outreach" },
      ],
    },
    {
      label: "Marketplace",
      items: [
        { icon: ShoppingBag, label: "Asset Market", path: "/marketplace", hollywoodKey: "asset_marketplace" as ToolIconKey },
        { icon: Shirt, label: "Wardrobe", path: "/wardrobe-marketplace" },
      ],
    },
    {
      label: "Account",
      items: [
        { icon: CreditCard, label: "Subscription", path: "/pricing", hollywoodKey: "subscription_plans" as ToolIconKey },
        { icon: Coins, label: "Credits", path: "/credits", hollywoodKey: "credits" as ToolIconKey },
        { icon: Gift, label: "Referrals", path: "/referrals", hollywoodKey: "referrals" as ToolIconKey },
        { icon: Settings, label: "Settings", path: "/settings", hollywoodKey: "settings" as ToolIconKey },
      ],
    },
  ];

// Flat list for backward compatibility
const menuItems = menuGroups.flatMap((g) => g.items);

const adminMenuItems = [
  { icon: Settings2, label: "Admin & Seeding", path: "/admin" },
  { icon: Shield, label: "User Management", path: "/admin/users" },
  { icon: ShieldAlert, label: "Security", path: "/admin/security" },
  { icon: TrendingUp, label: "Growth Dashboard", path: "/admin/growth" },
  { icon: Zap, label: "Autonomous Pipeline", path: "/admin/autonomous" },
  { icon: BarChart3, label: "Advertising", path: "/admin/advertising" },
  { icon: Search, label: "SEO Dashboard", path: "/admin/seo" },
  { icon: Mail, label: "Outreach & Email", path: "/admin/outreach" },
  { icon: Star, label: "Signature Cast", path: "/admin/signature-cast" },
];

const SUPPORTED_LANGUAGES = [
  // Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ English-speaking markets Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ
  { code: "en", name: "English", dir: "ltr", flag: "Ã°ÂÂÂºÃ°ÂÂÂ¸" },
  // Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ South Asian cinema (Bollywood, Tamil, Telugu, Bengali) Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ
  { code: "hi", name: "Ã Â¤Â¹Ã Â¤Â¿Ã Â¤Â¨Ã Â¥ÂÃ Â¤Â¦Ã Â¥Â (Hindi)", dir: "ltr", flag: "Ã°ÂÂÂ®Ã°ÂÂÂ³" },
  { code: "ta", name: "Ã Â®Â¤Ã Â®Â®Ã Â®Â¿Ã Â®Â´Ã Â¯Â (Tamil)", dir: "ltr", flag: "Ã°ÂÂÂ®Ã°ÂÂÂ³" },
  { code: "te", name: "Ã Â°Â¤Ã Â±ÂÃ Â°Â²Ã Â±ÂÃ Â°ÂÃ Â±Â (Telugu)", dir: "ltr", flag: "Ã°ÂÂÂ®Ã°ÂÂÂ³" },
  { code: "bn", name: "Ã Â¦Â¬Ã Â¦Â¾Ã Â¦ÂÃ Â¦Â²Ã Â¦Â¾ (Bengali)", dir: "ltr", flag: "Ã°ÂÂÂ§Ã°ÂÂÂ©" },
  { code: "ml", name: "Ã Â´Â®Ã Â´Â²Ã Â´Â¯Ã Â´Â¾Ã Â´Â³Ã Â´Â (Malayalam)", dir: "ltr", flag: "Ã°ÂÂÂ®Ã°ÂÂÂ³" },
  { code: "mr", name: "Ã Â¤Â®Ã Â¤Â°Ã Â¤Â¾Ã Â¤Â Ã Â¥Â (Marathi)", dir: "ltr", flag: "Ã°ÂÂÂ®Ã°ÂÂÂ³" },
  // Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ East Asian cinema (Korean Wave, J-Cinema, Chinese) Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ
  { code: "ko", name: "Ã­ÂÂÃªÂµÂ­Ã¬ÂÂ´ (Korean)", dir: "ltr", flag: "Ã°ÂÂÂ°Ã°ÂÂÂ·" },
  { code: "ja", name: "Ã¦ÂÂ¥Ã¦ÂÂ¬Ã¨ÂªÂ (Japanese)", dir: "ltr", flag: "Ã°ÂÂÂ¯Ã°ÂÂÂµ" },
  { code: "zh", name: "Ã¤Â¸Â­Ã¦ÂÂ Ã¦ÂÂ®Ã©ÂÂÃ¨Â¯Â (Mandarin)", dir: "ltr", flag: "Ã°ÂÂÂ¨Ã°ÂÂÂ³" },
  { code: "zh-TW", name: "Ã¤Â¸Â­Ã¦ÂÂ Ã§Â¹ÂÃ©Â«Â (Cantonese/HK)", dir: "ltr", flag: "Ã°ÂÂÂ­Ã°ÂÂÂ°" },
  // Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ Middle Eastern & North African cinema Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ
  { code: "ar", name: "ÃÂ§ÃÂÃÂ¹ÃÂ±ÃÂ¨ÃÂÃÂ© (Arabic)", dir: "rtl", flag: "Ã°ÂÂÂ¸Ã°ÂÂÂ¦" },
  { code: "he", name: "ÃÂ¢ÃÂÃÂ¨ÃÂÃÂª (Hebrew)", dir: "rtl", flag: "Ã°ÂÂÂ®Ã°ÂÂÂ±" },
  { code: "fa", name: "ÃÂÃÂ§ÃÂ±ÃÂ³ÃÂ (Persian/Farsi)", dir: "rtl", flag: "Ã°ÂÂÂ®Ã°ÂÂÂ·" },
  { code: "tr", name: "TÃÂ¼rkÃÂ§e (Turkish)", dir: "ltr", flag: "Ã°ÂÂÂ¹Ã°ÂÂÂ·" },
  // Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ European cinema Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ
  { code: "fr", name: "FranÃÂ§ais", dir: "ltr", flag: "Ã°ÂÂÂ«Ã°ÂÂÂ·" },
  { code: "es", name: "EspaÃÂ±ol", dir: "ltr", flag: "Ã°ÂÂÂªÃ°ÂÂÂ¸" },
  { code: "es-MX", name: "EspaÃÂ±ol (MÃÂ©xico)", dir: "ltr", flag: "Ã°ÂÂÂ²Ã°ÂÂÂ½" },
  { code: "it", name: "Italiano", dir: "ltr", flag: "Ã°ÂÂÂ®Ã°ÂÂÂ¹" },
  { code: "de", name: "Deutsch", dir: "ltr", flag: "Ã°ÂÂÂ©Ã°ÂÂÂª" },
  { code: "pt", name: "PortuguÃÂªs (Brasil)", dir: "ltr", flag: "Ã°ÂÂÂ§Ã°ÂÂÂ·" },
  { code: "pt-PT", name: "PortuguÃÂªs (Portugal)", dir: "ltr", flag: "Ã°ÂÂÂµÃ°ÂÂÂ¹" },
  { code: "ru", name: "ÃÂ ÃÂÃÂÃÂÃÂºÃÂ¸ÃÂ¹", dir: "ltr", flag: "Ã°ÂÂÂ·Ã°ÂÂÂº" },
  { code: "pl", name: "Polski", dir: "ltr", flag: "Ã°ÂÂÂµÃ°ÂÂÂ±" },
  { code: "nl", name: "Nederlands", dir: "ltr", flag: "Ã°ÂÂÂ³Ã°ÂÂÂ±" },
  { code: "sv", name: "Svenska", dir: "ltr", flag: "Ã°ÂÂÂ¸Ã°ÂÂÂª" },
  { code: "da", name: "Dansk", dir: "ltr", flag: "Ã°ÂÂÂ©Ã°ÂÂÂ°" },
  { code: "no", name: "Norsk", dir: "ltr", flag: "Ã°ÂÂÂ³Ã°ÂÂÂ´" },
  { code: "fi", name: "Suomi", dir: "ltr", flag: "Ã°ÂÂÂ«Ã°ÂÂÂ®" },
  { code: "el", name: "ÃÂÃÂ»ÃÂ»ÃÂ·ÃÂ½ÃÂ¹ÃÂºÃÂ¬ (Greek)", dir: "ltr", flag: "Ã°ÂÂÂ¬Ã°ÂÂÂ·" },
  { code: "cs", name: "ÃÂeÃÂ¡tina (Czech)", dir: "ltr", flag: "Ã°ÂÂÂ¨Ã°ÂÂÂ¿" },
  { code: "hu", name: "Magyar (Hungarian)", dir: "ltr", flag: "Ã°ÂÂÂ­Ã°ÂÂÂº" },
  { code: "ro", name: "RomÃÂ¢nÃÂ", dir: "ltr", flag: "Ã°ÂÂÂ·Ã°ÂÂÂ´" },
  { code: "uk", name: "ÃÂ£ÃÂºÃÂÃÂ°ÃÂÃÂ½ÃÂÃÂÃÂºÃÂ° (Ukrainian)", dir: "ltr", flag: "Ã°ÂÂÂºÃ°ÂÂÂ¦" },
  // Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ African cinema (Nollywood, South African, East African) Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ
  { code: "yo", name: "YorÃÂ¹bÃÂ¡", dir: "ltr", flag: "Ã°ÂÂÂ³Ã°ÂÂÂ¬" },
  { code: "ig", name: "Igbo", dir: "ltr", flag: "Ã°ÂÂÂ³Ã°ÂÂÂ¬" },
  { code: "ha", name: "Hausa", dir: "ltr", flag: "Ã°ÂÂÂ³Ã°ÂÂÂ¬" },
  { code: "sw", name: "Kiswahili", dir: "ltr", flag: "Ã°ÂÂÂ°Ã°ÂÂÂª" },
  { code: "am", name: "Ã¡ÂÂ Ã¡ÂÂÃ¡ÂÂ­Ã¡ÂÂ (Amharic)", dir: "ltr", flag: "Ã°ÂÂÂªÃ°ÂÂÂ¹" },
  { code: "zu", name: "isiZulu", dir: "ltr", flag: "Ã°ÂÂÂ¿Ã°ÂÂÂ¦" },
  { code: "af", name: "Afrikaans", dir: "ltr", flag: "Ã°ÂÂÂ¿Ã°ÂÂÂ¦" },
  // Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ Southeast Asian cinema Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ
  { code: "th", name: "Ã Â¸Â Ã Â¸Â²Ã Â¸Â©Ã Â¸Â²Ã Â¹ÂÃ Â¸ÂÃ Â¸Â¢ (Thai)", dir: "ltr", flag: "Ã°ÂÂÂ¹Ã°ÂÂÂ­" },
  { code: "vi", name: "TiÃ¡ÂºÂ¿ng ViÃ¡Â»Ât (Vietnamese)", dir: "ltr", flag: "Ã°ÂÂÂ»Ã°ÂÂÂ³" },
  { code: "id", name: "Bahasa Indonesia", dir: "ltr", flag: "Ã°ÂÂÂ®Ã°ÂÂÂ©" },
  { code: "ms", name: "Bahasa Melayu", dir: "ltr", flag: "Ã°ÂÂÂ²Ã°ÂÂÂ¾" },
  { code: "tl", name: "Filipino", dir: "ltr", flag: "Ã°ÂÂÂµÃ°ÂÂÂ­" },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 240;
const MIN_WIDTH = 200;
const MAX_WIDTH = 360;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user, logout } = useAuth();
  const [currentPath] = useLocation();
  // Public routes that should NOT be redirected even if unauthenticated
  const PUBLIC_ROUTES = [
    '/about', '/faq', '/solutions', '/download', '/app',
    '/how-it-works', '/welcome', '/login', '/register', '/pricing',
    '/contact', '/blog', '/terms', '/privacy', '/acceptable-use',
    '/ai-content-policy', '/ip-policy', '/dmca', '/showcase',
    '/forgot-password', '/reset-password', '/subscription',
    '/signature-cast', '/talent-search',
    // Publicly shareable content Ã¢ÂÂ accessible without login
    '/share', '/films', '/creators', '/crowdfund', '/collections',
  ];
  // Use window.location.pathname as the authoritative path Ã¢ÂÂ wouter's useLocation()
  // may not reflect the actual URL during the initial render on hard page load.
  const actualPath = typeof window !== 'undefined' ? window.location.pathname : currentPath;
  const isPublicRoute = PUBLIC_ROUTES.some(r => actualPath === r || actualPath.startsWith(r + '/'));

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  useEffect(() => {
    // Re-check using window.location.pathname to avoid stale router state
    const path = window.location.pathname;
    const isPublic = PUBLIC_ROUTES.some(r => path === r || path.startsWith(r + '/'));
    if (!loading && !user && !isPublic) {
      // Redirect to landing page for unauthenticated visitors
      window.location.href = "/welcome";
    }
  }, [loading, user]);

  if (loading || (!user && !isPublicRoute)) {
    return <DashboardLayoutSkeleton />;
  }
  // If public route but no user, render children without the dashboard chrome
  if (!user && isPublicRoute) {
    return <>{children}</>;
  }
  // Admin route guard Ã¢ÂÂ non-admins are silently redirected to home
  if (actualPath.startsWith('/admin') && (user as any)?.role !== 'admin') {
    window.location.href = '/';
    return <DashboardLayoutSkeleton />;
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const { theme, toggleTheme, switchable } = useTheme();
  const [uiLang, setUiLang] = useState<string>(() => localStorage.getItem("virelle_ui_lang") || "en");
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  // Apply RTL direction when Hebrew or Arabic is selected
  useEffect(() => {
    const lang = SUPPORTED_LANGUAGES.find(l => l.code === uiLang);
    document.documentElement.dir = lang?.dir || "ltr";
    document.documentElement.lang = uiLang;
    localStorage.setItem("virelle_ui_lang", uiLang);
  }, [uiLang]);
  const { tier, isCreator } = useSubscription();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localAvatar, setLocalAvatar] = useState<string | undefined>(undefined);
  const avatarSrc = localAvatar ?? (user?.role === "admin" ? "/leego-logo.png" : (user as any)?.avatarUrl) ?? undefined;
  const handleAvatarClick = () => fileInputRef.current?.click();
  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const canvas = document.createElement("canvas");
    const img = new Image();
    img.onload = () => {
      const s = Math.min(400, img.width, img.height);
      canvas.width = s; canvas.height = s;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const scale = s / Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width * scale - s) / -2 / scale, (img.height * scale - s) / -2 / scale, img.width, img.height, 0, 0, s, s);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      fetch("/api/avatar", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ imageDataUrl: dataUrl }) })
        .then(r => r.ok ? r.json() : null).then(d => { if (d?.avatarUrl) setLocalAvatar(d.avatarUrl); }).catch(() => {});
    };
    img.src = URL.createObjectURL(file);
    e.target.value = "";
  };
  const isMobile = useIsMobile();

  const isActive = (path: string) => {
    if (path === "/") return location === "/";
    return location.startsWith(path);
  };

  useEffect(() => {
    if (isCollapsed) setIsResizing(false);
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };
    const handleMouseUp = () => setIsResizing(false);
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <GoldWatermarkLaunch />
      <div className="relative" ref={sidebarRef}>
        <Sidebar collapsible="icon" className="border-r-0" disableTransition={isResizing}>
          <SidebarHeader className="h-14 md:h-16 justify-center">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed && (
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <img src="/icons/icon.svg" alt="Virelle Studios" className="h-9 w-9 rounded shrink-0" />
                  <span className="font-bold tracking-tight truncate text-base">
                    Virelle Studios
                  </span>
                </div>
              )}
              {/* v6.62 Ã¢ÂÂ RenderQueueTray lives in the top bar only (see below)
                  so we don't end up with two trays polling at the same time on
                  desktop. The sidebar keeps just the NotificationBell. */}
              {!isCollapsed && <NotificationBell />}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0">
            {menuGroups.filter(group => group.label !== "Tools" || isCreator).map((group) => (
              <SidebarMenu key={group.label} className="px-2 py-1">
                <div className="px-2 mb-1 mt-2 group-data-[collapsible=icon]:hidden">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">{group.label}</span>
                </div>
                {group.items.map((item) => {
                  const active = isActive(item.path);
                  return (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton
                        isActive={active}
                        onClick={() => setLocation(item.path)}
                        tooltip={item.label}
                        className="h-9 md:h-10 transition-all font-normal"
                      >
                        {(item as any).hollywoodKey ? (
                          <HollywoodIcon
                            tool={(item as any).hollywoodKey as ToolIconKey}
                            size={18}
                            className={`shrink-0 transition-opacity ${active ? "opacity-100" : "opacity-60 hover:opacity-90"}`}
                          />
                        ) : (
                          <item.icon className={`h-4 w-4 ${active ? "text-amber-400" : ""}`} />
                        )}
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            ))}
            {/* Admin section - only visible to admins */}
            {user?.role === "admin" && (
              <SidebarMenu className="px-2 py-1 mt-4">
                <div className="px-2 mb-1 group-data-[collapsible=icon]:hidden">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">Admin</span>
                </div>
                {adminMenuItems.map((item) => {
                  const active = isActive(item.path);
                  return (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton
                        isActive={active}
                        onClick={() => setLocation(item.path)}
                        tooltip={item.label}
                        className="h-10 transition-all font-normal"
                      >
                        {(item as any).hollywoodKey ? (
                          <HollywoodIcon
                            tool={(item as any).hollywoodKey as ToolIconKey}
                            size={18}
                            className={`shrink-0 transition-opacity ${active ? "opacity-100" : "opacity-60 hover:opacity-90"}`}
                          />
                        ) : (
                          <item.icon className={`h-4 w-4 ${active ? "text-amber-400" : ""}`} />
                        )}
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            )}
          </SidebarContent>

          <SidebarFooter className="p-2 md:p-3 space-y-1 md:space-y-2">
            {/* Credit Balance Display */}
            {user && (
              <a
                href="/pricing"
                className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-accent/50 transition-colors group-data-[collapsible=icon]:justify-center"
                title={(user as any).isAdmin ? "Admin Ã¢ÂÂ Unlimited credits" : `${((user as any).creditBalance ?? 0).toLocaleString()} credits remaining Ã¢ÂÂ click to top up`}
              >
                <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 overflow-hidden" style={{ background: "linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%)", border: "1.5px solid #d4af37" }}>
                  <HollywoodIcon tool="credits" size={20} className="opacity-90" />
                </div>
                <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold" style={{ color: "#d4af37" }}>
                      {(user as any).isAdmin ? "Ã¢ÂÂ credits" : `${((user as any).creditBalance ?? 0).toLocaleString()} credits`}
                    </span>
                    {!(user as any).isAdmin && (
                      <span className="text-[9px] text-muted-foreground hover:text-amber-400 transition-colors">Top up Ã¢ÂÂ</span>
                    )}
                  </div>
                  <div className="mt-1 h-1 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        background: "linear-gradient(90deg, #d4af37, #f5e6a3)",
                        width: (user as any).isAdmin ? "100%" : `${Math.min(100, Math.max(2, (((user as any).creditBalance ?? 0) / 5000) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              </a>
            )}
            {/* Leego branding Ã¢ÂÂ tap to pulse to ~2cm for 2s, then shrink back */}
            <div className="flex justify-center items-center py-2 group-data-[collapsible=icon]:px-0">
              <LeegoLogo
                className="h-12 w-auto object-contain group-data-[collapsible=icon]:h-8 leego-glow"
              />
            </div>
            {/* Language Switcher */}
            <DropdownMenu open={langMenuOpen} onOpenChange={setLangMenuOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                  aria-label="Change language"
                  type="button"
                >
                  <Globe className="h-4 w-4 text-amber-400 shrink-0" />
                  <span className="text-sm group-data-[collapsible=icon]:hidden">
                    {SUPPORTED_LANGUAGES.find(l => l.code === uiLang)?.flag}{" "}
                    {SUPPORTED_LANGUAGES.find(l => l.code === uiLang)?.name || "Language"}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                align="start"
                avoidCollisions={true}
                collisionPadding={12}
                className="w-64 z-[9999]"
                sideOffset={8}
                style={{ maxHeight: "min(70vh, 400px)", overflowY: "auto", WebkitOverflowScrolling: "touch" }}
              >
                {SUPPORTED_LANGUAGES.map(lang => (
                  <DropdownMenuItem
                    key={lang.code}
                    onSelect={() => { setUiLang(lang.code); setLangMenuOpen(false); }}
                    className={`cursor-pointer gap-2 ${uiLang === lang.code ? "bg-accent font-medium" : ""}`}
                  >
                    <span className="text-base">{lang.flag}</span>
                    <span>{lang.name}</span>
                    {uiLang === lang.code && <span className="ml-auto text-amber-400 text-xs">Ã¢ÂÂ</span>}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Theme toggle */}
            {switchable && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={toggleTheme}
                    className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                    aria-label={theme === "dark" ? "Switch to day mode" : "Switch to night mode"}
                  >
                    {theme === "dark" ? (
                      <Sun className="h-4 w-4 text-amber-400 shrink-0" />
                    ) : (
                      <Moon className="h-4 w-4 text-amber-400 shrink-0" />
                    )}
                    <span className="text-sm group-data-[collapsible=icon]:hidden">
                      {theme === "dark" ? "Day Mode" : "Night Mode"}
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {theme === "dark" ? "Switch to day mode" : "Switch to night mode"}
                </TooltipContent>
              </Tooltip>
            )}

            {/* User profile */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400">
                  <Avatar className="h-8 w-8 border shrink-0 cursor-pointer hover:opacity-80 transition-opacity" onClick={handleAvatarClick} title="Change profile picture">
                    {avatarSrc && <img src={avatarSrc} alt="" className="absolute inset-0 w-full h-full object-cover rounded-full" />}
                    <AvatarFallback className="p-0 bg-transparent">
                      <img src="/leego-logo.png" alt="Leego" className="w-full h-full object-cover rounded-full" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none">
                      {user?.name || "Director"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-1">
                      {user?.email || ""}
                    </p>
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider mt-1 ${
                      user?.role === "admin" ? "bg-red-500/15 text-red-400 border border-red-500/30" :
                      (tier === "industry" || tier === "independent" || tier === "creator" || tier === "studio") ? "bg-violet-500/10 text-violet-400 border border-violet-500/20" :
                      tier === "amateur" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                      tier === "indie" ? "bg-green-500/10 text-green-400 border border-green-500/20" :
                      "bg-muted text-muted-foreground border border-border"
                    }`}>
                      {user?.role === "admin" ? "Ã¢Â­Â Admin" :
                       (tier === "industry" || tier === "independent" || tier === "creator" || tier === "studio") ? "Industry" :
                       tier === "amateur" ? "Creator" :
                       tier === "indie" ? "Indie" :
                       "Subscribe"}
                    </span>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={handleAvatarClick} className="cursor-pointer">
                  <Camera className="mr-2 h-4 w-4" />
                  <span>Change Photo</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarFile} />
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-amber-500/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {/* Mobile header */}
        {isMobile && (
          <div data-mobile-header className="flex border-b h-auto min-h-[4rem] items-center justify-between px-3 sticky top-0 z-40 shrink-0" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))', paddingBottom: '0.75rem' }}>
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-11 w-11 rounded-lg shrink-0" />
              <img src="/icons/icon.svg" alt="Virelle Studios" className="h-8 w-8 rounded shrink-0" />
              <span className="text-base font-bold truncate">Virelle Studios</span>
            </div>
            {switchable && (
              <button
                onClick={toggleTheme}
                className="h-11 w-11 flex items-center justify-center rounded-lg hover:bg-accent active:bg-accent/70 transition-colors shrink-0"
                aria-label="Toggle theme"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            )}
          </div>
        )}
        {/* Desktop header */}
        {!isMobile && (
          <div className="flex border-b h-14 items-center justify-between px-4 sticky top-0 z-40" style={{ borderColor:"rgba(255,255,255,0.07)", background:"rgba(7,7,14,0.97)", backdropFilter:"blur(24px)" }}>
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg" />
              <span className="text-sm text-muted-foreground hidden sm:block">
                {[...menuItems, ...adminMenuItems].find(m => m.path === '/' ? location === '/' : location.startsWith(m.path))?.label || 'Dashboard'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, ctrlKey: true }))}
                className="hidden md:flex items-center gap-2 h-9 px-3 rounded-lg transition-colors text-xs text-muted-foreground" style={{ border:"1px solid rgba(255,255,255,0.1)", background:"rgba(255,255,255,0.04)" }}
                aria-label="Open command palette"
                title="Quick navigation (Ã¢ÂÂK)"
              >
                <Search className="h-3.5 w-3.5" />
                <span>SearchÃ¢ÂÂ¦</span>
                <kbd className="ml-2 px-1.5 py-0.5 text-[10px] font-mono rounded bg-background/80 border border-border/40">Ã¢ÂÂK</kbd>
              </button>
              <RenderQueueTray />
              <NotificationBell />
              {switchable && (
                <button
                  onClick={toggleTheme}
                  className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-accent transition-colors"
                  aria-label="Toggle theme"
                >
                  {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-accent/50 transition-colors focus:outline-none">
                    <Avatar className="h-7 w-7 border shrink-0">
                      <AvatarFallback className="p-0 bg-transparent">
                        <img src="/leego-logo.png" alt="Leego" className="w-full h-full object-cover rounded-full" />
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium hidden md:block">{user?.name || 'Director'}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sign out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        )}
        <main className="flex-1 p-4 sm:p-6 flex flex-col min-h-0 relative z-10 overscroll-contain" style={{ paddingBottom: 'max(4rem, calc(env(safe-area-inset-bottom) + 2rem))' }}>
          {/* Gold VS watermark branding Ã¢ÂÂ bottom-right corner, subtle and non-intrusive */}
          <div className="fixed bottom-4 right-4 pointer-events-none z-0">
            {/* Dark mode: soft golden logo */}
            <img
              src="/icons/icon.svg"
              alt=""
              className="hidden dark:block w-[100px] h-[100px] sm:w-[120px] sm:h-[120px] object-contain opacity-[0.055]"
              style={{ filter: "sepia(1) saturate(2.6) brightness(1.1) hue-rotate(8deg)" }}
              draggable={false}
            />
            {/* Light mode: very faint golden logo */}
            <img
              src="/icons/icon.svg"
              alt=""
              className="block dark:hidden w-[100px] h-[100px] sm:w-[120px] sm:h-[120px] object-contain opacity-[0.06]"
              style={{ filter: "sepia(1) saturate(2.1) brightness(1.02) hue-rotate(8deg) drop-shadow(0 0 1px rgba(0,0,0,0.18))" }}
              draggable={false}
            />
          </div>
          {/* Gold watermark — non-interactive, centered in content area */}
            <div className="fixed inset-0 flex items-center justify-center pointer-events-none select-none" style={{ zIndex: 0, left: 'var(--sidebar-width, 240px)' }}>
              <img src="/icons/icon.svg" alt="" className="w-72 h-72 opacity-[0.05] dark:opacity-[0.06]" style={{ filter: 'sepia(1) saturate(4) hue-rotate(5deg) brightness(1.2)' }} draggable={false} />
            </div>
            <div className="flex-1 relative z-10">{children}</div>
          <LeegoFooter />
        </main>
      </SidebarInset>
    </>
  );
}
