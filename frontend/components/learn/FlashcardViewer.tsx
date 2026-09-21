"use client";

import { useMemo, useState } from "react";
import {
  ChevronLeft, ChevronRight, Shuffle, Check, X, RotateCw,
} from "lucide-react";
import { Flashcard, reviewFlashcard } from "@/lib/learn";

export function FlashcardViewer({ flashcards }: { flashcards: Flashcard[] }) {
  const [order, setOrder] = useState<number[]>(() =>
    flashcards.map((_, i) => i)
  );
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [reviewed, setReviewed] = useState<Record<string, "known" | "forgot">>({});
  const [busy, setBusy] = useState(false);

  const current = flashcards[order[idx]];

  const stats = useMemo(() => {
    const known = Object.values(reviewed).filter((v) => v === "known").length;
    const forgot = Object.values(reviewed).filter((v) => v === "forgot").length;
    return { known, forgot, total: flashcards.length };
  }, [reviewed, flashcards.length]);

  const handleNext = () => {
    setFlipped(false);
    setIdx((i) => (i + 1) % order.length);
  };

  const handlePrev = () => {
    setFlipped(false);
    setIdx((i) => (i - 1 + order.length) % order.length);
  };

  const handleShuffle = () => {
    const shuffled = [...order];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setOrder(shuffled);
    setIdx(0);
    setFlipped(false);
  };

  const handleReview = async (quality: number, kind: "known" | "forgot") => {
    if (busy) return;
    setBusy(true);
    try {
      await reviewFlashcard(current.id, quality);
      setReviewed((prev) => ({ ...prev, [current.id]: kind }));
      // Auto-advance
      setTimeout(handleNext, 250);
    } catch (e) {
      console.error("[learn] review failed:", e);
    } finally {
      setBusy(false);
    }
  };

  if (flashcards.length === 0) {
    return (
      <div className="text-center py-12 text-slate-600 text-sm">
        No flashcards in this session.
      </div>
    );
  }

  const progress = ((idx + 1) / order.length) * 100;

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>
            Card {idx + 1} of {order.length}
          </span>
          <span className="flex items-center gap-3">
            <span className="text-emerald-400">✓ {stats.known}</span>
            <span className="text-red-400">✗ {stats.forgot}</span>
          </span>
        </div>
        <div className="h-1 rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-violet-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Card */}
      <div
        onClick={() => setFlipped((f) => !f)}
        className="relative cursor-pointer select-none rounded-2xl border border-slate-800 bg-slate-900/60 min-h-[280px] flex items-center justify-center p-8 transition hover:border-slate-700"
      >
        <div className="text-center space-y-3 max-w-lg">
          <div className="text-xs uppercase tracking-wider text-slate-500">
            {flipped ? "Answer" : "Question"}
          </div>
          <div className="text-lg text-slate-100 leading-relaxed">
            {flipped ? current.answer : current.question}
          </div>
          {current.concept && (
            <div className="text-xs text-slate-600 pt-2">
              Concept: {current.concept}
            </div>
          )}
        </div>
        <div className="absolute bottom-3 right-3 flex items-center gap-1 text-[10px] text-slate-600">
          <RotateCw className="w-3 h-3" />
          {flipped ? "Click to see question" : "Click to reveal"}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            className="p-2 rounded-lg border border-slate-800 hover:bg-slate-800 text-slate-400"
            title="Previous"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleShuffle}
            className="p-2 rounded-lg border border-slate-800 hover:bg-slate-800 text-slate-400"
            title="Shuffle"
          >
            <Shuffle className="w-4 h-4" />
          </button>
          <button
            onClick={handleNext}
            className="p-2 rounded-lg border border-slate-800 hover:bg-slate-800 text-slate-400"
            title="Next"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleReview(1, "forgot")}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-lg border border-red-800 bg-red-950/40 px-4 py-2 text-sm text-red-300 hover:bg-red-950/60 disabled:opacity-40 transition"
          >
            <X className="w-4 h-4" />
            Forgot
          </button>
          <button
            onClick={() => handleReview(5, "known")}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-lg border border-emerald-800 bg-emerald-950/40 px-4 py-2 text-sm text-emerald-300 hover:bg-emerald-950/60 disabled:opacity-40 transition"
          >
            <Check className="w-4 h-4" />
            Knew it
          </button>
        </div>
      </div>
    </div>
  );
}