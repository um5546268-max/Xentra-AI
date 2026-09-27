import api from "@/lib/api";

export type Feedback = {
  id: string;
  user_id: string | null;
  user_email: string | null;
  user_name: string | null;
  user_avatar: string | null;
  category: "bug" | "feature" | "general" | "praise";
  rating: number | null;
  message: string;
  page_url: string | null;
  user_agent: string | null;
  screenshot_url: string | null;
  status: "new" | "reviewing" | "resolved" | "closed";
  meta: {
    reply?: string;
    replied_at?: string;
    replied_by?: string;
    [k: string]: any;
  } | null;
  created_at: string;
};

export type FeedbackStats = {
  total: number;
  new: number;
  avg_rating: number | null;
  this_week: number;
  by_status: Record<string, number>;
  by_category: Record<string, number>;
};

export type ListParams = {
  status?: string;
  category?: string;
  q?: string;
  page?: number;
  limit?: number;
};

export const listFeedback = async (params: ListParams) => {
  const { data } = await api.get("/api/v1/feedback/admin/list", {
    params: {
      status_filter: params.status && params.status !== "all" ? params.status : undefined,
      category_filter: params.category && params.category !== "all" ? params.category : undefined,
      q: params.q || undefined,
      page: params.page ?? 1,
      limit: params.limit ?? 20,
    },
  });
  return data as {
    items: Feedback[];
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};

export const getStats = async () => {
  const { data } = await api.get("/api/v1/feedback/admin/stats");
  return data as FeedbackStats;
};

export const getFeedback = async (id: string) => {
  const { data } = await api.get(`/api/v1/feedback/admin/${id}`);
  return data as Feedback;
};

export const patchFeedback = async (
  id: string,
  patch: { status?: Feedback["status"]; meta?: Record<string, any> }
) => {
  const { data } = await api.patch(`/api/v1/feedback/admin/${id}`, patch);
  return data as Feedback;
};

export const replyFeedback = async (id: string, message: string) => {
  const { data } = await api.post(`/api/v1/feedback/admin/${id}/reply`, {
    message,
  });
  return data as Feedback;
};

export const deleteFeedback = async (id: string) => {
  await api.delete(`/api/v1/feedback/admin/${id}`);
};

export const bulkAction = async (
  ids: string[],
  action: "read" | "resolved" | "closed" | "delete"
) => {
  const { data } = await api.post(`/api/v1/feedback/admin/bulk`, { ids, action });
  return data;
};

export const exportCsvUrl = (_status?: string) => {
  const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  return `${base}/api/v1/feedback/admin/export.csv`;
};