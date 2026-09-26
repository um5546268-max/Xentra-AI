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
    <div className="fixed inset-0 overflow-hidden bg-black">
      {/* ─── Full-screen background image ─── */}
      <img
        src="/splash-bg.png"
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        draggable={false}
      />

      {/* ─── Dark gradient overlay for text legibility ─── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.75) 100%)",
        }}
      />

      {/* ─── Bottom bar (Welcome + progress + % + Epic Theme) ─── */}
      <div
        className="absolute inset-x-0 bottom-0 z-20 px-8 space-y-4"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.5rem)" }}
      >
        <div className="text-center text-sm text-white/90 italic drop-shadow-lg">
          Welcome to the future...
        </div>

        {/* Progress bar */}
        <div className="relative h-1 rounded-full bg-white/20 overflow-hidden backdrop-blur-sm">
          <div
            className="h-full rounded-full transition-[width] duration-100"
            style={{
              width: `${progress}%`,
              background:
                "linear-gradient(90deg, #a78bfa 0%, #22d3ee 100%)",
              boxShadow: "0 0 12px rgba(139,92,246,0.7)",
            }}
          />
        </div>

        <div className="text-center text-[11px] text-white/80 font-mono">
          Loading your world… {Math.round(progress)}%
        </div>

        {/* Epic Theme badge */}
        <div className="flex justify-center pt-2">
          <button
            type="button"
            className="flex items-center gap-2 rounded-full border border-white/20 bg-black/40 backdrop-blur-md px-4 py-2 text-[11px] text-white/90 shadow-lg"
          >
            <Music className="w-3 h-3 text-violet-300" />
            <span>Epic Theme</span>
            <Volume2 className="w-3 h-3 text-white/60" />
          </button>
        </div>
      </div>
    </div>
  );
}