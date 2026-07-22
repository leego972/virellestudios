import { useEffect } from "react";
import { trpc } from "@/lib/trpc";

const DESIGNER_PATH_PREFIXES = [
  "/designer",
  "/designer-register",
  "/designer-wardrobe",
  "/wardrobe-marketplace",
  "/login",
  "/forgot-password",
  "/reset-password",
  "/terms",
  "/privacy",
  "/contact",
];

function isDesignerPath(path: string): boolean {
  return path === "/designer-wardrobe" || path.startsWith("/designer/") || path === "/designer-register";
}

export default function PortalAccessBoundary() {
  const me = trpc.auth.me.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });
  const portal = trpc.wardrobeMarket.commerce.portal.status.useQuery(undefined, {
    enabled: Boolean(me.data),
    retry: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!me.data || portal.isLoading || !portal.data || typeof window === "undefined") return;
    if (portal.data.isAdmin || portal.data.portal === "admin") return;

    const path = window.location.pathname;
    if (portal.data.portal === "designer") {
      const allowed = DESIGNER_PATH_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
      if (!allowed) window.location.replace("/designer/studio");
      return;
    }

    if (isDesignerPath(path)) {
      window.location.replace("/wardrobe-marketplace");
    }
  }, [me.data, portal.data, portal.isLoading]);

  return null;
}
