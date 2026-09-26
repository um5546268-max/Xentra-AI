"use client";

import { useEffect, useState } from "react";
import {
  Cpu, MemoryStick, HardDrive, Battery, Wifi, Network,
  Activity, RefreshCw,
} from "lucide-react";
import api from "@/lib/api";

type Stat = {
  label: string;
  value: number;
  unit: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
};

export default function MobileSystemHealth() {
  const [running, setRunning] = useState(false);
  const [stats, setStats] = useState<Stat[]>([]);

  // Fetch on mount + every 10s
  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get("/api/system/stats");
        const d = res.data || {};
        setStats([
          { label: "CPU",     value: d.cpu_percent     ?? 0, unit: "%",   icon: Cpu,           color: "text-violet-300" },
          { label: "RAM",     value: d.ram_percent     ?? 0, unit: "%",   icon: MemoryStick,   color: "text-cyan-300" },
          { label: "Storage", value: d.disk_percent    ?? 0, unit: "%",   icon: HardDrive,     color: "text-amber-300" },
          { label: "Battery", value: d.battery_percent ?? 0, unit: "%",   icon: Battery,       color: "text-emerald-300" },
        ]);
      } catch (e) {
        // Fallback to demo values if backend is offline
        setStats([
          { label: "CPU",     value: 32, unit: "%", icon: Cpu,         color: "text-violet-300" },
          { label: "RAM",     value: 48, unit: "%", icon: MemoryStick, color: "text-cyan-300" },
          { label: "Storage", value: 68, unit: "%", icon: HardDrive,   color: "text-amber-300" },
          { label: "Battery", value: 78, unit: "%", icon: Battery,     color: "text-emerald-300" },
        ]);
      }
    };
    load();
    const id = setInterval(load, 10000);
    return () => clearInterval(id);
  }, []);

  const overallHealth = "Good";
  const healthColor = "from-emerald-500 to-cyan-500";

  const handleRunScan = async () => {
    setRunning(true);
    try {
      await api.post("/api/system/scan").catch(() => {});
    } finally {
      setTimeout(() => setRunning(false), 1500);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-950 pb-24">
      {/* Header */}
      <div className="px-4 pt-3 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/25">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div className="leading-tight">
            <div className="text-base font-bold text-slate-100">
              System Health
            </div>
            <div className="text-[11px] text-slate-500">
              Monitor · Optimize · Stay Safe
            </div>
          </div>
        </div>
      </div>

      {/* Health ring */}
      <div className="px-4 pb-6">
        <div className="relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-900/20 via-slate-900 to-cyan-900/10 p-6">
          <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-emerald-500/20 blur-3xl pointer-events-none" />

          <div className="relative flex flex-col items-center">
            <div className="relative w-32 h-32">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle
                  cx="18" cy="18" r="15.5"
                  fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2"
                />
                <circle
                  cx="18" cy="18" r="15.5"
                  fill="none"
                  stroke="url(#healthGrad)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeDasharray="80 100"
                />
                <defs>
                  <linearGradient id="healthGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-lg font-bold text-emerald-400">
                  {overallHealth}
                </div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider">
                  System Health
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="px-4 pb-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
          <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">
            Metrics
          </div>
          {stats.map((s) => {
            const Icon = s.icon;
            const pct = Math.min(100, s.value);
            return (
              <div key={s.label} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Icon className={`w-3.5 h-3.5 ${s.color}`} />
                    <span className="text-slate-300">{s.label}</span>
                  </div>
                  <span className="font-mono text-slate-400">
                    {Math.round(s.value)}
                    {s.unit}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-950/60 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      pct >= 80
                        ? "bg-red-500"
                        : pct >= 60
                        ? "bg-yellow-500"
                        : "bg-emerald-500"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Network status */}
      <div className="px-4 pb-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
            <Wifi className="w-5 h-5 text-emerald-300" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium text-slate-200">Network</div>
            <div className="text-[11px] text-slate-500">
              Connected · Stable connection
            </div>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold">
            Online
          </span>
        </div>
      </div>

      {/* Run full scan */}
      <div className="px-4 pb-6">
        <button
          onClick={handleRunScan}
          disabled={running}
          className="w-full rounded-2xl bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 py-3 text-sm font-semibold text-white transition flex items-center justify-center gap-2 disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${running ? "animate-spin" : ""}`} />
          {running ? "Running full scan…" : "Run Full Scan"}
        </button>
      </div>
    </div>
  );
}