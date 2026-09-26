"use client";

import { useEffect, useState, memo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search, ArrowRight, BookOpen, ChevronRight, Flame, Star,
  Play, X, Loader2,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  LearnSession, StudyStats,
  listLearnSessions, getLearnStats,
  learnFromTopic,
} from "@/lib/learn";
import { getGamificationStats, GamificationStats } from "@/lib/gamification";

const SUBJECTS = [
  { id: "languages",   label: "Languages",        emoji: "💬", color: "violet" },
  { id: "school",      label: "School / College", emoji: "🎓", color: "cyan" },
  { id: "programming", label: "Programming",      emoji: "⌨️", color: "emerald" },
  { id: "science",     label: "Science & Research", emoji: "🔬", color: "amber" },
  { id: "personal",    label: "Personal Growth",  emoji: "🎯", color: "pink" },
];

const COLOR_MAP: Record<string, { bg: string; text: string }> = {
  violet:  { bg: "from-violet-600/30 to-violet-900/10 border-violet-500/30",    text: "text-violet-300" },
  cyan:    { bg: "from-cyan-600/30 to-cyan-900/10 border-cyan-500/30",          text: "text-cyan-300" },
  emerald: { bg: "from-emerald-600/30 to-emerald-900/10 border-emerald-500/30", text: "text-emerald-300" },
  amber:   { bg: "from-amber-600/30 to-amber-900/10 border-amber-500/30",       text: "text-amber-300" },
  pink:    { bg: "from-pink-600/30 to-pink-900/10 border-pink-500/30",          text: "text-pink-300" },
};

export default function MobileLearn() {
  const router = useRouter();
  const user = useAuth((s) => s.user);

  const [sessions, setSessions] = useState<LearnSession[]>([]);
  const [stats, setStats] = useState<StudyStats | null>(null);
  const [gamStats, setGamStats] = useState<GamificationStats | null>(null);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSubject, setActiveSubject] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      listLearnSessions().catch(() => []),
      getLearnStats().catch(() => null),
      getGamificationStats().catch(() => null),
    ]).then(([s, st, g]) => {
      setSessions(s.slice(0, 10));
      setStats(st);
      setGamStats(g);
      setLoading(false);
    });
  }, []);

  const firstName = user?.full_name?.split(" ")[0] || "there";

  const handleSearch = useCallback(async () => {
    const q = searchQuery.trim();
    if (!q || creating) return;
    setCreating(true);
    setError(null);
    try {
      const session = await learnFromTopic(q, 8, activeSubject || undefined);
      router.push(`/app/learn/${session.id}`);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || "Failed to create session");
      setCreating(false);
    }
  }, [searchQuery, creating, activeSubject, router]);

  const handleSubjectTap = useCallback((subjectId: string) => {
    setActiveSubject((prev) => (prev === subjectId ? null : subjectId));
  }, []);

  const filteredSessions = activeSubject
    ? sessions.filter((s) => s.subject === activeSubject)
    : sessions;

  const statsZero =
    (stats?.total_sessions ?? 0) === 0 &&
    (stats?.total_flashcards ?? 0) === 0;

  return (
    <div className="h-full overflow-y-auto bg-slate-950 pb-24">
      {/* Header */}
      <div className="px-4 pt-3 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/25">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div className="leading-tight">
            <div className="text-base font-bold text-slate-100">Learning Hub</div>
            <div className="text-[11px] text-slate-500">Learn · Practice · Grow</div>
          </div>
        </div>
      </div>

      {/* Search with button */}
      <div className="px-4 pb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
            }}
            placeholder="Enter a topic to learn…"
            disabled={creating}
            className="w-full rounded-full border border-slate-800 bg-slate-900/60 pl-10 pr-14 py-3 text-sm placeholder-slate-500 focus:border-violet-500 focus:outline-none disabled:opacity-60"
          />
          <button
            onClick={handleSearch}
            disabled={!searchQuery.trim() || creating}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center text-white transition active:scale-95 disabled:opacity-40"
            style={{
              background: "linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)",
            }}
          >
            {creating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ArrowRight className="w-4 h-4" />
            )}
          </button>
        </div>

        {error && (
          <div className="mt-2 rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-xs text-red-300 flex items-start gap-2">
            <X className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            {error}
          </div>
        )}
      </div>

      {/* Subject chips */}
      <div className="px-4 pb-4">
        <div className="flex gap-2 overflow-x-auto scrollbar-thin">
          <button
            onClick={() => setActiveSubject(null)}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
              activeSubject === null
                ? "border-violet-500 bg-violet-500/20 text-violet-300"
                : "border-slate-800 text-slate-500 hover:text-slate-200"
            }`}
          >
            All
          </button>
          {SUBJECTS.map((s) => (
            <button
              key={s.id}
              onClick={() => handleSubjectTap(s.id)}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
                activeSubject === s.id
                  ? "border-violet-500 bg-violet-500/20 text-violet-300"
                  : "border-slate-800 text-slate-500 hover:text-slate-200"
              }`}
            >
              {s.emoji} {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 pb-4">
        <div className="grid grid-cols-3 gap-2.5">
          <StatCard label="Sessions" value={stats?.total_sessions ?? 0} />
          <StatCard label="Flashcards" value={stats?.total_flashcards ?? 0} />
          <StatCard label="Due" value={stats?.due_today ?? 0} />
        </div>
      </div>

      {/* Streak / XP */}
      <div className="px-4 pb-4 flex items-center gap-3 text-xs">
        <div className="flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 flex-1">
          <Flame className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-semibold text-amber-300">
            {gamStats?.streak_days ?? 0} Day Streak
          </span>
        </div>
        <div className="flex items-center gap-1.5 rounded-xl border border-violet-500/30 bg-violet-500/10 px-3 py-2 flex-1">
          <Star className="w-3.5 h-3.5 text-violet-400" />
          <span className="font-semibold text-violet-300">
            {(gamStats?.points ?? 0).toLocaleString()} XP
          </span>
        </div>
      </div>

      {/* Subject cards */}
      {!activeSubject && (
        <div className="px-4 pb-4">
          <div className="text-sm font-semibold text-slate-200 mb-3">
            My Subjects
          </div>
          <div className="space-y-2.5">
            {SUBJECTS.map((s) => (
              <SubjectCard
                key={s.id}
                subject={s}
                onClick={() => handleSubjectTap(s.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Sessions */}
      <div className="px-4 pb-4">
        <div className="text-sm font-semibold text-slate-200 mb-3 flex items-center justify-between">
          <span>
            {activeSubject
              ? `${SUBJECTS.find((x) => x.id === activeSubject)?.label} Sessions`
              : "Recent Sessions"}
          </span>
          {activeSubject && (
            <button
              onClick={() => setActiveSubject(null)}
              className="text-[11px] text-violet-400"
            >
              View all →
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-8 text-slate-500 text-sm">
            Loading…
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-6 text-center space-y-2">
            <BookOpen className="w-6 h-6 mx-auto text-slate-600" />
            <div className="text-xs text-slate-500">
              {statsZero
                ? "No sessions yet. Enter a topic above to start!"
                : "No sessions in this subject."}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredSessions.map((s) => (
              <SessionRow
                key={s.id}
                session={s}
                onOpen={(id) => router.push(`/app/learn/${id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MEMOIZED SUBCOMPONENTS
// ═══════════════════════════════════════════════════════════════

const StatCard = memo(function StatCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3 text-center">
      <div className="text-lg font-bold text-slate-100">{value}</div>
      <div className="text-[10px] text-slate-500 mt-0.5">{label}</div>
    </div>
  );
});

const SubjectCard = memo(function SubjectCard({
  subject,
  onClick,
}: {
  subject: { id: string; label: string; emoji: string; color: string };
  onClick: () => void;
}) {
  const style = COLOR_MAP[subject.color] || COLOR_MAP.violet;
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-3 hover:bg-slate-900 transition text-left active:scale-[0.99]"
    >
      <div
        className={`w-11 h-11 rounded-xl border bg-gradient-to-br ${style.bg} flex items-center justify-center shrink-0`}
      >
        <span className="text-lg">{subject.emoji}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-slate-100 truncate">
          {subject.label}
        </div>
        <div className="text-[11px] text-slate-500 mt-0.5">
          Tap to see sessions
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />
    </button>
  );
});

const SessionRow = memo(function SessionRow({
  session,
  onOpen,
}: {
  session: LearnSession;
  onOpen: (id: string) => void;
}) {
  return (
    <button
      onClick={() => onOpen(session.id)}
      className="w-full flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-3 hover:bg-slate-900 transition text-left active:scale-[0.99]"
    >
      <div className="w-9 h-9 rounded-lg bg-violet-500/20 flex items-center justify-center shrink-0">
        <BookOpen className="w-4 h-4 text-violet-300" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-slate-100 truncate">
          {session.title}
        </div>
        <div className="text-[11px] text-slate-500 truncate mt-0.5">
          {session.subject ? `${session.subject} · ` : ""}
          {new Date(session.created_at).toLocaleDateString()}
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />
    </button>
  );
});