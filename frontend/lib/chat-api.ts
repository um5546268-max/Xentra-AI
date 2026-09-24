import api from "./api";

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════
export type ChatType = "direct" | "group";
export type ChatRole = "member" | "moderator" | "admin";
export type MessageType = "text" | "image" | "file" | "voice" | "video" | "system";

export type ChatMember = {
  id: string;
  user_id: string;
  role: ChatRole;
  joined_at: string;
  last_read_at: string | null;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  is_online?: boolean;
};

export type Chat = {
  id: string;
  type: ChatType;
  name: string | null;
  description: string | null;
  category: string | null;
  is_public: boolean;
  avatar_color: string | null;
  last_message_at: string | null;
  last_message_preview: string | null;
  created_at: string;
  members: ChatMember[];
};

export type ChatMessage = {
  id: string;
  chat_id: string;
  sender_id: string;
  type: MessageType;
  content: string;
  meta: Record<string, any> | null;
  reply_to_id: string | null;
  forwarded_from_id: string | null;
  reactions: Record<string, string[]> | null;
  edited_at: string | null;
  deleted_at: string | null;
  created_at: string;
  sender_name: string | null;
  sender_avatar: string | null;
  pinned_at: string | null;
};

// ═══════════════════════════════════════════════════════════════
// CHAT ENDPOINTS
// ═══════════════════════════════════════════════════════════════

export const listChats = async (): Promise<Chat[]> => {
  const res = await api.get("/api/chats");
  return res.data;
};

export const getChat = async (chatId: string): Promise<Chat> => {
  const res = await api.get(`/api/chats/${chatId}`);
  return res.data;
};

export const createDirectChat = async (otherUserId: string): Promise<Chat> => {
  const res = await api.post("/api/chats", { other_user_id: otherUserId });
  return res.data;
};

export const createGroupChat = async (payload: {
  name: string;
  description?: string;
  category?: string;
  is_public?: boolean;
  member_ids?: string[];
}): Promise<Chat> => {
  const res = await api.post("/api/chats", {
    name: payload.name,
    description: payload.description,
    category: payload.category,
    is_public: payload.is_public ?? false,
    member_ids: payload.member_ids ?? [],
  });
  return res.data;
};

// ═══════════════════════════════════════════════════════════════
// MESSAGE ENDPOINTS
// ═══════════════════════════════════════════════════════════════

export const listMessages = async (
  chatId: string,
  options?: { limit?: number; before?: string }
): Promise<ChatMessage[]> => {
  const params: Record<string, string | number> = {};
  if (options?.limit) params.limit = options.limit;
  if (options?.before) params.before = options.before;
  const res = await api.get(`/api/chats/${chatId}/messages`, { params });
  return res.data;
};

export const sendMessage = async (
  chatId: string,
  payload: {
    type?: MessageType;
    content: string;
    meta?: Record<string, any>;
    reply_to_id?: string;
  }
): Promise<ChatMessage> => {
  const res = await api.post(`/api/chats/${chatId}/messages`, {
    type: payload.type ?? "text",
    content: payload.content,
    meta: payload.meta,
    reply_to_id: payload.reply_to_id,
  });
  return res.data;
};

export const editMessage = async (
  chatId: string,
  messageId: string,
  content: string
): Promise<ChatMessage> => {
  const res = await api.patch(`/api/chats/${chatId}/messages/${messageId}`, {
    content,
  });
  return res.data;
};

export const deleteMessage = async (
  chatId: string,
  messageId: string
): Promise<void> => {
  await api.delete(`/api/chats/${chatId}/messages/${messageId}`);
};

export const toggleReaction = async (
  chatId: string,
  messageId: string,
  emoji: string
): Promise<ChatMessage> => {
  const res = await api.post(
    `/api/chats/${chatId}/messages/${messageId}/react`,
    { emoji }
  );
  return res.data;
};

// ═══════════════════════════════════════════════════════════════
// Real-time helpers (polling)
// ═══════════════════════════════════════════════════════════════

export const markAsRead = async (chatId: string): Promise<void> => {
  await api.post(`/api/chats/${chatId}/read`);
};

export const sendTyping = async (
  chatId: string,
  isTyping: boolean
): Promise<void> => {
  await api.post(`/api/chats/${chatId}/typing`, { is_typing: isTyping });
};

export const getTypingStatus = async (
  chatId: string
): Promise<{ typing_user_ids: string[]; updated_at: string }> => {
  const res = await api.get(`/api/chats/${chatId}/typing`);
  return res.data;
};

export const getUnreadSummary = async (): Promise<
  { chat_id: string; unread: number }[]
> => {
  const res = await api.get("/api/chats/unread/summary");
  return res.data;
};

// ═══════════════════════════════════════════════════════════════
// Group member management
// ═══════════════════════════════════════════════════════════════

export const addGroupMember = async (
  chatId: string,
  userId: string
): Promise<Chat> => {
  const res = await api.post(`/api/chats/${chatId}/members`, {
    user_id: userId,
  });
  return res.data;
};

export const removeGroupMember = async (
  chatId: string,
  userId: string
): Promise<void> => {
  await api.delete(`/api/chats/${chatId}/members/${userId}`);
};

export const updateGroupMemberRole = async (
  chatId: string,
  userId: string,
  role: "member" | "moderator" | "admin"
): Promise<Chat> => {
  const res = await api.patch(`/api/chats/${chatId}/members/${userId}`, {
    role,
  });
  return res.data;
};

// ═══════════════════════════════════════════════════════════════
// Public group discovery
// ═══════════════════════════════════════════════════════════════

export const discoverPublicGroups = async (opts?: {
  search?: string;
  category?: string;
}): Promise<Chat[]> => {
  const params: Record<string, string> = {};
  if (opts?.search) params.search = opts.search;
  if (opts?.category) params.category = opts.category;
  const res = await api.get("/api/chats/discover/public", { params });
  return res.data;
};

export const joinPublicGroup = async (chatId: string): Promise<Chat> => {
  const res = await api.post(`/api/chats/${chatId}/join`);
  return res.data;
};

// ═══════════════════════════════════════════════════════════════
// Ask Xentra (AI in chat)
// ═══════════════════════════════════════════════════════════════

export type AskXentraAction =
  | "summarize"
  | "explain"
  | "translate"
  | "quiz"
  | "action_items"
  | "custom";

export const askXentra = async (
  chatId: string,
  payload: {
    action: AskXentraAction;
    message_id?: string;
    prompt?: string;
    language?: string;
  }
): Promise<ChatMessage> => {
  const res = await api.post(`/api/chats/${chatId}/ask-xentra`, payload);
  return res.data;
};

// ═══════════════════════════════════════════════════════════════
// Private Ask Xentra + Share
// ═══════════════════════════════════════════════════════════════

export const askXentraPrivate = async (
  chatId: string,
  payload: {
    action: AskXentraAction;
    message_id?: string;
    prompt?: string;
    language?: string;
  }
): Promise<{ text: string; action: string }> => {
  const res = await api.post(`/api/chats/${chatId}/ask-xentra/private`, payload);
  return res.data;
};

export const shareAIMessage = async (
  chatId: string,
  content: string
): Promise<ChatMessage> => {
  const res = await api.post(`/api/chats/${chatId}/ask-xentra`, {
    action: "share",
    content,
  });
  return res.data;
};

// ═══════════════════════════════════════════════════════════════
// Search
// ═══════════════════════════════════════════════════════════════

export const searchMessages = async (
  chatId: string,
  query: string,
  limit = 50
): Promise<ChatMessage[]> => {
  const res = await api.get(`/api/chats/${chatId}/search`, {
    params: { q: query, limit },
  });
  return res.data;
};

// ═══════════════════════════════════════════════════════════════
// Pinned messages
// ═══════════════════════════════════════════════════════════════

export const pinMessage = async (
  chatId: string,
  messageId: string
): Promise<ChatMessage> => {
  const res = await api.post(`/api/chats/${chatId}/messages/${messageId}/pin`);
  return res.data;
};

export const unpinMessage = async (
  chatId: string,
  messageId: string
): Promise<ChatMessage> => {
  const res = await api.delete(`/api/chats/${chatId}/messages/${messageId}/pin`);
  return res.data;
};

export const listPinnedMessages = async (
  chatId: string
): Promise<ChatMessage[]> => {
  const res = await api.get(`/api/chats/${chatId}/pinned`);
  return res.data;
};

// ═══════════════════════════════════════════════════════════════
// Shared media
// ═══════════════════════════════════════════════════════════════

export const listSharedMedia = async (
  chatId: string,
  type?: "image" | "file" | "video" | "voice"
): Promise<ChatMessage[]> => {
  const params: Record<string, string> = {};
  if (type) params.type = type;
  const res = await api.get(`/api/chats/${chatId}/media`, { params });
  return res.data;
};