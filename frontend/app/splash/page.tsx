"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Music, VolumeX } from "lucide-react";
import { useAuth } from "@/lib/auth";

export default function SplashPage() {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const loadFromStorage = useAuth((s) => s.loadFromStorage);

  const [hydrated, setHydrated] = useState(false);
  const [progress, setProgress] = useState(0);
  const [muted, setMuted] = useState(true);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);

  // Detect mobile vs desktop
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Hydrate auth
  useEffect(() => {
    loadFromStorage();
    setHydrated(true);
  }, [loadFromStorage]);

  // Progress bar animation
  useEffect(() => {
    const duration = 3200;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setProgress(Math.round(eased * 100));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Try autoplay epic theme
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.35;
    audio
      .play()
      .then(() => setMuted(false))
      .catch(() => {
        setMuted(true);
        setAudioBlocked(true);
      });
  }, []);

  // Route after hydration + progress
  useEffect(() => {
    if (!hydrated) return;
    if (progress < 100) return;
    const t = setTimeout(() => {
      if (user) router.replace("/app");
      else router.replace("/welcome");
    }, 200);
    return () => clearTimeout(t);
  }, [hydrated, progress, user, router]);

  const toggleAudio = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (muted) {
      audio
        .play()
        .then(() => {
          setMuted(false);
          setAudioBlocked(false);
        })
        .catch(() => {});
    } else {
      audio.pause();
      setMuted(true);
    }
  };

  if (isMobile === null) {
    return <div className="min-h-screen bg-slate-950" />;
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-950 flex flex-col justify-end items-center">
      {/* Background — mobile: portrait image, desktop: wide image */}
      <picture>
        <source media="(max-width: 767px)" srcSet="/splash-bg.png" />
        <source media="(min-width: 768px)" srcSet="/splash-bg-desktop.png" />
        <img
          src="/splash-bg-desktop.png"
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
      </picture>

      {/* Bottom gradient fade */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(to bottom, rgba(2,6,23,0) 0%, rgba(2,6,23,0) 45%, rgba(2,6,23,0.55) 72%, rgba(2,6,23,0.95) 100%)",
        }}
      />

      {/* Content overlay */}
      <div className="relative z-10 w-full max-w-md px-8 pb-12 flex flex-col items-center text-center">
        <p
          className="text-base sm:text-lg font-light text-white/95 italic tracking-wide mb-6"
          style={{
            textShadow: "0 2px 20px rgba(0,0,0,0.9)",
            fontFamily: "serif",
          }}
        >
          Welcome to the future...
        </p>

        <div className="w-full">
          <div className="h-[2px] w-full rounded-full bg-white/15 overflow-hidden">
            <div
              className="h-full rounded-full transition-[width] duration-150"
              style={{
                width: `${progress}%`,
                background:
                  "linear-gradient(90deg, rgba(139,92,246,1) 0%, rgba(34,211,238,1) 100%)",
                boxShadow: "0 0 10px rgba(139,92,246,0.9)",
              }}
            />
          </div>
          <p className="mt-3 text-[10px] tracking-[0.2em] text-slate-200/70 uppercase">
            Loading your world · {progress}%
          </p>
        </div>

        <button
          type="button"
          onClick={toggleAudio}
          className="mt-8 flex items-center gap-2 rounded-full border border-white/15 bg-white/5 backdrop-blur px-4 py-1.5 text-[11px] text-white/80 hover:bg-white/10 transition"
        >
          {muted ? (
            <VolumeX className="w-3 h-3" />
          ) : (
            <Music className="w-3 h-3" />
          )}
          <span>Epic Theme</span>
          {audioBlocked && muted && (
            <span className="ml-1 text-[10px] text-violet-300">
              (tap to play)
            </span>
          )}
        </button>

        <audio ref={audioRef} src="/epic-theme.mp3" loop preload="auto" />
      </div>
    </div>
  );
}