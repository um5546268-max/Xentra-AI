import api from "./api";

export type FeedbackCategory = "bug" | "feature" | "general" | "praise";

export type FeedbackCreate = {
  category: FeedbackCategory;
  rating?: number;
  message: string;
  page_url?: string;
  screenshot_url?: string;
};

export type FeedbackRead = {
  id: string;
  category: FeedbackCategory;
  rating: number | null;
  message: string;
  status: string;
  created_at: string;
};

export const submitFeedback = async (
  payload: FeedbackCreate
): Promise<FeedbackRead> => {
  const res = await api.post("/api/feedback", payload);
  return res.data;
};

export const listMyFeedback = async (): Promise<FeedbackRead[]> => {
  const res = await api.get("/api/feedback/mine");
  return res.data;
};

export type FeedbackAdminItem = {
  id: string;
  user_id: string | null;
  user_email: string | null;
  user_name: string | null;
  category: "bug" | "feature" | "general" | "praise";
  rating: number | null;
  message: string;
  page_url: string | null;
  user_agent: string | null;
  screenshot_url: string | null;
  status: "new" | "reviewing" | "resolved" | "closed";
  created_at: string;
};

export const listAllFeedback = async (
  opts?: { status?: string; category?: string }
): Promise<FeedbackAdminItem[]> => {
  const res = await api.get("/api/feedback/admin/list", {
    params: {
      status_filter: opts?.status,
      category_filter: opts?.category,
    },
  });
  return res.data;
};

export const updateFeedbackStatus = async (
  id: string,
  status: FeedbackAdminItem["status"]
): Promise<void> => {
  await api.patch(`/api/feedback/admin/${id}`, { status });
};