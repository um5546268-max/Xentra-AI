"use client";

import { Star, Clock, Flame, Crown } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { GamificationStats } from "@/lib/gamification";

export function HeroSection({
  stats,
  studyMinutesToday = 60,
}: {
  stats: GamificationStats | null;
  studyMinutesToday?: number;
}) {
  const { user } = useAuth();
  const firstName = user?.full_name?.split(" ")[0] || "there";
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";

  const formatStudyTime = (mins: number) => {
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-800 bg-gradient-to-br from-slate-900 via-violet-950/30 to-cyan-950/20">
      <div className="grid grid-cols-2 gap-4 p-6">
        {/* Left — greeting + stats */}
        <div className="space-y-5">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              {greeting}, {firstName}! ☀️
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Small steps every day lead to big success.
            </p>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <HeroStat
              icon={<Star className="w-4 h-4 text-amber-400" />}
              label="Total Points"
              value={stats?.points?.toLocaleString() ?? "0"}
            />
            <HeroStat
              icon={<Clock className="w-4 h-4 text-cyan-400" />}
              label="Today's Study"
              value={formatStudyTime(studyMinutesToday)}
            />
            <HeroStat
              icon={<Flame className="w-4 h-4 text-orange-400" />}
              label="Current Streak"
              value={`${stats?.streak_days ?? 0} Days`}
            />
            <HeroStat
              icon={<Crown className="w-4 h-4 text-violet-400" />}
              label="Level"
              value={`Level ${stats?.level ?? 1}`}
            />
          </div>
        </div>

        {/* Right — quote panel */}
        <div className="flex items-center justify-end">
          <div className="rounded-xl border border-slate-800/60 bg-slate-950/40 backdrop-blur p-4 max-w-[260px]">
            <p className="text-sm italic text-slate-300 leading-relaxed">
              &ldquo;Discipline today builds the freedom of tomorrow.&rdquo;
            </p>
            <div className="flex items-center gap-2 mt-3 text-[10px] text-slate-500">
              <span className="w-4 h-4 rounded bg-gradient-to-br from-violet-500 to-cyan-500" />
              Xentra AI
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroStat({
  icon, label, value,
}: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 uppercase tracking-wider">
        {icon}
        {label}
      </div>
      <div className="text-lg font-semibold mt-1.5">{value}</div>
    </div>
  );
}