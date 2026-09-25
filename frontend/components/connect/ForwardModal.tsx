"use client";

import { useEffect, useState } from "react";
import {
  X, Search, Loader2, CheckCircle2, Users, MessageSquare,
} from "lucide-react";
import { Chat, listChats, forwardMessage, ChatMessage } from "@/lib/chat-api";
import { useAuth } from "@/lib/auth";

export default function ForwardModal({
  message,
  onClose,
  onForwarded,
}: {
  message: ChatMessage;
  onClose: () => void;
  onForwarded: (targetChatId: string) => void;
}) {
  const currentUser = useAuth((state) => state.user);
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listChats()
      .then(setChats)
      .catch(() => setChats([]))
      .finally(() => setLoading(false));
  }, []);

  const handleForward = async (chatId: string) => {
    setSendingTo(chatId);
    setError(null);
    try {
      await forwardMessage(chatId, message);
      setSentTo((prev) => new Set(prev).add(chatId));
      onForwarded(chatId);
      // Give a moment for the checkmark to show
      setTimeout(() => onClose(), 600);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Forward failed");
    } finally {
      setSendingTo(null);
    }
  };

  const filtered = chats.filter((c) => {
    const name =
      c.type === "direct"
        ? c.members.find((m) => String(m.user_id) !== String(currentUser?.id))
            ?.full_name ||
          c.members.find((m) => String(m.user_id) !== String(currentUser?.id))
            ?.email ||
          ""
        : c.name || "";
    return name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-violet-500/40 bg-slate-950 p-5 max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-slate-500 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-4 shrink-0">
          <h2 className="text-base font-bold text-white">Forward to…</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Pick a chat to forward this message to
          </p>
        </div>

        {/* Preview of what's being forwarded */}
        <div className="rounded-lg border border-violet-500/30 bg-violet-500/5 p-3 mb-4 shrink-0">
          <div className="text-[10px] text-violet-300 font-medium mb-1">
            Forwarding:
          </div>
          <div className="text-xs text-slate-300 line-clamp-2">
            {message.content.length > 120
              ? message.content.slice(0, 120) + "…"
              : message.content}
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-3 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search chats…"
            className="w-full rounded-lg border border-slate-800 bg-slate-900 pl-9 pr-3 py-2 text-sm placeholder-slate-600 focus:border-violet-500 focus:outline-none"
          />
        </div>

        {error && (
          <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-300 shrink-0">
            {error}
          </div>
        )}

        {/* Chat list */}
        <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 text-slate-500 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-500">
              {chats.length === 0 ? "No chats yet" : "No matches"}
            </div>
          ) : (
            filtered.map((c) => {
              const other = c.members.find(
                (m) => String(m.user_id) !== String(currentUser?.id)
              );
              const name =
                c.type === "direct"
                  ? other?.full_name || other?.email || "Unknown"
                  : c.name || "Group";
              const initial = (name[0] || "?").toUpperCase();
              const isSent = sentTo.has(c.id);
              const isSending = sendingTo === c.id;

              return (
                <button
                  key={c.id}
                  onClick={() => !isSent && !isSending && handleForward(c.id)}
                  disabled={isSent || isSending}
                  className={`w-full flex items-center gap-3 rounded-lg p-2 transition text-left ${
                    isSent
                      ? "bg-emerald-500/10 border border-emerald-500/40"
                      : "hover:bg-slate-900 border border-transparent"
                  }`}
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-white text-xs font-semibold shrink-0">
                    {c.type === "group" ? (
                      <Users className="w-4 h-4" />
                    ) : (
                      initial
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-slate-200 truncate">{name}</div>
                    <div className="text-[10px] text-slate-500">
                      {c.type === "group"
                        ? `${c.members.length} members`
                        : "Direct chat"}
                    </div>
                  </div>
                  {isSending ? (
                    <Loader2 className="w-4 h-4 text-violet-400 animate-spin shrink-0" />
                  ) : isSent ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <MessageSquare className="w-4 h-4 text-slate-600 shrink-0" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}