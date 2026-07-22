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
import { useTheme } from "@/contexts/ThemeContext";
import { useIsMobile } from "@/hooks/useMobile";
import { useSubscription } from "@/hooks/useSubscription";
import {
  BarChart3,
  Camera,
  Clapperboard,
  ChevronDown,
  Coins,
  DollarSign,
  Film,
  Globe,
  Headphones,
  Languages,
  LogOut,
  Mail,
  Megaphone,
  MessageSquare,
  Moon,
  PanelLeft,
  PlaySquare,
  Search,
  Settings,
  Settings2,
  Shield,
  ShieldAlert,
  ShoppingBag,
  Smartphone,
  Sparkles,
  MapPin,
  Captions,
  Star,
  Sun,
  TrendingUp,
  Users,
  Users2,
  Wand2,
  Zap,
} from "lucide-react";
import {
  CSSProperties,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocation } from "wouter";
import DirectorChat from "@/components/DirectorChat";
import GoldWatermarkLaunch from "@/components/GoldWatermarkLaunch";
import { HollywoodIcon } from "@/components/HollywoodIcon";
import NotificationBell from "@/components/NotificationBell";
import RenderQueueTray from "@/components/RenderQueueTray";
import { ToolIconKey } from "@/constants/hollywoodIcons";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

type MenuItem = {
  icon: typeof Film;
  label: string;
  path: string;
  hollywoodKey?: ToolIconKey;
};

type MenuGroup = {
  label: string;
  items: MenuItem[];
};

const menuGroups: MenuGroup[] = [
  {
    label: "Studio",
    items: [
      { icon: Film, label: "Projects", path: "/projects" },
      {
        icon: MessageSquare,
        label: "Director's AI",
        path: "/assistant",
        hollywoodKey: "director_chat",
      },
      {
        icon: Users,
        label: "Characters",
        path: "/characters",
        hollywoodKey: "characters",
      },
      { icon: Star, label: "Signature Cast", path: "/signature-cast" },
    ],
  },
  {
    label: "Create",
    items: [
      {
        icon: Megaphone,
        label: "Poster Maker",
        path: "/poster-maker",
        hollywoodKey: "poster_maker",
      },
      { icon: Zap, label: "VFX & Sound", path: "/vfx-studio" },
      { icon: MapPin, label: "Location Studio", path: "/location-studio" },
      { icon: Captions, label: "Accessibility Studio", path: "/accessibility-studio" },
      { icon: Smartphone, label: "Swappys (Mobile App)", path: "/download" },
      { icon: PlaySquare, label: "Broadcast / Studio Render", path: "/virelle-broadcast-render" },
      { icon: Headphones, label: "Music Studio", path: "/music-studio" },
      {
        icon: Languages,
        label: "Dubbing Studio",
        path: "/dubbing-studio",
      },
    ],
  },
  {
    label: "Release",
    items: [
      { icon: Globe, label: "Film Showcase", path: "/showcase" },
      { icon: Clapperboard, label: "Project Samples", path: "/samples" },
      { icon: DollarSign, label: "Funding", path: "/funding" },
      {
        icon: ShoppingBag,
        label: "Marketplace",
        path: "/marketplace",
        hollywoodKey: "asset_marketplace",
      },
      { icon: Wand2, label: "Campaigns", path: "/campaigns" },
      { icon: Users2, label: "Community", path: "/community" },
    ],
  },
  {
    label: "Account",
    items: [
      {
        icon: Coins,
        label: "Credits",
        path: "/credits",
        hollywoodKey: "credits",
      },
      {
        icon: Settings,
        label: "Settings",
        path: "/settings",
        hollywoodKey: "settings",
      },
    ],
  },
];

const adminMenuItems: MenuItem[] = [
  { icon: Settings2, label: "Admin & Seeding", path: "/admin" },
  { icon: Shield, label: "User Management", path: "/admin/users" },
  { icon: ShieldAlert, label: "Security", path: "/admin/security" },
  { icon: TrendingUp, label: "Growth Dashboard", path: "/admin/growth" },
  {
    icon: Zap,
    label: "Autonomous Pipeline",
    path: "/admin/autonomous",
  },
  { icon: BarChart3, label: "Advertising", path: "/admin/advertising" },
  { icon: Search, label: "SEO Dashboard", path: "/admin/seo" },
  { icon: Mail, label: "Outreach & Email", path: "/admin/outreach" },
  {
    icon: Star,
    label: "Signature Cast",
    path: "/admin/signature-cast",
  },
];

const menuItems = menuGroups.flatMap(group => group.items);

const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English", dir: "ltr", flag: "🇺🇸" },
  { code: "hi", name: "हिन्दी (Hindi)", dir: "ltr", flag: "🇮🇳" },
  { code: "ta", name: "தமிழ் (Tamil)", dir: "ltr", flag: "🇮🇳" },
  { code: "te", name: "తెలుగు (Telugu)", dir: "ltr", flag: "🇮🇳" },
  { code: "bn", name: "বাংলা (Bengali)", dir: "ltr", flag: "🇧🇩" },
  { code: "ml", name: "മലയാളം (Malayalam)", dir: "ltr", flag: "🇮🇳" },
  { code: "mr", name: "मराठी (Marathi)", dir: "ltr", flag: "🇮🇳" },
  { code: "ko", name: "한국어 (Korean)", dir: "ltr", flag: "🇰🇷" },
  { code: "ja", name: "日本語 (Japanese)", dir: "ltr", flag: "🇯🇵" },
  { code: "zh", name: "中文普通话 (Mandarin)", dir: "ltr", flag: "🇨🇳" },
  { code: "zh-TW", name: "中文繁體 (Cantonese/HK)", dir: "ltr", flag: "🇭🇰" },
  { code: "ar", name: "العربية (Arabic)", dir: "rtl", flag: "🇸🇦" },
  { code: "he", name: "עברית (Hebrew)", dir: "rtl", flag: "🇮🇱" },
  { code: "fa", name: "فارسی (Persian/Farsi)", dir: "rtl", flag: "🇮🇷" },
  { code: "tr", name: "Türkçe (Turkish)", dir: "ltr", flag: "🇹🇷" },
  { code: "fr", name: "Français", dir: "ltr", flag: "🇫🇷" },
  { code: "es", name: "Español", dir: "ltr", flag: "🇪🇸" },
  { code: "es-MX", name: "Español (México)", dir: "ltr", flag: "🇲🇽" },
  { code: "it", name: "Italiano", dir: "ltr", flag: "🇮🇹" },
  { code: "de", name: "Deutsch", dir: "ltr", flag: "🇩🇪" },
  { code: "pt", name: "Português (Brasil)", dir: "ltr", flag: "🇧🇷" },
  { code: "pt-PT", name: "Português (Portugal)", dir: "ltr", flag: "🇵🇹" },
  { code: "ru", name: "Русский", dir: "ltr", flag: "🇷🇺" },
  { code: "pl", name: "Polski", dir: "ltr", flag: "🇵🇱" },
  { code: "nl", name: "Nederlands", dir: "ltr", flag: "🇳🇱" },
  { code: "sv", name: "Svenska", dir: "ltr", flag: "🇸🇪" },
  { code: "da", name: "Dansk", dir: "ltr", flag: "🇩🇰" },
  { code: "no", name: "Norsk", dir: "ltr", flag: "🇳🇴" },
  { code: "fi", name: "Suomi", dir: "ltr", flag: "🇫🇮" },
  { code: "el", name: "Ελληνικά (Greek)", dir: "ltr", flag: "🇬🇷" },
  { code: "cs", name: "Čeština (Czech)", dir: "ltr", flag: "🇨🇿" },
  { code: "hu", name: "Magyar (Hungarian)", dir: "ltr", flag: "🇭🇺" },
  { code: "ro", name: "Română", dir: "ltr", flag: "🇷🇴" },
  { code: "uk", name: "Українська (Ukrainian)", dir: "ltr", flag: "🇺🇦" },
  { code: "yo", name: "Yorùbá", dir: "ltr", flag: "🇳🇬" },
  { code: "ig", name: "Igbo", dir: "ltr", flag: "🇳🇬" },
  { code: "ha", name: "Hausa", dir: "ltr", flag: "🇳🇬" },
  { code: "sw", name: "Kiswahili", dir: "ltr", flag: "🇰🇪" },
  { code: "am", name: "አማርኛ (Amharic)", dir: "ltr", flag: "🇪🇹" },
  { code: "zu", name: "isiZulu", dir: "ltr", flag: "🇿🇦" },
  { code: "af", name: "Afrikaans", dir: "ltr", flag: "🇿🇦" },
  { code: "th", name: "ภาษาไทย (Thai)", dir: "ltr", flag: "🇹🇭" },
  { code: "vi", name: "Tiếng Việt (Vietnamese)", dir: "ltr", flag: "🇻🇳" },
  { code: "id", name: "Bahasa Indonesia", dir: "ltr", flag: "🇮🇩" },
  { code: "ms", name: "Bahasa Melayu", dir: "ltr", flag: "🇲🇾" },
  { code: "tl", name: "Filipino", dir: "ltr", flag: "🇵🇭" },
] as const;

const PUBLIC_ROUTES = [
  "/about",
  "/faq",
  "/solutions",
  "/download",
  "/app",
  "/how-it-works",
  "/welcome",
  "/login",
  "/register",
  "/pricing",
  "/contact",
  "/blog",
  "/press",
  "/changelog",
  "/terms",
  "/privacy",
  "/acceptable-use",
  "/ai-content-policy",
  "/ip-policy",
  "/dmca",
  "/showcase",
  "/forgot-password",
  "/reset-password",
  "/subscription",
  "/signature-cast",
  "/talent-search",
  "/share",
  "/films",
  "/creators",
  "/crowdfund",
  "/collections",
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 232;
const MIN_WIDTH = 208;
const MAX_WIDTH = 320;

function isPublicPath(path: string) {
  return PUBLIC_ROUTES.some(
    route => path === route || path.startsWith(`${route}/`),
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_WIDTH;
    const saved = Number.parseInt(
      localStorage.getItem(SIDEBAR_WIDTH_KEY) || "",
      10,
    );
    return Number.isFinite(saved)
      ? Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, saved))
      : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();
  const [currentPath] = useLocation();
  const actualPath =
    typeof window !== "undefined"
      ? window.location.pathname
      : currentPath;
  const publicRoute = isPublicPath(actualPath);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, String(sidebarWidth));
  }, [sidebarWidth]);

  useEffect(() => {
    const path = window.location.pathname;
    if (!loading && !user && !isPublicPath(path)) {
      window.location.href = "/welcome";
    }
  }, [loading, user]);

  if (loading || (!user && !publicRoute)) {
    return <DashboardLayoutSkeleton />;
  }

  if (!user && publicRoute) {
    return <>{children}</>;
  }

  if (
    actualPath.startsWith("/admin") &&
    (user as any)?.role !== "admin"
  ) {
    window.location.href = "/";
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
  const {
    state,
    toggleSidebar,
    setOpenMobile,
  } = useSidebar();
  const { theme, toggleTheme, switchable } = useTheme();
  const { tier } = useSubscription();
  const isMobile = useIsMobile();
  const isCollapsed = state === "collapsed";
  const sidebarRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [localAvatar, setLocalAvatar] = useState<string>();
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [uiLang, setUiLang] = useState(() => {
    if (typeof window === "undefined") return "en";
    return localStorage.getItem("virelle_ui_lang") || "en";
  });
  const [openGroups, setOpenGroups] = useState<Set<string>>(
    () => new Set(["Studio"]),
  );

  const avatarSrc =
    localAvatar ??
    ((user as any)?.role === "admin"
      ? "/leego-logo.png"
      : (user as any)?.avatarUrl) ??
    undefined;

  const activeGroupLabel = useMemo(
    () =>
      menuGroups.find(group =>
        group.items.some(item =>
          item.path === "/"
            ? location === "/"
            : location.startsWith(item.path),
        ),
      )?.label,
    [location],
  );

  const pageTitle = useMemo(() => {
    const items = [...menuItems, ...adminMenuItems].sort(
      (a, b) => b.path.length - a.path.length,
    );
    return (
      items.find(item =>
        item.path === "/"
          ? location === "/"
          : location.startsWith(item.path),
      )?.label || "Dashboard"
    );
  }, [location]);

  useEffect(() => {
    const lang = SUPPORTED_LANGUAGES.find(
      item => item.code === uiLang,
    );
    document.documentElement.dir = lang?.dir || "ltr";
    document.documentElement.lang = uiLang;
    localStorage.setItem("virelle_ui_lang", uiLang);
  }, [uiLang]);

  useEffect(() => {
    if (!activeGroupLabel) return;
    setOpenGroups(current => {
      if (current.has(activeGroupLabel)) return current;
      const next = new Set(current);
      next.add(activeGroupLabel);
      return next;
    });
  }, [activeGroupLabel]);

  useEffect(() => {
    if (!location.startsWith("/admin")) return;
    setOpenGroups(current => {
      if (current.has("Admin")) return current;
      const next = new Set(current);
      next.add("Admin");
      return next;
    });
  }, [location]);

  useEffect(() => {
    if (isCollapsed) setIsResizing(false);
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!isResizing) return;
      const left =
        sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const width = event.clientX - left;
      if (width >= MIN_WIDTH && width <= MAX_WIDTH) {
        setSidebarWidth(width);
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

  const isActive = (path: string) =>
    path === "/"
      ? location === "/"
      : path === "/admin"
        ? location === "/admin"
        : location.startsWith(path);

  const navigate = (path: string) => {
    setLocation(path);
    if (isMobile) setOpenMobile(false);
  };

  const toggleGroup = (label: string) => {
    setOpenGroups(current => {
      const next = new Set(current);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleAvatarFile = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const canvas = document.createElement("canvas");
    const image = new Image();
    image.onload = () => {
      const size = Math.min(400, image.width, image.height);
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext("2d");
      if (!context) return;
      const crop = Math.min(image.width, image.height);
      const sourceX = (image.width - crop) / 2;
      const sourceY = (image.height - crop) / 2;
      context.drawImage(
        image,
        sourceX,
        sourceY,
        crop,
        crop,
        0,
        0,
        size,
        size,
      );
      const imageDataUrl = canvas.toDataURL("image/jpeg", 0.85);
      fetch("/api/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ imageDataUrl }),
      })
        .then(response => (response.ok ? response.json() : null))
        .then(data => {
          if (data?.avatarUrl) setLocalAvatar(data.avatarUrl);
        })
        .catch(() => undefined);
    };
    image.src = URL.createObjectURL(file);
    event.target.value = "";
  };

  const renderMenuItems = (items: MenuItem[]) =>
    items.map(item => {
      const active = isActive(item.path);
      return (
        <SidebarMenuItem key={`${item.label}-${item.path}`}>
          <SidebarMenuButton
            isActive={active}
            onClick={() => navigate(item.path)}
            tooltip={item.label}
            className="h-9 rounded-lg font-normal transition-colors"
          >
            {item.hollywoodKey ? (
              <HollywoodIcon
                tool={item.hollywoodKey}
                size={18}
                className={`shrink-0 ${
                  active ? "opacity-100" : "opacity-65"
                }`}
              />
            ) : (
              <item.icon
                className={`h-4 w-4 ${
                  active ? "text-amber-400" : ""
                }`}
              />
            )}
            <span className="truncate">{item.label}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    });

  const normalizedTier = String(tier || "");
  const profileBadge =
    (user as any)?.role === "admin"
      ? "Admin"
      : ["industry", "independent", "creator", "studio"].includes(
            normalizedTier,
          )
        ? "Industry"
        : normalizedTier === "amateur"
          ? "Creator"
          : normalizedTier === "indie"
            ? "Indie"
            : "Subscribe";

  return (
    <>
      <GoldWatermarkLaunch />

      <div ref={sidebarRef} className="relative">
        <Sidebar
          collapsible="icon"
          className="border-r border-border/50"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-14 justify-center border-b border-border/40 px-2">
            <div className="flex w-full items-center gap-2">
              <button
                onClick={toggleSidebar}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4" />
              </button>
              {!isCollapsed && (
                <button
                  onClick={() => navigate("/projects")}
                  className="flex min-w-0 flex-1 items-center gap-2 rounded-md text-left transition-opacity hover:opacity-80"
                >
                  <img
                    src="/virelle-logo-square.png"
                    alt="Virelle Studios"
                    className="h-8 w-8 shrink-0 rounded-md"
                  />
                  <span className="truncate text-sm font-semibold tracking-tight">
                    Virelle Studios
                  </span>
                </button>
              )}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-1 px-2 py-2">
            {menuGroups.map(group => {
              const expanded =
                isCollapsed || openGroups.has(group.label);
              return (
                <div key={group.label}>
                  {!isCollapsed && (
                    <button
                      onClick={() => toggleGroup(group.label)}
                      className="flex h-8 w-full items-center justify-between rounded-md px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/65 transition-colors hover:bg-accent/50 hover:text-foreground"
                      aria-expanded={expanded}
                    >
                      <span>{group.label}</span>
                      <ChevronDown
                        className={`h-3.5 w-3.5 transition-transform ${
                          expanded ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                  )}
                  {expanded && (
                    <SidebarMenu className="gap-0.5">
                      {renderMenuItems(group.items)}
                    </SidebarMenu>
                  )}
                </div>
              );
            })}

            {(user as any)?.role === "admin" && (
              <div className="mt-1 border-t border-border/40 pt-1">
                {!isCollapsed && (
                  <button
                    onClick={() => toggleGroup("Admin")}
                    className="flex h-8 w-full items-center justify-between rounded-md px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/65 transition-colors hover:bg-accent/50 hover:text-foreground"
                    aria-expanded={
                      isCollapsed || openGroups.has("Admin")
                    }
                  >
                    <span>Admin</span>
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition-transform ${
                        openGroups.has("Admin") ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                )}
                {(isCollapsed || openGroups.has("Admin")) && (
                  <SidebarMenu className="gap-0.5">
                    {renderMenuItems(adminMenuItems)}
                  </SidebarMenu>
                )}
              </div>
            )}
          </SidebarContent>

          <SidebarFooter className="gap-2 border-t border-border/40 p-2">
            {user && (
              <button
                onClick={() => navigate("/credits")}
                className="flex w-full items-center gap-2 rounded-lg border border-border/50 bg-muted/20 p-2 text-left transition-colors hover:bg-accent/50 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:bg-transparent"
                title={
                  (user as any).isAdmin
                    ? "Admin — Unlimited credits"
                    : `${(
                        (user as any).creditBalance ?? 0
                      ).toLocaleString()} credits remaining`
                }
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-amber-500/40 bg-background">
                  <HollywoodIcon
                    tool="credits"
                    size={19}
                    className="opacity-90"
                  />
                </div>
                <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                  <p className="truncate text-xs font-semibold text-amber-400">
                    {(user as any).isAdmin
                      ? "Unlimited credits"
                      : `${(
                          (user as any).creditBalance ?? 0
                        ).toLocaleString()} credits`}
                  </p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {(user as any).isAdmin
                      ? "Administrator access"
                      : "View balance and top up"}
                  </p>
                </div>
              </button>
            )}

            {!isCollapsed && (
              <div className="flex items-center justify-between gap-1 px-1">
                <DropdownMenu
                  open={langMenuOpen}
                  onOpenChange={setLangMenuOpen}
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <button
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                          aria-label="Change language"
                        >
                          <Globe className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      Change language
                    </TooltipContent>
                  </Tooltip>
                  <DropdownMenuContent
                    side="top"
                    align="start"
                    className="z-[9999] w-64 overflow-y-auto"
                    style={{
                      maxHeight: "min(70vh, 400px)",
                      WebkitOverflowScrolling: "touch",
                    }}
                  >
                    {SUPPORTED_LANGUAGES.map(language => (
                      <DropdownMenuItem
                        key={language.code}
                        onSelect={() => {
                          setUiLang(language.code);
                          setLangMenuOpen(false);
                        }}
                        className={`cursor-pointer gap-2 ${
                          uiLang === language.code
                            ? "bg-accent font-medium"
                            : ""
                        }`}
                      >
                        <span>{language.flag}</span>
                        <span>{language.name}</span>
                        {uiLang === language.code && (
                          <span className="ml-auto text-xs text-amber-400">
                            ✓
                          </span>
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {switchable && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={toggleTheme}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                        aria-label={
                          theme === "dark"
                            ? "Switch to day mode"
                            : "Switch to night mode"
                        }
                      >
                        {theme === "dark" ? (
                          <Sun className="h-4 w-4" />
                        ) : (
                          <Moon className="h-4 w-4" />
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      {theme === "dark"
                        ? "Switch to day mode"
                        : "Switch to night mode"}
                    </TooltipContent>
                  </Tooltip>
                )}

                <LeegoLogo className="h-7 w-auto object-contain opacity-75" />
              </div>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex w-full items-center gap-2 rounded-lg p-1.5 text-left transition-colors hover:bg-accent/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 group-data-[collapsible=icon]:justify-center">
                  <Avatar className="h-8 w-8 shrink-0 border">
                    {avatarSrc && (
                      <img
                        src={avatarSrc}
                        alt=""
                        className="absolute inset-0 h-full w-full rounded-full object-cover"
                      />
                    )}
                    <AvatarFallback className="bg-transparent p-0">
                      <img
                        src="/leego-logo.png"
                        alt="Profile"
                        className="h-full w-full rounded-full object-cover"
                      />
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                    <p className="truncate text-sm font-medium leading-none">
                      {user?.name || "Director"}
                    </p>
                    <p className="mt-1 truncate text-[10px] text-muted-foreground">
                      {profileBadge}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem
                  onClick={() => navigate("/settings")}
                  className="cursor-pointer"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleAvatarClick}
                  className="cursor-pointer"
                >
                  <Camera className="mr-2 h-4 w-4" />
                  Change photo
                </DropdownMenuItem>
                {switchable && (
                  <DropdownMenuItem
                    onClick={toggleTheme}
                    className="cursor-pointer"
                  >
                    {theme === "dark" ? (
                      <Sun className="mr-2 h-4 w-4" />
                    ) : (
                      <Moon className="mr-2 h-4 w-4" />
                    )}
                    {theme === "dark" ? "Day mode" : "Night mode"}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarFile}
            />
          </SidebarFooter>
        </Sidebar>

        <div
          className={`absolute right-0 top-0 z-50 h-full w-1 cursor-col-resize transition-colors hover:bg-amber-500/20 ${
            isCollapsed ? "hidden" : ""
          }`}
          onMouseDown={() => setIsResizing(true)}
        />
      </div>

      <SidebarInset>
        {isMobile ? (
          <header
            data-mobile-header
            className="sticky top-0 z-40 flex min-h-14 items-center border-b border-border/50 bg-background/95 px-2 backdrop-blur-xl"
            style={{
              paddingTop: "max(0.5rem, env(safe-area-inset-top))",
              paddingBottom: "0.5rem",
            }}
          >
            <SidebarTrigger className="h-10 w-10 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1 px-2">
              <p className="truncate text-sm font-semibold">
                {pageTitle}
              </p>
              <p className="truncate text-[10px] text-muted-foreground">
                Virelle Studios
              </p>
            </div>
            <NotificationBell />
            <button
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent("virelle-open-director-chat"),
                )
              }
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-accent active:bg-accent/70"
              aria-label="Open Director's Assistant"
              title="Director's Assistant"
            >
              <Sparkles className="h-5 w-5 text-amber-400" />
            </button>
          </header>
        ) : (
          <header className="sticky top-0 z-40 flex h-14 items-center border-b border-border/50 bg-background/90 px-3 backdrop-blur-xl sm:px-4">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {pageTitle}
                </p>
                <p className="hidden truncate text-[10px] text-muted-foreground lg:block">
                  Production workspace
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() =>
                  window.dispatchEvent(
                    new KeyboardEvent("keydown", {
                      key: "k",
                      metaKey: true,
                      ctrlKey: true,
                    }),
                  )
                }
                className="hidden h-9 items-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:flex"
                aria-label="Open command palette"
                title="Quick navigation (⌘K)"
              >
                <Search className="h-3.5 w-3.5" />
                <span className="hidden xl:inline">Search tools</span>
                <kbd className="hidden rounded border border-border/50 bg-background px-1.5 py-0.5 font-mono text-[10px] xl:inline">
                  ⌘K
                </kbd>
              </button>
              <RenderQueueTray />
              <NotificationBell />
              <button
                onClick={() =>
                  window.dispatchEvent(
                    new CustomEvent("virelle-open-director-chat"),
                  )
                }
                className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-accent"
                aria-label="Open Director's Assistant"
                title="Director's Assistant"
              >
                <Sparkles className="h-4 w-4 text-amber-400" />
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="ml-1 flex items-center gap-2 rounded-lg p-1 transition-colors hover:bg-accent/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400">
                    <Avatar className="h-8 w-8 border">
                      {avatarSrc && (
                        <img
                          src={avatarSrc}
                          alt=""
                          className="absolute inset-0 h-full w-full rounded-full object-cover"
                        />
                      )}
                      <AvatarFallback className="bg-transparent p-0">
                        <img
                          src="/leego-logo.png"
                          alt="Profile"
                          className="h-full w-full rounded-full object-cover"
                        />
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden max-w-28 truncate text-sm font-medium lg:block">
                      {user?.name || "Director"}
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem
                    onClick={() => navigate("/settings")}
                    className="cursor-pointer"
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleAvatarClick}
                    className="cursor-pointer"
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    Change photo
                  </DropdownMenuItem>
                  {switchable && (
                    <DropdownMenuItem
                      onClick={toggleTheme}
                      className="cursor-pointer"
                    >
                      {theme === "dark" ? (
                        <Sun className="mr-2 h-4 w-4" />
                      ) : (
                        <Moon className="mr-2 h-4 w-4" />
                      )}
                      {theme === "dark" ? "Day mode" : "Night mode"}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={logout}
                    className="cursor-pointer text-destructive focus:text-destructive"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
        )}

        <main
          className={`relative z-10 flex min-h-0 flex-1 flex-col overscroll-contain p-3 sm:p-5 lg:p-6 ${
            location === "/assistant" ? "overflow-hidden" : ""
          }`}
          style={{
            paddingBottom:
              "max(4rem, calc(env(safe-area-inset-bottom) + 2rem))",
          }}
        >
          <div
            className={`relative z-10 flex-1 ${
              location === "/assistant"
                ? "w-full"
                : "mx-auto w-full max-w-[1600px]"
            }`}
          >
            {children}
          </div>
          {location !== "/assistant" && <LeegoFooter />}
        </main>
      </SidebarInset>

      {location !== "/assistant" &&
        !location.startsWith("/projects/") && <DirectorChat />}
    </>
  );
}
