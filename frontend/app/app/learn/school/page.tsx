"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { learnFromTopic } from "@/lib/learn";
import { ClassPicker } from "@/components/learn/ClassPicker";

const SUBJECTS = [
  { id: "math", label: "Mathematics", emoji: "📐", color: "cyan" },
  { id: "physics", label: "Physics", emoji: "⚛️", color: "violet" },
  { id: "chemistry", label: "Chemistry", emoji: "🧪", color: "emerald" },
  { id: "biology", label: "Biology", emoji: "🧬", color: "pink" },
  { id: "english_lit", label: "English", emoji: "📖", color: "amber" },
  { id: "history", label: "History", emoji: "🏛️", color: "amber" },
  { id: "geography", label: "Geography", emoji: "🌍", color: "cyan" },
  { id: "economics", label: "Economics", emoji: "💰", color: "emerald" },
  { id: "computer_science", label: "Computer Science", emoji: "💻", color: "violet" },
  { id: "islamiat", label: "Islamiat", emoji: "🕌", color: "emerald" },
  { id: "pak_studies", label: "Pakistan Studies", emoji: "🇵🇰", color: "emerald" },
  { id: "civics", label: "Civics", emoji: "🏛️", color: "cyan" },
];

const COLOR_MAP: Record<string, string> = {
  violet: "from-violet-600/30 to-violet-900/10 border-violet-500/30",
  cyan: "from-cyan-600/30 to-cyan-900/10 border-cyan-500/30",
  emerald: "from-emerald-600/30 to-emerald-900/10 border-emerald-500/30",
  amber: "from-amber-600/30 to-amber-900/10 border-amber-500/30",
  pink: "from-pink-600/30 to-pink-900/10 border-pink-500/30",
};

export default function SchoolPage() {
  const router = useRouter();
  const [generating, setGenerating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingSubject, setPendingSubject] = useState<{ id: string; label: string } | null>(null);

  const handleGenerate = async (subject: string, label: string, className: string) => {
    setPendingSubject(null);
    setGenerating(subject);
    setError(null);
    try {
      const session = await learnFromTopic(
        label,
        8,
        "school",
        className,
      );
      router.push(`/app/learn/${session.id}`);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e.message || "Failed to generate");
    } finally {
      setGenerating(null);
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto p-8 space-y-6">
        <button
          onClick={() => router.push("/app/learn")}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Learn
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-2xl">
            🎓
          </div>
          <div>
            <h1 className="text-2xl font-semibold">School / College</h1>
            <p className="text-sm text-slate-500">
              Pick a subject and class — content is tailored to your level
            </p>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="grid grid-cols-4 gap-3">
          {SUBJECTS.map((s) => {
            const style = COLOR_MAP[s.color] ?? COLOR_MAP.cyan;
            const loading = generating === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setPendingSubject({ id: s.id, label: s.label })}
                disabled={loading}
                className={`rounded-xl border bg-gradient-to-br ${style} p-4 text-center hover:scale-[1.03] transition disabled:opacity-60 space-y-2`}
              >
                <div className="text-2xl">{s.emoji}</div>
                <div className="text-sm font-medium">{s.label}</div>
                {loading ? (
                  <Loader2 className="w-3.5 h-3.5 mx-auto animate-spin text-cyan-300" />
                ) : (
                  <div className="text-[9px] text-slate-500 flex items-center justify-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" />
                    Learn
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {pendingSubject && (
        <ClassPicker
          subject={pendingSubject.label}
          loading={generating === pendingSubject.id}
          onClose={() => setPendingSubject(null)}
          onPick={(className) =>
            handleGenerate(pendingSubject.id, pendingSubject.label, className)
          }
        />
      )}
    </div>
  );
}