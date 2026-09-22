"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Plus, Trash2, Pin, Search, X, Loader2, StickyNote, Check, Tag,
  Sparkles, FileText, Clock, Hash, ChevronRight,
} from "lucide-react";
import {
  Note, listNotes, createNote, updateNote, deleteNote, SUBJECTS,
} from "@/lib/notes";

const COLOR_BG: Record<Note["color"], string> = {
  default: "border-slate-800 bg-slate-900/60",
  violet: "border-violet-500/30 bg-violet-500/10",
  cyan: "border-cyan-500/30 bg-cyan-500/10",
  emerald: "border-emerald-500/30 bg-emerald-500/10",
  amber: "border-amber-500/30 bg-amber-500/10",
  pink: "border-pink-500/30 bg-pink-500/10",
};

const COLOR_SWATCH: Record<Note["color"], string> = {
  default: "bg-slate-700",
  violet: "bg-violet-500",
  cyan: "bg-cyan-500",
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  pink: "bg-pink-500",
};

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = async () => {
    try {
      const ns = await listNotes();
      setNotes(ns);
      if (ns.length > 0 && !selectedId) setSelectedId(ns[0].id);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleNew = async () => {
    const n = await createNote({ title: "Untitled", body: "" });
    setNotes((prev) => [n, ...prev]);
    setSelectedId(n.id);
  };

  const handleUpdate = (updated: Note) => {
    setNotes((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
  };

  const handleDelete = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (selectedId === id) {
      const remaining = notes.filter((n) => n.id !== id);
      setSelectedId(remaining[0]?.id ?? null);
    }
  };

  const filtered = useMemo(() => {
    let result = notes;
    if (filter !== "all") {
      result = result.filter((n) => n.subject === filter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.body.toLowerCase().includes(q) ||
          (n.tags ?? []).some((t) => t.toLowerCase().includes(q)),
      );
    }
    return result;
  }, [notes, search, filter]);

  const selected = notes.find((n) => n.id === selectedId) ?? null;

  // Stats
  const stats = useMemo(() => {
    const total = notes.length;
    const subjects = new Set(notes.map((n) => n.subject).filter(Boolean)).size;
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const thisWeek = notes.filter((n) => new Date(n.created_at).getTime() > weekAgo).length;
    return { total, subjects, thisWeek };
  }, [notes]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Top bar */}
      <div className="border-b border-slate-800 px-6 py-3 flex items-center gap-3 shrink-0">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search your notes…"
            className="w-full rounded-lg border border-slate-800 bg-slate-950 pl-9 pr-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Hash className="w-3 h-3" /> {notes.length} notes
          </span>
        </div>
        <button
          onClick={handleNew}
          className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-sm font-medium flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New note
        </button>
      </div>

      {/* 3-column layout */}
      <div className="flex-1 overflow-hidden flex">
        {/* Column 1 — notes list */}
        <div className="w-72 shrink-0 border-r border-slate-800 overflow-y-auto">
          {/* Filter tabs */}
          <div className="p-3 border-b border-slate-800 flex items-center gap-1 flex-wrap sticky top-0 bg-slate-950 z-10">
            <FilterChip active={filter === "all"} onClick={() => setFilter("all")} label="All" />
            {SUBJECTS.slice(0, 5).map((s) => (
              <FilterChip
                key={s.id}
                active={filter === s.id}
                onClick={() => setFilter(s.id)}
                label={`${s.emoji} ${s.label}`}
              />
            ))}
          </div>

          {/* Notes */}
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-600">
              {search ? "No matches." : "No notes yet."}
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {filtered.map((n) => {
                const subj = SUBJECTS.find((s) => s.id === n.subject);
                const active = n.id === selectedId;
                return (
                  <button
                    key={n.id}
                    onClick={() => setSelectedId(n.id)}
                    className={`w-full text-left rounded-lg p-3 transition ${
                      active
                        ? "bg-slate-800 border border-violet-500/40"
                        : "border border-transparent hover:bg-slate-900"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className={`w-2 h-2 rounded-full mt-1.5 ${COLOR_SWATCH[n.color]}`} />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">
                          {n.title || "Untitled"}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {new Date(n.updated_at).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </div>
                        {subj && (
                          <span className="inline-block mt-1 text-[10px] rounded-full border border-slate-700 px-2 py-0.5 text-slate-400">
                            {subj.label}
                          </span>
                        )}
                      </div>
                      {n.pinned && <Pin className="w-3 h-3 text-amber-400 shrink-0" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Column 2 — editor */}
        <div className="flex-1 overflow-y-auto">
          {selected ? (
            <NoteEditor note={selected} onUpdate={handleUpdate} onDelete={handleDelete} />
          ) : (
            <div className="h-full flex items-center justify-center text-slate-600 text-sm">
              Select a note or create a new one.
            </div>
          )}
        </div>

        {/* Column 3 — right rail */}
        <div className="w-72 shrink-0 border-l border-slate-800 overflow-y-auto p-4 space-y-4">
          {/* AI Actions */}
          <RailCard title="AI Study Assistant" icon={<Sparkles className="w-4 h-4 text-violet-300" />} accent>
            <p className="text-[11px] text-slate-500 mb-3">
              Powered by Xentra AI
            </p>
            <div className="space-y-1.5">
              <RailAction icon={<FileText className="w-3.5 h-3.5" />} label="Summarize this note" />
              <RailAction icon={<StickyNote className="w-3.5 h-3.5" />} label="Create flashcards" />
              <RailAction icon={<Sparkles className="w-3.5 h-3.5" />} label="Make a quiz" />
              <RailAction icon={<Sparkles className="w-3.5 h-3.5" />} label="Explain in simple words" />
            </div>
            <button className="w-full mt-3 rounded-lg bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 py-2 text-xs font-medium">
              ✨ Ask AI
            </button>
          </RailCard>

          {/* Stats */}
          <RailCard title="Notes Stats" icon={<Hash className="w-4 h-4 text-emerald-300" />}>
            <div className="grid grid-cols-3 gap-2">
              <StatMini value={stats.total} label="Total" />
              <StatMini value={stats.subjects} label="Subjects" />
              <StatMini value={stats.thisWeek} label="This week" />
            </div>
          </RailCard>

          {/* Export (placeholder) */}
          <RailCard title="Export / Share" icon={<FileText className="w-4 h-4 text-cyan-300" />}>
            <div className="grid grid-cols-2 gap-2">
              <ExportBtn label="PDF" />
              <ExportBtn label="Image" />
              <ExportBtn label="Text" />
              <ExportBtn label="Share" />
            </div>
            <p className="text-[10px] text-slate-600 mt-2">
              Coming soon
            </p>
          </RailCard>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// Components
// ───────────────────────────────────────────────────────────
function FilterChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`text-[11px] rounded-md px-2 py-1 border transition ${
        active
          ? "border-violet-500 bg-violet-500/20 text-violet-300"
          : "border-slate-800 text-slate-500 hover:text-slate-300"
      }`}
    >
      {label}
    </button>
  );
}

function RailCard({
  title, icon, children, accent,
}: { title: string; icon: React.ReactNode; children: React.ReactNode; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 ${accent ? "border-violet-500/30 bg-violet-500/5" : "border-slate-800 bg-slate-900/40"}`}>
      <div className="flex items-center gap-2 text-xs font-medium mb-2">
        {icon}
        <span>{title}</span>
      </div>
      {children}
    </div>
  );
}

function RailAction({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px] text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition text-left">
      {icon}
      <span className="flex-1">{label}</span>
      <ChevronRight className="w-3 h-3" />
    </button>
  );
}

function StatMini({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-center rounded-lg border border-slate-800 bg-slate-950/60 py-2">
      <div className="text-lg font-semibold">{value}</div>
      <div className="text-[9px] text-slate-500 uppercase tracking-wider mt-0.5">{label}</div>
    </div>
  );
}

function ExportBtn({ label }: { label: string }) {
  return (
    <button
      disabled
      className="rounded-md border border-slate-800 bg-slate-950/60 py-2 text-[11px] text-slate-600 cursor-not-allowed"
    >
      {label}
    </button>
  );
}

// ───────────────────────────────────────────────────────────
// Editor
// ───────────────────────────────────────────────────────────
function NoteEditor({
  note, onUpdate, onDelete,
}: {
  note: Note;
  onUpdate: (n: Note) => void;
  onDelete: (id: string) => void;
}) {
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body);
  const [subject, setSubject] = useState(note.subject);
  const [pinned, setPinned] = useState(note.pinned);
  const [saving, setSaving] = useState(false);

  // Reset when the selected note changes
  useEffect(() => {
    setTitle(note.title);
    setBody(note.body);
    setSubject(note.subject);
    setPinned(note.pinned);
  }, [note.id]);

  // Autosave
  useEffect(() => {
    if (
      title === note.title &&
      body === note.body &&
      subject === note.subject &&
      pinned === note.pinned
    ) return;
    const id = setTimeout(async () => {
      setSaving(true);
      try {
        const updated = await updateNote(note.id, { title, body, subject, pinned });
        onUpdate(updated);
      } catch {}
      setSaving(false);
    }, 1000);
    return () => clearTimeout(id);
  }, [title, body, subject, pinned]);

  return (
    <div className="max-w-3xl mx-auto p-8 space-y-4">
      {/* Header row */}
      <div className="flex items-center gap-2 flex-wrap">
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
        <div className="flex-1" />
        {saving && (
          <span className="text-[11px] text-slate-500 flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" /> Saving…
          </span>
        )}
        {!saving && (
          <span className="text-[11px] text-emerald-500 flex items-center gap-1">
            <Check className="w-3 h-3" /> Saved
          </span>
        )}
        <button
          onClick={() => setPinned(!pinned)}
          className={`p-2 rounded-lg hover:bg-slate-800 ${pinned ? "text-amber-400" : "text-slate-500"}`}
          title={pinned ? "Unpin" : "Pin"}
        >
          <Pin className="w-4 h-4" />
        </button>
        <button
          onClick={() => { if (confirm("Delete this note?")) { deleteNote(note.id); onDelete(note.id); } }}
          className="p-2 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-red-400"
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Title */}
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Note title"
        className="w-full bg-transparent text-2xl font-semibold focus:outline-none placeholder-slate-600"
      />

      {/* Body */}
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Start writing… Use **bold**, *italic*, and ## headings for structure."
        className="w-full min-h-[500px] bg-transparent text-sm text-slate-300 focus:outline-none placeholder-slate-600 resize-none leading-relaxed"
      />

      <div className="text-[11px] text-slate-600 pt-2 border-t border-slate-800">
        Last updated {new Date(note.updated_at).toLocaleString()}
      </div>
    </div>
  );
}