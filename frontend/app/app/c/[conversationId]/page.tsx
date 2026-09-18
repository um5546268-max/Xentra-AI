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
  Globe,
  BookOpen,
  MessageSquare,
  X,
  Brain,
  FileText,
} from "lucide-react";
import {
  Message,
  Source,
  GeneratedImageEvent,
  AttachedFile,
  MemoryUsage,
  getMessages,
  streamChat,
  streamResearch,
  regenerateChat,
} from "@/lib/conversations";
import { resolveImageUrl } from "@/lib/images";
import MarkdownMessage from "@/components/MarkdownMessage";
import MicButton from "@/components/MicButton";

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
  const [committedText, setCommittedText] = useState("");
  const [interimText, setInterimText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [model, setModel] = useState(MODELS[0].id);
  const [mode, setMode] = useState<"chat" | "web" | "research">("chat");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareSources, setCompareSources] = useState<Source[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Load history
  useEffect(() => {
    setLoading(true);
    setError(null);
    getMessages(conversationId)
      .then((raw) => {
        const parsed = raw.map((m) => {
          if (m.role !== "assistant" || !m.content) return m;
          const match = m.content.match(/<!--IMAGE:(.*?)-->/);
          if (!match) return m;
          try {
            const img = JSON.parse(match[1]);
            const cleanContent = m.content
              .replace(/<!--IMAGE:.*?-->/, "")
              .trim();
            return { ...m, content: cleanContent, _image: img };
          } catch {
            return m;
          }
        });
        setMessages(parsed);
      })
      .catch(() => setError("Could not load messages"))
      .finally(() => setLoading(false));
  }, [conversationId]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!committedText.trim() || sending) return;

    const userText = committedText.trim();
    setCommittedText("");
    setInterimText("");
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

    const onDelta = (delta: string) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempAi.id ? { ...m, content: m.content + delta } : m
        )
      );
    };

    const onSources = (sources: Source[]) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempAi.id ? { ...m, _sources: sources } : m
        )
      );
    };

    const onImage = (image: GeneratedImageEvent) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === tempAi.id ? { ...m, _image: image } : m))
      );
    };

    const onFiles = (files: AttachedFile[]) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === tempAi.id ? { ...m, _files: files } : m))
      );
    };

    const onMemories = (memories: MemoryUsage[]) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempAi.id ? { ...m, _memories: memories } : m
        )
      );
    };

    try {
      if (mode === "research") {
        await streamResearch(conversationId, history, onDelta, {
          onSources,
          onMemories,
          signal: controller.signal,
        });
      } else {
        await streamChat(conversationId, history, onDelta, {
          useWebSearch: mode === "web",
          onSources,
          onImage,
          onFiles,
          onMemories,
          signal: controller.signal,
        });
      }
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
      setError(
        err?.response?.data?.detail || err.message || "Regenerate failed"
      );
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
        {
          useWebSearch: mode === "web",
          onSources: (sources) => {
            setMessages((prev) =>
              prev.map((x) =>
                x.id === tempAi.id ? { ...x, _sources: sources } : x
              )
            );
          },
          onImage: (image) => {
            setMessages((prev) =>
              prev.map((x) =>
                x.id === tempAi.id ? { ...x, _image: image } : x
              )
            );
          },
          onFiles: (files) => {
            setMessages((prev) =>
              prev.map((x) =>
                x.id === tempAi.id ? { ...x, _files: files } : x
              )
            );
          },
          onMemories: (memories) => {
            setMessages((prev) =>
              prev.map((x) =>
                x.id === tempAi.id ? { ...x, _memories: memories } : x
              )
            );
          },
          signal: controller.signal,
        }
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
                        ) : m.content || m._image ? (
                          <>
                            {m._image && (
                              <img
                                src={resolveImageUrl(m._image.url)}
                                alt={m._image.prompt}
                                className="rounded-lg max-w-full mb-2 border border-slate-700"
                              />
                            )}
                            {m.content && (
                              <MarkdownMessage
                                content={m.content}
                                sources={m._sources}
                              />
                            )}

                            {m._memories && m._memories.length > 0 && (
                              <div className="mt-3 rounded-lg border border-purple-500/30 bg-purple-500/5 p-2 space-y-1">
                                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-purple-400 font-medium">
                                  <Brain className="w-3 h-3" />
                                  Using {m._memories.length} memor
                                  {m._memories.length !== 1 ? "ies" : "y"}
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {m._memories.slice(0, 5).map((mem) => (
                                    <span
                                      key={mem.id}
                                      title={`${mem.key}: ${mem.value}`}
                                      className="inline-flex items-center gap-1 rounded border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-[10px] text-purple-300 truncate max-w-xs"
                                    >
                                      {mem.key}
                                    </span>
                                  ))}
                                  {m._memories.length > 5 && (
                                    <span className="text-[10px] text-purple-400">
                                      +{m._memories.length - 5} more
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}

                            {m._files && m._files.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-3">
                                {m._files.map((f) => (
                                  <span
                                    key={f.id}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-blue-500/40 bg-blue-500/10 px-2.5 py-1.5 text-xs text-blue-300"
                                  >
                                    <FileText className="w-3.5 h-3.5" />
                                    {f.name}
                                  </span>
                                ))}
                              </div>
                            )}

                            {m._sources && m._sources.length > 0 && (
                              <Sources
                                sources={m._sources}
                                onCompare={() => {
                                  setCompareSources(m._sources!);
                                  setCompareOpen(true);
                                }}
                              />
                            )}
                          </>
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
        <div className="flex items-center gap-1 mb-2">
          <ModeButton
            active={mode === "chat"}
            onClick={() => setMode("chat")}
            icon={<MessageSquare className="w-3.5 h-3.5" />}
            label="Chat"
          />
          <ModeButton
            active={mode === "web"}
            onClick={() => setMode("web")}
            icon={<Globe className="w-3.5 h-3.5" />}
            label="Web search"
          />
          <ModeButton
            active={mode === "research"}
            onClick={() => setMode("research")}
            icon={<BookOpen className="w-3.5 h-3.5" />}
            label="Research"
          />
        </div>

        <div className="flex gap-2 items-end">
          <textarea
            value={committedText + (interimText ? (committedText ? " " : "") + interimText : "")}
            onChange={(e) => {
              setCommittedText(e.target.value);
              setInterimText("");
            }}
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

          <MicButton
            onTranscript={(text, isFinal) => {
              if (isFinal) {
                setCommittedText((prev) => {
                  const base = prev.trim();
                  return base ? `${base} ${text}` : text;
                });
                setInterimText("");
              } else {
                setInterimText(text);
              }
            }}
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
              disabled={!committedText.trim()}
              className="rounded-xl bg-violet-600 p-3 hover:bg-violet-500 disabled:opacity-40 transition"
            >
              <Send className="w-5 h-5" />
            </button>
          )}
        </div>
      </form>

      {compareOpen && (
        <CompareModal
          sources={compareSources}
          onClose={() => setCompareOpen(false)}
        />
      )}
    </div>
  );
}

// ============================================================
// ModeButton
// ============================================================

function ModeButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
        active
          ? "border-violet-500 bg-violet-500/20 text-violet-300"
          : "border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-600"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// ============================================================
// Sources
// ============================================================

function Sources({
  sources,
  onCompare,
}: {
  sources: Source[];
  onCompare?: () => void;
}) {
  if (!sources?.length) return null;

  const avgTrust =
    sources.reduce((sum, s) => sum + (s._trust || 0), 0) / sources.length;

  return (
    <div className="mt-3 space-y-2 border-t border-slate-700 pt-3">
      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-wider text-slate-500">
          Sources · {sources.length}
        </div>
        <div className="flex items-center gap-3">
          {onCompare && sources.length >= 2 && (
            <button
              onClick={onCompare}
              className="text-[11px] text-violet-400 hover:text-violet-300 transition"
            >
              Compare
            </button>
          )}
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="text-slate-500">Avg trust</span>
            <span
              className={`font-mono font-semibold ${trustTextColor(avgTrust)}`}
            >
              {Math.round(avgTrust)}
            </span>
          </div>
        </div>
      </div>

      {sources.map((s, i) => (
        <a
          key={i}
          href={s.url}
          target="_blank"
          rel="noreferrer"
          title={s._trust_reasons?.join(" · ") || ""}
          className="block rounded-lg border border-slate-700/50 bg-slate-900/40 px-2.5 py-2 hover:border-violet-500/50 hover:bg-slate-900 transition"
        >
          <div className="flex items-start gap-2">
            <span className="text-[11px] font-mono text-violet-400 shrink-0 mt-0.5">
              [{i + 1}]
            </span>

            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <div className="text-xs text-slate-300 truncate flex-1">
                  {s.title || s.url}
                </div>
                {s._kind && s._kind !== "other" && (
                  <span
                    className={`shrink-0 rounded px-1 py-0.5 text-[9px] uppercase font-semibold tracking-wide ${kindColor(
                      s._kind
                    )}`}
                  >
                    {s._kind}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="text-[11px] text-slate-500 truncate">
                    {s._domain || s.url}
                  </div>
                  {s._freshness && s._freshness !== "unknown" && (
                    <FreshnessChip
                      level={s._freshness}
                      hint={s._freshness_hint}
                    />
                  )}
                </div>
                {s._trust_level && (
                  <div
                    className={`shrink-0 flex items-center gap-1 text-[10px] font-semibold ${trustTextColor(
                      s._trust || 0
                    )}`}
                  >
                    <TrustDot level={s._trust_level} />
                    {s._trust_level === "high"
                      ? "Verified"
                      : s._trust_level === "medium"
                      ? "OK"
                      : "Low"}
                  </div>
                )}
              </div>
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}

function kindColor(kind: string): string {
  switch (kind) {
    case "official":
      return "bg-emerald-500/20 text-emerald-300";
    case "news":
      return "bg-blue-500/20 text-blue-300";
    case "wiki":
      return "bg-violet-500/20 text-violet-300";
    case "social":
      return "bg-yellow-500/20 text-yellow-300";
    default:
      return "bg-slate-500/20 text-slate-400";
  }
}

function trustTextColor(score: number): string {
  if (score >= 80) return "text-emerald-400";
  if (score >= 55) return "text-yellow-400";
  return "text-red-400";
}

function TrustDot({ level }: { level: string }) {
  const color =
    level === "high"
      ? "bg-emerald-400"
      : level === "medium"
      ? "bg-yellow-400"
      : "bg-red-400";
  return <span className={`inline-block w-1.5 h-1.5 rounded-full ${color}`} />;
}

function FreshnessChip({ level, hint }: { level: string; hint?: string }) {
  const map: Record<string, { label: string; color: string }> = {
    today: { label: "Today", color: "bg-emerald-500/20 text-emerald-300" },
    week: { label: "This week", color: "bg-blue-500/20 text-blue-300" },
    month: { label: "This month", color: "bg-violet-500/20 text-violet-300" },
    older: { label: "Older", color: "bg-slate-500/20 text-slate-400" },
  };
  const cfg = map[level];
  if (!cfg) return null;
  return (
    <span
      title={hint || cfg.label}
      className={`shrink-0 rounded px-1 py-0.5 text-[9px] uppercase font-semibold tracking-wide ${cfg.color}`}
    >
      {cfg.label}
    </span>
  );
}

// ============================================================
// Compare Modal
// ============================================================

function CompareModal({
  sources,
  onClose,
}: {
  sources: Source[];
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl max-h-[85vh] rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <h2 className="text-lg font-semibold">
            Compare {sources.length} sources
          </h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="grid grid-cols-2 gap-3 p-4">
            {sources.map((s, i) => (
              <div
                key={i}
                className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-violet-400">
                    [{i + 1}]
                  </span>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium text-slate-200 hover:text-violet-400 truncate flex-1"
                  >
                    {s.title || s.url}
                  </a>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] text-slate-500">
                    {s._domain}
                  </span>
                  {s._trust_level && (
                    <span
                      className={`text-[10px] font-semibold ${trustTextColor(
                        s._trust || 0
                      )}`}
                    >
                      Trust {s._trust} · {s._trust_level}
                    </span>
                  )}
                  {s._kind && (
                    <span
                      className={`rounded px-1 py-0.5 text-[9px] uppercase font-semibold ${kindColor(
                        s._kind
                      )}`}
                    >
                      {s._kind}
                    </span>
                  )}
                  {s._freshness && s._freshness !== "unknown" && (
                    <FreshnessChip
                      level={s._freshness}
                      hint={s._freshness_hint}
                    />
                  )}
                </div>

                <div className="text-xs text-slate-400 leading-relaxed max-h-40 overflow-y-auto">
                  {s.content?.slice(0, 600) || "(no preview)"}
                  {(s.content?.length || 0) > 600 ? "…" : ""}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}