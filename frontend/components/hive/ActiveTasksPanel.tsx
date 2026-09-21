"use client";

import { useEffect, useState } from "react";
import { BEE_STYLE, BeeTask, listBeeTasks, stopBee } from "@/lib/bees";
import { BeeIcon } from "./BeeIcon";
import { Pause, X } from "lucide-react";

export function ActiveTasksPanel() {
  const [tasks, setTasks] = useState<BeeTask[]>([]);

  const load = async () => {
    try { setTasks(await listBeeTasks(true)); } catch {}
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 4000);
    return () => clearInterval(id);
  }, []);

  const handleStop = async (id: string) => {
    await stopBee(id);
    load();
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">⚙️</span>
          <span className="text-sm font-semibold text-slate-200">Active Tasks</span>
        </div>
        <a href="/tasks" className="text-xs text-cyan-400 hover:text-cyan-300">View All</a>
      </div>

      <div className="space-y-2">
        {tasks.length === 0 && (
          <div className="text-xs text-slate-500 text-center py-4">No active Bees</div>
        )}
        {tasks.map((t) => {
          const style = BEE_STYLE[t.bee_type];
          return (
            <div key={t.id}
              className="flex items-center gap-3 p-2 rounded-lg bg-slate-900/40 border border-slate-800">
              <BeeIcon type={t.bee_type} size={36} />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-slate-200 truncate">{t.title}</div>
                <div className="text-[10px] text-slate-500">{style.label}</div>
                <div className="mt-1 h-1 rounded bg-slate-800 overflow-hidden">
                  <div className="h-full rounded transition-all"
                    style={{ width: `${t.progress}%`, background: style.color }} />
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-[10px] text-slate-500">{t.progress}%</span>
                <div className="flex gap-1">
                  <button className="p-1 rounded hover:bg-slate-800 text-slate-400">
                    <Pause className="w-3 h-3" />
                  </button>
                  <button onClick={() => handleStop(t.id)}
                    className="p-1 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-300">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}