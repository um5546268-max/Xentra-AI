"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Loader2, MessageSquare, Bug, Sparkles, Heart,
  Star, CheckCircle2, Clock, Inbox, Reply,
} from "lucide-react";
import api from "@/lib/api";

type MyFeedback = {
  id: string;
  category: "bug" | "feature" | "general" | "praise";
  rating: number | null;
  message: string;
  status: "new" | "reviewing" | "resolved" | "closed";
  created_at: string;
  reply: string | null;
  replied_at: string | null;
};

const CATEGORY_META: Record<
  string,
  { label: string; icon: any; color: string }
> = {
  bug:     { label: "Bug",     icon: Bug,          color: "text-red-400 bg-red-500/10 border-red-500/30" },
  feature: { label: "Feature", icon: Sparkles,     color: "text-violet-400 bg-violet-500/10 border-violet-500/30" },
  general: { label: "General", icon: MessageSquare,color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30" },
  praise:  { label: "Praise",  icon: Heart,        color: "text-pink-400 bg-pink-500/10 border-pink-500/30" },
};

const STATUS_META: Record<
  string,
  { label: string; color: string; icon: any }
> = {
  new:       { label: "New",        color: "text-violet-300 bg-violet-500/15 border-violet-500/40", icon: Clock },
  reviewing: { label: "Reviewing",  color: "text-amber-300 bg-amber-500/15 border-amber-500/40",   icon: Clock },
  resolved:  { label: "Resolved",   color: "text-emerald-300 bg-emerald-500/15 border-emerald-500/40", icon: CheckCircle2 },
  closed:    { label: "Closed",     color: "text-slate-400 bg-slate-500/15 border-slate-500/40",   icon: CheckCircle2 },
};

export default function MyFeedbackPage() {
  const router = useRouter();
  const [items, setItems] = useState<MyFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get("/api/feedback/mine");
      setItems(data);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed to load your feedback");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="h-full overflow-y-auto pb-24">
      <div className="max-w-3xl mx-auto p-4 sm:p-8 space-y-6">
        <button
          onClick={() => router.push("/app")}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300"
        >
          <ArrowLeft className="w-4 h-4" /> Back to app
        </button>

        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-violet-500/20 border border-violet-500/40 flex items-center justify-center">
            <Inbox className="w-5 h-5 text-violet-300" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">My Feedback</h1>
            <p className="text-sm text-slate-500">
              Everything you've sent us, and our replies.
            </p>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
          </div>
        )}

        {!loading && error && (
          <div className="rounded-lg border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-12 text-center space-y-3">
            <MessageSquare className="w-8 h-8 text-slate-600 mx-auto" />
            <div className="text-sm font-medium text-slate-400">
              You haven't sent any feedback yet
            </div>
            <div className="text-xs text-slate-500 max-w-sm mx-auto">
              When you submit feedback from the app, it'll show up here — along
              with our replies.
            </div>
          </div>
        )}

        {!loading && !error && items.length > 0 && (
          <div className="space-y-3">
            {items.map((item) => {
              const cat = CATEGORY_META[item.category] ?? CATEGORY_META.general;
              const stat = STATUS_META[item.status] ?? STATUS_META.new;
              const CatIcon = cat.icon;
              const StatIcon = stat.icon;
              return (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 space-y-3"
                >
                  {/* Header */}
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${cat.color}`}
                    >
                      <CatIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                          {cat.label}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${stat.color}`}
                        >
                          <StatIcon className="w-3 h-3" />
                          {stat.label}
                        </span>
                        {item.rating && (
                          <span className="flex items-center gap-0.5 text-amber-400">
                            {Array.from({ length: item.rating }).map((_, i) => (
                              <Star key={i} className="w-3 h-3 fill-current" />
                            ))}
                          </span>
                        )}
                        <span className="ml-auto text-[11px] text-slate-500">
                          {new Date(item.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Your message */}
                  <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3 text-sm text-slate-200 whitespace-pre-wrap break-words">
                    {item.message}
                  </div>

                  {/* Admin reply */}
                  {item.reply && (
                    <div className="rounded-lg border border-emerald-700/40 bg-emerald-500/5 p-3 space-y-1">
                      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-emerald-400 font-semibold">
                        <Reply className="w-3 h-3" />
                        Reply from Xentra team
                        {item.replied_at && (
                          <span className="ml-auto normal-case tracking-normal text-emerald-300/60 font-normal">
                            {new Date(item.replied_at).toLocaleString()}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-emerald-100 whitespace-pre-wrap break-words">
                        {item.reply}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}