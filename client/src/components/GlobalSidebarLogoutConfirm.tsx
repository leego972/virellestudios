import { useAuth } from "@/_core/hooks/useAuth";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LogOut } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

const LEEGO_ACCOUNT_EMAIL = "leego972@gmail.com";

function getInitials(name?: string | null, email?: string | null) {
  const source = (name || email?.split("@")[0] || "User").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ""}${parts[parts.length - 1][0] || ""}`.toUpperCase();
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function makeGenericAvatar(initials: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect width="96" height="96" rx="48" fill="#1b1b1f"/><circle cx="48" cy="48" r="45" fill="none" stroke="#d4af37" stroke-width="3"/><text x="48" y="57" text-anchor="middle" font-family="Arial, sans-serif" font-size="30" font-weight="700" fill="#f7df87">${escapeXml(initials)}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function sameNodes(first: HTMLElement[], second: HTMLElement[]) {
  return (
    first.length === second.length &&
    first.every((node, index) => node === second[index])
  );
}

export default function GlobalSidebarLogoutConfirm() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [desktopFooters, setDesktopFooters] = useState<HTMLElement[]>([]);
  const [mobileSidebars, setMobileSidebars] = useState<HTMLElement[]>([]);

  const email = String((user as any)?.email || "").trim().toLowerCase();
  const name = String((user as any)?.name || "Director");
  const initials = useMemo(() => getInitials(name, email), [name, email]);
  const genericAvatar = useMemo(() => makeGenericAvatar(initials), [initials]);
  const isLeegoAccount = email === LEEGO_ACCOUNT_EMAIL;

  useEffect(() => {
    if (!user) {
      setDesktopFooters([]);
      setMobileSidebars([]);
      return;
    }

    const applyAccountPolicy = () => {
      const allFooters = Array.from(
        document.querySelectorAll<HTMLElement>('[data-slot="sidebar-footer"]'),
      );
      const nextDesktopFooters = allFooters.filter(
        footer => !footer.closest('[data-mobile="true"][data-slot="sidebar"]'),
      );
      const nextMobileSidebars = Array.from(
        document.querySelectorAll<HTMLElement>(
          '[data-mobile="true"][data-slot="sidebar"]',
        ),
      );

      setDesktopFooters(previous =>
        sameNodes(previous, nextDesktopFooters) ? previous : nextDesktopFooters,
      );
      setMobileSidebars(previous =>
        sameNodes(previous, nextMobileSidebars) ? previous : nextMobileSidebars,
      );

      nextMobileSidebars.forEach(sidebar => {
        sidebar.style.position = "relative";
        const content = sidebar.querySelector<HTMLElement>(
          '[data-slot="sidebar-content"]',
        );
        if (content) {
          content.style.paddingBottom =
            "calc(env(safe-area-inset-bottom, 0px) + 5.5rem)";
        }
      });

      document
        .querySelectorAll<HTMLImageElement>(
          '[data-slot="avatar"] img[src*="leego-logo"], [data-slot="avatar"] img[data-virelle-original-leego-src]',
        )
        .forEach(image => {
          const currentSource = image.getAttribute("src") || "";
          if (
            !image.dataset.virelleOriginalLeegoSrc &&
            currentSource.includes("leego-logo")
          ) {
            image.dataset.virelleOriginalLeegoSrc = currentSource;
          }

          if (isLeegoAccount) {
            const original = image.dataset.virelleOriginalLeegoSrc;
            if (original && image.getAttribute("src") !== original) {
              image.setAttribute("src", original);
            }
            image.setAttribute("alt", "Lee Gold profile");
          } else {
            if (image.getAttribute("src") !== genericAvatar) {
              image.setAttribute("src", genericAvatar);
            }
            image.setAttribute("alt", `${name} profile`);
          }
        });

      // The Leego mark belongs in the ownership footer only. It must never be
      // displayed as a generic sidebar control or account identity.
      allFooters.forEach(footer => {
        footer
          .querySelectorAll<HTMLImageElement>('img[src*="leego-logo"]')
          .forEach(image => {
            if (image.closest('[data-slot="avatar"]')) return;
            image.style.display = "none";
            image.setAttribute("aria-hidden", "true");
          });
      });
    };

    const handleAvatarPress = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const avatar = target.closest('[data-slot="avatar"]');
      if (!avatar?.closest('[data-slot="sidebar-footer"]')) return;

      event.preventDefault();
      event.stopPropagation();
      setOpen(true);
    };

    applyAccountPolicy();

    const observer = new MutationObserver(applyAccountPolicy);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["src", "class", "data-state"],
    });

    document.addEventListener("click", handleAvatarPress, true);
    window.addEventListener("pageshow", applyAccountPolicy);

    return () => {
      observer.disconnect();
      document.removeEventListener("click", handleAvatarPress, true);
      window.removeEventListener("pageshow", applyAccountPolicy);
    };
  }, [user, genericAvatar, isLeegoAccount, name]);

  const confirmLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
    }
  };

  if (!user) return null;

  const logoutButton = (compact = false) => (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className={
        compact
          ? "flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-red-600 bg-red-600 px-4 py-3 text-base font-black text-white shadow-lg shadow-black/20 transition-colors hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
          : "flex min-h-11 w-full items-center gap-2 rounded-lg border border-red-500/50 bg-red-500/15 px-3 py-2 text-left text-sm font-bold text-red-600 transition-colors hover:bg-red-500/25 hover:text-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2"
      }
      aria-label="Log out"
      title="Log out"
      data-explicit-sidebar-logout
    >
      <LogOut className="h-4 w-4 shrink-0" />
      <span className={compact ? "text-base" : "group-data-[collapsible=icon]:hidden"}>
        Log out
      </span>
    </button>
  );

  return (
    <>
      {desktopFooters.map((footer, index) =>
        createPortal(
          <div
            key={`desktop-sidebar-logout-${index}`}
            className="order-last w-full pt-1"
          >
            {logoutButton(false)}
          </div>,
          footer,
        ),
      )}

      {mobileSidebars.map((sidebar, index) =>
        createPortal(
          <div
            key={`mobile-sidebar-logout-${index}`}
            className="absolute inset-x-3 z-[100] border-t border-border/50 bg-inherit pt-3"
            style={{
              bottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)",
            }}
          >
            {logoutButton(true)}
          </div>,
          sidebar,
        ),
      )}

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <AlertDialogHeader>
            <div className="mb-2 flex items-center gap-3">
              <img
                src={isLeegoAccount ? "/leego-logo.png" : genericAvatar}
                alt={isLeegoAccount ? "Lee Gold account" : `${name} account`}
                className="h-12 w-12 rounded-full border border-amber-500/35 object-cover"
              />
              <AlertDialogTitle>Log out of Virelle Studios?</AlertDialogTitle>
            </div>
            <AlertDialogDescription>
              Your saved projects remain in your account. You will need to sign
              in again to continue working.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loggingOut}>
              Stay signed in
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={loggingOut}
              onClick={event => {
                event.preventDefault();
                void confirmLogout();
              }}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              <LogOut className="mr-2 h-4 w-4" />
              {loggingOut ? "Logging out…" : "Log out"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
