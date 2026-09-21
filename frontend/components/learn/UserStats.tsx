"use client";

import { useEffect, useState } from "react";
import { Flame, Star, Trophy } from "lucide-react";
import { getGamificationStats, GamificationStats } from "@/lib/gamification";
import { useAuth } from "@/lib/auth";

export function UserStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<GamificationStats | null>(null);

  // Load stats once, then refresh every 15 seconds so points appear live
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const load = async () => {
      try {
        const s = await getGamificationStats();
        if (!cancelled) setStats(s);
      } catch {
        // silent
      }
    };

    load();
    const id = setInterval(load, 15000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [user]);

  if (!user || !stats) return null;

  const progress =
    stats.xp_to_next > 0
      ? Math.min(100, (stats.xp_in_level / stats.xp_to_next) * 100)
      : 0;

  return (
    <div className="border-b border-slate-800 shrink-0">
      <div className="px-3 py-3 space-y-2">
        {/* Row 1 — points + streak */}
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/60 px-2.5 py-1.5">
            <Star className="w-3.5 h-3.5 text-yellow-400" />
            <span className="text-sm font-semibold">{stats.points}</span>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider ml-auto">
              pts
            </span>
          </div>
          <div className="flex-1 flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/60 px-2.5 py-1.5">
            <Flame
              className={`w-3.5 h-3.5 ${
                stats.streak_days > 0 ? "text-orange-400" : "text-slate-600"
              }`}
            />
            <span className="text-sm font-semibold">{stats.streak_days}</span>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider ml-auto">
              day{stats.streak_days === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        {/* Row 2 — level + XP bar */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs">
            <Trophy className="w-3 h-3 text-violet-400" />
            <span className="text-slate-400">Level {stats.level}</span>
            <span className="ml-auto font-mono text-[10px] text-slate-500">
              {stats.xp_in_level}/{stats.xp_to_next}
            </span>
          </div>
          <div className="h-1 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-cyan-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}