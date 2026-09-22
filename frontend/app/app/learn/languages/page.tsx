"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { learnFromTopic, getResources, Resource } from "@/lib/learn";
import { ClassPicker } from "@/components/learn/ClassPicker";
import { ResourcesPanel } from "@/components/learn/ResourcesPanel";

type Category = "programming" | "world" | "other";

const PROGRAMMING_LANGS = [
  { id: "python", label: "Python", emoji: "🐍", color: "emerald", noClass: true },
  { id: "javascript", label: "JavaScript", emoji: "🟨", color: "amber", noClass: true },
  { id: "typescript", label: "TypeScript", emoji: "🔵", color: "cyan", noClass: true },
  { id: "cpp", label: "C / C++", emoji: "⚙️", color: "violet", noClass: true },
  { id: "java", label: "Java", emoji: "☕", color: "red", noClass: true },
  { id: "csharp", label: "C#", emoji: "🎯", color: "violet", noClass: true },
  { id: "go", label: "Go", emoji: "🐹", color: "cyan", noClass: true },
  { id: "rust", label: "Rust", emoji: "🦀", color: "amber", noClass: true },
  { id: "php", label: "PHP", emoji: "🐘", color: "violet", noClass: true },
  { id: "swift", label: "Swift", emoji: "🦅", color: "red", noClass: true },
  { id: "kotlin", label: "Kotlin", emoji: "🟣", color: "violet", noClass: true },
  { id: "sql", label: "SQL", emoji: "🗄️", color: "emerald", noClass: true },
  { id: "html_css", label: "HTML & CSS", emoji: "🎨", color: "pink", noClass: true },
  { id: "react", label: "React", emoji: "⚛️", color: "cyan", noClass: true },
  { id: "nodejs", label: "Node.js", emoji: "🟢", color: "emerald", noClass: true },
  { id: "bash", label: "Bash / Shell", emoji: "💻", color: "slate", noClass: true },
];

const WORLD_LANGS = [
  { id: "english", label: "English", emoji: "🇬🇧" },
  { id: "arabic", label: "Arabic", emoji: "🇸🇦" },
  { id: "urdu", label: "Urdu", emoji: "🇵🇰" },
  { id: "spanish", label: "Spanish", emoji: "🇪🇸" },
  { id: "french", label: "French", emoji: "🇫🇷" },
  { id: "german", label: "German", emoji: "🇩🇪" },
  { id: "chinese_mandarin", label: "Chinese (Mandarin)", emoji: "🇨🇳" },
  { id: "japanese", label: "Japanese", emoji: "🇯🇵" },
  { id: "korean", label: "Korean", emoji: "🇰🇷" },
  { id: "hindi", label: "Hindi", emoji: "🇮🇳" },
  { id: "portuguese", label: "Portuguese", emoji: "🇵🇹" },
  { id: "italian", label: "Italian", emoji: "🇮🇹" },
  { id: "russian", label: "Russian", emoji: "🇷🇺" },
  { id: "turkish", label: "Turkish", emoji: "🇹🇷" },
  { id: "persian", label: "Persian", emoji: "🇮🇷" },
  { id: "bengali", label: "Bengali", emoji: "🇧🇩" },
  { id: "punjabi", label: "Punjabi", emoji: "🟠" },
  { id: "pashto", label: "Pashto", emoji: "🇦🇫" },
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

export default function LanguagesPage() {
  const router = useRouter();
  const [category, setCategory] = useState<Category | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Class picker state
  const [pendingSubject, setPendingSubject] = useState<{ id: string; label: string } | null>(null);

  // Resources state
  const [resources, setResources] = useState<Resource[] | null>(null);
  const [resourcesFor, setResourcesFor] = useState<string | null>(null);

  const handleLanguageClick = (langId: string, langLabel: string, noClass?: boolean) => {
    if (noClass) {
      generateSession(langId, langLabel, null);
    } else {
      setPendingSubject({ id: langId, label: langLabel });
    }
  };

  const generateSession = async (
    langId: string,
    langLabel: string,
    className: string | null,
  ) => {
    setPendingSubject(null);
    setGenerating(langId);
    setError(null);
    try {
      const topic =
        category === "programming"
          ? `${langLabel} programming language`
          : `Learning ${langLabel} language`;
      const session = await learnFromTopic(
        topic,
        8,
        category === "programming" ? "programming" : "languages",
        className ?? undefined,
      );
      router.push(`/app/learn/${session.id}`);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e.message || "Failed to generate");
    } finally {
      setGenerating(null);
    }
  };

    const handleShowResources = async (langId: string, langLabel: string) => {
    setResourcesFor(langLabel);
    setResources(null);
    try {
      const data = await getResources(
        category === "programming"
          ? `${langLabel} programming`
          : `${langLabel} language learning`,
      );
      setResources(data.resources);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed to load resources");
      setResourcesFor(null);
    }
  };
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto p-8 space-y-6">
        <button
          onClick={() => {
            if (resourcesFor) { setResourcesFor(null); setResources(null); }
            else if (category) setCategory(null);
            else router.push("/app/learn");
          }}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/40 flex items-center justify-center text-2xl">
            💬
          </div>
          <div>
            <h1 className="text-2xl font-semibold">
              {resourcesFor
                ? `${resourcesFor} resources`
                : category === "programming"
                ? "Programming Languages"
                : category === "world"
                ? "World Languages"
                : "Languages"}
            </h1>
            <p className="text-sm text-slate-500">
              {resourcesFor
                ? "Curated videos, websites, and PDFs"
                : category
                ? "Click Learn to study, or Resources to browse links"
                : "Choose a category"}
            </p>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Category selection */}
        {!category && !resourcesFor && (
          <div className="grid grid-cols-3 gap-3">
            <CategoryCard
              emoji="💻"
              label="Programming Languages"
              sub="Python · C++ · JavaScript · Rust · Java…"
              count={PROGRAMMING_LANGS.length}
              color="emerald"
              onClick={() => setCategory("programming")}
            />
            <CategoryCard
              emoji="🌍"
              label="World Languages"
              sub="Arabic · Spanish · Japanese · Korean · Urdu…"
              count={WORLD_LANGS.length}
              color="violet"
              onClick={() => setCategory("world")}
            />
            <CategoryCard
              emoji="📚"
              label="Other Languages"
              sub="More coming soon"
              count={0}
              color="cyan"
              onClick={() => setCategory("other")}
            />
          </div>
        )}

        {/* Programming languages */}
        {category === "programming" && !resourcesFor && (
          <div className="grid grid-cols-4 gap-3">
            {PROGRAMMING_LANGS.map((lang) => (
              <LanguageCard
                key={lang.id}
                emoji={lang.emoji}
                label={lang.label}
                color={lang.color}
                loading={generating === lang.id}
                onLearn={() => handleLanguageClick(lang.id, lang.label, true)}
                onResources={() => handleShowResources(lang.id, lang.label)}
              />
            ))}
          </div>
        )}

        {/* World languages */}
        {category === "world" && !resourcesFor && (
          <div className="grid grid-cols-4 gap-3">
            {WORLD_LANGS.map((lang) => (
              <LanguageCard
                key={lang.id}
                emoji={lang.emoji}
                label={lang.label}
                color="cyan"
                loading={generating === lang.id}
                onLearn={() => handleLanguageClick(lang.id, lang.label)}
                onResources={() => handleShowResources(lang.id, lang.label)}
              />
            ))}
          </div>
        )}

        {/* Resources view */}
        {resourcesFor && (
          <>
            {!resources && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
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
          onPick={(className) =>
            generateSession(pendingSubject.id, pendingSubject.label, className)
          }
        />
      )}
    </div>
  );
}

function CategoryCard({
  emoji, label, sub, count, color, onClick,
}: {
  emoji: string;
  label: string;
  sub: string;
  count: number;
  color: string;
  onClick: () => void;
}) {
  const style = COLOR_MAP[color] ?? COLOR_MAP.violet;
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl border bg-gradient-to-br ${style} p-5 text-left hover:scale-[1.02] transition space-y-3`}
    >
      <div className="text-3xl">{emoji}</div>
      <div>
        <div className="text-base font-semibold">{label}</div>
        <div className="text-xs text-slate-400 mt-1">{sub}</div>
      </div>
      <div className="flex items-center justify-between text-[10px] text-slate-500">
        <span>{count > 0 ? `${count} languages` : "Coming soon"}</span>
        <span>→</span>
      </div>
    </button>
  );
}

function LanguageCard({
  emoji, label, color, loading, onLearn, onResources,
}: {
  emoji: string;
  label: string;
  color: string;
  loading: boolean;
  onLearn: () => void;
  onResources: () => void;
}) {
  const style = COLOR_MAP[color] ?? COLOR_MAP.violet;
  return (
    <div
      className={`rounded-xl border bg-gradient-to-br ${style} p-3 text-center space-y-2`}
    >
      <div className="text-2xl">{emoji}</div>
      <div className="text-sm font-medium">{label}</div>
      <div className="flex gap-1">
        <button
          onClick={onLearn}
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
          onClick={onResources}
          className="flex-1 rounded-md border border-slate-700 hover:bg-slate-800 py-1.5 text-[10px] text-slate-400"
        >
          Resources
        </button>
      </div>
    </div>
  );
}