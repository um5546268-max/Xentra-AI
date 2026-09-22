"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Volume2 } from "lucide-react";

const STEPS = [
  { label: "Loading core system", ms: 700 },
  { label: "Connecting to AI assistant", ms: 800 },
  { label: "Loading your profile", ms: 600 },
  { label: "Syncing your data", ms: 700 },
  { label: "Preparing your sessions", ms: 600 },
];

const LOGO_APPEAR_AT = 19.2;
const VIDEO_END_AT = 24.0;

export default function SplashPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);

  const [started, setStarted] = useState(false);   // ← new: has user tapped?
  const [showLogo, setShowLogo] = useState(false);
  const [videoDone, setVideoDone] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [checklistDone, setChecklistDone] = useState(false);

  // ── Start the video with sound when the user taps ──
  const handleStart = async () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = false;
    v.volume = 1;
    try {
      await v.play();
      setStarted(true);
    } catch (e) {
      // Fallback if sound still fails — play muted
      v.muted = true;
      await v.play();
      setStarted(true);
    }
  };

  // ── Trigger X logo flash at 19.2s ──
  useEffect(() => {
    if (!started) return;
    const t = setTimeout(() => setShowLogo(true), LOGO_APPEAR_AT * 1000);
    return () => clearTimeout(t);
  }, [started]);

  // ── Fallback: force-advance after video length ──
  useEffect(() => {
    if (!started) return;
    const t = setTimeout(() => setVideoDone(true), (VIDEO_END_AT + 1) * 1000);
    return () => clearTimeout(t);
  }, [started]);

  // ── Checklist runs after video ends ──
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
        setChecklistDone(true);
        setTimeout(() => router.push("/welcome"), 700);
      }
    };
    tick();
    return () => { cancelled = true; };
  }, [videoDone, router]);

  return (
    <div className="min-h-screen bg-black relative overflow-hidden flex items-center justify-center">
      {/* Video is always rendered so it preloads */}
      <video
        ref={videoRef}
        src="/x-intro.mp4"
        playsInline
        preload="auto"
        onEnded={() => setVideoDone(true)}
        onError={() => setVideoDone(true)}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: started && !videoDone ? 1 : 0, transition: "opacity 0.4s" }}
      />

      {/* ── TAP-TO-START GATE ── */}
      {!started && (
        <button
          onClick={handleStart}
          className="relative z-30 flex flex-col items-center gap-6 group cursor-pointer"
        >
          <img
            src="/x-logo.png"
            alt="Xentra"
            className="w-32 h-32 object-contain drop-shadow-[0_0_60px_rgba(139,92,246,1)] group-hover:scale-105 transition-transform"
          />
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-violet-500/40 bg-violet-500/10 backdrop-blur">
              <Volume2 className="w-4 h-4 text-violet-300 animate-pulse" />
              <span className="text-sm text-slate-200 font-medium">
                Tap to begin with sound
              </span>
            </div>
            <span className="text-[10px] uppercase tracking-[0.4em] text-slate-500">
              Xentra AI
            </span>
          </div>
        </button>
      )}

      {/* ── X LOGO OVERLAY (at 19.2s) ── */}
      {started && !videoDone && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
          style={{
            opacity: showLogo ? 1 : 0,
            transition: "opacity 0.15s ease-out",
          }}
        >
          <div
            className="absolute rounded-full"
            style={{
              width: "60vw",
              height: "60vw",
              background:
                "radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(139,92,246,0.7) 25%, rgba(34,211,238,0.3) 50%, transparent 75%)",
              animation: showLogo
                ? "hugeFlash 1.4s cubic-bezier(0.16, 1, 0.3, 1) both"
                : "none",
              filter: "blur(40px)",
            }}
          />
          <img
            src="/x-logo.png"
            alt="Xentra"
            className="relative z-10"
            style={{
              width: "22vw",
              height: "22vw",
              objectFit: "contain",
              filter:
                "drop-shadow(0 0 60px rgba(139,92,246,1)) drop-shadow(0 0 30px rgba(34,211,238,0.8))",
              animation: showLogo
                ? "logoIn 1.8s cubic-bezier(0.16, 1, 0.3, 1) both"
                : "none",
            }}
          />
        </div>
      )}

      {/* ── LOADING CHECKLIST ── */}
      {videoDone && (
        <div className="relative z-10 flex flex-col items-center gap-8">
          <img
            src="/x-logo.png"
            alt="Xentra"
            className="w-32 h-32 object-contain drop-shadow-[0_0_40px_rgba(139,92,246,0.9)]"
          />

          <div className="w-full max-w-md rounded-2xl border border-violet-500/30 bg-slate-950/70 backdrop-blur-xl p-6 shadow-2xl">
            <div className="flex items-center justify-center gap-2 mb-5">
              {checklistDone ? (
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
                const isDone = i < stepIndex || checklistDone;
                const isCurrent = i === stepIndex && !checklistDone;
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
              <span>{checklistDone ? "Launching…" : "Initializing"}</span>
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
        @keyframes hugeFlash {
          0%   { opacity: 0;   transform: scale(0.3); }
          20%  { opacity: 1;   transform: scale(1.1); }
          40%  { opacity: 0.5; transform: scale(1.3); }
          100% { opacity: 0;   transform: scale(1.6); }
        }
        @keyframes logoIn {
          0%   { opacity: 0; transform: scale(2.2); filter: brightness(3) blur(8px); }
          25%  { opacity: 1; transform: scale(1.6); filter: brightness(2.5) blur(2px); }
          60%  { transform: scale(1.08); filter: brightness(1.3) blur(0); }
          100% { transform: scale(1);   filter: brightness(1) blur(0); }
        }
      `}</style>
    </div>
  );
}