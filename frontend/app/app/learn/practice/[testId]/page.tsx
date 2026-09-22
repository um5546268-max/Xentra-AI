"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Loader2, Clock, CheckCircle2, XCircle, AlertCircle,
} from "lucide-react";
import {
  PracticeTestDetail,
  PracticeResult,
  getPracticeTest,
  submitPracticeTest,
} from "@/lib/practice";

export default function TakePracticeTest() {
  const params = useParams();
  const router = useRouter();
  const testId = params.testId as string;

  const [test, setTest] = useState<PracticeTestDetail | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [current, setCurrent] = useState(0);
  const [result, setResult] = useState<PracticeResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    getPracticeTest(testId)
      .then((t) => {
        setTest(t);
        if (!t.submitted_at) {
          setSecondsLeft(t.duration_minutes * 60);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [testId]);

  // Countdown
  useEffect(() => {
    if (secondsLeft === null || result || !test) return;
    if (secondsLeft <= 0) {
      handleSubmit(true);
      return;
    }
    const id = setInterval(() => setSecondsLeft((s) => (s !== null ? s - 1 : null)), 1000);
    return () => clearInterval(id);
  }, [secondsLeft, result, test]);

  const handleSubmit = async (auto = false) => {
    if (!test || submitting) return;
    if (!auto && !confirm(`Submit? You answered ${Object.keys(answers).length} of ${test.questions.length}.`)) {
      return;
    }
    setSubmitting(true);
    try {
      const ordered = test.questions.map((_, i) => answers[i] ?? -1);
      const res = await submitPracticeTest(test.id, ordered);
      setResult(res);
    } catch {}
    setSubmitting(false);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
      </div>
    );
  }

  if (!test) {
    return (
      <div className="h-full flex items-center justify-center text-slate-600 text-sm">
        Test not found.
      </div>
    );
  }

  // ── Results screen ──
  if (result) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="max-w-3xl mx-auto p-8 space-y-6">
          <button
            onClick={() => router.push("/app/learn/practice")}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Practice Tests
          </button>

          <div className={`rounded-2xl border p-8 text-center space-y-3 ${
            result.passed
              ? "border-emerald-500/40 bg-emerald-500/5"
              : "border-red-500/40 bg-red-500/5"
          }`}>
            {result.passed ? (
              <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-400" />
            ) : (
              <XCircle className="w-12 h-12 mx-auto text-red-400" />
            )}
            <div className={`text-5xl font-bold ${result.passed ? "text-emerald-400" : "text-red-400"}`}>
              {result.score}%
            </div>
            <div className="text-lg font-semibold">
              {result.passed ? "Passed! 🎉" : "Not quite"}
            </div>
            <div className="text-sm text-slate-400">
              {result.correct} of {result.total} correct · Pass mark {test.pass_threshold}%
            </div>
          </div>

          {/* Review */}
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-slate-300">Review</h2>
            {result.details.map((d, i) => {
              const correct = d.your_answer === d.correct_index;
              return (
                <div
                  key={i}
                  className={`rounded-lg border p-4 space-y-2 ${
                    correct ? "border-emerald-800/50 bg-emerald-950/20" : "border-red-800/50 bg-red-950/20"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {correct ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 text-sm font-medium">
                      {i + 1}. {d.question}
                    </div>
                  </div>
                  <div className="text-xs pl-6 space-y-1">
                    {!correct && d.your_answer !== null && d.your_answer >= 0 && (
                      <div className="text-red-400">
                        Your answer: {d.options[d.your_answer]}
                      </div>
                    )}
                    <div className="text-emerald-400">
                      Correct: {d.options[d.correct_index]}
                    </div>
                    {d.explanation && (
                      <div className="text-slate-500 italic pt-1">{d.explanation}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── Test-taking screen ──
  const q = test.questions[current];
  const answered = Object.keys(answers).length;
  const timeWarning = secondsLeft !== null && secondsLeft < 60;

  return (
    <div className="h-full flex flex-col">
      {/* Top bar */}
      <div className="border-b border-slate-800 px-6 py-3 flex items-center gap-4 shrink-0">
        <button
          onClick={() => { if (confirm("Quit test? Progress will be lost.")) router.push("/app/learn/practice"); }}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300"
        >
          <ArrowLeft className="w-4 h-4" />
          Quit
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{test.title}</div>
          <div className="text-[11px] text-slate-500">
            {answered} of {test.questions.length} answered
          </div>
        </div>
        {secondsLeft !== null && (
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono ${
            timeWarning
              ? "border-red-500 bg-red-500/10 text-red-300 animate-pulse"
              : "border-slate-800 bg-slate-900 text-slate-300"
          }`}>
            <Clock className="w-4 h-4" />
            {formatTime(secondsLeft)}
          </div>
        )}
        <button
          onClick={() => handleSubmit(false)}
          disabled={submitting}
          className="rounded-lg bg-cyan-600 hover:bg-cyan-500 px-4 py-2 text-sm font-medium disabled:opacity-40 flex items-center gap-2"
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          Submit
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-slate-900">
        <div
          className="h-full bg-cyan-500 transition-all"
          style={{ width: `${((current + 1) / test.questions.length) * 100}%` }}
        />
      </div>

      {/* Question */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-8 space-y-4">
          <div className="text-xs text-slate-500 uppercase tracking-wider">
            Question {current + 1} of {test.questions.length}
          </div>
          <div className="text-lg text-slate-100">{q.question}</div>

          <div className="space-y-2">
            {q.options.map((opt, i) => {
              const selected = answers[current] === i;
              return (
                <button
                  key={i}
                  onClick={() => setAnswers((a) => ({ ...a, [current]: i }))}
                  className={`w-full text-left rounded-lg border px-4 py-3 text-sm transition flex items-start gap-2 ${
                    selected
                      ? "border-cyan-500 bg-cyan-500/20 text-cyan-100"
                      : "border-slate-800 bg-slate-900/40 hover:border-slate-700"
                  }`}
                >
                  <span className="font-mono text-xs text-slate-500 mt-0.5">
                    {String.fromCharCode(65 + i)}.
                  </span>
                  <span className="flex-1">{opt}</span>
                </button>
              );
            })}
          </div>

          {/* Nav */}
          <div className="flex items-center justify-between pt-4">
            <button
              onClick={() => setCurrent((c) => Math.max(0, c - 1))}
              disabled={current === 0}
              className="px-4 py-2 rounded-lg border border-slate-800 text-sm text-slate-400 hover:bg-slate-800 disabled:opacity-40"
            >
              Previous
            </button>
            <div className="flex items-center gap-2">
              {Array.from({ length: test.questions.length }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`w-2.5 h-2.5 rounded-full transition ${
                    i === current
                      ? "bg-cyan-400 w-6"
                      : answers[i] !== undefined
                      ? "bg-cyan-700"
                      : "bg-slate-700"
                  }`}
                  title={`Question ${i + 1}`}
                />
              ))}
            </div>
            {current < test.questions.length - 1 ? (
              <button
                onClick={() => setCurrent((c) => c + 1)}
                className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-sm font-medium"
              >
                Next
              </button>
            ) : (
              <button
                onClick={() => handleSubmit(false)}
                disabled={submitting}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-sm font-medium disabled:opacity-40"
              >
                Finish
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}