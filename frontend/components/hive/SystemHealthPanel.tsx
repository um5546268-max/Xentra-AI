"use client";

import { Cpu, HardDrive, Battery, Wifi, MemoryStick } from "lucide-react";

export function SystemHealthPanel({ score = 87 }: { score?: number }) {
  const items = [
    { icon: Cpu, label: "CPU", value: "48°C" },
    { icon: MemoryStick, label: "RAM", value: "62%" },
    { icon: HardDrive, label: "Storage", value: "68%" },
    { icon: Battery, label: "Battery", value: "84%" },
    { icon: Wifi, label: "Network", value: "Excellent" },
  ];

  const circumference = 2 * Math.PI * 32;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">⚙️</span>
          <span className="text-sm font-semibold text-slate-200">System Health</span>
        </div>
        <a href="/system" className="text-xs text-cyan-400 hover:text-cyan-300">Check Now</a>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative w-24 h-24">
          <svg className="w-24 h-24 -rotate-90">
            <circle cx="48" cy="48" r="32" fill="none" stroke="#1e293b" strokeWidth="6" />
            <circle cx="48" cy="48" r="32" fill="none" stroke="#22d3ee" strokeWidth="6"
              strokeDasharray={circumference} strokeDashoffset={offset}
              strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-slate-100">{score}</span>
            <span className="text-[10px] text-slate-500">/ 100</span>
          </div>
        </div>

        <div className="flex-1 space-y-1.5">
          {items.map((it) => (
            <div key={it.label} className="flex items-center gap-2 text-xs">
              <it.icon className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-slate-400 flex-1">{it.label}</span>
              <span className="text-slate-200 font-mono">{it.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}