"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  Message,
  Source,
  GeneratedImageEvent,
  AttachedFile,
  MemoryUsage,
  BeeStreamEvent,
  TopicImage,
  getMessages,
  streamChat,
  streamResearch,
  regenerateChat,
} from "@/lib/conversations";
import { resolveImageUrl } from "@/lib/images";
import { useVoice } from "@/lib/voice-store";
import { useLiveBees } from "@/lib/live-bees";
import MarkdownMessage from "@/components/MarkdownMessage";
import MicButton from "@/components/MicButton";

const MODELS = [
  { id: "openai/gpt-oss-20b", label: "GPT-OSS 20B (fast)" },
  { id: "openai/gpt-oss-120b", label: "GPT-OSS 120B (smarter)" },
  { id: "meta-llama/llama-4-scout-17b-16e-instruct", label: "Llama 4 Scout" },
  { id: "qwen/qwen3.6-27b", label: "Qwen 3.6 27B" },
];

const BEE_RESULT_URLS: Record<string, string> = {
  manager: "/app/bees",
  web: "/app/browser",
  computer: "/app/browser",
  coding: "/app/code",
  file: "/app/files",
  shopping: "/app/shopping",
  maps: "/app/maps",
  media: "/app/media",
  research: "/app/browser",
  health: "/app/system-health",
  video: "/app/videos",
};

export default function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = use(params);
  const router = useRouter();

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
  const lastSpokenRef = useRef<string | null>(null);
  const lastBeeTypeRef = useRef<string>("manager");
  const [lightbox, setLightbox] = useState<TopicImage | null>(null);

  const { setBees, updateProgress, removeBee } = useLiveBees();

  const {
    settings: voiceSettings,
    speaking,
    speakingMessageId,
    speakText,
    stop: stopVoice,
    load: loadVoice,
    startWakeWordListener,
    stopWakeWordListener,
    wakeWordActive,
    wakeWordArmed,
  } = useVoice();

  useEffect(() => {
    loadVoice();
  }, [loadVoice]);

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

  // Auto-speak
  useEffect(() => {
    if (!voiceSettings?.auto_speak) return;
    const lastMsg = messages[messages.length - 1];
    if (
      lastMsg &&
      lastMsg.role === "assistant" &&
      !lastMsg._streaming &&
      lastMsg.id !== lastSpokenRef.current &&
      lastMsg.content
    ) {
      lastSpokenRef.current = lastMsg.id;
      speakText(lastMsg.content, lastMsg.id);
    }
  }, [messages, voiceSettings?.auto_speak, speakText]);

  // Wake word
  useEffect(() => {
    if (!voiceSettings?.wake_word_enabled) {
      stopWakeWordListener();
      return;
    }
    startWakeWordListener((text) => {
      const handled = handleVoiceCommand(text);
      if (handled) return;
      setCommittedText((prev) => {
        const base = prev.trim();
        return base ? `${base} ${text}` : text;
      });
    });
    return () => {
      stopWakeWordListener();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceSettings?.wake_word_enabled, startWakeWordListener, stopWakeWordListener]);

  const handleVoiceCommand = (text: string): boolean => {
    const lower = text.toLowerCase().trim();
    if (lower === "stop" || lower === "stop talking") {
      stopVoice();
      return true;
    }
    if (lower === "clear" || lower === "clear input") {
      setCommittedText("");
      setInterimText("");
      return true;
    }
    if (lower === "send" || lower === "send it") {
      const syntheticEvent = { preventDefault: () => {} } as React.FormEvent;
      handleSend(syntheticEvent);
      return true;
    }
    if (
      lower === "read that again" ||
      lower === "say that again" ||
      lower === "repeat"
    ) {
      const lastAssistant = [...messages]
        .reverse()
        .find((m) => m.role === "assistant" && m.content);
      if (lastAssistant) speakText(lastAssistant.content, lastAssistant.id);
      return true;
    }
    return false;
  };

  // 🐝 Shared bee handlers
  const makeBeeHandlers = () => {
    const onBees = (bees: BeeStreamEvent[]) => {
      setBees(bees);
      const primary = bees.find((b) => b.type !== "manager") ?? bees[0];
      if (primary) lastBeeTypeRef.current = primary.type;
      toast.info(`🐝 ${bees.length} Bees dispatched`, {
        description: bees.map((b) => b.title).slice(0, 3).join(" · "),
        duration: 4000,
      });
    };
    const onBeeProgress = (map: Record<string, number>) => {
      updateProgress(map);
    };
    const onBeesDone = (ids: string[]) => {
      const target = BEE_RESULT_URLS[lastBeeTypeRef.current] || "/app/bees";
      toast.success("🐝 Task complete", {
        description: "Click to see the results.",
        action: { label: "Open", onClick: () => router.push(target) },
        duration: 10000,
      });
      setTimeout(() => {
        for (const id of ids) removeBee(id);
      }, 4000);
    };
    return { onBees, onBeeProgress, onBeesDone };
  };

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

    // 🖼 Topic image handler
    const onTopicImage = (img: TopicImage) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempAi.id ? { ...m, _topic_image: img } : m
        )
      );
    };

    const { onBees, onBeeProgress, onBeesDone } = makeBeeHandlers();

    try {
      if (mode === "research") {
        await streamResearch(conversationId, history, onDelta, {
          onSources,
          onMemories,
          onBees,
          onBeeProgress,
          onBeesDone,
          onTopicImage,
          signal: controller.signal,
        });
      } else {
        await streamChat(conversationId, history, onDelta, {
          useWebSearch: mode === "web",
          onSources,
          onImage,
          onFiles,
          onMemories,
          onBees,
          onBeeProgress,
          onBeesDone,
          onTopicImage,
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

    const { onBees, onBeeProgress, onBeesDone } = makeBeeHandlers();

    const onTopicImage = (img: TopicImage) => {
      setMessages((prev) =>
        prev.map((x) =>
          x.id === tempAi.id ? { ...x, _topic_image: img } : x
        )
      );
    };

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
          onBees,
          onBeeProgress,
          onBeesDone,
          onTopicImage,
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
      <div className="border-b border-slate-800 px-6 py-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm text-slate-500">Conversation</div>
          <div className="font-mono text-xs text-slate-400 truncate">
            {conversationId}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {wakeWordActive && (
            <div
              className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs font-medium transition ${
                wakeWordArmed
                  ? "border-emerald-500 bg-emerald-500/20 text-emerald-300"
                  : "border-slate-700 text-slate-500"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  wakeWordArmed ? "bg-emerald-400 animate-pulse" : "bg-slate-600"
                }`}
              />
              {wakeWordArmed ? "Listening" : "Wake word"}
            </div>
          )}

          <button
            onClick={() => {
              if (!voiceSettings) return;
              useVoice.getState().save({
                auto_speak: !voiceSettings.auto_speak,
              });
            }}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
              voiceSettings?.auto_speak
                ? "border-violet-500 bg-violet-500/20 text-violet-300"
                : "border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-600"
            }`}
          >
            {voiceSettings?.auto_speak ? (
              <Volume2 className="w-3.5 h-3.5" />
            ) : (
              <VolumeX className="w-3.5 h-3.5" />
            )}
            Auto-speak
          </button>

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
            const isThisMessageSpeaking =
              speaking && speakingMessageId === m.id;

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
                        ) : m.content || m._image || m._topic_image ? (
                          <>
                            {/* 🖼 Topic image (image-first chat) */}
                            {m._topic_image && (
  <div className="rounded-xl overflow-hidden mb-3 border border-slate-700 max-w-md">
    <button
      onClick={() => setLightbox(m._topic_image!)}
      className="block w-full cursor-zoom-in"
      title="Click to enlarge"
    >
      <img
        src={m._topic_image.url}
        alt={m._topic_image.title}
        className="w-full max-h-60 object-cover hover:opacity-95 transition"
        loading="lazy"
      />
    </button>
    <div className="text-[10px] text-slate-500 px-2 py-1 bg-slate-900/60 flex items-center justify-between gap-2">
      <span className="truncate">
        {m._topic_image.source} · {m._topic_image.title}
      </span>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => setLightbox(m._topic_image!)}
          className="text-violet-400 hover:text-violet-300"
        >
          Expand
        </button>
        {m._topic_image.page_url && (
          <a
            href={m._topic_image.page_url}
            target="_blank"
            rel="noreferrer"
            className="text-violet-400 hover:text-violet-300"
          >
            Open
          </a>
        )}
      </div>
    </div>
  </div>
)}

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

                      {/* Actions */}
                      <div
                        className={`flex items-center gap-3 text-xs text-slate-400 mt-1 ${
                          m.role === "user" ? "justify-end" : ""
                        }`}
                      >
                        {m.role === "assistant" && m.content && (
                          <button
                            onClick={() => {
                              if (isThisMessageSpeaking) {
                                stopVoice();
                              } else {
                                speakText(m.content, m.id);
                              }
                            }}
                            className="hover:text-violet-400 transition flex items-center gap-1"
                          >
                            {isThisMessageSpeaking ? (
                              <>
                                <Square className="w-3.5 h-3.5" /> Stop
                              </>
                            ) : (
                              <>
                                <Volume2 className="w-3.5 h-3.5" /> Speak
                              </>
                            )}
                          </button>
                        )}

                        <button
                          onClick={() => handleCopy(m)}
                          className="hover:text-violet-400 transition flex items-center gap-1"
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
                          >
                            <Pencil className="w-3.5 h-3.5" /> Edit
                          </button>
                        )}

                        {isLastAssistant && (
                          <button
                            onClick={handleRegenerate}
                            className="hover:text-violet-400 transition flex items-center gap-1"
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
            value={
              committedText +
              (interimText ? (committedText ? " " : "") + interimText : "")
            }
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
                const handled = handleVoiceCommand(text);
                if (handled) {
                  setInterimText("");
                  return;
                }
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
      {lightbox && (
  <ImageLightbox
    image={lightbox}
    onClose={() => setLightbox(null)}
    onReply={(text) => setCommittedText(text)}
  />
)}
    </div>
  );
}

// ─── Mode Button ───
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

// ─── Sources ───
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
            <span className={`font-mono font-semibold ${trustTextColor(avgTrust)}`}>
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

// ─── Compare Modal ───
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
// ═══════════════════════════════════════════════════════════════
// LIGHTBOX — full-screen image viewer with zoom / download / reply
// ═══════════════════════════════════════════════════════════════
function ImageLightbox({
  image,
  onClose,
  onReply,
}: {
  image: TopicImage;
  onClose: () => void;
  onReply: (text: string) => void;
}) {
  const [zoom, setZoom] = useState(1);
  const [copied, setCopied] = useState(false);

  const zoomIn = () => setZoom((z) => Math.min(4, z + 0.25));
  const zoomOut = () => setZoom((z) => Math.max(0.5, z - 0.25));
  const resetZoom = () => setZoom(1);

  const download = async () => {
    try {
      const res = await fetch(image.url);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${image.title.replace(/\s+/g, "_") || "image"}.jpg`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed:", err);
      // Fallback: open in new tab
      window.open(image.url, "_blank");
    }
  };

  const copyUrl = async () => {
    await navigator.clipboard.writeText(image.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleReply = () => {
    onReply(`About this image of ${image.title}: `);
    onClose();
  };

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "+" || e.key === "=") zoomIn();
      if (e.key === "-") zoomOut();
      if (e.key === "0") resetZoom();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-sm flex flex-col"
      onClick={onClose}
    >
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/80"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="min-w-0">
          <div className="text-sm text-slate-200 truncate">{image.title}</div>
          <div className="text-[11px] text-slate-500">
            {image.source}
            {image.page_url && (
              <>
                {" · "}
                <a
                  href={image.page_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-violet-400 hover:text-violet-300"
                >
                  View source
                </a>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <IconButton
            onClick={zoomOut}
            label="Zoom out (−)"
            icon={
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                <line x1="8" y1="11" x2="14" y2="11" />
              </svg>
            }
          />
          <span className="text-xs text-slate-400 font-mono w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <IconButton
            onClick={zoomIn}
            label="Zoom in (+)"
            icon={
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                <line x1="8" y1="11" x2="14" y2="11" />
                <line x1="11" y1="8" x2="11" y2="14" />
              </svg>
            }
          />
          <IconButton
            onClick={resetZoom}
            label="Reset zoom (0)"
            icon={
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
                <polyline points="3 3 3 8 8 8" />
              </svg>
            }
          />
        </div>
      </div>

      {/* Image area */}
      <div
        className="flex-1 overflow-auto flex items-center justify-center p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={image.url}
          alt={image.title}
          className="max-w-none transition-transform duration-150 select-none"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: "center",
            maxHeight: zoom === 1 ? "85vh" : "none",
          }}
          draggable={false}
        />
      </div>

      {/* Bottom action bar */}
      <div
        className="flex items-center justify-center gap-2 px-4 py-3 border-t border-slate-800 bg-slate-950/80 flex-wrap"
        onClick={(e) => e.stopPropagation()}
      >
        <ActionButton
          onClick={download}
          label="Download"
          icon={
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          }
        />
        <ActionButton
          onClick={copyUrl}
          label={copied ? "Copied!" : "Copy URL"}
          icon={
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          }
        />
        <ActionButton
          onClick={handleReply}
          label="Reply about this"
          icon={
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 17 4 12 9 7" />
              <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
            </svg>
          }
        />
        <ActionButton
          onClick={onClose}
          label="Close"
          icon={
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          }
        />
      </div>
    </div>
  );
}

function IconButton({
  onClick,
  label,
  icon,
}: {
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition"
    >
      {icon}
    </button>
  );
}

function ActionButton({
  onClick,
  label,
  icon,
}: {
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 px-3 py-1.5 text-xs text-slate-300 transition"
    >
      {icon}
      {label}
    </button>
  );
}