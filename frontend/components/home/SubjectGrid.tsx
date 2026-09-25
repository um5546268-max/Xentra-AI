"use client";

import Link from "next/link";

const SUBJECTS = [
  {
    id: "languages",
    label: "Languages",
    sub: "Learn any language with AI",
    emoji: "💬",
    gradient: "from-violet-600/30 via-violet-700/20 to-violet-900/10",
    border: "border-violet-500/30",
    tags: ["English", "Urdu", "Arabic", "+ More"],
  },
  {
    id: "school",
    label: "School / College",
    sub: "Class notes, books, lectures & more",
    emoji: "🎓",
    gradient: "from-cyan-600/30 via-cyan-700/20 to-cyan-900/10",
    border: "border-cyan-500/30",
    tags: ["Math", "Physics", "Chemistry", "+ More"],
  },
  {
    id: "programming",
    label: "Programming",
    sub: "Code, concepts, projects",
    emoji: "⌨️",
    gradient: "from-emerald-600/30 via-emerald-700/20 to-emerald-900/10",
    border: "border-emerald-500/30",
    tags: ["Python", "C++", "Java", "+ More"],
  },
  {
    id: "science",
    label: "Science & Research",
    sub: "Explore and learn faster",
    emoji: "🔬",
    gradient: "from-amber-600/30 via-amber-700/20 to-amber-900/10",
    border: "border-amber-500/30",
    tags: ["Biology", "History", "Geography"],
  },
  {
    id: "personal",
    label: "Personal Growth",
    sub: "Build better habits and skills",
    emoji: "🎯",
    gradient: "from-pink-600/30 via-pink-700/20 to-pink-900/10",
    border: "border-pink-500/30",
    tags: ["Productivity", "Public Speaking", "Communication"],
  },
];

export function SubjectGrid() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
          <span className="w-5 h-5 rounded bg-slate-800 flex items-center justify-center text-[10px]">
            📚
          </span>
          Choose What You Want to Learn
        </div>
        <button className="text-xs text-violet-400 hover:text-violet-300">
          View All →
        </button>
      </div>

      <div className="grid grid-cols-5 gap-3">
        {SUBJECTS.map((s) => (
          <Link
            key={s.id}
            href={`/app/learn/${s.id}`}
            className={`group block rounded-2xl border ${s.border} bg-gradient-to-br ${s.gradient} p-4 text-left hover:scale-[1.02] transition space-y-3 cursor-pointer`}
          >
            <div className="text-2xl">{s.emoji}</div>
            <div>
              <div className="text-sm font-semibold">{s.label}</div>
              <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">
                {s.sub}
              </div>
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              {s.tags.slice(0, 2).map((t) => (
                <span
                  key={t}
                  className="text-[9px] rounded-md bg-slate-950/60 border border-slate-800 px-1.5 py-0.5 text-slate-400"
                >
                  {t}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}