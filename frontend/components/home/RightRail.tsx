"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight, Star, Flame, Trophy, Target, CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { GamificationStats } from "@/lib/gamification";
import { Goal, listGoals } from "@/lib/goals";

export function RightRail({ stats }: { stats: GamificationStats | null }) {
  const router = useRouter();
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);

  useEffect(() => {
    listGoals().then((g) => setGoals(g.slice(0, 3))).catch(() => {});
  }, []);

  const initials = (user?.full_name || user?.email || "U")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // Week activity (mock — replace with real streak data)
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const today = new Date().getDay(); // 0=Sun, 1=Mon...
  const streakDays = stats?.streak_days ?? 0;

  return (
    <div className="w-80 shrink-0 border-l border-slate-800 bg-slate-950/60 overflow-y-auto p-4 space-y-4">
      {/* Profile card */}
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-sm font-bold text-white">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate">
              {user?.full_name || "Student"}
            </div>
            <div className="text-[11px] text-slate-500">Student</div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-600" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] text-slate-500">
            <span>Level {stats?.level ?? 1} — Learner</span>
            <span className="font-mono">
              {stats?.xp_in_level ?? 0} / {stats?.xp_to_next ?? 1000} XP
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-cyan-500 transition-all"
              style={{
                width: `${Math.min(
                  100,
                  ((stats?.xp_in_level ?? 0) / (stats?.xp_to_next ?? 1000)) * 100,
                )}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Points card */}
      <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-500/5 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star className="w-6 h-6 text-amber-400" />
            <div>
              <div className="text-2xl font-bold text-amber-300">
                {stats?.points?.toLocaleString() ?? "0"}
              </div>
              <div className="text-[10px] text-amber-400/70 uppercase tracking-wider">
                Total Points
              </div>
            </div>
          </div>
          <button className="text-[11px] rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-amber-300 hover:bg-amber-500/20">
            Redeem
          </button>
        </div>
      </div>

      {/* Streak card */}
      <div className="rounded-2xl border border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-red-500/5 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-400" />
          <div className="flex-1">
            <div className="text-sm font-semibold">
              {streakDays} Day Streak
            </div>
            <div className="text-[10px] text-orange-400/70">
              Keep going!
            </div>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((d, i) => {
            const isActive = i < streakDays;
            return (
              <div key={d} className="text-center">
                <div className="text-[9px] text-slate-500 mb-1">{d}</div>
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center mx-auto ${
                    isActive
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-800 text-slate-600"
                  }`}
                >
                  {isActive && <CheckCircle2 className="w-3 h-3" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Goals card */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
            <Target className="w-3.5 h-3.5" />
            Your Goals
          </div>
          <button
            onClick={() => router.push("/app/goals")}
            className="text-[10px] text-violet-400 hover:text-violet-300 flex items-center gap-0.5"
          >
            Edit <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        {goals.length === 0 ? (
          <button
            onClick={() => router.push("/app/goals")}
            className="text-[11px] text-violet-400 hover:text-violet-300"
          >
            Create your first goal →
          </button>
        ) : (
          <div className="space-y-3">
            {goals.map((g) => {
              const pct = g.target > 0 ? Math.min(100, (g.current / g.target) * 100) : 0;
              return (
                <div key={g.id} className="space-y-1">
                  <div className="flex items-center gap-2 text-[11px]">
                    {g.completed ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                    ) : (
                      <span className="w-3 h-3 rounded border border-slate-600 shrink-0" />
                    )}
                    <span className={`flex-1 truncate ${g.completed ? "line-through text-slate-600" : "text-slate-300"}`}>
                      {g.title}
                    </span>
                    <span className="font-mono text-slate-500">{Math.round(pct)}%</span>
                  </div>
                  <div className="h-1 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full ${
                        g.completed ? "bg-emerald-500" : "bg-gradient-to-r from-violet-500 to-cyan-500"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Daily Challenge */}
      <div className="rounded-2xl border border-amber-500/40 bg-gradient-to-br from-amber-500/10 to-orange-500/5 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-400" />
          <div className="text-sm font-semibold">Daily Challenge</div>
        </div>
        <div className="text-[11px] text-slate-400">
          Answer 5 questions correctly in any subject.
        </div>
        <div className="space-y-1">
          <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
            <div className="h-full bg-amber-500" style={{ width: "40%" }} />
          </div>
          <div className="text-right text-[10px] text-slate-500 font-mono">2 / 5</div>
        </div>
        <button
          onClick={() => router.push("/app/learn/practice")}
          className="w-full rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 py-2 text-xs font-medium text-white transition flex items-center justify-center gap-1.5"
        >
          Start Challenge <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      {/* Quote */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 text-center">
        <p className="text-xs italic text-slate-400 leading-relaxed">
          &ldquo;Learning is not a destination, it&apos;s a superpower.&rdquo;
        </p>
        <div className="text-[10px] text-slate-600 mt-2">— Xentra AI</div>
      </div>
    </div>
  );
}