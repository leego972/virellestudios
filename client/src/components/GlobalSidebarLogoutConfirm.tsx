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
  const [sidebarFooters, setSidebarFooters] = useState<HTMLElement[]>([]);

  const email = String((user as any)?.email || "").trim().toLowerCase();
  const name = String((user as any)?.name || "Director");
  const initials = useMemo(() => getInitials(name, email), [name, email]);
  const genericAvatar = useMemo(() => makeGenericAvatar(initials), [initials]);
  const isLeegoAccount = email === LEEGO_ACCOUNT_EMAIL;

  useEffect(() => {
    if (!user) {
      setSidebarFooters([]);
      return;
    }

    const applyAccountAvatarPolicy = () => {
      const footers = Array.from(
        document.querySelectorAll<HTMLElement>('[data-slot="sidebar-footer"]'),
      );

      setSidebarFooters(previous =>
        sameNodes(previous, footers) ? previous : footers,
      );

      document
        .querySelectorAll<HTMLImageElement>(
          '[data-slot="avatar"] img[src*="leego-logo"], [data-slot="avatar"] img[data-virelle-original-leego-src]',
        )
        .forEach(image => {
          const currentSource = image.getAttribute("src") || "";
          if (!image.dataset.virelleOriginalLeegoSrc && currentSource.includes("leego-logo")) {
            image.dataset.virelleOriginalLeegoSrc = currentSource;
          }

          if (isLeegoAccount) {
            const original = image.dataset.virelleOriginalLeegoSrc;
            if (original && image.getAttribute("src") !== original) {
              image.setAttribute("src", original);
            }
          } else if (image.getAttribute("src") !== genericAvatar) {
            image.setAttribute("src", genericAvatar);
            image.setAttribute("alt", `${name} profile`);
          }
        });

      footers.forEach(footer => {
        footer
          .querySelectorAll<HTMLImageElement>('img[src*="leego-logo"], img[data-virelle-owner-mark]')
          .forEach(image => {
            if (image.closest('[data-slot="avatar"]')) return;

            const currentSource = image.getAttribute("src") || "";
            if (!image.dataset.virelleOwnerMark && currentSource.includes("leego-logo")) {
              image.dataset.virelleOwnerMark = "true";
            }

            image.style.display = isLeegoAccount ? "" : "none";
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

    applyAccountAvatarPolicy();

    const observer = new MutationObserver(applyAccountAvatarPolicy);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["src", "class", "data-state"],
    });

    document.addEventListener("click", handleAvatarPress, true);
    window.addEventListener("pageshow", applyAccountAvatarPolicy);

    return () => {
      observer.disconnect();
      document.removeEventListener("click", handleAvatarPress, true);
      window.removeEventListener("pageshow", applyAccountAvatarPolicy);
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

  return (
    <>
      {sidebarFooters.map((footer, index) =>
        createPortal(
          <button
            key={`sidebar-logout-${index}`}
            type="button"
            onClick={() => setOpen(true)}
            className="flex min-h-10 w-full items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-left font-semibold text-red-500 transition-colors hover:bg-red-500/20 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2"
            aria-label="Log out"
            title="Log out"
            data-explicit-sidebar-logout
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span className="text-sm group-data-[collapsible=icon]:hidden">
              Log out
            </span>
          </button>,
          footer,
        ),
      )}

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <AlertDialogHeader>
            <div className="mb-2 flex items-center gap-3">
              {isLeegoAccount ? (
                <img
                  src="/leego-logo.png"
                  alt="Lee Gold account"
                  className="h-12 w-12 rounded-full border border-amber-500/35 object-cover"
                />
              ) : (
                <img
                  src={genericAvatar}
                  alt={`${name} account`}
                  className="h-12 w-12 rounded-full object-cover"
                />
              )}
              <AlertDialogTitle>Log out of Virelle Studios?</AlertDialogTitle>
            </div>
            <AlertDialogDescription>
              Your saved projects remain in your account. You will need to sign in
              again to continue working.
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
