"use client";

import { useEffect, useState } from "react";
import {
  FileCode,
  ChevronDown,
  GitBranch,
  Check,
  Play,
  Bug,
  FlaskConical,
  Monitor,
  Cpu,
  MemoryStick,
  ListTodo,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useCodeStore } from "@/lib/code-store";

type Props = {
  onRun: () => void;
  onDebug: () => void;
  onTest: () => void;
  onPreview: () => void;
};

export function TopNav({ onRun, onDebug, onTest, onPreview }: Props) {
  const { git } = useCodeStore();
  const [cpu, setCpu] = useState(12);
  const [ram, setRam] = useState(48);
  const [running, setRunning] = useState(2);
  const [tasks, setTasks] = useState(5);

  // Fake metrics tick (replace with real data if you have endpoints later)
  useEffect(() => {
    const id = setInterval(() => {
      setCpu((c) => Math.max(5, Math.min(95, c + (Math.random() - 0.5) * 6)));
      setRam((r) => Math.max(20, Math.min(90, r + (Math.random() - 0.5) * 3)));
    }, 3000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="h-12 border-b border-slate-800 bg-slate-950 flex items-center px-3 gap-3 shrink-0">
      {/* Brand */}
      <div className="flex items-center gap-2 pr-3 border-r border-slate-800">
        <div className="w-6 h-6 rounded flex items-center justify-center bg-gradient-to-br from-violet-500 to-cyan-500">
          <span className="text-xs font-bold text-white">X</span>
        </div>
        <span className="text-sm font-bold bg-gradient-to-r from-violet-400 via-cyan-300 to-violet-400 bg-clip-text text-transparent">
          XENTRA AI
        </span>
      </div>

      {/* Project selector */}
      <button className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-slate-900 transition text-xs text-slate-300">
        <FileCode className="w-3.5 h-3.5 text-slate-500" />
        <span className="font-medium">PixelView-2.2.0</span>
        <ChevronDown className="w-3 h-3 text-slate-600" />
      </button>

      {/* Git branch */}
      <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-slate-900 transition text-xs text-slate-300">
        <GitBranch className="w-3.5 h-3.5 text-slate-500" />
        <span>{git?.branch ?? "main"}</span>
        <ChevronDown className="w-3 h-3 text-slate-600" />
      </button>

      {/* Synced badge */}
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30">
        <Check className="w-3 h-3 text-emerald-400" />
        <span className="text-[11px] text-emerald-300 font-medium">Synced</span>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1 ml-2">
        <ActionBtn icon={<Play className="w-3.5 h-3.5" />} label="Run" onClick={onRun} primary />
        <ActionBtn icon={<Bug className="w-3.5 h-3.5" />} label="Debug" onClick={onDebug} />
        <ActionBtn icon={<FlaskConical className="w-3.5 h-3.5" />} label="Test" onClick={onTest} />
        <ActionBtn icon={<Monitor className="w-3.5 h-3.5" />} label="Preview" onClick={onPreview} />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Metrics */}
      <div className="flex items-center gap-3 text-[11px]">
        <Metric icon={<Cpu className="w-3.5 h-3.5 text-slate-500" />} label="CPU" value={`${Math.round(cpu)}%`} />
        <Metric icon={<MemoryStick className="w-3.5 h-3.5 text-slate-500" />} label="RAM" value={`${Math.round(ram)}%`} />
        <Metric icon={<ListTodo className="w-3.5 h-3.5 text-slate-500" />} label="Tasks" value={`${running}/${tasks}`} />
      </div>

      {/* Sandbox badge */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 ml-2">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
        <span className="text-[11px] text-emerald-300 font-medium">Secure Sandbox</span>
      </div>

      {/* AI badge */}
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-violet-500/10 border border-violet-500/30">
        <Sparkles className="w-3.5 h-3.5 text-violet-400" />
        <span className="text-[10px] text-violet-300 font-bold">Beta</span>
      </div>
    </div>
  );
}

function ActionBtn({
  icon,
  label,
  onClick,
  primary,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
        primary
          ? "bg-blue-600 hover:bg-blue-500 text-white"
          : "text-slate-300 hover:bg-slate-900"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {icon}
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-200 font-mono">{value}</span>
    </div>
  );
}