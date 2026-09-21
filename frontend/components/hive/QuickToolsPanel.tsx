"use client";

import { HardDrive, Trash2, Zap, RefreshCw } from "lucide-react";

const TOOLS = [
  { icon: HardDrive, label: "PC Health" },
  { icon: Trash2, label: "Clean Junk" },
  { icon: Zap, label: "Speed Up" },
  { icon: RefreshCw, label: "Update" },
];

export function QuickToolsPanel() {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">⚙️</span>
        <span className="text-sm font-semibold text-slate-200">Quick Tools</span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {TOOLS.map((t) => (
          <button key={t.label}
            className="flex flex-col items-center gap-1.5 p-2 rounded-lg bg-slate-900/50 hover:bg-slate-800/60 border border-slate-800 transition">
            <t.icon className="w-4 h-4 text-cyan-400" />
            <span className="text-[10px] text-slate-400 text-center">{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}