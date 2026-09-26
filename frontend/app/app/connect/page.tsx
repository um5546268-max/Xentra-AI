"use client";

import dynamic from "next/dynamic";
import { useIsMobile } from "@/lib/use-is-mobile";

const DesktopConnect = dynamic(
  () => import("@/components/connect/DesktopConnect"),
  { ssr: false }
);
const MobileConnect = dynamic(
  () => import("@/components/mobile/MobileConnect"),
  { ssr: false }
);

export default function ConnectPage() {
  const isMobile = useIsMobile();
  if (isMobile === null) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-950">
        <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  return isMobile ? <MobileConnect /> : <DesktopConnect />;
}