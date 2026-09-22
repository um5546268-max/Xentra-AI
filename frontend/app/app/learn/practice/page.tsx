"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ClipboardList, Plus, Loader2, Trash2, ChevronRight, Clock, Target, CheckCircle2, XCircle,
} from "lucide-react";
import {
  PracticeTest, listPracticeTests, createPracticeTest, deletePracticeTest,
} from "@/lib/practice";
import { SUBJECTS } from "@/lib/notes";

export default function PracticeTestsPage() {
  const router = useRouter();
  const [tests, setTests] = useState<PracticeTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const load = async () => {
    try {
      setTests(await listPracticeTests());
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this practice test?")) return;
    await deletePracticeTest(id);
    setTests((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-cyan-300" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">Practice Tests</h1>
              <p className="text-sm text-slate-500">
                Timed exams with 30 questions. Simulate the real thing.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowNew(true)}
            className="rounded-lg bg-cyan-600 hover:bg-cyan-500 px-4 py-2 text-sm font-medium flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New test
          </button>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
          </div>
        ) : tests.length === 0 ? (
          <div className="text-center py-16 text-slate-600 text-sm space-y-2">
            <ClipboardList className="w-10 h-10 mx-auto text-slate-700" />
            <div>No practice tests yet. Create one to start prepping.</div>
          </div>
        ) : (
          <div className="space-y-2">
            {tests.map((t) => {
              const subj = SUBJECTS.find((s) => s.id === t.subject);
              const done = t.submitted_at !== null;
              return (
                <div
                  key={t.id}
                  onClick={() => router.push(`/app/learn/practice/${t.id}`)}
                  className="group flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/40 p-4 hover:bg-slate-900 transition cursor-pointer"
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    done
                      ? t.passed ? "bg-emerald-500/20" : "bg-red-500/20"
                      : "bg-cyan-500/20"
                  }`}>
                    {done ? (
                      t.passed
                        ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        : <XCircle className="w-4 h-4 text-red-400" />
                    ) : (
                      <ClipboardList className="w-4 h-4 text-cyan-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{t.title}</div>
                    <div className="text-xs text-slate-500 flex items-center gap-3 mt-0.5">
                      <span className="flex items-center gap-1">
                        <Target className="w-3 h-3" /> {t.question_count} questions
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {t.duration_minutes} min
                      </span>
                      {subj && <span>· {subj.emoji} {subj.label}</span>}
                      {done && (
                        <span className={`ml-auto font-mono ${t.passed ? "text-emerald-400" : "text-red-400"}`}>
                          {t.score}% {t.passed ? "PASS" : "FAIL"}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }}
                    className="p-2 rounded-lg hover:bg-slate-800 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <ChevronRight className="w-4 h-4 text-slate-600" />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showNew && (
        <NewTestDialog
          onClose={() => setShowNew(false)}
          onCreated={(t) => {
            setTests((prev) => [t, ...prev]);
            setShowNew(false);
            router.push(`/app/learn/practice/${t.id}`);
          }}
        />
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// New test dialog
// ───────────────────────────────────────────────────────────
function NewTestDialog({
  onClose, onCreated,
}: {
  onClose: () => void;
  onCreated: (t: PracticeTest) => void;
}) {
  const [topic, setTopic] = useState("");
  const [subject, setSubject] = useState<string | null>(null);
  const [numQuestions, setNumQuestions] = useState(20);
  const [duration, setDuration] = useState(30);
  const [passThreshold, setPassThreshold] = useState(70);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const test = await createPracticeTest({
        topic: topic.trim(),
        subject,
        num_questions: numQuestions,
        duration_minutes: duration,
        pass_threshold: passThreshold,
      });
      onCreated(test);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed to generate test");
    } finally {
      setLoading(false);
    }
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
        <h3 className="text-lg font-semibold">Create practice test</h3>

        <div>
          <label className="text-xs text-slate-500 uppercase tracking-wider">Topic</label>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Python basics, Photosynthesis…"
            className="w-full mt-1 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none"
          />
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
                    ? "border-cyan-500 bg-cyan-500/20 text-cyan-300"
                    : "border-slate-800 text-slate-500 hover:text-slate-300"
                }`}
              >
                {s.emoji} {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider">Questions</label>
            <input
              type="number" min={10} max={50}
              value={numQuestions}
              onChange={(e) => setNumQuestions(Number(e.target.value))}
              className="w-full mt-1 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider">Minutes</label>
            <input
              type="number" min={5} max={120}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full mt-1 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider">Pass %</label>
            <input
              type="number" min={0} max={100}
              value={passThreshold}
              onChange={(e) => setPassThreshold(Number(e.target.value))}
              className="w-full mt-1 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-xs text-red-300">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800">
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={loading || !topic.trim()}
            className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-sm font-medium disabled:opacity-40 flex items-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? "Generating…" : "Generate test"}
          </button>
        </div>

        {loading && (
          <div className="text-xs text-slate-500 text-center">
            Generating {numQuestions} questions… (30-60 seconds)
          </div>
        )}
      </div>
    </div>
  );
}