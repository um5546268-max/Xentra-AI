"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Target, ChevronRight, Loader2 } from "lucide-react";
import { Goal, listGoals } from "@/lib/goals";

export function GoalsWidget() {
  const router = useRouter();
  const [goals, setGoals] = useState<Goal[] | null>(null);

  useEffect(() => {
    listGoals().then((g) => setGoals(g.slice(0, 4))).catch(() => setGoals([]));
  }, []);

  if (goals === null) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
        <span className="text-xs text-slate-500">Loading goals…</span>
      </div>
    );
  }

  if (goals.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-2">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
          <Target className="w-3.5 h-3.5" />
          Your Goals
        </div>
        <p className="text-[11px] text-slate-600">
          No goals yet. Set one to stay focused.
        </p>
        <button
          onClick={() => router.push("/app/goals")}
          className="text-[11px] text-violet-400 hover:text-violet-300"
        >
          Create your first goal →
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
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

      <div className="space-y-2.5">
        {goals.map((g) => {
          const pct = g.target > 0 ? Math.min(100, (g.current / g.target) * 100) : 0;
          return (
            <div key={g.id} className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className={`truncate ${g.completed ? "line-through text-slate-600" : "text-slate-300"}`}>
                  {g.completed && "✓ "}{g.title}
                </span>
                <span className="font-mono text-slate-500 ml-2 shrink-0">
                  {Math.round(pct)}%
                </span>
              </div>
              <div className="h-1 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    g.completed ? "bg-emerald-500" : "bg-gradient-to-r from-violet-500 to-cyan-500"
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}