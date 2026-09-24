"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Video, Phone, Search, MoreVertical, Sparkles, Send,
  Paperclip, Smile, Mic, Image as ImageIcon, Plus, FileText,
  Loader2, Reply as ReplyIcon,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useGuestGuard } from "@/lib/useGuestGuard";
import { usePolling } from "@/lib/usePolling";
import {
  Chat, ChatMessage, getChat, listMessages, sendMessage,
  markAsRead, sendTyping, getTypingStatus,
  editMessage, deleteMessage, toggleReaction,
  pinMessage, unpinMessage, listPinnedMessages,
} from "@/lib/chat-api";
import { uploadToChat } from "@/lib/upload";
import { ImageMedia, FileMedia, VoiceMedia, VideoMedia } from "./MessageMedia";
import MessageActions, { MessageAction } from "./MessageActions";
import ReplyPreview from "./ReplyPreview";
import VoiceRecorder from "./VoiceRecorder";
import AskXentraModal from "./AskXentraModal";
import SearchPanel from "./SearchPanel";
import PinnedBar from "./PinnedBar";
import {
  showBrowserNotification,
  requestBrowserNotifPermission,
  getBrowserNotifPermission,
  getBrowserNotifPrefs,
  setTabTitleUnread,
} from "@/lib/browser-notifications";

const MESSAGES_POLL_MS = 3000;
const TYPING_POLL_MS = 2000;
const TYPING_SEND_DEBOUNCE_MS = 3000;

export default function ChatWindowPanel({ chatId }: { chatId: string }) {
  const currentUser = useAuth((state) => state.user);
  const isGuest = useAuth((state) => state.isGuest);
  const loadFromStorage = useAuth((state) => state.loadFromStorage);
  const { requireAuth } = useGuestGuard();

  useEffect(() => {
    if (!currentUser) loadFromStorage();
  }, [currentUser, loadFromStorage]);

  // Browser notification permission
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;
    if (Notification.permission === "default") {
      const t = setTimeout(() => {
        requestBrowserNotifPermission().catch(() => {});
      }, 2000);
      return () => clearTimeout(t);
    }
  }, []);

  // Reset tab title when visible
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        (window as any).__xentra_unread_total__ = 0;
        setTabTitleUnread(0);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  // State
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [pins, setPins] = useState<ChatMessage[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [showAskXentra, setShowAskXentra] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [editing, setEditing] = useState<ChatMessage | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [menu, setMenu] = useState<{
    x: number;
    y: number;
    message: ChatMessage;
  } | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMessageIdRef = useRef<string | null>(null);
  const chatRef = useRef<Chat | null>(null);
  chatRef.current = chat;

  // Ctrl+F
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setShowSearch(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Load chat + messages + pins
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setChat(null);
    setMessages([]);
    setPins([]);
    setReplyTo(null);
    setEditing(null);

    Promise.all([
      getChat(chatId).catch(() => null),
      listMessages(chatId, { limit: 50 }).catch(() => []),
      listPinnedMessages(chatId).catch(() => []),
    ]).then(([c, m, p]) => {
      if (cancelled) return;
      setChat(c);
      setMessages(m);
      setPins(p);       // ✅ Use the actual pinned list
      setLoading(false);
      markAsRead(chatId).catch(() => {});
      if (m.length > 0) {
        lastMessageIdRef.current = m[m.length - 1].id;
      }
    });

    return () => { cancelled = true; };
  }, [chatId]);

  // Poll messages
  const pollMessages = useCallback(async () => {
    if (!chatId) return;
    try {
      const latest = await listMessages(chatId, { limit: 50 });
      const newLast = latest[latest.length - 1]?.id || null;

      if (newLast !== lastMessageIdRef.current) {
        const lastMsg = latest[latest.length - 1];
        const isIncoming =
          !!lastMsg &&
          lastMsg.id !== lastMessageIdRef.current &&
          String(lastMsg.sender_id) !== String(currentUser?.id) &&
          !lastMsg.meta?.is_ai;

        lastMessageIdRef.current = newLast;
        setMessages(latest);

        if (lastMsg && String(lastMsg.sender_id) !== String(currentUser?.id)) {
          markAsRead(chatId).catch(() => {});
        }

        if (isIncoming && lastMsg) {
          const isHidden =
            typeof document !== "undefined" &&
            document.visibilityState === "hidden";
          const prefs = getBrowserNotifPrefs();
          const enabled =
            prefs.enabled && getBrowserNotifPermission() === "granted";

          if (enabled) {
            const senderName = lastMsg.sender_name || "Someone";
            const c = chatRef.current;

            showBrowserNotification({
              title:
                c?.type === "group"
                  ? `📢 ${c.name || "Group"}`
                  : senderName,
              body: `${senderName}: ${lastMsg.content}`,
              chatId,
            });

            if (isHidden) {
              const prev = (window as any).__xentra_unread_total__ || 0;
              const total = prev + 1;
              (window as any).__xentra_unread_total__ = total;
              setTabTitleUnread(total);
            }
          }
        }
      }
    } catch (e) {
      console.error("[poll messages] error:", e);
    }
  }, [chatId, currentUser?.id]);

  usePolling(pollMessages, MESSAGES_POLL_MS, !loading && !!chatId);

  // Poll typing
  const pollTyping = useCallback(async () => {
    if (!chatId) return;
    try {
      const status = await getTypingStatus(chatId);
      const names = status.typing_user_ids
        .filter((id) => String(id) !== String(currentUser?.id))
        .map((id) => {
          const member = chatRef.current?.members.find(
            (m) => String(m.user_id) === String(id)
          );
          return member?.full_name || member?.email || "Someone";
        });
      setTypingUsers(names);
    } catch {}
  }, [chatId, currentUser?.id]);

  usePolling(pollTyping, TYPING_POLL_MS, !loading && !!chatId);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleTypingChange = (value: string) => {
    setMessage(value);
    if (value.trim() && chatId) {
      sendTyping(chatId, true).catch(() => {});
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        sendTyping(chatId, false).catch(() => {});
      }, TYPING_SEND_DEBOUNCE_MS);
    } else if (chatId) {
      sendTyping(chatId, false).catch(() => {});
    }
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (chatId) sendTyping(chatId, false).catch(() => {});
    };
  }, [chatId]);

  const handleSend = () => {
    const text = message.trim();
    if (!text) return;

    requireAuth(async () => {
      setSending(true);
      try {
        if (editing) {
          const updated = await editMessage(chatId, editing.id, text);
          setMessages((prev) =>
            prev.map((m) => (m.id === updated.id ? updated : m))
          );
          setEditing(null);
        } else {
          const msg = await sendMessage(chatId, {
            content: text,
            reply_to_id: replyTo?.id,
          });
          setMessages((prev) => [...prev, msg]);
          setReplyTo(null);
        }
        setMessage("");
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        sendTyping(chatId, false).catch(() => {});
      } catch (err) {
        console.error("Send failed:", err);
      } finally {
        setSending(false);
      }
    }, "Sign in to send messages.");
  };

  const handleCancelEdit = () => {
    setEditing(null);
    setMessage("");
  };

  const handleFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files);
    if (!arr.length) return;

    setUploading(true);
    setUploadPct(0);
    try {
      for (const file of arr) {
        await uploadToChat(chatId, file, undefined, (p) => setUploadPct(p));
      }
      const latest = await listMessages(chatId, { limit: 50 });
      setMessages(latest);
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Upload failed. Check console for details.");
    } finally {
      setUploading(false);
      setUploadPct(0);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    requireAuth(
      () => handleFiles(e.dataTransfer.files),
      "Sign in to upload files."
    );
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    const files: File[] = [];
    for (const item of items) {
      if (item.kind === "file") {
        const f = item.getAsFile();
        if (f) files.push(f);
      }
    }
    if (files.length) {
      e.preventDefault();
      requireAuth(() => handleFiles(files), "Sign in to upload files.");
    }
  };

  const handleContextMenu = (e: React.MouseEvent, msg: ChatMessage) => {
    e.preventDefault();
    if (msg.deleted_at) return;
    setMenu({ x: e.clientX, y: e.clientY, message: msg });
  };

  const handleAction = async (action: MessageAction) => {
    if (!menu) return;
    const msg = menu.message;
    setMenu(null);

    if (action === "reply") {
      setReplyTo(msg);
      setEditing(null);
    } else if (action === "edit") {
      setEditing(msg);
      setMessage(msg.content);
      setReplyTo(null);
    } else if (action === "delete") {
      if (!confirm("Delete this message?")) return;
      try {
        await deleteMessage(chatId, msg.id);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msg.id
              ? { ...m, deleted_at: new Date().toISOString(), content: "" }
              : m
          )
        );
      } catch (e) {
        console.error("Delete failed:", e);
      }
    } else if (action === "copy") {
      try {
        await navigator.clipboard.writeText(msg.content);
      } catch (e) {
        console.error("Copy failed:", e);
      }
    } else if (action === "share") {
      try {
        await navigator.clipboard.writeText(msg.content);
        alert("Message copied. Paste it in another chat to forward.");
      } catch (e) {
        console.error("Share failed:", e);
      }
    } else if (action === "pin" || action === "unpin") {
      await handlePinToggle(msg);
    }
  };

  const handleJumpToMessage = (messageId: string) => {
    setHighlightedId(messageId);
    setTimeout(() => {
      const el = document.getElementById(`msg-${messageId}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
    setTimeout(() => setHighlightedId(null), 2500);
  };

  const handlePinToggle = async (msg: ChatMessage) => {
    const isPinned = !!msg.pinned_at;
    try {
      if (isPinned) {
        await unpinMessage(chatId, msg.id);
        setPins((prev) => prev.filter((p) => p.id !== msg.id));
        setMessages((prev) =>
          prev.map((m) => (m.id === msg.id ? { ...m, pinned_at: null } : m))
        );
      } else {
        const updated = await pinMessage(chatId, msg.id);
        setPins((prev) => [updated, ...prev]);
        setMessages((prev) =>
          prev.map((m) => (m.id === msg.id ? updated : m))
        );
      }
    } catch (e) {
      console.error("Pin toggle failed:", e);
    }
  };

  const handleUnpinFromBar = async (messageId: string) => {
    try {
      await unpinMessage(chatId, messageId);
      setPins((prev) => prev.filter((p) => p.id !== messageId));
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, pinned_at: null } : m))
      );
    } catch (e) {
      console.error("Unpin failed:", e);
    }
  };

  const handleReact = async (emoji: string) => {
    if (!menu) return;
    const msg = menu.message;
    setMenu(null);
    try {
      const updated = await toggleReaction(chatId, msg.id, emoji);
      setMessages((prev) =>
        prev.map((m) => (m.id === updated.id ? updated : m))
      );
    } catch (e) {
      console.error("React failed:", e);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-slate-500 animate-spin" />
      </div>
    );
  }

  if (!chat) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
        Chat not found.
      </div>
    );
  }

  const other = chat.members.find(
    (m) => String(m.user_id) !== String(currentUser?.id)
  );
  const title =
    chat.type === "direct"
      ? other?.full_name || other?.email || "Unknown"
      : chat.name || "Group";
  const initial = (title[0] || "?").toUpperCase();
  const statusText =
    chat.type === "direct"
      ? "Online · Active now"
      : `${chat.members.length} members`;

  return (
    <div
      className={`flex flex-col h-full relative ${
        dragOver ? "ring-2 ring-violet-500 ring-inset" : ""
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setDragOver(false);
      }}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-slate-800">
        <div className="relative shrink-0">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-white font-semibold">
            {initial}
          </div>
          <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-950" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-white truncate">{title}</div>
          <div className="text-xs text-emerald-400">{statusText}</div>
        </div>
        <div className="flex items-center gap-1">
          <IconButton icon={<Video className="w-4 h-4" />} label="Video call" />
          <IconButton icon={<Phone className="w-4 h-4" />} label="Call" />
          <button
            onClick={() => setShowAskXentra(true)}
            className="flex items-center gap-1.5 rounded-lg border border-violet-500/40 bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-300 hover:bg-violet-500/20 transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Ask Xentra
          </button>
          <IconButton
            icon={<Search className="w-4 h-4" />}
            label="Search (Ctrl+F)"
            onClick={() => setShowSearch(true)}
          />
          <IconButton icon={<MoreVertical className="w-4 h-4" />} label="More" />
        </div>
      </div>

      {/* ✅ Pinned bar */}
      <PinnedBar
        pins={pins}
        onJumpTo={handleJumpToMessage}
        onUnpin={handleUnpinFromBar}
      />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-slate-500 text-sm py-10">
            No messages yet. Say hi! 👋
          </div>
        ) : (
          messages.map((msg) => {
            const repliedTo = msg.reply_to_id
              ? messages.find((m) => m.id === msg.reply_to_id) || null
              : null;
            const isAI = !!msg.meta?.is_ai;
            const isMine =
              !isAI && String(msg.sender_id) === String(currentUser?.id);

            return (
              <div key={msg.id} id={`msg-${msg.id}`}>
                <MessageBubble
                  msg={msg}
                  isMine={isMine}
                  currentUserId={String(currentUser?.id || "")}
                  repliedTo={repliedTo}
                  isHighlighted={highlightedId === msg.id}
                  onContextMenu={(e) => handleContextMenu(e, msg)}
                  onReact={async (emoji) => {
                    try {
                      const updated = await toggleReaction(chatId, msg.id, emoji);
                      setMessages((prev) =>
                        prev.map((m) => (m.id === updated.id ? updated : m))
                      );
                    } catch (e) {
                      console.error("React failed:", e);
                    }
                  }}
                />
              </div>
            );
          })
        )}

        {typingUsers.length > 0 && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md bg-slate-800 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">
                  {typingUsers.join(", ")}{" "}
                  {typingUsers.length === 1 ? "is" : "are"} typing
                </span>
                <div className="flex gap-0.5">
                  <span className="w-1 h-1 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1 h-1 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1 h-1 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="border-t border-slate-800 p-4">
        {replyTo && (
          <ReplyPreview message={replyTo} onCancel={() => setReplyTo(null)} />
        )}

        {editing && (
          <div className="flex items-center gap-2 mb-2 rounded-lg border border-amber-500/40 bg-amber-500/5 px-3 py-2">
            <ReplyIcon className="w-3.5 h-3.5 text-amber-400" />
            <div className="flex-1 text-xs text-amber-300">Editing message</div>
            <button
              onClick={handleCancelEdit}
              className="text-[10px] text-slate-400 hover:text-white transition"
            >
              Cancel
            </button>
          </div>
        )}

        {uploading && (
          <div className="flex items-center gap-2 mb-2 px-3 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/30">
            <Loader2 className="w-3.5 h-3.5 text-violet-400 animate-spin" />
            <span className="text-xs text-violet-200">
              Uploading… {uploadPct}%
            </span>
            <div className="flex-1 h-1 rounded bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-violet-500 transition-all"
                style={{ width: `${uploadPct}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <IconButton
            icon={<Plus className="w-4 h-4" />}
            label="Attach"
            onClick={() => fileInputRef.current?.click()}
          />
          <IconButton
            icon={<Paperclip className="w-4 h-4" />}
            label="File"
            onClick={() => fileInputRef.current?.click()}
          />
          <IconButton
            icon={<ImageIcon className="w-4 h-4" />}
            label="Image"
            onClick={() => imageInputRef.current?.click()}
          />

          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              if (e.target.files) {
                requireAuth(
                  () => handleFiles(e.target.files!),
                  "Sign in to upload files."
                );
              }
              e.target.value = "";
            }}
          />
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files) {
                requireAuth(
                  () => handleFiles(e.target.files!),
                  "Sign in to upload images."
                );
              }
              e.target.value = "";
            }}
          />

          <div className="flex-1 relative">
            <input
              value={message}
              onChange={(e) => handleTypingChange(e.target.value)}
              onPaste={handlePaste}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
                if (e.key === "Escape" && editing) {
                  handleCancelEdit();
                }
              }}
              placeholder={
                isGuest
                  ? "Sign in to send a message…"
                  : editing
                  ? "Edit your message…"
                  : "Type a message…"
              }
              className="w-full rounded-full border border-slate-800 bg-slate-900 px-4 py-2.5 text-sm placeholder-slate-600 focus:border-violet-500 focus:outline-none"
            />
          </div>

          <IconButton icon={<Smile className="w-4 h-4" />} label="Emoji" />

          <VoiceRecorder
            chatId={chatId}
            disabled={isGuest}
            onUploaded={async () => {
              const latest = await listMessages(chatId, { limit: 50 });
              setMessages(latest);
            }}
          />

          <button
            onClick={handleSend}
            disabled={!message.trim() || sending}
            className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-600 to-cyan-600 flex items-center justify-center text-white disabled:opacity-40 hover:opacity-90 transition shrink-0"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        <div className="flex items-center justify-between mt-2 px-1">
          <span className="text-[10px] text-slate-500 flex items-center gap-1">🔒 End-to-end encrypted</span>
          <span className="text-[10px] text-slate-500 flex items-center gap-1">● Private conversation</span>
        </div>
      </div>

      {/* Context menu */}
      {menu && (
        <MessageActions
          isMine={String(menu.message.sender_id) === String(currentUser?.id)}
          isAI={!!menu.message.meta?.is_ai}
          isPinned={!!menu.message.pinned_at}
          onAction={handleAction}
          onReact={handleReact}
          onClose={() => setMenu(null)}
          position={{ x: menu.x, y: menu.y }}
        />
      )}

      {/* Ask Xentra modal */}
      {showAskXentra && (
        <AskXentraModal
          chatId={chatId}
          onClose={() => setShowAskXentra(false)}
          onSent={async () => {
            const latest = await listMessages(chatId, { limit: 50 });
            setMessages(latest);
          }}
        />
      )}

      {/* Search panel */}
      {showSearch && (
        <SearchPanel
          chatId={chatId}
          onClose={() => setShowSearch(false)}
          onJumpTo={handleJumpToMessage}
        />
      )}
    </div>
  );
}

function IconButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-800 hover:text-white transition shrink-0"
    >
      {icon}
    </button>
  );
}

function MessageBubble({
  msg,
  isMine,
  currentUserId,
  repliedTo,
  isHighlighted,
  onContextMenu,
  onReact,
}: {
  msg: ChatMessage;
  isMine: boolean;
  currentUserId: string;
  repliedTo: ChatMessage | null;
  isHighlighted?: boolean;
  onContextMenu: (e: React.MouseEvent) => void;
  onReact: (emoji: string) => void;
}) {
  if (msg.deleted_at) {
    return (
      <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
        <div className="text-xs text-slate-600 italic">Message deleted</div>
      </div>
    );
  }

  const isAI = !!msg.meta?.is_ai;
  const time = new Date(msg.created_at).toLocaleTimeString([], {
    hour: "2-digit", minute: "2-digit",
  });

  const reactions = msg.reactions || {};
  const hasReactions = Object.keys(reactions).length > 0;

  return (
    <div
      className={`flex ${isMine ? "justify-end" : "justify-start"} transition-all ${
        isHighlighted ? "bg-violet-500/10 rounded-lg p-1 -m-1" : ""
      }`}
    >
      <div className="max-w-[70%] relative group">
        <div
          onContextMenu={onContextMenu}
          className={`rounded-2xl px-4 py-2.5 ${
            isAI ? "cursor-default" : "cursor-context-menu"
          } ${
            isAI
              ? "bg-gradient-to-br from-violet-900/60 to-slate-900 border border-violet-500/40 text-slate-100 rounded-bl-md"
              : isMine
              ? "bg-violet-600 text-white rounded-br-md"
              : "bg-slate-800 text-slate-100 rounded-bl-md"
          }`}
        >
          {repliedTo && (
            <div className="mb-1.5 pl-2 border-l-2 border-white/40">
              <div className="text-[10px] opacity-75 font-medium">
                {repliedTo.sender_name || "Them"}
              </div>
              <div className="text-[11px] opacity-80 line-clamp-2">
                {repliedTo.content.slice(0, 100)}
              </div>
            </div>
          )}

          {msg.type === "image" && msg.meta?.url ? (
            <ImageMedia meta={msg.meta as any} />
          ) : msg.type === "file" && msg.meta?.url ? (
            <FileMedia meta={msg.meta as any} isMine={isMine} />
          ) : msg.type === "voice" && msg.meta?.url ? (
            <VoiceMedia meta={msg.meta as any} />
          ) : msg.type === "video" && msg.meta?.url ? (
            <VideoMedia meta={msg.meta as any} />
          ) : isAI ? (
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-3 h-3 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-bold text-violet-300 mb-0.5 tracking-wider">
                  XENTRA AI
                </div>
                <p className="text-sm whitespace-pre-wrap break-words">
                  {msg.content}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
          )}

          <div
            className={`text-[10px] mt-1 flex items-center gap-1 ${
              isAI
                ? "text-violet-300"
                : isMine
                ? "text-violet-200"
                : "text-slate-400"
            }`}
          >
            {time}
            {msg.edited_at && <span>· edited</span>}
          </div>
        </div>

        {hasReactions && (
          <div
            className={`flex flex-wrap gap-1 mt-1 ${
              isMine ? "justify-end" : "justify-start"
            }`}
          >
            {Object.entries(reactions).map(([emoji, users]) => {
              const iReacted = (users as string[])
                .map(String)
                .includes(String(currentUserId));
              return (
                <button
                  key={emoji}
                  onClick={() => onReact(emoji)}
                  className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition ${
                    iReacted
                      ? "border-violet-500/60 bg-violet-500/20 text-violet-200"
                      : "border-slate-700 bg-slate-900 text-slate-400 hover:bg-slate-800"
                  }`}
                >
                  <span>{emoji}</span>
                  <span className="text-[10px]">
                    {(users as string[]).length}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}