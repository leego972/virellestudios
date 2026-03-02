import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Bell, Check, CheckCheck, Trash2, ExternalLink, X } from "lucide-react";
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
    refetchInterval: 30_000, // poll every 30s
  });
  const { data: notifications, refetch } = trpc.notifications.list.useQuery(
    { limit: 30 },
    { enabled: open }
  );

  const markRead = trpc.notifications.markRead.useMutation({ onSuccess: () => refetch() });
  const markAllRead = trpc.notifications.markAllRead.useMutation({ onSuccess: () => refetch() });
  const deleteNotif = trpc.notifications.delete.useMutation({ onSuccess: () => refetch() });

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const count = unread?.count || 0;

  const formatTime = (date: string | Date) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return `${diffDay}d ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        title="Notifications"
      >
        <Bell className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-amber-500 text-black text-[10px] font-bold px-1">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 max-h-[480px] bg-zinc-900 border border-white/10 rounded-xl shadow-2xl z-[100] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <h3 className="text-sm font-semibold text-white">Notifications</h3>
            <div className="flex items-center gap-1">
              {count > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-amber-400 hover:text-amber-300 h-7 px-2"
                  onClick={() => markAllRead.mutate()}
                >
                  <CheckCheck className="h-3.5 w-3.5 mr-1" />
                  Mark all read
                </Button>
              )}
              <button onClick={() => setOpen(false)} className="p-1 text-white/40 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {!notifications || notifications.length === 0 ? (
              <div className="py-12 text-center">
                <Bell className="h-8 w-8 text-white/20 mx-auto mb-2" />
                <p className="text-sm text-white/40">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex gap-3 px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors ${
                    !n.isRead ? "bg-amber-500/5" : ""
                  }`}
                >
                  {/* Icon */}
                  <div className="text-lg flex-shrink-0 mt-0.5">
                    {TYPE_ICONS[(n as any).type || "system"] || "📢"}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm leading-tight ${!n.isRead ? "text-white font-medium" : "text-white/70"}`}>
                        {n.title}
                      </p>
                      {!n.isRead && (
                        <div className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0 mt-1.5" />
                      )}
                    </div>
                    {n.message && (
                      <p className="text-xs text-white/40 mt-0.5 line-clamp-2">{n.message}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] text-white/30">{formatTime(n.createdAt)}</span>
                      {n.link && (
                        <a
                          href={n.link}
                          className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-0.5"
                          onClick={() => {
                            if (!n.isRead) markRead.mutate({ id: n.id });
                            setOpen(false);
                          }}
                        >
                          <ExternalLink className="h-2.5 w-2.5" />
                          View
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    {!n.isRead && (
                      <button
                        onClick={() => markRead.mutate({ id: n.id })}
                        className="p-1 text-white/30 hover:text-amber-400 transition-colors"
                        title="Mark as read"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotif.mutate({ id: n.id })}
                      className="p-1 text-white/30 hover:text-red-400 transition-colors"
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
