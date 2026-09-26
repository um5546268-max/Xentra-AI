"use client";

import { useEffect, useState } from "react";
import { X, Bell, Loader2, CheckCheck } from "lucide-react";

type NotificationItem = {
  id: string;
  title: string;
  body?: string | null;
  level?: string;
  created_at: string;
  read?: boolean;
  link?: string | null;
};

export default function NotificationsSheet({
  onClose,
}: {
  onClose: () => void;
}) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const mod = await import("@/lib/notifications");
        const fn =
          (mod as any).listNotifications ||
          (mod as any).getNotifications;

        if (typeof fn === "function") {
          const data = await fn({ limit: 50 });
          setItems(Array.isArray(data) ? data : data?.notifications || []);
        }
      } catch {
        // Notifications API not available
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const markAllRead = async () => {
    try {
      const mod = await import("@/lib/notifications");
      const fn = (mod as any).markAllRead || (mod as any).markAllAsRead;
      if (typeof fn === "function") {
        await fn();
      }
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {}
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg mx-auto bg-slate-950 border-t border-slate-800 rounded-t-3xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-700" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-violet-500/20 border border-violet-500/40 flex items-center justify-center">
              <Bell className="w-4 h-4 text-violet-300" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-100">
                Notifications
              </div>
              <div className="text-[10px] text-slate-500">
                {items.filter((i) => !i.read).length} unread
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {items.some((i) => !i.read) && (
              <button
                onClick={markAllRead}
                className="px-2.5 py-1.5 rounded-lg text-[11px] text-violet-300 hover:bg-slate-900 transition flex items-center gap-1"
                title="Mark all as read"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-900 hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-5 h-5 text-slate-500 animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center">
                <Bell className="w-6 h-6 text-slate-600" />
              </div>
              <div className="text-xs text-slate-500">
                You're all caught up 🎉
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((n) => (
                <div
                  key={n.id}
                  className={`rounded-xl border p-3 ${
                    n.read
                      ? "border-slate-800 bg-slate-900/40"
                      : "border-violet-500/40 bg-violet-500/5"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div
                      className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                        n.level === "error"
                          ? "bg-red-400"
                          : n.level === "success"
                          ? "bg-emerald-400"
                          : n.level === "warning"
                          ? "bg-yellow-400"
                          : "bg-violet-400"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-100 truncate">
                        {n.title}
                      </div>
                      {n.body && (
                        <div className="text-xs text-slate-400 mt-0.5 line-clamp-2">
                          {n.body}
                        </div>
                      )}
                      <div className="text-[10px] text-slate-600 mt-1">
                        {new Date(n.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}