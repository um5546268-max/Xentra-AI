"use client";

import { X, Keyboard } from "lucide-react";

const SHORTCUTS: { keys: string[]; label: string; group: string }[] = [
  { group: "Global", keys: ["Ctrl", "B"], label: "Toggle sidebar" },
  { group: "Global", keys: ["Ctrl", "K"], label: "Open search" },
  { group: "Global", keys: ["Ctrl", "/"], label: "Show this help" },
  { group: "Global", keys: ["Esc"], label: "Close any modal" },

  { group: "Chat", keys: ["Ctrl", "F"], label: "Search in current chat" },
  { group: "Chat", keys: ["Enter"], label: "Send message" },
  { group: "Chat", keys: ["Shift", "Enter"], label: "New line" },
  { group: "Chat", keys: ["@"], label: "Mention a user (groups)" },
  { group: "Chat", keys: ["Ctrl", "V"], label: "Paste image from clipboard" },
  { group: "Chat", keys: ["Right-click"], label: "Open message actions" },
  { group: "Chat", keys: ["Ctrl", "Shift", "N"], label: "New conversation" },
];

export default function KeyboardShortcutsModal({
  onClose,
}: {
  onClose: () => void;
}) {
  // Group by category
  const groups = SHORTCUTS.reduce<Record<string, typeof SHORTCUTS>>(
    (acc, s) => {
      if (!acc[s.group]) acc[s.group] = [];
      acc[s.group].push(s);
      return acc;
    },
    {}
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl border border-violet-500/40 bg-slate-950 p-6 shadow-2xl shadow-violet-500/20 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-slate-500 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <Keyboard className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">
              Keyboard shortcuts
            </h2>
            <p className="text-xs text-slate-500">
              Speed up your workflow
            </p>
          </div>
        </div>

        <div className="space-y-5">
          {Object.entries(groups).map(([group, items]) => (
            <div key={group}>
              <div className="text-[10px] font-semibold text-violet-400 uppercase tracking-wider mb-2">
                {group}
              </div>
              <div className="space-y-1.5">
                {items.map((s, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-3 rounded-lg bg-slate-900/60 px-3 py-2"
                  >
                    <span className="text-xs text-slate-300">{s.label}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      {s.keys.map((k, ki) => (
                        <span
                          key={ki}
                          className="text-[10px] font-mono rounded border border-slate-700 bg-slate-950 px-1.5 py-0.5 text-slate-300"
                        >
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 pt-4 border-t border-slate-800 text-[10px] text-slate-500 text-center">
          Tip: Press <span className="font-mono text-slate-300">Ctrl+/</span> anytime to see this list.
        </div>
      </div>
    </div>
  );
}