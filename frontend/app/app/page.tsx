"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

// Load both components lazily (no SSR)
const DesktopHome = dynamic(() => import("@/components/home/DesktopHome"), {
  ssr: false,
});

const MobileHome = dynamic(() => import("@/components/mobile/MobileHome"), {
  ssr: false,
});

export default function AppHomePage() {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Before we know the screen size, show a loading spinner
  if (isMobile === null) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-950">
        <div className="w-6 h-6 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return isMobile ? <MobileHome /> : <DesktopHome />;
}