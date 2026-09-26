"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell, Search, BookOpen, FileText, Layers, HelpCircle,
  Upload, Music, Video, MoreHorizontal, ChevronRight,
  Flame, Star, Play, TrendingUp,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  getGamificationStats,
  GamificationStats,
} from "@/lib/gamification";
import NotificationsSheet from "@/components/notifications/NotificationsSheet";

const QUICK_ACTIONS = [
  { id: "subjects",   label: "Subjects",   icon: BookOpen,       color: "violet",  href: "/app/learn" },
  { id: "notes",      label: "Notes",      icon: FileText,       color: "cyan",    href: "/app/notes" },
  { id: "flashcards", label: "Flashcards", icon: Layers,         color: "emerald", href: "/app/learn" },
  { id: "quiz",       label: "Quiz",       icon: HelpCircle,     color: "amber",   href: "/app/learn" },
  { id: "import",     label: "Import File",icon: Upload,         color: "pink",    href: "/app/files" },
  { id: "audio",      label: "Audio",      icon: Music,          color: "blue",    href: "/app/media" },
  { id: "video",      label: "Video",      icon: Video,          color: "red",     href: "/app/media" },
  { id: "more",       label: "More",       icon: MoreHorizontal, color: "slate",   href: "/app/tools" },
];

const COLOR_MAP: Record<string, { bg: string; text: string }> = {
  violet:  { bg: "from-violet-600/30 to-violet-900/10 border-violet-500/30",    text: "text-violet-300" },
  cyan:    { bg: "from-cyan-600/30 to-cyan-900/10 border-cyan-500/30",          text: "text-cyan-300" },
  emerald: { bg: "from-emerald-600/30 to-emerald-900/10 border-emerald-500/30", text: "text-emerald-300" },
  amber:   { bg: "from-amber-600/30 to-amber-900/10 border-amber-500/30",       text: "text-amber-300" },
  pink:    { bg: "from-pink-600/30 to-pink-900/10 border-pink-500/30",          text: "text-pink-300" },
  blue:    { bg: "from-blue-600/30 to-blue-900/10 border-blue-500/30",          text: "text-blue-300" },
  red:     { bg: "from-red-600/30 to-red-900/10 border-red-500/30",             text: "text-red-300" },
  slate:   { bg: "from-slate-600/30 to-slate-900/10 border-slate-500/30",       text: "text-slate-300" },
};

export default function MobileHome() {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const [stats, setStats] = useState<GamificationStats | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  // Load gamification stats
  useEffect(() => {
    getGamificationStats().then(setStats).catch(() => {});
  }, []);

  // Poll notification unread count
  useEffect(() => {
    const poll = async () => {
      try {
        const mod = await import("@/lib/notifications");
        if (typeof (mod as any).getUnreadCount === "function") {
          const count = await (mod as any).getUnreadCount().catch(() => 0);
          setUnreadCount(Number(count) || 0);
        }
      } catch {
        // Notifications lib not available — silently skip
      }
    };
    poll();
    const id = setInterval(poll, 15000);
    return () => clearInterval(id);
  }, []);

  const firstName = user?.full_name?.split(" ")[0] || "there";
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  // Mock learning progress — replace with real API later
  const learningProgress = 72;
  const minutesToday = 84;
  const minutesGoal = 120;
  const currentChapter = {
    subject: "Physics",
    chapter: "Chapter 4: Motion",
    progress: 72,
    minutesStudied: 84,
    minutesTotal: 120,
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-950 pb-24">
      {/* ─── Top header ─── */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img
            src="/x-logo.png"
            alt="Xentra"
            className="w-8 h-8 object-contain drop-shadow-[0_0_10px_rgba(139,92,246,0.5)]"
          />
          <div className="leading-tight">
            <div className="text-[10px] text-slate-500">Xentra</div>
            <div className="text-sm font-bold bg-gradient-to-r from-violet-300 to-cyan-300 bg-clip-text text-transparent">
              Your AI Agent
            </div>
          </div>
        </div>

        {/* ✅ Notification bell — opens sheet */}
        <button
          onClick={() => setShowNotifications(true)}
          className="relative w-9 h-9 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center hover:bg-slate-800 transition active:scale-95"
          title="Notifications"
        >
          <Bell className="w-4 h-4 text-slate-300" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-violet-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-slate-950">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* ─── Greeting ─── */}
      <div className="px-4 pb-3">
        <h1 className="text-xl font-bold text-slate-100">
          {greeting}, {firstName} 👋
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Small steps every day lead to big success.
        </p>
      </div>

      {/* ─── Search bar ─── */}
      <div className="px-4 pb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            placeholder="Search anything…"
            className="w-full rounded-full border border-slate-800 bg-slate-900/60 pl-10 pr-4 py-2.5 text-sm placeholder-slate-500 focus:border-violet-500 focus:outline-none"
          />
        </div>
      </div>

      {/* ─── Learning Hub card ─── */}
      <div className="px-4 pb-4">
        <div className="relative overflow-hidden rounded-2xl border border-violet-500/40 bg-gradient-to-br from-violet-600/25 via-violet-900/20 to-cyan-900/10 p-4">
          <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-violet-500/20 blur-3xl pointer-events-none" />

          <div className="relative flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center">
                  <BookOpen className="w-4 h-4 text-violet-300" />
                </div>
                <div className="text-sm font-semibold text-white">Learning Hub</div>
              </div>
              <p className="text-[11px] text-violet-200/70 mb-3">
                Your journey, your future.
              </p>

              <div className="flex items-center gap-2 text-[11px] text-slate-300">
                <Play className="w-3 h-3 fill-current text-violet-300" />
                <span className="font-mono">
                  {Math.floor(minutesToday / 60)}h {minutesToday % 60}m
                </span>
                <span className="text-slate-500">/</span>
                <span className="font-mono text-slate-500">
                  {Math.floor(minutesGoal / 60)}h today
                </span>
              </div>

              <div className="mt-2 h-1.5 rounded-full bg-slate-950/60 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet-400 to-cyan-400 rounded-full transition-all"
                  style={{ width: `${learningProgress}%` }}
                />
              </div>
            </div>

            {/* Circular progress ring */}
            <div className="relative w-16 h-16 shrink-0">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle
                  cx="18"
                  cy="18"
                  r="15.5"
                  fill="none"
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth="2.5"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="15.5"
                  fill="none"
                  stroke="url(#progressGradient)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeDasharray={`${learningProgress} ${100 - learningProgress}`}
                  strokeDashoffset="0"
                />
                <defs>
                  <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#a78bfa" />
                    <stop offset="100%" stopColor="#22d3ee" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[11px] font-bold text-white">
                  {learningProgress}%
                </span>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="relative mt-4 flex items-center gap-3 text-[11px]">
            <div className="flex items-center gap-1.5 text-amber-300">
              <Flame className="w-3.5 h-3.5" />
              <span className="font-semibold">{stats?.streak_days ?? 0} Day Streak</span>
            </div>
            <div className="flex items-center gap-1.5 text-violet-300">
              <Star className="w-3.5 h-3.5" />
              <span className="font-semibold">
                {(stats?.points ?? 0).toLocaleString()} XP
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Quick actions grid ─── */}
      <div className="px-4 pb-4">
        <div className="grid grid-cols-4 gap-2.5">
          {QUICK_ACTIONS.map((a) => {
            const Icon = a.icon;
            const style = COLOR_MAP[a.color] || COLOR_MAP.slate;
            return (
              <button
                key={a.id}
                onClick={() => router.push(a.href)}
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

      {/* ─── Continue Learning ─── */}
      <div className="px-4 pb-4">
        <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/80 via-violet-950/20 to-slate-900/60 p-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-slate-500">Continue Learning</div>
              <div className="text-sm font-semibold text-slate-100 truncate">
                {currentChapter.subject} — {currentChapter.chapter}
              </div>
            </div>
            <button
              onClick={() => router.push("/app/learn")}
              className="shrink-0 rounded-lg bg-violet-600 hover:bg-violet-500 px-3 py-1.5 text-xs font-semibold text-white transition flex items-center gap-1"
            >
              Continue
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
            <span className="font-mono">
              {Math.floor(currentChapter.minutesStudied / 60)}h{" "}
              {currentChapter.minutesStudied % 60}m /{" "}
              {currentChapter.minutesTotal / 60}h
            </span>
            <span className="text-violet-300 font-semibold">
              {currentChapter.progress}%
            </span>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-slate-950/60 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-400 to-cyan-400 rounded-full"
              style={{ width: `${currentChapter.progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* ─── Today's Goals ─── */}
      <div className="px-4 pb-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-semibold text-slate-200">Today's Goals</span>
          </div>
          <div className="space-y-3">
            <GoalRow label="Study for 1 hour" current={45} total={60} />
            <GoalRow label="Complete 1 quiz" current={1} total={1} />
            <GoalRow label="Review flashcards" current={8} total={20} />
          </div>
        </div>
      </div>

      {/* ✅ Notification sheet */}
      {showNotifications && (
        <NotificationsSheet onClose={() => setShowNotifications(false)} />
      )}
    </div>
  );
}

// ─── Goal row ───
function GoalRow({
  label,
  current,
  total,
}: {
  label: string;
  current: number;
  total: number;
}) {
  const pct = Math.min(100, (current / total) * 100);
  const done = current >= total;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className={done ? "text-emerald-400" : "text-slate-300"}>
          {done && "✓ "}
          {label}
        </span>
        <span className="font-mono text-slate-500">
          {current} / {total}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-950/60 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            done ? "bg-emerald-500" : "bg-gradient-to-r from-violet-400 to-cyan-400"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}