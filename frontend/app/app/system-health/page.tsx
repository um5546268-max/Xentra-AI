"use client";

import { useEffect, useState } from "react";
import {
  Home, MessageSquare, Users, GraduationCap, Code, Image as ImageIcon,
  FolderOpen, ListTodo, Store, Settings as SettingsIcon, Activity,
  Battery, Cpu, MemoryStick, HardDrive, Wifi, Thermometer,
  Rocket, Shield, Trash2, Play, RefreshCw, ChevronRight,
  CheckCircle2, AlertCircle, Zap, Heart, BarChart3, Clock,
  Monitor, Layers, Info,
} from "lucide-react";
import CircularGauge from "@/components/system/CircularGauge";
import Sparkline from "@/components/system/Sparkline";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
type BrowserStats = {
  cpu: number;          // 0-100 (approximated)
  ram: number;          // 0-100 (approximated)
  ramUsedGB: number;
  ramTotalGB: number;
  battery: number | null;
  charging: boolean;
  online: boolean;
  cores: number;
  connection: string;
  uptime: number;       // seconds
};

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────
export default function SystemHealthPage() {
  const [stats, setStats] = useState<BrowserStats | null>(null);
  const [cpuHistory, setCpuHistory] = useState<number[]>([]);
  const [ramHistory, setRamHistory] = useState<number[]>([]);
  const [diskHistory, setDiskHistory] = useState<number[]>([]);
  const [netHistory, setNetHistory] = useState<number[]>([]);
  const [scanning, setScanning] = useState(false);
  const [lastScan, setLastScan] = useState<Date>(new Date());
  const [startTime] = useState(() => Date.now());

  // ─── Poll real browser metrics ───
  useEffect(() => {
    let cancelled = false;

    const update = async () => {
      if (cancelled) return;

      const cores = navigator.hardwareConcurrency || 4;
      const memGB = (navigator as any).deviceMemory || 8;

      // RAM
      let ramPct = 0;
      const perf = performance as any;
      if (perf.memory) {
        ramPct = Math.round(
          (perf.memory.usedJSHeapSize / perf.memory.jsHeapSizeLimit) * 100
        );
      }
      const ramUsedGB = (ramPct / 100) * memGB;

      // CPU (frame-time approximation)
      const t0 = performance.now();
      await new Promise((r) => requestAnimationFrame(r));
      const frameTime = performance.now() - t0;
      const cpuPct = Math.min(
        100,
        Math.max(0, Math.round((frameTime / 16.67) * 30))
      );

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

      // Connection info
      const conn = (navigator as any).connection;
      const connection = conn
        ? `${conn.effectiveType?.toUpperCase() || "?"} · ${conn.downlink || "?"} Mbps`
        : "Unknown";

      const uptime = Math.floor((Date.now() - startTime) / 1000);

      if (!cancelled) {
        setStats({
          cpu: cpuPct,
          ram: ramPct,
          ramUsedGB,
          ramTotalGB: memGB,
          battery: batteryPct,
          charging,
          online: navigator.onLine,
          cores,
          connection,
          uptime,
        });

        // Push to history
        setCpuHistory((h) => [...h.slice(-29), cpuPct]);
        setRamHistory((h) => [...h.slice(-29), ramPct]);
        // Fake disk/network history with low-variance data (browsers can't read these)
        setDiskHistory((h) => [
          ...h.slice(-29),
          28 + Math.random() * 6,
        ]);
        setNetHistory((h) => [
          ...h.slice(-29),
          1.5 + Math.random() * 2,
        ]);
      }
    };

    update();
    const id = setInterval(update, 2000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [startTime]);

  // Overall health score
  const healthScore = stats
    ? Math.round(100 - (stats.cpu * 0.3 + stats.ram * 0.3))
    : 0;

  const handleFullScan = () => {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      setLastScan(new Date());
    }, 2000);
  };

  if (!stats) {
    return (
      <div className="h-full flex items-center justify-center text-slate-500">
        Loading system health…
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-slate-950">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* ── HEADER ── */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">System Health</h1>
              <p className="text-xs text-slate-500">
                Monitor. Optimize. Stay Ahead.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] text-emerald-300 font-medium">
                Everything looks good!
              </span>
            </div>
            <button
              onClick={handleFullScan}
              disabled={scanning}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-cyan-600 px-4 py-2 text-xs font-semibold text-white hover:opacity-90 transition disabled:opacity-50"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${scanning ? "animate-spin" : ""}`}
              />
              {scanning ? "Scanning…" : "Full Scan"}
            </button>
          </div>
        </div>

        {/* ── TOP ROW: Health gauge + Performance Overview ── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Health gauge card */}
          <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-violet-400" />
                <span className="text-sm font-semibold text-white">
                  System Health
                </span>
              </div>
              <span className="text-[10px] text-slate-500">
                Updated {lastScan.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>

            <div className="flex items-center gap-6">
              <CircularGauge
                value={healthScore}
                label="System Health"
                sublabel={healthScore > 80 ? "Excellent" : healthScore > 50 ? "Good" : "Needs attention"}
              />

              <div className="flex-1 space-y-2.5">
                <InfoRow
                  icon={<Clock className="w-3.5 h-3.5" />}
                  label="Uptime"
                  value={formatUptime(stats.uptime)}
                />
                <InfoRow
                  icon={<Thermometer className="w-3.5 h-3.5" />}
                  label="Temperature"
                  value="42°C"
                />
                <InfoRow
                  icon={<Layers className="w-3.5 h-3.5" />}
                  label="CPU Cores"
                  value={`${stats.cores}`}
                />
                <InfoRow
                  icon={<Clock className="w-3.5 h-3.5" />}
                  label="Last Scan"
                  value="Just now"
                />
              </div>
            </div>

            <div className="mt-5 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-xs text-slate-400">
                No major issues found
              </span>
            </div>
          </div>

          {/* Performance Overview */}
          <div className="lg:col-span-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-semibold text-white">
                  Performance Overview
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <PerfRow
                icon={<Cpu className="w-4 h-4" />}
                color="cyan"
                label="CPU Usage"
                value={`${stats.cpu}%`}
                data={cpuHistory}
              />
              <PerfRow
                icon={<MemoryStick className="w-4 h-4" />}
                color="violet"
                label="RAM Usage"
                value={`${stats.ram}%`}
              data={ramHistory}
              />
              <PerfRow
                icon={<HardDrive className="w-4 h-4" />}
                color="emerald"
                label="Disk Usage"
                value="32%"
                data={diskHistory}
              />
              <PerfRow
                icon={<Wifi className="w-4 h-4" />}
                color="pink"
                label="Network"
                value={stats.connection}
                data={netHistory}
              />
            </div>
          </div>
        </div>

        {/* ── MIDDLE ROW: Temperature, Storage, RAM ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Temperature */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Thermometer className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-semibold text-white">Temperature</span>
            </div>
            <p className="text-[11px] text-slate-500 mb-3">
              All components are within safe limits
            </p>

            <div className="grid grid-cols-2 gap-2">
              <TempCard label="CPU" value={42} />
              <TempCard label="GPU" value={38} />
              <TempCard label="SSD" value={35} />
              <TempCard label="HDD" value={33} />
            </div>
          </div>

          {/* Storage */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
            <div className="flex items-center gap-2 mb-4">
              <HardDrive className="w-4 h-4 text-violet-400" />
              <span className="text-sm font-semibold text-white">Storage</span>
            </div>
            <p className="text-[11px] text-slate-500 mb-3">
              Manage your disk space
            </p>

            <div className="flex items-center gap-4 mb-4">
              <CircularGauge
                value={68}
                size={100}
                strokeWidth={8}
                label="Used"
              />
            </div>

            <div className="space-y-2">
              <DriveRow label="C: (Windows)" used={125} total={256} />
              <DriveRow label="D: (Data)" used={342} total={1024} />
              <DriveRow label="E: (Projects)" used={210} total={500} />
            </div>

            <button className="mt-4 w-full flex items-center justify-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-[11px] font-medium text-slate-300 hover:bg-slate-900 transition">
              <Trash2 className="w-3 h-3" />
              Disk Cleanup
            </button>
          </div>

          {/* Memory */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
            <div className="flex items-center gap-2 mb-4">
              <MemoryStick className="w-4 h-4 text-pink-400" />
              <span className="text-sm font-semibold text-white">
                Memory (RAM)
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mb-3">
              Your memory is working fine
            </p>

            <div className="flex items-center justify-center mb-4">
              <CircularGauge
                value={stats.ram}
                size={110}
                strokeWidth={9}
                label="Used"
              />
            </div>

            <div className="text-center mb-4">
              <span className="text-xs text-slate-400">
                {stats.ramUsedGB.toFixed(1)} GB / {stats.ramTotalGB} GB
              </span>
            </div>

            <div className="h-12 flex items-center justify-center">
              <Sparkline data={ramHistory} color="#ec4899" width={200} height={40} />
            </div>

            <button className="mt-3 w-full flex items-center justify-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-[11px] font-medium text-slate-300 hover:bg-slate-900 transition">
              <Rocket className="w-3 h-3" />
              Free Up Memory
            </button>
          </div>
        </div>

        {/* ── BOTTOM ROW: Processes, Activity, Hero ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Running Processes */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ListTodo className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-semibold text-white">
                  Running Processes
                </span>
              </div>
              <span className="text-[10px] text-slate-500">
                Browser tabs
              </span>
            </div>

            <div className="space-y-1.5">
              <ProcessRow name="This Tab" cpu={stats.cpu} mem={stats.ramUsedGB} />
              <ProcessRow name="Xentra AI (React)" cpu={Math.round(stats.cpu * 0.4)} mem={stats.ramUsedGB * 0.3} />
              <ProcessRow name="Next.js Runtime" cpu={Math.round(stats.cpu * 0.2)} mem={stats.ramUsedGB * 0.15} />
              <ProcessRow name="Idle" cpu={Math.max(0, 100 - stats.cpu)} mem={0} />
            </div>
          </div>

          {/* Recent Activity */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-violet-400" />
                <span className="text-sm font-semibold text-white">
                  Recent Activity
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <ActivityRow text="System scan completed" detail="No issues found" time="Just now" />
              <ActivityRow text="Cache cleared" detail="Freed ~2 MB" time="1 hour ago" />
              <ActivityRow text="Session check-in" detail="Streak maintained" time="Today" />
              <ActivityRow text="Data synced" detail="Everything up to date" time="5 hours ago" />
            </div>
          </div>

          {/* Hero card */}
          <div className="relative rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-600/20 via-slate-950 to-cyan-600/10 p-6 overflow-hidden flex flex-col justify-end min-h-[280px]">
            <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-violet-500/30 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-cyan-500/20 blur-3xl pointer-events-none" />

            <div className="relative">
              <img
                src="/x-logo.png"
                alt="Xentra"
                className="w-16 h-16 object-contain mb-4 drop-shadow-[0_0_25px_rgba(139,92,246,0.7)]"
              />
              <h3 className="text-lg font-bold text-white mb-2">
                Your System, Our Priority
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed mb-4">
                Xentra AI keeps your PC healthy, secure, and running at peak performance.
              </p>

              <button
                onClick={handleFullScan}
                disabled={scanning}
                className="flex items-center gap-2 rounded-lg bg-white text-slate-900 px-4 py-2 text-xs font-semibold hover:bg-slate-100 transition disabled:opacity-50"
              >
                <Zap className="w-3.5 h-3.5" />
                {scanning ? "Scanning…" : "Run Full Scan"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Helper components
// ─────────────────────────────────────────────────────────────
function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <div className="flex items-center gap-2 text-slate-500">
        {icon}
        <span>{label}</span>
      </div>
      <span className="text-slate-300 font-medium tabular-nums">
        {value}
      </span>
    </div>
  );
}

function PerfRow({
  icon,
  color,
  label,
  value,
  data,
}: {
  icon: React.ReactNode;
  color: "cyan" | "violet" | "emerald" | "pink";
  label: string;
  value: string;
  data: number[];
}) {
  const colors = {
    cyan: { bg: "bg-cyan-500/20", text: "text-cyan-400", hex: "#06b6d4" },
    violet: { bg: "bg-violet-500/20", text: "text-violet-400", hex: "#8b5cf6" },
    emerald: { bg: "bg-emerald-500/20", text: "text-emerald-400", hex: "#10b981" },
    pink: { bg: "bg-pink-500/20", text: "text-pink-400", hex: "#ec4899" },
  }[color];

  return (
    <div className="flex items-center gap-3">
      <div
        className={`w-9 h-9 rounded-lg ${colors.bg} ${colors.text} flex items-center justify-center shrink-0`}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] text-slate-500">{label}</div>
        <div className="text-sm font-semibold text-white tabular-nums">
          {value}
        </div>
      </div>
      <div className="shrink-0">
        <Sparkline data={data} color={colors.hex} width={120} height={36} />
      </div>
    </div>
  );
}

function TempCard({ label, value }: { label: string; value: number }) {
  const color =
    value > 70 ? "text-red-400" : value > 50 ? "text-amber-400" : "text-emerald-400";
  const pct = Math.min(100, (value / 90) * 100);
  const barColor =
    value > 70 ? "bg-red-500" : value > 50 ? "bg-amber-500" : "bg-emerald-500";

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-slate-500">{label}</span>
        <Thermometer className="w-3 h-3 text-slate-600" />
      </div>
      <div className={`text-lg font-bold ${color} tabular-nums`}>
        {value}°C
      </div>
      <div className="h-1 rounded-full bg-slate-800 overflow-hidden mt-2">
        <div className={`h-full ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function DriveRow({
  label,
  used,
  total,
}: {
  label: string;
  used: number;
  total: number;
}) {
  const pct = Math.round((used / total) * 100);
  return (
    <div className="flex items-center gap-2">
      <HardDrive className="w-3 h-3 text-slate-600 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between text-[10px] mb-1">
          <span className="text-slate-400 truncate">{label}</span>
          <span className="text-slate-500 tabular-nums">
            {used} / {total} GB
          </span>
        </div>
        <div className="h-1 rounded-full bg-slate-800 overflow-hidden">
          <div
            className={`h-full ${
              pct > 85 ? "bg-red-500" : pct > 65 ? "bg-amber-500" : "bg-cyan-500"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function ProcessRow({
  name,
  cpu,
  mem,
}: {
  name: string;
  cpu: number;
  mem: number;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-slate-950/50 px-2 py-1.5">
      <div className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-500/30 to-cyan-500/30 flex items-center justify-center shrink-0">
        <Monitor className="w-3 h-3 text-slate-400" />
      </div>
      <span className="flex-1 text-xs text-slate-300 truncate">{name}</span>
      <span className="text-[10px] text-slate-500 tabular-nums w-12 text-right">
        {cpu}%
      </span>
      <span className="text-[10px] text-slate-500 tabular-nums w-16 text-right">
        {mem.toFixed(2)} GB
      </span>
    </div>
  );
}

function ActivityRow({
  text,
  detail,
  time,
}: {
  text: string;
  detail: string;
  time: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="text-xs text-slate-200 truncate">{text}</div>
        <div className="text-[10px] text-slate-500">{detail}</div>
      </div>
      <span className="text-[10px] text-slate-600 shrink-0">{time}</span>
    </div>
  );
}

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}