"use client";

import { BeeTask, BEE_STYLE } from "@/lib/bees";
import { BeeIcon } from "./BeeIcon";
import { Globe, ShoppingBag, FileText } from "lucide-react";

export function BeesWorkingCard({
  tasks, taskId = "#T-2026001", eta = "2-3 mins",
}: {
  tasks: BeeTask[];
  taskId?: string;
  eta?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">🐝</span>
        <span className="text-sm font-semibold text-slate-200">
          Bees are working on your task…
        </span>
      </div>

      <div className="grid md:grid-cols-[1fr_auto] gap-4">
        <div className="space-y-2">
          {tasks.map((t) => {
            const s = BEE_STYLE[t.bee_type];
            const Icon =
              t.bee_type === "web" ? Globe :
              t.bee_type === "shopping" ? ShoppingBag : FileText;
            return (
              <div key={t.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/40 border border-slate-800">
                <BeeIcon type={t.bee_type} size={38} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-200">{s.label}</span>
                    <span className="text-[10px] text-slate-500">{t.title}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 rounded bg-slate-800 overflow-hidden">
                    <div className="h-full rounded transition-all"
                      style={{ width: `${t.progress}%`, background: s.color }} />
                  </div>
                </div>
                <span className="text-xs font-mono text-slate-400">{t.progress}%</span>
                <Icon className="w-4 h-4 text-slate-500" />
              </div>
            );
          })}
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3 w-full md:w-40 text-center">
          <div className="text-[10px] text-slate-500">Task ID</div>
          <div className="text-xs font-mono text-cyan-400 mb-2">{taskId}</div>
          <div className="text-[10px] text-slate-500">Estimated Time</div>
          <div className="text-xs text-slate-200">{eta}</div>
        </div>
      </div>
    </div>
  );
}