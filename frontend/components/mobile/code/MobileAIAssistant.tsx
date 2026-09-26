"use client";

import { useEffect, useRef, useState } from "react";
import {
  X, Sparkles, Send, Loader2, Code2, Wrench, MessageSquare,
  FileText, Lightbulb, Zap, Check,
} from "lucide-react";
import { askAssistant, previewDiff } from "@/lib/code";

type Mode = "chat" | "generate" | "explain" | "fix";

const QUICK_ACTIONS = [
  { id: "explain",   label: "Explain this code", icon: FileText,     color: "violet" },
  { id: "fix",       label: "Fix errors",        icon: Wrench,       color: "pink"   },
  { id: "generate",  label: "Generate code",     icon: Code2,        color: "cyan"   },
  { id: "comments",  label: "Add comments",      icon: MessageSquare, color: "emerald" },
  { id: "optimize",  label: "Optimize performance", icon: Zap,       color: "amber"  },
  { id: "explain2",  label: "Explain this topic", icon: Lightbulb,   color: "violet" },
];

const COLOR_MAP: Record<string, string> = {
  violet:  "from-violet-600/30 to-violet-900/10 border-violet-500/30 text-violet-300",
  cyan:    "from-cyan-600/30 to-cyan-900/10 border-cyan-500/30 text-cyan-300",
  emerald: "from-emerald-600/30 to-emerald-900/10 border-emerald-500/30 text-emerald-300",
  amber:   "from-amber-600/30 to-amber-900/10 border-amber-500/30 text-amber-300",
  pink:    "from-pink-600/30 to-pink-900/10 border-pink-500/30 text-pink-300",
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  proposedContent?: string;
};

export default function MobileAIAssistant({
  filePath,
  fileContent,
  onClose,
  onApplyProposal,
}: {
  filePath: string;
  fileContent: string;
  onClose: () => void;
  onApplyProposal: (newContent: string) => void;
}) {
  const [mode, setMode] = useState<Mode>("chat");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const runAssistant = async (instruction: string) => {
    if (!instruction.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: instruction,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const res = await askAssistant(filePath, instruction);

      // Compute a diff preview
      let diffText = "";
      try {
        const d = await previewDiff(filePath, res.new_content);
        diffText = d.diff || "";
      } catch {}

      const added = diffText
        .split("\n")
        .filter((l) => l.startsWith("+") && !l.startsWith("+++")).length;
      const removed = diffText
        .split("\n")
        .filter((l) => l.startsWith("-") && !l.startsWith("---")).length;

      const aiMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content:
          `Done! Proposed changes (+${added} / -${removed} lines).\n\n` +
          `Tap **Apply** to load them into the editor.`,
        proposedContent: res.new_content,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || "AI request failed");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = (id: string, label: string) => {
    const prompts: Record<string, string> = {
      explain: "Explain this code in simple terms.",
      fix: "Fix any errors or bugs in this code.",
      generate: "Generate code that follows this file's pattern.",
      comments: "Add helpful comments to this code.",
      optimize: "Optimize this code for performance.",
      explain2: "Explain the concepts used in this code.",
    };
    runAssistant(prompts[id] || label);
  };

  const handleApply = (msg: ChatMessage) => {
    if (msg.proposedContent) {
      onApplyProposal(msg.proposedContent);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex items-end"
      style={{ touchAction: "none", overscrollBehavior: "contain" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg mx-auto bg-slate-950 border-t border-slate-800 rounded-t-3xl max-h-[88vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-700" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3">
          <div className="flex items-center gap-2">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)",
              }}
            >
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-100">
                AI Assistant
              </div>
              <div className="text-[10px] text-slate-500 truncate max-w-[200px]">
                {filePath.split("/").pop()}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-900 hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-4 pb-3 flex gap-1.5 overflow-x-auto scrollbar-thin">
          {(["chat", "generate", "explain", "fix"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                mode === m
                  ? "bg-violet-600 text-white shadow-lg shadow-violet-500/30"
                  : "text-slate-400 bg-slate-900 border border-slate-800 hover:text-slate-200"
              }`}
            >
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 pb-2">
          {messages.length === 0 ? (
            <>
              {/* Welcome */}
              <div className="flex items-start gap-3 mb-4">
                <div
                  className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center"
                  style={{
                    background:
                      "linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)",
                  }}
                >
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 rounded-2xl rounded-tl-md border border-blue-500/40 bg-slate-900/80 px-4 py-3">
                  <div className="text-sm text-slate-100 leading-relaxed">
                    How can I help you with your code?
                  </div>
                </div>
              </div>

              {/* Quick actions */}
              <div className="space-y-2">
                {QUICK_ACTIONS.map((a) => {
                  const Icon = a.icon;
                  const style = COLOR_MAP[a.color];
                  return (
                    <button
                      key={a.id}
                      onClick={() => handleQuickAction(a.id, a.label)}
                      className={`w-full flex items-center gap-3 rounded-2xl border bg-gradient-to-br ${style} p-3 text-left transition active:scale-[0.98]`}
                    >
                      <div className="w-9 h-9 rounded-xl bg-slate-950/60 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-medium text-slate-100 flex-1">
                        {a.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-2 mb-3 ${
                  m.role === "user" ? "justify-end" : ""
                }`}
              >
                {m.role === "assistant" && (
                  <div
                    className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center"
                    style={{
                      background:
                        "linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)",
                    }}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
                    m.role === "user"
                      ? "bg-violet-600 text-white rounded-br-md"
                      : "bg-slate-900 border border-slate-800 text-slate-100 rounded-tl-md"
                  }`}
                >
                  <div className="whitespace-pre-wrap break-words leading-relaxed">
                    {m.content}
                  </div>
                  {m.proposedContent && (
                    <button
                      onClick={() => handleApply(m)}
                      className="mt-3 w-full rounded-xl py-2 text-xs font-semibold text-white flex items-center justify-center gap-1.5"
                      style={{
                        background:
                          "linear-gradient(135deg, #10b981 0%, #06b6d4 100%)",
                      }}
                    >
                      <Check className="w-3.5 h-3.5" />
                      Apply to Editor
                    </button>
                  )}
                </div>
              </div>
            ))
          )}

          {loading && (
            <div className="flex gap-2 mb-3">
              <div
                className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center"
                style={{
                  background:
                    "linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)",
                }}
              >
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="rounded-2xl rounded-tl-md bg-slate-900 border border-slate-800 px-4 py-3">
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-800 bg-red-950/40 px-3 py-2 text-xs text-red-300 mb-2">
              {error}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-slate-800 px-3 py-3">
          <div className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/60 pl-4 pr-1.5 py-1.5 focus-within:border-blue-500/60 transition">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  runAssistant(input);
                }
              }}
              placeholder="Ask Xentra AI…"
              className="flex-1 bg-transparent py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
              disabled={loading}
            />
            <button
              onClick={() => runAssistant(input)}
              disabled={!input.trim() || loading}
              className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-white disabled:opacity-40 transition active:scale-95"
              style={{
                background:
                  "linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)",
              }}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}