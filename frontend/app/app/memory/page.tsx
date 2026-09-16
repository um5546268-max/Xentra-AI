"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Brain,
  Plus,
  Search,
  Loader2,
  AlertCircle,
  Check,
  X,
  Trash2,
  Pencil,
  Pin,
  PinOff,
  Sparkles,
  User,
  Briefcase,
  Repeat,
  BookOpen,
  AlertTriangle,
  StickyNote,
  Filter,
} from "lucide-react";
import {
  listMemories,
  createMemory,
  updateMemory,
  deleteMemory,
  deleteAllMemories,
  kindColor,
  importanceLabel,
  importanceColor,
  Memory,
  MemoryKind,
} from "@/lib/memory";

const KINDS: { id: MemoryKind; label: string; icon: any }[] = [
  { id: "preference", label: "Preference", icon: Sparkles },
  { id: "fact", label: "Fact", icon: User },
  { id: "project", label: "Project", icon: Briefcase },
  { id: "workflow", label: "Workflow", icon: Repeat },
  { id: "correction", label: "Correction", icon: AlertTriangle },
  { id: "note", label: "Note", icon: StickyNote },
];

export default function MemoryPage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<MemoryKind | "all">("all");

  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const loadMemories = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listMemories();
      setMemories(res.memories);
    } catch (err: any) {
      setError(
        err?.response?.data?.detail || err.message || "Failed to load memories"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMemories();
  }, []);

  const filtered = useMemo(() => {
    return memories.filter((m) => {
      if (kindFilter !== "all" && m.kind !== kindFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !m.key.toLowerCase().includes(q) &&
          !m.value.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [memories, kindFilter, search]);

  const handleTogglePin = async (m: Memory) => {
    try {
      const updated = await updateMemory(m.id, { pinned: !m.pinned });
      setMemories((prev) =>
        prev.map((x) => (x.id === m.id ? updated : x))
      );
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this memory?")) return;
    try {
      await deleteMemory(id);
      setMemories((prev) => prev.filter((m) => m.id !== id));
      setInfo("Memory deleted");
      setTimeout(() => setInfo(null), 2000);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message);
    }
  };

  const handleDeleteAll = async () => {
    if (
      !confirm(
        "Delete ALL memories? This cannot be undone. Xentra will forget everything it learned."
      )
    )
      return;
    try {
      await deleteAllMemories();
      setMemories([]);
      setInfo("All memories deleted");
      setTimeout(() => setInfo(null), 2500);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message);
    }
  };

  const handleSave = async (
    id: string,
    data: { key: string; value: string; importance: number }
  ) => {
    try {
      const updated = await updateMemory(id, data);
      setMemories((prev) =>
        prev.map((x) => (x.id === id ? updated : x))
      );
      setEditingId(null);
      setInfo("Memory updated");
      setTimeout(() => setInfo(null), 2000);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message);
    }
  };

  const handleCreate = async (data: {
    kind: MemoryKind;
    key: string;
    value: string;
    importance: number;
    pinned: boolean;
  }) => {
    try {
      const created = await createMemory(data);
      setMemories((prev) => [created, ...prev]);
      setShowCreate(false);
      setInfo("Memory created");
      setTimeout(() => setInfo(null), 2000);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message);
    }
  };

  const kindCounts = useMemo(() => {
    const counts: Record<string, number> = { all: memories.length };
    for (const m of memories) {
      counts[m.kind] = (counts[m.kind] || 0) + 1;
    }
    return counts;
  }, [memories]);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center">
            <Brain className="w-5 h-5 text-purple-300" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold">Memory</h1>
            <p className="text-sm text-slate-500">
              What Xentra knows about you. Edit freely.
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium hover:bg-violet-500 transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New memory
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="rounded-lg border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {info && (
          <div className="rounded-lg border border-emerald-800 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300 flex items-center gap-2">
            <Check className="w-4 h-4" />
            {info}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="Total memories"
            value={memories.length}
            color="text-purple-400"
          />
          <StatCard
            label="Pinned"
            value={memories.filter((m) => m.pinned).length}
            color="text-yellow-400"
          />
          <StatCard
            label="High importance"
            value={memories.filter((m) => m.importance >= 8).length}
            color="text-red-400"
          />
          <StatCard
            label="Auto-learned"
            value={memories.filter((m) => m.source === "auto").length}
            color="text-emerald-400"
          />
        </div>

        {/* Search + filter */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search memories…"
              className="w-full rounded-lg border border-slate-800 bg-slate-900 pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-600 focus:border-violet-500 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            <FilterBtn
              active={kindFilter === "all"}
              onClick={() => setKindFilter("all")}
              label={`All (${kindCounts.all || 0})`}
            />
            {KINDS.map((k) => {
              const count = kindCounts[k.id] || 0;
              if (count === 0) return null;
              const Icon = k.icon;
              return (
                <FilterBtn
                  key={k.id}
                  active={kindFilter === k.id}
                  onClick={() => setKindFilter(k.id)}
                  label={`${k.label} (${count})`}
                  icon={<Icon className="w-3 h-3" />}
                />
              );
            })}
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="text-center py-12 text-slate-600">
            <Loader2 className="w-5 h-5 animate-spin mx-auto" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <Brain className="w-12 h-12 mx-auto text-slate-700" />
            <div className="text-sm text-slate-500">
              {memories.length === 0
                ? "No memories yet. Chat with Xentra and it will learn about you."
                : "No memories match your filter."}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((m) => (
              <MemoryCard
                key={m.id}
                memory={m}
                isEditing={editingId === m.id}
                onStartEdit={() => setEditingId(m.id)}
                onCancelEdit={() => setEditingId(null)}
                onSave={(data) => handleSave(m.id, data)}
                onDelete={() => handleDelete(m.id)}
                onTogglePin={() => handleTogglePin(m)}
              />
            ))}
          </div>
        )}

        {/* Danger zone */}
        {memories.length > 0 && (
          <div className="rounded-2xl border border-red-900/50 bg-red-950/10 p-4 mt-8">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-red-300">
                  Forget everything
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Delete all {memories.length} memories. Cannot be undone.
                </div>
              </div>
              <button
                onClick={handleDeleteAll}
                className="rounded-lg border border-red-700 bg-red-950/40 px-4 py-2 text-sm text-red-300 hover:bg-red-900/40 transition"
              >
                Delete all
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <CreateMemoryModal
          onClose={() => setShowCreate(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}

// ============================================================
// Stat Card
// ============================================================

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
      <div className="text-xs text-slate-500 uppercase tracking-wider">
        {label}
      </div>
      <div className={`text-2xl font-bold mt-1 ${color}`}>{value}</div>
    </div>
  );
}

// ============================================================
// Filter Button
// ============================================================

function FilterBtn({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition ${
        active
          ? "border-violet-500 bg-violet-500/20 text-violet-300"
          : "border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// ============================================================
// Memory Card
// ============================================================

function MemoryCard({
  memory,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onSave,
  onDelete,
  onTogglePin,
}: {
  memory: Memory;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: (data: { key: string; value: string; importance: number }) => void;
  onDelete: () => void;
  onTogglePin: () => void;
}) {
  const [editKey, setEditKey] = useState(memory.key);
  const [editValue, setEditValue] = useState(memory.value);
  const [editImportance, setEditImportance] = useState(memory.importance);

  const kindInfo = KINDS.find((k) => k.id === memory.kind);
  const KindIcon = kindInfo?.icon || Sparkles;

  if (isEditing) {
    return (
      <div className="rounded-2xl border border-violet-500/40 bg-violet-500/5 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wider text-violet-300">
            Editing memory
          </span>
        </div>
        <input
          value={editKey}
          onChange={(e) => setEditKey(e.target.value)}
          placeholder="Key (short label)"
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none"
        />
        <textarea
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          placeholder="Value"
          rows={3}
          className="w-full resize-none rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none"
        />
        <div className="flex items-center gap-3">
          <label className="text-xs text-slate-400">Importance:</label>
          <input
            type="range"
            min={1}
            max={10}
            value={editImportance}
            onChange={(e) => setEditImportance(parseInt(e.target.value))}
            className="flex-1"
          />
          <span className={`text-sm font-mono ${importanceColor(editImportance)}`}>
            {editImportance} · {importanceLabel(editImportance)}
          </span>
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancelEdit}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            onClick={() =>
              onSave({
                key: editKey,
                value: editValue,
                importance: editImportance,
              })
            }
            className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs text-white hover:bg-violet-500"
          >
            Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group rounded-2xl border border-slate-800 bg-slate-900/40 p-4 hover:border-slate-700 transition">
      <div className="flex items-start gap-3">
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${kindColor(
            memory.kind
          )}`}
        >
          <KindIcon className="w-4 h-4" />
        </div>

        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-slate-200">
              {memory.key}
            </span>
            <span
              className={`rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wide font-semibold ${kindColor(
                memory.kind
              )}`}
            >
              {memory.kind}
            </span>
            {memory.source === "auto" && (
              <span className="rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px] px-1.5 py-0.5 font-medium">
                auto-learned
              </span>
            )}
            {memory.pinned && (
              <Pin className="w-3 h-3 text-yellow-400" fill="currentColor" />
            )}
          </div>
          <div className="text-sm text-slate-400 leading-relaxed">
            {memory.value}
          </div>
                    <div className="flex items-center gap-3 text-[11px] pt-1 flex-wrap">
            <span className={importanceColor(memory.importance)}>
              Importance {memory.importance}/10 · {importanceLabel(memory.importance)}
            </span>
            {memory.use_count > 0 && (
              <span className="text-slate-500">
                Used {memory.use_count} time{memory.use_count !== 1 ? "s" : ""}
                {memory.last_used_at && (
                  <> · last {new Date(memory.last_used_at).toLocaleDateString()}</>
                )}
              </span>
            )}
            <span className="text-slate-600">
              Created {new Date(memory.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
          <button
            onClick={onTogglePin}
            title={memory.pinned ? "Unpin" : "Pin"}
            className={`p-1.5 rounded hover:bg-slate-800 ${
              memory.pinned
                ? "text-yellow-400"
                : "text-slate-500 hover:text-yellow-400"
            }`}
          >
            {memory.pinned ? (
              <PinOff className="w-4 h-4" />
            ) : (
              <Pin className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={onStartEdit}
            title="Edit"
            className="p-1.5 rounded hover:bg-slate-800 text-slate-500 hover:text-violet-400"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            title="Delete"
            className="p-1.5 rounded hover:bg-slate-800 text-slate-500 hover:text-red-400"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Create Memory Modal
// ============================================================

function CreateMemoryModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (data: {
    kind: MemoryKind;
    key: string;
    value: string;
    importance: number;
    pinned: boolean;
  }) => void;
}) {
  const [kind, setKind] = useState<MemoryKind>("preference");
  const [key_, setKey] = useState("");
  const [value, setValue] = useState("");
  const [importance, setImportance] = useState(5);
  const [pinned, setPinned] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!key_.trim() || !value.trim()) return;
    onCreate({
      kind,
      key: key_.trim(),
      value: value.trim(),
      importance,
      pinned,
    });
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-6"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-950 p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">New memory</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Kind selector */}
        <div className="space-y-2">
          <label className="text-xs text-slate-500 uppercase tracking-wider">
            Type
          </label>
          <div className="grid grid-cols-3 gap-2">
            {KINDS.map((k) => {
              const Icon = k.icon;
              const active = kind === k.id;
              return (
                <button
                  key={k.id}
                  type="button"
                  onClick={() => setKind(k.id)}
                  className={`flex flex-col items-center gap-1.5 rounded-lg border p-2.5 transition ${
                    active
                      ? "border-violet-500 bg-violet-500/10"
                      : "border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${
                      active ? "text-violet-300" : "text-slate-500"
                    }`}
                  />
                  <span
                    className={`text-xs ${
                      active ? "text-violet-300" : "text-slate-400"
                    }`}
                  >
                    {k.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-slate-500 uppercase tracking-wider">
            Key (short label)
          </label>
          <input
            value={key_}
            onChange={(e) => setKey(e.target.value)}
            placeholder="e.g. preferred programming language"
            className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-violet-500 focus:outline-none"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs text-slate-500 uppercase tracking-wider">
            Value
          </label>
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="e.g. Python only, never TypeScript unless explicitly requested"
            rows={3}
            className="w-full resize-none rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-violet-500 focus:outline-none"
            required
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs text-slate-500 uppercase tracking-wider">
              Importance
            </label>
            <span
              className={`text-sm font-mono ${importanceColor(importance)}`}
            >
              {importance} · {importanceLabel(importance)}
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={10}
            value={importance}
            onChange={(e) => setImportance(parseInt(e.target.value))}
            className="w-full"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={pinned}
            onChange={(e) => setPinned(e.target.checked)}
            className="rounded"
          />
          Pin this memory (always loaded in chat)
        </label>

        <div className="flex gap-2 justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-900"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!key_.trim() || !value.trim()}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-40"
          >
            Create
          </button>
        </div>
      </form>
    </div>
  );
}