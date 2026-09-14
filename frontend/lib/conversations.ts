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
  _temp?: boolean;      // local-only optimistic message
  _streaming?: boolean; // currently streaming
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
    transformResponse: [(data) => data],
  });
};

export const updateConversation = async (
  id: string,
  title: string
): Promise<Conversation> => {
  const res = await api.patch(`/api/conversations/${id}`, { title });
  return res.data;
};

export const getMessages = async (
  conversationId: string
): Promise<Message[]> => {
  const res = await api.get(`/api/conversations/${conversationId}/messages`);
  return res.data;
};

export const streamChat = async (
  conversationId: string,
  messages: { role: string; content: string }[],
  onDelta: (text: string) => void,
  signal?: AbortSignal
): Promise<void> => {
  const token = localStorage.getItem("xentra_token");
  const API_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const res = await fetch(`${API_URL}/api/chat/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ conversation_id: conversationId, messages }),
    signal,
  });

  if (!res.ok || !res.body) throw new Error(`Stream failed: ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() || "";

    for (const part of parts) {
      const line = part.trim();
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (payload === "[DONE]") return;
      try {
        const parsed = JSON.parse(payload);
        if (parsed.delta) onDelta(parsed.delta);
        if (parsed.error) throw new Error(parsed.error);
      } catch {
        // skip bad chunks
      }
    }
  }
};

export const regenerateChat = async (
  conversationId: string,
  messages: { role: string; content: string }[]
): Promise<{ content: string; model: string }> => {
  const res = await api.post("/api/chat/regenerate", {
    conversation_id: conversationId,
    messages,
  });
  return res.data;
};