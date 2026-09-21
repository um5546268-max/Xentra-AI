"use client";

import { useEffect, useState } from "react";
import {
  BeeCheckpoint,
  getCheckpoints,
  undoToCheckpoint,
} from "@/lib/bees";
import { X, RotateCcw } from "lucide-react";

export function TimeMachineDrawer({
  taskId,
  open,
  onClose,
}: {
  taskId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const [items, setItems] = useState<BeeCheckpoint[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !taskId) return;
    getCheckpoints(taskId).then(setItems).catch(() => setItems([]));
  }, [open, taskId]);

  const handleUndo = async (cpId: string) => {
    if (!taskId) return;
    setBusy(cpId);
    try {
      const res = await undoToCheckpoint(taskId, cpId);
      if (!res.reversed) {
        alert(`⚠️ ${res.reason || "This action cannot be reversed."}`);
      } else {
        alert("⏪ Reversed successfully.");
      }
    } finally {
      setBusy(null);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-slate-950 border-l border-slate-800 h-full overflow-y-auto p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">⏪</span>
            <span className="text-sm font-semibold text-slate-200">
              AI Time Machine
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-800 text-slate-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          {items.length === 0 && (
            <div className="text-xs text-slate-500 text-center py-6">
              No checkpoints yet
            </div>
          )}
          {items.map((cp) => (
            <div
              key={cp.id}
              className="p-3 rounded-lg border border-slate-800 bg-slate-900/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs text-slate-200">{cp.label}</div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    {new Date(cp.created_at).toLocaleString()}
                  </div>
                </div>
                {cp.reversible && (
                  <button
                    onClick={() => handleUndo(cp.id)}
                    disabled={busy === cp.id}
                    className="shrink-0 flex items-center gap-1 px-2 py-1 text-[10px] rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-50"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Undo
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}