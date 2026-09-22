"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { learnFromTopic, getResources, Resource } from "@/lib/learn";
import { ClassPicker } from "@/components/learn/ClassPicker";
import { ResourcesPanel } from "@/components/learn/ResourcesPanel";

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

  // Class picker state — remembers whether we're generating Learn or Resources
  const [pendingSubject, setPendingSubject] = useState<{
    id: string;
    label: string;
    intent: "learn" | "resources";
  } | null>(null);

  // Resources state
  const [resources, setResources] = useState<Resource[] | null>(null);
  const [resourcesFor, setResourcesFor] = useState<string | null>(null);

  const handleSubjectClick = (subjectId: string, label: string, intent: "learn" | "resources") => {
    setPendingSubject({ id: subjectId, label, intent });
  };

  const handleClassPicked = async (className: string) => {
    if (!pendingSubject) return;
    const { id, label, intent } = pendingSubject;
    setPendingSubject(null);
    setGenerating(id);
    setError(null);
    try {
      if (intent === "learn") {
        const session = await learnFromTopic(label, 8, "school", className);
        router.push(`/app/learn/${session.id}`);
      } else {
        // Resources — pass class hint so backend adapts
        setResourcesFor(`${label} · ${className.replace("_", " ")}`);
        const data = await getResources(label, className);
        setResources(data.resources);
      }
    } catch (e: any) {
      setError(e?.response?.data?.detail || e.message || "Failed");
      if (intent === "resources") setResourcesFor(null);
    } finally {
      setGenerating(null);
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto p-8 space-y-6">
        <button
          onClick={() => {
            if (resourcesFor) { setResourcesFor(null); setResources(null); }
            else router.push("/app/learn");
          }}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300"
        >
          <ArrowLeft className="w-4 h-4" />
          {resourcesFor ? "Back to subjects" : "Back to Learn"}
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-2xl">
            🎓
          </div>
          <div>
            <h1 className="text-2xl font-semibold">
              {resourcesFor ? `${resourcesFor} resources` : "School / College"}
            </h1>
            <p className="text-sm text-slate-500">
              {resourcesFor
                ? "Curated videos, websites, and PDFs for your class"
                : "Pick a subject — choose Learn to study, or Resources to browse"}
            </p>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {!resourcesFor && (
          <div className="grid grid-cols-4 gap-3">
            {SUBJECTS.map((s) => {
              const style = COLOR_MAP[s.color] ?? COLOR_MAP.cyan;
              const loading = generating === s.id;
              return (
                <div
                  key={s.id}
                  className={`rounded-xl border bg-gradient-to-br ${style} p-4 text-center space-y-2`}
                >
                  <div className="text-2xl">{s.emoji}</div>
                  <div className="text-sm font-medium">{s.label}</div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleSubjectClick(s.id, s.label, "learn")}
                      disabled={loading}
                      className="flex-1 flex items-center justify-center gap-1 rounded-md bg-violet-600 hover:bg-violet-500 py-1.5 text-[10px] font-medium text-white disabled:opacity-40"
                    >
                      {loading ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <>
                          <Sparkles className="w-2.5 h-2.5" />
                          Learn
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleSubjectClick(s.id, s.label, "resources")}
                      className="flex-1 rounded-md border border-slate-700 hover:bg-slate-800 py-1.5 text-[10px] text-slate-400"
                    >
                      Resources
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {resourcesFor && (
          <>
            {!resources && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                <div className="text-sm text-slate-500">
                  Finding the best resources for {resourcesFor}…
                </div>
              </div>
            )}
            {resources && <ResourcesPanel resources={resources} />}
          </>
        )}
      </div>

      {pendingSubject && (
        <ClassPicker
          subject={pendingSubject.label}
          loading={generating === pendingSubject.id}
          onClose={() => setPendingSubject(null)}
          onPick={handleClassPicked}
        />
      )}
    </div>
  );
}