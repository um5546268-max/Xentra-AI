"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Loader2, Bug, Sparkles, MessageSquare, Heart,
  Star, X, AlertCircle,
} from "lucide-react";
import {
  listAllFeedback, updateFeedbackStatus, FeedbackAdminItem,
} from "@/lib/feedback";
import { useAuth } from "@/lib/auth";

const CATEGORY_META = {
  bug:     { icon: Bug,            color: "text-red-400 bg-red-500/10 border-red-500/30" },
  feature: { icon: Sparkles,       color: "text-violet-400 bg-violet-500/10 border-violet-500/30" },
  general: { icon: MessageSquare,  color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30" },
  praise:  { icon: Heart,          color: "text-pink-400 bg-pink-500/10 border-pink-500/30" },
};

const STATUS_META = {
  new:       { label: "New",       color: "text-violet-300 bg-violet-500/20 border-violet-500/40" },
  reviewing: { label: "Reviewing", color: "text-amber-300 bg-amber-500/20 border-amber-500/40" },
  resolved:  { label: "Resolved",  color: "text-emerald-300 bg-emerald-500/20 border-emerald-500/40" },
  closed:    { label: "Closed",    color: "text-slate-400 bg-slate-700/40 border-slate-600/40" },
};

export default function AdminFeedbackPage() {
  const router = useRouter();
  const user = useAuth((s) => s.user);

  const [items, setItems] = useState<FeedbackAdminItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [lightbox, setLightbox] = useState<string | null>(null);

  // ─── Load feedback from API ───
  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listAllFeedback();
      setItems(data);
    } catch (e: any) {
      setError(
        e?.response?.status === 403
          ? "Admin access required. Ask the account owner to enable it."
          : e?.response?.data?.detail || e?.message || "Failed to load feedback"
      );
    } finally {
      setLoading(false);
    }
  };

  // Load once on mount
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redirect non-admins back to home
  useEffect(() => {
    if (user && !user.is_admin) {
      router.replace("/app");
    }
  }, [user, router]);

  // ─── Filters / counts ───
  const filtered = useMemo(() => {
    return items.filter(
      (i) =>
        (filterStatus === "all" || i.status === filterStatus) &&
        (filterCategory === "all" || i.category === filterCategory)
    );
  }, [items, filterStatus, filterCategory]);

  const counts = useMemo(() => {
    const total = items.length;
    const newCount = items.filter((i) => i.status === "new").length;
    const rated = items.filter((i) => i.rating);
    const avgRating =
      rated.reduce((s, i) => s + (i.rating || 0), 0) / (rated.length || 1);
    return { total, newCount, avgRating: avgRating.toFixed(1) };
  }, [items]);

  const handleStatusChange = async (
    id: string,
    status: FeedbackAdminItem["status"]
  ) => {
    try {
      await updateFeedbackStatus(id, status);
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
    } catch {
      alert("Failed to update status");
    }
  };

  // ─── Guard rails ───
  if (!user) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-950">
        <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
      </div>
    );
  }

  if (!user.is_admin) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-slate-950 gap-3 p-6 text-center">
        <AlertCircle className="w-10 h-10 text-red-400" />
        <div className="text-slate-200 font-semibold">Access denied</div>
        <div className="text-xs text-slate-500">
          This page is only available to administrators.
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-slate-950">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/app")}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-900"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/40 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-violet-300" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold">Feedback Inbox</h1>
            <p className="text-sm text-slate-500">
              View what your users are telling you
            </p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <div className="text-xs text-slate-500 uppercase tracking-wider">
              Total
            </div>
            <div className="text-2xl font-bold mt-1">{counts.total}</div>
          </div>
          <div className="rounded-xl border border-violet-500/40 bg-violet-500/5 p-4">
            <div className="text-xs text-violet-300 uppercase tracking-wider">
              New
            </div>
            <div className="text-2xl font-bold mt-1 text-violet-300">
              {counts.newCount}
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <div className="text-xs text-slate-500 uppercase tracking-wider">
              Avg Rating
            </div>
            <div className="text-2xl font-bold mt-1 flex items-center gap-1">
              {counts.avgRating}
              <Star className="w-4 h-4 text-amber-400 fill-current" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900/60 p-1">
            {["all", "new", "reviewing", "resolved", "closed"].map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition capitalize ${
                  filterStatus === s
                    ? "bg-violet-600 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900/60 p-1">
            {["all", "bug", "feature", "general", "praise"].map((c) => (
              <button
                key={c}
                onClick={() => setFilterCategory(c)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition capitalize ${
                  filterCategory === c
                    ? "bg-violet-600 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <button
            onClick={load}
            className="ml-auto text-xs text-violet-400 hover:text-violet-300"
          >
            Refresh
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {/* Body */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-12 text-center space-y-3">
            <MessageSquare className="w-8 h-8 text-slate-600 mx-auto" />
            <div className="text-sm font-medium text-slate-400">
              No feedback yet
            </div>
            <div className="text-xs text-slate-500 max-w-sm mx-auto">
              When users submit feedback from the app, it'll show up here.
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((item) => {
              const catMeta =
                CATEGORY_META[item.category] || CATEGORY_META.general;
              const statusMeta = STATUS_META[item.status] || STATUS_META.new;
              const CatIcon = catMeta.icon;
              return (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 space-y-3"
                >
                  {/* Top row */}
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${catMeta.color}`}
                    >
                      <CatIcon className="w-5 h-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                          {item.category}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full border ${statusMeta.color}`}
                        >
                          {statusMeta.label}
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

                      <div className="text-xs text-slate-500 mt-1">
                        {item.user_name || item.user_email || "Guest user"}
                        {item.page_url && (
                          <>
                            <span className="mx-1.5">·</span>
                            <span className="font-mono">{item.page_url}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Message */}
                  <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3 text-sm text-slate-200 whitespace-pre-wrap break-words">
                    {item.message}
                  </div>

                  {/* Screenshot */}
                  {item.screenshot_url && (
                    <button
                      onClick={() => setLightbox(item.screenshot_url)}
                      className="block rounded-lg border border-slate-800 overflow-hidden hover:border-violet-500/40 transition"
                    >
                      <img
                        src={item.screenshot_url}
                        alt="Screenshot"
                        className="max-h-48 object-cover"
                      />
                    </button>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    <span className="text-[11px] text-slate-500 mr-1">
                      Mark as:
                    </span>
                    {(["new", "reviewing", "resolved", "closed"] as const).map(
                      (s) => (
                        <button
                          key={s}
                          onClick={() => handleStatusChange(item.id, s)}
                          disabled={item.status === s}
                          className={`text-[11px] px-2.5 py-1 rounded-md border transition capitalize ${
                            item.status === s
                              ? "border-violet-500 bg-violet-500/20 text-violet-300 cursor-default"
                              : "border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600"
                          }`}
                        >
                          {s}
                        </button>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Image lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox}
            alt="Screenshot"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}