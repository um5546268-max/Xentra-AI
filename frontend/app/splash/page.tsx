"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";

const STEPS = [
  { label: "Loading core system", ms: 700 },
  { label: "Connecting to AI assistant", ms: 800 },
  { label: "Loading your profile", ms: 600 },
  { label: "Syncing your data", ms: 700 },
  { label: "Preparing your sessions", ms: 600 },
];

export default function SplashPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);

  const [videoDone, setVideoDone] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  // ── Video ends → start loading checklist ──
  const handleVideoEnd = () => {
    setVideoDone(true);
  };

  // ── Loading checklist (runs AFTER video ends) ──
  useEffect(() => {
    if (!videoDone) return;

    let cancelled = false;
    let elapsed = 0;
    const total = STEPS.reduce((sum, s) => sum + s.ms, 0);

    const tick = () => {
      elapsed += 50;
      setProgress(Math.min(100, (elapsed / total) * 100));

      let cum = 0;
      for (let i = 0; i < STEPS.length; i++) {
        cum += STEPS[i].ms;
        if (elapsed < cum) {
          setStepIndex(i);
          break;
        }
      }

      if (elapsed < total && !cancelled) {
        setTimeout(tick, 50);
      } else if (!cancelled) {
        setStepIndex(STEPS.length);
        setDone(true);
        setTimeout(() => router.push("/welcome"), 700);
      }
    };

    tick();
    return () => { cancelled = true; };
  }, [videoDone, router]);

  // ── Autoplay may be blocked → fallback after 1 second if no play ──
  useEffect(() => {
    const t = setTimeout(() => {
      if (videoRef.current && videoRef.current.paused && !videoDone) {
        // Autoplay blocked — skip straight to checklist
        setVideoDone(true);
      }
    }, 1500);
    return () => clearTimeout(t);
  }, [videoDone]);

  return (
    <div className="min-h-screen bg-black relative overflow-hidden flex items-center justify-center">
      {/* ── FULLSCREEN INTRO VIDEO ── */}
      {!videoDone && (
        <video
          ref={videoRef}
          src="/x-intro.mp4"
          autoPlay
          muted
          playsInline
          preload="auto"
          onEnded={handleVideoEnd}
          onError={handleVideoEnd}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* ── LOADING CHECKLIST (appears after video) ── */}
      {videoDone && (
        <div className="relative z-10 flex flex-col items-center gap-8">
          {/* Your X logo */}
          <img
            src="/x-logo.png"
            alt="Xentra"
            className="w-32 h-32 object-contain drop-shadow-[0_0_40px_rgba(139,92,246,0.9)] animate-[fadeIn_0.6s_ease-out_both]"
          />

          <div className="w-full max-w-md rounded-2xl border border-violet-500/30 bg-slate-950/70 backdrop-blur-xl p-6 shadow-2xl">
            <div className="flex items-center justify-center gap-2 mb-5">
              {done ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-medium text-emerald-300">Ready</span>
                </>
              ) : (
                <>
                  <Loader2 className="w-4 h-4 text-violet-300 animate-spin" />
                  <span className="text-sm font-medium text-slate-200">
                    Starting Your Xentra Experience…
                  </span>
                </>
              )}
            </div>

            <div className="space-y-2.5">
              {STEPS.map((s, i) => {
                const isDone = i < stepIndex || done;
                const isCurrent = i === stepIndex && !done;
                return (
                  <div
                    key={i}
                    className="flex items-center gap-3 text-xs transition-opacity"
                    style={{ opacity: i <= stepIndex ? 1 : 0.4 }}
                  >
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                        isDone
                          ? "bg-emerald-500/20 border border-emerald-500/60"
                          : isCurrent
                          ? "bg-violet-500/20 border border-violet-500/60"
                          : "bg-slate-800 border border-slate-700"
                      }`}
                    >
                      {isDone ? (
                        <Check className="w-2.5 h-2.5 text-emerald-400" />
                      ) : isCurrent ? (
                        <Loader2 className="w-2.5 h-2.5 text-violet-300 animate-spin" />
                      ) : null}
                    </div>
                    <span
                      className={
                        isDone
                          ? "text-emerald-300/90 line-through"
                          : isCurrent
                          ? "text-slate-200"
                          : "text-slate-500"
                      }
                    >
                      {s.label}
                    </span>
                    <span className="ml-auto text-[10px] uppercase tracking-wider">
                      {isDone ? (
                        <span className="text-emerald-400/80">Ready</span>
                      ) : isCurrent ? (
                        <span className="text-violet-300/80">…</span>
                      ) : null}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 h-1 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-cyan-500 transition-all duration-100"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500 font-mono">
              <span>{done ? "Launching…" : "Initializing"}</span>
              <span>{Math.round(progress)}%</span>
            </div>
          </div>

          <div className="text-center space-y-2">
            <div className="text-xs uppercase tracking-[0.3em] text-slate-400">
              Learn · Study · Create · Achieve
            </div>
            <div className="text-xs text-slate-500 italic">
              "Big dreams need smart tools."
            </div>
            <div className="text-[10px] text-slate-600">— Xentra AI</div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.9); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}