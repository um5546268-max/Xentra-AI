"use client";

import { useState } from "react";
import { X, Code, ShoppingBag, Music, Search, Sparkles } from "lucide-react";
import { useTasks } from "@/lib/tasks-store";

const TASK_TYPES = [
  {
    id: "research",
    label: "Research",
    icon: Search,
    color: "violet",
    placeholder: "What should I research?",
    sample: "Latest AI news this week",
  },
  {
    id: "code",
    label: "Code",
    icon: Code,
    color: "blue",
    placeholder: "What should I build?",
    sample: "Python function to parse JSON",
  },
  {
    id: "shopping",
    label: "Shopping",
    icon: ShoppingBag,
    color: "emerald",
    placeholder: "What should I find?",
    sample: "Wireless headphones under 5000",
  },
  {
    id: "media",
    label: "Media",
    icon: Music,
    color: "pink",
    placeholder: "What should I play?",
    sample: "Lo-fi study music",
  },
];

const COLORS: Record<string, { bg: string; text: string; ring: string }> = {
  violet: { bg: "bg-violet-500/20", text: "text-violet-300", ring: "ring-violet-500" },
  blue: { bg: "bg-blue-500/20", text: "text-blue-300", ring: "ring-blue-500" },
  emerald: { bg: "bg-emerald-500/20", text: "text-emerald-300", ring: "ring-emerald-500" },
  pink: { bg: "bg-pink-500/20", text: "text-pink-300", ring: "ring-pink-500" },
};

export default function NewTaskModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const { add, run } = useTasks();
  const [selected, setSelected] = useState(TASK_TYPES[0]);
  const [input, setInput] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!input.trim() || creating) return;
    setCreating(true);

    const payload: Record<string, any> = {};
    if (selected.id === "research") payload.query = input.trim();
    else if (selected.id === "code") payload.prompt = input.trim();
    else if (selected.id === "shopping") payload.item = input.trim();
    else if (selected.id === "media") payload.query = input.trim();

    const task = await add(selected.id, payload);
    if (task) {
      await run(task.id);
      setCreating(false);
      onClose();
    } else {
      setCreating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-950 p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-400" />
            <h2 className="text-lg font-semibold">New task</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-800 text-slate-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Type selector */}
        <div className="grid grid-cols-4 gap-2">
          {TASK_TYPES.map((t) => {
            const Icon = t.icon;
            const c = COLORS[t.color];
            const isSelected = selected.id === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setSelected(t)}
                className={`flex flex-col items-center gap-2 rounded-lg border border-slate-800 p-3 transition ${
                  isSelected ? `ring-2 ${c.ring} bg-slate-900` : "hover:bg-slate-900"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-md flex items-center justify-center ${c.bg} ${c.text}`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-xs text-slate-300">{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Input */}
        <div className="space-y-2">
          <label className="text-xs text-slate-500 uppercase tracking-wider">
            Task input
          </label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={selected.placeholder}
            rows={3}
            autoFocus
            className="w-full resize-none rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-violet-500 focus:outline-none"
          />
          <div className="text-xs text-slate-600">
            Try:{" "}
            <button
              onClick={() => setInput(selected.sample)}
              className="text-violet-400 hover:underline"
            >
              {selected.sample}
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-900"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!input.trim() || creating}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium hover:bg-violet-500 disabled:opacity-40 transition"
          >
            {creating ? "Creating…" : "Create & run"}
          </button>
        </div>
      </div>
    </div>
  );
}