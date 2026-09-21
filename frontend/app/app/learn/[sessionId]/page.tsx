"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { LearnSessionDetail, getLearnSession } from "@/lib/learn";

export default function LearnSessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [session, setSession] = useState<LearnSessionDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        <button
          onClick={() => router.push("/app/learn")}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Learn
        </button>

        <div>
          <h1 className="text-3xl font-semibold">{session.title}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {session.flashcards.length} flashcards ·{" "}
            {session.latest_quiz?.questions.length ?? 0} quiz questions
          </p>
        </div>

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

        <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-slate-500 text-sm">
          Flashcard + Quiz UI coming in the next step.
        </div>
      </div>
    </div>
  );
}