import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Bell,
  Check,
  CheckCheck,
  ExternalLink,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const TYPE_ICONS: Record<string, string> = {
  welcome: "🎬",
  generation_complete: "✨",
  export_complete: "📦",
  subscription_change: "💳",
  referral_reward: "🎁",
  system: "📢",
  tip: "💡",
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const { data: unread } = trpc.notifications.unreadCount.useQuery(undefined, {
    refetchInterval: 30_000,
  });
  const { data: notifications, refetch } = trpc.notifications.list.useQuery(
    { limit: 30 },
    { enabled: open },
  );

  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: () => refetch(),
  });
  const markAllRead = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => refetch(),
  });
  const deleteNotif = trpc.notifications.delete.useMutation({
    onSuccess: () => refetch(),
  });

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (
        panelRef.current
        && !panelRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const count = unread?.count || 0;

  const formatTime = (date: string | Date) => {
    const value = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - value.getTime();
    const diffMin = Math.floor(diffMs / 60_000);
    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return `${diffDay}d ago`;
    return value.toLocaleDateString("en-AU", {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="relative flex items-center gap-1" ref={panelRef}>
      <a
        href="/virelle-broadcast-render?adult=1"
        className="flex h-9 items-center gap-1.5 rounded-md border border-amber-300/20 bg-white/[0.035] px-2.5 text-xs font-medium tracking-wide text-white/75 transition-colors hover:border-amber-300/35 hover:bg-white/[0.07] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/50"
        title="Verified Adult Studio"
        aria-label="Open verified Adult Studio"
      >
        <ShieldCheck className="h-4 w-4 text-amber-300/80" />
        <span className="hidden xl:inline">18+ Studio</span>
      </a>

      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-lg p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
        title="Notifications"
        aria-label={count > 0
          ? `Notifications, ${count} unread`
          : "Notifications"}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-black">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-[100] mt-2 flex max-h-[480px] w-80 flex-col overflow-hidden rounded-xl border border-white/10 bg-[#0c0b18] shadow-2xl sm:w-96">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <h3 className="gradient-text-gold text-sm font-semibold">
              Notifications
            </h3>
            <div className="flex items-center gap-1">
              {count > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-amber-400 hover:text-amber-300"
                  onClick={() => markAllRead.mutate()}
                >
                  <CheckCheck className="mr-1 h-3.5 w-3.5" />
                  Mark all read
                </Button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1 text-white/40 hover:text-white"
                aria-label="Close notifications"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {!notifications || notifications.length === 0 ? (
              <div className="py-12 text-center">
                <Bell className="mx-auto mb-2 h-8 w-8 text-white/20" />
                <p className="text-sm text-white/40">No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`flex gap-3 border-b border-white/5 px-4 py-3 transition-colors hover:bg-white/5 ${
                    !notification.isRead ? "bg-amber-500/5" : ""
                  }`}
                >
                  <div className="mt-0.5 flex-shrink-0 text-lg">
                    {TYPE_ICONS[(notification as any).type || "system"] || "📢"}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm leading-tight ${
                        !notification.isRead
                          ? "font-medium text-white"
                          : "text-white/70"
                      }`}>
                        {notification.title}
                      </p>
                      {!notification.isRead && (
                        <div className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-amber-500" />
                      )}
                    </div>
                    {notification.message && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-white/40">
                        {notification.message}
                      </p>
                    )}
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="text-[10px] text-white/30">
                        {formatTime(notification.createdAt)}
                      </span>
                      {notification.link && (
                        <a
                          href={notification.link}
                          className="flex items-center gap-0.5 text-[10px] text-amber-400 hover:text-amber-300"
                          onClick={() => {
                            if (!notification.isRead) {
                              markRead.mutate({ id: notification.id });
                            }
                            setOpen(false);
                          }}
                        >
                          <ExternalLink className="h-2.5 w-2.5" />
                          View
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-shrink-0 flex-col gap-1">
                    {!notification.isRead && (
                      <button
                        onClick={() => markRead.mutate({ id: notification.id })}
                        className="p-1 text-white/30 transition-colors hover:text-amber-400"
                        title="Mark as read"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotif.mutate({ id: notification.id })}
                      className="p-1 text-white/30 transition-colors hover:text-red-400"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
