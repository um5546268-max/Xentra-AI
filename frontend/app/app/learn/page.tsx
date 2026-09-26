"use client";

import { Suspense, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";

const DesktopLearn = dynamic(() => import("@/components/learn/DesktopLearn"), {
  ssr: false,
});

const MobileLearn = dynamic(() => import("@/components/mobile/MobileLearn"), {
  ssr: false,
});

function LearnSwitcher() {
  const searchParams = useSearchParams();
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (isMobile === null) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-950">
        <div className="w-6 h-6 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return isMobile ? <MobileLearn /> : <DesktopLearn />;
}

export default function LearnPage() {
  return (
    <Suspense fallback={null}>
      <LearnSwitcher />
    </Suspense>
  );
}