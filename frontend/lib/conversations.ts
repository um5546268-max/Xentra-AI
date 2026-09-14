import api from "./api";

export type Conversation = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

export type Message = {
  id: string;
  role: string;
  content: string;
  created_at: string;
};

export const getConversations = async (): Promise<Conversation[]> => {
  const res = await api.get("/api/conversations");
  return res.data;
};

export const createConversation = async (title?: string): Promise<Conversation> => {
  const res = await api.post("/api/conversations", { title: title || null });
  return res.data;
};

export const deleteConversation = async (id: string): Promise<void> => {
  await api.delete(`/api/conversations/${id}`, {
    // 204 No Content — nothing to parse
    transformResponse: [(data) => data],
  });
};

export const updateConversation = async (id: string, title: string): Promise<Conversation> => {
  const res = await api.patch(`/api/conversations/${id}`, { title });
  return res.data;
};