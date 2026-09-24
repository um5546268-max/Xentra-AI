"use client";

import { useState } from "react";
import {
  X, Sparkles, FileText, Lightbulb, Languages,
  HelpCircle, CheckSquare, MessageCircle, Loader2,
  Copy, Check, Send, Trash2,
} from "lucide-react";
import { askXentraPrivate, shareAIMessage, AskXentraAction } from "@/lib/chat-api";

const ACTIONS: {
  id: AskXentraAction;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}[] = [
  {
    id: "summarize",
    label: "Summarize chat",
    description: "Get a quick summary of the last messages",
    icon: <FileText className="w-4 h-4" />,
    color: "from-violet-500 to-purple-500",
  },
  {
    id: "action_items",
    label: "Find action items",
    description: "Extract tasks and to-dos from the conversation",
    icon: <CheckSquare className="w-4 h-4" />,
    color: "from-emerald-500 to-cyan-500",
  },
  {
    id: "quiz",
    label: "Create a quiz",
    description: "Generate quiz questions from this chat",
    icon: <HelpCircle className="w-4 h-4" />,
    color: "from-amber-500 to-orange-500",
  },
  {
    id: "translate",
    label: "Translate chat",
    description: "Translate recent messages to another language",
    icon: <Languages className="w-4 h-4" />,
    color: "from-cyan-500 to-blue-500",
  },
  {
    id: "custom",
    label: "Ask anything",
    description: "Type a custom question about this chat",
    icon: <MessageCircle className="w-4 h-4" />,
    color: "from-slate-500 to-slate-700",
  },
];

export default function AskXentraModal({
  chatId,
  onClose,
  onSent,
}: {
  chatId: string;
  onClose: () => void;
  onSent: () => void;
}) {
  const [mode, setMode] = useState<"menu" | "custom" | "translate" | "result">("menu");
  const [customPrompt, setCustomPrompt] = useState("");
  const [language, setLanguage] = useState("Urdu");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Result state
  const [result, setResult] = useState<string>("");
  const [resultAction, setResultAction] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shared, setShared] = useState(false);

  const runAction = async (
    action: AskXentraAction,
    extra?: { prompt?: string; language?: string }
  ) => {
    setLoading(true);
    setError(null);
    try {
      const res = await askXentraPrivate(chatId, {
        action,
        ...(extra || {}),
      });
      setResult(res.text);
      setResultAction(res.action);
      setMode("result");
    } catch (e: any) {
      const detail =
        e?.response?.data?.detail || e?.message || "AI request failed";
      setError(detail);
    } finally {
      setLoading(false);
    }
  };

  const handleActionClick = (action: AskXentraAction) => {
    if (action === "custom") {
      setMode("custom");
      return;
    }
    if (action === "translate") {
      setMode("translate");
      return;
    }
    runAction(action);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    setSharing(true);
    try {
      await shareAIMessage(chatId, result);
      setShared(true);
      onSent();
      setTimeout(() => onClose(), 600);
    } catch (e) {
      console.error("Share failed:", e);
      setError("Failed to share");
    } finally {
      setSharing(false);
    }
  };

  const handleDiscard = () => {
    setResult("");
    setResultAction("");
    setMode("menu");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl border border-violet-500/40 bg-slate-950 p-6 shadow-2xl shadow-violet-500/20 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-slate-500 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Ask Xentra</h2>
            <p className="text-xs text-slate-500">
              AI responses are <span className="text-violet-300">private</span> until you share them
            </p>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center animate-pulse">
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            </div>
            <div className="text-xs text-slate-400">
              Xentra is thinking…
            </div>
          </div>
        )}

        {/* Menu */}
        {!loading && mode === "menu" && (
          <div className="space-y-2">
            {ACTIONS.map((a) => (
              <button
                key={a.id}
                onClick={() => handleActionClick(a.id)}
                className="w-full flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-900/60 p-3 hover:bg-slate-800 hover:border-violet-500/40 transition text-left"
              >
                <div
                  className={`w-8 h-8 rounded-lg bg-gradient-to-br ${a.color} flex items-center justify-center text-white shrink-0`}
                >
                  {a.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-200">
                    {a.label}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {a.description}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Custom prompt */}
        {!loading && mode === "custom" && (
          <div className="space-y-3">
            <label className="text-xs text-slate-400 block">
              Your question
            </label>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="e.g. What project are they working on?"
              rows={4}
              autoFocus
              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-violet-500 focus:outline-none resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setMode("menu")}
                className="flex-1 rounded-lg border border-slate-800 bg-slate-900 py-2 text-sm text-slate-300 hover:bg-slate-800 transition"
              >
                Back
              </button>
              <button
                onClick={() => runAction("custom", { prompt: customPrompt.trim() })}
                disabled={!customPrompt.trim()}
                className="flex-1 rounded-lg bg-gradient-to-r from-violet-600 to-cyan-600 py-2 text-sm font-semibold text-white hover:opacity-90 transition disabled:opacity-40"
              >
                Ask
              </button>
            </div>
          </div>
        )}

        {/* Translate language picker */}
        {!loading && mode === "translate" && (
          <div className="space-y-3">
            <label className="text-xs text-slate-400 block">
              Translate chat to
            </label>
            <div className="grid grid-cols-2 gap-2">
              {["Urdu", "Hindi", "English", "Arabic", "Spanish", "French"].map(
                (l) => (
                  <button
                    key={l}
                    onClick={() => setLanguage(l)}
                    className={`rounded-lg border py-2 text-sm transition ${
                      language === l
                        ? "border-violet-500 bg-violet-500/20 text-violet-200"
                        : "border-slate-800 bg-slate-900 text-slate-400 hover:bg-slate-800"
                    }`}
                  >
                    {l}
                  </button>
                )
              )}
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setMode("menu")}
                className="flex-1 rounded-lg border border-slate-800 bg-slate-900 py-2 text-sm text-slate-300 hover:bg-slate-800 transition"
              >
                Back
              </button>
              <button
                onClick={() => runAction("translate", { language })}
                className="flex-1 rounded-lg bg-gradient-to-r from-violet-600 to-cyan-600 py-2 text-sm font-semibold text-white hover:opacity-90 transition"
              >
                Translate
              </button>
            </div>
          </div>
        )}

        {/* Result — private */}
        {!loading && mode === "result" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-violet-500/30 bg-gradient-to-br from-violet-900/30 to-slate-900/50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
                  <Sparkles className="w-3 h-3 text-white" />
                </div>
                <div className="text-[10px] font-bold text-violet-300 tracking-wider">
                  XENTRA AI
                </div>
                <div className="ml-auto text-[10px] text-slate-500 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  Private
                </div>
              </div>
              <div className="text-sm text-slate-200 whitespace-pre-wrap break-words max-h-[40vh] overflow-y-auto">
                {result}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 transition"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy
                  </>
                )}
              </button>

              <button
                onClick={handleDiscard}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 py-2 text-xs font-medium text-red-300 hover:bg-red-500/20 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Discard
              </button>

              <button
                onClick={handleShare}
                disabled={sharing || shared}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-cyan-600 py-2 text-xs font-semibold text-white hover:opacity-90 transition disabled:opacity-40"
              >
                {shared ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Shared!
                  </>
                ) : sharing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Sharing…
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    Share to chat
                  </>
                )}
              </button>
            </div>

            <div className="text-[10px] text-slate-500 text-center">
              The AI response is <span className="text-violet-300">only visible to you</span> until you click Share.
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-300">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}