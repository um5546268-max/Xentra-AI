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