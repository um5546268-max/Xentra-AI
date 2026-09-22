"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import CommandCenter from "@/components/CommandCenter";
import { GlobalAudioHost } from "@/components/hive/GlobalAudioHost";
import { useMediaStore } from "@/lib/media-store";
import { useShoppingStore } from "@/lib/shopping-store";
import { GlobalYouTubePlayer } from "@/components/hive/GlobalYouTubePlayer";
import { MiniPlayer } from "@/components/hive/MiniPlayer";
import { dailyCheckin } from "@/lib/gamification";
import { useState } from "react";
import { getOnboardingStatus } from "@/lib/onboarding";
import { OnboardingTour } from "@/components/OnboardingTour";

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
          // Small delay so the UI settles
          setTimeout(() => setShowTour(true), 800);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="flex h-screen bg-slate-950 text-white">
      <Sidebar />
      <main className="flex-1 overflow-hidden">{children}</main>
      {showCommandCenter && <CommandCenter />}
      <GlobalAudioHost />
      <GlobalYouTubePlayer />
      {showTour && <OnboardingTour onComplete={() => setShowTour(false)} />}
    </div>
  );
}