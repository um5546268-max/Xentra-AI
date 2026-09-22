"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Library, Loader2, Search, BookOpen, StickyNote, ClipboardList,
  CheckCircle2, XCircle, ChevronRight,
} from "lucide-react";
import {
  LibraryItem, LibraryStats, listLibrary, getLibraryStats,
} from "@/lib/library";
import { SUBJECTS } from "@/lib/notes";

type Tab = "all" | "sessions" | "notes" | "tests";

const TYPE_ICONS: Record<string, React.ReactNode> = {
  session: <BookOpen className="w-4 h-4 text-violet-400" />,
  note: <StickyNote className="w-4 h-4 text-emerald-400" />,
  test: <ClipboardList className="w-4 h-4 text-cyan-400" />,
};

export default function LibraryPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [stats, setStats] = useState<LibraryStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      listLibrary(tab === "all" ? "all" : tab, search || undefined),
      getLibraryStats(),
    ])
      .then(([lib, st]) => {
        setItems(lib.items);
        setStats(st);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tab, search]);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/40 flex items-center justify-center">
            <Library className="w-5 h-5 text-violet-300" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">My Library</h1>
            <p className="text-sm text-slate-500">
              Everything you've created — in one place.
            </p>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-4 gap-3">
            <StatCard label="Total" value={stats.total} accent />
            <StatCard label="Sessions" value={stats.sessions} />
            <StatCard label="Notes" value={stats.notes} />
            <StatCard label="Tests" value={stats.tests} />
          </div>
        )}

        {/* Search + tabs */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search everything…"
              className="w-full rounded-lg border border-slate-800 bg-slate-950 pl-9 pr-3 py-2.5 text-sm focus:border-violet-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1 w-fit">
            {(["all", "sessions", "notes", "tests"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-1.5 text-xs rounded-md transition capitalize ${
                  tab === t
                    ? "bg-violet-600 text-white"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Items */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 text-slate-600 text-sm space-y-2">
            <Library className="w-10 h-10 mx-auto text-slate-700" />
            <div>
              {search
                ? "No matches."
                : "Nothing here yet. Start creating to fill your library."}
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            {items.map((item) => {
              const subj = SUBJECTS.find((s) => s.id === item.subject);
              const meta = item.meta || {};
              return (
                <button
                  key={`${item.type}-${item.id}`}
                  onClick={() => router.push(meta.url)}
                  className="group w-full flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/40 p-4 hover:bg-slate-900 transition text-left"
                >
                  <div className="w-9 h-9 rounded-lg bg-slate-950 flex items-center justify-center shrink-0">
                    {TYPE_ICONS[item.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium truncate">{item.title}</div>
                      {item.type === "note" && meta.pinned && (
                        <span className="text-[10px] text-amber-400">📌</span>
                      )}
                      {item.type === "test" && meta.submitted && (
                        <span className={`flex items-center gap-0.5 text-[10px] ${
                          meta.passed ? "text-emerald-400" : "text-red-400"
                        }`}>
                          {meta.passed ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : (
                            <XCircle className="w-3 h-3" />
                          )}
                          {meta.score}%
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 truncate mt-0.5">
                      {item.preview || "—"}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] uppercase tracking-wider text-slate-600">
                        {item.type}
                      </span>
                      {subj && (
                        <span className="text-[10px] text-slate-500">
                          · {subj.emoji} {subj.label}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-600">
                        · {new Date(item.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label, value, accent,
}: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${
      accent ? "border-violet-500/40 bg-violet-500/5" : "border-slate-800 bg-slate-900/40"
    }`}>
      <div className="text-xs text-slate-500 uppercase tracking-wider">{label}</div>
      <div className={`text-2xl font-semibold mt-1 ${accent ? "text-violet-300" : ""}`}>
        {value}
      </div>
    </div>
  );
}