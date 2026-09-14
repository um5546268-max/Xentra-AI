"use client";

import { use, useEffect, useRef, useState } from "react";
import {
  Send,
  Loader2,
  Copy,
  Check,
  RotateCcw,
  Square,
  Pencil,
} from "lucide-react";
import {
  Message,
  getMessages,
  streamChat,
  regenerateChat,
} from "@/lib/conversations";
import MarkdownMessage from "@/components/MarkdownMessage";

const MODELS = [
  { id: "openai/gpt-oss-20b", label: "GPT-OSS 20B (fast)" },
  { id: "openai/gpt-oss-120b", label: "GPT-OSS 120B (smarter)" },
  { id: "meta-llama/llama-4-scout-17b-16e-instruct", label: "Llama 4 Scout" },
  { id: "qwen/qwen3.6-27b", label: "Qwen 3.6 27B" },
];

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
  const [model, setModel] = useState(MODELS[0].id);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

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
      _temp: true,
    };

    const tempAi: Message = {
      id: "temp-ai-" + Date.now(),
      role: "assistant",
      content: "",
      created_at: new Date().toISOString(),
      _temp: true,
      _streaming: true,
    };

    setMessages((prev) => [...prev, tempUser, tempAi]);
    setSending(true);

    const history = [
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: userText },
    ];

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await streamChat(
        conversationId,
        history,
        (delta) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === tempAi.id ? { ...m, content: m.content + delta } : m
            )
          );
        },
        controller.signal
      );
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempAi.id ? { ...m, _streaming: false, _temp: false } : m
        )
      );
    } catch (err: any) {
      if (err?.name === "AbortError") {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempAi.id ? { ...m, _streaming: false } : m
          )
        );
      } else {
        setError(err?.message || "Stream failed");
        setMessages((prev) => prev.filter((m) => m.id !== tempAi.id));
      }
    } finally {
      setSending(false);
      abortRef.current = null;
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
    setSending(false);
  };

  const handleRegenerate = async () => {
    if (sending) return;
    setError(null);

    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser) return;

    const trimmed = [...messages];
    while (trimmed.length && trimmed[trimmed.length - 1].role === "assistant") {
      trimmed.pop();
    }

    const placeholder: Message = {
      id: "temp-regen-" + Date.now(),
      role: "assistant",
      content: "",
      created_at: new Date().toISOString(),
      _temp: true,
    };
    setMessages([...trimmed, placeholder]);
    setSending(true);

    try {
      const history = trimmed.map((m) => ({ role: m.role, content: m.content }));
      const res = await regenerateChat(conversationId, history);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === placeholder.id
            ? { ...m, content: res.content, _temp: false }
            : m
        )
      );
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || "Regenerate failed");
      setMessages((prev) => prev.filter((m) => m.id !== placeholder.id));
    } finally {
      setSending(false);
    }
  };

  const handleCopy = async (m: Message) => {
    await navigator.clipboard.writeText(m.content);
    setCopiedId(m.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const startEdit = (m: Message) => {
    setEditingId(m.id);
    setEditText(m.content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText("");
  };

  const submitEdit = async (m: Message) => {
    if (!editText.trim()) return;

    const index = messages.findIndex((x) => x.id === m.id);
    if (index === -1) return;
    const kept = messages.slice(0, index);

    const newUser: Message = {
      id: "temp-user-" + Date.now(),
      role: "user",
      content: editText.trim(),
      created_at: new Date().toISOString(),
      _temp: true,
    };

    const tempAi: Message = {
      id: "temp-ai-" + Date.now(),
      role: "assistant",
      content: "",
      created_at: new Date().toISOString(),
      _temp: true,
      _streaming: true,
    };

    setMessages([...kept, newUser, tempAi]);
    setEditingId(null);
    setEditText("");
    setSending(true);

    const history = [
      ...kept.map((x) => ({ role: x.role, content: x.content })),
      { role: "user", content: newUser.content },
    ];

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await streamChat(
        conversationId,
        history,
        (delta) => {
          setMessages((prev) =>
            prev.map((x) =>
              x.id === tempAi.id ? { ...x, content: x.content + delta } : x
            )
          );
        },
        controller.signal
      );
      setMessages((prev) =>
        prev.map((x) =>
          x.id === tempAi.id ? { ...x, _streaming: false, _temp: false } : x
        )
      );
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        setError(err?.message || "Stream failed");
      }
    } finally {
      setSending(false);
      abortRef.current = null;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-slate-800 px-6 py-3 flex items-center justify-between">
        <div className="min-w-0">
          <div className="text-sm text-slate-500">Conversation</div>
          <div className="font-mono text-xs text-slate-400 truncate">
            {conversationId}
          </div>
        </div>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 focus:border-violet-500 focus:outline-none"
        >
          {MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
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
          messages.map((m, idx) => {
            const isLastAssistant =
              m.role === "assistant" && idx === messages.length - 1;
            const isEditing = editingId === m.id;

            return (
              <div
                key={m.id}
                className={`flex gap-3 ${
                  m.role === "user" ? "justify-end" : ""
                }`}
              >
                {m.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-violet-500/20 border border-violet-500/40 flex items-center justify-center shrink-0">
                    <span className="text-violet-300 text-sm font-bold">X</span>
                  </div>
                )}

                <div className="max-w-2xl flex flex-col gap-1">
                  {isEditing ? (
                    <div className="rounded-2xl border border-violet-500 bg-slate-900 p-3 space-y-2">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        rows={3}
                        className="w-full resize-none rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none"
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={cancelEdit}
                          className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:bg-slate-800"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => submitEdit(m)}
                          className="rounded-lg bg-violet-600 px-3 py-1 text-xs text-white hover:bg-violet-500"
                        >
                          Save & resend
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div
                        className={`rounded-2xl px-4 py-3 text-sm ${
                          m.role === "user"
                            ? "bg-violet-600 text-white whitespace-pre-wrap"
                            : "bg-slate-800 text-slate-100"
                        }`}
                      >
                        {m.role === "user" ? (
                          m.content
                        ) : m.content ? (
                          <MarkdownMessage content={m.content} />
                        ) : (
                          <span className="inline-flex items-center gap-2 text-slate-500">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Thinking…
                          </span>
                        )}
                      </div>

                      {/* Per-message actions */}
                      <div
                        className={`flex items-center gap-3 text-xs text-slate-400 mt-1 ${
                          m.role === "user" ? "justify-end" : ""
                        }`}
                      >
                        <button
                          onClick={() => handleCopy(m)}
                          className="hover:text-violet-400 transition flex items-center gap-1"
                          title="Copy"
                        >
                          {copiedId === m.id ? (
                            <>
                              <Check className="w-3.5 h-3.5" /> Copied
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" /> Copy
                            </>
                          )}
                        </button>

                        {m.role === "user" && (
                          <button
                            onClick={() => startEdit(m)}
                            className="hover:text-violet-400 transition flex items-center gap-1"
                            title="Edit & resend"
                          >
                            <Pencil className="w-3.5 h-3.5" /> Edit
                          </button>
                        )}

                        {isLastAssistant && (
                          <button
                            onClick={handleRegenerate}
                            className="hover:text-violet-400 transition flex items-center gap-1"
                            title="Regenerate"
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> Regenerate
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })
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
          {sending ? (
            <button
              type="button"
              onClick={handleStop}
              className="rounded-xl bg-red-600 p-3 hover:bg-red-500 transition"
              title="Stop"
            >
              <Square className="w-5 h-5" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="rounded-xl bg-violet-600 p-3 hover:bg-violet-500 disabled:opacity-40 transition"
            >
              <Send className="w-5 h-5" />
            </button>
          )}
        </div>
      </form>
    </div>
  );
}