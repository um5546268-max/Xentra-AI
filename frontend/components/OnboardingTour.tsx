"use client";

import { useEffect, useState } from "react";
import { X, ChevronRight, ChevronLeft, Sparkles } from "lucide-react";
import { completeTour } from "@/lib/onboarding";

type TourStep = {
  target: string;          // CSS selector to highlight
  title: string;
  body: string;
  position: "right" | "bottom" | "top" | "left";
};

const STEPS: TourStep[] = [
  {
    target: "[data-tour='sidebar']",
    title: "Your toolbox",
    body: "Everything lives here — Study, Notes, Media, Shopping, and more. Click any item to open it.",
    position: "right",
  },
  {
    target: "[data-tour='learn']",
    title: "Start learning",
    body: "Type any topic — Xentra builds flashcards and quizzes for you in seconds.",
    position: "right",
  },
  {
    target: "[data-tour='study-tools']",
    title: "Study tools",
    body: "Notes, Mind Maps, and Practice Tests are one click away. Click to expand.",
    position: "right",
  },
  {
    target: "[data-tour='progress']",
    title: "Track progress",
    body: "See points, streaks, and mastery over time. Stay motivated every day.",
    position: "right",
  },
  {
    target: "[data-tour='daily-briefing']",
    title: "Daily briefing",
    body: "Every morning, Xentra writes a personal note to kick-start your day. That's the habit.",
    position: "bottom",
  },
];

export function OnboardingTour({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [tick, setTick] = useState(0); // force re-measure

  const current = STEPS[step];

  // Measure target element
  useEffect(() => {
    const el = document.querySelector(current.target);
    if (!el) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setRect(r);
  }, [step, tick, current]);

  // Re-measure on resize/scroll
  useEffect(() => {
    const onResize = () => setTick((t) => t + 1);
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    const id = setInterval(onResize, 500); // catch layout shifts
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
      clearInterval(id);
    };
  }, []);

  // Keyboard nav
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const next = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
    else finish();
  };

  const back = () => {
    if (step > 0) setStep(step - 1);
  };

  const finish = async () => {
    try {
      await completeTour();
    } catch {}
    onComplete();
  };

  // Compute tooltip position relative to highlighted rect
  const tooltip = (() => {
    if (!rect) {
      return {
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      };
    }
    const GAP = 16;
    const W = 320;
    switch (current.position) {
      case "right":
        return {
          top: `${rect.top + rect.height / 2}px`,
          left: `${rect.right + GAP}px`,
          transform: "translateY(-50%)",
          maxWidth: `${W}px`,
        };
      case "left":
        return {
          top: `${rect.top + rect.height / 2}px`,
          left: `${rect.left - GAP}px`,
          transform: "translate(-100%, -50%)",
          maxWidth: `${W}px`,
        };
      case "bottom":
        return {
          top: `${rect.bottom + GAP}px`,
          left: `${rect.left + rect.width / 2}px`,
          transform: "translateX(-50%)",
          maxWidth: `${W}px`,
        };
      case "top":
        return {
          top: `${rect.top - GAP}px`,
          left: `${rect.left + rect.width / 2}px`,
          transform: "translate(-50%, -100%)",
          maxWidth: `${W}px`,
        };
    }
  })();

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Dark overlay with cutout via box-shadow */}
      {rect ? (
        <div
          className="absolute rounded-lg transition-all duration-300 pointer-events-none"
          style={{
            top: rect.top - 4,
            left: rect.left - 4,
            width: rect.width + 8,
            height: rect.height + 8,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.72)",
            border: "2px solid rgba(139,92,246,0.9)",
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-black/72" />
      )}

      {/* Click-catcher to prevent interaction with backdrop */}
      <div className="absolute inset-0" onClick={(e) => e.stopPropagation()} />

      {/* Tooltip */}
      <div
        className="absolute z-10 rounded-2xl border border-violet-500/40 bg-slate-950 p-4 shadow-2xl w-[320px] space-y-3"
        style={tooltip as React.CSSProperties}
      >
        <div className="flex items-start gap-2">
          <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-violet-300" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold">{current.title}</div>
            <div className="text-xs text-slate-400 leading-relaxed mt-1">
              {current.body}
            </div>
          </div>
          <button
            onClick={finish}
            className="p-1 rounded hover:bg-slate-800 text-slate-500 shrink-0"
            title="Skip tour"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all ${
                i === step
                  ? "bg-violet-500 w-6"
                  : i < step
                  ? "bg-violet-700 w-1.5"
                  : "bg-slate-800 w-1.5"
              }`}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1">
          <button
            onClick={finish}
            className="text-[11px] text-slate-500 hover:text-slate-300"
          >
            Skip tour
          </button>
          <div className="flex items-center gap-1.5">
            {step > 0 && (
              <button
                onClick={back}
                className="flex items-center gap-0.5 px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:bg-slate-800"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Back
              </button>
            )}
            <button
              onClick={next}
              className="flex items-center gap-0.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-xs font-medium"
            >
              {step === STEPS.length - 1 ? "Finish" : "Next"}
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Step counter */}
        <div className="text-[10px] text-slate-600 text-center">
          Step {step + 1} of {STEPS.length}
        </div>
      </div>
    </div>
  );
}