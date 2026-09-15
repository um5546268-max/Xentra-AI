"use client";

import {
  Activity,
  Pause,
  X,
  Check,
  AlertCircle,
  Play,
  ExternalLink,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useTasks } from "@/lib/tasks-store";

export default function CommandCenter() {
  const { tasks, run, pause, resume, cancel, retry, remove } = useTasks();

  const activeTasks = tasks.filter(
    (t) =>
      t.status === "running" ||
      t.status === "queued" ||
      t.status === "paused"
  );

  const recentFinished = tasks
    .filter((t) => t.status === "done" || t.status === "failed" || t.status === "cancelled")
    .slice(0, 3);

  return (
    <aside className="w-80 shrink-0 border-l border-slate-800 bg-slate-950 flex flex-col h-screen overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-slate-800">
        <h2 className="text-base font-semibold text-white">Command Center</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Your AI is working. Here's what's happening.
        </p>
      </div>

      {/* Active Tasks */}
      <div className="p-3 border-b border-slate-800 space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 uppercase tracking-wider">
            <Activity className="w-3.5 h-3.5" />
            Active Tasks ({activeTasks.length})
          </div>
        </div>

        {activeTasks.length === 0 ? (
          <div className="text-xs text-slate-600 text-center py-6">
            No active tasks.
            <br />
            <span className="text-slate-700">Start one from the sidebar.</span>
          </div>
        ) : (
          <div className="space-y-2">
            {activeTasks.map((t) => (
              <div
                key={t.id}
                className="rounded-lg border border-slate-800 bg-slate-900/60 p-2.5 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <TaskIcon type={t.type} status={t.status} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-slate-400 capitalize truncate">
                      {t.type}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {taskDescription(t)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${progressColor(
                        t.status
                      )}`}
                      style={{ width: `${t.progress}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 w-8 text-right">
                    {t.progress}%
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-600">
                    {statusLabel(t.status)}
                  </span>
                  <div className="flex items-center gap-1">
                    {t.status === "queued" && (
                      <button
                        onClick={() => run(t.id)}
                        className="p-1 rounded hover:bg-slate-800 text-violet-400"
                        title="Run"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {t.status === "running" && (
                      <button
                        onClick={() => pause(t.id)}
                        className="p-1 rounded hover:bg-slate-800 text-yellow-400"
                        title="Pause"
                      >
                        <Pause className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {t.status === "paused" && (
                      <button
                        onClick={() => resume(t.id)}
                        className="p-1 rounded hover:bg-slate-800 text-emerald-400"
                        title="Resume"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => cancel(t.id)}
                      className="p-1 rounded hover:bg-slate-800 text-red-400"
                      title="Cancel"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recently Finished */}
      {recentFinished.length > 0 && (
        <div className="p-3 border-b border-slate-800 space-y-2">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider px-1">
            Recently Finished
          </div>
          <div className="space-y-2">
            {recentFinished.map((t) => (
              <div
                key={t.id}
                className="rounded-lg border border-slate-800 bg-slate-900/40 p-2.5 space-y-1.5"
              >
                <div className="flex items-center gap-2">
                  <TaskIcon type={t.type} status={t.status} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-slate-400 capitalize truncate">
                      {t.type}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {taskDescription(t)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => retry(t.id)}
                      className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-violet-400"
                      title="Retry"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => remove(t.id)}
                      className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-red-400"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="text-[11px] text-slate-600 pl-9">
                  {statusLabel(t.status)}
                  {t.result?.message ? ` — ${t.result.message}` : ""}
                  {t.result?.error ? ` — ${t.result.error}` : ""}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Connected Apps */}
      <div className="p-3 border-b border-slate-800 space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Connected Apps
          </div>
          <button className="text-xs text-slate-600 hover:text-slate-400 flex items-center gap-1">
            Manage <ExternalLink className="w-3 h-3" />
          </button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <AppChip label="YouTube" color="red" />
          <AppChip label="Spotify" color="green" />
          <AppChip label="Google" color="blue" />
          <AppChip label="GitHub" color="gray" />
        </div>
      </div>

      {/* Permissions */}
      <div className="p-3 border-b border-slate-800 space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Permissions
          </div>
          <button className="text-xs text-slate-600 hover:text-slate-400">
            View
          </button>
        </div>
        <div className="space-y-1.5">
          <PermRow label="Web Browsing" allowed />
          <PermRow label="File Access" allowed />
          <PermRow label="Media Control" allowed />
          <PermRow label="App Integration" allowed />
        </div>
      </div>

      {/* Now Playing */}
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Now Playing
          </div>
          <button className="text-xs text-slate-600 hover:text-slate-400">
            View
          </button>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-center text-xs text-slate-600">
          Nothing playing.
          <br />
          <span className="text-slate-700">Media agent in Phase 7.</span>
        </div>
      </div>
    </aside>
  );
}

// --- Helpers ---

function TaskIcon({ type, status }: { type: string; status: string }) {
  const wrapper = "w-7 h-7 rounded-md flex items-center justify-center shrink-0";
  const colors: Record<string, string> = {
    research: "bg-violet-500/20 text-violet-300",
    code: "bg-blue-500/20 text-blue-300",
    shopping: "bg-emerald-500/20 text-emerald-300",
    media: "bg-pink-500/20 text-pink-300",
    chat: "bg-slate-500/20 text-slate-300",
    generic: "bg-slate-500/20 text-slate-300",
  };

  if (status === "done")
    return (
      <div className={`${wrapper} bg-emerald-500/20 text-emerald-300`}>
        <Check className="w-4 h-4" />
      </div>
    );
  if (status === "failed")
    return (
      <div className={`${wrapper} bg-red-500/20 text-red-300`}>
        <AlertCircle className="w-4 h-4" />
      </div>
    );
  if (status === "cancelled")
    return (
      <div className={`${wrapper} bg-slate-500/20 text-slate-400`}>
        <X className="w-4 h-4" />
      </div>
    );
  if (status === "paused")
    return (
      <div className={`${wrapper} bg-yellow-500/20 text-yellow-300`}>
        <Pause className="w-4 h-4" />
      </div>
    );

  return (
    <div className={`${wrapper} ${colors[type] || colors.generic}`}>
      <span className="text-xs font-bold">X</span>
    </div>
  );
}

function taskDescription(t: { type: string; payload: any }): string {
  if (!t.payload) return "Working…";
  if (t.payload.query) return String(t.payload.query);
  if (t.payload.prompt) return String(t.payload.prompt).slice(0, 40);
  if (t.payload.item) return String(t.payload.item);
  return "Working…";
}

function statusLabel(status: string): string {
  switch (status) {
    case "queued":
      return "Waiting";
    case "running":
      return "Working…";
    case "paused":
      return "Paused";
    case "done":
      return "Done";
    case "failed":
      return "Failed";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

function progressColor(status: string) {
  if (status === "done") return "bg-emerald-500";
  if (status === "failed") return "bg-red-500";
  if (status === "paused") return "bg-yellow-500";
  if (status === "running") return "bg-violet-500";
  return "bg-slate-600";
}

function AppChip({ label, color }: { label: string; color: string }) {
  const colors: Record<string, string> = {
    red: "border-red-500/30 text-red-300",
    green: "border-emerald-500/30 text-emerald-300",
    blue: "border-blue-500/30 text-blue-300",
    gray: "border-slate-500/30 text-slate-300",
  };
  return (
    <span
      className={`rounded-md border bg-slate-900/60 px-2 py-1 text-xs ${
        colors[color] || colors.gray
      }`}
    >
      {label}
    </span>
  );
}

function PermRow({ label, allowed }: { label: string; allowed: boolean }) {
  return (
    <div className="flex items-center justify-between px-1 text-xs">
      <span className="text-slate-400">{label}</span>
      <span
        className={`flex items-center gap-1 ${
          allowed ? "text-emerald-400" : "text-slate-500"
        }`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
        {allowed ? "Allowed" : "Off"}
      </span>
    </div>
  );
}