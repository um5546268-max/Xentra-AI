"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Send, Paperclip, Mic, Image as ImageIcon, Sparkles,
  Bot, User as UserIcon, Loader2, Plus,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import api from "@/lib/api";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

type Conversation = {
  id: string;
  title: string;
};

const QUICK_PROMPTS = [
  { id: "explain",   label: "Explain this topic",  icon: "💡", prompt: "Explain this topic in simple terms: " },
  { id: "program",   label: "Write a program",     icon: "💻", prompt: "Write a program that " },
  { id: "pdf",       label: "Summarize a PDF",     icon: "📄", prompt: "Summarize the key points of this: " },
  { id: "study",     label: "Help with study",     icon: "📚", prompt: "Help me study for " },
];

export default function MobileChat() {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const firstName = user?.full_name?.split(" ")[0] || "there";

  // ── Auto-scroll to bottom ──
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sending]);

  // ── Load most recent conversation on mount ──
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/api/conversations");
        const convos: Conversation[] = res.data?.conversations || res.data || [];
        if (convos.length > 0) {
          const latest = convos[0];
          setConversationId(latest.id);
          const msgsRes = await api.get(`/api/conversations/${latest.id}/messages`);
          const msgs = msgsRes.data?.messages || msgsRes.data || [];
          setMessages(msgs);
        }
      } catch (e) {
        console.error("[chat] load failed:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Send message ──
  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;

    setInput("");
    setSending(true);

    // Optimistic: add user message immediately
    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      let cid = conversationId;

      // Create conversation if none exists
      if (!cid) {
        const createRes = await api.post("/api/conversations", {
          title: text.slice(0, 50),
        });
        cid = createRes.data.id;
        setConversationId(cid);
      }

      // Send the message
      const res = await api.post(`/api/conversations/${cid}/messages`, {
        content: text,
      });

      const aiContent =
        res.data?.message?.content ||
        res.data?.content ||
        res.data?.reply ||
        "I'm here to help!";

      const aiMsg: Message = {
        id: res.data?.message?.id || `ai-${Date.now()}`,
        role: "assistant",
        content: aiContent,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (e: any) {
      console.error("[chat] send failed:", e);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content:
            e?.response?.data?.detail ||
            "Something went wrong. Please try again.",
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  // ── Apply a quick prompt ──
  const applyPrompt = (prompt: string) => {
    setInput(prompt);
    inputRef.current?.focus();
  };

  // ── New conversation ──
  const handleNewChat = () => {
    setMessages([]);
    setConversationId(null);
    setInput("");
  };

  // ── Textarea key handling ──
  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-950">
      {/* ─── Top header ─── */}
      <div className="shrink-0 px-4 pt-3 pb-2 flex items-center justify-between border-b border-slate-800/60">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-950" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-slate-100">
              Xentra AI
            </div>
            <div className="flex items-center gap-1 text-[10px] text-emerald-400">
              <span className="w-1 h-1 rounded-full bg-emerald-400" />
              Online • Always here
            </div>
          </div>
        </div>
        <button
          onClick={handleNewChat}
          className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-200 transition"
          title="New chat"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* ─── Messages ─── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
      >
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-slate-500 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          /* Empty state — welcome */
          <div className="pt-6 space-y-6">
            <div className="flex gap-3">
              <div className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 rounded-2xl rounded-tl-md border border-slate-800 bg-slate-900/60 px-4 py-3">
                <div className="text-sm text-slate-200 leading-relaxed">
                  Hello {firstName}! 👋
                  <br />
                  I'm Xentra, your AI assistant. How can I help you today?
                </div>
              </div>
            </div>

            {/* Quick prompts */}
            <div className="space-y-2.5 pl-11">
              <div className="text-[11px] uppercase tracking-wider text-slate-500">
                Quick prompts
              </div>
              <div className="grid grid-cols-2 gap-2">
                {QUICK_PROMPTS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => applyPrompt(p.prompt)}
                    className="flex items-start gap-2 rounded-xl border border-slate-800 bg-slate-900/40 p-3 text-left hover:border-violet-500/40 hover:bg-slate-900 transition active:scale-95"
                  >
                    <span className="text-lg shrink-0">{p.icon}</span>
                    <span className="text-[11px] text-slate-300 leading-snug">
                      {p.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Message bubbles */
          messages.map((m) => <MessageBubble key={m.id} message={m} />)
        )}

        {/* Typing indicator */}
        {sending && (
          <div className="flex gap-3">
            <div className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="rounded-2xl rounded-tl-md border border-slate-800 bg-slate-900/60 px-4 py-3">
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── Input bar ─── */}
      <div
        className="shrink-0 border-t border-slate-800 bg-slate-950 px-3 pt-3"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 4.5rem)" }}
      >
        <div className="flex items-end gap-2">
          <button
            className="shrink-0 w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-300 transition"
            title="Attach file"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Ask Xentra anything…"
              rows={1}
              className="w-full resize-none rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-2.5 pr-12 text-sm text-slate-100 placeholder-slate-500 focus:border-violet-500 focus:outline-none max-h-32"
              style={{ minHeight: "42px" }}
            />
            <button
              className="absolute right-2 bottom-2 w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-300 transition"
              title="Voice"
            >
              <Mic className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="shrink-0 w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-600 to-violet-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-white shadow-lg shadow-violet-500/25 transition active:scale-95"
            title="Send"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Message Bubble ───
function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex gap-3 justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-tr-md bg-gradient-to-br from-violet-600 to-violet-500 px-4 py-2.5 text-sm text-white leading-relaxed shadow-lg shadow-violet-500/20">
          {message.content}
        </div>
        <div className="shrink-0 w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
          <UserIcon className="w-4 h-4 text-slate-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <div className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
        <Bot className="w-4 h-4 text-white" />
      </div>
      <div className="max-w-[80%] rounded-2xl rounded-tl-md border border-slate-800 bg-slate-900/60 px-4 py-2.5 text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
        {message.content}
      </div>
    </div>
  );
}