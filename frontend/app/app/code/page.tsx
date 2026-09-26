"use client";

import dynamic from "next/dynamic";
import { useIsMobile } from "@/lib/use-is-mobile";

const DesktopCode = dynamic(
  () => import("@/components/code/DesktopCode"),
  { ssr: false }
);
const MobileCode = dynamic(
  () => import("@/components/mobile/code/MobileCodeWrapper"),
  { ssr: false }
);

export default function CodePage() {
  const isMobile = useIsMobile();
  if (isMobile === null) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-950">
        <div className="w-6 h-6 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  return isMobile ? <MobileCode /> : <DesktopCode />;
}