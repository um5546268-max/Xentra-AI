"use client";

import {
  Sparkles,
  Clock,
  StopCircle,
  CheckCircle2,
  Circle,
  ListChecks,
  FileText,
  Folder,
  Search,
  Terminal,
  Wand2,
  RotateCcw,
  X,
  CheckCheck,
  ShieldCheck,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useCodeStore, AITask } from "@/lib/code-store";

type Props = {
  onStop: () => void;
  onApply: () => void;
  onReviewDiff: () => void;
  onRetry: () => void;
  onCancel: () => void;
};

export function AIAgentPanel({
  onStop,
  onApply,
  onReviewDiff,
  onRetry,
  onCancel,
}: Props) {
  const { task } = useCodeStore();

  return (
    <div className="w-80 shrink-0 border-l border-slate-800 bg-slate-950 flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-slate-800 flex items-center gap-2 shrink-0">
        <div className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
          <Sparkles className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-slate-200 truncate">
            AI Coding Agent
          </div>
          <div className="text-[10px] text-slate-500">Autonomous code assistant</div>
        </div>
        <span className="text-[10px] font-bold text-violet-300 bg-violet-500/15 border border-violet-500/30 rounded px-1.5 py-0.5">
          BETA
        </span>
      </div>

      {/* Task header */}
      {task ? (
        <TaskCard task={task} onStop={onStop} />
      ) : (
        <div className="p-3 border-b border-slate-800">
          <div className="text-xs text-slate-500 text-center py-3">
            No active task.
            <br />
            <span className="text-slate-600">
              Ask the agent from the editor below.
            </span>
          </div>
        </div>
      )}

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {task?.plan && task.plan.length > 0 && (
          <PlanSection plan={task.plan} />
        )}

        {task?.tools && task.tools.length > 0 && (
          <ToolsSection tools={task.tools} />
        )}

        {task?.changedFiles && task.changedFiles.length > 0 && (
          <ChangedFilesSection files={task.changedFiles} />
        )}

        {task?.verification && (
          <VerificationSection verification={task.verification} />
        )}
      </div>

      {/* Action buttons (only if there's a completed/failed task) */}
      {task && (task.status === "done" || task.status === "failed") && (
        <div className="border-t border-slate-800 p-3 space-y-2 shrink-0">
          <button
            onClick={onApply}
            disabled={task.status !== "done"}
            className="w-full rounded-md bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-xs font-medium px-3 py-2 transition"
          >
            Apply Changes
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onReviewDiff}
              className="rounded-md border border-slate-700 hover:bg-slate-900 text-slate-300 text-xs px-3 py-2 transition"
            >
              Review Diff
            </button>
            <button
              onClick={onRetry}
              className="rounded-md border border-slate-700 hover:bg-slate-900 text-slate-300 text-xs px-3 py-2 transition flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3 h-3" />
              Retry
            </button>
          </div>
          <button
            onClick={onCancel}
            className="w-full rounded-md border border-red-500/40 hover:bg-red-500/10 text-red-300 text-xs px-3 py-2 transition flex items-center justify-center gap-1.5"
          >
            <X className="w-3 h-3" />
            Cancel
          </button>
        </div>
      )}

      {task?.status === "running" && (
        <div className="border-t border-slate-800 p-3 shrink-0">
          <button
            onClick={onStop}
            className="w-full rounded-md border border-red-500/40 hover:bg-red-500/10 text-red-300 text-xs px-3 py-2 transition flex items-center justify-center gap-1.5"
          >
            <StopCircle className="w-3.5 h-3.5" />
            Stop
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Task header card
// ─────────────────────────────────────────────
function TaskCard({ task, onStop }: { task: AITask; onStop: () => void }) {
  const statusColor = {
    idle: "text-slate-400 bg-slate-500/10 border-slate-500/30",
    running: "text-blue-300 bg-blue-500/10 border-blue-500/30",
    done: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30",
    failed: "text-red-300 bg-red-500/10 border-red-500/30",
    cancelled: "text-slate-400 bg-slate-500/10 border-slate-500/30",
  }[task.status];

  const elapsed = task.startedAt
    ? Math.floor((Date.now() - task.startedAt) / 1000)
    : 0;

  return (
    <div className="p-3 border-b border-slate-800 space-y-2 shrink-0">
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">
          Current Task
        </div>
        <button className="text-slate-500 hover:text-slate-300">
          <X className="w-3 h-3" />
        </button>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 space-y-2">
        <div className="text-xs font-medium text-slate-200 leading-snug">
          {task.title}
        </div>
        {task.description && (
          <div className="text-[11px] text-slate-500 leading-relaxed">
            {task.description}
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <span
            className={`text-[10px] font-medium border rounded px-1.5 py-0.5 flex items-center gap-1 ${statusColor}`}
          >
            {task.status === "running" && (
              <Loader2 className="w-2.5 h-2.5 animate-spin" />
            )}
            {task.status === "done" && <CheckCircle2 className="w-2.5 h-2.5" />}
            {task.status === "failed" && <AlertCircle className="w-2.5 h-2.5" />}
            {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
          </span>

          {task.status === "running" && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-[10px] text-slate-500">
                <Clock className="w-3 h-3" />
                <span className="font-mono">{elapsed}s</span>
              </div>
              <button
                onClick={onStop}
                className="text-red-400 hover:text-red-300"
                title="Stop"
              >
                <StopCircle className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Plan & Checklist
// ─────────────────────────────────────────────
function PlanSection({ plan }: { plan: { text: string; done: boolean }[] }) {
  const total = plan.length;
  const done = plan.filter((p) => p.done).length;

  return (
    <div className="p-3 border-b border-slate-800 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-500 font-medium">
          <ListChecks className="w-3 h-3" />
          Plan & Checklist
        </div>
        <span className="text-[10px] text-slate-600 font-mono">
          {done}/{total}
        </span>
      </div>

      <div className="space-y-1.5">
        {plan.map((p, i) => (
          <div key={i} className="flex items-start gap-2 text-xs">
            {p.done ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <Circle className="w-3.5 h-3.5 text-slate-600 shrink-0 mt-0.5" />
            )}
            <span
              className={
                p.done
                  ? "text-slate-400 line-through"
                  : "text-slate-300"
              }
            >
              {p.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Tools in use
// ─────────────────────────────────────────────
function ToolsSection({
  tools,
}: {
  tools: { name: string; description: string; active: boolean }[];
}) {
  return (
    <div className="p-3 border-b border-slate-800 space-y-2">
      <div className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">
        Tools in Use
      </div>
      <div className="space-y-1.5">
        {tools.map((t, i) => (
          <div
            key={i}
            className={`flex items-start gap-2 text-xs rounded border p-2 ${
              t.active
                ? "border-violet-500/40 bg-violet-500/5"
                : "border-slate-800 bg-slate-900/30"
            }`}
          >
            <ToolIcon name={t.name} active={t.active} />
            <div className="min-w-0 flex-1">
              <div
                className={`text-[11px] font-medium ${
                  t.active ? "text-violet-300" : "text-slate-300"
                }`}
              >
                {t.name}
              </div>
              <div className="text-[10px] text-slate-500 truncate">
                {t.description}
              </div>
            </div>
            {t.active && (
              <Loader2 className="w-3 h-3 text-violet-400 animate-spin shrink-0 mt-0.5" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ToolIcon({ name, active }: { name: string; active: boolean }) {
  const color = active ? "text-violet-400" : "text-slate-500";
  if (name.toLowerCase().includes("file"))
    return <Folder className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${color}`} />;
  if (name.toLowerCase().includes("search"))
    return <Search className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${color}`} />;
  if (name.toLowerCase().includes("terminal") || name.toLowerCase().includes("run"))
    return <Terminal className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${color}`} />;
  if (name.toLowerCase().includes("edit") || name.toLowerCase().includes("write"))
    return <Wand2 className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${color}`} />;
  return <FileText className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${color}`} />;
}

// ─────────────────────────────────────────────
// Changed files
// ─────────────────────────────────────────────
function ChangedFilesSection({
  files,
}: {
  files: { path: string; added: number; removed: number }[];
}) {
  return (
    <div className="p-3 border-b border-slate-800 space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">
          Changed Files ({files.length})
        </div>
        <button className="text-[10px] text-violet-400 hover:text-violet-300">
          View Diff
        </button>
      </div>
      <div className="space-y-1">
        {files.map((f, i) => {
          const ext = f.path.split(".").pop()?.toLowerCase();
          return (
            <div
              key={i}
              className="flex items-center gap-2 text-[11px] px-2 py-1 rounded hover:bg-slate-900/60"
            >
              <span
                className={`shrink-0 ${
                  ["js", "jsx", "ts", "tsx"].includes(ext ?? "")
                    ? "text-blue-400"
                    : ext === "json"
                    ? "text-yellow-400"
                    : "text-slate-400"
                }`}
              >
                {["js", "jsx", "ts", "tsx"].includes(ext ?? "") ? (
                  <FileText className="w-3 h-3" />
                ) : (
                  <FileText className="w-3 h-3" />
                )}
              </span>
              <span className="text-slate-300 truncate flex-1 font-mono">
                {f.path}
              </span>
              {f.added > 0 && (
                <span className="text-emerald-400 font-mono">+{f.added}</span>
              )}
              {f.removed > 0 && (
                <span className="text-red-400 font-mono">-{f.removed}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Verification
// ─────────────────────────────────────────────
function VerificationSection({
  verification,
}: {
  verification: { passed: boolean; summary: string };
}) {
  return (
    <div className="p-3 border-b border-slate-800 space-y-2">
      <div className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">
        Verification
      </div>
      <div
        className={`flex items-start gap-2 rounded-lg border p-2.5 ${
          verification.passed
            ? "border-emerald-500/40 bg-emerald-500/5"
            : "border-red-500/40 bg-red-500/5"
        }`}
      >
        {verification.passed ? (
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        ) : (
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
        )}
        <div className="min-w-0 flex-1 space-y-1">
          <div
            className={`text-xs font-medium ${
              verification.passed ? "text-emerald-300" : "text-red-300"
            }`}
          >
            {verification.passed ? "Tests passed" : "Verification failed"}
          </div>
          <div className="text-[11px] text-slate-400 leading-relaxed">
            {verification.summary}
          </div>
        </div>
      </div>
    </div>
  );
}