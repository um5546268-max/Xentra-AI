"use client";

import { useEffect, useRef, useState } from "react";
import {
  Cpu, MemoryStick, Battery, BatteryCharging, Wifi, X, Activity,
} from "lucide-react";
import { useRouter } from "next/navigation";

type Stats = {
  cpu: number;         // 0-100
  ram: number;         // 0-100
  battery: number | null;    // 0-100 or null if unknown
  charging: boolean;
  online: boolean;
  cores: number;
  memoryGB: number;
};

export default function SystemStatsWidget() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [showPanel, setShowPanel] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // ─── Browser-level metrics (works everywhere) ───
  useEffect(() => {
    let cancelled = false;

    const update = async () => {
      if (cancelled) return;

      const cores = navigator.hardwareConcurrency || 4;
      const memGB = (navigator as any).deviceMemory || 8;

      // RAM (approximate from JS heap if available)
      let ramPct = 0;
      const perf = performance as any;
      if (perf.memory) {
        ramPct = Math.round(
          (perf.memory.usedJSHeapSize / perf.memory.jsHeapSizeLimit) * 100
        );
      }

      // CPU — approximate via frame timing
      let cpuPct = 0;
      const t0 = performance.now();
      await new Promise((r) => requestAnimationFrame(r));
      const frameTime = performance.now() - t0;
      // 16.67ms = 60fps. Beyond that, we assume load.
      cpuPct = Math.min(100, Math.max(0, Math.round((frameTime / 16.67) * 30)));

      // Battery
      let batteryPct: number | null = null;
      let charging = false;
      try {
        const nav = navigator as any;
        if (nav.getBattery) {
          const b = await nav.getBattery();
          batteryPct = Math.round(b.level * 100);
          charging = b.charging;
        }
      } catch {}

      if (!cancelled) {
        setStats({
          cpu: cpuPct,
          ram: ramPct,
          battery: batteryPct,
          charging,
          online: navigator.onLine,
          cores,
          memoryGB: memGB,
        });
      }
    };

    update();
    const id = setInterval(update, 3000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // Close panel on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setShowPanel(false);
      }
    };
    if (showPanel) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [showPanel]);

  if (!stats) return null;

  // Simple load indicator: 1-4 bars based on CPU
  const bars = Math.max(1, Math.min(4, Math.ceil(stats.cpu / 25)));
  const barColor =
    stats.cpu > 75
      ? "bg-red-400"
      : stats.cpu > 50
      ? "bg-amber-400"
      : "bg-emerald-400";

  return (
    <>
      <button
        onClick={() => setShowPanel((v) => !v)}
        className="flex items-center gap-1.5 rounded-md px-2 py-1 hover:bg-slate-800 transition text-slate-400 hover:text-slate-200"
        title="System status"
      >
        {/* Signal bars */}
        <div className="flex items-end gap-0.5">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`w-0.5 rounded-sm transition-colors ${
                i <= bars ? barColor : "bg-slate-700"
              }`}
              style={{ height: `${4 + i * 2}px` }}
            />
          ))}
        </div>
        <span className="text-[10px] tabular-nums">
          {stats.cpu}%
        </span>
      </button>

      {showPanel && (
        <div
          ref={panelRef}
          className="absolute bottom-full right-0 mb-2 w-72 rounded-xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden z-50"
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-violet-400" />
              <span className="text-xs font-semibold text-slate-200">
                System Status
              </span>
            </div>
            <button
              onClick={() => setShowPanel(false)}
              className="text-slate-500 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-3 space-y-2">
            <StatRow
              icon={<Cpu className="w-3.5 h-3.5" />}
              label="CPU load"
              value={`${stats.cpu}%`}
              pct={stats.cpu}
              detail={`${stats.cores} cores`}
            />
            <StatRow
              icon={<MemoryStick className="w-3.5 h-3.5" />}
              label="Memory"
              value={stats.ram > 0 ? `${stats.ram}%` : "N/A"}
              pct={stats.ram}
              detail={`~${stats.memoryGB} GB`}
            />
            {stats.battery !== null ? (
              <StatRow
                icon={
                  stats.charging ? (
                    <BatteryCharging className="w-3.5 h-3.5" />
                  ) : (
                    <Battery className="w-3.5 h-3.5" />
                  )
                }
                label="Battery"
                value={`${stats.battery}%`}
                pct={stats.battery}
                detail={stats.charging ? "Charging" : "On battery"}
              />
            ) : (
              <div className="flex items-center gap-2 text-xs text-slate-500 px-1">
                <Battery className="w-3.5 h-3.5" />
                Battery API not available
              </div>
            )}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Wifi className="w-3.5 h-3.5" />
                <span>Connection</span>
              </div>
              <span
                className={`text-xs font-medium ${
                  stats.online ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {stats.online ? "Online" : "Offline"}
              </span>
            </div>
          </div>

          <div className="border-t border-slate-800 p-2">
            <button
              onClick={() => {
                setShowPanel(false);
                router.push("/app/system-health");
              }}
              className="w-full rounded-lg bg-slate-800 hover:bg-slate-700 transition py-1.5 text-xs font-medium text-slate-200"
            >
              View detailed System Health →
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function StatRow({
  icon,
  label,
  value,
  pct,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  pct: number;
  detail?: string;
}) {
  const barColor =
    pct > 75 ? "bg-red-500" : pct > 50 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="rounded-lg bg-slate-950/50 p-2">
      <div className="flex items-center justify-between text-[11px] mb-1">
        <div className="flex items-center gap-1.5 text-slate-400">
          {icon}
          <span>{label}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {detail && <span className="text-slate-600">{detail}</span>}
          <span className="text-slate-300 font-mono">{value}</span>
        </div>
      </div>
      <div className="h-1 rounded-full bg-slate-800 overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}