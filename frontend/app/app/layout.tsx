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
  }, []);

  const showCommandCenter =
    pathname?.startsWith("/app/c/") && pathname !== "/app/c/";

  return (
    <div className="flex h-screen bg-slate-950 text-white">
      <Sidebar />
      <main className="flex-1 overflow-hidden">{children}</main>
      {showCommandCenter && <CommandCenter />}
      <GlobalAudioHost />
      <GlobalYouTubePlayer />
    </div>
  );
}