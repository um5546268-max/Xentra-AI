"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import CommandCenter from "@/components/CommandCenter";
import { GlobalAudioHost } from "@/components/hive/GlobalAudioHost";
import { useMediaStore } from "@/lib/media-store";
import { useShoppingStore } from "@/lib/shopping-store";
import { GlobalYouTubePlayer } from "@/components/hive/GlobalYouTubePlayer";
import { MiniPlayer } from "@/components/hive/MiniPlayer";
import { dailyCheckin } from "@/lib/gamification";
import { getOnboardingStatus } from "@/lib/onboarding";
import { OnboardingTour } from "@/components/OnboardingTour";
import SystemStatsWidget from "@/components/SystemStatsWidget";
import { useTheme } from "@/lib/theme-store";
import KeyboardShortcutsModal from "@/components/KeyboardShortcutsModal";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  useEffect(() => {
    useMediaStore.persist.rehydrate();
    useShoppingStore.persist.rehydrate();
    document.documentElement.classList.add("dark");
    document.documentElement.classList.remove("light");
    dailyCheckin().catch(() => {});
  }, []);

  const showCommandCenter =
    pathname?.startsWith("/app/c/") && pathname !== "/app/c/";

  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    getOnboardingStatus()
      .then((s) => {
        if (s.completed && !s.tour_completed) {
          setTimeout(() => setShowTour(true), 800);
        }
      })
      .catch(() => {});
  }, []);

  const [showShortcuts, setShowShortcuts] = useState(false);

useEffect(() => {
  const onKey = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "/") {
      e.preventDefault();
      setShowShortcuts((v) => !v);
    }
  };
  window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
}, []);

  const loadTheme = useTheme((state) => state.loadTheme);

useEffect(() => {
  loadTheme();
}, [loadTheme]);

  return (
    <div
      className="flex flex-col bg-slate-950 text-white overflow-hidden"
      style={{ height: "100vh" }}
    >
      {/* Main row: sidebar + content */}
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 overflow-hidden min-w-0 h-full">
          {children}
        </main>
        {showCommandCenter && <CommandCenter />}
        <GlobalAudioHost />
        <GlobalYouTubePlayer />
        {showTour && <OnboardingTour onComplete={() => setShowTour(false)} />}
        {showShortcuts && (
        <KeyboardShortcutsModal onClose={() => setShowShortcuts(false)} />
      )}
      </div>

      {/* Bottom status bar */}
      <div className="shrink-0 h-7 border-t border-slate-800 bg-slate-950 flex items-center justify-between px-4 text-[10px] text-slate-500">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            <span className="font-semibold text-violet-300">XENTRA AI</span>
          </span>
          <span className="text-slate-700">·</span>
          <span>Connect</span>
          <span className="text-slate-700">·</span>
          <span>Learn</span>
          <span className="text-slate-700">·</span>
          <span>Build</span>
          <span className="text-slate-700">·</span>
          <span>Together</span>
        </div>
        <div className="relative">
          <SystemStatsWidget />
        </div>
      </div>
    </div>
  );
}