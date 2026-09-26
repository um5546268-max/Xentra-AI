"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search, BookOpen, FileText, Layers, HelpCircle,
  Upload, Music, Video, MoreHorizontal, ChevronRight,
  Flame, Star, Play, Plus,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  LearnSession, StudyStats,
  listLearnSessions, getLearnStats,
} from "@/lib/learn";
import { getGamificationStats, GamificationStats } from "@/lib/gamification";

const SUBJECTS = [
  { id: "math",      label: "Mathematics",      emoji: "📐", color: "violet",  chapters: "3/5 chapters", progress: 60 },
  { id: "physics",   label: "Physics",          emoji: "⚛️", color: "cyan",    chapters: "2/5 chapters", progress: 40 },
  { id: "cs",        label: "Computer Science", emoji: "💻", color: "emerald", chapters: "1/4 chapters", progress: 25 },
  { id: "english",   label: "English",          emoji: "📖", color: "amber",   chapters: "0/5 chapters", progress: 0 },
];

const COLOR_MAP: Record<string, { bg: string; text: string }> = {
  violet:  { bg: "from-violet-600/30 to-violet-900/10 border-violet-500/30",   text: "text-violet-300" },
  cyan:    { bg: "from-cyan-600/30 to-cyan-900/10 border-cyan-500/30",         text: "text-cyan-300" },
  emerald: { bg: "from-emerald-600/30 to-emerald-900/10 border-emerald-500/30",text: "text-emerald-300" },
  amber:   { bg: "from-amber-600/30 to-amber-900/10 border-amber-500/30",      text: "text-amber-300" },
};

export default function MobileLearn() {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const [sessions, setSessions] = useState<LearnSession[]>([]);
  const [stats, setStats] = useState<StudyStats | null>(null);
  const [gamStats, setGamStats] = useState<GamificationStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      listLearnSessions().catch(() => []),
      getLearnStats().catch(() => null),
      getGamificationStats().catch(() => null),
    ]).then(([s, st, g]) => {
      setSessions(s.slice(0, 5));
      setStats(st);
      setGamStats(g);
      setLoading(false);
    });
  }, []);

  const firstName = user?.full_name?.split(" ")[0] || "there";

  // Mock learning progress
  const learningProgress = 72;
  const minutesToday = 84;
  const minutesGoal = 120;

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
        <button
          onClick={() => router.push("/app/learn")}
          className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center"
        >
          <Plus className="w-4 h-4 text-slate-300" />
        </button>
      </div>

      {/* Search */}
      <div className="px-4 pb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            placeholder="Search subjects or topics…"
            className="w-full rounded-full border border-slate-800 bg-slate-900/60 pl-10 pr-4 py-2.5 text-sm placeholder-slate-500 focus:border-violet-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Stats tabs (mimic the mockup) */}
      <div className="px-4 pb-4 flex gap-2 overflow-x-auto scrollbar-thin">
        {["Subjects", "Progress", "XP", "Streak"].map((t, i) => (
          <button
            key={t}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              i === 0
                ? "border-violet-500 bg-violet-500/20 text-violet-300"
                : "border-slate-800 text-slate-500"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Continue Learning hero card */}
      <div className="px-4 pb-4">
        <div className="relative overflow-hidden rounded-2xl border border-violet-500/40 bg-gradient-to-br from-violet-600/25 via-violet-900/20 to-cyan-900/10 p-4">
          <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-violet-500/20 blur-3xl pointer-events-none" />

          <div className="relative flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-[11px] text-violet-200/70 uppercase tracking-wider mb-0.5">
                Continue Learning
              </div>
              <div className="text-base font-semibold text-white">
                Physics — Chapter 4: Motion
              </div>
              <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-300">
                <Play className="w-3 h-3 fill-current text-violet-300" />
                <span className="font-mono">
                  {Math.floor(minutesToday / 60)}h {minutesToday % 60}m / 2h today
                </span>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-slate-950/60 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet-400 to-cyan-400 rounded-full"
                  style={{ width: `${learningProgress}%` }}
                />
              </div>
            </div>

            {/* Progress ring */}
            <div className="relative w-14 h-14 shrink-0">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2.5" />
                <circle
                  cx="18" cy="18" r="15.5" fill="none"
                  stroke="url(#learnGrad)" strokeWidth="2.5" strokeLinecap="round"
                  strokeDasharray={`${learningProgress} ${100 - learningProgress}`}
                />
                <defs>
                  <linearGradient id="learnGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#a78bfa" />
                    <stop offset="100%" stopColor="#22d3ee" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[11px] font-bold text-white">{learningProgress}%</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => router.push("/app/learn")}
            className="relative mt-3 w-full rounded-lg bg-violet-600 hover:bg-violet-500 py-2 text-xs font-semibold text-white transition"
          >
            Continue Learning
          </button>
        </div>
      </div>

      {/* Streak / XP row */}
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

      {/* Subjects */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-semibold text-slate-200">My Subjects</div>
          <button
            onClick={() => router.push("/app/learn")}
            className="text-[11px] text-violet-400"
          >
            See all →
          </button>
        </div>
        <div className="space-y-2.5">
          {SUBJECTS.map((s) => {
            const style = COLOR_MAP[s.color];
            return (
              <button
                key={s.id}
                onClick={() => router.push(`/app/learn?subject=${s.id}`)}
                className="w-full flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-3 hover:bg-slate-900 transition text-left"
              >
                <div className={`w-10 h-10 rounded-xl border bg-gradient-to-br ${style.bg} flex items-center justify-center shrink-0`}>
                  <span className="text-lg">{s.emoji}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="text-sm font-medium text-slate-100 truncate">
                      {s.label}
                    </div>
                    <div className={`text-[11px] font-mono ${style.text}`}>
                      {s.progress}%
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-500 mb-1.5">
                    {s.chapters}
                  </div>
                  <div className="h-1 rounded-full bg-slate-950/60 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-violet-400 to-cyan-400 rounded-full"
                      style={{ width: `${s.progress}%` }}
                    />
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick actions grid */}
      <div className="px-4 pb-4">
        <div className="text-sm font-semibold text-slate-200 mb-3">Quick Actions</div>
        <div className="grid grid-cols-4 gap-2.5">
          {[
            { label: "Subjects",   icon: BookOpen,       color: "violet" },
            { label: "Notes",      icon: FileText,       color: "cyan" },
            { label: "Flashcards", icon: Layers,         color: "emerald" },
            { label: "Quiz",       icon: HelpCircle,     color: "amber" },
            { label: "Import",     icon: Upload,         color: "pink" },
            { label: "Audio",      icon: Music,          color: "blue" },
            { label: "Video",      icon: Video,          color: "violet" },
            { label: "More",       icon: MoreHorizontal, color: "slate" },
          ].map((a) => {
            const style = COLOR_MAP[a.color] || COLOR_MAP.violet;
            const Icon = a.icon;
            return (
              <button
                key={a.label}
                onClick={() => router.push("/app/learn")}
                className={`flex flex-col items-center gap-1.5 rounded-2xl border bg-gradient-to-br ${style.bg} p-3 transition active:scale-95`}
              >
                <div className="w-8 h-8 rounded-lg bg-slate-950/60 flex items-center justify-center">
                  <Icon className={`w-4 h-4 ${style.text}`} />
                </div>
                <span className="text-[10px] font-medium text-slate-300 text-center leading-tight">
                  {a.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent sessions (from your actual data) */}
      {sessions.length > 0 && (
        <div className="px-4 pb-6">
          <div className="text-sm font-semibold text-slate-200 mb-3">Recent Sessions</div>
          <div className="space-y-2">
            {sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => router.push(`/app/learn/${s.id}`)}
                className="w-full flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-3 hover:bg-slate-900 transition text-left"
              >
                <div className="w-9 h-9 rounded-lg bg-violet-500/20 flex items-center justify-center shrink-0">
                  <BookOpen className="w-4 h-4 text-violet-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-100 truncate">
                    {s.title}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {s.subject ? `${s.subject} · ` : ""}
                    {new Date(s.created_at).toLocaleDateString()}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}