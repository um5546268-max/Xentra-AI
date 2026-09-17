"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  Trash2,
  X,
  Inbox,
} from "lucide-react";
import {
  listNotifications,
  markNotificationRead,
  markAllRead,
  deleteNotification,
  clearAllNotifications,
  levelColor,
  timeAgo,
  Notification,
} from "@/lib/notifications";

export default function NotificationsBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  const refresh = async () => {
    try {
      const res = await listNotifications(30);
      setNotifications(res.notifications);
      setUnread(res.unread);
    } catch {}
  };

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 15_000);
    return () => clearInterval(id);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleOpenItem = async (n: Notification) => {
    if (!n.read) {
      try {
        await markNotificationRead(n.id);
        setNotifications((prev) =>
          prev.map((x) => (x.id === n.id ? { ...x, read: true } : x))
        );
        setUnread((u) => Math.max(0, u - 1));
      } catch {}
    }
    if (n.link) {
      router.push(n.link);
      setOpen(false);
    }
  };

  const handleMarkAll = async () => {
    try {
      await markAllRead();
      setNotifications((prev) => prev.map((x) => ({ ...x, read: true })));
      setUnread(0);
    } catch {}
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteNotification(id);
      setNotifications((prev) => {
        const target = prev.find((x) => x.id === id);
        if (target && !target.read) setUnread((u) => Math.max(0, u - 1));
        return prev.filter((x) => x.id !== id);
      });
    } catch {}
  };

  const handleClearAll = async () => {
    if (!confirm("Clear all notifications?")) return;
    try {
      await clearAllNotifications();
      setNotifications([]);
      setUnread(0);
    } catch {}
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
        title="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Invisible backdrop to catch clicks outside (mobile-friendly) */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />

          {/* Dropdown — anchored to the right edge of the parent, opens left */}
                    <div
            className="fixed z-50 mt-2 w-[22rem] max-w-[calc(100vw-1rem)] max-h-[70vh] rounded-xl border border-slate-800 bg-slate-950 shadow-2xl overflow-hidden flex flex-col"
            style={{
              top: panelRef.current
                ? panelRef.current.getBoundingClientRect().bottom + 8
                : 60,
              left: panelRef.current
                ? Math.min(
                    panelRef.current.getBoundingClientRect().left - 200,
                    window.innerWidth - 370
                  )
                : 12,
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 shrink-0">
              <div className="text-sm font-medium text-slate-200">
                Notifications
                {unread > 0 && (
                  <span className="ml-2 text-xs text-red-400">
                    {unread} unread
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unread > 0 && (
                  <button
                    onClick={handleMarkAll}
                    className="p-1.5 rounded hover:bg-slate-800 text-slate-500 hover:text-emerald-400 transition"
                    title="Mark all read"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={handleClearAll}
                    className="p-1.5 rounded hover:bg-slate-800 text-slate-500 hover:text-red-400 transition"
                    title="Clear all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition"
                  title="Close"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <Inbox className="w-8 h-8 mx-auto text-slate-700" />
                  <div className="text-xs text-slate-500">
                    No notifications
                  </div>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => handleOpenItem(n)}
                    className={`group px-4 py-3 border-b border-slate-900 cursor-pointer transition ${
                      !n.read
                        ? "bg-slate-900/40 hover:bg-slate-900/60"
                        : "hover:bg-slate-900/30"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                          n.read ? "bg-slate-700" : "bg-red-500"
                        }`}
                      />
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-sm text-slate-200 leading-snug break-words">
                            {n.title}
                          </div>
                          <button
                            onClick={(e) => handleDelete(n.id, e)}
                            className="opacity-0 group-hover:opacity-100 transition p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-red-400 shrink-0"
                            title="Delete"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                        {n.body && (
                          <div className="text-xs text-slate-400 leading-relaxed line-clamp-3 break-words">
                            {n.body}
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 flex-wrap">
                          <span
                            className={`rounded px-1.5 py-0.5 border ${levelColor(
                              n.level
                            )}`}
                          >
                            {n.level}
                          </span>
                          <span>{timeAgo(n.created_at)}</span>
                          {n.source && (
                            <span className="text-slate-600">
                              · {n.source}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}