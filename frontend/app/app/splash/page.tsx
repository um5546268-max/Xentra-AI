"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Fake "requirements" — replace with real checks if you want
const STEPS = [
  { label: "Initializing Xentra core", ms: 600 },
  { label: "Loading AI models", ms: 700 },
  { label: "Preparing your workspace", ms: 500 },
  { label: "Warming up the hive", ms: 500 },
  { label: "Almost ready…", ms: 700 },
];

export default function SplashPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let elapsed = 0;
    const total = STEPS.reduce((sum, s) => sum + s.ms, 0);

    const tick = () => {
      elapsed += 50;
      const pct = Math.min(100, (elapsed / total) * 100);
      setProgress(pct);

      // Update step label
      let cum = 0;
      for (let i = 0; i < STEPS.length; i++) {
        cum += STEPS[i].ms;
        if (elapsed < cum) {
          setCurrentStep(i);
          break;
        }
      }

      if (elapsed < total && !cancelled) {
        setTimeout(tick, 50);
      } else if (!cancelled) {
        setCurrentStep(STEPS.length);
        // Wait a moment on 100%, then redirect
        setTimeout(() => router.push("/welcome"), 500);
      }
    };

    tick();
    return () => { cancelled = true; };
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(139,92,246,0.15) 0%, transparent 60%)",
        }}
      />

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(139,92,246,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.5) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* X hologram */}
      <div className="relative z-10 mb-12">
      </div>

      {/* Name */}
      <h1 className="relative z-10 text-4xl font-bold tracking-tight bg-gradient-to-r from-violet-400 via-cyan-300 to-violet-400 bg-clip-text text-transparent">
        XENTRA AI
      </h1>
      <p className="relative z-10 text-xs text-slate-500 uppercase tracking-[0.3em] mt-3">
        Your AI Operating Assistant
      </p>

      {/* Loading bar */}
      <div className="relative z-10 w-80 max-w-[80vw] mt-12 space-y-3">
        <div className="h-1 rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-cyan-500 transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-500">
          <span className="font-mono">
            {currentStep < STEPS.length
              ? STEPS[currentStep].label
              : "Ready"}
          </span>
          <span className="font-mono">
            {Math.round(progress)}%
          </span>
        </div>
      </div>
    </div>
  );
}