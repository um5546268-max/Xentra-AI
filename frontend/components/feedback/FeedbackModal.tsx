"use client";

import { useEffect, useRef, useState } from "react";
import {
  X, Bug, Sparkles, MessageSquare, Heart, Star, Loader2,
  CheckCircle2, Image as ImageIcon, AlertCircle,
} from "lucide-react";
import { submitFeedback, FeedbackCategory } from "@/lib/feedback";

const CATEGORIES: {
  id: FeedbackCategory;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  desc: string;
}[] = [
  {
    id: "bug",
    label: "Bug",
    icon: Bug,
    color: "text-red-400 border-red-500/40 bg-red-500/10",
    desc: "Something is broken",
  },
  {
    id: "feature",
    label: "Feature",
    icon: Sparkles,
    color: "text-violet-400 border-violet-500/40 bg-violet-500/10",
    desc: "Request a new feature",
  },
  {
    id: "general",
    label: "General",
    icon: MessageSquare,
    color: "text-cyan-400 border-cyan-500/40 bg-cyan-500/10",
    desc: "General feedback",
  },
  {
    id: "praise",
    label: "Praise",
    icon: Heart,
    color: "text-pink-400 border-pink-500/40 bg-pink-500/10",
    desc: "Loving Xentra? Tell us!",
  },
];

export default function FeedbackModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const [category, setCategory] = useState<FeedbackCategory>("general");
  const [rating, setRating] = useState<number>(0);
  const [message, setMessage] = useState("");
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus
  useEffect(() => {
    setTimeout(() => textareaRef.current?.focus(), 100);
  }, []);

  // Paste screenshot support
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.kind === "file" && item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (!file) continue;
          if (file.size > 2_000_000) {
            alert("Screenshot too large (max 2 MB)");
            return;
          }
          const reader = new FileReader();
          reader.onload = () => setScreenshot(reader.result as string);
          reader.readAsDataURL(file);
        }
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  const handleSubmit = async () => {
    if (!message.trim() || message.trim().length < 3) {
      setError("Please write at least a few words");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await submitFeedback({
        category,
        rating: rating > 0 ? rating : undefined,
        message: message.trim(),
        page_url: typeof window !== "undefined" ? window.location.pathname : undefined,
        screenshot_url: screenshot || undefined,
      });
      setSuccess(true);
      setTimeout(onClose, 2000);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg bg-slate-950 border-t sm:border border-slate-800 sm:rounded-2xl rounded-t-3xl max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {/* Handle bar (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-slate-700" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-base font-semibold text-slate-100">
                Send Feedback
              </div>
              <div className="text-[11px] text-slate-500">
                Help us make Xentra better
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

        {success ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <div className="text-base font-semibold text-slate-100 mb-1">
              Thank you! 🙏
            </div>
            <div className="text-xs text-slate-500">
              Your feedback helps us improve Xentra.
            </div>
          </div>
        ) : (
          <>
            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-4">
              {/* Category */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">
                  What kind of feedback?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.map((c) => {
                    const Icon = c.icon;
                    const active = category === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setCategory(c.id)}
                        className={`flex items-center gap-2 rounded-xl border p-3 transition text-left ${
                          active
                            ? `${c.color} border-opacity-100`
                            : "border-slate-800 bg-slate-900/40 text-slate-400 hover:bg-slate-900"
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <div className="min-w-0">
                          <div className="text-xs font-semibold">{c.label}</div>
                          <div className="text-[9px] opacity-70 truncate">
                            {c.desc}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Rating */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">
                  How would you rate your experience? (optional)
                </label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setRating(n === rating ? 0 : n)}
                      className="p-1 transition active:scale-90"
                    >
                      <Star
                        className={`w-7 h-7 ${
                          n <= rating
                            ? "text-amber-400 fill-current"
                            : "text-slate-700"
                        }`}
                      />
                    </button>
                  ))}
                  {rating > 0 && (
                    <span className="ml-2 text-xs text-slate-500">
                      {rating}/5
                    </span>
                  )}
                </div>
              </div>

              {/* Message */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">
                  Your message
                </label>
                <textarea
                  ref={textareaRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us what's on your mind…"
                  rows={5}
                  maxLength={5000}
                  className="w-full resize-none rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:border-violet-500 focus:outline-none"
                />
                <div className="flex items-center justify-between mt-1 px-1">
                  <span className="text-[10px] text-slate-600">
                    {message.length} / 5000
                  </span>
                  <span className="text-[10px] text-slate-600">
                    Screenshot? Paste with Ctrl+V
                  </span>
                </div>
              </div>

              {/* Screenshot preview */}
              {screenshot && (
                <div className="relative rounded-xl border border-slate-800 bg-slate-900 p-2">
                  <img
                    src={screenshot}
                    alt="Screenshot"
                    className="w-full max-h-40 object-contain rounded-lg"
                  />
                  <button
                    onClick={() => setScreenshot(null)}
                    className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-red-600 transition"
                    title="Remove screenshot"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {error && (
                <div className="rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-xs text-red-300 flex items-start gap-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  {error}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-800 px-5 py-3">
              <button
                onClick={handleSubmit}
                disabled={submitting || !message.trim()}
                className="w-full rounded-xl py-3 text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50 transition active:scale-[0.98]"
                style={{
                  background:
                    "linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)",
                }}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending…
                  </>
                ) : (
                  <>
                    <MessageSquare className="w-4 h-4" />
                    Send Feedback
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}