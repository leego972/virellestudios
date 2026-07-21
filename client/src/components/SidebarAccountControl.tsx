import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Camera, LogOut, MoreVertical, Settings } from "lucide-react";
import { useState } from "react";

type SidebarAccountControlProps = {
  avatarSrc?: string;
  name: string;
  profileBadge: string;
  onLogout: () => Promise<void> | void;
  onSettings: () => void;
  onChangePhoto: () => void;
};

export default function SidebarAccountControl({
  avatarSrc,
  name,
  profileBadge,
  onLogout,
  onSettings,
  onChangePhoto,
}: SidebarAccountControlProps) {
  const [loggingOut, setLoggingOut] = useState(false);

  const confirmLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await onLogout();
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="flex w-full items-center gap-1 rounded-lg p-1 transition-colors hover:bg-accent/40 group-data-[collapsible=icon]:justify-center">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button
            type="button"
            aria-label="Log out"
            title="Log out"
            className="flex min-w-0 flex-1 items-center gap-2 rounded-lg p-0.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 group-data-[collapsible=icon]:justify-center"
          >
            <Avatar className="h-9 w-9 shrink-0 border-2 border-amber-500/35">
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
              <p className="truncate text-sm font-semibold leading-none text-foreground">
                {name}
              </p>
              <p className="mt-1 truncate text-[10px] text-muted-foreground">
                {profileBadge}
              </p>
              <p className="mt-1 truncate text-[10px] font-semibold text-red-500">
                Tap avatar to log out
              </p>
            </div>
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Log out of Virelle Studios?</AlertDialogTitle>
            <AlertDialogDescription>
              Your saved projects remain in your account. You will need to sign
              in again to continue working.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loggingOut}>Stay signed in</AlertDialogCancel>
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

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Account options"
            title="Account options"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 group-data-[collapsible=icon]:hidden"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onClick={onSettings} className="cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onChangePhoto} className="cursor-pointer">
            <Camera className="mr-2 h-4 w-4" />
            Change photo
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              const avatarButton = document.querySelector<HTMLButtonElement>(
                'button[aria-label="Log out"]',
              );
              avatarButton?.click();
            }}
            className="cursor-pointer text-red-600 focus:text-red-600"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
