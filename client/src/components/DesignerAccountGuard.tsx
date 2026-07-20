import { trpc } from "@/lib/trpc";
import {
  LogOut,
  Package,
  Settings,
  Shirt,
  Store,
  Wallet,
} from "lucide-react";
import { useEffect } from "react";

const DESIGNER_ROUTES = [
  "/designer/studio",
  "/designer-register",
  "/designer-wardrobe",
  "/wardrobe-marketplace",
  "/wardrobe-inventory",
];

const PUBLIC_ROUTES = [
  "/welcome",
  "/login",
  "/register",
  "/contact",
  "/terms",
  "/privacy",
  "/acceptable-use",
  "/ip-policy",
  "/dmca",
];

function routeAllowed(path: string) {
  return [...DESIGNER_ROUTES, ...PUBLIC_ROUTES].some(
    route => path === route || path.startsWith(`${route}/`),
  );
}

const navItems = [
  { label: "Studio", href: "/designer/studio", icon: Store },
  {
    label: "Listings",
    href: "/designer/studio?tab=listings",
    icon: Package,
  },
  {
    label: "Marketplace",
    href: "/wardrobe-marketplace",
    icon: Shirt,
  },
  {
    label: "Profile",
    href: "/designer/studio?tab=profile",
    icon: Settings,
  },
  {
    label: "Payouts",
    href: "/designer/studio?tab=payouts",
    icon: Wallet,
  },
];

function DesignerOnlyNavigation() {
  const logout = trpc.auth.logout.useMutation({
    onSuccess: () => {
      window.location.href = "/welcome";
    },
  });
  const current = window.location.pathname;
  const search = window.location.search;

  return (
    <>
      <aside className="designer-only-nav fixed inset-y-0 left-0 z-[70] hidden w-56 flex-col border-r border-amber-500/20 bg-background/98 p-3 backdrop-blur-xl md:flex">
        <a
          href="/designer/studio"
          className="mb-5 flex items-center gap-3 rounded-xl px-2 py-2"
        >
          <img
            src="/virelle-logo-square.png"
            alt="Virelle Studios"
            className="h-9 w-9 rounded-lg"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">Designer Studio</p>
            <p className="text-[10px] text-muted-foreground">
              Virelle Wardrobe
            </p>
          </div>
        </a>

        <nav className="space-y-1">
          {navItems.map(item => {
            const active =
              item.href === "/designer/studio"
                ? current === "/designer/studio" && !search.includes("tab=")
                : item.href.startsWith(current) &&
                  (!item.href.includes("?") || search === item.href.split("?")[1]?.replace(/^/, "?"));
            return (
              <a
                key={item.href}
                href={item.href}
                className={`flex h-10 items-center gap-3 rounded-lg px-3 text-sm transition-colors ${
                  active
                    ? "bg-amber-500/15 text-amber-400"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </a>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-border/50 pt-3">
          <button
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
            className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      <nav className="designer-only-mobile-nav fixed inset-x-0 bottom-0 z-[80] flex items-center justify-around border-t border-amber-500/20 bg-background/98 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
        {navItems.slice(0, 4).map(item => (
          <a
            key={item.href}
            href={item.href}
            className="flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-[10px] text-muted-foreground"
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </a>
        ))}
      </nav>
    </>
  );
}

export default function DesignerAccountGuard() {
  const { data: user, isLoading: userLoading } = trpc.auth.me.useQuery();
  const { data: access } = trpc.wardrobeMarket.portal.getAccessStatus.useQuery(
    undefined,
    { enabled: Boolean(user) },
  );

  const designerOnly = Boolean(access?.designerOnly);

  useEffect(() => {
    if (userLoading || !user || !access) return;
    const path = window.location.pathname;
    if (designerOnly && !routeAllowed(path)) {
      window.location.replace("/designer/studio");
    }
  }, [access, designerOnly, user, userLoading]);

  useEffect(() => {
    const root = document.documentElement;
    if (designerOnly) root.classList.add("designer-account-only");
    else root.classList.remove("designer-account-only");
    return () => root.classList.remove("designer-account-only");
  }, [designerOnly]);

  if (!designerOnly) return null;

  return (
    <>
      <style>{`
        html.designer-account-only [data-slot="sidebar"] {
          display: none !important;
        }
        html.designer-account-only [data-slot="sidebar-inset"] > header {
          display: none !important;
        }
        html.designer-account-only [data-slot="sidebar-trigger"],
        html.designer-account-only button[aria-label*="Director"],
        html.designer-account-only button[title*="Director"] {
          display: none !important;
        }
        @media (min-width: 768px) {
          html.designer-account-only [data-slot="sidebar-inset"] {
            padding-left: 14rem;
          }
        }
        @media (max-width: 767px) {
          html.designer-account-only [data-slot="sidebar-inset"] {
            padding-bottom: calc(4rem + env(safe-area-inset-bottom));
          }
        }
      `}</style>
      <DesignerOnlyNavigation />
    </>
  );
}
