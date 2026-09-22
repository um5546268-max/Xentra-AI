"use client";

import { useEffect, useState } from "react";
import {
  Plus, Trash2, Target, Loader2, Check, X, TrendingUp, AlertCircle,
} from "lucide-react";
import {
  Goal, listGoals, createGoal, updateGoal, bumpGoal, deleteGoal,
} from "@/lib/goals";
import { SUBJECTS } from "@/lib/notes";

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);

  const load = async () => {
    try {
      setGoals(await listGoals());
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const g = await createGoal({ title: "New goal", target: 100, unit: "%" });
      setGoals((prev) => [g, ...prev]);
      setEditing(g);
    } catch {}
    setCreating(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this goal?")) return;
    await deleteGoal(id);
    setGoals((prev) => prev.filter((g) => g.id !== id));
    if (editing?.id === id) setEditing(null);
  };

  const active = goals.filter((g) => !g.completed);
  const done = goals.filter((g) => g.completed);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
              <Target className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">Goals</h1>
              <p className="text-sm text-slate-500">
                Set targets, track progress, celebrate wins.
              </p>
            </div>
          </div>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="rounded-lg bg-amber-600 hover:bg-amber-500 px-4 py-2 text-sm font-medium flex items-center gap-2 disabled:opacity-40"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            New goal
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
          </div>
        ) : goals.length === 0 ? (
          <div className="text-center py-16 text-slate-600 text-sm space-y-2">
            <Target className="w-10 h-10 mx-auto text-slate-700" />
            <div>No goals yet. Click New goal to set your first one.</div>
          </div>
        ) : (
          <>
            {/* Active goals */}
            {active.length > 0 && (
              <div className="space-y-3">
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wider px-1">
                  In progress ({active.length})
                </div>
                {active.map((g) => (
                  <GoalCard
                    key={g.id}
                    goal={g}
                    onEdit={() => setEditing(g)}
                    onDelete={() => handleDelete(g.id)}
                    onBump={async (amt) => {
                      const updated = await bumpGoal(g.id, amt);
                      setGoals((prev) => prev.map((x) => (x.id === g.id ? updated : x)));
                    }}
                  />
                ))}
              </div>
            )}

            {/* Completed goals */}
            {done.length > 0 && (
              <div className="space-y-3">
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wider px-1">
                  Completed ({done.length})
                </div>
                {done.map((g) => (
                  <GoalCard
                    key={g.id}
                    goal={g}
                    onEdit={() => setEditing(g)}
                    onDelete={() => handleDelete(g.id)}
                    onBump={async () => {}}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {editing && (
        <GoalEditor
          goal={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) =>
            setGoals((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))
          }
          onDeleted={() => {
            setGoals((prev) => prev.filter((x) => x.id !== editing.id));
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// Goal card
// ───────────────────────────────────────────────────────────
function GoalCard({
  goal, onEdit, onDelete, onBump,
}: {
  goal: Goal;
  onEdit: () => void;
  onDelete: () => void;
  onBump: (amount: number) => Promise<void>;
}) {
  const pct = goal.target > 0 ? Math.min(100, (goal.current / goal.target) * 100) : 0;
  const isDone = goal.completed;
  const subj = SUBJECTS.find((s) => s.id === goal.subject);

  return (
    <div
      className={`rounded-xl border p-4 space-y-3 ${
        isDone ? "border-emerald-500/40 bg-emerald-500/5" : "border-slate-800 bg-slate-900/40"
      }`}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={async () => { if (!isDone) await onBump(1); }}
          disabled={isDone}
          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition ${
            isDone
              ? "bg-emerald-500 border-emerald-500 text-white"
              : "border-slate-600 hover:border-emerald-500"
          }`}
          title={isDone ? "Completed" : "Add 1"}
        >
          {isDone && <Check className="w-3.5 h-3.5" />}
        </button>

        <div className="flex-1 min-w-0 cursor-pointer" onClick={onEdit}>
          <div className={`text-sm font-medium ${isDone ? "line-through text-slate-500" : ""}`}>
            {goal.title}
          </div>
          {goal.description && (
            <div className="text-xs text-slate-500 mt-0.5 truncate">
              {goal.description}
            </div>
          )}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {subj && (
              <span className="text-[10px] rounded-full border border-slate-700 px-2 py-0.5 text-slate-400">
                {subj.emoji} {subj.label}
              </span>
            )}
            {goal.deadline && (
              <span className={`text-[10px] flex items-center gap-1 ${
                new Date(goal.deadline) < new Date() && !isDone
                  ? "text-red-400"
                  : "text-slate-500"
              }`}>
                <AlertCircle className="w-3 h-3" />
                {new Date(goal.deadline).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        <button
          onClick={onDelete}
          className="p-2 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-red-400"
          title="Delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-xs text-slate-500">
          <span className="font-mono">
            {goal.current} / {goal.target} {goal.unit}
          </span>
          <span className="font-mono">{Math.round(pct)}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              isDone ? "bg-emerald-500" : "bg-gradient-to-r from-violet-500 to-cyan-500"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {!isDone && (
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => onBump(1)}
            className="text-xs rounded-md border border-slate-800 hover:bg-slate-800 px-2 py-1 text-slate-400"
          >
            +1
          </button>
          <button
            onClick={() => onBump(5)}
            className="text-xs rounded-md border border-slate-800 hover:bg-slate-800 px-2 py-1 text-slate-400"
          >
            +5
          </button>
          <button
            onClick={() => onBump(10)}
            className="text-xs rounded-md border border-slate-800 hover:bg-slate-800 px-2 py-1 text-slate-400"
          >
            +10
          </button>
          <span className="text-[10px] text-slate-600 ml-auto">
            <TrendingUp className="w-3 h-3 inline mr-1" />
            Track progress
          </span>
        </div>
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// Goal editor modal
// ───────────────────────────────────────────────────────────
function GoalEditor({
  goal, onClose, onSaved, onDeleted,
}: {
  goal: Goal;
  onClose: () => void;
  onSaved: (g: Goal) => void;
  onDeleted: () => void;
}) {
  const [title, setTitle] = useState(goal.title);
  const [description, setDescription] = useState(goal.description ?? "");
  const [target, setTarget] = useState(goal.target);
  const [current, setCurrent] = useState(goal.current);
  const [unit, setUnit] = useState(goal.unit);
  const [subject, setSubject] = useState(goal.subject);
  const [deadline, setDeadline] = useState(
    goal.deadline ? goal.deadline.slice(0, 10) : "",
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateGoal(goal.id, {
        title,
        description: description || null,
        target,
        current,
        unit,
        subject,
        deadline: deadline ? new Date(deadline).toISOString() : null,
      });
      onSaved(updated);
      onClose();
    } catch {}
    setSaving(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-950 p-6 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Edit goal</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full mt-1 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full mt-1 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wider">Target</label>
              <input
                type="number"
                min={1}
                value={target}
                onChange={(e) => setTarget(Math.max(1, Number(e.target.value)))}
                className="w-full mt-1 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wider">Current</label>
              <input
                type="number"
                min={0}
                value={current}
                onChange={(e) => setCurrent(Math.max(0, Number(e.target.value)))}
                className="w-full mt-1 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wider">Unit</label>
              <input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="%, cards, sessions"
                className="w-full mt-1 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider">Subject</label>
            <div className="flex items-center gap-2 flex-wrap mt-1">
              {SUBJECTS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSubject(subject === s.id ? null : s.id)}
                  className={`text-[11px] rounded-md px-2 py-1 border transition ${
                    subject === s.id
                      ? "border-violet-500 bg-violet-500/20 text-violet-300"
                      : "border-slate-800 text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {s.emoji} {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider">Deadline</label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full mt-1 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <button
            onClick={() => { if (confirm("Delete this goal?")) onDeleted(); }}
            className="text-sm text-red-400 hover:text-red-300 flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !title.trim()}
              className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-sm font-medium disabled:opacity-40 flex items-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}