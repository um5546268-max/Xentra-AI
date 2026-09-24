"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X, Loader2, MessageSquare } from "lucide-react";
import { ChatMessage, searchMessages } from "@/lib/chat-api";
import Avatar from "@/components/Avatar";

export default function SearchPanel({
  chatId,
  onClose,
  onJumpTo,
}: {
  chatId: string;
  onClose: () => void;
  onJumpTo: (messageId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setError(null);
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const r = await searchMessages(chatId, query.trim());
        setResults(r);
      } catch (e: any) {
        setError(e?.response?.data?.detail || "Search failed");
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [chatId, query]);

  // Escape to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleClick = (msg: ChatMessage) => {
    onJumpTo(msg.id);
    onClose();
  };

  return (
    <div className="absolute inset-y-0 right-0 w-96 max-w-full bg-slate-950 border-l border-slate-800 z-40 flex flex-col shadow-2xl shadow-black/60">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center shrink-0">
          <Search className="w-4 h-4 text-violet-300" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-white">Search messages</div>
          <div className="text-[10px] text-slate-500">
            {results.length > 0
              ? `${results.length} result${results.length === 1 ? "" : "s"}`
              : "Type to search"}
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-800 hover:text-white transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search input */}
      <div className="p-3 border-b border-slate-800">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search this chat…"
            className="w-full rounded-lg border border-slate-800 bg-slate-900 pl-9 pr-3 py-2 text-sm placeholder-slate-600 focus:border-violet-500 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded flex items-center justify-center text-slate-500 hover:bg-slate-800 hover:text-white transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-5 h-5 text-slate-500 animate-spin" />
          </div>
        ) : error ? (
          <div className="mx-2 mt-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
            {error}
          </div>
        ) : !query.trim() ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <MessageSquare className="w-8 h-8 text-slate-700 mb-2" />
            <div className="text-xs text-slate-500">
              Type something to search messages in this chat.
            </div>
          </div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <div className="text-xs text-slate-500">
              No messages found for <span className="text-slate-300">"{query}"</span>
            </div>
          </div>
        ) : (
          results.map((msg) => (
            <ResultRow
              key={msg.id}
              msg={msg}
              query={query}
              onClick={() => handleClick(msg)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function ResultRow({
  msg,
  query,
  onClick,
}: {
  msg: ChatMessage;
  query: string;
  onClick: () => void;
}) {
  const time = new Date(msg.created_at).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const senderName = msg.sender_name || "Unknown";

  // Highlight the query
  const idx = msg.content.toLowerCase().indexOf(query.toLowerCase());
  let before = msg.content;
  let match = "";
  let after = "";
  if (idx >= 0) {
    before = msg.content.slice(0, idx);
    match = msg.content.slice(idx, idx + query.length);
    after = msg.content.slice(idx + query.length);
  }

  return (
    <button
      onClick={onClick}
      className="w-full flex items-start gap-3 rounded-lg p-3 hover:bg-slate-900 transition text-left border border-transparent hover:border-slate-800"
    >
      <Avatar
        src={msg.sender_avatar}
        name={senderName}
        email={senderName}
        size={32}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className="text-xs font-medium text-slate-300 truncate">
            {senderName}
          </span>
          <span className="text-[10px] text-slate-500 shrink-0">
            {time}
          </span>
        </div>
        <div className="text-xs text-slate-400 line-clamp-2">
          {match ? (
            <>
              {before.length > 40 && "…"}
              {before.slice(-40)}
              <mark className="bg-violet-500/40 text-violet-100 px-0.5 rounded">
                {match}
              </mark>
              {after.slice(0, 60)}
              {after.length > 60 && "…"}
            </>
          ) : (
            msg.content.slice(0, 120)
          )}
        </div>
      </div>
    </button>
  );
}