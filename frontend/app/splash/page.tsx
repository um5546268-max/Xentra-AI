"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { XHologram } from "@/components/brand/XHologram";

const STEPS = [
  { label: "Loading core system", ms: 700 },
  { label: "Connecting to AI assistant", ms: 800 },
  { label: "Loading your profile", ms: 600 },
  { label: "Syncing your data", ms: 700 },
  { label: "Preparing your sessions", ms: 600 },
];

// Free Unsplash image — mountain landscape at dusk with purple/cyan glow
const BG_URL =
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=2000&q=80";

export default function SplashPage() {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let elapsed = 0;
    const total = STEPS.reduce((sum, s) => sum + s.ms, 0);

    const tick = () => {
      elapsed += 50;
      const pct = Math.min(100, (elapsed / total) * 100);
      setProgress(pct);

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
  }, [router]);

  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-950">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${BG_URL})` }}
      />

      {/* Dark + purple gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/85 via-violet-950/60 to-slate-950/95" />

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(139,92,246,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.6) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Glow vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 50% 55%, rgba(139,92,246,0.25) 0%, transparent 60%)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 py-12">
        {/* X hologram */}
        <div className="mb-8">
          <XHologram size={200} />
        </div>

        {/* Brand text */}
        <h1 className="text-5xl font-bold tracking-[0.15em] bg-gradient-to-r from-violet-300 via-cyan-200 to-violet-300 bg-clip-text text-transparent drop-shadow-[0_0_25px_rgba(139,92,246,0.6)]">
          XENTRA AI
        </h1>
        <p className="text-sm text-slate-300 tracking-[0.35em] uppercase mt-3">
          Your AI Operating Assistant
        </p>

        {/* Loading card */}
        <div className="mt-12 w-full max-w-md rounded-2xl border border-violet-500/30 bg-slate-950/60 backdrop-blur-xl p-6 shadow-2xl">
          <div className="flex items-center justify-center gap-2 mb-5">
            {done ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-medium text-emerald-300">
                  Ready
                </span>
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

          {/* Checklist */}
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

          {/* Progress bar */}
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

        {/* Tagline */}
        <div className="mt-10 text-center">
          <div className="text-xs uppercase tracking-[0.3em] text-slate-400">
            Learn · Study · Create · Achieve
          </div>
          <div className="mt-3 text-xs text-slate-500 italic max-w-sm">
            "Big dreams need smart tools."
          </div>
          <div className="mt-1 text-[10px] text-slate-600">— Xentra AI</div>
        </div>
      </div>
    </div>
  );
}