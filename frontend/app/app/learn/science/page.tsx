"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { learnFromTopic } from "@/lib/learn";

const TOPICS = [
  { id: "biology", label: "Biology", emoji: "🧬", color: "emerald" },
  { id: "chemistry", label: "Chemistry", emoji: "🧪", color: "emerald" },
  { id: "physics", label: "Physics", emoji: "⚛️", color: "violet" },
  { id: "astronomy", label: "Astronomy", emoji: "🔭", color: "violet" },
  { id: "neuroscience", label: "Neuroscience", emoji: "🧠", color: "pink" },
  { id: "genetics", label: "Genetics", emoji: "🧬", color: "emerald" },
  { id: "ecology", label: "Ecology", emoji: "🌱", color: "emerald" },
  { id: "anatomy", label: "Anatomy", emoji: "🫀", color: "red" },
  { id: "quantum", label: "Quantum Physics", emoji: "⚛️", color: "violet" },
  { id: "geology", label: "Geology", emoji: "🪨", color: "amber" },
  { id: "meteorology", label: "Meteorology", emoji: "🌦️", color: "cyan" },
  { id: "research", label: "Research Methods", emoji: "📊", color: "slate" },
];

const COLOR_MAP: Record<string, string> = {
  violet: "from-violet-600/30 to-violet-900/10 border-violet-500/30",
  cyan: "from-cyan-600/30 to-cyan-900/10 border-cyan-500/30",
  emerald: "from-emerald-600/30 to-emerald-900/10 border-emerald-500/30",
  amber: "from-amber-600/30 to-amber-900/10 border-amber-500/30",
  pink: "from-pink-600/30 to-pink-900/10 border-pink-500/30",
  red: "from-red-600/30 to-red-900/10 border-red-500/30",
  slate: "from-slate-600/30 to-slate-900/10 border-slate-500/30",
};

export default function SciencePage() {
  const router = useRouter();
  const [generating, setGenerating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleLearn = async (id: string, label: string) => {
    setGenerating(id);
    setError(null);
    try {
      const session = await learnFromTopic(label, 8, "science");
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
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-2xl">
            🔬
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Science & Research</h1>
            <p className="text-sm text-slate-500">Explore scientific fields</p>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="grid grid-cols-4 gap-3">
          {TOPICS.map((t) => (
            <Card
              key={t.id}
              emoji={t.emoji}
              label={t.label}
              color={t.color}
              loading={generating === t.id}
              onLearn={() => handleLearn(t.id, t.label)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function Card({
  emoji, label, color, loading, onLearn,
}: {
  emoji: string;
  label: string;
  color: string;
  loading: boolean;
  onLearn: () => void;
}) {
  const style = COLOR_MAP[color] ?? COLOR_MAP.violet;
  return (
    <div className={`rounded-xl border bg-gradient-to-br ${style} p-3 text-center space-y-2`}>
      <div className="text-2xl">{emoji}</div>
      <div className="text-sm font-medium">{label}</div>
      <button
        onClick={onLearn}
        disabled={loading}
        className="w-full flex items-center justify-center gap-1 rounded-md bg-violet-600 hover:bg-violet-500 py-1.5 text-[10px] font-medium text-white disabled:opacity-40"
      >
        {loading ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <>
            <Sparkles className="w-2.5 h-2.5" /> Learn
          </>
        )}
      </button>
    </div>
  );
}