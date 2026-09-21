"use client";

import { use, useEffect, useRef, useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { Message, getMessages, streamChat } from "@/lib/conversations";

export default function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = use(params);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load history
  useEffect(() => {
    setLoading(true);
    setError(null);
    getMessages(conversationId)
      .then(setMessages)
      .catch(() => setError("Could not load messages"))
      .finally(() => setLoading(false));
  }, [conversationId]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;

    const userText = input.trim();
    setInput("");
    setError(null);

    const tempUser: Message = {
      id: "temp-user-" + Date.now(),
      role: "user",
      content: userText,
      created_at: new Date().toISOString(),
    };

    const tempAi: Message = {
      id: "temp-ai-" + Date.now(),
      role: "assistant",
      content: "",
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUser, tempAi]);
    setSending(true);

    const history = [
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: userText },
    ];

    try {
      await streamChat(conversationId, history, (delta) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempAi.id ? { ...m, content: m.content + delta } : m
          )
        );
      });
    } catch (err: any) {
      setError(err?.message || "Stream failed");
      // remove empty assistant placeholder
      setMessages((prev) => prev.filter((m) => m.id !== tempAi.id));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-slate-800 px-6 py-4">
        <div className="text-sm text-slate-500">Conversation</div>
        <div className="font-mono text-xs text-slate-400 truncate">
          {conversationId}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {loading ? (
          <div className="text-center text-slate-600 text-sm py-8">
            Loading history…
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-slate-600 py-16 space-y-2">
            <div className="text-2xl font-semibold text-slate-400">
              Start the conversation
            </div>
            <div className="text-sm">
              Xentra is ready. Say hi, ask a question, or give a task.
            </div>
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}
            >
              {m.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-violet-500/20 border border-violet-500/40 flex items-center justify-center shrink-0">
                  <span className="text-violet-300 text-sm font-bold">X</span>
                </div>
              )}
              <div
                className={`max-w-2xl rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${
                  m.role === "user"
                    ? "bg-violet-600 text-white"
                    : "bg-slate-800 text-slate-100"
                }`}
              >
                {m.content || (
                  <span className="inline-flex items-center gap-2 text-slate-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Thinking…
                  </span>
                )}
              </div>
            </div>
          ))
        )}

        {error && (
          <div className="text-center text-red-400 text-sm bg-red-950/40 border border-red-800 rounded-lg py-2 px-4">
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="border-t border-slate-800 p-4">
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend(e as any);
              }
            }}
            placeholder="Type your message… (Shift+Enter for newline)"
            rows={2}
            className="flex-1 resize-none rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-white placeholder-slate-600 focus:border-violet-500 focus:outline-none"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="rounded-xl bg-violet-600 p-3 hover:bg-violet-500 disabled:opacity-40 transition"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}