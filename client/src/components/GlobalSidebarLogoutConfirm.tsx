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
import { useEffect, useState } from "react";

export default function GlobalSidebarLogoutConfirm() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (!user) return;

    const handleAvatarPress = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const avatar = target.closest('[data-slot="avatar"]');
      if (!avatar) return;
      if (!avatar.closest('[data-slot="sidebar-footer"]')) return;

      event.preventDefault();
      event.stopPropagation();
      setOpen(true);
    };

    document.addEventListener("click", handleAvatarPress, true);
    return () => document.removeEventListener("click", handleAvatarPress, true);
  }, [user]);

  const confirmLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
        <AlertDialogHeader>
          <div className="mb-2 flex items-center gap-3">
            <img
              src="/leego-logo.png"
              alt="Account"
              className="h-12 w-12 rounded-full border border-amber-500/35 object-cover"
            />
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
  );
}
