"use client";

import { useEffect, useState } from "react";
import {
  PanelRightClose,
  PanelRightOpen,
  Activity,
  Pause,
  X,
  Check,
  AlertCircle,
  Play,
  ExternalLink,
  RotateCcw,
  Trash2,
  Music,
  SkipForward,
  SkipBack,
  Gauge,
} from "lucide-react";
import { BeeHivePanel } from "@/components/hive/BeeHivePanel";
import { ActiveTasksPanel } from "@/components/hive/ActiveTasksPanel";
import { SystemHealthPanel } from "@/components/hive/SystemHealthPanel";
import { QuickToolsPanel } from "@/components/hive/QuickToolsPanel";
import { StopAllButton } from "@/components/hive/StopAllButton";
import { getBillingStatus, BillingStatus, metricLabel } from "@/lib/billing";
import { useTasks } from "@/lib/tasks-store";
import { useShellStore } from "@/lib/shell-store";
import { MiniPlayer } from "@/components/hive/MiniPlayer";
import {
  spotifyNowPlaying,
  spotifyPlay,
  spotifyPause,
  spotifyNext,
  spotifyPrevious,
  NowPlaying,
} from "@/lib/media";

export default function CommandCenter() {
  const { tasks, run, pause, resume, cancel, retry, remove } = useTasks();
  const { commandCenterCollapsed, toggleCommandCenter } = useShellStore();

  // ── Keyboard shortcut Ctrl+J ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        toggleCommandCenter();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleCommandCenter]);

  const activeTasks = tasks.filter(
    (t) =>
      t.status === "running" || t.status === "queued" || t.status === "paused"
  );

  const recentFinished = tasks
    .filter(
      (t) =>
        t.status === "done" ||
        t.status === "failed" ||
        t.status === "cancelled"
    )
    .slice(0, 3);

  // ═══════════════════════════════════════════════════════════
  // COLLAPSED MODE — narrow icon rail
  // ═══════════════════════════════════════════════════════════
  if (commandCenterCollapsed) {
    return (
      <aside className="w-14 shrink-0 border-l border-slate-800 bg-slate-950 flex flex-col h-screen items-center py-3 gap-1">
        <button
          onClick={toggleCommandCenter}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-800 hover:text-slate-200 transition"
          title="Expand Command Center (Ctrl+J)"
        >
          <PanelRightOpen className="w-4 h-4" />
        </button>

        <div className="w-8 border-t border-slate-800 my-1" />

        {/* Bee Hive shortcut */}
        <button
          className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition"
          title="Bee Hive"
        >
          <span className="text-base">🐝</span>
        </button>

        {/* Active tasks count */}
        <button
          className={`w-9 h-9 rounded-lg flex items-center justify-center transition ${
            activeTasks.length > 0
              ? "text-violet-300 bg-violet-500/10"
              : "text-slate-400 hover:bg-slate-800"
          }`}
          title={`Active tasks (${activeTasks.length})`}
        >
          <Activity className="w-4 h-4" />
        </button>

        {/* Now Playing shortcut */}
        <button
          className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition"
          title="Now Playing"
        >
          <Music className="w-4 h-4" />
        </button>

        {/* System Health shortcut */}
        <button
          className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition"
          title="System Health"
        >
          <Gauge className="w-4 h-4" />
        </button>

        <div className="mt-auto">
          {/* Notification dot if there are active tasks */}
          {activeTasks.length > 0 && (
            <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse mx-auto" />
          )}
        </div>
      </aside>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // EXPANDED MODE — full Command Center
  // ═══════════════════════════════════════════════════════════
  return (
    <aside className="w-80 shrink-0 border-l border-slate-800 bg-slate-950 flex flex-col h-screen overflow-y-auto">
      {/* Header — with collapse toggle */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-white">
              Command Center
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Your AI is working. Here's what's happening.
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <StopAllButton />
            <button
              onClick={toggleCommandCenter}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-800 hover:text-slate-200 transition"
              title="Collapse Command Center (Ctrl+J)"
            >
              <PanelRightClose className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Bee Hive */}
      <div className="p-3 border-b border-slate-800">
        <BeeHivePanel />
      </div>

      {/* Now Playing — local + YouTube + Spotify via player store */}
      <MiniPlayer />

      {/* Active Bee Tasks */}
      <div className="p-3 border-b border-slate-800">
        <ActiveTasksPanel />
      </div>

      {/* Active Tasks (legacy task system) */}
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

      {/* System Health */}
      <div className="p-3 border-b border-slate-800">
        <SystemHealthPanel score={87} />
      </div>

            {/* Quick Tools */}
      <div className="p-3 border-b border-slate-800">
        <QuickToolsPanel />
      </div>


      {/* Usage */}
      <UsageWidget />

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
          <AppChip label="Google" color="red" />
          <AppChip label="GitHub" color="gray" />
          <AppChip label="Spotify" color="green" />
          <AppChip label="YouTube" color="red" />
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
    </aside>
  );
}

// ═══════════════════════════════════════════════════════════════
// NOW PLAYING CARD
// ═══════════════════════════════════════════════════════════════
function NowPlayingCard() {
  const [now, setNow] = useState<NowPlaying | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    try {
      const data = await spotifyNowPlaying();
      setNow(data);
      setError(null);
    } catch (e: any) {
      setError(e?.response?.data?.detail || null);
    }
  };

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, []);

  const handlePause = async () => {
    setBusy(true);
    try {
      await spotifyPause();
      setTimeout(refresh, 500);
    } catch {}
    setBusy(false);
  };

  const handleResume = async () => {
    setBusy(true);
    try {
      await spotifyPlay();
      setTimeout(refresh, 800);
    } catch {}
    setBusy(false);
  };

  const handleNext = async () => {
    setBusy(true);
    try {
      await spotifyNext();
      setTimeout(refresh, 800);
    } catch {}
    setBusy(false);
  };

  const handlePrev = async () => {
    setBusy(true);
    try {
      await spotifyPrevious();
      setTimeout(refresh, 800);
    } catch {}
    setBusy(false);
  };

  return (
    <div className="p-3 border-b border-slate-800 space-y-2">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 uppercase tracking-wider">
          <Music className="w-3.5 h-3.5" />
          Now Playing
        </div>
      </div>

      {!now?.track ? (
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-center text-xs text-slate-600">
          {error ? (
            <>
              Spotify not connected.
              <br />
              <span className="text-slate-700">
                Connect it in Integrations.
              </span>
            </>
          ) : (
            <>
              Nothing playing.
              <br />
              <span className="text-slate-700">Start playback in Spotify.</span>
            </>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-violet-500/30 bg-violet-500/5 p-3 space-y-2">
          <div className="flex gap-3 items-center">
            {now.track.image && (
              <img
                src={now.track.image}
                alt={now.track.name}
                className="w-12 h-12 rounded shrink-0"
              />
            )}
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium truncate text-slate-100">
                {now.track.name}
              </div>
              <div className="text-[11px] text-slate-400 truncate">
                {now.track.artist}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={handlePrev}
              disabled={busy}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-300 disabled:opacity-40"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>
            {now.playing ? (
              <button
                onClick={handlePause}
                disabled={busy}
                className="p-2 rounded-full bg-violet-600 hover:bg-violet-500 disabled:opacity-40"
              >
                <Pause className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleResume}
                disabled={busy}
                className="p-2 rounded-full bg-violet-600 hover:bg-violet-500 disabled:opacity-40"
              >
                <Play className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={busy}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-300 disabled:opacity-40"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          </div>

          {now.progress_ms > 0 && now.track.duration_ms > 0 && (
            <div className="h-1 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-violet-500 transition-all"
                style={{
                  width: `${(now.progress_ms / now.track.duration_ms) * 100}%`,
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// USAGE WIDGET
// ═══════════════════════════════════════════════════════════════
function UsageWidget() {
  const [status, setStatus] = useState<BillingStatus | null>(null);

  useEffect(() => {
    getBillingStatus()
      .then(setStatus)
      .catch(() => {});
  }, []);

  if (!status) return null;

  const metrics = Object.entries(status.usage).slice(0, 3);
  if (metrics.length === 0) return null;

  return (
    <div className="p-3 border-b border-slate-800 space-y-2">
      <div className="flex items-center gap-2 text-xs font-medium text-slate-500 uppercase tracking-wider px-1">
        <Gauge className="w-3.5 h-3.5" />
        Usage · {status.plan.name}
      </div>
      <div className="space-y-2">
        {metrics.map(([key, metric]) => {
          const unlimited = metric.limit === -1;
          const pct = unlimited
            ? 0
            : Math.min(100, (metric.used / metric.limit) * 100);
          return (
            <div key={key} className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">{metricLabel(key)}</span>
                <span className="font-mono text-slate-500">
                  {unlimited ? "∞" : `${metric.used}/${metric.limit}`}
                </span>
              </div>
              <div className="h-1 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className={`h-full ${
                    pct >= 90
                      ? "bg-red-500"
                      : pct >= 70
                      ? "bg-yellow-500"
                      : "bg-emerald-500"
                  }`}
                  style={{ width: unlimited ? "0%" : `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════
function TaskIcon({ type, status }: { type: string; status: string }) {
  const wrapper = "w-7 h-7 rounded-md flex items-center justify-center shrink-0";
  const colors: Record<string, string> = {
    research: "bg-violet-500/20 text-violet-300",
    code: "bg-blue-500/20 text-blue-300",
    shopping: "bg-emerald-500/20 text-emerald-300",
    media: "bg-pink-500/20 text-pink-300",
    browser: "bg-cyan-500/20 text-cyan-300",
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
  if (t.payload.url) return String(t.payload.url);
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