"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen, Sparkles, Loader2, AlertCircle, Trash2, ChevronRight,
  GraduationCap, FileText,
} from "lucide-react";
import {
  LearnSession, StudyStats,
  learnFromTopic, learnFromText,
  listLearnSessions, deleteLearnSession, getLearnStats,
} from "@/lib/learn";

type Mode = "topic" | "text";

export default function LearnPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("topic");
  const [topic, setTopic] = useState("");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [numConcepts, setNumConcepts] = useState(8);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<LearnSession[]>([]);
  const [stats, setStats] = useState<StudyStats | null>(null);

  const loadAll = async () => {
    try {
      const [s, st] = await Promise.all([listLearnSessions(), getLearnStats()]);
      setSessions(s);
      setStats(st);
    } catch (e: any) {
      // silent — not critical
    }
  };

  useEffect(() => { loadAll(); }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      let session;
      if (mode === "topic") {
        if (!topic.trim()) throw new Error("Enter a topic first");
        session = await learnFromTopic(topic.trim(), numConcepts);
      } else {
        if (!text.trim() || text.trim().length < 20) throw new Error("Paste at least 20 characters");
        session = await learnFromText(title.trim() || "Untitled", text.trim());
      }
      router.push(`/app/learn/${session.id}`);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e.message || "Failed to generate");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this session?")) return;
    try {
      await deleteLearnSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch {}
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto p-8 space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/40 flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-violet-300" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Learn</h1>
            <p className="text-sm text-slate-500">
              Turn any topic into flashcards and quizzes in seconds.
            </p>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-4 gap-3">
            <StatCard label="Sessions" value={stats.total_sessions} />
            <StatCard label="Flashcards" value={stats.total_flashcards} />
            <StatCard label="Due today" value={stats.due_today} accent />
            <StatCard label="Mastered" value={stats.mastered} />
          </div>
        )}

        {/* Creation panel */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <TabBtn active={mode === "topic"} onClick={() => setMode("topic")} icon={<Sparkles className="w-3.5 h-3.5" />} label="Explore a topic" />
            <TabBtn active={mode === "text"} onClick={() => setMode("text")} icon={<FileText className="w-3.5 h-3.5" />} label="Paste text" />
          </div>

          <form onSubmit={handleGenerate} className="space-y-3">
            {mode === "topic" ? (
              <>
                <input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Photosynthesis, React hooks, Mughal Empire…"
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-3 text-sm focus:border-violet-500 focus:outline-none"
                  disabled={loading}
                />
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span>Concepts:</span>
                  <input
                    type="range" min={4} max={12} value={numConcepts}
                    onChange={(e) => setNumConcepts(Number(e.target.value))}
                    className="accent-violet-500"
                  />
                  <span className="font-mono">{numConcepts}</span>
                </div>
              </>
            ) : (
              <>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Title (e.g. Chapter 5 notes)"
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-3 text-sm focus:border-violet-500 focus:outline-none"
                  disabled={loading}
                />
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Paste your notes, article, or lecture transcript…"
                  rows={8}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-3 text-sm focus:border-violet-500 focus:outline-none resize-none"
                  disabled={loading}
                />
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-violet-600 px-5 py-3 text-sm font-medium hover:bg-violet-500 disabled:opacity-40 transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating… (takes ~20s)
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate flashcards + quiz
                </>
              )}
            </button>
          </form>

          {error && (
            <div className="rounded-lg border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              {error}
            </div>
          )}
        </div>

        {/* Sessions list */}
        {sessions.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider px-1">
              Your sessions
            </div>
            {sessions.map((s) => (
              <div
                key={s.id}
                className="group flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/40 p-4 hover:bg-slate-900 transition cursor-pointer"
                onClick={() => router.push(`/app/learn/${s.id}`)}
              >
                <div className="w-9 h-9 rounded-lg bg-violet-500/20 flex items-center justify-center shrink-0">
                  <BookOpen className="w-4 h-4 text-violet-300" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{s.title}</div>
                  <div className="text-xs text-slate-500 truncate">
                    {s.source_type === "topic" ? "Topic" : "Text"} ·{" "}
                    {new Date(s.created_at).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }}
                  className="p-2 rounded-lg hover:bg-slate-800 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </div>
            ))}
          </div>
        )}

        {sessions.length === 0 && !loading && (
          <div className="text-center py-12 text-slate-600 text-sm">
            Nothing here yet. Enter a topic above and Xentra will build your
            flashcards and quiz.
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${accent ? "border-violet-500/40 bg-violet-500/5" : "border-slate-800 bg-slate-900/40"}`}>
      <div className="text-xs text-slate-500 uppercase tracking-wider">{label}</div>
      <div className={`text-2xl font-semibold mt-1 ${accent ? "text-violet-300" : ""}`}>{value}</div>
    </div>
  );
}

function TabBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
        active
          ? "border-violet-500 bg-violet-500/20 text-violet-300"
          : "border-slate-700 text-slate-500 hover:text-slate-300"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}