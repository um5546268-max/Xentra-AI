"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { learnFromTopic } from "@/lib/learn";

type Category = "programming" | "world" | "other";

const PROGRAMMING_LANGS = [
  { id: "python", label: "Python", emoji: "🐍", color: "emerald" },
  { id: "javascript", label: "JavaScript", emoji: "🟨", color: "amber" },
  { id: "typescript", label: "TypeScript", emoji: "🔵", color: "cyan" },
  { id: "cpp", label: "C / C++", emoji: "⚙️", color: "violet" },
  { id: "java", label: "Java", emoji: "☕", color: "red" },
  { id: "csharp", label: "C#", emoji: "🎯", color: "violet" },
  { id: "go", label: "Go", emoji: "🐹", color: "cyan" },
  { id: "rust", label: "Rust", emoji: "🦀", color: "amber" },
  { id: "php", label: "PHP", emoji: "🐘", color: "violet" },
  { id: "swift", label: "Swift", emoji: "🦅", color: "red" },
  { id: "kotlin", label: "Kotlin", emoji: "🟣", color: "violet" },
  { id: "sql", label: "SQL", emoji: "🗄️", color: "emerald" },
  { id: "html_css", label: "HTML & CSS", emoji: "🎨", color: "pink" },
  { id: "react", label: "React", emoji: "⚛️", color: "cyan" },
  { id: "nodejs", label: "Node.js", emoji: "🟢", color: "emerald" },
  { id: "bash", label: "Bash / Shell", emoji: "💻", color: "slate" },
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
  { id: "persian", label: "Persian (Farsi)", emoji: "🇮🇷" },
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

  const handleLanguageClick = async (langId: string, langLabel: string) => {
    setGenerating(langId);
    setError(null);
    try {
      const topic = category === "programming"
        ? `${langLabel} programming language`
        : `Learning ${langLabel} language`;
      const session = await learnFromTopic(topic, 8, category === "programming" ? "programming" : "languages");
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
        {/* Header */}
        <button
          onClick={() => category ? setCategory(null) : router.push("/app/learn")}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300"
        >
          <ArrowLeft className="w-4 h-4" />
          {category ? "Back to categories" : "Back to Learn"}
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/40 flex items-center justify-center text-2xl">
            💬
          </div>
          <div>
            <h1 className="text-2xl font-semibold">
              {category === "programming"
                ? "Programming Languages"
                : category === "world"
                ? "World Languages"
                : category === "other"
                ? "Other Languages"
                : "Languages"}
            </h1>
            <p className="text-sm text-slate-500">
              {category
                ? "Click any language to generate a personalized study session"
                : "Choose a category to explore"}
            </p>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Category selection */}
        {!category && (
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

        {/* Programming languages grid */}
        {category === "programming" && (
          <div className="grid grid-cols-4 gap-3">
            {PROGRAMMING_LANGS.map((lang) => (
              <LanguageCard
                key={lang.id}
                emoji={lang.emoji}
                label={lang.label}
                color={lang.color}
                loading={generating === lang.id}
                onClick={() => handleLanguageClick(lang.id, lang.label)}
              />
            ))}
          </div>
        )}

        {/* World languages grid */}
        {category === "world" && (
          <div className="grid grid-cols-4 gap-3">
            {WORLD_LANGS.map((lang) => (
              <LanguageCard
                key={lang.id}
                emoji={lang.emoji}
                label={lang.label}
                color="cyan"
                loading={generating === lang.id}
                onClick={() => handleLanguageClick(lang.id, lang.label)}
              />
            ))}
          </div>
        )}

        {/* Other */}
        {category === "other" && (
          <div className="text-center py-16 text-slate-600 text-sm space-y-2">
            <div className="text-4xl">🔜</div>
            <div>More language categories coming soon.</div>
          </div>
        )}
      </div>
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
  emoji, label, color, loading, onClick,
}: {
  emoji: string;
  label: string;
  color: string;
  loading: boolean;
  onClick: () => void;
}) {
  const style = COLOR_MAP[color] ?? COLOR_MAP.violet;
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`rounded-xl border bg-gradient-to-br ${style} p-4 text-center hover:scale-[1.03] transition disabled:opacity-60 disabled:cursor-wait space-y-2`}
    >
      <div className="text-2xl">{emoji}</div>
      <div className="text-sm font-medium">{label}</div>
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 mx-auto animate-spin text-violet-300" />
      ) : (
        <div className="text-[9px] text-slate-500 flex items-center justify-center gap-1">
          <Sparkles className="w-2.5 h-2.5" />
          Learn
        </div>
      )}
    </button>
  );
}