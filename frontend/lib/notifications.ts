import api from "./api";

export type Notification = {
  id: string;
  title: string;
  body: string | null;
  level: "info" | "success" | "warning" | "error";
  source: string;
  source_id: string | null;
  link: string | null;
  read: boolean;
  meta: Record<string, any> | null;
  created_at: string;
};

export type NotificationListResponse = {
  count: number;
  unread: number;
  notifications: Notification[];
};

export const listNotifications = async (
  limit = 30,
  onlyUnread = false
): Promise<NotificationListResponse> => {
  const res = await api.get("/api/notifications", {
    params: { limit, only_unread: onlyUnread },
  });
  return res.data;
};

export const markNotificationRead = async (
  id: string
): Promise<Notification> => {
  const res = await api.post(`/api/notifications/${id}/read`);
  return res.data;
};

export const markAllRead = async (): Promise<void> => {
  await api.post("/api/notifications/read-all");
};

export const deleteNotification = async (id: string): Promise<void> => {
  await api.delete(`/api/notifications/${id}`, {
    transformResponse: [(data) => data],
  });
};

export const clearAllNotifications = async (): Promise<void> => {
  await api.delete("/api/notifications", {
    transformResponse: [(data) => data],
  });
};

// ----- Helpers -----

export const levelColor = (level: string): string => {
  switch (level) {
    case "success":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
    case "warning":
      return "border-yellow-500/40 bg-yellow-500/10 text-yellow-300";
    case "error":
      return "border-red-500/40 bg-red-500/10 text-red-300";
    default:
      return "border-blue-500/40 bg-blue-500/10 text-blue-300";
  }
};

export const timeAgo = (iso: string): string => {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
};