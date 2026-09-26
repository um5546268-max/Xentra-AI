"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  BookOpen, Sparkles, Loader2, AlertCircle, Trash2, ChevronRight,
  FileText, Upload, Music,
} from "lucide-react";
import {
  LearnSession, StudyStats,
  learnFromTopic, learnFromText, learnFromFile,
  listLearnSessions, deleteLearnSession, getLearnStats,
} from "@/lib/learn";
import { getGamificationStats, GamificationStats } from "@/lib/gamification";
import { TopBar } from "@/components/home/TopBar";
import { HeroSection } from "@/components/home/HeroSection";
import { ImportRow } from "@/components/home/ImportRow";
import { SubjectGrid } from "@/components/home/SubjectGrid";
import { RightRail } from "@/components/home/RightRail";
import { BottomRow } from "@/components/home/BottomRow";

type Mode = "topic" | "text" | "upload";
type SubjectFilter = "all" | "languages" | "school" | "programming" | "science" | "personal";

const SUBJECTS: { id: SubjectFilter; label: string; emoji: string }[] = [
  { id: "all", label: "All", emoji: "📚" },
  { id: "languages", label: "Languages", emoji: "💬" },
  { id: "school", label: "School", emoji: "🎓" },
  { id: "programming", label: "Programming", emoji: "⌨️" },
  { id: "science", label: "Science", emoji: "🔬" },
  { id: "personal", label: "Personal", emoji: "🎯" },
];

function DesktopLearnInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ✅ FILTER: derived directly from URL — no state, no sync, no bugs
  const filter = (searchParams.get("subject") || "all") as SubjectFilter;

  // ── Generation state ──
  const [mode, setMode] = useState<Mode>("topic");
  const [topic, setTopic] = useState("");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [numConcepts, setNumConcepts] = useState(8);
  const [subject, setSubject] = useState<SubjectFilter>("all");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Data ──
  const [sessions, setSessions] = useState<LearnSession[]>([]);
  const [stats, setStats] = useState<StudyStats | null>(null);
  const [gamStats, setGamStats] = useState<GamificationStats | null>(null);

  // Reload sessions when filter changes
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [s, st] = await Promise.all([
          listLearnSessions(filter === "all" ? undefined : filter),
          getLearnStats(),
        ]);
        if (!cancelled) {
          setSessions(s);
          setStats(st);
        }
      } catch (e) {
        console.error("Failed to load sessions:", e);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [filter]);

  useEffect(() => {
    getGamificationStats().then(setGamStats).catch(() => {});
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      let session;
      const subj = subject === "all" ? undefined : subject;

      if (mode === "topic") {
        if (!topic.trim()) throw new Error("Enter a topic first");
        session = await learnFromTopic(topic.trim(), numConcepts, subj);
      } else if (mode === "text") {
        if (!text.trim() || text.trim().length < 20)
          throw new Error("Paste at least 20 characters");
        session = await learnFromText(title.trim() || "Untitled", text.trim(), subj);
      } else {
        if (!file) throw new Error("Choose a file first");
        session = await learnFromFile(file, title.trim() || undefined, subj);
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

  const formatSize = (bytes: number) => {
    if (bytes >= 1_000_000) return `${(bytes / 1e6).toFixed(1)} MB`;
    if (bytes >= 1_000) return `${(bytes / 1e3).toFixed(0)} KB`;
    return `${bytes} B`;
  };

  return (
    <div className="h-full flex flex-col bg-slate-950">
      <TopBar />

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-5">
            <HeroSection stats={gamStats} studyMinutesToday={60} />
            <ImportRow />
            <SubjectGrid />

            {/* Create session panel */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setMode("topic")}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                    mode === "topic"
                      ? "border-violet-500 bg-violet-500/20 text-violet-300"
                      : "border-slate-700 text-slate-500 hover:text-slate-300"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" /> Explore a topic
                </button>
                <button
                  type="button"
                  onClick={() => setMode("text")}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                    mode === "text"
                      ? "border-violet-500 bg-violet-500/20 text-violet-300"
                      : "border-slate-700 text-slate-500 hover:text-slate-300"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" /> Paste text
                </button>
                <button
                  type="button"
                  onClick={() => setMode("upload")}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                    mode === "upload"
                      ? "border-violet-500 bg-violet-500/20 text-violet-300"
                      : "border-slate-700 text-slate-500 hover:text-slate-300"
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" /> Upload a file
                </button>
              </div>

              <form onSubmit={handleGenerate} className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-slate-500">Subject:</span>
                  {SUBJECTS.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSubject(s.id)}
                      className={`text-xs rounded-md px-2 py-1 border transition ${
                        subject === s.id
                          ? "border-violet-500 bg-violet-500/20 text-violet-300"
                          : "border-slate-800 text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      {s.emoji} {s.label}
                    </button>
                  ))}
                </div>

                {mode === "topic" && (
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
                )}

                {mode === "text" && (
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
                      rows={6}
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-3 text-sm focus:border-violet-500 focus:outline-none resize-none"
                      disabled={loading}
                    />
                  </>
                )}

                {mode === "upload" && (
                  <>
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Optional title"
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-3 text-sm focus:border-violet-500 focus:outline-none"
                      disabled={loading}
                    />
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const f = e.dataTransfer.files?.[0];
                        if (f) setFile(f);
                      }}
                      className="rounded-xl border-2 border-dashed border-slate-700 hover:border-violet-500 transition p-6 text-center cursor-pointer space-y-2"
                    >
                      {file ? (
                        <>
                          <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center mx-auto">
                            {file.type.startsWith("audio/") ? (
                              <Music className="w-4 h-4 text-violet-300" />
                            ) : (
                              <FileText className="w-4 h-4 text-violet-300" />
                            )}
                          </div>
                          <div className="text-sm font-medium">{file.name}</div>
                          <div className="text-xs text-slate-500">
                            {formatSize(file.size)} · click to change
                          </div>
                        </>
                      ) : (
                        <>
                          <Upload className="w-6 h-6 text-slate-600 mx-auto" />
                          <div className="text-sm text-slate-400">
                            Drop a file or{" "}
                            <span className="text-violet-400">click to browse</span>
                          </div>
                          <div className="text-xs text-slate-600">
                            PDF · DOCX · TXT · MP3 · WAV · M4A (max 25 MB)
                          </div>
                        </>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.docx,.doc,.txt,.md,.mp3,.wav,.m4a,.webm,.ogg,.flac"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      className="hidden"
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
                      Generating… ({mode === "upload" ? "up to 60s" : "~20s"})
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

            {stats && (
              <div className="grid grid-cols-4 gap-3">
                <SmallStat label="Sessions" value={stats.total_sessions} />
                <SmallStat label="Flashcards" value={stats.total_flashcards} />
                <SmallStat label="Due Today" value={stats.due_today} accent />
                <SmallStat label="Mastered" value={stats.mastered} />
              </div>
            )}

            {/* Filter pills — using <Link>, active state derived from URL */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-500 mr-1">Filter:</span>
              {SUBJECTS.map((s) => (
                <Link
                  key={s.id}
                  href={s.id === "all" ? "/app/learn" : `/app/learn?subject=${s.id}`}
                  className={`text-xs rounded-md px-2.5 py-1.5 border transition inline-block ${
                    filter === s.id
                      ? "border-violet-500 bg-violet-500/20 text-violet-300"
                      : "border-slate-800 text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {s.emoji} {s.label}
                </Link>
              ))}
            </div>

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
                        {s.subject ? `${s.subject} · ` : ""}
                        {s.source_type === "topic" ? "Topic"
                          : s.source_type === "text" ? "Text"
                          : "File"} ·{" "}
                        {new Date(s.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(s.id);
                      }}
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
                {filter === "all"
                  ? "Nothing here yet. Enter a topic, paste text, or upload a file."
                  : `No sessions tagged as "${filter}".`}
              </div>
            )}

            <BottomRow />
          </div>
        </div>

        <RightRail stats={gamStats} />
      </div>
    </div>
  );
}

function SmallStat({
  label, value, accent,
}: { label: string; value: number; accent?: boolean }) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        accent ? "border-violet-500/40 bg-violet-500/5" : "border-slate-800 bg-slate-900/40"
      }`}
    >
      <div className="text-xs text-slate-500 uppercase tracking-wider">{label}</div>
      <div className={`text-2xl font-semibold mt-1 ${accent ? "text-violet-300" : ""}`}>
        {value}
      </div>
    </div>
  );
}

export default function DesktopLearn() {
  return (
    <Suspense fallback={null}>
      <DesktopLearnInner />
    </Suspense>
  );
}