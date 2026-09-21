"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Layers, HelpCircle, BookOpen } from "lucide-react";
import {
  LearnSessionDetail,
  getLearnSession,
} from "@/lib/learn";
import { FlashcardViewer } from "@/components/learn/FlashcardViewer";
import { QuizViewer } from "@/components/learn/QuizViewer";

type Tab = "flashcards" | "quiz" | "summary";

export default function LearnSessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [session, setSession] = useState<LearnSessionDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("flashcards");

  useEffect(() => {
    getLearnSession(sessionId)
      .then(setSession)
      .catch((e) =>
        setError(e?.response?.data?.detail || "Failed to load session")
      );
  }, [sessionId]);

  if (error) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="rounded-lg border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto p-8 space-y-6">
        {/* Back */}
        <button
          onClick={() => router.push("/app/learn")}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Learn
        </button>

        {/* Title */}
        <div>
          <h1 className="text-3xl font-semibold">{session.title}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {session.flashcards.length} flashcards ·{" "}
            {session.latest_quiz?.questions.length ?? 0} quiz questions
          </p>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1">
          <TabBtn
            active={tab === "flashcards"}
            onClick={() => setTab("flashcards")}
            icon={<Layers className="w-3.5 h-3.5" />}
            label={`Flashcards (${session.flashcards.length})`}
          />
          {session.latest_quiz && (
            <TabBtn
              active={tab === "quiz"}
              onClick={() => setTab("quiz")}
              icon={<HelpCircle className="w-3.5 h-3.5" />}
              label={`Quiz (${session.latest_quiz.questions.length})`}
            />
          )}
          <TabBtn
            active={tab === "summary"}
            onClick={() => setTab("summary")}
            icon={<BookOpen className="w-3.5 h-3.5" />}
            label="Summary"
          />
        </div>

        {/* Content */}
        {tab === "flashcards" && (
          <FlashcardViewer flashcards={session.flashcards} />
        )}
        {tab === "quiz" && session.latest_quiz && (
          <QuizViewer
            attemptId={session.latest_quiz.id}
            questions={session.latest_quiz.questions}
          />
        )}
        {tab === "summary" && (
          <div className="space-y-4">
            {session.summary && (
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
                <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">
                  Summary
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {session.summary}
                </p>
              </div>
            )}
            {session.concepts && session.concepts.length > 0 && (
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-3">
                <div className="text-xs text-slate-500 uppercase tracking-wider">
                  Key concepts
                </div>
                {session.concepts.map((c, i) => (
                  <div key={i} className="space-y-1">
                    <div className="text-sm font-medium text-slate-200">
                      {c.concept}
                    </div>
                    <div className="text-xs text-slate-400 leading-relaxed">
                      {c.definition}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
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