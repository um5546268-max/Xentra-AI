import api from "./api";

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════
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

export type MemoryUsage = {
  id: string;
  kind: string;
  key: string;
  value: string;
  importance: number;
  pinned: boolean;
};

// 🐝 Bee stream event
export type BeeStreamEvent = {
  id: string;
  type: string;
  title: string;
  progress: number;
  status: string;
  stoppable: boolean;
};

// 🖼 Topic image (image-first chat)
export type TopicImage = {
  url: string;
  source: string;
  title: string;
  page_url?: string;
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
  _memories?: MemoryUsage[];
  _topic_image?: TopicImage;      // 👈 NEW
};

// ═══════════════════════════════════════════════════════════════
// CONVERSATIONS
// ═══════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════
// MESSAGES
// ═══════════════════════════════════════════════════════════════
export const getMessages = async (
  conversationId: string
): Promise<Message[]> => {
  const res = await api.get(`/api/conversations/${conversationId}/messages`);
  return res.data;
};

// ═══════════════════════════════════════════════════════════════
// STREAMING CHAT
// ═══════════════════════════════════════════════════════════════
export const streamChat = async (
  conversationId: string,
  messages: { role: string; content: string }[],
  onDelta: (text: string) => void,
  options?: {
    useWebSearch?: boolean;
    onSources?: (sources: Source[]) => void;
    onImage?: (image: GeneratedImageEvent) => void;
    onFiles?: (files: AttachedFile[]) => void;
    onMemories?: (memories: MemoryUsage[]) => void;
    onBees?: (bees: BeeStreamEvent[]) => void;
    onBeeProgress?: (map: Record<string, number>) => void;
    onBeesDone?: (ids: string[]) => void;
    onTopicImage?: (img: TopicImage) => void;      // 👈 NEW
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
        if (parsed.memories && options?.onMemories)
          options.onMemories(parsed.memories);

        // 🐝 Bee events
        if (parsed.bees && options?.onBees) options.onBees(parsed.bees);
        if (parsed.bee_progress && options?.onBeeProgress) {
          const map: Record<string, number> = {};
          for (const p of parsed.bee_progress) map[p.id] = p.progress;
          options.onBeeProgress(map);
        }
        if (parsed.bees_done && options?.onBeesDone)
          options.onBeesDone(parsed.bees_done);

        // 🖼 Topic image event
        if (parsed.topic_image && options?.onTopicImage)
          options.onTopicImage(parsed.topic_image);

        if (parsed.error) throw new Error(parsed.error);
      } catch {}
    }
  }
};

// ═══════════════════════════════════════════════════════════════
// STREAMING RESEARCH
// ═══════════════════════════════════════════════════════════════
export const streamResearch = async (
  conversationId: string,
  messages: { role: string; content: string }[],
  onDelta: (text: string) => void,
  options?: {
    onSources?: (sources: Source[]) => void;
    onMemories?: (memories: MemoryUsage[]) => void;
    onBees?: (bees: BeeStreamEvent[]) => void;
    onBeeProgress?: (map: Record<string, number>) => void;
    onBeesDone?: (ids: string[]) => void;
    onTopicImage?: (img: TopicImage) => void;      // 👈 NEW
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
        if (parsed.memories && options?.onMemories)
          options.onMemories(parsed.memories);

        // 🐝 Bee events
        if (parsed.bees && options?.onBees) options.onBees(parsed.bees);
        if (parsed.bee_progress && options?.onBeeProgress) {
          const map: Record<string, number> = {};
          for (const p of parsed.bee_progress) map[p.id] = p.progress;
          options.onBeeProgress(map);
        }
        if (parsed.bees_done && options?.onBeesDone)
          options.onBeesDone(parsed.bees_done);

        // 🖼 Topic image event
        if (parsed.topic_image && options?.onTopicImage)
          options.onTopicImage(parsed.topic_image);

        if (parsed.error) throw new Error(parsed.error);
      } catch {}
    }
  }
};

// ═══════════════════════════════════════════════════════════════
// REGENERATE
// ═══════════════════════════════════════════════════════════════
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