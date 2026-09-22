"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles, GraduationCap, ShoppingBag, Music, Code, Image as ImageIcon,
  Plus, Flame, Star, Trophy, TrendingUp,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { getGamificationStats, GamificationStats } from "@/lib/gamification";
import {
  listLearnSessions,
  getLearnStats,
  LearnSession,
  StudyStats,
} from "@/lib/learn";
import { BriefingCard } from "@/components/learn/BriefingCard";
import { GoalsWidget } from "@/components/learn/GoalsWidget";

export default function AppHome() {
  const router = useRouter();
  const { user } = useAuth();
  const [stats, setStats] = useState<GamificationStats | null>(null);
  const [learnStats, setLearnStats] = useState<StudyStats | null>(null);
  const [recentSessions, setRecentSessions] = useState<LearnSession[]>([]);

  useEffect(() => {
    getGamificationStats().then(setStats).catch(() => {});
    getLearnStats().then(setLearnStats).catch(() => {});
    listLearnSessions()
      .then((s) => setRecentSessions(s.slice(0, 3)))
      .catch(() => {});
  }, []);

  const firstName = user?.full_name?.split(" ")[0] || "there";
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto p-8 space-y-8">
                {/* Greeting */}
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold">
            {greeting}, {firstName} 👋
          </h1>
          <p className="text-slate-500 text-sm">
            Small steps every day lead to big success.
          </p>
        </div>

        {/* Daily Briefing */}
        <BriefingCard />

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3">
          <StatCard
            icon={<Star className="w-4 h-4 text-yellow-400" />}
            label="Points"
            value={stats?.points ?? 0}
          />
          <StatCard
            icon={<Flame className="w-4 h-4 text-orange-400" />}
            label="Streak"
            value={`${stats?.streak_days ?? 0}d`}
            accent={(stats?.streak_days ?? 0) > 0}
          />
          <StatCard
            icon={<Trophy className="w-4 h-4 text-violet-400" />}
            label="Level"
            value={stats?.level ?? 1}
          />
          <StatCard
            icon={<TrendingUp className="w-4 h-4 text-emerald-400" />}
            label="Mastered"
            value={learnStats?.mastered ?? 0}
          />
        </div>

        {/* XP bar */}
        {stats && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">
                Level {stats.level}
              </span>
              <span className="text-slate-500 font-mono">
                {stats.xp_in_level} / {stats.xp_to_next} XP
              </span>
            </div>
            {/* Your Goals */}
             <GoalsWidget />
            <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-cyan-500 transition-all"
                style={{
                  width: `${(stats.xp_in_level / stats.xp_to_next) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Quick actions */}
        <div className="space-y-3">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Quick actions
          </div>
          <div className="grid grid-cols-2 gap-3">
            <QuickAction
              icon={<GraduationCap className="w-5 h-5 text-violet-300" />}
              title="Start learning"
              subtitle="Topic → flashcards + quiz"
              onClick={() => router.push("/app/learn")}
              accent
            />
            <QuickAction
              icon={<Sparkles className="w-5 h-5 text-cyan-300" />}
              title="New conversation"
              subtitle="Ask Xentra anything"
              onClick={() => router.push("/app/c")}
            />
            <QuickAction
              icon={<ShoppingBag className="w-5 h-5 text-emerald-300" />}
              title="Find a product"
              subtitle="Compare prices intelligently"
              onClick={() => router.push("/app/shopping")}
            />
            <QuickAction
              icon={<Music className="w-5 h-5 text-pink-300" />}
              title="Play media"
              subtitle="Spotify, YouTube, local files"
              onClick={() => router.push("/app/media")}
            />
          </div>
        </div>

        {/* Recent learning */}
        {recentSessions.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Continue learning
              </div>
              <button
                onClick={() => router.push("/app/learn")}
                className="text-xs text-violet-400 hover:text-violet-300"
              >
                View all →
              </button>
            </div>
            <div className="space-y-2">
              {recentSessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => router.push(`/app/learn/${s.id}`)}
                  className="w-full flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/40 p-3 hover:bg-slate-900 transition text-left"
                >
                  <div className="w-9 h-9 rounded-lg bg-violet-500/20 flex items-center justify-center shrink-0">
                    <GraduationCap className="w-4 h-4 text-violet-300" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">
                      {s.title}
                    </div>
                    <div className="text-xs text-slate-500">
                      {new Date(s.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        accent
          ? "border-violet-500/40 bg-violet-500/5"
          : "border-slate-800 bg-slate-900/40"
      }`}
    >
      <div className="flex items-center gap-2 text-xs text-slate-500">
        {icon}
        {label}
      </div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
}

function QuickAction({
  icon,
  title,
  subtitle,
  onClick,
  accent,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
  accent?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${
        accent
          ? "border-violet-500/40 bg-violet-500/5 hover:bg-violet-500/10"
          : "border-slate-800 bg-slate-900/40 hover:bg-slate-900"
      }`}
    >
      <div className="w-10 h-10 rounded-lg bg-slate-950 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-slate-500 truncate">{subtitle}</div>
      </div>
    </button>
  );
}