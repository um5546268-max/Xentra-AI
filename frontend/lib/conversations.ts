import api from "./api";

// ---------- Types ----------

export type Conversation = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

export type Source = {
  title: string;
  url: string;
  content?: string;
  _domain?: string;
  _kind?: string;
  _score?: number;
  _trust?: number;
  _trust_level?: "high" | "medium" | "low";
  _trust_reasons?: string[];
  _freshness?: "today" | "week" | "month" | "older" | "unknown";
  _freshness_hint?: string;
};

export type GeneratedImageEvent = {
  id: string;
  url: string;
  prompt: string;
  width: number;
  height: number;
  seed: number | null;
};

export type AttachedFile = {
  id: string;
  name: string;
  size: number;
  extension?: string;
};

export type Message = {
  id: string;
  role: string;
  content: string;
  created_at: string;
  _temp?: boolean;
  _streaming?: boolean;
  _sources?: Source[];
  _image?: GeneratedImageEvent;
  _files?: AttachedFile[];
};

// ---------- Conversations ----------

export const getConversations = async (): Promise<Conversation[]> => {
  const res = await api.get("/api/conversations");
  return res.data;
};

export const createConversation = async (
  title?: string
): Promise<Conversation> => {
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

// ---------- Messages ----------

export const getMessages = async (
  conversationId: string
): Promise<Message[]> => {
  const res = await api.get(`/api/conversations/${conversationId}/messages`);
  return res.data;
};

// ---------- Chat (streaming) ----------

export const streamChat = async (
  conversationId: string,
  messages: { role: string; content: string }[],
  onDelta: (text: string) => void,
  options?: {
    useWebSearch?: boolean;
    onSources?: (sources: Source[]) => void;
    onImage?: (image: GeneratedImageEvent) => void;
    onFiles?: (files: AttachedFile[]) => void;
    signal?: AbortSignal;
  }
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
    body: JSON.stringify({
      conversation_id: conversationId,
      messages,
      use_web_search: options?.useWebSearch || false,
    }),
    signal: options?.signal,
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
      const payloadStr = line.slice(5).trim();
      if (payloadStr === "[DONE]") return;
      try {
        const parsed = JSON.parse(payloadStr);
        if (parsed.delta) onDelta(parsed.delta);
        if (parsed.sources && options?.onSources)
          options.onSources(parsed.sources);
        if (parsed.image && options?.onImage) options.onImage(parsed.image);
        if (parsed.files && options?.onFiles) options.onFiles(parsed.files);
        if (parsed.error) throw new Error(parsed.error);
      } catch {}
    }
  }
};

// ---------- Research (streaming) ----------

export const streamResearch = async (
  conversationId: string,
  messages: { role: string; content: string }[],
  onDelta: (text: string) => void,
  options?: {
    onSources?: (sources: Source[]) => void;
    signal?: AbortSignal;
  }
): Promise<void> => {
  const token = localStorage.getItem("xentra_token");
  const API_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const res = await fetch(`${API_URL}/api/chat/research`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      conversation_id: conversationId,
      messages,
    }),
    signal: options?.signal,
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
      const payloadStr = line.slice(5).trim();
      if (payloadStr === "[DONE]") return;
      try {
        const parsed = JSON.parse(payloadStr);
        if (parsed.delta) onDelta(parsed.delta);
        if (parsed.sources && options?.onSources)
          options.onSources(parsed.sources);
        if (parsed.error) throw new Error(parsed.error);
      } catch {}
    }
  }
};

// ---------- Regenerate ----------

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