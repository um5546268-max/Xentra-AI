"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Loader2, Bug, Sparkles, MessageSquare, Heart,
  Star, AlertCircle, CheckCircle2, Send,
} from "lucide-react";
import api from "@/lib/api";

const CATEGORIES = [
  { id: "bug",     label: "Bug",     icon: Bug,           color: "text-red-400 border-red-500/40 bg-red-500/10" },
  { id: "feature", label: "Feature", icon: Sparkles,      color: "text-violet-400 border-violet-500/40 bg-violet-500/10" },
  { id: "general", label: "General", icon: MessageSquare, color: "text-cyan-400 border-cyan-500/40 bg-cyan-500/10" },
  { id: "praise",  label: "Praise",  icon: Heart,         color: "text-pink-400 border-pink-500/40 bg-pink-500/10" },
] as const;

export default function SubmitFeedbackPage() {
  const router = useRouter();

  const [category, setCategory] = useState<typeof CATEGORIES[number]["id"]>("general");
  const [rating, setRating] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (message.trim().length < 3) {
      setError("Please write at least 3 characters.");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/api/feedback", {
        category,
        rating,
        message: message.trim(),
        page_url: typeof window !== "undefined" ? window.location.pathname : null,
      });
      setDone(true);
      setTimeout(() => router.push("/app/feedback"), 1500);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed to submit feedback");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 gap-4">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-400" />
        </div>
        <div className="text-center space-y-1">
          <div className="text-lg font-semibold text-white">Thanks!</div>
          <div className="text-sm text-slate-400">
            Your feedback has been submitted.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto pb-24">
      <div className="max-w-2xl mx-auto p-4 sm:p-8 space-y-6">
        <button
          onClick={() => router.push("/app/feedback")}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div>
          <h1 className="text-2xl font-semibold text-white">Send Feedback</h1>
          <p className="text-sm text-slate-500 mt-1">
            Bugs, ideas, praise — we read every message.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Category */}
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-slate-500">
              What kind of feedback?
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CATEGORIES.map((c) => {
                const Icon = c.icon;
                const active = category === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategory(c.id)}
                    className={`rounded-xl border p-3 flex flex-col items-center gap-1.5 transition ${
                      active
                        ? c.color + " ring-2 ring-offset-0 ring-current/30"
                        : "border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-xs font-medium">{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Rating */}
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-slate-500">
              How would you rate it? (optional)
            </div>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(rating === n ? null : n)}
                  className="p-1.5 rounded-lg hover:bg-slate-800 transition"
                >
                  <Star
                    className={`w-6 h-6 transition ${
                      rating && n <= rating
                        ? "fill-amber-400 text-amber-400"
                        : "text-slate-600"
                    }`}
                  />
                </button>
              ))}
              {rating && (
                <button
                  type="button"
                  onClick={() => setRating(null)}
                  className="ml-2 text-xs text-slate-500 hover:text-slate-300"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-slate-500">
              Your message
            </div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us what's on your mind…"
              rows={6}
              maxLength={5000}
              className="w-full rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:border-violet-500 focus:outline-none resize-none"
            />
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>Be as detailed as you like.</span>
              <span>{message.length} / 5000</span>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-800 bg-red-950/40 px-3 py-2.5 text-xs text-red-300 flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !message.trim()}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 py-3 text-sm font-semibold text-white transition"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Sending…
              </>
            ) : (
              <>
                <Send className="w-4 h-4" /> Submit Feedback
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}