"use client";

import { useState } from "react";
import { Check, X, Loader2, Award, RotateCcw } from "lucide-react";
import { QuizQuestion, submitQuiz, QuizResult } from "@/lib/learn";

export function QuizViewer({
  attemptId,
  questions,
}: {
  attemptId: string;
  questions: QuizQuestion[];
}) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [current, setCurrent] = useState(0);
  const [submitted, setSubmitted] = useState<QuizResult | null>(null);
  const [loading, setLoading] = useState(false);

  const q = questions[current];
  const chosen = answers[current];

  const handleSelect = (optionIdx: number) => {
    if (chosen !== undefined) return; // already answered
    setAnswers((prev) => ({ ...prev, [current]: optionIdx }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const ordered = questions.map((_, i) => answers[i] ?? -1);
      const result = await submitQuiz(attemptId, ordered);
      setSubmitted(result);
    } catch (e) {
      console.error("[learn] quiz submit failed:", e);
    } finally {
      setLoading(false);
    }
  };

  // ── Result screen ──
  if (submitted) {
    const pct = submitted.score;
    const color =
      pct >= 80 ? "text-emerald-400" : pct >= 50 ? "text-yellow-400" : "text-red-400";
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center space-y-3">
          <Award className={`w-12 h-12 mx-auto ${color}`} />
          <div className={`text-5xl font-bold ${color}`}>{pct}%</div>
          <div className="text-sm text-slate-400">
            You got {submitted.correct} of {submitted.total} correct
          </div>
        </div>

        <div className="space-y-3">
          {submitted.details.map((d, i) => {
            const correct = d.your_answer === d.correct_index;
            return (
              <div
                key={i}
                className={`rounded-lg border p-4 space-y-2 ${
                  correct
                    ? "border-emerald-800/50 bg-emerald-950/20"
                    : "border-red-800/50 bg-red-950/20"
                }`}
              >
                <div className="flex items-start gap-2">
                  {correct ? (
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <X className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 text-sm text-slate-200">
                    {d.question}
                  </div>
                </div>
                <div className="text-xs text-slate-400 pl-6 space-y-1">
                  {!correct && d.your_answer !== null && (
                    <div className="text-red-400">
                      Your answer: {questions[i].options[d.your_answer]}
                    </div>
                  )}
                  <div className="text-emerald-400">
                    Correct: {questions[i].options[d.correct_index]}
                  </div>
                  <div className="text-slate-500 italic pt-1">
                    {d.explanation}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={() => {
            setSubmitted(null);
            setAnswers({});
            setCurrent(0);
          }}
          className="w-full rounded-lg border border-slate-800 bg-slate-900 px-5 py-3 text-sm font-medium hover:bg-slate-800 flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Retake quiz
        </button>
      </div>
    );
  }

  // ── Question screen ──
  const answered = chosen !== undefined;
  const allAnswered = Object.keys(answers).length === questions.length;

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>
          Question {current + 1} of {questions.length}
        </span>
        <span>{Object.keys(answers).length} answered</span>
      </div>
      <div className="h-1 rounded-full bg-slate-800 overflow-hidden">
        <div
          className="h-full bg-violet-500 transition-all duration-300"
          style={{ width: `${((current + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Question */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
        <div className="text-base text-slate-100">{q.question}</div>
        <div className="space-y-2">
          {q.options.map((opt, i) => {
            const isChosen = chosen === i;
            const isCorrect = i === q.correct_index;
            let style =
              "border-slate-800 bg-slate-950 hover:border-slate-700 text-slate-300";
            if (answered) {
              if (isCorrect) style = "border-emerald-500 bg-emerald-950/40 text-emerald-200";
              else if (isChosen) style = "border-red-500 bg-red-950/40 text-red-200";
              else style = "border-slate-800 bg-slate-950 text-slate-500";
            }
            return (
              <button
                key={i}
                onClick={() => handleSelect(i)}
                disabled={answered}
                className={`w-full text-left rounded-lg border px-4 py-3 text-sm transition flex items-start gap-2 ${style}`}
              >
                <span className="font-mono text-xs text-slate-500 mt-0.5">
                  {String.fromCharCode(65 + i)}.
                </span>
                <span className="flex-1">{opt}</span>
                {answered && isCorrect && (
                  <Check className="w-4 h-4 shrink-0 mt-0.5" />
                )}
                {answered && isChosen && !isCorrect && (
                  <X className="w-4 h-4 shrink-0 mt-0.5" />
                )}
              </button>
            );
          })}
        </div>

        {answered && (
          <div className="rounded-lg bg-slate-950/60 border border-slate-800 p-3 text-xs text-slate-400">
            <span className="text-slate-500">Why: </span>
            {q.explanation}
          </div>
        )}
      </div>

      {/* Nav */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrent((c) => Math.max(0, c - 1))}
          disabled={current === 0}
          className="px-4 py-2 rounded-lg border border-slate-800 text-sm text-slate-400 hover:bg-slate-800 disabled:opacity-40 transition"
        >
          Previous
        </button>

        {current < questions.length - 1 ? (
          <button
            onClick={() => setCurrent((c) => c + 1)}
            className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-sm font-medium transition"
          >
            Next question
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!allAnswered || loading}
            className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-sm font-medium disabled:opacity-40 flex items-center gap-2 transition"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Finish quiz
          </button>
        )}
      </div>
    </div>
  );
}