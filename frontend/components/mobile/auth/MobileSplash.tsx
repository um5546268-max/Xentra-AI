"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Music, Volume2 } from "lucide-react";

const DURATION_MS = 3200;

export default function MobileSplash() {
  const router = useRouter();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => {
      const pct = Math.min(100, ((Date.now() - start) / DURATION_MS) * 100);
      setProgress(pct);
      if (pct >= 100) {
        clearInterval(id);
        setTimeout(() => router.replace("/login"), 250);
      }
    }, 50);
    return () => clearInterval(id);
  }, [router]);

  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-950 flex items-center justify-center">
      {/* Purple fantasy landscape background */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 30%, rgba(139,92,246,0.35) 0%, rgba(76,29,149,0.25) 40%, transparent 75%), radial-gradient(ellipse at 50% 100%, rgba(34,211,238,0.25) 0%, transparent 60%), linear-gradient(180deg, #020617 0%, #0b0325 50%, #020617 100%)",
        }}
      />

      {/* Star field */}
      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "radial-gradient(1px 1px at 20% 30%, white 0%, transparent 100%), radial-gradient(1px 1px at 80% 20%, white 0%, transparent 100%), radial-gradient(1px 1px at 40% 70%, white 0%, transparent 100%), radial-gradient(1px 1px at 70% 60%, white 0%, transparent 100%), radial-gradient(1px 1px at 15% 85%, white 0%, transparent 100%), radial-gradient(1px 1px at 90% 75%, white 0%, transparent 100%)",
        }}
      />

      {/* Purple crystal mountain silhouette (bottom) */}
      <div
        className="absolute inset-x-0 bottom-0 h-1/3"
        style={{
          background:
            "linear-gradient(180deg, transparent 0%, rgba(139,92,246,0.15) 40%, rgba(139,92,246,0.35) 100%)",
          clipPath:
            "polygon(0% 100%, 0% 70%, 10% 55%, 20% 62%, 30% 45%, 45% 60%, 55% 40%, 70% 58%, 80% 48%, 90% 62%, 100% 55%, 100% 100%)",
        }}
      />

      {/* Center content */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 w-full max-w-sm">
        {/* X Logo — static, no animation */}
        <img
          src="/x-logo.png"
          alt="Xentra"
          className="w-36 h-36 object-contain mb-4"
          style={{
            filter:
              "drop-shadow(0 0 40px rgba(139,92,246,0.95)) drop-shadow(0 0 20px rgba(34,211,238,0.6))",
          }}
        />

        <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-300 via-cyan-200 to-violet-300 bg-clip-text text-transparent">
          Xentra AI
        </h1>
        <p className="text-xs uppercase tracking-[0.3em] text-violet-300/80 mt-2">
          Your AI Agent
        </p>

        {/* Bottom bar */}
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-8 space-y-4">
          <div className="text-center text-xs text-slate-400 italic">
            Welcome to the future...
          </div>

          {/* Progress bar */}
          <div className="relative h-1 rounded-full bg-slate-800/60 overflow-hidden">
            <div
              className="h-full rounded-full transition-[width] duration-100"
              style={{
                width: `${progress}%`,
                background:
                  "linear-gradient(90deg, #8b5cf6 0%, #06b6d4 100%)",
              }}
            />
          </div>
          <div className="text-center text-[10px] text-violet-300/80 font-mono">
            Loading your world… {Math.round(progress)}%
          </div>
        </div>
      </div>

      {/* Footer — Epic Theme badge */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
        <button className="flex items-center gap-2 rounded-full border border-slate-700/60 bg-slate-950/70 backdrop-blur px-4 py-2 text-[11px] text-slate-300">
          <Music className="w-3 h-3 text-violet-300" />
          <span>Epic Theme</span>
          <Volume2 className="w-3 h-3 text-slate-500" />
        </button>
      </div>
    </div>
  );
}