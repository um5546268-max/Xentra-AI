import api from "./api";

export type AdminUser = {
  id: string;
  email: string;
  full_name: string | null;
  is_admin: boolean;
  emergency_stop: boolean;
  created_at: string;
};

export type AdminStats = {
  total_users: number;
  new_users_7d: number;
  active_users_7d: number;
  total_conversations: number;
  total_messages: number;
  total_tasks: number;
  tasks_running: number;
  total_images: number;
  total_files: number;
  total_automations: number;
  automations_enabled: number;
  usage_last_24h: Record<string, number>;
  plan_distribution: Record<string, number>;
};

export type AdminUserListResponse = {
  count: number;
  users: AdminUser[];
};

export const getAdminStats = async (): Promise<AdminStats> => {
  const res = await api.get("/api/admin/stats");
  return res.data;
};

export const getAdminUsers = async (params?: {
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<AdminUserListResponse> => {
  const res = await api.get("/api/admin/users", { params });
  return res.data;
};

export const updateAdminUser = async (
  userId: string,
  data: { is_admin?: boolean; emergency_stop?: boolean }
): Promise<AdminUser> => {
  const res = await api.patch(`/api/admin/users/${userId}`, data);
  return res.data;
};

export const deleteAdminUser = async (userId: string): Promise<void> => {
  await api.delete(`/api/admin/users/${userId}`, {
    transformResponse: [(data) => data],
  });
};

// ----- Helpers -----

export const metricLabel = (key: string): string => {
  const map: Record<string, string> = {
    messages: "Messages",
    tasks: "Tasks",
    images: "Images",
    voice_seconds: "Voice (seconds)",
    web_searches: "Web searches",
    files_storage_bytes: "File storage",
  };
  return map[key] || key.replace(/_/g, " ");
};

export const timeAgo = (iso: string): string => {
  const then = new Date(iso).getTime();
  const diff = Math.floor((Date.now() - then) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
};
export type FeatureFlag = {
  id: string;
  key: string;
  description: string | null;
  enabled: boolean;
  rollout_percent: number;
  enabled_for_users: any;
  created_at: string;
  updated_at: string;
};

export type Announcement = {
  id: string;
  title: string;
  body: string | null;
  level: string;
  active: boolean;
  dismissible: boolean;
  target: string;
  created_at: string;
};

export const getFeatureFlags = async (): Promise<FeatureFlag[]> => {
  const res = await api.get("/api/admin/feature-flags");
  return res.data;
};

export const setFeatureFlag = async (
  key: string,
  data: Partial<FeatureFlag>
): Promise<FeatureFlag> => {
  const res = await api.put(`/api/admin/feature-flags/${key}`, data);
  return res.data;
};

export const getAnnouncements = async (): Promise<Announcement[]> => {
  const res = await api.get("/api/admin/announcements");
  return res.data;
};

export const createAnnouncement = async (data: {
  title: string;
  body?: string;
  level?: string;
  target?: string;
}): Promise<Announcement> => {
  const res = await api.post("/api/admin/announcements", data);
  return res.data;
};

export const deleteAnnouncement = async (id: string): Promise<void> => {
  await api.delete(`/api/admin/announcements/${id}`, {
    transformResponse: [(data) => data],
  });
};

export const getAdminHealth = async (): Promise<any> => {
  const res = await api.get("/api/admin/health");
  return res.data;
};
