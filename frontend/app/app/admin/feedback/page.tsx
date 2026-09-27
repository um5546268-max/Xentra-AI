"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Loader2, Search, RefreshCw, Download, Star,
  MessageSquare, Bug, Sparkles, Heart, AlertCircle, Filter,
  Check, Trash2, MailOpen, Inbox, X, Send, ExternalLink,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  listFeedback, getStats, getFeedback, patchFeedback, replyFeedback,
  deleteFeedback, bulkAction, exportCsvUrl,
  type Feedback, type FeedbackStats,
} from "@/lib/feedback-admin";

const STATUSES = ["all", "new", "reviewing", "resolved", "closed"] as const;
const CATEGORIES = ["all", "bug", "feature", "general", "praise"] as const;

const CATEGORY_META: Record<
  string,
  { label: string; icon: any; color: string }
> = {
  bug:     { label: "Bug",     icon: Bug,          color: "text-red-400 bg-red-500/10 border-red-500/30" },
  feature: { label: "Feature", icon: Sparkles,     color: "text-violet-400 bg-violet-500/10 border-violet-500/30" },
  general: { label: "General", icon: MessageSquare,color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30" },
  praise:  { label: "Praise",  icon: Heart,        color: "text-pink-400 bg-pink-500/10 border-pink-500/30" },
};

const STATUS_META: Record<string, string> = {
  new:       "bg-violet-500/15 text-violet-300 border-violet-500/30",
  reviewing: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  resolved:  "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  closed:    "bg-slate-500/15 text-slate-400 border-slate-500/30",
};

export default function AdminFeedbackPage() {
  const router = useRouter();
  const user = useAuth((s) => s.user);

  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [items, setItems] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [status, setStatus] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Feedback | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // ── Guard ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (user && !user.is_admin) router.replace("/app");
  }, [user, router]);

  // ── Fetch list ─────────────────────────────────────────────────────
  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listFeedback({ status, category, q, page, limit: 20 });
      setItems(data.items);
      setTotal(data.total);
      setTotalPages(data.pages);
    } catch (e: any) {
      setError(
        e?.response?.status === 403
          ? "Admin access required."
          : e?.response?.data?.detail || "Failed to load feedback"
      );
    } finally {
      setLoading(false);
    }
  }, [status, category, q, page]);

  const fetchStats = useCallback(async () => {
    try {
      setStats(await getStats());
    } catch {}
  }, []);

  useEffect(() => { fetchList(); }, [fetchList]);
  useEffect(() => { fetchStats(); }, [fetchStats]);

  // Auto-refresh every 30 s
  useEffect(() => {
    const t = setInterval(() => {
      fetchList();
      fetchStats();
    }, 30_000);
    return () => clearInterval(t);
  }, [fetchList, fetchStats]);

  // ── Detail open ────────────────────────────────────────────────────
  const openDetail = async (id: string) => {
    setOpenId(id);
    setDetailLoading(true);
    try {
      setDetail(await getFeedback(id));
    } finally {
      setDetailLoading(false);
    }
  };

  // ── Mutations ──────────────────────────────────────────────────────
  const updateStatus = async (id: string, next: Feedback["status"]) => {
    const updated = await patchFeedback(id, { status: next });
    setItems((arr) => arr.map((x) => (x.id === id ? updated : x)));
    if (detail?.id === id) setDetail(updated);
    fetchStats();
  };

  const sendReply = async (id: string, message: string) => {
    const updated = await replyFeedback(id, message);
    setItems((arr) => arr.map((x) => (x.id === id ? updated : x)));
    if (detail?.id === id) setDetail(updated);
    fetchStats();
  };

  const removeOne = async (id: string) => {
    if (!confirm("Delete this feedback permanently?")) return;
    await deleteFeedback(id);
    setOpenId(null);
    setDetail(null);
    fetchList();
    fetchStats();
  };

  const doBulk = async (
    action: "read" | "resolved" | "closed" | "delete"
  ) => {
    const ids = Array.from(selected);
    if (!ids.length) return;
    if (action === "delete" && !confirm(`Delete ${ids.length} items?`)) return;
    await bulkAction(ids, action);
    setSelected(new Set());
    fetchList();
    fetchStats();
  };

  // ── CSV export ─────────────────────────────────────────────────────
  const exportCSV = () => {
    // Use the backend endpoint so we get ALL rows, not just current page
    const url = exportCsvUrl(status);
    const token =
      localStorage.getItem("xentra_token") ||
      sessionStorage.getItem("xentra_token");
    // Trigger a download with Authorization header by using fetch+blob
    fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.blob())
      .then((blob) => {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `feedback-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);
      });
  };

  const allOnPageSelected =
    items.length > 0 && items.every((x) => selected.has(x.id));

  const toggleSelectAll = () => {
    if (allOnPageSelected) setSelected(new Set());
    else setSelected(new Set(items.map((x) => x.id)));
  };

  return (
    <div className="h-full overflow-y-auto pb-24">
      <div className="max-w-7xl mx-auto p-4 sm:p-8 space-y-6">
        {/* Back + header */}
        <button
          onClick={() => router.push("/app")}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300"
        >
          <ArrowLeft className="w-4 h-4" /> Back to app
        </button>

        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-violet-500/20 border border-violet-500/40 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-violet-300" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-white">
                Feedback inbox
              </h1>
              <p className="text-sm text-slate-500">
                Every message, bug report, and idea from your users.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { fetchList(); fetchStats(); }}
              className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs text-slate-300 hover:bg-slate-900"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
            <button
              onClick={exportCSV}
              className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs text-slate-300 hover:bg-slate-900"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Total"      value={stats?.total ?? "—"} icon={Inbox} />
          <StatCard label="New"        value={stats?.new ?? "—"} icon={MessageSquare} accent="violet" />
          <StatCard
            label="Avg rating"
            value={
              stats?.avg_rating != null ? stats.avg_rating.toFixed(1) : "—"
            }
            icon={Star}
            accent="amber"
          />
          <StatCard label="This week"  value={stats?.this_week ?? "—"} icon={Filter} accent="cyan" />
        </div>

        {/* Filters */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-xs text-slate-500 uppercase tracking-wider">
              Status
            </span>
            <div className="flex flex-wrap gap-1.5">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => { setStatus(s); setPage(1); }}
                  className={`rounded-full border px-3 py-1 text-[11px] capitalize transition ${
                    status === s
                      ? "border-violet-500/60 bg-violet-500/20 text-violet-200"
                      : "border-slate-800 bg-slate-900/60 text-slate-400 hover:bg-slate-900"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-500 uppercase tracking-wider ml-5">
              Category
            </span>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => { setCategory(c); setPage(1); }}
                  className={`rounded-full border px-3 py-1 text-[11px] capitalize transition ${
                    category === c
                      ? "border-cyan-500/60 bg-cyan-500/20 text-cyan-200"
                      : "border-slate-800 bg-slate-900/60 text-slate-400 hover:bg-slate-900"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              placeholder="Search by message or page URL…"
              className="w-full rounded-lg border border-slate-800 bg-slate-900/60 pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:border-violet-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Bulk bar */}
        {selected.size > 0 && (
          <div className="flex items-center justify-between rounded-lg border border-violet-500/40 bg-violet-500/10 px-4 py-2.5">
            <div className="text-xs text-violet-200">
              {selected.size} selected
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => doBulk("read")}
                className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800 flex items-center gap-1.5"
              >
                <MailOpen className="w-3.5 h-3.5" /> Mark reviewing
              </button>
              <button
                onClick={() => doBulk("resolved")}
                className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800 flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" /> Resolve
              </button>
              <button
                onClick={() => doBulk("closed")}
                className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800"
              >
                Close
              </button>
              <button
                onClick={() => doBulk("delete")}
                className="rounded-md border border-red-800 bg-red-950/40 px-3 py-1.5 text-xs text-red-300 hover:bg-red-950/60 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          </div>
        )}

        {/* List */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
          {/* Desktop header */}
          <div className="hidden md:grid grid-cols-[32px_60px_1fr_180px_140px_60px] gap-3 px-4 py-3 border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-500">
            <input
              type="checkbox"
              checked={allOnPageSelected}
              onChange={toggleSelectAll}
              className="w-4 h-4 rounded border-slate-700 bg-slate-800 accent-violet-500"
            />
            <span></span>
            <span>Message</span>
            <span>User</span>
            <span>Status</span>
            <span>Rating</span>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
            </div>
          )}

          {!loading && error && (
            <div className="px-4 py-6 text-sm text-red-300">{error}</div>
          )}

          {!loading && !error && items.length === 0 && (
            <div className="px-4 py-20 text-center text-sm text-slate-500">
              No feedback yet.
            </div>
          )}

          {!loading &&
            !error &&
            items.map((f) => {
              const meta = CATEGORY_META[f.category] ?? CATEGORY_META.general;
              const Icon = meta.icon;
              const isOpen = openId === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => openDetail(f.id)}
                  className={`w-full text-left grid grid-cols-1 md:grid-cols-[32px_60px_1fr_180px_140px_60px] gap-3 px-4 py-3 border-b border-slate-800 hover:bg-slate-900/60 transition ${
                    isOpen ? "bg-slate-900/80" : ""
                  }`}
                >
                  <div className="hidden md:block" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.has(f.id)}
                      onChange={(e) => {
                        const s = new Set(selected);
                        if (e.target.checked) s.add(f.id);
                        else s.delete(f.id);
                        setSelected(s);
                      }}
                      className="w-4 h-4 rounded border-slate-700 bg-slate-800 accent-violet-500"
                    />
                  </div>

                  <div className="hidden md:flex">
                    <div className={`w-9 h-9 rounded-lg border flex items-center justify-center ${meta.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-[10px] uppercase tracking-wider border rounded-full px-2 py-0.5 ${STATUS_META[f.status]}`}>
                        {f.status}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(f.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-sm text-slate-200 line-clamp-2">
                      {f.message}
                    </div>
                    {/* Mobile meta */}
                    <div className="md:hidden mt-2 flex items-center gap-2 text-[11px] text-slate-500 flex-wrap">
                      <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 ${meta.color}`}>
                        <Icon className="w-3 h-3" /> {meta.label}
                      </span>
                      {f.user_email && <span className="truncate">{f.user_email}</span>}
                    </div>
                  </div>

                  <div className="hidden md:block min-w-0 text-xs text-slate-400">
                    <div className="truncate">{f.user_name || "Anonymous"}</div>
                    <div className="truncate text-slate-600">{f.user_email || ""}</div>
                  </div>

                  <div className="hidden md:flex items-center">
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] ${meta.color}`}>
                      <Icon className="w-3 h-3" /> {meta.label}
                    </span>
                  </div>

                  <div className="hidden md:flex items-center gap-0.5">
                    {f.rating ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3 h-3 ${
                            i < f.rating!
                              ? "fill-amber-400 text-amber-400"
                              : "text-slate-700"
                          }`}
                        />
                      ))
                    ) : (
                      <span className="text-slate-600 text-xs">—</span>
                    )}
                  </div>
                </button>
              );
            })}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{total} total</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-md border border-slate-800 bg-slate-900/60 px-3 py-1.5 hover:bg-slate-900 disabled:opacity-40"
              >
                Prev
              </button>
              <span>
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-md border border-slate-800 bg-slate-900/60 px-3 py-1.5 hover:bg-slate-900 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail drawer */}
      {openId && (
        <DetailDrawer
          detail={detail}
          loading={detailLoading}
          onClose={() => { setOpenId(null); setDetail(null); }}
          onStatus={updateStatus}
          onReply={sendReply}
          onDelete={removeOne}
        />
      )}
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────
function StatCard({
  label, value, icon: Icon, accent = "slate",
}: {
  label: string;
  value: any;
  icon: any;
  accent?: "slate" | "violet" | "amber" | "cyan";
}) {
  const accents: Record<string, string> = {
    slate:  "border-slate-800 bg-slate-900/40 text-slate-300",
    violet: "border-violet-500/40 bg-violet-500/5 text-violet-300",
    amber:  "border-amber-500/40 bg-amber-500/5 text-amber-300",
    cyan:   "border-cyan-500/40 bg-cyan-500/5 text-cyan-300",
  };
  return (
    <div className={`rounded-xl border p-4 ${accents[accent]}`}>
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wider text-slate-400">
          {label}
        </div>
        <Icon className="w-4 h-4" />
      </div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}

// ─── Detail drawer ────────────────────────────────────────────────────
function DetailDrawer({
  detail, loading, onClose, onStatus, onReply, onDelete,
}: {
  detail: Feedback | null;
  loading: boolean;
  onClose: () => void;
  onStatus: (id: string, status: Feedback["status"]) => void;
  onReply: (id: string, msg: string) => void;
  onDelete: (id: string) => void;
}) {
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  const handleReply = async () => {
    if (!detail || !replyText.trim()) return;
    setSending(true);
    try {
      await onReply(detail.id, replyText.trim());
      setReplyText("");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <aside
        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-2xl bg-slate-950 border-l border-slate-800 overflow-y-auto"
      >
        <div className="sticky top-0 bg-slate-950 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-200">
            Feedback detail
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-900 text-slate-500 hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading && !detail && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
          </div>
        )}

        {detail && (
          <div className="p-6 space-y-5">
            {/* Header */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[11px] uppercase tracking-wider border rounded-full px-2 py-0.5 ${STATUS_META[detail.status]}`}>
                  {detail.status}
                </span>
                <span className="text-[11px] text-slate-500">
                  {new Date(detail.created_at).toLocaleString()}
                </span>
              </div>
              <div className="text-xs text-slate-400">
                {detail.user_name || "Anonymous"}{" "}
                {detail.user_email && `· ${detail.user_email}`}
              </div>
              {detail.page_url && (
                <div className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                  <ExternalLink className="w-3 h-3" /> {detail.page_url}
                </div>
              )}
            </div>

            {/* Message */}
            <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-200 whitespace-pre-wrap break-words">
              {detail.message}
            </div>

            {/* Screenshot */}
            {detail.screenshot_url && (
              <a
                href={detail.screenshot_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-lg border border-slate-800 overflow-hidden hover:border-violet-500/40"
              >
                <img
                  src={detail.screenshot_url}
                  alt="Screenshot"
                  className="w-full"
                />
              </a>
            )}

            {/* Status actions */}
            <div className="space-y-2">
              <div className="text-xs uppercase tracking-wider text-slate-500">
                Change status
              </div>
              <div className="flex flex-wrap gap-2">
                {(["new", "reviewing", "resolved", "closed"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => onStatus(detail.id, s)}
                    disabled={detail.status === s}
                    className={`rounded-md border px-3 py-1.5 text-xs capitalize transition ${
                      detail.status === s
                        ? "border-violet-500 bg-violet-500/20 text-violet-200 cursor-default"
                        : "border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Reply */}
            <div className="space-y-2">
              <div className="text-xs uppercase tracking-wider text-slate-500">
                Reply to user
              </div>
              {detail.meta?.reply && (
                <div className="rounded-lg border border-emerald-800/40 bg-emerald-950/20 p-3 text-sm text-emerald-200">
                  <div className="text-[10px] uppercase tracking-wider text-emerald-400 mb-1">
                    Sent {detail.meta.replied_at
                      ? new Date(detail.meta.replied_at).toLocaleString()
                      : ""}
                  </div>
                  <div className="whitespace-pre-wrap">{detail.meta.reply}</div>
                </div>
              )}
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write a reply… this will mark the item as resolved."
                rows={4}
                className="w-full rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-violet-500 focus:outline-none resize-none"
              />
              <button
                onClick={handleReply}
                disabled={sending || !replyText.trim()}
                className="flex items-center gap-2 rounded-lg bg-violet-600 hover:bg-violet-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Send reply
              </button>
            </div>

            {/* Delete */}
            <div className="pt-4 border-t border-slate-800">
              <button
                onClick={() => onDelete(detail.id)}
                className="flex items-center gap-2 rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-xs text-red-300 hover:bg-red-950/60"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete feedback
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}