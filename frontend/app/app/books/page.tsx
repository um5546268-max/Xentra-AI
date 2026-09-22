"use client";

import { Book, Upload, Link2, Sparkles, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

export default function BooksPage() {
  const router = useRouter();

  const ACTIONS = [
    {
      icon: Upload,
      label: "Upload a book",
      sub: "PDF, DOCX, EPUB — your own files",
      gradient: "from-violet-600 to-violet-700",
      href: "/app/import?mode=file",
    },
    {
      icon: Link2,
      label: "Add from URL",
      sub: "Link to a book on Gutenberg, OpenStax, etc.",
      gradient: "from-cyan-600 to-cyan-700",
      href: "/app/import?mode=url",
    },
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/40 flex items-center justify-center">
            <Book className="w-5 h-5 text-violet-300" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Books</h1>
            <p className="text-sm text-slate-500">
              Upload your textbooks and turn them into flashcards, quizzes, and mind maps.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {ACTIONS.map((a) => {
            const Icon = a.icon;
            return (
              <button
                key={a.label}
                onClick={() => router.push(a.href)}
                className={`flex items-center gap-3 rounded-2xl p-4 text-left text-white bg-gradient-to-br ${a.gradient} hover:brightness-110 transition shadow-lg`}
              >
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{a.label}</div>
                  <div className="text-[10px] opacity-80">{a.sub}</div>
                </div>
                <ChevronRight className="w-4 h-4 opacity-60" />
              </button>
            );
          })}
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="w-4 h-4 text-violet-300" />
            Coming soon
          </div>
          <ul className="text-xs text-slate-500 space-y-1.5 list-disc list-inside">
            <li>Curated library of free textbooks (Gutenberg, OpenStax, NCERT)</li>
            <li>In-app reader with highlights and bookmarks</li>
            <li>&ldquo;Ask Xentra about this page&rdquo; while reading</li>
            <li>Generate flashcards per chapter</li>
          </ul>
        </div>
      </div>
    </div>
  );
}