import api from "./api";

export type LibraryItemType = "session" | "note" | "test";

export type LibraryItem = {
  id: string;
  type: LibraryItemType;
  title: string;
  preview: string;
  subject: string | null;
  created_at: string;
  meta: Record<string, any>;
};

export type LibraryStats = {
  sessions: number;
  notes: number;
  tests: number;
  total: number;
};

export const listLibrary = async (
  type: "all" | LibraryItemType | "sessions" | "notes" | "tests" = "all",
  search?: string,
): Promise<{ count: number; items: LibraryItem[] }> => {
  const params = new URLSearchParams();
  if (type !== "all") params.set("type", type);
  if (search) params.set("search", search);
  const res = await api.get(`/api/library?${params.toString()}`);
  return res.data;
};

export const getLibraryStats = async (): Promise<LibraryStats> => {
  const res = await api.get("/api/library/stats");
  return res.data;
};