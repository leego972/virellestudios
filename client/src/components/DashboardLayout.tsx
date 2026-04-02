import { useAuth } from "@/_core/hooks/useAuth";
import LeegoFooter from "@/components/LeegoFooterLaunch";
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
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import NotificationBell from "./NotificationBell";

// Navigation grouped by production pipeline logic
const menuGroups = [
  {
    label: "Studio",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/" },
      { icon: Film, label: "Projects", path: "/projects" },
      { icon: Users, label: "Characters", path: "/characters" },
      { icon: Clapperboard, label: "My Movies", path: "/movies" },
      { icon: MessageSquare, label: "Director's Assistant", path: "/assistant" },
      { icon: Globe, label: "Distribute", path: "/projects" },
    ],
  },
  {
    label: "Create",
    items: [
      { icon: Megaphone, label: "Ad & Poster Maker", path: "/poster-maker" },
      { icon: PlaySquare, label: "Project Samples", path: "/samples" },
      { icon: ShoppingBag, label: "Asset Marketplace", path: "/marketplace" },
    ],
  },
  {
    label: "Tools",
    items: [
      { icon: DollarSign, label: "Funding Directory", path: "/funding" },
    ],
  },
  {
    label: "Account",
    items: [
      { icon: CreditCard, label: "Subscription", path: "/pricing" },
      { icon: Coins, label: "Credits & History", path: "/credits" },
      { icon: Key, label: "API Keys", path: "/settings?tab=api-keys" },
      { icon: Gift, label: "Referrals", path: "/referrals" },
      { icon: Smartphone, label: "Download App", path: "/download" },
      { icon: BookOpen, label: "Blog", path: "/blog" },
      { icon: Settings, label: "Settings", path: "/settings" },
    ],
  },
];

// Flat list for backward compatibility
const menuItems = menuGroups.flatMap((g) => g.items);

const adminMenuItems = [
  { icon: Shield, label: "User Management", path: "/admin/users" },
  { icon: ShieldAlert, label: "Security", path: "/admin/security" },
  { icon: Zap, label: "Autonomous Pipeline", path: "/admin/autonomous" },
  { icon: BarChart3, label: "Advertising", path: "/admin/advertising" },
  { icon: Search, label: "SEO Dashboard", path: "/admin/seo" },
  { icon: Mail, label: "Outreach & Email", path: "/admin/outreach" },
  { icon: TrendingUp, label: "Growth Dashboard", path: "/admin/growth" },
  { icon: Megaphone, label: "Campaign Manager", path: "/campaigns" },
  { icon: PenTool, label: "Content Creator", path: "/content-creator" },
];

const SUPPORTED_LANGUAGES = [
  // ─── English-speaking markets ───
  { code: "en", name: "English", dir: "ltr", flag: "🇺🇸" },
  // ─── South Asian cinema (Bollywood, Tamil, Telugu, Bengali) ───
  { code: "hi", name: "हिन्दी (Hindi)", dir: "ltr", flag: "🇮🇳" },
  { code: "ta", name: "தமிழ் (Tamil)", dir: "ltr", flag: "🇮🇳" },
  { code: "te", name: "తెలుగు (Telugu)", dir: "ltr", flag: "🇮🇳" },
  { code: "bn", name: "বাংলা (Bengali)", dir: "ltr", flag: "🇧🇩" },
  { code: "ml", name: "മലയാളം (Malayalam)", dir: "ltr", flag: "🇮🇳" },
  { code: "mr", name: "मराठी (Marathi)", dir: "ltr", flag: "🇮🇳" },
  // ─── East Asian cinema (Korean Wave, J-Cinema, Chinese) ───
  { code: "ko", name: "한국어 (Korean)", dir: "ltr", flag: "🇰🇷" },
  { code: "ja", name: "日本語 (Japanese)", dir: "ltr", flag: "🇯🇵" },
  { code: "zh", name: "中文 普通话 (Mandarin)", dir: "ltr", flag: "🇨🇳" },
  { code: "zh-TW", name: "中文 繁體 (Cantonese/HK)", dir: "ltr", flag: "🇭🇰" },
  // ─── Middle Eastern & North African cinema ───
  { code: "ar", name: "العربية (Arabic)", dir: "rtl", flag: "🇸🇦" },
  { code: "he", name: "עברית (Hebrew)", dir: "rtl", flag: "🇮🇱" },
  { code: "fa", name: "فارسی (Persian/Farsi)", dir: "rtl", flag: "🇮🇷" },
  { code: "tr", name: "Türkçe (Turkish)", dir: "ltr", flag: "🇹🇷" },
  // ─── European cinema ───
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
  // ─── African cinema (Nollywood, South African, East African) ───
  { code: "yo", name: "Yorùbá", dir: "ltr", flag: "🇳🇬" },
  { code: "ig", name: "Igbo", dir: "ltr", flag: "🇳🇬" },
  { code: "ha", name: "Hausa", dir: "ltr", flag: "🇳🇬" },
  { code: "sw", name: "Kiswahili", dir: "ltr", flag: "🇰🇪" },
  { code: "am", name: "አማርኛ (Amharic)", dir: "ltr", flag: "🇪🇹" },
  { code: "zu", name: "isiZulu", dir: "ltr", flag: "🇿🇦" },
  { code: "af", name: "Afrikaans", dir: "ltr", flag: "🇿🇦" },
  // ─── Southeast Asian cinema ───
  { code: "th", name: "ภาษาไทย (Thai)", dir: "ltr", flag: "🇹🇭" },
  { code: "vi", name: "Tiếng Việt (Vietnamese)", dir: "ltr", flag: "🇻🇳" },
  { code: "id", name: "Bahasa Indonesia", dir: "ltr", flag: "🇮🇩" },
  { code: "ms", name: "Bahasa Melayu", dir: "ltr", flag: "🇲🇾" },
  { code: "tl", name: "Filipino", dir: "ltr", flag: "🇵🇭" },
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

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />;
  }

  if (!user) {
    // Redirect to landing page for unauthenticated visitors
    window.location.href = "/welcome";
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
      <div className="relative" ref={sidebarRef}>
        <Sidebar collapsible="icon" className="border-r-0" disableTransition={isResizing}>
          <SidebarHeader className="h-14 md:h-16 justify-center">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed && (
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <img src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663418605762/hxRQQgsmyjgcByim.png" alt="Virelle Studios" className="h-9 w-9 rounded shrink-0" />
                  <span className="font-bold tracking-tight truncate text-base">
                    Virelle Studios
                  </span>
                </div>
              )}
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
                        <item.icon className={`h-4 w-4 ${active ? "text-primary" : ""}`} />
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
                        <item.icon className={`h-4 w-4 ${active ? "text-primary" : ""}`} />
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
                title={(user as any).isAdmin ? "Admin — Unlimited credits" : `${((user as any).creditBalance ?? 0).toLocaleString()} credits remaining — click to top up`}
              >
                <div
                  className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-black font-bold text-xs"
                  style={{ background: "linear-gradient(135deg, #d4af37 0%, #b8941f 100%)" }}
                >
                  C
                </div>
                <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold" style={{ color: "#d4af37" }}>
                      {(user as any).isAdmin ? "∞ credits" : `${((user as any).creditBalance ?? 0).toLocaleString()} credits`}
                    </span>
                    {!(user as any).isAdmin && (
                      <span className="text-[9px] text-muted-foreground hover:text-primary transition-colors">Top up →</span>
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
            {/* Leego branding — click to grow/shrink */}
            <div className="flex justify-center items-center py-1 group-data-[collapsible=icon]:px-0 md:flex hidden">
              <img
                src="/leego-logo.png"
                alt="Created by Leego"
                className="h-12 w-auto object-contain group-data-[collapsible=icon]:h-8 leego-glow cursor-pointer"
                draggable={false}
                style={{ transition: "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
                onClick={(e) => {
                  const img = e.currentTarget;
                  img.style.transform = "scale(3)";
                  setTimeout(() => { img.style.transform = "scale(1)"; }, 800);
                }}
              />
            </div>
            {/* Language Switcher */}
            <DropdownMenu open={langMenuOpen} onOpenChange={setLangMenuOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Change language"
                  type="button"
                >
                  <Globe className="h-4 w-4 text-primary shrink-0" />
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
                    {uiLang === lang.code && <span className="ml-auto text-primary text-xs">✓</span>}
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
                    className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={theme === "dark" ? "Switch to day mode" : "Switch to night mode"}
                  >
                    {theme === "dark" ? (
                      <Sun className="h-4 w-4 text-primary shrink-0" />
                    ) : (
                      <Moon className="h-4 w-4 text-primary shrink-0" />
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
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-8 w-8 border shrink-0">
                    <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">
                      {user?.name?.charAt(0).toUpperCase() || "U"}
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
                      tier === "industry" ? "bg-violet-500/10 text-violet-400 border border-violet-500/20" :
                      tier === "independent" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                      "bg-muted text-muted-foreground border border-border"
                    }`}>
                      {user?.role === "admin" ? "\u2B50 Admin" : tier === "industry" ? "Industry" : tier === "independent" ? "Independent" : "Subscribe"}
                    </span>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {isMobile && (
          <div data-mobile-header className="flex border-b h-14 items-center justify-between bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-11 w-11 rounded-lg" />
              <img src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663418605762/hxRQQgsmyjgcByim.png" alt="Virelle Studios" className="h-8 w-8 rounded" />
              <span className="text-base font-bold">Virelle Studios</span>
            </div>
            {switchable && (
              <button
                onClick={toggleTheme}
                className="h-11 w-11 flex items-center justify-center rounded-lg hover:bg-accent active:bg-accent/70 transition-colors"
                aria-label="Toggle theme"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            )}
          </div>
        )}
        <main className="flex-1 p-4 sm:p-6 flex flex-col min-h-0 relative" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
          {/* Gold VS watermark branding — bottom-right corner, subtle and non-intrusive */}
          <div className="fixed bottom-4 right-4 pointer-events-none z-0">
            {/* Dark mode: soft golden logo */}
            <img
              src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663418605762/hxRQQgsmyjgcByim.png"
              alt=""
              className="hidden dark:block w-[100px] h-[100px] sm:w-[120px] sm:h-[120px] object-contain opacity-[0.055]"
              style={{ filter: "sepia(1) saturate(2.6) brightness(1.1) hue-rotate(8deg)" }}
              draggable={false}
            />
            {/* Light mode: very faint golden logo */}
            <img
              src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663418605762/hxRQQgsmyjgcByim.png"
              alt=""
              className="block dark:hidden w-[100px] h-[100px] sm:w-[120px] sm:h-[120px] object-contain opacity-[0.06]"
              style={{ filter: "sepia(1) saturate(2.1) brightness(1.02) hue-rotate(8deg) drop-shadow(0 0 1px rgba(0,0,0,0.18))" }}
              draggable={false}
            />
          </div>
          <div className="flex-1 relative z-10">{children}</div>
          <LeegoFooter />
        </main>
      </SidebarInset>
    </>
  );
}
